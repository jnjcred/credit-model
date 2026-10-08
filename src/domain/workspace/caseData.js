// Sagen (workspace): sagens data, rådgiveren, ejeren, faktaarket og kildedokumenterne.
// Flyttet uændret fra workspace.jsx ved migrationen til Vue. Bare globaler (t, DATA, CW)
// læses via window, som i resten af src/domain.
import { wsRef } from './format.js';

// Rådgiveren på sagen. DATA.ADVISOR vinder, hvis data.js har den.
function wsAdvisor() {
  return Object.assign({
    name: DATA.COMPANY.responsibleFull || 'Mette Larsen', initials: 'ML', title: 'Kreditrådgiver', org: 'EIFO',
    phone: '+45 35 29 86 42', email: 'mette.larsen@eifo.dk',
  }, DATA.ADVISOR || {});
}

// Sagen ud fra id: først sagslisten, så sager oprettet i Ny sag-guiden.
// Et ukendt id får en tom stub, så det aldrig åbner Nordhavn.
function wsCaseData(caseId) {
  const id = Number(caseId);
  const c = DATA.CASES.find(x => x.id === id);
  // Sager fra Ny sag-guiden: guidens egne data (anmodning, beløb, facilitet) vinder
  const d = typeof CW.demoCase === 'function' ? CW.demoCase(id) : (CW.demoCases() || []).find(x => Number(x.id) === id);
  if (c) return d ? Object.assign({}, c, d, { id, demo: true, caseNr: d.caseNr || c.caseNr, createdAt: d.createdAt || c.createdAt, status: c.status }) : c;
  if (d) {
    return Object.assign({ status: 'Draft', caseNr: '2026-' + String(d.id).padStart(4, '0'), responsible: d.responsible || d.owner || DATA.ME, type: d.product || d.type || '' }, d, { id, demo: true });
  }
  return { id, name: t('Ukendt sag'), caseNr: String(caseId), status: 'Draft', unknown: true };
}

// Kun sag 1 (Nordhavn, 2026-0184) har levende data i demoen
function wsCaseHasData(c) { return !!c && !c.unknown && CW.isLiveCase(c.id); }

// ── Ejer ────────────────────────────────────────────────────────────────────
function wsOwner(caseData) {
  if (typeof DATA.caseOwner === 'function') {
    try { const o = DATA.caseOwner(caseData.id); if (o) return o; } catch (e) {}
  }
  return CW.owners()[caseData.id] || caseData.responsible || DATA.ME;
}
function wsTeam() {
  const s = [];
  [DATA.ME].concat(DATA.CASES.map(c => c.responsible)).forEach(n => { if (n && s.indexOf(n) < 0) s.push(n); });
  return s;
}

// Sagens faktaark (src/case_facts.js). Tåler, at det mangler eller er
// overskrevet af noget, der ikke er et objekt.
function wsFacts() {
  const F = window.CASE_FACTS;
  return F && typeof F === 'object' && !Array.isArray(F) ? F : {};
}

// Tekst fra faktaarket på det aktive sprog: obj.textEn på engelsk, hvis feltet
// findes, ellers obj.text. Faktaarket har selv de engelske felter (suffiks En).
function wsFact(obj, key) {
  if (!obj) return '';
  const en = window.CW_LANG === 'en' ? obj[key + 'En'] : null;
  const v = en != null && en !== '' ? en : obj[key];
  return v == null ? '' : v;
}

// Åbn et kildedokument under Dokumenter. Dokumentfanen læser
// sessionStorage 'kabul:open-doc' (og lytter på 'cw-open-doc'), når den findes.
function wsDocName(doc) {
  const d = (window.CASE_DOCS || []).find(x => x.id === doc || x.name === doc);
  return d ? d.name : String(doc || '');
}

function wsCaseDeadline(caseData) { return (caseData && caseData.deadline) || DATA.COMPANY.deadlineISO || null; }

// Kildelinket (WSSourceLink, workspace.jsx L1362–1373): null, når kildevisningen er slået fra
// (window.CW_SOURCE_VIEW) eller kilden mangler; ellers dokumentets navn og knappens tekst
// "<dokument> · <henvisning>". Knappen er src/views/workspace/shared/SourceLink.vue.
function wsSourceLink(source) {
  if (window.CW_SOURCE_VIEW !== true || !source || !source.doc) return null;
  const name = wsDocName(source.doc);
  const label = name + (source.ref ? ' · ' + wsRef(source.ref) : '');
  return { name, label };
}

export { wsAdvisor, wsCaseData, wsCaseHasData, wsOwner, wsTeam, wsFacts, wsFact, wsDocName, wsCaseDeadline, wsSourceLink };
