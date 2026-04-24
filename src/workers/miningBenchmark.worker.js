import { argon2i } from 'hash-wasm'

let cancelled = false

self.onmessage = async (e) => {
  const msg = e.data || {}
  if (msg.type === 'stop') {
    cancelled = true
    return
  }
  if (msg.type !== 'run') return

  cancelled = false
  const { memoryCost, timeCost, parallelism, saltUtf8, durationMs, workerTag = 0 } = msg.payload

  const saltStr = String(saltUtf8 || '0000000000000000').slice(0, 16).padEnd(16, '0')
  const salt = new TextEncoder().encode(saltStr)

  const start = performance.now()
  let hashes = 0
  let lastProgress = start

  try {
    while (!cancelled && performance.now() - start < durationMs) {
      await argon2i({
        password: `benchmark-w${workerTag}-${hashes}`,
        salt,
        iterations: timeCost,
        parallelism,
        memorySize: memoryCost,
        hashLength: 32,
        outputType: 'encoded'
      })
      hashes++
      const now = performance.now()
      if (now - lastProgress >= 250 || hashes === 1) {
        lastProgress = now
        self.postMessage({
          type: 'progress',
          hashes,
          elapsedMs: now - start
        })
      }
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err)
    })
    return
  }

  const elapsedMs = performance.now() - start
  self.postMessage({
    type: 'done',
    hashes,
    elapsedMs,
    cancelled,
    workerTag
  })
}
