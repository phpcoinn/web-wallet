<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="mb-4">
      <h1 class="font-semibold mb-1" style="font-size: 1.5rem; font-weight: 500; color: #313533;">Transaction History</h1>
      <p style="color: #74788d; font-size: 0.875rem;">View all your PHP Coin transactions</p>
    </div>

    <!-- Transactions Card - Minia Exact Style -->
    <div class="minia-card">
      <div>
        <div v-if="loading && transactions.length === 0" class="text-center py-12">
          <span class="spinner-border spinner-border-lg" role="status" style="color: #5156be;">
            <span class="visually-hidden">Loading...</span>
          </span>
          <p class="mt-4 text-phpcoin-text-secondary">Loading transactions...</p>
        </div>
        <div v-else-if="transactions.length === 0" class="text-center py-12">
          <div class="p-4 bg-gray-100 rounded-full inline-block mb-4">
            <History :size="32" class="text-phpcoin-text-secondary" />
          </div>
          <p class="text-phpcoin-text-primary font-medium">No transactions yet</p>
          <p class="text-sm text-phpcoin-text-secondary mt-2">Your transaction history will appear here</p>
          <div class="mt-6">
            <router-link to="/send">
              <button class="btn btn-primary">Send Your First Transaction</button>
            </router-link>
          </div>
        </div>
        <div v-else>
          <!-- Bootstrap Table -->
          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Date</th>
                  <th style="width: 100px;">Type</th>
                  <th>Transaction ID</th>
                  <th>Address</th>
                  <th style="width: 150px;">Amount</th>
                  <th style="width: 100px;">Confirmations</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in paginatedTransactions" :key="idx">
                  <td><span style="font-size: 0.875rem;">{{ new Date((row.date || row.timestamp || 0) * 1000).toLocaleString() }}</span></td>
                  <td>
                    <span
                      class="badge"
                      :class="getTxTypeBadgeClass(row)"
                    >
                      {{ getTxTypeLabel(row) }}
                    </span>
                  </td>
                  <td>
                    <a
                      v-if="getTxId(row)"
                      :href="getExplorerTxUrl(row)"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="font-monospace text-primary text-decoration-none"
                      style="font-size: 0.875rem;"
                      :title="getTxId(row)"
                    >
                      {{ formatTxIdShort(row) }}
                    </a>
                    <span v-else class="text-muted small">—</span>
                  </td>
                  <td>
                    <Address :address="getCounterpartyAddress(row)" />
                  </td>
                  <td>
                    <span :class="(row.src || row.from) === activeAccount?.address ? 'text-danger' : 'text-success'">
                      {{ (row.src || row.from) === activeAccount?.address ? '-' : '+' }}{{ parseFloat(row.val || row.amount || 0).toFixed(8) }}
                    </span>
                  </td>
                  <td>
                    <span class="text-muted small">
                      {{ formatConfirmations(row) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div class="d-flex justify-content-between align-items-center mt-4">
            <div>
              <label class="me-2">Show:</label>
              <select class="form-select form-select-sm d-inline-block" style="width: auto;" v-model="pageSize" @change="page = 1">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>
            <div>
              <span class="text-muted me-3">
                Showing {{ (page - 1) * pageSize + 1 }} to {{ Math.min(page * pageSize, transactions.length) }} of {{ transactions.length }}
              </span>
              <button
                class="btn btn-sm btn-outline-secondary"
                :disabled="page === 1"
                @click="page--"
              >
                Previous
              </button>
              <button
                class="btn btn-sm btn-outline-secondary ms-2"
                :disabled="page >= totalPages"
                @click="page++"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { History } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { api, EXPLORER_BASE } from '../utils/api'
import Address from '../components/Address.vue'

export default {
  name: 'TransactionHistory',
  components: { Address, History },
  setup() {
    const authStore = useAuthStore()
    const transactions = ref([])
    const loading = ref(false)
    const page = ref(1)
    const pageSize = ref(20)
    
    const activeAccount = computed(() => authStore.activeAccount)
    
    const totalPages = computed(() => Math.ceil(transactions.value.length / pageSize.value))
    
    const paginatedTransactions = computed(() => {
      const start = (page.value - 1) * pageSize.value
      const end = start + pageSize.value
      return transactions.value.slice(start, end)
    })
    
    const getConfirmations = (row) => {
      const c = row.confirmation ?? row.confirmations ?? 0
      if (typeof c === 'number') return c
      const n = parseInt(c, 10)
      return isNaN(n) ? 0 : n
    }

    const getTxTypeLabel = (row) => {
      const isOut = (row.src || row.from) === activeAccount.value?.address
      const inMempool = getConfirmations(row) === -1
      if (isOut) return inMempool ? 'Sending' : 'Sent'
      return inMempool ? 'Receiving' : 'Received'
    }

    const getTxTypeBadgeClass = (row) => {
      const isOut = (row.src || row.from) === activeAccount.value?.address
      const inMempool = getConfirmations(row) === -1
      if (isOut && inMempool) return 'bg-warning text-dark'
      if (isOut) return 'bg-danger'
      return 'bg-success'
    }

    const formatConfirmations = (row) => {
      const conf = getConfirmations(row)
      if (conf === -1) return 'Mempool'
      return conf.toString()
    }

    const getTxId = (row) => {
      if (typeof row === 'string') return row
      return row?.id ?? row?.transaction ?? row?.tx_id ?? ''
    }

    const getExplorerTxUrl = (row) => {
      const id = getTxId(row)
      const base = EXPLORER_BASE.endsWith('/') ? EXPLORER_BASE : EXPLORER_BASE + '/'
      return id ? `${base}tx.php?id=${encodeURIComponent(id)}` : '#'
    }

    const formatTxIdShort = (row) => {
      const id = getTxId(row)
      if (!id || id.length <= 20) return id
      return id.substring(0, 10) + '…' + id.substring(id.length - 8)
    }

    const getCounterpartyAddress = (row) => {
      const src = row.src || row.from
      const dst = row.dst || row.to
      return src === activeAccount.value?.address ? dst : src
    }
    
    const loadTransactions = async () => {
      if (!authStore.activeAccount?.address) return
      
      try {
        loading.value = true
        // Load all transactions (we'll paginate client-side)
        const data = await api.getTransactions(
          authStore.activeAccount.address,
          1,
          1000 // Load many transactions
        )
        transactions.value = data || []
      } catch (error) {
        console.error('Failed to load transactions:', error)
        transactions.value = []
      } finally {
        loading.value = false
      }
    }
    
    onMounted(() => {
      loadTransactions()
    })
    
    return {
      transactions,
      loading,
      page,
      pageSize,
      totalPages,
      paginatedTransactions,
      activeAccount,
      getCounterpartyAddress,
      getTxId,
      getExplorerTxUrl,
      formatTxIdShort,
      getTxTypeLabel,
      getTxTypeBadgeClass,
      formatConfirmations
    }
  }
}
</script>
