<script setup>
// Det indbyggede credit memo (memo.jsx: WSMemo L6041-7149). Vises i sagens
// fane Credit memo, når localStorage cw_memo_mode er 'builtin' (WorkspaceView.vue; ellers MemoHandoff.vue).
// Tre kolonner: afsnitslisten | dokumentet | kommentarer og "Spørg om sagen". Dokumentet ruller med sagens
// indhold (én rullebjælke); listen og skinnen står fast ved siden af.
// Siden ejer alt, der går på tværs af afsnittene:
//  - det aktive afsnit (følger rulningen; useActiveSection), status og kommentartællere pr. afsnit (regnes
//    igen kort efter hver ændring: useMemoChanged)
//  - afsnittenes API'er: hvert MemoSection melder sit API med register-api (null ved afmontering). Registret
//    er et almindeligt Map uden Vue-reaktivitet (afsnittenes HTML er aldrig reaktiv) og spejles til
//    window.__memoApis til de automatiske browsertests. AI ("Generér memo", chatten) og ophavstællingen
//    skriver og læser gennem det.
//  - dybdelink og versioner (useMemoDeepLink): window.CW_OPEN_MEMO / CW_OPEN_MEMO_VERSION
//  - den låste visning: er sagen indstillet (eller en tidligere version åbnet), vises den frosne version
//    skrivebeskyttet; afsnittene genmonteres (nøglen lockKey), når en anden version vises
//  - "Vis ophav", "Generér memo" (useMemoGeneration), AI-assistenten pr. afsnit og knappen "Omskriv
//    markeringen" (useSelectionFloat), kildehenvisningerne (useCiteDelegation) og kildevælgeren "@ Kilde"
//  - skinnen: under ca. 1440 px en knap i kanten (#memo-rail-toggle), der åbner skuffen #memo-drawer
// En fejl i memoet viser en rolig besked i stedet for siden: WorkspaceView.vue lægger MemoErrorBoundary.vue om memoet.
// Kendt fra prototypen (bevaret): dybdelinket { comments: true } åbner ikke skuffen; "Luk" i skuffen
// lukker uden at give knappen fokus (Esc giver den fokus); chattens historik går tabt, når fanen skifter;
// en ny kommentar sender ikke 'memo-changed'.
//
// Props og emits: ingen (sagen monterer siden med :key, så den starter forfra, når rullefeltet skifter).
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { CommentOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { MEMO_EN, MEMO_SECTIONS } from '@/domain/memo/memoTemplates'
import { MEMO_SCAFFOLD, memoKey, sectionHtml } from '@/domain/memo/memoReview'
import { memoCommentCounts, memoSectionStatus } from '@/domain/memo/memoStatus'
import { memoLocked, memoLockedReview, memoSubmittedAt } from '@/domain/memo/memoView'
import { _memoLastEditable, _memoLastRange, _memoSaveSelection } from '@/domain/memo/memoSelection'
import { decorateCites } from '@/domain/memo/memoCite'
import { markAsDraft } from '@/domain/memo/memoAi'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { useAiStatus } from '@/components/ai/useAiStatus'
import AiSettingsDialog from '@/components/ai/AiSettingsDialog.vue'
import { memoScrollRoot } from './composables/memoPage'
import { useMemoChanged } from './composables/useMemoChanged'
import { useMemoNarrow } from './composables/useMemoNarrow'
import { useActiveSection, useRailLayout } from './composables/useMemoScroll'
import { useSelectionFloat } from './composables/useSelectionFloat'
import { useMemoDeepLink } from './composables/useMemoDeepLink'
import { useMemoGeneration } from './composables/useMemoGeneration'
import { useCiteDelegation } from './composables/useCiteDelegation'
import MemoSectionNav from './MemoSectionNav.vue'
import MemoDocHead from './MemoDocHead.vue'
import MemoVersionBanner from './MemoVersionBanner.vue'
import MemoGenerationStatus from './MemoGenerationStatus.vue'
import MemoToolbar from './MemoToolbar.vue'
import MemoOriginLegend from './MemoOriginLegend.vue'
import MemoCoverPage from './MemoCoverPage.vue'
import MemoSection from './MemoSection.vue'
import MemoSelectionAction from './MemoSelectionAction.vue'
import MemoCiteTooltip from './MemoCiteTooltip.vue'
import MemoCompareView from './MemoCompareView.vue'
import MemoNewMaterialBanner from './MemoNewMaterialBanner.vue'
import MemoAppendixNote from './MemoAppendixNote.vue'
import MemoCommentsRail from './MemoCommentsRail.vue'
import MemoRailTabs from './MemoRailTabs.vue'
import ExportDialog from './ExportDialog.vue'
import GenerateMemoDialog from './GenerateMemoDialog.vue'
import MemoSourceViewer from './MemoSourceViewer.vue'
import AiChatPanel from './ai/AiChatPanel.vue'

const sections = MEMO_SECTIONS
const keys = sections.map(s => s.k)
const CO = (DATA && DATA.COMPANY) || {}

const active = ref('summary')
const focusedKey = ref(null)
const resets = ref({})
const citeOpen = ref(false)
const commentsVersion = ref(0)
const composerForKey = ref(null)
const drawerOpen = ref(false)
// Under ca. 1440 px er kommentarerne en skuffe i kanten; bliver skærmen bred, lukkes den
const narrow = useMemoNarrow(() => { drawerOpen.value = false })
const railTab = ref('comments') // højre skinne: kommentarer eller chat

/* ── AI-tilstand ───────────────────────────────────────────────────────── */
const aiStatus = useAiStatus()
const aiSettingsOpen = ref(false)
const aiSectionKey = ref(null) // hvilket afsnit har assistenten åben
// Markeret passage, der skal omskrives: { text, range, sKey }. Range er et DOM-objekt: shallowRef.
const aiSelection = shallowRef(null)
const genOpen = ref(false)

/* ── Afsnittenes API'er ─────────────────────────────────────────────────── */
// Almindeligt Map (ingen reaktivitet). window.__memoApis er et levende spejl med samme form som før
// ({ nøgle: api }), til de automatiske browsertests.
const sectionApis = new Map()
const apiMirror = {}
function registerSectionApi (k, api) {
  if (api) { sectionApis.set(k, api); apiMirror[k] = api } else { sectionApis.delete(k); delete apiMirror[k] }
  try { window.__memoApis = apiMirror } catch (e) {}
}

/* ── Status, version og låst visning ───────────────────────────────────── */
// Status pr. afsnit: regnes af teksten kort efter hver ændring, ikke ved hvert tastetryk
const memoVersion = useMemoChanged()
// Sagen (indstil og træk tilbage) og den viste version (CW_OPEN_MEMO_VERSION) gentegner siden
const caseVersion = useCaseVersion()
const viewTick = ref(0)
const locked = computed(() => { caseVersion.value; viewTick.value; return memoLocked() })
const readOnly = computed(() => !!locked.value)
const lockKey = computed(() => (locked.value ? 'v' + locked.value.version + ':' + locked.value.at + (locked.value.compare ? ':c' : '') : 'live'))
const compareSnaps = computed(() => (locked.value && locked.value.compare ? { cur: CW.memoSnapshot(locked.value.version), prev: CW.memoSnapshot(locked.value.version - 1) } : null))
const hasPrevVersion = computed(() => !!(locked.value && locked.value.sections && CW.memoSnapshot(locked.value.version - 1)))
const front = computed(() => (locked.value ? locked.value.front : null))
// Den indstillede version vises på indstillingssproget: forside, afsnitstitler og tekst
const docLang = computed(() => (locked.value && locked.value.sections && locked.value.lang ? locked.value.lang : (MEMO_EN ? 'en' : 'da')))
const lockedSecs = computed(() => (locked.value && locked.value.sections ? locked.value.sections : null))
const lockedHtmlOf = (k) => (lockedSecs.value && lockedSecs.value[k] != null ? lockedSecs.value[k] : null)
const submitted = computed(() => { caseVersion.value; return !!memoSubmittedAt() })

// Status pr. afsnit: regnes kun igen, når teksten (memoVersion) eller den viste version (lockKey) ændrer
// sig (som prototypens useMemo). Regnes, mens siden tegnes, så en fejl her fanges af fejlgrænsen.
let statusCache = { key: null, value: null }
const statuses = computed(() => {
  const key = memoVersion.value + '|' + lockKey.value
  if (statusCache.key !== key) {
    const l = locked.value
    const m = {}
    sections.forEach(s => { m[s.k] = memoSectionStatus(s.k, lockedHtmlOf(s.k), memoLockedReview(l, s.k)) })
    statusCache = { key, value: m }
  }
  return statusCache.value
})
// Fremdriften står ét sted: "x af 14 afsnit gennemgået" i memoets top
const reviewedCount = computed(() => sections.filter(s => statuses.value[s.k].reviewed).length)

// Åbne, løste og blokerende kommentarer. Tællerne i listen viser kun de åbne. Låst version:
// kommentarsporet fra indstillingen (ældre versioner uden det viser det levende).
const frozenKey = computed(() => (locked.value && locked.value.sections ? locked.value.version + ':' + locked.value.at : ''))
const frozenComments = shallowRef(null)
watch(frozenKey, () => {
  const l = locked.value
  frozenComments.value = (l && l.sections && l.sections.__comments) || null
}, { immediate: true })
const commentLockNote = computed(() => {
  const l = locked.value
  if (!l) return null
  return memoSubmittedAt() && !l.past ? t('Træk indstillingen tilbage for at ændre.') : t('Tidligere version, skrivebeskyttet.')
})
const counts = computed(() => { commentsVersion.value; memoVersion.value; return memoCommentCounts(frozenComments.value) })
const commentCounts = computed(() => counts.value.open)

// Afsnit, rådgiveren har rettet i (gemt tekst ved start); "Generér memo" advarer, før de overskrives
const modifiedSections = ref((() => {
  const m = {}
  sections.forEach(s => { if (localStorage.getItem(memoKey(s.k)) !== null) m[s.k] = true })
  return m
})())
const markModified = (k) => { modifiedSections.value = { ...modifiedSections.value, [k]: true } }

/* ── Dokumentet, rulning og skinnen ─────────────────────────────────────── */
const docEl = ref(null)
let scrollRoot = null
const getRoot = () => scrollRoot || (docEl.value ? (scrollRoot = memoScrollRoot(docEl.value)) : null)
// Kommentarskinnens målefelt: MemoCommentsRail binder viewportRef (en funktion) med :ref på sit felt
let railViewportEl = null
const setRailViewport = (el) => { railViewportEl = el || null }
// Et dybdelink har lige valgt afsnittet: rulningen må ikke flytte markeringen før pin.until
const pin = { until: 0 }

useActiveSection({ docEl, getRoot, keys, active, pin })
// Afsnitslisten står fast ved siden af dokumentet. Den er højere end i prototypen (temaets tekst), så er
// sagens rullefelt lavere end listen, ruller listen selv, og alle afsnit kan nås. Målt ved start, når
// skrifterne er hentet, og når vinduet ændrer størrelse. Står listen ikke fast (smal skærm), gælder CSS.
const navCard = ref(null)
const navList = ref(null)
const navListMax = ref(null)
function placeNav () {
  const r = getRoot()
  const card = navCard.value && navCard.value.$el
  const list = navList.value && navList.value.$el
  if (!r || !card || !list || getComputedStyle(card).position !== 'sticky') { navListMax.value = null; return }
  const top = parseFloat(getComputedStyle(card).top) || 0
  const around = card.getBoundingClientRect().height - list.getBoundingClientRect().height
  navListMax.value = Math.max(120, Math.floor(r.clientHeight - 2 * top - around))
}
onMounted(() => {
  nextTick(placeNav)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeNav)
})
useWindowEvent('resize', placeNav)
const floatBtn = useSelectionFloat()
const { railPos, railH } = useRailLayout({
  getRoot,
  getViewport: () => railViewportEl,
  getDoc: () => docEl.value,
  keys,
  deps: () => [commentsVersion.value, narrow.value, drawerOpen.value, railTab.value, docEl.value],
  onScroll: () => { floatBtn.value = null },
})
const { closeVersionView } = useMemoDeepLink({ getRoot, active, pin, railTab, narrow, drawerOpen, viewTick })
const cites = useCiteDelegation()
const sourceDoc = cites.sourceDoc
const closeSource = () => { sourceDoc.value = null }

function scrollTo (key, focus) {
  active.value = key
  const el = document.getElementById('ms-' + key)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  if (focus) CW.focusSoon('#ms-' + key + '-h')
}

/* "Markér som gennemgået og gå til næste": videre til næste afsnit, der stadig er et udkast. Statussen
   læses frisk, da den lige er ændret. */
function nextDraftAfter (key) {
  const i = sections.findIndex(s => s.k === key)
  const rest = sections.slice(i + 1).concat(sections.slice(0, i))
  const n = rest.find(s => memoSectionStatus(s.k).unreviewed)
  return n ? n.k : null
}
function reviewedNext (key) {
  const n = nextDraftAfter(key)
  // Statussen tegnes om med det samme, ikke først når "memo-changed" har ventet sig færdig. Ellers stod
  // knappen i afsnittet et øjeblik endnu.
  memoVersion.value++
  setTimeout(() => {
    if (n) scrollTo(n, true)
    else { CW.toast(t('Alle afsnit er gennemgået.'), { tone: 'ok' }); focusReviewed(key) }
  }, 60)
}
/* Knappen forsvinder, når afsnittet er gennemgået. Fokus går til linjen "Gennemgået af …" i samme afsnit,
   så man ikke havner på siden. */
function focusReviewed (key) {
  let tries = 0
  const go = () => {
    const el = document.getElementById('ms-' + key + '-reviewed')
    if (el) el.focus({ preventScroll: true })
    else if (++tries < 20) setTimeout(go, 60)
  }
  setTimeout(go, 60)
}
/* Gennemgangen er fortrudt: fokus på "Markér som gennemgået" i samme afsnit */
function unreviewed (key) {
  memoVersion.value++
  CW.focusSoon('#ms-' + key + ' .memo-review .rv-go')
}

function handleAddComment (key) {
  composerForKey.value = key
  active.value = key
  if (narrow.value) { railTab.value = 'comments'; drawerOpen.value = true }
}

/* Kildevælgeren (i værktøjslinjen): indsæt en manuel henvisning ved den huskede markering. Den markerede
   tekst bliver henvisningens tekst; uden markering dokumentets navn. */
function insertCiteDoc (doc) {
  const editable = _memoLastEditable ||
    (active.value ? document.getElementById('ms-' + active.value)?.querySelector('[contenteditable]') : null)
  if (!editable) { citeOpen.value = false; return }

  editable.focus()

  const sel = window.getSelection()
  if (_memoLastRange) {
    sel.removeAllRanges()
    sel.addRange(_memoLastRange)
  }

  // Use the selected text as the visible label; fall back to doc name if nothing was selected
  const selectedText = (_memoLastRange && _memoLastRange.toString().trim()) || doc.name
  const html = '<span class="memo-cite" data-doc="' + doc.name + '" data-page="" data-manual="true">' + selectedText + '</span>'
  document.execCommand('insertHTML', false, html)
  citeOpen.value = false
}

function handleFocusSection (key, isModified) {
  focusedKey.value = key && isModified ? key : null
  if (key) {
    active.value = key
    if (isModified) markModified(key)
  }
}

function resetSection (key) {
  resets.value = { ...resets.value, [key]: (resets.value[key] || 0) + 1 }
  focusedKey.value = null
  const n = { ...modifiedSections.value }
  delete n[key]
  modifiedSections.value = n
}

/* ── AI ────────────────────────────────────────────────────────────────── */
function openSectionAi (key) {
  aiSelection.value = null
  aiSectionKey.value = aiSectionKey.value === key ? null : key
}
function openSelectionAi () {
  if (!floatBtn.value) return
  _memoSaveSelection()
  // Markeringen fryses her sammen med hvilket afsnit den kom fra. Ellers overskriver et klik i et andet
  // afsnit den, mens AI'en skriver, og resultatet lander det forkerte sted.
  const sel = window.getSelection()
  const frozen = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : _memoLastRange
  aiSelection.value = { text: floatBtn.value.text, range: frozen, sKey: floatBtn.value.sKey }
  aiSectionKey.value = floatBtn.value.sKey
  floatBtn.value = null
}
function closeSectionAi () { aiSectionKey.value = null; aiSelection.value = null }

// Chatten: memoets tekst som grundlag, og forslag indsat som udkast i et afsnit
function memoAsText () {
  return sections.map(s => {
    const api = sectionApis.get(s.k)
    const body = api ? api.getText().trim() : ''
    return '## ' + s.num + '. ' + t(s.label) + '\n' + (body || (MEMO_EN ? '(not written yet)' : '(ikke skrevet endnu)'))
  }).join('\n\n')
}
function insertFromChat (key, html) {
  const api = sectionApis.get(key)
  if (!api || !html) return
  if (readOnly.value) { CW.toast(t('Memoet er indstillet og skrivebeskyttet. Træk indstillingen tilbage i sagen for at redigere.'), { tone: 'warn' }); return }
  // Tekst fra chatten er også maskinskrevet. Før blev den indsat helt umærket, så den var ikke til at
  // skelne fra rådgiverens egen bagefter.
  api.append(markAsDraft(html, 'chat'), 'chat')
  scrollTo(key)
  markModified(key)
}

const { gen, runGeneration, stopGeneration } = useMemoGeneration({
  sections, apis: sectionApis, scrollTo, onStarted: () => { genOpen.value = false }, onWritten: markModified,
})
const closeGen = () => { gen.value = null }
/* "Generér memo" vises først, når AI er forbundet (før stod den som en knap, der så slået fra ud, men
   kunne klikkes) */
function onGenerateClick () {
  if (readOnly.value || !aiStatus.value.ready || (gen.value && gen.value.running)) return
  genOpen.value = true
}

/* ── Visning ───────────────────────────────────────────────────────────── */
const exportOpen = ref(false)
const showOrigin = ref(false)

/* Kildehenvisningerne er knapper for tastatur og skærmlæser (med kildevisningen slået til). Sættes igen
   efter hver ændring, da AI og indsættelse kan bringe nye henvisninger ind. */
watch([memoVersion, lockKey], (_n, _o, onCleanup) => {
  const id = setTimeout(() => decorateCites(docEl.value), 30)
  onCleanup(() => clearTimeout(id))
}, { immediate: true })

/* Ophavsmærkerne bærer deres etiket i en attribut, så CSS kan vise den. Sættes når visningen slås til, og
   efter at AI'en har skrevet. */
watch([showOrigin, focusedKey, memoVersion], (_n, _o, onCleanup) => {
  if (!showOrigin.value) return
  const timer = setTimeout(() => {
    document.querySelectorAll('.memo-doc [data-ai]').forEach(el => {
      const o = el.getAttribute('data-ai')
      const base = o === 'edited' ? t('Udkast, rettet') : o === 'chat' ? t('AI, chat') : o === 'seed' ? t('Udkast') : t('AI-udkast')
      const sec = el.closest('.memo-sec')
      const ok = sec && sec.getAttribute('data-reviewed') === '1' && !el.closest('.tpl-draft')
      el.setAttribute('data-ai-label', ok ? base + ' · ' + t('gennemgået') : base)
    })
  }, 60)
  onCleanup(() => clearTimeout(timer))
}, { immediate: true })

/* Hvor meget af memoet står rådgiveren inde for? Tælles på blokke, ikke på tegn, fordi det er den enhed hun
   godkender. Skabelonens og AI'ens tekst er udkast indtil afsnittet er markeret som gennemgået; kun tekst
   uden ophavsmærke er hendes egen. Skabelonens vejledning tælles ikke med. */
const originStats = computed(() => {
  if (!showOrigin.value) return null
  memoVersion.value
  const BLOCKS = 'p, h3, h4, ul, ol, table, blockquote'
  let draft = 0, reviewed = 0, own = 0
  sections.forEach(s => {
    const api = sectionApis.get(s.k)
    const st = statuses.value[s.k]
    const d = document.createElement('div')
    d.innerHTML = api ? api.getHtml() : sectionHtml(s.k)
    d.querySelectorAll(MEMO_SCAFFOLD + ', .tpl-draft-label').forEach(el => el.remove())
    d.querySelectorAll(BLOCKS).forEach(el => {
      // Kun yderste blokke, ellers tælles en liste og dens punkter dobbelt
      if (el.parentElement && el.parentElement.closest(BLOCKS)) return
      if (!el.textContent.trim()) return
      const inDraft = !!el.closest('.tpl-draft')
      const machine = inDraft || !!el.closest('[data-ai]')
      if (!machine) own++
      else if (st && st.reviewed && !inDraft) reviewed++
      else draft++
    })
  })
  return { draft, reviewed, own }
})

function closeExport () {
  exportOpen.value = false
  CW.focusSoon('#memo-export-btn')
}
// Versionsbanneret: sammenlign, åbn den forrige eller luk versionsvisningen
const compareVersion = (on) => window.CW_OPEN_MEMO_VERSION(locked.value.version, { compare: on })
const openVersion = (v) => window.CW_OPEN_MEMO_VERSION(v, { compare: false })

/* ── Skinnen og skuffen ─────────────────────────────────────────────────── */
// Fanerne "Kommentarer" og "Spørg om sagen" (med tastaturet) står i MemoRailTabs.vue
// Knappen i kanten: navn med tællerne, som prototypens knap ("Kommentarer 6 åbne 1 blokerer indstilling")
const toggleLabel = computed(() => [
  t('Kommentarer'),
  counts.value.openTotal > 0 ? counts.value.openTotal + ' ' + t('åbne') : '',
  counts.value.blocking > 0 ? counts.value.blocking + ' ' + t('blokerer indstilling') : '',
].filter(Boolean).join(' '))
// Esc i skuffen lukker den, og fokus går tilbage til knappen
function onDrawerClose () {
  drawerOpen.value = false
  CW.focusSoon('#memo-rail-toggle')
}
// Skuffen starter, hvor sagens rullefelt starter (under sagens faner), som før, så sidehovedet og sagens
// knapper ikke ligger skjult bag den. Målt, når skuffen åbner, og når vinduet ændrer størrelse.
const drawerTop = ref(0)
const placeDrawer = () => { const r = getRoot(); drawerTop.value = r ? Math.max(0, Math.round(r.getBoundingClientRect().top)) : 0 }
useWindowEvent('resize', () => { if (drawerOpen.value) placeDrawer() })
// Når skuffen åbner, får dens første knap, tekstfelt eller fane fokus (som før: efter 30 ms)
watch(drawerOpen, (open) => {
  if (!open) return
  placeDrawer()
  let tries = 0
  const go = () => {
    const d = document.getElementById('memo-drawer')
    const f = d && d.querySelector('button, textarea, [tabindex="0"]')
    if (f) f.focus()
    else if (++tries < 20) setTimeout(go, 30)
  }
  setTimeout(go, 30)
})
// Samme skinne i begge visninger: bred = en kolonne, smal = skuffen (a-drawer, ikke-modal: man læser videre
// i dokumentet ved siden af). Indholdet er det samme; kun beholderen skifter. Skuffens id, rolle og navn
// (#memo-drawer, complementary, "Kommentarer") står på indholdet: a-drawer 3.2.13 sender ikke attributter
// videre til sit yderste element.
const railFrame = computed(() => (narrow.value
  ? {
      is: 'a-drawer',
      attrs: {
        visible: drawerOpen.value,
        placement: 'right',
        style: { top: drawerTop.value + 'px', height: 'calc(100% - ' + drawerTop.value + 'px)' },
        width: 'min(340px, 92vw)',
        mask: false,
        closable: false,
        autofocus: false,
        destroyOnClose: true,
        onClose: onDrawerClose,
      },
    }
  : { is: 'div', attrs: {} }))
</script>

<template>
  <div class="memo-page">
    <div class="memo-layout">
      <!-- ── Afsnitslisten ── -->
      <a-card
        ref="navCard"
        size="small"
        class="memo-nav"
        :title="t('Afsnit')"
        :body-style="{ padding: '4px 0' }"
      >
        <MemoSectionNav
          ref="navList"
          class="memo-nav-list"
          :style="navListMax ? { maxHeight: navListMax + 'px', overflowY: 'auto' } : undefined"
          :sections="sections"
          :statuses="statuses"
          :comment-counts="commentCounts"
          :active="active"
          @select="(k) => scrollTo(k)"
        />
      </a-card>

      <!-- ── Dokumentet ── overflow: clip (ikke hidden), så værktøjslinjen kan stå fast, mens siden ruller -->
      <a-card
        class="memo-doc-card"
        :body-style="{ padding: 0 }"
      >
        <MemoDocHead
          :read-only="readOnly"
          :version="locked ? locked.version : null"
          :reviewed-count="reviewedCount"
          :total="sections.length"
          :ai-status="aiStatus"
          :generating="!!(gen && gen.running)"
          :show-origin="showOrigin"
          @connect-ai="aiSettingsOpen = true"
          @generate="onGenerateClick"
          @toggle-origin="showOrigin = !showOrigin"
          @export="exportOpen = true"
        />

        <!-- Indstillet: memoet er låst, og det skal siges hvorfor og hvordan man låser op -->
        <MemoVersionBanner
          v-if="readOnly"
          :locked="locked"
          :has-prev-version="hasPrevVersion"
          :submitted="submitted"
          @compare="compareVersion"
          @open="openVersion"
          @close="closeVersionView"
        />

        <ExportDialog
          v-if="exportOpen"
          :sections="sections"
          @close="closeExport"
        />
        <MemoSourceViewer
          v-if="sourceDoc"
          :doc="sourceDoc.doc"
          :page="sourceDoc.page"
          :quote="sourceDoc.quote"
          :context="sourceDoc.context"
          :alt="sourceDoc.alt"
          :in-case="sourceDoc.inCase"
          @close="closeSource"
        />

        <!-- Fremgang under generering -->
        <MemoGenerationStatus
          v-if="gen"
          :gen="gen"
          @stop="stopGeneration"
          @close="closeGen"
        />

        <MemoToolbar
          v-if="!readOnly"
          :focused-key="focusedKey"
          :cite-open="citeOpen"
          @reset="resetSection"
          @open-cite-picker="citeOpen = true"
          @insert-cite="insertCiteDoc"
          @close-cite-picker="citeOpen = false"
        />

        <MemoOriginLegend
          v-if="showOrigin && originStats"
          :stats="originStats"
        />

        <!-- Dokumentet ruller med siden. Henvisningernes handlere ligger her (Vue tegner ikke afsnittenes HTML). -->
        <div
          ref="docEl"
          :class="['memo-doc', { 'show-origin': showOrigin }]"
          @mouseover="cites.onMouseOver"
          @mouseout="cites.onMouseOut"
          @input="cites.onInput"
          @click="cites.onClick"
          @keydown="cites.onKeydown"
        >
          <MemoCompareView
            v-if="compareSnaps && compareSnaps.cur && compareSnaps.prev"
            :cur="compareSnaps.cur"
            :prev="compareSnaps.prev"
          />
          <template v-else>
            <MemoNewMaterialBanner :version="memoVersion" />
            <!-- Tastaturgenvej forbi forsiden og boksens mange kildehenvisninger. Skjult, til den får fokus med Tab. -->
            <a
              href="#ms-background-h"
              class="skip-link"
              @click.prevent="scrollTo(sections[0] ? sections[0].k : 'background', true)"
            >{{ t('Spring til afsnit 1') }}</a>
            <MemoCoverPage
              :company="CO"
              :front="front"
              :locked="locked"
              :doc-lang="docLang"
              @jump="(k) => scrollTo(k, true)"
            />
            <MemoSection
              v-for="s in sections"
              :id="'ms-' + s.k"
              :key="s.k + ':' + lockKey"
              :doc-lang="locked ? docLang : null"
              :is-active="active === s.k"
              :s-key="s.k"
              :num="s.num"
              :title="s.label"
              :st="statuses[s.k]"
              :read-only="readOnly"
              :locked-html="lockedHtmlOf(s.k)"
              :reset-trigger="resets[s.k] || 0"
              :comment-count="commentCounts[s.k] || 0"
              :ai-open="aiSectionKey === s.k"
              :ai-selection="aiSectionKey === s.k ? aiSelection : null"
              @unreviewed="unreviewed"
              @reviewed-next="reviewedNext"
              @connect-ai="aiSettingsOpen = true"
              @focus-section="handleFocusSection"
              @add-comment="handleAddComment"
              @register-api="registerSectionApi"
              @toggle-ai="openSectionAi"
              @close-ai="closeSectionAi"
            />
            <MemoAppendixNote
              :read-only="readOnly"
              :version="memoVersion"
            />
          </template>
        </div>
      </a-card>

      <!-- ── Højre skinne: kommentarer eller sagschat. Under ca. 1440 px en knap i kanten, der åbner en skuffe. ── -->
      <div class="memo-rail">
        <template v-if="narrow">
          <a-badge
            :count="counts.openTotal"
            color="blue"
          >
            <a-tooltip
              :title="t('Vis kommentarer og spørg om sagen')"
              placement="left"
            >
              <a-button
                id="memo-rail-toggle"
                class="memo-rail-tab"
                :aria-label="toggleLabel"
                :aria-expanded="String(drawerOpen)"
                aria-controls="memo-drawer"
                @click="drawerOpen = !drawerOpen"
              >
                <template #icon>
                  <CommentOutlined aria-hidden="true" />
                </template>
              </a-button>
            </a-tooltip>
          </a-badge>
          <!-- Rød betyder, at noget blokerer indstillingen (knappens navn siger det) -->
          <a-typography-text
            v-if="counts.blocking > 0"
            type="danger"
            strong
            aria-hidden="true"
            :title="counts.blocking + ' ' + t('blokerer indstilling')"
          >
            !
          </a-typography-text>
        </template>
        <component
          :is="railFrame.is"
          v-bind="railFrame.attrs"
        >
          <MemoRailTabs
            v-model:tab="railTab"
            :narrow="narrow"
            :open-total="counts.openTotal"
            @close="drawerOpen = false"
          >
            <template #comments>
              <MemoCommentsRail
                :sections="sections"
                :positions="railPos"
                :viewport-ref="setRailViewport"
                :height="railH"
                :active-key="active"
                :composer-for-key="composerForKey"
                :counts="counts"
                :version="commentsVersion + ':' + memoVersion"
                :frozen="frozenComments"
                :lock-note="commentLockNote"
                @composer-toggle="(k) => { composerForKey = k }"
                @changed="commentsVersion++"
                @scroll-to-section="scrollTo"
              />
            </template>
            <template #ai>
              <AiChatPanel
                :open="true"
                :get-memo-text="memoAsText"
                :sections="sections"
                @insert="insertFromChat"
              />
            </template>
          </MemoRailTabs>
        </component>
      </div>
    </div>

    <!-- Flydende knap ved markeret tekst -->
    <MemoSelectionAction
      v-if="floatBtn && aiStatus.ready && !readOnly"
      :x="floatBtn.x"
      :y="floatBtn.y"
      @activate="openSelectionAi"
    />

    <!-- Forbindelsesdialogen (husker den valgte udbyder, så den bliver monteret) -->
    <AiSettingsDialog
      :open="aiSettingsOpen"
      @close="aiSettingsOpen = false"
    />

    <!-- Generér memo -->
    <GenerateMemoDialog
      v-if="genOpen"
      :sections="sections"
      :modified="modifiedSections"
      @cancel="genOpen = false"
      @start="runGeneration"
    />

    <!-- Kildehenvisningens tooltip (kun med kildevisningen slået til) -->
    <MemoCiteTooltip :tooltip="cites.tooltip.value" />
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Sidens gitter: afsnitslisten | dokumentet | skinnen. Dokumentet får mest muligt af pladsen på almindelige
   bærbare (1280 til 1480 px). Brudpunkterne står kun her; 1439 px er også grænsen for skuffen
   (MEMO_NARROW_MQ i composables/memoPage.js). */
.memo-page {
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 28px 80px;
}

.memo-layout {
  display: grid;
  grid-template-columns: 256px minmax(0, 1fr) 272px;
  gap: 16px;
}

/* Listen og skinnen står fast ved siden af dokumentet, mens det ruller */
.memo-nav,
.memo-rail {
  position: sticky;
  top: 16px;
  align-self: start;
}

.memo-doc-card {
  min-width: 0;
  overflow: clip;
}

/* Dokumentets marginer (siden ruller; tegnede diagrammer ruller i deres egen boks) */
.memo-doc {
  position: relative;
  padding: 36px 56px 60px;
  overflow-x: hidden;
}

/* Målet for et dybdelink (et tomt felt eller en kommentar) markeres, til der klikkes et andet sted */
.memo-doc :deep(.memo-target),
.memo-rail-body :deep(.memo-target) {
  outline: 2px solid @primary-color;
  outline-offset: 2px;
}

@media (max-width: 1480px) {
  .memo-layout {
    grid-template-columns: 208px minmax(0, 1fr) 244px;
    gap: 14px;
  }

  .memo-doc {
    padding: 28px 28px 56px;
  }
}

/* Under ca. 1440 px klappes kommentarskinnen sammen til en knap i kanten, så dokumentet får pladsen */
@media (max-width: 1439px) {
  .memo-layout {
    grid-template-columns: 196px minmax(0, 1fr) 40px;
    gap: 12px;
  }

  .memo-doc {
    padding: 26px 24px 56px;
  }

  .memo-rail {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }
}

@media (max-width: 1099px) {
  .memo-page {
    padding: 20px 16px 64px;
  }
}

/* Smalt: afsnitslisten står over dokumentet og ruller i sin egen boks, så teksten får hele bredden */
@media (max-width: 899px) {
  .memo-layout {
    grid-template-columns: minmax(0, 1fr) 40px;
    gap: 12px;
  }

  .memo-nav {
    position: relative;
    top: auto;
    grid-column: 1 / -1;
  }

  .memo-nav-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    max-height: 216px;
    overflow-y: auto;
  }
}

@media (max-width: 640px) {
  .memo-page {
    padding: 20px 16px 56px;
  }

  .memo-doc {
    padding: 20px 16px 48px;
  }
}
</style>
