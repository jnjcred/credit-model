// Dataanmodninger: reglerne for listen over materialeanmodninger (flyttet uændret fra
// data_requests.jsx ved migrationen til Vue; skærmen er src/views/requests/DataRequestsView.vue).
// Eneste ændring: sagen åbnes med openCase fra useNavigation (før window.cwOpenCase i shell.jsx;
// samme funktion, flyttet ved migrationen).
//
// Dataanmodninger - alle materialeanmodninger på tværs af sager.
// Rækkerne kommer fra DATA.requestRows(): Nordhavn følger den fælles
// sagstilstand (window.CW), de øvrige er demodata med datoer regnet fra i dag.
// Frister: "Kundens svarfrist" er anmodningens frist; "Sagsfrist" er sagens
// egen frist og er den samme som i sagshovedet. Rækken viser svarfristen;
// begge står i detaljerne.
// Ingen knap her ændrer sagens fase. Faseskift sker kun i sagen via
// CW.requestStage; herfra åbnes sagen bare det rette sted.
// En sag, der er afslået, indstillet eller afgjort, er lukket for kunden
// (status 'closed', CW.customerLock): ingen Påmind, Vælg materiale eller
// Anmod om mere, kun "Åbn sag" og på en afslået sag "Genoptag sag".

import { openCase } from '@/composables/useNavigation';

const STUCK_HELP = 'Sidder fast: anmodningen er sendt, men kunden har ikke leveret noget i 3 hverdage.';
// Kort betegnelse for en lukket sag
const LOCK_LABEL = { declined: 'Sagen er afslået', submitted: 'Indstillet', decided: 'Sagen er afgjort' };
const WAITING_HELP = 'Anmodningen er sendt, men kunden har ikke leveret noget endnu.';
const CLOSED_HELP = 'Sagen er afslået, indstillet eller afgjort. Kunden kan ikke levere mere på den.';

function reqClock(iso) {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function reqNames(list) {
  const names = list.map(r => r.contact || r.company).filter(Boolean);
  return names.length <= 1 ? (names[0] || '') : names.slice(0, -1).join(', ') + ' ' + t('og') + ' ' + names[names.length - 1];
}
function reqFill(s, map) { return Object.keys(map).reduce((a, k) => a.split('{' + k + '}').join(map[k]), s); }
// Danske datoer slutter med punktum ("24. sep."): ingen dobbelt punktum i en sætning
function reqDot(s) { return s.replace(/\.\.$/, '.'); }

// Påmindelse: Nordhavn skriver i sagens historik (CW.remind), de øvrige i en
// lokal historik. Rækken viser bagefter "påmindet <dato>".
// Vagt mod dobbelte påmindelser: er kunden allerede påmindet i dag, spørger
// vi først (én række), eller springer dem over (samlet påmindelse).
function sendReminders(rows) {
  let list = rows.filter(r => r && r.status !== 'closed');
  if (!list.length) return;
  const today = list.filter(r => DATA.reminderToday(r.caseId));
  const send = (targets, skipped) => {
    targets.forEach(r => DATA.remindCase(r.caseId, DATA.ADVISOR.name));
    let msg = t('Påmindelse sendt til') + ' ' + reqNames(targets) + '. ' + t('Den står nu på rækken og i sagens historik.');
    if (skipped && skipped.length) msg += ' ' + reqNames(skipped) + ' ' + t('er allerede påmindet i dag og fik ingen ny.');
    CW.toast(msg);
  };
  if (!today.length) { send(list); return; }
  if (today.length < list.length) { send(list.filter(r => today.indexOf(r) < 0), today); return; }
  // Alle er påmindet i dag: spørg, før der sendes igen
  const last = DATA.reminderToday(today[0].caseId);
  const title = today.length === 1
    ? t('Påmindet i dag kl. {tid}. Send igen?').replace('{tid}', reqClock(last.at))
    : t('Alle er påmindet i dag. Send igen?');
  CW.confirm({
    title,
    text: (today.length === 1
      ? t('{navn} fik en påmindelse i dag kl. {tid} fra {af}.').replace('{navn}', reqNames(today)).replace('{tid}', reqClock(last.at)).replace('{af}', last.by)
      : reqNames(today) + ' ' + t('har alle fået en påmindelse i dag.'))
      + ' ' + t('En ny påmindelse sendes med det samme og står i sagens historik.'),
    confirmLabel: t('Send igen'),
  }).then(res => { if (res && res.ok) send(today); });
}

// "Kundeside": samme forhåndsvisning (overlay) som i sagshovedet. Mangler den
// (workspace ikke indlæst), åbnes sagen, hvor knappen findes.
function openCustomerPreview(go) {
  if (typeof window.CW_OPEN_CUSTOMER_PREVIEW === 'function') { window.CW_OPEN_CUSTOMER_PREVIEW(); return; }
  if (go) go('workspace:1');
}

// Åbn sagen det rette sted uden at ændre fasen
function openRequestCase(r, target) {
  if (r.caseId === 1 && target === 'ws-material') {
    try { sessionStorage.setItem('kabul:focus-material', '1'); } catch (e) {}
  }
  openCase(r.caseId, r.caseId === 1 ? target : null);
}

function reminderLine(r) {
  if (!r.lastReminder) return null;
  return t('Påmindet {dato} af {navn}').replace('{dato}', DATA.fmt.shortDate(r.lastReminder.at)).replace('{navn}', r.lastReminder.by);
}

// Rækkens ene grå linje: "2 af 8 modtaget · sidder fast siden 24. sep. · påmindet 28. sep."
function requestMeta(r) {
  const F = DATA.fmt;
  const closed = r.status === 'closed';
  const parts = [];
  if (r.status === 'draft') parts.push(t('Ikke sendt') + ' - ' + r.total + ' ' + (r.total === 1 ? t('punkt') : t('punkter')));
  else parts.push(reqFill(t('{n} af {m} modtaget'), { n: r.received, m: r.total }));
  if (closed) parts.push(t(LOCK_LABEL[r.closed] || 'Lukket'));
  else if (r.status === 'stuck') parts.push(t('sidder fast siden') + ' ' + F.shortDate(r.lastActivityAt || r.sentAt));
  else if (r.status === 'waiting') parts.push(t('sendt') + ' ' + F.shortDate(r.sentAt));
  else if (r.status === 'active' && r.lastActivityAt) parts.push(t('seneste aktivitet') + ' ' + F.ago(r.lastActivityAt));
  if (r.lastReminder && !closed) parts.push(t('påmindet') + ' ' + F.shortDate(r.lastReminder.at));
  return parts.join(' - ');
}

// Tidslinje for anmodningen. Nordhavn læser sagens historik (CW.activity),
// de øvrige bygges af demodata og den lokale påmindelseshistorik.
const REQ_EVENT_TYPES = ['request-sent', 'request-updated', 'received', 'noted', 'delegated', 'reminder', 'customer-submitted', 'question', 'reply', 'consent'];
function requestEvents(r) {
  if (r.caseId === 1) {
    return CW.activity().filter(e => REQ_EVENT_TYPES.indexOf(e.type) >= 0).slice(-8).reverse().map(e => ({
      t: e.type === 'reminder' ? t('Påmindelse sendt af') + ' ' + ((e.data && e.data.by) || DATA.ADVISOR.name) : e.text, raw: true, at: e.at,
    }));
  }
  const list = [];
  if (r.sentAt) list.push({ at: r.sentAt, t: 'Anmodning sendt' });
  if (r.openedAt) list.push({ at: r.openedAt, t: 'Åbnet af modtager' });
  if (r.lastActivityAt && r.lastActivityAt !== r.sentAt) list.push({ at: r.lastActivityAt, t: r.lastAction });
  DATA.remindersFor(r.caseId).forEach(x => list.push({ at: x.at, t: t('Påmindelse sendt af') + ' ' + x.by, raw: true }));
  return list.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

// Modul-eksport til Vue-komponenterne (src/views/requests)
export {
  STUCK_HELP, LOCK_LABEL, WAITING_HELP, CLOSED_HELP,
  reqClock, reqNames, reqFill, reqDot,
  sendReminders, openCustomerPreview, openRequestCase, reminderLine, requestMeta,
  REQ_EVENT_TYPES, requestEvents,
};
