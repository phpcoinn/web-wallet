import { verifySignedMessage, getAddressFromPublicKey } from './wallet'

/** Bump when changing canonical signing format. */
export const PAYMENT_REQUEST_VERSION = 1

/**
 * Normalize amount for signing and URL: empty string if none, else 8-decimal string.
 */
export function normalizePayReqAmount(amount) {
  if (amount == null || String(amount).trim() === '') return ''
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, '.'))
  if (Number.isNaN(n) || n <= 0) return ''
  return n.toFixed(8)
}

/**
 * Exact string the recipient signs with {@link signMessage} from wallet utils.
 */
export function buildPaymentRequestSigningPayload({ to, amount, memo, ts }) {
  const toTrim = String(to).trim()
  const amountPart = typeof amount === 'string' ? amount : normalizePayReqAmount(amount)
  const memoPart = memo != null ? String(memo) : ''
  const tsPart = String(Number(ts))
  return [PAYMENT_REQUEST_VERSION, toTrim, amountPart, memoPart, tsPart].join('\n')
}

/**
 * Build Send URL with optional recipient signature (pub + sig + ts).
 */
export function buildPaymentRequestLink(address, { amount, memo, ts, publicKey, signature } = {}) {
  if (typeof window === 'undefined') return ''
  const prefix = window.location.href.split('#')[0]
  const params = new URLSearchParams()
  params.set('to', String(address).trim())
  const amtNorm = normalizePayReqAmount(amount)
  if (amtNorm !== '') params.set('amount', String(parseFloat(amtNorm)))
  if (memo != null && String(memo).trim()) params.set('memo', String(memo).trim())
  if (ts != null && publicKey && signature) {
    params.set('ts', String(ts))
    params.set('pub', publicKey)
    params.set('sig', signature)
  }
  return `${prefix}#/send?${params.toString()}`
}

/**
 * Verify payment request query: signature matches payload and public key matches `to`.
 * @returns {{ status: 'verified' } | { status: 'unsigned' } | { status: 'invalid', reason: string }}
 */
function queryScalar(query, key) {
  const v = query[key]
  if (v == null) return ''
  if (Array.isArray(v)) return String(v[0] ?? '').trim()
  return String(v).trim()
}

export function verifyPaymentRequestQuery(query) {
  if (!query || typeof query !== 'object') return { status: 'unsigned' }

  const to = queryScalar(query, 'to')
  const pub = queryScalar(query, 'pub')
  const sig = queryScalar(query, 'sig')
  const tsRaw = queryScalar(query, 'ts')

  const hasSignedLinkParams = pub !== '' && sig !== '' && tsRaw !== ''

  if (!to) {
    if (!hasSignedLinkParams) return { status: 'unsigned' }
    return { status: 'invalid', reason: 'missing_address' }
  }

  if (!hasSignedLinkParams) {
    return { status: 'unsigned' }
  }

  const ts = Number(tsRaw)
  if (!Number.isFinite(ts)) return { status: 'invalid', reason: 'bad_timestamp' }

  const amtRaw = queryScalar(query, 'amount')
  const amountStr = amtRaw !== '' ? normalizePayReqAmount(amtRaw) : ''
  const memoStr = queryScalar(query, 'memo')

  const payload = buildPaymentRequestSigningPayload({
    to,
    amount: amountStr,
    memo: memoStr,
    ts
  })

  if (!verifySignedMessage(payload, sig, pub)) {
    return { status: 'invalid', reason: 'bad_signature' }
  }

  const addrFromPub = getAddressFromPublicKey(pub)
  if (!addrFromPub || addrFromPub !== to) {
    return { status: 'invalid', reason: 'pubkey_mismatch' }
  }

  return { status: 'verified' }
}
