// Credit memo: sammenligning af to indstillede versioner: teksten uden skabelonens vejledning, ord-diff
// (længste fælles delfølge), ændrede tal og forsidens rækker som tekst. Flyttet ordret fra src/memo.jsx
// (linje 5859-5925) ved migrationen til Vue; kun import- og export-linjerne er nye.
import { MEMO_SCAFFOLD } from './memoReview.js';

/* ── Sammenligning af to indstillede versioner ───────────────────────────────
   Afsnit for afsnit: tilføjet tekst understreget med grønt, fjernet tekst
   overstreget med rødt. Ændrede tal står øverst ved afsnittet, så man ikke
   skal lede efter dem. Forsiden sammenlignes række for række.
   ──────────────────────────────────────────────────────────────────────────── */
function _memoPlainText(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  d.querySelectorAll(MEMO_SCAFFOLD + ', .tpl-draft-label').forEach(el => el.remove());
  d.querySelectorAll('p, li, h3, h4, td, th, blockquote, div, br').forEach(el => el.after(document.createTextNode(' ')));
  return d.textContent.replace(/\s+/g, ' ').trim();
}
/** Ord-diff: [{ t: '=' | '-' | '+', w: [ord] }] */
function _memoDiffWords(a, b) {
  const A = a ? a.split(' ') : [], B = b ? b.split(' ') : [];
  let pre = 0;
  while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++;
  let suf = 0;
  while (suf < A.length - pre && suf < B.length - pre && A[A.length - 1 - suf] === B[B.length - 1 - suf]) suf++;
  const a2 = A.slice(pre, A.length - suf), b2 = B.slice(pre, B.length - suf);
  const ops = [];
  const push = (tp, w) => {
    if (!w.length) return;
    const last = ops[ops.length - 1];
    if (last && last.t === tp) last.w = last.w.concat(w); else ops.push({ t: tp, w: w.slice() });
  };
  push('=', A.slice(0, pre));
  const n = a2.length, m = b2.length;
  if (n * m > 4000000) { push('-', a2); push('+', b2); }
  else {
    const L = [];
    for (let i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a2[i] === b2[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a2[i] === b2[j]) { push('=', [a2[i]]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { push('-', [a2[i]]); i++; }
      else { push('+', [b2[j]]); j++; }
    }
    push('-', a2.slice(i));
    push('+', b2.slice(j));
  }
  push('=', A.slice(A.length - suf));
  return ops;
}
/* Ændringer, der indeholder tal: [{ from, to }] */
function _memoNumChanges(ops) {
  const out = [];
  let del = [], ins = [];
  const flush = () => {
    const f = del.join(' '), to = ins.join(' ');
    if (/\d/.test(f + to)) out.push({ from: f, to });
    del = []; ins = [];
  };
  ops.forEach(o => {
    if (o.t === '=') { if (del.length || ins.length) flush(); }
    else if (o.t === '-') del = del.concat(o.w);
    else ins = ins.concat(o.w);
  });
  if (del.length || ins.length) flush();
  return out;
}
function _memoFactText(r) {
  if (!r) return '';
  if (r.items) return [r.summary].concat((r.items || []).map(it => [it.id, it.text, it.tag].filter(Boolean).join(' '))).filter(Boolean).join('; ');
  return r.value || '';
}

// Modul-eksport
export { _memoPlainText, _memoDiffWords, _memoNumChanges, _memoFactText };
