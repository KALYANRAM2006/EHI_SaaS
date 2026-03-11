// ═══════════════════════════════════════════════════════════════════════════════
// Azure Document Intelligence — AI-powered PDF/image understanding
// ═══════════════════════════════════════════════════════════════════════════════
//
// WHAT IT DOES:
//   • Sends the raw PDF/image binary to Azure Document Intelligence (Form Recognizer)
//   • Uses the prebuilt-layout model — extracts text, tables, sections, key-value pairs
//   • FAR superior to local pdf.js text extraction for real clinical documents
//   • Handles scanned PDFs, multi-column layouts, complex tables natively
//   • Returns structured text + parsed tables that can then be fed to clinical NLP
//
// HOW IT FITS:
//   Document Intelligence replaces the LOCAL OCR layer (pdf.js / Tesseract).
//   After extracting clean text, the result is still processed by:
//     → OpenAI GPT (if enabled) for clinical entity extraction
//     → Azure Text Analytics for Health (if enabled)
//     → Local regex fallback (always runs)
//
// PRIVACY:
//   ⚠ The raw PDF binary IS sent to Azure (cannot de-identify a binary PDF).
//   • Azure Document Intelligence is HIPAA-compliant when configured with a BAA
//   • Data is encrypted in transit (TLS) and Microsoft does NOT store your documents
//   • Results are available only via the operation URL for 24 hours, then deleted
//   • API key stored in browser localStorage only (never server-side)
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'ehi_azure_doc_intel_config'
const API_VERSION = '2024-11-30'       // Latest GA version
const MODEL_ID   = 'prebuilt-layout'   // Text + tables + structure

// ─── Configuration Management ────────────────────────────────────────────────

/**
 * Get saved Azure Document Intelligence config from localStorage.
 * @returns {{ endpoint: string, apiKey: string, enabled: boolean }}
 */
export function getDocIntelConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { endpoint: '', apiKey: '', enabled: false }
    return JSON.parse(raw)
  } catch {
    return { endpoint: '', apiKey: '', enabled: false }
  }
}

/**
 * Save Azure Document Intelligence config to localStorage.
 * @param {{ endpoint: string, apiKey: string, enabled: boolean }} config
 */
export function saveDocIntelConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    endpoint: (config.endpoint || '').trim().replace(/\/+$/, ''),
    apiKey: (config.apiKey || '').trim(),
    enabled: !!config.enabled,
  }))
}

/**
 * Check if Azure Document Intelligence is configured and enabled.
 */
export function isDocIntelEnabled() {
  const cfg = getDocIntelConfig()
  return cfg.enabled && cfg.endpoint && cfg.apiKey
}

// ─── Main Analysis Function ──────────────────────────────────────────────────

/**
 * Send a PDF or image file to Azure Document Intelligence for layout analysis.
 *
 * @param {File|Blob} file        — The raw PDF / image file
 * @param {Function} [onProgress] — Optional progress callback
 * @returns {Promise<{
 *   text: string,
 *   tables: Array<{ headers: string[], rows: string[][] }>,
 *   pages: number,
 *   method: string,
 *   confidence: number,
 *   rawAnalyzeResult: object
 * }>}
 */
export async function analyzeWithDocIntelligence(file, onProgress = () => {}) {
  const config = getDocIntelConfig()
  if (!config.enabled || !config.endpoint || !config.apiKey) {
    throw new Error('Azure Document Intelligence is not configured. Please add your endpoint and API key.')
  }

  onProgress({ phase: 'doc-intel-submit', progress: 0.05, message: 'Uploading document to Azure Document Intelligence...' })

  // Read file as ArrayBuffer
  const buffer = await file.arrayBuffer()

  // Determine content type
  const ext = (file.name || '').split('.').pop().toLowerCase()
  const contentType = getContentType(ext)

  // ── Submit analysis job ────────────────────────────────────────────────
  const analyzeUrl = `${config.endpoint}/documentintelligence/documentModels/${MODEL_ID}:analyze?api-version=${API_VERSION}`

  const submitResp = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Ocp-Apim-Subscription-Key': config.apiKey,
    },
    body: buffer,
  })

  if (!submitResp.ok) {
    const errBody = await submitResp.text().catch(() => '')
    // Try a common fallback — older API path
    if (submitResp.status === 404) {
      return analyzeWithDocIntelligenceFallback(buffer, contentType, config, onProgress)
    }
    throw new Error(`Azure Document Intelligence error (${submitResp.status}): ${errBody.substring(0, 300)}`)
  }

  // ── Poll for completion ────────────────────────────────────────────────
  const operationUrl = submitResp.headers.get('operation-location')
  if (!operationUrl) {
    throw new Error('Azure Document Intelligence did not return an operation-location header')
  }

  onProgress({ phase: 'doc-intel-processing', progress: 0.15, message: 'Azure AI reading document...' })

  let analyzeResult = null
  let attempts = 0
  const maxAttempts = 90 // 90 × 2s = 3 min max (some PDFs take time)

  while (attempts < maxAttempts) {
    attempts++
    const pollProgress = Math.min(0.15 + (attempts / maxAttempts) * 0.7, 0.85)
    onProgress({ phase: 'doc-intel-processing', progress: pollProgress, message: `Azure AI analyzing document (${attempts * 2}s)...` })

    await sleep(2000)

    const pollResp = await fetch(operationUrl, {
      headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
    })

    if (!pollResp.ok) {
      throw new Error(`Azure Document Intelligence poll error (${pollResp.status})`)
    }

    const pollData = await pollResp.json()

    if (pollData.status === 'succeeded') {
      analyzeResult = pollData.analyzeResult || pollData
      break
    } else if (pollData.status === 'failed') {
      const errMsg = pollData.error?.message || JSON.stringify(pollData.error) || 'Document analysis failed'
      throw new Error(`Azure Document Intelligence: ${errMsg}`)
    }
    // 'running' or 'notStarted' — continue polling
  }

  if (!analyzeResult) {
    throw new Error('Azure Document Intelligence timed out after 3 minutes')
  }

  onProgress({ phase: 'doc-intel-parsing', progress: 0.9, message: 'Parsing document structure...' })

  // ── Parse response ─────────────────────────────────────────────────────
  return parseDocIntelResponse(analyzeResult)
}

// ─── Fallback for older API versions (2023-07-31) ────────────────────────────

async function analyzeWithDocIntelligenceFallback(buffer, contentType, config, onProgress) {
  // Some Azure subscriptions use the older Form Recognizer path
  const oldUrl = `${config.endpoint}/formrecognizer/documentModels/${MODEL_ID}:analyze?api-version=2023-07-31`

  onProgress({ phase: 'doc-intel-submit', progress: 0.08, message: 'Trying alternate API path...' })

  const submitResp = await fetch(oldUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Ocp-Apim-Subscription-Key': config.apiKey,
    },
    body: buffer,
  })

  if (!submitResp.ok) {
    const errBody = await submitResp.text().catch(() => '')
    throw new Error(`Azure Document Intelligence error (${submitResp.status}): ${errBody.substring(0, 300)}`)
  }

  const operationUrl = submitResp.headers.get('operation-location')
  if (!operationUrl) {
    throw new Error('Azure Document Intelligence did not return an operation-location header')
  }

  onProgress({ phase: 'doc-intel-processing', progress: 0.15, message: 'Azure AI reading document...' })

  let analyzeResult = null
  let attempts = 0
  const maxAttempts = 90

  while (attempts < maxAttempts) {
    attempts++
    const pollProgress = Math.min(0.15 + (attempts / maxAttempts) * 0.7, 0.85)
    onProgress({ phase: 'doc-intel-processing', progress: pollProgress, message: `Azure AI analyzing document (${attempts * 2}s)...` })

    await sleep(2000)

    const pollResp = await fetch(operationUrl, {
      headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
    })

    if (!pollResp.ok) continue

    const pollData = await pollResp.json()
    if (pollData.status === 'succeeded') {
      analyzeResult = pollData.analyzeResult || pollData
      break
    } else if (pollData.status === 'failed') {
      throw new Error(`Azure Document Intelligence: ${pollData.error?.message || 'Analysis failed'}`)
    }
  }

  if (!analyzeResult) throw new Error('Azure Document Intelligence timed out')
  return parseDocIntelResponse(analyzeResult)
}

// ─── Response Parser ─────────────────────────────────────────────────────────

/**
 * Parse Azure Document Intelligence analyze result into structured data.
 */
function parseDocIntelResponse(analyzeResult) {
  const pages = analyzeResult.pages || []
  const tables = analyzeResult.tables || []
  const paragraphs = analyzeResult.paragraphs || []
  const sections = analyzeResult.sections || []
  const content = analyzeResult.content || ''

  // 1. Build clean text from paragraphs (preserves reading order & structure)
  let structuredText = ''
  if (paragraphs.length > 0) {
    structuredText = paragraphs.map(p => p.content).join('\n')
  } else {
    // Fallback: use the raw content string
    structuredText = content
  }

  // 2. Parse tables into structured format
  const parsedTables = tables.map((table, idx) => {
    const rowCount = table.rowCount || 0
    const colCount = table.columnCount || 0
    const cells = table.cells || []

    // Build 2D grid
    const grid = []
    for (let r = 0; r < rowCount; r++) {
      grid.push(new Array(colCount).fill(''))
    }
    for (const cell of cells) {
      const r = cell.rowIndex ?? 0
      const c = cell.columnIndex ?? 0
      if (r < rowCount && c < colCount) {
        grid[r][c] = (cell.content || '').trim()
      }
    }

    // First row is usually headers
    const headers = grid[0] || []
    const rows = grid.slice(1)

    return { tableIndex: idx, headers, rows, rowCount, colCount }
  })

  // 3. Build table text for appending to main text (helps clinical NLP)
  let tableText = ''
  for (const table of parsedTables) {
    if (table.rows.length === 0) continue
    tableText += '\n\n--- TABLE ---\n'
    if (table.headers.some(h => h)) {
      tableText += table.headers.join(' | ') + '\n'
      tableText += table.headers.map(() => '---').join(' | ') + '\n'
    }
    for (const row of table.rows) {
      tableText += row.join(' | ') + '\n'
    }
  }

  // 4. Combine structured text + table text
  const fullText = structuredText + tableText

  // 5. Calculate average confidence
  let avgConfidence = 0
  if (pages.length > 0) {
    const wordConfidences = []
    for (const page of pages) {
      for (const word of (page.words || [])) {
        if (typeof word.confidence === 'number') {
          wordConfidences.push(word.confidence)
        }
      }
    }
    if (wordConfidences.length > 0) {
      avgConfidence = (wordConfidences.reduce((a, b) => a + b, 0) / wordConfidences.length) * 100
    } else {
      avgConfidence = 95 // Azure DI is generally very high quality
    }
  }

  console.log(`[Azure Doc Intelligence] Extracted ${fullText.length} chars, ${pages.length} pages, ${parsedTables.length} tables, ${paragraphs.length} paragraphs`)

  return {
    text: fullText,
    tables: parsedTables,
    pages: pages.length,
    method: 'azure-doc-intelligence',
    confidence: Math.round(avgConfidence),
    rawAnalyzeResult: analyzeResult,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getContentType(ext) {
  switch (ext) {
    case 'pdf': return 'application/pdf'
    case 'jpg': case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'tif': case 'tiff': return 'image/tiff'
    case 'bmp': return 'image/bmp'
    default: return 'application/octet-stream'
  }
}

// ─── Test Connection ─────────────────────────────────────────────────────────

/**
 * Test connectivity to Azure Document Intelligence endpoint.
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function testDocIntelConnection() {
  const config = getDocIntelConfig()
  if (!config.endpoint || !config.apiKey) {
    return { ok: false, message: 'Endpoint and API key are required' }
  }

  try {
    // Try listing available models — this validates both endpoint and key
    const listUrl = `${config.endpoint}/documentintelligence/documentModels?api-version=${API_VERSION}`

    const resp = await fetch(listUrl, {
      headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
    })

    if (resp.ok) {
      const data = await resp.json()
      const models = (data.value || []).map(m => m.modelId)
      const hasLayout = models.includes('prebuilt-layout')
      return {
        ok: true,
        message: hasLayout
          ? `Connected! prebuilt-layout model available (${models.length} models)`
          : `Connected! ${models.length} models available`,
      }
    }

    // Try older API path
    if (resp.status === 404) {
      const oldUrl = `${config.endpoint}/formrecognizer/documentModels?api-version=2023-07-31`
      const oldResp = await fetch(oldUrl, {
        headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
      })
      if (oldResp.ok) {
        return { ok: true, message: 'Connected! (Form Recognizer v3 API)' }
      }
    }

    if (resp.status === 401 || resp.status === 403) {
      return { ok: false, message: 'Invalid API key or insufficient permissions' }
    }

    const body = await resp.text().catch(() => '')
    return { ok: false, message: `HTTP ${resp.status}: ${body.substring(0, 200)}` }
  } catch (err) {
    return { ok: false, message: `Connection failed: ${err.message}` }
  }
}
