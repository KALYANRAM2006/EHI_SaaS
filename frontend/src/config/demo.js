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
  {
    target: '[data-tour="patient-header"]',
    title: 'Patient Overview',
    content: 'See the patient\'s demographics, record count, and date range at a glance.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="ai-summary-card"]',
    title: 'AI Health Summary',
    content: 'An AI-generated narrative summarizes the patient\'s full health story — conditions, medications, trends, and risk score.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="category-cards"]',
    title: 'Clinical Categories',
    content: 'Drill into Medications, Encounters, Lab Results, Conditions, and more. Each card shows a count and quick preview.',
    placement: 'top',
  },
  {
    target: '[data-tour="tab-nav"]',
    title: 'Dashboard Views',
    content: 'Switch between Overview, AI Summary, Timeline, Insights, Data Explorer, AI Assistant, and Data Lineage.',
    placement: 'bottom',
    action: null, // just highlight
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
    content: 'Browse the raw parsed data in a tree view — search across all clinical records.',
    placement: 'bottom',
    action: { view: 'data-explorer' },
  },
  {
    target: '[data-tour="tab-ai-assistant"]',
    title: 'AI Chat Assistant',
    content: 'Ask natural-language questions about the patient\'s health — the AI answers using only the loaded data.',
    placement: 'bottom',
    action: { view: 'ai-assistant' },
  },
  {
    target: '[data-tour="tab-data-lineage"]',
    title: 'Multi-Source Data Lineage',
    content: 'See which records came from which source file. Color-coded lineage tracks every data point to its origin.',
    placement: 'bottom',
    action: { view: 'data-lineage' },
  },
]
