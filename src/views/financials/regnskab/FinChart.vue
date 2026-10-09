<script setup>
/* Grafen over regnskabstabellen (Regnskab v5, designet "Graph redesign without takt v5"):
   Omsætning og EBITDA som søjler i hver af tabellens kolonner (Bruttofortjeneste er taget ud af grafen), med et
   detaljefelt til venstre for den kolonne, musen eller fokus står på (standard: perioden, eller
   det seneste regnskabsår uden periodetal). ant-design-vue har ingen diagrammer, så søjlerne tegnes
   som domænekomponent; tallene, skalaen og bredderne regnes i src/domain/financials/finRegnskab.js.
   Graf og tabel deler kolonner: bredderne måles i tabellens hoved (useTableColumnGeometry), og de
   to kort ruller vandret sammen (scrollSync). Kortet, serievalget, knapperne og detaljefeltet er
   ant-design-vue.
   Farver: Omsætning i primærfarven, Bruttofortjeneste i primærfarvens lyse trin (designets lilla
   er erstattet af appens blå), EBITDA i blågrøn. Budgettet er skraveret orange og står på
   en lys orange flade som i tabellen; månederne har deres egen skala og, med sammenligningen,
   sidste års tal som omrids.
   Detaljefeltet står fast til venstre, når graf og tabel ruller vandret (som tabellens rækkenavne).
   Et negativt tal tegnes som omrids. Bruttofortjeneste har en forklaring ved serien og i feltet.
   Props: ctx ({ model, mask }), view (finRegnskabColumns), unit ('mio' | 'thousand'),
          fmt (tabellens talformat, finMakeFmt), scrollSync (useScrollSync),
          demo (demovisningen: valg af serier og Skjul graf gælder kun visningen og gemmes ikke) */
import { computed, ref, watch } from 'vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { finFill } from '@/domain/financials/finFormat'
import { finChartLoad, finChartStore, finPct1 } from '@/domain/financials/finChartModel'
import { FIN_V5_SERIES, finChartColumns, finChartPanel, finSeriesValues } from '@/domain/financials/finRegnskab'
import { useTableColumnGeometry } from '../composables/useTableColumnGeometry'

const props = defineProps({
  ctx: { type: Object, required: true },
  view: { type: Object, required: true },
  unit: { type: String, required: true },
  fmt: { type: Function, required: true },
  scrollSync: { type: Object, required: true },
  demo: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
})
const emit = defineEmits(['ask', 'import', 'upload-period'])
const store = (patch) => { if (!props.demo) finChartStore(patch) }

const hidden = ref(!!finChartLoad().hidden)
const hover = ref(null)
const userSeries = ref(finChartLoad().series || {})
const unitShort = computed(() => (props.unit === 'mio' ? t('DKK mio.') : t('DKK t.')))

// Serierne: Omsætning og EBITDA. Bruttofortjeneste er ikke en mulighed i grafen (kræver mapping af saldotallene, som
// ikke er lavet): har sagen kun de offentlige årsrapporter, viser grafen kun EBITDA. Omsætningen kan ikke vælges, når
// den ikke findes i nogen kolonne.
const SERIES = FIN_V5_SERIES.filter(s => s.k !== 'bf')
const revAny = computed(() => props.view.cols.some(c => finSeriesValues(props.ctx, c).rev != null))
const on = computed(() => ({
  rev: revAny.value && (userSeries.value.rev != null ? userSeries.value.rev : true),
  bf: false,
  eb: userSeries.value.eb != null ? userSeries.value.eb : true,
}))
/* Jesper 9. oktober: første gang sagen får periodetal (ERP eller en uploadet saldobalance), slås
   Omsætning til og Bruttofortjeneste fra. Derefter gælder rådgiverens eget valg (husket som periodSeen
   i kabul:fin-chart; "Nulstil demo" rydder det). Demovisningen gemmer intet: dér er det standardvalget ovenfor. */
watch(() => props.view.hasData && !props.demo, (has) => {
  if (!has || finChartLoad().periodSeen) return
  const next = { ...userSeries.value, rev: true, bf: false }
  userSeries.value = next
  finChartStore({ series: next, periodSeen: true })
}, { immediate: true })
const isDis = (k) => k === 'rev' && !revAny.value
const toggleSeries = (k) => {
  if (isDis(k)) return
  const next = { ...userSeries.value, [k]: !on.value[k] }
  userSeries.value = next
  store({ series: next })
}
const vis = computed(() => ['eb', 'rev'].filter(k => on.value[k])) // søjlernes rækkefølge fra venstre
const nameOf = (k) => t(FIN_V5_SERIES.find(s => s.k === k).name)
const chipTip = computed(() => t('Årsrapporterne viser ikke omsætningen. Indtast den i tabellen, eller upload en intern årsrapport.'))

const toggle = () => {
  const h = !hidden.value
  hidden.value = h
  store({ hidden: h })
  hover.value = null
  CW.focusSoon('#fin-chart-toggle')
}

// Kolonnerne efter tabellens hoved (samme bredder); før målingen et gitter med lige brede kolonner
const geom = useTableColumnGeometry(() => document.getElementById('fin-annual-table'),
  [() => props.view.cols.map(c => c.key).join(','), () => props.unit, hidden])
const template = computed(() => {
  const g = geom.value
  if (!g) return { gridTemplateColumns: '260px repeat(' + props.view.cols.length + ', minmax(84px, 1fr))' }
  return { gridTemplateColumns: [g.c1, ...props.view.cols.map(c => g.cols[c.key] || 84)].map(w => w + 'px').join(' '), width: g.width + 'px' }
})
const pad = computed(() => (geom.value ? geom.value.pad : 8))

const cols = computed(() => finChartColumns(props.ctx, props.view, vis.value, props.fmt))
const lastAnnual = computed(() => props.view.cols.filter(c => c.grp === 'ar').slice(-1)[0].key)
const selKey = computed(() => (hover.value && props.view.cols.some(c => c.key === hover.value) ? hover.value : props.view.hasData ? 'real' : lastAnnual.value))
const selCol = computed(() => props.view.cols.find(c => c.key === selKey.value))
const panel = computed(() => finChartPanel(props.ctx, props.view, selCol.value, vis.value))
const fmtV = (v) => (v == null ? '–' : props.fmt(v, {}))

/* Boksen over kolonnerne uden tal (tilbage fra grafen før v5, Jesper 9. oktober): mangler budgettet,
   og evt. også periodetallene, står en boks over de tomme kolonner med "Anmod kunden om budget",
   "Importér budget" og "Anmod kunden om periodetal". Er kunden allerede bedt om det, står det i stedet.
   I demovisningen er knapperne slået fra (de skriver i sagen). Placeres i gitteret over kolonnerne. */
const askBox = computed(() => {
  const v = props.view
  const bud = v.bands.find(b => b.grp === 'bud'), ytd = v.bands.find(b => b.grp === 'ytd')
  if (!bud || !bud.request) return null
  const noPeriod = !v.hasData
  const idx = v.cols.map((c, i) => (c.grp === 'bud' || (noPeriod && c.grp === 'ytd') ? i : -1)).filter(i => i >= 0)
  if (!idx.length) return null
  const years = v.cols.filter(c => c.grp === 'bud').map(c => c.chartLabel)
  const yrs = years.length > 1 ? years.slice(0, -1).join(', ') + ' ' + t('og') + ' ' + years[years.length - 1] : years.join('')
  return {
    style: { gridColumn: (idx[0] + 2) + ' / ' + (idx[idx.length - 1] + 3), gridRow: 1 },
    // Kolonnerne inde under boksen (ikke den første): uden skillelinjer, så det tomme område er én flade
    inner: idx.slice(1).map(i => v.cols[i].key),
    title: noPeriod ? finFill(t('Ingen periodetal og intet budget for {aar}'), { aar: yrs }) : finFill(t('Intet budget for {aar}'), { aar: yrs }),
    text: noPeriod
      ? t('Der er hverken bogføring eller budget. Bed kunden om periodetal og et budget, så I kan følge, hvor virksomheden er på vej hen.')
      : t('Bed kunden om et budget for hele regnskabsår, så I kan følge, hvor virksomheden er på vej hen, og sammenligne periodetallene med budgettet.'),
    budAsked: !!bud.asked, period: noPeriod && !!(ytd && ytd.request), perAsked: !!(ytd && ytd.asked), demo: !!bud.demo,
  }
})

// Kolonnens navn for skærmlæsere: "Jan-aug 2026: Omsætning 29.080, EBITDA 1.680 DKK t."
const colLabel = (c) => c.label + ': ' + c.bars.slice().reverse().map(b => nameOf(b.k) + ' ' + (b.label || t('ikke oplyst'))).join(', ') + ' ' + unitShort.value
</script>

<template>
  <a-button
    v-if="hidden"
    id="fin-chart-toggle"
    type="link"
    class="fin-chart-show cw-link"
    aria-expanded="false"
    @click="toggle"
  >
    {{ t('Vis graf') }}
  </a-button>
  <a-card
    v-else
    id="fin-chart"
    class="fin-chart"
    :bordered="false"
    :body-style="{ padding: 0 }"
  >
    <!-- Ingen titel: hvad grafen viser, vælges med serierne, der står på titlens plads -->
    <template #title>
      <span
        class="sr-only"
        role="heading"
        aria-level="3"
      >{{ t('Graf over regnskabet') }}</span>
      <div
        class="fin-chart-series"
        role="group"
        :aria-label="t('Serier i grafen')"
      >
        <a-tooltip
          v-for="s in SERIES"
          :key="s.k"
          :title="isDis(s.k) ? chipTip : s.tip ? t(s.tip) : undefined"
          :trigger="['hover', 'focus']"
        >
          <a-checkbox
            :checked="on[s.k]"
            :aria-disabled="isDis(s.k) ? 'true' : undefined"
            :aria-describedby="isDis(s.k) ? 'fin-chart-chiptip' : s.tip ? 'fin-chart-tip-' + s.k : undefined"
            @change="toggleSeries(s.k)"
          >
            <span class="fin-chart-series-item">
              <span
                :class="['fin-sw', s.k]"
                aria-hidden="true"
              />
              <a-typography-text :disabled="isDis(s.k)">{{ t(s.name) }}</a-typography-text>
            </span>
          </a-checkbox>
        </a-tooltip>
        <span
          v-if="!revAny"
          id="fin-chart-chiptip"
          class="sr-only"
        >{{ chipTip }}</span>
        <span
          v-for="s in SERIES.filter(x => x.tip)"
          :id="'fin-chart-tip-' + s.k"
          :key="'tip' + s.k"
          class="sr-only"
        >{{ t(s.tip) }}</span>
      </div>
    </template>
    <template #extra>
      <a-button
        id="fin-chart-toggle"
        class="cw-link"
        type="link"
        size="small"
        aria-expanded="true"
        @click="toggle"
      >
        {{ t('Skjul graf') }}
      </a-button>
    </template>

    <!-- Hover gælder søjlerne og navnene under dem: den slippes først, når musen forlader grafen -->
    <div
      :ref="(el) => scrollSync.register('chart', el)"
      class="fin-chart-scroll"
      @scroll="scrollSync.onScroll"
      @mouseleave="hover = null"
    >
      <div
        class="fin-chart-grid"
        :style="{ ...template, '--fin-chart-pad': pad + 'px' }"
      >
        <!-- Detaljefeltet -->
        <div
          class="fin-chart-side"
          :style="{ gridColumn: 1, gridRow: 1 }"
          aria-live="polite"
        >
          <a-typography-text strong>
            {{ panel.title }}
          </a-typography-text>
          <div
            v-for="s in panel.series"
            :key="s.k"
          >
            <a-statistic
              :value="fmtV(s.value)"
              :value-style="{ fontSize: '20px', lineHeight: '28px', fontWeight: 600 }"
            >
              <template #title>
                <span class="fin-chart-cap">
                  <span
                    :class="['fin-sw', s.k]"
                    aria-hidden="true"
                  />{{ t(s.name) }}
                  <a-tooltip
                    v-if="s.tip"
                    :title="t(s.tip)"
                    :trigger="['hover', 'focus']"
                  >
                    <a-typography-text
                      type="secondary"
                      class="fin-chart-info"
                      tabindex="0"
                      role="img"
                      :aria-label="t(s.tip)"
                    >
                      <InfoCircleOutlined aria-hidden="true" />
                    </a-typography-text>
                  </a-tooltip>
                </span>
              </template>
              <template #formatter>
                {{ fmtV(s.value) }}
              </template>
              <template #suffix>
                {{ unitShort }}
              </template>
            </a-statistic>
            <a-typography-text
              v-if="panel.prevLabel"
              type="secondary"
              class="fin-chart-prev"
            >
              {{ finFill(t('Sidste år {tal}'), { tal: fmtV(s.prev) }) }}
            </a-typography-text>
          </div>
          <a-descriptions
            size="small"
            :column="1"
            :colon="false"
            :content-style="{ justifyContent: 'flex-end' }"
            class="fin-chart-facts"
          >
            <a-descriptions-item>
              <template #label>
                <a-typography-text type="secondary">
                  {{ t('Kilde') }}
                </a-typography-text>
              </template>
              <a-typography-text strong>
                {{ t(panel.source) }}
              </a-typography-text>
            </a-descriptions-item>
            <a-descriptions-item
              v-for="[k, v] in panel.kpis"
              :key="k"
            >
              <template #label>
                <a-typography-text type="secondary">
                  {{ t(k) }}
                </a-typography-text>
              </template>
              <a-typography-text strong>
                {{ finPct1(v) }}
              </a-typography-text>
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- Søjlerne: en kolonne pr. kolonne i tabellen -->
        <div
          v-for="(c, ci) in cols"
          :key="c.key"
          :style="{ gridColumn: ci + 2, gridRow: 1 }"
          :class="['fin-chart-col', { on: c.key === selKey, bud: c.budget, month: c.month, 'sep-grp': c.sep === 'grp', 'sep-sub': c.sep === 'sub', covered: askBox && askBox.inner.includes(c.key) }]"
          tabindex="0"
          role="img"
          :aria-label="colLabel(c)"
          @mouseenter="hover = c.key"
          @focus="hover = c.key"
          @blur="hover = null"
        >
          <div
            v-for="b in c.bars"
            :key="b.k"
            :class="['fin-chart-bar', b.k, { neg: b.neg }]"
          >
            <span class="fin-chart-bl">{{ b.label }}</span>
            <div
              class="fin-chart-box"
              :style="{ width: b.w + 'px', height: b.box + 'px' }"
            >
              <div
                v-if="b.gh"
                class="fin-chart-ghost"
                :style="{ height: b.gh + 'px' }"
              />
              <div
                v-if="b.h"
                class="fin-chart-fill"
                :style="{ height: b.h + 'px' }"
              />
            </div>
          </div>
        </div>

        <!-- Intet budget (og evt. ingen periodetal): boks over de tomme kolonner -->
        <div
          v-if="askBox"
          class="fin-chart-ask"
          :style="askBox.style"
          role="group"
          :aria-label="askBox.title"
        >
          <a-typography-text strong>
            {{ askBox.title }}
          </a-typography-text>
          <a-typography-paragraph
            type="secondary"
            class="fin-chart-ask-text"
          >
            {{ askBox.text }}
          </a-typography-paragraph>
          <!-- Jesper 9. oktober: to primære knapper (Anmod om budget, Anmod om periodetal) og til højre
               de blå tekstlinks (Upload budget, Upload periodetal). Er punktet bedt om, står det i stedet -->
          <div class="fin-chart-ask-acts">
            <a-button
              v-if="!askBox.budAsked"
              type="primary"
              size="small"
              class="fin-chart-cta"
              :disabled="askBox.demo"
              :title="askBox.demo ? t('Anmod virker ikke i demovisningen') : undefined"
              @click="emit('ask', 'm-budget')"
            >
              {{ t('Anmod om budget') }}
            </a-button>
            <a-typography-text
              v-else
              type="secondary"
              :title="t('Kunden er bedt om budgettet. Status står på Overblik.')"
            >
              {{ t('Budget er anmodet') }}
            </a-typography-text>
            <template v-if="askBox.period">
              <a-button
                v-if="!askBox.perAsked"
                type="primary"
                size="small"
                class="fin-chart-cta"
                :disabled="askBox.demo"
                :title="askBox.demo ? t('Anmod virker ikke i demovisningen') : undefined"
                @click="emit('ask', 'm-interim')"
              >
                {{ t('Anmod om periodetal') }}
              </a-button>
              <a-typography-text
                v-else
                type="secondary"
                :title="t('Kunden er bedt om periodetallene.')"
              >
                {{ t('Periodetal er anmodet') }}
              </a-typography-text>
            </template>
            <template v-if="!locked">
              <a-button
                type="link"
                size="small"
                class="fin-chart-cta fin-chart-ask-link cw-link"
                :disabled="askBox.demo"
                :title="askBox.demo ? t('Upload virker ikke i demovisningen') : t('Rådgiverens budget: en version af punktet Budget, som kunden ikke ser, før du deler den')"
                @click="emit('import')"
              >
                {{ t('Upload budget') }}
              </a-button>
              <a-button
                v-if="askBox.period"
                type="link"
                size="small"
                class="fin-chart-cta fin-chart-ask-link cw-link"
                :disabled="askBox.demo"
                :title="askBox.demo ? t('Upload virker ikke i demovisningen') : t('En saldobalance eller periodetal, rådgiveren har fået: lægges på punktet Periodetal')"
                @click="emit('upload-period')"
              >
                {{ t('Upload periodetal') }}
              </a-button>
            </template>
          </div>
        </div>
      </div>

      <!-- Kolonnernes navne under søjlerne -->
      <div
        class="fin-chart-grid fin-chart-labels"
        :style="{ ...template, '--fin-chart-pad': pad + 'px' }"
      >
        <div class="fin-chart-side-foot" />
        <div
          v-for="c in cols"
          :key="'l' + c.key"
          :class="['fin-chart-lab', { on: c.key === selKey, bud: c.budget, month: c.month, 'sep-grp': c.sep === 'grp', 'sep-sub': c.sep === 'sub', covered: askBox && askBox.inner.includes(c.key) }]"
          aria-hidden="true"
          @mouseenter="hover = c.key"
        >
          {{ c.label }}
        </div>
      </div>
    </div>
  </a-card>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Domænetegning (antdv har ingen diagrammer). Designets lilla er appens blå: Omsætning i
   primærfarven og Bruttofortjeneste i dens lyse trin. EBITDA er blågrøn og budgettet orange;
   tallene over EBITDA-søjlerne er i det mørke blågrønne trin, så de kan læses (kontrast over 4,5:1). */
@fin-rev: @primary-color;
@fin-bf: @primary-3;
@fin-eb: #17a398;
@fin-eb-text: #0b7a70;
@fin-eb-bud: #a8e6df;
@fin-bud: #fb8f67;
@fin-bud-bg: #fdfaf7;
@fin-ease: 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);

.fin-chart-show { align-self: flex-start; padding: 0; }

.fin-chart-series {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.fin-chart-series-item,
.fin-chart-cap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

/* Farveprøver (serier og detaljefelt) */
.fin-sw {
  display: inline-block;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.fin-sw.rev { background: @fin-rev; }
.fin-sw.bf { background: @fin-bf; }
.fin-sw.eb { background: @fin-eb; }

.fin-chart-scroll {
  overflow-x: auto;
  overflow-y: hidden;
}

.fin-chart-grid {
  display: grid;
  min-width: 100%;
}

/* Detaljefeltet: første kolonne, lige så bred som tabellens rækkenavne. Står fast til venstre, når
   grafen ruller vandret, så søjlerne glider ind under det (som under tabellens rækkenavne) */
.fin-chart-side,
.fin-chart-side-foot {
  position: sticky;
  left: 0;
  z-index: 2;
  background: @component-background;
}

.fin-chart-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 16px 20px;
  border-right: 1px solid @border-color-split;
}

/* Intet budget: boks over de tomme kolonner (som "Ingen prognose" i grafen før v5). Glider ind
   under detaljefeltet, når grafen ruller vandret */
.fin-chart-ask {
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-self: start;
  gap: 10px;
  margin: 32px 12px 12px;
  padding: 20px;
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  background: @background-color-light;
}

.fin-chart-ask-text { margin-bottom: 0; }

.fin-chart-ask-acts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.fin-chart-ask-link { padding: 0; }

/* Knapper i smalle felter må bryde teksten */
.fin-chart-cta {
  height: auto;
  max-width: 100%;
  white-space: normal;
}

.fin-chart-info {
  cursor: help;
  font-size: 12px;
}

.fin-chart-prev {
  display: block;
  font-size: 12px;
}

.fin-chart-facts { padding-top: 4px; border-top: 1px solid @border-color-split; }

.fin-chart-side-foot { border-right: 1px solid @border-color-split; }

/* En kolonne med søjler: højrestillet, så den største serie står lige over tabellens tal */
.fin-chart-col {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 3px;
  min-height: 300px;
  padding: 0 var(--fin-chart-pad, 8px) 0 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
  outline: none;
  transition: background @fin-ease;
}

.fin-chart-col.month { padding-right: 6px; }
.fin-chart-col.bud,
.fin-chart-lab.bud { background: @fin-bud-bg; }
.fin-chart-col.on,
.fin-chart-lab.on { background: fade(@primary-color, 5%); }
.fin-chart-col:focus-visible { box-shadow: inset 0 0 0 2px @primary-color; }

/* Ingen lodrette streger mellem årsrapporter, periodetal og budget: kolonnerne skilles af mellemrum og af budgettets baggrund */

.fin-chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

/* De andre kolonner træder tilbage: kun søjlerne dæmpes (som i designet), tallene over dem
   beholder deres fulde farve, så de kan læses (kontrast over 4,5:1) */
.fin-chart-box {
  opacity: 0.6;
  transition: opacity @fin-ease;
}

.fin-chart-col.on .fin-chart-box { opacity: 1; }

/* Tallet over søjlen */
.fin-chart-bl {
  font-size: 11px;
  line-height: 14px;
  font-weight: 600;
  color: @heading-color;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.fin-chart-bar.eb .fin-chart-bl { font-size: 10px; color: @fin-eb-text; }
.fin-chart-col.month .fin-chart-bl { font-size: 10px; }
.fin-chart-col.month .fin-chart-bar.eb .fin-chart-bl { font-size: 9px; }

.fin-chart-box { position: relative; }

.fin-chart-fill,
.fin-chart-ghost {
  position: absolute;
  bottom: 0;
  border-radius: 3px 3px 0 0;
}

.fin-chart-fill {
  left: 0;
  right: 0;
}

/* Sidste år (sammenligningen) bag månedens søjle */
.fin-chart-ghost {
  left: -2px;
  right: -2px;
  border: 1px solid rgba(0, 0, 0, 0.3);
  border-bottom: 0;
  background: rgba(0, 0, 0, 0.03);
}

.fin-chart-bar.rev .fin-chart-fill { background: @fin-rev; }
.fin-chart-bar.bf .fin-chart-fill { background: @fin-bf; }
.fin-chart-bar.eb .fin-chart-fill { background: @fin-eb; }

/* Budget: skraveret orange; EBITDA-budgettet lys blågrøn med kant */
.fin-chart-col.bud .fin-chart-bar.rev .fin-chart-fill,
.fin-chart-col.bud .fin-chart-bar.bf .fin-chart-fill {
  border: 1px solid @fin-bud;
  border-bottom: 0;
  background: repeating-linear-gradient(135deg, @fin-bud 0 2px, @component-background 2px 6px);
}

.fin-chart-col.bud .fin-chart-bar.eb .fin-chart-fill {
  border: 1px solid @fin-eb;
  border-bottom: 0;
  background: @fin-eb-bud;
}

/* Negativt tal (f.eks. et underskud): stiplet omrids i seriens farve, også i budgettet */
.fin-chart-col .fin-chart-bar.neg .fin-chart-fill,
.fin-chart-col.bud .fin-chart-bar.neg .fin-chart-fill {
  border: 1px dashed;
  border-bottom: 0;
  background: @component-background;
}

.fin-chart-col .fin-chart-bar.neg.rev .fin-chart-fill { border-color: @fin-rev; }
.fin-chart-col .fin-chart-bar.neg.bf .fin-chart-fill { border-color: @fin-bf; }
.fin-chart-col .fin-chart-bar.neg.eb .fin-chart-fill { border-color: @fin-eb; }

/* Kolonnernes navne */
.fin-chart-lab {
  padding: 8px var(--fin-chart-pad, 8px) 10px 4px;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
  color: @text-color-secondary;
  transition: background @fin-ease;
}

.fin-chart-lab.month {
  padding-right: 6px;
  font-size: 12px;
}

.fin-chart-lab.on {
  font-weight: 700;
  color: @heading-color;
}

@media (prefers-reduced-motion: reduce) {
  .fin-chart-col,
  .fin-chart-box,
  .fin-chart-lab { transition: none; }
}
</style>
