/**
 * Universal Format Parsers
 * 
 * Browser-side parsers for all health record file formats:
 *   - TSV (Epic, Greenway, MEDITECH, eCW, NextGen)
 *   - CSV (Greenway, MEDITECH, eCW, NextGen)
 *   - NDJSON / FHIR JSON (Athena, Cerner)
 *   - XML / C-CDA (Allscripts, eCW, Practice Fusion, MEDITECH)
 *   - Document indexing (PDF, RTF, images — all vendors)
 *   - ZIP extraction (all vendors)
 *
 * All parsing is 100% client-side. No data leaves the browser.
 */

import JSZip from 'jszip'

// ─── File I/O ────────────────────────────────────────────────────────────────

export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsText(file)
  })
}

export function readFileBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

// ─── 1. TSV Parser ──────────────────────────────────────────────────────────

/**
 * Parse a TSV (tab-separated values) string into an array of row objects.
 * @param {string} text - Raw TSV text
 * @returns {Object[]} Array of { header: value } objects
 */
export function parseTSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return []
  const headers = lines[0].split('\t').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split('\t')
    const obj = {}
    headers.forEach((h, i) => {
      const val = (values[i] || '').trim()
      obj[h] = val === 'NULL' || val === '' ? null : val
    })
    return obj
  })
}

// ─── 2. CSV Parser ──────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of row objects.
 * Handles quoted fields (including embedded commas and newlines).
 * @param {string} text - Raw CSV text
 * @returns {Object[]} Array of { header: value } objects
 */
export function parseCSV(text) {
  const rows = splitCSVRows(text)
  if (rows.length === 0) return []
  const headers = rows[0].map(h => h.trim())
  return rows.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => {
      const val = (row[i] || '').trim()
      obj[h] = val === 'NULL' || val === '' ? null : val
    })
    return obj
  })
}

/**
 * Split CSV text into rows of field arrays, respecting quoted fields.
 */
function splitCSVRows(text) {
  const rows = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // Escaped quote
          currentField += '"'
          i += 2
        } else {
          // End of quoted field
          inQuotes = false
          i++
        }
      } else {
        currentField += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        currentRow.push(currentField)
        currentField = ''
        i++
      } else if (ch === '\r') {
        // Handle \r\n and bare \r
        currentRow.push(currentField)
        currentField = ''
        rows.push(currentRow)
        currentRow = []
        i++
        if (i < text.length && text[i] === '\n') i++
      } else if (ch === '\n') {
        currentRow.push(currentField)
        currentField = ''
        rows.push(currentRow)
        currentRow = []
        i++
      } else {
        currentField += ch
        i++
      }
    }
  }

  // Last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  // Filter empty rows
  return rows.filter(r => r.some(f => f.trim() !== ''))
}

// ─── 3. NDJSON / FHIR JSON Parser ──────────────────────────────────────────

/**
 * Parse NDJSON (Newline Delimited JSON) — one JSON object per line.
 * Used by Athena, Cerner FHIR Bulk Data exports.
 * @param {string} text - Raw NDJSON text
 * @returns {Object[]} Array of parsed JSON objects
 */
export function parseNDJSON(text) {
  return text
    .split(/\r?\n/)
    .filter(line => line.trim() !== '')
    .map((line, idx) => {
      try {
        return JSON.parse(line)
      } catch (e) {
        console.warn(`[NDJSON] Invalid JSON at line ${idx + 1}:`, e.message)
        return null
      }
    })
    .filter(Boolean)
}

/**
 * Parse a FHIR Bundle or single FHIR resource from JSON text.
 * @param {string} text - Raw JSON text
 * @returns {Object[]} Array of FHIR resources (unwraps Bundles)
 */
export function parseFHIRJSON(text) {
  try {
    const json = JSON.parse(text)

    // FHIR Bundle → extract entries
    if (json.resourceType === 'Bundle' && Array.isArray(json.entry)) {
      return json.entry
        .map(e => e.resource || e)
        .filter(r => r && r.resourceType)
    }

    // Single resource
    if (json.resourceType) {
      return [json]
    }

    // Array of resources
    if (Array.isArray(json)) {
      return json.filter(r => r && r.resourceType)
    }

    console.warn('[FHIR] Unrecognized JSON structure')
    return []
  } catch (e) {
    console.warn('[FHIR] Invalid JSON:', e.message)
    return []
  }
}

// ─── 4. XML / C-CDA Parser ─────────────────────────────────────────────────

/**
 * Parse C-CDA XML document and extract structured clinical sections.
 * Used by Allscripts, eCW, Practice Fusion, MEDITECH.
 * @param {string} text - Raw XML text
 * @returns {{ sections: Object[], metadata: Object }}
 */
export function parseCCDA(text) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'application/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    console.warn('[C-CDA] XML parse error:', parseError.textContent)
    return { sections: [], metadata: {}, raw: doc }
  }

  const metadata = extractCCDAMetadata(doc)
  const sections = extractCCDASections(doc)

  return { sections, metadata, raw: doc }
}

/**
 * Extract document metadata from C-CDA header.
 */
function extractCCDAMetadata(doc) {
  const ns = 'urn:hl7-org:v3'

  const getText = (parent, tag) => {
    const el = parent.getElementsByTagNameNS(ns, tag)[0]
      || parent.getElementsByTagName(tag)[0]
    return el?.textContent?.trim() || null
  }

  const getAttr = (parent, tag, attr) => {
    const el = parent.getElementsByTagNameNS(ns, tag)[0]
      || parent.getElementsByTagName(tag)[0]
    return el?.getAttribute(attr) || null
  }

  // Document title & dates
  const title = getText(doc, 'title')
  const effectiveTime = getAttr(doc, 'effectiveTime', 'value')

  // Patient info from recordTarget
  const recordTarget = doc.getElementsByTagNameNS(ns, 'recordTarget')[0]
    || doc.getElementsByTagName('recordTarget')[0]

  let patient = null
  if (recordTarget) {
    const patientRole = recordTarget.getElementsByTagNameNS(ns, 'patientRole')[0]
      || recordTarget.getElementsByTagName('patientRole')[0]

    if (patientRole) {
      const patientEl = patientRole.getElementsByTagNameNS(ns, 'patient')[0]
        || patientRole.getElementsByTagName('patient')[0]

      const nameEl = patientEl?.getElementsByTagNameNS(ns, 'name')[0]
        || patientEl?.getElementsByTagName('name')[0]
      const given = nameEl?.getElementsByTagNameNS(ns, 'given')[0]?.textContent
        || nameEl?.getElementsByTagName('given')[0]?.textContent || ''
      const family = nameEl?.getElementsByTagNameNS(ns, 'family')[0]?.textContent
        || nameEl?.getElementsByTagName('family')[0]?.textContent || ''

      const genderEl = patientEl?.getElementsByTagNameNS(ns, 'administrativeGenderCode')[0]
        || patientEl?.getElementsByTagName('administrativeGenderCode')[0]
      const birthEl = patientEl?.getElementsByTagNameNS(ns, 'birthTime')[0]
        || patientEl?.getElementsByTagName('birthTime')[0]

      // MRN from id elements
      const ids = patientRole.getElementsByTagNameNS(ns, 'id')
      let mrn = null
      for (const id of ids) {
        const ext = id.getAttribute('extension')
        if (ext) { mrn = ext; break }
      }

      patient = {
        firstName: given,
        lastName: family,
        sex: genderEl?.getAttribute('displayName') || genderEl?.getAttribute('code') || 'Unknown',
        birthDate: birthEl?.getAttribute('value') || null,
        mrn,
      }
    }
  }

  return { title, effectiveTime, patient }
}

/**
 * C-CDA section code → clinical data type mapping.
 */
const CCDA_SECTION_MAP = {
  '11450-4': 'problems',       // Problem List
  '48765-2': 'allergies',      // Allergies
  '10160-0': 'medications',    // Medications
  '30954-2': 'results',        // Results
  '8716-3':  'vitals',         // Vital Signs
  '46240-8': 'encounters',     // Encounters
  '11369-6': 'immunizations',  // Immunizations
  '47519-4': 'procedures',     // Procedures
  '18776-5': 'plan',           // Plan of Treatment
  '29762-2': 'socialHistory',  // Social History
  '10157-6': 'familyHistory',  // Family History
  '47420-5': 'functionalStatus', // Functional Status
}

/**
 * Extract structured sections from C-CDA body.
 */
function extractCCDASections(doc) {
  const ns = 'urn:hl7-org:v3'
  const sections = []

  const sectionEls = doc.getElementsByTagNameNS(ns, 'section')
  const fallback = sectionEls.length === 0 ? doc.getElementsByTagName('section') : sectionEls

  for (const sec of fallback) {
    const codeEl = sec.getElementsByTagNameNS(ns, 'code')[0]
      || sec.getElementsByTagName('code')[0]
    const code = codeEl?.getAttribute('code')
    const displayName = codeEl?.getAttribute('displayName') || ''

    const titleEl = sec.getElementsByTagNameNS(ns, 'title')[0]
      || sec.getElementsByTagName('title')[0]
    const sectionTitle = titleEl?.textContent?.trim() || displayName

    const dataType = CCDA_SECTION_MAP[code] || 'other'

    // Extract table rows (C-CDA uses HTML tables inside <text>)
    const rows = extractTableRows(sec, ns)

    // Extract entries (structured data)
    const entries = extractEntries(sec, ns)

    sections.push({
      code,
      title: sectionTitle,
      dataType,
      rows,
      entries,
      rawElement: sec,
    })
  }

  return sections
}

/**
 * Extract data from HTML tables inside C-CDA <text> elements.
 */
function extractTableRows(section, ns) {
  const textEl = section.getElementsByTagNameNS(ns, 'text')[0]
    || section.getElementsByTagName('text')[0]
  if (!textEl) return []

  const tables = textEl.getElementsByTagName('table')
  if (tables.length === 0) return []

  const rows = []
  for (const table of tables) {
    const headers = []
    const thEls = table.getElementsByTagName('th')
    for (const th of thEls) {
      headers.push(th.textContent?.trim() || '')
    }

    const trEls = table.getElementsByTagName('tr')
    for (const tr of trEls) {
      const tds = tr.getElementsByTagName('td')
      if (tds.length === 0) continue

      const row = {}
      for (let i = 0; i < tds.length; i++) {
        const key = headers[i] || `col_${i}`
        row[key] = tds[i].textContent?.trim() || null
      }
      rows.push(row)
    }
  }
  return rows
}

/**
 * Extract structured entries from C-CDA section.
 */
function extractEntries(section, ns) {
  const entryEls = section.getElementsByTagNameNS(ns, 'entry')
  const fallback = entryEls.length === 0 ? section.getElementsByTagName('entry') : entryEls
  const entries = []

  for (const entry of fallback) {
    // Get the first child element (observation, act, substanceAdministration, etc.)
    const childElements = Array.from(entry.children).filter(c => c.nodeType === 1)
    for (const child of childElements) {
      const entryData = extractEntryData(child, ns)
      if (entryData) entries.push(entryData)
    }
  }

  return entries
}

/**
 * Recursively extract key-value data from a C-CDA entry element.
 */
function extractEntryData(el, ns) {
  const data = { _type: el.localName || el.tagName }

  // Code element
  const codeEl = el.getElementsByTagNameNS(ns, 'code')[0]
    || el.getElementsByTagName('code')[0]
  if (codeEl) {
    data.code = codeEl.getAttribute('code')
    data.codeSystem = codeEl.getAttribute('codeSystem')
    data.displayName = codeEl.getAttribute('displayName')
  }

  // Status
  const statusEl = el.getElementsByTagNameNS(ns, 'statusCode')[0]
    || el.getElementsByTagName('statusCode')[0]
  if (statusEl) data.status = statusEl.getAttribute('code')

  // Effective time
  const timeEl = el.getElementsByTagNameNS(ns, 'effectiveTime')[0]
    || el.getElementsByTagName('effectiveTime')[0]
  if (timeEl) {
    data.effectiveTime = timeEl.getAttribute('value')
    const lowEl = timeEl.getElementsByTagNameNS(ns, 'low')[0]
      || timeEl.getElementsByTagName('low')[0]
    const highEl = timeEl.getElementsByTagNameNS(ns, 'high')[0]
      || timeEl.getElementsByTagName('high')[0]
    if (lowEl) data.startTime = lowEl.getAttribute('value')
    if (highEl) data.endTime = highEl.getAttribute('value')
  }

  // Value
  const valueEl = el.getElementsByTagNameNS(ns, 'value')[0]
    || el.getElementsByTagName('value')[0]
  if (valueEl) {
    data.value = valueEl.getAttribute('value') || valueEl.textContent?.trim()
    data.unit = valueEl.getAttribute('unit')
    data.valueType = valueEl.getAttribute('xsi:type') || valueEl.getAttribute('type')
  }

  // Text
  const textEl = el.getElementsByTagNameNS(ns, 'text')[0]
    || el.getElementsByTagName('text')[0]
  if (textEl && textEl.parentNode === el) {
    data.text = textEl.textContent?.trim()
  }

  return data
}

// ─── 5. Document Indexer ────────────────────────────────────────────────────

/**
 * Index document files (PDF, RTF, images) — extract metadata only.
 * Content extraction requires server-side OCR which we don't do.
 * @param {File} file - A document File object
 * @returns {Object} Document metadata
 */
export function indexDocument(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const typeMap = {
    pdf: 'application/pdf',
    rtf: 'application/rtf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    bmp: 'image/bmp',
    gif: 'image/gif',
  }

  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: typeMap[ext] || file.type || 'application/octet-stream',
    extension: ext,
    category: getDocumentCategory(ext),
    lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : null,
  }
}

function getDocumentCategory(ext) {
  const categories = {
    pdf: 'Clinical Document',
    rtf: 'Clinical Document',
    doc: 'Clinical Document',
    docx: 'Clinical Document',
    jpg: 'Medical Image',
    jpeg: 'Medical Image',
    png: 'Medical Image',
    tif: 'Medical Image',
    tiff: 'Medical Image',
    bmp: 'Medical Image',
    gif: 'Medical Image',
    dcm: 'DICOM Image',
  }
  return categories[ext] || 'Other Document'
}

// ─── 6. ZIP Extraction ──────────────────────────────────────────────────────

/**
 * Extract all files from ZIP archive(s), categorized by type.
 * @param {File[]} fileList - Array of File objects
 * @returns {{ delimited: Object, json: Object[], xml: string[], documents: Object[] }}
 */
export async function extractAllFiles(fileList) {
  const result = {
    delimited: {},     // { 'PATIENT.tsv': 'tsv text', 'demographics.csv': 'csv text' }
    json: [],          // Array of { filename, text }
    xml: [],           // Array of { filename, text }
    documents: [],     // Array of { filename, file (File object or blob), metadata }
    allFileNames: [],  // All extracted filenames for vendor detection
  }

  for (const file of fileList) {
    const name = file.name.toLowerCase()

    if (name.endsWith('.zip')) {
      await extractZip(file, result)
    } else {
      await categorizeFile(file, name, result)
    }
  }

  return result
}

async function extractZip(file, result) {
  const buffer = await readFileBuffer(file)
  const zip = await JSZip.loadAsync(buffer)

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    const fileName = path.split('/').pop()
    const lower = fileName.toLowerCase()
    result.allFileNames.push(fileName)

    if (lower.endsWith('.tsv')) {
      const text = await entry.async('text')
      const key = normalizeDelimitedFileName(fileName) || fileName
      mergeDelimitedText(result.delimited, key, text)
    } else if (lower.endsWith('.csv')) {
      const text = await entry.async('text')
      const key = normalizeDelimitedFileName(fileName) || fileName
      mergeDelimitedText(result.delimited, key, text)
    } else if (lower.endsWith('.ndjson') || lower.endsWith('.jsonl')) {
      const text = await entry.async('text')
      result.json.push({ filename: fileName, text, format: 'ndjson' })
    } else if (lower.endsWith('.json')) {
      const text = await entry.async('text')
      result.json.push({ filename: fileName, text, format: 'json' })
    } else if (lower.endsWith('.xml') || lower.endsWith('.cda') || lower.endsWith('.ccda')) {
      const text = await entry.async('text')
      result.xml.push({ filename: fileName, text })
    } else if (isDocumentFile(lower)) {
      const blob = await entry.async('blob')
      const metadata = indexDocument({ name: fileName, size: blob.size, type: '', lastModified: null })
      result.documents.push({ filename: fileName, blob, metadata })
    }
  }
}

async function categorizeFile(file, name, result) {
  result.allFileNames.push(file.name)

  if (name.endsWith('.tsv')) {
    const text = await readFileText(file)
    const key = normalizeDelimitedFileName(file.name) || file.name
    mergeDelimitedText(result.delimited, key, text)
  } else if (name.endsWith('.csv')) {
    const text = await readFileText(file)
    const key = normalizeDelimitedFileName(file.name) || file.name
    mergeDelimitedText(result.delimited, key, text)
  } else if (name.endsWith('.ndjson') || name.endsWith('.jsonl')) {
    const text = await readFileText(file)
    result.json.push({ filename: file.name, text, format: 'ndjson' })
  } else if (name.endsWith('.json')) {
    const text = await readFileText(file)
    result.json.push({ filename: file.name, text, format: 'json' })
  } else if (name.endsWith('.xml') || name.endsWith('.cda') || name.endsWith('.ccda')) {
    const text = await readFileText(file)
    result.xml.push({ filename: file.name, text })
  } else if (isDocumentFile(name)) {
    const metadata = indexDocument(file)
    result.documents.push({ filename: file.name, file, metadata })
  }
}

function isDocumentFile(name) {
  return /\.(pdf|rtf|doc|docx|jpg|jpeg|png|tif|tiff|bmp|gif|dcm)$/i.test(name)
}

function mergeDelimitedText(map, key, text) {
  if (map[key]) {
    const newLines = text.split(/\r?\n/).filter(l => l.trim() !== '')
    map[key] += '\n' + newLines.slice(1).join('\n')
  } else {
    map[key] = text
  }
}

// ─── Filename Normalisation ─────────────────────────────────────────────────

const DELIMITED_FILE_MAP = {
  // Epic TSV
  'PATIENT': 'PATIENT.tsv', 'PAT_ENC': 'PAT_ENC.tsv', 'ENCOUNTER': 'PAT_ENC.tsv',
  'ORDER_PROC': 'ORDER_PROC.tsv', 'ORDER_RESULTS': 'ORDER_RESULTS.tsv', 'RESULTS': 'ORDER_RESULTS.tsv',
  'PROBLEM_LIST': 'PROBLEM_LIST.tsv', 'PROBLEMS': 'PROBLEM_LIST.tsv',
  'ORDER_MED': 'ORDER_MED.tsv', 'MEDICATION': 'ORDER_MED.tsv',
  'ALLERGY': 'ALLERGY.tsv', 'ALLERGIES': 'ALLERGY.tsv',
  'IMMUNE': 'IMMUNE.tsv', 'IMMUNIZATION': 'IMMUNE.tsv',
  'IP_FLWSHT_MEAS': 'IP_FLWSHT_MEAS.tsv', 'FLOWSHEET': 'IP_FLWSHT_MEAS.tsv', 'VITALS': 'IP_FLWSHT_MEAS.tsv',
  'DOC_INFORMATION': 'DOC_INFORMATION.tsv', 'DOCUMENTS': 'DOC_INFORMATION.tsv',
  'PROCEDURES': 'PROCEDURES.tsv', 'OR_CASE': 'PROCEDURES.tsv',
  // Greenway
  'DEMOGRAPHICS': 'DEMOGRAPHICS.csv', 'APPOINTMENTS': 'APPOINTMENTS.csv',
  'CLINICALNOTES': 'CLINICALNOTES.csv', 'LABRESULTS': 'LABRESULTS.csv',
  'PRESCRIPTIONS': 'PRESCRIPTIONS.csv', 'PROBLEMLIST': 'PROBLEMLIST.csv',
  // Generic
  'PATIENTS': 'PATIENT.tsv', 'ENCOUNTERS': 'PAT_ENC.tsv',
  'MEDICATIONS': 'ORDER_MED.tsv', 'OBSERVATIONS': 'ORDER_RESULTS.tsv',
  'CONDITIONS': 'PROBLEM_LIST.tsv',
}

function normalizeDelimitedFileName(filename) {
  const base = filename.split('/').pop().split('\\').pop()
  const nameWithoutExt = base.toUpperCase().replace(/\.(TSV|CSV)$/i, '')
  return DELIMITED_FILE_MAP[nameWithoutExt] || null
}

// ─── Format Detection ───────────────────────────────────────────────────────

/**
 * Detect the primary format of uploaded files.
 * @param {{ delimited, json, xml, documents }} extracted
 * @returns {'delimited'|'fhir-json'|'ndjson'|'ccda-xml'|'documents'|'mixed'}
 */
export function detectPrimaryFormat(extracted) {
  const counts = {
    delimited: Object.keys(extracted.delimited).length,
    json: extracted.json.filter(j => j.format === 'json').length,
    ndjson: extracted.json.filter(j => j.format === 'ndjson').length,
    xml: extracted.xml.length,
    documents: extracted.documents.length,
  }

  const total = counts.delimited + counts.json + counts.ndjson + counts.xml + counts.documents

  if (total === 0) return null

  // Determine dominant format
  if (counts.ndjson > 0 && counts.ndjson >= counts.json) return 'ndjson'
  if (counts.json > 0 && counts.json >= counts.delimited && counts.json >= counts.xml) return 'fhir-json'
  if (counts.xml > 0 && counts.xml >= counts.delimited) return 'ccda-xml'
  if (counts.delimited > 0) return 'delimited'
  if (counts.documents > 0) return 'documents'

  return 'mixed'
}
