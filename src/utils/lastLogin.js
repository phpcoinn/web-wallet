/** Updated on each successful `authStore.login()` (password or quick). */
export const LAST_LOGIN_AT_KEY = 'phpcoin_last_login_at'

export function recordLastLogin() {
  try {
    localStorage.setItem(LAST_LOGIN_AT_KEY, String(Date.now()))
  } catch (_) {
    /* ignore quota / private mode */
  }
}

/** @returns {number} ms since epoch, or 0 if never recorded */
export function getLastLoginAt() {
  try {
    const n = Number(localStorage.getItem(LAST_LOGIN_AT_KEY))
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}
