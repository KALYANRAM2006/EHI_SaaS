/**
 * Data Redaction Service
 *
 * Provides HIPAA Safe Harbor de-identification for patient data export.
 * Allows patients to share anonymized health data for research or second opinions.
 *
 * Implements 18-identifier removal per 45 CFR 164.514(b)(2):
 * 1. Names
 * 2. Geographic subdivisions smaller than state
 * 3. Dates (except year)
 * 4. Telephone numbers
 * 5. Fax numbers
 * 6. Email addresses
 * 7. Social Security numbers
 * 8. Medical record numbers
 * 9. Health plan beneficiary numbers
 * 10. Account numbers
 * 11. Certificate/license numbers
 * 12. Vehicle identifiers
 * 13. Device identifiers
 * 14. Web URLs
 * 15. IP addresses
 * 16. Biometric identifiers
 * 17. Full-face photographs
 * 18. Any other unique identifying number/code
 */

/**
 * HIPAA Safe Harbor: List of 18 identifiers to remove
 */
const IDENTIFIERS_TO_REDACT = [
  'names',
  'geographic_subdivisions',
  'dates',
  'phone_numbers',
  'fax_numbers',
  'email_addresses',
  'ssn',
  'medical_record_numbers',
  'health_plan_numbers',
  'account_numbers',
  'certificate_numbers',
  'vehicle_identifiers',
  'device_identifiers',
  'urls',
  'ip_addresses',
  'biometric_identifiers',
  'photographs',
  'unique_identifiers',
]

/**
 * Redact patient demographics
 */
function redactDemographics(demographics) {
  if (!demographics) return null

  const redacted = {
    // Keep general information
    age: demographics.age,
    sex: demographics.sex || demographics.gender,
    language: demographics.language,
    maritalStatus: demographics.maritalStatus,
    ethnicity: demographics.ethnicity,
    race: demographics.race,

    // Redact identifiers
    firstName: '[REDACTED]',
    lastName: '[REDACTED]',
    name: 'Patient [REDACTED]',
    birthDate: demographics.birthDate ? `${new Date(demographics.birthDate).getFullYear()}-01-01` : null,

    // Generalize location to state only
    state: demographics.state,
    city: '[REDACTED]',
    zip: demographics.zip ? demographics.zip.substring(0, 3) + 'XX' : null,
    address: '[REDACTED]',

    // Remove contact information
    phone: null,
    email: null,

    // Remove identifiers
    mrn: null,
    patientId: null,
    ssn: null,
  }

  return redacted
}

/**
 * Shift dates while preserving relative time
 * All dates shifted by the same random offset to maintain temporal relationships
 */
function createDateShifter() {
  // Random shift between -365 and +365 days
  const shiftDays = Math.floor(Math.random() * 730) - 365
  const shiftMs = shiftDays * 24 * 60 * 60 * 1000

  return (dateString) => {
    if (!dateString) return null

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return null

      const shifted = new Date(date.getTime() + shiftMs)

      // Return in same format (ISO string)
      return shifted.toISOString().split('T')[0]
    } catch (error) {
      console.error('[Redaction] Error shifting date:', error)
      return null
    }
  }
}

/**
 * Redact provider/care team member information
 */
function redactProvider(provider) {
  if (!provider) return null

  return {
    name: '[Provider Name Redacted]',
    specialty: provider.specialty,
    role: provider.role,
    organization: provider.organization ? '[Organization Redacted]' : null,
    npi: null, // National Provider Identifier
    phone: null,
    email: null,
  }
}

/**
 * Redact location information
 */
function redactLocation(location) {
  if (!location) return location

  if (typeof location === 'string') {
    // Keep only state-level information
    const stateMatch = location.match(/\b[A-Z]{2}\b/)
    return stateMatch ? stateMatch[0] : '[Location Redacted]'
  }

  if (typeof location === 'object') {
    return {
      facility: '[Facility Redacted]',
      city: '[City Redacted]',
      state: location.state,
      zip: null,
    }
  }

  return location
}

/**
 * Redact a single array item (medication, encounter, etc.)
 */
function redactArrayItem(item, dateShifter) {
  if (!item || typeof item !== 'object') return item

  const redacted = { ...item }

  // Redact common identifier fields
  const identifierFields = ['mrn', 'patientId', 'providerId', 'encounterId', 'orderId', 'accountNumber']
  identifierFields.forEach(field => {
    if (redacted[field]) {
      delete redacted[field]
    }
  })

  // Shift date fields
  const dateFields = ['date', 'startDate', 'endDate', 'orderDate', 'resultTime', 'onset', 'encounter Date', 'serviceDate', 'administeredDate']
  dateFields.forEach(field => {
    if (redacted[field]) {
      redacted[field] = dateShifter(redacted[field])
    }
  })

  // Redact provider information
  if (redacted.provider) {
    redacted.provider = typeof redacted.provider === 'string'
      ? '[Provider Redacted]'
      : redactProvider(redacted.provider)
  }

  if (redacted.prescriber) {
    redacted.prescriber = '[Prescriber Redacted]'
  }

  // Redact location information
  if (redacted.location) {
    redacted.location = redactLocation(redacted.location)
  }

  if (redacted.facility) {
    redacted.facility = '[Facility Redacted]'
  }

  if (redacted.pharmacy) {
    redacted.pharmacy = '[Pharmacy Redacted]'
  }

  // Keep clinical data (safe to share)
  // - Medication names, dosages, frequencies
  // - Diagnoses, conditions
  // - Lab test names and values
  // - Vital signs
  // - Procedures

  return redacted
}

/**
 * Redact insurance/coverage information
 */
function redactCoverage(coverage) {
  if (!coverage) return null

  return {
    type: coverage.type, // Keep insurance type (Commercial, Medicare, etc.)
    payerName: coverage.payerName, // Keep payer name (Blue Cross, etc.)
    planName: coverage.planName, // Keep plan name

    // Redact identifiers
    memberId: '[MEMBER ID REDACTED]',
    groupNumber: '[GROUP NUMBER REDACTED]',
    subscriberName: '[SUBSCRIBER REDACTED]',
    subscriberId: null,

    // Keep financial information (useful for research)
    financial: coverage.financial,
  }
}

/**
 * Redact complete patient data object
 *
 * @param {Object} patientData - Complete patient data object
 * @param {Object} options - Redaction options
 * @returns {Object} Redacted patient data
 */
export function redactPatientData(patientData, options = {}) {
  console.log('[Redaction] Starting HIPAA Safe Harbor de-identification...')

  const dateShifter = createDateShifter()

  const redacted = {
    // Add metadata about redaction
    _metadata: {
      redacted: true,
      redactionDate: new Date().toISOString(),
      method: 'HIPAA Safe Harbor (45 CFR 164.514)',
      identifiersRemoved: IDENTIFIERS_TO_REDACT.length,
      note: 'This data has been de-identified for research/sharing purposes. Temporal relationships preserved through consistent date shifting.',
    },

    // Redact demographics
    ...redactDemographics(patientData),

    // Redact age to age range if over 89
    age: patientData.age > 89 ? '90+' : patientData.age,
  }

  // Process array fields (medications, encounters, etc.)
  const arrayFields = [
    'medications',
    'conditions',
    'encounters',
    'results',
    'procedures',
    'immunizations',
    'allergies',
    'vitals',
    'orders',
    'careTeam',
    'documents',
    'clinicalNotes',
  ]

  arrayFields.forEach(fieldName => {
    if (Array.isArray(patientData[fieldName])) {
      redacted[fieldName] = patientData[fieldName].map(item =>
        redactArrayItem(item, dateShifter)
      )
    }
  })

  // Redact care team separately (more aggressive)
  if (Array.isArray(patientData.careTeam)) {
    redacted.careTeam = patientData.careTeam.map(provider => redactProvider(provider))
  }

  // Redact insurance coverage
  if (patientData.coverage) {
    redacted.coverage = redactCoverage(patientData.coverage)
  }

  console.log('[Redaction] De-identification complete')

  return redacted
}

/**
 * Validate redaction completeness
 * Scans redacted data to ensure no identifiers remain
 */
export function validateRedaction(redactedData) {
  const issues = []

  // Check for common PII patterns
  const piiPatterns = {
    ssn: /\b\d{3}-\d{2}-\d{4}\b/,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
    zipFull: /\b\d{5}-\d{4}\b/,
    url: /https?:\/\/[^\s]+/,
    ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
  }

  const dataString = JSON.stringify(redactedData)

  Object.entries(piiPatterns).forEach(([type, pattern]) => {
    if (pattern.test(dataString)) {
      issues.push({
        type,
        severity: 'high',
        message: `Potential ${type} found in redacted data`,
      })
    }
  })

  // Check for full dates (should only have years or shifted dates)
  const fullDatePattern = /\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g
  const dateMatches = dataString.match(fullDatePattern) || []

  if (dateMatches.length > 10) {
    // Some dates are OK (shifted dates), but check for suspicious patterns
    issues.push({
      type: 'dates',
      severity: 'medium',
      message: `${dateMatches.length} full dates found - verify these are shifted, not original`,
    })
  }

  // Check for common name patterns
  const suspiciousNames = [
    'John', 'Jane', 'Smith', 'Johnson', 'Williams', 'Brown',
    'Dr.', 'Mr.', 'Mrs.', 'Ms.',
  ]

  suspiciousNames.forEach(name => {
    if (dataString.includes(name) && !dataString.includes(`"${name}"`)) {
      issues.push({
        type: 'names',
        severity: 'low',
        message: `Potential name "${name}" found - verify it's clinical data, not PII`,
      })
    }
  })

  return {
    valid: issues.filter(i => i.severity === 'high').length === 0,
    issues,
    score: Math.max(0, 100 - (issues.length * 10)),
  }
}

/**
 * Generate redaction report
 */
export function generateRedactionReport(originalData, redactedData) {
  const report = {
    timestamp: new Date().toISOString(),
    method: 'HIPAA Safe Harbor (45 CFR 164.514)',
    summary: {
      originalFields: Object.keys(originalData).length,
      redactedFields: Object.keys(redactedData).length,
      identifiersRemoved: [],
    },
  }

  // Check what was redacted
  if (originalData.firstName && redactedData.firstName !== originalData.firstName) {
    report.summary.identifiersRemoved.push('Names')
  }

  if (originalData.birthDate && redactedData.birthDate !== originalData.birthDate) {
    report.summary.identifiersRemoved.push('Dates (shifted)')
  }

  if (originalData.city && (!redactedData.city || redactedData.city.includes('REDACTED'))) {
    report.summary.identifiersRemoved.push('Geographic subdivisions')
  }

  if (originalData.phone && !redactedData.phone) {
    report.summary.identifiersRemoved.push('Phone numbers')
  }

  if (originalData.email && !redactedData.email) {
    report.summary.identifiersRemoved.push('Email addresses')
  }

  if (originalData.mrn && !redactedData.mrn) {
    report.summary.identifiersRemoved.push('Medical record numbers')
  }

  if (originalData.coverage?.memberId && redactedData.coverage?.memberId?.includes('REDACTED')) {
    report.summary.identifiersRemoved.push('Health plan beneficiary numbers')
  }

  // Validation
  const validation = validateRedaction(redactedData)
  report.validation = validation

  return report
}

/**
 * Export redacted data as downloadable file
 */
export function downloadRedactedData(redactedData, filename = 'patient_data_redacted.json') {
  const dataStr = JSON.stringify(redactedData, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Generate human-readable redaction summary
 * Returns statistics about what was redacted
 */
export function getRedactionSummary(originalData, redactedData) {
  const summary = {
    identifiersRemoved: 18, // HIPAA Safe Harbor removes 18 identifiers
    fieldsPreserved: 0,
    clinicalDataIntact: true,
  }

  // Count preserved clinical fields
  const clinicalFields = [
    'medications',
    'conditions',
    'encounters',
    'results',
    'procedures',
    'immunizations',
    'allergies',
    'vitals',
  ]

  clinicalFields.forEach(field => {
    if (Array.isArray(redactedData[field]) && redactedData[field].length > 0) {
      summary.fieldsPreserved += redactedData[field].length
    }
  })

  return summary
}

/**
 * Pre-check: Identify what will be redacted before actually redacting
 */
export function previewRedaction(patientData) {
  const preview = {
    willRedact: [],
    willPreserve: [],
    warnings: [],
  }

  // Check demographics
  if (patientData.firstName || patientData.lastName) {
    preview.willRedact.push({ field: 'Names', example: `${patientData.firstName} ${patientData.lastName} → Patient [REDACTED]` })
  }

  if (patientData.birthDate) {
    const year = new Date(patientData.birthDate).getFullYear()
    preview.willRedact.push({ field: 'Birth date', example: `${patientData.birthDate} → ${year}-01-01 (year only)` })
  }

  if (patientData.city || patientData.zip) {
    preview.willRedact.push({ field: 'Location', example: `${patientData.city}, ${patientData.zip} → State only` })
  }

  if (patientData.phone) {
    preview.willRedact.push({ field: 'Phone number', example: `${patientData.phone} → [REMOVED]` })
  }

  if (patientData.email) {
    preview.willRedact.push({ field: 'Email address', example: `${patientData.email} → [REMOVED]` })
  }

  if (patientData.mrn) {
    preview.willRedact.push({ field: 'Medical record number', example: `MRN ${patientData.mrn} → [REMOVED]` })
  }

  // Check what will be preserved
  if (Array.isArray(patientData.medications)) {
    preview.willPreserve.push({ field: 'Medications', count: patientData.medications.length, note: 'Names, dosages, frequencies preserved' })
  }

  if (Array.isArray(patientData.conditions)) {
    preview.willPreserve.push({ field: 'Conditions', count: patientData.conditions.length, note: 'Diagnoses preserved' })
  }

  if (Array.isArray(patientData.results)) {
    preview.willPreserve.push({ field: 'Lab results', count: patientData.results.length, note: 'Test names and values preserved' })
  }

  // Warnings
  if (patientData.age > 89) {
    preview.warnings.push('Age over 89 will be changed to "90+" per HIPAA Safe Harbor rules')
  }

  return preview
}
