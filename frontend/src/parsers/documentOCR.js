// ═══════════════════════════════════════════════════════════════════════════════
// Document OCR & PDF Text Extraction — Client-Side, Lazy-Loaded
// ═══════════════════════════════════════════════════════════════════════════════
//
// ARCHITECTURE:
//   • pdfjs-dist  (~2.5 MB) — LAZY-LOADED only when user uploads a PDF
//   • tesseract.js (~15 MB) — LAZY-LOADED only when OCR is actually needed
//   • Both are 100% client-side. ZERO health data ever leaves the browser.
//
// PRIVACY GUARANTEE:
//   • Tesseract.js downloads WASM engine + language training data from CDN
//     but processes everything locally — no patient text is transmitted.
//   • PDF.js extracts text entirely in-browser via a Web Worker.
//   • The NLP normalizer + code mapper are pure local JS dictionaries.
//
// PERFORMANCE:
//   • Zero impact on initial page load (dynamic import)
//   • Heavy deps download only on first document upload
//   • OCR uses a reusable Web Worker (created once, reused across pages)
//   • Images pre-processed (resized) to avoid out-of-memory
//   • Worker is terminated after batch to free memory
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Constants ──────────────────────────────────────────────────────────────

import { normalizeText, normalizeMedications, normalizeLabResults } from '../normalizers/medicalNLP'
import { enrichWithCodes } from '../normalizers/clinicalCodeMapper'

const OCR_LANGUAGES = 'eng'
const PDF_RENDER_SCALE = 2.0
const MIN_TEXT_LENGTH = 20
const MAX_IMAGE_DIMENSION = 4000

// ─── Password-Protected PDF Error ───────────────────────────────────────────

/**
 * Custom error thrown when a PDF requires a password to open.
 * The UI layer catches this and prompts the user for their password.
 * The password is used ONLY for that single in-memory decrypt — never saved.
 */
export class PDFPasswordError extends Error {
  constructor(filename) {
    super(`PDF "${filename}" is password-protected. Please enter the password to unlock it.`)
    this.name = 'PDFPasswordError'
    this.filename = filename
    this.isPasswordError = true
  }
}

// ─── Lazy-loaded module references ──────────────────────────────────────────

let _pdfjsLib = null
let _Tesseract = null
let _ocrWorker = null

/**
 * Lazy-load PDF.js — only fetched when first PDF is processed.
 * Adds ~2.5 MB to the session (not to the initial bundle).
 */
async function getPdfjs() {
  if (!_pdfjsLib) {
    _pdfjsLib = await import(/* @vite-ignore */ 'pdfjs-dist')
    // Configure worker — runs in a separate thread, keeps UI responsive.
    // Use jsdelivr CDN which mirrors every npm version immediately.
    // No PHI is sent — the CDN only serves a static JS file.
    const version = _pdfjsLib.version
    const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
    _pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
    console.log(`[OCR] PDF.js ${version} loaded (lazy), worker: ${workerUrl}`)
  }
  return _pdfjsLib
}

/**
 * Lazy-load Tesseract.js — only fetched when OCR is actually needed.
 * Adds ~15 MB to the session (WASM engine + English language data).
 * Language data is downloaded from a CDN but NO patient data is sent anywhere.
 */
async function getTesseract() {
  if (!_Tesseract) {
    const mod = await import(/* @vite-ignore */ 'tesseract.js')
    _Tesseract = mod.default || mod
    console.log('[OCR] Tesseract.js loaded (lazy)')
  }
  return _Tesseract
}

async function getOCRWorker() {
  if (!_ocrWorker) {
    const Tesseract = await getTesseract()
    _ocrWorker = await Tesseract.createWorker(OCR_LANGUAGES, 1, {
      logger: () => {},
    })
    console.log('[OCR] Tesseract worker ready')
  }
  return _ocrWorker
}

/**
 * Terminate the OCR worker to free memory (~15 MB).
 * Called automatically after each batch of documents.
 */
export async function terminateOCR() {
  if (_ocrWorker) {
    await _ocrWorker.terminate()
    _ocrWorker = null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PDF TEXT EXTRACTION (Digital PDFs — no OCR needed)
// ═══════════════════════════════════════════════════════════════════════════════

async function extractPDFText(buffer, onProgress = () => {}, password = null) {
  const pdfjsLib = await getPdfjs()
  const loadOpts = { data: buffer }
  if (password) loadOpts.password = password
  const pdf = await pdfjsLib.getDocument(loadOpts).promise
  const pageCount = pdf.numPages
  let fullText = ''

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()

    // ── Preserve line structure using Y-position changes + hasEOL ──
    // pdf.js text items each have a transform matrix [a,b,c,d, x, y].
    // When the Y-position jumps, that means a new line in the PDF.
    // Simply joining with spaces destroys line breaks → section detection fails.
    let pageText = ''
    let lastY = null
    for (const item of textContent.items) {
      if (!item.str && !item.hasEOL) continue
      const y = item.transform ? item.transform[5] : null
      // Detect line break: if Y position changed significantly, add newline
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        pageText = pageText.trimEnd() + '\n'
      } else if (pageText && !pageText.endsWith('\n') && !pageText.endsWith(' ') && item.str) {
        pageText += ' '
      }
      pageText += item.str || ''
      if (item.hasEOL) {
        pageText = pageText.trimEnd() + '\n'
      }
      if (y !== null) lastY = y
    }
    pageText = pageText.trim()

    if (pageText) {
      fullText += `\n--- Page ${i} ---\n${pageText}\n`
    }

    onProgress(i / pageCount * 0.5)
    page.cleanup()
  }

  console.log(`[OCR] Extracted ${fullText.length} chars, ${fullText.split('\n').length} lines from ${pageCount} pages`)
  console.log('[OCR] First 2000 chars of extracted text:', fullText.substring(0, 2000))

  const hasText = fullText.trim().length >= MIN_TEXT_LENGTH
  return { text: fullText.trim(), pageCount, hasText }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. OCR — Only loaded when scanned/handwritten content is detected
// ═══════════════════════════════════════════════════════════════════════════════

async function ocrImage(imageData, onProgress = () => {}) {
  const worker = await getOCRWorker()
  const processedImage = await preprocessImage(imageData)

  const result = await worker.recognize(processedImage, {}, { text: true })
  onProgress(1)

  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence,
  }
}

async function ocrPDF(buffer, onProgress = () => {}, password = null) {
  const pdfjsLib = await getPdfjs()
  const loadOpts = { data: buffer }
  if (password) loadOpts.password = password
  const pdf = await pdfjsLib.getDocument(loadOpts).promise
  const pageCount = pdf.numPages
  const worker = await getOCRWorker()

  let fullText = ''
  let totalConfidence = 0

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })

    const canvas = new OffscreenCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise

    const blob = await canvas.convertToBlob({ type: 'image/png' })
    const result = await worker.recognize(blob)

    const pageText = result.data.text.trim()
    if (pageText) {
      fullText += `\n--- Page ${i} ---\n${pageText}\n`
    }
    totalConfidence += result.data.confidence

    onProgress(i / pageCount)
    page.cleanup()
  }

  return {
    text: fullText.trim(),
    pageCount,
    confidence: pageCount > 0 ? totalConfidence / pageCount : 0,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SMART DOCUMENT PROCESSOR — Routes to best method automatically
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process any document (PDF, image) and extract text + clinical entities.
 *
 * Loading strategy:
 *   • PDF with text layer → loads PDF.js only (~2.5 MB)
 *   • Scanned PDF         → loads PDF.js + Tesseract (~17.5 MB total)
 *   • Image (JPG/PNG/etc) → loads Tesseract only (~15 MB)
 *   • RTF/DOC/DOCX        → returns metadata only (no heavy deps)
 *
 * @param {File|Blob} file
 * @param {string} filename
 * @param {Function} onProgress - ({ phase, progress, message })
 * @returns {DocumentResult}
 */
/**
 * Process any document (PDF, image) and extract text + clinical entities.
 *
 * @param {File|Blob} file
 * @param {string} filename
 * @param {Function} onProgress - ({ phase, progress, message })
 * @param {Object} [options] - { password: string } — PDF password, used once then discarded
 * @returns {DocumentResult}
 * @throws {PDFPasswordError} When PDF is password-protected and no/wrong password given
 */
export async function processDocument(file, filename, onProgress = () => {}, options = {}) {
  const ext = (filename || file.name || '').split('.').pop().toLowerCase()
  const isPDF = ext === 'pdf'
  const isImage = ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'bmp', 'gif'].includes(ext)

  // Password is used ONLY for this one-time in-memory PDF decrypt.
  // It is NEVER saved to localStorage, state, or transmitted anywhere.
  let password = options.password || null

  if (!isPDF && !isImage) {
    return {
      text: '',
      method: 'unsupported',
      confidence: 0,
      pageCount: 0,
      clinicalEntities: createEmptyClinicalEntities(),
      metadata: { fileName: filename, fileSize: file.size, extension: ext },
    }
  }

  let result

  if (isPDF) {
    onProgress({ phase: 'loading', progress: 0, message: 'Loading PDF reader...' })
    const buffer = await readAsArrayBuffer(file)

    // Step 1: Try native text extraction (loads PDF.js only)
    onProgress({ phase: 'extracting', progress: 0.05, message: 'Extracting text from PDF...' })
    let textResult
    try {
      textResult = await extractPDFText(buffer, (p) =>
        onProgress({ phase: 'extracting', progress: 0.05 + p * 0.45, message: `Reading page ${Math.ceil(p * 2)}...` }),
        password
      )
    } catch (pdfErr) {
      // Detect pdf.js PasswordException (code 1 = need password, code 2 = wrong password)
      if (pdfErr?.name === 'PasswordException' || pdfErr?.message?.toLowerCase().includes('password')) {
        // Wipe the password from local scope immediately
        password = null
        throw new PDFPasswordError(filename)
      }
      throw pdfErr
    }

    if (textResult.hasText) {
      result = {
        text: textResult.text,
        method: 'pdf-text',
        confidence: 100,
        pageCount: textResult.pageCount,
      }
      onProgress({ phase: 'complete', progress: 1, message: 'PDF text extracted' })
    } else {
      // Scanned PDF — now load Tesseract (only if needed)
      onProgress({ phase: 'loading-ocr', progress: 0.5, message: 'Scanned PDF detected — loading OCR engine...' })
      const ocrResult = await ocrPDF(buffer, (p) =>
        onProgress({ phase: 'ocr', progress: 0.5 + p * 0.5, message: `OCR page ${Math.ceil(p * textResult.pageCount)}/${textResult.pageCount}...` }),
        password
      )
      result = {
        text: ocrResult.text,
        method: 'pdf-ocr',
        confidence: ocrResult.confidence,
        pageCount: ocrResult.pageCount,
      }
      onProgress({ phase: 'complete', progress: 1, message: `OCR complete (${Math.round(ocrResult.confidence)}% confidence)` })
    }

    // Clear password from memory after successful decrypt
    password = null
  } else {
    // Image — load Tesseract
    onProgress({ phase: 'loading-ocr', progress: 0, message: 'Loading OCR engine...' })
    const ocrResult = await ocrImage(file, (p) =>
      onProgress({ phase: 'ocr', progress: p, message: 'Recognizing text...' })
    )
    result = {
      text: ocrResult.text,
      method: 'image-ocr',
      confidence: ocrResult.confidence,
      pageCount: 1,
    }
    onProgress({ phase: 'complete', progress: 1, message: `OCR complete (${Math.round(ocrResult.confidence)}% confidence)` })
  }

  // NLP normalisation — spelling correction + abbreviation expansion (pure JS — instant)
  const nlpResult = normalizeText(result.text)
  const normalizedText = nlpResult.processedText || result.text

  // Parse clinical content from normalised text
  let clinicalEntities = parseClinicalText(normalizedText, filename)

  // ── Smart OCR fallback ───────────────────────────────────────────────────
  // If text extraction found very few clinical entities, the text layer may
  // be garbled / incomplete. Fall through to Tesseract OCR and try again.
  if (result.method === 'pdf-text') {
    const entityCount =
      clinicalEntities.medications.length +
      clinicalEntities.diagnoses.length +
      clinicalEntities.vitals.length +
      clinicalEntities.labResults.length +
      clinicalEntities.procedures.length
    // allergies not counted (NKDA alone is not enough signal)
    console.log(`[OCR] Text-layer entity count: ${entityCount} (meds=${clinicalEntities.medications.length}, dx=${clinicalEntities.diagnoses.length}, vitals=${clinicalEntities.vitals.length}, labs=${clinicalEntities.labResults.length}, procs=${clinicalEntities.procedures.length})`)

    if (entityCount < 3) {
      console.log('[OCR] Too few entities from text layer — retrying with Tesseract OCR...')
      try {
        const buffer = await readAsArrayBuffer(file)
        onProgress({ phase: 'loading-ocr', progress: 0.5, message: 'Few results from text — trying OCR...' })
        const ocrResult = await ocrPDF(buffer, (p) =>
          onProgress({ phase: 'ocr', progress: 0.5 + p * 0.5, message: `OCR page ${Math.ceil(p * result.pageCount)}/${result.pageCount}...` }),
          options.password || null
        )
        if (ocrResult.text.length > result.text.length) {
          // OCR produced more text — use it instead
          const ocrNlp = normalizeText(ocrResult.text)
          const ocrNormalized = ocrNlp.processedText || ocrResult.text
          const ocrEntities = parseClinicalText(ocrNormalized, filename)
          const ocrEntityCount =
            ocrEntities.medications.length +
            ocrEntities.diagnoses.length +
            ocrEntities.vitals.length +
            ocrEntities.labResults.length +
            ocrEntities.procedures.length
          console.log(`[OCR] OCR entity count: ${ocrEntityCount}`)
          if (ocrEntityCount > entityCount) {
            clinicalEntities = ocrEntities
            result.text = ocrResult.text
            result.method = 'pdf-ocr-fallback'
            result.confidence = ocrResult.confidence
          }
        }
      } catch (ocrErr) {
        console.warn('[OCR] OCR fallback failed:', ocrErr.message)
      }
    }
  }

  // Normalize medication names (brand→generic, RxCUI)
  clinicalEntities.medications = normalizeMedications(clinicalEntities.medications)

  // Normalize lab names to canonical form then enrich with LOINC / ICD-10 / SNOMED
  clinicalEntities.labResults = normalizeLabResults(clinicalEntities.labResults)
  enrichWithCodes(clinicalEntities)

  return {
    ...result,
    clinicalEntities,
    nlpStats: {
      expansions: nlpResult.expansionCount,
      corrections: nlpResult.correctionCount,
    },
    metadata: { fileName: filename, fileSize: file.size, extension: ext },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CLINICAL TEXT PARSER — Regex-based NLP (pure JS, no heavy deps)
// ═══════════════════════════════════════════════════════════════════════════════

export function parseClinicalText(text, filename = '') {
  if (!text || text.length < 10) return createEmptyClinicalEntities()

  const upper = text.toUpperCase()
  const entities = createEmptyClinicalEntities()

  // ── Split document into sections first ──────────────────────────────────
  const sections = splitIntoSections(text)
  console.log('[OCR] Detected sections:', Object.keys(sections).map(k => `${k}(${sections[k].split('\n').length} lines)`).join(', '))

  entities.demographics = extractDemographics(text)
  entities.dates = extractDates(text)
  entities.medications = extractMedications(text, upper, sections)
  entities.immunizations = extractImmunizations(text, upper, sections)
  entities.diagnoses = extractDiagnoses(text, upper, sections, entities.immunizations)
  entities.vitals = extractVitals(text, sections)
  entities.labResults = extractLabResults(text, upper, sections)
  entities.allergies = extractAllergies(text, upper, sections)
  entities.procedures = extractProcedures(text, upper)
  entities.careTeam = extractCareTeam(text, upper, sections)
  entities.encounters = extractEncounters(text, upper, sections)
  entities.clinicalNotes = extractClinicalNotes(text, upper, sections)
  entities.documentType = classifyDocumentType(text, upper, filename)
  entities.fullText = text

  console.log(`[OCR] parseClinicalText results: meds=${entities.medications.length}, dx=${entities.diagnoses.length}, imm=${entities.immunizations.length}, vitals=${entities.vitals.length}, labs=${entities.labResults.length}, allergies=${entities.allergies.length}, procs=${entities.procedures.length}, enc=${entities.encounters.length}, notes=${entities.clinicalNotes.length}, docType=${entities.documentType}`)

  return entities
}

// ─── Generic Section Splitter for Epic/Clinical PDFs ────────────────────────

/**
 * Splits extracted text into named sections based on common clinical headers.
 * Returns { medications: "...", diagnoses: "...", allergies: "...", vitals: "...", labs: "...", ... }
 * This is the KEY fix: instead of each extractor trying to find its own section
 * (which fails when headers don't exactly match), we scan all lines for ANY header.
 */
function splitIntoSections(text) {
  const lines = text.split('\n')
  const sections = {}
  let currentSection = '_header'
  sections[currentSection] = ''

  // Map of header patterns → normalized section names
  const SECTION_PATTERNS = [
    // Medications
    { pattern: /^(?:current\s+)?medications?(?:\s+list)?|^active\s+medications?|^medications?\s+(?:and\s+dosages?|prescribed)|^home\s+medications?|^meds\s*:|^prescriptions?|^rx\b/i, section: 'medications' },
    // Diagnoses / Problems
    { pattern: /^(?:current\s+)?(?:health\s+)?(?:issues?|problems?|conditions?)|^active\s+problems?|^problem\s*list|^diagnos(?:es|is)|^assessment|^impression|^medical\s*(?:history|conditions?)|^past\s*medical\s*history|^(?:pmh|pmhx)\b|^chief\s*complaint|^reason\s*for\s*visit|^history\s*of\s*present\s*illness|^hpi\b/i, section: 'diagnoses' },
    // Allergies
    { pattern: /^allerg(?:y|ies)(?:\s*\/?\s*(?:adverse\s*)?reactions?)?|^drug\s+allergies|^known\s+allergies/i, section: 'allergies' },
    // Vitals
    { pattern: /^vital\s*signs?|^vitals?\b|^measurements?\b|^physical\s+(?:exam(?:ination)?|findings?)|^review\s+of\s+systems?|^ros\b/i, section: 'vitals' },
    // Lab Results
    { pattern: /^lab(?:oratory)?\s*(?:results?|values?|findings?|tests?)?|^results?\b|^(?:blood|urine|serum)\s+(?:test|work)|^diagnostic\s+(?:results?|tests?)|^(?:cbc|cmp|bmp|lipid|thyroid)\b/i, section: 'labs' },
    // Procedures / Orders
    { pattern: /^procedures?|^surgic(?:al|ies)|^surgical\s*history|^past\s*surgical|^operations?\b|^imaging|^radiology/i, section: 'procedures' },
    // Immunizations
    { pattern: /^immuniz(?:ation)?s?|^vaccin(?:ation|e)s?|^flu\s+(?:shot|vaccine)/i, section: 'immunizations' },
    // Care Team
    { pattern: /^care\s*team/i, section: 'care_team' },
    // PPD / Tuberculin / Skin Test → labs
    { pattern: /^ppd|^tb\s+(?:skin|test)|^tuberculin/i, section: 'labs' },
    // Questionnaire (noise reduction)
    { pattern: /^questionnaire\b/i, section: 'questionnaire' },
    // Encounters / Visits
    { pattern: /^(?:visit|encounter)s?\s*(?:information|details?|history|summary|list)?|^(?:appointment|office\s+visit)s?|^visit\s+(?:date|type|reason)|^encounter\s+(?:date|type)|^(?:outpatient|inpatient)\s+visits?|^admission|^(?:ed|emergency)\s+visits?|^telehealth|^telemedicine/i, section: 'encounters' },
    // Clinical Notes / Summaries
    { pattern: /^(?:clinical|progress|visit|consultation|consult)\s*notes?|^(?:discharge|after[\s\-]?visit)\s+(?:summary|notes?)|^(?:history\s+(?:and|&)\s+physical|h\s*&\s*p)|^(?:operative|procedure|surgical)\s+(?:note|report)|^(?:nursing|physician|provider)\s+notes?|^assessment\s+(?:and|&)\s+plan|^a\s*\/\s*p\b|^plan\s*:|^subjective|^objective|^interval\s+history/i, section: 'clinical_notes' },
    // Instructions / Education
    { pattern: /^(?:patient\s+)?(?:instructions?|education)|^(?:after[\s\-]?visit|discharge)\s+(?:summary|instructions?)|^follow[\s\-]?up|^appointments?|^next\s+(?:visit|appointment)|^what\s+(?:to\s+do|we\s+discussed)/i, section: 'instructions' },
    // Family / Social
    { pattern: /^family\s*(?:history|medical)|^social\s*history|^(?:fh|sh)\b/i, section: 'family_social' },
    // Demographics
    { pattern: /^patient\s*(?:information|demographics?|details?)|^personal\s*information/i, section: 'demographics' },
  ]

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      sections[currentSection] += '\n'
      continue
    }

    // Skip page markers
    if (/^---\s*Page\s+\d+\s*---$/.test(trimmed)) continue

    // Skip page continuation headers like "Patient (continued)"
    if (/^patient\s*\(continued\)/i.test(trimmed)) continue

    // Handle "Section (continued)" → stay in that section
    if (/\(continued\)/i.test(trimmed)) {
      const baseText = trimmed.replace(/\s*\(continued\)\s*/i, '').trim()
      for (const { pattern, section } of SECTION_PATTERNS) {
        if (pattern.test(baseText)) {
          currentSection = section
          if (!sections[currentSection]) sections[currentSection] = ''
          break
        }
      }
      continue
    }

    // Check if this line is a section header
    let matched = false
    for (const { pattern, section } of SECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        currentSection = section
        if (!sections[currentSection]) sections[currentSection] = ''
        matched = true
        break
      }
    }

    if (!matched) {
      // Also detect "ALL CAPS" section headers (common in clinical docs)
      // e.g., "MEDICATIONS", "ALLERGIES", "VITAL SIGNS"
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 60 && /^[A-Z\s\-\/&]+$/.test(trimmed)) {
        const upperTrimmed = trimmed
        // Check upper-case variants
        for (const { pattern, section } of SECTION_PATTERNS) {
          if (pattern.test(upperTrimmed)) {
            currentSection = section
            if (!sections[currentSection]) sections[currentSection] = ''
            matched = true
            break
          }
        }
        // If still no match but it's clearly a header, start a generic section
        if (!matched && /^[A-Z][A-Z\s\-\/&]{3,}$/.test(trimmed)) {
          currentSection = trimmed.toLowerCase().replace(/[^a-z]/g, '_')
          if (!sections[currentSection]) sections[currentSection] = ''
          matched = true
        }
      }
    }

    if (!matched) {
      sections[currentSection] += trimmed + '\n'
    }
  }

  return sections
}

function createEmptyClinicalEntities() {
  return {
    demographics: null, dates: [], medications: [], diagnoses: [],
    vitals: [], labResults: [], allergies: [], procedures: [],
    immunizations: [], careTeam: [], encounters: [], clinicalNotes: [],
    documentType: 'Unknown', fullText: '',
  }
}

// ─── Demographics ───────────────────────────────────────────────────────────

function extractDemographics(text) {
  const d = {}

  // --- Name ---
  // Require explicit "Patient Name:" or "Name:" to avoid matching section headers like "Patient Information"
  const namePatterns = [
    /patient\s+name\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i,
    /^name\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/im,
    /(?:pt|resident|client)\s+name\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i,
  ]
  for (const pat of namePatterns) {
    const m = text.match(pat)
    if (m) {
      const candidate = m[1].trim()
      // Reject section-header words
      if (!/^(information|demographics|data|details|history|record|report|summary)/i.test(candidate)) {
        d.name = candidate
        break
      }
    }
  }
  // Fallback: scan individual lines for "Patient: Firstname Lastname" (but NOT followed by section-header words)
  if (!d.name) {
    const lines = text.split(/\n/)
    for (const line of lines) {
      const m = line.match(/(?:patient|pt)\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i)
      if (m) {
        const candidate = m[1].trim()
        if (!/^(information|demographics|data|details|history|record|report|summary)/i.test(candidate)) {
          d.name = candidate
          break
        }
      }
    }
  }

  const dobMatch = text.match(/(?:DOB|date\s*of\s*birth|birth\s*date)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
  if (dobMatch) d.dateOfBirth = dobMatch[1]

  // MRN — supports alphanumeric IDs like "CSM-2847561"
  const mrnMatch = text.match(/(?:MRN|medical\s*record)\s*[#:\-]?\s*([A-Z]{0,5}[\-]?\d{4,})/i)
  if (mrnMatch) d.mrn = mrnMatch[1]

  const sexMatch = text.match(/(?:sex|gender)\s*[:\-]?\s*(male|female|M|F)/i)
  if (sexMatch) d.sex = sexMatch[1].length === 1 ? (sexMatch[1].toUpperCase() === 'M' ? 'Male' : 'Female') : sexMatch[1]

  // Age — word boundary (\b) prevents false matches on "Page 1", "stage 3", "dosage 1"
  const ageMatch = text.match(/\bage\s*[:\-]\s*(\d{1,3})\s*(?:y(?:ears?|rs?)?)?/i)
  if (ageMatch) d.age = parseInt(ageMatch[1])

  return Object.keys(d).length > 0 ? d : null
}

// ─── Dates ──────────────────────────────────────────────────────────────────

function extractDates(text) {
  const patterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    /(\w+\s+\d{1,2},?\s+\d{4})/g,
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
  ]
  const dates = new Set()
  for (const p of patterns) {
    let m; while ((m = p.exec(text))) dates.add(m[1])
  }
  return [...dates].slice(0, 20)
}

// ─── Medications ────────────────────────────────────────────────────────────

const COMMON_MEDS = [
  'metformin','lisinopril','atorvastatin','amlodipine','metoprolol',
  'omeprazole','losartan','gabapentin','hydrochlorothiazide','sertraline',
  'simvastatin','montelukast','escitalopram','rosuvastatin','bupropion',
  'furosemide','pantoprazole','duloxetine','prednisone','tamsulosin',
  'carvedilol','tramadol','clopidogrel','pravastatin','meloxicam',
  'levothyroxine','albuterol','fluticasone','warfarin','insulin',
  'aspirin','ibuprofen','acetaminophen','amoxicillin','azithromycin',
  'ciprofloxacin','hydrocodone','oxycodone','alprazolam','lorazepam',
  'diazepam','clonazepam','morphine','fentanyl','cyclobenzaprine',
  'trazodone','cephalexin','doxycycline','clindamycin','fluoxetine',
  'paroxetine','venlafaxine','quetiapine','olanzapine','risperidone',
  'aripiprazole','donepezil','memantine','rivaroxaban','apixaban',
  'enoxaparin','heparin','empagliflozin','semaglutide','dulaglutide',
]

function extractMedications(text, upper, sections = {}) {
  const meds = []
  const seenNames = new Set()

  // ── USE PRE-SPLIT SECTIONS (most reliable) ────────────────────────────
  const sectionText = sections.medications || null

  // ── Fallback: Epic-style regex section match ──────────────────────────
  const secMatch = !sectionText ? text.match(
    /(?:current\s+medications?|active\s+medications?|medication\s*list|medications?\s*(?:and\s*dosages?)?|prescriptions?|rx|meds|home\s+medications?)\s*[:\-]?\s*([\s\S]*?)(?=(?:\n\s*(?:allerg|diagnos|problem|vital|lab|assessment|plan|procedure|health\s*issue|immuniz|surgical|family|social|review\s*of|past\s*medical|current\s*(?:health|problem)|after\s*visit|follow|appoint)|\n\s*\n\s*\n|$))/i
  ) : null

  const searchText = sectionText || (secMatch ? secMatch[1] : text)
  const hasMedSection = !!(sectionText || secMatch)

  // ── Helper: parse a medication line into discrete fields ────────────────
  function parseMedLine(rawLine) {
    const line = rawLine.trim()
    if (!line || line.length < 3) return null

    let name = '', dose = '', route = '', frequency = '', status = 'Active'

    // Route keywords
    const ROUTES = /\b(oral(?:ly)?|by\s+mouth|po|iv|intravenous|im|intramuscular|sq|subq|subcutaneous|topical|inhaled|nasal|intranasal|rectal|sublingual|transdermal|ophthalmic|otic|vaginal|patch|injection)\b/i
    // Frequency keywords
    const FREQS = /\b(daily|once\s+daily|twice\s+daily|bid|tid|qid|prn|q\d+h|qhs|qam|qpm|q\.?a\.?m|q\.?p\.?m|every\s+\d+\s+hours?|every\s+morning|every\s+evening|every\s+night|at\s+bedtime|once\s+weekly|weekly|monthly|as\s+needed|once|twice|three\s+times|four\s+times|(?:once|twice|three|four)\s+a\s+day|q\.\s*d\.|b\.?\s*i\.?\s*d|t\.?\s*i\.?\s*d|q\.?\s*i\.?\s*d|with\s+meals?|before\s+meals?|after\s+meals?)\b/i
    // Dose pattern
    const DOSE_PAT = /(\d+(?:\.\d+)?(?:\s*[-\/]\s*\d+(?:\.\d+)?)?\s*(?:mg|mcg|ml|g|gm|units?|iu|meq|%|patch|spray|puff|drop|tablet|capsule|cap|tab)s?)/i

    // Extract dose
    const doseM = line.match(DOSE_PAT)
    if (doseM) dose = doseM[1].trim()

    // Extract route
    const routeM = line.match(ROUTES)
    if (routeM) {
      route = routeM[1].trim()
      // Normalize common abbreviations
      if (/^po$/i.test(route)) route = 'Oral'
      else if (/^iv$/i.test(route)) route = 'Intravenous'
      else if (/^im$/i.test(route)) route = 'Intramuscular'
      else if (/^sq$|^subq$/i.test(route)) route = 'Subcutaneous'
      else if (/by\s+mouth/i.test(route)) route = 'Oral'
      else if (/oral/i.test(route)) route = 'Oral'
      else route = route.charAt(0).toUpperCase() + route.slice(1).toLowerCase()
    }

    // Extract frequency
    const freqM = line.match(FREQS)
    if (freqM) {
      frequency = freqM[1].trim()
      // Normalize
      if (/^bid$/i.test(frequency)) frequency = 'Twice daily'
      else if (/^tid$/i.test(frequency)) frequency = 'Three times daily'
      else if (/^qid$/i.test(frequency)) frequency = 'Four times daily'
      else if (/^prn$/i.test(frequency)) frequency = 'As needed'
      else if (/^qhs$/i.test(frequency)) frequency = 'At bedtime'
      else if (/^qam|q\.?\s*a\.?\s*m/i.test(frequency)) frequency = 'Every morning'
      else if (/^qpm|q\.?\s*p\.?\s*m/i.test(frequency)) frequency = 'Every evening'
      else frequency = frequency.charAt(0).toUpperCase() + frequency.slice(1).toLowerCase()
    }

    // Extract drug name — everything before dose/route/frequency, or the first word group
    name = line
      .replace(DOSE_PAT, ' ')
      .replace(ROUTES, ' ')
      .replace(FREQS, ' ')
      .replace(/\b(?:take|inject|inhale|apply|instill|insert|chew|use)\b/gi, ' ')
      .replace(/\b(?:tablet|capsule|cap|tab|solution|suspension|cream|ointment|gel|drops?|syrup|liquid|elixir|injection|vial|pen|patch|inhaler|spray|powder|film)\b/gi, ' ')
      .replace(/[,;.\-\u2013\u2014]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    // If name is too short or looks like noise, use the original line
    if (name.length < 2) name = line.substring(0, 60)

    // Clean up: remove leading/trailing generic words
    name = name.replace(/^\s*(medication|drug|rx|prescription|#\d+)\s*/i, '').trim()
    // Capitalize first letter
    if (name) name = name.charAt(0).toUpperCase() + name.slice(1)

    return { name, dose, route, frequency, status }
  }

  // Strategy 1: Line-by-line parsing within the medication section
  if (hasMedSection) {
    const medText = sectionText || secMatch[1]
    const lines = medText.split('\n')
    for (const rawLine of lines) {
      const line = rawLine.replace(/^[\s\-\u2022\u2023\u25E6\u25CF\u25CB\u2013\u2014•·*]+/, '').trim()
      if (!line || line.length < 3) continue
      // Skip sub-headers
      if (/^(medication|drug|name|dose|frequency|route|status|refill|prescribed|taking|stop)/i.test(line)) continue

      // Check for dosage unit or known instruction
      if (/\d+\s*(?:mg|mcg|ml|units?|iu|meq|gm?|%|patch|spray|puff|drop)\b/i.test(line) || /\b(?:take|inject|inhale|apply|instill|insert|chew)\b/i.test(line)) {
        const parsed = parseMedLine(line)
        if (parsed && parsed.name.length > 2) {
          const key = parsed.name.toLowerCase().replace(/\s+/g, '')
          if (!seenNames.has(key)) {
            meds.push({ ...parsed, source: 'ocr', confidence: 'high' })
            seenNames.add(key)
          }
        }
        continue
      }

      // Match: "DrugName (dose)" or "DrugName - dose"
      const medParen = line.match(
        /^([A-Za-z][A-Za-z\-\/\s]{1,40}?)\s*[\(\-]\s*(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|units?|iu|meq|gm?|%).*)/i
      )
      if (medParen) {
        const parsed = parseMedLine(line)
        if (parsed && parsed.name.length > 2) {
          const key = parsed.name.toLowerCase().replace(/\s+/g, '')
          if (!seenNames.has(key)) {
            meds.push({ ...parsed, source: 'ocr', confidence: 'high' })
            seenNames.add(key)
          }
        }
        continue
      }

      // Any remaining line in the med section with enough characters → try to parse
      if (line.length >= 5 && line.length <= 120 && /[A-Za-z]{3,}/.test(line)) {
        const parsed = parseMedLine(line)
        if (parsed && parsed.name.length > 2) {
          const key = parsed.name.toLowerCase().replace(/\s+/g, '')
          if (!seenNames.has(key)) {
            meds.push({ ...parsed, source: 'ocr', confidence: 'medium' })
            seenNames.add(key)
          }
        }
      }
    }
  }

  // Strategy 2: Known medication name search (works even without section headers)
  for (const med of COMMON_MEDS) {
    const regex = new RegExp(`\\b${med}\\b[^\\n]{0,80}`, 'gi')
    const match = searchText.match(regex)
    if (match) {
      const key = med.toLowerCase()
      if (!seenNames.has(key)) {
        const parsed = parseMedLine(match[0])
        if (parsed) {
          // Ensure the drug name is clean
          if (!parsed.name || parsed.name.length < 3) parsed.name = med.charAt(0).toUpperCase() + med.slice(1)
          meds.push({ ...parsed, source: 'ocr', confidence: 'medium' })
          seenNames.add(key)
        }
      }
    }
  }

  // Strategy 3: Generic suffix pattern for drug names not in COMMON_MEDS
  const genericPat = /\b([A-Z][a-z]+(?:ol|in|ine|ide|ate|one|pam|lam|cin|xin|mab|nib|tid|zol|pine|pril|tan|lol|fen|lin|min|dine|zine|done|sone|mide|azole|oxin|mycin|statin|sartan|dipine))\s+(\d+\s*(?:mg|mcg|ml|units?|iu)[^\n]{0,60})/gi
  let m
  while ((m = genericPat.exec(searchText))) {
    const name = m[1].toLowerCase()
    if (!seenNames.has(name)) {
      const parsed = parseMedLine(`${m[1]} ${m[2]}`)
      if (parsed) {
        if (!parsed.name || parsed.name.length < 3) parsed.name = m[1]
        meds.push({ ...parsed, source: 'ocr', confidence: 'low' })
        seenNames.add(name)
      }
    }
  }
  return meds
}

// ─── Diagnoses ──────────────────────────────────────────────────────────────

const COMMON_CONDITIONS = [
  'hypertension','diabetes','type 2 diabetes','type 1 diabetes',
  'hyperlipidemia','hypothyroidism','asthma','copd','heart failure',
  'coronary artery disease','atrial fibrillation','chronic kidney disease',
  'anemia','obesity','depression','anxiety','osteoarthritis',
  'rheumatoid arthritis','osteoporosis','gout','gastroesophageal reflux',
  'gerd','pneumonia','bronchitis','urinary tract infection',
  'cellulitis','sepsis','stroke','dvt','pulmonary embolism',
  'cancer','pancreatitis','appendicitis','cholecystitis','diverticulitis',
  'crohn','ulcerative colitis','epilepsy','parkinson','alzheimer',
  'dementia','multiple sclerosis','lupus','fibromyalgia','migraine',
  'sleep apnea','insomnia',
]

// ─── Immunization / Vaccine line detector ────────────────────────────────────
// Used to EXCLUDE vaccine records from the diagnoses extractor
function isImmunizationLine(line) {
  const lower = line.toLowerCase()
  // Direct vaccine keywords
  if (/\b(?:vaccin|immuniz|inoculat|booster)\b/i.test(line)) return true
  // Specific vaccine names / products
  if (/\b(?:covid[\-\s]?19|sars[\-\s]?cov|pfizer|moderna|johnson|janssen|astrazeneca|novavax|biontech|mrna|flu\s+shot|influenza\s+(?:vaccine|inj)|tdap|dtap|mmr|hep\s*[ab]|hepatitis|polio|ipv|opv|varicella|shingrix|zoster|pneumo(?:vax|coccal)|prevnar|pcv|gardasil|hpv|meningococcal|menactra|rotavirus|bcg|rabies|typhoid|yellow\s*fever|hav\b|hbv\b|infs\b|fluarix|fluzone|flucelvax|adacel|boostrix|havrix|engerix|tetanus|diphtheria|pertussis|quadrivalent)\b/i.test(line)) return true
  // Vaccine admin metadata patterns
  if (/\b(?:given\s+by|lot\s*(?:number|#)|ndc\s*:|cvx\s*(?:code)?\s*:|vis\s+publish|expiration\s*date|manufacturer|site\s*:\s*(?:left|right)\s+(?:deltoid|arm|thigh|gluteal)|route\s*:\s*(?:intramuscular|subcutaneous|intradermal|oral|intranasal)|(?:0\.\d+|\d+)\s*ml\s*\[?milliliters?\]?)\b/i.test(line)) return true
  // "PURPLE CAP" / "GRAY CAP" / "ORANGE CAP" — vaccine packaging
  if (/\b(?:purple|gray|grey|orange|blue|green|yellow|white)\s+cap\b/i.test(line)) return true
  // Dose / series patterns for immunizations ("Dose: 0.3 mL", "Dose 1 of 2")
  if (/\bdose\s*(?:#|\d|:)\s*(?:\d|0\.)/i.test(line)) return true
  // CVX, NDC, or VIS references
  if (/\b(?:cvx|ndc|vis)\b/i.test(lower)) return true
  // "Product: ...VACCINE..." pattern
  if (/^product\s*:/i.test(line)) return true
  return false
}

function extractDiagnoses(text, upper, sections = {}, immunizationEntities = []) {
  const diagnoses = []
  const seenCodes = new Set()
  const seenConditions = new Set()

  // Build a set of ICD codes already captured as immunizations (to avoid double-counting)
  const immunizationCodes = new Set()
  for (const imm of immunizationEntities) {
    if (imm.icd10) immunizationCodes.add(imm.icd10)
    if (imm.cvx) immunizationCodes.add(imm.cvx)
  }

  // ── USE PRE-SPLIT SECTIONS (most reliable) ────────────────────────────
  const sectionText = sections.diagnoses || null
  // EXCLUDE immunization section text from diagnosis searching
  const immunizationSectionText = sections.immunizations || ''

  // ── Fallback: regex section match ──────────────────────────────────────
  const secMatch = !sectionText ? text.match(
    /(?:current\s+(?:health\s+)?(?:issues?|problems?|conditions?)|active\s+problems?|problem\s*list|diagnos(?:es|is)|assessment|impression|medical\s*(?:history|conditions?)|health\s*issues?|past\s*medical\s*history|chief\s*complaint|reason\s*for\s*visit)\s*[:\-]?\s*([\s\S]*?)(?=(?:\n\s*(?:medication|allerg|vital|lab|plan|procedure|immuniz|surgical|social|family|review\s*of|current\s*med|after\s*visit|follow|appoint|home\s*med)|\n\s*\n\s*\n|$))/i
  ) : null

  const searchText = sectionText || (secMatch ? secMatch[1] : text)
  const hasDxSection = !!(sectionText || secMatch)

  // Strategy 1: Line-by-line parsing within problem/diagnosis section
  // Handles Kaiser/Epic Problem List format:
  //   LUMBAR MUSCLE STRAIN                    (condition name — bold header)
  //   Diagnosis: LUMBAR MUSCLE STRAIN   Noted on: 02/01/2019   Chronic: No
  //   ICD-10-CM: S39.012A
  if (hasDxSection) {
    const dxText = sectionText || secMatch[1]
    const lines = dxText.split('\n')
    let currentDx = null  // Track current diagnosis for ICD code attachment

    for (const rawLine of lines) {
      const line = rawLine.replace(/^[\s\-\u2022\u2023\u25E6\u25CF\u25CB\u2013\u2014•·*]+/, '').trim()
      if (!line || line.length < 3) continue

      // ── Skip meta lines ───────────────────────────────────────────────
      if (/^(problem|condition|issue|status|date|onset|provider|note|resolved|active|inactive|#)/i.test(line)) continue
      if (/^problems?\s+last\s+reviewed/i.test(line)) continue
      if (line.length < 5 && !/[A-Z]\d{2}/.test(line)) continue

      // ── Immunization filter ───────────────────────────────────────────
      if (isImmunizationLine(line)) continue

      // ── Parse "ICD-10-CM: S39.012A" or "ICD-10: E11.65" ──────────────
      const icdLabelMatch = line.match(/^ICD[\-\s]?10[\-\s]?(?:CM)?\s*:\s*([A-TV-Z]\d{2}(?:\.[\dA-Za-z]{1,4})?)/i)
      if (icdLabelMatch) {
        const code = icdLabelMatch[1]
        if (immunizationCodes.has(code)) continue
        if (currentDx && !currentDx.code) {
          // Attach ICD code to the current diagnosis being built
          currentDx.code = code
          currentDx.codeSystem = 'ICD-10'
          currentDx.icd10 = code
          seenCodes.add(code)
        } else if (!seenCodes.has(code)) {
          diagnoses.push({ name: code, code, codeSystem: 'ICD-10', icd10: code, source: 'ocr', confidence: 'high' })
          seenCodes.add(code)
        }
        continue
      }

      // ── Parse "Diagnosis: CONDITION   Noted on: DATE   Chronic: Yes/No"
      const dxLabelMatch = line.match(/^Diagnosis\s*:\s*(.+?)(?:\s{2,}|\t|$)/i)
      if (dxLabelMatch) {
        const name = dxLabelMatch[1].trim()
        if (name.length > 2 && !isImmunizationLine(name)) {
          const key = name.toLowerCase()
          const notedMatch = line.match(/noted\s+on\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
          const chronicMatch = line.match(/chronic\s*:\s*(yes|no)/i)
          if (seenConditions.has(key)) {
            // Enrich existing diagnosis with metadata
            const existing = diagnoses.find(d => d.name.toLowerCase() === key)
            if (existing) {
              if (notedMatch) existing.onsetDate = notedMatch[1]
              if (chronicMatch) existing.chronic = chronicMatch[1].toLowerCase() === 'yes'
              currentDx = existing
            }
          } else {
            currentDx = { name, source: 'ocr', confidence: 'high' }
            if (notedMatch) currentDx.onsetDate = notedMatch[1]
            if (chronicMatch) currentDx.chronic = chronicMatch[1].toLowerCase() === 'yes'
            diagnoses.push(currentDx)
            seenConditions.add(key)
          }
        }
        continue
      }

      // ── Inline ICD: "condition text (E11.65)" or "condition - E11.65"
      const icdInLine = line.match(/^(.+?)\s*[\(\-\u2013\u2014]\s*([A-TV-Z]\d{2}(?:\.[\dA-Za-z]{1,4})?)\)?/)
      if (icdInLine) {
        const name = icdInLine[1].replace(/[\s\-\u2013\u2014]+$/, '').trim()
        const code = icdInLine[2]
        if (immunizationCodes.has(code)) continue
        if (isImmunizationLine(name)) continue
        if (!seenCodes.has(code) && name.length > 2) {
          currentDx = { name, code, codeSystem: 'ICD-10', icd10: code, source: 'ocr', confidence: 'high' }
          diagnoses.push(currentDx)
          seenCodes.add(code)
          seenConditions.add(name.toLowerCase())
        }
        continue
      }

      // ── Any remaining non-trivial line → likely a diagnosis name ──────
      if (line.length >= 5 && line.length <= 150 && !/^\d+$/.test(line)) {
        const key = line.toLowerCase()
        if (!seenConditions.has(key)) {
          currentDx = { name: line, source: 'ocr', confidence: hasDxSection ? 'high' : 'medium' }
          diagnoses.push(currentDx)
          seenConditions.add(key)
        }
      }
    }
  }

  // Strategy 2: Lines with "diagnosis text - ICD_CODE" or "diagnosis text (ICD-10: CODE)"
  // ONLY search within the diagnosis section text (not full text) to avoid vaccine ICD codes
  const strategy2Text = hasDxSection ? searchText : text
  const linePatterns = [
    /^[\-\s]*(.+?)\s*[\-\u2013\u2014]\s*([A-TV-Z]\d{2}(?:\.[\dA-Za-z]{1,4})?)\s*$/gm,
    /^[\-\s]*(.+?)\s*\((?:ICD[\- ]?10\s*:\s*)?([A-TV-Z]\d{2}(?:\.[\dA-Za-z]{1,4})?)\)\s*$/gm,
  ]
  for (const pat of linePatterns) {
    let m
    while ((m = pat.exec(strategy2Text))) {
      const name = m[1].replace(/\s*[\-\u2013\u2014]\s*$/, '').trim()
      const code = m[2]
      if (!name || seenCodes.has(code)) continue
      if (immunizationCodes.has(code)) continue
      if (isImmunizationLine(name)) continue
      diagnoses.push({ name, code, codeSystem: 'ICD-10', icd10: code, source: 'ocr', confidence: 'high' })
      seenCodes.add(code)
      for (const c of COMMON_CONDITIONS) {
        if (name.toLowerCase().includes(c)) seenConditions.add(c)
      }
    }
  }

  // Strategy 3: COMMON_CONDITIONS not already captured
  // Only search OUTSIDE the immunization section
  const nonImmText = hasDxSection ? searchText : text.replace(immunizationSectionText, '')
  for (const c of COMMON_CONDITIONS) {
    if (seenConditions.has(c)) continue
    if (nonImmText.toLowerCase().includes(c)) {
      const alreadyLinked = diagnoses.some(d => d.name.toLowerCase().includes(c))
      if (!alreadyLinked) {
        diagnoses.push({ name: c.charAt(0).toUpperCase() + c.slice(1), source: 'ocr', confidence: hasDxSection ? 'high' : 'low' })
        seenConditions.add(c)
      }
    }
  }

  // Strategy 4: Standalone ICD codes — ONLY from the diagnosis section text, not full text
  // This prevents picking up ICD codes from immunization records (U07.1 etc.)
  if (hasDxSection) {
    const icdPat = /\b([A-TV-Z]\d{2}(?:\.[\dA-Za-z]{1,4})?)\b/g
    let m
    while ((m = icdPat.exec(searchText))) {
      if (seenCodes.has(m[1])) continue
      if (immunizationCodes.has(m[1])) continue
      diagnoses.push({ name: m[1], code: m[1], codeSystem: 'ICD-10', icd10: m[1], source: 'ocr', confidence: 'high' })
      seenCodes.add(m[1])
    }
  }

  return diagnoses
}

// ─── Immunizations ──────────────────────────────────────────────────────────

/**
 * Extract immunization / vaccine records from clinical text.
 * Returns array of { name, date, dose, route, site, lotNumber, manufacturer, cvx, ndc, icd10, source }
 */
function extractImmunizations(text, upper, sections = {}) {
  const immunizations = []
  const seenNames = new Set()

  // Use immunization section if available
  const sectionText = sections.immunizations || null

  // Fallback: regex section match for immunization block
  const secMatch = !sectionText ? text.match(
    /(?:immuniz(?:ation)?s?|vaccin(?:ation|e)s?)\s*[:\-]?\s*([\s\S]*?)(?=(?:\n\s*(?:medication|allerg|diagnos|problem|vital|lab|plan|procedure|surgical|social|family|review\s*of|questionnaire|after\s*visit|follow|appoint|current\s*(?:health|problem|med))|\n\s*\n\s*\n|$))/i
  ) : null

  const searchText = sectionText || (secMatch ? secMatch[1] : '')
  if (!searchText) {
    // Also try to find vaccine records in the full text
    return extractImmunizationsFromFullText(text)
  }

  const lines = searchText.split('\n')
  let currentVaccine = null

  for (const rawLine of lines) {
    const line = rawLine.replace(/^[\s\-\u2022\u2023\u25E6\u25CF\u25CB\u2013\u2014•·*]+/, '').trim()
    if (!line || line.length < 3) continue
    // Skip sub-headers and noise lines
    if (/^(immunization|vaccination|vaccine|status|date|dose|type|#|questionnaire|question\s+answer|user|reviewed\s+on|previous\s+revisions?|\[pending\]|the\s+documentation|is\s+this\s+ehs|admin\s+location)/i.test(line)) continue
    // Skip reviewer lines: "Rodriguez, Adrina L (L.V.N.) 10/10/2024 1408"
    if (/^[A-Z][a-z]+,\s+[A-Z][a-z]+.*\((?:L\.?V\.?N|R\.?N|M\.?D|D\.?O|N\.?P|P\.?A)\.?\)\s+\d{1,2}\/\d{1,2}\/\d{4}/i.test(line)) continue

    // Detect a new vaccine name line (e.g., "COVID-19 mRNA, LNP-S, PF (Pfizer-BioNTech) PURPLE CAP")
    const isVaccineName = /\b(?:vaccin|covid|influenza|tdap|dtap|mmr|hep\s*[ab]|hepatitis|polio|varicella|shingrix|zoster|pneumo|prevnar|gardasil|hpv|meningo|rotavirus|bcg|rabies|typhoid|yellow\s*fever|mrna|lnp|fluarix|fluzone|flucelvax|adacel|boostrix|havrix|engerix|tetanus|diphtheria|pertussis|quadrivalent)\b/i.test(line)
      || /^(?:COVID|FLU|TDAP|MMR|HEPB?|IPV|VAR|PCV|HIB|ROTAVIRUS|HAV|HBV|INFS|ADACEL|BOOSTRIX|Tdap)/i.test(line)

    if (isVaccineName) {
      // Save previous vaccine if exists
      if (currentVaccine && !seenNames.has(currentVaccine.name.toLowerCase())) {
        immunizations.push(currentVaccine)
        seenNames.add(currentVaccine.name.toLowerCase())
      }
      currentVaccine = { name: line.substring(0, 120), source: 'ocr', confidence: 'high' }
      continue
    }

    // Parse metadata lines into current vaccine
    if (currentVaccine) {
      // "Given by: ... Date: 4/16/2021 Dose: 0.3 mL"
      const dateM = line.match(/date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
      if (dateM) currentVaccine.date = dateM[1]
      const doseM = line.match(/dose\s*:\s*([\d.]+\s*(?:ml|mg|mcg)[\s\w]*)/i)
      if (doseM) currentVaccine.dose = doseM[1]
      // "Site: Left Deltoid Route: Intramuscular NDC: 59267-1000-01"
      const siteM = line.match(/site\s*:\s*([^\s](?:[^R]*?)?)\s*(?:route|ndc|$)/i)
      if (siteM) currentVaccine.site = siteM[1].trim()
      const routeM = line.match(/route\s*:\s*(\S+)/i)
      if (routeM) currentVaccine.route = routeM[1].trim()
      const ndcM = line.match(/ndc\s*:\s*([\d\-]+)/i)
      if (ndcM) currentVaccine.ndc = ndcM[1]
      // "CVX code: 208"
      const cvxM = line.match(/cvx\s*(?:code)?\s*:\s*(\d+)/i)
      if (cvxM) currentVaccine.cvx = cvxM[1]
      // "Product: PFIZER COVID-19 VACCINE (PF) Manufacturer: Pfizer, Inc Lot number: ER8735"
      const lotM = line.match(/lot\s*(?:number|#)?\s*:\s*(\S+)/i)
      if (lotM) currentVaccine.lotNumber = lotM[1]
      const mfgM = line.match(/manufacturer\s*:\s*([^L]+)/i)
      if (mfgM) currentVaccine.manufacturer = mfgM[1].trim().replace(/\s+$/, '')
      // "Expiration date: 7/31/2021"
      // (not critical for clinical display, skip)
    }
  }

  // Push last vaccine
  if (currentVaccine && !seenNames.has(currentVaccine.name.toLowerCase())) {
    immunizations.push(currentVaccine)
    seenNames.add(currentVaccine.name.toLowerCase())
  }

  return immunizations
}

/**
 * Fallback: search full text for vaccine patterns when no immunization section found.
 */
function extractImmunizationsFromFullText(text) {
  const immunizations = []
  const seenNames = new Set()

  // Match known vaccine patterns in the full text
  const vaccinePatterns = [
    /\b(COVID[\-\s]?19\s+(?:mRNA|viral\s+vector|protein\s+subunit)[^\n]{0,80})/gi,
    /\b((?:PFIZER|MODERNA|JANSSEN|JOHNSON|ASTRAZENECA|NOVAVAX)\s+COVID[^\n]{0,80})/gi,
    /\b(influenza\s+(?:vaccine|inj(?:ection)?)[^\n]{0,60})/gi,
    /\b((?:Tdap|DTaP|MMR|Hep\s*[AB]|IPV|Varicella|Shingrix|Pneumovax|Prevnar|Gardasil)\s*[^\n]{0,60})/gi,
  ]

  for (const pat of vaccinePatterns) {
    let m
    while ((m = pat.exec(text))) {
      const name = m[1].trim().substring(0, 120)
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30)
      if (!seenNames.has(key)) {
        immunizations.push({ name, source: 'ocr', confidence: 'medium' })
        seenNames.add(key)
      }
    }
  }

  return immunizations
}

// ─── Vitals ─────────────────────────────────────────────────────────────────

function extractVitals(text, sections = {}) {
  const vitals = []
  const seen = new Set()
  // Search vitals section first, then full text
  const searchText = sections.vitals ? (sections.vitals + '\n' + text) : text
  const patterns = [
    { name: 'Blood Pressure', regex: /(?:BP|blood\s*pressure|systolic\s*\/?\s*diastolic)\s*[:\-]?\s*(\d{2,3})\s*[\/\\]\s*(\d{2,3})/i, fmt: m => `${m[1]}/${m[2]} mmHg` },
    { name: 'Heart Rate',     regex: /(?:HR|heart\s*rate|pulse)\s*[:\-]?\s*(\d{2,3})\s*(?:bpm|\/min)?/i, fmt: m => `${m[1]} bpm` },
    { name: 'Temperature',    regex: /(?:temp(?:erature)?)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)\s*(?:°?\s*[FC])?/i, fmt: m => `${m[1]}°F` },
    { name: 'SpO2',           regex: /(?:SpO2|oxygen\s*sat(?:uration)?|O2\s*sat|pulse\s*ox)\s*[:\-]?\s*(\d{2,3})\s*%?/i, fmt: m => `${m[1]}%` },
    { name: 'Respiratory Rate', regex: /(?:RR|resp(?:iratory)?\s*rate|breaths?\s*(?:per\s*min)?)\s*[:\-]?\s*(\d{1,2})/i, fmt: m => `${m[1]} breaths/min` },
    { name: 'Weight',         regex: /(?:weight|wt)\s*[:\-]?\s*(\d{2,4}(?:\.\d{1,2})?)\s*(?:lbs?|kg|pounds?|kilograms?)?/i, fmt: m => `${m[1]} lbs` },
    { name: 'Height',         regex: /(?:height|ht)\s*[:\-]?\s*(\d{1})['\u2032\s]*(\d{1,2})["\u2033\s]*/i, fmt: m => `${m[1]}'${m[2]}"` },
    { name: 'Height',         regex: /(?:height|ht)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)\s*(?:cm|in)/i, fmt: m => `${m[1]} cm` },
    { name: 'BMI',            regex: /(?:BMI|body\s*mass\s*index)\s*[:\-]?\s*(\d{2}(?:\.\d{1,2})?)/i, fmt: m => m[1] },
    { name: 'Pain Level',     regex: /(?:pain\s*(?:level|score|scale))\s*[:\-]?\s*(\d{1,2})\s*(?:\/\s*10)?/i, fmt: m => `${m[1]}/10` },
  ]
  for (const { name, regex, fmt } of patterns) {
    const m = searchText.match(regex)
    if (m && !seen.has(name)) {
      vitals.push({ name, value: fmt(m), source: 'ocr' })
      seen.add(name)
    }
  }
  return vitals
}

// ─── Lab Results ────────────────────────────────────────────────────────────

function extractLabResults(text, upper, sections = {}) {
  const results = []
  const seen = new Set()
  // Search labs section first, then full text
  const searchText = sections.labs ? (sections.labs + '\n' + text) : text

  // Named patterns — match "TestName : value unit" or "TestName value unit"
  const patterns = [
    { name: 'Glucose',         regex: /(?:glucose|blood\s*sugar|FBG)[\s:,\-]*?(\d{2,4})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'HbA1c',           regex: /(?:HbA1c|A1c|hemoglobin\s*a1c)[\s:,\-]*?(\d{1,2}(?:\.\d{1,2})?)\s*%?/i, unit: '%' },
    { name: 'Creatinine',      regex: /(?:creatinine|creat)[\s:,\-]*?(\d{1,2}(?:\.\d{1,2})?)\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'BUN',             regex: /(?:BUN|blood\s*urea)[\s:,\-]*?(\d{1,3})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'eGFR',            regex: /(?:eGFR|GFR)[\s:,\-]*?(\d{1,3})\s*(?:mL\/min)?/i, unit: 'mL/min' },
    { name: 'WBC',             regex: /(?:WBC|white\s*(?:blood\s*)?(?:cell\s*)?count)[\s:,\-]*?(\d{1,3}(?:\.\d)?)\s*(?:K\/uL)?/i, unit: 'K/uL' },
    { name: 'Hemoglobin',      regex: /(?<!hemoglobin\s*a1c.{0,20})(?:hemoglobin|hgb|hb)(?!\s*a1c)[\s:,\-]*?(\d{1,2}(?:\.\d)?)\s*(?:g\/dL)?/i, unit: 'g/dL' },
    { name: 'Hematocrit',      regex: /(?:hematocrit|hct)[\s:,\-]*?(\d{2,3}(?:\.\d)?)\s*%?/i, unit: '%' },
    { name: 'Platelets',       regex: /(?:platelets?|plt)[\s:,\-]*?(\d{2,4})\s*(?:K\/uL)?/i, unit: 'K/uL' },
    { name: 'Sodium',          regex: /(?:sodium)[\s:,\-]*?(\d{3})\s*(?:mEq\/L)?/i, unit: 'mEq/L' },
    { name: 'Potassium',       regex: /(?:potassium)[\s:,\-]*?(\d{1}(?:\.\d)?)\s*(?:mEq\/L)?/i, unit: 'mEq/L' },
    { name: 'Cholesterol',     regex: /(?:total\s*cholesterol|^cholesterol)[\s:,\-]*?(\d{2,3})\s*(?:mg\/dL)?/im, unit: 'mg/dL' },
    { name: 'LDL',             regex: /(?:LDL(?:\s*cholesterol)?)[\s:,\-]*?(\d{2,3})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'HDL',             regex: /(?:HDL(?:\s*cholesterol)?)[\s:,\-]*?(\d{2,3})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'Triglycerides',   regex: /(?:triglycerides?|TG)[\s:,\-]*?(\d{2,4})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'TSH',             regex: /(?:TSH)[\s:,\-]*?(\d{1,2}(?:\.\d{1,3})?)\s*(?:mIU\/L)?/i, unit: 'mIU/L' },
    { name: 'ALT',             regex: /(?:ALT|SGPT)[\s:,\-]*?(\d{1,4})\s*(?:U\/L)?/i, unit: 'U/L' },
    { name: 'AST',             regex: /(?:AST|SGOT)[\s:,\-]*?(\d{1,4})\s*(?:U\/L)?/i, unit: 'U/L' },
    { name: 'ALP',             regex: /(?:ALP|alkaline\s*phosphatase)[\s:,\-]*?(\d{1,4})\s*(?:U\/L)?/i, unit: 'U/L' },
    { name: 'Chloride',        regex: /(?:chloride)[\s:,\-]*?(\d{2,3})\s*(?:mEq\/L)?/i, unit: 'mEq/L' },
    { name: 'CO2',             regex: /(?:CO2|bicarbonate)[\s:,\-]*?(\d{2,3})\s*(?:mEq\/L)?/i, unit: 'mEq/L' },
    { name: 'Calcium',         regex: /(?:calcium)[\s:,\-]*?(\d{1,2}(?:\.\d)?)\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'Albumin',         regex: /(?:albumin)[\s:,\-]*?(\d{1}(?:\.\d)?)\s*(?:g\/dL)?/i, unit: 'g/dL' },
    { name: 'Total Protein',   regex: /(?:total\s*protein)[\s:,\-]*?(\d{1,2}(?:\.\d)?)\s*(?:g\/dL)?/i, unit: 'g/dL' },
    { name: 'Bilirubin',       regex: /(?:bilirubin(?:\s*total)?)[\s:,\-]*?(\d{1}(?:\.\d{1,2})?)\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'INR',             regex: /(?:INR)[\s:,\-]*?(\d{1}(?:\.\d{1,2})?)/i, unit: '' },
    { name: 'BNP',             regex: /(?:BNP|B-natriuretic)[\s:,\-]*?(\d{1,5})\s*(?:pg\/mL)?/i, unit: 'pg/mL' },
    { name: 'Troponin I',      regex: /(?:troponin\s*I?)[\s:,\-]*?(\d{1}(?:\.\d{1,3})?)\s*(?:ng\/mL)?/i, unit: 'ng/mL' },
    { name: 'CK-MB',           regex: /(?:CK[\-\s]?MB)[\s:,\-]*?(\d{1,2}(?:\.\d)?)\s*(?:ng\/mL)?/i, unit: 'ng/mL' },
    { name: 'RBC',             regex: /(?:RBC|red\s*blood\s*(?:cell\s*)?count)[\s:,\-]*?(\d{1}(?:\.\d)?)\s*(?:M\/uL)?/i, unit: 'M/uL' },
    { name: 'MCV',             regex: /(?:MCV|mean\s*corp)[\s:,\-]*?(\d{2,3}(?:\.\d)?)\s*(?:fL)?/i, unit: 'fL' },
  ]

  for (const { name, regex, unit } of patterns) {
    const m = searchText.match(regex)
    if (m) {
      const key = name.toLowerCase()
      if (!seen.has(key)) {
        results.push({ name, value: m[1], unit, source: 'ocr' })
        seen.add(key)
      }
    }
  }

  // Generic table-row parser: lines like "TestName  123  mg/dL  70-100  HIGH"
  // Catches labs not in the named patterns above
  const tableLineRegex = /^[\s\|]*([A-Z][A-Za-z\s\-\/]{2,30}?)\s{1,}(\d{1,5}(?:\.\d{1,3})?)\s{1,}([A-Za-z\/%]{1,15})\s{1,}[\d<>\.\-]/gm
  let tm
  while ((tm = tableLineRegex.exec(searchText))) {
    const name = tm[1].trim()
    const value = tm[2]
    const unit = tm[3].trim()
    const key = name.toLowerCase()
    // Skip table headers and already-captured results
    if (/^(test|result|unit|reference|flag|normal|specimen|date|time|panel|section)/i.test(name)) continue
    if (!seen.has(key)) {
      results.push({ name, value, unit, source: 'ocr' })
      seen.add(key)
    }
  }

  return results
}

// ─── Allergies ──────────────────────────────────────────────────────────────

function extractAllergies(text, upper, sections = {}) {
  const allergies = []
  const seen = new Set()

  if (upper.includes('NKDA') || upper.includes('NO KNOWN DRUG ALLERGIES') || upper.includes('NO KNOWN ALLERGIES')) {
    allergies.push({ name: 'NKDA', reaction: 'No Known Drug Allergies', source: 'ocr' })
    return allergies
  }

  // ── USE PRE-SPLIT SECTIONS (most reliable) ────────────────────────────
  const sectionText = sections.allergies || null

  // ── Fallback: regex section match ──────────────────────────────────────
  const secMatch = !sectionText ? text.match(
    /(?:allerg(?:y|ies)(?:\s*\/\s*(?:adverse\s*)?reactions?)?)\s*[:\-]?\s*([\s\S]*?)(?=(?:\n\s*(?:medication|diagnos|problem|vital|lab|assessment|plan|procedure|immuniz|surgical|current\s*(?:med|health|problem)|after\s*visit|follow)|\n\s*\n\s*\n|$))/i
  ) : null

  const allergyText = sectionText || (secMatch ? secMatch[1] : null)

  if (allergyText) {
    const lines = allergyText.split('\n')
    for (const rawLine of lines) {
      const line = rawLine.replace(/^[\s\-\u2022\u2023\u25E6\u25CF\u25CB\u2013\u2014•·*]+/, '').trim()
      if (!line || line.length < 2) continue
      if (/^(allergy|allergen|reaction|severity|status|type|date|category|none|no\s)/i.test(line)) continue

      // Parse reaction if present: "Penicillin - Rash" or "Penicillin (Hives)"
      const reactionMatch = line.match(/^(.+?)\s*[\-\u2013\u2014]\s*(.+)$/) || line.match(/^(.+?)\s*\((.+?)\)\s*$/)
      if (reactionMatch) {
        const name = reactionMatch[1].trim()
        const reaction = reactionMatch[2].trim()
        const key = name.toLowerCase()
        if (!seen.has(key)) {
          allergies.push({ name, reaction, source: 'ocr' })
          seen.add(key)
        }
      } else {
        const key = line.toLowerCase()
        if (!seen.has(key) && line.length <= 80) {
          allergies.push({ name: line, source: 'ocr' })
          seen.add(key)
        }
      }
    }
  }

  // ── Known allergen keyword search (fallback) ────────────────────────────
  const lookIn = allergyText || text
  const allergens = [
    'penicillin','amoxicillin','sulfa','aspirin','ibuprofen','nsaid',
    'codeine','morphine','latex','contrast dye','iodine','shellfish',
    'peanut','tree nut','egg','milk','soy','wheat','gluten',
    'tetracycline','erythromycin','fluoroquinolone','cephalosporin','vancomycin',
  ]
  for (const a of allergens) {
    if (lookIn.toLowerCase().includes(a)) {
      const key = a.toLowerCase()
      if (!seen.has(key)) {
        allergies.push({ name: a.charAt(0).toUpperCase() + a.slice(1), source: 'ocr' })
        seen.add(key)
      }
    }
  }
  return allergies
}

// ─── Procedures ─────────────────────────────────────────────────────────────

// Common CPT code lookup for procedures found via OCR
const PROCEDURE_CPT_MAP = {
  'colonoscopy':       { cpt: '45378', desc: 'Colonoscopy, diagnostic' },
  'endoscopy':         { cpt: '43239', desc: 'Upper GI endoscopy with biopsy' },
  'mri':               { cpt: '70553', desc: 'MRI brain w/wo contrast' },
  'ct scan':           { cpt: '74177', desc: 'CT abdomen/pelvis w/contrast' },
  'x-ray':             { cpt: '71046', desc: 'Chest X-ray, 2 views' },
  'ultrasound':        { cpt: '76700', desc: 'Ultrasound, abdominal complete' },
  'echocardiogram':    { cpt: '93306', desc: 'Echocardiography, complete' },
  'ekg':               { cpt: '93000', desc: '12-lead electrocardiogram' },
  'ecg':               { cpt: '93000', desc: '12-lead electrocardiogram' },
  'stress test':       { cpt: '93015', desc: 'Cardiovascular stress test' },
  'catheterization':   { cpt: '93452', desc: 'Left heart catheterization' },
  'angioplasty':       { cpt: '92920', desc: 'Percutaneous coronary angioplasty' },
  'stent':             { cpt: '92928', desc: 'Percutaneous coronary stent' },
  'cabg':              { cpt: '33533', desc: 'CABG, single arterial graft' },
  'biopsy':            { cpt: '11102', desc: 'Tangential biopsy of skin' },
  'mammogram':         { cpt: '77067', desc: 'Screening mammography, bilateral' },
  'bone density':      { cpt: '77080', desc: 'DXA bone density study' },
  'dialysis':          { cpt: '90935', desc: 'Hemodialysis, single evaluation' },
  'chemotherapy':      { cpt: '96413', desc: 'Chemotherapy IV infusion, first hour' },
  'radiation therapy': { cpt: '77385', desc: 'Radiation treatment delivery, IMRT' },
  'surgery':           { cpt: '99999', desc: 'Surgical procedure (unspecified)' },
  'laparoscopy':       { cpt: '49320', desc: 'Diagnostic laparoscopy' },
  'blood transfusion': { cpt: '36430', desc: 'Transfusion of blood' },
  'lumbar puncture':   { cpt: '62270', desc: 'Lumbar puncture (spinal tap)' },
  'bronchoscopy':      { cpt: '31622', desc: 'Bronchoscopy, diagnostic' },
  'cystoscopy':        { cpt: '52000', desc: 'Cystourethroscopy' },
  'arthroscopy':       { cpt: '29881', desc: 'Arthroscopy, knee, surgical' },
  'tonsillectomy':     { cpt: '42826', desc: 'Tonsillectomy' },
  'appendectomy':      { cpt: '44970', desc: 'Laparoscopic appendectomy' },
  'cholecystectomy':   { cpt: '47562', desc: 'Laparoscopic cholecystectomy' },
  'hysterectomy':      { cpt: '58571', desc: 'Laparoscopic hysterectomy' },
  'cesarean':          { cpt: '59510', desc: 'Cesarean delivery' },
  'c-section':         { cpt: '59510', desc: 'Cesarean delivery' },
  'intubation':        { cpt: '31500', desc: 'Intubation, endotracheal' },
  'ventilator':        { cpt: '94002', desc: 'Ventilation management, initial' },
  'pacemaker':         { cpt: '33208', desc: 'Pacemaker insertion' },
  'defibrillator':     { cpt: '33249', desc: 'ICD insertion/replacement' },
}

function extractProcedures(text) {
  const procs = []
  const known = Object.keys(PROCEDURE_CPT_MAP)
  for (const p of known) {
    if (text.toLowerCase().includes(p)) {
      const cptInfo = PROCEDURE_CPT_MAP[p]
      procs.push({
        name: p.charAt(0).toUpperCase() + p.slice(1),
        cptCode: cptInfo.cpt,
        cptDescription: cptInfo.desc,
        source: 'ocr',
      })
    }
  }
  // Also try to find CPT codes directly in the text (e.g. "CPT 99213")
  const cptMatches = text.matchAll(/\bCPT\s*[:#]?\s*(\d{5})\b/gi)
  for (const m of cptMatches) {
    const code = m[1]
    if (!procs.some(p => p.cptCode === code)) {
      procs.push({ name: `CPT ${code}`, cptCode: code, cptDescription: '', source: 'ocr' })
    }
  }
  return procs
}

// ─── Care Team ──────────────────────────────────────────────────────────────

/**
 * Extract Care Team members from clinical text.
 * Handles Epic/Kaiser table format:
 *   Name               Identifier   Relationship      Specialty   Phone             Duration
 *   Siy, James (M.D.)  1811075591   PCP - General     —           916-817-5341      03/05/2026 - Present
 */
function extractCareTeam(text, upper, sections = {}) {
  const team = []
  const seen = new Set()

  const sectionText = sections.care_team || ''
  if (!sectionText) return team

  const lines = sectionText.split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.length < 5) continue
    // Skip table headers and sub-headers
    if (/^(name|active|inactive|care\s*team|identifier|relationship|specialty|phone|duration|status)\b/i.test(line)) continue

    // Strategy 1: Line with NPI-like identifier (10-digit number)
    const npiMatch = line.match(/^(.+?)\s+(\d{7,10})\s+(.*)$/)
    if (npiMatch) {
      const name = npiMatch[1].trim()
      const identifier = npiMatch[2]
      const rest = npiMatch[3].trim()
      const key = name.toLowerCase()
      if (seen.has(key) || name.length < 3) continue

      const provider = { name, identifier, source: 'ocr', status: 'Active' }

      // Extract phone number
      const phoneMatch = rest.match(/(\d{3}[\-\.]\d{3}[\-\.]\d{4}(?:\s*x\d+)?)/)
      if (phoneMatch) provider.phone = phoneMatch[1]

      // Extract date range: "03/05/2026 - Present"
      const dateMatch = rest.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\w+|\d{1,2}\/\d{1,2}\/\d{4})/)
      if (dateMatch) {
        provider.startDate = dateMatch[1]
        provider.status = /present/i.test(dateMatch[2]) ? 'Active' : 'Inactive'
      }

      // Extract relationship (first meaningful text chunk after identifier)
      const relText = rest
        .replace(phoneMatch?.[0] || '', '')
        .replace(dateMatch?.[0] || '', '')
        .replace(/[—\-]+/g, ' ')
        .trim()
      const relParts = relText.split(/\s{2,}/).filter(s => s.length > 1 && !/^\d/.test(s))
      if (relParts.length > 0) provider.relationship = relParts[0].substring(0, 60)

      team.push(provider)
      seen.add(key)
      continue
    }

    // Strategy 2: Line with credentials "(M.D.)", "(D.O.)", "(N.P.)", etc.
    const credMatch = line.match(/^(.+?)\s*\(([A-Z][A-Z.\s]{1,10})\)(.*)$/i)
    if (credMatch) {
      const name = `${credMatch[1].trim()} (${credMatch[2].trim()})`
      const rest = credMatch[3].trim()
      const key = name.toLowerCase()
      if (seen.has(key) || credMatch[1].trim().length < 3) continue

      const provider = { name, source: 'ocr', status: 'Active' }
      const phoneMatch = rest.match(/(\d{3}[\-\.]\d{3}[\-\.]\d{4}(?:\s*x\d+)?)/)
      if (phoneMatch) provider.phone = phoneMatch[1]

      team.push(provider)
      seen.add(key)
    }
  }

  return team
}

// ─── Encounters / Visits ────────────────────────────────────────────────────

/**
 * Extract encounters/visits from clinical text.
 * Handles multiple formats:
 *   - Kaiser/Epic "After Visit Summary" with visit header info
 *   - "Date: MM/DD/YYYY  Department: Internal Medicine  Provider: Dr. Smith"
 *   - Visit tables: Date | Type | Provider | Department | Reason
 *   - Inline references: "seen on 01/15/2025 in Cardiology by Dr. Jones"
 */
function extractEncounters(text, upper, sections = {}) {
  const encounters = []
  const seenKeys = new Set()

  // ── Strategy 1: Encounter section text ──────────────────────────────────
  const sectionText = sections.encounters || ''
  if (sectionText) {
    const lines = sectionText.split('\n')
    let currentEnc = null
    for (const rawLine of lines) {
      const line = rawLine.replace(/^[\s\-\u2022\u2023\u25E6\u25CF\u25CB\u2013\u2014•·*]+/, '').trim()
      if (!line || line.length < 3) continue
      if (/^(encounter|visit|date|type|provider|department|reason|status|#)\s*$/i.test(line)) continue

      // Date-starting line: "01/15/2025 Office Visit Internal Medicine Dr. Smith"
      const dateStart = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.*)/)
      if (dateStart) {
        if (currentEnc) { encounters.push(currentEnc); seenKeys.add(currentEnc._key) }
        const rest = dateStart[2]
        currentEnc = { date: dateStart[1], type: 'Office Visit', source: 'ocr', _key: dateStart[1] }
        // Try to parse type, department, provider from the rest
        const typeM = rest.match(/^(Office\s+Visit|Telehealth|Emergency|Inpatient|Outpatient|Urgent\s+Care|Procedure|Follow[\-\s]?up|New\s+Patient|Return\s+Visit|Phone\s+Call|Lab\s+Visit)/i)
        if (typeM) currentEnc.type = typeM[1]
        const provM = rest.match(/(?:Dr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|[A-Z][a-z]+,\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s*\([A-Z.]+\))?)/i)
        if (provM) currentEnc.provider = provM[0]
        continue
      }

      // Key-value pairs: "Date: ...", "Provider: ...", "Department: ...", "Reason: ..."
      const kvMatch = line.match(/^(date|type|provider|department|clinic|location|reason|chief\s*complaint|visit\s*type|encounter\s*type|disposition|status)\s*:\s*(.+)/i)
      if (kvMatch) {
        const key = kvMatch[1].toLowerCase().replace(/\s+/g, '')
        const val = kvMatch[2].trim()
        if (!currentEnc) currentEnc = { type: 'Office Visit', source: 'ocr', _key: '' }
        if (key === 'date') { currentEnc.date = val; currentEnc._key = val }
        else if (key === 'type' || key === 'visittype' || key === 'encountertype') currentEnc.type = val
        else if (key === 'provider') currentEnc.provider = val
        else if (key === 'department' || key === 'clinic' || key === 'location') currentEnc.department = val
        else if (key === 'reason' || key === 'chiefcomplaint') currentEnc.reasonForVisit = val
        else if (key === 'disposition' || key === 'status') currentEnc.disposition = val
        continue
      }

      // Remaining text in current encounter might be reason/notes
      if (currentEnc && !currentEnc.reasonForVisit && line.length > 5 && line.length < 200) {
        currentEnc.reasonForVisit = line
      }
    }
    if (currentEnc) encounters.push(currentEnc)
  }

  // ── Strategy 2: Extract from document header/metadata ───────────────────
  // Kaiser/Epic "After Visit Summary" often has visit info at the top:
  // "Visit date: 03/05/2026  Provider: Siy, James (M.D.)  Status: Signed"
  const visitDateM = text.match(/(?:visit|encounter|appointment)\s*date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
  const visitProvM = text.match(/(?:visit|encounter|seen\s+by|attending)\s*(?:provider|physician|doctor)?\s*:\s*([A-Z][a-z]+(?:,?\s+[A-Z][a-z]+)*(?:\s*\([A-Z.\s]+\))?)/i)
  const visitDeptM = text.match(/(?:department|clinic|location|facility)\s*:\s*([A-Za-z][A-Za-z\s\-\/]{2,40})/i)
  const visitTypeM = text.match(/(?:visit|encounter)\s*type\s*:\s*([A-Za-z\s\-]{3,30})/i)
  const visitReasonM = text.match(/(?:reason\s+for\s+visit|chief\s*complaint|presenting\s*complaint)\s*:\s*(.{3,100})/i)

  if (visitDateM) {
    const key = visitDateM[1]
    if (!seenKeys.has(key)) {
      encounters.push({
        date: visitDateM[1],
        type: visitTypeM ? visitTypeM[1].trim() : 'Office Visit',
        provider: visitProvM ? visitProvM[1].trim() : '',
        department: visitDeptM ? visitDeptM[1].trim() : '',
        reasonForVisit: visitReasonM ? visitReasonM[1].trim() : '',
        source: 'ocr',
      })
      seenKeys.add(key)
    }
  }

  // ── Strategy 3: Detect "After Visit Summary" as an encounter ────────────
  if (upper.includes('AFTER VISIT SUMMARY') || upper.includes('AFTER-VISIT SUMMARY')) {
    // The whole document IS a visit record — extract header info
    const anyDateM = text.match(/(?:date|printed|generated)\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    if (anyDateM && !seenKeys.has(anyDateM[1])) {
      encounters.push({
        date: anyDateM[1],
        type: 'After Visit Summary',
        provider: visitProvM ? visitProvM[1].trim() : '',
        department: visitDeptM ? visitDeptM[1].trim() : '',
        reasonForVisit: visitReasonM ? visitReasonM[1].trim() : '',
        source: 'ocr',
      })
      seenKeys.add(anyDateM[1])
    }
  }

  // ── Strategy 4: In-text visit references ────────────────────────────────
  // "seen on 01/15/2025 in Cardiology" or "visit on 03/05/2026 with Dr. Smith"
  const inlineVisits = text.matchAll(/(?:seen|visit(?:ed)?|appointment|encounter)\s+(?:on\s+)?(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+(?:in|at|with)\s+([A-Z][A-Za-z\s,.\-()]{3,60}))?/gi)
  for (const m of inlineVisits) {
    const date = m[1]
    if (!seenKeys.has(date)) {
      const detail = m[2] ? m[2].trim() : ''
      const isProvider = /^(?:dr|md|do|np|pa)\b/i.test(detail) || /\b(?:m\.?d|d\.?o|n\.?p|p\.?a)\b/i.test(detail)
      encounters.push({
        date,
        type: 'Office Visit',
        provider: isProvider ? detail : '',
        department: !isProvider ? detail : '',
        source: 'ocr',
      })
      seenKeys.add(date)
    }
  }

  // ── Strategy 5: Instruction-section follow-up appointments ──────────────
  const instrText = sections.instructions || ''
  if (instrText) {
    const followUpM = instrText.match(/(?:follow[\s\-]?up|return|next)\s+(?:appointment|visit)\s*(?:on|:)?\s*(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+(?:with|at)\s+([^.\n]{3,60}))?/i)
    if (followUpM && !seenKeys.has(followUpM[1])) {
      encounters.push({
        date: followUpM[1],
        type: 'Follow-up',
        provider: followUpM[2] ? followUpM[2].trim() : '',
        department: '',
        source: 'ocr',
      })
      seenKeys.add(followUpM[1])
    }
  }

  // Clean up internal keys
  return encounters.map(e => { const { _key, ...rest } = e; return rest })
}

// ─── Clinical Notes / Summaries ─────────────────────────────────────────────

/**
 * Extract clinical notes, progress notes, discharge summaries, and other 
 * narrative documentation from extracted text.
 */
function extractClinicalNotes(text, upper, sections = {}) {
  const notes = []

  // ── Strategy 1: Extract from clinical_notes section ─────────────────────
  const noteSectionText = sections.clinical_notes || ''
  if (noteSectionText && noteSectionText.trim().length > 20) {
    notes.push({
      type: 'Clinical Note',
      content: noteSectionText.trim().substring(0, 500),
      source: 'ocr',
    })
  }

  // ── Strategy 2: Detect specific note types from document structure ──────
  // After Visit Summary → entire document is a note
  if (upper.includes('AFTER VISIT SUMMARY') || upper.includes('AFTER-VISIT SUMMARY')) {
    const dateM = text.match(/(?:date|printed|visit\s+date)\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    const provM = text.match(/(?:provider|physician|authored\s+by)\s*:\s*([A-Z][a-z]+(?:,?\s+[A-Z][a-z]+)*(?:\s*\([A-Z.\s]+\))?)/i)
    notes.push({
      type: 'After Visit Summary',
      date: dateM ? dateM[1] : '',
      author: provM ? provM[1].trim() : '',
      content: text.substring(0, 500).replace(/\n/g, ' ').trim(),
      source: 'ocr',
    })
  }

  if (upper.includes('DISCHARGE SUMMARY') || upper.includes('DISCHARGE INSTRUCTIONS')) {
    const dateM = text.match(/(?:discharge|date)\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    notes.push({
      type: 'Discharge Summary',
      date: dateM ? dateM[1] : '',
      content: text.substring(0, 500).replace(/\n/g, ' ').trim(),
      source: 'ocr',
    })
  }

  if (upper.includes('PROGRESS NOTE') || upper.includes('OFFICE NOTE')) {
    const dateM = text.match(/(?:note\s+)?date\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
    const provM = text.match(/(?:author|provider|physician)\s*:\s*([A-Z][a-z]+(?:,?\s+[A-Z][a-z]+)*)/i)
    notes.push({
      type: 'Progress Note',
      date: dateM ? dateM[1] : '',
      author: provM ? provM[1].trim() : '',
      content: text.substring(0, 500).replace(/\n/g, ' ').trim(),
      source: 'ocr',
    })
  }

  if (upper.includes('HISTORY AND PHYSICAL') || upper.includes('H&P') || upper.includes('H & P')) {
    notes.push({
      type: 'History & Physical',
      content: text.substring(0, 500).replace(/\n/g, ' ').trim(),
      source: 'ocr',
    })
  }

  if (upper.includes('CONSULTATION') || upper.includes('CONSULT NOTE')) {
    notes.push({
      type: 'Consultation Note',
      content: text.substring(0, 500).replace(/\n/g, ' ').trim(),
      source: 'ocr',
    })
  }

  if (upper.includes('OPERATIVE REPORT') || upper.includes('PROCEDURE NOTE')) {
    notes.push({
      type: 'Operative Note',
      content: text.substring(0, 500).replace(/\n/g, ' ').trim(),
      source: 'ocr',
    })
  }

  // ── Strategy 3: Extract from instructions section (patient education) ───
  const instrText = sections.instructions || ''
  if (instrText && instrText.trim().length > 30) {
    notes.push({
      type: 'Patient Instructions',
      content: instrText.trim().substring(0, 500),
      source: 'ocr',
    })
  }

  // ── Strategy 4: Extract Assessment & Plan if present ────────────────────
  const apMatch = text.match(/(?:assessment\s+(?:and|&)\s+plan|a\s*\/\s*p)\s*[:\-]?\s*([\s\S]{20,500}?)(?=\n\s*(?:[A-Z]{3,}|medication|allerg|vital|lab|immuniz|procedure|follow|instruction|$))/i)
  if (apMatch) {
    notes.push({
      type: 'Assessment & Plan',
      content: apMatch[1].trim().substring(0, 500),
      source: 'ocr',
    })
  }

  // ── Strategy 5: Family / Social history as notes ────────────────────────
  const famSocText = sections.family_social || ''
  if (famSocText && famSocText.trim().length > 10) {
    notes.push({
      type: 'Social/Family History',
      content: famSocText.trim().substring(0, 500),
      source: 'ocr',
    })
  }

  return notes
}

// ─── Document Classification ────────────────────────────────────────────────

function classifyDocumentType(text, upper, filename) {
  const fn = (filename || '').toLowerCase()
  if (fn.includes('lab') || fn.includes('result')) return 'Lab Report'
  if (fn.includes('radiology') || fn.includes('imaging')) return 'Radiology Report'
  if (fn.includes('discharge')) return 'Discharge Summary'
  if (fn.includes('operative') || fn.includes('surgery')) return 'Operative Note'
  if (fn.includes('progress') || fn.includes('note')) return 'Progress Note'
  if (fn.includes('consent')) return 'Consent Form'
  if (fn.includes('referral')) return 'Referral'
  if (fn.includes('prescription') || fn.includes('rx')) return 'Prescription'
  // Epic MyChart export: filename like "CSN_LASTNAME_FULLNAME_DATE.PDF"
  if (/^\d{6,}[\-_]/.test(fn)) return 'Clinical Summary'

  if (upper.includes('AFTER VISIT SUMMARY') || upper.includes('AFTER-VISIT SUMMARY')) return 'After Visit Summary'
  if (upper.includes('CLINICAL SUMMARY')) return 'Clinical Summary'
  if (upper.includes('MY CHART') || upper.includes('MYCHART') || upper.includes('MYHEALTH')) return 'Patient Portal Export'
  if (upper.includes('DISCHARGE SUMMARY') || upper.includes('DISCHARGE INSTRUCTIONS')) return 'Discharge Summary'
  if (upper.includes('OPERATIVE REPORT') || upper.includes('PROCEDURE NOTE')) return 'Operative Note'
  if (upper.includes('RADIOLOGY') || upper.includes('IMPRESSION:')) return 'Radiology Report'
  if (upper.includes('LABORATORY') || upper.includes('LAB RESULT') || upper.includes('SPECIMEN')) return 'Lab Report'
  if (upper.includes('HISTORY AND PHYSICAL') || upper.includes('H&P')) return 'History & Physical'
  if (upper.includes('PROGRESS NOTE') || upper.includes('OFFICE VISIT')) return 'Progress Note'
  if (upper.includes('CONSULTATION') || upper.includes('CONSULT NOTE')) return 'Consultation Note'
  if (upper.includes('PATHOLOGY')) return 'Pathology Report'
  if (upper.includes('EMERGENCY') || upper.includes('ED NOTE')) return 'Emergency Note'
  if (upper.includes('IMMUNIZATION') || upper.includes('VACCINATION')) return 'Immunization Record'
  if (upper.includes('MEDICATION') && upper.includes('ALLERG')) return 'Clinical Summary'

  return 'Clinical Document'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CONVERT OCR RESULTS → DASHBOARD ROWS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert OCR clinical entities into app-compatible rows for the dashboard.
 */
export function documentResultToAppRows(docResult, filename) {
  const { clinicalEntities, text, method, confidence, metadata } = docResult
  const now = new Date().toISOString()

  const rows = { medications: [], conditions: [], allergies: [], vitals: [], results: [], orders: [], immunizations: [], careTeam: [], encounters: [], clinicalNotes: [], documentRow: null }

  if (!clinicalEntities) return rows

  rows.medications = clinicalEntities.medications.map((med, i) => ({
    patId: '', orderId: `OCR-MED-${Date.now()}-${i}`,
    name: med.name,
    originalName: med.originalName || med.name,
    dose: med.dose || '', route: med.route || '', frequency: med.frequency || '',
    indication: med.indication || '',
    prescriber: med.prescriber || '',
    rxcui: med.rxcui || '', rxnormName: med.rxnormName || '',
    ndc: med.ndc || '', drugClass: med.drugClass || '', brand: med.brand || '',
    startDate: med.startDate || now, endDate: '', status: med.status || 'Active',
    _source: 'ocr', _ocrConfidence: med.confidence, _sourceFile: filename,
    _extractionSource: med.source || 'local-regex',
    _validated: med._validated || false,
  }))

  rows.conditions = clinicalEntities.diagnoses.map((dx, i) => ({
    patId: '', problemId: `OCR-DX-${Date.now()}-${i}`,
    name: dx.name, code: dx.code || '', codeSystem: dx.codeSystem || '',
    icd10: dx.icd10 || dx.code || '',
    icd10Display: dx.icd10Display || '',
    snomedCT: dx.snomedCT || '', snomedDisplay: dx.snomedDisplay || '',
    severity: dx.chronic === true ? 'Chronic' : (dx.chronic === false ? 'Acute' : 'Moderate'),
    status: 'Active',
    onset: dx.onsetDate || clinicalEntities.dates[0] || now,
    onsetDate: dx.onsetDate || clinicalEntities.dates[0] || now,
    _source: 'ocr', _ocrConfidence: dx.confidence, _sourceFile: filename,
    _extractionSource: dx.source || 'local-regex',
  }))

  rows.allergies = clinicalEntities.allergies.map((alg, i) => ({
    patId: '', allergyId: `OCR-ALG-${Date.now()}-${i}`,
    name: alg.name, reaction: alg.reaction || '', severity: '', status: 'Active',
    snomedCT: alg.snomedCT || '',
    _source: 'ocr', _sourceFile: filename,
    _extractionSource: alg.source || 'local-regex',
  }))

  rows.vitals = clinicalEntities.vitals.map((v, i) => ({
    patId: '', vitalId: `OCR-VIT-${Date.now()}-${i}`,
    name: v.name, value: v.value, date: clinicalEntities.dates[0] || now,
    _source: 'ocr', _sourceFile: filename,
    _extractionSource: v.source || 'local-regex',
  }))

  rows.results = clinicalEntities.labResults.map((lab, i) => ({
    patId: '', orderId: `OCR-LAB-${Date.now()}-${i}`, resultId: `OCR-RES-${Date.now()}-${i}`,
    name: lab.name, originalName: lab.originalName || lab.name,
    value: lab.value, unit: lab.unit, referenceRange: lab.referenceRange || '',
    loinc: lab.loinc || '', loincDisplay: lab.loincDisplay || '',
    date: clinicalEntities.dates[0] || now, status: 'Final',
    _source: 'ocr', _sourceFile: filename,
    _extractionSource: lab.source || 'local-regex',
  }))

  rows.orders = (clinicalEntities.procedures || []).map((proc, i) => ({
    orderId: `OCR-PROC-${Date.now()}-${i}`,
    orderType: 'Procedure',
    patId: '',
    csnId: '',
    orderDate: clinicalEntities.dates[0] || now,
    status: 'Completed',
    procName: proc.name,
    procCode: proc.cptCode || '',
    cptDescription: proc.cptDescription || '',
    specimen: '',
    priority: '',
    _source: 'ocr', _sourceFile: filename,
    _extractionSource: proc.source || 'local-regex',
  }))

  rows.immunizations = (clinicalEntities.immunizations || []).map((imm, i) => ({
    patId: '', immunizationId: `OCR-IMM-${Date.now()}-${i}`,
    name: imm.name,
    date: imm.date || clinicalEntities.dates[0] || now,
    dose: imm.dose || '',
    route: imm.route || '',
    site: imm.site || '',
    lotNumber: imm.lotNumber || '',
    manufacturer: imm.manufacturer || '',
    cvx: imm.cvx || '',
    ndc: imm.ndc || '',
    status: 'Completed',
    _source: 'ocr', _sourceFile: filename,
    _extractionSource: imm.source || 'local-regex',
  }))

  rows.careTeam = (clinicalEntities.careTeam || []).map((ct, i) => ({
    patId: '', careTeamId: `OCR-CT-${Date.now()}-${i}`,
    name: ct.name,
    identifier: ct.identifier || '',
    relationship: ct.relationship || ct.role || '',
    specialty: ct.specialty || '',
    phone: ct.phone || '',
    startDate: ct.startDate || '',
    status: ct.status || 'Active',
    _source: 'ocr', _sourceFile: filename,
    _extractionSource: ct.source || 'local-regex',
  }))

  rows.encounters = (clinicalEntities.encounters || []).map((enc, i) => ({
    patId: '', csnId: `OCR-ENC-${Date.now()}-${i}`,
    encounterId: `OCR-ENC-${Date.now()}-${i}`,
    type: enc.type || 'Office Visit',
    contactDate: enc.date || clinicalEntities.dates[0] || now,
    date: enc.date || clinicalEntities.dates[0] || now,
    department: enc.department || '',
    visitProvider: enc.provider || '',
    provider: enc.provider || '',
    reasonForVisit: enc.reasonForVisit || '',
    diagnosis: enc.diagnosis || '',
    disposition: enc.disposition || '',
    status: 'Completed',
    _source: 'ocr', _sourceFile: filename,
    _extractionSource: enc.source || 'local-regex',
  }))

  rows.clinicalNotes = (clinicalEntities.clinicalNotes || []).map((note, i) => ({
    patId: '', noteId: `OCR-NOTE-${Date.now()}-${i}`,
    type: note.type || 'Clinical Note',
    date: note.date || clinicalEntities.dates[0] || now,
    author: note.author || '',
    content: note.content || '',
    department: note.department || '',
    status: 'Final',
    _source: 'ocr', _sourceFile: filename,
    _extractionSource: note.source || 'local-regex',
  }))

  rows.documentRow = {
    docId: metadata?.fileName || filename,
    type: clinicalEntities.documentType,
    status: 'Processed',
    author: clinicalEntities.demographics?.name || '',
    date: clinicalEntities.dates[0] || now,
    specialty: '', csnId: '',
    extractedText: text,
    ocrMethod: method,
    ocrConfidence: confidence,
    entitiesFound: {
      medications: clinicalEntities.medications.length,
      diagnoses: clinicalEntities.diagnoses.length,
      allergies: clinicalEntities.allergies.length,
      vitals: clinicalEntities.vitals.length,
      labResults: clinicalEntities.labResults.length,
      procedures: (clinicalEntities.procedures || []).length,
      immunizations: (clinicalEntities.immunizations || []).length,
      careTeam: (clinicalEntities.careTeam || []).length,
      encounters: (clinicalEntities.encounters || []).length,
      clinicalNotes: (clinicalEntities.clinicalNotes || []).length,
    },
    _source: 'ocr', _sourceFile: filename,
    _extractionSource: method === 'openai' ? 'openai' : method === 'azure' ? 'azure-ai' : 'local-regex',
  }

  return rows
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function readAsArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
}

async function preprocessImage(blob) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
        resolve(blob)
        return
      }
      const scale = MAX_IMAGE_DIMENSION / Math.max(width, height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((resized) => resolve(resized), 'image/png')
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob) }
    img.src = url
  })
}
