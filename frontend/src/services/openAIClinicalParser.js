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

const SYSTEM_PROMPT = `You are an expert clinical data extraction AI trained in medical informatics. Read the ENTIRE document thoroughly — every page, section, table, and narrative — and extract ALL structured clinical entities.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "demographics": {
    "name": "string or null",
    "dateOfBirth": "string or null",
    "mrn": "string or null",
    "age": "number or null",
    "sex": "string or null",
    "address": "string or null",
    "phone": "string or null",
    "ethnicity": "string or null",
    "language": "string or null",
    "maritalStatus": "string or null",
    "insurancePlan": "string or null"
  },
  "medications": [
    {
      "name": "generic drug name (brand name if different)",
      "dose": "dose amount with unit (e.g. 10 mg)",
      "route": "oral/IV/subcutaneous/topical/inhaled/etc",
      "frequency": "daily/BID/TID/QID/PRN/weekly/etc",
      "indication": "condition being treated",
      "status": "Active/Discontinued/On Hold/Completed",
      "prescriber": "prescribing provider name if mentioned",
      "startDate": "date started if mentioned",
      "rxcui": "RxNorm CUI code if identifiable",
      "ndc": "NDC code if mentioned"
    }
  ],
  "labResults": [
    {
      "name": "standard test name",
      "value": "numeric value as string",
      "unit": "unit of measurement",
      "flag": "HIGH/LOW/NORMAL/CRITICAL",
      "referenceRange": "normal range if mentioned",
      "date": "collection date if mentioned",
      "loinc": "LOINC code if identifiable"
    }
  ],
  "diagnoses": [
    {
      "name": "condition name — use standard medical terminology",
      "icd10": "ICD-10-CM code (e.g. E11.65, I10, J45.20)",
      "status": "Active/Resolved/Historical",
      "severity": "Mild/Moderate/Severe/Chronic/Acute",
      "onsetDate": "date first noted if mentioned",
      "chronic": true
    }
  ],
  "vitals": [
    { "name": "vital sign name (standard: Blood Pressure, Heart Rate, Temperature, SpO2, Respiratory Rate, Weight, Height, BMI, Pain Level)", "value": "value with unit", "date": "date if mentioned" }
  ],
  "allergies": [
    { "name": "allergen name", "reaction": "specific reaction type (e.g. Rash, Anaphylaxis, Hives)", "severity": "Mild/Moderate/Severe/Life-threatening" }
  ],
  "procedures": [
    { "name": "procedure name", "date": "date if mentioned", "cpt": "CPT code if identifiable", "provider": "performing provider if mentioned", "result": "outcome/findings if mentioned" }
  ],
  "immunizations": [
    {
      "name": "vaccine name (include formulation if given)",
      "date": "administration date",
      "dose": "dose amount (e.g. 0.5 mL)",
      "route": "Intramuscular/Subcutaneous/Oral/Intranasal",
      "site": "Left Deltoid/Right Deltoid/Left Thigh/etc",
      "manufacturer": "vaccine manufacturer if mentioned",
      "lotNumber": "lot number if mentioned",
      "cvx": "CVX code if identifiable (e.g. 208 for Pfizer COVID-19)",
      "ndc": "NDC code if mentioned"
    }
  ],
  "encounters": [
    {
      "type": "Office Visit/Telehealth/Emergency/Inpatient/Outpatient/Urgent Care/Procedure",
      "date": "visit date",
      "department": "department or clinic name",
      "provider": "provider name with credentials",
      "reasonForVisit": "chief complaint or reason",
      "diagnosis": "primary diagnosis for this visit",
      "disposition": "outcome/discharge/follow-up instructions"
    }
  ],
  "careTeam": [
    {
      "name": "provider name with credentials",
      "role": "PCP/Specialist/Surgeon/Nurse/etc",
      "specialty": "medical specialty",
      "phone": "phone number if mentioned",
      "npi": "NPI number if mentioned"
    }
  ],
  "clinicalNotes": [
    {
      "type": "Progress Note/Discharge Summary/Consultation/H&P/Operative Note/After Visit Summary",
      "date": "note date",
      "author": "note author with credentials",
      "content": "brief summary of note content (max 200 chars)",
      "department": "department if mentioned"
    }
  ]
}

Rules:
- READ THE ENTIRE DOCUMENT — every page, every section, every table, every paragraph
- Extract EVERY medication as DISCRETE values — name, dose, route, and frequency must be SEPARATE fields
- For "Lisinopril 10mg oral daily", extract: name="Lisinopril", dose="10 mg", route="oral", frequency="daily"
- Extract ALL encounters/visits mentioned — even if only a date and department are given
- Extract ALL immunizations/vaccines with administration details (date, dose, site, route, lot, manufacturer)
- Map diagnoses to ICD-10-CM codes — use your medical knowledge to identify the correct code
- Map immunizations to CVX codes — e.g. COVID-19 Pfizer=208, Moderna=207, Influenza=141, Tdap=115
- Map procedures to CPT codes when identifiable
- For lab results, always include the flag (HIGH/LOW/NORMAL) based on the reference range
- Extract visit/encounter information from EVERY section — Kaiser "After Visit Summary" has encounter details throughout
- Look for visit dates, departments, providers in headers, footers, and throughout the document
- Extract clinical notes: progress notes, summaries, discharge instructions, consultation notes
- If "No Known Drug Allergies" or "NKDA" appears, return allergies: [{ name: "NKDA", reaction: "No Known Drug Allergies" }]
- Do NOT hallucinate or infer data not present — only extract what is explicitly stated
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
    immunizations: [],
    encounters: [],
    careTeam: [],
    clinicalNotes: [],
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
    if (d.address) entities.demographics.address = d.address
    if (d.phone) entities.demographics.phone = d.phone
    if (d.ethnicity) entities.demographics.ethnicity = d.ethnicity
    if (d.language) entities.demographics.language = d.language
    if (d.maritalStatus) entities.demographics.maritalStatus = d.maritalStatus
    if (d.insurancePlan) entities.demographics.insurancePlan = d.insurancePlan
    if (Object.keys(entities.demographics).length === 0) entities.demographics = null
  }

  // Medications — now DISCRETE fields
  if (Array.isArray(parsed.medications)) {
    entities.medications = parsed.medications.map(m => ({
      name: m.name || 'Unknown',
      dose: m.dose || '',
      route: m.route || '',
      frequency: m.frequency || '',
      indication: m.indication || '',
      status: m.status || 'Active',
      prescriber: m.prescriber || '',
      startDate: m.startDate || '',
      rxcui: m.rxcui || '',
      ndc: m.ndc || '',
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
      date: l.date || '',
      loinc: l.loinc || '',
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
      onsetDate: d.onsetDate || '',
      chronic: d.chronic || false,
      source: 'openai',
      confidence: 'high',
    }))
  }

  // Vitals
  if (Array.isArray(parsed.vitals)) {
    entities.vitals = parsed.vitals.map(v => ({
      name: v.name || 'Unknown',
      value: v.value || '',
      date: v.date || '',
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
      date: p.date || '',
      cptCode: p.cpt || '',
      provider: p.provider || '',
      result: p.result || '',
      source: 'openai',
    }))
  }

  // Immunizations
  if (Array.isArray(parsed.immunizations)) {
    entities.immunizations = parsed.immunizations.map(imm => ({
      name: imm.name || 'Unknown',
      date: imm.date || '',
      dose: imm.dose || '',
      route: imm.route || '',
      site: imm.site || '',
      manufacturer: imm.manufacturer || '',
      lotNumber: imm.lotNumber || '',
      cvx: imm.cvx || '',
      ndc: imm.ndc || '',
      source: 'openai',
      confidence: 'high',
    }))
  }

  // Encounters / Visits
  if (Array.isArray(parsed.encounters)) {
    entities.encounters = parsed.encounters.map(enc => ({
      type: enc.type || 'Office Visit',
      date: enc.date || '',
      department: enc.department || '',
      provider: enc.provider || '',
      reasonForVisit: enc.reasonForVisit || '',
      diagnosis: enc.diagnosis || '',
      disposition: enc.disposition || '',
      source: 'openai',
    }))
  }

  // Care Team
  if (Array.isArray(parsed.careTeam)) {
    entities.careTeam = parsed.careTeam.map(ct => ({
      name: ct.name || 'Unknown',
      role: ct.role || '',
      relationship: ct.role || '',
      specialty: ct.specialty || '',
      phone: ct.phone || '',
      identifier: ct.npi || '',
      source: 'openai',
      status: 'Active',
    }))
  }

  // Clinical Notes
  if (Array.isArray(parsed.clinicalNotes)) {
    entities.clinicalNotes = parsed.clinicalNotes.map(note => ({
      type: note.type || 'Clinical Note',
      date: note.date || '',
      author: note.author || '',
      content: note.content || '',
      department: note.department || '',
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
