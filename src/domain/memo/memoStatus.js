// Credit memo: status pr. afsnit, kommentarerne samlet, de tomme felter i grupper og memoets samlede
// status (window.CW_MEMO_STATUS, som index.js sætter). Flyttet ordret fra src/memo.jsx (linje
// 2108-2312) ved migrationen til Vue; kun import- og export-linjerne er nye. Status læses af
// localStorage og skabelonen, så den virker, også når memoet ikke er vist.
import { loadComments, commentState, MEMO_DEPT_MAP, isBlockingComment } from './memoComments.js';
import { SEC, MEMO_SECTIONS } from './memoTemplates.js';
import { savedSectionHtml, stampSeed, loadReview, _memoSigs, MEMO_SCAFFOLD, sectionHtml } from './memoReview.js';

/**
 * Status for ét afsnit, beregnet af teksten alene, så den også kan læses når
 * memoet ikke er vist. state: 'empty' | 'draft' (udkast, ikke gennemgået) |
 * 'blanks' (felter mangler) | 'done'.
 */
function memoSectionStatus(k, htmlOverride, reviewOverride) {
  const saved = savedSectionHtml(k);
  const html = htmlOverride != null ? htmlOverride : (saved !== null ? saved : stampSeed(SEC[k] || ''));
  const d = document.createElement('div');
  d.innerHTML = html;
  const blanks = d.querySelectorAll('.tpl-blank').length;
  const drafts = d.querySelectorAll('.tpl-draft').length;
  const machine = d.querySelectorAll('[data-ai]').length;
  // Den indstillede version har sin egen gennemgang med (reviewOverride).
  // Ellers gælder den gemte gennemgang kun, hvis teksten er den samme.
  let review = reviewOverride !== undefined ? reviewOverride : loadReview(k);
  let stale = null;
  if (reviewOverride === undefined && review && review.sig) {
    const now = _memoSigs(k);
    if (now.da !== review.sig.da || now.en !== review.sig.en) { stale = { by: review.by, at: review.at }; review = null; }
  }
  d.querySelectorAll(MEMO_SCAFFOLD + ', .tpl-draft-label').forEach(el => el.remove());
  const hasContent = d.textContent.replace(/\s+/g, '').length > 0;
  const reviewed = !!review && drafts === 0;
  const unreviewed = hasContent && !reviewed && (drafts > 0 || machine > 0 || saved === null || !!stale);
  const state = !hasContent ? 'empty' : unreviewed ? 'draft' : blanks ? 'blanks' : 'done';
  return { k, blanks, drafts, hasContent, unreviewed, reviewed: reviewed ? { by: review.by, at: review.at } : null, stale, state };
}

/* Kort forklaring til prik og tooltip. Status må ikke kun vises med farve. */
function memoStatusText(st) {
  if (!st) return '';
  if (st.state === 'empty') return t('Ikke skrevet');
  const parts = [];
  if (st.stale) parts.push(t('Ændret efter gennemgang'));
  else if (st.state === 'draft') parts.push(t('Udkast, ikke gennemgået'));
  else if (st.reviewed) parts.push(t('Gennemgået'));
  else if (st.state === 'done') parts.push(t('Færdig'));
  if (st.blanks) parts.push(st.blanks + ' ' + (st.blanks === 1 ? t('felt mangler') : t('felter mangler')));
  return parts.join(' - ');
}

/**
 * Memoets samlede status. Bruges af klarhedstjekket før indstilling, også når
 * memoet ikke er vist, så den læser localStorage og skabelonen direkte.
 */
/** Kommentarer samlet: åbne, løste, blokerende pr. afsnit og i alt. */
/* frozen: kommentarsporet fra en indstillet version ({ [afsnit]: [...] }). Uden
   det tælles det levende spor, som klarhedstjekket bruger. */
function memoCommentCounts(frozen) {
  const out = { open: {}, all: {}, openTotal: 0, resolvedTotal: 0, withdrawnTotal: 0, allTotal: 0, blocking: 0, blockingList: [], resolvedList: [], openList: [] };
  MEMO_SECTIONS.forEach(s => {
    const list = frozen ? (frozen[s.k] || []) : loadComments(s.k);
    out.all[s.k] = list.length;
    out.allTotal += list.length;
    out.open[s.k] = 0;
    list.forEach(c => {
      const st = commentState(c);
      if (st === 'open') {
        out.open[s.k]++; out.openTotal++;
        // Alle åbne kommentarer, til kvitteringen ved indstilling (workspace)
        out.openList.push({ id: c.id, section: s.k, sectionName: s.num + '. ' + t(s.label), author: c.author, dept: t((MEMO_DEPT_MAP[c.dept] || {}).label || c.dept), text: t(c.text), blocking: isBlockingComment(c), at: c.at || null });
        if (isBlockingComment(c)) {
          out.blocking++;
          // awaiting: rådgiveren har svaret og bedt kontrolfunktionen om frigivelse
          out.blockingList.push({ id: c.id, section: s.k, sectionName: s.num + '. ' + t(s.label), author: c.author, dept: t((MEMO_DEPT_MAP[c.dept] || {}).label || c.dept), text: t(c.text), at: c.at || null,
            awaiting: !!c.release, releaseRequestedBy: c.release ? c.release.by : null, releaseRequestedAt: c.release ? c.release.at : null, reply: c.release ? c.release.text : null });
        }
      } else if (st === 'resolved') {
        out.resolvedTotal++;
        // Hvem, hvornår og hvorfor, til kvitteringen ved indstilling
        out.resolvedList.push({ id: c.id, section: s.k, sectionName: s.num + '. ' + t(s.label), author: c.author, dept: t((MEMO_DEPT_MAP[c.dept] || {}).label || c.dept),
          text: t(c.text), blocking: isBlockingComment(c), resolvedBy: c.resolved.by,
          resolvedByDept: c.resolved.dept ? t((MEMO_DEPT_MAP[c.resolved.dept] || {}).label || c.resolved.dept) : null,
          resolvedAt: c.resolved.at, reason: t(c.resolved.reason || ''), reply: c.release ? c.release.text : null });
      }
      else out.withdrawnTotal++;
    });
  });
  return out;
}

/* ── Tomme felter i tre grupper ──────────────────────────────────────────────
   Klarhedstjekket skal ikke kræve begrundelse for felter, som komitéen selv
   udfylder, og skal kunne samle rene skabelonrester under én begrundelse.
   - committee: udfyldes af kreditkomitéen ved påtegningen (hele afsnit 11)
   - template:  skabelonrester uden sagsindhold (tom tabelrække, "evt."-felter,
                vejledning til valg, der ikke er aktuelle)
   - caseData:  sagens data mangler faktisk
   Felterne genkendes på teksten (dansk eller engelsk) i skabelonens rækkefølge.
   Ukendte felter (f.eks. skrevet af AI) regnes som manglende sagsdata.
   Rækker: [dansk tekst, engelsk tekst, gruppe, etiket]
   ──────────────────────────────────────────────────────────────────────────── */
const MEMO_BLANKS = {
  financing: [
    ['[tilføj række]', '[add row]', 'template', 'Tom række i finansieringstabellen'],
    ['0,0', '0.0', 'template', 'Tom række i finansieringstabellen'],
    ['%', '%', 'template', 'Tom række i finansieringstabellen'],
    ['[kapitalbehov]', '[capital requirement]', 'template', 'Tom række i finansieringstabellen'],
    ['0,0', '0.0', 'template', 'Tom række i finansieringstabellen'],
    ['[evt. supplerende bemærkninger]', '[any supplementary comments]', 'template', 'Supplerende bemærkninger (valgfrit)'],
  ],
  legal: [
    ['[indsæt vurderingen, eller begrund hvorfor Legal SME ikke er inddraget]', '[insert the assessment, or state why Legal SME has not been involved]', 'caseData', "Legal SME's vurdering"],
  ],
  conclusion: [
    ['2', '2', 'template', 'Henvisning til ESG-bilaget'],
  ],
  ownership: [
    ['[planer om generationsskifte]', '[succession plans]', 'caseData', 'Planer om generationsskifte'],
    ['[ikke dokumenteret i materialet]', '[not documented in the material]', 'caseData', 'Direktørens uddannelse og tidligere erfaring'],
    ['[evt. uddybning af bestyrelsesarbejdet]', "[optional elaboration on the board's work]", 'template', 'Uddybning af bestyrelsesarbejdet (valgfrit)'],
  ],
  market: [
    ['[væsentligste konkurrenter]', '[main competitors]', 'caseData', 'Væsentligste konkurrenter'],
  ],
  financial: [
    ['[beregnes af rådgiveren]', '[to be calculated by the adviser]', 'caseData', 'Gældsserviceringsgrad på normaliserede afdrag'],
  ],
  endorsement: [
    // auto: indstillingspåtegningen udfyldes ved indstilling (rådgiver og tidspunkt)
    ['[dato]', '[date]', 'auto', 'Dato for indstilling'],
    ['Kundechef', 'Relationship manager', 'committee', 'Indstillingsniveau'],
    ['[initialer]', '[initials]', 'auto', 'Indstillers initialer'],
    ['[Indstillers bemærkninger]', "[Recommender's comments]", 'committee', 'Indstillers bemærkninger'],
    ['[dato]', '[date]', 'committee', 'Dato for bevilling'],
    ['Kreditkomité', 'Credit committee', 'committee', 'Bevillingsinstans'],
    ['[initialer]', '[initials]', 'committee', 'Bevillingens initialer'],
    ['[Referat fra bevillingsmøde]', '[Minutes from approval meeting]', 'committee', 'Referat fra bevillingsmøde'],
  ],
  appendix1: [
    ['0,0', '0.0', 'caseData', 'Eksisterende engagement med EIFO'],
    ['[bekræftes i EIFOs engagementsoversigt]', "[to be confirmed in EIFO's exposure overview]", 'template', 'Note om EIFOs engagementsoversigt'],
    ['[eller angiv mandat]', '[or state mandate]', 'template', 'Tabsmandat'],
    ['[ja/nej]', '[yes/no]', 'template', 'Tjekliste for tabsmandat'],
    ['Maks. to linjer begrundelse for valg af "ingen tabsmandat", hvis kriterier for mandat er opfyldt', 'Max. two lines of justification for choosing "no loss mandate" if the criteria for a mandate are met', 'template', 'Begrundelse for ingen tabsmandat'],
    ['Maks. to linjer med begrundelse for afvigelse fra beregnet marginal/præmie', 'Max. two lines of justification for deviation from the calculated margin/premium', 'template', 'Begrundelse for afvigelse fra beregnet marginal og præmie'],
    ['[N/A, ikke grøn finansiering]', '[N/A, not green financing]', 'template', 'Grønne covenants'],
    ['[Formulering skal følge formuleringen i Særvilkårskataloget. Indfør vilkår her]', '[Wording must follow the wording in the Special Conditions Catalogue. Insert conditions here]', 'template', 'Fravigelser fra de Generelle vilkår'],
    ['[dato]', '[date]', 'caseData', 'Udbetalingsfrist'],
    ['1,0', '1.0', 'caseData', 'Overtræksret'],
  ],
  appendix2: [
    ['[øvrige politikker]', '[other policies]', 'template', 'Øvrige ESG-politikker'],
  ],
};
const MEMO_COMMITTEE_SECTIONS = ['endorsement'];
function _memoBlankNorm(x) { return String(x || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

/** Afsnittets tomme felter: [{ section, id, label, group, text, index }]. id er stabilt (afsnit:nr i skabelonen), index er placeringen i teksten. */
function memoBlankFields(k, html) {
  const d = document.createElement('div');
  d.innerHTML = html != null ? html : sectionHtml(k);
  const map = MEMO_BLANKS[k] || [];
  const committee = MEMO_COMMITTEE_SECTIONS.includes(k);
  const used = {};
  return Array.from(d.querySelectorAll('.tpl-blank')).map((el, i) => {
    const raw = (el.textContent || '').trim();
    const txt = _memoBlankNorm(raw);
    const j = map.findIndex((m, n) => !used[n] && (_memoBlankNorm(m[0]) === txt || _memoBlankNorm(m[1]) === txt));
    if (j >= 0) {
      used[j] = true;
      return { section: k, id: k + ':' + (j + 1), label: t(map[j][3]), group: map[j][2] === 'auto' ? 'auto' : committee ? 'committee' : map[j][2], text: raw, index: i };
    }
    return { section: k, id: k + ':x' + (i + 1), label: raw.replace(/^\[|\]$/g, '') || t('Tomt felt'), group: committee ? 'committee' : 'caseData', text: raw, index: i };
  });
}

function memoStatus() {
  const list = MEMO_SECTIONS.map(s => Object.assign({}, s, memoSectionStatus(s.k)));
  const cc = memoCommentCounts();
  // auto: udfyldes automatisk ved indstilling (indstillingspåtegningens dato og initialer)
  const blankGroups = { template: [], committee: [], caseData: [], auto: [] };
  MEMO_SECTIONS.forEach(s => memoBlankFields(s.k).forEach(f => {
    blankGroups[f.group].push({ section: f.section, sectionName: s.num + '. ' + t(s.label), id: f.id, label: f.label });
  }));
  return {
    sectionsTotal: list.length,
    sectionsDone: list.filter(x => x.state === 'done').length,
    // Afsnit rådgiveren aktivt har markeret som gennemgået
    reviewed: list.filter(x => !!x.reviewed).length,
    unreviewedDrafts: list.filter(x => x.unreviewed).length,
    blanks: list.reduce((n, x) => n + x.blanks, 0),
    // Uløste kommentarer (løste og trukne tilbage tæller ikke)
    openComments: cc.openTotal,
    // Uløste kommentarer fra Compliance eller Risiko, der kræver handling. Blokerer indstillingen.
    blockingComments: cc.blocking,
    blockingList: cc.blockingList,
    // Løste kommentarer med hvem, hvornår og hvorfor (resolvedBy, resolvedAt, reason)
    resolvedComments: cc.resolvedList,
    resolvedCount: cc.resolvedTotal,
    // Åbne kommentarer (også dem, der ikke blokerer) med afsnit, forfatter og tekst
    openList: cc.openList,
    withdrawnComments: cc.withdrawnTotal,
    // Tomme felter delt i skabelonrester, komitéens felter og manglende sagsdata
    blankGroups,
    needsWork: list.filter(x => x.state !== 'done').map(x => x.num + '. ' + t(x.label)),
    // Ekstra detaljer pr. afsnit til den der vil vise mere
    empty: list.filter(x => x.state === 'empty').length,
    sections: list.map(x => ({ k: x.k, name: x.num + '. ' + t(x.label), state: x.state, blanks: x.blanks,
      reviewedBy: x.reviewed ? x.reviewed.by : null, reviewedAt: x.reviewed ? x.reviewed.at : null,
      // Teksten er ændret efter gennemgangen, så den skal gennemgås igen
      changedAfterReview: !!x.stale })),
  };
}

// Modul-eksport
export { memoSectionStatus, memoStatusText, memoCommentCounts, MEMO_BLANKS, MEMO_COMMITTEE_SECTIONS,
  _memoBlankNorm, memoBlankFields, memoStatus };
