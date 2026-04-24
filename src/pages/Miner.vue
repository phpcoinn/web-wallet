<template>
  <div>
    <div class="row">
      <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0 font-size-18">Miner</h4>
          <div class="page-title-right">
            <ol class="breadcrumb m-0">
              <li class="breadcrumb-item"><router-link to="/dashboard">Dashboard</router-link></li>
              <li class="breadcrumb-item active">Miner</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <p class="text-muted small">
      Same Argon2i + <code>mine.php</code> flow as <code class="small">node/utils/miner.php</code>: each <strong>thread</strong> is one
      independent miner (sequential hashes), like CLI <code>--threads=N</code> forking N processes.
      Choose <strong>WASM</strong> or <strong>Native</strong> (Electron). Aggregate speed sums all miners.
      Your address must be <strong>verified</strong> on-chain before mining starts.
    </p>

    <div class="row">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
              <div>
                <div class="text-muted small">Mining coordinator</div>
                <div :class="nodeStatusClass" class="font-monospace small">{{ miningUrlInput }}</div>
              </div>
              <div class="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  class="btn btn-success"
                  :disabled="minerRunning || !canStart"
                  @click="startMiner"
                >
                  Start
                </button>
                <button type="button" class="btn btn-danger" :disabled="!minerRunning" @click="stopMiner">Stop</button>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Mining node URL</label>
              <input
                v-model="miningUrlInput"
                type="text"
                class="form-control font-monospace"
                spellcheck="false"
                :disabled="minerRunning"
              />
            </div>

            <template v-if="!verifiedAddress && !checkingVerify">
              <div class="alert alert-warning mb-0">
                <strong>Verify your address</strong> before mining:
                <ol class="mb-0 mt-2">
                  <li>Use the <a :href="faucetHref" target="_blank" rel="noopener noreferrer">faucet</a> with your address.</li>
                  <li>Wait until the funding transaction appears on the network.</li>
                  <li>
                    <router-link to="/send">Send</router-link> a small amount elsewhere (or back), then refresh this page.
                  </li>
                </ol>
              </div>
            </template>

            <template v-else-if="checkingVerify">
              <div class="text-muted small">Checking verification…</div>
            </template>

            <template v-else>
              <div class="row align-items-center mb-3">
                <div class="col-md-6">
                  CPU throttle: {{ cpu }}% · Speed (sum): {{ miningStat.speed }} H/s
                </div>
                <div class="col-md-6">
                  <input
                    v-model.number="cpu"
                    type="range"
                    class="form-range"
                    min="0"
                    max="100"
                    step="1"
                    :disabled="minerRunning"
                    @input="onCpuInput"
                  />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Backend</label>
                <div class="btn-group btn-group-sm mb-2" role="group">
                  <button
                    type="button"
                    class="btn"
                    :class="engineMode === 'wasm' ? 'btn-primary' : 'btn-outline-primary'"
                    :disabled="minerRunning"
                    @click="engineMode = 'wasm'"
                  >
                    WASM
                  </button>
                  <button
                    type="button"
                    class="btn"
                    :class="engineMode === 'native' ? 'btn-primary' : 'btn-outline-primary'"
                    :disabled="minerRunning || !nativeAvailable"
                    :title="!nativeAvailable ? 'Requires Electron desktop shell' : ''"
                    @click="engineMode = 'native'"
                  >
                    Native (Node)
                  </button>
                </div>
                <div class="small text-muted">
                  <template v-if="minerRunning">
                    {{ minerThreads }} miners · <strong>{{ miner?.engine === 'native' ? 'Native' : 'WASM' }}</strong>
                  </template>
                  <template v-else>
                    <span v-if="engineMode === 'wasm'">hash-wasm in each worker thread</span>
                    <span v-else>Node argon2 (IPC per hash)</span>
                  </template>
                  <span v-if="engineMode === 'native' && !nativeAvailable" class="d-block mt-1 text-warning">
                    Native requires the Electron wallet shell.
                  </span>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Threads</label>
                <input
                  v-model.number="minerThreads"
                  type="range"
                  class="form-range"
                  min="1"
                  :max="maxParallel"
                  step="1"
                  :disabled="minerRunning"
                />
                <div class="small text-muted">
                  <template v-if="minerRunning">
                    <strong>{{ activeThreadCount }}</strong> miner worker(s) running (value fixed at start).
                  </template>
                  <template v-else> {{ minerThreads }} miner(s) · same idea as CLI <code>miner.php --threads=N</code> </template>
                </div>
              </div>

              <template v-if="minerRunning">
                <div class="d-flex justify-content-between fs-6 mb-2">
                  <span>Mining height <span class="badge bg-info">{{ miner?.height }}</span></span>
                  <span class="text-muted">Running {{ runningTimeHuman }}</span>
                </div>
                <p v-if="(miner?.totalThreads ?? 1) > 1" class="small text-muted mb-2">
                  Elapsed and target match all threads; <strong>hit</strong> is the <strong>maximum</strong> hit across miners.
                </p>
                <div class="d-flex flex-wrap gap-3 mb-3 small">
                  <span><span class="badge bg-success">{{ sessionAccepted }}</span> Accepted</span>
                  <span><span class="badge bg-danger">{{ sessionRejected }}</span> Rejected</span>
                  <span><span class="badge bg-warning text-dark">{{ sessionDropped }}</span> Dropped</span>
                </div>

                <div class="mb-2">
                  <div class="d-flex justify-content-between small text-muted"><span>Elapsed</span><span>{{ miner?.elapsed }}</span></div>
                  <div class="progress" style="height: 10px">
                    <div class="progress-bar bg-warning" role="progressbar" :style="{ width: percElapsed + '%' }" />
                  </div>
                </div>
                <div class="mb-2">
                  <div class="d-flex justify-content-between small text-muted">
                    <span>Hit</span>
                    <span>
                      {{ miner?.hit }}
                      <span v-if="miner?.maxHit != null && String(miner?.maxHit) !== String(miner?.hit)" class="text-muted">
                        · peak {{ miner?.maxHit }}</span>
                    </span>
                  </div>
                  <div class="progress hit-progress-stack position-relative" style="height: 12px">
                    <div
                      class="progress-bar bg-info"
                      role="progressbar"
                      :style="{ width: percHit + '%' }"
                      :aria-valuenow="percHit"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    />
                    <div
                      v-if="percHitPeakMarker > 0"
                      class="hit-peak-marker"
                      :style="{ left: `calc(${percHitPeakMarker}% - 1px)` }"
                      title="Peak hit this block (best roll so far on the same scale as target)"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div class="mb-2">
                  <div class="d-flex justify-content-between small text-muted"><span>Target</span><span>{{ miner?.target }}</span></div>
                  <div class="progress" style="height: 10px">
                    <div class="progress-bar bg-secondary" role="progressbar" :style="{ width: percTarget + '%' }" />
                  </div>
                </div>

                <div class="small text-muted mt-3">
                  Submits {{ miningStat.submits }} · Loop passes {{ miningStat.cnt }} · Hashes {{ miningStat.hashes }}
                </div>
              </template>

              <template v-else>
                <div class="text-muted small text-center py-4">Miner stopped. Adjust CPU / threads, then press Start.</div>
              </template>
            </template>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Miner log</span>
            <button type="button" class="btn btn-sm btn-outline-danger" :disabled="minerRunning || !logs.length" @click="clearLogs">
              Clear
            </button>
          </div>
          <div class="card-body log-panel small">
            <template v-if="!logs.length">
              <span class="text-muted">No events yet.</span>
            </template>
            <div v-for="(log, ix) in logs" :key="ix" :class="logClass(log.type)" class="alert py-2 px-2 mb-2">
              <div class="fw-semibold">{{ log.title }}</div>
              <div class="text-break">{{ log.message }}</div>
              <div class="text-muted">{{ ago(log.time) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { api } from '../utils/api.js'
import { MAIN_URL } from '../utils/mainUrl.js'
import { MINING_URL } from '../utils/miningUrl.js'
import { MINER_BLOCK_TIME_SEC, MINER_PROTOCOL_VERSION, minerInfoLabel } from '../utils/minerConstants.js'

const authStore = useAuthStore()

const miningUrlInput = ref(MINING_URL)
const cpu = ref(50)
/** @type {import('vue').Ref<'wasm' | 'native'>} */
const engineMode = ref('wasm')
/** Independent miners (like miner.php --threads=N). */
const minerThreads = ref(4)
const minerRunning = ref(false)
const checkingVerify = ref(true)
const verifiedAddress = ref(false)

/** Wallet-level totals (one increment per actual accept/reject/chain-tip event — not summed across threads). */
const sessionAccepted = ref(0)
const sessionRejected = ref(0)
const sessionDropped = ref(0)

/** @type {import('vue').Ref<Record<number, object>>} */
const workerSnapshots = ref({})

const minerData = ref({
  miningStat: {
    speed: '0',
    accepted: 0,
    rejected: 0,
    dropped: 0,
    submits: 0,
    cnt: 0,
    hashes: 0,
    nodeStatus: null
  },
  miner: {},
  logs: []
})

/** @type {Worker[]} */
let workers = []
/** @type {ReturnType<typeof setTimeout> | null} */
let pendingStopCleanup = null

const address = computed(() => authStore.activeAccount?.address || '')

const miningStat = computed(() => minerData.value.miningStat || {})
const miner = computed(() => minerData.value.miner || {})
const logs = computed(() => minerData.value.logs || [])

/** How many worker miners are running (from merged snapshot). */
const activeThreadCount = computed(() => miner.value?.totalThreads ?? 0)

const nodeStatusClass = computed(() =>
  miningStat.value.nodeStatus ? 'text-success' : 'text-danger'
)

const canStart = computed(() => verifiedAddress.value && !!address.value && !checkingVerify.value)

const faucetHref = computed(() => `${MAIN_URL}/apps/faucet`)

const blockTime = MINER_BLOCK_TIME_SEC

const electronApi = computed(() =>
  typeof window !== 'undefined' && window.phpcoinElectron && window.phpcoinElectron.isElectron
    ? window.phpcoinElectron
    : null
)

const nativeAvailable = computed(() => typeof electronApi.value?.minerNativeArgon === 'function')

const maxParallel = computed(() => {
  if (typeof navigator === 'undefined') return 8
  return Math.min(16, Math.max(1, navigator.hardwareConcurrency || 1))
})

watch(maxParallel, (m) => {
  if (minerThreads.value > m) minerThreads.value = m
})

watch([nativeAvailable, engineMode], () => {
  if (!nativeAvailable.value && engineMode.value === 'native') {
    engineMode.value = 'wasm'
  }
})

/** Coerce miner display numbers (handles large string hits). */
function minerNum(v) {
  if (v == null) return 0
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'bigint') return Number(v)
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function emptyMergedMiner() {
  return {
    miningStat: {
      speed: '0',
      accepted: 0,
      rejected: 0,
      dropped: 0,
      submits: 0,
      cnt: 0,
      hashes: 0,
      nodeStatus: null
    },
    miner: {},
    logs: []
  }
}

function mergeWorkerSnapshots(map) {
  const ids = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
  const list = ids.map((id) => map[id]).filter(Boolean)
  if (!list.length) {
    return emptyMergedMiner()
  }

  const sumStat = (k) => list.reduce((a, s) => a + (Number(s.miningStat?.[k]) || 0), 0)
  const speeds = list.map((s) => Number(s.miningStat?.speed) || 0)
  const aggSpeed = speeds.reduce((a, b) => a + b, 0)

  const nodeOk = list.some((s) => s.miningStat?.nodeStatus !== false)

  /** Elapsed/target are identical per chain step; hit differs — show max hit and max(maxHit). */
  const base = list[0].miner || {}
  let maxHitAcross = 0
  let maxPeakAcross = 0
  for (const s of list) {
    const m = s.miner || {}
    maxHitAcross = Math.max(maxHitAcross, minerNum(m.hit))
    maxPeakAcross = Math.max(maxPeakAcross, minerNum(m.maxHit))
  }

  const mergedLogs = []
  for (let j = 0; j < list.length; j++) {
    const threadId = ids[j]
    for (const log of list[j].logs || []) {
      mergedLogs.push({
        ...log,
        title: `[#${threadId}] ${log.title}`
      })
    }
  }
  mergedLogs.sort((a, b) => (b.time || 0) - (a.time || 0))
  const logsTrim = mergedLogs.slice(0, 100)

  return {
    miningStat: {
      cnt: sumStat('cnt'),
      hashes: sumStat('hashes'),
      submits: sumStat('submits'),
      accepted: sumStat('accepted'),
      rejected: sumStat('rejected'),
      dropped: sumStat('dropped'),
      speed: aggSpeed.toFixed(2),
      height: list[0]?.miningStat?.height ?? null,
      nodeStatus: nodeOk
    },
    miner: {
      ...base,
      hit: maxHitAcross,
      maxHit: maxPeakAcross,
      totalThreads: list.length
    },
    logs: logsTrim,
    running: list.some((s) => s.running)
  }
}

function logClass(type) {
  if (type === 'success') return 'alert-success'
  if (type === 'danger') return 'alert-danger'
  return 'alert-secondary'
}

function ago(t) {
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 60) return `${s}s ago`
  return `${Math.round(s / 60)}m ago`
}

const runningTimeHuman = computed(() => {
  const rt = miner.value?.runningTime
  if (rt == null) return '—'
  const sec = Math.round(rt / 1000)
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m ${sec % 60}s`
})

function log2safe(n) {
  if (n == null || n <= 0) return 0
  return Math.log2(n)
}

const percHit = computed(() => {
  const h = minerNum(miner.value?.hit)
  const mt = minerNum(miner.value?.maxTarget)
  if (!mt || !h) return 0
  const denom = log2safe(mt)
  if (denom <= 0) return 0
  return Math.min(100, Math.round((log2safe(h) * 100) / denom))
})

/** Vertical line on Hit bar: peak hit vs maxTarget (same log scale as fill). */
const percHitPeakMarker = computed(() => {
  const peak = minerNum(miner.value?.maxHit)
  const mt = minerNum(miner.value?.maxTarget)
  if (!mt || !peak) return 0
  const denom = log2safe(mt)
  if (denom <= 0) return 0
  return Math.min(100, Math.round((log2safe(peak) * 100) / denom))
})

const percTarget = computed(() => {
  const t = miner.value?.target
  const mt = miner.value?.maxTarget
  if (!mt || !t) return 0
  return Math.min(100, Math.round((log2safe(t) * 100) / log2safe(mt)))
})

const percElapsed = computed(() => {
  const e = miner.value?.elapsed
  if (e == null) return 0
  const maxTime = blockTime
  return Math.min(100, Math.round((e * 100) / (maxTime * 2)))
})

function publicKeyFromApiResult(pk) {
  if (pk == null) return ''
  if (typeof pk === 'string') return pk.trim()
  if (typeof pk === 'object') {
    const v = pk.public_key ?? pk.publicKey
    if (typeof v === 'string') return v.trim()
  }
  return ''
}

async function checkVerified() {
  checkingVerify.value = true
  verifiedAddress.value = false
  if (!address.value) {
    checkingVerify.value = false
    return
  }
  try {
    const raw = await api.getPublicKey(address.value)
    const net = publicKeyFromApiResult(raw)
    verifiedAddress.value = !!net
  } catch {
    verifiedAddress.value = false
  } finally {
    checkingVerify.value = false
  }
}

function terminateWorkers() {
  for (const w of workers) {
    try {
      w.terminate()
    } catch (_) {}
  }
  workers = []
}

function stopMiner() {
  if (pendingStopCleanup) {
    clearTimeout(pendingStopCleanup)
    pendingStopCleanup = null
  }
  for (const w of workers) {
    try {
      w.postMessage({ type: 'stop' })
    } catch (_) {}
  }
  pendingStopCleanup = setTimeout(() => {
    pendingStopCleanup = null
    terminateWorkers()
    workerSnapshots.value = {}
    minerRunning.value = false
    minerData.value = emptyMergedMiner()
    sessionAccepted.value = 0
    sessionRejected.value = 0
    sessionDropped.value = 0
  }, 400)
}

function onCpuInput() {
  if (!minerRunning.value) return
  for (const w of workers) {
    try {
      w.postMessage({ type: 'cpu', cpu: cpu.value })
    } catch (_) {}
  }
}

function attachWorkerHandlers(worker, instanceId) {
  worker.onmessage = async (ev) => {
    const m = ev.data || {}
    if (m.type === 'native-argon-request') {
      try {
        const apiEl = electronApi.value
        if (!apiEl?.minerNativeArgon) throw new Error('Native Argon requires Electron.')
        const encoded = await apiEl.minerNativeArgon(m.payload)
        worker.postMessage({ type: 'native-argon-result', id: m.id, encoded })
      } catch (e) {
        worker.postMessage({
          type: 'native-argon-error',
          id: m.id,
          error: e instanceof Error ? e.message : String(e)
        })
      }
      return
    }
    if (m.type === 'state' && m.minerData) {
      const id = Number(m.minerInstanceId ?? instanceId)
      workerSnapshots.value = {
        ...workerSnapshots.value,
        [id]: m.minerData
      }
      minerData.value = mergeWorkerSnapshots(workerSnapshots.value)
      minerRunning.value = !!minerData.value.running
    }
    if (m.type === 'hash-accepted') {
      sessionAccepted.value++
      try {
        await api.getBalance(address.value)
        await api.getTransactions(address.value, 1, 20)
      } catch (_) {}
      return
    }
    if (m.type === 'hash-rejected') {
      sessionRejected.value++
      return
    }
    if (m.type === 'chain-dropped') {
      sessionDropped.value++
      return
    }
  }

  worker.onerror = (err) => {
    console.error(err)
    minerRunning.value = false
    terminateWorkers()
    workerSnapshots.value = {}
    minerData.value = emptyMergedMiner()
  }
}

function startMiner() {
  if (!canStart.value) return
  if (pendingStopCleanup) {
    clearTimeout(pendingStopCleanup)
    pendingStopCleanup = null
  }
  terminateWorkers()
  workerSnapshots.value = {}
  minerData.value = emptyMergedMiner()
  sessionAccepted.value = 0
  sessionRejected.value = 0
  sessionDropped.value = 0

  const n = Math.max(1, Math.min(Math.floor(Number(minerThreads.value)) || 1, maxParallel.value))
  minerThreads.value = n

  minerRunning.value = true

  const basePayload = {
    miningNodeUrl: miningUrlInput.value.trim().replace(/\/+$/, ''),
    address: address.value,
    cpu: cpu.value,
    blockTimeSeconds: blockTime,
    minerVersion: MINER_PROTOCOL_VERSION,
    minerInfo: minerInfoLabel(),
    engineMode: nativeAvailable.value && engineMode.value === 'native' ? 'native' : 'wasm',
    minerThreads: n
  }

  for (let i = 0; i < n; i++) {
    const w = new Worker(new URL('../workers/miner.worker.js', import.meta.url), { type: 'module' })
    attachWorkerHandlers(w, i)
    workers.push(w)
    w.postMessage({
      type: 'start',
      payload: {
        ...basePayload,
        minerInstanceId: i
      }
    })
  }
}

function clearLogs() {
  if (!confirm('Clear miner log?')) return
  if (minerRunning.value && workers.length) {
    for (const w of workers) {
      try {
        w.postMessage({ type: 'clearLogs' })
      } catch (_) {}
    }
  } else {
    minerData.value = { ...minerData.value, logs: [] }
  }
}

onMounted(() => {
  checkVerified()
})

watch(
  () => authStore.activeAccount?.address,
  () => {
    checkVerified()
  }
)

onBeforeUnmount(() => {
  stopMiner()
  terminateWorkers()
})
</script>

<style scoped>
.log-panel {
  max-height: 420px;
  overflow: auto;
}

.hit-progress-stack {
  overflow: visible;
}

.hit-peak-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: 0;
  z-index: 2;
  pointer-events: none;
  background: var(--bs-primary, #0d6efd);
  border-radius: 0;
}
</style>
