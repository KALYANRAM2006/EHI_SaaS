# Epic EHI Tables Column Reference
**Source**: Epic Official EHI Tables Specification (DocGen_su117s2p_2026-02-22_14.10.00)
**Generated**: March 4, 2026
**Location**: `C:\Users\JonnagadlaR\OneDrive - Cedars-Sinai Health System\EHIgnite_Challenge\Epic EHI Tables\`

---

## PATIENT Table Columns (Identified)

**Primary Key**: PAT_ID (Column 1)
**Description**: The PATIENT table contains one record for each patient in your system.

### Core Demographics (Columns 1-50)
| # | Column Name | Type | Description |
|---|-------------|------|-------------|
| 1 | PAT_ID | VARCHAR | Unique ID of the patient record (Primary Key) |
| 2 | PAT_NAME | VARCHAR | Patient's name in format Lastname, Firstname MI |
| 3 | CITY | VARCHAR | The city in which the patient lives |
| 4 | STATE_C_NAME | VARCHAR | Category value for state |
| 5 | COUNTY_C_NAME | VARCHAR | Category value for county |
| 6 | COUNTRY_C_NAME | VARCHAR | Category value for country |
| 7 | ZIP | VARCHAR | ZIP Code |
| 8 | HOME_PHONE | VARCHAR | Patient's home phone number |
| 9 | WORK_PHONE | VARCHAR | Patient's work phone number |
| 10 | EMAIL_ADDRESS | VARCHAR | Patient's e-mail address |
| 11 | BIRTH_DATE | DATETIME (Local) | Date patient was born |
| 12 | ETHNIC_GROUP_C_NAME | VARCHAR | Patient's ethnic background |
| 13 | RELIGION_C_NAME | VARCHAR | Patient's religion |
| 14 | LANGUAGE_C_NAME | VARCHAR | Patient's language |
| 15 | SSN | VARCHAR | Social Security Number (999-99-9999) |
| 16 | REG_DATE | DATETIME | Date of last patient verification |
| 17 | REG_STATUS_C_NAME | VARCHAR | Patient's registration status |
| 18 | MEDICARE_NUM | VARCHAR | Medicare ID number |
| 19 | MEDICAID_NUM | VARCHAR | Medicaid ID |
| 20 | ADV_DIRECTIVE_YN | VARCHAR | Has living will (Y/N) |
| 21 | ADV_DIRECTIVE_DATE | DATETIME | Date living will received |
| 22 | CUR_PCP_PROV_ID_PROV_NAME | VARCHAR | Current Primary Care Provider name |
| 23 | CUR_PRIM_LOC_ID_LOC_NAME | VARCHAR | Current primary location name |
| 24 | LEGAL_STATUS_C_NAME | VARCHAR | Legal status associated with death |
| 25 | BIRTH_STATUS_C_NAME | VARCHAR | Newborn status at birth |
| 26 | PED_MULT_BIRTH_ORD | INTEGER | Birth order for multiple births |
| 27 | PED_MULT_BIRTH_TOT | INTEGER | Total number of births in delivery |
| 28 | CREATE_USER_ID | VARCHAR | System user who entered record |
| 29 | CREATE_USER_ID_NAME | VARCHAR | Name of user who created record |
| 30 | PAT_MRN_ID | VARCHAR | **Medical Record Number (MRN)** |
| 31 | DEATH_DATE | DATETIME (Local) | Date of death |
| 32 | REC_CREATE_PAT_ID | VARCHAR | User who created patient record |
| 33 | REC_CREATE_PAT_ID_NAME | VARCHAR | Name of record creator |
| 34 | ORGAN_DONOR_YN | VARCHAR | Is organ donor (Y/N) |
| 35 | TMP_CITY | VARCHAR | City of temporary residence |
| 44 | PAT_LAST_NAME | VARCHAR | **Last name of patient** |
| 45 | PAT_FIRST_NAME | VARCHAR | **First name of patient** |
| 46 | PAT_MIDDLE_NAME | VARCHAR | **Middle name of patient** |
| 47 | PAT_TITLE_C_NAME | VARCHAR | Patient title |
| 85 | SEX_C_NAME | VARCHAR | **Patient sex/gender** |

**Note**: PATIENT table contains 85 total columns. Above are the most critical for FHIR Patient resource mapping.

---

## PAT_ENC Table Columns (Identified)

**Primary Key**: PAT_ENC_CSN_ID (Column 3)
**Description**: Contains one record for each patient encounter (visits, appointments, telephone encounters).

| # | Column Name | Type | Description |
|---|-------------|------|-------------|
| 1 | PAT_ID | VARCHAR | Patient ID (links to PATIENT.PAT_ID) |
| 2 | PAT_ENC_DATE_REAL | FLOAT | Unique contact date in decimal format |
| 3 | PAT_ENC_CSN_ID | NUMERIC | **Primary Key** - Unique encounter serial number |
| 4 | CONTACT_DATE | DATETIME | Date of contact in calendar format |
| 5 | PCP_PROV_ID_PROV_NAME | VARCHAR | Service provider name |
| 6 | FIN_CLASS_C_NAME | VARCHAR | Financial Class (Commercial, Medicare, Medicaid, etc.) |

**Total Columns**: 100+ (detailed extraction needed)

---

## PROBLEM_LIST Table Columns (Identified)

**Primary Key**: PROBLEM_LIST_ID (Column 1)
**Description**: Contains data from patients' problem lists (active, resolved, and deleted problems).

| # | Column Name | Type | Description |
|---|-------------|------|-------------|
| 1 | PROBLEM_LIST_ID | NUMERIC | **Primary Key** - Unique ID of problem list entry |
| 2 | DX_ID_DX_NAME | VARCHAR | Name of the diagnosis |
| 3 | DESCRIPTION | VARCHAR | Display name (if changed from default) |
| 4 | NOTED_DATE | DATETIME | First possible date problem was noted/diagnosed |
| 5 | RESOLVED_DATE | DATETIME | Date problem was resolved |
| 6 | DATE_OF_ENTRY | DATETIME | Date problem was last edited |
| 7 | ENTRY_USER_ID | VARCHAR | User who last edited the problem |
| 8 | ENTRY_USER_ID_NAME | VARCHAR | Name of user who last edited |
| 9 | PROBLEM_CMT | VARCHAR | Overview note preview text |

**Total Columns**: 40+ (detailed extraction needed)

---

## ORDER_MED Table

**Primary Key**: ORDER_MED_ID
**Description**: Medication orders and prescriptions

**Status**: Full column list extraction needed from ORDER_MED.htm

---

## ORDER_PROC Table

**Primary Key**: ORDER_PROC_ID
**Description**: Lab results, diagnostic tests, and observations

**Status**: Full column list extraction needed from ORDER_PROC.htm

---

## DOC_INFORMATION Table

**Primary Key**: DOCUMENT_ID
**Description**: Clinical documents, notes, and reports index

**Status**: Full column list extraction needed from DOC_INFORMATION.htm

---

## ALLERGY Table

**Primary Key**: ALLERGY_ID
**Description**: Patient allergies and adverse reactions

**Status**: Full column list extraction needed from ALLERGY.htm

---

## IMMUNE Table (Immunization)

**Primary Key**: IMMUNIZATION_ID (presumed)
**Description**: Vaccination history and immunization records

**Status**: Full column list extraction needed from IMMUNE.htm

---

## IP_FLWSHT_MEAS Table (Flowsheet)

**Description**: Vital signs and flowsheet measurements

**Status**: Full column list extraction needed from IP_FLWSHT_MEAS.htm

---

## Implementation Status

### Completed
- ✅ PATIENT table - Key columns identified (85 total columns documented by Epic)
- ✅ PAT_ENC table - Key columns identified
- ✅ PROBLEM_LIST table - Key columns identified

### In Progress
- 🔄 ORDER_MED table - Specification ready for parsing
- 🔄 ORDER_PROC table - Specification ready for parsing
- 🔄 DOC_INFORMATION table - Specification ready for parsing
- 🔄 ALLERGY table - Specification ready for parsing
- 🔄 IMMUNE table - Specification ready for parsing
- 🔄 IP_FLWSHT_MEAS table - Specification ready for parsing

---

## Next Steps

1. **Automated Parsing**: Create Python script to parse all HTML specifications automatically
2. **Complete Column Extraction**: Extract all columns for remaining tables
3. **YAML Generation**: Generate comprehensive YAML mapping files for each table
4. **Testing**: Validate mappings with actual Epic TSV export samples
5. **Documentation**: Create field-by-field mapping documentation

---

## References

- Epic EHI Tables Official Specification: `https://open.epic.com/EHITables`
- Local Copy: `C:\Users\JonnagadlaR\OneDrive - Cedars-Sinai Health System\EHIgnite_Challenge\Epic EHI Tables\DocGen_su117s2p_2026-02-22_14.10.00\`
- Specification Date: February 22, 2026 at 2:10 PM CT
- Epic Version: February 2026 Release
