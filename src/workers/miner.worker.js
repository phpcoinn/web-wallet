/**
 * One PHPCoin miner instance (same role as one `Miner` in node/utils/miner.php).
 *
 * PHP CLI: `--threads=N` forks N processes via Forker; each process runs one `Miner->start()`
 * loop with **one Argon hash per attempt** (sequential). That is “one thread = one miner”, not
 * multiple Argon calls batched inside a single loop iteration.
 *
 * The wallet spawns **N copies of this worker** when you set “Threads” to N — each worker is an
 * independent miner (own loop, own minerid, own submitStat cadence), like N PHP processes.
 *
 * PoW rules: Block.php / mine.php (see earlier commits / minerAttemptShared.js).
 */
import { argon2i } from 'hash-wasm'
import { sanPhp, buildSaltBytes, deriveAfterArgon, bigintToUi } from './minerAttemptShared.js'

function postState(minerData, extra = {}) {
  self.postMessage({
    type: 'state',
    minerData: JSON.parse(JSON.stringify(minerData)),
    minerInstanceId: cfg?.minerInstanceId ?? 0,
    ...extra
  })
}

async function mineGetJson(baseUrl, q) {
  const base = baseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}/mine.php?q=${encodeURIComponent(q)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  })
  const json = await res.json()
  if (json.status !== 'ok') {
    throw new Error(json.error || json.message || `mine.php ${q} failed`)
  }
  return json.data
}

async function minePostForm(baseUrl, q, fields) {
  const base = baseUrl.replace(/\/+$/, '')
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) body.append(k, String(v))
  }
  const res = await fetch(`${base}/mine.php?q=${encodeURIComponent(q)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
  return res.json()
}

function emptyMinerData() {
  return {
    status: null,
    running: false,
    chainInterrupt: false,
    miner: {
      attempt: 0,
      block: null,
      height: null,
      elapsed: 0,
      hit: 0,
      maxHit: 0,
      target: 0,
      maxTarget: 0,
      runningTime: 0,
      new_block_date: null,
      engine: 'wasm',
      threadIndex: 0,
      totalThreads: 1
    },
    miningStat: {
      cnt: 0,
      hashes: 0,
      submits: 0,
      accepted: 0,
      rejected: 0,
      rejectedReason: null,
      dropped: 0,
      nodeStatus: null,
      speed: '0',
      height: null
    },
    logs: []
  }
}

let running = false
let minerData = emptyMinerData()
let timers = []
let cfg = null
let miningNodesList = []
let minerid = ''
let prevHashesStat = 0
let startTime = 0
let hashingConfig = { mem: 2048, time: 2, parallelism: 1 }
let hashingTime = 0
let hashingCnt = 0
let speed = '0'
let sleepTime = 250
let attempt = 0
let cpu = 50

/** @type {Map<string, { resolve: (v: string) => void, reject: (e: Error) => void }>} */
let nativePending = new Map()
let nativeSeq = 0

function nativeArgonViaMain(payload) {
  return new Promise((resolve, reject) => {
    const id = `na-${++nativeSeq}-${Date.now()}`
    nativePending.set(id, { resolve, reject })
    self.postMessage({ type: 'native-argon-request', id, payload })
  })
}

function clearTimers() {
  for (const t of timers) {
    clearInterval(t)
  }
  timers = []
}

function pushLog(type, title, message) {
  minerData.logs.unshift({ type, time: Date.now(), title, message })
  if (minerData.logs.length > 100) minerData.logs.pop()
}

function resetSpeedVars() {
  hashingTime = 0
  hashingCnt = 0
  sleepTime = cpu === 0 ? Infinity : Math.round((100 - cpu) * 5)
}

function measureSpeed(t1, th) {
  const t2 = Date.now()
  hashingCnt++
  hashingTime += t2 - th
  const diff = (t2 - t1) / 1000
  const spd = diff > 0 ? Number(attempt / diff).toFixed(2) : '0'
  speed = spd
  const calcCount = Math.max(1, Math.round(Number(speed) * 60))
  const mod = hashingCnt % calcCount
  if (mod === 0) {
    sleepTime =
      cpu === 0 ? Infinity : Math.round((hashingTime / hashingCnt) * ((100 - cpu) / cpu))
    if (sleepTime < 0) sleepTime = 0
  }
}

async function sendHash(miningNode, postData) {
  try {
    const response = await minePostForm(miningNode, 'submitHash', postData)
    return response
  } catch (e) {
    console.error(e)
    return false
  }
}

function miningHost(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function summarizeSubmitResponse(baseUrl, response) {
  const h = miningHost(baseUrl)
  if (response === false) return `${h}: request failed`
  if (response && response.status === 'ok') return `${h}: ok`
  const msg =
    response && response.data != null
      ? String(response.data)
      : response && response.error != null
        ? String(response.error)
        : response
          ? JSON.stringify(response)
          : 'unknown'
  return `${h}: ${msg}`
}

/** One mining attempt: single Argon + derive (matches one loop body in Miner.php). */
async function runSingleAttempt({
  engineMode,
  block_date,
  elapsed,
  minerAddress,
  chain_id,
  height,
  difficultyMine,
  block_time,
  useDynamicSalt,
  hashingConfigLocal
}) {
  const saltBytes = buildSaltBytes(minerAddress, useDynamicSalt)
  const argonBase = `${block_date}-${elapsed}`
  let argon
  if (engineMode === 'native') {
    const saltUtf8 = new TextDecoder().decode(saltBytes)
    argon = await nativeArgonViaMain({
      password: argonBase,
      saltUtf8,
      memoryCost: hashingConfigLocal.mem,
      timeCost: hashingConfigLocal.time,
      parallelism: hashingConfigLocal.parallelism
    })
  } else {
    argon = await argon2i({
      password: argonBase,
      salt: saltBytes,
      iterations: hashingConfigLocal.time,
      parallelism: hashingConfigLocal.parallelism,
      memorySize: hashingConfigLocal.mem,
      hashLength: 32,
      outputType: 'encoded'
    })
  }
  return deriveAfterArgon({
    argon,
    chain_id,
    minerAddress,
    block_date,
    elapsed,
    height,
    difficultyMine,
    block_time
  })
}

async function mainLoop() {
  const block_time = cfg.blockTimeSeconds
  const minerAddress = sanPhp(cfg.address)
  const miningNode = cfg.miningNodeUrl
  const engineMode = cfg.engineMode === 'native' ? 'native' : 'wasm'
  const threadIndex = Number(cfg.minerInstanceId ?? 0)
  const totalThreads = Math.max(1, Number(cfg.minerThreads ?? 1))

  miningNodesList = []
  try {
    const nodes = await mineGetJson(miningNode, 'getMiningNodes')
    miningNodesList = Array.isArray(nodes) ? nodes : []
  } catch (_) {
    miningNodesList = []
  }

  while (running) {
    try {
      minerData.miningStat.cnt++

      let info
      try {
        info = await mineGetJson(miningNode, 'info')
      } catch {
        info = null
      }

      if (!info) {
        minerData.miningStat.nodeStatus = false
        postState(minerData)
        await new Promise((r) => setTimeout(r, 5000))
        continue
      }

      minerData.miningStat.nodeStatus = true

      if (!minerAddress) {
        minerData.status = 'Invalid address (sanitized empty)'
        postState(minerData)
        await new Promise((r) => setTimeout(r, 5000))
        continue
      }

      const block_date = parseInt(info.date, 10)
      let now = Math.round(Date.now() / 1000)
      const nodeTime = info.time
      const block = info.block
      const chain_id = String(info.chain_id ?? '')
      const offset = nodeTime - now
      let elapsed = 0
      let new_block_date
      const height = parseInt(info.height, 10) + 1
      const difficultyMine = sanPhp(String(info.difficulty))
      let argon = null
      let calcNonce = null
      let hitBi = 0n
      let targetBi = 0n
      let hit = 0
      let maxHitBi = 0n
      let target = 0
      let maxTargetBi = 0n
      attempt = 0
      let blockFound = false

      minerData.miner = {
        address: minerAddress,
        block_date,
        now,
        nodeTime,
        offset,
        elapsed: 0,
        new_block_date: null,
        height,
        difficulty: difficultyMine,
        hit: 0,
        target: 0,
        maxHit: 0,
        maxTarget: 0,
        attempt: 0,
        block,
        version: info.version,
        runningTime: Date.now() - startTime,
        engine: engineMode,
        threadIndex,
        totalThreads
      }

      const t1 = Date.now()
      resetSpeedVars()

      if (info.hashingOptions) {
        hashingConfig.mem = info.hashingOptions.memory_cost
        hashingConfig.parallelism = info.hashingOptions.threads
        hashingConfig.time = info.hashingOptions.time_cost
      }

      const useDynamicSalt = !!info.hashingOptions

      while (!blockFound && running) {
        if (!running) {
          if (Number(cfg.minerInstanceId ?? 0) === 0) {
            minerData.miningStat.dropped++
          }
          break
        }
        if (minerData.chainInterrupt) {
          minerData.chainInterrupt = false
          break
        }

        attempt++
        if (sleepTime === Infinity) {
          running = false
          break
        }

        await new Promise((r) => setTimeout(r, sleepTime === Infinity ? 0 : sleepTime))
        now = Math.round(Date.now() / 1000)
        elapsed = Math.trunc(now + offset - block_date)
        new_block_date = block_date + elapsed

        minerData.miner.elapsed = elapsed
        minerData.miner.attempt = attempt
        minerData.miner.new_block_date = new_block_date
        minerData.miningStat.height = height

        minerData.miningStat.hashes++

        const th = Date.now()
        let step
        try {
          step = await runSingleAttempt({
            engineMode,
            block_date,
            elapsed,
            minerAddress,
            chain_id,
            height,
            difficultyMine,
            block_time,
            useDynamicSalt,
            hashingConfigLocal: { ...hashingConfig }
          })
        } catch (err) {
          pushLog('danger', 'Mining step error', err instanceof Error ? err.message : String(err))
          await new Promise((r) => setTimeout(r, 1000))
          continue
        }

        argon = step.argon
        calcNonce = step.calcNonce
        hitBi = step.hitBi
        targetBi = step.targetBi
        hit = step.hit
        target = step.target
        blockFound = step.blockFound

        if (hitBi > maxHitBi) maxHitBi = hitBi
        if (targetBi > maxTargetBi) maxTargetBi = targetBi

        if (elapsed <= 0) break

        minerData.miner.hit = hit
        minerData.miner.maxHit = bigintToUi(maxHitBi)
        minerData.miner.target = target
        minerData.miner.maxTarget = bigintToUi(maxTargetBi)
        minerData.miner.runningTime = Date.now() - startTime
        measureSpeed(t1, th)
        minerData.miningStat.speed = speed
      }

      if (!blockFound || elapsed <= 0) {
        continue
      }

      minerData.miningStat.submits++
      const postData = {
        argon,
        nonce: calcNonce,
        height,
        difficulty: difficultyMine,
        address: minerAddress,
        date: new_block_date,
        elapsed,
        minerInfo: cfg.minerInfo,
        version: cfg.minerVersion
      }

      const submitAttempts = []
      let response = await sendHash(miningNode, postData)
      submitAttempts.push(summarizeSubmitResponse(miningNode, response))
      let accepted = false
      if (response && response.status === 'ok') {
        accepted = true
      } else if (miningNodesList.length > 0) {
        for (const node of miningNodesList) {
          response = await sendHash(node, postData)
          submitAttempts.push(summarizeSubmitResponse(node, response))
          if (response && response.status === 'ok') {
            accepted = true
            break
          }
        }
      }

      if (accepted) {
        minerData.miningStat.accepted++
        pushLog(
          'success',
          'Hash accepted',
          response.data != null ? String(response.data) : 'ok'
        )
        self.postMessage({ type: 'hash-accepted', minerInstanceId: cfg?.minerInstanceId ?? 0 })
      } else {
        minerData.miningStat.rejected++
        minerData.miningStat.rejectedReason = submitAttempts.join(' · ')
        pushLog('danger', 'Hash rejected', String(minerData.miningStat.rejectedReason))
        self.postMessage({ type: 'hash-rejected', minerInstanceId: cfg?.minerInstanceId ?? 0 })
      }
      minerData.miner.submitResponse = response
      postState(minerData)
      await new Promise((r) => setTimeout(r, 2000))
    } catch (e) {
      console.error(e)
      postState(minerData)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}

function sendStatTick() {
  if (!running || !cfg) return
  try {
    const hashes = minerData.miningStat.hashes - prevHashesStat
    prevHashesStat = minerData.miningStat.hashes
    const height = minerData.miningStat.height
    minePostForm(cfg.miningNodeUrl, 'submitStat', {
      address: sanPhp(cfg.address),
      minerid,
      cpu,
      hashes,
      height: height ?? '',
      interval: 60,
      miner_type: 'web-wallet',
      version: cfg.minerVersion,
      minerInfo: cfg.minerInfo
    }).catch(() => {})
  } catch (_) {}
}

function blockWatchTick() {
  if (!running || !cfg) return
  const miningNode = cfg.miningNodeUrl
  const curBlock = minerData.miner && minerData.miner.block
  if (!curBlock) return
  mineGetJson(miningNode, 'info')
    .then((info) => {
      if (info && minerData.miner && info.block !== minerData.miner.block) {
        minerData.chainInterrupt = true
        const inst = Number(cfg.minerInstanceId ?? 0)
        if (inst === 0) {
          minerData.miningStat.dropped++
          self.postMessage({ type: 'chain-dropped' })
        }
      }
    })
    .catch(() => {})
}

self.onmessage = async (ev) => {
  const msg = ev.data || {}

  if (msg.type === 'native-argon-result') {
    const p = nativePending.get(msg.id)
    if (p) {
      nativePending.delete(msg.id)
      p.resolve(msg.encoded)
    }
    return
  }
  if (msg.type === 'native-argon-error') {
    const p = nativePending.get(msg.id)
    if (p) {
      nativePending.delete(msg.id)
      p.reject(new Error(msg.error || 'native argon failed'))
    }
    return
  }

  if (msg.type === 'clearLogs') {
    minerData.logs = []
    postState(minerData)
    return
  }
  if (msg.type === 'stop') {
    running = false
    minerData.running = false
    minerData.status = 'Stopping miner'
    clearTimers()
    nativePending.clear()
    postState(minerData)
    return
  }
  if (msg.type === 'cpu') {
    cpu = Math.max(0, Math.min(100, parseInt(msg.cpu, 10) || 50))
    resetSpeedVars()
    return
  }
  if (msg.type !== 'start') return
  if (running) return

  cfg = msg.payload
  running = true
  minerData = emptyMinerData()
  minerData.running = true
  minerData.status = 'Starting miner'
  cpu = Math.max(0, Math.min(100, cfg.cpu ?? 50))
  resetSpeedVars()
  const inst = Number(cfg.minerInstanceId ?? 0)
  minerid = `${Math.round(Date.now() / 1000)}${Math.random().toString(16).slice(2)}i${inst}`
  prevHashesStat = 0
  startTime = Date.now()
  clearTimers()
  nativePending.clear()

  cfg.engineMode = cfg.engineMode === 'native' ? 'native' : 'wasm'

  timers.push(
    setInterval(() => {
      if (running) postState(minerData)
    }, 900)
  )
  timers.push(setInterval(blockWatchTick, 10000))
  timers.push(setInterval(sendStatTick, 60000))

  await mainLoop()

  running = false
  minerData.running = false
  minerData.status = null
  clearTimers()
  nativePending.clear()
  postState(minerData, { stopped: true })
}
