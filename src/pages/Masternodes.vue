<template>
  <div>
    <div class="row">
      <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0 font-size-18">Masternodes</h4>
          <div class="page-title-right">
            <ol class="breadcrumb m-0">
              <li class="breadcrumb-item"><a href="javascript: void(0);">Wallet</a></li>
              <li class="breadcrumb-item active">Masternodes</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <template v-if="!address">
      <div class="alert alert-info">No active account. Log in to view masternode information.</div>
    </template>

    <template v-else>
      <div v-if="loading" class="text-center py-5 text-muted">
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Loading…
      </div>

      <template v-else-if="addressInfo">
        <!-- no_masternode: create form + list of my masternodes -->
        <template v-if="addressInfo.type === 'no_masternode'">
          <div class="card">
            <div class="card-header">
              <h5 class="card-title mb-0">Masternodes</h5>
            </div>
            <div class="card-body">
              <p class="text-muted small">Create a masternode by sending the required collateral to the masternode address. Cold masternode: use a reward address to receive rewards on a different address.</p>
              <form @submit.prevent="submitCreate" class="row g-3 align-items-end">
                <div class="col-md-4">
                  <label class="form-label">Masternode address</label>
                  <div class="input-group">
                    <input
                      v-model="createForm.mn_address"
                      type="text"
                      class="form-control font-monospace"
                      placeholder="Address"
                      required
                    />
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      title="Choose from address book or accounts"
                      @click="openAddressPicker('mn_address')"
                    >
                      <BookOpen :size="18" />
                    </button>
                  </div>
                </div>
                <div v-if="addressInfo.cold_masternode_enabled" class="col-md-4">
                  <label class="form-label">Reward address (optional, cold MN)</label>
                  <div class="input-group">
                    <input
                      v-model="createForm.reward_address"
                      type="text"
                      class="form-control font-monospace"
                      placeholder="Reward address"
                    />
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      title="Choose from address book or accounts"
                      @click="openAddressPicker('reward_address')"
                    >
                      <BookOpen :size="18" />
                    </button>
                  </div>
                </div>
                <div class="col-md-4">
                  <button type="submit" class="btn btn-primary" :disabled="createSubmitting">
                    <span v-if="createSubmitting" class="spinner-border spinner-border-sm me-1"></span>
                    Create new masternode
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div v-if="walletMasternodes && walletMasternodes.length > 0" class="card mt-3">
            <div class="card-header">
              <h5 class="card-title mb-0">Your masternodes</h5>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm table-striped mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Address</th>
                      <th>Collateral</th>
                      <th>Reward address</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="mn in walletMasternodes" :key="mn.masternode_address">
                      <td>
                        <Address :address="mn.masternode_address" :no-popover="false" />
                        <span v-if="isColdMn(mn)" class="badge rounded-pill bg-light text-dark font-size-12 ms-1">Cold</span>
                      </td>
                      <td>{{ mn.collateral }}</td>
                      <td>
                        <template v-if="isColdMn(mn)">
                          <Address :address="mn.reward_address" :no-popover="false" />
                        </template>
                        <span v-else class="text-muted">—</span>
                      </td>
                      <td>{{ mn.masternode_balance ?? '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>

        <!-- cold_masternode: this address is the cold masternode (reward elsewhere) -->
        <div v-else-if="addressInfo.type === 'cold_masternode'" class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Account is cold masternode</h5>
          </div>
          <div class="card-body">
            <template v-if="addressInfo.masternodes && addressInfo.masternodes[0]">
              <dl class="row mb-0">
                <dt class="col-sm-3">Creator</dt>
                <dd class="col-sm-9"><Address :address="addressInfo.masternodes[0].src" /></dd>
                <dt class="col-sm-3">Collateral</dt>
                <dd class="col-sm-9">{{ addressInfo.masternodes[0].collateral }}</dd>
                <dt class="col-sm-3">Height</dt>
                <dd class="col-sm-9">
                  <a :href="explorerBlockUrl(addressInfo.masternodes[0].height)" target="_blank" rel="noopener noreferrer">{{ addressInfo.masternodes[0].height }}</a>
                </dd>
                <dt class="col-sm-3">Reward address</dt>
                <dd class="col-sm-9"><Address :address="addressInfo.masternodes[0].dst" /></dd>
              </dl>
            </template>
          </div>
        </div>

        <!-- hot_masternode: this address is the hot masternode, can remove -->
        <div v-else-if="addressInfo.type === 'hot_masternode'" class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Account is hot masternode</h5>
          </div>
          <div class="card-body">
            <template v-if="addressInfo.masternodes && addressInfo.masternodes[0]">
              <dl class="row mb-3">
                <dt class="col-sm-3">Creator</dt>
                <dd class="col-sm-9"><Address :address="addressInfo.masternodes[0].src" /></dd>
                <dt class="col-sm-3">Collateral</dt>
                <dd class="col-sm-9">{{ addressInfo.masternodes[0].collateral }}</dd>
                <dt class="col-sm-3">Height</dt>
                <dd class="col-sm-9">
                  <a :href="explorerBlockUrl(addressInfo.masternodes[0].height)" target="_blank" rel="noopener noreferrer">{{ addressInfo.masternodes[0].height }}</a>
                </dd>
              </dl>
              <hr />
              <form @submit.prevent="submitRemove" class="row g-3 align-items-end">
                <div class="col-md-6">
                  <label class="form-label">Payout address</label>
                  <div class="input-group">
                    <input
                      v-model="removeForm.payout_address"
                      type="text"
                      class="form-control font-monospace"
                      placeholder="Where to send collateral"
                      required
                    />
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      title="Choose from address book or accounts"
                      @click="openAddressPicker('payout_address')"
                    >
                      <BookOpen :size="18" />
                    </button>
                  </div>
                </div>
                <div class="col-md-6">
                  <button type="submit" class="btn btn-danger" :disabled="removeSubmitting">
                    <span v-if="removeSubmitting" class="spinner-border spinner-border-sm me-1"></span>
                    Remove masternode
                  </button>
                </div>
              </form>
            </template>
          </div>
        </div>

        <!-- masternode_reward: this address receives rewards from one or more MNs, can remove -->
        <div v-else-if="addressInfo.type === 'masternode_reward'" class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Account is masternode reward</h5>
          </div>
          <div class="card-body">
            <div v-if="addressInfo.masternodes && addressInfo.masternodes.length > 0" class="table-responsive mb-3">
              <table class="table table-sm table-striped">
                <thead class="table-light">
                  <tr>
                    <th>Masternode</th>
                    <th>Creator</th>
                    <th>Collateral</th>
                    <th>Height</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="mn in addressInfo.masternodes" :key="mn.masternode">
                    <td><Address :address="mn.masternode" /></td>
                    <td><Address :address="mn.src" /></td>
                    <td>{{ mn.collateral }}</td>
                    <td>
                      <a :href="explorerBlockUrl(mn.height)" target="_blank" rel="noopener noreferrer">{{ mn.height }}</a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <hr />
            <form @submit.prevent="submitRemove" class="row g-3 align-items-end">
              <div v-if="addressInfo.masternodes && addressInfo.masternodes.length > 1" class="col-12">
                <label class="form-label">Select masternode to remove</label>
                <select v-model="removeForm.mn_address" class="form-select font-monospace" required>
                  <option value="">Select masternode …</option>
                  <option v-for="mn in addressInfo.masternodes" :key="mn.masternode" :value="mn.masternode">{{ mn.masternode }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Payout address</label>
                <div class="input-group">
                  <input
                    v-model="removeForm.payout_address"
                    type="text"
                    class="form-control font-monospace"
                    placeholder="Where to send collateral"
                    required
                  />
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    title="Choose from address book or accounts"
                    @click="openAddressPicker('payout_address')"
                  >
                    <BookOpen :size="18" />
                  </button>
                </div>
              </div>
              <div class="col-md-6">
                <button type="submit" class="btn btn-danger" :disabled="removeSubmitting">
                  <span v-if="removeSubmitting" class="spinner-border spinner-border-sm me-1"></span>
                  Remove masternode
                </button>
              </div>
            </form>
          </div>
        </div>

        <div v-else class="alert alert-secondary">
          No masternode information for this address (type: {{ addressInfo.type }}).
        </div>
      </template>

      <div v-else-if="loadError" class="alert alert-danger">
        {{ loadError }}
      </div>
    </template>

    <!-- Address picker modal (Address book + Accounts) -->
    <Teleport to="body">
      <div v-if="showAddressPickerModal" class="modal fade show" style="display: block;" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ addressPickerTitle }}</h5>
              <button type="button" class="btn-close" @click="showAddressPickerModal = false"></button>
            </div>
            <div class="modal-body p-0">
              <ul class="nav nav-tabs px-3 pt-2 mb-0" role="tablist">
                <li class="nav-item" role="presentation">
                  <button
                    type="button"
                    class="nav-link"
                    :class="{ active: addressPickerTab === 'addressbook' }"
                    @click="addressPickerTab = 'addressbook'"
                  >
                    Address book
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button
                    type="button"
                    class="nav-link"
                    :class="{ active: addressPickerTab === 'accounts' }"
                    @click="addressPickerTab = 'accounts'"
                  >
                    Accounts
                  </button>
                </li>
              </ul>
              <div class="p-3">
                <div v-show="addressPickerTab === 'addressbook'">
                  <div v-if="addressPickerContacts.length === 0" class="text-center py-4 text-muted">
                    No contacts in address book. <router-link to="/address-book" @click="showAddressPickerModal = false">Add contacts</router-link>
                  </div>
                  <div v-else class="list-group list-group-flush">
                    <button
                      v-for="contact in addressPickerContacts"
                      :key="contact.address"
                      type="button"
                      class="list-group-item list-group-item-action d-flex align-items-center"
                      @click="selectPickedAddress(contact.address)"
                    >
                      <div class="flex-grow-1 text-start overflow-hidden" style="min-width: 0;">
                        <div class="fw-medium">{{ contact.name || contact.address }}</div>
                        <code v-if="contact.name" class="font-monospace text-muted text-truncate d-block" style="font-size: 0.875rem;">{{ contact.address }}</code>
                      </div>
                    </button>
                  </div>
                </div>
                <div v-show="addressPickerTab === 'accounts'">
                  <div v-if="addressPickerAccounts.length === 0" class="text-center py-4 text-muted">
                    No accounts in wallet.
                  </div>
                  <div v-else class="list-group list-group-flush">
                    <button
                      v-for="acc in addressPickerAccounts"
                      :key="acc.address"
                      type="button"
                      class="list-group-item list-group-item-action d-flex align-items-center"
                      @click="selectPickedAddress(acc.address)"
                    >
                      <div class="flex-grow-1 text-start overflow-hidden" style="min-width: 0;">
                        <div class="fw-medium">{{ acc.name || acc.address }}</div>
                        <code v-if="acc.name" class="font-monospace text-muted text-truncate d-block" style="font-size: 0.875rem;">{{ acc.address }}</code>
                      </div>
                      <span v-if="address === acc.address" class="badge bg-primary flex-shrink-0 ms-2">Active</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showAddressPickerModal" class="modal-backdrop fade show"></div>
    </Teleport>

    <!-- Password modal for create/remove (multi-account) -->
    <PasswordConfirmModal
      v-model="showPasswordModal"
      :action-label="passwordModalActionLabel"
      @confirm="onPasswordConfirmed"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { storeToRefs } from 'pinia'
import { api } from '../utils/api'
import { EXPLORER_BASE } from '../utils/api'
import { getPublicKey, signMessage, normalizeMasternodeTxResponse, getTransactionSignatureBase, buildSignedMasternodeTx } from '../utils/wallet'
import Swal from 'sweetalert2'
import { verifyAddress } from '../utils/wallet'
import { getAddressBook } from '../utils/db'
import Address from '../components/Address.vue'
import PasswordConfirmModal from '../components/PasswordConfirmModal.vue'
import { BookOpen } from 'lucide-vue-next'
import { toast } from '../utils/toast'

export default {
  name: 'Masternodes',
  components: { Address, PasswordConfirmModal, BookOpen },
  setup() {
    const authStore = useAuthStore()
    const accountsStore = useAccountsStore()
    const { accounts: storeAccounts } = storeToRefs(accountsStore)
    const address = computed(() => authStore.activeAccount?.address || '')
    const showAddressPickerModal = ref(false)
    const addressPickerTarget = ref(null) // 'mn_address' | 'reward_address' | 'payout_address'
    const addressPickerContacts = ref([])
    const addressPickerTab = ref('addressbook')
    const addressPickerAccounts = computed(() => {
      const accounts = storeAccounts.value || []
      if (accounts.length > 0) return accounts
      const active = authStore.activeAccount
      return active ? [active] : []
    })
    const addressPickerTitle = computed(() => {
      const t = addressPickerTarget.value
      if (t === 'mn_address') return 'Choose masternode address'
      if (t === 'reward_address') return 'Choose reward address'
      return 'Choose payout address'
    })
    const loading = ref(true)
    const loadError = ref('')
    const addressInfo = ref(null)
    const walletMasternodes = ref([])

    const createForm = ref({ mn_address: '', reward_address: '' })
    const removeForm = ref({ payout_address: '', mn_address: '' })
    const createSubmitting = ref(false)
    const removeSubmitting = ref(false)
    const showPasswordModal = ref(false)
    const confirmSubmitting = ref(false)
    const passwordModalActionLabel = ref('Enter your password to confirm.')
    const pendingAction = ref(null) // { type: 'create'|'remove', payload, preparedTx, masterKey? }

    function explorerBlockUrl(height) {
      const base = EXPLORER_BASE.endsWith('/') ? EXPLORER_BASE : EXPLORER_BASE + '/'
      return `${base}block.php?height=${encodeURIComponent(height)}`
    }

    async function load() {
      const addr = address.value
      if (!addr) {
        loading.value = false
        return
      }
      loading.value = true
      loadError.value = ''
      addressInfo.value = null
      walletMasternodes.value = []
      try {
        const info = await api.getAddressInfo(addr)
        addressInfo.value = info
        if (info.type === 'no_masternode') {
          const list = await api.getMasternodesForAddress(addr)
          walletMasternodes.value = Array.isArray(list) ? list : []
        }
      } catch (e) {
        loadError.value = e.message || 'Failed to load address info'
      } finally {
        loading.value = false
      }
    }

    function isColdMn(mn) {
      return mn.reward_address != null && mn.reward_address !== '' && mn.reward_address !== mn.masternode_address
    }

    async function openAddressPicker(target) {
      addressPickerTarget.value = target
      addressPickerTab.value = 'addressbook'
      try {
        const contacts = await getAddressBook()
        addressPickerContacts.value = Array.isArray(contacts) ? contacts : []
        if (!authStore.isQuickLogin && authStore.masterKey && (!storeAccounts.value || storeAccounts.value.length === 0)) {
          await accountsStore.loadAccounts(authStore.masterKey)
        }
      } catch (err) {
        console.error('Failed to load address picker:', err)
        toast.error('Failed to load')
        return
      }
      showAddressPickerModal.value = true
    }

    function selectPickedAddress(addr) {
      const target = addressPickerTarget.value
      if (target === 'mn_address') createForm.value.mn_address = addr
      else if (target === 'reward_address') createForm.value.reward_address = addr
      else if (target === 'payout_address') removeForm.value.payout_address = addr
      showAddressPickerModal.value = false
    }

    async function submitCreate() {
      const mn = createForm.value.mn_address?.trim()
      const reward = createForm.value.reward_address?.trim()
      if (!mn) {
        toast.error('Enter masternode address')
        return
      }
      if (!verifyAddress(mn)) {
        toast.error('Invalid masternode address')
        return
      }
      if (reward && !verifyAddress(reward)) {
        toast.error('Invalid reward address')
        return
      }
      try {
        createSubmitting.value = true
        const preparedTx = await api.generateMasternodeCreateTx(address.value, mn, reward || undefined)
        pendingAction.value = { type: 'create', payload: { mn_address: mn, reward_address: reward }, preparedTx }
        if (authStore.isQuickLogin) {
          await executeConfirm()
        } else {
          passwordModalActionLabel.value = 'Enter your password to sign the create masternode transaction.'
          showPasswordModal.value = true
        }
      } catch (e) {
        toast.error(e.message || 'Failed to prepare transaction')
      } finally {
        createSubmitting.value = false
      }
    }

    async function submitRemove() {
      const payout = removeForm.value.payout_address?.trim()
      const mnAddr = removeForm.value.mn_address?.trim()
      if (!payout) {
        toast.error('Enter payout address')
        return
      }
      if (!verifyAddress(payout)) {
        toast.error('Invalid payout address')
        return
      }
      try {
        removeSubmitting.value = true
        const preparedTx = await api.generateMasternodeRemoveTx(address.value, payout, mnAddr || undefined)
        pendingAction.value = { type: 'remove', payload: { payout_address: payout, mn_address: mnAddr }, preparedTx }
        if (authStore.isQuickLogin) {
          await executeConfirm()
        } else {
          passwordModalActionLabel.value = 'Enter your password to sign the remove masternode transaction.'
          showPasswordModal.value = true
        }
      } catch (e) {
        toast.error(e.message || 'Failed to prepare transaction')
      } finally {
        removeSubmitting.value = false
      }
    }

    async function onPasswordConfirmed(masterKey) {
      showPasswordModal.value = false
      if (!pendingAction.value) {
        return
      }
      pendingAction.value.masterKey = masterKey
      await executeConfirm()
    }

    async function executeConfirm() {
      const action = pendingAction.value
      if (!action || !address.value) {
        return
      }
      if (!action.preparedTx) {
        await Swal.fire({ icon: 'error', title: 'Error', text: 'Transaction not prepared. Try again.' })
        pendingAction.value = null
        return
      }
      const acc = authStore.activeAccount
      const masterKey = authStore.isQuickLogin ? authStore.masterKey : action.masterKey
      if (!masterKey && !authStore.isQuickLogin) {
        await Swal.fire({ icon: 'error', title: 'Error', text: 'Password required' })
        pendingAction.value = null
        return
      }
      try {
        confirmSubmitting.value = true
        const privateKey = authStore.isQuickLogin ? masterKey : accountsStore.getDecryptedPrivateKey(acc, masterKey)
        const publicKey = getPublicKey(privateKey)
        const date = Math.floor(Date.now() / 1000)
        const res = action.preparedTx
        // Normalize API response (create/remove return flat { val, fee, dst, src, msg, type }) then build signature base manually
        const payload = normalizeMasternodeTxResponse(res)
        if (!payload || payload.val == null || payload.dst == null || payload.src == null) {
          await Swal.fire({ icon: 'error', title: 'Error', text: 'Invalid transaction data from API' })
          confirmSubmitting.value = false
          return
        }
        const signatureBase = getTransactionSignatureBase(payload, publicKey, date)
        const signature = signMessage(signatureBase, privateKey)
        const tx = buildSignedMasternodeTx(payload, publicKey, signature, date)
        const result = await api.sendTransaction(tx)
        const txId = result?.id ?? result?.tx_id ?? result?.transaction_id ?? result?.hash
        const isCreate = action.type === 'create'
        await Swal.fire({
          icon: 'success',
          title: isCreate ? 'Masternode created' : 'Masternode removed',
          text: (isCreate ? 'Create transaction broadcast successfully.' : 'Remove transaction broadcast successfully.') + (txId ? ` Transaction: ${txId}` : ''),
          confirmButtonText: 'OK'
        })
        if (action.type === 'create') createForm.value = { mn_address: '', reward_address: '' }
        else removeForm.value = { payout_address: '', mn_address: '' }
        pendingAction.value = null
        await load()
      } catch (e) {
        const msg = e.message || 'Transaction failed'
        const res = e.response
        const dataStr = res != null && typeof res === 'object' && res.data != null ? String(res.data) : null
        const text = dataStr ? `${msg}\n\n${dataStr}` : msg
        await Swal.fire({
          icon: 'error',
          title: 'Transaction failed',
          text
        })
      } finally {
        confirmSubmitting.value = false
      }
    }

    watch(address, () => load(), { immediate: true })
    onMounted(() => {})

    return {
      address,
      loading,
      loadError,
      addressInfo,
      walletMasternodes,
      createForm,
      removeForm,
      createSubmitting,
      removeSubmitting,
      showPasswordModal,
      confirmSubmitting,
      passwordModalActionLabel,
      showAddressPickerModal,
      addressPickerTarget,
      addressPickerContacts,
      addressPickerTab,
      addressPickerAccounts,
      addressPickerTitle,
      openAddressPicker,
      selectPickedAddress,
      submitCreate,
      submitRemove,
      onPasswordConfirmed,
      executeConfirm,
      isColdMn,
      explorerBlockUrl
    }
  }
}
</script>

