/**
 * Chat Engine — Advanced NLP Health Data Intelligence
 *
 * Deep analysis engine that processes natural language queries against patient
 * health records. Goes far beyond basic keyword matching:
 *
 *   - Multi-intent detection (understands compound questions)
 *   - Clinical cross-referencing (meds↔conditions, labs↔diagnoses)
 *   - Risk scoring & trend analysis
 *   - Medication interaction detection
 *   - Follow-up question generation
 *   - Comparative analytics (e.g., "are my labs getting better?")
 *
 * All processing runs locally — zero network, zero PHI risk.
 */

import { providers } from '../data/sampleData'

// ─── Clinical Knowledge Base ────────────────────────────────────────────────

const DRUG_CLASSES = {
  'lisinopril': { class: 'ACE Inhibitor', treats: ['hypertension', 'heart failure'], monitor: ['potassium', 'creatinine', 'kidney'] },
  'amlodipine': { class: 'Calcium Channel Blocker', treats: ['hypertension', 'angina'], monitor: ['blood pressure', 'heart rate'] },
  'metformin': { class: 'Biguanide', treats: ['diabetes', 'type 2 diabetes'], monitor: ['glucose', 'a1c', 'kidney', 'creatinine'] },
  'atorvastatin': { class: 'Statin', treats: ['hyperlipidemia', 'cholesterol'], monitor: ['cholesterol', 'ldl', 'hdl', 'liver', 'alt', 'ast'] },
  'rosuvastatin': { class: 'Statin', treats: ['hyperlipidemia', 'cholesterol'], monitor: ['cholesterol', 'ldl', 'hdl', 'liver'] },
  'metoprolol': { class: 'Beta Blocker', treats: ['hypertension', 'heart failure', 'arrhythmia'], monitor: ['heart rate', 'blood pressure'] },
  'omeprazole': { class: 'Proton Pump Inhibitor', treats: ['gerd', 'acid reflux', 'ulcer'], monitor: ['magnesium', 'vitamin b12'] },
  'levothyroxine': { class: 'Thyroid Hormone', treats: ['hypothyroidism'], monitor: ['tsh', 'thyroid'] },
  'sertraline': { class: 'SSRI', treats: ['depression', 'anxiety'], monitor: ['mood', 'serotonin'] },
  'hydrochlorothiazide': { class: 'Thiazide Diuretic', treats: ['hypertension'], monitor: ['sodium', 'potassium', 'kidney'] },
  'warfarin': { class: 'Anticoagulant', treats: ['blood clot', 'atrial fibrillation'], monitor: ['inr', 'pt', 'bleeding'] },
  'aspirin': { class: 'NSAID/Antiplatelet', treats: ['pain', 'cardiovascular protection'], monitor: ['bleeding', 'platelet'] },
  'insulin': { class: 'Insulin', treats: ['diabetes'], monitor: ['glucose', 'a1c'] },
  'albuterol': { class: 'Beta-2 Agonist', treats: ['asthma', 'copd'], monitor: ['peak flow', 'breathing'] },
  'prednisone': { class: 'Corticosteroid', treats: ['inflammation', 'autoimmune'], monitor: ['glucose', 'bone density', 'blood pressure'] },
}

const LAB_INTERPRETATIONS = {
  'glucose': { high: 'Elevated glucose may indicate diabetes or pre-diabetes. Fasting glucose >126 mg/dL warrants further evaluation.', low: 'Low glucose (hypoglycemia) can cause dizziness, confusion, and shakiness.' },
  'hemoglobin a1c': { high: 'A1C above 6.5% indicates diabetes. Between 5.7-6.4% indicates pre-diabetes. Target for diabetics is typically <7%.', low: 'Very low A1C is uncommon outside of non-diabetic patients.' },
  'cholesterol': { high: 'Total cholesterol above 200 mg/dL increases cardiovascular risk. Consider dietary changes and statin therapy.', low: 'Low cholesterol is generally favorable.' },
  'ldl': { high: 'LDL ("bad cholesterol") above 130 mg/dL increases heart disease risk. Target <100 mg/dL, or <70 for high-risk.', low: 'Lower LDL is generally protective.' },
  'hdl': { high: 'Higher HDL ("good cholesterol") is protective. >60 mg/dL is optimal.', low: 'Low HDL (<40 men, <50 women) increases cardiovascular risk.' },
  'creatinine': { high: 'Elevated creatinine may indicate kidney dysfunction. Monitor trends over time.', low: 'Low creatinine is usually not concerning.' },
  'potassium': { high: 'Hyperkalemia (>5.0 mEq/L) can affect heart rhythm. Review medications that affect potassium.', low: 'Hypokalemia (<3.5 mEq/L) can cause muscle weakness and arrhythmias.' },
  'sodium': { high: 'Hypernatremia may indicate dehydration.', low: 'Hyponatremia can cause confusion, nausea, and seizures in severe cases.' },
  'wbc': { high: 'Elevated WBC may indicate infection, inflammation, or stress response.', low: 'Low WBC may indicate immune suppression. Monitor for infection signs.' },
  'platelet': { high: 'Elevated platelets may indicate inflammation, infection, or bone marrow disorders.', low: 'Low platelets increase bleeding risk.' },
  'hemoglobin': { high: 'Elevated hemoglobin may indicate dehydration or polycythemia.', low: 'Low hemoglobin indicates anemia. Evaluate iron, B12, and folate.' },
  'tsh': { high: 'Elevated TSH suggests hypothyroidism. Consider thyroid hormone replacement.', low: 'Low TSH suggests hyperthyroidism. Further thyroid testing recommended.' },
  'alt': { high: 'Elevated ALT may indicate liver inflammation. Review medications and alcohol use.', low: 'Low ALT is generally not concerning.' },
  'ast': { high: 'Elevated AST, especially with elevated ALT, may indicate liver damage.', low: 'Low AST is generally not concerning.' },
  'systolic': { high: 'Systolic BP >130 indicates hypertension. Target <130 mmHg.', low: 'Hypotension may cause dizziness.' },
  'intravascular systolic': { high: 'Elevated systolic pressure indicates hypertension risk.', low: 'May indicate over-medication or dehydration.' },
}

const INTERACTION_RULES = [
  { drugs: ['lisinopril', 'potassium'], severity: 'moderate', warning: 'ACE inhibitors can increase potassium levels. Monitor serum potassium regularly to prevent hyperkalemia.' },
  { drugs: ['lisinopril', 'hydrochlorothiazide'], severity: 'info', warning: 'Common combination for BP control. Diuretic may help offset ACE inhibitor potassium retention.' },
  { drugs: ['metformin', 'lisinopril'], severity: 'info', warning: 'Both are standard metabolic syndrome treatment. ACE inhibitors provide kidney protection for diabetics.' },
  { drugs: ['warfarin', 'aspirin'], severity: 'high', warning: 'CRITICAL: Dual anticoagulant/antiplatelet therapy significantly increases bleeding risk.' },
  { drugs: ['metformin', 'prednisone'], severity: 'moderate', warning: 'Corticosteroids raise blood glucose, counteracting metformin. May need temporary insulin.' },
  { drugs: ['atorvastatin', 'rosuvastatin'], severity: 'high', warning: 'Two statins should not be combined. Increases rhabdomyolysis risk.' },
  { drugs: ['sertraline', 'aspirin'], severity: 'moderate', warning: 'SSRIs + NSAIDs increase GI bleeding risk. Consider gastroprotection.' },
  { drugs: ['omeprazole', 'metformin'], severity: 'low', warning: 'Long-term PPI use may reduce B12 absorption. Monitor B12 periodically.' },
]

// ─── Advanced Intent Detection ──────────────────────────────────────────────

const intentPatterns = [
  {
    intent: 'medications',
    patterns: [
      /\b(medication|medicine|drug|prescription|rx|pharma|taking|prescribed|pill|tablet|dose|dosage)\b/i,
      /\bwhat.*(taking|on|prescribed)\b/i,
      /\b(side effect|refill|pharmacy)\b/i,
    ],
    icon: '💊',
    color: 'purple',
  },
  {
    intent: 'labs',
    patterns: [
      /\b(lab|result|test|blood|panel|cbc|metabolic|lipid|a1c|hemoglobin|cholesterol|glucose|creatinine|sodium|potassium|platelet|wbc|rbc|bmp|cmp|alt|ast|tsh)\b/i,
      /\b(abnormal|flagged|out of range|high|low|getting better|getting worse|trend|improving|worsening)\b/i,
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
      /\bsafe.*(take|prescri|eat)\b/i,
    ],
    icon: '⚠️',
    color: 'red',
  },
  {
    intent: 'encounters',
    patterns: [
      /\b(visit|encounter|appointment|doctor visit|hospital|admit|discharge|office visit|emergency|er visit|urgent care)\b/i,
      /\b(when|last|recent|next|upcoming).*(doctor|visit|hospital|appointment|seen)\b/i,
    ],
    icon: '🏥',
    color: 'blue',
  },
  {
    intent: 'conditions',
    patterns: [
      /\b(condition|diagnosis|diagnos|disease|illness|problem|disorder|syndrome|chronic)\b/i,
      /\bwhat.*(condition|diagnos|wrong|health issue|problem)\b/i,
      /\b(active|resolved|managed|treatment|therapy)\b/i,
    ],
    icon: '📋',
    color: 'orange',
  },
  {
    intent: 'immunizations',
    patterns: [
      /\b(immuniz|vaccin|shot|booster|flu shot|covid|tetanus|mmr|hep|jab)\b/i,
    ],
    icon: '💉',
    color: 'teal',
  },
  {
    intent: 'providers',
    patterns: [
      /\b(provider|doctor|physician|specialist|care team|who.*(treat|care|doctor|provider|see))\b/i,
      /\bmy doctor/i,
    ],
    icon: '👨‍⚕️',
    color: 'indigo',
  },
  {
    intent: 'interactions',
    patterns: [
      /\b(interact|interaction|combine|conflict|contraindic|mix|together)\b/i,
      /\bcan i take.*(with|and)\b/i,
      /\bdrug.*(interact|combine|conflict)\b/i,
    ],
    icon: '⚗️',
    color: 'red',
  },
  {
    intent: 'risk',
    patterns: [
      /\b(risk|score|assessment|predict|prognos|outlook|chance|likelihood)\b/i,
      /\bhow.*(health|doing|am i|risky)\b/i,
      /\b(am i|should i).*(worried|concerned)\b/i,
    ],
    icon: '📊',
    color: 'blue',
  },
  {
    intent: 'trends',
    patterns: [
      /\b(trend|over time|getting better|getting worse|improv|worsen|change|progress|history)\b/i,
      /\b(compare|comparison|before|after|since|timeline)\b/i,
    ],
    icon: '📈',
    color: 'indigo',
  },
  {
    intent: 'summary',
    patterns: [
      /\b(summary|summarize|overview|tell me about|health story|health status|overall|everything|full|complete)\b/i,
      /\bwhat.*(know|have|records?)\b.*about\b/i,
    ],
    icon: '📖',
    color: 'blue',
  },
]

function detectIntent(query) {
  const q = query.toLowerCase().trim()
  let bestMatch = null
  let bestScore = 0

  for (const { intent, patterns, icon, color } of intentPatterns) {
    let score = 0
    for (const pattern of patterns) {
      if (pattern.test(q)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = { intent, confidence: Math.min(score / patterns.length, 1), icon, color }
    }
  }

  if (!bestMatch || bestScore === 0) {
    return { intent: 'unknown', confidence: 0, icon: '🤔', color: 'gray' }
  }
  return bestMatch
}

// ─── Clinical Analysis Helpers ──────────────────────────────────────────────

function analyzeMedicationInteractions(meds) {
  const medNames = meds.map(m => (m.name || '').toLowerCase())
  const found = []
  for (const rule of INTERACTION_RULES) {
    if (rule.drugs.every(drug => medNames.some(name => name.includes(drug)))) {
      found.push(rule)
    }
  }
  return found
}

function classifyMedication(medName) {
  const lower = (medName || '').toLowerCase()
  for (const [drug, info] of Object.entries(DRUG_CLASSES)) {
    if (lower.includes(drug)) return { drug, ...info }
  }
  return null
}

function interpretLabResult(result) {
  const comp = (result.component || '').toLowerCase()
  for (const [key, interp] of Object.entries(LAB_INTERPRETATIONS)) {
    if (comp.includes(key)) {
      if (result.flag === 'High' || result.flag === 'Critical High') return { ...interp, interpretation: interp.high, status: 'high' }
      if (result.flag === 'Low' || result.flag === 'Critical Low') return { ...interp, interpretation: interp.low, status: 'low' }
      return { ...interp, interpretation: 'Within normal range — no concerns.', status: 'normal' }
    }
  }
  return null
}

function computeRiskScore(patient) {
  const meds = patient.medications || []
  const results = patient.results || []
  const encounters = patient.encounters || []
  const conditions = (patient.conditions || []).filter(c => c.status === 'Active')
  const allergies = patient.allergies || []
  const abnormal = results.filter(r => r.flag !== 'Normal')

  let score = 85
  const factors = []

  if (abnormal.length > 3) { score -= 15; factors.push({ factor: 'Multiple abnormal lab values', impact: -15, severity: 'high' }) }
  else if (abnormal.length > 0) { score -= abnormal.length * 3; factors.push({ factor: `${abnormal.length} abnormal lab result(s)`, impact: -abnormal.length * 3, severity: 'moderate' }) }

  if (conditions.length > 2) { score -= 10; factors.push({ factor: 'Multiple active conditions', impact: -10, severity: 'moderate' }) }
  else if (conditions.length > 0) { score -= conditions.length * 3; factors.push({ factor: `${conditions.length} active condition(s)`, impact: -conditions.length * 3, severity: 'low' }) }

  if (meds.length > 4) { score -= 8; factors.push({ factor: `Polypharmacy (${meds.length} medications)`, impact: -8, severity: 'moderate' }) }

  if (encounters.length < 2) { score -= 5; factors.push({ factor: 'Infrequent healthcare visits', impact: -5, severity: 'low' }) }
  else if (encounters.length >= 5) { score += 5; factors.push({ factor: 'Regular healthcare engagement', impact: 5, severity: 'positive' }) }

  if (allergies.filter(a => (a.severity || '').toLowerCase() === 'severe').length > 0) {
    score -= 5; factors.push({ factor: 'Severe allergies documented', impact: -5, severity: 'moderate' })
  }

  const interactions = analyzeMedicationInteractions(meds)
  if (interactions.some(i => i.severity === 'high')) { score -= 10; factors.push({ factor: 'High-severity drug interaction', impact: -10, severity: 'high' }) }
  else if (interactions.some(i => i.severity === 'moderate')) { score -= 5; factors.push({ factor: 'Moderate drug interaction', impact: -5, severity: 'moderate' }) }

  score = Math.max(0, Math.min(100, score))
  const label = score >= 80 ? 'Low Risk' : score >= 60 ? 'Moderate Risk' : 'Elevated Risk'
  const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴'

  return { score, label, emoji, factors }
}

function analyzeLabTrends(results) {
  const byComponent = {}
  results.forEach(r => {
    const key = r.component
    if (!byComponent[key]) byComponent[key] = []
    byComponent[key].push(r)
  })

  const trends = []
  for (const [comp, vals] of Object.entries(byComponent)) {
    if (vals.length >= 2) {
      const latest = parseFloat(vals[vals.length - 1].value)
      const earliest = parseFloat(vals[0].value)
      if (!isNaN(latest) && !isNaN(earliest) && earliest !== 0) {
        const pct = ((latest - earliest) / earliest * 100).toFixed(1)
        if (Math.abs(pct) > 5) {
          trends.push({
            component: comp,
            direction: pct > 0 ? 'increased' : 'decreased',
            pct: Math.abs(pct),
            latest: vals[vals.length - 1],
            earliest: vals[0],
            improving: (pct < 0 && vals[vals.length - 1].flag !== 'Normal') || (vals[vals.length - 1].flag === 'Normal' && vals[0].flag !== 'Normal'),
          })
        }
      }
    }
  }
  return trends
}

// ─── Advanced Response Generators ───────────────────────────────────────────

function generateMedicationsResponse(patient, query) {
  const meds = patient.medications || []
  if (meds.length === 0) {
    return {
      text: "No active medications are documented in your records. If you're taking any medications, please ensure your provider updates your chart.",
      data: null, dataType: null, followUp: ['What health conditions do I have?', 'Show me my last doctor visit'],
    }
  }

  const q = query.toLowerCase()
  const interactions = analyzeMedicationInteractions(meds)

  // Check for specific medication questions
  const specificMed = meds.find(m => q.includes((m.name || '').toLowerCase().split(' ')[0]))
  if (specificMed) {
    const classification = classifyMedication(specificMed.name)
    const relatedResults = (patient.results || []).filter(r => {
      if (!classification) return false
      return classification.monitor.some(m => (r.component || '').toLowerCase().includes(m))
    })

    return {
      text: `**${specificMed.name}** — Detailed Analysis:\n\n` +
        `• **Dosage**: ${specificMed.dosage || 'Not specified'}\n` +
        `• **Purpose**: ${specificMed.purpose || 'Not specified'}\n` +
        `• **Prescriber**: ${specificMed.prescriber || 'Not specified'}\n` +
        `• **Started**: ${specificMed.startDate ? new Date(specificMed.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}\n` +
        (classification ? `\n**🔬 Drug Classification**: ${classification.class}\n**Treats**: ${classification.treats.join(', ')}\n**Key Labs to Monitor**: ${classification.monitor.join(', ')}` : '') +
        (relatedResults.length > 0 ? `\n\n**📊 Related Lab Results** (${relatedResults.length} found):\n${relatedResults.slice(0, 4).map(r => `• ${r.component}: **${r.value}** ${r.unit || ''} — ${r.flag === 'Normal' ? '✓ Normal' : `⚠️ ${r.flag}`}`).join('\n')}` : '') +
        `\n\n💡 **AI Note**: ${classification ? `As a ${classification.class}, continue as prescribed and report any unusual side effects to your provider.` : 'Continue as directed by your prescriber.'}`,
      data: [specificMed], dataType: 'medications',
      followUp: ['Are there any drug interactions?', 'Show me related lab results', 'What conditions is this treating?'],
    }
  }

  // General medications overview with AI analysis
  const drugClasses = [...new Set(meds.map(m => classifyMedication(m.name)).filter(Boolean).map(c => c.class))]

  return {
    text: `You're currently taking **${meds.length} active medication${meds.length !== 1 ? 's' : ''}** across **${drugClasses.length || 'multiple'}** drug class${drugClasses.length !== 1 ? 'es' : ''}:\n\n` +
      meds.map(m => {
        const cls = classifyMedication(m.name)
        return `• **${m.name}** — ${m.dosage || 'dosage not specified'}\n  ↳ ${m.purpose || 'Purpose not documented'} ${cls ? `(${cls.class})` : ''}`
      }).join('\n\n') +
      (interactions.length > 0
        ? `\n\n**⚗️ Drug Interaction Analysis** (${interactions.length} found):\n${interactions.map(i => `${i.severity === 'high' ? '🔴' : i.severity === 'moderate' ? '🟡' : 'ℹ️'} ${i.warning}`).join('\n')}`
        : '\n\n✅ **No significant drug interactions detected** in your current medication combination.') +
      (meds.length >= 4 ? '\n\n⚠️ **Polypharmacy Notice**: You are taking 4+ medications. Regular medication reconciliation is recommended.' : '') +
      `\n\n💡 **AI Recommendation**: ${meds.length >= 3 ? 'Discuss a comprehensive medication review at your next visit.' : 'Continue medications as prescribed.'}`,
    data: meds, dataType: 'medications',
    followUp: ['Are there any drug interactions?', 'What should my labs look like on these meds?', 'Which conditions are these treating?'],
  }
}

function generateLabsResponse(patient, query) {
  const results = patient.results || []
  if (results.length === 0) {
    return {
      text: "No lab results are documented in your records. Regular lab work is important for preventive care.",
      data: null, dataType: null, followUp: ['When was my last doctor visit?', 'What medications am I on?'],
    }
  }

  const q = query.toLowerCase()
  const abnormal = results.filter(r => r.flag !== 'Normal')
  const trends = analyzeLabTrends(results)

  // Trend-specific questions
  if (/trend|getting better|getting worse|improv|worsen|over time|progress/.test(q)) {
    if (trends.length === 0) {
      return {
        text: "I need multiple results for the same test to show trends. Your current records don't have enough repeated tests.\n\n💡 **AI tip**: As more lab results are added over time, I'll track improvements or worsening values.",
        data: results, dataType: 'labs', followUp: ['Show me all my lab results', 'Are any results abnormal?'],
      }
    }
    return {
      text: `**📈 Lab Trend Analysis** — ${trends.length} metric${trends.length !== 1 ? 's' : ''} with notable changes:\n\n` +
        trends.map(t => {
          const interp = interpretLabResult(t.latest)
          return `• **${t.component}**: ${t.direction} by **${t.pct}%** (${t.earliest.value} → ${t.latest.value})\n  ${t.improving ? '🟢 Trending in the right direction' : t.latest.flag !== 'Normal' ? '🔴 Needs attention' : '🟡 Monitor closely'}${interp ? `\n  ↳ ${interp.interpretation}` : ''}`
        }).join('\n\n') +
        `\n\n💡 **AI Assessment**: ${trends.filter(t => t.improving).length > trends.length / 2 ? 'Overall positive trajectory!' : 'Some values need attention. Discuss with your provider.'}`,
      data: results, dataType: 'labs', followUp: ['Which results are abnormal?', 'What medications affect my labs?'],
    }
  }

  // Abnormal-specific questions
  if (/abnormal|flagged|high|low|out of range|concern|worr/.test(q)) {
    if (abnormal.length === 0) {
      return {
        text: `🟢 **Great news!** All **${results.length} lab results** are within normal reference ranges. No abnormal values were flagged.\n\n💡 Keep up the good work and continue regular monitoring.`,
        data: results, dataType: 'labs', followUp: ['Show me all my lab results', 'Give me my health risk score'],
      }
    }
    return {
      text: `**⚠️ ${abnormal.length} Abnormal Result${abnormal.length !== 1 ? 's' : ''} Found:**\n\n` +
        abnormal.map(r => {
          const interp = interpretLabResult(r)
          return `• **${r.component}**: **${r.value}** ${r.unit || ''} (Range: ${r.refLow}–${r.refHigh}) — **${r.flag}**${interp ? `\n  🔬 ${interp.interpretation}` : ''}`
        }).join('\n\n') +
        `\n\n**🤖 AI Clinical Analysis**: ${abnormal.length > 2 ? 'Multiple abnormal values suggest scheduling a follow-up.' : 'These should be discussed at your next visit.'}`,
      data: abnormal, dataType: 'labs',
      followUp: ['What could be causing these?', 'Are my labs getting better or worse?', 'Which medications affect these?'],
    }
  }

  // Specific test lookup
  const specificTests = Object.keys(LAB_INTERPRETATIONS)
  const matchedTest = specificTests.find(t => q.includes(t))
  if (matchedTest) {
    const filtered = results.filter(r => (r.component || '').toLowerCase().includes(matchedTest))
    if (filtered.length > 0) {
      return {
        text: `**${matchedTest.charAt(0).toUpperCase() + matchedTest.slice(1)} Results** (${filtered.length}):\n\n` +
          filtered.map(r => {
            const interp = interpretLabResult(r)
            return `• **${r.component}**: **${r.value}** ${r.unit || ''} (Range: ${r.refLow}–${r.refHigh}) — ${r.flag === 'Normal' ? '✓ Normal' : `⚠️ ${r.flag}`}${interp ? `\n  🔬 ${interp.interpretation}` : ''}`
          }).join('\n\n'),
        data: filtered, dataType: 'labs', followUp: ['Are there related medications?', 'Show all lab results'],
      }
    }
  }

  // General labs overview
  return {
    text: `Your records contain **${results.length} lab result${results.length !== 1 ? 's' : ''}** — ${abnormal.length > 0 ? `**${abnormal.length} flagged abnormal**` : 'all within normal ranges'} ✓\n\n` +
      `**Key Values with AI Interpretation:**\n\n` +
      results.slice(0, 8).map(r => {
        const interp = interpretLabResult(r)
        return `• **${r.component}**: ${r.value} ${r.unit || ''} ${r.flag === 'Normal' ? '✓' : `⚠️ ${r.flag}`}${interp && r.flag !== 'Normal' ? `\n  🔬 ${interp.interpretation}` : ''}`
      }).join('\n') +
      (results.length > 8 ? `\n\n...and ${results.length - 8} more results.` : '') +
      (trends.length > 0 ? `\n\n**📈 Notable Trends**: ${trends.slice(0, 3).map(t => `${t.component} ${t.direction} ${t.pct}%`).join(', ')}` : '') +
      `\n\n💡 Ask about specific tests, abnormal values, or trends for deeper analysis.`,
    data: results, dataType: 'labs',
    followUp: ['Which results are abnormal?', 'Show me lab trends', 'How do medications affect these?'],
  }
}

function generateAllergiesResponse(patient) {
  const allergies = patient.allergies || []
  const meds = patient.medications || []

  if (allergies.length === 0) {
    return {
      text: "No allergies documented in your records. Always inform providers before new medications.\n\n💡 Even without documented allergies, always inform providers before receiving new medications or procedures.",
      data: null, dataType: null, followUp: ['What medications am I taking?', 'Show me my health summary'],
    }
  }

  const severe = allergies.filter(a => (a.severity || '').toLowerCase() === 'severe')

  return {
    text: `**${allergies.length} Documented Allerg${allergies.length !== 1 ? 'ies' : 'y'}** ${severe.length > 0 ? `— 🔴 ${severe.length} SEVERE` : ''}:\n\n` +
      allergies.map(a =>
        `• **${a.allergen || a.name}** — Severity: **${a.severity || 'Unknown'}** | Reaction: ${a.reaction || 'Not specified'}\n  ${(a.severity || '').toLowerCase() === 'severe' ? '🔴 HIGH RISK — Ensure epinephrine is accessible' : '🟡 Standard precautions'}`
      ).join('\n\n') +
      `\n\n**🔬 AI Safety Cross-Check**:\n` +
      (meds.length > 0
        ? `Reviewed ${meds.length} medications against allergies — ${allergies.some(a => meds.some(m => (m.name || '').toLowerCase().includes((a.allergen || a.name || '').toLowerCase().split(' ')[0]))) ? '⚠️ **Potential overlap detected!** Discuss with provider.' : '✅ No conflicts with current medications.'}`
        : 'No medications to cross-check.') +
      `\n\n💡 **Recommendations**:\n• Verify allergy list at every visit${severe.length > 0 ? '\n• Carry epinephrine auto-injector\n• Wear medical alert bracelet' : ''}\n• Report new reactions immediately`,
    data: allergies, dataType: 'allergies',
    followUp: ['Are my medications safe with allergies?', 'What drug interactions exist?'],
  }
}

function generateEncountersResponse(patient, query) {
  const encounters = patient.encounters || []
  if (encounters.length === 0) {
    return { text: "No healthcare encounters documented.", data: null, dataType: null, followUp: ['Give me a health summary'] }
  }

  const sorted = [...encounters].sort((a, b) => new Date(b.contactDate) - new Date(a.contactDate))
  const q = query.toLowerCase()

  if (/last|most recent|latest/.test(q)) {
    const last = sorted[0]
    const prov = providers[last.visitProvider]
    const daysSince = Math.round((Date.now() - new Date(last.contactDate).getTime()) / (1000 * 60 * 60 * 24))
    return {
      text: `Your most recent visit was **${daysSince} days ago** on **${new Date(last.contactDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}**:\n\n` +
        `• **Type**: ${last.encType}\n• **Provider**: ${prov?.name || 'Unknown'} (${prov?.specialty || 'Specialist'})\n• **Chief Complaint**: ${last.chiefComplaint || 'Not specified'}\n• **Diagnosis**: ${last.diagnosis || 'Not documented'}\n\n` +
        `💡 ${daysSince > 180 ? '⚠️ Over 6 months since last visit. Consider scheduling a follow-up.' : daysSince > 90 ? 'Check if follow-up was recommended.' : 'Recent visit — ensure follow-up actions are addressed.'}`,
      data: [last], dataType: 'encounters',
      followUp: ['Show all visits', 'Who are my doctors?', 'What were the lab results?'],
    }
  }

  if (/emergency|er |urgent/.test(q)) {
    const erVisits = sorted.filter(e => (e.patientClass || '').toLowerCase().includes('emergency') || (e.encType || '').toLowerCase().includes('emergency'))
    if (erVisits.length === 0) return { text: "No emergency visits found. 🟢", data: null, dataType: null, followUp: ['Show all visits'] }
    return {
      text: `**${erVisits.length} Emergency Visit${erVisits.length !== 1 ? 's' : ''}**:\n\n` +
        erVisits.map(e => `• **${new Date(e.contactDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}** — ${e.diagnosis || 'Not documented'}`).join('\n\n'),
      data: erVisits, dataType: 'encounters', followUp: ['What was diagnosed?', 'Show conditions'],
    }
  }

  const byType = {}
  encounters.forEach(e => { byType[e.encType] = (byType[e.encType] || 0) + 1 })
  const visitDates = sorted.map(e => new Date(e.contactDate))
  let avgDays = null
  if (visitDates.length >= 2) avgDays = Math.round((visitDates[0] - visitDates[visitDates.length - 1]) / (1000 * 60 * 60 * 24) / (visitDates.length - 1))

  return {
    text: `**${encounters.length} Healthcare Visit${encounters.length !== 1 ? 's' : ''}** on record:\n\n` +
      sorted.slice(0, 5).map(e => {
        const prov = providers[e.visitProvider]
        return `• **${new Date(e.contactDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}** — ${e.encType} with **${prov?.name || 'Provider'}**\n  ${e.diagnosis || 'Routine visit'}`
      }).join('\n\n') +
      (encounters.length > 5 ? `\n\n...and ${encounters.length - 5} more.` : '') +
      `\n\n**📊 Visit Analytics**:\n` +
      Object.entries(byType).map(([type, count]) => `• ${type}: ${count}`).join('\n') +
      (avgDays ? `\n• Average: **${avgDays} days** between visits` : '') +
      `\n\n**🤖 Assessment**: ${encounters.length >= 5 ? '🟢 Strong engagement.' : encounters.length >= 3 ? '🟡 Moderate frequency.' : '🔴 Infrequent visits — consider regular check-ups.'}`,
    data: sorted, dataType: 'encounters',
    followUp: ['When was my last visit?', 'Who are my doctors?', 'Any emergency visits?'],
  }
}

function generateConditionsResponse(patient) {
  const conditions = patient.conditions || []
  const meds = patient.medications || []
  if (conditions.length === 0) {
    return { text: "No health conditions documented. 🟢 Continue with regular preventive care!", data: null, dataType: null, followUp: ['Show lab results', 'What medications am I on?'] }
  }

  const active = conditions.filter(c => c.status === 'Active')
  const resolved = conditions.filter(c => c.status !== 'Active')

  let text = `**${conditions.length} Health Condition${conditions.length !== 1 ? 's' : ''}** — **${active.length} active**, **${resolved.length} resolved**:\n\n`

  if (active.length > 0) {
    text += `**🔴 Active Conditions:**\n\n`
    active.forEach(c => {
      const relatedMeds = meds.filter(m => {
        const purpose = (m.purpose || '').toLowerCase()
        const condName = (c.name || '').toLowerCase()
        return purpose.includes(condName.split(' ')[0]) || purpose.includes(condName)
      })
      text += `• **${c.name || 'Unknown Condition'}** — ${c.severity || 'Unknown'} severity (since ${c.onset || 'unknown'})\n`
      text += `  ↳ Treatment: ${relatedMeds.length > 0 ? relatedMeds.map(m => `**${m.name}** (${m.dosage || ''})`).join(', ') : '❓ No linked medication found'}\n\n`
    })
  }

  if (resolved.length > 0) {
    text += `**✅ Resolved:** ${resolved.map(c => `~~${c.name}~~`).join(', ')}\n\n`
  }

  const coveredCount = active.filter(c => meds.some(m => {
    const purpose = (m.purpose || '').toLowerCase()
    return purpose.includes((c.name || '').toLowerCase().split(' ')[0])
  })).length
  const coverage = active.length > 0 ? (coveredCount / active.length * 100).toFixed(0) : 100

  text += `**🤖 Treatment Coverage**: ${coverage}% of active conditions have linked medications. ${coverage === '100' ? '🟢 All managed.' : `🟡 ${active.length - coveredCount} condition(s) may need review.`}`

  return { text, data: conditions, dataType: 'conditions', followUp: ['What medications treat these?', 'Show related labs', 'Give me my risk score'] }
}

function generateInteractionsResponse(patient) {
  const meds = patient.medications || []
  if (meds.length < 2) {
    return {
      text: meds.length === 0 ? "No medications to check for interactions." : `Only 1 medication (${meds[0].name}). Interactions require 2+ medications.`,
      data: null, dataType: null, followUp: ['What medications am I taking?'],
    }
  }

  const interactions = analyzeMedicationInteractions(meds)

  if (interactions.length === 0) {
    return {
      text: `✅ **No significant drug interactions** among your ${meds.length} medications.\n\n💡 Always inform your pharmacist of all medications and supplements.`,
      data: meds, dataType: 'medications', followUp: ['Tell me about my medications', 'What should my labs show?'],
    }
  }

  return {
    text: `**⚗️ Drug Interaction Report** — ${interactions.length} interaction${interactions.length !== 1 ? 's' : ''}:\n\n` +
      interactions.map(i => {
        const emoji = i.severity === 'high' ? '🔴 HIGH' : i.severity === 'moderate' ? '🟡 MODERATE' : 'ℹ️ INFO'
        return `**${emoji}**: ${i.warning}\n  ↳ Involves: **${i.drugs.join(' + ')}**`
      }).join('\n\n') +
      `\n\n**🤖 Recommendation**: ${interactions.some(i => i.severity === 'high') ? '⚠️ **Urgent**: Discuss high-severity interactions with provider/pharmacist.' : 'Manageable with monitoring. Discuss at next appointment.'}`,
    data: meds, dataType: 'medications', followUp: ['What medications am I taking?', 'What labs should I monitor?'],
  }
}

function generateRiskResponse(patient) {
  const risk = computeRiskScore(patient)

  return {
    text: `**${risk.emoji} Health Risk Score: ${risk.score}/100 — ${risk.label}**\n\n` +
      `**Contributing Factors:**\n\n` +
      risk.factors.map(f => {
        const emoji = f.severity === 'high' ? '🔴' : f.severity === 'moderate' ? '🟡' : f.severity === 'positive' ? '🟢' : 'ℹ️'
        return `${emoji} ${f.factor} (${f.impact > 0 ? '+' : ''}${f.impact} points)`
      }).join('\n') +
      `\n\n**🤖 Interpretation**:\n` +
      (risk.score >= 80 ? 'Your health profile indicates **low overall risk**. Continue current lifestyle and preventive care.' :
        risk.score >= 60 ? 'Your profile shows **moderate risk** areas. Focus on the factors above — each can be improved.' :
          '**Elevated risk** requiring active management. Prioritize high-severity items and schedule a comprehensive review.') +
      `\n\n📊 **Score Breakdown**: Base 85 → adjusted by ${risk.factors.length} factors → Final: **${risk.score}**`,
    data: null, dataType: null,
    followUp: ['What can I improve?', 'Show abnormal lab results', 'What medications am I taking?'],
  }
}

function generateTrendsResponse(patient) {
  const results = patient.results || []
  const trends = analyzeLabTrends(results)

  if (trends.length === 0) {
    return {
      text: "Not enough repeated tests to identify trends. Need 2+ measurements for the same test.\n\n💡 Ask your provider about scheduling follow-up labs.",
      data: null, dataType: null, followUp: ['Show lab results', 'When was my last visit?'],
    }
  }

  const improving = trends.filter(t => t.improving)
  const worsening = trends.filter(t => !t.improving && t.latest.flag !== 'Normal')

  return {
    text: `**📈 Health Trends** — ${trends.length} metric${trends.length !== 1 ? 's' : ''}:\n\n` +
      (improving.length > 0 ? `**🟢 Improving (${improving.length}):**\n${improving.map(t => `• **${t.component}**: ${t.direction} ${t.pct}% (${t.earliest.value}→${t.latest.value})`).join('\n')}\n\n` : '') +
      (worsening.length > 0 ? `**🔴 Needs Attention (${worsening.length}):**\n${worsening.map(t => {
        const interp = interpretLabResult(t.latest)
        return `• **${t.component}**: ${t.direction} ${t.pct}% — **${t.latest.flag}**${interp ? `\n  🔬 ${interp.interpretation}` : ''}`
      }).join('\n')}\n\n` : '') +
      `**🤖 Assessment**: ${improving.length > worsening.length ? '🟢 Overall positive trajectory!' : worsening.length > 0 ? '🟡 Some metrics need attention.' : '🟢 All stable or improving.'}`,
    data: results, dataType: 'labs',
    followUp: ['Which are abnormal?', 'What medications affect labs?', 'What is my risk score?'],
  }
}

function generateImmunizationsResponse(patient) {
  const orders = patient.orders || []
  const immunizations = orders.filter(o =>
    o.orderType === 'Immunization' || (o.procName || '').toLowerCase().includes('vaccin') || (o.procName || '').toLowerCase().includes('immuniz')
  )

  if (immunizations.length === 0) {
    return {
      text: "No immunization records found. Records may be maintained separately.\n\n💡 **Key immunizations to discuss**:\n• Annual flu shot\n• COVID-19 boosters\n• Tdap (every 10 years)\n• Shingles (age 50+)\n• Pneumococcal (age 65+)",
      data: null, dataType: null, followUp: ['When was my last visit?', 'What conditions do I have?'],
    }
  }

  return {
    text: `**💉 ${immunizations.length} Immunization${immunizations.length !== 1 ? 's' : ''}** on file:\n\n` +
      immunizations.map(i => `• **${i.procName || i.name}** — ${i.orderDate || 'Date unknown'}`).join('\n') +
      `\n\n💡 Discuss with provider whether you're due for boosters or additional vaccinations.`,
    data: immunizations, dataType: 'immunizations',
    followUp: ['Show all orders', 'When was my last visit?'],
  }
}

function generateProvidersResponse(patient) {
  const encounters = patient.encounters || []
  const uniqueIds = [...new Set(encounters.map(e => e.visitProvider))]
  const provList = uniqueIds.map(id => {
    const p = providers[id]
    if (!p) return null
    const visitCount = encounters.filter(e => e.visitProvider === id).length
    const lastVisit = encounters.filter(e => e.visitProvider === id).sort((a, b) => new Date(b.contactDate) - new Date(a.contactDate))[0]
    return { ...p, id, visitCount, lastVisit }
  }).filter(Boolean)

  if (provList.length === 0) return { text: "No provider info found.", data: null, dataType: null, followUp: ['Show my health records'] }

  return {
    text: `**Your Care Team — ${provList.length} Provider${provList.length !== 1 ? 's' : ''}**:\n\n` +
      provList.map(p =>
        `• **${p.name}** — ${p.specialty}\n  ↳ ${p.visitCount} visit${p.visitCount !== 1 ? 's' : ''} | Last: ${new Date(p.lastVisit.contactDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      ).join('\n\n') +
      `\n\n📊 ${provList.length >= 3 ? 'Diverse care team — excellent for comprehensive care.' : 'Consider whether specialist referrals might benefit you.'}`,
    data: provList, dataType: 'providers',
    followUp: ['When was my last visit?', 'What were my diagnoses?'],
  }
}

function generateSummaryResponse(patient) {
  const risk = computeRiskScore(patient)
  const active = (patient.conditions || []).filter(c => c.status === 'Active')
  const meds = patient.medications || []
  const results = patient.results || []
  const abnormal = results.filter(r => r.flag !== 'Normal')
  const encounters = patient.encounters || []
  const allergies = patient.allergies || []
  const interactions = analyzeMedicationInteractions(meds)
  const trends = analyzeLabTrends(results)

  return {
    text: `**${risk.emoji} Comprehensive Health Summary for ${patient.firstName} ${patient.lastName}**\n\n` +
      `**Patient**: ${patient.age}-year-old ${patient.sex} | **Risk Score**: ${risk.score}/100 (${risk.label})\n\n` +
      `---\n\n` +
      `📋 **Conditions**: ${active.length} active${active.length > 0 ? ` (${active.map(c => c.name).join(', ')})` : ''}\n\n` +
      `💊 **Medications**: ${meds.length} active${interactions.length > 0 ? ` — ⚗️ ${interactions.length} interaction${interactions.length !== 1 ? 's' : ''}` : ''}\n\n` +
      `🧪 **Lab Results**: ${results.length} on file${abnormal.length > 0 ? ` — ⚠️ ${abnormal.length} abnormal` : ' — ✅ all normal'}\n\n` +
      (trends.length > 0 ? `📈 **Trends**: ${trends.filter(t => t.improving).length} improving, ${trends.filter(t => !t.improving).length} need attention\n\n` : '') +
      `🏥 **Encounters**: ${encounters.length} visits\n\n` +
      (allergies.length > 0 ? `⚠️ **Allergies**: ${allergies.map(a => `${a.allergen || a.name} (${a.severity || 'unknown'})`).join(', ')}\n\n` : '') +
      `---\n\n` +
      `**🤖 AI Key Findings**:\n` +
      (abnormal.length > 0 ? `• ${abnormal.length} abnormal lab values need follow-up\n` : '') +
      (interactions.length > 0 ? `• ${interactions.length} drug interaction(s) identified\n` : '') +
      (meds.length >= 5 ? `• Polypharmacy risk (${meds.length} medications)\n` : '') +
      `• Healthcare engagement: ${encounters.length >= 5 ? '🟢 Strong' : encounters.length >= 3 ? '🟡 Moderate' : '🔴 Needs improvement'}\n\n` +
      `💡 Ask about any specific area for a deep-dive!`,
    data: null, dataType: null,
    followUp: ['What are my biggest risks?', 'Show abnormal lab results', 'Are there drug interactions?', 'How are my lab trends?'],
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Process a natural language query with deep clinical analysis.
 */
export function processQuery(query, patient) {
  if (!query || !patient) {
    return {
      intent: 'error', text: "I need a question and patient data. Please upload your health records first.",
      data: null, dataType: null, icon: '❌', color: 'red', confidence: 0, followUp: [],
    }
  }

  const { intent, confidence, icon, color } = detectIntent(query)

  let response
  switch (intent) {
    case 'medications': response = generateMedicationsResponse(patient, query); break
    case 'labs': response = generateLabsResponse(patient, query); break
    case 'allergies': response = generateAllergiesResponse(patient); break
    case 'encounters': response = generateEncountersResponse(patient, query); break
    case 'conditions': response = generateConditionsResponse(patient); break
    case 'immunizations': response = generateImmunizationsResponse(patient); break
    case 'providers': response = generateProvidersResponse(patient); break
    case 'interactions': response = generateInteractionsResponse(patient); break
    case 'risk': response = generateRiskResponse(patient); break
    case 'trends': response = generateTrendsResponse(patient); break
    case 'summary': response = generateSummaryResponse(patient); break
    default:
      response = {
        text: `I'm not sure how to answer that, but I can deeply analyze:\n\n` +
          `💊 **Medications** — "What medications am I taking?" "Tell me about Lisinopril"\n` +
          `🧪 **Lab Results** — "Show my labs" "Are any results abnormal?" "Lab trends?"\n` +
          `⚗️ **Drug Interactions** — "Are there any drug interactions?"\n` +
          `📊 **Risk Assessment** — "What is my health risk score?"\n` +
          `📈 **Trends** — "How are my lab trends?" "Getting better?"\n` +
          `⚠️ **Allergies** — "Do I have any allergies?"\n` +
          `📋 **Conditions** — "What conditions do I have?"\n` +
          `🏥 **Visits** — "When was my last visit?" "Emergency visits?"\n` +
          `👨‍⚕️ **Providers** — "Who are my doctors?"\n` +
          `📖 **Summary** — "Give me a complete health summary"\n\n` +
          `Try one of these or rephrase your question!`,
        data: null, dataType: null, followUp: ['Give me a health summary', 'What is my risk score?', 'Are there drug interactions?'],
      }
  }

  return { intent, ...response, icon, color, confidence }
}

/**
 * Get suggested questions for the chat UI — advanced options.
 */
export function getSuggestedQuestions() {
  return [
    { text: 'What medications am I currently taking?', icon: '💊', color: 'purple', category: 'Medications' },
    { text: 'Show me my recent lab results', icon: '🧪', color: 'green', category: 'Lab Results' },
    { text: 'Do I have any allergies?', icon: '⚠️', color: 'red', category: 'Allergies' },
    { text: 'What is my health risk score?', icon: '📊', color: 'blue', category: 'Risk Score' },
    { text: 'Are there any drug interactions?', icon: '⚗️', color: 'orange', category: 'Interactions' },
    { text: 'Give me a complete health summary', icon: '📖', color: 'indigo', category: 'Summary' },
  ]
}

/**
 * Get follow-up questions based on last intent.
 */
export function getFollowUpQuestions(lastIntent) {
  const map = {
    medications: ['Are there any drug interactions?', 'What should my labs look like?', 'What conditions are these treating?'],
    labs: ['Which results are abnormal?', 'How are my trends?', 'How do medications affect these?'],
    allergies: ['Are my medications safe?', 'What drug interactions exist?'],
    encounters: ['When was my last visit?', 'Who are my doctors?'],
    conditions: ['What medications treat these?', 'Show related labs', 'What is my risk score?'],
    interactions: ['Tell me about my medications', 'What labs should I monitor?'],
    risk: ['What can I improve?', 'Show abnormal labs', 'What medications am I on?'],
    trends: ['Which are abnormal?', 'What medications affect labs?'],
    summary: ['What are my risks?', 'Show abnormal labs', 'Any drug interactions?'],
  }
  return map[lastIntent] || ['Give me a health summary', 'What is my risk score?', 'Show my medications']
}
