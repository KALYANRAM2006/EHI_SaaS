/**
 * Schema Description Service
 *
 * Generates AI-powered descriptions for data tables and fields using Claude API.
 * Inspired by Josh Mandel's approach in his EHI export tool.
 *
 * Features:
 * - Analyzes data structure and sample values
 * - Generates human-readable descriptions
 * - Caches descriptions in localStorage for performance
 * - Provides tooltips for Data Explorer
 */

import { generateAIHealthSummary, getAIConfig, AI_MODES } from './aiService'

const CACHE_KEY = 'clinquilt_schema_descriptions'
const CACHE_VERSION = '1.0'

/**
 * Get cached schema descriptions from localStorage
 */
function getCachedDescriptions() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data = JSON.parse(cached)
    if (data.version !== CACHE_VERSION) {
      console.log('[SchemaDescription] Cache version mismatch, clearing cache')
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return data.descriptions
  } catch (error) {
    console.error('[SchemaDescription] Error reading cache:', error)
    return null
  }
}

/**
 * Save schema descriptions to localStorage
 */
function saveDescriptions(descriptions) {
  try {
    const data = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      descriptions,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    console.log('[SchemaDescription] Saved descriptions to cache')
  } catch (error) {
    console.error('[SchemaDescription] Error saving cache:', error)
  }
}

/**
 * Clear cached descriptions (useful for regenerating)
 */
export function clearSchemaDescriptionCache() {
  localStorage.removeItem(CACHE_KEY)
  console.log('[SchemaDescription] Cache cleared')
}

/**
 * Infer the data type of a value
 */
function inferDataType(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') {
    // Check for date patterns
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
    if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return 'date'
    return 'string'
  }
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'unknown'
}

/**
 * Analyze data structure to generate schema
 */
function analyzeDataStructure(obj, maxSamples = 3) {
  const schema = {}

  for (const [key, value] of Object.entries(obj)) {
    const analysis = {
      key,
      type: inferDataType(value),
      sampleValue: null,
    }

    if (Array.isArray(value)) {
      analysis.length = value.length
      analysis.itemType = value.length > 0 ? inferDataType(value[0]) : 'unknown'

      // Get sample items
      if (value.length > 0 && typeof value[0] === 'object') {
        const sampleItems = value.slice(0, maxSamples).map(item => {
          const sample = {}
          // Get first few properties of each item
          Object.keys(item).slice(0, 5).forEach(k => {
            sample[k] = item[k]
          })
          return sample
        })
        analysis.sampleItems = sampleItems
      } else if (value.length > 0) {
        analysis.sampleValues = value.slice(0, maxSamples)
      }
    } else if (typeof value === 'object' && value !== null) {
      // For nested objects, get sample properties
      const nestedProps = Object.keys(value).slice(0, 5)
      analysis.properties = nestedProps
      const nestedSample = {}
      nestedProps.forEach(k => {
        nestedSample[k] = value[k]
      })
      analysis.sampleValue = nestedSample
    } else {
      analysis.sampleValue = value
    }

    schema[key] = analysis
  }

  return schema
}

/**
 * Generate description for a single field using AI
 */
async function generateFieldDescription(fieldKey, fieldAnalysis, context) {
  const aiConfig = getAIConfig()

  // If AI is disabled, return generic description
  if (aiConfig.mode === AI_MODES.DISABLED) {
    return generateFallbackDescription(fieldKey, fieldAnalysis)
  }

  // Build prompt for AI
  const prompt = buildDescriptionPrompt(fieldKey, fieldAnalysis, context)

  try {
    // Use the AI summary service (which handles Cloud AI mode and de-identification)
    const response = await generateAIHealthSummary(prompt, {
      maxTokens: 150,
      temperature: 0.3, // Lower temperature for more consistent descriptions
    })

    // Extract just the description text (remove any extra formatting)
    const description = response.trim().replace(/^["']|["']$/g, '')

    return description
  } catch (error) {
    console.error(`[SchemaDescription] AI generation failed for ${fieldKey}:`, error)
    return generateFallbackDescription(fieldKey, fieldAnalysis)
  }
}

/**
 * Build AI prompt for generating field description
 */
function buildDescriptionPrompt(fieldKey, fieldAnalysis, context) {
  let prompt = `You are analyzing health record data structure. Generate a concise, patient-friendly description (1 sentence) for this field:\n\n`

  prompt += `Field name: "${fieldKey}"\n`
  prompt += `Data type: ${fieldAnalysis.type}\n`

  if (fieldAnalysis.type === 'array') {
    prompt += `Array length: ${fieldAnalysis.length}\n`
    prompt += `Item type: ${fieldAnalysis.itemType}\n`

    if (fieldAnalysis.sampleItems) {
      prompt += `Sample items:\n${JSON.stringify(fieldAnalysis.sampleItems, null, 2)}\n`
    } else if (fieldAnalysis.sampleValues) {
      prompt += `Sample values: ${fieldAnalysis.sampleValues.join(', ')}\n`
    }
  } else if (fieldAnalysis.sampleValue !== null && fieldAnalysis.sampleValue !== undefined) {
    if (typeof fieldAnalysis.sampleValue === 'object') {
      prompt += `Sample data:\n${JSON.stringify(fieldAnalysis.sampleValue, null, 2)}\n`
    } else {
      prompt += `Sample value: ${fieldAnalysis.sampleValue}\n`
    }
  }

  if (context) {
    prompt += `\nContext: This field is part of ${context}\n`
  }

  prompt += `\nProvide only a brief, clear description that explains what this field contains in plain English. Focus on what the data represents for the patient, not technical details. Do not include the field name in your response.`

  return prompt
}

/**
 * Generate fallback description when AI is unavailable
 */
function generateFallbackDescription(fieldKey, fieldAnalysis) {
  // Convert camelCase to readable text
  const readable = fieldKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim()

  if (fieldAnalysis.type === 'array') {
    const itemType = fieldAnalysis.itemType || 'items'
    return `List of ${fieldAnalysis.length} ${readable.toLowerCase()} ${itemType === 'object' ? 'records' : 'values'}`
  } else if (fieldAnalysis.type === 'object') {
    return `${readable} information and details`
  } else if (fieldAnalysis.type === 'date') {
    return `Date of ${readable.toLowerCase()}`
  } else if (fieldAnalysis.type === 'number') {
    return `${readable} value`
  } else if (fieldAnalysis.type === 'boolean') {
    return `Whether ${readable.toLowerCase()}`
  } else {
    return `${readable} data`
  }
}

/**
 * Generate descriptions for all fields in a data object
 *
 * @param {Object} data - The data object to analyze
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<Object>} Object mapping field keys to descriptions
 */
export async function generateSchemaDescriptions(data, onProgress = null) {
  console.log('[SchemaDescription] Starting schema analysis...')

  // Check cache first
  const cached = getCachedDescriptions()
  if (cached) {
    console.log('[SchemaDescription] Using cached descriptions')
    return cached
  }

  // Analyze data structure
  const schema = analyzeDataStructure(data)
  const fieldKeys = Object.keys(schema)
  const descriptions = {}

  console.log(`[SchemaDescription] Analyzing ${fieldKeys.length} fields...`)

  // Generate descriptions for each field
  let completed = 0
  for (const fieldKey of fieldKeys) {
    const fieldAnalysis = schema[fieldKey]

    // Determine context (e.g., "patient demographics", "medication list")
    const context = fieldKey === 'patient' ? 'patient demographics' : 'health record data'

    // Generate description
    descriptions[fieldKey] = await generateFieldDescription(fieldKey, fieldAnalysis, context)

    completed++
    if (onProgress) {
      onProgress({
        completed,
        total: fieldKeys.length,
        current: fieldKey,
        percentage: Math.round((completed / fieldKeys.length) * 100),
      })
    }

    console.log(`[SchemaDescription] ${completed}/${fieldKeys.length}: ${fieldKey} -> "${descriptions[fieldKey]}"`)
  }

  // Save to cache
  saveDescriptions(descriptions)

  console.log('[SchemaDescription] Schema analysis complete!')
  return descriptions
}

/**
 * Generate description for nested fields (e.g., medications[0].name)
 *
 * @param {string} path - The field path (e.g., "medications.0.name")
 * @param {*} value - The field value
 * @param {Object} descriptions - Existing descriptions object
 * @returns {string} Description for the field
 */
export function getNestedFieldDescription(path, value, descriptions) {
  // Split path into parts
  const parts = path.split('.')

  // For array indices, use parent array description
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
    const parentKey = parts.slice(0, -1).join('.')
    const parentDesc = descriptions[parts[0]] || ''
    return `Item ${parseInt(parts[parts.length - 1]) + 1} in ${parentDesc.toLowerCase()}`
  }

  // For nested properties, generate based on field name
  const fieldKey = parts[parts.length - 1]

  // Check if we have a cached description
  if (descriptions[path]) {
    return descriptions[path]
  }

  // Check if we have a description for the root field
  if (descriptions[parts[0]]) {
    const rootDesc = descriptions[parts[0]]
    const fieldReadable = fieldKey.replace(/([A-Z])/g, ' $1').toLowerCase()
    return `${fieldReadable} for ${rootDesc.toLowerCase()}`
  }

  // Fallback: generate from field name
  return fieldKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim()
}

/**
 * Get description for a specific field
 *
 * @param {string} fieldKey - The field key
 * @param {Object} descriptions - Descriptions object
 * @returns {string|null} Description or null if not found
 */
export function getFieldDescription(fieldKey, descriptions) {
  return descriptions[fieldKey] || null
}

/**
 * Check if AI descriptions are available
 */
export function areDescriptionsAvailable() {
  const aiConfig = getAIConfig()
  return aiConfig.mode !== AI_MODES.DISABLED
}

/**
 * Get status message about description availability
 */
export function getDescriptionStatus() {
  const aiConfig = getAIConfig()
  const cached = getCachedDescriptions()

  if (cached) {
    const timestamp = new Date(JSON.parse(localStorage.getItem(CACHE_KEY)).timestamp)
    return {
      available: true,
      source: 'cache',
      message: `Descriptions generated on ${timestamp.toLocaleDateString()}`,
    }
  }

  if (aiConfig.mode === AI_MODES.DISABLED) {
    return {
      available: false,
      source: 'disabled',
      message: 'AI descriptions unavailable (AI mode disabled)',
    }
  }

  return {
    available: true,
    source: 'ai',
    message: 'AI descriptions available (will be generated on first use)',
  }
}
