/// <reference types="vite-plugin-pwa/client" />

/** Electron shell preload (`electron/src/preload.js`) — optional in browser */
interface PhpcoinElectronBridge {
  isElectron: boolean
  versions: { electron: string; chrome: string }
  minerNativeArgon?: (payload: {
    password: string
    saltUtf8: string
    memoryCost: number
    timeCost: number
    parallelism: number
  }) => Promise<{
    ok?: boolean
    encoded?: string
    error?: string
  }>
}

declare global {
  interface Window {
    phpcoinElectron?: PhpcoinElectronBridge
  }
}

export {}
