import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, AlertCircle, Loader2, Building2 } from 'lucide-react'
import { handleSmartCallback } from '../services/smartAuth'
import { fetchPatientData } from '../services/fhirClient'
import { fhirResourcesToParsedData } from '../parsers/fhirSmartParser'
import { useData } from '../context/DataContext'

/**
 * FHIRCallback — Handles the OAuth2 redirect from the EHR after the patient
 * signs in. Exchanges the authorization code for an access token, fetches
 * all FHIR resources, and injects them into DataContext as a new source.
 */
export default function FHIRCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addFHIRSource } = useData()

  const [phase, setPhase] = useState('exchanging') // exchanging | fetching | done | error
  const [status, setStatus] = useState('Exchanging authorization code...')
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [endpointName, setEndpointName] = useState('')

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        // Step 1: Exchange code for token
        setPhase('exchanging')
        setStatus('Verifying with your hospital...')
        const authResult = await handleSmartCallback(searchParams)
        if (cancelled) return

        setEndpointName(authResult.endpointName)
        setPhase('fetching')
        setStatus(`Connected to ${authResult.endpointName} — fetching your records...`)

        // Step 2: Fetch all FHIR resources
        const fhirData = await fetchPatientData(
          authResult.fhirBase,
          authResult.accessToken,
          authResult.patientId
        )
        if (cancelled) return

        setStatus('Parsing and organizing your health data...')

        // Step 3: Convert to app data model
        const parsedData = fhirResourcesToParsedData(fhirData, authResult.endpointName)

        // Step 4: Add as a data source
        await addFHIRSource(parsedData, authResult)
        if (cancelled) return

        setStats(parsedData.stats)
        setPhase('done')
        setStatus('Your records are ready!')

        // Auto-redirect to dashboard after a short pause
        setTimeout(() => {
          if (!cancelled) navigate('/dashboard')
        }, 2500)
      } catch (err) {
        if (!cancelled) {
          setPhase('error')
          setError(err.message || 'An unexpected error occurred.')
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          {phase === 'done' ? (
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl animate-bounce-once">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          ) : phase === 'error' ? (
            <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-xl">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {phase === 'done' ? 'Records Synced!' : phase === 'error' ? 'Connection Failed' : 'Connecting...'}
          </h1>
          {endpointName && phase !== 'error' && (
            <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> {endpointName}
            </p>
          )}
        </div>

        {/* Status message */}
        <p className="text-sm text-gray-600">{phase === 'error' ? error : status}</p>

        {/* Record counts on success */}
        {phase === 'done' && stats && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Conditions', value: stats.conditionCount },
              { label: 'Medications', value: stats.medicationCount },
              { label: 'Lab Results', value: stats.resultCount },
              { label: 'Encounters', value: stats.encounterCount },
              { label: 'Procedures', value: stats.procedureCount },
              { label: 'Immunizations', value: stats.immunizationCount },
            ].map(({ label, value }) => (
              <div key={label} className="bg-blue-50 rounded-xl py-3 px-2">
                <p className="text-xl font-bold text-blue-700">{value}</p>
                <p className="text-[10px] text-blue-600 font-medium">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Error: retry / go home */}
        {phase === 'error' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Try Again
            </button>
            <p className="text-xs text-gray-400">
              If this keeps happening, check that your FHIR client ID is registered with your hospital's app directory.
            </p>
          </div>
        )}

        {/* Success: loading indicator */}
        {phase === 'done' && (
          <p className="text-xs text-gray-400">Taking you to your dashboard...</p>
        )}
      </div>
    </div>
  )
}
