import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { generateSampleParsedData, generateAISummary } from '../data/sampleData'
import { parseUploadedFiles } from '../parsers/epicTsvParser'
import {
  secureMemoryWipe,
  encryptAndStore,
  decryptAndRetrieve,
  purgeIndexedDB,
  isPersistenceEnabled,
  setPersistenceEnabled,
} from '../utils/privacy'
import { generateAIHealthSummary, getAIConfig, saveAIConfig, AI_MODES, testDeidentification } from '../services/aiService'
import {
  createDataSource,
  tagRecordsWithSource,
  verifyPatientMatch,
  reconcileData,
  computeSourceStats,
  extractPatientIdentity,
  demographicMatch,
  remapPatientIds,
  mergePatientSources,
  deduplicateMergedData,
} from '../services/sourceManager'

const DataContext = createContext()

// All clinical data categories that records can belong to
const ALL_CATEGORIES = ['medications', 'encounters', 'allergies', 'results', 'orders', 'conditions', 'immunizations', 'vitals', 'documents']

export function DataProvider({ children }) {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [rawFiles, setRawFiles] = useState([])  // Store actual File objects for parsing
  const [parsedData, setParsedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isSampleData, setIsSampleData] = useState(false)
  const [aiSummary, setAiSummary] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [detectedVendor, setDetectedVendor] = useState(null)
  const [detectedFormat, setDetectedFormat] = useState(null)

  // ─── Multi-Source Data Lineage State ───────────────────────────────────────
  const [dataSources, setDataSources] = useState([])        // Array of source descriptors
  const [patientMismatch, setPatientMismatch] = useState(null) // { message, newPatient, existingPatient }

  // ─── Document Intelligence (OCR) State ─────────────────────────────────────
  const [ocrDocuments, setOcrDocuments] = useState([])       // Array of { filename, result } from OCR

  // ─── Refs for race-condition-free file parsing ─────────────────────────────
  // React state updates are async — when files upload in quick succession,
  // the second file's closure would see stale state from before file 1 finished.
  // Refs always hold the latest value, so addFileAndParse reads from refs.
  const dataSourcesRef = useRef([])
  const parsedDataRef = useRef(null)
  const selectedPatientRef = useRef(null)
  const parseQueueRef = useRef(Promise.resolve()) // sequential queue
  const ocrDocumentsRef = useRef([])

  // ─── Privacy & Security State ──────────────────────────────────────────────
  const [persistEnabled, setPersistEnabled] = useState(isPersistenceEnabled())
  const [memoryCleared, setMemoryCleared] = useState(false)
  const clearTimerRef = useRef(null)

  // ─── AI Mode State ────────────────────────────────────────────────────────
  const [aiConfig, setAiConfigState] = useState(getAIConfig())
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  // ─── Keep refs in sync with React state ────────────────────────────────────
  useEffect(() => { dataSourcesRef.current = dataSources }, [dataSources])
  useEffect(() => { parsedDataRef.current = parsedData }, [parsedData])
  useEffect(() => { selectedPatientRef.current = selectedPatient }, [selectedPatient])
  useEffect(() => { ocrDocumentsRef.current = ocrDocuments }, [ocrDocuments])

  // Auto-clear data when browser tab closes or navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      // If persistence is NOT enabled, wipe everything
      if (!isPersistenceEnabled()) {
        sessionStorage.clear()
        // Can't async in beforeunload, so we do sync cleanup
        try { localStorage.removeItem('healthlens_persist_enabled') } catch { /* */ }
      }
    }

    const handleVisibilityChange = () => {
      // If tab goes hidden and not persisting, start a 5-minute auto-clear timer
      if (document.hidden && !isPersistenceEnabled()) {
        clearTimerRef.current = setTimeout(async () => {
          await secureMemoryWipe()
        }, 5 * 60 * 1000) // 5 min
      } else {
        // Tab visible again — cancel auto-clear
        if (clearTimerRef.current) {
          clearTimeout(clearTimerRef.current)
          clearTimerRef.current = null
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
    }
  }, [])

  // Persist parsed data to IndexedDB when persistence is enabled
  useEffect(() => {
    if (persistEnabled && parsedData) {
      encryptAndStore('parsedData', {
        parsedData,
        selectedPatient,
        aiSummary,
        isSampleData,
        detectedVendor,
        detectedFormat,
      }).catch(() => {})
    }
  }, [persistEnabled, parsedData, selectedPatient, aiSummary, isSampleData, detectedVendor, detectedFormat])

  // On mount, restore from IndexedDB if persistence is enabled
  useEffect(() => {
    if (isPersistenceEnabled()) {
      decryptAndRetrieve('parsedData').then(data => {
        if (data) {
          setParsedData(data.parsedData)
          setSelectedPatient(data.selectedPatient)
          setAiSummary(data.aiSummary)
          setIsSampleData(data.isSampleData || false)
          setDetectedVendor(data.detectedVendor || null)
          setDetectedFormat(data.detectedFormat || null)
          setUploadedFiles([{ name: 'restored_session', size: 0, type: 'restored' }])
        }
      }).catch(() => {})
    }
  }, [])

  const addFile = (file) => {
    setUploadedFiles(prev => [...prev, { name: file.name, size: file.size, type: file.type }])
    setRawFiles(prev => [...prev, file])
  }

  const clearFiles = () => {
    setUploadedFiles([])
    setRawFiles([])
    setParsedData(null)
    setError(null)
    setIsSampleData(false)
    setAiSummary(null)
    setSelectedPatient(null)
    setDetectedVendor(null)
    setDetectedFormat(null)
    setDataSources([])
    setPatientMismatch(null)
    setOcrDocuments([])
    // Also reset refs to prevent stale data in queued parse operations
    dataSourcesRef.current = []
    parsedDataRef.current = null
    selectedPatientRef.current = null
    ocrDocumentsRef.current = []
    parseQueueRef.current = Promise.resolve()
  }

  // Secure wipe — clears React state + IndexedDB + sessionStorage
  const secureWipe = useCallback(async () => {
    clearFiles()
    await secureMemoryWipe()
    setMemoryCleared(true)
    setTimeout(() => setMemoryCleared(false), 3000)
  }, [])

  // Toggle local persistence
  const togglePersistence = useCallback(async (enabled) => {
    setPersistenceEnabled(enabled)
    setPersistEnabled(enabled)
    if (!enabled) {
      // Turning off persistence — purge stored data
      await purgeIndexedDB()
    } else if (parsedData) {
      // Turning on — save current data
      await encryptAndStore('parsedData', {
        parsedData, selectedPatient, aiSummary, isSampleData, detectedVendor, detectedFormat,
      })
    }
  }, [parsedData, selectedPatient, aiSummary, isSampleData, detectedVendor, detectedFormat])

  // ─── Multi-Source Helper Functions ─────────────────────────────────────────

  // Tag all records in a parsed result with a source
  function tagSourceOnParsed(pd, source) {
    if (!pd) return pd
    const tagged = { ...pd }
    ALL_CATEGORIES.forEach(cat => {
      if (Array.isArray(tagged[cat])) {
        tagged[cat] = tagRecordsWithSource(tagged[cat], source)
      }
    })
    if (tagged.patients) {
      tagged.patients = tagged.patients.map(p => ({
        ...p, _source: source.id, _sourceName: source.name, _sourceColor: source.color,
      }))
    }
    return tagged
  }

  function countRecords(pd) {
    if (!pd) return 0
    return ALL_CATEGORIES.reduce((sum, cat) => sum + (Array.isArray(pd[cat]) ? pd[cat].length : 0), 0)
  }

  function mergeIntoExisting(existing, incoming) {
    let merged = { ...existing }
    ALL_CATEGORIES.forEach(cat => {
      const a = Array.isArray(merged[cat]) ? merged[cat] : []
      const b = Array.isArray(incoming[cat]) ? incoming[cat] : []
      merged[cat] = [...a, ...b]
    })

    // ─── Merge patients by DEMOGRAPHICS (Name + DOB + Sex), not by patient ID ──
    // MRN / Patient IDs differ across EMR systems, so we match by demographics
    if (incoming.patients) {
      const mergedPatients = [...(merged.patients || [])]
      for (const newPat of incoming.patients) {
        const existingMatch = mergedPatients.find(p => demographicMatch(p, newPat))
        if (existingMatch) {
          // Same person from a different EMR — remap records to use unified patient ID
          merged = remapPatientIds(merged, newPat.patId, existingMatch.patId)
          // Merge demographics (fill gaps)
          const combinedPat = mergePatientSources([existingMatch, newPat])
          Object.assign(existingMatch, combinedPat)
        } else {
          // Truly different patient
          mergedPatients.push(newPat)
        }
      }
      merged.patients = mergedPatients
    }

    merged.totalRecords = countRecords(merged)
    merged.totalPatients = (merged.patients || []).length
    return merged
  }

  /**
   * Rebuild the selectedPatient summary from the merged parsedData.
   * This re-attaches clinical data arrays after merge/remap operations.
   */
  function rebuildSelectedPatient(data, patId) {
    if (!data || !data.patients) return null
    const patient = data.patients.find(p => p.patId === patId) || data.patients[0]
    if (!patient) return null
    const pid = patient.patId
    const isSingle = data.patients.length === 1

    const enc  = (data.encounters || []).filter(e => isSingle || e.patId === pid)
    const ord  = (data.orders || []).filter(o => isSingle || o.patId === pid)
    const orderIds = new Set(ord.map(o => o.orderId))
    const res  = isSingle
      ? (data.results || [])
      : (data.results || []).filter(r => orderIds.has(r.orderId) || r.patId === pid)
    const cond = isSingle ? (data.conditions || []) : (data.conditions || []).filter(c => c.patId === pid)
    const meds = isSingle ? (data.medications || []) : (data.medications || []).filter(m => m.patId === pid)
    const alrg = isSingle ? (data.allergies || []) : (data.allergies || []).filter(a => a.patId === pid)
    const immn = isSingle ? (data.immunizations || []) : (data.immunizations || []).filter(i => i.patId === pid)

    // Separate unique records (shown everywhere) from duplicates (shown in lineage only)
    const filteredMeds = meds.filter(m => !m._duplicate)
    const filteredRes  = res.filter(r => !r._duplicate)
    const filteredCond = cond.filter(c => !c._duplicate)
    const filteredAlrg = alrg.filter(a => !a._duplicate)
    const filteredOrd  = ord.filter(o => !o._duplicate)
    const filteredEnc  = enc.filter(e => !e._duplicate)
    const filteredImmn = immn.filter(i => !i._duplicate)
    const abnormal = filteredRes.filter(r => r.flag && r.flag !== 'Normal')

    // Keep ALL records (including duplicates) for lineage view
    const allMeds = meds
    const allRes  = res
    const allCond = cond
    const allAlrg = alrg
    const allOrd  = ord
    const allEnc  = enc
    const allImmn = immn

    return {
      ...patient,
      encounters: filteredEnc, orders: filteredOrd,
      // Primary views get deduplicated (smart-merged) records
      results: filteredRes, conditions: filteredCond,
      medications: filteredMeds, allergies: filteredAlrg,
      immunizations: filteredImmn, abnormalResults: abnormal,
      encounterCount: filteredEnc.length, orderCount: filteredOrd.length,
      resultCount: filteredRes.length, conditionCount: filteredCond.length,
      medicationCount: filteredMeds.length,
      // Lineage view gets ALL records (including duplicates) for full traceability
      _allMedications: allMeds, _allResults: allRes,
      _allConditions: allCond, _allAllergies: allAlrg,
      _allOrders: allOrd, _allEncounters: allEnc, _allImmunizations: allImmn,
      // Dedup stats
      _rawMedCount: meds.length, _rawResCount: res.length,
      _dedupedMeds: meds.filter(m => m._duplicate).length,
      _dedupedResults: res.filter(r => r._duplicate).length,
    }
  }

  // ─── Core: Parse a SINGLE file immediately on upload ──────────────────────
  // Uses refs + promise queue to prevent race conditions when multiple files
  // upload in quick succession. Each file parse waits for the previous to finish.

  const addFileAndParse = useCallback((file, onProgress) => {
    const task = parseQueueRef.current.then(async () => {
      setLoading(true)
      setError(null)
      try {
        // Read latest state from refs (NOT closure — avoids stale data)
        const currentSources = dataSourcesRef.current
        const currentParsed = parsedDataRef.current
        const currentPatient = selectedPatientRef.current

        // 1. Parse just this one file (pass onProgress for OCR feedback)
        const result = await parseUploadedFiles([file], onProgress)

        // 2. Create a data source for this file
        const newSource = createDataSource(file.name, currentSources.length)

        // 3. Extract patient demographics for preview
        const parsedPatient = result.parsedData?.patients?.[0] || result.selectedPatient
        const patIdentity = extractPatientIdentity(parsedPatient)
        newSource.patient = parsedPatient ? {
          name: parsedPatient.name || `${parsedPatient.firstName || ''} ${parsedPatient.lastName || ''}`.trim(),
          firstName: parsedPatient.firstName || patIdentity?.firstName || '',
          lastName: parsedPatient.lastName || patIdentity?.lastName || '',
          birthDate: parsedPatient.birthDate || '',
          sex: parsedPatient.sex || '',
          age: parsedPatient.age || patIdentity?.age || '',
        } : null

        // 4. Patient verification against existing data (using demographics, NOT MRN)
        if (currentSources.length > 0 && currentSources[0].patient && newSource.patient) {
          const verification = verifyPatientMatch(currentSources[0].patient, newSource.patient)
          if (verification.match) {
            newSource.matchStatus = 'match'
            newSource.matchDetails = verification.reason
          } else {
            newSource.matchStatus = 'mismatch'
            newSource.matchDetails = verification.reason
            // Store mismatch info but still allow adding
            setPatientMismatch({
              message: verification.reason,
              existingPatient: currentSources[0].patient,
              newPatient: newSource.patient,
              pendingSource: newSource,
              pendingData: result,
            })
            setLoading(false)
            return { status: 'mismatch', patient: newSource.patient, source: newSource }
          }
        } else {
          newSource.matchStatus = 'first'
          newSource.matchDetails = 'First data source'
        }

        // 5. Tag all records with source lineage
        const taggedData = tagSourceOnParsed(result.parsedData, newSource)
        newSource.recordCount = countRecords(taggedData)

        // 6. Merge into existing data or set as initial data
        let finalData
        if (currentParsed && currentSources.length > 0) {
          finalData = mergeIntoExisting(currentParsed, taggedData)
        } else {
          finalData = taggedData
        }

        // 7. Deduplicate merged data (meds, labs, conditions, allergies)
        finalData = deduplicateMergedData(finalData)

        // 8. Compute stats and update sources
        const updatedSources = [...currentSources, newSource]
        updatedSources.forEach(s => { s.categories = computeSourceStats(s, finalData) })

        // 9. Update state (and refs immediately for the next queued file)
        parsedDataRef.current = finalData
        dataSourcesRef.current = updatedSources
        setParsedData(finalData)
        setDataSources(updatedSources)
        setUploadedFiles(prev => [...prev, { name: file.name, size: file.size, type: file.type }])
        setDetectedVendor(result.vendor || detectedVendor)
        setDetectedFormat(result.format || detectedFormat)
        setIsSampleData(false)

        // 9b. Store OCR document results for Document Intelligence view
        if (result.ocrDocuments && result.ocrDocuments.length > 0) {
          const newDocs = [...ocrDocumentsRef.current, ...result.ocrDocuments]
          ocrDocumentsRef.current = newDocs
          setOcrDocuments(newDocs)
        }

        // 10. Rebuild selectedPatient with merged clinical data
        const currentPatId = currentPatient?.patId || finalData?.patients?.[0]?.patId
        const rebuiltPatient = rebuildSelectedPatient(finalData, currentPatId)
        if (rebuiltPatient) {
          selectedPatientRef.current = rebuiltPatient
          setSelectedPatient(rebuiltPatient)
          // Generate AI summary for the first file only
          if (currentSources.length === 0) {
            try {
              const summary = await generateAIHealthSummary(rebuiltPatient, aiConfig)
              setAiSummary(summary)
            } catch {
              setAiSummary(generateAISummary(rebuiltPatient))
            }
          } else {
            // Re-generate summary with updated data
            setAiSummary(generateAISummary(rebuiltPatient))
          }
        }

        setLoading(false)
        return { status: 'ok', patient: newSource.patient, source: newSource }
      } catch (err) {
        setError(err.message)
        setLoading(false)
        return { status: 'error', error: err.message }
      }
    })
    parseQueueRef.current = task
    return task
  }, [aiConfig, detectedVendor, detectedFormat])

  // Legacy parseFiles — kept for backward compatibility with FileUpload "Continue" button
  const parseFiles = useCallback(async (additive = false) => {
    if (rawFiles.length === 0) return false
    setLoading(true)
    setError(null)
    try {
      const result = await parseUploadedFiles(rawFiles)
      const sourceLabel = rawFiles.length === 1
        ? rawFiles[0].name
        : `${rawFiles[0].name} (+${rawFiles.length - 1} more)`
      const newSource = createDataSource(sourceLabel, dataSources.length)
      const parsedPatient = result.parsedData?.patients?.[0] || result.selectedPatient
      newSource.patient = parsedPatient ? {
        name: parsedPatient.name || `${parsedPatient.firstName || ''} ${parsedPatient.lastName || ''}`.trim(),
        firstName: parsedPatient.firstName || '',
        lastName: parsedPatient.lastName || '',
        birthDate: parsedPatient.birthDate || '',
        sex: parsedPatient.sex || '',
        age: parsedPatient.age || '',
      } : null
      newSource.matchStatus = 'first'

      const taggedData = tagSourceOnParsed(result.parsedData, newSource)
      newSource.recordCount = countRecords(taggedData)
      const updatedSources = [...dataSources, newSource]

      let finalData
      if (additive && parsedData) {
        finalData = mergeIntoExisting(parsedData, taggedData)
      } else {
        finalData = taggedData
      }
      updatedSources.forEach(s => { s.categories = computeSourceStats(s, finalData) })

      setParsedData(finalData)
      setDataSources(updatedSources)
      if (!additive) {
        const rebuiltPat = rebuildSelectedPatient(finalData, result.selectedPatient?.patId)
        setSelectedPatient(rebuiltPat || result.selectedPatient)
        setAiSummary(result.aiSummary)
      }
      setDetectedVendor(result.vendor || null)
      setDetectedFormat(result.format || null)
      setIsSampleData(false)
      setRawFiles([])
      setLoading(false)
      return true
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return false
    }
  }, [rawFiles, dataSources, parsedData])

  // Confirm adding mismatched patient data anyway
  const confirmMismatch = useCallback(async () => {
    if (!patientMismatch) return
    const { pendingSource, pendingData } = patientMismatch
    pendingSource.matchStatus = 'mismatch-confirmed'
    const taggedData = tagSourceOnParsed(pendingData.parsedData, pendingSource)
    pendingSource.recordCount = countRecords(taggedData)
    let merged = mergeIntoExisting(parsedData, taggedData)
    merged = deduplicateMergedData(merged)
    const updatedSources = [...dataSources, pendingSource]
    updatedSources.forEach(s => { s.categories = computeSourceStats(s, merged) })
    setParsedData(merged)
    setDataSources(updatedSources)
    setUploadedFiles(prev => [...prev, { name: pendingSource.name, size: 0, type: '' }])

    // Rebuild selected patient
    const currentPatId = selectedPatient?.patId || merged?.patients?.[0]?.patId
    const rebuiltPat = rebuildSelectedPatient(merged, currentPatId)
    if (rebuiltPat) {
      setSelectedPatient(rebuiltPat)
      setAiSummary(generateAISummary(rebuiltPat))
    }

    setPatientMismatch(null)
    setRawFiles([])
  }, [patientMismatch, parsedData, dataSources, selectedPatient])

  const dismissMismatch = useCallback(() => {
    setPatientMismatch(null)
  }, [])

  // Remove a data source — cleans up ALL categories, ocrDocuments, and rebuilds selectedPatient
  const removeDataSource = useCallback((sourceId) => {
    const newSources = (dataSourcesRef.current || []).filter(s => s.id !== sourceId)
    dataSourcesRef.current = newSources
    setDataSources(newSources)

    if (parsedData) {
      const filtered = { ...parsedData }
      ALL_CATEGORIES.forEach(cat => {
        if (Array.isArray(filtered[cat])) {
          filtered[cat] = filtered[cat].filter(r => r._source !== sourceId)
        }
      })
      // Also filter patients tagged with this source (if only source)
      if (filtered.patients) {
        filtered.patients = filtered.patients.filter(p => !p._source || p._source !== sourceId || newSources.some(s => s.id === p._source))
      }
      filtered.totalRecords = countRecords(filtered)
      filtered.totalPatients = (filtered.patients || []).length

      // Update stats on remaining sources
      newSources.forEach(s => { s.categories = computeSourceStats(s, filtered) })

      parsedDataRef.current = filtered
      setParsedData(filtered)

      // Rebuild selectedPatient so dashboard views refresh
      const currentPatId = selectedPatientRef.current?.patId || filtered.patients?.[0]?.patId
      if (currentPatId && filtered.patients?.length > 0) {
        const rebuilt = rebuildSelectedPatient(filtered, currentPatId)
        if (rebuilt) {
          selectedPatientRef.current = rebuilt
          setSelectedPatient(rebuilt)
        }
      } else {
        // No data left
        selectedPatientRef.current = null
        setSelectedPatient(null)
      }
    }

    // Clean up ocrDocuments tied to files from this source
    const removedSource = (dataSources || []).find(s => s.id === sourceId)
    if (removedSource) {
      const srcName = removedSource.name
      setOcrDocuments(prev => {
        const cleaned = prev.filter(d => !d.filename?.includes(srcName))
        ocrDocumentsRef.current = cleaned
        return cleaned
      })
    }
  }, [parsedData, dataSources])

  const loadSampleData = useCallback(async () => {
    setLoading(true)
    try {
      const data = generateSampleParsedData()

      // Create sample data sources for lineage tracking
      const epicSource = createDataSource('Epic MyChart Export (TSV)', 0)
      const fhirSource = createDataSource('FHIR R4 Bundle (JSON)', 1)

      // Tag records with sample sources — split roughly by patient
      ALL_CATEGORIES.forEach(cat => {
        if (Array.isArray(data[cat])) {
          data[cat] = data[cat].map((r, i) =>
            i % 3 === 0
              ? { ...r, _source: fhirSource.id, _sourceName: fhirSource.name, _sourceColor: fhirSource.color }
              : { ...r, _source: epicSource.id, _sourceName: epicSource.name, _sourceColor: epicSource.color }
          )
        }
      })
      // Also tag patient-keyed objects (conditions, medications in sample are objects keyed by patId)
      ;['conditions', 'medications'].forEach(cat => {
        if (data[cat] && !Array.isArray(data[cat])) {
          // Already flattened in generateSampleParsedData — skip
        }
      })

      // Ensure patients on summaries also have source tags
      if (data.patients) {
        data.patients = data.patients.map((p, i) => ({
          ...p,
          _source: i % 2 === 0 ? epicSource.id : fhirSource.id,
          _sourceName: i % 2 === 0 ? epicSource.name : fhirSource.name,
          _sourceColor: i % 2 === 0 ? epicSource.color : fhirSource.color,
        }))
      }

      epicSource.categories = computeSourceStats(epicSource, data)
      fhirSource.categories = computeSourceStats(fhirSource, data)
      epicSource.recordCount = Object.values(epicSource.categories).reduce((a, b) => a + b, 0)
      fhirSource.recordCount = Object.values(fhirSource.categories).reduce((a, b) => a + b, 0)

      // Populate patient identity on each source for the LandingPage preview
      const samplePat = data.selectedPatient || data.patients?.[0]
      if (samplePat) {
        const patInfo = {
          name: samplePat.name || `${samplePat.firstName || ''} ${samplePat.lastName || ''}`.trim(),
          firstName: samplePat.firstName || '',
          lastName: samplePat.lastName || '',
          birthDate: samplePat.birthDate || '',
          sex: samplePat.sex || '',
          age: samplePat.age || '',
        }
        epicSource.patient = { ...patInfo }
        fhirSource.patient = { ...patInfo }
        epicSource.matchStatus = 'first'
        fhirSource.matchStatus = 'match'
        fhirSource.matchDetails = 'Same patient — demographic match'
      }

      setDataSources([epicSource, fhirSource])
      setParsedData(data)
      setSelectedPatient(data.selectedPatient)
      // Use rich AI generator for initial load
      try {
        const richSummary = await generateAIHealthSummary(data.selectedPatient, aiConfig)
        setAiSummary(richSummary)
      } catch {
        setAiSummary(generateAISummary(data.selectedPatient))
      }
      setIsSampleData(true)
      // Add a virtual file entry so Dashboard doesn't redirect
      setUploadedFiles([{ name: 'sample_data.tsv', size: 0, type: 'text/tab-separated-values' }])
      setLoading(false)
      return true
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return false
    }
  }, [aiConfig])

  const selectPatient = useCallback(async (patientId) => {
    if (!parsedData) return
    const patient = parsedData.patients.find(p => p.patId === patientId)
    if (patient) {
      setSelectedPatient(patient)
      // Use rich AI generator on patient switch
      try {
        const richSummary = await generateAIHealthSummary(patient, aiConfig)
        setAiSummary(richSummary)
      } catch {
        setAiSummary(generateAISummary(patient))
      }
    }
  }, [parsedData, aiConfig])

  // ─── AI Functions ─────────────────────────────────────────────────────────

  // Update AI configuration
  const updateAIConfig = useCallback((newConfig) => {
    const merged = { ...aiConfig, ...newConfig }
    saveAIConfig(merged)
    setAiConfigState(merged)
  }, [aiConfig])

  // Regenerate AI summary using the configured mode
  // Accepts optional configOverride to avoid stale-closure issues
  // (e.g. when called immediately after updateAIConfig before React re-renders)
  const regenerateAISummary = useCallback(async (patient, configOverride) => {
    const target = patient || selectedPatient
    if (!target) return
    const effectiveConfig = configOverride || aiConfig
    setAiLoading(true)
    setAiError(null)
    try {
      const summary = await generateAIHealthSummary(target, effectiveConfig)
      setAiSummary(summary)
    } catch (err) {
      setAiError(err.message)
      // Fall back to local template on error
      setAiSummary(generateAISummary(target))
    } finally {
      setAiLoading(false)
    }
  }, [selectedPatient, aiConfig])

  // Test de-identification (for the Privacy Panel / dev tools)
  const testDeidentify = useCallback(() => {
    if (!selectedPatient) return null
    return testDeidentification(selectedPatient)
  }, [selectedPatient])

  const value = {
    uploadedFiles,
    rawFiles,
    addFile,
    clearFiles,
    parsedData,
    setParsedData,
    loading,
    setLoading,
    error,
    setError,
    isSampleData,
    loadSampleData,
    parseFiles,
    addFileAndParse,
    aiSummary,
    setAiSummary,
    selectedPatient,
    selectPatient,
    detectedVendor,
    detectedFormat,
    // Privacy & Security
    secureWipe,
    persistEnabled,
    togglePersistence,
    memoryCleared,
    // AI Service
    aiConfig,
    updateAIConfig,
    regenerateAISummary,
    aiLoading,
    aiError,
    testDeidentify,
    // Document Intelligence
    ocrDocuments,
    setOcrDocuments,
    // Multi-Source Data Lineage
    dataSources,
    patientMismatch,
    confirmMismatch,
    dismissMismatch,
    removeDataSource,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}
