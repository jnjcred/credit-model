<script setup>
// Bekræftelsesdialogen bag CW.confirm (src/services/feedback.js). Monteres én gang i App.vue.
// Samme regler som før migrationen: Esc og Annullér svarer { ok: false }, en påkrævet
// årsag skal være mindst 5 tegn, og fokus vender tilbage til det element, der åbnede den.
import { computed, nextTick, ref, watch } from 'vue'
import { confirmState, settleConfirm } from '@/services/feedback'
import { t } from '@/i18n'

const reason = ref('')
const checked = ref(false)
const error = ref('')
const reasonInput = ref(null)
const cancelButton = ref(null)
const okButton = ref(null)

const o = computed(() => confirmState.opts || {})
const hasReason = computed(() => !!(o.value.requireReason || o.value.reasonOptional))

watch(() => confirmState.open, (open) => {
  if (!open) return
  reason.value = ''
  error.value = ''
  checked.value = !!(o.value.checkbox && o.value.checkbox.checked !== false)
  // Fokus: årsagsfeltet, ellers Annullér (focusCancel) eller bekræft
  nextTick(() => setTimeout(() => {
    const target = hasReason.value ? reasonInput.value : (o.value.focusCancel ? cancelButton.value : okButton.value)
    if (target && target.focus) target.focus()
    else if (target && target.$el) target.$el.focus()
  }, 0))
})

function onOk () {
  if (o.value.requireReason && reason.value.trim().length < 5) {
    error.value = t('Skriv en årsag på mindst et par ord.')
    if (reasonInput.value) reasonInput.value.focus()
    return
  }
  settleConfirm({ ok: true, reason: hasReason.value ? reason.value.trim() : '', checked: o.value.checkbox ? checked.value : false })
}
function onCancel () {
  settleConfirm({ ok: false })
}
</script>

<template>
  <a-modal
    :visible="confirmState.open"
    :wrap-props="{ 'aria-modal': 'true' }"
    :title="o.title || t('Er du sikker?')"
    :width="440"
    :mask-closable="false"
    :z-index="2000"
    @cancel="onCancel"
  >
    <a-typography-paragraph v-if="o.text">
      {{ o.text }}
    </a-typography-paragraph>
    <a-form
      v-if="hasReason"
      layout="vertical"
    >
      <!-- Feltets navn og id som før migrationen (label for="cw-confirm-reason") -->
      <a-form-item
        :label="o.reasonLabel || t('Årsag')"
        html-for="cw-confirm-reason"
        :validate-status="error ? 'error' : ''"
      >
        <!-- Fejlen er knyttet til feltet (aria-describedby), som før (cw-confirm-err) -->
        <template
          v-if="error"
          #help
        >
          <span id="cw-confirm-err">{{ error }}</span>
        </template>
        <a-textarea
          id="cw-confirm-reason"
          ref="reasonInput"
          v-model:value="reason"
          :aria-describedby="error ? 'cw-confirm-err' : undefined"
          :rows="3"
        />
      </a-form-item>
    </a-form>
    <a-checkbox
      v-if="o.checkbox"
      v-model:checked="checked"
    >
      {{ o.checkbox.label }}
    </a-checkbox>
    <template #footer>
      <a-button
        ref="cancelButton"
        @click="onCancel"
      >
        {{ o.cancelLabel || t('Annullér') }}
      </a-button>
      <a-button
        ref="okButton"
        type="primary"
        :danger="!!o.danger"
        @click="onOk"
      >
        {{ o.confirmLabel || t('Fortsæt') }}
      </a-button>
    </template>
  </a-modal>
</template>
