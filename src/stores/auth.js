import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { recordLastLogin } from '../utils/lastLogin'
import { getAddress, getPublicKey } from '../utils/wallet'

const QUICK_LOGIN_STORAGE_KEY = 'phpcoin_quick_login'
const QUICK_LOGIN_ACCOUNT_KEY = 'phpcoin_quick_account'
const PASSWORD_SESSION_KEY = 'phpcoin_password_session'

/** Persisted decrypted private key after autologin (localStorage; survives tab close). */
export const AUTOLOGIN_PK_KEY = 'phpcoin_autologin_private_key'

const AUTOLOGIN_SESSION_FLAG = 'phpcoin_autologin_session'

function readPersistedAutologinPk() {
  return localStorage.getItem(AUTOLOGIN_PK_KEY)
}

function writePersistedAutologinPk(pk) {
  localStorage.setItem(AUTOLOGIN_PK_KEY, pk)
}

function clearPersistedAutologinPk() {
  localStorage.removeItem(AUTOLOGIN_PK_KEY)
}

function autologinSessionFlagIsSet() {
  return sessionStorage.getItem(AUTOLOGIN_SESSION_FLAG) === '1'
}

function setAutologinSessionFlag() {
  sessionStorage.setItem(AUTOLOGIN_SESSION_FLAG, '1')
}

function clearAutologinSessionFlag() {
  sessionStorage.removeItem(AUTOLOGIN_SESSION_FLAG)
}

/**
 * Same account object as Quick Login once the private key is known (in-memory session).
 * Optional overrides: API-returned address from Quick Login flow.
 */
export function buildQuickLoginAccount(privateKey, overrides = {}) {
  const publicKey = getPublicKey(privateKey)
  if (!publicKey) return null
  const address = overrides.address ?? getAddress(privateKey)
  if (!address) return null
  return {
    id: overrides.id ?? `quick-${Date.now()}`,
    name: overrides.name ?? 'Quick Login Account',
    address,
    publicKey: overrides.publicKey ?? publicKey,
    privateKey,
    isQuickLogin: true
  }
}

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const masterKey = ref(null) // Stored in memory only
  const activeAccount = ref(null)
  const isQuickLogin = ref(false)
  /** Autologin flow (signed link + password); hide Accounts like quick login. */
  const isAutologin = ref(false)

  function restoreAutologinPersistedKey() {
    const pk = readPersistedAutologinPk()
    if (!pk || typeof pk !== 'string') return false
    try {
      const account = buildQuickLoginAccount(pk)
      if (!account) {
        clearPersistedAutologinPk()
        return false
      }
      masterKey.value = pk
      isAuthenticated.value = true
      isQuickLogin.value = true
      isAutologin.value = true
      activeAccount.value = account
      sessionStorage.setItem(QUICK_LOGIN_STORAGE_KEY, pk)
      sessionStorage.setItem(QUICK_LOGIN_ACCOUNT_KEY, JSON.stringify(activeAccount.value))
      writePersistedAutologinPk(pk)
      setAutologinSessionFlag()
      return true
    } catch {
      clearPersistedAutologinPk()
      return false
    }
  }

  /**
   * Initialize auth state from sessionStorage / persisted autologin key / password session
   */
  const init = () => {
    if (isAuthenticated.value) return
    try {
      // Quick login session (tab session)
      const storedPrivateKey = sessionStorage.getItem(QUICK_LOGIN_STORAGE_KEY)
      const storedAccount = sessionStorage.getItem(QUICK_LOGIN_ACCOUNT_KEY)

      if (storedPrivateKey && storedAccount) {
        const parsed = JSON.parse(storedAccount)
        const derived = buildQuickLoginAccount(storedPrivateKey)
        if (!derived) {
          sessionStorage.removeItem(QUICK_LOGIN_STORAGE_KEY)
          sessionStorage.removeItem(QUICK_LOGIN_ACCOUNT_KEY)
          return
        }
        const account = {
          ...derived,
          id: parsed.id || derived.id,
          name: parsed.name || derived.name
        }
        masterKey.value = storedPrivateKey
        isAuthenticated.value = true
        isQuickLogin.value = true
        activeAccount.value = account
        sessionStorage.setItem(QUICK_LOGIN_ACCOUNT_KEY, JSON.stringify(account))
        const persistedPk = readPersistedAutologinPk()
        isAutologin.value =
          autologinSessionFlagIsSet() || (persistedPk != null && persistedPk === storedPrivateKey)
        if (isAutologin.value) {
          setAutologinSessionFlag()
        }
        return
      }

      // Autologin: private key persisted in localStorage (no active tab session)
      if (restoreAutologinPersistedKey()) {
        return
      }

      // Password login session
      const passwordSession = sessionStorage.getItem(PASSWORD_SESSION_KEY)
      if (passwordSession) {
        const { masterKey: storedKey, activeAccount: storedAccount } = JSON.parse(passwordSession)
        if (storedKey) {
          masterKey.value = storedKey
          isAuthenticated.value = true
          isQuickLogin.value = false
          isAutologin.value = false
          activeAccount.value = storedAccount || null
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
      sessionStorage.removeItem(QUICK_LOGIN_STORAGE_KEY)
      sessionStorage.removeItem(QUICK_LOGIN_ACCOUNT_KEY)
      sessionStorage.removeItem(PASSWORD_SESSION_KEY)
    }
  }

  const login = (key, quickLogin = false, options = {}) => {
    if (!quickLogin) {
      clearPersistedAutologinPk()
      isAutologin.value = false
      clearAutologinSessionFlag()
    } else {
      isAutologin.value = !!options.autologin
      if (options.autologin) {
        setAutologinSessionFlag()
      } else {
        clearAutologinSessionFlag()
      }
    }
    masterKey.value = key
    isAuthenticated.value = true
    isQuickLogin.value = quickLogin

    if (quickLogin) {
      sessionStorage.setItem(QUICK_LOGIN_STORAGE_KEY, key)
      sessionStorage.removeItem(PASSWORD_SESSION_KEY)
    } else {
      sessionStorage.removeItem(QUICK_LOGIN_STORAGE_KEY)
      sessionStorage.removeItem(QUICK_LOGIN_ACCOUNT_KEY)
      persistPasswordSession()
    }
    recordLastLogin()
  }

  const persistPasswordSession = () => {
    if (masterKey.value && !isQuickLogin.value) {
      sessionStorage.setItem(PASSWORD_SESSION_KEY, JSON.stringify({
        masterKey: masterKey.value,
        activeAccount: activeAccount.value
      }))
    }
  }

  const logout = () => {
    masterKey.value = null
    isAuthenticated.value = false
    activeAccount.value = null
    isQuickLogin.value = false
    isAutologin.value = false

    sessionStorage.removeItem(QUICK_LOGIN_STORAGE_KEY)
    sessionStorage.removeItem(QUICK_LOGIN_ACCOUNT_KEY)
    sessionStorage.removeItem(PASSWORD_SESSION_KEY)
    clearAutologinSessionFlag()
    clearPersistedAutologinPk()
  }

  const setActiveAccount = (account) => {
    activeAccount.value = account

    if (isQuickLogin.value) {
      sessionStorage.setItem(QUICK_LOGIN_ACCOUNT_KEY, JSON.stringify(account))
    } else {
      persistPasswordSession()
    }
  }

  /**
   * Autologin after password decrypt: same session + account shape as Quick Login; also persist key for return visits.
   */
  const loginAutologin = (privateKey) => {
    const account = buildQuickLoginAccount(privateKey)
    if (!account) {
      throw new Error('Invalid private key')
    }
    writePersistedAutologinPk(privateKey)
    login(privateKey, true, { autologin: true })
    setActiveAccount(account)
  }

  return {
    isAuthenticated: computed(() => isAuthenticated.value),
    masterKey: computed(() => masterKey.value),
    activeAccount: computed(() => activeAccount.value),
    isQuickLogin: computed(() => isQuickLogin.value),
    isAutologin: computed(() => isAutologin.value),
    login,
    loginAutologin,
    logout,
    setActiveAccount,
    persistPasswordSession,
    init
  }
})
