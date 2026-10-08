// Credit memo: markeringen i memoet huskes på tværs af klik i værktøjslinjen, kildevælgeren og
// "Omskriv markeringen" (_memoLastRange: en kopi af markeringens Range; _memoLastEditable: afsnittets
// redigerbare element). Flyttet ordret fra src/memo.jsx (linje 354-362 og 2751-2772) ved migrationen til
// Vue; nye er kun export-linjen og sætteren nederst (markeret Migration). Range og DOM-elementer må
// aldrig ind i Vue-reaktivitet (ref/reactive pakker dem i en Proxy, som selection.addRange afviser):
// importér bindingerne og læs dem direkte; en importeret binding følger værdien.

/* ── Module-level selection tracker (survives toolbar clicks) ─────────────── */
var _memoLastRange = null;
var _memoLastEditable = null;
function _memoSaveSelection() {
  var sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && sel.focusNode) {
    _memoLastRange = sel.getRangeAt(0).cloneRange();
  }
}

/* Markeringen i memoet huskes, så værktøjslinjen kan bruges med tastaturet:
   når fokus flytter til en knap, lægges markeringen tilbage før kommandoen. */
function _memoRememberSelection() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.anchorNode) return;
  const n = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
  const body = n && n.closest ? n.closest('.memo-body[contenteditable="true"]') : null;
  if (!body) return;
  _memoLastRange = sel.getRangeAt(0).cloneRange();
  _memoLastEditable = body;
}
function _memoRestoreSelection() {
  const ed = _memoLastEditable;
  if (!ed || !document.contains(ed)) return false;
  if (document.activeElement !== ed) ed.focus({ preventScroll: true });
  if (_memoLastRange && ed.contains(_memoLastRange.commonAncestorContainer)) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_memoLastRange);
  }
  return true;
}

// Migration: MemoSection satte _memoLastEditable = ref.current, når der blev klikket, tastet eller
// fokuseret i afsnittet (memo.jsx L3910, L3914, L3916). En ES-import kan ikke tildeles; brug denne.
function setMemoLastEditable(el) { _memoLastEditable = el; }

// Modul-eksport
export { _memoLastRange, _memoLastEditable, _memoSaveSelection, _memoRememberSelection, _memoRestoreSelection,
  setMemoLastEditable };
