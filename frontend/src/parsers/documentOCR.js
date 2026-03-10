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
    const pageText = textContent.items.map(item => item.str).join(' ').trim()

    if (pageText) {
      fullText += `\n--- Page ${i} ---\n${pageText}\n`
    }

    onProgress(i / pageCount * 0.5)
    page.cleanup()
  }

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
  const clinicalEntities = parseClinicalText(normalizedText, filename)

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

  entities.demographics = extractDemographics(text)
  entities.dates = extractDates(text)
  entities.medications = extractMedications(text, upper)
  entities.diagnoses = extractDiagnoses(text, upper)
  entities.vitals = extractVitals(text)
  entities.labResults = extractLabResults(text, upper)
  entities.allergies = extractAllergies(text, upper)
  entities.procedures = extractProcedures(text, upper)
  entities.documentType = classifyDocumentType(text, upper, filename)
  entities.fullText = text

  return entities
}

function createEmptyClinicalEntities() {
  return {
    demographics: null, dates: [], medications: [], diagnoses: [],
    vitals: [], labResults: [], allergies: [], procedures: [],
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

function extractMedications(text) {
  const meds = []
  const secMatch = text.match(/(?:medications?|prescriptions?|rx|meds)\s*[:\-]?\s*([\s\S]*?)(?=(?:\n\s*\n|diagnos|allerg|vital|lab|assessment|plan|procedure|$))/i)
  const searchText = secMatch ? secMatch[1] : text

  for (const med of COMMON_MEDS) {
    const regex = new RegExp(`\\b${med}\\b(?:\\s+(?:\\d+\\s*(?:mg|mcg|ml|units?|iu))?)?(?:\\s+(?:daily|BID|TID|QID|PRN|QHS|QAM|QPM|once|twice|q\\d+h))?`, 'gi')
    const match = searchText.match(regex)
    if (match) {
      meds.push({ name: match[0].trim(), source: 'ocr', confidence: 'medium' })
    }
  }

  const genericPat = /\b([A-Z][a-z]+(?:ol|in|ine|ide|ate|one|pam|lam|cin|xin|mab|nib|tid|zol|pine|pril|tan|lol))\s+(\d+\s*(?:mg|mcg|ml|units?|iu))/gi
  let m
  while ((m = genericPat.exec(searchText))) {
    const name = m[1].toLowerCase()
    if (!meds.some(x => x.name.toLowerCase().includes(name))) {
      meds.push({ name: `${m[1]} ${m[2]}`.trim(), source: 'ocr', confidence: 'low' })
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

function extractDiagnoses(text) {
  const diagnoses = []
  const seenCodes = new Set()
  const seenConditions = new Set()

  const secMatch = text.match(/(?:diagnos|assessment|impression|problem\s*list|conditions?)\s*[:\-]?\s*([\s\S]*?)(?=(?:\n\s*\n|medication|allerg|vital|lab|plan|procedure|$))/i)
  const searchText = secMatch ? secMatch[1] : text

  // 1) Lines with "diagnosis text - ICD_CODE" or "diagnosis text (ICD-10: CODE)"
  const linePatterns = [
    /^[\-\s]*(.+?)\s*[\-\u2013\u2014]\s*([A-TV-Z]\d{2}(?:\.\d{1,4})?)\s*$/gm,
    /^[\-\s]*(.+?)\s*\((?:ICD[\- ]?10\s*:\s*)?([A-TV-Z]\d{2}(?:\.\d{1,4})?)\)\s*$/gm,
  ]
  for (const pat of linePatterns) {
    let m
    while ((m = pat.exec(searchText))) {
      const name = m[1].replace(/\s*[\-\u2013\u2014]\s*$/, '').trim()
      const code = m[2]
      if (name && !seenCodes.has(code)) {
        diagnoses.push({ name, code, codeSystem: 'ICD-10', icd10: code, source: 'ocr', confidence: 'high' })
        seenCodes.add(code)
      }
      // Track condition text so we don't re-add it from COMMON_CONDITIONS
      for (const c of COMMON_CONDITIONS) {
        if (name.toLowerCase().includes(c)) seenConditions.add(c)
      }
    }
  }

  // 2) COMMON_CONDITIONS not already captured via ICD-linked lines
  for (const c of COMMON_CONDITIONS) {
    if (seenConditions.has(c)) continue
    if (searchText.toLowerCase().includes(c)) {
      const alreadyLinked = diagnoses.some(d => d.name.toLowerCase().includes(c))
      if (!alreadyLinked) {
        diagnoses.push({ name: c.charAt(0).toUpperCase() + c.slice(1), source: 'ocr', confidence: secMatch ? 'high' : 'low' })
        seenConditions.add(c)
      }
    }
  }

  // 3) Standalone ICD codes not already attached to a diagnosis
  const icdPat = /\b([A-TV-Z]\d{2}(?:\.\d{1,4})?)\b/g
  let m
  while ((m = icdPat.exec(searchText))) {
    if (!seenCodes.has(m[1])) {
      diagnoses.push({ name: m[1], code: m[1], codeSystem: 'ICD-10', icd10: m[1], source: 'ocr', confidence: 'high' })
      seenCodes.add(m[1])
    }
  }

  return diagnoses
}

// ─── Vitals ─────────────────────────────────────────────────────────────────

function extractVitals(text) {
  const vitals = []
  const patterns = [
    { name: 'Blood Pressure', regex: /(?:BP|blood\s*pressure)\s*[:\-]?\s*(\d{2,3})\s*[\/\\]\s*(\d{2,3})/i, fmt: m => `${m[1]}/${m[2]} mmHg` },
    { name: 'Heart Rate',     regex: /(?:HR|heart\s*rate|pulse)\s*[:\-]?\s*(\d{2,3})\s*(?:bpm)?/i, fmt: m => `${m[1]} bpm` },
    { name: 'Temperature',    regex: /(?:temp|temperature)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)\s*(?:°?[FC])?/i, fmt: m => `${m[1]}°F` },
    { name: 'SpO2',           regex: /(?:SpO2|oxygen\s*sat|O2\s*sat)\s*[:\-]?\s*(\d{2,3})\s*%?/i, fmt: m => `${m[1]}%` },
    { name: 'Respiratory Rate', regex: /(?:RR|resp(?:iratory)?\s*rate)\s*[:\-]?\s*(\d{1,2})/i, fmt: m => `${m[1]} breaths/min` },
    { name: 'Weight',         regex: /(?:weight|wt)\s*[:\-]?\s*(\d{2,4}(?:\.\d)?)\s*(?:lbs?|kg|pounds?)?/i, fmt: m => `${m[1]} lbs` },
    { name: 'Height',         regex: /(?:height|ht)\s*[:\-]?\s*(\d{1})['\s]*(\d{1,2})["\s]*/i, fmt: m => `${m[1]}'${m[2]}"` },
    { name: 'BMI',            regex: /(?:BMI|body\s*mass)\s*[:\-]?\s*(\d{2}(?:\.\d)?)/i, fmt: m => m[1] },
  ]
  for (const { name, regex, fmt } of patterns) {
    const m = text.match(regex)
    if (m) vitals.push({ name, value: fmt(m), source: 'ocr' })
  }
  return vitals
}

// ─── Lab Results ────────────────────────────────────────────────────────────

function extractLabResults(text) {
  const results = []
  const seen = new Set()

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
    const m = text.match(regex)
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
  while ((tm = tableLineRegex.exec(text))) {
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

function extractAllergies(text, upper) {
  const allergies = []
  if (upper.includes('NKDA') || upper.includes('NO KNOWN DRUG ALLERGIES') || upper.includes('NO KNOWN ALLERGIES')) {
    allergies.push({ name: 'NKDA', reaction: 'No Known Drug Allergies', source: 'ocr' })
    return allergies
  }

  const secMatch = text.match(/(?:allerg(?:y|ies))\s*[:\-]?\s*([\s\S]*?)(?=(?:\n\s*\n|medication|diagnos|vital|lab|assessment|plan|$))/i)
  const searchText = secMatch ? secMatch[1] : ''
  const lookIn = searchText || text

  const allergens = [
    'penicillin','amoxicillin','sulfa','aspirin','ibuprofen','nsaid',
    'codeine','morphine','latex','contrast dye','iodine','shellfish',
    'peanut','tree nut','egg','milk','soy','wheat','gluten',
    'tetracycline','erythromycin','fluoroquinolone','cephalosporin','vancomycin',
  ]
  for (const a of allergens) {
    if (lookIn.toLowerCase().includes(a)) {
      allergies.push({ name: a.charAt(0).toUpperCase() + a.slice(1), source: 'ocr' })
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

  const rows = { medications: [], conditions: [], allergies: [], vitals: [], results: [], orders: [], documentRow: null }

  if (!clinicalEntities) return rows

  rows.medications = clinicalEntities.medications.map((med, i) => ({
    patId: '', orderId: `OCR-MED-${Date.now()}-${i}`,
    name: med.name,
    originalName: med.originalName || med.name,
    dose: med.dose || '', route: med.route || '', frequency: med.frequency || '',
    rxcui: med.rxcui || '', drugClass: med.drugClass || '', brand: med.brand || '',
    startDate: now, endDate: '', status: 'Active',
    _source: 'ocr', _ocrConfidence: med.confidence, _sourceFile: filename,
    _extractionSource: med.source || 'local-regex',
  }))

  rows.conditions = clinicalEntities.diagnoses.map((dx, i) => ({
    patId: '', problemId: `OCR-DX-${Date.now()}-${i}`,
    name: dx.name, code: dx.code || '', codeSystem: dx.codeSystem || '',
    icd10: dx.icd10 || dx.code || '',
    icd10Display: dx.icd10Display || '',
    snomedCT: dx.snomedCT || '', snomedDisplay: dx.snomedDisplay || '',
    severity: 'Moderate', status: 'Active', onsetDate: clinicalEntities.dates[0] || now,
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
