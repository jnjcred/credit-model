<script setup>
// Kundens svar "salg fordelt på lande" på et punkt (workspace.jsx: OutstandingItem, L3025–3048):
// land og procent, og I alt nederst med rødt, hvis summen afrundet ikke er 100.
// Tallene formateres af wsCountrySplit i src/domain/workspace/items.js (1 decimal, på dansk med
// mellemrum før %).
//
// Props: split = wsCountrySplit(itemState): { list, sum, pct(v), ok }. Emits: ingen.
import { computed } from 'vue'
import { t } from '@/i18n'

const props = defineProps({
  split: { type: Object, required: true },
})

const columns = [
  { key: 'name' },
  { key: 'pct', align: 'right' },
]
// Samme nøgle som før: landets kode eller navn og placeringen
const rows = computed(() => props.split.list.map((c, i) => ({ key: (c.code || c.name) + i, c })))
</script>

<template>
  <div class="ws-country">
    <a-typography-text type="secondary">
      {{ t('Kundens svar: salg fordelt på lande') }}
    </a-typography-text>
    <a-table
      size="small"
      bordered
      :show-header="false"
      :pagination="false"
      :columns="columns"
      :data-source="rows"
      row-key="key"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          {{ t(record.c.name || record.c.code) }}
        </template>
        <template v-else-if="column.key === 'pct'">
          {{ split.pct(record.c.pct) }}
        </template>
      </template>
      <template #summary>
        <a-table-summary-row>
          <a-table-summary-cell :index="0">
            <a-typography-text
              strong
              type="secondary"
            >
              {{ t('I alt') }}
            </a-typography-text>
          </a-table-summary-cell>
          <a-table-summary-cell
            :index="1"
            align="right"
          >
            <a-typography-text
              strong
              :type="split.ok ? undefined : 'danger'"
            >
              {{ split.pct(split.sum) }}
            </a-typography-text>
          </a-table-summary-cell>
        </a-table-summary-row>
      </template>
    </a-table>
  </div>
</template>

<style scoped>
/* Et smalt svar: tallene står tæt på landene */
.ws-country {
  max-width: 520px;
}
</style>
