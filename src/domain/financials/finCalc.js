// Fanen Virksomheden: beregningerne bag regnskabstabellen, grafen og memoet: 2026E,
// nøgletallene og værdien af en række i en kolonne. Flyttet ordret fra src/financials.jsx ved
// migrationen til Vue; kun import- og export-linjerne er nye. memo_ai læser finEstimate2026 og
// FIN_RATIOS via window (index.js sætter dem).
import { FIN_ACTUAL_Q, FIN_BUDGET_Q } from './finData.js';
import { FIN_UPLOAD_2026, FIN_BUDGET_FILE_2026_REAL, FIN_BUDGET_FILE_Q4_2027, FIN_BUDGET_FILE_2028 } from './finSourceData.js';

/** 2026E for en række: januar-august realiseret plus budget for september og Q4
 *  (balanceposter: budget ultimo Q4). Bruges også af andre skærme. */
function finEstimate2026(row, q4) {
  const b4 = q4 !== undefined ? q4 : (row.bq ? row.bq[0] : null);
  if (row.stock) return b4 == null ? null : b4;
  const parts = [row.q ? row.q[0] : null, row.q ? row.q[1] : null, row.q ? row.q[2] : null, row.bs != null ? row.bs : 0, b4];
  if (parts.some(v => v == null)) return null;
  return parts.reduce((a, b) => a + b, 0);
}

/* Nøgletal beregnes ud af kolonnens egne rå poster.
   `ann` er 12 / antal måneder for en periode kortere end et år (Regnskab v5: periodetallene og
   månederne), så EBITDA annualiseres i gearingsnøgletallet, og 1 for helårskolonner. */
const FIN_RATIOS = [
  // Samme marginer som i grafens detaljefelt (6. oktober): dækningsgrad, løn % og EBITDA-margin
  { label: 'Dækningsgrad %',   percent: true,
    calc: (c) => ratio(c['Bruttofortjeneste'], c['Nettoomsætning'], 100) },
  { label: 'Løn % af omsætning', percent: true,
    calc: (c) => ratio(c['Personaleomkostninger'] == null ? null : -c['Personaleomkostninger'], c['Nettoomsætning'], 100) },
  { label: 'EBITDA-margin %',  percent: true,
    calc: (c) => ratio(c['EBITDA'], c['Nettoomsætning'], 100) },
  { label: 'Soliditetsgrad %', percent: true,
    calc: (c) => ratio(c['Egenkapital'], c['Aktiver i alt'], 100) },
  { label: 'Gæld / EBITDA',    decimals: 1, note: 'Gæld i forhold til EBITDA. For en periode kortere end et år er EBITDA annualiseret.',
    calc: (c, ann) => ratio(c['Gæld i alt'], c['EBITDA'] == null ? null : c['EBITDA'] * ann) },
  { label: 'Likviditetsgrad',  decimals: 1,
    calc: (c) => ratio(c['Omsætningsaktiver'], c['Kortfristet gæld']) },
];

// Et tal i en af de kolonner, der står i data (annual, q, bs, b, ytd). Andet giver null.
// Regnskab v5: ytd er den uploadede saldobalances periode (januar-august 2026, læst af AI): filens
// tal (FIN_UPLOAD_2026), eller rådgiverens rettelse af dem (row.ytd). Den afhænger ikke af
// kontomappingen af e-conomic, som skriver kvartalerne (q).
// Regnskab v5 (9. oktober): by er budgettet for et helt regnskabsår (idx 0 = 2026, 1 = 2027, 2 = 2028),
// som Excel-skabelonen nu har det. Uden rettelse er det budgetfilens år: 2026 er filens 2026E
// (realiseret januar-august plus september og Q4), 2027 er Q1-Q3 plus Q4 2027, 2028 filens helår.
// Rettelser af september og kvartalerne fra før (bs, b) er med i tallet.
const FIN_BUDGET_YEARS = ['2026', '2027', '2028'];
const r6 = (v) => (v == null ? v : Math.round(v * 1e6) / 1e6);
function finBudgetBase(row, j) {
  const L = row.label;
  const bq = (i) => (row.bq && row.bq[i] != null ? row.bq[i] : null);
  if (j === 0) {
    if (row.stock) return bq(0);
    const janAug = FIN_BUDGET_FILE_2026_REAL[L];
    return janAug == null || bq(0) == null ? null : r6(janAug + (row.bs || 0) + bq(0));
  }
  if (j === 1) {
    const q4 = FIN_BUDGET_FILE_Q4_2027[L];
    if (q4 == null) return null;
    if (row.stock) return q4;
    return [1, 2, 3].some(i => bq(i) == null) ? null : r6(bq(1) + bq(2) + bq(3) + q4);
  }
  if (j === 2) return FIN_BUDGET_FILE_2028[L] != null ? FIN_BUDGET_FILE_2028[L] : null;
  return null;
}
function finCellGet(row, col) {
  if (!row) return null;
  const pick = (arr) => (arr && arr[col.idx] != null ? arr[col.idx] : null);
  if (col.kind === 'annual') return pick(row.values);
  if (col.kind === 'q') return pick(row.q);
  if (col.kind === 'b') return pick(row.bq);
  if (col.kind === 'bs') return row.stock ? null : (row.bs != null ? row.bs : null);
  if (col.kind === 'ytd') {
    if (row.ytd != null) return row.ytd;
    return FIN_UPLOAD_2026[row.label] != null ? FIN_UPLOAD_2026[row.label] : null;
  }
  if (col.kind === 'by') return row.by && row.by[col.idx] != null ? row.by[col.idx] : finBudgetBase(row, col.idx);
  return null;
}
function finCellSet(row, col, v) {
  if (col.kind === 'annual') row.values[col.idx] = v;
  else if (col.kind === 'q') row.q[col.idx] = v;
  else if (col.kind === 'b') row.bq[col.idx] = v;
  else if (col.kind === 'bs') row.bs = v;
  else if (col.kind === 'ytd') row.ytd = v;
  else if (col.kind === 'by') { if (!row.by) row.by = []; row.by[col.idx] = v; }
}
// Rå værdi for en række i en kolonne (kind: annual, est, b9, q, bs, b).
// 2026E og 2027B udledes af kvartalerne, så rettelser i dem slår igennem.
function finRawValue(row, col) {
  // Regnskab v2: en kolonne uden leverede tal (col.off) er tom. 2026 kan være
  // realiseret jan-aug alene (mode 'ytd') eller budget alene (mode 'budget').
  if (col.off) return null;
  if (col.kind === 'est' && col.mode === 'ytd') {
    const q = FIN_ACTUAL_Q.map((p, i) => finCellGet(row, { kind: 'q', idx: i }));
    if (q.some(v => v == null)) return null;
    return row.stock ? q[q.length - 1] : q.reduce((a, b) => a + b, 0);
  }
  if (col.kind === 'est' && col.mode === 'budget') {
    const b0 = finCellGet(row, { kind: 'b', idx: 0 });
    if (row.stock || b0 == null) return b0;
    const sep = finCellGet(row, { kind: 'bs' });
    return (sep || 0) + b0;
  }
  if (col.kind !== 'b9' && col.kind !== 'est') return finCellGet(row, col);
  const bq = (i) => finCellGet(row, { kind: 'b', idx: i });
  if (col.kind === 'b9') {
    if (row.stock) return bq(FIN_BUDGET_Q.length - 1);
    const parts = [1, 2, 3].map(bq);
    if (parts.some(p => p == null)) return null;
    return parts.reduce((a, b) => a + b, 0);
  }
  // 2026E: januar-august realiseret plus budget for september og Q4
  return finEstimate2026(row, bq(0));
}
// Værdi af en visningsrække (FIN_LAYOUT) i en kolonne. entryByLabel giver
// udledningerne adgang til rækker, der kun findes i visningen (f.eks. hensættelser).
function finEntryVal(e, col, rowByLabel, entryByLabel) {
  if (e.ref) return finRawValue(rowByLabel[e.ref], col);
  const get = (label) => {
    if (rowByLabel[label]) return finRawValue(rowByLabel[label], col);
    const x = entryByLabel && entryByLabel[label];
    return x ? finChildVal(x, col) : null;
  };
  if (e.derive) return e.annualOnly && col.kind !== 'annual' ? null : e.derive(get, col);
  return finChildVal(e, col);
}
// Tal for en række uden ref eller en detaljelinje: årsrapporternes vals og,
// i de realiserede perioder, kontomappingens qvals (se finSyncMapping)
function finChildVal(x, col) {
  if (col.off) return null;
  if (col.kind === 'annual') return x.vals && x.vals[col.idx] != null ? x.vals[col.idx] : null;
  if (col.kind === 'q') return x.qvals && x.qvals[col.idx] != null ? x.qvals[col.idx] : null;
  // 2026E for en resultatpost uden budget (f.eks. Andre driftsindtægter): de realiserede
  // perioder alene, ligesom de indgår i EBITDA's 2026E
  if (col.kind === 'est' && x.qflow && x.qvals) return x.qvals.reduce((a, v) => a + (v || 0), 0);
  return null;
}

function ratio(a, b, factor) {
  if (a == null || b == null || !b) return null;
  return (a / b) * (factor || 1);
}

// Modul-eksport (ratio bruges kun af FIN_RATIOS)
export { finEstimate2026, FIN_RATIOS, finCellGet, finCellSet, finRawValue, finEntryVal, finChildVal, FIN_BUDGET_YEARS, finBudgetBase };
