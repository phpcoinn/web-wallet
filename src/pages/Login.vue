<template>
  <div>
      <div class="text-center">
        <template v-if="setupFlow">
          <h5 class="mb-2">{{ createHeaderTitle }}</h5>
          <p class="text-muted mt-2 mb-0">{{ createHeaderSubtitle }}</p>
        </template>
        <template v-else>
          <h5 class="mb-0">Welcome Back !</h5>
          <p class="text-muted mt-2">Sign in to continue to PHP Coin Wallet.</p>
        </template>
      </div>

      <div
        v-if="showLegacyPostMigrateLoginHint && loginMode === 'password'"
        class="alert alert-info rounded-3 mt-3 mb-0 py-3 px-3"
      >
        <p class="mb-0 text-sm lh-base">
          Legacy multiwallet data is still stored in your browser. Your accounts have been migrated. You can login to delete
          this old data.
        </p>
      </div>

      <ul class="nav nav-pills nav-justified mt-4 mb-3" role="tablist">
        <li class="nav-item" role="presentation">
          <button
            type="button"
            class="nav-link"
            :class="{ active: loginMode === 'password' }"
            @click="setLoginMode('password')"
          >
            <Lock :size="16" />
            Password
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button
            type="button"
            class="nav-link"
            :class="{ active: loginMode === 'privateKey' }"
            @click="setLoginMode('privateKey')"
          >
            <KeyRound :size="16" />
            Private Key
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button
            type="button"
            class="nav-link"
            :class="{ active: loginMode === 'quick' }"
            @click="setLoginMode('quick')"
          >
            <Zap :size="16" />
            Quick Login
          </button>
        </li>
      </ul>

      <div class="login-tab-panels">
        <!-- Avoid Bootstrap .tab-pane (display:none) — use v-show only -->
        <div v-show="loginMode === 'password'" class="pt-1">
          <template v-if="setupFlow">
            <div v-if="showLegacyMigrateOnSetup" class="alert alert-info mb-3 rounded-3">
              <p class="text-start mb-3 text-sm">
                This browser still has your old encrypted wallet. Tap <strong>Migrate wallet</strong> and enter your multi-wallet password.
                Your accounts will be copied into secure local storage.
                The old browser data can be removed later from account settings if you choose.
              </p>
              <div class="text-center">
                <button type="button" class="btn btn-info" @click="openMigrateModal">
                  <i class="mdi mdi-database-import me-1"></i>
                  Migrate wallet
                </button>
              </div>
            </div>
            <div class="">
              <div class="">
                <form @submit.prevent="handleAdd">
                  <template v-if="isSetup">
                    <div class="mb-3">
                      <label class="form-label">Password:</label>
                      <div class="input-group">
                        <input
                          :type="showCreatePassword ? 'text' : 'password'"
                          class="form-control"
                          :class="{ 'is-invalid': addErrors.password }"
                          v-model="addForm.password"
                          placeholder="Enter password"
                        />
                        <button type="button" class="btn btn-light shadow-none" @click="showCreatePassword = !showCreatePassword">
                          <i :class="showCreatePassword ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                        </button>
                      </div>
                      <div v-if="addErrors.password" class="invalid-feedback d-block">{{ addErrors.password }}</div>
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Confirm Password:</label>
                      <div class="input-group">
                        <input
                          :type="showConfirmPassword ? 'text' : 'password'"
                          class="form-control"
                          :class="{ 'is-invalid': addErrors.confirmPassword }"
                          v-model="addForm.confirmPassword"
                          placeholder="Confirm password"
                        />
                        <button type="button" class="btn btn-light shadow-none" @click="showConfirmPassword = !showConfirmPassword">
                          <i :class="showConfirmPassword ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                        </button>
                      </div>
                      <div v-if="addErrors.confirmPassword" class="invalid-feedback d-block">{{ addErrors.confirmPassword }}</div>
                    </div>
                    <div class="mb-3">
                      <div class="form-check">
                        <input
                          id="savePassword-create"
                          class="form-check-input"
                          type="checkbox"
                          :checked="savePassword"
                          @change="onSavePasswordCheckboxChange"
                        />
                        <label class="form-check-label" for="savePassword-create">Save password locally</label>
                      </div>
                      <div v-if="savePassword" class="alert alert-warning mt-2 mb-0 py-2 text-sm rounded-3" role="alert">
                        <i class="mdi mdi-information-outline me-1"></i> Password is saved unencrypted in your browser.
                      </div>
                    </div>
                  </template>
                  <div class="d-flex gap-2 flex-wrap">
                    <button type="submit" class="btn btn-primary w-100" :disabled="adding">
                      <span v-if="adding" class="spinner-border spinner-border-sm me-2" role="status"></span>
                      {{ isSetup ? 'Create Wallet' : 'Create New Account' }}
                    </button>
                    <button
                      v-if="hasLegacyWallet && !showLegacyMigrateOnSetup"
                      type="button"
                      class="btn btn-outline-warning"
                      @click="openMigrateModal"
                    >
                      Restore from multiwallet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </template>
          <template v-else>
            <form class="mt-2" @submit.prevent="handlePasswordLogin">
              <div class="mb-3">
                <label class="form-label">Password:</label>
                <div class="input-group auth-pass-inputgroup">
                  <input
                    :type="showPassword ? 'text' : 'password'"
                    class="form-control"
                    placeholder="Enter password"
                    v-model="passwordForm.password"
                    @keyup.enter="handlePasswordLogin"
                    :disabled="loading"
                  />
                  <button class="btn btn-light shadow-none ms-0" type="button" @click="showPassword = !showPassword">
                    <i :class="showPassword ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                  </button>
                </div>
              </div>
              <div class="row mb-4">
                <div class="col">
                  <div class="form-check">
                    <input id="remember-check" v-model="passwordForm.remember" class="form-check-input" type="checkbox" />
                    <label class="form-check-label" for="remember-check">Remember me</label>
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <button class="btn btn-primary w-100 waves-effect waves-light" type="submit" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  <LogIn v-if="!loading" :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
                  {{ loading ? 'Logging in...' : 'Log In' }}
                </button>
              </div>
            </form>
          </template>
        </div>

        <!-- Private Key -->
        <div v-show="loginMode === 'privateKey'" class="pt-1">
          <form class="mt-2" @submit.prevent="handlePrivateKeyLogin">
            <div class="mb-3">
              <label class="form-label">Private Key:</label>
              <div class="input-group">
                <input
                  :type="showPrivateKey ? 'text' : 'password'"
                  class="form-control"
                  :class="{ 'is-invalid': quickLoginErrors.privateKey }"
                  v-model="quickLoginForm.privateKey"
                  placeholder="Enter your private key (Lz...)"
                  @blur="validateQuickLoginField('privateKey')"
                  :disabled="loading"
                />
                <button class="btn btn-light shadow-none" type="button" @click="showPrivateKey = !showPrivateKey" :disabled="loading">
                  <i :class="showPrivateKey ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                </button>
              </div>
              <div v-if="quickLoginErrors.privateKey" class="invalid-feedback d-block">
                {{ quickLoginErrors.privateKey }}
              </div>
            </div>
            <div class="mb-3">
              <div class="form-check">
                <input
                  id="savePrivateKey-local"
                  class="form-check-input"
                  type="checkbox"
                  :checked="savePrivateKeyLocally"
                  @change="onSavePrivateKeyCheckboxChange"
                />
                <label class="form-check-label" for="savePrivateKey-local">Save private key locally</label>
              </div>
              <div v-if="savePrivateKeyLocally" class="alert alert-warning mt-2 mb-0 py-2 text-sm rounded-3" role="alert">
                <i class="mdi mdi-information-outline me-1"></i> Private key is saved unencrypted in your browser.
              </div>
            </div>
            <div class="mb-3">
              <button class="btn btn-primary w-100 waves-effect waves-light" type="submit" :disabled="loading">
                <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                <LogIn v-if="!loading" :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
                {{ loading ? 'Logging in...' : 'Login' }}
              </button>
            </div>
          </form>
          <div
            v-if="showLegacyMultiwalletHint"
            class="alert alert-info mt-3 mb-0 rounded-3 border-0 p-3 p-md-4"
          >
            <p class="mb-3 mb-md-4 lh-base text-sm rounded-2">
              Your key was restored from this browser’s stored login (<code class="font-monospace">privateKey</code>).
              You can keep using private-key login, or set up a password-protected <strong>multi-wallet</strong> to hold multiple addresses,
              backups, and imports in one place.
            </p>
            <button type="button" class="btn btn-outline-primary" @click="enterSetupFlow">
              <i class="mdi mdi-account-multiple-outline me-1"></i>
              Create multi-wallet
            </button>
          </div>
        </div>

        <!-- Quick Login -->
        <div v-show="loginMode === 'quick'" class="pt-1">
          <div class="mt-2">
            <div class="mb-3">
              <button
                class="btn btn-success w-100 waves-effect waves-light"
                type="button"
                @click="handleFastLogin"
                :disabled="loading"
              >
                <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                <Zap v-if="!loading" :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
                {{ loading ? 'Creating account...' : 'Create New Account & Login' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="setupFlow" class="text-center text-sm mt-4">
        <button
          v-if="hasStoredAccounts"
          type="button"
          class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center mb-3"
          @click="backToLoginFromSetup"
        >
          <i class="mdi mdi-arrow-left me-1"></i>
          Back to login
        </button>
        <div v-if="loginMode === 'password'" :class="{ 'mt-2': !hasStoredAccounts }">
          <p class="text-muted mb-2">You can also restore an existing wallet from a backup file</p>
          <router-link :to="{ name: 'RestoreAccount' }" class="btn btn-outline-secondary btn-sm">
            Restore accounts
          </router-link>
        </div>
      </div>

    <!-- Migrate from legacy multiwallet -->
    <Teleport to="body">
      <div
        v-if="showMigrateModal"
        class="modal fade show migrate-modal"
        style="display: block; z-index: 1075;"
        tabindex="-1"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Restore from multiwallet</h5>
              <button type="button" class="btn-close" @click="closeMigrateModal"></button>
            </div>
            <div class="modal-body">
              <p class="text-muted mb-3">
                Legacy multiwallet data was found. Enter your password to restore accounts into the new wallet format.
              </p>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <div class="input-group">
                  <input
                    :type="showMigratePassword ? 'text' : 'password'"
                    class="form-control"
                    :class="{ 'is-invalid': migrateError }"
                    v-model="migrateForm.password"
                    placeholder="Enter your multiwallet password"
                  />
                  <button type="button" class="btn btn-light shadow-none" @click="showMigratePassword = !showMigratePassword">
                    <i :class="showMigratePassword ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                  </button>
                </div>
                <div v-if="migrateError" class="invalid-feedback d-block">{{ migrateError }}</div>
              </div>
              <div v-if="migrateAccountsCount > 0" class="alert alert-info py-2 mb-0">
                <i class="mdi mdi-information-outline me-1"></i>
                {{ migrateAccountsCount }} account(s) will be restored. Your new wallet will use the same password.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeMigrateModal">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="migrating || !migrateForm.password"
                @click="confirmMigrate"
              >
                <span v-if="migrating" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ migrating ? 'Restoring...' : 'Restore' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showMigrateModal" class="modal-backdrop fade show" style="z-index: 1070;"></div>
    </Teleport>

    <template v-if="showPrivateKeyStorageModal">
      <div class="modal-backdrop fade show"></div>
      <div
        class="modal fade show"
        style="display: block;"
        tabindex="-1"
        role="dialog"
        @click.self="closePrivateKeyStorageModal"
      >
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Important Notice</h5>
              <button type="button" class="btn-close" @click="closePrivateKeyStorageModal"></button>
            </div>
            <div class="modal-body">
              <p class="text-danger mb-3">
                <strong>Your private key will not be stored in this browser.</strong> You will need to enter it every time you use private key login.
              </p>
              <div class="form-check">
                <input id="agreePrivateKeyStorage" v-model="agreePrivateKeyStorage" class="form-check-input" type="checkbox" />
                <label class="form-check-label" for="agreePrivateKeyStorage">
                  I understand. I will keep my private key safe elsewhere or enter it each time.
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closePrivateKeyStorageModal">Cancel</button>
              <button
                type="button"
                class="btn btn-danger"
                :disabled="!agreePrivateKeyStorage"
                @click="confirmDontSavePrivateKeyLocally"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-if="showNoRecoveryModal && setupFlow">
      <div class="modal-backdrop fade show"></div>
      <div
        class="modal fade show"
        style="display: block;"
        tabindex="-1"
        role="dialog"
        @click.self="closeNoRecoveryModal"
      >
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Important Notice</h5>
              <button type="button" class="btn-close" @click="closeNoRecoveryModal"></button>
            </div>
            <div class="modal-body">
              <p class="text-danger mb-3">
                <strong>You must remember or store your password elsewhere.</strong> There is no way to recover your accounts without your password. If you lose it, your funds will be permanently inaccessible.
              </p>
              <div class="form-check">
                <input id="agreeNoRecovery" v-model="agreeNoRecovery" class="form-check-input" type="checkbox" />
                <label class="form-check-label" for="agreeNoRecovery">
                  I understand and agree. I will remember or store my password securely.
                </label>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeNoRecoveryModal">Cancel</button>
              <button type="button" class="btn btn-danger" :disabled="!agreeNoRecovery" @click="confirmNoSavePassword">
                I Understand
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, LogIn, Zap, KeyRound } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { deriveMasterKey } from '../utils/crypto'

const PASSWORD_STORAGE_KEY = 'phpcoin_wallet_password'
import { getPublicKey, signMessage, generateAccount } from '../utils/wallet'
import {
  getStoredLegacyPrivateKey,
  setStoredLegacyPrivateKey,
  clearStoredLegacyPrivateKey
} from '../utils/legacyLoginStorage'
import {
  hasLegacyWallet as checkLegacyWallet,
  getLegacyWalletPassword,
  decryptLegacyWallet,
  validateLegacyAccounts
} from '../utils/legacyWallet'
import { getAccounts } from '../utils/db'
import { api } from '../utils/api'
import { toast } from '../utils/toast'
import { navigateAfterAuth } from '../utils/authRedirect'
import { consumeAuthEntryIntent } from '../utils/authEntryIntent'

export default {
  name: 'Login',
  components: {
    Lock,
    KeyRound,
    LogIn,
    Zap
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const accountsStore = useAccountsStore()
    const storedLegacyPrivateKey = getStoredLegacyPrivateKey()

    const setupFlow = ref(false)
    /** True when IndexedDB already has accounts — only then does “Back to login” (sign in) make sense */
    const hasStoredAccounts = ref(false)

    const loginMode = ref('password')

    const isSetup = computed(() => !authStore.masterKey)
    const hasLegacyWallet = computed(() => checkLegacyWallet())
    /** Legacy wallet + first-time setup: show migrate callout above the create form (same screen). */
    const showLegacyMigrateOnSetup = computed(
      () => setupFlow.value && !hasStoredAccounts.value && hasLegacyWallet.value
    )
    /** Sign-in + new DB accounts + legacy walletData still present (e.g. after migrate). */
    const showLegacyPostMigrateLoginHint = computed(
      () => !setupFlow.value && hasStoredAccounts.value && hasLegacyWallet.value
    )

    const passwordForm = reactive({
      password: '',
      remember: false
    })

    const quickLoginForm = reactive({
      privateKey: storedLegacyPrivateKey || ''
    })

    const showLegacyMultiwalletHint = ref(false)

    const createHeaderTitle = computed(() => {
      if (!setupFlow.value) return ''
      if (loginMode.value === 'privateKey') return 'Private key login'
      if (loginMode.value === 'quick') return 'Quick login'
      return isSetup.value ? 'Set up your wallet' : 'Create or restore your first account'
    })
    const createHeaderSubtitle = computed(() => {
      if (!setupFlow.value) return ''
      if (loginMode.value === 'privateKey') {
        return 'Sign in with a Private key (one-account session).'
      }
      if (loginMode.value === 'quick') {
        return 'Generate a new temporary address'
      }
      return isSetup.value
        ? 'Choose a password and create your first account.'
        : 'Add an account to your multi-wallet, or use a one-account option in the other tabs.'
    })

    /** When a legacy private key is in localStorage, open Private key tab only if there is no multi-wallet in DB yet. */
    function applyDefaultLoginTab(hasAccountsInDb = false) {
      const legacyPk = getStoredLegacyPrivateKey()
      if (legacyPk) {
        quickLoginForm.privateKey = legacyPk
        loginMode.value = hasAccountsInDb ? 'password' : 'privateKey'
      } else {
        loginMode.value = 'password'
      }
    }

    function setLoginMode(mode) {
      loginMode.value = mode
    }

    function enterSetupFlow() {
      setupFlow.value = true
      loginMode.value = 'password'
      showLegacyMultiwalletHint.value = false
    }

    function backToLoginFromSetup() {
      setupFlow.value = false
      applyDefaultLoginTab(hasStoredAccounts.value)
      showLegacyMultiwalletHint.value =
        !!getStoredLegacyPrivateKey() && !hasStoredAccounts.value
    }

    async function runLoginEntryInit() {
      const { setup: setupIntent } = consumeAuthEntryIntent()

      if (authStore.masterKey) {
        try {
          await accountsStore.loadAccounts(authStore.masterKey)
        } catch {
          authStore.logout()
        }
        if (authStore.masterKey && accountsStore.accounts.length > 0) {
          router.replace({ name: 'Dashboard' })
          return
        }
        // Persisted password session but empty DB — masterKey makes isSetup false and hides create fields
        if (authStore.masterKey && accountsStore.accounts.length === 0) {
          authStore.logout()
        }
      }

      let accounts = []
      try {
        accounts = await getAccounts()
      } catch (e) {
        console.error('Login init: failed to read accounts', e)
      }

      if (accounts.length > 0 && !setupIntent) {
        setupFlow.value = false
      } else if (accounts.length > 0 && setupIntent) {
        setupFlow.value = true
      } else {
        // No accounts: Password tab shows create form; migrate callout appears above when legacy walletData exists
        setupFlow.value = true
      }

      hasStoredAccounts.value = accounts.length > 0
      applyDefaultLoginTab(hasStoredAccounts.value)
      if (showLegacyMigrateOnSetup.value) {
        loginMode.value = 'password'
      }
      if (!setupFlow.value) {
        showLegacyMultiwalletHint.value =
          !!getStoredLegacyPrivateKey() && !hasStoredAccounts.value
      } else {
        showLegacyMultiwalletHint.value = false
      }

      const storedPassword = localStorage.getItem(PASSWORD_STORAGE_KEY)
      if (storedPassword && loginMode.value === 'password' && !setupFlow.value) {
        passwordForm.password = storedPassword
        passwordForm.remember = true
      }
    }

    const loading = ref(false)
    const showPassword = ref(false)
    const showPrivateKey = ref(false)
    const showCreatePassword = ref(false)
    const showConfirmPassword = ref(false)
    const quickLoginErrors = reactive({})

    const adding = ref(false)
    const savePassword = ref(true)
    const showNoRecoveryModal = ref(false)
    const agreeNoRecovery = ref(false)
    const savePrivateKeyLocally = ref(true)
    const showPrivateKeyStorageModal = ref(false)
    const agreePrivateKeyStorage = ref(false)
    const addErrors = reactive({})
    const addForm = reactive({ password: '', confirmPassword: '' })

    const showMigrateModal = ref(false)
    const showMigratePassword = ref(false)
    const migrating = ref(false)
    const migrateError = ref('')
    const migrateAccountsCount = ref(0)
    const migrateForm = reactive({ password: '' })
    
    // Carousel slides data
    const carouselSlides = [
      {
        quote: '"PHP Coin Wallet provides a secure and user-friendly way to manage your cryptocurrency. The interface is clean and intuitive."',
        title: 'Secure Wallet',
        subtitle: 'Your keys, your coins',
        icon: 'Wallet'
      },
      {
        quote: '"Multi-account support makes it easy to organize your funds. Quick login and password login options provide flexibility."',
        title: 'Multi-Account',
        subtitle: 'Manage multiple wallets',
        icon: 'Lock'
      },
      {
        quote: '"Send and receive PHP instantly with secure client-side transaction signing. Your transactions are broadcast directly to the PHP Coin network."',
        title: 'Send & Receive',
        subtitle: 'Instant PHP transactions',
        icon: 'Send'
      },
      {
        quote: '"View complete transaction history with real-time confirmations. Track all your PHP transfers with detailed status information."',
        title: 'Transaction History',
        subtitle: 'Complete transaction records',
        icon: 'History'
      },
      {
        quote: '"Receive PHP easily with QR code sharing. Generate your address QR code and share it with anyone to receive payments instantly."',
        title: 'QR Code Receiving',
        subtitle: 'Easy payment sharing',
        icon: 'Download'
      },
      {
        quote: '"Your private keys are encrypted with AES256-GCM and stored locally. Master key derived from password using PBKDF2 with 100,000 iterations for maximum security."',
        title: 'Bank-Level Security',
        subtitle: 'AES256-GCM encryption',
        icon: 'Shield'
      },
      {
        quote: '"Export your wallet as encrypted JSON for backup, or import existing wallets. All data is encrypted with your master key before storage."',
        title: 'Wallet Backup',
        subtitle: 'Import & export support',
        icon: 'KeyRound'
      }
    ]
    
    const validateQuickLoginField = (field) => {
      delete quickLoginErrors[field]
      
      if (field === 'privateKey') {
        if (!quickLoginForm.privateKey.trim()) {
          quickLoginErrors.privateKey = 'Please enter your private key'
        }
      }
    }
    
    const validateQuickLoginForm = () => {
      Object.keys(quickLoginErrors).forEach(key => delete quickLoginErrors[key])
      validateQuickLoginField('privateKey')
      return Object.keys(quickLoginErrors).length === 0
    }
    
    const handlePasswordLogin = async () => {
      if (!passwordForm.password.trim()) {
        toast.warning('Please enter your password')
        return
      }
      
      try {
        loading.value = true
        
        // Derive master key from password
        const { key, salt } = deriveMasterKey(passwordForm.password)
        
        // Load accounts
        await accountsStore.loadAccounts(key)
        
        // Login (even when no accounts – user can create/import on AccountManager)
        authStore.login(key, false)
        
        if (accountsStore.accounts.length === 0) {
          toast.info('No accounts yet. Create or import your first account.')
          enterSetupFlow()
          return
        }
        
        // Set first account as active
        authStore.setActiveAccount(accountsStore.accounts[0])
        
        // Remember or forget password
        if (passwordForm.remember) {
          localStorage.setItem(PASSWORD_STORAGE_KEY, passwordForm.password)
        } else {
          localStorage.removeItem(PASSWORD_STORAGE_KEY)
        }
        
        navigateAfterAuth(router)
      } catch (error) {
        console.error('Login error:', error)
        toast.error(error.message || 'Login failed')
      } finally {
        loading.value = false
      }
    }
    
    const handlePrivateKeyLogin = async () => {
      if (!validateQuickLoginForm()) {
        return
      }
      
      try {
        loading.value = true
        
        const privateKey = quickLoginForm.privateKey.trim()
        
        // Step 1: Derive public key from private key
        const publicKey = getPublicKey(privateKey)
        if(!publicKey) {
          throw new Error("Invalid private key")
        }
        
        // Step 2: Generate a nonce/message to sign
        const nonce = `login-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
        
        // Step 3: Sign the message with private key
        const signature = signMessage(nonce, privateKey)
        if(!signature) {
          throw new Error('Invalid signature')
        }

        // Step 4: Call authenticate API
        const authResponse = await api.authenticate(publicKey, signature, nonce)
        
        // Step 5: Get address from API response
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
        
// Login with private key (session only; cannot be linked with multiwallet accounts)
        authStore.login(privateKey, true)
        authStore.setActiveAccount(account)

        if (savePrivateKeyLocally.value) {
          setStoredLegacyPrivateKey(privateKey)
        } else {
          clearStoredLegacyPrivateKey()
        }

        navigateAfterAuth(router)
      } catch (error) {
        console.error('Private key login error:', error)
        toast.error(error.message || 'Invalid private key or authentication failed')
      } finally {
        loading.value = false
      }
    }
    
    const handleFastLogin = async () => {
      try {
        loading.value = true
        
        // Generate new account
        const newAccount = generateAccount()
        const privateKey = newAccount.privateKey
        const address = newAccount.address
        const publicKey = getPublicKey(privateKey)
        
        // Create account object
        const account = {
          id: `fast-${Date.now()}`,
          name: 'Fast Login Account',
          address: address,
          publicKey: publicKey,
          privateKey: privateKey,
          isQuickLogin: true,
          isFastLogin: true,
          createdAt: Date.now()
        }
        
        // Login with private key (session only; for testing)
        authStore.login(privateKey, true)
        authStore.setActiveAccount(account)
        
        toast.success(`Account created! Address: ${address.substring(0, 10)}...`)
        navigateAfterAuth(router)
      } catch (error) {
        console.error('Fast login error:', error)
        toast.error(error.message || 'Failed to create account')
      } finally {
        loading.value = false
      }
    }

    /** Uncheck only after Important Notice + "I Understand"; otherwise keep checked and open modal */
    function onSavePasswordCheckboxChange(ev) {
      const wantOn = ev.target.checked
      if (wantOn) {
        savePassword.value = true
        return
      }
      ev.target.checked = true
      agreeNoRecovery.value = false
      showNoRecoveryModal.value = true
    }

    const validateAddForm = () => {
      Object.keys(addErrors).forEach((k) => delete addErrors[k])
      if (isSetup.value) {
        if (!addForm.password) addErrors.password = 'Please enter a password'
        else if (addForm.password.length < 6) addErrors.password = 'Password must be at least 6 characters'
        else if (addForm.password !== addForm.confirmPassword) addErrors.confirmPassword = 'Passwords do not match'
      }
      return Object.keys(addErrors).length === 0
    }

    const closeNoRecoveryModal = () => {
      showNoRecoveryModal.value = false
      agreeNoRecovery.value = false
    }

    const confirmNoSavePassword = () => {
      savePassword.value = false
      closeNoRecoveryModal()
    }

    function onSavePrivateKeyCheckboxChange(ev) {
      const wantOn = ev.target.checked
      if (wantOn) {
        savePrivateKeyLocally.value = true
        return
      }
      ev.target.checked = true
      agreePrivateKeyStorage.value = false
      showPrivateKeyStorageModal.value = true
    }

    function closePrivateKeyStorageModal() {
      showPrivateKeyStorageModal.value = false
      agreePrivateKeyStorage.value = false
    }

    function confirmDontSavePrivateKeyLocally() {
      savePrivateKeyLocally.value = false
      closePrivateKeyStorageModal()
    }

    const handleAdd = async () => {
      if (!validateAddForm()) return
      try {
        adding.value = true
        let masterKey = authStore.masterKey

        if (isSetup.value) {
          const { key } = deriveMasterKey(addForm.password)
          masterKey = key
          authStore.login(key, false)
          if (savePassword.value) {
            localStorage.setItem(PASSWORD_STORAGE_KEY, addForm.password)
          } else {
            localStorage.removeItem(PASSWORD_STORAGE_KEY)
          }
        }

        const newAccount = generateAccount()
        const account = {
          id: newAccount.address,
          name: 'My Account',
          address: newAccount.address,
          publicKey: newAccount.publicKey || '',
          privateKey: newAccount.privateKey,
          createdAt: Date.now()
        }
        await accountsStore.addAccount(account, masterKey)
        const addedAccount =
          accountsStore.accounts.find((a) => a.address === newAccount.address) ||
          accountsStore.accounts[accountsStore.accounts.length - 1]
        authStore.setActiveAccount(addedAccount)
        toast.success(isSetup.value ? 'Wallet created successfully' : 'Account added successfully')
        navigateAfterAuth(router)
      } catch (error) {
        console.error('Add account error:', error)
        toast.error(error.message || 'Failed to add account')
      } finally {
        adding.value = false
      }
    }

    const openMigrateModal = () => {
      migrateForm.password = getLegacyWalletPassword()
      migrateError.value = ''
      migrateAccountsCount.value = 0
      showMigrateModal.value = true
    }

    const closeMigrateModal = () => {
      showMigrateModal.value = false
      migrateForm.password = ''
      migrateError.value = ''
    }

    const confirmMigrate = async () => {
      if (!migrateForm.password.trim()) {
        migrateError.value = 'Please enter your password'
        return
      }
      try {
        migrating.value = true
        migrateError.value = ''
        const walletData = decryptLegacyWallet(migrateForm.password)
        const accounts = validateLegacyAccounts(walletData.accounts || [], getPublicKey)
        if (accounts.length === 0) {
          migrateError.value = 'No valid accounts found in legacy wallet'
          return
        }
        migrateAccountsCount.value = accounts.length
        const { key } = deriveMasterKey(migrateForm.password)
        authStore.login(key, false)
        for (const acc of accounts) {
          const account = {
            id: acc.address,
            name: acc.name || '',
            description: acc.description,
            address: acc.address,
            publicKey: acc.publicKey || '',
            privateKey: acc.privateKey,
            createdAt: Date.now()
          }
          await accountsStore.addAccount(account, key)
        }
        const first = accountsStore.accounts[0]
        if (first) authStore.setActiveAccount(first)
        if (savePassword.value) {
          localStorage.setItem(PASSWORD_STORAGE_KEY, migrateForm.password)
        }
        closeMigrateModal()
        toast.success(`Restored ${accounts.length} account(s) from multiwallet`)
        router.push('/accounts')
      } catch (e) {
        migrateError.value = e.message || 'Failed to restore. Check your password.'
      } finally {
        migrating.value = false
      }
    }

    onMounted(() => {
      runLoginEntryInit().catch((e) => {
        console.error('Login init failed', e)
        setupFlow.value = true
        hasStoredAccounts.value = false
        applyDefaultLoginTab(false)
      })
    })

    return {
      showLegacyMigrateOnSetup,
      showLegacyPostMigrateLoginHint,
      setupFlow,
      hasStoredAccounts,
      createHeaderTitle,
      createHeaderSubtitle,
      loginMode,
      setLoginMode,
      enterSetupFlow,
      backToLoginFromSetup,
      isSetup,
      hasLegacyWallet,
      addForm,
      addErrors,
      handleAdd,
      adding,
      showCreatePassword,
      showConfirmPassword,
      savePassword,
      onSavePasswordCheckboxChange,
      passwordForm,
      quickLoginForm,
      quickLoginErrors,
      loading,
      showPassword,
      showPrivateKey,
      carouselSlides,
      handlePasswordLogin,
      handlePrivateKeyLogin,
      handleFastLogin,
      validateQuickLoginField,
      showLegacyMultiwalletHint,
      showMigrateModal,
      showMigratePassword,
      migrating,
      migrateError,
      migrateAccountsCount,
      migrateForm,
      openMigrateModal,
      closeMigrateModal,
      confirmMigrate,
      showNoRecoveryModal,
      agreeNoRecovery,
      closeNoRecoveryModal,
      confirmNoSavePassword,
      savePrivateKeyLocally,
      onSavePrivateKeyCheckboxChange,
      showPrivateKeyStorageModal,
      agreePrivateKeyStorage,
      closePrivateKeyStorageModal,
      confirmDontSavePrivateKeyLocally
    }
  }
}
</script>


<style scoped>
.auth-page {
  min-height: 100vh;
  background-color: #f8f9fa;
}

.auth-full-page-content {
  min-height: 100vh;
}

.auth-logo .logo-txt {
  font-weight: 700;
  font-size: 18px;
  vertical-align: middle;
  margin-left: 5px;
  color: inherit;
}

.auth-content {
  flex: 1;
}

.bg-overlay {
  position: absolute;
  height: 100%;
  width: 100%;
  right: 0;
  bottom: 0;
  left: 0;
  top: 0;
  opacity: 0.9;
  background-color: #5156be;
}

.bg-bubbles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}

.bg-bubbles li {
  position: absolute;
  list-style: none;
  display: block;
  width: 40px;
  height: 40px;
  border-radius: 30px;
  background-color: rgba(255, 255, 255, 0.1);
  bottom: -50px;
  animation: square 20s infinite;
  transition-timing-function: linear;
}

.bg-bubbles li:nth-child(1) {
  left: 10%;
}

.bg-bubbles li:nth-child(2) {
  left: 20%;
  width: 120px;
  height: 120px;
  animation-delay: 2s;
  animation-duration: 17s;
}

.bg-bubbles li:nth-child(3) {
  left: 25%;
  animation-delay: 4s;
}

.bg-bubbles li:nth-child(4) {
  left: 40%;
  width: 80px;
  height: 80px;
  animation-duration: 22s;
}

.bg-bubbles li:nth-child(5) {
  left: 70%;
  width: 90px;
  height: 90px;
}

.bg-bubbles li:nth-child(6) {
  left: 70%;
  width: 120px;
  height: 120px;
  animation-delay: 3s;
}

.bg-bubbles li:nth-child(7) {
  left: 32%;
  width: 150px;
  height: 150px;
  animation-delay: 7s;
}

.bg-bubbles li:nth-child(8) {
  left: 55%;
  width: 80px;
  height: 80px;
  animation-delay: 15s;
  animation-duration: 40s;
}

.bg-bubbles li:nth-child(9) {
  left: 25%;
  width: 50px;
  height: 50px;
  animation-delay: 2s;
  animation-duration: 40s;
}

.bg-bubbles li:nth-child(10) {
  left: 90%;
  width: 140px;
  height: 140px;
  animation-delay: 11s;
}

@keyframes square {
  0% {
    transform: translateY(0) rotate(0deg);
  }
  100% {
    transform: translateY(-1000px) rotate(600deg);
  }
}

.testi-contain {
  position: relative;
  z-index: 2;
}

.carousel-indicators-rounded {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 15;
  display: flex;
  justify-content: flex-start;
  padding: 0;
  margin: 0;
  list-style: none;
}

.carousel-indicators-rounded button {
  border-radius: 50%;
  width: 12px;
  height: 12px;
  margin: 0 4px;
  background-color: rgba(255, 255, 255, 0.5);
  border: 2px solid transparent;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.carousel-indicators-rounded button:hover {
  opacity: 0.75;
}

.carousel-indicators-rounded button.active {
  background-color: rgba(255, 255, 255, 1);
  border-color: rgba(255, 255, 255, 1);
  opacity: 1;
}

.avatar-md {
  width: 3rem;
  height: 3rem;
}

</style>
