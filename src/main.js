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

if (commonBase && !/^https?:\/\//i.test(commonBase)) {
  console.error(
    '[wallet] VITE_COMMON_ASSETS must be a full URL (e.g. https://main1.phpcoin.net/apps/common). Got:',
    commonBase
  )
}

if (commonBase && /^https?:\/\//i.test(commonBase)) {
  // Load theme CSS from shared host (absolute URL; not proxied by Vite)
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
    '[wallet] Set VITE_COMMON_ASSETS to a full https URL (e.g. https://main1.phpcoin.net/apps/common). Theme CSS will not load without it.'
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

