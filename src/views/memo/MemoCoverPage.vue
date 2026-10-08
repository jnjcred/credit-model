<script setup>
// Memoets forside efter EIFO's skabelon "Kreditindstilling" (memo.jsx: WSMemo L6901-6950): virksomheden,
// "Indstilling af nyt engagement til Kreditkomité", kreditrisiko og kundetype, tabellen "Virksomhed" (dato,
// CVR, branche, sagsnr., primær og sekundær sagsbehandler; EIFO direkte investering og dispensation) og
// faktaboksen "Indstillingen i hovedtræk". Ikke redigerbar. Demoens faste værdier (branche, behandlere,
// "Ingen" dispensation) står som i prototypen.
// En indstillet version vises på indstillingssproget og med forsiden, som den blev frosset (front); ældre
// versioner uden den viser den levende uden "Udkast:".
//
// Props: company (DATA.COMPANY), front (den låste versions forside eller null), locked (memoLocked() eller
//        null), docLang ('da' | 'en': dokumentets sprog).
// Emits: jump(afsnitsnøgle) (faktaboksens henvisninger til et afsnit).
import { computed } from 'vue'
import { _memoTL, memoDate } from '@/domain/memo/memoFormat'
import { memoFacts, memoRisk } from '@/domain/memo/memoFacts'
import MemoFactsBox from './MemoFactsBox.vue'

const props = defineProps({
  company: { type: Object, required: true },
  front: { type: Object, default: null },
  locked: { type: Object, default: null },
  docLang: { type: String, required: true },
})
const emit = defineEmits(['jump'])

const tDoc = (s) => _memoTL(props.docLang, s)
const risk = computed(() => (props.front ? props.front.risk : memoRisk()))
// Side 1: indstillingen i hovedtræk, fra faktaarket (den frosne forside, når versionen har en)
const factRows = computed(() => (props.front ? props.front.facts : memoFacts({ final: !!props.locked })))
</script>

<template>
  <div class="memo-cover">
    <a-typography-text type="secondary">
      {{ tDoc('Kreditindstilling') }}
    </a-typography-text>
    <div class="memo-cover-name">
      {{ company.name || 'Nordhavn Composite A/S' }}
    </div>
    <p class="memo-cover-line">
      {{ tDoc('Indstilling af') }} <a-tag>{{ tDoc('nyt engagement') }}</a-tag> {{ tDoc('til') }} <a-tag>{{ tDoc('Kreditkomité') }}</a-tag>
    </p>
    <a-space
      wrap
      :size="[24, 8]"
    >
      <a-typography-text type="secondary">
        {{ tDoc('Kreditrisiko:') }} <a-tag>{{ risk }}</a-tag>
      </a-typography-text>
      <a-typography-text type="secondary">
        {{ tDoc('Kundetype:') }} <a-tag>{{ tDoc('Erhverv, SMV') }}</a-tag>
      </a-typography-text>
    </a-space>

    <!-- Virksomhed: sagens nøgletal, ét pr. række (skabelonens to kolonner blev for smalle til tallene) -->
    <a-descriptions
      class="memo-cover-company"
      :title="tDoc('Virksomhed')"
      bordered
      size="small"
      :column="1"
    >
      <a-descriptions-item :label="tDoc('EIFO direkte investering / ejerandel')">
        <a-typography-text type="secondary">
          <em>{{ tDoc('Ikke relevant for denne sag.') }}</em>
        </a-typography-text>
      </a-descriptions-item>
      <a-descriptions-item :label="tDoc('Dato:')">
        <span class="memo-date">{{ memoDate(locked, docLang) }}</span>
      </a-descriptions-item>
      <a-descriptions-item label="CVR:">
        <span class="memo-cover-cvr">{{ company.cvr || '' }}</span>
      </a-descriptions-item>
      <a-descriptions-item :label="tDoc('Branche:')">
        {{ tDoc('Vindmøllekomponenter / komposit') }}
      </a-descriptions-item>
      <a-descriptions-item :label="tDoc('Dispensation fra acceptkriterie')">
        <div>{{ tDoc('Ingen') }}</div>
        <a-typography-text type="secondary">
          <em>{{ tDoc('(Maks. to linjer med kreditmæssig begrundelse ved evt. dispensation)') }}</em>
        </a-typography-text>
      </a-descriptions-item>
      <a-descriptions-item :label="tDoc('Sagsnr.:')">
        {{ company.caseNr || '' }}
      </a-descriptions-item>
      <a-descriptions-item :label="tDoc('Primær:')">
        {{ tDoc('Mette Larsen, Kredit') }}
      </a-descriptions-item>
      <a-descriptions-item :label="tDoc('Sekundær:')">
        {{ tDoc('Sofie Andersen, Erhverv') }}
      </a-descriptions-item>
    </a-descriptions>

    <!-- Side 1: indstillingen i hovedtræk, fra faktaarket -->
    <MemoFactsBox
      :rows="factRows"
      :lang="docLang"
      @jump="(k) => emit('jump', k)"
    />
    <a-divider />
  </div>
</template>

<style scoped>
/* Forsidens dele står med luft imellem */
.memo-cover {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Virksomhedens navn er dokumentets titel (samme størrelse som temaets afsnitsoverskrifter, 20 px) */
.memo-cover-name {
  font-weight: 600;
  font-size: 20px;
  line-height: 1.4;
}

.memo-cover-line {
  margin: 0;
}

/* CVR-nummeret med dokumentets faste skriftbredde (--mono, sat på .memo-doc i memo-document.less) */
.memo-cover-cvr {
  font-family: var(--mono);
}
</style>
