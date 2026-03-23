<template>
  <div>
    <div class="text-center mb-4">
      <h5 class="mb-2">Restore accounts</h5>
      <p class="text-muted">Restore your wallet from a backup file.</p>
    </div>
    <form @submit.prevent="handleRestore">
      <div class="mb-4">
        <label class="form-label">Backup file</label>
        <input
          ref="fileInputRef"
          type="file"
          class="form-control"
          accept=".json"
          @change="onFileSelected"
        />
        <div v-if="selectedFile" class="mt-2 text-muted">
          {{ selectedFile.name }}
        </div>
        <div v-if="fileError" class="text-danger mt-1">{{ fileError }}</div>
      </div>
      <div v-if="backupParsed" class="mb-4">
        <label class="form-label">Password</label>
        <div class="input-group">
          <input
            :type="showPassword ? 'text' : 'password'"
            class="form-control"
            :class="{ 'is-invalid': passwordError }"
            v-model="password"
            placeholder="Enter your wallet password"
            @keyup.enter="handleRestore"
          />
          <button
            class="btn btn-light shadow-none"
            type="button"
            @click="showPassword = !showPassword"
          >
            <i :class="showPassword ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
          </button>
        </div>
        <div v-if="passwordError" class="invalid-feedback d-block">{{ passwordError }}</div>
        <div class="form-text">
          Use the same password you used when creating the wallet or exporting the backup.
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!canRestore || restoring"
        >
          <span v-if="restoring" class="spinner-border spinner-border-sm me-2" role="status"></span>
          {{ restoring ? 'Restoring...' : 'Restore' }}
        </button>
        <button type="button" class="btn btn-outline-secondary" @click="backToWalletSetup">
          <i class="mdi mdi-arrow-left me-1"></i>
          Back
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { deriveMasterKey } from '../utils/crypto'
import { toast } from '../utils/toast'
import { requestAuthSetupFlow } from '../utils/authEntryIntent'

export default {
  name: 'RestoreAccount',
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const accountsStore = useAccountsStore()

    const fileInputRef = ref(null)
    const selectedFile = ref(null)
    const backupData = ref(null)
    const fileError = ref('')
    const password = ref('')
    const passwordError = ref('')
    const showPassword = ref(false)
    const restoring = ref(false)

    const backupParsed = computed(() => !!backupData.value)
    const canRestore = computed(() => backupParsed.value && password.value.trim().length >= 6)

    function onFileSelected(event) {
      const file = event.target?.files?.[0]
      backupData.value = null
      fileError.value = ''
      password.value = ''
      passwordError.value = ''

      if (!file) {
        selectedFile.value = null
        return
      }
      selectedFile.value = file

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result
          if (typeof content !== 'string') {
            fileError.value = 'Could not read file'
            return
          }
          const parsed = JSON.parse(content)
          if (!parsed.accounts) {
            fileError.value = 'Invalid backup file: missing accounts'
            return
          }
          if (Array.isArray(parsed.accounts)) {
            if (parsed.accounts.length === 0) {
              fileError.value = 'Backup file contains no accounts'
              return
            }
          } else if (typeof parsed.accounts !== 'string') {
            fileError.value = 'Invalid backup file format'
            return
          }
          backupData.value = parsed
        } catch (err) {
          fileError.value = 'Invalid backup file: not valid JSON'
          console.error('Parse backup error:', err)
        }
      }
      reader.onerror = () => {
        fileError.value = 'Could not read file'
      }
      reader.readAsText(file)
    }

    async function handleRestore() {
      if (!backupData.value || !password.value.trim()) return
      if (password.value.length < 6) {
        passwordError.value = 'Password must be at least 6 characters'
        return
      }
      passwordError.value = ''
      restoring.value = true
      try {
        const { key } = deriveMasterKey(password.value)
        await accountsStore.restoreFromBackup(backupData.value, key)
        authStore.login(key, false)
        authStore.setActiveAccount(accountsStore.accounts[0])
        toast.success(`Restored ${accountsStore.accounts.length} account(s)`)
        router.replace({ name: 'Dashboard' })
      } catch (error) {
        console.error('Restore error:', error)
        passwordError.value = error.message || 'Failed to restore'
      } finally {
        restoring.value = false
      }
    }

    function backToWalletSetup() {
      requestAuthSetupFlow()
      router.push({ name: 'Login' })
    }

    return {
      fileInputRef,
      selectedFile,
      backupParsed,
      password,
      passwordError,
      showPassword,
      restoring,
      canRestore,
      onFileSelected,
      handleRestore,
      backToWalletSetup
    }
  }
}
</script>
