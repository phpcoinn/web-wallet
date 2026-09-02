# PHP Coin Web Wallet – Project Status

**Last updated:** 2026-06-10

**Release:** **`2.0.9`** — see `package.json` (also shown in the app footer via `APP_VERSION`).

**Status:** **Phase 1 complete** — web wallet + desktop shell + public download pipeline. **Phase 2** = Android (deferred). Task list: [`dev/tasks.txt`](../dev/tasks.txt).

---

## Overview

Vue 3 SPA for the PHP Coin wallet: login (password, private key, quick login), **signed autologin links** (`#/autologin`), dashboard, send/receive/**swap (testnet only)**, transactions, address book, **masternodes**, account management, **Tools** (sign message), **Connect** (dapp postMessage bridge), **Miner** (browser WASM PoW + stake mining), and **Verifier** integration (signed `loginrequest` opens the Verifier dapp without standard login). **PWA** enabled (service worker). Uses the Minia admin theme (Bootstrap) with Tailwind CSS v4 for utilities, customized for PHP Coin branding.

**Production:** https://wallet.phpcoin.net/

**Desktop:** Electron shell in **`electron/`** (v2, aligned **2.0.9**). **Remote-first** — packaged apps load the live web wallet by default; native Argon2 for classic mining via preload bridge. **CI:** [`.github/workflows/build-desktop.yml`](../.github/workflows/build-desktop.yml) — Windows + Linux x64 on **`v*`** tag → GitHub Release. **Downloads:** stable URLs on phpcoin.net (hourly sync from GitHub). See **[docs/DESKTOP.md](DESKTOP.md)**.

**Deploy:** Production builds target **mainnet** and **testnet** via `npm run build_dapps` and `npm run build_dapps_testnet` (see `.env.dapps` / `.env.dapps.testnet`). Mainnet + testnet dapps deployments smoke-tested on production.

---

## Tech Stack

| Layer        | Choice |
|-------------|--------|
| Framework   | Vue 3 (Composition API) |
| Build       | Vite 5 |
| Router      | Vue Router 4 (hash history) |
| State       | Pinia |
| UI base     | Minia (Bootstrap + MDI/FA via **`VITE_COMMON_ASSETS`**); Feather icons in sidebar |
| Utilities   | Tailwind CSS v4 (theme + utilities only; preflight off) |
| Crypto      | phpcoin-crypto (GitHub), idb (IndexedDB); wallet encryption in `src/utils/crypto.js` |
| Mining      | WASM Argon2 (browser); native Argon2 in Electron; stake mining via `mine.php` API |
| PWA         | `vite-plugin-pwa` — `registerSW` in `src/main.js` |
| Desktop     | Electron ~33, electron-builder; separate `electron/package.json` |

---

## Project Structure

```
src/
├── App.vue
├── main.js
├── components/           # AppLayout, AuthLayout, Address, ChangelogModal, PasswordConfirmModal, …
├── pages/
│   ├── Login.vue, QuickLogin.vue, Autologin.vue, RestoreAccount.vue
│   ├── Dashboard.vue, Send.vue, Swap.vue, Receive.vue
│   ├── TransactionHistory.vue, AddressBook.vue, Masternodes.vue, AccountManager.vue
│   ├── Miner.vue         # Classic PoW (WASM / native) + stake mining
│   ├── Tools.vue         # Sign message
│   ├── Connect.vue       # Dapp postMessage sign-in / sign-tx
│   └── Logout.vue        # Legacy dapps session cleanup
├── router/index.js
├── stores/               # auth, accounts, theme, stakeMiner
└── utils/                # api, wallet, crypto, db, autologin, verifierLogin, legacyWallet, …

electron/                 # Desktop shell (remote-first)
public/                   # wallet_api.php, PWA icons, index.html / index.php
docs/                     # PROJECT_STATUS, FEATURES, DESKTOP, LOGIN_ARCHITECTURE
dev/tasks.txt             # Phase tracking
```

- **`public/`** – `wallet_api.php`, PWA icons; optional **`public/assets/`** for same-origin images.
- **`theme/`** – Optional local Minia reference; **gitignored**.

---

## Authentication & Layout

- **Router:** Hash mode — e.g. `https://wallet.phpcoin.net/#/dashboard`.
- **Routes with `meta: { requiresAuth: true, layout: true }`** use `AppLayout` (sidebar: Dashboard, Send, Swap if testnet, Receive, Transactions, Address Book, Masternodes, Miner, Tools, Accounts).
- **Login / Quick-login** use `AuthLayout`.
- **Auth guard:** unauthenticated → `/login`; authenticated on `/login` or `/quick-login` → `/dashboard`.
- **Login modes:** See [docs/FEATURES.md](FEATURES.md). Password = multi-account (IndexedDB, encrypted keys). Private key / Quick login = session-only single account.
- **Autologin:** Signed `#/autologin?request=…` — verified identity only; Send/Swap/Masternodes/Accounts need full login.
- **Connect:** `Connect.vue` — postMessage bridge for dapps (sign-in, sign transaction).
- **Logout:** `Logout.vue` — clears legacy dapps session when embedded.
- **Planned (Phase 4 — dap.ad / IPFS):** In-wallet **IPFS upload + pay-to-pin** (backend: [PHPCoin IPFS](../../node/dev/dapad/ipfs-uploader/PROJECT_STATUS.md) at `upload.ipfs.phpcoin.net`), plus domain management — see [_master-docs/PROJECT-STATUS.md](../../_master-docs/PROJECT-STATUS.md) Phase 4. Standalone uploader UI remains; wallet becomes primary client.
- **API:** **`VITE_MAIN_URL`** → `{VITE_MAIN_URL}/api.php`. **`VITE_WALLET_API_URL`** → `wallet_api.php` (price, verify proxy). **`VITE_APP_BASE`** — Vite `base` for assets.

---

## Done (phase 1)

### Core wallet
- [x] Vue 3 + Vite + Pinia + hash router
- [x] Multi-account password wallet (IndexedDB, encrypted keys)
- [x] Quick login / private key session mode
- [x] Dashboard, Send, Receive, Transactions, Address Book, Masternodes, AccountManager
- [x] Swap (testnet only, `VITE_CHAIN_ID=01`)
- [x] Restore from backup; legacy multiwallet migration (`Login.vue`, `legacyWallet.js`)
- [x] Verifier integration — in-wallet verify + signed `loginrequest` to dapp
- [x] Autologin page (Telegram bot / deep links)
- [x] PWA (vite-plugin-pwa)
- [x] Dapps deploy — `build_dapps` / `build_dapps_testnet`; mainnet + testnet live

### 2.0.x features
- [x] **Miner page** (2.0.2) — browser WASM Argon2 PoW; Electron native Argon2 via preload
- [x] **Connect page** (2.0.4) — dapp postMessage sign-in / sign-tx
- [x] **Logout flow** (2.0.4) — legacy dapps session bridge cleanup
- [x] **Tools page** (2.0.7) — sign arbitrary message
- [x] **Stake mining** (2.0.8) — preview + mine on Miner page (`stores/stakeMiner.js`, `mine.php`)
- [x] Changelog modal fixes (2.0.9) — markdown rendering

### Desktop & distribution (2026-06)
- [x] Electron v2 shell — **remote-first** (`https://wallet.phpcoin.net/`)
- [x] Linux AppImage + deb; Windows NSIS + portable
- [x] GitHub Actions — tag `v*` → Release ([v2.0.9](https://github.com/phpcoinn/web-wallet/releases/tag/v2.0.9))
- [x] phpcoin.net stable download URLs (`/download/phpcoin-wallet-desktop-*`)
- [x] Hourly sync cron on phpcoin1 (`site/scripts/sync_web_wallet_desktop.sh`)
- [x] Site index — new desktop links default; legacy electron-wallet in Resources

---

## Phase 2 (deferred)

| Item | Notes |
|------|-------|
| **Android app** | Fresh project from web-wallet; not nativephp. See `dev/tasks.txt`. |
| **iOS** | After Android POC, if pursued |

---

## Optional / Future

- **mine_preview UX** — optional polish before stake mine (parity with telegrambot)
- **i18n** — English only; selector placeholder exists
- **Notifications** — blockchain messaging; dropdown placeholder
- **API optimization** — batch/cache Dashboard requests
- **Richer price / OHLC** — exchange candles for sparkline
- **Token management UI** — smart contracts track
- **Search** — currently opens explorer in new tab

---

## How to Run

```bash
npm install
npm run dev              # dev server (port 3000)
npm run dev_testnet      # dev with .env.testnet (CHAIN_ID 01)
npm run build            # production build
npm run build_dapps      # dapps mainnet (.env.dapps)
npm run build_dapps_testnet
npm run preview
```

### Desktop dev

```bash
npm run electron:dev     # or: cd electron && npm run dev
```

See **[docs/DESKTOP.md](DESKTOP.md)** for packaging, CI, and release checklist.

### Base path

**`VITE_APP_BASE`** must end with `/`. Repo defaults often use `/`; dapps deploy may use `/apps/wallet3/`. Router uses `import.meta.env.BASE_URL`.

### Production deploy

1. Set `VITE_APP_BASE` in env to match server path.
2. `npm run build` (or `build_dapps`) — `wallet_api.php` copied to `dist/`.
3. Deploy `dist/` to server; ensure `index.php` or `index.html` loads built assets.
4. Nginx examples: `dev/nginx-phpcoin-production.conf` (hash mode — no SPA rewrite).

---

## Related docs

| Doc | Purpose |
|-----|---------|
| [FEATURES.md](FEATURES.md) | Feature checklist (may lag; this file is source of truth for shipped behavior) |
| [LOGIN_ARCHITECTURE.md](LOGIN_ARCHITECTURE.md) | Login modes and autologin |
| [DESKTOP.md](DESKTOP.md) | Electron, CI, phpcoin.net downloads |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Web build + deploy runbook |
| [../CHANGELOG.md](../CHANGELOG.md) | Version history through 2.0.9 |
| [../electron/README.md](../electron/README.md) | Electron env vars and scripts |
| [../dev/tasks.txt](../dev/tasks.txt) | Phase 1/2 task list |

---

## Notes for maintainers

- **Tailwind:** Only theme + utilities in `src/assets/css/main.css` (no preflight).
- **Minia assets:** Loaded from **`VITE_COMMON_ASSETS`** when set.
- **Brand:** Logo `https://node1.phpcoin.net/apps/common/img/logo.png`; ticker **PHP**.
- **Desktop version:** Keep root `package.json` and `electron/package.json` in sync before tagging.

Update this file when completing todos or changing architecture.
