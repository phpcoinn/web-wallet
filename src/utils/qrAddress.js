/**
 * Extract a PHP Coin recipient address from raw QR / pasted text.
 * Accepts plain address, phpcoin: URI, or URLs with to/address params, etc.
 */
export function parseRecipientAddressFromQrPayload(text, verifyAddress) {
  const raw = String(text ?? '').trim()
  if (!raw) return null

  try {
    if (verifyAddress(raw)) return raw
  } catch (_) {}

  const uri = raw.match(/^phpcoin:(?:\/\/)?([A-Za-z0-9]+)/i)
  if (uri) {
    try {
      if (verifyAddress(uri[1])) return uri[1]
    } catch (_) {}
  }

  try {
    const u = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'https://example.com')
    for (const key of ['to', 'address', 'dst', 'recipient', 'url']) {
      const v = u.searchParams.get(key)?.trim()
      if (!v) continue
      try {
        if (verifyAddress(v)) return v
      } catch (_) {}
    }
  } catch (_) {}

  const parts = raw.split(/[\s,;|]+/).map((p) => p.trim()).filter(Boolean)
  for (const p of parts) {
    try {
      if (verifyAddress(p)) return p
    } catch (_) {}
  }

  return null
}
