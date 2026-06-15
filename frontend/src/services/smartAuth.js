/**
 * SMART on FHIR Authorization Service
 * Implements the PKCE (Proof Key for Code Exchange) OAuth2 flow for
 * public clients (no client secret). This is the standard for patient-
 * facing SMART apps running in a browser.
 *
 * Spec: https://hl7.org/fhir/smart-app-launch/
 * PKCE: https://tools.ietf.org/html/rfc7636
 */

const STORAGE_KEY = 'clinquilt_smart_state'

// ─────────────────────────────────────────────────────────────────────────────
// PKCE Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a cryptographically random code verifier (43-128 chars). */
function generateCodeVerifier() {
  const array = new Uint8Array(48)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/** Derive code challenge from verifier using SHA-256. */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

/** Base64-URL encode a Uint8Array (no padding, URL-safe chars). */
function base64UrlEncode(bytes) {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/** Generate a random state parameter to prevent CSRF. */
function generateState() {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch SMART configuration from the FHIR server's well-known endpoint.
 * Falls back to manually specified authUrl/tokenUrl if discovery fails.
 */
export async function discoverSmartConfig(endpoint) {
  // If already have authUrl/tokenUrl, use them directly
  if (endpoint.authUrl && endpoint.tokenUrl) {
    return { authorization_endpoint: endpoint.authUrl, token_endpoint: endpoint.tokenUrl }
  }

  const discoveryUrl = `${endpoint.fhirBase.replace(/\/$/, '')}/.well-known/smart-configuration`
  try {
    const res = await fetch(discoveryUrl, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`Discovery returned ${res.status}`)
    return await res.json()
  } catch (err) {
    throw new Error(
      `Could not discover SMART configuration for ${endpoint.name}. ` +
      `Ensure the FHIR base URL is correct and the server supports SMART on FHIR. ` +
      `(${err.message})`
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Authorization — Step 1: Redirect to EHR login
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initiate SMART on FHIR authorization.
 * Stores PKCE state in sessionStorage, then redirects the browser to the EHR.
 */
export async function initiateSmartAuth(endpoint, clientId) {
  const smartConfig = await discoverSmartConfig(endpoint)

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateState()

  const redirectUri = `${window.location.origin}/fhir-callback`

  // Persist state in localStorage (survives navigation away to Epic and back)
  const smartState = {
    codeVerifier,
    state,
    endpoint: {
      id: endpoint.id,
      name: endpoint.name,
      fhirBase: endpoint.fhirBase,
      system: endpoint.system,
    },
    clientId,
    redirectUri,
    tokenUrl: smartConfig.token_endpoint,
    useServerProxy: endpoint.useServerProxy || false,
    proxyEnv: endpoint.proxyEnv || 'sandbox',
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(smartState))

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: endpoint.scopes || 'openid fhirUser patient/*.read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    aud: endpoint.fhirBase,
  })

  const authUrl = `${smartConfig.authorization_endpoint}?${params.toString()}`
  window.location.href = authUrl
}

// ─────────────────────────────────────────────────────────────────────────────
// Callback — Step 2: Exchange code for access token
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle the OAuth2 callback. Call this from the /fhir-callback page.
 * Returns { accessToken, patient, fhirBase, endpointName, endpoint }
 */
export async function handleSmartCallback(searchParams) {
  const code = searchParams.get('code')
  const returnedState = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  if (error) {
    throw new Error(`Authorization denied: ${error}. ${errorDesc || ''}`)
  }
  if (!code) {
    throw new Error('No authorization code received from the EHR.')
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    throw new Error('No pending SMART authorization found. Please try connecting again.')
  }

  const smartState = JSON.parse(stored)

  if (smartState.state !== returnedState) {
    throw new Error('State mismatch — possible CSRF attack. Connection aborted.')
  }

  // Exchange authorization code for access token
  // For confidential clients (useServerProxy), route through Azure Function
  // so the client secret never touches the browser.
  let tokenData
  if (smartState.useServerProxy) {
    const proxyRes = await fetch('/api/kp-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirect_uri: smartState.redirectUri,
        env: smartState.proxyEnv || 'sandbox',
      }),
    })
    if (!proxyRes.ok) {
      const body = await proxyRes.text()
      throw new Error(`KP token exchange failed (${proxyRes.status}): ${body}`)
    }
    tokenData = await proxyRes.json()
  } else {
    const tokenRes = await fetch(smartState.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: smartState.redirectUri,
        client_id: smartState.clientId,
        code_verifier: smartState.codeVerifier,
      }),
    })
    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      throw new Error(`Token exchange failed (${tokenRes.status}): ${body}`)
    }
    tokenData = await tokenRes.json()
  }
  localStorage.removeItem(STORAGE_KEY) // clean up

  return {
    accessToken: tokenData.access_token,
    patientId: tokenData.patient, // EHR-returned patient context ID
    fhirBase: smartState.endpoint.fhirBase,
    endpointName: smartState.endpoint.name,
    endpointSystem: smartState.endpoint.system,
    endpoint: smartState.endpoint,
    expiresAt: tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : null,
  }
}
