<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal fade password-confirm-modal show"
      style="display: block;"
      tabindex="-1"
    >
      <div class="modal-dialog">
        <div class="modal-content password-confirm-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirm password</h5>
            <button type="button" class="btn-close" @click="cancel"></button>
          </div>
          <form @submit.prevent="confirm">
            <div class="modal-body">
              <input
                type="text"
                autocomplete="username"
                name="username"
                class="visually-hidden"
                tabindex="-1"
                aria-label="Account identifier"
              />
              <p class="text-muted small mb-3">{{ actionLabel }}</p>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <div class="input-group">
                  <input
                    :type="showPassword ? 'text' : 'password'"
                    class="form-control"
                    :class="{ 'is-invalid': error }"
                    v-model="password"
                    placeholder="Enter your password"
                    autocomplete="current-password"
                  />
                  <button
                    class="btn btn-light shadow-none"
                    type="button"
                    @click="showPassword = !showPassword"
                  >
                    <i :class="showPassword ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline'"></i>
                  </button>
                </div>
                <div v-if="error" class="invalid-feedback d-block">{{ error }}</div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="cancel">Cancel</button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="confirming || !password"
              >
                <span v-if="confirming" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ confirming ? 'Verifying...' : 'Confirm' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <div v-if="modelValue" class="modal-backdrop fade show password-confirm-backdrop"></div>
  </Teleport>
</template>

<script>
import { ref, watch } from 'vue'
import { deriveMasterKey, decrypt } from '../utils/crypto'
import { getAccounts } from '../utils/db'

const PASSWORD_STORAGE_KEY = 'phpcoin_wallet_password'

export default {
  name: 'PasswordConfirmModal',
  props: {
    modelValue: Boolean,
    actionLabel: {
      type: String,
      default: 'Please enter your password to continue.'
    }
  },
  emits: ['update:modelValue', 'confirm', 'cancel'],
  setup(props, { emit }) {
    const password = ref('')
    const showPassword = ref(false)
    const error = ref('')
    const confirming = ref(false)

    watch(() => props.modelValue, (visible) => {
      if (visible) {
        password.value = localStorage.getItem(PASSWORD_STORAGE_KEY) || ''
        error.value = ''
      }
    })

    function closeModal() {
      password.value = ''
      error.value = ''
      emit('update:modelValue', false)
    }

    function cancel() {
      closeModal()
      emit('cancel')
    }

    async function validatePassword(pwd) {
      const { key } = deriveMasterKey(pwd)
      const stored = await getAccounts()
      if (stored.length > 0) {
        try {
          decrypt(stored[0].privateKey, key)
          return key
        } catch {
          throw new Error('Invalid password')
        }
      }
      return key
    }

    async function confirm() {
      if (!password.value.trim()) {
        return
      }
      error.value = ''
      confirming.value = true
      try {
        const masterKey = await validatePassword(password.value)
        emit('confirm', masterKey)
        closeModal()
      } catch (e) {
        error.value = e.message || 'Invalid password'
      } finally {
        confirming.value = false
      }
    }

    return {
      password,
      showPassword,
      error,
      confirming,
      confirm,
      cancel
    }
  }
}
</script>

<style scoped>
.password-confirm-modal {
  z-index: 1075;
}

.password-confirm-backdrop {
  z-index: 1070;
  background-color: rgba(0, 0, 0, 0.6);
}

.password-confirm-content {
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.35), 0 0.5rem 1rem rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
