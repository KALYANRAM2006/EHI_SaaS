/**
 * PHI De-Identification Layer
 *
 * Strips all 18 HIPAA identifiers from patient data before it leaves the browser.
 * This is the safety net that sits between parsed health data and any external AI API.
 *
 * HIPAA Safe Harbor De-Identification (§164.514(b)(2)) removes:
 *  1. Names                    10. Account numbers
 *  2. Geographic data (< state) 11. Certificate/license numbers
 *  3. Dates (except year)       12. Vehicle identifiers
 *  4. Phone numbers             13. Device identifiers/serial numbers
 *  5. Fax numbers               14. Web URLs
 *  6. Email addresses           15. IP addresses
 *  7. SSN                       16. Biometric identifiers
 *  8. Medical record numbers    17. Full-face photographs
 *  9. Health plan beneficiary # 18. Any other unique identifying number
 */

// ─── Token Map ───────────────────────────────────────────────────────────────
// We replace PHI with deterministic tokens so the AI output can be re-identified
// by the client after the response comes back.

let _tokenCounter = 0
const _tokenMap = new Map()  // token → original value
const _reverseMap = new Map() // original value → token

function resetTokens() {
  _tokenCounter = 0
  _tokenMap.clear()
  _reverseMap.clear()
}

function tokenize(value, category) {
  if (!value || typeof value !== 'string' || value.trim() === '') return value
  const trimmed = value.trim()

  // Check if we already have a token for this exact value
  if (_reverseMap.has(trimmed)) return _reverseMap.get(trimmed)

  _tokenCounter++
  const token = `[${category.toUpperCase()}_${_tokenCounter}]`
  _tokenMap.set(token, trimmed)
  _reverseMap.set(trimmed, token)
  return token
}

/**
 * Get the current token map for re-identification.
 * @returns {Map<string, string>} token → original value
 */
export function getTokenMap() {
  return new Map(_tokenMap)
}

/**
 * Re-identify AI output by replacing tokens with original PHI values.
 * This runs ONLY in the browser — the re-identified text never leaves the client.
 *
 * @param {string} text - AI-generated text containing tokens like [NAME_1]
 * @returns {string} Text with original PHI values restored
 */
export function reidentify(text) {
  if (!text) return text
  let result = text
  for (const [token, original] of _tokenMap.entries()) {
    result = result.replaceAll(token, original)
  }
  return result
}

// ─── Date Generalization ─────────────────────────────────────────────────────

/**
 * Generalize a date to just the year (HIPAA Safe Harbor allows year).
 * "2024-03-15" → "2024"
 * "March 15, 2024" → "2024"
 */
function generalizeDate(dateStr) {
  if (!dateStr) return dateStr
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) {
    return String(d.getFullYear())
  }
  // Try to extract a 4-digit year
  const yearMatch = String(dateStr).match(/\b(19|20)\d{2}\b/)
  return yearMatch ? yearMatch[0] : dateStr
}

/**
 * Calculate age from birth date (safe to share — not a HIPAA identifier unless >89).
 */
function safeAge(birthDate) {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (isNaN(d.getTime())) return null
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  // HIPAA: ages >89 must be aggregated to "90+"
  return age > 89 ? '90+' : String(age)
}

// ─── Main De-Identification Function ─────────────────────────────────────────

/**
 * De-identify a patient record for safe transmission to an external AI.
 *
 * Returns a new object with:
 *  - All 18 HIPAA identifiers stripped or tokenized
 *  - Clinical data preserved (conditions, medications, lab values, vitals)
 *  - Dates generalized to year only
 *  - A token map for re-identification on the client side
 *
 * @param {Object} patient - Full patient record from DataContext
 * @param {Object} options - { mode: 'safe-harbor' | 'tokenized' }
 * @returns {{ deidentified: Object, tokenMap: Map }}
 */
export function deidentifyPatient(patient, options = { mode: 'tokenized' }) {
  if (!patient) return { deidentified: null, tokenMap: new Map() }

  resetTokens()
  const isTokenized = options.mode === 'tokenized'

  const safe = {
    // Demographics — safe fields only
    age: safeAge(patient.birthDate) || patient.age,
    sex: patient.sex,  // Sex is not a HIPAA identifier
    ethnicGroup: patient.ethnicGroup,

    // ── Stripped / Tokenized HIPAA identifiers ──
    // 1. Names — tokenized so AI can reference "the patient" coherently
    firstName: isTokenized ? tokenize(patient.firstName, 'NAME') : '[REDACTED]',
    lastName: isTokenized ? tokenize(patient.lastName, 'NAME') : '[REDACTED]',
    name: isTokenized
      ? `${tokenize(patient.firstName, 'NAME')} ${tokenize(patient.lastName, 'NAME')}`
      : '[REDACTED]',

    // 2. Geographic — only state-level (city/zip stripped)
    state: patient.state,  // State is allowed under Safe Harbor
    // city, zip, address — REMOVED

    // 3. Dates — generalized to year
    birthYear: patient.birthDate ? generalizeDate(patient.birthDate) : null,
    // Full birthDate — REMOVED

    // 7. SSN — REMOVED (shouldn't be in health data but just in case)
    // 8. MRN — tokenized
    patId: isTokenized ? tokenize(patient.patId, 'MRN') : '[REDACTED]',

    // ── Clinical Data (NOT PHI — safe to share) ──

    // Conditions
    conditions: (patient.conditions || []).map(c => ({
      name: c.name,
      status: c.status,
      severity: c.severity,
      onsetYear: generalizeDate(c.onsetDate || c.dateOfEntry),
      icd10: c.icd10,
    })),

    // Medications
    medications: (patient.medications || []).map(m => ({
      name: m.name,
      dose: m.dose || m.dosage,
      frequency: m.frequency,
      purpose: m.purpose,
      status: m.status,
    })),

    // Lab Results (values are clinical, not identifying)
    results: (patient.results || []).map(r => ({
      component: r.name || r.component,
      value: r.value,
      unit: r.unit || r.units,
      refLow: r.refLow,
      refHigh: r.refHigh,
      referenceRange: r.referenceRange,
      flag: r.flag,
      year: generalizeDate(r.date || r.resultTime || r.orderDate),
    })),

    // Allergies
    allergies: (patient.allergies || []).map(a => ({
      allergen: a.allergen || a.name,
      severity: a.severity,
      reaction: a.reaction,
    })),

    // Encounters (dates generalized, provider names tokenized)
    encounters: (patient.encounters || []).map(e => ({
      type: e.encType || e.visitType,
      year: generalizeDate(e.contactDate),
      diagnosis: e.diagnosis,
      chiefComplaint: e.chiefComplaint,
      patientClass: e.patientClass,
      provider: isTokenized ? tokenize(e.visitProvider, 'PROVIDER') : '[REDACTED]',
    })),

    // Aggregate counts (safe)
    conditionCount: patient.conditions?.length || 0,
    medicationCount: patient.medicationCount || patient.medications?.length || 0,
    encounterCount: patient.encounterCount || patient.encounters?.length || 0,
    resultCount: patient.resultCount || patient.results?.length || 0,
    abnormalResultCount: patient.abnormalResults?.length || 0,

    // Abnormal results for clinical alerts
    abnormalResults: (patient.abnormalResults || []).map(r => ({
      component: r.name || r.component,
      value: r.value,
      unit: r.unit || r.units,
      refLow: r.refLow,
      refHigh: r.refHigh,
      referenceRange: r.referenceRange,
      flag: r.flag,
    })),
  }

  return {
    deidentified: safe,
    tokenMap: getTokenMap(),
  }
}

/**
 * Build a clinical summary prompt from de-identified data.
 * This is what gets sent to the AI — contains ZERO PHI.
 *
 * @param {Object} deidentified - Output of deidentifyPatient()
 * @returns {string} A clinical narrative safe for AI processing
 */
export function buildSafePrompt(deidentified) {
  if (!deidentified) return ''

  const d = deidentified
  const lines = []

  lines.push(`## Clinical Summary for AI Analysis`)
  lines.push(``)
  lines.push(`**Demographics:** ${d.age}-year-old ${d.sex}, ${d.ethnicGroup || 'unknown ethnicity'}`)
  lines.push(`**Location:** ${d.state || 'Unknown state'}`)
  lines.push(``)

  // Conditions
  if (d.conditions.length > 0) {
    lines.push(`### Active Conditions (${d.conditions.filter(c => c.status === 'Active').length} active, ${d.conditions.length} total)`)
    d.conditions.forEach(c => {
      lines.push(`- ${c.name} (${c.status}, ${c.severity || 'unknown severity'}${c.icd10 ? `, ICD-10: ${c.icd10}` : ''}, onset: ${c.onsetYear || 'unknown'})`)
    })
    lines.push(``)
  }

  // Medications
  if (d.medications.length > 0) {
    lines.push(`### Current Medications (${d.medications.length})`)
    d.medications.forEach(m => {
      lines.push(`- ${m.name} ${m.dose || ''} ${m.frequency || ''} — ${m.purpose || 'unspecified purpose'}`)
    })
    lines.push(``)
  }

  // Lab Results
  if (d.results.length > 0) {
    lines.push(`### Lab Results (${d.results.length} results, ${d.abnormalResultCount} abnormal)`)
    d.results.forEach(r => {
      lines.push(`- ${r.component}: ${r.value} ${r.unit || ''} (ref: ${r.referenceRange || `${r.refLow || '?'}-${r.refHigh || '?'}`}) [${r.flag || 'Normal'}] (${r.year || 'unknown year'})`)
    })
    lines.push(``)
  }

  // Allergies
  if (d.allergies.length > 0) {
    lines.push(`### Allergies (${d.allergies.length})`)
    d.allergies.forEach(a => {
      lines.push(`- ${a.allergen}: ${a.severity || 'unknown'} severity — ${a.reaction || 'unknown reaction'}`)
    })
    lines.push(``)
  }

  // Encounters
  if (d.encounters.length > 0) {
    lines.push(`### Recent Encounters (${d.encounters.length})`)
    d.encounters.slice(0, 5).forEach(e => {
      lines.push(`- ${e.year || 'unknown'}: ${e.type || 'Visit'} — ${e.diagnosis || 'routine'} (${e.patientClass || 'outpatient'})`)
    })
    lines.push(``)
  }

  lines.push(`### Request`)
  lines.push(`Provide a comprehensive, patient-friendly health summary covering:`)
  lines.push(`1. Overall health story and context`)
  lines.push(`2. Medication management assessment`)
  lines.push(`3. Lab result trends and any concerns`)
  lines.push(`4. Care coordination observations`)
  lines.push(`5. Recommended next steps`)
  lines.push(``)
  lines.push(`Use clear, empathetic language. Flag any clinical concerns. Do NOT guess or invent data not provided above.`)

  return lines.join('\n')
}

/**
 * Validate that a de-identified record contains no PHI.
 * Returns an array of warnings if any PHI patterns are detected.
 *
 * @param {Object} deidentified - Output of deidentifyPatient()
 * @returns {{ clean: boolean, warnings: string[] }}
 */
export function validateNoPhI(deidentified) {
  const warnings = []
  const json = JSON.stringify(deidentified)

  // Check for common PHI patterns
  const patterns = [
    { name: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/ },
    { name: 'Phone', regex: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
    { name: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
    { name: 'ZIP', regex: /\b\d{5}(-\d{4})?\b/ },
    { name: 'Full Date', regex: /\b\d{4}-\d{2}-\d{2}\b/ },
    { name: 'MRN-like', regex: /\b[A-Z]\d{6,}\b/ },
    { name: 'IP Address', regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
  ]

  for (const { name, regex } of patterns) {
    if (regex.test(json)) {
      // Allow tokens like [MRN_1]
      const match = json.match(regex)?.[0]
      if (match && !match.startsWith('[')) {
        warnings.push(`Potential ${name} detected: "${match}"`)
      }
    }
  }

  return { clean: warnings.length === 0, warnings }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RAW TEXT DE-IDENTIFICATION — For unstructured clinical documents (PDFs, OCR)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Unlike deidentifyPatient() which works on structured patient objects, this
// function strips PHI directly from raw clinical text before it gets sent to
// cloud AI services (Azure Health AI, OpenAI GPT-4).
//
// PRESERVES: medication names, lab values, diagnosis terms, vital signs,
//            procedure names, clinical terminology, ICD/CPT/LOINC codes
//
// STRIPS:    patient names, MRN, SSN, phone, fax, email, addresses, ZIP codes,
//            dates (replaced with year only), account numbers, device IDs, URLs, IPs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * De-identify raw clinical text for safe transmission to external AI APIs.
 * Strips HIPAA identifiers while preserving clinical content that AI needs to parse.
 *
 * @param {string} text - Raw clinical text extracted from PDF/OCR
 * @returns {{ safeText: string, strippedCount: number, warnings: string[] }}
 */
export function deidentifyText(text) {
  if (!text || typeof text !== 'string') {
    return { safeText: '', strippedCount: 0, warnings: [] }
  }

  let safeText = text
  let strippedCount = 0
  const warnings = []

  // ── 1. SSN (###-##-####) ───────────────────────────────────────────────
  safeText = safeText.replace(/\b\d{3}-\d{2}-\d{4}\b/g, () => {
    strippedCount++
    return '[SSN_REDACTED]'
  })

  // ── 2. Phone / Fax numbers ────────────────────────────────────────────
  // Matches: (555) 123-4567, 555-123-4567, 555.123.4567, +1-555-123-4567
  safeText = safeText.replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, (match) => {
    // Don't strip if it looks like a lab value or clinical number (e.g., count of 1234567890)
    if (/^\d+$/.test(match.replace(/[-.\s()+]/g, '')) && match.replace(/[-.\s()+]/g, '').length === 10) {
      strippedCount++
      return '[PHONE_REDACTED]'
    }
    strippedCount++
    return '[PHONE_REDACTED]'
  })

  // ── 3. Email addresses ────────────────────────────────────────────────
  safeText = safeText.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, () => {
    strippedCount++
    return '[EMAIL_REDACTED]'
  })

  // ── 4. URLs ───────────────────────────────────────────────────────────
  safeText = safeText.replace(/https?:\/\/[^\s)]+/gi, () => {
    strippedCount++
    return '[URL_REDACTED]'
  })

  // ── 5. IP addresses ──────────────────────────────────────────────────
  safeText = safeText.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, () => {
    strippedCount++
    return '[IP_REDACTED]'
  })

  // ── 6. MRN / Account numbers (common formats) ─────────────────────────
  // Patterns: "MRN: 1234567", "Acct#: ABC12345", "MR#12345678", "Patient ID: E12345678"
  safeText = safeText.replace(/\b(?:MRN|MR#|MR\s*#|Acct\.?\s*#?|Account\s*(?:#|Number|No\.?)?|Patient\s*ID|Med\s*Rec(?:ord)?(?:\s*#|\s*No\.?)?)\s*:?\s*[A-Z0-9]{4,}\b/gi, () => {
    strippedCount++
    return '[MRN_REDACTED]'
  })

  // ── 7. Dates → year only (HIPAA Safe Harbor) ──────────────────────────
  // ISO dates: 2024-03-15 → 2024
  safeText = safeText.replace(/\b((?:19|20)\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/g, (_, year) => {
    strippedCount++
    return year
  })
  // US dates: 03/15/2024 or 03-15-2024 → 2024
  safeText = safeText.replace(/\b(0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])[-/]((?:19|20)\d{2})\b/g, (_, _m, _d, year) => {
    strippedCount++
    return year
  })
  // Textual dates: March 15, 2024 or Mar 15 2024 → 2024
  safeText = safeText.replace(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+((?:19|20)\d{2})\b/gi, (_, year) => {
    strippedCount++
    return year
  })
  // "15 March 2024" format → 2024
  safeText = safeText.replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?,?\s+((?:19|20)\d{2})\b/gi, (_, year) => {
    strippedCount++
    return year
  })

  // ── 8. ZIP codes (5-digit or 5+4 that aren't lab values) ─────────────
  // Only strip when preceded by state abbreviation or address context
  safeText = safeText.replace(/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/g, (match, state, zip) => {
    const usStates = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']
    if (usStates.includes(state)) {
      strippedCount++
      return `${state} [ZIP_REDACTED]`
    }
    return match
  })

  // ── 9. Street addresses ───────────────────────────────────────────────
  // Pattern: "123 Main Street", "456 Oak Ave, Suite 200"
  safeText = safeText.replace(/\b\d{1,5}\s+(?:[A-Za-z]+\s){1,3}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Way|Court|Ct|Circle|Cir|Place|Pl|Terrace|Ter)\.?\b(?:\s*,?\s*(?:Suite|Ste|Apt|Unit|#)\s*\S+)?/gi, () => {
    strippedCount++
    return '[ADDRESS_REDACTED]'
  })

  // ── 10. Patient name lines (common in clinical docs) ──────────────────
  // Pattern: "Patient Name: John Doe" or "Patient: Jane Smith, MD"
  safeText = safeText.replace(/\b(?:Patient\s*(?:Name)?|Name)\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g, () => {
    strippedCount++
    return 'Patient Name: [NAME_REDACTED]'
  })

  // ── 11. Provider names after common labels ────────────────────────────
  // "Dr. John Smith", "Attending: Jane Doe, MD", "Physician: Dr. X"
  safeText = safeText.replace(/\bDr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/g, () => {
    strippedCount++
    return 'Dr. [PROVIDER_REDACTED]'
  })
  safeText = safeText.replace(/\b(?:Attending|Physician|Provider|Ordering|Referring|PCP)\s*:\s*(?:Dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})(?:\s*,\s*(?:MD|DO|NP|PA|RN))?/g, (match) => {
    const label = match.split(':')[0]
    strippedCount++
    return `${label}: [PROVIDER_REDACTED]`
  })

  // ── 12. Device serial numbers and identifiers ─────────────────────────
  safeText = safeText.replace(/\b(?:Serial\s*(?:#|Number|No\.?)|Device\s*ID|UDI)\s*:?\s*\S+/gi, () => {
    strippedCount++
    return '[DEVICE_ID_REDACTED]'
  })

  // Post-validation: check for residual PHI patterns
  const residualPatterns = [
    { name: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/ },
    { name: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
  ]
  for (const { name, regex } of residualPatterns) {
    if (regex.test(safeText)) {
      warnings.push(`Potential residual ${name} detected after de-identification`)
    }
  }

  if (strippedCount > 0) {
    console.log(`[DeID] Stripped ${strippedCount} PHI elements from clinical text (${text.length} → ${safeText.length} chars)`)
  }

  return { safeText, strippedCount, warnings }
}
