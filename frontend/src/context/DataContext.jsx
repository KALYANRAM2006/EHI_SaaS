import { createContext, useContext, useState, useCallback } from 'react'
import { generateSampleParsedData, generateAISummary } from '../data/sampleData'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [parsedData, setParsedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isSampleData, setIsSampleData] = useState(false)
  const [aiSummary, setAiSummary] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)

  const addFile = (file) => {
    setUploadedFiles(prev => [...prev, file])
  }

  const clearFiles = () => {
    setUploadedFiles([])
    setParsedData(null)
    setError(null)
    setIsSampleData(false)
    setAiSummary(null)
    setSelectedPatient(null)
  }

  const loadSampleData = useCallback(() => {
    setLoading(true)
    try {
      const data = generateSampleParsedData()
      setParsedData(data)
      setSelectedPatient(data.selectedPatient)
      setAiSummary(generateAISummary(data.selectedPatient))
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
  }, [])

  const selectPatient = useCallback((patientId) => {
    if (!parsedData) return
    const patient = parsedData.patients.find(p => p.patId === patientId)
    if (patient) {
      setSelectedPatient(patient)
      setAiSummary(generateAISummary(patient))
    }
  }, [parsedData])

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
    aiSummary,
    setAiSummary,
    selectedPatient,
    selectPatient,
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
