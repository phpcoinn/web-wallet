import { MINING_URL } from './miningUrl.js'

/**
 * Network block template + Argon params from the mining coordinator (same as Electron `mine.php?q=info`).
 * @returns {Promise<object>}
 */
export async function fetchMineInfo(baseUrl = MINING_URL) {
  const url = `${baseUrl.replace(/\/+$/, '')}/mine.php?q=info`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  })
  if (!response.ok) {
    throw new Error(`mine.php info failed: HTTP ${response.status}`)
  }
  const json = await response.json()
  if (json.status !== 'ok' || json.data == null) {
    throw new Error(json.error || json.message || 'mine.php returned error')
  }
  return json.data
}
