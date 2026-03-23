import phpcoinCrypto from 'phpcoin-crypto'

/**
 * Derive master key from password using SHA256 (phpcoin-crypto)
 * Returns key for use with encrypt/decrypt
 */
export const deriveMasterKey = (password, salt) => {
  const key = phpcoinCrypto.sha256(password + (salt || ''))
  const actualSalt = salt || phpcoinCrypto.generateRandomString(16)
  return {
    key: key,
    salt: actualSalt
  }
}

/**
 * Encrypt data with password/key (phpcoin-crypto AES-256-CBC)
 */
export const encrypt = (data, key) => {
  return phpcoinCrypto.encryptString(JSON.stringify(data), key)
}

/**
 * Decrypt data with password/key (phpcoin-crypto AES-256-CBC)
 */
export const decrypt = (encryptedData, key) => {
  try {
    const decryptedStr = phpcoinCrypto.decryptString(encryptedData, key)
    if (!decryptedStr) {
      throw new Error('Decryption failed')
    }
    return JSON.parse(decryptedStr)
  } catch (error) {
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Generate random salt (phpcoin-crypto)
 */
export const generateSalt = () => {
  return phpcoinCrypto.generateRandomString(16)
}
