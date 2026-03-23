import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAccounts, saveAccount, deleteAccount as deleteAccountFromDB, updateAccount as updateAccountInDB, clearAllAccounts as clearAllAccountsFromDB } from '../utils/db'
import { encrypt, decrypt } from '../utils/crypto'

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref([])
  const loading = ref(false)
  
  const loadAccounts = async (masterKey) => {
    loading.value = true
    try {
      const storedAccounts = await getAccounts()
      if (!masterKey) {
        accounts.value = []
        return
      }
      if (storedAccounts.length === 0) {
        accounts.value = []
        return
      }
      // Verify password by attempting to decrypt one account
      try {
        decrypt(storedAccounts[0].privateKey, masterKey)
      } catch (e) {
        throw new Error('Invalid password')
      }
      accounts.value = storedAccounts
    } catch (error) {
      console.error('Failed to load accounts:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const getDecryptedPrivateKey = (account, masterKey) => {
    return decrypt(account.privateKey, masterKey)
  }
  
  const addAccount = async (account, masterKey) => {
    try {
      const encryptedPrivateKey = encrypt(account.privateKey, masterKey)
      const accountToStore = { ...account, privateKey: encryptedPrivateKey }
      await saveAccount(accountToStore)
      await loadAccounts(masterKey)
    } catch (error) {
      console.error('Failed to add account:', error)
      throw error
    }
  }
  
  const deleteAccount = async (accountId, masterKey) => {
    try {
      await deleteAccountFromDB(accountId)
      await loadAccounts(masterKey)
    } catch (error) {
      console.error('Failed to delete account:', error)
      throw error
    }
  }
  
  const updateAccountName = async (accountId, newName, masterKey) => {
    try {
      await updateAccountInDB(accountId, { name: newName })
      await loadAccounts(masterKey)
    } catch (error) {
      console.error('Failed to update account:', error)
      throw error
    }
  }

  const updateAccount = async (accountId, updates, masterKey) => {
    try {
      await updateAccountInDB(accountId, updates)
      await loadAccounts(masterKey)
    } catch (error) {
      console.error('Failed to update account:', error)
      throw error
    }
  }

  const deleteAllAccounts = async () => {
    try {
      await clearAllAccountsFromDB()
      accounts.value = []
    } catch (error) {
      console.error('Failed to delete all accounts:', error)
      throw error
    }
  }

  /**
   * Restore accounts from backup file.
   * Supports: { version, accounts } (AccountManager) or { accounts: encrypted } (Settings)
   */
  const restoreFromBackup = async (backupData, masterKey) => {
    let accountsToRestore = []
    let needsEncryption = false
    if (backupData.version != null && Array.isArray(backupData.accounts)) {
      // AccountManager format: accounts have encrypted privateKey
      accountsToRestore = backupData.accounts
      if (accountsToRestore.length > 0) {
        try {
          decrypt(accountsToRestore[0].privateKey, masterKey)
        } catch (e) {
          throw new Error('Invalid password')
        }
      }
    } else if (backupData.accounts && typeof backupData.accounts === 'string') {
      // Settings format: encrypted blob, decrypt gives accounts with plaintext privateKey
      try {
        accountsToRestore = decrypt(backupData.accounts, masterKey)
        needsEncryption = true
      } catch (e) {
        throw new Error('Invalid password')
      }
    } else {
      throw new Error('Invalid backup file format')
    }
    if (!Array.isArray(accountsToRestore) || accountsToRestore.length === 0) {
      throw new Error('Backup file contains no accounts')
    }
    await clearAllAccountsFromDB()
    for (const acc of accountsToRestore) {
      if (needsEncryption) {
        const encrypted = encrypt(acc.privateKey, masterKey)
        await saveAccount({ ...acc, privateKey: encrypted })
      } else {
        await saveAccount(acc)
      }
    }
    await loadAccounts(masterKey)
  }
  
  return {
    accounts,
    loading,
    loadAccounts,
    addAccount,
    deleteAccount,
    deleteAllAccounts,
    restoreFromBackup,
    updateAccountName,
    updateAccount,
    getDecryptedPrivateKey
  }
})

