import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import router from './router'

// Dev mode: Eruda console (mobile-friendly dev tools)
if (import.meta.env.DEV) {
  import('eruda').then((module) => {
    module.default.init()
  })
}

const commonBase = (import.meta.env.VITE_COMMON_ASSETS || '').trim()

/** Full `https://…` URL or root-relative path `/…` (same origin). */
function isValidCommonAssetsBase(v) {
  return v && (/^https?:\/\//i.test(v) || v.startsWith('/'))
}

if (commonBase && !isValidCommonAssetsBase(commonBase)) {
  console.error(
    '[wallet] VITE_COMMON_ASSETS must be https://… or a path starting with / (e.g. https://main1.phpcoin.net/apps/common or /apps/common). Got:',
    commonBase
  )
}

if (commonBase && isValidCommonAssetsBase(commonBase)) {
  // Load theme CSS from shared host (absolute URL or same-origin path; not proxied by Vite)
  const cssFiles = [
    'preloader.min.css',
    'bootstrap.min.css',
    'sweetalert2.min.css',
    'icons.min.css',
    'app.min.css'
  ]
  cssFiles.forEach((file) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `${commonBase}/css/${file}`
    document.head.appendChild(link)
  })
} else {
  console.error(
    '[wallet] Set VITE_COMMON_ASSETS (e.g. https://main1.phpcoin.net/apps/common or /apps/common). Theme CSS will not load without it.'
  )
}

// Import custom styles
import './assets/css/main.css'
import './assets/css/theme-modern.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

registerSW({ immediate: true })

