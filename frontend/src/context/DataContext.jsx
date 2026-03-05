import { createContext, useContext, useState } from 'react'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [parsedData, setParsedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const addFile = (file) => {
    setUploadedFiles(prev => [...prev, file])
  }

  const clearFiles = () => {
    setUploadedFiles([])
    setParsedData(null)
    setError(null)
  }

  const value = {
    uploadedFiles,
    addFile,
    clearFiles,
    parsedData,
    setParsedData,
    loading,
    setLoading,
    error,
    setError
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
