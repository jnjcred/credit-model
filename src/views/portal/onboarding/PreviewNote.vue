<script setup>
// Noten i rådgiverens forhåndsvisning, når rådgiveren rører noget, kun kunden må gøre (PortalPvNote,
// portal_onboarding.jsx L976-993): "Forhåndsvisning: <det kunden selv gør> Intet er ændret."
// Den lukker selv efter 6 sekunder; uret starter forfra, når what eller n skifter.
//
// Props: what (handlingen fra data-cust-act eller 'cw-preview-blocked'; tom = ingen note),
//        n (skifter ved hver ny blokering, så samme note genstarter uret).
// Emits: close.
//
// Den levende region (role="status", aria-live="polite") står der altid, også uden note, så
// skærmlæsere hører noten, når den kommer. a-alert's egen role="alert" slås fra (role="none"), så
// noten læses høfligt som før. Lukkeknappen er a-alert's egen knap med navnet "Luk" (ikonets
// aria-label). En ny blokering med samme tekst ændrer ikke teksten (læses ikke op igen, som før),
// men uret starter forfra.
import { onBeforeUnmount, watch } from 'vue'
import { CloseOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { pvBlockedText } from '@/domain/onboarding'

const props = defineProps({
  what: { type: String, default: '' },
  n: { type: Number, default: 0 },
})
const emit = defineEmits(['close'])

let timer = null
watch(() => [props.what, props.n], () => {
  clearTimeout(timer)
  if (!props.what) return
  timer = setTimeout(() => emit('close'), 6000)
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    class="pv-note"
    role="status"
    aria-live="polite"
  >
    <a-alert
      v-if="what"
      type="info"
      role="none"
      show-icon
      closable
      @close="emit('close')"
    >
      <template #icon>
        <EyeOutlined aria-hidden="true" />
      </template>
      <template #message>
        <a-typography-text strong>
          {{ t('Forhåndsvisning') }}:
        </a-typography-text>
        {{ pvBlockedText(what) }} {{ t('Intet er ændret.') }}
      </template>
      <template #closeIcon>
        <CloseOutlined :aria-label="t('Luk')" />
      </template>
    </a-alert>
  </div>
</template>

<style scoped>
/* Fast nederst på midten, over portalens indhold (som før) */
.pv-note {
  position: fixed;
  right: 16px;
  bottom: 20px;
  left: 16px;
  z-index: 300;
  max-width: 560px;
  margin: 0 auto;
}
</style>
