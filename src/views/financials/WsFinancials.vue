<script setup>
// Fanen Virksomheden i sagen (financials.jsx: WSFinancials): kunden samlet ét sted. Afsnittene står
// i samme rækkefølge som før migrationen: Regnskab, Produkt/marked/branche, Trustpilot, Stamdata og
// Ejerskab. Logikken bag afsnittene står i src/domain/financials/.
//
// Props: ingen (React-proppen go er droppet; skærmene bruger src/composables/useNavigation.js).
// Emits: ingen.
import { ref } from 'vue'
import { t } from '@/i18n'
import AnnualReportSection from './regnskab/AnnualReportSection.vue'
import MarketSection from './sections/MarketSection.vue'
import TrustpilotSection from './sections/TrustpilotSection.vue'
import CompanySection from './sections/CompanySection.vue'
import OwnershipSection from './sections/OwnershipSection.vue'

// Regnskab og budgeteditoren viser tal i samme enhed: 'thousand' (DKK t.) eller 'mio'
const unit = ref('thousand')
</script>

<template>
  <div class="fin-page">
    <div>
      <a-typography-title>{{ t('Virksomheden') }}</a-typography-title>
      <a-typography-text type="secondary">
        {{ t('Kunden samlet ét sted: stamdata, regnskab og budget, marked og ejerskab.') }}
      </a-typography-text>
    </div>
    <AnnualReportSection v-model:unit="unit" />
    <MarketSection />
    <TrustpilotSection />
    <CompanySection />
    <OwnershipSection />
  </div>
</template>

<style scoped>
/* Afsnittene giver selv afstanden over sig (Regnskab og FinSection 28 px, Trustpilot 20 px) */
.fin-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 32px 80px;
}
</style>
