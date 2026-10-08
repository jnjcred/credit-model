// Credit memo: kommentarsporets handlinger: løs (med begrundelse), træk tilbage, bed kontrolfunktionen om
// frigivelse og demoens simulerede svar. Spørger med CW.confirm, logger med CW.log, skriver i localStorage
// 'memo4-comments:<afsnit>' og sender 'memo-changed'; alt afvises, mens sagen er indstillet. Flyttet
// ordret fra src/memo.jsx (linje 3051-3101 og 3105-3176) ved migrationen til Vue; kun import- og
// export-linjerne er nye. _memoReleasePending ('<afsnit>:<id>' → true, mens svaret "skrives") læses af
// kommentarkortet; det ændres kun her, og hver ændring sender 'memo-changed'.
import { isBlockingComment, MEMO_ME, MEMO_DEPT_MAP, loadComments, saveComments, commentState } from './memoComments.js';
import { emitMemoChanged } from './memoReview.js';
import { _memoFill } from './memoFormat.js';
import { memoSubmittedAt } from './memoView.js';

/* Kommentarsporet kan ikke ændres, mens sagen er indstillet */
function _memoCommentsLocked() {
  if (!memoSubmittedAt()) return false;
  if (window.CW) CW.toast(t('Sagen er indstillet. Træk indstillingen tilbage for at ændre kommentarerne.'), { tone: 'warn' });
  return true;
}

/* Løser en kommentar med hvem, hvornår og hvorfor. En blokerende kommentar
   fra en kontrolfunktion logges også i sagens historik. */
function resolveMemoComment(sKey, c, sectionName) {
  const blocking = isBlockingComment(c);
  // Funktionsadskillelse: en kontrolfunktions blokering frigives kun af den selv
  if (blocking && c.author !== MEMO_ME.author) return Promise.resolve(false);
  if (_memoCommentsLocked()) return Promise.resolve(false);
  return CW.confirm({
    title: blocking ? t('Løs blokerende kommentar') : t('Løs kommentar'),
    text: blocking
      ? c.author + ' (' + t((MEMO_DEPT_MAP[c.dept] || {}).label || '') + ') ' + t('har markeret, at indstillingen ikke kan godkendes uden handling. Skriv hvad der er gjort. Begrundelsen logges i sagens historik.')
      : t('Skriv kort, hvad der er gjort. Kommentaren foldes sammen, men bliver i sporet.'),
    requireReason: true,
    reasonLabel: t('Begrundelse'),
    confirmLabel: t('Løs'),
  }).then(r => {
    if (!r.ok) return false;
    const list = loadComments(sKey).map(x => x.id === c.id
      ? Object.assign({}, x, { resolved: { by: MEMO_ME.author, at: new Date().toISOString(), reason: r.reason } }) : x);
    saveComments(sKey, list);
    if (blocking && window.CW) {
      CW.log('comment-resolved', t('Blokerende kommentar løst') + ' (' + sectionName + ', ' + c.author + '): ' + r.reason,
        { who: 'rådgiver', data: { section: sKey, commentId: c.id, author: c.author, dept: c.dept } });
    }
    emitMemoChanged(sKey);
    return true;
  });
}
function withdrawMemoComment(sKey, c) {
  if (c.author !== MEMO_ME.author) return Promise.resolve(false); // kun forfatteren
  if (_memoCommentsLocked()) return Promise.resolve(false);
  return CW.confirm({
    title: t('Træk kommentaren tilbage?'),
    text: t('Kommentaren bliver stående i sporet som trukket tilbage.'),
    confirmLabel: t('Træk tilbage'),
  }).then(r => {
    if (!r.ok) return false;
    const list = loadComments(sKey).map(x => x.id === c.id
      ? Object.assign({}, x, { withdrawn: { by: MEMO_ME.author, at: new Date().toISOString() } }) : x);
    saveComments(sKey, list);
    emitMemoChanged(sKey);
    return true;
  });
}

/* Rådgiveren svarer på en blokerende kommentar og beder om frigivelse. Den
   bliver ved med at blokere, indtil kontrolfunktionen selv frigiver den. */
function requestMemoRelease(sKey, c, sectionName) {
  if (!isBlockingComment(c) || c.author === MEMO_ME.author) return Promise.resolve(false);
  if (_memoCommentsLocked()) return Promise.resolve(false);
  const dept = t((MEMO_DEPT_MAP[c.dept] || {}).label || c.dept);
  const o = { who: c.author, dept, section: sectionName };
  return CW.confirm({
    title: _memoFill(t('Bed {who} om frigivelse'), o),
    text: _memoFill(t('{who} ({dept}) har markeret, at indstillingen ikke kan godkendes uden handling. Skriv, hvad der er gjort. Kun {dept} kan frigive kommentaren. Svaret og frigivelsen logges i sagens historik.'), o),
    requireReason: true,
    reasonLabel: _memoFill(t('Dit svar til {who}'), o),
    confirmLabel: t('Send og bed om frigivelse'),
  }).then(r => {
    if (!r.ok) return false;
    const at = new Date().toISOString();
    saveComments(sKey, loadComments(sKey).map(x => x.id === c.id ? Object.assign({}, x, { release: { by: MEMO_ME.author, at, text: r.reason } }) : x));
    if (window.CW) {
      CW.log('comment-release-requested', _memoFill(t('Bad {who} ({dept}) om at frigive en blokerende kommentar i {section}'), o) + ': ' + r.reason,
        { who: 'rådgiver', data: { section: sKey, commentId: c.id, author: c.author, dept: c.dept } });
      CW.toast(_memoFill(t('Sendt til {who}. Kommentaren blokerer, indtil {dept} frigiver den.'), o));
    }
    emitMemoChanged(sKey);
    return true;
  });
}

/* Demo: kontrolfunktionen svarer. Kort ventetid, så svaret ikke kommer
   øjeblikkeligt. Frigivelsen står i kommentaren, i aktivitetsloggen, i Sagens
   historik og i kvitteringen ved indstilling. */
const _memoReleasePending = {};
const MEMO_RELEASE_REASON_SUB = 'Tilbagetrædelseserklæringen er stillet som betingelse B2 før første udbetaling. Det er tilstrækkeligt til indstillingen. Blokeringen er frigivet.';
const MEMO_RELEASE_REASON = 'Svaret er tilstrækkeligt til indstillingen. Blokeringen er frigivet.';
function simulateMemoRelease(sKey, c, sectionName) {
  const key = sKey + ':' + c.id;
  if (_memoReleasePending[key] || !c.release) return;
  if (_memoCommentsLocked()) return;
  _memoReleasePending[key] = true;
  emitMemoChanged(sKey);
  setTimeout(() => {
    delete _memoReleasePending[key];
    const cur = loadComments(sKey).find(x => x.id === c.id);
    if (!cur || commentState(cur) !== 'open') { emitMemoChanged(sKey); return; }
    const at = new Date().toISOString();
    const reason = /tilbagetrædelse|subordination/i.test(cur.text || '') ? MEMO_RELEASE_REASON_SUB : MEMO_RELEASE_REASON;
    saveComments(sKey, loadComments(sKey).map(x => x.id === c.id ? Object.assign({}, x, { resolved: { by: c.author, dept: c.dept, at, reason } }) : x));
    const dept = t((MEMO_DEPT_MAP[c.dept] || {}).label || c.dept);
    const o = { who: c.author, dept, section: sectionName };
    if (window.CW) {
      CW.log('comment-resolved', _memoFill(t('{who} ({dept}) har frigivet sin blokerende kommentar i {section}'), o) + ': ' + t(reason),
        { who: 'system', data: { section: sKey, commentId: c.id, author: c.author, dept: c.dept, reason, actor: c.author + ' (' + dept + ')' } });
      // Sagens historik læser caseState().history
      const cs = CW.caseState();
      CW.setCaseState({ history: (cs.history || []).concat([{ at, type: 'comment-resolved', by: c.author + ', ' + dept, reason,
        note: sectionName + ': ' + t(cur.text), section: sKey, commentId: c.id, reply: cur.release ? cur.release.text : '' }]) });
      CW.toast(_memoFill(t('{who} ({dept}) har frigivet kommentaren i {section}.'), o));
    }
    emitMemoChanged(sKey);
    // Fokus til den sammenfoldede linje, hvis fokus ikke er et andet sted
    const a = document.activeElement;
    // (kommentaren foldes først sammen, når memoet har tegnet sig igen)
    if (!a || a === document.body) {
      let tries = 0;
      const focus = () => {
        const el = document.querySelector('[data-cmt="cmt-' + sKey + '-' + c.id + '"] .memo-cmt-sum');
        if (el) el.focus({ preventScroll: true });
        else if (++tries < 20) setTimeout(focus, 60);
      };
      setTimeout(focus, 60);
    }
  }, 1800);
}

// Modul-eksport
export { _memoCommentsLocked, resolveMemoComment, withdrawMemoComment, requestMemoRelease,
  _memoReleasePending, MEMO_RELEASE_REASON_SUB, MEMO_RELEASE_REASON, simulateMemoRelease };
