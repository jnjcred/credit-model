/* ─────────────────────────────────────────────────────────────────────────
   Regnskab v5 (8. oktober 2026): graf og tabel efter designet "Graph redesign without takt v5"
   (data/Graph redesign without takt v5.zip, design_handoff_regnskab_v5), i appens egne farver.

   Kolonnerne følger kilderne (finSources.js) og ligger i tre bånd:
     Årsrapporter  de tre seneste regnskabsår (offentlige eller interne)
     Periodetal    [regnskabsåret foreløbig] [samme periode sidste år] [måneder…] [perioden]
     Budget        [året før*] [budgetåret] [næste budgetår]
   * kun når regnskabet er bogført ind i næste regnskabsår uden årsrapport for året før.
   Reglerne (designets README):
   1. Regnskabsår, ikke kalenderår: alle etiketter og perioder følger regnskabsåret.
   2. Perioden går fra regnskabsårets start til den måned, regnskabet er bogført til og med.
   3. Budgettet er hele regnskabsår (Jespers beslutning 8. oktober 2026): budgetåret, der
      indeholder perioden, og det næste.
   4. Sammenligningen er de samme måneder et år før: en kolonne for perioden og vækst ved tallene.
   5. ERP: perioden kan vælges, og månederne kan foldes ud. Upload (læst af AI): filens periode.
   Rækkerne er tabellens egne kategorier (FIN_LAYOUT), ikke designets eksempelrækker.
   Tal er i DKK mio.; enheden skalerer først ved visning (finMakeFmt).
   ──────────────────────────────────────────────────────────────────────── */
import { FIN_CONTROLS, FIN_LAYOUT, FIN_ROW_BY_LABEL } from './finData.js';
import { FIN_RATIOS, finRawValue, finEntryVal, finChildVal } from './finCalc.js';
import { FIN_EDIT_COL, finOriginal, finFillable } from './finEdits.js';
import { finMakeFmt, finEntryById, finIsEmpty } from './finColumns.js';
import { finFill, formatNum } from './finFormat.js';
import { FIN_SOURCE_LABEL, FIN_AI_TIP } from './finSources.js';
import { finActiveVersionId, finVersionById, finVersionLabel, finVersionsOf } from './finVersions.js';

// Navnet på den rådgiverversion af budgettet, Regnskab bruger (eller null, når kundens budget er valgt)
function finActiveBudgetName() {
  const id = finActiveVersionId('m-budget');
  const ver = id && finVersionById('m-budget', id);
  return ver ? finVersionLabel(ver, finVersionsOf('m-budget').list.indexOf(ver)) : null;
}
import { finCap, finFyLabel, finFyStartOf, finMonthName, finMonthsLabel, finMonthYear, finRangeLabel } from './finTimeline.js';

// Rækkerne med "% nået" i budgettet (designet: omsætning, dækningsbidrag og EBITDA)
const FIN_DEV_REFS = ['Nettoomsætning', 'Bruttofortjeneste', 'EBITDA'];
// Nøgletallene med forskellen mellem realiseret og budget i procentpoint (designet)
const FIN_DEV_RATIOS = ['Dækningsgrad %', 'EBITDA-margin %'];
// Linjen under EBITDA, som saldobalancen sjældent har før årsafslutningen
const FIN_DEPR_NOTE = 'Saldobalancen har sjældent afskrivninger og periodiseringer før årsafslutning. Sammenlign linjerne under EBITDA med forsigtighed.';

const finPctUnit = () => (window.CW_LANG === 'en' ? '%' : ' %');
const finPctText = (r) => Math.round(r * 100) + finPctUnit();
const finSignedPct = (r) => (r >= 0 ? '+' : '−') + Math.abs(Math.round(r * 100)) + finPctUnit();

/* Kolonnerne efter kilderne og visningen.
   o = { model, src, ds, ui: { compare, months, to } }
   → { cols, bands, period, cur0, cur, bS, bE, over, hasData } */
function finRegnskabColumns(o) {
  const { src, ds, ui } = o;
  const fy = (s) => finFyLabel(s, ds.fyStart);
  const cur0 = ds.cur0;
  const source = src.period;
  // Bogført til og med: ERP = rådgiverens valg (en måned med tal) eller vurderingen; upload = filens periode
  let bE = null, est = null, options = [];
  if (source === 'erp') {
    est = ds.booked.erp.est;
    options = ds.booked.erp.options;
    bE = ui.to != null && options.includes(ui.to) ? ui.to : est;
  } else if (source === 'upload') {
    est = ds.booked.upload.est;
    bE = ds.actual.uploadPeriod[1];
  }
  const hasData = bE != null;
  const over = hasData && bE - cur0 + 1 > 12;
  const cur = over ? cur0 + 12 : cur0;
  const bS = source === 'upload' && hasData ? ds.actual.uploadPeriod[0] : cur;
  const n = hasData ? bE - bS + 1 : 0;
  const months = hasData ? finMonthsLabel(bS, bE) : '';
  const srcLabel = source === 'none' ? 'none' : source;

  const cols = [];
  ds.annualFys.forEach((s, i) => cols.push({
    key: 'y' + i, grp: 'ar', sg: 'ar', kind: 'annual', idx: i, ann: 1,
    head: { main: fy(s) }, chartLabel: fy(s), panelTitle: fy(s),
    source: src.internal[i] ? 'internal' : 'public',
  }));
  if (over) {
    cols.push({ key: 'pre', grp: 'ytd', sg: 'pre', kind: 'view', ann: 1, map: ds.actual.total(cur0, cur0 + 11),
      head: { main: fy(cur0), sub: 'foreløbig' }, chartLabel: fy(cur0), panelTitle: fy(cur0) + ' ' + t('foreløbig'),
      title: finFill(t('Hele regnskabsåret {aar} fra saldobalancen. Årsrapporten for {aar} er ikke klar endnu.'), { aar: fy(cur0) }),
      source: srcLabel });
  }
  // Samme periode sidste år
  const prevMap = !hasData ? null : source === 'upload' ? ds.actual.uploadPrev() : ds.actual.prev(bS, bE);
  const prevLabel = hasData ? months + ' ' + fy(cur - 12) : '';
  if (ui.compare && hasData) {
    cols.push({ key: 'cmp', grp: 'ytd', sg: 'prev', kind: 'view', ann: 12 / n, map: prevMap,
      head: { pre: months, main: fy(cur - 12) }, chartLabel: prevLabel, panelTitle: finCap(prevLabel), source: srcLabel });
  }
  // Måned for måned (kun ERP)
  if (source === 'erp' && ui.months && hasData) {
    for (let m = bS; m <= bE; m++) {
      cols.push({ key: 'm' + m, grp: 'ytd', sg: 'cur', kind: 'view', month: true, t: m, ann: 12, map: ds.actual.month(m),
        prev: ui.compare ? ds.actual.prevMonth(m) : null, prevLabel: finCap(finMonthYear(m - 12)),
        head: { main: finCap(finMonthName(m)), small: true }, chartLabel: finCap(finMonthName(m)), panelTitle: finCap(finMonthYear(m)),
        source: srcLabel });
    }
  }
  const realMap = !hasData ? null : source === 'upload' ? ds.actual.uploadTotal() : ds.actual.total(bS, bE);
  cols.push({ key: 'real', grp: 'ytd', sg: 'cur', kind: 'view', ann: hasData ? 12 / n : 1, map: realMap,
    prev: ui.compare && hasData ? prevMap : null, prevLabel: finCap(prevLabel), noGhost: true,
    head: { pre: source === 'upload' ? months : '', main: fy(cur), sub: hasData ? '' : 'ikke modtaget', select: source === 'erp' && hasData },
    chartLabel: (months ? months + ' ' : '') + fy(cur), panelTitle: finCap((months ? months + ' ' : '') + fy(cur)),
    title: source === 'upload' && hasData ? t('Aflæst af AI fra den uploadede saldobalance') : undefined,
    edit: source === 'upload' && hasData && !ds.synthetic ? 'ytd' : null,
    source: srcLabel });
  // Budget: hele regnskabsår
  const budgetCol = (key, s, extra) => {
    const map = src.budget ? ds.budget.total(s) : null;
    return { key, grp: 'bud', sg: 'bud', kind: 'view', ann: 1, s, map,
      head: { main: fy(s), sub: !src.budget ? 'ikke modtaget' : map ? '' : 'ikke i budgettet' },
      chartLabel: fy(s), panelTitle: t('Budget') + ' ' + fy(s),
      // Budgetfilens 2026 (2026E) har de realiserede måneder med; det står ved kolonnen
      title: src.budget && map && !ds.synthetic && s === cur0 && src.budgetSource !== 'import'
        ? t('Budgetfilens år: realiseret januar-august plus budget for september-december') : undefined,
      source: src.budget && map ? (src.budgetSource === 'import' ? (src.customerBudget ? 'adviser' : 'import') : 'budget') : 'none', ...extra };
  };
  if (over && src.budget) cols.push(budgetCol('bprev', cur0, { prevDev: true }));
  cols.push(budgetCol('bud', cur, { dev: true }));
  cols.push(budgetCol('next', cur + 12, {}));
  // Skel: mellem båndene og mellem delene af periodetallene
  cols.forEach((c, i) => {
    const p = cols[i - 1];
    c.sep = !p ? null : p.grp !== c.grp ? 'grp' : p.sg !== c.sg ? 'sub' : null;
  });

  // "Anmod", når tallene mangler. Står punktet allerede i den sendte anmodning, står der "Anmodet".
  // I demovisningen er "Anmod" slået fra: det skriver i sagen (anmodningen om materiale)
  const asked = (k) => !src.demo && !!(src.requested && src.requested[k]);
  const bands = [
    { grp: 'ar', label: 'Årsrapporter', ai: src.internal.some(Boolean), aiTip: FIN_AI_TIP.annual, request: null },
    { grp: 'ytd', label: 'Periodetal', ai: source === 'upload', aiTip: FIN_AI_TIP.upload, request: source === 'none' ? 'm-interim' : null, asked: asked('period') },
    { grp: 'bud', label: 'Budget', ai: src.budgetSource === 'customer', aiTip: FIN_AI_TIP.budget, request: src.budget ? null : 'm-budget', asked: asked('budget') },
  ].map(b => ({ ...b, demo: !!src.demo, n: cols.filter(c => c.grp === b.grp).length }));

  // Perioden og valget af "bogført til og med" (ERP): regnskabsårene fra det første uden
  // årsrapport, de ældste først; et punkt pr. måned med tal
  const groups = [];
  options.forEach(m => {
    const s = finFyStartOf(m, ds.fyStart);
    let g = groups[groups.length - 1];
    if (!g || g.s !== s) groups.push(g = { s, label: fy(s), items: [] });
    const label = s === cur0 ? finCap(finRangeLabel(cur0, m)) : finCap(finMonthYear(cur0)) + ' - ' + finMonthYear(m);
    g.items.push({ t: m, label, est: m === est, sel: m === bE });
  });
  const period = {
    source, hasData, months, fy: fy(cur), est, estBy: src.estBy || 'cw',
    selected: bE, groups, canChoose: source === 'erp' && options.length > 0, canExpand: source === 'erp' && hasData,
    label: hasData ? finCap(months + ' ' + fy(cur)) : fy(cur),
  };
  return { cols, bands, period, cur0, cur, bS, bE, over, hasData, n };
}

/* Rækkerne i tabellen (dataSource til a-table) i samme rækkefølge og efter de samme regler som
   før (finTableRows): grupperækker, posterne (tomme poster kun med showEmpty) og deres detaljer,
   Kontrol og, når de er slået til, Nøgletal.
   o = { model, mask, view (finRegnskabColumns), unit, showEmpty, allOpen, openRows, showRatios, editable }
   Celle: { col, display, pill?, missing? } eller { col, edit: true, editKey, ref, label, value, display,
   fillable, edited, orig, pill? } eller { col, control: true, ok, display }. missing: omsætningen, den
   offentlige årsrapport ikke viser ("Ikke oplyst"), i en celle, der ikke kan rettes.
   pill = { text, title, tone: 'muted' | 'success' | 'danger' } står foran tallet. */
function finRegnskabRows(o) {
  const { model, mask, view, unit, showEmpty, allOpen, openRows, showRatios, editable } = o;
  const cols = view.cols;
  const scale = unit === 'mio' ? 1 : 1000;
  const fmt = finMakeFmt(unit);
  const layout = model.layout;
  const entryById = finEntryById(layout);
  const annualCol = (c) => ({ kind: 'annual', idx: c.idx, key: c.key });
  // Tallet for en visningsrække i en kolonne (which: 'map' = kolonnens tal, 'prev' = sidste år)
  const entryValue = (e, c, which) => {
    if (c.kind === 'annual') return which === 'prev' ? null : finEntryVal(e, annualCol(c), model.byLabel, model.entryByLabel);
    const m = c[which || 'map'];
    if (!m) return null;
    const get = (l) => (m[l] != null ? m[l] : null);
    if (e.ref) return get(e.ref);
    if (e.derive) return e.annualOnly ? null : e.derive(get, c);
    return get(e.label);
  };
  const childValue = (e, ch, c) => {
    if (c.kind === 'annual') return finChildVal(ch, annualCol(c));
    return c.map ? (c.map[e.label + ' / ' + ch.label] != null ? c.map[e.label + ' / ' + ch.label] : null) : null;
  };
  const realCol = cols.find(c => c.key === 'real');
  const preCol = cols.find(c => c.key === 'pre');
  // Vækst mod samme periode sidste år (resultatposter med samme fortegn begge år). En omkostning
  // vokser som beløb (vareforbrug +7 %); et resultat med underskud sidste år får ingen procent, for
  // "vækst" i et underskud kan ikke læses entydigt (result = summer og udledte rækker)
  const growthPill = (x, p, c, result) => {
    if (x == null || p == null || !p || (x < 0) !== (p < 0) || (result && p < 0)) return null;
    return { text: finSignedPct(x / p - 1), title: c.prevLabel + ': ' + (fmt(p, {}) || '-'), tone: 'muted' };
  };
  // "% nået": periodetallet (eller det foreløbige år) i forhold til budgettet
  const devPill = (e, c) => {
    if (!e.ref || !FIN_DEV_REFS.includes(e.ref) || !c.map) return null;
    const b = c.map[e.ref];
    const base = c.dev ? realCol && realCol.map : c.prevDev ? preCol && preCol.map : null;
    const r = base ? base[e.ref] : null;
    if (r == null || b == null || !b) return null;
    const pct = finPctText(r / b);
    return { text: finFill(t('{pct} nået'), { pct }), tone: 'muted',
      title: c.dev ? finFill(t('Periodetallet udgør {pct} af budgettet'), { pct }) : finFill(t('Foreløbigt {aar} udgør {pct} af budgettet'), { pct, aar: preCol.head.main }) };
  };
  const canEditAnnual = (ref, c) => editable && !!FIN_EDIT_COL[c.key] && (finOriginal(ref, c.key, mask) != null || finFillable(ref, c.key));
  const editCell = (ref, label, c, editKey, value, pill) => {
    const x = model.map[ref + '|' + editKey] || null;
    const o2 = finOriginal(ref, editKey, mask);
    return { col: c, edit: true, editKey, ref, label, value, display: fmt(value, {}), fillable: false,
      edited: x, orig: o2 != null ? o2 : (x ? x.original : null), pill };
  };
  const rows = [];
  layout.forEach((g) => {
    // Resultatopgørelse-overskriften vises ikke i regnskabstabellen (den var irriterende for øjet); posterne står stadig
    if (g.label !== 'Resultatopgørelse') rows.push({ key: g.label + '-h', type: 'group', label: g.label });
    g.entries.forEach((e) => {
      if (finIsEmpty(e) && !showEmpty) return;
      const kids = (e.children || []).filter(c => showEmpty || !finIsEmpty(c));
      const expandable = kids.length > 1 || (showEmpty && kids.length > 0);
      const key = g.label + '|' + e.label;
      // Omsætningen er altid foldet ud som standard; brugeren kan stadig folde den sammen
      const isOmsaetning = e.id === 'oms';
      const open = expandable && (openRows[key] !== undefined ? !!openRows[key] : (allOpen || isOmsaetning));
      const note = e.ref && FIN_ROW_BY_LABEL[e.ref] ? FIN_ROW_BY_LABEL[e.ref].note : null;
      const warn = e.id === 'afsk' && view.hasData ? FIN_DEPR_NOTE : null;
      const ref = e.ref || e.label;
      // Væksten gælder resultatposterne; en balance er en saldo, ikke en periode
      const flow = g.label !== 'Balance';
      rows.push({ key, type: 'entry', label: isOmsaetning ? 'Omsætning' : e.label, entry: e, expandable, open, note, warn, memo: !!e.memo, sum: !!e.sum,
        cells: cols.map((c) => {
          const v = entryValue(e, c);
          const pill = c.prev ? (flow ? growthPill(v, entryValue(e, c, 'prev'), c, !!(e.sum || e.derive)) : null) : (c.dev || c.prevDev) ? devPill(e, c) : null;
          if (c.kind === 'annual') {
            // En post med detaljer er summen af dem i årstallene: ret detaljerne, ikke summen (også når omsætningen mangler)
            const isTotal = (e.children || []).length > 0;
            if (!e.sum && !e.derive && !isTotal && canEditAnnual(ref, c)) return editCell(ref, e.label, c, c.key, v, pill);
            // Omsætningen, den offentlige årsrapport ikke viser, står som "Ikke oplyst", også når den ikke kan rettes
            if (v == null && e.ref === 'Nettoomsætning') return { col: c, display: null, missing: true };
          } else if (c.edit && editable && e.ref && !e.sum && !e.derive && finOriginal(e.ref, c.edit, mask) != null) {
            return editCell(e.ref, e.label, c, c.edit, v, pill);
          }
          return { col: c, display: fmt(v, {}), pill };
        }) });
      if (open) kids.forEach((ch) => {
        const cref = ref + ' / ' + ch.label;
        rows.push({ key: key + '|' + ch.label, type: 'child', label: ch.label, entry: e, child: ch,
          cells: cols.map((c) => {
            const v = childValue(e, ch, c);
            if (c.kind === 'annual' && !e.sum && !e.derive && canEditAnnual(cref, c)) return editCell(cref, ch.label, c, c.key, ch.vals[c.idx]);
            return { col: c, display: fmt(v, {}) };
          }) });
      });
    });
  });

  // Kontrol: summen af detaljerne mod årsrapportens total (som før)
  rows.push({ key: 'Kontrol-h', type: 'group', label: 'Kontrol' });
  FIN_CONTROLS.forEach(ctl => rows.push({ key: ctl.label, type: 'control', label: ctl.label,
    cells: cols.map((c) => {
      if (ctl.annual && c.kind !== 'annual') return { col: c, display: null };
      const v = (id) => { const nn = entryValue(entryById[id], c); return nn == null ? NaN : nn; };
      let d;
      try { d = ctl.diff(v); } catch (err) { d = NaN; }
      if (isNaN(d)) return { col: c, display: null };
      const ok = Math.abs(d) < 0.0005;
      return { col: c, control: true, ok, display: ok ? '✓' : (d > 0 ? '+' : '') + formatNum(d * scale, { decimals: unit === 'mio' ? 2 : 0 }) };
    }) }));

  // Nøgletal (Vis nøgletal): beregnet af kolonnens egne tal; i budgetåret forskellen til periodetallet i procentpoint
  if (showRatios) {
    const colMap = (c) => {
      if (c.kind !== 'annual') return c.map || {};
      const m = {};
      model.rows.forEach(r => { m[r.label] = finRawValue(r, annualCol(c)); });
      return m;
    };
    const maps = cols.map(colMap);
    const realMap = realCol && realCol.map;
    rows.push({ key: 'Nøgletal-h', type: 'group', label: 'Nøgletal' });
    FIN_RATIOS.forEach(r => rows.push({ key: r.label, type: 'ratio', label: r.label, note: r.note || null,
      cells: cols.map((c, ci) => {
        const v = r.calc(maps[ci], c.ann);
        let pill = null;
        if (c.dev && realMap && FIN_DEV_RATIOS.includes(r.label)) {
          const a = r.calc(realMap, realCol.ann);
          if (a != null && v != null) {
            // Afrundet først, så en forskel på 0,0 ikke får fortegn eller farve
            const d = Math.round((a - v) * 10) / 10;
            pill = { text: (d > 0 ? '+' : d < 0 ? '−' : '') + formatNum(Math.abs(d), { decimals: 1 }) + ' pp', tone: d > 0 ? 'success' : d < 0 ? 'danger' : 'muted',
              title: t('Periodetallet mod budgettet, i procentpoint') };
          }
        }
        return { col: c, display: fmt(v, r), pill };
      }) }));
  }
  return rows;
}

/* ── Grafen ─────────────────────────────────────────────────────────────── */

// Serierne i den rækkefølge, de står i kortets hoved. Søjlerne tegnes omvendt
// (EBITDA, Bruttofortjeneste, Omsætning), så den vigtigste står yderst til højre over tallet.
// tip: forklaringen ved serien (Bruttofortjeneste er ikke tabellens dækningsbidrag)
const FIN_V5_SERIES = [
  { k: 'rev', name: 'Omsætning' },
  { k: 'bf', name: 'Bruttofortjeneste', tip: 'Omsætning minus vareforbrug og andre eksterne omkostninger, som i årsrapporten.' },
  { k: 'eb', name: 'EBITDA' },
];

// Den offentlige bruttofortjeneste (ÅRL § 32): dækningsbidrag, andre eksterne omkostninger og
// andre driftsindtægter i én post, sådan som årsrapporten selv har dem (uden rådgiverens rettelser)
function finPublicGross(i) {
  const v = (l) => { const r = FIN_ROW_BY_LABEL[l]; return r && r.values ? r.values[i] : null; };
  const adi = FIN_LAYOUT[0].entries.find(e => e.label === 'Andre driftsindtægter');
  const db = v('Bruttofortjeneste'), ae = v('Andre eksterne omkostninger');
  return db == null || ae == null ? null : db + ae + ((adi && adi.vals && adi.vals[i]) || 0);
}

/* Seriernes tal i en kolonne: { rev, bf, eb } (which: 'map' eller 'prev').
   Bruttofortjeneste er ÅRL § 32's bruttofortjeneste (dækningsbidrag + andre eksterne omkostninger
   + andre driftsindtægter), så den kan sammenlignes med den offentlige årsrapport. */
function finSeriesValues(o, c, which) {
  const { model, mask } = o;
  if (c.kind === 'annual') {
    if (which === 'prev') return { rev: null, bf: null, eb: null };
    const col = { kind: 'annual', idx: c.idx };
    const g = (l) => finRawValue(model.byLabel[l], col);
    const pub = mask && mask.years && mask.years[c.idx];
    const adi = model.entryByLabel['Andre driftsindtægter'];
    const db = g('Bruttofortjeneste'), ae = g('Andre eksterne omkostninger');
    const bf = pub ? finPublicGross(c.idx) : db == null || ae == null ? null : db + ae + ((adi && adi.vals && adi.vals[c.idx]) || 0);
    return { rev: g('Nettoomsætning'), bf, eb: g('EBITDA') };
  }
  const m = c[which || 'map'];
  if (!m) return { rev: null, bf: null, eb: null };
  const g = (l) => (m[l] != null ? m[l] : null);
  const db = g('Bruttofortjeneste'), ae = g('Andre eksterne omkostninger');
  return { rev: g('Nettoomsætning'), bf: db == null || ae == null ? null : db + ae + (g('Andre driftsindtægter') || 0), eb: g('EBITDA') };
}

/* budget: budgettets lyse orange flade, kun når der er et budget (9. oktober: uden budget står
   boksen "Intet budget" i grafen over kolonnerne, på én flade).
   Søjlerne pr. kolonne efter designet: bredder, højder (månederne har deres egen skala, så de
   kan læses), tallet over søjlen, sidste års omrids på månederne og negative tal (neg).
   vis = de viste serier i søjlernes rækkefølge ('eb', 'bf', 'rev'). Højden er 240 px for det
   største tal; et tal, der ikke er 0, får mindst 2 px. */
const FIN_BAR_MAX = 240;
function finChartColumns(o, view, vis, fmt) {
  const vals = view.cols.map(c => ({ cur: finSeriesValues(o, c), prev: c.prev ? finSeriesValues(o, c, 'prev') : null }));
  let mx = 1e-9, mxM = 1e-9;
  view.cols.forEach((c, i) => vis.forEach(k => {
    const x = vals[i].cur[k], p = vals[i].prev ? vals[i].prev[k] : null;
    if (c.month) { [x, p].forEach(v => { if (v != null && Math.abs(v) > mxM) mxM = Math.abs(v); }); }
    else if (x != null && Math.abs(x) > mx) mx = Math.abs(x);
  }));
  const big = vis.filter(k => k !== 'eb').length;
  const px = (v, sc) => (v == null ? 0 : Math.max(2, Math.round(Math.abs(v) / sc * FIN_BAR_MAX)));
  return view.cols.map((c, i) => {
    const m = !!c.month;
    const sc = m ? mxM * 1.15 : mx;
    return {
      key: c.key, label: c.chartLabel, month: m, budget: c.grp === 'bud' && !!c.map, sep: c.sep,
      bars: vis.map(k => {
        const x = vals[i].cur[k];
        const p = vals[i].prev && !c.noGhost ? vals[i].prev[k] : null;
        // EBITDA er en tynd søjle ved siden af de andre; står den alene, er den lige så bred som de øvrige ville være
        const w = k === 'eb' ? (big === 0 ? (m ? 14 : 34) : (m ? 6 : 12)) : (m ? (big === 2 ? 8 : 14) : (big === 2 ? 20 : 34));
        const h = px(x, sc), gh = px(p, sc);
        // neg: et negativt tal tegnes som omrids (søjlen står stadig på aksen; tallet over den har fortegn)
        return { k, value: x, label: x == null ? '' : fmt(x, {}), w, h, gh, box: Math.max(h, gh), neg: x != null && x < 0 };
      }),
    };
  });
}

/* Detaljefeltet til venstre i grafen for kolonnen c: titel, de viste serier (med sidste år, når
   sammenligningen er slået til), kilden og nøgletallene (dækningsgrad, løn og EBITDA-margin). */
function finChartPanel(o, view, c, vis) {
  const cur = finSeriesValues(o, c);
  const prev = c.prev ? finSeriesValues(o, c, 'prev') : null;
  const get = (l) => {
    if (c.kind === 'annual') return finRawValue(o.model.byLabel[l], { kind: 'annual', idx: c.idx });
    return c.map && c.map[l] != null ? c.map[l] : null;
  };
  const rev = get('Nettoomsætning');
  const pct = (x) => (rev == null || x == null || !rev ? null : x / rev * 100);
  const pers = get('Personaleomkostninger');
  return {
    title: c.panelTitle,
    series: FIN_V5_SERIES.filter(s => vis.includes(s.k)).map(s => ({ k: s.k, name: s.name, tip: s.tip || null, value: cur[s.k], prev: prev ? prev[s.k] : null })),
    prevLabel: c.prev ? c.prevLabel : '',
    // Rådgiverens budget hedder det, rådgiveren har valgt (omdøbt eller standard "Budget 2")
    source: (c.source === 'adviser' || c.source === 'import') && finActiveBudgetName() ? finActiveBudgetName() : (FIN_SOURCE_LABEL[c.source] || FIN_SOURCE_LABEL.none),
    kpis: [
      ['Dækningsgrad', pct(get('Bruttofortjeneste'))],
      ['Løn % af omsætning', pct(pers == null ? null : -pers)],
      ['EBITDA-margin', pct(get('EBITDA'))],
    ],
  };
}

// Modul-eksport
export {
  FIN_DEV_REFS, FIN_DEV_RATIOS, FIN_DEPR_NOTE, FIN_V5_SERIES, FIN_BAR_MAX,
  finRegnskabColumns, finRegnskabRows, finPublicGross, finSeriesValues, finChartColumns, finChartPanel,
};
