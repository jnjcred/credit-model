<script setup>
// Kundens punkter som tabel på Overblik (designet "Anmodet materiale v5"). Kolonnerne: pil,
// Materiale, Indhold (eller Senest påmindet), Anmodet og Handling. Et klik på rækken (eller pilen) folder den ud (MaterialRowDetails).
//   review   Til din gennemgang: Stil spørgsmål og Godkend (primær, til højre)
//   waiting  Afventer kunden: Træk tilbage til venstre og Påmind (primær) til højre (et stillet spørgsmål kan fortrydes)
//   done     Materiale på sagen, Fra kunden: Fortryd godkendelsen
// Noteknappen ved titlen står fremme, når punktet har en intern note, og ellers når musen er over
// rækken; den folder rækken ud og åbner noten. Status, tekster og handlinger står i
// wsOutstandingItem (src/domain/workspace/items.js); Indhold og historik i overview.js.
// Element-id'er, andre steder fokuserer: ws-item-<id> på rækken og data-act="approve" på Godkend.
//
// Props: entries (rækker fra wsCustomerList), kind, locked, labelledBy (id på overskriften).
// Emits: remind(ids) (Påmind kunden om punkterne).
import { computed, ref } from 'vue'
import { MessageFilled, MessageOutlined, RightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsFill } from '@/domain/workspace/format'
import { wsNeedsReview, wsOutstandingItem } from '@/domain/workspace/items'
import { wsItemContent } from '@/domain/workspace/overview'
import { wsItemRequestedAt } from '@/domain/workspace/request'
import { useCaseVersion } from '@/composables/useCaseVersion'
import ItemStatusIcon from './shared/ItemStatusIcon.vue'
import MaterialRowDetails from './MaterialRowDetails.vue'
import RejectItemModal from './RejectItemModal.vue'

const props = defineProps({
  entries: { type: Array, required: true },
  kind: { type: String, required: true },
  locked: { type: Boolean, default: false },
  labelledBy: { type: String, default: undefined },
})
const emit = defineEmits(['remind'])

const caseVersion = useCaseVersion()
const open = ref([])
const rejectId = ref(null)
const editingId = ref(null)
const draft = ref('')
const fileInput = ref(null)
let uploadRow = null

const request = computed(() => {
  caseVersion.value
  return CW.request()
})
const rows = computed(() => {
  caseVersion.value
  return props.entries.map((e) => {
    const id = e.it.id
    const m = wsOutstandingItem(e.it, e.s, props.locked || (e.dropped && !wsNeedsReview(e.s)), e.dropped, request.value, rejectId.value === id, {
      setRejecting: (v) => { rejectId.value = v ? id : null },
      onRemind: () => emit('remind', [id]),
    })
    return { key: id, e, m }
  })
})
const rejectRow = computed(() => rows.value.find(r => r.key === rejectId.value) || null)

// Samme kolonnebredder i alle tre tabeller (Til din gennemgang, Afventer kunden, Materiale på sagen), så kolonnerne
// står lige under hinanden: pil (40), Materiale (resten), Indhold eller Senest påmindet (220), Anmodet (140)
// og Handling (260). Anmodet er datoen, punktet blev anmodet, i alle tre tabeller
const columns = computed(() => [
  { key: 'exp', width: 40 },
  { key: 'title', title: t('Materiale') },
  props.kind === 'waiting'
    ? { key: 'reminded', title: t('Senest påmindet'), width: 220 }
    : { key: 'content', title: t('Indhold'), width: 220, ellipsis: true },
  { key: 'requested', title: t('Anmodet'), width: 140 },
  { key: 'act', title: t('Handling'), align: 'right', width: 260 },
])

const isOpen = (key) => open.value.includes(key)
function toggle (key) {
  open.value = isOpen(key) ? open.value.filter(k => k !== key) : open.value.concat([key])
  if (!isOpen(key) && editingId.value === key) editingId.value = null
}
// Et klik på rækken folder den ud, men ikke et klik på en knap, et link eller et felt i den
const customRow = (r) => ({
  id: 'ws-item-' + r.key,
  class: 'ws-mt-row',
  onClick: (ev) => {
    const el = ev.target
    if (el && el.closest && el.closest('button, a, input, textarea, label, [role="button"]')) return
    toggle(r.key)
  },
})

// Kolonnerne
const content = (r) => wsItemContent(r.e.s, props.kind)
const requestedAt = (r) => wsItemRequestedAt(request.value, r.key)
const reminded = (r) => {
  const e = CW.lastReminder(r.key)
  return e ? e.at : null
}
// Mærket ved titlen: hvad der er særligt ved punktet
function tagOf (r) {
  const s = r.e.s || {}
  if (r.m.quiet) return { text: t('Ikke længere påkrævet') }
  if (s.status === 'delegated') return { text: r.m.parts[0] || t('Sendt videre') }
  if (s.note && s.status !== 'noted' && s.by !== 'rådgiver' && s.noteKind !== 'system' && props.kind === 'review') return { text: t('Bemærkning fra kunde'), color: 'blue', title: s.note }
  if (r.m.optional && props.kind === 'waiting') return { text: t('Valgfri') }
  return null
}

// Den interne note: knappen folder rækken ud og åbner noten
function editNote (r) {
  if (!isOpen(r.key)) open.value = open.value.concat([r.key])
  editingId.value = r.key
  draft.value = r.m.inote ? r.m.inote.text : ''
  CW.focusSoon('#ws-note-' + r.key)
}
function saveNote (r) {
  r.m.saveNote(draft.value)
  editingId.value = null
  draft.value = ''
}
function cancelNote () {
  editingId.value = null
  draft.value = ''
}

// Upload for kunden: én skjult filvælger til tabellen, som lægger filerne på den række, der bad om dem
function pick (r) {
  uploadRow = r
  const f = fileInput.value
  if (f) { f.value = ''; f.click() }
}
function onFiles (ev) {
  const list = ev.target.files
  if (uploadRow && list && list.length) uploadRow.m.addFiles(Array.from(list))
  ev.target.value = ''
  uploadRow = null
}
</script>

<template>
  <div class="ws-mt">
    <input
      ref="fileInput"
      type="file"
      multiple
      hidden
      :aria-label="t('Upload filer for kunden')"
      @change="onFiles"
    >
    <a-table
      :columns="columns"
      :data-source="rows"
      row-key="key"
      :pagination="false"
      size="middle"
      table-layout="fixed"
      :scroll="{ x: 900 }"
      :custom-row="customRow"
      :expanded-row-keys="open"
      :show-expand-column="false"
      :aria-labelledby="labelledBy"
    >
      <template #bodyCell="{ column, record: r }">
        <template v-if="column.key === 'exp'">
          <a-button
            type="text"
            size="small"
            :aria-expanded="isOpen(r.key) ? 'true' : 'false'"
            :aria-label="wsFill(t('Vis detaljer for {item}'), { item: r.m.label })"
            @click="toggle(r.key)"
          >
            <template #icon>
              <span :class="['ws-mt-chev', { 'ws-mt-chev-open': isOpen(r.key) }]">
                <RightOutlined aria-hidden="true" />
              </span>
            </template>
          </a-button>
        </template>

        <template v-else-if="column.key === 'title'">
          <div class="ws-mt-title">
            <ItemStatusIcon v-bind="r.m.icon" />
            <a-typography-text
              strong
              class="ws-mt-label"
              :type="r.m.quiet ? 'secondary' : undefined"
            >
              {{ r.m.label }}
            </a-typography-text>
            <a-tooltip
              v-if="tagOf(r)"
              :title="tagOf(r).title"
            >
              <a-tag
                :color="tagOf(r).color"
                class="ws-mt-tag"
              >
                {{ tagOf(r).text }}
              </a-tag>
            </a-tooltip>
            <a-button
              type="text"
              size="small"
              :class="['ws-mt-note', { 'ws-mt-note-on': !!r.m.inote }]"
              :title="r.m.inote ? r.m.inote.text : t('Intern note')"
              :aria-label="wsFill(r.m.inote ? t('Intern note til {item}: {note}') : t('Tilføj intern note til {item}'), { item: r.m.label, note: r.m.inote ? r.m.inote.text : '' })"
              @click="editNote(r)"
            >
              <template #icon>
                <MessageFilled
                  v-if="r.m.inote"
                  aria-hidden="true"
                />
                <MessageOutlined
                  v-else
                  aria-hidden="true"
                />
              </template>
            </a-button>
          </div>
        </template>

        <template v-else-if="column.key === 'content'">
          <a-typography-text
            :type="content(r).muted ? 'secondary' : undefined"
            :title="content(r).text"
          >
            {{ content(r).text }}
          </a-typography-text>
        </template>

        <template v-else-if="column.key === 'requested'">
          <a-tooltip :title="request && request.deadline ? t('frist') + ' ' + CW.fmtDate(request.deadline) : undefined">
            <a-typography-text type="secondary">
              {{ requestedAt(r) ? CW.fmtDate(requestedAt(r)) : '-' }}
            </a-typography-text>
          </a-tooltip>
        </template>

        <template v-else-if="column.key === 'reminded'">
          <a-tooltip :title="reminded(r) ? CW.fmtWhen(reminded(r)) : undefined">
            <a-typography-text type="secondary">
              {{ reminded(r) ? CW.fmtDate(reminded(r)) : '-' }}
            </a-typography-text>
          </a-tooltip>
        </template>

        <template v-else-if="column.key === 'act'">
          <div
            v-if="r.m.showActions"
            class="ws-mt-act"
          >
            <template v-if="kind === 'review' && r.m.can.review">
              <a-button
                size="small"
                :aria-label="wsFill(t('Stil spørgsmål til {item}'), { item: r.m.label })"
                @click="rejectId = r.key"
              >
                {{ t('Stil spørgsmål') }}
              </a-button>
              <a-button
                type="primary"
                size="small"
                data-act="approve"
                :aria-label="wsFill(t('Godkend {item}'), { item: r.m.label })"
                @click="r.m.approve"
              >
                {{ t('Godkend') }}
              </a-button>
            </template>
            <template v-else-if="kind === 'waiting'">
              <a-button
                v-if="r.m.can.withdraw"
                size="small"
                :title="t('Åbner anmodningen, hvor du fravælger punktet. Du vælger, om kunden får en mail.')"
                :aria-label="wsFill(t('Træk {item} tilbage'), { item: r.m.label })"
                @click="r.m.withdraw"
              >
                {{ t('Træk tilbage') }}
              </a-button>
              <a-button
                v-if="r.m.can.undoQuestion"
                size="small"
                :title="t('Punktet står igen til gennemgang, og spørgsmålet forsvinder fra kundens side')"
                :aria-label="wsFill(t('Fortryd spørgsmålet om {item}'), { item: r.m.label })"
                @click="r.m.undoQuestion"
              >
                {{ t('Fortryd') }}
              </a-button>
              <a-button
                v-if="r.m.can.remind"
                type="primary"
                size="small"
                :aria-label="wsFill(t('Påmind kunden om {item}'), { item: r.m.label })"
                @click="r.m.remind"
              >
                {{ t('Påmind') }}
              </a-button>
            </template>
            <a-button
              v-else-if="kind === 'done' && r.m.can.unapprove"
              size="small"
              :aria-label="wsFill(t('Fortryd godkendelse af {item}'), { item: r.m.label })"
              @click="r.m.unapprove"
            >
              {{ t('Fortryd godkendelse') }}
            </a-button>
          </div>
        </template>
      </template>

      <template #expandedRowRender="{ record: r }">
        <MaterialRowDetails
          :e="r.e"
          :m="r.m"
          :kind="kind"
          :locked="locked"
          :editing="editingId === r.key"
          :draft="draft"
          @update:draft="(v) => { draft = v }"
          @upload="pick(r)"
          @edit-note="editNote(r)"
          @save-note="saveNote(r)"
          @cancel-note="cancelNote"
        />
      </template>
    </a-table>
    <RejectItemModal
      v-if="rejectRow"
      :it="rejectRow.e.it"
      @close="rejectId = null"
      @done="rejectRow.m.doReject"
    />
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Tabellen i en tynd ramme, som i designet */
.ws-mt {
  overflow: hidden;
  border: @border-width-base @border-style-base @border-color-split;
  border-radius: @border-radius-base;
}

.ws-mt-row {
  cursor: pointer;
}

/* Pilen drejer, når rækken foldes ud */
.ws-mt-chev {
  display: inline-flex;
  transition: transform 0.3s @ease-in-out;
}

.ws-mt-chev-open {
  transform: rotate(90deg);
}

/* Titlen brydes inden i sig selv, så ikon, mærke og noteknap bliver på linjen */
.ws-mt-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ws-mt-label {
  min-width: 0;
}

.ws-mt-tag {
  margin-right: 0;
  font-weight: normal;
}

/* Noteknappen: fremme med en note, ellers kun ved hover, fokus eller på berøringsskærme */
.ws-mt-note {
  color: @text-color-secondary;
  opacity: 0;
}

.ws-mt-note-on {
  color: @primary-color;
  opacity: 1;
}

.ws-mt-row:hover .ws-mt-note,
.ws-mt-note:focus-visible {
  opacity: 1;
}

@media (hover: none) {
  .ws-mt-note {
    opacity: 1;
  }
}

.ws-mt-act {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
</style>
