# PHP Coin Wallet — Context for Cursor

**Release:** **1.0.0** (initial published version; `package.json` → `APP_VERSION` in the footer).

## 1. Project Overview
- **Type:** Vue 3 SPA web wallet
- **Language:** JavaScript (no TypeScript)
- **Backend:** PHP node API + optional `wallet_api.php` (price, etc.); client focuses on signing and UX
- **Styling:** Minia/Bootstrap shell from **`VITE_COMMON_ASSETS`** + Tailwind CSS 4 utilities/overrides in `src/assets/css/main.css` and `theme-modern.css`
- **Icons:** Feather (sidebar/header, via `data-feather` + `feather.replace()` after scripts load); Lucide Vue where imported (e.g. empty states)
- **Theme:** Light/dark toggle via existing Minia/theme store (`stores/theme.js`)

**Purpose:**
- Manage multiple PHP Coin accounts locally
- Send / receive / view history
- Secure storage with password or quick (single-key) login

---

## 2. MVP Features

### Account Management
- Multi-account: add, switch, rename, delete (password login; IndexedDB)
- Quick login: single private key, session-only (no Accounts page)

### Login
- Password, private key, and quick-login flows in **`Login.vue`** / **`QuickLogin.vue`**

### Wallet Operations
- Send, receive, transactions, address book, masternodes, swap (testnet / `CHAIN_ID` `01`)

### UI
- **`AppLayout.vue`** — sidebar, header, footer, loads theme scripts from **`VITE_COMMON_ASSETS`**
- **`AuthLayout.vue`** — login/register visuals
- Toasts: **SweetAlert2** (`utils/toast.js`)

---

## 3. Pages (see `src/router/index.js`)

| Page | Notes |
|------|--------|
| Login.vue | Password / private key / quick login tabs |
| QuickLogin.vue | Standalone quick login |
| RestoreAccount.vue | Restore from backup file |
| Dashboard.vue | Balance, charts, account block |
| Send.vue, Receive.vue | Transfer and QR |
| Swap.vue | Testnet-only route (`meta.testnetOnly`) |
| TransactionHistory.vue | Table + pagination |
| AddressBook.vue | Saved addresses |
| Masternodes.vue | MN UI |
| AccountManager.vue | Accounts (hidden for quick login) |

There is **no** separate `Settings.vue` or `CreateAccount.vue` page; account creation and settings live in **Login** / **AccountManager** flows.

---

## 4. Security / Encryption
- See **`src/utils/crypto.js`**, **`src/stores/auth.js`**, **`src/utils/wallet.js`**
- **`CHAIN_ID`** from **`VITE_CHAIN_ID`** (default `00`) prefixes signed messages in **`src/utils/wallet.js`**

---

## 5. Libraries (see `package.json`)

- **Vue 3**, **Vue Router**, **Pinia**, **Vite**
- **phpcoin-crypto** — keys, signing
- **idb** — IndexedDB
- **lucide-vue-next**, **sweetalert2**, **apexcharts**, **html5-qrcode**, **qrcode**, **jdenticon**, **marked**, **dompurify**
- **vite-plugin-pwa** — service worker / manifest

---

## 6. API / env

- **`VITE_MAIN_URL`** — `{VITE_MAIN_URL}/api.php` for node calls; explorer under `{VITE_MAIN_URL}/apps/explorer/`
- **`VITE_WALLET_API_URL`** — full URL to **`wallet_api.php`**
- **`VITE_APP_BASE`**, **`VITE_COMMON_ASSETS`** — see **README.md**
