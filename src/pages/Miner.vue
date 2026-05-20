<template>
  <div>
    <div class="row">
      <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0 font-size-18">Miner</h4>
          <div class="page-title-right">
            <ol class="breadcrumb m-0">
              <li class="breadcrumb-item"><router-link to="/dashboard">Dashboard</router-link></li>
              <li class="breadcrumb-item active">Miner</li>
            </ol>
          </div>
        </div>
      </div>
    </div>


    <div class="row">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
              <div class="flex-grow-1" style="min-width: 0">
                <label for="miner-node-url" class="form-label">Mining node URL</label>
                <input
                  id="miner-node-url"
                  v-model="miningUrlInput"
                  type="text"
                  class="form-control font-monospace"
                  spellcheck="false"
                  :disabled="minerRunning"
                />
              </div>
              <div class="d-flex gap-2 flex-wrap flex-shrink-0">
                <button
                  type="button"
                  class="btn btn-success"
                  :disabled="minerRunning || !canStart"
                  @click="startMiner"
                >
                  Start
                </button>
                <button type="button" class="btn btn-danger" :disabled="!minerRunning" @click="stopMiner">Stop</button>
              </div>
            </div>

            <template v-if="!verifiedAddress && !checkingVerify">
              <div class="alert alert-warning mb-0 py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <span><i class="bx bx-error-circle me-1"></i>Your account is not verified – so you cannot use it for mining.</span>
                <button type="button" class="btn btn-warning btn-sm" @click="openVerifierWallet">Verify</button>
              </div>
            </template>

            <template v-else-if="checkingVerify">
              <div class="text-muted small">Checking verification…</div>
            </template>

            <template v-else>
              <div class="row g-3 mb-3 align-items-center">
                <div class="col-md-6">
                  <div class="d-flex align-items-center gap-2 flex-nowrap">
                    <label class="form-label mb-0 text-nowrap">CPU</label>
                    <span class="small text-muted font-monospace text-nowrap">{{ cpu }}%</span>
                    <input
                      v-model.number="cpu"
                      type="range"
                      class="form-range flex-grow-1 m-0"
                      style="min-width: 0"
                      min="0"
                      max="100"
                      step="1"
                      :disabled="minerRunning"
                      @input="onCpuInput"
                    />
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="d-flex align-items-center gap-2 flex-nowrap">
                    <label class="form-label mb-0 text-nowrap">Threads</label>
                    <span class="small text-muted font-monospace text-nowrap">{{ minerThreads }}</span>
                    <input
                      v-model.number="minerThreads"
                      type="range"
                      class="form-range flex-grow-1 m-0"
                      style="min-width: 0"
                      min="1"
                      :max="maxParallel"
                      step="1"
                      :disabled="minerRunning"
                    />
                  </div>
                </div>
              </div>

              <template v-if="minerRunning">
                <div class="d-flex flex-wrap justify-content-between align-items-baseline gap-2 fs-6 mb-2">
                  <span>Mining height <span class="badge bg-info">{{ miner?.height }}</span></span>
                  <span class="text-muted">Speed (sum) <strong class="text-body">{{ miningStat.speed }}</strong> H/s</span>
                  <span class="text-muted">Running {{ runningTimeHuman }}</span>
                </div>
                <div class="d-flex flex-wrap gap-3 mb-3">
                  <span><span class="badge bg-success">{{ sessionAccepted }}</span> Accepted</span>
                  <span><span class="badge bg-danger">{{ sessionRejected }}</span> Rejected</span>
                  <span><span class="badge bg-warning text-dark">{{ sessionDropped }}</span> Dropped</span>
                </div>

                <div class="mb-2">
                  <div class="d-flex justify-content-between small text-muted"><span>Elapsed</span><span>{{ miner?.elapsed }}</span></div>
                  <div class="progress" style="height: 10px">
                    <div class="progress-bar bg-warning" role="progressbar" :style="{ width: percElapsed + '%' }" />
                  </div>
                </div>
                <div class="mb-2">
                  <div class="d-flex justify-content-between small text-muted">
                    <span>Hit</span>
                    <span>
                      {{ miner?.hit }}
                      <span v-if="miner?.maxHit != null && String(miner?.maxHit) !== String(miner?.hit)" class="text-muted">
                        · peak {{ miner?.maxHit }}</span>
                    </span>
                  </div>
                  <div class="progress hit-progress-stack position-relative" style="height: 12px">
                    <div
                      class="progress-bar bg-info"
                      role="progressbar"
                      :style="{ width: percHit + '%' }"
                      :aria-valuenow="percHit"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    />
                    <div
                      v-if="percHitPeakMarker > 0"
                      class="hit-peak-marker"
                      :style="{ left: `calc(${percHitPeakMarker}% - 1px)` }"
                      title="Peak hit this block (best roll so far on the same scale as target)"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div class="mb-2">
                  <div class="d-flex justify-content-between small text-muted"><span>Target</span><span>{{ miner?.target }}</span></div>
                  <div class="progress" style="height: 10px">
                    <div class="progress-bar bg-secondary" role="progressbar" :style="{ width: percTarget + '%' }" />
                  </div>
                </div>

              </template>

              <template v-else>
                <div class="text-muted text-center py-4">Miner stopped. Adjust CPU / threads, then press Start.</div>
              </template>
            </template>
          </div>
        </div>

        <div class="card mt-4">
          <div class="card-header">
            <h5 class="card-title mb-0 d-flex align-items-center gap-2 flex-wrap">
              Stake mining
              <span class="badge bg-primary text-white">New</span>
            </h5>
          </div>
          <div class="card-body">
            <p class="text-muted mb-3">
              Staking-backed lightweight mining: sign a fixed authorization message and request a payout from the
              pool reserve. No CPU hashing — rewards depend on balance, account age, on-chain activity, and pool
              reserve.
            </p>

            <div v-if="!authStore.activeAccount?.address" class="alert alert-warning mb-0">No active account.</div>

            <template v-else>
              <div class="mb-3">
                <span class="text-muted d-block mb-1">Mining as</span>
                <code class="user-select-all text-break">{{ authStore.activeAccount.address }}</code>
              </div>

              <div class="d-flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  :disabled="stakePreviewLoading || stakeMining"
                  @click="loadStakePreview"
                >
                  <span v-if="stakePreviewLoading" class="spinner-border spinner-border-sm me-1" role="status" />
                  Refresh preview
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  :disabled="!stakeCanMine || stakeMining || stakePreviewLoading"
                  @click="onStakeMineClick"
                >
                  <span v-if="stakeMining" class="spinner-border spinner-border-sm me-2" role="status" />
                  Mine (stake)
                </button>
              </div>

              <div v-if="stakePreviewLoading && !stakePreview" class="text-muted">Loading preview…</div>
              <div v-else-if="stakePreviewError" class="alert alert-danger mb-3 py-2">{{ stakePreviewError }}</div>

              <template v-else-if="stakePreview">
                <div class="row g-2 mb-3">
                  <div class="col-sm-6 col-md-4">
                    <div class="border rounded p-2 h-100">
                      <div class="text-muted">Potential payout</div>
                      <div class="fw-semibold">{{ stakePreview.potential_reward }} {{ STAKE_MINE_COIN }}</div>
                    </div>
                  </div>
                  <div class="col-sm-6 col-md-4">
                    <div class="border rounded p-2 h-100">
                      <div class="text-muted">Weight</div>
                      <div class="fw-semibold font-monospace">{{ stakePreview.weight }}</div>
                    </div>
                  </div>
                  <div class="col-sm-6 col-md-4">
                    <div class="border rounded p-2 h-100">
                      <div class="text-muted">Pool reserve</div>
                      <div class="fw-semibold">{{ stakePreview.reserve_balance }} {{ STAKE_MINE_COIN }}</div>
                    </div>
                  </div>
                </div>

                <table class="table table-sm table-bordered mb-3">
                  <tbody>
                    <tr>
                      <th scope="row" class="text-muted" style="width: 40%">Your balance</th>
                      <td>{{ stakePreview.address_balance }} {{ STAKE_MINE_COIN }}</td>
                    </tr>
                    <tr>
                      <th scope="row" class="text-muted">Age / activity blocks</th>
                      <td>{{ stakePreview.age_blocks }} / {{ stakePreview.activity_blocks }}</td>
                    </tr>
                    <tr>
                      <th scope="row" class="text-muted">Factors (√bal × age × activity)</th>
                      <td class="font-monospace">
                        {{ stakePreview.balance_factor }} × {{ stakePreview.age_factor }} ×
                        {{ stakePreview.activity_factor }}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row" class="text-muted">Cooldown</th>
                      <td>
                        <span v-if="stakePreview.cooldown_mempool" class="text-warning">Mempool payout pending</span>
                        <span v-else-if="Number(stakePreview.cooldown_chain_blocks_remaining) > 0">
                          {{ stakePreview.cooldown_chain_blocks_remaining }} block(s) remaining
                        </span>
                        <span v-else class="text-success">Ready</span>
                      </td>
                    </tr>
                    <tr>
                      <th scope="row" class="text-muted">Can mine now</th>
                      <td>
                        <span v-if="stakePreview.mine_would_accept" class="text-success">Yes</span>
                        <span v-else class="text-danger">No</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <ul v-if="stakeBlockerMessages.length" class="mb-3 text-danger">
                  <li v-for="(msg, i) in stakeBlockerMessages" :key="i">{{ msg }}</li>
                </ul>
              </template>

              <div v-if="stakeLastMineResult?.txid" class="alert alert-success mb-0 py-2">
                <div class="fw-semibold mb-1">Last payout submitted</div>
                <div>
                  Earned <strong>{{ stakeLastMineResult.potential_reward ?? stakeLastMineResult.amount_float }}</strong>
                  {{ STAKE_MINE_COIN }}
                </div>
                <a
                  :href="stakeTxExplorerUrl(stakeLastMineResult.txid)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-monospace text-break"
                >
                  {{ stakeLastMineResult.txid }}
                </a>
              </div>
              <div v-else-if="stakeLastMineError" class="alert alert-danger mb-0 py-2">{{ stakeLastMineError }}</div>
            </template>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Miner log</span>
            <button type="button" class="btn btn-sm btn-outline-danger" :disabled="minerRunning || !logs.length" @click="clearLogs">
              Clear
            </button>
          </div>
          <div class="card-body log-panel">
            <template v-if="!logs.length">
              <span class="text-muted">No events yet.</span>
            </template>
            <div v-for="(log, ix) in logs" :key="ix" :class="logClass(log.type)" class="alert py-2 px-2 mb-2">
              <div class="fw-semibold">{{ log.title }}</div>
              <div class="text-break">{{ log.message }}</div>
              <div class="text-muted">{{ ago(log.time) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <PasswordConfirmModal
      v-model="showVerifierPasswordModal"
      action-label="Enter your password to open the verifier with a signed login request."
      @confirm="onVerifierPasswordConfirmed"
    />
    <PasswordConfirmModal
      v-model="showStakeMinePasswordModal"
      action-label="Enter your password to sign stake mining authorization and request a payout."
      @confirm="onStakeMinePasswordConfirmed"
    />
    <VerifierModal
      v-model="showVerifierModal"
      @verified="onVerifierInWalletSuccess"
      @open-external="openVerifierExternal"
    />
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'
import { useAccountsStore } from '../stores/accounts'
import { buildVerifierLoginUrl } from '../utils/verifierLogin'
import { toast } from '../utils/toast'
import PasswordConfirmModal from '../components/PasswordConfirmModal.vue'
import VerifierModal from '../components/VerifierModal.vue'
import { useMinerStore } from '../stores/miner'
import { useStakeMinerStore } from '../stores/stakeMiner'
import { stakeMineExplorerTxUrl, STAKE_MINE_COIN } from '../utils/stakeMine'

const minerStore = useMinerStore()
const stakeMinerStore = useStakeMinerStore()
const {
  miningUrlInput,
  cpu,
  minerThreads,
  minerRunning,
  checkingVerify,
  verifiedAddress,
  sessionAccepted,
  sessionRejected,
  sessionDropped,
  miningStat,
  miner,
  logs,
  canStart,
  maxParallel,
  runningTimeHuman,
  percHit,
  percHitPeakMarker,
  percTarget,
  percElapsed
} = storeToRefs(minerStore)

const { startMiner, stopMiner, clearLogs, checkVerified, onCpuInput, logClass, ago, onMinerPageLeave } =
  minerStore

const authStore = useAuthStore()
const accountsStore = useAccountsStore()
const showVerifierPasswordModal = ref(false)
const showVerifierModal = ref(false)
const showStakeMinePasswordModal = ref(false)

const {
  previewLoading: stakePreviewLoading,
  previewError: stakePreviewError,
  preview: stakePreview,
  mining: stakeMining,
  lastMineResult: stakeLastMineResult,
  lastMineError: stakeLastMineError,
  canMine: stakeCanMine,
  blockerMessages: stakeBlockerMessages
} = storeToRefs(stakeMinerStore)

const { loadPreview: loadStakePreview, onPasswordConfirmed: stakeMinePasswordConfirm } = stakeMinerStore

function stakeTxExplorerUrl(txid) {
  return stakeMineExplorerTxUrl(txid)
}

function onStakeMinePasswordConfirmed(masterKey) {
  showStakeMinePasswordModal.value = false
  stakeMinePasswordConfirm(masterKey)
}

function onStakeMineClick() {
  const needPassword = stakeMinerStore.requestMine()
  if (needPassword === 'password') {
    showStakeMinePasswordModal.value = true
  }
}

function openVerifierInNewTab(privateKey) {
  try {
    const url = buildVerifierLoginUrl(privateKey)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (e) {
    console.error('Verifier login URL:', e)
    toast.error(e.message || 'Could not build verifier link')
  }
}

function openVerifierWallet() {
  if (!authStore.activeAccount) {
    toast.error('No active account')
    return
  }
  showVerifierModal.value = true
}

function openVerifierExternal() {
  if (authStore.isQuickLogin) {
    const pk = authStore.masterKey
    if (!pk) {
      toast.error('No private key')
      return
    }
    openVerifierInNewTab(pk)
    return
  }
  if (!authStore.activeAccount) {
    toast.error('No active account')
    return
  }
  showVerifierPasswordModal.value = true
}

function onVerifierPasswordConfirmed(masterKey) {
  if (!authStore.activeAccount) return
  try {
    const privateKey = accountsStore.getDecryptedPrivateKey(authStore.activeAccount, masterKey)
    openVerifierInNewTab(privateKey)
  } catch (e) {
    toast.error('Failed to decrypt private key')
  }
}

function onVerifierInWalletSuccess() {
  void checkVerified()
}

onMounted(() => {
  void checkVerified()
})

onBeforeUnmount(() => {
  onMinerPageLeave()
})
</script>

<style scoped>
.log-panel {
  max-height: 420px;
  overflow: auto;
}

.hit-progress-stack {
  overflow: visible;
}

.hit-peak-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: 0;
  z-index: 2;
  pointer-events: none;
  background: var(--bs-primary, #0d6efd);
  border-radius: 0;
}
</style>
