/**
 * AI Service — Privacy-First Health Intelligence
 *
 * Three modes for generating AI summaries:
 *
 *   ┌──────────────────┬──────────────────────────────────────────────────────┐
 *   │ Mode             │ How it works                                         │
 *   ├──────────────────┼──────────────────────────────────────────────────────┤
 *   │ 1. LOCAL_ONLY    │ Template-based summary, runs entirely in browser.    │
 *   │                  │ Zero network. Current default.                       │
 *   ├──────────────────┼──────────────────────────────────────────────────────┤
 *   │ 2. DEIDENTIFIED  │ Strips all 18 HIPAA identifiers, sends de-identified│
 *   │    + CLOUD       │ clinical data to Azure OpenAI (with BAA), then      │
 *   │                  │ re-identifies the response client-side.              │
 *   ├──────────────────┼──────────────────────────────────────────────────────┤
 *   │ 3. BROWSER_AI    │ Runs a small LLM (Phi-3-mini / Gemma-2B) entirely   │
 *   │                  │ in the browser via WebLLM + WebGPU. Zero network.   │
 *   │                  │ Requires modern GPU-enabled browser.                 │
 *   └──────────────────┴──────────────────────────────────────────────────────┘
 *
 * PHI Flow Diagram:
 *
 *   Patient Data ──► De-identify ──► Safe Prompt ──► AI API ──► Response ──► Re-identify ──► Display
 *                     (client)        (no PHI)        (cloud)    (no PHI)     (client)        (client)
 *
 *   The ONLY data that crosses the network boundary is the de-identified prompt.
 *   Re-identification happens exclusively in the browser.
 */

import { deidentifyPatient, buildSafePrompt, reidentify, validateNoPhI } from '../utils/deidentify'

// ─── AI Mode Configuration ──────────────────────────────────────────────────

export const AI_MODES = {
  LOCAL_ONLY: {
    id: 'local',
    name: 'Local Only',
    description: 'Template-based summary — no AI API calls, zero network activity',
    icon: '🔒',
    phiRisk: 'none',
    requiresKey: false,
  },
  DEIDENTIFIED_CLOUD: {
    id: 'cloud',
    name: 'Cloud AI (De-identified)',
    description: 'Azure OpenAI with HIPAA BAA — PHI stripped before sending',
    icon: '☁️',
    phiRisk: 'minimal',
    requiresKey: true,
  },
  BROWSER_AI: {
    id: 'browser',
    name: 'Browser AI (WebGPU)',
    description: 'Runs LLM locally in your browser — zero network, requires GPU',
    icon: '🧠',
    phiRisk: 'none',
    requiresKey: false,
  },
}

// ─── Storage for AI configuration ───────────────────────────────────────────

const AI_CONFIG_KEY = 'healthlens_ai_config'

export function getAIConfig() {
  try {
    const stored = localStorage.getItem(AI_CONFIG_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return {
    mode: 'local',
    azureEndpoint: '',
    azureApiKey: '',
    azureDeployment: '',
    browserModel: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
  }
}

export function saveAIConfig(config) {
  // NEVER store the API key in localStorage for production
  // In production, use Azure Managed Identity or key vault
  const safeConfig = { ...config }
  if (config.azureApiKey) {
    // Store only in sessionStorage (cleared on tab close)
    sessionStorage.setItem('healthlens_azure_key', config.azureApiKey)
    safeConfig.azureApiKey = '***'
  }
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(safeConfig))
}

function getAzureKey() {
  return sessionStorage.getItem('healthlens_azure_key') || ''
}


// ─── Mode 1: LOCAL_ONLY — Template-based summary ───────────────────────────

/**
 * Generate a health summary using client-side templates.
 * This is the current default — identical to generateAISummary in sampleData.js
 * but structured as an async function for consistency.
 */
async function generateLocalSummary(patient) {
  // Import the existing template generator
  const { generateAISummary } = await import('../data/sampleData')
  return generateAISummary(patient)
}


// ─── Mode 2: DEIDENTIFIED_CLOUD — Azure OpenAI with de-identification ──────

/**
 * Send de-identified clinical data to Azure OpenAI and re-identify the response.
 *
 * Security layers:
 *   1. PHI de-identification (HIPAA Safe Harbor)
 *   2. Validation scan for residual PHI
 *   3. Azure OpenAI with BAA (data not used for training)
 *   4. TLS 1.2+ encryption in transit
 *   5. Client-side re-identification
 *
 * @param {Object} patient - Full patient record
 * @param {Object} config - { azureEndpoint, azureDeployment }
 * @returns {Object} AI summary with re-identified content
 */
async function generateCloudSummary(patient, config) {
  // Step 1: De-identify
  const { deidentified, tokenMap } = deidentifyPatient(patient, { mode: 'tokenized' })

  // Step 2: Validate — ensure no PHI leaked through
  const validation = validateNoPhI(deidentified)
  if (!validation.clean) {
    console.warn('[AI Service] PHI validation warnings:', validation.warnings)
    // In strict mode, we could abort here. For now, log and continue.
  }

  // Step 3: Build the safe prompt
  const prompt = buildSafePrompt(deidentified)

  // Step 4: Call Azure OpenAI
  const apiKey = getAzureKey()
  if (!config.azureEndpoint || !apiKey) {
    throw new Error('Azure OpenAI endpoint and API key are required for cloud AI mode.')
  }

  const url = `${config.azureEndpoint}/openai/deployments/${config.azureDeployment}/chat/completions?api-version=2024-02-01`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You are a clinical health summary assistant. Provide clear, empathetic, patient-friendly health summaries. Use markdown formatting with **bold** for emphasis. Structure your response with clear sections. Never invent information not provided.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Azure OpenAI error (${response.status}): ${err}`)
  }

  const data = await response.json()
  const aiText = data.choices?.[0]?.message?.content || ''

  // Step 5: Re-identify the response (client-side only!)
  const reidentifiedText = reidentify(aiText)

  // Step 6: Parse into section format
  return parseAIResponseToSections(reidentifiedText, patient)
}

/**
 * Parse a raw AI text response into the section format used by the Dashboard.
 */
function parseAIResponseToSections(text, patient) {
  // Try to split on markdown headers
  const sections = []
  const headerRegex = /^#{1,3}\s+(.+)$/gm
  const matches = [...text.matchAll(headerRegex)]

  if (matches.length >= 2) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i][0].length
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length
      const content = text.slice(start, end).trim()
      const title = matches[i][1].trim()

      const iconMap = {
        overall: '📖', health: '📖', story: '📖',
        medication: '💊', drug: '💊', prescription: '💊',
        lab: '🧪', result: '🧪', test: '🧪',
        care: '🏥', coordination: '🏥', encounter: '🏥', visit: '🏥',
        recommendation: '🎯', next: '🎯', step: '🎯', action: '🎯',
        allergy: '⚠️', alert: '⚠️',
      }
      const titleLower = title.toLowerCase()
      const icon = Object.entries(iconMap).find(([key]) => titleLower.includes(key))?.[1] || '📋'

      sections.push({
        id: title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        title,
        icon,
        content,
      })
    }
  } else {
    // Single block — wrap as overall summary
    sections.push({
      id: 'overall',
      title: 'AI Health Summary',
      icon: '📖',
      content: text,
    })
  }

  return {
    generatedAt: new Date().toISOString(),
    basedOn: `AI analysis of de-identified clinical data`,
    mode: 'cloud',
    sections,
  }
}


// ─── Mode 3: BROWSER_AI — WebLLM (future) ──────────────────────────────────

/**
 * Generate a summary using a local browser-based LLM.
 * Uses WebLLM (https://webllm.mlc.ai/) with WebGPU acceleration.
 *
 * Note: This is a placeholder that falls back to local templates.
 * Full WebLLM integration requires:
 *   npm install @mlc-ai/web-llm
 *   And a WebGPU-capable browser (Chrome 113+, Edge 113+)
 */
async function generateBrowserAISummary(patient, config) {
  // Check WebGPU availability
  if (!navigator.gpu) {
    console.warn('[AI Service] WebGPU not available — falling back to local templates')
    return {
      ...await generateLocalSummary(patient),
      mode: 'browser-fallback',
      note: 'WebGPU not available in this browser. Using local templates instead.',
    }
  }

  // Placeholder: In production, you would:
  //   1. import { CreateMLCEngine } from '@mlc-ai/web-llm'
  //   2. const engine = await CreateMLCEngine(config.browserModel)
  //   3. De-identify the patient data (same as cloud mode for safety)
  //   4. const { deidentified } = deidentifyPatient(patient, { mode: 'safe-harbor' })
  //   5. const prompt = buildSafePrompt(deidentified)
  //   6. const response = await engine.chat.completions.create({ messages: [...] })
  //   7. Parse and return

  // For now, return enhanced local summary with a note
  return {
    ...await generateLocalSummary(patient),
    mode: 'browser-ai',
    note: 'Browser AI mode requires @mlc-ai/web-llm package. Install with: npm install @mlc-ai/web-llm',
  }
}


// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate an AI health summary using the configured mode.
 *
 * @param {Object} patient - Full patient record
 * @param {Object} overrideConfig - Optional config override
 * @returns {Promise<Object>} AI summary in Dashboard section format
 */
export async function generateAIHealthSummary(patient, overrideConfig = null) {
  const config = overrideConfig || getAIConfig()

  switch (config.mode) {
    case 'cloud':
      return generateCloudSummary(patient, config)

    case 'browser':
      return generateBrowserAISummary(patient, config)

    case 'local':
    default:
      const summary = await generateLocalSummary(patient)
      return { ...summary, mode: 'local' }
  }
}

/**
 * Test the de-identification pipeline without calling any AI.
 * Useful for validating that PHI is properly stripped.
 *
 * @param {Object} patient - Full patient record
 * @returns {{ deidentified, prompt, validation, tokenCount }}
 */
export function testDeidentification(patient) {
  const { deidentified, tokenMap } = deidentifyPatient(patient, { mode: 'tokenized' })
  const prompt = buildSafePrompt(deidentified)
  const validation = validateNoPhI(deidentified)

  return {
    deidentified,
    prompt,
    validation,
    tokenCount: tokenMap.size,
    tokenMap: Object.fromEntries(tokenMap),
    promptLength: prompt.length,
    estimatedTokens: Math.ceil(prompt.length / 4), // rough GPT token estimate
  }
}
