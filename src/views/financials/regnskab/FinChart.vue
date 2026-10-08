<script setup>
/* Grafen over regnskabstabellen (fin_chart.jsx: FinChart, C:144-365): Omsætning,
   Bruttofortjeneste og EBITDA for 2023-2027 med et detaljefelt for det valgte år.
   ant-design-vue har ingen diagrammer, så søjlerne tegnes som før (domænekomponent): perioder,
   lag, skala og søjlebredder regnes i src/domain/financials/finChartModel.js, og kolonnerne
   flugter med tabellens årskolonner (useTableColumnGeometry). Kortet, serievalget, knapperne,
   tooltip og nøgletallene er ant-design-vue. Farverne er temaets: omsætning i primærfarven,
   bruttofortjeneste i primærfarvens lyse trin og EBITDA i neutral grå (se stilarket).
   Props: model (finApplyEdits), unit ('mio' | 'thousand'), fmt (tabellens talformat, finMakeFmt),
          data (finDataState: { hasBudget, months }), locked (sagen er indstillet),
          quarters (tabellens kvartaler er foldet ud: kolonnerne måles igen)
   Emits: import ("Importér budget", når der ingen prognose er: sektionen åbner filvælgeren) */
import { computed, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { finFill } from '@/domain/financials/finFormat'
import {
  FIN_PLOT_H, FIN_SERIES, finAskCustomer, finBarHeights, finBarWidths, finChartLoad, finChartModel,
  finChartScale, finChartStore, finPct1, finPer, finRest,
} from '@/domain/financials/finChartModel'
import { go } from '@/composables/useNavigation'
import { useTableColumnGeometry } from '../composables/useTableColumnGeometry'

const props = defineProps({
  model: { type: Object, required: true },
  unit: { type: String, required: true },
  fmt: { type: Function, required: true },
  data: { type: Object, required: true },
  locked: { type: Boolean, default: false },
  quarters: { type: Boolean, default: false },
})
const emit = defineEmits(['import'])

const hidden = ref(!!finChartLoad().hidden)
const hover = ref(null)
const userSeries = ref(finChartLoad().series || {})
const cm = computed(() => finChartModel(props.model, props.data))
const P = computed(() => cm.value.P)
const N = computed(() => cm.value.N)
const B = computed(() => cm.value.B)
const hasForecast = computed(() => B.value || N.value > 0)
const sel = computed(() => (hover.value != null ? hover.value : 2))
const unitShort = computed(() => (props.unit === 'mio' ? t('DKK mio.') : t('DKK t.')))

// Omsætning mangler i årsrapporterne? Alle år: Omsætning kan ikke vises.
// Nogle år: Bruttofortjeneste vises som standard ved siden af.
const annualRev = computed(() => P.value.slice(0, 3).map(q => q.g('Nettoomsætning')))
const noRevAll = computed(() => annualRev.value.every(v => v == null))
const noRevAny = computed(() => annualRev.value.some(v => v == null))
const on = computed(() => ({
  rev: !noRevAll.value && (userSeries.value.rev != null ? userSeries.value.rev : true),
  bf: userSeries.value.bf != null ? userSeries.value.bf : noRevAny.value,
  eb: userSeries.value.eb != null ? userSeries.value.eb : true,
}))
const toggleSeries = (k) => {
  if (k === 'rev' && noRevAll.value) return
  const next = { ...userSeries.value, [k]: !on.value[k] }
  userSeries.value = next
  finChartStore({ series: next })
}
const visKeys = computed(() => ['eb', 'bf', 'rev'].filter(k => on.value[k])) // søjlernes rækkefølge fra venstre
const rowOf = (k) => FIN_SERIES.find(s => s.k === k).row
const nameOf = (k) => t(FIN_SERIES.find(s => s.k === k).name)

// Titlen følger de viste serier: "Omsætning, bruttofortjeneste og EBITDA"
const title = computed(() => {
  const titleNames = FIN_SERIES.filter(s => on.value[s.k]).map((s, j) => (j === 0 || s.k === 'eb' ? t(s.name) : t(s.name).toLowerCase()))
  return titleNames.length === 0 ? t('Ingen serier valgt')
    : titleNames.length === 1 ? titleNames[0]
      : titleNames.slice(0, -1).join(', ') + ' ' + t('og') + ' ' + titleNames[titleNames.length - 1]
})

// Kolonnerne efter tabellen (årene flugter); ellers fem lige brede kolonner
// (Tabellens hoved tegnes om, når kvartalerne foldes ud og sammen, også når tabellen ikke skifter
// størrelse, fx på en smal skærm; derfor måles der også ved det.)
const geom = useTableColumnGeometry(() => document.getElementById('fin-annual-table'),
  [() => props.unit, hidden, () => props.data.hasBudget, () => props.data.months, () => props.model, () => props.quarters])
const ws = computed(() => (geom.value ? geom.value.ws : [1, 1, 1, 1, 1]))
const edges = computed(() => {
  const totW = ws.value.reduce((a, b) => a + b, 0)
  return ws.value.map((w, i) => ws.value.slice(0, i + 1).reduce((a, b) => a + b, 0) / totW)
})
const pad = computed(() => (geom.value ? geom.value.pad : 16))
const bw = computed(() => finBarWidths(visKeys.value, geom.value ? Math.min(...geom.value.ws) : 150, pad.value))
const fcLeft = computed(() => (edges.value[2] * 100) + '%')
const colTpl = computed(() => ws.value.map(w => w + 'fr').join(' '))
const gridStyle = computed(() => (geom.value ? { gridTemplateColumns: geom.value.c1 + 'px minmax(0, 1fr)', minWidth: 0, '--fin-chart-pad': pad.value + 'px' } : undefined))

const toggle = () => {
  const h = !hidden.value
  hidden.value = h
  finChartStore({ hidden: h })
  hover.value = null
  CW.focusSoon('#fin-chart-toggle')
}

// Skala: designets 0,0056 px pr. DKK t., men aldrig højere end feltet
const scale = computed(() => finChartScale(P.value, visKeys.value, cm.value.stack, rowOf))
// Søjlerne pr. periode: lagene i px og tallet over søjlen (null: ingen tal)
const bars = computed(() => P.value.map(qq => visKeys.value.map((k) => {
  const s = cm.value.stack(rowOf(k), qq)
  if (!s) return null
  return { ...finBarHeights(s, scale.value.H), label: (s.ghost ? '≈' : '') + props.fmt(s.tot, {}) }
})))

// Detaljefeltet: den valgte periode (standard 2025) for den første viste serie
const q = computed(() => P.value[sel.value])
const pk = computed(() => (on.value.rev ? 'rev' : on.value.bf ? 'bf' : on.value.eb ? 'eb' : (noRevAll.value ? 'bf' : 'rev')))
const ps = computed(() => cm.value.stack(rowOf(pk.value), q.value))
const big = computed(() => (ps.value == null ? '–' : props.fmt(q.value.showYtd ? ps.value.real : ps.value.tot, {})))
const ebS = computed(() => cm.value.stack('EBITDA', q.value))
const ebBig = computed(() => (ebS.value == null ? '–' : props.fmt(q.value.showYtd ? ebS.value.real : ebS.value.tot, {})))
const per = computed(() => finPer(N.value))
const rest = computed(() => finRest(N.value))
const facts = computed(() => {
  const qq = q.value, s = ps.value, fmt = props.fmt
  let facts
  if (qq.kind === 'annual') {
    const edited = !!(props.model.map && props.model.map['Nettoomsætning|y' + qq.idx])
    facts = [[t('Kilde'), edited ? t('Årsrapport, rettet manuelt') : t('Årsrapport')]]
    if (qq.g('Nettoomsætning') == null) facts.unshift([t('Omsætning'), t('Ikke oplyst')])
  } else if (qq.kind === 'fc26') facts = s ? [[finFill(t('Periodetal ({per})'), { per: per.value }), fmt(s.real, {})], [finFill(t('Budget ({per})'), { per: rest.value }), fmt(s.bud, {})]] : []
  else if (qq.kind === 'bud26') facts = [[t('Periodetal'), t('Ingen')], [finFill(t('Budget ({per})'), { per: t('sep-dec') }), s ? fmt(s.tot, {}) : '–']]
  else if (qq.kind === 'ytd') facts = s ? [[finFill(t('Periodetal ({per})'), { per: per.value }), fmt(s.real, {})], [t('Fremskrevet helår'), '≈ ' + fmt(s.tot, {})]] : []
  else if (qq.kind === 'b9') facts = [[t('Kilde'), t('9 mdr. budget')]]
  else facts = [[t('Kilde'), qq.year.startsWith('2027') ? t('Intet budget') : t('Ingen periodetal eller budget')]]
  return facts
})
const selMargins = computed(() => {
  const qq = q.value
  const rev = qq.g('Nettoomsætning')
  const pc = (x) => (rev == null || x == null || !rev ? '–' : finPct1(x / rev * 100))
  const pers = qq.g('Personaleomkostninger')
  return [
    [t('Dækningsgrad'), pc(qq.g('Bruttofortjeneste'))],
    [t('Løn % af omsætning'), pc(pers == null ? null : -pers)],
    [t('EBITDA-margin'), pc(qq.g('EBITDA'))],
  ]
})
const capOf = (k) => (q.value.showYtd ? finFill(t('{serie} {per} 2026'), { serie: nameOf(k), per: per.value }) : finFill(t('{serie} {aar}'), { serie: nameOf(k), aar: q.value.year }))

const ask = (id) => finAskCustomer(id, go)
const colLabel = (qq) => {
  if (qq.blank || qq.empty) return finFill(t('{aar}: ingen tal'), { aar: qq.year })
  return qq.year + ': ' + visKeys.value.slice().reverse().map(k => { const s = cm.value.stack(rowOf(k), qq); return nameOf(k) + ' ' + (s ? (s.ghost ? '≈ ' : '') + props.fmt(s.tot, {}) : t('ikke oplyst')) }).join(', ') + ' ' + unitShort.value
}
const chipTip = computed(() => t('Omsætningen er ikke oplyst i årsrapporterne. Upload kundens interne årsrapport, eller klik på "Ikke oplyst" i tabellen og indtast omsætningen, så vises den i grafen.'))
const isDis = (k) => k === 'rev' && noRevAll.value

</script>

<template>
  <a-card
    id="fin-chart"
    class="fin-chart"
    :bordered="false"
    :body-style="{ padding: 0 }"
  >
    <template #title>
      <span
        role="heading"
        aria-level="3"
      >{{ title }}</span>
    </template>
    <template #extra>
      <div class="fin-chart-head">
        <div
          class="fin-chart-series"
          role="group"
          :aria-label="t('Serier i grafen')"
        >
          <!-- Omsætning kan ikke vælges, når den mangler i alle årsrapporter: feltet kan stadig
               fokuseres, og forklaringen vises ved hover og fokus (som før migrationen) -->
          <a-tooltip
            v-for="s in FIN_SERIES"
            :key="s.k"
            :title="isDis(s.k) ? chipTip : undefined"
            :trigger="['hover', 'focus']"
          >
            <a-checkbox
              :checked="on[s.k]"
              :aria-disabled="isDis(s.k) ? 'true' : undefined"
              :aria-describedby="isDis(s.k) ? 'fin-chart-chiptip' : undefined"
              @change="toggleSeries(s.k)"
            >
              <span class="fin-chart-series-item">
                <span
                  :class="['fin-sw', s.k, { off: !on[s.k], dis: isDis(s.k) }]"
                  aria-hidden="true"
                />
                <a-typography-text :disabled="isDis(s.k)">{{ t(s.name) }}</a-typography-text>
              </span>
            </a-checkbox>
          </a-tooltip>
          <span
            v-if="noRevAll"
            id="fin-chart-chiptip"
            class="sr-only"
          >{{ chipTip }}</span>
        </div>
        <a-typography-text
          v-if="B"
          type="secondary"
          class="fin-chart-legend"
        >
          <span
            class="fin-sw bud"
            aria-hidden="true"
          />{{ t('Budget') }}
        </a-typography-text>
        <a-typography-text
          v-if="!B && N > 0"
          type="secondary"
          class="fin-chart-legend"
        >
          <span
            class="fin-sw ghost"
            aria-hidden="true"
          />{{ t('Fremskrevet helår') }}
        </a-typography-text>
        <a-button
          id="fin-chart-toggle"
          type="link"
          size="small"
          :aria-expanded="!hidden"
          @click="toggle"
        >
          {{ hidden ? t('Vis graf') : t('Skjul graf') }}
        </a-button>
      </div>
    </template>

    <div
      v-if="!hidden"
      class="fin-chart-scroll"
    >
      <div
        class="fin-chart-grid"
        :style="gridStyle"
        @mouseleave="hover = null"
      >
        <!-- Detaljefeltet -->
        <div
          class="fin-chart-side"
          aria-live="polite"
          :style="geom ? { width: geom.c1 + 'px' } : undefined"
        >
          <a-statistic :value="big">
            <template #title>
              <span class="fin-chart-cap">
                <span
                  :class="['fin-sw', pk]"
                  aria-hidden="true"
                />{{ capOf(pk) }}
              </span>
            </template>
            <template #formatter>
              {{ big }}
            </template>
            <template #suffix>
              {{ unitShort }}
            </template>
          </a-statistic>
          <a-statistic
            v-if="pk !== 'eb'"
            :value="ebBig"
          >
            <template #title>
              <span class="fin-chart-cap">
                <span
                  class="fin-sw eb"
                  aria-hidden="true"
                />{{ capOf('eb') }}
              </span>
            </template>
            <template #formatter>
              {{ ebBig }}
            </template>
            <template #suffix>
              {{ unitShort }}
            </template>
          </a-statistic>
          <div>
            <a-typography-text
              v-if="q.kilde"
              type="secondary"
              class="fin-chart-lbl"
            >
              {{ t('Kilde') }}
            </a-typography-text>
            <a-descriptions
              v-if="facts.length"
              size="small"
              :column="1"
              :colon="false"
              :content-style="{ justifyContent: 'flex-end' }"
            >
              <a-descriptions-item
                v-for="([k, v], j) in facts"
                :key="j"
              >
                <template #label>
                  <a-typography-text type="secondary">
                    {{ k }}
                  </a-typography-text>
                </template>
                <a-typography-text strong>
                  {{ v }}
                </a-typography-text>
              </a-descriptions-item>
            </a-descriptions>
          </div>
          <div>
            <a-typography-text
              type="secondary"
              class="fin-chart-lbl"
            >
              {{ q.showYtd ? finFill(t('Nøgletal {per}'), { per }) : t('Nøgletal') }}
            </a-typography-text>
            <a-descriptions
              size="small"
              :column="1"
              :colon="false"
              :content-style="{ justifyContent: 'flex-end' }"
            >
              <a-descriptions-item
                v-for="[k, v] in selMargins"
                :key="k"
              >
                <template #label>
                  <a-typography-text type="secondary">
                    {{ k }}
                  </a-typography-text>
                </template>
                <a-typography-text strong>
                  {{ v }}
                </a-typography-text>
              </a-descriptions-item>
            </a-descriptions>
          </div>
          <a-typography-paragraph
            v-if="q.note"
            type="secondary"
            class="fin-chart-note"
          >
            {{ q.note }}
          </a-typography-paragraph>
          <div
            v-if="B && !N"
            class="fin-chart-ask"
          >
            <a-typography-text type="secondary">
              {{ t('Der er ingen periodetal for 2026.') }}
            </a-typography-text>
            <a-button
              type="link"
              size="small"
              @click="ask('m-interim')"
            >
              {{ t('Anmod kunden om periodetal') }}
            </a-button>
          </div>
        </div>

        <div class="fin-chart-main">
          <!-- Søjlerne -->
          <div
            class="fin-chart-plot"
            :style="{ height: FIN_PLOT_H + 'px' }"
          >
            <div
              v-if="hasForecast"
              class="fin-chart-zone"
              :style="{ left: fcLeft }"
            />
            <div
              v-if="hasForecast"
              class="fin-chart-zlbl"
              :style="{ left: 'calc(' + fcLeft + ' + 12px)' }"
            >
              {{ t('Prognose') }}
            </div>
            <div class="fin-chart-slbl">
              {{ t('Årsrapporter') }}
            </div>
            <div
              v-for="b in [292, 236, 180, 124, 68]"
              :key="b"
              class="fin-chart-gl"
              :style="{ bottom: b + 'px' }"
            />
            <div class="fin-chart-gl base" />
            <div
              class="fin-chart-cols"
              :style="{ gridTemplateColumns: colTpl }"
            >
              <div
                v-for="(qq, i) in P"
                :key="qq.year"
                :class="['fin-chart-col', { on: i === sel }]"
                tabindex="0"
                :aria-label="colLabel(qq)"
                @mouseenter="hover = i"
                @focus="hover = i"
                @blur="hover = null"
              >
                <div
                  v-if="qq.empty"
                  class="fin-chart-empty"
                >
                  <a-typography-text>{{ t('Intet budget') }}</a-typography-text>
                  <a-button
                    type="primary"
                    size="small"
                    class="fin-chart-cta"
                    @click="ask('m-budget')"
                  >
                    {{ t('Anmod kunden om budget') }}
                  </a-button>
                </div>
                <div
                  class="fin-chart-bars"
                  :style="{ gap: bw.gap + 'px' }"
                >
                  <template
                    v-for="(k, j) in visKeys"
                    :key="k"
                  >
                    <div
                      v-if="!bars[i][j]"
                      class="fin-chart-bar"
                      :style="{ width: bw.ws[j] + 'px' }"
                    />
                    <div
                      v-else
                      :class="['fin-chart-bar', k]"
                      :style="{ width: bw.ws[j] + 'px' }"
                    >
                      <span :class="['fin-chart-bl', { lg: bw.ws[j] >= 40 }]">{{ bars[i][j].label }}</span>
                      <div class="fin-chart-stack">
                        <div
                          v-if="bars[i][j].gh > 0"
                          class="ghost"
                          :style="{ height: bars[i][j].gh + 'px' }"
                        />
                        <div
                          v-if="bars[i][j].bh > 0"
                          :class="['bud', { flat: bars[i][j].gh }]"
                          :style="{ height: bars[i][j].bh + 'px' }"
                        />
                        <div
                          v-if="bars[i][j].rh > 0"
                          :class="['act', { flat: bars[i][j].bh || bars[i][j].gh }]"
                          :style="{ height: bars[i][j].rh + 'px' }"
                        />
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <div
              v-if="hasForecast"
              class="fin-chart-div"
              :style="{ left: fcLeft }"
            />
            <div
              v-if="!hasForecast"
              class="fin-chart-nofc"
              :style="{ left: 'calc(' + fcLeft + ' + 12px)' }"
            >
              <a-typography-text strong>
                {{ t('Ingen prognose for 2026 og 2027') }}
              </a-typography-text>
              <a-typography-paragraph
                type="secondary"
                class="fin-chart-note"
              >
                {{ t('Der er hverken bogføring eller budget for 2026. Bed kunden om et budget, så I kan følge, hvor virksomheden er på vej hen.') }}
              </a-typography-paragraph>
              <a-space wrap>
                <a-button
                  type="primary"
                  size="small"
                  class="fin-chart-cta"
                  @click="ask('m-budget')"
                >
                  {{ t('Anmod kunden om budget') }}
                </a-button>
                <a-button
                  v-if="!locked"
                  size="small"
                  class="fin-chart-cta"
                  @click="emit('import')"
                >
                  {{ t('Importér budget') }}
                </a-button>
              </a-space>
              <a-button
                type="link"
                size="small"
                class="fin-chart-cta"
                @click="ask('m-interim')"
              >
                {{ t('Anmod kunden om periodetal') }}
              </a-button>
            </div>
          </div>

          <!-- Årstallene -->
          <div
            class="fin-chart-years"
            :style="{ gridTemplateColumns: colTpl }"
          >
            <div
              v-if="hasForecast"
              class="fin-chart-zone"
              :style="{ left: fcLeft }"
            />
            <div
              v-if="hasForecast"
              class="fin-chart-div"
              :style="{ left: fcLeft }"
            />
            <div
              v-for="(qq, i) in P"
              :key="qq.year"
              :class="['fin-chart-year', { on: i === sel }]"
              @mouseenter="hover = i"
            >
              <span>{{ qq.year }}</span>
              <small v-if="qq.yearSub">{{ qq.yearSub }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </a-card>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Domænetegning (antdv har ingen diagrammer): grafens gitter, søjler, zoner og detaljefelt.
   Farverne er temaets: omsætning i primærfarven, bruttofortjeneste i primærfarvens lyse trin og
   EBITDA i neutral grå. Budget er skraveret og fremskrevet stiplet i seriens egen farve; prognosen
   (2026-2027) står på en lys grå flade bag en stiplet streg. */

// EBITDA: antd's grå 7 til søjlen og grå 8 til tallene (7:1 mod hvid). ant-design-vue 3.x har ingen
// variabler for den grå skala, så de blandes af temaets sort og hvid.
@fin-rev: @primary-color;
@fin-bf: @primary-3;
@fin-eb: mix(@black, @white, 45%);
@fin-eb-text: mix(@black, @white, 65%);

.fin-chart-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px 16px;
}

.fin-chart-series {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.fin-chart-series-item,
.fin-chart-legend,
.fin-chart-cap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

/* Farveprøver (serier og forklaring) */
.fin-sw {
  display: inline-block;
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  box-sizing: border-box;
}

.fin-chart-cap .fin-sw {
  width: 8px;
  height: 8px;
}

.fin-sw.rev { background: @fin-rev; }
.fin-sw.bf { background: @fin-bf; }
.fin-sw.eb { background: @fin-eb; }

.fin-sw.off {
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.25);
}

.fin-sw.off.dis { border-style: dashed; }

.fin-sw.bud {
  border: 1px solid @fin-rev;
  background: repeating-linear-gradient(135deg, @fin-rev 0 1.5px, @component-background 1.5px 4px);
}

.fin-sw.ghost { border: 1.5px dashed @fin-rev; }

.fin-chart-scroll { overflow-x: auto; }

/* Detaljefeltet har fast, rummelig bredde; plottet tager resten (før målingen af tabellen) */
.fin-chart-grid {
  display: grid;
  min-width: 760px;
  grid-template-columns: 300px minmax(0, 1fr);
}

.fin-chart-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 20px;
  border-right: 1px solid @border-color-split;
}

.fin-chart-lbl {
  display: block;
  font-size: 12px;
}

.fin-chart-note { margin: 0; }

.fin-chart-ask {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid @border-color-split;
}

.fin-chart-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fin-chart-plot { position: relative; }

.fin-chart-zone {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  background: @background-color-light;
  pointer-events: none;
}

.fin-chart-div {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  border-left: 1px dashed @border-color-base;
  pointer-events: none;
}

/* "Årsrapporter" og "Prognose" over plottet */
.fin-chart-zlbl,
.fin-chart-slbl {
  position: absolute;
  top: 12px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 600;
  color: @text-color-secondary;
}

.fin-chart-slbl { left: 12px; }

.fin-chart-gl {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.fin-chart-gl.base {
  bottom: 12px;
  border-top-color: rgba(0, 0, 0, 0.15);
}

.fin-chart-cols {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 12px;
  left: 0;
  display: grid;
}

.fin-chart-col {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 6px;
  padding-right: var(--fin-chart-pad, 16px);
  outline: none;
  transition: background 0.25s ease;
}

.fin-chart-col.on { background: fade(@primary-color, 4%); }
.fin-chart-col:focus-visible { box-shadow: inset 0 0 0 2px @primary-color; }

.fin-chart-bars {
  display: flex;
  align-items: flex-end;
  opacity: 0.55;
  transition: opacity 0.25s ease;
}

.fin-chart-col.on .fin-chart-bars { opacity: 1; }

.fin-chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

/* Tallet over søjlen */
.fin-chart-bl {
  align-self: flex-end;
  font-size: 11px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.55);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.fin-chart-bl.lg { font-size: 13px; }
.fin-chart-col.on .fin-chart-bar.rev .fin-chart-bl,
.fin-chart-col.on .fin-chart-bar.bf .fin-chart-bl { color: @text-color; }
.fin-chart-bar.eb .fin-chart-bl { color: @fin-eb-text; }

/* Søjlens lag nedefra: realiseret (fyldt), budget (skraveret), fremskrevet (stiplet) */
.fin-chart-stack {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.fin-chart-stack .act { border-radius: 4px 4px 0 0; }

.fin-chart-stack .bud {
  border: 1px solid;
  border-bottom: 0;
  border-radius: 4px 4px 0 0;
}

.fin-chart-stack .ghost {
  border: 1.5px dashed;
  border-bottom: 0;
  border-radius: 4px 4px 0 0;
}

.fin-chart-stack .flat { border-radius: 0; }

.fin-chart-bar.rev .act { background: @fin-rev; }
.fin-chart-bar.bf .act { background: @fin-bf; }
.fin-chart-bar.eb .act { background: @fin-eb; }

.fin-chart-bar.rev .bud {
  border-color: @fin-rev;
  background: repeating-linear-gradient(135deg, @fin-rev 0 2px, @component-background 2px 6px);
}

.fin-chart-bar.bf .bud {
  border-color: @fin-bf;
  background: repeating-linear-gradient(135deg, @fin-bf 0 2px, @component-background 2px 6px);
}

/* EBITDA-budgettet er lys grå med kant i seriens grå */
.fin-chart-bar.eb .bud {
  border-color: @fin-eb;
  background: @border-color-split;
}

.fin-chart-bar.rev .ghost { border-color: @fin-rev; }
.fin-chart-bar.bf .ghost { border-color: @fin-bf; }
.fin-chart-bar.eb .ghost { border-color: @fin-eb; }

/* 2027 uden budget: boks med opfordring */
.fin-chart-empty {
  position: absolute;
  right: 6px;
  bottom: 40px;
  left: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  background: @component-background;
  text-align: center;
}

/* Knapper i de smalle felter må bryde teksten */
.fin-chart-cta {
  height: auto;
  max-width: 100%;
  white-space: normal;
}

/* Ingen prognose: boks over 2026 og 2027 */
.fin-chart-nofc {
  position: absolute;
  top: 40px;
  right: 12px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  max-height: calc(100% - 52px);
  padding: 20px;
  overflow: auto;
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  background: @background-color-light;
}

/* Årstallene under plottet */
.fin-chart-years {
  position: relative;
  display: grid;
  padding-bottom: 10px;
}

.fin-chart-year {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 4px var(--fin-chart-pad, 16px) 0 0;
  line-height: 18px;
  color: @text-color-secondary;
  transition: background 0.25s ease;
}

.fin-chart-year span {
  font-size: 13px;
  font-weight: 600;
}

.fin-chart-year small {
  font-size: 12px;
  white-space: nowrap;
}

.fin-chart-year.on { background: fade(@primary-color, 4%); }

.fin-chart-year.on span {
  font-weight: 700;
  color: @text-color;
}

@media (max-width: 1180px) {
  .fin-chart-grid {
    min-width: 680px;
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .fin-chart-side { padding: 18px 16px 16px; }
  .fin-chart-bl { font-size: 10px; }
  .fin-chart-bl.lg { font-size: 11px; }

  .fin-chart-nofc {
    top: 16px;
    gap: 8px;
    padding: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fin-chart-col,
  .fin-chart-bars,
  .fin-chart-year { transition: none; }
}
</style>
