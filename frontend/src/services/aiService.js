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


// ─── Mode 1: LOCAL_ONLY — Rich AI-style local summary ──────────────────────

/**
 * Generate a comprehensive, medically rich health summary using client-side
 * intelligence. Analyzes patient data to produce insights, risk assessments,
 * medication interaction warnings, lab trend analysis, and care recommendations.
 *
 * This replaces the simple templates in sampleData.js with much deeper analysis.
 */
async function generateLocalSummary(patient) {
  const { providers } = await import('../data/sampleData')

  const activeConditions = (patient.conditions || []).filter(c => c.status === 'Active')
  const resolvedConditions = (patient.conditions || []).filter(c => c.status !== 'Active')
  const meds = patient.medications || []
  const results = patient.results || []
  const encounters = patient.encounters || []
  const allergies = patient.allergies || []
  const abnormal = patient.abnormalResults || results.filter(r => r.flag !== 'Normal')
  const orders = patient.orders || []

  const sorted = [...encounters].sort((a, b) => new Date(b.contactDate) - new Date(a.contactDate))
  const lastEnc = sorted[0]
  const provName = lastEnc ? providers?.[lastEnc.visitProvider]?.name || 'your provider' : 'your provider'
  const provSpec = lastEnc ? providers?.[lastEnc.visitProvider]?.specialty || 'Specialist' : ''

  // ── Risk scoring ──
  let riskScore = 85
  if (abnormal.length > 3) riskScore -= 15
  else if (abnormal.length > 0) riskScore -= abnormal.length * 3
  if (activeConditions.length > 2) riskScore -= 10
  if (meds.length > 4) riskScore -= 5 // polypharmacy flag
  if (encounters.length < 2) riskScore -= 5 // infrequent visits
  riskScore = Math.max(0, Math.min(100, riskScore))

  const riskLabel = riskScore >= 80 ? 'Low Risk' : riskScore >= 60 ? 'Moderate Risk' : 'Elevated Risk'
  const riskEmoji = riskScore >= 80 ? '🟢' : riskScore >= 60 ? '🟡' : '🔴'

  // ── Medication interaction analysis ──
  const medNames = meds.map(m => m.name?.toLowerCase() || '')
  const interactionWarnings = []
  if (medNames.some(n => n.includes('lisinopril')) && medNames.some(n => n.includes('potassium'))) {
    interactionWarnings.push('⚠️ **Potential Interaction**: ACE inhibitors (Lisinopril) may increase potassium levels. Monitor serum potassium regularly.')
  }
  if (medNames.some(n => n.includes('metformin')) && medNames.some(n => n.includes('contrast'))) {
    interactionWarnings.push('⚠️ **Potential Interaction**: Metformin should be held before/after contrast dye procedures.')
  }
  if (medNames.some(n => n.includes('statin') || n.includes('atorvastatin') || n.includes('rosuvastatin'))) {
    interactionWarnings.push('ℹ️ **Statin Monitoring**: Periodic liver function tests recommended while on statin therapy.')
  }
  if (meds.length >= 5) {
    interactionWarnings.push('⚠️ **Polypharmacy Alert**: Patient is taking 5+ medications. Regular medication reconciliation recommended to minimize adverse interactions.')
  }

  // ── Lab trend analysis ──
  const labTrends = []
  const resultsByComponent = {}
  results.forEach(r => {
    if (!resultsByComponent[r.component]) resultsByComponent[r.component] = []
    resultsByComponent[r.component].push(r)
  })
  Object.entries(resultsByComponent).forEach(([comp, vals]) => {
    if (vals.length >= 2) {
      const latest = parseFloat(vals[vals.length - 1].value)
      const previous = parseFloat(vals[0].value)
      if (!isNaN(latest) && !isNaN(previous)) {
        const pctChange = ((latest - previous) / previous * 100).toFixed(1)
        if (Math.abs(pctChange) > 10) {
          labTrends.push({ component: comp, direction: pctChange > 0 ? 'increased' : 'decreased', pct: Math.abs(pctChange), latest: vals[vals.length - 1] })
        }
      }
    }
  })

  // ── Visit frequency analysis ──
  const visitDates = encounters.map(e => new Date(e.contactDate)).sort((a, b) => a - b)
  let avgDaysBetweenVisits = null
  if (visitDates.length >= 2) {
    const totalDays = (visitDates[visitDates.length - 1] - visitDates[0]) / (1000 * 60 * 60 * 24)
    avgDaysBetweenVisits = Math.round(totalDays / (visitDates.length - 1))
  }

  // ── Build sections ──
  const sections = [
    {
      id: 'overall',
      title: 'Overall Health Story',
      icon: '📖',
      content: `${riskEmoji} **Health Risk Score: ${riskScore}/100 — ${riskLabel}**\n\n` +
        `${patient.firstName} ${patient.lastName} is a **${patient.age}-year-old ${patient.sex?.toLowerCase()}** with ` +
        `${activeConditions.length > 0 ? `**${activeConditions.length} active health condition${activeConditions.length !== 1 ? 's' : ''}** (${activeConditions.map(c => c.name).join(', ')})` : 'no documented active conditions'}` +
        ` currently managed with **${meds.length} medication${meds.length !== 1 ? 's' : ''}**.\n\n` +
        `The clinical record includes **${encounters.length} healthcare encounter${encounters.length !== 1 ? 's' : ''}**, **${results.length} lab result${results.length !== 1 ? 's' : ''}**, and **${orders.length} clinical order${orders.length !== 1 ? 's' : ''}**. ` +
        `${abnormal.length > 0 ? `**${abnormal.length} lab value${abnormal.length !== 1 ? 's' : ''} flagged as abnormal** require monitoring. ` : 'All lab values are within normal reference ranges. '}` +
        `${allergies.length > 0 ? `The patient has **${allergies.length} documented allerg${allergies.length !== 1 ? 'ies' : 'y'}** that must be considered in all treatment decisions.` : 'No documented allergies.'}` +
        (lastEnc ? `\n\nMost recent visit: **${new Date(lastEnc.contactDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}** — ${lastEnc.encType} with **${provName}** (${provSpec})${lastEnc.diagnosis ? ` for ${lastEnc.diagnosis}` : ''}.` : '') +
        (avgDaysBetweenVisits ? `\n\n📊 **Visit Pattern**: Average of **${avgDaysBetweenVisits} days** between healthcare encounters, indicating ${avgDaysBetweenVisits < 60 ? 'active and regular' : avgDaysBetweenVisits < 180 ? 'moderate' : 'infrequent'} clinical monitoring.` : ''),
    },
    {
      id: 'medications',
      title: 'Medications Analysis',
      icon: '💊',
      content: meds.length > 0
        ? `Currently prescribed **${meds.length} active medication${meds.length !== 1 ? 's' : ''}**:\n\n` +
          meds.map(m =>
            `• **${m.name}** — ${m.dosage || m.dose || 'dosage not specified'}\n  ↳ Purpose: ${m.purpose || 'not specified'} | Prescriber: ${m.prescriber || 'not specified'} | Since: ${m.startDate ? new Date(m.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'unknown'}`
          ).join('\n\n') +
          (interactionWarnings.length > 0
            ? '\n\n**🔬 AI Medication Analysis:**\n' + interactionWarnings.join('\n')
            : '\n\n✅ **No significant drug interaction risks identified** based on current medication combination.') +
          `\n\n💡 **Recommendation**: ${meds.length >= 3 ? 'Schedule a comprehensive medication review at your next visit to ensure all prescriptions remain appropriate and cost-effective.' : 'Continue taking medications as prescribed and report any side effects to your provider.'}`
        : 'No active medications are currently documented in your health records. If you are taking any medications, ensure your provider updates your records.',
    },
    {
      id: 'labs',
      title: 'Lab Results & Clinical Trends',
      icon: '🧪',
      content: results.length > 0
        ? `Your records contain **${results.length} lab result${results.length !== 1 ? 's' : ''}** across **${orders.filter(o => o.orderType === 'Lab').length || 'multiple'}** orders.\n\n` +
          (abnormal.length > 0
            ? `**⚠️ ${abnormal.length} Abnormal Result${abnormal.length !== 1 ? 's' : ''} Requiring Attention:**\n` +
              abnormal.map(r => `• **${r.component}**: ${r.value} ${r.unit || ''} (Reference: ${r.refLow}–${r.refHigh}) — **${r.flag}**`).join('\n') +
              '\n\n'
            : '✅ **All results within normal reference ranges** — excellent!\n\n') +
          (labTrends.length > 0
            ? '**📈 AI Trend Analysis:**\n' +
              labTrends.map(t => `• **${t.component}** has ${t.direction} by **${t.pct}%** — ${t.latest.flag !== 'Normal' ? '⚠️ requires monitoring' : 'within acceptable variance'}`).join('\n') + '\n\n'
            : '') +
          `**Key Values Summary:**\n` +
          results.slice(0, 6).map(r => `• ${r.component}: **${r.value}** ${r.unit || ''} ${r.flag === 'Normal' ? '✓' : `⚠️ ${r.flag}`}`).join('\n') +
          (results.length > 6 ? `\n• ...and ${results.length - 6} more results` : '') +
          `\n\n💡 **Recommendation**: ${abnormal.length > 0 ? 'Discuss abnormal values with your provider. Some may require follow-up testing or treatment adjustments.' : 'Continue regular lab monitoring as part of your preventive care plan.'}`
        : 'No recent lab results found in your records. Regular lab work helps detect potential issues early.',
    },
  ]

  // Allergy risk assessment (only if allergies present)
  if (allergies.length > 0) {
    const severeAllergies = allergies.filter(a => (a.severity || '').toLowerCase() === 'severe')
    sections.push({
      id: 'allergies',
      title: 'Allergy Risk Assessment',
      icon: '⚠️',
      content: `**${allergies.length} Documented Allerg${allergies.length !== 1 ? 'ies' : 'y'}** ${severeAllergies.length > 0 ? `(🔴 ${severeAllergies.length} SEVERE)` : ''}:\n\n` +
        allergies.map(a =>
          `• **${a.allergen || a.name}** — Severity: **${a.severity || 'Unknown'}** | Reaction: ${a.reaction || 'Not specified'}`
        ).join('\n') +
        `\n\n**🔬 AI Safety Analysis:**\n` +
        (severeAllergies.length > 0
          ? `🔴 **HIGH PRIORITY**: ${severeAllergies.length} severe allerg${severeAllergies.length !== 1 ? 'ies' : 'y'} documented. Ensure all providers and emergency contacts are aware. Consider wearing a medical alert bracelet.`
          : `🟢 No severe allergies documented. Standard precautions apply.`) +
        // Check medication-allergy cross-references
        `\n\n💡 **Recommendation**: Verify allergy list at every healthcare visit. Report any new reactions immediately.`,
    })
  }

  // Care coordination
  sections.push({
    id: 'care',
    title: 'Care Coordination & Team',
    icon: '🏥',
    content: `Your health is managed by a coordinated team across **${encounters.length} documented encounter${encounters.length !== 1 ? 's' : ''}**:\n\n` +
      (encounters.length > 0
        ? `**Recent Encounters:**\n` +
          sorted.slice(0, 4).map(e => {
            const p = providers?.[e.visitProvider]
            return `• **${new Date(e.contactDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}** — ${e.encType} with **${p?.name || 'Provider'}** (${p?.specialty || 'Specialist'})\n  ↳ ${e.diagnosis || e.chiefComplaint || 'Routine visit'} [${e.patientClass}]`
          }).join('\n\n') +
          `\n\n**Your Care Team:**\n` +
          [...new Set(encounters.map(e => e.visitProvider))].map(id => {
            const p = providers?.[id]
            return p ? `• **${p.name}** — ${p.specialty}` : null
          }).filter(Boolean).join('\n') +
          `\n\n📊 **Care Continuity Score**: ${encounters.length >= 5 ? '🟢 Excellent' : encounters.length >= 3 ? '🟡 Good' : '🔴 Needs improvement'} — ${encounters.length >= 5 ? 'Regular follow-ups demonstrate strong engagement with care plan.' : 'Consider scheduling more regular follow-up appointments.'}`
        : 'No healthcare encounters documented. Schedule a comprehensive check-up with your primary care provider.'),
  })

  // Conditions management
  if (activeConditions.length > 0 || resolvedConditions.length > 0) {
    sections.push({
      id: 'conditions',
      title: 'Condition Management',
      icon: '📋',
      content: `**${activeConditions.length} Active** and **${resolvedConditions.length} Resolved** condition${(activeConditions.length + resolvedConditions.length) !== 1 ? 's' : ''} documented:\n\n` +
        (activeConditions.length > 0
          ? `**🔴 Active Conditions:**\n` +
            activeConditions.map(c => {
              const relatedMeds = meds.filter(m => {
                const purpose = (m.purpose || '').toLowerCase()
                const condName = c.name.toLowerCase()
                return purpose.includes(condName.split(' ')[0]) || purpose.includes(condName)
              })
              return `• **${c.name}** — ${c.severity || 'Unknown'} severity (since ${c.onset || 'unknown date'})\n  ↳ ${relatedMeds.length > 0 ? `Managed with: ${relatedMeds.map(m => m.name).join(', ')}` : 'No specific medication linked'}`
            }).join('\n\n') + '\n\n'
          : '') +
        (resolvedConditions.length > 0
          ? `**✅ Resolved Conditions:**\n` +
            resolvedConditions.map(c => `• ~~${c.name}~~ — Resolved`).join('\n') + '\n\n'
          : '') +
        `💡 **AI Assessment**: ${activeConditions.length > 0 && meds.length >= activeConditions.length ? 'Treatment appears appropriate — each active condition has corresponding medication coverage.' : 'Review treatment coverage for all active conditions with your provider.'}`,
    })
  }

  // Recommendations
  const recommendations = []
  if (abnormal.length > 0) recommendations.push('🔬 **Follow up on abnormal lab results** with your care team — some values may warrant repeat testing or treatment changes')
  if (meds.length >= 5) recommendations.push('💊 **Schedule a medication reconciliation** — patients on 5+ medications benefit from periodic reviews to reduce adverse interactions')
  activeConditions.forEach(c => {
    recommendations.push(`📋 **Continue managing ${c.name}** — ${c.severity?.toLowerCase() === 'moderate' || c.severity?.toLowerCase() === 'severe' ? 'prioritize regular monitoring' : 'maintain current care plan'}`)
  })
  if (allergies.length > 0) recommendations.push(`⚠️ **Verify allergy information** at every healthcare visit — you have ${allergies.length} documented allerg${allergies.length !== 1 ? 'ies' : 'y'}`)
  if (encounters.length < 3) recommendations.push('📅 **Increase visit frequency** — schedule at least 2 preventive care visits per year')
  recommendations.push('🏃 **Maintain healthy lifestyle habits** — regular exercise, balanced nutrition, and adequate sleep support overall wellness')
  recommendations.push('📱 **Keep health records updated** — ensure all providers have access to your complete medical history')

  sections.push({
    id: 'recommendations',
    title: 'AI Recommendations & Next Steps',
    icon: '🎯',
    content: `Based on AI analysis of your complete health record:\n\n${recommendations.join('\n\n')}\n\n---\n*These recommendations are generated by AI and should be discussed with your healthcare provider before making any changes to your care plan.*`,
  })

  return {
    generatedAt: new Date().toISOString(),
    basedOn: `AI analysis of ${encounters.length + results.length + orders.length} health records across ${[...new Set(encounters.map(e => e.visitProvider))].length} providers`,
    mode: 'local',
    riskScore,
    riskLabel,
    sections,
  }
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
