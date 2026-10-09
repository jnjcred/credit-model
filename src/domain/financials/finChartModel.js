/* ─────────────────────────────────────────────────────────────────────────
   Grafen over regnskabstabellen: gemte indstillinger og hjælpere.
   Regnskab v5 (8. oktober 2026, designet "Graph redesign without takt v5"): grafens kolonner,
   søjler, skala og detaljefelt regnes i finRegnskab.js. Grafmodellen fra Regnskab v2 (2023-2027
   med 2026E og 2027B, prognosezonen og fremskrivningen) er fjernet sammen med den. Her står det,
   der stadig bruges: grafens gemte valg (skjult graf og serierne), procentformatet i
   detaljefeltet og "Anmod kunden om …".
   ──────────────────────────────────────────────────────────────────────── */
// Migration: grafens gemte indstillinger (localStorage 'kabul:fin-chart'), flyttet ordret fra
// src/fin_chart.jsx ved migrationen til Vue.
import { formatNum } from './finFormat.js';

const FIN_CHART_KEY = 'kabul:fin-chart';

function finChartLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(FIN_CHART_KEY) || 'null');
    return s && typeof s === 'object' ? s : {};
  } catch (e) { return {}; }
}
function finChartStore(patch) {
  try { localStorage.setItem(FIN_CHART_KEY, JSON.stringify({ ...finChartLoad(), ...patch })); } catch (e) {}
}

const finPctUnit = () => (window.CW_LANG === 'en' ? '%' : ' %');
function finPct1(v) { return v == null || !isFinite(v) ? '–' : formatNum(v, { decimals: 1 }) + finPctUnit(); }

/** Bed kunden om et punkt: vælg det i "Anmod om materiale" og åbn dialogen på Overblik. */
function finAskCustomer(itemId, go) {
  try { CW.setSelection({ ...CW.selection(), [itemId]: true }); } catch (e) {}
  if (window.CW_REQUEST_MORE) window.CW_REQUEST_MORE(() => { if (go) go('workspace:1'); });
  else if (go) go('workspace:1');
}

// Modul-eksport
export { FIN_CHART_KEY, finChartLoad, finChartStore, finPctUnit, finPct1, finAskCustomer };
