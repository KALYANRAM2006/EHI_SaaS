/**
 * Azure Function: /api/kp-provider
 *
 * Proxies read-only queries to the Kaiser Permanente Provider Directory &
 * Formulary API (Open — no auth required, but no CORS headers on the origin).
 *
 * KP endpoint: https://kpx-service-bus.kp.org/service/hp/mhpo/healthplanproviderv1rc
 *
 * Usage:
 *   GET /api/kp-provider?resource=Practitioner&name=Smith&_count=20
 *   GET /api/kp-provider?resource=InsurancePlan&name=Gold&_count=20
 *   GET /api/kp-provider?resource=MedicationKnowledge&code:text=metformin&_count=20
 *   GET /api/kp-provider?resource=Organization&name=Kaiser&_count=20
 *   GET /api/kp-provider?resource=Location&city=Oakland&_count=20
 */

const https = require('https')
const { URL } = require('url')

const KP_PROVIDER_BASE = 'https://kpx-service-bus.kp.org/service/hp/mhpo/healthplanproviderv1rc'

// Whitelist — only read-only FHIR resources exposed
const ALLOWED_RESOURCES = new Set([
  'Practitioner',
  'PractitionerRole',
  'Organization',
  'OrganizationAffiliation',
  'Location',
  'HealthcareService',
  'InsurancePlan',
  'MedicationKnowledge',
  'List',
])

// Query params forwarded as-is to KP (block anything non-FHIR)
const ALLOWED_PARAMS = new Set([
  'name', 'family', 'given', 'identifier',
  'specialty', 'location', 'organization', 'practitioner',
  'city', 'state', 'address', 'address-city', 'address-state', 'address-postalcode',
  'type', 'status', 'active',
  'code', 'code:text', 'formulary-coverage', 'coverage-area',
  '_count', '_offset', '_sort', '_summary', '_id',
])

const ALLOWED_ORIGINS = [
  'https://mango-wave-02e8cfe10.2.azurestaticapps.net',
  'http://localhost:5173',
  'http://localhost:4280',
]

module.exports = async function (context, req) {
  const origin = req.headers['origin'] || ''
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }

  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: corsHeaders, body: '' }
    return
  }

  const query = req.query || {}
  const resource = query.resource

  if (!resource || !ALLOWED_RESOURCES.has(resource)) {
    context.res = {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Invalid or missing resource. Allowed: ${[...ALLOWED_RESOURCES].join(', ')}` }),
    }
    return
  }

  // Build the KP FHIR query URL — only forward whitelisted params
  const kpUrl = new URL(`${KP_PROVIDER_BASE}/${resource}`)
  kpUrl.searchParams.set('_format', 'json')

  for (const [key, val] of Object.entries(query)) {
    if (key === 'resource') continue
    if (!ALLOWED_PARAMS.has(key)) continue
    kpUrl.searchParams.set(key, val)
  }

  try {
    const body = await fetchJson(kpUrl.toString())
    context.res = {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/fhir+json' },
      body: JSON.stringify(body),
    }
  } catch (err) {
    context.log.error('kp-provider proxy error:', err.message)
    context.res = {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Upstream KP request failed', detail: err.message }),
    }
  }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Accept': 'application/fhir+json',
        'User-Agent': 'ClinQuilt/1.0 (Azure Function proxy)',
      },
    }
    https.get(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error(`Invalid JSON from KP (status ${res.statusCode})`))
        }
      })
    }).on('error', reject)
  })
}
