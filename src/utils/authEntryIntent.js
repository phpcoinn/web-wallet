/** One-shot flags so other pages can open Login in setup/migrate mode without query strings. */
const KEY_SETUP = 'phpcoin_auth_want_setup'
const KEY_MIGRATE = 'phpcoin_auth_want_migrate'

export function requestAuthSetupFlow(options = {}) {
  sessionStorage.setItem(KEY_SETUP, '1')
  if (options.legacyMigrate) {
    sessionStorage.setItem(KEY_MIGRATE, '1')
  }
}

export function consumeAuthEntryIntent() {
  const setup = sessionStorage.getItem(KEY_SETUP) === '1'
  const migrate = sessionStorage.getItem(KEY_MIGRATE) === '1'
  sessionStorage.removeItem(KEY_SETUP)
  sessionStorage.removeItem(KEY_MIGRATE)
  return { setup, migrate }
}
