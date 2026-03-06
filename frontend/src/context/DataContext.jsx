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
} from '../services/sourceManager'

const DataContext = createContext()

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

  // ─── Privacy & Security State ──────────────────────────────────────────────
  const [persistEnabled, setPersistEnabled] = useState(isPersistenceEnabled())
  const [memoryCleared, setMemoryCleared] = useState(false)
  const clearTimerRef = useRef(null)

  // ─── AI Mode State ────────────────────────────────────────────────────────
  const [aiConfig, setAiConfigState] = useState(getAIConfig())
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

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
    const cats = ['medications', 'encounters', 'allergies', 'results', 'orders', 'conditions', 'immunizations']
    cats.forEach(cat => {
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
    const cats = ['medications', 'encounters', 'allergies', 'results', 'orders', 'conditions', 'immunizations']
    return cats.reduce((sum, cat) => sum + (Array.isArray(pd[cat]) ? pd[cat].length : 0), 0)
  }

  function mergeIntoExisting(existing, incoming) {
    const merged = { ...existing }
    const cats = ['medications', 'encounters', 'allergies', 'results', 'orders', 'conditions', 'immunizations']
    cats.forEach(cat => {
      const a = Array.isArray(merged[cat]) ? merged[cat] : []
      const b = Array.isArray(incoming[cat]) ? incoming[cat] : []
      merged[cat] = [...a, ...b]
    })
    // Merge patients — add new ones that aren't already present
    if (incoming.patients) {
      const existingIds = new Set((merged.patients || []).map(p => p.patId))
      const newPatients = incoming.patients.filter(p => !existingIds.has(p.patId))
      merged.patients = [...(merged.patients || []), ...newPatients]
    }
    merged.totalRecords = countRecords(merged)
    merged.totalPatients = (merged.patients || []).length
    return merged
  }

  // Parse real uploaded files (ZIP/TSV)
  // When additive=true, merges new files into existing data sources
  const parseFiles = useCallback(async (additive = false) => {
    if (rawFiles.length === 0) return false
    setLoading(true)
    setError(null)
    try {
      const result = await parseUploadedFiles(rawFiles)

      // Create a data source for this batch of files
      const sourceLabel = rawFiles.length === 1
        ? rawFiles[0].name
        : `${rawFiles[0].name} (+${rawFiles.length - 1} more)`
      const newSource = createDataSource(sourceLabel, dataSources.length)

      // Patient verification against existing data
      if (additive && parsedData && parsedData.patients?.length > 0 && result.parsedData?.patients?.length > 0) {
        const existingPat = parsedData.patients[0]
        const newPat = result.parsedData.patients[0]
        const verification = verifyPatientMatch(existingPat, newPat)
        if (!verification.match) {
          setPatientMismatch({
            message: verification.reason,
            existingPatient: existingPat,
            newPatient: newPat,
            pendingSource: newSource,
            pendingData: result,
          })
          setLoading(false)
          return 'mismatch'
        }
      }

      // Tag all records with lineage and merge
      const taggedData = tagSourceOnParsed(result.parsedData, newSource)
      const updatedSources = [...dataSources, { ...newSource, recordCount: countRecords(taggedData) }]

      if (additive && parsedData) {
        // Merge with existing data
        const merged = mergeIntoExisting(parsedData, taggedData)
        setParsedData(merged)
        // Recompute stats for all sources
        updatedSources.forEach(s => { s.categories = computeSourceStats(s, merged) })
      } else {
        updatedSources.forEach(s => { s.categories = computeSourceStats(s, taggedData) })
        setParsedData(taggedData)
        setSelectedPatient(taggedData.selectedPatient || (taggedData.patients && taggedData.patients[0]))
      }

      setDataSources(updatedSources)
      if (!additive) {
        setSelectedPatient(result.selectedPatient)
        setAiSummary(result.aiSummary)
      }
      setDetectedVendor(result.vendor || null)
      setDetectedFormat(result.format || null)
      setIsSampleData(false)
      setRawFiles([]) // Clear pending files after successful parse
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
    const taggedData = tagSourceOnParsed(pendingData.parsedData, pendingSource)
    const merged = mergeIntoExisting(parsedData, taggedData)
    const updatedSources = [...dataSources, { ...pendingSource, recordCount: countRecords(taggedData) }]
    updatedSources.forEach(s => { s.categories = computeSourceStats(s, merged) })
    setParsedData(merged)
    setDataSources(updatedSources)
    setPatientMismatch(null)
    setRawFiles([])
  }, [patientMismatch, parsedData, dataSources])

  const dismissMismatch = useCallback(() => {
    setPatientMismatch(null)
    setRawFiles([])
  }, [])

  // Remove a data source
  const removeDataSource = useCallback((sourceId) => {
    setDataSources(prev => prev.filter(s => s.id !== sourceId))
    if (parsedData) {
      const filtered = { ...parsedData }
      const categories = ['medications', 'encounters', 'allergies', 'results', 'orders', 'conditions', 'immunizations']
      categories.forEach(cat => {
        if (Array.isArray(filtered[cat])) {
          filtered[cat] = filtered[cat].filter(r => r._source !== sourceId)
        }
      })
      setParsedData(filtered)
    }
  }, [parsedData])

  const loadSampleData = useCallback(async () => {
    setLoading(true)
    try {
      const data = generateSampleParsedData()

      // Create sample data sources for lineage tracking
      const epicSource = createDataSource('Epic MyChart Export (TSV)', 0)
      const fhirSource = createDataSource('FHIR R4 Bundle (JSON)', 1)

      // Tag records with sample sources — split roughly by patient
      const categories = ['medications', 'encounters', 'allergies', 'results', 'orders', 'conditions', 'immunizations']
      categories.forEach(cat => {
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
