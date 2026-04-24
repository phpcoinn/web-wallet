# PHP Coin Wallet — Electron v2

**Separate npm project** from the Vue wallet: it loads either the **Vite dev server** (when `PHPCOIN_DEV_SERVER_URL` is set) or the **built** SPA under `../dist/`. The legacy v1 Electron wallet stays its own repo for compatibility.

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

This starts **`npm run dev`** in the parent repo (Vite on **port 3000**) and waits until it responds, then launches Electron with **`PHPCOIN_DEV_SERVER_URL=http://127.0.0.1:3000/`** so you get **hot reload** while developing.

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

## Packaging

Installers not configured — add `electron-builder` when needed.
