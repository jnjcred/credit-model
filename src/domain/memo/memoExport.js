// Credit memo i Word: tallene til eksportdialogen, klargøringen af afsnittene (uden vejledning og
// ophavsmærker; tomme felter og ubekræftede tal markeret; henvisninger som dokument og side),
// faktaboksen, kvitteringen for indstillingen og selve filen (.doc: HTML med BOM, application/msword).
// Flyttet ordret fra src/memo.jsx (linje 2379-2412, 2697-2713, 3984-4097 og 4160-4288) ved migrationen
// til Vue; kun import- og export-linjerne er nye. exportMemoToWord lægger filens HTML i
// window.__memoLastExport (de automatiske browsertests) og henter filen i browseren.
import { commentState, MEMO_DEPT_MAP, MEMO_DEPTS, isBlockingComment, loadComments, commentWhen } from './memoComments.js';
import { MEMO_SECTIONS, MEMO_EN } from './memoTemplates.js';
import { sectionHtml } from './memoReview.js';
import { memoSectionStatus, memoBlankFields } from './memoStatus.js';
import { _memoFill, _memoTL, memoRefLabel, _memoFmtLang, _memoFmtDay, memoDate } from './memoFormat.js';
import { memoFacts, memoRisk } from './memoFacts.js';
import { memoCiteCheckState } from './memoCite.js';
import { memoLocked, memoLockedReview } from './memoView.js';
import { memoAppendixAdd } from './memoAppendix.js';

/* Kvittering for indstillingen i Word-filen. For den gældende indstilling
   læses note og begrundelser fra sagen; en tidligere version har noten fra
   sagens historik. Frigivne blokeringer og kommentarer er frosset i versionen. */
function memoReceiptHtml(locked, esc, t, fmtWhen) {
  const secs = locked.sections || {};
  const cs = (window.CW && CW.caseState()) || {};
  const current = !locked.past;
  const hist = (cs.history || []).filter(h => h.type === 'submitted' && h.version === locked.version).slice(-1)[0] || {};
  const note = current ? cs.submitNote : hist.note;
  const none = esc(t('Ingen'));
  const li = (arr) => arr.length ? '<ul>' + arr.map(x => '<li>' + x + '</li>').join('') + '</ul>' : none;
  const rows = [];
  rows.push([t('Indstillet'), esc(t('Version') + ' ' + locked.version + ', ' + fmtWhen(locked.at) + (locked.by ? ', ' + locked.by : ''))]);
  rows.push([t('Note til kreditkomitéen'), note ? esc(note) : none]);
  if (current) {
    const reasons = Array.isArray(cs.submitReasons) ? cs.submitReasons : [];
    rows.push([t('Begrundelser'), li(reasons.map(r => esc(r.text || '') + '<br/>' + esc(t('Begrundelse')) + ': ' + esc(r.reason || '')))]);
  }
  const released = (Array.isArray(secs.__resolved) ? secs.__resolved : []).filter(x => x.blocking);
  rows.push([t('Frigivne blokeringer'), li(released.map(c => esc((c.sectionName ? c.sectionName + ': ' : '') + (c.text || '')) + '<br/>'
    + esc(_memoFill(t('Frigivet af {who} {when}'), { who: [c.resolvedBy, c.resolvedByDept].filter(Boolean).join(', '), when: c.resolvedAt ? fmtWhen(c.resolvedAt) : '' }))
    + (c.reason ? '. ' + esc(t('Begrundelse')) + ': ' + esc(c.reason) : '') + (c.reply ? '. ' + esc(t('Svar fra rådgiveren')) + ': ' + esc(c.reply) : '')))]);
  if (cs.skipReason) rows.push([t('Kundeinput sprunget over'), esc(t('Begrundelse')) + ': ' + esc(cs.skipReason)]);
  const open = [];
  const frozen = secs.__comments || {};
  MEMO_SECTIONS.forEach(s => (frozen[s.k] || []).forEach(c => {
    if (commentState(c) !== 'open') return;
    const d = MEMO_DEPT_MAP[c.dept] || MEMO_DEPTS[0];
    open.push(esc(s.num + '. ' + t(s.label) + ': ' + c.author + ' (' + t(d.label) + '), ' + fmtWhen(c.at)) + (isBlockingComment(c) ? ' <strong>' + esc(t('Blokerer indstilling')) + '</strong>' : '') + '<br/>' + esc(t(c.text)));
  }));
  rows.push([t('Åbne kommentarer'), li(open)]);
  return '<h2>' + esc(t('Kvittering for indstillingen')) + '</h2><table class="facts">'
    + rows.map(r => '<tr><td style="width:32%;color:#555;vertical-align:top;">' + esc(r[0]) + '</td><td style="vertical-align:top;">' + r[1] + '</td></tr>').join('') + '</table>';
}

/* Samme boks til Word-eksporten */
function memoFactsHtml(esc, factRows, lang) {
  const t = (s) => (lang ? _memoTL(lang, s) : window.t(s));
  const src = (s) => (s && s.doc ? ' <span class="cite-ref">[' + esc(s.doc) + (s.ref ? ', ' + esc(memoRefLabel(s.ref, lang)) : '') + ']</span>' : '');
  const none = '<span class="blank">[' + esc(t('ikke udfyldt')) + ']</span>';
  const rows = (factRows || memoFacts()).map(r => {
    let v;
    if (r.items) {
      v = r.items.length
        ? (r.summary ? esc(r.summary) + '<br/>' : '') + r.items.map(it => '&bull; ' + (it.id ? '<strong>' + esc(it.id) + '</strong> ' : '') + (it.text ? esc(it.text) : none) + (it.tone === 'ok' ? ' <span style="color:#555;">&middot; ' + esc(t('opfyldt')) + '</span>' : '') + src(it.source)).join('<br/>')
          + (r.more > 0 ? '<br/>+' + r.more + ' ' + esc(t('med middel vægt i afsnit 5')) : '')
        : none;
    } else v = r.value ? esc(r.value) + src(r.source) : r.fallback ? esc(r.fallback) : none;
    return '<tr><td style="width:32%;color:#555;vertical-align:top;">' + esc(r.label) + '</td><td style="vertical-align:top;">' + v + '</td></tr>';
  });
  return '<h2>' + esc(t('Indstillingen i hovedtræk')) + '</h2><table class="facts">' + rows.join('') + '</table>';
}

/* ── Klargøring til eksport ──────────────────────────────────────────────────
   Det eksporterede dokument er det eneste af værktøjet nogen uden for huset
   ser. Skabelonens vejledningstekst, gule Udkast-mærker og interne noter må
   ikke følge med ud til kreditkomitéen.
   ──────────────────────────────────────────────────────────────────────────── */

function prepareForExport(html, lang) {
  const t = (s) => (lang ? _memoTL(lang, s) : window.t(s));
  const d = document.createElement('div');
  d.innerHTML = html || '';

  // Vejledning og noter til den der skriver. Hører ikke hjemme i det færdige dokument.
  d.querySelectorAll('.tpl-hints, .tpl-hint, .tpl-guide, .tpl-note').forEach(el => el.remove());

  // Ophavsmærkerne er internt arbejdsmateriale. Om et afsnit er gennemgået,
  // skrives i stedet ud ved afsnittet (se exportMemoToWord).
  d.querySelectorAll('[data-ai]').forEach(el => {
    el.removeAttribute('data-ai');
    el.removeAttribute('data-ai-at');
    el.removeAttribute('data-ai-label');
  });

  // Det lille "Udkast"-mærke ryger, men blokken beholder en streg i margenen,
  // så komitéen kan se præcis hvilken tekst der ikke er gennemgået.
  d.querySelectorAll('.tpl-draft-label').forEach(el => el.remove());
  d.querySelectorAll('.tpl-draft').forEach(el => { el.classList.remove('tpl-draft'); el.classList.add('draft-block'); });

  // Uudfyldte felter skal være synlige for læseren, ikke camoufleret som tekst.
  d.querySelectorAll('.tpl-blank').forEach(el => {
    const txt = (el.textContent || '').trim().replace(/^\[|\]$/g, '');
    const mark = document.createElement('span');
    mark.className = 'blank';
    mark.textContent = '[' + t('ikke udfyldt') + ': ' + txt + ']';
    el.replaceWith(mark);
  });

  // Kildehenvisningerne beholder deres tekst, men bliver til en fodnotelignende
  // reference så læseren kan se hvor tallet kommer fra i et Word-dokument.
  // Bilagslisten i Word nævner alle sagens dokumenter, også de nye
  memoAppendixAdd(d);

  // Et tal, kildeviseren ikke kan finde eller finder modsagt, får en advarsel
  const unconfirmed = new Set([...d.querySelectorAll('.memo-cite')].filter(el => {
    const st = memoCiteCheckState(el);
    return st === 'missing' || st === 'contra';
  }));
  d.querySelectorAll('.memo-cite').forEach(el => {
    const doc = el.getAttribute('data-doc');
    const page = el.getAttribute('data-page');
    if (doc) {
      const ref = document.createElement('span');
      ref.className = 'cite-ref';
      ref.textContent = ' [' + doc + (page ? ', ' + memoRefLabel(page, lang) : '') + ']';
      el.after(ref);
      if (unconfirmed.has(el)) {
        const warn = document.createElement('span');
        warn.className = 'blank';
        warn.textContent = ' [' + t('ikke bekræftet i kilden') + ']';
        ref.after(warn);
      }
    }
    el.replaceWith(...el.childNodes);
  });

  return d.innerHTML;
}

/** Tæller hvad der mangler, så man advares før man sender. Samme status som
    sektionsoversigten, så dialogen ikke kan sige noget andet end skærmen. */
/* Tæller som klarhedstjekket: komitéens felter (afsnit 11) er ikke mangler,
   og i en indstillet version er de øvrige tomme felter begrundet. */
function exportReadiness(sections) {
  const empty = [], drafts = [];
  const locked = memoLocked();
  let caseData = 0, template = 0, committee = 0, reviewed = 0;
  const blankSecs = {};
  sections.forEach(s => {
    const html = locked && locked.sections && locked.sections[s.k] != null ? locked.sections[s.k] : null;
    const st = memoSectionStatus(s.k, html, memoLockedReview(locked, s.k));
    const name = s.num + '. ' + t(s.label);
    if (st.state === 'empty') empty.push(name);
    if (st.unreviewed) drafts.push(name);
    if (st.reviewed) reviewed++;
    memoBlankFields(s.k, html).forEach(f => {
      if (f.group === 'committee') { committee++; return; }
      if (f.group === 'auto') return;
      if (f.group === 'template') template++; else caseData++;
      blankSecs[s.k] = true;
    });
  });
  return { blanks: caseData + template, caseData, template, committee, blankSecs: Object.keys(blankSecs).length,
    reviewed, total: sections.length, empty, drafts, locked };
}
/* Samme statuslinje i eksportdialogen og i Word-filen. tt: sprogfunktion. */
function memoExportStatusLine(r, tt) {
  tt = tt || t;
  return _memoFill(tt('{a} af {n} afsnit gennemgået'), { a: r.reviewed, n: r.total })
    + (r.blankSecs ? ', ' + _memoFill(r.locked ? tt('{n} med begrundede tomme felter') : tt('{n} med tomme felter'), { n: r.blankSecs }) : '') + '.'
    + (r.committee ? ' ' + tt('Felterne i afsnit 11 udfyldes af kreditkomitéen.') : '')
    + (r.drafts.length ? ' ' + r.drafts.length + ' ' + tt('afsnit er udkast, der ikke er gennemgået af rådgiver, og er markeret nedenfor.') : '');
}

/* Eksportdialogens linje for et udkast: "Mærket Udkast: 14 afsnit er ikke
   gennemgået, og 18 felter er tomme. De tomme felter er markeret i filen."
   Felterne tælles som i klarhedstjekket (uden komitéens felter i afsnit 11). */
function memoExportDraftLine(r) {
  const parts = [];
  if (r.drafts.length) parts.push(_memoFill(t('{n} afsnit er ikke gennemgået'), { n: r.drafts.length }));
  if (r.empty.length) parts.push(_memoFill(t('{n} afsnit er ikke skrevet'), { n: r.empty.length }));
  if (r.blanks) parts.push(_memoFill(r.blanks === 1 ? t('{n} felt er tomt') : t('{n} felter er tomme'), { n: r.blanks }));
  if (!parts.length) return t('Mærket Udkast, fordi memoet ikke er indstillet.');
  const list = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ', ' + t('og') + ' ' + parts[parts.length - 1];
  return t('Mærket Udkast') + ': ' + list + '.' + (r.blanks ? ' ' + t('De tomme felter er markeret i filen.') : '');
}

/* ── Word export ─────────────────────────────────────────────────────────── */
function exportMemoToWord(sections, opts) {
  opts = opts || {};
  // En indstillet version eksporteres på det sprog, den blev indstillet på,
  // så dokumentet ikke blander etiketter og tekst fra to sprog
  const lockedDoc = memoLocked();
  const uiLang = MEMO_EN ? 'en' : 'da';
  const docLang = lockedDoc && lockedDoc.sections && lockedDoc.lang ? lockedDoc.lang : uiLang;
  const t = (s) => _memoTL(docLang, s);
  const fmtWhen = (iso) => (docLang === uiLang ? CW.fmtWhen(iso) : _memoFmtLang(iso, docLang, true));
  const fmtDay = (iso) => (docLang === uiLang ? _memoFmtDay(iso) : _memoFmtLang(iso, docLang));
  const esc = (s) => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const parts = [];
  parts.push(`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`);
  const CO = (window.DATA && DATA.COMPANY) || {};
  const coName = CO.name || 'Nordhavn Composite A/S';
  parts.push(`<head><meta charset="utf-8"><title>${esc(t('Kreditindstilling'))} - ${esc(coName)}</title>`);
  parts.push(`<style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #222; }
    h1 { font-size: 20pt; color: #111; margin: 0 0 4pt; }
    h2 { font-size: 13pt; color: #111; margin: 18pt 0 6pt; border-bottom: 1pt solid #333; padding-bottom: 2pt; }
    h3 { font-size: 11pt; color: #333; margin: 10pt 0 4pt; }
    p { margin: 0 0 6pt; line-height: 1.45; }
    table { border-collapse: collapse; width: 100%; font-size: 10pt; margin: 6pt 0; }
    th { border-bottom: 1.5pt solid #333; padding: 4pt 6pt; text-align: left; font-weight: 600; color: #333; }
    td { border-bottom: 0.5pt solid #bbb; padding: 4pt 6pt; }
    blockquote { background: #f5f5f5; border-left: 3pt solid #333; padding: 8pt 12pt; margin: 8pt 0; }
    ul, ol { margin: 4pt 0 6pt 18pt; }
    li { margin: 2pt 0; }
    .memo-cite { border-bottom: 1pt dotted #4F81BD; }
    .meta { color: #555; font-size: 10pt; }
    .cmt-box { background: #fff8e6; border-left: 3pt solid #d97706; padding: 6pt 10pt; margin: 4pt 0; font-size: 10pt; }
    .cmt-meta { color: #555; font-size: 9pt; margin-bottom: 2pt; }
    .cmt-dept { font-weight: 600; }
    .blank { color: #b45309; background: #fff8e6; padding: 0 3pt; }
    .cite-ref { color: #4F81BD; font-size: 8.5pt; }
    .draft-flag { color: #1d4ed8; background: #eef3ff; border-left: 3pt solid #1d4ed8; padding: 3pt 8pt; font-size: 9.5pt; font-weight: 600; }
    .draft-block { border-left: 2pt solid #9db4f0; padding-left: 8pt; margin: 4pt 0; }
    .reviewed { color: #107a4a; font-size: 9pt; }
    .status { background: #f5f5f5; padding: 6pt 10pt; font-size: 10pt; }
    .stamp { font-size: 9.5pt; font-weight: 600; padding: 4pt 8pt; margin: 0 0 10pt; }
    .stamp.draft { color: #92400e; background: #fff8e6; border-left: 3pt solid #d97706; }
    .stamp.locked { color: #107a4a; background: #eefaf3; border-left: 3pt solid #107a4a; }
    table.facts td { border: 0.5pt solid #bbb; padding: 4pt 6pt; font-size: 10pt; }
  </style></head><body>`);
  // Stempel: hvilken version er det, og står nogen inde for den? Et udkast og
  // den indstillede version må ikke kunne forveksles, når filen sendes videre.
  const locked = memoLocked();
  const lockedSecs = locked && locked.sections ? locked.sections : null;
  // Forsiden fra indstillingen, ellers den levende (uden "Udkast:", når sagen er indstillet)
  const front = locked && locked.front ? locked.front : null;
  const stamp = locked
    ? t('Indstillet version') + ' ' + locked.version + ', ' + fmtDay(locked.at) + '. ' + t('Låst: svarer til det, kreditkomitéen har fået.') + (locked.past ? ' ' + t('Tidligere version, ikke den gældende.') : '')
    : t('Udkast') + ', ' + t('ikke indstillet') + '. ' + t('Kan ændre sig før indstilling.');
  parts.push(`<p class="stamp ${locked ? 'locked' : 'draft'}">${esc(stamp)} ${esc(t('Eksporteret'))} ${esc(fmtWhen(new Date().toISOString()))}.</p>`);
  parts.push(`<h1>${esc(t('Kreditindstilling'))} · ${esc(coName)}</h1>`);
  parts.push(`<p class="meta"><strong>${esc(t('Indstilling af'))} ${esc(t('nyt engagement'))} ${esc(t('til'))} ${esc(t('Kreditkomité'))}</strong><br/>${esc(t('Kreditrisiko:'))} ${esc(front ? front.risk : memoRisk())} · ${esc(t('Kundetype:'))} ${esc(t('Erhverv, SMV'))}</p>`);
  parts.push(`<table style="width:100%; font-size:10pt; margin: 8pt 0 14pt;">`);
  parts.push(`<tr><td><strong>${esc(t('Dato:'))}</strong> ${esc(memoDate(locked, docLang))}</td><td><strong>CVR:</strong> ${esc(CO.cvr || '')}</td></tr>`);
  parts.push(`<tr><td><strong>${esc(t('Status:'))}</strong> ${esc(locked ? t('Indstillet version') + ' ' + locked.version : t('Udkast'))}</td><td></td></tr>`);
  parts.push(`<tr><td><strong>${esc(t('Branche:'))}</strong> ${esc(t('Vindmøllekomponenter / komposit'))}</td><td><strong>${esc(t('Sagsnr.:'))}</strong> ${esc(CO.caseNr || '')}</td></tr>`);
  parts.push(`<tr><td><strong>${esc(t('Primær kundeansvarlig:'))}</strong> ${esc(t('Mette Larsen, Kredit'))}</td><td><strong>${esc(t('Sekundær:'))}</strong> ${esc(t('Sofie Andersen, Erhverv'))}</td></tr>`);
  parts.push(`</table>`);
  parts.push(`<p class="meta">${esc(t('Dispensation fra acceptkriterie'))}: ${esc(t('Ingen'))} · ${esc(t('Eksporteret'))} ${esc(fmtDay(new Date().toISOString()))}</p>`);
  parts.push(memoFactsHtml(esc, front ? front.facts : memoFacts({ final: !!locked }), docLang));

  // Filen skal svare til skærmen. Før blev hvert afsnit rådgiveren ikke selv
  // havde tastet i, eksporteret som "[afsnittet er ikke skrevet]", mens
  // skærmen viste tekst. Nu eksporteres det der vises, og udkast der ikke er
  // gennemgået, markeres ved afsnittet, så komitéen ved hvad nogen står inde for.
  // Er sagen indstillet, er det den frosne version, der eksporteres.
  const htmlOf = (k) => (lockedSecs && lockedSecs[k] != null ? lockedSecs[k] : sectionHtml(k));
  const status = sections.map(s => memoSectionStatus(s.k, lockedSecs ? htmlOf(s.k) : null, memoLockedReview(locked, s.k)));
  // Samme tal som skærmen og eksportdialogen: gennemgåede afsnit. Komitéens
  // felter i afsnit 11 tælles ikke som tomme felter, rådgiveren skal begrunde.
  const statusLine = memoExportStatusLine(exportReadiness(sections), t);
  parts.push(`<p class="status">${esc(locked ? t('Status ved indstilling:') : t('Status ved eksport:'))} ${esc(statusLine)}</p>`);
  // Den indstillede version får kvitteringen med: note, begrundelser, frigivne
  // blokeringer, sprunget kundeinput og åbne kommentarer, som ved indstillingen
  if (locked && lockedSecs) parts.push(memoReceiptHtml(locked, esc, t, fmtWhen));

  sections.forEach((s, i) => {
    const st = status[i];
    const heading = /^B\d/.test(s.num) ? esc(t(s.label)) : `${esc(s.num)}) ${esc(t(s.label))}`;
    parts.push(`<h2>${heading}</h2>`);
    if (st.state === 'empty') {
      parts.push(`<p class="blank">[${esc(t('afsnittet er ikke skrevet'))}]</p>`);
    } else {
      if (st.stale) parts.push(`<p class="draft-flag">[${esc(t('Ændret efter gennemgang, ikke gennemgået igen'))}]</p>`);
      else if (st.unreviewed) parts.push(`<p class="draft-flag">[${esc(t('Udkast, ikke gennemgået af rådgiver'))}]</p>`);
      else if (st.reviewed) parts.push(`<p class="reviewed">${esc(t('Gennemgået af'))} ${esc(st.reviewed.by)}, ${esc(fmtWhen(st.reviewed.at))}</p>`);
      parts.push(prepareForExport(htmlOf(s.k), docLang));
    }

    // Interne noter følger kun med hvis brugeren beder om det. Hele sporet,
    // også løste og trukne tilbage, med hvem, hvornår og hvorfor.
    if (opts.comments) {
      // Indstillet: det frosne spor, ikke det levende
      const comments = lockedSecs && lockedSecs.__comments ? (lockedSecs.__comments[s.k] || []) : loadComments(s.k);
      if (comments.length > 0) {
        parts.push(`<h3>${esc(t('Interne kommentarer'))} (${comments.length})</h3>`);
        comments.forEach(c => {
          const d = MEMO_DEPT_MAP[c.dept] || MEMO_DEPTS[0];
          const st = commentState(c);
          const tail = st === 'resolved'
            ? (c.release ? `<div class="cmt-meta">${esc(t('Svar fra'))} ${esc(c.release.by)}, ${esc(fmtWhen(c.release.at))}: ${esc(t(c.release.text || ''))}</div>` : '')
              + `<div class="cmt-meta">${esc(c.resolved.dept ? t('Frigivet af') : t('Løst af'))} ${esc(c.resolved.by)}, ${esc(fmtWhen(c.resolved.at))}: ${esc(t(c.resolved.reason || ''))}</div>`
            : st === 'withdrawn' ? `<div class="cmt-meta">${esc(t('Trukket tilbage af'))} ${esc(c.withdrawn.by)}, ${esc(fmtWhen(c.withdrawn.at))}</div>`
            : isBlockingComment(c) ? `<div class="cmt-meta"><strong>${esc(t('Blokerer indstilling'))}</strong></div>` : '';
          parts.push(`<div class="cmt-box"><div class="cmt-meta"><span class="cmt-dept">${esc(c.author)}</span> · ${esc(t(d.label))} · ${esc(commentWhen(c))}</div>${esc(t(c.text)).replace(/\n/g, '<br/>')}${tail}</div>`);
        });
      }
    }
  });

  parts.push(`</body></html>`);
  const html = parts.join('\n');
  // Til de automatiske browsertests: det der faktisk blev skrevet i filen
  try { window.__memoLastExport = html; } catch (e) {}
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = t('Kreditindstilling') + '-' + coName.replace(/[^A-Za-z0-9æøåÆØÅ]+/g, '-').replace(/-+$/, '') + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Modul-eksport
export { memoReceiptHtml, memoFactsHtml, prepareForExport, exportReadiness, memoExportStatusLine,
  memoExportDraftLine, exportMemoToWord };
