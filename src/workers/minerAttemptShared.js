import phpcoinCrypto from 'phpcoin-crypto'

/**
 * Shared PHPCoin mining-step helpers (aligned with Block.php / mine.php).
 * Used by the orchestrator worker and optional miner-hash workers.
 */

/** Mirrors PHP `san()` default: only `[a-zA-Z0-9]` */
export function sanPhp(a) {
  return String(a ?? '').replace(/[^a-zA-Z0-9]/g, '')
}

export async function sha256Hex(str) {
  return phpcoinCrypto.sha256(String(str))
}

export function phpStyleHit(hashPart8) {
  try {
    const value = BigInt(`0x${hashPart8}`)
    if (value <= 0n) return 0n
    const maxVal = BigInt('0xffffffff') * 1000n
    return maxVal / value
  } catch {
    return 0n
  }
}

export function phpStyleTarget(difficultyMine, blockTimeSec, elapsed) {
  const e = Number(elapsed)
  if (!Number.isFinite(e) || e <= 0) return 0n
  const ei = BigInt(Math.trunc(e))
  if (ei <= 0n) return 0n
  const diffStr = String(difficultyMine).trim()
  const whole = diffStr.includes('.') ? diffStr.slice(0, diffStr.indexOf('.')) : diffStr
  const d = BigInt(whole || '0')
  const bt = BigInt(Math.trunc(Number(blockTimeSec)))
  return (d * bt) / ei
}

export function bigintToUi(n) {
  return n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : n.toString()
}

/**
 * Build salt bytes: dynamic 8-byte random hex as UTF-8 (16 chars), or first 16 chars of address UTF-8.
 */
export function buildSaltBytes(minerAddress, useDynamicSalt) {
  if (useDynamicSalt) {
    const rand = new Uint8Array(8)
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(rand)
    } else {
      for (let i = 0; i < rand.length; i++) {
        rand[i] = Math.floor(Math.random() * 256)
      }
    }
    const hex = [...rand].map((b) => b.toString(16).padStart(2, '0')).join('')
    return new TextEncoder().encode(hex)
  }
  return new TextEncoder().encode(minerAddress.substring(0, 16))
}

/**
 * After Argon2 encoded string is known: nonce + double SHA hit + hit/target (same as Block.php).
 */
export async function deriveAfterArgon({
  argon,
  chain_id,
  minerAddress,
  block_date,
  elapsed,
  height,
  difficultyMine,
  block_time
}) {
  const nonceBase = `${chain_id}${minerAddress}-${block_date}-${elapsed}-${argon}`
  const calcNonce = await sha256Hex(nonceBase)
  const hitBase = `${minerAddress}-${calcNonce}-${height}-${difficultyMine}`
  const hash1 = await sha256Hex(hitBase)
  const hash2 = await sha256Hex(hash1)
  const hashPart = hash2.substring(0, 8)
  const hitBi = phpStyleHit(hashPart)
  const targetBi = phpStyleTarget(difficultyMine, block_time, elapsed)
  const hit = bigintToUi(hitBi)
  const target = bigintToUi(targetBi)
  const blockFound = hitBi > 0n && targetBi > 0n && hitBi > targetBi
  return {
    argon,
    calcNonce,
    hashPart,
    hitBi,
    targetBi,
    hit,
    target,
    blockFound
  }
}
