<script setup>
// Mine opgaver: rådgiverens sager med indhentningen af materiale fra kunden.
// Reglerne (indhentning, ventetid, påmindelser, nyt siden sidst) står i src/domain/tasks.js.
// Bygget efter designet "Mine opgaver v8" med ant-design-vue-komponenterne fra designet:
// Table, Tabs, Input, Popover, Checkbox, Slider (range), Dropdown, Modal og notification med fortryd.
import { computed, h, nextTick, onBeforeUnmount, onUpdated, ref, shallowRef, watch } from 'vue'
import { Button, Empty, notification } from 'ant-design-vue'
import {
  CheckOutlined, CloseOutlined, EllipsisOutlined, FilterOutlined, SearchOutlined,
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import {
  TASK_ALL, TASK_MAXD, TASK_RANK, TASK_REASONS, TASK_STEPS, TASK_STEP_LABEL, TASK_UNDO_MS, TASK_VIEWS,
  openCaseFromList, taskChips, taskDerive, taskFill, taskMine, taskNorm, taskOwner, taskPasses,
  taskPatch, taskPlural, taskRangeText, taskRel, taskStore, taskViewLabel, tk,
} from '@/domain/tasks'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { useMenuKeyboard } from '@/composables/useMenuKeyboard'
import { usePopoverTabOut } from '@/composables/usePopoverTabOut'
import { useTabsKeyboard } from '@/composables/useTabsKeyboard'
import { go } from '@/composables/useNavigation'
import AppTopbar from '@/components/shell/AppTopbar.vue'
import TaskTip from './TaskTip.vue'

const caseVersion = useCaseVersion()
const saved = DATA.viewGet('cases') || {}
const f = ref(saved.f && Array.isArray(saved.f.steps) ? saved.f : TASK_ALL)
const query = ref('')
const filterOpen = ref(false)
const menuOpen = ref(null) // sagen, hvis "···"-menu er åben
const closing = ref(null) // sagen i "Afslut sag"
const reason = ref(0)
const pending = shallowRef(null) // { id, name } påmindelse, der kan fortrydes (sammenlignes på identitet)
const reminders = ref(0)
const searchInput = ref(null)
const filterPanel = ref(null)

const setF = (patch) => { f.value = Object.assign({}, f.value, patch) }
// Gem visningen i sessionen, så den står som før, når man kommer tilbage fra en sag
watch(f, (v) => DATA.viewSet('cases', { f: v }))

/* ── Listen ─────────────────────────────────────────────────────────────── */

// Sagen, påmindelser og det gemte følger den fælles tilstand
const store = computed(() => {
  caseVersion.value + reminders.value
  return taskStore()
})
const everyone = computed(() => taskMine().map(c => taskDerive(c, store.value, pending.value)))
const q = computed(() => query.value.trim().toLowerCase())
const match = (r) => {
  const qDigits = q.value.replace(/\D/g, '')
  return r.name.toLowerCase().includes(q.value) || r.caseNr.toLowerCase().includes(q.value) || (qDigits.length >= 3 && r.cvr.replace(/\D/g, '').includes(qDigits))
}
const filtered = computed(() => everyone.value.filter(r => taskPasses(r, f.value)))
const list = computed(() => (q.value ? everyone.value.filter(match) : filtered.value).slice()
  .sort((a, b) => TASK_RANK[a.step] - TASK_RANK[b.step] || (b.since || 0) - (a.since || 0)))

const savedViews = computed(() => (Array.isArray(store.value.views) ? store.value.views : []))
const allViews = computed(() => TASK_VIEWS.concat(savedViews.value))
const cur = computed(() => taskNorm(f.value))
const activeView = computed(() => (q.value ? null : allViews.value.find(v => taskNorm(v.f) === cur.value) || null))
const onBase = computed(() => TASK_VIEWS.some(v => taskNorm(v.f) === cur.value))
const activeSaved = computed(() => (activeView.value && savedViews.value.some(v => v.key === activeView.value.key) ? activeView.value : null))

const chips = computed(() => taskChips(f.value, setF))
const showChips = computed(() => !q.value && chips.value.length > 0 && !onBase.value)
const filterCount = computed(() => (onBase.value ? 0 : chips.value.length))
const tabs = computed(() => allViews.value.map(v => ({ k: v.key, l: taskViewLabel(v), n: everyone.value.filter(r => taskPasses(r, v.f)).length })))
const counts = computed(() => {
  const c = {}
  TASK_STEPS.forEach(([k]) => { c[k] = everyone.value.filter(r => r.step === k).length })
  return c
})

// Fanerne: piletaster, Home og End skifter visning, som før
const onTabsKeydown = useTabsKeyboard('tk-view', () => tabs.value.map(x => x.k), pickView)

const columns = computed(() => [
  { key: 'cust', title: t('Kunde') },
  { key: 'owner', title: tk('Afventer'), width: 100 },
  { key: 'status', title: t('Indhentning') },
  { key: 'since', title: t('Ventetid'), width: 110 },
  { key: 'acts', title: t('Handlinger'), width: 190 },
])

function pickView (key) {
  const v = allViews.value.find(x => x.key === key)
  if (!v) return
  f.value = v.f
  query.value = ''
  filterOpen.value = false
}
function saveView () {
  const v = { key: 'v' + Date.now(), f: f.value }
  taskPatch(s => ({ views: (Array.isArray(s.views) ? s.views : []).concat([v]) }))
  CW.toast(taskFill(t('Visningen "{navn}" er gemt'), { navn: taskViewLabel(v) }))
}
function deleteView (v) {
  taskPatch(s => ({ views: (Array.isArray(s.views) ? s.views : []).filter(x => x.key !== v.key) }))
  f.value = TASK_ALL
  CW.toast(taskFill(t('Visningen "{navn}" er slettet'), { navn: taskViewLabel(v) }), { action: { label: t('Fortryd'), onClick: () => { taskPatch(s => ({ views: (Array.isArray(s.views) ? s.views : []).concat([v]) })); f.value = v.f } } })
}

/* ── "/" fokuserer søgningen ─────────────────────────────────────────────── */

// En åben dialog (f.eks. Afslut sag, Hjælp eller en bekræftelse) tager tastaturet; '/' skal ikke flytte fokus væk fra den
const dialogOpen = () => Array.prototype.some.call(document.querySelectorAll('[role="dialog"]'), el => el.getClientRects().length > 0)
useWindowEvent('keydown', (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
  const a = document.activeElement
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return
  if (menuOpen.value !== null || closing.value || dialogOpen()) return
  e.preventDefault()
  if (searchInput.value) searchInput.value.focus()
})
function onSearchKey (e) {
  if (e.key === 'Escape' && query.value) { e.preventDefault(); query.value = '' }
}

/* ── Påmindelser: vises som sendt med det samme, sendes først, når fortrydelsen er udløbet ── */

const REMIND_KEY = 'tk-remind'
useWindowEvent('cw-reminders-changed', () => { reminders.value++ })

function commitRemind (id) {
  // Samme påmindelse som på Dataanmodninger og i sagen (historikken)
  if (DATA.remindCase) DATA.remindCase(id, DATA.ADVISOR && DATA.ADVISOR.name)
  else if (CW.isLiveCase(id)) CW.remind([], {})
}
// Beskeden med "Fortryd": mens musen er over den, venter tiden (ant-design-vue), og mens
// fokus står på knappen, lukker den ikke (WCAG 2.2.1). Når den lukker, sendes påmindelsen.
function showRemindNotice (p, duration) {
  notification.open({
    key: REMIND_KEY,
    placement: 'bottomRight',
    duration,
    message: taskFill(t('Påmindelse sendt til {navn}'), { navn: p.name }),
    btn: () => h(Button, {
      type: 'link',
      size: 'small',
      'aria-label': taskFill(t('Fortryd påmindelsen til {navn}'), { navn: p.name }),
      onFocus: () => { if (pending.value === p) showRemindNotice(p, 0) },
      onBlur: () => { if (pending.value === p) showRemindNotice(p, TASK_UNDO_MS / 1000) },
      onClick: undoRemind,
    }, () => t('Fortryd')),
    onClose: () => {
      if (pending.value !== p) return
      pending.value = null
      commitRemind(p.id)
    },
  })
}
function sendRemind (r) {
  const prev = pending.value
  if (prev) { pending.value = null; commitRemind(prev.id) }
  const p = { id: r.id, name: r.name }
  pending.value = p
  showRemindNotice(p, TASK_UNDO_MS / 1000)
  // Knappen forsvinder; fokus til rækkens "Gå til sagen" (beskeden læses op via den levende region)
  CW.focusSoon('[data-row-key="' + r.id + '"] .tk-open')
}
function undoRemind () {
  const p = pending.value
  if (!p) return
  pending.value = null
  notification.close(REMIND_KEY)
  CW.focusSoon('[data-row-key="' + p.id + '"] .tk-remind, [data-row-key="' + p.id + '"] .tk-open')
}
// En påmindelse, der stadig kan fortrydes, sendes, hvis man forlader siden (også ved genindlæsning)
function flushRemind () {
  const p = pending.value
  if (!p) return
  pending.value = null
  notification.close(REMIND_KEY)
  commitRemind(p.id)
}
useWindowEvent('pagehide', flushRemind)
onBeforeUnmount(flushRemind)

/* ── Rækkens handlinger ─────────────────────────────────────────────────── */

function remindedText (r) {
  return (r.reminders <= 1 ? t('Påmindet') : taskFill(t('{n} påmindelser - senest'), { n: r.reminders })) + ' ' +
    (r.lastRemind === 0 ? t('i dag') : r.lastRemind === 1 ? t('i går') : taskFill(t('for {n} dage siden'), { n: r.lastRemind }))
}
const open = (r) => openCaseFromList(r.id, go)

// Menuen kan betjenes med tastaturet som før (piletaster, Enter, Esc)
const menuKeys = useMenuKeyboard()
function onMenuVisible (r, visible) {
  menuOpen.value = visible ? r.id : null
  if (visible) {
    filterOpen.value = false
    menuKeys.attach({
      menuId: 'tk-menu-' + r.id,
      trigger: () => document.querySelector('[data-row-key="' + r.id + '"] .tk-more'),
      close: () => { menuOpen.value = null },
    })
  } else menuKeys.detach()
}
function onMenuClick (r, key) {
  menuOpen.value = null
  menuKeys.detach()
  if (key === 'close') { reason.value = 0; closing.value = r; return }
  const short = key.slice('move:'.length)
  const m = DATA.TEAM.find(x => x.short === short)
  if (m) move(r, m)
}
// Menuen ved en sag: flyt sagen til en anden rådgiver
function move (r, m) {
  const prev = r.c.responsible
  if (m.short === prev) return
  CW.setOwner(r.id, m.short)
  CW.toast(t('Sagen er flyttet til') + ' ' + m.short + ' (' + r.name + ')', { action: { label: t('Fortryd'), onClick: () => CW.setOwner(r.id, prev) } })
  CW.focusSoon('#tk-search')
}

// "Afslut sag": en årsag skal vælges (den første er valgt på forhånd)
function cancelClose () {
  const id = closing.value && closing.value.id
  closing.value = null
  if (id != null) CW.focusSoon('[data-row-key="' + id + '"] .tk-more')
}
function closeCase () {
  const r = closing.value
  const why = reason.value
  taskPatch(s => ({ closed: Object.assign({}, s.closed, { [r.id]: { reason: why, at: new Date().toISOString() } }) }))
  closing.value = null
  CW.toast(taskFill(t('{navn} er afsluttet'), { navn: r.name }), { action: { label: t('Fortryd'), onClick: () => taskPatch(s => { const m = Object.assign({}, s.closed); delete m[r.id]; return { closed: m } }) } })
  CW.focusSoon('#tk-search')
}

/* ── Filteret ───────────────────────────────────────────────────────────── */

// Skalaen under skyderne (0, 30, 60+ dage). Den sidste tekst står på én linje og slutter ved skalaens
// ende, som før (antdv centrerer ellers mærket over værdien, så teksten brød over to linjer).
const marks = computed(() => ({ 0: '0', 30: '30', [TASK_MAXD]: { label: t('60+ dage'), style: { whiteSpace: 'nowrap', transform: 'translateX(-100%)' } } }))
const dayTip = (v) => (v >= TASK_MAXD ? t('60+ dage') : taskFill(t('{n} dage'), { n: v }))
const clearFilter = () => { f.value = TASK_ALL }
const toggleStep = (k) => setF({ steps: f.value.steps.includes(k) ? f.value.steps.filter(x => x !== k) : f.value.steps.concat([k]) })

// Fokus til det første felt, når filteret åbner (indholdet tegnes først, når det vises)
watch(filterOpen, (on) => {
  if (!on) return
  menuOpen.value = null
  let n = 0
  const tick = () => {
    // Panelet findes allerede (skjult), når det åbnes igen: der prøves igen, til fokus faktisk er flyttet
    const first = filterPanel.value && filterPanel.value.querySelector('input')
    if (first) { nameSliderHandles(); first.focus() }
    if (first && document.activeElement === first) return
    if (++n < 20) setTimeout(tick, 30)
  }
  nextTick(tick)
})
// Skydernes håndtag hedder "<filter>: fra" og "<filter>: til", som før. a-slider 3.2.13 sender ikke
// håndtagenes navne videre (vc-slider's ariaLabelGroupForHandles), så de sættes, når filteret er tegnet.
function nameSliderHandles () {
  if (!filterPanel.value) return
  filterPanel.value.querySelectorAll('[data-handles]').forEach((w) => {
    const [lo, hi] = w.querySelectorAll('[role="slider"]')
    const label = w.getAttribute('data-handles')
    if (lo) lo.setAttribute('aria-label', label + ': ' + t('fra'))
    if (hi) hi.setAttribute('aria-label', label + ': ' + t('til'))
  })
}
onUpdated(nameSliderHandles)
// Esc lukker filteret, uanset hvor fokus står
useWindowEvent('keydown', (e) => {
  if (e.key === 'Escape' && filterOpen.value) closeFilter()
})
function closeFilter () {
  filterOpen.value = false
  CW.focusSoon('.tk-filter-btn')
}
function applyFilter () {
  query.value = ''
  filterOpen.value = false
  CW.focusSoon('.tk-filter-btn')
}

// Tastaturet i filteret, som før migrationen, hvor panelet lå lige efter Filter-knappen: Tab ud af panelet
// (usePopoverTabOut), og fokus, der forlader panelet og søgefeltet, lukker det.
const onFilterKeydown = usePopoverTabOut({
  panel: () => filterPanel.value,
  trigger: () => document.querySelector('.tk-filter-btn'),
  close: () => { filterOpen.value = false },
})
function onFilterFocusOut (e) {
  const to = e.relatedTarget
  if (!to || (filterPanel.value && filterPanel.value.contains(to)) || to.closest('.tk-search-row')) return
  filterOpen.value = false
}
</script>

<template>
  <AppTopbar :crumbs="[t('Mine opgaver')]" />
  <div class="tk-page">
    <a-typography-title>{{ t('Mine opgaver') }}</a-typography-title>

    <div class="tk-search-row">
      <a-input
        id="tk-search"
        ref="searchInput"
        v-model:value="query"
        class="tk-search"
        size="large"
        allow-clear
        :placeholder="t('Find kunde')"
        :aria-label="t('Find kunde')"
        :aria-describedby="q ? 'tk-search-note' : undefined"
        aria-keyshortcuts="/"
        @keydown="onSearchKey"
      >
        <template #prefix>
          <SearchOutlined aria-hidden="true" />
        </template>
        <template #suffix>
          <a-typography-text
            keyboard
            aria-hidden="true"
          >
            /
          </a-typography-text>
        </template>
      </a-input>
      <a-popover
        v-model:visible="filterOpen"
        trigger="click"
        placement="bottomRight"
      >
        <template #content>
          <div
            id="tk-filter"
            ref="filterPanel"
            class="tk-filter"
            role="dialog"
            :aria-label="t('Filter')"
            @keydown="onFilterKeydown"
            @focusout="onFilterFocusOut"
          >
            <a-form layout="vertical">
              <a-form-item :label="t('Indhentning')">
                <div class="tk-steps">
                  <div
                    v-for="[k, l] in TASK_STEPS"
                    :key="k"
                    class="tk-step-row"
                  >
                    <!-- Antallet hører til feltets navn, som før (det stod i etiketten) -->
                    <a-checkbox
                      :checked="f.steps.includes(k)"
                      @change="toggleStep(k)"
                    >
                      {{ t(l) }}<span class="sr-only"> {{ counts[k] }}</span>
                    </a-checkbox>
                    <a-typography-text
                      type="secondary"
                      aria-hidden="true"
                    >
                      {{ counts[k] }}
                    </a-typography-text>
                  </div>
                </div>
              </a-form-item>
              <a-form-item>
                <template #label>
                  <span class="tk-range-head">
                    <span>{{ t('Ventetid') }}</span>
                    <a-typography-text type="secondary">{{ taskRangeText(f.age) }}</a-typography-text>
                  </span>
                </template>
                <div :data-handles="t('Ventetid')">
                  <a-slider
                    range
                    :min="0"
                    :max="TASK_MAXD"
                    :step="1"
                    :marks="marks"
                    :tip-formatter="dayTip"
                    :value="f.age"
                    @change="(v) => setF({ age: v })"
                  />
                </div>
              </a-form-item>
              <a-form-item>
                <template #label>
                  <span class="tk-range-head">
                    <span>{{ t('Seneste påmindelse (dage siden)') }}</span>
                    <a-typography-text type="secondary">{{ taskRangeText(f.rem) }}</a-typography-text>
                  </span>
                </template>
                <div :data-handles="t('Seneste påmindelse (dage siden)')">
                  <a-slider
                    range
                    :min="0"
                    :max="TASK_MAXD"
                    :step="1"
                    :marks="marks"
                    :tip-formatter="dayTip"
                    :value="f.rem"
                    @change="(v) => setF({ rem: v })"
                  />
                </div>
                <a-checkbox
                  :checked="f.onlyRem"
                  @change="setF({ onlyRem: !f.onlyRem })"
                >
                  {{ t('Kun sager, der er påmindet') }}
                </a-checkbox>
              </a-form-item>
              <a-form-item>
                <a-checkbox
                  :checked="f.fresh"
                  @change="setF({ fresh: !f.fresh })"
                >
                  {{ t('Kun sager med nyt siden sidst') }}
                </a-checkbox>
              </a-form-item>
            </a-form>
            <div class="tk-filter-foot">
              <a-button
                class="cw-link"
                type="link"
                @click="clearFilter"
              >
                {{ t('Ryd') }}
              </a-button>
              <a-button
                type="primary"
                @click="applyFilter"
              >
                {{ taskPlural(filtered.length, 'Vis {n} sag', 'Vis {n} sager') }}
              </a-button>
            </div>
          </div>
        </template>
        <a-button
          class="tk-filter-btn"
          size="large"
          :aria-expanded="filterOpen"
          aria-controls="tk-filter"
        >
          <template #icon>
            <FilterOutlined aria-hidden="true" />
          </template>
          {{ t('Filter') }}
          <template v-if="filterCount > 0">
            <a-badge
              :count="filterCount"
              :number-style="{ backgroundColor: '#1890ff' }"
              aria-hidden="true"
            />
            <span class="sr-only">{{ ', ' + taskPlural(filterCount, '{n} filter', '{n} filtre') }}</span>
          </template>
        </a-button>
      </a-popover>
    </div>

    <div @keydown="onTabsKeydown">
      <a-tabs
        id="tk-view"
        :active-key="activeView ? activeView.key : ''"
        :aria-label="t('Visninger')"
        @change="pickView"
      >
        <a-tab-pane
          v-for="tab in tabs"
          :key="tab.k"
        >
          <template #tab>
            {{ tab.l }} <a-typography-text type="secondary">
              {{ tab.n }}
            </a-typography-text>
          </template>
        </a-tab-pane>
      </a-tabs>
    </div>

    <div
      v-if="showChips"
      class="tk-chips"
    >
      <a-button
        v-for="c in chips"
        :key="c.label"
        size="small"
        :aria-label="taskFill(t('Fjern filteret {navn}'), { navn: c.label })"
        @click="c.remove"
      >
        {{ c.label }}
        <CloseOutlined aria-hidden="true" />
      </a-button>
      <a-button
        v-if="!activeView"
        class="cw-link"
        type="link"
        size="small"
        @click="saveView"
      >
        {{ t('Gem som visning') }}
      </a-button>
      <a-button
        v-if="activeSaved"
        class="cw-link"
        type="link"
        size="small"
        @click="deleteView(activeSaved)"
      >
        {{ t('Slet visning') }}
      </a-button>
    </div>

    <a-typography-text
      v-if="q"
      id="tk-search-note"
      type="secondary"
    >
      {{ t('Søger i alle dine sager, også afsluttede. Filtre gælder ikke under søgning.') }}
    </a-typography-text>

    <!-- scroll.x: på smalle skærme (f.eks. 200 % zoom) ruller tabellen vandret i sin egen ramme i stedet
         for at gøre hele siden bredere; bredere skærme fylder den som før (min. bredde 100 %) -->
    <a-table
      :columns="columns"
      :data-source="list"
      :pagination="false"
      :scroll="{ x: 600 }"
      row-key="id"
      :aria-label="t('Mine sager')"
    >
      <template #emptyText>
        <a-empty :image="Empty.PRESENTED_IMAGE_SIMPLE">
          <template #description>
            <a-typography-text type="secondary">
              {{ q ? t('Ingen kunder fundet') : t('Ingen sager matcher filtrene') }}
            </a-typography-text>
          </template>
        </a-empty>
      </template>
      <template #headerCell="{ column }">
        <TaskTip
          v-if="column.key === 'since'"
          :label="t('Ventetid')"
          :text="t('Hvor længe sagen har ligget hos den, der skal handle nu.')"
        />
        <span
          v-else-if="column.key === 'acts'"
          class="sr-only"
        >{{ column.title }}</span>
        <template v-else>
          {{ column.title }}
        </template>
      </template>
      <template #bodyCell="{ column, record: r }">
        <div
          v-if="column.key === 'cust'"
          class="tk-cell"
        >
          <a-typography-text
            :strong="r.step !== 'closed'"
            :type="r.step === 'closed' ? 'secondary' : undefined"
          >
            {{ r.name }}
          </a-typography-text>
          <a-typography-text type="secondary">
            {{ r.caseNr }}
          </a-typography-text>
        </div>
        <template v-else-if="column.key === 'owner'">
          <a-typography-text
            v-if="taskOwner(r.step) === 'dig'"
            strong
          >
            {{ t('Dig') }}
          </a-typography-text>
          <a-typography-text
            v-else-if="taskOwner(r.step) === 'kunden'"
            type="secondary"
          >
            {{ tk('Kunden') }}
          </a-typography-text>
          <span v-else>–</span>
        </template>
        <div
          v-else-if="column.key === 'status'"
          class="tk-cell"
        >
          <!-- Hvem der har bolden, ses af vægten: din tur er mørk og fed, kundens tur grå. Ingen rød. -->
          <a-typography-text
            :strong="taskOwner(r.step) === 'dig' && r.step !== 'closed'"
            :type="taskOwner(r.step) === 'dig' && r.step !== 'closed' ? undefined : 'secondary'"
          >
            {{ t(TASK_STEP_LABEL[r.step]) }}
          </a-typography-text>
          <a-typography-text
            v-if="r.step === 'closed'"
            type="secondary"
          >
            {{ r.closedReason }}
          </a-typography-text>
          <a-typography-text
            v-else-if="r.step !== 'done' && r.total > 0"
            type="secondary"
          >
            {{ taskFill(t('{a} af {b} modtaget'), { a: r.received, b: taskPlural(r.total, '{n} fil', '{n} filer') }) }}
          </a-typography-text>
          <a-typography-text
            v-if="r.step === 'waiting' && r.aq > 0"
            type="secondary"
          >
            {{ t('Venter på svar på dit spørgsmål') }}
          </a-typography-text>
          <a-typography-text
            v-if="r.step === 'waiting' && r.lastRemind != null"
            type="secondary"
          >
            {{ remindedText(r) }}
          </a-typography-text>
          <div class="tk-links">
            <a-button
              v-if="r.remind"
              class="tk-remind tk-link cw-link"
              type="link"
              size="small"
              :aria-label="(r.reminders ? t('Send ny påmindelse') : t('Send påmindelse')) + ': ' + r.name"
              @click="sendRemind(r)"
            >
              {{ r.reminders ? t('Send ny påmindelse') : t('Send påmindelse') }}
            </a-button>
            <a-button
              v-if="r.freshF > 0"
              class="tk-link"
              type="link"
              size="small"
              :aria-label="taskPlural(r.freshF, '{n} ny fil', '{n} nye filer') + ': ' + r.name"
              @click="open(r)"
            >
              {{ taskPlural(r.freshF, '{n} ny fil', '{n} nye filer') }}
            </a-button>
            <a-button
              v-if="r.freshQ > 0"
              class="tk-link"
              type="link"
              size="small"
              :aria-label="taskPlural(r.freshQ, '{n} nyt spørgsmål', '{n} nye spørgsmål') + ': ' + r.name"
              @click="open(r)"
            >
              {{ taskPlural(r.freshQ, '{n} nyt spørgsmål', '{n} nye spørgsmål') }}
            </a-button>
          </div>
        </div>
        <template v-else-if="column.key === 'since'">
          {{ taskRel(r.since) }}
        </template>
        <a-space v-else-if="column.key === 'acts'">
          <a-button
            class="tk-open"
            :aria-label="tk('Gå til sagen') + ': ' + r.name"
            @click="open(r)"
          >
            {{ tk('Gå til sagen') }}
          </a-button>
          <a-dropdown
            v-if="r.step !== 'closed'"
            :trigger="['click']"
            :visible="menuOpen === r.id"
            placement="bottomRight"
            @visible-change="(v) => onMenuVisible(r, v)"
          >
            <a-button
              class="tk-more"
              type="text"
              aria-haspopup="menu"
              :aria-expanded="menuOpen === r.id"
              :aria-label="t('Flere handlinger for') + ' ' + r.name"
            >
              <template #icon>
                <EllipsisOutlined aria-hidden="true" />
              </template>
            </a-button>
            <template #overlay>
              <a-menu
                :id="'tk-menu-' + r.id"
                :aria-label="t('Handlinger for') + ' ' + r.name"
                @click="({ key }) => onMenuClick(r, key)"
              >
                <a-menu-item key="close">
                  {{ t('Afslut sag') }}
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item-group :title="t('Flyt sagen til')">
                  <a-menu-item
                    v-for="m in DATA.TEAM"
                    :key="'move:' + m.short"
                    role="menuitemradio"
                    :aria-checked="m.short === r.c.responsible ? 'true' : 'false'"
                    :aria-label="t('Flyt sagen til') + ' ' + m.name"
                  >
                    <a-space>
                      <span>{{ m.name }}</span>
                      <CheckOutlined
                        v-if="m.short === r.c.responsible"
                        aria-hidden="true"
                      />
                    </a-space>
                  </a-menu-item>
                </a-menu-item-group>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </template>
    </a-table>
  </div>

  <!-- Skærmlæsere: en levende region, der altid er der, så beskeden læses op -->
  <div
    role="status"
    aria-live="polite"
    class="sr-only"
  >
    {{ pending ? taskFill(t('Påmindelse sendt til {navn}'), { navn: pending.name }) : '' }}
  </div>

  <a-modal
    :visible="!!closing"
    :wrap-props="{ 'aria-modal': 'true' }"
    :title="t('Afslut sag')"
    :width="440"
    :ok-text="t('Afslut sag')"
    :cancel-text="t('Annullér')"
    @ok="closeCase"
    @cancel="cancelClose"
  >
    <template v-if="closing">
      <a-typography-paragraph strong>
        {{ closing.name }}
      </a-typography-paragraph>
      <a-form layout="vertical">
        <a-form-item :label="t('Årsag')">
          <a-radio-group
            v-model:value="reason"
            name="tk-reason"
            role="radiogroup"
            :aria-label="t('Årsag')"
          >
            <a-space direction="vertical">
              <a-radio
                v-for="(l, i) in TASK_REASONS"
                :key="l"
                :value="i"
              >
                {{ t(l) }}
              </a-radio>
            </a-space>
          </a-radio-group>
        </a-form-item>
      </a-form>
      <a-typography-text type="secondary">
        {{ t('Sagen forsvinder fra fanerne. Du kan stadig finde den med søgningen.') }}
      </a-typography-text>
    </template>
  </a-modal>
</template>

<style scoped>
.tk-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px;
}

.tk-search-row {
  display: flex;
  gap: 8px;
}

.tk-search {
  flex: 1;
}

.tk-filter {
  width: 320px;
}

.tk-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tk-step-row,
.tk-range-head,
.tk-filter-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tk-range-head {
  width: 100%;
}

.tk-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tk-cell {
  display: flex;
  flex-direction: column;
}

.tk-links {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* Linkene starter på samme linje som teksten over dem (knappens egen sidepolstring fjernes) */
.tk-link {
  padding-inline: 0;
}
</style>
