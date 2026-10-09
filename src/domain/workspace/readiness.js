// Sagen (workspace): klarhedstjekket før indstillingen til kreditkomitéen, begrundelserne og
// kvitteringen bagefter. Flyttet uændret fra workspace.jsx ved migrationen til Vue; logik, der lå
// inde i komponenten WSIndstil, er løftet ud i navngivne funktioner med de samme linjer (kilden
// står over hver). Bare globaler (t, CW) læses via window. Memoets status, kildetjek og frosne
// version kommer fra memoets kode (window.CW_MEMO_STATUS, CW_CITE_ISSUES, CW_MEMO_SNAPSHOT); mangler
// de, gør tjekket som før (f.eks. blokerer "Memoets status kan ikke læses").
import { wsAdvisor, wsFact, wsFacts } from './caseData.js';
import { wsDay, wsDot, wsFill, wsPlural, wsRef } from './format.js';
import { wsBlockingComments, wsMaterialReady, wsMemoReviewed, wsMemoStatus, wsStage } from './stage.js';
import { wsMaterialSummary } from './request.js';
import { wsRunMemoLink } from './actions.js';

/* ─────────────────────────────────────────────────────────────────────────
   Indstilling: klarhedstjek før, kvittering efter

   Klarhedstjekket er en port. Hvert punkt er én linje:
   - block:  blokerer indstillingen (afslag, materiale ikke godkendt, afsnit
             ikke gennemgået, uløste blokerende kommentarer)
   - reason: kræver en begrundelse (tomme felter, passerede kritiske datoer,
             valgfrit materiale der ikke er kommet, åbne kommentarer)
   - info:   til orientering (betingelser før udbetaling, sprunget kundeinput)
   - ok:     i orden
   ──────────────────────────────────────────────────────────────────────── */
// opts.cites: tag kildehenvisningerne med (kun klarhedstjekket selv; pille og
// knap behøver dem ikke, fordi de ikke blokerer)
function wsReadiness(stage, opts) {
  opts = opts || {};
  const rows = [];
  const cs = CW.caseState();
  const p = CW.progress();
  const request = CW.request();
  const st = CW.items();
  const F = wsFacts();
  const toOutstanding = { label: t('Gå til udestående'), focus: 'ws-outstanding' };
  const toMemo = { label: t('Åbn memo'), memo: {} };
  // Dybdelink til et afsnit: "Åbn afsnit 2" med det fulde navn som aria-label
  const toSection = (k, name) => ({
    label: wsFill(t('Åbn afsnit {num}'), { num: String(name || '').split('.')[0] || k }),
    aria: wsFill(t('Åbn afsnit {name}'), { name: name || k }),
    memo: { section: k },
  });

  // Afslag
  if (stage === 'declined') {
    rows.push({ id: 'declined', group: 'block', title: t('Sagen er afslået'), text: t('Genoptag sagen, før den kan indstilles.'), action: { label: t('Gå til sagen'), focus: 'ws-hero' } });
  }

  // Materiale fra kunden: ét punkt pr. anmodet punkt, der ikke er godkendt.
  // Valgfrie punkter, der ikke er kommet, blokerer ikke og kræver ingen begrundelse.
  if (stage === 'ready-skip') {
    rows.push({ id: 'skip', group: 'info', title: t('Kundeinput er sprunget over'), text: cs.skipReason ? t('Begrundelse') + ': ' + cs.skipReason : t('Sagen indstilles på det offentlige grundlag og de dokumenter, der allerede findes.') });
  } else if (!request) {
    rows.push({ id: 'no-request', group: 'block', title: t('Der er ikke anmodet om materiale'), text: t('Anmod kunden om materiale, eller spring kundeinput over med en begrundelse på siden Sagen.'), action: { label: t('Gå til sagen'), focus: 'ws-hero' } });
  } else {
    CW.requestedItems().forEach(it => {
      const s = st[it.id];
      const status = s ? s.status : 'pending';
      if (status === 'approved') return;
      const optional = it.tag === 'Valgfri';
      const waitingOnMe = status === 'received' || status === 'noted';
      if (optional && (status === 'pending' || status === 'delegated')) {
        rows.push({ id: 'item-' + it.id, group: 'info', optional: true, name: t(it.label), title: t(it.label) + ' (' + t('valgfri') + ')', text: t('Ikke modtaget, ikke påkrævet') });
        return;
      }
      const text = waitingOnMe ? t('Modtaget, afventer din gennemgang')
        : status === 'rejected' ? t('Spørgsmål stillet, afventer svar fra kunden')
        : status === 'delegated' ? t('Hos kundens rådgiver')
        : t('Ikke modtaget fra kunden');
      rows.push({ id: 'item-' + it.id, group: 'block', title: t(it.label) + (optional ? ' (' + t('valgfri') + ')' : ''), text, action: toOutstanding });
    });
    if (p.total && wsMaterialReady(p)) rows.push({ id: 'material-ok', group: 'ok', title: t('Materiale fra kunden'), text: wsMaterialSummary(p) });
  }

  // Memoet (memo.jsx stiller CW_MEMO_STATUS til rådighed)
  const m = wsMemoStatus();
  if (!m) {
    rows.push({ id: 'memo-na', group: 'block', title: t('Memoets status kan ikke læses'), text: t('Åbn memoet, så status kan beregnes.'), action: toMemo });
  } else {
    const secs = Array.isArray(m.sections) ? m.sections : [];
    const secName = (k) => { const s = secs.find(x => x.k === k); return s ? t(s.name) : k; };
    const reviewed = wsMemoReviewed(m);
    // Højst 3 afsnit listes enkeltvis; mangler flere, står de som én række,
    // der åbner det første afsnit, som ikke er gennemgået
    const unrev = secs.filter(s => !s.reviewedBy);
    if (secs.length && unrev.length <= 3) {
      unrev.forEach(s => rows.push({ id: 'sec-' + s.k, group: 'block', title: t(s.name), text: s.state === 'empty' ? t('Afsnittet er ikke skrevet og ikke gennemgået') : t('Afsnittet er ikke gennemgået'), action: toSection(s.k, t(s.name)) }));
    } else if (secs.length) {
      rows.push({ id: 'sec-all', group: 'block', n: unrev.length, title: t('Credit memo'), text: wsUnreviewedText(unrev.length, secs.length), action: { label: t('Åbn memo'), memo: { section: unrev[0].k } } });
    } else if (reviewed < m.sectionsTotal) {
      rows.push({ id: 'sec-all', group: 'block', n: m.sectionsTotal - reviewed, title: t('Credit memo'), text: wsUnreviewedText(m.sectionsTotal - reviewed, m.sectionsTotal), action: toMemo });
    }
    // Blokerende kommentarer fra Compliance eller Risiko. Kun kontrolfunktionen
    // kan frigive dem; rådgiveren kan svare og bede om frigivelse i memoet.
    const bc = m.blockingComments;
    const bl = Array.isArray(m.blockingList) ? m.blockingList : Array.isArray(bc) ? bc : null;
    if (bl && bl.length) {
      bl.forEach((c, i) => {
        const dept = c.dept || c.role || t('kontrolfunktionen');
        const where = c.sectionName || (c.section ? secName(c.section) : '');
        const asked = c.releaseRequestedAt || c.requestedAt || (c.release && c.release.at) || null;
        rows.push({
          id: 'bc-' + (c.id || i), group: 'block', dept,
          title: wsFill(t('Afventer {dept}'), { dept }),
          text: asked
            ? wsFill(t('Kommentar fra {who} i {section}. Du bad om frigivelse {when}.'), { who: c.author || dept, section: where || t('memoet'), when: wsDay(asked) })
            : wsFill(t('Kommentar fra {who} i {section}. Kun {dept} kan frigive den.'), { who: c.author || dept, section: where || t('memoet'), dept }),
          action: { label: t('Åbn kommentaren'), aria: wsFill(t('Åbn kommentaren fra {who} i {section}'), { who: c.author || dept, section: where || t('memoet') }), memo: { section: c.section || null, commentId: c.id || null } },
        });
      });
    } else if (!bl && Number(bc) > 0) {
      rows.push({ id: 'bc', group: 'block', n: Number(bc), title: t('Uløste kommentarer fra Compliance eller Risiko'), text: wsPlural(Number(bc), t('1 blokerende kommentar skal løses'), t('{n} blokerende kommentarer skal løses')), action: toMemo });
    }

    // Tomme felter. Med memoets feltopdeling (blankGroups): komitéens egne
    // felter tæller ikke, rene skabelonfelter dækkes af én begrundelse, og kun
    // manglende sagsdata kræver en begrundelse pr. felt. Uden den: pr. afsnit
    // som før, dog uden afsnit 11, som komitéen udfylder.
    const g = m.blankGroups && typeof m.blankGroups === 'object' ? m.blankGroups : null;
    if (g) {
      const tpl = Array.isArray(g.template) ? g.template : [];
      const cd = Array.isArray(g.caseData) ? g.caseData : [];
      if (tpl.length) {
        const nSec = tpl.map(f => f.section).filter((k, i, a) => a.indexOf(k) === i).length;
        const ex = tpl.map(f => t(f.label || '')).filter((l, i, a) => l && a.indexOf(l) === i).slice(0, 2).join(', ');
        rows.push({
          id: 'blank-tpl', group: 'reason', n: 1, title: t('Tomme skabelonfelter'),
          text: wsFill(wsPlural(tpl.length, t('1 skabelonfelt uden sagsdata'), t('{n} skabelonfelter uden sagsdata')), {})
            + ' ' + wsPlural(nSec, t('i 1 afsnit'), t('i {n} afsnit')) + (ex ? ' (' + t('f.eks.') + ' ' + ex + ')' : '') + '. ' + t('Én begrundelse dækker dem alle.'),
          action: { label: t('Gå til første felt'), aria: wsFill(t('Gå til første tomme skabelonfelt i {section}'), { section: secName(tpl[0].section) }), memo: { section: tpl[0].section, field: tpl[0].id } },
        });
      }
      cd.forEach((f, i) => rows.push({
        id: 'blank-f-' + (f.id || i), group: 'reason', title: f.label ? t(f.label) : t('Tomt felt'),
        text: wsFill(t('Sagsdata mangler i {section}'), { section: secName(f.section) }),
        action: { label: t('Gå til feltet'), aria: wsFill(t('Gå til feltet {field} i {section}'), { field: f.label ? t(f.label) : '', section: secName(f.section) }), memo: { section: f.section, field: f.id } },
      }));
    } else if (secs.length) {
      secs.filter(s => s.blanks > 0 && s.k !== 'endorsement').forEach(s => rows.push({ id: 'blank-' + s.k, group: 'reason', title: t(s.name), text: wsPlural(s.blanks, t('1 tomt felt'), t('{n} tomme felter')), action: toSection(s.k, t(s.name)) }));
    } else if (m.blanks) {
      rows.push({ id: 'blank', group: 'reason', title: t('Credit memo'), text: wsPlural(m.blanks, t('1 tomt felt'), t('{n} tomme felter')), action: toMemo });
    }

    // Andre åbne kommentarer blokerer ikke og kræver ingen begrundelse
    const other = Math.max(0, (Number(m.openComments) || 0) - wsBlockingComments(m));
    if (other) rows.push({ id: 'comments', group: 'info', title: t('Åbne kommentarer i memoet'), text: wsPlural(other, t('1 kommentar er ikke løst'), t('{n} kommentarer er ikke løst')), action: { label: t('Åbn kommentarerne'), aria: t('Åbn memoets kommentarer'), memo: { comments: true } } });
    if (m.sectionsTotal && reviewed >= m.sectionsTotal) rows.push({ id: 'memo-ok', group: 'ok', title: t('Credit memo'), text: wsFill(t('Alle {n} afsnit er gennemgået.'), { n: m.sectionsTotal }) });

    // Kildehenvisninger i afsnit, der er ændret siden sidste gennemgang eller
    // indstilling (memo.jsx, CW_CITE_ISSUES). Ubekræftede står til orientering;
    // en påstand, der modsiger kilden, kræver en begrundelse.
    const ci = opts.cites ? wsCiteIssues(wsChangedSections(secs)) : null;
    // Tal, der ikke findes i kilden (state 'missing') eller modsiger den
    // (contra), i alle afsnit: én samlet række, der kræver en begrundelse,
    // med dybdelink til hver henvisning. En ren demo giver 0.
    if (ci && ci.bad.length) {
      rows.push({
        id: 'cite-bad', group: 'reason', n: 1,
        title: wsPlural(ci.bad.length, t('1 tal kan ikke findes i kilden'), t('{n} tal kan ikke findes i kilden')),
        text: t('Ret tallet i memoet, eller begrund, hvorfor det står, som det gør.'),
        links: ci.bad.map((c, i) => {
          const where = c.sectionName || (c.section ? secName(c.section) : '');
          const doc = [c.doc || c.docName || '', c.page || c.ref ? wsRef(c.page || c.ref) : ''].filter(Boolean).join(', ');
          return {
            key: i, text: '"' + (c.claim || c.text || '') + '"' + (where ? ' ' + wsFill(t('i {section}'), { section: where }) : '')
              + (doc ? ' - ' + doc : '') + (c.state === 'contra' ? ' - ' + t('modsiger kilden') : ' - ' + t('ikke fundet i kilden')),
            label: t('Åbn'), aria: wsFill(t('Åbn henvisningen i {section}'), { section: where || t('memoet') }),
            memo: c.section ? { section: c.section } : null,
          };
        }),
      });
    }
    // Henvisninger, der kun kan bekræftes delvist (f.eks. fundet i andet format),
    // i afsnit ændret siden sidste gennemgang eller indstilling: til orientering
    if (ci && ci.nUnv > 0) {
      const f0 = ci.unverified[0] || {};
      rows.push({
        id: 'cite-unverified', group: 'info', n: 1, title: t('Henvisninger, der ikke kan bekræftes'),
        text: wsPlural(ci.nUnv, t('1 henvisning kunne ikke bekræftes i et afsnit, der er ændret siden sidste gennemgang eller indstilling.'), t('{n} henvisninger kunne ikke bekræftes i afsnit, der er ændret siden sidste gennemgang eller indstilling.')),
        action: f0.section ? toSection(f0.section, f0.sectionName || secName(f0.section)) : null,
      });
    }
  }

  // Datoer i sagens tidslinje. En frist eller betingelse, der skulle være nået
  // (kommende, men datoen er passeret, eller type deadline/condition), kræver en
  // begrundelse. En historisk hændelse (status 'passeret') er til orientering.
  (F.keyDates || []).forEach((d, i) => {
    if (!d || !d.text) return;
    const isDeadline = d.type === 'deadline' || d.type === 'condition' || (!d.type && d.status === 'kommende');
    if (isDeadline && d.status !== 'bekræftet' && d.date && CW.isPast(d.date)) {
      rows.push({ id: 'date-' + i, group: 'reason', title: wsFact(d, 'text'), text: wsFill(t('Fristen {date} er passeret'), { date: CW.fmtDate(d.date) }), source: d.source });
    } else if (d.status === 'passeret') {
      rows.push({ id: 'date-' + i, group: 'info', title: wsFact(d, 'text'), text: d.date ? wsFill(t('Hændelse {date}'), { date: CW.fmtDate(d.date) }) : t('Hændelse i sagens forløb'), source: d.source });
    }
  });

  // Betingelser før udbetaling: indgår i indstillingen, blokerer ikke
  (F.conditions || []).forEach((c, i) => {
    if (!c || !c.text) return;
    rows.push({ id: 'cond-' + (c.id || i), group: 'info', cond: true, done: c.status === 'opfyldt', title: wsFact(c, 'text'), text: c.status === 'opfyldt' ? t('Opfyldt') : t('Skal være opfyldt før udbetaling'), source: c.source });
  });
  // id'erne bruges i element-id'er og CSS-selektorer (f.eks. "financing:1")
  rows.forEach(r => { r.id = String(r.id).replace(/[^\w-]/g, '-'); });
  return rows;
}

// Afsnit ændret siden sidste gennemgang (memo.jsx: changedAfterReview) eller
// siden sidste indstilling (sammenlignet med den frosne version på samme sprog)
function wsChangedSections(secs) {
  const out = (secs || []).filter(s => s.changedAfterReview).map(s => s.k);
  const snap = CW.memoSnapshot();
  if (snap && snap.sections && typeof window.CW_MEMO_SNAPSHOT === 'function') {
    try {
      const now = window.CW_MEMO_SNAPSHOT();
      if ((snap.sections.__lang || 'da') === (now.__lang || 'da')) {
        Object.keys(now).forEach(k => { if (k.indexOf('__') !== 0 && snap.sections[k] != null && snap.sections[k] !== now[k] && out.indexOf(k) < 0) out.push(k); });
      }
    } catch (e) {}
  }
  return out;
}
// Memoets tjek af kildehenvisninger (memo.jsx, CW_CITE_ISSUES): ubekræftede
// kun i de ændrede afsnit, påstande der modsiger kilden i alle afsnit.
// null, hvis memoet ikke leverer tjekket.
function wsCiteIssues(changed) {
  const fn = window.CW_CITE_ISSUES;
  if (typeof fn !== 'function') return null;
  const arr = (x) => (Array.isArray(x) ? x : []);
  let all = null;
  try { all = fn() || null; } catch (e) { return null; }
  if (!all) return null;
  const contradicted = arr(all.contra || all.contradicted).map(x => Object.assign({ state: 'contra' }, x));
  const missing = arr(all.unverified).filter(x => x.state === 'missing');
  const soft = arr(all.unverified).filter(x => x.state !== 'missing' && changed && changed.indexOf(x.section) >= 0);
  return { bad: missing.concat(contradicted), unverified: soft, contradicted, nUnv: soft.length };
}

/**
 * Er begrundelsen god nok til komitéens kvittering? Returnerer en fejltekst
 * eller null. Mindst 3 ord, ikke gentagne tegn eller ord, og ikke den samme
 * tekst som ved et andet punkt.
 */
const WS_REASON_MIN_WORDS = 3;
function wsNormReason(v) { return String(v || '').toLowerCase().replace(/[^0-9a-zæøåäöüé]+/g, ' ').trim(); }
function wsReasonProblem(v, others) {
  const s = String(v || '').trim();
  if (!s) return t('Skriv en begrundelse.');
  const norm = wsNormReason(s);
  const words = norm.split(' ').filter(Boolean);
  const uniq = words.filter((w, i, a) => a.indexOf(w) === i);
  if (/([a-zæøå])\1{3,}/i.test(s) || (words.length >= 2 && uniq.length < 2) || new Set(norm.replace(/ /g, '')).size < 4) {
    return t('Teksten består af gentagne tegn eller ord. Skriv en rigtig begrundelse.');
  }
  if (words.length < WS_REASON_MIN_WORDS) return wsFill(t('Skriv mindst {n} ord.'), { n: WS_REASON_MIN_WORDS });
  if ((others || []).some(o => o && wsNormReason(o) === norm)) return t('Samme begrundelse står ved et andet punkt. Skriv, hvad der gælder for netop dette punkt.');
  return null;
}
function wsCount(rows) { return rows.reduce((n, r) => n + (r.n || 1), 0); }
// "Ingen af de 14 afsnit er gennemgået" frem for "14 af 14 afsnit er ikke gennemgået"
function wsUnreviewedText(n, total) {
  return n === total ? wsFill(t('Ingen af de {total} afsnit er gennemgået'), { total })
    : wsFill(t('{n} af {total} afsnit er ikke gennemgået'), { n, total });
}

// Sagshovedets knap på memo-fanen: næste afsnit, den blokerende kommentar
// eller (når memoet er i orden) videre til Indstilling
function wsMemoTabNext(toIndstil) {
  const blocks = wsReadiness(wsStage()).filter(r => r.group === 'block' && r.action && r.action.memo);
  const sec = blocks.find(r => /^sec-/.test(r.id));
  if (sec) return { label: t('Næste afsnit til gennemgang'), onClick: () => wsRunMemoLink(sec.action.memo) };
  const bc = blocks.find(r => /^bc/.test(r.id));
  if (bc) return { label: wsFill(t('Gå til {dept}-kommentaren'), { dept: bc.dept || t('kontrolfunktionen') }), onClick: () => wsRunMemoLink(bc.action.memo) };
  return { label: t('Gå til indstilling'), onClick: toIndstil };
}

// Indstilling (WSIndstil, workspace.jsx L3379–3614): felternes startværdier. Kaldes én gang, når
// siden åbnes (skærmen har nøglen submitted, så den åbnes forfra efter en tilbagetrækning).
// Begrundelser og note gemmes i sagen, mens de skrives, så de overlever
// genindlæsning og faneskift (CW.caseState().submitDraftReasons)
function wsIndstilPrefill(cs) {
  const note = cs.submitDraftNote || '';
  // Efter en tilbagetrækning er begrundelserne fra sidste indstilling
  // forudfyldt (matchet på punktets id, ældre versioner på punktets tekst)
  const prefillFrom = (!cs.submittedAt && Array.isArray(cs.submitReasons) && cs.submitReasons.length ? (cs.submitVersion || 1) : null);
  const reasons = (() => {
    const pre = {};
    if (!cs.submittedAt && Array.isArray(cs.submitReasons) && cs.submitReasons.length) {
      const rows = wsReadiness(wsStage(), { cites: true }).filter(r => r.group === 'reason');
      cs.submitReasons.forEach(x => {
        if (!x || !x.reason) return;
        const row = x.id ? rows.find(r => r.id === x.id) : rows.find(r => (r.title + ': ' + r.text) === x.text);
        if (row) pre[row.id] = x.reason;
      });
    }
    return Object.assign(pre, cs.submitDraftReasons || {});
  })();
  return { note, prefillFrom, reasons };
}

// Begrundelserne og noten gemmes i stilhed (L3407–3408), men ikke efter indstillingen.
// latest: { reasons, note }. Skærmen venter 400 ms og gemmer straks ved blur og ved lukning
// (src/views/workspace/composables/useDebouncedPersist.js).
function wsPersistSubmitDraft(latest) {
  if (!CW.caseState().submittedAt) CW.setCaseState({ submitDraftReasons: latest.reasons, submitDraftNote: latest.note });
}

// En handling fra en række i indstillingen (L3417–3422): dybdelink til memoet, en anden fane
// eller et afsnit på Overblik. focusOverview: sagshovedets (wsHeaderModel(...).focusOverview).
function wsRunAction(a, go, caseId, focusOverview) {
  if (!a) return;
  if (a.memo) wsRunMemoLink(a.memo);
  else if (a.tab) go('workspace:' + caseId + ':' + a.tab);
  else focusOverview(a.focus);
}

// Kvitteringen efter indstillingen (L3427–3478). lead: sætningen under titlen (title =
// CW.fmtWhen(cs.submittedAt)); notSaved: memoets indhold blev ikke gemt ved indstillingen
// (notSavedText står så efter lead). rows i den gamle rækkefølge, hver med key og label:
//   'reasons'   items = [{ text, reason }]: text og en grå linje "Begrundelse: <reason>"
//   'open'      items = tekster (ældre indstillinger uden begrundelser)
//   'conds'     items = tekster (betingelser før udbetaling)
//   'comments'  items = [{ sectionName, text, author, dept }]: "<sectionName>: " (hvis kendt),
//               text og den grå linje commentBy(c)
//   'released'  items = [{ sectionName, text, resolvedBy, ... }]: som ovenfor med releasedBy(c)
//   'note'      value = noten til komitéen
function wsIndstilReceipt(cs) {
  const adv = wsAdvisor();
  const snap = CW.memoSnapshot();
  const last = (cs.history || []).filter(h => h.type === 'submitted').slice(-1)[0];
  const reasonsList = Array.isArray(cs.submitReasons) ? cs.submitReasons : null;
  const openList = Array.isArray(cs.submitOpen) ? cs.submitOpen.map(x => typeof x === 'string' ? x : (x && (x.text || '')) || '') : [];
  const conds = Array.isArray(cs.submitConditions) ? cs.submitConditions : [];
  const rows = [];
  if (reasonsList && reasonsList.length) rows.push({ key: 'reasons', label: t("Begrundelser"), items: reasonsList });
  else if (!reasonsList && openList.length) rows.push({ key: 'open', label: t("Begrundelser"), items: openList });
  if (conds.length) rows.push({ key: 'conds', label: t("Betingelser før udbetaling"), items: conds });
  // Åbne kommentarer ved indstillingen (frosset ved indstilling)
  const openAtSubmit = Array.isArray(cs.submitOpenComments) ? cs.submitOpenComments : [];
  if (openAtSubmit.length) rows.push({ key: 'comments', label: t('Åbne kommentarer'), items: openAtSubmit });
  // Blokerende kommentarer, som kontrolfunktionen frigav før indstillingen (frosset ved indstilling)
  const released = Array.isArray(cs.submitResolved) ? cs.submitResolved : [];
  if (released.length) rows.push({ key: 'released', label: t('Frigivne kommentarer'), items: released });
  if (cs.submitNote) rows.push({ key: 'note', label: t("Note til komitéen"), value: cs.submitNote });
  const commentBy = (c) => [c.author, c.dept].filter(Boolean).join(', ') + ' - ' + t('ikke løst ved indstillingen');
  const releasedBy = (c) => wsDot(wsFill(t('Frigivet af {who} {when}'), { who: [c.resolvedBy, c.resolvedByDept].filter(Boolean).join(', '), when: c.resolvedAt ? wsDay(c.resolvedAt) : '' }) + (c.reason ? '.' : '')) + (c.reason ? ' ' + t('Begrundelse') + ': ' + c.reason : '');
  const lead = wsFill(t('Sendt til kreditkomitéen {date} af {who}. Memoet er låst som version {v}.'), { date: wsDay(cs.submittedAt), who: (last && last.by) || adv.name, v: cs.submitVersion || 1 });
  const notSaved = !snap;
  const notSavedText = notSaved ? ' ' + t('Memoets indhold blev ikke gemt ved indstillingen.') : '';
  return { snap, last, reasonsList, openList, conds, openAtSubmit, released, rows, commentBy, releasedBy, lead, notSaved, notSavedText };
}

// Klarhedstjekket (L3480–3506): rækkerne pr. gruppe (Blokerer, Kræver en begrundelse, Til
// orientering, I orden), tallene, betingelserne før udbetaling som én række (id 'conds') med en
// fold, flere valgfrie punkter som én række (id 'optional'), begrundelsernes problemer
// (wsReasonProblem, også mod de andre rækker) og om sagen kan indstilles. reasons: { [rækkens id]: tekst }.
// submitMsg: teksten ved knappen, når sagen ikke kan indstilles (L3602–3606).
// isBad(r, tried, touched): fejlen under feltet vises (L3551–3554); ellers står "Mindst {n} ord.".
function wsIndstilCheck(stage, reasons) {
  const checks = wsReadiness(stage, { cites: true });
  const blockRows = checks.filter(c => c.group === 'block');
  const reasonRows = checks.filter(c => c.group === 'reason');
  const infoRows = checks.filter(c => c.group === 'info');
  const okRows = checks.filter(c => c.group === 'ok');
  // Tallene tæller de rækker, brugeren ser (én samlet række for memoets afsnit tæller som én)
  const nBlock = blockRows.length, nReason = wsCount(reasonRows);
  // Betingelserne før udbetaling står som én række med en fold
  const condRows = infoRows.filter(r => r.cond);
  const condDone = condRows.filter(r => r.done).length;
  const optRows = infoRows.filter(r => r.optional);
  const infoShown = (condRows.length ? [{
    id: 'conds', title: t('Betingelser før udbetaling'),
    text: wsPlural(condRows.length, t('1 betingelse'), t('{n} betingelser')) + ', ' + wsFill(t('{n} opfyldt'), { n: condDone }),
  }] : []).concat(infoRows.filter(r => !r.cond && !(optRows.length > 1 && r.optional)));
  // Flere valgfrie punkter, der ikke er kommet, står som én række med navnene
  if (optRows.length > 1) infoShown.splice(condRows.length ? 1 : 0, 0, { id: 'optional', title: t('Valgfrit materiale, ikke modtaget'), text: optRows.map(r => r.name).join(', ') });
  // Hver begrundelse tjekkes for sig og mod de andre (samme tekst to steder afvises)
  const problems = {};
  reasonRows.forEach(r => {
    // Felter med manglende sagsdata må gerne have samme begrundelse; ellers skal teksterne være forskellige
    const cd = (x) => /^blank-f-/.test(x.id);
    const others = reasonRows.filter(x => x.id !== r.id && !(cd(r) && cd(x))).map(x => reasons[x.id]);
    problems[r.id] = wsReasonProblem(reasons[r.id], others);
  });
  const missingReasons = reasonRows.filter(r => problems[r.id]);
  const canSend = nBlock === 0 && missingReasons.length === 0;
  const submitMsg = nBlock ? wsPlural(nBlock, t('1 punkt skal løses, før sagen kan indstilles.'), t('{n} punkter skal løses, før sagen kan indstilles.'))
    : wsPlural(missingReasons.length, t('1 begrundelse mangler eller opfylder ikke kravet.'), t('{n} begrundelser mangler eller opfylder ikke kravet.'));
  const isBad = (r, tried, touched) => {
    const v = reasons[r.id] || '';
    const problem = problems[r.id];
    // Kravet står der hele tiden; fejlen vises, når man har forladt feltet eller forsøgt at indstille
    const bad = !!problem && (tried || (touched[r.id] && v.trim().length > 0));
    return bad;
  };
  return {
    checks, blockRows, reasonRows, infoRows, okRows, nBlock, nReason, condRows, condDone, optRows, infoShown, problems,
    missingReasons, canSend, submitMsg, isBad,
  };
}

// Indstil til kreditkomitéen (L3508–3530). check: wsIndstilCheck(...); reasons/note: felterne.
// ui: setTried(true) viser fejlene; cancelSave() stopper den ventende gemning af kladden
// (useDebouncedPersist(...).cancel). Mangler der begrundelser, står markøren i den første.
function wsSubmitIndstilling(check, reasons, note, ui) {
  const { canSend, nBlock, missingReasons, reasonRows, condRows } = check;
  const { setTried, cancelSave } = ui;
  setTried(true);
  if (!canSend) {
    if (!nBlock && missingReasons.length) CW.focusSoon('#ws-reason-' + missingReasons[0].id);
    return;
  }
  const list = reasonRows.map(r => ({ id: r.id, text: r.title + ': ' + r.text, reason: reasons[r.id].trim() }));
  const conds = condRows.map(r => r.done ? r.title + ' (' + t('opfyldt') + ')' : r.title);
  let snapshot = null;
  if (typeof window.CW_MEMO_SNAPSHOT === 'function') { try { snapshot = window.CW_MEMO_SNAPSHOT(); } catch (e) { snapshot = null; } }
  cancelSave();
  CW.submit({ note: note.trim(), open: list.map(x => x.text + '. ' + t('Begrundelse') + ': ' + x.reason), snapshot, reasons: list, conditions: conds });
  // Frigivne blokerende kommentarer fryses med i kvitteringen. Kladden til
  // begrundelserne er brugt; næste indstilling starter forfra.
  const m = wsMemoStatus();
  const resolved = m && Array.isArray(m.resolvedComments) ? m.resolvedComments.filter(c => c && c.blocking) : [];
  // Åbne kommentarer, der ikke blokerer, fryses også med (indstillingen nævner dem til orientering)
  const openCs = m && Array.isArray(m.openList) ? m.openList.filter(c => c && !c.blocking) : [];
  CW.setCaseState({ submitDraftReasons: null, submitDraftNote: null,
    submitOpenComments: openCs.map(c => ({ sectionName: c.sectionName || '', author: c.author || '', dept: c.dept || '', text: c.text || '' })),
    submitResolved: resolved.map(c => ({ sectionName: c.sectionName || '', text: c.text || '', resolvedBy: c.resolvedBy || '', resolvedByDept: c.resolvedByDept || '', resolvedAt: c.resolvedAt || null, reason: c.reason || '' })) });
  CW.toast(wsFill(t('Sagen er indstillet til kreditkomitéen (version {v})'), { v: CW.caseState().submitVersion || 1 }));
}

export {
  wsReadiness, wsChangedSections, wsCiteIssues, WS_REASON_MIN_WORDS, wsNormReason, wsReasonProblem, wsCount, wsUnreviewedText,
  wsMemoTabNext, wsIndstilPrefill, wsPersistSubmitDraft, wsRunAction, wsIndstilReceipt, wsIndstilCheck, wsSubmitIndstilling,
};
