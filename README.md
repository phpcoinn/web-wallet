# PHP Coin Web Wallet

A Vue 3 SPA web wallet for managing PHP Coin accounts.

**Current version: `2.0.9`** (see `package.json`; shown in the app footer as `APP_VERSION`). For a full shipped-feature list, see **[docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)**. Deploy: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** · Desktop: **[docs/DESKTOP.md](docs/DESKTOP.md)**.

## Features

- Multi-account support with encrypted storage
- Password and quick login options
- Send/receive PHP
- Transaction history
- Wallet import/export
- Dark theme with PHP Coin branding
- **Telegram bot autologin** — signed `/autologin?request=…` links (see below)
- Masternodes (create / remove), **Swap** on testnet (`VITE_CHAIN_ID=01`)
- **PHPCoin Verifier** — verify in-wallet (AJAX + modal) or open the dapp with signed `loginrequest` from the Dashboard / Miner
- PWA (offline precache / install)
- **Miner** — browser WASM PoW; native Argon2 in Electron; **stake mining** (preview + mine via `mine.php`)
- **Tools** — sign arbitrary messages
- **Connect** — dapp postMessage sign-in / sign-transaction bridge
- **Desktop (Electron):** thin shell in **`electron/`** — loads **https://wallet.phpcoin.net/** by default (remote-first); Linux (**AppImage**, **deb**) and Windows (**NSIS**, **portable**). Local dev: `npm run electron:dev`. **CI:** [`.github/workflows/build-desktop.yml`](.github/workflows/build-desktop.yml) — `v*` tags → GitHub Release. **Downloads:** [phpcoin.net/desktop links](docs/DESKTOP.md#public-downloads-phpcoinnet). See [docs/DESKTOP.md](docs/DESKTOP.md) and [electron/README.md](electron/README.md).

## Telegram bot autologin

Remote sign-in uses a **signed** URL. The `request` query is `encodeURIComponent(Base64(JSON))` where JSON contains `payload` (`nonce`, `time`), `public_key`, and `signature`. The signed message is **`JSON.stringify(payload)`** exactly (PHP Coin ECDSA; **no** `CHAIN_ID` prefix, unlike on-chain signing).

With **hash routing**, open:

`{wallet-origin}{base}#/autologin?request={ENCODED}`

Example: `https://wallet.phpcoin.net/#/autologin?request=…`

The wallet checks signature, time window (±5 minutes), and **replay** (nonce + public key stored in `localStorage`). The resulting session is **verified identity only** — no private key. Users can view balance, receive, and browse history; **Send**, **Swap**, **Masternodes**, and **Accounts** require **Quick login** or password login.

## Setup

**`.env.development`** and **`.env.production`** are included in the repo with sensible defaults so you can run the app locally right after clone (`npm install` → `npm run dev` or `npm run build`). They are not secret (public API URLs). Change them if you point at your own node, explorer, or `wallet_api.php`.

1. Install dependencies:
```bash
npm install
```

2. Configure environment in **`.env.development`** and **`.env.production`** (same keys in both for a typical setup):

```
VITE_APP_BASE=/
VITE_COMMON_ASSETS=https://main1.phpcoin.net/apps/common
VITE_MAIN_URL=https://main1.phpcoin.net
VITE_WALLET_API_URL=https://wallet.phpcoin.net/wallet_api.php
VITE_CHAIN_ID=00
# Optional web-only advertising (keep actual values out of Git)
VITE_ADSENSE_CLIENT=ca-pub-...
VITE_ADSENSE_SLOT=...
```

- **`VITE_APP_BASE`** — Must end with `/`. Build output and asset URLs use this (e.g. `/` for site root or `/apps/wallet3/` for a subpath). Vite default in `vite.config.js` is `/apps/wallet3/` if unset.
- **`VITE_COMMON_ASSETS`** — Full `https://…` URL to the shared Minia theme (CSS/JS/fonts). **Required** for the Bootstrap/Minia shell (see [Asset optimization](#asset-optimization)).
- **`VITE_MAIN_URL`** — Main host (no trailing slash). Node API: **`{VITE_MAIN_URL}/api.php`**; explorer: **`{VITE_MAIN_URL}/apps/explorer/`**.
- **`VITE_WALLET_API_URL`** — URL to **`wallet_api.php`** (used for price and health checks). Use a full `https://…` URL, or a same-origin path such as `/dapps.php?url=…/wallet_api.php` for dapps deploys.
- **`VITE_CHAIN_ID`** — Network id for signing (default **`00`** mainnet). Use **`01`** for testnet-only features such as Swap. Testnet bundles (e.g. `npm run build_dapps_testnet`) set this via `.env.dapps.testnet` so the **Swap** menu appears in the sidebar.
- **`VITE_VERIFIER_ADDRESS`** — Payout address for in-wallet address verification (must match the verifier dapp’s `config.php` on that network). **`wallet_api.php`** proxies `q=verify` and uses **`WALLET_VERIFIER_PAYOUT_ADDRESS`** (or env **`WALLET_VERIFIER_PAYOUT_ADDRESS`**) for the send-back authorize response — keep PHP and Vite values aligned when you deploy.
- **`VITE_ADSENSE_CLIENT` / `VITE_ADSENSE_SLOT`** — Optional web-only AdSense configuration. Ads remain disabled unless both values are valid, and are never loaded in Electron. Store real values only in ignored deployment env files or CI secrets.

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

5. Dapps builds (separate env files: **`.env.dapps`**, **`.env.dapps.testnet`**):
```bash
npm run build_dapps
npm run build_dapps_testnet
```

## Asset optimization

When the wallet should load shared theme CSS, JS, and fonts from a host that serves `/apps/common`, set a **full URL** in both `.env.development` and `.env.production`:

```
VITE_COMMON_ASSETS=https://main1.phpcoin.net/apps/common
```

The browser loads these URLs directly (no Vite proxy). **Required** for Minia theme CSS (bootstrap, icons, app, etc.); set it in both env files for dev and production builds.

- **Wallet-specific:** Images remain in the wallet build. Chart logic is bundled in Dashboard.vue.

## Project Structure

```
src/
  ├── pages/          # Route pages
  ├── components/     # Reusable components
  ├── stores/         # Pinia stores
  ├── utils/          # Utilities (crypto, API, DB)
  ├── router/         # Vue Router config
  └── assets/         # CSS and static assets
```

## Tech Stack

- Vue 3 (Composition API), Vite, Pinia, Vue Router (hash history)
- **UI:** Minia/Bootstrap shell loaded via **`VITE_COMMON_ASSETS`**; Tailwind CSS 4 for utilities/overrides (`src/assets/css/main.css`)
- SweetAlert2 (toasts), Lucide Vue (icons where used), ApexCharts (dashboard charts), html5-qrcode, jdenticon, marked + DOMPurify (changelog)
- IndexedDB via **idb**; **phpcoin-crypto** for keys/signing; PWA (vite-plugin-pwa)
