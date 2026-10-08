// Credit memo: fortryd for programmatiske ændringer (AI, chat, nulstil, gennemgang, tabel). Hvert trin
// gemmes i localStorage 'memo4:snap:<afsnit>' (':en' på engelsk), højst 20, og 'memo-snap-changed'
// ({ detail: { sKey } }) sendes på window. Flyttet ordret fra src/memo.jsx (linje 3487-3532) ved
// migrationen til Vue; kun import- og export-linjerne er nye.
import { LANG_SUFFIX } from './memoTemplates.js';

/* ── Fortryd for programmatiske ændringer ────────────────────────────────────
   AI'en skriver med innerHTML og insertAdjacentHTML. Ingen af delene lægger
   noget i browserens egen fortryd-stak, og teksten gemmes med det samme i
   localStorage. Uden det her lag er en times skrivearbejde væk for altid i det
   øjeblik man trykker Generér på et afsnit man selv har skrevet.
   ──────────────────────────────────────────────────────────────────────────── */

const SNAP_KEY = 'memo4:snap:';
const MAX_SNAPS = 20;

function loadSnaps(sKey) {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY + sKey + LANG_SUFFIX) || '[]'); } catch (e) { return []; }
}

function saveSnaps(sKey, list) {
  try { localStorage.setItem(SNAP_KEY + sKey + LANG_SUFFIX, JSON.stringify(list.slice(-MAX_SNAPS))); } catch (e) {}
}

function pushSnap(sKey, html, action) {
  const list = loadSnaps(sKey);
  // Samme indhold to gange i træk er ikke et nyt trin
  if (list.length && list[list.length - 1].html === html) return;
  list.push({ html: html, action: action, at: Date.now() });
  saveSnaps(sKey, list);
  try { window.dispatchEvent(new CustomEvent('memo-snap-changed', { detail: { sKey: sKey } })); } catch (e) {}
}

function popSnap(sKey) {
  const list = loadSnaps(sKey);
  const last = list.pop();
  saveSnaps(sKey, list);
  try { window.dispatchEvent(new CustomEvent('memo-snap-changed', { detail: { sKey: sKey } })); } catch (e) {}
  return last;
}

function snapLabel(action) {
  return t({
    write: 'skrev afsnittet forfra',
    rewrite: 'omskrev afsnittet',
    selection: 'omskrev en markering',
    chat: 'indsatte tekst fra chatten',
    reset: 'nulstillede til skabelonen',
    review: 'markerede afsnittet som gennemgået',
    table: 'ændrede tabellen',
  }[action] || 'ændrede afsnittet');
}

// Modul-eksport
export { SNAP_KEY, MAX_SNAPS, loadSnaps, saveSnaps, pushSnap, popSnap, snapLabel };
