// Fanen Virksomheden, Regnskab (v5): tallene bag tabellen og grafen på en tidslinje af måneder.
// Et datasæt har samme form, uanset om tallene er sagens egne (finRealDataset) eller
// eksempeldata til designets kanttilfælde (finDemoDataset), så visningen bruger den samme logik.
//
//   ds.fyStart     regnskabsårets første måned (1 = januar)
//   ds.annualFys   regnskabsårene bag de tre årsrapporter (første måned, t)
//   ds.cur0        første regnskabsår uden årsrapport (første måned)
//   ds.actual      saldobalancen: month(t), total(a, b), prev(a, b), prevMonth(t) giver et "kort"
//                  { række: tal } eller null; upload: den uploadede saldobalances egen periode
//                  (uploadPeriod, uploadTotal(), uploadPrev()); erp: { first, last } måneder med tal
//   ds.budget      total(s): budgettet for hele regnskabsåret, der starter i s (eller null)
//   ds.booked      { est, options }: den måned, regnskabet vurderes bogført til, og de måneder,
//                  rådgiveren kan vælge (ERP)
// Et kort har ANNUAL_REPORT's rækker, visningsrækkerne uden ref (FIN_LAYOUT) og detaljerne som
// "<række> / <detalje>". Strømme (resultatposter) lægges sammen over perioden; balanceposter er
// saldoen ved periodens slutning. Alle tal i DKK mio. med tabellens fortegn.
import { FIN_ANNUAL_YEARS, FIN_ACTUAL_Q, ANNUAL_REPORT, FIN_LAYOUT, FIN_ROW_BY_LABEL } from './finData.js';
import { finCellGet, FIN_BUDGET_YEARS } from './finCalc.js';
import { finMappedRows } from './finMapping.js';
import { FIN_COMPARE_2025, FIN_BUDGET_FILE_2026_REAL, FIN_BUDGET_FILE_Q4_2027, FIN_BUDGET_FILE_2028 } from './finSourceData.js';
import { finT, finTFromKey, finTMonth, finTYear } from './finTimeline.js';

const AR_ROWS = ANNUAL_REPORT.groups.flatMap(g => g.rows);

// Balanceposter: saldoen ved periodens slutning, ikke summen
const FIN_STOCK = {};
AR_ROWS.forEach(r => { if (r.stock) FIN_STOCK[r.label] = true; });
FIN_LAYOUT.forEach(g => g.entries.forEach(e => {
  if (g.label !== 'Balance') return;
  if (!e.ref && !e.sum && !e.derive) FIN_STOCK[e.label] = true;
  (e.children || []).forEach(c => { FIN_STOCK[e.label + ' / ' + c.label] = true; });
}));

// Summer afrundes til 6 decimaler (som kontomappingen), så f.eks. 3,35 ikke bliver 3,3499999 og vises som 3,3
const r6 = (v) => (v == null ? v : Math.round(v * 1e6) / 1e6);

/** Lægger kort for flere måneder sammen (i tidsorden). Mangler en måned, er perioden ukendt. */
function finSumMaps(maps) {
  if (!maps.length || maps.some(m => !m)) return null;
  const keys = new Set();
  maps.forEach(m => Object.keys(m).forEach(k => keys.add(k)));
  const last = maps[maps.length - 1];
  const out = {};
  keys.forEach(k => {
    if (FIN_STOCK[k]) { out[k] = last[k] != null ? last[k] : null; return; }
    let s = 0;
    for (const m of maps) { if (m[k] == null) { s = null; break; } s += m[k]; }
    out[k] = r6(s);
  });
  return out;
}
const finRange = (a, b) => { const out = []; for (let t = a; t <= b; t++) out.push(t); return out; };

// Resultatposterne, som de andre resultatposter regnes ud fra (som FIN_EDIT_SUMS)
const FIN_BASE_FLOWS = ['Nettoomsætning', 'Vareforbrug', 'Personaleomkostninger', 'Andre eksterne omkostninger', 'Afskrivninger', 'Finansielle omkostninger'];
function finDeriveFlows(m) {
  const g = (k) => m[k] || 0;
  m['Bruttofortjeneste'] = r6(g('Nettoomsætning') + g('Vareforbrug'));
  m['EBITDA'] = r6(m['Bruttofortjeneste'] + g('Personaleomkostninger') + g('Andre eksterne omkostninger'));
  m['Resultat før finansielle poster'] = r6(m['EBITDA'] + g('Afskrivninger'));
  m['Årets resultat'] = r6(m['Resultat før finansielle poster'] + g('Finansielle omkostninger'));
  return m;
}

// Kvartalernes måneder (FIN_ACTUAL_Q / CW_MAP.PERIODS): [[t, t, t], [t, t, t], [t, t]]
function finQuarterMonths() {
  const M = window.CW_MAP;
  if (M && M.PERIODS) return M.PERIODS.map(p => p.months.map(finTFromKey));
  let t = finT(Number(FIN_ACTUAL_Q[0].year), 1);
  return FIN_ACTUAL_Q.map(p => finRange(t, (t += p.months) - 1));
}

/* ── Sagens egne tal ──────────────────────────────────────────────────── */

/* Saldobalancen fra e-conomic måned for måned (kontomappingen, CW_MAP), med rådgiverens
   rettelser af kvartalerne fordelt på kvartalets måneder (balanceposter: kvartalets sidste
   måned). Er saldobalancen ikke hentet, fordeles periodetallenes kvartaler ligeligt.
   dataUntil ('YYYY-MM'): kunden deler kun tal til og med den måned (sammenligningen regnes af alle
   måneder, før de skæres af: finRealDataset). → { [t]: kort } */
function finErpMonths(model, dataUntil) {
  const M = window.CW_MAP;
  const qMonths = finQuarterMonths();
  const out = {};
  if (M && M.ready()) {
    const periods = M.months().map(m => ({ key: m.key, label: m.label, months: [m.key] }));
    const mr = finMappedRows(M.compute(undefined, periods));
    periods.forEach((p, i) => {
      const map = { 'heraf kapitalindskud i året': 0 };
      Object.keys(mr.rows).forEach(l => { map[l] = mr.rows[l][i]; });
      Object.keys(mr.entries).forEach(l => { map[l] = mr.entries[l][i]; });
      Object.keys(mr.children).forEach(k => { map[k] = mr.children[k][i]; });
      out[finTFromKey(p.key)] = map;
    });
    // Rettelser af kvartalerne (fra før v5): forskellen mellem modellen og saldobalancen
    AR_ROWS.forEach(r => {
      const edited = model.byLabel[r.label], raw = FIN_ROW_BY_LABEL[r.label];
      if (!edited || !edited.q || !raw || !raw.q) return;
      qMonths.forEach((ms, i) => {
        const d = (edited.q[i] || 0) - (raw.q[i] || 0);
        if (Math.abs(d) < 1e-9) return;
        if (r.stock) { const m = out[ms[ms.length - 1]]; if (m && m[r.label] != null) m[r.label] += d; return; }
        ms.forEach(t => { const m = out[t]; if (m && m[r.label] != null) m[r.label] += d / ms.length; });
      });
    });
  } else {
    qMonths.forEach((ms, i) => ms.forEach((t, j) => {
      const map = {};
      AR_ROWS.forEach(r => {
        const v = finCellGet(model.byLabel[r.label], { kind: 'q', idx: i });
        map[r.label] = v == null ? null : r.stock ? (j === ms.length - 1 ? v : null) : v / ms.length;
      });
      out[t] = map;
    }));
  }
  if (dataUntil) { const until = finTFromKey(dataUntil); Object.keys(out).forEach(t => { if (Number(t) > until) delete out[t]; }); }
  return out;
}

/* Samme måneder sidste år (sammenligningen), for resultatposterne: periodetallenes kolonne
   "8 mdr 2025" fordelt på kvartaler efter omsætningsvæksten pr. kvartal og på måneder som i 2026.
   Summen for januar-august er præcis filens tal. → { [t i 2025]: kort } */
function finPrevMonths(months) {
  const qMonths = finQuarterMonths();
  const out = {};
  FIN_BASE_FLOWS.forEach(L => {
    const target = FIN_COMPARE_2025.rows[L];
    const q26 = qMonths.map(ms => ms.reduce((s, t) => s + ((months[t] || {})[L] || 0), 0));
    const raw = q26.map((v, i) => v / (1 + FIN_COMPARE_2025.growthQ[i]));
    const tot = raw.reduce((a, b) => a + b, 0);
    const n = qMonths.reduce((a, ms) => a + ms.length, 0);
    qMonths.forEach((ms, i) => ms.forEach(t => {
      const m26 = (months[t] || {})[L] || 0;
      const v = tot && q26[i] ? raw[i] * (target / tot) * (m26 / q26[i]) : target / n;
      (out[t - 12] = out[t - 12] || {})[L] = v;
    }));
  });
  Object.keys(out).forEach(t => finDeriveFlows(out[t]));
  return out;
}

/* Den uploadede saldobalance (januar-august 2026, læst af AI): modellens kolonne ytd, dvs. filens
   tal (FIN_UPLOAD_2026) med rådgiverens rettelser af AI-tallene. Kun hovedposterne: detaljerne og
   posterne uden ref står tomme, fordi AI-læsningen ikke mapper dem endnu (kontomappingen hører til
   ERP-kilden og må ikke påvirke en uploadet fil). Her skal LLM-læsningen af filen sættes ind. */
function finUploadMap(model) {
  const map = {};
  AR_ROWS.forEach(r => { map[r.label] = finCellGet(model.byLabel[r.label], { kind: 'ytd' }); });
  return map;
}

/* Budgetfilen (Budget_2026-28_v3.xlsx) for hele regnskabsår. Budgettet dækker hele år (Jespers
   beslutning 8. oktober 2026): 2026 er filens 2026E (realiseret januar-august plus budget for
   september og Q4), 2027 er Q1-Q4 2027, 2028 filens helårstal. September og kvartalerne kommer fra
   modellen, så rådgiverens rettelser og en Excel-import er med. Detaljerne er ikke i budgettet. */
/* 9. oktober: budgettets hele år er modellens kolonner by0-by2 (finCellGet, kind 'by'), så
   rådgiverens rettelser og en Excel-import af hele år er med. imported: rådgiveren har importeret
   et budget, men kunden har ikke sendt sit (budgetSource 'import'). Så står kun de importerede tal
   og de summer, der kan regnes af dem; resten er tomt (budgetfilen er ikke på sagen). */
function finBudgetYear(model, year, imported) {
  const idx = FIN_BUDGET_YEARS.indexOf(String(year));
  if (idx < 0) return null;
  const col = { kind: 'by', idx };
  const map = {};
  if (!imported) {
    AR_ROWS.forEach(r => { const v = finCellGet(model.byLabel[r.label], col); map[r.label] = v == null ? null : r6(v); });
    return map;
  }
  AR_ROWS.forEach(r => { if (!r.computed) map[r.label] = model.map[r.label + '|by' + idx] ? model.map[r.label + '|by' + idx].value : null; });
  const sum = (parts) => (parts.some(p => map[p] == null) ? null : r6(parts.reduce((a, p) => a + map[p], 0)));
  map['Bruttofortjeneste'] = sum(['Nettoomsætning', 'Vareforbrug']);
  map['EBITDA'] = sum(['Bruttofortjeneste', 'Personaleomkostninger', 'Andre eksterne omkostninger']);
  map['Resultat før finansielle poster'] = sum(['EBITDA', 'Afskrivninger']);
  map['Årets resultat'] = sum(['Resultat før finansielle poster', 'Finansielle omkostninger']);
  map['Aktiver i alt'] = sum(['Anlægsaktiver', 'Omsætningsaktiver']);
  map['Gæld i alt'] = sum(['Langfristet gæld', 'Kortfristet gæld']);
  return Object.keys(map).some(k => map[k] != null) ? map : null;
}

/* Sagens datasæt. model = finApplyEdits(…) (med rettelserne); src = kilderne (finSources.js). */
function finRealDataset(model, src) {
  const years = FIN_ANNUAL_YEARS.map(Number);
  const cur0 = finT(years[years.length - 1] + 1, 1);
  const months = finErpMonths(model, src.dataUntil);
  const ts = Object.keys(months).map(Number).sort((a, b) => a - b);
  // Sammenligningen regnes af alle saldobalancens måneder, så "8 mdr 2025" fordeles ens, uanset
  // hvor mange måneder kunden deler (ellers lagde de delte måneder beslag på hele 2025-tallet)
  const prevMonths = finPrevMonths(src.dataUntil ? finErpMonths(model, null) : months);
  const qMonths = finQuarterMonths();
  const upFirst = qMonths[0][0], upLast = qMonths[qMonths.length - 1][qMonths[qMonths.length - 1].length - 1];
  const erpLast = ts.length ? ts[ts.length - 1] : null;
  const fromMonths = (src2, a, b) => (b < a ? null : finSumMaps(finRange(a, b).map(t => src2[t] || null)));
  const upload = finUploadMap(model);
  return {
    fyStart: 1,
    annualFys: years.map(y => finT(y, 1)),
    cur0,
    synthetic: false,
    actual: {
      first: ts.length ? ts[0] : null,
      last: erpLast,
      month: (t) => months[t] || null,
      total: (a, b) => fromMonths(months, a, b),
      prevMonth: (t) => prevMonths[t - 12] || null,
      prev: (a, b) => fromMonths(prevMonths, a - 12, b - 12),
      uploadPeriod: [upFirst, upLast],
      uploadTotal: () => upload,
      uploadPrev: () => ({ ...FIN_COMPARE_2025.rows }),
    },
    budget: { total: (s) => finBudgetYear(model, finTYear(s), src.budgetSource === 'import' && !src.customerBudget) },
    booked: {
      erp: { est: erpLast, options: erpLast == null ? [] : finRange(cur0, erpLast) },
      upload: { est: upLast, options: [] },
    },
  };
}

/* ── Eksempeldata til designets kanttilfælde ─────────────────────────────
   Regnskabsår fra juli og regnskab bogført 3, 8, 12 eller 15 måneder ind i det første år uden
   årsrapport (15: ind i næste regnskabsår). Kun til demoen ved tabellen. Månederne er sagens egne,
   hvor de findes, så tallene passer med sagens dokumenter: saldobalancen januar-august 2026 (ERP,
   med rådgiverens rettelser) og sammenligningen januar-august 2025 (periodetallene). Resten er
   regnet ud: september-december 2025 er årsrapporten 2025 minus januar-august, 2024 er
   årsrapporten fordelt på månederne, og månederne efter august 2026 er budgettet (september,
   kvartalerne og Q4 2027) med 3,4 % mindre end budgetteret. Balancen går i lige linjer mellem
   årsrapporterne, saldobalancens måneder og budgettets kvartaler. Budgetårene er budgetfilens. */
// Månedsrytmen pr. post (januar-december), når et beløb fordeles på måneder: januar-august som i
// kundens saldobalance (kontomappingen), september-december som i budgettet
const FIN_DEMO_PROFILE = {
  'Nettoomsætning': [3.270, 3.337, 3.993, 3.564, 3.803, 3.733, 3.141, 4.239, 3.82, 3.70, 4.05, 3.75],
  'Vareforbrug': [1.775, 1.895, 2.130, 2.006, 2.029, 2.045, 1.730, 2.310, 2.09, 2.04, 2.20, 2.05],
  'Personaleomkostninger': [1.207, 1.219, 1.154, 1.243, 1.189, 1.188, 1.234, 1.196, 1.23, 1.25, 1.24, 1.25],
  'Andre eksterne omkostninger': [0.223, 0.229, 0.228, 0.232, 0.238, 0.230, 0.238, 0.232, 0.23, 0.24, 0.235, 0.245],
  'Afskrivninger': [0.090, 0.093, 0.087, 0.092, 0.087, 0.091, 0.094, 0.092, 0.09, 0.093, 0.093, 0.094],
  'Finansielle omkostninger': [0.036, 0.037, 0.037, 0.036, 0.037, 0.037, 0.041, 0.039, 0.04, 0.036, 0.037, 0.037],
};
const FIN_DEMO_BUDGET_HIT = 0.966; // de realiserede måneder efter august 2026 i forhold til budgettet
// Balanceposter uden ref i visningen og den række, de følger
const FIN_DEMO_BAL_REF = {
  'Immaterielle anlægsaktiver i alt': 'Anlægsaktiver', 'Materielle anlægsaktiver i alt': 'Anlægsaktiver',
  'Finansielle anlægsaktiver i alt': 'Anlægsaktiver', 'Varebeholdninger i alt': 'Omsætningsaktiver',
  'Tilgodehavender i alt': 'Omsætningsaktiver', 'Værdipapirer': 'Omsætningsaktiver', 'Hensatte forpligtelser i alt': 'Gæld i alt',
};

/* model = finApplyEdits(…) (sagens tal med rettelserne) */
function finDemoDataset(edge, model) {
  const fyStart = edge.fy === 'jj' ? 7 : 1;
  const cur0 = edge.fy === 'jj' ? finT(2025, 7) : finT(2026, 1);
  const raw = (label, i) => { const r = FIN_ROW_BY_LABEL[label]; return r && r.values ? r.values[i] : null; };
  const A25 = {};
  AR_ROWS.forEach(r => { A25[r.label] = raw(r.label, 2); });
  // Sagens måneder: saldobalancen (januar-august 2026) og sammenligningen (januar-august 2025)
  const real = finErpMonths(model, null);
  const prev25 = finPrevMonths(real);
  const realTs = Object.keys(real).map(Number).sort((a, b) => a - b);
  const y25 = finT(2025, 1), y26 = finT(2026, 1);
  // Månedens andel af et beløb, der fordeles på månederne ts (efter postens rytme)
  const weight = (L, t, ts) => {
    const p = FIN_DEMO_PROFILE[L];
    if (!p) return 1 / ts.length;
    return p[finTMonth(t) - 1] / ts.reduce((s, x) => s + p[finTMonth(x) - 1], 0);
  };
  // Budgettet for en måned efter august 2026 (en resultatpost): september, kvartalerne Q4 2026 til
  // Q3 2027 (ANNUAL_REPORT's bs og bq) og Q4 2027 (budgetfilen), fordelt på kvartalets måneder
  const budgetFlow = (L, t) => {
    const r = FIN_ROW_BY_LABEL[L];
    if (!r) return null;
    if (t === finT(2026, 9)) return r.bs != null ? r.bs : null;
    const qs = [[finT(2026, 10), r.bq && r.bq[0]], [finT(2027, 1), r.bq && r.bq[1]], [finT(2027, 4), r.bq && r.bq[2]],
      [finT(2027, 7), r.bq && r.bq[3]], [finT(2027, 10), FIN_BUDGET_FILE_Q4_2027[L]]];
    const q = qs.find(([q0]) => t >= q0 && t < q0 + 3);
    return q && q[1] != null ? q[1] * weight(L, t, [q[0], q[0] + 1, q[0] + 2]) : null;
  };
  // Resultatposterne i en måned uden sagens egne tal
  const flowsAt = (t) => {
    const m = {};
    FIN_BASE_FLOWS.forEach(L => {
      let v;
      if (t >= y26) {
        const b = budgetFlow(L, t);
        v = b == null ? null : b * FIN_DEMO_BUDGET_HIT;
      } else if (t >= y25) {
        if (prev25[t]) v = prev25[t][L];
        else {
          // Resten af 2025: årsrapporten minus de måneder, sammenligningen har
          const year = finRange(y25, y25 + 11);
          const known = year.filter(x => prev25[x]).reduce((s, x) => s + (prev25[x][L] || 0), 0);
          v = A25[L] == null ? null : (A25[L] - known) * weight(L, t, year.filter(x => !prev25[x]));
        }
      } else {
        const i = FIN_ANNUAL_YEARS.indexOf(String(finTYear(t)));
        const a = i >= 0 ? raw(L, i) : null;
        v = a == null ? null : a * weight(L, t, finRange(finT(finTYear(t), 1), finT(finTYear(t), 12)));
      }
      m[L] = v == null ? null : r6(v);
    });
    return finDeriveFlows(m);
  };
  // Detaljer og visningsrækker uden ref: samme andel af deres række som i årsrapporten 2025
  const shares = [];
  const div = (a, b) => (a == null || !b ? 0 : a / b);
  FIN_LAYOUT.forEach(g => g.entries.forEach(e => {
    const ref = e.ref || (g.label === 'Balance' ? FIN_DEMO_BAL_REF[e.label] : 'Nettoomsætning');
    if (!ref) return;
    if (!e.ref && !e.sum && !e.derive) shares.push({ key: e.label, ref, share: div(e.vals ? e.vals[2] : 0, A25[ref]) });
    (e.children || []).forEach(c => shares.push({ key: e.label + ' / ' + c.label, ref, share: div(c.vals[2], A25[ref]) }));
  }));
  // Balancen: lige linjer mellem saldiene ultimo 2023-2025 (årsrapporterne), saldobalancens måneder,
  // budgettets kvartaler (ultimo Q4 2026 til Q3 2027) og budgetfilens ultimo 2027
  const b26 = {}, b27 = {};
  AR_ROWS.forEach(r => { if (r.stock) { b26[r.label] = r.bq ? r.bq[0] : null; b27[r.label] = FIN_BUDGET_FILE_Q4_2027[r.label]; } });
  const anchors = {};
  AR_ROWS.forEach(r => {
    if (!r.stock) return;
    const pts = FIN_ANNUAL_YEARS.map((y, i) => [finT(Number(y), 12), raw(r.label, i)]);
    realTs.forEach(t => pts.push([t, real[t][r.label]]));
    if (r.bq) [finT(2026, 12), finT(2027, 3), finT(2027, 6), finT(2027, 9)].forEach((t, i) => pts.push([t, r.bq[i]]));
    pts.push([finT(2027, 12), b27[r.label]]);
    anchors[r.label] = pts.filter(p => p[1] != null).sort((a, b) => a[0] - b[0]);
  });
  const stockAt = (label, t) => {
    const pts = anchors[label] || [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ta, a] = pts[i], [tb, b] = pts[i + 1];
      if (t >= ta && t <= tb) return r6(a + (b - a) * ((t - ta) / (tb - ta)));
    }
    return null;
  };
  const first = cur0 - 12, last = cur0 + 23;
  const month = (t) => {
    if (t < first || t > last) return null;
    if (real[t]) return real[t];
    const m = flowsAt(t);
    m['heraf kapitalindskud i året'] = 0;
    AR_ROWS.forEach(r => { if (r.stock) m[r.label] = stockAt(r.label, t); });
    shares.forEach(s => { m[s.key] = m[s.ref] == null ? null : r6(m[s.ref] * s.share); });
    return m;
  };
  const total = (a, b) => (b < a ? null : finSumMaps(finRange(a, b).map(month)));
  // Sidste år: kun resultatposterne, som i sagens egne tal (sammenligningen er en periode, ikke en saldo)
  const flowsOnly = (m) => { if (!m) return m; const out = {}; Object.keys(m).forEach(k => { if (!FIN_STOCK[k]) out[k] = m[k]; }); return out; };
  // Budgettet for hele regnskabsår: budgetfilens 2026, 2027 og 2028 for det første, andet og
  // tredje år uden årsrapport (uden rettelser: eksempeldata)
  const budgetByIndex = (j) => {
    if (j < 0 || j > 2) return null;
    const map = {};
    AR_ROWS.forEach(r => {
      if (r.stock) { map[r.label] = j === 0 ? b26[r.label] : j === 1 ? b27[r.label] : (FIN_BUDGET_FILE_2028[r.label] != null ? FIN_BUDGET_FILE_2028[r.label] : null); return; }
      if (j === 0) {
        const q4 = r.bq ? r.bq[0] : null, janAug = FIN_BUDGET_FILE_2026_REAL[r.label];
        map[r.label] = janAug == null || q4 == null ? null : r6(janAug + (r.bs || 0) + q4);
      } else if (j === 1) {
        const q4 = FIN_BUDGET_FILE_Q4_2027[r.label];
        map[r.label] = q4 == null || !r.bq ? null : r6(r.bq[1] + r.bq[2] + r.bq[3] + q4);
      } else map[r.label] = FIN_BUDGET_FILE_2028[r.label] != null ? FIN_BUDGET_FILE_2028[r.label] : null;
    });
    return map;
  };
  const est = cur0 + edge.book - 1;
  const cur = edge.book > 12 ? cur0 + 12 : cur0;
  return {
    fyStart,
    annualFys: [cur0 - 36, cur0 - 24, cur0 - 12],
    cur0,
    synthetic: true,
    actual: {
      first, last,
      month,
      total,
      prevMonth: (t) => flowsOnly(month(t - 12)),
      prev: (a, b) => flowsOnly(total(a - 12, b - 12)),
      uploadPeriod: [cur, est],
      uploadTotal: () => total(cur, est),
      uploadPrev: () => flowsOnly(total(cur - 12, est - 12)),
    },
    budget: { total: (s) => budgetByIndex(Math.round((s - cur0) / 12)) },
    booked: {
      erp: { est, options: finRange(cur0, last) },
      upload: { est, options: [] },
    },
  };
}

// Modul-eksport
export { FIN_STOCK, finSumMaps, finRealDataset, finDemoDataset, finErpMonths, finPrevMonths, finBudgetYear };
