import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Base URL for app and assets (same place). Bundled script/link tags use this.
  const base = env.VITE_APP_BASE ?? '/apps/wallet3/'
  const baseNorm = base.endsWith('/') ? base : base + '/'

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

  const baseForScope = base.endsWith('/') ? base : `${base}/`

  return {
    base,
    plugins: [
      vue(),
      servePublicUnderBase(),
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

