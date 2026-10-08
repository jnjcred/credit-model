// Fanen Virksomheden: tal- og datoformater, {pladsholdere} og datoen for de offentlige data.
// Flyttet ordret fra src/financials.jsx ved migrationen til Vue; kun export-linjen nederst er ny.
// t, DATA og window.CW_LANG er globale (src/bootstrap.js indlæser dem først).

function finFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

// Dagen de offentlige data blev hentet (DATA.caseTimeline), samme dato på alle skærme
function finPublicDataDate() {
  try { return DATA.fmt.longDate(DATA.caseTimeline(1).publicDataAt) || DATA.COMPANY.masterDataUpdated || ''; } catch (e) { return DATA.COMPANY.masterDataUpdated || ''; }
}

// "2. okt." / "2 Oct"
function finShortDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const da = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];
  const en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return window.CW_LANG === 'en' ? d.getDate() + ' ' + en[d.getMonth()] : d.getDate() + '. ' + da[d.getMonth()];
}
// Tal i DKK t. uden enhed, som i aktivitetsloggen: "41.100"
function finLogNum(v) { return formatNum(v * 1000, { decimals: 0 }); }
// Læser et indtastet tal: dansk "41.100", "41,1", "-2.400" (engelsk "41,100", "41.1").
// Tomt felt giver null, noget der ikke er et tal giver NaN. lang tvinger formatet
// (Excel-filerne har dansk format uanset sproget i appen).
/* eslint-disable no-irregular-whitespace -- Migration: finParseInput fjerner også hårde mellemrum (U+00A0) i tallet; tegnet står ordret i regex'en */
function finParseInput(s, lang) {
  let x = String(s == null ? '' : s).trim().replace(/[\s ]/g, '').replace(/[−–]/g, '-');
  if (!x) return null;
  const en = (lang || window.CW_LANG) === 'en';
  const th = en ? ',' : '.', dec = en ? '.' : ',';
  const groups = en ? /^-?\d{1,3}(,\d{3})+$/ : /^-?\d{1,3}(\.\d{3})+$/;
  // Kun ét skilletegn af den "forkerte" slags og ikke tre cifre efter: læs det som decimaltegn ("41.1")
  if (x.indexOf(dec) < 0 && x.split(th).length === 2 && !groups.test(x)) x = x.replace(th, dec);
  x = x.split(th).join('').replace(dec, '.');
  if (!/^-?\d+(\.\d+)?$/.test(x)) return NaN;
  return parseFloat(x);
}
/* eslint-enable no-irregular-whitespace */

function formatNum(v, opts) {
  if (v == null) return t('Ikke oplyst');
  const decimals = opts && opts.decimals != null ? opts.decimals : 1;
  const negative = v < 0;
  const abs = Math.abs(v);
  let s = abs.toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return negative ? `−${s}` : s;
}

// Modul-eksport til src/domain/financials og Vue-komponenterne
export { finFill, finPublicDataDate, finShortDate, finLogNum, finParseInput, formatNum };
