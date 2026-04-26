import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { api } from '../utils/api.js'
import { MAIN_URL } from '../utils/mainUrl.js'
import { MINING_URL } from '../utils/miningUrl.js'
import { MINER_BLOCK_TIME_SEC, MINER_PROTOCOL_VERSION, minerInfoLabel } from '../utils/minerConstants.js'

function electronApi() {
  if (typeof window === 'undefined') return null
  return window.phpcoinElectron?.isElectron ? window.phpcoinElectron : null
}

export const useMinerStore = defineStore('miner', () => {
  const authStore = useAuthStore()

  const miningUrlInput = ref(MINING_URL)
  const cpu = ref(50)
  const minerThreads = ref(4)
  const minerRunning = ref(false)
  const checkingVerify = ref(true)
  const verifiedAddress = ref(false)

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

  const activeThreadCount = computed(() => miner.value?.totalThreads ?? 0)

  const canStart = computed(() => verifiedAddress.value && !!address.value && !checkingVerify.value)

  const faucetHref = computed(() => `${MAIN_URL}/apps/faucet`)

  const blockTime = MINER_BLOCK_TIME_SEC

  const electronApiRef = computed(() => electronApi())

  const nativeAvailable = computed(() => typeof electronApiRef.value?.minerNativeArgon === 'function')

  const maxParallel = computed(() => {
    if (typeof navigator === 'undefined') return 8
    return Math.min(16, Math.max(1, navigator.hardwareConcurrency || 1))
  })

  watch(maxParallel, (m) => {
    if (minerThreads.value > m) minerThreads.value = m
  })

  watch(
    () => authStore.activeAccount?.address,
    (next, prev) => {
      if (prev != null && prev !== '' && next !== prev) {
        stopMiner()
      }
      void checkVerified()
    }
  )

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
          const apiEl = electronApi()
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

    const engine = nativeAvailable.value ? 'native' : 'wasm'

    const basePayload = {
      miningNodeUrl: miningUrlInput.value.trim().replace(/\/+$/, ''),
      address: address.value,
      cpu: cpu.value,
      blockTimeSeconds: blockTime,
      minerVersion: MINER_PROTOCOL_VERSION,
      minerInfo: minerInfoLabel(),
      engineMode: engine,
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

  /**
   * Call from Miner.vue on unmount. Intentionally a no-op: workers live in this store so
   * mining continues after navigation (web WASM and Electron) until Stop or account change.
   */
  function onMinerPageLeave() {}

  return {
    miningUrlInput,
    cpu,
    minerThreads,
    minerRunning,
    checkingVerify,
    verifiedAddress,
    sessionAccepted,
    sessionRejected,
    sessionDropped,
    workerSnapshots,
    minerData,
    address,
    miningStat,
    miner,
    logs,
    activeThreadCount,
    canStart,
    faucetHref,
    blockTime,
    nativeAvailable,
    maxParallel,
    runningTimeHuman,
    percHit,
    percHitPeakMarker,
    percTarget,
    percElapsed,
    checkVerified,
    startMiner,
    stopMiner,
    onCpuInput,
    clearLogs,
    logClass,
    ago,
    onMinerPageLeave
  }
})
