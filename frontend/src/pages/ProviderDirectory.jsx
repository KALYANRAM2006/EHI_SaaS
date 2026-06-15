/**
 * ProviderDirectory.jsx
 *
 * Search KP's Provider Directory & Formulary API — an open FHIR R4 endpoint
 * (285K+ providers, 607K+ insurance plans) proxied through /api/kp-provider.
 *
 * Tabs:
 *   • Find a Provider  — search Practitioners by name, specialty, city/state
 *   • Plans & Formulary — search InsurancePlan by name/type
 *   • Drugs / Formulary — search MedicationKnowledge by drug name
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  UserRound,
  Building2,
  Pill,
  MapPin,
  Phone,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'

const PROXY_BASE = '/api/kp-provider'

// Tabs config
const TABS = [
  { id: 'providers',  label: 'Find a Provider',    icon: UserRound },
  { id: 'plans',      label: 'Plans & Formulary',  icon: Building2 },
  { id: 'drugs',      label: 'Drug Formulary',     icon: Pill },
]

// ─────────────────────────────────────────────────────────────────────────────
// Utility: call the Azure Function proxy
// ─────────────────────────────────────────────────────────────────────────────
async function kpQuery(params) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${PROXY_BASE}?${qs}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json() // FHIR Bundle
}

function extractEntries(bundle) {
  return (bundle?.entry || []).map((e) => e.resource).filter(Boolean)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers to parse FHIR resources into display-friendly shape
// ─────────────────────────────────────────────────────────────────────────────
function parsePractitioner(p) {
  const nameObj = p.name?.[0] || {}
  const name = nameObj.text ||
    [nameObj.prefix?.[0], ...(nameObj.given || []), nameObj.family].filter(Boolean).join(' ') ||
    'Unknown'
  const specialty = p.qualification?.map((q) => q.code?.text || q.code?.coding?.[0]?.display).filter(Boolean).join(', ') || ''
  const phone = p.telecom?.find((t) => t.system === 'phone')?.value || ''
  const addr = p.address?.[0]
  const city = addr ? [addr.city, addr.state].filter(Boolean).join(', ') : ''
  return { id: p.id, name, specialty, phone, city, gender: p.gender || '', resource: p }
}

function parsePlan(plan) {
  const name = plan.name || plan.title || 'Unknown Plan'
  const type = plan.type?.map((t) => t.text || t.coding?.[0]?.display).filter(Boolean).join(', ') || ''
  const coverageArea = plan.coverageArea?.[0]?.display || ''
  const period = plan.period ? `${plan.period.start?.slice(0, 7) || ''}–${plan.period.end?.slice(0, 7) || ''}` : ''
  return { id: plan.id, name, type, coverageArea, period, resource: plan }
}

function parseDrug(med) {
  const code = med.code?.text || med.code?.coding?.[0]?.display || 'Unknown'
  const synonym = med.synonym?.[0] || ''
  const doseForm = med.doseForm?.text || med.doseForm?.coding?.[0]?.display || ''
  const status = med.status || ''
  const mfr = med.manufacturer?.display || ''
  return { id: med.id, code, synonym, doseForm, status, mfr, resource: med }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider search tab
// ─────────────────────────────────────────────────────────────────────────────
function ProviderSearch() {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(null)

  async function search(e) {
    e.preventDefault()
    if (!name.trim() && !city.trim() && !state.trim()) return
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const params = { resource: 'Practitioner', _count: 25 }
      if (name.trim()) params.name = name.trim()
      if (city.trim()) params['address-city'] = city.trim()
      if (state.trim()) params['address-state'] = state.trim()
      const bundle = await kpQuery(params)
      setTotal(bundle.total ?? null)
      setResults(extractEntries(bundle).map(parsePractitioner))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={search} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Search KP Providers (285,000+ in directory)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Provider name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Smith"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
            <input
              value={city} onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Oakland"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
            <input
              value={state} onChange={(e) => setState(e.target.value)}
              placeholder="e.g. CA"
              maxLength={2}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search Providers
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {results !== null && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Results</span>
            {total !== null && (
              <span className="text-xs text-gray-500">{total.toLocaleString()} total matches · showing first {results.length}</span>
            )}
          </div>
          {results.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No providers found. Try a broader search.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((p) => (
                <div key={p.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <UserRound className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    {p.specialty && <p className="text-xs text-blue-600 mt-0.5">{p.specialty}</p>}
                    <div className="flex flex-wrap gap-3 mt-1">
                      {p.city && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />{p.city}
                        </span>
                      )}
                      {p.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" />{p.phone}
                        </span>
                      )}
                      {p.gender && (
                        <span className="text-xs text-gray-400 capitalize">{p.gender}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Plans & Formulary tab
// ─────────────────────────────────────────────────────────────────────────────
function PlansSearch() {
  const [name, setName] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(null)

  async function search(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const params = { resource: 'InsurancePlan', _count: 25 }
      if (name.trim()) params.name = name.trim()
      const bundle = await kpQuery(params)
      setTotal(bundle.total ?? null)
      setResults(extractEntries(bundle).map(parsePlan))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={search} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Search KP Insurance Plans & Formulary (607,000+ plans)</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Plan name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gold, HMO, Deductible"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {name.trim() ? 'Search Plans' : 'Browse All Plans'}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {results !== null && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Insurance Plans</span>
            {total !== null && (
              <span className="text-xs text-gray-500">{total.toLocaleString()} total · showing first {results.length}</span>
            )}
          </div>
          {results.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No plans found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((plan) => (
                <div key={plan.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {plan.type && <span className="text-xs text-purple-600">{plan.type}</span>}
                      {plan.coverageArea && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3" />{plan.coverageArea}
                        </span>
                      )}
                      {plan.period && <span className="text-xs text-gray-400">{plan.period}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Drug / MedicationKnowledge tab
// ─────────────────────────────────────────────────────────────────────────────
function DrugSearch() {
  const [drugName, setDrugName] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(null)

  async function search(e) {
    e.preventDefault()
    if (!drugName.trim()) return
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const bundle = await kpQuery({ resource: 'MedicationKnowledge', 'code:text': drugName.trim(), _count: 25 })
      setTotal(bundle.total ?? null)
      setResults(extractEntries(bundle).map(parseDrug))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={search} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Search KP Drug Formulary</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Drug name</label>
            <input
              value={drugName} onChange={(e) => setDrugName(e.target.value)}
              placeholder="e.g. metformin, lisinopril"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !drugName.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search Formulary
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {results !== null && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Formulary Results</span>
            {total !== null && (
              <span className="text-xs text-gray-500">{total.toLocaleString()} total · showing first {results.length}</span>
            )}
          </div>
          {results.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No formulary entries found. Try a generic name.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((drug) => (
                <div key={drug.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{drug.code}</p>
                    {drug.synonym && <p className="text-xs text-gray-500 mt-0.5">{drug.synonym}</p>}
                    <div className="flex flex-wrap gap-3 mt-1">
                      {drug.doseForm && <span className="text-xs text-green-600">{drug.doseForm}</span>}
                      {drug.mfr && <span className="text-xs text-gray-400">{drug.mfr}</span>}
                      {drug.status && (
                        <span className={`text-xs font-medium ${drug.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                          {drug.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function ProviderDirectory() {
  const [activeTab, setActiveTab] = useState('providers')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/80 border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg">
                <img src="/clinquilt.svg" alt="ClinQuilt" className="w-9 h-9" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  KP Provider Directory
                </span>
                <p className="text-xs text-gray-500 -mt-0.5">Kaiser Permanente · Open FHIR R4 API</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <ExternalLink className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            Data sourced from Kaiser Permanente's open Provider Directory &amp; Formulary FHIR R4 API
            — <span className="font-medium">no login required</span>. This is public reference data,
            not your personal health records.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'providers' && <ProviderSearch />}
        {activeTab === 'plans'     && <PlansSearch />}
        {activeTab === 'drugs'     && <DrugSearch />}
      </main>
    </div>
  )
}
