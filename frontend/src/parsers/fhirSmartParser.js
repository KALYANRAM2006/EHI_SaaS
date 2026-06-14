/**
 * FHIR R4 → ClinQuilt data model parser
 * Maps FHIR resources returned by fetchPatientData() into the parsedData
 * shape expected by Dashboard, DataContext, and existing components.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function codeText(concept) {
  if (!concept) return ''
  if (concept.text) return concept.text
  if (concept.coding?.[0]?.display) return concept.coding[0].display
  if (concept.coding?.[0]?.code) return concept.coding[0].code
  return ''
}

function codeValue(concept) {
  return concept?.coding?.[0]?.code || ''
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return dateStr.substring(0, 10) // YYYY-MM-DD
}

function humanName(nameArr) {
  if (!nameArr?.length) return ''
  const n = nameArr[0]
  const given = (n.given || []).join(' ')
  const family = n.family || ''
  return `${given} ${family}`.trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient demographics
// ─────────────────────────────────────────────────────────────────────────────

function parsePatient(pt) {
  if (!pt || Array.isArray(pt)) return {}
  const resource = pt.resourceType === 'Patient' ? pt : pt
  const name = humanName(resource.name)
  const parts = name.split(' ')
  const birthDate = formatDate(resource.birthDate)
  const age = birthDate
    ? Math.floor((Date.now() - new Date(birthDate)) / 31557600000)
    : null

  return {
    patId: resource.id || 'fhir-patient',
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    name,
    birthDate,
    age,
    sex: resource.gender || '',
    mrn: resource.identifier?.[0]?.value || resource.id || '',
    address: resource.address?.[0]
      ? [
          resource.address[0].line?.join(' '),
          resource.address[0].city,
          resource.address[0].state,
          resource.address[0].postalCode,
        ]
          .filter(Boolean)
          .join(', ')
      : '',
    phone: resource.telecom?.find(t => t.system === 'phone')?.value || '',
    email: resource.telecom?.find(t => t.system === 'email')?.value || '',
    language: resource.communication?.[0]?.language?.text || '',
    maritalStatus: codeText(resource.maritalStatus),
    race: resource.extension?.find(e => e.url?.includes('race'))?.valueCodeableConcept?.text || '',
    ethnicity: resource.extension?.find(e => e.url?.includes('ethnicity'))?.valueCodeableConcept?.text || '',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Conditions / Diagnoses
// ─────────────────────────────────────────────────────────────────────────────

function parseConditions(conditions) {
  return (conditions || []).map(c => ({
    dx: codeValue(c.code),
    dxName: codeText(c.code),
    contactDate: formatDate(c.onsetDateTime || c.recordedDate || c.onsetPeriod?.start),
    status: c.clinicalStatus?.coding?.[0]?.code || 'unknown',
    category: codeText(c.category?.[0]) || 'problem-list-item',
    severity: codeText(c.severity) || '',
    icd10: c.code?.coding?.find(cd => cd.system?.includes('icd'))?.code || '',
    snomedCode: c.code?.coding?.find(cd => cd.system?.includes('snomed'))?.code || '',
    _fhirId: c.id,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Medications
// ─────────────────────────────────────────────────────────────────────────────

function parseMedications(medRequests) {
  return (medRequests || []).map(m => {
    const name =
      codeText(m.medicationCodeableConcept) ||
      codeText(m.medication?.concept) ||
      m.medicationReference?.display ||
      'Unknown medication'
    return {
      name,
      rxnorm: m.medicationCodeableConcept?.coding?.find(c => c.system?.includes('rxnorm'))?.code || '',
      status: m.status || '',
      intent: m.intent || '',
      startDate: formatDate(m.authoredOn || m.dispenseRequest?.validityPeriod?.start),
      dose: m.dosageInstruction?.[0]?.text || '',
      route: codeText(m.dosageInstruction?.[0]?.route) || '',
      frequency: m.dosageInstruction?.[0]?.timing?.code?.text || '',
      prescriber: m.requester?.display || '',
      _fhirId: m.id,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Allergies
// ─────────────────────────────────────────────────────────────────────────────

function parseAllergies(allergies) {
  return (allergies || []).map(a => ({
    name: codeText(a.code) || a.code?.text || 'Unknown allergen',
    category: (a.category || []).join(', '),
    criticality: a.criticality || '',
    status: a.clinicalStatus?.coding?.[0]?.code || '',
    reactions: (a.reaction || []).map(r => codeText(r.manifestation?.[0])).join(', '),
    onsetDate: formatDate(a.onsetDateTime || a.recordedDate),
    _fhirId: a.id,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Lab Results & Vitals (Observations)
// ─────────────────────────────────────────────────────────────────────────────

function parseObservations(observations) {
  return (observations || []).map(o => {
    const name = codeText(o.code) || 'Unknown'
    const value = o.valueQuantity
      ? `${o.valueQuantity.value} ${o.valueQuantity.unit || ''}`
      : o.valueCodeableConcept
      ? codeText(o.valueCodeableConcept)
      : o.valueString || ''

    const low = o.referenceRange?.[0]?.low?.value
    const high = o.referenceRange?.[0]?.high?.value
    const numVal = parseFloat(o.valueQuantity?.value)
    const isAbnormal =
      o.interpretation?.some(i => {
        const c = i.coding?.[0]?.code
        return c && !['N', 'Normal', 'NEG', 'normal'].includes(c)
      }) ||
      (low !== undefined && numVal < low) ||
      (high !== undefined && numVal > high)

    return {
      name,
      component: name,
      value,
      unit: o.valueQuantity?.unit || '',
      contactDate: formatDate(o.effectiveDateTime || o.issued),
      refRange: o.referenceRange?.[0]
        ? `${low ?? ''}–${high ?? ''}`
        : '',
      isAbnormal: Boolean(isAbnormal),
      status: o.status || '',
      category: codeText(o.category?.[0]) || '',
      loinc: o.code?.coding?.find(c => c.system?.includes('loinc'))?.code || '',
      _fhirId: o.id,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Encounters
// ─────────────────────────────────────────────────────────────────────────────

function parseEncounters(encounters) {
  return (encounters || []).map(e => ({
    type: codeText(e.type?.[0]) || codeText(e.class) || 'Encounter',
    contactDate: formatDate(e.period?.start || e.period?.end),
    endDate: formatDate(e.period?.end),
    status: e.status || '',
    class: e.class?.code || e.class?.display || '',
    provider: e.participant?.[0]?.individual?.display || '',
    location: e.location?.[0]?.location?.display || '',
    department: e.serviceType ? codeText(e.serviceType) : '',
    reasonCode: codeText(e.reasonCode?.[0]) || '',
    _fhirId: e.id,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedures
// ─────────────────────────────────────────────────────────────────────────────

function parseProcedures(procedures) {
  return (procedures || []).map(p => ({
    name: codeText(p.code) || 'Procedure',
    cptCode: p.code?.coding?.find(c => c.system?.includes('cpt'))?.code || '',
    snomedCode: p.code?.coding?.find(c => c.system?.includes('snomed'))?.code || '',
    contactDate: formatDate(p.performedDateTime || p.performedPeriod?.start),
    status: p.status || '',
    performer: p.performer?.[0]?.actor?.display || '',
    location: p.location?.display || '',
    _fhirId: p.id,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Immunizations
// ─────────────────────────────────────────────────────────────────────────────

function parseImmunizations(immunizations) {
  return (immunizations || []).map(i => ({
    name: codeText(i.vaccineCode) || 'Vaccine',
    cvxCode: i.vaccineCode?.coding?.find(c => c.system?.includes('cvx'))?.code || '',
    contactDate: formatDate(i.occurrenceDateTime || i.recorded),
    status: i.status || '',
    dose: i.doseQuantity ? `${i.doseQuantity.value} ${i.doseQuantity.unit || ''}` : '',
    site: codeText(i.site) || '',
    route: codeText(i.route) || '',
    performer: i.performer?.[0]?.actor?.display || '',
    lotNumber: i.lotNumber || '',
    _fhirId: i.id,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic Reports
// ─────────────────────────────────────────────────────────────────────────────

function parseDiagnosticReports(reports) {
  return (reports || []).map(r => ({
    name: codeText(r.code) || 'Report',
    category: codeText(r.category?.[0]) || '',
    contactDate: formatDate(r.effectiveDateTime || r.issued),
    status: r.status || '',
    conclusion: r.conclusion || '',
    performer: r.performer?.[0]?.display || '',
    _fhirId: r.id,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Document References
// ─────────────────────────────────────────────────────────────────────────────

function parseDocumentReferences(docs) {
  return (docs || []).map(d => ({
    name: d.description || codeText(d.type) || 'Document',
    category: codeText(d.category?.[0]) || '',
    contactDate: formatDate(d.date || d.context?.period?.start),
    status: d.status || '',
    contentType: d.content?.[0]?.attachment?.contentType || '',
    title: d.content?.[0]?.attachment?.title || '',
    url: d.content?.[0]?.attachment?.url || '',
    author: d.author?.[0]?.display || '',
    _fhirId: d.id,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Converter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert raw FHIR resources from fetchPatientData() into the ClinQuilt
 * parsedData shape used by DataContext and Dashboard.
 */
export function fhirResourcesToParsedData(fhirData, endpointName) {
  const patient = parsePatient(fhirData.patient)
  const conditions = parseConditions(fhirData.conditions)
  const medications = parseMedications(fhirData.medications)
  const allergies = parseAllergies(fhirData.allergies)
  const observations = parseObservations(fhirData.observations)
  const encounters = parseEncounters(fhirData.encounters)
  const procedures = parseProcedures(fhirData.procedures)
  const immunizations = parseImmunizations(fhirData.immunizations)
  const diagnosticReports = parseDiagnosticReports(fhirData.diagnosticReports)
  const documents = parseDocumentReferences(fhirData.documentReferences)

  // Separate vitals from lab results by LOINC category or observation category
  const vitalsCategories = new Set(['vital-signs', 'vital signs'])
  const vitals = observations.filter(o =>
    vitalsCategories.has(o.category.toLowerCase()) ||
    ['body weight', 'body height', 'blood pressure', 'heart rate', 'respiratory rate', 'oxygen saturation', 'bmi', 'body temperature']
      .some(v => o.name.toLowerCase().includes(v))
  )
  const labResults = observations.filter(o => !vitals.includes(o))

  const abnormalResults = labResults.filter(o => o.isAbnormal)

  return {
    sourceLabel: endpointName || 'FHIR Connection',
    format: 'FHIR R4',
    vendor: 'FHIR',
    patients: [patient],
    selectedPatient: patient,
    conditions,
    medications,
    allergies,
    results: labResults,
    vitals,
    encounters,
    procedures,
    immunizations,
    diagnosticReports,
    documents,
    orders: [],
    careTeam: [],
    clinicalNotes: [],
    fhirResources: fhirData,
    abnormalResults,
    stats: {
      conditionCount: conditions.length,
      medicationCount: medications.length,
      allergyCount: allergies.length,
      resultCount: labResults.length,
      vitalCount: vitals.length,
      encounterCount: encounters.length,
      procedureCount: procedures.length,
      immunizationCount: immunizations.length,
    },
  }
}
