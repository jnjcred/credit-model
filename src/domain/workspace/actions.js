// Sagen (workspace): rådgiverens handlinger på sagen, navigation mellem fanerne og de
// overdragelser (fokus, rul, Kundeside), der skal overleve et faneskift. Flyttet uændret fra
// workspace.jsx ved migrationen til Vue; logik, der lå inde i komponenterne, er løftet ud i
// navngivne funktioner med de samme linjer (kilden står over hver). Bare globaler (t, CW)
// læses via window, som i resten af src/domain.
//
// Modultilstand, der lever som før (overlever faneskift, ikke genindlæsning):
//   wsPendingPreview    Kundeside skal åbnes, når sagshovedet monteres (CW_OPEN_CUSTOMER_PREVIEW
//                       sætter det; wsInitialPreview og wsOnOpenCustomerPreview bruger det).
//   wsPendingFocus      afsnittet, Overblik ruller til, når fanen åbnes (wsSetPendingFocus sætter
//                       det fra sagshovedet; wsTakeOverviewTarget bruger det).
//   window.__wsAskItem  "Spørg kunden": punktet, materialevalget åbner med (wsAskAbout sætter det;
//                       wsTakeAskItem bruger det).
// Ingen af dem skal følges reaktivt: de læses én gang, når en skærm monteres, og
// 'cw-open-customer-preview' giver et monteret sagshoved besked.
/* global portalFlowRole */
import { wsFill } from './format.js';
import { wsCaseData, wsCaseHasData, wsDocName } from './caseData.js';
import { wsPhaseName, wsSetEditing, wsStage } from './stage.js';

// Rådgiverens handlinger. Alle spørger selv, hvis noget står i vejen.
// Genoptag kræver en bekræftelse, samme sted som på Finansielt.
function wsReopen() {
  const cs = CW.caseState();
  return CW.confirm({
    title: t('Genoptag sagen?'),
    text: wsFill(t('Sagen vender tilbage til fasen {stage}. Afslaget gemmes i sagens historik.'), { stage: wsPhaseName(cs.declinedFrom || 'review-public') }),
    confirmLabel: t('Genoptag sag'),
  }).then(r => {
    if (!r.ok) return false;
    CW.reopen();
    CW.toast(wsFill(t('Sagen er genoptaget i fasen {stage}'), { stage: wsPhaseName() }));
    CW.focusSoon('#ws-hero-title');
    return true;
  });
}

/**
 * "Anmod om materiale" / "Anmod om mere materiale" fra alle skærme. Første
 * anmodning er fasen Materialevalg. Er anmodningen sendt, åbnes kladden som en
 * visning, og fasen bevares. En indstillet sag skal trækkes tilbage først, en
 * afslået sag genoptages først. open() viser vælgeren (fx går til Overblik).
 */
function wsRequestMore(open) {
  const cs = CW.caseState();
  const s = wsStage();
  if (!CW.request()) {
    return CW.requestStage('material-selection').then(ok => { if (ok) open(); return ok; });
  }
  const edit = () => { wsSetEditing(true); open(); return true; };
  if (cs.submittedAt) return wsWithdraw().then(ok => (ok ? edit() : false));
  if (s === 'declined') {
    return CW.confirm({
      title: t('Sagen er afslået'),
      text: t('Vil du genoptage sagen? Afslaget gemmes i sagens historik.'),
      confirmLabel: t('Genoptag og fortsæt'),
    }).then(r => { if (!r.ok) return false; CW.reopen(); return edit(); });
  }
  // Ældre tilstand: sendt anmodning, men sagen står i Vurdering, Materialevalg eller sprunget over
  if (s !== 'awaiting-customer' && s !== 'ready') {
    return CW.requestStage('awaiting-customer').then(ok => (ok ? edit() : false));
  }
  return Promise.resolve(edit());
}

/**
 * Kundeside-overlayet (forhåndsvisning af kundens portal) fra andre skærme,
 * fx Dataanmodninger. Står man ikke i sagen, åbnes sag 1 først.
 */
let wsPendingPreview = false;
const wsOpenCustomerPreview = function () {
  let cur = '';
  try { cur = localStorage.getItem('cw_route') || ''; } catch (e) {}
  const inCase = cur.split(':')[0] === 'workspace' && Number(cur.split(':')[1]) === CW.LIVE_CASE_ID;
  if (inCase) { window.dispatchEvent(new CustomEvent('cw-open-customer-preview')); return true; }
  wsPendingPreview = true;
  if (typeof window.__go === 'function') window.__go('workspace:' + CW.LIVE_CASE_ID);
  // Er sagshovedet allerede monteret (fx fra en anden sag), får det besked her
  setTimeout(() => { if (wsPendingPreview) window.dispatchEvent(new CustomEvent('cw-open-customer-preview')); }, 200);
  return true;
};
function wsWithdraw() {
  return CW.confirm({
    title: t('Træk indstillingen tilbage?'),
    text: t('Komitéen får besked, og memoet kan redigeres igen. Den indstillede version og din årsag gemmes i sagens historik.'),
    confirmLabel: t('Træk tilbage'), requireReason: true, reasonLabel: t('Årsag til at trække indstillingen tilbage'), danger: true,
  }).then(r => {
    if (!r.ok) return false;
    CW.withdraw(r.reason);
    CW.toast(t('Indstillingen er trukket tilbage. Memoet kan redigeres igen.'));
    CW.focusSoon('#ws-hero-title, #ws-indstil-title');
    return true;
  });
}

// Overblik ruller hertil, når man kommer fra sagshovedet eller en anden fane
let wsPendingFocus = null;
function wsScrollTo(id) {
  // Udestående står først, når kunden er bedt om materiale; ellers materialekortet
  const el = document.getElementById(id) || (id === 'ws-outstanding' ? document.getElementById('ws-received') : null);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

// back: { route, anchor, label } giver Dokumenter en knap tilbage til stedet,
// man kom fra (fx beslutningsgrundlaget på Overblik).
function wsOpenDoc(src, go, caseId, back) {
  if (!src || !src.doc) return;
  const detail = { doc: src.doc, name: wsDocName(src.doc), ref: src.ref || null, back: back || null };
  try { sessionStorage.setItem('kabul:open-doc', JSON.stringify(detail)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('cw-open-doc', { detail })); } catch (e) {}
  go && go('workspace:' + caseId + ':documents');
}

// Hjælpere til sagshovedets knap, når man allerede står på målfanen
// (wsFirstToReviewSel står ved materialekortet)
function wsFocusSubmit() {
  const missing = document.querySelector('textarea[id^="ws-reason-"][aria-invalid="true"]') || Array.from(document.querySelectorAll('textarea[id^="ws-reason-"]')).find(x => !x.value.trim());
  CW.focusSoon(missing || '#ws-submit-btn');
}

// Den indstillede version med forside (memo.jsx), ellers skift til Indstilling
function wsOpenSubmittedVersion() {
  if (typeof window.CW_OPEN_MEMO_VERSION === 'function') { try { window.CW_OPEN_MEMO_VERSION(CW.caseState().submitVersion || 1); return; } catch (e) {} }
  CW.focusSoon('#ws-indstil-title');
}
// Dybdelink til memoet (memo.jsx stiller CW_OPEN_MEMO til rådighed). Mangler
// den, skiftes der bare til memofanen.
function wsRunMemoLink(link) {
  if (typeof window.CW_OPEN_MEMO === 'function') {
    try { window.CW_OPEN_MEMO(link || {}); return; } catch (e) {}
  }
  if (typeof window.__go === 'function') window.__go('workspace:' + CW.LIVE_CASE_ID + ':memo');
}

// "Spørg kunden" om noget hentet automatisk: anmodningen åbner med spørgsmålet til punktet klar
// (itemId er katalogets punkt, fx 'm-annual-2024' eller 'm-pub-market'). Spørgsmålet bliver et
// punkt i anmodningen, som kunden får, når anmodningen sendes.
function wsAskAbout(itemId) {
  window.__wsAskItem = itemId;
  wsRequestMore(() => { setTimeout(() => wsScrollTo('ws-material'), 80); CW.focusSoon('#ws-ask-' + itemId + ' textarea'); });
}

// Kundeside fra en anden skærm (WorkspaceShell, workspace.jsx L553): sagshovedet viser
// forhåndsvisningen fra start, hvis flaget er sat og sagen har levende data. Flaget bruges én gang.
function wsInitialPreview(caseId) {
  const p = wsPendingPreview; wsPendingPreview = false; return !!p && wsCaseHasData(wsCaseData(caseId));
}

// 'cw-open-customer-preview' i et monteret sagshoved (WorkspaceShell, workspace.jsx L554–559):
// flaget er brugt, og forhåndsvisningen åbnes, hvis sagen har levende data.
// ui.setShowCustomerStatus(true) åbner den.
function wsOnOpenCustomerPreview(caseId, ui) {
  const { setShowCustomerStatus } = ui;
  wsPendingPreview = false; if (wsCaseHasData(wsCaseData(caseId))) setShowCustomerStatus(true);
}

// Sagshovedet beder Overblik rulle til et afsnit, når fanen åbnes (WorkspaceShell,
// workspace.jsx L613: wsPendingFocus = target).
function wsSetPendingFocus(target) { wsPendingFocus = target; }

// Overblik ved start (WSOverview, workspace.jsx L1002–1020): afsnittet, der skal rulles til.
// Fra sagshovedet (wsPendingFocus), fra Dataanmodninger ('kabul:focus-material' giver
// materialevalget) eller tilbage fra en kilde under Dokumenter ('kabul:ws-focus').
// Hver overdragelse bruges én gang. Skærmen ruller efter 80 ms (useFocusTarget).
function wsTakeOverviewTarget() {
  let target = wsPendingFocus;
  wsPendingFocus = null;
  try {
    if (sessionStorage.getItem('kabul:focus-material') === '1') {
      sessionStorage.removeItem('kabul:focus-material');
      target = 'ws-material';
    }
    const back = sessionStorage.getItem('kabul:ws-focus');
    if (back) { sessionStorage.removeItem('kabul:ws-focus'); target = back; }
  } catch (e) {}
  return target;
}

// "Spørg kunden" fra Overblik (WSMaterialModal, workspace.jsx L1761–1762): punktet,
// materialevalget åbner med spørgsmålsformularen til. Bruges én gang.
function wsTakeAskItem() {
  const v = window.__wsAskItem || null; window.__wsAskItem = null; return v;
}

// Kundeside (WSCustomerPreview, workspace.jsx L818–822): spærren for kundehandlinger slås til,
// før portalen tegnes første gang, så intet i portalen (fx "læst af kunden") når at ske.
// Undtagen med rollen Kunde (vælgeren øverst i portalen, portalFlowRole i portalens kode).
function wsPreviewLockOn() {
  return typeof CW.setPreview === 'function' && !(typeof portalFlowRole === 'function' && portalFlowRole() === 'kunde');
}

/* ─────────────────────────────────────────────────────────────────────────
   Giv afslag: kan ske i alle faser før indstilling. Årsag er påkrævet.
   ──────────────────────────────────────────────────────────────────────── */
const WS_DECLINE_REASONS = ['Svag indtjening', 'Negativ egenkapital', 'For høj gearing', 'Uden for acceptkriterier', 'Andet'];

// Giv afslag (WSDeclineDialog, workspace.jsx L487–537): fasen, sagen stoppes i, om afslaget
// kan registreres (en årsag, og en note ved "Andet") og valideringsteksten.
function wsDeclineState(reason, note) {
  const from = wsPhaseName();
  const ok = !!reason && (reason !== 'Andet' || note.trim().length > 0);
  const hint = !reason ? t('Vælg en årsag for at give afslag.') : !ok ? t('Skriv en note, når årsagen er "Andet".') : '';
  return { from, ok, hint };
}

// Registrér afslaget (WSDeclineDialog, workspace.jsx L503–506). onClose lukker dialogen.
function wsDecline(reason, note, onClose) {
  CW.decline(reason, note.trim());
  onClose();
  CW.toast(wsFill(t('Afslag registreret: {reason}'), { reason: t(reason) }));
  CW.focusSoon('#ws-hero-title');
}

// Annullér, Esc og klik udenfor: fokus tilbage til en knap, der stadig findes
// (knappen der åbnede dialogen, ellers sagens overskrift)
// (WSDeclineDialog, workspace.jsx L491.) onClose lukker dialogen.
function wsDeclineCancel(returnFocus, onClose) {
  onClose(); CW.focusSoon(returnFocus && document.querySelector(returnFocus) ? returnFocus : '#ws-hero-title');
}

// "Gå direkte til memo" (WSSkipDialog, workspace.jsx L1282–1340).
// Annullér, Esc og klik udenfor: fokus tilbage på knappen, der åbnede dialogen
// (L1290.) onClose lukker dialogen.
function wsSkipCancel(onClose) {
  onClose(); CW.focusSoon(document.getElementById('ws-hero-skip') ? '#ws-hero-skip' : '#ws-hero-title');
}
// Begrundelsen skal udfyldes (L1294)
function wsSkipOk(reason) {
  return reason.trim().length > 0;
}
// Spring kundeinput over med begrundelsen (L1301–1304). Løser med true, når fasen er skiftet.
function wsSkipCustomer(reason) {
  const r = reason.trim();
  const skip = typeof CW.skipCustomer === 'function'
    ? CW.skipCustomer(r)
    : CW.requestStage('ready-skip').then(done => { if (done) CW.setCaseState({ skipReason: r }); return done; });
  return skip;
}

// Afslagsnoten (DeclinedBlock, workspace.jsx L1517–1553) kan rettes bagefter. note: feltets tekst.
// unchanged: noten er den gemte (Gem gør så ingenting). ui.setSaved(true) viser "Gemt" i 1,5 s.
function wsDeclinedNote(note, ui) {
  const { setSaved } = ui;
  const d = CW.caseState().decline || {};
  const unchanged = note.trim() === (d.note || '');
  const save = () => {
    if (unchanged) return;
    CW.setCaseState({ decline: { ...(CW.caseState().decline || {}), note: note.trim() } });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return { d, unchanged, save };
}

export {
  wsReopen, wsRequestMore, wsOpenCustomerPreview, wsWithdraw, wsScrollTo, wsOpenDoc, wsFocusSubmit, wsOpenSubmittedVersion,
  wsRunMemoLink, wsAskAbout, wsInitialPreview, wsOnOpenCustomerPreview, wsSetPendingFocus, wsTakeOverviewTarget, wsTakeAskItem,
  wsPreviewLockOn, WS_DECLINE_REASONS, wsDeclineState, wsDecline, wsDeclineCancel, wsSkipCancel, wsSkipOk, wsSkipCustomer,
  wsDeclinedNote,
};
