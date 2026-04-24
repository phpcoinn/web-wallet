'use strict'

/**
 * Long-lived worker: receives hashing jobs from minerNativePool (no spawn/stop per hash).
 */
const argon2 = require('argon2')
const { parentPort } = require('worker_threads')

parentPort.on('message', async (m) => {
  try {
    const encoded = await argon2.hash(String(m.password), {
      type: argon2.argon2i,
      salt: Buffer.from(String(m.saltUtf8), 'utf8'),
      memoryCost: Number(m.memoryCost),
      timeCost: Number(m.timeCost),
      parallelism: Number(m.parallelism),
      hashLength: 32
    })
    parentPort.postMessage({ id: m.id, ok: true, encoded })
  } catch (e) {
    parentPort.postMessage({
      id: m.id,
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    })
  }
})
