# EHIgnite Challenge - ClinQuilt Wireframes & Screenshots

**Date:** April 23, 2026
**Application:** ClinQuilt
**Live Demo:** https://mango-wave-02e8cfe10.2.azurestaticapps.net
**Purpose:** Visual documentation for EHIgnite Challenge submission

---

## Overview

This document outlines the key wireframes and screenshots needed to demonstrate ClinQuilt's compliance with all 6 EHIgnite Challenge requirements. Each screenshot should capture specific functionality and user experience elements.

---

## Screenshot List

### 1. **Landing Page - File Upload Interface**
**Requirement:** #1 Interactive Patient Tools, #2 Usable Summary

**What to Capture:**
- Clean, minimalist upload interface
- "Zero PHI Server" privacy badge prominently displayed
- Three upload options clearly visible:
  - Upload File (drag-and-drop zone)
  - Use Demo Data button
  - Load from Recent Files
- Privacy guarantee messaging
- YAML Rule Engine badge

**Key Features to Highlight:**
- Client-side only processing indicator
- Security messaging
- Simple, intuitive UX

**Screenshot Filename:** `01_landing_page_upload.png`

---

### 2. **Dashboard Overview Tab**
**Requirement:** #1 Interactive Patient Tools, #2 Usable Summary

**What to Capture:**
- Patient summary card (demographics, age, key stats)
- 4-panel health snapshot:
  - Active Medications count
  - Active Conditions count
  - Recent Encounters count
  - Lab Results count
- Quick stats at a glance
- Navigation tabs clearly visible (Overview, Records, AI Summary, Timeline, etc.)

**Key Features to Highlight:**
- Clean data presentation
- Easy-to-scan health metrics
- Professional healthcare UI design

**Screenshot Filename:** `02_dashboard_overview.png`

---

### 3. **AI Summary Tab**
**Requirement:** #1 Interactive Patient Tools, #2 Usable/Readable Summary

**What to Capture:**
- AI-generated clinical summary in plain language
- Organized sections:
  - Patient Overview
  - Active Medical Conditions
  - Current Medications
  - Recent Healthcare Visits
  - Laboratory Results & Trends
  - Clinical Significance & Recommendations
- Copy to clipboard button
- Download as PDF button

**Key Features to Highlight:**
- Natural language processing
- Medically accurate summaries
- Patient-friendly terminology
- Actionable insights

**Screenshot Filename:** `03_ai_summary_clinical.png`

---

### 4. **Timeline View - Interactive Chronology**
**Requirement:** #1 Interactive Patient Tools, #4 Integration Across Settings

**What to Capture:**
- Vertical timeline with color-coded events:
  - Encounters (blue)
  - Medications (green)
  - Lab Results (purple)
  - Conditions (red)
- Date markers on left axis
- Event cards showing details
- Filter options (by type)
- Zoom controls

**Key Features to Highlight:**
- Multi-source data integration
- Chronological visualization
- Event correlation
- Cross-setting care continuity

**Screenshot Filename:** `04_timeline_interactive.png`

---

### 5. **Clinical Domain Customization - Insights Tab**
**Requirement:** #3 Clinical Domain Customization

**What to Capture:**
- Clinical insights panel showing:
  - Medication adherence tracking
  - Condition progression analysis
  - Lab trend visualization
  - Care gap identification
- Domain-specific charts (blood pressure trends, glucose levels, etc.)
- Clinical decision support indicators

**Key Features to Highlight:**
- Domain-specific analytics
- Personalized to patient's conditions
- Evidence-based recommendations
- Clinical relevance

**Screenshot Filename:** `05_clinical_insights_domain.png`

---

### 6. **Payer Tools - Insurance Coverage Card**
**Requirement:** #5 Streamline Payer Uses

**What to Capture:**
- Digital insurance card displaying:
  - Payer name (Blue Cross Blue Shield PPO)
  - Member ID: BCBS123456789
  - Group Number: GRP-CEDARS-001
  - Coverage dates
- Deductible progress bar (57% met: $850 / $1,500)
- Out-of-pocket maximum progress
- Copay amounts:
  - Primary Care: $25
  - Specialist: $50
  - ER: $250
  - Rx Generic: $10
  - Rx Brand: $40

**Key Features to Highlight:**
- USCDI Health Insurance Data Class compliance
- Visual progress indicators
- Comprehensive coverage details
- Easy-to-understand financial information

**Screenshot Filename:** `06_payer_insurance_coverage.png`

---

### 7. **Payer Tools - Prior Authorization Assistant**
**Requirement:** #5 Streamline Payer Uses

**What to Capture:**
- List of medications/procedures requiring prior auth:
  - Humira (Adalimumab) - $5,200/month
  - Ozempic (Semaglutide) - $900/month
  - Eliquis (Apixaban) - $550/month
  - MRI Brain with Contrast - $2,800
- Each item shows:
  - Name and cost
  - Reason for PA requirement
  - "Generate PA Package" button
  - "View Details" link
- FHIR R4 bundle generation
- One-click download capability

**Key Features to Highlight:**
- Automated PA detection
- Cost transparency
- FHIR interoperability
- Streamlined workflow

**Screenshot Filename:** `07_payer_prior_auth.png`

---

### 8. **Payer Tools - Cost Analysis Dashboard**
**Requirement:** #5 Streamline Payer Uses

**What to Capture:**
- Total estimated costs: $27,600
- Pie chart showing breakdown:
  - Medications: 45% ($12,500)
  - Visits: 30% ($8,200)
  - Labs: 15% ($4,100)
  - Procedures: 10% ($2,800)
- Color-coded categories
- Interactive chart
- Cost transparency messaging

**Key Features to Highlight:**
- Financial transparency
- Visual cost breakdown
- Category-based analysis
- Patient financial planning support

**Screenshot Filename:** `08_payer_cost_analysis.png`

---

### 9. **Payer Tools - Medication Savings Opportunities**
**Requirement:** #5 Streamline Payer Uses

**What to Capture:**
- Generic medication alternatives:
  - Lipitor 20mg → Atorvastatin
    - Current Cost: $250/month
    - New Cost: $10/month (Tier 1)
    - Monthly Savings: $240
    - Annual Savings: $2,880
  - Additional savings opportunities listed
- "Request Generic Switch" button
- Total potential savings summary

**Key Features to Highlight:**
- Formulary optimization
- Cost savings identification
- Generic alternative recommendations
- Patient financial empowerment

**Screenshot Filename:** `09_payer_medication_savings.png`

---

### 10. **Data Lineage & Provenance**
**Requirement:** #4 Integration Across Settings, #6 Participant-Defined Use Case

**What to Capture:**
- Data lineage tree showing:
  - Source system (Epic MyChart export)
  - Import timestamp
  - Processing steps (YAML rules applied)
  - Data elements extracted
  - Validation status
- Provenance metadata
- Audit trail

**Key Features to Highlight:**
- Data transparency
- Multi-source tracking
- Processing transparency
- Quality assurance

**Screenshot Filename:** `10_data_lineage.png`

---

### 11. **Privacy & Security Panel**
**Requirement:** All (Privacy is cross-cutting)

**What to Capture:**
- Privacy panel modal showing:
  - Zero PHI Server Guarantee (green box)
  - EHI Data Scope section (purple box) - NEW!
    - What ClinQuilt processes (checkmarks)
    - What ClinQuilt excludes (X marks)
    - Regulatory compliance references
  - Secure Session Mode (blue box)
  - Local Persistence Toggle (gray box)
  - Secure Memory Wipe (red box)
  - Version footer

**Key Features to Highlight:**
- Comprehensive privacy controls
- EHI compliance transparency
- Patient data sovereignty
- Security architecture

**Screenshot Filename:** `11_privacy_security_panel.png`

---

### 12. **Data Explorer - SQL Query Interface**
**Requirement:** #1 Interactive Patient Tools, #6 Participant-Defined Use Case

**What to Capture:**
- DuckDB-WASM SQL query interface
- Example query:
  ```sql
  SELECT name, dosage, start_date
  FROM medications
  WHERE status = 'Active'
  ORDER BY start_date DESC;
  ```
- Results table displayed
- SQL editor with syntax highlighting
- Schema browser showing available tables

**Key Features to Highlight:**
- Advanced user empowerment
- SQL access to health data
- In-browser database (zero server)
- Developer-friendly features

**Screenshot Filename:** `12_data_explorer_sql.png`

---

### 13. **AI Assistant - Conversational Interface**
**Requirement:** #1 Interactive Patient Tools, #2 Usable Summary

**What to Capture:**
- Chat interface with AI assistant
- Example conversation:
  - User: "What medications am I taking for high blood pressure?"
  - AI: "You are currently taking Lisinopril 10mg once daily for your Essential Hypertension..."
- Context-aware responses
- Follow-up question capability
- Chat history

**Key Features to Highlight:**
- Natural language interface
- Clinical Q&A capability
- Patient education
- Conversational AI

**Screenshot Filename:** `13_ai_assistant_chat.png`

---

### 14. **Records Tab - Detailed Clinical Data**
**Requirement:** #4 Integration Across Settings

**What to Capture:**
- Tabbed interface showing:
  - Medications list (with dosages, frequencies)
  - Conditions list (with onset dates, severity)
  - Encounters list (with dates, types, providers)
  - Lab results (with values, reference ranges)
  - Procedures/Orders
- Filter and search capabilities
- Export options

**Key Features to Highlight:**
- Comprehensive data access
- Organized by category
- Multi-source integration
- Detailed clinical information

**Screenshot Filename:** `14_records_clinical_data.png`

---

### 15. **Mobile Responsive View**
**Requirement:** All (Accessibility is cross-cutting)

**What to Capture:**
- Mobile phone screenshot showing:
  - Responsive navigation
  - Touch-optimized controls
  - Readable text on small screens
  - Accessible payer tools on mobile
- Show either Overview or Payer Tools tab

**Key Features to Highlight:**
- Mobile-first design
- Accessibility
- Cross-device compatibility
- Responsive UI

**Screenshot Filename:** `15_mobile_responsive.png`

---

## Screenshot Guidelines

### Technical Requirements:
- **Resolution:** 1920x1080 minimum (desktop), 375x812 (mobile)
- **Format:** PNG with transparency where applicable
- **Quality:** High resolution, no compression artifacts
- **Browser:** Chrome or Edge (latest version)
- **Zoom:** 100% (no browser zoom)

### Content Guidelines:
- Use **Patient Z2345678** (Smith, John A) for demo data
- Ensure privacy badge is visible in all relevant screenshots
- Show realistic, clinically accurate data
- Highlight new payer features prominently
- Include timestamps showing real-time processing

### Annotation Guidelines:
- Add callout boxes for key features (if creating annotated version)
- Use consistent color scheme: green (security), blue (features), purple (payer)
- Number callouts if showing step-by-step flows
- Keep annotations minimal - let UI speak for itself

---

## Usage in Submission

These screenshots will be used in:
1. **EHIgnite Submission PDF** - Section 3: Wireframes/Mock Ups
2. **GitHub README.md** - Visual documentation
3. **Demo Video** - Screen recording following this sequence
4. **Presentation Deck** - One slide per major feature

---

## Screenshot Capture Checklist

- [ ] 01 - Landing Page Upload Interface
- [ ] 02 - Dashboard Overview
- [ ] 03 - AI Summary
- [ ] 04 - Timeline Interactive
- [ ] 05 - Clinical Insights Domain
- [ ] 06 - Payer Insurance Coverage
- [ ] 07 - Payer Prior Authorization
- [ ] 08 - Payer Cost Analysis
- [ ] 09 - Payer Medication Savings
- [ ] 10 - Data Lineage
- [ ] 11 - Privacy Security Panel (with NEW EHI scope section)
- [ ] 12 - Data Explorer SQL
- [ ] 13 - AI Assistant Chat
- [ ] 14 - Records Clinical Data
- [ ] 15 - Mobile Responsive

**Total:** 15 screenshots needed

---

## Next Steps

1. Wait for Azure deployment to complete (3-5 minutes from last push)
2. Access live application: https://mango-wave-02e8cfe10.2.azurestaticapps.net
3. Load demo patient data (Patient Z2345678)
4. Capture screenshots following this guide
5. Store in `screenshots/` folder
6. Annotate key screenshots if needed
7. Incorporate into submission PDF

---

**Prepared by:** Claude Code + Rajendra Kalyan Ram Jonnagadla
**Date:** April 23, 2026
**Purpose:** EHIgnite Challenge submission visual documentation
**Status:** Ready for screenshot capture
