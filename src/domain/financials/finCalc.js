// Fanen Virksomheden: beregningerne bag regnskabstabellen, grafen og memoet: 2026E,
// nøgletallene og værdien af en række i en kolonne. Flyttet ordret fra src/financials.jsx ved
// migrationen til Vue; kun import- og export-linjerne er nye. memo_ai læser finEstimate2026 og
// FIN_RATIOS via window (index.js sætter dem).
import { FIN_ACTUAL_Q, FIN_BUDGET_Q } from './finData.js';

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
   `ann` er 4 for kvartalskolonner, så EBITDA annualiseres i gearingsnøgletallet,
   og 1 for helårskolonner. */
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
  { label: 'Gæld / EBITDA',    decimals: 1, note: 'Kvartaler: gæld i forhold til annualiseret EBITDA',
    calc: (c, ann) => ratio(c['Gæld i alt'], c['EBITDA'] == null ? null : c['EBITDA'] * ann) },
  { label: 'Likviditetsgrad',  decimals: 1,
    calc: (c) => ratio(c['Omsætningsaktiver'], c['Kortfristet gæld']) },
];

// Et tal i en af de kolonner, der står i data (annual, q, bs, b). Andet giver null.
function finCellGet(row, col) {
  if (!row) return null;
  const pick = (arr) => (arr && arr[col.idx] != null ? arr[col.idx] : null);
  if (col.kind === 'annual') return pick(row.values);
  if (col.kind === 'q') return pick(row.q);
  if (col.kind === 'b') return pick(row.bq);
  if (col.kind === 'bs') return row.stock ? null : (row.bs != null ? row.bs : null);
  return null;
}
function finCellSet(row, col, v) {
  if (col.kind === 'annual') row.values[col.idx] = v;
  else if (col.kind === 'q') row.q[col.idx] = v;
  else if (col.kind === 'b') row.bq[col.idx] = v;
  else if (col.kind === 'bs') row.bs = v;
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
// udledningerne adgang til rækker, der kun findes i visningen (fx hensættelser).
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
  // 2026E for en resultatpost uden budget (fx Andre driftsindtægter): de realiserede
  // perioder alene, ligesom de indgår i EBITDA's 2026E
  if (col.kind === 'est' && x.qflow && x.qvals) return x.qvals.reduce((a, v) => a + (v || 0), 0);
  return null;
}

function ratio(a, b, factor) {
  if (a == null || b == null || !b) return null;
  return (a / b) * (factor || 1);
}

// Modul-eksport (ratio bruges kun af FIN_RATIOS)
export { finEstimate2026, FIN_RATIOS, finCellGet, finCellSet, finRawValue, finEntryVal, finChildVal };
