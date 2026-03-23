<template>
  <div class="min-h-screen">
    <div class="w-100">
      <!-- Header -->
      <div class="mb-4">
        <h1 class="font-semibold mb-1" style="font-size: 1.5rem; font-weight: 500; color: #313533;">Address Book</h1>
        <p style="color: #74788d; font-size: 0.875rem;">Manage your correspondents</p>
      </div>

      <div class="minia-card">
        <div>
          <div class="mb-4">
            <button class="btn btn-primary" @click="openAddModal">
              <Plus :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
              Add contact
            </button>
          </div>

          <div v-if="contacts.length === 0" class="text-center py-12">
            <div class="p-4 bg-gray-100 rounded-circle d-inline-block mb-4">
              <BookOpen :size="32" class="text-phpcoin-text-secondary" />
            </div>
            <p class="text-phpcoin-text-primary font-medium">No contacts yet</p>
            <p class="text-sm text-phpcoin-text-secondary mt-2">Add addresses you frequently send to</p>
            <button class="btn btn-primary mt-4" @click="openAddModal">
              <Plus :size="18" style="margin-right: 0.5rem; vertical-align: middle;" />
              Add your first contact
            </button>
          </div>

          <div v-else class="table-responsive">
            <table class="table table-hover align-middle mb-0 w-100">
              <thead class="table-light">
                <tr>
                  <th style="width: 120px;">Actions</th>
                  <th>Address</th>
                  <th>Name</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="contact in contacts" :key="contact.address">
                  <td>
                    <div class="d-flex gap-1">
                      <button
                        class="btn btn-sm btn-primary"
                        title="Use in Send"
                        @click="useInSend(contact)"
                      >
                        <Send :size="16" />
                      </button>
                      <button
                        class="btn btn-sm btn-warning"
                        title="Edit"
                        @click="openEditModal(contact)"
                      >
                        <Pencil :size="16" />
                      </button>
                      <button
                        class="btn btn-sm btn-danger"
                        title="Delete"
                        @click="requestDelete(contact)"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </div>
                  </td>
                  <td>
                    <code class="font-monospace" style="word-break: break-all; font-size: 0.875rem;">{{ contact.address }}</code>
                  </td>
                  <td>{{ contact.name || '—' }}</td>
                  <td class="text-muted small">{{ contact.note || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal fade show" style="display: block;" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ editing ? 'Edit contact' : 'Add contact' }}</h5>
              <button type="button" class="btn-close" @click="closeModal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Address</label>
                <div class="input-group">
                  <span class="input-group-text bg-light">
                    <User :size="18" style="color: #74788d;" />
                  </span>
                  <input
                    type="text"
                    class="form-control font-monospace"
                    :class="{ 'is-invalid': errors.address }"
                    v-model="form.address"
                    placeholder="PHP Coin address"
                    :readonly="editing"
                  />
                  <button
                    v-if="!editing"
                    type="button"
                    class="btn btn-outline-secondary"
                    title="Scan QR code"
                    @click="openQrScanModal"
                  >
                    <ScanLine :size="18" />
                  </button>
                  <div v-if="errors.address" class="invalid-feedback d-block w-100">
                    {{ errors.address }}
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Name</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="form.name"
                  placeholder="Contact name"
                />
              </div>
              <div class="mb-3">
                <label class="form-label">Note</label>
                <textarea
                  class="form-control"
                  v-model="form.note"
                  placeholder="Optional note"
                  rows="3"
                ></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
              <button type="button" class="btn btn-primary" :disabled="saving" @click="saveContact">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2" role="status"></span>
                {{ editing ? 'Save' : 'Add' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showModal" class="modal-backdrop fade show"></div>
    </Teleport>

    <!-- Scan address QR (add contact) -->
    <Teleport to="body">
      <div
        v-if="showQrScanModal"
        class="modal fade show address-book-qr-scan-modal"
        style="display: block;"
        tabindex="-1"
        @click.self="closeQrScanModal"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Scan address QR</h5>
              <button type="button" class="btn-close" aria-label="Close" @click="closeQrScanModal"></button>
            </div>
            <div class="modal-body">
              <p class="text-muted small mb-3 mb-md-0">
                Aim at a QR code with a PHP Coin address (or payment link).
              </p>
              <div
                id="address-book-qr-reader"
                class="address-book-qr-reader-host w-100 mx-auto mt-3"
              ></div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showQrScanModal" class="modal-backdrop fade show address-book-qr-scan-backdrop"></div>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal fade show" style="display: block;" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Delete contact</h5>
              <button type="button" class="btn-close" @click="showDeleteModal = false"></button>
            </div>
            <div class="modal-body">
              <p>Delete {{ contactToDelete?.name || contactToDelete?.address }} from your address book?</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showDeleteModal = false">Cancel</button>
              <button type="button" class="btn btn-danger" :disabled="deleting" @click="confirmDelete">
                <span v-if="deleting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showDeleteModal" class="modal-backdrop fade show"></div>
    </Teleport>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Pencil, Trash2, Send, BookOpen, ScanLine, User } from 'lucide-vue-next'
import Address from '../components/Address.vue'
import { getAddressBook, saveAddressBookEntry, deleteAddressBookEntry } from '../utils/db'
import { verifyAddress } from '../utils/wallet'
import { parseRecipientAddressFromQrPayload } from '../utils/qrAddress'
import { toast } from '../utils/toast'

export default {
  name: 'AddressBook',
  components: { Address, Plus, Pencil, Trash2, Send, BookOpen, ScanLine, User },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const contacts = ref([])
    const showModal = ref(false)
    const showDeleteModal = ref(false)
    const editing = ref(false)
    const saving = ref(false)
    const deleting = ref(false)
    const contactToDelete = ref(null)
    const showQrScanModal = ref(false)
    const qrScannerInstance = ref(null)
    let qrScanHandled = false
    const errors = reactive({})

    const form = reactive({
      address: '',
      name: '',
      note: ''
    })

    const loadContacts = async () => {
      try {
        contacts.value = await getAddressBook()
      } catch (err) {
        console.error('Failed to load address book:', err)
        toast.error('Failed to load address book')
      }
    }

    const openAddModal = () => {
      editing.value = false
      form.address = ''
      form.name = ''
      form.note = ''
      Object.keys(errors).forEach((k) => delete errors[k])
      showModal.value = true
    }

    const openEditModal = (contact) => {
      editing.value = true
      form.address = contact.address
      form.name = contact.name || ''
      form.note = contact.note || ''
      Object.keys(errors).forEach((k) => delete errors[k])
      showModal.value = true
    }

    const stopQrScanner = async () => {
      const inst = qrScannerInstance.value
      qrScannerInstance.value = null
      if (!inst) return
      try {
        await inst.stop()
      } catch (_) {}
    }

    const closeQrScanModal = async () => {
      await stopQrScanner()
      showQrScanModal.value = false
    }

    const openQrScanModal = async () => {
      qrScanHandled = false
      showQrScanModal.value = true
      await nextTick()
      await stopQrScanner()
      const mountEl = document.getElementById('address-book-qr-reader')
      if (!mountEl) return
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const html5Qr = new Html5Qrcode('address-book-qr-reader')
        qrScannerInstance.value = html5Qr
        await html5Qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          async (decodedText) => {
            if (qrScanHandled) return
            const addr = parseRecipientAddressFromQrPayload(decodedText, verifyAddress)
            if (!addr) {
              toast.warning('QR does not contain a valid PHP Coin address')
              return
            }
            qrScanHandled = true
            try {
              await html5Qr.stop()
            } catch (_) {}
            qrScannerInstance.value = null
            showQrScanModal.value = false
            form.address = addr
            delete errors.address
            toast.success('Address scanned')
          },
          () => {}
        )
      } catch (err) {
        console.error('QR scanner:', err)
        toast.error(err?.message || 'Could not use camera for scanning')
        await closeQrScanModal()
      }
    }

    const closeModal = async () => {
      await stopQrScanner()
      showModal.value = false
    }

    const validate = () => {
      Object.keys(errors).forEach((k) => delete errors[k])
      const addr = form.address.trim()
      if (!addr) {
        errors.address = 'Address is required'
        return false
      }
      if (!verifyAddress(addr)) {
        errors.address = 'Invalid address format'
        return false
      }
      if (!editing.value && contacts.value.some((c) => c.address === addr)) {
        errors.address = 'Address already in address book'
        return false
      }
      return true
    }

    const saveContact = async () => {
      if (!validate()) return
      try {
        saving.value = true
        await saveAddressBookEntry({
          address: form.address.trim(),
          name: form.name.trim(),
          note: form.note.trim()
        })
        toast.success(editing.value ? 'Contact updated' : 'Contact added')
        closeModal()
        loadContacts()
      } catch (err) {
        toast.error(err.message || 'Failed to save contact')
      } finally {
        saving.value = false
      }
    }

    const requestDelete = (contact) => {
      contactToDelete.value = contact
      showDeleteModal.value = true
    }

    const confirmDelete = async () => {
      if (!contactToDelete.value) return
      try {
        deleting.value = true
        await deleteAddressBookEntry(contactToDelete.value.address)
        toast.success('Contact deleted')
        showDeleteModal.value = false
        contactToDelete.value = null
        loadContacts()
      } catch (err) {
        toast.error(err.message || 'Failed to delete contact')
      } finally {
        deleting.value = false
      }
    }

    const useInSend = (contact) => {
      router.push({ path: '/send', query: { to: contact.address } })
    }

    function openAddModalWithAddress(addr) {
      if (!addr || typeof addr !== 'string') return
      const trimmed = addr.trim()
      if (!trimmed) return
      form.address = trimmed
      form.name = ''
      form.note = ''
      editing.value = false
      Object.keys(errors).forEach((k) => delete errors[k])
      showModal.value = true
      router.replace({ path: '/address-book', query: {} })
    }

    watch(() => route.query.add, (addAddr) => {
      if (addAddr && typeof addAddr === 'string') openAddModalWithAddress(addAddr)
    }, { immediate: true })

    onMounted(() => {
      loadContacts()
    })

    onBeforeUnmount(() => {
      stopQrScanner()
    })

    return {
      contacts,
      showModal,
      showDeleteModal,
      editing,
      form,
      errors,
      saving,
      deleting,
      contactToDelete,
      openAddModal,
      openEditModal,
      closeModal,
      saveContact,
      requestDelete,
      confirmDelete,
      useInSend,
      showQrScanModal,
      openQrScanModal,
      closeQrScanModal
    }
  }
}
</script>

<style scoped>
.modal {
  z-index: 1075;
}

.modal-backdrop {
  z-index: 1070;
  background-color: rgba(0, 0, 0, 0.6);
}

.address-book-qr-scan-modal {
  z-index: 1085;
}

.address-book-qr-scan-backdrop {
  z-index: 1080;
  background-color: rgba(0, 0, 0, 0.6);
}

.address-book-qr-reader-host {
  max-width: 400px;
  min-height: 200px;
}
</style>
