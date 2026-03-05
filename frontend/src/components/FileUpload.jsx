import { useState, useRef } from 'react'
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useData } from '../context/DataContext'

export default function FileUpload({ onComplete }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [files, setFiles] = useState([])
  const fileInputRef = useRef(null)
  const { addFile, setLoading, parseFiles } = useData()

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    processFiles(selectedFiles)
  }

  const ACCEPT_EXTS = [
    '.xml', '.json', '.ndjson', '.jsonl',
    '.tsv', '.csv',
    '.zip',
    '.pdf', '.rtf', '.doc', '.docx',
    '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp', '.gif', '.dcm',
  ]

  const processFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      const lower = file.name.toLowerCase()
      return ACCEPT_EXTS.some(ext => lower.endsWith(ext))
    })

    if (validFiles.length === 0) {
      alert('No supported files found. Accepted: TSV, CSV, JSON, NDJSON, XML, ZIP, PDF, RTF, DOC, DOCX, images')
      return
    }

    setFiles(prev => [...prev, ...validFiles.map(f => ({
      file: f,
      status: 'pending',
      progress: 0
    }))])

    // Simulate upload progress
    validFiles.forEach((file, index) => {
      setTimeout(() => {
        simulateUpload(file, index)
      }, index * 500)
    })
  }

  const simulateUpload = (file, index) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setFiles(prev => prev.map((f, i) =>
        i === index + (files.length) ? { ...f, progress } : f
      ))

      if (progress >= 100) {
        clearInterval(interval)
        setFiles(prev => prev.map((f, i) =>
          i === index + (files.length) ? { ...f, status: 'complete' } : f
        ))
        addFile(file)
      }
    }, 100)
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const detectFileType = (filename) => {
    const lower = filename.toLowerCase()
    if (lower.endsWith('.xml'))                      return { type: 'C-CDA / XML', color: 'text-blue-600 bg-blue-50' }
    if (lower.endsWith('.json'))                      return { type: 'FHIR JSON',   color: 'text-green-600 bg-green-50' }
    if (lower.endsWith('.ndjson') || lower.endsWith('.jsonl')) return { type: 'NDJSON', color: 'text-green-600 bg-green-50' }
    if (lower.endsWith('.tsv'))                       return { type: 'TSV',          color: 'text-purple-600 bg-purple-50' }
    if (lower.endsWith('.csv'))                       return { type: 'CSV',          color: 'text-purple-600 bg-purple-50' }
    if (lower.endsWith('.zip'))                       return { type: 'Archive',      color: 'text-orange-600 bg-orange-50' }
    if (lower.endsWith('.pdf'))                       return { type: 'PDF',          color: 'text-red-600 bg-red-50' }
    if (lower.endsWith('.rtf') || lower.endsWith('.doc') || lower.endsWith('.docx')) return { type: 'Document', color: 'text-red-600 bg-red-50' }
    if (/\.(jpe?g|png|tiff?|bmp|gif|dcm)$/.test(lower)) return { type: 'Image', color: 'text-pink-600 bg-pink-50' }
    return { type: 'Unknown', color: 'text-gray-600 bg-gray-50' }
  }

  const handleContinue = async () => {
    if (files.length > 0 && files.every(f => f.status === 'complete')) {
      setParsing(true)
      setParseError(null)
      try {
        const success = await parseFiles()
        if (success) {
          onComplete()
        } else {
          setParseError('Failed to parse the uploaded files. Please ensure they are valid health record files (TSV, CSV, JSON, NDJSON, XML, ZIP).')
        }
      } catch (err) {
        setParseError(err.message || 'An error occurred while parsing files.')
      }
      setParsing(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Health Records</h2>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`upload-area cursor-pointer ${dragOver ? 'drag-over' : ''}`}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-primary-600' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700 mb-2">
          {dragOver ? 'Drop files here' : 'Drop files here or click to browse'}
        </p>
        <p className="text-sm text-gray-500">
          TSV &middot; CSV &middot; JSON &middot; NDJSON &middot; XML/C-CDA &middot; ZIP &middot; PDF &middot; RTF &middot; Images
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xml,.json,.ndjson,.jsonl,.tsv,.csv,.zip,.pdf,.rtf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff,.bmp,.gif,.dcm"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-semibold text-gray-900 mb-3">Uploaded Files ({files.length})</h3>
          {files.map((item, index) => {
            const fileType = detectFileType(item.file.name)
            return (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <File className="w-8 h-8 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900">{item.file.name}</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${fileType.color}`}>
                        {fileType.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {(item.file.size / 1024).toFixed(1)} KB
                    </p>
                    {item.status === 'pending' && item.progress < 100 && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {item.status === 'complete' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : item.status === 'error' ? (
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  ) : null}
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Parse Error */}
      {parseError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {parseError}
        </div>
      )}

      {/* Action Buttons */}
      {files.length > 0 && (
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => { setFiles([]); setParseError(null) }}
            disabled={parsing}
            className="px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Clear All
          </button>
          <button
            onClick={handleContinue}
            disabled={!files.every(f => f.status === 'complete') || parsing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing Files...
              </>
            ) : (
              'Continue to Dashboard'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
