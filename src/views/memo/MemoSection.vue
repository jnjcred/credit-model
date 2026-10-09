<script setup>
// Et afsnit i det indbyggede memo (memo.jsx: MemoSection, L3534-3982): overskrift, AI-assistent, selve
// teksten, tabellens værktøjslinje og gennemgangen.
// Teksten er et contenteditable-element, og dens HTML er memoets data (src/domain/memo: status,
// gennemgang, tomme felter, eksport og kildekontrol læser den). ant-design-vue har ingen
// rich-text-editor, så elementet er ukontrolleret: Vue giver det aldrig børn eller v-html. HTML'en
// skrives én gang ved montering (den låste version, det gemte eller skabelonens udkast) og derefter kun
// af brugeren, af afsnittets API (AI, chat, "Generér memo") og af nulstil/fortryd/tabeloperationer.
// Gemmes i localStorage memo4:<afsnit> (på engelsk :en) ved hvert input. Siden genmonterer afsnittet
// (:key), når en anden version vises.
// - Rådgiveren retter i en blok skrevet af AI eller skabelonen: ophavet bevares, men skifter til "rettet"
//   (data-ai="edited"). Udkastmærket bliver, til afsnittet markeres som gennemgået.
// - Et klik (eller en pil) ind i en pladsholder som "[dato]" markerer hele pladsholderen.
// - Indsæt fra Excel/Word beholder tabeller og lister (renset med cleanHtml); andet indsættes som ren tekst.
// - Tab flytter mellem cellerne i en tabel; uden for tabeller fanges Tab ikke (ingen tastaturfælde).
// - Programmatiske ændringer (AI, chat, nulstil, gennemgang, tabel) tager et fortryd-trin først
//   (memo4:snap:<afsnit>); "Fortryd" i overskriften ruller det sidste trin tilbage.
// - "Nulstil afsnit" (resetTrigger tæller op) nulstiller kun, når tælleren ændrer sig i et redigerbart afsnit.
//   Tælleren overlever genmonteringer, men en genmontering (f.eks. når en anden version vises) nulstiller ikke
//   igen, og en låst visning nulstiller eller gemmer aldrig noget.
// Ikke porteret (død kode): API-metoderne replace, replaceSelection og snapCount (ingen kalder dem) og
// pladsholdervisningen isPlaceholder (altid false).
//
// Props: id (ms-<nøgle>), sKey, num, title (dansk nøgle), st (memoSectionStatus), readOnly, lockedHtml (den
//        låste versions HTML eller null), resetTrigger (tæller fra siden), commentCount (åbne kommentarer),
//        aiOpen, aiSelection ({ text, range, sKey } fra "Omskriv markeringen" eller null), docLang
//        (overskriftens sprog i en låst version, ellers null), isActive.
// Emits: focus-section(nøgle | null, ændret), add-comment(nøgle), register-api(nøgle, api | null),
//        toggle-ai(nøgle), close-ai, connect-ai, reviewed-next(nøgle), unreviewed(nøgle).
// API'et (register-api ved montering, null ved afmontering): getHtml, getText, append(html, action),
// paint(html), commit(html), snapshot(action), undo().
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { PlusOutlined, UndoOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { MEMO_REVIEWER, SEC } from '@/domain/memo/memoTemplates'
import { emitMemoChanged, markTouched, memoKey, memoTouchedKey, saveReview, stampSeed } from '@/domain/memo/memoReview'
import { memoSectionStatus } from '@/domain/memo/memoStatus'
import { _memoTL } from '@/domain/memo/memoFormat'
import { decorateCites } from '@/domain/memo/memoCite'
import { _memoLastRange, _memoSaveSelection, setMemoLastEditable } from '@/domain/memo/memoSelection'
import { loadSnaps, popSnap, pushSnap, snapLabel } from '@/domain/memo/memoUndo'
import { cellAtSelection, focusCell, siblingCell, tableDeleteCol, tableDeleteRow, tableInsertCol, tableInsertRow } from '@/domain/memo/memoTable'
import { cleanHtml } from '@/domain/memo/memoAi'
import { useWindowEvent } from '@/composables/useWindowEvent'
import AiSectionAssistant from './ai/AiSectionAssistant.vue'
import MemoTableBar from './MemoTableBar.vue'
import MemoReviewRow from './MemoReviewRow.vue'

const props = defineProps({
  id: { type: String, required: true },
  sKey: { type: String, required: true },
  num: { type: String, required: true },
  title: { type: String, required: true },
  st: { type: Object, default: null },
  readOnly: { type: Boolean, default: false },
  lockedHtml: { type: String, default: null },
  resetTrigger: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  aiOpen: { type: Boolean, default: false },
  aiSelection: { type: Object, default: null },
  docLang: { type: String, default: null },
  isActive: { type: Boolean, default: false },
})
const emit = defineEmits(['focus-section', 'add-comment', 'register-api', 'toggle-ai', 'close-ai', 'connect-ai', 'reviewed-next', 'unreviewed'])

const storageKey = memoKey(props.sKey)
// Skabelonens tekst bærer sit eget ophavsmærke, se stampSeed
const defaultHtml = stampSeed(SEC[props.sKey] || '')
// Det redigerbare element (et DOM-element: kun som template-ref, aldrig i anden reaktiv tilstand)
const bodyEl = ref(null)
const modified = ref(localStorage.getItem(storageKey) !== null)
const secName = computed(() => props.num + '. ' + t(props.title))

function persist () {
  if (!bodyEl.value) return
  localStorage.setItem(storageKey, bodyEl.value.innerHTML)
  modified.value = true
  emitMemoChanged(props.sKey)
}

/* Gør afsnittet styrbart udefra: AI-assistenten, chatten og "Generér memo" skriver alle igennem det her
   lille API. Gem altid det der stod før, så ændringen kan rulles tilbage. Det der skrives her er
   maskintekst, så en tidligere gennemgang gælder ikke længere. */
const snap = (action) => { if (bodyEl.value) pushSnap(props.sKey, bodyEl.value.innerHTML, action); saveReview(props.sKey, null) }
const api = {
  getHtml: () => (bodyEl.value ? bodyEl.value.innerHTML : ''),
  getText: () => (bodyEl.value ? bodyEl.value.innerText : ''),
  append: (html, action) => {
    if (!bodyEl.value) return
    snap(action || 'chat')
    bodyEl.value.insertAdjacentHTML('beforeend', html)
    persist()
  },
  // Bruges mens der streames. Tager bevidst intet snapshot: ét snapshot per afsnit tages før streamingen
  // går i gang, ikke ét per opdatering.
  paint: (html) => { if (bodyEl.value) bodyEl.value.innerHTML = html },
  // Afslutter en streaming: gemmer, men snapshotter ikke, da det allerede er gjort før streamingen begyndte.
  commit: (html) => { if (bodyEl.value) { bodyEl.value.innerHTML = html; persist() } },
  snapshot: (action) => snap(action),
  undo: () => {
    const last = popSnap(props.sKey)
    if (!last || !bodyEl.value) return null
    bodyEl.value.innerHTML = last.html
    if (last.action === 'review') saveReview(props.sKey, null)
    persist()
    return last
  },
}

// Nulstil, når siden beder om det (resetTrigger tæller op). Også her skal der kunne fortrydes: en
// nulstilling kaster brugerens egen tekst væk, ikke bare AI'ens.
function reset () {
  if (bodyEl.value) pushSnap(props.sKey, bodyEl.value.innerHTML, 'reset')
  localStorage.removeItem(storageKey)
  // Tilbage til skabelonens udkast: gennemgangen gælder ikke længere
  saveReview(props.sKey, null)
  try { localStorage.removeItem(memoTouchedKey(props.sKey)) } catch (e) {}
  if (bodyEl.value) bodyEl.value.innerHTML = defaultHtml
  modified.value = false
  emitMemoChanged(props.sKey)
}
watch(() => props.resetTrigger, (v) => { if (v !== 0 && !props.readOnly) reset() })

// Skabelonens vejledning: foldet, når afsnittet har tekst. Antallet tælles i afsnittets egen tekst, efter
// hver ændring af status.
const showGuide = ref(false)
const guideCount = ref(0)
function countGuide () {
  if (bodyEl.value) guideCount.value = bodyEl.value.querySelectorAll('.tpl-hints, .tpl-hint, .tpl-note, .tpl-guide').length
}
watch(() => props.st, countGuide, { flush: 'post' })
const guideFolded = computed(() => !!(props.st && props.st.hasContent) && guideCount.value > 0 && !showGuide.value)
// Et dybdelink til et felt i vejledningen folder den ud
useWindowEvent('memo-show-guide', (e) => { if (e.detail && e.detail.sKey === props.sKey) showGuide.value = true })

// Fortryd-knappen i afsnitshovedet vises kun, når der er noget at fortryde
const snaps = shallowRef(loadSnaps(props.sKey))
useWindowEvent('memo-snap-changed', (e) => { if (!e.detail || e.detail.sKey === props.sKey) snaps.value = loadSnaps(props.sKey) })
const lastSnap = computed(() => snaps.value.slice(-1)[0] || {})
// Er gennemgangen det seneste trin, står fortryd ved "Gennemgået af" nederst
const showUndo = computed(() => snaps.value.length > 0 && !props.readOnly && !(props.st && props.st.reviewed && lastSnap.value.action === 'review'))

onMounted(() => {
  // Indholdet skrives én gang. Er sagen indstillet, vises den frosne version fra indstillingen, ikke det,
  // der måtte ligge i kladden.
  const el = bodyEl.value
  if (props.lockedHtml != null) {
    el.innerHTML = props.lockedHtml
  } else {
    const saved = localStorage.getItem(storageKey)
    el.innerHTML = saved !== null ? saved : defaultHtml
  }
  decorateCites(el)
  emit('register-api', props.sKey, api)
  countGuide()
})
onBeforeUnmount(() => emit('register-api', props.sKey, null))

function undoAi () {
  const last = popSnap(props.sKey)
  if (!last || !bodyEl.value) return
  bodyEl.value.innerHTML = last.html
  localStorage.setItem(storageKey, last.html)
  // Fortrydes en gennemgang, er afsnittet heller ikke gennemgået længere
  if (last.action === 'review') saveReview(props.sKey, null)
  modified.value = true
  emitMemoChanged(props.sKey)
}

/* Rådgiveren står inde for afsnittet. Udkast-mærkerne fjernes, men ophavet (data-ai) bliver, så man stadig
   kan se hvad maskinen skrev. Gemmer navn og tidspunkt. Kan fortrydes med Fortryd, som ethvert andet trin. */
function markReviewed () {
  if (!bodyEl.value) return false
  // Dobbeltklik, eller et klik på en knap, der ikke er tegnet om endnu: er afsnittet allerede gennemgået
  // (status læses frisk), sker der ingenting. Ellers kom der et ekstra fortryd-trin.
  if (memoSectionStatus(props.sKey).reviewed) return false
  pushSnap(props.sKey, bodyEl.value.innerHTML, 'review')
  bodyEl.value.querySelectorAll('.tpl-draft-label').forEach(lbl => lbl.remove())
  bodyEl.value.querySelectorAll('.tpl-draft').forEach(d => d.classList.remove('tpl-draft'))
  // Teksten gemmes først: gennemgangen får et fingeraftryk af det gemte
  persist()
  saveReview(props.sKey, { by: MEMO_REVIEWER, at: new Date().toISOString() })
  return true
}
function onReview () { if (markReviewed()) emit('reviewed-next', props.sKey) }

/* Fortryd gennemgangen fra linjen "Gennemgået af …". Var gennemgangen det seneste trin, rulles teksten
   tilbage med udkastmærkerne. Ellers (f.eks. en gennemgang fra før fortryd-trinene) fjernes kun gennemgangen. */
function undoReview () {
  const last = loadSnaps(props.sKey).slice(-1)[0]
  if (last && last.action === 'review') undoAi()
  else { saveReview(props.sKey, null); emitMemoChanged(props.sKey) }
  emit('unreviewed', props.sKey)
}

/* Et klik (eller en pil) ind i en pladsholder som "[dato]" markerer hele pladsholderen, så det, man skriver,
   erstatter den i stedet for at havne inde i klammerne. Har brugeren selv markeret noget, røres det ikke. */
function selectBlank (target) {
  if (props.readOnly || !bodyEl.value || !target || !target.closest) return
  const bl = target.closest('.tpl-blank')
  if (!bl || !bodyEl.value.contains(bl)) return
  const sel = window.getSelection()
  if (!sel || !sel.isCollapsed) return
  const r = document.createRange()
  r.selectNodeContents(bl)
  sel.removeAllRanges()
  sel.addRange(r)
}

function onInput () {
  if (!bodyEl.value) return
  /* Rådgiveren retter i en blok skrevet af AI'en eller skabelonen. Ophavet BEVARES, men skifter til
     "rettet". Sporet må ikke forsvinde, for så kan ingen bagefter se hvad maskinen skrev. Udkast-mærket
     bliver også stående: at rette et ord er ikke det samme som at stå inde for hele afsnittet. Det fjernes
     først med "Markér som gennemgået". */
  try {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && sel.anchorNode) {
      let el = sel.anchorNode
      if (el.nodeType === 3) el = el.parentElement
      const block = el && el.closest ? el.closest('[data-ai]') : null
      const o = block ? block.getAttribute('data-ai') : null
      if (o === 'ai' || o === 'chat' || o === 'seed') block.setAttribute('data-ai', 'edited')
    }
  } catch (e) { /* selection may be unavailable; ignore */ }

  // Der er skrevet i en pladsholder: den er ikke tom længere og mister sin stil
  try {
    const sel = window.getSelection()
    let n = sel && sel.anchorNode
    if (n && n.nodeType === 3) n = n.parentElement
    const bl = n && n.closest ? n.closest('.tpl-blank') : null
    if (bl && bodyEl.value.contains(bl)) {
      bl.classList.remove('tpl-blank')
      if (!bl.className) bl.removeAttribute('class')
    }
  } catch (e) {}

  localStorage.setItem(storageKey, bodyEl.value.innerHTML)
  markTouched(props.sKey)
  modified.value = true
  emitMemoChanged(props.sKey)
  emit('focus-section', props.sKey, true)
}

function onPaste (e) {
  // En kopieret tabel fra Excel eller Word skal beholde sin struktur. Den renses gennem samme filter som
  // AI-output, så der ikke følger fremmed styling og skjulte tags med ind i dokumentet.
  const html = e.clipboardData.getData('text/html')
  if (html) {
    const cleaned = cleanHtml(html)
    if (cleaned && /<(table|ul|ol|p|h3|h4)\b/i.test(cleaned)) {
      e.preventDefault()
      document.execCommand('insertHTML', false, cleaned)
      persist()
      return
    }
  }
  e.preventDefault()
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
}

function onKeydown (e) {
  if (e.key !== 'Tab') return
  // I en tabel flytter Tab mellem celler. Uden for tabeller fanges Tab ikke, så fokus kan forlade editoren
  // som alle andre steder. Før blev Tab brugt til indrykning, og man kunne ikke komme ud med tastaturet.
  const cell = cellAtSelection(bodyEl.value)
  if (!cell) return
  const next = siblingCell(cell, e.shiftKey ? -1 : 1)
  // Fra første eller sidste celle går Tab videre ud af tabellen, ellers bliver tabellen selv en fælde. Nye
  // rækker tilføjes med "Række under".
  if (!next) return
  e.preventDefault()
  focusCell(next)
}

/* Værktøjslinje der kun dukker op når markøren står i en tabel (cellen er et DOM-element) */
const tableCell = shallowRef(null)
function syncTableCell () { tableCell.value = cellAtSelection(bodyEl.value) }
const TABLE_OPS = { insertRow: tableInsertRow, deleteRow: tableDeleteRow, insertCol: tableInsertCol, deleteCol: tableDeleteCol }
function tableOp (name, arg) {
  if (!tableCell.value || !bodyEl.value) return
  pushSnap(props.sKey, bodyEl.value.innerHTML, 'table')
  const target = TABLE_OPS[name](tableCell.value, arg)
  markTouched(props.sKey)
  persist()
  if (target) focusCell(target)
  setTimeout(syncTableCell, 0)
}

function onMouseUp (e) {
  selectBlank(e.target)
  setMemoLastEditable(bodyEl.value)
  _memoSaveSelection()
  syncTableCell()
}
function onKeyUp (e) {
  // Markøren flyttes ind i en pladsholder med piltasterne: hele pladsholderen markeres
  if (/^Arrow/.test(e.key) && !e.shiftKey) { const s = window.getSelection(); const n = s && s.anchorNode; selectBlank(n && (n.nodeType === 3 ? n.parentElement : n)) }
  setMemoLastEditable(bodyEl.value)
  _memoSaveSelection()
  syncTableCell()
}
function onFocus () {
  setMemoLastEditable(bodyEl.value)
  if (!props.readOnly) emit('focus-section', props.sKey, modified.value)
}
function onBlur () {
  setTimeout(syncTableCell, 150)
  emit('focus-section', null, false)
}

/* AI-assistenten skriver i afsnittet. Med en markering ("Omskriv markeringen") erstattes kun den, og kun hvis
   den stadig ligger i dette afsnit; ellers returneres false, og assistenten siger, at markeringen er væk.
   Uden markering erstattes hele afsnittet. Begge tager et fortryd-trin og fjerner gennemgangen. */
function onAiReplace (html) {
  if (!bodyEl.value) return true
  if (props.aiSelection) {
    // Markeringen blev gemt da panelet blev åbnet. Ligger den ikke længere i dette afsnit, ville teksten
    // havne et vilkårligt andet sted uden at nogen opdagede det.
    const r = props.aiSelection.range || _memoLastRange
    if (!r || !bodyEl.value.contains(r.commonAncestorContainer)) return false
    pushSnap(props.sKey, bodyEl.value.innerHTML, 'selection')
    bodyEl.value.focus()
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(r)
    document.execCommand('insertHTML', false, html)
  } else {
    pushSnap(props.sKey, bodyEl.value.innerHTML, 'rewrite')
    bodyEl.value.innerHTML = html
  }
  // Ny maskintekst: afsnittet er ikke gennemgået længere
  saveReview(props.sKey, null)
  persist()
  return true
}
function onAiAppend (html) {
  if (!bodyEl.value) return true
  pushSnap(props.sKey, bodyEl.value.innerHTML, 'chat')
  bodyEl.value.insertAdjacentHTML('beforeend', html)
  saveReview(props.sKey, null)
  persist()
  return true
}
const getHtml = () => (bodyEl.value ? bodyEl.value.innerHTML : '')
</script>

<template>
  <div
    :id="id"
    :class="['memo-sec', { active: isActive, 'guide-folded': guideFolded }]"
    :data-reviewed="st && st.reviewed ? '1' : undefined"
  >
    <div class="memo-sec-head">
      <!-- Indstillet: ingen nye kommentarer i den låste version. Først i rækkefølgen (som før), men vist yderst til højre. -->
      <a-tooltip
        v-if="!readOnly"
        :title="t('Tilføj kommentar til dette afsnit')"
      >
        <a-button
          shape="circle"
          size="small"
          class="memo-sec-add"
          :aria-label="t('Tilføj kommentar til') + ' ' + secName"
          :aria-description="t('Tilføj kommentar til dette afsnit')"
          @click.stop="emit('add-comment', sKey)"
        >
          <template #icon>
            <PlusOutlined aria-hidden="true" />
          </template>
        </a-button>
      </a-tooltip>
      <a-typography-text
        type="secondary"
        class="memo-sec-num"
      >
        {{ num }}
      </a-typography-text>
      <a-typography-title
        :id="id + '-h'"
        :level="2"
        tabindex="-1"
        class="memo-sec-title"
      >
        {{ docLang ? _memoTL(docLang, title) : t(title) }}
      </a-typography-title>
      <a-button
        v-if="!readOnly"
        size="small"
        class="memo-sec-ai"
        :title="t('Lad AI skrive eller omskrive dette afsnit')"
        :aria-label="t('Skriv med AI') + ': ' + secName"
        :aria-expanded="String(!!aiOpen)"
        @click="emit('toggle-ai', sKey)"
      >
        {{ t('Skriv med AI') }}
      </a-button>
      <a-button
        v-if="st && st.hasContent && guideCount > 0"
        :type="showGuide ? 'link' : 'text'"
        size="small"
        class="memo-guide-btn"
        :aria-pressed="String(showGuide)"
        :title="showGuide ? t('Skjul skabelonens vejledning') : t('Vis skabelonens vejledning')"
        @click="showGuide = !showGuide"
      >
        {{ t('Vejledning') }} ({{ guideCount }})
      </a-button>
      <a-button
        v-if="showUndo"
        size="small"
        :title="t('Fortryd') + ': ' + snapLabel(lastSnap.action) + '. ' + snaps.length + ' ' + t('trin gemt.')"
        @click="undoAi"
      >
        <template #icon>
          <UndoOutlined aria-hidden="true" />
        </template>
        {{ t('Fortryd') }}
      </a-button>
      <a-typography-text
        v-if="commentCount > 0"
        type="secondary"
        class="memo-sec-count"
      >
        {{ commentCount }} {{ commentCount === 1 ? t('kommentar') : t('kommentarer') }}
      </a-typography-text>
    </div>

    <!-- AI-panelet åbner lige under overskriften (nederst i et langt afsnit lignede det, at intet skete) -->
    <AiSectionAssistant
      v-if="aiOpen && !readOnly"
      class="memo-sec-ai-panel"
      :s-key="sKey"
      :num="num"
      :title="title"
      :selection="aiSelection"
      :on-connect="() => emit('connect-ai')"
      :get-html="getHtml"
      :on-replace="onAiReplace"
      @append="onAiAppend"
      @close="emit('close-ai')"
    />

    <!-- Teksten: ukontrolleret contenteditable (aldrig Vue-børn eller v-html i elementet) -->
    <div
      ref="bodyEl"
      class="memo-body"
      :contenteditable="!readOnly"
      role="textbox"
      aria-multiline="true"
      :aria-readonly="readOnly ? 'true' : undefined"
      :aria-label="secName"
      @input="onInput"
      @paste="onPaste"
      @keydown="onKeydown"
      @mouseup="onMouseUp"
      @keyup="onKeyUp"
      @focus="onFocus"
      @blur="onBlur"
    />

    <MemoTableBar
      v-if="tableCell"
      @op="tableOp"
    />

    <!-- Gennemgang: rådgiveren står aktivt inde for afsnittet -->
    <MemoReviewRow
      :id="id"
      :st="st"
      :read-only="readOnly"
      :sec-name="secName"
      @review="onReview"
      @undo-review="undoReview"
    />
  </div>
</template>

<style scoped lang="less">
@import (reference) '../../styles/memo-layout.less';

/* Afsnittene står med luft imellem; et hop til et afsnit lander under den faste værktøjslinje */
.memo-sec {
  margin-bottom: 34px;
  scroll-margin-top: 64px;
}

/* Overskriftsrækken: nummer, titel og afsnittets knapper; brydes, hvis der ikke er plads */
.memo-sec-head {
  display: flex;
  flex-wrap: wrap;
  gap: @memo-head-gap;
  align-items: center;
  margin-bottom: 10px;
}

.memo-sec-num {
  flex-shrink: 0;
  width: @memo-num-width;
}

/* Titlen står i rækken (ingen overskriftsmargin over eller under; rækken giver luften) */
.memo-sec-head .memo-sec-title {
  flex: 1;
  min-width: 160px;
  margin: 0;
}

/* Overskriften får fokus fra siden (hop og "gå til næste"); den er ikke et tabulatorstop */
.memo-sec-title:focus {
  outline: none;
}

.memo-sec-count {
  white-space: nowrap;
}

/* "+" står først i tabulatorrækkefølgen (som før), men vises yderst til højre i rækken */
.memo-sec-add {
  order: 1;
}

/* "+" og "Skriv med AI" står kun fremme i det afsnit, man arbejder i (ellers stod de i alle 14 afsnit): "+" ved
   hover over afsnittet og med tastaturfokus på knappen, "Skriv med AI" også med fokus i afsnittet, på det aktive
   afsnit og mens panelet er åbent. De er kun gennemsigtige, så de stadig kan nås med Tab, klikkes og læses op.
   På berøringsskærme (ingen hover) står de altid fremme. */
.memo-sec-add,
.memo-sec-ai {
  opacity: 0;
}

.memo-sec:hover .memo-sec-add,
.memo-sec-add:focus-visible,
.memo-sec:hover .memo-sec-ai,
.memo-sec:focus-within .memo-sec-ai,
.memo-sec.active .memo-sec-ai,
.memo-sec-ai[aria-expanded='true'],
.memo-sec-ai:focus-visible {
  opacity: 1;
}

@media (hover: none) {
  .memo-sec-add,
  .memo-sec-ai {
    opacity: 1;
  }
}

/* Teksten rykkes ind under titlen (afsnitsnummerets kolonne) */
.memo-body {
  min-height: 20px;
  padding-left: @memo-text-indent;
}

/* AI-assistenten står under overskriften, rykket ind som teksten */
.memo-sec-ai-panel {
  margin: 0 0 14px @memo-text-indent;
}
</style>
