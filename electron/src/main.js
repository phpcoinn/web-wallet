'use strict'

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const path = require('path')
const { hashArgon: minerNativeHashArgon, terminatePool: terminateMinerNativePool } = require('./minerNativePool')

/**
 * Load order:
 * 1. `PHPCOIN_DEV_SERVER_URL` — local Vite dev / HMR (takes precedence).
 * 2. Remote wallet — default `https://wallet.phpcoin.net/` (override with `PHPCOIN_WALLET_URL`).
 * 3. Bundled SPA — set `PHPCOIN_USE_BUNDLED_WALLET=1` to load `../dist/` (packaged: resources/dist).
 */
const devServerUrl = process.env.PHPCOIN_DEV_SERVER_URL
const useBundledWallet = process.env.PHPCOIN_USE_BUNDLED_WALLET === '1'
const remoteWalletUrl =
  (process.env.PHPCOIN_WALLET_URL && process.env.PHPCOIN_WALLET_URL.trim()) ||
  'https://wallet.phpcoin.net/'

/** Keep in sync with web-wallet/src/constants/swap.js (`SWAP_ENABLED`). */
const SWAP_ENABLED = false

function normalizeLoadUrl(url) {
  const u = url.trim()
  return u.endsWith('/') ? u : `${u}/`
}

/** Main wallet window (for menu navigation). */
let mainWindow = null

function navigateWallet(hashPath) {
  const w =
    mainWindow && !mainWindow.isDestroyed() ? mainWindow : BrowserWindow.getFocusedWindow()
  if (!w || w.isDestroyed()) return
  const h = hashPath.startsWith('#') ? hashPath : `#${hashPath}`
  w.webContents
    .executeJavaScript(
      `if (window.location.hash !== ${JSON.stringify(h)}) { window.location.hash = ${JSON.stringify(h)}; }`
    )
    .catch(() => {})
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin'

  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    ...(isMac
      ? [
          {
            label: 'PHPCoin Wallet',
            submenu: [
              { role: 'about', label: 'About PHPCoin Wallet' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [{ role: isMac ? 'close' : 'quit', label: isMac ? 'Close Window' : 'Exit' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' }]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Wallet',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => navigateWallet('#/dashboard')
        },
        {
          label: 'Send',
          accelerator: 'CmdOrCtrl+2',
          click: () => navigateWallet('#/send')
        },
        {
          label: 'Receive',
          accelerator: 'CmdOrCtrl+3',
          click: () => navigateWallet('#/receive')
        },
        {
          label: 'Transactions',
          accelerator: 'CmdOrCtrl+4',
          click: () => navigateWallet('#/transactions')
        },
        { type: 'separator' },
        {
          label: 'Miner',
          accelerator: 'CmdOrCtrl+5',
          click: () => navigateWallet('#/miner')
        },
        {
          label: 'Masternodes',
          accelerator: 'CmdOrCtrl+6',
          click: () => navigateWallet('#/masternodes')
        },
        {
          label: 'Address book',
          accelerator: 'CmdOrCtrl+7',
          click: () => navigateWallet('#/address-book')
        },
        {
          label: 'Accounts',
          accelerator: 'CmdOrCtrl+8',
          click: () => navigateWallet('#/accounts')
        },
        ...(SWAP_ENABLED
          ? [
              { type: 'separator' },
              {
                label: 'Swap (testnet)',
                accelerator: 'CmdOrCtrl+9',
                click: () => navigateWallet('#/swap')
              }
            ]
          : [])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'PHPCoin website',
          click: () => shell.openExternal('https://phpcoin.net/')
        },
        {
          label: 'Web wallet',
          click: () => shell.openExternal('https://wallet.phpcoin.net/')
        },
        {
          label: 'Explorer',
          click: () => shell.openExternal('https://main1.phpcoin.net/apps/explorer/')
        },
        { type: 'separator' },
        {
          label: 'Node on GitHub',
          click: () => shell.openExternal('https://github.com/phpcoinn/node')
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

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

  mainWindow = win
  win.once('ready-to-show', () => win.show())
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  const hotReload = typeof devServerUrl === 'string' && devServerUrl.trim() !== ''

  if (hotReload) {
    const url = normalizeLoadUrl(devServerUrl)
    win.loadURL(url).catch((err) => {
      console.error('Failed to load dev server URL (PHPCOIN_DEV_SERVER_URL):', err)
    })
    if (process.env.PHPCOIN_ELECTRON_OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else if (useBundledWallet) {
    const indexHtml = app.isPackaged
      ? path.join(process.resourcesPath, 'dist', 'index.html')
      : path.join(__dirname, '..', '..', 'dist', 'index.html')
    win.loadFile(indexHtml).catch((err) => {
      console.error(
        'Failed to load wallet index.html. From the electron/ folder run: npm run build:wallet',
        err
      )
    })
  } else {
    const url = normalizeLoadUrl(remoteWalletUrl)
    win.loadURL(url).catch((err) => {
      console.error('Failed to load remote wallet URL:', url, err)
    })
    if (process.env.PHPCOIN_ELECTRON_OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
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
  app.setName('PHPCoin Wallet')
  createApplicationMenu()
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
