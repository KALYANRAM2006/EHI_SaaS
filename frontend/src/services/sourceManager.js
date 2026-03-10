/**
 * Source Manager — Multi-Source Data Merging, Lineage Tracking & Patient Verification
 *
 * Handles:
 *   1. Data source registration (each uploaded file = one source)
 *   2. Per-record lineage tagging (_source, _sourceName, _sourceColor)
 *   3. Patient identity verification using demographics (Name + DOB + Sex)
 *      — NOT MRN, since MRNs differ across EMR systems
 *   4. Data reconciliation / merge into unified patient view
 *   5. Patient ID remapping when same patient has different IDs across sources
 *   6. Standard code enrichment (LOINC, ICD-10, SNOMED CT, RxNorm, NDC, CPT, CVX)
 *      applied to ALL records before deduplication
 *
 * All processing is 100% client-side. No data leaves the browser.
 */

import { enrichAllRecords } from './standardCodeEnricher'

// ─── Source Colors (rotating palette) ────────────────────────────────────────

const SOURCE_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#10b981', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#ef4444', // red
]

const SOURCE_BG_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-red-500',
]

let sourceCounter = 0

/**
 * Create a new data source descriptor for a file.
 */
export function createDataSource(fileName, existingCount = 0) {
  const idx = (existingCount + sourceCounter++) % SOURCE_COLORS.length
  return {
    id: `source-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: fileName,
    uploadDate: new Date().toISOString(),
    color: SOURCE_COLORS[idx],
    bgClass: SOURCE_BG_COLORS[idx],
    recordCount: 0,
    categories: { medications: 0, encounters: 0, allergies: 0, immunizations: 0, conditions: 0, results: 0, orders: 0 },
    patient: null,       // { name, firstName, lastName, birthDate, sex, age }
    matchStatus: null,   // 'first' | 'match' | 'mismatch'
    matchDetails: '',    // human-readable match explanation
  }
}

/**
 * Tag every record in a dataset with source lineage fields.
 */
export function tagRecordsWithSource(records, source) {
  if (!Array.isArray(records)) return []
  return records.map(r => ({
    ...r,
    _source: source.id,
    _sourceName: source.name,
    _sourceColor: source.color,
  }))
}

// ─── Patient Identity (Demographics-Based — No MRN) ────────────────────────

/**
 * Extract patient identity from a parsed patient record.
 * Returns a normalized identity object for comparison.
 * Uses Name + DOB + Sex — NOT MRN/PatID (those differ across EMRs).
 */
export function extractPatientIdentity(patient) {
  if (!patient) return null

  // Parse "Last, First M" format
  let firstName = (patient.firstName || '').trim().toLowerCase()
  let lastName = (patient.lastName || '').trim().toLowerCase()
  const fullName = (patient.name || '').trim().toLowerCase()

  if (!firstName && !lastName && fullName) {
    const parts = fullName.split(',').map(s => s.trim())
    if (parts.length >= 2) {
      lastName = parts[0]
      firstName = parts[1].split(' ')[0]
    } else {
      const words = fullName.split(' ')
      firstName = words[0] || ''
      lastName = words[words.length - 1] || ''
    }
  }

  let birthDate = (patient.birthDate || patient.dob || '').trim()
  // Normalize date to YYYY-MM-DD
  if (birthDate) {
    try { birthDate = new Date(birthDate).toISOString().split('T')[0] } catch { /* keep original */ }
  }

  let sex = (patient.sex || patient.gender || '').trim().toLowerCase()
  if (sex) sex = sex.charAt(0) // 'm' or 'f'

  let age = patient.age
  if (!age && birthDate) {
    const birth = new Date(birthDate)
    const now = new Date()
    age = now.getFullYear() - birth.getFullYear()
    if (now.getMonth() < birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  }

  return { firstName, lastName, birthDate, sex, age, fullName }
}

/**
 * Verify that a new patient matches the existing patient using
 * DEMOGRAPHICS ONLY: Name + Date of Birth + Sex.
 * MRN / Patient ID is intentionally NOT used — it differs across EMR systems.
 *
 * Returns { match, confidence, reason, score }
 */
export function verifyPatientMatch(existingPatient, newPatient) {
  const a = extractPatientIdentity(existingPatient)
  const b = extractPatientIdentity(newPatient)

  if (!a || !b) return { match: false, confidence: 'low', reason: 'Missing patient data', score: 0 }

  let score = 0
  const checks = []

  // ── Name match (strongest demographic signal) ──
  if (a.firstName && b.firstName && a.lastName && b.lastName) {
    if (a.firstName === b.firstName && a.lastName === b.lastName) {
      score += 40
      checks.push('Full name matches')
    } else if (a.lastName === b.lastName) {
      score += 15
      checks.push('Last name matches')
    } else {
      score -= 25
      checks.push('Name MISMATCH')
    }
  } else if (a.fullName && b.fullName) {
    if (a.fullName === b.fullName) {
      score += 40
      checks.push('Name matches')
    }
  }

  // ── DOB match ──
  if (a.birthDate && b.birthDate) {
    if (a.birthDate === b.birthDate) {
      score += 35
      checks.push('Date of birth matches')
    } else {
      score -= 30
      checks.push('Date of birth MISMATCH')
    }
  }

  // ── Sex match ──
  if (a.sex && b.sex) {
    if (a.sex === b.sex) {
      score += 15
      checks.push('Sex matches')
    } else {
      score -= 15
      checks.push('Sex MISMATCH')
    }
  }

  if (score >= 50) return { match: true, confidence: 'high', reason: checks.join(', '), score }
  if (score >= 30) return { match: true, confidence: 'medium', reason: checks.join(', '), score }
  if (score > 0)   return { match: false, confidence: 'low', reason: `Weak match (${checks.join(', ')}). May be a different patient.`, score }
  return { match: false, confidence: 'low', reason: checks.length > 0 ? checks.join(', ') : 'No matching identity fields found. Likely a different patient.', score }
}

/**
 * Check if two patients are demographically the same person.
 * Used for merging when patients from different EMRs have different IDs.
 */
export function demographicMatch(patA, patB) {
  const a = extractPatientIdentity(patA)
  const b = extractPatientIdentity(patB)
  if (!a || !b) return false
  const nameMatch = a.firstName && b.firstName && a.lastName && b.lastName &&
    a.firstName === b.firstName && a.lastName === b.lastName
  const dobMatch = a.birthDate && b.birthDate && a.birthDate === b.birthDate
  // Name + DOB is sufficient for demographic match
  return nameMatch && dobMatch
}

/**
 * Remap patient IDs in all clinical records.
 * When the same patient has different IDs across EMR sources,
 * remap all records from oldId → newId so they appear under one patient.
 */
export function remapPatientIds(data, oldId, newId) {
  if (!data || oldId === newId) return data
  const remapped = { ...data }
  const cats = ['medications', 'encounters', 'allergies', 'results', 'orders', 'conditions', 'immunizations']
  cats.forEach(cat => {
    if (Array.isArray(remapped[cat])) {
      remapped[cat] = remapped[cat].map(r =>
        r.patId === oldId ? { ...r, patId: newId } : r
      )
    }
  })
  return remapped
}

/**
 * Merge multiple patient records from different sources into one unified record.
 * Uses "latest wins" for demographics, concatenates arrays for clinical data.
 */
export function mergePatientSources(patients) {
  if (!patients || patients.length === 0) return null
  if (patients.length === 1) return patients[0]

  // Start with the first patient as base, merge in subsequent
  const merged = { ...patients[0] }

  for (let i = 1; i < patients.length; i++) {
    const p = patients[i]
    // Fill in missing demographics (don't overwrite existing)
    if (!merged.firstName && p.firstName) merged.firstName = p.firstName
    if (!merged.lastName && p.lastName) merged.lastName = p.lastName
    if (!merged.birthDate && (p.birthDate || p.dob)) merged.birthDate = p.birthDate || p.dob
    if (!merged.sex && (p.sex || p.gender)) merged.sex = p.sex || p.gender
    if (!merged.city && p.city) merged.city = p.city
    if (!merged.state && p.state) merged.state = p.state
    if (!merged.zip && p.zip) merged.zip = p.zip
    if (!merged.language && p.language) merged.language = p.language
    if (!merged.maritalStatus && p.maritalStatus) merged.maritalStatus = p.maritalStatus
    if (!merged.ethnicGroup && p.ethnicGroup) merged.ethnicGroup = p.ethnicGroup
    // Merge clinical arrays
    const arrayCats = ['encounters', 'orders', 'results', 'conditions', 'medications', 'allergies', 'immunizations', 'abnormalResults']
    arrayCats.forEach(cat => {
      if (Array.isArray(p[cat]) && p[cat].length > 0) {
        merged[cat] = [...(merged[cat] || []), ...p[cat]]
      }
    })
    // Update counts
    merged.encounterCount = (merged.encounters || []).length
    merged.orderCount = (merged.orders || []).length
    merged.resultCount = (merged.results || []).length
    merged.conditionCount = (merged.conditions || []).length
    merged.medicationCount = (merged.medications || []).length
  }

  return merged
}

/**
 * Reconcile and merge all clinical data from multiple sources.
 * Tags each record with its source for lineage tracking.
 * Deduplicates where possible (same medication name, same encounter date+type).
 */
export function reconcileData(sourcesWithData) {
  const merged = {
    medications: [],
    encounters: [],
    allergies: [],
    results: [],
    orders: [],
    conditions: [],
    immunizations: [],
  }

  for (const { source, data } of sourcesWithData) {
    if (data.medications) {
      merged.medications.push(...tagRecordsWithSource(data.medications, source))
    }
    if (data.encounters) {
      merged.encounters.push(...tagRecordsWithSource(data.encounters, source))
    }
    if (data.allergies) {
      merged.allergies.push(...tagRecordsWithSource(data.allergies, source))
    }
    if (data.results) {
      merged.results.push(...tagRecordsWithSource(data.results, source))
    }
    if (data.orders) {
      merged.orders.push(...tagRecordsWithSource(data.orders, source))
    }
    if (data.conditions) {
      merged.conditions.push(...tagRecordsWithSource(data.conditions, source))
    }
    if (data.immunizations) {
      merged.immunizations.push(...tagRecordsWithSource(data.immunizations, source))
    }
  }

  // ─── Enrich ALL records with standard codes BEFORE dedup ──────────────
  const enrichedMerged = enrichAllRecords(merged)
  Object.assign(merged, enrichedMerged)

  // ─── Comprehensive Deduplication (code-based when available) ─────────
  // Medications: prefer RxCUI match, fall back to normalized name
  merged.medications = deduplicateByKey(merged.medications, m => {
    if (m.rxcui) return `rxcui:${m.rxcui}`
    const name = (m.name || '').toLowerCase().replace(/\d+\s*(mg|mcg|ml|units?|meq)\b/gi, '').trim()
    return name
  })
  // Lab Results: prefer LOINC + date, fall back to component name + date
  merged.results = deduplicateByKey(merged.results, r => {
    const dateRaw = r.date || r.resultTime || ''
    const date = dateRaw.split(' ')[0] || dateRaw.split('T')[0] || ''
    if (r.loinc) return `loinc:${r.loinc}|${date}`
    const comp = (r.name || r.component || '').toLowerCase().trim()
    return comp ? `${comp}|${date}` : ''
  })
  // Conditions: prefer ICD-10, then SNOMED CT, then name
  merged.conditions = deduplicateByKey(merged.conditions, c => {
    if (c.icd10) return `icd10:${c.icd10}`
    if (c.snomedCT) return `snomed:${c.snomedCT}`
    return (c.name || '').toLowerCase().trim()
  })
  // Allergies: prefer SNOMED CT, then allergen name
  merged.allergies = deduplicateByKey(merged.allergies, a => {
    if (a.snomedCT) return `snomed:${a.snomedCT}`
    return (a.allergen || a.name || '').toLowerCase().trim()
  })
  // Orders/Procedures: prefer CPT code, fall back to name
  merged.orders = deduplicateByKey(merged.orders || [], o => {
    if (o.procCode) return `cpt:${o.procCode}`
    const name = (o.procName || o.name || '').toLowerCase().trim()
    return name || ''
  })
  // Encounters: dedup by CSN ID or by type+date
  merged.encounters = deduplicateByKey(merged.encounters || [], e => {
    if (e.csnId) return String(e.csnId)
    const type = (e.encType || e.type || '').toLowerCase().trim()
    const date = (e.contactDate || '').split('T')[0] || ''
    return type && date ? `${type}|${date}` : ''
  })
  // Immunizations: prefer CVX + date, fall back to name + date
  merged.immunizations = deduplicateByKey(merged.immunizations || [], i => {
    const date = (i.date || '').split('T')[0] || ''
    if (i.cvx) return `cvx:${i.cvx}|${date}`
    const name = (i.name || '').toLowerCase().trim()
    return name ? `${name}|${date}` : ''
  })

  return merged
}

/**
 * Smart-merge deduplication.
 * When duplicates are found: merge the best fields from both into the keeper,
 * mark the duplicate, and track how many sources contributed.
 */
function deduplicateByKey(records, keyFn) {
  const seen = new Map()   // key → index in output
  const output = []

  for (const r of records) {
    const key = keyFn(r)
    if (!key) { output.push(r); continue } // Cannot compute key — keep as-is

    if (seen.has(key)) {
      const keeperIdx = seen.get(key)
      const keeper = output[keeperIdx]
      // Smart merge: fill in any missing fields on the keeper from the duplicate
      output[keeperIdx] = smartMergeRecord(keeper, r)
      // Mark this record as duplicate
      output.push({ ...r, _duplicate: true, _duplicateOf: keeper._source || keeper._sourceName })
    } else {
      seen.set(key, output.length)
      output.push({ ...r, _mergedCount: 1, _mergedSources: [r._sourceName || r._source || 'unknown'] })
    }
  }
  return output
}

/**
 * Merge best fields from a duplicate record into the keeper.
 * Fills in blanks, prefers higher-confidence / non-empty values.
 */
function smartMergeRecord(keeper, dup) {
  const merged = { ...keeper }
  // Fill empty string fields from duplicate
  for (const field of ['value', 'unit', 'units', 'flag', 'referenceRange', 'dose', 'route',
                        'frequency', 'indication', 'reaction', 'severity', 'icd10', 'icd10Display',
                        'code', 'codeSystem', 'snomed', 'snomedCT', 'snomedDisplay',
                        'loinc', 'loincDisplay', 'rxcui', 'ndc', 'drugClass', 'genericName', 'brandName',
                        'procName', 'procCode', 'cptDescription', 'cvx', 'cvxDisplay',
                        'orderDate', 'specimen', 'priority', 'diagnosis', 'chiefComplaint', 'manufacturer']) {
    if ((!merged[field] || merged[field] === '') && dup[field] && dup[field] !== '') {
      merged[field] = dup[field]
    }
  }
  // Prefer HIGH/LOW/CRITICAL flags over Normal or empty
  if (dup.flag && dup.flag !== 'Normal' && (!merged.flag || merged.flag === 'Normal' || merged.flag === '')) {
    merged.flag = dup.flag
  }
  // Track merged source count
  const sources = merged._mergedSources || [merged._sourceName || merged._source || 'unknown']
  const dupSrc = dup._sourceName || dup._source || 'unknown'
  if (!sources.includes(dupSrc)) sources.push(dupSrc)
  merged._mergedSources = sources
  merged._mergedCount = sources.length
  return merged
}

/**
 * Apply deduplication to merged data (called after mergeIntoExisting).
 * This is the entry point used by DataContext after merging records.
 */
export function deduplicateMergedData(data) {
  if (!data) return data

  // ─── Enrich ALL records with standard codes BEFORE dedup ────────────
  const enriched = enrichAllRecords(data)
  const deduped = { ...enriched }

  // Medications: prefer RxCUI match, fall back to normalized name
  deduped.medications = deduplicateByKey(deduped.medications || [], m => {
    if (m.rxcui) return `rxcui:${m.rxcui}`
    const name = (m.name || '').toLowerCase().replace(/\d+\s*(mg|mcg|ml|units?|meq)\b/gi, '').trim()
    return name || ''
  })
  // Lab results: prefer LOINC + date, fall back to name + date
  deduped.results = deduplicateByKey(deduped.results || [], r => {
    const dateRaw = r.date || r.resultTime || ''
    const date = dateRaw.split(' ')[0] || dateRaw.split('T')[0] || ''
    if (r.loinc) return `loinc:${r.loinc}|${date}`
    const comp = (r.name || r.component || '').toLowerCase().trim()
    return comp ? `${comp}|${date}` : ''
  })
  // Conditions: prefer ICD-10, then SNOMED CT, then name
  deduped.conditions = deduplicateByKey(deduped.conditions || [], c => {
    if (c.icd10) return `icd10:${c.icd10}`
    if (c.snomedCT) return `snomed:${c.snomedCT}`
    return (c.name || '').toLowerCase().trim() || ''
  })
  // Allergies: prefer SNOMED CT, then allergen name
  deduped.allergies = deduplicateByKey(deduped.allergies || [], a => {
    if (a.snomedCT) return `snomed:${a.snomedCT}`
    return (a.allergen || a.name || '').toLowerCase().trim() || ''
  })
  // Orders/Procedures: prefer CPT code, fall back to name
  deduped.orders = deduplicateByKey(deduped.orders || [], o => {
    if (o.procCode) return `cpt:${o.procCode}`
    const name = (o.procName || o.name || '').toLowerCase().trim()
    return name || ''
  })
  // Encounters: dedup by CSN ID or by type+date
  deduped.encounters = deduplicateByKey(deduped.encounters || [], e => {
    if (e.csnId) return String(e.csnId)
    const type = (e.encType || e.type || '').toLowerCase().trim()
    const date = (e.contactDate || '').split('T')[0] || ''
    return type && date ? `${type}|${date}` : ''
  })
  // Immunizations: prefer CVX + date, fall back to name + date
  deduped.immunizations = deduplicateByKey(deduped.immunizations || [], i => {
    const date = (i.date || '').split('T')[0] || ''
    if (i.cvx) return `cvx:${i.cvx}|${date}`
    const name = (i.name || '').toLowerCase().trim()
    return name ? `${name}|${date}` : ''
  })
  return deduped
}

/**
 * Count source statistics.
 */
export function computeSourceStats(source, allData) {
  return {
    medications: (allData.medications || []).filter(m => m._source === source.id && !m._duplicate).length,
    encounters: (allData.encounters || []).filter(e => e._source === source.id).length,
    allergies: (allData.allergies || []).filter(a => a._source === source.id && !a._duplicate).length,
    immunizations: (allData.immunizations || []).filter(i => i._source === source.id).length,
    conditions: (allData.conditions || []).filter(c => c._source === source.id).length,
    results: (allData.results || []).filter(r => r._source === source.id).length,
    orders: (allData.orders || []).filter(o => o._source === source.id).length,
  }
}
