<template>
  <div class="min-h-screen">
    <div class="w-100">
      <!-- Header -->
      <div class="mb-4">
        <h1 class="font-semibold mb-1" style="font-size: 1.5rem; font-weight: 500; color: #313533;">Account Manager</h1>
        <p style="color: #74788d; font-size: 0.875rem;">Manage your PHP Coin accounts</p>
      </div>

      <!-- Legacy wallet data notice -->
      <div v-if="hasLegacyWallet" class="alert alert-info d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div class="d-flex align-items-center">
          <Info :size="20" class="me-2 flex-shrink-0" />
          <span><strong>Legacy multiwallet data</strong> is still stored in your browser. Your accounts have been migrated. You can safely delete this old data.</span>
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm" @click="requestClearLegacyWallet">
          Delete legacy data
        </button>
      </div>

      <!-- Account Manager Card - Minia Exact Style -->
      <div class="minia-card">
        <div>
          <div class="mb-4 d-flex gap-2">
            <button class="btn btn-primary" @click="showAddModal = true">
              <Plus :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
              Add Account
            </button>
            <button class="btn btn-outline-primary" @click="openImportModal">
              <Upload :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
              Import Account
            </button>
            <button
              v-if="accounts.length > 0"
              class="btn btn-outline-secondary"
              title="Export backup"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              @click="requestExportBackup"
            >
              <Download :size="18" class="me-1" style="vertical-align: middle;" />
              Export backup
            </button>
            <button
              v-if="accounts.length > 0"
              class="btn btn-outline-secondary"
              title="Refresh balances"
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              :disabled="refreshingBalances"
              @click="refreshBalances"
            >
              <span v-if="refreshingBalances" class="spinner-border spinner-border-sm me-1" role="status"></span>
              <RefreshCw v-else :size="18" class="me-1" style="vertical-align: middle;" />
              Refresh
            </button>
          </div>
          
          <div v-if="accounts.length === 0" class="text-center py-12">
            <div class="p-4 bg-gray-100 rounded-circle d-inline-block mb-4">
              <Users :size="32" class="text-phpcoin-text-secondary" />
            </div>
            <p class="text-phpcoin-text-primary font-medium">No accounts yet</p>
            <p class="text-sm text-phpcoin-text-secondary mt-2">Create your first account to get started</p>
            <div class="mt-4 d-flex gap-2 justify-content-center">
              <button class="btn btn-primary" @click="showAddModal = true">
                <Plus :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
                Add Your First Account
              </button>
              <button class="btn btn-outline-primary" @click="openImportModal">
                <Upload :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
                Import Account
              </button>
            </div>
          </div>
          
          <div v-else>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 w-100">
                <thead class="table-light">
                  <tr>
                    <th style="width: 150px;">Actions</th>
                    <th>Address</th>
                    <th>Name</th>
                    <th>Balance</th>
                    <th>Created</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="account in accounts" :key="account.address">
                    <td>
                      <div class="d-flex gap-1">
                        <button
                          class="btn btn-sm btn-info"
                          title="View account"
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          @click="hideTooltips(); openViewModal(account)"
                        >
                          <Eye :size="16" />
                        </button>
                        <button
                          class="btn btn-sm btn-warning"
                          title="Edit account"
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          @click="hideTooltips(); openEditModal(account)"
                        >
                          <Pencil :size="16" />
                        </button>
                        <button
                          v-if="activeAccount?.address !== account.address"
                          class="btn btn-sm btn-success"
                          :title="`Switch to ${account.name}`"
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          @click="hideTooltips(); switchAccount(account)"
                        >
                          <ArrowRightLeft :size="16" />
                        </button>
                        <button
                          v-if="activeAccount?.address !== account.address"
                          class="btn btn-sm btn-danger"
                          title="Delete account"
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          @click="hideTooltips(); requestDeleteWithPassword(account)"
                        >
                          <Trash2 :size="16" />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span class="d-inline-flex align-items-center gap-1">
                        <Address :address="account.address" />
                        <span
                          v-if="account.description"
                          class="text-info d-inline-flex"
                          :title="account.description"
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          style="cursor: help;"
                        >
                          <Info :size="14" />
                        </span>
                      </span>
                    </td>
                    <td>
                      <span class="fw-medium">{{ account.name }}</span>
                    </td>
                    <td>
                      <span v-if="balances[account.address] !== undefined">
                        {{ balances[account.address] === '—' ? '—' : `${balances[account.address]} PHP` }}
                      </span>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td>
                      <span v-if="account.createdAt" class="text-muted" style="font-size: 0.875rem;">{{ formatDate(account.createdAt) }}</span>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td>
                      <span v-if="activeAccount?.address === account.address" class="badge bg-primary">Active</span>
                      <span v-else class="text-muted">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="mt-5 pt-4 border-top">
              <h6 class="text-danger mb-2">Danger zone</h6>
              <button
                type="button"
                class="btn btn-outline-danger btn-sm"
                @click="requestDeleteAllAccounts"
              >
                <Trash2 :size="16" class="me-1" style="vertical-align: middle;" />
                Delete all accounts
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add Account Modal - Bootstrap -->
      <div
        class="modal fade"
        :class="{ show: showAddModal }"
        :style="{ display: showAddModal ? 'block' : 'none' }"
        tabindex="-1"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add Account</h5>
              <button type="button" class="btn-close" @click="showAddModal = false"></button>
            </div>
            <div class="modal-body">
              <form @submit.prevent="handleAdd">
                <div class="mb-3">
                  <label class="form-label">Account Name <span class="text-muted">(optional)</span></label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="addForm.name"
                    placeholder="My Account"
                  />
                </div>
                <div class="mb-3">
                  <label class="form-label">Description</label>
                  <textarea
                    class="form-control"
                    v-model="addForm.description"
                    placeholder="Optional note about this account"
                    rows="2"
                  ></textarea>
                </div>
                <div class="mb-3">
                  <label class="form-label">Private Key</label>
                  <textarea
                    class="form-control"
                    v-model="addForm.privateKey"
                    placeholder="Enter private key or leave empty to generate new"
                    rows="3"
                  ></textarea>
                  <div class="form-text">Leave empty to generate a new account</div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="adding"
                @click="requestAddWithPassword"
              >
                <span v-if="adding" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ adding ? 'Adding...' : 'Add Account' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="showAddModal"
        class="modal-backdrop fade show"
      ></div>

      <!-- Import Account Modal -->
      <div
        class="modal fade"
        :class="{ show: showImportModal }"
        :style="{ display: showImportModal ? 'block' : 'none' }"
        tabindex="-1"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Import Account</h5>
              <button type="button" class="btn-close" @click="closeImportModal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Wallet file (.dat)</label>
                <input
                  ref="importFileInput"
                  type="file"
                  class="form-control"
                  accept=".dat"
                  @change="onImportFileSelected"
                />
                <div v-if="importError" class="text-danger small mt-1">{{ importError }}</div>
              </div>
              <template v-if="importedAccount">
                <div class="mb-3">
                  <label class="form-label">Address</label>
                  <input type="text" class="form-control font-monospace" :value="importedAccount.address" readonly style="word-break: break-all; font-size: 0.875rem;" />
                </div>
                <div class="mb-3">
                  <label class="form-label">Account Name <span class="text-muted">(optional)</span></label>
                  <input type="text" class="form-control" v-model="importForm.name" placeholder="Imported Account" />
                </div>
                <div class="mb-3">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" v-model="importForm.description" placeholder="Optional note" rows="2"></textarea>
                </div>
              </template>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeImportModal">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="!importedAccount || importing"
                @click="requestImportWithPassword"
              >
                <span v-if="importing" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ importing ? 'Importing...' : 'Import' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showImportModal" class="modal-backdrop fade show"></div>

      <PasswordConfirmModal
        v-model="showPasswordConfirm"
        action-label="Enter your password to add a new account."
        @confirm="onPasswordConfirmed"
      />

      <PasswordConfirmModal
        v-model="showRevealPasswordModal"
        action-label="Enter your password to reveal the private key."
        @confirm="onRevealPasswordConfirmed"
      />

      <PasswordConfirmModal
        v-model="showDeletePasswordModal"
        action-label="Enter your password to confirm account deletion."
        @confirm="onDeletePasswordConfirmed"
      />

      <PasswordConfirmModal
        v-model="showImportPasswordModal"
        action-label="Enter your password to import the account."
        @confirm="onImportPasswordConfirmed"
      />

      <PasswordConfirmModal
        v-model="showExportPasswordModal"
        action-label="Enter your password to export the backup."
        @confirm="onExportPasswordConfirmed"
      />

      <PasswordConfirmModal
        v-model="showDeleteAllPasswordModal"
        action-label="Enter your password to confirm wallet deletion."
        @confirm="onDeleteAllPasswordConfirmed"
      />

      <!-- Edit Account Modal -->
      <div
        class="modal fade"
        :class="{ show: showEditModal }"
        :style="{ display: showEditModal ? 'block' : 'none' }"
        tabindex="-1"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Edit Account</h5>
              <button type="button" class="btn-close" @click="showEditModal = false"></button>
            </div>
            <div class="modal-body" v-if="editAccount">
              <div class="mb-3">
                <label class="form-label">Address</label>
                <input type="text" class="form-control font-monospace" :value="editAccount.address" readonly />
              </div>
              <div class="mb-3">
                <label class="form-label">Public Key</label>
                <input type="text" class="form-control font-monospace" :value="editPublicKey" readonly style="word-break: break-all; font-size: 0.875rem;" />
              </div>
              <div class="mb-3">
                <label class="form-label">Account Name</label>
                <input
                  type="text"
                  class="form-control"
                  :class="{ 'is-invalid': editErrors.name }"
                  v-model="editForm.name"
                  placeholder="My Account"
                />
                <div v-if="editErrors.name" class="invalid-feedback">{{ editErrors.name }}</div>
              </div>
              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea
                  class="form-control"
                  v-model="editForm.description"
                  placeholder="Optional note about this account"
                  rows="2"
                ></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showEditModal = false">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="saving"
                @click="handleEditSave"
              >
                <span v-if="saving" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="showEditModal"
        class="modal-backdrop fade show"
      ></div>

      <!-- View Account Modal -->
      <div
        class="modal fade"
        :class="{ show: showViewModal }"
        :style="{ display: showViewModal ? 'block' : 'none' }"
        tabindex="-1"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">View Account</h5>
              <button type="button" class="btn-close" @click="closeViewModal"></button>
            </div>
            <div class="modal-body" v-if="viewAccount">
              <div class="mb-3">
                <label class="form-label">Address</label>
                <div class="input-group">
                  <input type="text" class="form-control font-monospace" :value="viewAccount.address" readonly style="word-break: break-all; font-size: 0.875rem;" />
                  <button type="button" class="btn btn-outline-secondary" @click="copyField('address', viewAccount.address)" :title="copiedField === 'address' ? 'Copied!' : 'Copy'">
                    <Check v-if="copiedField === 'address'" :size="16" class="text-success" />
                    <Copy v-else :size="16" />
                  </button>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Public Key</label>
                <div class="input-group">
                  <input type="text" class="form-control font-monospace" :value="viewPublicKey" readonly style="word-break: break-all; font-size: 0.875rem;" />
                  <button type="button" class="btn btn-outline-secondary" @click="copyField('publicKey', viewPublicKey)" :title="copiedField === 'publicKey' ? 'Copied!' : 'Copy'">
                    <Check v-if="copiedField === 'publicKey'" :size="16" class="text-success" />
                    <Copy v-else :size="16" />
                  </button>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Private Key</label>
                <div class="input-group">
                  <input
                    type="text"
                    class="form-control font-monospace"
                    :value="viewPrivateKeyRevealed ? viewPrivateKey : ''"
                    :placeholder="viewPrivateKeyRevealed ? '' : '••••••••••••••••'"
                    readonly
                    autocomplete="off"
                    style="word-break: break-all; font-size: 0.875rem;"
                  />
                  <template v-if="viewPrivateKeyRevealed">
                    <button type="button" class="btn btn-outline-secondary" @click="copyField('privateKey', viewPrivateKey)" :title="copiedField === 'privateKey' ? 'Copied!' : 'Copy'">
                      <Check v-if="copiedField === 'privateKey'" :size="16" class="text-success" />
                      <Copy v-else :size="16" />
                    </button>
                  </template>
                  <button v-else type="button" class="btn btn-primary" @click="requestRevealPrivateKey">
                    Reveal
                  </button>
                </div>
              </div>

              <div v-if="viewPrivateKeyRevealed && !viewExportBlockVisible" class="mt-3">
                <button type="button" class="btn btn-outline-primary" @click="viewExportBlockVisible = true">
                  Export account data
                </button>
              </div>

              <!-- Export section: after reveal, shown only after clicking Export account data -->
              <div v-if="viewPrivateKeyRevealed && viewExportBlockVisible" class="mt-4 pt-4 border-top">
                <h6 class="mb-3">Export</h6>
                <div class="mb-3">
                  <label class="form-label">Format</label>
                  <select class="form-select" v-model="exportFormat">
                    <option value="wallet">Wallet</option>
                    <option value="json">JSON</option>
                    <option value="php">PHP</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Exported data</label>
                  <div class="input-group align-items-start">
                    <textarea
                      class="form-control font-monospace"
                      :value="exportedText"
                      readonly
                      rows="4"
                      style="word-break: break-all; resize: vertical; font-size: 0.875rem;"
                    ></textarea>
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      @click="copyField('export', exportedText)"
                      :title="copiedField === 'export' ? 'Copied!' : 'Copy to clipboard'"
                    >
                      <Check v-if="copiedField === 'export'" :size="16" class="text-success" />
                      <Copy v-else :size="16" />
                    </button>
                  </div>
                </div>
                <div v-if="exportFormat === 'wallet'" class="mb-0">
                  <button type="button" class="btn btn-primary" @click="downloadWalletFile">
                    Download wallet file
                  </button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeViewModal">Close</button>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="showViewModal"
        class="modal-backdrop fade show"
      ></div>

    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Users, Plus, ArrowRightLeft, Trash2, Info, Pencil, Eye, Copy, Check, RefreshCw, Upload, Download } from 'lucide-vue-next'
import PasswordConfirmModal from '../components/PasswordConfirmModal.vue'
import Address from '../components/Address.vue'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { generateAccount, getAddress, getPublicKey } from '../utils/wallet'
import { useRouter } from 'vue-router'
import { api } from '../utils/api'
import { toast } from '../utils/toast'
import Swal from 'sweetalert2'
import { hasLegacyWallet as checkLegacyWallet, clearLegacyWallet } from '../utils/legacyWallet'
import { requestAuthSetupFlow } from '../utils/authEntryIntent'

export default {
  name: 'AccountManager',
  components: {
    Address,
    Users,
    Plus,
    Upload,
    Download,
    RefreshCw,
    ArrowRightLeft,
    Trash2,
    Info,
    Pencil,
    Eye,
    Copy,
    Check,
    PasswordConfirmModal
  },
  setup() {
    const authStore = useAuthStore()
    const accountsStore = useAccountsStore()
    
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const showViewModal = ref(false)
    const showPasswordConfirm = ref(false)
    const showRevealPasswordModal = ref(false)
    const showDeletePasswordModal = ref(false)
    const showImportPasswordModal = ref(false)
    const showExportPasswordModal = ref(false)
    const showDeleteAllPasswordModal = ref(false)
    const accountToDelete = ref(null)
    const showImportModal = ref(false)
    const importFileInput = ref(null)
    const importedAccount = ref(null)
    const importError = ref('')
    const importing = ref(false)
    const importForm = reactive({ name: '', description: '' })
    watch(showDeletePasswordModal, (v) => { if (!v) accountToDelete.value = null })
    const adding = ref(false)
    const saving = ref(false)
    const refreshingBalances = ref(false)
    const balances = reactive({})
    const errors = reactive({})
    const editErrors = reactive({})
    const editAccount = ref(null)
    const editForm = reactive({ name: '', description: '' })
    const viewAccount = ref(null)
    const viewPrivateKey = ref('')
    const viewPrivateKeyRevealed = ref(false)
    const viewExportBlockVisible = ref(false)
    const copiedField = ref('')
    const exportFormat = ref('json')
    
    const addForm = reactive({
      name: '',
      description: '',
      privateKey: ''
    })
    
    const accounts = computed(() => accountsStore.accounts)
    const activeAccount = computed(() => authStore.activeAccount)
    const legacyWalletCleared = ref(false)
    const hasLegacyWallet = computed(() => !legacyWalletCleared.value && checkLegacyWallet())

    async function requestClearLegacyWallet() {
      const result = await Swal.fire({
        title: 'Delete legacy data?',
        html: 'This will permanently remove the old multiwallet data (walletData, walletPassword) from your browser. Your current accounts are already migrated and will not be affected.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#fd625e',
        cancelButtonColor: '#74788d',
        confirmButtonText: 'Yes, delete it'
      })
      if (result.isConfirmed) {
        clearLegacyWallet()
        legacyWalletCleared.value = true
        toast.success('Legacy data removed')
      }
    }

    async function loadBalances() {
      for (const acc of accountsStore.accounts) {
        try {
          const data = await api.getBalance(acc.address)
          const raw = typeof data === 'object' && data !== null && 'balance' in data ? data.balance : data
          balances[acc.address] = raw != null && raw !== '' ? String(raw) : '0.00'
        } catch {
          balances[acc.address] = '—'
        }
      }
    }

    async function refreshBalances() {
      refreshingBalances.value = true
      try {
        await loadBalances()
      } finally {
        refreshingBalances.value = false
      }
    }
    
    const validateField = (field) => {
      delete errors[field]
    }
    
    const validateForm = () => {
      Object.keys(errors).forEach(key => delete errors[key])
      return true
    }

    function formatDate(ts) {
      if (!ts) return '—'
      const d = new Date(ts)
      return isNaN(d.getTime()) ? '—' : d.toLocaleString()
    }
    
    function hideTooltips() {
      document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        const t = window.bootstrap?.Tooltip?.getInstance(el)
        if (t) t.hide()
      })
    }

    function requestAddWithPassword() {
      if (!validateForm()) return
      showPasswordConfirm.value = true
    }

    async function onPasswordConfirmed(masterKey) {
      await handleAdd(masterKey)
    }

    function parseWalletFile(content) {
      const parts = content.trim().split(/\r\n|\r|\n/)
      if (parts.length < 2 || parts[0] !== 'phpcoin') {
        return null
      }
      const privateKey = parts[1]?.trim()
      if (!privateKey) return null
      const address = getAddress(privateKey)
      if (!address) return null
      return { privateKey, address }
    }

    function openImportModal() {
      importedAccount.value = null
      importError.value = ''
      importForm.name = ''
      importForm.description = ''
      showImportModal.value = true
      if (importFileInput.value) {
        importFileInput.value.value = ''
      }
    }

    function closeImportModal() {
      importedAccount.value = null
      importError.value = ''
      importForm.name = ''
      importForm.description = ''
      showImportModal.value = false
      showImportPasswordModal.value = false
      if (importFileInput.value) {
        importFileInput.value.value = ''
      }
    }

    function onImportFileSelected(event) {
      importError.value = ''
      importedAccount.value = null
      const file = event.target?.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result
          if (typeof content !== 'string') {
            importError.value = 'Could not read file'
            return
          }
          const parsed = parseWalletFile(content)
          if (!parsed) {
            importError.value = 'Invalid wallet file format'
            return
          }
          if (accountsStore.accounts.some((a) => a.address === parsed.address)) {
            importError.value = 'This address is already in your accounts'
            return
          }
          importedAccount.value = parsed
          const accountCount = accountsStore.accounts.length + 1
          importForm.name = importForm.name || `Account ${accountCount}`
        } catch {
          importError.value = 'Failed to parse wallet file'
        }
      }
      reader.readAsText(file)
    }

    function requestImportWithPassword() {
      if (!importedAccount.value) return
      showImportPasswordModal.value = true
    }

    function requestExportBackup() {
      if (accountsStore.accounts.length === 0) return
      showExportPasswordModal.value = true
    }

    function requestDeleteAllAccounts() {
      showDeleteAllPasswordModal.value = true
    }

    async function onDeleteAllPasswordConfirmed(masterKey) {
      showDeleteAllPasswordModal.value = false
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Delete all accounts?',
        html: `
          <p class="text-start mb-2"><strong>This action cannot be undone.</strong></p>
          <p class="text-start mb-2">All your accounts will be permanently deleted. Your wallet will be empty.</p>
          <p class="text-start mb-0 text-danger"><strong>Make sure you have exported a backup before proceeding.</strong> Without a backup, you will lose access to your funds forever.</p>
        `,
        showCancelButton: true,
        confirmButtonColor: '#fd625e',
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Yes, delete everything'
      })
      if (!result.isConfirmed) return
      try {
        await accountsStore.deleteAllAccounts()
      } catch (error) {
        console.error('Delete all accounts error:', error)
        toast.error('Failed to delete accounts')
        return
      }
      // Delete succeeded - logout and redirect (don't let navigation errors show "Failed to delete")
      authStore.logout()
      toast.success('All accounts deleted')
      try {
        requestAuthSetupFlow()
        await router.replace({ name: 'Login' })
      } catch (navError) {
        console.warn('Router redirect failed, using fallback:', navError)
        requestAuthSetupFlow()
        window.location.hash = '#/login'
      }
    }

    function downloadBackupFile(backup) {
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().slice(0, 10)
      a.download = `phpcoin-backup-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
    }

    async function onExportPasswordConfirmed(masterKey) {
      if (accountsStore.accounts.length === 0) return
      try {
        const backup = {
          version: 1,
          exportedAt: new Date().toISOString(),
          accounts: accountsStore.accounts
        }
        downloadBackupFile(backup)
        toast.success('Backup downloaded')
      } catch (error) {
        toast.error('Failed to export backup')
      }
    }

    async function onImportPasswordConfirmed(masterKey) {
      await handleImport(masterKey)
    }

    const handleImport = async (masterKey) => {
      const keyToUse = masterKey ?? authStore.masterKey
      if (!keyToUse) {
        toast.error('Please confirm with your password')
        return
      }
      if (!importedAccount.value) return
      if (isDuplicateAddress(importedAccount.value.address)) {
        toast.error('This address is already in your accounts')
        return
      }
      try {
        importing.value = true
        const publicKey = getPublicKey(importedAccount.value.privateKey) || ''
        const accountCount = accountsStore.accounts.length + 1
        const address = importedAccount.value.address
        const account = {
          id: address,
          name: importForm.name.trim() || `Account ${accountCount}`,
          description: importForm.description.trim() || undefined,
          address,
          publicKey,
          privateKey: importedAccount.value.privateKey,
          createdAt: Date.now()
        }
        await accountsStore.addAccount(account, keyToUse)
        const addedAccount = accountsStore.accounts.find((a) => a.address === address) || accountsStore.accounts[accountsStore.accounts.length - 1]
        authStore.setActiveAccount(addedAccount)
        toast.success('Account imported successfully')
        closeImportModal()
      } catch (error) {
        console.error('Import account error:', error)
        toast.error(error.message || 'Failed to import account')
      } finally {
        importing.value = false
      }
    }

    const isDuplicateAddress = (address) => {
      return accountsStore.accounts.some((a) => a.address === address)
    }

    const handleAdd = async (masterKey) => {
      const keyToUse = masterKey ?? authStore.masterKey
      if (!keyToUse) {
        toast.error('Please confirm with your password')
        return
      }
      if (!validateForm()) return

      try {
        adding.value = true

        // Generate or use provided private key
        let privateKey
        let address
        let publicKey
        if (addForm.privateKey.trim()) {
          // Use provided private key (Base58 format)
          privateKey = addForm.privateKey.trim()
          publicKey = getPublicKey(privateKey) || ''
          address = getAddress(privateKey)
          if (!address) {
            toast.error('Invalid private key. Please check the format and try again.')
            return
          }
        } else {
          // Generate new account
          const newAccount = generateAccount()
          privateKey = newAccount.privateKey
          publicKey = newAccount.publicKey || ''
          address = newAccount.address
        }
        if (isDuplicateAddress(address)) {
          toast.error('This address is already in your accounts')
          return
        }
        
        const accountCount = accountsStore.accounts.length + 1
        const account = {
          id: address,
          name: addForm.name.trim() || `Account ${accountCount}`,
          description: addForm.description.trim() || undefined,
          address,
          publicKey,
          privateKey,
          createdAt: Date.now()
        }
        
        await accountsStore.addAccount(account, keyToUse)
        const addedAccount = accountsStore.accounts.find((a) => a.address === address) || accountsStore.accounts[accountsStore.accounts.length - 1]
        authStore.setActiveAccount(addedAccount)
        toast.success('Account added successfully')
        showAddModal.value = false
        addForm.name = ''
        addForm.description = ''
        addForm.privateKey = ''
      } catch (error) {
        console.error('Add account error:', error)
        const msg = error.message || ''
        if (msg.includes('key path') || msg.includes('IDBObjectStore')) {
          toast.error('Invalid private key. Please check the format and try again.')
        } else {
          toast.error(error.message || 'Failed to add account')
        }
      } finally {
        adding.value = false
      }
    }
    
    const editPublicKey = computed(() => {
      if (!editAccount.value || !authStore.masterKey) return ''
      try {
        const pk = accountsStore.getDecryptedPrivateKey(editAccount.value, authStore.masterKey)
        return getPublicKey(pk) || ''
      } catch {
        return ''
      }
    })

    const exportedText = computed(() => {
      if (!viewAccount.value || !viewPrivateKeyRevealed.value || !viewPrivateKey.value) return ''
      const account = {
        address: viewAccount.value.address,
        privateKey: viewPrivateKey.value,
        publicKey: getPublicKey(viewPrivateKey.value) || ''
      }
      const type = exportFormat.value
      if (type === 'wallet') {
        return `phpcoin\r${account.privateKey}\n${account.publicKey}`
      }
      if (type === 'json') {
        return JSON.stringify({
          address: account.address,
          privateKey: account.privateKey,
          publicKey: account.publicKey
        }, null, 4)
      }
      if (type === 'php') {
        return `$account=[
    "address"=>"${account.address}",
    "privateKey"=>"${account.privateKey}",
    "publicKey"=>"${account.publicKey}",
];`
      }
      return ''
    })

    const viewPublicKey = computed(() => {
      if (!viewAccount.value || !authStore.masterKey) return ''
      try {
        const pk = accountsStore.getDecryptedPrivateKey(viewAccount.value, authStore.masterKey)
        return getPublicKey(pk) || ''
      } catch {
        return ''
      }
    })

    function openViewModal(account) {
      viewAccount.value = account
      viewPrivateKey.value = ''
      viewPrivateKeyRevealed.value = false
      viewExportBlockVisible.value = false
      copiedField.value = ''
      showViewModal.value = true
    }

    function closeViewModal() {
      viewAccount.value = null
      viewPrivateKey.value = ''
      viewPrivateKeyRevealed.value = false
      viewExportBlockVisible.value = false
      copiedField.value = ''
      exportFormat.value = 'json'
      showViewModal.value = false
    }

    function requestRevealPrivateKey() {
      showRevealPasswordModal.value = true
    }

    async function onRevealPasswordConfirmed(masterKey) {
      if (!viewAccount.value) return
      try {
        const pk = accountsStore.getDecryptedPrivateKey(viewAccount.value, masterKey)
        viewPrivateKey.value = pk
        viewPrivateKeyRevealed.value = true
      } catch (e) {
        toast.error('Failed to decrypt private key')
      }
    }

    function downloadWalletFile() {
      if (!viewAccount.value || !exportedText.value) return
      const blob = new Blob([exportedText.value], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${viewAccount.value.address}.dat`
      a.click()
      URL.revokeObjectURL(url)
    }

    async function copyField(field, value) {
      if (!value) return
      try {
        await navigator.clipboard.writeText(value)
        copiedField.value = field
        setTimeout(() => { copiedField.value = '' }, 2000)
      } catch {
        toast.error('Failed to copy')
      }
    }

    function openEditModal(account) {
      editAccount.value = account
      editForm.name = account.name || ''
      editForm.description = account.description || ''
      Object.keys(editErrors).forEach(k => delete editErrors[k])
      showEditModal.value = true
    }

    async function handleEditSave() {
      Object.keys(editErrors).forEach(k => delete editErrors[k])
      if (!editForm.name.trim()) {
        editErrors.name = 'Please enter account name'
        return
      }
      try {
        saving.value = true
        await accountsStore.updateAccount(
          editAccount.value.id,
          { name: editForm.name.trim(), description: editForm.description.trim() || undefined },
          authStore.masterKey
        )
        if (authStore.activeAccount?.address === editAccount.value.address) {
          authStore.setActiveAccount(accountsStore.accounts.find(a => a.address === editAccount.value.address))
        }
        showEditModal.value = false
      } catch (error) {
        toast.error(error.message || 'Failed to update account')
      } finally {
        saving.value = false
      }
    }

    const switchAccount = (account) => {
      authStore.setActiveAccount(account)
      toast.success(`Switched to ${account.name}`)
    }
    
    function requestDeleteWithPassword(account) {
      accountToDelete.value = account
      showDeletePasswordModal.value = true
    }

    async function onDeletePasswordConfirmed(masterKey) {
      const account = accountToDelete.value
      if (!account) return
      await handleDelete(account, masterKey)
      accountToDelete.value = null
    }

    const handleDelete = async (account, masterKey) => {
      const keyToUse = masterKey ?? authStore.masterKey
      if (!keyToUse) {
        toast.error('Please confirm with your password')
        return
      }
      try {
        const wasActive = activeAccount.value?.address === account.address
        await accountsStore.deleteAccount(account.id, keyToUse)
        if (wasActive && accountsStore.accounts.length > 0) {
          authStore.setActiveAccount(accountsStore.accounts[0])
        }
        toast.success('Account deleted')
      } catch (error) {
        toast.error('Failed to delete account')
      }
    }
    
    onMounted(async () => {
      if (authStore.masterKey) {
        await accountsStore.loadAccounts(authStore.masterKey)
        await loadBalances()
      }
    })
    
    return {
      showAddModal,
      showEditModal,
      showViewModal,
      showPasswordConfirm,
      showRevealPasswordModal,
      showDeletePasswordModal,
      showImportPasswordModal,
      showExportPasswordModal,
      showDeleteAllPasswordModal,
      showImportModal,
      importFileInput,
      importedAccount,
      importError,
      importForm,
      importing,
      addForm,
      editForm,
      editAccount,
      editPublicKey,
      viewAccount,
      viewPublicKey,
      viewPrivateKey,
      viewPrivateKeyRevealed,
      viewExportBlockVisible,
      exportFormat,
      exportedText,
      copiedField,
      editErrors,
      errors,
      adding,
      saving,
      accounts,
      activeAccount,
      hasLegacyWallet,
      requestClearLegacyWallet,
      balances,
      refreshingBalances,
      refreshBalances,
      handleAdd,
      hideTooltips,
      formatDate,
      requestAddWithPassword,
      onPasswordConfirmed,
      openViewModal,
      closeViewModal,
      requestRevealPrivateKey,
      onRevealPasswordConfirmed,
      requestDeleteWithPassword,
      onDeletePasswordConfirmed,
      openImportModal,
      closeImportModal,
      onImportFileSelected,
      requestImportWithPassword,
      onImportPasswordConfirmed,
      requestExportBackup,
      onExportPasswordConfirmed,
      requestDeleteAllAccounts,
      onDeleteAllPasswordConfirmed,
      copyField,
      downloadWalletFile,
      openEditModal,
      handleEditSave,
      switchAccount,
      handleDelete,
      validateField
    }
  }
}
</script>

<style scoped>
.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}

.table-responsive {
  margin: 0;
  padding: 0;
}
</style>
