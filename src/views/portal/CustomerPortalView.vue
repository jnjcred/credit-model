<script setup>
// Kundens portal (new_case_portal.jsx: CustomerPortal, L891–1283): skærmene fra invitationslinket til
// "Vi er færdige", og rådgiverens forhåndsvisning af dem.
//
// Kunden: landingssiden fra invitationslinket (PortalLanding), trinnet Bruger (PortalOnboarding), Crediwires
// egen side til opret bruger eller log ind (CrediwireAuth, demo af omstillingen), derefter oversigten
// (PortalHub) med punkternes sider (PortalUpload, PortalConnect, PortalTradeScreen, ErpSetup) og statussiden.
// Afslået sag: PortalClosed. Ingen anmodning: PortalNoRequest.
//
// Forhåndsvisningen (preview, rådgiverens "Kundeside" og "Kundeflow" fra sagen): rådgiveren kan gå mellem
// kundens skærme, men intet gemmes. Alt mærket data-cust-act stoppes her (i capture-fasen, før knappen selv
// reagerer) og forklares i PreviewNote, og CW afviser selv kundehandlinger, så længe forhåndsvisningen er
// åben. Kundeside (flow = false) åbner altid på kundens oversigt med en statusboks øverst, hvis kunden ikke
// er færdig med opstarten. Kundeflow (flow = true, demo) viser de skærme, kunden kommer igennem, fra
// landingssiden (eller flowStart) med skærmrækken øverst. I begge vælges rollen øverst: Rådgiver
// (forhåndsvisningen som ovenfor) eller Kunde, hvor portalen virker som for kunden: svar, filer og beskeder
// gemmes, som om kunden havde sendt dem. Rollen huskes i browseren (kabul:flow-role).
// Kundeside har også rækken med kundens skærme øverst (landing, bruger, log ind, oversigt osv.), så rådgiveren kan
// klikke sig gennem hele kundens vej fra Kundeside; Kundeflow har ikke længere en knap i menuen.
//
// Demoknapperne til Regnskabs kilder (forbind e-conomic, upload saldobalance, intern årsrapport og budget;
// PortalSourceDemo i oversigtens rækker) står i kundens portal og på Kundeside, når anmodningen er sendt,
// men ikke i Kundeflow.
//
// Props: preview, flow, flowStart ('landing' | 'account' | 'signup' | 'login' | 'hub' | 'material'),
//        onOpenFlow (funktion: Kundeside → Kundeflow på kundens trin; en prop, ikke en emit, så portalen kan
//        se, om værten har givet den: uden den vises "Se hvad kunden ser" ikke, som før).
// Emits: back (Luk / "Tilbage til rådgiver-visning").
//
// Det, der gemmes, er det samme som før: portalens hukommelse (kabul:portal:nordhavn: skærm, punkt og
// genkendt enhed), login for fanen (sessionStorage kabul:portal-session) og rollen i forhåndsvisningen.
// Forhåndsvisningen gemmer intet af det. Sidens titel følger skærmen, og viewporten følger telefonen, så
// længe kundens portal vises (index.html låser den til rådgiverværktøjets 1280 px).
// Ikke porteret (død kode): pvNav og PortalPvStepNav (forrige/næste-bjælken var slået fra), setStep og
// onJump til opstarten (kun trinnet 'data' brugte dem), dobbeltkopien af demo-landefordelingen i
// fillAll (DEMO_COUNTRIES har de samme tal) og PortalNeedCard (blev ikke vist).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Grid } from 'ant-design-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { csClearDraft } from '@/domain/customer'
import { DEMO_COUNTRIES, PORTAL_SESSION_KEY, demoFileName, demoPdf, ncFill, portalKind, portalMem, portalSetFiscalYear, portalStatus, portalTrusted, setPortalMem } from '@/domain/new_case_portal'
import { obDemoLabel, obDemoSkip, obDemoStage, obDemoState, pvScreenLabel } from '@/domain/onboarding'
import { useCase } from '@/composables/useCaseVersion'
import { previewMemory, setPreviewMemory } from '@/composables/usePreviewMemory'
import { useFreshThreads } from '@/views/customer/useFreshThreads'
import PortalPreviewBar from './components/PortalPreviewBar.vue'
import PortalHeader from './components/PortalHeader.vue'
import PortalDemoBar from './components/PortalDemoBar.vue'
import PortalPvObStatus from './components/PortalPvObStatus.vue'
import PortalOtherFilesModal from './components/PortalOtherFilesModal.vue'
import DelegateBundleModal from './components/DelegateBundleModal.vue'
import PortalNoRequest from './PortalNoRequest.vue'
import PortalClosed from './PortalClosed.vue'
import PortalLanding from './PortalLanding.vue'
import PortalHub from './PortalHub.vue'
import PortalStatus from './PortalStatus.vue'
import PortalUpload from './PortalUpload.vue'
import PortalConnect from './PortalConnect.vue'
import PortalTradeScreen from './PortalTradeScreen.vue'
import PortalOnboarding from './onboarding/PortalOnboarding.vue'
import PortalAiNotice from './PortalAiNotice.vue'
import { aiNoticeDone } from '@/domain/aiNotice'
import CrediwireAuth from './onboarding/CrediwireAuth.vue'
import ErpSetup from './onboarding/ErpSetup.vue'
import OnboardingDemoBar from './onboarding/OnboardingDemoBar.vue'
import PreviewNote from './onboarding/PreviewNote.vue'

const props = defineProps({
  preview: { type: Boolean, default: false },
  flow: { type: Boolean, default: false },
  flowStart: { type: String, default: null },
  onOpenFlow: { type: Function, default: null },
})
const emit = defineEmits(['back'])

// Telefoner: større knapper og felter (berøringsmål). Den indre a-config-provider ændrer ikke antdv's
// globale indstillinger (beskeder og bekræftelser beholder appens), og sproget arves fra appen.
const screens = Grid.useBreakpoint()
const componentSize = computed(() => (screens.value.xs ? 'large' : undefined))

// Portalens rod (a-layout: sidens baggrund som i resten af appen)
const layoutRef = ref(null)
const rootEl = computed(() => (layoutRef.value ? layoutRef.value.$el : null))
const req = useCase(() => CW.request())
const hasReq = computed(() => !!req.value || props.preview)
const ob = useCase(() => CW.onboarding())
// Gemte demotilstande fra før opstarten fandtes: vilkår accepteret på velkomsten = opstarten er gjort
const legacy = useCase(() => !CW.onboarding().account && !!portalMem().accepted)
const authed = ref(portalTrusted())
const loggedIn = computed(() => !props.preview && authed.value && (!!ob.value.account || legacy.value))
// Landingssiden ("Kære …") vises først, indtil der er en bruger; har kunden en, går linket til Log ind
const landed = ref(false)
// Fra trinnet Bruger ("Fortsæt med Crediwire") sendes kunden til Crediwires side; "Tilbage til Materiale til EIFO" lukker den
const cwAuth = ref(false)
// Kendt Crediwire-bruger, der allerede har virksomheden: Bruger viser "tjekker" og sender videre
const obArrive = ref(false)
// Demoknapperne på trinnet Bruger: i Kundeflow et stadie, der kun vises; demoKey tegner trinnet forfra
const obDemo = ref(null)
const demoKey = ref(0)
const landing = computed(() => !props.preview && !loggedIn.value && !ob.value.account && !legacy.value && !landed.value)
// Afslået eller indstillet sag: kunden kan ikke længere sende noget
const lock = useCase(() => CW.customerLock())
// Oplysningen om AI (aiNotice.js): efter opstarten og før alt andet, også for kunder, der allerede er i gang
// (ny version af teksten = ny kvittering). Ikke i rådgiverens forhåndsvisning og ikke på en låst sag
const needAi = computed(() => !aiNoticeDone(ob.value) && !lock.value)
// Opstarten: det trin, kunden mangler, eller et tidligere, kunden er gået tilbage til
const obView = ref(null)
const obNext = computed(() => (legacy.value || lock.value ? null : CW.onboardingStep(ob.value)))
const obStep = computed(() => (!props.preview && loggedIn.value ? (obView.value || obNext.value) : null))

// Forhåndsvisningen starter, hvor kunden er: ingen bruger endnu, et trin i opstarten, eller oversigten
function initialPvOb () {
  if (!props.preview || !props.flow || lock.value === 'declined') return null
  const k = props.flowStart || 'landing'
  // Har kunden ingen bruger endnu, starter Kundeflow på landingssiden
  if (k === 'account' && !ob.value.account) return 'landing'
  return ['hub', 'material'].includes(k) ? null : k
}
// Forhåndsvisningen efter en genindlæsning: samme skærm som før (Kundeflows skærm og portalens visning)
const pvMem0 = props.preview ? previewMemory() : null
const pvOb = ref(pvMem0 && pvMem0.pvOb !== undefined ? pvMem0.pvOb : initialPvOb())
watch(pvOb, (k) => { if (props.preview) setPreviewMemory({ pvOb: k }) })
const pvNote = ref(null)
// Hvem bruger siden? Rådgiveren (forhåndsvisning, spærret) eller kunden (alt virker)
// Rådgiveren ser altid Rådgiver-visningen som udgangspunkt, også hvis den sidst valgte rolle var Kunde
const flowRole = ref('rådgiver')
const asAdvisor = computed(() => props.preview && flowRole.value !== 'kunde')
// Spærren sættes, før noget i portalen tegnes (f.eks. dialogen, der ellers markerer beskeder som læst af kunden)
if (asAdvisor.value) CW.setPreview(true)
// Spærren skiftes med det samme, så alt, der spørger CW.isPreview(), f.eks. mail-afkrydsningen i dialogen og
// "Skriv som rådgiver", følger rollen. CW.isPreview() er ikke reaktiv: skiftet meldes som en ændring af
// sagen (CW.bump), så portalens dele læser den igen uden at miste det, der er skrevet (som React's gentegning).
function setFlowRole (r) {
  CW.setPreview(r !== 'kunde')
  flowRole.value = r
  pvNote.value = null
  try { localStorage.setItem('kabul:flow-role', r) } catch (e) {}
  CW.bump()
}

// Startskærm: kundens egen (overlever genindlæsning). Forhåndsvisningen følger kunden, men husker ikke selv noget.
const initial = (() => {
  const m = portalMem()
  const itemScreens = ['upload', 'connect', 'trade', 'erp']
  let s = ['hub', 'status'].concat(itemScreens).includes(m.screen) ? m.screen : 'hub'
  let id = null
  if (itemScreens.includes(s) && s !== 'erp') {
    if (!props.preview && m.itemId && CW.requestedItems().some(it => it.id === m.itemId)) id = m.itemId; else s = 'hub'
  }
  // Forhåndsvisningen (Kundeside og Kundeflow) åbner på oversigten
  if (props.preview && s !== 'status') s = 'hub'
  if (props.preview && !props.flow) s = 'hub'
  // ... medmindre rådgiveren stod på en anden skærm, før siden blev genindlæst
  const pm = props.preview ? previewMemory() : null
  if (pm && pm.screen) {
    const okItem = !pm.itemId || CW.requestedItems().some(it => it.id === pm.itemId)
    if (okItem) { s = pm.screen; id = pm.itemId || null }
  }
  return { s, id }
})()
const screen = ref(initial.s)
const activeId = ref(initial.id)
const bundle = ref(null) // null | { preselect }
const otherOpen = ref(false)
const justSubmitted = ref(false)
let returnTo = null

function go (s, itemId = null, backTo = null) {
  returnTo = backTo
  if (!props.preview) setPortalMem({ screen: s, itemId })
  else setPreviewMemory({ screen: s, itemId })
  activeId.value = itemId
  screen.value = s
}

// Forhåndsvisningen: kundehandlinger afvises, og rådgiverens egne beskeder (toasts) skjules, så længe
// kundens side vises
function onBlocked (e) { pvNote.value = { what: e.detail || '', n: Date.now() } }
function lockOff () {
  window.removeEventListener('cw-preview-blocked', onBlocked)
  CW.setPreview(false)
}
watch(asAdvisor, (on, _, onCleanup) => {
  if (!on) return
  CW.setPreview(true)
  window.addEventListener('cw-preview-blocked', onBlocked)
  onCleanup(lockOff)
}, { immediate: true })
onBeforeUnmount(() => { if (asAdvisor.value) lockOff() })

// Stopper klik, slip og formularer på alt, der er kundens handling (data-cust-act)
const pvStop = (e, fallback) => {
  // Uploadfelterne i punkterne (og knappen, der sender filerne) virker: rådgiveren uploader på kundens vegne
  if (e.target && e.target.closest && e.target.closest('[data-pv-allow]')) return
  // Links i teksten (f.eks. "brugsvilkår") er ikke kundens handling, selv om de står i en afkrydsning
  const link = e.type === 'click' && e.target && e.target.closest && e.target.closest('.cwp-linkbtn')
  if (link && !link.hasAttribute('data-cust-act')) return
  const el = (e.target && e.target.closest && e.target.closest('[data-cust-act]'))
    || (e.type === 'submit' && e.target.querySelector && e.target.querySelector('[data-cust-act]'))
  if (!el && !fallback) return
  e.preventDefault(); e.stopPropagation()
  pvNote.value = { what: el ? el.getAttribute('data-cust-act') : fallback, n: Date.now() }
}
const onClickCapture = (e) => { if (asAdvisor.value) pvStop(e) }
const onDropCapture = (e) => { if (asAdvisor.value) pvStop(e, 'upload') }
const onSubmitCapture = (e) => { if (asAdvisor.value) pvStop(e, 'send') }
// Portalens dialoger lægges i portalens rod, så spærren også ser deres knapper
const portalRoot = () => rootEl.value || document.body

// Portalen er kundens side og skal kunne bruges på en telefon. index.html låser viewporten til 1280 px for
// rådgiverværktøjet; her slås det fra, så længe portalen vises.
let restoreViewport = null
onMounted(() => {
  if (props.preview) return
  const m = document.querySelector('meta[name=viewport]')
  if (!m) return
  const prev = m.getAttribute('content')
  m.setAttribute('content', 'width=device-width, initial-scale=1')
  restoreViewport = () => m.setAttribute('content', prev)
})
onBeforeUnmount(() => { if (restoreViewport) restoreViewport() })

const requested = useCase(() => CW.requestedItems())
const view = screen
const active = computed(() => { requested.value; return activeId.value ? CW.itemById(activeId.value) : null })
// "Nyt" og "1 nyt svar" gælder den visning, hvor kunden så dem første gang. Sideeffekt (som før): kundens
// ulæste beskeder markeres som læst, når portalen vises for kunden (ikke i rådgiverens forhåndsvisning)
useFreshThreads(() => asAdvisor.value, () => view.value + ':' + (activeId.value || ''))

// Sidetitel pr. trin, f.eks. "Intern årsrapport · Materiale til EIFO"
const pageName = computed(() => (!hasReq.value && lock.value !== 'declined' ? t('Ingen aktiv anmodning')
  : landing.value ? t('Anmodning fra EIFO')
  : !loggedIn.value ? (!cwAuth.value ? ncFill(t('Opstart: {step}'), { step: pvScreenLabel('account') }) : ob.value.account ? t('Crediwire: Log ind') : t('Crediwire: Opret bruger'))
  : lock.value === 'declined' ? t('Sagen er afsluttet')
  : obStep.value ? ncFill(t('Opstart: {step}'), { step: pvScreenLabel(obStep.value) })
  : view.value === 'hub' ? t('Oversigt')
  : view.value === 'status' ? t('Status') : view.value === 'erp' ? t('Regnskabssystem') : active.value ? t(active.value.label) : t('Oversigt')))
// Titlen sættes ikke tilbage, når portalen lukkes: appen sætter selv titlen for den nye rute
watch(pageName, (n) => { if (!props.preview) document.title = n + ' - ' + t('Materiale til EIFO') }, { immediate: true })

// Fokus ved skift af visning (ikke første gang): til overskriften, eller tilbage til punktet, man kom fra
watch([view, activeId, loggedIn, obStep, pvOb, cwAuth, landing], (_n, _o, onCleanup) => {
  const backTo = returnTo; returnTo = null
  const root = rootEl.value
  if (!root) return
  if (!backTo) { if (props.preview) root.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0) }
  const id = setTimeout(() => {
    const el = backTo ? root.querySelector('[data-row="' + backTo + '"] button') : root.querySelector('.cwp-main h1')
    if (!el) return
    if (!el.matches('button,a,input,textarea,select')) el.setAttribute('tabindex', '-1')
    try { el.focus({ preventScroll: !backTo }) } catch (e) {}
    if (backTo) el.scrollIntoView({ block: 'center' })
  }, 40)
  onCleanup(() => clearTimeout(id))
}, { flush: 'post' })

const openItem = (id) => go(portalKind(id), id)
const toHub = (fromId) => go('hub', null, fromId || null)

// Kunden afslutter et uploadpunkt: filerne registreres i CW og punktet markeres som sendt.
// fiscal: regnskabsårets første måned (budgettet), gemmes på sagen
function finish (id, files, note, fiscal, fiscalLen, fiscalPeriods) {
  const prev = CW.itemState(id)
  // På Kundeside (forhåndsvisning) uploader rådgiveren på kundens vegne: filen står som rådgiverens
  const by = CW.isPreview() ? 'rådgiver' : 'kunde'
  if (fiscal) portalSetFiscalYear(fiscal, by, id, fiscalLen, fiscalPeriods)
  // Svar på rådgiverens spørgsmål uden ny fil: det, der allerede er sendt, gælder stadig
  if (prev && prev.status === 'rejected' && !(files || []).length && note) {
    if (!CW.answerItem(id, note, { by })) return
    csClearDraft(id)
    CW.toast(by === 'rådgiver' ? t('Svaret er gemt på kundens vegne') : ncFill(t('Svaret er sendt til {name}'), { name: 'EIFO' }))
    toHub(id)
    return
  }
  const metas = (files || []).map(f => (f instanceof File ? CW.putFiles([f], { by, itemId: id })[0] : f))
  csClearDraft(id)
  const noteOnly = by === 'rådgiver' && !metas.length && !!(note || '').trim() && !(prev && prev.status === 'received')
  const changed = metas.length || noteOnly || (prev && prev.status === 'received' && (note || '') !== (prev.note || ''))
  if (changed) {
    const stale = prev && (prev.status === 'noted' || prev.status === 'rejected' || prev.status === 'delegated')
    CW.markReceived(id, { by, files: metas, note: note != null ? note : (stale ? '' : undefined), noteKind: noteOnly ? 'ikke-relevant' : undefined })
    CW.toast(by === 'rådgiver'
      ? ncFill(t('{item} er uploadet på kundens vegne'), { item: t(CW.itemById(id).label) })
      : ncFill(t('{item} er sendt til {name}'), { item: t(CW.itemById(id).label), name: 'EIFO' }))
  }
  toHub(id)
}

function fillAll () {
  requested.value.forEach(it => {
    const st = portalStatus(it.id)
    if (st === 'received' || st === 'approved' || st === 'noted') return
    if (it.form === 'countries') {
      CW.markReceived(it.id, { by: 'kunde', files: [], note: '', answers: { countries: DEMO_COUNTRIES } })
      return
    }
    // Periodetallene kan stadig hentes fra regnskabssystemet i punktet; demoen uploader filen
    const file = CW.demoUploadFile(it.id) || demoPdf(demoFileName(it), t(it.label) + ' - ' + DATA.COMPANY.name)
    CW.markReceived(it.id, { by: 'kunde', files: CW.putFiles([file], { by: 'kunde', itemId: it.id }), note: '' })
  })
  toHub()
}

// Dobbeltklik på "Vi er færdige" må ikke færdigmelde to gange
let submitting = false
function submit () {
  if (submitting) return
  submitting = true
  CW.customerSubmit()
  justSubmitted.value = true
  go('status')
  setTimeout(() => { submitting = false }, 600)
}

// Dialogen lukker sig selv bagefter (fokus tilbage til knappen, der åbnede den)
function delegate (ids, contact, kind) {
  CW.markDelegated(ids, { name: contact.name, email: contact.email, role: kind === 'bank' ? 'bank' : 'revisor' })
  CW.toast(ncFill(t('Sendt til {name}. I kan følge med her på oversigten.'), { name: contact.name }))
}

// Logget ind: "Husk mig" husker enheden i 30 dage, ellers gælder det fanen
function onAuthed (remember, arrive) {
  if (remember) setPortalMem({ trustedUntil: new Date(Date.now() + 30 * 864e5).toISOString() })
  else { try { sessionStorage.setItem(PORTAL_SESSION_KEY, '1') } catch (e) {} }
  cwAuth.value = false
  obArrive.value = !!arrive
  obView.value = arrive ? 'account' : null
  authed.value = true
}
function logout () {
  setPortalMem({ trustedUntil: null })
  try { sessionStorage.removeItem(PORTAL_SESSION_KEY) } catch (e) {}
  // Tilbage til trinnet Bruger; Crediwire afgør selv, om det er Opret bruger eller Log ind
  cwAuth.value = false
  obArrive.value = false
  obView.value = null
  authed.value = false
}
// Opstarten er færdig (eller kunden sendte tallene selv): oversigten med materialet
function onboardingDone () { obView.value = null; go('hub') }
// Demo (præsentatoren er kunden): log ind og spring opstarten over
function demoSkip () {
  if (!ob.value.doneAt && !legacy.value) obDemoSkip()
  try { sessionStorage.setItem(PORTAL_SESSION_KEY, '1') } catch (e) {}
  obView.value = null
  authed.value = true
  go('hub')
}

// Forhåndsvisningens navigation: opstartens skærme eller portalens egne
function pvGo (k) {
  pvNote.value = null
  obDemo.value = null
  if (k === 'material') k = 'hub'
  if (k === 'hub') { pvOb.value = null; go(k) }
  else pvOb.value = k
}
const pvCurrent = computed(() => pvOb.value || (view.value === 'hub' ? view.value : null))

// Sagsnummer, produkt og beløb står først i toppen, når kunden er logget ind (eller i forhåndsvisningen)
const showMeta = computed(() => (props.preview ? !pvOb.value : loggedIn.value && !obStep.value))
// Crediwires egen login-side: hele skærmen, uden portalens top (kunden er "sendt videre")
const cwPage = computed(() => hasReq.value && lock.value !== 'declined' && (props.preview ? (pvOb.value === 'signup' || pvOb.value === 'login') : (!loggedIn.value && !landing.value && cwAuth.value)))

// Demo: spring mellem stadierne i trinnet Bruger. I portalen gemmes stadiet (som om kunden var kommet
// tilbage fra Crediwire); i Kundeflow vises det kun
function pickObDemo (k) {
  demoKey.value++
  if (props.preview) { obDemo.value = k; pvNote.value = null; pvOb.value = 'account'; return }
  if (CW.setOnboarding(obDemoState(k), ncFill(t('Demo: trinnet Bruger som "{stage}"'), { stage: obDemoLabel(k) })) === false) return
  cwAuth.value = false
  if (k === 'pre') { logout(); return }
  onAuthed(false, k === 'knownCo')
}
const obDemoCurrent = computed(() => (props.preview && obDemo.value ? obDemo.value : obDemoStage(ob.value, props.preview ? !!ob.value.account : loggedIn.value)))

// Indholdet: den første betingelse, der passer, vinder (samme rækkefølge som før)
const content = computed(() => {
  const declined = lock.value === 'declined'
  if (!hasReq.value && !declined) return 'norequest'
  if (props.preview && pvOb.value === 'landing' && !declined) return 'pv-landing'
  if (cwPage.value && props.preview) return 'pv-auth'
  if (props.preview && pvOb.value && !declined) return 'pv-onboarding'
  if (declined) return 'closed'
  if (landing.value) return 'landing'
  if (!props.preview && !loggedIn.value && !cwAuth.value) return 'pre'
  if (!props.preview && !loggedIn.value) return 'auth'
  if (obStep.value) return 'onboarding'
  if (!props.preview && needAi.value) return 'ai'
  if (view.value === 'upload' && active.value && !lock.value) return 'upload'
  if (view.value === 'connect' && active.value && !lock.value) return 'connect'
  // Ingen kontrol af samtykket her: det skrives midt i forbindelsen, og dialogen skal blive stående til
  // "Fortsæt" (ErpSetup går selv tilbage, hvis der allerede er forbundet, når den åbnes)
  if (view.value === 'erp' && !lock.value) return 'erp'
  if (view.value === 'trade' && active.value && !lock.value) return 'trade'
  if (view.value === 'status') return 'status'
  return 'hub'
})
// Kundeside: hvor kunden er i opstarten, øverst på oversigten
// (også i Kundeflow på Oversigt, når kunden endnu ikke er nået dertil)
const showPvObStatus = computed(() => asAdvisor.value && !lock.value && view.value === 'hub')
// "Anmod om materiale" i boksen, når anmodningen ikke er sendt: forhåndsvisningen lukkes, og materialevalget åbnes
function requestMaterial () {
  emit('back')
  if (typeof window.CW_REQUEST_MORE === 'function') window.CW_REQUEST_MORE(() => CW.focusSoon('#ws-material-title'))
}
const demoSkipLabel = computed(() => (!loggedIn.value && (ob.value.doneAt || legacy.value) ? t('Log ind (demo)') : t('Spring opstarten over (demo)')))
</script>

<template>
  <a-config-provider
    :component-size="componentSize"
    not-update-global-config
  >
    <a-layout
      ref="layoutRef"
      class="cwp portal"
      :class="{ 'cwp-preview': preview }"
      @click.capture="onClickCapture"
      @drop.capture="onDropCapture"
      @submit.capture="onSubmitCapture"
    >
      <div class="portal-top">
        <PortalPreviewBar
          v-if="preview"
          :flow="flow"
          :flow-role="flowRole"
          :has-request="!!req"
          :jump="lock !== 'declined'"
          :current="pvCurrent"
          :demo="!flow && !!req && !lock"
          @role="setFlowRole"
          @close="emit('back')"
          @jump="pvGo"
        />
        <!-- Kun afsender og firmanavn; ingen "sikker"-mærker (K9) -->
        <PortalHeader
          v-if="!cwPage"
          :preview="preview"
          :show-meta="showMeta"
          :logged-in="loggedIn"
          @logout="logout"
        />
      </div>

      <component
        :is="preview ? 'div' : 'main'"
        :id="preview ? undefined : 'cwp-main'"
        class="cwp-main"
        :class="{ 'cwp-main-cw': cwPage }"
        :tabindex="preview ? undefined : -1"
      >
        <PortalNoRequest v-if="content === 'norequest'" />
        <PortalLanding
          v-else-if="content === 'pv-landing'"
          @start="pvGo('account')"
        />
        <CrediwireAuth
          v-else-if="content === 'pv-auth'"
          :key="pvOb"
          :mode="pvOb"
          preview
          @back="pvGo('account')"
        />
        <PortalOnboarding
          v-else-if="content === 'pv-onboarding'"
          :key="'pv' + demoKey"
          :step="pvOb"
          preview
          :pre="obDemo ? obDemo === 'pre' : !ob.account"
          :demo="obDemo ? obDemoState(obDemo) : null"
          :arrive="obDemo === 'knownCo'"
          @continue="pvGo((obDemo ? obDemo !== 'pre' : !!ob.account) ? 'login' : 'signup')"
          @finished="pvGo('hub')"
        >
          <template
            v-if="pvOb === 'account'"
            #footer
          >
            <OnboardingDemoBar
              preview
              :current="obDemoCurrent"
              @pick="pickObDemo"
            />
          </template>
        </PortalOnboarding>
        <PortalClosed v-else-if="content === 'closed'" />
        <PortalLanding
          v-else-if="content === 'landing'"
          @start="landed = true"
        />
        <PortalOnboarding
          v-else-if="content === 'pre'"
          :key="'pre' + demoKey"
          step="account"
          pre
          @continue="cwAuth = true"
        >
          <template #footer>
            <OnboardingDemoBar
              :current="obDemoCurrent"
              @pick="pickObDemo"
            />
          </template>
        </PortalOnboarding>
        <CrediwireAuth
          v-else-if="content === 'auth'"
          @authed="onAuthed"
          @back="cwAuth = false"
        />
        <PortalOnboarding
          v-else-if="content === 'onboarding'"
          :key="obStep + demoKey"
          :step="obStep"
          :arrive="obArrive"
          @finished="onboardingDone"
          @logout="logout"
        >
          <template
            v-if="obStep === 'account'"
            #footer
          >
            <OnboardingDemoBar
              :current="obDemoCurrent"
              @pick="pickObDemo"
            />
          </template>
        </PortalOnboarding>
        <PortalAiNotice
          v-else-if="content === 'ai'"
          :updated="!!ob.aiNotice || CW.allUploads().some(f => f.by === 'kunde')"
          @done="go('hub')"
        />
        <PortalUpload
          v-else-if="content === 'upload'"
          :key="'upload:' + active.id"
          :item="active"
          @back="toHub(active.id)"
          @finish="(files, note, fiscal, fiscalLen, fiscalPeriods) => finish(active.id, files, note, fiscal, fiscalLen, fiscalPeriods)"
          @noted="toHub(active.id)"
        />
        <PortalConnect
          v-else-if="content === 'connect'"
          :key="'connect:' + active.id"
          :item="active"
          @back="toHub(active.id)"
          @finish="(files, note, fiscal, fiscalLen, fiscalPeriods) => finish(active.id, files, note, fiscal, fiscalLen, fiscalPeriods)"
          @noted="toHub(active.id)"
        />
        <ErpSetup
          v-else-if="content === 'erp'"
          @back="toHub()"
          @done="toHub()"
        />
        <PortalTradeScreen
          v-else-if="content === 'trade'"
          :key="'trade:' + active.id"
          :item="active"
          @back="toHub(active.id)"
          @done="toHub(active.id)"
        />
        <PortalStatus
          v-else-if="content === 'status'"
          :just-submitted="justSubmitted"
          @back="go('hub')"
        />
        <template v-else>
          <PortalPvObStatus
            v-if="showPvObStatus"
            :flow="flow"
            :on-open-flow="onOpenFlow"
            @request="requestMaterial"
          />
          <PortalHub
            :requested="requested"
            :lock="lock"
            :demo="!flow && !!req"
            @open="openItem"
            @open-bundle="(preselect) => { bundle = { preselect: preselect || null } }"
            @other="otherOpen = true"
            @submit="submit"
            @erp="go('erp')"
          />
        </template>
      </component>

      <PortalDemoBar
        v-if="!preview"
        :has-req="hasReq"
        :lock="lock"
        :logged-in="loggedIn"
        :ob-step="obStep"
        :skip-label="demoSkipLabel"
        :requested="requested"
        @back="emit('back')"
        @skip="demoSkip"
        @fill-all="fillAll"
      />

      <PreviewNote
        v-if="preview"
        :what="pvNote ? pvNote.what : ''"
        :n="pvNote ? pvNote.n : 0"
        @close="pvNote = null"
      />
      <DelegateBundleModal
        v-if="bundle && !lock"
        :requested="requested"
        :get-container="portalRoot"
        @send="delegate"
        @close="bundle = null"
      />
      <PortalOtherFilesModal
        v-if="otherOpen && !lock"
        :get-container="portalRoot"
        @close="otherOpen = false"
      />
    </a-layout>
  </a-config-provider>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Portalen fylder hele skærmen (i forhåndsvisningen den plads, den får) */
.portal {
  min-height: 100vh;
}

.portal.cwp-preview {
  min-height: 100%;
}

/* Bjælken i forhåndsvisningen og sidehovedet bliver stående øverst, når siden ruller */
.portal-top {
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Plads til demobjælken nederst på store skærme */
.cwp-main {
  flex: 1;
  padding: 32px 24px 96px;
}

.cwp-main:focus,
.cwp-main :deep([tabindex="-1"]:focus) {
  outline: none;
}

/* Crediwires egen side fylder hele skærmen (hvid side: kunden er "sendt videre" til Crediwire) */
.cwp-main.cwp-main-cw {
  padding: 0;
  background: @component-background;
}

@media (max-width: 575px) {
  .cwp-main {
    padding: 16px 16px 24px;
  }
}
</style>
