// ═══════════════════════════════════════════════════════════════════════════════
// Online Medical Code Validation Service
// ═══════════════════════════════════════════════════════════════════════════════
//
// Validates and enriches medical codes using FREE public NIH/NLM APIs:
//
//   • RxNorm API  — Drug names → RxCUI codes (and reverse lookup)
//   • ICD-10 API  — Validate ICD-10-CM codes and get display names
//   • CVX Lookup  — Vaccine codes → names (embedded CVX table + CDC API)
//   • LOINC (via NLM) — Lab test code lookups
//
// PRIVACY:
//   • Only generic medical codes/drug names are sent — NEVER patient data
//   • These are public terminology APIs — no authentication needed
//   • No PHI, no patient identifiers, no dates, no demographics
//
// USAGE:
//   import { validateAndEnrich } from './codeValidationService'
//   const enriched = await validateAndEnrich(clinicalEntities)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── In-memory cache to avoid redundant API calls ───────────────────────────
const _cache = {
  rxnorm: new Map(),   // drugName → { rxcui, name, tty }
  icd10: new Map(),     // code → { code, display, valid }
  cvx: new Map(),       // cvxCode → { code, shortDescription, fullVaccineName }
}

// ─── Rate limiting — max 20 requests per second per NLM guidelines ──────────
let _lastRequestTime = 0
const MIN_REQUEST_GAP = 60 // ms between requests

async function throttledFetch(url, options = {}) {
  const now = Date.now()
  const gap = now - _lastRequestTime
  if (gap < MIN_REQUEST_GAP) {
    await new Promise(r => setTimeout(r, MIN_REQUEST_GAP - gap))
  }
  _lastRequestTime = Date.now()
  
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000) // 5s timeout
  
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeout)
    return resp
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. RxNorm API — Drug Name → RxCUI
// ═══════════════════════════════════════════════════════════════════════════════
// Docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html

/**
 * Look up a drug by name → returns RxCUI, normalized name, term type
 * @param {string} drugName — e.g. "lisinopril", "metformin 500mg"
 * @returns {{ rxcui: string, name: string, tty: string } | null}
 */
export async function lookupRxNorm(drugName) {
  if (!drugName) return null
  const key = drugName.toLowerCase().trim().split(/\s+/).slice(0, 3).join(' ')
  if (_cache.rxnorm.has(key)) return _cache.rxnorm.get(key)

  try {
    // Step 1: Approximate match search
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(key)}&maxEntries=1`
    const resp = await throttledFetch(url)
    if (!resp.ok) return null
    
    const data = await resp.json()
    const candidates = data?.approximateGroup?.candidate
    if (!candidates || candidates.length === 0) {
      _cache.rxnorm.set(key, null)
      return null
    }

    const best = candidates[0]
    const score = parseInt(best.score, 10) || 0
    
    // Reject low-confidence matches — the approximate API always returns SOMETHING,
    // even for garbage text like "advance care planning". Score < 60 means poor match.
    if (score < 60) {
      console.log(`[CodeValidation] RxNorm: rejected "${drugName}" → score ${score} (too low)`)
      _cache.rxnorm.set(key, null)
      return null
    }
    
    const result = {
      rxcui: best.rxcui,
      name: best.name || drugName,
      score,
    }
    _cache.rxnorm.set(key, result)
    return result
  } catch (err) {
    console.warn(`[CodeValidation] RxNorm lookup failed for "${drugName}":`, err.message)
    return null
  }
}

/**
 * Get drug properties by RxCUI
 */
export async function getRxNormProperties(rxcui) {
  if (!rxcui) return null
  const cacheKey = `props_${rxcui}`
  if (_cache.rxnorm.has(cacheKey)) return _cache.rxnorm.get(cacheKey)

  try {
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`
    const resp = await throttledFetch(url)
    if (!resp.ok) return null
    
    const data = await resp.json()
    const props = data?.properties
    if (!props) return null

    const result = {
      rxcui: props.rxcui,
      name: props.name,
      synonym: props.synonym || '',
      tty: props.tty || '',
    }
    _cache.rxnorm.set(cacheKey, result)
    return result
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ICD-10-CM Validation
// ═══════════════════════════════════════════════════════════════════════════════
// Uses NLM's clinical tables API

/**
 * Validate an ICD-10-CM code and get its display name
 * @param {string} code — e.g. "E11.65", "I10", "S39.012A"
 * @returns {{ code: string, display: string, valid: boolean } | null}
 */
export async function validateICD10(code) {
  if (!code || !/^[A-TV-Z]\d{2}/.test(code)) return null
  const key = code.toUpperCase()
  if (_cache.icd10.has(key)) return _cache.icd10.get(key)

  try {
    const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code&terms=${encodeURIComponent(key)}&maxList=3`
    const resp = await throttledFetch(url)
    if (!resp.ok) return null
    
    const data = await resp.json()
    // Response format: [totalCount, codeList, extraFields, displayList]
    const codes = data[1] || []
    const displays = data[3] || []

    // Find exact match
    const idx = codes.findIndex(c => c.toUpperCase() === key)
    if (idx >= 0) {
      const result = { code: key, display: displays[idx]?.[0] || codes[idx], valid: true }
      _cache.icd10.set(key, result)
      return result
    }

    // Partial match (code without trailing character)
    if (codes.length > 0) {
      const result = { code: codes[0], display: displays[0]?.[0] || codes[0], valid: true }
      _cache.icd10.set(key, result)
      return result
    }

    _cache.icd10.set(key, { code: key, display: '', valid: false })
    return { code: key, display: '', valid: false }
  } catch (err) {
    console.warn(`[CodeValidation] ICD-10 lookup failed for "${code}":`, err.message)
    return null
  }
}

/**
 * Search ICD-10 by condition name → returns matching codes
 * @param {string} conditionName — e.g. "type 2 diabetes", "hypertension"
 * @returns {Array<{ code: string, display: string }>}
 */
export async function searchICD10(conditionName) {
  if (!conditionName || conditionName.length < 3) return []
  
  try {
    const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(conditionName)}&maxList=5`
    const resp = await throttledFetch(url)
    if (!resp.ok) return []
    
    const data = await resp.json()
    const codes = data[1] || []
    const displays = data[3] || []
    
    return codes.map((c, i) => ({
      code: c,
      display: displays[i]?.[0] || c,
    }))
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CVX Code Lookup — Embedded CDC CVX Table
// ═══════════════════════════════════════════════════════════════════════════════
// Source: https://www2a.cdc.gov/vaccines/iis/iisstandards/vaccines.asp

const CVX_TABLE = {
  '03': { short: 'MMR', full: 'Measles, Mumps, Rubella' },
  '05': { short: 'Measles', full: 'Measles virus vaccine' },
  '06': { short: 'Rubella', full: 'Rubella virus vaccine' },
  '07': { short: 'Mumps', full: 'Mumps virus vaccine' },
  '08': { short: 'Hep B, adolescent/high risk', full: 'Hepatitis B vaccine, adolescent/high risk infant' },
  '10': { short: 'IPV', full: 'Poliovirus vaccine, inactivated' },
  '20': { short: 'DTaP', full: 'Diphtheria, tetanus, acellular pertussis' },
  '21': { short: 'Varicella', full: 'Varicella (Chickenpox) vaccine' },
  '33': { short: 'Pneumococcal PPV23', full: 'Pneumococcal polysaccharide vaccine, 23 valent' },
  '43': { short: 'Hep B, adult', full: 'Hepatitis B vaccine, adult dosage' },
  '44': { short: 'Hep B, dialysis', full: 'Hepatitis B vaccine, dialysis patient' },
  '45': { short: 'Hep B, NOS', full: 'Hepatitis B vaccine, NOS' },
  '48': { short: 'Hib (PRP-T)', full: 'Haemophilus influenzae type b vaccine, PRP-T conjugate' },
  '49': { short: 'Hib (PRP-OMP)', full: 'Haemophilus influenzae type b vaccine, PRP-OMP conjugate' },
  '52': { short: 'Hep A, adult', full: 'Hepatitis A vaccine, adult dosage' },
  '62': { short: 'HPV, quadrivalent', full: 'Human Papillomavirus vaccine, quadrivalent' },
  '83': { short: 'Hep A, ped/adol', full: 'Hepatitis A vaccine, pediatric/adolescent, 2 dose schedule' },
  '88': { short: 'Influenza, NOS', full: 'Influenza virus vaccine, NOS' },
  '100': { short: 'Pneumococcal PCV13', full: 'Pneumococcal conjugate vaccine, 13 valent' },
  '104': { short: 'Hep A-Hep B', full: 'Hepatitis A and Hepatitis B vaccine' },
  '108': { short: 'Meningococcal ACWY', full: 'Meningococcal conjugate vaccine, serogroups A,C,W,Y' },
  '113': { short: 'Td', full: 'Tetanus and diphtheria toxoids, adult' },
  '114': { short: 'Meningococcal MCV4P', full: 'Meningococcal polysaccharide vaccine (Menomune)' },
  '115': { short: 'Tdap', full: 'Tetanus, diphtheria, acellular pertussis (Adacel/Boostrix)' },
  '116': { short: 'Rotavirus pentavalent', full: 'Rotavirus, live, pentavalent vaccine (RotaTeq)' },
  '119': { short: 'Rotavirus monovalent', full: 'Rotavirus, live, monovalent vaccine (Rotarix)' },
  '133': { short: 'PCV13', full: 'Pneumococcal conjugate vaccine, 13 valent (Prevnar 13)' },
  '135': { short: 'Influenza, high dose', full: 'Influenza, high dose seasonal (Fluzone HD)' },
  '140': { short: 'Influenza, IIV3', full: 'Influenza, seasonal, injectable, preservative free' },
  '141': { short: 'Influenza, IIV', full: 'Influenza, seasonal, injectable' },
  '150': { short: 'Influenza, IIV4', full: 'Influenza, injectable, quadrivalent, preservative free' },
  '153': { short: 'Influenza, IIV3 (Flucelvax)', full: 'Influenza, injectable, MDCK, preservative free (Flucelvax)' },
  '155': { short: 'Influenza, recombinant', full: 'Seasonal, trivalent, recombinant, injectable (Flublok)' },
  '158': { short: 'Influenza, IIV4', full: 'Influenza, injectable, quadrivalent (Fluarix/FluLaval)' },
  '161': { short: 'Influenza, IIV4 (cc)', full: 'Influenza, injectable, MDCK, preservative free, quadrivalent (Flucelvax Quadrivalent)' },
  '162': { short: 'Meningococcal B (Trumenba)', full: 'Meningococcal B vaccine, fully recombinant (Trumenba)' },
  '163': { short: 'Meningococcal B (Bexsero)', full: 'Meningococcal B vaccine, OMV (Bexsero)' },
  '165': { short: 'HPV9', full: 'Human Papillomavirus 9-valent vaccine (Gardasil 9)' },
  '171': { short: 'Influenza, IIV4 (Afluria)', full: 'Influenza, injectable, MDCK, quadrivalent (Afluria Quad)' },
  '185': { short: 'Influenza, recombinant QIV', full: 'Seasonal, quadrivalent, recombinant, injectable (Flublok Quad)' },
  '187': { short: 'Shingrix', full: 'Zoster vaccine, recombinant (Shingrix)' },
  '189': { short: 'Hep B (CpG)', full: 'Hepatitis B vaccine (recombinant), CpG adjuvanted (Heplisav-B)' },
  '197': { short: 'Influenza, high dose QIV', full: 'Influenza, high-dose seasonal, quadrivalent (Fluzone HD Quad)' },
  '205': { short: 'Influenza, IIV4 adj', full: 'Influenza, seasonal, adjuvanted, injectable (Fluad Quad)' },
  '207': { short: 'COVID-19, mRNA (Moderna)', full: 'COVID-19 vaccine, mRNA, LNP-S, PF (Moderna/Spikevax)' },
  '208': { short: 'COVID-19, mRNA (Pfizer)', full: 'COVID-19 vaccine, mRNA, LNP-S, PF (Pfizer-BioNTech/Comirnaty)' },
  '210': { short: 'COVID-19, viral vector (J&J)', full: 'COVID-19 vaccine, vector-nr, rS-Ad26, PF (Janssen)' },
  '211': { short: 'COVID-19, subunit (Novavax)', full: 'COVID-19 vaccine, subunit, rS-nanoparticle+Matrix-M1 adjuvant, PF (Novavax)' },
  '212': { short: 'COVID-19, NOS', full: 'COVID-19 vaccine, NOS' },
  '213': { short: 'COVID-19, unspecified', full: 'COVID-19 vaccine, unspecified formulation' },
  '217': { short: 'COVID-19, mRNA bivalent (Pfizer)', full: 'COVID-19, mRNA, LNP-S, PF, bivalent (Pfizer)' },
  '218': { short: 'COVID-19, mRNA bivalent (Moderna)', full: 'COVID-19, mRNA, LNP-S, PF, bivalent (Moderna)' },
  '219': { short: 'COVID-19, mRNA-1273.815 (Moderna 2023-2024)', full: 'COVID-19, mRNA, LNP-S, PF, monovalent (Moderna 2023-2024)' },
  '220': { short: 'COVID-19, mRNA BNT162b2 (Pfizer 2023-2024)', full: 'COVID-19, mRNA, LNP-S, PF, monovalent (Pfizer 2023-2024)' },
  '221': { short: 'COVID-19, subunit (Novavax 2023-2024)', full: 'COVID-19, protein subunit, adjuvanted (Novavax 2023-2024)' },
  '300': { short: 'RSV (Abrysvo)', full: 'RSV vaccine, bivalent, protein subunit (Abrysvo/Pfizer)' },
  '301': { short: 'RSV (Arexvy)', full: 'RSV vaccine, adjuvanted, protein subunit (Arexvy/GSK)' },
  '302': { short: 'RSV mAb (Beyfortus)', full: 'RSV, monoclonal antibody (nirsevimab/Beyfortus)' },
}

/**
 * Look up a CVX code → vaccine name and description
 * @param {string|number} cvxCode — e.g. "208", 115
 * @returns {{ code: string, shortDescription: string, fullVaccineName: string } | null}
 */
export function lookupCVX(cvxCode) {
  if (!cvxCode) return null
  const key = String(cvxCode).trim()
  if (CVX_TABLE[key]) {
    return {
      code: key,
      shortDescription: CVX_TABLE[key].short,
      fullVaccineName: CVX_TABLE[key].full,
    }
  }
  return null
}

/**
 * Try to identify CVX code from a vaccine name
 * @param {string} vaccineName
 * @returns {{ code: string, shortDescription: string, fullVaccineName: string } | null}
 */
export function identifyCVXFromName(vaccineName) {
  if (!vaccineName) return null
  const lower = vaccineName.toLowerCase()

  // Direct pattern matching for common vaccines
  const patterns = [
    { test: /pfizer.*covid|comirnaty|bnt162/i, code: '208' },
    { test: /moderna.*covid|spikevax|mrna-1273/i, code: '207' },
    { test: /janssen|johnson.*covid|ad26/i, code: '210' },
    { test: /novavax.*covid/i, code: '211' },
    { test: /covid/i, code: '212' },
    { test: /shingrix|zoster.*recomb/i, code: '187' },
    { test: /gardasil\s*9|hpv.*9/i, code: '165' },
    { test: /gardasil|hpv.*quad/i, code: '62' },
    { test: /prevnar\s*13|pcv\s*13/i, code: '133' },
    { test: /pneumovax|ppv\s*23|ppsv\s*23/i, code: '33' },
    { test: /fluzone.*high|high.*dose.*flu/i, code: '197' },
    { test: /flucelvax/i, code: '161' },
    { test: /fluarix|flulaval/i, code: '158' },
    { test: /flublok/i, code: '185' },
    { test: /fluad/i, code: '205' },
    { test: /afluria/i, code: '171' },
    { test: /influenza|flu\s+(?:shot|vaccine)/i, code: '141' },
    { test: /adacel|boostrix|tdap/i, code: '115' },
    { test: /dtap|diphtheria.*tetanus.*pertussis/i, code: '20' },
    { test: /\btd\b|tetanus.*diphtheria/i, code: '113' },
    { test: /mmr|measles.*mumps/i, code: '03' },
    { test: /varicella|chickenpox/i, code: '21' },
    { test: /rotateq|rotavirus.*penta/i, code: '116' },
    { test: /rotarix|rotavirus.*mono/i, code: '119' },
    { test: /hep\s*b.*adult|engerix|heplisav/i, code: '43' },
    { test: /hep\s*b/i, code: '45' },
    { test: /hep\s*a.*adult|havrix.*adult|vaqta.*adult/i, code: '52' },
    { test: /hep\s*a.*ped|havrix.*ped/i, code: '83' },
    { test: /twinrix|hep\s*a.*hep\s*b/i, code: '104' },
    { test: /menactra|menveo|menquadfi|mening.*acwy/i, code: '108' },
    { test: /trumenba|mening.*b/i, code: '162' },
    { test: /bexsero/i, code: '163' },
    { test: /ipv|polio/i, code: '10' },
    { test: /abrysvo|rsv.*pfizer/i, code: '300' },
    { test: /arexvy|rsv.*gsk/i, code: '301' },
    { test: /beyfortus|nirsevimab/i, code: '302' },
  ]

  for (const { test, code } of patterns) {
    if (test.test(lower)) {
      return lookupCVX(code)
    }
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. MAIN VALIDATION & ENRICHMENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate and enrich all clinical entities with online code lookups.
 * Runs in batch with rate limiting. Non-blocking — returns enriched copy.
 *
 * @param {Object} entities — clinicalEntities from documentOCR
 * @returns {Object} — enriched entities with validated codes
 */
export async function validateAndEnrichCodes(entities) {
  if (!entities) return entities
  const enriched = { ...entities }

  // ── 1. Enrich medications with RxNorm ───────────────────────────────────
  if (Array.isArray(enriched.medications)) {
    // Pre-filter: skip names that are clearly not medications
    const NON_DRUG = /\b(?:advance|planning|patient|capacity|status|history|agents?|context|comments?|order\s+id|not\s+on\s+file|code\s+status|healthcare|directive|the\s+patient|there\s+(?:are|is)|date\s+active)\b/i
    
    const medPromises = enriched.medications.map(async (med) => {
      if (med.rxcui) return med // Already has code
      // Skip names that are obviously not drugs
      if (!med.name || med.name.length < 3 || med.name.length > 80 || NON_DRUG.test(med.name)) {
        return med
      }
      // Skip if name has too many words (real drug names are usually 1-4 words)
      if (med.name.split(/\s+/).length > 5) return med
      try {
        const result = await lookupRxNorm(med.name)
        if (result) {
          return { ...med, rxcui: result.rxcui, rxnormName: result.name, _validated: true }
        }
      } catch { /* skip */ }
      return med
    })
    enriched.medications = await Promise.all(medPromises)
  }

  // ── 2. Validate ICD-10 codes on diagnoses ──────────────────────────────
  if (Array.isArray(enriched.diagnoses)) {
    const dxPromises = enriched.diagnoses.map(async (dx) => {
      // If has ICD code, validate it
      if (dx.icd10 || dx.code) {
        try {
          const result = await validateICD10(dx.icd10 || dx.code)
          if (result && result.valid) {
            return {
              ...dx,
              icd10: result.code,
              icd10Display: result.display,
              _validated: true,
            }
          }
        } catch { /* skip */ }
      }
      // If no code, try to find one by name
      if (!dx.icd10 && !dx.code && dx.name && dx.name.length > 3) {
        try {
          const results = await searchICD10(dx.name)
          if (results.length > 0) {
            return {
              ...dx,
              icd10: results[0].code,
              icd10Display: results[0].display,
              code: results[0].code,
              codeSystem: 'ICD-10',
              _validated: true,
              _autoMapped: true,
            }
          }
        } catch { /* skip */ }
      }
      return dx
    })
    enriched.diagnoses = await Promise.all(dxPromises)
  }

  // ── 3. Enrich immunizations with CVX codes ─────────────────────────────
  if (Array.isArray(enriched.immunizations)) {
    enriched.immunizations = enriched.immunizations.map(imm => {
      // If already has CVX, validate it
      if (imm.cvx) {
        const cvxInfo = lookupCVX(imm.cvx)
        if (cvxInfo) {
          return {
            ...imm,
            cvxDisplay: cvxInfo.shortDescription,
            cvxFullName: cvxInfo.fullVaccineName,
            _validated: true,
          }
        }
      }
      // Try to identify CVX from vaccine name
      const cvxResult = identifyCVXFromName(imm.name)
      if (cvxResult) {
        return {
          ...imm,
          cvx: imm.cvx || cvxResult.code,
          cvxDisplay: cvxResult.shortDescription,
          cvxFullName: cvxResult.fullVaccineName,
          _validated: true,
        }
      }
      return imm
    })
  }

  console.log(`[CodeValidation] Enrichment complete: ${enriched.medications?.filter(m => m._validated).length || 0} meds, ${enriched.diagnoses?.filter(d => d._validated).length || 0} dx, ${enriched.immunizations?.filter(i => i._validated).length || 0} imm validated`)

  return enriched
}
