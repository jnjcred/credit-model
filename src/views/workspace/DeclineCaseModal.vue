<script setup>
// Giv afslag (WSDeclineDialog i workspace.jsx L482–537): kan ske i alle faser før indstilling.
// En årsag er påkrævet, og ved "Andet" også en note. "Registrér afslag" kan altid trykkes; mangler
// noget, står kravet med rødt under feltet (før første forsøg står det gråt som vejledning).
// Annullér, Esc, krydset og klik udenfor lukker og giver fokus tilbage til knappen, der åbnede
// dialogen (returnFocus), ellers til fasekortets overskrift. Esc i den åbne årsagsliste lukker kun
// listen. Logikken står i src/domain/workspace/actions.js (wsDeclineState, wsDecline, wsDeclineCancel).
//
// Dialogen er åben, så længe den er monteret: <DeclineCaseModal v-if="declining" ... @close="declining = false" />
// Props: returnFocus (CSS-selektor, fx '#ws-more-btn' eller '#ws-hero-decline').
// Emits: close.
import { computed, nextTick, onMounted, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { useSelectEscape } from '@/composables/useSelectEscape'
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
const reasonOptions = computed(() => WS_DECLINE_REASONS.map(r => ({ value: r, label: t(r) })))
const noteLabel = computed(() => (reason.value === 'Andet' ? t('Note (påkrævet ved "Andet")') : t('Note (valgfri)')))
// Kravet står ved det felt, det gælder: årsagen, eller noten ved "Andet"
const reasonHint = computed(() => (!reason.value ? st.value.hint : ''))
const noteHint = computed(() => (reason.value && !st.value.ok ? st.value.hint : ''))

const selectEsc = useSelectEscape()
const close = () => emit('close')
const cancel = () => wsDeclineCancel(props.returnFocus, close)
function submit () {
  tried.value = true
  if (!st.value.ok) return
  wsDecline(reason.value, note.value, close)
}

// Fokus i årsagen, når dialogen åbner (som autoFocus før migrationen)
onMounted(() => nextTick(() => CW.focusSoon('#ws-decline-reason')))
</script>

<template>
  <a-modal
    :visible="true"
    :wrap-props="{ 'aria-modal': 'true' }"
    :title="t('Giv afslag')"
    :width="572"
    @cancel="cancel"
  >
    <a-typography-paragraph type="secondary">
      {{ wsFill(t('Sagen stoppes i fasen {stage}. Kunden får ikke besked automatisk. Genoptager du sagen, vender den tilbage hertil.'), { stage: st.from }) }}
    </a-typography-paragraph>
    <a-form layout="vertical">
      <a-form-item
        :label="t('Årsag')"
        html-for="ws-decline-reason"
        :validate-status="tried && reasonHint ? 'error' : undefined"
      >
        <div
          @keydown.capture="selectEsc.onKeydownCapture"
          @keydown="selectEsc.onKeydown"
        >
          <a-select
            id="ws-decline-reason"
            :value="reason || undefined"
            :options="reasonOptions"
            :placeholder="t('Vælg årsag')"
            @change="(v) => { reason = v }"
          />
        </div>
        <template
          v-if="reasonHint && tried"
          #help
        >
          <span id="ws-decline-hint">{{ reasonHint }}</span>
        </template>
        <template
          v-else-if="reasonHint"
          #extra
        >
          <span id="ws-decline-hint">{{ reasonHint }}</span>
        </template>
      </a-form-item>
      <a-form-item
        :label="noteLabel"
        html-for="ws-decline-note"
        :validate-status="tried && noteHint ? 'error' : undefined"
      >
        <a-textarea
          id="ws-decline-note"
          v-model:value="note"
          :rows="3"
          :placeholder="t('Fx: Negativ udvikling i indtjeningen og høj gæld i forhold til EBITDA.')"
        />
        <template
          v-if="noteHint && tried"
          #help
        >
          <span id="ws-decline-hint">{{ noteHint }}</span>
        </template>
        <template
          v-else-if="noteHint"
          #extra
        >
          <span id="ws-decline-hint">{{ noteHint }}</span>
        </template>
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
