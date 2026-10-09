// Ny sag-guiden og kundeportalen (src/new_case_portal.jsx): hjælperne uden UI er flyttet ordret
// hertil ved migrationen til Vue. Kun denne indledning, sektionsoverskrifterne, kommentaren til
// pvDaysAgo, window-tildelingen og eksporten nederst er nye. Skærmene ligger i src/views/portal/.
// Efter migrationen (8. oktober 2026) er sektionen "Demo: kundens datakilder til Regnskab" tilføjet
// (den bruger csCanUndo fra customer.js og finInternalLoose fra finSources.js, som intet gør ved
// indlæsning), og saldobalancen, debitorlisten og demofilernes sider (CW_DEMO_PAGES) bygges af
// e-conomic-saldobalancen i kontomappingen (window.CW_MAP), så de passer med Regnskab.
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
import { csCanUndo } from '@/domain/customer';
import { finInternalLoose } from '@/domain/financials/finSources';

/* ── Ny sag-guiden──────────────────────────────────────────────────────── */

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
  { v: 'inv', l: 'Investeringslån', basis: 'loan', d: 'EIFO låner til en konkret investering, f.eks. maskiner eller byggeri.' },
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
// Filnavn til et punkt uden fast navn (f.eks. en årsrapport for et bestemt år eller materiale, rådgiveren selv har skrevet ind)
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
/* Regnskab v5: saldobalancen fra regnskabssystemet med kundens egne konti og tal (kontomappingens
   ark, window.CW_MAP), så filen, ERP-kolonnerne i Regnskab og den uploadede PDF har de samme tal.
   end: 'YYYY-MM-DD' (kunden deler til og med) eller null. Drift: periodens bevægelse; status: saldo
   ultimo. e-conomics fortegn (debet plus). → [[konto, navn, beløb i kr.], …] eller null. */
function portalTrialBalanceRows(end) {
  const M = window.CW_MAP;
  if (!M || !M.ready()) return null;
  const until = end ? String(end).slice(0, 7) : null;
  const months = M.months().map(m => m.key).filter(k => !until || k <= until);
  if (!months.length) return null;
  const period = { months };
  return M.accounts().filter(a => a.type === 'Drift' || a.type === 'Status')
    .map(a => [String(a.nr), a.name, Math.round(M.accountValue(a, period))])
    .filter(r => r[2] !== 0);
}
function portalTrialBalanceCsv(src, end) {
  const live = portalTrialBalanceRows(end);
  const rows = live || [
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
  if (!live) {
    const rest = rows.reduce((a, r) => a + r[2], 0);
    rows.splice(17, 0, ['6820', 'Overført resultat', -rest]);
  }
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
// Debitorlisten fra regnskabssystemet. Summen er kontoen Tilgodehavender fra salg i saldobalancen
// (Regnskab v5: kontoen med debitorerne i kontomappingen, så listen passer med saldobalancen), og de tre
// største kunder passer med sagens faktaark. Ingen debitor er forfalden over 60 dage (periodetallenes noter).
function portalDebtorCsv(src, end) {
  let rows = [
    ['GE Vernova', 3770000, 410000, 38], ['Vestas Wind Systems', 1640000, 0, 0], ['Siemens Gamesa', 940000, 120000, 21],
    ['Hanse Rotor GmbH', 820000, 0, 0], ['Baltic Blade Service AB', 610000, 95000, 47], ['Fyns Kompositværksted ApS', 340000, 0, 0],
    ['Øvrige kunder (24)', 1800000, 260000, 56],
  ];
  const tb = portalTrialBalanceRows(end);
  const M = window.CW_MAP;
  const debtors = tb && M ? tb.filter(r => M.defaultCat(Number(r[0])) === 'r_trade').reduce((a, r) => a + r[2], 0) : 0;
  if (debtors > 0) {
    const f = debtors / rows.reduce((a, r) => a + r[1], 0);
    rows = rows.map(r => [r[0], Math.round(r[1] * f / 1000) * 1000, Math.round(r[2] * f / 1000) * 1000, r[3]]);
    rows[rows.length - 1][1] += debtors - rows.reduce((a, r) => a + r[1], 0);
  }
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

/* ── Regnskab v5: demofilernes sider, bygget af sagens data ──────────────────
   CW.demoUploadFile (case_state.js) læser dem som window.CW_DEMO_PAGES: [{ ref, title, body }] til
   PDF'en (Courier, højst 106 tegn pr. linje). */
// Beløb med punktum som tusindtalsskiller: kr. med øre (dec) eller hele tal (t.kr.)
function portalAmount(v, dec) {
  const n = Math.round(Math.abs(v) * 100) / 100;
  const [i, d] = n.toFixed(2).split('.');
  return (v < 0 && n !== 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + d : '');
}
const portalPadR = (s, w) => (s.length > w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
const portalPadL = (s, w) => ' '.repeat(Math.max(0, w - s.length)) + s;

/* Saldobalancen, som kunden har skrevet den ud af e-conomic som PDF: de samme konti, overskrifter og
   sumlinjer som ERP-kilden (kontomappingens ark), så tallene passer med Regnskab. Konti uden
   bevægelse og saldo er udeladt, som i e-conomics udskrift. → sider eller null (arket ikke hentet). */
function portalTrialBalancePages() {
  const M = window.CW_MAP;
  if (!M || !M.ready() || !M.months().length) return null;
  const keys = M.months().map(m => m.key);
  const period = { months: keys };
  const first = keys[0], last = keys[keys.length - 1];
  const lastDay = new Date(Number(last.slice(0, 4)), Number(last.slice(5, 7)), 0).getDate();
  const primoDate = '01-' + first.slice(5, 7) + '-' + first.slice(0, 4);
  const ultimoDate = String(lastDay).padStart(2, '0') + '-' + last.slice(5, 7) + '-' + last.slice(0, 4);
  const accounts = M.accounts();
  const real = accounts.filter(a => a.type === 'Drift' || a.type === 'Status');
  const val = (a) => {
    const saldo = M.accountValue(a, period);
    const primo = a.type === 'Status' ? a.primo || 0 : 0;
    return { primo, mov: saldo - primo, saldo };
  };
  const sumOf = (a) => real.filter(x => x.nr >= a.from && x.nr <= a.to).map(val)
    .reduce((s, v) => ({ primo: s.primo + v.primo, mov: s.mov + v.mov, saldo: s.saldo + v.saldo }), { primo: 0, mov: 0, saldo: 0 });
  // Resultatopgørelsen er alt før balancens første overskrift (overskrifterne lige før den første statuskonto)
  let split = accounts.findIndex(a => a.type === 'Status');
  if (split < 0) split = accounts.length;
  while (split > 0 && accounts[split - 1].type === 'Overskrift') split--;
  const NW = 42, VW = 18;
  const lines = (list, cols) => {
    const out = [];
    list.forEach((a, i) => {
      if (a.type === 'Overskrift') { if (i > 0) out.push(''); out.push(portalPadR(String(a.nr), 6) + '  ' + a.name); return; }
      const v = a.type === 'Sum' ? sumOf(a) : val(a);
      if (a.type !== 'Sum' && !v.primo && !v.mov) return;
      // Sumlinjen står under en streg i hver beløbskolonne
      if (a.type === 'Sum') out.push(' '.repeat(8 + NW) + cols.map(() => portalPadL('-'.repeat(VW - 2), VW)).join(''));
      out.push(portalPadR(String(a.nr), 6) + '  ' + portalPadR(a.name, NW) + cols.map(k => portalPadL(portalAmount(v[k], true), VW)).join(''));
    });
    return out;
  };
  const head = [
    DATA.COMPANY.name + '  -  CVR ' + DATA.COMPANY.cvr,
    // Udskriftens dato og aftale er arkets (eksporteret 14-09-2026) og demoens e-conomic-aftale
    'Udskrevet fra e-conomic 14-09-2026  -  Aftale ' + ERP_SOURCES[0].agreement + '  -  Beløb i DKK',
    'Fortegn som i e-conomic: debet er plus, kredit er minus.',
    '',
  ];
  const total = real.map(val).reduce((s, v) => s + v.saldo, 0);
  const pl = head.concat([
    portalPadR('Konto', 6) + '  ' + portalPadR('Kontonavn', NW) + portalPadL('Periode', VW),
    ' '.repeat(8 + NW) + portalPadL(portalPeriod('da', last), VW),
    '',
  ]).concat(lines(accounts.slice(0, split), ['saldo']));
  const bs = head.concat([
    portalPadR('Konto', 6) + '  ' + portalPadR('Kontonavn', NW) + portalPadL('Primo', VW) + portalPadL('Bevægelse', VW) + portalPadL('Saldo', VW),
    ' '.repeat(8 + NW) + portalPadL(primoDate, VW) + portalPadL(portalPeriod('da', last), VW) + portalPadL(ultimoDate, VW),
    '',
  ]).concat(lines(accounts.slice(split), ['primo', 'mov', 'saldo'])).concat([
    '',
    Math.abs(total) < 0.5 ? 'Kontrol: debet og kredit stemmer (summen af alle drifts- og statuskonti er 0,00).'
      : 'Kontrol: summen af alle drifts- og statuskonti er ' + portalAmount(total, true) + ' (debet og kredit stemmer ikke).',
  ]);
  return [
    { ref: 'Resultatopgørelse', title: 'Driftskonti ' + primoDate + ' til ' + ultimoDate, body: pl.join('\n') },
    { ref: 'Balance', title: 'Statuskonti pr. ' + ultimoDate, body: bs.join('\n') },
  ];
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
    CW.toast(ncFill(t('Adgangen til {src} er trukket tilbage. {adv} kan se det i sagen.'), { src: consent.system, adv: 'EIFO' }));
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
   beløb (samme som rådgiverens sagshoved). Den ansvarlige rådgiver vises ikke her. */
function portalCaseMeta() {
  const co = (window.DATA && DATA.COMPANY) || {};
  const facility = [co.caseType, co.amount].filter(Boolean).join(', ');
  return [
    co.caseNr ? t('Sagsnr.') + ' ' + co.caseNr : null,
    facility ? { text: facility, title: co.amountNote || '' } : null,
  ].filter(Boolean);
}

// Det, EIFO selv har hentet: årsrapporterne fra CVR (sagens dokumentregister)
function portalAutoDocs() {
  const years = ((window.DATA && DATA.DOCS) || []).filter(d => d.type === 'Årsrapport' && d.origin === 'public' && !d.superseded)
    .map(d => String(d.year)).filter(y => /^\d{4}$/.test(y)).sort();
  return Array.from(new Set(years));
}

/* Regnskabsåret, som kunden angiver ved budgettet (9. oktober): første måned 1-12, gemt på sagen
   (CW.onboarding().fiscalYear = { start, at }) og skrevet i punktets historik. */
function portalFiscalOptions(lang) {
  const M = (lang || window.CW_LANG) === 'en'
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return M.map((m, i) => ({ value: i + 1, label: cap(m) + '-' + M[(i + 11) % 12] }));
}
// months: regnskabsårets længde i måneder (12 er normalt; et kort eller langt år er 1-18)
// periods: alle regnskabsår kunden har tilføjet under "Andet" ([{ from, to }], ISO-datoer); start og months er det første
function portalSetFiscalYear(start, by, itemId, months, periods) {
  const len = months && months !== 12 ? months : 12;
  const per = periods && periods.length ? periods : null;
  const prevFy = CW.onboarding().fiscalYear || {};
  if (!start || (prevFy.start === start && (prevFy.months || 12) === len && JSON.stringify(prevFy.periods || null) === JSON.stringify(per))) return;
  CW.setOnboarding({ fiscalYear: { start, months: len, periods: per, at: new Date().toISOString() } });
  const label = portalFiscalOptions('da')[start - 1].label.toLowerCase() + (len !== 12 ? ', ' + len + ' ' + t('måneder') : '')
    + (per && per.length > 1 ? ', ' + per.length + ' ' + t('regnskabsår') : '');
  CW.log('fiscal-year', ncFill(t('Regnskabsåret er angivet: {aar}'), { aar: label }), { who: by || 'kunde', itemId: itemId || 'm-budget' });
}

// Antal hele måneder i "år til dato" (samme periode som portalPeriod)
function portalMonths(end) {
  return portalPeriodEnd(end).m + 1;
}

/* ── Demo: kundens datakilder til Regnskab ──────────────────────────────────
   Demoknapperne ved punkterne på kundens oversigt (PortalSourceDemo.vue) gør det, kunden ellers
   gør: forbinder e-conomic, uploader saldobalancen som PDF, en intern årsrapport eller budgettet.
   Alt skrives med CW's egne funktioner (localStorage kabul:* og filerne i IndexedDB cw-demo-files),
   så "Nulstil demo" rydder det, og Overblik, Dokumenter og Regnskab reagerer, som hvis kunden selv
   havde gjort det. Intet netværk: filerne bygges lokalt. Om en knap er trykket ned, læser knappen
   selv af sagens tilstand (finSourceState og finDelivered i src/domain/financials/finSources.js).
   Knapperne trækker kun et punkt tilbage, når kunden selv kan fortryde det (csCanUndo, samme regel
   som "Fortryd" i portalen). Et godkendt punkt, et åbent spørgsmål, rådgiverens filer og kundens
   svar står urørt, og en besked siger hvorfor. */

// Demoens regnskabssystem. Tallene derfra slutter med august 2026 (Periodetal_jan-aug_2026.xlsx),
// så kunden deler tal til og med 31. august 2026, ikke til og med seneste afsluttede måned
const PORTAL_DEMO_ERP = 'e-conomic';
const PORTAL_DEMO_SHARING = { mode: 'until', dataUntil: '2026-08-31' };
// Filerne, hentningen lægger som andre filer, når Periodetal ikke er bedt om (portalConnectNow)
const PORTAL_ERP_FILE_RE = /^(Saldobalance|Debitorliste)_.+\.csv$/;
// Årsregnskaber: de interne årsrapporter for 2025 og 2024 (demofilerne i CW.demoUploadFile)
const PORTAL_DEMO_FILES = { 'm-annual': ['m-annual', 'm-annual-2024'] };
// Felterne i kundens opstart, som "Forbind e-conomic" skriver. Det, der stod før, gemmes i portalens
// hukommelse (demoErp: { at, prev }; under kabul:, så "Nulstil demo" rydder det), og "fra" sætter
// det tilbage
const PORTAL_DEMO_OB_FIELDS = ['agreement', 'sharing', 'erp'];

/**
 * Kan kunden selv trække punktet tilbage (csCanUndo)? Hvis ikke, siger en besked hvorfor, og
 * funktionen returnerer true: demoknappen gør så intet. Et punkt uden tilstand afvises ikke.
 */
function portalDemoRefused(itemId) {
  const s = CW.itemState(itemId);
  if (!s || csCanUndo(s)) return false;
  const it = CW.itemById(itemId);
  const text = s.status === 'approved' ? t('{item}: {adv} har godkendt punktet, så kunden kan ikke trække det tilbage (demo)')
    : s.status === 'rejected' ? t('{item}: {adv} har stillet et spørgsmål til punktet. Kunden kan svare i punktet, men ikke trække det tilbage (demo)')
    : s.answer ? t('{item}: kunden har svaret på et spørgsmål til punktet og kan ikke trække det tilbage (demo)')
    : t('{item}: {adv} har tilføjet noget til punktet, så kunden kan ikke trække det tilbage (demo)');
  CW.toast(ncFill(text, { item: it ? t(it.label) : itemId, adv: PORTAL_CONTACT.first }), { tone: 'info' });
  return true;
}

/**
 * Kundeside (rådgiverens forhåndsvisning) spærrer alle kundehandlinger. Demoknapperne virker der
 * også og gemmes, som om kunden havde gjort det: spærren slås fra, mens fn skriver, og altid til
 * igen bagefter. Beskeden vises først derefter (CW.setPreview(true) skjuler beskeder).
 */
function portalDemoAsCustomer(fn) {
  const pv = !!CW.isPreview();
  if (pv) CW.setPreview(false);
  try { return fn(); } finally { if (pv) CW.setPreview(true); }
}
// ERP fra: adgangen trækkes tilbage, og de hentede tal fjernes (punktet eller de løse filer). En
// saldobalance, kunden selv har uploadet, bliver stående. Kundens opstart står igen, som før demoen
// forbandt: kun de felter, demoen skrev, og som ikke er ændret siden (samme at). Har demoen ikke
// forbundet, står opstarten urørt, som når kunden selv trækker adgangen tilbage (portalRevoke)
function portalDemoErpOff() {
  if (CW.consent()) CW.setConsent(null);
  const s = CW.itemState('m-interim');
  if (s && s.noteKind === 'system') CW.resetItem('m-interim', 'kunde');
  CW.allUploads().filter(f => !f.itemId && f.by === 'kunde' && PORTAL_ERP_FILE_RE.test(f.name)).forEach(f => CW.removeLooseUpload(f.id));
  const undo = portalMem().demoErp;
  if (!undo) return;
  const ob = CW.onboarding();
  const patch = {};
  PORTAL_DEMO_OB_FIELDS.forEach(k => { if (ob[k] && ob[k].at === undo.at) patch[k] = (undo.prev || {})[k]; });
  if (Object.keys(patch).length && CW.setOnboarding(patch) === false) return;
  setPortalMem({ demoErp: null });
}
// ERP til, som ErpSharingCard og ErpConnectModal gør det, men uden dialogen: aftalen og
// datadelingen, samtykket, hentningen (punktet eller andre filer) og systemet
function portalDemoErpOn() {
  const at = new Date().toISOString();
  const ob = CW.onboarding();
  // Opstarten, som den står nu, til "fra". Står demoens egne værdier der stadig, gælder det, der stod før dem
  const old = portalMem().demoErp;
  const prev = {};
  PORTAL_DEMO_OB_FIELDS.forEach(k => { prev[k] = old && old.prev && ob[k] && ob[k].at === old.at ? old.prev[k] : ob[k]; });
  setPortalMem({ demoErp: { at, prev } });
  const helper = !!(ob.company && ob.company.advisor);
  const sharing = ncFill(t('tal til og med {date}'), { date: CW.fmtDate(PORTAL_DEMO_SHARING.dataUntil + 'T12:00:00') });
  CW.setOnboarding({ agreement: Object.assign({ at }, helper ? { mandate: true } : {}), sharing: Object.assign({}, PORTAL_DEMO_SHARING, { at }) }, helper
    ? ncFill(t('{name} ({role}) sagde ja til at dele periodetal og debitordata med EIFO på vegne af kunden ({sharing})'), { name: ob.company.person, role: t('revisor eller rådgiver'), sharing })
    : ncFill(t('Kunden sagde ja til at dele periodetal og debitordata med EIFO ({sharing})'), { sharing }));
  portalConsentNow(PORTAL_DEMO_ERP, PORTAL_DEMO_SHARING, CW.onboarding().company);
  portalConnectNow(PORTAL_DEMO_ERP, PORTAL_DEMO_SHARING);
  CW.setOnboarding({ erp: { system: PORTAL_DEMO_ERP, at } });
}
/**
 * Demo: periodetallenes kilde, som kunden ellers vælger på punktet Periodetal eller oversigten.
 * to: 'erp' (e-conomic forbundet og tallene hentet), 'upload' (saldobalancen uploadet som PDF)
 * eller 'none'. from: kilden nu (finSourceState().period). Én kilde ad gangen: forbindelsen, de
 * hentede filer og en uploadet saldobalance fjernes, før den nye kilde sættes, så punktet kun har
 * dens filer. Et punkt uden tal (en bemærkning, eller sendt videre til revisor) trækkes ikke
 * tilbage først: den nye kilde afløser det, som når kunden sender en fil. Kan kunden ikke selv
 * trække punktet tilbage, sker der intet (portalDemoRefused). Returnerer false, hvis sagen er
 * lukket for kunden, eller knappen blev afvist.
 */
function portalDemoPeriod(to, from) {
  if (CW.customerLock()) return false;
  const c = CW.consent();
  const src = (c && c.system) || PORTAL_DEMO_ERP;
  // Skal punktet trækkes tilbage? Når det har tal, og kilden skiftes eller slås fra (fra ERP: kun
  // de hentede tal). Det afgøres, før noget skrives, så en afvist knap intet har ændret
  const s = CW.itemState('m-interim');
  const has = !!s && ((s.files || []).length > 0 || s.noteKind === 'system');
  const withdraw = has && (to !== 'none' || from !== 'erp' || s.noteKind === 'system');
  if (withdraw && portalDemoRefused('m-interim')) return false;
  const ok = portalDemoAsCustomer(() => {
    if (to === 'none') {
      if (from === 'erp') portalDemoErpOff();
      else if (withdraw) CW.resetItem('m-interim', 'kunde');
      return true;
    }
    portalDemoErpOff();
    if (withdraw && CW.itemState('m-interim')) CW.resetItem('m-interim', 'kunde');
    if (to === 'erp') { portalDemoErpOn(); return true; }
    const file = CW.demoUploadFile('m-interim-pdf') || demoPdf('Saldobalance_jan-aug_2026.pdf', 'Saldobalance januar-august 2026 - ' + DATA.COMPANY.name);
    // noteKind null: ellers følger en tidligere kilde ("Hentet fra e-conomic") med
    return CW.markReceived('m-interim', { by: 'kunde', files: CW.putFiles([file], { by: 'kunde', itemId: 'm-interim' }), note: '', noteKind: null }) !== false;
  });
  if (!ok) return false;
  CW.toast(to === 'erp' ? ncFill(from === 'upload' ? t('{src} er forbundet, og den uploadede saldobalance er trukket tilbage (demo)') : t('{src} er forbundet, og periodetallene er hentet (demo)'), { src: PORTAL_DEMO_ERP })
    : to === 'upload' ? (from === 'erp' ? ncFill(t('Saldobalancen er uploadet som PDF, og forbindelsen til {src} er fjernet (demo)'), { src }) : t('Saldobalancen er uploadet som PDF (demo)'))
    : from === 'erp' ? ncFill(t('Forbindelsen til {src} er fjernet (demo)'), { src })
    : ncFill(t('{item} er trukket tilbage (demo)'), { item: t('Periodetal') }));
  return true;
}
/**
 * Demo: kunden sender (on) eller trækker et dokument tilbage (off) på et punkt: den interne
 * årsrapport ('m-annual' eller 'm-annual-<år>') eller budgettet ('m-budget'). Er Årsregnskaber
 * ('m-annual') ikke bedt om, sender kunden de interne årsrapporter som andre filer, som en kunde
 * kan, og Regnskab læser dem derfra (finInternalLoose). Kan kunden ikke selv trække punktet
 * tilbage, sker der intet (portalDemoRefused). Returnerer false, hvis sagen er lukket for kunden,
 * eller knappen blev afvist.
 */
function portalDemoDocument(itemId, on) {
  const it = CW.itemById(itemId);
  if (!it || CW.customerLock()) return false;
  if (!on && portalDemoRefused(itemId)) return false;
  const loose = itemId === 'm-annual' && !CW.requestedItems().some(x => x.id === itemId);
  const ok = portalDemoAsCustomer(() => {
    if (!on) {
      if (CW.itemState(itemId)) CW.resetItem(itemId, 'kunde');
      if (itemId === 'm-annual') finInternalLoose().forEach(f => CW.removeLooseUpload(f.id));
      return true;
    }
    const files = (PORTAL_DEMO_FILES[itemId] || [itemId]).map(id => CW.demoUploadFile(id)).filter(Boolean);
    // Uden demofil: en lille PDF. En årsrapport får aldrig CVR-versionens filnavn (se DEMO_UPLOADS)
    if (!files.length) files.push(it.year ? demoPdf('Intern_aarsrapport_' + it.year + '.pdf', t(it.label) + ' - ' + DATA.COMPANY.name) : portalDemoFileFor(it));
    // Budgettet: kunden angiver regnskabsåret (demoens kunde har kalenderår)
    if (itemId === 'm-budget') portalSetFiscalYear((CW.onboarding().fiscalYear || {}).start || 1, 'kunde', itemId);
    if (loose) {
      const metas = CW.putFiles(files, { by: 'kunde', itemId: null });
      if (metas.length) CW.addLooseUploads(metas);
      return metas.length > 0;
    }
    return CW.markReceived(itemId, { by: 'kunde', files: CW.putFiles(files, { by: 'kunde', itemId }), note: '' }) !== false;
  });
  if (ok) {
    CW.toast(loose ? (on ? t('De interne årsrapporter er sendt som andre filer (demo)') : t('De interne årsrapporter er trukket tilbage (demo)'))
      : ncFill(on ? t('{item} er sendt (demo)') : t('{item} er trukket tilbage (demo)'), { item: t(it.label) }));
  }
  return ok;
}

// Navne, som andre filer læser som globale (før migrationen delte de klassiske scripts navnerum):
//   portalFlowRole   sagens Kundeside og Kundeflow (src/domain/workspace/actions.js)
//   PORTAL_CONTACT   memo_handoff (rådgiveren i vejledningen) og portal_onboarding
//   ncFill, NC_EMAIL_RE, portalRecipient, portalMaskEmail, ERP_SOURCES, portalPeriod,
//   portalMonths, portalConsentNow, portalConnectNow   portal_onboarding (kundens opstart)
//   CW_DEMO_PAGES    demofilernes sider (CW.demoUploadFile i case_state.js)
Object.assign(window, {
  ncFill, NC_EMAIL_RE, PORTAL_CONTACT, portalRecipient, portalMaskEmail, ERP_SOURCES, portalPeriod, portalMonths,
  portalConsentNow, portalConnectNow, portalFlowRole,
  CW_DEMO_PAGES: { trialBalance: portalTrialBalancePages },
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
  PORTAL_DEMO_ERP, PORTAL_DEMO_SHARING, portalDemoAsCustomer, portalDemoPeriod, portalDemoDocument,
  portalFiscalOptions, portalSetFiscalYear,
};
