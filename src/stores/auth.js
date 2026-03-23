import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { recordLastLogin } from '../utils/lastLogin'

const QUICK_LOGIN_STORAGE_KEY = 'phpcoin_quick_login'
const QUICK_LOGIN_ACCOUNT_KEY = 'phpcoin_quick_account'
const PASSWORD_SESSION_KEY = 'phpcoin_password_session'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const masterKey = ref(null) // Stored in memory only
  const activeAccount = ref(null)
  const isQuickLogin = ref(false)

  /**
   * Initialize auth state from sessionStorage (restore session on page load/refresh)
   * Only restores if not already authenticated
   */
  const init = () => {
    if (isAuthenticated.value) return
    try {
      // Quick login session
      const storedPrivateKey = sessionStorage.getItem(QUICK_LOGIN_STORAGE_KEY)
      const storedAccount = sessionStorage.getItem(QUICK_LOGIN_ACCOUNT_KEY)
      
      if (storedPrivateKey && storedAccount) {
        const account = JSON.parse(storedAccount)
        masterKey.value = storedPrivateKey
        isAuthenticated.value = true
        isQuickLogin.value = true
        activeAccount.value = account
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
  
  const login = (key, quickLogin = false) => {
    masterKey.value = key
    isAuthenticated.value = true
    isQuickLogin.value = quickLogin

    if (quickLogin) {
      sessionStorage.setItem(QUICK_LOGIN_STORAGE_KEY, key)
      sessionStorage.removeItem(PASSWORD_SESSION_KEY)
    } else {
      sessionStorage.removeItem(QUICK_LOGIN_STORAGE_KEY)
      sessionStorage.removeItem(QUICK_LOGIN_ACCOUNT_KEY)
      // Always persist session to sessionStorage so user stays logged in on refresh
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

    sessionStorage.removeItem(QUICK_LOGIN_STORAGE_KEY)
    sessionStorage.removeItem(QUICK_LOGIN_ACCOUNT_KEY)
    sessionStorage.removeItem(PASSWORD_SESSION_KEY)
  }
  
  const setActiveAccount = (account) => {
    activeAccount.value = account

    if (isQuickLogin.value) {
      sessionStorage.setItem(QUICK_LOGIN_ACCOUNT_KEY, JSON.stringify(account))
    } else {
      persistPasswordSession()
    }
  }
  
  return {
    isAuthenticated: computed(() => isAuthenticated.value),
    masterKey: computed(() => masterKey.value),
    activeAccount: computed(() => activeAccount.value),
    isQuickLogin: computed(() => isQuickLogin.value),
    login,
    logout,
    setActiveAccount,
    persistPasswordSession,
    init
  }
})

