<template>
  <div>
    <!-- <body data-layout="horizontal"> -->
    
            <!-- Begin page -->
            <div id="layout-wrapper">
    
                
                <header id="page-topbar">
                    <div class="navbar-header">
                        <div class="d-flex">
                            <!-- LOGO -->
                            <div class="navbar-brand-box">
                                <router-link to="/dashboard" class="logo logo-dark">
                                    <span class="logo-sm">
                                        <img src="https://node1.phpcoin.net/apps/common/img/logo.png" alt="PHP Coin" height="28">
                                    </span>
                                    <span class="logo-lg">
                                        <img src="https://node1.phpcoin.net/apps/common/img/logo.png" alt="PHP Coin" height="28"> <span class="logo-txt">PHP Coin</span>
                                    </span>
                                </router-link>

                                <router-link to="/dashboard" class="logo logo-light">
                                    <span class="logo-sm">
                                        <img src="https://node1.phpcoin.net/apps/common/img/logo.png" alt="PHP Coin" height="28">
                                    </span>
                                    <span class="logo-lg">
                                        <img src="https://node1.phpcoin.net/apps/common/img/logo.png" alt="PHP Coin" height="28"> <span class="logo-txt">PHP Coin</span>
                                    </span>
                                </router-link>
                            </div>
    
                            <button type="button" class="btn btn-sm px-3 font-size-16 header-item" id="vertical-menu-btn">
                                <i class="fa fa-fw fa-bars"></i>
                            </button>
    
                            <!-- App Search: opens main node explorer with search query -->
                            <form class="app-search d-none d-lg-block" @submit.prevent="handleSearch" style="min-width: 420px;">
                                <div class="position-relative d-flex align-items-center">
                                    <input v-model="searchQuery" type="text" class="form-control flex-grow-1" placeholder="Search address or tx..." aria-label="Search" style="min-width: 0;">
                                    <button v-if="searchQuery" type="button" class="btn btn-link text-muted p-1 position-absolute border-0 bg-transparent" style="right: 44px; z-index: 2;" @click="searchQuery = ''" aria-label="Clear search">
                                        <i class="bx bx-x font-size-18"></i>
                                    </button>
                                    <button class="btn btn-primary flex-shrink-0" type="submit"><i class="bx bx-search-alt align-middle"></i></button>
                                </div>
                            </form>
                        </div>
    
                        <div class="d-flex">
    
                            <div class="dropdown d-inline-block d-lg-none ms-2">
                                <button type="button" class="btn header-item" id="page-header-search-dropdown"
                                data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    <i data-feather="search" class="icon-lg"></i>
                                </button>
                                <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0"
                                    aria-labelledby="page-header-search-dropdown">
            
                                    <form class="p-3" @submit.prevent="handleSearch">
                                        <div class="form-group m-0">
                                            <div class="input-group" style="min-width: 320px;">
                                                <input v-model="searchQuery" type="text" class="form-control" placeholder="Search address or tx..." aria-label="Search">
                                                <button v-if="searchQuery" type="button" class="btn btn-outline-secondary" @click="searchQuery = ''" aria-label="Clear search">
                                                    <i class="bx bx-x"></i>
                                                </button>
                                                <button class="btn btn-primary" type="submit"><i class="mdi mdi-magnify"></i></button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
    
                            <!-- Language selector: only English enabled. TODO: implement app internationalization (i18n) -->
                            <div class="dropdown d-none d-sm-inline-block">
                                <button type="button" class="btn header-item"
                                data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    <img id="header-lang-img" :src="assetUrl('assets/images/flags/us.jpg')" alt="Header Language" height="16">
                                </button>
                                <div class="dropdown-menu dropdown-menu-end">
                                    <a href="javascript:void(0);" class="dropdown-item notify-item language active" data-lang="en" aria-current="true">
                                        <img :src="assetUrl('assets/images/flags/us.jpg')" alt="user-image" class="me-1" height="12"> <span class="align-middle">English</span>
                                    </a>
                                    <a href="javascript:void(0);" class="dropdown-item notify-item language disabled" data-lang="sp" tabindex="-1" aria-disabled="true">
                                        <img :src="assetUrl('assets/images/flags/spain.jpg')" alt="user-image" class="me-1 opacity-50" height="12"> <span class="align-middle text-muted">Spanish</span>
                                    </a>
                                    <a href="javascript:void(0);" class="dropdown-item notify-item language disabled" data-lang="gr" tabindex="-1" aria-disabled="true">
                                        <img :src="assetUrl('assets/images/flags/germany.jpg')" alt="user-image" class="me-1 opacity-50" height="12"> <span class="align-middle text-muted">German</span>
                                    </a>
                                    <a href="javascript:void(0);" class="dropdown-item notify-item language disabled" data-lang="it" tabindex="-1" aria-disabled="true">
                                        <img :src="assetUrl('assets/images/flags/italy.jpg')" alt="user-image" class="me-1 opacity-50" height="12"> <span class="align-middle text-muted">Italian</span>
                                    </a>
                                    <a href="javascript:void(0);" class="dropdown-item notify-item language disabled" data-lang="ru" tabindex="-1" aria-disabled="true">
                                        <img :src="assetUrl('assets/images/flags/russia.jpg')" alt="user-image" class="me-1 opacity-50" height="12"> <span class="align-middle text-muted">Russian</span>
                                    </a>
                                    <div class="dropdown-divider"></div>
                                    <div class="dropdown-item-text small text-muted">
                                        More languages coming soon.
                                    </div>
                                </div>
                            </div>
    
                            <div class="dropdown d-none d-sm-inline-block">
                                <button type="button" class="btn header-item" id="mode-setting-btn">
                                    <i data-feather="moon" class="icon-lg layout-mode-dark"></i>
                                    <i data-feather="sun" class="icon-lg layout-mode-light"></i>
                                </button>
                            </div>
    
                            <!-- PHP Coin ecosystem links -->
                            <div class="dropdown d-none d-lg-inline-block ms-1">
                                <button type="button" class="btn header-item"
                                data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    <i data-feather="grid" class="icon-lg"></i>
                                </button>
                                <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end">
                                    <div class="p-2">
                                        <div class="row g-0">
                                            <div class="col">
                                                <a class="dropdown-icon-item" href="https://phpcoin.net/" target="_blank" rel="noopener noreferrer" title="PHPCoin website">
                                                    <i class="bx bx-globe font-size-22 text-primary mb-1"></i>
                                                    <span>PHPCoin</span>
                                                </a>
                                            </div>
                                            <div class="col">
                                                <a class="dropdown-icon-item" href="https://main1.phpcoin.net/apps/explorer/" target="_blank" rel="noopener noreferrer" title="Blockchain Explorer">
                                                    <i class="bx bx-search-alt font-size-22 text-info mb-1"></i>
                                                    <span>Explorer</span>
                                                </a>
                                            </div>
                                            <div class="col">
                                                <a class="dropdown-icon-item" href="https://github.com/phpcoinn/node" target="_blank" rel="noopener noreferrer" title="PHP Coin node on GitHub">
                                                    <i class="bx bxl-github font-size-22 text-dark mb-1"></i>
                                                    <span>GitHub</span>
                                                </a>
                                            </div>
                                        </div>
                                        <div class="row g-0">
                                            <div class="col">
                                                <a class="dropdown-icon-item" href="https://klingex.io/trade/PHP-USDT?ref=3436CA42" target="_blank" rel="noopener noreferrer" title="Trade on KlingEx">
                                                    <i class="bx bx-trending-up font-size-22 text-success mb-1"></i>
                                                    <span>KlingEx</span>
                                                </a>
                                            </div>
                                            <div class="col">
                                                <a class="dropdown-icon-item" href="https://buy.phpcoin.net/?utm_source=explorer&utm_medium=community&utm_campaign=direct_buy" target="_blank" rel="noopener noreferrer" title="Buy PHP Coin">
                                                    <i class="bx bx-cart font-size-22 text-warning mb-1"></i>
                                                    <span>Buy PHP Coin</span>
                                                </a>
                                            </div>
                                            <div class="col">
                                                <a class="dropdown-icon-item" href="https://blog.phpcoin.net/" target="_blank" rel="noopener noreferrer" title="PHPCoin Blog">
                                                    <i class="bx bx-news font-size-22 text-secondary mb-1"></i>
                                                    <span>Blog</span>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
    
                            <!-- Notifications. TODO: implement blockchain messaging system for in-app messages. -->
                            <div class="dropdown d-inline-block">
                                <button type="button" class="btn header-item noti-icon position-relative" id="page-header-notifications-dropdown"
                                data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    <i data-feather="bell" class="icon-lg"></i>
                                </button>
                                <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0"
                                    aria-labelledby="page-header-notifications-dropdown">
                                    <div class="p-3">
                                        <h6 class="m-0">Notifications</h6>
                                    </div>
                                    <div class="p-4 text-center text-muted">
                                        <i class="bx bx-bell-off font-size-32 d-block mb-2"></i>
                                        <p class="mb-0 small">No notifications right now.</p>
                                    </div>
                                </div>
                            </div>
    
                            <div class="dropdown d-inline-block" ref="userDropdownRef">
                                <button type="button" class="btn header-item bg-light-subtle border-start border-end d-flex align-items-center" id="page-header-user-dropdown"
                                data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                    <canvas ref="headerAvatarRef" class="rounded-circle header-profile-user flex-shrink-0" width="32" height="32" :title="displayAddress" aria-label="Account avatar"></canvas>
                                    <div class="ms-1 text-start d-flex flex-column overflow-hidden d-none d-lg-flex" style="min-width: 0; flex: 1 1 0;">
                                        <span class="fw-bold text-truncate font-monospace" style="font-size: 0.875rem;">{{ displayAddress }}</span>
                                        <span class="text-muted text-truncate">{{ headerBalance }} PHP</span>
                                    </div>
                                    <i class="mdi mdi-chevron-down d-none d-xl-inline-block flex-shrink-0 ms-1"></i>
                                </button>
                                <div class="dropdown-menu dropdown-menu-end dropdown-menu-user" style="min-width: 280px;">
                                    <!-- Full address & balance (especially for mobile when header shows only avatar) -->
                                    <div class="px-3 py-2 border-bottom">
                                        <div class="small text-muted text-uppercase mb-1">Current account</div>
                                        <Address :address="authStore.activeAccount?.address || ''" :noPopover="true" class="font-monospace text-break" />
                                        <div class="mt-1 fw-medium">{{ headerBalance }} PHP</div>
                                    </div>
                                    <div v-if="!authStore.isQuickLogin && otherAccounts.length > 0" class="px-3 py-2 border-bottom">
                                        <span class="text-muted small text-uppercase">Switch account</span>
                                    </div>
                                    <div v-if="!authStore.isQuickLogin && otherAccounts.length > 0" class="dropdown-accounts-list">
                                    <a
                                      v-for="acc in otherAccounts"
                                      :key="acc.address"
                                      href="#"
                                      class="dropdown-item d-flex align-items-center py-2"
                                      @click.prevent="switchToAccount(acc)"
                                    >
                                        <img :src="jdenticonSvg(acc.address)" width="32" height="32" class="rounded-circle me-2 flex-shrink-0" alt="" />
                                        <div class="flex-grow-1 overflow-hidden text-start" style="min-width: 0;">
                                            <Address :address="acc.address" :noPopover="true" class="fw-medium" />
                                            <span v-if="acc.name" class="d-block text-muted text-truncate" style="font-size: 0.875rem;">{{ acc.name }}</span>
                                            <span class="text-muted small">{{ getBalance(acc.address) }} PHP</span>
                                        </div>
                                    </a>
                                    </div>
                                    <div v-if="!authStore.isQuickLogin && otherAccounts.length > 0" class="dropdown-divider"></div>
                                    <router-link v-if="!authStore.isQuickLogin" class="dropdown-item" to="/accounts"><i class="mdi mdi-wallet font-size-16 align-middle me-1"></i> Accounts</router-link>
                                    <div class="dropdown-divider"></div>
                                    <a class="dropdown-item" href="#" @click.prevent="handleLogout"><i class="mdi mdi-logout font-size-16 align-middle me-1"></i> Logout</a>
                                </div>
                            </div>
    
                        </div>
                    </div>
                </header>
    
                <!-- ========== Left Sidebar Start ========== -->
                <div class="vertical-menu">
    
                    <div data-simplebar class="h-100">
    
                        <!--- Sidemenu -->
                        <div id="sidebar-menu">
                            <ul class="metismenu list-unstyled" id="side-menu">
                                <li class="menu-title" data-key="t-menu">Wallet</li>
                                <li>
                                    <router-link to="/dashboard" active-class="active">
                                        <i data-feather="home"></i>
                                        <span data-key="t-dashboard">Dashboard</span>
                                    </router-link>
                                </li>
                                <li>
                                    <router-link to="/send" active-class="active">
                                        <i data-feather="send"></i>
                                        <span>Send</span>
                                    </router-link>
                                </li>
                                <li v-if="CHAIN_ID === '01'">
                                    <router-link to="/swap" active-class="active">
                                        <i data-feather="refresh-cw"></i>
                                        <span>Swap</span>
                                    </router-link>
                                </li>
                                <li>
                                    <router-link to="/receive" active-class="active">
                                        <i data-feather="download"></i>
                                        <span>Receive</span>
                                    </router-link>
                                </li>
                                <li>
                                    <router-link to="/transactions" active-class="active">
                                        <i data-feather="list"></i>
                                        <span>Transactions</span>
                                    </router-link>
                                </li>
                                <li>
                                    <router-link to="/address-book" active-class="active">
                                        <i data-feather="book"></i>
                                        <span>Address Book</span>
                                    </router-link>
                                </li>
                                <li>
                                    <router-link to="/masternodes" active-class="active">
                                        <i data-feather="server"></i>
                                        <span>Masternodes</span>
                                    </router-link>
                                </li>
                                <li v-if="!authStore.isQuickLogin">
                                    <router-link to="/accounts" active-class="active">
                                        <i data-feather="users"></i>
                                        <span>Accounts</span>
                                    </router-link>
                                </li>
                                <li>
                                    <a href="#" @click.prevent="handleLogout">
                                        <i data-feather="log-out"></i>
                                        <span>Logout</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <!-- Sidebar -->
                    </div>
                </div>
                <!-- Left Sidebar End -->
    
    
                
    
                <!-- ============================================================== -->
                <!-- Start right Content here -->
                <!-- ============================================================== -->
                <div class="main-content">
    
                    <div class="page-content">
                        <div class="container-fluid">
                            <slot />
                        </div>
                        <!-- container-fluid -->
                    </div>
                    <!-- End Page-content -->
    
    
                    <footer class="footer">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-sm-6">
                                      {{ new Date().getFullYear() }} © PHP Coin.
                                      <span class="ms-2">Version</span>
                                      <span class="badge bg-secondary-subtle text-secondary align-middle fs-6 fw-normal ms-2">{{ appVersion }}</span>
                                      <a
                                        href="#"
                                        class="ms-2 align-middle text-muted text-decoration-underline"
                                        @click.prevent="showChangelog = true"
                                      >Changelog</a>
                                </div>
                                <div class="col-sm-6">
                                    <div class="text-sm-end d-none d-sm-block">
                                        Design & Develop by PHP Coin Team
                                    </div>
                                </div>
                            </div>
                        </div>
                    </footer>
                </div>
                <!-- end main content-->
    
            </div>
            <!-- END layout-wrapper -->

            <!-- Hidden inputs required by theme app.js (layout/sidebar/topbar options) so it does not throw after right-bar removal -->
            <div class="d-none" aria-hidden="true">
                <input type="radio" name="layout" id="layout-vertical" value="vertical">
                <input type="radio" name="layout" id="layout-horizontal" value="horizontal">
                <input type="radio" name="layout-mode" id="layout-mode-light" value="light">
                <input type="radio" name="layout-mode" id="layout-mode-dark" value="dark">
                <input type="radio" name="layout-width" id="layout-width-fuild" value="fuild">
                <input type="radio" name="layout-width" id="layout-width-boxed" value="boxed">
                <input type="radio" name="layout-position" id="layout-position-fixed" value="fixed">
                <input type="radio" name="layout-position" id="layout-position-scrollable" value="scrollable">
                <input type="radio" name="topbar-color" id="topbar-color-light" value="light">
                <input type="radio" name="topbar-color" id="topbar-color-dark" value="dark">
                <input type="radio" name="sidebar-size" id="sidebar-size-default" value="default">
                <input type="radio" name="sidebar-size" id="sidebar-size-compact" value="compact">
                <input type="radio" name="sidebar-size" id="sidebar-size-small" value="small">
                <input type="radio" name="sidebar-color" id="sidebar-color-light" value="light">
                <input type="radio" name="sidebar-color" id="sidebar-color-dark" value="dark">
                <input type="radio" name="sidebar-color" id="sidebar-color-brand" value="brand">
                <input type="radio" name="layout-direction" id="layout-direction-ltr" value="ltr">
                <input type="radio" name="layout-direction" id="layout-direction-rtl" value="rtl">
            </div>

    <ChangelogModal v-model="showChangelog" />
  </div>
</template>

<script>
import { onMounted, computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { api } from '../utils/api'
import * as jdenticon from 'jdenticon'
import Address from './Address.vue'
import { assetUrl, ASSETS_BASE } from '@/utils/assets'
import { CHAIN_ID } from '../utils/wallet'
import { APP_VERSION } from '../constants/appMeta'
import ChangelogModal from './ChangelogModal.vue'

const EXPLORER_SEARCH_URL = 'https://main1.phpcoin.net/apps/explorer/'

export default {
  name: 'AppLayout',
  components: { Address, ChangelogModal },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const accountsStore = useAccountsStore()
    const showChangelog = ref(false)
    const searchQuery = ref('')
    const headerAvatarRef = ref(null)
    const userDropdownRef = ref(null)
    const headerBalance = ref('0.00')
    const balancesMap = ref({})

    function updateHeaderAvatar() {
      nextTick(() => {
        const canvas = headerAvatarRef.value
        if (!canvas) return
        const value = authStore.activeAccount?.address || ''
        jdenticon.updateCanvas(canvas, value)
      })
    }

    function handleSearch() {
      const q = searchQuery.value.trim()
      if (!q) return
      const url = `${EXPLORER_SEARCH_URL}?search=${encodeURIComponent(q)}`
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    const displayAddress = computed(() => authStore.activeAccount?.address || 'No address')

    const otherAccounts = computed(() => {
      const active = authStore.activeAccount?.address
      const list = accountsStore.accounts || []
      return list.filter((a) => a.address !== active)
    })

    function jdenticonSvg(address) {
      if (!address) return ''
      const svg = jdenticon.toSvg(address, 32)
      return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
    }

    function getBalance(address) {
      return balancesMap.value[address] ?? '—'
    }

    async function loadAllBalances() {
      const list = accountsStore.accounts || []
      const map = {}
      await Promise.all(
        list.map(async (acc) => {
          try {
            const data = await api.getBalance(acc.address)
            const raw = typeof data === 'object' && data !== null && 'balance' in data ? data.balance : data
            map[acc.address] = raw != null && raw !== '' ? String(raw) : '0.00'
          } catch {
            map[acc.address] = '—'
          }
        })
      )
      balancesMap.value = map
    }

    function switchToAccount(account) {
      authStore.setActiveAccount(account)
      headerBalance.value = getBalance(account.address)
      if (headerBalance.value === '—') {
        loadHeaderBalance()
      }
      updateHeaderAvatar()
      const el = userDropdownRef.value
      if (el) {
        const drop = window.bootstrap?.Dropdown?.getOrCreateInstance(el)
        if (drop) drop.hide()
      }
    }

    async function loadHeaderBalance() {
      const address = authStore.activeAccount?.address
      if (!address) {
        headerBalance.value = '0.00'
        return
      }
      try {
        const data = await api.getBalance(address)
        const raw = typeof data === 'object' && data !== null && 'balance' in data ? data.balance : data
        headerBalance.value = raw != null && raw !== '' ? String(raw) : '0.00'
      } catch (e) {
        headerBalance.value = '0.00'
      }
    }

    function handleLogout() {
      authStore.logout()
      router.push({ name: 'Login' })
    }

    const commonBaseRaw = (import.meta.env.VITE_COMMON_ASSETS || '').trim()
    const commonBase = /^https?:\/\//i.test(commonBaseRaw) ? commonBaseRaw : ''

    onMounted(() => {
      // Close sidebar on navigation (e.g. when user clicks a sidebar link on mobile)
      router.afterEach(() => {
        document.body.classList.remove('sidebar-enable')
      })
      // Load required JS from VITE_COMMON_ASSETS (full https URL) or local public/assets
      // Chart logic inlined in Dashboard.vue; vectormap removed (unused)
      const scriptPaths = commonBase
        ? [
            `${commonBase}/js/jquery.min.js`,
            `${commonBase}/js/bootstrap.bundle.min.js`,
            `${commonBase}/js/metisMenu.min.js`,
            `${commonBase}/js/simplebar.min.js`,
            `${commonBase}/js/waves.min.js`,
            `${commonBase}/js/feather.min.js`,
            `${commonBase}/js/pace.min.js`,
            `${commonBase}/js/sweetalert2.min.js`,
            `${commonBase}/js/app.js`
          ]
        : [
            ASSETS_BASE + 'assets/libs/jquery/jquery.min.js',
            ASSETS_BASE + 'assets/libs/bootstrap/js/bootstrap.bundle.min.js',
            ASSETS_BASE + 'assets/libs/metismenu/metisMenu.min.js',
            ASSETS_BASE + 'assets/libs/simplebar/simplebar.min.js',
            ASSETS_BASE + 'assets/libs/node-waves/waves.min.js',
            ASSETS_BASE + 'assets/libs/feather-icons/feather.min.js',
            ASSETS_BASE + 'assets/libs/pace-js/pace.min.js',
            ASSETS_BASE + 'assets/js/app.js'
          ]

      const loadScript = (src) => {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = src
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      // Load scripts sequentially, then replace Feather icons (grid, bell, moon, sun, search, etc.)
      scriptPaths.reduce((promise, src) => {
        return promise.then(() => loadScript(src))
      }, Promise.resolve()).then(() => {
        if (typeof window.feather !== 'undefined') {
          window.feather.replace()
        }
        updateHeaderAvatar()
      })
    })

    watch(() => authStore.activeAccount, () => {
      updateHeaderAvatar()
      loadHeaderBalance()
    }, { immediate: true })

    watch(() => accountsStore.accounts, () => {
      loadAllBalances()
    }, { immediate: true, deep: true })

    return {
      appVersion: APP_VERSION,
      showChangelog,
      CHAIN_ID,
      authStore,
      displayAddress,
      headerBalance,
      handleLogout,
      searchQuery,
      handleSearch,
      headerAvatarRef,
      userDropdownRef,
      assetUrl,
      otherAccounts,
      jdenticonSvg,
      getBalance,
      switchToAccount
    }
  }
}
</script>

<style>
/* CSS is already loaded globally from main.js */

.dropdown-menu-user {
  overflow-x: hidden;
}

.dropdown-menu-user .dropdown-accounts-list {
  max-height: 240px;
  overflow-x: hidden;
  overflow-y: auto;
}

.dropdown-menu-user .dropdown-item {
  min-width: 0;
}
</style>
