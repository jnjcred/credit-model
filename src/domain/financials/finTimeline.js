// Fanen Virksomheden, Regnskab (v5): måneder og regnskabsår. En måned er et tal,
// t = år * 12 + (måned - 1), så perioder kan lægges sammen og sammenlignes på tværs af årsskifter.
// Regnskabsåret starter i måned fyStart (1 = januar, 7 = juli). Etiketterne følger designet:
// "jan-aug 2026", "2025" eller "2024/25" for et regnskabsår, der ikke følger kalenderåret.

const finT = (y, m) => y * 12 + (m - 1);
const finTYear = (t) => Math.floor(t / 12);
const finTMonth = (t) => (t % 12) + 1;
const finTKey = (t) => finTYear(t) + '-' + String(finTMonth(t)).padStart(2, '0');
const finTFromKey = (k) => { const [y, m] = String(k).split('-').map(Number); return finT(y, m); };

// Starten af det regnskabsår, der indeholder måneden t
const finFyStartOf = (t, fyStart) => t - ((finTMonth(t) - fyStart + 12) % 12);
// "2025" eller "2024/25"
const finFyLabel = (s, fyStart) => (fyStart === 1 ? String(finTYear(s)) : finTYear(s) + '/' + String(finTYear(s) + 1).slice(2));

// Korte månedsnavne: dansk med lille begyndelsesbogstav (som i designet), engelsk med stort
const FIN_MONTHS_DA = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const FIN_MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const finMonthName = (t) => (window.CW_LANG === 'en' ? FIN_MONTHS_EN : FIN_MONTHS_DA)[finTMonth(t) - 1];
const finCap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Månederne alene: "aug", "jan-aug"
function finMonthsLabel(a, b) { return a === b ? finMonthName(a) : finMonthName(a) + '-' + finMonthName(b); }
// Med år: "jan-aug 2026", "aug 2026", over et årsskifte "jul 25-feb 26"
function finRangeLabel(a, b) {
  if (finTYear(a) === finTYear(b)) return finMonthsLabel(a, b) + ' ' + finTYear(a);
  return finMonthName(a) + ' ' + String(finTYear(a)).slice(2) + '-' + finMonthName(b) + ' ' + String(finTYear(b)).slice(2);
}
// Én måned med år: "jan 2026"
const finMonthYear = (t) => finMonthName(t) + ' ' + finTYear(t);

// Modul-eksport
export {
  finT, finTYear, finTMonth, finTKey, finTFromKey, finFyStartOf, finFyLabel,
  FIN_MONTHS_DA, FIN_MONTHS_EN, finMonthName, finCap, finMonthsLabel, finRangeLabel, finMonthYear,
};
