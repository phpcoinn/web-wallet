/** Testnet (CHAIN_ID 01) Path A v2 deposit address — must match `swapapp.testnetSwapV2.address` in node `dapps.config.inc.php`. */
export const SWAP_BRIDGE_ADDRESS = 'PYmHE2ysEPczbGEe9gYvPvv7g9H9bx3LTN'

/** Minimum swap amount (PHP); align with `testnetSwapV2.minAmount` on the node. */
export const SWAP_MIN_AMOUNT = 1000

/** Swap UI and routing; disable during migration windows only. */
export const SWAP_ENABLED = true

/** Official Swap v2 history (testnet dapp). */
export const SWAP_V2_HISTORY_URL =
  'https://node1.phpcoin.net/dapps.php?url=PeC85pqFgRxmevonG6diUwT4AfF7YUPSm3/swap/swap-v2-history.php'
