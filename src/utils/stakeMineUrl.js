/**
 * Staking-backed lightweight mine API (mine.php / mine_preview.php on the public site).
 * Not the PoW coordinator at VITE_MINING_URL.
 */
import { MAIN_URL } from './mainUrl.js'

function deriveStakeMineBase(mainUrl) {
  const h = new URL(mainUrl).hostname
  if (h === 'main1.phpcoin.net' || h === 'node1.phpcoin.net') {
    return 'https://phpcoin.net'
  }
  return new URL(mainUrl).origin
}

const envRaw = import.meta.env.VITE_STAKE_MINE_BASE
const trimmed =
  envRaw != null && String(envRaw).trim() !== '' ? String(envRaw).replace(/\/+$/, '') : ''

/** Origin for stake mine scripts (no trailing slash). */
export const STAKE_MINE_BASE = trimmed || deriveStakeMineBase(MAIN_URL)

export const STAKE_MINE_API = `${STAKE_MINE_BASE}/mine.php`
export const STAKE_MINE_PREVIEW_API = `${STAKE_MINE_BASE}/mine_preview.php`
