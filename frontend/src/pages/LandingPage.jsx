import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  Database,
  Sparkles,
  Shield,
  TrendingUp,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  Plus,
  X,
  FileText,
  GitBranch,
  AlertTriangle,
  User,
  Calendar,
} from 'lucide-react'
import FileUpload from '../components/FileUpload'
import { useData } from '../context/DataContext'
import { PrivacyPanel } from '../components/PrivacyBanner'
import { APP_VERSION } from '../utils/privacy'

export default function LandingPage() {
  const navigate = useNavigate()
  const { uploadedFiles, loadSampleData, dataSources, patientMismatch, confirmMismatch, dismissMismatch, removeDataSource } = useData()
  const [showUpload, setShowUpload] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const hasSources = dataSources.length > 0

  const handleFilesUploaded = () => navigate('/dashboard')

  // When user finishes uploading a new source file and wants to add another
  const handleSourceAdded = () => {
    setShowUpload(false)
  }

  const handleContinueToDashboard = () => {
    navigate('/dashboard')
  }

  const handleTrySampleData = () => {
    setLoadingSample(true)
    setTimeout(() => {
      const success = loadSampleData()
      if (success) navigate('/dashboard')
      setLoadingSample(false)
    }, 600)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    setShowUpload(true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-purple-400/20 to-pink-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-indigo-400/10 to-blue-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Header with Glass Effect */}
      <header className="backdrop-blur-md bg-white/70 border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg" style={{boxShadow: '0 4px 14px rgba(59,130,246,0.3)'}}>
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                HealthLens
              </span>
              <p className="text-xs text-gray-500 -mt-1">EHI Ignite Challenge</p>
            </div>
          </div>
          <div className="hidden sm:flex gap-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">About</button>
            <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">Help</button>
            <button className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Sign In</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 relative z-10">
        <div className="max-w-5xl w-full space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-4">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">AI-Powered Health Insights</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent leading-tight">
              Transform Your Health Records
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Into beautiful stories you understand with AI-powered visualizations and insights
            </p>
          </div>

          {/* Upload Card with Glassmorphism */}
          <div className="rounded-2xl shadow-2xl overflow-hidden" style={{boxShadow: '0 25px 50px rgba(59,130,246,0.1)'}}>

            {/* Patient Mismatch Warning */}
            {patientMismatch && (
              <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-800">Different Patient Detected</p>
                    <p className="text-sm text-yellow-700 mt-1">{patientMismatch.message}</p>
                    <div className="flex gap-3 mt-3">
                      <button onClick={confirmMismatch} className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 transition-colors">
                        Add Anyway
                      </button>
                      <button onClick={dismissMismatch} className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-yellow-300 text-yellow-700 hover:bg-yellow-100 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loaded Data Sources with Patient Identity Cards */}
            {hasSources && !showUpload && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200/50 px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Loaded Data Sources</h3>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{dataSources.length}</span>
                </div>

                {/* Patient Match Summary */}
                {dataSources.length >= 2 && (
                  <div className={`mb-3 p-3 rounded-lg border flex items-center gap-2 ${
                    dataSources.every(s => s.matchStatus === 'match' || s.matchStatus === 'first')
                      ? 'bg-green-50 border-green-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    {dataSources.every(s => s.matchStatus === 'match' || s.matchStatus === 'first') ? (
                      <><ShieldCheck className="w-4 h-4 text-green-600" /><span className="text-sm font-medium text-green-800">All sources verified — same patient</span></>
                    ) : (
                      <><ShieldAlert className="w-4 h-4 text-amber-600" /><span className="text-sm font-medium text-amber-800">Patient mismatch detected across sources</span></>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {dataSources.map((source, idx) => (
                    <div key={source.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: source.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{source.name}</p>
                          <p className="text-xs text-gray-500">{source.recordCount} records · {new Date(source.uploadDate).toLocaleDateString()}</p>
                        </div>
                        {/* Match Badge */}
                        {source.matchStatus === 'match' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            <ShieldCheck className="w-3 h-3" /> Match
                          </span>
                        )}
                        {(source.matchStatus === 'mismatch' || source.matchStatus === 'mismatch-confirmed') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                            <ShieldAlert className="w-3 h-3" /> Mismatch
                          </span>
                        )}
                        {(source.matchStatus === 'first' || idx === 0) && !source.matchStatus?.startsWith('mis') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <User className="w-3 h-3" /> Primary
                          </span>
                        )}
                        <button
                          onClick={() => removeDataSource(source.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Remove source"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Patient Identity */}
                      {source.patient && (
                        <div className="mt-2 ml-6 pl-3 border-l-2 border-indigo-200">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="font-medium text-gray-900">
                                {source.patient.name || `${source.patient.firstName || ''} ${source.patient.lastName || ''}`.trim() || 'N/A'}
                              </span>
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-600">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              DOB: {source.patient.birthDate || 'N/A'}
                            </span>
                            <span className="text-gray-600">
                              Sex: {source.patient.sex || 'N/A'}{source.patient.age ? ` · Age ${source.patient.age}` : ''}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Data Source
                  </button>
                  <button
                    onClick={handleContinueToDashboard}
                    className="px-6 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                  >
                    Continue to Dashboard →
                  </button>
                </div>
              </div>
            )}

            {!showUpload && !hasSources ? (
              <div
                className={`relative p-16 text-center transition-all duration-300 bg-white ${
                  isDragging ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : ''
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
              >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-indigo-400/10 to-transparent rounded-full translate-x-1/2 translate-y-1/2" />

                <div className="relative z-10">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl hover:scale-110 transition-transform cursor-pointer" style={{boxShadow: '0 10px 25px rgba(59,130,246,0.3)'}}>
                    <Upload className="w-10 h-10 text-white" />
                  </div>

                  <p className="text-xl font-semibold text-gray-900 mb-2">Drop your EHI file here</p>
                  <p className="text-gray-500 mb-8">or click to browse files</p>

                  {/* Supported Formats */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 max-w-md mx-auto border border-blue-100">
                    <p className="font-semibold text-gray-900 mb-3">Supported formats:</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="font-semibold text-blue-600">C-CDA</p>
                        <p className="text-xs text-gray-500">.xml</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="font-semibold text-indigo-600">FHIR</p>
                        <p className="text-xs text-gray-500">.json</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="font-semibold text-purple-600">Epic TSV</p>
                        <p className="text-xs text-gray-500">.tsv</p>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setShowUpload(true)}
                      className="px-8 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all shadow-lg cursor-pointer" style={{boxShadow: '0 4px 14px rgba(59,130,246,0.3)'}}
                    >
                      Browse Files
                    </button>
                    <button
                      onClick={handleTrySampleData}
                      disabled={loadingSample}
                      className="px-8 py-3 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {loadingSample ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Loading…
                        </span>
                      ) : 'Try Sample Data'}
                    </button>
                  </div>
                </div>
              </div>
            ) : !showUpload ? null : (
              <div className="bg-white p-8">
                {hasSources && (
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-900">Add Another Data Source</span>
                    </div>
                    <button
                      onClick={() => setShowUpload(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      ← Back to Sources
                    </button>
                  </div>
                )}
                <FileUpload onComplete={hasSources ? handleSourceAdded : handleFilesUploaded} />
              </div>
            )}
          </div>

          {/* Feature Cards Grid — Matches Figma exactly */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 transition-all hover:shadow-xl" style={{['--tw-shadow-color']: 'rgba(59,130,246,0.1)'}}>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform" style={{boxShadow: '0 4px 14px rgba(59,130,246,0.3)'}}>
                <Database className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-center">Multi-EHR Support</h3>
              <p className="text-sm text-gray-600 text-center">Works with all major formats</p>
            </div>

            <div className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-purple-300 transition-all hover:shadow-xl" style={{['--tw-shadow-color']: 'rgba(168,85,247,0.1)'}}>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform" style={{boxShadow: '0 4px 14px rgba(168,85,247,0.3)'}}>
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-center">AI Summaries</h3>
              <p className="text-sm text-gray-600 text-center">Understand your health story</p>
            </div>

            <div className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-green-300 transition-all hover:shadow-xl" style={{['--tw-shadow-color']: 'rgba(34,197,94,0.1)'}}>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform" style={{boxShadow: '0 4px 14px rgba(34,197,94,0.3)'}}>
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-center">Timeline View</h3>
              <p className="text-sm text-gray-600 text-center">See your health journey</p>
            </div>

            <div className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-red-300 transition-all hover:shadow-xl" style={{['--tw-shadow-color']: 'rgba(239,68,68,0.1)'}}>
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform" style={{boxShadow: '0 4px 14px rgba(239,68,68,0.3)'}}>
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-center">Secure & Private</h3>
              <p className="text-sm text-gray-600 text-center">Data never leaves device</p>
            </div>
          </div>

          {/* Privacy Badge */}
          <div className="flex justify-center">
            <button
              onClick={() => setPrivacyOpen(true)}
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full hover:shadow-lg hover:border-green-300 transition-all group cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-green-900">🔒 Your data never leaves your device</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </button>
          </div>

          {/* Privacy Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Zero Server Contact</p>
                <p className="text-xs text-gray-500">No PHI transmitted</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">AES-256 Encryption</p>
                <p className="text-xs text-gray-500">Optional local storage</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 p-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Session-Only Mode</p>
                <p className="text-xs text-gray-500">Auto-clears on close</p>
              </div>
            </div>
          </div>

          {/* Version Footer */}
          <div className="flex justify-center">
            <span className="text-xs text-gray-400">HealthLens v{APP_VERSION} — HIPAA-Ready Architecture</span>
          </div>
        </div>
      </div>

      {/* Privacy Panel Modal */}
      <PrivacyPanel isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  )
}
