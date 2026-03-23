<template>
  <div class="min-h-screen">
    <div class="receive-page-wrap">
      <!-- Header -->
      <div class="mb-4">
        <h1 class="font-semibold mb-1" style="font-size: 1.5rem; font-weight: 500; color: #313533;">Receive PHP</h1>
        <p style="color: #74788d; font-size: 0.875rem;">Share your address to receive PHP Coin</p>
      </div>

      <div class="minia-card">
        <div v-if="activeAccount?.address">
          <div class="row g-4 g-lg-5 align-items-start">
            <!-- Left: address QR -->
            <div class="col-12 col-lg-5 text-start">
              <div class="d-inline-block p-4 p-lg-5 rounded-2xl shadow-lg receive-qr-wrap mb-4 mb-lg-3">
                <canvas ref="qrcodeRef" class="rounded-lg d-block"></canvas>
              </div>

              <div class="minia-card mb-4">
                <div class="p-4">
                  <div class="d-flex align-items-center justify-content-start gap-2 mb-3">
                    <Wallet :size="18" style="color: #5156be;" />
                    <div class="text-sm font-semibold" style="color: #5156be; font-size: 0.875rem;">Your Address</div>
                  </div>
                  <div class="font-mono text-sm text-break p-3 rounded" style="background: transparent; border: 1px solid var(--bs-border-color); font-size: 0.875rem;">
                    {{ activeAccount.address }}
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="btn btn-primary btn-lg w-100 receive-copy-address-btn"
                @click="copyAddress"
              >
                <Copy :size="18" />
                Copy Address
              </button>
            </div>

            <!-- Right: payment link -->
            <div class="col-12 col-lg-7 text-start receive-payment-col ps-lg-4 ps-xxl-5">
              <div class="d-flex align-items-center gap-2 mb-3">
                <Link2 :size="20" style="color: #5156be;" />
                <h2 class="h6 mb-0" style="color: #313533;">Payment link</h2>
              </div>
              <p class="text-muted small mb-3">
                Generates a <strong>signed</strong> link: you confirm with your wallet password (or session). The sender sees a green check on Send if the link was not altered.
              </p>

              <div class="mb-3">
                <label class="form-label">Amount (PHP, optional)</label>
                <input
                  v-model="paymentAmount"
                  type="text"
                  inputmode="decimal"
                  class="form-control"
                  placeholder="e.g. 10.5"
                  autocomplete="off"
                />
              </div>
              <div class="mb-3">
                <label class="form-label">Note for payer (optional)</label>
                <textarea
                  v-model="paymentMemo"
                  class="form-control"
                  rows="2"
                  placeholder="Invoice #123, coffee, …"
                  maxlength="400"
                ></textarea>
                <div class="form-text">Short text only; very long notes may not fit in some browsers’ URL limits.</div>
              </div>

              <button type="button" class="btn btn-outline-primary mb-3" @click="createPaymentLink">
                Generate signed link
              </button>

              <template v-if="generatedPaymentLink">
                <label class="form-label">Shareable link</label>
                <div class="input-group mb-3">
                  <input
                    type="text"
                    class="form-control font-monospace small"
                    :value="generatedPaymentLink"
                    readonly
                  />
                  <button type="button" class="btn btn-primary" title="Copy link" @click="copyPaymentLink">
                    <Copy :size="18" />
                  </button>
                </div>
                <div class="text-start p-3 p-md-4 rounded" style="background: rgba(81, 86, 190, 0.06);">
                  <p class="text-muted small mb-2 mb-md-3">QR for this link</p>
                  <canvas ref="paymentLinkQrRef" class="rounded d-block"></canvas>
                </div>
              </template>
            </div>
          </div>

          <div class="alert mt-4 mb-0 rounded text-start" style="background: rgba(75, 166, 239, 0.1); border: 1px solid rgba(75, 166, 239, 0.2); padding: 0.75rem 1.25rem;">
            <div class="d-flex gap-2">
              <Info :size="24" style="color: #4ba6ef; flex-shrink: 0;" />
              <div>
                <h3 class="font-semibold mb-1" style="color: #004085; font-size: 0.875rem;">How to receive</h3>
                <div class="text-sm" style="color: #004085; font-size: 0.875rem;">
                  Share this address or QR code with the sender. Make sure they send PHP Coin to this exact address.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="py-12 text-center">
          <div class="p-4 bg-gray-100 rounded-circle d-inline-block mb-4">
            <Wallet :size="32" class="text-phpcoin-text-secondary" />
          </div>
          <p class="text-phpcoin-text-secondary mb-0">No active account</p>
        </div>
      </div>

      <PasswordConfirmModal
        v-model="showLinkPasswordModal"
        action-label="Enter your password to sign this payment request with your private key."
        @confirm="onLinkPasswordConfirmed"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { Wallet, Copy, Info, Link2 } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import QRCode from 'qrcode'
import { toast } from '../utils/toast'
import {
  buildPaymentRequestLink,
  buildPaymentRequestSigningPayload,
  normalizePayReqAmount
} from '../utils/paymentLink'
import { getPublicKey, signMessage } from '../utils/wallet'
import PasswordConfirmModal from '../components/PasswordConfirmModal.vue'

export default {
  name: 'Receive',
  components: { Wallet, Copy, Info, Link2, PasswordConfirmModal },
  setup() {
    const authStore = useAuthStore()
    const accountsStore = useAccountsStore()
    const showLinkPasswordModal = ref(false)
    const qrcodeRef = ref(null)
    const paymentLinkQrRef = ref(null)
    const paymentAmount = ref('')
    const paymentMemo = ref('')
    const generatedPaymentLink = ref('')

    const activeAccount = computed(() => authStore.activeAccount)

    const generateQRCode = async () => {
      if (!activeAccount.value?.address) return

      await nextTick()

      if (!qrcodeRef.value) {
        console.error('Canvas element not found')
        return
      }

      try {
        await QRCode.toCanvas(qrcodeRef.value, activeAccount.value.address, {
          width: 256,
          margin: 2,
          color: {
            dark: '#F9FAFB',
            light: '#1F2937'
          }
        })
      } catch (error) {
        console.error('Failed to generate QR code:', error)
        toast.error('Failed to generate QR code')
      }
    }

    const generatePaymentLinkQr = async () => {
      const url = generatedPaymentLink.value
      await nextTick()
      if (!url || !paymentLinkQrRef.value) return
      try {
        await QRCode.toCanvas(paymentLinkQrRef.value, url, {
          width: 200,
          margin: 2,
          color: {
            dark: '#1F2937',
            light: '#FFFFFF'
          }
        })
      } catch (e) {
        console.error('Payment link QR:', e)
        toast.error('Could not draw link QR')
      }
    }

    const finalizeSignedPaymentLink = async (privateKeyOrMasterKey) => {
      const addr = activeAccount.value?.address
      if (!addr) return
      const amtRaw = paymentAmount.value.trim()
      if (amtRaw !== '') {
        const n = parseFloat(amtRaw.replace(/,/g, '.'))
        if (Number.isNaN(n) || n <= 0) {
          toast.warning('Enter a valid positive amount or leave it empty')
          return
        }
      }
      const memoTrim = paymentMemo.value.trim()
      const amtNorm = amtRaw === '' ? '' : normalizePayReqAmount(amtRaw)

      let privateKey = privateKeyOrMasterKey
      if (!authStore.isQuickLogin) {
        privateKey = accountsStore.getDecryptedPrivateKey(activeAccount.value, privateKeyOrMasterKey)
      }
      if (!privateKey) {
        toast.error('Could not unlock key for signing')
        return
      }

      const pub = getPublicKey(privateKey)
      if (!pub) {
        toast.error('Could not derive public key')
        return
      }

      const ts = Date.now()
      const canonical = buildPaymentRequestSigningPayload({
        to: addr,
        amount: amtNorm,
        memo: memoTrim,
        ts
      })
      const sig = signMessage(canonical, privateKey)
      if (!sig) {
        toast.error('Signing failed')
        return
      }

      generatedPaymentLink.value = buildPaymentRequestLink(addr, {
        amount: amtRaw === '' ? undefined : amtRaw,
        memo: memoTrim || undefined,
        ts,
        publicKey: pub,
        signature: sig
      })
      await nextTick()
      await generatePaymentLinkQr()
      toast.success('Signed link ready—sender can verify on Send')
    }

    const createPaymentLink = async () => {
      const addr = activeAccount.value?.address
      if (!addr) return
      const amtRaw = paymentAmount.value.trim()
      if (amtRaw !== '') {
        const n = parseFloat(amtRaw.replace(/,/g, '.'))
        if (Number.isNaN(n) || n <= 0) {
          toast.warning('Enter a valid positive amount or leave it empty')
          return
        }
      }
      if (authStore.isQuickLogin) {
        await finalizeSignedPaymentLink(authStore.masterKey)
        return
      }
      showLinkPasswordModal.value = true
    }

    const onLinkPasswordConfirmed = async (masterKey) => {
      showLinkPasswordModal.value = false
      await finalizeSignedPaymentLink(masterKey)
    }

    const copyAddress = async () => {
      if (!activeAccount.value?.address) return

      try {
        await navigator.clipboard.writeText(activeAccount.value.address)
        toast.success('Address copied to clipboard')
      } catch (error) {
        toast.error('Failed to copy address')
      }
    }

    const copyPaymentLink = async () => {
      if (!generatedPaymentLink.value) return
      try {
        await navigator.clipboard.writeText(generatedPaymentLink.value)
        toast.success('Link copied')
      } catch (e) {
        toast.error('Failed to copy link')
      }
    }

    watch(activeAccount, () => {
      generateQRCode()
      generatedPaymentLink.value = ''
    })

    onMounted(() => {
      generateQRCode()
    })

    return {
      qrcodeRef,
      paymentLinkQrRef,
      paymentAmount,
      paymentMemo,
      generatedPaymentLink,
      activeAccount,
      copyAddress,
      createPaymentLink,
      copyPaymentLink,
      showLinkPasswordModal,
      onLinkPasswordConfirmed
    }
  }
}
</script>

<style scoped>
.receive-page-wrap {
  max-width: 56rem;
  margin-left: 0;
  margin-right: auto;
}

.receive-qr-wrap {
  background: linear-gradient(145deg, rgba(81, 86, 190, 0.06), rgba(15, 23, 42, 0.04));
}

@media (min-width: 992px) {
  .receive-payment-col {
    border-left: 1px solid var(--bs-border-color, #e9ecef);
    min-height: 100%;
  }

  .receive-copy-address-btn {
    width: auto;
  }
}
</style>
