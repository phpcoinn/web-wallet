import { getPublicKey, signMessage } from './wallet'
import { MAIN_URL } from './mainUrl.js'

/** Dapp path passed to dapps.php ?url=… (no leading slash). */
export const VERIFIER_DAPP_PATH = 'PeC85pqFgRxmevonG6diUwT4AfF7YUPSm3/verifier'

function nodeOriginFromEnv() {
  return MAIN_URL
}

/**
 * Build /dapps.php URL with signed loginrequest (base64 JSON).
 * Payload: { nonce, signature, public_key } where signature = sign(CHAIN_ID + nonce, privateKey)
 * (same as wallet signMessage — verifier must verify with CHAIN_ID + nonce).
 *
 * @param {string} privateKey
 * @param {{ origin?: string }} [options]
 * @returns {string} Absolute URL
 */
export function buildVerifierLoginUrl(privateKey, options = {}) {
  const publicKey = getPublicKey(privateKey)
  if (!publicKey) {
    throw new Error('Could not derive public key')
  }
  const nonce = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
  const signature = signMessage(nonce, privateKey)
  if (!signature) {
    throw new Error('Could not sign login request')
  }
  const loginrequest = btoa(
    JSON.stringify({
      nonce,
      signature,
      public_key: publicKey
    })
  )
  const origin = options.origin ?? nodeOriginFromEnv()
  const params = new URLSearchParams()
  params.set('url', VERIFIER_DAPP_PATH)
  params.set('loginrequest', loginrequest)
  return `${origin}/dapps.php?${params.toString()}`
}
