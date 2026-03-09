// Sample data derived from EHIgnite Challenge sample_data/epic_tsv/
// This provides a realistic demo experience without requiring file upload

export const samplePatients = [
  {
    patId: 'Z1234567',
    name: 'Smith, John A',
    city: 'Los Angeles',
    state: 'California',
    zip: '90210',
    birthDate: '1975-03-15',
    sex: 'Male',
    ethnicGroup: 'Not Hispanic or Latino',
    language: 'English',
    maritalStatus: 'Married',
    allergies: [
      { allergen: 'Penicillin', severity: 'moderate', reaction: 'rash' },
      { allergen: 'Sulfa drugs', severity: 'mild', reaction: 'nausea' },
    ],
  },
  {
    patId: 'Z2345678',
    name: 'Johnson, Sarah M',
    city: 'New York',
    state: 'New York',
    zip: '10001',
    birthDate: '1985-01-10',
    sex: 'Female',
    ethnicGroup: 'Hispanic or Latino',
    language: 'Spanish',
    maritalStatus: 'Single',
    allergies: [
      { allergen: 'Aspirin', severity: 'severe', reaction: 'anaphylaxis' },
    ],
  },
  {
    patId: 'Z3456789',
    name: 'Williams, Robert J',
    city: 'Chicago',
    state: 'Illinois',
    zip: '60601',
    birthDate: '1968-11-30',
    sex: 'Male',
    ethnicGroup: 'Not Hispanic or Latino',
    language: 'English',
    maritalStatus: 'Divorced',
  },
  {
    patId: 'Z4567890',
    name: 'Brown, Emily R',
    city: 'Houston',
    state: 'Texas',
    zip: '77001',
    birthDate: '1990-05-18',
    sex: 'Female',
    ethnicGroup: 'Not Hispanic or Latino',
    language: 'English',
    maritalStatus: 'Married',
  },
  {
    patId: 'Z5678901',
    name: 'Jones, Michael D',
    city: 'Phoenix',
    state: 'Arizona',
    zip: '85001',
    birthDate: '1979-09-25',
    sex: 'Male',
    ethnicGroup: 'Hispanic or Latino',
    language: 'English',
    maritalStatus: 'Single',
  },
  {
    patId: 'Z6789012',
    name: 'Garcia, Maria L',
    city: 'San Antonio',
    state: 'Texas',
    zip: '78201',
    birthDate: '1985-12-08',
    sex: 'Female',
    ethnicGroup: 'Hispanic or Latino',
    language: 'Spanish',
    maritalStatus: 'Married',
  },
]

export const sampleEncounters = [
  {
    csnId: '100001', patId: 'Z1234567', contactDate: '2026-02-15',
    encType: 'Hospital Encounter', visitProvider: 'E12345',
    status: 'Completed', patientClass: 'Inpatient',
    chiefComplaint: 'Chest pain', diagnosis: 'Acute Myocardial Infarction',
    checkinTime: '2026-02-15 08:00:00', checkoutTime: '2026-02-15 17:30:00',
  },
  {
    csnId: '100002', patId: 'Z2345678', contactDate: '2026-02-16',
    encType: 'Office Visit', visitProvider: 'E23456',
    status: 'Completed', patientClass: 'Outpatient',
    chiefComplaint: 'Cough and fever', diagnosis: 'Upper Respiratory Infection',
    checkinTime: '2026-02-16 10:00:00', checkoutTime: '2026-02-16 10:45:00',
  },
  {
    csnId: '100003', patId: 'Z3456789', contactDate: '2026-02-17',
    encType: 'Office Visit', visitProvider: 'E34567',
    status: 'Completed', patientClass: 'Outpatient',
    chiefComplaint: 'Annual physical', diagnosis: 'Health Maintenance',
    checkinTime: '2026-02-17 08:45:00', checkoutTime: '2026-02-17 09:30:00',
  },
  {
    csnId: '100004', patId: 'Z4567890', contactDate: '2026-02-18',
    encType: 'Office Visit', visitProvider: 'E45678',
    status: 'Completed', patientClass: 'Outpatient',
    chiefComplaint: 'Diabetes follow-up', diagnosis: 'Type 2 Diabetes Mellitus',
    checkinTime: '2026-02-18 11:00:00', checkoutTime: '2026-02-18 11:45:00',
  },
  {
    csnId: '100005', patId: 'Z5678901', contactDate: '2026-02-19',
    encType: 'Emergency', visitProvider: 'E56789',
    status: 'Completed', patientClass: 'Emergency',
    chiefComplaint: 'Abdominal pain', diagnosis: 'Acute Appendicitis',
    checkinTime: '2026-02-19 14:15:00', checkoutTime: '2026-02-19 18:30:00',
  },
  {
    csnId: '100006', patId: 'Z6789012', contactDate: '2026-02-20',
    encType: 'Office Visit', visitProvider: 'E67890',
    status: 'Completed', patientClass: 'Outpatient',
    chiefComplaint: 'Prenatal visit', diagnosis: 'Normal pregnancy',
    checkinTime: '2026-02-20 08:30:00', checkoutTime: '2026-02-20 09:15:00',
  },
  {
    csnId: '100011', patId: 'Z1234567', contactDate: '2026-02-25',
    encType: 'Office Visit', visitProvider: 'E12345',
    status: 'Completed', patientClass: 'Outpatient',
    chiefComplaint: 'Post-discharge follow-up', diagnosis: 'Status post MI',
    checkinTime: '2026-02-25 15:30:00', checkoutTime: '2026-02-25 16:15:00',
  },
  {
    csnId: '100012', patId: 'Z2345678', contactDate: '2026-02-26',
    encType: 'Office Visit', visitProvider: 'E23456',
    status: 'Completed', patientClass: 'Outpatient',
    chiefComplaint: 'URI follow-up', diagnosis: 'Resolved URI',
    checkinTime: '2026-02-26 08:00:00', checkoutTime: '2026-02-26 08:45:00',
  },
  {
    csnId: '100014', patId: 'Z4567890', contactDate: '2026-02-28',
    encType: 'Office Visit', visitProvider: 'E45678',
    status: 'Completed', patientClass: 'Outpatient',
    chiefComplaint: 'Knee pain', diagnosis: 'Osteoarthritis of left knee',
    checkinTime: '2026-02-28 11:45:00', checkoutTime: '2026-02-28 12:30:00',
  },
  {
    csnId: '100020', patId: 'Z2345678', contactDate: '2026-02-14',
    encType: 'Office Visit', visitProvider: 'E23456',
    status: 'Completed', patientClass: 'Outpatient',
    chiefComplaint: 'Blood pressure check', diagnosis: 'Essential Hypertension, Borderline High Cholesterol',
    checkinTime: '2026-02-14 09:00:00', checkoutTime: '2026-02-14 09:45:00',
  },
]

export const sampleOrders = [
  {
    orderId: '1001', orderType: 'Lab', patId: 'Z1234567', csnId: '100001',
    orderDate: '2026-02-15', status: 'Completed',
    procName: 'Complete Blood Count (CBC)', procCode: '85025',
  },
  {
    orderId: '1002', orderType: 'Lab', patId: 'Z1234567', csnId: '100001',
    orderDate: '2026-02-15', status: 'Completed',
    procName: 'Comprehensive Metabolic Panel', procCode: '80053',
  },
  {
    orderId: '1003', orderType: 'Imaging', patId: 'Z2345678', csnId: '100002',
    orderDate: '2026-02-16', status: 'Completed',
    procName: 'Chest X-Ray', procCode: '71046',
  },
  {
    orderId: '1004', orderType: 'Lab', patId: 'Z3456789', csnId: '100003',
    orderDate: '2026-02-17', status: 'Completed',
    procName: 'Lipid Panel', procCode: '80061',
  },
  {
    orderId: '1005', orderType: 'Lab', patId: 'Z4567890', csnId: '100004',
    orderDate: '2026-02-18', status: 'Completed',
    procName: 'Hemoglobin A1C', procCode: '83036',
  },
  {
    orderId: '1007', orderType: 'Lab', patId: 'Z6789012', csnId: '100006',
    orderDate: '2026-02-20', status: 'Completed',
    procName: 'Urinalysis', procCode: '81001',
  },
  {
    orderId: '1010', orderType: 'Lab', patId: 'Z2345678', csnId: '100020',
    orderDate: '2026-02-14', status: 'Completed',
    procName: 'Lipid Panel', procCode: '80061',
  },
  {
    orderId: '1011', orderType: 'Lab', patId: 'Z2345678', csnId: '100020',
    orderDate: '2026-02-14', status: 'Completed',
    procName: 'Comprehensive Metabolic Panel', procCode: '80053',
  },
]

export const sampleResults = [
  { resultId: 'R1001', orderId: '1001', component: 'White Blood Cell Count', value: '7.5', numValue: 7.5, unit: 'K/uL', refLow: 4.0, refHigh: 11.0, flag: 'Normal', resultTime: '2026-02-15 10:30:00' },
  { resultId: 'R1002', orderId: '1001', component: 'Red Blood Cell Count', value: '4.8', numValue: 4.8, unit: 'M/uL', refLow: 4.2, refHigh: 5.9, flag: 'Normal', resultTime: '2026-02-15 10:30:00' },
  { resultId: 'R1003', orderId: '1001', component: 'Hemoglobin', value: '14.2', numValue: 14.2, unit: 'g/dL', refLow: 13.5, refHigh: 17.5, flag: 'Normal', resultTime: '2026-02-15 10:30:00' },
  { resultId: 'R1004', orderId: '1001', component: 'Hematocrit', value: '42.5', numValue: 42.5, unit: '%', refLow: 38.0, refHigh: 50.0, flag: 'Normal', resultTime: '2026-02-15 10:30:00' },
  { resultId: 'R1005', orderId: '1001', component: 'Platelet Count', value: '225', numValue: 225, unit: 'K/uL', refLow: 150, refHigh: 400, flag: 'Normal', resultTime: '2026-02-15 10:30:00' },
  { resultId: 'R1006', orderId: '1002', component: 'Glucose', value: '98', numValue: 98, unit: 'mg/dL', refLow: 70, refHigh: 100, flag: 'Normal', resultTime: '2026-02-15 10:45:00' },
  { resultId: 'R1007', orderId: '1002', component: 'Blood Urea Nitrogen', value: '18', numValue: 18, unit: 'mg/dL', refLow: 7, refHigh: 20, flag: 'Normal', resultTime: '2026-02-15 10:45:00' },
  { resultId: 'R1008', orderId: '1002', component: 'Creatinine', value: '1.1', numValue: 1.1, unit: 'mg/dL', refLow: 0.7, refHigh: 1.3, flag: 'Normal', resultTime: '2026-02-15 10:45:00' },
  { resultId: 'R1009', orderId: '1002', component: 'Sodium', value: '140', numValue: 140, unit: 'mEq/L', refLow: 136, refHigh: 145, flag: 'Normal', resultTime: '2026-02-15 10:45:00' },
  { resultId: 'R1010', orderId: '1002', component: 'Potassium', value: '4.2', numValue: 4.2, unit: 'mEq/L', refLow: 3.5, refHigh: 5.1, flag: 'Normal', resultTime: '2026-02-15 10:45:00' },
  { resultId: 'R1013', orderId: '1004', component: 'Total Cholesterol', value: '245', numValue: 245, unit: 'mg/dL', refLow: 0, refHigh: 200, flag: 'High', resultTime: '2026-02-17 11:00:00' },
  { resultId: 'R1014', orderId: '1004', component: 'HDL Cholesterol', value: '45', numValue: 45, unit: 'mg/dL', refLow: 40, refHigh: 60, flag: 'Normal', resultTime: '2026-02-17 11:00:00' },
  { resultId: 'R1015', orderId: '1004', component: 'LDL Cholesterol', value: '165', numValue: 165, unit: 'mg/dL', refLow: 0, refHigh: 100, flag: 'High', resultTime: '2026-02-17 11:00:00' },
  { resultId: 'R1016', orderId: '1004', component: 'Triglycerides', value: '175', numValue: 175, unit: 'mg/dL', refLow: 0, refHigh: 150, flag: 'High', resultTime: '2026-02-17 11:00:00' },
  { resultId: 'R1017', orderId: '1005', component: 'Hemoglobin A1C', value: '7.8', numValue: 7.8, unit: '%', refLow: 4.0, refHigh: 5.6, flag: 'High', resultTime: '2026-02-18 13:00:00' },
  // Sarah Johnson's results
  { resultId: 'R2001', orderId: '1010', component: 'Total Cholesterol', value: '218', numValue: 218, unit: 'mg/dL', refLow: 0, refHigh: 200, flag: 'High', resultTime: '2026-02-14 11:00:00' },
  { resultId: 'R2002', orderId: '1010', component: 'HDL Cholesterol', value: '52', numValue: 52, unit: 'mg/dL', refLow: 40, refHigh: 60, flag: 'Normal', resultTime: '2026-02-14 11:00:00' },
  { resultId: 'R2003', orderId: '1010', component: 'LDL Cholesterol', value: '142', numValue: 142, unit: 'mg/dL', refLow: 0, refHigh: 100, flag: 'High', resultTime: '2026-02-14 11:00:00' },
  { resultId: 'R2004', orderId: '1011', component: 'Glucose', value: '92', numValue: 92, unit: 'mg/dL', refLow: 70, refHigh: 100, flag: 'Normal', resultTime: '2026-02-14 11:15:00' },
  { resultId: 'R2005', orderId: '1011', component: 'Blood Urea Nitrogen', value: '14', numValue: 14, unit: 'mg/dL', refLow: 7, refHigh: 20, flag: 'Normal', resultTime: '2026-02-14 11:15:00' },
  { resultId: 'R2006', orderId: '1011', component: 'Creatinine', value: '0.9', numValue: 0.9, unit: 'mg/dL', refLow: 0.6, refHigh: 1.1, flag: 'Normal', resultTime: '2026-02-14 11:15:00' },
]

// Active health conditions per patient
export const sampleConditions = {
  Z2345678: [
    { name: 'Essential Hypertension', onset: '2023-06-15', status: 'Active', severity: 'Moderate' },
    { name: 'Borderline High Cholesterol', onset: '2024-01-10', status: 'Active', severity: 'Mild' },
  ],
  Z1234567: [
    { name: 'Acute Myocardial Infarction', onset: '2026-02-15', status: 'Resolved', severity: 'Severe' },
    { name: 'Essential Hypertension', onset: '2020-03-15', status: 'Active', severity: 'Moderate' },
    { name: 'Hyperlipidemia', onset: '2019-11-10', status: 'Active', severity: 'Mild' },
  ],
  Z4567890: [
    { name: 'Type 2 Diabetes Mellitus', onset: '2022-07-22', status: 'Active', severity: 'Moderate' },
    { name: 'Osteoarthritis of left knee', onset: '2025-08-01', status: 'Active', severity: 'Mild' },
  ],
  Z3456789: [
    { name: 'Hyperlipidemia', onset: '2024-06-20', status: 'Active', severity: 'Moderate' },
  ],
}

// Provider lookup
export const providers = {
  E12345: { name: 'Dr. James Wilson', specialty: 'Internal Medicine' },
  E23456: { name: 'Dr. Emily Chan', specialty: 'Family Medicine' },
  E34567: { name: 'Dr. Robert Kim', specialty: 'Internal Medicine' },
  E45678: { name: 'Dr. Sarah Mitchell', specialty: 'Endocrinology' },
  E56789: { name: 'Dr. David Park', specialty: 'Emergency Medicine' },
  E67890: { name: 'Dr. Anna Torres', specialty: 'OB/GYN' },
}

// Active medications per patient
export const sampleMedications = {
  Z2345678: [
    { name: 'Lisinopril 10mg', dosage: '1 tablet daily', prescriber: 'Dr. Emily Chan', startDate: '2023-06-15', purpose: 'Blood pressure management' },
    { name: 'Atorvastatin 20mg', dosage: '1 tablet at bedtime', prescriber: 'Dr. Emily Chan', startDate: '2024-01-10', purpose: 'Cholesterol management' },
  ],
  Z1234567: [
    { name: 'Aspirin 81mg', dosage: '1 tablet daily', prescriber: 'Dr. James Wilson', startDate: '2026-02-15', purpose: 'Heart attack prevention' },
    { name: 'Metoprolol 50mg', dosage: '1 tablet twice daily', prescriber: 'Dr. James Wilson', startDate: '2026-02-15', purpose: 'Heart rate control' },
    { name: 'Lisinopril 20mg', dosage: '1 tablet daily', prescriber: 'Dr. James Wilson', startDate: '2020-03-15', purpose: 'Blood pressure management' },
    { name: 'Atorvastatin 40mg', dosage: '1 tablet at bedtime', prescriber: 'Dr. James Wilson', startDate: '2019-11-10', purpose: 'Cholesterol management' },
  ],
  Z4567890: [
    { name: 'Metformin 500mg', dosage: '1 tablet twice daily', prescriber: 'Dr. Sarah Mitchell', startDate: '2022-07-22', purpose: 'Diabetes management' },
    { name: 'Ibuprofen 400mg', dosage: 'As needed', prescriber: 'Dr. Sarah Mitchell', startDate: '2026-02-28', purpose: 'Knee pain relief' },
  ],
}

// Generate the full parsed dataset for the sample
export function generateSampleParsedData() {
  const totalRecords = sampleEncounters.length + sampleOrders.length + sampleResults.length

  // Build patient summaries
  const patientSummaries = samplePatients.map(patient => {
    const encounters = sampleEncounters.filter(e => e.patId === patient.patId)
    const orders = sampleOrders.filter(o => o.patId === patient.patId)
    const conditions = sampleConditions[patient.patId] || []
    const medications = sampleMedications[patient.patId] || []
    const results = orders.flatMap(order =>
      sampleResults.filter(r => r.orderId === order.orderId)
    )
    const abnormalResults = results.filter(r => r.flag !== 'Normal')

    // Parse name: "Last, First M" -> { first, last }
    const nameParts = patient.name.split(', ')
    const lastName = nameParts[0]
    const firstMiddle = nameParts[1] || ''
    const firstName = firstMiddle.split(' ')[0]

    // Calculate age
    const birth = new Date(patient.birthDate)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    if (now.getMonth() < birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
      age--
    }

    return {
      ...patient,
      firstName,
      lastName,
      age,
      encounters,
      orders,
      results,
      conditions,
      medications,
      abnormalResults,
      encounterCount: encounters.length,
      orderCount: orders.length,
      resultCount: results.length,
      conditionCount: conditions.length,
      medicationCount: medications.length,
    }
  })

  // Find the "selected" patient for the demo (Sarah Johnson)
  const selectedPatient = patientSummaries.find(p => p.patId === 'Z2345678')

  return {
    patients: patientSummaries,
    selectedPatient,
    encounters: sampleEncounters,
    orders: sampleOrders,
    results: sampleResults,
    providers,
    totalRecords,
    totalPatients: samplePatients.length,
    dataSourceCount: 2, // providers
    dateRange: { start: '2023-06-15', end: '2026-02-28' },
    isSample: true,
  }
}

// Generate the AI summary for a given patient
export function generateAISummary(patient) {
  if (!patient) return null

  const activeConditions = patient.conditions.filter(c => c.status === 'Active')
  const conditionNames = activeConditions.map(c => c.name)

  const lastEncounter = patient.encounters.sort((a, b) =>
    new Date(b.contactDate) - new Date(a.contactDate)
  )[0]

  const providerName = lastEncounter ? providers[lastEncounter.visitProvider]?.name || 'your provider' : 'your provider'

  return {
    generatedAt: new Date().toISOString(),
    basedOn: `${patient.encounterCount + patient.orderCount + patient.resultCount} health records from multiple providers`,
    sections: [
      {
        id: 'overall',
        title: 'Overall Health Story',
        icon: '📖',
        content: `Your health records show a well-managed journey with ${activeConditions.length} active health condition${activeConditions.length !== 1 ? 's' : ''} since the earliest records. ${patient.firstName} ${patient.lastName}, a ${patient.age}-year-old ${(patient.sex || 'individual').toLowerCase()}, is currently taking ${patient.medicationCount} medication${patient.medicationCount !== 1 ? 's' : ''} as part of an ongoing treatment plan.\n\nThe medical record indicates active management of ${conditionNames.length > 0 ? conditionNames.map(n => `**${(n || '').toLowerCase()}**`).join(' and ') : 'general health'}. Recent clinical encounters demonstrate consistent monitoring and appropriate therapeutic interventions.${lastEncounter ? `\n\nThe most recent healthcare interaction occurred on **${new Date(lastEncounter.contactDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}** for ${(lastEncounter.encType || 'visit').toLowerCase()} with ${providerName}. This ${lastEncounter.chiefComplaint ? `showed ${(lastEncounter.diagnosis || '').toLowerCase()}` : 'was a routine follow-up'}.` : ''}`,
      },
      {
        id: 'medications',
        title: 'Medications Summary',
        icon: '💊',
        content: patient.medicationCount > 0
          ? `You are currently taking ${patient.medicationCount} medication${patient.medicationCount !== 1 ? 's' : ''}:\n\n${patient.medications.map(m => `• **${m.name}** ${m.dosage} — ${m.purpose}`).join('\n')}\n\nAll medications are being managed by your care team with regular follow-ups to monitor effectiveness.`
          : 'No active medications are currently documented in your health records.',
      },
      {
        id: 'labs',
        title: 'Lab Results & Trends',
        icon: '🧪',
        content: patient.resultCount > 0
          ? `Your recent lab work includes ${patient.resultCount} result${patient.resultCount !== 1 ? 's' : ''} across ${patient.orderCount} order${patient.orderCount !== 1 ? 's' : ''}.\n\n${patient.abnormalResults.length > 0 ? `**${patient.abnormalResults.length} result${patient.abnormalResults.length !== 1 ? 's' : ''} flagged for attention:**\n${patient.abnormalResults.map(r => `• ${r.component}: ${r.value} ${r.unit} (Reference: ${r.refLow}-${r.refHigh}) — ${r.flag}`).join('\n')}` : 'All results are within normal reference ranges — great news!'}\n\nContinued monitoring is recommended as part of your ongoing care plan.`
          : 'No recent lab results found in your records.',
      },
      {
        id: 'care',
        title: 'Care Coordination',
        icon: '🏥',
        content: `You have had ${patient.encounterCount} healthcare encounter${patient.encounterCount !== 1 ? 's' : ''} documented in your records.\n\n${patient.encounters.slice(0, 3).map(e => {
          const prov = providers[e.visitProvider]
          return `• **${new Date(e.contactDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}** — ${e.encType} with ${prov?.name || 'Provider'} (${prov?.specialty || 'Specialist'}): ${e.diagnosis}`
        }).join('\n')}\n\nYour care team is coordinating effectively across visits to manage your health conditions.`,
      },
      {
        id: 'recommendations',
        title: 'Recommendations & Next Steps',
        icon: '🎯',
        content: `Based on your health records, consider the following:\n\n${patient.conditions.filter(c => c.status === 'Active').map(c => `✓ Continue management of ${c.name} — ${(c.severity || 'unknown').toLowerCase()} severity, currently being addressed`).join('\n')}\n${patient.medicationCount > 0 ? '⚠️ Review medication schedule with your provider at your next visit' : ''}\n${patient.abnormalResults.length > 0 ? '⚠️ Follow up on abnormal lab results with your care team' : ''}\nℹ️ Schedule routine preventive care screenings as recommended\nℹ️ Maintain regular follow-up appointments with your healthcare providers`,
      },
    ],
  }
}
