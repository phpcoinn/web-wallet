<template>
  <div>
    <div class="row">
      <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0 font-size-18">Tools</h4>
          <div class="page-title-right">
            <ol class="breadcrumb m-0">
              <li class="breadcrumb-item"><router-link to="/dashboard">Dashboard</router-link></li>
              <li class="breadcrumb-item active">Tools</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Sign message</h5>
          </div>
          <div class="card-body">
            <p class="text-muted mb-3">
              Produce a signature for any text using the <strong>active account</strong>. The wallet signs
              <code class="font-monospace">{{ chainIdPrefix }}</code> plus your message (same rules as login and API
              <code>authenticate</code>).
            </p>

            <div v-if="!activeAccount?.address" class="alert alert-warning mb-0">No active account.</div>

            <template v-else>
              <div class="mb-3">
                <span class="text-muted d-block mb-1">Signing as</span>
                <code class="user-select-all text-break">{{ activeAccount.address }}</code>
              </div>

              <div class="mb-3">
                <label for="tools-sign-message" class="form-label">Message</label>
                <textarea
                  id="tools-sign-message"
                  v-model="message"
                  class="form-control font-monospace"
                  rows="6"
                  placeholder="Enter the exact text to sign"
                  spellcheck="false"
                  :disabled="signing"
                />
              </div>

              <div class="d-flex flex-wrap gap-2 mb-3">
                <button type="button" class="btn btn-primary" :disabled="signing || !message.trim()" @click="requestSign">
                  <span v-if="signing" class="spinner-border spinner-border-sm me-2" role="status" />
                  Sign
                </button>
                <button
                  v-if="signature"
                  type="button"
                  class="btn btn-outline-secondary"
                  @click="copySignature"
                >
                  Copy signature
                </button>
              </div>

              <div v-if="signature" class="mb-0">
                <label class="form-label">Signature</label>
                <textarea class="form-control font-monospace" rows="4" readonly :value="signature" />
                <p v-if="verified === true" class="text-success mt-2 mb-0">
                  <i class="bx bx-check-circle me-1"></i>Verified against this account’s public key.
                </p>
                <p v-else-if="verified === false" class="text-danger mt-2 mb-0">
                  Verification failed (unexpected — contact support if this persists).
                </p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <PasswordConfirmModal
      v-model="showPasswordModal"
      action-label="Enter your password to sign this message with the active account."
      @confirm="onPasswordConfirmed"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { signMessage, verifySignedMessage, CHAIN_ID } from '../utils/wallet'
import { toast } from '../utils/toast'
import PasswordConfirmModal from '../components/PasswordConfirmModal.vue'

const authStore = useAuthStore()
const accountsStore = useAccountsStore()
const { activeAccount, isQuickLogin, masterKey } = storeToRefs(authStore)

const message = ref('')
const signature = ref('')
const verified = ref(null)
const signing = ref(false)
const showPasswordModal = ref(false)

const chainIdPrefix = computed(() => `${CHAIN_ID}`)

function requestSign() {
  if (!activeAccount.value?.address) {
    toast.error('No active account')
    return
  }
  if (!message.value.trim()) return
  signature.value = ''
  verified.value = null
  if (isQuickLogin.value) {
    void doSign(masterKey.value)
    return
  }
  showPasswordModal.value = true
}

function onPasswordConfirmed(masterKeyFromModal) {
  showPasswordModal.value = false
  if (!activeAccount.value) return
  try {
    const pk = accountsStore.getDecryptedPrivateKey(activeAccount.value, masterKeyFromModal)
    void doSign(pk)
  } catch (e) {
    toast.error(e?.message || 'Could not decrypt private key')
  }
}

async function doSign(privateKey) {
  if (!privateKey) {
    toast.error('No private key')
    return
  }
  signing.value = true
  try {
    const sig = signMessage(message.value.trim(), privateKey)
    if (!sig) {
      toast.error('Signing failed')
      return
    }
    signature.value = sig
    const pub = activeAccount.value?.publicKey
    if (pub) {
      verified.value = verifySignedMessage(message.value.trim(), sig, pub)
    } else {
      verified.value = null
    }
    toast.success('Message signed')
  } finally {
    signing.value = false
  }
}

async function copySignature() {
  if (!signature.value) return
  try {
    await navigator.clipboard.writeText(signature.value)
    toast.success('Copied')
  } catch {
    toast.error('Copy failed')
  }
}
</script>
