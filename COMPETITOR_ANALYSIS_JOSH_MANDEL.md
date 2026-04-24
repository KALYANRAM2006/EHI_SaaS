# Competitor Analysis: Josh Mandel's EHI Export Tool

**Date:** April 23, 2026
**Competitor:** Josh Mandel (@JoshCMandel) - SMART Health IT / Harvard Medical School
**Repository:** https://github.com/jmandel/my-health-data-ehi-wip
**Status:** Work in Progress (Educational/Experimental)

---

## Executive Summary

Josh Mandel's project is a **command-line toolkit** for processing Epic EHI TSV exports into structured SQLite databases with TypeScript code generation. It's developer-focused and educational, designed for technical users to explore and understand Epic's EHI data model.

**Key Difference:** Josh's tool is **developer/researcher-oriented**, while ClinQuilt is **patient-oriented** with a focus on usability and privacy.

---

## Competitor's Features

### ✅ What They Have

#### 1. **Automated Data Redaction** (00-redact.js)
- **Feature:** Redact sensitive information (names, MRNs, addresses) from TSV files before sharing
- **How it works:** User provides redaction terms in JSON file → script generates regex patterns → applies to all TSV files
- **Use case:** Allows users to create anonymized sample data for sharing/testing
- **Example:**
  ```json
  {
    "names": ["John Smith", "Jane Doe"],
    "mrns": ["MRN123456"],
    "addresses": ["123 Main St"]
  }
  ```

**ClinQuilt Equivalent:** ❌ None - we don't have automated redaction
**Should ClinQuilt Add This?** ⚠️ Maybe - useful for demo data generation and research sharing

---

#### 2. **TSV to JSON Conversion** (01-make-json.js)
- **Feature:** Converts Epic's TSV exports to structured JSON
- **How it works:** Reads TSV files → validates against Epic schema → generates single JSON file with all tables
- **Benefits:** Makes data accessible to JavaScript/web applications
- **Schema validation:** Uses Epic's official table documentation

**ClinQuilt Equivalent:** ✅ Yes - Our YAML rule engine does similar parsing for multiple formats (C-CDA, FHIR, Epic TXT)
**ClinQuilt Advantage:** We support more formats beyond just TSV

---

#### 3. **Table Relationship Inference** (02-merge-related-tables.ts)
- **Feature:** Automatically detects relationships between Epic tables
- **How it works:**
  - Analyzes column names to find foreign keys
  - Detects "same logical table" patterns (e.g., `PAT_ENC` and `PAT_ENC_2`)
  - Merges related tables
  - Annotates parent-child relationships
- **Benefits:** Creates logical data model from flat TSV files
- **Example:** Links `ORDER_MED` (medication orders) to `CLARITY_MEDICATION` (medication details) via `MEDICATION_ID`

**ClinQuilt Equivalent:** ❌ Limited - We parse relationships but don't auto-infer them
**Should ClinQuilt Add This?** ✅ **YES** - This would significantly improve our data model understanding

---

#### 4. **File Splitting** (03-split-files.ts)
- **Feature:** Splits merged JSON data into separate files per table
- **How it works:** One big JSON → multiple JSON files (one per table)
- **Benefits:** Easier to work with individual tables, better Git diffs
- **Sorting:** Sorts rows by primary key for consistency

**ClinQuilt Equivalent:** ❌ No - We keep everything in DuckDB-WASM in-memory
**Relevance:** Low - ClinQuilt's in-browser database approach doesn't need file splitting

---

#### 5. **TypeScript Code Generation** (04-codegen.ts)
- **Feature:** Generates TypeScript interfaces and classes from database schema
- **How it works:** Reads JSON metadata → generates `.ts` files with types
- **Benefits:** Type-safe data access in TypeScript applications
- **Example:**
  ```typescript
  interface Patient {
    PAT_ID: string;
    PAT_NAME: string;
    BIRTH_DATE: Date;
    // ... auto-generated from schema
  }
  ```

**ClinQuilt Equivalent:** ❌ No code generation (we use dynamic typing)
**Should ClinQuilt Add This?** ⚠️ Maybe - would improve developer experience for contributors

---

#### 6. **SQLite Database Creation** (05-sqlite.ts)
- **Feature:** Creates SQLite database from JSON files
- **How it works:**
  - Generates SQL schema from JSON metadata
  - Creates tables with appropriate data types
  - Inserts data from JSON files
  - Creates indexes for foreign keys
- **Benefits:** Enables SQL queries on EHI data
- **Output:** `db.sqlite` file ready to query

**ClinQuilt Equivalent:** ✅ Yes - We use **DuckDB-WASM** (similar but in-browser)
**ClinQuilt Advantage:** Ours runs 100% client-side without requiring local SQLite installation

---

#### 7. **Sample Row Generation** (06-sample-rows.ts)
- **Feature:** Extracts sample rows from each table for documentation
- **How it works:** Takes first N rows from each table → saves as example data
- **Use case:** Helps developers understand table structure without full dataset

**ClinQuilt Equivalent:** ✅ Yes - We have `sampleData.js` with demo patients
**Similar Approach:** Both projects recognize need for sample data

---

#### 8. **Sample Table Clusters** (07-sample-table-clusters.ts)
- **Feature:** Groups related tables into logical clusters
- **How it works:** Analyzes foreign key relationships → creates clusters of related tables
- **Example Clusters:**
  - "Patient Demographics" cluster: `PATIENT`, `PATIENT_2`, `COVERAGE`
  - "Encounters" cluster: `PAT_ENC`, `APPT`, `HSP_ACCOUNT`
  - "Medications" cluster: `ORDER_MED`, `CLARITY_MEDICATION`, `RX_PHR`

**ClinQuilt Equivalent:** ❌ No - We organize by data type, not by table clusters
**Should ClinQuilt Add This?** ✅ **YES** - Would improve our "Data Lineage" view

---

#### 9. **AI-Generated Table/Column Descriptions** (08-generate-short-descriptions.ts)
- **Feature:** Uses OpenAI to generate human-readable descriptions of tables and columns
- **How it works:**
  - Sends table schema + sample data to OpenAI
  - AI generates plain-English descriptions
  - Saves descriptions to JSON for UI display
- **Example Output:**
  ```json
  {
    "PATIENT": {
      "description": "Core patient demographics including name, DOB, contact info",
      "columns": {
        "PAT_ID": "Unique patient identifier",
        "PAT_NAME": "Full legal name of patient"
      }
    }
  }
  ```

**ClinQuilt Equivalent:** ❌ No - We don't auto-generate metadata descriptions
**Should ClinQuilt Add This?** ✅ **YES** - This is BRILLIANT! Would massively improve "Data Explorer" usability

---

#### 10. **React Web UI** (index.html, src/)
- **Feature:** Web-based interface for exploring EHI data
- **Tech Stack:**
  - React 18
  - Vite (build tool)
  - TypeScript
  - sqlite-wasm (SQLite in browser)
  - react-markdown (for rendering descriptions)
  - react-syntax-highlighter (for code display)
  - react-split-pane (split view UI)
- **UI Components:**
  - SQL query interface
  - Schema browser
  - Results table display
  - Markdown documentation viewer

**ClinQuilt Equivalent:** ✅ Yes - We have comprehensive React dashboard with 10 tabs
**ClinQuilt Advantage:** More features (AI summary, payer tools, timeline, insights)

---

## Comparison Matrix

| Feature | Josh Mandel's Tool | ClinQuilt | Winner |
|---------|-------------------|-----------|--------|
| **Target Audience** | Developers/Researchers | Patients | - |
| **Data Formats** | Epic TSV only | C-CDA, FHIR, Epic TXT, CSV | **ClinQuilt** |
| **Deployment** | Command-line + local web | Azure Static Web App | **ClinQuilt** |
| **Database** | SQLite (local file) | DuckDB-WASM (in-browser) | **ClinQuilt** |
| **Privacy** | Local files (private) | 100% client-side (private) | **Tie** |
| **Data Redaction** | ✅ Automated | ❌ None | **Josh** |
| **Table Relationships** | ✅ Auto-inferred | ❌ Manual | **Josh** |
| **TypeScript Types** | ✅ Code generation | ❌ Dynamic only | **Josh** |
| **AI Descriptions** | ✅ OpenAI | ❌ Manual docs | **Josh** |
| **Table Clustering** | ✅ Logical grouping | ❌ Type-based only | **Josh** |
| **AI Clinical Summary** | ❌ None | ✅ Claude | **ClinQuilt** |
| **Payer Tools** | ❌ None | ✅ Full suite | **ClinQuilt** |
| **Interactive Timeline** | ❌ None | ✅ Visual timeline | **ClinQuilt** |
| **Clinical Insights** | ❌ None | ✅ Domain-specific | **ClinQuilt** |
| **AI Assistant Chat** | ❌ None | ✅ Conversational | **ClinQuilt** |
| **Multi-Vendor Support** | ❌ Epic only | ✅ Epic, Cerner, FHIR | **ClinQuilt** |
| **Production Ready** | ❌ WIP/Experimental | ✅ Deployed | **ClinQuilt** |
| **EHIgnite Compliance** | ❓ Unknown | ✅ 100% (6/6) | **ClinQuilt** |

---

## What ClinQuilt Should Learn From Josh's Approach

### 🔥 HIGH PRIORITY - Implement These

#### 1. **Automated Table/Column Descriptions with AI** ✅ MUST HAVE
**Why:** Josh's tool uses OpenAI to generate human-readable descriptions of every table and column. This is genius!

**How to Implement in ClinQuilt:**
```javascript
// Add to Data Explorer tab
async function generateSchemaDescriptions(database) {
  const tables = await database.getTables()

  for (const table of tables) {
    const sampleRows = await database.query(`SELECT * FROM ${table} LIMIT 5`)
    const schema = await database.getTableSchema(table)

    const prompt = `
      This is a healthcare data table from an EHI export.
      Table name: ${table}
      Columns: ${schema.columns.map(c => `${c.name} (${c.type})`).join(', ')}
      Sample data: ${JSON.stringify(sampleRows)}

      Generate:
      1. A one-sentence description of this table
      2. A brief description for each column

      Format as JSON: { "table_description": "...", "columns": { "col1": "...", "col2": "..." }}
    `

    const description = await callClaudeAPI(prompt)
    storeTableMetadata(table, description)
  }
}
```

**Benefits:**
- Makes "Data Explorer" tab infinitely more usable
- Patients understand what each table/column means
- Researchers can quickly find relevant data
- Tooltips on hover show AI-generated descriptions

**Implementation Effort:** Medium (2-3 days)
**Impact:** HIGH - transforms Data Explorer from power-user-only to accessible

---

#### 2. **Automated Table Relationship Inference** ✅ HIGHLY VALUABLE
**Why:** Josh's tool automatically detects foreign key relationships between tables, creating a logical data model

**How to Implement in ClinQuilt:**
```javascript
// Add to data parsing pipeline
function inferTableRelationships(database) {
  const relationships = []

  // Strategy 1: Column name matching
  // e.g., ORDER_MED.MEDICATION_ID → CLARITY_MEDICATION.MEDICATION_ID

  // Strategy 2: Same-table detection
  // e.g., PATIENT and PATIENT_2 are likely the same logical table

  // Strategy 3: Cardinality analysis
  // Check if column values in Table A are mostly found in Table B

  return relationships
}
```

**Benefits:**
- **Data Lineage tab** shows actual foreign key relationships
- **Timeline tab** can connect related events automatically
- **AI Summary** can reference related data intelligently
- **Query Assistant** suggests join queries based on relationships

**Implementation Effort:** High (1 week)
**Impact:** MEDIUM-HIGH - improves data understanding

---

#### 3. **Automated Data Redaction for Demo/Sharing** ⚠️ USEFUL
**Why:** Allows users to create anonymized versions of their data for sharing with researchers or support

**How to Implement in ClinQuilt:**
```javascript
// Add to Privacy Panel as new feature
function redactData(patient, redactionTerms) {
  const redacted = JSON.parse(JSON.stringify(patient))

  // Replace names
  redacted.name = "Patient [REDACTED]"

  // Replace dates with relative times
  redacted.demographics.birthDate = "[DATE REDACTED]"

  // Replace locations
  redacted.demographics.address = "[CITY], [STATE]"

  // Keep clinical data but remove identifiers
  redacted.medications.forEach(m => {
    delete m.prescriber_name
    delete m.pharmacy_name
  })

  return redacted
}
```

**Benefits:**
- Patients can share data for second opinions without privacy concerns
- Researchers can request anonymized data for studies
- Demo data generation for documentation/screenshots

**Implementation Effort:** Medium (3-4 days)
**Impact:** MEDIUM - nice to have, not critical

---

### ⚠️ MEDIUM PRIORITY - Consider These

#### 4. **Table Clustering / Logical Grouping**
**Why:** Group related tables into meaningful clusters (Demographics, Encounters, Medications)

**Current:** ClinQuilt organizes by data type (medications, conditions, labs)
**Improvement:** Show "clusters" of related tables in Data Explorer

**Implementation Effort:** Medium (2-3 days)
**Impact:** MEDIUM - improves data organization

---

#### 5. **TypeScript Code Generation**
**Why:** Generate TypeScript types from parsed EHI schema

**Benefits:**
- Type-safe data access for developers contributing to ClinQuilt
- Better IDE autocomplete when working with patient data
- Reduces bugs from typos in property names

**Implementation Effort:** Medium (3-4 days)
**Impact:** LOW-MEDIUM - helps developers, not patients

---

### ❌ LOW PRIORITY - Skip These

#### 6. **File Splitting** - ❌ Not Needed
**Why:** Josh splits JSON into separate files for Git version control
**ClinQuilt:** We use in-memory DuckDB-WASM, no need for files

---

#### 7. **Command-Line Processing Pipeline** - ❌ Not Needed
**Why:** Josh uses Bun scripts (00-redact.js, 01-make-json.js, etc.)
**ClinQuilt:** We process everything in-browser, no CLI needed

---

## Josh's Strengths (That ClinQuilt Already Matches or Beats)

### 1. **SQLite-WASM for In-Browser Database** ✅ We Use DuckDB-WASM
**Josh's Approach:** Uses `@sqlite.org/sqlite-wasm` for in-browser SQL queries
**ClinQuilt:** Uses DuckDB-WASM (more powerful - vectorized queries, better performance)
**Winner:** **ClinQuilt** (DuckDB is faster for analytics)

### 2. **React + Vite + TypeScript Stack** ✅ We Have This
**Josh's Approach:** Modern web stack with Vite for fast builds
**ClinQuilt:** Same stack (React 18 + Vite + TypeScript)
**Winner:** **Tie**

### 3. **SQL Query Interface** ✅ We Have This
**Josh's Approach:** SQL query box with results table
**ClinQuilt:** Data Explorer tab with DuckDB SQL queries
**Winner:** **Tie** (both have this feature)

---

## What ClinQuilt Has That Josh Doesn't

### 1. **Patient-Friendly AI Summaries** ✅ ClinQuilt Exclusive
Josh's tool is for developers; ClinQuilt translates medical jargon to plain English

### 2. **Payer Tools (Insurance, PA, Costs, Savings)** ✅ ClinQuilt Exclusive
Josh's tool doesn't address payer workflows at all

### 3. **Interactive Timeline Visualization** ✅ ClinQuilt Exclusive
Josh's tool is SQL-focused; ClinQuilt has visual chronology

### 4. **Clinical Domain Insights** ✅ ClinQuilt Exclusive
Josh's tool doesn't do clinical analytics (BP trends, HbA1c, etc.)

### 5. **Multi-Vendor Format Support** ✅ ClinQuilt Exclusive
Josh's tool only supports Epic TSV; ClinQuilt supports C-CDA, FHIR, Epic TXT

### 6. **Production Deployment** ✅ ClinQuilt Exclusive
Josh's tool is experimental/WIP; ClinQuilt is production-deployed on Azure

### 7. **EHIgnite Challenge Compliance** ✅ ClinQuilt Exclusive
Josh's tool wasn't built for EHIgnite; ClinQuilt meets all 6 requirements

---

## Recommendations for ClinQuilt Enhancement

### 🔥 Immediate Action Items (This Week)

**1. Add AI-Generated Table/Column Descriptions**
- **Why:** Transforms Data Explorer from power-user tool to accessible feature
- **How:** Use Claude API to generate descriptions for all DuckDB tables
- **Display:** Show as tooltips in Data Explorer schema browser
- **Effort:** 2-3 days
- **Impact:** HIGH - dramatically improves usability

**Implementation Plan:**
```
Day 1: Create description generation service
Day 2: Integrate with Data Explorer UI
Day 3: Cache descriptions in localStorage, add tooltips
```

---

### ⚠️ Short-Term Enhancements (Next Month)

**2. Implement Table Relationship Inference**
- **Why:** Improves Data Lineage tab and enables smarter AI queries
- **How:** Analyze column names and data cardinality to detect foreign keys
- **Display:** Show relationship graph in Data Lineage tab
- **Effort:** 1 week
- **Impact:** MEDIUM-HIGH

**3. Add Data Redaction Feature**
- **Why:** Enables users to share anonymized data for research/support
- **How:** New Privacy Panel option to "Export Redacted Data"
- **Effort:** 3-4 days
- **Impact:** MEDIUM

---

### 📊 Future Considerations (Backlog)

**4. Table Clustering in Data Explorer**
- Group related tables logically (Demographics, Encounters, Medications)
- Effort: 2-3 days
- Impact: MEDIUM

**5. TypeScript Code Generation for Contributors**
- Generate types from DuckDB schema
- Effort: 3-4 days
- Impact: LOW-MEDIUM (developer experience improvement)

---

## Competitive Positioning

### ClinQuilt's Unique Value Proposition (vs. Josh's Tool)

| Dimension | ClinQuilt | Josh's Tool |
|-----------|-----------|-------------|
| **Target User** | **Patients** (non-technical) | Developers/Researchers |
| **Use Case** | Health management, payer tools | Data exploration, research |
| **Deployment** | **Production-ready** (Azure) | Experimental (local) |
| **Features** | **10-tab dashboard** (AI, payer, timeline) | SQL query interface only |
| **AI Integration** | **Clinical summaries** (Claude) | Table descriptions (OpenAI) |
| **Privacy** | **Zero server PHI** | Local files only |
| **EHIgnite** | **100% compliant** | Not applicable |
| **Maturity** | **Production** | Work in Progress |

**Takeaway:** Josh's tool is a **developer sandbox** for exploring Epic data. ClinQuilt is a **patient-facing application** for health management. They serve different audiences but we can learn from his technical innovations (AI descriptions, relationship inference).

---

## Action Plan: Incorporate Best Ideas

### Phase 1: AI-Generated Metadata (Week 1)
- [ ] Create schema description generation service
- [ ] Integrate Claude API for table/column descriptions
- [ ] Add tooltips to Data Explorer
- [ ] Cache descriptions in localStorage
- [ ] Test with sample patient data

### Phase 2: Relationship Inference (Week 2-3)
- [ ] Implement foreign key detection algorithm
- [ ] Add relationship graph to Data Lineage tab
- [ ] Update AI Summary to use relationships
- [ ] Create "Related Data" suggestions in UI

### Phase 3: Data Redaction (Week 4)
- [ ] Add "Export Redacted Data" to Privacy Panel
- [ ] Implement HIPAA Safe Harbor de-identification
- [ ] Create redacted JSON download
- [ ] Add warning about use cases (research sharing only)

---

## Conclusion

Josh Mandel's EHI tool is an excellent **technical reference** but serves a different audience. ClinQuilt should adopt his best innovations:

1. ✅ **AI-generated table/column descriptions** - MUST implement
2. ✅ **Table relationship inference** - Highly valuable
3. ⚠️ **Data redaction** - Nice to have

ClinQuilt maintains its competitive edge through:
- Patient-focused UX (AI summaries, payer tools, timeline)
- Production deployment (Azure Static Web Apps)
- Multi-vendor support (C-CDA, FHIR, Epic)
- EHIgnite compliance (6/6 requirements)

**Final Verdict:** Josh's project validates our architecture (SQLite-WASM → we use DuckDB-WASM) and shows opportunities for enhancement. We should cherry-pick his best ideas while maintaining our patient-first focus.

---

**Prepared by:** Claude Code + Rajendra Kalyan Ram Jonnagadla
**Date:** April 23, 2026
**Purpose:** Competitive analysis for ClinQuilt enhancement
**Next Steps:** Prioritize AI-generated descriptions feature for implementation
