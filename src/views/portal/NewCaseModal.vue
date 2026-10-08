<script setup>
// Ny sag-guiden (new_case_portal.jsx: NewCaseModal L98-550 og NcFieldError L93-95). Tre trin, der
// opretter en kladdesag med CW.addDemoCase og ikke sender noget til kunden. Guiden skriver aldrig
// i en eksisterende sag. Åbnes fra knappen Ny sag og fra window-eventet 'cw-new-case'
// (detail = { name, cvr, type?, amount? }): src/components/shell/NewCaseHost.vue monterer den med
// v-if og en ny :key pr. åbning, så tilstanden er ny hver gang, som før.
//
// Props: go (værtens binding; erklæret, så den ikke falder igennem som attribut. Navigationen
//            sker med useNavigation's go, som er den samme funktion),
//        prefill ({ name, cvr, type?, amount? } fra en anden skærm, fx en række i
//            Porteføljeanalyse: virksomheden vælges, hvis demoen kender den; type og beløb udfyldes).
// Emits: close (værten afmonterer guiden).
//
// Trinene ligger i ./new-case/. Tilstanden, valideringen og oprettelsen står her med de samme
// udtryk som før; hjælperne (nc*, NC_CASE_TYPES, NC_GUARANTEE_SHARE) er src/domain/new_case_portal.js.
// NcFieldError er nu a-form-item help/validate-status i trinene (fejlteksten har role="alert").
//
// Fokus, Tab og Esc (før: CW.useDialog):
// - Fokus i søgefeltet (#nc-q) ved åbning. Det sker, før ant-design-vue's åbne-animation slutter,
//   så antdv husker ikke selv, hvem der åbnede guiden (og værten fjerner den med v-if): guiden
//   husker document.activeElement i setup() og giver fokus tilbage, når den lukker, som før.
// - Esc er lagdelt som før: en åben "Fravælg anbefalet punkt?" lukkes først, så "Kassér det, du
//   har indtastet?", ellers spørges der før lukning (requestClose). Krydset spørger altid direkte.
// - antdv hører kun Esc og Tab, når fokus er i dialogen. Forsvinder det fokuserede element (fx
//   "Behold" eller et søgeresultat), klarer useDialogFocus (App.vue) Esc og Tab, som CW.useDialog gjorde.
// - Klik på baggrunden lukker ikke. Modalen står fast øverst (ikke centreret), så den ikke hopper,
//   når et trin skifter højde.
// - "Opret sag" og "Åbn sagen" lukker guiden med det samme og åbner sagen; App.vue flytter så fokus
//   til den nye sides h1.
// Ikke porteret (død kode): kvitteringen "Oprettet som kladde" i guiden. Oprettelsen lukker guiden i
// samme opdatering, så den blev aldrig vist.
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ArrowRightOutlined, LeftOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import {
  NC_CASE_TYPES, NC_EMAIL_RE, NC_GUARANTEE_SHARE, ncCompanyKey, ncCvrDigits, ncFill, ncKnownCompanies,
  ncNextCaseNr, ncParseAmount, ncRequestLink, ncTypeFrom,
} from '@/domain/new_case_portal'
import { go as navigate } from '@/composables/useNavigation'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { dialogBodyStyle } from '@/components/common/dialogBody'
import NewCaseCompanyStep from './new-case/NewCaseCompanyStep.vue'
import NewCaseMaterialStep from './new-case/NewCaseMaterialStep.vue'
import NewCaseContactStep from './new-case/NewCaseContactStep.vue'

const props = defineProps({
  prefill: { type: Object, default: undefined },
})
const emit = defineEmits(['close'])

const caseVersion = useCaseVersion()
// Elementet, der havde fokus, da guiden blev åbnet (før: CW.useDialog)
const opener = document.activeElement
const open = ref(true)

const step = ref(1)
const q = ref('')
const company = ref(null)
const caseType = ref((() => { const o = props.prefill && ncTypeFrom(props.prefill.type); return o ? o.v : '' })()) // påkrævet, intet forvalg
const amount = ref((() => {
  const a = props.prefill && props.prefill.amount
  if (a == null || a === '') return ''
  return typeof a === 'number' ? Math.round(a).toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK') : String(a)
})())
// Forvalget følger sagstypen (CW.defaultSelection); manual er det, rådgiveren selv har ændret
const manual = ref({})
const confirmDrop = ref(null) // punkt der ventes bekræftelse på at fravælge
const contact = ref({ name: '', role: '', email: '' })
const deadline = ref(CW.workdaysFromNow(10))
const tried = ref({}) // { [trin]: true } når "Næste" er forsøgt
const confirmClose = ref(false)
let done = null // den oprettede demosag
const caseNr = ncNextCaseNr()
// Et nyt personligt link, hver gang virksomheden skifter (før: useMemo på company.key)
const link = ref('')
watch(() => company.value && company.value.key, () => { link.value = company.value ? ncRequestLink(company.value.name) : '' })
// Det guiden blev åbnet med (inkl. prefill), så luk uden egne ændringer ikke spørger
let initial = { q: '', amount: amount.value }

// Læses, når der lukkes (ikke ved tegning)
const isDirty = () => !done && (step.value > 1 || q.value !== initial.q || amount.value !== initial.amount)
function requestClose () { if (isDirty()) confirmClose.value = true; else close() }
function onEsc () {
  if (confirmDrop.value) confirmDrop.value = null
  else if (confirmClose.value) confirmClose.value = false
  else requestClose()
}
// ant-design-vue melder både Esc (keydown) og krydset (click) som cancel
function onCancel (e) {
  if (e && e.type === 'keydown') onEsc()
  else requestClose()
}

function restoreFocus () {
  if (opener && opener.focus && document.contains(opener)) { try { opener.focus() } catch (e) {} }
}
// Annullér, Kassér, krydset og Esc: modalen lukker med sin animation og melder close bagefter
function close () {
  restoreFocus()
  open.value = false
}

function pick (c) {
  company.value = c
  q.value = c.primary ? c.cvr : c.name
  manual.value = {}
  const r = c.primary ? (DATA.REQUEST_RECIPIENT || {}) : {}
  contact.value = { name: r.name || '', role: (r.role || '').split(',')[0].trim(), email: r.email || '' }
}

// Forudfyldt fra en anden skærm: vælg virksomheden, hvis demoen kender den
if (props.prefill && (props.prefill.name || props.prefill.cvr)) {
  const d = ncCvrDigits(props.prefill.cvr)
  const k = ncCompanyKey(props.prefill.name)
  const hit = ncKnownCompanies().find(c => (d.length === 8 && ncCvrDigits(c.cvr) === d) || (k && c.key === k))
  const c = hit || { key: k || d, name: String(props.prefill.name || props.prefill.cvr), cvr: props.prefill.cvr || '', primary: false, adhoc: true }
  pick(c)
  initial = { q: c.primary ? c.cvr : c.name, amount: amount.value }
  link.value = ncRequestLink(c.name)
}

// Søgning: 8 cifre = CVR-opslag, bogstaver = navnesøgning blandt kendte virksomheder (se trin 1)
function onQuery (v) {
  q.value = v
  company.value = null
  const d = ncCvrDigits(v)
  if (!/[a-zæøå]/i.test(v) && d.length === 8) {
    const hit = ncKnownCompanies().find(c => ncCvrDigits(c.cvr) === d)
    if (hit) { pick(hit); q.value = v }
  }
}
// "Skift"
function changeCompany () {
  company.value = null
  q.value = ''
  CW.focusSoon('#nc-q')
}

const typeObj = computed(() => NC_CASE_TYPES.find(x => x.v === caseType.value) || null)
const amountVal = computed(() => ncParseAmount(amount.value))
// Punkterne med mærke og "hvorfor" for den valgte sagstype. Sagens egen virksomhed
// (Nordhavn): det der allerede ligger under Dokumenter, er ikke forvalgt, og punkter
// for sagens røde flag peger på flaget.
const own = computed(() => !!(company.value && company.value.primary))
const items = computed(() => {
  caseVersion.value
  return typeObj.value ? CW.itemsFor(typeObj.value.l, { own: own.value }) : CW.allItems()
})
const sel = computed(() => {
  caseVersion.value
  return Object.assign({}, typeObj.value ? CW.defaultSelection(typeObj.value.l, { own: own.value }) : {}, manual.value)
})
const selectedItems = computed(() => items.value.filter(it => sel.value[it.id]))
// Som i "Anmod om materiale": kernen og det valgte står i listen; resten ligger i
// en fold. Sagens egen virksomhed: det, der allerede findes i sagen, har sin egen fold.
const inCase = (it) => { const f = own.value ? CW.onFile(it) : null; return !!f && !f.stale }
const mainItems = computed(() => items.value.filter(it => sel.value[it.id] || (it.tier === 'core' && !inCase(it))))
const moreItems = computed(() => items.value.filter(it => !mainItems.value.includes(it) && !inCase(it)))
const caseItems = computed(() => items.value.filter(it => !mainItems.value.includes(it) && inCase(it)))
function toggleItem (it) {
  if (sel.value[it.id] && it.tag === 'Anbefalet') { confirmDrop.value = it.id; return }
  manual.value = { ...manual.value, [it.id]: !sel.value[it.id] }
}
// "Fravælg" i spørgsmålet under rækken
function dropItem (it) {
  manual.value = { ...manual.value, [it.id]: false }
  confirmDrop.value = null
  CW.focusSoon('#nc-item-' + it.id)
}
// "Tilføj" og "Bed om ny version" i foldene: punktet flytter op i listen og får fokus
function addItem (it) {
  manual.value = { ...manual.value, [it.id]: true }
  CW.focusSoon('#nc-item-' + it.id)
}

const emailOk = computed(() => NC_EMAIL_RE.test(contact.value.email.trim()))
const errors = computed(() => ({
  1: company.value ? null : 'company',
  2: !caseType.value ? 'type' : amountVal.value == null ? 'amount' : selectedItems.value.length === 0 ? 'items' : null,
  3: contact.value.email.trim() && !emailOk.value ? 'email' : !deadline.value ? 'deadline' : CW.isPast(deadline.value) ? 'deadlinePast' : null,
}))
const FIELD = computed(() => ({ company: 'nc-q', type: 'nc-type-' + NC_CASE_TYPES[0].v, amount: 'nc-amount', items: 'nc-item-' + (mainItems.value[0] && mainItems.value[0].id), email: 'nc-email', deadline: 'nc-deadline', deadlinePast: 'nc-deadline' }))
const FIRST = { 1: 'nc-q', 2: 'nc-type-' + NC_CASE_TYPES[0].v, 3: 'nc-name' }
// Fejlen på det viste trin, når "Næste" er forsøgt der (før: invalid(k)); trinene viser den ved feltet
const shownError = computed(() => (tried.value[step.value] ? errors.value[step.value] : null))

function next () {
  tried.value = { ...tried.value, [step.value]: true }
  if (errors.value[step.value]) { CW.focusSoon('#' + FIELD.value[errors.value[step.value]]); return }
  step.value = step.value + 1
  CW.focusSoon('#' + FIRST[step.value])
}
function back () {
  step.value = step.value - 1
  CW.focusSoon('#' + FIRST[step.value])
}

// Mailen kunden får, når rådgiveren sender anmodningen fra sagen. Samme skabelon som sagen.
const to = computed(() => ({ name: contact.value.name.trim(), email: contact.value.email.trim() }))
const mail = computed(() => {
  caseVersion.value
  return step.value === 3 && company.value
    ? CW.requestMail({ items: selectedItems.value, deadline: deadline.value && !CW.isPast(deadline.value) ? deadline.value : null, to: to.value, company: company.value.name, caseNr, link: link.value })
    : null
})

// Sagen gemmes med EIFOs beløb (ved kaution 80 % af bankens facilitet) og med
// anmodningen (punkter, modtager, svarfrist, link). Svarfristen er kundens frist
// for materialet, ikke sagsfristen, så sagen får ingen sagsfrist her.
// Guiden lukker, og den nye sag åbnes med en kvittering som toast.
let creating = false // dobbeltklik på "Opret sag" må ikke give to sager
function create () {
  if (creating || done) return
  tried.value = { ...tried.value, 3: true }
  if (errors.value[3]) { CW.focusSoon('#' + FIELD.value[errors.value[3]]); return }
  creating = true
  const typeO = typeObj.value
  const amountV = amountVal.value
  const facility = typeO.basis === 'facility' ? amountV : null
  const why = {}, tags = {}
  selectedItems.value.forEach(it => { why[it.id] = it.why; tags[it.id] = it.tag })
  const who = { name: contact.value.name.trim(), role: contact.value.role.trim(), email: contact.value.email.trim() }
  const d = CW.addDemoCase({
    name: company.value.name, cvr: company.value.cvr, caseNr, own: own.value,
    type: typeO.l, amount: facility ? Math.round(facility * NC_GUARANTEE_SHARE) : amountV,
    facilityAmount: facility, eifoShare: facility ? NC_GUARANTEE_SHARE : null, amountBasis: typeO.basis,
    // Dansk som i sagslisten; vis den med CW.demoCaseAmountNote(sag), der følger sproget
    amountNote: facility ? Math.round(NC_GUARANTEE_SHARE * 100) + ' % af bankens facilitet på ' + (facility / 1e6).toLocaleString('da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mio.' : null,
    risk: null, responsible: DATA.ME, lastActivityAt: new Date().toISOString(), missing: null,
    deadline: null,
    contact: who,
    request: { items: selectedItems.value.map(it => it.id), why, tags, deadline: deadline.value, to: who, link: link.value, sent: false },
  })
  done = d
  openCase(d.id)
  CW.toast(t('Sagen er oprettet som kladde. Der er ikke sendt noget til kunden.'))
}
// "Opret sag" og "Åbn sagen": guiden lukker med det samme (som før), og sagen åbnes. Fokus gives
// ikke tilbage til åbneren her: App.vue flytter det til sagens h1, når det fokuserede element er væk.
function openCase (id) {
  open.value = false
  emit('close')
  navigate('workspace:' + id)
}

const STEP_NAMES = { 1: 'Find virksomheden', 2: 'Sag og materiale', 3: 'Kontakt og svarfrist' }
// Dialogens navn og beskrivelse. a-modal lægger role="dialog" på sin wrapper, men ikke aria-modal,
// og dens egen aria-labelledby (titlens div) erstattes af nc-title (wrapProps lægges ovenpå).
const wrapProps = { 'aria-modal': 'true', 'aria-labelledby': 'nc-title', 'aria-describedby': 'nc-step' }

// Fokus i søgefeltet ved åbning (før: [autofocus] via CW.useDialog)
onMounted(() => {
  let n = 0
  const tick = () => {
    const el = document.getElementById('nc-q')
    if (el) el.focus()
    if (el && document.activeElement === el) return
    if (++n < 20) setTimeout(tick, 30)
  }
  nextTick(tick)
})

// Fokus tabt (det fokuserede element forsvandt): Esc og Tab klares for alle dialoger af
// useDialogFocus (App.vue). Esc når onCancel som en keydown og er derfor lagdelt som ovenfor.

// "Kassér det, du har indtastet?": fokus på "Fortsæt med sagen" (før: autoFocus)
const keepCaseBtn = ref(null)
watch(confirmClose, (on) => {
  if (on && keepCaseBtn.value && keepCaseBtn.value.$el) keepCaseBtn.value.$el.focus()
}, { flush: 'post' })
</script>

<template>
  <a-modal
    :visible="open"
    :width="720"
    :mask-closable="false"
    destroy-on-close
    :body-style="{ ...dialogBodyStyle, minHeight: '380px' }"
    :wrap-props="wrapProps"
    :after-close="() => emit('close')"
    @cancel="onCancel"
  >
    <template #title>
      <span id="nc-title">{{ t('Ny sag') }}</span>
    </template>

    <a-typography-paragraph
      id="nc-step"
      type="secondary"
      aria-live="polite"
    >
      {{ ncFill(t('Trin {n} af 3: {name}'), { n: step, name: t(STEP_NAMES[step]) }) }}
    </a-typography-paragraph>

    <NewCaseCompanyStep
      v-if="step === 1"
      :q="q"
      :company="company"
      :error="shownError"
      @query="onQuery"
      @pick="pick"
      @change-company="changeCompany"
      @open-case="openCase"
    />
    <NewCaseMaterialStep
      v-else-if="step === 2"
      v-model:case-type="caseType"
      v-model:amount="amount"
      :error="shownError"
      :type-obj="typeObj"
      :amount-val="amountVal"
      :main-items="mainItems"
      :more-items="moreItems"
      :case-items="caseItems"
      :sel="sel"
      :confirm-drop="confirmDrop"
      @toggle="toggleItem"
      @keep="confirmDrop = null"
      @drop="dropItem"
      @add="addItem"
    />
    <NewCaseContactStep
      v-else
      v-model:contact="contact"
      v-model:deadline="deadline"
      :error="shownError"
      :mail="mail"
      :to="to"
      :company-name="company ? company.name : ''"
      :case-nr="caseNr"
      :link="link"
    />

    <template #footer>
      <!-- Spørgsmålet står i bunden af guiden, ikke i en dialog mere -->
      <a-row
        v-if="confirmClose"
        justify="space-between"
        align="middle"
        :wrap="false"
      >
        <a-typography-text role="alert">
          {{ t('Kassér det, du har indtastet?') }}
        </a-typography-text>
        <a-space>
          <a-button
            ref="keepCaseBtn"
            @click="confirmClose = false"
          >
            {{ t('Fortsæt med sagen') }}
          </a-button>
          <a-button
            danger
            @click="close"
          >
            {{ t('Kassér') }}
          </a-button>
        </a-space>
      </a-row>
      <a-row
        v-else
        justify="space-between"
        align="middle"
      >
        <div>
          <a-button
            v-if="step > 1"
            @click="back"
          >
            <template #icon>
              <LeftOutlined aria-hidden="true" />
            </template>
            {{ t('Tilbage') }}
          </a-button>
        </div>
        <a-space>
          <a-button @click="requestClose">
            {{ t('Annullér') }}
          </a-button>
          <a-button
            v-if="step < 3"
            type="primary"
            @click="next"
          >
            {{ t('Næste') }}
            <ArrowRightOutlined aria-hidden="true" />
          </a-button>
          <a-button
            v-else
            type="primary"
            @click="create"
          >
            {{ t('Opret sag') }}
          </a-button>
        </a-space>
      </a-row>
    </template>
  </a-modal>
</template>
