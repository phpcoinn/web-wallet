<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal fade verifier-flow-modal show"
      style="display: block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content verifier-flow-content">
          <div class="modal-header">
            <h5 :id="titleId" class="modal-title">Verify address</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted mb-3">
              Complete the steps so your public key is registered on-chain (has recorded public key).
            </p>

            <div v-if="!activeAccount" class="alert alert-warning mb-0">No active account.</div>

            <template v-else>
              <div class="mb-3">
                <span class="text-muted mb-1 me-3">Your address</span>
                <code class="user-select-all text-break">{{ activeAccount.address }}</code>
              </div>

              <div class="progress mb-3" style="height: 8px">
                <div
                  class="progress-bar bg-success"
                  role="progressbar"
                  :style="{ width: Math.min(100, (step / 5) * 100) + '%' }"
                  :aria-valuenow="step"
                  aria-valuemin="1"
                  aria-valuemax="5"
                />
              </div>

              <div v-if="syncError" class="alert alert-danger py-2 small">{{ syncError }}</div>

              <div v-if="step === 5" class="alert alert-success text-center py-4 mb-0">
                <i class="bx bx-check-circle d-block display-4 text-success mb-2"></i>
                <h6 class="text-success mb-1">Address verified</h6>
                <p class="mb-0 text-muted">Your public key matches the network record for this address.</p>
              </div>

              <template v-else>
                <div v-if="step === 1" class="text-center py-2">
                  <h6 class="mb-2 font-size-16">1. Request test amount from verifier</h6>
                  <p class="text-muted mb-3">
                    The verifier sends a small amount to your address. You will send it back in a later step.
                  </p>
                  <div class="row g-2 justify-content-center text-muted mb-3">
                    <div class="col-auto">
                      <div class="border rounded p-2 text-start" style="min-width: 140px">
                        <div class="text-uppercase text-muted" style="font-size: 0.65rem">Verifier</div>
                        <code class="user-select-all text-break">{{ verifierAddr }}</code>
                      </div>
                    </div>
                    <div class="col-auto d-flex align-items-center">
                      <span class="fa fa-arrow-right"></span>
                    </div>
                    <div class="col-auto">
                      <div class="border rounded p-2 text-start" style="min-width: 140px">
                        <div class="text-uppercase text-muted" style="font-size: 0.65rem">You</div>
                        <code class="user-select-all text-break">{{ activeAccount.address }}</code>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="btn btn-primary"
                    :disabled="requestingFunds"
                    @click="onRequestFunds"
                  >
                    <span v-if="requestingFunds" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    Request from verifier
                  </button>
                </div>

                <div v-else-if="step === 2" class="py-2">
                  <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                    <div>
                      <h6 class="mb-1 font-size-16">2. Waiting for incoming transaction</h6>
                      <p class="text-muted mb-0">
                        Waiting for the verifier transfer to appear on the network. This view refreshes automatically.
                      </p>
                    </div>
                    <div class="spinner-border text-primary flex-shrink-0" role="status" aria-label="Loading" />
                  </div>
                  <div v-if="mempoolTx" class="card mt-2">
                    <div class="card-header py-2">Transaction</div>
                    <div class="card-body py-2">
                      <dl class="row mb-0">
                        <dt class="col-sm-3">ID</dt>
                        <dd class="col-sm-9">
                          <a
                            v-if="explorerTxUrl(mempoolTx)"
                            :href="explorerTxUrl(mempoolTx)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="font-monospace"
                          >{{ mempoolTx.id }}</a>
                          <span v-else class="font-monospace">{{ mempoolTx.id || '—' }}</span>
                        </dd>
                        <dt class="col-sm-3">Value</dt>
                        <dd class="col-sm-9">{{ mempoolTx.val ?? mempoolTx.amount ?? '—' }}</dd>
                        <dt class="col-sm-3">From</dt>
                        <dd class="col-sm-9 text-break">{{ mempoolTx.src }}</dd>
                        <dt class="col-sm-3">To</dt>
                        <dd class="col-sm-9 text-break">{{ mempoolTx.dst }}</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div v-else-if="step === 3" class="text-center py-2">
                  <h6 class="mb-2 font-size-16">3. Send the amount back to verifier</h6>
                  <p class="text-muted mb-3">
                    Approve sending <strong>0.001 PHP</strong> back to the verifier address (password required unless quick login).
                  </p>
                  <div class="row g-2 justify-content-center text-muted mb-3">
                    <div class="col-auto">
                      <div class="border rounded p-2 text-start" style="min-width: 140px">
                        <div class="text-uppercase text-muted" style="font-size: 0.65rem">You</div>
                        <code class="user-select-all text-break">{{ activeAccount.address }}</code>
                        <div class="font-monospace text-break" style="max-width: 200px">{{ balanceDisplay }} PHP</div>
                      </div>
                    </div>
                    <div class="col-auto d-flex align-items-center">
                      <span class="fa fa-arrow-right"></span>
                    </div>
                    <div class="col-auto">
                      <div class="border rounded p-2 text-start" style="min-width: 140px">
                        <div class="text-uppercase text-muted" style="font-size: 0.65rem">Verifier</div>
                        <code class="user-select-all text-break">{{ verifierAddr }}</code>
                        <div class="font-monospace text-break" style="max-width: 200px">&nbsp;</div>
                      </div>
                    </div>
                  </div>
                  <button type="button" class="btn btn-primary" :disabled="sendingBack" @click="startSendBack">
                    <span v-if="sendingBack" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    Send 0.001 PHP back
                  </button>
                </div>

                <div v-else-if="step === 4" class="py-2">
                  <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                    <div>
                      <h6 class="mb-1">4. Waiting for your outgoing transaction</h6>
                      <p class="text-muted mb-0">
                        Waiting for your return transfer to be processed. This view refreshes automatically.
                      </p>
                    </div>
                    <div class="spinner-border text-primary flex-shrink-0" role="status" aria-label="Loading" />
                  </div>
                  <div v-if="mempoolTx" class="card mt-2">
                    <div class="card-header py-2">Transaction</div>
                    <div class="card-body py-2">
                      <dl class="row mb-0">
                        <dt class="col-sm-3">ID</dt>
                        <dd class="col-sm-9">
                          <a
                            v-if="explorerTxUrl(mempoolTx)"
                            :href="explorerTxUrl(mempoolTx)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="font-monospace"
                          >{{ mempoolTx.id }}</a>
                          <span v-else class="font-monospace">{{ mempoolTx.id || '—' }}</span>
                        </dd>
                        <dt class="col-sm-3">Value</dt>
                        <dd class="col-sm-9">{{ mempoolTx.val ?? mempoolTx.amount ?? '—' }}</dd>
                        <dt class="col-sm-3">From</dt>
                        <dd class="col-sm-9 text-break">{{ mempoolTx.src }}</dd>
                        <dt class="col-sm-3">To</dt>
                        <dd class="col-sm-9 text-break">{{ mempoolTx.dst }}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </template>

            </template>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="close">Close</button>
            <button v-if="step === 5" type="button" class="btn btn-primary" @click="close">Done</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="modelValue" class="modal-backdrop fade show verifier-flow-backdrop"></div>

    <PasswordConfirmModal
      v-model="showPasswordModal"
      action-label="Enter your password to sign the return transaction to the verifier."
      @confirm="onPasswordConfirmedSendBack"
    />
  </Teleport>
</template>

<script>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { api, EXPLORER_BASE } from '../utils/api'
import { getPublicKey, signMessage } from '../utils/wallet'
import { getVerifierAddress } from '../utils/verifierEnv'
import { toast } from '../utils/toast'
import PasswordConfirmModal from './PasswordConfirmModal.vue'

const titleId = 'verifier-flow-modal-title'

function normalizeNetworkPublicKey(raw) {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw.trim()
  if (typeof raw === 'object') {
    const v = raw.public_key ?? raw.publicKey
    if (typeof v === 'string') return v.trim()
  }
  return String(raw).trim()
}

function computeStep(address, verifierAddr, networkPk, localPk, txs) {
  const nn = normalizeNetworkPublicKey(networkPk)
  const ln = (localPk || '').trim()
  if (nn && ln && nn === ln) return { step: 5, mempoolTx: null }

  const list = Array.isArray(txs) ? txs : []
  for (const tx of list) {
    if (tx.type === 'mempool') {
      if (tx.dst === address) return { step: 2, mempoolTx: tx }
      if (tx.src === address) return { step: 4, mempoolTx: tx }
      break
    }
    if (tx.type == 1 || tx.type === '1') {
      if (tx.dst === address) return { step: 3, mempoolTx: null }
    }
  }
  return { step: 1, mempoolTx: null }
}

function explorerTxUrl(tx) {
  if (!tx) return ''
  const id = tx.id ?? tx.transaction_id
  if (!id) return ''
  const base = EXPLORER_BASE.endsWith('/') ? EXPLORER_BASE : `${EXPLORER_BASE}/`
  return `${base}tx.php?id=${encodeURIComponent(String(id))}`
}

export default {
  name: 'VerifierModal',
  components: { PasswordConfirmModal },
  props: {
    modelValue: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'verified', 'open-external'],
  setup(props, { emit }) {
    const authStore = useAuthStore()
    const accountsStore = useAccountsStore()
    const { activeAccount, masterKey, isQuickLogin } = storeToRefs(authStore)

    const step = ref(1)
    const mempoolTx = ref(null)
    const balanceDisplay = ref('—')
    const syncError = ref('')
    const requestingFunds = ref(false)
    const sendingBack = ref(false)
    const showPasswordModal = ref(false)
    let pollTimer = null
    let refreshSeq = 0

    const verifierAddr = computed(() => getVerifierAddress())

    const localPublicKey = computed(() => {
      if (!activeAccount.value) return ''
      if (activeAccount.value.publicKey) return String(activeAccount.value.publicKey).trim()
      if (isQuickLogin.value && masterKey.value) return getPublicKey(masterKey.value) || ''
      return ''
    })

    function stopPoll() {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    }

    function schedulePoll() {
      stopPoll()
      pollTimer = setInterval(() => {
        void refreshState(false)
      }, 5000)
    }

    async function refreshState(showLoadError) {
      const addr = activeAccount.value?.address
      if (!addr || !props.modelValue) return
      const seq = ++refreshSeq
      syncError.value = ''
      try {
        const [netPk, txs, bal] = await Promise.all([
          api.getPublicKey(addr).catch(() => null),
          api.getTransactions(addr, 1, 50).catch(() => []),
          api.getBalance(addr).catch(() => null)
        ])
        if (seq !== refreshSeq) return
        const rawBal =
          typeof bal === 'object' && bal !== null && 'balance' in bal ? bal.balance : bal
        balanceDisplay.value = rawBal != null && rawBal !== '' ? String(rawBal) : '0.00'

        const pkNorm = normalizeNetworkPublicKey(netPk)
        const computed = computeStep(addr, verifierAddr.value, pkNorm, localPublicKey.value, txs)
        step.value = computed.step
        mempoolTx.value = computed.mempoolTx

        if (computed.step === 5) {
          stopPoll()
          emit('verified')
        } else if (computed.step === 2 || computed.step === 4) {
          schedulePoll()
        } else {
          stopPoll()
        }
      } catch (e) {
        if (showLoadError) syncError.value = e.message || 'Failed to load status'
      }
    }

    watch(
      () => props.modelValue,
      (open) => {
        if (open) {
          step.value = 1
          mempoolTx.value = null
          syncError.value = ''
          void refreshState(true)
        } else {
          stopPoll()
          refreshSeq++
        }
      }
    )

    watch(
      [() => activeAccount.value?.address, () => localPublicKey.value],
      () => {
        if (props.modelValue) void refreshState(false)
      }
    )

    onBeforeUnmount(() => {
      stopPoll()
    })

    function close() {
      emit('update:modelValue', false)
    }

    function onOpenExternal() {
      emit('open-external')
      close()
    }

    async function onRequestFunds() {
      const addr = activeAccount.value?.address
      if (!addr) return
      requestingFunds.value = true
      try {
        await api.verifierRequestFunds(addr)
        toast.success('Verifier notified — waiting for transfer')
        await refreshState(true)
        if (step.value === 2 || step.value === 4) schedulePoll()
      } catch (e) {
        toast.error(e.message || 'Request failed')
      } finally {
        requestingFunds.value = false
      }
    }

    function startSendBack() {
      if (isQuickLogin.value) {
        const pk = masterKey.value
        if (!pk) {
          toast.error('No private key')
          return
        }
        void runSendBack(pk)
      } else {
        showPasswordModal.value = true
      }
    }

    async function onPasswordConfirmedSendBack(masterKey) {
      showPasswordModal.value = false
      if (!activeAccount.value) return
      try {
        const pk = accountsStore.getDecryptedPrivateKey(activeAccount.value, masterKey)
        await runSendBack(pk)
      } catch (e) {
        toast.error(e.message || 'Could not decrypt key')
      }
    }

    async function runSendBack(privateKey) {
      const acc = activeAccount.value
      if (!acc || !privateKey) {
        toast.error('No account')
        return
      }
      sendingBack.value = true
      try {
        const pub = getPublicKey(privateKey)
        if (!pub) throw new Error('Could not derive public key')

        const { nonce } = await api.verifierSendBackChallenge()
        const signature = signMessage(nonce, privateKey)
        if (!signature) throw new Error('Could not sign challenge')

        const auth = await api.verifierSendBackAuthorize({
          public_key: pub,
          signature,
          nonce
        })
        const dst =
          (auth && auth.verifierAddress) || verifierAddr.value
        if (!dst || dst !== verifierAddr.value) {
          console.warn('verifier address mismatch', auth, verifierAddr.value)
        }

        const transactionData = {
          from: acc.address,
          to: dst,
          amount: '0.001',
          message: 'Send back to verifier',
          type: 1,
          public_key: pub
        }
        const res = await api.generateSendTransaction(transactionData)
        const signature_base = res.signature_base
        if (!signature_base) throw new Error('No signature_base from node')
        let transaction = res.tx
        const txSig = signMessage(signature_base, privateKey)
        if (!txSig) throw new Error('Could not sign transaction')
        transaction.signature = txSig
        await api.sendTransaction(transaction)
        toast.success('Return transaction sent')
        await refreshState(true)
        if (step.value === 2 || step.value === 4) schedulePoll()
      } catch (e) {
        console.error(e)
        toast.error(e.message || 'Send failed')
      } finally {
        sendingBack.value = false
      }
    }

    return {
      titleId,
      activeAccount,
      verifierAddr,
      step,
      mempoolTx,
      balanceDisplay,
      syncError,
      requestingFunds,
      sendingBack,
      showPasswordModal,
      explorerTxUrl,
      close,
      onOpenExternal,
      onRequestFunds,
      startSendBack,
      onPasswordConfirmedSendBack
    }
  }
}
</script>

<style scoped>
.verifier-flow-modal {
  z-index: 1085;
}
.verifier-flow-backdrop {
  z-index: 1080;
  background-color: rgba(0, 0, 0, 0.55);
}
.verifier-flow-content {
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(0, 0, 0, 0.08);
}
</style>
