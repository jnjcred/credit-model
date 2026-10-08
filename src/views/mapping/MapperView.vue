<script setup>
// Kontomapping (ruten 'mapping'; før MapperPage i src/mapper.jsx): en side for sig, som åbnes fra
// demopunktet i venstremenuen og fra Regnskab ('cw-open-mapper'). Kundens saldobalance fra
// e-conomic til venstre, Crediwires kategorier til højre (MapperCategoryPanel.vue). Rådgiveren
// vælger konti ("Vælg"; Shift-klik vælger alt mellem to klik) og flytter dem til en kategori med
// "Flyt hertil". Ændringerne er et udkast (MAP_DRAFT i src/domain/mapper.js), til de gemmes; så
// regnes de realiserede kvartaler i Regnskab om (finSyncMapping i src/domain/financials).
// Udkastet bliver stående, hvis man går til en anden side og kommer tilbage, men ikke ved
// genindlæsning. Data og kategorier: window.CW_MAP (src/domain/mapping.js), uændret.
// Ingen props og ingen emits (prop'en go er erstattet af useNavigation).
import { computed, h, ref, shallowRef } from 'vue'
import { Empty } from 'ant-design-vue'
import {
  ArrowRightOutlined, DownloadOutlined, EditTwoTone, ExclamationCircleOutlined, FileTextOutlined,
  SearchOutlined, UndoOutlined, UserOutlined,
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { CW_MAP } from '@/domain/mapping'
import { MAP_DRAFT, mapErr, mapFill, mapKr, mapSetDraft } from '@/domain/mapper'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { go } from '@/composables/useNavigation'
import AppTopbar from '@/components/shell/AppTopbar.vue'
import MapperCategoryPanel from './MapperCategoryPanel.vue'

const M = CW_MAP

/* ── Saldobalancen og den gemte mapping ─────────────────────────────────── */

// Læses igen, hver gang CW_MAP melder en ændring (hentet, gemt, nulstillet, gemt i en anden fane)
const ver = ref(0)
useWindowEvent(M.EVENT, () => { ver.value++ })
const ready = computed(() => { ver.value; return M.ready() })
const status = computed(() => { ver.value; return M.status() })
const error = computed(() => { ver.value; return M.error() })
const accounts = computed(() => { ver.value; return ready.value ? M.accounts() : [] })
const saved = computed(() => { ver.value; return ready.value ? M.saved() : {} })
const months = computed(() => { ver.value; return M.months() })
const span = computed(() => { ver.value; return M.span() })

/* ── Tilstand ───────────────────────────────────────────────────────────── */

const changes = shallowRef(MAP_DRAFT) // nr -> kategori-id (udkast)
const setChanges = (v) => { mapSetDraft(v); changes.value = v }
const sel = shallowRef({}) // nr -> true
const period = ref('all')
const filter = ref('all') // all | auto | manual | none | changed
const query = ref('')
const openAcc = ref(null)
const lastClick = { current: null } // det forrige klik (ankeret for Shift-klik); ikke reaktivt

/* ── Udledt (samme regler som før) ──────────────────────────────────────── */

const dirtyNrs = computed(() => Object.keys(changes.value).filter(nr => saved.value[nr] && changes.value[nr] !== saved.value[nr].cat))
const dirty = computed(() => dirtyNrs.value.length > 0)
const isLeaf = (a) => a.type === 'Drift' || a.type === 'Status'
const selAcc = computed(() => accounts.value.filter(a => sel.value[a.nr] && isLeaf(a)))
const selStmt = computed(() => (selAcc.value.length ? (selAcc.value.every(a => a.type === 'Drift') ? 'pl' : selAcc.value.every(a => a.type === 'Status') ? 'bs' : 'mixed') : null))

const P = computed(() => (period.value !== 'all' && M.PERIODS.find(p => p.key === period.value)) || span.value)
// "Jan 2026 - Aug 2026" med månedsnavnene på det valgte sprog
const spanLabel = computed(() => (span.value ? span.value.label.replace(/[A-Za-zæøå]+/g, w => t(w)) : ''))
const eff = (nr) => {
  if (changes.value[nr] !== undefined && saved.value[nr] && changes.value[nr] !== saved.value[nr].cat) return { cat: changes.value[nr], method: 'manual', pending: true }
  return saved.value[nr] || { cat: null, method: 'none' }
}
const methodOf = (a) => { const e = eff(a.nr); return e.pending ? 'changed' : e.cat ? e.method : 'none' }
const leaves = computed(() => accounts.value.filter(isLeaf))
const counts = computed(() => {
  const counts = { all: leaves.value.length, auto: 0, manual: 0, none: 0, changed: 0 }
  leaves.value.forEach(a => { const m = methodOf(a); if (m === 'changed') counts.changed++; if (m === 'none') counts.none++; else if (eff(a.nr).method === 'auto') counts.auto++; else counts.manual++ })
  return counts
})
// Bliver den valgte gruppe tom (fx "Ikke gemt" efter Gem), vises alle igen
const fil = computed(() => ((filter.value === 'none' && !counts.value.none) || (filter.value === 'changed' && !counts.value.changed) ? 'all' : filter.value))
const q = computed(() => query.value.trim().toLowerCase())
const filtering = computed(() => fil.value !== 'all' || !!q.value)
const matches = (a) => {
  if (!isLeaf(a)) return !filtering.value
  if (q.value) {
    // Søgningen rammer kontonr., kontonavn og den kategori, kontoen er mappet til
    const c = M.CAT[eff(a.nr).cat]
    const hay = [String(a.nr), a.name].concat(c ? [c.label, c.group, t(c.label), t(c.group)] : []).join(' ').toLowerCase()
    if (!hay.includes(q.value)) return false
  }
  if (fil.value === 'all') return true
  const m = methodOf(a), e = eff(a.nr)
  if (fil.value === 'changed') return m === 'changed'
  if (fil.value === 'none') return m === 'none'
  if (fil.value === 'auto') return !!e.cat && e.method === 'auto'
  if (fil.value === 'manual') return !!e.cat && e.method === 'manual'
  return true
}
const visible = computed(() => accounts.value.filter(matches))
const visibleLeaves = computed(() => visible.value.filter(isLeaf))

/* ── Valg: klik vælger én; Shift-klik vælger alt mellem det forrige klik og dette ── */

const toggle = (a, shift) => {
  if (shift && lastClick.current != null) {
    const ids = visibleLeaves.value.map(x => x.nr)
    const i0 = ids.indexOf(lastClick.current), i1 = ids.indexOf(a.nr)
    if (i0 >= 0 && i1 >= 0) {
      const on = !sel.value[a.nr]
      const next = { ...sel.value }
      ids.slice(Math.min(i0, i1), Math.max(i0, i1) + 1).forEach(n => { next[n] = on })
      sel.value = next; lastClick.current = a.nr; return
    }
  }
  sel.value = { ...sel.value, [a.nr]: !sel.value[a.nr] }
  lastClick.current = a.nr
}
const allVisibleOn = computed(() => visibleLeaves.value.length > 0 && visibleLeaves.value.every(a => sel.value[a.nr]))
const toggleAll = () => {
  const next = { ...sel.value }
  visibleLeaves.value.forEach(a => { next[a.nr] = !allVisibleOn.value })
  sel.value = next
}

/* ── Flyt, gem, tilbage til automatisk, nulstil ─────────────────────────── */

const catLabel = (c) => t(c.label)
const canMove = (c) => selAcc.value.length > 0 && selStmt.value === c.stmt
const moveTo = (c) => {
  if (!canMove(c)) return
  // De konti, der var valgt ved klikket (markeringen ryddes nedenfor)
  const moved = selAcc.value
  const next = { ...changes.value }
  moved.forEach(a => {
    if (saved.value[a.nr] && saved.value[a.nr].cat === c.id) delete next[a.nr]
    else next[a.nr] = c.id
  })
  setChanges(next)
  sel.value = {}
  CW.focusSoon('#map-save') // knappen, man trykkede på, bliver slået fra
  CW.toast(mapFill(moved.length === 1 ? t('1 konto flyttet til {kat}. Gem for at opdatere Regnskab.') : t('{n} konti flyttet til {kat}. Gem for at opdatere Regnskab.'), { n: moved.length, kat: catLabel(c) }))
}
const save = () => {
  if (!dirty.value) return
  const map = {}
  Object.keys(saved.value).forEach(nr => { map[nr] = { cat: eff(nr).cat } })
  const n = dirtyNrs.value.length
  const first = dirtyNrs.value[0], fa = accounts.value.find(a => String(a.nr) === String(first)), fc = M.CAT[changes.value[first]]
  const by = (window.DATA && DATA.ADVISOR && DATA.ADVISOR.name) || 'Mette Larsen'
  M.save(map, by)
  setChanges({})
  const example = fa && fc ? fa.nr + ' ' + fa.name + ' → ' + t(fc.group) + ' › ' + t(fc.label) : ''
  CW.log('mapping', mapFill(n === 1 ? t('Kontomapping gemt: {eks}') : t('Kontomapping gemt: {n} konti mappet om, bl.a. {eks}'), { n, eks: example }), { who: 'rådgiver', data: { n } })
  CW.toast(t('Mappingen er gemt. De realiserede kvartaler i Regnskab er regnet om.'))
  CW.focusSoon('#fin-mapper-title')
}
// Én konto tilbage til Crediwires automatiske forslag (som et ikke gemt udkast)
const toDefault = (a) => {
  const d = M.defaultCat(a.nr)
  if (!d) return
  const next = { ...changes.value }
  if (saved.value[a.nr] && saved.value[a.nr].cat === d) delete next[a.nr]; else next[a.nr] = d
  setChanges(next)
  CW.focusSoon('#map-save')
}
const resetChanges = () => { setChanges({}); CW.toast(t('Ændringerne er nulstillet til den gemte mapping.')) }

// Antal konti, der er mappet til en kategori (med udkastet); står i kategoripanelet
const countFor = (id) => leaves.value.filter(a => eff(a.nr).cat === id).length

// Konti med bevægelser uden kategori, regnet med udkastet
const unmapped = computed(() => {
  const res = ready.value ? M.compute(Object.fromEntries(Object.keys(saved.value).map(nr => [nr, { cat: eff(nr).cat }]))) : null
  return res ? res.unmapped : []
})

const company = (window.DATA && DATA.COMPANY && DATA.COMPANY.name) || ''

/* ── Værktøjslinjen ─────────────────────────────────────────────────────── */

const periodOptions = computed(() => [{ value: 'all', label: spanLabel.value }].concat(M.PERIODS.map(p => ({ value: p.key, label: t(p.label) }))))
// "Ikke mappet" og "Ikke gemt" står der kun, når der er nogen
const filterOptions = computed(() => {
  const c = counts.value
  return [
    { value: 'all', label: t('Alle') + ' (' + c.all + ')' },
    { value: 'auto', label: t('Automatisk') + ' (' + c.auto + ')' },
    { value: 'manual', label: t('Tilpasset') + ' (' + c.manual + ')' },
    ...(c.none ? [{ value: 'none', label: t('Ikke mappet') + ' (' + c.none + ')' }] : []),
    ...(c.changed ? [{ value: 'changed', label: t('Ikke gemt') + ' (' + c.changed + ')' }] : []),
  ]
})
const unmappedText = computed(() => {
  const u = unmapped.value
  return mapFill(u.length === 1 ? t('1 konto med bevægelser er ikke mappet, så beløbet mangler i Regnskab: {konti}') : t('{n} konti med bevægelser er ikke mappet, så beløbene mangler i Regnskab: {konti}'), { n: u.length, konti: u.slice(0, 4).map(a => a.nr + ' ' + a.name).join(', ') + (u.length > 4 ? ' …' : '') })
})

/* ── Tabellen ───────────────────────────────────────────────────────────── */

// Overskrifter: nr. | navn over to kolonner | tom kategori over tre kolonner.
// Sumrækker: nr. | navn | sum | "Sum af konto …" over tre kolonner. Konti: alle seks celler.
// Bredderne er prototypens (76, 128, 32 %, 92, 60) med 12 px flyttet fra beløbet til metoden,
// så kolonneoverskriften "Metode" kan stå på én linje; kontonavnet får samme plads som før.
const isHeading = (a) => a.type === 'Overskrift'
const toggleOpen = (a) => { openAcc.value = openAcc.value === a.nr ? null : a.nr }
const columns = computed(() => [
  {
    key: 'raw',
    title: t('Råbalance'),
    children: [
      { key: 'nr', title: t('Konto nr.'), width: 76 },
      // Et klik på navnet viser også beløbene pr. måned (tastaturet bruger kontonummeret)
      { key: 'name', title: t('Kontonavn'), customCell: (a) => (isHeading(a) ? { colSpan: 2 } : isLeaf(a) ? { title: a.name, class: 'map-name', onClick: () => toggleOpen(a) } : {}) },
      { key: 'value', title: t('Bogført værdi'), width: 116, align: 'right', customCell: (a) => (isHeading(a) ? { colSpan: 0 } : {}) },
    ],
  },
  {
    key: 'cw',
    title: t('Crediwire kategori'),
    children: [
      { key: 'cat', title: t('Crediwire kategori'), width: '32%', customCell: (a) => (isLeaf(a) ? {} : { colSpan: 3 }) },
      { key: 'pick', title: t('Tilpas'), width: 92, customCell: (a) => (isLeaf(a) ? {} : { colSpan: 0 }) },
      { key: 'method', title: t('Metode'), width: 72, customCell: (a) => (isLeaf(a) ? {} : { colSpan: 0 }) },
    ],
  },
])
// Andre kontotyper end overskrift, sum, drift og status vises ikke (som før)
const rows = computed(() => visible.value.filter(a => isHeading(a) || a.type === 'Sum' || isLeaf(a)))
// <a-table aria-label> lander på en div uden rolle; navnet skal stå på selve tabellen (som før).
// Den dokumenterede components-prop tegner tabellens <table> med navnet og et <thead>, der står fast
// øverst i ruden, når den ruller (samme position og z-index som antdv's egen faste overskrift).
// antdv's sticky-prop bruges ikke: den deler overskrift og krop i to tabeller, så skærmlæsere ikke
// kan knytte cellerne til kolonneoverskrifterne. Tabellen har fast layout (table-layout), så
// kolonnerne får præcis de bredder, der står ovenfor.
const tableLabel = t('Saldobalance og mapping')
const tableComponents = {
  table: (props, { slots }) => h('table', { ...props, 'aria-label': tableLabel }, slots.default ? slots.default() : []),
  header: { wrapper: (props, { slots }) => h('thead', { ...props, style: { position: 'sticky', top: 0, zIndex: 3 } }, slots.default ? slots.default() : []) },
}
const catOf = (a) => { const e = eff(a.nr); return e.cat ? M.CAT[e.cat] : null }

// Metodens ikon: ændret (ikke gemt), ikke mappet, tilpasset af en rådgiver eller automatisk
const met = (a) => {
  const e = eff(a.nr)
  if (e.pending) return { k: 'changed', label: t('Ændret, ikke gemt'), tip: t('Ændret, ikke gemt') }
  if (!e.cat) return { k: 'none', label: t('Ikke mappet'), tip: t('Ikke mappet') }
  if (e.method === 'manual') {
    const tip = mapFill(t('Tilpasset af {navn} {dato}'), { navn: e.by || '', dato: e.at ? CW.fmtDate(e.at) : '' }).trim()
    return { k: 'manual', label: tip, tip }
  }
  return { k: 'auto', label: t('Automatisk mappet'), tip: t('Automatisk mappet ud fra kontonummer og navn') }
}
// "Tilbage til automatisk" står der, når kontoen ligger et andet sted end Crediwires forslag
const autoCat = (a) => { const d = M.defaultCat(a.nr); return d && eff(a.nr).cat !== d ? M.CAT[d] : null }
</script>

<template>
  <div class="map-view">
    <AppTopbar :crumbs="[t('Kontomapping')]" />
    <div class="map-page">
      <div class="map-head">
        <div class="map-head-text">
          <a-typography-title
            id="fin-mapper-title"
            tabindex="-1"
          >
            {{ t('Kontomapping') }}
            <!-- Siden ligger i venstremenuen, så sagen står i titlen -->
            <a-typography-text type="secondary">
              · {{ company }}
            </a-typography-text>
            {{ ' ' }}<a-tag>{{ t('demo') }}</a-tag>
          </a-typography-title>
          <a-typography-paragraph type="secondary">
            {{ mapFill(t('Kundens saldobalance fra e-conomic, {n} konti. Hver konto lægges i en Crediwire-kategori, og summerne går ind i Regnskab som de realiserede kvartaler i 2026.'), { n: leaves.length || '…' }) }}
          </a-typography-paragraph>
        </div>
        <a-button @click="go('workspace:1:financials')">
          {{ t('Se Regnskab') }}
          <ArrowRightOutlined aria-hidden="true" />
        </a-button>
      </div>

      <a-card
        id="fin-mapper"
        class="map-frame"
        role="region"
        aria-labelledby="fin-mapper-title"
        :body-style="{ padding: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }"
      >
        <!-- Saldobalancen hentes, eller den kunne ikke hentes -->
        <div
          v-if="!ready"
          class="map-state"
        >
          <a-alert
            v-if="status === 'error'"
            type="error"
            show-icon
            :message="t('Saldobalancen kunne ikke hentes:') + ' ' + mapErr(error)"
          >
            <template #description>
              <a-button
                size="small"
                @click="M.load(true)"
              >
                {{ t('Prøv igen') }}
              </a-button>
            </template>
          </a-alert>
          <div
            v-else
            role="status"
          >
            <a-spin :tip="t('Henter saldobalancen fra e-conomic …')" />
          </div>
        </div>

        <template v-else>
          <div class="map-toolbar">
            <!-- Etiketterne er knyttet til felterne med id (aria-label på a-select når ikke feltet i 3.2.13);
                 uden kolon, som før -->
            <a-form
              layout="inline"
              :colon="false"
            >
              <a-form-item
                :label="t('Periode')"
                html-for="map-period"
              >
                <a-select
                  id="map-period"
                  v-model:value="period"
                  class="map-period"
                  :options="periodOptions"
                />
              </a-form-item>
              <a-form-item
                :label="t('Søg konto')"
                html-for="map-search"
              >
                <a-input
                  id="map-search"
                  v-model:value="query"
                  type="search"
                  allow-clear
                  :placeholder="t('Kontonr. eller navn')"
                >
                  <template #prefix>
                    <SearchOutlined aria-hidden="true" />
                  </template>
                </a-input>
              </a-form-item>
              <!-- Et klik vælger altid gruppen, også den viste (som før): er den valgte gruppe tom, vises
                   "Alle", og et klik på "Alle" gør så valget fast -->
              <a-form-item :label="t('Metode')">
                <a-radio-group
                  :value="fil"
                  option-type="button"
                  name="map-filter"
                  role="radiogroup"
                  :aria-label="t('Metode')"
                  @change="(e) => { filter = e.target.value }"
                >
                  <a-radio-button
                    v-for="o in filterOptions"
                    :key="o.value"
                    :value="o.value"
                    @click="filter = o.value"
                  >
                    {{ o.label }}
                  </a-radio-button>
                </a-radio-group>
              </a-form-item>
            </a-form>
            <a-space
              class="map-actions"
              wrap
            >
              <a-button
                :href="M.FILE"
                :download="M.FILE_NAME"
                :title="t('Hent saldobalancen, som mappingen bygger på')"
              >
                <template #icon>
                  <DownloadOutlined aria-hidden="true" />
                </template>
                {{ t('Hent Excel') }}
              </a-button>
              <a-button
                :disabled="!dirty"
                @click="resetChanges"
              >
                <template #icon>
                  <UndoOutlined aria-hidden="true" />
                </template>
                {{ t('Nulstil ændringer') }}
              </a-button>
              <a-button
                id="map-save"
                type="primary"
                :disabled="!dirty"
                @click="save"
              >
                {{ dirty ? mapFill(t('Gem ændringer ({n})'), { n: dirtyNrs.length }) : t('Gem ændringer') }}
              </a-button>
            </a-space>
          </div>

          <!-- En statuslinje (høflig), som før: role="status" i stedet for a-alerts role="alert" -->
          <a-alert
            v-if="unmapped.length > 0"
            banner
            role="status"
            :message="unmappedText"
          />

          <div class="map-body">
            <div class="map-main">
              <!-- Usynlig, til den får fokus med Tab: springer de mange konti over -->
              <a-button
                type="link"
                class="skip-link"
                @click="CW.focusSoon('#map-side-start')"
              >
                {{ t('Gå til kategorierne') }}
              </a-button>
              <a-table
                :columns="columns"
                :data-source="rows"
                row-key="nr"
                :pagination="false"
                size="small"
                bordered
                table-layout="fixed"
                :components="tableComponents"
                :custom-row="(a) => (isLeaf(a) ? { id: 'map-acc-' + a.nr } : {})"
                :expanded-row-keys="openAcc === null ? [] : [openAcc]"
                :show-expand-column="false"
              >
                <template #emptyText>
                  <a-empty :image="Empty.PRESENTED_IMAGE_SIMPLE">
                    <template #description>
                      <a-typography-text type="secondary">
                        {{ t('Ingen konti matcher.') }}
                      </a-typography-text>
                    </template>
                  </a-empty>
                </template>
                <template #headerCell="{ column }">
                  <a-checkbox
                    v-if="column.key === 'pick'"
                    :checked="allVisibleOn"
                    :disabled="!visibleLeaves.length"
                    :aria-label="allVisibleOn ? t('Fravælg alle viste konti') : t('Vælg alle viste konti')"
                    @change="toggleAll"
                  >
                    {{ t('Tilpas') }}
                  </a-checkbox>
                </template>
                <template #bodyCell="{ column, record: a }">
                  <template v-if="column.key === 'nr'">
                    <a-button
                      v-if="isLeaf(a)"
                      type="link"
                      size="small"
                      :aria-expanded="openAcc === a.nr"
                      :title="t('Vis beløb pr. måned')"
                      :aria-label="mapFill(t('Vis beløb pr. måned for konto {nr} {navn}'), { nr: a.nr, navn: a.name })"
                      @click="toggleOpen(a)"
                    >
                      {{ a.nr }}
                    </a-button>
                    <a-typography-text
                      v-else
                      strong
                    >
                      {{ a.nr }}
                    </a-typography-text>
                  </template>
                  <template v-else-if="column.key === 'name'">
                    <template v-if="isLeaf(a)">
                      {{ a.name }}
                    </template>
                    <a-typography-text
                      v-else
                      strong
                    >
                      {{ a.name }}
                    </a-typography-text>
                  </template>
                  <template v-else-if="column.key === 'value'">
                    <a-typography-text
                      v-if="a.type === 'Sum'"
                      strong
                    >
                      {{ mapKr(M.sumValue(a, P)) }}
                    </a-typography-text>
                    <template v-else-if="isLeaf(a)">
                      {{ mapKr(M.accountValue(a, P)) }}
                    </template>
                  </template>
                  <template v-else-if="column.key === 'cat'">
                    <a-typography-text
                      v-if="a.type === 'Sum'"
                      type="secondary"
                    >
                      {{ mapFill(t('Sum af konto {fra}-{til}'), { fra: a.from, til: a.to }) }}
                    </a-typography-text>
                    <template v-else-if="isLeaf(a)">
                      <template v-if="catOf(a)">
                        <a-tag>{{ t(catOf(a).group) }}</a-tag>
                        <div>{{ catLabel(catOf(a)) }}</div>
                      </template>
                      <!-- Advarselsfarven sidder på ikonet i metodekolonnen; ordet står i tekstfarven -->
                      <a-typography-text v-else>
                        {{ t('Ikke mappet') }}
                      </a-typography-text>
                    </template>
                  </template>
                  <a-checkbox
                    v-else-if="column.key === 'pick' && isLeaf(a)"
                    :checked="!!sel[a.nr]"
                    :aria-label="mapFill(t('Vælg konto {nr} {navn}'), { nr: a.nr, navn: a.name })"
                    @change="(ev) => toggle(a, !!(ev.nativeEvent && ev.nativeEvent.shiftKey))"
                  >
                    {{ t('Vælg') }}
                  </a-checkbox>
                  <a-space
                    v-else-if="column.key === 'method' && isLeaf(a)"
                    :size="2"
                  >
                    <a-tooltip :title="met(a).tip">
                      <span
                        role="img"
                        :aria-label="met(a).label"
                      >
                        <EditTwoTone
                          v-if="met(a).k === 'changed'"
                          aria-hidden="true"
                        />
                        <a-typography-text
                          v-else-if="met(a).k === 'none'"
                          type="warning"
                        >
                          <ExclamationCircleOutlined aria-hidden="true" />
                        </a-typography-text>
                        <a-typography-text
                          v-else
                          type="secondary"
                        >
                          <UserOutlined
                            v-if="met(a).k === 'manual'"
                            aria-hidden="true"
                          />
                          <FileTextOutlined
                            v-else
                            aria-hidden="true"
                          />
                        </a-typography-text>
                      </span>
                    </a-tooltip>
                    <a-tooltip
                      v-if="autoCat(a)"
                      :title="mapFill(t('Tilbage til automatisk: {kat}'), { kat: t(autoCat(a).label) })"
                    >
                      <a-button
                        type="text"
                        size="small"
                        :aria-label="mapFill(t('Sæt konto {nr} tilbage til automatisk: {kat}'), { nr: a.nr, kat: t(autoCat(a).label) })"
                        @click="toDefault(a)"
                      >
                        <template #icon>
                          <UndoOutlined aria-hidden="true" />
                        </template>
                      </a-button>
                    </a-tooltip>
                  </a-space>
                </template>
                <!-- Beløbene pr. måned (månederne i perioden står mørkere); statuskonti også primo -->
                <template #expandedRowRender="{ record: a }">
                  <div
                    role="group"
                    :aria-label="mapFill(t('Beløb pr. måned for konto {nr}'), { nr: a.nr })"
                  >
                    <a-space
                      wrap
                      :size="[18, 6]"
                    >
                      <a-space
                        v-if="a.type === 'Status'"
                        direction="vertical"
                        :size="0"
                      >
                        <a-typography-text type="secondary">
                          {{ t('Primo') }}
                        </a-typography-text>
                        <a-typography-text type="secondary">
                          {{ mapKr(a.primo) }}
                        </a-typography-text>
                      </a-space>
                      <a-space
                        v-for="(m, i) in months"
                        :key="m.key"
                        direction="vertical"
                        :size="0"
                      >
                        <a-typography-text type="secondary">
                          {{ t(m.label.split(' ')[0]) }}
                        </a-typography-text>
                        <a-typography-text :type="P.months.includes(m.key) ? undefined : 'secondary'">
                          {{ mapKr(a.months[i]) }}
                        </a-typography-text>
                      </a-space>
                    </a-space>
                  </div>
                </template>
              </a-table>
            </div>

            <MapperCategoryPanel
              :sel-acc="selAcc"
              :sel-stmt="selStmt"
              :count-for="countFor"
              :can-move="canMove"
              @move="moveTo"
              @clear="sel = {}"
            />
          </div>
        </template>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
/* Siden fylder hovedområdet: sidehoved, så et kort med værktøjslinjen og to ruder
   (tabellen og kategoripanelet), der ruller hver for sig */
.map-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.map-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  overflow: auto;
}

.map-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px 24px;
}

.map-head-text {
  min-width: 0;
  max-width: 820px;
}

.map-frame {
  flex: 1;
  min-height: 480px;
  display: flex;
  flex-direction: column;
}

.map-state {
  padding: 24px;
}

.map-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 16px 24px;
}

.map-period {
  width: 200px;
}

.map-actions {
  margin-left: auto;
}

.map-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
}

/* Tabellens rude ruller selv; overskriften bliver stående (tableComponents) */
.map-main {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

/* Kontonavnet kan klikkes (viser beløbene pr. måned) */
.map-main :deep(.map-name) {
  cursor: pointer;
}

/* Smalle skærme: panelet under tabellen */
@media (max-width: 1000px) {
  .map-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 46%);
  }

  .map-actions {
    margin-left: 0;
  }
}
</style>
