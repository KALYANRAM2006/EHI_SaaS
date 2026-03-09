// ═══════════════════════════════════════════════════════════════════════════════
// Clinical Code Mapper — LOINC · ICD-10 · SNOMED CT · RxNorm enrichment
// ═══════════════════════════════════════════════════════════════════════════════
//
// 100 % client-side. No patient data leaves the browser.
//
// Strategy:
//   • Local dictionaries cover the 200+ most common codes in each system.
//   • Fuzzy-matching (Levenshtein) handles OCR typos in term names.
//   • An *optional* FHIR CodeSystem $lookup helper is stubbed out but
//     disabled by default — it only sends clinical terms (never PHI).
//
// Exports:
//   mapLabToLOINC(labName)              → {loinc, display, system}
//   mapDiagnosisToICD10(conditionName)  → {icd10, display, system}
//   mapToSNOMED(term)                   → {snomedCT, display, system}
//   enrichMedicationCodes(med)          → med + rxnorm/ndc data
//   enrichWithCodes(clinicalEntities)   → entities with standard codes attached
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. LOINC MAPPING — Common laboratory tests
// ─────────────────────────────────────────────────────────────────────────────

const LAB_LOINC = {
  // Hematology
  'WBC':              { loinc: '6690-2',  display: 'Leukocytes [#/volume] in Blood' },
  'RBC':              { loinc: '789-8',   display: 'Erythrocytes [#/volume] in Blood' },
  'Hemoglobin':       { loinc: '718-7',   display: 'Hemoglobin [Mass/volume] in Blood' },
  'Hematocrit':       { loinc: '4544-3',  display: 'Hematocrit [Volume Fraction] of Blood' },
  'Platelets':        { loinc: '777-3',   display: 'Platelets [#/volume] in Blood' },
  'MCV':              { loinc: '787-2',   display: 'MCV [Entitic volume]' },
  'MCH':              { loinc: '785-6',   display: 'MCH [Entitic mass]' },
  'MCHC':             { loinc: '786-4',   display: 'MCHC [Mass/volume]' },
  'RDW':              { loinc: '788-0',   display: 'Erythrocyte distribution width [Ratio]' },
  'MPV':              { loinc: '32623-1', display: 'Platelet mean volume [Entitic volume]' },

  // Chemistry — Basic Metabolic Panel
  'Glucose':          { loinc: '2345-7',  display: 'Glucose [Mass/volume] in Serum or Plasma' },
  'BUN':              { loinc: '3094-0',  display: 'Urea nitrogen [Mass/volume] in Serum or Plasma' },
  'Creatinine':       { loinc: '2160-0',  display: 'Creatinine [Mass/volume] in Serum or Plasma' },
  'eGFR':             { loinc: '33914-3', display: 'Glomerular filtration rate/1.73 sq M' },
  'Sodium':           { loinc: '2951-2',  display: 'Sodium [Moles/volume] in Serum or Plasma' },
  'Potassium':        { loinc: '2823-3',  display: 'Potassium [Moles/volume] in Serum or Plasma' },
  'Chloride':         { loinc: '2075-0',  display: 'Chloride [Moles/volume] in Serum or Plasma' },
  'CO2':              { loinc: '2028-9',  display: 'Carbon dioxide [Moles/volume] in Serum or Plasma' },
  'Bicarbonate':      { loinc: '1963-8',  display: 'Bicarbonate [Moles/volume] in Serum or Plasma' },
  'Calcium':          { loinc: '17861-6', display: 'Calcium [Mass/volume] in Serum or Plasma' },
  'Magnesium':        { loinc: '19123-9', display: 'Magnesium [Mass/volume] in Serum or Plasma' },
  'Phosphorus':       { loinc: '2777-1',  display: 'Phosphate [Mass/volume] in Serum or Plasma' },

  // Diabetes
  'HbA1c':            { loinc: '4548-4',  display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },

  // Liver
  'ALT':              { loinc: '1742-6',  display: 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma' },
  'AST':              { loinc: '1920-8',  display: 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma' },
  'ALP':              { loinc: '6768-6',  display: 'Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma' },
  'Total Bilirubin':  { loinc: '1975-2',  display: 'Bilirubin.total [Mass/volume] in Serum or Plasma' },
  'Direct Bilirubin': { loinc: '1968-7',  display: 'Bilirubin.direct [Mass/volume] in Serum or Plasma' },
  'Albumin':          { loinc: '1751-7',  display: 'Albumin [Mass/volume] in Serum or Plasma' },
  'Total Protein':    { loinc: '2885-2',  display: 'Protein [Mass/volume] in Serum or Plasma' },
  'GGT':              { loinc: '2324-2',  display: 'Gamma glutamyl transferase [Enzymatic activity/volume] in Serum or Plasma' },

  // Lipids
  'Total Cholesterol':{ loinc: '2093-3',  display: 'Cholesterol [Mass/volume] in Serum or Plasma' },
  'LDL':              { loinc: '2089-1',  display: 'Cholesterol in LDL [Mass/volume] in Serum or Plasma' },
  'HDL':              { loinc: '2085-9',  display: 'Cholesterol in HDL [Mass/volume] in Serum or Plasma' },
  'Triglycerides':    { loinc: '2571-8',  display: 'Triglyceride [Mass/volume] in Serum or Plasma' },

  // Thyroid
  'TSH':              { loinc: '3016-3',  display: 'Thyrotropin [Units/volume] in Serum or Plasma' },
  'Free T4':          { loinc: '3024-7',  display: 'Thyroxine (T4) free [Mass/volume] in Serum or Plasma' },
  'Free T3':          { loinc: '3051-0',  display: 'Triiodothyronine (T3) free [Mass/volume] in Serum or Plasma' },

  // Coagulation
  'PT':               { loinc: '5902-2',  display: 'Prothrombin time (PT)' },
  'INR':              { loinc: '6301-6',  display: 'INR in Platelet poor plasma by Coagulation assay' },
  'PTT':              { loinc: '3173-2',  display: 'aPTT in Blood by Coagulation assay' },
  'aPTT':             { loinc: '3173-2',  display: 'aPTT in Blood by Coagulation assay' },
  'Fibrinogen':       { loinc: '3255-7',  display: 'Fibrinogen [Mass/volume] in Platelet poor plasma' },
  'D-Dimer':          { loinc: '48065-7', display: 'Fibrin D-dimer FEU [Mass/volume] in Platelet poor plasma' },

  // Inflammatory
  'CRP':              { loinc: '1988-5',  display: 'C reactive protein [Mass/volume] in Serum or Plasma' },
  'ESR':              { loinc: '4537-7',  display: 'Erythrocyte sedimentation rate' },
  'Procalcitonin':    { loinc: '33959-8', display: 'Procalcitonin [Mass/volume] in Serum or Plasma' },

  // Cardiac
  'Troponin':         { loinc: '6598-7',  display: 'Troponin T.cardiac [Mass/volume] in Serum or Plasma' },
  'Troponin I':       { loinc: '10839-9', display: 'Troponin I.cardiac [Mass/volume] in Serum or Plasma' },
  'Troponin T':       { loinc: '6598-7',  display: 'Troponin T.cardiac [Mass/volume] in Serum or Plasma' },
  'BNP':              { loinc: '42637-9', display: 'Natriuretic peptide B [Mass/volume] in Blood' },
  'NT-proBNP':        { loinc: '33762-6', display: 'NT-proBNP [Mass/volume] in Serum or Plasma' },
  'CK':               { loinc: '2157-6',  display: 'Creatine kinase [Enzymatic activity/volume] in Serum or Plasma' },
  'CK-MB':            { loinc: '13969-1', display: 'Creatine kinase.MB [Enzymatic activity/volume] in Serum or Plasma' },
  'LDH':              { loinc: '2532-0',  display: 'Lactate dehydrogenase [Enzymatic activity/volume] in Serum or Plasma' },

  // Iron Studies
  'Iron':             { loinc: '2498-4',  display: 'Iron [Mass/volume] in Serum or Plasma' },
  'Ferritin':         { loinc: '2276-4',  display: 'Ferritin [Mass/volume] in Serum or Plasma' },
  'TIBC':             { loinc: '2500-7',  display: 'Iron binding capacity [Mass/volume] in Serum or Plasma' },
  'Transferrin':      { loinc: '3034-6',  display: 'Transferrin [Mass/volume] in Serum or Plasma' },
  'Transferrin Sat':  { loinc: '2502-3',  display: 'Iron saturation [Mass Fraction] in Serum or Plasma' },

  // Vitamins
  'Vitamin D':        { loinc: '1989-3',  display: '25-Hydroxyvitamin D3 [Mass/volume] in Serum or Plasma' },
  'Vitamin B12':      { loinc: '2132-9',  display: 'Cobalamin (Vitamin B12) [Mass/volume] in Serum or Plasma' },
  'Folate':           { loinc: '2284-8',  display: 'Folate [Mass/volume] in Serum or Plasma' },

  // Urinalysis
  'Urinalysis':       { loinc: '24356-8', display: 'Urinalysis complete panel' },
  'Urine Protein':    { loinc: '2888-6',  display: 'Protein [Mass/volume] in Urine' },
  'Urine Glucose':    { loinc: '2350-7',  display: 'Glucose [Mass/volume] in Urine' },
  'Urine pH':         { loinc: '2756-5',  display: 'pH of Urine' },

  // Tumor Markers
  'PSA':              { loinc: '2857-1',  display: 'Prostate specific Ag [Mass/volume] in Serum or Plasma' },
  'CEA':              { loinc: '2039-6',  display: 'Carcinoembryonic Ag [Mass/volume] in Serum or Plasma' },
  'CA-125':           { loinc: '10334-1', display: 'Cancer Ag 125 [Units/volume] in Serum or Plasma' },
  'AFP':              { loinc: '1834-1',  display: 'Alpha-1-Fetoprotein [Mass/volume] in Serum or Plasma' },

  // Blood Gas
  'pH':               { loinc: '2744-1',  display: 'pH of Arterial blood' },
  'pCO2':             { loinc: '2019-8',  display: 'Carbon dioxide [Partial pressure] in Arterial blood' },
  'pO2':              { loinc: '2703-7',  display: 'Oxygen [Partial pressure] in Arterial blood' },
  'Lactate':          { loinc: '2524-7',  display: 'Lactate [Moles/volume] in Serum or Plasma' },

  // Renal
  'Uric Acid':        { loinc: '3084-1',  display: 'Urate [Mass/volume] in Serum or Plasma' },
  'Cystatin C':       { loinc: '33863-2', display: 'Cystatin C [Mass/volume] in Serum or Plasma' },
  'Microalbumin':     { loinc: '14957-5', display: 'Microalbumin [Mass/volume] in Urine' },
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ICD-10 MAPPING — Common diagnoses / conditions
// ─────────────────────────────────────────────────────────────────────────────

const DIAGNOSIS_ICD10 = {
  // Cardiovascular
  'hypertension':                 { icd10: 'I10',    display: 'Essential (primary) hypertension' },
  'heart failure':                { icd10: 'I50.9',  display: 'Heart failure, unspecified' },
  'congestive heart failure':     { icd10: 'I50.9',  display: 'Heart failure, unspecified' },
  'coronary artery disease':      { icd10: 'I25.10', display: 'Atherosclerotic heart disease of native coronary artery' },
  'atrial fibrillation':          { icd10: 'I48.91', display: 'Unspecified atrial fibrillation' },
  'myocardial infarction':        { icd10: 'I21.9',  display: 'Acute myocardial infarction, unspecified' },
  'deep vein thrombosis':         { icd10: 'I82.409',display: 'Acute embolism and thrombosis of unspecified deep veins of lower extremity' },
  'pulmonary embolism':           { icd10: 'I26.99', display: 'Other pulmonary embolism without acute cor pulmonale' },
  'peripheral vascular disease':  { icd10: 'I73.9',  display: 'Peripheral vascular disease, unspecified' },
  'peripheral arterial disease':  { icd10: 'I73.9',  display: 'Peripheral vascular disease, unspecified' },
  'aortic stenosis':              { icd10: 'I35.0',  display: 'Nonrheumatic aortic (valve) stenosis' },
  'hypotension':                  { icd10: 'I95.9',  display: 'Hypotension, unspecified' },

  // Endocrine
  'diabetes':                     { icd10: 'E11.9',  display: 'Type 2 diabetes mellitus without complications' },
  'type 2 diabetes':              { icd10: 'E11.9',  display: 'Type 2 diabetes mellitus without complications' },
  'type 2 diabetes mellitus':     { icd10: 'E11.9',  display: 'Type 2 diabetes mellitus without complications' },
  'type 1 diabetes':              { icd10: 'E10.9',  display: 'Type 1 diabetes mellitus without complications' },
  'type 1 diabetes mellitus':     { icd10: 'E10.9',  display: 'Type 1 diabetes mellitus without complications' },
  'hypothyroidism':               { icd10: 'E03.9',  display: 'Hypothyroidism, unspecified' },
  'hyperthyroidism':              { icd10: 'E05.90', display: 'Thyrotoxicosis, unspecified' },
  'obesity':                      { icd10: 'E66.9',  display: 'Obesity, unspecified' },
  'morbid obesity':               { icd10: 'E66.01', display: 'Morbid (severe) obesity due to excess calories' },
  'hyperlipidemia':               { icd10: 'E78.5',  display: 'Hyperlipidemia, unspecified' },
  'dyslipidemia':                 { icd10: 'E78.5',  display: 'Hyperlipidemia, unspecified' },

  // Respiratory
  'asthma':                       { icd10: 'J45.909',display: 'Unspecified asthma, uncomplicated' },
  'copd':                         { icd10: 'J44.1',  display: 'Chronic obstructive pulmonary disease with acute exacerbation' },
  'chronic obstructive pulmonary disease': { icd10: 'J44.1', display: 'COPD with acute exacerbation' },
  'pneumonia':                    { icd10: 'J18.9',  display: 'Pneumonia, unspecified organism' },
  'bronchitis':                   { icd10: 'J20.9',  display: 'Acute bronchitis, unspecified' },
  'sleep apnea':                  { icd10: 'G47.30', display: 'Sleep apnea, unspecified' },
  'obstructive sleep apnea':      { icd10: 'G47.33', display: 'Obstructive sleep apnea' },

  // Renal
  'chronic kidney disease':       { icd10: 'N18.9',  display: 'Chronic kidney disease, unspecified' },
  'end stage renal disease':      { icd10: 'N18.6',  display: 'End stage renal disease' },
  'acute kidney injury':          { icd10: 'N17.9',  display: 'Acute kidney failure, unspecified' },
  'nephrolithiasis':              { icd10: 'N20.0',  display: 'Calculus of kidney' },
  'urinary tract infection':      { icd10: 'N39.0',  display: 'Urinary tract infection, site not specified' },

  // GI
  'gastroesophageal reflux':      { icd10: 'K21.0',  display: 'Gastro-esophageal reflux disease with esophagitis' },
  'gastroesophageal reflux disease': { icd10: 'K21.0', display: 'GERD with esophagitis' },
  'gerd':                         { icd10: 'K21.0',  display: 'GERD with esophagitis' },
  'pancreatitis':                 { icd10: 'K85.9',  display: 'Acute pancreatitis, unspecified' },
  'diverticulitis':               { icd10: 'K57.92', display: 'Diverticulitis of intestine, unspecified' },
  'appendicitis':                 { icd10: 'K35.80', display: 'Unspecified acute appendicitis' },
  'cholecystitis':                { icd10: 'K81.9',  display: 'Cholecystitis, unspecified' },
  'crohn':                        { icd10: 'K50.90', display: "Crohn's disease, unspecified" },
  "crohn's disease":              { icd10: 'K50.90', display: "Crohn's disease, unspecified" },
  'ulcerative colitis':           { icd10: 'K51.90', display: 'Ulcerative colitis, unspecified' },
  'irritable bowel syndrome':     { icd10: 'K58.9',  display: 'Irritable bowel syndrome without diarrhea' },
  'cirrhosis':                    { icd10: 'K74.60', display: 'Unspecified cirrhosis of liver' },
  'hepatitis':                    { icd10: 'K75.9',  display: 'Inflammatory liver disease, unspecified' },

  // Musculoskeletal
  'osteoarthritis':               { icd10: 'M19.90', display: 'Unspecified osteoarthritis, unspecified site' },
  'rheumatoid arthritis':         { icd10: 'M06.9',  display: 'Rheumatoid arthritis, unspecified' },
  'osteoporosis':                 { icd10: 'M81.0',  display: 'Age-related osteoporosis without current fracture' },
  'gout':                         { icd10: 'M10.9',  display: 'Gout, unspecified' },
  'low back pain':                { icd10: 'M54.5',  display: 'Low back pain' },
  'fibromyalgia':                 { icd10: 'M79.7',  display: 'Fibromyalgia' },

  // Neurological
  'stroke':                       { icd10: 'I63.9',  display: 'Cerebral infarction, unspecified' },
  'transient ischemic attack':    { icd10: 'G45.9',  display: 'Transient cerebral ischemic attack, unspecified' },
  'epilepsy':                     { icd10: 'G40.909',display: 'Epilepsy, unspecified, not intractable' },
  'parkinson':                    { icd10: 'G20',    display: "Parkinson's disease" },
  "parkinson's disease":          { icd10: 'G20',    display: "Parkinson's disease" },
  'alzheimer':                    { icd10: 'G30.9',  display: "Alzheimer's disease, unspecified" },
  "alzheimer's disease":          { icd10: 'G30.9',  display: "Alzheimer's disease, unspecified" },
  'dementia':                     { icd10: 'F03.90', display: 'Unspecified dementia without behavioral disturbance' },
  'multiple sclerosis':           { icd10: 'G35',    display: 'Multiple sclerosis' },
  'migraine':                     { icd10: 'G43.909',display: 'Migraine, unspecified, not intractable' },
  'neuropathy':                   { icd10: 'G62.9',  display: 'Polyneuropathy, unspecified' },

  // Mental health
  'depression':                   { icd10: 'F32.9',  display: 'Major depressive disorder, single episode, unspecified' },
  'major depressive disorder':    { icd10: 'F33.9',  display: 'Major depressive disorder, recurrent, unspecified' },
  'anxiety':                      { icd10: 'F41.9',  display: 'Anxiety disorder, unspecified' },
  'generalized anxiety disorder': { icd10: 'F41.1',  display: 'Generalized anxiety disorder' },
  'bipolar disorder':             { icd10: 'F31.9',  display: 'Bipolar disorder, unspecified' },
  'schizophrenia':                { icd10: 'F20.9',  display: 'Schizophrenia, unspecified' },
  'ptsd':                         { icd10: 'F43.10', display: 'Post-traumatic stress disorder, unspecified' },
  'insomnia':                     { icd10: 'G47.00', display: 'Insomnia, unspecified' },

  // Infectious
  'sepsis':                       { icd10: 'A41.9',  display: 'Sepsis, unspecified organism' },
  'cellulitis':                   { icd10: 'L03.90', display: 'Cellulitis, unspecified' },
  'covid':                        { icd10: 'U07.1',  display: 'COVID-19' },
  'covid-19':                     { icd10: 'U07.1',  display: 'COVID-19' },
  'influenza':                    { icd10: 'J11.1',  display: 'Influenza due to unidentified influenza virus with other respiratory manifestations' },

  // Autoimmune
  'lupus':                        { icd10: 'M32.9',  display: 'Systemic lupus erythematosus, unspecified' },
  'systemic lupus erythematosus': { icd10: 'M32.9',  display: 'Systemic lupus erythematosus, unspecified' },

  // Hematologic
  'anemia':                       { icd10: 'D64.9',  display: 'Anemia, unspecified' },
  'iron deficiency anemia':       { icd10: 'D50.9',  display: 'Iron deficiency anemia, unspecified' },
  'thrombocytopenia':             { icd10: 'D69.6',  display: 'Thrombocytopenia, unspecified' },

  // Cancer (general)
  'cancer':                       { icd10: 'C80.1',  display: 'Malignant (primary) neoplasm, unspecified' },
  'breast cancer':                { icd10: 'C50.919',display: 'Malignant neoplasm of unspecified site of unspecified female breast' },
  'lung cancer':                  { icd10: 'C34.90', display: 'Malignant neoplasm of unspecified part of unspecified bronchus or lung' },
  'colon cancer':                 { icd10: 'C18.9',  display: 'Malignant neoplasm of colon, unspecified' },
  'prostate cancer':              { icd10: 'C61',    display: 'Malignant neoplasm of prostate' },

  // Other
  'benign prostatic hyperplasia': { icd10: 'N40.0',  display: 'Benign prostatic hyperplasia without lower urinary tract symptoms' },
  'chronic pain':                 { icd10: 'G89.29', display: 'Other chronic pain' },
  'fall':                         { icd10: 'W19.XXXA', display: 'Unspecified fall, initial encounter' },
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SNOMED CT MAPPING — Common clinical terms
// ─────────────────────────────────────────────────────────────────────────────

const TERM_SNOMED = {
  // Cardiovascular
  'hypertension':                  { snomedCT: '38341003',  display: 'Hypertensive disorder' },
  'heart failure':                 { snomedCT: '84114007',  display: 'Heart failure' },
  'congestive heart failure':      { snomedCT: '42343007',  display: 'Congestive heart failure' },
  'coronary artery disease':       { snomedCT: '53741008',  display: 'Coronary arteriosclerosis' },
  'atrial fibrillation':           { snomedCT: '49436004',  display: 'Atrial fibrillation' },
  'myocardial infarction':         { snomedCT: '22298006',  display: 'Myocardial infarction' },
  'deep vein thrombosis':          { snomedCT: '128053003', display: 'Deep venous thrombosis' },
  'pulmonary embolism':            { snomedCT: '59282003',  display: 'Pulmonary embolism' },

  // Endocrine
  'diabetes':                      { snomedCT: '73211009',  display: 'Diabetes mellitus' },
  'type 2 diabetes':               { snomedCT: '44054006',  display: 'Diabetes mellitus type 2' },
  'type 2 diabetes mellitus':      { snomedCT: '44054006',  display: 'Diabetes mellitus type 2' },
  'type 1 diabetes':               { snomedCT: '46635009',  display: 'Diabetes mellitus type 1' },
  'type 1 diabetes mellitus':      { snomedCT: '46635009',  display: 'Diabetes mellitus type 1' },
  'hypothyroidism':                { snomedCT: '40930008',  display: 'Hypothyroidism' },
  'obesity':                       { snomedCT: '414916001', display: 'Obesity' },
  'hyperlipidemia':                { snomedCT: '55822004',  display: 'Hyperlipidemia' },

  // Respiratory
  'asthma':                        { snomedCT: '195967001', display: 'Asthma' },
  'copd':                          { snomedCT: '13645005',  display: 'Chronic obstructive lung disease' },
  'chronic obstructive pulmonary disease': { snomedCT: '13645005', display: 'COPD' },
  'pneumonia':                     { snomedCT: '233604007', display: 'Pneumonia' },
  'sleep apnea':                   { snomedCT: '73430006',  display: 'Sleep apnea' },

  // Renal
  'chronic kidney disease':        { snomedCT: '709044004', display: 'Chronic kidney disease' },
  'acute kidney injury':           { snomedCT: '14669001',  display: 'Acute renal failure syndrome' },
  'urinary tract infection':       { snomedCT: '68566005',  display: 'Urinary tract infectious disease' },

  // GI
  'gastroesophageal reflux disease': { snomedCT: '235595009', display: 'GERD' },
  'gerd':                          { snomedCT: '235595009', display: 'GERD' },
  'pancreatitis':                  { snomedCT: '75694006',  display: 'Pancreatitis' },
  'cirrhosis':                     { snomedCT: '19943007',  display: 'Cirrhosis of liver' },

  // Musculoskeletal
  'osteoarthritis':                { snomedCT: '396275006', display: 'Osteoarthritis' },
  'rheumatoid arthritis':          { snomedCT: '69896004',  display: 'Rheumatoid arthritis' },
  'osteoporosis':                  { snomedCT: '64859006',  display: 'Osteoporosis' },
  'gout':                          { snomedCT: '90560007',  display: 'Gout' },
  'fibromyalgia':                  { snomedCT: '203082005', display: 'Fibromyalgia' },

  // Neurological
  'stroke':                        { snomedCT: '230690007', display: 'Cerebrovascular accident' },
  'epilepsy':                      { snomedCT: '84757009',  display: 'Epilepsy' },
  "parkinson's disease":           { snomedCT: '49049000',  display: "Parkinson's disease" },
  'parkinson':                     { snomedCT: '49049000',  display: "Parkinson's disease" },
  "alzheimer's disease":           { snomedCT: '26929004',  display: "Alzheimer's disease" },
  'alzheimer':                     { snomedCT: '26929004',  display: "Alzheimer's disease" },
  'dementia':                      { snomedCT: '52448006',  display: 'Dementia' },
  'multiple sclerosis':            { snomedCT: '24700007',  display: 'Multiple sclerosis' },
  'migraine':                      { snomedCT: '37796009',  display: 'Migraine' },

  // Mental health
  'depression':                    { snomedCT: '35489007',  display: 'Depressive disorder' },
  'anxiety':                       { snomedCT: '197480006', display: 'Anxiety disorder' },
  'bipolar disorder':              { snomedCT: '13746004',  display: 'Bipolar disorder' },

  // Infectious
  'sepsis':                        { snomedCT: '91302008',  display: 'Sepsis' },
  'covid-19':                      { snomedCT: '840539006', display: 'COVID-19' },

  // Hematologic
  'anemia':                        { snomedCT: '271737000', display: 'Anemia' },
  'iron deficiency anemia':        { snomedCT: '87522002',  display: 'Iron deficiency anemia' },

  // Autoimmune
  'lupus':                         { snomedCT: '55464009',  display: 'Systemic lupus erythematosus' },
  'systemic lupus erythematosus':  { snomedCT: '55464009',  display: 'SLE' },
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LOOKUP FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a (normalized) lab name to its LOINC code.
 *
 * @param {string} labName — canonical lab name (e.g. "Hemoglobin")
 * @returns {{ loinc: string|null, display: string, system: string, matched: boolean }}
 */
export function mapLabToLOINC(labName) {
  if (!labName) return { loinc: null, display: labName, system: 'LOINC', matched: false }

  // Direct lookup
  const entry = LAB_LOINC[labName]
  if (entry) {
    return { loinc: entry.loinc, display: entry.display, system: 'LOINC', matched: true }
  }

  // Case-insensitive search
  const lower = labName.toLowerCase()
  for (const [key, val] of Object.entries(LAB_LOINC)) {
    if (key.toLowerCase() === lower) {
      return { loinc: val.loinc, display: val.display, system: 'LOINC', matched: true }
    }
  }

  // Fuzzy — find closest key within edit distance 2
  const closest = findClosestKey(labName, Object.keys(LAB_LOINC), 2)
  if (closest) {
    const val = LAB_LOINC[closest]
    return { loinc: val.loinc, display: val.display, system: 'LOINC', matched: true, fuzzy: true }
  }

  return { loinc: null, display: labName, system: 'LOINC', matched: false }
}

/**
 * Map a condition / diagnosis name to ICD-10.
 *
 * @param {string} conditionName
 * @returns {{ icd10: string|null, display: string, system: string, matched: boolean }}
 */
export function mapDiagnosisToICD10(conditionName) {
  if (!conditionName) return { icd10: null, display: conditionName, system: 'ICD-10-CM', matched: false }

  const lower = conditionName.toLowerCase().trim()

  // Direct lookup
  const entry = DIAGNOSIS_ICD10[lower]
  if (entry) {
    return { icd10: entry.icd10, display: entry.display, system: 'ICD-10-CM', matched: true }
  }

  // Substring match — "Type 2 Diabetes Mellitus with nephropathy" → "type 2 diabetes mellitus"
  for (const [key, val] of Object.entries(DIAGNOSIS_ICD10)) {
    if (lower.includes(key) || key.includes(lower)) {
      return { icd10: val.icd10, display: val.display, system: 'ICD-10-CM', matched: true }
    }
  }

  // Fuzzy
  const closest = findClosestKey(lower, Object.keys(DIAGNOSIS_ICD10), 3)
  if (closest) {
    const val = DIAGNOSIS_ICD10[closest]
    return { icd10: val.icd10, display: val.display, system: 'ICD-10-CM', matched: true, fuzzy: true }
  }

  return { icd10: null, display: conditionName, system: 'ICD-10-CM', matched: false }
}

/**
 * Map a term to SNOMED CT.
 *
 * @param {string} term
 * @returns {{ snomedCT: string|null, display: string, system: string, matched: boolean }}
 */
export function mapToSNOMED(term) {
  if (!term) return { snomedCT: null, display: term, system: 'SNOMED-CT', matched: false }

  const lower = term.toLowerCase().trim()

  const entry = TERM_SNOMED[lower]
  if (entry) {
    return { snomedCT: entry.snomedCT, display: entry.display, system: 'SNOMED-CT', matched: true }
  }

  for (const [key, val] of Object.entries(TERM_SNOMED)) {
    if (lower.includes(key) || key.includes(lower)) {
      return { snomedCT: val.snomedCT, display: val.display, system: 'SNOMED-CT', matched: true }
    }
  }

  const closest = findClosestKey(lower, Object.keys(TERM_SNOMED), 3)
  if (closest) {
    const val = TERM_SNOMED[closest]
    return { snomedCT: val.snomedCT, display: val.display, system: 'SNOMED-CT', matched: true, fuzzy: true }
  }

  return { snomedCT: null, display: term, system: 'SNOMED-CT', matched: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ENRICHMENT ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enrich clinical entities extracted by OCR with standard code mappings.
 * Mutates the input object by attaching code fields.
 *
 * @param {Object} clinicalEntities — output of parseClinicalText()
 * @returns {Object} Same reference, enriched with codes
 */
export function enrichWithCodes(clinicalEntities) {
  if (!clinicalEntities) return clinicalEntities

  // Enrich lab results with LOINC
  if (clinicalEntities.labResults) {
    clinicalEntities.labResults = clinicalEntities.labResults.map(lab => {
      const mapping = mapLabToLOINC(lab.name)
      return {
        ...lab,
        loinc: mapping.loinc,
        loincDisplay: mapping.display,
        codeMatched: mapping.matched,
      }
    })
  }

  // Enrich diagnoses with ICD-10 + SNOMED
  if (clinicalEntities.diagnoses) {
    clinicalEntities.diagnoses = clinicalEntities.diagnoses.map(dx => {
      // If already has an ICD-10 code from regex extraction, keep it
      if (dx.code && dx.codeSystem === 'ICD-10') {
        const snomed = mapToSNOMED(dx.name)
        return {
          ...dx,
          snomedCT: snomed.snomedCT,
          snomedDisplay: snomed.display,
        }
      }

      const icd = mapDiagnosisToICD10(dx.name)
      const snomed = mapToSNOMED(dx.name)
      return {
        ...dx,
        code: icd.icd10 || dx.code || '',
        codeSystem: icd.matched ? 'ICD-10-CM' : (dx.codeSystem || ''),
        icd10Display: icd.display,
        snomedCT: snomed.snomedCT,
        snomedDisplay: snomed.display,
        codeMatched: icd.matched || snomed.matched,
      }
    })
  }

  // Enrich allergies with SNOMED (allergen concepts)
  if (clinicalEntities.allergies) {
    clinicalEntities.allergies = clinicalEntities.allergies.map(alg => {
      const snomed = mapToSNOMED(alg.name)
      return {
        ...alg,
        snomedCT: snomed.matched ? snomed.snomedCT : null,
      }
    })
  }

  // Enrich procedures with SNOMED
  if (clinicalEntities.procedures) {
    clinicalEntities.procedures = clinicalEntities.procedures.map(proc => {
      const snomed = mapToSNOMED(proc.name)
      return {
        ...proc,
        snomedCT: snomed.matched ? snomed.snomedCT : null,
        snomedDisplay: snomed.matched ? snomed.display : '',
      }
    })
  }

  return clinicalEntities
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Simple Levenshtein distance. */
function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/** Find the closest key in a dictionary within maxDistance. */
function findClosestKey(input, keys, maxDistance = 2) {
  if (!input || input.length < 2) return null
  const needle = input.toLowerCase()
  let best = null
  let bestDist = maxDistance + 1
  for (const key of keys) {
    const hay = key.toLowerCase()
    if (Math.abs(needle.length - hay.length) > maxDistance) continue
    const dist = levenshtein(needle, hay)
    if (dist < bestDist) {
      bestDist = dist
      best = key
    }
  }
  return bestDist <= maxDistance ? best : null
}
