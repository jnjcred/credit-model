// Credit memo: kildekontrollen, der slår en henvisning op på den side i kildedokumentet, den peger
// på (tal, datoer, navne og nøgleord), henvisningens tilgængelige navn, udfaldet pr. henvisning (husket)
// og henvisningernes knap-semantik, når kildevisningen er slået til (decorateCite). Flyttet ordret fra
// src/memo.jsx (linje 4365-5414, 5416-5422 og 5576-5615) ved migrationen til Vue; kun import- og
// export-linjerne er nye. decorateCites kommentar (linje 5424) stod alene foran bilagslisten; den står
// nu over decorateCite. window.CW_CITE_ISSUES og __memoCheckCite (index.js) bruger motoren, editoren også.
/* eslint-disable no-control-regex -- Migration: citeContext skiller nabohenvisninger ad med
   kontroltegnet U+0001, og _citeClaim fjerner det igen med et regulært udtryk (ordret fra memo.jsx). */
import { MEMO_EN, SEC_DA, SEC } from './memoTemplates.js';
import { memoRefLabel } from './memoFormat.js';

/* Sammenligner uden at snuble over store og små bogstaver, mellemrum og
   bindestreger, men husker hvor hvert tegn kom fra, så fundet kan fremhæves
   i den oprindelige tekst. */
function _normWithMap(s) {
  let out = '';
  const map = [];
  let prevSpace = true;
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === ' ') {
      if (prevSpace) continue;
      c = ' '; prevSpace = true;
    } else {
      prevSpace = false;
      c = c.toLowerCase();
      if (c === '−' || c === '–' || c === '—') c = '-';
    }
    out += c; map.push(i);
  }
  if (out.endsWith(' ')) { out = out.slice(0, -1); map.pop(); }
  return { text: out, map };
}

/* Et citat bekræftes kun ved en sammenhængende tekst. Et rent tal som "2025"
   findes på næsten enhver side og beviser intet. */
function _isPhrase(q) {
  return (q || '').trim().length >= 4 && /[a-zæøåäöü]{3,}/i.test(q);
}

/** Finder citatet ordret på en side. Returnerer [start, slut] i sidens tekst, eller null. */
function findQuote(text, quote) {
  if (!text || !_isPhrase(quote)) return null;
  const hay = _normWithMap(text);
  const needle = _normWithMap(quote).text;
  if (!needle) return null;
  const isWordChar = (c) => !!c && /[0-9a-zæøåäöü]/i.test(c);
  let from = 0;
  while (true) {
    const at = hay.text.indexOf(needle, from);
    if (at === -1) return null;
    const end = at + needle.length;
    // Ingen halve ord: "2025" må ikke findes inde i "20250"
    if (!isWordChar(hay.text[at - 1]) && !isWordChar(hay.text[end])) {
      return [hay.map[at], hay.map[end - 1] + 1];
    }
    from = at + 1;
  }
}

/* ── Kildekontrol ────────────────────────────────────────────────────────────
   Tre udfald for en kildehenvisning:
   'exact'   Teksten står ordret på siden. Grøn, fremhævet.
   'format'  Alle tal (og koder) i påstanden står på siden, men i et andet
             format eller i en tabel: 41,1 mio. = t.DKK 41.100 = 41.100.000,
             50,7 % = 50,7%. Grøn med en note, tallene fremhævet.
   'missing' Påstanden kan ikke genfindes. Gul, gennemgå selv.
   En ren etiket ("note 14", "ejerbogen") beviser intet i sig selv og giver
   aldrig grønt alene. Så kontrolleres påstanden foran den i sætningen.
   ──────────────────────────────────────────────────────────────────────────── */

const _CITE_MONTHS = {
  januar: 1, februar: 2, marts: 3, april: 4, maj: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, december: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, october: 10,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, okt: 10, oct: 10, nov: 11, dec: 12,
};

/* Referencer til steder i et dokument. De er ikke påstande og tælles ikke som tal. */
const _CITE_REF_RE = /(§\s?\d+(?:\.\d+)*(?:\s?(?:og|and|,)\s?§?\s?\d+(?:\.\d+)*)*|\b(?:note|noter|notes|afsnit|section|sections|pkt\.?|punkt|item|clause|s\.|p\.|pp\.|side|page|linje|line|bemærkning|remark|rk\.)\s?\d+(?:[.-]\d+)*|\bS\d\b|\b(?:ark|sheet)\s+[A-ZÆØÅ][\wæøå]+|\bQ[1-4](?:\s?-\s?Q[1-4])?\b|\bTop-\d+\b|\bDL-\d+\b|\bISO\s?\d+\b|\bversion\s\d+(?:\.\d+)?)/gi;
/* Koder der skal stå ordret: aftalenumre, sagsnumre */
const _CITE_CODE_RE = /\b[A-Z]{2,}(?:-[A-Z0-9]+){2,}\b/g;

/* Almindelige navne på dokumenter og dokumentdele. En henvisning, der kun
   består af sådanne ord, er en etiket. */
const _CITE_LABEL_WORDS = [
  'ledelsesberetning', 'ejerbog', 'ansøgning', 'revisionspåtegning', 'påtegning', 'ledelsesoversigt', 'ejeraftale',
  'selskabsoplysning', 'nøgletal', 'budget', 'forudsætning', 'periodetal', 'likviditetsprognose', 'ordrebog',
  'rammeaftale', 'rammekontrakt', 'koncernoversigt', 'redegørelse', 'årsrapport', 'aarsrapport', 'windeurope', 'note', 'noter',
  'sikkerhedsdokument', 'kontrakt', 'regnskab', 'ejerfortegnelse', 'csr/esg', 'esg',
  'management', 'review', 'register', 'shareholders', 'shareholder', 'application', 'audit', 'report', 'auditor',
  'assumptions', 'interim', 'figures', 'liquidity', 'forecast', 'order', 'book', 'framework', 'agreement', 'company',
  'details', 'overview', 'group', 'key', 'annual', 'statement', 'security', 'documents', 'contract',
];

function _citeStem(w) {
  w = w.toLowerCase().replace(/^[^a-zæøå0-9/]+|[^a-zæøå0-9/]+$/g, '').replace(/'s$/, '');
  return w.replace(/(ernes|erne|enes|ene|ets|ens|en|et|ne|er|s)$/, '');
}

/** Er henvisningsteksten kun en etiket (dokument- eller sidenavn)? */
function _citeIsLabel(quote, doc, pageRef) {
  // Et kort navneord, der står i selve siden ("prioritetsoversigten"), er en
  // henvisning til en del af dokumentet, ikke en påstand
  const bare = (quote || '').trim();
  if (bare && !/\d/.test(bare) && bare.split(/\s+/).length <= 2 && doc && doc.pages) {
    const pg = doc.pages.find(p => p.ref === pageRef);
    const stem = _citeStem(bare.split(/\s+/).pop());
    if (pg && stem.length >= 7 && (pg.body || '').toLowerCase().indexOf(stem) >= 0 && /(en|et|ne|erne)$/i.test(bare)) return true;
  }
  const rest = (quote || '').replace(_CITE_REF_RE, ' ');
  // Tal i henvisningen gør den til en påstand, medmindre tallet er en del af dokumentets navn
  const docWords = ((doc && doc.name) || '').toLowerCase().split(/[^a-zæøå0-9]+/);
  if (rest.split(/[^\wæøå]+/i).some(w => /\d/.test(w) && !docWords.includes(w.toLowerCase()))) return false;
  const vocab = []
    .concat(_CITE_LABEL_WORDS)
    .concat(docWords)
    .concat(((doc && doc.type) || '').toLowerCase().split(/[^a-zæøå0-9]+/))
    .concat(((doc && doc.pages) || []).map(p => (p.title || '').toLowerCase()).join(' ').split(/[^a-zæøå0-9/]+/))
    .filter(w => w && w.length >= 3);
  const words = rest.split(/[\s,;:()]+/).filter(w => w && w.replace(/[^a-zæøå0-9]/gi, '').length >= 4);
  if (!words.length) return true;
  return words.every(w => {
    if (/\d/.test(w)) return vocab.some(v => v === w.toLowerCase());
    const s = _citeStem(w);
    if (s.length < 3) return true;
    return vocab.some(v => v.startsWith(s) || (v.length >= 5 && s.startsWith(v)) || (v.includes(s) && s.length >= 6));
  });
}

/** Læser et tal i dansk format: "41.100" = 41100, "41,1" = 41,1, "1.000.000" */
function _citeParseNum(raw, en) {
  let s = raw.replace(/\s/g, '');
  // Engelsk format i memoets engelske tekst: "1,245,000" og "4.5". Kilderne er danske.
  if (en) {
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  }
  else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3}){2,}(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const v = parseFloat(s);
  if (isNaN(v)) return null;
  return { v, dec: (s.split('.')[1] || '').length };
}

// Et tal med evt. enhed foran eller bagved
const _CITE_NUM_RE = /(t\.?\s?DKK|tDKK|TDKK|DKK|USD|EUR|kr\.?)?\s?([+\-−]?\d{1,3}(?:\.\d{3})+(?:,\d+)?|[+\-−]?\d+(?:[.,]\d+)?)(\s?(?:mio\.?|million|mia\.?|billion|bn|mdr\.?|måneder|months|k\b|t\.?kr\.?|%|×|x\b|pct\.?|procent|per cent|percent))?/gi;
// Også "1. nov. 2026" og "30. september" uden år
const _CITE_DATE_DA = /(\d{1,2})\.\s?(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|okt|nov|dec)\b\.?(?:\s(\d{4}))?/gi;
const _CITE_DATE_EN = /(\d{1,2})\s(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b\.?(?:\s(\d{4}))?/g;
const _CITE_DATE_NUM = /\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g;

function _citeDates(text) {
  const out = [];
  let m;
  const push = (d, mo, y, i, len) => out.push({ key: (y || '*') + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'), start: i, end: i + len });
  _CITE_DATE_DA.lastIndex = 0;
  while ((m = _CITE_DATE_DA.exec(text))) push(+m[1], _CITE_MONTHS[m[2].toLowerCase()], m[3], m.index, m[0].length);
  _CITE_DATE_EN.lastIndex = 0;
  while ((m = _CITE_DATE_EN.exec(text))) push(+m[1], _CITE_MONTHS[m[2].toLowerCase()], m[3], m.index, m[0].length);
  _CITE_DATE_NUM.lastIndex = 0;
  while ((m = _CITE_DATE_NUM.exec(text))) {
    if (m[4]) push(+m[6], +m[5], m[4], m.index, m[0].length);
    else push(+m[1], +m[2], m[3], m.index, m[0].length);
  }
  return out;
}

/** Alle tal og datoer i en tekst: { raw, v, dec, scale, kind, date?, start, end } */
function _citeNumbers(text, en) {
  const out = [];
  const dates = _citeDates(text);
  const inDate = (i) => dates.some(d => i >= d.start && i < d.end);
  let m;
  _CITE_NUM_RE.lastIndex = 0;
  while ((m = _CITE_NUM_RE.exec(text))) {
    const numStart = m.index + m[0].indexOf(m[2]);
    // "1.11.2026-30.4.2029": bindestregen er ikke et minus, tallet er en dato
    if (inDate(numStart) || inDate(numStart + (/^[+\-−]/.test(m[2]) ? 1 : 0))) continue;
    // Tal inde i ord og koder ("CO2", "Q3") er ikke beløb
    const prev = text[numStart - 1] || '';
    const next = text[numStart + m[2].length] || '';
    if (/[A-Za-zÆØÅæøå\-_/]/.test(prev) && !/[+−\-]/.test(m[2][0])) continue;
    if (/[A-Za-zÆØÅæøå_]/.test(next) && !m[3]) continue;
    // Ordenstal ("1. kvartal", "12. regnskabsår") er ikke påstande om beløb
    if (!m[1] && !m[3] && /^\d{1,2}$/.test(m[2]) && /^\.\s+[a-zæøå]/.test(text.slice(numStart + m[2].length))) continue;
    // "6-8 mio.": bindestregen mellem to tal er et interval, ikke et minus
    const raw2 = /^[\-−]/.test(m[2]) && /\d/.test(prev) ? m[2].slice(1) : m[2];
    const p = _citeParseNum(raw2.replace('−', '-').replace(/^\+/, ''), en);
    if (!p) continue;
    const unit = (m[3] || '').trim().toLowerCase();
    const pre = (m[1] || '').toLowerCase().replace(/\s/g, '');
    let scale = 1, kind = 'n';
    if (/^(mio|million)/.test(unit)) scale = 1e6;
    else if (/^(mia|billion|bn)/.test(unit)) scale = 1e9;
    else if (unit === 'k' || /^t\.?kr/.test(unit) || /^t\.?dkk/.test(pre)) scale = 1e3;
    if (/%|pct|procent|cent/.test(unit)) kind = '%';
    else if (/×|^x$/.test(unit)) kind = 'x';
    else if (scale !== 1 || pre) kind = 'amt';
    out.push({ raw: m[0].trim(), v: p.v, dec: p.dec, scale, kind, start: numStart, end: m.index + m[0].length });
  }
  // Datoer tæller både som dato og som årstal ("2025" står i "31. december 2025")
  dates.forEach(d => {
    out.push({ raw: text.slice(d.start, d.end), date: d.key, start: d.start, end: d.end });
    if (d.key[0] !== '*') out.push({ raw: d.key.slice(0, 4), v: +d.key.slice(0, 4), dec: 0, scale: 1, kind: 'n', start: d.start, end: d.end });
  });
  return out;
}

/** Passer et tal fra påstanden med et tal på siden, evt. i en anden enhed eller afrundet? */
function _citeNumEq(c, p) {
  // En dato uden år ("30. september") passer med samme dag og måned
  if (c.date || p.date) return !!(c.date && p.date && (c.date === p.date || ((c.date[0] === '*' || p.date[0] === '*') && c.date.slice(-5) === p.date.slice(-5))));
  const tol = 0.5 * Math.pow(10, -c.dec) + 1e-9;
  const cv = Math.abs(c.v) * c.scale;
  // Samme størrelse direkte, eller i en anden enhed (DKK mio. / t.DKK / kr.)
  const scales = c.kind === '%' || c.kind === 'x' ? [1] : [1, 1e3, 1e6, 1e-3, 1e-6];
  for (const s of scales) {
    // Et lille helt tal uden enhed ("§ 2", "2 af 5") er ikke et beløb i mio.
    if (s !== 1 && p.kind === 'n' && p.dec === 0 && (Math.abs(p.v) < 100 || _citeIsYear(p))) continue;
    const pv = Math.abs(p.v) * p.scale * s;
    if (Math.abs(pv - cv) <= tol * c.scale + 1e-9) {
      // Et helt tal uden decimaler (f.eks. "3") må ikke findes inde i en afrunding ("3,4")
      if (c.dec === 0 && p.dec > 0 && c.kind !== 'amt' && Math.abs(pv - cv) > 1e-9) continue;
      return true;
    }
  }
  return false;
}

/* Sætningsgrænse efter punktum, semikolon, udråbs- og spørgsmålstegn? Ikke
   foran småt, tal eller parentes, ikke efter forkortelser midt i en sætning
   ("jf.", "ca.", "maks.") og ikke efter "mio." foran en valuta ("mio. DKK").
   "... DKK 1,8 mio. EIFO er sidestillet" er derimod to sætninger. */
const _CITE_ABBR_MID = /(^|[^\wæøå])(ca|maks|min|pkt|nr|jf|inkl|ekskl|s|t|approx|max|no|p|pp|incl|excl|bl\.a|f\.eks|e\.g|i\.e|stk|adm|att|evt|vedr|dvs|hhv|kl)\.$/i;
const _CITE_ABBR_END = /(^|[^\wæøå])(mio|mia|kr|mdr|pct)\.$/i;
function _citeIsBoundary(head, rest) {
  const c = (rest || '')[0] || '';
  if (!c || c === '(') return false;
  if (/\.$/.test(head)) {
    if (/[0-9a-zæøå]/.test(c)) return false;
    if (_CITE_ABBR_MID.test(head)) return false;
    if (_CITE_ABBR_END.test(head) && /^(DKK|USD|EUR|GBP|NOK|SEK|kr)\b/.test(rest)) return false;
    // Initialer: "A. Christensen"
    if (/(^|\s)[A-ZÆØÅ]\.$/.test(head)) return false;
  }
  return true;
}

/**
 * Teksten en henvisning står i, uden de andre henvisningers tekst:
 * { before, after, row }. I en tabel er rækken påstanden, når cellen kun er
 * en kildeangivelse; står henvisningen i en lang tekstcelle, er det sætningen.
 */
function citeContext(el) {
  // Indstillingsboksen viser en kort tekst; påstanden er faktaarkets fulde tekst
  const claim = el.getAttribute && el.getAttribute('data-claim');
  if (claim) return { before: claim + ' ', after: '', row: true, label: true };
  const cell = el.closest('td, th');
  // Et punkt i en liste i en celle (indstillingsboksen) er sin egen påstand
  const li = el.closest('li');
  let block = li && (!cell || cell.contains(li))
    ? li
    : cell
    ? ((cell.textContent || '').replace(el.textContent || '', '').trim().length > 40 ? cell : el.closest('tr'))
    : el.closest('li, p, blockquote, h3, h4, dd, dt');
  if (!block) block = el.parentElement;
  if (!block) return { before: '', after: '', row: false };
  const row = block.tagName === 'TR';
  let text = '', at = -1, end = -1;
  const walk = (node) => {
    if (node.nodeType === 3) { text += node.nodeValue; return; }
    if (node.nodeType !== 1) return;
    // Statusmærker ("Åben", "Høj") er ikke en del af påstanden
    if (node.classList && node.classList.contains('st')) return;
    if (node.classList && node.classList.contains('memo-cite')) {
      if (node === el) { at = text.length; text += node.textContent; end = text.length; }
      else text += ' \u0001 ';
      return;
    }
    if (node.tagName === 'TD' || node.tagName === 'TH' || node.tagName === 'BR') text += ' | ';
    node.childNodes.forEach(walk);
  };
  walk(block);
  if (at < 0) return { before: '', after: '', row };
  if (row) {
    // I en tabel hører kolonnens overskrift ("2025") til påstanden
    const cellEl = el.closest('td, th');
    const table = block.closest('table');
    const headRow = table && table.querySelector('thead tr');
    const idx = cellEl ? Array.prototype.indexOf.call(block.children, cellEl) : -1;
    const head = headRow && idx > 0 && headRow.children[idx] ? (headRow.children[idx].textContent || '').trim() : '';
    return { before: (head ? head + ' | ' : '') + text.slice(0, at), after: text.slice(end), row };
  }
  // Sætningsgrænser: punktum, semikolon, udråbs- og spørgsmålstegn. Ikke efter
  // forkortelser som "mio." foran "DKK" eller et tal, og ikke foran en parentes.
  const bounds = [];
  const re = /[.;!?](\s+)(?=\S)/g;
  let m;
  while ((m = re.exec(text))) {
    if (!_citeIsBoundary(text.slice(0, m.index + 1), text.slice(m.index + 1 + m[1].length))) continue;
    bounds.push(m.index + 1);
  }
  const sStart = bounds.filter(b => b <= at).pop() || 0;
  const sEnd = bounds.find(b => b >= end) || text.length;
  let before = text.slice(sStart, at);
  // "(S1 og S2)": står der kun et bindeord mellem to henvisninger, gælder
  // påstanden foran den første for dem begge
  let parts = before.split('\u0001');
  while (parts.length > 1 && /^[\s,;()]*(og|and|samt|,)?[\s,;()]*$/i.test(parts[parts.length - 1])) parts.pop();
  before = parts[parts.length - 1];
  let after = text.slice(end, sEnd);
  const nextOther = after.indexOf('\u0001');
  if (nextOther >= 0) after = after.slice(0, nextOther);
  // Efter et kolon begynder en opremsning, der kan have sine egne kilder
  const colon = after.indexOf(':');
  if (colon >= 0) after = after.slice(0, colon);
  return { before, after, row };
}

/** Det der skal kunne genfindes: tal, datoer og koder */
function _citeTokens(text, en) {
  const clean = (text || '').replace(_CITE_REF_RE, ' ');
  const codes = [];
  let m;
  _CITE_CODE_RE.lastIndex = 0;
  while ((m = _CITE_CODE_RE.exec(clean))) codes.push(m[0]);
  return { nums: _citeNumbers(clean.replace(_CITE_CODE_RE, ' '), en), codes };
}

/* Egennavne og e-mails i en påstand uden tal: ord med stort begyndelsesbogstav.
   Det første ord i sætningen kan være et almindeligt ord med stort, så det
   tæller kun med, hvis det findes. */
function _citeNames(text) {
  const words = (text || '').replace(_CITE_REF_RE, ' ').split(/[\s,;:()"“”]+/).filter(Boolean);
  const out = [];
  words.forEach((w, i) => {
    const clean = w.replace(/[^\wæøåÆØÅ/.@-]/g, '').replace(/\.$/, '');
    if (clean.length < 3) return;
    if (/@/.test(clean)) { out.push({ n: clean, opt: false }); return; }
    // Første ord i sætningen (evt. efter et punkt-id som "E1") kan være almindeligt
    const first = i === 0 || (i === 1 && /^[A-Z]\d{1,2}$/.test(words[0]));
    if (/^[A-ZÆØÅ][a-zæøå]+/.test(clean) || /^[A-ZÆØÅ]{2,}/.test(clean)) out.push({ n: clean, opt: first });
  });
  return out;
}

/* ── Sammenhæng i kilden ─────────────────────────────────────────────────────
   Et tal, der står et sted på siden, beviser ikke påstanden. Grønt kræver, at
   tallet står i samme sætning, linje eller tabelrække som påstandens
   nøgleord, og at nøgleordet hører til netop det tal: i en sætning skal
   nøgleordets nærmeste tal af samme slags være påstandens. Derfor bliver
   "Anders Holding ApS (23,6 %)" ikke grøn, fordi 23,6 står ud for
   Erhvervsfonden. Ord som efterstillet, sidestillet og personlig kaution skal
   desuden have samme fortegn i kilden: "ikke efterstillet" modsiger
   "efterstillet".
   ──────────────────────────────────────────────────────────────────────────── */

/* Kildens enheder: en tabellinje (kolonner adskilt af flere mellemrum) er én
   enhed; en tekstlinje deles i sætninger og ved " · ". En tabellinje kender
   sin tabel (block) og tabellens overskrift og kolonnehoved (caps). */
function _citeUnits(body) {
  const units = [];
  let pos = 0;
  const lines = (body || '').split('\n').map(line => { const l = { start: pos, end: pos + line.length, text: line }; pos += line.length + 1; return l; });
  const isTable = (l) => /\S {3,}\S/.test(l.text) || /\t/.test(l.text);
  let block = null;
  lines.forEach((l, i) => {
    const line = l.text, start = l.start;
    if (!line.trim()) return;
    if (isTable(l)) {
      if (!block || block.last !== i - 1) {
        // Ny tabel: op til to tekstlinjer lige over den er dens overskrift
        // Kun korte overskrifter uden beløb; brødtekst over tabellen er ikke
        // dens titel og springes over, og tekst med beløb afslutter søgningen
        const caps = [];
        for (let j = i - 1, seen = 0; j >= 0 && caps.length < 2 && seen < 3; j--) {
          if (!lines[j].text.trim()) continue;
          if (isTable(lines[j]) || /\d[.,]\d|mio|pct|%/i.test(lines[j].text)) break;
          seen++;
          if (lines[j].text.length <= 90) caps.push({ start: lines[j].start, end: lines[j].end });
        }
        block = { start, end: l.end, head: { start, end: l.end }, caps };
      }
      block.last = i; block.end = l.end;
      units.push({ start, end: l.end, table: true, block });
      return;
    }
    const re = /(?:[.;!?]|\s·)(\s+)(?=\S)/g;
    let m, s = 0;
    while ((m = re.exec(line))) {
      const cut = m.index + m[0].length - m[1].length;
      const rest = line.slice(m.index + m[0].length);
      if (m[0].trim()[0] !== '·' && !_citeIsBoundary(line.slice(0, cut), rest)) continue;
      units.push({ start: start + s, end: start + cut, table: false });
      s = m.index + m[0].length;
    }
    units.push({ start: start + s, end: start + line.length, table: false });
  });
  return units;
}

// Ord, der ikke siger noget om, hvad tallet handler om
const _CITE_STOPW = new Set(('ikke efter under mellem samt eller også over hvor hvis samlet samlede heraf herudover svarende udgør udgjorde udgøre ' +
  'bliver blev have havde alene cirka omkring dette denne disse deres hans hendes sine inden uden siden ifølge fordi derfor ' +
  'nemlig altså dermed således tillige desuden herunder blandt senest seneste første sidste hele helt meget mere mest flere færre andre anden ' +
  'andet samme egen egne eget nogen noget nogle hver alle ingen intet være været står stod giver viser siger mens idet endnu stadig igen ' +
  'allerede kunne skal skulle ville måtte ligger kommer komme gælder fremgår nævner anfører oplyser skriver bekræfter medio ultimo primo året ' +
  'årets periode perioden dato side sider afsnit note noter linje punkt bilag memoet kilde kilden kilderne nordhavn composite selskab selskabet ' +
  'selskabets aps mod ved til fra med som den det der har var kan får fået efterfølgende tidligere senere ' +
  'the and with from which this that these those than then there their only also into about approx approximately after before between ' +
  'including total while where when been being have has had will would should could shall must each other same such more most less least ' +
  'both either first last since until page pages section sections line sheet company memo source ' +
  'dkk usd eur gbp nok sek mio mia million millions millioner billion pct procent percent mdr måneder months thousand tusind').split(' '));

/** Påstandens nøgleord med placering: { w (små bogstaver), start, end } */
function _citeWords(text) {
  const out = [];
  const re = /[A-Za-zÆØÅæøåÄÖÜäöü]+/g;
  let m;
  while ((m = re.exec(text || ''))) {
    const raw = m[0], w = raw.toLowerCase();
    const acro = raw.length >= 3 && raw === raw.toUpperCase();
    if ((w.length >= 4 || acro) && !_CITE_STOPW.has(w)) out.push({ w, start: m.index, end: m.index + raw.length, name: /^[A-ZÆØÅ]/.test(raw) });
  }
  return out;
}

/* Samme ord i en anden bøjning eller som del af et sammensat ord:
   "nettoomsætningen" = "Nettoomsætning", "EIFO-kautionen" ~ "eksportkaution" */
function _citeWordEq(w, s) {
  const stem = w.length <= 5 ? w : w.slice(0, Math.max(5, w.length - 3));
  if (s.startsWith(stem)) return true;
  if (stem.length >= 6 && s.indexOf(stem) >= 0) return true;
  // Ordet som sidste led i et sammensat ord: "præmie" i "kautionspræmie"
  const at = stem.length >= 5 ? s.indexOf(stem, 3) : -1;
  if (at > 0 && s.length - at <= w.length + 2) return true;
  // Kildens ord er en kortere form af påstandens ("nettoomsætning" i "nettoomsætningen")
  if (s.length >= 10 && w.startsWith(s.slice(0, s.length - 3))) return true;
  // Sidste led i et sammensat ord: "selvskyldnerkaution" ~ "kautionsforpligtelsen"
  const base = _citeStem(w);
  if (base.length >= 11 && s.startsWith(base.slice(-7, -1))) return true;
  // Kildens ord er sidste led i påstandens: "koncentration" i "kundekoncentration"
  if (s.length >= 8 && w.indexOf(s.slice(0, Math.max(7, s.length - 3)), 2) > 0) return true;
  return false;
}

/* Ord med fortegn. Samme gruppe, andet udfald er en modsigelse. */
const _CITE_POLAR = [
  { g: 'rank', v: 'sub', re: /efterstil\w*|subordinat\w*|tilbagetræd\w*/g },
  { g: 'rank', v: 'pari', re: /sidestil\w*|sideordn\w*|ligestil\w*|pari passu|ranking equally|rank\w* pari passu/g },
  { g: 'rank', v: 'senior', re: /foranstil\w*|forlods\w*/g },
  // En kautionist med cpr-nummer er en person, en med CVR-nummer et selskab
  { g: 'guar', v: 'personal', re: /personlig\w*\s+(?:[\wæøå]+\s+)?[\wæøå]*kaution\w*|personal\s+(?:\w+\s+)?guarantee\w*|kautionist\w*[^.]{0,60}?cpr/g },
  { g: 'guar', v: 'company', re: /selskabskaution\w*|(?:company|corporate)\s+guarantee\w*|kautionist\w*[^.]{0,60}?cvr/g },
];
const _CITE_NEG_BEFORE = /(?:^|[^a-zæøå])(ikke|ej|not|no|uden|aldrig|never|ingen|intet|without)$/;
const _CITE_NEG_AFTER = /^(ikke|mangler|missing|not)(?:[^a-zæøå]|$)/;

/** Ord med fortegn i et tekststykke: { g, v, neg, start, end }. Nægtelsen må stå op til tre ord før eller lige efter. */
function _citePolarTerms(text, from, to) {
  const low = (text || '').toLowerCase();
  const out = [];
  _CITE_POLAR.forEach(p => {
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(low))) {
      const s = m.index, e = s + m[0].length;
      if (from != null && (s < from || s >= to)) continue;
      const pre = low.slice(0, s).split(/\s+/).filter(Boolean).slice(-3);
      // En betingelse ("medmindre der foreligger", "medregnes ikke uden") siger
      // intet om, hvordan det er
      const bare = pre.map(w => w.replace(/[^a-zæøå]/g, ''));
      if (bare.some(w => /^(medmindre|hvis|såfremt|unless|if)$/.test(w)) || /ikke uden$/.test(bare.join(' '))) continue;
      const neg = pre.some(w => _CITE_NEG_BEFORE.test(' ' + w.replace(/[^a-zæøå]/g, ''))) ||
        _CITE_NEG_AFTER.test(low.slice(e).replace(/^[\s,]+/, ''));
      out.push({ g: p.g, v: p.v, neg, start: s, end: e, text: (text || '').slice(s, e) });
    }
  });
  return out;
}

/* Understøtter kilden ordene med fortegn? 'ok' | 'contra' | 'unsupported' | null (ingen).
   Først i de sætninger, tallene blev fundet i; ellers på hele siden. info får
   det omstridte ord i påstanden (term) og stedet i kilden (src).
   Prioritet skal kilden bekræfte; om en kaution er personlig, er kun en fejl,
   hvis kilden siger det modsatte. */
function _citePolarity(claimTerms, body, units, allUnits, info) {
  if (!claimTerms.length) return null;
  const termsIn = (us) => [].concat.apply([], us.map(u => _citePolarTerms(body.slice(u.start, u.end)).map(x => Object.assign(x, { u }))));
  const supports = (c, x) => x.g === c.g && (x.v === c.v ? x.neg === c.neg : (c.neg && !x.neg));
  const contradicts = (c, x) => x.g === c.g && (x.v === c.v ? x.neg !== c.neg : (!c.neg && !x.neg));
  const phrase = (x) => {
    const t = body.slice(x.u.start, x.u.end);
    const a = Math.max(0, t.lastIndexOf(' ', Math.max(0, x.start - 22))), b = t.indexOf(' ', Math.min(t.length, x.end + 12));
    return (a > 0 ? '… ' : '') + t.slice(a, b < 0 ? t.length : b).replace(/\s+/g, ' ').trim() + (b >= 0 ? ' …' : '');
  };
  let verdict = 'ok';
  claimTerms.forEach(c => {
    if (verdict === 'contra') return;
    const near = termsIn(units);
    if (near.some(x => supports(c, x))) return;
    let bad = near.find(x => contradicts(c, x));
    if (!bad) {
      // På hele siden, også hen over linjeskift ("KAUTIONIST / Anders Christensen, cpr.nr.")
      const all = termsIn([{ start: 0, end: body.length }]);
      if (all.some(x => supports(c, x))) return;
      bad = all.find(x => contradicts(c, x));
    }
    if (info) info.term = c.text;
    if (bad) { verdict = 'contra'; if (info) info.src = phrase(bad); return; }
    if (c.g === 'rank') verdict = 'unsupported';
  });
  return verdict;
}

/* Påstanden, der skal kontrolleres: hele sætningen (text) og den del af den,
   hvis tal skal findes (from-to). For en etiket er det sætningen foran den. */
function _citeClaim(quote, label, ctx) {
  const before = (ctx.before || '').replace(/\u0001/g, ' '), after = (ctx.after || '').replace(/\u0001/g, ' ');
  const has = (x) => { const k = _citeTokens(x); return k.nums.length || k.codes.length; };
  if (!label) return { text: before + quote + after, from: before.length, to: before.length + quote.length };
  // (label: true nedenfor: tal efter en etiket er ikke en ekstra påstand)
  // Etikettens egne ord ("ansøgningen, afsnit 1.1") er ikke en del af påstanden
  const text = before + ' ' + after;
  if (has(before)) return { text, from: 0, to: before.length, label: true };
  if (has(after)) return { text, from: before.length + 1, to: text.length, label: true };
  return { text, from: 0, to: text.length, none: true, label: true };
}

/* Tidsord: måneder og årstal. En hel dato tæller med sin måned og sit år.
   → { months: [{ v, start, end, date? }], years: [...] } */
const _CITE_MONTH_WORD = /(?:^|[^a-zæøå])(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december|january|february|march|may|june|july|october|jan|feb|mar|apr|jun|jul|aug|sept|sep|okt|oct|nov|dec)(?![a-zæøå])/gi;
function _citeTime(text) {
  const dates = _citeDates(text || '');
  const inDate = (i) => dates.some(d => i >= d.start && i < d.end);
  const months = [], years = [];
  let m;
  _CITE_MONTH_WORD.lastIndex = 0;
  while ((m = _CITE_MONTH_WORD.exec(text || ''))) {
    const at = m.index + m[0].length - m[1].length;
    if (!inDate(at)) months.push({ v: _CITE_MONTHS[m[1].toLowerCase()], start: at, end: at + m[1].length });
  }
  const ry = /(?:^|[^\d.,])((?:19|20)\d\d)(?!\d|[.,]\d)/g;
  while ((m = ry.exec(text || ''))) {
    const at = m.index + m[0].length - 4;
    if (!inDate(at)) years.push({ v: +m[1], start: at, end: at + 4 });
  }
  dates.forEach(d => {
    const k = d.key.split('-');
    months.push({ v: +k[1], start: d.start, end: d.end, date: true });
    if (k[0] !== '*') years.push({ v: +k[0], start: d.start, end: d.end, date: true });
  });
  return { months, years };
}

/* Kolonnens år for et tal i en tabelrække: den nærmeste linje over rækken
   med mindst to årstal og uden decimaltal er kolonnehovedet ("2021  2022 ...").
   Tallet hører til det år, hvis højre kant står nærmest tallets. */
function _citeColYear(body, unit, p) {
  const numEnd = p.start + ((body.slice(p.start).match(/^[+\-−]?\d[\d.,]*/) || [''])[0].replace(/[.,]$/, '')).length;
  let end = unit.start - 1;
  for (let k = 0; k < 30 && end > 0; k++) {
    const start = body.lastIndexOf('\n', end - 1) + 1;
    const line = body.slice(start, end);
    const ys = [];
    const re = /(^|\s)((?:19|20)\d\d)[EBe]?(?=\s|$)/g;
    let m;
    while ((m = re.exec(line))) ys.push({ v: +m[2], end: m.index + m[0].length });
    if (ys.length >= 2 && !/\d,\d|\d\.\d{3}/.test(line)) {
      const col = numEnd - unit.start;
      const best = ys.slice().sort((a, b) => Math.abs(a.end - col) - Math.abs(b.end - col))[0];
      if (Math.abs(best.end - col) <= 6) return best.v;
      // Skæv justering: tæl kolonnerne fra højre
      const row = [];
      const rn = /[+\-−]?\d[\d.,]*/g;
      let q;
      const ut = body.slice(unit.start, unit.end);
      while ((q = rn.exec(ut))) row.push({ start: unit.start + q.index, end: unit.start + q.index + q[0].length });
      const i = row.findIndex(x => x.start <= p.start && x.end >= p.start + 1);
      const fromRight = i < 0 ? -1 : row.length - 1 - i;
      return fromRight >= 0 && fromRight < ys.length ? ys[ys.length - 1 - fromRight].v : null;
    }
    // Brødtekst afslutter søgningen: kolonnehovedet står i tabellen
    if (line.length > 90 && !/\S {3,}\S/.test(line)) break;
    end = start - 1;
  }
  return null;
}

/* Passer tallets tid? Står påstandens måned der, og har tabellen en kolonne
   med påstandens år, eller nævner sætningen påstandens år? En omsætning for
   2025 må ikke bekræftes af tallet i 2024-kolonnen. */
function _citeTimeOk(n, body, unit, p, page) {
  if (n.date) return true;
  if (n.months && n.months.length && page) {
    // Måneden afgøres af siden: står tallet sammen med påstandens måned et
    // sted, er det godt. Står det kun sammen med andre måneder, er det forkert
    // ("lavpunkt 0,93 i december", når kilden har 0,93 i oktober og november).
    // En række uden måned siger ingenting.
    const withN = page.units.filter(u => page.nums.some(q => q.start >= u.start && q.end <= u.end && _citeNumEq(n, q)));
    const ms = withN.map(u => _citeTime(body.slice(u.start, u.end)).months).filter(x => x.length);
    if (ms.length && !ms.some(x => n.months.every(m => x.some(y => y.v === m.v)))) return false;
  }
  if (n.years && n.years.length) {
    const want = n.years.map(y => y.v);
    if (unit.table) {
      const cy = _citeColYear(body, unit, p);
      if (cy != null) return want.includes(cy);
    }
    const ys = _citeTime(body.slice(unit.start, unit.end)).years;
    if (ys.length && !ys.some(y => want.includes(y.v))) return false;
  }
  return true;
}

/* Antal skrevet med ord eller tal foran et navneord: "ingen datterselskaber",
   "tre datterselskaber", "de to primære leverandører". → [{ n, noun, start, end }] */
const _CITE_COUNT = { ingen: 0, intet: 0, nul: 0, 'én': 1, 'ét': 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7, otte: 8, ni: 9, ti: 10,
  no: 0, none: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
function _citeCounts(text, digits) {
  const out = [];
  const low = (text || '').toLowerCase();
  const re = digits
    ? /(^|[^a-zæøå0-9,.\-±/])(ingen|intet|nul|én|ét|to|tre|fire|fem|seks|syv|otte|ni|ti|no|none|one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s+([a-zæøå]{5,})/g
    : /(^|[^a-zæøå0-9,.\-±/])(ingen|intet|nul|én|ét|to|tre|fire|fem|seks|syv|otte|ni|ti|no|none|one|two|three|four|five|six|seven|eight|nine|ten)\s+([a-zæøå]{5,})/g;
  let m;
  while ((m = re.exec(low))) {
    const start = m.index + m[1].length;
    out.push({ n: /\d/.test(m[2]) ? +m[2] : _CITE_COUNT[m[2]], noun: m[3], start, end: m.index + m[0].length });
    re.lastIndex = m.index + m[0].length - m[3].length;
  }
  return out;
}

/* Siger kilden et andet antal om det samme? "tre datterselskaber" mod
   "HAR INGEN DATTERSELSKABER". → null eller { term, src } */
function _citeCountContra(claimText, body) {
  const src = _citeCounts(body, true);
  const stem = (x) => x.slice(0, Math.max(5, x.length - 3));
  for (const c of _citeCounts(claimText, false)) {
    const same = src.filter(x => x.noun.startsWith(stem(c.noun)) || c.noun.startsWith(stem(x.noun)));
    if (same.length && !same.some(x => x.n === c.n)) {
      const x = same[0];
      return { term: claimText.slice(c.start, c.end), src: body.slice(x.start, x.end).replace(/\s+/g, ' ') };
    }
  }
  return null;
}

/* Årstal alene ("2021-2025") er tidsangivelser, ofte kolonneoverskrifter. De
   skal stå på siden, men kræver ikke et nøgleord i samme række. */
function _citeIsYear(n) {
  return !n.date && n.kind === 'n' && n.dec === 0 && n.v >= 1990 && n.v <= 2040 && /^\d{4}$/.test(n.raw);
}

/** Tallene i påstanden, med de nøgleord der hører til hvert tal */
function _citeClaimNums(claim, en) {
  const text = claim.text;
  const blank = (s) => s.replace(_CITE_REF_RE, m => ' '.repeat(m.length)).replace(_CITE_CODE_RE, m => ' '.repeat(m.length));
  const all = _citeNumbers(blank(text), en);
  // Et årstal inde i en dato tælles kun som datoen
  const nums = all.filter(n => !(!n.date && all.some(d => d.date && d.start === n.start))).sort((a, b) => a.start - b.start);
  const words = _citeWords(blank(text));
  const within = (a, b) => words.filter(w => w.start >= a && w.end <= b);
  const inRange = nums.filter(n => n.start >= claim.from && n.end <= claim.to);
  // Tal efter henvisningen i samme sætning uden egen kilde ("..., med GE
  // Vernova alene på 38 %") hører også til påstanden, hvis de står i kilden
  const after = claim.label ? [] : nums.filter(n => n.start >= claim.to && !_citeIsYear(n));
  after.forEach(n => { n.secondary = true; });
  const tw = _citeTime(blank(text));
  const bareM = tw.months.filter(x => !x.date), bareY = tw.years.filter(x => !x.date);
  // Tidsord gælder for tallet i samme led; er påstanden ét tal, gælder sætningens
  const single = !claim.label && inRange.filter(n => !_citeIsYear(n)).length === 1;
  const pick = (arr, a, b, self) => {
    const f = (lo, hi) => arr.filter(x => x.start >= lo && x.end <= hi && !(x.start >= self.start && x.end <= self.end));
    const r1 = f(a, b); if (r1.length) return r1;
    return single && !self.secondary ? f(0, text.length) : [];
  };
  const nonYear = nums.filter(x => !_citeIsYear(x));
  let prev = null;
  inRange.concat(after).forEach(n => {
    const i = nums.indexOf(n);
    const prevEnd = i > 0 ? nums[i - 1].end : 0;
    const nextStart = i < nums.length - 1 ? nums[i + 1].start : text.length;
    // Påstandens måned og år for netop dette tal
    const j = nonYear.indexOf(n);
    let tPrev = j > 0 ? nonYear[j - 1].end : 0, tNext = j >= 0 && j < nonYear.length - 1 ? nonYear[j + 1].start : text.length;
    if (claim.label) { tPrev = Math.max(tPrev, claim.from); tNext = Math.min(tNext, claim.to); }
    n.months = pick(bareM, tPrev, tNext, n);
    n.years = pick(bareY, tPrev, tNext, n);
    // Først påstandens egne ord foran tallet, så efter det, så det foregående tals
    const lo = n.secondary ? claim.to : claim.from, hi = n.secondary ? text.length : claim.to;
    let a = within(Math.max(prevEnd, lo), n.start).slice(-6);
    // Det sidste (eller eneste) tal får også ordene efter sig: "64 % af omsætningen"
    const lastOfKind = !inRange.some(m => m.start > n.start && !!m.date === !!n.date && m.kind === n.kind);
    if (!a.length || lastOfKind) {
      const stop = text.slice(n.end, Math.min(nextStart, hi)).search(/[;,]/);
      a = a.concat(within(n.end, stop >= 0 ? n.end + stop : Math.min(nextStart, hi)).slice(0, 4));
    }
    let fromCtx = false, weak = false;
    if (!a.length && prev && prev.anchors.length && !prev.weak) { a = prev.anchors; fromCtx = prev.fromCtx; }
    // Er påstanden kun et tal ("DKK 41,1 mio."), gælder sætningens ord omkring
    // den: de nærmeste foran, også forbi et tal ("vokset fra 19,4 til 41,1")
    if (!a.length) { a = within(0, n.start).slice(-6).concat(within(n.end, nextStart).slice(0, 3)); fromCtx = true; }
    if (!a.length) { a = words.slice(); weak = true; }
    n.anchors = a; n.weak = weak; n.fromCtx = fromCtx;
    prev = n;
  });
  // Tal, der må stå mellem nøgleord og tal i kilden: påstandens egne, og
  // sætningens, når nøgleordene er hentet fra sætningen
  inRange.concat(after).forEach(n => { n.allow = n.fromCtx || n.weak || n.secondary ? nums : inRange; });
  return inRange.concat(after);
}

/** Ordene i et stykke af kilden med placering */
function _citeToks(body, r) {
  const t = body.slice(r.start, r.end).toLowerCase();
  const out = [];
  const re = /[a-zæøåäöü]+/g;
  let m;
  while ((m = re.exec(t))) out.push({ s: m[0], start: r.start + m.index, end: r.start + m.index + m[0].length });
  return out;
}

/* Står tallet i en enhed sammen med et af sine nøgleord? I en tabellinje er
   rækkens tekst nok. I en sætning må der mellem nøgleord og tal kun stå tal,
   som påstanden selv nævner. */
function _citeAnchored(n, claimNums, body, unit, pageNums, page) {
  const uNums = pageNums.filter(p => p.start >= unit.start && p.end <= unit.end);
  const cands = uNums.filter(p => _citeNumEq(n, p));
  if (!cands.length) return null;
  // Kun forekomster med påstandens måned og år (kolonne) tæller
  const candsT = cands.filter(p => _citeTimeOk(n, body, unit, p, page));
  if (!candsT.length) return null;
  const toks = _citeToks(body, unit);
  // I en tabel tæller tabellens overskrift og kolonnehoved med
  if (unit.table && unit.block) [unit.block.head].concat(unit.block.caps).forEach(r => { if (r.start !== unit.start) toks.push.apply(toks, _citeToks(body, r)); });
  const hits = toks.filter(tk => n.anchors.some(a => _citeWordEq(a.w, tk.s)));
  if (!hits.length) return null;
  if (unit.table || n.weak) return { p: candsT[0], words: hits };
  // I en sætning skal nøgleordets nærmeste tal af samme slags være påstandens
  // tal. Tal, påstanden selv nævner, springes over ("80 % (DKK 3,6 mio.)").
  // Kun tal af samme slags konkurrerer: en dato ikke med et beløb, "30 dage"
  // ikke med en dato. Årstal er tidsangivelser.
  const kind = (x) => x.date ? 'date' : x.kind === 'amt' ? 'n' : x.kind;
  const same = uNums.filter(q => kind(q) === kind(n) && !_citeIsYear(q));
  const allow = (n.allow || claimNums).filter(c => c !== n);
  const ok = [];
  let hitP = null;
  hits.forEach(h => {
    const dist = (q) => q.start >= h.end ? q.start - h.end : h.start >= q.end ? h.start - q.end : 0;
    const near = same.slice().sort((a, b) => dist(a) - dist(b))
      .find(q => cands.includes(q) || !allow.some(c => _citeNumEq(c, q)));
    if (near && candsT.includes(near)) { ok.push(h); if (!hitP) hitP = near; }
  });
  return ok.length ? { p: hitP, words: ok } : null;
}

/** Stumper af op til k enheder i træk, mindste først */
function _citeWindows(units, k) {
  const out = [];
  for (let n = 1; n <= k; n++) {
    for (let i = 0; i + n <= units.length; i++) out.push({ start: units[i].start, end: units[i + n - 1].end, table: false });
  }
  return out;
}

/* Påstand uden tal: navne (egennavne, e-mails) eller de bærende ord. Grønt
   kræver, at de står i én og samme sætning eller række i kilden. */
function _citeCheckNames(body, text, units) {
  const names = _citeNames(text);
  const low = body.toLowerCase();
  const variants = (x) => { const v = [x.n]; if (/s$/.test(x.n)) v.push(x.n.slice(0, -1)); if (x.n.indexOf('-') > 0) v.push(x.n.split('-')[0]); return v.filter(n => n.length >= 3).map(n => n.toLowerCase()); };
  const found = [], missing = [];
  names.forEach(x => {
    if (variants(x).some(n => low.indexOf(n) >= 0)) found.push(x);
    else if (!x.opt) missing.push(x.n);
  });
  const strong = found.filter(x => !x.opt);
  if (!strong.length && !missing.length) return _citeCheckWords(body, text, units);
  if (missing.length) return { state: 'missing', hits: [], found: found.map(x => x.n), missing, basis: 'names', units: [] };
  // Den mindste stump (højst tre sætninger eller linjer i træk, f.eks. en
  // underskrift), der rummer alle navnene
  let best = null, bestN = -1;
  _citeWindows(units, 3).forEach(u => {
    const ut = low.slice(u.start, u.end);
    const k = strong.filter(x => variants(x).some(n => ut.indexOf(n) >= 0)).length;
    if (k > bestN) { best = u; bestN = k; }
  });
  const together = best && bestN === strong.length;
  const hits = [];
  const scope = together ? [best] : units;
  scope.forEach(u => {
    const ut = low.slice(u.start, u.end);
    found.forEach(x => variants(x).some(n => { const at = ut.indexOf(n); if (at >= 0) { hits.push([u.start + at, u.start + at + n.length]); return true; } return false; }));
  });
  return { state: together ? 'format' : 'context', hits, found: found.map(x => x.n), missing: [], basis: 'names', units: together ? [best] : [] };
}

/* Sidste udvej for en påstand uden tal og navne: de bærende ord. Står mindst
   tre af dem, og 70 % i alt, i samme sætning i kilden, er påstanden genfundet. */
const _CITE_STOP = ['prioritet', 'facilitet', 'ikke', 'efter', 'under', 'mellem', 'derfor', 'samtidig', 'selskabet', 'selskabets', 'nordhavn', 'hvilket', 'senest', 'desuden', 'blandt', 'nævner', 'største', 'mindste', 'herunder', 'samlet', 'samlede', 'ligger', 'bliver', 'består',
  'though', 'which', 'their', 'there', 'company', 'between', 'because', 'however', 'mentions', 'largest', 'including', 'overall', 'consists'];
function _citeCheckWords(body, text, units) {
  const low = body.toLowerCase();
  const words = Array.from(new Set((text || '').replace(_CITE_REF_RE, ' ').toLowerCase().split(/[^a-zæøå]+/)
    .filter(w => w.length >= 6 && !_CITE_STOP.includes(w))));
  if (words.length < 2) return { state: 'missing', hits: [], found: [], missing: [], basis: 'none', units: [] };
  const enough = (k) => k >= 2 && k / words.length >= (k >= 3 ? 0.7 : 0.99);
  const stemOf = (w) => w.slice(0, Math.max(4, w.length - 3));
  const inText = (s) => words.filter(w => s.indexOf(stemOf(w)) >= 0);
  const onPage = inText(low);
  let best = null, bestFound = [];
  _citeWindows(units, 2).forEach(u => { const f = inText(low.slice(u.start, u.end)); if (f.length > bestFound.length) { best = u; bestFound = f; } });
  const hitsIn = (u, ws) => ws.map(w => { const at = low.slice(u.start, u.end).indexOf(stemOf(w)); return [u.start + at, u.start + at + stemOf(w).length]; });
  if (best && enough(bestFound.length)) {
    return { state: 'format', hits: hitsIn(best, bestFound), found: bestFound, missing: words.filter(w => !bestFound.includes(w)), basis: 'words', units: [best] };
  }
  if (enough(onPage.length)) {
    return { state: 'context', hits: [], found: onPage, missing: [], basis: 'words', units: best ? [best] : [] };
  }
  return { state: 'missing', hits: [], found: onPage, missing: words.filter(w => !onPage.includes(w)), basis: 'words', units: [] };
}

/**
 * Kontrollér en henvisning mod siden den peger på.
 * cite: { doc, page (ref), quote, context: { before, after, row } }
 * → { state, idx, hits: [[start, slut]], found, missing, label, basis, elsewhere, claim, passages }
 * state: 'exact' | 'format' (grønt) | 'context' (tallene står der, men ikke
 * sammen med påstandens nøgleord) | 'contra' (kilden siger det modsatte) | 'missing'
 */
function checkCite(cite) {
  // Memoets engelske tekst skriver tal på engelsk; den danske og kilderne på dansk
  const r = _checkCiteOne(Object.assign({ en: MEMO_EN }, cite));
  // På engelsk er kilderne stadig danske. Kan den engelske formulering ikke
  // bekræftes, prøves memoets danske formulering af samme henvisning.
  if (r.state !== 'exact' && r.state !== 'format' && cite.alt) {
    const a = _checkCiteOne(Object.assign({}, cite, cite.alt, { en: false }));
    const rank = { exact: 4, format: 4, contra: 3, context: 2, missing: 1 };
    if ((rank[a.state] || 0) > (rank[r.state] || 0)) { a.viaDa = true; return a; }
  }
  return r;
}

/** Den samme henvisning i memoets danske udgave: { quote, context } eller null */
function citeTwinDa(el) {
  if (!MEMO_EN || !el) return null;
  const da = el.getAttribute('data-claim-da');
  if (da) return { quote: (el.textContent || '').trim(), context: { before: da + ' ', after: '', row: true, label: true } };
  const sec = el.closest('.memo-sec');
  if (!sec) return null;
  const key = sec.id.replace('ms-', '');
  const html = SEC_DA[key];
  if (!html) return null;
  const i = Array.from(sec.querySelectorAll('.memo-body .memo-cite')).indexOf(el);
  if (i < 0) return null;
  // Er den engelske sætning rettet, siger den danske skabelon ikke længere
  // det samme. Så kontrolleres kun den engelske tekst.
  const en = document.createElement('div');
  en.innerHTML = SEC[key] || '';
  const seed = en.querySelectorAll('.memo-cite')[i];
  const norm = (c) => [c.before, c.after].join(' / ').replace(/\s+/g, ' ').trim();
  if (!seed || (seed.textContent || '').trim() !== (el.textContent || '').trim() || norm(citeContext(seed)) !== norm(citeContext(el))) return null;
  const d = document.createElement('div');
  d.innerHTML = html;
  const twin = d.querySelectorAll('.memo-cite')[i];
  if (!twin || twin.getAttribute('data-doc') !== el.getAttribute('data-doc') || twin.getAttribute('data-page') !== el.getAttribute('data-page')) return null;
  return { quote: (twin.textContent || '').trim(), context: citeContext(twin) };
}

function _checkCiteOne(cite) {
  const doc = cite.doc;
  const pages = (doc && doc.pages) || [];
  const idx0 = Math.max(0, pages.findIndex(p => p.ref === cite.page));
  const quote = (cite.quote || '').trim();
  // I indstillingsboksen er henvisningen altid en etiket ("Ansøgning, s. 1")
  const label = !!(cite.context && cite.context.label) || _citeIsLabel(quote, doc, cite.page);
  const ctx = cite.context || {};
  const claim = _citeClaim(quote, label, ctx);
  // Til visning: "B1Underskrevet" (fed id foran teksten) får sit mellemrum
  const claimText = claim.text.slice(claim.from, claim.to).replace(/\s+/g, ' ').replace(/^[\s|·,;:(]+|[\s|·,;:(]+$/g, '')
    .replace(/\b([A-Z]\d{1,2})([A-ZÆØÅ][a-zæøå])/g, '$1 $2').replace(/\s*\(\s*\)/g, '').replace(/\s+([.,;])/g, '$1');
  const claimTerms = _citePolarTerms(claim.text, claim.from, claim.to);
  const claimRange = claim.text.slice(claim.from, claim.to);

  const onPage = (i) => {
    const body = (pages[i] && pages[i].body) || '';
    const units = _citeUnits(body);
    const unitOf = (pos) => units.find(u => pos >= u.start && pos < u.end);
    // 1) Ordret, hvis henvisningen er en påstand og ikke en etiket. Står der
    //    "ikke" lige foran i kilden, er det ikke det samme.
    if (!label) {
      const hit = findQuote(body, quote);
      if (hit && _citeWords(quote.replace(_CITE_NUM_RE, ' ')).length) {
        const u = unitOf(hit[0]);
        const negated = _CITE_NEG_BEFORE.test(body.slice(Math.max(0, hit[0] - 12), hit[0]).toLowerCase().replace(/\s+$/, '')) && !/^(ikke|not|no|uden)\b/i.test(quote);
        const polar = {};
        const pol = negated ? 'contra' : _citePolarity(claimTerms, body, u ? [u] : [], units, polar);
        if (negated) { polar.term = quote; polar.src = body.slice(Math.max(0, hit[0] - 12), hit[1]).replace(/\s+/g, ' ').trim(); }
        if (pol !== 'contra') return { state: 'exact', hits: [hit], found: [quote], missing: [], basis: 'quote', units: u ? [u] : [] };
        return { state: 'contra', hits: [hit], found: [quote], missing: [], basis: 'quote', units: u ? [u] : [], polar };
      }
    }
    // 2) Påstanden har ingen tal: navne eller bærende ord i samme sætning
    const tk = _citeTokens(claim.text.slice(claim.from, claim.to), cite.en);
    if (claim.none || (!tk.nums.length && !tk.codes.length)) {
      const r = _citeCheckNames(body, label ? claim.text : quote, units);
      if (r.state === 'format' || r.state === 'context') {
        const polar = {};
        const pol = _citePolarity(claimTerms, body, r.units, units, polar);
        const cc = _citeCountContra(claimRange, body);
        if (cc) { r.state = 'contra'; r.polar = cc; }
        else if (pol === 'contra') { r.state = 'contra'; r.polar = polar; }
        else if (pol === 'unsupported' && r.state === 'format') { r.state = 'context'; r.polar = polar; }
        // En engelsk formulering kan ikke bekræftes af navne og ord i en dansk
        // kilde. Den danske tvilling (hvis teksten er urørt) kan.
        else if (cite.en && r.state === 'format') r.state = 'context';
      }
      return r;
    }
    // 3) Tallene: hvert tal skal stå i samme sætning eller række som sine nøgleord
    const nums = _citeClaimNums(claim, cite.en);
    const pageNums = _citeNumbers(body);
    const hits = [], found = [], missing = [], used = [];
    let looseN = [];
    nums.forEach(n => {
      const any = pageNums.filter(p => _citeNumEq(n, p));
      // Et tal efter henvisningen, som ikke står i kilden, kan have en anden kilde
      if (!any.length) { if (!n.secondary) missing.push(n.raw); return; }
      found.push(n.raw);
      if (_citeIsYear(n)) { any.slice(0, 3).forEach(p => hits.push([p.start, p.end])); return; }
      let a = null;
      for (const u of units) { a = _citeAnchored(n, nums, body, u, pageNums, { units, nums: pageNums }); if (a) { if (!used.includes(u)) used.push(u); break; } }
      if (a) { hits.push([a.p.start, a.p.end]); a.words.forEach(w => hits.push([w.start, w.end])); }
      else looseN.push(n);
    });
    /* Tal, der står sammen i samme sætning eller tabel, bekræfter hinanden
       ("30 mdr., 1. november 2026 til 30. april 2029"), når tallets egne
       nøgleord ikke står der. Står de der, men ud for et andet tal, er det
       netop den forkerte sammenhæng. Tal af samme slags skal stå i samme
       rækkefølge som i påstanden. */
    const kindOf = (x) => x.date ? 'date' : x.kind;
    const scopes = units.filter(u => !u.table).concat(Array.from(new Set(units.filter(u => u.table).map(u => u.block))));
    // På engelsk kan nøgleordene ikke findes i den danske kilde, så deres
    // fravær beviser intet; der klarer den danske tvilling bekræftelsen
    looseN = cite.en ? looseN : looseN.filter(n => {
      const others = nums.filter(m => m !== n && !m.secondary && !_citeIsYear(m) && !_citeNumEq(m, n) && !_citeNumEq(n, m));
      for (const S of scopes) {
        const inS = (x) => pageNums.filter(p => p.start >= S.start && p.end <= S.end && _citeNumEq(x, p));
        const unitOf = (p) => units.find(u => p.start >= u.start && p.end <= u.end) || S;
        const nPos = inS(n).filter(p => _citeTimeOk(n, body, unitOf(p), p, { units, nums: pageNums }));
        if (!nPos.length) continue;
        if (!n.weak && _citeToks(body, S).some(tk => n.anchors.some(a => _citeWordEq(a.w, tk.s)))) continue;
        const ok = others.some(m => {
          const mPos = inS(m);
          if (!mPos.length) return false;
          if (kindOf(m) !== kindOf(n)) return true;
          const mFirst = m.start < n.start;
          return mPos.some(a => nPos.some(b => mFirst ? a.start < b.start : a.start > b.start));
        });
        if (ok) {
          nPos.slice(0, 1).forEach(p => hits.push([p.start, p.end]));
          units.filter(u => u.start >= S.start && u.end <= S.end && nPos.some(p => p.start >= u.start && p.end <= u.end)).forEach(u => { if (!used.includes(u)) used.push(u); });
          return false;
        }
      }
      return true;
    });
    /* Dokumentets hovedbeløb: står påstandens ord i dokumentets titel
       ("LØSØREPANTEBREV"), og er tallet det første af sin slags på siden
       (hovedstolen), hører de sammen */
    const titleEnd = body.indexOf('\n') < 0 ? body.length : body.indexOf('\n');
    const titleToks = _citeToks(body, { start: 0, end: titleEnd });
    const claimWords = _citeWords(claimRange);
    looseN = looseN.filter(n => {
      if (n.secondary || cite.en) return true;
      if (!titleToks.some(tk => claimWords.some(a => _citeWordEq(a.w, tk.s)))) return true;
      const kind = (x) => x.date ? 'date' : x.kind === 'amt' ? 'n' : x.kind;
      // (for en dato: dokumentets første dato, f.eks. tillæggets dato)
      const first = pageNums.filter(q => q.start > titleEnd && (n.date ? !!q.date : !q.date && q.kind === n.kind && (q.kind !== 'n' || Math.abs(q.v) >= 1000)))
        .sort((a, b) => a.start - b.start)[0];
      const fu = first && units.find(x => first.start >= x.start && first.end <= x.end);
      if (first && _citeNumEq(n, first) && fu && _citeTimeOk(n, body, fu, first, { units, nums: pageNums })) { hits.push([first.start, first.end]); const u = units.find(x => first.start >= x.start && first.end <= x.end); if (u && !used.includes(u)) used.push(u); return false; }
      return true;
    });
    /* Et tal efter henvisningen uden egen kilde er kun et problem, når et navn
       ved tallet ("Vestas alene på 38 %") i kilden står ud for et andet tal */
    looseN = looseN.filter(n => {
      if (!n.secondary) return true;
      // Kun et navn lige foran tallet ("Vestas alene på 38 %") er tallets ejer
      const names = n.anchors.filter(a => a.name && a.end <= n.start && n.start - a.end <= 25);
      if (!names.length) return false;
      const kind = (x) => x.date ? 'date' : x.kind === 'amt' ? 'n' : x.kind;
      return units.some(u => _citeToks(body, u).some(tk => names.some(a => _citeWordEq(a.w, tk.s))) &&
        pageNums.some(q => q.start >= u.start && q.end <= u.end && kind(q) === kind(n) && !_citeIsYear(q) && !_citeNumEq(n, q)));
    });
    const loose = looseN.map(n => n.raw);
    looseN.forEach(n => pageNums.filter(p => _citeNumEq(n, p)).slice(0, 6).forEach(p => hits.push([p.start, p.end])));
    tk.codes.forEach(c => {
      const at = body.indexOf(c);
      if (at >= 0) { found.push(c); hits.push([at, at + c.length]); } else missing.push(c);
    });
    const basis = label ? (ctx.row ? 'row' : 'sentence') : 'quote';
    if (missing.length) {
      // Hvad står der i kilden ud for påstandens nøgleord (samme række, samme år)?
      const suggest = [];
      nums.filter(n => !n.secondary && missing.includes(n.raw) && !n.date && !_citeIsYear(n)).forEach(n => {
        const kind = (x) => x.kind === 'amt' ? 'n' : x.kind;
        for (const u of units) {
          const toks = _citeToks(body, u);
          const hitsU = toks.filter(tk => n.anchors.some(a => _citeWordEq(a.w, tk.s)));
          if (!hitsU.length) continue;
          const qs = pageNums.filter(q => q.start >= u.start && q.end <= u.end && !q.date && !_citeIsYear(q) && kind(q) === kind(n));
          if (!qs.length) continue;
          let q = null;
          if (u.table && n.years && n.years.length) q = qs.find(x => n.years.some(y => y.v === _citeColYear(body, u, x)));
          if (!q) q = qs.slice().sort((a, b) => Math.min(...hitsU.map(h => Math.abs(a.start - h.end))) - Math.min(...hitsU.map(h => Math.abs(b.start - h.end))))[0];
          if (q) { suggest.push({ claim: n.raw, src: body.slice(q.start, q.end).trim() }); hits.push([q.start, q.end]); if (!used.includes(u)) used.push(u); break; }
        }
      });
      return { state: 'missing', hits: suggest.length ? hits : [], found, missing, basis, units: suggest.length ? used.slice(0, 2) : [], suggest };
    }
    const looseUnits = loose.length ? units.filter(u => pageNums.some(p => p.start >= u.start && p.end <= u.end && nums.some(n => loose.includes(n.raw) && _citeNumEq(n, p)))).slice(0, 3) : [];
    const polar = {};
    const pol = _citePolarity(claimTerms, body, used, units, polar);
    const cc = _citeCountContra(claimRange, body);
    if (cc) return { state: 'contra', hits, found, missing: [], loose, basis, units: used.length ? used : looseUnits, polar: cc };
    if (pol === 'contra') return { state: 'contra', hits, found, missing: [], loose, basis, units: used.length ? used : looseUnits, polar };
    if (loose.length || pol === 'unsupported' || (!used.length && nums.some(n => !_citeIsYear(n)))) {
      // Vis først, hvor de løse tal står
      return { state: 'context', hits, found, missing: [], loose, basis, units: looseUnits.concat(used.filter(u => !looseUnits.includes(u))).slice(0, 3), polar: pol === 'unsupported' ? polar : null };
    }
    return { state: 'format', hits, found, missing: [], basis, units: used };
  };

  const res = onPage(idx0);
  res.idx = idx0;
  res.label = label;
  res.claim = claimText;
  const body0 = (pages[idx0] && pages[idx0].body) || '';
  res.passages = (res.units || []).map(u => body0.slice(u.start, u.end).replace(/\s+/g, ' ').trim()).filter(Boolean);
  // Står det på en anden side i samme dokument, så sig hvor
  res.elsewhere = -1;
  if (res.state === 'missing' && res.basis !== 'none') {
    for (let i = 0; i < pages.length; i++) {
      if (i === idx0) continue;
      const o = onPage(i).state;
      if (o === 'exact' || o === 'format') { res.elsewhere = i; break; }
    }
  }
  return res;
}

/* Dokumentregistret (DATA.DOCS) er det, der står under Dokumenter. En
   henvisning til en fil, der ikke står der, kan komitéen ikke slå op. */
function memoDocInCase(name) {
  const docs = (window.DATA && Array.isArray(DATA.DOCS)) ? DATA.DOCS : null;
  if (!docs) return true;
  return docs.some(d => d && (d.name === name || d.fileName === name));
}

/* Henvisningens tilgængelige navn begynder med den synlige tekst (WCAG 2.5.3),
   og kilden følger efter: "DKK 41,1 mio., kilde: Aarsrapport 2025, s. 9". */
function memoCiteName(visible, doc, page, noDoc) {
  const file = String(doc || '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
  return String(visible || '').replace(/\s+/g, ' ').trim() + ', ' + t('kilde') + ': ' + file + (page ? ', ' + memoRefLabel(page) : '') +
    (noDoc ? '. ' + t('Dokumentet findes ikke i sagen') : '');
}

/* Kildeviserens udfald for en henvisning i memoet: 'missing' | 'contra' | andet.
   Huskes pr. henvisning og tekst, så en hel gennemgang af memoet er billig. */
const _citeStateCache = new Map();
function memoCiteCheckState(el) {
  const doc = (window.CASE_DOCS || []).find(d => d.name === el.getAttribute('data-doc'));
  if (!doc) return null;
  const ctx = citeContext(el);
  const key = (MEMO_EN ? 'en|' : 'da|') + doc.name + '|' + el.getAttribute('data-page') + '|' + el.textContent + '|' + ctx.before + '|' + ctx.after;
  if (_citeStateCache.has(key)) return _citeStateCache.get(key);
  let st = null;
  try { st = checkCite({ doc, page: el.getAttribute('data-page'), quote: (el.textContent || '').trim(), context: ctx, alt: citeTwinDa(el) }).state; } catch (e) { st = null; }
  if (_citeStateCache.size > 2000) _citeStateCache.clear();
  _citeStateCache.set(key, st);
  return st;
}

/** Gør én henvisning til en knap for tastatur og skærmlæser, og markerer den, hvis dokumentet mangler i sagen. */

function decorateCite(el) {
  if (window.CW_SOURCE_VIEW !== true) {
    ['role', 'tabindex', 'aria-label', 'data-nodoc', 'data-check'].forEach(a => el.removeAttribute(a));
    return;
  }
  const doc = el.getAttribute('data-doc') || '';
  const page = el.getAttribute('data-page') || '';
  const inCase = memoDocInCase(doc);
  // Ikke fundet eller modsagt i kilden: en diskret markering (attribut og CSS,
  // ingen ny tekst), så et rettet tal ikke ser normalt ud. Grønt og "kontrollér
  // sammenhængen" markeres ikke.
  const st = memoCiteCheckState(el);
  const bad = st === 'missing' || st === 'contra' ? st : null;
  const label = memoCiteName(el.textContent, doc, page, !inCase) + (bad ? '. ' + (bad === 'contra' ? t('Kilden siger det modsatte') : t('Ikke bekræftet i kilden')) : '');
  if (el.getAttribute('role') !== 'button') el.setAttribute('role', 'button');
  if (el.getAttribute('tabindex') !== '0') el.setAttribute('tabindex', '0');
  if (el.getAttribute('aria-label') !== label) el.setAttribute('aria-label', label);
  if (inCase) el.removeAttribute('data-nodoc'); else el.setAttribute('data-nodoc', '1');
  if (bad) { if (el.getAttribute('data-check') !== bad) el.setAttribute('data-check', bad); } else el.removeAttribute('data-check');
}
function decorateCites(root) {
  if (!root) return;
  root.querySelectorAll('.memo-cite').forEach(decorateCite);
}

// Modul-eksport
export { _normWithMap, _isPhrase, findQuote, _CITE_MONTHS, _CITE_REF_RE, _CITE_CODE_RE, _CITE_LABEL_WORDS,
  _citeStem, _citeIsLabel, _citeParseNum, _CITE_NUM_RE, _CITE_DATE_DA, _CITE_DATE_EN, _CITE_DATE_NUM,
  _citeDates, _citeNumbers, _citeNumEq, _CITE_ABBR_MID, _CITE_ABBR_END, _citeIsBoundary, citeContext,
  _citeTokens, _citeNames, _citeUnits, _CITE_STOPW, _citeWords, _citeWordEq, _CITE_POLAR, _CITE_NEG_BEFORE,
  _CITE_NEG_AFTER, _citePolarTerms, _citePolarity, _citeClaim, _CITE_MONTH_WORD, _citeTime, _citeColYear,
  _citeTimeOk, _CITE_COUNT, _citeCounts, _citeCountContra, _citeIsYear, _citeClaimNums, _citeToks,
  _citeAnchored, _citeWindows, _citeCheckNames, _CITE_STOP, _citeCheckWords, checkCite, citeTwinDa,
  _checkCiteOne, memoDocInCase, memoCiteName, _citeStateCache, memoCiteCheckState, decorateCite, decorateCites };
