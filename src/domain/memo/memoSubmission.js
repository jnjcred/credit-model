// Credit memo ved indstilling: hele memoet frosset (window.CW_MEMO_SNAPSHOT, som index.js sætter) og
// indstillingspåtegningen. Flyttet ordret fra src/memo.jsx (linje 2315-2349 og 2352-2377) ved
// migrationen til Vue; kun import- og export-linjerne er nye.
import { loadComments } from './memoComments.js';
import { MEMO_SECTIONS, MEMO_EN, MEMO_REVIEWER } from './memoTemplates.js';
import { sectionHtml } from './memoReview.js';
import { memoSectionStatus, memoCommentCounts, memoBlankFields } from './memoStatus.js';
import { _memoFmtLang, _cmtInitials } from './memoFormat.js';
import { memoFront } from './memoFacts.js';

/* Kørselsattributter på kildehenvisningerne (tastatur og skærmlæser) hører
   ikke til teksten. De fjernes, før teksten fryses eller eksporteres. */
function _memoStripRuntime(html) {
  if (!html || html.indexOf('memo-cite') < 0) return html || '';
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('.memo-cite').forEach(el => { el.removeAttribute('role'); el.removeAttribute('tabindex'); el.removeAttribute('aria-label'); el.removeAttribute('data-nodoc'); });
  return d.innerHTML;
}

/**
 * Hele memoet som det står nu, på det aktive sprog: { [afsnit]: html }.
 * Virker også når memoet ikke er vist. Workspace giver det til CW.submit(),
 * så den indstillede version kan vises og eksporteres uændret bagefter.
 * `__lang` fortæller hvilket sprog versionen blev frosset på.
 */
function memoSnapshot() {
  const out = {};
  const review = {};
  MEMO_SECTIONS.forEach(s => {
    out[s.k] = _memoStripRuntime(sectionHtml(s.k));
    const st = memoSectionStatus(s.k);
    if (st.reviewed) review[s.k] = st.reviewed;
  });
  out.__lang = MEMO_EN ? 'en' : 'da';
  // Det komitéen får, fryses også: gennemgangen pr. afsnit, forsiden (memohoved
  // og "Indstillingen i hovedtræk") og de løste kommentarer med begrundelse
  out.__review = review;
  out.__front = memoFront();
  out.__resolved = memoCommentCounts().resolvedList;
  // Hele kommentarsporet fryses med, så den låste version viser det, komitéen fik
  out.__comments = MEMO_SECTIONS.reduce((m, s) => { m[s.k] = loadComments(s.k); return m; }, {});
  _memoSignEndorsement(out);
  return out;
}

/* Indstillingspåtegningen (afsnit 11) udfyldes ved indstilling med
   rådgiverens initialer og navn og tidspunktet. Bevillingspåtegningen er
   komitéens og forbliver tom. */
function _memoSignEndorsement(out) {
  const html = out.endorsement;
  if (!html) return;
  const d = document.createElement('div');
  d.innerHTML = html;
  const blanks = d.querySelectorAll('.tpl-blank');
  const fields = memoBlankFields('endorsement', html);
  const at = new Date().toISOString();
  const lang = out.__lang === 'en' ? 'en' : 'da';
  const fill = (id, text) => {
    const f = fields.find(x => x.id === id);
    const el = f ? blanks[f.index] : null;
    if (!el) return;
    const s = document.createElement('span');
    s.className = 'memo-signed';
    s.textContent = text;
    el.replaceWith(s);
  };
  fill('endorsement:1', _memoFmtLang(at, lang) + ' ' + _memoFmtLang(at, lang, true).split(' ').pop());
  fill('endorsement:3', _cmtInitials(MEMO_REVIEWER) + ' (' + MEMO_REVIEWER + ')');
  out.endorsement = d.innerHTML;
  out.__signed = { by: MEMO_REVIEWER, at };
}

// Modul-eksport
export { _memoStripRuntime, memoSnapshot, _memoSignEndorsement };
