# PHP Coin Web Wallet – Project Status

**Last updated:** 2026-03-23

**Release:** **1.0.0** — initial published version (see `package.json` and `CHANGELOG.md`).

---

## Overview

Vue 3 SPA for the PHP Coin wallet: login (password, private key, quick login), dashboard, send/receive/swap (testnet), transactions, address book, masternodes, and account management. Uses the Minia admin theme (Bootstrap) with Tailwind CSS v4 for utilities, customized for PHP Coin branding.

---

## Tech Stack

| Layer        | Choice |
|-------------|--------|
| Framework   | Vue 3 (Composition API) |
| Build       | Vite 5 |
| Router      | Vue Router 4 |
| State       | Pinia |
| UI base     | Minia (Bootstrap + MDI/FA via **`VITE_COMMON_ASSETS`**); Feather icons in sidebar (JS from same host) |
| Utilities   | Tailwind CSS v4 (theme + utilities only; preflight off to avoid Bootstrap conflicts) |
| Crypto      | phpcoin-crypto (GitHub), idb (IndexedDB); wallet encryption in `src/utils/crypto.js` |

---

## Project Structure

```
src/
├── App.vue                 # Root: layout selection (AppLayout / AuthLayout) by route meta
├── main.js                 # Entry: Tailwind/main.css + theme-modern; Minia CSS from VITE_COMMON_ASSETS
├── components/
│   ├── AppLayout.vue       # Authenticated layout: header, sidebar, slot, footer, dynamic script load for theme JS
│   ├── AuthLayout.vue      # Login layout: logo, slot, footer, carousel
│   ├── Address.vue         # Truncated address + copy
│   ├── ChangelogModal.vue
│   └── PasswordConfirmModal.vue
├── pages/
│   ├── Login.vue
│   ├── QuickLogin.vue
│   ├── RestoreAccount.vue
│   ├── Dashboard.vue
│   ├── Send.vue
│   ├── Swap.vue            # testnet only (CHAIN_ID 01), route guard
│   ├── Receive.vue
│   ├── TransactionHistory.vue
│   ├── AddressBook.vue
│   ├── Masternodes.vue
│   └── AccountManager.vue
├── router/index.js         # Routes + auth guard; `/create-account` redirects to Login with setup intent
├── stores/                 # auth, accounts, theme
└── utils/                  # api, wallet, crypto, db, toast, etc.
```

- **`public/`** – `wallet_api.php`, PWA icons, `index.html` shell; optional **`public/assets/`** for flags/images if deployed without a separate static host.
- **`theme/`** – Optional local copy of Minia HTML reference; **gitignored** (not part of the build).

---

## Authentication & Layout

- **Router:** Hash mode (`createWebHashHistory`) so URLs are e.g. `http://phpcoin/apps/wallet3/#/dashboard`. No server `try_files` needed for SPA routes.
- **Routes with `meta: { requiresAuth: true, layout: true }`** use `AppLayout` (sidebar: Dashboard, Send, Swap if testnet, Receive, Transactions, Address Book, Masternodes, Accounts).
- **Login / Quick-login** use `AuthLayout` (no sidebar).
- **Auth guard:** unauthenticated users hitting protected routes → `/login`; authenticated users hitting `/login` or `/quick-login` → `/dashboard`.
- **Login modes:** See [docs/FEATURES.md](FEATURES.md). **Password** = multi-account wallet (accounts in IndexedDB, private keys encrypted with password, decrypt only when needed; optional "remember password"). **Private key** and **Quick login** = one-account wallet (session only; cannot be saved as permanent accounts; Quick login is for testing).
- **API:** **`VITE_MAIN_URL`** (e.g. `https://main1.phpcoin.net`) — node API is **`{VITE_MAIN_URL}/api.php`**, explorer links **`{VITE_MAIN_URL}/apps/explorer/`**. **`VITE_WALLET_API_URL`** is the full URL to **`wallet_api.php`** (getPrice, test). **`wallet_api.php`** lives in **`public/`** and is copied into `dist/` on build.

---

## Done

- [x] Initial project setup (Vue 3, Vite, Pinia, Vue Router).
- [x] Quick login with PHP Coin private key; create new account and store locally (session).
- [x] UI: Minia admin theme integrated (Bootstrap + icons + JS from theme).
- [x] Tailwind CSS v4 added without breaking Bootstrap (theme + utilities only, no preflight).
- [x] Layouts: `AppLayout` for authenticated pages, `AuthLayout` for login.
- [x] PHP Coin customization:
  - PHP Coin logo and name in header and auth page.
  - Sidebar: wallet-only menu (Dashboard, Send, Swap on testnet, Receive, Transactions, Address Book, Masternodes, Accounts) with `router-link` and active state.
  - Header: search (opens main node explorer with query); language selector (English only, “More languages coming soon”); theme toggle; apps dropdown (PHPCoin, Explorer, GitHub, KlingEx, Buy PHP Coin, Blog); notifications dropdown (empty); user dropdown with jdenticon avatar, bold full address, balance below (PHP ticker), account switcher (other accounts with jdenticon, address, name, balance); no settings icon or right bar.
  - Auth carousel: three slides with PHP Coin philosophy (decentralization, wallet, community).
  - Favicon, footer "PHP Coin Team", CSS variables for brand.
  - Ticker symbol **PHP** (not PHPC) used consistently in UI and docs.
- [x] Dashboard, Send, Receive, Transactions, Address Book, Masternodes, AccountManager, Swap (testnet) wired to layout and auth.
- [x] **Accounts feature** – Full account management: table layout (actions, address, name, balance, status); add account (with optional name/description); edit name/description; view (address, public key, private key reveal with password, export Wallet/JSON/PHP); import single account (wallet file); switch account; delete account (password confirm); delete all accounts (password + confirmation, then logout); export backup (JSON); refresh balances.
- [x] **Restore from backup** – RestoreAccount page: file picker + password; supports AccountManager backup format (`{ version, accounts }`) and Settings format (`{ accounts: encrypted }`).
- [x] **Header account switcher** – User dropdown lists other accounts with jdenticon, address (prominent), name (if exists), balance; click to switch.
- [x] **Toast** – Replaced with SweetAlert2 (success, error, warning, info).
- [x] **Session persistence** – Auth session in sessionStorage so user stays logged in on refresh.
- [x] **PasswordConfirmModal** – Reusable modal for password confirmation (add account, delete, export, delete all).
- [x] **Login + RestoreAccount** – First-time setup and add-account flows via Login; restore from backup when no accounts (`/restore-account`).
- [x] **Dashboard top row** – Four stat cards with Minia theme: (1) **Balance** – sparkline, counter (k/m format), “Since last week” change; (2) **Rewards** – type‑0 transactions only, sparkline, counter, “Since last week”; (3) **Network** – block height, difficulty chart (last 100 blocks), Synced/Offline status; (4) **PHP Price** – live price from KlingEx via `wallet_api.php`, sparkline, “Since last week” % change.
- [x] **Dashboard Account block** – QR code of address (replaces jdenticon); account name, description (if exists), balance (bold); address, public key, private key (hidden with reveal) with copy buttons; address verification via `getPublicKey` API – unverified shows warning alert + Verify button (PHPCoin Verifier); Trade (KlingEx) and Direct buy (buy.phpcoin.net) CTA buttons; Send/Receive links.
- [x] **Dashboard Transactions block** – Latest 5 transactions; loading/empty states; “View all” link to full history.
- [x] **API getPublicKey** – Added `api.getPublicKey(address)` for address verification on network ([PHPCoin Node API](https://main1.phpcoin.net/doc/#api-API-getPublicKey)).

---

## Todo (from dev/tasks.txt + inferred)

- [x] **Layout** – AppLayout is the single wrapper for all authenticated pages (no separate layout components).
- [x] **Accounts feature** – List, add, switch, naming, persistence, import/export, delete.
- [ ] **Migrate from older multiwallet** – Add option to migrate/import accounts from an older PHP Coin multiwallet (e.g. legacy backup format, different encryption, or previous wallet version).

**Step-by-step plan:** See [docs/FEATURES.md](FEATURES.md) for a breakdown of each feature into concrete steps.

---

## Optional / Future

- **Price history fetch** – Implement real price history for the PHP Price chart. Currently `wallet_api.php` fetches live price from KlingEx coinInfo but the 7-day series is interpolated from `priceChange24h`. Need to fetch actual historical prices (e.g. from exchange API) for accurate chart data.
- **Optimize API calls** – Reduce redundant or parallel API requests (e.g. Dashboard loads balance, transactions, node info, price, network difficulty separately; consider batching, caching, or consolidating where possible).
- **Optimize app assets** – Theme CSS/JS/fonts are primarily loaded from **`VITE_COMMON_ASSETS`**; optional `public/assets/` for same-origin images/libs should stay consistent with deploy base. Future: consolidate paths and cache policy.
- **Search** – Currently opens main node explorer in new tab with query; in-app search can be added later.
- **Notifications** – Implement blockchain messaging; dropdown shows “No notifications right now”.
- **i18n** – Implement app internationalization; language selector currently has only English enabled (others disabled with “More languages with i18n (todo)”).
- PHP Coin favicon asset (currently using theme favicon).

---

## How to Run

```bash
npm install
npm run dev    # dev server
npm run build # production build
npm run preview # preview production build
```

### Base path (configurable)

The app base path is set by **`VITE_APP_BASE`** (must end with `/`; a leading `/` is normal):

- **Repository defaults** – `.env.development` / `.env.production` in this repo often use **`VITE_APP_BASE=/`** so the dev server is at **http://localhost:3000/** with assets at `/assets/...`.
- **Subpath deploy** – For **`/apps/wallet3/`** (or similar), set `VITE_APP_BASE=/apps/wallet3/` in env. If **`VITE_APP_BASE` is omitted**, `vite.config.js` falls back to **`/apps/wallet3/`**.

The router uses `import.meta.env.BASE_URL`, which Vite sets from `base`.

### Local dev on custom domain (e.g. http://phpcoin/apps/wallet3)

1. **Hosts** – Point the name to localhost (as root or with sudo):
   ```bash
   echo '127.0.0.1 phpcoin' | sudo tee -a /etc/hosts
   ```
2. **Dev server** – Vite `base` comes from `VITE_APP_BASE` (see above). **`host: true`** allows LAN access. APIs use **`VITE_MAIN_URL`** and **`VITE_WALLET_API_URL`** in the browser (no Vite proxy to the node).
3. **Open** – Run `npm run dev` and open **http://phpcoin:3000/apps/wallet3/** (or, if you use a reverse proxy or port 80, **http://phpcoin/apps/wallet3/**).

**Nginx proxy to dev:** To serve the dev app at **http://phpcoin/apps/wallet3/** (port 80), use the example in **`dev/nginx-phpcoin.conf`**. Symlink it into `sites-enabled` and reload nginx, e.g.:
   ```bash
   sudo ln -s /path/to/web-wallet/dev/nginx-phpcoin.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
   Then run `npm run dev` and open **http://phpcoin/apps/wallet3/**.

### Production: serve app + wallet_api.php from /apps/wallet3

1. **Base path** – Set `VITE_APP_BASE` in `.env.production` to match the URL path where you host `dist/` (e.g. `/` or `/apps/wallet3/`).

2. **Build and deploy** – `wallet_api.php` is in **`public/`**, so it is included in `dist/` when you run `npm run build`. Copy the contents of `dist/` to your server path, e.g.:
   ```bash
   npm run build
   # then e.g.:
   TARGET=/var/www/phpcoin/apps/wallet3
   sudo mkdir -p $TARGET
   sudo cp -r dist/* $TARGET/
   ```

3. **Nginx** – Use **`dev/nginx-phpcoin-production.conf`**: set `root` to the parent of `apps/` (e.g. `/var/www/phpcoin`), run `/apps/wallet3/wallet_api.php` via PHP-FPM. Because the app uses **hash mode**, no `try_files` is required for client routes. Switch between dev config (proxy to Vite) and production config (serve static + wallet_api.php) as needed.

4. **Main API** – Set **`VITE_MAIN_URL`**; the app calls **`{VITE_MAIN_URL}/api.php`** for getBalance, getTransactions, send, etc.

---

## Notes for Future Tracking

- **Tailwind:** Only `@import "tailwindcss/theme"` and `@import "tailwindcss/utilities"` in `src/assets/css/main.css` to avoid preflight vs Bootstrap conflicts.
- **Minia JS/CSS:** Theme links/scripts are loaded from **`VITE_COMMON_ASSETS`** when set (full `https://` URL). Optional fallbacks under `public/assets/` apply only if you ship those files on the same origin.
- **Active account:** Set by login flows in `Login.vue`; header user menu in `AppLayout` shows jdenticon avatar, bold full address, balance (PHP) from `api.getBalance`, and dropdown to switch to other accounts (with jdenticon, address, name, balance per account); `authStore.activeAccount` drives avatar and balance refresh.
- **Dashboard:** (1) Top row: Balance, Rewards, Network, PHP Price cards. (2) Account block: QR code, name, description, balance, address/public/private keys with copy, verification check (getPublicKey API), Trade/Direct buy buttons, Send/Receive. (3) Transactions block: latest 5 tx, View all. Price from `public/wallet_api.php?q=getPrice`. Network difficulty from `getBlock`. Rewards from type‑0 transactions. Address verification via `api.getPublicKey`.
- **Brand:** Logo URL `https://node1.phpcoin.net/apps/common/img/logo.png`; primary color variables in `main.css` (`--phpcoin-primary`, `--phpcoin-primary-dark`).
- **Dev vs prod:** Nginx can switch between `dev/nginx-phpcoin.conf` (proxy to Vite + optional `/assets/`) and `dev/nginx-phpcoin-production.conf` (serve built app + wallet_api.php from disk). Hash mode allows prod to work without SPA fallback rules.

Update this file when completing todos or changing architecture.
