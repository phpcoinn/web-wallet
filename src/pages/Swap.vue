<template>
  <div>
    <div class="row">
      <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0 font-size-18">Swap</h4>
          <div class="page-title-right">
            <ol class="breadcrumb m-0">
              <li class="breadcrumb-item"><router-link to="/dashboard">Wallet</router-link></li>
              <li class="breadcrumb-item active">Swap</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <p class="text-muted font-size-13 mb-0">
      Testnet only: send PHP to the bridge to swap to mainnet. Optional receiver address is stored in the transaction message.
    </p>

    <Teleport to="body">
      <div
        v-if="showModal"
        class="modal fade swap-modal show"
        style="display: block;"
        tabindex="-1"
        aria-labelledby="swapModalLabel"
        aria-modal="true"
        role="dialog"
        @click.self="closeModal"
      >
        <div class="modal-dialog" @click.stop>
          <div class="modal-content">
            <div class="modal-header">
              <h5 id="swapModalLabel" class="modal-title">Swap to Mainnet</h5>
              <button type="button" class="btn-close" aria-label="Close" @click="closeModal"></button>
            </div>

            <div v-if="txSuccess" class="modal-body">
              <div class="text-center py-2">
                <div class="mb-3">
                  <span class="d-inline-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10" style="width: 56px; height: 56px;">
                    <Check :size="28" class="text-success" />
                  </span>
                </div>
                <p class="text-muted small mb-2">Transaction broadcast to the mempool.</p>
                <p v-if="txId" class="text-muted small mb-0 font-monospace text-break">{{ txId }}</p>
                <a
                  v-if="txId"
                  :href="explorerTxUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-outline-primary btn-sm mt-3 me-2"
                >View on explorer</a>
                <button type="button" class="btn btn-primary btn-sm mt-3" @click="resetAndClose">Done</button>
              </div>
            </div>

            <template v-else>
              <form @submit.prevent="requestSubmit">
                <div class="modal-body">
                  <div class="mb-3">
                    <label class="form-label">Mainnet receiver address (optional)</label>
                    <div class="input-group">
                      <span class="input-group-text bg-light">
                        <User :size="18" style="color: #74788d;" />
                      </span>
                      <input
                        v-model="form.receiver"
                        type="text"
                        class="form-control font-monospace"
                        :class="{ 'is-invalid': errors.receiver }"
                        :placeholder="activeAccount?.address || 'Leave empty to use default handling'"
                        autocomplete="off"
                        @blur="validateReceiver"
                      />
                      <button
                        type="button"
                        class="btn btn-outline-secondary"
                        title="Choose from address book or accounts"
                        @click="openAddressBookModal"
                      >
                        <BookOpen :size="18" />
                      </button>
                      <div v-if="errors.receiver" class="invalid-feedback d-block w-100">
                        {{ errors.receiver }}
                      </div>
                    </div>
                    <div class="form-text">If set, must be a valid address (encoded in the transaction message).</div>
                  </div>
                  <div class="mb-0">
                    <label class="form-label">Amount (PHP)</label>
                    <div class="float-end text-muted small">
                      Available:
                      <button type="button" class="btn btn-link btn-sm p-0 align-baseline text-decoration-none" @click.prevent="setMaxAmount">
                        {{ balance }}
                      </button>
                    </div>
                    <input
                      v-model.number="form.amount"
                      type="number"
                      class="form-control"
                      :class="{ 'is-invalid': errors.amount }"
                      step="0.00000001"
                      :min="SWAP_MIN_AMOUNT"
                      placeholder="Minimum 1000"
                      @blur="validateAmount"
                    />
                    <div v-if="errors.amount" class="invalid-feedback">{{ errors.amount }}</div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" @click="closeModal">Close</button>
                  <button type="submit" class="btn btn-primary" :disabled="confirming">
                    <span v-if="confirming" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ confirming ? 'Sending…' : 'Send' }}
                  </button>
                </div>
              </form>
            </template>
          </div>
        </div>
      </div>
      <div v-if="showModal" class="modal-backdrop fade show swap-modal-backdrop" @click="onBackdropClick"></div>
    </Teleport>

    <PasswordConfirmModal
      v-model="showPasswordModal"
      action-label="Enter your password to confirm the swap transaction."
      @confirm="onPasswordConfirmed"
    />

    <!-- Receiver picker (same as Send: Address book + Accounts) -->
    <Teleport to="body">
      <div
        v-if="showAddressBookModal"
        class="modal fade show swap-address-picker-modal"
        style="display: block;"
        tabindex="-1"
        role="dialog"
        @click.self="closeAddressPickerModal"
      >
        <div class="modal-dialog" @click.stop>
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Choose address</h5>
              <button type="button" class="btn-close" aria-label="Close" @click="closeAddressPickerModal"></button>
            </div>
            <div class="modal-body p-0">
              <ul class="nav nav-tabs px-3 pt-2 mb-0" role="tablist">
                <li class="nav-item" role="presentation">
                  <button
                    type="button"
                    class="nav-link"
                    :class="{ active: recipientPickerTab === 'addressbook' }"
                    @click="recipientPickerTab = 'addressbook'"
                  >
                    Address book
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button
                    type="button"
                    class="nav-link"
                    :class="{ active: recipientPickerTab === 'accounts' }"
                    @click="recipientPickerTab = 'accounts'"
                  >
                    Accounts
                  </button>
                </li>
              </ul>
              <div class="p-3">
                <div v-show="recipientPickerTab === 'addressbook'">
                  <div v-if="addressBookContacts.length === 0" class="text-center py-4 text-muted">
                    No contacts in address book.
                    <router-link to="/address-book" @click="closeAddressPickerModal">Add contacts</router-link>
                  </div>
                  <div v-else class="list-group list-group-flush">
                    <button
                      v-for="contact in addressBookContacts"
                      :key="contact.address"
                      type="button"
                      class="list-group-item list-group-item-action d-flex align-items-center"
                      @click="selectReceiver(contact)"
                    >
                      <div class="flex-grow-1 text-start overflow-hidden" style="min-width: 0;">
                        <div class="fw-medium">{{ contact.name || contact.address }}</div>
                        <code v-if="contact.name" class="font-monospace text-muted text-truncate d-block" style="font-size: 0.875rem;">{{ contact.address }}</code>
                      </div>
                      <SendIcon :size="16" class="text-primary flex-shrink-0 ms-2" />
                    </button>
                  </div>
                </div>
                <div v-show="recipientPickerTab === 'accounts'">
                  <div v-if="walletAccounts.length === 0" class="text-center py-4 text-muted">
                    No accounts in wallet.
                  </div>
                  <div v-else class="list-group list-group-flush">
                    <button
                      v-for="acc in walletAccounts"
                      :key="acc.address"
                      type="button"
                      class="list-group-item list-group-item-action d-flex align-items-center"
                      @click="selectReceiver(acc)"
                    >
                      <div class="flex-grow-1 text-start overflow-hidden" style="min-width: 0;">
                        <div class="fw-medium">{{ acc.name || acc.address }}</div>
                        <code v-if="acc.name" class="font-monospace text-muted text-truncate d-block" style="font-size: 0.875rem;">{{ acc.address }}</code>
                      </div>
                      <span v-if="activeAccount?.address === acc.address" class="badge bg-primary flex-shrink-0 ms-2">Active</span>
                      <SendIcon v-else :size="16" class="text-primary flex-shrink-0 ms-2" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="showAddressBookModal"
        class="modal-backdrop fade show swap-address-picker-backdrop"
        @click="closeAddressPickerModal"
      ></div>
    </Teleport>

    <!-- Confirm summary (same flow as Send) -->
    <Teleport to="body">
      <div
        v-if="showConfirmModal"
        class="modal fade show swap-confirm-modal"
        style="display: block;"
        tabindex="-1"
        @click.self="closeConfirmModal"
      >
        <div class="modal-dialog" @click.stop>
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Confirm swap</h5>
              <button type="button" class="btn-close" @click="closeConfirmModal"></button>
            </div>
            <div class="modal-body">
              <p class="small text-muted mb-2">Bridge address (testnet)</p>
              <p class="font-monospace small text-break mb-3">{{ SWAP_BRIDGE_ADDRESS }}</p>
              <p class="mb-1"><strong>Amount:</strong> {{ form.amount }} PHP</p>
              <p class="mb-1"><strong>Fee:</strong> {{ feeDisplay }} PHP</p>
              <p v-if="form.receiver.trim()" class="mb-0"><strong>Message (receiver):</strong> {{ form.receiver.trim() }}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeConfirmModal">Cancel</button>
              <button type="button" class="btn btn-primary" :disabled="confirming" @click="executeSwap">
                <span v-if="confirming" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ confirming ? 'Sending…' : 'Confirm & send' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="showConfirmModal"
        class="modal-backdrop fade show swap-confirm-backdrop"
        @click="closeConfirmModal"
      ></div>
    </Teleport>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Check, Send as SendIcon, User, BookOpen } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { getPublicKey, signMessage, verifyAddress, CHAIN_ID } from '../utils/wallet'
import { api, EXPLORER_BASE } from '../utils/api'
import { toast } from '../utils/toast'
import { getAddressBook } from '../utils/db'
import PasswordConfirmModal from '../components/PasswordConfirmModal.vue'
import { SWAP_BRIDGE_ADDRESS, SWAP_MIN_AMOUNT } from '../constants/swap'

export default {
  name: 'Swap',
  components: { PasswordConfirmModal, Check, SendIcon, User, BookOpen },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const accountsStore = useAccountsStore()
    const { activeAccount: storeActiveAccount, masterKey: storeMasterKey, isQuickLogin: storeIsQuickLogin } = storeToRefs(authStore)
    const { accounts: storeAccounts } = storeToRefs(accountsStore)

    const showModal = ref(true)
    const showAddressBookModal = ref(false)
    const addressBookContacts = ref([])
    const recipientPickerTab = ref('addressbook')
    const showPasswordModal = ref(false)
    const showConfirmModal = ref(false)
    const tempMasterKey = ref(null)
    const confirming = ref(false)
    const balance = ref('0.00')
    const fee = ref('0')
    const txSuccess = ref(false)
    const txId = ref('')

    const form = reactive({
      receiver: '',
      amount: null
    })
    const errors = reactive({})

    const activeAccount = computed(() => storeActiveAccount.value)

    const walletAccounts = computed(() => {
      const accounts = storeAccounts.value || []
      if (accounts.length > 0) return accounts
      const active = storeActiveAccount.value
      return active ? [active] : []
    })

    const feeDisplay = computed(() => fee.value || '0')
    const feeNum = computed(() => parseFloat(String(fee.value || '0')) || 0)
    const balanceNum = computed(() => {
      const b = parseFloat(String(balance.value || '0'))
      return isNaN(b) ? 0 : b
    })

    const explorerTxUrl = computed(() => {
      if (!txId.value) return EXPLORER_BASE
      const base = EXPLORER_BASE.endsWith('/') ? EXPLORER_BASE : EXPLORER_BASE + '/'
      return `${base}tx.php?id=${encodeURIComponent(txId.value)}`
    })

    function validateReceiver() {
      delete errors.receiver
      const r = form.receiver.trim()
      if (!r) return
      try {
        if (!verifyAddress(r)) errors.receiver = 'Invalid address format'
      } catch {
        errors.receiver = 'Invalid address format'
      }
    }

    function validateAmount() {
      delete errors.amount
      if (form.amount === null || form.amount === '') {
        errors.amount = 'Enter an amount'
        return
      }
      if (form.amount < SWAP_MIN_AMOUNT) {
        errors.amount = `Minimum amount for swap is ${SWAP_MIN_AMOUNT}`
        return
      }
      const total = form.amount + feeNum.value
      if (total > balanceNum.value) {
        errors.amount = 'Insufficient balance (including fee)'
      }
    }

    function validateForm() {
      delete errors.receiver
      delete errors.amount
      validateReceiver()
      validateAmount()
      return !errors.receiver && !errors.amount
    }

    function setMaxAmount() {
      const max = Math.max(0, balanceNum.value - feeNum.value)
      form.amount = max < 0.00000001 ? null : parseFloat(max.toFixed(8))
      validateAmount()
    }

    function closeModal() {
      if (confirming.value) return
      showAddressBookModal.value = false
      showConfirmModal.value = false
      showPasswordModal.value = false
      tempMasterKey.value = null
      showModal.value = false
      router.push({ name: 'Dashboard' })
    }

    function onBackdropClick() {
      closeModal()
    }

    function closeConfirmModal() {
      if (confirming.value) return
      showConfirmModal.value = false
    }

    async function openAddressBookModal() {
      try {
        const [contacts] = await Promise.all([
          getAddressBook(),
          !storeIsQuickLogin.value && storeMasterKey.value && storeAccounts.value?.length === 0
            ? accountsStore.loadAccounts(storeMasterKey.value)
            : Promise.resolve()
        ])
        addressBookContacts.value = Array.isArray(contacts) ? contacts : []
        recipientPickerTab.value = 'addressbook'
        showAddressBookModal.value = true
      } catch (err) {
        console.error('Failed to load address picker:', err)
        toast.error('Failed to load')
      }
    }

    function selectReceiver(item) {
      form.receiver = item.address
      validateReceiver()
      showAddressBookModal.value = false
    }

    function closeAddressPickerModal() {
      showAddressBookModal.value = false
    }

    function resetAndClose() {
      txSuccess.value = false
      txId.value = ''
      form.receiver = ''
      form.amount = null
      Object.keys(errors).forEach((k) => delete errors[k])
      showModal.value = false
      router.push({ name: 'Dashboard' })
    }

    function requestSubmit() {
      if (!validateForm()) return
      if (!storeActiveAccount.value) {
        toast.error('No active account')
        return
      }
      if (storeIsQuickLogin.value) {
        showConfirmModal.value = true
      } else {
        showPasswordModal.value = true
      }
    }

    function onPasswordConfirmed(masterKey) {
      showPasswordModal.value = false
      tempMasterKey.value = masterKey
      showConfirmModal.value = true
    }

    async function executeSwap() {
      if (!validateForm()) {
        showConfirmModal.value = false
        return
      }
      const masterKey = storeIsQuickLogin.value
        ? storeMasterKey.value
        : tempMasterKey.value || storeMasterKey.value
      if (!masterKey || !storeActiveAccount.value) {
        toast.error('No active account')
        showConfirmModal.value = false
        return
      }

      try {
        confirming.value = true
        tempMasterKey.value = null
        const acc = storeActiveAccount.value
        const privateKey = storeIsQuickLogin.value
          ? storeMasterKey.value
          : accountsStore.getDecryptedPrivateKey(acc, masterKey)

        const msg = form.receiver.trim()
        const transactionData = {
          from: acc.address,
          to: SWAP_BRIDGE_ADDRESS,
          amount: form.amount.toString(),
          message: msg,
          type: 1,
          public_key: getPublicKey(privateKey)
        }

        const res = await api.generateSendTransaction(transactionData)
        const signature_base = res.signature_base
        if (!signature_base) {
          throw new Error('Failed to generate transaction: No signature_base returned')
        }
        let transaction = res.tx
        const signature = signMessage(signature_base, privateKey)
        if (!signature) {
          throw new Error('Failed to sign transaction')
        }
        transaction.signature = signature
        const result = await api.sendTransaction(transaction)
        const id = result?.id ?? result?.tx_id ?? result?.transaction_id ?? result?.hash ?? result?.tx_hash ?? transaction?.id
        if (id) txId.value = String(id)

        showConfirmModal.value = false
        txSuccess.value = true
        toast.success('Swap transaction broadcast')
        loadBalance()
      } catch (e) {
        console.error('Swap error:', e)
        toast.error(e.message || 'Swap failed')
      } finally {
        confirming.value = false
      }
    }

    async function loadBalance() {
      if (!activeAccount.value?.address) return
      try {
        const data = await api.getBalance(activeAccount.value.address)
        const raw = typeof data === 'object' && data !== null && 'balance' in data ? data.balance : data
        balance.value = raw != null && raw !== '' ? String(raw) : '0.00'
      } catch {
        balance.value = '0.00'
      }
    }

    async function loadFee() {
      try {
        const data = await api.getFee()
        fee.value = data != null && data !== '' ? String(data) : '0'
      } catch {
        fee.value = '0'
      }
    }

    watch(showConfirmModal, (v) => {
      if (!v) tempMasterKey.value = null
    })

    function onEscapeKey(e) {
      if (e.key !== 'Escape') return
      if (!showModal.value) return
      if (confirming.value) return
      if (showAddressBookModal.value) {
        closeAddressPickerModal()
        return
      }
      if (showPasswordModal.value) {
        showPasswordModal.value = false
        return
      }
      if (showConfirmModal.value) {
        closeConfirmModal()
        tempMasterKey.value = null
        return
      }
      closeModal()
    }

    onMounted(() => {
      if (CHAIN_ID !== '01') {
        router.replace({ name: 'Dashboard' })
        return
      }
      loadBalance()
      loadFee()
      window.addEventListener('keydown', onEscapeKey)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', onEscapeKey)
    })

    return {
      SWAP_BRIDGE_ADDRESS,
      SWAP_MIN_AMOUNT,
      showModal,
      showPasswordModal,
      showConfirmModal,
      form,
      errors,
      activeAccount,
      balance,
      feeDisplay,
      confirming,
      txSuccess,
      txId,
      explorerTxUrl,
      validateReceiver,
      validateAmount,
      setMaxAmount,
      requestSubmit,
      onPasswordConfirmed,
      executeSwap,
      closeModal,
      closeConfirmModal,
      onBackdropClick,
      resetAndClose,
      showAddressBookModal,
      addressBookContacts,
      recipientPickerTab,
      walletAccounts,
      openAddressBookModal,
      selectReceiver,
      closeAddressPickerModal
    }
  }
}
</script>

<style scoped>
/* Bootstrap .modal { pointer-events: none } prevents overlay clicks; re-enable for our layers */
.swap-modal.modal {
  pointer-events: auto;
  z-index: 1055;
}
.swap-modal-backdrop {
  z-index: 1050;
  background-color: rgba(41, 50, 55, 0.5);
}
.swap-confirm-modal.modal {
  pointer-events: auto;
  z-index: 1085;
}
.swap-confirm-backdrop {
  z-index: 1080;
  background-color: rgba(41, 50, 55, 0.55);
}
.swap-address-picker-modal.modal {
  pointer-events: auto;
  z-index: 1100;
}
.swap-address-picker-backdrop {
  z-index: 1095;
  background-color: rgba(41, 50, 55, 0.55);
}
</style>
