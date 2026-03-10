/**
 * DataLineageView — Data Lineage & Provenance tab
 *
 * Shows:
 *   - Source overview grid (one card per uploaded data source, color-coded)
 *   - Per-category record counts by source
 *   - Tabbed data records view (Medications, Encounters, Allergies, Conditions, Results)
 *   - Color-coded left borders & source badges on every record
 *   - Source legend
 *
 * Pure Tailwind CSS — no shadcn / Radix UI.
 */
import { useState, useMemo } from 'react'
import { GitBranch, FileText, Pill, Building2, AlertTriangle, Shield, Activity, FlaskConical, Syringe, Database, Filter, Eye, EyeOff, Scissors } from 'lucide-react'
import { useData } from '../context/DataContext'

// ─── Category configuration ──────────────────────────────────────────────────

const CATEGORY_TABS = [
  { key: 'medications',   label: 'Medications',   icon: Pill,          colorClass: 'border-blue-500'   },
  { key: 'encounters',    label: 'Encounters',     icon: Building2,     colorClass: 'border-purple-500' },
  { key: 'allergies',     label: 'Allergies',      icon: AlertTriangle, colorClass: 'border-red-500'    },
  { key: 'conditions',    label: 'Conditions',     icon: Activity,      colorClass: 'border-amber-500'  },
  { key: 'results',       label: 'Lab Results',    icon: FlaskConical,  colorClass: 'border-green-500'  },
  { key: 'procedures',    label: 'Procedures',     icon: Scissors,      colorClass: 'border-indigo-500' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function DataLineageView() {
  const { parsedData, dataSources, selectedPatient } = useData()
  const [activeTab, setActiveTab] = useState('medications')
  const [showDuplicates, setShowDuplicates] = useState(false)

  // Flatten patient-level clinical data for the selected patient
  // Use _all* arrays (which include duplicates) for lineage view when available
  const patientData = useMemo(() => {
    if (!parsedData || !selectedPatient) return { medications: [], encounters: [], allergies: [], conditions: [], results: [], procedures: [] }
    const pid = selectedPatient.patId
    return {
      medications: (selectedPatient._allMedications || parsedData.medications || selectedPatient.medications || []).filter(r => !r.patId || r.patId === pid),
      encounters: (parsedData.encounters || []).filter(r => !r.patId || r.patId === pid),
      allergies: (selectedPatient._allAllergies || parsedData.allergies || selectedPatient.allergies || []).filter(r => !r.patId || r.patId === pid),
      conditions: (selectedPatient._allConditions || parsedData.conditions || selectedPatient.conditions || []).filter(r => !r.patId || r.patId === pid),
      results: (selectedPatient._allResults || parsedData.results || selectedPatient.results || []).filter(r => {
        if (!r.patId) return true
        if (r.patId === pid) return true
        const patientOrders = (parsedData.orders || []).filter(o => o.patId === pid).map(o => o.orderId)
        return patientOrders.includes(r.orderId)
      }),
      procedures: (parsedData.orders || selectedPatient.orders || []).filter(r => {
        if (!r.patId) return true
        return r.patId === pid
      }),
    }
  }, [parsedData, selectedPatient])

  // Total records across all categories
  const totalRecords = useMemo(() =>
    Object.values(patientData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
  , [patientData])

  // Count duplicates per category
  const dupCounts = useMemo(() => {
    const counts = {}
    for (const tab of CATEGORY_TABS) {
      counts[tab.key] = (patientData[tab.key] || []).filter(r => r._duplicate).length
    }
    counts.total = Object.values(counts).reduce((a, b) => a + b, 0)
    return counts
  }, [patientData])

  // Active category records (filtered by duplicate toggle)
  const activeRecords = useMemo(() => {
    const records = patientData[activeTab] || []
    return showDuplicates ? records : records.filter(r => !r._duplicate)
  }, [patientData, activeTab, showDuplicates])

  if (!parsedData || !selectedPatient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Database className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-lg font-medium">No data loaded</p>
        <p className="text-sm">Upload files or load sample data to view data lineage.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Data Lineage &amp; Provenance</h2>
            <p className="text-sm text-gray-500">Track where every record originated across multiple data sources</p>
          </div>
        </div>
        <div className="flex gap-6 mt-4 text-sm">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="text-gray-600"><strong className="text-gray-900">{dataSources.length}</strong> Data Sources</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-600" />
            <span className="text-gray-600"><strong className="text-gray-900">{totalRecords}</strong> Records</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="text-gray-600">Full Provenance Tracked</span>
          </div>
        </div>
      </div>

      {/* ─── Source Overview Grid ─────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Source Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataSources.map(source => {
            const total = Object.values(source.categories || {}).reduce((a, b) => a + b, 0)
            return (
              <div
                key={source.id}
                className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: source.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{source.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(source.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: source.color }}
                  >
                    {total}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
                  {source.categories && Object.entries(source.categories).map(([cat, count]) => (
                    count > 0 && (
                      <div key={cat} className="flex justify-between">
                        <span className="capitalize">{cat}</span>
                        <span className="font-medium text-gray-700">{count}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Category Tabs ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto flex-1">
            {CATEGORY_TABS.map(tab => {
              const Icon = tab.icon
              const all = (patientData[tab.key] || [])
              const count = showDuplicates ? all.length : all.filter(r => !r._duplicate).length
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
          {dupCounts.total > 0 && (
            <button
              onClick={() => setShowDuplicates(prev => !prev)}
              className={`flex items-center gap-1.5 ml-3 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex-shrink-0 ${
                showDuplicates
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
              title={showDuplicates ? 'Hide duplicate records' : 'Show duplicate records'}
            >
              {showDuplicates ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <Filter className="w-3.5 h-3.5" />
              {showDuplicates ? 'Hide' : 'Show'} Duplicates
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                showDuplicates ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-600'
              }`}>
                {dupCounts.total}
              </span>
            </button>
          )}
        </div>

        {/* ─── Records List ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          {activeRecords.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              No {activeTab} records found for this patient.
            </div>
          )}
          {activeRecords.map((record, idx) => (
            <RecordRow key={idx} record={record} category={activeTab} />
          ))}
        </div>
      </div>

      {/* ─── Source Legend ─────────────────────────────────────────────────── */}
      {dataSources.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Source Legend</h4>
          <div className="flex flex-wrap gap-4">
            {dataSources.map(source => (
              <div key={source.id} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                <span className="text-gray-700">{source.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Record Row ──────────────────────────────────────────────────────────────

function RecordRow({ record, category }) {
  const title = getRecordTitle(record, category)
  const subtitle = getRecordSubtitle(record, category)

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50/50 transition-colors"
      style={{ borderLeftWidth: '4px', borderLeftColor: record._sourceColor || '#d1d5db' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>}
      </div>
      {record._sourceName && (
        <span
          className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: record._sourceColor || '#6b7280' }}
        >
          {record._sourceName.length > 20 ? record._sourceName.slice(0, 18) + '…' : record._sourceName}
        </span>
      )}
      {(() => {
        const src = record._extractionSource || (record._source === 'ocr' ? 'local-regex' : record._source ? 'tsv' : null)
        if (!src) return null
        const srcLabel = { 'openai': 'OpenAI GPT', 'azure-ai': 'Azure AI', 'local-regex': 'OCR Regex', 'tsv': 'TSV Parser' }[src] || src
        const srcColor = { 'openai': 'bg-emerald-100 text-emerald-700', 'azure-ai': 'bg-purple-100 text-purple-700', 'local-regex': 'bg-blue-100 text-blue-700', 'tsv': 'bg-gray-100 text-gray-600' }[src] || 'bg-gray-100 text-gray-600'
        return <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${srcColor}`}>{srcLabel}</span>
      })()}
      {record._mergedCount > 1 && !record._duplicate && (
        <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700" title={`Merged from: ${(record._mergedSources || []).join(', ')}`}>
          Merged ({record._mergedCount})
        </span>
      )}
      {record._duplicate && (
        <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
          Duplicate
        </span>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRecordTitle(record, category) {
  switch (category) {
    case 'medications':
      return record.name || record.medication || 'Unknown Medication'
    case 'encounters':
      return `${record.encType || record.type || 'Encounter'} — ${record.diagnosis || record.chiefComplaint || ''}`
    case 'allergies':
      return record.allergen || record.name || 'Unknown Allergen'
    case 'conditions':
      return record.name || record.condition || 'Unknown Condition'
    case 'results':
      return `${record.component || record.name || 'Lab Result'}: ${record.value || ''} ${record.unit || ''}`
    case 'procedures':
      return record.procName || record.name || 'Procedure'
    default:
      return record.name || record.title || 'Record'
  }
}

function getRecordSubtitle(record, category) {
  switch (category) {
    case 'medications':
      return [record.dosage, record.prescriber, record.purpose].filter(Boolean).join(' · ')
    case 'encounters':
      return [record.contactDate, record.visitProvider, record.patientClass].filter(Boolean).join(' · ')
    case 'allergies':
      return [record.severity, record.reaction].filter(Boolean).join(' · ')
    case 'conditions':
      return [record.status, record.onset, record.severity].filter(Boolean).join(' · ')
    case 'results':
      return [
        record.flag && record.flag !== 'Normal' ? `⚠️ ${record.flag}` : record.flag,
        record.referenceRange ? `Ref: ${record.referenceRange}` :
          (record.refLow != null && record.refHigh != null ? `Ref: ${record.refLow}–${record.refHigh}` : null),
        record.resultTime || record.date,
      ].filter(Boolean).join(' · ')
    case 'procedures':
      return [
        record.procCode ? `CPT: ${record.procCode}` : null,
        record.cptDescription || null,
        record.orderDate || null,
        record.status || null,
      ].filter(Boolean).join(' · ')
    default:
      return ''
  }
}
