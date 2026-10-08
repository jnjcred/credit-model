<script setup>
// Fremgangen, mens AI skriver memoet ("Generér memo"; memo.jsx: WSMemo L6830-6850):
//  - under skrivningen: "Skriver i af n: <afsnit>", en bjælke og "Stop". Bjælken viser de påbegyndte
//    afsnit: round(index / n × 100) %.
//  - færdig (eller stoppet): "x af n afsnit skrevet. Gennemgå teksten og ret det der skal rettes." og "Luk"
//  - fejl: fejlteksten; kørslen er stoppet, og linjen står, til næste kørsel
// En statusmeddelelse (role="status"), så fremgangen læses op.
//
// Props: gen ({ keys, index, label, running, error, written, finished } fra useMemoGeneration).
// Emits: stop, close.
import { computed } from 'vue'
import { t } from '@/i18n'

const props = defineProps({
  gen: { type: Object, required: true },
})
const emit = defineEmits(['stop', 'close'])

const percent = computed(() => Math.round((props.gen.index / props.gen.keys.length) * 100))
</script>

<template>
  <a-alert
    v-if="gen.error"
    banner
    type="error"
    role="status"
    :message="gen.error"
  />
  <a-alert
    v-else-if="gen.running"
    banner
    type="info"
    :show-icon="false"
    role="status"
  >
    <template #message>
      <div class="memo-gen-row">
        <span>{{ t('Skriver') }} {{ gen.index + 1 }} {{ t('af') }} {{ gen.keys.length }}: {{ t(gen.label) }}</span>
        <a-progress
          class="memo-gen-bar"
          :percent="percent"
          size="small"
          :show-info="false"
        />
        <a-button
          size="small"
          @click="emit('stop')"
        >
          {{ t('Stop') }}
        </a-button>
      </div>
    </template>
  </a-alert>
  <a-alert
    v-else
    banner
    type="success"
    role="status"
    :close-text="t('Luk')"
    @close="emit('close')"
  >
    <template #message>
      {{ gen.written.length }} {{ t('af') }} {{ gen.keys.length }} {{ t('afsnit skrevet. Gennemgå teksten og ret det der skal rettes.') }}
    </template>
  </a-alert>
</template>

<style scoped>
/* Tekst, bjælke og knap på én linje; bjælken fylder resten */
.memo-gen-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.memo-gen-bar {
  flex: 1;
  min-width: 120px;
}
</style>
