// Credit memo: hvilken version memoet viser. Sagen er indstillet (memoet er låst og skrivebeskyttet), en
// tidligere indstillet version er åbnet fra historikken eller banneret (_memoView = { version, compare }),
// eller et dybdelink venter på memoets side (_memoPendingOpen = { section, commentId, field }). Flyttet
// ordret fra src/memo.jsx (linje 2420-2427, 2429-2461 og 6014-6020) ved migrationen til Vue; nye er kun
// import-/export-linjerne og de to sættere nederst (markeret Migration).
// window.CW_OPEN_MEMO og CW_OPEN_MEMO_VERSION (index.js) sætter tilstanden og skifter til memofanen.
// Sådan følger memoets side med (som WSMemo før): læs memoLocked() i en computed, der afhænger af
// useCaseVersion() (indstil og træk tilbage) og en lokal viewTick-ref. Tæl viewTick op på window-eventet
// 'cw-memo-view' (CW_OPEN_MEMO_VERSION har sat _memoView; sendes efter 0 ms), efter hvert eget kald af
// setMemoView(...) og på 'cw-memo-open', når siden derved lukker en versionsvisning. Siden overtager et
// ventende dybdelink ved at læse _memoPendingOpen og kalde setMemoPendingOpen(null), og den kalder
// setMemoView(null), når den forlades. Modulet er ren JavaScript uden Vue-reaktivitet.

/* En bestemt indstillet version vist skrivebeskyttet (fra Sagens historik eller
   banneret): { version, compare }. null viser memoet som normalt. */
let _memoView = null;

/* Memoet er skrivebeskyttet når sagen er indstillet til kreditkomitéen */
function memoSubmittedAt() {
  try { return (window.CW && CW.caseState().submittedAt) || null; } catch (e) { return null; }
}

/** Den indstillede version: { at, version, sections, lang } eller null, når sagen ikke er indstillet. */
function memoLocked() {
  const at = memoSubmittedAt();
  const cs = (window.CW && CW.caseState()) || {};
  let snap = null;
  // En tidligere version, der er åbnet fra historikken
  if (_memoView) { try { snap = CW.memoSnapshot(_memoView.version); } catch (e) { snap = null; } }
  const viewing = !!snap;
  if (!snap) {
    if (!at) return null;
    try { snap = CW.memoSnapshot && CW.memoSnapshot(); } catch (e) { snap = null; }
  }
  const sections = snap && snap.sections ? snap.sections : null;
  const version = (snap && snap.version) || cs.submitVersion || 1;
  return {
    at: (snap && snap.at) || at,
    version,
    by: (snap && snap.by) || null,
    sections,
    lang: sections && sections.__lang ? sections.__lang : null,
    // Gennemgang og forside fra indstillingen. Ældre versioner uden dem viser det levende.
    review: sections && sections.__review ? sections.__review : null,
    front: sections && sections.__front ? sections.__front : null,
    // Ikke den gældende indstilling, men en tidligere version åbnet fra historikken
    past: viewing && !(at && version === cs.submitVersion),
    compare: viewing && !!_memoView.compare,
  };
}
/* Gennemgangen for et afsnit i den viste version. undefined: brug den levende. */
function memoLockedReview(locked, k) {
  if (!locked || !locked.sections || !locked.review) return undefined;
  return locked.review[k] || null;
}

let _memoPendingOpen = null;
function _memoGoToMemo() {
  const route = 'workspace:' + ((window.CW && CW.LIVE_CASE_ID) || 1) + ':memo';
  let cur = null;
  try { cur = localStorage.getItem('cw_route'); } catch (e) {}
  if (cur !== route && typeof window.__go === 'function') window.__go(route);
}

// Migration: memo.jsx var ét script, så CW_OPEN_MEMO, CW_OPEN_MEMO_VERSION og memoets side tildelte
// _memoView og _memoPendingOpen direkte (L6025, L6035, L6146-6147, L6163, L6167). En ES-import kan ikke
// tildeles, så de skriver med disse to. Læsning sker direkte: en importeret binding følger værdien.
function setMemoView(v) { _memoView = v; }
function setMemoPendingOpen(v) { _memoPendingOpen = v; }

// Modul-eksport
export { _memoView, memoSubmittedAt, memoLocked, memoLockedReview, _memoPendingOpen, _memoGoToMemo,
  setMemoView, setMemoPendingOpen };
