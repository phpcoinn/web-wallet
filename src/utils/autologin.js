import { verifySignature, getAddressFromPublicKey, getPublicKey } from './wallet'

/** localStorage: list of "publicKey:nonce" strings consumed after successful login. */
export const AUTOLOGIN_NONCE_STORAGE_KEY = 'phpcoin_autologin_nonces_v1'

/** Reject autologin if |now - time| exceeds this (seconds). */
export const AUTOLOGIN_TIME_WINDOW_SEC = 300

/** v1 encrypted blob version byte */
const ENC_VERSION = 0x01

const MAX_NONCES_STORED = 2000

/** 32 lowercase hex chars (16 bytes nonce). */
const NONCE_HEX_LOWER = /^[0-9a-f]{32}$/

/**
 * Exact UTF-8 signing string: JSON.stringify(payload) with keys
 * nonce, time, encrypted_private_key (same order as typical object literal).
 */
export function buildAutologinSigningMessage(payload) {
  return JSON.stringify({
    nonce: payload.nonce,
    time: payload.time,
    encrypted_private_key: payload.encrypted_private_key
  })
}

/**
 * Decode `request` query: decodeURIComponent → base64 → UTF-8 → JSON.
 */
export function decodeAutologinRequest(encoded) {
  if (encoded == null || String(encoded).trim() === '') {
    throw new Error('Missing request parameter')
  }
  const trimmed = String(encoded).trim()
  const uriDecoded = decodeURIComponent(trimmed.replace(/\+/g, ' '))
  const binary = atob(uriDecoded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  const text = new TextDecoder('utf-8').decode(bytes)
  return JSON.parse(text)
}

function loadNonceSet() {
  try {
    const raw = localStorage.getItem(AUTOLOGIN_NONCE_STORAGE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function persistNonceSet(arr) {
  const trimmed = arr.length > MAX_NONCES_STORED ? arr.slice(-MAX_NONCES_STORED) : arr
  localStorage.setItem(AUTOLOGIN_NONCE_STORAGE_KEY, JSON.stringify(trimmed))
}

export function isAutologinNonceUsed(publicKey, nonce) {
  const key = `${publicKey}:${nonce}`
  return loadNonceSet().includes(key)
}

export function markAutologinNonceUsed(publicKey, nonce) {
  const key = `${publicKey}:${nonce}`
  const set = loadNonceSet()
  if (set.includes(key)) {
    throw new Error('This login link was already used')
  }
  set.push(key)
  persistNonceSet(set)
}

function base64ToBytes(b64) {
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

function getSubtleCryptoOrThrow() {
  const c = globalThis.crypto
  const subtle = c?.subtle || c?.webkitSubtle
  if (subtle) return subtle
  const secureHint = globalThis.isSecureContext === false
    ? ' Open the wallet over HTTPS (or localhost) and try again.'
    : ''
  throw new Error('Web Crypto API is not available in this browser/context.' + secureHint)
}

/**
 * Decrypt v1 blob (see spec): PBKDF2-SHA256 210000 → AES-256-GCM.
 * @param {string} encryptedPrivateKeyBase64 - Standard Base64 of binary blob
 * @param {string} password - User-provided decryption password (not in URL)
 * @returns {Promise<string>} PHPCoin private key (base58)
 */
export async function decryptAutologinEncryptedPrivateKey(encryptedPrivateKeyBase64, password) {
  if (typeof encryptedPrivateKeyBase64 !== 'string' || !encryptedPrivateKeyBase64.length) {
    throw new Error('Missing encrypted private key')
  }
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password is required')
  }

  let raw
  try {
    raw = base64ToBytes(encryptedPrivateKeyBase64.trim())
  } catch {
    throw new Error('Invalid Base64 for encrypted private key')
  }

  if (raw.length < 46) {
    throw new Error('Encrypted blob too short')
  }
  if (raw[0] !== ENC_VERSION) {
    throw new Error('Unsupported encryption version')
  }

  const salt = raw.slice(1, 17)
  const iv = raw.slice(17, 29)
  const tag = raw.slice(29, 45)
  const ciphertext = raw.slice(45)
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error('Invalid IV or tag length')
  }

  const ctWithTag = new Uint8Array(ciphertext.length + tag.length)
  ctWithTag.set(ciphertext, 0)
  ctWithTag.set(tag, ciphertext.length)

  const subtle = getSubtleCryptoOrThrow()
  const enc = new TextEncoder().encode(password)
  const keyMaterial = await subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveBits', 'deriveKey'])
  const aesKey = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 210000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  let decrypted
  try {
    decrypted = await subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      ctWithTag
    )
  } catch {
    throw new Error('Wrong password or corrupted data')
  }

  const privateKey = new TextDecoder('utf-8').decode(decrypted).trim()
  if (!privateKey) {
    throw new Error('Decryption produced empty key')
  }
  return privateKey
}

/**
 * Verify decoded request: shape, time, replay (not consumed), signature. Does **not** mark nonce.
 * @returns {{ publicKey: string, address: string, payload: { nonce: string, time: number, encrypted_private_key: string } }}
 */
export function verifyAutologinSignatureStep(obj, nowSec = Math.floor(Date.now() / 1000)) {
  if (!obj || typeof obj !== 'object') throw new Error('Invalid request')
  const { payload, public_key: publicKey, signature } = obj
  if (!payload || typeof payload !== 'object') throw new Error('Invalid payload')

  const { nonce, time, encrypted_private_key: encPk } = payload
  if (typeof nonce !== 'string' || !NONCE_HEX_LOWER.test(nonce)) {
    throw new Error('Invalid nonce (expected 32 lowercase hex characters)')
  }
  if (typeof time !== 'number' || !Number.isFinite(time)) {
    throw new Error('Invalid time')
  }
  if (typeof encPk !== 'string' || encPk.length < 32) {
    throw new Error('Invalid encrypted_private_key')
  }
  if (typeof publicKey !== 'string' || publicKey.length < 8) {
    throw new Error('Invalid public_key')
  }
  if (typeof signature !== 'string' || signature.length < 8) {
    throw new Error('Invalid signature')
  }

  const skew = Math.abs(nowSec - time)
  if (skew > AUTOLOGIN_TIME_WINDOW_SEC) {
    throw new Error('Request expired or clock skew too large (allowed ±5 minutes)')
  }

  if (isAutologinNonceUsed(publicKey, nonce)) {
    throw new Error('This login link was already used')
  }

  const message = buildAutologinSigningMessage({
    nonce,
    time,
    encrypted_private_key: encPk
  })
  let ok = false
  try {
    ok = verifySignature(message, signature, publicKey)
  } catch {
    ok = false
  }
  if (!ok) {
    throw new Error('Invalid signature')
  }

  const address = getAddressFromPublicKey(publicKey)
  if (!address) {
    throw new Error('Could not derive address from public key')
  }

  return {
    publicKey,
    address,
    payload: { nonce, time, encrypted_private_key: encPk }
  }
}

/**
 * After decryption: ensure private key matches signed public key.
 */
export function assertPrivateKeyMatchesPublicKey(privateKey, expectedPublicKey) {
  const derived = getPublicKey(privateKey)
  if (!derived || derived !== expectedPublicKey) {
    throw new Error('Decrypted key does not match signed public key')
  }
}
