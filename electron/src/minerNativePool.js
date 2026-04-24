'use strict'

/**
 * Reusable Node worker_threads pool for miner Argon2i hashes.
 * Avoids spawning a new Worker per IPC (that made native much slower than WASM).
 */
const { Worker } = require('worker_threads')
const path = require('path')
const os = require('os')

/** Enough for parallel mining (# cores) plus margin; capped for RAM. */
function poolSize() {
  return Math.min(32, Math.max(4, os.cpus().length || 4))
}

/** @type {{ w: import('worker_threads').Worker, busy: boolean, pending: { resolve: (v: string) => void, reject: (e: Error) => void } | null }[]} */
let slots = []
let queue = []
let seq = 0
let workerPathCached = ''

function ensureSlots() {
  if (slots.length > 0) return
  workerPathCached = path.join(__dirname, 'minerNativeArgonWorker.js')
  const n = poolSize()
  for (let i = 0; i < n; i++) {
    const w = new Worker(workerPathCached)
    const slot = { w, busy: false, pending: null }
    slots.push(slot)
    w.on('message', (msg) => {
      if (!slot.pending) return
      const { resolve, reject } = slot.pending
      slot.pending = null
      slot.busy = false
      if (msg && msg.ok && typeof msg.encoded === 'string') {
        resolve(msg.encoded)
      } else {
        reject(new Error((msg && msg.error) || 'miner-native-argon failed'))
      }
      pump()
    })
    w.on('error', (err) => {
      if (slot.pending) {
        slot.pending.reject(err)
        slot.pending = null
      }
      slot.busy = false
      pump()
    })
  }
}

function pump() {
  while (queue.length > 0) {
    const idle = slots.find((s) => !s.busy)
    if (!idle) break
    const job = queue.shift()
    if (!job) break
    idle.busy = true
    idle.pending = { resolve: job.resolve, reject: job.reject }
    idle.w.postMessage({ id: ++seq, ...job.payload })
  }
}

/**
 * @param {{ password: string, saltUtf8: string, memoryCost: number, timeCost: number, parallelism: number }} payload
 * @returns {Promise<string>}
 */
function hashArgon(payload) {
  ensureSlots()
  return new Promise((resolve, reject) => {
    queue.push({ payload: payload || {}, resolve, reject })
    pump()
  })
}

function terminatePool() {
  for (const s of slots) {
    try {
      s.w.terminate()
    } catch (_) {}
  }
  slots = []
  queue = []
}

module.exports = { hashArgon, terminatePool }
