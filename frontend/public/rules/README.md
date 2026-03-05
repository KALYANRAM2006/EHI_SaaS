# EHI Normalization Rulesets

**Version**: 2026.03.04
**Author**: Health Data Alchemist
**Purpose**: Multi-vendor EHI export normalization to FHIR R4 resources

---

## Overview

This directory contains YAML-based mapping rules that normalize Electronic Health Information (EHI) exports from various EHR vendors into standardized FHIR R4 resources. All normalization happens **client-side** in the browser using DuckDB-WASM, with zero PHI sent to any server.

---

## Supported Vendors and Formats

### ✅ Production-Ready (Phase 1 MVP)

#### 1. **Epic Systems - EHI Tables (TSV)**
- **Path**: `/rules/epic-tsv/`
- **Format**: Tab-Separated Values (TSV)
- **Market Share**: 32% (KLAS 2024)
- **Official Spec**: [Epic EHI Tables](https://open.epic.com/EHITables)
- **Status**: ✅ Manifest complete, YAML rules in progress
- **Tables Supported**:
  - PATIENT.tsv → Patient
  - PAT_ENC.tsv → Encounter
  - PROBLEM_LIST.tsv → Condition
  - ORDER_MED.tsv → MedicationStatement
  - ORDER_PROC.tsv → Observation (Labs)
  - FLOWSHEET.tsv → Observation (Vitals)
  - DOC_INFORMATION.tsv → DocumentReference
  - ALLERGY.tsv → AllergyIntolerance
  - IMMUNIZATION.tsv → Immunization
  - PROCEDURES.tsv → Procedure

**Key Features**:
- Epic's native EHI export format (as of February 2026)
- Thousands of tables documented publicly
- Most common patient-facing export from MyChart
- Requires TSV parsing and YAML-based normalization

**References**:
- [Epic EHI Tables Documentation](https://open.epic.com/EHITables)
- [PATIENT Table Spec](https://open.epic.com/EHITables/GetTable/PATIENT.htm)
- [PAT_ENC Table Spec](https://open.epic.com/EHITables/GetTable/PAT_ENC.htm)
- [DOC_INFORMATION Table Spec](https://open.epic.com/EHITables/GetTable/DOC_INFORMATION.htm)

---

#### 2. **Generic C-CDA R2.1 (Universal)**
- **Path**: `/rules/ccda-r2/`
- **Format**: XML (Consolidated Clinical Document Architecture)
- **Market Share**: 100% (ONC-mandated for all certified EHRs)
- **Official Spec**: [HL7 C-CDA R2.1](http://www.hl7.org/implement/standards/product_brief.cfm?product_id=492)
- **Status**: ✅ Manifest complete, YAML rules planned
- **Sections Supported**:
  - recordTarget → Patient
  - Encounters Section → Encounter
  - Problem List → Condition
  - Medications Section → MedicationStatement
  - Results Section → Observation
  - Vital Signs Section → Observation
  - Allergies Section → AllergyIntolerance
  - Immunizations Section → Immunization
  - Procedures Section → Procedure
  - Care Plan Section → CarePlan

**Key Features**:
- Universal format supported by ALL EHR vendors
- XML-based with standardized HL7 sections
- ONC-mandated for certified health IT
- Works with Epic, Cerner, Allscripts, MEDITECH, athenahealth, etc.
- Most common format for patient record requests

**Code Systems Used**:
- LOINC (2.16.840.1.113883.6.1)
- SNOMED CT (2.16.840.1.113883.6.96)
- RxNorm (2.16.840.1.113883.6.88)
- ICD-10-CM (2.16.840.1.113883.6.90)
- CPT (2.16.840.1.113883.6.12)
- CVX (2.16.840.1.113883.12.292)

---

### 🔄 Phase 2 Expansion

#### 3. **Oracle Health (formerly Cerner) - FHIR R4**
- **Path**: `/rules/cerner-fhir/`
- **Format**: FHIR R4 (JSON)
- **Market Share**: 25% (KLAS 2024)
- **Official Spec**: [Oracle Health FHIR](https://fhir.cerner.com/)
- **Status**: ✅ Manifest complete
- **Resources Supported**:
  - Patient, Encounter, Condition
  - MedicationRequest, Observation
  - DocumentReference, AllergyIntolerance
  - Immunization, Procedure

**Key Features**:
- Native FHIR R4 API (Ignite APIs)
- Minimal mapping required (already FHIR)
- OAuth 2.0 + SMART on FHIR authentication
- HealtheLife patient portal integration
- Bulk FHIR export ($export) supported

**References**:
- [Oracle Health Certified Health IT](https://www.oracle.com/health/certified-health-it/)
- [Cerner FHIR Documentation](https://fhir.cerner.com/)
- [Single Patient EHI Export Spec](https://www.oracle.com/a/ocom/docs/industries/healthcare/cerner-corp-single-patient-ehi-export-data-overview.pdf)

---

#### 4. **Allscripts (Veradigm) - FHIR R4**
- **Path**: `/rules/allscripts-fhir/`
- **Format**: FHIR R4 (JSON/XML)
- **Market Share**: 5% (KLAS 2024)
- **Official Spec**: [Allscripts FHIR Developer Portal](https://developer.allscripts.com/Content/fhir/)
- **Status**: ✅ Manifest complete
- **Resources Supported**:
  - Patient, Encounter, Condition
  - MedicationRequest, Observation
  - DocumentReference, AllergyIntolerance
  - Immunization, Procedure

**Key Features**:
- RESTful API with JSON and XML support
- SMART on FHIR for patient/provider apps
- TouchWorks EHR 17.1, 20.0+ supported
- Developer sandbox available
- Unity API integration

**References**:
- [Allscripts Developer Portal](https://developer.allscripts.com/Content/fhir/)
- [TouchWorks FHIR Sandbox](https://developer.allscripts.com/Content/fhir/content/TWFHIR17_Sandbox/)

---

### 📋 Future Support (Phase 3)

- **MEDITECH Expanse FHIR** (16% market share)
- **athenahealth FHIR** (6% market share)
- **Epic FHIR API** (alternative to TSV)
- **Oracle Health SQL Export** (MySQL DDL format)

---

## Architecture

### Data Flow

```
User uploads EHI file
       ↓
Frontend detects vendor/format
       ↓
Loads appropriate YAML ruleset
       ↓
Client-side parser (TSV/XML/JSON)
       ↓
YAML rules normalize to FHIR R4
       ↓
DuckDB-WASM stores in-memory
       ↓
Display to user (NO SERVER TRANSMISSION)
```

### Key Principles

1. **Zero Server-Side PHI**: All processing happens in browser
2. **YAML in Frontend**: Rules stored in `/public/rules/` (shipped with client bundle)
3. **Vendor-Agnostic Output**: All data normalized to FHIR R4
4. **Client-Side Parsing**: DuckDB-WASM for SQL queries on normalized data
5. **Privacy-First**: No API calls with PHI, no backend database

---

## YAML Mapping Rule Structure

### Example Rule (Epic TSV → FHIR Patient)

```yaml
resource_type: Patient
source_file: PATIENT.tsv
description: Maps Epic patient demographics to FHIR Patient resource

id:
  source: PAT_ID
  transform: epic_patient_id
  required: true

identifier:
  - system: "urn:oid:1.2.840.114350.1.13.0.1.7.2.698084"
    type: "MR"
    value:
      source: PAT_MRN_ID
      required: true

name:
  - use: "official"
    family:
      source: PAT_LAST_NAME
      required: true
    given:
      - source: PAT_FIRST_NAME
        required: true

gender:
  source: SEX
  mapping:
    M: "male"
    F: "female"
  default: "unknown"

birthDate:
  source: BIRTH_DATE
  transform: format_date
  format: "YYYY-MM-DD"
  required: true
```

---

## Compliance and Standards

### USCDI Support

All rulesets support USCDI v3 and v4 data elements:

- **USCDI v3**: Required by ONC as of January 1, 2026
- **USCDI v4**: 20 additional data elements
- **USCDI v5**: Published July 16, 2024 (16 new elements)
- **USCDI v6**: Published July 24, 2025 (6 new elements)
- **USCDI v7 Draft**: Published January 29, 2026 (30 new elements)

**Reference**: [USCDI - US Core Implementation Guide](https://hl7.org/fhir/us/core/)

### FHIR Compliance

- **Target Version**: FHIR R4 (4.0.1)
- **US Core Profiles**: All resources mapped to US Core profiles
- **Profile Validation**: Ensures conformance to US Core Implementation Guide

**Reference**: [US Core Implementation Guide](https://hl7.org/fhir/us/core/)

### ONC Information Blocking Prevention

All rulesets support the ONC **full-scope EHI definition** (45 CFR 171.102), effective October 6, 2022:

- All electronic PHI in designated record set
- Goes beyond USCDI to include complete clinical notes, billing, claims
- Prevents information blocking per 21st Century Cures Act

**Reference**: [Understanding Electronic Health Information (EHI)](https://healthit.gov/information-blocking/understanding-electronic-health-information-ehi/)

---

## Technology Stack

- **Parser (TSV)**: PapaParse
- **Parser (XML)**: xml2js
- **Parser (JSON)**: Native JavaScript
- **Database**: DuckDB-WASM (in-browser SQL)
- **Validation**: FHIR Validator.js
- **Normalization**: Custom YAML rule engine

---

## File Structure

```
/frontend/public/rules/
├── vendors.json                 # Root manifest (all vendors)
├── README.md                    # This file
│
├── epic-tsv/                    # Epic EHI Tables (TSV)
│   ├── manifest.json
│   ├── 10_patient.yaml
│   ├── 20_encounter.yaml
│   ├── 30_condition_problem_list.yaml
│   ├── 40_medication_statement.yaml
│   ├── 50_observation_labs.yaml
│   ├── 55_observation_vitals.yaml
│   ├── 60_document_reference.yaml
│   ├── 70_allergy_intolerance.yaml
│   ├── 80_immunization.yaml
│   └── 90_procedure.yaml
│
├── ccda-r2/                     # Generic C-CDA (XML)
│   ├── manifest.json
│   ├── 10_patient_ccda.yaml
│   ├── 20_encounter_ccda.yaml
│   ├── 30_condition_ccda.yaml
│   ├── 40_medication_ccda.yaml
│   ├── 50_observation_ccda.yaml
│   ├── 60_document_ccda.yaml
│   ├── 70_allergy_ccda.yaml
│   ├── 80_immunization_ccda.yaml
│   ├── 90_procedure_ccda.yaml
│   └── 95_care_plan_ccda.yaml
│
├── cerner-fhir/                 # Oracle Health FHIR
│   ├── manifest.json
│   └── [FHIR resources - minimal mapping]
│
└── allscripts-fhir/             # Allscripts FHIR
    ├── manifest.json
    └── [FHIR resources - minimal mapping]
```

---

## Development Status

| Vendor | Format | Manifest | YAML Rules | Status |
|--------|--------|----------|------------|--------|
| Epic | TSV | ✅ | 🔄 In Progress | Phase 1 MVP |
| Generic | C-CDA R2.1 | ✅ | 📋 Planned | Phase 1 MVP |
| Oracle Health | FHIR R4 | ✅ | 📋 Planned | Phase 2 |
| Allscripts | FHIR R4 | ✅ | 📋 Planned | Phase 2 |
| MEDITECH | FHIR R4 | ⏳ | ⏳ | Phase 3 |
| athenahealth | FHIR R4 | ⏳ | ⏳ | Phase 3 |

---

## Market Coverage

With Phase 1 and Phase 2 implementation, this solution covers:

- **Epic**: 32% market share
- **Oracle Health (Cerner)**: 25% market share
- **MEDITECH**: 16% market share (planned)
- **athenahealth**: 6% market share (planned)
- **Allscripts**: 5% market share
- **C-CDA Universal**: 100% (all certified EHRs)

**Total Coverage**: ~84% of US EHR market + universal C-CDA support

**Source**: KLAS Research 2024 EMR Market Share Report

---

## References and Sources

### Official Vendor Specifications

- [Epic EHI Tables](https://open.epic.com/EHITables) - Epic Systems official EHI export documentation
- [Oracle Health Certified Health IT](https://www.oracle.com/health/certified-health-it/) - Cerner/Oracle Health specifications
- [Allscripts FHIR Developer Portal](https://developer.allscripts.com/Content/fhir/) - Allscripts API documentation

### HL7 FHIR and USCDI Standards

- [FHIR R4 Specification](http://hl7.org/fhir/R4/) - HL7 FHIR Release 4
- [US Core Implementation Guide](https://hl7.org/fhir/us/core/) - USCDI to FHIR mapping
- [C-CDA R2.1 Standard](http://www.hl7.org/implement/standards/product_brief.cfm?product_id=492) - HL7 C-CDA specification

### Regulatory and Compliance

- [Understanding Electronic Health Information (EHI)](https://healthit.gov/information-blocking/understanding-electronic-health-information-ehi/) - ONC EHI definition
- [USCDI v4](https://www.healthit.gov/isa/united-states-core-data-interoperability-uscdi) - HHS/ONC USCDI specification

### Additional Resources

- [Josh Mandel's EHI Living Manual](https://joshuamandel.com/ehi-living-manual/) - Comprehensive EHI export guide
- [GitHub - my-health-data-ehi-wip](https://github.com/jmandel/my-health-data-ehi-wip) - Community-driven EHI tools

---

## Contributing

When adding new vendor rulesets:

1. Create vendor directory under `/rules/`
2. Add `manifest.json` with vendor metadata
3. Create YAML rule files for each FHIR resource type
4. Update `vendors.json` root manifest
5. Add documentation to this README
6. Include official vendor specification URLs
7. Test with real-world export samples

---

## License

This ruleset collection is part of the **EHI_SaaS** project by Health Data Alchemist.

**Purpose**: Enable patient-controlled EHI normalization across all major EHR vendors.

---

**Last Updated**: March 4, 2026
**Next Review**: After Phase 1 MVP testing with real export samples
