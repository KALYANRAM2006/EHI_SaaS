/**
 * YAML Rule Engine — Vendor-Agnostic Health Record Parser
 *
 * Loads YAML mapping rules from /rules/<vendor>/ and transforms raw tabular data
 * into a normalized app data model.  Adding a new vendor (Cerner, Athena, etc.)
 * requires only new YAML files — zero code changes.
 *
 * Architecture:
 *   YAML rule  →  loadRules()  →  compiled RuleSet[]
 *   raw rows   →  applyRule()  →  mapped objects
 *   mapped obj →  buildPatientSummary()  →  Dashboard-ready data
 */

import yaml from 'js-yaml'
import { computeSHA256, verifyRuleIntegrity, RULE_ENGINE_VERSION } from '../utils/privacy'

// ─── Rule Integrity State ────────────────────────────────────────────────────

let _lastIntegrityResult = null

/**
 * Get the last rule integrity verification result.
 * @returns {{ verified: boolean, files: Array<{filename, hash, status}> } | null}
 */
export function getRuleIntegrity() {
  return _lastIntegrityResult
}

/**
 * Get the rule engine version string.
 */
export function getRuleEngineVersion() {
  return RULE_ENGINE_VERSION
}

// ─── Rule Loading ────────────────────────────────────────────────────────────

/**
 * Fetch and parse all YAML rule files for a given vendor.
 * Rules are served as static files from /rules/<vendor>/*.yaml
 * @param {string} vendor - e.g. 'epic-tsv', 'cerner-csv', 'athena-json'
 * @returns {Object[]} Array of parsed rule objects sorted by filename (order)
 */
export async function loadRules(vendor) {
  // Fetch the manifest that lists available rule files for this vendor
  // We use a hard-coded manifest per vendor so we don't need server-side directory listing
  const manifests = {
    // ── Delimited (TSV/CSV) vendors ──
    'epic-tsv': [
      '10_patient.yaml',
      '20_encounter.yaml',
      '30_condition_problem_list.yaml',
      '40_medication_statement.yaml',
      '50_observation_labs.yaml',
      '55_observation_vitals.yaml',
      '60_document_reference.yaml',
      '70_allergy_intolerance.yaml',
      '80_immunization.yaml',
      '90_procedure.yaml',
    ],
    'greenway-csv': [
      '10_patient.yaml',
      '20_encounter.yaml',
      '30_condition.yaml',
      '40_medication.yaml',
      '50_observation.yaml',
      '70_allergy.yaml',
      '80_immunization.yaml',
    ],
    'meditech-csv': [
      '10_patient.yaml',
      '20_encounter.yaml',
      '30_condition.yaml',
      '40_medication.yaml',
      '50_observation.yaml',
      '70_allergy.yaml',
    ],
    'ecw-csv': [
      '10_patient.yaml',
      '20_encounter.yaml',
      '30_condition.yaml',
      '40_medication.yaml',
      '50_observation.yaml',
      '70_allergy.yaml',
    ],
    'nextgen-csv': [
      '10_patient.yaml',
      '20_encounter.yaml',
      '30_condition.yaml',
      '40_medication.yaml',
      '50_observation.yaml',
      '70_allergy.yaml',
    ],
    // ── NDJSON / FHIR JSON vendors ──
    'athena-fhir': [
      '10_patient.yaml',
      '20_encounter.yaml',
      '30_condition.yaml',
      '40_medication.yaml',
      '50_observation.yaml',
      '70_allergy.yaml',
      '80_immunization.yaml',
    ],
    'cerner-fhir': [
      '10_patient_fhir.yaml',
      '20_encounter_fhir.yaml',
      '30_condition_fhir.yaml',
      '40_medication_fhir.yaml',
      '50_observation_fhir.yaml',
      '60_document_fhir.yaml',
      '70_allergy_fhir.yaml',
      '80_immunization_fhir.yaml',
      '90_procedure_fhir.yaml',
    ],
    // ── XML / C-CDA vendors ──
    'allscripts-ccda': [
      '10_patient.yaml',
      '20_encounter.yaml',
      '30_condition.yaml',
      '40_medication.yaml',
      '70_allergy.yaml',
    ],
    'ecw-ccda': [
      '10_patient.yaml',
      '20_encounter.yaml',
      '30_condition.yaml',
      '40_medication.yaml',
      '70_allergy.yaml',
    ],
    'practice-fusion-ccda': [
      '10_patient.yaml',
      '20_encounter.yaml',
      '30_condition.yaml',
      '40_medication.yaml',
      '70_allergy.yaml',
    ],
    'meditech-ccda': [
      '10_patient.yaml',
      '20_encounter.yaml',
      '30_condition.yaml',
      '40_medication.yaml',
      '70_allergy.yaml',
    ],
  }

  const fileList = manifests[vendor]
  if (!fileList) {
    throw new Error(`Unknown vendor: "${vendor}". Available: ${Object.keys(manifests).join(', ')}`)
  }

  const basePath = `${import.meta.env.BASE_URL}rules/${vendor}`
  const rules = []
  const ruleTexts = [] // For integrity verification

  for (const file of fileList) {
    try {
      const resp = await fetch(`${basePath}/${file}`)
      if (!resp.ok) {
        console.warn(`[RuleEngine] Could not load ${file}: HTTP ${resp.status}`)
        continue
      }
      const text = await resp.text()
      ruleTexts.push({ filename: `${vendor}/${file}`, content: text })
      const parsed = yaml.load(text)
      if (parsed) {
        parsed._filename = file
        rules.push(parsed)
      }
    } catch (err) {
      console.warn(`[RuleEngine] Error loading ${file}:`, err.message)
    }
  }

  // ─── Rule Integrity Verification ──────────────────────────────────────────
  try {
    _lastIntegrityResult = await verifyRuleIntegrity(ruleTexts)
    if (_lastIntegrityResult.verified) {
      console.log(`[RuleEngine] ✓ Integrity verified — ${ruleTexts.length} rules loaded for ${vendor}`)
    } else {
      console.warn(`[RuleEngine] ⚠ Rule integrity changed — some files differ from baseline`)
    }
  } catch (err) {
    console.warn('[RuleEngine] Could not verify rule integrity:', err.message)
  }

  return rules
}

// ─── Transform Functions ─────────────────────────────────────────────────────

/**
 * Built-in transform library.  YAML rules reference these by name.
 * Transforms are pure functions: (rawValue, row, params) → outputValue
 */
const transforms = {
  /** Sanitize an ID for FHIR-safe usage */
  sanitize_id: (val) => val ? String(val).replace(/[^a-zA-Z0-9._-]/g, '-') : null,

  /** Parse any date string to YYYY-MM-DD */
  format_date: (val) => {
    if (!val) return null
    const d = new Date(val)
    return isNaN(d.getTime()) ? val : d.toISOString().split('T')[0]
  },

  /** Parse datetime to ISO 8601 */
  format_datetime: (val) => {
    if (!val) return null
    const d = new Date(val)
    return isNaN(d.getTime()) ? val : d.toISOString()
  },

  /** Format phone number */
  format_phone: (val) => {
    if (!val) return null
    const digits = val.replace(/\D/g, '')
    if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
    return val
  },

  /** Format ZIP code */
  format_zip: (val) => {
    if (!val) return null
    const digits = val.replace(/\D/g, '')
    if (digits.length === 9) return `${digits.slice(0,5)}-${digits.slice(5)}`
    return digits.slice(0, 5)
  },

  /** Format SSN */
  format_ssn: (val) => {
    if (!val) return null
    const digits = val.replace(/\D/g, '')
    if (digits.length === 9) return `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`
    return val
  },

  /** Check if non-null → true */
  is_not_null: (val) => val != null && val !== '',

  /** Check if > 1 */
  is_greater_than_one: (val) => val && parseInt(val, 10) > 1,

  /** Parse decimal */
  parse_decimal: (val) => {
    if (!val) return null
    const n = parseFloat(val)
    return isNaN(n) ? null : n
  },

  /** Parse integer */
  parse_integer: (val) => {
    if (!val) return null
    const n = parseInt(val, 10)
    return isNaN(n) ? null : n
  },

  /** Create FHIR reference string */
  create_reference: (val, _row, params) => {
    if (!val) return null
    return `${params?.resource_type || 'Resource'}/${val}`
  },

  /** Format display text */
  format_display: (val) => val || null,

  /** String template format */
  string_format: (val, _row, params) => {
    if (!val) return null
    return (params?.template || '{value}').replace('{value}', val)
  },
}

/**
 * Apply a named transform to a raw value.
 * First looks in the rule's own `transforms` block for params, then calls the
 * built-in function.
 */
export function applyTransform(transformName, rawValue, row, ruleTransforms) {
  const fn = transforms[transformName] || transforms[ruleTransforms?.[transformName]?.operation]
  if (!fn) {
    // No transform found — return raw value
    return rawValue
  }
  const params = ruleTransforms?.[transformName] || {}
  return fn(rawValue, row, params)
}

// ─── Value Resolution ────────────────────────────────────────────────────────

/**
 * Resolve a YAML field descriptor to a concrete value from a TSV row.
 *
 * Descriptors can be:
 *   - string literal  →  returned as-is
 *   - { source: 'COL' }  →  row['COL']
 *   - { source: 'COL', mapping: {...} }  →  mapped value
 *   - { source: 'COL', transform: 'fn' }  →  transformed value
 *   - { value: 'x' }  →  static value 'x'
 */
export function resolveValue(descriptor, row, ruleTransforms) {
  if (descriptor === null || descriptor === undefined) return null
  if (typeof descriptor === 'string') return descriptor
  if (typeof descriptor === 'boolean' || typeof descriptor === 'number') return descriptor

  // Static value
  if ('value' in descriptor) {
    return descriptor.value
  }

  // Source column
  if (descriptor.source) {
    let val = row[descriptor.source] ?? null

    // Check condition
    if (descriptor.condition) {
      const condField = descriptor.condition.field || descriptor.source
      const condVal = row[condField]
      if (descriptor.condition.not_null && (condVal === null || condVal === undefined || condVal === '')) {
        return null
      }
    }

    // Apply mapping
    if (descriptor.mapping && val !== null) {
      val = descriptor.mapping[val] ?? descriptor.mapping[String(val)] ?? descriptor.default ?? val
    }

    // Apply transform
    if (descriptor.transform) {
      val = applyTransform(descriptor.transform, val, row, ruleTransforms)
    }

    // Default
    if ((val === null || val === undefined || val === '') && descriptor.default) {
      if (descriptor.default === 'current_timestamp') {
        val = new Date().toISOString()
      } else {
        val = descriptor.default
      }
    }

    return val
  }

  return descriptor
}

// ─── Row Mapping ─────────────────────────────────────────────────────────────

/**
 * Apply a single YAML rule to a single raw TSV row.
 * Walks the rule structure and resolves each value.
 *
 * @param {Object} rule - Parsed YAML rule object
 * @param {Object} row  - Single TSV row (header → value)
 * @returns {Object}    - Mapped object with FHIR-like keys
 */
export function applyRule(rule, row) {
  const ruleTransforms = rule.transforms || {}
  const output = {}

  // Keys to skip (metadata, not mapping fields)
  const skipKeys = new Set([
    'resource_type', 'source_file', 'epic_table', 'description',
    'transforms', 'validation', 'meta', '_filename',
  ])

  for (const [key, descriptor] of Object.entries(rule)) {
    if (skipKeys.has(key)) continue

    // Handle arrays
    if (Array.isArray(descriptor)) {
      output[key] = descriptor.map(item => {
        if (typeof item === 'object' && item !== null) {
          return resolveNestedObject(item, row, ruleTransforms)
        }
        return item
      }).filter(v => v !== null && v !== undefined)
      continue
    }

    // Handle nested objects
    if (typeof descriptor === 'object' && descriptor !== null) {
      // If it has a 'source' key, it's a direct value
      if ('source' in descriptor || 'value' in descriptor) {
        output[key] = resolveValue(descriptor, row, ruleTransforms)
      } else {
        // Nested structure
        output[key] = resolveNestedObject(descriptor, row, ruleTransforms)
      }
      continue
    }

    // Literal value
    output[key] = descriptor
  }

  return output
}

/**
 * Recursively resolve a nested YAML object structure.
 */
function resolveNestedObject(obj, row, ruleTransforms) {
  if (obj === null || obj === undefined) return null

  // Check condition if present
  if (obj.condition) {
    const condField = obj.condition.field
    const condVal = row[condField]
    if (obj.condition.not_null && (condVal === null || condVal === undefined || condVal === '')) {
      return null
    }
  }

  // If it has a source or value, resolve directly
  if ('source' in obj || 'value' in obj) {
    return resolveValue(obj, row, ruleTransforms)
  }

  const result = {}
  let hasValue = false

  for (const [key, val] of Object.entries(obj)) {
    if (key === 'condition' || key === 'description') continue

    if (Array.isArray(val)) {
      result[key] = val.map(item => {
        if (typeof item === 'object' && item !== null) {
          return resolveNestedObject(item, row, ruleTransforms)
        }
        return item
      }).filter(v => v !== null && v !== undefined)
      if (result[key].length > 0) hasValue = true
    } else if (typeof val === 'object' && val !== null) {
      result[key] = resolveNestedObject(val, row, ruleTransforms)
      if (result[key] !== null) hasValue = true
    } else {
      result[key] = val
      if (val !== null && val !== undefined) hasValue = true
    }
  }

  return hasValue ? result : null
}

// ─── Vendor Auto-Detection ──────────────────────────────────────────────────

/**
 * Detect the vendor from uploaded filenames and file contents.
 * Returns the vendor key (e.g. 'epic-tsv') or null.
 *
 * @param {string[]} fileNames - All extracted filenames
 * @param {string} primaryFormat - 'delimited'|'fhir-json'|'ndjson'|'ccda-xml'|'documents'
 * @param {Object} hints - Optional: { jsonResources, xmlMetadata }
 */
export function detectVendor(fileNames, primaryFormat, hints = {}) {
  const upper = fileNames.map(n => n.toUpperCase())

  // ── 1. Delimited (TSV/CSV) vendors ──
  if (!primaryFormat || primaryFormat === 'delimited') {
    // Epic: look for characteristic Epic EHI table names
    const epicTables = ['PATIENT.TSV', 'PAT_ENC.TSV', 'ORDER_PROC.TSV', 'ORDER_MED.TSV',
                        'PROBLEM_LIST.TSV', 'ORDER_RESULTS.TSV', 'ALLERGY.TSV', 'IMMUNE.TSV',
                        'IP_FLWSHT_MEAS.TSV', 'DOC_INFORMATION.TSV']
    if (upper.some(f => epicTables.some(t => f.includes(t)))) return 'epic-tsv'

    // Greenway: characteristic filenames
    const greenwayFiles = ['DEMOGRAPHICS.CSV', 'CLINICALNOTES.CSV', 'LABRESULTS.CSV', 'PRESCRIPTIONS.CSV']
    if (upper.some(f => greenwayFiles.some(t => f.includes(t)))) return 'greenway-csv'

    // MEDITECH CSV
    const meditechCSV = ['MEDITECH', 'MIS_PATIENT', 'MIS_ENCOUNTER']
    if (upper.some(f => meditechCSV.some(t => f.includes(t)))) return 'meditech-csv'

    // NextGen
    const nextgenFiles = ['NEXTGEN', 'NGE_PATIENT', 'NGE_ENCOUNTER']
    if (upper.some(f => nextgenFiles.some(t => f.includes(t)))) return 'nextgen-csv'

    // eCW CSV
    const ecwCSV = ['ECW', 'ECW_PATIENT', 'ECW_ENCOUNTER']
    if (upper.some(f => ecwCSV.some(t => f.includes(t)))) return 'ecw-csv'

    // Generic TSV/CSV → default to epic-tsv
    if (upper.some(f => f.endsWith('.TSV') || f.endsWith('.CSV'))) return 'epic-tsv'
  }

  // ── 2. NDJSON / FHIR JSON vendors ──
  if (primaryFormat === 'ndjson' || primaryFormat === 'fhir-json') {
    // Athena: check FHIR resource metadata
    if (hints.jsonResources) {
      const metaSources = hints.jsonResources
        .map(r => r.meta?.source || r.meta?.extension?.[0]?.url || '')
        .join(' ').toLowerCase()

      if (metaSources.includes('athena') || metaSources.includes('athenaclinicals')) return 'athena-fhir'
      if (metaSources.includes('cerner') || metaSources.includes('millennium')) return 'cerner-fhir'
    }

    // Filename hints
    if (upper.some(f => f.includes('ATHENA'))) return 'athena-fhir'
    if (upper.some(f => f.includes('CERNER') || f.includes('MILLENNIUM'))) return 'cerner-fhir'

    // Default FHIR vendor
    return 'cerner-fhir'
  }

  // ── 3. XML / C-CDA vendors ──
  if (primaryFormat === 'ccda-xml') {
    // Check XML metadata hints
    if (hints.xmlMetadata) {
      const title = (hints.xmlMetadata.title || '').toLowerCase()
      if (title.includes('allscripts')) return 'allscripts-ccda'
      if (title.includes('eclinicalworks') || title.includes('ecw')) return 'ecw-ccda'
      if (title.includes('practice fusion')) return 'practice-fusion-ccda'
      if (title.includes('meditech')) return 'meditech-ccda'
    }

    // Filename hints
    if (upper.some(f => f.includes('ALLSCRIPTS'))) return 'allscripts-ccda'
    if (upper.some(f => f.includes('ECW') || f.includes('ECLINICAL'))) return 'ecw-ccda'
    if (upper.some(f => f.includes('PRACTICE_FUSION') || f.includes('PRACTICEFUSION'))) return 'practice-fusion-ccda'
    if (upper.some(f => f.includes('MEDITECH'))) return 'meditech-ccda'

    // Default C-CDA vendor
    return 'allscripts-ccda'
  }

  return null
}

// ─── Utility Exports ─────────────────────────────────────────────────────────

/**
 * Get the list of supported vendors with their display names and formats.
 */
export function getSupportedVendors() {
  return [
    // Delimited
    { key: 'epic-tsv',            name: 'Epic',            format: 'TSV',      fileTypes: ['.tsv', '.zip'] },
    { key: 'greenway-csv',        name: 'Greenway',        format: 'CSV',      fileTypes: ['.csv', '.zip'] },
    { key: 'meditech-csv',        name: 'MEDITECH',        format: 'CSV',      fileTypes: ['.csv', '.zip'] },
    { key: 'ecw-csv',             name: 'eClinicalWorks',  format: 'CSV',      fileTypes: ['.csv', '.zip'] },
    { key: 'nextgen-csv',         name: 'NextGen',         format: 'CSV',      fileTypes: ['.csv', '.zip'] },
    // NDJSON / FHIR JSON
    { key: 'athena-fhir',         name: 'Athena',          format: 'FHIR JSON', fileTypes: ['.json', '.ndjson', '.zip'] },
    { key: 'cerner-fhir',         name: 'Cerner/Oracle',   format: 'FHIR JSON', fileTypes: ['.json', '.ndjson', '.zip'] },
    // XML / C-CDA
    { key: 'allscripts-ccda',     name: 'Allscripts',      format: 'C-CDA XML', fileTypes: ['.xml', '.zip'] },
    { key: 'ecw-ccda',            name: 'eCW (XML)',        format: 'C-CDA XML', fileTypes: ['.xml', '.zip'] },
    { key: 'practice-fusion-ccda', name: 'Practice Fusion', format: 'C-CDA XML', fileTypes: ['.xml', '.zip'] },
    { key: 'meditech-ccda',       name: 'MEDITECH (XML)',   format: 'C-CDA XML', fileTypes: ['.xml', '.zip'] },
  ]
}
