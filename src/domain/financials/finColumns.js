// Fanen Virksomheden, Regnskab: hjælpere til tabellens rækker og tal. Koden stod inde i
// React-komponenten AnnualReportSection i src/financials.jsx og blev flyttet hertil ved migrationen
// til Vue. Regnskab v5 (8. oktober 2026) bygger kolonnerne og rækkerne i finRegnskab.js; den
// gamle opbygning med 2026E, 2027B og kvartalerne (finBuildCols, finColGroups, finTableRows m.fl.)
// er fjernet sammen med den. Tal er i DKK mio.; unit ('mio' | 'thousand') skalerer først ved visning.
import { formatNum } from './finFormat.js';
import { FIN_ANNUAL_YEARS } from './finData.js';

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

// Migration: visningsrækkerne efter id (FIN_LAYOUT har id på de rækker, kontrollerne bruger)
function finEntryById(layout) { const m = {}; layout.forEach(g => g.entries.forEach(e => { if (e.id) m[e.id] = e; })); return m; }

// Migration: en post uden tal: alle årstal og kvartalstal er tomme eller 0 ("Skjul tomme rækker")
const annualVals = (e) => FIN_ANNUAL_YEARS.map((y, i) => (e.vals ? e.vals[i] : null));
const isEmpty = (e) => !e.ref && !e.derive && annualVals(e).every(v => v == null || v === 0) && (e.qvals || []).every(v => v == null || v === 0);

// Modul-eksport (de korte navne fra komponenten får fin-præfiks udadtil)
export { finMakeFmt, finEntryById, annualVals as finAnnualVals, isEmpty as finIsEmpty };
