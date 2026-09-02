import phpcoinCrypto from 'phpcoin-crypto'
import { CHAIN_ID, getAddressFromPublicKey, signMessage, verifyAddress } from './wallet.js'

export const STAKE_MINE_DELEGATION_APP = 'stake_mine'
export const STAKE_MINE_DELEGATION_VERSION = 'stake-mine-v1'
export const STAKE_MINE_DELEGATION_ACTION_ENABLE = 'enable'
export const STAKE_MINE_DELEGATION_ACTION_DISABLE = 'disable'
export const STAKE_MINE_DELEGATION_AUTH_MESSAGE = 'PHP Coin Stake Mining Delegation v1'
export const STAKE_MINE_DELEGATION_JSON_KEYS = ['delegation_sig', 'mine_sig', 'mine_pubkey']
export const STAKE_MINE_SERVICE_ADDRESS = 'PYHaT4wjpfaB9pPr45CmBj6hkZuAJ84SGY'
export const STAKE_MINE_DELEGATION_MAINNET_ONLY = CHAIN_ID === '00'

const DEFAULT_DATA_FEE = CHAIN_ID === '01' ? 0.001 : 1
export const STAKE_MINE_DELEGATION_TX_TYPE = 10
export const STAKE_MINE_DELEGATION_TX_FEE = DEFAULT_DATA_FEE

const TX_DATA_FIELD_ORDER = [
  'app',
  'action',
  'string1',
  'string2',
  'int1',
  'int2',
  'float1',
  'float2',
  'address1',
  'address2',
  'json_data'
]

function normalizeText(value) {
  return value == null ? null : String(value)
}

function normalizeNumber(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function resolveStakeMineServiceTarget(input = STAKE_MINE_SERVICE_ADDRESS) {
  const raw = String(input ?? '').trim()
  if (!raw) return null
  if (verifyAddress(raw)) {
    return {
      input: raw,
      address: raw,
      publicKey: null,
      inputType: 'address'
    }
  }
  const address = getAddressFromPublicKey(raw)
  if (address) {
    return {
      input: raw,
      address,
      publicKey: raw,
      inputType: 'public_key'
    }
  }
  throw new Error('Invalid service address')
}

export function buildStakeMineDelegationMessage({
  action,
  src,
  dst,
  minePubkey
}) {
  return [
    STAKE_MINE_DELEGATION_AUTH_MESSAGE,
    CHAIN_ID,
    STAKE_MINE_DELEGATION_APP,
    STAKE_MINE_DELEGATION_VERSION,
    action,
    src,
    dst,
    minePubkey
  ].join('|')
}

export function buildStakeMineDelegationTxDataPayload({
  action,
  delegationSig,
  mineSig,
  minePubkey
}) {
  return {
    app: STAKE_MINE_DELEGATION_APP,
    action: normalizeText(action),
    string1: STAKE_MINE_DELEGATION_VERSION,
    string2: null,
    int1: null,
    int2: null,
    float1: null,
    float2: null,
    address1: null,
    address2: null,
    json_data: {
      delegation_sig: normalizeText(delegationSig),
      mine_sig: normalizeText(mineSig),
      mine_pubkey: normalizeText(minePubkey)
    }
  }
}

export function buildCanonicalStakeMineTxDataString(payload) {
  const canonical = {}
  for (const field of TX_DATA_FIELD_ORDER) {
    const value = payload?.[field]
    if (field === 'app' || field === 'action' || field === 'string1' || field === 'string2') {
      canonical[field] = value == null ? null : String(value)
    } else if (field === 'int2') {
      canonical[field] = normalizeNumber(value)
    } else if (field === 'float1' || field === 'float2') {
      canonical[field] = value == null || value === '' ? null : Number(value)
    } else if (field === 'address1' || field === 'address2') {
      canonical[field] = value == null ? null : String(value)
    } else if (field === 'json_data') {
      canonical[field] = value == null ? null : value
    } else {
      canonical[field] = value == null ? null : value
    }
  }
  return JSON.stringify(canonical)
}

export async function buildStakeMineDelegationTransaction({
  privateKey,
  publicKey,
  src,
  dst,
  action,
  mineSig,
  minePubkey,
  date = Math.floor(Date.now() / 1000)
}) {
  const delegationMessage = buildStakeMineDelegationMessage({
    action,
    src,
    dst,
    minePubkey
  })
  const delegationSig = signMessage(delegationMessage, privateKey)
  if (!delegationSig) {
    throw new Error('Failed to sign delegation authorization')
  }

  const txDataPayload = buildStakeMineDelegationTxDataPayload({
    action,
    delegationSig,
    mineSig,
    minePubkey
  })
  const txData = buildCanonicalStakeMineTxDataString(txDataPayload)
  const signatureBase = await getStakeMineDelegationTxSignatureBase({
    val: 0,
    fee: STAKE_MINE_DELEGATION_TX_FEE,
    dst,
    msg: '',
    type: STAKE_MINE_DELEGATION_TX_TYPE,
    publicKey,
    date,
    txData
  })
  const signature = phpcoinCrypto.sign(CHAIN_ID + signatureBase, privateKey)

  return {
    dst,
    src,
    val: '0.00000000',
    fee: Number(STAKE_MINE_DELEGATION_TX_FEE).toFixed(8),
    signature,
    message: '',
    type: STAKE_MINE_DELEGATION_TX_TYPE,
    date: Math.floor(date),
    public_key: publicKey,
    tx_data: txData
  }
}

export async function getStakeMineDelegationTxSignatureBase({
  val,
  fee,
  dst,
  msg,
  type,
  publicKey,
  date,
  txData
}) {
  const canonicalTxData = typeof txData === 'string' ? txData : buildCanonicalStakeMineTxDataString(txData)
  const payloadHash = phpcoinCrypto.sha256(canonicalTxData)
  return [
    Number(val ?? 0).toFixed(8),
    Number(fee ?? 0).toFixed(8),
    dst || '',
    msg || '',
    String(Math.floor(Number(type) || 0)),
    publicKey,
    String(Math.floor(Number(date) || Date.now() / 1000)),
    payloadHash
  ].join('-')
}
