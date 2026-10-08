/* ─────────────────────────────────────────────────────────────────────────
   Regnskab v2: grafen over regnskabstabellen (5.-6. oktober)

   Bygget efter designet "Virksomheden v2" fra Claude Design
   (design_handoff_regnskab_graf, seneste udgave "Graph redesign without
   takt"), men tegnet med prototypens eget designsystem (farver, skrift,
   knapper). Grafen står i sit eget kort over tabellen, og kolonnerne følger
   tabellens: [detaljefelt] 2023 · 2024 · 2025 · 2026 · 2027.

   Serier: Omsætning, Bruttofortjeneste og EBITDA kan slås til og fra i
   kortets hoved (standard: Omsætning og EBITDA). Titlen følger de viste
   serier. Oplyser årsrapporterne ikke omsætningen (små virksomheder må
   udelade den), slås Omsætning fra med en forklaring, og Bruttofortjeneste
   vises i stedet; i tabellen står "Ikke oplyst", og tallet kan indtastes.

   Grafen følger, hvad kunden faktisk har leveret (finDataState i
   financials.jsx): budget ja/nej og måneder med periodetal. Fire tilstande:
   1. Budget + periodetal: 2026E = periodetal + budget for resten af året.
   2. Budget uden periodetal: 2026E = budgettet alene.
   3. Periodetal uden budget: 2026 = periodetal plus lineær fremskrivning;
      2027 beder rådgiveren om et budget.
   4. Ingen af delene: ingen prognose; kortet beder om budget og periodetal.
   EBITDA-margin-strimlen er taget ud efter designets beslutning; marginerne
   står i detaljefeltet og i tabellen.
   ──────────────────────────────────────────────────────────────────────── */
// Migration: grafens model, mål og gemte indstillinger (localStorage 'kabul:fin-chart'), flyttet
// ordret fra src/fin_chart.jsx ved migrationen til Vue; selve grafen er en Vue-komponent. Nye er
// kun import-/export-linjerne og funktionerne finChartScale og finBarHeights, hvis linjer stod
// inde i React-komponenten FinChart.
import { FIN_ANNUAL_YEARS, FIN_ACTUAL_Q } from './finData.js';
import { finRawValue } from './finCalc.js';
import { finFill, formatNum } from './finFormat.js';

const FIN_CHART_KEY = 'kabul:fin-chart';
const FIN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function finChartLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(FIN_CHART_KEY) || 'null');
    return s && typeof s === 'object' ? s : {};
  } catch (e) { return {}; }
}
function finChartStore(patch) {
  try { localStorage.setItem(FIN_CHART_KEY, JSON.stringify({ ...finChartLoad(), ...patch })); } catch (e) {}
}

// Perioder som "jan", "jan-aug"; resten af året som "sep-dec"
function finPer(n) { return n <= 0 ? '' : t(n === 1 ? 'jan' : 'jan-' + FIN_MONTHS[n - 1]); }
function finRest(n) { return t(n <= 0 ? 'jan-dec' : n === 11 ? 'dec' : FIN_MONTHS[n] + '-dec'); }
const finPctUnit = () => (window.CW_LANG === 'en' ? '%' : ' %');
function finPct1(v) { return v == null || !isFinite(v) ? '–' : formatNum(v, { decimals: 1 }) + finPctUnit(); }

// Serierne i den rækkefølge, de står i kortets hoved. Søjlerne tegnes omvendt
// (EBITDA, Bruttofortjeneste, Omsætning), så den vigtigste står yderst til højre.
const FIN_SERIES = [
  { k: 'rev', row: 'Nettoomsætning', name: 'Omsætning' },
  { k: 'bf', row: 'Bruttofortjeneste', name: 'Bruttofortjeneste' },
  { k: 'eb', row: 'EBITDA', name: 'EBITDA' },
];

/** Perioderne (2023-2027) og en funktion, der giver en series lag i en periode. */
function finChartModel(model, data) {
  const N = data.months, B = data.hasBudget;
  const val = (label, col) => { const r = model.byLabel[label]; if (!r) return null; const x = finRawValue(r, col); return x == null || isNaN(x) ? null : x; };
  // Realiseret jan-N: summen af de realiserede kvartaler
  const ytd = (label) => {
    const xs = FIN_ACTUAL_Q.map((p, i) => val(label, { kind: 'q', idx: i }));
    if (xs.some(x => x == null)) return null;
    return xs.reduce((a, b) => a + b, 0);
  };
  const P = FIN_ANNUAL_YEARS.map((y, i) => ({ year: y, kind: 'annual', idx: i, g: (l) => val(l, { kind: 'annual', idx: i }) }));
  // 2026: periodetal + budget, budget alene, periodetal alene (fremskrevet) eller intet
  if (B && N) P.push({ year: '2026E', kind: 'fc26', kilde: true, g: (l) => val(l, { kind: 'est' }) });
  else if (B) P.push({ year: '2026E', kind: 'bud26', kilde: true, yearSub: t('sep-dec budget'), g: (l) => val(l, { kind: 'est', mode: 'budget' }),
    note: t('Der er ingen bogføring for 2026 endnu, og budgettet dækker kun sep-dec. Året vises alene ud fra budgettet.') });
  else if (N) P.push({ year: '2026', kind: 'ytd', kilde: true, showYtd: true, g: (l) => ytd(l),
    note: finFill(N === 1 ? t('Lineær fremskrivning af {n} måned. Sæsonudsving er ikke medregnet.') : t('Lineær fremskrivning af {n} måneder. Sæsonudsving er ikke medregnet.'), { n: N })
      + (N <= 3 ? ' ' + t('Få måneder giver et usikkert skøn.') : '') });
  else P.push({ year: '2026', kind: 'none', blank: true, g: () => null });
  // 2027: budget for Q1-Q3, ellers "Intet budget" (med periodetal) eller intet
  if (B) P.push({ year: '2027B', kind: 'b9', g: (l) => val(l, { kind: 'b9' }) });
  else P.push({ year: '2027', kind: 'none', empty: N > 0, blank: !N, g: () => null });

  // En series lag i en periode: realiseret (fyldt), budget (skraveret), fremskrevet (stiplet)
  const stack = (label, q) => {
    if (q.blank || q.empty) return null;
    let s = null;
    if (q.kind === 'annual') { const v = q.g(label); s = v == null ? null : { real: v, bud: 0, ghost: 0 }; }
    else if (q.kind === 'fc26') { const tot = q.g(label), r = ytd(label); s = tot == null ? null : { real: r || 0, bud: tot - (r || 0), ghost: 0 }; }
    else if (q.kind === 'bud26' || q.kind === 'b9') { const v = q.g(label); s = v == null ? null : { real: 0, bud: v, ghost: 0 }; }
    else if (q.kind === 'ytd') { const r = ytd(label); s = r == null ? null : { real: r, bud: 0, ghost: r / N * 12 - r }; }
    if (s) s.tot = s.real + s.bud + s.ghost;
    return s;
  };
  return { P, stack, N, B };
}

/** Bed kunden om et punkt: vælg det i "Anmod om materiale" og åbn dialogen på Overblik. */
function finAskCustomer(itemId, go) {
  try { CW.setSelection({ ...CW.selection(), [itemId]: true }); } catch (e) {}
  if (window.CW_REQUEST_MORE) window.CW_REQUEST_MORE(() => { if (go) go('workspace:1'); });
  else if (go) go('workspace:1');
}

// Grafens faste mål (designets mål, en anelse tættere som resten af appen)
const FIN_PLOT_H = 360;      // søjlefeltet
const FIN_PX_PER_T = 0.0056; // px pr. DKK t. (50.000 ≈ 280 px)

/* Søjlebredder efter designet: én stor serie 48 px og EBITDA 20 px; Omsætning og
   Bruttofortjeneste sammen 26 px hver og EBITDA 16 px; EBITDA alene 48 px.
   Er tabellens årskolonner smalle (smal skærm), skaleres alt ned, så søjlerne
   bliver i deres egen kolonne. */
function finBarWidths(keys, colPx, pad) {
  const big = keys.filter(k => k !== 'eb').length;
  const want = keys.map(k => (k === 'eb' ? (big === 0 ? 48 : big === 2 ? 16 : 20) : (big === 2 ? 26 : 48)));
  const gap = keys.length > 2 ? 6 : 4;
  const total = want.reduce((a, b) => a + b, 0) + gap * Math.max(0, keys.length - 1);
  // Plads til venstre for søjlerne, så EBITDA-tallet (højrestillet over søjlen) bliver i kolonnen
  const f = Math.min(1, Math.max(0.3, (colPx - pad - 30) / total));
  return { ws: want.map(w => Math.max(6, Math.round(w * f))), gap: Math.max(2, Math.round(gap * f)) };
}

/* Migration: grafens lodrette skala (FinChart). P og stack er fra finChartModel, visKeys de
   viste serier ('eb', 'bf', 'rev') og rowOf(k) seriens række (FIN_SERIES). H(v) giver højden i
   px for v i DKK mio. */
function finChartScale(P, visKeys, stack, rowOf) {
  // Skala: designets 0,0056 px pr. DKK t., men aldrig højere end feltet
  const maxT = Math.max(1, ...P.flatMap(q => visKeys.map(k => { const s = stack(rowOf(k), q); return s ? s.tot * 1000 : 0; })));
  const pxPer = Math.min(FIN_PX_PER_T, 270 / maxT);
  const H = (v) => Math.max(0, Math.round((v || 0) * 1000 * pxPer));
  return { maxT, pxPer, H };
}

/* Migration: højden i px af søjlens tre lag (FinChart): realiseret (rh), budget (bh) og
   fremskrevet (gh). s = stack(række, periode), H fra finChartScale. Et positivt tal, der
   ville blive 0 px, får en stump på 2 px. */
function finBarHeights(s, H) {
  let rh = H(s.real), bh = H(s.bud), gh = H(s.ghost);
  if (s.tot > 0 && rh + bh + gh === 0) { if (s.bud) bh = 2; else rh = 2; }
  return { rh, bh, gh };
}

// Modul-eksport
export {
  FIN_CHART_KEY, FIN_MONTHS, finChartLoad, finChartStore, finPer, finRest, finPctUnit, finPct1,
  FIN_SERIES, finChartModel, finAskCustomer, FIN_PLOT_H, FIN_PX_PER_T, finBarWidths,
  finChartScale, finBarHeights,
};
