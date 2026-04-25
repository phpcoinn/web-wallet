'use strict'

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { hashArgon: minerNativeHashArgon, terminatePool: terminateMinerNativePool } = require('./minerNativePool')

/**
 * Optional: set `PHPCOIN_DEV_SERVER_URL=http://127.0.0.1:3000/` to load Vite HMR instead of static files.
 * Default: load the built SPA from `../dist/` (run `npm run build:wallet` in this folder first).
 */
const devServerUrl = process.env.PHPCOIN_DEV_SERVER_URL

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    show: false
  })

  win.once('ready-to-show', () => win.show())

  const hotReload = typeof devServerUrl === 'string' && devServerUrl.trim() !== ''

  if (hotReload) {
    const url = devServerUrl.endsWith('/') ? devServerUrl : `${devServerUrl}/`
    win.loadURL(url).catch((err) => {
      console.error('Failed to load dev server URL (PHPCOIN_DEV_SERVER_URL):', err)
    })
    if (process.env.PHPCOIN_ELECTRON_OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    const indexHtml = app.isPackaged
      ? path.join(process.resourcesPath, 'dist', 'index.html')
      : path.join(__dirname, '..', '..', 'dist', 'index.html')
    win.loadFile(indexHtml).catch((err) => {
      console.error(
        'Failed to load wallet index.html. From the electron/ folder run: npm run build:wallet',
        err
      )
    })
  }

  return win
}

/**
 * Mining Argon2i hash (PHP-compatible encoded string). Uses a reusable worker_threads pool
 * so we do not spawn/stop a Node Worker on every IPC (that overhead made WASM faster than native).
 */
ipcMain.handle('miner-native-argon', async (_event, payload) => {
  return minerNativeHashArgon(payload || {})
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  try {
    terminateMinerNativePool()
  } catch (_) {}
})
