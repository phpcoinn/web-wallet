/** Block time (seconds) — must match chain (legacy config uses 60). */
export const MINER_BLOCK_TIME_SEC = Number(import.meta.env.VITE_BLOCK_TIME) || 60

/** Sent to mine.php as `version` (legacy electron used 1.3). */
export const MINER_PROTOCOL_VERSION = String(import.meta.env.VITE_MINER_VERSION || '1.3')

/** Matches package version when releasing miner stats to the network */
export function minerInfoLabel() {
  return 'phpcoin-web-wallet 1.2.1'
}
