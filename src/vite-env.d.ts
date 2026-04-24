/// <reference types="vite-plugin-pwa/client" />

/** Electron shell preload (`electron/src/preload.js`) — optional in browser */
interface PhpcoinElectronBridge {
  isElectron: boolean
  versions: { electron: string; chrome: string }
  miningBenchmarkNativeRun?: (payload: Record<string, unknown>) => Promise<{
    ok?: boolean
    hashes?: number
    elapsedMs?: number
    cancelled?: boolean
    error?: string
    workerCount?: number
  }>
  miningBenchmarkCancel?: () => void
  onMiningBenchmarkProgress?: (fn: (data: { hashes: number; elapsedMs: number }) => void) => () => void
}

declare global {
  interface Window {
    phpcoinElectron?: PhpcoinElectronBridge
  }
}

export {}
