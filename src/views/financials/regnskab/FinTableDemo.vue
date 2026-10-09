<script setup>
/* Demoknapperne ved regnskabstabellen (Regnskab v5): skift hurtigt mellem kundens datakilder og
   kombinationer, og vis designets kanttilfælde med eksempeldata. Ændrer kun visningen (ingen
   skrivning til sagen; tilstanden ligger i hukommelsen, useFinDemoView, og er væk efter en
   genindlæsning). Kundens rigtige kilder ændres i kundeportalen, hvor demoknapperne gemmes.
   Mønster som demoknapperne i portalen (OnboardingDemoBar.vue): stiplet = demo, den valgte er en
   blå kantknap, aria-pressed, og hver gruppe er en navngiven gruppe (skifteknapper, ikke radioer).
   Props: real (sagens kilder, finSourceState), override (demotilstanden eller null)
   Emits: change(override | null) */
import { computed, nextTick, ref } from 'vue'
import { CloseOutlined, ToolOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { finOverrideFrom } from '@/domain/financials/finSources'
import { useFinDemoView } from '../composables/useFinDemoView'

const props = defineProps({
  real: { type: Object, required: true },
  override: { type: Object, default: null },
})
const emit = defineEmits(['change'])
const root = ref(null)
// PEP i bestyrelsen (ejerskabskortet): standard ingen PEP, og valget gælder kun demovisningen
const demoPep = useFinDemoView().pep
const PEP_OPTIONS = [[false, t('Ingen PEP')], [true, t('1 PEP')]]

// Hele demopanelet er en knap, der kan foldes ud og ind, så det ikke forstyrrer tabellen.
// Lukket som udgangspunkt; valget huskes i browseren. Er en demovisning slået til, siger knappen det.
const OPEN_KEY = 'cw_fin_demo_open'
const shown = ref(false)
try { shown.value = localStorage.getItem(OPEN_KEY) === '1' } catch (e) { /* uden lager: lukket */ }
function setShown (on) {
  shown.value = on
  try { localStorage.setItem(OPEN_KEY, on ? '1' : '0') } catch (e) { /* ignoreres */ }
}

const base = computed(() => finOverrideFrom(props.real))
const eff = computed(() => props.override || base.value)
const edge = computed(() => ({ fy: 'cal', book: 8, ...(eff.value.edge || {}) }))

const groups = computed(() => [
  { k: 'annual', label: t('Årsrapporter'), on: eff.value.annual, options: [['public', t('Offentlige')], ['internal', t('Interne')]] },
  { k: 'period', label: t('Periodetal'), on: eff.value.period, options: [['none', t('Ingen')], ['erp', t('ERP')], ['upload', t('PDF')]] },
  { k: 'budget', label: t('Budget'), on: eff.value.budget, options: [[false, t('Ikke modtaget')], [true, t('Modtaget')]] },
])
// Bogført til og med kræver periodetal. ("Bogført til angivet af kunden" er taget ud: Jesper 9. oktober)
const edgeGroups = computed(() => [
  { k: 'fy', label: t('Regnskabsår'), on: edge.value.fy, options: [['cal', t('Jan-dec')], ['jj', t('Jul-jun')]] },
  { k: 'book', label: t('Bogført'), on: edge.value.book, options: [[3, t('3 mdr.')], [8, t('8 mdr.')], [12, t('12 mdr.')], [15, t('Ind i næste år')]], needsPeriod: true },
].map(g => ({ ...g, disabled: !!g.needsPeriod && eff.value.period === 'none' })))

// Et valg, der giver sagens egne data igen, slår demovisningen fra
const same = (a, b) => a.annual === b.annual && a.period === b.period && !!a.budget === !!b.budget &&
  (a.estBy || 'cw') === (b.estBy || 'cw') && !a.edge && !b.edge
function set (k, v) {
  const next = { ...eff.value }
  if (k === 'fy' || k === 'book') {
    const e = { ...edge.value, [k]: v }
    next.edge = e.fy === 'cal' && e.book === 8 ? null : e
  } else next[k] = v
  emit('change', same(next, base.value) ? null : next)
}
// "Vis sagens data" forsvinder, når den er trykket: fokus til den valgte knap i første gruppe
function showReal () {
  emit('change', null)
  demoPep.value = false
  nextTick(() => {
    const b = root.value && root.value.querySelector('button[aria-pressed="true"]')
    if (b) b.focus()
  })
}
</script>

<template>
  <!-- Den lukkede knap står i overskriften, til venstre for "Sammenlign" (#fin-demo-slot i AnnualReportSection),
       så den ikke giver en række for sig selv. Menuen, når den er åben, står her, hvor komponenten er sat ind. -->
  <Teleport
    v-if="!shown"
    to="#fin-demo-slot"
    defer
  >
    <a-button
      size="small"
      type="dashed"
      aria-expanded="false"
      :title="t('Vis demomenuen')"
      @click="setShown(true)"
    >
      <template #icon>
        <ToolOutlined aria-hidden="true" />
      </template>
      {{ override ? t('Demo: viser andre data') : t('Demo') }}
    </a-button>
  </Teleport>
  <section
    v-else
    ref="root"
    class="fin-demo"
    :aria-label="t('Demo: vis regnskabet med andre data')"
  >
    <div class="fin-demo-head">
      <a-typography-text type="secondary">
        {{ t('Demo: vis regnskabet med andre data') }}
      </a-typography-text>
      <template v-if="override">
        <a-typography-text type="secondary">
          {{ t('Kun denne visning. Intet gemmes, og tal kan ikke rettes, før du viser sagens data igen.') }}
        </a-typography-text>
        <a-button
          size="small"
          @click="showReal"
        >
          {{ t('Vis sagens data') }}
        </a-button>
      </template>
      <a-button
        class="fin-demo-close"
        type="text"
        size="small"
        shape="circle"
        aria-expanded="true"
        :title="t('Skjul demomenuen')"
        :aria-label="t('Skjul demomenuen')"
        @click="setShown(false)"
      >
        <template #icon>
          <CloseOutlined aria-hidden="true" />
        </template>
      </a-button>
    </div>
    <div class="fin-demo-row">
      <div
        v-for="g in groups"
        :key="g.k"
        class="fin-demo-group"
        role="group"
        :aria-label="g.label"
      >
        <a-typography-text type="secondary">
          {{ g.label }}
        </a-typography-text>
        <a-button
          v-for="[v, label] in g.options"
          :key="String(v)"
          size="small"
          shape="round"
          :type="g.on === v ? 'primary' : 'dashed'"
          :ghost="g.on === v"
          :aria-pressed="g.on === v"
          @click="set(g.k, v)"
        >
          {{ label }}
        </a-button>
      </div>
      <div
        class="fin-demo-group"
        role="group"
        :aria-label="t('PEP i bestyrelsen')"
      >
        <a-typography-text type="secondary">
          {{ t('PEP i bestyrelsen') }}
        </a-typography-text>
        <a-button
          v-for="[v, label] in PEP_OPTIONS"
          :key="String(v)"
          size="small"
          shape="round"
          :type="demoPep === v ? 'primary' : 'dashed'"
          :ghost="demoPep === v"
          :aria-pressed="demoPep === v"
          @click="demoPep = v"
        >
          {{ label }}
        </a-button>
      </div>
    </div>
    <div class="fin-demo-row">
      <a-typography-text type="secondary">
        {{ t('Kanttilfælde med eksempeldata:') }}
      </a-typography-text>
      <div
        v-for="g in edgeGroups"
        :key="g.k"
        class="fin-demo-group"
        role="group"
        :aria-label="g.label"
      >
        <a-typography-text type="secondary">
          {{ g.label }}
        </a-typography-text>
        <a-button
          v-for="[v, label] in g.options"
          :key="String(v)"
          size="small"
          shape="round"
          :type="g.on === v ? 'primary' : 'dashed'"
          :ghost="g.on === v"
          :aria-pressed="g.on === v"
          :disabled="g.disabled"
          :title="g.disabled ? t('Kræver periodetal') : undefined"
          @click="set(g.k, v)"
        >
          {{ label }}
        </a-button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Stiplet ramme = demo (som demoknapperne i portalen) */
.fin-demo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px;
  border: 1px dashed @border-color-base;
  border-radius: 8px;
  background: @component-background;
}

.fin-demo-close {
  margin-left: auto;
}

.fin-demo-head,
.fin-demo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 20px;
}

.fin-demo-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
</style>
