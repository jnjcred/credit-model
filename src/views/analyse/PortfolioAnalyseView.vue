<script setup>
// Porteføljeanalyse: find kunder på tværs af porteføljen ud fra finansielle kriterier.
// Skabeloner, kriterier, søgning, sortering og talformat står i src/domain/analyse.js.
// Skærmen: tre vælgere (skabelon, afdeling, branche), de aktive kriterier som grå chips,
// "Egne kriterier" (a-collapse) til at rette kriterierne og tabellen med kunderne.
import { computed, ref, shallowRef, watch } from 'vue'
import { Empty } from 'ant-design-vue'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { lang, t } from '@/i18n'
import { DATA } from '@/domain/data'
import {
  ANALYSE_CASES, ANALYSE_VIEW, METRICS, TEMPLATE_GROUPS, TEMPLATES,
  analyseRows, branches, chipText, depts, fmt, makeCrit, metaFor, openAnalyseRow, pct, pctSign, runQuery, tplCriteria,
} from '@/domain/analyse'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import { go } from '@/composables/useNavigation'
import AppTopbar from '@/components/shell/AppTopbar.vue'

const caseVersion = useCaseVersion() // nye sager og omfordelinger slår straks igennem
// Valgt skabelon, afdeling og branche huskes, når man går til en sag og tilbage
const saved = DATA.viewGet(ANALYSE_VIEW) || {}
const savedTpl = saved.template ? TEMPLATES.find(x => x.label === saved.template) : null
const dept = ref(saved.dept || 'alle')
const branche = ref(saved.branche || 'alle')
const criteria = shallowRef(savedTpl ? tplCriteria(savedTpl) : [])
const activeTemplate = ref(savedTpl ? savedTpl.label : null)
const sortCol = ref(saved.sortCol || 'rev12')
const sortDir = ref(saved.sortDir || 'desc')
// "Egne kriterier" er foldet sammen fra start; åben er chipsene skjult
const foldKeys = ref([])
const advOpen = computed(() => foldKeys.value.includes('criteria'))
// Mellemrum på overskriften folder ud og sammen som Enter, som på knappen før migrationen
// (a-collapse reagerer kun på Enter)
const onFoldKeydown = useCollapseKeyboard()

// Gem først, når visningen ændres (ikke ved indlæsning), så en ren demo forbliver ren
watch([activeTemplate, dept, branche, sortCol, sortDir], () => {
  DATA.viewSet(ANALYSE_VIEW, { template: activeTemplate.value, dept: dept.value, branche: branche.value, sortCol: sortCol.value, sortDir: sortDir.value })
})

// Søgningen er lokal og hurtig, så resultatet regnes med det samme (ingen falsk ventetid)
const results = computed(() => runQuery(dept.value, branche.value, criteria.value))
// Sag og ansvarlig kommer fra sagsmodellen, så rækkerne følger nye sager og omfordelinger
const sorted = computed(() => {
  caseVersion.value
  return analyseRows(results.value, sortCol.value, sortDir.value)
})

// Ny kolonne sorteres faldende; samme kolonne igen skifter retning
function onSort (col) {
  sortDir.value = col === sortCol.value && sortDir.value === 'desc' ? 'asc' : 'desc'
  sortCol.value = col
}

// Retter man i kriterierne, er det ikke længere skabelonen, men egne kriterier
const edit = (fn) => { criteria.value = fn(criteria.value); activeTemplate.value = null }
const update = (id, updated) => edit(prev => prev.map(c => c.id === id ? updated : c))
const remove = (id) => edit(prev => prev.filter(c => c.id !== id))
const add = () => edit(prev => [...prev, makeCrit('revPct')])
const setJoin = (id, val) => edit(prev => prev.map(c => c.id === id ? { ...c, joinNext: val } : c))
// Skift af nøgletal nulstiller minimumsbeløbet (det hører til nøgletallet)
const setMetric = (c, metric) => update(c.id, { ...c, metric, unit: metaFor(metric).unit, minAmt: '' })
// Et tømt talfelt er "" som før migrationen (a-input-number giver null)
const setNum = (c, field, v) => update(c.id, { ...c, [field]: v == null ? '' : v })

function reset () {
  dept.value = 'alle'
  branche.value = 'alle'
  criteria.value = []
  activeTemplate.value = null
}
function pickTemplate (v) {
  if (v === 'none') { activeTemplate.value = null; criteria.value = []; return }
  const tpl = TEMPLATES.find(x => x.label === v)
  if (tpl) { criteria.value = tplCriteria(tpl); activeTemplate.value = tpl.label }
}

const own = computed(() => !activeTemplate.value && criteria.value.length > 0)
const tplValue = computed(() => activeTemplate.value || (own.value ? 'custom' : 'none'))
// Skabelonernes grupper i den rækkefølge, de første gang optræder
const tplGroups = [...new Set(TEMPLATES.map(x => x.group))]
const anyFilter = computed(() => dept.value !== 'alle' || branche.value !== 'alle' || criteria.value.length > 0)

const OPS = [{ value: '>', label: '>' }, { value: '<', label: '<' }]
// Komma og punktum er begge decimaltegn (2,5 = 2.5), som i browserens talfelt før migrationen
const parseNumber = (text) => String(text).replace(',', '.')

/* ── Tabellen ─────────────────────────────────────────────────────────────── */

// Kolonnerne: nøgle (= sortering), overskrift og forklaring (title). Overskriften kan
// fokuseres og sorteres med Enter/mellemrum og fortæller sorteringen med aria-sort.
const COLS = [
  { col: 'name', label: t('Kunde'), help: t('Virksomhedens navn og CVR') },
  { col: 'caseNr', label: t('Sag'), help: t('Kundens åbne sag. Klik på kunden for at åbne den.') },
  { col: 'owner', label: t('Ansvarlig'), help: t('Rådgiveren, der ejer sagen') },
  { col: 'dept', label: t('Afdeling'), help: t('Ansvarlig afdeling') },
  { col: 'branche', label: t('Branche'), help: t('Branche / sektor') },
  { col: 'rev12', label: t('Omsætning'), help: t('Omsætning seneste 12 mdr. (kr.). For Nordhavn: nettoomsætning 2025 fra årsrapporten.'), align: 'right' },
  { col: 'revPct', label: t('Oms. vækst'), help: t('Omsætningsvækst i % - seneste 12 mdr. ift. foregående 12 mdr.'), align: 'right' },
  { col: 'ebitda12', label: 'EBITDA', help: t('EBITDA seneste 12 mdr. (kr.)'), align: 'right' },
  { col: 'ebitdaPct', label: t('EBITDA-vækst'), help: t('EBITDA-ændring i % - seneste 12 mdr. ift. foregående 12 mdr.'), align: 'right' },
  { col: 'equity', label: t('Egenkapital'), help: t('Bogført egenkapital, seneste regnskab (kr.)'), align: 'right' },
  { col: 'bigCust', label: t('Største kunde'), help: t('Andel af omsætningen fra den største enkeltkunde, seneste regnskabsår (%)'), align: 'right' },
]
// Kolonnernes bredde i % af tabellen, der er mindst 980 px bred (ellers ruller den vandret).
// Hver overskrift skal kunne stå med sorteringspilene (målt med Source Sans Pro 14 px). De
// lange ord står i forskellige kolonner på dansk og engelsk ("Egenkapital", "Department"),
// så hvert sprog har sin fordeling; kunden får resten. Afdeling og branche afkortes (som før), så
// kundens navn får mest plads; et langt navn brydes over to linjer.
const WIDTH = lang === 'en'
  ? { name: 15.5, caseNr: 8.2, owner: 7.5, dept: 10.8, branche: 7.7, rev12: 8.7, revPct: 7.8, ebitda12: 8.4, ebitdaPct: 7.9, equity: 8.4, bigCust: 9.1 }
  : { name: 16.3, caseNr: 8.2, owner: 8.1, dept: 7.4, branche: 7.4, rev12: 10.5, revPct: 7.1, ebitda12: 8.4, ebitdaPct: 8.3, equity: 10.6, bigCust: 7.7 }
// Cellernes title som før: kunden med CVR, afdelingen og branchen
const CELL_TITLE = {
  name: (r) => r.name + ' (CVR ' + r.cvr + ')',
  dept: (r) => r.dept,
  branche: (r) => t(r.branche),
}

// Sorteringen styres her (domain/analyse.js); a-table viser den og melder klik i overskriften
const columns = computed(() => COLS.map(c => {
  const active = sortCol.value === c.col
  return {
    key: c.col,
    dataIndex: c.col,
    title: c.label,
    align: c.align || 'left',
    width: WIDTH[c.col] + '%',
    sorter: true,
    sortOrder: active ? (sortDir.value === 'asc' ? 'ascend' : 'descend') : null,
    customHeaderCell: () => ({
      title: c.help,
      // Navnet er kolonnens titel; ellers kom sorteringspilenes ikonnavne (caret-up caret-down) med
      'aria-label': c.label,
      tabindex: 0,
      'aria-sort': active ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : 'none',
      onKeydown: (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        onSort(c.col)
      },
    }),
    customCell: CELL_TITLE[c.col] ? (r) => ({ title: CELL_TITLE[c.col](r) }) : undefined,
  }
}))
// Klik i en kolonneoverskrift: samme regel som før (ny kolonne faldende, ellers skift retning)
function onTableChange (pagination, filters, sorter) {
  if (sorter && sorter.columnKey) onSort(sorter.columnKey)
}
// Hele rækken kan klikkes; tastaturvejen er knappen med kundens navn
const customRow = (r) => ({ onClick: () => openAnalyseRow(r, go), style: { cursor: 'pointer' } })
const nameLabel = (r) => r.name + (r.caseId ? ', ' + t('åbn sag') + ' ' + r.caseNr : ', ' + t('ingen åben sag, opret en ny sag'))
</script>

<template>
  <AppTopbar :crumbs="[t('Porteføljeanalyse')]" />
  <div class="an-page">
    <div>
      <a-typography-title>{{ t('Porteføljeanalyse') }}</a-typography-title>
      <a-typography-text type="secondary">
        {{ t('Find kunder på tværs af porteføljen ud fra finansielle kriterier') }}
      </a-typography-text>
    </div>

    <!-- Filtre: tre vælgere på én linje; Nulstil kun når noget er valgt -->
    <a-form
      layout="inline"
      class="an-filters"
    >
      <a-form-item
        :label="t('Skabelon')"
        html-for="an-template"
      >
        <a-select
          id="an-template"
          class="an-select"
          :value="tplValue"
          :dropdown-match-select-width="false"
          @change="pickTemplate"
        >
          <a-select-option value="none">
            {{ t('Ingen') }}
          </a-select-option>
          <a-select-option
            v-if="own"
            value="custom"
          >
            {{ t('Egne kriterier') }}
          </a-select-option>
          <a-select-opt-group
            v-for="g in tplGroups"
            :key="g"
            :label="t(TEMPLATE_GROUPS[g])"
          >
            <a-select-option
              v-for="x in TEMPLATES.filter(x => x.group === g)"
              :key="x.label"
              :value="x.label"
            >
              {{ t(x.label) }}
            </a-select-option>
          </a-select-opt-group>
        </a-select>
      </a-form-item>
      <a-form-item
        :label="t('Afdeling')"
        html-for="an-dept"
      >
        <a-select
          id="an-dept"
          v-model:value="dept"
          class="an-select"
          :dropdown-match-select-width="false"
        >
          <a-select-option value="alle">
            {{ t('Alle') }}
          </a-select-option>
          <a-select-option
            v-for="d in depts"
            :key="d"
            :value="d"
          >
            {{ d }}
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item
        :label="t('Branche')"
        html-for="an-branche"
      >
        <a-select
          id="an-branche"
          v-model:value="branche"
          class="an-select"
          :dropdown-match-select-width="false"
        >
          <a-select-option value="alle">
            {{ t('Alle') }}
          </a-select-option>
          <a-select-option
            v-for="b in branches"
            :key="b"
            :value="b"
          >
            {{ t(b) }}
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-button
        v-if="anyFilter"
        type="link"
        @click="reset"
      >
        {{ t('Nulstil') }}
      </a-button>
    </a-form>

    <!-- Den valgte skabelons (eller egne) kriterier som grå chips -->
    <div
      v-if="criteria.length > 0 && !advOpen"
      class="an-chips"
      role="group"
      :aria-label="t('Aktive kriterier')"
    >
      <template
        v-for="(c, i) in criteria"
        :key="c.id"
      >
        <a-tag
          closable
          @close.prevent="remove(c.id)"
        >
          {{ chipText(c) }}
          <template #closeIcon>
            <a-button
              type="text"
              size="small"
              :aria-label="t('Fjern kriterium') + ': ' + t(metaFor(c.metric).l)"
            >
              <template #icon>
                <CloseOutlined aria-hidden="true" />
              </template>
            </a-button>
          </template>
        </a-tag>
        <a-typography-text
          v-if="i < criteria.length - 1"
          type="secondary"
        >
          {{ c.joinNext === 'AND' ? t('og') : t('eller') }}
        </a-typography-text>
      </template>
    </div>

    <!-- Egne kriterier -->
    <div @keydown="onFoldKeydown">
      <a-collapse
        v-model:active-key="foldKeys"
        ghost
        :expand-icon="collapseExpandIcon"
      >
        <a-collapse-panel
          key="criteria"
          :header="t('Egne kriterier') + (criteria.length ? ' (' + criteria.length + ')' : '')"
        >
          <a-typography-paragraph
            v-if="criteria.length === 0"
            type="secondary"
          >
            {{ t('Ingen aktive kriterier. Tilføj et kriterium for at filtrere manuelt.') }}
          </a-typography-paragraph>
          <a-form
            v-else
            layout="vertical"
          >
            <template
              v-for="(c, i) in criteria"
              :key="c.id"
            >
              <!-- Etiketterne står kun over den første række; de andre rækker har skjulte
                   etiketter, så alle felter har et navn (a-select videregiver ikke aria-label) -->
              <div class="an-crit">
                <a-form-item
                  :label="i === 0 ? t('Kriterium') : undefined"
                  :html-for="'an-metric-' + c.id"
                >
                  <label
                    v-if="i > 0"
                    class="sr-only"
                    :for="'an-metric-' + c.id"
                  >{{ t('Kriterium') }}</label>
                  <a-select
                    :id="'an-metric-' + c.id"
                    class="an-metric"
                    :value="c.metric"
                    @change="(v) => setMetric(c, v)"
                  >
                    <a-select-option
                      v-for="m in METRICS"
                      :key="m.k"
                      :value="m.k"
                    >
                      {{ t(m.l) }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item :label="i === 0 ? t('Ændring') : undefined">
                  <a-input-number
                    class="an-number"
                    :value="c.val"
                    :parser="parseNumber"
                    :aria-label="t(metaFor(c.metric).l)"
                    @change="(v) => setNum(c, 'val', v)"
                  >
                    <template #addonBefore>
                      <label
                        class="sr-only"
                        :for="'an-op-' + c.id"
                      >{{ t('Ændring') }}</label>
                      <a-select
                        :id="'an-op-' + c.id"
                        :value="c.op"
                        :options="OPS"
                        @change="(v) => update(c.id, { ...c, op: v })"
                      />
                    </template>
                    <template #addonAfter>
                      {{ t(metaFor(c.metric).unit) }}
                    </template>
                  </a-input-number>
                </a-form-item>
                <a-form-item
                  v-if="metaFor(c.metric).amtField"
                  :label="i === 0 ? t('Minimumsbeløb') : undefined"
                >
                  <a-input-number
                    class="an-number"
                    :value="c.minAmt"
                    :placeholder="t('valgfri')"
                    :parser="parseNumber"
                    :aria-label="t('Minimumsbeløb')"
                    @change="(v) => setNum(c, 'minAmt', v)"
                  >
                    <template #addonBefore>
                      <label
                        class="sr-only"
                        :for="'an-minop-' + c.id"
                      >{{ t('Minimumsbeløb') }}</label>
                      <a-select
                        :id="'an-minop-' + c.id"
                        :value="c.minAmtOp"
                        :options="OPS"
                        @change="(v) => update(c.id, { ...c, minAmtOp: v })"
                      />
                    </template>
                    <template #addonAfter>
                      {{ t('kr.') }}
                    </template>
                  </a-input-number>
                </a-form-item>
                <a-form-item>
                  <a-button
                    type="link"
                    :aria-label="t('Fjern kriterium') + ': ' + t(metaFor(c.metric).l)"
                    @click="remove(c.id)"
                  >
                    {{ t('Fjern') }}
                  </a-button>
                </a-form-item>
              </div>
              <!-- og/eller mellem to kriterier: klik skifter -->
              <a-divider v-if="i < criteria.length - 1">
                <a-button
                  type="text"
                  size="small"
                  :title="t('Skift mellem og og eller')"
                  @click="setJoin(c.id, c.joinNext === 'AND' ? 'OR' : 'AND')"
                >
                  {{ c.joinNext === 'AND' ? t('og') : t('eller') }}
                </a-button>
              </a-divider>
            </template>
          </a-form>
          <a-button @click="add">
            <template #icon>
              <PlusOutlined aria-hidden="true" />
            </template>
            {{ t('Tilføj kriterium') }}
          </a-button>
        </a-collapse-panel>
      </a-collapse>
    </div>

    <!-- Resultater -->
    <a-card
      v-if="results.length === 0"
      :bordered="false"
    >
      <a-empty :image="Empty.PRESENTED_IMAGE_SIMPLE">
        <template #description>
          <a-typography-text type="secondary">
            {{ t('Ingen kunder matcher de valgte kriterier. Prøv at justere tærskelværdierne.') }}
          </a-typography-text>
        </template>
      </a-empty>
    </a-card>
    <a-card
      v-else
      :bordered="false"
      :body-style="{ padding: 0 }"
    >
      <template #title>
        <span
          role="heading"
          aria-level="2"
        >{{ t('Kunder i porteføljen') }}</span>
      </template>
      <template #extra>
        <a-typography-text
          type="secondary"
          aria-live="polite"
        >
          {{ results.length }} {{ t('af') }} {{ ANALYSE_CASES.length }}
        </a-typography-text>
      </template>
      <!-- Er siden smallere end tabellen, ruller tabellen vandret (også med tastaturet) -->
      <div
        class="an-scroll"
        role="region"
        :aria-label="t('Kunder i porteføljen')"
        tabindex="0"
      >
        <a-table
          class="an-table"
          :columns="columns"
          :data-source="sorted"
          row-key="id"
          size="middle"
          table-layout="fixed"
          :pagination="false"
          :show-sorter-tooltip="false"
          :custom-row="customRow"
          @change="onTableChange"
        >
          <template #bodyCell="{ column, record: r }">
            <div
              v-if="column.key === 'name'"
              class="an-cell"
            >
              <!-- Navnet er en knap, så rækken kan åbnes med tastaturet -->
              <a-button
                type="link"
                size="small"
                class="an-name"
                :aria-label="nameLabel(r)"
                @click.stop="openAnalyseRow(r, go)"
              >
                {{ r.name }}
              </a-button>
              <a-typography-text type="secondary">
                {{ 'CVR ' + r.cvr + (r.period ? ' · ' + t(r.period) : '') }}
              </a-typography-text>
            </div>
            <div
              v-else-if="column.key === 'caseNr'"
              class="an-cell"
            >
              <template v-if="r.caseId">
                <a-typography-text>{{ r.caseNr }}</a-typography-text>
                <a-typography-text type="secondary">
                  {{ DATA.STATUS[r.caseStatus] ? t(DATA.STATUS[r.caseStatus].label) : '' }}
                </a-typography-text>
              </template>
              <a-typography-text
                v-else
                type="secondary"
                :title="t('Klik for at oprette en sag til kunden')"
              >
                {{ t('Ingen sag') }}
              </a-typography-text>
            </div>
            <a-typography-text
              v-else-if="column.key === 'owner'"
              ellipsis
              :content="r.owner || '-'"
            />
            <a-typography-text
              v-else-if="column.key === 'dept'"
              ellipsis
              :content="r.dept"
            />
            <a-typography-text
              v-else-if="column.key === 'branche'"
              ellipsis
              :content="t(r.branche)"
            />
            <template v-else-if="column.key === 'rev12'">
              {{ fmt(r.rev12) }}
            </template>
            <!-- Kun negative tal er røde, uden fed -->
            <a-typography-text
              v-else-if="column.key === 'revPct' || column.key === 'ebitdaPct'"
              :type="r[column.key] < 0 ? 'danger' : undefined"
            >
              {{ pct(r[column.key]) }}
            </a-typography-text>
            <a-typography-text
              v-else-if="column.key === 'ebitda12' || column.key === 'equity'"
              :type="r[column.key] < 0 ? 'danger' : undefined"
            >
              {{ fmt(r[column.key]) }}
            </a-typography-text>
            <template v-else-if="column.key === 'bigCust'">
              {{ r.bigCust + pctSign() }}
            </template>
          </template>
          <template #footer>
            {{ t('Beløb i kr., seneste 12 måneder.') }}
          </template>
        </a-table>
      </div>
    </a-card>
  </div>
</template>

<style scoped>
.an-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1360px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Vælgerne bryder om på smalle skærme */
.an-filters {
  row-gap: 8px;
}

.an-select {
  width: 200px;
}

.an-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* Et kriterium: nøgletal, ændring, minimumsbeløb og Fjern på én linje */
.an-crit {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  column-gap: 8px;
}

.an-metric {
  width: 220px;
}

.an-number {
  width: 220px;
}

/* Tabellen har en mindste bredde; er der ikke plads, ruller den vandret */
.an-scroll {
  overflow-x: auto;
}

.an-table {
  min-width: 980px;
}

.an-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* Lange kundenavne, CVR-linjen og sagens status brydes over flere linjer, så det hele kan læses, som
   før (antdv's knapper er ellers én linje) */
.an-name {
  max-width: 100%;
  height: auto;
  white-space: normal;
  text-align: left;
}
</style>
