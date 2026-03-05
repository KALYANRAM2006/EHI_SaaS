import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Calendar,
  Activity,
  Pill,
  TestTube,
  Stethoscope,
  AlertCircle,
  Download,
  ChevronRight,
  Sparkles,
  User,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  Syringe
} from 'lucide-react'
import { useData } from '../context/DataContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { uploadedFiles, parsedData, loading } = useData()
  const [activeView, setActiveView] = useState('dashboard')
  const [aiSummaryExpanded, setAiSummaryExpanded] = useState(false)

  useEffect(() => {
    // Redirect to landing page if no files uploaded
    if (uploadedFiles.length === 0) {
      navigate('/')
    }
  }, [uploadedFiles, navigate])

  // Category cards matching wireframe Screen 2
  const categoryCards = [
    {
      emoji: '💊',
      label: 'Medications',
      count: '12 Active',
      stat: '2 Changed',
      detail: 'Last: 30 days',
      link: 'medications'
    },
    {
      emoji: '🧪',
      label: 'Lab Results',
      count: '45 Results',
      stat: '3 Abnormal',
      detail: 'Last: 1 month',
      link: 'labs'
    },
    {
      emoji: '🏥',
      label: 'Visits',
      count: '18 Encounters',
      stat: 'Last: 2 weeks',
      detail: 'Next: TBD',
      link: 'encounters'
    },
    {
      emoji: '⚠️',
      label: 'Allergies',
      count: '3 Documented',
      stat: 'Penicillin',
      detail: 'Shellfish, Latex',
      link: 'allergies'
    },
    {
      emoji: '💉',
      label: 'Immunizations',
      count: '12 Vaccines',
      stat: 'Up to date',
      detail: 'Flu: Due',
      link: 'immunizations'
    },
    {
      emoji: '📋',
      label: 'Procedures',
      count: '8 Procedures',
      stat: 'Last: 6 months',
      detail: '',
      link: 'procedures'
    }
  ]

  const recentEncounters = [
    {
      date: '2026-02-15',
      type: 'Office Visit',
      provider: 'Dr. Sarah Johnson',
      department: 'Primary Care',
      diagnosis: 'Annual Physical Examination'
    },
    {
      date: '2026-01-10',
      type: 'Telehealth',
      provider: 'Dr. Michael Chen',
      department: 'Cardiology',
      diagnosis: 'Follow-up for Hypertension'
    },
    {
      date: '2025-11-22',
      type: 'Emergency',
      provider: 'Dr. Emily Rodriguez',
      department: 'Emergency Department',
      diagnosis: 'Acute Bronchitis'
    }
  ]

  const activeConditions = [
    { name: 'Essential Hypertension', onset: '2020-03-15', status: 'Active', severity: 'Moderate' },
    { name: 'Type 2 Diabetes Mellitus', onset: '2018-07-22', status: 'Active', severity: 'Mild' },
    { name: 'Hyperlipidemia', onset: '2019-11-10', status: 'Active', severity: 'Mild' },
    { name: 'Seasonal Allergic Rhinitis', onset: '2015-05-01', status: 'Active', severity: 'Mild' },
    { name: 'Gastroesophageal Reflux Disease', onset: '2021-02-18', status: 'Active', severity: 'Moderate' }
  ]

  const activeMedications = [
    { name: 'Lisinopril 10mg', dosage: '1 tablet daily', prescriber: 'Dr. Sarah Johnson', startDate: '2020-03-15' },
    { name: 'Metformin 500mg', dosage: '2 tablets twice daily', prescriber: 'Dr. Michael Chen', startDate: '2018-07-22' },
    { name: 'Atorvastatin 20mg', dosage: '1 tablet at bedtime', prescriber: 'Dr. Sarah Johnson', startDate: '2019-11-10' },
    { name: 'Omeprazole 20mg', dosage: '1 capsule daily', prescriber: 'Dr. Sarah Johnson', startDate: '2021-02-18' }
  ]

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export functionality will be implemented')
  }

  const handleRegenerateAI = () => {
    // TODO: Implement AI regeneration
    alert('AI Summary regeneration will be implemented')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-purple-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">HealthLens</span>
              </div>
              <nav className="hidden md:flex items-center space-x-1">
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeView === 'dashboard'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('timeline')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeView === 'timeline'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setActiveView('records')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeView === 'records'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Records
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Export
                </button>
              </nav>
            </div>
            {/* Right: User Actions */}
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Health Summary for John Doe</h2>
              <p className="text-gray-600 mt-1">
                📊 Data Sources: 3 providers | 245 records | 2018-2025 • Last Updated: Today
              </p>
            </div>

            {/* AI Health Summary Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">AI Health Summary</h3>
                </div>
                <button
                  onClick={handleRegenerateAI}
                  className="flex items-center space-x-1 px-3 py-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Regenerate</span>
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Your health records show consistent management of Type 2 diabetes with good glucose control over
                  the past 3 years. Recent lab results indicate stable kidney function and well-controlled blood pressure.
                </p>

                <div>
                  <p className="font-semibold text-gray-900 mb-2">Key Highlights:</p>
                  <ul className="space-y-1.5 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-primary-600 mr-2">•</span>
                      <span>12 medications currently prescribed</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-600 mr-2">•</span>
                      <span>No new allergies reported</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-600 mr-2">•</span>
                      <span>3 upcoming preventive care recommendations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-600 mr-2">•</span>
                      <span>Lab trends show improvement in HbA1c (7.2% → 6.8%)</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setActiveView('ai-summary')}
                  className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
                >
                  <span>Read Full Summary</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Cards - 2 rows of 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {categoryCards.map((card, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{card.emoji}</div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{card.label}</h3>
                  <div className="space-y-1 mb-4">
                    <p className="text-2xl font-bold text-gray-900">{card.count}</p>
                    <p className="text-sm text-gray-600">{card.stat}</p>
                    {card.detail && <p className="text-sm text-gray-500">{card.detail}</p>}
                  </div>
                  <button
                    onClick={() => setActiveView(card.link)}
                    className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1 text-sm"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Health Trends Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-6 h-6 text-primary-600" />
                  <h3 className="text-xl font-bold text-gray-900">Health Trends</h3>
                </div>
                <button
                  onClick={() => setActiveView('trends')}
                  className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
                >
                  <span>View Charts</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Blood Glucose Chart */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Blood Glucose (mg/dL)</p>
                <div className="relative h-32 bg-gray-50 rounded-lg p-4">
                  {/* Simple chart representation */}
                  <svg className="w-full h-full" viewBox="0 0 800 100" preserveAspectRatio="none">
                    <polyline
                      points="50,70 150,50 250,65 350,55 450,60 550,45 650,50 750,60"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="3"
                    />
                    {/* Data points */}
                    <circle cx="50" cy="70" r="4" fill="#6366f1" />
                    <circle cx="150" cy="50" r="4" fill="#6366f1" />
                    <circle cx="250" cy="65" r="4" fill="#6366f1" />
                    <circle cx="350" cy="55" r="4" fill="#6366f1" />
                    <circle cx="450" cy="60" r="4" fill="#6366f1" />
                    <circle cx="550" cy="45" r="4" fill="#6366f1" />
                    <circle cx="650" cy="50" r="4" fill="#6366f1" />
                    <circle cx="750" cy="60" r="4" fill="#6366f1" />
                  </svg>
                  <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs text-gray-500">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                    <span>Sep</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Average glucose levels remain well-controlled over the past 9 months</p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline View */}
        {activeView === 'timeline' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Interactive Health Timeline</h3>
              <p className="text-gray-600 mb-6">
                Visual chronological view of all health events with filtering capabilities will be displayed here.
              </p>
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <Activity className="w-4 h-4" />
                <span>Coming Soon</span>
              </div>
            </div>
          </div>
        )}

        {/* Records View */}
        {activeView === 'records' && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Detailed Records View</h3>
              <p className="text-gray-600 mb-6">
                Comprehensive list view with search, filter, and sorting capabilities will be displayed here.
              </p>
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm">
                <Activity className="w-4 h-4" />
                <span>Coming Soon</span>
              </div>
            </div>
          </div>
        )}

        {/* Medications View */}
        {activeView === 'medications' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Active Medications</h2>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="space-y-4">
                {activeMedications.map((med, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Pill className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{med.name}</p>
                          <p className="text-sm text-gray-600 mt-1">{med.dosage}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Prescribed by {med.prescriber}</span>
                            <span>•</span>
                            <span>Started {new Date(med.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Other Category Views Placeholder */}
        {['labs', 'encounters', 'allergies', 'immunizations', 'procedures', 'trends', 'ai-summary'].includes(activeView) && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 capitalize">{activeView.replace('-', ' ')}</h3>
              <p className="text-gray-600 mb-6">
                This section will display detailed {activeView.replace('-', ' ')} data once the parsers are fully implemented.
              </p>
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                <Activity className="w-4 h-4" />
                <span>Coming Soon</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
