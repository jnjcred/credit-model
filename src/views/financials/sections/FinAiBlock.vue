<script setup>
// Én AI-tekst i Produkt, marked og branche (financials.jsx: FinAiBlock): titel med AI-mærke,
// synlige ikoner (Ret tekst, Kør AI igen, Gendan AI-teksten), redigering på stedet og en kort grå
// linje, når teksten er rettet eller skrevet om. headExtra står før ikonerne.
// Tilstanden ligger i localStorage via src/domain/financials/finAiTexts.js (finAiPatch sender
// 'fin-ai-texts'). Er der forbundet en AI, skriver "Kør AI igen" et nyt udkast efter prompten;
// ellers viser demoen det andet forberedte AI-udkast efter ca. 1,1 s (finAiRun).
// Gem, Gendan og Kør AI igen er flyttet ordret fra financials.jsx.
//
// Kommentar (commentable): rådgiveren kan skrive en kommentar til teksten. Den står under teksten, gemmes sammen
// med AI-tilstanden (note, noteAt, noteBy) og følger med teksten, når den hentes til Credit memo (finExportDocs).
// "Kør AI igen" og "Gendan" rører ikke kommentaren.
//
// Props: id (nøgle i FIN_AI_DEFS), title, small (kompakt række, f.eks. PEST), commentable.
// Slots: headExtra (før ikonerne), after (føjes til teksten). Emits: ingen.
import { computed, ref } from 'vue'
import { CommentOutlined, EditOutlined, SyncOutlined, UndoOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { AI } from '@/domain/ai'
import { finAiAiText, finAiPatch, finAiRun, finAiState, finAiText } from '@/domain/financials/finAiTexts'
import { finFill } from '@/domain/financials/finFormat'
import { useWindowEvent } from '@/composables/useWindowEvent'
import FinIconBtn from './FinIconBtn.vue'

const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  small: { type: Boolean, default: false },
  commentable: { type: Boolean, default: false },
})

// Teksten ligger i localStorage: tegn igen, når den ændres, og når AI-forbindelsen skifter
const ver = ref(0)
const bump = () => { ver.value++ }
useWindowEvent('fin-ai-texts', bump)
useWindowEvent('cw-ai-config-changed', bump)

const editing = ref(false)
const draft = ref('')
const busy = ref(false)
const s = computed(() => { ver.value; return finAiState(props.id) })
const text = computed(() => { ver.value; return finAiText(props.id) })
const edited = computed(() => s.value.edited != null)
const aiReady = computed(() => { ver.value; return !!(window.AI && typeof AI.isReady === 'function' && AI.isReady()) })

const editLabel = computed(() => finFill(t('Ret {navn}'), { navn: props.title }))
const runLabel = computed(() => finFill(aiReady.value ? t('Kør AI igen for {navn}') : t('Kør AI igen for {navn} (demo: viser et andet AI-udkast)'), { navn: props.title }))
const restoreLabel = computed(() => finFill(t('Gendan AI-teksten for {navn}'), { navn: props.title }))

// Fokus i tekstfeltet med markøren til sidst (feltet har id 'fin-ai-<id>', som før)
const startEdit = () => {
  draft.value = text.value
  editing.value = true
  setTimeout(() => {
    const ta = document.getElementById('fin-ai-' + props.id)
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length) }
  }, 30)
}
const save = () => {
  const v = draft.value.trim()
  if (!v) return
  // Samme tekst som AI'ens: ingen rettelse
  if (v === finAiAiText(props.id).trim()) finAiPatch(props.id, { edited: null, editedAt: null, editedBy: null })
  else finAiPatch(props.id, { edited: v, editedAt: new Date().toISOString(), editedBy: (DATA.ADVISOR && DATA.ADVISOR.name) || 'Mette Larsen' })
  editing.value = false
}
// Rådgiverens kommentar til teksten
const note = computed(() => (s.value.note ? { text: s.value.note, at: s.value.noteAt, by: s.value.noteBy } : null))
const noteEditing = ref(false)
const noteDraft = ref('')
const noteLabel = computed(() => finFill(t('Kommentar til {navn}'), { navn: props.title }))
const startNote = () => {
  noteDraft.value = note.value ? note.value.text : ''
  noteEditing.value = true
  setTimeout(() => { const ta = document.getElementById('fin-note-' + props.id); if (ta) ta.focus() }, 30)
}
const saveNote = () => {
  const v = noteDraft.value.trim()
  if (!v) { finAiPatch(props.id, { note: null, noteAt: null, noteBy: null }) } else { finAiPatch(props.id, { note: v, noteAt: new Date().toISOString(), noteBy: (DATA.ADVISOR && DATA.ADVISOR.name) || 'Mette Larsen' }) }
  noteEditing.value = false
}
const removeNote = () => { finAiPatch(props.id, { note: null, noteAt: null, noteBy: null }); CW.toast(t('Kommentaren er slettet')) }
const onNoteKey = (e) => {
  if (e.key === 'Escape') { e.stopPropagation(); noteEditing.value = false }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNote() }
}
// Mærkets hover: hvad det er, og hvornår det er hentet (står ikke længere som tekst under overskriften)
const restore = () => { finAiPatch(props.id, { edited: null, editedAt: null, editedBy: null, noAi: null }); CW.toast(t('AI-teksten er gendannet')) }
const run = () => {
  const go = () => {
    busy.value = true
    finAiRun(props.id).then(r => { CW.toast(r.real ? t('AI har skrevet et nyt udkast') : t('Demo: der er ikke forbundet en AI, så du ser et andet forberedt AI-udkast')) })
      .catch(err => { CW.toast(t('AI kunne ikke køre') + ': ' + (err && err.message || ''), { tone: 'danger' }) })
      .finally(() => { busy.value = false })
  }
  if (!edited.value) return go()
  CW.confirm({ title: t('Kør AI igen?'), text: t('AI skriver et nyt udkast, og din rettelse erstattes.'), confirmLabel: t('Kør AI igen') }).then(r => { if (r.ok) go() })
}
const meta = computed(() => {
  const st = s.value
  return busy.value ? (aiReady.value && typeof AI.canSearch === 'function' && AI.canSearch() ? t('AI søger på nettet og skriver … (kan tage et par minutter)') : t('AI skriver …'))
    : edited.value ? finFill(t('Rettet af {who} - {date}'), { who: st.editedBy || '', date: CW.fmtDate(st.editedAt) })
    : st.aiAt ? finFill(t('Nyt AI-udkast - {date}'), { date: CW.fmtDate(st.aiAt) }) : ''
})

// Esc fortryder (uden at lukke noget udenom), Ctrl/Cmd+Enter gemmer
function onKey (e) {
  if (e.key === 'Escape') { e.stopPropagation(); editing.value = false }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save() }
}
</script>

<template>
  <div
    class="fin-ai"
    :aria-busy="busy || undefined"
  >
    <div class="fin-ai-head">
      <a-space
        :size="8"
        wrap
      >
        <a-typography-text
          v-if="small"
          strong
        >
          {{ title }}
        </a-typography-text>
        <a-typography-text
          v-else
          strong
          role="heading"
          aria-level="3"
        >
          {{ title }}
        </a-typography-text>
      </a-space>
      <a-space
        class="fin-ai-tools"
        :size="4"
        wrap
      >
        <slot name="headExtra" />
        <template v-if="!editing">
          <FinIconBtn
            v-if="commentable && !note && !noteEditing"
            :label="noteLabel"
            :disabled="busy"
            @click="startNote"
          >
            <template #icon>
              <CommentOutlined aria-hidden="true" />
            </template>
          </FinIconBtn>
          <FinIconBtn
            :label="editLabel"
            :disabled="busy"
            @click="startEdit"
          >
            <template #icon>
              <EditOutlined aria-hidden="true" />
            </template>
          </FinIconBtn>
          <FinIconBtn
            :label="runLabel"
            :busy="busy"
            :disabled="busy"
            @click="run"
          >
            <template #icon>
              <SyncOutlined aria-hidden="true" />
            </template>
          </FinIconBtn>
          <FinIconBtn
            v-if="edited"
            :label="restoreLabel"
            :disabled="busy"
            @click="restore"
          >
            <template #icon>
              <UndoOutlined aria-hidden="true" />
            </template>
          </FinIconBtn>
        </template>
      </a-space>
    </div>
    <div
      v-if="editing"
      class="fin-ai-edit"
    >
      <a-textarea
        :id="'fin-ai-' + id"
        v-model:value="draft"
        :rows="small ? 3 : 4"
        :aria-label="editLabel"
        @keydown="onKey"
      />
      <a-space :size="8">
        <a-button
          type="primary"
          :disabled="!draft.trim()"
          @click="save"
        >
          {{ t('Gem') }}
        </a-button>
        <a-button @click="editing = false">
          {{ t('Annullér') }}
        </a-button>
      </a-space>
    </div>
    <a-spin
      v-else
      :spinning="busy"
      size="small"
    >
      <div>{{ text }}<slot name="after" /></div>
    </a-spin>
    <!-- Rådgiverens kommentar: under teksten, med hvem og hvornår -->
    <div
      v-if="commentable && !editing && (note || noteEditing)"
      class="fin-ai-note"
    >
      <template v-if="noteEditing">
        <a-textarea
          :id="'fin-note-' + id"
          v-model:value="noteDraft"
          :rows="3"
          :aria-label="noteLabel"
          :placeholder="t('Skriv en kommentar, der følger med, når teksten hentes til Credit memo')"
          @keydown="onNoteKey"
        />
        <a-space :size="8">
          <a-button
            type="primary"
            :disabled="!noteDraft.trim() && !note"
            @click="saveNote"
          >
            {{ t('Gem') }}
          </a-button>
          <a-button @click="noteEditing = false">
            {{ t('Annullér') }}
          </a-button>
        </a-space>
      </template>
      <template v-else>
        <a-typography-text strong>
          {{ t('Rådgiverens kommentar') }}
        </a-typography-text>
        <div class="fin-ai-note-text">
          {{ note.text }}
        </div>
        <a-space
          :size="4"
          wrap
        >
          <a-typography-text type="secondary">
            {{ note.by }} - {{ CW.fmtDate(note.at) }}
          </a-typography-text>
          <a-button
            type="link"
            size="small"
            :aria-label="t('Ret') + ' ' + noteLabel"
            @click="startNote"
          >
            {{ t('Ret') }}
          </a-button>
          <a-button
            type="link"
            size="small"
            :aria-label="t('Slet') + ' ' + noteLabel"
            @click="removeNote"
          >
            {{ t('Slet') }}
          </a-button>
        </a-space>
      </template>
    </div>
    <div
      v-if="!editing"
      aria-live="polite"
    >
      <a-typography-text
        v-if="meta"
        type="secondary"
      >
        {{ meta }}
      </a-typography-text>
    </div>
  </div>
</template>

<style scoped>
.fin-ai {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fin-ai-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.fin-ai-tools {
  margin-left: auto;
}

.fin-ai-note {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-top: 8px;
}

.fin-ai-note-text {
  white-space: pre-wrap;
}

.fin-ai-edit {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
</style>
