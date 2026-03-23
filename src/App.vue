<template>
  <div>
        <router-view v-slot="{ Component, route }">
          <AppLayout v-if="route.meta.layout">
            <component :is="Component" />
          </AppLayout>
          <AuthLayout v-else-if="route.meta.authLayout !== false">
            <component :is="Component" />
          </AuthLayout>
          <component :is="Component" v-else />
        </router-view>
  </div>
</template>

<script>
import { onMounted } from 'vue'
import { useThemeStore } from './stores/theme'
import { useAuthStore } from './stores/auth'
import AppLayout from './components/AppLayout.vue'
import AuthLayout from './components/AuthLayout.vue'

export default {
  name: 'App',
  components: {
    AppLayout,
    AuthLayout
  },
  setup() {
    const themeStore = useThemeStore()
    const authStore = useAuthStore()
    
    onMounted(() => {
      themeStore.initTheme()
      // Initialize auth state (restore quick login session if exists)
      authStore.init()
    })
  }
}
</script>

<style>
/* Minia CSS handles all base styles */
</style>
