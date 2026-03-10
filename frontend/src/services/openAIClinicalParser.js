// ═══════════════════════════════════════════════════════════════════════════════
// OpenAI GPT-4 Clinical Parser — AI-powered extraction from unstructured text
// ═══════════════════════════════════════════════════════════════════════════════
//
// WHAT IT DOES:
//   • Sends extracted PDF text to OpenAI GPT-4 / GPT-4o-mini
//   • Returns structured JSON with medications, labs, diagnoses, vitals, allergies
//   • Far more accurate than regex for unstructured clinical narratives
//   • Captures contextual data that regex misses (negation, severity, etc.)
//
// PRIVACY:
//   • PHI is STRIPPED before text leaves the browser (deidentifyText)
//   • Dates → year only, names/MRN/SSN/phone/email → [REDACTED] tokens
//   • Clinical terms (drugs, labs, diagnoses) are PRESERVED for AI parsing
//   • OpenAI does NOT train on API data (as of their policy)
//   • Key is stored in browser localStorage only (never server-side)
// ═══════════════════════════════════════════════════════════════════════════════

import { deidentifyText } from '../utils/deidentify.js'

const STORAGE_KEY = 'ehi_openai_clinical_config'
const MAX_TEXT_LENGTH = 80000 // GPT-4 context budget (~20k tokens)

// ─── Configuration ───────────────────────────────────────────────────────────

export function getOpenAIConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { apiKey: '', model: 'gpt-4o-mini', enabled: false }
    return JSON.parse(raw)
  } catch {
    return { apiKey: '', model: 'gpt-4o-mini', enabled: false }
  }
}

export function saveOpenAIConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    apiKey: (config.apiKey || '').trim(),
    model: config.model || 'gpt-4o-mini',
    enabled: !!config.enabled,
  }))
}

export function isOpenAIEnabled() {
  const cfg = getOpenAIConfig()
  return cfg.enabled && cfg.apiKey
}

// ─── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a medical data extraction AI. Given clinical document text (discharge summaries, lab reports, progress notes, etc.), extract ALL structured clinical entities.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "demographics": {
    "name": "string or null",
    "dateOfBirth": "string or null",
    "mrn": "string or null",
    "age": "number or null",
    "sex": "string or null"
  },
  "medications": [
    { "name": "medication name with dose", "dose": "dose", "route": "route", "frequency": "frequency", "indication": "indication if mentioned" }
  ],
  "labResults": [
    { "name": "test name", "value": "numeric value as string", "unit": "unit", "flag": "HIGH/LOW/Normal/CRITICAL if determinable", "referenceRange": "range if mentioned" }
  ],
  "diagnoses": [
    { "name": "condition name", "icd10": "ICD-10 code if identifiable", "status": "Active/Resolved/Historical", "severity": "severity if mentioned" }
  ],
  "vitals": [
    { "name": "vital sign name", "value": "value with unit" }
  ],
  "allergies": [
    { "name": "allergen", "reaction": "reaction type", "severity": "severity if mentioned" }
  ],
  "procedures": [
    { "name": "procedure name" }
  ]
}

Rules:
- Extract EVERY medication, lab result, diagnosis, vital sign, allergy, and procedure mentioned
- For lab results, capture ALL values from tables and narrative text
- Include the flag (HIGH/LOW/Normal) when reference ranges are available
- Map diagnoses to ICD-10 codes when you can identify them
- If a field is not mentioned, use null or empty array
- Do NOT hallucinate or infer data not present in the text
- Return ONLY the JSON object, no other text`

// ─── Main Analysis Function ──────────────────────────────────────────────────

export async function analyzeWithOpenAI(text, onProgress = () => {}) {
  const config = getOpenAIConfig()
  if (!config.apiKey) throw new Error('OpenAI API key not configured')

  // Truncate very long texts
  const truncatedRaw = text.length > MAX_TEXT_LENGTH
    ? text.slice(0, MAX_TEXT_LENGTH) + '\n\n[... text truncated for API limits ...]'
    : text

  // ── Privacy-first: strip PHI before sending to cloud ───────────────────
  const { safeText: truncated, strippedCount } = deidentifyText(truncatedRaw)
  if (strippedCount > 0) {
    console.log(`[OpenAI Clinical] De-identified ${strippedCount} PHI elements before cloud transmission`)
  }

  onProgress({ phase: 'ai-submit', progress: 0.75, message: `Sending to OpenAI (${strippedCount} PHI elements stripped)...` })

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract all clinical entities from this document:\n\n${truncated}` },
      ],
      temperature: 0.1,     // Low temperature for consistent extraction
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = err.error?.message || `OpenAI API error: ${response.status}`
    throw new Error(msg)
  }

  onProgress({ phase: 'ai-parse', progress: 0.9, message: 'Parsing AI response...' })
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) throw new Error('Empty response from OpenAI')

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1])
    } else {
      throw new Error('Failed to parse OpenAI response as JSON')
    }
  }

  onProgress({ phase: 'ai-complete', progress: 1.0, message: 'AI extraction complete' })

  // Normalize to our app's expected shape
  return normalizeOpenAIResponse(parsed)
}

// ─── Normalize Response ──────────────────────────────────────────────────────

function normalizeOpenAIResponse(parsed) {
  const entities = {
    demographics: null,
    medications: [],
    labResults: [],
    diagnoses: [],
    vitals: [],
    allergies: [],
    procedures: [],
    dates: [],
  }

  // Demographics
  if (parsed.demographics) {
    const d = parsed.demographics
    entities.demographics = {}
    if (d.name) entities.demographics.name = d.name
    if (d.dateOfBirth) entities.demographics.dateOfBirth = d.dateOfBirth
    if (d.mrn) entities.demographics.mrn = d.mrn
    if (d.age) entities.demographics.age = parseInt(d.age) || null
    if (d.sex) entities.demographics.sex = d.sex
    if (Object.keys(entities.demographics).length === 0) entities.demographics = null
  }

  // Medications
  if (Array.isArray(parsed.medications)) {
    entities.medications = parsed.medications.map(m => ({
      name: buildMedName(m),
      dose: m.dose || '',
      route: m.route || '',
      frequency: m.frequency || '',
      indication: m.indication || '',
      source: 'openai',
      confidence: 'high',
    }))
  }

  // Lab Results
  if (Array.isArray(parsed.labResults)) {
    entities.labResults = parsed.labResults.map(l => ({
      name: l.name || 'Unknown',
      value: String(l.value || ''),
      unit: l.unit || '',
      flag: l.flag || '',
      referenceRange: l.referenceRange || '',
      source: 'openai',
    }))
  }

  // Diagnoses
  if (Array.isArray(parsed.diagnoses)) {
    entities.diagnoses = parsed.diagnoses.map(d => ({
      name: d.name || 'Unknown',
      code: d.icd10 || '',
      codeSystem: d.icd10 ? 'ICD-10' : '',
      icd10: d.icd10 || '',
      status: d.status || 'Active',
      severity: d.severity || '',
      source: 'openai',
      confidence: 'high',
    }))
  }

  // Vitals
  if (Array.isArray(parsed.vitals)) {
    entities.vitals = parsed.vitals.map(v => ({
      name: v.name || 'Unknown',
      value: v.value || '',
      source: 'openai',
    }))
  }

  // Allergies
  if (Array.isArray(parsed.allergies)) {
    entities.allergies = parsed.allergies.map(a => ({
      name: a.name || 'Unknown',
      reaction: a.reaction || '',
      severity: a.severity || '',
      source: 'openai',
    }))
  }

  // Procedures
  if (Array.isArray(parsed.procedures)) {
    entities.procedures = parsed.procedures.map(p => ({
      name: p.name || 'Unknown',
      source: 'openai',
    }))
  }

  return entities
}

function buildMedName(m) {
  let name = m.name || 'Unknown'
  // If dose isn't already in the name, append it
  if (m.dose && !name.toLowerCase().includes(m.dose.toLowerCase().split(' ')[0])) {
    name += ` ${m.dose}`
  }
  return name
}

// ─── Test Connection ─────────────────────────────────────────────────────────

export async function testOpenAIConnection() {
  const config = getOpenAIConfig()
  if (!config.apiKey) return { ok: false, message: 'No API key configured' }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
    })

    if (response.ok) {
      const data = await response.json()
      const models = data.data?.map(m => m.id) || []
      const hasModel = models.some(m => m.includes(config.model || 'gpt-4o-mini'))
      return {
        ok: true,
        message: hasModel
          ? `Connected! ${config.model} available`
          : `Connected! (${config.model} not listed — may still work)`,
        models,
      }
    } else {
      const err = await response.json().catch(() => ({}))
      return { ok: false, message: err.error?.message || `HTTP ${response.status}` }
    }
  } catch (err) {
    return { ok: false, message: err.message }
  }
}
