import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { api } from '../utils/api.js'
import { toast } from '../utils/toast.js'
import { useAuthStore } from './auth.js'
import { useAccountsStore } from './accounts.js'
import {
  STAKE_MINE_DELEGATION_ACTION_DISABLE,
  STAKE_MINE_DELEGATION_ACTION_ENABLE,
  STAKE_MINE_DELEGATION_APP,
  STAKE_MINE_DELEGATION_MAINNET_ONLY,
  STAKE_MINE_SERVICE_ADDRESS,
  buildStakeMineDelegationTransaction,
  resolveStakeMineServiceTarget
} from '../utils/stakeMineDelegation.js'
import { signStakeMineAuthorization } from '../utils/stakeMine.js'

export const useStakeMineDelegationStore = defineStore('stakeMineDelegation', () => {
  const authStore = useAuthStore()
  const accountsStore = useAccountsStore()

  const serviceInput = ref(STAKE_MINE_SERVICE_ADDRESS)
  const loading = ref(false)
  const loadingError = ref('')
  const latestRecord = ref(null)
  const history = ref([])
  const saving = ref(false)
  const pendingAction = ref('')
  const lastResult = ref(null)
  const lastError = ref('')
  const isEnabledOnNetwork = STAKE_MINE_DELEGATION_MAINNET_ONLY

  const serviceTarget = computed(() => {
    const raw = String(serviceInput.value || '').trim()
    if (!raw) return null
    try {
      return resolveStakeMineServiceTarget(raw)
    } catch (e) {
      return { error: e?.message || 'Invalid service target' }
    }
  })

  const serviceAddress = computed(() => serviceTarget.value?.address || '')
  const serviceError = computed(() => serviceTarget.value?.error || '')

  const accountAddress = computed(() => authStore.activeAccount?.address || '')
  const accountPublicKey = computed(() => authStore.activeAccount?.publicKey || '')

  const isEnabled = computed(() => latestRecord.value?.action === STAKE_MINE_DELEGATION_ACTION_ENABLE)
  const statusLabel = computed(() => {
    if (!accountAddress.value) return 'No account'
    if (!serviceAddress.value) return 'Choose service'
    if (loading.value) return 'Loading'
    if (isEnabled.value) return 'Enabled'
    if (latestRecord.value) return 'Disabled'
    return 'No delegation'
  })
  const statusBadgeClass = computed(() => {
    if (!accountAddress.value || !serviceAddress.value) return 'bg-secondary'
    if (loading.value) return 'bg-info'
    if (isEnabled.value) return 'bg-success'
    if (latestRecord.value) return 'bg-danger'
    return 'bg-secondary'
  })

  const canToggle = computed(() => {
    return (
      isEnabledOnNetwork &&
      !!accountAddress.value &&
      !!serviceAddress.value &&
      !loading.value &&
      !saving.value &&
      !serviceError.value
    )
  })

  function normalizeHistory(rows) {
    if (!Array.isArray(rows)) return []
    return rows.map((row) => {
      let jsonData = row?.json_data ?? null
      if (typeof jsonData === 'string') {
        try {
          jsonData = JSON.parse(jsonData)
        } catch {
          // Keep raw string.
        }
      }
      return {
        ...row,
        json_data: jsonData
      }
    })
  }

  async function loadStatus() {
    if (!isEnabledOnNetwork) {
      latestRecord.value = null
      history.value = []
      loadingError.value = 'Delegated stake mining is mainnet-only'
      return
    }
    if (!accountAddress.value || !serviceAddress.value || serviceError.value) {
      latestRecord.value = null
      history.value = []
      loadingError.value = serviceError.value || ''
      return
    }

    loading.value = true
    loadingError.value = ''
    try {
      const rows = await api.findTxData({
        app: STAKE_MINE_DELEGATION_APP,
        src: accountAddress.value,
        dst: serviceAddress.value,
        limit: 100
      })
      history.value = normalizeHistory(rows)
      latestRecord.value = history.value[0] || null
    } catch (e) {
      latestRecord.value = null
      history.value = []
      loadingError.value = e?.message || 'Failed to load delegation status'
    } finally {
      loading.value = false
    }
  }

  async function executeAction(action, privateKey) {
    if (!isEnabledOnNetwork) {
      toast.error('Delegated stake mining is mainnet-only')
      return
    }
    if (!authStore.activeAccount) {
      toast.error('No active account')
      return
    }
    if (!privateKey) {
      toast.error('No private key')
      return
    }
    if (!serviceAddress.value) {
      toast.error('Delegated service address is not configured')
      return
    }
    const mineSig = signStakeMineAuthorization(privateKey)
    if (!mineSig) {
      toast.error('Failed to build stake-mine authorization')
      return
    }

    saving.value = true
    lastError.value = ''
    lastResult.value = null
    try {
      const tx = await buildStakeMineDelegationTransaction({
        privateKey,
        publicKey: accountPublicKey.value,
        src: accountAddress.value,
        dst: serviceAddress.value,
        action,
        mineSig,
        minePubkey: accountPublicKey.value
      })
      const result = await api.sendTransaction(tx)
      lastResult.value = result
      toast.success(action === STAKE_MINE_DELEGATION_ACTION_ENABLE ? 'Delegation enabled' : 'Delegation disabled')
      await loadStatus()
    } catch (e) {
      lastError.value = e?.message || 'Failed to submit delegation transaction'
      toast.error(lastError.value)
    } finally {
      saving.value = false
    }
  }

  function requestEnable() {
    if (!canToggle.value) {
      toast.error(serviceError.value || 'Delegation is not ready')
      return
    }
    pendingAction.value = STAKE_MINE_DELEGATION_ACTION_ENABLE
    if (authStore.isQuickLogin) {
      void executeAction(STAKE_MINE_DELEGATION_ACTION_ENABLE, authStore.masterKey)
      pendingAction.value = ''
      return
    }
    return 'password'
  }

  function requestDisable() {
    if (!canToggle.value) {
      toast.error(serviceError.value || 'Delegation is not ready')
      return
    }
    pendingAction.value = STAKE_MINE_DELEGATION_ACTION_DISABLE
    if (authStore.isQuickLogin) {
      void executeAction(STAKE_MINE_DELEGATION_ACTION_DISABLE, authStore.masterKey)
      pendingAction.value = ''
      return
    }
    return 'password'
  }

  function onPasswordConfirmed(masterKey) {
    const action = pendingAction.value
    pendingAction.value = ''
    if (!action || !authStore.activeAccount) return
    try {
      const privateKey = accountsStore.getDecryptedPrivateKey(authStore.activeAccount, masterKey)
      void executeAction(action, privateKey)
    } catch (e) {
      toast.error(e?.message || 'Could not decrypt private key')
    }
  }

  watch(
    () => authStore.activeAccount?.address,
    () => {
      lastError.value = ''
      lastResult.value = null
      pendingAction.value = ''
      void loadStatus()
    },
    { immediate: true }
  )

  return {
    serviceInput,
    serviceAddress,
    serviceError,
    isEnabledOnNetwork,
    loading,
    loadingError,
    latestRecord,
    history,
    saving,
    pendingAction,
    lastResult,
    lastError,
    statusLabel,
    statusBadgeClass,
    canToggle,
    isEnabled,
    loadStatus,
    requestEnable,
    requestDisable,
    onPasswordConfirmed,
  }
})
