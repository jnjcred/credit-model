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
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
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
</script>

<template>
  <div class="cwp-demo">
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

.cwp-demo-right {
  display: flex;
  gap: 4px;
  align-items: center;
}

/* På telefoner står bjælken nederst på siden i stedet (den må ikke dække indholdet) */
@media (max-width: 575px) {
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
