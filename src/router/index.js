import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { CHAIN_ID } from '../utils/wallet'
import { setPendingAuthRedirect, clearPendingAuthRedirect } from '../utils/authRedirect'
import { requestAuthSetupFlow } from '../utils/authEntryIntent'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/quick-login',
    name: 'QuickLogin',
    component: () => import('../pages/QuickLogin.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../pages/Dashboard.vue'),
    meta: { requiresAuth: true, layout: true }
  },
  {
    path: '/send',
    name: 'Send',
    component: () => import('../pages/Send.vue'),
    meta: { requiresAuth: true, layout: true }
  },
  {
    path: '/swap',
    name: 'Swap',
    component: () => import('../pages/Swap.vue'),
    meta: { requiresAuth: true, layout: true, testnetOnly: true }
  },
  {
    path: '/receive',
    name: 'Receive',
    component: () => import('../pages/Receive.vue'),
    meta: { requiresAuth: true, layout: true }
  },
  {
    path: '/transactions',
    name: 'TransactionHistory',
    component: () => import('../pages/TransactionHistory.vue'),
    meta: { requiresAuth: true, layout: true }
  },
  {
    path: '/address-book',
    name: 'AddressBook',
    component: () => import('../pages/AddressBook.vue'),
    meta: { requiresAuth: true, layout: true }
  },
  {
    path: '/create-account',
    redirect: (to) => {
      const m = to.query.migrate
      requestAuthSetupFlow({ legacyMigrate: m === '1' || m === 'true' })
      return { name: 'Login' }
    }
  },
  {
    path: '/restore-account',
    name: 'RestoreAccount',
    component: () => import('../pages/RestoreAccount.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/masternodes',
    name: 'Masternodes',
    component: () => import('../pages/Masternodes.vue'),
    meta: { requiresAuth: true, layout: true }
  },
  {
    path: '/accounts',
    name: 'AccountManager',
    component: () => import('../pages/AccountManager.vue'),
    meta: { requiresAuth: true, layout: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  authStore.init()
  const accountsStore = useAccountsStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    setPendingAuthRedirect(to.fullPath)
    next({ name: 'Login' })
    return
  }
  if (to.meta.testnetOnly && CHAIN_ID !== '01') {
    next({ name: 'Dashboard' })
    return
  }
  // Single-account wallets (quick/private key login): Accounts page not available
  if (to.name === 'AccountManager' && authStore.isQuickLogin) {
    next({ name: 'Dashboard' })
    return
  }
  if ((to.name === 'Login' || to.name === 'QuickLogin') && authStore.isAuthenticated) {
    clearPendingAuthRedirect()
    // If password login with 0 accounts, send to create flow on same page
    if (!authStore.isQuickLogin) {
      await accountsStore.loadAccounts(authStore.masterKey)
      if (accountsStore.accounts.length === 0) {
        requestAuthSetupFlow()
        // Already going to Login — do not navigate again (re-enters guard → loop / blank screen)
        return next()
      }
    }
    next({ name: 'Dashboard' })
    return
  }
  // Password login: load accounts and sync active account when going to main app
  if (to.meta.layout && authStore.isAuthenticated && !authStore.isQuickLogin) {
    await accountsStore.loadAccounts(authStore.masterKey)
    if (accountsStore.accounts.length === 0) {
      requestAuthSetupFlow()
      next({ name: 'Login' })
      return
    }
    const currentId = authStore.activeAccount?.id ?? authStore.activeAccount?.address
    const found = currentId ? accountsStore.accounts.find((a) => a.id === currentId || a.address === currentId) : null
    if (found) {
      authStore.setActiveAccount(found)
    } else {
      authStore.setActiveAccount(accountsStore.accounts[0])
    }
  }
  next()
})

export default router

