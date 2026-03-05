/**
 * Epic EHI TSV/ZIP Parser
 * Parses uploaded .tsv files or .zip archives containing Epic EHI export TSV files.
 * Produces the same data shape as sampleData.js's generateSampleParsedData().
 */
import JSZip from 'jszip'
import { generateAISummary } from '../data/sampleData'

// ─── TSV Parsing Helpers ─────────────────────────────────────────────────────

/** Parse a TSV string into an array of objects keyed by header names */
function parseTSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return []
  const headers = lines[0].split('\t')
  return lines.slice(1).map(line => {
    const values = line.split('\t')
    const obj = {}
    headers.forEach((h, i) => {
      const val = (values[i] || '').trim()
      obj[h] = val === 'NULL' || val === '' ? null : val
    })
    return obj
  })
}

/** Read a File object as text */
function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsText(file)
  })
}

/** Read a File object as ArrayBuffer (for ZIP) */
function readFileBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

// ─── Provider Lookup (shared with sampleData) ────────────────────────────────

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

// ─── Mapping Functions: TSV rows → app data shapes ──────────────────────────

function mapPatientRow(row) {
  // PAT_NAME format: "Last, First M"
  const rawName = row.PAT_NAME || ''
  const nameParts = rawName.split(', ')
  const lastName = nameParts[0] || row.PAT_LAST_NAME || ''
  const firstMiddle = nameParts[1] || ''
  const firstName = firstMiddle.split(' ')[0] || row.PAT_FIRST_NAME || ''

  const birthDate = row.BIRTH_DATE || ''
  let age = 0
  if (birthDate) {
    const birth = new Date(birthDate)
    const now = new Date()
    age = now.getFullYear() - birth.getFullYear()
    if (now.getMonth() < birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
      age--
    }
  }

  return {
    patId: row.PAT_ID,
    name: rawName,
    firstName,
    lastName,
    age,
    city: row.CITY,
    state: row.STATE_C_NAME,
    zip: row.ZIP,
    birthDate,
    sex: row.SEX_C_NAME || 'Unknown',
    ethnicGroup: row.ETHNIC_GROUP_C_NAME,
    language: row.LANGUAGE_C_NAME,
    maritalStatus: row.MARITAL_STATUS_C_NAME,
  }
}

function mapEncounterRow(row) {
  return {
    csnId: row.PAT_ENC_CSN_ID,
    patId: row.PAT_ID,
    contactDate: row.CONTACT_DATE,
    encType: row.ENC_TYPE_C_NAME,
    visitProvider: row.VISIT_PROV_ID,
    status: row.APPT_STATUS_C_NAME,
    patientClass: row.ADT_PATIENT_CLASS_C_NAME,
    chiefComplaint: row.CHIEF_COMPLAINT,
    diagnosis: row.DIAGNOSIS_LIST,
    checkinTime: row.CHECKIN_TIME,
    checkoutTime: row.CHECKOUT_TIME,
  }
}

function mapOrderRow(row) {
  return {
    orderId: row.ORDER_ID,
    orderType: row.ORDER_TYPE_C_NAME,
    patId: row.PAT_ID,
    csnId: row.PAT_ENC_CSN_ID,
    orderDate: row.ORDERING_DATE,
    status: row.ORDER_STATUS_C_NAME,
    procName: row.PROC_NAME,
    procCode: row.PROC_CODE,
    specimen: row.SPECIMEN_TYPE_C_NAME,
    priority: row.PRIORITY_C_NAME,
  }
}

function mapResultRow(row) {
  return {
    resultId: row.RESULT_ID,
    orderId: row.ORDER_ID,
    component: row.COMPONENT_NAME,
    value: row.ORD_VALUE,
    numValue: row.ORD_NUM_VALUE ? parseFloat(row.ORD_NUM_VALUE) : null,
    unit: row.REFERENCE_UNIT,
    refLow: row.REFERENCE_LOW ? parseFloat(row.REFERENCE_LOW) : null,
    refHigh: row.REFERENCE_HIGH ? parseFloat(row.REFERENCE_HIGH) : null,
    flag: row.RESULT_FLAG_C_NAME || 'Normal',
    resultTime: row.RESULT_TIME,
  }
}

function mapProblemRow(row) {
  return {
    name: row.DX_ID_DX_NAME,
    onset: row.NOTED_DATE,
    status: row.PROBLEM_STATUS_C_NAME || 'Active',
    severity: row.PRIORITY === '1' ? 'Severe' : row.PRIORITY === '2' ? 'Moderate' : 'Mild',
    resolved: row.RESOLVED_DATE,
  }
}

function mapMedicationRow(row) {
  return {
    name: row.MEDICATION_NAME,
    dosage: `${row.DOSE || ''}${row.DOSE_UNIT || ''} ${row.ROUTE || ''} ${row.FREQUENCY || ''}`.trim(),
    prescriber: row.ORDERING_PROV_ID ? (defaultProviders[row.ORDERING_PROV_ID]?.name || row.ORDERING_PROV_ID) : 'Provider',
    startDate: row.START_DATE,
    purpose: row.MED_CLASS || row.GENERIC_NAME || '',
  }
}

function mapAllergyRow(row) {
  return {
    allergen: row.ALLERGEN,
    type: row.ALLERGY_TYPE_C_NAME,
    reaction: row.REACTIONS,
    severity: row.SEVERITY_C_NAME,
    status: row.ALLERGY_STATUS_C_NAME || 'Active',
    noted: row.NOTED_DATE,
  }
}

function mapImmunizationRow(row) {
  return {
    name: row.VACCINE_NAME,
    code: row.VACCINE_CODE,
    date: row.ADMIN_DATE,
    route: row.ROUTE_C_NAME,
    site: row.SITE_C_NAME,
    manufacturer: row.MANUFACTURER,
    status: row.IMMUNIZATION_STATUS || 'Completed',
  }
}

function mapVitalRow(row) {
  return {
    name: row.FLO_MEAS_NAME,
    value: row.MEAS_VALUE,
    unit: row.MEAS_UNIT,
    time: row.RECORDED_TIME,
    csnId: row.PAT_ENC_CSN_ID,
  }
}

function mapDocumentRow(row) {
  return {
    docId: row.DOCUMENT_ID,
    type: row.DOC_TYPE,
    status: row.DOC_STATUS_C_NAME,
    author: row.AUTHOR_PROV_NAME || row.AUTHOR_PROV_ID,
    date: row.CREATE_INSTANT_DTTM,
    specialty: row.SPECIALTY,
    csnId: row.PAT_ENC_CSN_ID,
  }
}

// ─── Build Patient Summary ──────────────────────────────────────────────────

function buildPatientSummary(patient, encounters, orders, results, conditions, medications, allergies, immunizations, vitals, documents) {
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

// ─── Main Parse Functions ───────────────────────────────────────────────────

/**
 * Parse a collection of TSV text contents keyed by filename.
 * Returns the same data structure as generateSampleParsedData().
 */
function parseEpicTSVData(tsvMap) {
  // Parse each table if present
  const patientRows = tsvMap['PATIENT.tsv'] ? parseTSV(tsvMap['PATIENT.tsv']).map(mapPatientRow) : []
  const encounterRows = tsvMap['PAT_ENC.tsv'] ? parseTSV(tsvMap['PAT_ENC.tsv']).map(mapEncounterRow) : []
  const orderRows = tsvMap['ORDER_PROC.tsv'] ? parseTSV(tsvMap['ORDER_PROC.tsv']).map(mapOrderRow) : []
  const resultRows = tsvMap['ORDER_RESULTS.tsv'] ? parseTSV(tsvMap['ORDER_RESULTS.tsv']).map(mapResultRow) : []
  const problemRows = tsvMap['PROBLEM_LIST.tsv'] ? parseTSV(tsvMap['PROBLEM_LIST.tsv']).map(mapProblemRow) : []
  const medRows = tsvMap['ORDER_MED.tsv'] ? parseTSV(tsvMap['ORDER_MED.tsv']).map(mapMedicationRow) : []
  const allergyRows = tsvMap['ALLERGY.tsv'] ? parseTSV(tsvMap['ALLERGY.tsv']).map(mapAllergyRow) : []
  const immuneRows = tsvMap['IMMUNE.tsv'] ? parseTSV(tsvMap['IMMUNE.tsv']).map(mapImmunizationRow) : []
  const vitalRows = tsvMap['IP_FLWSHT_MEAS.tsv'] ? parseTSV(tsvMap['IP_FLWSHT_MEAS.tsv']).map(mapVitalRow) : []
  const docRows = tsvMap['DOC_INFORMATION.tsv'] ? parseTSV(tsvMap['DOC_INFORMATION.tsv']).map(mapDocumentRow) : []

  // If no PATIENT rows found, try to infer from encounters
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

  // Build per-patient summaries
  const patientSummaries = patientRows.map(patient => {
    const patId = patient.patId
    const enc = encounterRows.filter(e => e.patId === patId)
    const ord = orderRows.filter(o => o.patId === patId)
    // Results link through orders
    const orderIds = new Set(ord.map(o => o.orderId))
    const res = resultRows.filter(r => orderIds.has(r.orderId))
    // Problem list may have patId or may not (single-patient ZIP) - use all if single patient
    const prob = patientRows.length === 1 ? problemRows : problemRows.filter(p => p.patId === patId)
    const meds = patientRows.length === 1 ? medRows : medRows.filter(m => m.patId === patId)
    const allergies = patientRows.length === 1 ? allergyRows : allergyRows.filter(a => a.patId === patId)
    const immunes = patientRows.length === 1 ? immuneRows : immuneRows.filter(im => im.patId === patId)
    const vitals = patientRows.length === 1 ? vitalRows : vitalRows.filter(v => v.patId === patId)
    const docs = patientRows.length === 1 ? docRows : docRows.filter(d => d.patId === patId)

    return buildPatientSummary(patient, enc, ord, res, prob, meds, allergies, immunes, vitals, docs)
  })

  const totalRecords = encounterRows.length + orderRows.length + resultRows.length

  // Select first patient by default
  const selectedPatient = patientSummaries[0] || null

  return {
    patients: patientSummaries,
    selectedPatient,
    encounters: encounterRows,
    orders: orderRows,
    results: resultRows,
    providers: defaultProviders,
    totalRecords,
    totalPatients: patientSummaries.length,
    dataSourceCount: 1,
    dateRange: computeDateRange(encounterRows),
    isSample: false,
  }
}

function computeDateRange(encounters) {
  if (encounters.length === 0) return { start: '', end: '' }
  const dates = encounters.map(e => e.contactDate).filter(Boolean).sort()
  return { start: dates[0], end: dates[dates.length - 1] }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Parse a list of uploaded File objects (TSV and/or ZIP files).
 * Returns { parsedData, aiSummary, selectedPatient }
 */
export async function parseUploadedFiles(fileList) {
  const tsvMap = {}

  for (const file of fileList) {
    const name = file.name.toLowerCase()

    if (name.endsWith('.zip')) {
      // Unzip and extract TSV files
      const buffer = await readFileBuffer(file)
      const zip = await JSZip.loadAsync(buffer)
      const entries = Object.entries(zip.files)

      for (const [path, entry] of entries) {
        if (entry.dir) continue
        const fileName = path.split('/').pop() // handle nested folders
        if (fileName.toLowerCase().endsWith('.tsv')) {
          const text = await entry.async('text')
          // Use the base filename as key, normalize to expected names
          const normalizedName = normalizeFileName(fileName)
          if (normalizedName) {
            // Merge: if we already have data for this table, append rows (skip header)
            if (tsvMap[normalizedName]) {
              const existingLines = tsvMap[normalizedName].split(/\r?\n/)
              const newLines = text.split(/\r?\n/).filter(l => l.trim() !== '')
              // Append data rows (skip first header line)
              tsvMap[normalizedName] = existingLines.join('\n') + '\n' + newLines.slice(1).join('\n')
            } else {
              tsvMap[normalizedName] = text
            }
          }
        }
      }
    } else if (name.endsWith('.tsv')) {
      const text = await readFileText(file)
      const normalizedName = normalizeFileName(file.name)
      if (normalizedName) {
        if (tsvMap[normalizedName]) {
          const existingLines = tsvMap[normalizedName].split(/\r?\n/)
          const newLines = text.split(/\r?\n/).filter(l => l.trim() !== '')
          tsvMap[normalizedName] = existingLines.join('\n') + '\n' + newLines.slice(1).join('\n')
        } else {
          tsvMap[normalizedName] = text
        }
      }
    }
  }

  if (Object.keys(tsvMap).length === 0) {
    throw new Error('No valid Epic TSV files found in the uploaded file(s). Expected files like PATIENT.tsv, PAT_ENC.tsv, ORDER_PROC.tsv, etc.')
  }

  const parsedData = parseEpicTSVData(tsvMap)

  // Generate AI summary for the selected patient
  const aiSummary = parsedData.selectedPatient
    ? generateAISummary(parsedData.selectedPatient)
    : null

  return {
    parsedData,
    aiSummary,
    selectedPatient: parsedData.selectedPatient,
  }
}

/** Normalize uploaded filenames to the expected canonical names */
function normalizeFileName(filename) {
  const base = filename.split('/').pop().split('\\').pop()
  const upper = base.toUpperCase()

  const knownFiles = [
    'PATIENT.TSV',
    'PAT_ENC.TSV',
    'ORDER_PROC.TSV',
    'ORDER_RESULTS.TSV',
    'PROBLEM_LIST.TSV',
    'ORDER_MED.TSV',
    'ALLERGY.TSV',
    'IMMUNE.TSV',
    'IP_FLWSHT_MEAS.TSV',
    'DOC_INFORMATION.TSV',
  ]

  // Direct match
  if (knownFiles.includes(upper)) {
    return base.split('.')[0].toUpperCase() + '.tsv'
  }

  // Fuzzy matching for common variants
  const fileMap = {
    PATIENT: 'PATIENT.tsv',
    PAT_ENC: 'PAT_ENC.tsv',
    ENCOUNTER: 'PAT_ENC.tsv',
    ORDER_PROC: 'ORDER_PROC.tsv',
    ORDER_RESULTS: 'ORDER_RESULTS.tsv',
    RESULTS: 'ORDER_RESULTS.tsv',
    PROBLEM_LIST: 'PROBLEM_LIST.tsv',
    PROBLEMS: 'PROBLEM_LIST.tsv',
    ORDER_MED: 'ORDER_MED.tsv',
    MEDICATION: 'ORDER_MED.tsv',
    ALLERGY: 'ALLERGY.tsv',
    ALLERGIES: 'ALLERGY.tsv',
    IMMUNE: 'IMMUNE.tsv',
    IMMUNIZATION: 'IMMUNE.tsv',
    IP_FLWSHT_MEAS: 'IP_FLWSHT_MEAS.tsv',
    FLOWSHEET: 'IP_FLWSHT_MEAS.tsv',
    VITALS: 'IP_FLWSHT_MEAS.tsv',
    DOC_INFORMATION: 'DOC_INFORMATION.tsv',
    DOCUMENTS: 'DOC_INFORMATION.tsv',
  }

  const nameWithoutExt = upper.replace('.TSV', '')
  return fileMap[nameWithoutExt] || null
}
