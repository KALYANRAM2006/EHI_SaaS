// ═══════════════════════════════════════════════════════════════════════════════
// Medical NLP — Abbreviation Expansion, Spelling Correction, Drug Normalisation
// ═══════════════════════════════════════════════════════════════════════════════
//
// 100% client-side. No data leaves the browser.
//
// Pipeline:
//   1. expandAbbreviations()  — medical shorthand → full terms
//   2. correctSpelling()      — fuzzy-match common OCR mis-reads
//   3. normalizeDrugNames()   — brand → generic, dose standardisation
//   4. normalizeLabNames()    — common aliases → canonical lab test names
//   5. normalizeText()        — orchestrator that runs all stages
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. MEDICAL ABBREVIATION DICTIONARY
// ─────────────────────────────────────────────────────────────────────────────

const ABBREVIATIONS = {
  // Vitals & Measurements
  'bp':    'blood pressure',
  'hr':    'heart rate',
  'rr':    'respiratory rate',
  'temp':  'temperature',
  'wt':    'weight',
  'ht':    'height',
  'bmi':   'body mass index',
  'spo2':  'oxygen saturation',
  'o2sat': 'oxygen saturation',
  'o2':    'oxygen',

  // Frequency / Timing
  'bid':   'twice daily',
  'tid':   'three times daily',
  'qid':   'four times daily',
  'qd':    'once daily',
  'qhs':   'at bedtime',
  'qam':   'every morning',
  'qpm':   'every evening',
  'prn':   'as needed',
  'stat':  'immediately',
  'ac':    'before meals',
  'pc':    'after meals',
  'hs':    'at bedtime',
  'q4h':   'every 4 hours',
  'q6h':   'every 6 hours',
  'q8h':   'every 8 hours',
  'q12h':  'every 12 hours',

  // Routes
  'po':    'by mouth',
  'iv':    'intravenous',
  'im':    'intramuscular',
  'sq':    'subcutaneous',
  'subq':  'subcutaneous',
  'sl':    'sublingual',
  'pr':    'per rectum',
  'inh':   'inhaled',
  'top':   'topical',
  'od':    'right eye',
  'os':    'left eye',
  'ou':    'both eyes',

  // Units
  'mg':    'milligrams',
  'mcg':   'micrograms',
  'ml':    'milliliters',
  'meq':   'milliequivalents',
  'iu':    'international units',

  // Diagnoses & Conditions
  'htn':   'hypertension',
  'dm':    'diabetes mellitus',
  'dm2':   'type 2 diabetes mellitus',
  'dm1':   'type 1 diabetes mellitus',
  't2dm':  'type 2 diabetes mellitus',
  't1dm':  'type 1 diabetes mellitus',
  'chf':   'congestive heart failure',
  'cad':   'coronary artery disease',
  'afib':  'atrial fibrillation',
  'a-fib': 'atrial fibrillation',
  'copd':  'chronic obstructive pulmonary disease',
  'ckd':   'chronic kidney disease',
  'esrd':  'end stage renal disease',
  'gerd':  'gastroesophageal reflux disease',
  'uti':   'urinary tract infection',
  'dvt':   'deep vein thrombosis',
  'pe':    'pulmonary embolism',
  'tia':   'transient ischemic attack',
  'cva':   'cerebrovascular accident',
  'mi':    'myocardial infarction',
  'pvd':   'peripheral vascular disease',
  'pad':   'peripheral arterial disease',
  'ra':    'rheumatoid arthritis',
  'oa':    'osteoarthritis',
  'sle':   'systemic lupus erythematosus',
  'ms':    'multiple sclerosis',
  'osa':   'obstructive sleep apnea',
  'bph':   'benign prostatic hyperplasia',
  'ibs':   'irritable bowel syndrome',
  'ibd':   'inflammatory bowel disease',
  'uc':    'ulcerative colitis',
  'gout':  'gout',
  'ards':  'acute respiratory distress syndrome',
  'aki':   'acute kidney injury',
  'acs':   'acute coronary syndrome',
  'nstemi':'non-ST elevation myocardial infarction',
  'stemi': 'ST elevation myocardial infarction',

  // Lab & Diagnostic
  'cbc':   'complete blood count',
  'bmp':   'basic metabolic panel',
  'cmp':   'comprehensive metabolic panel',
  'lfts':  'liver function tests',
  'lft':   'liver function test',
  'rft':   'renal function test',
  'tsh':   'thyroid stimulating hormone',
  'hba1c': 'hemoglobin A1c',
  'a1c':   'hemoglobin A1c',
  'pt':    'prothrombin time',
  'inr':   'international normalized ratio',
  'ptt':   'partial thromboplastin time',
  'aptt':  'activated partial thromboplastin time',
  'esr':   'erythrocyte sedimentation rate',
  'crp':   'c-reactive protein',
  'bnp':   'brain natriuretic peptide',
  'egfr':  'estimated glomerular filtration rate',
  'bun':   'blood urea nitrogen',
  'wbc':   'white blood cell count',
  'rbc':   'red blood cell count',
  'hgb':   'hemoglobin',
  'hb':    'hemoglobin',
  'hct':   'hematocrit',
  'plt':   'platelet count',
  'ldl':   'low-density lipoprotein',
  'hdl':   'high-density lipoprotein',
  'alt':   'alanine aminotransferase',
  'ast':   'aspartate aminotransferase',
  'alp':   'alkaline phosphatase',
  'ggt':   'gamma-glutamyl transferase',
  'psa':   'prostate-specific antigen',
  'ua':    'urinalysis',
  'abg':   'arterial blood gas',

  // Procedures & Imaging
  'ekg':   'electrocardiogram',
  'ecg':   'electrocardiogram',
  'echo':  'echocardiogram',
  'cxr':   'chest x-ray',
  'ct':    'computed tomography',
  'mri':   'magnetic resonance imaging',
  'us':    'ultrasound',
  'ercp':  'endoscopic retrograde cholangiopancreatography',
  'egd':   'esophagogastroduodenoscopy',
  'cabg':  'coronary artery bypass graft',
  'pci':   'percutaneous coronary intervention',
  'turp':  'transurethral resection of prostate',
  'tavr':  'transcatheter aortic valve replacement',

  // Clinical terms
  'nkda':  'no known drug allergies',
  'nka':   'no known allergies',
  'sob':   'shortness of breath',
  'cp':    'chest pain',
  'abd':   'abdominal',
  'ha':    'headache',
  'n/v':   'nausea/vomiting',
  'n&v':   'nausea and vomiting',
  'loc':   'loss of consciousness',
  'rom':   'range of motion',
  'wdwn':  'well developed well nourished',
  'wnl':   'within normal limits',
  'nad':   'no acute distress',
  'heent': 'head, eyes, ears, nose, throat',
  'perrla':'pupils equal round reactive to light and accommodation',
  'ctab':  'clear to auscultation bilaterally',
  'rrr':   'regular rate and rhythm',
  'ntnd':  'non-tender non-distended',
  's1s2':  'first and second heart sounds',
  'a&o':   'alert and oriented',
  'aox3':  'alert and oriented times 3',
  'dx':    'diagnosis',
  'hx':    'history',
  'sx':    'symptoms',
  'tx':    'treatment',
  'rx':    'prescription',
  'fx':    'fracture',
  'cx':    'culture',
  'bx':    'biopsy',
  'h&p':   'history and physical',
  'ros':   'review of systems',
  'pmh':   'past medical history',
  'psh':   'past surgical history',
  'fh':    'family history',
  'sh':    'social history',
  'cc':    'chief complaint',
  'hpi':   'history of present illness',

  // Departments / Settings
  'ed':    'emergency department',
  'er':    'emergency room',
  'icu':   'intensive care unit',
  'nicu':  'neonatal intensive care unit',
  'picu':  'pediatric intensive care unit',
  'or':    'operating room',
  'pacu':  'post-anesthesia care unit',
  'snf':   'skilled nursing facility',
  'ltac':  'long-term acute care',
}

/**
 * Expand medical abbreviations found in text.
 * Preserves original case and adds expanded form in brackets.
 *
 * @param {string} text - Raw or OCR-extracted text
 * @returns {{ text: string, expansions: Array<{abbr: string, full: string, position: number}> }}
 */
export function expandAbbreviations(text) {
  if (!text) return { text: '', expansions: [] }

  const expansions = []
  let result = text

  // Sort by length descending so longer abbreviations match first
  const sortedAbbrs = Object.entries(ABBREVIATIONS)
    .sort((a, b) => b[0].length - a[0].length)

  for (const [abbr, full] of sortedAbbrs) {
    // Match whole-word abbreviations (case-insensitive)
    const regex = new RegExp(`\\b${escapeRegex(abbr)}\\b`, 'gi')
    let match
    while ((match = regex.exec(result)) !== null) {
      // Don't expand if it's already part of a longer word or already expanded
      const afterChar = result[match.index + match[0].length] || ''
      if (afterChar === '[') continue // already expanded

      expansions.push({
        abbr: match[0],
        full,
        position: match.index,
      })
    }

    // Replace with expanded form: "HTN" → "HTN [hypertension]"
    result = result.replace(regex, (m) => `${m} [${full}]`)
  }

  return { text: result, expansions }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. OCR SPELLING CORRECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Common OCR mis-reads of medical terms.
 * Key = wrong spelling, Value = correct spelling.
 */
const OCR_CORRECTIONS = {
  // Common character confusions (0/O, 1/l/I, 5/S, 8/B, etc.)
  'hypertens1on': 'hypertension',
  'hypertensi0n': 'hypertension',
  'diab3tes':     'diabetes',
  'diabet3s':     'diabetes',
  'diabates':     'diabetes',
  'diabeties':    'diabetes',
  'metf0rmin':    'metformin',
  'metforrnin':   'metformin',
  'lisin0pril':   'lisinopril',
  'lisinopri1':   'lisinopril',
  'atorvastafin': 'atorvastatin',
  'atorvastatn':  'atorvastatin',
  'arnlodipine':  'amlodipine',
  'aml0dipine':   'amlodipine',
  'omepraz0le':   'omeprazole',
  'omeprazo1e':   'omeprazole',
  'gabapenfin':   'gabapentin',
  'gabapent1n':   'gabapentin',
  'serf raline':  'sertraline',
  'sertral1ne':   'sertraline',
  'levothyrox1ne':'levothyroxine',
  'levothyroxme': 'levothyroxine',
  'hydroch1orothiazide': 'hydrochlorothiazide',
  'hydrochloroth1azide': 'hydrochlorothiazide',
  'pantopraz0le': 'pantoprazole',
  'losarfan':     'losartan',
  'l0sartan':     'losartan',
  'rosuvastatn':  'rosuvastatin',
  'rosuvastafin': 'rosuvastatin',
  'prednisone':   'prednisone',
  'predn1sone':   'prednisone',
  'furosem1de':   'furosemide',
  'furosernide':  'furosemide',
  'clopidogre1':  'clopidogrel',
  'clopidogrel':  'clopidogrel',
  'warfar1n':     'warfarin',
  'warf arin':    'warfarin',
  'insu1in':      'insulin',
  'insul1n':      'insulin',
  'a1buterol':    'albuterol',
  'albutero1':    'albuterol',
  'aspirn':       'aspirin',
  'aspirln':      'aspirin',
  'acetam1nophen':'acetaminophen',
  'acetaminoplen':'acetaminophen',
  'ibupro fen':   'ibuprofen',
  'ibupr0fen':    'ibuprofen',
  'amoxici11in':  'amoxicillin',
  'arnoxicillin': 'amoxicillin',

  // Common mis-spellings of conditions
  'hypertenshion':'hypertension',
  'hyper tension':'hypertension',
  'diabetis':     'diabetes',
  'diabeetes':    'diabetes',
  'hyperlipedemia':'hyperlipidemia',
  'hyperlipidemla':'hyperlipidemia',
  'hypothyrodism':'hypothyroidism',
  'hypothyr0idism':'hypothyroidism',
  'osteoarth ritis':'osteoarthritis',
  'osteoarthr1tis':'osteoarthritis',
  'pneumon1a':    'pneumonia',
  'pneumonla':    'pneumonia',
  'bronch1tis':   'bronchitis',
  'bronchlfis':   'bronchitis',
  'cholecystltis':'cholecystitis',
  'appendicltis': 'appendicitis',
  'diverticul1tis':'diverticulitis',
  'pancreat1tis': 'pancreatitis',
  'cellu1itis':   'cellulitis',
  'cellullfis':   'cellulitis',
  'anem1a':       'anemia',
  'anernia':      'anemia',
  'fibromy algia':'fibromyalgia',
  'fibrornyalgia':'fibromyalgia',

  // Lab terms
  'hemog1obin':   'hemoglobin',
  'bemoglobin':   'hemoglobin',
  'hernatocrit':  'hematocrit',
  'hernatocnt':   'hematocrit',
  'p1atelets':    'platelets',
  'plale1ets':    'platelets',
  'creafinine':   'creatinine',
  'creatimne':    'creatinine',
  'g1ucose':      'glucose',
  'gluc0se':      'glucose',
  'cho1esterol':  'cholesterol',
  'cholestera1':  'cholesterol',
  'triglycendes': 'triglycerides',
  'triglycerldes':'triglycerides',
}

/**
 * Correct common OCR mis-reads of medical terms.
 *
 * @param {string} text - OCR-extracted text
 * @returns {{ text: string, corrections: Array<{original: string, corrected: string}> }}
 */
export function correctSpelling(text) {
  if (!text) return { text: '', corrections: [] }

  const corrections = []
  let result = text

  for (const [wrong, correct] of Object.entries(OCR_CORRECTIONS)) {
    const regex = new RegExp(escapeRegex(wrong), 'gi')
    if (regex.test(result)) {
      corrections.push({ original: wrong, corrected: correct })
      result = result.replace(regex, correct)
    }
  }

  return { text: result, corrections }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DRUG NAME NORMALISATION — Brand → Generic + RxNorm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Local drug dictionary: brand name → { generic, rxcui, drugClass }
 * RxNorm CUI (RxCUI) is the NLM standard identifier.
 */
const DRUG_DICTIONARY = {
  // Cardiovascular
  'lipitor':     { generic: 'atorvastatin',  rxcui: '83367',  drugClass: 'HMG-CoA Reductase Inhibitor' },
  'crestor':     { generic: 'rosuvastatin',  rxcui: '301542', drugClass: 'HMG-CoA Reductase Inhibitor' },
  'zocor':       { generic: 'simvastatin',   rxcui: '36567',  drugClass: 'HMG-CoA Reductase Inhibitor' },
  'pravachol':   { generic: 'pravastatin',   rxcui: '42463',  drugClass: 'HMG-CoA Reductase Inhibitor' },
  'norvasc':     { generic: 'amlodipine',    rxcui: '17767',  drugClass: 'Calcium Channel Blocker' },
  'prinivil':    { generic: 'lisinopril',    rxcui: '29046',  drugClass: 'ACE Inhibitor' },
  'zestril':     { generic: 'lisinopril',    rxcui: '29046',  drugClass: 'ACE Inhibitor' },
  'cozaar':      { generic: 'losartan',      rxcui: '52175',  drugClass: 'ARB' },
  'diovan':      { generic: 'valsartan',     rxcui: '69749',  drugClass: 'ARB' },
  'toprol':      { generic: 'metoprolol',    rxcui: '6918',   drugClass: 'Beta Blocker' },
  'toprol xl':   { generic: 'metoprolol succinate', rxcui: '866924', drugClass: 'Beta Blocker' },
  'lopressor':   { generic: 'metoprolol tartrate',  rxcui: '866508', drugClass: 'Beta Blocker' },
  'coreg':       { generic: 'carvedilol',    rxcui: '20352',  drugClass: 'Beta Blocker' },
  'lasix':       { generic: 'furosemide',    rxcui: '4603',   drugClass: 'Loop Diuretic' },
  'plavix':      { generic: 'clopidogrel',   rxcui: '32968',  drugClass: 'Antiplatelet' },
  'eliquis':     { generic: 'apixaban',      rxcui: '1364430',drugClass: 'Anticoagulant (DOAC)' },
  'xarelto':     { generic: 'rivaroxaban',   rxcui: '1114195',drugClass: 'Anticoagulant (DOAC)' },
  'coumadin':    { generic: 'warfarin',      rxcui: '11289',  drugClass: 'Anticoagulant' },
  'lovenox':     { generic: 'enoxaparin',    rxcui: '67108',  drugClass: 'Anticoagulant (LMWH)' },

  // Diabetes
  'glucophage':  { generic: 'metformin',     rxcui: '6809',   drugClass: 'Biguanide' },
  'januvia':     { generic: 'sitagliptin',   rxcui: '593411', drugClass: 'DPP-4 Inhibitor' },
  'jardiance':   { generic: 'empagliflozin', rxcui: '1545653',drugClass: 'SGLT2 Inhibitor' },
  'farxiga':     { generic: 'dapagliflozin', rxcui: '1488564',drugClass: 'SGLT2 Inhibitor' },
  'trulicity':   { generic: 'dulaglutide',   rxcui: '1551291',drugClass: 'GLP-1 Receptor Agonist' },
  'ozempic':     { generic: 'semaglutide',   rxcui: '1991302',drugClass: 'GLP-1 Receptor Agonist' },
  'lantus':      { generic: 'insulin glargine', rxcui: '261551', drugClass: 'Insulin (Long-Acting)' },
  'humalog':     { generic: 'insulin lispro', rxcui: '86009',  drugClass: 'Insulin (Rapid-Acting)' },
  'novolog':     { generic: 'insulin aspart', rxcui: '86009',  drugClass: 'Insulin (Rapid-Acting)' },
  'levemir':     { generic: 'insulin detemir',rxcui: '847187', drugClass: 'Insulin (Long-Acting)' },

  // GI
  'prilosec':    { generic: 'omeprazole',    rxcui: '7646',   drugClass: 'Proton Pump Inhibitor' },
  'nexium':      { generic: 'esomeprazole',  rxcui: '283742', drugClass: 'Proton Pump Inhibitor' },
  'protonix':    { generic: 'pantoprazole',  rxcui: '40790',  drugClass: 'Proton Pump Inhibitor' },
  'pepcid':      { generic: 'famotidine',    rxcui: '4278',   drugClass: 'H2 Receptor Antagonist' },
  'zantac':      { generic: 'ranitidine',    rxcui: '9143',   drugClass: 'H2 Receptor Antagonist' },

  // Psychiatric / Neuro
  'zoloft':      { generic: 'sertraline',    rxcui: '36437',  drugClass: 'SSRI' },
  'lexapro':     { generic: 'escitalopram',  rxcui: '321988', drugClass: 'SSRI' },
  'prozac':      { generic: 'fluoxetine',    rxcui: '4493',   drugClass: 'SSRI' },
  'paxil':       { generic: 'paroxetine',    rxcui: '32937',  drugClass: 'SSRI' },
  'celexa':      { generic: 'citalopram',    rxcui: '2556',   drugClass: 'SSRI' },
  'effexor':     { generic: 'venlafaxine',   rxcui: '39786',  drugClass: 'SNRI' },
  'cymbalta':    { generic: 'duloxetine',    rxcui: '72625',  drugClass: 'SNRI' },
  'wellbutrin':  { generic: 'bupropion',     rxcui: '42347',  drugClass: 'NDRI' },
  'neurontin':   { generic: 'gabapentin',    rxcui: '25480',  drugClass: 'Anticonvulsant (Gabapentinoid)' },
  'lyrica':      { generic: 'pregabalin',    rxcui: '187832', drugClass: 'Anticonvulsant (Gabapentinoid)' },
  'ambien':      { generic: 'zolpidem',      rxcui: '39993',  drugClass: 'Sedative-Hypnotic' },
  'xanax':       { generic: 'alprazolam',    rxcui: '596',    drugClass: 'Benzodiazepine' },
  'ativan':      { generic: 'lorazepam',     rxcui: '6470',   drugClass: 'Benzodiazepine' },
  'klonopin':    { generic: 'clonazepam',    rxcui: '2598',   drugClass: 'Benzodiazepine' },
  'valium':      { generic: 'diazepam',      rxcui: '3322',   drugClass: 'Benzodiazepine' },
  'seroquel':    { generic: 'quetiapine',    rxcui: '51272',  drugClass: 'Atypical Antipsychotic' },
  'abilify':     { generic: 'aripiprazole',  rxcui: '89013',  drugClass: 'Atypical Antipsychotic' },
  'zyprexa':     { generic: 'olanzapine',    rxcui: '61381',  drugClass: 'Atypical Antipsychotic' },
  'risperdal':   { generic: 'risperidone',   rxcui: '35636',  drugClass: 'Atypical Antipsychotic' },
  'depakote':    { generic: 'divalproex sodium', rxcui: '31914', drugClass: 'Anticonvulsant' },
  'lamictal':    { generic: 'lamotrigine',   rxcui: '28439',  drugClass: 'Anticonvulsant' },
  'topamax':     { generic: 'topiramate',    rxcui: '38404',  drugClass: 'Anticonvulsant' },
  'aricept':     { generic: 'donepezil',     rxcui: '135447', drugClass: 'Cholinesterase Inhibitor' },
  'namenda':     { generic: 'memantine',     rxcui: '6719',   drugClass: 'NMDA Antagonist' },

  // Respiratory
  'ventolin':    { generic: 'albuterol',     rxcui: '435',    drugClass: 'Short-Acting Beta Agonist' },
  'proventil':   { generic: 'albuterol',     rxcui: '435',    drugClass: 'Short-Acting Beta Agonist' },
  'proair':      { generic: 'albuterol',     rxcui: '435',    drugClass: 'Short-Acting Beta Agonist' },
  'flovent':     { generic: 'fluticasone',   rxcui: '202520', drugClass: 'Inhaled Corticosteroid' },
  'advair':      { generic: 'fluticasone/salmeterol', rxcui: '896209', drugClass: 'ICS/LABA Combination' },
  'symbicort':   { generic: 'budesonide/formoterol', rxcui: '896212', drugClass: 'ICS/LABA Combination' },
  'spiriva':     { generic: 'tiotropium',    rxcui: '274766', drugClass: 'Long-Acting Muscarinic Antagonist' },
  'singulair':   { generic: 'montelukast',   rxcui: '88249',  drugClass: 'Leukotriene Receptor Antagonist' },

  // Pain
  'tylenol':     { generic: 'acetaminophen', rxcui: '161',    drugClass: 'Analgesic' },
  'advil':       { generic: 'ibuprofen',     rxcui: '5640',   drugClass: 'NSAID' },
  'motrin':      { generic: 'ibuprofen',     rxcui: '5640',   drugClass: 'NSAID' },
  'aleve':       { generic: 'naproxen',      rxcui: '7258',   drugClass: 'NSAID' },
  'celebrex':    { generic: 'celecoxib',     rxcui: '140587', drugClass: 'COX-2 Inhibitor' },
  'mobic':       { generic: 'meloxicam',     rxcui: '41493',  drugClass: 'NSAID' },
  'ultram':      { generic: 'tramadol',      rxcui: '10689',  drugClass: 'Opioid Analgesic' },
  'percocet':    { generic: 'oxycodone/acetaminophen', rxcui: '7804', drugClass: 'Opioid Analgesic' },
  'vicodin':     { generic: 'hydrocodone/acetaminophen', rxcui: '856903', drugClass: 'Opioid Analgesic' },
  'norco':       { generic: 'hydrocodone/acetaminophen', rxcui: '856903', drugClass: 'Opioid Analgesic' },
  'flexeril':    { generic: 'cyclobenzaprine', rxcui:'3112',  drugClass: 'Muscle Relaxant' },

  // Thyroid
  'synthroid':   { generic: 'levothyroxine', rxcui: '10582',  drugClass: 'Thyroid Hormone' },
  'levoxyl':     { generic: 'levothyroxine', rxcui: '10582',  drugClass: 'Thyroid Hormone' },
  'armour thyroid': { generic: 'thyroid desiccated', rxcui: '10541', drugClass: 'Thyroid Hormone' },

  // Urological
  'flomax':      { generic: 'tamsulosin',    rxcui: '77492',  drugClass: 'Alpha Blocker' },

  // Anti-infective
  'augmentin':   { generic: 'amoxicillin/clavulanate', rxcui: '391874', drugClass: 'Penicillin Antibiotic' },
  'zithromax':   { generic: 'azithromycin',  rxcui: '18631',  drugClass: 'Macrolide Antibiotic' },
  'z-pack':      { generic: 'azithromycin',  rxcui: '18631',  drugClass: 'Macrolide Antibiotic' },
  'cipro':       { generic: 'ciprofloxacin', rxcui: '2551',   drugClass: 'Fluoroquinolone' },
  'levaquin':    { generic: 'levofloxacin',  rxcui: '82122',  drugClass: 'Fluoroquinolone' },
  'bactrim':     { generic: 'sulfamethoxazole/trimethoprim', rxcui: '10180', drugClass: 'Sulfonamide' },
  'keflex':      { generic: 'cephalexin',    rxcui: '2231',   drugClass: 'Cephalosporin' },
  'diflucan':    { generic: 'fluconazole',   rxcui: '4450',   drugClass: 'Antifungal' },
  'valtrex':     { generic: 'valacyclovir',  rxcui: '69417',  drugClass: 'Antiviral' },

  // Miscellaneous
  'desyrel':     { generic: 'trazodone',     rxcui: '10737',  drugClass: 'Sedating Antidepressant' },
  'colace':      { generic: 'docusate sodium', rxcui: '3533', drugClass: 'Stool Softener' },
  'miralax':     { generic: 'polyethylene glycol 3350', rxcui: '44479', drugClass: 'Osmotic Laxative' },
  'zyrtec':      { generic: 'cetirizine',    rxcui: '20610',  drugClass: 'Antihistamine' },
  'claritin':    { generic: 'loratadine',    rxcui: '28889',  drugClass: 'Antihistamine' },
  'allegra':     { generic: 'fexofenadine',  rxcui: '26314',  drugClass: 'Antihistamine' },
  'benadryl':    { generic: 'diphenhydramine', rxcui: '3498', drugClass: 'Antihistamine (1st Gen)' },
  'flonase':     { generic: 'fluticasone nasal', rxcui: '202520', drugClass: 'Intranasal Corticosteroid' },
  'nasonex':     { generic: 'mometasone nasal', rxcui: '52959', drugClass: 'Intranasal Corticosteroid' },
  'restasis':    { generic: 'cyclosporine ophthalmic', rxcui: '2555', drugClass: 'Immunomodulator (Ophthalmic)' },
}

/**
 * Build a reverse lookup: generic name → brand entry for quick access
 */
const GENERIC_TO_RXCUI = {}
for (const [brand, info] of Object.entries(DRUG_DICTIONARY)) {
  const gen = info.generic.toLowerCase()
  if (!GENERIC_TO_RXCUI[gen]) {
    GENERIC_TO_RXCUI[gen] = { rxcui: info.rxcui, drugClass: info.drugClass, brand }
  }
}

/**
 * Normalise a drug name: resolve brand→generic, attach RxCUI & drug class.
 *
 * @param {string} rawName - Drug name from OCR or structured data (e.g. "Lipitor 40mg daily")
 * @returns {NormalizedDrug}
 *
 * @typedef {Object} NormalizedDrug
 * @property {string} original       - Original input
 * @property {string} normalized     - Cleaned generic name
 * @property {string} brand          - Brand name (if detected)
 * @property {string|null} rxcui     - RxNorm CUI
 * @property {string} drugClass      - Pharmacological class
 * @property {string} dose           - Extracted dose (e.g. "40mg")
 * @property {string} frequency      - Extracted frequency (e.g. "daily")
 * @property {string} route          - Extracted route (e.g. "PO")
 * @property {number} confidence     - 0-1 confidence in mapping
 */
export function normalizeDrugName(rawName) {
  if (!rawName) return null

  const original = rawName.trim()
  const lower = original.toLowerCase()

  // Extract dose, frequency, route from the string
  const doseMatch = lower.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|units?|iu|meq|%|g)\b)/i)
  const freqMatch = lower.match(/\b(daily|bid|tid|qid|prn|qhs|qam|qpm|once|twice|q\d+h|weekly|monthly|every\s+\d+\s+(?:hours?|days?|weeks?))\b/i)
  const routeMatch = lower.match(/\b(po|iv|im|sq|subq|sl|pr|inh|inhaled|topical|ophthalmic|otic|nasal|rectal|transdermal|patch)\b/i)

  const dose = doseMatch ? doseMatch[1].trim() : ''
  const frequency = freqMatch ? freqMatch[1].trim() : ''
  const route = routeMatch ? routeMatch[1].trim().toUpperCase() : ''

  // Extract drug name (before dose/freq/route)
  let drugToken = lower
    .replace(/\d+(?:\.\d+)?\s*(?:mg|mcg|ml|units?|iu|meq|%|g)\b/gi, '')
    .replace(/\b(?:daily|bid|tid|qid|prn|qhs|qam|qpm|once|twice|q\d+h|weekly|monthly)\b/gi, '')
    .replace(/\b(?:po|iv|im|sq|subq|sl|pr|inh|inhaled|topical|ophthalmic|otic|nasal|rectal|transdermal|patch)\b/gi, '')
    .replace(/[,;:\-()]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

  // Check brand name dictionary
  for (const [brand, info] of Object.entries(DRUG_DICTIONARY)) {
    if (drugToken.includes(brand)) {
      return {
        original,
        normalized: info.generic,
        brand,
        rxcui: info.rxcui,
        drugClass: info.drugClass,
        dose,
        frequency,
        route,
        confidence: 0.95,
      }
    }
  }

  // Check generic name dictionary
  for (const [gen, info] of Object.entries(GENERIC_TO_RXCUI)) {
    if (drugToken.includes(gen)) {
      return {
        original,
        normalized: gen,
        brand: info.brand || '',
        rxcui: info.rxcui,
        drugClass: info.drugClass,
        dose,
        frequency,
        route,
        confidence: 0.9,
      }
    }
  }

  // Fuzzy match — try edit distance ≤ 2 for known drug names
  const allDrugNames = [
    ...Object.keys(DRUG_DICTIONARY),
    ...Object.keys(GENERIC_TO_RXCUI),
  ]
  const fuzzyMatch = findClosestMatch(drugToken, allDrugNames, 2)
  if (fuzzyMatch) {
    const info = DRUG_DICTIONARY[fuzzyMatch] || GENERIC_TO_RXCUI[fuzzyMatch]
    if (info) {
      const isGeneric = !!GENERIC_TO_RXCUI[fuzzyMatch]
      return {
        original,
        normalized: isGeneric ? fuzzyMatch : info.generic,
        brand: isGeneric ? (info.brand || '') : fuzzyMatch,
        rxcui: info.rxcui,
        drugClass: info.drugClass,
        dose,
        frequency,
        route,
        confidence: 0.7,
      }
    }
  }

  // No match — return cleaned original
  return {
    original,
    normalized: drugToken || original,
    brand: '',
    rxcui: null,
    drugClass: '',
    dose,
    frequency,
    route,
    confidence: 0.3,
  }
}

/**
 * Normalise an array of medication entities (from OCR extraction).
 *
 * @param {Array<{name: string, source: string, confidence: string}>} medications
 * @returns {Array} Normalised medications with RxNorm data
 */
export function normalizeMedications(medications) {
  if (!medications || medications.length === 0) return []

  return medications.map(med => {
    const normalized = normalizeDrugName(med.name)
    return {
      ...med,
      name: normalized.normalized + (normalized.dose ? ` ${normalized.dose}` : ''),
      originalName: med.name,
      rxcui: normalized.rxcui,
      drugClass: normalized.drugClass,
      brand: normalized.brand,
      dose: normalized.dose,
      frequency: normalized.frequency,
      route: normalized.route,
      normConfidence: normalized.confidence,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LAB NAME NORMALISATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Common lab aliases → canonical name.
 * Multiple OCR-variant or informal names map to one standard name.
 */
const LAB_NAME_ALIASES = {
  // Hematology
  'white blood cells':    'WBC',
  'white blood cell':     'WBC',
  'white cell count':     'WBC',
  'white count':          'WBC',
  'wbc count':            'WBC',
  'leukocytes':           'WBC',
  'red blood cells':      'RBC',
  'red blood cell':       'RBC',
  'red cell count':       'RBC',
  'erythrocytes':         'RBC',
  'hemoglobin':           'Hemoglobin',
  'hgb':                  'Hemoglobin',
  'hb':                   'Hemoglobin',
  'haemoglobin':          'Hemoglobin',
  'hematocrit':           'Hematocrit',
  'hct':                  'Hematocrit',
  'packed cell volume':   'Hematocrit',
  'platelet count':       'Platelets',
  'platelets':            'Platelets',
  'plt':                  'Platelets',
  'thrombocytes':         'Platelets',
  'mean corpuscular volume': 'MCV',
  'mcv':                  'MCV',

  // Chemistry
  'blood glucose':        'Glucose',
  'fasting glucose':      'Glucose',
  'blood sugar':          'Glucose',
  'fbg':                  'Glucose',
  'random glucose':       'Glucose',
  'glucose level':        'Glucose',
  'hemoglobin a1c':       'HbA1c',
  'hba1c':                'HbA1c',
  'a1c':                  'HbA1c',
  'glycated hemoglobin':  'HbA1c',
  'glycosylated hemoglobin': 'HbA1c',
  'blood urea nitrogen':  'BUN',
  'bun':                  'BUN',
  'urea nitrogen':        'BUN',
  'creatinine':           'Creatinine',
  'creat':                'Creatinine',
  'serum creatinine':     'Creatinine',
  'estimated gfr':        'eGFR',
  'egfr':                 'eGFR',
  'glomerular filtration rate': 'eGFR',
  'gfr':                  'eGFR',
  'sodium':               'Sodium',
  'na':                   'Sodium',
  'serum sodium':         'Sodium',
  'potassium':            'Potassium',
  'k':                    'Potassium',
  'serum potassium':      'Potassium',
  'chloride':             'Chloride',
  'cl':                   'Chloride',
  'bicarbonate':          'Bicarbonate',
  'co2':                  'CO2',
  'carbon dioxide':       'CO2',
  'calcium':              'Calcium',
  'ca':                   'Calcium',
  'serum calcium':        'Calcium',
  'magnesium':            'Magnesium',
  'mg level':             'Magnesium',
  'phosphorus':           'Phosphorus',
  'phosphate':            'Phosphorus',

  // Liver
  'alanine aminotransferase': 'ALT',
  'alt':                  'ALT',
  'sgpt':                 'ALT',
  'aspartate aminotransferase': 'AST',
  'ast':                  'AST',
  'sgot':                 'AST',
  'alkaline phosphatase': 'ALP',
  'alk phos':             'ALP',
  'alp':                  'ALP',
  'total bilirubin':      'Total Bilirubin',
  'bilirubin total':      'Total Bilirubin',
  'tbili':                'Total Bilirubin',
  'direct bilirubin':     'Direct Bilirubin',
  'dbili':                'Direct Bilirubin',
  'albumin':              'Albumin',
  'alb':                  'Albumin',
  'total protein':        'Total Protein',
  'ggt':                  'GGT',
  'gamma gt':             'GGT',
  'gamma-glutamyl transferase': 'GGT',

  // Lipids
  'total cholesterol':    'Total Cholesterol',
  'cholesterol':          'Total Cholesterol',
  'cholesterol total':    'Total Cholesterol',
  'ldl cholesterol':      'LDL',
  'ldl':                  'LDL',
  'ldl-c':                'LDL',
  'low density lipoprotein': 'LDL',
  'hdl cholesterol':      'HDL',
  'hdl':                  'HDL',
  'hdl-c':                'HDL',
  'high density lipoprotein': 'HDL',
  'triglycerides':        'Triglycerides',
  'tg':                   'Triglycerides',
  'trigs':                'Triglycerides',

  // Thyroid
  'tsh':                  'TSH',
  'thyroid stimulating hormone': 'TSH',
  'free t4':              'Free T4',
  'ft4':                  'Free T4',
  'thyroxine free':       'Free T4',
  'free t3':              'Free T3',
  'ft3':                  'Free T3',

  // Coagulation
  'prothrombin time':     'PT',
  'pt':                   'PT',
  'pro time':             'PT',
  'inr':                  'INR',
  'international normalized ratio': 'INR',
  'ptt':                  'PTT',
  'partial thromboplastin time': 'PTT',
  'aptt':                 'aPTT',

  // Inflammatory
  'c-reactive protein':   'CRP',
  'crp':                  'CRP',
  'erythrocyte sedimentation rate': 'ESR',
  'esr':                  'ESR',
  'sed rate':             'ESR',
  'procalcitonin':        'Procalcitonin',

  // Cardiac
  'troponin':             'Troponin',
  'troponin i':           'Troponin I',
  'troponin t':           'Troponin T',
  'bnp':                  'BNP',
  'brain natriuretic peptide': 'BNP',
  'nt-probnp':            'NT-proBNP',
  'pro-bnp':              'NT-proBNP',

  // Urinalysis
  'urinalysis':           'Urinalysis',
  'ua':                   'Urinalysis',
  'urine analysis':       'Urinalysis',

  // Tumor markers
  'prostate specific antigen': 'PSA',
  'psa':                  'PSA',
  'cea':                  'CEA',
  'carcinoembryonic antigen': 'CEA',
  'ca-125':               'CA-125',
  'ca 125':               'CA-125',

  // Iron
  'ferritin':             'Ferritin',
  'iron':                 'Iron',
  'serum iron':           'Iron',
  'tibc':                 'TIBC',
  'total iron binding':   'TIBC',
  'transferrin':          'Transferrin',
  'transferrin saturation': 'Transferrin Sat',

  // Vitamins
  'vitamin d':            'Vitamin D',
  '25-hydroxy vitamin d': 'Vitamin D',
  'vit d':                'Vitamin D',
  'vitamin b12':          'Vitamin B12',
  'b12':                  'Vitamin B12',
  'folate':               'Folate',
  'folic acid':           'Folate',
}

/**
 * Normalise a lab/test name to its canonical form.
 *
 * @param {string} rawName - Lab name from OCR or structured data
 * @returns {{ normalized: string, original: string, matched: boolean }}
 */
export function normalizeLabName(rawName) {
  if (!rawName) return { normalized: rawName, original: rawName, matched: false }

  const lower = rawName.trim().toLowerCase()

  // Direct lookup
  if (LAB_NAME_ALIASES[lower]) {
    return { normalized: LAB_NAME_ALIASES[lower], original: rawName, matched: true }
  }

  // Partial match — check if the raw name contains any alias
  for (const [alias, canonical] of Object.entries(LAB_NAME_ALIASES)) {
    if (lower.includes(alias)) {
      return { normalized: canonical, original: rawName, matched: true }
    }
  }

  // No match — return capitalised original
  return {
    normalized: rawName.trim(),
    original: rawName,
    matched: false,
  }
}

/**
 * Normalise an array of lab results (from OCR extraction).
 */
export function normalizeLabResults(labResults) {
  if (!labResults || labResults.length === 0) return []

  return labResults.map(lab => {
    const norm = normalizeLabName(lab.name)
    return {
      ...lab,
      name: norm.normalized,
      originalName: lab.name,
      nameNormalized: norm.matched,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ORCHESTRATOR — Run full NLP pipeline on extracted text
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the full medical NLP normalisation pipeline on OCR-extracted text.
 *
 * @param {string} rawText - Raw text from OCR/PDF extraction
 * @returns {NLPResult}
 *
 * @typedef {Object} NLPResult
 * @property {string} processedText    - Text after abbreviation expansion + spell correction
 * @property {Array} expansions        - Abbreviation expansions applied
 * @property {Array} corrections       - Spelling corrections applied
 * @property {number} expansionCount
 * @property {number} correctionCount
 */
export function normalizeText(rawText) {
  if (!rawText) {
    return {
      processedText: '',
      expansions: [],
      corrections: [],
      expansionCount: 0,
      correctionCount: 0,
    }
  }

  // Stage 1: Spelling correction (before abbreviation to fix OCR errors first)
  const spelling = correctSpelling(rawText)

  // Stage 2: Abbreviation expansion
  const abbrev = expandAbbreviations(spelling.text)

  return {
    processedText: abbrev.text,
    expansions: abbrev.expansions,
    corrections: spelling.corrections,
    expansionCount: abbrev.expansions.length,
    correctionCount: spelling.corrections.length,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Simple Levenshtein distance for fuzzy drug name matching.
 */
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

/**
 * Find the closest match in a list of candidates within maxDistance.
 */
function findClosestMatch(input, candidates, maxDistance = 2) {
  if (!input || input.length < 3) return null

  let best = null
  let bestDist = maxDistance + 1

  // Only compare first word / drug token
  const inputWord = input.split(/\s+/)[0].toLowerCase()
  if (inputWord.length < 3) return null

  for (const candidate of candidates) {
    const candWord = candidate.split(/\s+/)[0].toLowerCase()
    // Quick length filter — if lengths differ by > maxDistance, skip
    if (Math.abs(inputWord.length - candWord.length) > maxDistance) continue

    const dist = levenshtein(inputWord, candWord)
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }

  return bestDist <= maxDistance ? best : null
}
