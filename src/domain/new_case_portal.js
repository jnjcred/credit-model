// Ny sag-guiden og kundeportalen (src/new_case_portal.jsx): hjælperne uden UI er flyttet ordret
// hertil ved migrationen til Vue. Kun denne indledning, sektionsoverskrifterne, kommentaren til
// pvDaysAgo, window-tildelingen og eksporten nederst er nye. Skærmene ligger i src/views/portal/.
//
// bootstrap.js importerer filen på new_case_portal.jsx' gamle plads (efter workspace, før
// portal_onboarding). Det eneste, der sker ved indlæsning, er PORTAL_CONTACT, som læser
// window.DATA; derfor importeres data.js her. Alt andet læser CW, DATA og t, når det kaldes.
//
// new_case_portal.jsx var et klassisk script, så dets funktioner og konstanter var globale. De
// navne, andre filer læser, står stadig på window (se nederst); Vue-koden importerer eksporten.
//
// Ikke flyttet: React-komponenterne (nu .vue-filer under src/views/portal/), ncHidden (nu den
// globale klasse .sr-only), PORTAL_CSS (antdv-komponenterne), React-hooken usePortalDraft
// (kladden gemmes løbende; hører til portalens upload- og forbind-sider) og window.NewCaseModal,
// window.CustomerPortal og CustomerPortal.supportsPreview.
import '@/domain/data';

/* ── Ny sag-guiden ──────────────────────────────────────────────────────── */

// Udfylder {navn}-pladsholdere efter oversættelse: ncFill(t('Frist {date}'), { date })
function ncFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
}
const ncCvrDigits = (s) => String(s || '').replace(/\D/g, '');
// Navn uden selskabsform, så "Nordhavn Composite A/S" og "... ApS" er samme virksomhed
const ncCompanyKey = (s) => String(s || '').toLowerCase().replace(/\s+(a\/s|aps|i\/s|p\/s|ivs)$/, '').trim();
const ncFirstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const NC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * "4.500.000", "4,500,000", "4,5 mio.", "4.5m", "DKK 4500000" -> 4500000. Alt andet -> null.
 * Punktum og komma efterfulgt af grupper på tre cifre er tusindtalsskilletegn (dansk
 * og engelsk skrivemåde); ellers er et enkelt punktum eller komma decimaltegnet.
 */
function ncParseAmount(s) {
  let x = String(s || '').trim().toLowerCase().replace(/^(dkk|kr\.?)/, '').replace(/(dkk|kr\.?)$/, '').replace(/\s/g, '');
  let mult = 1;
  const m = x.match(/^(.*?)(mio\.?|m)$/);
  if (m) { x = m[1]; mult = 1e6; }
  if (!m && /^\d{1,3}([.,])\d{3}(\1\d{3})*$/.test(x)) x = x.replace(/[.,]/g, '');
  else if (/^\d+[.,]\d+$/.test(x)) x = x.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(x)) return null;
  const v = parseFloat(x) * mult;
  return v > 0 ? v : null;
}
const ncFmtDKK = (v) => 'DKK ' + Math.round(v).toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK');

// Virksomheder demoen kender: sagens egen (DATA.COMPANY), dem fra sagslisten og
// porteføljens kunder (DATA.PORTFOLIO). Guiden slår kun op blandt dem.
function ncKnownCompanies() {
  const C = DATA.COMPANY;
  const list = [{ key: ncCompanyKey(C.name), name: C.name, cvr: C.cvr, primary: true }];
  const add = (name, cvr, extra) => {
    const k = ncCompanyKey(name);
    const hit = list.find(x => x.key === k);
    if (hit) Object.assign(hit, extra || {}, { name: hit.name, cvr: hit.cvr || cvr });
    else list.push(Object.assign({ key: k, name, cvr, primary: false }, extra || {}));
  };
  (DATA.CASES || []).forEach(c => add(c.name, c.cvr));
  (DATA.PORTFOLIO || []).forEach(p => add(p.name, p.cvr, { portfolio: true, dept: p.dept, branche: p.branche }));
  return list;
}
// Sagstype ud fra en værdi ('grow'), et dansk navn ('Vækstlån') eller et oversat navn
function ncTypeFrom(x) {
  const s = String(x || '').trim().toLowerCase();
  if (!s) return null;
  return NC_CASE_TYPES.find(o => o.v === s || o.l.toLowerCase() === s || t(o.l).toLowerCase() === s) || null;
}
function ncOpenCasesFor(company) {
  const k = ncCompanyKey(company.name);
  return (DATA.CASES || []).filter(c => ncCompanyKey(c.name) === k && !c.archived && !['Approved', 'Declined'].includes(c.status));
}

// Sagstyper. basis: hvilket beløb der spørges om. Ved kautioner er det bankens
// facilitet (EIFO kautionerer for en andel af den); ved lån er det lånebeløbet.
const NC_CASE_TYPES = [
  { v: 'export', l: 'Eksportkaution', basis: 'facility', d: 'EIFO kautionerer for en del af bankens facilitet til eksport.' },
  { v: 'op', l: 'Driftskredit', basis: 'facility', d: 'EIFO kautionerer for en del af bankens driftskredit.' },
  { v: 'grow', l: 'Vækstlån', basis: 'loan', d: 'EIFO låner direkte til virksomheden.' },
  { v: 'inv', l: 'Investeringslån', basis: 'loan', d: 'EIFO låner til en konkret investering, fx maskiner eller byggeri.' },
];
const NC_GUARANTEE_SHARE = 0.8; // EIFO's typiske andel af bankens facilitet ved kaution

// Næste ledige sagsnummer i år (sagslisten og sager oprettet i demoen)
function ncNextCaseNr() {
  const year = new Date().getFullYear();
  let max = 0;
  (DATA.CASES || []).concat(CW.demoCases()).forEach(c => {
    const m = /^(\d{4})-(\d{4})$/.exec(String(c.caseNr || ''));
    if (m && +m[1] === year && +m[2] > max) max = +m[2];
  });
  return year + '-' + String(max + 1).padStart(4, '0');
}
// Et personligt link til kundens side for en ny sag (vises kun i mailens forhåndsvisning)
function ncRequestLink(name) {
  const slug = ncCompanyKey(name).replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean).map(w => w.slice(0, 2)).join('').slice(0, 4) || 'nc';
  return 'crediwire.app/c/' + slug + '-' + Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6);
}

// Hvordan kunden leverer et punkt i portalen
const portalKind = (id) => id === 'm-interim' ? 'connect' : id === 'm-trade' ? 'trade' : 'upload';

/* ── Kundeportalen ──────────────────────────────────────────────────────── */

// Portalens egen hukommelse (hvor kunden var, accepterede vilkår og genkendt
// enhed). Ligger i localStorage under kabul:, så den overlever genindlæsning
// og sprogskift og nulstilles sammen med resten af demoen.
const PORTAL_KEY = 'kabul:portal:nordhavn';
const PORTAL_SESSION_KEY = 'kabul:portal-session';
const PORTAL_DEFAULTS = { screen: 'hub', itemId: null, accepted: false, trustedUntil: null };
function portalMem() {
  try { return Object.assign({}, PORTAL_DEFAULTS, JSON.parse(localStorage.getItem(PORTAL_KEY) || '{}')); }
  catch (e) { return Object.assign({}, PORTAL_DEFAULTS); }
}
function setPortalMem(patch) {
  try { localStorage.setItem(PORTAL_KEY, JSON.stringify(Object.assign(portalMem(), patch))); } catch (e) {}
}
function portalTrusted() {
  const m = portalMem();
  if (m.trustedUntil && m.trustedUntil > new Date().toISOString()) return true;
  try { return sessionStorage.getItem(PORTAL_SESSION_KEY) === '1'; } catch (e) { return false; }
}

// Rådgiveren på sagen. Samme kilde og reserve som kundens statusside og sagen.
const PORTAL_CONTACT = (() => {
  const co = (window.DATA && DATA.COMPANY) || {};
  const a = Object.assign({ name: 'Mette Larsen', title: 'Kreditrådgiver', org: 'EIFO', phone: '+45 35 29 86 42', email: 'mette.larsen@eifo.dk' },
    (window.DATA && DATA.ADVISOR) || (co.advisor && typeof co.advisor === 'object' ? co.advisor : {}));
  a.initials = a.initials || a.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  a.first = ncFirstName(a.name);
  return a;
})();

// Punktets tilstand set fra kunden: pending | received | noted | delegated | approved | rejected
function portalStatus(id) {
  const s = CW.itemState(id);
  return s ? s.status : 'pending';
}
function portalRecipient() {
  const req = CW.request();
  const r = DATA.REQUEST_RECIPIENT || {};
  return { name: (req && req.to && req.to.name) || r.name || '', email: (req && req.to && req.to.email) || r.email || '' };
}
// "sp@nordhavncomposite.dk" -> "s…@nordhavncomposite.dk"
function portalMaskEmail(email) {
  const at = String(email || '').indexOf('@');
  return at > 0 ? email[0] + '…' + email.slice(at) : email;
}
const portalYmd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

function downloadFiles(files) {
  const ok = (files || []).filter(f => CW.fileUrl(f.id));
  if (!ok.length) { CW.notInDemo(t('Download')); return; }
  ok.forEach(f => {
    const a = document.createElement('a');
    a.href = CW.fileUrl(f.id); a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
  });
}

// Til "Udfyld alt (demo)": sagens egne demofiler med indhold (CW.demoUploadFile:
// periodetal, budget, forudsætninger, lån, ejerbog og kontrakt). Øvrige punkter
// får en lille, rigtig PDF-fil med én linje tekst, så filen kan åbnes fra
// Dokumenter som alle andre uploads.
function demoPdf(name, title) {
  const ascii = String(title).replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/Æ/g, 'Ae').replace(/Ø/g, 'Oe').replace(/Å/g, 'Aa').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '');
  const stream = 'BT /F1 16 Tf 72 770 Td (' + ascii + ') Tj 0 -24 Td /F1 10 Tf (Demodokument fra kundeportalen) Tj ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offs = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xref = pdf.length;
  pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  return new File([pdf], name, { type: 'application/pdf' });
}
const DEMO_FILE_NAMES = { 'm-annual': 'Intern_aarsrapport_2025.pdf', 'm-pitch': 'Virksomhedspraesentation.pdf', 'm-security': 'Pantebreve_og_kautioner.pdf', 'm-ownership': 'Ejeraftale.pdf', 'm-fx': 'Valutapolitik_og_terminsforretninger.pdf', 'm-group': 'Koncernsammenstilling_2025.pdf', 'm-tech': 'SaaS_noegletal_2026.pdf', 'm-lowcase': 'Foelsomhedsanalyse_budget.pdf', 'm-protocol': 'Revisionsprotokollat_2025.pdf', 'm-capital': 'Kapitalplan_og_stoetteerklaering.pdf', 'm-bizplan': 'Forretningsplan.pdf', 'm-agri': 'Effektivitetsnoegletal.pdf', 'm-pub-cvr': 'Vedtaegter.pdf', 'm-pub-market': 'Marked_og_konkurrenter.pdf', 'm-pub-product': 'Produktbeskrivelse.pdf' };
// Filnavn til et punkt uden fast navn (fx en årsrapport for et bestemt år eller materiale, rådgiveren selv har skrevet ind)
function demoFileName(it) {
  if (DEMO_FILE_NAMES[it.id]) return DEMO_FILE_NAMES[it.id];
  const base = String(t(it.label)).replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/Æ/g, 'Ae').replace(/Ø/g, 'Oe').replace(/Å/g, 'Aa')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return (base || 'Dokument') + '.pdf';
}

/* Demo: rådgiveren spiller kunden og uploader sagens demofil til ét punkt ad gangen
   (samme filer som "Udfyld alt (demo)"). Står kun i demobjælken nederst. */
const DEMO_COUNTRIES = [{ code: 'DK', name: 'Danmark', pct: 39 }, { code: 'DE', name: 'Tyskland', pct: 26 }, { code: 'GB', name: 'Storbritannien', pct: 20 }, { code: 'US', name: 'USA', pct: 15 }];
function portalDemoFileFor(it) {
  return CW.demoUploadFile(it.id) || demoPdf(demoFileName(it), t(it.label) + ' - ' + DATA.COMPANY.name);
}
function portalDemoUploadOne(it) {
  if (it.form === 'countries') {
    CW.markReceived(it.id, { by: 'kunde', files: [], note: '', answers: { countries: DEMO_COUNTRIES } });
  } else {
    const file = portalDemoFileFor(it);
    CW.markReceived(it.id, { by: 'kunde', files: CW.putFiles([file], { by: 'kunde', itemId: it.id }), note: '' });
  }
  CW.toast(ncFill(t('{item} er sendt (demo)'), { item: t(it.label) }));
}

/* ── Regnskabssystemet (demo): samtykke, hentning og saldobalance ─────────── */

const ERP_SOURCES = [
  { id: 'ec', name: 'e-conomic', accounts: 412, agreement: '1284573' }, // demo-aftalenummer
  { id: 'bi', name: 'Billy', accounts: 186 },
  { id: 'di', name: 'Dinero', accounts: 203 },
  { id: 'md', name: 'Microsoft Dynamics', accounts: 538 },
  { id: 'xe', name: 'Xena', accounts: 241 },
  { id: 'un', name: 'Uniconta', accounts: 297 },
];
// Perioden for "år til dato": januar til og med seneste afsluttede måned, eller til
// og med den måned, kunden har valgt ved begrænset datadeling (end: 'yyyy-mm-dd')
function portalPeriodEnd(end) {
  if (end && /^\d{4}-\d{2}/.test(end)) return { y: Number(end.slice(0, 4)), m: Number(end.slice(5, 7)) - 1 };
  const d = new Date();
  let y = d.getFullYear(), m = d.getMonth() - 1;
  if (m < 0) { m = 11; y--; }
  return { y, m };
}
function portalPeriod(lang, end) {
  const { y, m } = portalPeriodEnd(end);
  const M = (lang || window.CW_LANG) === 'en'
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return (m === 0 ? M[0] : M[0] + '-' + M[m]) + ' ' + y;
}
// En rigtig saldobalance som CSV (semikolon, dansk Excel). Tallene passer til sagens
// niveau (omsætning ca. 29 mio. for årets første otte måneder), og balancen stemmer.
function portalTrialBalanceCsv(src, end) {
  const rows = [
    ['1010', 'Salg af varer, eksport', -21480000], ['1020', 'Salg af varer, Danmark', -7760000],
    ['1310', 'Vareforbrug', 15890000], ['1410', 'Fragt og told', 1120000],
    ['2210', 'Lønninger', 7940000], ['2250', 'Pension', 690000],
    ['2800', 'Lokaleomkostninger', 820000], ['2900', 'Administrationsomkostninger', 610000],
    ['3010', 'Afskrivninger', 1180000], ['3510', 'Renteudgifter, bank', 410000], ['3520', 'Renteudgifter, anpartshaverlån', 14000],
    ['5510', 'Grunde og bygninger', 9800000], ['5610', 'Produktionsanlæg og maskiner', 11200000],
    ['5810', 'Varelager', 8450000], ['5910', 'Tilgodehavender fra salg', 9920000], ['6010', 'Bank', 1140000],
    ['6810', 'Selskabskapital', -1000000],
    ['7010', 'Gæld til kreditinstitutter', -12600000], ['7110', 'Kassekredit', -3950000],
    ['7210', 'Leverandører af varer og tjenesteydelser', -5870000], ['7310', 'Anden gæld', -2310000],
    ['7410', 'Anpartshaverlån', -500000],
  ];
  const rest = rows.reduce((a, r) => a + r[2], 0);
  rows.splice(17, 0, ['6820', 'Overført resultat', -rest]);
  const now = new Date();
  const when = portalYmd(now) + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const lines = [
    'Saldobalance;' + portalPeriod('da', end),
    'Virksomhed;' + DATA.COMPANY.name + ' (CVR ' + DATA.COMPANY.cvr + ')',
    'Kilde;' + src + ', hentet ' + when + ' med læseadgang via Crediwire',
    '',
    'Konto;Kontonavn;Saldo (DKK)',
  ].concat(rows.map(r => r[0] + ';' + r[1] + ';' + r[2])).concat(['', 'I alt;;' + rows.reduce((a, r) => a + r[2], 0)]);
  const name = 'Saldobalance_' + portalPeriod('da', end).replace(' ', '_') + '_' + src.replace(/\s+/g, '-') + '.csv';
  return new File(['﻿' + lines.join('\r\n') + '\r\n'], name, { type: 'text/csv' });
}
// Debitorlisten fra regnskabssystemet. Summen er kontoen Tilgodehavender fra salg
// (5910) i saldobalancen, og de tre største kunder passer med sagens faktaark.
function portalDebtorCsv(src, end) {
  const rows = [
    ['GE Vernova', 3770000, 410000, 38], ['Vestas Wind Systems', 1640000, 0, 0], ['Siemens Gamesa', 940000, 120000, 21],
    ['Hanse Rotor GmbH', 820000, 0, 0], ['Baltic Blade Service AB', 610000, 95000, 47], ['Fyns Kompositværksted ApS', 340000, 0, 0],
    ['Øvrige kunder (24)', 1800000, 260000, 64],
  ];
  const now = new Date();
  const when = portalYmd(now) + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const lines = [
    'Debitorliste;' + portalPeriod('da', end),
    'Virksomhed;' + DATA.COMPANY.name + ' (CVR ' + DATA.COMPANY.cvr + ')',
    'Kilde;' + src + ', hentet ' + when + ' med læseadgang via Crediwire',
    '',
    'Kunde;Saldo (DKK);Heraf forfaldent (DKK);Ældste forfald (dage)',
  ].concat(rows.map(r => r.join(';'))).concat(['', 'I alt;' + rows.reduce((a, r) => a + r[1], 0) + ';' + rows.reduce((a, r) => a + r[2], 0) + ';']);
  const name = 'Debitorliste_' + portalPeriod('da', end).replace(' ', '_') + '_' + src.replace(/\s+/g, '-') + '.csv';
  return new File(['﻿' + lines.join('\r\n') + '\r\n'], name, { type: 'text/csv' });
}
/**
 * Kunden har givet læseadgang i regnskabssystemet. sharing er kundens valg fra
 * opstarten: { mode: 'ongoing' } (løbende) eller { mode: 'until', dataUntil } (tal
 * til og med en dato). Returnerer false, hvis det blev afvist (forhåndsvisning).
 */
function portalConsentNow(srcName, sharing, company) {
  const ongoing = !sharing || sharing.mode === 'ongoing';
  // Givet af en revisor eller rådgiver på kundens vegne: det står i samtykket og i historikken
  const by = company && company.advisor && company.person ? { name: company.person, role: 'helper' } : null;
  return CW.setConsent({ system: srcName, scope: ['kontoplan', 'saldobalance', 'periodetal', 'debitordata'],
    mode: ongoing ? 'ongoing' : 'until', until: ongoing ? 'løbende' : sharing.dataUntil, dataUntil: ongoing ? null : sharing.dataUntil, by });
}
/**
 * Hentningen: saldobalance og debitorliste som filer. Er Periodetal med i
 * anmodningen, markeres punktet som sendt med kilden som note (ikke som kundens
 * bemærkning). Ellers lægges filerne som andre filer fra kunden.
 */
function portalConnectNow(srcName, sharing) {
  const end = sharing && sharing.mode === 'until' ? sharing.dataUntil : null;
  const itemId = CW.requestedItems().some(it => it.id === 'm-interim') ? 'm-interim' : null;
  const metas = CW.putFiles([portalTrialBalanceCsv(srcName, end), portalDebtorCsv(srcName, end)], { by: 'kunde', itemId });
  if (!metas.length) return null;
  if (itemId) CW.markReceived(itemId, { by: 'kunde', files: metas, note: 'Hentet fra ' + srcName, noteKind: 'system' });
  else CW.addLooseUploads(metas);
  return metas[0];
}
const portalConsentUntil = (c) => !c ? '' : c.until === 'løbende'
  ? t('Løbende adgang, indtil I trækker den tilbage.')
  : c.mode === 'until'
    ? ncFill(t('EIFO har tal til og med {date} og henter ikke nyere tal. Adgangen lukker, når sagen er afgjort.'), { date: CW.fmtDate(c.until + 'T12:00:00') })
    : ncFill(t('Adgangen lukker efter kreditbeslutningen og senest {date}.'), { date: CW.fmtDate(c.until + 'T12:00:00') });

// Kundeside og Kundeflow: den valgte rolle (huskes i browseren). 'kunde' slår forhåndsvisningens spærre fra
function portalFlowRole() {
  try { return localStorage.getItem('kabul:flow-role') === 'kunde' ? 'kunde' : 'rådgiver'; } catch (e) { return 'rådgiver'; }
}

// Kunden kan altid trække adgangen til regnskabssystemet tilbage, også når sagen er lukket
function portalRevoke(consent) {
  if (!consent) return Promise.resolve(false);
  return CW.confirm({
    title: t('Træk adgangen tilbage?'),
    text: ncFill(t('EIFO kan ikke længere hente tal fra {src}. De tal, EIFO allerede har hentet, bliver i sagen.'), { src: consent.system }),
    confirmLabel: t('Træk adgangen tilbage'), danger: true,
  }).then(r => {
    if (!r.ok) return false;
    CW.setConsent(null);
    CW.toast(ncFill(t('Adgangen til {src} er trukket tilbage. {adv} kan se det i sagen.'), { src: consent.system, adv: PORTAL_CONTACT.first }));
    return true;
  });
}

// Kundesidens statuskort (PortalPvObStatus): "Sidst sendt i dag / i går / for {n} dage siden"
function pvDaysAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  if (days <= 0) return t('i dag');
  if (days === 1) return t('i går');
  return ncFill(t('for {n} dage siden'), { n: days });
}

/* Sagens linje i portalens topbjælke (efter bekræftelse): sagsnummer, produkt og
   beløb (samme som rådgiverens sagshoved) og den ansvarlige rådgiver. */
function portalCaseMeta() {
  const co = (window.DATA && DATA.COMPANY) || {};
  const facility = [co.caseType, co.amount].filter(Boolean).join(', ');
  return [
    co.caseNr ? t('Sagsnr.') + ' ' + co.caseNr : null,
    facility ? { text: facility, title: co.amountNote || '' } : null,
    t('Ansvarlig') + ': ' + PORTAL_CONTACT.name,
  ].filter(Boolean);
}

// Det, EIFO selv har hentet: årsrapporterne fra CVR (sagens dokumentregister)
function portalAutoDocs() {
  const years = ((window.DATA && DATA.DOCS) || []).filter(d => d.type === 'Årsrapport' && d.origin === 'public' && !d.superseded)
    .map(d => String(d.year)).filter(y => /^\d{4}$/.test(y)).sort();
  return Array.from(new Set(years));
}

// Antal hele måneder i "år til dato" (samme periode som portalPeriod)
function portalMonths(end) {
  return portalPeriodEnd(end).m + 1;
}

// Navne, som andre filer læser som globale (før migrationen delte de klassiske scripts navnerum):
//   portalFlowRole   sagens Kundeside og Kundeflow (src/domain/workspace/actions.js)
//   PORTAL_CONTACT   memo_handoff (rådgiveren i vejledningen) og portal_onboarding
//   ncFill, NC_EMAIL_RE, portalRecipient, portalMaskEmail, ERP_SOURCES, portalPeriod,
//   portalMonths, portalConsentNow, portalConnectNow   portal_onboarding (kundens opstart)
Object.assign(window, {
  ncFill, NC_EMAIL_RE, PORTAL_CONTACT, portalRecipient, portalMaskEmail, ERP_SOURCES, portalPeriod, portalMonths,
  portalConsentNow, portalConnectNow, portalFlowRole,
});

// Modul-eksport til Vue-komponenterne
export {
  ncFill, ncCvrDigits, ncCompanyKey, ncFirstName, NC_EMAIL_RE, ncParseAmount, ncFmtDKK, ncKnownCompanies, ncTypeFrom,
  ncOpenCasesFor, NC_CASE_TYPES, NC_GUARANTEE_SHARE, ncNextCaseNr, ncRequestLink, portalKind,
  PORTAL_KEY, PORTAL_SESSION_KEY, PORTAL_DEFAULTS, portalMem, setPortalMem, portalTrusted, PORTAL_CONTACT,
  portalStatus, portalRecipient, portalMaskEmail, portalYmd, downloadFiles,
  demoPdf, DEMO_FILE_NAMES, demoFileName, DEMO_COUNTRIES, portalDemoFileFor, portalDemoUploadOne,
  ERP_SOURCES, portalPeriodEnd, portalPeriod, portalTrialBalanceCsv, portalDebtorCsv, portalConsentNow, portalConnectNow,
  portalConsentUntil, portalFlowRole, portalRevoke, pvDaysAgo, portalCaseMeta, portalAutoDocs, portalMonths,
};
