import { verifyPaymentRequestQuery } from './paymentLink'
import { toast } from './toast'
import { setStoredLegacyPrivateKey } from './legacyLoginStorage'

const STORAGE_KEY = 'phpcoin_post_login_redirect'
const TTL_MS = 15 * 60 * 1000
const SESSIONLOGIN_PARAM = 'sessionlogin'
const WALLET_API_URL = import.meta.env.VITE_WALLET_API_URL || '/wallet_api.php'

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

function querySep(baseUrl) {
  return String(baseUrl).includes('?') ? '&' : '?'
}

function readSessionLoginRedirectFromLocation() {
  if (typeof window === 'undefined') return ''
  try {
    const search = new URLSearchParams(window.location.search || '')
    const direct = search.get(SESSIONLOGIN_PARAM)
    if (direct) return String(direct).trim()
    const nestedUrl = search.get('url')
    if (nestedUrl && nestedUrl.includes('?')) {
      const nestedQuery = new URLSearchParams(nestedUrl.slice(nestedUrl.indexOf('?') + 1))
      const nestedSessionLogin = nestedQuery.get(SESSIONLOGIN_PARAM)
      if (nestedSessionLogin) return String(nestedSessionLogin).trim()
    }
    const hash = window.location.hash || ''
    const qIdx = hash.indexOf('?')
    if (qIdx !== -1) {
      const hashParams = new URLSearchParams(hash.slice(qIdx + 1))
      const fromHash = hashParams.get(SESSIONLOGIN_PARAM)
      if (fromHash) return String(fromHash).trim()
    }
  } catch (_) {}
  return ''
}

async function completeSessionLoginIfNeeded(account) {
  const redirect = readSessionLoginRedirectFromLocation()
  if (!redirect) return false
  let resolvedAccount = account
  if (!resolvedAccount?.address && typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem('activeAccount')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          resolvedAccount = parsed
        }
      }
    } catch (_) {}
  }
  if (!resolvedAccount?.address) {
    throw new Error('Session login requires an authenticated account address')
  }
  if (resolvedAccount?.privateKey) {
    setStoredLegacyPrivateKey(String(resolvedAccount.privateKey))
  }
  const payload = {
    account: {
      address: String(resolvedAccount.address),
      public_key: resolvedAccount.public_key || resolvedAccount.publicKey || ''
    },
    redirect
  }
  const body = new URLSearchParams()
  body.set('redirect', payload.redirect)
  body.set('address', payload.account.address)
  body.set('public_key', payload.account.public_key || '')

  const response = await fetch(
    `${WALLET_API_URL}${querySep(WALLET_API_URL)}q=sessionLoginComplete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString()
    }
  )
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result.status === 'error') {
    throw new Error(result.error || result.message || 'Could not complete legacy session login')
  }
  const url = result?.data?.redirect_url
  if (!url) {
    throw new Error('Legacy session login did not return redirect URL')
  }
  window.location.assign(String(url))
  return true
}

/**
 * After successful login: go to saved deep link (e.g. /send?...) or dashboard.
 * Validates signed payment links and toasts if the signature fails.
 */
export async function navigateAfterAuth(router, account = null) {
  if (await completeSessionLoginIfNeeded(account)) {
    return
  }
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
