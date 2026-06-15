/**
 * FHIR R4 SMART on FHIR endpoint registry
 * Covers Epic, Cerner, Allscripts, and other major EHR vendors.
 * Each entry has a known fhirBase — the app will auto-discover
 * auth/token URLs via /.well-known/smart-configuration.
 *
 * To add your hospital: find its FHIR base URL in the Epic App Orchard
 * endpoint list (https://open.epic.com/MyApps/Endpoints) or ask your
 * hospital's IT department for the "FHIR R4 base URL".
 */

export const EHR_VENDORS = {
  EPIC: 'Epic',
  CERNER: 'Cerner (Oracle Health)',
  ALLSCRIPTS: 'Allscripts',
  MEDITECH: 'MEDITECH',
  ATHENA: 'athenahealth',
  CUSTOM: 'Custom / Unknown',
}

export const FHIR_ENDPOINTS = [
  // ─────────────────────────────────────────────────────────────────────────
  // EPIC SANDBOX (use for testing without registering an app)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'epic-sandbox',
    name: 'Epic Sandbox (Test)',
    system: EHR_VENDORS.EPIC,
    state: 'N/A',
    logo: '🧪',
    category: 'sandbox',
    fhirBase: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
    authUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
    tokenUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
    // ClinQuilt registered non-production client ID from open.epic.com
    defaultClientId: 'ca1294a3-a413-4d0e-a293-d48cbf74e326',
    scopes: 'openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Encounter.read patient/Procedure.read patient/DiagnosticReport.read patient/Immunization.read patient/DocumentReference.read',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // KP PATIENT ACCESS API SANDBOX (CMS / EOB claims data — confidential client)
  // Auth is handled via /api/kp-token Azure Function (secret never in browser).
  // Token URL is TBD — update KP_SANDBOX_TOKEN_URL env var once known.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'kp-cms-sandbox',
    name: 'Kaiser Permanente (CMS Sandbox)',
    system: 'Kaiser Permanente',
    state: 'All regions',
    logo: '🧪',
    category: 'sandbox',
    fhirBase: 'https://kpx-service-bus.kp.org/service/cdo/siae/healthplankpxv1rc/FHIR/api',
    // authUrl is discovered from KP dev portal — set to KPPolarisPortal as placeholder
    // until KP provides their CMS API auth URL
    authUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/326/oauth2/authorize',
    tokenUrl: '__KP_SANDBOX_TOKEN_URL__', // replaced by Azure Function
    defaultClientId: 'kpx_cms_sb_da71daf9-5976-4e56-a35e-45f386dcb4c5',
    // Token exchange is done server-side via /api/kp-token
    useServerProxy: true,
    proxyEnv: 'sandbox',
    scopes: 'openid fhirUser patient/Patient.read patient/ExplanationOfBenefit.read patient/Coverage.read',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TOP US HEALTH SYSTEMS — EPIC
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'mayo-clinic',
    name: 'Mayo Clinic',
    system: EHR_VENDORS.EPIC,
    state: 'MN / AZ / FL',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir.mayoclinic.org/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'kaiser-ncal',
    name: 'Kaiser Permanente - Northern California',
    system: EHR_VENDORS.EPIC,
    state: 'CA (North)',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir.kp.org/service/ptnt_care/EpicEdiFhirRoutingSvc/v2014/esb-envlbl/312/api/FHIR/R4',
    authUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/326/oauth2/authorize',
    tokenUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/326/oauth2/token',
    scopes: 'openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Encounter.read patient/Procedure.read patient/DiagnosticReport.read patient/Immunization.read patient/DocumentReference.read',
  },
  {
    id: 'kaiser-scal',
    name: 'Kaiser Permanente - Southern California',
    system: EHR_VENDORS.EPIC,
    state: 'CA (South)',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir.kp.org/service/ptnt_care/EpicEdiFhirRoutingSvc/v2014/esb-envlbl/226/api/FHIR/R4',
    authUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/226/oauth2/authorize',
    tokenUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/226/oauth2/token',
    scopes: 'openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Encounter.read patient/Procedure.read patient/DiagnosticReport.read patient/Immunization.read patient/DocumentReference.read',
  },
  {
    id: 'kaiser-wa',
    name: 'Kaiser Permanente - Washington',
    system: EHR_VENDORS.EPIC,
    state: 'WA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir.kp.org/Interconnect-FHIR-PRD/api/FHIR/R4',
    authUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/326/oauth2/authorize',
    tokenUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/326/oauth2/token',
    scopes: 'openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Encounter.read patient/Procedure.read patient/DiagnosticReport.read patient/Immunization.read patient/DocumentReference.read',
  },
  {
    id: 'kaiser-midatlantic',
    name: 'Kaiser Permanente - Mid-Atlantic',
    system: EHR_VENDORS.EPIC,
    state: 'MD / VA / DC',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir.kp.org/service/ptnt_care/EpicEdiFhirRoutingSvc/v2014/esb-envlbl/170/api/FHIR/R4',
    authUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/170/oauth2/authorize',
    tokenUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/170/oauth2/token',
    scopes: 'openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Encounter.read patient/Procedure.read patient/DiagnosticReport.read patient/Immunization.read patient/DocumentReference.read',
  },
  {
    id: 'kaiser-nw',
    name: 'Kaiser Permanente - Northwest',
    system: EHR_VENDORS.EPIC,
    state: 'OR / WA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir.kp.org/service/ptnt_care/EpicEdiFhirRoutingSvc/v2014/esb-envlbl/190/api/FHIR/R4',
    authUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/190/oauth2/authorize',
    tokenUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/190/oauth2/token',
    scopes: 'openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Encounter.read patient/Procedure.read patient/DiagnosticReport.read patient/Immunization.read patient/DocumentReference.read',
  },
  {
    id: 'kaiser-co',
    name: 'Kaiser Permanente - Colorado',
    system: EHR_VENDORS.EPIC,
    state: 'CO',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir.kp.org/service/ptnt_care/EpicEdiFhirRoutingSvc/v2014/esb-envlbl/140/api/FHIR/R4',
    authUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/140/oauth2/authorize',
    tokenUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/140/oauth2/token',
    scopes: 'openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Encounter.read patient/Procedure.read patient/DiagnosticReport.read patient/Immunization.read patient/DocumentReference.read',
  },
  {
    id: 'kaiser-ga',
    name: 'Kaiser Permanente - Georgia',
    system: EHR_VENDORS.EPIC,
    state: 'GA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir.kp.org/service/ptnt_care/EpicEdiFhirRoutingSvc/v2014/esb-envlbl/200/api/FHIR/R4',
    authUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/200/oauth2/authorize',
    tokenUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/200/oauth2/token',
    scopes: 'openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Encounter.read patient/Procedure.read patient/DiagnosticReport.read patient/Immunization.read patient/DocumentReference.read',
  },
  {
    id: 'kaiser-hawaii',
    name: 'Kaiser Permanente - Hawaii / Maui Health System',
    system: EHR_VENDORS.EPIC,
    state: 'HI',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir.kp.org/service/ptnt_care/EpicEdiFhirRoutingSvc/v2014/esb-envlbl/130/api/FHIR/R4',
    authUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/130/oauth2/authorize',
    tokenUrl: 'https://fhir.kp.org/KPPolarisPortal/esb-envlbl/130/oauth2/token',
    scopes: 'openid fhirUser patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Encounter.read patient/Procedure.read patient/DiagnosticReport.read patient/Immunization.read patient/DocumentReference.read',
  },
  {
    id: 'cleveland-clinic',
    name: 'Cleveland Clinic',
    system: EHR_VENDORS.EPIC,
    state: 'OH',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://my.clevelandclinic.org/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'johns-hopkins',
    name: 'Johns Hopkins Medicine',
    system: EHR_VENDORS.EPIC,
    state: 'MD',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://epicmobile.johnshopkins.edu/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'mass-general',
    name: 'Mass General Brigham',
    system: EHR_VENDORS.EPIC,
    state: 'MA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mypatientgateway.massgeneralbrigham.org/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'ucla',
    name: 'UCLA Health',
    system: EHR_VENDORS.EPIC,
    state: 'CA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mycare.uclahealth.org/fhir-prd/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'ucsf',
    name: 'UCSF Health',
    system: EHR_VENDORS.EPIC,
    state: 'CA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mypatient.ucsf.edu/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'stanford',
    name: 'Stanford Health Care',
    system: EHR_VENDORS.EPIC,
    state: 'CA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://stanfordhealthcare.org/bin/fhir/r4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'duke',
    name: 'Duke Health',
    system: EHR_VENDORS.EPIC,
    state: 'NC',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mydukehealth.org/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'vanderbilt',
    name: 'Vanderbilt University Medical Center',
    system: EHR_VENDORS.EPIC,
    state: 'TN',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://myhealth.vanderbilt.edu/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'cedars-sinai',
    name: 'Cedars-Sinai',
    system: EHR_VENDORS.EPIC,
    state: 'CA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://cslinkmobile.csmc.edu/fhirproxy/api/FHIR/R4',
    authUrl: 'https://cslinkmobile.csmc.edu/fhirproxy/oauth2/authorize',
    tokenUrl: 'https://cslinkmobile.csmc.edu/fhirproxy/oauth2/token',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'nyu-langone',
    name: 'NYU Langone Health',
    system: EHR_VENDORS.EPIC,
    state: 'NY',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mychartonline.nyumc.org/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'mount-sinai',
    name: 'Mount Sinai Health System',
    system: EHR_VENDORS.EPIC,
    state: 'NY',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mychart.mountsinai.org/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'northwestern',
    name: 'Northwestern Medicine',
    system: EHR_VENDORS.EPIC,
    state: 'IL',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mychart.nm.org/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'uchicago',
    name: 'UChicago Medicine',
    system: EHR_VENDORS.EPIC,
    state: 'IL',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mychartaccess.uchospitals.edu/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'unc',
    name: 'UNC Health',
    system: EHR_VENDORS.EPIC,
    state: 'NC',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mychart.unchealthcare.org/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'emory',
    name: 'Emory Healthcare',
    system: EHR_VENDORS.EPIC,
    state: 'GA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://myhealthatemoryclinic.org/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'intermountain',
    name: 'Intermountain Health',
    system: EHR_VENDORS.EPIC,
    state: 'UT / ID / NV',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://patient.intermountainhealthcare.org/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'providence',
    name: 'Providence Health',
    system: EHR_VENDORS.EPIC,
    state: 'WA / OR / CA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mypalomar.org/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'geisinger',
    name: 'Geisinger Health System',
    system: EHR_VENDORS.EPIC,
    state: 'PA',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://mychart.geisinger.org/MyChart/api/FHIR/R4',
    scopes: 'openid fhirUser patient/*.read',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CERNER (Oracle Health) SYSTEMS
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'cerner-sandbox',
    name: 'Cerner Sandbox (Test)',
    system: EHR_VENDORS.CERNER,
    state: 'N/A',
    logo: '🧪',
    category: 'sandbox',
    fhirBase: 'https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
    authUrl: 'https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/personas/patient/authorize',
    tokenUrl: 'https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/token',
    defaultClientId: 'clinquilt-dev',
    scopes: 'openid profile patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read patient/AllergyIntolerance.read patient/Encounter.read patient/Procedure.read patient/Immunization.read',
  },
  {
    id: 'ascension',
    name: 'Ascension Health',
    system: EHR_VENDORS.CERNER,
    state: 'Multi-state',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir-myrecord.cerner.com/r4/a14114de-eb7e-4f0d-a94f-e3d0a93cd50d',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'commonspirit',
    name: 'CommonSpirit Health',
    system: EHR_VENDORS.CERNER,
    state: 'Multi-state',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir-myrecord.cerner.com/r4/commonspirit',
    scopes: 'openid fhirUser patient/*.read',
  },
  {
    id: 'hca',
    name: 'HCA Healthcare',
    system: EHR_VENDORS.CERNER,
    state: 'Multi-state',
    logo: '🏥',
    category: 'health-system',
    fhirBase: 'https://fhir-myrecord.cerner.com/r4/hca',
    scopes: 'openid fhirUser patient/*.read',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VA / DoD
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'va',
    name: 'VA (Veterans Affairs)',
    system: EHR_VENDORS.EPIC,
    state: 'National',
    logo: '⭐',
    category: 'government',
    fhirBase: 'https://api.va.gov/services/fhir/v0/r4',
    authUrl: 'https://api.va.gov/oauth2/authorization',
    tokenUrl: 'https://api.va.gov/oauth2/token',
    scopes: 'patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read openid profile',
  },
]

/**
 * Search endpoints by name or state (case-insensitive).
 */
export function searchEndpoints(query) {
  if (!query || query.trim().length < 2) return FHIR_ENDPOINTS
  const q = query.toLowerCase()
  return FHIR_ENDPOINTS.filter(ep =>
    ep.name.toLowerCase().includes(q) ||
    ep.state.toLowerCase().includes(q) ||
    ep.system.toLowerCase().includes(q)
  )
}

/**
 * Get the client_id for an endpoint.
 * Sandbox/non-production endpoints use VITE_FHIR_CLIENT_ID_NONPROD.
 * Real hospital (production) endpoints use VITE_FHIR_CLIENT_ID_PROD.
 * Falls back through endpoint.defaultClientId → nonprod → prod → placeholder.
 */
export function getClientId(endpoint) {
  const isSandbox = endpoint.category === 'sandbox'
  const nonprodId = import.meta.env.VITE_FHIR_CLIENT_ID_NONPROD || 'ca1294a3-a413-4d0e-a293-d48cbf74e326'
  const prodId = import.meta.env.VITE_FHIR_CLIENT_ID_PROD || '256a8cd8-6601-48e0-a41a-d9f31e106b59'

  if (endpoint.defaultClientId) return endpoint.defaultClientId
  if (isSandbox) return nonprodId
  return prodId
}
