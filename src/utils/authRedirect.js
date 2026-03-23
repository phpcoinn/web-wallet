import { verifyPaymentRequestQuery } from './paymentLink'
import { toast } from './toast'

const STORAGE_KEY = 'phpcoin_post_login_redirect'
const TTL_MS = 15 * 60 * 1000

export function clearPendingAuthRedirect() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (_) {}
}

export function setPendingAuthRedirect(fullPath) {
  if (typeof sessionStorage === 'undefined') return
  if (!fullPath || typeof fullPath !== 'string' || !fullPath.startsWith('/')) return
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fullPath, exp: Date.now() + TTL_MS })
    )
  } catch (_) {}
}

function parseQueryFromFullPath(fullPath) {
  const q = {}
  const idx = fullPath.indexOf('?')
  if (idx === -1) return q
  const sp = new URLSearchParams(fullPath.slice(idx + 1))
  sp.forEach((val, key) => {
    q[key] = val
  })
  return q
}

/**
 * After successful login: go to saved deep link (e.g. /send?...) or dashboard.
 * Validates signed payment links and toasts if the signature fails.
 */
export function navigateAfterAuth(router) {
  let raw = null
  try {
    raw = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (_) {}

  if (!raw) {
    router.push('/dashboard')
    return
  }

  let fullPath
  try {
    const { fullPath: fp, exp } = JSON.parse(raw)
    if (typeof fp !== 'string' || !fp.startsWith('/') || Date.now() > exp) {
      router.push('/dashboard')
      return
    }
    fullPath = fp
  } catch {
    router.push('/dashboard')
    return
  }

  const pathOnly = fullPath.split('?')[0]
  if (pathOnly === '/send' || pathOnly.startsWith('/send')) {
    const q = parseQueryFromFullPath(fullPath)
    const v = verifyPaymentRequestQuery(q)
    if (v.status === 'invalid') {
      toast.warning('Payment link could not be verified. Check details on the Send page.')
    }
  }

  router.push(fullPath)
}
