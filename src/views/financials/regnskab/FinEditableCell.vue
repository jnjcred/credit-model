<script setup>
/* Indholdet af en celle i regnskabstabellen, der kan rettes (financials.jsx: editCell, F:1630-1706):
   prikken på et rettet tal, kommentar- og nulstil-knappen til venstre for cellen, feltet under
   rettelsen eller tallet. Selve <td> (data-fin-cell, tabindex, aria-label, klik og taster) sættes
   af FinAnnualTable via kolonnens customCell; tilstanden er i useFinCellEditing.
   Props: cell (fra finRegnskabRows: { col, editKey, ref, label, display, fillable, edited, orig, pill }),
          comments (finCommentsFor), locked, editing (rettelsen i denne celle: { text, bad, typed } eller
          null), notesOpen (kommentarerne til tallet er åbne), unit ('mio' | 'thousand'),
          popupContainer (elementet, kommentarboksen lægges i: sidens rullefelt)
   Regnskab v5: editKey er rettelsens kolonne (FIN_EDIT_COL: årene, eller 'ytd' for den uploadede
   saldobalances periode); orig er det oprindelige tal; pill står foran tallet (FinNumPill).
   Emits: set-text(text), editor-keydown(event), commit(how), notes(open, outside),
          add-note(text), delete-note(id), reset(edit) */
import { computed, nextTick, ref, watch } from 'vue'
import { MessageOutlined, UndoOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { FIN_EDIT_COL, finOrigOf } from '@/domain/financials/finEdits'
import { finFill, finShortDate } from '@/domain/financials/finFormat'
import { finMakeFmt } from '@/domain/financials/finColumns'
import FinNotesPopover from './FinNotesPopover.vue'
import FinNumPill from './FinNumPill.vue'

const props = defineProps({
  cell: { type: Object, required: true },
  comments: { type: Array, required: true },
  locked: { type: Boolean, default: false },
  editing: { type: Object, default: null },
  notesOpen: { type: Boolean, default: false },
  unit: { type: String, required: true },
  popupContainer: { type: Function, default: undefined },
})
const emit = defineEmits(['set-text', 'editor-keydown', 'commit', 'notes', 'add-note', 'delete-note', 'reset'])

const fmtU = (v) => finMakeFmt(props.unit)(v, {})
const x = computed(() => props.cell.edited)
const nCom = computed(() => props.comments.length)
const editCol = computed(() => FIN_EDIT_COL[props.cell.editKey || props.cell.col.key])
const name = computed(() => t(props.cell.label) + ' ' + editCol.value.name())
const origText = computed(() => (x.value ? (fmtU(props.cell.orig !== undefined ? props.cell.orig : finOrigOf(x.value)) || '-') : ''))
const markText = computed(() => (x.value
  ? finFill(t('Rettet af {navn} {dato}. Oprindeligt {tal} ({kilde}).'), { navn: x.value.by, dato: finShortDate(x.value.at), tal: origText.value, kilde: editCol.value.source() }).replace('..', '.')
  : ''))
const commentTitle = computed(() => (nCom.value ? finFill(nCom.value === 1 ? t('1 kommentar') : t('{n} kommentarer'), { n: nCom.value }) : t('Tilføj kommentar')))
const commentLabel = computed(() => finFill(nCom.value ? t('Se kommentarer til {post} ({n})') : t('Tilføj kommentar til {post}'), { post: name.value, n: nCom.value }))

// Feltet får fokus, når rettelsen begynder; hele tallet markeres, medmindre man startede med at skrive
const input = ref(null)
watch(() => !!props.editing, (on) => { if (on) nextTick(() => { if (input.value) input.value.focus() }) }, { immediate: true })
const onFocus = (e) => { if (props.editing && !props.editing.typed) e.target.select() }
</script>

<template>
  <!-- Rettet tal: prik i hjørnet; hold musen over for at se, hvem der rettede, og det oprindelige tal -->
  <span
    v-if="x && !editing"
    class="fin-editmark"
    role="img"
    :title="markText"
    :aria-label="markText"
  ><span class="fin-editdot" /></span>
  <span
    v-if="!locked"
    class="fin-gutter"
  >
    <a-popover
      v-if="notesOpen"
      :visible="true"
      trigger="click"
      placement="bottomLeft"
      :get-popup-container="popupContainer"
      @visible-change="(v) => { if (!v) emit('notes', false, true) }"
    >
      <template #content>
        <FinNotesPopover
          :comments="comments"
          @add="(text) => emit('add-note', text)"
          @delete="(id) => emit('delete-note', id)"
          @close="(outside) => emit('notes', false, outside)"
        />
      </template>
      <a-button
        type="text"
        size="small"
        :title="commentTitle"
        :aria-label="commentLabel"
        @mousedown.stop
        @click.stop
      >
        <span class="fin-comment-btn">
          <a-typography-text :type="nCom ? 'warning' : undefined">
            <MessageOutlined aria-hidden="true" />
          </a-typography-text>
          <a-typography-text
            v-if="nCom > 0"
            strong
          >
            {{ nCom }}
          </a-typography-text>
        </span>
      </a-button>
    </a-popover>
    <a-button
      v-else
      type="text"
      size="small"
      :title="commentTitle"
      :aria-label="commentLabel"
      @mousedown.stop
      @click.stop="emit('notes', true)"
    >
      <span class="fin-comment-btn">
        <a-typography-text :type="nCom ? 'warning' : undefined">
          <MessageOutlined aria-hidden="true" />
        </a-typography-text>
        <a-typography-text
          v-if="nCom > 0"
          strong
        >
          {{ nCom }}
        </a-typography-text>
      </span>
    </a-button>
    <a-button
      v-if="x"
      type="text"
      size="small"
      :title="finFill(t('Nulstil til {tal}'), { tal: origText })"
      :aria-label="finFill(t('Nulstil {post} til {tal}'), { post: name, tal: origText })"
      @mousedown.stop
      @click.stop="emit('reset', x)"
    >
      <template #icon>
        <UndoOutlined aria-hidden="true" />
      </template>
    </a-button>
  </span>
  <template v-if="editing">
    <!-- Det viste tal bliver stående usynligt, så kolonnen beholder sin bredde -->
    <span
      aria-hidden="true"
      class="fin-ghost"
    >{{ cell.display || '-' }}</span>
    <a-input
      ref="input"
      class="fin-ed-input"
      size="small"
      :bordered="false"
      :value="editing.text"
      inputmode="decimal"
      :aria-label="finFill(t('Nyt tal for {post}'), { post: name })"
      :aria-invalid="editing.bad ? 'true' : undefined"
      :title="editing.bad ? t('Skriv et tal, f.eks. 41.100 eller -2.400') : undefined"
      @update:value="(v) => emit('set-text', v)"
      @focus="onFocus"
      @keydown="(e) => emit('editor-keydown', e)"
      @blur="emit('commit', 'blur')"
    />
  </template>
  <template v-else-if="cell.display">
    {{ cell.display }}
    <FinNumPill
      v-if="cell.pill"
      :pill="cell.pill"
    />
  </template>
  <a-typography-text
    v-else-if="cell.fillable"
    type="secondary"
    :title="t('Ikke oplyst i årsrapporten. Klik for at indtaste omsætningen.')"
  >
    -
  </a-typography-text>
  <template v-else>
    -
  </template>
</template>

<style scoped>
/* Ikon og antal ved siden af hinanden med luft mellem dem, så tallet ikke ligger oven i ikonet */
.fin-comment-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
