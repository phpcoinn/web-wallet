<template>
  <div class="min-h-screen">
    <div class="max-w-2xl">
      <!-- Header -->
      <div class="mb-4">
        <h1 class="font-semibold mb-1" style="font-size: 1.5rem; font-weight: 500; color: #313533;">Send PHP</h1>
        <p style="color: #74788d; font-size: 0.875rem;">Transfer PHP Coin to another address</p>
      </div>

      <!-- Send form -->
      <div class="minia-card">
        <div>
          <div
            v-if="paymentLinkVerify.status === 'verified'"
            class="alert alert-success py-2 px-3 mb-3 d-flex align-items-center gap-2"
            role="status"
          >
            <ShieldCheck :size="20" class="flex-shrink-0" />
            <div class="small">
              <strong>Payment link verified.</strong>
              You can continue and send this payment.
            </div>
          </div>
          <div
            v-else-if="paymentLinkVerify.status === 'invalid'"
            class="alert alert-warning py-2 px-3 mb-3 d-flex align-items-center gap-2"
            role="alert"
          >
            <AlertTriangle :size="20" class="flex-shrink-0" />
            <div class="small">
              <strong>Link could not be verified.</strong>
              {{ paymentLinkVerifyMessage }}
              You can still send manually if you trust the recipient.
            </div>
          </div>

          <form @submit.prevent="requestSubmit">
            <!-- Recipient Address -->
            <div class="mb-3">
              <label class="form-label">Recipient Address</label>
              <div class="input-group">
                <span class="input-group-text bg-light">
                  <User :size="18" style="color: #74788d;" />
                </span>
                <input
                  type="text"
                  class="form-control"
                  :class="{ 'is-invalid': errors.recipient }"
                  v-model="form.recipient"
                  placeholder="Enter recipient address"
                  @blur="validateField('recipient')"
                />
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  title="Scan QR code"
                  @click="openQrScanModal"
                >
                  <ScanLine :size="18" />
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  title="Choose from address book"
                  @click="openAddressBookModal"
                >
                  <BookOpen :size="18" />
                </button>
                <div v-if="errors.recipient" class="invalid-feedback">
                  {{ errors.recipient }}
                </div>
              </div>
            </div>

            <!-- Amount -->
            <div class="mb-3">
              <label class="form-label">Amount (PHP)</label>
              <div class="input-group">
                <span class="input-group-text bg-light">
                  <Coins :size="18" style="color: #74788d;" />
                </span>
                <input
                  type="number"
                  class="form-control"
                  :class="{ 'is-invalid': errors.amount }"
                  v-model.number="form.amount"
                  placeholder="0.00"
                  step="0.00000001"
                  min="0"
                  @blur="validateField('amount')"
                />
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :disabled="!balanceNum || balanceNum <= 0"
                  @click="setMaxAmount"
                >
                  Max
                </button>
              </div>
              <div v-if="errors.amount" class="invalid-feedback d-block">
                {{ errors.amount }}
              </div>
            </div>

            <!-- Fee (from API, read-only) -->
            <div class="mb-3">
              <label class="form-label">Network Fee (PHP)</label>
              <div class="input-group">
                <span class="input-group-text bg-light">
                  <Coins :size="18" style="color: #74788d;" />
                </span>
                <input
                  type="text"
                  class="form-control bg-light"
                  :value="feeDisplay"
                  disabled
                  readonly
                  aria-label="Network fee from blockchain"
                />
              </div>
            </div>

            <!-- Message -->
            <div class="mb-3">
              <label class="form-label">Message (Optional)</label>
              <div class="input-group">
                <span class="input-group-text bg-light align-items-start pt-2">
                  <MessageSquare :size="18" style="color: #74788d;" />
                </span>
                <textarea
                  class="form-control"
                  v-model="form.memo"
                  placeholder="Optional message or note"
                  rows="3"
                ></textarea>
              </div>
            </div>

            <!-- Available balance (display only; use Max to fill amount) -->
            <div
              v-if="activeAccount"
              class="alert mb-4 rounded send-available-balance"
              style="background: rgba(81, 86, 190, 0.1); border: 1px solid rgba(81, 86, 190, 0.2); padding: 0.75rem 1.25rem;"
            >
              <div class="d-flex align-items-center">
                <Wallet :size="20" style="color: #5156be; margin-right: 0.5rem;" />
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="text-sm" style="color: #74788d; font-size: 0.875rem;">Available Balance</span>
                    <span class="text-lg fw-bold" style="color: #5156be; font-size: 1.125rem;">{{ balance || '0.00' }} PHP</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              class="btn btn-primary btn-lg w-100"
              type="submit"
              :disabled="confirming"
            >
              <span v-if="confirming" class="spinner-border spinner-border-sm me-2" role="status"></span>
              <SendIcon :size="18" v-if="!confirming" style="margin-right: 0.5rem; vertical-align: middle;" />
              {{ confirming ? 'Sending...' : 'Review & Send' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Recipient picker modal (Address book + Accounts tabs) -->
    <Teleport to="body">
      <div v-if="showAddressBookModal" class="modal fade show" style="display: block;" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Choose recipient</h5>
              <button type="button" class="btn-close" @click="showAddressBookModal = false"></button>
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
                    No contacts in address book. <router-link to="/address-book" @click="showAddressBookModal = false">Add contacts</router-link>
                  </div>
                  <div v-else class="list-group list-group-flush">
                    <button
                      v-for="contact in addressBookContacts"
                      :key="contact.address"
                      type="button"
                      class="list-group-item list-group-item-action d-flex align-items-center"
                      @click="selectRecipient(contact)"
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
                      @click="selectRecipient(acc)"
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
      <div v-if="showAddressBookModal" class="modal-backdrop fade show"></div>
    </Teleport>

    <!-- Scan recipient QR -->
    <Teleport to="body">
      <div
        v-if="showQrScanModal"
        class="modal fade show send-qr-scan-modal"
        style="display: block;"
        tabindex="-1"
        @click.self="closeQrScanModal"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Scan address QR</h5>
              <button type="button" class="btn-close" aria-label="Close" @click="closeQrScanModal"></button>
            </div>
            <div class="modal-body">
              <p class="text-muted small mb-3 mb-md-0">
                Aim at a QR code with a PHP Coin address (or payment link).
              </p>
              <div
                id="send-recipient-qr-reader"
                class="send-qr-reader-host w-100 mx-auto mt-3"
              ></div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showQrScanModal" class="modal-backdrop fade show send-qr-scan-backdrop"></div>
    </Teleport>

    <!-- Confirm modal -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="modal fade show send-confirm-modal" style="display: block;" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Confirm transaction</h5>
              <button type="button" class="btn-close" @click="showConfirmModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <div class="d-flex justify-content-between mb-2 align-items-start">
                  <span class="text-muted">Recipient</span>
                  <Address :address="form.recipient" class="text-end" style="max-width: 60%;" />
                </div>
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-muted">Amount</span>
                  <span class="fw-medium">{{ form.amount }} PHP</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-muted">Fee</span>
                  <span>{{ feeDisplay }} PHP</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-muted">Total</span>
                  <span class="fw-medium">{{ totalDisplay }} PHP</span>
                </div>
                <div v-if="form.memo" class="d-flex justify-content-between">
                  <span class="text-muted">Message</span>
                  <span class="text-end text-break" style="max-width: 60%;">{{ form.memo }}</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showConfirmModal = false">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="confirming"
                @click="executeSend"
              >
                <span v-if="confirming" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ confirming ? 'Sending...' : 'Confirm & Send' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showConfirmModal" class="modal-backdrop fade show send-confirm-backdrop"></div>
    </Teleport>

    <!-- Success: transaction broadcast (alert-style dialog; form stays on page underneath) -->
    <Teleport to="body">
      <div
        v-if="showTxSuccessModal"
        class="modal fade show send-tx-success-modal"
        style="display: block;"
        tabindex="-1"
        role="alertdialog"
        aria-labelledby="send-tx-success-title"
        aria-modal="true"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header border-0 pb-0">
              <h5 id="send-tx-success-title" class="modal-title d-flex align-items-center gap-2 mb-0">
                <span class="d-inline-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10" style="width: 40px; height: 40px;">
                  <Check :size="22" class="text-success" />
                </span>
                Transaction broadcast
              </h5>
              <button type="button" class="btn-close" aria-label="Close" @click="dismissTxSuccessModal"></button>
            </div>
            <div class="modal-body pt-3">
              <div class="alert alert-success mb-0 py-3" role="status">
                <p class="mb-2">
                  Your transaction is in the mempool, awaiting confirmation. You can check status on the explorer.
                </p>
                <p v-if="txId" class="mb-0 small">
                  <span class="text-muted">Transaction ID:</span>
                  <code class="user-select-all font-monospace ms-1" style="font-size: 0.875rem;">{{ txId }}</code>
                </p>
              </div>
            </div>
            <div class="modal-footer border-0 flex-wrap gap-2 justify-content-center pt-0">
              <a
                v-if="txId"
                :href="explorerTxUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-outline-primary"
              >
                View on explorer
              </a>
              <router-link to="/dashboard" class="btn btn-outline-secondary" @click="dismissTxSuccessModal">
                Dashboard
              </router-link>
              <button type="button" class="btn btn-primary" @click="resetForm">
                Send another
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showTxSuccessModal" class="modal-backdrop fade show send-tx-success-backdrop"></div>
    </Teleport>

    <!-- Password confirm -->
    <PasswordConfirmModal
      v-model="showPasswordModal"
      action-label="Enter your password to confirm this transaction."
      @confirm="onPasswordConfirmed"
    />
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Send as SendIcon, User, Coins, MessageSquare, Wallet, Check, BookOpen, ScanLine, ShieldCheck, AlertTriangle } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { getPublicKey, signMessage, verifyAddress } from '../utils/wallet'
import { parseRecipientAddressFromQrPayload } from '../utils/qrAddress'
import { verifyPaymentRequestQuery } from '../utils/paymentLink'
import { api, EXPLORER_BASE } from '../utils/api'
import { getAddressBook } from '../utils/db'
import { toast } from '../utils/toast'
import PasswordConfirmModal from '../components/PasswordConfirmModal.vue'
import Address from '../components/Address.vue'

export default {
  name: 'Send',
  components: { Address, PasswordConfirmModal, SendIcon, User, Coins, MessageSquare, Wallet, Check, BookOpen, ScanLine, ShieldCheck, AlertTriangle },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()
    const accountsStore = useAccountsStore()
    const { activeAccount: storeActiveAccount, masterKey: storeMasterKey, isQuickLogin: storeIsQuickLogin } = storeToRefs(authStore)
    const { accounts: storeAccounts } = storeToRefs(accountsStore)

    const confirming = ref(false)
    const balance = ref('0.00')
    const fee = ref('0')
    const errors = reactive({})
    const showConfirmModal = ref(false)
    const showPasswordModal = ref(false)
    const showAddressBookModal = ref(false)
    const showQrScanModal = ref(false)
    const qrScannerInstance = ref(null)
    let qrScanHandled = false

    const paymentLinkVerify = ref({ status: 'unsigned' })

    const PAY_LINK_VERIFY_TEXT = {
      bad_signature: 'Signature does not match (the link may have been edited).',
      pubkey_mismatch: 'Public key does not match the recipient address.',
      missing_address: 'Missing recipient in link.',
      bad_timestamp: 'Invalid timestamp in link.'
    }

    const paymentLinkVerifyMessage = computed(() => {
      const r = paymentLinkVerify.value
      if (r.status !== 'invalid') return ''
      return PAY_LINK_VERIFY_TEXT[r.reason] || 'Verification failed.'
    })

    const stopQrScanner = async () => {
      const inst = qrScannerInstance.value
      qrScannerInstance.value = null
      if (!inst) return
      try {
        await inst.stop()
      } catch (_) {}
    }

    const closeQrScanModal = async () => {
      await stopQrScanner()
      showQrScanModal.value = false
    }

    const openQrScanModal = async () => {
      qrScanHandled = false
      showQrScanModal.value = true
      await nextTick()
      await stopQrScanner()
      const mountEl = document.getElementById('send-recipient-qr-reader')
      if (!mountEl) return
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const html5Qr = new Html5Qrcode('send-recipient-qr-reader')
        qrScannerInstance.value = html5Qr
        await html5Qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          async (decodedText) => {
            if (qrScanHandled) return
            const addr = parseRecipientAddressFromQrPayload(decodedText, verifyAddress)
            if (!addr) {
              toast.warning('QR does not contain a valid PHP Coin address')
              return
            }
            if (activeAccount.value && addr === activeAccount.value.address) {
              toast.warning('Cannot send to your own address')
              return
            }
            qrScanHandled = true
            try {
              await html5Qr.stop()
            } catch (_) {}
            qrScannerInstance.value = null
            showQrScanModal.value = false
            form.recipient = addr
            validateField('recipient')
            toast.success('Address scanned')
          },
          () => {}
        )
      } catch (err) {
        console.error('QR scanner:', err)
        toast.error(err?.message || 'Could not use camera for scanning')
        await closeQrScanModal()
      }
    }
    const addressBookContacts = ref([])
    const recipientPickerTab = ref('addressbook')
    const tempMasterKey = ref(null)
    const showTxSuccessModal = ref(false)
    const txId = ref('')

    const activeAccount = computed(() => storeActiveAccount.value)
    const walletAccounts = computed(() => {
      const accounts = storeAccounts.value || []
      if (accounts.length > 0) return accounts
      const active = storeActiveAccount.value
      return active ? [active] : []
    })

    const form = reactive({
      recipient: '',
      amount: null,
      memo: ''
    })

    const balanceNum = computed(() => {
      const b = parseFloat(String(balance.value || '0'))
      return isNaN(b) ? 0 : b
    })

    const feeDisplay = computed(() => fee.value || '0')
    const feeNum = computed(() => parseFloat(String(fee.value || '0')) || 0)

    const totalDisplay = computed(() => {
      const amt = parseFloat(form.amount) || 0
      return (amt + feeNum.value).toFixed(8)
    })

    const explorerTxUrl = computed(() => {
      if (!txId.value) return EXPLORER_BASE
      const base = EXPLORER_BASE.endsWith('/') ? EXPLORER_BASE : EXPLORER_BASE + '/'
      return `${base}tx.php?id=${encodeURIComponent(txId.value)}`
    })

    const validateField = (field) => {
      delete errors[field]

      if (field === 'recipient') {
        const addr = form.recipient.trim()
        if (!addr) {
          errors.recipient = 'Please enter recipient address'
        } else {
          let valid = false
          try {
            valid = verifyAddress(addr)
          } catch (_) {
            valid = false
          }
          if (!valid) {
            errors.recipient = 'Invalid address format'
          } else if (activeAccount.value && addr === activeAccount.value.address) {
            errors.recipient = 'Cannot send to your own address'
          }
        }
      } else if (field === 'amount') {
        if (form.amount === null || form.amount === '') {
          errors.amount = 'Please enter an amount'
        } else if (form.amount <= 0) {
          errors.amount = 'Amount must be greater than 0'
        } else if (form.amount < 0.00000001) {
          errors.amount = 'Amount is too small'
        } else {
          const total = form.amount + feeNum.value
          if (total > balanceNum.value) {
            errors.amount = 'Insufficient balance (including fee)'
          }
        }
      }
    }

    const validateForm = () => {
      Object.keys(errors).forEach(key => delete errors[key])
      validateField('recipient')
      validateField('amount')
      return Object.keys(errors).length === 0
    }

    const openAddressBookModal = async () => {
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
        console.error('Failed to load recipient picker:', err)
        toast.error('Failed to load')
      }
    }

    const selectRecipient = (item) => {
      form.recipient = item.address
      validateField('recipient')
      showAddressBookModal.value = false
    }

    const setMaxAmount = () => {
      const max = Math.max(0, balanceNum.value - feeNum.value)
      form.amount = max < 0.00000001 ? 0 : parseFloat(max.toFixed(8))
      validateField('amount')
    }

    const requestSubmit = () => {
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

    const onPasswordConfirmed = (masterKey) => {
      showPasswordModal.value = false
      tempMasterKey.value = masterKey
      showConfirmModal.value = true
    }

    const executeSend = async () => {
      if (!validateForm()) {
        showConfirmModal.value = false
        return
      }

      const masterKey = storeIsQuickLogin.value
        ? storeMasterKey.value
        : tempMasterKey.value || storeMasterKey.value

      if (!masterKey) {
        toast.error('No active account')
        showConfirmModal.value = false
        return
      }

      const acc = storeActiveAccount.value
      if (!acc) {
        toast.error('No active account')
        showConfirmModal.value = false
        return
      }

      // Close confirmation before network work so error/success toasts are not behind this modal
      showConfirmModal.value = false
      confirming.value = true

      try {
        tempMasterKey.value = null
        const privateKey = storeIsQuickLogin.value
          ? storeMasterKey.value
          : accountsStore.getDecryptedPrivateKey(acc, masterKey)

        const transactionData = {
          from: acc.address,
          to: form.recipient.trim(),
          amount: form.amount.toString(),
          message: form.memo || '',
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
        if (id) {
          txId.value = String(id)
        }

        showTxSuccessModal.value = true
        loadBalance()
      } catch (error) {
        console.error('Send error:', error)
        toast.error(error.message || 'Failed to send transaction')
      } finally {
        confirming.value = false
      }
    }

    const dismissTxSuccessModal = () => {
      showTxSuccessModal.value = false
      loadBalance()
    }

    const resetForm = () => {
      showTxSuccessModal.value = false
      txId.value = ''
      form.recipient = ''
      form.amount = null
      form.memo = ''
      Object.keys(errors).forEach(key => delete errors[key])
      applyPrefillFromRoute()
      loadBalance()
      loadFee()
    }

    const loadBalance = async () => {
      if (!activeAccount.value?.address) return
      try {
        const data = await api.getBalance(activeAccount.value.address)
        const raw =
          typeof data === 'object' && data !== null && 'balance' in data
            ? data.balance
            : data
        balance.value = raw != null && raw !== '' ? String(raw) : '0.00'
      } catch (error) {
        console.error('Failed to load balance:', error)
        balance.value = '0.00'
      }
    }

    const loadFee = async () => {
      try {
        const data = await api.getFee()
        fee.value = data != null && data !== '' ? String(data) : '0'
      } catch (error) {
        console.error('Failed to load fee:', error)
        fee.value = '0'
      }
    }

    watch(showConfirmModal, (v) => {
      if (!v) tempMasterKey.value = null
    })

    watch(
      () => activeAccount.value?.address,
      (addr) => {
        if (!addr) return
        loadBalance()
        validateField('amount')
      }
    )

    onBeforeUnmount(() => {
      stopQrScanner()
    })

    const applyPrefillFromRoute = () => {
      const q = route.query
      if (q.to != null && typeof q.to === 'string' && q.to.trim()) {
        form.recipient = q.to.trim()
      }
      if (q.amount != null && String(q.amount).trim() !== '') {
        const n = parseFloat(String(q.amount).replace(/,/g, '.'))
        if (!Number.isNaN(n) && n > 0) form.amount = n
      }
      if (q.memo != null && typeof q.memo === 'string') {
        form.memo = q.memo.trim()
      }
      paymentLinkVerify.value = verifyPaymentRequestQuery(q)
    }

    onMounted(() => {
      applyPrefillFromRoute()
      loadBalance()
      loadFee()
    })

    watch(
      () => route.query,
      () => {
        applyPrefillFromRoute()
      },
      { deep: true }
    )

    return {
      form,
      errors,
      confirming,
      requestSubmit,
      validateField,
      activeAccount,
      balance,
      balanceNum,
      setMaxAmount,
      feeDisplay,
      feeNum,
      totalDisplay,
      showConfirmModal,
      showPasswordModal,
      showAddressBookModal,
      addressBookContacts,
      recipientPickerTab,
      walletAccounts,
      openAddressBookModal,
      showQrScanModal,
      openQrScanModal,
      closeQrScanModal,
      selectRecipient,
      executeSend,
      onPasswordConfirmed,
      showTxSuccessModal,
      dismissTxSuccessModal,
      txId,
      explorerTxUrl,
      resetForm,
      paymentLinkVerify,
      paymentLinkVerifyMessage
    }
  }
}
</script>

<style scoped>
.send-confirm-modal {
  z-index: 1075;
}

.send-confirm-backdrop {
  z-index: 1070;
  background-color: rgba(0, 0, 0, 0.6);
}

.send-tx-success-modal {
  z-index: 1090;
}

.send-tx-success-backdrop {
  z-index: 1085;
  background-color: rgba(0, 0, 0, 0.6);
}

.send-qr-scan-modal {
  z-index: 1085;
}

.send-qr-scan-backdrop {
  z-index: 1080;
}

.send-qr-reader-host {
  max-width: 400px;
  min-height: 200px;
}

.text-break {
  word-break: break-all;
}

</style>
