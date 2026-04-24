<template>
  <div>
    <div class="row">
      <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0 font-size-18">Mining speed (Argon2i)</h4>
          <div class="page-title-right">
            <ol class="breadcrumb m-0">
              <li class="breadcrumb-item"><a href="javascript: void(0);">Wallet</a></li>
              <li class="breadcrumb-item active">Mining benchmark</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <p class="text-muted small">
      Measures Argon2i hashes per second using parameters from <code>mine.php?q=info</code>.
      <strong>WASM</strong> uses multiple Web Workers when you raise “Parallel workers” (aggregate throughput across CPU cores).
      <strong>Native</strong> uses one Node <code>argon2</code> thread per worker via <code>worker_threads</code> (Electron only). Argon’s <code>parallelism</code> from the network is unchanged; this setting is extra OS-level parallelism for the benchmark only.
    </p>

    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">Network parameters</h5>
      </div>
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-8">
            <label class="form-label">Mining node URL</label>
            <input v-model="miningUrlInput" type="text" class="form-control font-monospace" spellcheck="false" />
            <div class="form-text">Defaults from your build config; override to point at another coordinator.</div>
          </div>
          <div class="col-md-4">
            <button type="button" class="btn btn-outline-primary w-100" :disabled="loadingInfo || running" @click="loadMineInfo">
              <span v-if="loadingInfo" class="spinner-border spinner-border-sm me-1" />
              Fetch mine info
            </button>
          </div>
        </div>

        <div v-if="infoError" class="alert alert-danger mt-3 mb-0">{{ infoError }}</div>

        <template v-if="mineInfo">
          <hr />
          <dl class="row small mb-0">
            <dt class="col-sm-3">Network</dt>
            <dd class="col-sm-9">{{ mineInfo.network }} · chain {{ mineInfo.chain_id }}</dd>
            <dt class="col-sm-3">Height</dt>
            <dd class="col-sm-9">{{ mineInfo.height }}</dd>
            <dt class="col-sm-3">Backend</dt>
            <dd class="col-sm-9">
              <div class="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  class="btn"
                  :class="engineMode === 'wasm' ? 'btn-primary' : 'btn-outline-primary'"
                  :disabled="running"
                  @click="engineMode = 'wasm'"
                >
                  WASM (browser)
                </button>
                <button
                  type="button"
                  class="btn"
                  :class="engineMode === 'native' ? 'btn-primary' : 'btn-outline-primary'"
                  :disabled="running || !nativeAvailable"
                  :title="!nativeAvailable ? 'Requires Electron desktop shell' : ''"
                  @click="engineMode = 'native'"
                >
                  Native (Node)
                </button>
              </div>
              <span v-if="engineMode === 'wasm'" class="text-muted ms-2">hash-wasm · {{ parallelWorkers }} Web Workers</span>
              <span v-else class="text-muted ms-2">argon2 npm · {{ parallelWorkers }} Node worker threads</span>
              <span v-if="engineMode === 'native' && !nativeAvailable" class="d-block mt-1 text-warning small">
                Native mode is only available in the Electron wallet shell (not in a plain browser tab).
              </span>
            </dd>
            <dt class="col-sm-3">Argon2</dt>
            <dd class="col-sm-9 font-monospace">
              memory_cost={{ argon.memoryCost }} KiB · time_cost={{ argon.timeCost }} · parallelism={{ argon.parallelism }}
            </dd>
            <dt class="col-sm-3">Salt source</dt>
            <dd class="col-sm-9">
              First 16 characters of active address (same as legacy miner default).
              <span v-if="saltPreview" class="font-monospace d-block mt-1">{{ saltPreview }}</span>
              <span v-else class="text-muted">No address — using placeholder salt.</span>
            </dd>
          </dl>
        </template>
      </div>
    </div>

    <div class="card mt-3">
      <div class="card-header">
        <h5 class="card-title mb-0">Benchmark</h5>
      </div>
      <div class="card-body">
        <div class="row g-3 align-items-center">
          <div class="col-md-4">
            <label class="form-label">Duration (seconds)</label>
            <input v-model.number="durationSec" type="range" class="form-range" min="3" max="60" step="1" :disabled="running" />
            <div class="small text-muted">{{ durationSec }} s</div>
          </div>
          <div class="col-md-4">
            <label class="form-label">Parallel workers (CPU)</label>
            <input
              v-model.number="parallelWorkers"
              type="range"
              class="form-range"
              min="1"
              :max="maxParallel"
              step="1"
              :disabled="running"
            />
            <div class="small text-muted">{{ parallelWorkers }} / {{ maxParallel }} (aggregate H/s)</div>
            <div class="form-text">
              Each worker runs Argon with full <code>memory_cost</code>; many workers × large MiB can use a lot of RAM.
            </div>
          </div>
          <div class="col-md-4 d-flex gap-2 flex-wrap justify-content-md-end pt-md-4">
            <button type="button" class="btn btn-success" :disabled="!canRun || running || (engineMode === 'native' && !nativeAvailable)" @click="startBench">
              Start
            </button>
            <button type="button" class="btn btn-outline-danger" :disabled="!running" @click="stopBench">Stop</button>
          </div>
        </div>

        <div v-if="benchError" class="alert alert-warning mt-3 mb-0">{{ benchError }}</div>

        <div v-if="running || lastResult" class="mt-4">
          <div v-if="running" class="d-flex align-items-center gap-2 text-muted small mb-2">
            <span class="spinner-border spinner-border-sm" role="status" />
            Running… {{ progressHashes }} hashes · {{ progressElapsed.toFixed(1) }} s
            <span v-if="engineMode === 'wasm'" class="badge bg-secondary">WASM</span>
            <span v-else class="badge bg-secondary">Native</span>
          </div>
          <template v-if="lastResult && !running">
            <p class="mb-1">
              <span class="badge bg-info text-dark me-2">{{ lastResult.backend === 'native' ? 'Native' : 'WASM' }}</span>
              <strong>{{ lastResult.hashes }}</strong> hashes in <strong>{{ (lastResult.elapsedMs / 1000).toFixed(2) }} s</strong>
              <span v-if="lastResult.cancelled" class="badge bg-warning text-dark ms-2">stopped early</span>
            </p>
            <p class="mb-0 font-monospace">
              ≈ {{ formatHps(lastResult.hps) }} aggregate · ≈ {{ formatMsPerHash(lastResult.msPerHash) }} per hash (wall clock)
              <span v-if="(lastResult.workerCount ?? 1) > 1" class="text-muted small"> · {{ lastResult.workerCount }} workers</span>
            </p>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { MINING_URL } from '../utils/miningUrl.js'
import { fetchMineInfo } from '../utils/mineApi.js'

const authStore = useAuthStore()

const miningUrlInput = ref(MINING_URL)
const loadingInfo = ref(false)
const infoError = ref('')
const mineInfo = ref(null)

/** @type {import('vue').Ref<'wasm' | 'native'>} */
const engineMode = ref('wasm')

const durationSec = ref(10)
const running = ref(false)
const benchError = ref('')
const progressHashes = ref(0)
const progressElapsed = ref(0)
/** @type {import('vue').Ref<{ hashes: number, elapsedMs: number, cancelled?: boolean, hps: number, msPerHash: number, backend: 'wasm' | 'native', workerCount: number } | null>} */
const lastResult = ref(null)

const maxParallel = computed(() => {
  if (typeof navigator === 'undefined') return 8
  return Math.min(16, Math.max(1, navigator.hardwareConcurrency || 1))
})

const parallelWorkers = ref(4)

watch(maxParallel, (m) => {
  if (parallelWorkers.value > m) parallelWorkers.value = m
})

/** @type {Worker[]} */
let wasmWorkers = []
/** @type {null | (() => void)} */
let unsubscribeProgress = null

const electronApi = computed(() =>
  typeof window !== 'undefined' && window.phpcoinElectron && window.phpcoinElectron.isElectron
    ? window.phpcoinElectron
    : null
)

const nativeAvailable = computed(() => typeof electronApi.value?.miningBenchmarkNativeRun === 'function')

const saltUtf8 = computed(() => {
  const a = authStore.activeAccount?.address
  if (a && typeof a === 'string' && a.length >= 1) return a
  return 'PHPCOINWEBWALLET'
})

const saltPreview = computed(() => {
  const s = saltUtf8.value
  return s.slice(0, 16).padEnd(16, '0')
})

const argon = computed(() => {
  const info = mineInfo.value
  if (!info) return { memoryCost: 2048, timeCost: 2, parallelism: 1 }
  const ho = info.hashingOptions
  if (ho && typeof ho.memory_cost === 'number') {
    return {
      memoryCost: ho.memory_cost,
      timeCost: ho.time_cost ?? 2,
      parallelism: ho.threads ?? 1
    }
  }
  return { memoryCost: 2048, timeCost: 2, parallelism: 1 }
})

const canRun = computed(() => !!mineInfo.value && argon.value.memoryCost > 0)

function formatHps(hps) {
  if (hps >= 1000) return `${(hps / 1000).toFixed(2)} kH/s`
  return `${hps.toFixed(2)} H/s`
}

function formatMsPerHash(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`
  return `${ms.toFixed(0)} ms`
}

async function loadMineInfo() {
  infoError.value = ''
  loadingInfo.value = true
  mineInfo.value = null
  try {
    const base = miningUrlInput.value.trim().replace(/\/+$/, '')
    mineInfo.value = await fetchMineInfo(base)
    lastResult.value = null
  } catch (e) {
    infoError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loadingInfo.value = false
  }
}

function stopBench() {
  for (const w of wasmWorkers) {
    try {
      w.postMessage({ type: 'stop' })
    } catch (_) {}
  }
  electronApi.value?.miningBenchmarkCancel?.()
}

function terminateWasmWorkers() {
  for (const w of wasmWorkers) {
    try {
      w.terminate()
    } catch (_) {}
  }
  wasmWorkers = []
}

function clearProgressSubscription() {
  if (unsubscribeProgress) {
    unsubscribeProgress()
    unsubscribeProgress = null
  }
}

function startBench() {
  if (engineMode.value === 'native') {
    startBenchNative()
    return
  }
  startBenchWasm()
}

function startBenchWasm() {
  benchError.value = ''
  lastResult.value = null
  progressHashes.value = 0
  progressElapsed.value = 0
  running.value = true

  terminateWasmWorkers()

  const n = Math.max(1, Math.min(Math.floor(Number(parallelWorkers.value)) || 1, maxParallel.value))
  const wallStart = Date.now()
  const perWorkerHashes = new Array(n).fill(0)
  let doneCount = 0
  let anyCancelled = false

  const refreshProgress = () => {
    const total = perWorkerHashes.reduce((a, b) => a + b, 0)
    progressHashes.value = total
    progressElapsed.value = (Date.now() - wallStart) / 1000
  }

  for (let i = 0; i < n; i++) {
    const w = new Worker(new URL('../workers/miningBenchmark.worker.js', import.meta.url), { type: 'module' })
    wasmWorkers.push(w)

    w.onmessage = (e) => {
      const m = e.data
      if (m.type === 'progress') {
        perWorkerHashes[i] = m.hashes
        refreshProgress()
      } else if (m.type === 'error') {
        benchError.value = m.message || 'Worker error'
        running.value = false
        terminateWasmWorkers()
      } else if (m.type === 'done') {
        perWorkerHashes[i] = m.hashes
        anyCancelled = anyCancelled || !!m.cancelled
        doneCount++
        if (doneCount >= n) {
          const wallElapsed = Date.now() - wallStart
          const totalHashes = perWorkerHashes.reduce((a, b) => a + b, 0)
          lastResult.value = {
            hashes: totalHashes,
            elapsedMs: wallElapsed,
            cancelled: anyCancelled,
            hps: totalHashes / (wallElapsed / 1000),
            msPerHash: totalHashes > 0 ? wallElapsed / totalHashes : 0,
            backend: 'wasm',
            workerCount: n
          }
          running.value = false
          terminateWasmWorkers()
        }
      }
    }

    w.onerror = (err) => {
      benchError.value = err.message || 'Worker failed'
      running.value = false
      terminateWasmWorkers()
    }

    w.postMessage({
      type: 'run',
      payload: {
        memoryCost: argon.value.memoryCost,
        timeCost: argon.value.timeCost,
        parallelism: argon.value.parallelism,
        saltUtf8: saltUtf8.value,
        durationMs: durationSec.value * 1000,
        workerTag: i
      }
    })
  }
}

async function startBenchNative() {
  const api = electronApi.value
  if (!api?.miningBenchmarkNativeRun) {
    benchError.value = 'Native benchmark requires Electron.'
    return
  }

  benchError.value = ''
  lastResult.value = null
  progressHashes.value = 0
  progressElapsed.value = 0
  running.value = true

  clearProgressSubscription()
  if (typeof api.onMiningBenchmarkProgress === 'function') {
    unsubscribeProgress = api.onMiningBenchmarkProgress((data) => {
      progressHashes.value = data.hashes
      progressElapsed.value = data.elapsedMs / 1000
    })
  }

  try {
    const result = await api.miningBenchmarkNativeRun({
      memoryCost: argon.value.memoryCost,
      timeCost: argon.value.timeCost,
      parallelism: argon.value.parallelism,
      saltUtf8: saltUtf8.value,
      durationMs: durationSec.value * 1000,
      workerCount: Math.max(1, Math.min(Math.floor(Number(parallelWorkers.value)) || 1, maxParallel.value))
    })

    if (!result || result.ok === false) {
      benchError.value = result?.error || 'Native benchmark failed'
      return
    }

    const elapsedMs = result.elapsedMs ?? 1
    const hashes = result.hashes ?? 0
    lastResult.value = {
      hashes,
      elapsedMs,
      cancelled: !!result.cancelled,
      hps: hashes / (elapsedMs / 1000),
      msPerHash: hashes > 0 ? elapsedMs / hashes : 0,
      backend: 'native',
      workerCount: Number(result.workerCount) || 1
    }
  } catch (e) {
    benchError.value = e instanceof Error ? e.message : String(e)
  } finally {
    clearProgressSubscription()
    running.value = false
  }
}

onBeforeUnmount(() => {
  stopBench()
  terminateWasmWorkers()
  clearProgressSubscription()
})
</script>
