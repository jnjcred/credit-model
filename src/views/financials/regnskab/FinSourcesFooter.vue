<script setup>
/* Kilderne under regnskabstabellen (financials.jsx AnnualReportSection, F:2025-2056):
   årsrapporterne, periodetallene (eller kundens saldobalance, når kontomappingen er hentet) og
   budgettet. Findes dokumentet i sagen, åbner navnet det under Dokumenter: dokumentet lægges i
   sessionStorage 'kabul:open-doc', 'cw-open-doc' sendes, og fanen skiftes (som før migrationen).
   Ingen props eller emits. */
import { computed } from 'vue'
import { t } from '@/i18n'
import { FIN_ANNUAL_YEARS } from '@/domain/financials/finData'
import { FIN_MAPPED } from '@/domain/financials/finMapping'
import { finSourceDoc } from '@/domain/financials/finExportDocs'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { go } from '@/composables/useNavigation'

const version = useCaseVersion()
const items = computed(() => {
  version.value
  return [
    ...FIN_ANNUAL_YEARS.map(y => ({ key: y, label: t('Årsrapport') + ' ' + y, doc: finSourceDoc('Årsrapport', y) })),
    FIN_MAPPED
      ? { key: 'saldo', label: t('Saldobalance fra e-conomic (kontomapping)') }
      : { key: 'periode', label: t('Periodetal'), doc: finSourceDoc('Periodetal') },
    { key: 'budget', label: t('Budget'), doc: finSourceDoc('Budget') },
  ]
})

const openDoc = (it) => {
  const detail = { doc: it.doc.id, name: it.doc.name, ref: null, back: null }
  try { sessionStorage.setItem('kabul:open-doc', JSON.stringify(detail)) } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('cw-open-doc', { detail })) } catch (e) {}
  go('workspace:1:documents')
}
</script>

<template>
  <div class="fin-sources">
    <a-typography-text type="secondary">
      {{ t('Kilder') }}:
    </a-typography-text>
    <template
      v-for="(it, i) in items"
      :key="it.key"
    >
      <a-typography-text
        v-if="i > 0"
        type="secondary"
      >
        ·
      </a-typography-text>
      <a-button
        v-if="it.doc"
        type="link"
        size="small"
        @click="openDoc(it)"
      >
        {{ it.label }}
      </a-button>
      <a-typography-text
        v-else
        type="secondary"
      >
        {{ it.label }}
      </a-typography-text>
    </template>
  </div>
</template>

<style scoped>
.fin-sources {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 4px;
}
</style>
