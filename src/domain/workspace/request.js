// Sagen (workspace): materialevalget, kladden til anmodningen, afsendelsen og mailene til kunden
// (anmodning, påmindelse og spørgsmål til materialet). Flyttet uændret fra workspace.jsx ved
// migrationen til Vue; logik, der lå inde i komponenterne, er løftet ud i navngivne funktioner
// med de samme linjer (kilden står over hver). Bare globaler (t, DATA, CW) læses via window.
// Funktioner med parameteren ui får skærmens tilstand som funktioner med de gamle navne
// (f.eks. ui.setTried), så linjerne er de samme som før.
import { confirmRemove } from '@/services/feedback';
import { wsFill, wsPlural } from './format.js';
import { wsAdvisor, wsCaseDeadline } from './caseData.js';
import { wsSetEditing } from './stage.js';
import { wsRequestMore, wsScrollTo } from './actions.js';
import { wsCustomerList } from './items.js';

// Hvornår blev kunden bedt om punktet? Den seneste afsendelse, der tilføjede det.
function wsItemRequestedAt(r, id) {
  if (!r) return null;
  const h = (r.history || []).filter(x => (x.added || []).indexOf(id) >= 0).slice(-1)[0];
  return (h && h.at) || r.firstSentAt || r.sentAt;
}

// Punkternes status og den sendte anmodning sidst sagen blev vist
function wsItemsKey() {
  const st = CW.items();
  const r = CW.request();
  return (r ? 'v' + (r.version || 1) : '-') + '|' + CW.requestedItems().map(it => it.id + ':' + ((st[it.id] && st[it.id].status) || '-')).join('|');
}

// "Alle 5 påkrævede punkter er godkendt. 1 valgfrit punkt er ikke modtaget og er ikke påkrævet."
function wsMaterialSummary(p) {
  p = p || CW.progress();
  if (p.allApproved) return wsFill(t('Alle {n} punkter er modtaget og godkendt.'), { n: p.total });
  const st = CW.items();
  const optOpen = CW.requestedItems().filter(it => it.tag === 'Valgfri' && !(st[it.id] && ['approved', 'received', 'noted'].indexOf(st[it.id].status) >= 0)).length;
  const req = p.required === 0 ? t('Anmodningen har ingen påkrævede punkter.')
    : wsPlural(p.required, t('Det påkrævede punkt er godkendt.'), t('Alle {n} påkrævede punkter er godkendt.'));
  return req + (optOpen ? ' ' + wsPlural(optOpen, t('1 valgfrit punkt er ikke modtaget og er ikke påkrævet.'), t('{n} valgfrie punkter er ikke modtaget og er ikke påkrævet.')) : '');
}

/* ─────────────────────────────────────────────────────────────────────────
   Materialevalg og kundeanmodning

   Vælgeren er kladden (CW.selection). Kunden ser kun den sendte anmodning
   (CW.request), indtil rådgiveren trykker "Anmod om materiale" første gang
   eller "Send opdatering" bagefter. En opdatering mailer kun de nye punkter.
   ──────────────────────────────────────────────────────────────────────── */
// Mailkladden gemmes i CW.draft. message er null, så længe rådgiveren ikke har
// rettet i standardteksten (så den følger sproget).
const WS_DRAFT_V = 3;
function wsDraft(caseData) {
  const r = DATA.REQUEST_RECIPIENT || {};
  // Standardfristen er 7 hverdage, men aldrig efter sagens egen frist
  let deadline = CW.workdaysFromNow(7);
  const cd = wsCaseDeadline(caseData);
  if (cd && cd < deadline && !CW.isPast(cd)) deadline = cd;
  const base = { v: WS_DRAFT_V, name: r.name || '', role: (r.role || '').split(',')[0].trim(), email: r.email || '', deadline, message: null, notifyRemoved: true, sendMail: true };
  const d = CW.draft();
  if (!d) return base;
  const out = { ...base, name: d.name != null ? d.name : base.name, role: d.role != null ? d.role : base.role, email: d.email != null ? d.email : base.email };
  if (d.v === WS_DRAFT_V) { out.deadline = d.deadline != null ? d.deadline : base.deadline; out.message = d.message != null ? d.message : null; out.subject = d.subject != null ? d.subject : null; out.body = d.body != null ? d.body : null; out.notifyRemoved = d.notifyRemoved !== false; out.sendMail = d.sendMail !== false; }
  return out;
}
function wsSetDraft(patch, caseData) { CW.setDraft({ ...wsDraft(caseData), ...patch, v: WS_DRAFT_V }); }

/** Kan kladden sendes? { draft, error, warning, diff, request, count } */
function wsDraftCheck(caseData) {
  const draft = wsDraft(caseData);
  const request = CW.request();
  const count = CW.draftItems().length;
  const diff = CW.draftDiff();
  const emailOk = /^[^@ ]+@[^@ ]+\.[^@ ]+$/.test(draft.email.trim());
  const cd = wsCaseDeadline(caseData);
  const past = !!draft.deadline && CW.isPast(draft.deadline);
  const late = !!draft.deadline && !!cd && draft.deadline > cd;
  const nothing = !!request && !diff && draft.deadline === request.deadline;
  const error = count === 0 ? t('Vælg mindst ét punkt.')
    : !draft.name.trim() ? t('Udfyld modtagerens navn.')
    : !emailOk ? t('Udfyld en gyldig mailadresse.')
    : !draft.deadline ? t('Vælg en svarfrist.')
    : past ? t('Svarfristen ligger i fortiden. Vælg i dag eller en senere dato.')
    : nothing ? t('Der er ingen ændringer at sende.')
    : null;
  const warning = late ? wsFill(t('Svarfristen ligger efter sagens frist {date}. Kunden kan nå at svare for sent.'), { date: CW.fmtDate(cd) }) : null;
  // En opdatering, der ikke efterlader nogen påkrævede punkter, kræver en bekræftelse
  const noRequired = !!request && count > 0 && !CW.draftItems().some(it => it.tag !== 'Valgfri');
  return { draft, error, warning, diff, request, count, past, noRequired };
}

/** Send kladden. Første gang: "Send anmodning". Bagefter: "Send opdatering". */
function wsSendRequest(caseData, onInvalid) {
  const c = wsDraftCheck(caseData);
  if (c.error) { CW.toast(c.error, { tone: 'warn' }); onInvalid && onInvalid(); return false; }
  if (c.noRequired) {
    CW.confirm({
      title: t('Ingen påkrævede punkter tilbage'),
      text: t('Opdateringen fjerner alle påkrævede punkter, så kunden kun bliver bedt om valgfrit materiale. Sagen går derefter videre uden mere påkrævet materiale fra kunden, og det står i sagens historik. Vil du sende den alligevel?'),
      confirmLabel: t('Send alligevel'),
    }).then(r => { if (r.ok) wsDoSend(c, caseData); });
    return true;
  }
  return wsDoSend(c, caseData);
}
// quiet: vinduet "Anmod om materiale" viser selv en kvittering, så der kommer ingen besked ovenpå
function wsDoSend(c, caseData, quiet) {
  const say = (text, opts) => { if (!quiet) CW.toast(text, opts); };
  const to = { name: c.draft.name.trim(), role: c.draft.role.trim(), email: c.draft.email.trim() };
  const first = !c.request;
  const added = c.diff ? c.diff.added.length : 0;
  const removedN = c.diff ? c.diff.removed.filter(it => !CW.isReceived(it.id)).length : 0;
  const notifyRemoved = c.draft.notifyRemoved !== false;
  const noMail = c.draft.sendMail === false || (!first && added === 0 && !(removedN > 0 && notifyRemoved));
  const prevRequest = c.request ? JSON.parse(JSON.stringify(c.request)) : null;
  CW.sendRequest({ deadline: c.draft.deadline, to, noMail, notifyRemoved });
  wsSetDraft({ deadline: c.draft.deadline, message: null }, caseData);
  wsSetEditing(false);
  const s = CW.stage();
  const move = (s === 'material-selection' || s === 'review-public') ? CW.requestStage('awaiting-customer') : Promise.resolve(true);
  move.then(() => {
    if (first) {
      // Fortryd inden for beskedens levetid: mailen er ikke gået, kladden står tilbage
      const undo = () => {
        CW.clearRequest();
        CW.log('request-undone', wsFill(t('Afsendelsen til {email} er fortrudt. Kunden har ikke fået anmodningen.'), { email: to.email }), { who: 'rådgiver' });
        CW.requestStage('material-selection').then(() => {
          CW.toast(t('Afsendelsen er fortrudt. Anmodningen ligger igen som kladde.'), { tone: 'info' });
          setTimeout(() => wsScrollTo('ws-material'), 80);
          CW.focusSoon('#ws-material-title');
        });
      };
      say(noMail ? t('Anmodningen er oprettet uden mail. Giv selv kunden linket.') : wsFill(t('Anmodning sendt til {email}'), { email: to.email }), { action: { label: t('Fortryd'), onClick: undo } });
    } else {
      // Fortryd en opdatering: den tidligere anmodning gælder igen, og
      // ændringerne ligger tilbage i kladden
      const undoUpdate = () => {
        try { localStorage.setItem(CW.KEYS.request, JSON.stringify(prevRequest)); } catch (e) {}
        CW.bump();
        CW.log('request-undone', wsFill(t('Opdateringen er fortrudt. Kunden ser igen version {v} af anmodningen.'), { v: prevRequest.version || 1 }), { who: 'rådgiver' });
        CW.toast(t('Opdateringen er fortrudt. Ændringerne ligger igen i kladden.'), { tone: 'info' });
        CW.focusSoon('#ws-hero-title');
      };
      say(noMail ? t('Anmodningen er opdateret uden mail. Kundens side viser ændringen.')
        : added ? wsFill(wsPlural(added, t('Opdatering sendt til {email} med 1 nyt punkt'), t('Opdatering sendt til {email} med {n} nye punkter')), { email: to.email })
        : wsFill(t('Opdatering sendt til {email}: punkter er fjernet'), { email: to.email }),
        { action: { label: t('Fortryd'), onClick: undoUpdate } });
    }
    setTimeout(() => wsScrollTo('ws-hero'), 80);
    CW.focusSoon('#ws-hero-title');
  });
  return true;
}

// Emnerne i materialevalget: samme tabel som kundens portal og Dokumenter (case_state.js)
const WS_MATERIAL_CATS = CW.MATERIAL_CATS;

// Emne for et punkt i anmodningen
function wsMaterialCat(it) { return CW.itemCat(it); }
// Har rådgiveren selv uploadet punktet på kundens vegne?
function wsUploadedByAdvisor(id) {
  const s = CW.itemState(id);
  return s && s.by === 'rådgiver' && (s.status === 'received' || s.status === 'approved') && (s.files || []).length ? s : null;
}
// Fravalg af et punkt, kunden allerede har sendt, kræver bekræftelse (som før)
function wsToggleMaterial(it) {
  const sel = CW.selection();
  const on = !sel[it.id];
  const s = CW.itemState(it.id);
  const delivered = s && (s.status === 'received' || s.status === 'noted' || s.status === 'approved');
  if (on || !delivered || s.by === 'rådgiver') { CW.setSelection({ ...CW.selection(), [it.id]: on }); return; }
  if (s.status === 'received' || s.status === 'noted') {
    CW.confirm({
      title: wsFill(t('Gennemgå "{item}" først'), { item: t(it.label) }),
      text: t('Kunden har sendt punktet, men du har ikke gennemgået det. Godkend det eller stil et spørgsmål til materialet under Udestående, før du fravælger det.'),
      confirmLabel: t('Gå til punktet'),
    }).then(r => {
      if (!r.ok) return;
      wsSetEditing(false);
      setTimeout(() => { const el = document.getElementById('ws-item-' + it.id); if (el) el.scrollIntoView({ block: 'center' }); CW.focusSoon('#ws-item-' + it.id + ' [data-act="approve"]'); }, 120);
    });
    return;
  }
  CW.confirm({
    title: wsFill(t('Fravælg "{item}"?'), { item: t(it.label) }),
    text: t('Punktet er allerede godkendt. Fravælger du det, bliver kunden ikke længere bedt om det, når du sender opdateringen. Filerne bliver liggende under Dokumenter.'),
    confirmLabel: t('Fravælg punktet'), danger: true,
  }).then(r => { if (r.ok) CW.setSelection({ ...CW.selection(), [it.id]: false }); });
}

/* Én stille linje, når kladden afviger fra det, kunden har fået (WSDraftBar, workspace.jsx
   L1694–1711). null uden ændringer og efter indstillingen. lead er teksten før navnene;
   open åbner anmodningen (send og kassér sker dér). */
function wsDraftBar() {
  const diff = CW.draftDiff();
  if (!diff || CW.caseState().submittedAt) return null;
  const n = diff.added.length + diff.removed.length;
  const names = [].concat(diff.added.map(it => t(it.label)), diff.removed.map(it => wsFill(t('{item} (fjernes)'), { item: t(it.label) }))).join(', ');
  const open = () => wsRequestMore(() => { setTimeout(() => wsScrollTo('ws-material'), 80); CW.focusSoon('#ws-material-title'); });
  const lead = wsPlural(n, t('1 anmodning er ikke sendt til kunden:'), t('{n} anmodninger er ikke sendt til kunden:'));
  return { diff, n, names, open, lead };
}

// "Anmod om materiale" (WSMaterialModal, workspace.jsx L1749–2237) uden React: punkterne i
// listerne (valgt/mangler, mere materiale, hentet automatisk, ligger på sagen), mailen med
// standardtekst og rådgiverens rettelser, om kladden kan kasseres og sendeknappens tekst.
// caseData: sagen; request: den sendte anmodning (CW.request()) eller null.
function wsMaterialModel(caseData, request) {
  const sel = CW.selection();
  const st = CW.items();
  const check = wsDraftCheck(caseData);
  const draft = check.draft;
  const cd = wsCaseDeadline(caseData);
  const all = CW.allItems();
  const hasOnFile = it => { const f = CW.onFile(it); return !!f && !f.stale; };
  const isExtra = it => it.tier === 'extra';
  const rank = it => it.custom ? 2 : isExtra(it) ? 1 : 0;
  // Punkter, der allerede ligger på sagen (uploadet af kunden eller rådgiveren, eller hentet), står under "Ligger allerede på sagen"
  const delivered = it => hasOnFile(it) || !!CW.isReceived(it.id) || CW.isApproved(it.id);
  const missing = all.filter(it => !it.custom && !wsUploadedByAdvisor(it.id) && !delivered(it) && (!isExtra(it) || sel[it.id])).sort((a, b) => rank(a) - rank(b));
  const extras = all.filter(it => isExtra(it) && !delivered(it) && !sel[it.id]);
  const custom = all.filter(it => it.custom);
  const hasYears = all.some(it => it.tier === 'year' && hasOnFile(it));
  const inCase0 = all.filter(it => !it.custom && (!!wsUploadedByAdvisor(it.id) || (delivered(it) && !(hasYears && it.id === 'm-annual'))));
  // Hentet automatisk (offentlige kilder og årsrapporterne fra CVR): står for sig, så rådgiveren kan
  // se, at det er hentet, og alligevel spørge kunden om det eller bede om en ny version
  const isFetched = it => { const f = CW.onFile(it); return !!f && (f.isPublic || it.tier === 'year') && !wsUploadedByAdvisor(it.id); };
  const fetched = inCase0.filter(isFetched);
  const inCase = inCase0.filter(it => !isFetched(it));
  // Ligger på sagen, delt i godkendt (flueben) og til rådgiverens gennemgang (et andet ikon)
  const isApprovedItem = it => CW.isApproved(it.id) || (!!wsUploadedByAdvisor(it.id) && wsUploadedByAdvisor(it.id).status === 'approved');
  const godkendt = inCase.filter(isApprovedItem);
  const gennemgang = inCase.filter(it => !isApprovedItem(it));
  const catOptions = WS_MATERIAL_CATS.map(c => c.label);

  // Det, mailen beder om: valgte punkter, som rådgiveren ikke selv har uploadet.
  // En opdatering nævner kun de nye punkter.
  const added = check.diff ? check.diff.added.map(i => i.id) : null;
  const mailItems = CW.draftItems().filter(it => !wsUploadedByAdvisor(it.id) && (!request || !added || added.includes(it.id)));
  const listError = CW.draftItems().length === 0 ? t('Vælg mindst ét punkt.')
    : request && !check.diff && draft.deadline === request.deadline ? t('Der er ingen ændringer at sende.') : null;

  // Fjernede punkter: kunden kan få besked om, at de ikke skal sendes (rådgiveren vælger)
  const removedItems = check.diff ? check.diff.removed.filter(it => !CW.isReceived(it.id)) : [];
  const notifyRemoved = draft.notifyRemoved !== false;
  const deadlineText = draft.deadline ? CW.fmtDate(draft.deadline) : '';
  const first = (draft.name || '').trim().split(/\s+/)[0] || t('modtageren');
  const mail = CW.requestMail({ items: mailItems, deadline: draft.deadline, to: { name: draft.name, email: draft.email } });
  const defSubject = mail.subject + ' - ' + mail.caseLine;
  const whyOf = it => hasOnFile(it) ? t('Opdateret version.') : t(it.why || '');
  const removedList = removedItems.map((it, n) => (n + 1) + '. ' + t(it.label)).join('\n');
  const noNew = request && mailItems.length === 0;
  const hasMail = !(request && mailItems.length === 0 && !notifyRemoved);   // intet at skrive til kunden: ingen mail
  // Rådgiveren kan altid lade være med at sende mailen (f.eks. fordi de selv ringer eller skriver til kunden)
  const wantMail = draft.sendMail !== false;
  const showMail = hasMail && wantMail;
  const reqLink = 'https://' + ((request && request.link) || (DATA.REQUEST_LINK || 'crediwire.app/c/nh-9j2k-7Aq3'));
  const copyLink = () => {
    const done = () => CW.toast(t('Linket er kopieret.'));
    try { navigator.clipboard.writeText(reqLink).then(done, done); } catch (e) { done(); }
  };
  const defBody = (noNew ? [
    mail.greeting, '',
    t('Vi skal alligevel ikke bruge følgende materiale, så I behøver ikke at sende det:'), '',
    removedList, '',
    t('Alt andet i anmodningen gælder som før.'),
    mail.link, '',
    t('Linket er personligt og udløber efter 30 dage.'),
  ] : [
    mail.greeting, '',
    request ? t('Vi har brug for lidt mere materiale til vurderingen af jeres ansøgning.') : mail.intro, '',
    mailItems.map((it, n) => (n + 1) + '. ' + t(it.label) + (whyOf(it) ? '\n   ' + whyOf(it) : '')).join('\n'), '',
    ...(request && notifyRemoved && removedItems.length ? [t('Følgende skal I ikke længere sende:'), removedList, ''] : []),
    wsFill(t('Upload materialet via linket senest {date}:'), { date: deadlineText }),
    mail.link, '',
    t('Linket er personligt og udløber efter 30 dage.'),
    // Første mail: som dagens invitation siger den, hvad Crediwire er, og at kunden opretter en bruger og kan forbinde regnskabssystemet
    ...(request ? [] : ['', mail.trustLine, t('I kan give EIFO læseadgang til periodetal og debitordata i jeres regnskabssystem i stedet for at sende filer. Har jeres revisor adgangen, kan I bede revisoren om hjælp fra siden.')]),
  ]).join('\n');
  const subject = draft.subject != null ? draft.subject : defSubject;
  const body = draft.body != null ? draft.body : defBody;

  // Kassér kladdens ændringer (kun ved en opdatering af en sendt anmodning)
  const canDiscard = !!request && !!CW.draftDiff();
  // Sendeknappens tekst (L2228)
  const sendLabel = request ? (showMail ? t('Send opdatering') : t('Gem ændringen')) : showMail ? wsFill(t('Send til {name}'), { name: first }) : t('Opret uden mail');
  return {
    sel, st, check, draft, cd, all, hasOnFile, isExtra, rank, missing, extras, custom, hasYears, inCase0, isFetched, fetched, inCase, godkendt, gennemgang, catOptions,
    added, mailItems, listError, removedItems, notifyRemoved, deadlineText, first, mail, defSubject, whyOf, removedList, noNew, hasMail,
    wantMail, showMail, reqLink, copyLink, defBody, subject, body, canDiscard, sendLabel,
  };
}

// Titel og undertitel i "Anmod om materiale" (WSMaterialModal, workspace.jsx L1974–1977) og
// kvitteringens overskrift og tekst (L1994–1998). view: 'list' | 'preview' | 'sent';
// sent: kvitteringen { name, count, deadline, update, noMail } eller null.
function wsMaterialHeading(sent, request, view) {
  const title = (sent ? sent.update : request) ? t('Ret i anmodningen') : t('Anmod om materiale');
  const subtitle = view === 'sent' ? ''
    : view === 'preview' ? t('Tjek modtager og mail, før du sender.')
    : t('Vælg det materiale, du vil have fra kunden.');
  const sentTitle = sent ? (sent.noMail
    ? (sent.update ? t('Anmodningen er opdateret uden mail') : wsFill(t('Anmodningen til {name} er oprettet uden mail'), { name: sent.name }))
    : wsFill(sent.update ? t('Opdatering sendt til {name}') : t('Anmodning sendt til {name}'), { name: sent.name })) : null;
  const sentText = sent ? wsFill(t('{items} - svarfrist {date}. Du kan følge svarene i sagen.'), { items: wsPlural(sent.count, t('1 punkt'), t('{n} punkter')), date: CW.fmtDate(sent.deadline) }) : null;
  return { title, subtitle, sentTitle, sentText };
}

// Filer, rådgiveren uploader på kundens vegne til et punkt i materialevalget (WSMaterialModal,
// workspace.jsx L1861–1868): punktet står som modtaget og er valgt. list: FileList eller File[].
function wsAttachFiles(it, list) {
  const arr = Array.from(list || []);
  if (!arr.length) return;
  const files = CW.putFiles(arr, { by: 'rådgiver', itemId: it.id });
  CW.markReceived(it.id, { by: 'rådgiver', files });
  CW.setSelection({ ...CW.selection(), [it.id]: true });
}

// Fjern det, rådgiveren selv har uploadet til punktet (L1869)
const wsUnupload = (it) => CW.resetItem(it.id, 'rådgiver');

// Tilføj andet materiale (L1870–1873). newItem: feltets tekst; setNewItem('') tømmer feltet.
function wsAddCustomItem(newItem, setNewItem) {
  const v = newItem.trim(); if (!v) return;
  CW.addCustomItem(v, 'Øvrigt'); setNewItem('');
}

// Kassér kladdens ændringer (L1877–1882): kladden svarer igen til det, kunden har fået, og
// beskeden kan fortryde. onClose lukker vinduet.
function wsDiscardDraft(onClose) {
  const before = CW.selection();
  CW.discardDraft();
  CW.toast(t('Ændringerne er kasseret. Kladden svarer igen til det, kunden har fået.'), { action: { label: t('Fortryd'), onClick: () => CW.setSelection(before) } });
  onClose && onClose();
}

// Send (L1884–1894). model: wsMaterialModel(...); ui: setTried(bool), setEditRec(bool) (åbner
// modtagerfelterne), onClose(), onSent(info) og setView('sent'). Fejl i navn, mail eller frist
// åbner modtagerfelterne. Testen læser den oversatte fejltekst (/navn|mail|frist/i), så på engelsk
// gælder den kun mailadressen; bevaret som før.
function wsMaterialSend(caseData, request, model, ui) {
  const { mailItems, showMail } = model;
  const { setTried, setEditRec, onClose, onSent, setView } = ui;
  setTried(true);
  const c = wsDraftCheck(caseData);
  if (c.error) { if (/navn|mail|frist/i.test(c.error)) setEditRec(true); return; }
  const info = { name: c.draft.name.trim(), count: mailItems.length, deadline: c.draft.deadline, update: !!request, noMail: !showMail };
  if (c.noRequired) { wsSendRequest(caseData); onClose(); return; }
  wsDoSend(c, caseData, true);
  wsSetDraft({ subject: null, body: null, sendMail: true }, caseData);
  onSent && onSent(info);
  setView('sent');
}

// Din egen upload er forældet: filen fjernes, og kunden bliver bedt om en ny version
const wsAskNewVersion = (it) => CW.confirm({
  title: wsFill(t('Bed om ny version af "{item}"?'), { item: t(it.label) }),
  text: t('Din uploadede fil fjernes, og kunden bliver bedt om at sende en ny version.'),
  confirmLabel: t('Bed om ny version'),
}).then(r => { if (r && r.ok) { CW.resetItem(it.id, 'rådgiver'); CW.setSelection({ ...CW.selection(), [it.id]: true }); } });

// "Spørg kunden" om noget hentet automatisk (L1796): formularen åbnes eller lukkes for punktet,
// kategorien er punktets, og markøren står i spørgsmålet. asking: det åbne punkts id.
// ui: setAsking, setAskText, setAskTried, setAskCat.
function wsOpenAsk(it, asking, ui) {
  const { setAsking, setAskText, setAskTried, setAskCat } = ui;
  const on = asking !== it.id; setAsking(on ? it.id : null); setAskText(''); setAskTried(false); setAskCat(wsMaterialCat(it)); if (on) CW.focusSoon('#ws-ask-q-' + it.id);
}

// Læg spørgsmålet i anmodningen (L1805–1812). askText/askCat: formularens felter.
// ui: setAskTried, setAsking, setAskText. Uden tekst står markøren i feltet igen.
function wsAddAsk(it, askText, askCat, ui) {
  const { setAskTried, setAsking, setAskText } = ui;
  setAskTried(true);
  if (!askText.trim()) { CW.focusSoon('#ws-ask-' + it.id + ' textarea'); return; }
  const id = CW.addCustomItem(wsFill(t('Spørgsmål om {item}'), { item: t(it.label) }), askCat || wsMaterialCat(it) || 'Øvrigt', { question: askText.trim(), about: it.id });
  setAsking(null); setAskText(''); setAskTried(false);
  CW.toast(t('Spørgsmålet er lagt i anmodningen. Kunden får det, når du sender den.'));
  CW.focusSoon('#ws-req-' + id);
}

// Fjern en fil, rådgiveren har uploadet på kundens vegne (L1938–1940), efter en bekræftelse
function wsRemoveAdvisorFile(it, f) {
  return confirmRemove(f.name, wsFill(t('Filen fjernes fra "{item}".'), { item: t(it.label) })).then(ok => { if (ok) CW.removeFile(it.id, f.id, 'rådgiver'); });
}

// Fjern alle rådgiverens filer på punktet (L1947), efter en bekræftelse. up: wsUploadedByAdvisor(it.id)
function wsRemoveAdvisorFiles(it, up) {
  return confirmRemove('', wsFill(t('Filerne fjernes fra "{item}".'), { item: t(it.label) }), { title: wsFill(t('Fjern alle {n} filer?'), { n: up.files.length }), confirmLabel: t('Fjern filerne') }).then(ok => { if (ok) wsUnupload(it); });
}

/* Påmindelse til kunden (WSRemindModal, workspace.jsx L2506–2579): mailen handler som
   udgangspunkt om alt, kunden mangler at sende; rådgiveren kan skrive den om. ids: punkterne,
   påmindelsen gælder (tom: "Kunden mangler ikke noget."). */
// only: kun disse punkter (Påmind på ét punkt); uden only alt, kunden mangler (Påmind alle).
function wsRemindMail(only) {
  const request = CW.request();
  const st = CW.items();
  const adv = wsAdvisor();
  const to = (request && request.to) || {};
  // Det, kunden stadig skylder: ikke sendt endnu, eller afvist og skal sendes igen
  const missingItems = wsCustomerList().filter(e => !e.dropped && (!st[e.it.id] || st[e.it.id].status === 'pending' || st[e.it.id].status === 'rejected'))
    .filter(e => !only || only.indexOf(e.it.id) >= 0).map(e => e.it);
  const ids = missingItems.map(it => it.id);
  const mail = CW.requestMail({ items: missingItems, deadline: request && request.deadline, to: { name: to.name, email: to.email }, link: request && request.link });
  const defSubject = t('Påmindelse') + ': ' + mail.subject + ' - ' + mail.caseLine;
  const defBody = [
    mail.greeting, '',
    t('Vi mangler stadig følgende materiale til vurderingen af jeres ansøgning:'), '',
    missingItems.map((it, n) => (n + 1) + '. ' + t(it.label)).join('\n'), '',
    request && request.deadline ? wsFill(t('Upload det via linket senest {date}:'), { date: CW.fmtDate(request.deadline) }) : t('Upload det via linket:'),
    mail.link, '',
    t('Har I spørgsmål, så skriv endelig til mig.'), '',
    adv.name,
  ].join('\n');
  return { request, st, adv, to, missingItems, ids, mail, defSubject, defBody };
}

// Send påmindelsen (L2534–2538). Skærmen lukker vinduet bagefter.
function wsSendReminder(ids, adv, to) {
  CW.remind(ids, { by: adv.name });
  CW.toast(wsFill(ids.length === 1 ? t('Påmindelse om 1 punkt sendt til {email}') : t('Påmindelse om {n} punkter sendt til {email}'), { n: ids.length, email: to.email || t('kunden') }));
}

/* Stil spørgsmål til materialet (WSRejectModal, workspace.jsx L2582–2668): mailens emne og tekst
   med spørgsmålet sat ind. reason: spørgsmålet; sendMail: om mailen sendes; subjectEdit/bodyEdit:
   rådgiverens rettelser (null = standardteksten). ok: der er et spørgsmål, og mailen har tekst,
   hvis den sendes. Den rettede mail sendes ikke videre (kun visning), som før. */
function wsRejectMail(it, reason, sendMail, subjectEdit, bodyEdit) {
  const request = CW.request();
  const adv = wsAdvisor();
  const to = (request && request.to) || {};
  const label = t(it.label);
  const mail = CW.requestMail({ items: [it], deadline: request && request.deadline, to: { name: to.name, email: to.email }, link: request && request.link });
  const defSubject = wsFill(t('Vi har et spørgsmål til {item}'), { item: label }) + ' - ' + mail.caseLine;
  const defBody = [
    mail.greeting, '',
    wsFill(t('Tak for det, I har sendt. Vi har kigget på "{item}" og har et spørgsmål:'), { item: label }), '',
    reason.trim() ? reason.trim() : '',
    reason.trim() ? '' : null,
    request && request.deadline ? wsFill(t('Skal noget rettes, så upload gerne en ny version via linket senest {date}:'), { date: CW.fmtDate(request.deadline) }) : t('Skal noget rettes, så upload gerne en ny version via linket:'),
    mail.link, '',
    t('Skriv endelig til mig, hvis I har spørgsmål.'), '',
    adv.name,
  ].filter(x => x !== null).join('\n');
  const subject = subjectEdit != null ? subjectEdit : defSubject;
  const body = bodyEdit != null ? bodyEdit : defBody;
  const ok = !!reason.trim() && (!sendMail || !!body.trim());
  return { request, adv, to, label, mail, defSubject, defBody, subject, body, ok };
}

export {
  wsItemRequestedAt, wsItemsKey, wsMaterialSummary, WS_DRAFT_V, wsDraft, wsSetDraft, wsDraftCheck, wsSendRequest, wsDoSend,
  WS_MATERIAL_CATS, wsMaterialCat, wsUploadedByAdvisor, wsToggleMaterial, wsDraftBar, wsMaterialModel, wsMaterialHeading,
  wsAttachFiles, wsUnupload, wsAddCustomItem, wsDiscardDraft, wsMaterialSend, wsAskNewVersion, wsOpenAsk, wsAddAsk,
  wsRemoveAdvisorFile, wsRemoveAdvisorFiles, wsRemindMail, wsSendReminder, wsRejectMail,
};
