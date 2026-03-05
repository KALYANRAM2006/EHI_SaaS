import { useState, useEffect, useMemo } from 'react'
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
  ChevronDown,
  Sparkles,
  User,
  HelpCircle,
  RefreshCw,
  TrendingUp,
  Syringe,
  Share2,
  Search,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { generateAISummary, providers } from '../data/sampleData'

export default function Dashboard() {
  const navigate = useNavigate()
  const { uploadedFiles, parsedData, loading, isSampleData, aiSummary, setAiSummary, selectedPatient, selectPatient } = useData()
  const [activeView, setActiveView] = useState('overview')
  const [expandedSections, setExpandedSections] = useState({ overall: true })
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    if (uploadedFiles.length === 0) {
      navigate('/')
    }
  }, [uploadedFiles, navigate])

  // Derive dashboard stats from parsed data
  const stats = useMemo(() => {
    if (!parsedData || !selectedPatient) return null
    return {
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      age: selectedPatient.age,
      sex: selectedPatient.sex,
      conditions: selectedPatient.conditions || [],
      medications: selectedPatient.medications || [],
      encounters: selectedPatient.encounters || [],
      results: selectedPatient.results || [],
      orders: selectedPatient.orders || [],
      abnormalResults: selectedPatient.abnormalResults || [],
    }
  }, [parsedData, selectedPatient])

  const categoryCards = useMemo(() => {
    if (!stats) return []
    const activeConditions = stats.conditions.filter(c => c.status === 'Active')
    return [
      {
        emoji: '💊', label: 'Medications',
        count: `${stats.medications.length} Active`,
        stat: stats.medications.length > 0 ? stats.medications[0].name : 'None',
        detail: stats.medications.length > 1 ? `+${stats.medications.length - 1} more` : '',
        link: 'medications',
      },
      {
        emoji: '🧪', label: 'Lab Results',
        count: `${stats.results.length} Results`,
        stat: `${stats.abnormalResults.length} Abnormal`,
        detail: `${stats.orders.length} Orders`,
        link: 'labs',
      },
      {
        emoji: '🏥', label: 'Visits',
        count: `${stats.encounters.length} Encounters`,
        stat: stats.encounters.length > 0 ? `Last: ${new Date(stats.encounters[0].contactDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'None',
        detail: '',
        link: 'encounters',
      },
      {
        emoji: '⚠️', label: 'Conditions',
        count: `${activeConditions.length} Active`,
        stat: activeConditions.length > 0 ? activeConditions[0].name : 'None documented',
        detail: activeConditions.length > 1 ? `+${activeConditions.length - 1} more` : '',
        link: 'conditions',
      },
      {
        emoji: '📋', label: 'Procedures',
        count: `${stats.orders.filter(o => o.orderType === 'Imaging').length} Imaging`,
        stat: `${stats.orders.filter(o => o.orderType === 'Lab').length} Lab Orders`,
        detail: '',
        link: 'procedures',
      },
      {
        emoji: '📊', label: 'Trends',
        count: `${stats.results.length} Data Points`,
        stat: stats.abnormalResults.length > 0 ? 'Attention needed' : 'All normal',
        detail: '',
        link: 'trends',
      },
    ]
  }, [stats])

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const handleRegenerateAI = () => {
    if (!selectedPatient) return
    setRegenerating(true)
    setTimeout(() => {
      setAiSummary(generateAISummary(selectedPatient))
      setRegenerating(false)
    }, 1200)
  }

  const handleExport = () => {
    alert('Export functionality will be implemented with PDF generation')
  }

  // Render markdown-style bold text
  const renderFormattedText = (text) => {
    if (!text) return null
    // Split on **bold** markers
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      }
      return <span key={i}>{part}</span>
    })
  }

  const navTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'ai-summary', label: 'AI Summary' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'records', label: 'Records' },
    { id: 'data-explorer', label: 'Data Explorer' },
  ]

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <svg className="animate-spin w-12 h-12 mx-auto text-primary-600 mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-gray-600">Loading your health data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-purple-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">HealthLens</span>
              </div>
              {/* Nav tabs matching screenshot */}
              <nav className="hidden md:flex items-center space-x-1">
                {navTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeView === tab.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            {/* Right: Patient selector + actions */}
            <div className="flex items-center space-x-3">
              {parsedData?.patients?.length > 1 && (
                <select
                  value={selectedPatient?.patId || ''}
                  onChange={(e) => selectPatient(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {parsedData.patients.map((p) => (
                    <option key={p.patId} value={p.patId}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={handleExport} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Export">
                <Download className="w-5 h-5" />
              </button>
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

        {/* ===== OVERVIEW (Dashboard) VIEW ===== */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Health Summary for {stats.patientName}
              </h2>
              <p className="text-gray-600 mt-1">
                📊 {stats.age}-year-old {stats.sex} | {stats.encounters.length + stats.orders.length + stats.results.length} records | {isSampleData ? 'Sample Data' : 'Uploaded Data'} • Last Updated: Today
              </p>
            </div>

            {/* AI Health Summary Preview Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">AI Health Summary</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRegenerateAI}
                    disabled={regenerating}
                    className="flex items-center space-x-1 px-3 py-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                  <button className="flex items-center space-x-1 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium">
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {aiSummary && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    ✨ Generated using AI • Based on {aiSummary.basedOn}
                  </p>
                  {/* Show only the Overall Health Story section as preview */}
                  {aiSummary.sections.filter(s => s.id === 'overall').map(section => (
                    <div key={section.id} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-100">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-xl">{section.icon}</span>
                        <h4 className="text-lg font-semibold text-gray-900">{section.title}</h4>
                      </div>
                      <div className="text-gray-700 leading-relaxed space-y-2">
                        {section.content.split('\n\n').map((paragraph, i) => (
                          <p key={i}>{renderFormattedText(paragraph)}</p>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Key Highlights:</p>
                    <ul className="space-y-1.5 text-gray-700">
                      <li className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        <span>{stats.medications.length} medication{stats.medications.length !== 1 ? 's' : ''} currently prescribed</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        <span>{stats.conditions.filter(c => c.status === 'Active').length} active health condition{stats.conditions.filter(c => c.status === 'Active').length !== 1 ? 's' : ''} being managed</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        <span>{stats.results.length} lab results on file ({stats.abnormalResults.length} abnormal)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        <span>{stats.encounters.length} healthcare encounters documented</span>
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
              )}
            </div>

            {/* Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {categoryCards.map((card, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => setActiveView(card.link)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{card.emoji}</div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{card.label}</h3>
                  <div className="space-y-1 mb-4">
                    <p className="text-2xl font-bold text-gray-900">{card.count}</p>
                    <p className="text-sm text-gray-600">{card.stat}</p>
                    {card.detail && <p className="text-sm text-gray-500">{card.detail}</p>}
                  </div>
                  <span className="text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1 text-sm">
                    <span>View All</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              ))}
            </div>

            {/* Health Trends */}
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
              {stats.results.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Lab Values Overview</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {stats.results.filter(r => r.numValue != null).slice(0, 8).map((result, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${result.flag === 'Normal' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <p className="text-xs font-medium text-gray-500 truncate">{result.component}</p>
                        <p className={`text-lg font-bold ${result.flag === 'Normal' ? 'text-green-700' : 'text-red-700'}`}>
                          {result.value} <span className="text-xs font-normal">{result.unit}</span>
                        </p>
                        <p className="text-xs text-gray-500">{result.refLow}-{result.refHigh}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No lab results available for trends</p>
              )}
            </div>
          </div>
        )}

        {/* ===== AI SUMMARY VIEW ===== */}
        {activeView === 'ai-summary' && aiSummary && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">AI Health Summary</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRegenerateAI}
                  disabled={regenerating}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Meta info */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center space-x-3 text-sm text-gray-600">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span>Generated using AI • Based on {aiSummary.basedOn}</span>
            </div>

            {/* AI Summary Sections - expandable cards */}
            {aiSummary.sections.map((section) => (
              <div key={section.id} className={`bg-white rounded-2xl shadow-lg overflow-hidden ${section.id === 'overall' ? 'ring-2 ring-blue-100' : ''}`}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{section.icon}</span>
                    <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                  </div>
                  {expandedSections[section.id] ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {expandedSections[section.id] && (
                  <div className={`px-6 pb-6 ${section.id === 'overall' ? 'bg-gradient-to-r from-blue-50/50 to-purple-50/50' : ''}`}>
                    <div className="text-gray-700 leading-relaxed space-y-3 pl-11">
                      {section.content.split('\n\n').map((paragraph, i) => (
                        <div key={i}>
                          {paragraph.split('\n').map((line, j) => (
                            <p key={j} className={line.startsWith('•') || line.startsWith('✓') || line.startsWith('⚠') || line.startsWith('ℹ') ? 'ml-2 mb-1' : 'mb-2'}>
                              {renderFormattedText(line)}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Export actions */}
            <div className="flex items-center space-x-3 pt-4">
              <button onClick={handleExport} className="btn-primary inline-flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Export as PDF</span>
              </button>
              <button className="btn-secondary inline-flex items-center space-x-2">
                <Share2 className="w-5 h-5" />
                <span>Share with Provider</span>
              </button>
            </div>
          </div>
        )}

        {/* ===== TIMELINE VIEW ===== */}
        {activeView === 'timeline' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Health Timeline</h2>
            {/* Filter bar */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-2">
              {['All', 'Visits', 'Labs', 'Imaging'].map(filter => (
                <button key={filter} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'All' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {filter}
                </button>
              ))}
              <div className="flex-1" />
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search events..." className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48" />
              </div>
            </div>
            {/* Timeline events */}
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
              {stats.encounters
                .sort((a, b) => new Date(b.contactDate) - new Date(a.contactDate))
                .map((enc, i) => {
                  const prov = providers[enc.visitProvider]
                  const encTypeEmoji = enc.encType === 'Emergency' ? '🚨' : enc.encType === 'Hospital Encounter' ? '🏨' : '🩺'
                  return (
                    <div key={i} className="relative pl-16 pb-8">
                      <div className="absolute left-6 w-5 h-5 bg-white border-2 border-primary-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary-500 rounded-full" />
                      </div>
                      <div className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              {new Date(enc.contactDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="font-semibold text-gray-900">
                              {encTypeEmoji} {enc.encType}: {enc.diagnosis}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {prov?.name || 'Provider'} | {prov?.specialty || 'Specialist'}
                            </p>
                            {enc.chiefComplaint && <p className="text-sm text-gray-500 mt-1">Chief complaint: {enc.chiefComplaint}</p>}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${enc.patientClass === 'Emergency' ? 'bg-red-100 text-red-700' : enc.patientClass === 'Inpatient' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {enc.patientClass}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ===== RECORDS VIEW ===== */}
        {activeView === 'records' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Health Records</h2>
              <span className="text-gray-500">{stats.encounters.length + stats.orders.length + stats.results.length} Total Records</span>
            </div>
            {/* Encounters */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🏥 Encounters ({stats.encounters.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Provider</th>
                      <th className="pb-3 pr-4">Diagnosis</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.encounters.sort((a, b) => new Date(b.contactDate) - new Date(a.contactDate)).map((enc, i) => {
                      const prov = providers[enc.visitProvider]
                      return (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 pr-4">{new Date(enc.contactDate).toLocaleDateString()}</td>
                          <td className="py-3 pr-4">{enc.encType}</td>
                          <td className="py-3 pr-4">{prov?.name || 'Unknown'}</td>
                          <td className="py-3 pr-4">{enc.diagnosis}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${enc.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {enc.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Lab Results */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🧪 Lab Results ({stats.results.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-3 pr-4">Component</th>
                      <th className="pb-3 pr-4">Value</th>
                      <th className="pb-3 pr-4">Unit</th>
                      <th className="pb-3 pr-4">Reference</th>
                      <th className="pb-3 pr-4">Flag</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.results.map((result, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${result.flag !== 'Normal' ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                        <td className="py-3 pr-4 font-medium">{result.component}</td>
                        <td className="py-3 pr-4 font-semibold">{result.value}</td>
                        <td className="py-3 pr-4 text-gray-500">{result.unit}</td>
                        <td className="py-3 pr-4 text-gray-500">{result.refLow}-{result.refHigh}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${result.flag === 'Normal' ? 'bg-green-100 text-green-700' : result.flag === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {result.flag}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500">{new Date(result.resultTime).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== MEDICATIONS VIEW ===== */}
        {activeView === 'medications' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Active Medications</h2>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {stats.medications.length > 0 ? (
                <div className="space-y-4">
                  {stats.medications.map((med, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Pill className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{med.name}</p>
                            <p className="text-sm text-gray-600 mt-1">{med.dosage}</p>
                            <p className="text-sm text-gray-500 mt-1">{med.purpose}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>Prescribed by {med.prescriber}</span>
                              <span>•</span>
                              <span>Started {new Date(med.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No active medications documented</p>
              )}
            </div>
          </div>
        )}

        {/* ===== CONDITIONS VIEW ===== */}
        {activeView === 'conditions' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Health Conditions</h2>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {stats.conditions.length > 0 ? (
                <div className="space-y-4">
                  {stats.conditions.map((condition, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{condition.name}</p>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span>Onset: {new Date(condition.onset).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Severity: {condition.severity}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${condition.status === 'Active' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {condition.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No conditions documented</p>
              )}
            </div>
          </div>
        )}

        {/* ===== DATA EXPLORER VIEW ===== */}
        {activeView === 'data-explorer' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Data Explorer</h2>
            <p className="text-gray-600">Raw health data from {parsedData?.totalPatients || 0} patients across {parsedData?.totalRecords || 0} records</p>

            {/* Patient list */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Patients ({parsedData?.patients?.length || 0})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Age</th>
                      <th className="pb-3 pr-4">Sex</th>
                      <th className="pb-3 pr-4">City</th>
                      <th className="pb-3 pr-4">Encounters</th>
                      <th className="pb-3 pr-4">Results</th>
                      <th className="pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(parsedData?.patients || []).map((patient, i) => (
                      <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedPatient?.patId === patient.patId ? 'bg-primary-50' : ''}`}>
                        <td className="py-3 pr-4 font-medium">{patient.firstName} {patient.lastName}</td>
                        <td className="py-3 pr-4">{patient.age}</td>
                        <td className="py-3 pr-4">{patient.sex}</td>
                        <td className="py-3 pr-4">{patient.city}, {patient.state}</td>
                        <td className="py-3 pr-4">{patient.encounterCount}</td>
                        <td className="py-3 pr-4">{patient.resultCount}</td>
                        <td className="py-3">
                          <button
                            onClick={() => { selectPatient(patient.patId); setActiveView('overview'); }}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== FALLBACK PLACEHOLDER VIEWS ===== */}
        {['labs', 'encounters', 'procedures', 'trends'].includes(activeView) && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <button onClick={() => setActiveView('overview')} className="text-primary-600 hover:text-primary-700 text-sm font-medium">← Back to Dashboard</button>
            </div>
            {activeView === 'labs' && stats.results.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Lab Results</h2>
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500">
                          <th className="pb-3 pr-4">Component</th>
                          <th className="pb-3 pr-4">Value</th>
                          <th className="pb-3 pr-4">Unit</th>
                          <th className="pb-3 pr-4">Reference Range</th>
                          <th className="pb-3 pr-4">Flag</th>
                          <th className="pb-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.results.map((result, i) => (
                          <tr key={i} className={`border-b border-gray-100 ${result.flag !== 'Normal' ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className="py-3 pr-4 font-medium">{result.component}</td>
                            <td className="py-3 pr-4 font-semibold">{result.value}</td>
                            <td className="py-3 pr-4 text-gray-500">{result.unit}</td>
                            <td className="py-3 pr-4 text-gray-500">{result.refLow}-{result.refHigh}</td>
                            <td className="py-3 pr-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${result.flag === 'Normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {result.flag}
                              </span>
                            </td>
                            <td className="py-3 text-gray-500">{new Date(result.resultTime).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeView === 'encounters' && stats.encounters.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Encounters</h2>
                {stats.encounters.sort((a, b) => new Date(b.contactDate) - new Date(a.contactDate)).map((enc, i) => {
                  const prov = providers[enc.visitProvider]
                  return (
                    <div key={i} className="bg-white rounded-xl shadow-sm p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-500">{new Date(enc.contactDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                          <p className="font-semibold text-gray-900 mt-1">{enc.encType}: {enc.diagnosis}</p>
                          <p className="text-sm text-gray-600 mt-1">{prov?.name} | {prov?.specialty}</p>
                          {enc.chiefComplaint && <p className="text-sm text-gray-500 mt-1">Complaint: {enc.chiefComplaint}</p>}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${enc.patientClass === 'Emergency' ? 'bg-red-100 text-red-700' : enc.patientClass === 'Inpatient' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {enc.patientClass}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 capitalize">{activeView.replace('-', ' ')}</h3>
                  <p className="text-gray-600 mb-6">
                    No {activeView.replace('-', ' ')} data available for this patient.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
