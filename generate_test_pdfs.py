"""
Generate sample clinical PDF documents for Document Intelligence testing.
Creates realistic medical documents that the OCR + NLP pipeline can process.
"""
import os
from fpdf import FPDF

OUTPUT_DIR = r"C:\Users\jonnagadlar\OneDrive - Cedars-Sinai Health System\EHIgnite_Challenge\pdf"
os.makedirs(OUTPUT_DIR, exist_ok=True)


class ClinicalPDF(FPDF):
    """Base PDF with standard clinical document formatting."""

    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 6, "Cedars-Sinai Medical Center", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 8)
        self.cell(0, 4, "8700 Beverly Blvd, Los Angeles, CA 90048  |  (310) 423-3277", align="C", new_x="LMARGIN", new_y="NEXT")
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.cell(0, 10, f"Page {self.page_no()} | CONFIDENTIAL - Protected Health Information", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 12)
        self.set_fill_color(230, 240, 255)
        self.cell(0, 8, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def field(self, label, value):
        self.set_font("Helvetica", "B", 9)
        self.cell(50, 6, f"{label}:")
        self.set_font("Helvetica", "", 9)
        self.cell(0, 6, str(value), new_x="LMARGIN", new_y="NEXT")

    def body_text(self, text):
        self.set_font("Helvetica", "", 9)
        self.multi_cell(0, 5, text)
        self.ln(2)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Discharge Summary
# ─────────────────────────────────────────────────────────────────────────────
def create_discharge_summary():
    pdf = ClinicalPDF()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "DISCHARGE SUMMARY", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("Patient Information")
    pdf.field("Patient Name", "Sarah M. Johnson")
    pdf.field("Date of Birth", "03/15/1958")
    pdf.field("MRN", "CSM-2847561")
    pdf.field("Age", "67 years")
    pdf.field("Sex", "Female")
    pdf.field("Admission Date", "01/10/2026")
    pdf.field("Discharge Date", "01/15/2026")
    pdf.field("Attending Physician", "Dr. Michael Chen, MD")
    pdf.field("Primary Diagnosis", "Acute exacerbation of congestive heart failure (ICD-10: I50.21)")
    pdf.ln(4)

    pdf.section_title("History of Present Illness")
    pdf.body_text(
        "Mrs. Johnson is a 67-year-old female with a past medical history significant for "
        "congestive heart failure (CHF) with reduced ejection fraction (EF 35%), hypertension, "
        "type 2 diabetes mellitus, hyperlipidemia, and chronic kidney disease stage 3. "
        "She presented to the emergency department with a 3-day history of progressive dyspnea "
        "on exertion, orthopnea requiring 3-pillow elevation, and bilateral lower extremity edema. "
        "She reported a 6-pound weight gain over the prior week and decreased urine output."
    )

    pdf.section_title("Active Diagnoses")
    diagnoses = [
        "Congestive heart failure with reduced ejection fraction (HFrEF) - I50.21",
        "Essential hypertension - I10",
        "Type 2 diabetes mellitus without complications - E11.9",
        "Hyperlipidemia, unspecified - E78.5",
        "Chronic kidney disease, stage 3 - N18.3",
        "Atrial fibrillation, persistent - I48.1",
        "Obesity, BMI 32.4 - E66.01",
    ]
    for d in diagnoses:
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(6, 5, "-")
        pdf.cell(0, 5, d, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.section_title("Discharge Medications")
    meds = [
        ("Lisinopril", "20 mg", "PO daily", "Hypertension/CHF"),
        ("Metoprolol Succinate", "50 mg", "PO daily", "Heart rate control"),
        ("Furosemide", "40 mg", "PO twice daily", "Fluid overload"),
        ("Spironolactone", "25 mg", "PO daily", "CHF management"),
        ("Metformin", "1000 mg", "PO twice daily", "Type 2 diabetes"),
        ("Atorvastatin", "40 mg", "PO at bedtime", "Hyperlipidemia"),
        ("Warfarin", "5 mg", "PO daily", "Atrial fibrillation"),
        ("Potassium Chloride", "20 mEq", "PO daily", "Potassium replacement"),
    ]
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(45, 6, "Medication", border=1)
    pdf.cell(25, 6, "Dose", border=1)
    pdf.cell(40, 6, "Route/Frequency", border=1)
    pdf.cell(60, 6, "Indication", border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 8)
    for med, dose, route, indication in meds:
        pdf.cell(45, 5, med, border=1)
        pdf.cell(25, 5, dose, border=1)
        pdf.cell(40, 5, route, border=1)
        pdf.cell(60, 5, indication, border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("Vital Signs at Discharge")
    pdf.field("Blood Pressure", "128/78 mmHg")
    pdf.field("Heart Rate", "72 bpm, regular")
    pdf.field("Temperature", "98.4 F")
    pdf.field("Respiratory Rate", "16 breaths/min")
    pdf.field("SpO2", "97% on room air")
    pdf.field("Weight", "172 lbs (down from 178 lbs on admission)")
    pdf.ln(4)

    pdf.section_title("Discharge Lab Results")
    labs = [
        ("Sodium", "138", "mEq/L", "136-145"),
        ("Potassium", "4.2", "mEq/L", "3.5-5.0"),
        ("BUN", "28", "mg/dL", "7-20"),
        ("Creatinine", "1.4", "mg/dL", "0.6-1.2"),
        ("eGFR", "42", "mL/min", ">60"),
        ("BNP", "450", "pg/mL", "<100"),
        ("Hemoglobin A1c", "7.2", "%", "<7.0"),
        ("INR", "2.3", "", "2.0-3.0"),
        ("Hemoglobin", "11.8", "g/dL", "12.0-16.0"),
        ("WBC", "7.2", "K/uL", "4.5-11.0"),
    ]
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(40, 6, "Test", border=1)
    pdf.cell(25, 6, "Result", border=1)
    pdf.cell(25, 6, "Unit", border=1)
    pdf.cell(30, 6, "Reference", border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 8)
    for test, val, unit, ref in labs:
        pdf.cell(40, 5, test, border=1)
        pdf.cell(25, 5, val, border=1)
        pdf.cell(25, 5, unit, border=1)
        pdf.cell(30, 5, ref, border=1, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("Allergies")
    pdf.body_text("Penicillin - Rash/Hives\nSulfa drugs - Anaphylaxis\nNKDA to other classes")

    pdf.section_title("Follow-Up Instructions")
    pdf.body_text(
        "1. Follow up with Dr. Chen in Cardiology Clinic within 7 days.\n"
        "2. Daily weight monitoring - call if gain > 2 lbs in 24 hours.\n"
        "3. Low-sodium diet (< 2g/day), fluid restriction 1.5L/day.\n"
        "4. INR check in 3 days at anticoagulation clinic.\n"
        "5. Repeat BMP and BNP in 1 week.\n"
        "6. Return to ED if experiencing chest pain, severe shortness of breath, or syncope."
    )

    path = os.path.join(OUTPUT_DIR, "Discharge_Summary_Johnson.pdf")
    pdf.output(path)
    print(f"  Created: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# 2. Lab Report
# ─────────────────────────────────────────────────────────────────────────────
def create_lab_report():
    pdf = ClinicalPDF()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "LABORATORY RESULTS REPORT", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("Patient Information")
    pdf.field("Patient Name", "Sarah M. Johnson")
    pdf.field("Date of Birth", "03/15/1958")
    pdf.field("MRN", "CSM-2847561")
    pdf.field("Collection Date", "01/14/2026")
    pdf.field("Ordering Physician", "Dr. Michael Chen, MD")
    pdf.ln(4)

    pdf.section_title("Complete Metabolic Panel (CMP)")
    cmp = [
        ("Glucose", "142", "mg/dL", "70-100", "HIGH"),
        ("BUN", "28", "mg/dL", "7-20", "HIGH"),
        ("Creatinine", "1.4", "mg/dL", "0.6-1.2", "HIGH"),
        ("eGFR", "42", "mL/min/1.73m2", ">60", "LOW"),
        ("Sodium", "138", "mEq/L", "136-145", "Normal"),
        ("Potassium", "4.2", "mEq/L", "3.5-5.0", "Normal"),
        ("Chloride", "101", "mEq/L", "98-106", "Normal"),
        ("CO2", "24", "mEq/L", "23-29", "Normal"),
        ("Calcium", "9.1", "mg/dL", "8.5-10.5", "Normal"),
        ("Total Protein", "6.8", "g/dL", "6.0-8.3", "Normal"),
        ("Albumin", "3.4", "g/dL", "3.5-5.5", "LOW"),
        ("Bilirubin Total", "0.8", "mg/dL", "0.1-1.2", "Normal"),
        ("ALT", "22", "U/L", "7-56", "Normal"),
        ("AST", "28", "U/L", "10-40", "Normal"),
        ("ALP", "78", "U/L", "44-147", "Normal"),
    ]
    pdf.set_font("Helvetica", "B", 8)
    for h in ["Test", "Result", "Unit", "Reference", "Flag"]:
        pdf.cell(35 if h == "Test" else 28, 6, h, border=1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for test, val, unit, ref, flag in cmp:
        color = (255, 230, 230) if flag != "Normal" else (255, 255, 255)
        pdf.set_fill_color(*color)
        pdf.cell(35, 5, test, border=1, fill=True)
        pdf.cell(28, 5, val, border=1, fill=True)
        pdf.cell(28, 5, unit, border=1, fill=True)
        pdf.cell(28, 5, ref, border=1, fill=True)
        pdf.cell(28, 5, flag, border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("Complete Blood Count (CBC)")
    cbc = [
        ("WBC", "7.2", "K/uL", "4.5-11.0", "Normal"),
        ("RBC", "3.9", "M/uL", "4.0-5.5", "LOW"),
        ("Hemoglobin", "11.8", "g/dL", "12.0-16.0", "LOW"),
        ("Hematocrit", "35.2", "%", "36.0-46.0", "LOW"),
        ("MCV", "90.3", "fL", "80-100", "Normal"),
        ("Platelets", "245", "K/uL", "150-400", "Normal"),
    ]
    pdf.set_font("Helvetica", "B", 8)
    for h in ["Test", "Result", "Unit", "Reference", "Flag"]:
        pdf.cell(35 if h == "Test" else 28, 6, h, border=1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for test, val, unit, ref, flag in cbc:
        color = (255, 230, 230) if flag != "Normal" else (255, 255, 255)
        pdf.set_fill_color(*color)
        pdf.cell(35, 5, test, border=1, fill=True)
        pdf.cell(28, 5, val, border=1, fill=True)
        pdf.cell(28, 5, unit, border=1, fill=True)
        pdf.cell(28, 5, ref, border=1, fill=True)
        pdf.cell(28, 5, flag, border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("Cardiac Biomarkers")
    cardiac = [
        ("BNP", "450", "pg/mL", "<100", "HIGH"),
        ("Troponin I", "0.02", "ng/mL", "<0.04", "Normal"),
        ("CK-MB", "3.1", "ng/mL", "<5.0", "Normal"),
    ]
    pdf.set_font("Helvetica", "B", 8)
    for h in ["Test", "Result", "Unit", "Reference", "Flag"]:
        pdf.cell(35 if h == "Test" else 28, 6, h, border=1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for test, val, unit, ref, flag in cardiac:
        color = (255, 230, 230) if flag != "Normal" else (255, 255, 255)
        pdf.set_fill_color(*color)
        pdf.cell(35, 5, test, border=1, fill=True)
        pdf.cell(28, 5, val, border=1, fill=True)
        pdf.cell(28, 5, unit, border=1, fill=True)
        pdf.cell(28, 5, ref, border=1, fill=True)
        pdf.cell(28, 5, flag, border=1, fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("Lipid Panel")
    lipid = [
        ("Total Cholesterol", "218", "mg/dL", "<200", "HIGH"),
        ("LDL Cholesterol", "132", "mg/dL", "<100", "HIGH"),
        ("HDL Cholesterol", "42", "mg/dL", ">40", "Normal"),
        ("Triglycerides", "188", "mg/dL", "<150", "HIGH"),
    ]
    pdf.set_font("Helvetica", "B", 8)
    for h in ["Test", "Result", "Unit", "Reference", "Flag"]:
        pdf.cell(35 if h == "Test" else 28, 6, h, border=1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for test, val, unit, ref, flag in lipid:
        color = (255, 230, 230) if flag != "Normal" else (255, 255, 255)
        pdf.set_fill_color(*color)
        pdf.cell(35, 5, test, border=1, fill=True)
        pdf.cell(28, 5, val, border=1, fill=True)
        pdf.cell(28, 5, unit, border=1, fill=True)
        pdf.cell(28, 5, ref, border=1, fill=True)
        pdf.cell(28, 5, flag, border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.section_title("Hemoglobin A1c")
    pdf.field("HbA1c", "7.2%  (Reference: < 7.0%)  -  HIGH")
    pdf.body_text("Estimated average glucose: 160 mg/dL. Indicates suboptimal glycemic control.")

    path = os.path.join(OUTPUT_DIR, "Lab_Report_Johnson.pdf")
    pdf.output(path)
    print(f"  Created: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Progress Note / Office Visit
# ─────────────────────────────────────────────────────────────────────────────
def create_progress_note():
    pdf = ClinicalPDF()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "OFFICE VISIT / PROGRESS NOTE", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("Patient Information")
    pdf.field("Patient Name", "Sarah M. Johnson")
    pdf.field("Date of Birth", "03/15/1958")
    pdf.field("MRN", "CSM-2847561")
    pdf.field("Visit Date", "02/05/2026")
    pdf.field("Provider", "Dr. Michael Chen, MD - Cardiology")
    pdf.field("Visit Type", "Follow-up - Post-discharge CHF")
    pdf.ln(4)

    pdf.section_title("Chief Complaint")
    pdf.body_text("Follow-up visit 3 weeks post-discharge for acute CHF exacerbation.")

    pdf.section_title("Subjective")
    pdf.body_text(
        "Patient reports improved symptoms since discharge. Dyspnea on exertion has decreased "
        "significantly - now able to walk 2 blocks without stopping. No orthopnea. No PND. "
        "Bilateral lower extremity edema has largely resolved. Weight has been stable at 170 lbs. "
        "She reports compliance with low-sodium diet and fluid restriction. "
        "She has been monitoring her blood pressure at home - readings averaging 130/80. "
        "She denies chest pain, palpitations, dizziness, or syncope. "
        "Blood sugars have been running 140-180 range fasting. "
        "No medication side effects reported."
    )

    pdf.section_title("Current Medications")
    meds = [
        "Lisinopril 20 mg PO daily",
        "Metoprolol Succinate 50 mg PO daily",
        "Furosemide 40 mg PO BID",
        "Spironolactone 25 mg PO daily",
        "Metformin 1000 mg PO BID",
        "Atorvastatin 40 mg PO QHS",
        "Warfarin 5 mg PO daily",
        "KCl 20 mEq PO daily",
    ]
    for m in meds:
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(6, 5, "-")
        pdf.cell(0, 5, m, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.section_title("Objective")
    pdf.field("Blood Pressure", "132/76 mmHg")
    pdf.field("Heart Rate", "68 bpm")
    pdf.field("Weight", "170 lbs")
    pdf.field("BMI", "31.8")
    pdf.field("SpO2", "98% on room air")
    pdf.ln(2)
    pdf.body_text(
        "General: Well-appearing, no acute distress. "
        "HEENT: NCAT, PERRLA, EOMI. Neck: JVP not elevated. "
        "Lungs: Clear to auscultation bilaterally, no rales or wheezes. "
        "Heart: RRR, no murmurs, rubs or gallops. No S3. "
        "Abdomen: Soft, non-tender, non-distended. "
        "Extremities: Trace pedal edema bilaterally, improved from 2+ at discharge. "
        "Skin: Warm, dry, no rashes."
    )

    pdf.section_title("Assessment and Plan")
    pdf.body_text(
        "1. CHF with reduced EF (HFrEF) - improving post-discharge\n"
        "   - Continue current diuretic regimen\n"
        "   - Consider increasing Lisinopril to 40 mg if BP tolerates\n"
        "   - Schedule echocardiogram in 3 months to reassess EF\n\n"
        "2. Hypertension - adequately controlled\n"
        "   - Continue current regimen\n\n"
        "3. Type 2 Diabetes Mellitus - suboptimal control (A1c 7.2%)\n"
        "   - Increase Metformin to 1000 mg BID (already at this dose)\n"
        "   - Consider adding Empagliflozin 10 mg daily (dual benefit for CHF + DM)\n"
        "   - Recheck A1c in 3 months\n\n"
        "4. Hyperlipidemia - on statin therapy\n"
        "   - Continue Atorvastatin 40 mg\n"
        "   - Repeat lipid panel in 6 weeks\n\n"
        "5. Atrial Fibrillation - on anticoagulation\n"
        "   - INR 2.3 today - therapeutic\n"
        "   - Continue Warfarin with monthly INR monitoring\n\n"
        "6. CKD Stage 3 - stable\n"
        "   - Monitor renal function at next visit"
    )

    pdf.section_title("Follow-Up")
    pdf.body_text("Return in 4 weeks. Sooner if symptoms worsen. Labs (BMP, BNP, CBC) 1 week prior to next visit.")

    path = os.path.join(OUTPUT_DIR, "Progress_Note_Johnson.pdf")
    pdf.output(path)
    print(f"  Created: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Radiology Report
# ─────────────────────────────────────────────────────────────────────────────
def create_radiology_report():
    pdf = ClinicalPDF()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "RADIOLOGY REPORT", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("Patient Information")
    pdf.field("Patient Name", "Sarah M. Johnson")
    pdf.field("Date of Birth", "03/15/1958")
    pdf.field("MRN", "CSM-2847561")
    pdf.field("Exam Date", "01/11/2026")
    pdf.field("Ordering Physician", "Dr. Michael Chen, MD")
    pdf.ln(4)

    pdf.section_title("Examination: Chest X-Ray PA and Lateral")
    pdf.field("Clinical Indication", "Shortness of breath, rule out pulmonary edema")
    pdf.field("Comparison", "Chest X-ray dated 09/15/2025")
    pdf.ln(2)

    pdf.section_title("Findings")
    pdf.body_text(
        "Heart: The cardiac silhouette is enlarged with a cardiothoracic ratio of approximately 0.58 "
        "(previously 0.55). The aortic knob is calcified.\n\n"
        "Lungs: There is bilateral interstitial edema with Kerley B lines present at the lung bases. "
        "Small bilateral pleural effusions are noted, left greater than right. No focal consolidation "
        "or pneumothorax. The pulmonary vasculature shows upper lobe diversion consistent with "
        "pulmonary venous hypertension.\n\n"
        "Mediastinum: Widened slightly. No lymphadenopathy identified.\n\n"
        "Osseous structures: Degenerative changes of the thoracic spine. No acute fractures."
    )

    pdf.section_title("Impression")
    pdf.body_text(
        "1. Cardiomegaly, mildly increased from prior.\n"
        "2. Bilateral interstitial pulmonary edema with small bilateral pleural effusions, "
        "consistent with congestive heart failure.\n"
        "3. No focal consolidation to suggest pneumonia."
    )

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.body_text("Electronically signed by: Dr. Patricia Williams, MD - Radiology\nDate: 01/11/2026 14:32")

    # --- Second exam on same page ---
    pdf.ln(6)
    pdf.section_title("Examination: Echocardiogram (Transthoracic)")
    pdf.field("Exam Date", "01/12/2026")
    pdf.field("Clinical Indication", "CHF exacerbation, assess cardiac function")
    pdf.ln(2)

    pdf.section_title("Findings")
    pdf.body_text(
        "Left ventricle: Moderately dilated. Diffuse hypokinesis. Estimated ejection fraction 35% "
        "(previously 40% on 09/2025 study). No LV thrombus identified.\n\n"
        "Right ventricle: Mildly dilated with mildly reduced systolic function.\n\n"
        "Left atrium: Moderately dilated at 4.8 cm.\n\n"
        "Valves:\n"
        "  - Mitral valve: Moderate mitral regurgitation (functional)\n"
        "  - Aortic valve: Mild aortic sclerosis, no significant stenosis\n"
        "  - Tricuspid valve: Mild tricuspid regurgitation\n"
        "  - Pulmonic valve: Normal\n\n"
        "Estimated RVSP: 45 mmHg (mildly elevated)\n\n"
        "Pericardium: Small pericardial effusion, no tamponade physiology.\n\n"
        "IVC: Dilated at 2.4 cm with < 50% respiratory variation, consistent with elevated RA pressure."
    )

    pdf.section_title("Impression")
    pdf.body_text(
        "1. Reduced left ventricular ejection fraction at 35%, decreased from 40% in September 2025.\n"
        "2. Moderate functional mitral regurgitation.\n"
        "3. Mildly elevated pulmonary artery pressures.\n"
        "4. Findings consistent with worsening dilated cardiomyopathy."
    )

    path = os.path.join(OUTPUT_DIR, "Radiology_Report_Johnson.pdf")
    pdf.output(path)
    print(f"  Created: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# 5. Medication Reconciliation / Prescription
# ─────────────────────────────────────────────────────────────────────────────
def create_medication_list():
    pdf = ClinicalPDF()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "MEDICATION RECONCILIATION REPORT", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.section_title("Patient Information")
    pdf.field("Patient Name", "Sarah M. Johnson")
    pdf.field("Date of Birth", "03/15/1958")
    pdf.field("MRN", "CSM-2847561")
    pdf.field("Reconciliation Date", "01/15/2026")
    pdf.field("Pharmacist", "Dr. Lisa Park, PharmD")
    pdf.ln(4)

    pdf.section_title("Known Allergies")
    pdf.body_text(
        "1. Penicillin - Reaction: Rash, Hives (Moderate severity)\n"
        "2. Sulfonamides - Reaction: Anaphylaxis (Severe severity)\n"
        "3. Contrast Dye (Iodinated) - Reaction: Nausea, mild urticaria (Mild severity)"
    )

    pdf.section_title("Active Medications")
    meds = [
        ("Lisinopril", "20 mg", "Tablet", "Oral", "Once daily", "Morning", "RxCUI: 314076", "ACE Inhibitor"),
        ("Metoprolol Succinate ER", "50 mg", "Tablet", "Oral", "Once daily", "Morning", "RxCUI: 866924", "Beta Blocker"),
        ("Furosemide", "40 mg", "Tablet", "Oral", "Twice daily", "Morning, Afternoon", "RxCUI: 310429", "Loop Diuretic"),
        ("Spironolactone", "25 mg", "Tablet", "Oral", "Once daily", "Morning", "RxCUI: 313096", "K-sparing Diuretic"),
        ("Metformin HCl", "1000 mg", "Tablet", "Oral", "Twice daily", "With meals", "RxCUI: 861007", "Biguanide"),
        ("Atorvastatin Calcium", "40 mg", "Tablet", "Oral", "Once daily", "Bedtime", "RxCUI: 259255", "HMG-CoA Reductase Inhibitor"),
        ("Warfarin Sodium", "5 mg", "Tablet", "Oral", "Once daily", "Evening", "RxCUI: 855332", "Anticoagulant"),
        ("Potassium Chloride ER", "20 mEq", "Tablet", "Oral", "Once daily", "Morning", "RxCUI: 628958", "Electrolyte"),
    ]

    pdf.set_font("Helvetica", "B", 7)
    headers = ["Medication", "Dose", "Form", "Route", "Frequency", "Timing", "Code", "Class"]
    widths = [35, 15, 15, 12, 22, 28, 28, 35]
    for h, w in zip(headers, widths):
        pdf.cell(w, 6, h, border=1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 7)
    for row in meds:
        for val, w in zip(row, widths):
            pdf.cell(w, 5, val, border=1)
        pdf.ln()
    pdf.ln(4)

    pdf.section_title("Discontinued Medications (This Admission)")
    pdf.body_text(
        "1. Hydrochlorothiazide 25 mg - Discontinued, replaced with Furosemide for stronger diuresis\n"
        "2. Glipizide 5 mg - Discontinued, A1c improving on Metformin alone; plan to add SGLT2 inhibitor"
    )

    pdf.section_title("Medication Interactions Identified")
    pdf.body_text(
        "MODERATE: Warfarin + Atorvastatin - May increase anticoagulant effect. "
        "Monitor INR closely when adjusting statin dose.\n\n"
        "MODERATE: Spironolactone + Potassium Chloride - Risk of hyperkalemia. "
        "Monitor serum potassium levels regularly.\n\n"
        "MINOR: Lisinopril + Spironolactone - Additive hyperkalemia risk. "
        "Potassium already being monitored."
    )

    pdf.section_title("Pharmacist Notes")
    pdf.body_text(
        "Patient counseled on medication adherence, timing, and potential side effects. "
        "Pill organizer provided. Patient demonstrates understanding of low-sodium diet importance "
        "with diuretic therapy. Warfarin diet counseling reinforced (consistent vitamin K intake). "
        "Follow-up phone call scheduled for 48 hours post-discharge."
    )

    path = os.path.join(OUTPUT_DIR, "Medication_Reconciliation_Johnson.pdf")
    pdf.output(path)
    print(f"  Created: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# Run all generators
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating clinical test PDFs...")
    create_discharge_summary()
    create_lab_report()
    create_progress_note()
    create_radiology_report()
    create_medication_list()
    print(f"\nDone! {5} PDFs created in: {OUTPUT_DIR}")
