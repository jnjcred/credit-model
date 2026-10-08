<script setup>
/* Kommentarer til et tal i regnskabstabellen (financials.jsx: FinNotesPop, F:1392-1447): listen
   over kommentarerne og et felt til en ny. Indholdet af a-popover ved cellens kommentarknap
   (FinEditableCell). Feltet får fokus, når boksen åbner; Enter tilføjer; Esc lukker og giver
   fokus tilbage til cellen. Et klik udenfor lukker boksen (a-popover).
   Props: comments ([{ id, text, by, at }], ældste først)
   Emits: add(text), delete(id), close(outside) */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { t } from '@/i18n'
import { finShortDate } from '@/domain/financials/finFormat'

defineProps({
  comments: { type: Array, required: true },
})
const emit = defineEmits(['add', 'delete', 'close'])

const txt = ref('')
const root = ref(null)
let timer = null

// Fokus i feltet, så snart boksen er tegnet og vist (uden at siden ruller)
onMounted(() => {
  let n = 0
  const tick = () => {
    const input = root.value && root.value.querySelector('input')
    if (input) input.focus({ preventScroll: true })
    if (input && document.activeElement === input) return
    if (++n < 40) timer = setTimeout(tick, 25)
  }
  nextTick(tick)
})
onBeforeUnmount(() => clearTimeout(timer))

const add = () => { if (txt.value.trim()) { emit('add', txt.value.trim()); txt.value = '' } }
const onKeydown = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); emit('close', false) } }
const onInputKeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }
</script>

<template>
  <div
    ref="root"
    class="fin-notes"
    role="dialog"
    :aria-label="t('Kommentarer til tallet')"
    @keydown="onKeydown"
  >
    <a-list
      v-if="comments.length"
      class="fin-notes-list"
      size="small"
      :data-source="comments"
      :row-key="(c) => c.id"
    >
      <template #renderItem="{ item: c }">
        <a-list-item>
          <div class="fin-note">
            <a-typography-text type="secondary">
              {{ c.by }}{{ c.at ? ' · ' + finShortDate(c.at) : '' }}
            </a-typography-text>
            <div class="fin-note-text">
              {{ t(c.text) }}
            </div>
          </div>
          <template #actions>
            <a-button
              type="text"
              size="small"
              :title="t('Slet kommentaren')"
              :aria-label="t('Slet kommentaren')"
              @click="emit('delete', c.id)"
            >
              {{ t('Slet') }}
            </a-button>
          </template>
        </a-list-item>
      </template>
    </a-list>
    <a-input
      v-model:value="txt"
      :maxlength="500"
      autocomplete="off"
      :placeholder="comments.length ? t('Tilføj en kommentar') : t('Skriv en kommentar')"
      :aria-label="t('Ny kommentar')"
      @keydown="onInputKeydown"
    />
  </div>
</template>

<style scoped>
.fin-notes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 288px;
}

.fin-notes-list {
  max-height: 260px;
  overflow: auto;
}

.fin-note { min-width: 0; }

.fin-note-text {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
