# EHI SaaS - Client-Side EHI Normalization Platform
**Universal EHI Processing with Zero Server-Side PHI**

---

## 🎯 Overview

EHI SaaS is a **100% client-side** application that normalizes Electronic Health Information (EHI) exports from multiple EHR vendors into a unified canonical format.

**Key Principle**: **No PHI ever touches the server.**

All data parsing, normalization, and processing happens entirely in the user's browser using:
- React + TypeScript
- Tailwind CSS
- DuckDB-WASM (in-browser SQL database)
- YAML-based mapping rules

---

## 🏗️ Architecture

### Client-Side Processing Model

```
┌─────────────────────────────────────────────────────┐
│              User's Browser (100% Local)             │
│                                                      │
│  ┌────────────────────────────────────────────┐   │
│  │  React App (Azure Static Web Apps)         │   │
│  │  • File Upload UI                          │   │
│  │  • YAML Rule Engine                        │   │
│  │  • DuckDB-WASM (In-Memory Database)        │   │
│  │  • Data Visualization                      │   │
│  └────────────────────────────────────────────┘   │
│                      │                              │
│                      ▼                              │
│  ┌────────────────────────────────────────────┐   │
│  │  Vendor EHI Export (Epic ZIP, etc.)        │   │
│  │  → Parsed in Browser                       │   │
│  │  → Normalized via YAML Rules               │   │
│  │  → Loaded into DuckDB-WASM                 │   │
│  │  → Queried & Displayed                     │   │
│  └────────────────────────────────────────────┘   │
│                                                      │
│  📊 All PHI stays in browser memory only            │
│  🔒 Nothing sent to server                          │
└─────────────────────────────────────────────────────┘
```

### No Backend for PHI

**What the "backend" actually is:**
- **NOT** for processing PHI
- **ONLY** for:
  - Serving the React app (static files)
  - Hosting YAML rule files
  - Optional: Analytics (no PHI)
  - Optional: User preferences (no PHI)

### Deployment

```
GitHub Repository
   ├── /frontend (React + Tailwind + YAML rules)
   └── /.github/workflows (CI/CD)
        ↓
    GitHub Actions
        ↓
    Azure Static Web Apps
        ↓
    User Browser (All processing happens here)
```

---

## 📁 Project Structure

```
EHI_SaaS/
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── parsers/            # Vendor-specific parsers
│   │   ├── normalizers/        # YAML rule engine
│   │   ├── hooks/              # React hooks
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Helper functions
│   │   ├── store/              # State management
│   │   └── rules/              # Inline rules (optional)
│   │
│   ├── public/
│   │   ├── rules/              # ✅ YAML mapping rules (main storage)
│   │   │   ├── epic-tsv/
│   │   │   │   ├── manifest.json
│   │   │   │   ├── 10_patient.yaml
│   │   │   │   ├── 20_encounter.yaml
│   │   │   │   ├── 30_condition_problem_list.yaml
│   │   │   │   ├── 40_medication_statement.yaml
│   │   │   │   ├── 50_observation_labs.yaml
│   │   │   │   └── 60_document_index.yaml
│   │   │   │
│   │   │   ├── athena/
│   │   │   │   └── manifest.json
│   │   │   │
│   │   │   └── cerner/
│   │   │       └── manifest.json
│   │   │
│   │   └── index.html
│   │
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MAPPING_RULES.md
│   └── VENDOR_SUPPORT.md
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
└── README.md (this file)
```

---

## 🔧 Technology Stack

### Frontend
- **React 18+** with TypeScript
- **Vite** (fast builds, dev server)
- **Tailwind CSS** (styling)
- **DuckDB-WASM** (in-browser SQL database)
- **JSZip** (ZIP file handling for Epic exports)
- **PapaParse** (CSV/TSV parsing)
- **js-yaml** (YAML rule parsing)
- **Zustand** (state management)

### Deployment
- **Azure Static Web Apps** (hosting)
- **GitHub Actions** (CI/CD)
- **Azure CDN** (global distribution)

### Data Processing (All Client-Side)
- **DuckDB-WASM** - In-memory SQL database
- **Web Workers** - Background processing
- **IndexedDB** - Optional browser storage (user choice)

---

## 🗂️ YAML Mapping Rules

### Storage Location

**✅ Recommended: `/frontend/public/rules/`**

Why?
- Ships with the app bundle
- Loaded dynamically at runtime
- Version-controlled with Git
- No API calls needed
- Works offline

### Manifest Structure

**`/public/rules/epic-tsv/manifest.json`:**
```json
{
  "ruleset_version": "2026.03.04-epic-mvp",
  "vendor": "epic",
  "export_type": "TSV",
  "fhir_target": "R4",
  "description": "Epic MyChart EHI Export (ZIP with TSV files)",
  "files": [
    "10_patient.yaml",
    "20_encounter.yaml",
    "30_condition_problem_list.yaml",
    "40_medication_statement.yaml",
    "50_observation_labs.yaml",
    "60_document_index.yaml"
  ],
  "source_files": {
    "PATIENT.tsv": "10_patient.yaml",
    "PAT_ENC.tsv": "20_encounter.yaml",
    "ORDER_PROC.tsv": "50_observation_labs.yaml"
  }
}
```

### Loading Rules at Runtime

```typescript
// Load manifest
const manifest = await fetch('/rules/epic-tsv/manifest.json')
  .then(r => r.json());

// Load all rule files
const ruleFiles = await Promise.all(
  manifest.files.map(file =>
    fetch(`/rules/epic-tsv/${file}`)
      .then(r => r.text())
      .then(yaml => jsyaml.load(yaml))
  )
);

// Apply rules to normalize data
const normalizedData = applyRules(rawEpicData, ruleFiles);
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Clone repository
git clone <repo-url>
cd EHI_SaaS

# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Development

```bash
# Run dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📊 Data Flow

### Step 1: User Uploads EHI Export
```
User selects Epic ZIP file
  ↓
React app reads file in browser
  ↓
JSZip extracts TSV files
```

### Step 2: Parse Vendor Format
```
Identify vendor (Epic, Athena, etc.)
  ↓
Load appropriate YAML rules
  ↓
Parse TSV/CSV/JSON files
```

### Step 3: Normalize to Canonical Format
```
Apply YAML mapping rules
  ↓
Transform to FHIR-like structure
  ↓
Validate and clean data
```

### Step 4: Load into DuckDB-WASM
```
Create in-memory tables
  ↓
Load normalized data
  ↓
Enable SQL queries
```

### Step 5: Display and Export
```
Show interactive UI
  ↓
User can query, filter, visualize
  ↓
Export to FHIR JSON (optional)
```

---

## 🔒 Security & Privacy

### Zero Server-Side PHI

**What stays in the browser:**
- ✅ All raw EHI files
- ✅ All parsed data
- ✅ All normalized data
- ✅ All queries and results
- ✅ All visualizations

**What goes to the server:**
- ❌ Nothing with PHI
- ✅ Analytics (anonymized, optional)
- ✅ Error reports (no PHI)

### Browser Storage

**User controls:**
- User can choose to save processed data in IndexedDB
- User can clear all data anytime
- No automatic cloud backup
- No server-side storage

### HIPAA Considerations

**This is NOT a HIPAA-covered application** because:
- No PHI transmitted to or stored on server
- All processing in user's browser (user's device)
- No business associate relationship required
- Similar to Excel or other local tools

---

## 🎯 Supported Vendors (Roadmap)

### Phase 1 (MVP)
- ✅ **Epic MyChart** (TSV export in ZIP)
- ⏳ Athena
- ⏳ Cerner

### Phase 2
- ⏳ Greenway
- ⏳ Allscripts
- ⏳ eClinicalWorks

### Universal Support
- ✅ CCDA (C-CDA XML)
- ✅ FHIR R4 (JSON bundles)

---

## 📈 Development Roadmap

### v0.1 - MVP (Current)
- [ ] Epic TSV parser
- [ ] YAML rule engine
- [ ] DuckDB-WASM integration
- [ ] Basic UI (upload, view)
- [ ] Patient resource normalization

### v0.2 - Enhanced
- [ ] Multiple resource types
- [ ] Data visualization
- [ ] FHIR export
- [ ] Athena support

### v0.3 - Production
- [ ] Advanced queries
- [ ] Timeline view
- [ ] PDF reports
- [ ] Cerner support

### v1.0 - Launch
- [ ] All major vendors
- [ ] Full FHIR compliance
- [ ] Advanced analytics
- [ ] Mobile responsive

---

## 🧪 Testing Strategy

### Unit Tests
- YAML rule parser
- Data normalizers
- Vendor parsers

### Integration Tests
- End-to-end file processing
- DuckDB queries
- FHIR validation

### Browser Tests
- Chrome, Firefox, Safari, Edge
- Mobile browsers
- DuckDB-WASM compatibility

---

## 🚢 Deployment

### Azure Static Web Apps

**Automatic deployment on push to main:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: |
          cd frontend
          npm ci
          npm run build
      - name: Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_TOKEN }}
          app_location: "frontend"
          output_location: "dist"
```

---

## 📝 Versioning

### Rule Versioning

Each ruleset has a version in `manifest.json`:
```json
{
  "ruleset_version": "YYYY.MM.DD-vendor-identifier"
}
```

### App Versioning

Semantic versioning: `v0.1.0`, `v0.2.0`, `v1.0.0`

### Provenance Tracking

Every normalized record includes:
```json
{
  "provenance": {
    "source_vendor": "epic",
    "source_format": "tsv",
    "ruleset_version": "2026.03.04-epic-mvp",
    "app_version": "0.1.0",
    "normalized_at": "2026-03-04T14:30:00Z"
  }
}
```

---

## 🤝 Contributing

### Adding New Vendor Support

1. Create vendor folder: `/public/rules/{vendor}/`
2. Create `manifest.json`
3. Create YAML mapping files
4. Add parser in `/src/parsers/{vendor}.ts`
5. Add tests
6. Update documentation

### Improving Rules

1. Edit YAML files in `/public/rules/`
2. Test with sample data
3. Increment `ruleset_version`
4. Submit PR

---

## 📚 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Mapping Rules Guide](docs/MAPPING_RULES.md)
- [Vendor Support Matrix](docs/VENDOR_SUPPORT.md)
- [API Reference](docs/API.md)

---

## 🏆 Credits

**Team**: Health Data Alchemist
**Lead**: Rajendra Kalyan Ram Jonnagadla
**Organization**: Cedars-Sinai Health System

**Built for**: EHIgnite Challenge 2026

---

## 📜 License

[To be determined]

---

## 🔗 Links

- **EHIgnite Challenge**: https://ehignitechallenge.org/
- **ONC EHI Information**: https://healthit.gov/information-blocking/understanding-electronic-health-information-ehi/
- **FHIR Specification**: https://hl7.org/fhir/

---

**Last Updated**: March 4, 2026
**Version**: 0.1.0-alpha
