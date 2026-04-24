'use strict'

const { contextBridge, ipcRenderer } = require('electron')

/**
 * Safe surface exposed to the Vue app (`window.phpcoinElectron`).
 */
contextBridge.exposeInMainWorld('phpcoinElectron', {
  isElectron: true,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome
  },

  /**
   * Native Argon2i benchmark (Node `argon2` addon in main process).
   * @returns {Promise<{ ok: boolean, hashes?: number, elapsedMs?: number, cancelled?: boolean, error?: string }>}
   */
  miningBenchmarkNativeRun: (payload) =>
    ipcRenderer.invoke('mining-benchmark-native', payload),

  miningBenchmarkCancel: () => ipcRenderer.send('mining-benchmark-cancel'),

  /** @returns {() => void} unsubscribe */
  onMiningBenchmarkProgress: (fn) => {
    const channel = 'mining-benchmark-progress'
    const wrapped = (_event, data) => fn(data)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },

  /**
   * One Argon2i encoded hash for mining (Node addon). Used when engine = native.
   * @param {{ password: string, saltUtf8: string, memoryCost: number, timeCost: number, parallelism: number }} payload
   */
  minerNativeArgon: (payload) => ipcRenderer.invoke('miner-native-argon', payload)
})
