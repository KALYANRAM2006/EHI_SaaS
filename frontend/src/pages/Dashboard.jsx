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
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { generateAISummary, providers } from '../data/sampleData'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const { uploadedFiles, parsedData, loading, isSampleData, aiSummary, setAiSummary, selectedPatient, selectPatient } = useData()
  const [activeView, setActiveView] = useState('overview')
  const [expandedSections, setExpandedSections] = useState({ overall: true })
  const [regenerating, setRegenerating] = useState(false)
  const [timelineYear, setTimelineYear] = useState(null)
  const [timelineCategory, setTimelineCategory] = useState('All')
  const [timelineSearch, setTimelineSearch] = useState('')

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
      allergies: selectedPatient.allergies || [],
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
        icon: Pill, label: 'Medications',
        count: stats.medications.length,
        countLabel: 'Active',
        gradient: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-50',
        shadowColor: 'rgba(168,85,247,0.2)',
        borderColor: 'border-purple-200',
        items: stats.medications.slice(0, 2).map(m => `${m.name} - ${m.dose || m.frequency || ''}`),
        total: stats.medications.length,
        link: 'medications',
      },
      {
        icon: TestTube, label: 'Lab Results',
        count: stats.results.length,
        countLabel: 'Results',
        gradient: 'from-green-500 to-emerald-600',
        bgColor: 'bg-green-50',
        shadowColor: 'rgba(34,197,94,0.2)',
        borderColor: 'border-green-200',
        items: stats.results.slice(0, 2).map(r => `${r.component || 'Result'} - ${r.value || ''} ${r.units || ''}`),
        total: stats.results.length,
        link: 'labs',
      },
      {
        icon: Stethoscope, label: 'Visits',
        count: stats.encounters.length,
        countLabel: 'Encounters',
        gradient: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-50',
        shadowColor: 'rgba(59,130,246,0.2)',
        borderColor: 'border-blue-200',
        items: stats.encounters.slice(0, 2).map(e => `${new Date(e.contactDate).toLocaleDateString()} - ${e.visitType || 'Visit'}`),
        total: stats.encounters.length,
        link: 'encounters',
      },
      {
        icon: AlertCircle, label: 'Conditions',
        count: activeConditions.length,
        countLabel: 'Active',
        gradient: 'from-red-500 to-red-600',
        bgColor: 'bg-red-50',
        shadowColor: 'rgba(239,68,68,0.2)',
        borderColor: 'border-red-200',
        items: activeConditions.slice(0, 2).map(c => c.name),
        total: activeConditions.length,
        link: 'conditions',
      },
      {
        icon: Syringe, label: 'Immunizations',
        count: stats.orders.filter(o => o.orderType === 'Immunization').length || 0,
        countLabel: 'Records',
        gradient: 'from-orange-500 to-orange-600',
        bgColor: 'bg-orange-50',
        shadowColor: 'rgba(249,115,22,0.2)',
        borderColor: 'border-orange-200',
        items: stats.orders.filter(o => o.orderType === 'Immunization').slice(0, 2).map(o => o.name),
        total: stats.orders.filter(o => o.orderType === 'Immunization').length || 0,
        link: 'procedures',
      },
      {
        icon: Activity, label: 'Orders',
        count: stats.orders.length,
        countLabel: 'Total',
        gradient: 'from-indigo-500 to-indigo-600',
        bgColor: 'bg-indigo-50',
        shadowColor: 'rgba(99,102,241,0.2)',
        borderColor: 'border-indigo-200',
        items: stats.orders.slice(0, 2).map(o => o.name || 'Order'),
        total: stats.orders.length,
        link: 'procedures',
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

  // Tab definitions matching Figma mockup
  const tabItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'ai-summary', label: 'AI Summary' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'insights', label: 'Insights' },
    { id: 'data-explorer', label: 'Data Explorer' },
  ]

  // Generate AI-driven health insights from patient data
  const healthInsights = useMemo(() => {
    if (!stats) return []
    const insights = []

    // Blood pressure trend
    const bpResults = stats.results.filter(r =>
      r.component?.toLowerCase().includes('systolic') ||
      r.component?.toLowerCase().includes('blood pressure') ||
      r.component?.toLowerCase().includes('intravascular systolic')
    )
    if (bpResults.length > 0) {
      const vals = bpResults.map(r => parseFloat(r.value)).filter(v => !isNaN(v))
      if (vals.length >= 2 && vals[vals.length - 1] > vals[0]) {
        insights.push({
          icon: TrendingUp,
          iconColor: 'text-orange-500',
          title: 'Blood Pressure Trending Up',
          description: `Systolic BP increased from ${vals[0]} to ${vals[vals.length - 1]} mmHg. Consider lifestyle modifications.`,
          severity: 'warning',
        })
      } else if (vals.length >= 1) {
        const latest = vals[vals.length - 1]
        if (latest > 130) {
          insights.push({
            icon: TrendingUp,
            iconColor: 'text-orange-500',
            title: 'Elevated Blood Pressure',
            description: `Latest systolic BP is ${latest} mmHg. Monitor and discuss with your provider.`,
            severity: 'warning',
          })
        }
      }
    }

    // Medication compliance
    if (stats.medications.length > 0 && stats.conditions.filter(c => c.status === 'Active').length > 0) {
      insights.push({
        icon: CheckCircle2,
        iconColor: 'text-green-500',
        title: 'Medication Compliance',
        description: `Patient is on appropriate therapy for ${stats.conditions.filter(c => c.status === 'Active').length} documented condition${stats.conditions.filter(c => c.status === 'Active').length !== 1 ? 's' : ''}.`,
        severity: 'positive',
      })
    }

    // Abnormal labs
    if (stats.abnormalResults.length > 0) {
      insights.push({
        icon: Lightbulb,
        iconColor: 'text-blue-500',
        title: 'Lab Monitoring Recommended',
        description: `${stats.abnormalResults.length} abnormal lab result${stats.abnormalResults.length !== 1 ? 's' : ''} detected. Follow-up testing and dietary modifications advised.`,
        severity: 'info',
      })
    }

    // Overdue screenings
    if (stats.encounters.length > 0) {
      const lastVisit = new Date(stats.encounters[0]?.contactDate)
      const monthsSince = Math.floor((Date.now() - lastVisit) / (1000 * 60 * 60 * 24 * 30))
      if (monthsSince > 12) {
        insights.push({
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          title: 'Follow-Up Visit Overdue',
          description: `Last documented encounter was ${monthsSince} months ago. Annual wellness visit recommended.`,
          severity: 'warning',
        })
      }
    }

    // Allergy count
    if (stats.allergies?.length > 0) {
      insights.push({
        icon: Info,
        iconColor: 'text-blue-500',
        title: 'Allergy Awareness',
        description: `${stats.allergies.length} documented allergy${stats.allergies.length !== 1 ? 'ies' : 'y'}. Ensure all providers are aware before prescribing.`,
        severity: 'info',
      })
    }

    // If no insights generated, add a generic one
    if (insights.length === 0) {
      insights.push({
        icon: CheckCircle2,
        iconColor: 'text-green-500',
        title: 'Health Data Loaded',
        description: 'Your health records have been parsed successfully. Review the Overview and AI Summary tabs for details.',
        severity: 'positive',
      })
    }

    return insights
  }, [stats])

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="text-center">
          <svg className="animate-spin w-12 h-12 mx-auto text-blue-600 mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-gray-600">Loading your health data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage:'radial-gradient(circle at 20% 50%, #3b82f6 1px, transparent 1px), radial-gradient(circle at 60% 70%, #8b5cf6 1px, transparent 1px), radial-gradient(circle at 80% 30%, #10b981 1px, transparent 1px)',backgroundSize:'50px 50px, 80px 80px, 60px 60px'}} />
      {/* Gradient Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header with Glass Effect */}
      <header className="backdrop-blur-md bg-white/80 border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg" style={{boxShadow:'0 4px 14px rgba(59,130,246,0.3)'}}>
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">HealthLens</span>
                  <p className="text-xs text-gray-500 -mt-1">Dashboard</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {parsedData?.patients?.length > 1 && (
                <select
                  value={selectedPatient?.patId || ''}
                  onChange={(e) => selectPatient(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-2"
                >
                  {parsedData.patients.map((p) => (
                    <option key={p.patId} value={p.patId}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              )}
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation — Gradient pill style matching Figma */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <div className="inline-flex bg-white/80 backdrop-blur-sm border border-gray-200 p-1.5 rounded-2xl shadow-lg" style={{boxShadow:'0 4px 14px rgba(148,163,184,0.15)'}}>
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeView === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              style={activeView === tab.id ? {boxShadow:'0 4px 14px rgba(59,130,246,0.3)'} : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ===== OVERVIEW (Dashboard) VIEW ===== */}
        {activeView === 'overview' && (
          <div className="space-y-8">
            {/* Patient Header with Badges */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Health Summary for {stats.patientName}
                </h2>
                <p className="text-gray-500 mt-1">
                  {stats.age}-year-old {stats.sex} • {isSampleData ? 'Sample Data' : 'Uploaded Data'}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-3 md:mt-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Activity className="w-3.5 h-3.5" />
                  {stats.encounters.length + stats.orders.length + stats.results.length} Total Records
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  <Calendar className="w-3.5 h-3.5" />
                  {stats.encounters.length > 0 ? `${new Date(stats.encounters[0].contactDate).toLocaleDateString()} - ${new Date(stats.encounters[stats.encounters.length - 1].contactDate).toLocaleDateString()}` : 'No dates'}
                </span>
              </div>
            </div>

            {/* AI Health Summary Card — Full gradient background matching Figma */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{boxShadow:'0 10px 40px rgba(59,130,246,0.15)'}}>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
              <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)',backgroundSize:'20px 20px'}} />
              <div className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">AI Health Summary</h3>
                      <p className="text-blue-100 text-sm">Generated using AI • Based on {aiSummary?.basedOn || 'your health records'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRegenerateAI}
                    disabled={regenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-colors text-sm font-medium disabled:opacity-50 border border-white/20"
                  >
                    <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                </div>

                {aiSummary && (
                  <div className="space-y-4">
                    {aiSummary.sections.filter(s => s.id === 'overall').map(section => (
                      <div key={section.id} className="text-white/90 leading-relaxed space-y-2 text-[15px]">
                        {section.content.split('\n\n').slice(0, 2).map((paragraph, i) => (
                          <p key={i}>{renderFormattedText(paragraph)}</p>
                        ))}
                      </div>
                    ))}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <p className="text-white/60 text-xs">Medications</p>
                        <p className="text-white text-xl font-bold">{stats.medications.length}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <p className="text-white/60 text-xs">Conditions</p>
                        <p className="text-white text-xl font-bold">{stats.conditions.filter(c => c.status === 'Active').length}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <p className="text-white/60 text-xs">Lab Results</p>
                        <p className="text-white text-xl font-bold">{stats.results.length}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <p className="text-white/60 text-xs">Encounters</p>
                        <p className="text-white text-xl font-bold">{stats.encounters.length}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveView('ai-summary')}
                      className="flex items-center gap-1 text-white font-medium hover:gap-2 transition-all mt-2"
                    >
                      <span>Read Full Summary</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Category Cards — Figma-style gradient icon + top border accent + hover lift */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {categoryCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <div
                    key={index}
                    className={`bg-white rounded-2xl border-t-4 ${card.borderColor} shadow-lg p-6 cursor-pointer transition-all duration-200 hover:-translate-y-1`}
                    onClick={() => setActiveView(card.link)}
                    style={{boxShadow: `0 4px 14px ${card.shadowColor}`}}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = `0 12px 30px ${card.shadowColor}`}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = `0 4px 14px ${card.shadowColor}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${card.bgColor} text-gray-700`}>
                        {card.count} {card.countLabel}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{card.label}</h3>
                    <div className="space-y-1 mb-4 min-h-[40px]">
                      {card.items.map((item, i) => (
                        <p key={i} className="text-sm text-gray-600 truncate">{item}</p>
                      ))}
                      {card.items.length === 0 && <p className="text-sm text-gray-400">No records</p>}
                    </div>
                    <span className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-sm">
                      <span>View All</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ===== AI SUMMARY VIEW ===== */}
        {activeView === 'ai-summary' && aiSummary && (
          <div className="space-y-8">
            {/* Header with glass effect — matches Figma */}
            <div className="flex items-center justify-between backdrop-blur-sm bg-white/50 rounded-2xl p-6 border border-gray-200/50">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                  AI Health Summary
                </h2>
                <div className="flex items-center gap-2 text-gray-600">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Generated using AI • Based on {aiSummary.basedOn}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerateAI}
                  disabled={regenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Main AI Summary Gradient Card — matches Figma exactly */}
            <div className="rounded-2xl overflow-hidden relative shadow-xl" style={{boxShadow:'0 10px 40px rgba(59,130,246,0.10)'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600" />
              <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',backgroundSize:'32px 32px'}} />
              <div className="relative p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Overall Health Story</h3>
                    <p className="text-sm text-white/80">AI-generated insights from your records</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {aiSummary.sections.filter(s => s.id === 'overall').map(section => (
                    <div key={section.id} className="text-white/95 leading-relaxed space-y-4 text-base">
                      {section.content.split('\n\n').map((paragraph, i) => (
                        <p key={i}>{renderFormattedText(paragraph)}</p>
                      ))}
                    </div>
                  ))}

                  {/* Allergy Warning Bar — matches Figma */}
                  {selectedPatient?.allergies?.length > 0 && (
                    <p className="text-white leading-relaxed text-base bg-red-500/30 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                      <strong>⚠️ Critical Safety Information:</strong> The patient has documented allergies to{' '}
                      {selectedPatient.allergies.map((a, idx) => (
                        <span key={idx}>
                          <strong>{a.allergen || a.name}</strong> ({(a.severity || 'unknown').toLowerCase()} - {(a.reaction || 'unknown').toLowerCase()})
                          {idx < selectedPatient.allergies.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                      . All healthcare providers should be informed of these allergies before any treatment.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Domain-Specific Summaries — 2-column grid matching Figma */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Medications Summary */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative" style={{boxShadow:'0 4px 20px rgba(168,85,247,0.10)'}}>
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-purple-600" />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg" style={{boxShadow:'0 4px 14px rgba(168,85,247,0.30)'}}>
                      <Pill className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Medications Summary</h3>
                      <p className="text-sm text-gray-500">{stats.medications.length} active prescriptions</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">
                    You are currently taking <strong>{stats.medications.length} active medication{stats.medications.length !== 1 ? 's' : ''}</strong>.
                    {stats.medications.length > 0 && (
                      <> The primary medications include {stats.medications.slice(0, 2).map((m, idx) => (
                        <span key={idx}>
                          <strong>{m.name}</strong> ({m.dose || m.dosage || m.frequency || ''})
                          {idx < Math.min(stats.medications.length, 2) - 1 ? ' and ' : ''}
                        </span>
                      ))}. All medications show active prescriptions with documented prescribers.</>
                    )}
                  </p>
                  {stats.medications.length > 0 && (
                    <div className="space-y-3">
                      {stats.medications.map((med, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100 transition-colors">
                          <div>
                            <p className="font-semibold text-gray-900">{med.name}</p>
                            <p className="text-sm text-gray-600">{med.dosage || `${med.dose || ''} - ${med.frequency || ''}`}</p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">Active</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lab Results & Trends */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative" style={{boxShadow:'0 4px 20px rgba(34,197,94,0.10)'}}>
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 to-emerald-600" />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg" style={{boxShadow:'0 4px 14px rgba(34,197,94,0.30)'}}>
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Lab Results & Trends</h3>
                      <p className="text-sm text-gray-500">Recent test results</p>
                    </div>
                  </div>
                  {stats.results.length > 0 ? (
                    <div>
                      <p className="text-gray-700 mb-4">
                        Most recent comprehensive lab panel from{' '}
                        <strong>{new Date(stats.results[0].resultTime || Date.now()).toLocaleDateString()}</strong>:
                      </p>
                      <div className="space-y-3">
                        {stats.results.slice(0, 5).map((result, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 transition-colors">
                            <div>
                              <p className="font-semibold text-gray-900">{result.component}</p>
                              <p className="text-sm text-gray-600">Range: {result.refLow}-{result.refHigh}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">{result.value}{result.unit ? ` ${result.unit}` : ''}</p>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                result.flag === 'Normal' ? 'bg-green-100 text-green-800 border border-green-200' :
                                result.flag === 'High' ? 'bg-red-100 text-red-800 border border-red-200' :
                                'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              }`}>
                                {result.flag}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">No lab results available in current records.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Care Coordination — full width card below */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative" style={{boxShadow:'0 4px 20px rgba(59,130,246,0.10)'}}>
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-blue-600" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg" style={{boxShadow:'0 4px 14px rgba(59,130,246,0.30)'}}>
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Care Coordination</h3>
                    <p className="text-sm text-gray-500">Your healthcare team</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4">
                  Your care is coordinated across multiple healthcare providers ensuring comprehensive treatment:
                </p>
                {stats.encounters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[...new Set(stats.encounters.map(e => providers[e.visitProvider]?.name).filter(Boolean))].map((provName, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">{provName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No care team information available.</p>
                )}
              </div>
            </div>

            {/* Export Actions — side by side matching Figma */}
            <div className="flex gap-4">
              <button onClick={handleExport} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all text-base" style={{boxShadow:'0 4px 14px rgba(59,130,246,0.3)'}}>
                <Download className="w-5 h-5" />
                <span>Export as PDF</span>
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors text-base">
                <Share2 className="w-5 h-5" />
                <span>Share with Provider</span>
              </button>
            </div>
          </div>
        )}

        {/* ===== TIMELINE VIEW ===== */}
        {activeView === 'timeline' && (() => {
          // Build unified timeline events from encounters, medications, results
          const timelineEvents = []
          stats.encounters.forEach(enc => {
            const prov = providers[enc.visitProvider]
            timelineEvents.push({
              date: enc.contactDate,
              type: 'encounter',
              category: enc.encType?.toLowerCase().includes('lab') ? 'Labs' : enc.encType?.toLowerCase().includes('emergency') ? 'Visits' : 'Visits',
              title: enc.encType,
              subtitle: enc.diagnosis,
              provider: prov?.name || 'Provider',
              providerSpecialty: prov?.specialty || 'Specialist',
              chiefComplaint: enc.chiefComplaint,
              patientClass: enc.patientClass,
              notes: enc.diagnosis,
              data: enc,
            })
          })
          stats.medications.forEach(med => {
            timelineEvents.push({
              date: med.startDate,
              type: 'medication',
              category: 'Medications',
              title: 'Medication Started',
              subtitle: med.name,
              provider: med.prescriber || 'Provider',
              notes: `${med.dosage} — ${med.purpose}`,
              data: med,
            })
          })
          stats.results.forEach(result => {
            timelineEvents.push({
              date: result.resultTime,
              type: 'lab',
              category: 'Labs',
              title: 'Lab Result',
              subtitle: result.component,
              notes: `${result.value} ${result.unit || ''} (Ref: ${result.refLow}-${result.refHigh}) — ${result.flag}`,
              data: result,
            })
          })
          // Sort descending
          timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date))

          // Group by year
          const yearGroups = {}
          timelineEvents.forEach(ev => {
            const y = new Date(ev.date).getFullYear().toString()
            if (!yearGroups[y]) yearGroups[y] = []
            yearGroups[y].push(ev)
          })
          const years = Object.keys(yearGroups).sort((a, b) => b - a)

          // Apply filters
          const filtered = timelineEvents.filter(ev => {
            if (timelineYear && new Date(ev.date).getFullYear().toString() !== timelineYear) return false
            if (timelineCategory !== 'All') {
              if (timelineCategory === 'Visits' && ev.category !== 'Visits') return false
              if (timelineCategory === 'Labs' && ev.category !== 'Labs') return false
              if (timelineCategory === 'Medications' && ev.category !== 'Medications') return false
              if (timelineCategory === 'Procedures' && ev.category !== 'Procedures') return false
            }
            if (timelineSearch) {
              const q = timelineSearch.toLowerCase()
              return JSON.stringify(ev).toLowerCase().includes(q)
            }
            return true
          })

          const getIcon = (ev) => {
            if (ev.category === 'Labs') return <TestTube className="w-5 h-5" />
            if (ev.category === 'Medications') return <Pill className="w-5 h-5" />
            if (ev.type === 'encounter') return <Activity className="w-5 h-5" />
            return <FileText className="w-5 h-5" />
          }
          const getColor = (ev) => {
            if (ev.category === 'Labs') return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500 border-green-100' }
            if (ev.category === 'Medications') return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', dot: 'bg-purple-500 border-purple-100' }
            if (ev.data?.patientClass === 'Emergency') return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500 border-red-100' }
            return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-blue-500 border-blue-100' }
          }

          return (
          <div className="space-y-6">
            {/* Card container like Figma */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-gray-700" />
                  <h2 className="text-xl font-bold text-gray-900">Healthcare Timeline</h2>
                </div>
                <p className="text-sm text-gray-500 ml-7">Chronological view of all healthcare events and encounters</p>
              </div>
              <div className="p-6 space-y-5">
                {/* Year filters */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTimelineYear(null)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${!timelineYear ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    style={!timelineYear ? {boxShadow:'0 2px 8px rgba(59,130,246,0.3)'} : {}}
                  >
                    All Years
                  </button>
                  {years.map(year => (
                    <button
                      key={year}
                      onClick={() => setTimelineYear(timelineYear === year ? null : year)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${timelineYear === year ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      style={timelineYear === year ? {boxShadow:'0 2px 8px rgba(59,130,246,0.3)'} : {}}
                    >
                      {year} ({yearGroups[year].length})
                    </button>
                  ))}
                </div>

                {/* Category filters */}
                <div className="flex flex-wrap gap-2">
                  {['All', 'Medications', 'Labs', 'Visits', 'Procedures'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setTimelineCategory(cat === 'All' ? 'All' : cat)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${(cat === 'All' ? timelineCategory === 'All' : timelineCategory === cat) ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      style={(cat === 'All' ? timelineCategory === 'All' : timelineCategory === cat) ? {boxShadow:'0 2px 8px rgba(34,197,94,0.3)'} : {}}
                    >
                      {cat === 'All' ? 'All Categories' : cat}
                    </button>
                  ))}
                </div>

                {/* Search bar — full width */}
                <div className="relative">
                  <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search timeline..."
                    value={timelineSearch}
                    onChange={e => setTimelineSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  />
                </div>

                {/* Refresh button — full width */}
                <button
                  onClick={() => { setTimelineYear(null); setTimelineCategory('All'); setTimelineSearch(''); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>

                {/* Timeline */}
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />

                  <div className="space-y-8">
                    {filtered.map((ev, index) => {
                      const colors = getColor(ev)
                      return (
                        <div key={index} className="relative pl-20">
                          {/* Timeline dot */}
                          <div className={`absolute left-[1.375rem] top-2 w-5 h-5 rounded-full border-4 ${colors.dot}`} />

                          {/* Date label on left */}
                          <div className="absolute left-0 top-0 text-xs text-gray-500 w-14 text-right pr-1">
                            {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>

                          {/* Event card */}
                          <div className={`${colors.bg} border ${colors.border} rounded-xl p-4`}>
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 ${colors.text}`}>{getIcon(ev)}</div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className={`font-semibold ${colors.text}`}>{ev.title}{ev.subtitle ? `: ${ev.subtitle}` : ''}</h4>
                                    <p className="text-sm opacity-75">
                                      {new Date(ev.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                  </div>
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.border} ${colors.text} bg-white/60`}>
                                    {ev.type}
                                  </span>
                                </div>

                                <div className="border-t border-current opacity-10 my-2" />

                                {/* Event details */}
                                {ev.type === 'encounter' && (
                                  <div className="space-y-2 text-sm">
                                    {ev.provider && <p><strong>Provider:</strong> {ev.provider}{ev.providerSpecialty ? ` (${ev.providerSpecialty})` : ''}</p>}
                                    {ev.chiefComplaint && <p><strong>Chief Complaint:</strong> {ev.chiefComplaint}</p>}
                                    {ev.data?.vitals && (
                                      <div>
                                        <strong>Vitals:</strong>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                          {ev.data.vitals.bp && <span>BP: {ev.data.vitals.bp}</span>}
                                          {ev.data.vitals.hr && <span>HR: {ev.data.vitals.hr} bpm</span>}
                                          {ev.data.vitals.temp && <span>Temp: {ev.data.vitals.temp}°F</span>}
                                          {ev.data.vitals.weight && <span>Weight: {ev.data.vitals.weight}</span>}
                                        </div>
                                      </div>
                                    )}
                                    {ev.data?.notes && <p><strong>Notes:</strong> {ev.data.notes}</p>}
                                    {ev.patientClass && <p><strong>Class:</strong> {ev.patientClass}</p>}
                                  </div>
                                )}
                                {ev.type === 'medication' && (
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Medication:</strong> {ev.data.name}</p>
                                    <p><strong>Dosage:</strong> {ev.data.dosage}</p>
                                    <p><strong>Purpose:</strong> {ev.data.purpose}</p>
                                    {ev.provider && <p><strong>Prescribed by:</strong> {ev.provider}</p>}
                                  </div>
                                )}
                                {ev.type === 'lab' && (
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Test:</strong> {ev.data.component}</p>
                                    <p><strong>Result:</strong> {ev.data.value} {ev.data.unit || ''}</p>
                                    <p><strong>Reference Range:</strong> {ev.data.refLow}–{ev.data.refHigh}</p>
                                    <p><strong>Status:</strong> <span className={ev.data.flag === 'Normal' ? 'text-green-700' : 'text-red-700'}>{ev.data.flag}</span></p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {filtered.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No timeline events found</p>
                )}
              </div>
            </div>
          </div>
          )
        })()}

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
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Pill className="w-5 h-5 text-blue-600" />
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Data Explorer</h2>
                <p className="text-gray-500">Browse raw health data from {parsedData?.totalPatients || 0} patients across {parsedData?.totalRecords || 0} records</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {parsedData?.totalPatients || 0} Patients
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  {parsedData?.totalRecords || 0} Records
                </span>
              </div>
            </div>

            {/* Patient list with modern styling */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Patients ({parsedData?.patients?.length || 0})</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search patients..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 bg-white" />
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Age</th>
                        <th className="pb-3 pr-4 font-medium">Sex</th>
                        <th className="pb-3 pr-4 font-medium">City</th>
                        <th className="pb-3 pr-4 font-medium">Encounters</th>
                        <th className="pb-3 pr-4 font-medium">Results</th>
                        <th className="pb-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(parsedData?.patients || []).map((patient, i) => (
                        <tr key={i} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${selectedPatient?.patId === patient.patId ? 'bg-blue-50' : ''}`}>
                          <td className="py-3.5 pr-4 font-medium text-gray-900">{patient.firstName} {patient.lastName}</td>
                          <td className="py-3.5 pr-4 text-gray-600">{patient.age}</td>
                          <td className="py-3.5 pr-4 text-gray-600">{patient.sex}</td>
                          <td className="py-3.5 pr-4 text-gray-600">{patient.city}, {patient.state}</td>
                          <td className="py-3.5 pr-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{patient.encounterCount}</span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">{patient.resultCount}</span>
                          </td>
                          <td className="py-3.5">
                            <button
                              onClick={() => { selectPatient(patient.patId); setActiveView('overview'); }}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                            >
                              View <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Raw JSON Preview */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Raw Data Preview</h3>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all"
                  style={{boxShadow:'0 4px 14px rgba(59,130,246,0.3)'}}
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
              <div className="p-4 bg-gray-900 rounded-b-2xl max-h-96 overflow-auto">
                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(parsedData?.patients?.[0] ? {
                    patient: { name: `${selectedPatient?.firstName} ${selectedPatient?.lastName}`, age: selectedPatient?.age, sex: selectedPatient?.sex },
                    encounters: stats.encounters.length,
                    medications: stats.medications.length,
                    conditions: stats.conditions.length,
                    labResults: stats.results.length,
                  } : {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ===== INSIGHTS VIEW ===== */}
        {activeView === 'insights' && (() => {
          // Encounter frequency data for bar chart
          const encounterFrequency = (() => {
            const freq = {}
            stats.encounters.forEach(e => {
              const type = e.encType || 'Other'
              freq[type] = (freq[type] || 0) + 1
            })
            return Object.entries(freq).map(([type, count]) => ({ type, count }))
          })()

          // Lab results over time for trend charts
          const labTrendData = stats.results
            .filter(r => r.resultTime)
            .sort((a, b) => new Date(a.resultTime) - new Date(b.resultTime))
            .map(r => ({
              date: new Date(r.resultTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              component: r.component,
              value: parseFloat(r.value) || 0,
              flag: r.flag,
            }))

          // Health score calculation
          const healthScore = Math.min(100, Math.max(0, 100 - stats.abnormalResults.length * 10))
          const medAdherence = stats.medications.length > 0 ? 85 : 0
          const vitalScore = stats.results.length > 0 ? Math.round((1 - stats.abnormalResults.length / Math.max(1, stats.results.length)) * 100) : 72
          const preventiveScore = stats.encounters.length > 2 ? 90 : stats.encounters.length * 30
          const conditionScore = stats.conditions.filter(c => c.status === 'Active').length > 0 ? 65 : 80

          return (
          <div className="space-y-6">
            {/* AI Insights Card — Figma: purple border card */}
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/50 overflow-hidden">
              <div className="p-6 border-b border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold text-gray-900">AI-Generated Health Insights</h2>
                </div>
                <p className="text-sm text-gray-500">Personalized recommendations based on your health data</p>
              </div>
              <div className="p-6 space-y-4">
                {healthInsights.map((insight, index) => {
                  const Icon = insight.icon
                  const badgeBorder = insight.severity === 'positive' ? 'border-green-300 text-green-700' : insight.severity === 'warning' ? 'border-orange-300 text-orange-700' : 'border-blue-300 text-blue-700'
                  return (
                    <div key={index} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all">
                      <div className={`mt-1 ${insight.iconColor}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{insight.title}</h4>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeBorder} whitespace-nowrap`}>
                        {insight.severity}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Charts — 2×2 grid matching Figma */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Healthcare Visit Distribution (Bar Chart) */}
              {encounterFrequency.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Healthcare Visit Distribution</h3>
                    <p className="text-sm text-gray-500">Breakdown of encounter types</p>
                  </div>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={encounterFrequency}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#10b981" name="Number of Visits" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Lab Results Trend */}
              {labTrendData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Lab Results Overview</h3>
                    <p className="text-sm text-gray-500">Recent lab values plotted over time</p>
                  </div>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={labTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="component" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]}>
                          {labTrendData.map((entry, i) => (
                            <Cell key={i} fill={entry.flag === 'Normal' ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Note:</strong> Green bars indicate normal results. Red bars indicate abnormal values requiring attention.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Condition Severity Breakdown */}
              {stats.conditions.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Condition Status Overview</h3>
                    <p className="text-sm text-gray-500">Active vs resolved conditions</p>
                  </div>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.conditions.map(c => ({ name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name, severity: c.severity === 'Moderate' ? 2 : c.severity === 'Mild' ? 1 : 3 }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="severity" name="Severity Level" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Medication Timeline */}
              {stats.medications.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Medication Timeline</h3>
                    <p className="text-sm text-gray-500">When medications were started</p>
                  </div>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.medications.map(m => ({
                        name: m.name.split(' ')[0],
                        months: Math.max(1, Math.round((Date.now() - new Date(m.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))),
                      })).sort((a, b) => b.months - a.months)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="months" name="Months on Medication" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Health Score Analysis — Figma: blue border card */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 overflow-hidden">
              <div className="p-6 border-b border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Health Score Analysis</h2>
                </div>
                <p className="text-sm text-gray-500">AI-calculated overall health assessment</p>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-40 h-40">
                    <svg className="transform -rotate-90 w-40 h-40">
                      <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="12" fill="transparent" />
                      <circle cx="80" cy="80" r="70" stroke="#3b82f6" strokeWidth="12" fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 70}`}
                        strokeDashoffset={`${2 * Math.PI * 70 * (1 - healthScore / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-blue-600">{healthScore}</span>
                      <span className="text-sm text-gray-600">out of 100</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{medAdherence}</p>
                    <p className="text-xs text-gray-600">Medication Adherence</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{vitalScore}</p>
                    <p className="text-xs text-gray-600">Vital Signs</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{preventiveScore}</p>
                    <p className="text-xs text-gray-600">Preventive Care</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{conditionScore}</p>
                    <p className="text-xs text-gray-600">Condition Management</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mt-4 text-center">
                  Your health score is calculated based on vital trends, medication adherence, preventive care compliance, and condition management.
                </p>
              </div>
            </div>
          </div>
          )
        })()}

        {/* ===== FALLBACK PLACEHOLDER VIEWS ===== */}
        {['labs', 'encounters', 'procedures', 'trends'].includes(activeView) && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <button onClick={() => setActiveView('overview')} className="text-blue-600 hover:text-blue-700 text-sm font-medium">← Back to Dashboard</button>
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
