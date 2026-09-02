<template>
  <div v-if="isConfigured && !isElectron" class="wallet-adsense" aria-label="Advertisement">
    <ins
      ref="adElement"
      class="adsbygoogle"
      style="display: inline-block; width: 200px; height: 200px"
      :data-ad-client="adsenseClient"
      :data-ad-slot="adsenseSlot"
    ></ins>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'

const adElement = ref(null)
const isElectron = typeof window !== 'undefined' && window.phpcoinElectron?.isElectron === true
const adsenseClient = String(import.meta.env.VITE_ADSENSE_CLIENT || '').trim()
const adsenseSlot = String(import.meta.env.VITE_ADSENSE_SLOT || '').trim()
const isConfigured = /^ca-pub-\d+$/.test(adsenseClient) && /^\d+$/.test(adsenseSlot)

onMounted(async () => {
  if (isElectron || !isConfigured) return

  await nextTick()
  if (!adElement.value || adElement.value.dataset.adsbygoogleStatus) return

  try {
    if (!document.querySelector('script[data-phpcoin-adsense]')) {
      const script = document.createElement('script')
      script.async = true
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`
      script.crossOrigin = 'anonymous'
      script.dataset.phpcoinAdsense = 'true'
      document.head.appendChild(script)
    }
    ;(window.adsbygoogle = window.adsbygoogle || []).push({})
  } catch (error) {
    console.warn('AdSense could not initialize the sidebar ad.', error)
  }
})
</script>

<style scoped>
.wallet-adsense {
  width: 200px;
  height: 200px;
  max-width: calc(100% - 2rem);
  margin-right: auto !important;
  margin-left: auto !important;
  flex: 0 0 200px;
  text-align: center;
  overflow: hidden;
}
</style>
