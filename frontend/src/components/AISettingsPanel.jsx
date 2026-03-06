/**
 * AISettingsPanel — Configure AI mode and test de-identification
 *
 * Provides UI for:
 *   1. Selecting AI mode (Local / Cloud / Browser)
 *   2. Configuring Azure OpenAI credentials
 *   3. Testing de-identification pipeline
 *   4. Viewing the safe prompt that would be sent to AI
 */

import { useState } from 'react'
import {
  X, Shield, ShieldCheck, Sparkles, Cloud, Cpu, Lock,
  Eye, EyeOff, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Copy,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { AI_MODES } from '../services/aiService'

export default function AISettingsPanel({ isOpen, onClose }) {
  const {
    aiConfig, updateAIConfig, regenerateAISummary, aiLoading, aiError,
    testDeidentify, selectedPatient,
  } = useData()

  const [showKey, setShowKey] = useState(false)
  const [localKey, setLocalKey] = useState('')
  const [localEndpoint, setLocalEndpoint] = useState(aiConfig.azureEndpoint || '')
  const [localDeployment, setLocalDeployment] = useState(aiConfig.azureDeployment || '')
  const [testResult, setTestResult] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const modes = [
    {
      ...AI_MODES.LOCAL_ONLY,
      icon: <Lock className="w-5 h-5" />,
      color: 'green',
      badgeText: 'Default',
    },
    {
      ...AI_MODES.DEIDENTIFIED_CLOUD,
      icon: <Cloud className="w-5 h-5" />,
      color: 'blue',
      badgeText: 'HIPAA BAA',
    },
    {
      ...AI_MODES.BROWSER_AI,
      icon: <Cpu className="w-5 h-5" />,
      color: 'purple',
      badgeText: 'WebGPU',
    },
  ]

  const handleModeChange = (modeId) => {
    updateAIConfig({ mode: modeId })
  }

  const handleSaveCloud = () => {
    updateAIConfig({
      mode: 'cloud',
      azureEndpoint: localEndpoint,
      azureApiKey: localKey,
      azureDeployment: localDeployment,
    })
  }

  const handleTest = () => {
    const result = testDeidentify()
    setTestResult(result)
  }

  const handleCopyPrompt = () => {
    if (testResult?.prompt) {
      navigator.clipboard.writeText(testResult.prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const riskColors = { none: 'text-green-600 bg-green-50', minimal: 'text-blue-600 bg-blue-50' }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">AI Settings</h2>
                <p className="text-indigo-200 text-sm">Choose how health summaries are generated</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Mode Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">AI Mode</h3>
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  aiConfig.mode === mode.id
                    ? `border-${mode.color}-500 bg-${mode.color}-50 shadow-md`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    aiConfig.mode === mode.id
                      ? `bg-${mode.color}-100 text-${mode.color}-600`
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {mode.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{mode.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        mode.phiRisk === 'none' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>{mode.badgeText}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColors[mode.phiRisk]}`}>
                        PHI Risk: {mode.phiRisk}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{mode.description}</p>
                  </div>
                  {aiConfig.mode === mode.id && (
                    <CheckCircle2 className={`w-5 h-5 text-${mode.color}-500 flex-shrink-0`} />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Cloud AI Configuration */}
          {aiConfig.mode === 'cloud' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Azure OpenAI Configuration</h3>
              </div>
              <p className="text-sm text-blue-700">
                Requires an Azure OpenAI resource with a signed <strong>HIPAA BAA</strong>.
                PHI is stripped before sending — only de-identified clinical data reaches the API.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Azure OpenAI Endpoint</label>
                  <input
                    type="url"
                    value={localEndpoint}
                    onChange={(e) => setLocalEndpoint(e.target.value)}
                    placeholder="https://your-resource.openai.azure.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deployment Name</label>
                  <input
                    type="text"
                    value={localDeployment}
                    onChange={(e) => setLocalDeployment(e.target.value)}
                    placeholder="gpt-4o"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={localKey}
                        onChange={(e) => setLocalKey(e.target.value)}
                        placeholder="Your API key (stored in session only)"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Stored in sessionStorage only — cleared on tab close
                  </p>
                </div>
                <button
                  onClick={handleSaveCloud}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save & Activate
                </button>
              </div>
            </div>
          )}

          {/* Browser AI Info */}
          {aiConfig.mode === 'browser' && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Browser AI (WebGPU)</h3>
              </div>
              <p className="text-sm text-purple-700">
                Runs a small LLM entirely in your browser using WebGPU acceleration.
                Zero network activity — even the model weights stay local.
              </p>
              <div className="mt-3 p-3 bg-purple-100 rounded-lg text-sm text-purple-800">
                <strong>Status:</strong> {navigator.gpu ? '✓ WebGPU available' : '✗ WebGPU not supported in this browser'}
                <br />
                <strong>Recommended:</strong> Chrome 113+ or Edge 113+ with a modern GPU
                <br />
                <strong>Model:</strong> Phi-3-mini-4k (3.8B params, ~2GB download)
              </div>
            </div>
          )}

          {/* De-identification Test */}
          <div className="border-t border-gray-200 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">De-identification Test</h3>
              <button
                onClick={handleTest}
                disabled={!selectedPatient}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Run Test
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Preview what the AI would see — verify that all PHI has been stripped.
            </p>

            {testResult && (
              <div className="space-y-3">
                {/* Validation Result */}
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  testResult.validation.clean
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  {testResult.validation.clean
                    ? <><CheckCircle2 className="w-5 h-5 text-green-600" /><span className="text-sm font-medium text-green-800">Clean — no PHI detected in de-identified data</span></>
                    : <><AlertTriangle className="w-5 h-5 text-amber-600" /><span className="text-sm font-medium text-amber-800">{testResult.validation.warnings.length} warning(s) — review below</span></>
                  }
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{testResult.tokenCount}</p>
                    <p className="text-xs text-gray-500">PHI tokens replaced</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{testResult.estimatedTokens}</p>
                    <p className="text-xs text-gray-500">Est. AI tokens</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{testResult.promptLength}</p>
                    <p className="text-xs text-gray-500">Prompt chars</p>
                  </div>
                </div>

                {/* Warnings */}
                {!testResult.validation.clean && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-800 mb-1">Warnings:</p>
                    {testResult.validation.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-700">• {w}</p>
                    ))}
                  </div>
                )}

                {/* Token Map */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Token Map (client-side only):</p>
                  <div className="font-mono text-xs space-y-1 max-h-24 overflow-y-auto">
                    {Object.entries(testResult.tokenMap).map(([token, original]) => (
                      <div key={token} className="flex gap-2">
                        <span className="text-blue-600">{token}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-600">{original}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safe Prompt Preview */}
                <div>
                  <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    {showPrompt ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    View Safe Prompt (what AI would see)
                  </button>
                  {showPrompt && (
                    <div className="mt-2 relative">
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-48 font-mono whitespace-pre-wrap">
                        {testResult.prompt}
                      </pre>
                      <button
                        onClick={handleCopyPrompt}
                        className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                        title="Copy prompt"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-300" />
                      </button>
                      {copied && (
                        <span className="absolute top-2 right-10 text-xs text-green-400 font-medium">Copied!</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {aiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">AI Error</p>
                <p className="text-xs text-red-700">{aiError}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
