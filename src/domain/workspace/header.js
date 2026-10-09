// Sagen (workspace): det, sagshovedet, fasekortet, Overblik og den tomme sag viser og gør, uden
// React. Logikken lå inde i komponenterne i workspace.jsx; her er den løftet ud i navngivne
// funktioner med de samme linjer (kilden står over hver). Bare globaler (t, DATA, CW) læses via
// window. Funktioner med parameteren ui får skærmens tilstand som funktioner med de gamle navne
// (f.eks. ui.setDeclining), så linjerne er de samme som før. JSX er erstattet af data: knapper er
// { label, onClick, ... }, og ikoner er navnet på ikonet i den gamle ikonfil (I.Layout → 'Layout').
// Skærmene læser dem i en computed, der følger både sagen og memoet (useMemoStatus.js).
import { wsDay, wsDot, wsFill, wsMoney, wsPlural, wsSentText } from './format.js';
import { wsAdvisor, wsCaseData, wsCaseHasData, wsOwner, wsTeam } from './caseData.js';
import {
  wsCopilot, wsIsEditing, wsMaterialReady, wsMemoReviewed, wsMemoStatus, wsPhaseName, wsSetEditing, wsStage, wsSubmitReady,
} from './stage.js';
import {
  wsFocusSubmit, wsOpenSubmittedVersion, wsReopen, wsRequestMore, wsScrollTo, wsSetPendingFocus, wsWithdraw,
} from './actions.js';
import { wsMemoTabNext } from './readiness.js';
import { wsFirstToReviewSel } from './items.js';
import { wsPublicDataDate } from './publicSources.js';

// Kom man fra en anden skærm end Mine opgaver (f.eks. Porteføljeanalyse), fører
// brødkrummen tilbage dertil: sessionStorage 'cw_back' = { route, label }
// (WorkspaceShell, workspace.jsx L562–563.) wsGoBack fjerner 'cw_back' og går tilbage.
function wsBackCrumb() {
  try { const b = JSON.parse(sessionStorage.getItem('cw_back') || 'null'); return b && b.route && b.label ? b : null; } catch (e) { return null; }
}
function wsGoBack(back, go) { try { sessionStorage.removeItem('cw_back'); } catch (e) {} go(back ? back.route : 'cases'); }

// Sagshovedet (WorkspaceShell, workspace.jsx L542–772): fanen (i piloten viser et gammelt link til
// Indstilling Credit memo), sagen, fasen, focusOverview (gå til Overblik og rul til et afsnit, fx
// fra Indstilling), næste skridt (nextStep = { label, onClick } eller null; nextPrimary: knappen er
// primær), fanerne ({ k, label, ic, badge }), navn, facilitet ({ text, note } til title), CVR,
// dage i fasen (phaseDays, phaseLate = over SLA, phaseWarn = tæt på) og menuen "Flere handlinger"
// (moreItems: { key, label, sub, danger, icon, onClick }; false for punkter, der ikke gælder, så
// filtrér med Boolean, som WSMenu gjorde). routeTab: fanen fra ruten; go: navigation
// (useNavigation); caseId: sagens id; ui.setDeclining(true) åbner "Giv afslag".
function wsHeaderModel(routeTab, go, caseId, ui) {
  const { setDeclining } = ui;
  // I piloten er Indstilling skjult; et gammelt link dertil viser Credit memo
  const tab = wsCopilot() && routeTab === 'indstil' ? 'memo' : routeTab;
  const co = DATA.COMPANY;
  const caseData = wsCaseData(caseId);
  const hasData = wsCaseHasData(caseData);
  const cs = CW.caseState();
  const stage = wsStage();
  const submitted = !!cs.submittedAt;
  // Gå til Overblik og rul til et afsnit (materialevalg, formularen, udestående)
  const focusOverview = (target, focusSel) => {
    // Udestående og kladden deler plads: går man til udestående, lukkes kladden (den er gemt)
    if (target === 'ws-outstanding' || target === 'ws-hero') wsSetEditing(false);
    if (tab !== 'overview') { wsSetPendingFocus(target); go('workspace:' + caseId); }
    else setTimeout(() => wsScrollTo(target), 80);
    if (focusSel) setTimeout(() => CW.focusSoon(focusSel), tab !== 'overview' ? 260 : 120);
  };
  const toMaterial = () => wsRequestMore(() => focusOverview('ws-material', '#ws-material-title'));

  const request = CW.request();
  const p = CW.progress();
  const submitReady = wsSubmitReady();
  // Næste skridt. På Overblik ejer fasekortet næste skridt, så sagshovedet
  // viser ingen knap dér. På de andre faner hedder knappen det samme som
  // fasekortets primære knap. Står man allerede på målfanen, ruller knappen
  // til og fokuserer den næste handling dér i stedet for at gøre ingenting.
  const nextStep = (() => {
    if (tab === 'overview') return null;
    if (tab === 'indstil' && !submitted) return null;
    // I piloten har Credit memo-siden selv den primære knap (Hent alle dokumenter),
    // og en indstilling fra før piloten kan ikke ses (fanen er skjult)
    if (wsCopilot() && (tab === 'memo' || submitted)) return null;
    // På Indstilling-fanen er næste skridt at se den indstillede version
    if (submitted) return tab === 'indstil'
      ? { label: t('Se indstillet version'), onClick: () => wsOpenSubmittedVersion() }
      : { label: t('Se indstilling'), onClick: () => go('workspace:' + caseId + ':indstil') };
    const review = () => (p.toReview > 0
      ? { label: t('Gennemgå materiale'), onClick: () => focusOverview('ws-outstanding', wsFirstToReviewSel() || '#ws-outstanding-title') }
      : { label: t('Se udestående'), onClick: () => focusOverview('ws-outstanding', '#ws-outstanding-title') });
    // På memo-fanen peger knappen på det, der konkret mangler i memoet
    const memoOrSubmit = () => (submitReady
      ? { label: t('Indstil til kreditkomité'), onClick: () => (tab === 'indstil' ? wsFocusSubmit() : go('workspace:' + caseId + ':indstil')) }
      : tab === 'memo' ? wsMemoTabNext(() => go('workspace:' + caseId + ':indstil'))
      : { label: t('Fortsæt til memo'), onClick: () => go('workspace:' + caseId + ':memo') });
    // Materiale klar, men sagen står stadig i Afventer kunden: samme knap som fasekortet
    const markReady = { label: t('Markér som klar'), onClick: () => CW.requestStage('ready') };
    switch (stage) {
      case 'review-public': return { label: t('Anmod om materiale'), onClick: toMaterial };
      case 'material-selection': return { label: t('Åbn anmodningen'), onClick: () => { focusOverview('ws-hero', '#ws-material-title'); setTimeout(() => window.dispatchEvent(new CustomEvent('cw-open-material')), 200); } };
      case 'awaiting-customer': return p.toReview === 0 && wsMaterialReady(p) ? markReady : review();
      case 'ready': return wsMaterialReady(p) ? memoOrSubmit() : review();
      case 'ready-skip': return memoOrSubmit();
      case 'declined': return { label: t('Genoptag sag'), onClick: wsReopen };
      default: return null;
    }
  })();
  // Én primær knap pr. skærm: på Indstilling har siden selv den primære
  // knap (Indstil til kreditkomité), så sagshovedets knap er sekundær dér
  const nextPrimary = !(tab === 'indstil' && !submitted);

  const docCount = (DATA.DOCS || []).length + CW.allUploads().length;
  const tabs = [
    { k: "overview", label: t("Overblik"), ic: 'Layout' },
    { k: "financials", label: t("Virksomheden"), ic: 'BarChart' },
    { k: "documents", label: t("Dokumenter"), ic: 'FileText', badge: String(docCount) },
    { k: "memo", label: t("Credit memo"), ic: 'File' },
    { k: "indstil", label: t("Indstilling"), ic: 'Send', badge: submitted ? 'v' + (cs.submitVersion || 1) : null },
  ].filter(tb => !(tb.k === 'indstil' && wsCopilot()));

  const name = hasData ? co.name : caseData.name;
  // Sagens produkt og beløb: "Eksportkaution, DKK 3,6 mio."; andelen af bankens facilitet står i title
  const facility = (() => {
    if (caseData.unknown || (!caseData.type && caseData.amount == null)) return null;
    const note = caseData.demo && typeof CW.demoCaseAmountNote === 'function' ? CW.demoCaseAmountNote(caseData.id) : (caseData.amountNote ? t(caseData.amountNote) : null);
    return { text: [caseData.type ? t(caseData.type) : '', caseData.amount != null ? wsMoney(caseData.amount) : ''].filter(Boolean).join(', '), note };
  })();
  const cvr = hasData ? co.cvr : caseData.cvr;

  // Dage i fase og SLA som på sagskortet (DATA.caseAge), så de to siger det samme
  let age = null;
  if (hasData && typeof DATA.caseAge === 'function') { try { age = DATA.caseAge(caseData.id); } catch (e) { age = null; } }
  const phaseSince = hasData ? (submitted ? cs.submittedAt : stage === 'declined' ? (cs.decline && cs.decline.at) || cs.stageSince : cs.stageSince) : null;
  const phaseDays = age && typeof age.days === 'number' ? age.days : phaseSince ? CW.workdaysBetween(phaseSince) : 0;
  const phaseLate = age ? age.sla === 'over' : phaseDays > 10;
  const phaseWarn = !!age && age.sla === 'warn';

  const moreItems = hasData ? [
    !submitted && stage !== 'declined' && { key: 'decline', label: t('Giv afslag'), sub: t('Stop sagen med en årsag'), danger: true, icon: 'X', onClick: () => setDeclining(true) },
    submitted && { key: 'withdraw', label: t('Træk indstilling tilbage'), sub: t('Kræver en årsag'), icon: 'Undo', onClick: wsWithdraw },
    stage === 'declined' && !submitted && { key: 'reopen', label: t('Genoptag sag'), sub: wsFill(t('Tilbage til {stage}'), { stage: wsPhaseName(cs.declinedFrom || 'review-public') }), icon: 'Undo', onClick: wsReopen },
  ] : [];
  return {
    tab, co, caseData, hasData, cs, stage, submitted, focusOverview, toMaterial, request, p, submitReady, nextStep, nextPrimary,
    docCount, tabs, name, facility, cvr, age, phaseSince, phaseDays, phaseLate, phaseWarn, moreItems,
  };
}

// Ejer-chippen (WSOwnerPicker, workspace.jsx L454–480): den ansvarlige, holdet (den ansvarlige
// står først, hvis han ikke er på holdet), skift af ansvarlig med en besked, og listens punkter
// ({ key, label, checked, sub: "Dig" ved dig selv, onClick }). ariaLabel/menuLabel: knappens og listens navn.
function wsOwnerPicker(caseData) {
  const owner = wsOwner(caseData);
  const team = wsTeam();
  if (team.indexOf(owner) < 0) team.unshift(owner);
  const setOwner = (name) => {
    if (name === owner) return;
    CW.setOwner(caseData.id, name);
    CW.toast(wsFill(t('Sagen er flyttet til {name}'), { name }));
  };
  const ariaLabel = wsFill(t('Ansvarlig: {name}. Skift ansvarlig'), { name: owner });
  const menuLabel = t('Vælg ansvarlig');
  const items = team.map(n => ({ key: n, label: n, checked: n === owner, sub: n === DATA.ME ? t('Dig') : null, onClick: () => setOwner(n) }));
  return { owner, team, setOwner, ariaLabel, menuLabel, items };
}

// Fasekortet på Overblik (StageHero, workspace.jsx L1082–1272): titel, sætning (body, kan være
// tom), præcis én primær knap og højst to ghost-knapper, og sagens trin. Knapperne er data:
// primary = { label, arrow, onClick } (WSHeroPrimary; arrow: pil efter teksten) og ghost/ghost2 =
// { label, onClick, id } (WSHeroGhost; id 'ws-hero-skip' / 'ws-hero-decline' skal stå på knappen).
// PROCESS = [{ k, label, status: done|active|pending|declined|skipped, sub }]; sub står som title
// på trinnet. stage: sagens fase; go: navigation; caseId: sagens id; ui.setSkipping(true) åbner
// "Gå direkte til memo", ui.setDeclining(true) åbner "Giv afslag" (begge lukkes, når fasen skifter).
function wsStageHero(stage, go, caseId, ui) {
  const { setSkipping, setDeclining } = ui;
  const cs = CW.caseState();
  const submitted = !!cs.submittedAt;
  const request = CW.request();
  const p = CW.progress();
  const toReview = p.toReview;                 // leveret eller forklaret, ikke gennemgået
  // Påkrævede punkter, der stadig mangler fra kunden (valgfrie tæller ikke)
  const missing = p.requiredMissing != null ? p.requiredMissing : p.missing;
  const m = wsMemoStatus();
  const submitReady = wsSubmitReady();
  let ghost2 = null;

  const toMaterial = () => wsRequestMore(() => { setTimeout(() => wsScrollTo('ws-material'), 80); CW.focusSoon('#ws-material-title'); });
  const toMemo = () => go && go("workspace:" + caseId + (submitReady ? ":indstil" : ":memo"));
  const memoLabel = submitReady ? t('Indstil til kreditkomité') : t('Fortsæt til memo');
  const toOutstanding = (sel) => { setTimeout(() => wsScrollTo('ws-outstanding'), 60); CW.focusSoon(sel || '#ws-outstanding-title'); };

  // Trinene. Den aktive fase afgør, hvilke trin der er gjort.
  const skipped = (stage === 'ready-skip' || (submitted && !!cs.skipReason)) && !request;
  const ORDER = ['public', 'decision', 'material', 'customer', 'memo'];
  const AT = { 'review-public': 'decision', 'material-selection': 'material', 'awaiting-customer': 'customer', ready: 'memo', 'ready-skip': 'memo' };
  const stepState = (k) => {
    const i = ORDER.indexOf(k);
    if (skipped && (k === 'material' || k === 'customer')) return 'skipped';
    if (submitted) return 'done';
    if (stage === 'declined') {
      const from = ORDER.indexOf(AT[cs.declinedFrom] || 'decision');
      return i < from ? 'done' : i === from ? 'declined' : 'pending';
    }
    const at = ORDER.indexOf(AT[stage] || 'decision');
    return i < at ? 'done' : i === at ? 'active' : 'pending';
  };
  // Seneste hændelse af en type (til datoen på et færdigt trin)
  const lastAt = (pred) => { const e = CW.activity().filter(pred).slice(-1)[0]; return e ? e.at : null; };
  const withDay = (text, iso) => (iso ? text + ' - ' + wsDay(iso) : text);
  // Underlinje kun på færdige trin (resultat og dato) og på det aktive trin
  const subOf = (k, state) => {
    if (state === 'declined') return t('Afslået her');
    if (state === 'skipped') return t('Sprunget over');
    if (k === 'public') return t('Hentet') + ' ' + wsPublicDataDate();
    if (k === 'decision') {
      if (state !== 'done') return '';
      const moved = lastAt(e => e.who === 'rådgiver' && (e.type === 'stage' || e.type === 'request-sent'));
      return withDay(cs.skipReason ? t('Direkte til memo') : t('Sagen fortsætter'), moved);
    }
    if (k === 'material') {
      if (state === 'done') return request ? wsSentText(request, true) : '';
      if (state === 'active') return wsPlural(CW.draftItems().length, t('1 punkt valgt'), t('{n} punkter valgt'));
      return '';
    }
    if (k === 'customer') {
      if (state === 'done') return p.required === 0 ? t('Intet påkrævet') : withDay(t('Godkendt'), lastAt(e => e.type === 'approved'));
      if (state === 'active') return toReview > 0 ? wsFill(t('{n} til gennemgang'), { n: toReview }) : missing ? wsFill(t('{n} mangler'), { n: missing }) : '';
      return '';
    }
    if (k === 'memo') {
      if (wsCopilot()) {
        const h = cs.handoff;
        return state === 'active' && h && h.at ? withDay(t('Materialet er hentet'), h.at) : '';
      }
      if (submitted) return wsFill(t('Indstillet {date}'), { date: wsDay(cs.submittedAt) });
      if (state === 'active' && m) return wsFill(t('{a} af {n} afsnit gennemgået'), { a: wsMemoReviewed(m), n: m.sectionsTotal });
      return '';
    }
    return '';
  };
  const PROCESS = [
    { k: 'public', label: t('Offentlige data') },
    { k: 'decision', label: t('Vurdering') },
    { k: 'material', label: t('Materialevalg') },
    { k: 'customer', label: t('Kunden') },
    { k: 'memo', label: wsCopilot() ? t('Credit memo') : t('Memo og indstilling') },
  ].map(s => { const status = stepState(s.k); return { ...s, status, sub: subOf(s.k, status) }; });

  // Fasens titel, sætning og knapper
  let title, body, primary = null, ghost = null;
  if (submitted) {
    const last = (cs.history || []).filter(h => h.type === 'submitted').slice(-1)[0];
    title = t("Sagen er indstillet til kreditkomitéen");
    body = wsFill(t('Version {v} blev indstillet {when} af {who}. Memoet er låst. Træk indstillingen tilbage, hvis du skal ændre noget.'), { v: cs.submitVersion || 1, when: wsDay(cs.submittedAt), who: (last && last.by) || wsAdvisor().name });
    primary = { label: t('Se indstilling'), arrow: true, onClick: () => go && go("workspace:" + caseId + ":indstil") };
    ghost = { label: t('Træk indstilling tilbage'), onClick: wsWithdraw };
  } else if (stage === 'declined') {
    const d = cs.decline || {};
    const from = wsPhaseName(cs.declinedFrom || 'review-public');
    title = t("Sagen er afslået");
    body = d.reason
      ? wsFill(t('Du gav afslag {when} i fasen {stage} med årsagen "{reason}". Genoptager du sagen, vender den tilbage til {stage}.'), { when: wsDay(d.at), reason: t(d.reason), stage: from })
      : t("Du har valgt at give afslag på det offentlige grundlag. Du kan genoptage sagen, hvis du har skiftet vurdering.");
    primary = { label: t('Genoptag sag'), onClick: wsReopen };
  } else if (stage === 'review-public') {
    title = t("Offentligt materiale er hentet");
    body = t("Se tallene under Virksomheden, og vælg om sagen skal fortsætte.");
    primary = { label: t('Anmod om materiale'), arrow: true, onClick: toMaterial };
    ghost = { label: t('Se offentligt materiale'), onClick: () => go && go("workspace:" + caseId + ":financials") };
    ghost2 = { id: "ws-hero-decline", label: t('Giv afslag'), onClick: () => setDeclining(true) };
  } else if (stage === 'ready-skip') {
    title = t("Kundeinput er sprunget over");
    body = (cs.skipReason ? wsFill(t('Du gik direkte til memo med begrundelsen "{reason}".'), { reason: cs.skipReason }) + ' ' : '')
      + (submitReady ? t('Memoet er gennemgået. Sagen kan indstilles.') : (wsCopilot() ? t('Næste skridt er memoet. Hent sagens materiale, og skriv memoet i Word med Copilot.') : t('Næste skridt er memoet.')));
    primary = { label: memoLabel, arrow: true, onClick: toMemo };
    ghost = { label: t('Anmod om materiale'), onClick: toMaterial };
  } else if (stage === 'material-selection') {
    title = request ? t('Opdateringen er ikke sendt') : t('Anmodningen er ikke sendt');
    body = wsPlural(CW.draftItems().length, t('1 punkt valgt. Kladden er gemt.'), t('{n} punkter valgt. Kladden er gemt.'));
    primary = { label: t('Åbn anmodningen'), onClick: () => window.dispatchEvent(new CustomEvent('cw-open-material')) };
    ghost = { label: request ? t('Tilbage til udestående') : t('Tilbage til vurdering'), onClick: () => CW.requestStage(request ? 'awaiting-customer' : 'review-public') };
  } else if (stage === 'awaiting-customer') {
    const deadline = request && request.deadline ? wsDot(wsFill(t('Svarfrist {date}.'), { date: wsDay(request.deadline) })) : '';
    if (toReview > 0) {
      title = wsPlural(toReview, t('1 punkt venter på din gennemgang'), t('{n} punkter venter på din gennemgang'));
      body = '';   // ingen underoverskrift: det, der mangler, og svarfristen står i listen nedenfor
      primary = { label: t('Gennemgå materiale'), onClick: () => toOutstanding(wsFirstToReviewSel()) };
    } else if (wsMaterialReady(p)) {
      title = t('Materialet er godkendt');
      body = t('Markér sagen som klar for at fortsætte til memoet.');
      primary = { label: t('Markér som klar'), onClick: () => CW.requestStage('ready') };
    } else {
      const to = request && request.to ? request.to.name || request.to.email : '';
      title = missing ? wsPlural(missing, t('1 punkt mangler fra kunden'), t('{n} punkter mangler fra kunden')) : t('Anmodningen er sendt');
      body = request
        ? wsFill(t('Sendt {when} til {to}.'), { when: wsDay(request.firstSentAt || request.sentAt), to: to || t('kunden') }) + (deadline ? ' ' + deadline : '')
        : t('Anmodningen er ikke sendt endnu.');
      primary = { label: t('Se udestående'), onClick: () => toOutstanding() };
    }
    ghost = { label: t('Anmod om mere materiale'), onClick: toMaterial };
  } else { // ready
    title = p.required === 0 ? t('Intet påkrævet materiale udestår') : t("Materialet er godkendt");
    body = submitReady ? t('Memoet er gennemgået. Sagen kan indstilles.') : (wsCopilot() ? t('Næste skridt er memoet. Hent sagens materiale, og skriv memoet i Word med Copilot.') : t('Næste skridt er memoet.'));
    primary = { label: memoLabel, arrow: true, onClick: toMemo };
    ghost = { label: t('Anmod om mere materiale'), onClick: toMaterial };
  }
  return {
    cs, submitted, request, p, toReview, missing, m, submitReady, toMaterial, toMemo, memoLabel, toOutstanding, skipped, PROCESS,
    title, body, primary, ghost, ghost2,
  };
}

// Sager uden levende data (WSEmptyCase, workspace.jsx L879–985): den ærlige tomme tilstand.
// heading og text (seks varianter), facts ({ label, value, mono, wrap }), den gemte anmodning
// (req, reqItems, sent, next) og demoens afsendelse (sendDemo). showMail: mailen vises (mail).
function wsEmptyCase(caseData, showMail) {
  const live = DATA.CASES.find(c => CW.isLiveCase(c.id)) || DATA.CASES[0];
  const sameCompany = !caseData.demo && String(caseData.cvr || '') === String(live.cvr || '') && caseData.id !== live.id;
  const owner = caseData.unknown ? null : wsOwner(caseData);
  const req = caseData.demo && caseData.request && Array.isArray(caseData.request.items) && caseData.request.items.length ? caseData.request : null;
  const reqItems = req && typeof CW.demoCaseItems === 'function' ? CW.demoCaseItems(caseData.id) : [];
  const amountNote = caseData.demo && typeof CW.demoCaseAmountNote === 'function' ? CW.demoCaseAmountNote(caseData.id) : null;
  const sent = !!(req && req.sent);
  const next = sent ? 'Afvent kunden' : caseData.demo && typeof CW.demoCaseNext === 'function' ? CW.demoCaseNext(caseData.id) : null;
  // Afsendelsen simuleres: anmodningen står som sendt, og sagen afventer kunden
  const sendDemo = () => {
    if (typeof CW.sendDemoCase !== 'function') { CW.notInDemo(t('Afsendelse fra en ny sag')); return; }
    CW.sendDemoCase(caseData.id);
    CW.toast(wsFill(t('Anmodning sendt til {email}'), { email: (req.to && (req.to.email || req.to.name)) || t('kunden') }));
    CW.focusSoon('#ws-demo-title');
  };
  const mail = showMail && req && typeof CW.demoCaseMail === 'function' ? CW.demoCaseMail(caseData.id) : null;
  const facts = caseData.unknown ? [] : [
    { label: t('Sagsnr.'), value: caseData.caseNr, mono: true },
    caseData.type && { label: t('Type'), value: t(caseData.type) },
    caseData.amount != null && { label: t('Beløb'), value: wsMoney(caseData.amount) + (amountNote ? ' (' + amountNote + ')' : ''), wrap: !!amountNote },
    owner && { label: t('Ansvarlig'), value: owner },
    caseData.demo && caseData.createdAt && { label: t('Oprettet'), value: CW.fmtDate(caseData.createdAt) },
    // Sagens egen frist. Kundens svarfrist står ved anmodningen.
    caseData.deadline && { label: t('Frist'), value: CW.fmtDate(caseData.deadline) },
  ].filter(Boolean);
  const text = caseData.unknown
    ? t('Sagen findes ikke i demoen. Den kan være slettet, eller linket kan være forkert.')
    : caseData.demo && sent
      ? wsFill(t('Anmodningen blev sendt {when}. Sagen afventer kunden. Kundens svar vises her, når det kommer; i demoen er det kun sag {live}, der har svar fra kunden.'), { when: CW.fmtWhen(req.sentAt), live: live.caseNr })
    : caseData.demo && req
      ? wsFill(t('Sagen blev oprettet i demoen {date}. Anmodningen til kunden er gemt som kladde og er ikke sendt. Materiale og memo kommer, når kunden har svaret.'), { date: caseData.createdAt ? CW.fmtDate(caseData.createdAt) : '' })
    : caseData.demo
      ? wsFill(t('Sagen blev oprettet i demoen {date}, men har endnu hverken materiale, anmodning eller memo. I en rigtig sag ville du fortsætte med at vurdere de offentlige data.'), { date: caseData.createdAt ? CW.fmtDate(caseData.createdAt) : '' })
      : sameCompany
        ? wsFill(t('Sag {nr} ({type}) er en separat sag for {name}. Demoen har kun data for sag {live}, så denne sag vises uden indhold og deler ikke tilstand med den.'), { nr: caseData.caseNr, type: t(caseData.type || ''), name: caseData.name, live: live.caseNr })
        : wsFill(t('Demoen har kun data for {company}. Sag {nr} for {name} vises derfor uden indhold, så du ikke ser en anden virksomheds tal under dette sagsnummer.'), { company: DATA.COMPANY.name, nr: caseData.caseNr, name: caseData.name });
  const heading = caseData.unknown ? t('Sagen findes ikke') : sent ? t('Anmodningen er sendt, sagen afventer kunden') : caseData.demo && req ? t('Sagen er oprettet, og anmodningen er gemt') : caseData.demo ? t('Sagen er oprettet, men ikke udfyldt') : t('Denne sag er ikke udfyldt i demoen');
  return { live, sameCompany, owner, req, reqItems, amountNote, sent, next, sendDemo, mail, facts, text, heading };
}

// Overblik (WSOverview, workspace.jsx L987–1080): anmodningen, om opdateringen er åben (editing),
// om kundedialogen står først (waitsOnAdvisor; skærmen holder den der, når den først er kommet
// derop), om materialevalget vises (matShown), og closeMaterial (luk det: en opdatering lukkes, en
// anmodning, der ikke er sendt, går tilbage til vurderingen, ellers skjules vinduet med
// ui.setMatClosed(true); kladden er gemt).
function wsOverviewModel(stage, ui) {
  const { setMatClosed } = ui;
  const request = CW.request();
  const submitted = !!CW.caseState().submittedAt;
  const editing = wsIsEditing();
  // Dialogen står altid på Overblik, så rådgiveren også kan skrive i vurderingsfasen
  const showDialog = true;
  // Venter kunden på et svar fra rådgiveren, står dialogen før Udestående
  // Venter kunden på et svar, står dialogen først. Den bliver stående, efter at
  // rådgiveren har svaret, så feltet ikke hopper væk midt i skrivningen.
  const waitsOnAdvisor = showDialog && typeof CW.conversationWaitsOn === 'function' && CW.conversationWaitsOn() === 'rådgiver';
  // Materialevalget vises som modal. Lukkes den uden at sende, huskes kladden.
  const matShown = stage === 'material-selection' || editing;
  // Lukkes en anmodning, der ikke er sendt, går sagen tilbage til vurderingen.
  // Kladden er gemt, så "Anmod om materiale" åbner den igen med de samme valg.
  const closeMaterial = () => {
    if (editing) wsSetEditing(false);   // lukker bare vinduet; siden ruller ikke
    else if (stage === 'material-selection' && !request) { CW.requestStage('review-public'); CW.focusSoon('#ws-hero-title'); }
    else setMatClosed(true);
  };
  return { request, submitted, editing, showDialog, waitsOnAdvisor, matShown, closeMaterial };
}

export { wsBackCrumb, wsGoBack, wsHeaderModel, wsOwnerPicker, wsStageHero, wsEmptyCase, wsOverviewModel };
