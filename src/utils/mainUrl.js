/**
 * Single main host: VITE_MAIN_URL (e.g. https://main1.phpcoin.net).
 * Node api.php and default explorer base are derived from it.
 */
function requireMainUrl(v) {
  if (v == null || v === '') {
    throw new Error('VITE_MAIN_URL must be set (e.g. https://main1.phpcoin.net). Check .env.')
  }
  if (!/^https?:\/\//i.test(String(v))) {
    throw new Error('VITE_MAIN_URL must start with http:// or https://')
  }
  return String(v).replace(/\/+$/, '')
}

export const MAIN_URL = requireMainUrl(import.meta.env.VITE_MAIN_URL)

/** Node API script: {MAIN_URL}/api.php */
export const MAIN_API_URL = `${MAIN_URL}/api.php`
