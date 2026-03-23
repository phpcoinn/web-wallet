/**
 * Legacy multiwallet format (from multiwallet.php)
 * localStorage: walletData (encrypted), walletPassword (plain)
 * Encrypted format: { accounts: [{ address, publicKey, privateKey, name?, description? }] }
 * Uses phpcoin-crypto encryptString/decryptString with raw password (SHA256 of password as key)
 */

import phpcoinCrypto from 'phpcoin-crypto'

export const LEGACY_WALLET_DATA_KEY = 'walletData'
export const LEGACY_WALLET_PASSWORD_KEY = 'walletPassword'

/**
 * Check if legacy wallet data exists in localStorage
 */
export function hasLegacyWallet() {
  return !!(typeof localStorage !== 'undefined' && localStorage.getItem(LEGACY_WALLET_DATA_KEY))
}

/**
 * Old multiwallet.php flow stored encrypted blob + plain password hint in localStorage.
 * Use this to show “legacy multi-wallet detected” only when both are present.
 */
export function hasLegacyMultiwalletCredentials() {
  if (typeof localStorage === 'undefined') return false
  const data = localStorage.getItem(LEGACY_WALLET_DATA_KEY)
  const pwd = localStorage.getItem(LEGACY_WALLET_PASSWORD_KEY)
  return !!(data && String(data).trim() && pwd && String(pwd).length > 0)
}

/**
 * Get legacy wallet password from localStorage (for pre-fill)
 */
export function getLegacyWalletPassword() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem(LEGACY_WALLET_PASSWORD_KEY)) || ''
}

/**
 * Remove legacy wallet data from localStorage
 */
export function clearLegacyWallet() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(LEGACY_WALLET_DATA_KEY)
    localStorage.removeItem(LEGACY_WALLET_PASSWORD_KEY)
  }
}

/**
 * Decrypt legacy wallet data and extract accounts
 * @param {string} password - Legacy wallet password
 * @returns {{ accounts: Array }} - { accounts: [{ address, publicKey, privateKey, name?, description? }] }
 * @throws {Error} if decryption fails
 */
export function decryptLegacyWallet(password) {
  const storedData = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_WALLET_DATA_KEY) : null
  if (!storedData) {
    throw new Error('No legacy wallet data found')
  }
  let decrypted
  try {
    decrypted = phpcoinCrypto.decryptString(storedData, password)
  } catch (e) {
    throw new Error('Wrong password or invalid wallet data')
  }
  const walletData = JSON.parse(decrypted)
  if (!walletData || !Array.isArray(walletData.accounts)) {
    throw new Error('Invalid wallet format')
  }
  return walletData
}

/**
 * Validate and normalize legacy accounts
 * @param {Array} accounts - Raw accounts from legacy wallet
 * @param {Function} getPublicKey - Optional: derive publicKey from privateKey if missing
 * @returns {Array} - Valid accounts with required fields
 */
export function validateLegacyAccounts(accounts, getPublicKey = null) {
  const valid = []
  for (const a of accounts) {
    if (!a || !a.address || !a.privateKey) continue
    let publicKey = (a.publicKey && String(a.publicKey).trim()) || ''
    if (!publicKey && getPublicKey) {
      try {
        publicKey = getPublicKey(String(a.privateKey).trim()) || ''
      } catch (_) {}
    }
    valid.push({
      address: String(a.address).trim(),
      publicKey,
      privateKey: String(a.privateKey).trim(),
      name: (a.name && String(a.name).trim()) || '',
      description: (a.description && String(a.description).trim()) || undefined
    })
  }
  return valid
}
