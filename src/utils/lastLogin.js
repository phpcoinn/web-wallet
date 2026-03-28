/** Updated on each successful `authStore.login()` (password or quick). */
export const LAST_LOGIN_AT_KEY = 'phpcoin_last_login_at'
/** Previous `LAST_LOGIN_AT` value, saved right before it is overwritten — for “what’s new” eligibility. */
const LAST_LOGIN_BEFORE_KEY = 'phpcoin_last_login_before'

export function recordLastLogin() {
  try {
    const prev = localStorage.getItem(LAST_LOGIN_AT_KEY)
    if (prev) {
      localStorage.setItem(LAST_LOGIN_BEFORE_KEY, prev)
    }
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

/**
 * Timestamp of the login **before** the current one (ms), or 0 if unknown / first login.
 * Used to show “what’s new” only when the prior login was before a release date.
 */
export function getLoginAtBeforeThisSession() {
  try {
    const n = Number(localStorage.getItem(LAST_LOGIN_BEFORE_KEY))
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}
