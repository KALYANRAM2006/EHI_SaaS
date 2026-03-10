// ═══════════════════════════════════════════════════════════════════════════════
// Standard Code Enricher — Universal clinical-code attachment for ALL records
// ═══════════════════════════════════════════════════════════════════════════════
//
// Attaches standard codes (LOINC, ICD-10, SNOMED CT, RxNorm/NDC, CPT, CVX)
// to every clinical record regardless of source (TSV, OCR, FHIR, etc.).
//
// Called BEFORE deduplication so that code-based matching can work.
// 100% client-side. No PHI leaves the browser.
//
// Exports:
//   enrichAllRecords(parsedData) → parsedData with standard codes attached
//   enrichRecord(record, category) → single record with codes
// ═══════════════════════════════════════════════════════════════════════════════

import { mapLabToLOINC, mapDiagnosisToICD10, mapToSNOMED } from '../normalizers/clinicalCodeMapper'
import { normalizeDrugName } from '../normalizers/medicalNLP'

// ─────────────────────────────────────────────────────────────────────────────
// NDC Code Dictionary — Top ~90 medications → NDC
// National Drug Code (FDA registry) for medication identification
// ─────────────────────────────────────────────────────────────────────────────

const MEDICATION_NDC = {
  // Statins
  'atorvastatin':       { ndc: '00071015523', rxcui: '83367',  drugClass: 'Statin' },
  'lipitor':            { ndc: '00071015523', rxcui: '83367',  drugClass: 'Statin' },
  'rosuvastatin':       { ndc: '00310075190', rxcui: '301542', drugClass: 'Statin' },
  'crestor':            { ndc: '00310075190', rxcui: '301542', drugClass: 'Statin' },
  'simvastatin':        { ndc: '00006072631', rxcui: '36567',  drugClass: 'Statin' },
  'zocor':              { ndc: '00006072631', rxcui: '36567',  drugClass: 'Statin' },
  'pravastatin':        { ndc: '00003589421', rxcui: '42463',  drugClass: 'Statin' },
  'lovastatin':         { ndc: '00006073131', rxcui: '6472',   drugClass: 'Statin' },

  // ACE Inhibitors & ARBs
  'lisinopril':         { ndc: '00093721898', rxcui: '29046',  drugClass: 'ACE Inhibitor' },
  'enalapril':          { ndc: '00093083201', rxcui: '3827',   drugClass: 'ACE Inhibitor' },
  'ramipril':           { ndc: '61570010901', rxcui: '35296',  drugClass: 'ACE Inhibitor' },
  'losartan':           { ndc: '00006095231', rxcui: '52175',  drugClass: 'ARB' },
  'cozaar':             { ndc: '00006095231', rxcui: '52175',  drugClass: 'ARB' },
  'valsartan':          { ndc: '00078043615', rxcui: '69749',  drugClass: 'ARB' },
  'irbesartan':         { ndc: '00024522106', rxcui: '83818',  drugClass: 'ARB' },
  'olmesartan':         { ndc: '65597030110', rxcui: '321064', drugClass: 'ARB' },

  // Beta-Blockers
  'metoprolol':         { ndc: '00093073301', rxcui: '6918',   drugClass: 'Beta-Blocker' },
  'atenolol':           { ndc: '00093075201', rxcui: '1202',   drugClass: 'Beta-Blocker' },
  'carvedilol':         { ndc: '00007423120', rxcui: '20352',  drugClass: 'Beta-Blocker' },
  'propranolol':        { ndc: '00046064481', rxcui: '8787',   drugClass: 'Beta-Blocker' },

  // Diuretics
  'hydrochlorothiazide':{ ndc: '00904563460', rxcui: '5487',   drugClass: 'Thiazide Diuretic' },
  'furosemide':         { ndc: '00054840025', rxcui: '4603',   drugClass: 'Loop Diuretic' },
  'lasix':              { ndc: '00054840025', rxcui: '4603',   drugClass: 'Loop Diuretic' },
  'spironolactone':     { ndc: '00378015001', rxcui: '9997',   drugClass: 'K-sparing Diuretic' },

  // Antiplatelets & Anticoagulants
  'aspirin':            { ndc: '00280005001', rxcui: '1191',   drugClass: 'Antiplatelet' },
  'clopidogrel':        { ndc: '63539010030', rxcui: '32968',  drugClass: 'Antiplatelet' },
  'plavix':             { ndc: '63539010030', rxcui: '32968',  drugClass: 'Antiplatelet' },
  'warfarin':           { ndc: '00056017270', rxcui: '11289',  drugClass: 'Anticoagulant' },
  'coumadin':           { ndc: '00056017270', rxcui: '11289',  drugClass: 'Anticoagulant' },
  'apixaban':           { ndc: '00003089321', rxcui: '1364435',drugClass: 'DOAC' },
  'eliquis':            { ndc: '00003089321', rxcui: '1364435',drugClass: 'DOAC' },
  'rivaroxaban':        { ndc: '50458058001', rxcui: '1114195',drugClass: 'DOAC' },
  'xarelto':            { ndc: '50458058001', rxcui: '1114195',drugClass: 'DOAC' },

  // Diabetes
  'metformin':          { ndc: '00378072001', rxcui: '6809',   drugClass: 'Biguanide' },
  'glucophage':         { ndc: '00378072001', rxcui: '6809',   drugClass: 'Biguanide' },
  'glipizide':          { ndc: '00049012066', rxcui: '4815',   drugClass: 'Sulfonylurea' },
  'glyburide':          { ndc: '00054400025', rxcui: '4821',   drugClass: 'Sulfonylurea' },
  'insulin':            { ndc: '00169183312', rxcui: '5856',   drugClass: 'Insulin' },
  'insulin glargine':   { ndc: '00088221905', rxcui: '261551', drugClass: 'Insulin' },
  'lantus':             { ndc: '00088221905', rxcui: '261551', drugClass: 'Insulin' },
  'empagliflozin':      { ndc: '00597015260', rxcui: '1545653',drugClass: 'SGLT2 Inhibitor' },
  'jardiance':          { ndc: '00597015260', rxcui: '1545653',drugClass: 'SGLT2 Inhibitor' },
  'semaglutide':        { ndc: '00169431012', rxcui: '1991302',drugClass: 'GLP-1 RA' },
  'ozempic':            { ndc: '00169431012', rxcui: '1991302',drugClass: 'GLP-1 RA' },
  'liraglutide':        { ndc: '00169610512', rxcui: '897122', drugClass: 'GLP-1 RA' },

  // PPIs & GI
  'omeprazole':         { ndc: '00186101631', rxcui: '7646',   drugClass: 'PPI' },
  'prilosec':           { ndc: '00186101631', rxcui: '7646',   drugClass: 'PPI' },
  'pantoprazole':       { ndc: '00008084181', rxcui: '40790',  drugClass: 'PPI' },
  'esomeprazole':       { ndc: '00186501028', rxcui: '283742', drugClass: 'PPI' },
  'famotidine':         { ndc: '00006096968', rxcui: '4278',   drugClass: 'H2 Blocker' },

  // Antidepressants & Psych
  'sertraline':         { ndc: '00049049066', rxcui: '36437',  drugClass: 'SSRI' },
  'zoloft':             { ndc: '00049049066', rxcui: '36437',  drugClass: 'SSRI' },
  'escitalopram':       { ndc: '00456102001', rxcui: '321988', drugClass: 'SSRI' },
  'lexapro':            { ndc: '00456102001', rxcui: '321988', drugClass: 'SSRI' },
  'fluoxetine':         { ndc: '00002325902', rxcui: '4493',   drugClass: 'SSRI' },
  'prozac':             { ndc: '00002325902', rxcui: '4493',   drugClass: 'SSRI' },
  'duloxetine':         { ndc: '00002323260', rxcui: '72625',  drugClass: 'SNRI' },
  'cymbalta':           { ndc: '00002323260', rxcui: '72625',  drugClass: 'SNRI' },
  'venlafaxine':        { ndc: '00008083311', rxcui: '39786',  drugClass: 'SNRI' },
  'trazodone':          { ndc: '00555009002', rxcui: '10737',  drugClass: 'Antidepressant' },
  'buspirone':          { ndc: '00555032802', rxcui: '42347',  drugClass: 'Anxiolytic' },

  // Pain & Anti-inflammatory
  'acetaminophen':      { ndc: '00045050012', rxcui: '161',    drugClass: 'Analgesic' },
  'tylenol':            { ndc: '00045050012', rxcui: '161',    drugClass: 'Analgesic' },
  'ibuprofen':          { ndc: '00904762060', rxcui: '5640',   drugClass: 'NSAID' },
  'naproxen':           { ndc: '00004620001', rxcui: '7258',   drugClass: 'NSAID' },
  'gabapentin':         { ndc: '00071080540', rxcui: '25480',  drugClass: 'Anticonvulsant' },
  'pregabalin':         { ndc: '00071101568', rxcui: '187832', drugClass: 'Anticonvulsant' },

  // Respiratory
  'albuterol':          { ndc: '00173068220', rxcui: '435',    drugClass: 'Bronchodilator' },
  'montelukast':        { ndc: '00006071131', rxcui: '88249',  drugClass: 'Leukotriene Modifier' },
  'singulair':          { ndc: '00006071131', rxcui: '88249',  drugClass: 'Leukotriene Modifier' },
  'fluticasone':        { ndc: '00173068200', rxcui: '41126',  drugClass: 'Inhaled Corticosteroid' },

  // Thyroid
  'levothyroxine':      { ndc: '00074694490', rxcui: '10582',  drugClass: 'Thyroid Hormone' },
  'synthroid':          { ndc: '00074694490', rxcui: '10582',  drugClass: 'Thyroid Hormone' },

  // Antibiotics
  'amoxicillin':        { ndc: '65862001505', rxcui: '723',    drugClass: 'Antibiotic' },
  'azithromycin':       { ndc: '00069315001', rxcui: '18631',  drugClass: 'Antibiotic' },
  'zithromax':          { ndc: '00069315001', rxcui: '18631',  drugClass: 'Antibiotic' },
  'ciprofloxacin':      { ndc: '00093087356', rxcui: '2551',   drugClass: 'Antibiotic' },
  'doxycycline':        { ndc: '00093321201', rxcui: '3640',   drugClass: 'Antibiotic' },

  // Other
  'amlodipine':         { ndc: '00069153066', rxcui: '17767',  drugClass: 'CCB' },
  'norvasc':            { ndc: '00069153066', rxcui: '17767',  drugClass: 'CCB' },
  'prednisone':         { ndc: '00054492025', rxcui: '8640',   drugClass: 'Corticosteroid' },
  'alprazolam':         { ndc: '00009002901', rxcui: '596',    drugClass: 'Benzodiazepine' },
  'lorazepam':          { ndc: '00187060201', rxcui: '6470',   drugClass: 'Benzodiazepine' },
}

// ─────────────────────────────────────────────────────────────────────────────
// CVX Code Dictionary — Common vaccines → CVX
// ─────────────────────────────────────────────────────────────────────────────

const VACCINE_CVX = {
  // Influenza
  'influenza':                    { cvx: '141',  display: 'Influenza, seasonal, injectable' },
  'flu shot':                     { cvx: '141',  display: 'Influenza, seasonal, injectable' },
  'flu vaccine':                  { cvx: '141',  display: 'Influenza, seasonal, injectable' },
  'influenza vaccine':            { cvx: '141',  display: 'Influenza, seasonal, injectable' },
  'flu':                          { cvx: '141',  display: 'Influenza, seasonal, injectable' },
  'fluzone':                      { cvx: '141',  display: 'Influenza, seasonal, injectable' },
  'flumist':                      { cvx: '111',  display: 'Influenza, live, intranasal' },

  // COVID-19
  'covid-19':                     { cvx: '213',  display: 'SARS-CoV-2 (COVID-19) vaccine, mRNA' },
  'covid':                        { cvx: '213',  display: 'SARS-CoV-2 (COVID-19) vaccine, mRNA' },
  'pfizer covid':                 { cvx: '208',  display: 'Pfizer-BioNTech COVID-19 Vaccine' },
  'moderna covid':                { cvx: '207',  display: 'Moderna COVID-19 Vaccine' },
  'johnson covid':                { cvx: '212',  display: 'Janssen COVID-19 Vaccine' },
  'janssen covid':                { cvx: '212',  display: 'Janssen COVID-19 Vaccine' },
  'comirnaty':                    { cvx: '208',  display: 'Pfizer-BioNTech COVID-19 Vaccine' },
  'spikevax':                     { cvx: '207',  display: 'Moderna COVID-19 Vaccine' },

  // Pneumococcal
  'pneumococcal':                 { cvx: '133',  display: 'Pneumococcal conjugate PCV 13' },
  'prevnar':                      { cvx: '133',  display: 'Pneumococcal conjugate PCV 13' },
  'pneumovax':                    { cvx: '33',   display: 'Pneumococcal polysaccharide PPV23' },
  'ppsv23':                       { cvx: '33',   display: 'Pneumococcal polysaccharide PPV23' },
  'pcv13':                        { cvx: '133',  display: 'Pneumococcal conjugate PCV 13' },
  'pcv20':                        { cvx: '216',  display: 'Pneumococcal conjugate PCV 20' },

  // Tdap / Td / DTP
  'tdap':                         { cvx: '115',  display: 'Tdap (Tetanus, Diphtheria, Pertussis)' },
  'tetanus':                      { cvx: '115',  display: 'Tdap (Tetanus, Diphtheria, Pertussis)' },
  'adacel':                       { cvx: '115',  display: 'Tdap (Tetanus, Diphtheria, Pertussis)' },
  'boostrix':                     { cvx: '115',  display: 'Tdap (Tetanus, Diphtheria, Pertussis)' },
  'td':                           { cvx: '113',  display: 'Td (Tetanus, Diphtheria)' },
  'dtap':                         { cvx: '20',   display: 'DTaP' },

  // Shingles
  'shingles':                     { cvx: '187',  display: 'Recombinant Zoster Vaccine' },
  'shingrix':                     { cvx: '187',  display: 'Recombinant Zoster Vaccine' },
  'zoster':                       { cvx: '187',  display: 'Recombinant Zoster Vaccine' },
  'zostavax':                     { cvx: '121',  display: 'Zoster vaccine, live' },

  // Hepatitis
  'hepatitis a':                  { cvx: '83',   display: 'Hepatitis A Vaccine' },
  'hep a':                        { cvx: '83',   display: 'Hepatitis A Vaccine' },
  'hepatitis b':                  { cvx: '45',   display: 'Hepatitis B Vaccine' },
  'hep b':                        { cvx: '45',   display: 'Hepatitis B Vaccine' },
  'engerix':                      { cvx: '45',   display: 'Hepatitis B Vaccine' },
  'heplisav':                     { cvx: '189',  display: 'Hepatitis B Vaccine (adjuvanted)' },

  // MMR
  'mmr':                          { cvx: '03',   display: 'MMR (Measles, Mumps, Rubella)' },
  'measles':                      { cvx: '03',   display: 'MMR (Measles, Mumps, Rubella)' },
  'mumps':                        { cvx: '03',   display: 'MMR (Measles, Mumps, Rubella)' },
  'rubella':                      { cvx: '03',   display: 'MMR (Measles, Mumps, Rubella)' },

  // Varicella
  'varicella':                    { cvx: '21',   display: 'Varicella (Chickenpox)' },
  'chickenpox':                   { cvx: '21',   display: 'Varicella (Chickenpox)' },

  // Polio
  'ipv':                          { cvx: '10',   display: 'Inactivated Polio Vaccine' },
  'polio':                        { cvx: '10',   display: 'Inactivated Polio Vaccine' },

  // HPV
  'hpv':                          { cvx: '165',  display: 'HPV 9-valent Vaccine' },
  'gardasil':                     { cvx: '165',  display: 'HPV 9-valent Vaccine' },

  // Meningococcal
  'meningococcal':                { cvx: '108',  display: 'Meningococcal ACWY' },
  'menactra':                     { cvx: '108',  display: 'Meningococcal ACWY' },
  'menveo':                       { cvx: '108',  display: 'Meningococcal ACWY' },

  // RSV
  'rsv':                          { cvx: '305',  display: 'RSV Vaccine' },
  'abrysvo':                      { cvx: '305',  display: 'RSV Vaccine' },
  'arexvy':                       { cvx: '306',  display: 'RSV Vaccine (adjuvanted)' },

  // Rotavirus
  'rotavirus':                    { cvx: '116',  display: 'Rotavirus Vaccine' },

  // Rabies
  'rabies':                       { cvx: '18',   display: 'Rabies Vaccine' },

  // TB
  'bcg':                          { cvx: '19',   display: 'BCG Vaccine' },

  // Typhoid
  'typhoid':                      { cvx: '25',   display: 'Typhoid Vaccine' },

  // Yellow Fever
  'yellow fever':                 { cvx: '37',   display: 'Yellow Fever Vaccine' },
}

// ─────────────────────────────────────────────────────────────────────────────
// CPT Code Dictionary — Procedures → CPT (extends what documentOCR has)
// ─────────────────────────────────────────────────────────────────────────────

const PROCEDURE_CPT = {
  // Lab-type orders (commonly seen in ORDER_PROC)
  'cbc':                  { cpt: '85025',  display: 'Complete Blood Count' },
  'complete blood count': { cpt: '85025',  display: 'Complete Blood Count' },
  'cmp':                  { cpt: '80053',  display: 'Comprehensive Metabolic Panel' },
  'comprehensive metabolic panel': { cpt: '80053', display: 'Comprehensive Metabolic Panel' },
  'bmp':                  { cpt: '80048',  display: 'Basic Metabolic Panel' },
  'basic metabolic panel':{ cpt: '80048',  display: 'Basic Metabolic Panel' },
  'lipid panel':          { cpt: '80061',  display: 'Lipid Panel' },
  'hba1c':                { cpt: '83036',  display: 'Hemoglobin A1c' },
  'hemoglobin a1c':       { cpt: '83036',  display: 'Hemoglobin A1c' },
  'urinalysis':           { cpt: '81001',  display: 'Urinalysis, Automated' },
  'tsh':                  { cpt: '84443',  display: 'Thyroid Stimulating Hormone' },
  'thyroid stimulating hormone': { cpt: '84443', display: 'Thyroid Stimulating Hormone' },
  'psa':                  { cpt: '84153',  display: 'Prostate-Specific Antigen' },
  'pt/inr':               { cpt: '85610',  display: 'Prothrombin Time' },
  'inr':                  { cpt: '85610',  display: 'Prothrombin Time' },
  'troponin':             { cpt: '84484',  display: 'Troponin, quantitative' },
  'bnp':                  { cpt: '83880',  display: 'B-type Natriuretic Peptide' },
  'blood culture':        { cpt: '87040',  display: 'Blood Culture' },
  'urine culture':        { cpt: '87086',  display: 'Urine Culture' },
  'vitamin d':            { cpt: '82306',  display: 'Vitamin D, 25-Hydroxy' },
  'vitamin b12':          { cpt: '82607',  display: 'Cyanocobalamin (Vitamin B12)' },
  'ferritin':             { cpt: '82728',  display: 'Ferritin' },
  'iron':                 { cpt: '83540',  display: 'Iron, Total' },
  'magnesium':            { cpt: '83735',  display: 'Magnesium' },
  'phosphorus':           { cpt: '84100',  display: 'Phosphorus' },
  'uric acid':            { cpt: '84550',  display: 'Uric Acid' },
  'esr':                  { cpt: '85652',  display: 'Erythrocyte Sedimentation Rate' },
  'crp':                  { cpt: '86140',  display: 'C-Reactive Protein' },
  'c-reactive protein':   { cpt: '86140',  display: 'C-Reactive Protein' },

  // Imaging
  'chest x-ray':          { cpt: '71046',  display: 'Chest X-Ray, 2 views' },
  'x-ray':                { cpt: '71046',  display: 'X-Ray' },
  'ct scan':              { cpt: '74177',  display: 'CT Abdomen/Pelvis with contrast' },
  'ct head':              { cpt: '70450',  display: 'CT Head without contrast' },
  'ct chest':             { cpt: '71260',  display: 'CT Chest with contrast' },
  'mri':                  { cpt: '70553',  display: 'MRI Brain with/without contrast' },
  'mri brain':            { cpt: '70553',  display: 'MRI Brain with/without contrast' },
  'mri spine':            { cpt: '72148',  display: 'MRI Lumbar Spine without contrast' },
  'ultrasound':           { cpt: '76700',  display: 'Ultrasound, Abdominal' },
  'echocardiogram':       { cpt: '93306',  display: 'Echocardiography, complete' },
  'echo':                 { cpt: '93306',  display: 'Echocardiography, complete' },
  'mammogram':            { cpt: '77067',  display: 'Screening Mammography' },
  'bone density':         { cpt: '77080',  display: 'DXA Bone Density' },
  'dexa':                 { cpt: '77080',  display: 'DXA Bone Density' },
  'pet scan':             { cpt: '78816',  display: 'PET Scan' },

  // Cardiac
  'ekg':                  { cpt: '93000',  display: 'Electrocardiogram, 12-lead' },
  'ecg':                  { cpt: '93000',  display: 'Electrocardiogram, 12-lead' },
  'stress test':          { cpt: '93015',  display: 'Cardiovascular Stress Test' },
  'cardiac catheterization': { cpt: '93452', display: 'Left Heart Catheterization' },
  'catheterization':      { cpt: '93452',  display: 'Left Heart Catheterization' },
  'angioplasty':          { cpt: '92920',  display: 'Percutaneous Transluminal Coronary Angioplasty' },
  'stent':                { cpt: '92928',  display: 'Intravascular Stent Placement' },
  'cabg':                 { cpt: '33533',  display: 'Coronary Artery Bypass Graft' },
  'pacemaker':            { cpt: '33208',  display: 'Pacemaker Insertion' },
  'defibrillator':        { cpt: '33249',  display: 'ICD Insertion' },

  // Surgical
  'colonoscopy':          { cpt: '45378',  display: 'Colonoscopy, diagnostic' },
  'endoscopy':            { cpt: '43239',  display: 'Upper GI Endoscopy with biopsy' },
  'egd':                  { cpt: '43239',  display: 'Esophagogastroduodenoscopy' },
  'biopsy':               { cpt: '11102',  display: 'Tangential biopsy of skin' },
  'laparoscopy':          { cpt: '49320',  display: 'Diagnostic Laparoscopy' },
  'appendectomy':         { cpt: '44970',  display: 'Laparoscopic Appendectomy' },
  'cholecystectomy':      { cpt: '47562',  display: 'Laparoscopic Cholecystectomy' },
  'hysterectomy':         { cpt: '58571',  display: 'Laparoscopic Hysterectomy' },
  'tonsillectomy':        { cpt: '42826',  display: 'Tonsillectomy' },
  'cesarean':             { cpt: '59510',  display: 'Cesarean Delivery' },
  'c-section':            { cpt: '59510',  display: 'Cesarean Delivery' },

  // Pulmonary
  'bronchoscopy':         { cpt: '31622',  display: 'Bronchoscopy, diagnostic' },
  'intubation':           { cpt: '31500',  display: 'Emergency Endotracheal Intubation' },
  'ventilator':           { cpt: '94002',  display: 'Ventilation Management' },
  'pulmonary function':   { cpt: '94010',  display: 'Spirometry' },
  'spirometry':           { cpt: '94010',  display: 'Spirometry' },

  // Urology
  'cystoscopy':           { cpt: '52000',  display: 'Cystoscopy' },

  // Orthopedic
  'arthroscopy':          { cpt: '29881',  display: 'Arthroscopy, Knee' },
  'joint injection':      { cpt: '20610',  display: 'Arthrocentesis, Major Joint' },
  'joint aspiration':     { cpt: '20610',  display: 'Arthrocentesis, Major Joint' },

  // Other
  'lumbar puncture':      { cpt: '62270',  display: 'Lumbar Puncture' },
  'blood transfusion':    { cpt: '36430',  display: 'Blood Transfusion' },
  'dialysis':             { cpt: '90935',  display: 'Hemodialysis' },
  'chemotherapy':         { cpt: '96413',  display: 'Chemotherapy Administration' },
  'radiation therapy':    { cpt: '77385',  display: 'IMRT Delivery' },
  'physical therapy':     { cpt: '97110',  display: 'Physical Therapy, Therapeutic Exercise' },
  'occupational therapy': { cpt: '97530',  display: 'Therapeutic Activities' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Vital Sign LOINC Codes
// ─────────────────────────────────────────────────────────────────────────────

const VITAL_LOINC = {
  'blood pressure':      { loinc: '85354-9', display: 'Blood pressure panel' },
  'systolic':            { loinc: '8480-6',  display: 'Systolic blood pressure' },
  'diastolic':           { loinc: '8462-4',  display: 'Diastolic blood pressure' },
  'bp':                  { loinc: '85354-9', display: 'Blood pressure panel' },
  'heart rate':          { loinc: '8867-4',  display: 'Heart rate' },
  'pulse':               { loinc: '8867-4',  display: 'Heart rate' },
  'hr':                  { loinc: '8867-4',  display: 'Heart rate' },
  'temperature':         { loinc: '8310-5',  display: 'Body temperature' },
  'temp':                { loinc: '8310-5',  display: 'Body temperature' },
  'spo2':                { loinc: '2708-6',  display: 'Oxygen saturation' },
  'oxygen saturation':   { loinc: '2708-6',  display: 'Oxygen saturation' },
  'respiratory rate':    { loinc: '9279-1',  display: 'Respiratory rate' },
  'rr':                  { loinc: '9279-1',  display: 'Respiratory rate' },
  'weight':              { loinc: '29463-7', display: 'Body weight' },
  'height':              { loinc: '8302-2',  display: 'Body height' },
  'bmi':                 { loinc: '39156-5', display: 'Body mass index' },
  'pain':                { loinc: '72514-3', display: 'Pain severity score' },
  'pain score':          { loinc: '72514-3', display: 'Pain severity score' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Allergy SNOMED Codes (common allergens)
// ─────────────────────────────────────────────────────────────────────────────

const ALLERGY_SNOMED = {
  'penicillin':          { snomed: '91936005',  display: 'Allergy to penicillin' },
  'amoxicillin':         { snomed: '294505008', display: 'Allergy to amoxicillin' },
  'sulfa':               { snomed: '91937001',  display: 'Allergy to sulfonamide' },
  'sulfonamide':         { snomed: '91937001',  display: 'Allergy to sulfonamide' },
  'aspirin':             { snomed: '293586001', display: 'Allergy to aspirin' },
  'nsaid':               { snomed: '293578003', display: 'Allergy to NSAID' },
  'ibuprofen':           { snomed: '293585002', display: 'Allergy to ibuprofen' },
  'codeine':             { snomed: '293108004', display: 'Allergy to codeine' },
  'morphine':            { snomed: '293104006', display: 'Allergy to morphine' },
  'latex':               { snomed: '300916003', display: 'Latex allergy' },
  'peanut':              { snomed: '91935009',  display: 'Allergy to peanut' },
  'shellfish':           { snomed: '91934008',  display: 'Allergy to shellfish' },
  'egg':                 { snomed: '91930004',  display: 'Allergy to egg protein' },
  'milk':                { snomed: '425525006', display: 'Allergy to dairy product' },
  'soy':                 { snomed: '91934008',  display: 'Allergy to soy protein' },
  'wheat':               { snomed: '420174000', display: 'Allergy to wheat' },
  'gluten':              { snomed: '420174000', display: 'Allergy to wheat gluten' },
  'tree nut':            { snomed: '91934008',  display: 'Allergy to tree nut' },
  'bee sting':           { snomed: '232350006', display: 'Allergy to bee venom' },
  'contrast dye':        { snomed: '293637006', display: 'Allergy to contrast media' },
  'iodine':              { snomed: '294916008', display: 'Allergy to iodine' },
  'metformin':           { snomed: '294596008', display: 'Allergy to metformin' },
  'ace inhibitor':       { snomed: '293566003', display: 'Allergy to ACE inhibitor' },
  'statin':              { snomed: '372913009', display: 'Allergy to statin' },
  'erythromycin':        { snomed: '91940005',  display: 'Allergy to erythromycin' },
  'tetracycline':        { snomed: '91939003',  display: 'Allergy to tetracycline' },
  'fluoroquinolone':     { snomed: '91938006',  display: 'Allergy to fluoroquinolone' },
  'ciprofloxacin':       { snomed: '91938006',  display: 'Allergy to ciprofloxacin' },
  'cephalosporin':       { snomed: '294532003', display: 'Allergy to cephalosporin' },
  'vancomycin':          { snomed: '294546009', display: 'Allergy to vancomycin' },
}


// ═══════════════════════════════════════════════════════════════════════════════
// CORE: Enrich a single record with standard codes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enrich a single record with standard clinical codes based on its category.
 * Non-destructive: attaches code fields without overwriting existing values.
 *
 * @param {Object} record — clinical record (medication, result, condition, etc.)
 * @param {string} category — 'medications'|'results'|'conditions'|'allergies'|'orders'|'immunizations'|'vitals'
 * @returns {Object} — same record with code fields attached
 */
export function enrichRecord(record, category) {
  if (!record) return record

  switch (category) {
    case 'medications':
      return enrichMedication(record)
    case 'results':
      return enrichLabResult(record)
    case 'conditions':
      return enrichCondition(record)
    case 'allergies':
      return enrichAllergy(record)
    case 'orders':
      return enrichOrder(record)
    case 'immunizations':
      return enrichImmunization(record)
    case 'vitals':
      return enrichVital(record)
    default:
      return record
  }
}

// ─── Medication enrichment: RxNorm + NDC + Drug Class ────────────────────────

function enrichMedication(med) {
  // Skip if already fully coded
  if (med.rxcui && med.ndc) return med

  const enriched = { ...med }
  const rawName = (med.name || med.medication || '').trim()
  if (!rawName) return enriched

  // 1. Try medicalNLP normalizeDrugName (has brand→generic + RxCUI)
  if (!enriched.rxcui || !enriched.drugClass) {
    try {
      const nlpResult = normalizeDrugName(rawName)
      if (nlpResult.rxcui && !enriched.rxcui) enriched.rxcui = nlpResult.rxcui
      if (nlpResult.drugClass && !enriched.drugClass) enriched.drugClass = nlpResult.drugClass
      if (nlpResult.generic && !enriched.genericName) enriched.genericName = nlpResult.generic
      if (nlpResult.brand && !enriched.brandName) enriched.brandName = nlpResult.brand
    } catch { /* ignore */ }
  }

  // 2. NDC lookup
  if (!enriched.ndc) {
    const drugToken = rawName.toLowerCase().replace(/\d+\s*(mg|mcg|ml|units?|meq|%)\b/gi, '').trim()
    const ndcEntry = MEDICATION_NDC[drugToken]
      || MEDICATION_NDC[drugToken.split(' ')[0]]  // Try first word
      || findFuzzyNDC(drugToken)
    if (ndcEntry) {
      enriched.ndc = ndcEntry.ndc
      if (!enriched.rxcui) enriched.rxcui = ndcEntry.rxcui
      if (!enriched.drugClass) enriched.drugClass = ndcEntry.drugClass
    }
  }

  return enriched
}

function findFuzzyNDC(token) {
  const lower = token.toLowerCase()
  for (const [key, val] of Object.entries(MEDICATION_NDC)) {
    if (lower.includes(key) || key.includes(lower)) return val
  }
  return null
}

// ─── Lab Result enrichment: LOINC ────────────────────────────────────────────

function enrichLabResult(result) {
  if (result.loinc) return result

  const enriched = { ...result }
  const labName = result.name || result.component || ''
  if (!labName) return enriched

  const loincResult = mapLabToLOINC(labName)
  if (loincResult.matched) {
    enriched.loinc = loincResult.loinc
    enriched.loincDisplay = loincResult.display
  }

  return enriched
}

// ─── Condition enrichment: ICD-10 + SNOMED CT ────────────────────────────────

function enrichCondition(condition) {
  if (condition.icd10 && condition.snomedCT) return condition

  const enriched = { ...condition }
  const name = condition.name || ''
  if (!name) return enriched

  if (!enriched.icd10) {
    const icdResult = mapDiagnosisToICD10(name)
    if (icdResult.matched) {
      enriched.icd10 = icdResult.icd10
      enriched.icd10Display = icdResult.display
    }
  }

  if (!enriched.snomedCT) {
    const snomedResult = mapToSNOMED(name)
    if (snomedResult.matched) {
      enriched.snomedCT = snomedResult.snomedCT
      enriched.snomedDisplay = snomedResult.display
    }
  }

  return enriched
}

// ─── Allergy enrichment: SNOMED CT ───────────────────────────────────────────

function enrichAllergy(allergy) {
  if (allergy.snomedCT) return allergy

  const enriched = { ...allergy }
  const name = (allergy.allergen || allergy.name || '').toLowerCase().trim()
  if (!name) return enriched

  // Direct lookup
  const snomedEntry = ALLERGY_SNOMED[name] || findFuzzyAllergy(name)
  if (snomedEntry) {
    enriched.snomedCT = snomedEntry.snomed
    enriched.snomedDisplay = snomedEntry.display
  } else {
    // Fall back to general SNOMED mapper
    const snomedResult = mapToSNOMED(name)
    if (snomedResult.matched) {
      enriched.snomedCT = snomedResult.snomedCT
      enriched.snomedDisplay = snomedResult.display
    }
  }

  return enriched
}

function findFuzzyAllergy(name) {
  for (const [key, val] of Object.entries(ALLERGY_SNOMED)) {
    if (name.includes(key) || key.includes(name)) return val
  }
  return null
}

// ─── Order/Procedure enrichment: CPT ─────────────────────────────────────────

function enrichOrder(order) {
  if (order.procCode) return order  // Already has a CPT code

  const enriched = { ...order }
  const name = (order.procName || order.name || '').toLowerCase().trim()
  if (!name) return enriched

  const cptEntry = PROCEDURE_CPT[name] || findFuzzyProcedure(name)
  if (cptEntry) {
    enriched.procCode = cptEntry.cpt
    enriched.cptDescription = cptEntry.display
  }

  return enriched
}

function findFuzzyProcedure(name) {
  for (const [key, val] of Object.entries(PROCEDURE_CPT)) {
    if (name.includes(key) || key.includes(name)) return val
  }
  return null
}

// ─── Immunization enrichment: CVX ────────────────────────────────────────────

function enrichImmunization(immn) {
  if (immn.cvx) return immn

  const enriched = { ...immn }
  const name = (immn.name || '').toLowerCase().trim()
  if (!name) return enriched

  // Existing code field might be a CVX code already
  if (immn.code && /^\d{2,3}$/.test(immn.code)) {
    enriched.cvx = immn.code
    // Try to find display name
    for (const [, val] of Object.entries(VACCINE_CVX)) {
      if (val.cvx === immn.code) {
        enriched.cvxDisplay = val.display
        break
      }
    }
    return enriched
  }

  const cvxEntry = VACCINE_CVX[name] || findFuzzyCVX(name)
  if (cvxEntry) {
    enriched.cvx = cvxEntry.cvx
    enriched.cvxDisplay = cvxEntry.display
    if (!enriched.code) enriched.code = cvxEntry.cvx
  }

  return enriched
}

function findFuzzyCVX(name) {
  for (const [key, val] of Object.entries(VACCINE_CVX)) {
    if (name.includes(key) || key.includes(name)) return val
  }
  return null
}

// ─── Vital enrichment: LOINC ─────────────────────────────────────────────────

function enrichVital(vital) {
  if (vital.loinc) return vital

  const enriched = { ...vital }
  const name = (vital.name || '').toLowerCase().trim()
  if (!name) return enriched

  const loincEntry = VITAL_LOINC[name] || findFuzzyVitalLOINC(name)
  if (loincEntry) {
    enriched.loinc = loincEntry.loinc
    enriched.loincDisplay = loincEntry.display
  }

  return enriched
}

function findFuzzyVitalLOINC(name) {
  for (const [key, val] of Object.entries(VITAL_LOINC)) {
    if (name.includes(key) || key.includes(name)) return val
  }
  return null
}


// ═══════════════════════════════════════════════════════════════════════════════
// BATCH: Enrich all records in a parsedData object
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enrich ALL clinical records in parsedData with standard codes.
 * Called before deduplication so that code-based matching can work.
 *
 * @param {Object} parsedData — the full parsed data object
 * @returns {Object} — same object with all records enriched
 */
export function enrichAllRecords(parsedData) {
  if (!parsedData) return parsedData

  const enriched = { ...parsedData }
  const categoryMap = {
    medications:   'medications',
    results:       'results',
    conditions:    'conditions',
    allergies:     'allergies',
    orders:        'orders',
    immunizations: 'immunizations',
    vitals:        'vitals',
  }

  for (const [key, category] of Object.entries(categoryMap)) {
    if (Array.isArray(enriched[key])) {
      enriched[key] = enriched[key].map(r => enrichRecord(r, category))
    }
  }

  return enriched
}
