'use strict'

const { parentPort, workerData } = require('worker_threads')
const argon2 = require('argon2')

let cancel = false

parentPort.on('message', (m) => {
  if (m && m.type === 'cancel') {
    cancel = true
  }
})

async function run () {
  const {
    workerTag = 0,
    workerIndex = 0,
    memoryCost,
    timeCost,
    parallelism,
    saltUtf8,
    durationMs
  } = workerData

  const saltStr = String(saltUtf8 || '0000000000000000').slice(0, 16).padEnd(16, '0')
  const salt = Buffer.from(saltStr, 'utf8')

  const start = Date.now()
  let hashes = 0
  let lastProgress = start

  try {
    while (!cancel && Date.now() - start < durationMs) {
      await argon2.hash(`benchmark-w${workerTag}-${hashes}`, {
        salt,
        type: argon2.argon2i,
        hashLength: 32,
        memoryCost,
        timeCost,
        parallelism
      })
      hashes++
      const now = Date.now()
      if (now - lastProgress >= 250 || hashes === 1) {
        lastProgress = now
        parentPort.postMessage({
          type: 'progress',
          workerIndex,
          hashes,
          elapsedMs: now - start
        })
      }
    }
  } catch (e) {
    parentPort.postMessage({
      type: 'error',
      workerIndex,
      message: e instanceof Error ? e.message : String(e)
    })
    return
  }

  parentPort.postMessage({
    type: 'done',
    workerIndex,
    hashes,
    elapsedMs: Date.now() - start,
    cancelled: cancel
  })
}

run().catch((e) => {
  parentPort.postMessage({
    type: 'error',
    workerIndex: workerData.workerIndex,
    message: e instanceof Error ? e.message : String(e)
  })
})
