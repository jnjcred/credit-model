// Sagen (workspace): kundens punkter (Anmodet materiale og Materiale på sagen), deres status,
// historik og handlinger, kundens hændelser og seneste aktivitet. Flyttet uændret fra
// workspace.jsx ved migrationen til Vue; logik, der lå inde i komponenterne, er løftet ud i
// navngivne funktioner med de samme linjer (kilden står over hver). Bare globaler (t, DATA, CW)
// læses via window. obLabel (opstartens trin) kommer fra kundeportalens kode, som før.
// Funktioner med parameteren ui får skærmens tilstand som funktioner med de gamle navne.
/* global obLabel */
import { confirmRemove } from '@/services/feedback';
import { wsDay, wsDot, wsFill, wsNum, wsPlural, wsSharingText } from './format.js';
import { wsAdvisor } from './caseData.js';
import { wsItemRequestedAt } from './request.js';
import { wsRequestMore, wsScrollTo } from './actions.js';

/* ─────────────────────────────────────────────────────────────────────────
   Seneste aktivitet (fra CW.activity). Kun tekst og "Navn · dato".
   Faseskift står i trinene og gentages ikke her.
   ──────────────────────────────────────────────────────────────────────── */
function wsWhoName(who) {
  if (who === 'kunde') return (CW.request() && CW.request().to && CW.request().to.name) || (DATA.REQUEST_RECIPIENT || {}).name || t('Kunden');
  if (who === 'rådgiver') return wsAdvisor().name;
  return 'Crediwire';
}

// En opdatering uden nye punkter sendes ikke som mail; loggen siger det
function wsActivityText(e) {
  if (e.type === 'request-updated' && e.data && (e.data.noMail || !(e.data.added || []).length)) {
    const lbl = id => { const it = CW.itemById(id); return it ? t(it.label) : id; };
    const add = (e.data.added || []).map(lbl), rem = (e.data.removed || []).map(lbl);
    const parts = [add.length ? t('tilføjet') + ' ' + add.join(', ') : '', rem.length ? t('fjernet') + ' ' + rem.join(', ') : ''].filter(Boolean);
    return t('Anmodningen er ændret uden mail til kunden') + (parts.length ? ': ' + parts.join('; ') : '');
  }
  return e.text;
}

/* ─────────────────────────────────────────────────────────────────────────
   Kundens punkter: Udestående (til gennemgang og afventer kunden) og det
   godkendte under Materiale på sagen, se WSOutstandingCard og WSMaterialCard.
   Hver række har titlen på første linje og på anden linje et statusikon,
   filerne (eller en grå statustekst) og handlingerne. Listerne er sorteret
   efter leveringstidspunkt, nyeste først.
   ──────────────────────────────────────────────────────────────────────── */

const wsNeedsReview = (s) => !!s && (s.status === 'received' || s.status === 'noted');

// Kundens punkter i visningsrækkefølge: { it, s, dropped, at }. Punkter med en
// levering (eller en afvisning) efter tidspunktet, nyeste først; punkter uden
// levering nederst i anmodningens rækkefølge. Fravalgte punkter, kunden har
// sendt, står med (ikke længere påkrævet).
function wsCustomerList() {
  const request = CW.request();
  if (!request) return [];
  const st = CW.items();
  const items = CW.requestedItems();
  // Punkter, rådgiveren har trukket tilbage uden at kunden havde sendt noget, vises ikke på listen
  const dropped = (request.dropped || []).filter(id => !(request.withdrawn && request.withdrawn[id])).map(id => CW.itemById(id)).filter(it => it && !items.some(x => x.id === it.id));
  const time = (iso) => { const n = iso ? Date.parse(iso) : NaN; return isNaN(n) ? null : n; };
  const when = (s) => {
    if (!s) return null;
    if (s.status === 'rejected') return time(s.reviewedAt) || time(s.at);
    if (s.status === 'received' || s.status === 'noted' || s.status === 'approved') {
      const ts = [time(s.at)].concat((s.files || []).map(f => time(f.at))).filter(x => x != null);
      return ts.length ? Math.max.apply(null, ts) : null;
    }
    return null;
  };
  const all = items.map(it => ({ it, dropped: false })).concat(dropped.map(it => ({ it, dropped: true })))
    .map((e, i) => { const s = st[e.it.id] || null; return { ...e, s, at: when(s), i }; });
  return all.sort((a, b) => (wsNeedsReview(b.s) - wsNeedsReview(a.s)) || (a.at == null) - (b.at == null) || (b.at || 0) - (a.at || 0) || a.i - b.i);
}

// Godkend-knappen på det første punkt til gennemgang, i visningsrækkefølgen
function wsFirstToReviewSel() {
  const e = wsCustomerList().find(x => wsNeedsReview(x.s));
  return e ? '#ws-item-' + e.it.id + ' [data-act="approve"]' : null;
}

// Efter godkend/afvis bliver punktet stående med sin nye status. Fokus går til
// det næste punkt, der venter på gennemgang (efter det aktuelle i listen, ellers
// forfra), eller til overskriften for den nye fase, hvis der ikke er flere.
function wsFocusAfterReview(currentId) {
  setTimeout(() => {
    const list = wsCustomerList();
    const i = list.findIndex(e => e.it.id === currentId);
    const order = i < 0 ? list : list.slice(i + 1).concat(list.slice(0, i));
    const next = order.find(e => e.it.id !== currentId && wsNeedsReview(e.s) && document.querySelector('#ws-item-' + e.it.id + ' [data-act="approve"]'));
    if (next) CW.focusSoon('#ws-item-' + next.it.id + ' [data-act="approve"]');
    else if (CW.stage() !== 'awaiting-customer') CW.focusSoon('#ws-hero-title');
    else CW.focusSoon('#ws-outstanding-title');
  }, 60);
}

/**
 * Overblikkets to materialekort. "Anmodet materiale" (WSOutstandingCard) er det,
 * der stadig er åbent, delt efter hvem der skal handle: "Til din gennemgang"
 * (kunden har sendt, du godkender eller beder om rettelse) og "Hos kunden" (ikke
 * sendt endnu, afvist eller sendt videre til revisor/bank). "Materiale på sagen"
 * (WSMaterialCard) er det, sagen har: offentlige data til venstre (ca. 2/5) og
 * det godkendte fra kunden til højre. Et punkt står kun ét sted ad gangen: et
 * godkendt punkt flytter fra det første kort til det andet, og Fortryd flytter det
 * tilbage. Under ca. 900 px stables kolonnerne (styles.css).
 */

// Hvor et af kundens punkter står: 'review' (venter på din gennemgang),
// 'waiting' (kunden mangler at sende, har sendt det videre, eller det er
// afvist), 'optional' (valgfrit og ikke sendt), 'done' (godkendt) eller
// 'dropped' (ikke længere påkrævet)
function wsItemPlace(e) {
  if (wsNeedsReview(e.s)) return 'review';
  if (e.dropped) return 'dropped';
  const status = e.s ? e.s.status : 'pending';
  if (status === 'approved') return 'done';
  if (e.it.tag === 'Valgfri' && status === 'pending') return 'optional';
  return 'waiting';
}

/* Historik for et punkt, nyeste nederst. Hver række siger, hvem der gjorde hvad, og gemmer
   det, der var dengang: filerne (også dem, der siden er fjernet), spørgsmålene og kundens svar
   og kommentarer. Lange tekster er afkortet; hele teksten står, når man holder musen over.
   Når punktet er godkendt, står det under "Godkendt fra kunden", og historikken kan foldes ud derfra. */
function wsItemHistory(itemId) {
  const types = ['received', 'noted', 'rejected', 'approved', 'unreviewed', 'reset'];
  const adv = wsAdvisor();
  const eifo = wsFill(t('{name} ({org})'), { name: (adv.name || '').split(' ')[0], org: adv.org || 'EIFO' });
  const who = (w) => w === 'rådgiver' ? eifo : t('kunde');
  const list = CW.activity().filter(e => e.itemId === itemId && types.indexOf(e.type) >= 0);
  // Fortrudte skridt står ikke i historikken: en fortrudt godkendelse eller et fortrudt spørgsmål fjernes sammen med "fortrudt"-rækken,
  // så kun det, der stod til sidst, er med (fx den endelige Godkendt)
  let lastReviewId = null;
  const undone = {};
  list.forEach(e => {
    if ((e.type === 'approved' || e.type === 'rejected')) lastReviewId = e.id;
    else if (e.type === 'unreviewed' && lastReviewId) { undone[lastReviewId] = true; undone[e.id] = true; lastReviewId = null; }
  });
  let lastReview = null;
  return list.filter(e => !undone[e.id]).map(e => {
    const d = e.data || {};
    let label = '', names = [], quote = '', tone = '';
    if (e.type === 'received') {
      names = d.names || [];
      if (d.answer) {
        label = e.who === 'rådgiver' ? wsFill(t('Svar fra {who} på kundens vegne'), { who: eifo }) : wsFill(t('Svar fra {who}'), { who: who(e.who) });
        quote = d.answer;
      } else if (names.length) {
        label = wsFill(names.length === 1 ? t('Fil uploadet af {who}') : t('Filer uploadet af {who}'), { who: who(e.who) });
      } else label = wsFill(t('Sendt af {who}'), { who: who(e.who) });
    } else if (e.type === 'noted') {
      label = wsFill(t('Kommentar fra {who}'), { who: who(e.who) });
      quote = d.note || (d.kind === 'ikke-relevant' ? t('Ikke relevant for kunden') : d.kind === 'anden-maade' ? t('Sendt på anden måde') : t('Kunden har ingen fil'));
    } else if (e.type === 'rejected') {
      label = wsFill(t('Spørgsmål stillet af {who}'), { who: eifo }); quote = d.note || ''; tone = 'q'; lastReview = 'rejected';
    } else if (e.type === 'approved') {
      label = wsFill(t('Godkendt af {who}'), { who: eifo }); tone = 'ok'; lastReview = 'approved';
    } else if (e.type === 'unreviewed') {
      label = wsFill(lastReview === 'rejected' ? t('Spørgsmål trukket tilbage af {who}') : t('Godkendelse fortrudt af {who}'), { who: eifo }); lastReview = null;
    } else {
      // reset: en fil fjernet, eller kunden trak det sendte tilbage (ældre logrækker har ingen data)
      const removed = d.kind === 'removed' || (!d.kind && /Fil fjernet|File removed/.test(e.text || ''));
      names = d.names || [];
      label = wsFill(removed ? t('Fil fjernet af {who}') : t('Trukket tilbage af {who}'), { who: who(e.who) });
      tone = 'gone';
    }
    return { id: e.id, at: e.at, label, names, quote, tone };
  });
}

/* Seneste aktivitet (WSActivity, workspace.jsx L1396–1423): de 5 seneste hændelser, eller op
   til 30 med "Vis alle". who(e) er navnet i linjen "navn · dato"; toggleLabel er knappens tekst. */
function wsActivity(all) {
  // Beskeder står i "Dialog med kunden", og faseskift står i trinene
  const list = CW.activity().filter(e => e.type !== 'question' && e.type !== 'reply' && e.type !== 'stage').reverse();
  const shown = list.slice(0, all ? 30 : 5);
  const toggleLabel = all ? t('Vis færre') : wsFill(t('Vis alle ({n})'), { n: Math.min(list.length, 30) });
  const who = (e) => (e.data && e.data.actor) || wsWhoName(e.who);
  return { list, shown, toggleLabel, who };
}

// Kundens hændelser (WSCustomerEvents, workspace.jsx L2302–2338) som grå tekstlinjer
// [{ k, at, text }] (at: tidspunktet til title): opstarten i portalen, nej til datadeling,
// revisoren, adgangen til regnskabssystemet. null, når der ingen er.
function wsCustomerEvents() {
  const c = CW.consent();
  const revoked = !c ? CW.activity().filter(e => e.type === 'consent-revoked').slice(-1)[0] : null;
  const rows = [];
  // Kundens opstart i portalen: bruger, aftalen om datadeling og regnskabssystemet
  const ob = CW.onboarding ? CW.onboarding() : {};
  if (CW.request() && !c) {
    const step = CW.onboardingStep(ob);
    const legacy = !ob.account && (() => { try { return !!JSON.parse(localStorage.getItem('kabul:portal:nordhavn') || '{}').accepted; } catch (e) { return false; } })();
    if (!legacy && !ob.account) { /* ingen række: at kunden endnu ikke har oprettet en bruger står ikke i Anmodet materiale */ }
    else if (!legacy && step) rows.push({ k: 'ob', at: null, text: wsFill(t('Kunden er i gang med opstarten i portalen: {step} (trin {n} af {m}).'), { step: typeof obLabel === 'function' ? obLabel(step) : step, n: CW.ONBOARDING_STEPS.indexOf(step) + 1, m: CW.ONBOARDING_STEPS.length }) });
    else if (ob.agreement && ob.agreement.declined) rows.push({ k: 'ob', at: ob.agreement.at, text: wsFill(t('Kunden sagde nej til datadeling {when} og sender tallene selv.'), { when: wsDay(ob.agreement.at) }) });
    else if (ob.erp && ob.erp.waiting && !ob.sharing) rows.push({ k: 'ob', at: ob.erp.at, text: t('Kunden venter på sin revisor med regnskabssystemet og har ikke taget stilling til datadeling endnu.') });
    else if (ob.erp && ob.erp.waiting) rows.push({ k: 'ob', at: ob.erp.at, text: wsFill(t('Kunden har sagt ja til datadeling ({sharing}), men venter på sin revisor med at forbinde regnskabssystemet.'), { sharing: wsSharingText(ob.sharing) }) });
    else if (ob.sharing && !(ob.erp && ob.erp.system)) rows.push({ k: 'ob', at: ob.sharing.at, text: wsFill(t('Kunden har sagt ja til datadeling ({sharing}), men har ikke forbundet regnskabssystemet endnu.'), { sharing: wsSharingText(ob.sharing) }) });
  }
  if (c) {
    const scope = (c.scope || []).map(s => t(s).toLowerCase()).join(', ');
    const until = c.until === 'løbende' ? t('løbende') : c.mode === 'until' ? wsFill(t('tal til og med {date}'), { date: CW.fmtDate(c.until + 'T12:00:00') }) : c.until ? wsFill(t('gælder til {date}'), { date: CW.fmtDate(c.until) }) : '';
    rows.push({ k: 'consent', at: c.at, text: wsFill(t('Læseadgang til {system}'), { system: c.system || 'e-conomic' })
      + (scope ? ' (' + scope + ')' : '') + (until ? ', ' + until : '') + ' · ' + wsFill(t('givet {date}'), { date: wsDay(c.at) })
      + (c.by && c.by.name ? ' ' + wsFill(t('af {name} (revisor eller rådgiver) på kundens vegne'), { name: c.by.name }) : '') });
  } else if (revoked) {
    rows.push({ k: 'revoked', at: revoked.at, text: wsDot(revoked.who === 'system'
      ? wsFill(t('Adgangen til regnskabssystemet blev lukket ved afgørelsen {when}.'), { when: wsDay(revoked.at) })
      : wsFill(t('Kunden trak adgangen til regnskabssystemet tilbage {when}.'), { when: wsDay(revoked.at) })) });
  }
  if (!rows.length) return null;
  return rows;
}

// Kundens punkter som liste (WSItemList, workspace.jsx L2364–2376): en streg, hvor punkterne
// skifter sted (groupStart), og låst, når sagen er låst, eller punktet ikke længere er påkrævet
// og ikke venter på gennemgang. [{ e, groupStart, locked }]
function wsItemListRows(entries, locked) {
  return entries.map((e, i) => ({
    e,
    groupStart: i > 0 && wsItemPlace(entries[i - 1]) !== wsItemPlace(e),
    locked: locked || (e.dropped && !wsNeedsReview(e.s)),
  }));
}

// Anmodet materiale (WSOutstandingCard, workspace.jsx L2378–2437): null uden anmodning.
// Grupperne Til din gennemgang (review), Hos kunden (waiting) og Valgfrit materiale (optional),
// massegodkendelsen (approveAll; står kun, når sagen ikke er låst, og mindst 2 punkter har en fil)
// og den tomme tekst (empty).
function wsOutstanding(locked) {
  const request = CW.request();
  if (!request) return null;
  const list = wsCustomerList();
  const of = (place) => list.filter(e => wsItemPlace(e) === place);
  const review = of('review'), waiting = of('waiting'), optional = of('optional');
  const n = review.length + waiting.length;

  // Massegodkendelse gælder kun anmodede punkter med fil og står ved gruppen
  const withFile = review.filter(e => !e.dropped && e.s.status === 'received' && (e.s.files || []).length > 0);
  const approveAll = () => {
    const ids = withFile.map(e => e.it.id).filter(id => (CW.itemState(id) || {}).status === 'received');
    if (!ids.length) return;
    ids.forEach(id => CW.approve(id));
    CW.toast(wsPlural(ids.length, t('1 punkt godkendt og flyttet til Materiale på sagen'), t('{n} punkter godkendt og flyttet til Materiale på sagen')), { action: { label: t('Fortryd'), onClick: () => ids.forEach(id => CW.unreview(id)) } });
    wsFocusAfterReview(null);
  };

  const empty = !list.length ? t('Der er ikke valgt noget materiale.')
    : n > 0 ? null
    : (optional.length ? t('Intet påkrævet udestående.') : t('Intet udestående.')) + (list.some(e => wsItemPlace(e) === 'done') ? ' ' + t('Det godkendte står under Materiale på sagen.') : '');
  const approveAllShown = !locked && withFile.length >= 2;
  return { request, list, of, review, waiting, optional, n, withFile, approveAll, empty, approveAllShown };
}

// Materiale på sagen (WSMaterialCard, workspace.jsx L2439–2503): det godkendte fra kunden
// (godkendt først, så det, der ikke længere er påkrævet) og bankens og EIFO's dokumenter pr. kilde.
// receivedText(kilde): "modtaget <seneste dato>" (L2476).
function wsMaterialCard() {
  const request = CW.request();
  // Godkendt først (nyeste øverst), så det, der ikke længere er påkrævet
  const kept = wsCustomerList().filter(e => { const p = wsItemPlace(e); return p === 'done' || p === 'dropped'; })
    .sort((a, b) => (wsItemPlace(a) === 'dropped') - (wsItemPlace(b) === 'dropped'));
  const approved = kept.filter(e => wsItemPlace(e) === 'done').length;
  // Det, kunden har sendt, og som venter på gennemgang, står under Anmodet materiale
  // (og Dokumenter) og kommer først her, når det er godkendt
  // Bankens og EIFO's egne dokumenter (ansøgning, sikkerheder, rating) står under
  // Dokumenter fra start; her får de en plads, så de to lister dækker det samme
  const caseDocs = (DATA.DOCS || []).filter(d => d.origin === 'uploaded' && !d.superseded && d.type !== 'Crediwire-eksport'
    && ['Kundeupload', 'e-conomic'].indexOf(d.sourceLabel) < 0);
  const bySource = caseDocs.reduce((m, d) => { (m[d.sourceLabel] = m[d.sourceLabel] || []).push(d); return m; }, {});
  const receivedText = (src) => wsFill(t('modtaget {date}'), { date: wsDay(bySource[src].map(d => d.date).filter(Boolean).sort().slice(-1)[0]) });
  return { request, kept, approved, caseDocs, bySource, receivedText };
}

// Historik for et punkt (WSItemHistory, workspace.jsx L2761–2801): null under 2 rækker.
// fileUrl(navn, gone): linket til filen, så længe den ligger på punktet; ellers intet.
function wsItemHistoryModel(itemId) {
  const rows = wsItemHistory(itemId);
  if (rows.length < 2) return null;
  const files = (CW.itemState(itemId) || {}).files || [];
  // Filen kan hentes, så længe den ligger på punktet; en fjernet fil står kun med navnet
  const fileUrl = (name, gone) => {
    const f = !gone && files.find(x => x.name === name);
    const url = f && CW.fileUrl(f.id);
    return url;
  };
  return { rows, files, fileUrl };
}

// Kundens svar "salg fordelt på lande" (OutstandingItem, workspace.jsx L3025–3048): null uden
// svar. pct(v) formaterer en procent (på dansk med mellemrum før %); ok: summen afrundet er 100
// (ellers står I alt med rødt).
function wsCountrySplit(s) {
  if (!(s && s.answers && Array.isArray(s.answers.countries) && s.answers.countries.length > 0)) return null;
  const list = s.answers.countries.filter(c => c && (c.name || c.code));
  const sum = list.reduce((n, c) => n + (Number(c.pct) || 0), 0);
  const pct = (v) => wsNum(v, 1) + (window.CW_LANG === 'en' ? '%' : ' %');
  return { list, sum, pct, ok: Math.round(sum) === 100 };
}

// Ét af kundens punkter (OutstandingItem, workspace.jsx L2803–3074) uden React: status, filer,
// linjen under titlen (meta, lead, tipParts), statusikonet, handlingerne og hvornår de står.
// it, s, locked, dropped og request som før; rejecting: "Stil spørgsmål" er åben.
// ui: setRejecting(bool) og onRemind() (åbner påmindelsen).
// JSX er erstattet af data: icon = { kind, label, title } (shared/ItemStatusIcon.vue),
// lead = { label, text } (grå ledetekst og evt. sort tekst; før meta, adskilt med " · ").
function wsOutstandingItem(it, s, locked, dropped, request, rejecting, ui) {
  const { setRejecting, onRemind } = ui;
  const status = s ? s.status : 'pending';
  const label = t(it.label);
  const inote = CW.internalNote(it.id);
  const files = (s && s.files) || [];
  const byAdvisor = s && s.by === 'rådgiver';
  const adv = wsAdvisor();
  const del = status === 'delegated' && s ? (s.delegate || {}) : null;

  const addFiles = (list) => {
    if (!list || !list.length) return;
    const had = files.length > 0 && status !== 'rejected';
    const wasApproved = status === 'approved';
    const metas = CW.putFiles(list, { by: 'rådgiver', itemId: it.id });
    CW.markReceived(it.id, { by: 'rådgiver', files: metas });
    if (wasApproved) {
      CW.toast(wsFill(wsPlural(metas.length, t('1 fil tilføjet til "{item}". Punktet er stadig godkendt.'), t('{n} filer tilføjet til "{item}". Punktet er stadig godkendt.')), { item: label }));
      return;
    }
    CW.toast(wsFill(had
      ? wsPlural(metas.length, t('1 fil tilføjet til "{item}". Godkend punktet, når du har set det igennem.'), t('{n} filer tilføjet til "{item}". Godkend punktet, når du har set det igennem.'))
      : wsPlural(metas.length, t('1 fil uploadet til "{item}". Godkend punktet, når du har set det igennem.'), t('{n} filer uploadet til "{item}". Godkend punktet, når du har set det igennem.')), { item: label }));
    CW.focusSoon('#ws-item-' + it.id + ' [data-act="approve"]');
  };
  const remind = () => {
    if (!request) { CW.toast(t('Anmodningen er ikke sendt endnu'), { tone: 'warn' }); return; }
    onRemind && onRemind();
  };
  // Rådgiveren har alligevel ikke brug for punktet. Hun vælger selv, om kunden får en mail om det.
  const withdraw = () => {
    CW.setSelection({ ...CW.selection(), [it.id]: false });
    wsRequestMore(() => { setTimeout(() => wsScrollTo('ws-material'), 80); CW.focusSoon('#ws-material-title'); });
  };
  // Punktet bliver i listen med et grønt flueben; beskeden har Fortryd
  const approve = () => {
    const cur = CW.itemState(it.id);
    if (!cur || cur.status === 'approved') return;
    CW.approve(it.id);
    CW.toast(wsFill(t('"{item}" er godkendt og flyttet til Materiale på sagen.'), { item: label }), { action: { label: t('Fortryd'), onClick: () => CW.unreview(it.id) } });
    wsFocusAfterReview(it.id);
  };
  // Fortryd godkendelse kan selv fortrydes fra beskeden
  const unapprove = () => {
    CW.unreview(it.id);
    CW.toast(wsFill(t('Godkendelsen af "{item}" er fortrudt. Punktet venter igen på din gennemgang.'), { item: label }), {
      action: { label: t('Fortryd'), onClick: () => CW.approve(it.id) },
    });
    CW.focusSoon('#ws-item-' + it.id + ' [data-act="approve"]');
  };
  const doReject = ({ reason, sendMail }) => {
    CW.reject(it.id, reason);
    setRejecting(false);
    if (sendMail) CW.log('rejection-mail', wsFill(t('Mail med spørgsmål sendt til {to}: {item}'), { to: (request && request.to && (request.to.name || request.to.email)) || t('kunden'), item: label }), { who: 'rådgiver', itemId: it.id });
    CW.toast(sendMail ? wsFill(t('Spørgsmålet om "{item}" er sendt, og kunden har fået en mail.'), { item: label }) : wsFill(t('Spørgsmålet om "{item}" er sendt. Der er ikke sendt en mail.'), { item: label }), { tone: 'info' });
    wsFocusAfterReview(it.id);
  };

  // Linje 2: statusikon, indhold (filer eller tekst) og én grå meta, og til
  // højre handlingerne. Med filer står hver fil på sin egen linje med sin egen
  // meta (hvem og hvornår); ikon og handlinger står kun på den første.
  // Klokkeslættet står i title.
  const review = status === 'received' || status === 'noted';
  const optional = it.tag === 'Valgfri';
  const quiet = dropped && !review;            // ikke længere påkrævet: grå, uden handlinger
  const showFiles = (status === 'received' || status === 'approved' || status === 'rejected' || (quiet && files.length > 0)) && files.length > 0;
  const parts = [];
  const tipParts = [];
  let lead = null;                             // tekst før metaen (i stedet for filer)
  let at = null;
  if (showFiles) {
    at = s && s.at;
    if (status === 'rejected' && s && s.reviewedAt) parts.push(t('Spørgsmål stillet') + ' ' + wsDay(s.reviewedAt));
  } else if (review || status === 'approved') {
    at = s.at;
    const who = s.viaPreview ? wsFill(t('tilføjet i forhåndsvisning af {name}'), { name: adv.name }) : byAdvisor ? t('uploadet af dig') : t('modtaget');
    if (status !== 'approved' || !s.reviewedAt) parts.push(who + ' ' + wsDay(s.at));
    if (status === 'noted') lead = { label: s.noteKind === 'anden-maade' ? t('Sendt på anden måde:') : s.noteKind === 'ikke-relevant' ? t('Ikke relevant for kunden:') : t('Kunden har ingen fil:'), text: s.note || (s.answer ? '' : t('ingen forklaring')) };
    else if (!files.length && !s.answers) lead = { label: t('Markeret som sendt uden fil') };
  } else if (status === 'rejected' && s) {
    at = s.reviewedAt;
    parts.push(t('Spørgsmål stillet') + ' ' + wsDay(s.reviewedAt));
  } else if (status === 'delegated' && del) {
    at = del.at || (s && s.at);
    // Kunden har sendt punktet videre: en ventetilstand som "Afventer kunden"
    const role = del.role ? String(del.role).toLowerCase() : '';
    parts.push(role === 'revisor' ? t('Afventer revisor') : role === 'bank' ? t('Afventer kundens bank') : t('Afventer kundens rådgiver'));
    if (del.name) parts.push(del.name);
    if (at) parts.push(wsFill(t('sendt videre {date}'), { date: wsDay(at) }));
  } else if (!quiet) {
    at = request ? wsItemRequestedAt(request, it.id) : null;
    if (optional) parts.push(t('Valgfri'), t('ikke modtaget'));
    else {
      // Gruppen hedder allerede "Hos kunden"; rækken siger, hvornår der blev spurgt
      // Anmodet og frist står som tooltip på titlen, ikke som en linje under den
      tipParts.push(at ? wsFill(t('Anmodet {date}'), { date: wsDay(at) }) : t('Afventer kunden'));
      if (request && request.deadline) tipParts.push(t('frist') + ' ' + wsDay(request.deadline));
    }
  }
  if (quiet) parts.push(t('Ikke længere påkrævet'));
  // Din note til kunden (ved afvisning) følger punktet, også når det er sendt videre
  if ((status === 'rejected' || status === 'delegated' || status === 'approved') && s && s.reviewNote) parts.push(t('Din note:') + ' ' + s.reviewNote);
  if (optional && (review || status === 'approved')) parts.push(t('valgfri'));
  if (dropped) parts.push(t('fravalgt i en opdatering'));
  const meta = parts.join(' · ');

  // Hvem sendte filen, og hvornår (filens egne felter, ellers punktets)
  const fileWhen = (f) => f.at || (s && s.at);
  const fileMeta = (f, i) => {
    const by = f.by || (s && s.by);
    const when = fileWhen(f);
    const preview = f.viaPreview || (s && s.viaPreview && by !== 'rådgiver' && (!f.at || !s.at || Date.parse(f.at) >= Date.parse(s.at) - 2000));
    const txt = wsFill(preview ? t('tilføjet i forhåndsvisning {date}') : by === 'rådgiver' ? t('uploadet af dig {date}') : t('fra kunden {date}'), { date: wsDay(when) });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  };

  // Statusikonet (14 px): grøn = modtaget/godkendt, rød = afvist, blå = venter
  // Status som ikon på overskriften: grøn = godkendt, blå = modtaget og venter på din gennemgang, rød = afvist, grå = venter på kunden
  const icon = quiet ? { kind: 'quiet' }
    : status === 'approved' ? { kind: 'approved', label: t('Godkendt'), title: s && s.reviewedAt ? t('Godkendt') + ' · ' + wsFill(t('{date} af {name}'), { date: wsDay(s.reviewedAt), name: s.reviewedBy || wsAdvisor().name }) : undefined }
    : review ? { kind: 'received', label: t('Venter på din gennemgang') }
    : status === 'rejected' ? { kind: 'question' }
    : { kind: 'pending' };

  // Handlingerne på rækken (L2956–2977): de står ikke, når sagen er låst, mens "Stil spørgsmål"
  // er åben, eller når punktet ikke længere er påkrævet (showActions). can: hvilke knapper står.
  const showActions = !locked && !rejecting && !quiet;
  const can = {
    upload: (status === 'noted' || status === 'pending' || status === 'rejected' || status === 'delegated'),
    withdraw: (status === 'pending' || status === 'rejected' || status === 'delegated'),
    remind: (status === 'pending' || status === 'rejected') && !optional,
    undoQuestion: status === 'rejected',
    approveAnyway: status === 'rejected' && files.length > 0,
    review: review,
    unapprove: status === 'approved',
  };
  // Fortryd spørgsmålet (L2965): spørgsmålet fjernes fra kundens side efter en bekræftelse
  const undoQuestion = () => CW.confirm({ title: t('Er du sikker?'), text: t('Spørgsmålet fjernes fra kundens side, og punktet står igen til din gennemgang.'), confirmLabel: t('Fortryd spørgsmålet') }).then(r => { if (r && r.ok) CW.unreview(it.id); });
  // En fil kan fjernes (L2989), efter en bekræftelse (L2998)
  const canRemove = (f) => !locked && (files.length > 1 || status === 'approved') && CW.canRemoveFile(it.id, f.id, 'rådgiver');
  const removeFile = (f) => confirmRemove(f.name, wsFill(files.length === 1 ? t('Filen fjernes fra "{item}", og punktet står igen som ikke modtaget.') : t('Filen fjernes fra "{item}".'), { item: label })).then(ok => { if (ok) CW.removeFile(it.id, f.id, 'rådgiver'); });
  // "+" (Tilføj en fil mere) står efter den sidste fil (L3004)
  const addFileAt = (i) => i === files.length - 1 && !locked && !rejecting && !quiet && (status === 'received' || status === 'approved');
  // Leverandørens bemærkning (L3049–3055) og kundens svar på dit spørgsmål (L3057–3063)
  const supplierNote = s && s.note && status !== 'noted' ? { label: s.noteKind === 'system' ? t('Kilde:') : byAdvisor && !s.viaPreview ? t('Din bemærkning ved upload:') : t('Kundens bemærkning:'), text: s.noteKind === 'system' ? t(s.note) : s.note } : null;
  const answer = s && s.answer && review ? { question: s.question, answer: s.answer } : null;
  // Den interne note (L3065–3068); kunden ser den ikke
  const saveNote = (txt) => CW.setInternalNote(it.id, txt, adv.name);
  const deleteNote = () => CW.setInternalNote(it.id, '', adv.name);
  return {
    status, label, inote, files, byAdvisor, adv, del, addFiles, remind, withdraw, approve, unapprove, doReject,
    review, optional, quiet, showFiles, parts, tipParts, lead, at, meta, fileWhen, fileMeta, icon,
    showActions, can, undoQuestion, canRemove, removeFile, addFileAt, supplierNote, answer, saveNote, deleteNote,
    countries: wsCountrySplit(s),
  };
}

export {
  wsWhoName, wsActivityText, wsNeedsReview, wsCustomerList, wsFirstToReviewSel, wsFocusAfterReview, wsItemPlace, wsItemHistory,
  wsActivity, wsCustomerEvents, wsItemListRows, wsOutstanding, wsMaterialCard, wsItemHistoryModel, wsCountrySplit, wsOutstandingItem,
};
