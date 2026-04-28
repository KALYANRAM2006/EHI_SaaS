/**
 * Configuration Service
 *
 * Manages application configuration including CMS API credentials.
 * Stores settings in localStorage for persistence across sessions.
 */

const CONFIG_STORAGE_KEY = 'clinquilt_config'
const CONFIG_VERSION = '1.0'

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  version: CONFIG_VERSION,
  cmsApi: {
    enabled: false,
    baseUrl: 'https://api.cms.gov/fhir/v1',
    tokenUrl: 'https://api.cms.gov/oauth2/token',
    clientId: '',
    clientSecret: '',
  },
  ai: {
    provider: 'anthropic',
    model: 'claude-sonnet-4.5',
    apiKey: '',
  },
  privacy: {
    persistData: false,
    autoWipe: true,
  },
}

/**
 * Load configuration from localStorage
 */
export function loadConfig() {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (!stored) {
      return { ...DEFAULT_CONFIG }
    }

    const config = JSON.parse(stored)

    // Version check - if version mismatch, merge with defaults
    if (config.version !== CONFIG_VERSION) {
      console.log('[Config] Version mismatch, merging with defaults')
      return {
        ...DEFAULT_CONFIG,
        ...config,
        version: CONFIG_VERSION,
      }
    }

    return config
  } catch (error) {
    console.error('[Config] Error loading config:', error)
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * Save configuration to localStorage
 */
export function saveConfig(config) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
    console.log('[Config] Configuration saved')
    return true
  } catch (error) {
    console.error('[Config] Error saving config:', error)
    return false
  }
}

/**
 * Update CMS API configuration
 */
export function updateCMSApiConfig(cmsConfig) {
  const config = loadConfig()
  config.cmsApi = {
    ...config.cmsApi,
    ...cmsConfig,
  }
  return saveConfig(config)
}

/**
 * Get CMS API configuration
 */
export function getCMSApiConfig() {
  const config = loadConfig()
  return config.cmsApi
}

/**
 * Check if CMS API is configured
 */
export function isCMSApiConfiguredInSettings() {
  const cmsConfig = getCMSApiConfig()
  return cmsConfig.enabled && !!cmsConfig.clientId && !!cmsConfig.clientSecret
}

/**
 * Enable/disable CMS API
 */
export function toggleCMSApi(enabled) {
  const config = loadConfig()
  config.cmsApi.enabled = enabled
  return saveConfig(config)
}

/**
 * Clear all configuration (reset to defaults)
 */
export function clearConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY)
  console.log('[Config] Configuration cleared')
  return true
}

/**
 * Export configuration (for backup)
 */
export function exportConfig() {
  const config = loadConfig()
  const dataStr = JSON.stringify(config, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = 'clinquilt-config.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Import configuration (from backup)
 */
export function importConfig(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result)
        saveConfig(config)
        resolve(config)
      } catch (error) {
        reject(new Error('Invalid configuration file'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}

/**
 * Validate CMS API credentials
 */
export async function validateCMSCredentials(clientId, clientSecret) {
  // Basic validation
  if (!clientId || !clientSecret) {
    return {
      valid: false,
      message: 'Client ID and Client Secret are required',
    }
  }

  if (clientId.length < 10) {
    return {
      valid: false,
      message: 'Client ID appears to be invalid (too short)',
    }
  }

  if (clientSecret.length < 20) {
    return {
      valid: false,
      message: 'Client Secret appears to be invalid (too short)',
    }
  }

  // Could add actual API test here in the future
  return {
    valid: true,
    message: 'Credentials format looks valid',
  }
}
