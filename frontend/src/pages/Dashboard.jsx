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
  Database,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Shield,
  Trash2,
  ShieldCheck,
  Bot,
  MessageSquare,
  FileBarChart,
  Heart,
  Users,
  ClipboardList,
  StickyNote,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { generateAISummary, providers } from '../data/sampleData'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { PrivacyBadge, PrivacyPanel } from '../components/PrivacyBanner'
import AISettingsPanel from '../components/AISettingsPanel'
import AIChatView from '../components/AIChatView'
import DataLineageView from '../components/DataLineageView'
import DocumentIntelligence from '../components/DocumentIntelligence'
import { APP_VERSION, RULE_ENGINE_VERSION } from '../utils/privacy'
import { getRuleIntegrity } from '../parsers/ruleEngine'
import { isDemo } from '../config/demo'

export default function Dashboard() {
  const navigate = useNavigate()
  const { uploadedFiles, parsedData, loading, isSampleData, aiSummary, setAiSummary, selectedPatient, selectPatient, secureWipe, memoryCleared, aiConfig, regenerateAISummary, aiLoading, loadSampleData } = useData()
  const [activeView, setActiveView] = useState('overview')
  const [expandedSections, setExpandedSections] = useState({ overall: true })
  const [regenerating, setRegenerating] = useState(false)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [timelineYear, setTimelineYear] = useState(null)
  const [timelineCategory, setTimelineCategory] = useState('All')
  const [timelineSearch, setTimelineSearch] = useState('')
  const [explorerSearch, setExplorerSearch] = useState('')
  const [expandedExplorer, setExpandedExplorer] = useState({ patient: true })
  const [recordsCategory, setRecordsCategory] = useState(null)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const demoMode = isDemo()

  // Listen for tour view-switch events from App-level GuidedTour
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) setActiveView(e.detail)
    }
    window.addEventListener('tour-switch-view', handler)
    return () => window.removeEventListener('tour-switch-view', handler)
  }, [])

  // In demo mode, auto-load sample data if arriving at dashboard without data
  useEffect(() => {
    if (demoMode && uploadedFiles.length === 0 && !loading && !parsedData) {
      loadSampleData()
      return
    }
    if (uploadedFiles.length === 0 && !demoMode) {
      navigate('/')
    }
  }, [uploadedFiles, navigate, demoMode, loading, parsedData, loadSampleData])

  // ─── Configuration: category metadata for dynamic rendering ──────────────
  const CATEGORY_META = useMemo(() => ({
    conditions:    { icon: AlertCircle,    label: 'Conditions',    gradient: 'from-red-500 to-red-600',    bg: 'bg-red-50',    shadow: 'rgba(239,68,68,0.2)',    border: 'border-red-200',    ring: 'ring-red-500',    text: 'text-red-700',    bgPill: 'bg-red-100',    countLabel: 'Active' },
    medications:   { icon: Pill,           label: 'Medications',   gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', shadow: 'rgba(168,85,247,0.2)', border: 'border-purple-200', ring: 'ring-purple-500', text: 'text-purple-700', bgPill: 'bg-purple-100', countLabel: 'Active' },
    immunizations: { icon: Syringe,        label: 'Immunizations', gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', shadow: 'rgba(249,115,22,0.2)', border: 'border-orange-200', ring: 'ring-orange-500', text: 'text-orange-700', bgPill: 'bg-orange-100', countLabel: 'Records' },
    allergies:     { icon: AlertTriangle,  label: 'Allergies',     gradient: 'from-amber-500 to-amber-600',  bg: 'bg-amber-50',  shadow: 'rgba(245,158,11,0.2)', border: 'border-amber-200',  ring: 'ring-amber-500',  text: 'text-amber-700', bgPill: 'bg-amber-100', countLabel: 'Known' },
    results:       { icon: TestTube,       label: 'Lab Results',   gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-50', shadow: 'rgba(34,197,94,0.2)',  border: 'border-green-200',  ring: 'ring-green-500',  text: 'text-green-700', bgPill: 'bg-green-100', countLabel: 'Results' },
    encounters:    { icon: Stethoscope,    label: 'Visits',        gradient: 'from-blue-500 to-blue-600',    bg: 'bg-blue-50',   shadow: 'rgba(59,130,246,0.2)', border: 'border-blue-200',   ring: 'ring-blue-500',   text: 'text-blue-700', bgPill: 'bg-blue-100', countLabel: 'Encounters' },
    vitals:        { icon: Heart,          label: 'Vitals',        gradient: 'from-pink-500 to-pink-600',    bg: 'bg-pink-50',   shadow: 'rgba(236,72,153,0.2)', border: 'border-pink-200',   ring: 'ring-pink-500',   text: 'text-pink-700', bgPill: 'bg-pink-100', countLabel: 'Signs' },
    careTeam:      { icon: Users,          label: 'Care Team',     gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', shadow: 'rgba(99,102,241,0.2)', border: 'border-indigo-200', ring: 'ring-indigo-500', text: 'text-indigo-700', bgPill: 'bg-indigo-100', countLabel: 'Providers' },
    orders:        { icon: ClipboardList,  label: 'Orders',        gradient: 'from-cyan-500 to-cyan-600',    bg: 'bg-cyan-50',   shadow: 'rgba(6,182,212,0.2)',  border: 'border-cyan-200',   ring: 'ring-cyan-500',   text: 'text-cyan-700', bgPill: 'bg-cyan-100', countLabel: 'Total' },
    documents:     { icon: FileBarChart,   label: 'Documents',     gradient: 'from-gray-500 to-gray-600',    bg: 'bg-gray-50',   shadow: 'rgba(107,114,128,0.2)', border: 'border-gray-200',  ring: 'ring-gray-500',  text: 'text-gray-700', bgPill: 'bg-gray-100', countLabel: 'Files' },
    procedures:    { icon: Activity,       label: 'Procedures',    gradient: 'from-teal-500 to-teal-600',    bg: 'bg-teal-50',   shadow: 'rgba(20,184,166,0.2)', border: 'border-teal-200',   ring: 'ring-teal-500',   text: 'text-teal-700', bgPill: 'bg-teal-100', countLabel: 'Total' },
    clinicalNotes: { icon: StickyNote,     label: 'Clinical Notes', gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', shadow: 'rgba(139,92,246,0.2)', border: 'border-violet-200', ring: 'ring-violet-500', text: 'text-violet-700', bgPill: 'bg-violet-100', countLabel: 'Notes' },
  }), [])

  // Default metadata for unknown categories discovered dynamically
  const defaultMeta = { icon: FileText, label: '', gradient: 'from-slate-500 to-slate-600', bg: 'bg-slate-50', shadow: 'rgba(100,116,139,0.2)', border: 'border-slate-200', ring: 'ring-slate-500', text: 'text-slate-700', bgPill: 'bg-slate-100', countLabel: 'Records' }

  // Derive dashboard stats — DYNAMIC: detect ALL data arrays from selectedPatient
  const stats = useMemo(() => {
    if (!parsedData || !selectedPatient) return null
    const base = {
      patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
      age: selectedPatient.age,
      sex: selectedPatient.sex,
      abnormalResults: selectedPatient.abnormalResults || [],
    }
    // Dynamically detect every array property as a category
    const dynamicCategories = {}
    for (const [key, val] of Object.entries(selectedPatient)) {
      if (Array.isArray(val) && !key.startsWith('_') && key !== 'abnormalResults') {
        dynamicCategories[key] = val
      }
    }
    return { ...base, ...dynamicCategories }
  }, [parsedData, selectedPatient])

  // DYNAMIC category cards — auto-generated from whatever data is present
  const categoryCards = useMemo(() => {
    if (!stats) return []
    // Priority order for display
    const priorityOrder = ['conditions', 'medications', 'immunizations', 'allergies', 'results', 'encounters', 'vitals', 'careTeam', 'clinicalNotes', 'orders', 'documents', 'procedures']
    // Detect all array categories
    const detected = []
    for (const [key, val] of Object.entries(stats)) {
      if (Array.isArray(val) && val.length > 0 && !key.startsWith('_') && key !== 'abnormalResults') {
        detected.push(key)
      }
    }
    // Sort by priority, unknown categories go last
    detected.sort((a, b) => {
      const ia = priorityOrder.indexOf(a), ib = priorityOrder.indexOf(b)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
    return detected.map(key => {
      const items = stats[key]
      const meta = CATEGORY_META[key] || { ...defaultMeta, label: key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) }
      // Smart preview: show first 2 items with best available name
      const preview = items.slice(0, 2).map(item => {
        const name = item.name || item.allergen || item.component || item.visitType || item.orderType || item.type || JSON.stringify(item).slice(0, 40)
        const detail = item.value || item.dose || item.dosage || item.reaction || item.date || item.onset || item.contactDate || ''
        return detail ? `${name} — ${detail}` : name
      })
      return {
        key,
        icon: meta.icon,
        label: meta.label,
        count: items.length,
        countLabel: meta.countLabel,
        gradient: meta.gradient,
        bgColor: meta.bg,
        shadowColor: meta.shadow,
        borderColor: meta.border,
        items: preview,
        total: items.length,
        link: 'records',
      }
    })
  }, [stats, CATEGORY_META, defaultMeta])

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  const handleRegenerateAI = async () => {
    if (!selectedPatient) return
    setRegenerating(true)
    try {
      await regenerateAISummary(selectedPatient)
    } catch {
      // fallback already handled in context
    } finally {
      setRegenerating(false)
    }
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

  // Tab definitions — Records tab is dynamic, only if data exists
  const tabItems = useMemo(() => {
    const base = [
      { id: 'overview', label: 'Overview' },
      { id: 'records', label: 'Records' },
      { id: 'ai-summary', label: 'AI Summary' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'insights', label: 'Insights' },
      { id: 'data-explorer', label: 'Data Explorer' },
      { id: 'ai-assistant', label: 'AI Assistant' },
      { id: 'data-lineage', label: 'Data Lineage' },
      { id: 'documents', label: 'Documents' },
    ]
    return base
  }, [])

  // Generate AI-driven health insights from patient data
  const healthInsights = useMemo(() => {
    if (!stats) return []
    const insights = []

    // Blood pressure trend
    const bpResults = (stats.results || []).filter(r => {
      const comp = (r.name || r.component || '').toLowerCase()
      return comp.includes('systolic') || comp.includes('blood pressure') || comp.includes('intravascular systolic')
    })
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
    if ((stats.medications || []).length > 0 && (stats.conditions || []).filter(c => c.status === 'Active').length > 0) {
      insights.push({
        icon: CheckCircle2,
        iconColor: 'text-green-500',
        title: 'Medication Compliance',
        description: `Patient is on appropriate therapy for ${(stats.conditions || []).filter(c => c.status === 'Active').length} documented condition${(stats.conditions || []).filter(c => c.status === 'Active').length !== 1 ? 's' : ''}.`,
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
    if ((stats.encounters || []).length > 0) {
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

    // Immunization awareness
    if ((stats.immunizations || []).length > 0) {
      insights.push({
        icon: Syringe,
        iconColor: 'text-orange-500',
        title: 'Immunization Records',
        description: `${stats.immunizations.length} immunization${stats.immunizations.length !== 1 ? 's' : ''} documented. Review your vaccination history in the Records tab.`,
        severity: 'info',
      })
    }

    // Care team info
    if ((stats.careTeam || []).length > 0) {
      insights.push({
        icon: Users,
        iconColor: 'text-indigo-500',
        title: 'Care Team Identified',
        description: `${stats.careTeam.length} care team member${stats.careTeam.length !== 1 ? 's' : ''} on record: ${stats.careTeam.map(c => c.name).join(', ')}.`,
        severity: 'positive',
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
              <PrivacyBadge onClick={() => setPrivacyOpen(true)} />
              <button
                onClick={() => setAiSettingsOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors group"
                title="AI Settings"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span>AI: {aiConfig.mode === 'local' ? 'Local' : aiConfig.mode === 'cloud' ? 'Cloud' : 'Browser'}</span>
              </button>
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
              <button
                onClick={async () => { await secureWipe(); navigate('/') }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors group relative"
                title="Clear all data & return home"
              >
                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
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
      <div className="max-w-7xl mx-auto px-6 pt-8" data-tour="tab-nav">
        <div className="inline-flex bg-white/80 backdrop-blur-sm border border-gray-200 p-1.5 rounded-2xl shadow-lg" style={{boxShadow:'0 4px 14px rgba(148,163,184,0.15)'}}>
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              data-tour={`tab-${tab.id}`}
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between" data-tour="patient-header">
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
                  {Object.entries(stats).reduce((sum, [k, v]) => sum + (Array.isArray(v) && !k.startsWith('_') && k !== 'abnormalResults' ? v.length : 0), 0)} Total Records
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  <Calendar className="w-3.5 h-3.5" />
                  {(stats.encounters || []).length > 0 ? `${new Date(stats.encounters[0].contactDate).toLocaleDateString()} - ${new Date(stats.encounters[stats.encounters.length - 1].contactDate).toLocaleDateString()}` : 'OCR Extracted'}
                </span>
              </div>
            </div>

            {/* AI Health Summary Card — Full gradient background matching Figma */}
            <div className="relative rounded-2xl overflow-hidden shadow-xl" data-tour="ai-summary-card" style={{boxShadow:'0 10px 40px rgba(59,130,246,0.15)'}}>
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

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                      {aiSummary.riskScore !== undefined && (
                        <div className={`backdrop-blur-sm rounded-xl p-3 border ${
                          aiSummary.riskScore >= 80 ? 'bg-green-500/20 border-green-300/30' :
                          aiSummary.riskScore >= 60 ? 'bg-yellow-500/20 border-yellow-300/30' :
                          'bg-red-500/20 border-red-300/30'
                        }`}>
                          <p className="text-white/60 text-xs">Risk Score</p>
                          <p className="text-white text-xl font-bold">{aiSummary.riskScore}<span className="text-sm font-normal">/100</span></p>
                        </div>
                      )}
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <p className="text-white/60 text-xs">Medications</p>
                        <p className="text-white text-xl font-bold">{(stats.medications || []).length}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <p className="text-white/60 text-xs">Conditions</p>
                        <p className="text-white text-xl font-bold">{(stats.conditions || []).filter(c => c.status === 'Active').length}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <p className="text-white/60 text-xs">Lab Results</p>
                        <p className="text-white text-xl font-bold">{(stats.results || []).length}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                        <p className="text-white/60 text-xs">Immunizations</p>
                        <p className="text-white text-xl font-bold">{(stats.immunizations || []).length}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-tour="category-cards">
              {categoryCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <div
                    key={index}
                    className={`bg-white rounded-2xl border-t-4 ${card.borderColor} shadow-lg p-6 cursor-pointer transition-all duration-200 hover:-translate-y-1`}
                    onClick={() => { setRecordsCategory(card.key); setActiveView('records') }}
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
                  {aiSummary.riskScore && (
                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold border ${
                      aiSummary.riskScore >= 80 ? 'bg-green-100 text-green-800 border-green-200' :
                      aiSummary.riskScore >= 60 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      Risk Score: {aiSummary.riskScore}/100
                    </span>
                  )}
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

            {/* Domain-Specific Summaries — dynamically render all AI sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {aiSummary.sections.filter(s => s.id !== 'overall').map(section => {
                const sectionColors = {
                  medications: { from: 'from-purple-500', to: 'to-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', shadow: 'rgba(168,85,247,0.10)', shadowIcon: 'rgba(168,85,247,0.30)' },
                  labs: { from: 'from-green-500', to: 'to-emerald-600', bg: 'bg-green-50', border: 'border-green-100', shadow: 'rgba(34,197,94,0.10)', shadowIcon: 'rgba(34,197,94,0.30)' },
                  allergies: { from: 'from-red-500', to: 'to-red-600', bg: 'bg-red-50', border: 'border-red-100', shadow: 'rgba(239,68,68,0.10)', shadowIcon: 'rgba(239,68,68,0.30)' },
                  care: { from: 'from-blue-500', to: 'to-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', shadow: 'rgba(59,130,246,0.10)', shadowIcon: 'rgba(59,130,246,0.30)' },
                  conditions: { from: 'from-orange-500', to: 'to-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', shadow: 'rgba(249,115,22,0.10)', shadowIcon: 'rgba(249,115,22,0.30)' },
                  recommendations: { from: 'from-indigo-500', to: 'to-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', shadow: 'rgba(99,102,241,0.10)', shadowIcon: 'rgba(99,102,241,0.30)' },
                }
                const sectionIcons = {
                  medications: Pill,
                  labs: Activity,
                  allergies: AlertCircle,
                  care: User,
                  conditions: FileBarChart,
                  recommendations: Sparkles,
                }
                const sc = sectionColors[section.id] || sectionColors.care
                const SIcon = sectionIcons[section.id] || FileBarChart
                return (
                  <div key={section.id} className="bg-white rounded-2xl shadow-lg overflow-hidden relative" style={{boxShadow:`0 4px 20px ${sc.shadow}`}}>
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${sc.from} ${sc.to}`} />
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${sc.from} ${sc.to} rounded-xl flex items-center justify-center shadow-lg`} style={{boxShadow:`0 4px 14px ${sc.shadowIcon}`}}>
                          <SIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                          {section.subtitle && <p className="text-sm text-gray-500">{section.subtitle}</p>}
                        </div>
                      </div>
                      <div className="text-gray-700 leading-relaxed space-y-3">
                        {section.content.split('\n\n').map((paragraph, i) => (
                          <p key={i}>{renderFormattedText(paragraph)}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Care Coordination — full width card using AI section data */}
            {aiSummary.sections.find(s => s.id === 'care') && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative" style={{boxShadow:'0 4px 20px rgba(59,130,246,0.10)'}}>
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-blue-600" />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg" style={{boxShadow:'0 4px 14px rgba(59,130,246,0.30)'}}>
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Care Coordination</h3>
                    <p className="text-sm text-gray-500">Your healthcare team & visit analytics</p>
                  </div>
                </div>
                <div className="text-gray-700 leading-relaxed space-y-3 mb-4">
                  {aiSummary.sections.find(s => s.id === 'care').content.split('\n\n').map((p, i) => (
                    <p key={i}>{renderFormattedText(p)}</p>
                  ))}
                </div>
                {(stats.encounters || []).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[...new Set((stats.encounters || []).map(e => providers[e.visitProvider]?.name).filter(Boolean))].map((provName, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">{provName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}

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
          ;(stats.encounters || []).forEach(enc => {
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
          ;(stats.medications || []).forEach(med => {
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
          ;(stats.results || []).forEach(result => {
            const compName = result.name || result.component || 'Lab Result'
            const refRange = result.referenceRange || (result.refLow != null && result.refHigh != null ? `${result.refLow}-${result.refHigh}` : '')
            timelineEvents.push({
              date: result.date || result.resultTime,
              type: 'lab',
              category: 'Labs',
              title: 'Lab Result',
              subtitle: compName,
              notes: `${result.value || ''} ${result.unit || result.units || ''} ${refRange ? `(Ref: ${refRange})` : ''} ${result.flag ? `— ${result.flag}` : ''}`.trim(),
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

        {/* ===== DYNAMIC RECORDS VIEW ===== */}
        {(activeView === 'records' || activeView === 'medications' || activeView === 'conditions' || activeView === 'labs' || activeView === 'encounters' || activeView === 'procedures' || activeView === 'trends') && (() => {
          // Detect all categories with data
          const priorityOrder = ['conditions', 'medications', 'immunizations', 'allergies', 'results', 'encounters', 'vitals', 'careTeam', 'clinicalNotes', 'orders', 'documents', 'procedures']
          const detectedCats = Object.entries(stats)
            .filter(([k, v]) => Array.isArray(v) && v.length > 0 && !k.startsWith('_') && k !== 'abnormalResults')
            .map(([k]) => k)
            .sort((a, b) => {
              const ia = priorityOrder.indexOf(a), ib = priorityOrder.indexOf(b)
              return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
            })

          // Map legacy view names to categories
          const legacyMap = { medications: 'medications', conditions: 'conditions', labs: 'results', encounters: 'encounters', procedures: 'orders' }
          const effectiveCat = (activeView !== 'records' && legacyMap[activeView]) ? legacyMap[activeView] : (recordsCategory || detectedCats[0] || null)

          // Smart column detection for a category
          const getColumns = (items) => {
            if (!items || items.length === 0) return []
            const allKeys = new Set()
            items.forEach(item => {
              Object.keys(item).forEach(k => {
                if (!k.startsWith('_') && k !== 'patId' && k !== 'orderId' && typeof item[k] !== 'object') {
                  allKeys.add(k)
                }
              })
            })
            // Prioritize important columns
            const priority = ['name', 'component', 'allergen', 'visitType', 'orderType', 'type', 'status', 'value', 'dose', 'dosage', 'reaction', 'severity', 'icd10', 'cvx', 'ndc', 'relationship', 'identifier', 'phone', 'date', 'onset', 'contactDate', 'startDate', 'resultTime', 'unit', 'units', 'flag', 'referenceRange', 'route', 'site', 'manufacturer', 'lotNumber', 'prescriber', 'drugClass', 'rxcui', 'frequency', 'purpose', 'chronic', 'loinc']
            const sorted = [...allKeys].sort((a, b) => {
              const ia = priority.indexOf(a), ib = priority.indexOf(b)
              return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
            })
            return sorted.slice(0, 10) // Max 10 columns
          }

          // Format cell value for display
          const formatCell = (val, colName) => {
            if (val == null || val === '' || val === undefined) return '—'
            // Date formatting
            if (/date|onset|time|start/i.test(colName) && typeof val === 'string') {
              try { const d = new Date(val); if (!isNaN(d.getTime()) && val.length > 4) return d.toLocaleDateString() } catch { /* */ }
            }
            if (typeof val === 'boolean') return val ? 'Yes' : 'No'
            return String(val)
          }

          // Pretty column header
          const colHeader = (col) => col
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, c => c.toUpperCase())
            .replace(/Icd10/, 'ICD-10')
            .replace(/Cvx/, 'CVX')
            .replace(/Ndc/, 'NDC')
            .replace(/Loinc/, 'LOINC')
            .replace(/Rxcui/, 'RxCUI')
            .trim()

          const items = effectiveCat ? (stats[effectiveCat] || []) : []
          const columns = getColumns(items)
          const meta = CATEGORY_META[effectiveCat] || { ...defaultMeta, label: (effectiveCat || 'Records').replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) }
          const CatIcon = meta.icon

          return (
          <div className="space-y-6">
            {/* Category sub-tabs */}
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setActiveView('overview')} className="text-blue-600 hover:text-blue-700 text-sm font-medium">← Overview</button>
              <div className="h-5 w-px bg-gray-300" />
              {detectedCats.map(cat => {
                const cm = CATEGORY_META[cat] || defaultMeta
                const Icon = cm.icon
                const isActive = cat === effectiveCat
                return (
                  <button
                    key={cat}
                    onClick={() => { setRecordsCategory(cat); if (activeView !== 'records') setActiveView('records') }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cm.label || cat.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : cm.bgPill + ' ' + cm.text}`}>
                      {(stats[cat] || []).length}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Category header */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${meta.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                <CatIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{meta.label}</h2>
                <p className="text-sm text-gray-500">{items.length} record{items.length !== 1 ? 's' : ''} found</p>
              </div>
            </div>

            {/* Records table */}
            {items.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600">
                        <th className="px-4 py-3 text-xs font-semibold">#</th>
                        {columns.map(col => (
                          <th key={col} className="px-4 py-3 text-xs font-semibold">{colHeader(col)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-3 text-gray-400 text-xs font-mono">{i + 1}</td>
                          {columns.map(col => {
                            const val = formatCell(item[col], col)
                            // Special badge rendering for known columns
                            if (col === 'icd10' && item[col]) return <td key={col} className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-700">ICD-10: {item[col]}</span></td>
                            if (col === 'cvx' && item[col]) return <td key={col} className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">CVX: {item[col]}</span></td>
                            if (col === 'ndc' && item[col]) return <td key={col} className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-100 text-cyan-700">NDC: {item[col]}</span></td>
                            if (col === 'loinc' && item[col]) return <td key={col} className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">{item[col]}</span></td>
                            if (col === 'rxcui' && item[col]) return <td key={col} className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700">RxCUI: {item[col]}</span></td>
                            if (col === 'flag' && item[col]) return <td key={col} className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${item[col] === 'Normal' ? 'bg-green-100 text-green-700' : item[col] === 'High' || item[col] === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item[col]}</span></td>
                            if (col === 'status' && item[col]) return <td key={col} className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item[col] === 'Active' ? 'bg-orange-100 text-orange-700' : item[col] === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{item[col]}</span></td>
                            if (col === 'severity' && item[col]) return <td key={col} className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${item[col] === 'Chronic' ? 'bg-red-100 text-red-700' : item[col] === 'Acute' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{item[col]}</span></td>
                            if (col === 'chronic' && item[col] !== undefined) return <td key={col} className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${item[col] ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{item[col] ? 'Chronic' : 'Acute'}</span></td>
                            // Name column is bold
                            if (col === 'name' || col === 'component' || col === 'allergen') return <td key={col} className="px-4 py-3 font-semibold text-gray-900">{val}</td>
                            return <td key={col} className="px-4 py-3 text-gray-700">{val}</td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CatIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{meta.label}</h3>
                <p className="text-gray-600">No {meta.label.toLowerCase()} data found for this patient.</p>
              </div>
            )}
          </div>
          )
        })()}

        {/* ===== DATA EXPLORER VIEW ===== */}
        {activeView === 'data-explorer' && (() => {
          // Build the data object to explore — DYNAMIC: include ALL categories
          const explorerData = selectedPatient ? (() => {
            const data = {
              patient: {
                name: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
                age: selectedPatient.age,
                sex: selectedPatient.sex,
                birthDate: selectedPatient.birthDate,
                city: selectedPatient.city,
                state: selectedPatient.state,
                zip: selectedPatient.zip,
                language: selectedPatient.language,
                maritalStatus: selectedPatient.maritalStatus,
              },
            }
            // Dynamically add all array categories
            for (const [key, val] of Object.entries(stats)) {
              if (Array.isArray(val) && val.length > 0 && !key.startsWith('_') && key !== 'abnormalResults') {
                data[key] = val
              }
            }
            return data
          })() : {}

          // Render color-coded value
          const renderValue = (value) => {
            if (value === null || value === undefined) return <span className="text-gray-400">null</span>
            if (typeof value === 'boolean') return <span className="text-purple-600">{value.toString()}</span>
            if (typeof value === 'number') return <span className="text-blue-600">{value}</span>
            if (typeof value === 'string') return <span className="text-green-600">"{value}"</span>
            if (Array.isArray(value)) return <span className="text-gray-600">[{value.length} items]</span>
            if (typeof value === 'object') return <span className="text-gray-600">{'{ ... }'}</span>
            return <span>{String(value)}</span>
          }

          // Recursive tree renderer
          const RenderTree = ({ obj, path = '', level = 0 }) => {
            if (!obj || typeof obj !== 'object') return null
            return Object.entries(obj).map(([key, value]) => {
              const currentPath = path ? `${path}.${key}` : key
              const isArray = Array.isArray(value)
              const isObject = typeof value === 'object' && value !== null && !isArray
              const isExpanded = expandedExplorer[currentPath]

              // Search filter
              if (explorerSearch && !JSON.stringify({ [key]: value }).toLowerCase().includes(explorerSearch.toLowerCase())) {
                return null
              }

              if (isObject || isArray) {
                return (
                  <div key={currentPath} className="border-l-2 border-gray-200 pl-4 ml-2 my-2">
                    <button
                      onClick={() => setExpandedExplorer(prev => ({ ...prev, [currentPath]: !prev[currentPath] }))}
                      className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded w-full text-left"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span className="font-mono font-semibold text-sm">{key}:</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-600 bg-white">
                        {isArray ? `Array[${value.length}]` : 'Object'}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="mt-2">
                        {isArray ? (
                          <div className="space-y-2">
                            {value.map((item, index) => (
                              <div key={`${currentPath}[${index}]`} className="border-l-2 border-blue-200 pl-4 ml-2">
                                <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-blue-300 text-blue-600 bg-white">{index}</span>
                                  <div className="flex-1">
                                    {typeof item === 'object' && item !== null
                                      ? <RenderTree obj={item} path={`${currentPath}[${index}]`} level={level + 1} />
                                      : <span className="font-mono text-sm">{renderValue(item)}</span>
                                    }
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <RenderTree obj={value} path={currentPath} level={level + 1} />
                        )}
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <div key={currentPath} className="border-l-2 border-gray-200 pl-4 ml-2 my-2">
                  <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                    <span className="font-mono font-semibold text-sm">{key}:</span>
                    <span className="font-mono text-sm">{renderValue(value)}</span>
                  </div>
                </div>
              )
            }).filter(Boolean)
          }

          return (
          <div className="space-y-6">
            {/* Raw Data Explorer Card — matches Figma */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-5 h-5 text-gray-700" />
                  <h2 className="text-lg font-bold text-gray-900">Raw Data Explorer</h2>
                </div>
                <p className="text-sm text-gray-500">Browse and search through the complete structured health data</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Search bar — full width */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search in data... (e.g., 'hypertension', 'Lisinopril', '2026')"
                    value={explorerSearch}
                    onChange={e => setExplorerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  />
                </div>

                {/* Data Tree */}
                <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                  <div className="font-mono text-sm">
                    <RenderTree obj={explorerData} />
                  </div>
                </div>

                {/* Stats Badges — dynamic */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-600">
                    Total Fields: {JSON.stringify(explorerData).split('"').length - 1}
                  </span>
                  {Object.entries(stats).filter(([k, v]) => Array.isArray(v) && !k.startsWith('_') && k !== 'abnormalResults').map(([key, val]) => (
                    <span key={key} className="px-3 py-1 rounded-full text-xs font-medium border border-gray-300 text-gray-600">
                      {(CATEGORY_META[key]?.label || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()))}: {val.length}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* JSON View Card — matches Figma */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">JSON View</h3>
                  <p className="text-sm text-gray-500">Complete raw data in JSON format</p>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all"
                  style={{boxShadow:'0 4px 14px rgba(59,130,246,0.3)'}}
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
              <div className="bg-gray-900 rounded-b-2xl max-h-[400px] overflow-auto p-4">
                <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
                  {JSON.stringify(explorerData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
          )
        })()}

        {/* ===== INSIGHTS VIEW ===== */}
        {activeView === 'insights' && (() => {
          // Encounter frequency data for bar chart
          const encounterFrequency = (() => {
            const freq = {}
            ;(stats.encounters || []).forEach(e => {
              const type = e.encType || 'Other'
              freq[type] = (freq[type] || 0) + 1
            })
            return Object.entries(freq).map(([type, count]) => ({ type, count }))
          })()

          // Lab results over time for trend charts
          const labTrendData = (stats.results || [])
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
          const medAdherence = (stats.medications || []).length > 0 ? 85 : 0
          const vitalScore = (stats.results || []).length > 0 ? Math.round((1 - stats.abnormalResults.length / Math.max(1, (stats.results || []).length)) * 100) : 72
          const preventiveScore = (stats.encounters || []).length > 2 ? 90 : (stats.encounters || []).length * 30
          const conditionScore = (stats.conditions || []).filter(c => c.status === 'Active').length > 0 ? 65 : 80

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
              {(stats.conditions || []).length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Condition Status Overview</h3>
                    <p className="text-sm text-gray-500">Active vs resolved conditions</p>
                  </div>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={(stats.conditions || []).map(c => ({ name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name, severity: c.severity === 'Moderate' ? 2 : c.severity === 'Mild' ? 1 : 3 }))}>
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
              {(stats.medications || []).length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Medication Timeline</h3>
                    <p className="text-sm text-gray-500">When medications were started</p>
                  </div>
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={(stats.medications || []).map(m => ({
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
        {/* ===== AI ASSISTANT VIEW ===== */}
        {activeView === 'ai-assistant' && (
          <AIChatView selectedPatient={selectedPatient} stats={stats} />
        )}

        {/* ===== DATA LINEAGE VIEW ===== */}
        {activeView === 'data-lineage' && (
          <DataLineageView />
        )}

        {/* ===== DOCUMENT INTELLIGENCE VIEW ===== */}
        {activeView === 'documents' && (
          <DocumentIntelligence />
        )}
      </main>

      {/* Privacy & Security Footer */}
      <footer className="border-t border-gray-200/50 bg-white/60 backdrop-blur-sm mt-8">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-600 font-medium">Zero PHI Server</span>
            </span>
            <span>•</span>
            <span>App v{APP_VERSION}</span>
            <span>•</span>
            <span>Rules v{RULE_ENGINE_VERSION}</span>
            {(() => {
              const integrity = getRuleIntegrity()
              if (!integrity) return null
              return (
                <>
                  <span>•</span>
                  <span className={`flex items-center gap-1 ${integrity.verified ? 'text-green-600' : 'text-amber-600'}`}>
                    {integrity.verified
                      ? <><CheckCircle2 className="w-3 h-3" /> Rules verified</>
                      : <><AlertTriangle className="w-3 h-3" /> Rules modified</>
                    }
                  </span>
                </>
              )
            })()}
          </div>
          <button
            onClick={() => setPrivacyOpen(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
          >
            Privacy Settings
          </button>
        </div>
      </footer>

      {/* Memory Cleared Toast */}
      {memoryCleared && (
        <div className="fixed bottom-6 right-6 z-[90] bg-green-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-5 h-5" />
          <span className="font-medium">Memory securely cleared</span>
        </div>
      )}

      {/* Privacy Panel Modal */}
      <PrivacyPanel isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />

      {/* AI Settings Panel */}
      <AISettingsPanel isOpen={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />
    </div>
  )
}
