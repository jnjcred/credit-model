<script setup>
// Budgetspørgsmålene i kundens upload (budgetpunktet i PortalUpload). Filen læses i browseren
// (src/domain/budget_read.js), og intet af det kunden svarer retter tallene.
// Mens filen læses, står kun en spinner. Derefter vises:
//   - en linje med det, vi har læst (år og enhed), når vi kan se det i filen
//   - spørgsmålene, der mangler svar: regnskabsår og periode altid, valuta og enhed kun, når filen ikke siger det
//   - en advarsel, hvis budgettet ikke dækker hele regnskabsåret (kunden skal lave det om og uploade igen)
// Svarene gemmes som læsehjælp til AI'en (CW.onboarding().budgetHints).
//
// Props: files (de valgte filer), fiscal (regnskabsårets første måned 1-12 eller null), fiscalLen (måneder),
//        fiscalDone (regnskabsåret er udfyldt).
// Emits: update:blocked ('coverage', når budgettet ikke dækker hele regnskabsåret; ellers false).
// Slot fiscal: valget af regnskabsår.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { brCoverage, brReadFile } from '@/domain/budget_read'
import { ncFill } from '@/domain/new_case_portal'

const props = defineProps({
  files: { type: Array, default: () => [] },
  fiscal: { type: Number, default: null },
  fiscalLen: { type: Number, default: 12 },
  fiscalDone: { type: Boolean, default: false },
})
const emit = defineEmits(['update:blocked'])

const result = ref(null)
const reading = ref(false)
const sheet = ref(false) // der er et regneark at læse (ellers fx en PDF)
const hints = ref({ ...((CW.onboarding().budgetHints) || {}) })

// Det første regneark blandt de valgte filer læses. Læsningen vises mindst et øjeblik, så kunden ser,
// at der sker noget, før spørgsmålene kommer.
let seq = 0
watch(() => props.files.map(f => f.id).join(','), async () => {
  const mine = ++seq
  const f = props.files.find(x => /\.(xlsx|xls|csv)$/i.test(x.name || '') && CW.fileUrl(x.id))
  sheet.value = !!f
  if (!f) { result.value = null; reading.value = false; return }
  reading.value = true
  const [r] = await Promise.all([brReadFile(CW.fileUrl(f.id), f.name), new Promise(res => setTimeout(res, 1200))])
  if (mine !== seq) return
  reading.value = false
  result.value = r
}, { immediate: true })

const CURRENCIES = [
  { value: 'DKK', label: 'DKK' },
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'other', label: 'Anden' },
]
// "Anden" åbner en søgbar liste over de valutaer, der typisk står i et budget
const CURRENCY_LIST = [
  ['AED', 'Emiratiske dirham'], ['ARS', 'Argentinske peso'], ['AUD', 'Australske dollar'], ['BGN', 'Bulgarske lev'],
  ['BRL', 'Brasilianske real'], ['CAD', 'Canadiske dollar'], ['CHF', 'Schweizerfranc'], ['CLP', 'Chilenske peso'],
  ['CNY', 'Kinesiske yuan'], ['COP', 'Colombianske peso'], ['CZK', 'Tjekkiske koruna'], ['DKK', 'Danske kroner'],
  ['EGP', 'Egyptiske pund'], ['EUR', 'Euro'], ['GBP', 'Britiske pund'], ['HKD', 'Hongkongske dollar'],
  ['HUF', 'Ungarske forint'], ['IDR', 'Indonesiske rupiah'], ['ILS', 'Israelske shekel'], ['INR', 'Indiske rupee'],
  ['ISK', 'Islandske krone'], ['JPY', 'Japanske yen'], ['KES', 'Kenyanske shilling'], ['KRW', 'Sydkoreanske won'],
  ['KZT', 'Kasakhstanske tenge'], ['MXN', 'Mexicanske peso'], ['MYR', 'Malaysiske ringgit'], ['NGN', 'Nigerianske naira'],
  ['NOK', 'Norske kroner'], ['NZD', 'New Zealandske dollar'], ['PEN', 'Peruanske sol'], ['PHP', 'Filippinske peso'],
  ['PLN', 'Polske zloty'], ['RON', 'Rumænske leu'], ['RUB', 'Russiske rubler'], ['SAR', 'Saudiske riyal'],
  ['SEK', 'Svenske kroner'], ['SGD', 'Singapore-dollar'], ['THB', 'Thailandske baht'], ['TRY', 'Tyrkiske lira'],
  ['TWD', 'Taiwanske dollar'], ['UAH', 'Ukrainske hryvnia'], ['USD', 'Amerikanske dollar'], ['VND', 'Vietnamesiske dong'],
  ['ZAR', 'Sydafrikanske rand'],
].map(([value, name]) => ({ value, label: value + ' - ' + name })).sort((a, b) => a.value.localeCompare(b.value))
const UNITS = [
  { value: 'kr', label: 'Hele kroner' },
  { value: 'tkr', label: 'Tusinde kroner (tkr.)' },
  { value: 'mio', label: 'Millioner kroner' },
]
const unitText = { kr: 'hele kroner', tkr: 'tusinde kroner (tkr.)', mio: 'millioner kroner' }

const r = computed(() => result.value)
// Kundens eget svar går foran det, filen siger, så et ændret svar gælder. Under "Anden" gælder kun listens valg
const currency = computed(() => (hints.value.currencyOther ? hints.value.currency || null : hints.value.currency || (r.value && r.value.currency) || null))
const currencyChoice = computed(() => (hints.value.currencyOther ? 'other' : currency.value))
const setCurrency = (v) => {
  if (v === 'other') setHint('currency', null)
  setHint('currencyOther', v === 'other')
  if (v !== 'other') setHint('currency', v)
}
const unit = computed(() => hints.value.unit || (r.value && r.value.unit) || null)

// Periode: hvordan budgettet er inddelt. Kunden svarer altid; filen foreslår et svar, der er forvalgt
const PERIODS = [
  { value: 'month', label: 'Måned' },
  { value: 'quarter', label: 'Kvartal' },
  { value: 'half', label: 'Halvår' },
  { value: 'year', label: 'År' },
]
const granAnswered = computed(() => !!hints.value.granularity)
const granularity = computed(() => hints.value.granularity || (r.value && r.value.granularity) || null)
const MONTH_NAMES = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']

// Dækningen: om budgettet dækker hele regnskabsåret. Kun når filen har den inddeling, kunden har svaret.
// null, når det ikke kan afgøres (fx årstal), så siger vi ikke noget om det
const coverage = computed(() => {
  if (!r.value || !props.fiscalDone || !granAnswered.value) return null
  if (hints.value.granularity !== r.value.granularity) return null
  return brCoverage(r.value.granularity, r.value.periodNums, props.fiscal, props.fiscalLen)
})
const coverageWarning = computed(() => {
  if (!coverage.value || coverage.value.ok) return ''
  const g = hints.value.granularity
  const name = (n) => (g === 'month' ? MONTH_NAMES[n - 1] : g === 'quarter' ? 'Q' + n : n === 1 ? t('1. halvår') : t('2. halvår'))
  const missing = coverage.value.missing.map(name).join(', ')
  return ncFill(t('Budgettet dækker ikke hele regnskabsåret. Mangler: {m}. Lav budgettet om, så det dækker hele regnskabsåret, og upload det igen.'), { m: missing })
})

// Alle spørgsmål står, også dem der er besvaret, så kunden kan ændre svaret. Under læsningen vises ingen af dem
const showQuestions = computed(() => !reading.value)

// Svarene er læsehjælp til AI'en: gemt på sagen, og de rører ikke tallene
watch(hints, (h) => { CW.setOnboarding({ budgetHints: { ...h } }) }, { deep: true })
const setHint = (k, v) => { hints.value = { ...hints.value, [k]: v } }

// Spærren: budgettet dækker ikke hele regnskabsåret, og kunden skal lave det om
const blockReason = computed(() => (coverage.value && !coverage.value.ok ? 'coverage' : false))
watch(blockReason, (v) => emit('update:blocked', v), { immediate: true })
onBeforeUnmount(() => emit('update:blocked', false))
</script>

<template>
  <div class="bc">
    <div
      v-if="showQuestions"
      class="bc-head"
    >
      <a-typography-title
        :level="4"
        class="bc-title"
      >
        {{ t('Spørgsmål til jeres budget') }}
      </a-typography-title>
      <a-typography-paragraph type="secondary">
        {{ t('Svar på det, I kan. Herefter kigger en rådgiver budgettet igennem.') }}
      </a-typography-paragraph>
      <a-typography-paragraph
        v-if="!r"
        type="secondary"
      >
        {{ sheet ? t('Vi kunne ikke læse regnearket. Rådgiveren ser budgettet igennem.') : t('Vi læser kun regneark (Excel eller CSV) automatisk. Rådgiveren ser budgettet igennem.') }}
      </a-typography-paragraph>
    </div>

    <div
      v-if="reading"
      class="bc-spin"
      role="status"
    >
      <a-spin size="small" />
      <a-typography-text type="secondary">
        {{ t('Vi læser jeres budget …') }}
      </a-typography-text>
    </div>

    <template v-if="showQuestions">
      <!-- Regnskabsår: kunden vælger det, og det er påkrævet -->
      <div class="bc-q">
        <div class="bc-label">
          {{ t('Hvad er jeres regnskabsår?') }}
        </div>
        <slot name="fiscal" />
      </div>

      <!-- Periode: måned, kvartal, halvår eller år. Filen foreslår et svar, kunden bekræfter det -->
      <div class="bc-q">
        <div class="bc-label">
          {{ t('Er budgettet lavet måned for måned, kvartalsvis, halvårligt eller årligt?') }}
        </div>
        <a-radio-group
          :value="granularity"
          :aria-label="t('Er budgettet lavet måned for måned, kvartalsvis, halvårligt eller årligt?')"
          @update:value="(v) => setHint('granularity', v)"
        >
          <a-radio-button
            v-for="o in PERIODS"
            :key="o.value"
            :value="o.value"
          >
            {{ t(o.label) }}
          </a-radio-button>
        </a-radio-group>
      </div>

      <!-- Valuta: filen foreslår, hvis den kan se den; kunden kan altid ændre den -->
      <div class="bc-q">
        <div class="bc-label">
          {{ t('Hvilken valuta er budgettet i?') }}
          <span
            v-if="!currency"
            class="bc-hint"
          >{{ t('Vi kan ikke se det i filen.') }}</span>
        </div>
        <a-radio-group
          :value="currencyChoice"
          :aria-label="t('Hvilken valuta er budgettet i?')"
          @update:value="setCurrency"
        >
          <a-radio-button
            v-for="o in CURRENCIES"
            :key="o.value"
            :value="o.value"
          >
            {{ t(o.label) }}
          </a-radio-button>
        </a-radio-group>
        <a-radio-group
          v-if="hints.currencyOther"
          class="bc-currency"
          :value="hints.currency || null"
          :aria-label="t('Vælg valuta')"
          @update:value="(v) => setHint('currency', v)"
        >
          <a-radio-button
            v-for="o in CURRENCY_LIST"
            :key="o.value"
            :value="o.value"
          >
            {{ o.value }}
          </a-radio-button>
        </a-radio-group>
      </div>

      <!-- Enhed: filen foreslår, hvis den kan se den; kunden kan altid ændre den -->
      <div class="bc-q">
        <div class="bc-label">
          {{ t('Er tallene i hele kroner, tusinde kroner eller millioner?') }}
          <span class="bc-hint">{{ t('Fx 1.250 betyder 1,25 mio. kr., hvis tallene er i tusinde kroner.') }}</span>
        </div>
        <a-radio-group
          :value="unit"
          :aria-label="t('Er tallene i hele kroner, tusinde kroner eller millioner?')"
          @update:value="(v) => setHint('unit', v)"
        >
          <a-radio-button
            v-for="o in UNITS"
            :key="o.value"
            :value="o.value"
          >
            {{ t(o.label) }}
          </a-radio-button>
        </a-radio-group>
      </div>

      <a-alert
        v-if="coverageWarning"
        class="bc-q"
        type="warning"
        :message="coverageWarning"
      />
    </template>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

.bc {
  margin-top: 16px;
  padding: 24px;
  background: @component-background;
  border: 1px solid @border-color-split;
  border-radius: @border-radius-base;
}

.bc-title {
  margin: 0 0 8px;
}

.bc-read {
  margin-bottom: 8px;
}

.bc-spin {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Hvert spørgsmål har luft over sig; svarene står under teksten */
.bc-q {
  margin-top: 24px;
}

.bc-label {
  margin-bottom: 8px;
}

.bc-hint {
  color: @text-color-secondary;
}

/* Valutaerne står som knapper, der bryder over flere linjer */
.bc-currency {
  display: block;
  margin-top: 8px;
}
</style>
