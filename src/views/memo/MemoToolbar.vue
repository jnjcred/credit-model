<script setup>
// Formateringslinjen over memoets tekst (memo.jsx: MemoToolbar L2750-2936) og kildevælgeren "@ Kilde"
// (WSMemo L7078-7121). Står fast øverst, mens dokumentet ruller, og virker på det afsnit, markøren står i
// eller sidst stod i.
// - Fed, Kursiv, Normal tekst, Overskrift 2 og 3, Citat, Punktliste, Nummerliste, Tabel (2 rækker × 3
//   kolonner), Fortryd og Annullér fortryd. Knapperne viser formatet dér, hvor markøren står.
// - Kommandoen køres på den huskede markering (src/domain/memo/memoSelection.js). Med musen bliver fokus i
//   teksten (mousedown forhindres); med tastaturet går fokus tilbage til knappen bagefter. Uden en markering:
//   beskeden "Klik først i teksten, der skal formateres."
// - Tastatur: ét tabulatorstop (roving tabindex); piletaster, Home og End flytter mellem knapperne; Esc går
//   tilbage til teksten med markeringen; Alt+F10 i teksten flytter fokus hertil.
// - "@ Kilde" åbner listen over sagens dokumenter (a-dropdown + useMenuKeyboard); et valg indsætter en
//   kildehenvisning med den markerede tekst (siden gør det: insert-cite). Esc lukker listen og går tilbage
//   til teksten med markeringen, som før.
// - Står markøren i et afsnit, der er ændret: "Redigeret" og "Nulstil afsnit" (uden bekræftelse: det kan
//   fortrydes med afsnittets Fortryd).
// Kendt fra prototypen (bevaret): "Nulstil afsnit" kan ikke nås med tastaturet (Alt+F10 tager fokus fra
// afsnittet, så knappen forsvinder), og pegede tabulatorstoppet på den knap, har linjen intet stop.
//
// Props: focusedKey (afsnittet med markøren, hvis det er ændret; ellers null), citeOpen (kildelisten er åben).
// Emits: reset(afsnitsnøgle), open-cite-picker, insert-cite(dokument fra DATA.DOCS), close-cite-picker.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  OrderedListOutlined, RedoOutlined, TableOutlined, UndoOutlined, UnorderedListOutlined,
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { MEMO_EN } from '@/domain/memo/memoTemplates'
import { _memoRememberSelection, _memoRestoreSelection } from '@/domain/memo/memoSelection'
import { useMenuKeyboard } from '@/composables/useMenuKeyboard'

defineProps({
  focusedKey: { type: String, default: null },
  citeOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['reset', 'open-cite-picker', 'insert-cite', 'close-cite-picker'])

const fmt = ref({ bold: false, italic: false, block: '', ul: false, ol: false })
const focusIdx = ref(0)
const barEl = ref(null)

function update () {
  _memoRememberSelection()
  // Knapperne viser formatet der, hvor markøren sidst stod i memoet
  const a = document.activeElement
  if (!a || !a.closest || !a.closest('.memo-body')) return
  try {
    const block = document.queryCommandValue('formatBlock').toLowerCase().replace(/[<>]/g, '')
    fmt.value = {
      bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), block,
      ul: document.queryCommandState('insertUnorderedList'), ol: document.queryCommandState('insertOrderedList'),
    }
  } catch (e) {}
}
// Alt+F10 flytter fokus fra teksten til værktøjslinjen, som i andre editorer
function onKey (e) {
  if (e.altKey && e.key === 'F10' && barEl.value) {
    e.preventDefault()
    const b = barEl.value.querySelector('button[tabindex="0"]') || barEl.value.querySelector('button')
    if (b) b.focus()
  }
}
onMounted(() => {
  document.addEventListener('selectionchange', update)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', update)
  document.removeEventListener('keydown', onKey)
})

/* Kommandoen køres på den huskede markering. Med musen bliver fokus i teksten (mousedown forhindres). Med
   tastaturet går fokus tilbage til knappen bagefter, så man kan fortsætte i værktøjslinjen. */
function run (e, fn) {
  const viaKeyboard = e && e.detail === 0
  const btn = e && e.currentTarget
  if (!_memoRestoreSelection()) {
    CW.toast(t('Klik først i teksten, der skal formateres.'), { tone: 'info' })
    return
  }
  fn() // execCommand sender selv et input-event, så afsnittet gemmes
  _memoRememberSelection()
  if (viaKeyboard && btn) setTimeout(() => btn.focus(), 0)
}
function cmd (command, value) { document.execCommand(command, false, value || null) }

function insertTable () {
  cmd('insertHTML', `<table><thead><tr><th>${t('Kolonne')} 1</th><th>${t('Kolonne')} 2</th><th style="text-align:right">${t('Kolonne')} 3</th></tr></thead><tbody><tr><td>&#8203;</td><td>&#8203;</td><td>&#8203;</td></tr><tr><td>&#8203;</td><td>&#8203;</td><td>&#8203;</td></tr></tbody></table><p><br></p>`)
}

const blockIs = (b) => fmt.value.block === b
// Knapperne i rækkefølge; sep = skillelinje. Fed og kursiv er bogstaverne F og K på dansk (B og I på
// engelsk), som i Word; navnet står i aria-label og tooltip. Trykket ind (aria-pressed) vises som type "link",
// ellers "text": begge er knapper uden kant. antdv lægger kantede knapper i en klik-animation, så et skift
// mellem "default" og "text" ville bygge knappen om, og fokus (tastaturet går tilbage til knappen efter en
// kommando) ville gå tabt.
const items = computed(() => [
  { k: 'b', ch: MEMO_EN ? 'B' : 'F', label: t('Fed'), keys: 'Control+B', short: 'Ctrl+B', pressed: fmt.value.bold, fn: () => cmd('bold') },
  { k: 'i', ch: MEMO_EN ? 'I' : 'K', label: t('Kursiv'), keys: 'Control+I', short: 'Ctrl+I', pressed: fmt.value.italic, fn: () => cmd('italic') },
  { sep: true, k: 's1' },
  { k: 'p', ch: '¶', label: t('Normal tekst'), pressed: blockIs('p') || blockIs('div') || blockIs(''), fn: () => cmd('formatBlock', 'p') },
  { k: 'h2', ch: 'H2', label: t('Overskrift 2'), pressed: blockIs('h2'), fn: () => cmd('formatBlock', blockIs('h2') ? 'p' : 'h2') },
  { k: 'h3', ch: 'H3', label: t('Overskrift 3'), pressed: blockIs('h3'), fn: () => cmd('formatBlock', blockIs('h3') ? 'p' : 'h3') },
  { sep: true, k: 's2' },
  { k: 'q', ch: '❝', label: t('Citat'), pressed: blockIs('blockquote'), fn: () => cmd('formatBlock', blockIs('blockquote') ? 'p' : 'blockquote') },
  { sep: true, k: 's3' },
  { k: 'ul', icon: UnorderedListOutlined, label: t('Punktliste'), pressed: fmt.value.ul, fn: () => cmd('insertUnorderedList') },
  { k: 'ol', icon: OrderedListOutlined, label: t('Nummerliste'), pressed: fmt.value.ol, fn: () => cmd('insertOrderedList') },
  { k: 'tbl', icon: TableOutlined, label: t('Tabel'), title: t('Indsæt tabel (2 rækker × 3 kolonner)'), fn: insertTable },
  { sep: true, k: 's4' },
  { k: 'undo', icon: UndoOutlined, label: t('Fortryd'), keys: 'Control+Z', short: 'Ctrl+Z', fn: () => cmd('undo') },
  { k: 'redo', icon: RedoOutlined, label: t('Annullér fortryd'), keys: 'Control+Y', short: 'Ctrl+Y', fn: () => cmd('redo') },
])
// Knappernes plads i det roving tabulatorstop (skillelinjer tæller ikke): kommandoerne, så "@ Kilde",
// så "Nulstil afsnit"
const buttons = computed(() => items.value.filter(it => !it.sep))
const indexOf = (it) => buttons.value.indexOf(it)
const citeIdx = computed(() => buttons.value.length)
const resetIdx = computed(() => buttons.value.length + 1)
const tip = (it) => (it.title || it.label) + (it.short ? ' (' + it.short + ')' : '')

// Piletaster flytter mellem knapperne; værktøjslinjen er ét tabulatorstop
function onBarKey (e) {
  const btns = Array.from(barEl.value.querySelectorAll('button'))
  const i = btns.indexOf(document.activeElement)
  if (i < 0) return
  let n = null
  if (e.key === 'ArrowRight') n = (i + 1) % btns.length
  else if (e.key === 'ArrowLeft') n = (i - 1 + btns.length) % btns.length
  else if (e.key === 'Home') n = 0
  else if (e.key === 'End') n = btns.length - 1
  else if (e.key === 'Escape') { e.preventDefault(); _memoRestoreSelection(); return }
  if (n == null) return
  e.preventDefault()
  focusIdx.value = n
  btns[n].focus()
}

/* ── Kildevælgeren ─────────────────────────────────────────────────────────── */
// Sagens dokumenter (ikke Crediwires egne eksporter)
const citeDocs = computed(() => ((DATA && DATA.DOCS) || []).filter(doc => doc.origin !== 'export'))
const citeKeys = useMenuKeyboard()
// Esc i listen lukker den og går tilbage til teksten med markeringen (som før migrationen). Det samme gør
// Tab: useMenuKeyboard giver fokus til trigger(), og det er her teksten, ikke knappen.
const backToText = { focus: () => { _memoRestoreSelection() } }
function onCiteVisible (visible) {
  if (visible) {
    _memoRememberSelection()
    emit('open-cite-picker')
    citeKeys.attach({ menuId: 'memo-cite-menu', trigger: () => backToText, close: () => emit('close-cite-picker') })
  } else {
    citeKeys.detach()
    emit('close-cite-picker')
  }
}
function onCiteClick ({ key }) {
  citeKeys.detach()
  const doc = citeDocs.value.find(d => d.name === key)
  if (doc) emit('insert-cite', doc)
  else emit('close-cite-picker')
}
</script>

<template>
  <div class="memo-toolbar">
    <div
      ref="barEl"
      role="toolbar"
      :aria-label="t('Formatering af memoet')"
      aria-keyshortcuts="Alt+F10"
      @keydown="onBarKey"
    >
      <a-space
        :size="2"
        wrap
      >
        <template
          v-for="it in items"
          :key="it.k"
        >
          <a-divider
            v-if="it.sep"
            type="vertical"
          />
          <a-tooltip
            v-else
            :title="tip(it)"
          >
            <a-button
              :type="it.pressed ? 'link' : 'text'"
              size="small"
              class="memo-tb"
              :tabindex="indexOf(it) === focusIdx ? 0 : -1"
              :aria-label="it.label"
              :aria-description="tip(it)"
              :aria-pressed="it.pressed === undefined ? undefined : String(!!it.pressed)"
              :aria-keyshortcuts="it.keys"
              @mousedown.prevent
              @focus="focusIdx = indexOf(it)"
              @click="run($event, it.fn)"
            >
              <template
                v-if="it.icon"
                #icon
              >
                <component
                  :is="it.icon"
                  aria-hidden="true"
                />
              </template>
              <template
                v-else
                #default
              >
                <strong v-if="it.k === 'b'">{{ it.ch }}</strong>
                <em v-else-if="it.k === 'i'">{{ it.ch }}</em>
                <template v-else>
                  {{ it.ch }}
                </template>
              </template>
            </a-button>
          </a-tooltip>
        </template>
        <a-divider type="vertical" />
        <a-dropdown
          :trigger="['click']"
          :visible="citeOpen"
          @visible-change="onCiteVisible"
        >
          <a-button
            :type="citeOpen ? 'link' : 'text'"
            size="small"
            class="memo-tb"
            :tabindex="focusIdx === citeIdx ? 0 : -1"
            aria-haspopup="menu"
            :aria-expanded="String(!!citeOpen)"
            :title="t('Indsæt kildereference fra dokumenter i sagen')"
            @mousedown.prevent
            @focus="focusIdx = citeIdx"
          >
            {{ t('@ Kilde') }}
          </a-button>
          <template #overlay>
            <a-menu
              id="memo-cite-menu"
              class="memo-cite-menu"
              :aria-label="t('Indsæt kildehenvisning')"
              @click="onCiteClick"
            >
              <a-menu-item-group :title="t('Dokumenter i sagen')">
                <a-menu-item
                  v-for="doc in citeDocs"
                  :key="doc.name"
                >
                  <a-tag>{{ t(doc.type) }}</a-tag>
                  {{ doc.name }}
                  <a-typography-text
                    v-if="doc.year"
                    type="secondary"
                  >
                    {{ doc.year }}
                  </a-typography-text>
                </a-menu-item>
              </a-menu-item-group>
            </a-menu>
          </template>
        </a-dropdown>
        <template v-if="focusedKey">
          <a-divider type="vertical" />
          <a-typography-text type="secondary">
            {{ t('Redigeret') }}
          </a-typography-text>
          <a-button
            type="text"
            size="small"
            class="memo-tb"
            :tabindex="focusIdx === resetIdx ? 0 : -1"
            :title="t('Nulstil afsnittet til skabelonens udkast')"
            @mousedown.prevent
            @focus="focusIdx = resetIdx"
            @click="emit('reset', focusedKey)"
          >
            {{ t('Nulstil afsnit') }}
          </a-button>
        </template>
      </a-space>
    </div>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Linjen står fast øverst i dokumentkortet, mens siden ruller (kortet har overflow: clip, ikke hidden) */
.memo-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 4px 12px;
  background: @component-background;
  border-bottom: 1px solid @border-color-split;
}

/* Listen over sagens dokumenter ruller, hvis den er lang */
.memo-cite-menu {
  max-height: 320px;
  overflow-y: auto;
}
</style>
