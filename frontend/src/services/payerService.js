/**
 * Payer Service - Prior Authorization, Cost Analysis, Formulary Tools
 *
 * Client-side payer/insurance features for EHIgnite Challenge compliance.
 * All processing happens in the browser - no PHI sent to servers.
 */

import { extractInsuranceData, generateMockCoverage, calculateDeductibleProgress, calculateOOPProgress, formatCurrency } from '../utils/insuranceParser'

/**
 * High-cost medications and procedures that typically require prior authorization
 */
const PRIOR_AUTH_DATABASE = {
  medications: [
    { name: 'Humira', generic: 'Adalimumab', avgCost: 5200, reason: 'Specialty biologic', payer: 'Most insurers' },
    { name: 'Enbrel', generic: 'Etanercept', avgCost: 4800, reason: 'Specialty biologic', payer: 'Most insurers' },
    { name: 'Stelara', generic: 'Ustekinumab', avgCost: 4500, reason: 'Specialty biologic', payer: 'Most insurers' },
    { name: 'Cosentyx', generic: 'Secukinumab', avgCost: 4200, reason: 'Specialty biologic', payer: 'Most insurers' },
    { name: 'Xeljanz', generic: 'Tofacitinib', avgCost: 3800, reason: 'JAK inhibitor', payer: 'Most insurers' },
    { name: 'Dupixent', generic: 'Dupilumab', avgCost: 3500, reason: 'Specialty biologic', payer: 'Most insurers' },
    { name: 'Ozempic', generic: 'Semaglutide', avgCost: 900, reason: 'GLP-1 agonist', payer: 'Most insurers' },
    { name: 'Eliquis', generic: 'Apixaban', avgCost: 550, reason: 'Novel anticoagulant', payer: 'Medicare/Commercial' },
  ],
  procedures: [
    { code: 'MRI', name: 'MRI Brain with Contrast', avgCost: 2800, reason: 'Advanced imaging', payer: 'Most insurers' },
    { code: 'MRI', name: 'MRI Spine', avgCost: 2500, reason: 'Advanced imaging', payer: 'Most insurers' },
    { code: 'PET', name: 'PET Scan', avgCost: 3500, reason: 'Advanced imaging', payer: 'Most insurers' },
    { code: 'Surgery', name: 'Knee Replacement', avgCost: 35000, reason: 'Major surgery', payer: 'Most insurers' },
    { code: 'Surgery', name: 'Hip Replacement', avgCost: 32000, reason: 'Major surgery', payer: 'Most insurers' },
    { code: 'Infusion', name: 'Biologic Infusion Therapy', avgCost: 5000, reason: 'Specialty drug', payer: 'Most insurers' },
  ],
}

/**
 * Detect items that may require prior authorization
 *
 * @param {Object} patient - Full patient record
 * @returns {Array} Items requiring prior auth
 */
export function detectPriorAuthItems(patient) {
  const items = []

  // Check medications
  const medications = patient.medications || []
  medications.forEach(med => {
    const medName = (med.name || '').toLowerCase()

    PRIOR_AUTH_DATABASE.medications.forEach(pa => {
      if (medName.includes(pa.name.toLowerCase()) || medName.includes((pa.generic || '').toLowerCase())) {
        items.push({
          type: 'medication',
          name: med.name,
          genericName: pa.generic,
          avgCost: pa.avgCost,
          frequency: 'monthly',
          reason: pa.reason,
          payer: pa.payer,
          source: med,
          status: 'pending_check',
        })
      }
    })
  })

  // Check orders/procedures
  const orders = patient.orders || []
  orders.forEach(order => {
    const orderName = (order.description || order.orderType || order.name || '').toLowerCase()

    PRIOR_AUTH_DATABASE.procedures.forEach(pa => {
      if (orderName.includes(pa.code.toLowerCase()) || orderName.includes(pa.name.toLowerCase())) {
        items.push({
          type: 'procedure',
          name: order.description || order.name,
          avgCost: pa.avgCost,
          frequency: 'one-time',
          reason: pa.reason,
          payer: pa.payer,
          source: order,
          status: 'pending_check',
        })
      }
    })
  })

  return items
}

/**
 * Generate prior authorization data package in FHIR format
 *
 * @param {Object} patient - Patient record
 * @param {Object} item - PA item
 * @returns {Object} FHIR Bundle for prior auth
 */
export function generatePriorAuthBundle(patient, item) {
  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: [],
  }

  // Patient resource
  bundle.entry.push({
    resource: {
      resourceType: 'Patient',
      id: patient.id || 'patient-1',
      name: [{
        family: patient.lastName,
        given: [patient.firstName],
      }],
      birthDate: patient.dateOfBirth,
      gender: patient.sex?.toLowerCase(),
      identifier: [{
        system: 'urn:oid:2.16.840.1.113883.4.1',
        value: patient.mrn || 'unknown',
      }],
    },
  })

  // Coverage resource (if available)
  const coverage = extractInsuranceData(patient) || generateMockCoverage(patient)
  if (coverage) {
    bundle.entry.push({
      resource: {
        resourceType: 'Coverage',
        status: 'active',
        subscriber: {
          reference: `Patient/${patient.id || 'patient-1'}`,
        },
        subscriberId: coverage.member_id,
        beneficiary: {
          reference: `Patient/${patient.id || 'patient-1'}`,
        },
        payor: [{
          display: coverage.payer_name,
        }],
        class: [{
          type: {
            coding: [{
              code: 'group',
              display: 'Group',
            }],
          },
          value: coverage.group_number,
        }],
      },
    })
  }

  // Medication or Procedure resource
  if (item.type === 'medication') {
    bundle.entry.push({
      resource: {
        resourceType: 'MedicationRequest',
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          text: item.name,
        },
        subject: {
          reference: `Patient/${patient.id || 'patient-1'}`,
        },
        dosageInstruction: [{
          text: item.source.dosage || item.source.dose || 'As prescribed',
        }],
        reasonCode: [{
          text: item.reason,
        }],
      },
    })
  } else if (item.type === 'procedure') {
    bundle.entry.push({
      resource: {
        resourceType: 'ServiceRequest',
        status: 'active',
        intent: 'order',
        code: {
          text: item.name,
        },
        subject: {
          reference: `Patient/${patient.id || 'patient-1'}`,
        },
        reasonCode: [{
          text: item.reason,
        }],
      },
    })
  }

  // Add relevant conditions
  const conditions = patient.conditions || []
  conditions.slice(0, 3).forEach((condition, idx) => {
    bundle.entry.push({
      resource: {
        resourceType: 'Condition',
        id: `condition-${idx}`,
        clinicalStatus: {
          coding: [{
            code: condition.status === 'Active' ? 'active' : 'resolved',
          }],
        },
        code: {
          text: condition.name,
        },
        subject: {
          reference: `Patient/${patient.id || 'patient-1'}`,
        },
        onsetDateTime: condition.onset,
      },
    })
  })

  // Add recent lab results
  const labs = patient.results || []
  labs.slice(0, 5).forEach((lab, idx) => {
    bundle.entry.push({
      resource: {
        resourceType: 'Observation',
        id: `lab-${idx}`,
        status: 'final',
        code: {
          text: lab.name || lab.component,
        },
        subject: {
          reference: `Patient/${patient.id || 'patient-1'}`,
        },
        valueQuantity: {
          value: parseFloat(lab.value) || 0,
          unit: lab.unit,
        },
        referenceRange: [{
          text: lab.referenceRange || `${lab.refLow}-${lab.refHigh}`,
        }],
      },
    })
  })

  return bundle
}

/**
 * Analyze medical costs from patient data
 *
 * @param {Object} patient - Patient record
 * @returns {Object} Cost analysis
 */
export function analyzeCosts(patient) {
  const medications = patient.medications || []
  const encounters = patient.encounters || []
  const orders = patient.orders || []
  const results = patient.results || []

  // Estimate medication costs (rough approximation)
  let medCosts = 0
  medications.forEach(med => {
    // Try to find in PA database
    const paItem = PRIOR_AUTH_DATABASE.medications.find(pa =>
      med.name.toLowerCase().includes(pa.name.toLowerCase())
    )
    if (paItem) {
      medCosts += paItem.avgCost
    } else {
      // Generic estimate based on tier (if available)
      medCosts += 50 // Default $50/month for unknown meds
    }
  })

  // Estimate encounter costs
  const encounterCosts = encounters.length * 200 // $200 avg per visit

  // Estimate lab costs
  const labCosts = results.length * 30 // $30 avg per lab

  // Estimate procedure costs
  let procedureCosts = 0
  orders.forEach(order => {
    const paItem = PRIOR_AUTH_DATABASE.procedures.find(pa =>
      (order.description || '').toLowerCase().includes(pa.code.toLowerCase())
    )
    if (paItem) {
      procedureCosts += paItem.avgCost
    } else {
      procedureCosts += 500 // Default estimate
    }
  })

  const totalCosts = medCosts + encounterCosts + labCosts + procedureCosts

  return {
    total: totalCosts,
    breakdown: {
      medications: medCosts,
      encounters: encounterCosts,
      labs: labCosts,
      procedures: procedureCosts,
    },
    byCategory: [
      { category: 'Medications', amount: medCosts, percentage: (medCosts / totalCosts) * 100 },
      { category: 'Visits', amount: encounterCosts, percentage: (encounterCosts / totalCosts) * 100 },
      { category: 'Labs', amount: labCosts, percentage: (labCosts / totalCosts) * 100 },
      { category: 'Procedures', amount: procedureCosts, percentage: (procedureCosts / totalCosts) * 100 },
    ].filter(c => c.amount > 0),
  }
}

/**
 * Identify medication cost savings opportunities
 *
 * @param {Object} patient - Patient record
 * @returns {Array} Savings opportunities
 */
export function findMedicationSavings(patient) {
  const medications = patient.medications || []
  const savings = []

  // Generic alternatives
  const brandToGeneric = {
    'Lipitor': { generic: 'Atorvastatin', brandCost: 250, genericCost: 10, savings: 240 },
    'Zocor': { generic: 'Simvastatin', brandCost: 200, genericCost: 10, savings: 190 },
    'Plavix': { generic: 'Clopidogrel', brandCost: 200, genericCost: 15, savings: 185 },
    'Nexium': { generic: 'Esomeprazole', brandCost: 240, genericCost: 20, savings: 220 },
    'Crestor': { generic: 'Rosuvastatin', brandCost: 260, genericCost: 15, savings: 245 },
  }

  medications.forEach(med => {
    const medName = med.name || ''

    // Check for brand-to-generic opportunity
    Object.entries(brandToGeneric).forEach(([brand, info]) => {
      if (medName.includes(brand)) {
        savings.push({
          type: 'generic_alternative',
          current: medName,
          recommendation: info.generic,
          currentCost: info.brandCost,
          newCost: info.genericCost,
          monthlySavings: info.savings,
          annualSavings: info.savings * 12,
          tier: 'Tier 1 (Generic)',
          message: `Switch to ${info.generic} to save ${formatCurrency(info.savings)}/month`,
        })
      }
    })
  })

  return savings
}

/**
 * Get coverage summary for dashboard display
 *
 * @param {Object} patient - Patient record
 * @returns {Object} Coverage summary
 */
export function getCoverageSummary(patient) {
  const coverage = extractInsuranceData(patient)

  if (!coverage) {
    // Generate mock coverage for demo
    return {
      hasCoverage: false,
      shouldUseMock: true,
      mockCoverage: generateMockCoverage(patient),
    }
  }

  const encounters = patient.encounters || []
  const deductible = calculateDeductibleProgress(encounters, coverage)
  const oop = calculateOOPProgress(encounters, coverage)

  return {
    hasCoverage: true,
    coverage,
    deductible,
    oop,
    shouldUseMock: false,
  }
}

/**
 * Export prior auth package as downloadable file
 *
 * @param {Object} bundle - FHIR bundle
 * @param {string} fileName - File name
 */
export function downloadPriorAuthPackage(bundle, fileName = 'prior-auth-package.json') {
  const json = JSON.stringify(bundle, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Generate PDF summary for benefits verification (placeholder)
 *
 * @param {Object} patient - Patient record
 * @param {Object} coverage - Insurance coverage
 * @returns {string} Text summary for PDF generation
 */
export function generateBenefitsVerificationSummary(patient, coverage) {
  return `
BENEFITS VERIFICATION REQUEST

Patient Information:
- Name: ${patient.firstName} ${patient.lastName}
- Date of Birth: ${patient.dateOfBirth || 'Unknown'}
- MRN: ${patient.mrn || 'Unknown'}

Insurance Information:
- Payer: ${coverage.payer_name}
- Member ID: ${coverage.member_id}
- Group Number: ${coverage.group_number}
- Plan: ${coverage.plan_name}
- Coverage Period: ${coverage.coverage_start} to ${coverage.coverage_end}

Financial Information:
- Individual Deductible: ${formatCurrency(coverage.financial.deductible_individual)}
- Out-of-Pocket Maximum: ${formatCurrency(coverage.financial.oop_max_individual)}
- Primary Care Copay: ${formatCurrency(coverage.financial.copay_primary)}
- Specialist Copay: ${formatCurrency(coverage.financial.copay_specialist)}

Requested Services:
[To be filled based on specific request]

Generated: ${new Date().toLocaleString()}
  `.trim()
}
