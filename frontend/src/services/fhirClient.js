/**
 * FHIR R4 API Client
 * Fetches all clinically relevant resources for a patient after SMART auth.
 */

/** GET a FHIR resource or bundle with proper headers. */
async function fhirGet(fhirBase, path, accessToken) {
  const url = `${fhirBase.replace(/\/$/, '')}/${path}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/fhir+json',
    },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`FHIR request failed: ${res.status} ${url}`)
  return res.json()
}

/** Extract all entries from a FHIR Bundle (follows next pages). */
async function getAllBundleEntries(fhirBase, path, accessToken, maxPages = 10) {
  const entries = []
  let nextUrl = `${fhirBase.replace(/\/$/, '')}/${path}`
  let page = 0

  while (nextUrl && page < maxPages) {
    const res = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    })
    if (!res.ok) break
    const bundle = await res.json()
    if (bundle.entry) entries.push(...bundle.entry.map(e => e.resource))
    const nextLink = (bundle.link || []).find(l => l.relation === 'next')
    nextUrl = nextLink ? nextLink.url : null
    page++
  }
  return entries
}

/**
 * Fetch all clinical data for a patient.
 * Returns a structured object that fhirSmartParser can convert to parsedData.
 */
export async function fetchPatientData(fhirBase, accessToken, patientId) {
  const onProgress = (msg) => console.log(`[FHIR] ${msg}`)

  // Resolve patient ID if not provided in token response
  let pid = patientId
  if (!pid) {
    onProgress('Resolving patient identity...')
    const pt = await fhirGet(fhirBase, 'Patient?_count=1', accessToken)
    pid = pt?.entry?.[0]?.resource?.id
    if (!pid) throw new Error('Could not determine patient ID from FHIR server.')
  }

  onProgress(`Fetching records for patient ${pid}...`)

  // Run all resource fetches in parallel for speed
  const [
    patientResource,
    conditions,
    medications,
    allergies,
    observations,
    encounters,
    procedures,
    immunizations,
    diagnosticReports,
    documentReferences,
    carePlans,
  ] = await Promise.allSettled([
    fhirGet(fhirBase, `Patient/${pid}`, accessToken),
    getAllBundleEntries(fhirBase, `Condition?patient=${pid}&_count=100`, accessToken),
    getAllBundleEntries(fhirBase, `MedicationRequest?patient=${pid}&_count=100`, accessToken),
    getAllBundleEntries(fhirBase, `AllergyIntolerance?patient=${pid}&_count=100`, accessToken),
    getAllBundleEntries(fhirBase, `Observation?patient=${pid}&_count=200&_sort=-date`, accessToken),
    getAllBundleEntries(fhirBase, `Encounter?patient=${pid}&_count=100&_sort=-date`, accessToken),
    getAllBundleEntries(fhirBase, `Procedure?patient=${pid}&_count=100`, accessToken),
    getAllBundleEntries(fhirBase, `Immunization?patient=${pid}&_count=100`, accessToken),
    getAllBundleEntries(fhirBase, `DiagnosticReport?patient=${pid}&_count=100`, accessToken),
    getAllBundleEntries(fhirBase, `DocumentReference?patient=${pid}&_count=50`, accessToken),
    getAllBundleEntries(fhirBase, `CarePlan?patient=${pid}&_count=50`, accessToken),
  ])

  const safe = (result) => (result.status === 'fulfilled' ? result.value : [])

  return {
    patient: safe(patientResource),
    conditions: safe(conditions),
    medications: safe(medications),
    allergies: safe(allergies),
    observations: safe(observations),
    encounters: safe(encounters),
    procedures: safe(procedures),
    immunizations: safe(immunizations),
    diagnosticReports: safe(diagnosticReports),
    documentReferences: safe(documentReferences),
    carePlans: safe(carePlans),
  }
}
