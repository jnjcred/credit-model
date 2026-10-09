<script setup>
// Demobjælken nederst i kundens portal (new_case_portal.jsx: CustomerPortal L1265–1276), kun for kunden
// (ikke i rådgiverens forhåndsvisning): tilbage til rådgiverens visning, "Spring opstarten over (demo)"
// eller "Log ind (demo)" før og under opstarten, og efter opstarten "Upload demofil pr. punkt" og
// "Udfyld alt (demo)". Fast nederst på store skærme, en del af siden på telefoner (som før).
//
// Props: hasReq (der er en anmodning), lock (sagen er låst), loggedIn, obStep (opstartens trin, eller null),
//        skipLabel (teksten på demo-knappen før login), requested (punkterne til demopanelet).
// Emits: back (tilbage til rådgiverens visning), skip (spring opstarten over / log ind), fill-all.
// Klassen cwp-demo-fill står på demo-knapperne som før (de gamle tests finder dem med den).
import { ref } from 'vue'
import { ArrowLeftOutlined, CloseOutlined, ToolOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import PortalDemoUploads from './PortalDemoUploads.vue'

defineProps({
  hasReq: { type: Boolean, default: false },
  lock: { type: String, default: null },
  loggedIn: { type: Boolean, default: false },
  obStep: { type: String, default: null },
  skipLabel: { type: String, default: '' },
  requested: { type: Array, default: () => [] },
})
const emit = defineEmits(['back', 'skip', 'fill-all'])

// Hele demomenuen er en knap, der kan foldes ud og ind, så den ikke forstyrrer kundens skærme.
// Lukket som udgangspunkt; valget huskes i browseren.
const OPEN_KEY = 'cw_demo_bar_open'
const shown = ref(false)
try { shown.value = localStorage.getItem(OPEN_KEY) === '1' } catch (e) { /* uden lager: lukket */ }
function setShown (on) {
  shown.value = on
  try { localStorage.setItem(OPEN_KEY, on ? '1' : '0') } catch (e) { /* ignoreres */ }
}
</script>

<template>
  <div
    v-if="!shown"
    class="cwp-demo-toggle"
  >
    <a-button
      shape="round"
      aria-expanded="false"
      :title="t('Vis demomenuen')"
      @click="setShown(true)"
    >
      <template #icon>
        <ToolOutlined aria-hidden="true" />
      </template>
      {{ t('Demo') }}
    </a-button>
  </div>
  <div
    v-else
    class="cwp-demo"
  >
    <a-button
      type="primary"
      shape="round"
      @click="emit('back')"
    >
      <template #icon>
        <ArrowLeftOutlined aria-hidden="true" />
      </template>
      {{ t('Tilbage til rådgiver-visning') }}
    </a-button>
    <a-button
      v-if="hasReq && !lock && (!loggedIn || obStep)"
      type="text"
      class="cwp-demo-fill"
      @click="emit('skip')"
    >
      {{ skipLabel }}
    </a-button>
    <span
      v-if="hasReq && loggedIn && !obStep && !lock"
      class="cwp-demo-right"
    >
      <PortalDemoUploads :requested="requested" />
      <a-button
        type="text"
        class="cwp-demo-fill"
        @click="emit('fill-all')"
      >
        {{ t('Udfyld alt (demo)') }}
      </a-button>
    </span>
    <a-button
      type="text"
      shape="circle"
      aria-expanded="true"
      :title="t('Skjul demomenuen')"
      :aria-label="t('Skjul demomenuen')"
      @click="setShown(false)"
    >
      <template #icon>
        <CloseOutlined aria-hidden="true" />
      </template>
    </a-button>
  </div>
</template>

<style scoped>
/* Fast nederst på store skærme; knapperne kan klikkes, resten af bjælken lader klik gå igennem */
.cwp-demo {
  position: fixed;
  right: 16px;
  bottom: 16px;
  left: 16px;
  z-index: 50;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
}

.cwp-demo > * {
  pointer-events: auto;
}

/* Lukket: kun én lille knap nederst til højre */
.cwp-demo-toggle {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 50;
}

.cwp-demo-right {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* På telefoner står bjælken nederst på siden i stedet (den må ikke dække indholdet) */
@media (max-width: 575px) {
  .cwp-demo-toggle {
    position: static;
    padding: 8px 16px 24px;
  }

  .cwp-demo {
    position: static;
    flex-wrap: wrap;
    padding: 8px 16px 24px;
  }

  .cwp-demo-right {
    flex-wrap: wrap;
  }
}
</style>
