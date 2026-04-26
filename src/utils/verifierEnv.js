/**
 * PHPCoin Verifier payout address (where users send the test amount back).
 * Must match dapp `verifier/config.php` for the network you target.
 */
const DEFAULT_MAINNET_VERIFIER = 'PdGDUs3Hc6F2CtRnmM4cz1iwuAqfD8hpRE'

export function getVerifierAddress() {
  const v = (import.meta.env.VITE_VERIFIER_ADDRESS || '').trim()
  if (v) return v
  return DEFAULT_MAINNET_VERIFIER
}
