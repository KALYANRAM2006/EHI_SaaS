import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  Database,
  Sparkles,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react'
import FileUpload from '../components/FileUpload'
import { useData } from '../context/DataContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { uploadedFiles, loadSampleData } = useData()
  const [showUpload, setShowUpload] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleFilesUploaded = () => navigate('/dashboard')

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
    // Trigger the FileUpload component view for actual handling
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
            {!showUpload ? (
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
            ) : (
              <div className="bg-white p-8">
                <FileUpload onComplete={handleFilesUploaded} />
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
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-900">🔒 Your data never leaves your device</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
