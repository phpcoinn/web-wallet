/**
 * Mining coordinator origin used by `mine.php` (block template + hashing params).
 * Override with VITE_MINING_URL when your wallet host differs from the default mapping.
 */
import { MAIN_URL } from './mainUrl.js'

function deriveMiningUrlFromMain(mainUrl) {
  const u = new URL(mainUrl)
  const h = u.hostname
  if (h === 'main1.phpcoin.net') {
    u.hostname = 'm1.phpcoin.net'
    return u.origin
  }
  if (h === 'node1.phpcoin.net') {
    u.hostname = 'miner1.phpcoin.net'
    return u.origin
  }
  return null
}

const envRaw = import.meta.env.VITE_MINING_URL
const trimmed = envRaw != null && String(envRaw).trim() !== '' ? String(envRaw).replace(/\/+$/, '') : ''

/** Base URL for `GET /mine.php?q=info` (no trailing slash). */
export const MINING_URL = trimmed || deriveMiningUrlFromMain(MAIN_URL) || MAIN_URL
