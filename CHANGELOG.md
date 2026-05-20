# Changelog

What’s new in the PHP Coin web wallet. Each line is one change, in everyday language.  
Version numbers match the app (see the footer).

## [Unreleased]

## [2.0.9] — 2026-05-20

- **What’s new** on the dashboard shows again after each changelog update until you dismiss it (no longer hidden just because you logged in on the release day).
- **New** badges on the **Miner** menu and **Stake mining** card (primary background, white text).

## [2.0.8] — 2026-05-20

- **Stake mining** on the **Miner** page: staking-backed lightweight mining with no CPU hashing. **Refresh preview** loads your potential payout, weight, balance and activity factors, pool reserve, and cooldown from the public mine API; **Mine (stake)** signs the fixed authorization message (`PHP Coin Mining Authorization v1`) and submits a payout for the active account (quick login or password confirm).
- After a successful stake mine, the wallet shows the earned amount and a link to the payout transaction on the explorer.
- **Miner** sidebar item and **Stake mining** card header include a **New** badge (theme primary, white text) so the feature stands out next to classic PoW mining.

## [2.0.4] — 2026-04-29

- **Version 2.0.4** for the web wallet and **`electron/`** (footer and desktop builds stay aligned).
- **Legacy dapps login bridge:** wallet can complete `sessionlogin` by posting the authenticated account to **`wallet_api.php`**, which returns a redirect URL with `auth_data` expected by dapp `top.php`.
- **Legacy session sync:** on account switch, wallet updates legacy localStorage key **`privateKey`** and syncs PHP session account via **`sessionSetAccount`**.
- **Logout flow:** new **`#/logout`** screen shows “Logging out…” while clearing wallet + PHP session; supports `?redirect=` and correctly treats **`/apps/...`** and **`/dapps.php?...`** as full-page redirects.
- **Local env hygiene:** `.env.dapps`, `.env.dapps.testnet`, and `.env.testnet` are now ignored in git.

## [2.0.3] — 2026-04-27

- **Version 2.0.3** for the web wallet and **`electron/`** (footer and desktop builds stay aligned).
- **Electron:** mining **keeps running** when you navigate away from the Miner page until Stop or account switch; **sidebar** shows mining on the Miner item and a **status strip** at the bottom when the menu is expanded (hidden in the **collapsed** rail; **green zap** when mining in icon-only mode).
- **Electron:** **native app menu** (File, Edit, View, Wallet, Help) with **keyboard shortcuts** to main wallet routes and links to PHPCoin, the web wallet, and the explorer.
- **Miner:** **WASM** in the browser and **native Argon2** in the desktop shell are **picked automatically**—the WASM / Native toggle is removed. **Layout:** mining node URL with Start/Stop; **CPU** and **threads** on one row with values beside the sliders; **aggregate speed** appears with the live mining block after you start.
- **Miner** + **Minia sidebar:** collapsed **hover** and **icon** behavior fixed so the Miner row matches other items (no layout that hid the icon on hover).

## [2.0.2] — 2026-04-26

- **Version 2.0.2** for the web wallet and the **`electron/`** shell so the footer and desktop builds stay in sync.
- **Miner** page: mine from the browser with a **Web Worker** and **hash-wasm**; on **Electron**, the app can use **native Argon2** via the preload bridge for faster hashing when available.
- **Electron** loads **`https://wallet.phpcoin.net/`** by default so desktop and web share one live deployment; set **`PHPCOIN_USE_BUNDLED_WALLET=1`** to use the packaged **`dist/`** copy, or **`PHPCOIN_WALLET_URL`** to point at another origin. **`npm run start:bundled`** and **`npm run preview`** (in `electron/`) use the bundled build for local checks.
- **Dashboard:** fewer node calls (**network difficulty** in one request; **transactions** use **limit** and **offset**); **startup** and **price sparkline** handling are more stable (including lighter data from **`wallet_api.php`** for the chart).
- **Connect** flow for **third-party apps**: sign-in and sign-transaction messages over **`postMessage`**, aligned with the connect protocol.
- **Testnet** wallet configuration and build modes for switching networks during development and testing.
- **Desktop CI** (`.github/workflows/build-desktop.yml`): builds run on **`v*`** version tags or **manual** dispatch; release job attaches **Windows + Linux** installers to the matching **GitHub Release**.
- Docs and comments: **PHP price** comes from the external **coinInfo** API via **`wallet_api.php`**; the chart uses the last **seven daily closes** from the server, not a synthetic interpolated series.

## [1.2.1] — 2026-04-22

- Documentation refresh: **PROJECT_STATUS**, **README**, **FEATURES** (legacy migration section) aligned with shipped behavior (dapps builds, env vars, Verifier, masternodes, testnet swap).
- Confirmed **mainnet and testnet** wallet builds tested and live on production nodes.
- **Desktop (Electron v2, `electron/`):** **electron-builder** for **Linux** (AppImage, deb) and **Windows** (NSIS, portable) via `dist:linux*`, `dist:win*`. **GitHub Actions** [`.github/workflows/build-desktop.yml`](.github/workflows/build-desktop.yml) on **`v*`** tags (or **workflow_dispatch**); **publish** job attaches **Windows + Linux** installers to a **GitHub Release**. **Dev:** Vite + Electron on **port 3000** (`npm run electron:dev`). See **electron/README.md**.

## [1.2.0] — 2026-03-28

- The “What’s new” notice on the dashboard shows when you’re coming back after an update you haven’t seen yet—not after every login.
- This changelog is written in simple language, with one short line per change.

## [1.1.0] — 2026-03-26

- Sign in from a secure link: enter the password you were given separately (never in the link), then use the wallet as usual.
- The wallet can remember you on this browser until you log out, so you don’t need the link every time.
- The autologin screen matches the other login pages, with a short note about keeping your password private.
- After that kind of sign-in, it works like Quick Login: one wallet at a time, without the multi-account screen.
- Your address and public key show correctly on the dashboard after signing in with a link.

## [1.0.0] — 2026-03-23

- First public version of the PHP Coin web wallet.
- Password login, quick login with your key, multiple accounts, send and receive, transactions, and a changelog in the footer.
