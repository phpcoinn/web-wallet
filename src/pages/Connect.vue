<template>
  <div class="connect-page">
    <div class="connect-container">
      <div class="text-center mb-4">
        <img :src="logoUrl" alt="PHP Coin" height="40" class="mb-2">
        <h5 class="mb-1">Wallet Connect</h5>
        <p class="text-muted small mb-0">Secure wallet authentication</p>
      </div>

      <div class="card shadow-sm">
        <div class="card-body">

          <!-- Idle: waiting for request -->
          <div v-if="view === 'idle'" class="text-center py-4">
            <div class="spinner-border text-primary mb-3" role="status"></div>
            <p class="text-muted mb-0">Waiting for connection request...</p>
          </div>

          <!-- Request received (auth or signTx) -->
          <template v-if="view === 'auth' || view === 'signTx'">
            <div class="alert alert-warning mb-3">
              <strong>{{ view === 'auth' ? 'Login Request' : 'Sign Transaction' }}</strong>
              <div class="mt-1 small">
                <span class="text-muted">Domain:</span>
                <code>{{ requestDomain }}</code>
              </div>
            </div>

            <!-- Sign Tx: transaction details -->
            <template v-if="view === 'signTx' && transaction">
              <div class="border rounded p-2 mb-2 text-center">
                <div class="text-muted small">From</div>
                <div class="small text-break fw-medium">{{ transaction.src }}</div>
                <div v-if="signTxBalance != null" class="fw-bold text-primary">{{ signTxBalance }} PHP</div>
              </div>
              <div class="text-center my-2">
                <i class="mdi mdi-arrow-down mdi-24px text-primary"></i>
                <span class="ms-1 fw-bold text-primary fs-5">{{ formatAmount(transaction.val) }} PHP</span>
                <div v-if="parseFloat(transaction.fee)" class="text-muted small">Fee: {{ formatAmount(transaction.fee) }}</div>
              </div>
              <div class="border rounded p-2 mb-3 text-center">
                <div class="text-muted small">To</div>
                <div class="small text-break fw-medium">{{ transaction.dst || '(empty)' }}</div>
              </div>
              <div class="mb-3">
                <a href="#" class="small text-decoration-none" @click.prevent="showTxDetails = !showTxDetails">
                  <i class="mdi mdi-information-outline"></i> Transaction details
                </a>
                <pre
                  v-show="showTxDetails"
                  class="bg-light p-2 mt-1 small text-break rounded"
                  style="white-space: pre-wrap; max-height: 150px; overflow: auto;"
                >{{ JSON.stringify(transaction, null, 2) }}</pre>
              </div>
              <div
                v-if="signTxBalance != null && parseFloat(signTxBalance) < parseFloat(transaction.val || 0)"
                class="alert alert-danger small"
              >
                Not enough balance for this transfer
              </div>
            </template>

            <!-- Not authenticated — show login form -->
            <template v-if="!isAuthenticated">
              <hr>
              <ul class="nav nav-pills nav-justified mb-3">
                <li class="nav-item">
                  <button class="nav-link" :class="{ active: loginMode === 'password' }" @click="loginMode = 'password'">
                    <i class="mdi mdi-lock-outline me-1"></i>Password
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link" :class="{ active: loginMode === 'privateKey' }" @click="loginMode = 'privateKey'">
                    <i class="mdi mdi-key-outline me-1"></i>Private Key
                  </button>
                </li>
              </ul>

              <form v-if="loginMode === 'password'" @submit.prevent="handlePasswordLogin">
                <div class="mb-3">
                  <label class="form-label small">Password:</label>
                  <div class="input-group">
                    <input
                      :type="showPasswordField ? 'text' : 'password'"
                      class="form-control"
                      v-model="passwordInput"
                      placeholder="Enter wallet password"
                      :disabled="loading"
                    />
                    <button type="button" class="btn btn-light border" @click="showPasswordField = !showPasswordField">
                      <i :class="showPasswordField ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                    </button>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                  Login
                </button>
              </form>

              <form v-if="loginMode === 'privateKey'" @submit.prevent="handlePrivateKeyLogin">
                <div class="mb-3">
                  <label class="form-label small">Private Key:</label>
                  <div class="input-group">
                    <input
                      :type="showKeyField ? 'text' : 'password'"
                      class="form-control"
                      v-model="privateKeyInput"
                      placeholder="Lz..."
                      :disabled="loading"
                    />
                    <button type="button" class="btn btn-light border" @click="showKeyField = !showKeyField">
                      <i :class="showKeyField ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                    </button>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                  Login
                </button>
              </form>

              <div v-if="loginError" class="alert alert-danger mt-3 mb-0 small">{{ loginError }}</div>
            </template>

            <!-- Authenticated — show account + approve/reject -->
            <template v-if="isAuthenticated">
              <hr>

              <div v-if="view === 'auth' && walletAccounts.length > 1" class="mb-3">
                <label class="form-label small">Select account:</label>
                <select class="form-select" v-model="selectedAccountIndex">
                  <option
                    v-for="(acc, i) in walletAccounts"
                    :key="acc.id || acc.address"
                    :value="i"
                  >
                    {{ acc.name || 'Account' }} — {{ shortAddr(acc.address) }}
                  </option>
                </select>
              </div>

              <div v-else-if="view === 'signTx' && signingAccount" class="bg-light rounded p-2 mb-3">
                <div class="small fw-medium">{{ signingAccount.name || 'Signing account' }}</div>
                <code class="small text-break">{{ signingAccount.address }}</code>
              </div>

              <div v-else-if="currentAccount" class="bg-light rounded p-2 mb-3">
                <div class="small fw-medium">{{ currentAccount.name || 'Account' }}</div>
                <code class="small text-break">{{ currentAccount.address }}</code>
              </div>

              <div class="d-flex gap-2">
                <button class="btn btn-primary flex-fill" @click="handleApprove" :disabled="approving">
                  <span v-if="approving" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="mdi mdi-check me-1"></i>
                  Approve
                </button>
                <button class="btn btn-outline-danger flex-fill" @click="handleReject" :disabled="approving">
                  <i class="mdi mdi-close me-1"></i>
                  Reject
                </button>
              </div>

              <div v-if="approveError" class="alert alert-danger mt-3 mb-0 small">{{ approveError }}</div>
            </template>
          </template>

          <!-- Done -->
          <div v-if="view === 'done'" class="text-center py-4">
            <i class="mdi mdi-check-circle text-success" style="font-size: 48px;"></i>
            <p class="mt-2 mb-0">{{ statusMessage }}</p>
          </div>
        </div>
      </div>

      <div class="text-center mt-3">
        <small class="text-muted">PHP Coin Wallet Gateway</small>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import phpcoinCrypto from 'phpcoin-crypto'
import { AUTOLOGIN_PK_KEY } from '../stores/auth'
import { getAccounts as getAccountsFromDB } from '../utils/db'
import { deriveMasterKey, decrypt } from '../utils/crypto'

const PASSWORD_STORAGE_KEY = 'phpcoin_wallet_password'
const LOGO_URL = (import.meta.env.VITE_COMMON_ASSETS || '/apps/common') + '/img/logo.png'

/**
 * Replicate phpcoin-crypto.browser.js signTransaction (not in npm package).
 * Builds canonical tx_base and signs with chainId prefix.
 */
function signTransactionLocal(tx, privateKey, chainId) {
  const publicKey = phpcoinCrypto.getPublicKey(privateKey)
  const txBase =
    Number(tx.val || 0).toFixed(8) +
    '-' + Number(tx.fee || 0).toFixed(8) +
    '-' + (tx.dst == null ? '' : tx.dst) +
    '-' + (tx.msg || '') +
    '-' + (tx.type != null ? tx.type : 1) +
    '-' + publicKey +
    '-' + (tx.date || Math.floor(Date.now() / 1000))
  const signature = phpcoinCrypto.sign(chainId + txBase, privateKey)
  return Object.assign({}, tx, { public_key: publicKey, signature })
}

export default {
  name: 'Connect',
  setup() {
    const view = ref('idle')
    const loginMode = ref('password')
    const loading = ref(false)
    const approving = ref(false)
    const loginError = ref('')
    const approveError = ref('')
    const statusMessage = ref('')

    const passwordInput = ref('')
    const privateKeyInput = ref('')
    const showPasswordField = ref(false)
    const showKeyField = ref(false)

    const isAuthenticated = ref(false)
    const masterKey = ref(null)
    const resolvedPrivateKey = ref(null)
    const walletAccounts = ref([])
    const selectedAccountIndex = ref(0)
    const showTxDetails = ref(false)
    const signTxBalance = ref(null)

    const pendingEvent = ref(null)
    const pendingRequest = ref(null)

    const requestDomain = computed(() => pendingRequest.value?.domain || '')
    const transaction = computed(() => pendingRequest.value?.transaction || null)
    const signingAddress = computed(() => {
      const src = transaction.value?.src
      return typeof src === 'string' ? src.trim() : ''
    })

    const signingAccount = computed(() => {
      if (view.value !== 'signTx') return null
      if (resolvedPrivateKey.value) {
        const acc = phpcoinCrypto.importPrivateKey(resolvedPrivateKey.value)
        return acc && acc.address === signingAddress.value ? acc : null
      }
      if (!signingAddress.value || walletAccounts.value.length === 0) return null
      return walletAccounts.value.find((acc) => acc?.address === signingAddress.value) || null
    })

    const currentAccount = computed(() => {
      if (resolvedPrivateKey.value) {
        const acc = phpcoinCrypto.importPrivateKey(resolvedPrivateKey.value)
        return acc || null
      }
      if (walletAccounts.value.length > 0) {
        return walletAccounts.value[selectedAccountIndex.value] || walletAccounts.value[0]
      }
      return null
    })

    let messageHandler = null

    // ---- postMessage protocol ----

    function onMessage(event) {
      if (!event.data || !event.data.type) return
      const { type, payload } = event.data

      if (type === 'PHPCOIN_REQUEST_AUTH') {
        const { domain, nonce, issued_at } = payload || {}
        if (!domain || !nonce || !issued_at) return
        if (domain !== event.origin) return
        if (Math.abs(Date.now() - issued_at) > 120000) return
        pendingEvent.value = event
        pendingRequest.value = { type: 'auth', origin: event.origin, domain, nonce, issued_at }
        view.value = 'auth'
      }

      if (type === 'PHPCOIN_REQUEST_SIGN_TX') {
        const { domain, issued_at, transaction: tx, chainId } = payload || {}
        if (!tx || typeof tx !== 'object') return
        if (domain !== event.origin) return
        if (Math.abs(Date.now() - issued_at) > 120000) return
        pendingEvent.value = event
        pendingRequest.value = {
          type: 'signTx', origin: event.origin, domain, issued_at,
          transaction: tx, chainId: chainId != null ? String(chainId) : '00'
        }
        view.value = 'signTx'
        signTxBalance.value = null
        if (tx.src) {
          fetch('/api.php?q=getBalance&address=' + encodeURIComponent(tx.src))
            .then(r => r.json())
            .then(data => { if (data?.data != null) signTxBalance.value = data.data })
            .catch(() => {})
        }
      }
    }

    // ---- Auto-authenticate from persisted data ----

    async function tryAutoAuth() {
      const autologinPk = localStorage.getItem(AUTOLOGIN_PK_KEY)
      if (autologinPk) {
        const acc = phpcoinCrypto.importPrivateKey(autologinPk)
        if (acc) {
          resolvedPrivateKey.value = autologinPk
          isAuthenticated.value = true
          return
        }
      }

      const savedPassword = localStorage.getItem(PASSWORD_STORAGE_KEY)
      if (savedPassword) {
        try {
          const { key } = deriveMasterKey(savedPassword)
          const accounts = await getAccountsFromDB()
          if (accounts.length > 0) {
            decrypt(accounts[0].privateKey, key)
            masterKey.value = key
            walletAccounts.value = accounts
            selectedAccountIndex.value = 0
            isAuthenticated.value = true
            return
          }
        } catch { /* invalid saved password or no accounts */ }
        passwordInput.value = savedPassword
      }

      try {
        const accounts = await getAccountsFromDB()
        loginMode.value = accounts.length > 0 ? 'password' : 'privateKey'
      } catch {
        loginMode.value = 'privateKey'
      }
    }

    // ---- Login handlers ----

    async function handlePasswordLogin() {
      loginError.value = ''
      if (!passwordInput.value.trim()) {
        loginError.value = 'Please enter your password'
        return
      }
      loading.value = true
      try {
        const { key } = deriveMasterKey(passwordInput.value)
        const accounts = await getAccountsFromDB()
        if (accounts.length === 0) throw new Error('No accounts found')
        decrypt(accounts[0].privateKey, key)
        masterKey.value = key
        walletAccounts.value = accounts
        selectedAccountIndex.value = 0
        isAuthenticated.value = true
      } catch {
        loginError.value = 'Invalid password or no accounts found'
      } finally {
        loading.value = false
      }
    }

    function handlePrivateKeyLogin() {
      loginError.value = ''
      const pk = privateKeyInput.value.trim()
      if (!pk) { loginError.value = 'Please enter your private key'; return }
      const acc = phpcoinCrypto.importPrivateKey(pk)
      if (!acc) { loginError.value = 'Invalid private key'; return }
      resolvedPrivateKey.value = pk
      isAuthenticated.value = true
    }

    // ---- Resolve private key for the selected account ----

    function getActivePrivateKey() {
      if (resolvedPrivateKey.value) return resolvedPrivateKey.value
      if (masterKey.value && walletAccounts.value.length > 0) {
        const account = walletAccounts.value[selectedAccountIndex.value] || walletAccounts.value[0]
        return decrypt(account.privateKey, masterKey.value)
      }
      return null
    }

    function getSigningPrivateKey() {
      if (resolvedPrivateKey.value) {
        const acc = phpcoinCrypto.importPrivateKey(resolvedPrivateKey.value)
        if (!acc || acc.address !== signingAddress.value) {
          throw new Error('The loaded private key does not match the transaction source address')
        }
        return resolvedPrivateKey.value
      }
      if (!masterKey.value) {
        throw new Error('No wallet key available')
      }
      if (!signingAccount.value) {
        throw new Error('No wallet account matches the transaction source address')
      }
      return decrypt(signingAccount.value.privateKey, masterKey.value)
    }

    // ---- Approve / Reject ----

    function handleApprove() {
      const req = pendingRequest.value
      const event = pendingEvent.value
      if (!req || !event) return

      approving.value = true
      approveError.value = ''
      try {
        if (req.type === 'auth') {
          const privateKey = getActivePrivateKey()
          if (!privateKey) throw new Error('No private key available')
          const account = phpcoinCrypto.importPrivateKey(privateKey)
          if (!account) throw new Error('Invalid private key')
          const message = JSON.stringify({
            domain: req.domain, address: account.address,
            nonce: req.nonce, issued_at: req.issued_at
          })
          const signature = phpcoinCrypto.sign(message, privateKey)
          event.source.postMessage({
            type: 'PHPCOIN_AUTH_RESPONSE',
            payload: { address: account.address, publicKey: account.publicKey, message, signature }
          }, req.origin)
          statusMessage.value = 'Connection approved'
        } else {
          const privateKey = getSigningPrivateKey()
          const signed = signTransactionLocal(req.transaction, privateKey, req.chainId)
          event.source.postMessage({
            type: 'PHPCOIN_SIGN_TX_RESPONSE',
            payload: { signedTransaction: btoa(JSON.stringify(signed)) }
          }, req.origin)
          statusMessage.value = 'Transaction signed'
        }

        view.value = 'done'
        setTimeout(() => { if (window.opener) window.close() }, 600)
      } catch (err) {
        approveError.value = err.message || 'Approval failed'
      } finally {
        approving.value = false
      }
    }

    function handleReject() {
      const event = pendingEvent.value
      const req = pendingRequest.value
      if (event && req) {
        event.source.postMessage({
          type: req.type === 'signTx' ? 'PHPCOIN_SIGN_TX_REJECTED' : 'PHPCOIN_AUTH_REJECTED',
          payload: { reason: 'User rejected' }
        }, req.origin)
      }
      if (window.opener) window.close()
    }

    function shortAddr(addr) {
      if (!addr) return ''
      return addr.substring(0, 8) + '...' + addr.substring(addr.length - 6)
    }

    function formatAmount(val) {
      if (val == null) return '0'
      const n = Number(val)
      return isNaN(n) ? String(val) : n.toFixed(8)
    }

    onMounted(async () => {
      messageHandler = onMessage
      window.addEventListener('message', messageHandler)
      await tryAutoAuth()
      if (window.opener) {
        window.opener.postMessage({ type: 'PHPCOIN_WALLET_READY' }, '*')
      }
    })

    onUnmounted(() => {
      if (messageHandler) window.removeEventListener('message', messageHandler)
    })

    return {
      view, loginMode, loading, approving, loginError, approveError, statusMessage,
      passwordInput, privateKeyInput, showPasswordField, showKeyField,
      isAuthenticated, walletAccounts, selectedAccountIndex, currentAccount,
      requestDomain, transaction, signingAccount, showTxDetails, signTxBalance,
      handlePasswordLogin, handlePrivateKeyLogin, handleApprove, handleReject,
      shortAddr, formatAmount, logoUrl: LOGO_URL
    }
  }
}
</script>

<style scoped>
.connect-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: var(--bs-body-bg, #f8f9fa);
}
.connect-container {
  width: 100%;
  max-width: 440px;
}
</style>
