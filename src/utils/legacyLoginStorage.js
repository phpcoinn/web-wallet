/**
 * Legacy gateway (e.g. web/connect/auth.php) stores the raw key under localStorage key "privateKey".
 */

const LEGACY_PRIVATE_KEY_KEY = 'privateKey'

function trimNonEmpty(s) {
  const t = s != null && String(s).trim()
  return t || null
}

export function getStoredLegacyPrivateKey() {
  if (typeof localStorage === 'undefined') return null
  try {
    return trimNonEmpty(localStorage.getItem(LEGACY_PRIVATE_KEY_KEY))
  } catch {
    return null
  }
}

/** Persist raw private key for private-key login (same key as legacy gateway). */
export function setStoredLegacyPrivateKey(privateKey) {
  if (typeof localStorage === 'undefined') return
  try {
    const t = trimNonEmpty(privateKey)
    if (t) localStorage.setItem(LEGACY_PRIVATE_KEY_KEY, t)
    else localStorage.removeItem(LEGACY_PRIVATE_KEY_KEY)
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearStoredLegacyPrivateKey() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(LEGACY_PRIVATE_KEY_KEY)
  } catch {
    /* ignore */
  }
}
