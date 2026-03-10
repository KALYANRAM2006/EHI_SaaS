// ═══════════════════════════════════════════════════════════════════════════════
// Azure Text Analytics for Health — Optional AI-powered clinical NLP
// ═══════════════════════════════════════════════════════════════════════════════
//
// WHEN ENABLED:
//   • Sends extracted PDF text to Azure Cognitive Services (Text Analytics for Health)
//   • Returns structured clinical entities with ICD-10, RxNorm, SNOMED CT, LOINC codes
//   • Detects negation, temporality, certainty (e.g., "ruled out MI")
//   • Far more accurate than regex-based extraction
//
// WHEN DISABLED (default):
//   • Falls back to the built-in regex + dictionary pipeline
//   • 100% client-side, zero data leaves the browser
//
// PRIVACY:
//   • PHI is STRIPPED before text leaves the browser (deidentifyText)
//   • Dates → year only, names/MRN/SSN/phone/email → [REDACTED] tokens
//   • Clinical terms (drugs, labs, diagnoses) are PRESERVED for AI parsing
//   • Azure Health API is HIPAA-compliant when configured with a BAA
//   • Data is encrypted in transit (TLS) and NOT stored by Microsoft
// ═══════════════════════════════════════════════════════════════════════════════

import { deidentifyText } from '../utils/deidentify.js'

const STORAGE_KEY = 'ehi_azure_health_ai_config'
const MAX_TEXT_LENGTH = 125000 // Azure limit per document

// ─── Configuration Management ────────────────────────────────────────────────

/**
 * Get saved Azure Health AI configuration from localStorage.
 * @returns {{ endpoint: string, apiKey: string, enabled: boolean }}
 */
export function getAzureHealthConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { endpoint: '', apiKey: '', enabled: false }
    return JSON.parse(raw)
  } catch {
    return { endpoint: '', apiKey: '', enabled: false }
  }
}

/**
 * Save Azure Health AI configuration to localStorage.
 * @param {{ endpoint: string, apiKey: string, enabled: boolean }} config
 */
export function saveAzureHealthConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    endpoint: (config.endpoint || '').trim().replace(/\/+$/, ''),
    apiKey: (config.apiKey || '').trim(),
    enabled: !!config.enabled,
  }))
}

/**
 * Check if Azure Health AI is configured and enabled.
 */
export function isAzureHealthEnabled() {
  const cfg = getAzureHealthConfig()
  return cfg.enabled && cfg.endpoint && cfg.apiKey
}

// ─── Entity Category Mapping ─────────────────────────────────────────────────

const CATEGORY_MAP = {
  // Medications
  'MedicationName':     'medication',
  'MedicationClass':    'medication',
  'Dosage':             'medication_attr',
  'MedicationRoute':    'medication_attr',
  'MedicationForm':     'medication_attr',
  'Frequency':          'medication_attr',

  // Diagnoses & conditions
  'Diagnosis':          'diagnosis',
  'ConditionQualifier': 'diagnosis',
  'SymptomOrSign':      'diagnosis',

  // Labs & exams
  'ExaminationName':    'labResult',
  'ExaminationValue':   'labResult_attr',
  'MeasurementValue':   'labResult_attr',
  'MeasurementUnit':    'labResult_attr',

  // Vitals
  'VitalSign':          'vital',

  // Treatment / procedures
  'TreatmentName':      'procedure',
  'CareEnvironment':    'procedure',

  // Demographics
  'Age':                'demographic',
  'Gender':             'demographic',
  'Ethnicity':          'demographic',

  // Allergies
  'Allergen':           'allergy',
  'AdverseEvent':       'allergy_attr',
}

// ─── Main API Call ───────────────────────────────────────────────────────────

/**
 * Analyze clinical text using Azure Text Analytics for Health.
 *
 * @param {string} text — Clinical text extracted from PDF/OCR
 * @param {Function} [onProgress] — Optional progress callback
 * @returns {Promise<Object>} Parsed clinical entities in app-compatible format
 */
export async function analyzeWithAzureHealth(text, onProgress) {
  const config = getAzureHealthConfig()
  if (!config.enabled || !config.endpoint || !config.apiKey) {
    throw new Error('Azure Health AI is not configured. Please add your endpoint and API key.')
  }

  // Truncate if too long
  const truncatedText = text.length > MAX_TEXT_LENGTH
    ? text.substring(0, MAX_TEXT_LENGTH)
    : text

  // ── Privacy-first: strip PHI before sending to cloud ───────────────────
  const { safeText: analysisText, strippedCount } = deidentifyText(truncatedText)
  if (strippedCount > 0) {
    console.log(`[Azure Health AI] De-identified ${strippedCount} PHI elements before cloud transmission`)
  }

  onProgress?.({ phase: 'ai-submit', progress: 0.1, message: `Submitting to Azure Health AI (${strippedCount} PHI elements stripped)...` })

  // ── Submit analysis job ────────────────────────────────────────────────
  const jobUrl = `${config.endpoint}/language/analyze-text/jobs?api-version=2023-04-01`

  const submitResp = await fetch(jobUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': config.apiKey,
    },
    body: JSON.stringify({
      analysisInput: {
        documents: [
          { id: '1', language: 'en', text: analysisText },
        ],
      },
      tasks: [
        {
          kind: 'Healthcare',
          parameters: { modelVersion: 'latest' },
        },
      ],
    }),
  })

  if (!submitResp.ok) {
    const errBody = await submitResp.text().catch(() => '')
    throw new Error(`Azure Health AI error (${submitResp.status}): ${errBody}`)
  }

  // ── Poll for completion ────────────────────────────────────────────────
  const operationUrl = submitResp.headers.get('operation-location')
  if (!operationUrl) {
    throw new Error('Azure Health AI did not return an operation-location header')
  }

  let result = null
  let attempts = 0
  const maxAttempts = 60 // 60 × 2s = 2 min max

  while (attempts < maxAttempts) {
    attempts++
    const pollProgress = Math.min(0.1 + (attempts / maxAttempts) * 0.8, 0.9)
    onProgress?.({ phase: 'ai-processing', progress: pollProgress, message: 'Azure AI analyzing clinical text...' })

    await sleep(2000)

    const pollResp = await fetch(operationUrl, {
      headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
    })

    if (!pollResp.ok) {
      throw new Error(`Azure Health AI poll error (${pollResp.status})`)
    }

    const pollData = await pollResp.json()

    if (pollData.status === 'succeeded') {
      result = pollData
      break
    } else if (pollData.status === 'failed' || pollData.status === 'cancelled') {
      const errMsg = pollData.errors?.[0]?.message || 'Analysis failed'
      throw new Error(`Azure Health AI: ${errMsg}`)
    }
    // Still running — continue polling
  }

  if (!result) {
    throw new Error('Azure Health AI timed out after 2 minutes')
  }

  onProgress?.({ phase: 'ai-parsing', progress: 0.95, message: 'Parsing AI results...' })

  // ── Parse response into app-compatible format ──────────────────────────
  return parseAzureHealthResponse(result)
}

// ─── Response Parser ─────────────────────────────────────────────────────────

function parseAzureHealthResponse(apiResult) {
  const entities = {
    demographics: {},
    dates: [],
    medications: [],
    diagnoses: [],
    vitals: [],
    labResults: [],
    allergies: [],
    procedures: [],
    documentType: 'Clinical Document',
    fullText: '',
  }

  try {
    const tasks = apiResult.tasks?.items || apiResult.tasks?.completed || []
    const healthTask = tasks.find(t => t.kind === 'Healthcare' || t.taskName?.includes('Health'))
    if (!healthTask) return entities

    const docs = healthTask.results?.documents || []
    if (docs.length === 0) return entities

    const doc = docs[0]
    const rawEntities = doc.entities || []
    const relations = doc.relations || []

    // Build entity map for relation lookups
    const entityMap = new Map()
    rawEntities.forEach((e, i) => entityMap.set(e.offset ?? i, e))

    // Group medication attributes by relation
    const medRelations = new Map() // medEntity offset → { dose, route, freq, form }
    for (const rel of relations) {
      if (rel.relationType === 'DosageOfMedication' ||
          rel.relationType === 'RouteOfMedication' ||
          rel.relationType === 'FrequencyOfMedication' ||
          rel.relationType === 'FormOfMedication') {
        const roles = rel.entities || []
        const medRole = roles.find(r => r.role === 'Entity' || r.role === 'Medication')
        const attrRole = roles.find(r => r.role === 'Attribute' || r.role !== medRole?.role)
        if (medRole && attrRole) {
          const key = medRole.ref || medRole.text
          if (!medRelations.has(key)) medRelations.set(key, {})
          const attrs = medRelations.get(key)
          if (rel.relationType.includes('Dosage')) attrs.dose = attrRole.text
          if (rel.relationType.includes('Route')) attrs.route = attrRole.text
          if (rel.relationType.includes('Frequency')) attrs.frequency = attrRole.text
          if (rel.relationType.includes('Form')) attrs.form = attrRole.text
        }
      }
    }

    // Process each entity
    for (const entity of rawEntities) {
      const cat = CATEGORY_MAP[entity.category]
      if (!cat) continue

      const confidence = entity.confidenceScore || 0
      const links = entity.links || []

      // Extract standard codes from entity links
      const icd10Link = links.find(l => l.dataSource === 'ICD-10-CM' || l.dataSource === 'ICD10CM')
      const rxnormLink = links.find(l => l.dataSource === 'RxNorm')
      const snomedLink = links.find(l => l.dataSource === 'SNOMEDCT_US' || l.dataSource === 'SNOMED')
      const loincLink = links.find(l => l.dataSource === 'LOINC')

      // Check assertion (negation, conditional)
      const assertion = entity.assertion || {}
      const isNegated = assertion.certainty === 'negative' || assertion.conditionality === 'hypothetical'

      switch (cat) {
        case 'medication': {
          const attrs = medRelations.get(entity.text) || medRelations.get(entity.offset) || {}
          entities.medications.push({
            name: entity.text,
            dose: attrs.dose || '',
            route: attrs.route || '',
            frequency: attrs.frequency || '',
            rxcui: rxnormLink?.id || '',
            source: 'azure-ai',
            confidence: confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
            aiConfidence: confidence,
          })
          break
        }

        case 'diagnosis': {
          if (isNegated) break // Skip negated conditions ("ruled out MI")
          entities.diagnoses.push({
            name: entity.text,
            code: icd10Link?.id || '',
            icd10: icd10Link?.id || null,
            codeSystem: icd10Link ? 'ICD-10-CM' : '',
            snomedCT: snomedLink?.id || null,
            source: 'azure-ai',
            confidence: confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
            aiConfidence: confidence,
            negated: isNegated,
          })
          break
        }

        case 'labResult': {
          entities.labResults.push({
            name: entity.text,
            loinc: loincLink?.id || '',
            source: 'azure-ai',
            confidence: confidence >= 0.8 ? 'high' : 'medium',
            aiConfidence: confidence,
          })
          break
        }

        case 'vital': {
          entities.vitals.push({
            name: entity.text,
            value: entity.text,
            source: 'azure-ai',
            aiConfidence: confidence,
          })
          break
        }

        case 'procedure': {
          entities.procedures.push({
            name: entity.text,
            snomedCT: snomedLink?.id || null,
            source: 'azure-ai',
            aiConfidence: confidence,
          })
          break
        }

        case 'allergy': {
          entities.allergies.push({
            name: entity.text,
            snomedCT: snomedLink?.id || null,
            source: 'azure-ai',
            aiConfidence: confidence,
          })
          break
        }

        case 'demographic': {
          if (entity.category === 'Age') entities.demographics.age = parseInt(entity.text) || entity.text
          if (entity.category === 'Gender') entities.demographics.sex = entity.text
          break
        }
      }
    }

    // Clean up empty demographics
    if (Object.keys(entities.demographics).length === 0) {
      entities.demographics = null
    }

  } catch (err) {
    console.error('[AzureHealthAI] Error parsing response:', err)
  }

  return entities
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Test connectivity to Azure Health endpoint.
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function testAzureHealthConnection() {
  const config = getAzureHealthConfig()
  if (!config.endpoint || !config.apiKey) {
    return { ok: false, message: 'Endpoint and API key are required' }
  }

  try {
    const resp = await fetch(
      `${config.endpoint}/language/analyze-text/jobs?api-version=2023-04-01`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': config.apiKey,
        },
        body: JSON.stringify({
          analysisInput: { documents: [{ id: 'test', language: 'en', text: 'Patient has hypertension.' }] },
          tasks: [{ kind: 'Healthcare', parameters: { modelVersion: 'latest' } }],
        }),
      }
    )

    if (resp.ok || resp.status === 202) {
      return { ok: true, message: 'Connected successfully!' }
    }

    const body = await resp.text().catch(() => '')
    if (resp.status === 401 || resp.status === 403) {
      return { ok: false, message: 'Invalid API key or insufficient permissions' }
    }
    return { ok: false, message: `HTTP ${resp.status}: ${body.substring(0, 200)}` }
  } catch (err) {
    return { ok: false, message: `Connection failed: ${err.message}` }
  }
}
