<script setup>
/* Værktøjslinjen over regnskabet (financials.jsx AnnualReportSection, F:1842-1862): enheden
   (DKK mio. / DKK t.) og "Skjul tomme rækker"; til højre sektionens indhold (slot). "Eksportér budget" er
   taget ud (Jesper 9. oktober).
   9. oktober: importen står nu ved budgettet (FinBudgetVersion.vue og grafens boks "Intet budget"),
   så det er tydeligt, at den bliver rådgiverens version af punktet Budget.
   Props: unit ('mio' | 'thousand'), hideEmpty
   Emits: update:unit, update:hideEmpty
   Slot: default (til højre) */
import { computed } from 'vue'
import { t } from '@/i18n'

defineProps({
  unit: { type: String, required: true },
  hideEmpty: { type: Boolean, default: false },
})
const emit = defineEmits(['update:unit', 'update:hideEmpty'])

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
    <!-- Til højre: det, sektionen lægger ind (demoknappen og "Sammenlign periodetal med samme periode sidste år") -->
    <div class="fin-toolbar-end">
      <slot />
    </div>
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
