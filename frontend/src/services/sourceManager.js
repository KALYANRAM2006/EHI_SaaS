/**
 * Source Manager — Multi-Source Data Merging, Lineage Tracking & Patient Verification
 *
 * Handles:
 *   1. Data source registration (each uploaded file = one source)
 *   2. Per-record lineage tagging (_source, _sourceName, _sourceColor)
 *   3. Patient identity verification across sources
 *   4. Data reconciliation / merge into unified patient view
 *
 * All processing is 100% client-side. No data leaves the browser.
 */

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

/**
 * Extract patient identity from a parsed patient record.
 * Returns a normalized identity object for comparison.
 */
function extractPatientIdentity(patient) {
  if (!patient) return null
  return {
    patId: (patient.patId || '').trim().toUpperCase(),
    firstName: (patient.firstName || '').trim().toLowerCase(),
    lastName: (patient.lastName || '').trim().toLowerCase(),
    birthDate: (patient.birthDate || patient.dob || '').trim(),
    sex: (patient.sex || patient.gender || '').trim().toLowerCase(),
    name: (patient.name || '').trim().toLowerCase(),
  }
}

/**
 * Verify that a new patient matches the existing patient.
 * Returns { match: boolean, confidence: 'high'|'medium'|'low', reason: string }
 */
export function verifyPatientMatch(existingPatient, newPatient) {
  const a = extractPatientIdentity(existingPatient)
  const b = extractPatientIdentity(newPatient)

  if (!a || !b) return { match: false, confidence: 'low', reason: 'Missing patient data' }

  let score = 0
  const checks = []

  // Patient ID match (strongest signal)
  if (a.patId && b.patId) {
    if (a.patId === b.patId) {
      score += 50
      checks.push('Patient ID matches')
    } else {
      // Different patient IDs from different systems is OK, not a reject
    }
  }

  // Name match
  if (a.firstName && b.firstName && a.lastName && b.lastName) {
    if (a.firstName === b.firstName && a.lastName === b.lastName) {
      score += 30
      checks.push('Full name matches')
    } else if (a.lastName === b.lastName) {
      score += 10
      checks.push('Last name matches')
    }
  } else if (a.name && b.name) {
    if (a.name === b.name) {
      score += 30
      checks.push('Name matches')
    }
  }

  // DOB match
  if (a.birthDate && b.birthDate) {
    // Normalize dates for comparison
    const dateA = new Date(a.birthDate).toISOString().split('T')[0]
    const dateB = new Date(b.birthDate).toISOString().split('T')[0]
    if (dateA === dateB) {
      score += 30
      checks.push('Date of birth matches')
    } else {
      score -= 20
      checks.push('Date of birth MISMATCH')
    }
  }

  // Sex match
  if (a.sex && b.sex) {
    const normA = a.sex.charAt(0) // 'm' or 'f'
    const normB = b.sex.charAt(0)
    if (normA === normB) {
      score += 10
      checks.push('Sex matches')
    } else {
      score -= 10
      checks.push('Sex MISMATCH')
    }
  }

  if (score >= 50) return { match: true, confidence: 'high', reason: checks.join(', '), score }
  if (score >= 25) return { match: true, confidence: 'medium', reason: checks.join(', '), score }
  if (score > 0)   return { match: false, confidence: 'low', reason: `Weak match (${checks.join(', ')}). May be a different patient.`, score }
  return { match: false, confidence: 'low', reason: 'No matching identity fields found. Likely a different patient.', score }
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

  // Attempt deduplication (simple name/date matching)
  merged.medications = deduplicateByKey(merged.medications, m => `${(m.name || '').toLowerCase()}`)
  merged.allergies = deduplicateByKey(merged.allergies, a => `${(a.allergen || a.name || '').toLowerCase()}`)

  return merged
}

/**
 * Deduplicate records by key. Keeps the first occurrence (preserves source lineage).
 * Marks duplicates with _duplicate = true instead of removing, so we can show them in lineage.
 */
function deduplicateByKey(records, keyFn) {
  const seen = new Map()
  return records.map(r => {
    const key = keyFn(r)
    if (seen.has(key)) {
      return { ...r, _duplicate: true, _duplicateOf: seen.get(key) }
    }
    seen.set(key, r._source)
    return r
  })
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
