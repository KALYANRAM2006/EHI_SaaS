import { useState, useEffect } from 'react'
import { FileText, ScanLine, Brain, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

/**
 * OCR Progress Indicator — shows real-time progress during document processing.
 *
 * Phases: loading → extracting → loading-ocr → ocr → nlp → complete
 */
export default function OCRProgress({ progress, isActive }) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 400)
    return () => clearInterval(interval)
  }, [isActive])

  if (!isActive && !progress) return null

  const { phase, progress: pct, message } = progress || {}
  const percent = Math.round((pct || 0) * 100)
  const isComplete = phase === 'complete'
  const isError = phase === 'error'

  const phaseConfig = {
    loading:      { icon: FileText,     color: 'text-blue-500',   bg: 'bg-blue-50',   bar: 'bg-blue-500',   label: 'Loading PDF Reader' },
    extracting:   { icon: FileText,     color: 'text-blue-600',   bg: 'bg-blue-50',   bar: 'bg-blue-500',   label: 'Extracting Text' },
    'loading-ocr':{ icon: ScanLine,     color: 'text-indigo-500', bg: 'bg-indigo-50',  bar: 'bg-indigo-500', label: 'Loading OCR Engine' },
    ocr:          { icon: ScanLine,     color: 'text-indigo-600', bg: 'bg-indigo-50',  bar: 'bg-indigo-500', label: 'Recognizing Text' },
    nlp:          { icon: Brain,        color: 'text-purple-500', bg: 'bg-purple-50',  bar: 'bg-purple-500', label: 'Analyzing Content' },
    complete:     { icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',   bar: 'bg-green-500',  label: 'Complete' },
    error:        { icon: AlertCircle,  color: 'text-red-500',    bg: 'bg-red-50',     bar: 'bg-red-400',    label: 'Error' },
  }

  const config = phaseConfig[phase] || phaseConfig.loading
  const Icon = config.icon

  return (
    <div className={`rounded-lg border ${config.bg} p-3 mt-2 transition-all duration-300`}>
      <div className="flex items-center gap-2 mb-1.5">
        {isComplete ? (
          <Icon className={`w-4 h-4 ${config.color}`} />
        ) : isError ? (
          <Icon className={`w-4 h-4 ${config.color}`} />
        ) : (
          <Loader2 className={`w-4 h-4 ${config.color} animate-spin`} />
        )}
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}{!isComplete && !isError ? dots : ''}
        </span>
        {!isComplete && !isError && (
          <span className="text-xs text-gray-400 ml-auto">{percent}%</span>
        )}
      </div>

      {/* Progress bar */}
      {!isComplete && !isError && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full ${config.bar} transition-all duration-500 ease-out`}
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
      )}

      {/* Status message */}
      {message && (
        <p className={`text-xs mt-1 ${isError ? 'text-red-600' : 'text-gray-500'}`}>
          {message}
        </p>
      )}

      {/* Privacy badge */}
      {(phase === 'ocr' || phase === 'loading-ocr') && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
            🔒 Processing locally — no data leaves your browser
          </span>
        </div>
      )}
    </div>
  )
}
