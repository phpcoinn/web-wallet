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
   * One Argon2i encoded hash for mining (Node addon). Used when engine = native.
   * @param {{ password: string, saltUtf8: string, memoryCost: number, timeCost: number, parallelism: number }} payload
   */
  minerNativeArgon: (payload) => ipcRenderer.invoke('miner-native-argon', payload)
})
