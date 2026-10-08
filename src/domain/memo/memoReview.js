// Credit memo: nøglerne i localStorage, gennemgangens fingeraftryk, seed-versionen og afsnittenes
// tekst (det gemte, ellers skabelonens udkast). Flyttet ordret fra src/memo.jsx (linje 1940-2106) ved
// migrationen til Vue; kun import- og export-linjerne er nye. applyMemoSeedVersion var en IIFE, der
// kørte, da memo.jsx blev indlæst; nu kalder index.js den ved start (efter seedMemoComments).
// emitMemoChanged sender 'memo-changed' på window med { detail: { sKey } }.
import { LANG_SUFFIX, SEC_EN, SEC, SEC_DA, MEMO_SECTIONS, MEMO_EN } from './memoTemplates.js';

function memoKey(k) { return 'memo4:' + k + LANG_SUFFIX; }
function memoTouchedKey(k) { return 'memo4:touched:' + k + LANG_SUFFIX; }
/* Gennemgangen hører til afsnittet, ikke sproget: samme nøgle på dansk og
   engelsk, så et sprogskift ikke nulstiller den. */
function memoReviewKey(k) { return 'memo4:review:' + k; }

/* Skabelonens vejledning, som ikke er en del af teksten */
const MEMO_SCAFFOLD = '.tpl-hints, .tpl-hint, .tpl-subhead, .tpl-note, .tpl-guide';

/* ── Gennemgangens fingeraftryk ──────────────────────────────────────────────
   En gennemgang gælder den tekst, der stod, da den blev givet, på begge sprog.
   Ved gennemgang gemmes et fingeraftryk af den danske og den engelske tekst.
   Ændres teksten bagefter (et tal, et ord, på et af sprogene), passer
   aftrykket ikke længere, og afsnittet står som "Ændret efter gennemgang".
   ──────────────────────────────────────────────────────────────────────────── */
function _memoLangSuffix(lang) { return lang === 'en' ? ':en' : ''; }
function _memoSeedFor(lang, k) { return lang === 'en' && SEC_EN[k] != null ? SEC_EN[k] : SEC_DA[k]; }
function _memoSeedStamp(lang) {
  return MEMO_SEED_VERSION + ':' + _memoHash(MEMO_SECTIONS.map(s => s.k + '=' + (_memoSeedFor(lang, s.k) || '')).join('\n'));
}
/* Afsnittets tekst på et bestemt sprog: det gemte, ellers skabelonens udkast */
function _memoLangHtml(k, lang) {
  let saved = null;
  try { saved = localStorage.getItem('memo4:' + k + _memoLangSuffix(lang)); } catch (e) {}
  return saved !== null ? saved : stampSeed(_memoSeedFor(lang, k) || '');
}
/* CW_MEMO_STATUS kaldes ofte (klarhedstjek, faner, sagshoved). Aftrykket af en
   given tekst huskes, så teksten ikke skal fortolkes igen ved hvert kald. */
const _memoSigCache = new Map();
function _memoTextSig(html) {
  html = html || '';
  const hit = _memoSigCache.get(html);
  if (hit) return hit;
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll(MEMO_SCAFFOLD + ', .tpl-draft-label').forEach(el => el.remove());
  const sig = _memoHash(d.textContent.replace(/\s+/g, ' ').trim());
  if (_memoSigCache.size > 120) _memoSigCache.clear();
  _memoSigCache.set(html, sig);
  return sig;
}
function _memoSigs(k) { return { da: _memoTextSig(_memoLangHtml(k, 'da')), en: _memoTextSig(_memoLangHtml(k, 'en')) }; }
/* Udkastmærkerne fjernes, når rådgiveren står inde for afsnittet. null hvis der ingen var. */
function _memoStripDrafts(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  if (!d.querySelector('.tpl-draft-label, .tpl-draft')) return null;
  d.querySelectorAll('.tpl-draft-label').forEach(el => el.remove());
  d.querySelectorAll('.tpl-draft').forEach(el => el.classList.remove('tpl-draft'));
  return d.innerHTML;
}
/* Gennemgangen gælder også det andet sprog: dets udkastmærker fjernes. Har
   sproget ikke været åbnet før, sættes dets seed-version, så teksten ikke
   ryddes første gang der skiftes. */
function _memoApplyReviewTo(k, lang) {
  const next = _memoStripDrafts(_memoLangHtml(k, lang));
  if (next == null) return;
  try {
    const vk = 'memo4-seed-version' + _memoLangSuffix(lang);
    if (localStorage.getItem(vk) === null) localStorage.setItem(vk, _memoSeedStamp(lang));
    localStorage.setItem('memo4:' + k + _memoLangSuffix(lang), next);
  } catch (e) {}
}

/* Tidligere blev gennemgangen gemt pr. sprog (memo4:review:<afsnit>:en for
   engelsk). Den flyttes til den fælles nøgle med fingeraftryk. Kaldes af
   applyMemoSeedVersion nedenfor, før den rydder gamle tekster. */
function migrateMemoReviews() {
  try {
    const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
    MEMO_SECTIONS.forEach(s => {
      const shared = read(memoReviewKey(s.k));
      const en = read(memoReviewKey(s.k) + ':en');
      localStorage.removeItem(memoReviewKey(s.k) + ':en');
      if (shared && shared.sig) return;
      const pick = shared && en ? (String(en.at) > String(shared.at) ? en : shared) : (shared || en);
      if (!pick || !pick.by) return;
      _memoApplyReviewTo(s.k, 'da');
      _memoApplyReviewTo(s.k, 'en');
      localStorage.setItem(memoReviewKey(s.k), JSON.stringify({ by: pick.by, at: pick.at, sig: _memoSigs(s.k) }));
    });
  } catch (e) {}
}

/* ── Seed-version ────────────────────────────────────────────────────────────
   Memoets tekst gemmes pr. afsnit i localStorage (memo4:<afsnit>). Rettes
   skabelonens eksempeltekst i SEC, skal rettelsen slå igennem hos brugere der
   har gamle data liggende, ellers ser de stadig de gamle fejl. Versionen er
   konstanten plus et fingeraftryk af selve teksten, så en rettelse i SEC
   opdages af sig selv; bump MEMO_SEED_VERSION for at tvinge det igennem.
   Afsnit rådgiveren selv har skrevet i eller gennemgået, bevares. Uden en
   tidligere version kan det ikke afgøres, så der ryddes alt.
   ──────────────────────────────────────────────────────────────────────────── */
const MEMO_SEED_VERSION = '2026-09-29.1';

function _memoHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const MEMO_SEED_STAMP = MEMO_SEED_VERSION + ':' + _memoHash(MEMO_SECTIONS.map(s => s.k + '=' + (SEC[s.k] || '')).join('\n'));

function applyMemoSeedVersion() {
  migrateMemoReviews();
  try {
    const vk = 'memo4-seed-version' + LANG_SUFFIX;
    const prev = localStorage.getItem(vk);
    if (prev === MEMO_SEED_STAMP) return;
    MEMO_SECTIONS.forEach(s => {
      const keep = prev !== null && (localStorage.getItem(memoTouchedKey(s.k)) || localStorage.getItem(memoReviewKey(s.k)));
      if (keep) return;
      // Gennemgangen er fælles for begge sprog og ryddes ikke her. Passer
      // teksten ikke længere, viser fingeraftrykket det.
      localStorage.removeItem(memoKey(s.k));
      localStorage.removeItem(memoTouchedKey(s.k));
      localStorage.removeItem('memo4:snap:' + s.k + LANG_SUFFIX);
    });
    localStorage.setItem(vk, MEMO_SEED_STAMP);
  } catch (e) {}
}

/* ── Ophav og gennemgang ─────────────────────────────────────────────────────
   Skabelonens eksempeltekst er et udkast på linje med AI'ens. Den får samme
   ophavsmærke (data-ai="seed"), så "Vis ophav" ikke krediterer rådgiveren for
   tekst hun ikke har skrevet. Et afsnit er gennemgået når rådgiveren aktivt
   har markeret det, med navn og tidspunkt. Kommer der nyt udkast ind bagefter
   (AI, chat), er afsnittet ikke gennemgået længere.
   ──────────────────────────────────────────────────────────────────────────── */
// MEMO_SCAFFOLD er defineret ved memoReviewKey ovenfor

function stampSeed(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  Array.from(d.children).forEach(el => {
    if (el.matches(MEMO_SCAFFOLD) || el.getAttribute('data-ai')) return;
    el.setAttribute('data-ai', 'seed');
  });
  return d.innerHTML;
}

function loadReview(k) {
  try { return JSON.parse(localStorage.getItem(memoReviewKey(k)) || 'null'); } catch (e) { return null; }
}
/* Gemmer gennemgangen med fingeraftryk af teksten på begge sprog. Kaldes
   efter at afsnittets tekst er gemt. Udkastmærkerne på det andet sprog
   fjernes også, for gennemgangen gælder afsnittet. */
function saveReview(k, v) {
  try {
    if (!v) { localStorage.removeItem(memoReviewKey(k)); return; }
    _memoApplyReviewTo(k, MEMO_EN ? 'da' : 'en');
    localStorage.setItem(memoReviewKey(k), JSON.stringify({ by: v.by, at: v.at, sig: _memoSigs(k) }));
  } catch (e) {}
}
/* Rådgiveren har selv skrevet i afsnittet. Bruges af seed-versioneringen. */
function markTouched(k) { try { localStorage.setItem(memoTouchedKey(k), '1'); } catch (e) {} }
function emitMemoChanged(k) {
  try { window.dispatchEvent(new CustomEvent('memo-changed', { detail: { sKey: k } })); } catch (e) {}
}

function savedSectionHtml(k) {
  try { return localStorage.getItem(memoKey(k)); } catch (e) { return null; }
}
/* Det skærmen viser: det gemte, ellers skabelonens udkast */
function sectionHtml(k) {
  const saved = savedSectionHtml(k);
  return saved !== null ? saved : stampSeed(SEC[k] || '');
}

// Modul-eksport
export { memoKey, memoTouchedKey, memoReviewKey, MEMO_SCAFFOLD, _memoLangSuffix, _memoSeedFor, _memoSeedStamp,
  _memoLangHtml, _memoSigCache, _memoTextSig, _memoSigs, _memoStripDrafts, _memoApplyReviewTo,
  migrateMemoReviews, MEMO_SEED_VERSION, _memoHash, MEMO_SEED_STAMP, applyMemoSeedVersion, stampSeed,
  loadReview, saveReview, markTouched, emitMemoChanged, savedSectionHtml, sectionHtml };
