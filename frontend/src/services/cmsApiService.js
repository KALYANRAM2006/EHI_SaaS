/**
 * CMS Prior Authorization API Service
 *
 * Integrates with CMS Interoperability and Prior Authorization Final Rule API
 * Enables real-time prior authorization status checks and submissions.
 *
 * API Documentation: https://www.cms.gov/regulations-and-guidance/guidance/interoperability
 * Standard: FHIR R4 (HL7 Fast Healthcare Interoperability Resources)
 */

/**
 * CMS API Configuration
 */
const CMS_API_CONFIG = {
  // Base URL for CMS Prior Authorization API (FHIR endpoint)
  baseUrl: import.meta.env.VITE_CMS_API_URL || 'https://api.cms.gov/fhir/v1',

  // OAuth 2.0 token endpoint
  tokenUrl: import.meta.env.VITE_CMS_TOKEN_URL || 'https://api.cms.gov/oauth2/token',

  // Client credentials (store in .env file)
  clientId: import.meta.env.VITE_CMS_CLIENT_ID,
  clientSecret: import.meta.env.VITE_CMS_CLIENT_SECRET,

  // API version
  version: 'v1',

  // Timeout for API requests (30 seconds)
  timeout: 30000,
}

/**
 * Prior Authorization Status Codes (per CMS specification)
 */
export const PA_STATUS = {
  PENDING: 'pending',           // Under review
  APPROVED: 'approved',         // Approved
  DENIED: 'denied',             // Denied
  CANCELLED: 'cancelled',       // Cancelled by requester
  EXPIRED: 'expired',           // Expired (not decided in time)
  NEEDS_INFO: 'needs-info',     // Additional information required
}

/**
 * Get OAuth 2.0 access token from CMS
 */
async function getAccessToken() {
  try {
    const response = await fetch(CMS_API_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CMS_API_CONFIG.clientId,
        client_secret: CMS_API_CONFIG.clientSecret,
        scope: 'patient/ServiceRequest.read patient/ServiceRequest.write',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`)
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('[CMS API] Token error:', error)
    throw error
  }
}

/**
 * Check prior authorization status
 *
 * @param {string} authId - Prior authorization ID
 * @returns {Promise<Object>} Authorization status details
 */
export async function checkPriorAuthStatus(authId) {
  try {
    const token = await getAccessToken()

    const response = await fetch(
      `${CMS_API_CONFIG.baseUrl}/ServiceRequest/${authId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json',
        },
        signal: AbortSignal.timeout(CMS_API_CONFIG.timeout),
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Prior authorization not found')
      }
      throw new Error(`API error: ${response.statusText}`)
    }

    const fhirResource = await response.json()

    // Transform FHIR ServiceRequest to our format
    return transformFHIRServiceRequest(fhirResource)
  } catch (error) {
    console.error('[CMS API] Check status error:', error)
    throw error
  }
}

/**
 * Submit new prior authorization request
 *
 * @param {Object} request - Prior auth request details
 * @returns {Promise<Object>} Created authorization
 */
export async function submitPriorAuthRequest(request) {
  try {
    const token = await getAccessToken()

    // Build FHIR ServiceRequest resource
    const fhirRequest = buildFHIRServiceRequest(request)

    const response = await fetch(
      `${CMS_API_CONFIG.baseUrl}/ServiceRequest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json',
        },
        body: JSON.stringify(fhirRequest),
        signal: AbortSignal.timeout(CMS_API_CONFIG.timeout),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to submit request: ${response.statusText}`)
    }

    const created = await response.json()
    return transformFHIRServiceRequest(created)
  } catch (error) {
    console.error('[CMS API] Submit request error:', error)
    throw error
  }
}

/**
 * Get all prior authorizations for a patient
 *
 * @param {string} patientId - Patient identifier
 * @returns {Promise<Array>} List of prior authorizations
 */
export async function getPatientPriorAuths(patientId) {
  try {
    const token = await getAccessToken()

    const response = await fetch(
      `${CMS_API_CONFIG.baseUrl}/ServiceRequest?patient=${patientId}&category=prior-auth`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/fhir+json',
        },
        signal: AbortSignal.timeout(CMS_API_CONFIG.timeout),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch prior auths: ${response.statusText}`)
    }

    const bundle = await response.json()

    // Extract ServiceRequest entries from FHIR Bundle
    if (bundle.resourceType === 'Bundle' && bundle.entry) {
      return bundle.entry.map(entry => transformFHIRServiceRequest(entry.resource))
    }

    return []
  } catch (error) {
    console.error('[CMS API] Get patient prior auths error:', error)
    throw error
  }
}

/**
 * Cancel prior authorization request
 *
 * @param {string} authId - Prior authorization ID
 * @returns {Promise<Object>} Updated authorization
 */
export async function cancelPriorAuth(authId) {
  try {
    const token = await getAccessToken()

    // Get current resource
    const current = await checkPriorAuthStatus(authId)

    // Update status to cancelled
    const fhirRequest = buildFHIRServiceRequest({
      ...current,
      status: PA_STATUS.CANCELLED,
    })

    const response = await fetch(
      `${CMS_API_CONFIG.baseUrl}/ServiceRequest/${authId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json',
        },
        body: JSON.stringify(fhirRequest),
        signal: AbortSignal.timeout(CMS_API_CONFIG.timeout),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to cancel: ${response.statusText}`)
    }

    const updated = await response.json()
    return transformFHIRServiceRequest(updated)
  } catch (error) {
    console.error('[CMS API] Cancel prior auth error:', error)
    throw error
  }
}

/**
 * Transform FHIR ServiceRequest to our internal format
 */
function transformFHIRServiceRequest(fhirResource) {
  return {
    id: fhirResource.id,
    status: fhirResource.status,
    service: fhirResource.code?.text || 'Unknown Service',
    serviceCode: fhirResource.code?.coding?.[0]?.code,
    requestDate: fhirResource.authoredOn,
    reviewDate: fhirResource.occurrenceDateTime,
    reviewedBy: fhirResource.performer?.[0]?.display || 'CMS',
    reason: fhirResource.reasonCode?.[0]?.text || fhirResource.reasonReference?.[0]?.display,
    diagnosis: fhirResource.reasonCode?.[0]?.coding?.[0]?.display,
    notes: fhirResource.note?.[0]?.text,
    requester: fhirResource.requester?.display,
    priority: fhirResource.priority || 'routine',
    patientId: fhirResource.subject?.reference?.split('/')?.[1],
  }
}

/**
 * Build FHIR ServiceRequest from our internal format
 */
function buildFHIRServiceRequest(request) {
  return {
    resourceType: 'ServiceRequest',
    id: request.id,
    status: request.status || PA_STATUS.PENDING,
    intent: 'order',
    category: [{
      coding: [{
        system: 'http://hl7.org/fhir/us/davinci-pas/CodeSystem/PASSupportingInfoType',
        code: 'prior-auth',
        display: 'Prior Authorization',
      }],
    }],
    code: {
      coding: [{
        system: 'http://www.ama-assn.org/go/cpt',
        code: request.serviceCode,
        display: request.service,
      }],
      text: request.service,
    },
    subject: {
      reference: `Patient/${request.patientId}`,
    },
    authoredOn: request.requestDate || new Date().toISOString(),
    requester: {
      display: request.requester || 'Provider',
    },
    reasonCode: request.diagnosis ? [{
      coding: [{
        system: 'http://hl7.org/fhir/sid/icd-10',
        code: request.diagnosisCode,
        display: request.diagnosis,
      }],
      text: request.diagnosis,
    }] : undefined,
    note: request.notes ? [{
      text: request.notes,
    }] : undefined,
    priority: request.priority || 'routine',
  }
}

/**
 * Check if CMS API is configured
 */
export function isCMSApiConfigured() {
  return !!(CMS_API_CONFIG.clientId && CMS_API_CONFIG.clientSecret)
}

/**
 * Get API configuration status
 */
export function getCMSApiStatus() {
  return {
    configured: isCMSApiConfigured(),
    baseUrl: CMS_API_CONFIG.baseUrl,
    hasCredentials: !!(CMS_API_CONFIG.clientId && CMS_API_CONFIG.clientSecret),
    version: CMS_API_CONFIG.version,
  }
}

/**
 * Mock data for development/testing (when API credentials not available)
 */
export function getMockPriorAuths() {
  return [
    {
      id: 'PA-2024-001',
      status: PA_STATUS.APPROVED,
      service: 'MRI - Brain with contrast',
      serviceCode: '70553',
      requestDate: '2024-03-15',
      reviewDate: '2024-03-16',
      reviewedBy: 'CMS Medicare',
      reason: 'Chronic headaches, rule out mass',
      diagnosis: 'R51 - Headache',
      notes: 'Approved for 1 scan',
      requester: 'Dr. Smith',
      priority: 'routine',
    },
    {
      id: 'PA-2024-002',
      status: PA_STATUS.PENDING,
      service: 'Physical therapy - 12 sessions',
      serviceCode: '97110',
      requestDate: '2024-03-20',
      reviewDate: null,
      reviewedBy: null,
      reason: 'Post-surgical knee rehabilitation',
      diagnosis: 'M25.561 - Pain in right knee',
      notes: 'Awaiting review',
      requester: 'Dr. Johnson',
      priority: 'routine',
    },
    {
      id: 'PA-2024-003',
      status: PA_STATUS.NEEDS_INFO,
      service: 'Humira (adalimumab) - 40mg/0.8mL',
      serviceCode: 'J0135',
      requestDate: '2024-03-18',
      reviewDate: '2024-03-19',
      reviewedBy: 'CMS Medicare',
      reason: 'Rheumatoid arthritis treatment',
      diagnosis: 'M06.9 - Rheumatoid arthritis',
      notes: 'Need recent lab results showing RA factor',
      requester: 'Dr. Williams',
      priority: 'urgent',
    },
  ]
}
