import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

/** What Vite uses internally for `base` when the env value has a ?query (pathname only + trailing slash). */
function viteStrippedBase(userBase) {
  const raw = userBase.startsWith('/') ? userBase : `/${userBase}`
  const pathname = new URL(raw, 'http://vite.dev').pathname
  return pathname.endsWith('/') ? pathname : `${pathname}/`
}

/** After build, Vite leaves asset URLs under stripped base; rewrite to full base (query + path). */
function rewriteDistBaseAfterBuild(fullBase, strippedBase) {
  return {
    name: 'rewrite-dist-base-query',
    closeBundle() {
      if (fullBase === strippedBase) return
      const outDir = path.resolve(process.cwd(), 'dist')
      if (!fs.existsSync(outDir)) return
      const walk = (dir) => {
        const names = fs.readdirSync(dir, { withFileTypes: true })
        const files = []
        for (const n of names) {
          const p = path.join(dir, n.name)
          if (n.isDirectory()) files.push(...walk(p))
          else files.push(p)
        }
        return files
      }
      const exts = /\.(html|js|mjs|css|json|webmanifest|map)$/i
      for (const file of walk(outDir)) {
        if (!exts.test(file)) continue
        let s = fs.readFileSync(file, 'utf8')
        if (!s.includes(strippedBase)) continue
        fs.writeFileSync(file, s.split(strippedBase).join(fullBase), 'utf8')
      }
      // index.html: root-relative public assets (href="pwa-….png") resolve to http://host/… when the
      // document is dapps.php?url=… — prefix with full app base so icons match the app URL.
      const indexPath = path.join(outDir, 'index.html')
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8')
        const relPatches = [
          ['href="manifest.webmanifest"', `href="${fullBase}manifest.webmanifest"`],
          ['href="pwa-192x192.png"', `href="${fullBase}pwa-192x192.png"`],
          ['href="pwa-512x512.png"', `href="${fullBase}pwa-512x512.png"`],
          ['href="pwa-maskable-512x512.png"', `href="${fullBase}pwa-maskable-512x512.png"`]
        ]
        for (const [from, to] of relPatches) {
          if (html.includes(from)) html = html.split(from).join(to)
        }
        fs.writeFileSync(indexPath, html)
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Base URL for app and assets (same place). Bundled script/link tags use this.
  const rawBase = env.VITE_APP_BASE ?? '/apps/wallet3/'
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`
  const strippedBase = viteStrippedBase(base)
  const baseNorm = base

  // In dev, serve public/assets under base path (e.g. /apps/wallet3/assets/ → public/assets/)
  const servePublicUnderBase = () => ({
    name: 'serve-public-under-base',
    configureServer(server) {
      const publicDir = path.resolve(server.config.root, 'public')
      const rewrite = (req, res, next) => {
        const url = req.url?.split('?')[0] || ''
        if (!url.startsWith(baseNorm + 'assets/')) {
          return next()
        }
        const assetPath = url.slice(baseNorm.length)
        const filePath = path.join(publicDir, assetPath)
        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) {
            return next()
          }
          const ext = path.extname(filePath).slice(1)
          const types = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', eot: 'application/vnd.ms-fontobject' }
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream')
          fs.createReadStream(filePath).pipe(res)
        })
      }
      server.middlewares.stack.unshift({ route: '', handle: rewrite })
    }
  })

  const baseForScope = base

  return {
    // Vite strips ?query from base internally; rewriteDistBaseAfterBuild fixes dist/*.html, *.js, etc.
    base: strippedBase,
    plugins: [
      vue(),
      servePublicUnderBase(),
      ...(base !== strippedBase ? [rewriteDistBaseAfterBuild(base, strippedBase)] : []),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          name: 'PHP Coin Wallet',
          short_name: 'PHP Wallet',
          description: 'Send, receive, and manage PHP Coin from your browser.',
          theme_color: '#989BC5',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'any',
          scope: baseForScope,
          start_url: baseForScope,
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,ico,png,svg,webmanifest,woff2,woff,ttf}'],
          // Bundle can exceed 2 MiB (e.g. after adding markdown + sanitizer for changelog).
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: null,
          // Required when precache is empty (e.g. dev); also caches theme fonts from index.html
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            }
          ]
        },
        // Service worker + manifest in dev so Install is available on localhost (runtimeCaching avoids empty Workbox config).
        devOptions: {
          enabled: true
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          // Single bundle (simpler SW precache); hashed names so CDN/browser caches don’t keep stale JS/CSS across deploys.
          inlineDynamicImports: true,
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 3000,
      host: true,
      open: true
    }
  }
})

