// Overblikkets tre materialekort (designet "Anmodet materiale v5"): Til din gennemgang, Afventer
// kunden og Materiale på sagen. Kortene viser kundens punkter som tabeller med rækker, der kan foldes
// ud. Punkternes status, handlinger og tekster står stadig i wsOutstandingItem (items.js); her står
// det, tabellerne lægger oven på: kolonnen Indhold og historikken med anmodningen og påmindelserne.
// Bare globaler (t, CW) læses via window, som i resten af src/domain/workspace.
import { wsFill } from './format.js';
import { wsAdvisor } from './caseData.js';
import { wsItemHistory } from './items.js';
import { wsItemRequestedAt } from './request.js';

// Kolonnen Indhold: filnavnet, "n filer" eller en grå tekst, når der ikke er en fil.
// place: 'review', 'waiting' eller 'done' (tabellen, rækken står i).
function wsItemContent(s, place) {
  const files = (s && s.files) || [];
  if (files.length === 1) return { text: files[0].name };
  if (files.length > 1) return { text: wsFill(t('{n} filer'), { n: files.length }) };
  if (s && (s.answer || s.answers)) return { text: t('Svar fra kunden') };
  return { text: place === 'done' ? t('Sendt uden fil') : t('Ingen fil'), muted: true };
}

// "Mette (EIFO)": sådan står rådgiveren i historikken (som i wsItemHistory)
function wsHistoryWho() {
  const adv = wsAdvisor();
  return wsFill(t('{name} ({org})'), { name: (adv.name || '').split(' ')[0], org: adv.org || 'EIFO' });
}

// Hvornår blev punktet påmindet? Påmindelser om hele anmodningen (ingen punkter) gælder alle punkter,
// som i CW.lastReminder.
function wsItemReminders(itemId) {
  return CW.activity().filter(e => e.type === 'reminder' && (!e.data || !(e.data.items || []).length || e.data.items.indexOf(itemId) >= 0));
}

// Historikken i en udfoldet række, ældst øverst: anmodningen og påmindelserne foran kundens og dine
// skridt (wsItemHistory). Rækkerne: { id, at, label, names, quote, tone }. fileUrl(navn, gone): linket
// til filen, så længe den ligger på punktet (som wsItemHistoryModel).
function wsItemTimeline(itemId) {
  const who = wsHistoryWho();
  const rows = [];
  const req = wsItemRequestedAt(CW.request(), itemId);
  if (req) rows.push({ id: 'req-' + itemId, at: req, label: wsFill(t('Anmodet af {who}'), { who }), names: [], quote: '', tone: '' });
  wsItemReminders(itemId).forEach(e => rows.push({ id: e.id, at: e.at, label: wsFill(t('Påmindet af {who}'), { who }), names: [], quote: '', tone: '' }));
  const time = (iso) => { const n = Date.parse(iso || ''); return isNaN(n) ? 0 : n; };
  const all = rows.concat(wsItemHistory(itemId)).sort((a, b) => time(a.at) - time(b.at));
  const files = (CW.itemState(itemId) || {}).files || [];
  const fileUrl = (name, gone) => {
    const f = !gone && files.find(x => x.name === name);
    return (f && CW.fileUrl(f.id)) || null;
  };
  return { rows: all, fileUrl };
}

export { wsItemContent, wsItemReminders, wsItemTimeline };
