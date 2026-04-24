'use strict'

const path = require('path')
const os = require('os')
const { Worker } = require('worker_threads')

let cancelRequested = false
/** @type {import('worker_threads').Worker[]} */
let activeChildWorkers = []

function resetCancel () {
  cancelRequested = false
}

function requestCancel () {
  cancelRequested = true
  for (const w of activeChildWorkers) {
    try {
      w.postMessage({ type: 'cancel' })
    } catch (_) {}
  }
}

/**
 * Parallel Argon2i benchmark: one Node worker thread per logical worker (separate cores).
 * Each thread uses a distinct password prefix so work is not duplicated.
 *
 * @param {object} payload
 * @param {number} [payload.workerCount] 1 … min(cpu, 32); default = logical CPU count
 * @param {import('electron').WebContents} sender
 */
async function runMiningBenchmark (payload, sender) {
  resetCancel()
  activeChildWorkers = []

  const memoryCost = Number(payload.memoryCost)
  const timeCost = Number(payload.timeCost)
  const parallelism = Number(payload.parallelism)
  const durationMs = Number(payload.durationMs)
  const cpus = os.cpus().length
  const workerCount = Math.max(
    1,
    Math.min(Number(payload.workerCount) || cpus, cpus, 32)
  )

  if (!Number.isFinite(memoryCost) || memoryCost <= 0) {
    return { ok: false, error: 'invalid memoryCost' }
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return { ok: false, error: 'invalid durationMs' }
  }

  const wallStart = Date.now()
  const workerPath = path.join(__dirname, 'miningBenchmarkNativeWorker.js')
  const saltUtf8 = payload.saltUtf8

  const state = new Array(workerCount).fill(0)
  let lastProgressSend = wallStart

  const emitProgress = () => {
    const now = Date.now()
    if (now - lastProgressSend < 200 && !cancelRequested) return
    lastProgressSend = now
    const total = state.reduce((a, b) => a + b, 0)
    if (!sender.isDestroyed()) {
      sender.send('mining-benchmark-progress', {
        hashes: total,
        elapsedMs: now - wallStart,
        workerCount
      })
    }
  }

  const workers = []
  for (let i = 0; i < workerCount; i++) {
    const w = new Worker(workerPath, {
      workerData: {
        workerTag: i,
        workerIndex: i,
        memoryCost,
        timeCost,
        parallelism,
        saltUtf8,
        durationMs
      }
    })
    activeChildWorkers.push(w)
    workers.push(w)
  }

  try {
    const results = await Promise.all(
      workers.map(
        (w) =>
          new Promise((resolve, reject) => {
            w.on('message', (msg) => {
              if (msg.type === 'progress') {
                state[msg.workerIndex] = msg.hashes
                emitProgress()
              } else if (msg.type === 'done') {
                state[msg.workerIndex] = msg.hashes
                resolve(msg)
              } else if (msg.type === 'error') {
                reject(new Error(msg.message || 'worker error'))
              }
            })
            w.on('error', reject)
          })
      )
    )

    const totalHashes = state.reduce((a, b) => a + b, 0)
    const wallElapsed = Date.now() - wallStart
    const anyCancelled =
      cancelRequested || results.some((r) => r && r.cancelled)

    return {
      ok: true,
      hashes: totalHashes,
      elapsedMs: wallElapsed,
      cancelled: anyCancelled,
      workerCount
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  } finally {
    for (const w of workers) {
      try {
        w.terminate()
      } catch (_) {}
    }
    activeChildWorkers = []
  }
}

module.exports = {
  runMiningBenchmark,
  requestCancel
}
