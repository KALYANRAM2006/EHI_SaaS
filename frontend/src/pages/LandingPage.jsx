import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  Database,
  Sparkles,
  Clock,
  Shield,
  FileText,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import FileUpload from '../components/FileUpload'
import { useData } from '../context/DataContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { uploadedFiles, loadSampleData } = useData()
  const [showUpload, setShowUpload] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)

  const handleFilesUploaded = () => {
    // Navigate to dashboard after files are uploaded
    navigate('/dashboard')
  }

  const handleTrySampleData = () => {
    setLoadingSample(true)
    // Brief delay so user sees the loading state
    setTimeout(() => {
      const success = loadSampleData()
      if (success) {
        navigate('/dashboard')
      }
      setLoadingSample(false)
    }, 600)
  }

  const features = [
    {
      icon: Database,
      title: 'Multi-EHR Support',
      description: 'Works with all major formats',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Sparkles,
      title: 'AI Summaries',
      description: 'Understand your health story',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: Clock,
      title: 'Timeline View',
      description: 'See your health journey',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Data never leaves device',
      color: 'bg-red-100 text-red-600'
    }
  ]

  const supportedFormats = [
    { name: 'C-CDA', ext: '.xml', desc: 'Universal XML format' },
    { name: 'FHIR Bundle', ext: '.json', desc: 'Modern FHIR standard' },
    { name: 'Epic TSV', ext: '.tsv', desc: 'Epic EHI Tables export' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
      {/* ── Healthcare Background Illustrations ── */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        {/* ECG / Heartbeat line — top */}
        <svg className="absolute top-[12%] left-0 w-full opacity-[0.06]" height="80" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <polyline fill="none" stroke="#6366f1" strokeWidth="2.5"
            points="0,40 200,40 230,40 250,10 270,70 290,20 310,50 330,40 500,40 720,40 750,40 770,10 790,70 810,20 830,50 850,40 1020,40 1200,40 1230,40 1250,10 1270,70 1290,20 1310,50 1330,40 1440,40" />
        </svg>

        {/* DNA Helix — left side */}
        <svg className="absolute top-[30%] -left-6 w-28 h-[420px] opacity-[0.07]" viewBox="0 0 100 400">
          {[0,40,80,120,160,200,240,280,320,360].map((y,i) => (
            <g key={i}>
              <ellipse cx={i%2===0?30:70} cy={y+20} rx="28" ry="8" fill="none" stroke="#8b5cf6" strokeWidth="2" />
              <line x1="30" y1={y+20} x2="70" y2={y+20} stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 3" />
            </g>
          ))}
        </svg>

        {/* DNA Helix — right side */}
        <svg className="absolute top-[55%] -right-6 w-28 h-[420px] opacity-[0.07]" viewBox="0 0 100 400">
          {[0,40,80,120,160,200,240,280,320,360].map((y,i) => (
            <g key={i}>
              <ellipse cx={i%2===0?70:30} cy={y+20} rx="28" ry="8" fill="none" stroke="#3b82f6" strokeWidth="2" />
              <line x1="30" y1={y+20} x2="70" y2={y+20} stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4 3" />
            </g>
          ))}
        </svg>

        {/* Stethoscope — left middle */}
        <svg className="absolute top-[48%] left-[5%] w-36 h-36 opacity-[0.06]" viewBox="0 0 120 120">
          <path d="M40 20 C40 20, 20 20, 20 50 C20 80, 50 90, 60 90 C70 90, 100 80, 100 50 C100 20, 80 20, 80 20" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="95" r="12" fill="none" stroke="#6366f1" strokeWidth="3" />
          <circle cx="60" cy="95" r="5" fill="#6366f1" opacity="0.4" />
          <line x1="40" y1="20" x2="40" y2="8" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="20" x2="80" y2="8" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="6" r="3" fill="#6366f1" />
          <circle cx="80" cy="6" r="3" fill="#6366f1" />
        </svg>

        {/* Heart with pulse — right middle */}
        <svg className="absolute top-[38%] right-[6%] w-28 h-28 opacity-[0.06]" viewBox="0 0 100 100">
          <path d="M50 88 C50 88, 10 60, 10 35 C10 15, 30 10, 50 30 C70 10, 90 15, 90 35 C90 60, 50 88, 50 88Z" fill="none" stroke="#ec4899" strokeWidth="3" />
          <polyline fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" points="20,52 35,52 40,40 47,65 53,35 58,52 65,52 80,52" />
        </svg>

        {/* Pill Capsule — bottom-left */}
        <svg className="absolute bottom-[22%] left-[12%] w-24 h-24 opacity-[0.05] rotate-[30deg]" viewBox="0 0 100 50">
          <rect x="5" y="5" width="90" height="40" rx="20" fill="none" stroke="#10b981" strokeWidth="3" />
          <line x1="50" y1="5" x2="50" y2="45" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" />
          <rect x="5" y="5" width="45" height="40" rx="20" fill="#10b981" opacity="0.15" />
        </svg>

        {/* Microscope — bottom-right */}
        <svg className="absolute bottom-[18%] right-[10%] w-28 h-28 opacity-[0.05]" viewBox="0 0 100 110">
          <line x1="50" y1="20" x2="50" y2="70" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="15" r="10" fill="none" stroke="#6366f1" strokeWidth="3" />
          <ellipse cx="50" cy="80" rx="8" ry="5" fill="none" stroke="#6366f1" strokeWidth="3" />
          <line x1="30" y1="95" x2="70" y2="95" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="85" x2="50" y2="95" stroke="#6366f1" strokeWidth="3" />
          <line x1="35" y1="100" x2="65" y2="100" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
        </svg>

        {/* Scattered small dots */}
        {[
          { x: '15%', y: '25%', r: 6, color: '#6366f1' },
          { x: '85%', y: '28%', r: 5, color: '#8b5cf6' },
          { x: '75%', y: '62%', r: 7, color: '#3b82f6' },
          { x: '20%', y: '70%', r: 4, color: '#ec4899' },
          { x: '88%', y: '80%', r: 6, color: '#10b981' },
          { x: '8%',  y: '85%', r: 5, color: '#6366f1' },
          { x: '45%', y: '92%', r: 4, color: '#8b5cf6' },
          { x: '92%', y: '45%', r: 5, color: '#3b82f6' },
          { x: '55%', y: '15%', r: 4, color: '#a78bfa' },
        ].map((c, i) => (
          <svg key={i} className="absolute opacity-[0.10]" style={{ top: c.y, left: c.x, width: c.r * 2, height: c.r * 2 }} viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" fill={c.color} />
          </svg>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-purple-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                HealthLens
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium">
                How It Works
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            <span>100% Private - Your Data Never Leaves Your Device</span>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Health Records into
            <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent"> Stories You Can Understand</span>
          </h2>

          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Upload your Electronic Health Information from any provider.
            HealthLens transforms complex medical data into clear, actionable insights.
          </p>

          {/* Upload Area */}
          <div className="max-w-3xl mx-auto">
            {!showUpload ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 border-2 border-dashed border-gray-300 hover:border-primary-500 transition-colors duration-200">
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Drop your health records here
                </h3>
                <p className="text-gray-600 mb-6">
                  Supports C-CDA (.xml), FHIR Bundle (.json), Epic TSV (.tsv)
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowUpload(true)}
                    className="btn-primary inline-flex items-center space-x-2"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Browse Files</span>
                  </button>
                  <button
                    onClick={handleTrySampleData}
                    disabled={loadingSample}
                    className="btn-secondary inline-flex items-center space-x-2 disabled:opacity-50"
                  >
                    {loadingSample ? (
                      <>
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-5 h-5" />
                        <span>Try Sample Data</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <FileUpload onComplete={handleFilesUploaded} />
            )}
          </div>
        </div>
      </section>

      {/* Supported Formats */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Supported Formats
          </h3>
          <div className="flex justify-center space-x-8">
            {supportedFormats.map((format) => (
              <div key={format.name} className="text-center">
                <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-gray-900">{format.name}</span>
                  <span className="text-gray-500">{format.ext}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{format.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Powerful Features for Better Health Understanding
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to make sense of your health data
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="feature-card fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 bg-white/90 backdrop-blur-sm py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to unlock your health insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: '1',
                title: 'Upload Your Records',
                description: 'Drag and drop your health records from any EHR system. All processing happens locally in your browser.',
                icon: Upload
              },
              {
                step: '2',
                title: 'Automatic Processing',
                description: 'Our advanced parsers automatically detect the format and normalize your data using FHIR standards.',
                icon: Database
              },
              {
                step: '3',
                title: 'Explore & Understand',
                description: 'View your health timeline, get AI-powered summaries, and discover insights about your health journey.',
                icon: Sparkles
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-6">
                    {item.step}
                  </div>
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600">
                    {item.description}
                  </p>
                </div>
                {index < 2 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-6 w-12 h-12 text-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-purple-500 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">HealthLens</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Transform Your Health Data • Privacy-First • Multi-EHR Support
            </p>
            <p className="text-sm text-gray-500">
              Built by Health Data Alchemist for EHIgnite Challenge 2026
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Cedars-Sinai Health System
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
