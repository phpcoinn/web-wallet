<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal fade show changelog-modal"
      style="display: block"
      tabindex="-1"
      role="dialog"
      aria-labelledby="changelogModalTitle"
      aria-modal="true"
      @click.self="close"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" @click.stop>
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="changelogModalTitle" class="modal-title">Changelog</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
          </div>
          <div class="modal-body">
            <div class="changelog-body text-body text-start" v-html="changelogHtml"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="close">Close</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="modelValue" class="modal-backdrop fade show changelog-modal-backdrop"></div>
  </Teleport>
</template>

<script>
import { changelogFullHtml } from '../utils/changelog'

export default {
  name: 'ChangelogModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    function close() {
      emit('update:modelValue', false)
    }

    return {
      changelogHtml: changelogFullHtml,
      close
    }
  }
}
</script>

<style scoped>
.changelog-modal {
  z-index: 1075;
}

.changelog-modal-backdrop {
  z-index: 1070;
  background-color: rgba(0, 0, 0, 0.5);
}

.changelog-body {
  font-size: 0.9375rem;
  line-height: 1.55;
  max-height: min(60vh, 28rem);
  overflow-y: auto;
}

.changelog-body :deep(h1) {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}
.changelog-body :deep(h2) {
  font-size: 1.1rem;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}
.changelog-body :deep(h3) {
  font-size: 1rem;
  margin-top: 1rem;
  margin-bottom: 0.35rem;
}
.changelog-body :deep(p) {
  margin-bottom: 0.5rem;
}
.changelog-body :deep(ul),
.changelog-body :deep(ol) {
  margin-bottom: 0.75rem;
  padding-left: 1.25rem;
}
.changelog-body :deep(li) {
  margin-bottom: 0.25rem;
}
.changelog-body :deep(a) {
  word-break: break-word;
}
.changelog-body :deep(code) {
  font-size: 0.9em;
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  background-color: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.05));
}
.changelog-body :deep(pre) {
  font-size: 0.8125rem;
  padding: 0.75rem;
  border-radius: var(--tm-radius-sm, 0.375rem);
  background-color: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.05));
  overflow-x: auto;
}
.changelog-body :deep(pre code) {
  padding: 0;
  background: none;
}
</style>
