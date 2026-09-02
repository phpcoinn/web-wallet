# Desktop wallet (Electron)

**Version:** aligned with web wallet (`2.0.9` as of 2026-06-10)
**Repo:** `electron/` (separate `package.json`)

---

## Architecture (important)

Packaged desktop apps are a **thin native shell** around the **live web wallet**:

| Mode | What loads |
|------|------------|
| **Default (production)** | `https://wallet.phpcoin.net/` |
| **Bundled** | `PHPCOIN_USE_BUNDLED_WALLET=1` → `dist/index.html` in app resources |
| **Dev** | `PHPCOIN_DEV_SERVER_URL` → local Vite (HMR) |

**Decision (2026-06):** keep **remote-first**. Ship wallet features on the web; desktop users get updates without reinstalling. The installer adds:

- Native window + application menu (shortcuts)
- **Native Argon2** for classic PoW mining (`window.phpcoinElectron` preload bridge)
- Installable shortcut on Linux/Windows

CI still builds and bundles `dist/` into installers (`extraResources`), but the default runtime URL is the live site.

---

## Build & release (developers)

### Local dev (Vite + Electron)

```bash
npm install          # repo root
cd electron && npm install
npm run dev          # from electron/ — starts Vite + Electron
# or from root:
npm run electron:dev
```

### Production-like (bundled dist)

```bash
cd electron
npm run preview      # build:wallet + start:bundled
```

### Package installers

```bash
cd electron
npm run dist:linux:x64   # AppImage + deb → electron/release/
npm run dist:win:x64     # NSIS installer + portable .exe
```

### GitHub Actions CI

Workflow: [`.github/workflows/build-desktop.yml`](../.github/workflows/build-desktop.yml)

| Trigger | Result |
|---------|--------|
| Push tag `v*` | Build Windows + Linux, publish **GitHub Release** with artifacts |
| `workflow_dispatch` | Build only (artifacts in Actions; no release unless tag) |

**Release example:** [v2.0.9](https://github.com/phpcoinn/web-wallet/releases/tag/v2.0.9)

Artifacts:

- `PHPCoin.Wallet-{version}.AppImage`
- `phpcoin-wallet-electron_{version}_amd64.deb`
- `PHPCoin.Wallet.Setup.{version}.exe` (installer)
- `PHPCoin.Wallet.{version}.exe` (portable)

**Version alignment:** bump `package.json` (root) and `electron/package.json` together before tagging.

```bash
git tag v2.0.9
git push origin v2.0.9
```

---

## Public downloads (phpcoin.net)

Official site mirrors the latest GitHub release automatically.

| Platform | Stable URL |
|----------|------------|
| Linux AppImage | https://phpcoin.net/download/phpcoin-wallet-desktop-linux |
| Linux .deb | https://phpcoin.net/download/phpcoin-wallet-desktop.deb |
| Windows installer | https://phpcoin.net/download/phpcoin-wallet-desktop-win.exe |
| Windows portable | https://phpcoin.net/download/phpcoin-wallet-desktop-portable.exe |

**Legacy GUI** (frozen electron-wallet builds) remains under Resources on the site:

- `/download/phpcoin-wallet-linux`
- `/download/phpcoin-wallet-win.exe`

### Site sync (server)

On **phpcoin1**:

- Script: `/var/www/site/scripts/sync_web_wallet_desktop.sh`
- Cron: `35 * * * *` (hourly)
- Log: `/var/log/web-wallet-desktop-sync.log`
- Versioned files: `/var/www/site/download/web-wallet-desktop/`
- State: `/var/www/site/download/.web-wallet-release-tag`

The script uses GitHub API `releases/latest` for `phpcoinn/web-wallet`, downloads assets, updates symlinks. Hourly `rsync` to `cn` mirrors the site tree.

Source copy in monorepo: `site/scripts/sync_web_wallet_desktop.sh`

---

## Environment variables (Electron)

| Variable | Purpose |
|----------|---------|
| `PHPCOIN_DEV_SERVER_URL` | Vite dev URL (e.g. `http://127.0.0.1:3000/`) |
| `PHPCOIN_WALLET_URL` | Override remote wallet URL (default `https://wallet.phpcoin.net/`) |
| `PHPCOIN_USE_BUNDLED_WALLET=1` | Load packaged `dist/` instead of remote |
| `PHPCOIN_ELECTRON_OPEN_DEVTOOLS=1` | Open DevTools on start |

See [electron/README.md](../electron/README.md) for more detail.
