<script setup>
/* Regnskab på fanen Virksomheden (financials.jsx: AnnualReportSection, F:1449-2070): overskrift
   med "Vis/Skjul detaljer", værktøjslinjen (enhed, tomme rækker, budget ind og ud), advarslen om
   kontomappingen, beskeden efter en budgetimport, grafen (FinChart), tabellen med kilderne
   (FinAnnualTable, FinSourcesFooter) og folden "Sådan er tallene beregnet".
   Tal er i DKK mio. i data; enheden skalerer først ved visning. Foldes kvartalerne ud, bliver
   tabellen til 14 kolonner og bryder ud i fuld bredde af indholdsområdet.
   Props: unit ('thousand' | 'mio')   Emits: update:unit */
import { computed, ref, shallowRef } from 'vue'
import { CloseOutlined, RightOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { finBuildCols, finColGroups, finMakeFmt, finTableRows } from '@/domain/financials/finColumns'
import { finExportBudget, finImportBudget } from '@/domain/financials/finBudgetExcel'
import { finFill } from '@/domain/financials/finFormat'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import { useFinModel } from '../composables/useFinModel'
import FinSection from '../sections/FinSection.vue'
import FinTableToolbar from './FinTableToolbar.vue'
import FinChart from './FinChart.vue'
import FinAnnualTable from './FinAnnualTable.vue'
import FinSourcesFooter from './FinSourcesFooter.vue'

const props = defineProps({
  unit: { type: String, default: 'thousand' },
})
const emit = defineEmits(['update:unit'])

// Kvartalerne er detaljen bag 2026E og 2027B og er foldet sammen som udgangspunkt.
const showQuarters = ref(false)
// Detaljer foldes ud pr. række eller for alle; poster uden tal vises pr. gruppe
const openRows = shallowRef({})
const allOpen = ref(false)
const hideEmpty = ref(false)
const importMsg = ref(null) // { text, err? }

const { edits, model, notes, locked, data, hasBudget, months, hasForecast, mapping } = useFinModel()

const cols = computed(() => finBuildCols(showQuarters.value, { hasBudget: hasBudget.value, months: months.value }))
const bands = computed(() => finColGroups(cols.value))
const rows = computed(() => finTableRows(model.value, cols.value, { unit: props.unit, showEmpty: !hideEmpty.value, allOpen: allOpen.value, openRows: openRows.value }))
const fmt = computed(() => finMakeFmt(props.unit))

// Udfold/fold sammen sidder i tabelhovedet, over de kolonner den ændrer
const toggleQuarters = (open) => {
  showQuarters.value = open
  CW.focusSoon('[data-fin-toggle="' + (open ? 'collapse' : 'expand') + '"]')
}
const toggleAll = () => { allOpen.value = !allOpen.value; openRows.value = {} }
const toggleRow = (key, open) => { openRows.value = { ...openRows.value, [key]: open } }

// Kontomappingen: advarslen, når saldobalancen ikke kunne hentes, eller konti ikke er mappet
const mapNote = computed(() => {
  const { unmapped, status } = mapping.value
  if (!(unmapped.length > 0 || status === 'error')) return null
  return status === 'error'
    ? t('Kundens saldobalance fra e-conomic kunne ikke hentes. De realiserede kvartaler står efter periodetallene.')
    : finFill(unmapped.length === 1 ? t('1 konto fra e-conomic er ikke mappet, så beløbet mangler i de realiserede kvartaler.') : t('{n} konti fra e-conomic er ikke mappet, så beløbene mangler i de realiserede kvartaler.'), { n: unmapped.length })
})
const openMapper = () => { try { window.dispatchEvent(new CustomEvent('cw-open-mapper')) } catch (e) {} CW.focusSoon('#fin-mapper-title') }

// Excel: budgetkvartalerne ud og ind. Importerede tal bliver rettelser.
const exportBudget = () => finExportBudget(props.unit, model.value, edits.value)
const importBudget = (file) => finImportBudget(file, props.unit, (m) => { importMsg.value = m }, (v) => { showQuarters.value = v })
// Filvælgeren åbnes af "Importér budget" i værktøjslinjen og i grafen. ant-design-vue's a-upload
// (3.2.13) giver et ekstra tabulatorstop uden synligt fokus og reagerer ikke på mellemrum, så
// knappen åbner et skjult filfelt som før migrationen; filen læses i browseren og sendes ikke.
const fileInput = ref(null)
const openPicker = () => { if (fileInput.value) fileInput.value.click() }
const onFile = (e) => { const f = e.target.files && e.target.files[0]; importBudget(f); e.target.value = '' }

// Forklaringen på 2026E, 2027B og nøgletallene står ét sted, i en fold. Mellemrum på
// overskriften folder ud og sammen som Enter (a-collapse reagerer kun på Enter).
const howtoKeys = ref([])
const onFoldKeydown = useCollapseKeyboard()
</script>

<template>
  <FinSection
    :title="t('Regnskab')"
    :sub="locked ? t('Årsrapporter fra CVR, kundens bogføring for 2026 fra e-conomic via kontomappingen og budget.') : t('Årsrapporter fra CVR, kundens bogføring for 2026 fra e-conomic via kontomappingen og budget. Klik på et tal for at rette det.')"
  >
    <template #badge>
      <a-button
        type="text"
        :aria-pressed="allOpen"
        aria-controls="fin-annual-table"
        @click="toggleAll"
      >
        <template #icon>
          <RightOutlined
            :rotate="allOpen ? 90 : 0"
            aria-hidden="true"
          />
        </template>
        {{ allOpen ? t('Skjul detaljer') : t('Vis detaljer') }}
      </a-button>
    </template>

    <!-- Sammenfoldet er tabellen seks kolonner og holder sig inden for siden. Foldes kvartalerne
         ud, bliver den til 14 kolonner og bryder ud i fuld bredde af indholdsområdet. Er der
         stadig ikke plads, scroller den vandret med rækkenavnene klæbet fast i venstre side. -->
    <div :class="['fin-body', { 'fin-wide': showQuarters }]">
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls"
        hidden
        aria-hidden="true"
        tabindex="-1"
        @change="onFile"
      >
      <FinTableToolbar
        :unit="unit"
        :hide-empty="hideEmpty"
        :locked="locked"
        @update:unit="(v) => emit('update:unit', v)"
        @update:hide-empty="(v) => { hideEmpty = v }"
        @import="openPicker"
        @export="exportBudget"
      />
      <div
        v-if="mapNote"
        role="status"
        class="fin-line"
      >
        <a-typography-text type="warning">
          <WarningOutlined aria-hidden="true" />
        </a-typography-text>
        <a-typography-text>{{ mapNote }}</a-typography-text>
        <a-button
          v-if="mapping.status !== 'error'"
          type="link"
          size="small"
          @click="openMapper"
        >
          {{ t('Åbn kontomapping') }}
        </a-button>
      </div>
      <div
        v-if="importMsg"
        role="status"
        class="fin-line"
      >
        <a-typography-text :type="importMsg.err ? 'danger' : 'secondary'">
          {{ importMsg.text }}
        </a-typography-text>
        <a-button
          type="text"
          size="small"
          :aria-label="t('Luk')"
          :title="t('Luk')"
          @click="importMsg = null"
        >
          <template #icon>
            <CloseOutlined aria-hidden="true" />
          </template>
        </a-button>
      </div>
      <!-- Grafen i sit eget kort over tabellen -->
      <FinChart
        :model="model"
        :unit="unit"
        :fmt="fmt"
        :data="data"
        :locked="locked"
        :quarters="showQuarters"
        @import="openPicker"
      />
      <a-card
        :bordered="false"
        :body-style="{ padding: 0 }"
      >
        <FinAnnualTable
          :cols="cols"
          :bands="bands"
          :rows="rows"
          :model="model"
          :edits="edits"
          :notes="notes"
          :locked="locked"
          :unit="unit"
          :show-quarters="showQuarters"
          :has-forecast="hasForecast"
          @toggle-quarters="toggleQuarters"
          @toggle-row="toggleRow"
        >
          <template #footer>
            <FinSourcesFooter />
          </template>
        </FinAnnualTable>
      </a-card>
    </div>

    <div
      class="fin-howto"
      @keydown="onFoldKeydown"
    >
      <a-collapse
        id="fin-annual-howto"
        v-model:active-key="howtoKeys"
        ghost
        :expand-icon="collapseExpandIcon"
      >
        <a-collapse-panel
          key="howto"
          :header="t('Sådan er tallene beregnet')"
        >
          <a-typography-paragraph
            type="secondary"
            class="fin-howto-text"
          >
            {{ t('2026E: januar-august realiseret plus budget for september og Q4, balanceposter ultimo Q4 2026. Tredje kvartal er ikke afsluttet; kolonnen Jul-aug dækker kun juli og august, og balancen er pr. 31. august. 2027B: budget for Q1-Q3, altså kun 9 måneder, balanceposter ultimo Q3 2027. Nøgletal er beregnet af tallene i samme kolonne; hvor perioden er kortere end et år, er EBITDA annualiseret i Gæld / EBITDA. Realiserede tal og budget er virksomhedens egne indberetninger og er ikke revideret.') + ' ' + t('Egenkapital: primo plus årets resultat plus kapitalindskud. 2024: 3,5 + 0,7 + 0,6 = 4,8 mio. (årsrapport 2024, note 11).') }}
          </a-typography-paragraph>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </FinSection>
</template>

<style scoped>
.fin-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Kvartalerne foldet ud: tabellen (med værktøjslinje og graf) bryder ud i fuld bredde af
   indholdsområdet (sidebjælken og sidens margener fratrukket), centreret om siden */
.fin-body.fin-wide {
  position: relative;
  left: 50%;
  width: min(1280px, calc(100vw - 290px));
  min-width: 100%;
  transform: translateX(-50%);
}

/* Advarslen om kontomappingen og beskeden efter en import: én stille linje */
.fin-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.fin-howto-text { max-width: 820px; }
</style>
