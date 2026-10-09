<script setup>
/* Regnskabstabellen (Regnskab v5, designet "Graph redesign without takt v5") som a-table.
   Kolonnerne står i tre bånd efter kilde: Årsrapporter, Periodetal og Budget (finRegnskabColumns);
   båndet har AI-mærket, når tallene er læst af AI, og "Anmod", når kunden ikke har sendt dem
   ("Anmodet", når kunden allerede er bedt om dem; slået fra i demovisningen).
   Over perioden: pilen, der folder månederne ud (ERP), og "bogført til og med" (FinPeriodSelect);
   en uploadet saldobalance viser filens periode. Rækkerne er tabellens egne kategorier
   (finRegnskabRows): grupperne (Balance; Resultatopgørelse har ingen overskrift), Kontrol og, med "Vis nøgletal",
   Nøgletal. Tal i årene og i en uploadet saldobalances periode rettes som i et regneark
   (useFinCellEditing); summer, udledte rækker, kontroller, nøgletal, ERP-tal og budgettet rettes
   ikke her (ERP i kontomappingen, budgettet med Excel-import).
   Egne markeringer, som andre dele læser: #fin-annual-table, td[data-fin-cell="<post>|<kolonne>"],
   th[data-col] og th[data-fin-c1] (grafen måler kolonnerne), [data-fin-toggle] (fokus).
   Props: view (finRegnskabColumns), rows (finRegnskabRows), model, mask, edits, notes,
          locked (tal kan ikke rettes: sagen er indstillet, eller demovisningen er slået til),
          caseLocked (sagen er indstillet: perioden kan ikke vælges), unit, monthsOpen,
          showRatios, scrollSync (useScrollSync)
   Emits: toggle-row(key, open), toggle-months, set-period(t), ask(itemId)
   Slot: footer (kilderne under tabellen) */
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import { InfoCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { FIN_EDIT_COL, finAddNote, finCommentsFor, finDeleteNote } from '@/domain/financials/finEdits'
import { finFill } from '@/domain/financials/finFormat'
import { finCellEl, useFinCellEditing } from '../composables/useFinCellEditing'
import AiBadge from '@/components/common/AiBadge.vue'
import FinEditableCell from './FinEditableCell.vue'
import FinNumPill from './FinNumPill.vue'
import FinPeriodSelect from './FinPeriodSelect.vue'

const props = defineProps({
  view: { type: Object, required: true },
  rows: { type: Array, required: true },
  model: { type: Object, required: true },
  mask: { type: Object, default: null },
  edits: { type: Array, required: true },
  notes: { type: Array, required: true },
  locked: { type: Boolean, default: false },
  caseLocked: { type: Boolean, default: false },
  unit: { type: String, required: true },
  monthsOpen: { type: Boolean, default: false },
  showRatios: { type: Boolean, default: true },
  scrollSync: { type: Object, required: true },
})
const emit = defineEmits(['toggle-row', 'toggle-months', 'set-period', 'ask'])
// En tom grå linje under kolonnenavnet holder overskrifterne lige høje (hårdt mellemrum)
const NBSP = String.fromCharCode(160)
// Rækkenavne må bryde efter en skråstreg ("Vareforbrug/Produktionsomkostninger"), når rammen er
// smal: et usynligt brudsted (nul-bredde mellemrum), som skærmlæsere springer over
const ZWSP = String.fromCharCode(8203)
const lbl = (s) => t(s).split('/').join('/' + ZWSP)

const ed = useFinCellEditing({ model: toRef(props, 'model'), unit: toRef(props, 'unit'), locked: toRef(props, 'locked'), mask: toRef(props, 'mask') })
const editing = ed.editing

// Kommentarerne til et tal; den åbne kommentarboks: { ref, col }
const commentsOf = (ref, key) => finCommentsFor(props.notes, props.edits, ref, key)
const reasonFor = ref(null)
const notesOpenAt = (ref, key) => !!reasonFor.value && reasonFor.value.ref === ref && reasonFor.value.col === key
// Lukket med Esc: fokus tilbage til cellen. Lukket med et klik udenfor: fokus bliver, hvor man klikkede.
const onNotes = (cell, open, outside) => {
  if (open) { reasonFor.value = { ref: cell.ref, col: cell.editKey }; return }
  const r = reasonFor.value
  reasonFor.value = null
  if (!r) return
  if (!outside) CW.focusSoon(finCellEl(r.ref, r.col))
}

/* Vandret rulning: tabellen ruller i sin egen ramme, når den er bredere end siden (mange kolonner,
   månederne foldet ud), og følges af grafen (scrollSync). Ellers står kolonnenavnene fast øverst,
   mens siden ruller: den dokumenterede components-prop tegner tabellens <thead> med position
   sticky (antdv's sticky-prop deler overskrift og krop i to tabeller, så skærmlæsere ikke kan
   knytte cellerne til kolonneoverskrifterne). I en ramme, der ruller, kan overskriften ikke stå fast. */
const tableComponents = {
  header: { wrapper: (attrs, { slots }) => h('thead', { ...attrs, style: { position: 'sticky', top: 0, zIndex: 3 } }, slots.default ? slots.default() : []) },
}
const scroller = ref(null)
const wide = ref(false)
let ro = null
// Månederne foldet ud eller sammen: perioden (med pilen, der har fokus) rulles ind midt i rammen,
// når tabellen er målt, så den ikke står uden for billedet (grafen følger med, scrollSync)
let reveal = false
const revealPeriod = () => {
  const el = scroller.value
  const th = el && el.querySelector('th[data-col="real"]')
  if (!th || el.scrollWidth <= el.clientWidth + 1) return
  const box = el.getBoundingClientRect(), r = th.getBoundingClientRect()
  el.scrollLeft += (r.left + r.width / 2) - (box.left + box.width / 2)
}
const measure = () => {
  const el = scroller.value
  const table = el && el.querySelector('table')
  const next = !!table && table.scrollWidth > el.clientWidth + 1
  if (next !== wide.value) wide.value = next
  if (reveal) { reveal = false; nextTick(revealPeriod) }
}
watch(() => props.monthsOpen, () => { reveal = true }, { flush: 'sync' })
const setScroller = (el) => { scroller.value = el; props.scrollSync.register('table', el) }
onMounted(() => {
  if (window.ResizeObserver && scroller.value) {
    ro = new ResizeObserver(() => measure())
    ro.observe(scroller.value)
    const table = scroller.value.querySelector('table')
    if (table) ro.observe(table)
  }
  measure()
})
watch(() => props.view.cols.map(c => c.key).join(','), () => nextTick(() => {
  if (ro && scroller.value) { const table = scroller.value.querySelector('table'); if (table) ro.observe(table) }
  measure()
}))
onBeforeUnmount(() => { if (ro) ro.disconnect(); ro = null })

const scrollParent = () => {
  for (let p = scroller.value && scroller.value.parentElement; p && p !== document.body; p = p.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p
  }
  return null
}
// Kommentarboksen ligger i samme rullefelt som tabellen, så den følger tallet, når siden ruller
const popupContainer = () => scrollParent() || document.body

// Cellen, der rettes ("<post>|<kolonne>"). Kun den celle læser selve teksten, så en tast i feltet
// ikke tegner hele tabellen om.
const editingKey = computed(() => (editing.value ? editing.value.ref + '|' + editing.value.col : null))
const editingAt = (ref, key) => (editingKey.value === ref + '|' + key ? editing.value : null)

// Klasser for en kolonne: skel mellem båndene og i periodetallene, budgettets flade, måneder
const colCls = (c) => (c.sep === 'grp' ? ' fin-sep' : c.sep === 'sub' ? ' fin-sep-sub' : '') + (c.grp === 'bud' ? ' fin-z-bud' : '') + (c.month ? ' fin-month' : '')

// En celle, der kan rettes: et tal i en post, i et regnskabsår eller i den uploadede saldobalances periode
function editAttrs (cell) {
  const c = cell.col, k = cell.editKey
  const x = cell.edited
  const nCom = commentsOf(cell.ref, k).length
  const isEd = editingKey.value === cell.ref + '|' + k
  const name = t(cell.label) + ' ' + FIN_EDIT_COL[k].name()
  const aria = finFill(props.locked
    ? (x ? t('{post}, {tal}, rettet') : '{post}, {tal}')
    : (x ? t('{post}, {tal}, rettet, tryk Enter for at rette') : t('{post}, {tal}, tryk Enter for at rette')),
  { post: name, tal: cell.display || (cell.fillable ? t('Ikke oplyst') : '-') })
  return {
    'data-fin-cell': cell.ref + '|' + k,
    tabindex: props.locked && !x ? undefined : 0,
    'aria-label': aria,
    title: c.title,
    class: colCls(c) + ' fin-num' + (props.locked ? '' : ' fin-ed') + (x ? ' fin-edited' : '') + (nCom ? ' fin-hasnote' : '') +
      (isEd ? ' fin-editing' : '') + (notesOpenAt(cell.ref, k) ? ' fin-notes-open' : ''),
    onClick: () => ed.onCellClick(cell.ref, k),
    onKeydown: (e) => ed.onCellKeydown(e, cell.ref, k),
  }
}

// Attributter på cellerne (customCell): grupperækkerne er én celle over alle talkolonner
function cellAttrs (row, c, ci) {
  if (row.type === 'group') return { colSpan: ci === 0 ? props.view.cols.length : 0 }
  const cell = row.cells[ci]
  if (cell.edit) return editAttrs(cell)
  if (cell.control) return { class: colCls(c) + ' fin-num', title: cell.ok ? t('Stemmer') : t('Afvigelse') }
  return { class: colCls(c) + (cell.display ? ' fin-num' : ''), title: c.title }
}
function labelAttrs (row) {
  return { class: 'fin-c1', title: row.type === 'ratio' && row.note ? t(row.note) : undefined }
}
const hdCls = (c) => 'fin-hd' + colCls(c) + (c.grp === 'bud' ? ' fin-z-bud-h' : '')
// Mindste bredder efter designets fælles kolonnegitter: perioden og sammenligningen 136 px,
// måneder 84 px, år og budget 112 px (grafen måler kolonnerne og følger med)
const minWidth = (c) => ({ minWidth: (c.key === 'real' || c.key === 'cmp' ? 136 : c.month ? 84 : 112) + 'px' })

const columns = computed(() => [
  // Rækkenavnene er præcis så brede som det længste navn (width 1 %), så tallene og grafen får pladsen
  { key: 'label', title: t('Regnskabspost'), width: '1%',
    customHeaderCell: () => ({ class: 'fin-c1', 'data-fin-c1': '' }),
    customCell: (row) => labelAttrs(row) },
  ...props.view.bands.filter(b => b.n > 0).map(b => {
    const first = props.view.cols.find(c => c.grp === b.grp)
    return {
      key: 'band:' + b.grp, title: t(b.label), align: b.grp === 'ytd' ? 'right' : 'center', band: b,
      customHeaderCell: () => ({ class: 'fin-band' + (first && first.sep === 'grp' ? ' fin-sep' : '') + (b.grp === 'bud' ? ' fin-z-bud-h' : '') }),
      children: props.view.cols.map((c, ci) => ({ c, ci })).filter(({ c }) => c.grp === b.grp).map(({ c, ci }) => ({
        key: c.key, align: 'right', fin: c, ci,
        customHeaderCell: () => ({ 'data-col': c.key, class: hdCls(c), title: c.title, style: minWidth(c) }),
        customCell: (row) => cellAttrs(row, c, ci),
      })),
    }
  }),
])

const rowClass = (r) => (r.type === 'group' ? 'fin-grp' : r.type === 'entry' ? (r.memo ? 'fin-memo' : r.sum ? 'fin-sum' : '') : r.type === 'child' ? 'fin-child' : '')

// "Anmod" står under hvert årstal, hvor kunden ikke har sendt tallene, og gruppen kan anmodes om
const askOf = (c) => {
  if (!c || c.head.sub !== 'ikke modtaget') return null
  const band = props.view.bands.find(b => b.grp === c.grp)
  if (!band || !band.request) return null
  return band
}
const requestLabel = (id) => (id === 'm-budget' ? t('Anmod kunden om budget') : t('Anmod kunden om periodetal'))
const monthsLabel = computed(() => (props.monthsOpen ? t('Skjul måneder') : t('Vis måned for måned')))

// Kommentarer og nulstilling fra cellen
const addNote = (cell, text) => finAddNote(cell.ref, cell.editKey, text)
const deleteNote = (cell, id) => finDeleteNote(id, cell.ref, cell.editKey)
</script>

<template>
  <div
    :ref="setScroller"
    :class="['fin-table', { 'fin-wide-scroll': wide }]"
    @scroll="scrollSync.onScroll"
  >
    <a-table
      id="fin-annual-table"
      class="fin-tbl"
      size="small"
      table-layout="auto"
      :columns="columns"
      :data-source="rows"
      row-key="key"
      :pagination="false"
      :row-class-name="rowClass"
      :components="tableComponents"
    >
      <template #headerCell="{ column }">
        <template v-if="column.key === 'label'">
          <a-typography-text type="secondary">
            {{ t('Regnskabspost') }}
          </a-typography-text>
        </template>
        <!-- Båndet: kilden, AI-mærket og "Anmod", når kunden ikke har sendt tallene -->
        <span
          v-else-if="column.band"
          class="fin-band-row"
        >
          <template v-if="column.band.ai">
            <AiBadge
              plain
              compact
              :title="t(column.band.aiTip)"
            />
            <span class="sr-only">{{ t(column.band.aiTip) }}</span>
          </template>
          <span>{{ t(column.band.label) }}</span>
        </span>
        <!-- Perioden fra ERP: pilen folder månederne ud, og måneden kan vælges -->
        <span
          v-else-if="column.fin && column.fin.head.select"
          class="fin-head fin-head-real"
        >
          <span class="fin-head-line">
            <a-tooltip
              v-if="view.period.canExpand"
              :title="monthsLabel"
            >
              <a-button
                type="text"
                size="small"
                data-fin-toggle="months"
                :aria-expanded="monthsOpen"
                aria-controls="fin-annual-table"
                :aria-label="monthsLabel"
                @click="emit('toggle-months')"
              >
                <template #icon>
                  <LeftOutlined
                    :rotate="monthsOpen ? 180 : 0"
                    aria-hidden="true"
                  />
                </template>
              </a-button>
            </a-tooltip>
            <FinPeriodSelect
              :period="view.period"
              :disabled="caseLocked"
              @select="(m) => emit('set-period', m)"
            />
            <span>{{ column.fin.head.main }}</span>
          </span>
          <a-typography-text
            type="secondary"
            class="fin-head-note"
          >{{ NBSP }}</a-typography-text>
        </span>
        <!-- Kolonneoverskrift: (måneder) år, og en grå linje under (en tom linje holder rækken lige) -->
        <span
          v-else-if="column.fin"
          :class="['fin-head', { 'fin-head-month': column.fin.month }]"
        >
          <span class="fin-head-line">
            <a-typography-text
              v-if="column.fin.head.pre"
              type="secondary"
              class="fin-head-pre"
            >{{ column.fin.head.pre }}</a-typography-text>
            <span>{{ column.fin.head.main }}</span>
          </span>
          <!-- Ikke modtaget: en lille "Anmod"-knap (eller "anmodet") under årstallet i stedet for teksten -->
          <template v-if="askOf(column.fin)">
            <a-typography-text
              v-if="askOf(column.fin).asked"
              type="secondary"
              class="fin-head-note"
              :title="t('Kunden er bedt om det. Status står på Overblik.')"
            >{{ t('anmodet') }}</a-typography-text>
            <a-button
              v-else
              size="small"
              class="fin-head-ask"
              :disabled="askOf(column.fin).demo"
              :title="askOf(column.fin).demo ? t('Anmod virker ikke i demovisningen') : requestLabel(askOf(column.fin).request)"
              :aria-label="requestLabel(askOf(column.fin).request)"
              @click="emit('ask', askOf(column.fin).request)"
            >
              {{ t('Anmod') }}
            </a-button>
          </template>
          <a-typography-text
            v-else
            type="secondary"
            class="fin-head-note"
          >{{ column.fin.head.sub ? t(column.fin.head.sub) : NBSP }}</a-typography-text>
        </span>
      </template>

      <template #bodyCell="{ column, record: r }">
        <template v-if="column.key === 'label'">
          <a-typography-text
            v-if="r.type === 'group'"
            strong
          >
            {{ lbl(r.label) }}
          </a-typography-text>
          <!-- En post med detaljer: navnet folder dem ud og sammen -->
          <a-button
            v-else-if="r.type === 'entry' && r.expandable"
            type="text"
            size="small"
            class="fin-row-toggle"
            :aria-expanded="r.open"
            @click="emit('toggle-row', r.key, !r.open)"
          >
            <template #icon>
              <RightOutlined
                :rotate="r.open ? 90 : 0"
                aria-hidden="true"
              />
            </template>
            {{ lbl(r.label) }}
          </a-button>
          <span
            v-else-if="r.type === 'entry'"
            :class="r.memo ? 'fin-lbl fin-lbl-memo' : 'fin-lbl'"
            :title="r.note ? t(r.note) : undefined"
          >{{ lbl(r.label) }}</span>
          <span
            v-else-if="r.type === 'child'"
            class="fin-lbl fin-lbl-child"
          >{{ lbl(r.label) }}</span>
          <!-- Kontrol og nøgletal står med samme indrykning under deres overskrift -->
          <span
            v-else-if="r.type === 'control' || r.type === 'ratio'"
            class="fin-lbl"
          >{{ lbl(r.label) }}</span>
          <template v-else>
            {{ lbl(r.label) }}
          </template>
          <!-- Linjen under EBITDA, som saldobalancen sjældent har før årsafslutningen -->
          <a-tooltip
            v-if="r.warn"
            :title="t(r.warn)"
            :trigger="['hover', 'focus']"
          >
            <a-typography-text
              type="warning"
              class="fin-warn"
              tabindex="0"
              role="img"
              :aria-label="t(r.warn)"
            >
              <InfoCircleOutlined aria-hidden="true" />
            </a-typography-text>
          </a-tooltip>
        </template>
        <template v-else-if="r.type !== 'group' && column.fin">
          <FinEditableCell
            v-if="r.cells[column.ci].edit"
            :cell="r.cells[column.ci]"
            :comments="commentsOf(r.cells[column.ci].ref, r.cells[column.ci].editKey)"
            :locked="locked"
            :editing="editingAt(r.cells[column.ci].ref, r.cells[column.ci].editKey)"
            :notes-open="notesOpenAt(r.cells[column.ci].ref, r.cells[column.ci].editKey)"
            :unit="unit"
            :popup-container="popupContainer"
            @set-text="ed.setText"
            @editor-keydown="ed.onInputKeydown"
            @commit="ed.commitEdit"
            @notes="(open, outside) => onNotes(r.cells[column.ci], open, outside)"
            @add-note="(text) => addNote(r.cells[column.ci], text)"
            @delete-note="(id) => deleteNote(r.cells[column.ci], id)"
            @reset="ed.resetCell"
          />
          <a-typography-text
            v-else-if="r.cells[column.ci].control"
            :type="r.cells[column.ci].ok ? 'success' : 'danger'"
          >
            {{ r.cells[column.ci].display }}
          </a-typography-text>
          <template v-else-if="r.cells[column.ci].display">
            {{ r.cells[column.ci].display }}
            <FinNumPill
              v-if="r.cells[column.ci].pill"
              :pill="r.cells[column.ci].pill"
            />
          </template>
          <a-typography-text
            v-else
            type="secondary"
          >
            -
          </a-typography-text>
        </template>
      </template>

      <template #footer>
        <div class="fin-foot">
          <slot name="footer" />
        </div>
      </template>
    </a-table>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Domænetegning i tabellen (egne klasser fra customCell/customHeaderCell/row-class-name):
   skel mellem båndene, budgettets lyse orange flade (det eneste farvede bånd i designet),
   grupperækker, summer, markeringer af rettede og kommenterede tal og kommentar/nulstil-knapperne
   ved cellen. */
@fin-bud-head: #fbf5f0;
@fin-bud-cell: #fdfaf7;

/* Tabellens ramme er en container: rækkenavnene må bryde, når rammen er smal (se nederst) */
.fin-table { container-type: inline-size; }

/* Bredere end siden: tabellen ruller i sin egen ramme (grafen følger med), og rækkenavnene står
   fast i venstre side (som før v5), så tallene aldrig står uden navn */
.fin-wide-scroll {
  overflow-x: auto;
  overflow-y: hidden;
}

.fin-wide-scroll :deep(th.fin-c1),
.fin-wide-scroll :deep(td.fin-c1) {
  position: sticky;
  left: 0;
  z-index: 1;
  background: @component-background;
}

.fin-wide-scroll :deep(th.fin-c1) {
  z-index: 4;
  background: @table-header-bg;
}

.fin-table :deep(th),
.fin-table :deep(td) { white-space: nowrap; }

.fin-table :deep(.fin-num) { font-variant-numeric: tabular-nums; }

/* Rækkenavnene: grupperne har navnet i første kolonne; posterne er rykket ind som navnet på
   en post med detaljer (knappens ikon og mellemrum) */
.fin-table :deep(.fin-row-toggle) { text-align: left; }

/* inline-block: et navn, der bryder over to linjer, holder indrykningen på begge */
.fin-lbl {
  display: inline-block;
  padding-left: 29px;
}
.fin-lbl-memo { color: rgba(0, 0, 0, 0.65); }

.fin-lbl-child {
  padding-left: 44px;
  color: rgba(0, 0, 0, 0.65);
}

.fin-warn {
  margin-left: 6px;
  cursor: help;
}

.fin-head {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
}

.fin-head-line {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.fin-head-pre { font-weight: 600; }

.fin-head-note {
  font-size: 11px;
  font-weight: 400;
}

/* Månederne: små og grå som i designet */
.fin-head-month .fin-head-line {
  font-size: 12px;
  color: @text-color-secondary;
}

.fin-band-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 400;
}

.fin-head-ask {
  margin-top: 2px;
}

/* Grupperne (Årsrapporter, Periodetal, Budget) står med en tynd streg under deres egen overskrift, der kun går
   under gruppens kolonner (med luft til nabogruppen). Ingen lodrette streger gennem tabellen; budgettet skiller
   sig ud med sin farve. (Klasserne fin-sep og fin-sep-sub står stadig på cellerne, men tegner intet.) */
.fin-table :deep(th.fin-band) {
  border-bottom: 0;
  background-image: linear-gradient(@border-color-base, @border-color-base);
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: calc(100% - 24px) 1px;
}
/* Under Budget: samme grå streg som under de andre grupper (sættes igen, fordi budget-fladens baggrund ellers fjerner den) */
.fin-table :deep(th.fin-band.fin-z-bud-h) {
  background-image: linear-gradient(@border-color-base, @border-color-base);
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: calc(100% - 24px) 1px;
}

/* Budgettet: lys orange flade i hovedet og i cellerne */
.fin-table :deep(th.fin-z-bud-h) { background: @fin-bud-head; }
.fin-table :deep(td.fin-z-bud) { background: @fin-bud-cell; }

.fin-table :deep(tr.fin-sum > td) { font-weight: 600; }

/* Grupperækkerne (Resultatopgørelse, Balance, Kontrol, Nøgletal) */
.fin-table :deep(tr.fin-grp > td) { background: @background-color-light; }

/* Tal, der kan rettes: tekstmarkør, tynd kant ved hover og synligt fokus */
.fin-table :deep(td.fin-ed) {
  position: relative;
  cursor: text;
}

.fin-table :deep(td.fin-ed:hover) { box-shadow: inset 0 0 0 1px @border-color-base; }
.fin-table :deep(td.fin-ed:focus) { outline: none; }

.fin-table :deep(td.fin-ed:focus-visible) {
  background: @primary-1;
  box-shadow: inset 0 0 0 2px @primary-color;
}

/* Markeret eller redigeret celle ligger over nabocellerne, så kanten og knapperne til venstre
   ikke skæres af */
.fin-table :deep(td.fin-ed:hover),
.fin-table :deep(td.fin-ed:focus-within),
.fin-table :deep(td.fin-editing),
.fin-table :deep(td.fin-notes-open) { z-index: 2; }

/* Under rettelsen: hvid celle med primærkant; feltet ligger oven på tallet, så tabellen ikke hopper */
.fin-table :deep(td.fin-editing),
.fin-table :deep(td.fin-editing:hover) {
  background: @component-background;
  box-shadow: inset 0 0 0 2px @primary-color;
}

.fin-table :deep(.fin-ghost) { visibility: hidden; }

.fin-table :deep(.fin-ed-input) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  text-align: right;
}

.fin-table :deep(.fin-ed-input[aria-invalid='true']) { color: @error-color; }

/* Rettet tal: prik i øverste højre hjørne */
.fin-table :deep(.fin-editmark) {
  position: absolute;
  top: 1px;
  right: 1px;
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  cursor: help;
}

.fin-table :deep(.fin-editdot) {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: @primary-color;
}

/* Tal med kommentar: lille trekant i øverste venstre hjørne (som Excels noter) */
.fin-table :deep(td.fin-hasnote)::before {
  position: absolute;
  top: 0;
  left: 0;
  border-color: @orange-6 transparent transparent;
  border-style: solid;
  border-width: 6px 6px 0 0;
  content: '';
}

.fin-table :deep(td.fin-editing)::before { display: none; }

/* Kommentar og nulstil lige til venstre for cellen (uden for den): vises, når cellen holdes
   over, har fokus, rettes, eller kommentarerne er åbne */
.fin-table :deep(.fin-gutter) {
  position: absolute;
  top: 0;
  right: 100%;
  bottom: 0;
  display: none;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
}

.fin-table :deep(td.fin-ed:hover > .fin-gutter),
.fin-table :deep(td.fin-ed:focus-within > .fin-gutter),
.fin-table :deep(td.fin-editing > .fin-gutter),
.fin-table :deep(td.fin-notes-open > .fin-gutter) { display: flex; }

/* Under tabellen: Vis nøgletal og kilderne */
.fin-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
}

/* Smal ramme (f.eks. 1280 px skærm med sidebjælken): lange rækkenavne må bryde (mindst 200 px), så
   tabellen med år, periode og budget kan stå uden vandret rulning. Afgøres af tabellens egen
   bredde, ikke skærmens. */
@container (max-width: 1000px) {
  .fin-table :deep(td.fin-c1) { white-space: normal; }
  .fin-table :deep(th.fin-c1) { min-width: 200px; }
}
</style>
