<script setup>
// Et afsnit i fanen Virksomheden (financials.jsx: FinSection): overskrift (h2) med en grå
// undertekst og evt. handlinger til højre (badge), derefter afsnittets indhold (kort).
// Samme opbygning som overskriften i Regnskab (regnskab/AnnualReportSection.vue).
//
//   <FinSection :title="t('Stamdata')" :sub="…">
//     <template #badge>…handlinger…</template>
//     <a-card :bordered="false">…</a-card>
//   </FinSection>
//
// Props: title, sub. Slots: default (indholdet), badge (handlinger til højre; React-proppen badge).
// Emits: ingen.
defineProps({
  title: { type: String, required: true },
  sub: { type: String, default: '' },
})
</script>

<template>
  <section class="fin-section">
    <div class="fin-section-head">
      <div class="fin-section-text">
        <a-typography-title :level="2">
          {{ title }}
        </a-typography-title>
        <a-typography-text
          v-if="sub"
          type="secondary"
        >
          {{ sub }}
        </a-typography-text>
      </div>
      <slot name="badge" />
    </div>
    <slot />
  </section>
</template>

<style scoped>
.fin-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 28px;
}

.fin-section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px 12px;
}

.fin-section-text {
  flex: 1 1 320px;
  max-width: 760px;
}
</style>
