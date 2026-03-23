import { openDB } from 'idb'

const DB_NAME = 'phpcoin-wallet'
const DB_VERSION = 2
const STORE_NAME = 'accounts'
const ADDRESSBOOK_STORE = 'addressbook'

let db = null

export const initDB = async () => {
  if (db) return db

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion, newVersion) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
      if (newVersion >= 2 && !database.objectStoreNames.contains(ADDRESSBOOK_STORE)) {
        database.createObjectStore(ADDRESSBOOK_STORE, { keyPath: 'address' })
      }
    }
  })

  return db
}

export const getAccounts = async () => {
  const database = await initDB()
  return await database.getAll(STORE_NAME)
}

export const getAccount = async (id) => {
  const database = await initDB()
  return await database.get(STORE_NAME, id)
}

/**
 * Ensure account is a plain clonable object for IndexedDB (no proxies, symbols, etc.)
 */
function toPlainAccount(account) {
  const pk = account.privateKey
  const privateKeyStr = typeof pk === 'string' ? pk : (pk != null ? String(pk) : '')
  return {
    id: String(account.id ?? account.address ?? ''),
    name: String(account.name ?? ''),
    description: account.description != null ? String(account.description) : undefined,
    address: String(account.address ?? ''),
    publicKey: String(account.publicKey ?? ''),
    privateKey: privateKeyStr,
    createdAt: Number(account.createdAt ?? Date.now())
  }
}

export const saveAccount = async (account) => {
  const database = await initDB()
  const plain = toPlainAccount(account)
  return await database.put(STORE_NAME, plain)
}

export const deleteAccount = async (id) => {
  const database = await initDB()
  return await database.delete(STORE_NAME, id)
}

export const clearAllAccounts = async () => {
  const database = await initDB()
  await database.clear(STORE_NAME)
}

export const updateAccount = async (id, updates) => {
  const database = await initDB()
  const account = await database.get(STORE_NAME, id)
  if (account) {
    Object.assign(account, updates)
    return await database.put(STORE_NAME, account)
  }
}

// --- Address book (correspondents) ---

export const getAddressBook = async () => {
  const database = await initDB()
  return await database.getAll(ADDRESSBOOK_STORE)
}

export const getAddressBookEntry = async (address) => {
  const database = await initDB()
  return await database.get(ADDRESSBOOK_STORE, address)
}

export const saveAddressBookEntry = async (entry) => {
  const database = await initDB()
  const plain = {
    address: String(entry.address ?? '').trim(),
    name: String(entry.name ?? '').trim(),
    note: String(entry.note ?? '').trim()
  }
  if (!plain.address) throw new Error('Address is required')
  return await database.put(ADDRESSBOOK_STORE, plain)
}

export const deleteAddressBookEntry = async (address) => {
  const database = await initDB()
  return await database.delete(ADDRESSBOOK_STORE, address)
}

