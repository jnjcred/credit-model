// Sagen (workspace): de offentlige kilder (CVR med årsrapporterne, brancheopslag og bløde
// signaler), dagen de blev hentet, og emnerne, rådgiveren kan spørge kunden om. Flyttet uændret fra
// workspace.jsx ved migrationen til Vue. Bare globaler (t, DATA, CW) læses via window.
// NB: kilden Brancheopslag i AUTO_SOURCES har en blød bindestreg (U+00AD) mellem "Branche" og
// "opslag". Den er en del af ordbogens nøgle (src/i18n/dict/workspace.js) og skal stå uændret.
import { wsDay, wsFill } from './format.js';

/* ─────────────────────────────────────────────────────────────────────────
   Virksomhed og facilitet: sagens rammer (produkt og beløb, som de blev
   indtastet, da sagen blev oprettet) og stamdata fra CVR i ét kort. De
   offentlige kilder står i kortet Materiale på sagen (WSMaterialCard).
   ──────────────────────────────────────────────────────────────────────── */
const AUTO_SOURCES = [
  { src: "CVR-registret", what: "Selskab, vedtægter, bestyrelse", reports: true },
  // docs: Crediwires egne eksporter (financials.jsx, CW_EXPORT_DOCS), som kan hentes ligesom årsrapporterne
  // ask: katalogets punkt, som "Spørg kunden" stiller spørgsmålet til
  { src: "Branche­opslag", what: "Markedsdata", ask: 'm-pub-market', docs: [{ name: 'Produkt_marked_og_branche.pdf', label: 'Produkt, marked og branche' }] },
  { src: "Bløde signaler", what: "Trustpilot, hjemmeside, presse, virksomhedsbeskrivelser", ask: 'm-pub-product', docs: [{ name: 'Trustpilot.pdf', label: 'Trustpilot' }] },
];

// Dagen de offentlige data blev hentet (sagens tidslinje i data.js), samme dato som stamdata
function wsPublicDataDate() {
  try { return DATA.fmt.longDate(DATA.caseTimeline(CW.LIVE_CASE_ID).publicDataAt) || DATA.COMPANY.masterDataUpdated || ''; } catch (e) { return DATA.COMPANY.masterDataUpdated || ''; }
}

// "hentet 30. sep.": dagen de offentlige data blev hentet, kort form
function wsPublicDataDay() {
  try { const at = DATA.caseTimeline(CW.LIVE_CASE_ID).publicDataAt; if (at) return wsDay(at); } catch (e) {}
  return wsPublicDataDate();
}

// Emner fra de offentlige data, som rådgiveren kan spørge kunden om (gemmes på dansk)
function wsPublicTopics() {
  const reports = ((DATA.FINANCIALS && DATA.FINANCIALS.years) || []).filter(y => /^\d{4}$/.test(y));
  return reports.map(y => 'Årsrapport ' + y).concat(['CVR-registret'], AUTO_SOURCES.filter(x => x.docs).reduce((a, x) => a.concat(x.docs.map(o => o.label)), []));
}

// De tre offentlige kilder med deres dokumenter (WSPublicSources, workspace.jsx L1463–1515):
// årsrapporterne fra CVR eller kildens egne eksporter. fetched: "hentet <dato>". sources: pr. kilde
// { key, x (rækken i AUTO_SOURCES), items }; items er tom, når kilden ingen dokumenter har (så står
// der ingen liste). Pr. dokument: { key, label, ask (katalogets punkt til "Spørg kunden"), doc,
// url (kan hentes direkte; ellers CW.downloadDoc(doc.name), hvis doc findes), removed (slettet
// under Dokumenter: navnet står overstreget med "slettet", uden link) }.
function wsPublicSources() {
  const reportDoc = (y) => (window.CASE_DOCS || []).find(d => d.type === 'Årsrapport' && String(d.year) === String(y));
  const reports = ((DATA.FINANCIALS && DATA.FINANCIALS.years) || []).filter(y => /^\d{4}$/.test(y));
  const fetched = wsFill(t('hentet {date}'), { date: wsPublicDataDay() });
  const sources = AUTO_SOURCES.map((x, i) => {
    // Årsrapporterne fra CVR, eller kildens egne dokumenter (eksporterne)
    const items = x.reports
      ? reports.map(y => ({ key: y, label: t('Årsrapport') + ' ' + y, ask: 'm-annual-' + y, doc: reportDoc(y) }))
      : (x.docs || []).map(o => ({ key: o.name, label: t(o.label), ask: x.ask, doc: (window.CASE_DOCS || []).concat(window.CW_EXPORT_DOCS || []).find(d => d.name === o.name) }));
    // Pr. dokument (L1485–1488): linket, og om dokumentet er slettet under Dokumenter
    return { key: i, x, items: items.map(it => {
      const d = it.doc;
      const url = d && d.fileId ? CW.fileUrl(d.fileId) : null;
      return Object.assign({}, it, { url, removed: !!(d && CW.isDocRemoved(d.name)) });
    }) };
  });
  return { reports, fetched, sources };
}

export { AUTO_SOURCES, wsPublicDataDate, wsPublicDataDay, wsPublicTopics, wsPublicSources };
