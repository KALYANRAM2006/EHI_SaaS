/**
 * RedactionPanel - HIPAA Safe Harbor De-identification
 *
 * Provides UI for redacting patient data according to 45 CFR 164.514(b)(2)
 * Removes 18 identifiers while preserving clinical value for sharing/research.
 */

import { useState } from 'react'
import { Shield, Download, AlertTriangle, CheckCircle2, Info, Eye, EyeOff, FileText } from 'lucide-react'
import {
  redactPatientData,
  validateRedaction,
  downloadRedactedData,
  getRedactionSummary,
} from '../services/dataRedactionService'

export default function RedactionPanel({ patientData, onClose }) {
  const [redactedData, setRedactedData] = useState(null)
  const [redacting, setRedacting] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // Debug: Log what we receive
  console.log('[RedactionPanel] Received patientData:', patientData)

  const handleRedact = () => {
    if (!patientData) {
      alert('No patient data available to redact.')
      return
    }

    setRedacting(true)
    try {
      const redacted = redactPatientData(patientData, {
        preserveAge: true,
        preserveYear: true,
        shiftDates: true,
      })
      setRedactedData(redacted)

      // Validate redaction
      const validation = validateRedaction(redacted)
      setValidationResult(validation)
    } catch (error) {
      console.error('[RedactionPanel] Error redacting data:', error)
      alert('Failed to redact data. Please try again.')
    } finally {
      setRedacting(false)
    }
  }

  const handleDownload = () => {
    if (!redactedData) return
    downloadRedactedData(redactedData, 'patient_data_redacted.json')
  }

  const summary = redactedData ? getRedactionSummary(patientData, redactedData) : null

  // Show loading/error state if no patient data
  if (!patientData) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">No Patient Data Available</p>
              <p className="text-amber-700">
                Please load patient data first before using the data redaction feature.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Data Redaction</h3>
            <p className="text-sm text-gray-500">HIPAA Safe Harbor (45 CFR 164.514)</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">What is HIPAA Safe Harbor?</p>
            <p className="text-blue-700">
              De-identification method that removes 18 specific identifiers from health records,
              making them safe to share for research or secondary use without patient consent.
            </p>
          </div>
        </div>
      </div>

      {/* Redaction Status */}
      {!redactedData ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="text-center">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-700 mb-4">
              Ready to de-identify patient data for safe sharing
            </p>
            <button
              onClick={handleRedact}
              disabled={redacting || !patientData}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {redacting ? 'Redacting...' : 'Redact Data'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Validation Results */}
          {validationResult && (
            <div className={`border rounded-xl p-4 ${
              validationResult.valid
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                {validationResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className={`font-semibold ${
                    validationResult.valid ? 'text-green-900' : 'text-amber-900'
                  }`}>
                    {validationResult.valid
                      ? 'De-identification Complete'
                      : 'Validation Warnings'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    validationResult.valid ? 'text-green-700' : 'text-amber-700'
                  }`}>
                    Safety Score: {validationResult.score}/100
                  </p>
                  {validationResult.issues.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {validationResult.issues.map((issue, idx) => (
                        <div key={idx} className="text-xs text-amber-700 flex items-center gap-2">
                          <span>•</span>
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          {summary && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-900">
                  {summary.identifiersRemoved}
                </div>
                <div className="text-sm text-purple-700">Identifiers Removed</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">
                  {summary.fieldsPreserved}
                </div>
                <div className="text-sm text-blue-700">Clinical Fields Preserved</div>
              </div>
            </div>
          )}

          {/* What Was Removed */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Identifiers Removed</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span>Names</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span>Addresses</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span>Phone Numbers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span>Email Addresses</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span>SSN & MRN</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span>Full Dates (year kept)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span>Member IDs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span>Device IDs</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                <strong>Ages over 89</strong> converted to "90+"<br />
                <strong>Dates</strong> shifted by random offset to preserve temporal relationships<br />
                <strong>Geographic</strong> data limited to state level
              </p>
            </div>
          </div>

          {/* Preview Toggle */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-semibold text-gray-900">Preview Redacted Data</p>
                <p className="text-xs text-gray-500">View a sample of the de-identified output</p>
              </div>
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {showPreview ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show
                </>
              )}
            </button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="bg-gray-900 text-gray-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
              <pre>{JSON.stringify(redactedData, null, 2).slice(0, 1000)}...</pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
            >
              <Download className="w-4 h-4" />
              Download Redacted Data
            </button>
            <button
              onClick={() => {
                setRedactedData(null)
                setValidationResult(null)
                setShowPreview(false)
              }}
              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Legal Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-900">
                <p className="font-semibold mb-1">Legal Notice</p>
                <p className="text-amber-700">
                  This tool implements HIPAA Safe Harbor de-identification. While it removes the 18 required
                  identifiers, you are responsible for ensuring no residual identifying information remains.
                  Review the redacted data before sharing. Not suitable for datasets requiring expert determination.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
