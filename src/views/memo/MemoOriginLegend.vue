<script setup>
// Forklaringen over dokumentet, mens "Vis ophav" er slået til (memo.jsx: WSMemo L6855-6878): hvor meget af
// memoet rådgiveren står inde for, talt i blokke (afsnit, lister, tabeller), ikke tegn. Farverne er de
// samme som blokkenes kant i dokumentet (src/styles/memo-document.less): udkast = geekblue, gennemgået =
// success; egen tekst har ingen farve.
//
// Props: stats ({ draft, reviewed, own } fra siden).
import { t } from '@/i18n'

defineProps({
  stats: { type: Object, required: true },
})
</script>

<template>
  <!-- role="note": a-alert er ellers role="alert", og tallene skifter, mens man skriver, så hele forklaringen
       blev læst op igen ved hver ændring (prototypens forklaring var ikke et levende område) -->
  <a-alert
    banner
    type="info"
    :show-icon="false"
    role="note"
    class="memo-origin-stats"
  >
    <template #message>
      <a-space
        wrap
        :size="[16, 4]"
      >
        <a-badge
          color="geekblue"
          :text="stats.draft + ' ' + t('blokke er udkast, ikke gennemgået')"
        />
        <a-badge
          status="success"
          :text="stats.reviewed + ' ' + t('gennemgået af rådgiver')"
        />
        <a-badge
          status="default"
          :text="stats.own + ' ' + t('skrevet af dig')"
        />
        <a-typography-text type="secondary">
          {{ t('Udkast fra skabelonen og AI forbliver udkast, også når du retter i dem, indtil du markerer afsnittet som gennemgået.') }}
        </a-typography-text>
      </a-space>
    </template>
  </a-alert>
</template>
