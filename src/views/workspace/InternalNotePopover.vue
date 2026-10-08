<script setup>
// Den interne note på et af kundens punkter (workspace.jsx: knappen i OutstandingItem L2949–2954
// og WSInotePop L2670–2710). Kun rådgiveren ser noten. Har punktet en note, står knappen altid
// fremme med et udfyldt ikon; ellers kun, når musen er over punktet (CustomerItemRow), når knappen
// har tastaturfokus, og mens noten er åben. Så viser ikonerne, hvilke punkter der har en note. På
// berøringsskærme (ingen hover) står knappen altid fremme. Skjult er den stadig et Tab-stop.
// Som en note i Excel: klik udenfor gemmer, Esc lukker uden at gemme. "Gem note" gemmer,
// "Slet noten" sletter. Knappen åbner kun noten; et klik på den, mens noten er åben, gør
// ingenting (som før). Fokus står i tekstfeltet, når noten åbner, og går tilbage til knappen,
// når den lukkes med tastaturet (Esc, Gem note, Slet noten).
// a-popover bruges uden egne udløsere (trigger []), så klik udenfor kan gemme, som før.
//
// Props: note = CW.internalNote(id) ({ text, by, at } eller null), label = punktets navn.
// Emits: save(tekst), delete.
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { MessageFilled, MessageOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsFill } from '@/domain/workspace/format'

const props = defineProps({
  note: { type: Object, default: null },
  label: { type: String, required: true },
})
const emit = defineEmits(['save', 'delete'])

const open = ref(false)
const txt = ref('')
const btn = ref(null)
const panel = ref(null)
// Noten lukkes kun én gang (gem, slet eller luk), som før
let done = false

const name = computed(() => wsFill(t('Intern note til {item}'), { item: props.label }))
const buttonEl = () => (btn.value && btn.value.$el) || null

function openNote () {
  if (open.value) return
  txt.value = props.note ? props.note.text : ''
  done = false
  open.value = true
}
function finish (action, refocus) {
  if (done) return
  done = true
  open.value = false
  if (action === 'save') emit('save', txt.value)
  else if (action === 'delete') emit('delete')
  if (refocus) CW.focusSoon(buttonEl())
}

// Klik udenfor noten (og udenfor knappen) gemmer
function onDocMousedown (e) {
  const el = e.target
  if (panel.value && panel.value.contains(el)) return
  if (el && el.closest && el.closest('.ws-inote-pop')) return
  const b = buttonEl()
  if (b && b.contains(el)) return
  finish('save', false)
}
function onKeydown (e) {
  if (e.key !== 'Escape') return
  e.preventDefault()
  e.stopPropagation()
  finish('close', true)
}

// Fokus i tekstfeltet, så snart noten er tegnet (uden at rulle siden)
let timer = null
function focusText () {
  let n = 0
  const tick = () => {
    const ta = panel.value && panel.value.querySelector('textarea')
    if (ta && ta.getClientRects().length) { ta.focus({ preventScroll: true }); return }
    if (++n < 20) timer = setTimeout(tick, 30)
  }
  nextTick(tick)
}
watch(open, (v) => {
  if (v) {
    document.addEventListener('mousedown', onDocMousedown, true)
    focusText()
  } else {
    document.removeEventListener('mousedown', onDocMousedown, true)
    clearTimeout(timer)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMousedown, true)
  clearTimeout(timer)
})
</script>

<template>
  <a-popover
    :visible="open"
    :trigger="[]"
    placement="bottomLeft"
    :title="t('Intern note')"
    overlay-class-name="ws-inote-pop"
    :overlay-style="{ width: '300px', maxWidth: 'calc(100vw - 16px)' }"
    :get-popup-container="(el) => el.parentNode"
    destroy-tooltip-on-hide
  >
    <template #content>
      <div
        ref="panel"
        class="ws-inote"
        role="dialog"
        :aria-label="name"
        @keydown="onKeydown"
      >
        <a-textarea
          v-model:value="txt"
          :rows="4"
          :placeholder="t('Skriv en note. Kunden ser den ikke.')"
          :aria-label="name"
        />
        <a-row
          justify="space-between"
          align="middle"
        >
          <a-col>
            <a-button
              v-if="note"
              type="text"
              size="small"
              @click="finish('delete', true)"
            >
              {{ t('Slet noten') }}
            </a-button>
          </a-col>
          <a-col>
            <a-button
              type="primary"
              size="small"
              @click="finish('save', true)"
            >
              {{ t('Gem note') }}
            </a-button>
          </a-col>
        </a-row>
      </div>
    </template>
    <a-button
      ref="btn"
      type="text"
      size="small"
      :class="['ws-inote-btn', { has: !!note }]"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-label="name"
      :title="note ? t('Intern note') + ': ' + note.text : t('Intern note')"
      @click="openNote"
    >
      <template #icon>
        <MessageFilled
          v-if="note"
          aria-hidden="true"
        />
        <MessageOutlined
          v-else
          aria-hidden="true"
        />
      </template>
    </a-button>
  </a-popover>
</template>

<style scoped>
/* Tekstfeltet over knapperne */
.ws-inote {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Noteknappen er usynlig (men kan stadig nås med Tab), til punktet har en note, musen er over
   punktets række (.ws-row i CustomerItemRow), knappen har tastaturfokus, eller noten er åben */
.ws-inote-btn {
  opacity: 0;
}

.ws-inote-btn.has,
.ws-inote-btn:focus-visible,
.ws-inote-btn[aria-expanded='true'],
.ws-row:hover .ws-inote-btn {
  opacity: 1;
}

/* Berøringsskærme kan ikke holde over rækken: der står knappen altid fremme */
@media (hover: none) {
  .ws-inote-btn {
    opacity: 1;
  }
}
</style>
