/**
 * Chat Engine — Local NLP Intent Parser for Health Data
 *
 * Parses natural language questions about patient health data and returns
 * structured responses with relevant data. Runs entirely in the browser.
 *
 * Intent categories:
 *   - medications: "What medications am I taking?"
 *   - labs/results: "Show me my lab results"
 *   - allergies: "Do I have any allergies?"
 *   - visits/encounters: "When was my last doctor visit?"
 *   - conditions: "What health conditions do I have?"
 *   - immunizations: "List my immunization history"
 *   - vitals: "What are my vitals?"
 *   - summary: "Give me a health summary"
 *   - provider: "Who are my doctors?"
 */

import { providers } from '../data/sampleData'

// ─── Intent Patterns ────────────────────────────────────────────────────────

const intentPatterns = [
  {
    intent: 'medications',
    patterns: [
      /\b(medication|medicine|drug|prescription|rx|pharma|taking|prescribed)\b/i,
      /\b(pill|tablet|dose|dosage)\b/i,
      /\bwhat.*(taking|on|prescribed)\b/i,
    ],
    icon: '💊',
    color: 'purple',
  },
  {
    intent: 'labs',
    patterns: [
      /\b(lab|result|test|blood|panel|cbc|metabolic|lipid|a1c|hemoglobin|cholesterol|glucose|creatinine)\b/i,
      /\b(abnormal|flagged|out of range|high|low)\b/i,
      /\bshow.*(lab|result|test|blood)\b/i,
    ],
    icon: '🧪',
    color: 'green',
  },
  {
    intent: 'allergies',
    patterns: [
      /\b(allerg|allergic|reaction|anaphylaxis|sensitivity|intolerance)\b/i,
      /\bdo i have.*(allerg)/i,
    ],
    icon: '⚠️',
    color: 'red',
  },
  {
    intent: 'encounters',
    patterns: [
      /\b(visit|encounter|appointment|doctor visit|hospital|admit|discharge|office visit|emergency)\b/i,
      /\b(when|last|recent).*(doctor|visit|hospital|appointment|seen)\b/i,
      /\bwhat were my.*(visit|doctor|appointment)\b/i,
    ],
    icon: '🏥',
    color: 'blue',
  },
  {
    intent: 'conditions',
    patterns: [
      /\b(condition|diagnosis|diagnos|disease|illness|problem|disorder|syndrome)\b/i,
      /\bwhat.*(condition|diagnos|wrong|health issue|problem)\b/i,
      /\bhealth condition/i,
    ],
    icon: '📋',
    color: 'orange',
  },
  {
    intent: 'immunizations',
    patterns: [
      /\b(immuniz|vaccin|shot|booster|flu shot|covid|tetanus|mmr|hep)\b/i,
    ],
    icon: '💉',
    color: 'teal',
  },
  {
    intent: 'providers',
    patterns: [
      /\b(provider|doctor|physician|specialist|who.*(treat|care|doctor|provider|see))\b/i,
      /\bmy doctor/i,
    ],
    icon: '👨‍⚕️',
    color: 'indigo',
  },
  {
    intent: 'summary',
    patterns: [
      /\b(summary|summarize|overview|tell me about|health story|health status|overall)\b/i,
      /\bwhat.*(know|have|records?)\b.*about\b/i,
    ],
    icon: '📖',
    color: 'blue',
  },
]

// ─── Intent Detection ───────────────────────────────────────────────────────

/**
 * Detect the intent of a natural language question.
 * Returns { intent, confidence, icon, color }
 */
function detectIntent(query) {
  const q = query.toLowerCase().trim()

  let bestMatch = null
  let bestScore = 0

  for (const { intent, patterns, icon, color } of intentPatterns) {
    let score = 0
    for (const pattern of patterns) {
      if (pattern.test(q)) {
        score += 1
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = { intent, confidence: Math.min(score / patterns.length, 1), icon, color }
    }
  }

  // Fallback — try to be helpful
  if (!bestMatch || bestScore === 0) {
    return { intent: 'unknown', confidence: 0, icon: '🤔', color: 'gray' }
  }

  return bestMatch
}

// ─── Response Generators ────────────────────────────────────────────────────

function generateMedicationsResponse(patient) {
  const meds = patient.medications || []
  if (meds.length === 0) {
    return {
      text: "I don't see any active medications in your records. This could mean your records haven't been fully loaded, or you may not have any currently prescribed medications.",
      data: null,
      dataType: null,
    }
  }

  return {
    text: `You currently have **${meds.length} active medication${meds.length !== 1 ? 's'  : ''}** on file:\n\n${meds.map(m =>
      `• **${m.name}** — ${m.dosage || m.dose || 'dosage not specified'}\n  Purpose: ${m.purpose || 'not specified'}`
    ).join('\n\n')}\n\nRemember to take your medications as prescribed and discuss any side effects with your provider.`,
    data: meds,
    dataType: 'medications',
  }
}

function generateLabsResponse(patient, query) {
  const results = patient.results || []
  if (results.length === 0) {
    return {
      text: "No lab results were found in your records. Your provider may not have ordered recent tests, or results may still be pending.",
      data: null,
      dataType: null,
    }
  }

  const q = query.toLowerCase()
  const abnormal = results.filter(r => r.flag !== 'Normal')

  // Check if asking specifically about abnormal results
  if (/abnormal|flagged|high|low|out of range|concern/.test(q)) {
    if (abnormal.length === 0) {
      return {
        text: "Great news! All your lab results are within normal reference ranges. No abnormal values were flagged.",
        data: results,
        dataType: 'labs',
      }
    }
    return {
      text: `**${abnormal.length} result${abnormal.length !== 1 ? 's' : ''} flagged for attention:**\n\n${abnormal.map(r =>
        `• **${r.component}**: ${r.value} ${r.unit || r.units || ''} (Reference: ${r.refLow}–${r.refHigh}) — **${r.flag}**`
      ).join('\n')}\n\nPlease discuss these results with your healthcare provider for proper interpretation and any recommended follow-up.`,
      data: abnormal,
      dataType: 'labs',
    }
  }

  // Check for specific test names
  const specificTests = ['cholesterol', 'glucose', 'a1c', 'hemoglobin', 'creatinine', 'sodium', 'potassium', 'platelet', 'wbc', 'rbc']
  const matchedTest = specificTests.find(t => q.includes(t))
  if (matchedTest) {
    const filtered = results.filter(r => r.component.toLowerCase().includes(matchedTest))
    if (filtered.length > 0) {
      return {
        text: `Here are your **${matchedTest}** results:\n\n${filtered.map(r =>
          `• **${r.component}**: ${r.value} ${r.unit || r.units || ''} (Reference: ${r.refLow}–${r.refHigh}) — ${r.flag === 'Normal' ? '✓ Normal' : `⚠️ ${r.flag}`}`
        ).join('\n')}\n\n${filtered.some(r => r.flag !== 'Normal') ? 'Some values are outside the normal range. Discuss with your provider.' : 'All values are within normal range.'}`,
        data: filtered,
        dataType: 'labs',
      }
    }
  }

  // General labs overview
  return {
    text: `Your records contain **${results.length} lab result${results.length !== 1 ? 's' : ''}**${abnormal.length > 0 ? `, with **${abnormal.length} flagged** as abnormal` : ', all within normal ranges'}.\n\nHere's a summary:\n\n${results.slice(0, 8).map(r =>
      `• **${r.component}**: ${r.value} ${r.unit || r.units || ''} ${r.flag === 'Normal' ? '✓' : `⚠️ ${r.flag}`}`
    ).join('\n')}${results.length > 8 ? `\n\n...and ${results.length - 8} more results.` : ''}`,
    data: results,
    dataType: 'labs',
  }
}

function generateAllergiesResponse(patient) {
  const allergies = patient.allergies || []
  if (allergies.length === 0) {
    return {
      text: "No allergies are documented in your health records. If you have known allergies, make sure to inform your healthcare provider to keep your records up to date.",
      data: null,
      dataType: null,
    }
  }

  return {
    text: `You have **${allergies.length} documented allerg${allergies.length !== 1 ? 'ies' : 'y'}**:\n\n${allergies.map(a =>
      `• **${a.allergen || a.name}** — Severity: ${a.severity || 'unknown'}, Reaction: ${a.reaction || 'not specified'}`
    ).join('\n')}\n\n⚠️ Make sure all your healthcare providers are aware of these allergies before any new prescriptions or procedures.`,
    data: allergies,
    dataType: 'allergies',
  }
}

function generateEncountersResponse(patient, query) {
  const encounters = patient.encounters || []
  if (encounters.length === 0) {
    return {
      text: "No healthcare encounters are documented in your records.",
      data: null,
      dataType: null,
    }
  }

  const sorted = [...encounters].sort((a, b) => new Date(b.contactDate) - new Date(a.contactDate))
  const q = query.toLowerCase()

  // "Last" or "most recent" visit
  if (/last|most recent|latest/.test(q)) {
    const last = sorted[0]
    const prov = providers[last.visitProvider]
    return {
      text: `Your most recent visit was on **${new Date(last.contactDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**:\n\n• **Type:** ${last.encType}\n• **Provider:** ${prov?.name || 'Unknown'} (${prov?.specialty || 'Specialist'})\n• **Reason:** ${last.chiefComplaint || 'Not specified'}\n• **Diagnosis:** ${last.diagnosis || 'Not documented'}\n• **Setting:** ${last.patientClass || 'Outpatient'}`,
      data: [last],
      dataType: 'encounters',
    }
  }

  // General encounters list
  return {
    text: `You have **${encounters.length} documented healthcare visit${encounters.length !== 1 ? 's' : ''}**:\n\n${sorted.slice(0, 5).map(e => {
      const prov = providers[e.visitProvider]
      return `• **${new Date(e.contactDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}** — ${e.encType} with ${prov?.name || 'Provider'}\n  ${e.diagnosis || 'Routine visit'} (${e.patientClass})`
    }).join('\n\n')}${encounters.length > 5 ? `\n\n...and ${encounters.length - 5} more encounters.` : ''}`,
    data: sorted,
    dataType: 'encounters',
  }
}

function generateConditionsResponse(patient) {
  const conditions = patient.conditions || []
  if (conditions.length === 0) {
    return {
      text: "No health conditions are documented in your records. This is great news! Continue with regular preventive care visits.",
      data: null,
      dataType: null,
    }
  }

  const active = conditions.filter(c => c.status === 'Active')
  const resolved = conditions.filter(c => c.status !== 'Active')

  let text = `You have **${conditions.length} documented condition${conditions.length !== 1 ? 's' : ''}** (${active.length} active, ${resolved.length} resolved):\n\n`

  if (active.length > 0) {
    text += `**Active Conditions:**\n${active.map(c =>
      `• **${c.name}** — ${c.severity || 'unknown'} severity (since ${c.onset || 'unknown date'})`
    ).join('\n')}\n\n`
  }

  if (resolved.length > 0) {
    text += `**Resolved Conditions:**\n${resolved.map(c =>
      `• ~~${c.name}~~ — Resolved`
    ).join('\n')}\n\n`
  }

  text += `Continue working with your healthcare team to manage your active conditions.`

  return {
    text,
    data: conditions,
    dataType: 'conditions',
  }
}

function generateImmunizationsResponse(patient) {
  const orders = patient.orders || []
  const immunizations = orders.filter(o =>
    o.orderType === 'Immunization' || o.procName?.toLowerCase().includes('vaccin') || o.procName?.toLowerCase().includes('immuniz')
  )

  if (immunizations.length === 0) {
    return {
      text: "No immunization records were found in your current health data. This may mean your immunization records are maintained separately. Ask your provider about your immunization status.",
      data: null,
      dataType: null,
    }
  }

  return {
    text: `You have **${immunizations.length} immunization record${immunizations.length !== 1 ? 's' : ''}** on file:\n\n${immunizations.map(i =>
      `• **${i.procName || i.name}** — ${i.orderDate || 'date unknown'}`
    ).join('\n')}\n\nDiscuss with your provider if you're due for any boosters or additional vaccinations.`,
    data: immunizations,
    dataType: 'immunizations',
  }
}

function generateProvidersResponse(patient) {
  const encounters = patient.encounters || []
  const uniqueProviderIds = [...new Set(encounters.map(e => e.visitProvider))]
  const provList = uniqueProviderIds.map(id => providers[id]).filter(Boolean)

  if (provList.length === 0) {
    return {
      text: "No provider information was found in your records.",
      data: null,
      dataType: null,
    }
  }

  return {
    text: `Your care team includes **${provList.length} provider${provList.length !== 1 ? 's' : ''}**:\n\n${provList.map(p =>
      `• **${p.name}** — ${p.specialty}`
    ).join('\n')}\n\nYour providers work together to coordinate your care across specialties.`,
    data: provList,
    dataType: 'providers',
  }
}

function generateSummaryResponse(patient) {
  const active = (patient.conditions || []).filter(c => c.status === 'Active')
  return {
    text: `Here's a quick overview of **${patient.firstName} ${patient.lastName}**'s health records:\n\n` +
      `• **Age:** ${patient.age} years old (${patient.sex})\n` +
      `• **Active Conditions:** ${active.length > 0 ? active.map(c => c.name).join(', ') : 'None documented'}\n` +
      `• **Medications:** ${patient.medicationCount || 0} active\n` +
      `• **Lab Results:** ${patient.resultCount || 0} on file${(patient.abnormalResults?.length || 0) > 0 ? ` (${patient.abnormalResults.length} abnormal)` : ''}\n` +
      `• **Allergies:** ${(patient.allergies?.length || 0) > 0 ? patient.allergies.map(a => a.allergen || a.name).join(', ') : 'None documented'}\n` +
      `• **Recent Visits:** ${patient.encounterCount || 0} encounters\n\n` +
      `For detailed analysis, try asking about specific categories like medications, lab results, or conditions.`,
    data: null,
    dataType: null,
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Process a natural language query against patient health data.
 *
 * @param {string} query - The user's question
 * @param {Object} patient - The selected patient from DataContext
 * @returns {{ intent, text, data, dataType, icon, color, confidence }}
 */
export function processQuery(query, patient) {
  if (!query || !patient) {
    return {
      intent: 'error',
      text: "I need a question and patient data to help you. Please upload your health records first.",
      data: null,
      dataType: null,
      icon: '❌',
      color: 'red',
      confidence: 0,
    }
  }

  const { intent, confidence, icon, color } = detectIntent(query)

  let response
  switch (intent) {
    case 'medications':
      response = generateMedicationsResponse(patient)
      break
    case 'labs':
      response = generateLabsResponse(patient, query)
      break
    case 'allergies':
      response = generateAllergiesResponse(patient)
      break
    case 'encounters':
      response = generateEncountersResponse(patient, query)
      break
    case 'conditions':
      response = generateConditionsResponse(patient)
      break
    case 'immunizations':
      response = generateImmunizationsResponse(patient)
      break
    case 'providers':
      response = generateProvidersResponse(patient)
      break
    case 'summary':
      response = generateSummaryResponse(patient)
      break
    default:
      response = {
        text: `I'm not sure how to answer that specific question. Here are some things you can ask me:\n\n` +
          `• **"What medications am I taking?"**\n` +
          `• **"Show me my lab results"**\n` +
          `• **"Do I have any allergies?"**\n` +
          `• **"When was my last doctor visit?"**\n` +
          `• **"What health conditions do I have?"**\n` +
          `• **"List my immunization history"**\n` +
          `• **"Who are my doctors?"**\n` +
          `• **"Give me a health summary"**\n\n` +
          `Try rephrasing your question or pick one of the suggestions above!`,
        data: null,
        dataType: null,
      }
  }

  return {
    intent,
    ...response,
    icon,
    color,
    confidence,
  }
}

/**
 * Get suggested questions for the chat UI.
 */
export function getSuggestedQuestions() {
  return [
    { text: 'What medications am I currently taking?', icon: '💊', color: 'purple' },
    { text: 'Show me my recent lab results', icon: '🧪', color: 'green' },
    { text: 'Do I have any allergies?', icon: '⚠️', color: 'red' },
    { text: 'What were my recent doctor visits?', icon: '🏥', color: 'blue' },
    { text: 'List my immunization history', icon: '💉', color: 'teal' },
    { text: 'What health conditions do I have?', icon: '📋', color: 'orange' },
  ]
}
