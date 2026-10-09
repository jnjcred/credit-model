// Migration: memo_handoff.jsx' logik uden UI er flyttet uændret hertil ved overgangen til Vue.
// Siden selv er src/views/memo/MemoHandoff.vue (før WSMemoHandoff og HandoffRow).
//
// bootstrap.js importerer filen på memo_handoff.jsx' gamle plads: efter domain/financials, som
// sætter window.CW_EXPORT_DOCS, og domain/documents. Det eneste, der sker ved indlæsning, er
// registreringen nederst: vejledningen 00_README_for_AI.md lægges i window.CW_EXPORT_DOCS (kom den
// før financials, ville listen blive erstattet, og vejledningen forsvinde).
//
// memo_handoff.jsx var et klassisk script og læste andre filers navne som globale navne, når
// hjælperne blev kaldt: docFromUpload og docCanGet (src/domain/documents.js), finAiAnyEdited
// (src/domain/financials) og PORTAL_CONTACT (src/domain/new_case_portal.js, der indlæses efter
// denne fil). Udbyderne lægger dem stadig på window, og de læses den vej, som før; filen importerer
// dem ikke, så opstartsrækkefølgen er uændret. CW, DATA og t læses også fra window.
//
// Ikke flyttet hertil: komponenterne WSMemoHandoff og HandoffRow (nu MemoHandoff.vue) og
// window.WSMemoHandoff (sagen importerer komponenten direkte). Nyt er kun denne indledning,
// global-kommentaren til ESLint og eksporten nederst.
//
// Credit memo i piloten (CW_MEMO_MODE 'copilot', case_facts.js): EIFO skriver
// memoet i Word med Copilot. Siden samler sagens materiale, så rådgiveren kan
// hente det hele og fortsætte dér: kundens og bankens filer, de offentlige data
// og Crediwires egne eksporter (financials.jsx, CW_EXPORT_DOCS). Det indbyggede
// memo (memo.jsx) er gemt uændret og slås til i Tweaks.
//
// Hentning genbruger Dokumenter-fanens hjælpere (documents.jsx: docFromUpload,
// docCanGet, docGet, docKey, docDay, docPages, docMeta). Hvad der er hentet,
// gemmes i sagens tilstand som handoff = { at, keys }, så Overblik kan vise det.

/* global docFromUpload, docCanGet, finAiAnyEdited, PORTAL_CONTACT */

function hoFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

// Sagens materiale i tre grupper. Afviste uploads og erstattede versioner er ikke med.
function hoGroups() {
  const ups = CW.allUploads().map(docFromUpload).filter(d => d.itemStatus !== 'rejected');
  const src = (DATA.DOCS || []).filter(d => !d.superseded);
  const all = ups.concat(src);
  const byDate = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));
  return [
    { key: 'case', label: 'Dokumenter fra kunden', icon: 'FileText', items: all.filter(d => d.fileId || (d.origin !== 'public' && d.origin !== 'export')).sort(byDate) },
    { key: 'public', label: 'Offentlige data', icon: 'Globe', items: all.filter(d => !d.fileId && d.origin === 'public').sort(byDate) },
    // Vejledningen til den videre AI står først
    { key: 'export', label: 'Fra Crediwire', icon: 'BarChart', items: all.filter(d => !d.fileId && d.origin === 'export').sort((a, b) => (b.name === HO_GUIDE_NAME) - (a.name === HO_GUIDE_NAME)) },
  ];
}

// Gem, hvad der er hentet. all: hele materialet er hentet nu (tidspunktet vises på Overblik).
function hoMark(keys, all) {
  const h = CW.caseState().handoff || {};
  const set = new Set(h.keys || []);
  keys.forEach(k => set.add(k));
  CW.setCaseState({ handoff: { at: all ? new Date().toISOString() : (h.at || null), keys: Array.from(set) } });
}

/* ─────────────────────────────────────────────────────────────────────────────
   00_README_for_AI.md: vejledning til den AI (f.eks. Copilot), der skal læse sagens
   materiale og hjælpe rådgiveren med credit memoet. Bygges, når den hentes, ud af
   præcis de filer, som "Hent alle" henter (hoGroups), så listen altid passer.
   Står under Dokumenter og først i gruppen "Fra Crediwire" på Credit memo.

   Valg (5. oktober 2026, version 2):
   - Engelsk uanset appens sprog: læseren er en AI, og modeller følger
     instruktioner bedst på engelsk. Sagens filer er danske, så de danske fagord
     står med en ordliste, og memoet bedes skrevet på dansk.
   - README-navn med 00_ foran: den gængse "læs først"-fil, sorteret øverst.
   - Kort og faktuel: metadata øverst, fire principper med begrundelse, en
     filoversigt som tabel, fakta om tallene, ordliste og kendte uoverensstemmelser.
     Ingen fast læserækkefølge eller afsnitsskabelon, så den videre AI og
     rådgiveren selv kan styre arbejdet.
   ──────────────────────────────────────────────────────────────────────────── */
const HO_GUIDE_NAME = '00_README_for_AI.md';

// Hvad hver slags fil er, og hvor meget den kan bære: [hvad, pålidelighed]
const HO_TYPE_INFO = {
  'Årsrapport':      ['Annual report (årsrapport) published in the Danish business register (CVR); notes and management review included', 'Primary source for historical figures. Check the auditor\'s report for the level of assurance'],
  'Periodetal':      ['Interim figures (periodetal) from the company\'s accounting system', 'Company-provided, unaudited'],
  'Budget':          ['Budget with assumptions; may contain a version log', 'Company-provided, unaudited. Use the latest version'],
  'Låneaftale':      ['Loans and credit facilities: terms, interest, repayments, covenants', 'Agreement or company overview; check against the annual report notes'],
  'Sikkerhed':       ['Security: mortgages, guarantees, ranking', 'Bank document'],
  'Kontrakt':        ['Contract with a customer or partner', 'Company-provided'],
  'Marked':          ['External market report', 'Third party; background'],
  'Salg':            ['Sales breakdown, e.g. by country or customer', 'Company-provided, unaudited'],
  'Præsentation':    ['Company presentation or business plan', 'The company\'s own description'],
  'Selskab':         ['Company document, e.g. register of shareholders (ejerbog) or articles', 'Company-provided'],
  'Ansøgning':       ['The bank\'s application to EIFO: facility, amount, purpose, term, conditions', 'Bank document; defines what is applied for'],
  'Ratingberegning': ['Output of EIFO\'s rating model', 'EIFO model output; quote it rather than recalculate'],
};
// Crediwires egne eksporter (financials.jsx) efter filnavn: [hvad, pålidelighed]
function hoExportInfo(name) {
  if (/^Regnskabstabel/i.test(name)) return ['Financial table compiled by Crediwire. Sheet Regnskab: 2023-2025, 2026E, 2027B in DKK thousands. Sheet Kvartaler: quarters behind 2026E/2027B. Sheet Noter: method, sources and the adviser\'s corrections', 'Derived from the annual reports, interim figures and budget'];
  if (/^Produkt_marked/i.test(name)) return ['Product, market and industry summary', 'AI-generated in Crediwire and not checked against sources; background only' + (typeof finAiAnyEdited === 'function' && finAiAnyEdited() ? '. Parts are edited by the adviser (marked in the file)' : '')];
  if (/^Trustpilot/i.test(name)) return ['Trustpilot score, distribution and latest reviews as retrieved', 'Unverified reviews; soft signal'];
  if (/^Ejerskab/i.test(name)) return ['Owners from the register of beneficial owners, warrants, board with PEP check, management, group relations', 'Derived from CVR and the register of shareholders'];
  if (/^Virksomhedsprofil/i.test(name)) return ['Company master data and the case\'s product and amount', 'Derived from CVR and the case'];
  return ['File from Crediwire', 'Derived'];
}

// 3600000 -> "3.6" (engelsk talformat i vejledningen)
const hoMio = (v) => (Math.round(v / 1e5) / 10).toFixed(1);

function hoGuideMarkdown() {
  const co = DATA.COMPANY || {};
  const iso = DATA.fmt.isoDay(new Date());
  const groups = hoGroups().map(g => ({ ...g, items: g.items.filter(d => d.name !== HO_GUIDE_NAME && docCanGet(d)) }));
  const all = groups.flatMap(g => g.items);
  const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const ymd = (d) => (d.fileId ? String(d.at || '').slice(0, 10) : String(d.date || '').slice(0, 10)) || '';
  const fac = window.CASE_FACTS && window.CASE_FACTS.facility || {};
  const adviser = typeof PORTAL_CONTACT !== 'undefined' ? PORTAL_CONTACT.name + ', ' + PORTAL_CONTACT.org : 'EIFO';
  const out = [];
  const p = (...lines) => out.push(...lines);

  // Metadata øverst (maskinlæsbart)
  p('---',
    'purpose: Guide to the case material for an AI assistant drafting a credit memo',
    'company: ' + co.name,
    'cvr: "' + co.cvr + '"',
    'case_number: "' + co.caseNr + '"',
    'product: ' + (fac.eifoAmount
      ? (fac.instrumentEn || 'EIFO export guarantee') + ', DKK ' + hoMio(fac.eifoAmount) + ' million'
        + (fac.facilityAmount ? ' (' + Math.round((fac.eifoShare || 0) * 100) + "% of the bank's DKK " + hoMio(fac.facilityAmount) + ' million facility)' : '')
      : [co.caseType, co.amount].filter(Boolean).join(', ')),
    'adviser: ' + adviser,
    'prepared: ' + iso,
    'files: ' + all.length,
    'source_language: Danish',
    'memo_language: Danish',
    '---', '');

  p('# Case material: ' + co.name + ' (case ' + co.caseNr + ')', '');
  p('You are helping a credit adviser at EIFO (the Danish Export and Investment Fund) draft a credit memo in Word. This folder holds the case material exported from Crediwire on ' + iso + '. This file lists what each file is and how far it can be trusted. The other files are in Danish; a glossary is at the end.', '');

  p('## Principles', '');
  p('- Base the memo on these files and on what the adviser tells you. When something is not in the material, say so instead of estimating: the memo goes to a credit committee that relies on it.');
  p('- Cite file and page, sheet or note for figures, e.g. (Aarsrapport_2025.pdf, s. 6), so the adviser can verify them quickly.');
  p('- When sources disagree, show both. Known discrepancies are listed below.');
  p('- The adviser owns the assessment, rating and recommendation. Draft in Danish and follow the adviser\'s template.', '');

  p('## Files', '');
  p('| File | What it is | Source, date | Reliability |', '|---|---|---|---|');
  all.forEach(d => {
    const isExport = d.origin === 'export';
    const info = isExport ? hoExportInfo(d.name) : (HO_TYPE_INFO[d.type] || ['Document on the case', '']);
    let src = isExport ? 'Crediwire, ' + iso
      : d.fileId ? (d.by === 'rådgiver' ? 'Uploaded by the adviser' : 'Uploaded by the customer') + (d.itemLabel ? ' for "' + d.itemLabel + '"' : '') + (ymd(d) ? ', ' + ymd(d) : '')
      : (d.sourceLabel || '') + (ymd(d) ? ', ' + ymd(d) : '');
    if (d.fileId && d.itemStatus && d.itemStatus !== 'approved') src += ' (not yet reviewed by the adviser)';
    p('| ' + cell(d.name) + ' | ' + cell(info[0]) + ' | ' + cell(src) + ' | ' + cell(info[1]) + ' |');
  });
  p('');

  // Rådgiverens interne noter til materialet (aldrig set af kunden); står på dansk, som rådgiveren skrev dem
  const inotes = (() => {
    try {
      const all = (CW.KEYS && CW.KEYS.internalNotes && JSON.parse(localStorage.getItem(CW.KEYS.internalNotes) || '{}')) || {};
      return Object.keys(all).map(id => {
        const it = CW.itemById ? CW.itemById(id) : null;
        const st = CW.itemState ? CW.itemState(id) : null;
        return { id, label: it ? it.label : id, status: st && st.status, ...all[id] };
      }).filter(n => n.text && String(n.text).trim());
    } catch (e) { return []; }
  })();
  if (inotes.length) {
    p('## Adviser notes on the material', '');
    p('Internal notes the adviser wrote in Crediwire on individual items. The customer has not seen them. They are in Danish. Treat them as the adviser own comments and take them into account in the memo.', '');
    inotes.forEach(n => {
      const st = n.status === 'approved' ? 'approved by the adviser' : n.status === 'received' || n.status === 'noted' ? 'received, not yet reviewed' : n.status === 'rejected' ? 'rejected, customer asked to resend' : 'not received';
      p('- **' + n.label + '** (' + st + (n.by ? '; ' + n.by : '') + (n.at ? ', ' + String(n.at).slice(0, 10) : '') + '): ' + String(n.text).replace(/\s+/g, ' ').trim());
    });
    p('');
  }

  p('## Reading the figures', '');
  p('- Amounts are in DKK. The financial table (Regnskabstabel) is in DKK thousands; the annual reports use t.DKK (thousands).');
  p('- 2026E = January-August actuals plus budget for September-December. 2027B = budget for Q1-Q3 2027 only (9 months), so it is not comparable with a full year.');
  p('- In the Kvartaler sheet, the Jul-aug column covers two months and the balance sheet is at 31 August.');
  p('- Budget, interim figures and other company-provided numbers are unaudited.');
  p('- File names are written without æ, ø and å (aa = å, ae = æ, oe = ø), e.g. Aarsrapport = Årsrapport.', '');

  const conflicts = ((window.CASE_FACTS && window.CASE_FACTS.conflicts) || []).filter(c => c && (c.textEn || c.text));
  if (conflicts.length) {
    p('## Known discrepancies', '');
    p('Registered by the adviser in Crediwire, with how each is handled. "The memo" means the credit memo.', '');
    conflicts.forEach((c, i) => {
      p((i + 1) + '. ' + (c.textEn || c.text));
      const h = c.handlingEn || c.handling;
      if (h) p('   Handling: ' + h);
    });
    p('');
  }

  p('## Danish terms', '');
  p('| Danish | English |', '|---|---|');
  [
    ['årsrapport, note, ledelsesberetning, påtegning', 'annual report, note, management review, auditor\'s report'],
    ['periodetal, saldobalance', 'interim figures, trial balance'],
    ['resultatopgørelse, balance, egenkapital', 'income statement, balance sheet, equity'],
    ['ejerbog, anpartshaverlån, kapitalforhøjelse', 'register of shareholders, shareholder loan, capital increase'],
    ['driftskredit, realkreditlån, ejerpantebrev, kaution', 'overdraft facility, mortgage loan, owner\'s mortgage deed, guarantee'],
    ['eksportkaution, facilitet, ansøgning', 'export guarantee, facility, application'],
    ['t.kr. / t.DKK, mio. kr., s., ark', 'DKK thousands, DKK million, page, sheet'],
  ].forEach(r => p('| ' + r[0] + ' | ' + r[1] + ' |'));
  p('');
  return out.join('\n');
}

// Vejledningen står sammen med Crediwires andre eksporter (Dokumenter og Credit memo)
(function () {
  if (!Array.isArray(window.CW_EXPORT_DOCS)) window.CW_EXPORT_DOCS = [];
  if (window.CW_EXPORT_DOCS.some(d => d && d.name === HO_GUIDE_NAME)) return;
  window.CW_EXPORT_DOCS.push({
    id: 'crediwire-readme-for-ai', name: HO_GUIDE_NAME, type: 'Crediwire-eksport', source: 'Crediwire', origin: 'export', period: '-',
    // lazy: registret læser ikke indholdet (vejledningen læser selv registret)
    lazy: true, size: '6 KB',
    get date() { return DATA.fmt.isoDay(new Date()); },
    get meta() { return t('Vejledning til den AI, der skal læse materialet'); },
    get pages() { return [{ ref: 's. 1', title: 'README for AI', body: hoGuideMarkdown() }]; },
  });
})();

// Modul-eksport til Vue-komponenten (src/views/memo/MemoHandoff.vue)
export { hoFill, hoGroups, hoMark, HO_GUIDE_NAME, HO_TYPE_INFO, hoExportInfo, hoMio, hoGuideMarkdown };
