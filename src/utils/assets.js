/**
 * Base URL for all asset paths (flags, images, public/libs, bundled assets). Always same as app base (VITE_APP_BASE).
 */
const raw = import.meta.env.VITE_APP_BASE ?? import.meta.env.BASE_URL ?? '/'
export const ASSETS_BASE = (raw.endsWith('/') ? raw : raw + '/')

/**
 * Resolve an asset path with the configured assets base (e.g. flags, images, libs).
 * @param {string} path - Path like 'assets/images/flags/germany.jpg' or 'assets/libs/...'
 * @returns {string} Full URL
 */
export function assetUrl(path) {
  const p = path.startsWith('assets/') ? path : path.replace(/^\/?assets\//, 'assets/')
  return ASSETS_BASE + p
}
