<script setup>
/* Regnskabstabellen (financials.jsx AnnualReportSection, F:1883-2023) som a-table. Kolonnerne er
   bånd efter kilde (Årsrapporter, Prognose; foldet ud: Årsrapporter, Realiseret kvartal og Budget)
   med årene og kvartalerne under; rækkerne er grupperne (Resultatopgørelse, Balance), Kontrol og
   Nøgletal (finTableRows). Tal, der kan rettes, rettes som i et regneark (useFinCellEditing);
   summer, udledte rækker, kontroller, nøgletal og kolonnerne 2026E og 2027B kan aldrig rettes.
   Egne markeringer, som andre dele læser: #fin-annual-table, td[data-fin-cell="<post>|<kolonne>"],
   th[data-col], th[data-fin-c1] og [data-fin-toggle] (grafen måler kolonnerne, fokus efter rettelser).
   Props: cols, bands (finBuildCols/finColGroups), rows (finTableRows), model, edits, notes,
          locked, unit, showQuarters, hasForecast
   Emits: toggle-quarters(open), toggle-row(key, open)
   Slot: footer (kilderne under tabellen) */
import { computed, h, ref, toRef } from 'vue'
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { finColCls } from '@/domain/financials/finColumns'
import { FIN_EDIT_COL, finAddNote, finCommentsFor, finDeleteNote } from '@/domain/financials/finEdits'
import { finFill } from '@/domain/financials/finFormat'
import { finCellEl, useFinCellEditing } from '../composables/useFinCellEditing'
import FinEditableCell from './FinEditableCell.vue'

const props = defineProps({
  cols: { type: Array, required: true },
  bands: { type: Array, required: true },
  rows: { type: Array, required: true },
  model: { type: Object, required: true },
  edits: { type: Array, required: true },
  notes: { type: Array, required: true },
  locked: { type: Boolean, default: false },
  unit: { type: String, required: true },
  showQuarters: { type: Boolean, default: false },
  hasForecast: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle-quarters', 'toggle-row'])
// En tom grå linje under kolonnenavnet holder overskrifterne lige høje (hårdt mellemrum)
const NBSP = String.fromCharCode(160)

const ed = useFinCellEditing({ model: toRef(props, 'model'), unit: toRef(props, 'unit'), locked: toRef(props, 'locked') })
const editing = ed.editing

// Kommentarerne til et tal; den åbne kommentarboks: { ref, col }
const commentsOf = (ref, colKey) => finCommentsFor(props.notes, props.edits, ref, colKey)
const reasonFor = ref(null)
const notesOpenAt = (ref, colKey) => !!reasonFor.value && reasonFor.value.ref === ref && reasonFor.value.col === colKey
// Lukket med Esc: fokus tilbage til cellen. Lukket med et klik udenfor: fokus bliver, hvor man klikkede.
const onNotes = (cell, open, outside) => {
  if (open) { reasonFor.value = { ref: cell.ref, col: cell.col.key }; return }
  const r = reasonFor.value
  reasonFor.value = null
  if (!r) return
  if (!outside) CW.focusSoon(finCellEl(r.ref, r.col))
}

// Kolonnenavnene følger med ned i toppen af det, siden ruller i (vinduet eller appens rullefelt),
// til man er forbi tabellen: den dokumenterede components-prop tegner tabellens <thead>, der står
// fast med samme position og z-index som antdv's egen faste overskrift. antdv's sticky-prop bruges
// ikke: den deler overskrift og krop i to tabeller, så skærmlæsere ikke kan knytte cellerne til
// kolonneoverskrifterne. Med kvartalerne foldet ud er tabellen bredere end siden og ruller vandret
// i sin egen ramme; så klæber kolonnenavnene ikke, og båndenes overskrifter kan gøre kolonnerne bredere.
// Tabellen tegnes forfra, når kvartalerne foldes ud eller sammen (key): antdv 3.2.13 fjerner ikke
// den vandrette rulning fra tabellens ramme igen, og i en ramme, der ruller, kan overskriften ikke
// stå fast i siden.
const tableComponents = {
  header: { wrapper: (attrs, { slots }) => h('thead', { ...attrs, style: { position: 'sticky', top: 0, zIndex: 3 } }, slots.default ? slots.default() : []) },
}
const root = ref(null)
const scrollParent = () => {
  for (let p = root.value && root.value.parentElement; p && p !== document.body; p = p.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p
  }
  return null
}
// Kommentarboksen ligger i samme rullefelt som tabellen, så den følger tallet, når siden ruller
const popupContainer = () => scrollParent() || document.body

// Cellen, der rettes ("<post>|<kolonne>"). Kun den celle læser selve teksten, så en tast i feltet
// ikke tegner hele tabellen om.
const editingKey = computed(() => (editing.value ? editing.value.ref + '|' + editing.value.col : null))
const editingAt = (ref, colKey) => (editingKey.value === ref + '|' + colKey ? editing.value : null)

// En celle, der kan rettes: et tal i en post, i et regnskabsår, en realiseret periode eller et budgetkvartal
function editAttrs (cell) {
  const c = cell.col
  const x = cell.edited
  const nCom = commentsOf(cell.ref, c.key).length
  const isEd = editingKey.value === cell.ref + '|' + c.key
  const name = t(cell.label) + ' ' + FIN_EDIT_COL[c.key].name()
  const aria = finFill(props.locked
    ? (x ? t('{post}, {tal}, rettet') : '{post}, {tal}')
    : (x ? t('{post}, {tal}, rettet, tryk Enter for at rette') : t('{post}, {tal}, tryk Enter for at rette')),
  { post: name, tal: cell.display || '-' })
  return {
    'data-fin-cell': cell.ref + '|' + c.key,
    tabindex: props.locked && !x ? undefined : 0,
    'aria-label': aria,
    class: finColCls(c) + ' fin-num' + (props.locked ? '' : ' fin-ed') + (x ? ' fin-edited' : '') + (nCom ? ' fin-hasnote' : '') +
      (isEd ? ' fin-editing' : '') + (notesOpenAt(cell.ref, c.key) ? ' fin-notes-open' : ''),
    onClick: () => ed.onCellClick(cell.ref, c.key),
    onKeydown: (e) => ed.onCellKeydown(e, cell.ref, c.key),
  }
}

// Attributter på cellerne (customCell): grupperækkerne er én celle over alle talkolonner
function cellAttrs (row, c, ci) {
  if (row.type === 'group') return { colSpan: ci === 0 ? props.cols.length : 0 }
  const cell = row.cells[ci]
  const style = c.minWidth ? { minWidth: c.minWidth + 'px' } : undefined
  if (cell.edit) return { ...editAttrs(cell), style }
  if (cell.control) return { class: finColCls(c) + ' fin-num', title: cell.ok ? t('Stemmer') : t('Afvigelse'), style }
  return { class: finColCls(c) + (cell.display ? ' fin-num' : ''), style }
}
function labelAttrs (row) {
  return { class: 'fin-c1', title: row.type === 'ratio' && row.note ? t(row.note) : undefined }
}

const columns = computed(() => [
  // Rækkenavnene er præcis så brede som det længste navn (width 1 %), så tallene og grafen over tabellen får pladsen
  { key: 'label', title: t('Regnskabspost'), fixed: 'left', width: props.showQuarters ? undefined : '1%',
    customHeaderCell: () => ({ class: 'fin-c1', 'data-fin-c1': '' }),
    customCell: (row) => labelAttrs(row) },
  ...props.bands.map(g => ({
    key: 'band:' + g.group, title: g.label, align: 'center', band: g,
    customHeaderCell: () => ({ class: 'fin-band' + (g.sep ? ' fin-sep' : '') + (g.zone ? ' fin-z-' + g.zone : '') }),
    children: props.cols.map((c, ci) => ({ c, ci })).filter(({ c }) => c.group === g.group).map(({ c, ci }) => ({
      key: c.key, align: 'right', fin: c, ci,
      customHeaderCell: () => ({ 'data-col': c.key, class: 'fin-hd' + finColCls(c), title: c.title ? t(c.title) : undefined,
        style: c.minWidth ? { minWidth: c.minWidth + 'px' } : undefined }),
      customCell: (row) => cellAttrs(row, c, ci),
    })),
  })),
])

const rowClass = (r) => (r.type === 'group' ? 'fin-grp' : r.type === 'entry' ? (r.memo ? 'fin-memo' : r.sum ? 'fin-sum' : '') : r.type === 'child' ? 'fin-child' : '')

// Kommentarer og nulstilling fra cellen
const addNote = (cell, text) => finAddNote(cell.ref, cell.col.key, text)
const deleteNote = (cell, id) => finDeleteNote(id, cell.ref, cell.col.key)
</script>

<template>
  <div
    ref="root"
    class="fin-table"
  >
    <a-table
      id="fin-annual-table"
      :key="showQuarters ? 'quarters' : 'years'"
      :class="['fin-tbl', { 'fin-q': showQuarters }]"
      size="small"
      table-layout="auto"
      :columns="columns"
      :data-source="rows"
      row-key="key"
      :pagination="false"
      :row-class-name="rowClass"
      :scroll="showQuarters ? { x: 'max-content' } : undefined"
      :components="tableComponents"
    >
      <template #headerCell="{ column }">
        <template v-if="column.key === 'label'">
          <a-typography-text type="secondary">
            {{ t('Regnskabspost') }}
          </a-typography-text>
        </template>
        <!-- Kvartalerne foldes ud fra prognosebåndet og sammen fra kvartalsbåndet, lige over de kolonner, det handler om -->
        <span
          v-else-if="column.band && column.band.group === 'prog'"
          class="fin-band-row"
        >
          <span>{{ column.band.label }}</span>
          <a-button
            v-if="hasForecast"
            size="small"
            shape="round"
            data-fin-toggle="expand"
            aria-expanded="false"
            aria-controls="fin-annual-table"
            :title="t('Vis kvartalerne bag 2026E og 2027B')"
            @click="emit('toggle-quarters', true)"
          >
            {{ t('Udfold kvartaler') }}
            <RightOutlined aria-hidden="true" />
          </a-button>
        </span>
        <span
          v-else-if="column.band && column.band.group === 'real'"
          class="fin-band-row"
        >
          <a-button
            size="small"
            shape="round"
            data-fin-toggle="collapse"
            aria-expanded="true"
            aria-controls="fin-annual-table"
            :title="t('Fold kvartalerne sammen til 2026E og 2027B')"
            @click="emit('toggle-quarters', false)"
          >
            <LeftOutlined aria-hidden="true" />
            {{ t('Fold sammen') }}
          </a-button>
          <span>{{ column.band.label }}</span>
        </span>
        <template v-else-if="column.band">
          {{ column.band.label }}
        </template>
        <!-- Kolonneoverskrift: lille årstal over budgetkvartalerne, etiketten og en grå linje (en tom linje holder rækken lige) -->
        <span
          v-else-if="column.fin"
          class="fin-head"
        >
          <a-typography-text
            v-if="column.fin.year"
            type="secondary"
            class="fin-head-year"
          >{{ column.fin.year }}</a-typography-text>
          <span>{{ column.fin.label }}</span>
          <a-typography-text
            type="secondary"
            class="fin-head-note"
          >{{ column.fin.note ? t(column.fin.note) : NBSP }}</a-typography-text>
        </span>
      </template>

      <template #bodyCell="{ column, record: r }">
        <template v-if="column.key === 'label'">
          <a-typography-text
            v-if="r.type === 'group'"
            strong
          >
            {{ t(r.label) }}
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
            {{ t(r.label) }}
          </a-button>
          <span
            v-else-if="r.type === 'entry'"
            :class="r.memo ? 'fin-lbl fin-lbl-memo' : 'fin-lbl'"
            :title="r.note ? t(r.note) : undefined"
          >{{ t(r.label) }}</span>
          <span
            v-else-if="r.type === 'child'"
            class="fin-lbl fin-lbl-child"
          >{{ t(r.label) }}</span>
          <span
            v-else-if="r.type === 'control'"
            class="fin-lbl"
          >{{ t(r.label) }}</span>
          <template v-else>
            {{ t(r.label) }}
          </template>
        </template>
        <template v-else-if="r.type !== 'group' && column.fin">
          <FinEditableCell
            v-if="r.cells[column.ci].edit"
            :cell="r.cells[column.ci]"
            :comments="commentsOf(r.cells[column.ci].ref, column.key)"
            :locked="locked"
            :editing="editingAt(r.cells[column.ci].ref, column.key)"
            :notes-open="notesOpenAt(r.cells[column.ci].ref, column.key)"
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
          </template>
          <a-typography-text
            v-else-if="r.cells[column.ci].col.kind !== 'pending'"
            type="secondary"
          >
            -
          </a-typography-text>
        </template>
      </template>

      <template #footer>
        <slot name="footer" />
      </template>
    </a-table>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Domænetegning i tabellen (egne klasser fra customCell/customHeaderCell/row-class-name):
   båndskel, fladetone for 2026E/2027B og for realiseret og budget, grupperækker, summer,
   markeringer af rettede og kommenterede tal og kommentar/nulstil-knapperne ved cellen. */
.fin-table :deep(th),
.fin-table :deep(td) { white-space: nowrap; }

.fin-table :deep(.fin-num) { font-variant-numeric: tabular-nums; }

/* Rækkenavnene: grupperne har navnet i første kolonne; posterne er rykket ind som navnet på
   en post med detaljer (knappens ikon og mellemrum) */
.fin-table :deep(.fin-row-toggle) { text-align: left; }
.fin-lbl { padding-left: 29px; }
.fin-lbl-memo { color: rgba(0, 0, 0, 0.65); }

.fin-lbl-child {
  padding-left: 44px;
  color: rgba(0, 0, 0, 0.65);
}

.fin-head {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
}

.fin-head-year,
.fin-head-note { font-size: 12px; }

.fin-head-note { font-weight: 400; }

.fin-band-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

/* Eneste lodrette streger: skellene mellem båndene */
.fin-table :deep(.fin-sep) { border-left: 1px solid @border-color-split; }

/* Delsummer træder frem, og 2026E og 2027B (udledte summer) har en anelse fladetone og samme
   vægt; i sumrækkerne er de stærkest (Source Sans Pro har vægtene 400, 600 og 700) */
.fin-table :deep(td.fin-est) {
  background: @background-color-light;
  font-weight: 600;
}

.fin-table :deep(tr.fin-sum > td) { font-weight: 600; }
.fin-table :deep(tr.fin-sum > td.fin-est) { font-weight: 700; }

/* Foldet ud: realiseret og budget har hver sin baggrundstone ned gennem kolonnerne */
.fin-table :deep(td.fin-z-real) { background: #f3f7fe; }
.fin-table :deep(td.fin-z-budget) { background: #fcf8f0; }

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

/* Markeret eller redigeret celle ligger over den klæbende rækkenavn-kolonne, så kanten og
   knapperne til venstre ikke skæres af */
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

/* Smal skærm uden kvartaler: lange rækkenavne må bryde (mindst 200 px), så 2027B ikke skæres af */
@media (max-width: 1180px) {
  .fin-table :deep(.fin-tbl:not(.fin-q) td.fin-c1) { white-space: normal; }
  .fin-table :deep(.fin-tbl:not(.fin-q) th.fin-c1) { min-width: 200px; }
}
</style>
