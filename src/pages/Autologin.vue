<template>
  <div class="w-100 mx-auto" style="max-width: 28rem;">
      <!-- Header (same pattern as Quick Login) -->
      <div class="text-center mb-8">
        <div class="d-inline-flex align-items-center justify-content-center rounded-lg mb-4" style="width: 5rem; height: 5rem; background: #5156be;">
          <LogIn v-if="stage !== 'verify'" :size="40" class="text-white" />
          <span v-else class="spinner-border text-white" role="status">
            <span class="visually-hidden">Loading...</span>
          </span>
        </div>
        <h1 class="text-3xl font-semibold mb-2" style="color: #313533; font-size: 1.875rem; font-weight: 500;">
          {{ headerTitle }}
        </h1>
        <p style="color: #74788d; font-size: 1rem;">{{ headerSubtitle }}</p>
      </div>

      <!-- Verifying -->
      <div v-if="stage === 'verify'" class="minia-card">
        <div class="p-4 text-center">
          <p class="text-muted mb-0">Checking signature and link…</p>
        </div>
      </div>

      <!-- Password -->
      <div v-else-if="stage === 'password'" class="minia-card">
        <div>
          <form @submit.prevent="submitPassword">
            <div class="mb-3">
              <label class="form-label" for="autologin-pw">Password</label>
              <input
                id="autologin-pw"
                v-model="password"
                type="password"
                class="form-control"
                :class="{ 'is-invalid': decryptError }"
                autocomplete="current-password"
                placeholder="Enter your decryption password"
                :disabled="submitting"
              />
              <div v-if="decryptError" class="invalid-feedback d-block">{{ decryptError }}</div>
            </div>
            <button
              type="submit"
              class="btn btn-primary btn-lg w-100"
              :disabled="submitting || !password.trim()"
            >
              <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status"></span>
              <LogIn v-if="!submitting" :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
              {{ submitting ? 'Unlocking…' : 'Unlock wallet' }}
            </button>
          </form>

          <div class="d-flex align-items-center my-4">
            <hr class="flex-grow-1">
            <span class="mx-3 text-muted">OR</span>
            <hr class="flex-grow-1">
          </div>

          <router-link to="/login" class="d-block">
            <button type="button" class="btn btn-outline-secondary btn-lg w-100">
              <Lock :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
              Password login
            </button>
          </router-link>
        </div>
      </div>

      <!-- Error -->
      <div v-else class="minia-card">
        <div class="p-4">
          <p class="text-danger small text-start mb-4">{{ errorMessage }}</p>
          <router-link to="/login" class="d-block">
            <button type="button" class="btn btn-primary btn-lg w-100">Go to login</button>
          </router-link>
        </div>
      </div>

      <!-- Security notice (aligned with Quick Login card below form) -->
      <div
        v-if="stage === 'password'"
        class="alert mt-6 rounded"
        style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.2); padding: 0.75rem 1.25rem;"
      >
        <div class="d-flex">
          <Shield :size="24" style="color: #ffc107; margin-right: 0.75rem; flex-shrink: 0;" />
          <div>
            <h3 class="font-semibold mb-1 lh-base" style="color: #856404; font-size: 1rem;">Security notice</h3>
            <div class="lh-base" style="color: #856404; font-size: 1rem;">
              The password is never in the link. Your key is decrypted in this browser and stored like Quick Login until you log out or clear site data.
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LogIn, Lock, Shield } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import {
  decodeAutologinRequest,
  verifyAutologinSignatureStep,
  decryptAutologinEncryptedPrivateKey,
  assertPrivateKeyMatchesPublicKey,
  markAutologinNonceUsed
} from '../utils/autologin'

export default {
  name: 'Autologin',
  components: { LogIn, Lock, Shield },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const authStore = useAuthStore()
    const stage = ref('verify')
    const errorMessage = ref('')
    const password = ref('')
    const submitting = ref(false)
    const decryptError = ref('')
    /** @type {import('vue').Ref<null | { publicKey: string, address: string, payload: object }>} */
    const verified = ref(null)

    const headerTitle = computed(() =>
      stage.value === 'error' ? 'Could not sign in' : 'Autologin'
    )

    const headerSubtitle = computed(() => {
      if (stage.value === 'verify') return 'Verifying your sign-in link…'
      if (stage.value === 'password') return 'Enter the password you received with this link.'
      return 'Try again from a new link or use password login.'
    })

    onMounted(() => {
      const raw = route.query.request
      const encoded = Array.isArray(raw) ? raw[0] : raw
      if (!encoded || String(encoded).trim() === '') {
        errorMessage.value = 'Missing request parameter.'
        stage.value = 'error'
        return
      }
      try {
        const obj = decodeAutologinRequest(String(encoded))
        verified.value = verifyAutologinSignatureStep(obj)
        stage.value = 'password'
      } catch (e) {
        errorMessage.value = e instanceof Error ? e.message : String(e)
        stage.value = 'error'
      }
    })

    async function submitPassword() {
      if (!verified.value) return
      submitting.value = true
      decryptError.value = ''
      try {
        const pk = await decryptAutologinEncryptedPrivateKey(
          verified.value.payload.encrypted_private_key,
          password.value
        )
        assertPrivateKeyMatchesPublicKey(pk, verified.value.publicKey)
        authStore.loginAutologin(pk)
        try {
          markAutologinNonceUsed(verified.value.publicKey, verified.value.payload.nonce)
        } catch {
          /* duplicate tab finished first — session is already valid */
        }
        router.replace({ name: 'Dashboard' })
      } catch (e) {
        decryptError.value = e instanceof Error ? e.message : String(e)
      } finally {
        submitting.value = false
      }
    }

    return {
      stage,
      errorMessage,
      password,
      submitting,
      decryptError,
      submitPassword,
      headerTitle,
      headerSubtitle
    }
  }
}
</script>
