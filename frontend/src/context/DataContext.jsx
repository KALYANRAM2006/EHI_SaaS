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

  // Parse real uploaded files (ZIP/TSV)
  const parseFiles = useCallback(async () => {
    if (rawFiles.length === 0) return false
    setLoading(true)
    setError(null)
    try {
      const result = await parseUploadedFiles(rawFiles)
      setParsedData(result.parsedData)
      setSelectedPatient(result.selectedPatient)
      setAiSummary(result.aiSummary)
      setDetectedVendor(result.vendor || null)
      setDetectedFormat(result.format || null)
      setIsSampleData(false)
      setLoading(false)
      return true
    } catch (err) {
      setError(err.message)
      setLoading(false)
      return false
    }
  }, [rawFiles])

  const loadSampleData = useCallback(async () => {
    setLoading(true)
    try {
      const data = generateSampleParsedData()
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
  const regenerateAISummary = useCallback(async (patient) => {
    const target = patient || selectedPatient
    if (!target) return
    setAiLoading(true)
    setAiError(null)
    try {
      const summary = await generateAIHealthSummary(target, aiConfig)
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
