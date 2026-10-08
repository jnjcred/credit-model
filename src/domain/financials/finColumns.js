// Fanen Virksomheden, Regnskab: tabellens kolonner, rækker og celleregler. Koden stod inde i
// React-komponenten AnnualReportSection i src/financials.jsx og er flyttet hertil ved migrationen
// til Vue, så skærmen kun tegner. Linjerne med logik er de samme som før (rykket ind efter deres
// nye plads); nye er funktionshovederne, hvor komponentens variabler bliver parametre,
// kommentarerne, der begynder med "Migration:", og rækkebyggeren finTableRows, der beskriver
// rækkerne og cellerne i stedet for at tegne dem. Tal er i DKK mio.; unit ('mio' | 'thousand')
// skalerer først ved visning.
import { FIN_ANNUAL_YEARS, FIN_ACTUAL_Q, FIN_BUDGET_SEP, FIN_BUDGET_Q, FIN_CONTROLS } from './finData.js';
import { FIN_RATIOS, finRawValue, finEntryVal, finChildVal } from './finCalc.js';
import { FIN_EDIT_COL, finOriginal, finFillable } from './finEdits.js';
import { formatNum } from './finFormat.js';

/* Migration: tabellens talformat. Giver fmt(v, r), som også gives videre til grafen:
   r = {} for beløb (DKK t. uden decimaler, DKK mio. med én), { percent: true } eller
   { decimals } for nøgletal (skaleres ikke). Tom værdi (null/NaN) giver null. */
function finMakeFmt(unit) {
  const scale = unit === 'mio' ? 1 : 1000;

  // Formatér én værdi efter rækkens type. Procent og forholdstal skaleres ikke.
  const fmt = (v, r) => {
    if (v == null || isNaN(v)) return null;
    // Dansk "45,7 %", engelsk "45.7%"
    if (r.percent) return formatNum(v, { decimals: 1 }) + (window.CW_LANG === 'en' ? '%' : ' %');
    if (r.decimals != null) return formatNum(v, { decimals: r.decimals });
    // DKK t. vises uden decimaler, DKK mio. med én
    return formatNum(v * scale, { decimals: unit === 'mio' ? 1 : 0 });
  };
  return fmt;
}

// Kolonnerne i visningsrækkefølge. Årskolonnerne står altid først og flytter
// sig ikke når kvartalerne foldes ud, så trendrækken bliver liggende.
// 2026E og 2027B er ikke indberettede tal, men udledninger:
//   2026E = jan-aug realiseret + sep og Q4 budget   (balance: ultimo Q4 2026)
//   2027B = Q1-Q3 budget, altså 9 måneder  (balance: ultimo Q3 2027)
// Foldet ud er der tre bånd: årsrapporterne (2026 er ikke klar endnu), de
// realiserede kvartaler i 2026 og budgettet for 2026/2027. Realiseret og budget
// har hver sin baggrundstone (zone), så man kan se, hvad der er hvad.
// group = båndets nøgle, groupLabel = dets overskrift, sep = lodret skel.
// Migration: showQuarters = kvartalerne er foldet ud; data = finDataState() (finEdits.js).
function finBuildCols(showQuarters, data) {
  const annual = FIN_ANNUAL_YEARS.map((y, i) => ({ key: 'y' + i, kind: 'annual', idx: i, ann: 1, group: 'annual', groupLabel: t('Årsrapporter'), label: y }));
  // 2026 og 2027 efter det, kunden har leveret (Regnskab v2)
  const B = data.hasBudget, M = data.months;
  const est = B && M ? { key: 'est', kind: 'est', ann: 1, label: '2026E', note: 'jan-aug + budget', minWidth: 104,
      title: 'Januar-august realiseret plus budget for september og Q4' }
    : B ? { key: 'est', kind: 'est', mode: 'budget', ann: 3, label: '2026E', note: 'sep-dec budget', minWidth: 104,
      title: 'Der er ingen periodetal for 2026. Kolonnen er budgettet for september-december.' }
    : M ? { key: 'est', kind: 'est', mode: 'ytd', ann: 12 / M, label: '2026', note: 'periodetal jan-aug', minWidth: 104,
      title: 'Realiseret januar-august. Der er intet budget.' }
    : { key: 'est', kind: 'est', off: true, ann: 1, label: '2026', note: 'ingen data', minWidth: 104 };
  const b9 = B ? { key: 'b9', kind: 'b9', ann: 4 / 3, label: '2027B', note: '9 mdr. budget', minWidth: 96,
      title: 'Kun 9 måneder: budget for Q1-Q3 2027. Kan ikke sammenlignes direkte med et helt år.' }
    : { key: 'b9', kind: 'b9', off: true, ann: 1, label: '2027', note: M ? 'intet budget' : 'ingen data', minWidth: 96 };
  const progLabel = B || M ? t('Prognose') : t('Ingen data');
  if (!showQuarters) {
    return [...annual, { ...est, group: 'prog', groupLabel: progLabel, sep: true }, { ...b9, group: 'prog', groupLabel: progLabel }];
  }
  const pending = { key: 'y' + FIN_ANNUAL_YEARS.length, kind: 'pending', ann: 1, group: 'annual', groupLabel: t('Årsrapporter'), zone: 'pending',
    label: FIN_ACTUAL_Q[0].year, note: 'ikke klar endnu', minWidth: 92,
    title: 'Årsrapporten for 2026 er ikke klar endnu. Året står som realiserede kvartaler og budget til højre.' };
  const realLabel = t('Realiseret kvartal') + ' · ' + FIN_ACTUAL_Q[0].year;
  const q = FIN_ACTUAL_Q.map((p, i) => ({ key: 'q' + i, kind: 'q', idx: i, ann: 12 / p.months, partial: !!p.partial, off: !M,
    group: 'real', groupLabel: realLabel, zone: 'real', sep: i === 0,
    label: t(p.label), note: p.partial ? '2 mdr.' : null, minWidth: 82,
    title: p.partial ? 'Tredje kvartal er ikke afsluttet. Kolonnen dækker kun juli og august.' : undefined }));
  const budgetYears = [...new Set([FIN_BUDGET_SEP.year, ...FIN_BUDGET_Q.map(p => p.year)])].join('/');
  const budgetLabel = t('Budget') + ' · ' + budgetYears;
  const bs = { key: 'bs', kind: 'bs', ann: 12, off: !B, group: 'budget', groupLabel: budgetLabel, zone: 'budget', sep: true,
    year: FIN_BUDGET_SEP.year, label: t(FIN_BUDGET_SEP.label), minWidth: 72, title: 'Budget for september 2026' };
  const b = FIN_BUDGET_Q.map((p, i) => ({ key: 'b' + i, kind: 'b', idx: i, ann: 4, off: !B, group: 'budget', groupLabel: budgetLabel, zone: 'budget',
    year: p.year, label: p.label, minWidth: 72 }));
  return [...annual, pending, ...q, bs, ...b];
}

// Migration: båndene over kolonnerne (én pr. række af kolonner med samme gruppe)
function finColGroups(cols) {
  // Gruppeoverskrifterne: én pr. række af kolonner med samme gruppe
  const colGroups = cols.reduce((a, c) => {
    const last = a[a.length - 1];
    if (last && last.group === c.group) last.n++; else a.push({ group: c.group, label: c.groupLabel, zone: c.zone === 'pending' ? null : c.zone, n: 1, sep: !!c.sep });
    return a;
  }, []);
  return colGroups;
}

// Klasser for en celle i kolonnen: skel, fladetone for 2026E/2027B og zonens baggrund
const colCls = (col) => (col.sep ? ' fin-sep' : '') + (col.kind === 'est' || col.kind === 'b9' ? ' fin-est' : '') + (col.zone ? ' fin-z-' + col.zone : '');

// Rå poster pr. kolonne, med rettelserne - grundlaget nøgletallene regnes af.
function finColMaps(cols, rawRows) {
  return cols.map(col => {
    const m = {};
    rawRows.forEach(r => { m[r.label] = finRawValue(r, col); });
    return m;
  });
}

// Migration: visningsrækkerne efter id (FIN_LAYOUT har id på de rækker, kontrollerne bruger)
function finEntryById(layout) { const m = {}; layout.forEach(g => g.entries.forEach(e => { if (e.id) m[e.id] = e; })); return m; }

// Migration: en post uden tal: alle årstal og kvartalstal er tomme eller 0 ("Skjul tomme rækker")
const annualVals = (e) => FIN_ANNUAL_YEARS.map((y, i) => (e.vals ? e.vals[i] : null));
const isEmpty = (e) => !e.ref && !e.derive && annualVals(e).every(v => v == null || v === 0) && (e.qvals || []).every(v => v == null || v === 0);

// Migration: kan tallet rettes? En post med et oprindeligt tal i kolonnen, eller omsætningen,
// når årsrapporten ikke oplyser den. Summer, udledte rækker og totaler afgøres i finTableRows.
const canEdit = (ref, col) => !col.off && !!FIN_EDIT_COL[col.key] && (finOriginal(ref, col.key) != null || finFillable(ref, col.key));

/* Migration: rækkerne i regnskabstabellen som én flad liste (dataSource til a-table), i samme
   rækkefølge og efter de samme regler som tegningen af tabellen i AnnualReportSection: for hver
   gruppe i model.layout en grupperække og posterne (tomme poster kun, når showEmpty er true)
   med deres detaljer, når posten er foldet ud; derefter Kontrol og Nøgletal.
   model = finApplyEdits(edits); cols = finBuildCols(showQuarters, data);
   opts = { unit, showEmpty, allOpen, openRows } (openRows = { [key]: true | false }).
   Række: { key, type: 'group' | 'entry' | 'child' | 'control' | 'ratio', label, cells }
     entry: + entry, expandable, open, note, memo, sum   child: + entry, child   ratio: + note
     label og note er de danske nøgler; skærmen oversætter dem med t().
   Celle (én pr. kolonne i cols, ikke på grupperækker):
     { col, edit: true, ref, label, value, display, fillable, edited }: tallet kan rettes.
       ref = postens nøgle i rettelserne, label = rækkens navn (dansk), edited = rettelsen
       (model.map) eller null; fillable: vis "Ikke oplyst", når display er tomt.
     { col, display }: tallet vises kun; display null vises som '-' (tom i kolonnen 'pending').
     { col, control: true, ok, display }: en kontrol; display er '✓' eller afvigelsen. */
function finTableRows(model, cols, opts) {
  const { unit, showEmpty, allOpen, openRows } = opts;
  const scale = unit === 'mio' ? 1 : 1000;
  const fmt = finMakeFmt(unit);
  // Visningsrækkerne (FIN_LAYOUT) slår deres tal op i ANNUAL_REPORT eller i egne årstal
  const rowByLabel = model.byLabel;
  const layout = model.layout;
  const entryById = finEntryById(layout);
  const entryVal = (e, col, ci) => finEntryVal(e, col, rowByLabel, model.entryByLabel);
  const colMaps = finColMaps(cols, model.rows);
  // Migration: cellerne som beskrivelser (i komponenten tegnede editCell og numCell dem)
  const editCell = (ref, label, col, value) => ({ col, edit: true, ref, label, value, display: fmt(value, {}), fillable: finFillable(ref, col.key), edited: model.map[ref + '|' + col.key] || null });
  const numCell = (col, ci, display) => ({ col, display });
  const rows = [];
  layout.forEach((g) => {
    rows.push({ key: g.label + '-h', type: 'group', label: g.label });
    g.entries.forEach((e) => {
      if (isEmpty(e) && !showEmpty) return;
      const kids = (e.children || []).filter(c => showEmpty || !isEmpty(c));
      const expandable = kids.length > 1 || (showEmpty && kids.length > 0);
      const key = g.label + '|' + e.label;
      const open = expandable && (allOpen ? openRows[key] !== false : !!openRows[key]);
      const note = e.ref && rowByLabel[e.ref] ? rowByLabel[e.ref].note : null;
      rows.push({ key, type: 'entry', label: e.label, entry: e, expandable, open, note, memo: !!e.memo, sum: !!e.sum,
        cells: cols.map((col, ci) => {
          const ref = e.ref || e.label;
          // En post med detaljer er summen af dem i årstallene: ret detaljerne, ikke summen (undtagen en omsætning, der mangler)
          const isTotal = col.kind === 'annual' && (e.children || []).length > 0 && !finFillable(ref, col.key);
          if (!e.sum && !e.derive && !isTotal && canEdit(ref, col)) return editCell(ref, e.label, col, entryVal(e, col, ci));
          return numCell(col, ci, fmt(entryVal(e, col, ci), {}));
        }) });
      if (open) kids.forEach((c) => {
        const cref = (e.ref || e.label) + ' / ' + c.label;
        rows.push({ key: key + '|' + c.label, type: 'child', label: c.label, entry: e, child: c,
          cells: cols.map((col, ci) => (!e.sum && !e.derive && canEdit(cref, col)
            ? editCell(cref, c.label, col, c.vals[col.idx])
            : numCell(col, ci, fmt(finChildVal(c, col), {})))) });
      });
    });
  });

  // Kontrol: summen af detaljerne mod årsrapportens total
  rows.push({ key: 'Kontrol-h', type: 'group', label: 'Kontrol' });
  FIN_CONTROLS.forEach(ctl => rows.push({ key: ctl.label, type: 'control', label: ctl.label,
    cells: cols.map((col, ci) => {
      if (ctl.annual && col.kind !== 'annual') return numCell(col, ci, null);
      const v = (id) => { const n = entryVal(entryById[id], col, ci); return n == null ? NaN : n; };
      let d = NaN;
      try { d = ctl.diff(v); } catch (err) { d = NaN; }
      if (isNaN(d)) return numCell(col, ci, null);
      const ok = Math.abs(d) < 0.0005;
      return { col, control: true, ok, display: ok ? '✓' : (d > 0 ? '+' : '') + formatNum(d * scale, { decimals: unit === 'mio' ? 2 : 0 }) };
    }) }));

  // Nøgletal - beregnet af kolonnens egne tal, ikke indtastet
  rows.push({ key: 'Nøgletal-h', type: 'group', label: 'Nøgletal' });
  FIN_RATIOS.forEach(r => rows.push({ key: r.label, type: 'ratio', label: r.label, note: r.note || null,
    cells: cols.map((col, ci) => numCell(col, ci, fmt(r.calc(colMaps[ci], col.ann), r))) }));
  return rows;
}

// Modul-eksport (de korte navne fra komponenten får fin-præfiks udadtil)
export {
  finMakeFmt, finBuildCols, finColGroups, colCls as finColCls, finColMaps, finEntryById,
  annualVals as finAnnualVals, isEmpty as finIsEmpty, canEdit as finCanEdit, finTableRows,
};
