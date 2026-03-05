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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
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
      <section id="how-it-works" className="bg-white py-20">
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
      <footer className="bg-gray-900 text-white py-12">
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
