// Credit memo: modellen bag det indbyggede memo (src/memo.jsx og src/memo_ai.jsx). src/bootstrap.js
// importerer denne fil på memo_ai.jsx' og memo.jsx' gamle plads (efter prompts.js, før workspace), så det,
// filerne gjorde, da de blev indlæst, sker i samme rækkefølge som før, også i copilot-tilstand:
//   1. AI-mærkets to tekster som CSS-variabler på <html> (før i <style id="memo-ed-css">)
//   2. kommentarsporet seedes én gang (memo4-comments:<afsnit>, memo4-comments-seeded)
//   3. gamle gennemgange flyttes, og gemte afsnit fra en ældre skabelon ryddes
//      (memo4-seed-version, på engelsk memo4-seed-version:en)
//   4. window.CW_MEMO_STATUS (sagslisten i data.js, sagshovedet og klarhedstjekket i workspace) og
//      window.CW_MEMO_SNAPSHOT (workspace: indstillingen og ændrede afsnit)
//   5. window.__memoCheckCite (de automatiske browsertests) og window.CW_CITE_ISSUES (klarhedstjekket)
//   6. window.CW_OPEN_MEMO og CW_OPEN_MEMO_VERSION (dybdelink og indstillede versioner; sagen kalder dem
//      i begge memotilstande). De sender 'cw-memo-open' og 'cw-memo-view' på window efter 0 ms.
// Sproget er fast pr. sideindlæsning: memoTemplates.js læser window.CW_LANG og fletter den engelske
// skabelon ind, når modulerne indlæses, før seed-versionen regnes ud.
// Modulerne har ingen virkninger uden for sig selv. Vue-komponenterne importerer fra dem (fx
// '@/domain/memo/memoStatus.js'), ikke fra denne fil: den skal kun køre én gang. Memoets dokument-
// stylesheet er src/styles/memo-document.less (main.js). Komponenterne (WSMemo og resten af memo.jsx,
// komponenterne i memo_ai.jsx og window.MemoAI) er Vue-filerne i src/views/memo.
import { seedMemoComments } from './memoComments.js';
import { MEMO_SECTIONS, SEC, MEMO_EN, MEMO_SOURCES } from './memoTemplates.js';
import { applyMemoSeedVersion, sectionHtml } from './memoReview.js';
import { memoStatus } from './memoStatus.js';
import { _memoFill } from './memoFormat.js';
import { memoSnapshot } from './memoSubmission.js';
import { checkCite, citeContext, citeTwinDa, memoDocInCase } from './memoCite.js';
import { setMemoPendingOpen, _memoGoToMemo, setMemoView } from './memoView.js';

// memo.jsx linje 3-261 (<style id="memo-ed-css">) oversatte AI-mærkets to tekster, da filen blev indlæst.
// Migration: dokumentets regler står nu i src/styles/memo-document.less (content: var(--memo-ai-label));
// teksterne sættes her én gang som CSS-strenge på <html>. Sproget er fast pr. sideindlæsning.
document.documentElement.style.setProperty('--memo-ai-label', JSON.stringify(typeof t === 'function' ? t('AI-genereret') : 'AI-genereret'));
document.documentElement.style.setProperty('--memo-ai-label-edited', JSON.stringify(typeof t === 'function' ? t('AI-genereret + rådgiverens rettelser') : 'AI-genereret + rådgiverens rettelser'));

// memo.jsx linje 339-352 og 2042-2059: kørte, da filen blev indlæst
seedMemoComments();
applyMemoSeedVersion();

window.CW_MEMO_STATUS = memoStatus;
window.CW_MEMO_SNAPSHOT = memoSnapshot;

/* Til de automatiske browsertests: kontrollér én henvisning i memoet */
window.__memoCheckCite = function (el) {
  const doc = (window.CASE_DOCS || []).find(d => d.name === el.getAttribute('data-doc'));
  if (!doc) return { state: 'nodoc' };
  return checkCite({ doc, page: el.getAttribute('data-page'), quote: (el.textContent || '').trim(), context: citeContext(el), alt: citeTwinDa(el) });
};

/* Til klarhedstjekket: de henvisninger i memoets afsnit, som kildeviseren ikke
   kan bekræfte. Læser afsnittenes gemte tekst, så memoet ikke skal være vist.
   CW_CITE_ISSUES({ sections: ['risk', ...] }) begrænser til bestemte afsnit.
   → { checked, green, unverified: [item], contra: [item] }
   item = { section, text, claim, doc, page, state }
   state: 'context' (kontrollér sammenhængen) | 'missing' (ikke fundet) |
   'nodoc' (dokumentet findes ikke) i unverified; 'contra' (kilden siger det modsatte) i contra.
   Resultatet huskes pr. afsnitstekst, så gentagne kald er billige. */
const _citeIssueCache = new Map();
window.CW_CITE_ISSUES = function (opts) {
  const keys = opts && Array.isArray(opts.sections) && opts.sections.length ? opts.sections : MEMO_SECTIONS.map(s => s.k);
  const out = { checked: 0, green: 0, unverified: [], contra: [] };
  keys.forEach(k => {
    const html = sectionHtml(k);
    const ck = (MEMO_EN ? 'en:' : 'da:') + k + ':' + html;
    let rows = _citeIssueCache.get(ck);
    if (!rows) {
      rows = [];
      const sec = document.createElement('div');
      sec.className = 'memo-sec';
      sec.id = 'ms-' + k;
      const body = document.createElement('div');
      body.className = 'memo-body';
      body.innerHTML = html;
      sec.appendChild(body);
      body.querySelectorAll('.memo-cite').forEach(el => {
        const name = el.getAttribute('data-doc') || '';
        const page = el.getAttribute('data-page') || '';
        const text = (el.textContent || '').trim();
        const doc = (window.CASE_DOCS || []).find(d => d.name === name);
        if (!doc || !memoDocInCase(name)) { rows.push({ section: k, text, claim: text, doc: name, page, state: 'nodoc' }); return; }
        const r = checkCite({ doc, page, quote: text, context: citeContext(el), alt: citeTwinDa(el) });
        rows.push({ section: k, text, claim: r.claim || text, doc: name, page, state: r.state });
      });
      if (_citeIssueCache.size > 200) _citeIssueCache.clear();
      _citeIssueCache.set(ck, rows);
    }
    rows.forEach(x => {
      out.checked++;
      if (x.state === 'exact' || x.state === 'format') out.green++;
      else if (x.state === 'contra') out.contra.push(Object.assign({}, x));
      else out.unverified.push(Object.assign({}, x));
    });
  });
  return out;
};

/* ── Dybdelink og versioner udefra ───────────────────────────────────────────
   CW_OPEN_MEMO({ section, commentId?, field? }) åbner memo-fanen og ruller
   til afsnittet, kommentaren eller det tomme felt (field = id fra
   CW_MEMO_STATUS().blankGroups). CW_OPEN_MEMO_VERSION(n, { compare }) viser
   en indstillet version skrivebeskyttet, evt. sammenlignet med den forrige.
   ──────────────────────────────────────────────────────────────────────────── */
window.CW_OPEN_MEMO = function (target) {
  target = target || {};
  let section = target.section || (target.field ? String(target.field).split(':')[0] : null);
  if (!MEMO_SECTIONS.some(s => s.k === section)) section = null;
  // Migration: _memoPendingOpen ligger i memoView.js (en ES-import kan ikke tildeles)
  setMemoPendingOpen({ section, commentId: target.commentId != null ? target.commentId : null, field: target.field || null });
  _memoGoToMemo();
  setTimeout(() => { try { window.dispatchEvent(new CustomEvent('cw-memo-open')); } catch (e) {} }, 0);
  return true;
};
window.CW_OPEN_MEMO_VERSION = function (n, opts) {
  const v = Number(n);
  const snap = window.CW && CW.memoSnapshot ? CW.memoSnapshot(v) : null;
  if (!snap) { if (window.CW) CW.toast(_memoFill(t('Version {v} findes ikke.'), { v: n }), { tone: 'warn' }); return false; }
  const compare = !!(opts && opts.compare) && !!CW.memoSnapshot(v - 1);
  // Migration: _memoView ligger i memoView.js (en ES-import kan ikke tildeles)
  setMemoView({ version: v, compare });
  _memoGoToMemo();
  setTimeout(() => { try { window.dispatchEvent(new CustomEvent('cw-memo-view')); } catch (e) {} }, 0);
  return true;
};

// Migration: memo.jsx' navne på øverste niveau var globale (Babel). memo_ai.jsx læste SEC og
// MEMO_SOURCES som globale navne (memoAi.js importerer dem nu); de gamle browsertests gør stadig, så de
// ligger fortsat på window.
window.SEC = SEC;
window.MEMO_SOURCES = MEMO_SOURCES;
