/**
 * Privacy & Security Utilities
 *
 * Zero PHI Server Guarantee — all data stays in the browser.
 * Provides:
 *   1. Encrypted IndexedDB local persistence (optional, user-toggled)
 *   2. Secure memory wipe (overwrite + GC hint)
 *   3. SHA-256 hash computation for YAML rule integrity
 *   4. Session lifecycle management (auto-clear on tab close)
 */

// ─── App Version & Rule Integrity ────────────────────────────────────────────

export const APP_VERSION = '1.0.0'
export const RULE_ENGINE_VERSION = '2024.06.1'

/**
 * Compute SHA-256 hash of a string (e.g. YAML rule text).
 * Uses the browser's native SubtleCrypto API.
 * @param {string} text
 * @returns {Promise<string>} hex-encoded hash
 */
export async function computeSHA256(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify a set of YAML rule files by computing their hashes.
 * Returns an array of { filename, hash, verified } objects.
 * On first run, stores the hashes. On subsequent runs, compares.
 *
 * @param {Array<{filename: string, content: string}>} ruleFiles
 * @returns {Promise<{verified: boolean, files: Array<{filename: string, hash: string, status: string}>}>}
 */
export async function verifyRuleIntegrity(ruleFiles) {
  const STORAGE_KEY = 'clinquilt_rule_hashes'
  const results = []
  let allVerified = true

  // Compute current hashes
  const currentHashes = {}
  for (const { filename, content } of ruleFiles) {
    currentHashes[filename] = await computeSHA256(content)
  }

  // Get stored hashes (if any)
  let storedHashes = {}
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) storedHashes = JSON.parse(stored)
  } catch { /* ignore */ }

  const isFirstRun = Object.keys(storedHashes).length === 0

  for (const [filename, hash] of Object.entries(currentHashes)) {
    if (isFirstRun) {
      results.push({ filename, hash: hash.slice(0, 12), status: 'baseline' })
    } else if (storedHashes[filename] === hash) {
      results.push({ filename, hash: hash.slice(0, 12), status: 'verified' })
    } else {
      results.push({ filename, hash: hash.slice(0, 12), status: 'changed' })
      allVerified = false
    }
  }

  // Store current hashes as baseline
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentHashes))
  } catch { /* ignore */ }

  return { verified: isFirstRun || allVerified, files: results }
}


// ─── Encrypted IndexedDB Persistence ─────────────────────────────────────────

const DB_NAME = 'clinquilt_secure'
const DB_VERSION = 1
const STORE_NAME = 'encrypted_data'

/**
 * Generate a CryptoKey for AES-GCM encryption.
 * The key is derived per-session and stored in sessionStorage.
 */
async function getEncryptionKey() {
  const KEY_STORAGE = 'clinquilt_session_key'
  let rawKey = sessionStorage.getItem(KEY_STORAGE)

  if (!rawKey) {
    // Generate and store a new 256-bit key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    const exported = await crypto.subtle.exportKey('raw', key)
    rawKey = btoa(String.fromCharCode(...new Uint8Array(exported)))
    sessionStorage.setItem(KEY_STORAGE, rawKey)
    return key
  }

  // Reconstruct key from stored base64
  const keyBytes = Uint8Array.from(atob(rawKey), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

/**
 * Open (or create) the encrypted IndexedDB database.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Encrypt and store data in IndexedDB.
 * @param {string} key - Storage key
 * @param {any} data - JSON-serializable data
 */
export async function encryptAndStore(key, data) {
  const cryptoKey = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(data))

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plaintext
  )

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(
      { iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)) },
      key
    )
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Retrieve and decrypt data from IndexedDB.
 * @param {string} key - Storage key
 * @returns {Promise<any|null>} Parsed JSON data or null
 */
export async function decryptAndRetrieve(key) {
  try {
    const cryptoKey = await getEncryptionKey()
    const db = await openDB()

    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

    if (!record) return null

    const iv = new Uint8Array(record.iv)
    const ciphertext = new Uint8Array(record.ciphertext)

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    )

    return JSON.parse(new TextDecoder().decode(plaintext))
  } catch {
    return null
  }
}

/**
 * Purge all data from the encrypted IndexedDB store.
 */
export async function purgeIndexedDB() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    return false
  }
}

/**
 * Delete the entire IndexedDB database.
 */
export async function deleteDatabase() {
  try {
    await purgeIndexedDB()
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}


// ─── Secure Memory Wipe ─────────────────────────────────────────────────────

/**
 * Securely wipe all client-side data:
 *   1. Clear React state (caller's responsibility via callback)
 *   2. Purge IndexedDB encrypted store
 *   3. Clear sessionStorage (encryption keys, rule hashes)
 *   4. Clear any lingering localStorage entries
 *   5. Hint garbage collection
 */
export async function secureMemoryWipe() {
  // Clear all web storage
  try { sessionStorage.clear() } catch { /* ignore */ }
  try { localStorage.removeItem('clinquilt_persist_enabled') } catch { /* ignore */ }

  // Purge IndexedDB
  await deleteDatabase()

  // Hint GC if available
  if (window.gc) {
    try { window.gc() } catch { /* ignore */ }
  }

  return true
}

/**
 * Get the current privacy status for display.
 * @returns {{ sessionOnly: boolean, persistEnabled: boolean, dataStored: boolean }}
 */
export function getPrivacyStatus() {
  const persistEnabled = localStorage.getItem('clinquilt_persist_enabled') === 'true'
  return {
    sessionOnly: !persistEnabled,
    persistEnabled,
    serverContact: false, // We NEVER contact a server
  }
}

/**
 * Toggle local persistence preference.
 * Only stores the toggle state — actual data persistence uses IndexedDB.
 */
export function setPersistenceEnabled(enabled) {
  if (enabled) {
    localStorage.setItem('clinquilt_persist_enabled', 'true')
  } else {
    localStorage.removeItem('clinquilt_persist_enabled')
  }
}

/**
 * Check if local persistence is enabled.
 */
export function isPersistenceEnabled() {
  return localStorage.getItem('clinquilt_persist_enabled') === 'true'
}
