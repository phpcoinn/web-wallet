# PHP Coin Web Wallet

A Vue 3 SPA web wallet for managing PHP Coin accounts.

**Initial release: `1.0.0`**, as defined in `package.json` (shown in the app footer as `APP_VERSION`).

## Features

- Multi-account support with encrypted storage
- Password and quick login options
- Send/receive PHP
- Transaction history
- Wallet import/export
- Dark theme with PHP Coin branding

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
```

- **`VITE_APP_BASE`** — Must end with `/`. Build output and asset URLs use this (e.g. `/` for site root or `/apps/wallet3/` for a subpath). Vite default in `vite.config.js` is `/apps/wallet3/` if unset.
- **`VITE_COMMON_ASSETS`** — Full `https://…` URL to the shared Minia theme (CSS/JS/fonts). **Required** for the Bootstrap/Minia shell (see [Asset optimization](#asset-optimization)).
- **`VITE_MAIN_URL`** — Main host (no trailing slash). Node API: **`{VITE_MAIN_URL}/api.php`**; explorer: **`{VITE_MAIN_URL}/apps/explorer/`**.
- **`VITE_WALLET_API_URL`** — Full URL to **`wallet_api.php`** (bundled from `public/` into `dist/`; used for price and health checks).
- **`VITE_CHAIN_ID`** — Network id for signing (default **`00`** mainnet). Use **`01`** for testnet-only features such as Swap.

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
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

