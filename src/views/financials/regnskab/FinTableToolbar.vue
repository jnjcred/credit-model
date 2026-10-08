<script setup>
/* Værktøjslinjen over regnskabet (financials.jsx AnnualReportSection, F:1842-1862): enheden
   (DKK mio. / DKK t.), "Skjul tomme rækker" og budgettet ud og ind som Excel. Importerede tal
   bliver rettelser (finImportBudget); "Importér budget" vises ikke, når sagen er indstillet, og
   beder sektionen åbne filvælgeren (som grafens knap).
   Props: unit ('mio' | 'thousand'), hideEmpty, locked
   Emits: update:unit, update:hideEmpty, import (vælg en fil), export */
import { computed } from 'vue'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'

defineProps({
  unit: { type: String, required: true },
  hideEmpty: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
})
const emit = defineEmits(['update:unit', 'update:hideEmpty', 'import', 'export'])

const unitOptions = computed(() => [{ value: 'mio', label: t('DKK mio.') }, { value: 'thousand', label: t('DKK t.') }])
</script>

<template>
  <div class="fin-toolbar">
    <a-radio-group
      :value="unit"
      option-type="button"
      name="fin-unit"
      role="radiogroup"
      :aria-label="t('Enhed')"
      :options="unitOptions"
      @change="(e) => emit('update:unit', e.target.value)"
    />
    <a-checkbox
      :checked="hideEmpty"
      @change="(e) => emit('update:hideEmpty', e.target.checked)"
    >
      {{ t('Skjul tomme rækker') }}
    </a-checkbox>
    <!-- Budgettet ud og ind som Excel. Importerede tal bliver rettelser. -->
    <a-space class="fin-toolbar-end">
      <a-button
        v-if="!locked"
        id="fin-import-budget"
        @click="emit('import')"
      >
        <template #icon>
          <UploadOutlined aria-hidden="true" />
        </template>
        {{ t('Importér budget') }}
      </a-button>
      <a-button
        id="fin-export-budget"
        @click="emit('export')"
      >
        <template #icon>
          <DownloadOutlined aria-hidden="true" />
        </template>
        {{ t('Eksportér budget') }}
      </a-button>
    </a-space>
  </div>
</template>

<style scoped>
.fin-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
}

.fin-toolbar-end { margin-left: auto; }
</style>
