// Kundens opstart i portalen (src/portal_onboarding.jsx): hjælperne uden UI er flyttet ordret
// hertil ved migrationen til Vue. Kun denne indledning, importen, window-tildelingen og eksporten
// nederst er nye. Skærmene ligger i src/views/portal/onboarding/.
//
// bootstrap.js importerer filen på portal_onboarding.jsx' gamle plads (efter new_case_portal).
// Det eneste, der sker ved indlæsning, er window-tildelingen nederst. Alt andet læser CW, DATA og
// t (window), når det kaldes. ncFill og portalRecipient kom før som globale fra new_case_portal.jsx;
// nu importeres de fra kundeportalens domænemodul (samme funktioner, de står også på window).
//
// Ikke flyttet: React-komponenterne (nu .vue-filer), obDone og ObStepper (intet viste trinlisten),
// stilobjekterne obPrimary, obDisabled og obErrStyle og PORTAL_OB_CSS (antdv-komponenterne),
// PortalPvStepNav (portalen viser den ikke: pvNav = null) og trinnet 'data' i opstarten
// (CW.ONBOARDING_STEPS = ['account']; datadelingen sker kun fra Periodetal og oversigten).
import { ncFill, portalRecipient } from '@/domain/new_case_portal';

// Rækkefølgen i trinlisten. 'material' er oversigten.
const OB_ORDER = ['account', 'material'];
function obLabel(k) {
  switch (k) {
    case 'account': return t('Bruger');
    case 'data': return t('Datadeling');
    default: return t('Materiale');
  }
}

// Demo: adgangskoden gemmes aldrig, kun et kort fingeraftryk, så "Log ind" kan
// sige nej til en forkert kode. Ikke sikkerhed, kun demo.
function obPwHash(pw) {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) >>> 0;
  return 'd' + h.toString(16);
}
// Samme regler som i dag: mindst 8 tegn med et tal, et lille og et stort bogstav
function obPwProblems(pw) {
  const p = [];
  if (pw.length < 8) p.push('len');
  if (!/[0-9]/.test(pw)) p.push('num');
  if (!/[a-zæøå]/.test(pw)) p.push('lower');
  if (!/[A-ZÆØÅ]/.test(pw)) p.push('upper');
  return p;
}
const OB_DEMO_PW = 'Nordhavn2026';

// Seneste afsluttede måned som 'yyyy-mm' og som sidste dag 'yyyy-mm-dd'
function obLastMonth() {
  const d = new Date();
  let y = d.getFullYear(), m = d.getMonth(); // getMonth er 0-baseret, så m er forrige måned 1-baseret
  if (m === 0) { m = 12; y--; }
  return y + '-' + String(m).padStart(2, '0');
}
function obMonthEnd(ym) {
  const [y, m] = String(ym).split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return y + '-' + String(m).padStart(2, '0') + '-' + String(last).padStart(2, '0');
}
const obFmt = (ymd) => ymd ? CW.fmtDate(ymd + 'T12:00:00') : '';

// Kort tekst om kundens valg af datadeling (bruges i portalen og i forhåndsvisningen)
function obSharingText(sharing) {
  if (!sharing) return '';
  return sharing.mode === 'ongoing' ? t('løbende deling') : ncFill(t('tal til og med {date}'), { date: obFmt(sharing.dataUntil) });
}

/* ── Demo: spring mellem stadierne i trinnet Bruger ───────────────────────── */

const OB_DEMO_STAGES = ['pre', 'new', 'known', 'knownCo'];
function obDemoLabel(k) {
  switch (k) {
    case 'pre': return t('Før login');
    case 'new': return t('Ny bruger');
    case 'known': return t('Kendt bruger uden virksomheden');
    default: return t('Kendt bruger med virksomheden');
  }
}
// Det stadie, kundens tilstand svarer til
function obDemoStage(ob, loggedIn) {
  if (!loggedIn || !ob.account) return 'pre';
  if (!ob.terms) return 'new';
  if (!ob.company) return 'known';
  return 'knownCo';
}
// Kundens tilstand for et stadie. I portalen gemmes den; i Kundeflow vises den kun
function obDemoState(k) {
  const now = new Date().toISOString();
  const rcp = portalRecipient();
  const co = DATA.COMPANY || {};
  const email = rcp.email || 'kunde@example.dk';
  if (k === 'pre') return { account: null, terms: null, company: null };
  if (k === 'new') return { account: { email, pw: obPwHash(OB_DEMO_PW), at: now }, terms: null, company: null };
  const known = { account: { email, pw: obPwHash(OB_DEMO_PW), name: rcp.name || '', existing: true, at: now }, terms: { at: now, marketing: false } };
  if (k === 'known') return Object.assign(known, { company: null });
  return Object.assign(known, { company: { cvr: String(co.cvr || '').replace(/\D/g, ''), name: co.name, person: rcp.name || '', advisor: false, at: now } });
}

/* ── ② Datadeling: hvor meget EIFO må se, regnskabssystemet og aftalen ──── */

const OB_TOP_SYSTEMS = ['ec', 'bi', 'di'];

/* ── Forbindelsen: regnskabssystemets login og samtykke, derefter hentning ── */

// Trin: 0 videresendes, 1 login og samtykke i regnskabssystemet, 2-5 henter, 6 færdig
const ERP_RUN_DONE = 6;

/* ── Forhåndsvisningen: navigation og noten, når rådgiveren rører en kundehandling ── */

// Rækkefølgen af kundens skærme, som rådgiveren kan gå igennem
const PV_SCREENS = ['landing', 'account', 'signup', 'login', 'hub'];
function pvScreenLabel(k) {
  switch (k) {
    case 'landing': return t('Landingsside');
    case 'signup': return t('Crediwire: Opret bruger');
    case 'login': return t('Crediwire: Log ind');
    case 'hub': return t('Oversigt');
    default: return obLabel(k);
  }
}

// Teksten, når rådgiveren rører noget, kun kunden må gøre
function pvBlockedText(what) {
  switch (what) {
    case 'account': return t('Kunden opretter selv sin bruger.');
    case 'login': return t('Kunden logger selv ind.');
    case 'reset': return t('Kunden beder selv om en ny adgangskode.');
    case 'terms': return t('Kunden accepterer selv brugsvilkårene.');
    case 'data': return t('Kunden vælger selv, om og hvordan de deler regnskabstal med EIFO.');
    case 'erp': return t('Kunden forbinder selv regnskabssystemet.');
    case 'consent': return t('Kunden giver og trækker selv adgangen til regnskabssystemet tilbage.');
    case 'undo': return t('Kunden fortryder selv det, de har sendt.');
    case 'upload': case 'send': case 'remove':
      return t('Kunden sender selv materialet. Skal du uploade for kunden, så brug "Upload for kunden" i sagen.');
    case 'submit': return t('Kunden melder selv, at de er færdige.');
    case 'delegate': return t('Kunden beder selv revisor eller bank om hjælp.');
    case 'message': return t('Skriv til kunden fra sagen.');
    default: return t('Det er kunden, der gør dette.');
  }
}

/* ── Demo i kundens portal (præsentatoren er kunden): udfyld eller spring over ── */

function obDemoSkip() {
  const now = new Date().toISOString();
  const co = DATA.COMPANY || {};
  const rcp = portalRecipient();
  const ob = CW.onboarding();
  CW.setOnboarding({
    account: ob.account || { email: rcp.email || 'kunde@example.dk', pw: obPwHash(OB_DEMO_PW), at: now },
    terms: ob.terms || { at: now, marketing: false },
    company: ob.company || { cvr: String(co.cvr || '').replace(/\D/g, ''), name: co.name, person: rcp.name || '', advisor: false, at: now },
    agreement: ob.agreement || { at: now },
    sharing: ob.sharing || (ob.agreement && ob.agreement.declined ? null : { mode: 'until', dataUntil: obMonthEnd(obLastMonth()), at: now }),
    erp: ob.erp || (ob.agreement && ob.agreement.declined ? null : { skipped: true, at: now }),
    doneAt: now,
  }, t('Opstarten blev sprunget over (demo)'));
}

// Navne, som andre filer læser som globale (før migrationen delte de klassiske scripts navnerum):
//   obLabel          sagens linje om opstarten (src/domain/workspace/items.js) og kundeportalen
//   OB_ORDER, PV_SCREENS, pvScreenLabel, obDemoStage, obDemoState, obDemoLabel, obDemoSkip
//                    kundeportalen (forhåndsvisningen, demoknapperne og "Spring opstarten over")
Object.assign(window, { obLabel, OB_ORDER, PV_SCREENS, pvScreenLabel, obDemoStage, obDemoState, obDemoLabel, obDemoSkip });

// Modul-eksport til Vue-komponenterne
export {
  OB_ORDER, obLabel, obPwHash, obPwProblems, OB_DEMO_PW, obLastMonth, obMonthEnd, obFmt, obSharingText,
  OB_DEMO_STAGES, obDemoLabel, obDemoStage, obDemoState, OB_TOP_SYSTEMS, ERP_RUN_DONE,
  PV_SCREENS, pvScreenLabel, pvBlockedText, obDemoSkip,
};
