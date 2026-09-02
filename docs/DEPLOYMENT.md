# Web wallet deployment runbook

**Production URL:** https://wallet.phpcoin.net/
**Version:** see `package.json` (footer `APP_VERSION`)

---

## Build modes

| Command | Env file | Use case |
|---------|----------|----------|
| `npm run build` | `.env.production` | Standalone site (wallet.phpcoin.net) |
| `npm run build_dapps` | `.env.dapps` | Mainnet dapps node (`CHAIN_ID=00`) |
| `npm run build_dapps_testnet` | `.env.dapps.testnet` | Testnet dapps (`CHAIN_ID=01`, Swap enabled) |

Output: `dist/` — static assets + `wallet_api.php` + PWA manifest/icons.

---

## Required environment (build-time)

Set in the matching `.env.*` before build:

| Variable | Example | Notes |
|----------|---------|-------|
| `VITE_APP_BASE` | `/` or `/apps/wallet3/` | Must end with `/` |
| `VITE_MAIN_URL` | `https://main1.phpcoin.net` | Node API + explorer base |
| `VITE_WALLET_API_URL` | `https://wallet.phpcoin.net/wallet_api.php` | Price, verify proxy |
| `VITE_COMMON_ASSETS` | `https://main1.phpcoin.net/apps/common` | Minia theme (full URL) |
| `VITE_CHAIN_ID` | `00` / `01` | `01` enables Swap |
| `VITE_VERIFIER_ADDRESS` | (network payout) | Align with verifier dapp `config.php` |
| `VITE_ADSENSE_CLIENT` | `ca-pub-…` | Optional web-only AdSense publisher ID |
| `VITE_ADSENSE_SLOT` | numeric slot ID | Optional sidebar ad slot; requires `VITE_ADSENSE_CLIENT` |

AdSense is disabled when either optional variable is absent or invalid, and it is always disabled in Electron. Keep deployment-specific values in ignored environment files or CI secrets rather than tracked source files.

**Server-side (`wallet_api.php`):** `WALLET_VERIFIER_PAYOUT_ADDRESS` (or env) must match `VITE_VERIFIER_ADDRESS`.

---

## Deploy steps (typical)

```bash
cd web-wallet
npm ci
npm run build          # or build_dapps / build_dapps_testnet
```

Copy `dist/*` to the server path, e.g.:

```bash
TARGET=/var/www/wallet.phpcoin.net
rsync -av --delete dist/ user@host:$TARGET/
```

Ensure PHP can execute `wallet_api.php` (price snapshots, verify proxy).

**Hash router:** no SPA `try_files` fallback needed — routes are `#/dashboard`, etc.

---

## Dapps node deploy

For wallet hosted under dapps PHP wrapper:

1. `npm run build_dapps` (or testnet variant).
2. Deploy to dapp path on node (e.g. `dapps/.../wallet3/`).
3. Entry: `index.php` or host-specific loader pointing at built `assets/`.
4. Set `VITE_WALLET_API_URL` to same-origin path if `wallet_api.php` is proxied via `dapps.php`.

---

## Verify after deploy

- [ ] Login (password + quick login)
- [ ] Dashboard loads balance, price, network card
- [ ] Send/receive smoke test (testnet if possible)
- [ ] `wallet_api.php?q=getPrice` returns JSON
- [ ] PWA manifest loads (`manifest.webmanifest`)
- [ ] Footer shows expected `APP_VERSION`
- [ ] Miner page — stake preview (mainnet mine API)
- [ ] Changelog modal appears once per version

---

## Desktop (separate track)

Desktop installers are **not** deployed with the web `dist/` sync. They ship via:

1. Git tag `v*` → GitHub Actions → Release artifacts
2. phpcoin.net hourly sync from GitHub

See **[DESKTOP.md](DESKTOP.md)**.

---

## Rollback

Keep previous `dist/` tarball or git tag. Redeploy prior build output to `TARGET`. Desktop users on remote-first builds pick up web rollback on next app launch without reinstalling.
