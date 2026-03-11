/**
 * PrivacyBanner — Persistent "Zero PHI Server" indicator
 *
 * Displays a small fixed banner showing that all data is processed locally,
 * with a clickable toggle to open the full Privacy Panel.
 */

import { useState } from 'react'
import { Shield, ShieldCheck, X, Lock, Trash2, Database, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useData } from '../context/DataContext'
import { APP_VERSION, RULE_ENGINE_VERSION } from '../utils/privacy'

export function PrivacyBadge({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-medium text-green-700 hover:bg-green-100 transition-colors group"
      title="Privacy & Security — Click for details"
    >
      <ShieldCheck className="w-3.5 h-3.5 text-green-600 group-hover:scale-110 transition-transform" />
      <span>Zero PHI Server</span>
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
    </button>
  )
}

export function PrivacyPanel({ isOpen, onClose }) {
  const { secureWipe, persistEnabled, togglePersistence, memoryCleared, parsedData } = useData()
  const [wiping, setWiping] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleWipe = async () => {
    setWiping(true)
    await secureWipe()
    setWiping(false)
    setShowConfirm(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Privacy & Security</h2>
                <p className="text-green-100 text-sm">All data stays on your device</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Zero PHI Server Guarantee */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900">Zero PHI Server Guarantee</h3>
                <p className="text-sm text-green-700 mt-1">
                  ClinQuilt processes all health records entirely in your browser.
                  <strong> No data is ever sent to any server.</strong> Your files are parsed
                  by our client-side YAML rule engine — the network tab stays silent.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-green-700">Active — Zero network requests for PHI</span>
                </div>
              </div>
            </div>
          </div>

          {/* Session Mode */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Secure Session Mode</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Data lives only in browser memory. Closing the tab auto-clears everything.
                  Inactive tabs auto-purge after 5 minutes.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-blue-700">
                    {parsedData ? 'Health data in memory' : 'No data loaded'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Local Persistence Toggle */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Database className="w-6 h-6 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Local Persistence</h3>
                  <button
                    onClick={() => togglePersistence(!persistEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${persistEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${persistEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {persistEnabled
                    ? 'Data is encrypted (AES-256-GCM) and stored in IndexedDB. Survives tab close.'
                    : 'Disabled — data exists only in memory for this session.'}
                </p>
                {persistEnabled && (
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs text-indigo-600 font-medium">AES-256-GCM encrypted</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Memory Wipe */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Trash2 className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Secure Memory Wipe</h3>
                <p className="text-sm text-red-700 mt-1">
                  Immediately clears all health data from memory, IndexedDB, and sessionStorage.
                </p>
                {memoryCleared ? (
                  <div className="flex items-center gap-2 mt-3 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Memory securely cleared!</span>
                  </div>
                ) : showConfirm ? (
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleWipe}
                      disabled={wiping}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {wiping ? 'Wiping…' : 'Confirm Wipe'}
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="mt-3 px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Clear All Data
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Version & Integrity Footer */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>App v{APP_VERSION}</span>
                <span>Rules v{RULE_ENGINE_VERSION}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600 font-medium">HIPAA-Ready Architecture</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
