/**
 * DocumentIntelligence — Document Processing & OCR Intelligence tab
 *
 * Allows users to:
 *   - Upload PDFs, scanned documents, or images for OCR processing
 *   - View extracted text with confidence scores
 *   - See detected clinical entities (medications, diagnoses, labs, vitals, allergies)
 *   - Review NLP normalization stats (abbreviation expansions, spelling corrections)
 *   - Load sample test PDFs bundled with the app
 *
 * 100% client-side — all processing happens in-browser, zero PHI leaves the device.
 * Pure Tailwind CSS — no shadcn / Radix UI.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  FileText, Upload, Eye, EyeOff, ChevronDown, ChevronRight,
  Pill, Stethoscope, TestTube, Activity, AlertTriangle, Scissors,
  Shield, Sparkles, FileBarChart, Loader2, CheckCircle2, XCircle,
  Brain, ScanLine, FileImage, Search, ClipboardList, Settings, Zap,
  CloudLightning, Lock, ExternalLink
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { processDocument } from '../parsers/documentOCR'
import {
  getAzureHealthConfig, saveAzureHealthConfig, isAzureHealthEnabled,
  analyzeWithAzureHealth, testAzureHealthConnection
} from '../services/azureHealthAI'

// ─── Sample test PDFs bundled in public/sample-pdfs/ ─────────────────────────
const SAMPLE_PDFS = [
  { name: 'Discharge_Summary_Johnson.pdf', label: 'Discharge Summary', type: 'Discharge Summary', size: '~12 KB' },
  { name: 'Lab_Report_Johnson.pdf',        label: 'Lab Report',         type: 'Lab Report',        size: '~10 KB' },
  { name: 'Progress_Note_Johnson.pdf',     label: 'Progress Note',      type: 'Office Visit',      size: '~9 KB'  },
  { name: 'Radiology_Report_Johnson.pdf',  label: 'Radiology Report',   type: 'Imaging Report',    size: '~8 KB'  },
  { name: 'Medication_Reconciliation_Johnson.pdf', label: 'Medication Reconciliation', type: 'Pharmacy', size: '~9 KB' },
]

// ─── Entity category config (icon + color) ──────────────────────────────────
const ENTITY_SECTIONS = [
  { key: 'medications', label: 'Medications',  icon: Pill,            color: 'blue',   bgClass: 'bg-blue-50',   textClass: 'text-blue-700',   borderClass: 'border-blue-200' },
  { key: 'diagnoses',   label: 'Diagnoses',    icon: Stethoscope,     color: 'red',    bgClass: 'bg-red-50',    textClass: 'text-red-700',    borderClass: 'border-red-200'  },
  { key: 'labResults',  label: 'Lab Results',   icon: TestTube,        color: 'green',  bgClass: 'bg-green-50',  textClass: 'text-green-700',  borderClass: 'border-green-200' },
  { key: 'vitals',      label: 'Vitals',        icon: Activity,        color: 'purple', bgClass: 'bg-purple-50', textClass: 'text-purple-700', borderClass: 'border-purple-200' },
  { key: 'allergies',   label: 'Allergies',     icon: AlertTriangle,   color: 'amber',  bgClass: 'bg-amber-50',  textClass: 'text-amber-700',  borderClass: 'border-amber-200' },
  { key: 'procedures',  label: 'Procedures',    icon: Scissors,        color: 'indigo', bgClass: 'bg-indigo-50', textClass: 'text-indigo-700', borderClass: 'border-indigo-200' },
]

export default function DocumentIntelligence() {
  const { ocrDocuments, setOcrDocuments } = useData()
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(null)       // { phase, progress, message }
  const [expandedDoc, setExpandedDoc] = useState(null)  // index of expanded document
  const [showText, setShowText] = useState({})          // { [idx]: boolean }
  const [loadingSamples, setLoadingSamples] = useState(false)
  const fileInputRef = useRef(null)

  // ─── Azure AI Configuration ───────────────────────────────────────────────
  const [showAISettings, setShowAISettings] = useState(false)
  const [aiConfig, setAiConfig] = useState(() => getAzureHealthConfig())
  const [testResult, setTestResult] = useState(null) // { ok, message }
  const [testingConnection, setTestingConnection] = useState(false)

  const aiEnabled = aiConfig.enabled && aiConfig.endpoint && aiConfig.apiKey

  const handleSaveAIConfig = (updates) => {
    const newConfig = { ...aiConfig, ...updates }
    setAiConfig(newConfig)
    saveAzureHealthConfig(newConfig)
    setTestResult(null) // Reset test when config changes
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    const result = await testAzureHealthConnection()
    setTestResult(result)
    setTestingConnection(false)
  }

  // ─── Upload & Process a document ──────────────────────────────────────────
  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setProcessing(true)
    const newDocs = []

    for (const file of files) {
      setProgress({ phase: 'starting', progress: 0, message: `Processing ${file.name}...` })
      try {
        // Step 1: Always extract text using local OCR/PDF.js pipeline
        const result = await processDocument(file, file.name, (p) => setProgress(p))

        // Step 2: If Azure AI is enabled, enhance extraction with cloud AI
        if (isAzureHealthEnabled() && result.text) {
          try {
            setProgress({ phase: 'ai-submit', progress: 0.7, message: 'Enhancing with Azure AI...' })
            const aiEntities = await analyzeWithAzureHealth(result.text, (p) => setProgress(p))

            // Merge AI entities with local extraction (AI takes priority)
            result.clinicalEntities = mergeEntities(result.clinicalEntities, aiEntities)
            result.extractionMethod = 'azure-ai'
          } catch (aiErr) {
            console.warn('[AI] Azure Health AI failed, using local extraction:', aiErr.message)
            result.aiError = aiErr.message
            result.extractionMethod = 'local-regex'
          }
        } else {
          result.extractionMethod = 'local-regex'
        }

        newDocs.push({ filename: file.name, result })
      } catch (err) {
        newDocs.push({
          filename: file.name,
          result: {
            text: '', method: 'error', confidence: 0, pageCount: 0,
            clinicalEntities: { demographics: null, dates: [], medications: [], diagnoses: [], vitals: [], labResults: [], allergies: [], procedures: [], documentType: 'Error', fullText: '' },
            nlpStats: { expansions: 0, corrections: 0 },
            metadata: { fileName: file.name, fileSize: file.size, error: err.message },
          },
        })
      }
    }

    setOcrDocuments(prev => [...prev, ...newDocs])
    setProcessing(false)
    setProgress(null)
    if (newDocs.length > 0) setExpandedDoc(ocrDocuments.length)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [ocrDocuments, setOcrDocuments])

  // ─── Load sample test PDFs ────────────────────────────────────────────────
  const handleLoadSamples = useCallback(async () => {
    setLoadingSamples(true)
    const newDocs = []

    for (const sample of SAMPLE_PDFS) {
      setProgress({ phase: 'loading', progress: 0, message: `Loading ${sample.label}...` })
      try {
        const resp = await fetch(`${import.meta.env.BASE_URL}sample-pdfs/${sample.name}`)
        if (!resp.ok) throw new Error(`Failed to fetch ${sample.name}`)
        const blob = await resp.blob()
        const file = new File([blob], sample.name, { type: 'application/pdf' })

        setProgress({ phase: 'processing', progress: 0.1, message: `Processing ${sample.label}...` })
        const result = await processDocument(file, sample.name, (p) => setProgress(p))

        // If Azure AI is enabled, enhance with AI
        if (isAzureHealthEnabled() && result.text) {
          try {
            setProgress({ phase: 'ai-submit', progress: 0.7, message: `AI analyzing ${sample.label}...` })
            const aiEntities = await analyzeWithAzureHealth(result.text, (p) => setProgress(p))
            result.clinicalEntities = mergeEntities(result.clinicalEntities, aiEntities)
            result.extractionMethod = 'azure-ai'
          } catch (aiErr) {
            console.warn('[AI] Azure fallback for sample:', aiErr.message)
            result.extractionMethod = 'local-regex'
          }
        } else {
          result.extractionMethod = 'local-regex'
        }

        newDocs.push({ filename: sample.name, result })
      } catch (err) {
        newDocs.push({
          filename: sample.name,
          result: {
            text: '', method: 'error', confidence: 0, pageCount: 0,
            clinicalEntities: { demographics: null, dates: [], medications: [], diagnoses: [], vitals: [], labResults: [], allergies: [], procedures: [], documentType: 'Error', fullText: '' },
            nlpStats: { expansions: 0, corrections: 0 },
            metadata: { fileName: sample.name, error: err.message },
          },
        })
      }
    }

    setOcrDocuments(prev => [...prev, ...newDocs])
    setLoadingSamples(false)
    setProgress(null)
    if (newDocs.length > 0) setExpandedDoc(ocrDocuments.length)
  }, [ocrDocuments, setOcrDocuments])

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false)
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    )
    if (!files.length) return
    // Trigger file processing using the same handler
    const fakeEvent = { target: { files } }
    await handleFileSelect(fakeEvent)
  }, [handleFileSelect])

  // ─── Confidence color helper ──────────────────────────────────────────────
  const confidenceColor = (c) => {
    if (c >= 90) return 'text-green-600 bg-green-50 border-green-200'
    if (c >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const methodLabel = (m) => {
    switch (m) {
      case 'pdf-text': return { label: 'PDF Text Extract', icon: FileText, color: 'bg-blue-100 text-blue-700' }
      case 'pdf-ocr':  return { label: 'PDF OCR (Scanned)', icon: ScanLine, color: 'bg-purple-100 text-purple-700' }
      case 'image-ocr': return { label: 'Image OCR', icon: FileImage, color: 'bg-indigo-100 text-indigo-700' }
      default:         return { label: m || 'Unknown', icon: FileText, color: 'bg-gray-100 text-gray-700' }
    }
  }

  const totalEntities = (entities) => {
    if (!entities) return 0
    return (entities.medications?.length || 0) + (entities.diagnoses?.length || 0) +
      (entities.labResults?.length || 0) + (entities.vitals?.length || 0) +
      (entities.allergies?.length || 0) + (entities.procedures?.length || 0)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MERGE — Combine local regex entities with AI entities (AI takes priority)
  // ───────────────────────────────────────────────────────────────────────────

  const mergeEntities = (local, ai) => {
    if (!ai) return local
    const merged = { ...local }

    // AI demographics override local (more accurate)
    if (ai.demographics && Object.keys(ai.demographics).length > 0) {
      merged.demographics = { ...(local.demographics || {}), ...ai.demographics }
    }

    // For list entities: use AI results if present, keep local as supplement
    const listKeys = ['medications', 'diagnoses', 'labResults', 'vitals', 'allergies', 'procedures']
    for (const key of listKeys) {
      const aiItems = ai[key] || []
      const localItems = local[key] || []
      if (aiItems.length > 0) {
        // Start with AI items, add any unique local items not already covered
        const aiNames = new Set(aiItems.map(i => (i.name || '').toLowerCase()))
        const unique = localItems.filter(li => !aiNames.has((li.name || '').toLowerCase()))
        merged[key] = [...aiItems, ...unique]
      }
    }

    return merged
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-7 h-7 text-indigo-600" />
            Document Intelligence
          </h2>
          <p className="text-gray-500 mt-1">Upload PDFs, scanned documents, or images — OCR + NLP extracts clinical data instantly</p>
        </div>
        <div className="flex items-center gap-2 mt-3 md:mt-0">
          {/* AI Mode Badge */}
          {aiEnabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
              <CloudLightning className="w-3.5 h-3.5" />
              Azure AI Enabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <Shield className="w-3.5 h-3.5" />
              100% Client-Side
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FileBarChart className="w-3.5 h-3.5" />
            {ocrDocuments.length} Document{ocrDocuments.length !== 1 ? 's' : ''} Processed
          </span>
          {/* AI Settings Toggle */}
          <button
            onClick={() => setShowAISettings(!showAISettings)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showAISettings
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            AI Settings
          </button>
        </div>
      </div>

      {/* Azure AI Settings Panel */}
      {showAISettings && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <CloudLightning className="w-5 h-5 text-purple-600" />
              Azure AI Extraction Settings
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{aiEnabled ? 'AI Active' : 'Local Only'}</span>
              <button
                onClick={() => handleSaveAIConfig({ enabled: !aiConfig.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  aiConfig.enabled ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  aiConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Mode Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border-2 transition-all ${!aiConfig.enabled ? 'border-green-400 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-gray-800">Local Extraction (Default)</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-center gap-1"><Lock className="w-3 h-3 text-green-500" /> 100% client-side — zero data leaves browser</li>
                <li className="flex items-center gap-1"><Zap className="w-3 h-3 text-green-500" /> Regex + dictionary-based NLP</li>
                <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> No API key or Azure subscription needed</li>
              </ul>
            </div>

            <div className={`p-4 rounded-xl border-2 transition-all ${aiConfig.enabled ? 'border-purple-400 bg-purple-50/50' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CloudLightning className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-gray-800">Azure AI (Enhanced)</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-center gap-1"><Brain className="w-3 h-3 text-purple-500" /> AI-powered clinical entity recognition</li>
                <li className="flex items-center gap-1"><Zap className="w-3 h-3 text-purple-500" /> Auto ICD-10, RxNorm, SNOMED CT, LOINC codes</li>
                <li className="flex items-center gap-1"><Shield className="w-3 h-3 text-purple-500" /> Negation & certainty detection</li>
              </ul>
            </div>
          </div>

          {/* API Configuration */}
          {aiConfig.enabled && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Azure Language Endpoint</label>
                <input
                  type="url"
                  placeholder="https://your-resource.cognitiveservices.azure.com"
                  value={aiConfig.endpoint || ''}
                  onChange={(e) => handleSaveAIConfig({ endpoint: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="Enter your Azure API key"
                  value={aiConfig.apiKey || ''}
                  onChange={(e) => handleSaveAIConfig({ apiKey: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection || !aiConfig.endpoint || !aiConfig.apiKey}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Test Connection
                </button>
                {testResult && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {testResult.message}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Credentials stored in browser localStorage only. Azure Health API is HIPAA-compliant with BAA.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
            : 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
        } shadow-lg`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !processing && !loadingSamples && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.bmp,.gif"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="p-8 text-center">
          {processing || loadingSamples ? (
            <div className="space-y-3">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
              <p className="text-sm font-medium text-indigo-700">{progress?.message || 'Processing...'}</p>
              {progress?.progress != null && (
                <div className="max-w-xs mx-auto bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((progress.progress || 0) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-indigo-600" />
              </div>
              <p className="text-base font-semibold text-gray-800">
                Drop PDF or image files here, or <span className="text-indigo-600 underline">browse</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports PDF (text & scanned), JPG, PNG, TIFF, BMP — up to 50 MB
              </p>
              <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> PDF Text Extract</span>
                <span className="flex items-center gap-1"><ScanLine className="w-3.5 h-3.5" /> Scanned PDF OCR</span>
                <span className="flex items-center gap-1"><FileImage className="w-3.5 h-3.5" /> Image OCR</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Load Sample Data Button */}
      {ocrDocuments.length === 0 && !processing && !loadingSamples && (
        <div className="flex items-center justify-center">
          <button
            onClick={handleLoadSamples}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Sparkles className="w-4 h-4" />
            Load Sample Clinical PDFs
          </button>
          <span className="ml-3 text-xs text-gray-400">5 realistic medical documents for testing</span>
        </div>
      )}

      {/* Processed Documents List */}
      {ocrDocuments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Processed Documents
          </h3>

          {ocrDocuments.map((doc, idx) => {
            const r = doc.result
            const isExpanded = expandedDoc === idx
            const ml = methodLabel(r.method)
            const MethodIcon = ml.icon
            const entCount = totalEntities(r.clinicalEntities)

            return (
              <div key={idx} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all">
                {/* Document Header (always visible) */}
                <button
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedDoc(isExpanded ? null : idx)}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{doc.filename}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ml.color}`}>
                        <MethodIcon className="w-3 h-3" />
                        {ml.label}
                      </span>
                      {r.pageCount > 0 && (
                        <span className="text-xs text-gray-500">{r.pageCount} page{r.pageCount !== 1 ? 's' : ''}</span>
                      )}
                      {r.clinicalEntities?.documentType && r.clinicalEntities.documentType !== 'Unknown' && (
                        <span className="text-xs text-gray-500">{r.clinicalEntities.documentType}</span>
                      )}
                      {r.extractionMethod === 'azure-ai' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <CloudLightning className="w-3 h-3" />
                          AI Enhanced
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {r.method !== 'error' && (
                      <>
                        <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${confidenceColor(r.confidence)}`}>
                          {Math.round(r.confidence)}% confidence
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium">
                          <Search className="w-3 h-3" />
                          {entCount} entities
                        </span>
                      </>
                    )}
                    {r.method === 'error' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        Error
                      </span>
                    )}
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 space-y-5 bg-gray-50/30">
                    {/* NLP Stats Bar */}
                    {(r.nlpStats?.expansions > 0 || r.nlpStats?.corrections > 0) && (
                      <div className="flex items-center gap-4 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                        <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <span className="font-semibold">NLP Processing:</span>{' '}
                          {r.nlpStats.expansions > 0 && <span>{r.nlpStats.expansions} abbreviation{r.nlpStats.expansions !== 1 ? 's' : ''} expanded</span>}
                          {r.nlpStats.expansions > 0 && r.nlpStats.corrections > 0 && <span> · </span>}
                          {r.nlpStats.corrections > 0 && <span>{r.nlpStats.corrections} spelling correction{r.nlpStats.corrections !== 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                    )}

                    {/* Demographics */}
                    {r.clinicalEntities?.demographics && (
                      <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-gray-600" />
                          Demographics
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          {r.clinicalEntities.demographics.name && (
                            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{r.clinicalEntities.demographics.name}</span></div>
                          )}
                          {r.clinicalEntities.demographics.dateOfBirth && (
                            <div><span className="text-gray-500">DOB:</span> <span className="font-medium">{r.clinicalEntities.demographics.dateOfBirth}</span></div>
                          )}
                          {r.clinicalEntities.demographics.age && (
                            <div><span className="text-gray-500">Age:</span> <span className="font-medium">{r.clinicalEntities.demographics.age}</span></div>
                          )}
                          {r.clinicalEntities.demographics.sex && (
                            <div><span className="text-gray-500">Sex:</span> <span className="font-medium">{r.clinicalEntities.demographics.sex}</span></div>
                          )}
                          {r.clinicalEntities.demographics.mrn && (
                            <div><span className="text-gray-500">MRN:</span> <span className="font-medium">{r.clinicalEntities.demographics.mrn}</span></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Clinical Entity Sections */}
                    {ENTITY_SECTIONS.map(({ key, label, icon: Icon, bgClass, textClass, borderClass }) => {
                      const items = r.clinicalEntities?.[key] || []
                      if (items.length === 0) return null

                      return (
                        <div key={key} className={`p-4 rounded-xl border ${borderClass} ${bgClass} shadow-sm`}>
                          <h4 className={`text-sm font-semibold ${textClass} mb-3 flex items-center gap-2`}>
                            <Icon className="w-4 h-4" />
                            {label}
                            <span className="ml-auto text-xs font-normal opacity-75">{items.length} found</span>
                          </h4>
                          <div className="space-y-1.5">
                            {items.slice(0, 15).map((item, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm bg-white/60 rounded-lg px-3 py-1.5">
                                <span className="font-medium text-gray-800 flex-1">
                                  {/* Medications */}
                                  {key === 'medications' && (item.generic || item.name || item.brand || item)}
                                  {/* Diagnoses */}
                                  {key === 'diagnoses' && (typeof item === 'string' ? item : item.text || item.description || item.name)}
                                  {/* Labs */}
                                  {key === 'labResults' && (
                                    <span>
                                      {item.name || item.test}{item.value ? `: ${item.value}` : ''}{item.unit ? ` ${item.unit}` : ''}
                                      {item.flag && item.flag !== 'Normal' && (
                                        <span className="ml-1 text-xs text-red-600 font-semibold">({item.flag})</span>
                                      )}
                                    </span>
                                  )}
                                  {/* Vitals */}
                                  {key === 'vitals' && (
                                    <span>{item.name || item.type}: {item.value}{item.unit ? ` ${item.unit}` : ''}</span>
                                  )}
                                  {/* Allergies */}
                                  {key === 'allergies' && (typeof item === 'string' ? item : item.allergen || item.name || item.text)}
                                  {/* Procedures */}
                                  {key === 'procedures' && (typeof item === 'string' ? item : item.name || item.text)}
                                </span>
                                {/* Code badges */}
                                {item.rxcui && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-100 text-blue-600">RxCUI:{item.rxcui}</span>
                                )}
                                {item.drugClass && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-500">{item.drugClass}</span>
                                )}
                                {(item.icd10 || (item.code && item.codeSystem?.includes('ICD'))) && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-100 text-red-600">ICD-10:{item.icd10 || item.code}</span>
                                )}
                                {(item.snomed || item.snomedCT) && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-100 text-orange-600">SNOMED:{item.snomed || item.snomedCT}</span>
                                )}
                                {item.loinc && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono bg-green-100 text-green-600">LOINC:{item.loinc}</span>
                                )}
                                {item.aiConfidence != null && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-50 text-purple-500">
                                    AI:{Math.round(item.aiConfidence * 100)}%
                                  </span>
                                )}
                              </div>
                            ))}
                            {items.length > 15 && (
                              <p className="text-xs text-gray-500 pl-3">... and {items.length - 15} more</p>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Extracted Text (collapsible) */}
                    {r.text && (
                      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <button
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowText(prev => ({ ...prev, [idx]: !prev[idx] }))
                          }}
                        >
                          {showText[idx] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {showText[idx] ? 'Hide' : 'Show'} Extracted Text
                          <span className="ml-auto text-xs font-normal text-gray-400">{r.text.length.toLocaleString()} characters</span>
                        </button>
                        {showText[idx] && (
                          <div className="border-t border-gray-100 p-4 max-h-80 overflow-y-auto">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{r.text}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {r.metadata?.fileSize && (
                        <span>{(r.metadata.fileSize / 1024).toFixed(1)} KB</span>
                      )}
                      {r.metadata?.extension && (
                        <span>.{r.metadata.extension.toUpperCase()}</span>
                      )}
                      {r.clinicalEntities?.dates?.length > 0 && (
                        <span>{r.clinicalEntities.dates.length} date{r.clinicalEntities.dates.length !== 1 ? 's' : ''} found</span>
                      )}
                    </div>

                    {/* Error message */}
                    {r.metadata?.error && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                        <strong>Error:</strong> {r.metadata.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {ocrDocuments.length === 0 && !processing && !loadingSamples && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
            <ScanLine className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600">No Documents Processed Yet</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
            Upload a PDF, scanned document, or image above — or load the sample clinical PDFs to see
            Document Intelligence in action. All processing happens 100% in your browser.
          </p>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          How Document Intelligence Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Upload', desc: 'Drop a PDF, scanned doc, or photo of a clinical document', icon: Upload, color: 'from-blue-500 to-blue-600' },
            { step: '2', title: 'Extract', desc: 'PDF.js reads text layers; Tesseract.js OCRs scanned pages', icon: ScanLine, color: 'from-purple-500 to-purple-600' },
            { step: '3', title: 'Analyze', desc: aiEnabled ? 'Azure AI detects entities with negation & certainty' : 'Regex + dictionary NLP extracts clinical entities', icon: aiEnabled ? CloudLightning : Sparkles, color: aiEnabled ? 'from-purple-500 to-pink-600' : 'from-indigo-500 to-indigo-600' },
            { step: '4', title: 'Classify', desc: 'Maps to ICD-10, LOINC, SNOMED CT, RxNorm standard codes', icon: Brain, color: 'from-green-500 to-green-600' },
          ].map(({ step, title, desc, icon: StepIcon, color }) => (
            <div key={step} className="flex flex-col items-center text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                <StepIcon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
