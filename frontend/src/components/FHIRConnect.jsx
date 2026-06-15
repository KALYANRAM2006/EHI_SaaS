import { useState, useCallback } from 'react'
import { Search, Building2, Wifi, ChevronRight, X, AlertCircle, TestTube, Star, ExternalLink, Loader2 } from 'lucide-react'
import { FHIR_ENDPOINTS, searchEndpoints, getClientId } from '../config/fhirEndpoints'
import { initiateSmartAuth, discoverSmartConfig } from '../services/smartAuth'

/**
 * FHIRConnect — Hospital search and SMART on FHIR connection modal.
 * Renders as a full-screen modal. onClose() to dismiss.
 */
export default function FHIRConnect({ onClose }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [customUrl, setCustomUrl] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [discoverError, setDiscoverError] = useState('')
  const [clientId, setClientId] = useState('')

  const results = searchEndpoints(query)
  const sandboxes = results.filter(e => e.category === 'sandbox')
  const hospitals = results.filter(e => e.category !== 'sandbox')

  const [kpExportEndpoint, setKpExportEndpoint] = useState(null)

  const handleConnect = useCallback(async (endpoint) => {
    setSelected(endpoint)
    setConnecting(true)
    setDiscoverError('')
    setKpExportEndpoint(null)

    // KP endpoints: their OAuth/Start login page returns 404 for external apps.
    // Show the manual export panel immediately instead of a broken redirect.
    if (endpoint.exportUrl) {
      setConnecting(false)
      setSelected(null)
      setKpExportEndpoint(endpoint)
      return
    }

    try {
      await discoverSmartConfig(endpoint)
      const cid = clientId || getClientId(endpoint)
      await initiateSmartAuth(endpoint, cid)
    } catch (err) {
      setDiscoverError(err.message)
      setConnecting(false)
      setSelected(null)
    }
  }, [clientId])

  const handleCustomConnect = useCallback(async () => {
    if (!customUrl.trim()) return
    const endpoint = {
      id: 'custom',
      name: 'Custom Hospital',
      system: 'Unknown EHR',
      fhirBase: customUrl.trim(),
      scopes: 'launch/patient openid fhirUser patient/*.read',
    }
    await handleConnect(endpoint)
  }, [customUrl, handleConnect])

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Connect Your Hospital</h2>
              <p className="text-xs text-gray-500">SMART on FHIR — secure, no password sharing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* How it works banner */}
        <div className="mx-6 mt-4 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
          <Wifi className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>How it works:</strong> You'll be redirected to your hospital's secure login portal. After you sign in, your health records will sync automatically. <strong>ClinQuilt never sees your password.</strong>
          </p>
        </div>

        {/* Search */}
        <div className="px-6 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by hospital name or state..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              autoFocus
            />
          </div>
        </div>

        {/* KP Manual Export — primary action for KP endpoints */}
        {kpExportEndpoint && (
          <div className="mx-6 mt-3 px-4 py-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-semibold text-blue-900">{kpExportEndpoint.name}</p>
              <button onClick={() => setKpExportEndpoint(null)} className="text-blue-400 hover:text-blue-600 text-xs ml-2">✕</button>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed mb-3">
              Kaiser Permanente's FHIR login page currently returns a "Page Not Found" error for external apps — their standalone OAuth flow is not yet open to third parties.
              You can still get your full health record by exporting directly from KP:
            </p>
            <ol className="text-xs text-blue-800 space-y-1.5 mb-3 pl-4 list-decimal">
              <li>Go to <strong>healthy.kaiserpermanente.org</strong> and sign in</li>
              <li>Navigate to <strong>My Health Manager → Medical Records</strong></li>
              <li>Click <strong>"Download My Health Record"</strong> (FHIR format)</li>
              <li>Save the <code className="bg-blue-100 px-1 rounded">.json</code> file</li>
              <li>Drag &amp; drop the file onto the ClinQuilt home screen</li>
            </ol>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={kpExportEndpoint.exportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> Open KP My Health Manager
              </a>
              <button
                onClick={() => {
                  const ep = kpExportEndpoint
                  setKpExportEndpoint(null)
                  setSelected(ep)
                  setConnecting(true)
                  setDiscoverError('')
                  discoverSmartConfig(ep)
                    .then(() => initiateSmartAuth(ep, clientId || getClientId(ep)))
                    .catch(err => { setDiscoverError(err.message); setConnecting(false); setSelected(null) })
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Try FHIR connection anyway
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {discoverError && (
          <div className="mx-6 mt-3 px-4 py-3 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{discoverError}</p>
          </div>
        )}

        {/* Results list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 mt-3 space-y-4">

          {/* Sandboxes (test environments) */}
          {sandboxes.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                <TestTube className="w-3 h-3" /> Test / Sandbox
              </p>
              <div className="space-y-2">
                {sandboxes.map(ep => (
                  <EndpointRow key={ep.id} endpoint={ep} onConnect={handleConnect} connecting={connecting && selected?.id === ep.id} />
                ))}
              </div>
            </div>
          )}

          {/* Real hospitals */}
          {hospitals.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                <Star className="w-3 h-3" /> Health Systems
              </p>
              <div className="space-y-2">
                {hospitals.map(ep => (
                  <EndpointRow key={ep.id} endpoint={ep} onConnect={handleConnect} connecting={connecting && selected?.id === ep.id} />
                ))}
              </div>
            </div>
          )}

          {results.length === 0 && query.length >= 2 && (
            <div className="text-center py-8 text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hospitals found for "{query}"</p>
              <p className="text-xs mt-1">Try entering a custom FHIR URL below</p>
            </div>
          )}

          {/* Custom endpoint */}
          <div>
            <button
              onClick={() => setShowCustom(v => !v)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              {showCustom ? '▾' : '▸'} Enter custom FHIR R4 base URL
            </button>
            {showCustom && (
              <div className="mt-2 space-y-2">
                <input
                  type="url"
                  placeholder="https://your-hospital.org/fhir/R4"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Client ID (from your SMART app registration)"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCustomConnect}
                  disabled={!customUrl.trim() || connecting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Connect Custom Endpoint
                </button>
                <p className="text-[10px] text-gray-400 text-center">
                  Need your FHIR URL?{' '}
                  <a href="https://open.epic.com/MyApps/Endpoints" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline inline-flex items-center gap-0.5">
                    Epic directory <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  {' · '}
                  <a href="https://fhir.cerner.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline inline-flex items-center gap-0.5">
                    Cerner <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Endpoint Row
// ─────────────────────────────────────────────────────────────────────────────

function EndpointRow({ endpoint, onConnect, connecting }) {
  const vendorColor = {
    'Epic': 'bg-red-50 text-red-700 border-red-200',
    'Cerner (Oracle Health)': 'bg-orange-50 text-orange-700 border-orange-200',
    'athenahealth': 'bg-green-50 text-green-700 border-green-200',
    'MEDITECH': 'bg-purple-50 text-purple-700 border-purple-200',
  }[endpoint.system] || 'bg-gray-50 text-gray-700 border-gray-200'

  return (
    <button
      onClick={() => onConnect(endpoint)}
      disabled={connecting}
      className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group disabled:opacity-60"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl flex-shrink-0">{endpoint.logo || '🏥'}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{endpoint.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${vendorColor}`}>
              {endpoint.system}
            </span>
            {endpoint.state && endpoint.state !== 'N/A' && (
              <span className="text-[10px] text-gray-400">{endpoint.state}</span>
            )}
          </div>
        </div>
      </div>
      {connecting ? (
        <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
      )}
    </button>
  )
}
