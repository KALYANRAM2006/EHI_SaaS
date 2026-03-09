import { useState, useRef } from 'react'
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2, User, Calendar, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useData } from '../context/DataContext'
import OCRProgress from './OCRProgress'

const OCR_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'tif', 'tiff', 'bmp', 'gif', 'dcm'])

export default function FileUpload({ onComplete }) {
  const [dragOver, setDragOver] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [files, setFiles] = useState([])       // { file, status, progress, patient, matchStatus, matchDetails, ocrProgress }
  const fileInputRef = useRef(null)
  const { addFileAndParse, dataSources } = useData()

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

    const startIndex = files.length

    setFiles(prev => [...prev, ...validFiles.map(f => ({
      file: f,
      status: 'uploading',
      progress: 0,
      patient: null,
      matchStatus: null,
      matchDetails: '',
    }))])

    // Simulate upload progress then parse each file
    validFiles.forEach((file, index) => {
      setTimeout(() => {
        simulateUpload(file, startIndex + index)
      }, index * 500)
    })
  }

  const simulateUpload = (file, fileIndex) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setFiles(prev => prev.map((f, i) =>
        i === fileIndex ? { ...f, progress } : f
      ))

      if (progress >= 100) {
        clearInterval(interval)
        // Mark as parsing, then parse the file
        setFiles(prev => prev.map((f, i) =>
          i === fileIndex ? { ...f, status: 'parsing', progress: 100 } : f
        ))
        parseFileAndUpdate(file, fileIndex)
      }
    }, 100)
  }

  const parseFileAndUpdate = async (file, fileIndex) => {
    try {
      // Determine if this file needs OCR (PDF/image)
      const ext = file.name.split('.').pop().toLowerCase()
      const needsOCR = OCR_EXTENSIONS.has(ext)

      // Progress callback for OCR-capable files
      const onProgress = needsOCR ? (progressInfo) => {
        setFiles(prev => prev.map((f, i) =>
          i === fileIndex ? { ...f, ocrProgress: progressInfo } : f
        ))
      } : undefined

      const result = await addFileAndParse(file, onProgress)

      if (result.status === 'mismatch') {
        setFiles(prev => prev.map((f, i) =>
          i === fileIndex ? {
            ...f,
            status: 'mismatch',
            patient: result.patient,
            matchStatus: 'mismatch',
            matchDetails: 'Different patient detected — confirm to proceed',
          } : f
        ))
      } else if (result.status === 'error') {
        setFiles(prev => prev.map((f, i) =>
          i === fileIndex ? { ...f, status: 'error', matchDetails: result.error } : f
        ))
        setParseError(result.error)
      } else {
        setFiles(prev => prev.map((f, i) =>
          i === fileIndex ? {
            ...f,
            status: 'complete',
            patient: result.patient,
            matchStatus: result.source?.matchStatus || 'first',
            matchDetails: result.source?.matchDetails || '',
          } : f
        ))
      }
    } catch (err) {
      setFiles(prev => prev.map((f, i) =>
        i === fileIndex ? { ...f, status: 'error', matchDetails: err.message } : f
      ))
      setParseError(err.message)
    }
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const detectFileType = (filename) => {
    const lower = filename.toLowerCase()
    if (lower.endsWith('.xml'))                      return { type: 'C-CDA / XML', color: 'text-blue-600 bg-blue-50' }
    if (lower.endsWith('.json'))                      return { type: 'FHIR JSON',   color: 'text-green-600 bg-green-50' }
    if (lower.endsWith('.ndjson') || lower.endsWith('.jsonl')) return { type: 'NDJSON', color: 'text-green-600 bg-green-50' }
    if (lower.endsWith('.tsv'))                       return { type: 'TSV',          color: 'text-teal-600 bg-teal-50' }
    if (lower.endsWith('.csv'))                       return { type: 'CSV',          color: 'text-teal-600 bg-teal-50' }
    if (lower.endsWith('.zip'))                       return { type: 'Archive',      color: 'text-orange-600 bg-orange-50' }
    if (lower.endsWith('.pdf'))                       return { type: 'PDF',          color: 'text-red-600 bg-red-50' }
    if (lower.endsWith('.rtf') || lower.endsWith('.doc') || lower.endsWith('.docx')) return { type: 'Document', color: 'text-red-600 bg-red-50' }
    if (/\.(jpe?g|png|tiff?|bmp|gif|dcm)$/.test(lower)) return { type: 'Image', color: 'text-pink-600 bg-pink-50' }
    return { type: 'Unknown', color: 'text-gray-600 bg-gray-50' }
  }

  const allDone = files.length > 0 && files.every(f => f.status === 'complete' || f.status === 'mismatch')
  const anyParsing = files.some(f => f.status === 'parsing' || f.status === 'uploading')

  const handleContinue = () => {
    // Data is already parsed per-file. Just navigate to Dashboard.
    if (allDone) {
      onComplete()
    }
  }

  // ─── Patient Identity Card (shown per file after parsing) ─────────────────
  const PatientCard = ({ patient, matchStatus, matchDetails, isFirst }) => {
    if (!patient) return null
    const displayName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown'
    const dob = patient.birthDate || 'N/A'
    const sex = patient.sex || 'N/A'
    const age = patient.age || ''

    const matchBadge = () => {
      if (isFirst || matchStatus === 'first') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            <User className="w-3 h-3" /> Primary Patient
          </span>
        )
      }
      if (matchStatus === 'match') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
            <ShieldCheck className="w-3 h-3" /> Same Patient
          </span>
        )
      }
      if (matchStatus === 'mismatch' || matchStatus === 'mismatch-confirmed') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            <ShieldAlert className="w-3 h-3" /> Different Patient
          </span>
        )
      }
      return null
    }

    return (
      <div className="mt-2 p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Patient Identified</span>
          {matchBadge()}
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-medium text-gray-900">{displayName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-gray-700">DOB: {dob}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-700">Sex: {sex}{age ? ` · Age ${age}` : ''}</span>
          </div>
        </div>
        {matchDetails && matchStatus !== 'first' && (
          <p className="mt-1 text-xs text-gray-500">{matchDetails}</p>
        )}
      </div>
    )
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

      {/* File List with Patient Identity Cards */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-semibold text-gray-900 mb-3">Uploaded Files ({files.length})</h3>
          {files.map((item, index) => {
            const fileType = detectFileType(item.file.name)
            return (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
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
                      {item.status === 'uploading' && item.progress < 100 && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                      {item.status === 'parsing' && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-indigo-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>
                            {item.ocrProgress ? 'Processing document…' : 'Analyzing patient data…'}
                          </span>
                        </div>
                      )}
                      {/* OCR progress indicator for PDF/image files */}
                      {item.ocrProgress && item.status === 'parsing' && (
                        <OCRProgress
                          progress={item.ocrProgress}
                          isActive={item.status === 'parsing'}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.status === 'complete' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : item.status === 'error' ? (
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    ) : item.status === 'mismatch' ? (
                      <ShieldAlert className="w-6 h-6 text-amber-500" />
                    ) : null}
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Patient Identity Card */}
                {item.patient && (
                  <PatientCard
                    patient={item.patient}
                    matchStatus={item.matchStatus}
                    matchDetails={item.matchDetails}
                    isFirst={index === 0}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Patient Match Summary (shown when 2+ files) */}
      {files.filter(f => f.patient).length >= 2 && (
        <div className={`mt-4 p-4 rounded-lg border ${
          files.every(f => !f.patient || f.matchStatus === 'match' || f.matchStatus === 'first')
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            {files.every(f => !f.patient || f.matchStatus === 'match' || f.matchStatus === 'first') ? (
              <>
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">
                  All files belong to the same patient — records will be merged
                </span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-800">
                  Patient mismatch detected across files — please verify
                </span>
              </>
            )}
          </div>
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
            disabled={anyParsing}
            className="px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Clear All
          </button>
          <button
            onClick={handleContinue}
            disabled={!allDone || anyParsing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {anyParsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Files...
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
