<script setup>
/* Regnskab på fanen Virksomheden (Regnskab v5, designet "Graph redesign without takt v5"):
   overskriften med "Sammenlign periodetal med samme periode sidste år" og "Vis/Skjul detaljer",
   demoknapperne ved tabellen (FinTableDemo), værktøjslinjen (enhed, tomme rækker, budget ind og
   ud), advarslen om kontomappingen (ERP), beskeden efter en budgetimport, grafen (FinChart),
   tabellen med kilderne (FinAnnualTable, FinSourcesFooter) og folden "Sådan er tallene beregnet".
   Kolonnerne følger kundens kilder (finSources.js): offentlige eller interne årsrapporter,
   periodetal fra ERP, en uploadet saldobalance eller ingen, og budget eller intet. Demoknapperne
   ved tabellen viser andre kilder uden at ændre sagen.
   Tal er i DKK mio. i data; enheden skalerer først ved visning. Med mange kolonner (f.eks. månederne
   foldet ud) bryder graf og tabel ud i fuld bredde af indholdsområdet.
   Props: unit ('thousand' | 'mio')   Emits: update:unit */
import { computed, ref, shallowRef } from 'vue'
import { CloseOutlined, WarningOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { finMakeFmt } from '@/domain/financials/finColumns'
import { finApplyEdits } from '@/domain/financials/finEdits'
import { finImportBudget } from '@/domain/financials/finBudgetExcel'
import { finFill } from '@/domain/financials/finFormat'
import { finAskCustomer } from '@/domain/financials/finChartModel'
import { finApplySourceOverride, finStorePeriod } from '@/domain/financials/finSources'
import { finActiveEdits, finAddVersion, finNewVersionId } from '@/domain/financials/finVersions'
import { finDemoDataset, finRealDataset } from '@/domain/financials/finDatasets'
import { finRegnskabColumns, finRegnskabRows } from '@/domain/financials/finRegnskab'
import { finTFromKey, finTKey } from '@/domain/financials/finTimeline'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import { go } from '@/composables/useNavigation'
import { useFinModel } from '../composables/useFinModel'
import { useFinDemoView } from '../composables/useFinDemoView'
import { useScrollSync } from '../composables/useScrollSync'
import FinSection from '../sections/FinSection.vue'
import FinTableToolbar from './FinTableToolbar.vue'
import FinBudgetVersion from './FinBudgetVersion.vue'
import FinTableDemo from './FinTableDemo.vue'
import FinChart from './FinChart.vue'
import FinAnnualTable from './FinAnnualTable.vue'
import FinSourcesFooter from './FinSourcesFooter.vue'

const props = defineProps({
  unit: { type: String, default: 'thousand' },
})
const emit = defineEmits(['update:unit'])

// Detaljer foldes ud pr. række eller for alle; poster uden tal vises pr. gruppe
const openRows = shallowRef({})
const allOpen = ref(false)
const hideEmpty = ref(false)
const importMsg = ref(null) // { text, err? }
// Designets visning: sammenligning med samme periode sidste år, månederne (ERP) og nøgletallene
const compare = ref(false)
const monthsOpen = ref(false)
// Nøgletal står altid i tabellen (ingen Vis/Skjul)
const showRatios = true

const { edits, notes, locked, sources, period, mapping } = useFinModel()
const demo = useFinDemoView()
const sync = useScrollSync()

// Kilderne i visningen: sagens egne, eller demoknappernes ved tabellen
const src = computed(() => finApplySourceOverride(sources.value, demo.override.value))
// Årene med kun den offentlige årsrapport (finMaskedPost)
const mask = computed(() => ({ years: src.value.internal.map(x => !x) }))
// Rådgiverens budgetversion tæller ikke, når kundens budget er valgt (finVersions.js)
const model = computed(() => finApplyEdits(finActiveEdits(edits.value), mask.value))
const ds = computed(() => (src.value.edge ? finDemoDataset(src.value.edge, model.value) : finRealDataset(model.value, src.value)))
// "Bogført til og med": rådgiverens gemte valg, eller i demovisningen et valg, der ikke gemmes
const chosenTo = computed(() => (src.value.demo ? demo.to.value : period.value ? finTFromKey(period.value.to) : null))
const view = computed(() => finRegnskabColumns({ model: model.value, src: src.value, ds: ds.value,
  ui: { compare: compare.value, months: monthsOpen.value, to: chosenTo.value } }))
// Tal kan rettes, når sagen ikke er indstillet, og visningen er sagens egne data
const editable = computed(() => !locked.value && !src.value.demo)
const rows = computed(() => finRegnskabRows({ model: model.value, mask: mask.value, view: view.value, unit: props.unit,
  showEmpty: !hideEmpty.value, allOpen: allOpen.value, openRows: openRows.value, showRatios, editable: editable.value }))
const fmt = computed(() => finMakeFmt(props.unit))
const chartCtx = computed(() => ({ model: model.value, mask: mask.value }))
// Flere kolonner end år, periode og to budgetår (sammenligning, måneder, foreløbigt år): graf og
// tabel bryder ud i fuld bredde af indholdsområdet
const wide = computed(() => view.value.cols.length > 6)

const toggleRow = (key, open) => { openRows.value = { ...openRows.value, [key]: open } }
const toggleMonths = () => {
  monthsOpen.value = !monthsOpen.value
  CW.focusSoon('[data-fin-toggle="months"]')
}
// Rådgiveren vælger, hvilken måned regnskabet er bogført til og med (gemmes og logges); i
// demovisningen ændres kun visningen
function setPeriod (m) {
  const p = view.value.period
  const label = (x) => {
    for (const g of p.groups) { const it = g.items.find(i => i.t === x); if (it) return it.label }
    return finTKey(x)
  }
  if (src.value.demo) { demo.to.value = m; return }
  finStorePeriod(m === p.est ? null : finTKey(m), label(p.selected), label(m))
}
// Demoknapperne ved tabellen. Visningen begynder med sagens valgte "bogført til"; et skift af
// periodetallenes kilde eller af kanttilfælde giver en ny tidslinje, så valget glemmes.
function setOverride (ov) {
  const was = demo.override.value
  const from = was || { period: sources.value.period, edge: null }
  const keep = !!ov && ov.period === from.period && JSON.stringify(ov.edge || null) === JSON.stringify(from.edge || null)
  const to = !keep ? null : was ? demo.to.value : chosenTo.value
  demo.override.value = ov
  demo.to.value = to
}
const ask = (itemId) => finAskCustomer(itemId, go)

// Kontomappingen (kun ERP): advarslen, når saldobalancen ikke kunne hentes, eller konti ikke er mappet
const mapNote = computed(() => {
  if (src.value.period !== 'erp' || src.value.edge) return null
  const { unmapped, status } = mapping.value
  if (!(unmapped.length > 0 || status === 'error')) return null
  return status === 'error'
    ? t('Kundens saldobalance fra e-conomic kunne ikke hentes. Periodetallene står efter de seneste periodetal.')
    : finFill(unmapped.length === 1 ? t('1 konto fra e-conomic er ikke mappet, så beløbet mangler i periodetallene.') : t('{n} konti fra e-conomic er ikke mappet, så beløbene mangler i periodetallene.'), { n: unmapped.length })
})
const openMapper = () => { try { window.dispatchEvent(new CustomEvent('cw-open-mapper')) } catch (e) {} CW.focusSoon('#fin-mapper-title') }

// Excel: budgettets hele år ind (rådgiverens version). Importerede tal bliver rettelser.
/* Rådgiverens budget (9. oktober): importen bliver en version af punktet Budget (finVersions.js), som
   kunden ikke ser, før rådgiveren deler den. Har kunden sendt et budget, bygger versionen på det. Er
   budgettet bedt om, men ikke sendt, kan rådgiveren lukke anmodningen, så kunden ikke længere har det
   som opgave. */
const importBudget = (file) => {
  const id = finNewVersionId()
  const s = sources.value
  const item = CW.itemState('m-budget')
  const basis = s.customerBudget && item && item.files && item.files[0] ? item.files[0].name : null
  finImportBudget(file, props.unit, (m) => { importMsg.value = m }, {
    versionId: id,
    onSaved: (n) => {
      finAddVersion('m-budget', id, file, n, basis)
      const now = sources.value
      if (!now.customerBudget && now.requested && now.requested.budget && !CW.customerLock()) {
        CW.confirm({
          title: t('Luk anmodningen om budget?'),
          text: t('Kunden er bedt om et budget. Lukker du anmodningen, er din version budgettet, og kunden har det ikke længere som opgave. Lader du den stå åben, bruger Regnskab din version, indtil kunden sender sit.'),
          confirmLabel: t('Luk anmodningen'),
          cancelLabel: t('Lad den stå åben'),
        }).then((r) => { if (r && r.ok) CW.withdrawItem('m-budget', t('Rådgiveren har selv lavet budgettet')) })
      }
    },
  })
}
// Filvælgeren åbnes af "Importér budget" i værktøjslinjen. ant-design-vue's a-upload (3.2.13) giver
// et ekstra tabulatorstop uden synligt fokus og reagerer ikke på mellemrum, så knappen åbner et
// skjult filfelt som før migrationen; filen læses i browseren og sendes ikke.
const fileInput = ref(null)
const openPicker = () => { if (fileInput.value) fileInput.value.click() }
/* Upload periodetal (grafens boks, 9. oktober): rådgiveren lægger en saldobalance eller periodetal, som
   rådgiveren har fået, på punktet Periodetal (som rådgiverens fil). Regnskab læser den som en uploadet saldobalance. */
const periodInput = ref(null)
const openPeriodPicker = () => { if (periodInput.value) periodInput.value.click() }
const onPeriodFile = (e) => {
  const f = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!f) return
  const metas = CW.putFiles([f], { by: 'rådgiver', itemId: 'm-interim' })
  if (metas.length && CW.markReceived('m-interim', { by: 'rådgiver', files: metas, note: '' }) !== false) {
    CW.toast(finFill(t('{fil} er lagt på Periodetal'), { fil: f.name }))
  }
}
const onFile = (e) => { const f = e.target.files && e.target.files[0]; importBudget(f); e.target.value = '' }

// Forklaringen på kolonnerne og nøgletallene står ét sted, i en fold. Mellemrum på overskriften
// folder ud og sammen som Enter (a-collapse reagerer kun på Enter).
const howtoKeys = ref([])
const uploadKeys = ref([])
const onFoldKeydown = useCollapseKeyboard()
</script>

<template>
  <FinSection
    :title="t('Regnskab')"
    :sub="locked ? t('Årsrapporter, kundens periodetal og budget.') : t('Årsrapporter, kundens periodetal og budget. Klik på et tal for at rette det.')"
  >
    <div :class="['fin-body', { 'fin-wide': wide }]">
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls"
        hidden
        aria-hidden="true"
        tabindex="-1"
        @change="onFile"
      >
      <input
        ref="periodInput"
        type="file"
        accept=".pdf,.xlsx,.xls,.csv"
        hidden
        aria-hidden="true"
        tabindex="-1"
        @change="onPeriodFile"
      >
      <FinTableDemo
        :real="sources"
        :override="demo.override.value"
        @change="setOverride"
      />
      <!-- Værktøjslinjen: enhed og tomme rækker til venstre; demoknappen og "Sammenlign" til højre -->
      <FinTableToolbar
        :unit="unit"
        :hide-empty="hideEmpty"
        @update:unit="(v) => emit('update:unit', v)"
        @update:hide-empty="(v) => { hideEmpty = v }"
      >
        <div class="fin-head-actions">
          <span id="fin-demo-slot" />
          <a-tooltip :title="view.hasData ? undefined : t('Kræver periodetal')">
            <span class="fin-compare">
              <a-switch
                id="fin-compare"
                size="small"
                :checked="compare && view.hasData"
                :disabled="!view.hasData"
                aria-labelledby="fin-compare-label"
                :aria-describedby="view.hasData ? undefined : 'fin-compare-why'"
                @change="(v) => { compare = v }"
              />
              <label
                id="fin-compare-label"
                for="fin-compare"
              >{{ t('Sammenlign periodetal med samme periode sidste år') }}</label>
              <span
                v-if="!view.hasData"
                id="fin-compare-why"
                class="sr-only"
              >{{ t('Kræver periodetal') }}</span>
            </span>
          </a-tooltip>
        </div>
      </FinTableToolbar>
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
          class="cw-link"
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
      <!-- Grafen i sit eget kort over tabellen; samme kolonner som tabellen -->
      <FinChart
        :ctx="chartCtx"
        :view="view"
        :unit="unit"
        :fmt="fmt"
        :scroll-sync="sync"
        :demo="src.demo"
        :locked="locked"
        @ask="ask"
        @import="openPicker"
        @upload-period="openPeriodPicker"
      />
      <a-card
        :bordered="false"
        :body-style="{ padding: 0 }"
      >
        <FinAnnualTable
          :view="view"
          :rows="rows"
          :model="model"
          :mask="mask"
          :edits="edits"
          :notes="notes"
          :locked="!editable"
          :case-locked="locked"
          :unit="unit"
          :months-open="monthsOpen"
          :show-ratios="showRatios"
          :scroll-sync="sync"
          @toggle-row="toggleRow"
          @toggle-months="toggleMonths"
          @set-period="setPeriod"
          @ask="ask"
        >
          <template #footer>
            <FinSourcesFooter :src="src" />
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
            {{ t('Årsrapporter: de tre seneste regnskabsår. Den offentlige årsrapport viser kun bruttofortjenesten for små virksomheder, så omsætning, vareforbrug og andre eksterne omkostninger kommer fra kundens interne årsrapport (læst af AI); uden den står de tomme, og omsætningen kan tastes ind. Periodetal: fra regnskabsårets start til og med den måned, regnskabet er bogført til. Fra ERP mappes kontiene af Crediwires mapper uden AI, måneden kan vælges, og perioden kan foldes ud måned for måned; en uploadet saldobalance er læst af AI og viser filens egen periode. Budget: kundens budget for hele regnskabsår, læst og mappet af AI; "% nået" er periodetallet i forhold til budgetåret. Sammenligningen viser de samme måneder året før. Nøgletal er beregnet af tallene i samme kolonne; hvor perioden er kortere end et år, er EBITDA annualiseret i Gæld / EBITDA. Periodetal og budget er virksomhedens egne tal og er ikke revideret.') + ' ' + t('Egenkapital: primo plus årets resultat plus kapitalindskud. 2024: 3,5 + 0,7 + 0,6 = 4,8 mio. (årsrapport 2024, note 11).') }}
          </a-typography-paragraph>
        </a-collapse-panel>
      </a-collapse>
      <!-- Budgetterne (valg, omdøbning, deling, hent) og upload af et nyt budget, gemt lidt væk under forklaringen. Ikke i demovisningen -->
      <a-collapse
        v-if="!src.demo"
        id="fin-annual-upload"
        v-model:active-key="uploadKeys"
        ghost
        :expand-icon="collapseExpandIcon"
      >
        <a-collapse-panel
          key="upload"
          :header="t('Upload et andet budget')"
        >
          <FinBudgetVersion
            :src="sources"
            :locked="locked"
          />
          <template v-if="!locked">
            <a-typography-paragraph type="secondary">
              {{ t('Vælg en Excel-fil med budgettet. Den gemmes som en ny version, og du vælger selv, hvilken version Regnskab bruger.') }}
            </a-typography-paragraph>
            <a-button
              size="small"
              @click="openPicker"
            >
              {{ t('Upload et budget') }}
            </a-button>
          </template>
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

/* Mange kolonner: graf og tabel (med værktøjslinje og demo) bryder ud i fuld bredde af
   indholdsområdet (sidebjælken og sidens margener fratrukket), centreret om siden */
.fin-body.fin-wide {
  position: relative;
  left: 50%;
  width: min(1280px, calc(100vw - 290px));
  min-width: 100%;
  transform: translateX(-50%);
}

.fin-head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.fin-compare {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.fin-compare label { cursor: pointer; }

/* Advarslen om kontomappingen og beskeden efter en import: én stille linje */
.fin-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.fin-howto-text { max-width: 820px; }
</style>
