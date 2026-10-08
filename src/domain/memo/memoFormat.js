// Credit memo: datoer på et bestemt sprog (også dokumentets sprog, når en indstillet version vises),
// memoets dato, sidehenvisninger ("s. 5" / "p. 5"), en kildes korte navn, initialer og {pladsholdere}.
// Flyttet ordret fra src/memo.jsx (linje 2463-2468, 2470-2500, 2600-2614, 2622-2627, 2939-2941 og 3103)
// ved migrationen til Vue; kun import- og export-linjerne er nye. memoDates kommentar (linje 2470) stod
// alene over _memoTL; den står nu over memoDate.
import { MEMO_EN } from './memoTemplates.js';

/** yyyy-mm-dd (eller ISO) som "24. sep. 2026" / "24 Sep 2026" */
function _memoFmtDay(ymd) {
  if (!ymd) return '';
  const iso = String(ymd).length === 10 ? ymd + 'T00:00:00' : ymd;
  return window.CW ? CW.fmtDate(iso) : String(ymd);
}

/* ── Dokumentets sprog ───────────────────────────────────────────────────────
   En indstillet version vises og eksporteres på det sprog, den blev indstillet
   på: forside, etiketter, afsnitstitler og tekst. Dansk er selve nøglen, så
   engelsk slås op i ordbogen, og dansk er teksten selv. */
function _memoTL(lang, s) {
  if (lang !== 'en') return s;
  const d = window.I18N && window.I18N.en;
  return d && Object.prototype.hasOwnProperty.call(d, s) ? d[s] : s;
}
const _MEMO_MONTHS = { da: ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
/** Dato (og evt. tid) på et bestemt sprog, i samme form som CW.fmtDate / CW.fmtWhen */
function _memoFmtLang(ymd, lang, withTime) {
  if (!ymd) return '';
  const d = new Date(String(ymd).length === 10 ? ymd + 'T00:00:00' : ymd);
  if (isNaN(d)) return String(ymd);
  const m = _MEMO_MONTHS[lang === 'en' ? 'en' : 'da'][d.getMonth()];
  const pad = (n) => (n < 10 ? '0' : '') + n;
  if (lang !== 'en') {
    const dmy = pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear();
    return withTime ? dmy + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : dmy;
  }
  const day = d.getDate() + ' ' + m;
  return withTime ? day + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : day + ' ' + d.getFullYear();
}

/** Memoets dato: indstillingsdatoen, når det er indstillet, ellers sagens pr.-dato fra faktaarket. */

function memoDate(locked, lang) {
  if (locked && locked.at) return lang && lang !== (MEMO_EN ? 'en' : 'da') ? _memoFmtLang(locked.at, lang) : _memoFmtDay(locked.at);
  const f = window.CASE_FACTS || {};
  return _memoFmtDay(f.asOf || new Date().toISOString());
}

/** Sidehenvisning på det aktive sprog: "s. 5" / "p. 5", "ark Kunder" / "sheet Kunder".
    Kun visningen; data-page i teksten er uændret. */
function memoRefLabel(ref, lang) {
  if (!ref) return '';
  // lang: dokumentets sprog, når en indstillet version vises på et andet sprog
  const en = lang ? lang === 'en' : MEMO_EN;
  // "S5" er dokument 5 i sikkerhedsmappen og skal ikke forveksles med "s. 5"
  if (/^S\d+$/.test(String(ref))) return (en ? 'doc. ' : 'dok. ') + ref;
  if (!en) return String(ref);
  return String(ref)
    .replace(/(^|[\s,(])s\.\s?(\d)/g, '$1p. $2')
    .replace(/(^|[\s,(])ark\s/g, '$1sheet ')
    .replace(/(^|[\s,(])linje\s/g, '$1line ')
    .replace(/(^|[\s,(])bemærkning\s/g, '$1remark ');
}

/** Kilde { doc, ref } som kort tekst: "Ansøgning, s. 1" */
function _memoSrcLabel(src, lang) {
  if (!src || !src.doc) return null;
  const d = (window.CASE_DOCS || []).find(x => x.name === src.doc);
  return (d ? (lang ? _memoTL(lang, d.type) : t(d.type)) : src.doc) + (src.ref ? ', ' + memoRefLabel(src.ref, lang) : '');
}

function _cmtInitials(name) {
  return name.split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
}

function _memoFill(s, o) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m)); }

// Modul-eksport
export { _memoFmtDay, _memoTL, _MEMO_MONTHS, _memoFmtLang, memoDate, memoRefLabel, _memoSrcLabel,
  _cmtInitials, _memoFill };
