<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-body-tertiary">
    <div class="w-100" style="max-width: 28rem;">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-lg mb-4" style="background: #5156be;">
          <Zap :size="40" class="text-white" />
        </div>
        <h1 class="text-3xl font-semibold mb-2" style="color: #313533; font-size: 1.875rem; font-weight: 500;">
          Quick Login
        </h1>
        <p style="color: #74788d; font-size: 1rem;">Login with your private key</p>
      </div>

      <div
        v-if="showLegacyStoredMultiwalletHint"
        class="alert border-0 rounded mb-4 p-3 text-start"
        style="background: rgba(255, 193, 7, 0.14); border: 1px solid rgba(255, 193, 7, 0.35) !important;"
      >
        <p class="text-body lh-base legacy-multiwallet-hint-text mb-3">
          <strong>Legacy multi-wallet detected.</strong>
          This browser still has your old multi-wallet data (<code class="font-monospace">walletData</code> and a saved password). Import it into the new encrypted wallet.
        </p>
        <button type="button" class="btn btn-warning w-100" @click="goLoginSetupMigrate">
          <i class="mdi mdi-database-import me-1"></i>
          Convert to new wallet
        </button>
      </div>

      <!-- Login Card - Minia Exact Style -->
        <div class="minia-card">
        <div>
          <form @submit.prevent="handleLogin">
            <div class="mb-3">
              <label class="form-label">Private Key</label>
              <textarea
                class="form-control"
                :class="{ 'is-invalid': errors.privateKey }"
                v-model="form.privateKey"
                placeholder="Enter your private key (Base58 format)"
                rows="4"
                @blur="validateField('privateKey')"
              ></textarea>
              <div v-if="errors.privateKey" class="invalid-feedback">
                {{ errors.privateKey }}
              </div>
            </div>
            
            <div class="mb-3">
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="saveAccount"
                  v-model="form.saveAccount"
                />
                <label class="form-check-label" for="saveAccount">
                  Save as permanent account
                </label>
              </div>
            </div>
            
            <button
              class="btn btn-primary btn-lg w-100"
              type="submit"
              :disabled="loading"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
              <LogIn :size="18" v-if="!loading" style="margin-right: 0.5rem; vertical-align: middle;" />
              {{ loading ? 'Logging in...' : 'Login' }}
            </button>
          </form>

          <!-- Divider -->
          <div class="d-flex align-items-center my-4">
            <hr class="flex-grow-1">
            <span class="mx-3 text-muted">OR</span>
            <hr class="flex-grow-1">
          </div>

          <!-- Password Login Link -->
          <router-link to="/login">
            <button class="btn btn-outline-secondary btn-lg w-100">
              <Lock :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
              Password Login
            </button>
          </router-link>

          <div
            v-if="showLegacyMultiwalletHint"
            class="alert alert-info mt-4 mb-0 rounded border-0 text-start p-3 p-md-4"
            style="background: rgba(81, 86, 190, 0.08);"
          >
            <p class="text-body mb-3 mb-md-4 lh-base legacy-multiwallet-hint-text">
              Your key was restored from this browser’s stored login (<code class="font-monospace">privateKey</code>). For several addresses in one encrypted wallet, create a multi-wallet.
            </p>
            <button type="button" class="btn btn-outline-primary w-100" @click="goLoginSetup">
              <i class="mdi mdi-account-multiple-outline me-1"></i>
              Create multi-wallet
            </button>
          </div>
        </div>
      </div>

      <!-- Security Alert - Minia Style -->
      <div class="alert mt-6 rounded" style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.2); padding: 0.75rem 1.25rem;">
        <div class="d-flex">
          <Shield :size="24" style="color: #ffc107; margin-right: 0.75rem; flex-shrink: 0;" />
          <div>
            <h3 class="font-semibold mb-1 lh-base" style="color: #856404; font-size: 1rem;">Security Notice</h3>
            <div class="lh-base" style="color: #856404; font-size: 1rem;">
              Your private key is validated via API and stored securely in sessionStorage. It will be cleared when you close the browser tab.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Zap, Key, LogIn, Lock, Shield } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { getPublicKey, signMessage } from '../utils/wallet'
import { api } from '../utils/api'
import { toast } from '../utils/toast'
import { navigateAfterAuth } from '../utils/authRedirect'
import { getStoredLegacyPrivateKey } from '../utils/legacyLoginStorage'
import { hasLegacyMultiwalletCredentials } from '../utils/legacyWallet'
import { requestAuthSetupFlow } from '../utils/authEntryIntent'

export default {
  name: 'QuickLogin',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const accountsStore = useAccountsStore()
    
    const loading = ref(false)
    const errors = reactive({})
    
    const legacyPkAtInit = getStoredLegacyPrivateKey()
    const showLegacyMultiwalletHint = ref(!!legacyPkAtInit)
    const showLegacyStoredMultiwalletHint = ref(false)

    const form = reactive({
      privateKey: legacyPkAtInit || '',
      saveAccount: false
    })

    onMounted(() => {
      showLegacyStoredMultiwalletHint.value = hasLegacyMultiwalletCredentials()
      const legacyPk = getStoredLegacyPrivateKey()
      showLegacyMultiwalletHint.value = !!legacyPk
      if (legacyPk) form.privateKey = legacyPk
    })

    function goLoginSetup() {
      requestAuthSetupFlow()
      router.push({ name: 'Login' })
    }

    function goLoginSetupMigrate() {
      requestAuthSetupFlow({ legacyMigrate: true })
      router.push({ name: 'Login' })
    }
    
    const validateField = (field) => {
      delete errors[field]
      
      if (field === 'privateKey') {
        if (!form.privateKey.trim()) {
          errors.privateKey = 'Please enter your private key'
        }
      }
    }
    
    const validateForm = () => {
      Object.keys(errors).forEach(key => delete errors[key])
      validateField('privateKey')
      return Object.keys(errors).length === 0
    }
    
    const handleLogin = async () => {
      if (!validateForm()) {
        return
      }
      
      try {
        loading.value = true
        
        const privateKey = form.privateKey.trim()
        
        // Step 1: Derive public key from private key
        const publicKey = getPublicKey(privateKey)
        if(!publicKey) {
          throw new Error("Invalid private key")
        }
        
        // Step 2: Generate a nonce/message to sign
        // Using timestamp + random string for uniqueness
        const nonce = `login-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
        
        // Step 3: Sign the message with private key
        const signature = signMessage(nonce, privateKey)
        if(!signature) {
          throw new Error('Invalid signature')
        }

        // Step 4: Call authenticate API
        const authResponse = await api.authenticate(publicKey, signature, nonce)
        
        // Step 5: If successful, get address from API response
        // API returns address directly or in address field
        const address = authResponse.address || authResponse
        
        if (!address) {
          throw new Error('Authentication failed: No address returned from API')
        }
        
        // Create account object with validated address
        const account = {
          id: `quick-${Date.now()}`,
          name: 'Quick Login Account',
          address: address,
          privateKey: privateKey,
          isQuickLogin: true
        }
        
        // Save as permanent account if requested
        if (form.saveAccount) {
          // TODO: Encrypt and save to IndexedDB
          // For now, just store in memory
        }
        
        // Login with private key (stored in memory)
        authStore.login(privateKey, true)
        authStore.setActiveAccount(account)

        navigateAfterAuth(router)
      } catch (error) {
        console.error('Quick login error:', error)
        toast.error(error.message || 'Invalid private key or authentication failed')
      } finally {
        loading.value = false
      }
    }
    
    return {
      form,
      errors,
      loading,
      handleLogin,
      validateField,
      showLegacyMultiwalletHint,
      showLegacyStoredMultiwalletHint,
      goLoginSetup,
      goLoginSetupMigrate
    }
  }
}
</script>

