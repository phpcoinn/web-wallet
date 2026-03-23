import phpcoinCrypto from 'phpcoin-crypto'

/**
 * Chain ID for network differentiation
 * Default: "00" (mainnet)
 * Can be overridden via VITE_CHAIN_ID environment variable
 */
export const CHAIN_ID = import.meta.env.VITE_CHAIN_ID || "00"

/**
 * Generate a new private key and account
 * Returns an object with privateKey, publicKey, and address
 */
export const generatePrivateKey = () => {
  const account = phpcoinCrypto.generateAccount()
  return account.privateKey
}

/**
 * Generate a complete account (private key, public key, address)
 */
export const generateAccount = () => {
  return phpcoinCrypto.generateAccount()
}

/**
 * Derive public key from private key
 */
export const getPublicKey = (privateKey) => {
  try {
    return phpcoinCrypto.getPublicKey(privateKey)
  } catch (e) {
    return null
  }
}

/**
 * Derive address from private key using PHP Coin's algorithm.
 * Flow: private key -> public key -> address (getAddress expects public key)
 */
export const getAddress = (privateKey) => {
  const publicKey = getPublicKey(privateKey)
  if (!publicKey) return null
  return phpcoinCrypto.getAddress(publicKey)
}

/**
 * Sign a message with private key
 * @param {string} message - Message to sign
 * @param {string} privateKey - Private key in Base58 format
 * @returns {string} Signature
 */
export const signMessage = (message, privateKey) => {
  try {
    return phpcoinCrypto.sign(CHAIN_ID + message, privateKey)
  } catch (error) {
    return null
  }
}

/**
 * Sign a transaction
 * @param {Object} transaction - Transaction object to sign
 * @param {string} privateKey - Private key in Base58 format
 * @returns {Object} Transaction with signature added
 */
export const signTransaction = (transaction, privateKey) => {
  try {
    // Create message to sign (typically JSON string of transaction)
    const message = JSON.stringify(transaction)
    
    // Sign the message with CHAIN_ID prefix to differentiate networks
    const signature = phpcoinCrypto.sign(CHAIN_ID + message, privateKey)
    
    return {
      ...transaction,
      signature: signature
    }
  } catch (error) {
    throw new Error(`Failed to sign transaction: ${error.message}`)
  }
}

/**
 * Verify a signature (raw message bytes as used by phpcoinCrypto.verify)
 */
export const verifySignature = (message, signature, publicKey) => {
  return phpcoinCrypto.verify(message, signature, publicKey)
}

/**
 * Verify a message signed with {@link signMessage} (verifies CHAIN_ID + message).
 */
export const verifySignedMessage = (message, signature, publicKey) => {
  try {
    return phpcoinCrypto.verify(CHAIN_ID + message, signature, publicKey)
  } catch {
    return false
  }
}

/** Derive wallet address from public key (for payment-link / proof checks). */
export const getAddressFromPublicKey = (publicKey) => {
  try {
    return phpcoinCrypto.getAddress(publicKey)
  } catch {
    return null
  }
}

/**
 * Verify an address format
 * @param {string} address - Address to verify
 * @returns {boolean} True if address is valid
 */
export const verifyAddress = (address) => {
  return phpcoinCrypto.verifyAddress(address)
}

/** Format number for tx signature (8 decimals, no thousands separator) */
const num = (val, decimals = 8) => {
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''))
  if (Number.isNaN(n)) return '0.00000000'
  return n.toFixed(decimals)
}

/**
 * Normalize create/remove masternode API response to a single payload for signing.
 * API returns flat { val, fee, dst, src, msg, type }; some nodes may wrap in .tx or use .message.
 * @param {object} res - Raw response from generateMasternodeCreateTx or generateMasternodeRemoveTx
 * @returns {{ val, fee, dst, src, msg, type }}
 */
export const normalizeMasternodeTxResponse = (res) => {
  if (res == null) return res
  const raw = res.tx != null ? res.tx : res
  return {
    val: raw.val,
    fee: raw.fee,
    dst: raw.dst ?? '',
    src: raw.src ?? '',
    msg: raw.msg ?? raw.message ?? '',
    type: raw.type
  }
}

/**
 * Build signature base for a transaction (same format as node Transaction.getSignatureBase)
 * @param {{ val, fee, dst, msg, type }} payload - From generateMasternodeCreateTx or generateMasternodeRemoveTx
 * @param {string} publicKey
 * @param {number} date - Unix timestamp
 */
export const getTransactionSignatureBase = (payload, publicKey, date) => {
  const val = num(payload.val)
  const fee = num(payload.fee)
  const dst = payload.dst || ''
  const msg = payload.msg || ''
  const type = String(Math.floor(Number(payload.type) || 0))
  const d = String(Math.floor(date))
  return [val, fee, dst, msg, type, publicKey, d].join('-')
}

/**
 * Build signed transaction object for sendTransaction (masternode create/remove)
 * @param {{ val, fee, dst, src, msg, type }} payload - From API
 * @param {string} publicKey
 * @param {string} signature
 * @param {number} date - Unix timestamp
 */
export const buildSignedMasternodeTx = (payload, publicKey, signature, date) => {
  return {
    dst: payload.dst,
    src: payload.src,
    val: num(payload.val),
    fee: num(payload.fee),
    signature,
    message: payload.msg || '',
    type: Math.floor(Number(payload.type) || 0),
    date: Math.floor(date),
    public_key: publicKey
  }
}

