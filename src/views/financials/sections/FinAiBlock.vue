<script setup>
// Én AI-tekst i Produkt, marked og branche (financials.jsx: FinAiBlock): titel med AI-mærke,
// synlige ikoner (Ret tekst, Kør AI igen, Gendan AI-teksten), redigering på stedet og en kort grå
// linje, når teksten er rettet eller skrevet om. headExtra står før ikonerne.
// Tilstanden ligger i localStorage via src/domain/financials/finAiTexts.js (finAiPatch sender
// 'fin-ai-texts'). Er der forbundet en AI, skriver "Kør AI igen" et nyt udkast efter prompten;
// ellers viser demoen det andet forberedte AI-udkast efter ca. 1,1 s (finAiRun).
// Gem, Gendan og Kør AI igen er flyttet ordret fra financials.jsx.
//
// Props: id (nøgle i FIN_AI_DEFS), title, small (kompakt række, fx PEST).
// Slots: headExtra (før ikonerne), after (føjes til teksten). Emits: ingen.
import { computed, ref } from 'vue'
import { EditOutlined, SyncOutlined, UndoOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { AI } from '@/domain/ai'
import { finAiAiText, finAiPatch, finAiRun, finAiState, finAiText } from '@/domain/financials/finAiTexts'
import { finFill } from '@/domain/financials/finFormat'
import { useWindowEvent } from '@/composables/useWindowEvent'
import AiBadge from '@/components/common/AiBadge.vue'
import FinIconBtn from './FinIconBtn.vue'

const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  small: { type: Boolean, default: false },
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
const restore = () => { finAiPatch(props.id, { edited: null, editedAt: null, editedBy: null }); CW.toast(t('AI-teksten er gendannet')) }
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
    : edited.value ? finFill(t('Rettet af {who} · {date}'), { who: st.editedBy || '', date: CW.fmtDate(st.editedAt) })
    : st.aiAt ? finFill(t('Nyt AI-udkast · {date}'), { date: CW.fmtDate(st.aiAt) }) : ''
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
        <AiBadge
          :edited="edited"
          :compact="small"
        />
      </a-space>
      <a-space
        class="fin-ai-tools"
        :size="4"
        wrap
      >
        <slot name="headExtra" />
        <template v-if="!editing">
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

.fin-ai-edit {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
</style>
