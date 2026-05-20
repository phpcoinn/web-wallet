import { EXPLORER_BASE } from './api.js'
import { signMessage } from './wallet.js'
import { STAKE_MINE_API, STAKE_MINE_PREVIEW_API } from './stakeMineUrl.js'

/** Fixed message signed once per network revision (CHAIN_ID prefix applied in signMessage). */
export const STAKE_MINE_AUTH_MESSAGE = 'PHP Coin Mining Authorization v1'

export const STAKE_MINE_COIN = 'PHP'

async function parseStakeMineJson(res) {
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('Invalid response from stake mine server')
  }
  if (json?.status === 'ok' && json.data != null) {
    return { ok: true, data: json.data }
  }
  const err =
    json?.status === 'error'
      ? typeof json.data === 'string'
        ? json.data
        : JSON.stringify(json.data)
      : `Request failed (HTTP ${res.status})`
  throw new Error(err)
}

/**
 * Read-only snapshot: weights, potential reward, cooldown (no signature).
 * @param {string} address
 */
export async function fetchStakeMinePreview(address) {
  const url = `${STAKE_MINE_PREVIEW_API}?address=${encodeURIComponent(address)}`
  const res = await fetch(url, { method: 'GET', cache: 'no-store' })
  return parseStakeMineJson(res)
}

/**
 * Submit a signed stake mine request; returns payout data including txid on success.
 * @param {{ address: string, signature: string, publicKey?: string }} params
 */
export async function requestStakeMine({ address, signature, publicKey }) {
  const u = new URL(STAKE_MINE_API)
  u.searchParams.set('address', address)
  u.searchParams.set('sig', signature)
  if (publicKey) {
    u.searchParams.set('public_key', publicKey)
  }
  const res = await fetch(u.toString(), { method: 'GET', cache: 'no-store' })
  return parseStakeMineJson(res)
}

/** @param {string} privateKey */
export function signStakeMineAuthorization(privateKey) {
  return signMessage(STAKE_MINE_AUTH_MESSAGE, privateKey)
}

export function stakeMineExplorerTxUrl(txid) {
  if (!txid) return EXPLORER_BASE
  const base = EXPLORER_BASE.endsWith('/') ? EXPLORER_BASE : `${EXPLORER_BASE}/`
  return `${base}tx.php?id=${encodeURIComponent(txid)}`
}

const BLOCKER_LABELS = {
  cooldown_mempool: 'A payout to this address is already in the mempool.',
  cooldown_chain: 'Address cooldown — wait for more blocks.',
  non_positive_payout: 'Calculated reward is zero (check balance, age, activity, and pool reserve).'
}

export function formatStakeMineBlockers(blockers, cooldownRemaining) {
  if (!Array.isArray(blockers) || !blockers.length) return []
  return blockers.map((b) => {
    if (b === 'cooldown_chain' && cooldownRemaining > 0) {
      return `${BLOCKER_LABELS.cooldown_chain} (${cooldownRemaining} block(s) left).`
    }
    return BLOCKER_LABELS[b] || b
  })
}
