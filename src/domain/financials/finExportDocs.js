// Fanen Virksomheden: Crediwires egne eksporter under Dokumenter. Flyttet ordret fra
// src/financials.jsx ved migrationen til Vue; kun import- og export-linjerne er nye. Selve
// window.CW_EXPORT_DOCS = [...] står i index.js, i samme rækkefølge som før (memo_handoff lægger
// sin AI-vejledning til bagefter). finSourceDoc bruges også af kilderne under regnskabstabellen.
import { FIN_ANNUAL_YEARS, FIN_ACTUAL_Q, FIN_BUDGET_SEP, FIN_BUDGET_Q, ANNUAL_REPORT, TRUSTPILOT } from './finData.js';
import { FIN_RATIOS, finRawValue, finEntryVal, finChildVal } from './finCalc.js';
import { FIN_MAPPED } from './finMapping.js';
import { FIN_EDIT_COL, FIN_POSTS, FIN_POST_ORDER, finApplyEdits, finAdvisor, finLoadEdits, finLoadNotes, finCommentsFor, finOrigOf, finPostValue, finEditName } from './finEdits.js';
import { finFill, finPublicDataDate, finShortDate, finLogNum } from './finFormat.js';
import { cvrEdit, cvrVal, cvrUpdated, CVR_FIELDS } from './finCvr.js';
import { MARKET_PEST, finAiState, finAiText } from './finAiTexts.js';

/* ─────────────────────────────────────────────────────────────────────────
   Crediwires egne eksporter under Dokumenter

   Samme indhold som sektionerne i fanen Virksomheden (regnskabstabel, produkt,
   marked og branche, Trustpilot, ejerskab og bindinger) plus stamdata, som filer
   rådgiveren kan hente og tage med over i Copilot, så et credit memo i Word kan
   skrives med alt materiale for sig. Filerne bygges ved hentning ud af de samme
   tal og tekster som siderne, så de ikke kan komme ud af takt. De ligger ikke i
   CASE_DOCS: det er memoets kildedokumenter, og eksporterne er afledt af dem.
   Hentes via CW.downloadDoc (pdf, og xlsx når navnet ender på .xlsx).
   ───────────────────────────────────────────────────────────────────────── */
const EX_TYPE = 'Crediwire-eksport';
const exClean = (s) => String(s == null ? '' : s).replace(/­/g, '').replace(/−/g, '-');
const exPad = (s, n) => { s = exClean(s); return s.length >= n ? s + ' ' : s + ' '.repeat(n - s.length); };
// Procent i PDF'erne, på det aktive sprog (Excel-arket bruger exNum)
const exPct = (v, dec) => exClean(DATA.fmt.num(v, dec == null ? 1 : dec)) + (window.CW_LANG === 'en' ? '%' : ' %');
const exCap = (s) => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
// Dansk talformat, som buildXlsx læser tilbage som tal: 41.100 og -0,27
function exNum(v, dec) {
  if (v == null || isNaN(v)) return '-';
  const r = Number(v.toFixed(dec));
  const parts = Math.abs(r).toFixed(dec).split('.');
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (r < 0 ? '-' : '') + int + (parts[1] ? ',' + parts[1] : '');
}
function exWrap(text, width) {
  const out = []; let line = '';
  exClean(text).split(/\s+/).filter(Boolean).forEach(w => {
    if (line && (line + ' ' + w).length > (width || 98)) { out.push(line); line = w; } else line = line ? line + ' ' + w : w;
  });
  if (line) out.push(line);
  return out.join('\n');
}
function exHead(title) { return exClean(title).toUpperCase(); }
const exToday = () => DATA.fmt.isoDay(new Date());
const exWhen = () => DATA.fmt.longDate(exToday());
const exCompanyLine = () => DATA.COMPANY.name + ' - CVR ' + DATA.COMPANY.cvr;

/* Kilderne under regnskabstabellen og i eksportens noter: kun dokumenter, der
   findes på sagen. Registret (DATA.DOCS) har årsrapporterne. Periodetal og budget
   kommer fra kunden og står som upload (CW.allUploads), når kunden har sendt dem.
   → { id, name } eller undefined */
const FIN_SOURCE_ITEM = { 'Periodetal': 'm-interim', 'Budget': 'm-budget' };
function finSourceDoc(type, year) {
  const reg = (DATA.DOCS || []).find(x => x.type === type && !x.superseded && (year == null || String(x.year) === String(year)));
  if (reg) return reg;
  const item = FIN_SOURCE_ITEM[type];
  const up = item && window.CW ? CW.allUploads().find(f => f.itemId === item && f.itemStatus !== 'rejected') : null;
  return up ? { id: up.id, name: up.name } : undefined;
}

/* Regnskabstabellen som tre ark: samlet tabel (år, 2026E, 2027B), kvartalerne og noter.
   Tal i DKK t.; nøgletal og forholdstal uskalerede. */
function exFinancialsPages() {
  // Samme tal som tabellen, med rådgiverens rettelser. Regnskab v5: eksportens kolonner er årene,
  // kvartalerne og budgettet; rettelser af en uploadet saldobalances periode (ytd) og en omsætning,
  // der kun er tastet ind for et år med offentlig årsrapport (fill), indgår ikke i dem og står ikke på listen.
  const edits = finLoadEdits().filter(x => x.colKey !== 'ytd' && !x.fill);
  const model = finApplyEdits(edits);
  const rawRows = model.rows;
  const rowByLabel = model.byLabel;
  const val = (row, col) => finRawValue(row, col);
  // Kommentarer til tallene kommer med som noter i cellerne i Excel: { r: række, c: kolonne (0-baseret), t: tekst, a: forfatter }
  const nts = finLoadNotes();
  const cmts = { main: [], qs: [] };
  const addC = (arr, r, ref, cols) => cols.forEach((c, i) => {
    if (!c.key) return;
    const cs = finCommentsFor(nts, edits, ref, c.key);
    if (cs.length) arr.push({ r, c: 1 + i, t: cs.map(x => (x.by ? x.by + (x.at ? ' (' + finShortDate(x.at) + ')' : '') + ': ' : '') + t(x.text)).join('\n'), a: cs[0].by || finAdvisor() });
  });
  const line = (cells) => cells.map(exClean).join('  ');
  const budgetWord = t('Budget').toLowerCase();
  // Note-kolonne: hvilke kolonner i rækken der er rettet
  const editNote = (ref, cols) => {
    const hit = cols.filter(c => c.key && model.map[ref + '|' + c.key]).map(c => c.head);
    return hit.length ? [t('rettet') + ': ' + hit.join(', ')] : [];
  };

  const mainCols = FIN_ANNUAL_YEARS.map((y, i) => ({ key: 'y' + i, kind: 'annual', idx: i, ann: 1, head: y }))
    .concat([
      { kind: 'est', ann: 1, head: '2026E (' + t('jan-aug + budget') + ')' },
      { kind: 'b9', ann: 4 / 3, head: '2027B (' + t('9 mdr. budget') + ')' },
    ]);
  // Kvartalerne i samme rækkefølge som tabellen: pr. år, med summen sidst i sit år
  const bCols = FIN_BUDGET_Q.map((p, i) => ({ key: 'b' + i, kind: 'b', idx: i, ann: 4, year: p.year, head: p.label + ' ' + p.year + ' (' + budgetWord + ')' }));
  const qCols = FIN_ACTUAL_Q.map((p, i) => ({ key: 'q' + i, kind: 'q', idx: i, ann: 12 / p.months, head: t(p.label) + ' ' + p.year + (p.partial ? ' (' + t('kun 2 mdr.') + ')' : '') }))
    .concat([{ key: 'bs', kind: 'bs', ann: 12, head: t(FIN_BUDGET_SEP.label) + ' ' + FIN_BUDGET_SEP.year + ' (' + budgetWord + ')' }])
    .concat(bCols.filter(c => c.year === '2026'))
    .concat([mainCols.find(c => c.kind === 'est')])
    .concat(bCols.filter(c => c.year === '2027'))
    .concat([mainCols.find(c => c.kind === 'b9')]);

  const ratioRows = (cols) => {
    const maps = cols.map(c => { const m = {}; rawRows.forEach(r => { m[r.label] = val(r, c); }); return m; });
    return FIN_RATIOS.map(r => line([t(r.label)].concat(cols.map((c, i) => {
      const v = r.calc(maps[i], c.ann);
      return v == null || isNaN(v) ? '-' : exNum(v, r.percent ? 1 : (r.decimals != null ? r.decimals : 1));
    }))));
  };
  const money = (v) => (v == null || isNaN(v) ? '-' : exNum(v * 1000, 0));

  // Ark 1: regnskabstabellen med detaljer (kun årene har detaljer)
  const isZero = (arr) => arr.every(v => v == null || v === 0);
  const entryVal = (e, col) => finEntryVal(e, col, rowByLabel, model.entryByLabel);
  const main = [
    DATA.COMPANY.name + ' - ' + t('Regnskab'),
    t('Beløb i DKK t. (tusinde kroner). Nøgletal i procent eller gange.'),
    '',
    line([t('Regnskabspost')].concat(mainCols.map(c => c.head)).concat(edits.length ? [t('Note')] : [])),
  ];
  model.layout.forEach(g => {
    main.push(line([t(g.label)]));
    g.entries.forEach(e => {
      if (!e.ref && !e.derive && isZero(e.vals || [])) return;
      const ref = e.ref || e.label;
      const r0 = main.length;
      main.push(line([t(e.label)].concat(mainCols.map(c => money(entryVal(e, c)))).concat(e.sum || e.derive ? [] : editNote(ref, mainCols))));
      if (!(e.sum || e.derive)) addC(cmts.main, r0, ref, mainCols);
      (e.children || []).forEach(c => {
        if (isZero(c.vals)) return;
        const r1 = main.length;
        main.push(line(['- ' + t(c.label)].concat(mainCols.map(col => money(finChildVal(c, col)))).concat(editNote(ref + ' / ' + c.label, mainCols))));
        addC(cmts.main, r1, ref + ' / ' + c.label, mainCols);
      });
    });
  });
  main.push(line([t('Nøgletal')]));
  ratioRows(mainCols).forEach(r => main.push(r));

  // Ark 2: kvartalerne bag 2026E og 2027B (rå poster og nøgletal)
  const qs = [
    DATA.COMPANY.name + ' - ' + t('Kvartaler'),
    FIN_MAPPED
      ? t('Realiseret 2026 efter kundens saldobalance fra e-conomic, mappet til Crediwires kategorier. Budget efter budgetversionen på sagen. Beløb i DKK t.')
      : t('Realiseret 2026 efter periodetal, budget efter budgetversionen på sagen. Beløb i DKK t.'),
    '',
    line([t('Regnskabspost')].concat(qCols.map(c => c.head)).concat(edits.length ? [t('Note')] : [])),
  ];
  ANNUAL_REPORT.groups.forEach(g => {
    qs.push(line([t(g.label)]));
    g.rows.forEach(r => {
      const rq = qs.length;
      qs.push(line([t(r.label)].concat(qCols.map(c => money(val(rowByLabel[r.label], c)))).concat(FIN_POSTS[r.label] ? editNote(r.label, qCols) : [])));
      if (FIN_POSTS[r.label]) addC(cmts.qs, rq, r.label, qCols);
    });
  });
  qs.push(line([t('Nøgletal')]));
  ratioRows(qCols).forEach(r => qs.push(r));

  // Ark 3: noter og kilder
  const docOf = finSourceDoc;
  const sources = FIN_ANNUAL_YEARS.map(y => docOf('Årsrapport', y)).concat([FIN_MAPPED ? { name: CW_MAP.FILE_NAME } : docOf('Periodetal'), docOf('Budget')]).filter(Boolean).map(d => d.name);
  // Rettelserne én pr. linje, i DKK t.
  const editLines = edits.slice()
    .sort((a, b) => (FIN_POST_ORDER.indexOf(a.rowRef) - FIN_POST_ORDER.indexOf(b.rowRef)) || (FIN_EDIT_COL[a.colKey].order - FIN_EDIT_COL[b.colKey].order))
    .map(x => finEditName(x.rowRef, x.colKey) + ': ' + finLogNum(finOrigOf(x)) + ' → ' + finLogNum(finPostValue(model, x.rowRef, FIN_EDIT_COL[x.colKey]))
      + ' (' + [x.by, finShortDate(x.at), x.reason ? t(x.reason) : ''].filter(Boolean).join(', ') + ')');
  const notes = [
    t('Noter til regnskabstabellen'),
    '',
    t('Sådan er tallene beregnet') + ':',
    t('2026E: januar-august realiseret plus budget for september og Q4, balanceposter ultimo Q4 2026. Tredje kvartal er ikke afsluttet; kolonnen Jul-aug dækker kun juli og august, og balancen er pr. 31. august. 2027B: budget for Q1-Q3, altså kun 9 måneder, balanceposter ultimo Q3 2027. Nøgletal er beregnet af tallene i samme kolonne; hvor perioden er kortere end et år, er EBITDA annualiseret i Gæld / EBITDA. Realiserede tal og budget er virksomhedens egne indberetninger og er ikke revideret.'),
    t('Egenkapital: primo plus årets resultat plus kapitalindskud. 2024: 3,5 + 0,7 + 0,6 = 4,8 mio. (årsrapport 2024, note 11).'),
    '',
    t('Kilder') + ': ' + sources.join(', '),
    (cmts.main.length || cmts.qs.length) ? t('Kommentarer til tallene står som noter i cellerne (hold musen over en celle med en rød trekant).') : '',
    edits.length ? t('Tal rettet manuelt af rådgiveren (DKK t.). Summer og nøgletal er regnet med de rettede tal:') : t('Ingen tal er rettet manuelt; tallene er kildernes.'),
    ...editLines,
    '',
    t('Eksporteret fra Crediwire') + ' ' + exWhen() + '.',
  ];

  const sheet = (ref, title, rows, comments) => ({ ref: 'ark ' + ref, title, body: rows.join('\n'), comments: comments || [] });
  return [
    sheet(t('Regnskab'), t('Regnskab'), main, cmts.main),
    sheet(t('Kvartaler'), t('Kvartaler'), qs, cmts.qs),
    sheet(t('Noter'), t('Noter og kilder'), notes),
  ];
}

// Rettet af rådgiveren? Så står det under teksten i eksporten (ellers null)
function exAiNote(id) {
  const s = finAiState(id);
  return s.edited != null ? '(' + finFill(t('Rettet af {who} - {date}'), { who: s.editedBy || '', date: CW.fmtDate(s.editedAt) }) + ')' : null;
}
// Rådgiverens kommentar til en tekst følger med, når teksten hentes til Credit memo
function exAiComment(id) {
  const s = finAiState(id);
  if (!s.note) return [];
  return ['', t('Rådgiverens kommentar') + ' (' + [s.noteBy, s.noteAt ? CW.fmtDate(s.noteAt) : ''].filter(Boolean).join(', ') + '):', exWrap(s.note)];
}
function exMarketPages() {
  const co = DATA.COMPANY;
  const head = [exHead(t('Produkt, marked og branche')), exCompanyLine(), '',
    exWrap(finFill(t('AI-sammenfattet baggrund {date}. Ikke kontrolleret mod kilder. Kontrollér før brug i indstillingen.'), { date: finPublicDataDate() }))];
  const body = head.concat([
    '',
    exHead(t('Virksomheden')),
    t('Branche') + ': ' + co.industry,
    t('Aktivitet') + ': ' + co.activity,
    t('Antal ansatte') + ': ' + co.employees,
    t('Hjemsted') + ': ' + co.hq,
    '',
    exHead(t('Produktbeskrivelse')),
    exWrap(finAiText('product')), exAiNote('product'), ...exAiComment('product'),
    '',
    exHead(t('Markedet')),
    exWrap(finAiText('market')), exAiNote('market'),
    '',
    exHead(t('PEST-analyse')),
  ].filter(x => x !== null));
  MARKET_PEST.forEach(p => { body.push(exWrap(t(p.k) + ': ' + finAiText('pest:' + p.k))); const n = exAiNote('pest:' + p.k); if (n) body.push(n); body.push(''); });
  return [{ ref: 's. 1', title: t('Produkt, marked og branche'), body: body.join('\n').replace(/\n+$/, '') }];
}

function exTrustpilotPages() {
  const tp = TRUSTPILOT, co = DATA.COMPANY;
  const body = [
    exHead('Trustpilot'), exCompanyLine(), '',
    finFill(t('{score} af 5'), { score: DATA.fmt.num(tp.score, 1) }) + ' - ' + tp.totalReviews + ' ' + t('anmeldelser') + ' - ' + t('hentet') + ' ' + finPublicDataDate(),
    'https://www.trustpilot.com/review/' + co.trustpilotDomain, '',
    exHead(t('Fordeling')),
  ];
  tp.dist.forEach(d => body.push(exPad(d.stars + ' ' + (d.stars === 1 ? t('stjerne') : t('stjerner')), 14) + exPad(String(d.count), 6) + exPct(d.count / tp.totalReviews * 100, 0)));
  body.push('', exHead(t('Seneste anmeldelser')));
  tp.reviews.forEach(r => { body.push(r.stars + '/5 - ' + r.author + ' - ' + DATA.fmt.longDate(r.date)); body.push(exWrap(t(r.text))); body.push(''); });
  body.push(exWrap(t('Trustpilot er et blødt signal: anmeldelserne er skrevet af kunder og leverandører og er ikke kontrolleret. Gengivet som hentet, ikke vurderet.')));
  return [{ ref: 's. 1', title: 'Trustpilot', body: body.join('\n') }];
}

function exOwnershipPages() {
  const co = DATA.COMPANY;
  const kind = { holding: 'Holdingselskab', fund: 'Fond', person: 'Person' };
  const body = [
    exHead(t('Ejerskab og finansielle bindinger')), exCompanyLine(), '',
    exWrap(t('Ejere fra Det Offentlige Ejerregister (CVR), som stemmer med ejerbogen.') + ' ' + exCap(t('hentet')) + ' ' + finPublicDataDate() + '.'),
    '',
    exHead(t('Ejere')),
    exPad(t('Ejer'), 24) + exPad(t('Andel'), 10) + exPad(t('Efter warrants'), 16) + exPad('CVR', 11) + t('Type'),
  ];
  DATA.OWNERS.forEach(o => body.push(exPad(o.name, 24) + exPad(exPct(o.share), 10) + exPad(exPct(o.diluted), 16) + exPad(o.cvr || '-', 11) + t(kind[o.type] || 'Selskab') + (o.role ? ', ' + t(o.role) : '')));
  body.push('', t('Reel ejer') + ': ' + co.realOwner);
  body.push('', exHead(t('Bestyrelse')), exPad(t('Navn'), 24) + exPad(t('Rolle'), 24) + t('Siden'));
  DATA.BOARD.forEach(b => body.push(exPad(b.name, 24) + exPad(t(b.role), 24) + b.since));
  body.push(exWrap(finFill(t("Ingen af de {n} medlemmer er PEP. Tjekket mod EU's sanktionsliste og nationale PEP-registre {date}."), { n: DATA.BOARD.length, date: finPublicDataDate() })));
  body.push('', exHead(t('Direktion')), exPad(t('Navn'), 24) + exPad(t('Rolle'), 30) + t('Anmeldt i CVR'));
  DATA.MANAGEMENT.forEach(m => body.push(exPad(m.name, 24) + exPad(t(m.role), 30) + (m.registered ? t('Ja') : t('Nej'))));
  body.push('', exHead(t('Koncernforhold')), exWrap(t('Ingen datterselskaber - søsterselskab Nordhavn Production ApS (samhandel på markedsvilkår)')));
  return [{ ref: 's. 1', title: t('Ejerskab og finansielle bindinger'), body: body.join('\n') }];
}

function exCompanyPages() {
  const co = DATA.COMPANY;
  const rows = [
    // Stamdata som på skærmen (rådgiverens rettelser går forud for CVR)
    [t('Virksomhedsnavn'), co.name], [t('CVR-nr.'), co.cvr], [t('Juridisk form'), cvrVal('legalForm')], [t('Branche'), cvrVal('industry')],
    [t('Stiftelsesdato'), cvrVal('founded')], [t('Antal ansatte'), cvrVal('employees')], [t('Adresse'), cvrVal('address')],
    [t('Land'), co.country], [t('Kommune'), co.municipality],
    [t('Revisor'), co.auditor], [t('Bankforbindelse'), co.bank], [t('Direktør'), co.ceo],
  ];
  const body = [
    exHead(t('Virksomhed og facilitet')), '',
    t('Stamdata fra') + ' ' + co.masterDataSource + ', ' + t('opdateret') + ' ' + cvrUpdated() + '.' + (CVR_FIELDS.some(f => cvrEdit(f.key)) ? ' ' + t('Felter rettet af rådgiveren:') + ' ' + CVR_FIELDS.filter(f => cvrEdit(f.key)).map(f => t(f.label)).join(', ') + '.' : ''),
    co.cvrUrl, '',
  ].concat(rows.map(r => exPad(r[0], 22) + exClean(r[1])));
  body.push('', exHead(t('Sagen')),
    exPad(t('Sagsnummer'), 22) + co.caseNr,
    exPad(t('Sagstype'), 22) + co.caseType,
    exPad(t('Beløb'), 22) + exClean(co.amount) + ' (' + exClean(co.amountNote) + ')');
  return [{ ref: 's. 1', title: t('Virksomhed og facilitet'), body: body.join('\n') }];
}

function exDoc(id, name, build) {
  return {
    id, name, type: EX_TYPE, source: 'Crediwire', origin: 'export', period: '-',
    get date() { return exToday(); },
    get meta() { return t('Eksporteret fra Crediwire') + ' ' + exWhen(); },
    get pages() { return build(); },
  };
}

// Modul-eksport
export {
  EX_TYPE, exClean, exPad, exPct, exCap, exNum, exWrap, exHead, exToday, exWhen, exCompanyLine,
  FIN_SOURCE_ITEM, finSourceDoc,
  exFinancialsPages, exAiNote, exMarketPages, exTrustpilotPages, exOwnershipPages, exCompanyPages, exDoc,
};
