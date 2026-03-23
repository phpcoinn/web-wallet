<template>
  <span
    v-if="!address"
    class="text-muted"
  >—</span>
  <span
    v-else
    :class="['d-inline-block', !noPopover && 'address-trigger']"
    ref="triggerRef"
    @mouseenter="!noPopover && (showPopover = true)"
    @mouseleave="!noPopover && scheduleHide()"
  >
    <code class="font-monospace address-inline">
      {{ truncated }}
    </code>
    <Teleport v-if="!noPopover" to="body">
      <div
        v-show="showPopover"
        class="address-popover"
        :style="popoverStyle"
        ref="popoverRef"
        @mouseenter="showPopover = true; cancelHide()"
        @mouseleave="scheduleHide"
      >
        <div class="address-popover-body">
          <div class="mb-2">
            <code class="font-monospace d-block text-break">{{ address }}</code>
          </div>
          <div class="d-flex flex-wrap gap-1">
            <a
              :href="explorerUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-sm btn-outline-primary text-start"
            >
              <ExternalLink :size="14" class="me-1" />
              View on explorer
            </a>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary text-start"
              @click="copyAddress"
            >
              <Copy v-if="!copied" :size="14" class="me-1" />
              <Check v-else :size="14" class="me-1 text-success" />
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
            <router-link
              v-if="!inAddressBook"
              :to="{ path: '/address-book', query: { add: address } }"
              class="btn btn-sm btn-outline-secondary text-start text-decoration-none"
            >
              <BookPlus :size="14" class="me-1" />
              Add to address book
            </router-link>
          </div>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { ExternalLink, Copy, Check, BookPlus } from 'lucide-vue-next'
import { EXPLORER_BASE } from '../utils/api'
import { getAddressBookEntry } from '../utils/db'
import { toast } from '../utils/toast'

export default {
  name: 'Address',
  components: { ExternalLink, Copy, Check, BookPlus },
  props: {
    address: {
      type: String,
      default: ''
    },
    truncate: {
      type: Boolean,
      default: true
    },
    startChars: {
      type: Number,
      default: 10
    },
    endChars: {
      type: Number,
      default: 8
    },
    noPopover: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const triggerRef = ref(null)
    const popoverRef = ref(null)
    const showPopover = ref(false)
    const copied = ref(false)
    const inAddressBook = ref(false)
    let hideTimeout = null

    watch(showPopover, async (show) => {
      if (show && props.address) {
        try {
          const entry = await getAddressBookEntry(props.address.trim())
          inAddressBook.value = !!entry
        } catch {
          inAddressBook.value = false
        }
      } else {
        inAddressBook.value = false
      }
    }, { immediate: true })

    const truncated = computed(() => {
      const addr = props.address || ''
      if (!addr) return '—'
      if (!props.truncate || addr.length <= props.startChars + props.endChars + 3) {
        return addr
      }
      return addr.substring(0, props.startChars) + '…' + addr.substring(addr.length - props.endChars)
    })

    const explorerUrl = computed(() => {
      const addr = props.address || ''
      if (!addr) return '#'
      const base = EXPLORER_BASE.endsWith('/') ? EXPLORER_BASE : EXPLORER_BASE + '/'
      return `${base}?search=${encodeURIComponent(addr)}`
    })

    const popoverStyle = computed(() => {
      if (!triggerRef.value || !showPopover.value) return {}
      const rect = triggerRef.value.getBoundingClientRect()
      return {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.bottom + 4}px`,
        zIndex: 1080
      }
    })

    function scheduleHide() {
      cancelHide()
      hideTimeout = setTimeout(() => {
        showPopover.value = false
      }, 150)
    }

    function cancelHide() {
      if (hideTimeout) {
        clearTimeout(hideTimeout)
        hideTimeout = null
      }
    }

    async function copyAddress() {
      const addr = props.address || ''
      if (!addr) return
      try {
        await navigator.clipboard.writeText(addr)
        copied.value = true
        toast.success('Address copied')
        setTimeout(() => { copied.value = false }, 2000)
      } catch (err) {
        toast.error('Failed to copy')
      }
    }

    return {
      triggerRef,
      popoverRef,
      showPopover,
      copied,
      inAddressBook,
      truncated,
      explorerUrl,
      popoverStyle,
      scheduleHide,
      cancelHide,
      copyAddress
    }
  }
}
</script>

<style scoped>
.address-trigger {
  cursor: pointer;
}

code.address-inline,
.address-popover-body code {
  font-size: 0.875rem;
}

.address-popover {
  min-width: 280px;
  padding: 0.75rem 1rem;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.address-popover-body code {
  word-break: break-all;
}

.text-break {
  word-break: break-all;
}
</style>
