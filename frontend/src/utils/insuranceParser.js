/**
 * Insurance Parser - Extract USCDI Health Insurance Data Class from EHI
 *
 * Extracts insurance coverage information from patient EHI exports following
 * the USCDI (United States Core Data for Interoperability) standard.
 *
 * USCDI Health Insurance Data Elements:
 * - Insurance type
 * - Member ID
 * - Group number
 * - Subscriber name
 * - Payer name
 * - Coverage dates
 * - Plan name
 */

/**
 * Extract insurance/coverage information from patient data.
 * Looks for coverage in multiple possible locations in the EHI export.
 *
 * @param {Object} patient - Full patient record
 * @returns {Object} Insurance coverage data
 */
export function extractInsuranceData(patient) {
  if (!patient) return null

  // Try to find coverage data in various locations
  const coverage = patient.coverage ||
                   patient.insurance ||
                   patient.insuranceCoverage ||
                   patient.payer ||
                   extractFromMetadata(patient)

  if (!coverage) return null

  // Normalize to USCDI format
  return {
    insurance_type: coverage.type || coverage.insuranceType || 'Unknown',
    member_id: coverage.memberId || coverage.subscriberId || coverage.id || 'N/A',
    group_number: coverage.groupNumber || coverage.group || 'N/A',
    subscriber_name: coverage.subscriberName || coverage.subscriber || `${patient.firstName} ${patient.lastName}`,
    relationship: coverage.relationship || 'Self',
    payer_name: coverage.payerName || coverage.payer || coverage.insuranceCompany || 'Not specified',
    payer_id: coverage.payerId || coverage.payerIdentifier || null,
    coverage_start: coverage.startDate || coverage.effectiveDate || null,
    coverage_end: coverage.endDate || coverage.terminationDate || null,
    plan_name: coverage.planName || coverage.plan || 'Not specified',
    financial: extractFinancialInfo(coverage),
    status: coverage.status || 'active',
  }
}

/**
 * Try to extract insurance info from patient metadata or custom fields
 */
function extractFromMetadata(patient) {
  // Check if there's any field that might contain insurance info
  const metadata = patient.metadata || patient.extension || patient.custom || {}

  // Look for insurance-like fields
  for (const [key, value] of Object.entries(metadata)) {
    if (key.toLowerCase().includes('insurance') ||
        key.toLowerCase().includes('coverage') ||
        key.toLowerCase().includes('payer')) {
      return value
    }
  }

  return null
}

/**
 * Extract financial information (deductibles, copays, etc.)
 */
function extractFinancialInfo(coverage) {
  const financial = coverage.financial || coverage.costSharing || coverage.benefits || {}

  return {
    deductible_individual: financial.deductibleIndividual || financial.deductible || null,
    deductible_family: financial.deductibleFamily || null,
    oop_max_individual: financial.oopMaxIndividual || financial.outOfPocketMax || null,
    oop_max_family: financial.oopMaxFamily || null,
    coinsurance: financial.coinsurance || null,
    copay_primary: financial.copayPrimary || financial.primaryCareCopay || null,
    copay_specialist: financial.copaySpecialist || financial.specialistCopay || null,
    copay_er: financial.copayER || financial.emergencyCopay || null,
    copay_rx_generic: financial.copayRxGeneric || financial.genericRxCopay || null,
    copay_rx_brand: financial.copayRxBrand || financial.brandRxCopay || null,
  }
}

/**
 * Generate a mock insurance coverage for demo purposes.
 * Used when no coverage data is found in EHI export.
 *
 * @param {Object} patient - Patient record
 * @returns {Object} Mock insurance data
 */
export function generateMockCoverage(patient) {
  const mockPayers = [
    { name: 'Blue Cross Blue Shield PPO', type: 'Commercial PPO', id: '12345' },
    { name: 'Aetna HMO', type: 'Commercial HMO', id: '23456' },
    { name: 'UnitedHealthcare', type: 'Commercial PPO', id: '34567' },
    { name: 'Medicare Part A & B', type: 'Medicare', id: 'CMS' },
    { name: 'Medicaid', type: 'Medicaid', id: 'STATE' },
  ]

  const payer = mockPayers[0] // Default to BCBS for demo

  return {
    insurance_type: payer.type,
    member_id: `${payer.id}${Math.random().toString().slice(2, 11)}`,
    group_number: 'GRP-CEDARS-001',
    subscriber_name: `${patient.firstName} ${patient.lastName}`,
    relationship: 'Self',
    payer_name: payer.name,
    payer_id: payer.id,
    coverage_start: '2025-01-01',
    coverage_end: '2025-12-31',
    plan_name: 'PPO Gold Plan',
    financial: {
      deductible_individual: 1500,
      deductible_family: 3000,
      oop_max_individual: 3000,
      oop_max_family: 6000,
      coinsurance: 20,
      copay_primary: 25,
      copay_specialist: 50,
      copay_er: 250,
      copay_rx_generic: 10,
      copay_rx_brand: 40,
    },
    status: 'active',
    _isMockData: true,
  }
}

/**
 * Calculate deductible progress from claims/encounter data
 *
 * @param {Array} encounters - Patient encounters
 * @param {Object} coverage - Insurance coverage
 * @returns {Object} Deductible progress
 */
export function calculateDeductibleProgress(encounters = [], coverage) {
  if (!coverage?.financial?.deductible_individual) {
    return { met: 0, total: 0, percentage: 0, remaining: 0 }
  }

  const total = coverage.financial.deductible_individual

  // Estimate deductible met based on encounter count and average costs
  // In real implementation, this would parse actual claims data
  const estimatedMet = Math.min(encounters.length * 150, total)
  const percentage = Math.round((estimatedMet / total) * 100)
  const remaining = Math.max(0, total - estimatedMet)

  return {
    met: estimatedMet,
    total,
    percentage,
    remaining,
  }
}

/**
 * Calculate out-of-pocket progress
 *
 * @param {Array} encounters - Patient encounters
 * @param {Object} coverage - Insurance coverage
 * @returns {Object} OOP progress
 */
export function calculateOOPProgress(encounters = [], coverage) {
  if (!coverage?.financial?.oop_max_individual) {
    return { met: 0, total: 0, percentage: 0, remaining: 0 }
  }

  const total = coverage.financial.oop_max_individual
  const deductible = calculateDeductibleProgress(encounters, coverage)

  // Estimate OOP (deductible + coinsurance + copays)
  const estimatedCopays = encounters.length * 35 // Average copay
  const estimatedMet = deductible.met + estimatedCopays
  const percentage = Math.round((estimatedMet / total) * 100)
  const remaining = Math.max(0, total - estimatedMet)

  return {
    met: Math.min(estimatedMet, total),
    total,
    percentage: Math.min(100, percentage),
    remaining,
  }
}

/**
 * Format currency value
 */
export function formatCurrency(amount) {
  if (!amount && amount !== 0) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format coverage dates
 */
export function formatCoverageDates(coverage) {
  if (!coverage) return 'Unknown'

  const start = coverage.coverage_start ? new Date(coverage.coverage_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'
  const end = coverage.coverage_end ? new Date(coverage.coverage_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Present'

  return `${start} - ${end}`
}
