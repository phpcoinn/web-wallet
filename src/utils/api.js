// API configuration and utility functions
// Main node API URL comes from VITE_MAIN_URL (see mainUrl.js). VITE_WALLET_API_URL is the full wallet_api.php URL.

import { MAIN_API_URL, MAIN_URL } from './mainUrl.js'

/** Full URL or root-relative path (e.g. `/dapps.php?url=…/wallet_api.php` for dapps builds). */
function requireWalletApiUrl(envName, v) {
  if (v == null || v === '') {
    throw new Error(`${envName} must be set. Check .env.development / .env.production.`)
  }
  const s = String(v)
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('/')) return s
  throw new Error(`${envName} must be http(s)://… or a path starting with / (same-origin)`)
}

const WALLET_API_URL = requireWalletApiUrl('VITE_WALLET_API_URL', import.meta.env.VITE_WALLET_API_URL)

/** Use `&` when base URL already has a query string (e.g. dapps.php?url=…). */
function querySep(baseUrl) {
  return String(baseUrl).includes('?') ? '&' : '?'
}

/**
 * Response format (node and local):
 * { "status": "ok" | "error", "data": { ... }, ... }
 */
const callApi = async (baseUrl, endpoint, params = {}) => {
  const queryParams = new URLSearchParams({ q: endpoint, ...params })
  const response = await fetch(`${baseUrl}${querySep(baseUrl)}${queryParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || errorData.message || `API call failed: ${endpoint}`)
  }
  const result = await response.json()
  if (result.status === 'error') {
    throw new Error(result.error || result.message || `API error: ${endpoint}`)
  }
  if (result.status === 'ok') {
    return result.data || result
  }
  return result
}

/** Explorer UI base: `{VITE_MAIN_URL}/apps/explorer/` */
export const EXPLORER_BASE = `${MAIN_URL}/apps/explorer/`

export const api = {
  /**
   * Test backend (wallet_api.php) – same-folder endpoint
   * @returns {Promise<string>} Test message from wallet_api.php
   */
  async getTest() {
    const data = await callApi(WALLET_API_URL, 'test')
    return data
  },

  /**
   * Get PHP price via `wallet_api.php?q=getPrice` (live USD from external coinInfo; 7-point series from daily snapshots).
   * @returns {Promise<{price: number, changeSinceLastWeek: number, series: number[]}>}
   */
  async getPrice() {
    return callApi(WALLET_API_URL, 'getPrice')
  },

  /**
   * Get account balance (main API — VITE_MAIN_API_URL)
   */
  async getBalance(address) {
    return callApi(MAIN_API_URL, 'getBalance', { address })
  },

  /**
   * Get public key of address from network (node API).
   * Returns public key if address is verified on network, or null/error if unverified.
   * @see https://main1.phpcoin.net/doc/#api-API-getPublicKey
   */
  async getPublicKey(address) {
    return callApi(MAIN_API_URL, 'getPublicKey', { address })
  },

  /**
   * Get transaction history (main API)
   */
  async getTransactions(address, page = 1, limit = 20, offset = null) {
    const safePage = Math.max(1, parseInt(page, 10) || 1)
    const safeLimit = Math.max(1, parseInt(limit, 10) || 20)
    const safeOffset = offset == null
      ? (safePage - 1) * safeLimit
      : Math.max(0, parseInt(offset, 10) || 0)
    return callApi(MAIN_API_URL, 'getTransactions', {
      address,
      limit: safeLimit.toString(),
      offset: safeOffset.toString()
    })
  },

  /**
   * Generate send transaction (main API)
   */
  async generateSendTransaction(transaction) {
    return callApi(MAIN_API_URL, 'generateSendTransaction', {
      public_key: transaction.public_key,
      address: transaction.to,
      amount: transaction.amount || transaction.val,
      message: transaction.message || '',
      type: transaction.type || '1'
    })
  },

  /**
   * Send/broadcast transaction (main API)
   */
  async sendTransaction(transaction) {
    const response = await fetch(`${MAIN_API_URL}${querySep(MAIN_API_URL)}q=sendTransactionJson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transaction)
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const err = new Error(errorData.error || errorData.message || 'Failed to send transaction')
      err.response = errorData
      throw err
    }
    
    const result = await response.json()
    
    // Check PHP Coin response format
    if (result.status === 'error') {
      const err = new Error(result.error || result.message || 'Transaction failed')
      err.response = result
      throw err
    }

    
    // Return data if status is "ok" (transaction id is in result.data)
    if (result.status === 'ok') {
      const data = result.data ?? result
      const id = typeof data === 'object' && data !== null
        ? (data.id ?? data.tx_id ?? data.transaction_id ?? data.transaction ?? data.hash ?? data.transaction?.id)
        : (typeof data === 'string' ? data : result.id ?? result.tx_id ?? result.transaction_id ?? result.transaction)
      const out = typeof data === 'object' && data !== null ? { ...data } : {}
      if (id != null && id !== '') out.id = String(id)
      return out
    }
    
    return result
  },
  
  /**
   * @deprecated Use sendTransaction instead
   * Broadcast/send transaction (legacy method)
   */
  async broadcastTransaction(transaction) {
    return this.sendTransaction(transaction)
  },
  
  /**
   * Get current transaction fee (node API).
   * Returns fee as string. Currently 0 for transfers, can change in future.
   */
  async getFee(height) {
    const params = height != null ? { height: String(height) } : {}
    return callApi(MAIN_API_URL, 'getFee', params)
  },

  /**
   * Get current block (block height, id, etc.)
   */
  async getCurrentBlock() {
    return callApi(MAIN_API_URL, 'currentBlock')
  },

  /**
   * Get node info (version, network, height, peers, sync status, etc.)
   */
  async getNodeInfo() {
    return callApi(MAIN_API_URL, 'nodeInfo')
  },

  /**
   * Get latest block difficulties (oldest -> newest) for network chart.
   */
  async getNetworkDifficulty(count = 100) {
    return callApi(MAIN_API_URL, 'getNetworkDifficulty', { count: String(count) })
  },

  /**
   * Get block by height (returns difficulty, transactions, etc.)
   */
  async getBlock(height) {
    return callApi(MAIN_API_URL, 'getBlock', { height: String(height) })
  },

  /**
   * Authenticate with private key
   * @param {string} publicKey - Public key derived from private key
   * @param {string} signature - Signed message/nonce
   * @param {string} nonce - Original message/nonce that was signed
   * @returns {Promise<Object>} Response with address if successful
   */
  async authenticate(publicKey, signature, nonce) {
    return callApi(MAIN_API_URL, 'authenticate', {
      public_key: publicKey,
      signature: signature,
      nonce: nonce
    })
  },

  /**
   * Proxy to verifier dapp `api.php?q=verify` (no redirect) via wallet_api.php — avoids browser CORS to dapps.php.
   * @param {string} address - User address to receive the verifier test amount
   * @returns {Promise<object>} Raw JSON from verifier / node (shape varies)
   */
  async verifierRequestFunds(address) {
    const queryParams = new URLSearchParams({ q: 'verifierRequestFunds', address })
    const url = `${WALLET_API_URL}${querySep(WALLET_API_URL)}${queryParams.toString()}`
    const response = await fetch(url, { headers: { Accept: 'application/json' } })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(result.error || result.message || `Verifier request failed (${response.status})`)
    }
    return result
  },

  /** Nonce for wallet-only send-back flow (signed then verified via verifierSendBackAuthorize). */
  async verifierSendBackChallenge() {
    return callApi(WALLET_API_URL, 'verifierSendBackChallenge', {})
  },

  /**
   * Confirms the client holds the private key for public_key (forwards to node authenticate).
   * @returns {Promise<{ verifierAddress: string }>}
   */
  async verifierSendBackAuthorize(payload) {
    const response = await fetch(
      `${WALLET_API_URL}${querySep(WALLET_API_URL)}q=verifierSendBackAuthorize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    )
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.status === 'error') {
      throw new Error(result.error || result.message || 'Send-back authorize failed')
    }
    return result.data ?? result
  },

  /** Update legacy dapps PHP session account after wallet account switch. */
  async sessionSetAccount(account) {
    const body = new URLSearchParams()
    body.set('address', account?.address ? String(account.address) : '')
    body.set('public_key', account?.public_key || account?.publicKey || '')
    const response = await fetch(
      `${WALLET_API_URL}${querySep(WALLET_API_URL)}q=sessionSetAccount`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: body.toString()
      }
    )
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result.status === 'error') {
      throw new Error(result.error || result.message || 'Could not update session account')
    }
    return result.data ?? result
  },

  /**
   * Get address info (masternode type: no_masternode, cold_masternode, hot_masternode, masternode_reward)
   * @param {string} address
   * @returns {Promise<{type: string, masternodes: Array, cold_masternode_enabled: boolean}>}
   */
  async getAddressInfo(address) {
    return callApi(MAIN_API_URL, 'getAddressInfo', { address })
  },

  /**
   * Get masternodes created by address (when type is no_masternode)
   * @param {string} address
   * @returns {Promise<Array<{masternode_address, collateral, reward_address?, masternode_balance}>>}
   */
  async getMasternodesForAddress(address) {
    return callApi(MAIN_API_URL, 'getMasternodesForAddress', { address })
  },

  /**
   * Generate masternode create transaction (see https://main1.phpcoin.net/doc/#api-Masternodes-generateMasternodeCreateTx).
   * API may return { signature_base, tx } for signing, or raw payload { val, fee, dst, src, msg, type }.
   * @param {string} address - Creator wallet address
   * @param {string} mn_address - Masternode address
   * @param {string} [reward_address] - Reward address for cold masternode (if cold_masternode_enabled)
   */
  async generateMasternodeCreateTx(address, mn_address, reward_address) {
    const params = { address, mn_address }
    if (reward_address != null && reward_address !== '') params.reward_address = reward_address
    return callApi(MAIN_API_URL, 'generateMasternodeCreateTx', params)
  },

  /**
   * Generate masternode remove transaction. API may return { signature_base, tx } or raw payload.
   * @param {string} address - Hot or reward address from which to remove
   * @param {string} payout_address - Where to send collateral
   * @param {string} [mn_address] - Required if reward address has multiple masternodes
   */
  async generateMasternodeRemoveTx(address, payout_address, mn_address) {
    const params = { address, payout_address }
    if (mn_address != null && mn_address !== '') params.mn_address = mn_address
    return callApi(MAIN_API_URL, 'generateMasternodeRemoveTx', params)
  }
}

