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

async function extractPDFText(buffer, onProgress = () => {}) {
  const pdfjsLib = await getPdfjs()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
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

async function ocrPDF(buffer, onProgress = () => {}) {
  const pdfjsLib = await getPdfjs()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
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
export async function processDocument(file, filename, onProgress = () => {}) {
  const ext = (filename || file.name || '').split('.').pop().toLowerCase()
  const isPDF = ext === 'pdf'
  const isImage = ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'bmp', 'gif'].includes(ext)

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
    const textResult = await extractPDFText(buffer, (p) =>
      onProgress({ phase: 'extracting', progress: 0.05 + p * 0.45, message: `Reading page ${Math.ceil(p * 2)}...` })
    )

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
        onProgress({ phase: 'ocr', progress: 0.5 + p * 0.5, message: `OCR page ${Math.ceil(p * textResult.pageCount)}/${textResult.pageCount}...` })
      )
      result = {
        text: ocrResult.text,
        method: 'pdf-ocr',
        confidence: ocrResult.confidence,
        pageCount: ocrResult.pageCount,
      }
      onProgress({ phase: 'complete', progress: 1, message: `OCR complete (${Math.round(ocrResult.confidence)}% confidence)` })
    }
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
  const patterns = [
    { name: 'Glucose',      regex: /(?:glucose|blood\s*sugar|FBG)\s*[:\-]?\s*(\d{2,4})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'HbA1c',        regex: /(?:HbA1c|A1c|hemoglobin\s*a1c)\s*[:\-]?\s*(\d{1,2}(?:\.\d)?)\s*%?/i, unit: '%' },
    { name: 'Creatinine',   regex: /(?:creatinine|creat)\s*[:\-]?\s*(\d{1}(?:\.\d{1,2})?)\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'BUN',          regex: /(?:BUN|blood\s*urea)\s*[:\-]?\s*(\d{1,3})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'eGFR',         regex: /(?:eGFR|GFR)\s*[:\-]?\s*(\d{1,3})\s*(?:mL\/min)?/i, unit: 'mL/min' },
    { name: 'WBC',          regex: /(?:WBC|white\s*(?:blood\s*)?count)\s*[:\-]?\s*(\d{1,3}(?:\.\d)?)\s*(?:K\/uL)?/i, unit: 'K/uL' },
    { name: 'Hemoglobin',   regex: /(?:hemoglobin|hgb|hb)\s*[:\-]?\s*(\d{1,2}(?:\.\d)?)\s*(?:g\/dL)?/i, unit: 'g/dL' },
    { name: 'Hematocrit',   regex: /(?:hematocrit|hct)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)\s*%?/i, unit: '%' },
    { name: 'Platelets',    regex: /(?:platelets?|plt)\s*[:\-]?\s*(\d{2,4})\s*(?:K\/uL)?/i, unit: 'K/uL' },
    { name: 'Sodium',       regex: /(?:sodium|na)\s*[:\-]?\s*(\d{3})\s*(?:mEq\/L)?/i, unit: 'mEq/L' },
    { name: 'Potassium',    regex: /(?:potassium|k)\s*[:\-]?\s*(\d{1}(?:\.\d)?)\s*(?:mEq\/L)?/i, unit: 'mEq/L' },
    { name: 'Cholesterol',  regex: /(?:total\s*cholesterol|cholesterol)\s*[:\-]?\s*(\d{2,3})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'LDL',          regex: /(?:LDL)\s*[:\-]?\s*(\d{2,3})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'HDL',          regex: /(?:HDL)\s*[:\-]?\s*(\d{2,3})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'Triglycerides',regex: /(?:triglycerides?|TG)\s*[:\-]?\s*(\d{2,4})\s*(?:mg\/dL)?/i, unit: 'mg/dL' },
    { name: 'TSH',          regex: /(?:TSH)\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,3})?)\s*(?:mIU\/L)?/i, unit: 'mIU/L' },
    { name: 'ALT',          regex: /(?:ALT|SGPT|alanine)\s*[:\-]?\s*(\d{1,4})\s*(?:U\/L)?/i, unit: 'U/L' },
    { name: 'AST',          regex: /(?:AST|SGOT|aspartate)\s*[:\-]?\s*(\d{1,4})\s*(?:U\/L)?/i, unit: 'U/L' },
  ]
  for (const { name, regex, unit } of patterns) {
    const m = text.match(regex)
    if (m) results.push({ name, value: m[1], unit, source: 'ocr' })
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

function extractProcedures(text) {
  const procs = []
  const known = [
    'colonoscopy','endoscopy','mri','ct scan','x-ray','ultrasound',
    'echocardiogram','ekg','ecg','stress test','catheterization',
    'angioplasty','stent','cabg','biopsy','mammogram','bone density',
    'dialysis','chemotherapy','radiation therapy','surgery','laparoscopy',
  ]
  for (const p of known) {
    if (text.toLowerCase().includes(p)) {
      procs.push({ name: p.charAt(0).toUpperCase() + p.slice(1), source: 'ocr' })
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

  const rows = { medications: [], conditions: [], allergies: [], vitals: [], results: [], documentRow: null }

  if (!clinicalEntities) return rows

  rows.medications = clinicalEntities.medications.map((med, i) => ({
    patId: '', orderId: `OCR-MED-${Date.now()}-${i}`,
    name: med.name,
    originalName: med.originalName || med.name,
    dose: med.dose || '', route: med.route || '', frequency: med.frequency || '',
    rxcui: med.rxcui || '', drugClass: med.drugClass || '', brand: med.brand || '',
    startDate: now, endDate: '', status: 'Active',
    _source: 'ocr', _ocrConfidence: med.confidence, _sourceFile: filename,
  }))

  rows.conditions = clinicalEntities.diagnoses.map((dx, i) => ({
    patId: '', problemId: `OCR-DX-${Date.now()}-${i}`,
    name: dx.name, code: dx.code || '', codeSystem: dx.codeSystem || '',
    icd10Display: dx.icd10Display || '',
    snomedCT: dx.snomedCT || '', snomedDisplay: dx.snomedDisplay || '',
    status: 'Active', onsetDate: clinicalEntities.dates[0] || now,
    _source: 'ocr', _ocrConfidence: dx.confidence, _sourceFile: filename,
  }))

  rows.allergies = clinicalEntities.allergies.map((alg, i) => ({
    patId: '', allergyId: `OCR-ALG-${Date.now()}-${i}`,
    name: alg.name, reaction: alg.reaction || '', severity: '', status: 'Active',
    snomedCT: alg.snomedCT || '',
    _source: 'ocr', _sourceFile: filename,
  }))

  rows.vitals = clinicalEntities.vitals.map((v, i) => ({
    patId: '', vitalId: `OCR-VIT-${Date.now()}-${i}`,
    name: v.name, value: v.value, date: clinicalEntities.dates[0] || now,
    _source: 'ocr', _sourceFile: filename,
  }))

  rows.results = clinicalEntities.labResults.map((lab, i) => ({
    patId: '', orderId: `OCR-LAB-${Date.now()}-${i}`, resultId: `OCR-RES-${Date.now()}-${i}`,
    name: lab.name, originalName: lab.originalName || lab.name,
    value: lab.value, unit: lab.unit, referenceRange: '',
    loinc: lab.loinc || '', loincDisplay: lab.loincDisplay || '',
    date: clinicalEntities.dates[0] || now, status: 'Final',
    _source: 'ocr', _sourceFile: filename,
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
    },
    _source: 'ocr', _sourceFile: filename,
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
