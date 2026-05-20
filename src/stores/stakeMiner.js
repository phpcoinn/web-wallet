import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { useAccountsStore } from './accounts'
import {
  fetchStakeMinePreview,
  requestStakeMine,
  signStakeMineAuthorization,
  formatStakeMineBlockers
} from '../utils/stakeMine.js'
import { toast } from '../utils/toast.js'

export const useStakeMinerStore = defineStore('stakeMiner', () => {
  const authStore = useAuthStore()
  const accountsStore = useAccountsStore()

  const previewLoading = ref(false)
  const previewError = ref('')
  /** @type {import('vue').Ref<Record<string, unknown> | null>} */
  const preview = ref(null)
  const mining = ref(false)
  const lastMineResult = ref(null)
  const lastMineError = ref('')

  const address = computed(() => authStore.activeAccount?.address || '')

  const canMine = computed(() => {
    if (!address.value || mining.value) return false
    if (preview.value?.mine_would_accept === true) return true
    return false
  })

  const blockerMessages = computed(() => {
    if (!preview.value) return []
    return formatStakeMineBlockers(
      preview.value.blockers,
      Number(preview.value.cooldown_chain_blocks_remaining) || 0
    )
  })

  async function loadPreview() {
    if (!address.value) {
      preview.value = null
      previewError.value = ''
      return
    }
    previewLoading.value = true
    previewError.value = ''
    try {
      const { data } = await fetchStakeMinePreview(address.value)
      preview.value = data
    } catch (e) {
      preview.value = null
      previewError.value = e?.message || 'Failed to load preview'
    } finally {
      previewLoading.value = false
    }
  }

  async function executeMine(privateKey) {
    if (!privateKey || !authStore.activeAccount) {
      toast.error('No private key')
      return
    }
    const acc = authStore.activeAccount
    const sig = signStakeMineAuthorization(privateKey)
    if (!sig) {
      toast.error('Signing failed')
      return
    }

    mining.value = true
    lastMineError.value = ''
    lastMineResult.value = null
    try {
      const { data } = await requestStakeMine({
        address: acc.address,
        signature: sig,
        publicKey: acc.publicKey
      })
      lastMineResult.value = data
      toast.success('Stake mine payout submitted')
      await loadPreview()
    } catch (e) {
      lastMineError.value = e?.message || 'Stake mine failed'
      toast.error(lastMineError.value)
    } finally {
      mining.value = false
    }
  }

  function requestMine() {
    if (!authStore.activeAccount?.address) {
      toast.error('No active account')
      return
    }
    if (!canMine.value) {
      toast.error('Mining not available — check preview')
      return
    }
    if (authStore.isQuickLogin) {
      void executeMine(authStore.masterKey)
      return
    }
    return 'password'
  }

  function onPasswordConfirmed(masterKey) {
    if (!authStore.activeAccount) return
    try {
      const pk = accountsStore.getDecryptedPrivateKey(authStore.activeAccount, masterKey)
      void executeMine(pk)
    } catch (e) {
      toast.error(e?.message || 'Could not decrypt private key')
    }
  }

  watch(
    () => authStore.activeAccount?.address,
    () => {
      lastMineResult.value = null
      lastMineError.value = ''
      void loadPreview()
    },
    { immediate: true }
  )

  return {
    previewLoading,
    previewError,
    preview,
    mining,
    lastMineResult,
    lastMineError,
    canMine,
    blockerMessages,
    loadPreview,
    requestMine,
    onPasswordConfirmed
  }
})
