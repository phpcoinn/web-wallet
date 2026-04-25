<template>
  <div>
    <!-- Page title -->
    <div class="row">
      <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0 font-size-18">Dashboard</h4>
          <div class="page-title-right">
            <ol class="breadcrumb m-0">
              <li class="breadcrumb-item"><a href="javascript: void(0);">Wallet</a></li>
              <li class="breadcrumb-item active">Dashboard</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <!-- What's new: first login after a dated release if prior login was before that date; until dismissed -->
    <div v-if="showWhatsNew && whatsNewPayload" class="row mb-3">
      <div class="col-12">
        <div class="alert alert-info mb-0 d-flex align-items-start" role="status">
          <i class="bx bx-info-circle font-size-20 me-2 flex-shrink-0 mt-1"></i>
          <div class="flex-grow-1 min-w-0">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <div class="d-flex flex-wrap align-items-center gap-2">
                <strong>What's new</strong>
                <span class="badge bg-secondary-subtle text-secondary">{{ whatsNewPayload.title }}</span>
              </div>
              <button type="button" class="btn btn-sm btn-outline-primary flex-shrink-0" @click="dismissWhatsNew">
                Got it
              </button>
            </div>
            <div class="whats-new-md text-start small" v-html="whatsNewPayload.html"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stat cards (our content + Minia theme) -->
    <div class="row g-4">
      <div class="col-xl-3 col-md-6">
        <div class="card">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-6">
                <span class="text-muted mb-3 lh-1 d-block text-truncate">Balance</span>
                <h4 class="mb-3">
                  <template v-if="loading && !balance">—</template>
                  <template v-else>
                    <span ref="balanceCounterRef" class="counter-value" :data-target="balanceShort.target">0</span>{{ balanceShort.suffix }} PHP
                  </template>
                </h4>
              </div>
              <div class="col-6">
                <div id="balance-chart" data-colors='["#5156be"]' :data-balance="balance" class="apex-charts mb-2" style="min-height: 50px;"></div>
              </div>
            </div>
            <div class="text-nowrap">
              <template v-if="balanceMempoolSummary.show">
                <span :class="balanceMempoolSummary.badgeClass">{{ balanceMempoolSummary.text }}</span>
                <span class="ms-1 text-muted font-size-13">Mempool</span>
              </template>
              <template v-else>
                <span :class="balanceChangeBadgeClass">{{ balanceChangeText }}</span>
                <span class="ms-1 text-muted font-size-13">Since last week</span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-md-6">
        <div class="card">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-6">
                <span class="text-muted mb-3 lh-1 d-block text-truncate">Rewards</span>
                <h4 class="mb-3">
                  <span ref="rewardsCounterRef" class="counter-value" :data-target="rewardsShort.target">0</span>{{ rewardsShort.suffix }} PHP
                </h4>
              </div>
              <div class="col-6">
                <div id="rewards-chart" data-colors='["#ffbf53"]' :data-rewards="rewards" class="apex-charts mb-2" style="min-height: 50px;"></div>
              </div>
            </div>
            <div class="text-nowrap">
              <span :class="rewardsChangeBadgeClass">{{ rewardsChangeText }}</span>
              <span class="ms-1 text-muted font-size-13">Since last week</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-md-6">
        <div class="card">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-6">
                <span class="text-muted mb-3 lh-1 d-block text-truncate">Network</span>
                <h4 class="mb-3">
                  <template v-if="nodeInfoLoading">—</template>
                  <template v-else>{{ nodeInfo.height != null ? nodeInfo.height.toLocaleString() : '—' }}</template>
                </h4>
              </div>
              <div class="col-6">
                <div id="network-difficulty-chart" data-colors='["#4ba6ef"]' class="apex-charts mb-2" style="min-height: 50px;"></div>
              </div>
            </div>
            <div class="text-nowrap">
              <span :class="nodeStatusBadgeClass">{{ nodeStatusText }}</span>
              <span class="ms-1 text-muted font-size-13">{{ nodeInfo.network || 'Node' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-md-6">
        <div class="card">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-6">
                <span class="text-muted mb-3 lh-1 d-block text-truncate">PHP Price</span>
                <h4 class="mb-3">
                  $<span ref="priceCounterRef" class="counter-value" :data-target="priceShort.target">0</span>
                </h4>
              </div>
              <div class="col-6">
                <div id="price-chart" data-colors='["#2ab57d"]' :data-price="price" class="apex-charts mb-2" style="min-height: 50px;"></div>
              </div>
            </div>
            <div class="text-nowrap">
              <span :class="priceChangeBadgeClass">{{ priceChangeText }}</span>
              <span class="ms-1 text-muted font-size-13">Since last week</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Wallet Balance + Transactions (our content + Minia theme) -->
    <div class="row g-4">
      <div class="col-xl-6">
        <div class="card">
          <div class="card-header align-items-center d-flex">
            <h5 class="card-title mb-0 flex-grow-1">Account</h5>
            <div class="flex-shrink-0 d-flex gap-2">
              <a href="https://klingex.io/trade/PHP-USDT?ref=3436CA42" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm"><i class="bx bx-trending-up me-1"></i>Trade</a>
              <a href="https://buy.phpcoin.net/?ref=DZVMQLV" target="_blank" rel="noopener noreferrer" class="btn btn-success btn-sm"><i class="bx bx-cart me-1"></i>Direct buy</a>
            </div>
          </div>
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-sm">
                <div class="text-center py-3">
                  <canvas ref="qrcodeCanvas" width="200" height="200" class="rounded"></canvas>
                  <h5 class="mt-3 mb-0">{{ activeAccount?.name || 'Account' }}</h5>
                  <p v-if="activeAccount?.description" class="text-muted font-size-13 mb-1">{{ activeAccount.description }}</p>
                  <h4 class="mb-1 fw-bold">{{ balance || '0.00' }} PHP</h4>
                  <p class="text-muted font-size-13 mb-0">Available balance</p>
                </div>
              </div>
              <div class="col-sm align-self-center">
                <div class="mt-4 mt-sm-0">
                  <div class="mb-3">
                    <p class="mb-1 text-muted font-size-13">Address</p>
                    <div class="input-group input-group-sm">
                      <input type="text" class="form-control font-monospace font-size-13" :value="activeAccount?.address || ''" readonly style="word-break: break-all;" />
                      <button type="button" class="btn btn-outline-secondary" @click="copyField('address', activeAccount?.address)" :title="copiedField === 'address' ? 'Copied!' : 'Copy'" :disabled="!activeAccount?.address">
                        <i :class="copiedField === 'address' ? 'bx bx-check text-success' : 'bx bx-copy-alt'"></i>
                      </button>
                    </div>
                    <div v-if="addressVerified === false" class="alert alert-warning mt-2 mb-0 py-2 px-3 font-size-13 d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <span><i class="bx bx-error-circle me-1"></i>Your account is not verified – so you cannot use it for mining.</span>
                      <button type="button" class="btn btn-warning btn-sm" @click="openVerifierLogin">Verify</button>
                    </div>
                  </div>
                  <div class="mb-3">
                    <p class="mb-1 text-muted font-size-13">Public key</p>
                    <div class="input-group input-group-sm">
                      <input type="text" class="form-control font-monospace font-size-13" :value="displayPublicKey" readonly style="word-break: break-all;" />
                      <button type="button" class="btn btn-outline-secondary" @click="copyField('publicKey', displayPublicKey)" :title="copiedField === 'publicKey' ? 'Copied!' : 'Copy'" :disabled="!displayPublicKey">
                        <i :class="copiedField === 'publicKey' ? 'bx bx-check text-success' : 'bx bx-copy-alt'"></i>
                      </button>
                    </div>
                  </div>
                  <div class="mb-3">
                    <p class="mb-1 text-muted font-size-13">Private key</p>
                    <div class="input-group input-group-sm">
                      <input
                        type="text"
                        class="form-control font-monospace font-size-13"
                        :value="privateKeyRevealed ? revealedPrivateKey : ''"
                        :placeholder="privateKeyRevealed ? '' : '••••••••••••••••'"
                        readonly
                        autocomplete="off"
                        style="word-break: break-all;"
                      />
                      <template v-if="privateKeyRevealed">
                        <button type="button" class="btn btn-outline-secondary" @click="copyField('privateKey', revealedPrivateKey)" :title="copiedField === 'privateKey' ? 'Copied!' : 'Copy'">
                          <i :class="copiedField === 'privateKey' ? 'bx bx-check text-success' : 'bx bx-copy-alt'"></i>
                        </button>
                      </template>
                      <button v-else type="button" class="btn btn-primary btn-sm" @click="requestRevealPrivateKey">
                        Reveal
                      </button>
                    </div>
                  </div>

                  <div class="mt-4 pt-2">
                    <router-link to="/send" class="btn btn-success w-100">
                      <i class="bx bx-send me-1"></i> Send PHP
                    </router-link>
                    <router-link to="/receive" class="btn btn-outline-primary w-100 mt-2">
                      <i class="bx bx-download me-1"></i> Receive PHP
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Transactions -->
      <div class="col-xl-6">
        <div class="card">
          <div class="card-header align-items-center d-flex">
            <h4 class="card-title mb-0 flex-grow-1">Transactions</h4>
            <div class="flex-shrink-0">
              <router-link to="/transactions" class="btn btn-soft-primary btn-sm">
                View all <i class="mdi mdi-arrow-right ms-1"></i>
              </router-link>
            </div>
          </div>

          <div class="card-body px-0">
            <div v-if="loadingTx && latestTransactions.length === 0" class="text-center py-5 px-3">
              <span class="spinner-border spinner-border-sm text-primary" role="status"></span>
              <p class="text-muted mt-2 mb-0 font-size-13">Loading transactions...</p>
            </div>
            <div v-else-if="latestTransactions.length === 0" class="text-center py-5 px-3">
              <div class="avatar-lg mx-auto mb-2">
                <span class="avatar-title rounded-circle bg-light text-muted font-size-24">
                  <i class="bx bx-list-ul"></i>
                </span>
              </div>
              <p class="text-muted mb-0 font-size-13">No transactions yet</p>
              <router-link to="/send" class="btn btn-primary btn-sm mt-3">Send your first transaction</router-link>
            </div>
            <div v-else class="table-responsive px-3" data-simplebar style="max-height: 352px;">
              <table class="table align-middle table-nowrap table-borderless mb-0">
                <tbody>
                  <tr v-for="(row, idx) in latestTransactions" :key="idx">
                    <td style="width: 50px;">
                      <div class="font-size-22" :class="getTxIconClass(row)">
                        <i :class="isSent(row) ? 'bx bx-up-arrow-circle d-block' : 'bx bx-down-arrow-circle d-block'"></i>
                      </div>
                    </td>
                    <td>
                      <div>
                        <h5 class="font-size-14 mb-1">{{ getTxTypeLabel(row) }} PHP</h5>
                        <p class="text-muted mb-0 font-size-13">{{ formatDate(row) }}</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <Address :address="getCounterpartyAddress(row)" class="font-size-13" />
                        <p class="text-muted mb-0 font-size-13">Address</p>
                      </div>
                    </td>
                    <td>
                      <div class="text-end">
                        <h5 class="font-size-14 mb-0" :class="getTxIconClass(row)">
                          {{ isSent(row) ? '-' : '+' }}{{ formatAmount(row) }} PHP
                        </h5>
                        <p class="text-muted mb-0 font-size-13">Amount</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <PasswordConfirmModal
      v-model="showRevealPasswordModal"
      action-label="Enter your password to reveal the private key."
      @confirm="onRevealPasswordConfirmed"
    />
    <PasswordConfirmModal
      v-model="showVerifierPasswordModal"
      action-label="Enter your password to open the verifier with a signed login request."
      @confirm="onVerifierPasswordConfirmed"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import ApexCharts from 'apexcharts'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { getPublicKey } from '../utils/wallet'
import { buildVerifierLoginUrl } from '../utils/verifierLogin'
import QRCode from 'qrcode'
import PasswordConfirmModal from '../components/PasswordConfirmModal.vue'
import Address from '../components/Address.vue'
import { api } from '../utils/api'
import { toast } from '../utils/toast'
import {
  getWhatsNewDisplayPayload,
  shouldShowWhatsNewAlert,
  markWhatsNewSeen
} from '../utils/changelog'

function initSparklineChart(el, seriesData, options = {}, layoutAttempt = 0) {
  if (!el) return
  // ApexCharts uses SVG <foreignObject> for tooltips; width/height NaN happens if the container
  // has not been laid out yet (0×0), producing "Expected length, NaN" in the console.
  const rect = el.getBoundingClientRect()
  const w = rect.width || el.clientWidth
  if (!Number.isFinite(w) || w < 1) {
    if (layoutAttempt < 12) {
      requestAnimationFrame(() => initSparklineChart(el, seriesData, options, layoutAttempt + 1))
    }
    return
  }
  // Defensive bound: malformed layout can report extreme widths and make Apex allocate huge buffers.
  const MAX_CHART_WIDTH = 1200
  if (w > 20000) {
    console.warn('Skip sparkline render due to unrealistic width:', w)
    return
  }
  const chartWidth = Math.min(MAX_CHART_WIDTH, Math.max(1, Math.floor(w)))
  if (el.__apexChart) {
    el.__apexChart.destroy()
    el.__apexChart = null
  }
  let colors = options.defaultColor ? [options.defaultColor] : ['#5156be']
  try {
    const attr = el.getAttribute('data-colors')
    if (attr) colors = JSON.parse(attr)
  } catch (e) {}
  const data = Array.isArray(seriesData) && seriesData.length > 0
    ? seriesData
    : (options.fallbackAttr ? (() => {
        const v = parseFloat(el.getAttribute(options.fallbackAttr)) || 0
        return [v, v, v, v, v, v, v]
      })() : [])
  if (data.length === 0 && !options.fallbackAttr) return
  // Guard against unbounded backend arrays causing ApexCharts OOM on dashboard load.
  const MAX_POINTS = 200
  const normalized = (data.length > MAX_POINTS ? data.slice(-MAX_POINTS) : data)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
  const safeData = normalized.length > 0 ? normalized : [0, 0, 0, 0, 0, 0, 0]
  const minVal = Math.min.apply(null, safeData)
  const maxVal = Math.max.apply(null, safeData)
  const isFlat = minVal === maxVal
  const yaxisOpt = options.yaxisFormatter ? { labels: { formatter: options.yaxisFormatter } } : {}
  if (isFlat) {
    const v = minVal
    if (v === 0) {
      yaxisOpt.min = 0
      yaxisOpt.max = 1
    } else {
      yaxisOpt.min = v * 0.99
      yaxisOpt.max = v * 1.01
    }
  }
  const opts = {
    series: [{ data: safeData }],
    chart: {
      type: 'line',
      height: 50,
      width: chartWidth,
      sparkline: { enabled: true }
    },
    colors,
    stroke: { curve: 'smooth', width: 2 },
    yaxis: yaxisOpt,
    tooltip: {
      fixed: { enabled: false },
      x: { show: false },
      y: { title: { formatter: () => (options.tooltipPrefix || '') } },
      marker: { show: false }
    }
  }
  const chart = new ApexCharts(el, opts)
  const rendered = chart.render()
  if (rendered && typeof rendered.catch === 'function') {
    rendered.catch((err) => {
      try { chart.destroy() } catch (_) {}
      if (el.__apexChart === chart) el.__apexChart = null
      console.error('Sparkline render failed:', err)
    })
  }
  el.__apexChart = chart
}

export default {
  name: 'Dashboard',
  components: { Address, PasswordConfirmModal },
  setup() {
    function hasDebugFlag(name) {
      if (typeof window === 'undefined') return false
      const url = new URL(window.location.href)
      if (url.searchParams.get(name) === '1') return true
      const hash = window.location.hash || ''
      const qIdx = hash.indexOf('?')
      if (qIdx === -1) return false
      const hashParams = new URLSearchParams(hash.slice(qIdx + 1))
      return hashParams.get(name) === '1'
    }

    const debugDisable = {
      price: hasDebugFlag('dbgNoPrice'),
      network: hasDebugFlag('dbgNoNetwork'),
      history: hasDebugFlag('dbgNoHistory'),
      qr: hasDebugFlag('dbgNoQr'),
      tx: hasDebugFlag('dbgNoTx')
    }

    const authStore = useAuthStore()
    const balance = ref('0.00')
    const rewards = ref('0.00')
    const transactionCount = ref(0)
    const transactions = ref([])
    const loading = ref(false)
    const loadingTx = ref(false)
    const qrcodeCanvas = ref(null)
    const balanceCounterRef = ref(null)
    const rewardsCounterRef = ref(null)
    const activeAccount = computed(() => authStore.activeAccount)
    const accountsStore = useAccountsStore()
    const showRevealPasswordModal = ref(false)
    const showVerifierPasswordModal = ref(false)
    const revealedPrivateKey = ref('')
    const privateKeyRevealed = ref(false)
    const copiedField = ref('')
    const addressVerified = ref(null) // null=loading, true=verified, false=unverified
    const dashboardLoading = ref(false)
    const historyLoading = ref(false)
    let activeRefreshId = 0
    let lastLoadedAccountKey = ''

    const whatsNewPayload = ref(null)
    const showWhatsNew = ref(false)

    function refreshWhatsNew() {
      const payload = getWhatsNewDisplayPayload()
      whatsNewPayload.value = payload
      showWhatsNew.value = !!(payload && shouldShowWhatsNewAlert(payload))
    }

    function dismissWhatsNew() {
      const fp = whatsNewPayload.value?.fingerprint
      if (fp) markWhatsNewSeen(fp)
      showWhatsNew.value = false
    }

    const displayPublicKey = ref('')

    function refreshDisplayPublicKey() {
      if (!authStore.masterKey) {
        displayPublicKey.value = ''
        return
      }
      if (authStore.isQuickLogin) {
        displayPublicKey.value = activeAccount.value?.publicKey || getPublicKey(authStore.masterKey) || ''
        return
      }
      if (!activeAccount.value) {
        displayPublicKey.value = ''
        return
      }
      try {
        const pk = accountsStore.getDecryptedPrivateKey(activeAccount.value, authStore.masterKey)
        displayPublicKey.value = getPublicKey(pk) || ''
      } catch {
        displayPublicKey.value = ''
      }
    }

    const latestTransactions = computed(() => transactions.value.slice(0, 5))

    function formatBalanceShort(val) {
      const n = parseFloat(val) || 0
      if (n >= 1e6) return { target: n / 1e6, suffix: 'm', raw: n }
      if (n >= 1e3) return { target: n / 1e3, suffix: 'k', raw: n }
      return { target: n, suffix: '', raw: n }
    }

    const balanceShort = computed(() => formatBalanceShort(balance.value))

    const balanceChangeSinceLastWeek = ref(0)
    const balanceChangeText = computed(() => {
      const d = balanceChangeSinceLastWeek.value
      if (d === 0) return '0 PHP'
      const abs = Math.abs(d)
      const fmt = abs >= 1e6 ? (abs / 1e6).toFixed(1) + 'm' : abs >= 1e3 ? (abs / 1e3).toFixed(1) + 'k' : abs.toFixed(2)
      return (d > 0 ? '+' : '-') + fmt + ' PHP'
    })
    const balanceChangeBadgeClass = computed(() => {
      const d = balanceChangeSinceLastWeek.value
      if (d > 0) return 'badge bg-success-subtle text-success'
      if (d < 0) return 'badge bg-danger-subtle text-danger'
      return 'badge bg-secondary-subtle text-secondary'
    })

    const rewardsChangeSinceLastWeek = ref(0)
    const rewardsShort = computed(() => formatBalanceShort(rewards.value))
    const rewardsChangeText = computed(() => {
      const d = rewardsChangeSinceLastWeek.value
      if (d === 0) return '0 PHP'
      const abs = Math.abs(d)
      const fmt = abs >= 1e6 ? (abs / 1e6).toFixed(1) + 'm' : abs >= 1e3 ? (abs / 1e3).toFixed(1) + 'k' : abs.toFixed(2)
      return (d > 0 ? '+' : '') + fmt + ' PHP'
    })
    const rewardsChangeBadgeClass = computed(() => {
      const d = rewardsChangeSinceLastWeek.value
      if (d > 0) return 'badge bg-success-subtle text-success'
      if (d < 0) return 'badge bg-danger-subtle text-danger'
      return 'badge bg-secondary-subtle text-secondary'
    })

    const nodeInfo = ref({})
    const nodeInfoLoading = ref(false)
    const nodeStatusText = computed(() => {
      if (nodeInfoLoading.value && !nodeInfo.value.height) return 'Loading'
      if (nodeInfo.value.height != null) return 'Synced'
      return 'Offline'
    })
    const nodeStatusBadgeClass = computed(() => {
      if (nodeInfo.value.height != null) return 'badge bg-success-subtle text-success'
      if (nodeInfoLoading.value) return 'badge bg-warning-subtle text-warning'
      return 'badge bg-danger-subtle text-danger'
    })

    // PHP Price – from local wallet_api.php (dummy for now, will fetch from exchange later)
    const price = ref('0')
    const priceChangeSinceLastWeek = ref(0)
    const priceShort = computed(() => {
      const n = parseFloat(price.value) || 0
      return { target: n }
    })
    // Backend sends 24h change as percent (coinInfo `market.priceChange24h`); sparkline series = last 7 daily closes from wallet_api.php
    const priceChangeText = computed(() => {
      const d = priceChangeSinceLastWeek.value
      if (d === 0) return '0%'
      const abs = Math.abs(d)
      const decimals = abs >= 1 ? 1 : 2
      return (d > 0 ? '+' : '') + d.toFixed(decimals) + '%'
    })
    const priceChangeBadgeClass = computed(() => {
      const d = priceChangeSinceLastWeek.value
      if (d > 0) return 'badge bg-success-subtle text-success'
      if (d < 0) return 'badge bg-danger-subtle text-danger'
      return 'badge bg-secondary-subtle text-secondary'
    })
    const priceCounterRef = ref(null)

    function animateCounter(el, target, duration = 400, decimalsOverride) {
      if (!el) return
      const start = parseFloat(el.textContent) || 0
      const startTime = performance.now()
      const decimals = decimalsOverride != null ? decimalsOverride : (target >= 1 ? 2 : target >= 0.01 ? 2 : 4)
      function step(now) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 2)
        const current = start + (target - start) * eased
        el.textContent = current.toFixed(decimals)
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    function runBalanceCounter() {
      nextTick(() => {
        const el = balanceCounterRef.value
        if (el) animateCounter(el, balanceShort.value.target)
      })
    }

    function runRewardsCounter() {
      nextTick(() => {
        const el = rewardsCounterRef.value
        if (el) animateCounter(el, rewardsShort.value.target)
      })
    }

    function runPriceCounter() {
      nextTick(() => {
        const el = priceCounterRef.value
        if (el) {
          const target = priceShort.value.target
          const decimals = target >= 1 ? 2 : target >= 0.01 ? 4 : 6
          animateCounter(el, target, 400, decimals)
        }
      })
    }

    async function generateQRCode() {
      await nextTick()
      const canvas = qrcodeCanvas.value
      const addr = activeAccount.value?.address
      if (!canvas || !addr) return
      try {
        await QRCode.toCanvas(canvas, addr, {
          width: 200,
          margin: 2,
          color: { dark: '#1F2937', light: '#F9FAFB' }
        })
      } catch (err) {
        console.error('Failed to generate QR code:', err)
      }
    }

    const loadBalance = async () => {
      const addr = activeAccount.value?.address
      if (!addr) return
      try {
        loading.value = true
        const data = await api.getBalance(addr)
        const raw = typeof data === 'object' && data !== null && 'balance' in data ? data.balance : data
        balance.value = raw != null && raw !== '' ? String(raw) : '0.00'
      } catch (error) {
        console.error('Failed to load balance:', error)
        balance.value = '0.00'
      } finally {
        loading.value = false
      }
    }

    const loadRewards = () => {
      // Rewards computed from type 0 transactions in loadBalanceHistoryAndChart
    }

    const loadNodeInfo = async () => {
      try {
        nodeInfoLoading.value = true
        const data = await api.getNodeInfo()
        nodeInfo.value = typeof data === 'object' && data !== null ? data : {}
        if (!debugDisable.network) loadNetworkDifficultyChart()
      } catch (error) {
        console.error('Failed to load node info:', error)
        nodeInfo.value = {}
      } finally {
        nodeInfoLoading.value = false
      }
    }

    async function loadNetworkDifficultyChart() {
      const data = await api.getNetworkDifficulty(100)
      const difficultiesRaw = Array.isArray(data?.difficulties) ? data.difficulties : []
      // Defensive cap: if backend misbehaves and returns too many points, keep chart lightweight.
      const difficulties = difficultiesRaw.slice(-100)
      const el = document.querySelector('#network-difficulty-chart')
      initSparklineChart(el, difficulties, {
        defaultColor: '#4ba6ef',
        yaxisFormatter: (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : v,
        tooltipPrefix: 'Difficulty: '
      })
    }

    const loadTransactions = async () => {
      const addr = activeAccount.value?.address
      if (!addr) return
      try {
        loadingTx.value = true
        const data = await api.getTransactions(addr, 1, 50)
        transactions.value = Array.isArray(data) ? data : []
        transactionCount.value = transactions.value.length
      } catch (error) {
        console.error('Failed to load transactions:', error)
        transactions.value = []
        transactionCount.value = 0
      } finally {
        loadingTx.value = false
      }
    }


    function buildBalanceHistory(transactionsList, currentBalance, myAddress) {
      const now = Date.now() / 1000
      const daySec = 86400
      const startOfToday = Math.floor(now / daySec) * daySec
      const curBal = parseFloat(currentBalance) || 0

      const toSec = (ts) => {
        if (!ts) return 0
        return ts > 1e12 ? ts / 1000 : ts
      }

      // Build daily deltas: for each day 0..6 (6 days ago = day 0, today = day 6), sum received and sent
      const dailyReceived = [0, 0, 0, 0, 0, 0, 0]
      const dailySent = [0, 0, 0, 0, 0, 0, 0]

      for (const tx of transactionsList) {
        const ts = toSec(tx.date ?? tx.timestamp ?? 0)
        const amt = parseFloat(tx.val ?? tx.amount ?? tx.value ?? 0) || 0
        const dst = String(tx.dst ?? tx.to ?? tx.to_address ?? '').trim()
        const src = String(tx.src ?? tx.from ?? tx.from_address ?? '').trim()

        const dayIndex = Math.floor((ts - (startOfToday - 6 * daySec)) / daySec)
        if (dayIndex < 0 || dayIndex > 6) continue

        if (dst === myAddress) dailyReceived[dayIndex] += amt
        else if (src === myAddress) dailySent[dayIndex] += amt
      }

      // Balance at end of day i = current - (net flow from day i+1 through today)
      const series = []
      const categories = []
      for (let i = 0; i <= 6; i++) {
        let netAfter = 0
        for (let j = i + 1; j <= 6; j++) {
          netAfter += dailyReceived[j] - dailySent[j]
        }
        series.push(curBal - netAfter)
        const dayStart = startOfToday - (6 - i) * daySec
        const label = i === 6 ? 'Today' : new Date(dayStart * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        categories.push(label)
      }
      return { series, categories }
    }

    function buildRewardsHistory(transactionsList, myAddress) {
      const now = Date.now() / 1000
      const daySec = 86400
      const startOfToday = Math.floor(now / daySec) * daySec
      const toSec = (ts) => {
        if (!ts) return 0
        return ts > 1e12 ? ts / 1000 : ts
      }
      const dailyRewards = [0, 0, 0, 0, 0, 0, 0]
      let totalAllTime = 0
      for (const tx of transactionsList) {
        const txType = tx.type ?? tx.tx_type
        if (txType !== 0 && txType !== '0') continue
        const amt = parseFloat(tx.val ?? tx.amount ?? tx.value ?? 0) || 0
        const dst = String(tx.dst ?? tx.to ?? tx.to_address ?? '').trim()
        if (dst !== myAddress) continue
        totalAllTime += amt
        const ts = toSec(tx.date ?? tx.timestamp ?? 0)
        const dayIndex = Math.floor((ts - (startOfToday - 6 * daySec)) / daySec)
        if (dayIndex < 0 || dayIndex > 6) continue
        dailyRewards[dayIndex] += amt
      }
      const series = []
      let cum = 0
      for (let i = 0; i <= 6; i++) {
        cum += dailyRewards[i]
        series.push(cum)
      }
      const lastWeekTotal = cum
      return { series, total: totalAllTime, lastWeekTotal }
    }

    async function loadBalanceHistoryAndChart() {
      if (debugDisable.history) return
      const addr = activeAccount.value?.address
      const curBal = parseFloat(balance.value) || 0
      if (!addr) return
      if (historyLoading.value) return
      await nextTick()
      historyLoading.value = true
      try {
        const allTx = []
        // Keep dashboard startup responsive: enough history for 7-day chart without deep scans.
        for (let page = 1; page <= 2; page++) {
          const data = await api.getTransactions(addr, page, 100)
          let txList = Array.isArray(data) ? data : (data?.transactions || data?.data || [])
          if (!Array.isArray(txList) && typeof txList === 'object') txList = Object.values(txList)
          if (!Array.isArray(txList)) txList = []
          if (txList.length === 0) break
          allTx.push(...txList)
          if (txList.length < 100) break
        }
        const { series } = buildBalanceHistory(allTx, balance.value, addr)
        balanceChangeSinceLastWeek.value = series.length >= 7 ? series[6] - series[0] : 0
        initBalanceChart(series)
        const { series: rewardsSeries, total: rewardsTotal, lastWeekTotal } = buildRewardsHistory(allTx, addr)
        rewards.value = String(rewardsTotal.toFixed(8))
        rewardsChangeSinceLastWeek.value = lastWeekTotal
        initRewardsChart(rewardsSeries)
        runRewardsCounter()
      } catch (e) {
        console.error('Failed to load balance history:', e)
        const flatSeries = [curBal, curBal, curBal, curBal, curBal, curBal, curBal]
        balanceChangeSinceLastWeek.value = 0
        initBalanceChart(flatSeries)
        rewards.value = '0.00'
        rewardsChangeSinceLastWeek.value = 0
        initRewardsChart([0, 0, 0, 0, 0, 0, 0])
      } finally {
        historyLoading.value = false
      }
    }

    async function refreshDashboard(force = false) {
      const accountKey = `${activeAccount.value?.address || ''}|${authStore.masterKey ? '1' : '0'}`
      if (!force && accountKey && accountKey === lastLoadedAccountKey) return
      if (dashboardLoading.value) return

      dashboardLoading.value = true
      const refreshId = ++activeRefreshId
      try {
        await checkAddressVerification()
        if (refreshId !== activeRefreshId) return

        await Promise.all([
          loadNodeInfo(),
          loadBalance(),
          debugDisable.tx ? Promise.resolve() : loadTransactions(),
          loadPrice()
        ])
        if (refreshId !== activeRefreshId) return

        if (!debugDisable.qr) {
          await Promise.resolve(generateQRCode())
        }
        nextTick(() => {
          runBalanceCounter()
          runRewardsCounter()
          runPriceCounter()
        })
        // Defer heavier historical chart load until after initial paint.
        setTimeout(() => {
          if (refreshId !== activeRefreshId) return
          loadBalanceHistoryAndChart()
        }, 80)

        lastLoadedAccountKey = accountKey
      } finally {
        if (refreshId === activeRefreshId) {
          dashboardLoading.value = false
        }
      }
    }

    function initRewardsChart(series) {
      initSparklineChart(document.querySelector('#rewards-chart'), series, { defaultColor: '#ffbf53', fallbackAttr: 'data-rewards' })
    }

    function initBalanceChart(series) {
      initSparklineChart(document.querySelector('#balance-chart'), series, { defaultColor: '#5156be', fallbackAttr: 'data-balance' })
    }

    async function copyField(field, value) {
      if (!value) return
      try {
        await navigator.clipboard.writeText(value)
        copiedField.value = field
        toast.success('Copied to clipboard')
        setTimeout(() => { copiedField.value = '' }, 2000)
      } catch {
        toast.error('Failed to copy')
      }
    }

    function requestRevealPrivateKey() {
      if (authStore.isQuickLogin) {
        revealedPrivateKey.value = authStore.masterKey || ''
        privateKeyRevealed.value = true
      } else {
        showRevealPasswordModal.value = true
      }
    }

    function onRevealPasswordConfirmed(masterKey) {
      if (!activeAccount.value) return
      try {
        revealedPrivateKey.value = accountsStore.getDecryptedPrivateKey(activeAccount.value, masterKey)
        privateKeyRevealed.value = true
      } catch (e) {
        toast.error('Failed to decrypt private key')
      }
    }

    function openVerifierInNewTab(privateKey) {
      try {
        const url = buildVerifierLoginUrl(privateKey)
        window.open(url, '_blank', 'noopener,noreferrer')
      } catch (e) {
        console.error('Verifier login URL:', e)
        toast.error(e.message || 'Could not build verifier link')
      }
    }

    function openVerifierLogin() {
      if (authStore.isQuickLogin) {
        const pk = authStore.masterKey
        if (!pk) {
          toast.error('No private key')
          return
        }
        openVerifierInNewTab(pk)
        return
      }
      if (!activeAccount.value) {
        toast.error('No active account')
        return
      }
      showVerifierPasswordModal.value = true
    }

    function onVerifierPasswordConfirmed(masterKey) {
      if (!activeAccount.value) return
      try {
        const privateKey = accountsStore.getDecryptedPrivateKey(activeAccount.value, masterKey)
        openVerifierInNewTab(privateKey)
      } catch (e) {
        toast.error('Failed to decrypt private key')
      }
    }

    const isSent = (row) => {
      const src = row.src || row.from
      return src === activeAccount.value?.address
    }

    const getCounterpartyAddress = (row) => {
      const src = row.src || row.from
      const dst = row.dst || row.to
      return src === activeAccount.value?.address ? dst : src
    }

    const formatAmount = (row) => {
      const val = row.val ?? row.amount ?? 0
      return parseFloat(val).toFixed(8)
    }

    const getConfirmations = (row) => {
      const c = row.confirmation ?? row.confirmations ?? 0
      if (typeof c === 'number') return c
      const n = parseInt(c, 10)
      return isNaN(n) ? 0 : n
    }

    const getTxIconClass = (row) => {
      const isOut = isSent(row)
      const inMempool = getConfirmations(row) === -1
      if (isOut && inMempool) return 'text-warning'
      if (isOut) return 'text-danger'
      return 'text-success'
    }

    const getTxTypeLabel = (row) => {
      const isOut = isSent(row)
      const inMempool = getConfirmations(row) === -1
      if (isOut) return inMempool ? 'Sending' : 'Sent'
      return inMempool ? 'Receiving' : 'Received'
    }

    const formatDate = (row) => {
      const ts = row.date ?? row.timestamp ?? 0
      if (!ts) return '—'
      return new Date(ts * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    function formatMempoolPhp(n) {
      const a = Math.abs(parseFloat(n) || 0)
      if (a === 0) return '0'
      if (a >= 1e6) return (a / 1e6).toFixed(2) + 'm'
      if (a >= 1e3) return (a / 1e3).toFixed(2) + 'k'
      const s = a.toFixed(8).replace(/\.?0+$/, '')
      return s || '0'
    }

    /** Pending send/receive (confirmations === -1) for balance card subtitle */
    const balanceMempoolSummary = computed(() => {
      const addr = activeAccount.value?.address
      if (!addr || !transactions.value.length) {
        return { show: false, text: '', badgeClass: 'badge bg-warning-subtle text-warning' }
      }
      let send = 0
      let recv = 0
      for (const row of transactions.value) {
        if (getConfirmations(row) !== -1) continue
        const amt = parseFloat(row.val ?? row.amount ?? row.value ?? 0) || 0
        if (isSent(row)) send += amt
        else recv += amt
      }
      if (send <= 0 && recv <= 0) {
        return { show: false, text: '', badgeClass: 'badge bg-warning-subtle text-warning' }
      }
      const parts = []
      if (recv > 0) parts.push(`Receiving +${formatMempoolPhp(recv)} PHP`)
      if (send > 0) parts.push(`Sending -${formatMempoolPhp(send)} PHP`)
      return {
        show: true,
        text: parts.join(' · '),
        badgeClass: 'badge bg-warning-subtle text-warning'
      }
    })

    const DUMMY_PRICE = 0.00012
    const DUMMY_CHANGE = 1.25
    const DUMMY_SERIES = [0.00010, 0.00011, 0.00011, 0.00012, 0.00011, 0.00012, 0.00012]
    const lastPriceChartSig = ref('')

    function normalizePriceSeries(series, fallbackPrice) {
      const fallback = [fallbackPrice, fallbackPrice, fallbackPrice, fallbackPrice, fallbackPrice, fallbackPrice, fallbackPrice]
      if (!Array.isArray(series)) return fallback
      const cleaned = series
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v) && v >= 0)
      if (cleaned.length === 0) return fallback
      // Price sparkline is intentionally short (daily closes). Keep only the tail.
      return cleaned.slice(-7)
    }

    function initPriceChart(series, p) {
      const data = normalizePriceSeries(series, p)
      const sig = data.join(',')
      if (sig === lastPriceChartSig.value) return
      lastPriceChartSig.value = sig
      initSparklineChart(document.querySelector('#price-chart'), data, { defaultColor: '#2ab57d', fallbackAttr: 'data-price' })
    }

    const loadPrice = async () => {
      if (debugDisable.price) return
      try {
        const data = await api.getPrice()
        const p = data?.price ?? data
        const change = data?.changeSinceLastWeek ?? 0
        const parsedPrice = typeof p === 'number' ? p : parseFloat(p) || 0
        const series = normalizePriceSeries(data?.series, parsedPrice)
        price.value = String(parsedPrice)
        priceChangeSinceLastWeek.value = typeof change === 'number' ? change : parseFloat(change) || 0
        initPriceChart(series, parsedPrice)
        runPriceCounter()
      } catch (error) {
        console.error('Failed to load price:', error)
        price.value = String(DUMMY_PRICE)
        priceChangeSinceLastWeek.value = DUMMY_CHANGE
        initPriceChart(DUMMY_SERIES, DUMMY_PRICE)
        runPriceCounter()
      }
    }

    const checkAddressVerification = async () => {
      const addr = activeAccount.value?.address
      if (!addr) {
        addressVerified.value = null
        return
      }
      try {
        const pk = await api.getPublicKey(addr)
        addressVerified.value = !!(pk && String(pk).trim())
      } catch {
        addressVerified.value = false
      }
    }

    watch(
      () => authStore.isAuthenticated,
      (ok) => {
        if (ok) refreshWhatsNew()
      }
    )

    onMounted(async () => {
      refreshWhatsNew()
      refreshDisplayPublicKey()
      await refreshDashboard(true)
    })

    watch([() => activeAccount.value?.address, () => authStore.masterKey], async () => {
      revealedPrivateKey.value = ''
      privateKeyRevealed.value = false
      addressVerified.value = null
      refreshDisplayPublicKey()
      await refreshDashboard()
    })

    watch(balance, () => {
      runBalanceCounter()
    }, { flush: 'post' })

    watch(rewards, () => {
      runRewardsCounter()
    }, { flush: 'post' })

    return {
      showWhatsNew,
      whatsNewPayload,
      dismissWhatsNew,
      balance,
      balanceChangeText,
      balanceChangeBadgeClass,
      balanceMempoolSummary,
      rewards,
      rewardsShort,
      rewardsChangeText,
      rewardsChangeBadgeClass,
      rewardsCounterRef,
      price,
      priceShort,
      priceChangeText,
      priceChangeBadgeClass,
      priceCounterRef,
      nodeInfo,
      nodeInfoLoading,
      nodeStatusText,
      nodeStatusBadgeClass,
      transactionCount,
      loading,
      loadingTx,
      latestTransactions,
      activeAccount,
      qrcodeCanvas,
      balanceCounterRef,
      balanceShort,
      copyField,
      displayPublicKey,
      revealedPrivateKey,
      privateKeyRevealed,
      copiedField,
      addressVerified,
      showRevealPasswordModal,
      showVerifierPasswordModal,
      requestRevealPrivateKey,
      onRevealPasswordConfirmed,
      openVerifierLogin,
      onVerifierPasswordConfirmed,
      isSent,
      getCounterpartyAddress,
      formatAmount,
      formatDate,
      getTxTypeLabel,
      getTxIconClass
    }
  }
}
</script>

<style scoped>
.text-break {
  word-break: break-all;
}

.whats-new-md :deep(h3) {
  font-size: 0.95rem;
  margin-top: 0.75rem;
  margin-bottom: 0.35rem;
}
.whats-new-md :deep(ul) {
  margin-bottom: 0;
  padding-left: 1.1rem;
}
.whats-new-md :deep(li) {
  margin-bottom: 0.2rem;
}
.whats-new-md :deep(p) {
  margin-bottom: 0.35rem;
}
.whats-new-md :deep(a) {
  word-break: break-word;
}
</style>
