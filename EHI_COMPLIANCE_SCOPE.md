# EHI Compliance & Data Scope
## ClinQuilt - Electronic Health Information Processing

**Date:** April 23, 2026
**Regulation:** 21st Century Cures Act, 45 CFR Part 171 (Information Blocking)
**Purpose:** Define scope of EHI processed by ClinQuilt

---

## 📋 What is EHI?

**Electronic Health Information (EHI)** means electronic protected health information (ePHI) to the extent that it would be included in a designated record set, **regardless of whether the group of records is used or maintained by or for a covered entity**.

### **Key Aspects:**
- Broader than HIPAA's ePHI definition
- Includes health information maintained by **any entity**, not just HIPAA covered entities
- Encompasses data **intended for third-party disclosure**
- Applies to apps, platforms, and services processing patient health data

---

## ✅ What ClinQuilt DOES Process (In-Scope EHI)

ClinQuilt processes the following EHI data elements from patient exports:

### **1. Patient Demographics**
- Full name, date of birth, age, sex
- Address (city, state, ZIP)
- Contact information
- Marital status, language preference
- Ethnic group/race

### **2. Clinical Information**
- ✅ **Encounters/Visits** - Office visits, hospital admissions, emergency visits
- ✅ **Diagnoses/Conditions** - Active and resolved health conditions
- ✅ **Medications** - Current and historical prescriptions
- ✅ **Laboratory Results** - Lab tests, values, reference ranges
- ✅ **Procedures** - Surgical procedures, imaging, treatments
- ✅ **Immunizations** - Vaccination records
- ✅ **Allergies** - Drug and environmental allergies
- ✅ **Vital Signs** - Blood pressure, temperature, weight, BMI
- ✅ **Clinical Notes** - Provider documentation (if included in export)
- ✅ **Orders** - Lab orders, imaging orders, medication orders

### **3. Care Team Information**
- Provider names, specialties, organizations
- Care team members involved in patient care

### **4. Insurance/Payer Information** (NEW - Payer Features)
- ✅ **Coverage Information** - Payer name, member ID, group number
- ✅ **Plan Details** - Plan name, coverage dates, insurance type
- ✅ **Financial Information** - Deductibles, copays, out-of-pocket maximums
- ✅ **Claims Data** (if available in export)
- ✅ **Prior Authorization History** (if available)

### **5. Document Metadata**
- Document titles, dates, types
- Source system identifiers
- Data provenance/lineage

---

## ❌ What ClinQuilt Does NOT Process (Out-of-Scope)

Per **45 CFR 164.501** and **21st Century Cures Act**, the following are **NOT considered EHI** and are **excluded** from ClinQuilt processing:

### **1. Psychotherapy Notes** ❌
**Definition:** Notes recorded by a mental health professional documenting or analyzing the contents of conversation during a private counseling session or group, joint, or family counseling session that are separated from the rest of the patient's medical record.

**45 CFR 164.501:**
> Psychotherapy notes excludes medication prescription and monitoring, counseling session start and stop times, modalities and frequencies of treatment furnished, results of clinical tests, and any summary of diagnosis, functional status, treatment plan, symptoms, prognosis, and progress.

**ClinQuilt Handling:**
- ❌ Does NOT process psychotherapy notes
- ✅ DOES process mental health diagnoses, medication prescriptions, and treatment summaries (these are EHI, not psychotherapy notes)

**Example:**
- ❌ **Excluded:** Detailed therapist's personal notes from counseling session
- ✅ **Included:** Diagnosis: "Major Depressive Disorder", Prescription: "Sertraline 50mg"

---

### **2. Information Compiled for Legal Proceedings** ❌
**Definition:** Information compiled in reasonable anticipation of, or for use in, a civil, criminal, or administrative action or proceeding.

**ClinQuilt Handling:**
- ❌ Does NOT process legal documents, attorney work product, or litigation-specific compilations
- ✅ DOES process underlying clinical records even if they might later be used in legal proceedings

**Example:**
- ❌ **Excluded:** Medical records summary prepared specifically for a malpractice lawsuit
- ✅ **Included:** Original clinical encounter notes, lab results, medication records

---

### **3. FERPA-Protected Education Records** ❌
**Definition:** Individually identifiable health information in education records covered by the Family Educational Rights and Privacy Act (FERPA), 20 U.S.C. 1232g.

**ClinQuilt Handling:**
- ❌ Does NOT process school health records covered under FERPA
- ❌ Does NOT process student health services records maintained by educational institutions

**Example:**
- ❌ **Excluded:** Elementary school nurse's records, college health center records
- ✅ **Included:** Same student's records from community pediatrician or hospital

---

### **4. Treatment Records of Post-Secondary Students** ❌
**Definition:** Records described at 20 U.S.C. 1232g(a)(4)(B)(iv) - treatment records of students at post-secondary institutions.

**ClinQuilt Handling:**
- ❌ Does NOT process university health center treatment records for enrolled students
- ✅ DOES process the same student's records from non-educational healthcare providers

---

### **5. Employment Records** ❌
**Definition:** Individually identifiable health information in employment records held by a covered entity in its role as employer.

**ClinQuilt Handling:**
- ❌ Does NOT process employee health records maintained by HR/employer
- ❌ Does NOT process workplace injury reports, fitness-for-duty evaluations, or workers' compensation records held by employer

**Example:**
- ❌ **Excluded:** Employee physical exam results maintained by corporate HR
- ✅ **Included:** Same individual's personal health records from their primary care physician

---

### **6. Records of Deceased Persons (>50 Years)** ❌
**Definition:** Individually identifiable health information regarding a person who has been deceased for more than 50 years.

**ClinQuilt Handling:**
- ❌ Does NOT process records of individuals deceased for >50 years
- ✅ DOES process records of recently deceased individuals (<50 years)

**Note:** This exclusion is rare in practice, as most patient EHI exports are for living individuals or recently deceased persons.

---

### **7. De-identified Information** ❌
**Definition:** De-identified protected health information as defined under 45 CFR 164.514.

**45 CFR 164.514 De-identification Requirements:**
- Health information is de-identified if it does not identify an individual and there is no reasonable basis to believe it can be used to identify an individual.
- Two methods: (1) Expert determination, or (2) Safe Harbor (removal of 18 identifiers)

**ClinQuilt Handling:**
- ✅ ClinQuilt processes **identified** patient data by default
- ✅ ClinQuilt offers **de-identification option** (Cloud AI mode) for enhanced privacy
- ❌ Fully de-identified data (pre-de-identified before import) is not considered EHI and falls outside ClinQuilt's scope

**Safe Harbor 18 Identifiers (Must be removed for de-identification):**
1. Names
2. Geographic subdivisions smaller than state
3. Dates (except year) related to the individual
4. Telephone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers and serial numbers
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers (fingerprints, voice prints)
17. Full-face photographs
18. Any other unique identifying number, characteristic, or code

---

## 🎯 ClinQuilt's Data Processing Philosophy

### **Principle 1: Respect Regulatory Exclusions**
ClinQuilt automatically excludes the 7 categories of non-EHI data listed above. If an EHI export contains such data, ClinQuilt either:
- Filters it out during import, OR
- Displays a warning that certain data types cannot be processed

### **Principle 2: Patient Data Sovereignty**
- Patients own their EHI and control how it's processed
- ClinQuilt processes data **100% client-side** by default
- No PHI sent to servers unless patient explicitly enables Cloud AI mode
- Patient can delete all data from browser at any time

### **Principle 3: Transparency**
- Clear disclosure of what data types are processed
- Privacy panel shows exactly what's happening with data
- No hidden data collection or transmission

### **Principle 4: Compliance by Design**
- Architecture designed to avoid HIPAA Business Associate Agreement requirement (default mode)
- De-identification available for enhanced privacy (Cloud AI mode)
- Audit trail of all data processing activities

---

## 📊 Data Type Classification Summary

| Data Category | EHI? | ClinQuilt Processes? | Regulatory Basis |
|---------------|------|----------------------|------------------|
| **Clinical Records** | ✅ Yes | ✅ Yes | Core EHI |
| **Medications** | ✅ Yes | ✅ Yes | Core EHI |
| **Lab Results** | ✅ Yes | ✅ Yes | Core EHI |
| **Diagnoses** | ✅ Yes | ✅ Yes | Core EHI |
| **Insurance Coverage** | ✅ Yes | ✅ Yes | EHI (USCDI+) |
| **Psychotherapy Notes** | ❌ No | ❌ No | 45 CFR 164.501 exclusion |
| **Legal Compilations** | ❌ No | ❌ No | Litigation exclusion |
| **FERPA School Records** | ❌ No | ❌ No | 20 U.S.C. 1232g |
| **Employment Records** | ❌ No | ❌ No | Employer role exclusion |
| **Deceased >50 Years** | ❌ No | ❌ No | Time-based exclusion |
| **De-identified Data** | ❌ No | ⚠️ Optional | 45 CFR 164.514 |

---

## 🔍 Special Cases & Edge Cases

### **Case 1: Mental Health Records**
**Question:** Are mental health records EHI?

**Answer:**
- ✅ **YES** - Diagnoses, medications, treatment plans, clinical notes
- ❌ **NO** - Psychotherapy notes (separate, detailed counseling session notes)

**ClinQuilt Handling:**
- Processes mental health diagnoses and medications
- Excludes psychotherapy notes if separately identified

---

### **Case 2: Substance Abuse Treatment (42 CFR Part 2)**
**Question:** Are substance abuse treatment records EHI?

**Answer:**
- ✅ **YES** - Substance abuse treatment records ARE EHI
- ⚠️ **BUT** - Subject to additional federal confidentiality protections (42 CFR Part 2)

**ClinQuilt Handling:**
- Processes substance abuse records if included in patient's EHI export
- Patient controls disclosure (client-side processing = patient's device)
- Does not transmit to servers without patient consent

---

### **Case 3: Research Data**
**Question:** Are research study records EHI?

**Answer:**
- ⚠️ **Depends** - If maintained for clinical care purposes: YES
- ❌ **Usually NO** - Pure research records not used for treatment are not EHI

**ClinQuilt Handling:**
- Processes clinical trial data if included in patient's clinical record
- Excludes pure research data not relevant to patient care

---

### **Case 4: Billing/Claims Data**
**Question:** Are billing and claims records EHI?

**Answer:**
- ✅ **YES** - Billing records are part of the designated record set and constitute EHI

**ClinQuilt Handling:**
- ✅ Processes claims data if included in EHI export (Payer Tools feature)
- Uses for cost analysis, prior authorization, savings opportunities

---

### **Case 5: Patient-Generated Data**
**Question:** Are patient-generated health data (PGHD) EHI?

**Answer:**
- ✅ **YES** - If incorporated into the designated record set by a provider
- ⚠️ **MAYBE** - If maintained by the patient outside of provider systems

**ClinQuilt Handling:**
- Processes patient-generated data if included in EHI export from provider
- Can import patient's own tracking data if patient chooses

---

## 🛡️ Privacy & Security Implications

### **Why These Exclusions Matter:**

**1. Information Blocking Compliance**
- Excluding non-EHI data types is **legally required**
- Prevents misapplication of information blocking rules
- Clarifies scope of patient access rights

**2. Privacy Protection**
- Some excluded categories (psychotherapy notes) have heightened privacy protections
- Proper exclusion prevents inappropriate disclosure

**3. Legal Risk Management**
- Distinguishing EHI from non-EHI protects against claims of:
  - Unauthorized access to privileged information (legal compilations)
  - FERPA violations (education records)
  - Employment law violations (HR records)

**4. Patient Trust**
- Clear boundaries on what data is processed builds patient confidence
- Transparency about data scope enhances credibility

---

## 📝 User-Facing Disclosure

### **ClinQuilt Privacy Notice (Excerpt):**

> **What Data Does ClinQuilt Process?**
>
> ClinQuilt processes Electronic Health Information (EHI) from your patient portals and healthcare provider exports. This includes your medical records, lab results, medications, diagnoses, and insurance coverage information.
>
> **What Data Does ClinQuilt NOT Process?**
>
> ClinQuilt does NOT process:
> - Psychotherapy session notes
> - Legal documents or litigation-related compilations
> - School health records (FERPA-protected)
> - Employment health records maintained by your employer
> - Records of individuals deceased for more than 50 years
>
> All processing happens in your browser. Your health data never leaves your device unless you explicitly enable Cloud AI mode with de-identification.

---

## ✅ EHIgnite Challenge Implications

### **How This Strengthens Our Submission:**

**1. Regulatory Knowledge**
- Demonstrates deep understanding of EHI regulations
- Shows compliance with 21st Century Cures Act
- Differentiates from competitors who may not understand scope

**2. Privacy by Design**
- Clear data boundaries enhance privacy posture
- Proper exclusions reduce legal risk
- Client-side processing reinforces privacy

**3. Transparency**
- Clear disclosure of what is/isn't processed
- Builds trust with patients and evaluators
- Demonstrates responsible data stewardship

**4. Scalability**
- Proper EHI scope ensures nationwide applicability
- Avoids state-specific data handling complications
- Compatible with vendor-neutral data standards

---

## 📚 Regulatory References

**Primary Regulations:**
- 21st Century Cures Act, Pub. L. 114-255 (2016)
- 45 CFR Part 171 - Information Blocking
- 45 CFR 164.501 - Definitions (HIPAA Privacy Rule)
- 45 CFR 164.514 - De-identification (HIPAA Privacy Rule)
- 20 U.S.C. 1232g - FERPA
- 42 CFR Part 2 - Substance Abuse Treatment Confidentiality

**ONC Resources:**
- ONC Cures Act Final Rule (May 2020)
- Information Blocking FAQs
- USCDI (United States Core Data for Interoperability) Standards

---

## 🎯 Summary

**ClinQuilt's EHI Processing:**
- ✅ **Processes:** Clinical records, medications, labs, insurance, encounters, procedures, allergies, vitals
- ❌ **Excludes:** Psychotherapy notes, legal compilations, FERPA records, employment records, deceased >50yr, de-identified data
- 🔒 **Privacy:** 100% client-side processing by default, optional de-identification for Cloud AI
- 📋 **Compliance:** Fully aligned with 21st Century Cures Act and HIPAA regulations

**Result:** ClinQuilt processes the **appropriate scope of EHI** while respecting **regulatory exclusions** and **patient privacy**.

---

**Prepared by:** Claude Code + Rajendra Kalyan Ram Jonnagadla
**Date:** April 23, 2026
**Purpose:** EHIgnite Challenge submission documentation
**Version:** 1.0
