/**
 * SettingsView - Application Configuration
 *
 * Allows users to configure:
 * - CMS Prior Authorization API credentials
 * - AI settings
 * - Privacy preferences
 */

import { useState, useEffect } from 'react'
import {
  Settings,
  Key,
  Shield,
  Brain,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Upload,
  Trash2,
} from 'lucide-react'
import {
  loadConfig,
  saveConfig,
  updateCMSApiConfig,
  clearConfig,
  exportConfig,
  importConfig,
  validateCMSCredentials,
  isCMSApiConfiguredInSettings,
} from '../services/configService'

export default function SettingsView() {
  const [config, setConfig] = useState(null)
  const [showClientSecret, setShowClientSecret] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'saving', 'saved', 'error'
  const [validationMessage, setValidationMessage] = useState(null)

  // Load config on mount
  useEffect(() => {
    const loadedConfig = loadConfig()
    setConfig(loadedConfig)
  }, [])

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    setValidationMessage(null)

    // Validate CMS credentials if enabled
    if (config.cmsApi.enabled) {
      const validation = await validateCMSCredentials(
        config.cmsApi.clientId,
        config.cmsApi.clientSecret
      )

      if (!validation.valid) {
        setSaveStatus('error')
        setValidationMessage({ type: 'error', text: validation.message })
        return
      }

      setValidationMessage({ type: 'success', text: validation.message })
    }

    const success = saveConfig(config)

    if (success) {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    } else {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      clearConfig()
      const defaultConfig = loadConfig()
      setConfig(defaultConfig)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const handleExport = () => {
    exportConfig()
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      importConfig(file)
        .then((imported) => {
          setConfig(imported)
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus(null), 3000)
        })
        .catch((error) => {
          alert('Failed to import configuration: ' + error.message)
        })
    }
  }

  const updateCMSField = (field, value) => {
    setConfig({
      ...config,
      cmsApi: {
        ...config.cmsApi,
        [field]: value,
      },
    })
  }

  const isConfigured = isCMSApiConfiguredInSettings()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-blue-600" />
          Settings & Configuration
        </h2>
        <p className="text-gray-600 mt-1">Manage API credentials and application preferences</p>
      </div>

      {/* Save Status Banner */}
      {saveStatus && (
        <div className={`rounded-xl p-4 ${
          saveStatus === 'saved' ? 'bg-green-50 border border-green-200' :
          saveStatus === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {saveStatus === 'saved' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {saveStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
            {saveStatus === 'saving' && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            )}
            <span className={`font-medium ${
              saveStatus === 'saved' ? 'text-green-900' :
              saveStatus === 'error' ? 'text-red-900' :
              'text-blue-900'
            }`}>
              {saveStatus === 'saved' && 'Settings saved successfully'}
              {saveStatus === 'error' && 'Failed to save settings'}
              {saveStatus === 'saving' && 'Saving settings...'}
            </span>
          </div>
        </div>
      )}

      {/* CMS API Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">CMS Prior Authorization API</h3>
            </div>
            <button
              onClick={() => updateCMSField('enabled', !config.cmsApi.enabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.cmsApi.enabled ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  config.cmsApi.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {config.cmsApi.enabled && (
            <p className="text-sm text-gray-600 mt-2">
              Connect to CMS API for real-time prior authorization status
            </p>
          )}
          {!config.cmsApi.enabled && (
            <p className="text-sm text-gray-500 mt-2">
              Enable to use real CMS API (currently using demo data)
            </p>
          )}
        </div>

        {config.cmsApi.enabled && (
          <div className="p-6 space-y-4">
            {/* Status Indicator */}
            <div className={`p-4 rounded-lg border-2 ${
              isConfigured
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                {isConfigured ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">CMS API Configured</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-900">Configuration Required</span>
                  </>
                )}
              </div>
            </div>

            {/* API Base URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Base URL
              </label>
              <input
                type="text"
                value={config.cmsApi.baseUrl}
                onChange={(e) => updateCMSField('baseUrl', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://api.cms.gov/fhir/v1"
              />
              <p className="text-xs text-gray-500 mt-1">Default CMS FHIR API endpoint</p>
            </div>

            {/* Token URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OAuth Token URL
              </label>
              <input
                type="text"
                value={config.cmsApi.tokenUrl}
                onChange={(e) => updateCMSField('tokenUrl', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://api.cms.gov/oauth2/token"
              />
              <p className="text-xs text-gray-500 mt-1">OAuth 2.0 token endpoint</p>
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={config.cmsApi.clientId}
                onChange={(e) => updateCMSField('clientId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                placeholder="your-client-id-here"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get from CMS Developer Portal
              </p>
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Secret
              </label>
              <div className="relative">
                <input
                  type={showClientSecret ? 'text' : 'password'}
                  value={config.cmsApi.clientSecret}
                  onChange={(e) => updateCMSField('clientSecret', e.target.value)}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
                  placeholder="your-client-secret-here"
                />
                <button
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                >
                  {showClientSecret ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Keep this secret! Never share or commit to version control
              </p>
            </div>

            {/* Validation Message */}
            {validationMessage && (
              <div className={`p-3 rounded-lg border ${
                validationMessage.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}>
                <p className="text-sm">{validationMessage.text}</p>
              </div>
            )}

            {/* Get Credentials Link */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Don't have CMS API credentials yet?</p>
                  <p className="text-blue-700 mb-2">
                    Register for free access at the CMS Developer Portal
                  </p>
                  <a
                    href="https://www.cms.gov/apis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Get CMS API Credentials
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Privacy & Security</p>
            <p className="text-gray-600">
              All settings are stored locally in your browser (localStorage). API credentials are never
              sent to our servers. CMS API calls are made directly from your browser to CMS.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
