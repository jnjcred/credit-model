// Sagen (workspace): sagens fase, de automatiske faseskift, sagens status og memoets status.
// Flyttet uændret fra workspace.jsx ved migrationen til Vue. Bare globaler (t, DATA, CW)
// læses via window, som i resten af src/domain.
//
// Modultilstand, der lever som før (overlever faneskift, ikke genindlæsning):
//   wsEditingRequest  opdateringen af en sendt anmodning er åben (wsSetEditing / wsIsEditing).
//                     wsSetEditing kalder CW.bump(), så alt, der følger useCaseVersion(), tegnes igen.
//   wsMemoCache       memoets status i én opgave. Ryddes af lytterne, som index.js sætter på
//                     'cw-case-changed' og 'memo-changed', og efter setTimeout 0.
import { wsFill } from './format.js';
import { wsReadiness } from './readiness.js';

// ── Sagens fase ─────────────────────────────────────────────────────────────
// stage: 'review-public' | 'material-selection' | 'awaiting-customer' | 'ready' | 'ready-skip' | 'declined'
const WS_STAGES = ['review-public', 'material-selection', 'awaiting-customer', 'ready', 'ready-skip', 'declined'];
function wsStage() {
  const s = CW.stage();
  return WS_STAGES.indexOf(s) >= 0 ? s : 'review-public';
}

/**
 * Automatiske skift mellem Afventer kunden og Klar. Kun her må workspace sætte
 * fasen direkte, og kun når intet står i vejen (stageBlock er null).
 */
function wsAutoStage(to) {
  if (CW.stage() === to || CW.stageBlock(to) !== null) return false;
  CW.setCaseState({ stage: to });
  // Loggen siger det samme som pillen: til Klar er det materialet, der er klar,
  // mens pillen typisk siger "Memo skrives"
  CW.log('stage', to === 'ready'
    ? t('Alt påkrævet materiale er godkendt. Næste skridt er memoet.')
    : wsFill(t('Fase: {stage} (automatisk)'), { stage: wsPhaseName(to) }), { who: 'system' });
  return true;
}

/**
 * Er kundens materiale klar? Kun de påkrævede punkter tæller (CW.progress().
 * readyForMemo). Et valgfrit punkt, der ikke er kommet, blokerer ikke. Har en
 * opdatering fjernet alle påkrævede punkter, er materialet klart, når intet
 * venter på gennemgang eller er afvist.
 */
function wsMaterialReady(p) {
  p = p || CW.progress();
  if (p.readyForMemo) return true;
  return !!CW.request() && p.required === 0 && p.total > 0 && p.toReview === 0 && p.rejected === 0;
}

/**
 * Kan sagen indstilles? Samme regel som klarhedstjekket: sagen er i Klar, og
 * intet punkt blokerer. Tomme felter og passerede datoer blokerer ikke (de
 * kræver en begrundelse i klarhedstjekket). Bruges af pille og sagshoved.
 */
function wsSubmitReady(stageOverride) {
  // I piloten indstilles der ikke i Crediwire: memoet skrives i Word med Copilot
  if (wsCopilot()) return false;
  if (CW.caseState().submittedAt) return false;
  const s = stageOverride || wsStage();
  if (s !== 'ready' && s !== 'ready-skip') return false;
  return !wsReadiness(s).some(r => r.group === 'block');
}
// Pilotens tilstand (case_facts.js): Credit memo er en side, hvor sagens
// materiale hentes til Copilot, og Indstilling er skjult. 'builtin' er det
// indbyggede memo og indstillingen.
function wsCopilot() { return window.CW_MEMO_MODE !== 'builtin'; }

/**
 * En opdatering af en sendt anmodning er en visning, ikke en fase. Sagen
 * bliver i Afventer kunden eller Klar, til opdateringen sendes. Flaget lever
 * i modulet, så det overlever faneskift, men ikke genindlæsning (kladden gør).
 */
let wsEditingRequest = false;
function wsSetEditing(on) {
  if (wsEditingRequest === !!on) return;
  wsEditingRequest = !!on;
  CW.bump();
}
function wsIsEditing() {
  const s = wsStage();
  return wsEditingRequest && !!CW.request() && !CW.caseState().submittedAt && (s === 'awaiting-customer' || s === 'ready');
}

// Sagens fase med samme navn som i sagslisten (DATA.STATUS). stageOverride
// giver navnet på en anden fase, fx den en afslået sag genoptages i.
function wsPhaseName(stageOverride) {
  let key;
  if (!stageOverride) key = wsStatusKey(CW.LIVE_CASE_ID);
  else {
    const s = stageOverride;
    key = s === 'material-selection' ? 'material'
      : s === 'awaiting-customer' ? (CW.progress().toReview > 0 ? 'toReview' : 'awaiting')
      : s === 'ready' || s === 'ready-skip' ? (wsSubmitReady(s) ? 'ready' : 'memo')
      : s === 'declined' ? 'declined' : 'review';
  }
  const d = key ? ((DATA.STATUS && DATA.STATUS[key] && DATA.STATUS[key].label) ? DATA.STATUS[key] : WS_STATUS[key]) : null;
  return d ? t(d.label) : t(CW.stageLabel(stageOverride || wsStage()));
}

// ── Sagens status (fælles ordliste med sagskort og Dataanmodninger) ─────────
// DATA.caseStatusKey/DATA.STATUS kommer fra data.js. Mangler de, udleder
// workspace selv statussen med samme regler.
const WS_STATUS = {
  draft:     { label: 'Kladde',               tone: 'outline' },
  review:    { label: 'Vurdering',            tone: 'ink' },
  material:  { label: 'Materialevalg',        tone: 'outline' },
  awaiting:  { label: 'Afventer kunden',      tone: 'warn' },
  toReview:  { label: 'Til din gennemgang',   tone: 'ink' },
  memo:      { label: 'Memo i gang',          tone: 'ink' },
  ready:     { label: 'Klar til indstilling', tone: 'success' },
  submitted: { label: 'Indstillet',           tone: 'solid-success' },
  declined:  { label: 'Afslået',              tone: 'danger' },
  decided:   { label: 'Afgjort',              tone: 'outline' },
};
// Memoets status beregnes af hele teksten (ca. 10 ms). Samme gentegning spørger
// flere gange (pille, knap, fasekort), så svaret genbruges, indtil opgaven er
// færdig, eller sagen eller memoet ændrer sig.
let wsMemoCache = null;
function wsClearMemoCache() { wsMemoCache = null; }

function wsMemoStatus() {
  const fn = window.CW_MEMO_STATUS;
  if (typeof fn !== 'function') return null;
  if (wsMemoCache && wsMemoCache.fn === fn) return wsMemoCache.v;
  let v = null;
  try { v = fn() || null; } catch (e) { v = null; }
  wsMemoCache = { fn, v };
  setTimeout(wsClearMemoCache, 0);
  return v;
}
function wsMemoReviewed(m) {
  if (!m) return 0;
  if (typeof m.reviewed === 'number') return m.reviewed;
  return (m.sections || []).filter(s => s.reviewedBy).length;
}
function wsBlockingComments(m) {
  if (!m) return 0;
  const b = m.blockingComments;
  return Array.isArray(b) ? b.length : (Number(b) || 0);
}
function wsOwnStatusKey() {
  const cs = CW.caseState();
  const s = wsStage();
  if (cs.submittedAt) return 'submitted';
  if (s === 'declined') return 'declined';
  if (s === 'material-selection') return 'material';
  if (s === 'awaiting-customer') return CW.progress().toReview > 0 ? 'toReview' : 'awaiting';
  if (s === 'ready' || s === 'ready-skip') return wsSubmitReady(s) ? 'ready' : 'memo';
  return 'review';
}
function wsStatusKey(caseId) {
  let k = null;
  if (typeof DATA.caseStatusKey === 'function') {
    try { k = DATA.caseStatusKey(caseId) || null; } catch (e) {}
  }
  // En demosag, hvis anmodning er sendt (CW.sendDemoCase), afventer kunden
  if (!CW.isLiveCase(caseId) && (!k || k === 'draft') && typeof CW.demoCase === 'function') {
    const d = CW.demoCase(caseId);
    if (d && d.request && d.request.sent) return 'awaiting';
  }
  if (!k) return CW.isLiveCase(caseId) ? wsOwnStatusKey() : null;
  // Memo skrives og Klar til indstilling følger klarhedstjekket (ingen
  // blokerende punkter), ikke antallet af tomme skabelonfelter
  if (CW.isLiveCase(caseId) && (k === 'memo' || k === 'ready')) return wsSubmitReady() ? 'ready' : 'memo';
  return k;
}

// Automatiske skift: når alle påkrævede punkter er godkendt, og intet venter
// på gennemgang, er materialet klar (valgfrie punkter blokerer ikke). Mister
// et punkt sin godkendelse, eller kommer der nye punkter, står sagen igen og
// afventer. Kører også ved start, så ændringer fra kundeportalen fanges.
// Sker aldrig på en indstillet eller afslået sag.
// (WorkspaceShell, workspace.jsx L595–607.) Skærmen kalder den ved start, og når punkternes
// status (wsItemsKey) eller hasData ændrer sig: src/views/workspace/composables/useAutoStage.js.
function wsSyncAutoStage(hasData) {
  if (!hasData) return;
  const s = wsStage();
  const ready = wsMaterialReady();
  if (s === 'awaiting-customer' && ready) wsAutoStage('ready');
  else if (s === 'ready' && CW.request() && !ready) wsAutoStage('awaiting-customer');
}

export {
  WS_STAGES, wsStage, wsAutoStage, wsMaterialReady, wsSubmitReady, wsCopilot, wsSetEditing, wsIsEditing, wsPhaseName,
  WS_STATUS, wsClearMemoCache, wsMemoStatus, wsMemoReviewed, wsBlockingComments, wsOwnStatusKey, wsStatusKey, wsSyncAutoStage,
};
