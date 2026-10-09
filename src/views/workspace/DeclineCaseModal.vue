<script setup>
// Giv afslag (WSDeclineDialog i workspace.jsx L482–537): kan ske i alle faser før indstilling.
// En årsag er påkrævet (de fem årsager står fremme som radioknapper), og ved "Andet" også en note.
// "Registrér afslag" kan altid trykkes; mangler noget, står kravet med rødt under feltet.
// Annullér, Esc, krydset og klik udenfor lukker og giver fokus tilbage til knappen, der åbnede
// dialogen (returnFocus), ellers til fasekortets overskrift. Logikken står i
// src/domain/workspace/actions.js (wsDeclineState, wsDecline, wsDeclineCancel).
//
// Dialogen er åben, så længe den er monteret: <DeclineCaseModal v-if="declining" ... @close="declining = false" />
// Props: returnFocus (CSS-selektor, f.eks. '#ws-more-btn' eller '#ws-hero-decline').
// Emits: close.
import { computed, nextTick, onMounted, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsFill } from '@/domain/workspace/format'
import { WS_DECLINE_REASONS, wsDecline, wsDeclineCancel, wsDeclineState } from '@/domain/workspace/actions'
import { useCaseAndMemo } from './composables/useMemoStatus'

const props = defineProps({
  returnFocus: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const reason = ref('')
const note = ref('')
const tried = ref(false)
// Fasen, sagen stoppes i, om afslaget kan registreres, og kravet, der mangler
const st = useCaseAndMemo(() => wsDeclineState(reason.value, note.value))
// Noten er påkrævet ved "Andet"; ellers er den valgfri (kun Årsag har stjerne)
const noteRequired = computed(() => reason.value === 'Andet')
// Kravet står ved det felt, det gælder, og først efter et forsøg på at registrere
const reasonError = computed(() => (tried.value && !reason.value ? st.value.hint : ''))
const noteError = computed(() => (tried.value && reason.value && !st.value.ok ? st.value.hint : ''))

const close = () => emit('close')
const cancel = () => wsDeclineCancel(props.returnFocus, close)
function submit () {
  tried.value = true
  if (!st.value.ok) {
    CW.focusSoon(!reason.value ? '#ws-decline-reasons input' : '#ws-decline-note')
    return
  }
  wsDecline(reason.value, note.value, close)
}

// Fokus på den første årsag, når dialogen åbner
onMounted(() => nextTick(() => CW.focusSoon('#ws-decline-reasons input')))
</script>

<template>
  <a-modal
    :visible="true"
    :wrap-props="{ 'aria-modal': 'true' }"
    :title="t('Giv afslag')"
    :width="520"
    @cancel="cancel"
  >
    <a-typography-paragraph>
      {{ wsFill(t('Sagen stoppes i fasen {stage}, og kunden får ikke besked automatisk. Du kan genoptage sagen senere.'), { stage: st.from }) }}
    </a-typography-paragraph>
    <a-form layout="vertical">
      <a-form-item
        :label="t('Årsag')"
        required
        :validate-status="reasonError ? 'error' : undefined"
        :help="reasonError || undefined"
      >
        <a-radio-group
          id="ws-decline-reasons"
          v-model:value="reason"
          :aria-label="t('Årsag')"
          :aria-invalid="reasonError ? 'true' : undefined"
        >
          <a-space
            direction="vertical"
            :size="8"
          >
            <a-radio
              v-for="r in WS_DECLINE_REASONS"
              :key="r"
              :value="r"
            >
              {{ t(r) }}
            </a-radio>
          </a-space>
        </a-radio-group>
      </a-form-item>
      <a-form-item
        class="ws-decline-last"
        :label="t('Note')"
        html-for="ws-decline-note"
        :required="noteRequired"
        :validate-status="noteError ? 'error' : undefined"
        :help="noteError || undefined"
      >
        <a-textarea
          id="ws-decline-note"
          v-model:value="note"
          :auto-size="{ minRows: 3, maxRows: 6 }"
          :placeholder="t('F.eks. faldende indtjening og høj gæld i forhold til EBITDA.')"
        />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="cancel">
        {{ t('Annullér') }}
      </a-button>
      <a-button
        type="primary"
        danger
        @click="submit"
      >
        {{ t('Registrér afslag') }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped>
/* Sidste felt: modalens egen luft er nok under det */
.ws-decline-last {
  margin-bottom: 0;
}
</style>
