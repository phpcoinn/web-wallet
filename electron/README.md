# PHP Coin Wallet — Electron v2

**Separate npm project** from the Vue wallet. The legacy v1 Electron wallet stays its own repo for compatibility.

**Default (packaged):** loads **`https://wallet.phpcoin.net/`** — remote-first; web updates ship without reinstalling. Override with **`PHPCOIN_WALLET_URL`**, or **`PHPCOIN_USE_BUNDLED_WALLET=1`** for packaged `../dist/`. **Dev:** **`PHPCOIN_DEV_SERVER_URL`** (Vite HMR). Full release + download docs: **[../docs/DESKTOP.md](../docs/DESKTOP.md)**.

## Setup

```bash
cd electron
npm install
```

Install the wallet once from the repo root: `npm install`.

## Development — Vite + Electron together

From **`electron/`**:

```bash
npm run dev
```

This starts **`npm run dev`** in the parent repo (Vite default **port 3000** in `vite.config.js`) and waits until it responds, then launches Electron with **`PHPCOIN_DEV_SERVER_URL=http://127.0.0.1:3000/`** so you get **hot reload** while developing.

From the **repository root** (shortcut):

```bash
npm run electron:dev
```

Optional: open Chromium DevTools automatically:

```bash
PHPCOIN_ELECTRON_OPEN_DEVTOOLS=1 npm run dev
```

(run from `electron/`, or prefix the same env when using `npm run electron:dev` from root).

### Manual two-terminal workflow

Terminal 1 (repo root): `npm run dev`  
Terminal 2 (`electron/`): `PHPCOIN_DEV_SERVER_URL=http://127.0.0.1:3000/ npm start`

## Production-like — static `dist/`

From **`electron/`**:

```bash
npm run preview
```

This runs **`build:wallet`** (`VITE_APP_BASE=./` + `vite build` in `..`) then **`start`** (Electron loads `../dist/index.html`).

Or step by step:

```bash
npm run build:wallet
npm start
```

## `window.phpcoinElectron`

See `src/preload.js`. The **Mining speed** page can run a **Native (Node)** Argon2 benchmark via **`worker_threads`**. The **`argon2`** addon is rebuilt for Electron’s Node ABI on **`npm install`** (`postinstall`). If it fails to load, run **`npm run rebuild:native`** in this folder.

## Packaging (electron-builder)

From **`electron/`** after `npm install`:

| Command | Output (under `electron/release/`) |
|---------|-------------------------------------|
| `npm run dist:linux` / `dist:linux:x64` | **AppImage** + **deb** (Linux `x64`) |
| `npm run dist:win` / `dist:win:x64` | **NSIS** installer + **portable** `.exe` (Windows `x64`) |
| `npm run pack` | Unpacked directory only (`--dir`) |

Scripts run **`build:wallet`** first (`VITE_APP_BASE=./` + Vite build in `..`), then **electron-builder**. Bundled UI lives in `extraResources` as `../dist` → `dist` inside the app. **App id:** `net.phpcoin.wallet`, product name **PHPCoin Wallet** (`electron/package.json` `build` block).

**Native Argon2:** `argon2` is rebuilt for Electron on `postinstall` (`electron-rebuild`). If mining benchmark fails, run `npm run rebuild:native` in `electron/`.

## CI: GitHub Actions

[`.github/workflows/build-desktop.yml`](../.github/workflows/build-desktop.yml) — **Windows x64** and **Linux x64** desktop builds, triggered by:

- **Git tag** `v*` (e.g. `v2.0.3`), or  
- **Manual** run (`workflow_dispatch`).

Jobs upload artifacts (`*.exe`, `*.yml` for Windows; `*.AppImage`, `*.deb`, `*.yml` for Linux). If the ref is a **`v*`** tag, **publish-release** uses **softprops/action-gh-release** to attach all artifacts to a **GitHub Release** (with generated release notes).

**Requirements:** `contents: write` for releases; for forks, ensure Actions permissions allow releases or use artifacts only.
