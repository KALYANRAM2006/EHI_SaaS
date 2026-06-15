/**
 * Azure Function: /api/kp-token
 *
 * Securely exchanges a KP OAuth authorization code for an access token.
 * The client secret never leaves this server-side function.
 *
 * Environment variables (set in Azure Static Web Apps → Configuration):
 *   KP_SANDBOX_CLIENT_ID     = kpx_cms_sb_...
 *   KP_SANDBOX_CLIENT_SECRET = (the secret from KP developer portal)
 *   KP_SANDBOX_TOKEN_URL     = KP sandbox OAuth token endpoint
 *   KP_PROD_CLIENT_ID        = (production client ID when approved)
 *   KP_PROD_CLIENT_SECRET    = (production secret when approved)
 *   KP_PROD_TOKEN_URL        = KP production OAuth token endpoint
 */

const https = require('https')
const { URL, URLSearchParams } = require('url')

// Allowed origins — only requests from the deployed app are accepted
const ALLOWED_ORIGINS = [
  'https://mango-wave-02e8cfe10.2.azurestaticapps.net',
  'http://localhost:5173',
  'http://localhost:4280', // SWA local emulator
]

module.exports = async function (context, req) {
  const origin = req.headers['origin'] || ''

  // CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    }
    return
  }

  // Validate origin
  if (!ALLOWED_ORIGINS.includes(origin)) {
    context.res = { status: 403, body: 'Forbidden' }
    return
  }

  const { code, redirect_uri, env = 'sandbox' } = req.body || {}

  if (!code || !redirect_uri) {
    context.res = { status: 400, body: JSON.stringify({ error: 'Missing code or redirect_uri' }) }
    return
  }

  // Select credentials based on env
  const isSandbox = env !== 'production'
  const clientId     = isSandbox ? process.env.KP_SANDBOX_CLIENT_ID     : process.env.KP_PROD_CLIENT_ID
  const clientSecret = isSandbox ? process.env.KP_SANDBOX_CLIENT_SECRET : process.env.KP_PROD_CLIENT_SECRET
  const tokenUrl     = isSandbox ? process.env.KP_SANDBOX_TOKEN_URL     : process.env.KP_PROD_TOKEN_URL

  if (!clientId || !clientSecret || !tokenUrl) {
    context.res = {
      status: 503,
      body: JSON.stringify({ error: `KP ${env} credentials not configured on server` }),
    }
    return
  }

  // Exchange code for token
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    client_id: clientId,
    client_secret: clientSecret,
  }).toString()

  try {
    const tokenResponse = await httpPost(tokenUrl, body)
    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
      },
      body: JSON.stringify(tokenResponse),
    }
  } catch (err) {
    context.log.error('KP token exchange failed:', err.message)
    context.res = {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': origin },
      body: JSON.stringify({ error: 'Token exchange failed', detail: err.message }),
    }
  }
}

/** Make an HTTPS POST with application/x-www-form-urlencoded body */
function httpPost(urlStr, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr)
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        Accept: 'application/json',
      },
    }
    const reqOut = https.request(options, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (res.statusCode >= 400) reject(new Error(json.error_description || json.error || `HTTP ${res.statusCode}`))
          else resolve(json)
        } catch {
          reject(new Error(`Non-JSON response: ${data.slice(0, 200)}`))
        }
      })
    })
    reqOut.on('error', reject)
    reqOut.write(body)
    reqOut.end()
  })
}
