/**
 * Universal Health Record Parser — YAML-Driven, Multi-Vendor, Multi-Format
 *
 * Supports:
 *   1. Delimited (TSV/CSV) — Epic, Greenway, MEDITECH, eCW, NextGen
 *   2. NDJSON / FHIR JSON   — Athena, Cerner
 *   3. XML / C-CDA           — Allscripts, eCW, Practice Fusion, MEDITECH
 *   4. Document OCR           — Scanned/handwritten docs, PDFs, images (Tesseract.js + PDF.js)
 *
 * Architecture:
 *   Files → extractAllFiles() → format detection → vendor detection
 *   → loadRules(vendor) → YAML-driven mapping → app data model
 *
 * Adding a new vendor = new YAML rules folder. Zero code changes.
 * All parsing is 100% client-side. No data leaves the browser.
 */

import { generateAISummary } from '../data/sampleData'
import { loadRules, applyRule, detectVendor } from './ruleEngine'
import {
  extractAllFiles,
  detectPrimaryFormat,
  parseTSV,
  parseCSV,
  parseNDJSON,
  parseFHIRJSON,
  parseCCDA,
} from './formatParsers'
import { processDocument, documentResultToAppRows, terminateOCR } from './documentOCR'

// ─── Provider Lookup ────────────────────────────────────────────────────────

const defaultProviders = {
  E12345: { name: 'Dr. James Wilson', specialty: 'Internal Medicine' },
  E23456: { name: 'Dr. Emily Chan', specialty: 'Family Medicine' },
  E34567: { name: 'Dr. Robert Kim', specialty: 'Internal Medicine' },
  E45678: { name: 'Dr. Sarah Mitchell', specialty: 'Endocrinology' },
  E56789: { name: 'Dr. David Park', specialty: 'Emergency Medicine' },
  E67890: { name: 'Dr. Anna Torres', specialty: 'OB/GYN' },
  E78901: { name: 'Dr. Lisa Patel', specialty: 'Internal Medicine' },
  E89012: { name: 'Dr. Mark Thompson', specialty: 'Neurology' },
  E90123: { name: 'Dr. Michael Chen', specialty: 'Internal Medicine' },
  E01234: { name: 'Dr. Karen Wright', specialty: 'Pulmonology' },
}

// ─── App-Shape Adapters ─────────────────────────────────────────────────────
// Convert raw parsed rows into the shape the Dashboard expects.

function toAppPatient(raw) {
  const rawName = raw.PAT_NAME || raw.PATIENT_NAME || ''
  const nameParts = rawName.split(', ')
  const lastName = nameParts[0] || raw.PAT_LAST_NAME || raw.LAST_NAME || raw.family || ''
  const firstMiddle = nameParts[1] || ''
  const firstName = firstMiddle.split(' ')[0] || raw.PAT_FIRST_NAME || raw.FIRST_NAME || raw.given || ''

  let age = 0
  const birthDate = raw.BIRTH_DATE || raw.DOB || raw.birthDate || ''
  if (birthDate) {
    const birth = new Date(birthDate)
    const now = new Date()
    age = now.getFullYear() - birth.getFullYear()
    if (now.getMonth() < birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  }

  return {
    patId: raw.PAT_ID || raw.PATIENT_ID || raw.id || raw.MRN || String(Math.random()).slice(2, 10),
    name: rawName || `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    age,
    city: raw.CITY || raw.city || '',
    state: raw.STATE_C_NAME || raw.STATE || raw.state || '',
    zip: raw.ZIP || raw.zip || raw.postalCode || '',
    birthDate,
    sex: raw.SEX_C_NAME || raw.SEX || raw.GENDER || raw.gender || 'Unknown',
    ethnicGroup: raw.ETHNIC_GROUP_C_NAME || raw.ETHNICITY || '',
    language: raw.LANGUAGE_C_NAME || raw.LANGUAGE || '',
    maritalStatus: raw.MARITAL_STATUS_C_NAME || raw.MARITAL_STATUS || '',
  }
}

function toAppEncounter(raw) {
  return {
    csnId: raw.PAT_ENC_CSN_ID || raw.ENCOUNTER_ID || raw.id,
    patId: raw.PAT_ID || raw.PATIENT_ID,
    contactDate: raw.CONTACT_DATE || raw.ENCOUNTER_DATE || raw.DATE || raw.period?.start,
    encType: raw.ENC_TYPE_C_NAME || raw.ENCOUNTER_TYPE || raw.type?.[0]?.text || '',
    visitProvider: raw.VISIT_PROV_ID || raw.PROVIDER_ID || '',
    status: raw.APPT_STATUS_C_NAME || raw.STATUS || raw.status || '',
    patientClass: raw.ADT_PATIENT_CLASS_C_NAME || raw.CLASS || '',
    chiefComplaint: raw.CHIEF_COMPLAINT || raw.REASON || '',
    diagnosis: raw.DIAGNOSIS_LIST || '',
    checkinTime: raw.CHECKIN_TIME || '',
    checkoutTime: raw.CHECKOUT_TIME || '',
  }
}

function toAppOrder(raw) {
  return {
    orderId: raw.ORDER_ID || raw.ORDER_PROC_ID || raw.id,
    orderType: raw.ORDER_TYPE_C_NAME || raw.ORDER_TYPE || raw.category?.[0]?.text || '',
    patId: raw.PAT_ID || raw.PATIENT_ID,
    csnId: raw.PAT_ENC_CSN_ID || raw.ENCOUNTER_ID,
    orderDate: raw.ORDERING_DATE || raw.ORDER_DATE || raw.authoredOn,
    status: raw.ORDER_STATUS_C_NAME || raw.STATUS || raw.status || '',
    procName: raw.PROC_NAME || raw.PROCEDURE_NAME || raw.code?.text || '',
    procCode: raw.PROC_CODE || raw.CPT_CODE || raw.code?.coding?.[0]?.code || '',
    specimen: raw.SPECIMEN_TYPE_C_NAME || '',
    priority: raw.PRIORITY_C_NAME || raw.PRIORITY || '',
  }
}

function toAppResult(raw) {
  return {
    resultId: raw.RESULT_ID || raw.id,
    orderId: raw.ORDER_ID || raw.ORDER_PROC_ID || raw.basedOn?.[0]?.reference,
    component: raw.COMPONENT_NAME || raw.TEST_NAME || raw.code?.text || '',
    value: raw.ORD_VALUE || raw.RESULT_VALUE || raw.valueQuantity?.value?.toString() || raw.valueString || '',
    numValue: parseFloat(raw.ORD_NUM_VALUE || raw.NUMERIC_VALUE || raw.valueQuantity?.value) || null,
    unit: raw.REFERENCE_UNIT || raw.UNIT || raw.valueQuantity?.unit || '',
    refLow: parseFloat(raw.REFERENCE_LOW || raw.REF_LOW) || null,
    refHigh: parseFloat(raw.REFERENCE_HIGH || raw.REF_HIGH) || null,
    flag: raw.RESULT_FLAG_C_NAME || raw.ABNORMAL_FLAG || raw.interpretation?.[0]?.text || 'Normal',
    resultTime: raw.RESULT_TIME || raw.RESULT_DATE || raw.effectiveDateTime || '',
  }
}

function toAppCondition(raw) {
  return {
    name: raw.DX_ID_DX_NAME || raw.DIAGNOSIS_NAME || raw.CONDITION_NAME || raw.code?.text || '',
    onset: raw.NOTED_DATE || raw.ONSET_DATE || raw.onsetDateTime || '',
    status: raw.PROBLEM_STATUS_C_NAME || raw.STATUS || (raw.RESOLVED_DATE ? 'Resolved' : 'Active'),
    severity: raw.PRIORITY === '1' ? 'Severe' : raw.PRIORITY === '2' ? 'Moderate' : raw.SEVERITY || 'Mild',
    resolved: raw.RESOLVED_DATE || raw.abatementDateTime || '',
  }
}

function toAppMedication(raw) {
  return {
    name: raw.MEDICATION_NAME || raw.MEDICATION_ID_MEDICATION_NAME || raw.DRUG_NAME || raw.medicationCodeableConcept?.text || '',
    dosage: `${raw.DOSE || raw.DOSAGE || ''} ${raw.DOSE_UNIT || ''} ${raw.ROUTE || ''} ${raw.FREQUENCY || ''}`.trim() || raw.dosageInstruction?.[0]?.text || '',
    prescriber: raw.ORD_CREATR_USER_ID_NAME || raw.ORDERING_PROV_ID || raw.PRESCRIBER || 'Provider',
    startDate: raw.START_DATE || raw.ORDERING_DATE || raw.authoredOn || '',
    purpose: raw.MED_CLASS || raw.GENERIC_NAME || raw.INDICATION || '',
  }
}

function toAppAllergy(raw) {
  return {
    allergen: raw.ALLERGEN || raw.ALLERGEN_ID_ALLERGEN_NAME || raw.ALLERGY_NAME || raw.code?.text || '',
    type: raw.ALLERGY_TYPE_C_NAME || raw.ALLERGY_TYPE || raw.type || '',
    reaction: raw.REACTIONS || raw.REACTION || raw.reaction?.[0]?.description || '',
    severity: raw.SEVERITY_C_NAME || raw.ALLERGY_SEVERITY_C_NAME || raw.SEVERITY || raw.criticality || '',
    status: raw.ALLERGY_STATUS_C_NAME || raw.ALRGY_STATUS_C_NAME || raw.STATUS || 'Active',
    noted: raw.NOTED_DATE || raw.DATE_NOTED || raw.recordedDate || '',
  }
}

function toAppImmunization(raw) {
  return {
    name: raw.VACCINE_NAME || raw.IMMUNIZATION_NAME || raw.vaccineCode?.text || '',
    code: raw.VACCINE_CODE || raw.VACCINE_CVX_CODE || raw.vaccineCode?.coding?.[0]?.code || '',
    date: raw.ADMIN_DATE || raw.IMMUNIZATION_DATE || raw.occurrenceDateTime || '',
    route: raw.ROUTE_C_NAME || raw.ADMIN_ROUTE_NAME || raw.ROUTE || '',
    site: raw.SITE_C_NAME || raw.ADMIN_SITE_NAME || raw.SITE || '',
    manufacturer: raw.MANUFACTURER || '',
    status: raw.IMMUNIZATION_STATUS || raw.status || 'Completed',
  }
}

function toAppVital(raw) {
  return {
    name: raw.FLO_MEAS_NAME || raw.VITAL_NAME || raw.code?.text || raw.MEASUREMENT_NAME || '',
    value: raw.MEAS_VALUE || raw.VITAL_VALUE || raw.valueQuantity?.value?.toString() || '',
    unit: raw.MEAS_UNIT || raw.VITAL_UNIT || raw.valueQuantity?.unit || '',
    time: raw.RECORDED_TIME || raw.MEASUREMENT_DATE || raw.effectiveDateTime || '',
    csnId: raw.PAT_ENC_CSN_ID || raw.ENCOUNTER_ID || '',
  }
}

function toAppDocument(raw) {
  return {
    docId: raw.DOCUMENT_ID || raw.DOC_INFO_ID || raw.id || '',
    type: raw.DOC_TYPE || raw.DOC_INFO_TYPE_C_NAME || raw.DOCUMENT_TYPE || raw.type?.text || '',
    status: raw.DOC_STATUS_C_NAME || raw.STATUS || '',
    author: raw.AUTHOR_PROV_NAME || raw.CREATE_USER_ID_NAME || raw.AUTHOR || '',
    date: raw.CREATE_INSTANT_DTTM || raw.DOCUMENT_DATE || raw.date || '',
    specialty: raw.SPECIALTY || '',
    csnId: raw.PAT_ENC_CSN_ID || raw.ENCOUNTER_ID || '',
  }
}

// ─── FHIR Resource → App Shape ──────────────────────────────────────────────
// For NDJSON / FHIR JSON vendors (Athena, Cerner)

function fhirResourceToAppRow(resource) {
  switch (resource.resourceType) {
    case 'Patient': return { _type: 'patient', ...fhirPatientToRaw(resource) }
    case 'Encounter': return { _type: 'encounter', ...fhirEncounterToRaw(resource) }
    case 'Condition': return { _type: 'condition', ...fhirConditionToRaw(resource) }
    case 'MedicationRequest':
    case 'MedicationStatement': return { _type: 'medication', ...fhirMedicationToRaw(resource) }
    case 'Observation': return { _type: fhirObservationCategory(resource), ...fhirObservationToRaw(resource) }
    case 'AllergyIntolerance': return { _type: 'allergy', ...fhirAllergyToRaw(resource) }
    case 'Immunization': return { _type: 'immunization', ...fhirImmunizationToRaw(resource) }
    case 'DocumentReference': return { _type: 'document', ...fhirDocumentToRaw(resource) }
    case 'Procedure': return { _type: 'procedure', ...resource }
    default: return null
  }
}

function fhirPatientToRaw(r) {
  const name = r.name?.[0] || {}
  return {
    PAT_ID: r.id,
    PAT_FIRST_NAME: Array.isArray(name.given) ? name.given[0] : name.given || '',
    PAT_LAST_NAME: name.family || '',
    PAT_NAME: `${name.family || ''}, ${Array.isArray(name.given) ? name.given.join(' ') : name.given || ''}`,
    BIRTH_DATE: r.birthDate || '',
    SEX_C_NAME: r.gender === 'male' ? 'Male' : r.gender === 'female' ? 'Female' : 'Unknown',
    CITY: r.address?.[0]?.city || '',
    STATE_C_NAME: r.address?.[0]?.state || '',
    ZIP: r.address?.[0]?.postalCode || '',
  }
}

function fhirEncounterToRaw(r) {
  return {
    PAT_ENC_CSN_ID: r.id,
    PAT_ID: r.subject?.reference?.split('/')?.pop() || '',
    CONTACT_DATE: r.period?.start || '',
    ENC_TYPE_C_NAME: r.type?.[0]?.text || r.class?.display || '',
    APPT_STATUS_C_NAME: r.status || '',
  }
}

function fhirConditionToRaw(r) {
  return {
    DX_ID_DX_NAME: r.code?.text || r.code?.coding?.[0]?.display || '',
    NOTED_DATE: r.onsetDateTime || r.recordedDate || '',
    PROBLEM_STATUS_C_NAME: r.clinicalStatus?.coding?.[0]?.code === 'active' ? 'Active' : 'Resolved',
    RESOLVED_DATE: r.abatementDateTime || '',
    PAT_ID: r.subject?.reference?.split('/')?.pop() || '',
  }
}

function fhirMedicationToRaw(r) {
  return {
    MEDICATION_NAME: r.medicationCodeableConcept?.text || r.medicationCodeableConcept?.coding?.[0]?.display || '',
    DOSAGE: r.dosageInstruction?.[0]?.text || '',
    ORDERING_DATE: r.authoredOn || r.effectiveDateTime || '',
    PAT_ID: r.subject?.reference?.split('/')?.pop() || '',
  }
}

function fhirObservationCategory(r) {
  const cats = r.category || []
  for (const cat of cats) {
    const codes = cat.coding || []
    for (const c of codes) {
      if (c.code === 'vital-signs') return 'vital'
      if (c.code === 'laboratory') return 'result'
    }
  }
  return 'result'
}

function fhirObservationToRaw(r) {
  return {
    COMPONENT_NAME: r.code?.text || r.code?.coding?.[0]?.display || '',
    ORD_VALUE: r.valueQuantity?.value?.toString() || r.valueString || '',
    ORD_NUM_VALUE: r.valueQuantity?.value?.toString() || '',
    REFERENCE_UNIT: r.valueQuantity?.unit || '',
    RESULT_TIME: r.effectiveDateTime || '',
    RESULT_FLAG_C_NAME: r.interpretation?.[0]?.coding?.[0]?.code === 'N' ? 'Normal' : r.interpretation?.[0]?.text || 'Normal',
    ORDER_ID: r.basedOn?.[0]?.reference?.split('/')?.pop() || '',
    PAT_ID: r.subject?.reference?.split('/')?.pop() || '',
    PAT_ENC_CSN_ID: r.encounter?.reference?.split('/')?.pop() || '',
    // Vital-specific
    FLO_MEAS_NAME: r.code?.text || r.code?.coding?.[0]?.display || '',
    MEAS_VALUE: r.valueQuantity?.value?.toString() || r.valueString || '',
    MEAS_UNIT: r.valueQuantity?.unit || '',
    RECORDED_TIME: r.effectiveDateTime || '',
  }
}

function fhirAllergyToRaw(r) {
  return {
    ALLERGEN: r.code?.text || r.code?.coding?.[0]?.display || '',
    ALLERGY_TYPE_C_NAME: r.type || '',
    REACTIONS: r.reaction?.[0]?.manifestation?.[0]?.text || r.reaction?.[0]?.description || '',
    SEVERITY_C_NAME: r.criticality || '',
    ALLERGY_STATUS_C_NAME: r.clinicalStatus?.coding?.[0]?.code === 'active' ? 'Active' : 'Inactive',
    NOTED_DATE: r.recordedDate || r.onsetDateTime || '',
    PAT_ID: r.patient?.reference?.split('/')?.pop() || '',
  }
}

function fhirImmunizationToRaw(r) {
  return {
    VACCINE_NAME: r.vaccineCode?.text || r.vaccineCode?.coding?.[0]?.display || '',
    VACCINE_CODE: r.vaccineCode?.coding?.[0]?.code || '',
    ADMIN_DATE: r.occurrenceDateTime || '',
    ROUTE_C_NAME: r.route?.text || '',
    SITE_C_NAME: r.site?.text || '',
    MANUFACTURER: r.manufacturer?.display || '',
    IMMUNIZATION_STATUS: r.status || 'completed',
    PAT_ID: r.patient?.reference?.split('/')?.pop() || '',
  }
}

function fhirDocumentToRaw(r) {
  return {
    DOC_INFO_ID: r.id,
    DOC_INFO_TYPE_C_NAME: r.type?.text || r.type?.coding?.[0]?.display || '',
    DOC_STATUS_C_NAME: r.status || '',
    CREATE_USER_ID_NAME: r.author?.[0]?.display || '',
    CREATE_INSTANT_DTTM: r.date || '',
    PAT_ID: r.subject?.reference?.split('/')?.pop() || '',
    PAT_ENC_CSN_ID: r.context?.encounter?.[0]?.reference?.split('/')?.pop() || '',
  }
}

// ─── C-CDA → App Shape ─────────────────────────────────────────────────────

function ccdaSectionsToRawRows(sections, metadata) {
  const rows = {
    patients: [],
    encounters: [],
    conditions: [],
    medications: [],
    allergies: [],
    results: [],
    vitals: [],
    immunizations: [],
    documents: [],
  }

  // Patient from metadata
  if (metadata?.patient) {
    const p = metadata.patient
    rows.patients.push({
      PAT_ID: p.mrn || 'CCDA-PAT-1',
      PAT_FIRST_NAME: p.firstName,
      PAT_LAST_NAME: p.lastName,
      PAT_NAME: `${p.lastName}, ${p.firstName}`,
      BIRTH_DATE: p.birthDate ? formatCCDADate(p.birthDate) : '',
      SEX_C_NAME: p.sex || 'Unknown',
    })
  }

  for (const sec of sections) {
    const sectionRows = sec.rows.length > 0 ? sec.rows : sec.entries.map(e => flattenEntry(e))

    switch (sec.dataType) {
      case 'problems':
        sectionRows.forEach(r => rows.conditions.push({
          DX_ID_DX_NAME: r.displayName || r.Condition || r.Problem || r.text || '',
          NOTED_DATE: formatCCDADate(r.startTime || r.effectiveTime || r['Date of Diagnosis'] || ''),
          PROBLEM_STATUS_C_NAME: r.status === 'completed' ? 'Resolved' : 'Active',
          RESOLVED_DATE: formatCCDADate(r.endTime || ''),
        }))
        break

      case 'allergies':
        sectionRows.forEach(r => rows.allergies.push({
          ALLERGEN: r.displayName || r.Substance || r.Allergen || r.text || '',
          ALLERGY_TYPE_C_NAME: r.Type || '',
          REACTIONS: r.Reaction || r.Reactions || r.text || '',
          SEVERITY_C_NAME: r.Severity || '',
          ALLERGY_STATUS_C_NAME: r.status === 'completed' ? 'Inactive' : 'Active',
          NOTED_DATE: formatCCDADate(r.effectiveTime || r.startTime || ''),
        }))
        break

      case 'medications':
        sectionRows.forEach(r => rows.medications.push({
          MEDICATION_NAME: r.displayName || r.Medication || r.Drug || r.text || '',
          DOSAGE: r.Dose || r.Dosage || r.Instructions || '',
          ORDERING_DATE: formatCCDADate(r.startTime || r.effectiveTime || ''),
          ROUTE: r.Route || '',
        }))
        break

      case 'results':
        sectionRows.forEach(r => rows.results.push({
          COMPONENT_NAME: r.displayName || r.Test || r['Lab Test'] || r.text || '',
          ORD_VALUE: r.value || r.Result || r.Value || '',
          REFERENCE_UNIT: r.unit || r.Unit || r.Units || '',
          RESULT_TIME: formatCCDADate(r.effectiveTime || r.Date || ''),
          RESULT_FLAG_C_NAME: (r.Flag || r.Interpretation || 'Normal'),
        }))
        break

      case 'vitals':
        sectionRows.forEach(r => rows.vitals.push({
          FLO_MEAS_NAME: r.displayName || r['Vital Sign'] || r.Measurement || r.text || '',
          MEAS_VALUE: r.value || r.Value || r.Result || '',
          MEAS_UNIT: r.unit || r.Unit || '',
          RECORDED_TIME: formatCCDADate(r.effectiveTime || r.Date || ''),
        }))
        break

      case 'encounters':
        sectionRows.forEach(r => rows.encounters.push({
          PAT_ENC_CSN_ID: r.code || `ENC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          CONTACT_DATE: formatCCDADate(r.startTime || r.effectiveTime || r.Date || ''),
          ENC_TYPE_C_NAME: r.displayName || r.Type || r.text || '',
          APPT_STATUS_C_NAME: r.status || '',
        }))
        break

      case 'immunizations':
        sectionRows.forEach(r => rows.immunizations.push({
          VACCINE_NAME: r.displayName || r.Vaccine || r.Immunization || r.text || '',
          ADMIN_DATE: formatCCDADate(r.effectiveTime || r.startTime || r.Date || ''),
          IMMUNIZATION_STATUS: r.status || 'Completed',
        }))
        break

      default:
        break
    }
  }

  return rows
}

function flattenEntry(entry) {
  const flat = { ...entry }
  delete flat._type
  delete flat.rawElement
  return flat
}

function formatCCDADate(val) {
  if (!val) return ''
  // C-CDA dates: YYYYMMDD or YYYYMMDDHHmmss
  if (/^\d{8,14}$/.test(val)) {
    const y = val.slice(0, 4)
    const m = val.slice(4, 6)
    const d = val.slice(6, 8)
    return `${m}/${d}/${y}`
  }
  return val
}

// ─── Build Patient Summaries ────────────────────────────────────────────────

function buildPatientSummary(patient, encounters, orders, results, conditions,
                              medications, allergies, immunizations, vitals, documents) {
  const abnormalResults = results.filter(r => r.flag && r.flag !== 'Normal')
  return {
    ...patient,
    encounters,
    orders,
    results,
    conditions,
    medications,
    abnormalResults,
    allergies,
    immunizations,
    vitals,
    documents,
    encounterCount: encounters.length,
    orderCount: orders.length,
    resultCount: results.length,
    conditionCount: conditions.length,
    medicationCount: medications.length,
  }
}

function computeDateRange(encounters) {
  if (encounters.length === 0) return { start: '', end: '' }
  const dates = encounters.map(e => e.contactDate).filter(Boolean).sort()
  return { start: dates[0], end: dates[dates.length - 1] }
}

// ─── Delimited Data Assembly ────────────────────────────────────────────────

function assembleFromDelimited(delimitedMap, rules) {
  // Parse each file using appropriate parser (TSV or CSV)
  const rawTables = {}
  for (const [filename, text] of Object.entries(delimitedMap)) {
    const isCSV = filename.toLowerCase().endsWith('.csv')
    rawTables[filename] = isCSV ? parseCSV(text) : parseTSV(text)
  }

  // Apply YAML rules to each table (if rules loaded) for FHIR output
  const fhirResources = {}
  if (rules.length > 0) {
    for (const [filename, rows] of Object.entries(rawTables)) {
      const rule = rules.find(r =>
        r.source_file?.toUpperCase() === filename.toUpperCase() ||
        (r.epic_table?.toUpperCase() + '.TSV') === filename.toUpperCase()
      )
      if (rule) {
        fhirResources[filename] = rows.map(row => applyRule(rule, row))
      }
    }
  }

  // Build app-shape rows (using raw columns — adapters handle column name variants)
  const getRows = (fileKey, adapter) => {
    const rows = rawTables[fileKey]
    return rows ? rows.map(adapter) : []
  }

  const patientRows   = getRows('PATIENT.tsv', toAppPatient)
  const encounterRows = getRows('PAT_ENC.tsv', toAppEncounter)
  const orderRows     = getRows('ORDER_PROC.tsv', toAppOrder)
  const resultRows    = getRows('ORDER_RESULTS.tsv', toAppResult)
  const problemRows   = getRows('PROBLEM_LIST.tsv', toAppCondition)
  const medRows       = getRows('ORDER_MED.tsv', toAppMedication)
  const allergyRows   = getRows('ALLERGY.tsv', toAppAllergy)
  const immuneRows    = getRows('IMMUNE.tsv', toAppImmunization)
  const vitalRows     = getRows('IP_FLWSHT_MEAS.tsv', toAppVital)
  const docRows       = getRows('DOC_INFORMATION.tsv', toAppDocument)

  return { patientRows, encounterRows, orderRows, resultRows, problemRows, medRows, allergyRows, immuneRows, vitalRows, docRows, fhirResources }
}

// ─── FHIR JSON Assembly ─────────────────────────────────────────────────────

function assembleFromFHIR(jsonFiles) {
  const allResources = []

  for (const { text, format } of jsonFiles) {
    if (format === 'ndjson') {
      allResources.push(...parseNDJSON(text))
    } else {
      allResources.push(...parseFHIRJSON(text))
    }
  }

  // Categorize resources
  const categories = {
    patients: [], encounters: [], conditions: [], medications: [],
    results: [], vitals: [], allergies: [], immunizations: [], documents: [],
  }

  for (const resource of allResources) {
    const mapped = fhirResourceToAppRow(resource)
    if (!mapped) continue

    switch (mapped._type) {
      case 'patient':      categories.patients.push(mapped); break
      case 'encounter':    categories.encounters.push(mapped); break
      case 'condition':    categories.conditions.push(mapped); break
      case 'medication':   categories.medications.push(mapped); break
      case 'result':       categories.results.push(mapped); break
      case 'vital':        categories.vitals.push(mapped); break
      case 'allergy':      categories.allergies.push(mapped); break
      case 'immunization': categories.immunizations.push(mapped); break
      case 'document':     categories.documents.push(mapped); break
    }
  }

  return {
    patientRows: categories.patients.map(toAppPatient),
    encounterRows: categories.encounters.map(toAppEncounter),
    orderRows: [],
    resultRows: categories.results.map(toAppResult),
    problemRows: categories.conditions.map(toAppCondition),
    medRows: categories.medications.map(toAppMedication),
    allergyRows: categories.allergies.map(toAppAllergy),
    immuneRows: categories.immunizations.map(toAppImmunization),
    vitalRows: categories.vitals.map(toAppVital),
    docRows: categories.documents.map(toAppDocument),
    fhirResources: allResources,
  }
}

// ─── C-CDA XML Assembly ─────────────────────────────────────────────────────

function assembleFromCCDA(xmlFiles) {
  const merged = {
    patients: [], encounters: [], conditions: [], medications: [],
    results: [], vitals: [], allergies: [], immunizations: [], documents: [],
  }

  for (const { text } of xmlFiles) {
    const { sections, metadata } = parseCCDA(text)
    const rows = ccdaSectionsToRawRows(sections, metadata)

    merged.patients.push(...rows.patients)
    merged.encounters.push(...rows.encounters)
    merged.conditions.push(...rows.conditions)
    merged.medications.push(...rows.medications)
    merged.results.push(...rows.results)
    merged.vitals.push(...rows.vitals)
    merged.allergies.push(...rows.allergies)
    merged.immunizations.push(...rows.immunizations)
    merged.documents.push(...rows.documents)
  }

  return {
    patientRows: merged.patients.map(toAppPatient),
    encounterRows: merged.encounters.map(toAppEncounter),
    orderRows: [],
    resultRows: merged.results.map(toAppResult),
    problemRows: merged.conditions.map(toAppCondition),
    medRows: merged.medications.map(toAppMedication),
    allergyRows: merged.allergies.map(toAppAllergy),
    immuneRows: merged.immunizations.map(toAppImmunization),
    vitalRows: merged.vitals.map(toAppVital),
    docRows: merged.documents.map(toAppDocument),
    fhirResources: {},
  }
}

// ─── Final Assembly ─────────────────────────────────────────────────────────

function assembleParsedData(assembled, documentIndexes, vendor, rules, ocrResults = []) {
  let { patientRows, encounterRows, orderRows, resultRows, problemRows,
        medRows, allergyRows, immuneRows, vitalRows, docRows, fhirResources } = assembled

  // Add indexed documents (metadata-only for non-OCR docs)
  if (documentIndexes.length > 0) {
    const ocrFileNames = new Set(ocrResults.map(r => r.filename))
    docRows = [...docRows, ...documentIndexes
      .filter(d => !ocrFileNames.has(d.metadata?.fileName || d.filename))
      .map(d => ({
        docId: d.metadata?.fileName || d.filename,
        type: d.metadata?.category || 'Document',
        status: 'Available',
        author: '',
        date: d.metadata?.lastModified || '',
        specialty: '',
        csnId: '',
      }))]
  }

  // Merge OCR-extracted clinical data into the assembled rows
  if (ocrResults.length > 0) {
    for (const { filename, result } of ocrResults) {
      const rows = documentResultToAppRows(result, filename)
      if (rows.medications.length)  medRows = [...medRows, ...rows.medications]
      if (rows.conditions.length)   problemRows = [...problemRows, ...rows.conditions]
      if (rows.allergies.length)    allergyRows = [...allergyRows, ...rows.allergies]
      if (rows.vitals.length)       vitalRows = [...vitalRows, ...rows.vitals]
      if (rows.results.length)      resultRows = [...resultRows, ...rows.results]
      if (rows.documentRow)         docRows = [...docRows, rows.documentRow]

      // Build patient row from OCR demographics (if available)
      const demo = result.clinicalEntities?.demographics
      if (demo && patientRows.length === 0) {
        const nameParts = (demo.name || '').split(/\s+/)
        patientRows.push({
          patId: demo.mrn || `OCR-${Date.now()}`,
          name: demo.name || 'Unknown Patient',
          firstName: nameParts[0] || 'Unknown',
          lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Patient',
          age: demo.age || 0,
          city: '', state: '', zip: '',
          birthDate: demo.dateOfBirth || '',
          sex: demo.sex || 'Unknown',
          ethnicGroup: '', language: '', maritalStatus: '',
          _source: 'ocr',
        })
      }
    }
    console.log(`[Parser] Merged OCR data from ${ocrResults.length} document(s)`)
  }

  // If no patient rows, infer from encounters
  if (patientRows.length === 0 && encounterRows.length > 0) {
    const uniquePatIds = [...new Set(encounterRows.map(e => e.patId))]
    uniquePatIds.forEach(id => {
      patientRows.push({
        patId: id, name: id, firstName: id, lastName: '', age: 0,
        city: '', state: '', zip: '', birthDate: '', sex: 'Unknown',
        ethnicGroup: '', language: '', maritalStatus: '',
      })
    })
  }

  // If still no patients, create a placeholder
  if (patientRows.length === 0) {
    patientRows.push({
      patId: 'UNKNOWN', name: 'Unknown Patient', firstName: 'Unknown', lastName: 'Patient',
      age: 0, city: '', state: '', zip: '', birthDate: '', sex: 'Unknown',
      ethnicGroup: '', language: '', maritalStatus: '',
    })
  }

  // Build per-patient summaries
  const isSingle = patientRows.length === 1
  const patientSummaries = patientRows.map(patient => {
    const patId = patient.patId
    const enc  = encounterRows.filter(e => isSingle || e.patId === patId)
    const ord  = orderRows.filter(o => isSingle || o.patId === patId)
    const orderIds = new Set(ord.map(o => o.orderId))
    const res  = isSingle ? resultRows : resultRows.filter(r => orderIds.has(r.orderId) || r.patId === patId)
    const prob = isSingle ? problemRows : problemRows.filter(p => p.patId === patId)
    const meds = isSingle ? medRows : medRows.filter(m => m.patId === patId)
    const alrg = isSingle ? allergyRows : allergyRows.filter(a => a.patId === patId)
    const immn = isSingle ? immuneRows : immuneRows.filter(i => i.patId === patId)
    const vitl = isSingle ? vitalRows : vitalRows.filter(v => v.patId === patId)
    const docs = isSingle ? docRows : docRows.filter(d => d.patId === patId)

    return buildPatientSummary(patient, enc, ord, res, prob, meds, alrg, immn, vitl, docs)
  })

  const totalRecords = encounterRows.length + orderRows.length + resultRows.length +
    medRows.length + problemRows.length + allergyRows.length + immuneRows.length + vitalRows.length
  const selectedPatient = patientSummaries[0] || null

  return {
    patients: patientSummaries,
    selectedPatient,
    encounters: encounterRows,
    orders: orderRows,
    results: resultRows,
    medications: medRows,
    conditions: problemRows,
    allergies: allergyRows,
    immunizations: immuneRows,
    vitals: vitalRows,
    documents: docRows,
    providers: defaultProviders,
    totalRecords,
    totalPatients: patientSummaries.length,
    dataSourceCount: 1,
    dateRange: computeDateRange(encounterRows),
    isSample: false,
    fhirResources,
    vendor,
    rulesLoaded: rules.map(r => ({ type: r.resource_type, file: r.source_file })),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse uploaded File objects — any vendor, any format.
 *
 * Flow:
 *   1. Extract all files (ZIP, TSV, CSV, JSON, NDJSON, XML, documents)
 *   2. Detect primary format
 *   3. Auto-detect vendor
 *   4. Load YAML rules for vendor
 *   5. Parse using format-appropriate parser
 *   6. Convert to Dashboard-ready data
 *
 * @param {File[]} fileList - Array of uploaded File objects
 * @returns {{ parsedData, aiSummary, selectedPatient, vendor, format }}
 */
export async function parseUploadedFiles(fileList, onProgress = () => {}) {
  // 1. Extract & categorize all files
  const extracted = await extractAllFiles(fileList)

  const totalFiles = Object.keys(extracted.delimited).length +
    extracted.json.length + extracted.xml.length + extracted.documents.length

  if (totalFiles === 0) {
    throw new Error(
      'No valid health record files found. Supported formats:\n' +
      '• TSV/CSV (Epic, Greenway, MEDITECH, eCW, NextGen)\n' +
      '• JSON/NDJSON (Athena, Cerner FHIR exports)\n' +
      '• XML/C-CDA (Allscripts, Practice Fusion)\n' +
      '• ZIP archives containing any of the above\n' +
      '• Documents (PDF, RTF, images)'
    )
  }

  // 2. Detect primary format
  const primaryFormat = detectPrimaryFormat(extracted)
  console.log(`[Parser] Primary format: ${primaryFormat}, files: ${totalFiles}`)

  // 3. Auto-detect vendor with hints
  const hints = {}
  if (extracted.json.length > 0) {
    // Sample a few JSON resources for vendor fingerprinting
    try {
      const sampleText = extracted.json[0].text
      const sampleResources = extracted.json[0].format === 'ndjson'
        ? parseNDJSON(sampleText).slice(0, 5)
        : parseFHIRJSON(sampleText).slice(0, 5)
      hints.jsonResources = sampleResources
    } catch { /* ignore */ }
  }
  if (extracted.xml.length > 0) {
    try {
      const { metadata } = parseCCDA(extracted.xml[0].text)
      hints.xmlMetadata = metadata
    } catch { /* ignore */ }
  }

  const vendor = detectVendor(extracted.allFileNames, primaryFormat, hints) || 'epic-tsv'
  console.log(`[Parser] Detected vendor: ${vendor}`)

  // 4. Load YAML rules for this vendor (may fail for vendors without rules yet)
  let rules = []
  try {
    rules = await loadRules(vendor)
    console.log(`[Parser] Loaded ${rules.length} YAML rules for ${vendor}`)
  } catch (err) {
    console.warn(`[Parser] No YAML rules for ${vendor}:`, err.message)
  }

  // 5. Parse based on detected format
  let assembled
  switch (primaryFormat) {
    case 'delimited':
      assembled = assembleFromDelimited(extracted.delimited, rules)
      break
    case 'fhir-json':
    case 'ndjson':
      assembled = assembleFromFHIR(extracted.json)
      break
    case 'ccda-xml':
      assembled = assembleFromCCDA(extracted.xml)
      break
    case 'documents':
      // Documents only — OCR will extract clinical data below
      assembled = {
        patientRows: [], encounterRows: [], orderRows: [], resultRows: [],
        problemRows: [], medRows: [], allergyRows: [], immuneRows: [],
        vitalRows: [], docRows: [], fhirResources: {},
      }
      break
    default:
      // Mixed — try all
      assembled = assembleFromDelimited(extracted.delimited, rules)
      if (extracted.json.length > 0) {
        const jsonAssembled = assembleFromFHIR(extracted.json)
        mergeAssembled(assembled, jsonAssembled)
      }
      if (extracted.xml.length > 0) {
        const xmlAssembled = assembleFromCCDA(extracted.xml)
        mergeAssembled(assembled, xmlAssembled)
      }
  }

  // 5b. Process documents with OCR (PDFs, scanned images, handwritten docs)
  let ocrResults = []
  if (extracted.documents.length > 0) {
    onProgress({ phase: 'ocr-start', total: extracted.documents.length, message: 'Processing documents with OCR...' })
    console.log(`[Parser] Processing ${extracted.documents.length} document(s) with OCR...`)

    for (let i = 0; i < extracted.documents.length; i++) {
      const doc = extracted.documents[i]
      const fileOrBlob = doc.file || doc.blob
      if (!fileOrBlob) continue

      try {
        onProgress({
          phase: 'ocr-processing',
          current: i + 1,
          total: extracted.documents.length,
          filename: doc.filename,
          message: `OCR: ${doc.filename} (${i + 1}/${extracted.documents.length})`,
        })

        const result = await processDocument(fileOrBlob, doc.filename, (p) => {
          onProgress({
            phase: 'ocr-page',
            current: i + 1,
            total: extracted.documents.length,
            filename: doc.filename,
            ...p,
          })
        })

        if (result.text && result.text.length > 0) {
          ocrResults.push({ filename: doc.filename, result })
          console.log(`[OCR] ${doc.filename}: ${result.method}, ${result.text.length} chars, ${Math.round(result.confidence)}% confidence`)
        } else {
          console.log(`[OCR] ${doc.filename}: no text extracted`)
        }
      } catch (err) {
        console.warn(`[OCR] Failed to process ${doc.filename}:`, err.message)
      }
    }

    // Terminate OCR worker after batch processing
    try { await terminateOCR() } catch { /* ignore */ }
    onProgress({ phase: 'ocr-complete', message: `OCR complete: processed ${ocrResults.length} document(s)` })
  }

  // 6. Assemble final data
  const parsedData = assembleParsedData(assembled, extracted.documents, vendor, rules, ocrResults)

  // 7. Generate AI summary
  const aiSummary = parsedData.selectedPatient
    ? generateAISummary(parsedData.selectedPatient)
    : null

  console.log(`[Parser] Complete: ${parsedData.totalPatients} patients, ${parsedData.totalRecords} records, vendor=${vendor}, format=${primaryFormat}`)

  return {
    parsedData,
    aiSummary,
    selectedPatient: parsedData.selectedPatient,
    vendor,
    format: primaryFormat,
    ocrDocuments: ocrResults,   // raw OCR results for Document Intelligence view
  }
}

function mergeAssembled(target, source) {
  target.patientRows.push(...(source.patientRows || []))
  target.encounterRows.push(...(source.encounterRows || []))
  target.orderRows.push(...(source.orderRows || []))
  target.resultRows.push(...(source.resultRows || []))
  target.problemRows.push(...(source.problemRows || []))
  target.medRows.push(...(source.medRows || []))
  target.allergyRows.push(...(source.allergyRows || []))
  target.immuneRows.push(...(source.immuneRows || []))
  target.vitalRows.push(...(source.vitalRows || []))
  target.docRows.push(...(source.docRows || []))
}
