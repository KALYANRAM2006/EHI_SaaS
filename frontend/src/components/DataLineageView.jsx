/**
 * DataLineageView — Data Lineage & Provenance tab
 *
 * Dynamically discovers all clinical-data categories present in the patient
 * data and renders one tab per category (only if records exist).
 *
 * Shows:
 *   - Source overview grid (one card per uploaded data source, color-coded)
 *   - Per-category record counts by source
 *   - Dynamic tabbed records view — only categories with data appear
 *   - Color-coded left borders, source badges & extraction-method badges
 *   - Source legend
 *
 * Pure Tailwind CSS — no shadcn / Radix UI.
 */
import { useState, useMemo } from 'react'
import { GitBranch, FileText, Pill, Building2, AlertTriangle, Shield, Activity,
         FlaskConical, Syringe, Database, Filter, Eye, EyeOff, Scissors,
         Heart, FileCheck, Stethoscope, ClipboardList } from 'lucide-react'
import { useData } from '../context/DataContext'

// ─── Category Registry ───────────────────────────────────────────────────────
// Each entry maps a data key to its display config.  The order here controls
// the default tab ordering.  Categories with 0 records are hidden automatically.

const CATEGORY_REGISTRY = [
  { key: 'medications',   label: 'Medications',    icon: Pill,           color: 'border-blue-500'    },
  { key: 'results',       label: 'Lab Results',    icon: FlaskConical,   color: 'border-green-500'   },
  { key: 'conditions',    label: 'Conditions',     icon: Activity,       color: 'border-amber-500'   },
  { key: 'procedures',    label: 'Procedures',     icon: Scissors,       color: 'border-indigo-500'  },
  { key: 'allergies',     label: 'Allergies',      icon: AlertTriangle,  color: 'border-red-500'     },
  { key: 'encounters',    label: 'Encounters',     icon: Building2,      color: 'border-purple-500'  },
  { key: 'immunizations', label: 'Immunizations',  icon: Syringe,        color: 'border-teal-500'    },
  { key: 'vitals',        label: 'Vitals',         icon: Heart,          color: 'border-pink-500'    },
  { key: 'documents',     label: 'Documents',      icon: FileCheck,      color: 'border-gray-500'    },
  { key: 'orders',        label: 'Orders',         icon: ClipboardList,  color: 'border-cyan-500'    },
]

// Mapping from registry key → how to source the data from selectedPatient / parsedData
// Prefer _all* (lineage arrays that include duplicates) over primary arrays
function resolveCategory(key, selectedPatient, parsedData, pid) {
  const sp = selectedPatient || {}
  const pd = parsedData || {}

  switch (key) {
    case 'medications':
      return (sp._allMedications || pd.medications || sp.medications || []).filter(r => !r.patId || r.patId === pid)
    case 'results':
      return (sp._allResults || pd.results || sp.results || []).filter(r => {
        if (!r.patId) return true
        if (r.patId === pid) return true
        const patientOrders = (pd.orders || []).filter(o => o.patId === pid).map(o => o.orderId)
        return patientOrders.includes(r.orderId)
      })
    case 'conditions':
      return (sp._allConditions || pd.conditions || sp.conditions || []).filter(r => !r.patId || r.patId === pid)
    case 'allergies':
      return (sp._allAllergies || pd.allergies || sp.allergies || []).filter(r => !r.patId || r.patId === pid)
    case 'encounters':
      return (sp._allEncounters || pd.encounters || sp.encounters || []).filter(r => !r.patId || r.patId === pid)
    case 'procedures':
      return (sp._allOrders || pd.orders || sp.orders || []).filter(r => !r.patId || r.patId === pid)
    case 'immunizations':
      return (sp._allImmunizations || pd.immunizations || sp.immunizations || []).filter(r => !r.patId || r.patId === pid)
    case 'vitals':
      return (pd.vitals || sp.vitals || []).filter(r => !r.patId || r.patId === pid)
    case 'documents':
      return (pd.documents || [])
    case 'orders':
      return (sp._allOrders || pd.orders || sp.orders || []).filter(r => !r.patId || r.patId === pid)
    default:
      // Fallback: try parsedData[key] or selectedPatient[key]
      return (pd[key] || sp[key] || [])
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DataLineageView() {
  const { parsedData, dataSources, selectedPatient } = useData()
  const [activeTab, setActiveTab] = useState(null)          // null = auto-select first available
  const [showDuplicates, setShowDuplicates] = useState(false)

  // Build patient data for every registered category
  const patientData = useMemo(() => {
    if (!parsedData || !selectedPatient) return {}
    const pid = selectedPatient.patId
    const data = {}
    for (const cat of CATEGORY_REGISTRY) {
      data[cat.key] = resolveCategory(cat.key, selectedPatient, parsedData, pid)
    }
    // Also discover any unregistered keys in parsedData (future-proof)
    for (const key of Object.keys(parsedData)) {
      if (data[key] || !Array.isArray(parsedData[key])) continue
      // Skip non-clinical meta keys
      if (['patients', 'providers', 'rulesLoaded', 'fhirResources'].includes(key)) continue
      data[key] = parsedData[key]
    }
    return data
  }, [parsedData, selectedPatient])

  // Build visible tabs: only categories that have records
  const visibleTabs = useMemo(() => {
    const registered = CATEGORY_REGISTRY.filter(cat => {
      const arr = patientData[cat.key]
      return arr && arr.length > 0
    })
    // Check for any unregistered keys that have data
    const registeredKeys = new Set(CATEGORY_REGISTRY.map(c => c.key))
    const extra = Object.keys(patientData)
      .filter(k => !registeredKeys.has(k) && Array.isArray(patientData[k]) && patientData[k].length > 0)
      .map(k => ({
        key: k,
        label: k.charAt(0).toUpperCase() + k.slice(1),
        icon: Database,
        color: 'border-gray-400',
      }))
    return [...registered, ...extra]
  }, [patientData])

  // Auto-select first tab if current selection has no data
  const effectiveTab = useMemo(() => {
    if (visibleTabs.length === 0) return null
    const found = visibleTabs.find(t => t.key === activeTab)
    return found ? activeTab : visibleTabs[0].key
  }, [activeTab, visibleTabs])

  // Total records
  const totalRecords = useMemo(() =>
    Object.values(patientData).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
  , [patientData])

  // Dup counts per visible tab
  const dupCounts = useMemo(() => {
    const counts = {}
    for (const tab of visibleTabs) {
      counts[tab.key] = (patientData[tab.key] || []).filter(r => r._duplicate).length
    }
    counts.total = Object.values(counts).reduce((a, b) => a + b, 0)
    return counts
  }, [patientData, visibleTabs])

  // Active records (filtered by duplicate toggle)
  const activeRecords = useMemo(() => {
    if (!effectiveTab) return []
    const records = patientData[effectiveTab] || []
    return showDuplicates ? records : records.filter(r => !r._duplicate)
  }, [patientData, effectiveTab, showDuplicates])

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
        <div className="flex flex-wrap gap-6 mt-4 text-sm">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="text-gray-600"><strong className="text-gray-900">{dataSources.length}</strong> Data Sources</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-600" />
            <span className="text-gray-600"><strong className="text-gray-900">{totalRecords}</strong> Records</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            <span className="text-gray-600"><strong className="text-gray-900">{visibleTabs.length}</strong> Categories</span>
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

      {/* ─── Dynamic Category Tabs ────────────────────────────────────────── */}
      {visibleTabs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto flex-1">
              {visibleTabs.map(tab => {
                const Icon = tab.icon
                const all = patientData[tab.key] || []
                const count = showDuplicates ? all.length : all.filter(r => !r._duplicate).length
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      effectiveTab === tab.key
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                      effectiveTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
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
                No {effectiveTab} records found for this patient.
              </div>
            )}
            {activeRecords.map((record, idx) => (
              <RecordRow key={idx} record={record} category={effectiveTab} />
            ))}
          </div>
        </div>
      )}

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
      return `${record.name || record.component || 'Lab Result'}: ${record.value || ''} ${record.unit || ''}`
    case 'procedures':
    case 'orders':
      return record.procName || record.name || 'Procedure'
    case 'immunizations':
      return record.name || 'Immunization'
    case 'vitals':
      return `${record.name || 'Vital'}: ${record.value || ''}`
    case 'documents':
      return record.docId || record.type || 'Document'
    default:
      // Generic fallback: try common field names
      return record.name || record.title || record.procName || record.allergen || record.medication || 'Record'
  }
}

function getRecordSubtitle(record, category) {
  switch (category) {
    case 'medications':
      return [
        record.rxcui ? `RxCUI:${record.rxcui}` : null,
        record.ndc ? `NDC:${record.ndc}` : null,
        record.drugClass || null,
        record.genericName && record.genericName !== (record.name||'').toLowerCase() ? `(${record.genericName})` : null,
        record.dosage, record.dose, record.frequency, record.prescriber, record.purpose,
      ].filter(Boolean).join(' · ')
    case 'encounters':
      return [record.contactDate, record.visitProvider, record.patientClass].filter(Boolean).join(' · ')
    case 'allergies':
      return [
        record.snomedCT ? `SNOMED:${record.snomedCT}` : null,
        record.severity, record.reaction, record.type,
      ].filter(Boolean).join(' · ')
    case 'conditions':
      return [
        record.icd10 ? `ICD-10:${record.icd10}` : null,
        record.snomedCT ? `SNOMED:${record.snomedCT}` : null,
        record.status, record.onset, record.severity,
      ].filter(Boolean).join(' · ')
    case 'results':
      return [
        record.loinc ? `LOINC:${record.loinc}` : null,
        record.flag && record.flag !== 'Normal' ? `⚠️ ${record.flag}` : record.flag,
        record.referenceRange ? `Ref: ${record.referenceRange}` :
          (record.refLow != null && record.refHigh != null ? `Ref: ${record.refLow}–${record.refHigh}` : null),
        record.resultTime || record.date,
      ].filter(Boolean).join(' · ')
    case 'procedures':
    case 'orders':
      return [
        record.procCode ? `CPT:${record.procCode}` : null,
        record.cptDescription || null,
        record.orderDate || null,
        record.status || null,
      ].filter(Boolean).join(' · ')
    case 'immunizations':
      return [
        record.cvx ? `CVX:${record.cvx}` : null,
        record.cvxDisplay || null,
        record.date, record.route, record.site, record.manufacturer, record.status,
      ].filter(Boolean).join(' · ')
    case 'vitals':
      return [
        record.loinc ? `LOINC:${record.loinc}` : null,
        record.date, record.unit,
      ].filter(Boolean).join(' · ')
    case 'documents':
      return [record.type, record.status, record.date, record.author].filter(Boolean).join(' · ')
    default:
      // Generic: show any string fields that look useful
      return [record.status, record.date, record.type, record.code].filter(Boolean).join(' · ')
  }
}
