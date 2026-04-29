<template>
  <div class="min-h-screen d-flex align-items-center justify-content-center bg-body-tertiary p-4">
    <div class="card border-0 shadow-sm" style="max-width: 420px; width: 100%">
      <div class="card-body text-center p-4">
        <div class="spinner-border text-primary mb-3" role="status" aria-label="Logging out"></div>
        <h5 class="mb-2">Logging out...</h5>
        <p class="text-muted mb-0 small">
          Clearing wallet and session data. You will be redirected shortly.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { clearPendingAuthRedirect } from '../utils/authRedirect'

function normalizeRedirect(route) {
  const raw = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
  let redirect = typeof raw === 'string' ? raw.trim() : ''
  // Some callers pass nested-encoded values (%2Fdapps.php%3Furl=...).
  // Decode a couple of times to normalize before classification.
  for (let i = 0; i < 2; i++) {
    if (!redirect.includes('%')) break
    try {
      const dec = decodeURIComponent(redirect)
      if (!dec || dec === redirect) break
      redirect = dec.trim()
    } catch {
      break
    }
  }
  if (!redirect) return null
  if (/^https?:\/\//i.test(redirect)) return { type: 'external', value: redirect }
  if (redirect.startsWith('/apps/')) return { type: 'external', value: redirect }
  if (redirect.startsWith('/dapps.php')) return { type: 'external', value: redirect }
  if (redirect.startsWith('/')) return { type: 'internal', value: redirect }
  return null
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  authStore.logout()
  clearPendingAuthRedirect()

  const target = normalizeRedirect(route)
  setTimeout(() => {
    if (!target) {
      router.replace({ name: 'Login' })
      return
    }
    if (target.type === 'external') {
      window.location.assign(target.value)
      return
    }
    router.replace(target.value)
  }, 250)
})
</script>
