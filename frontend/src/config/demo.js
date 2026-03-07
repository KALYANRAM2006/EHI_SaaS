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

  // Default: 30 days from build time
  const buildDate = new Date(import.meta.env.VITE_BUILD_DATE || Date.now())
  buildDate.setDate(buildDate.getDate() + 30)
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
  // --- Landing Page steps (app purpose & how to use) ---
  {
    target: '[data-tour="landing-hero"]',
    title: 'Welcome to HealthLens',
    content: 'HealthLens transforms complex Electronic Health Information (EHI) files into beautiful, AI-powered visualizations that patients and providers can actually understand.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="landing-features"]',
    title: 'What HealthLens Does',
    content: 'Parse data from any major EHR format (C-CDA, FHIR, Epic TSV), generate AI health summaries, visualize timelines, detect insights, and trace data lineage across multiple sources.',
    placement: 'top',
  },
  {
    target: '[data-tour="landing-upload"]',
    title: 'Getting Started',
    content: 'Upload your EHI export file here. Drag and drop or click Browse Files. HealthLens supports C-CDA (.xml), FHIR (.json), and Epic MyChart TSV (.tsv) files. You can add multiple files from different sources.',
    placement: 'top',
  },
  {
    target: '[data-tour="landing-privacy"]',
    title: 'Privacy First',
    content: 'All processing happens in your browser. No health data is ever sent to a server. Zero server contact, AES-256 encryption option, and session-only mode that auto-clears on close.',
    placement: 'top',
  },
  {
    target: '[data-tour="landing-sample-btn"]',
    title: 'Try It Now — Loading Sample Data',
    content: 'Let us load sample patient data so you can explore all features. Click Next to continue to the dashboard.',
    placement: 'top',
    action: { navigate: '/dashboard' },
  },
  // --- Dashboard steps ---
  {
    target: '[data-tour="tab-nav"]',
    title: 'Dashboard Navigation',
    content: 'The dashboard has 7 views: Overview, AI Summary, Timeline, Insights, Data Explorer, AI Assistant, and Data Lineage. Each gives a different perspective on the patient data.',
    placement: 'bottom',
    action: { view: 'overview' },
  },
  {
    target: '[data-tour="patient-header"]',
    title: 'Patient Overview',
    content: 'See the patient demographics, total record count, and date range at a glance. When multiple files are loaded, records are merged and deduplicated automatically.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="ai-summary-card"]',
    title: 'AI Health Summary',
    content: 'An AI-generated narrative summarizes the patient\'s full health story including conditions, medications, trends, and risk score. This runs entirely in your browser.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="category-cards"]',
    title: 'Clinical Categories',
    content: 'Drill into Medications, Encounters, Lab Results, Conditions, and more. Each card shows a count and quick preview of the records.',
    placement: 'top',
  },
  {
    target: '[data-tour="tab-ai-summary"]',
    title: 'Full AI Summary',
    content: 'Read the complete AI-generated health narrative with expandable sections for each clinical area.',
    placement: 'bottom',
    action: { view: 'ai-summary' },
  },
  {
    target: '[data-tour="tab-timeline"]',
    title: 'Interactive Timeline',
    content: 'See every encounter, lab, and medication on a chronological timeline. Filter by year and category.',
    placement: 'bottom',
    action: { view: 'timeline' },
  },
  {
    target: '[data-tour="tab-insights"]',
    title: 'AI-Driven Insights',
    content: 'Automated health insights detect trends, flag abnormal results, and highlight care gaps.',
    placement: 'bottom',
    action: { view: 'insights' },
  },
  {
    target: '[data-tour="tab-data-explorer"]',
    title: 'Data Explorer',
    content: 'Browse the raw parsed data in a searchable tree view across all clinical records.',
    placement: 'bottom',
    action: { view: 'data-explorer' },
  },
  {
    target: '[data-tour="tab-ai-assistant"]',
    title: 'AI Chat Assistant',
    content: 'Ask natural-language questions about the patient\'s health. The AI answers using only the loaded data.',
    placement: 'bottom',
    action: { view: 'ai-assistant' },
  },
  {
    target: '[data-tour="tab-data-lineage"]',
    title: 'Multi-Source Data Lineage',
    content: 'See which records came from which source file. Color-coded lineage tracks every data point to its origin. This is the end of the tour!',
    placement: 'bottom',
    action: { view: 'data-lineage' },
  },
]
