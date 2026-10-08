<script setup>
// Kundens hændelser i Anmodet materiale (workspace.jsx: WSCustomerEvents, L2302–2338) som grå
// linjer: opstarten i portalen, nej til datadeling, revisoren og adgangen til regnskabssystemet.
// Tidspunktet står i et tooltip (før: title). Intet vises, når der ingen hændelser er.
// Rækkerne bygges af wsCustomerEvents i src/domain/workspace/items.js.
//
// Props: ingen. Emits: ingen.
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsCustomerEvents } from '@/domain/workspace/items'
import { useCaseVersion } from '@/composables/useCaseVersion'

const caseVersion = useCaseVersion()
const rows = computed(() => {
  caseVersion.value
  return wsCustomerEvents()
})
</script>

<template>
  <ul
    v-if="rows"
    class="ws-events"
    :aria-label="t('Hændelser fra kunden')"
  >
    <li
      v-for="r in rows"
      :key="r.k"
    >
      <a-tooltip :title="CW.fmtWhen(r.at) || undefined">
        <a-typography-text type="secondary">
          {{ r.text }}
        </a-typography-text>
      </a-tooltip>
    </li>
  </ul>
</template>

<style scoped>
/* Grå linjer uden punkttegn, med luft før grupperne (som før) */
.ws-events {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
}
</style>
