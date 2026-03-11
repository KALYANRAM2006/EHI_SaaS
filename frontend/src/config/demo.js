/**
 * Demo Configuration
 *
 * Controls demo mode behavior: expiry dates, guided tour, feature locks.
 * The DEMO_EXPIRY_DATE is set at build time via the VITE_DEMO_EXPIRY env var,
 * or defaults to 30 days from the build date.
 *
 * Production builds ignore this file — isDemo() returns false when VITE_DEMO is not set.
 */

// ─── Demo Detection ──────────────────────────────────────────────────────────

export function isDemo() {
  return import.meta.env.VITE_DEMO === 'true'
}

// ─── Expiry ──────────────────────────────────────────────────────────────────

/**
 * Returns the demo expiry date.
 * Priority: VITE_DEMO_EXPIRY env var → 30 days from build date.
 * Format: ISO date string (e.g. "2026-04-05")
 */
export function getDemoExpiryDate() {
  const envDate = import.meta.env.VITE_DEMO_EXPIRY
  if (envDate) return new Date(envDate)

  // Default: 7 days from build time
  const buildDate = new Date(import.meta.env.VITE_BUILD_DATE || Date.now())
  buildDate.setDate(buildDate.getDate() + 7)
  return buildDate
}

/**
 * Check if the demo has expired.
 */
export function isDemoExpired() {
  if (!isDemo()) return false
  return new Date() > getDemoExpiryDate()
}

/**
 * Get human-readable days remaining.
 */
export function getDaysRemaining() {
  const expiry = getDemoExpiryDate()
  const now = new Date()
  const diffMs = expiry - now
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Format expiry date for display.
 */
export function formatExpiryDate() {
  return getDemoExpiryDate().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Tour Steps ──────────────────────────────────────────────────────────────

/**
 * Guided tour steps — each step targets a data-tour attribute on a DOM element.
 * The tour advances automatically or on user click.
 */
export const TOUR_STEPS = [
  // ─── Landing Page: App Purpose & File Handling ─────────────────────────────

  {
    target: '[data-tour="landing-hero"]',
    title: 'Welcome to ClinQuilt',
    content: 'ClinQuilt transforms complex Electronic Health Information (EHI) export files into beautiful, AI-powered visualizations that patients and providers can actually understand. No medical expertise needed — just upload your data.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="landing-features"]',
    title: 'What You Can Do',
    content: 'Multi-EHR Support: parse data from C-CDA, FHIR, and Epic formats. AI Summaries: get a plain-English health narrative. Timeline View: see your full medical history chronologically. Privacy: everything runs in your browser — zero server contact.',
    placement: 'top',
  },
  {
    target: '[data-tour="landing-upload"]',
    title: 'Upload Your Health Records',
    content: 'Drag and drop your EHI export file onto this area, or click "Browse Files" to select from your computer. You can upload one file at a time — and then add more sources to build a complete picture.',
    placement: 'top',
  },
  {
    target: '[data-tour="landing-formats"]',
    title: 'Supported File Formats',
    content: 'C-CDA (.xml): The standard hospital discharge and clinical summary format. FHIR (.json): Modern health data interchange format used by most EHRs. Epic TSV (.tsv): Tab-separated files from Epic MyChart exports. ClinQuilt auto-detects the format — just upload the file.',
    placement: 'top',
  },
  {
    target: '[data-tour="landing-browse-btn"]',
    title: 'How to Select Files',
    content: 'Click "Browse Files" to open your file picker. Select any supported file (XML, JSON, or TSV). After loading the first file, you will see an "Add Another Data Source" option to combine records from multiple hospitals or EHR systems.',
    placement: 'top',
  },
  {
    target: '[data-tour="landing-privacy"]',
    title: 'Your Privacy is Protected',
    content: 'All file parsing and AI analysis happens locally in your browser. No health data is ever sent to any server. Optional AES-256 encryption and session-only mode that auto-clears when you close the tab.',
    placement: 'top',
  },
  {
    target: '[data-tour="landing-sample-btn"]',
    title: 'Try It Now — Loading Demo Data',
    content: 'Click Next and we will load sample patient data with multiple sources so you can see multi-file merging, patient identity matching, and all dashboard features in action.',
    placement: 'top',
  },

  // ─── Dashboard: Feature Walkthrough ────────────────────────────────────────

  {
    target: '[data-tour="tab-nav"]',
    title: 'Dashboard Navigation',
    content: 'The dashboard has 7 views: Overview, AI Summary, Timeline, Insights, Data Explorer, AI Assistant, and Data Lineage. Use these tabs to explore different perspectives on the patient data.',
    placement: 'bottom',
    action: { navigate: '/dashboard' },
  },
  {
    target: '[data-tour="patient-header"]',
    title: 'Patient Overview & Multi-Source Merge',
    content: 'This header shows merged patient demographics from all uploaded sources. When multiple files are loaded, ClinQuilt automatically deduplicates records (e.g., same medication from two hospitals appears once). The total record count and date range reflect the combined data.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="ai-summary-card"]',
    title: 'AI Health Summary',
    content: 'An AI-generated narrative summarizes the patient full health story — conditions, medications, trends, and risk score. This AI runs 100% in your browser using your data only. No cloud calls.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="category-cards"]',
    title: 'Clinical Categories',
    content: 'Drill into Medications, Encounters, Lab Results, Conditions, and more. Each card shows a count and quick preview. Color-coded badges indicate which source file each record came from when multiple files are loaded.',
    placement: 'top',
  },
  {
    target: '[data-tour="tab-ai-summary"]',
    title: 'Full AI Summary',
    content: 'Read the complete AI health narrative with expandable sections for each clinical area. Great for understanding the big picture before diving into details.',
    placement: 'bottom',
    action: { view: 'ai-summary' },
  },
  {
    target: '[data-tour="tab-timeline"]',
    title: 'Interactive Timeline',
    content: 'See every encounter, lab, and medication on a chronological timeline. Filter by year and category. Multi-source records are color-coded by origin.',
    placement: 'bottom',
    action: { view: 'timeline' },
  },
  {
    target: '[data-tour="tab-insights"]',
    title: 'AI-Driven Insights',
    content: 'Automated health insights detect trends, flag abnormal lab results, and highlight care gaps. The AI analyzes patterns across all loaded sources.',
    placement: 'bottom',
    action: { view: 'insights' },
  },
  {
    target: '[data-tour="tab-data-explorer"]',
    title: 'Data Explorer',
    content: 'Browse the raw parsed data in a searchable tree view. Every clinical record is organized by category. Useful for verifying exactly what was imported.',
    placement: 'bottom',
    action: { view: 'data-explorer' },
  },
  {
    target: '[data-tour="tab-ai-assistant"]',
    title: 'AI Chat Assistant',
    content: 'Ask natural-language questions about the patient health — "What medications are they on?", "Any abnormal labs?". The AI answers using only the loaded data, never inventing information.',
    placement: 'bottom',
    action: { view: 'ai-assistant' },
  },
  {
    target: '[data-tour="tab-data-lineage"]',
    title: 'Multi-Source Data Lineage',
    content: 'See which records came from which source file. Color-coded lineage tracks every data point to its origin — essential when combining records from multiple hospitals or EHR systems. Tour complete!',
    placement: 'bottom',
    action: { view: 'data-lineage' },
  },
]
