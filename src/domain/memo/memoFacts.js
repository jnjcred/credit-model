// Credit memo: forsiden og "Indstillingen i hovedtræk" (side 1), bygget af faktaarket
// (window.CASE_FACTS). Flyttet ordret fra src/memo.jsx (linje 2414-2418, 2502-2518, 2520-2598,
// 2616-2620 og 2630-2631) ved migrationen til Vue; kun import- og export-linjerne er nye.
// _memoTxt (linje 2519) er ikke flyttet: den bruges ingen steder.
import { MEMO_EN } from './memoTemplates.js';
import { _memoFmtDay } from './memoFormat.js';

/** Forsiden, som den vises ved indstilling. Indstillingsteksten mister "Udkast:". */
function memoFront() {
  const CO = (window.DATA && DATA.COMPANY) || {};
  return { company: CO.name || 'Nordhavn Composite A/S', cvr: CO.cvr || '', caseNr: CO.caseNr || '', risk: memoRisk(), facts: memoFacts({ final: true }) };
}

/* ── Indstillingen i hovedtræk (side 1) ──────────────────────────────────────
   Genereres af faktaarket (window.CASE_FACTS), så side 1, beslutningspanelet
   og klarhedstjekket ikke kan blive uenige. Tåler at felter er null.
   Rækker: { k, label, value (tekst) | items [{ text, tag, tone }], source }
   ──────────────────────────────────────────────────────────────────────────── */
function _memoAmt(kr) {
  if (kr == null || kr === '') return null;
  if (typeof kr === 'string') return kr;
  if (window.DATA && DATA.fmt && DATA.fmt.amount) return DATA.fmt.amount(kr);
  return 'DKK ' + (kr / 1e6).toFixed(1).replace('.', ',') + ' mio.';
}
function _memoPct(x) {
  if (x == null || x === '') return null;
  const v = x <= 1 ? x * 100 : x;
  const s = (Math.round(v * 10) / 10).toLocaleString(MEMO_EN ? 'en-GB' : 'da-DK');
  return MEMO_EN ? s + '%' : s + ' %';
}

/* Faktaarket har engelske felter med suffikset En (text/textEn). Mangler den
   engelske, bruges ordbogen. */
function _memoF(o, k) {
  if (!o) return null;
  if (MEMO_EN && o[k + 'En'] != null && o[k + 'En'] !== '') return String(o[k + 'En']);
  const v = o[k];
  return v == null || v === '' ? null : t(String(v));
}

/* opts.final: forsiden til indstilling. "Udkast:" foran indstillingen fjernes. */
function memoFacts(opts) {
  const final = !!(opts && opts.final);
  const F = window.CASE_FACTS && typeof window.CASE_FACTS === 'object' ? window.CASE_FACTS : {};
  const fac = F.facility || {};
  // Kilde pr. række: den side, hvor oplysningen står (faktaarkets facility.refs)
  const facRef = (k) => (fac.refs && fac.refs[k]) || fac.source;
  const rows = [];
  const join = (parts, sep) => parts.filter(Boolean).join(sep || ' · ') || null;
  const isMet = (c) => /opfyldt|met|done/i.test((c && c.status) || '');

  rows.push({ k: 'facility', label: t('Facilitet'),
    // "EIFO-eksportkaution · Revolverende produktions- og eksportkredit i Nordjyske Bank, DKK 4,5 mio."
    value: join([_memoF(fac, 'instrument'),
      join([_memoF(fac, 'facilityType') || (fac.bank ? t('Facilitet') + ' ' + t('hos') + ' ' + fac.bank : null), _memoAmt(fac.facilityAmount)], ', ')]),
    source: facRef('facility') });
  rows.push({ k: 'eifo', label: t('EIFO-andel og beløb'),
    value: join([_memoPct(fac.eifoShare), _memoAmt(fac.eifoAmount)]), num: true, source: facRef('eifo') });
  const period = fac.start || fac.end ? [_memoFmtDay(fac.start), _memoFmtDay(fac.end)].filter(Boolean).join(' ' + t('til') + ' ') : null;
  rows.push({ k: 'tenor', label: t('Løbetid'),
    value: join([fac.tenorMonths ? fac.tenorMonths + ' ' + t('mdr.') : null, period ? '(' + period + ')' : null], ' '), source: facRef('tenor') });
  rows.push({ k: 'ranking', label: t('Prioritet'), value: _memoF(fac, 'ranking'), source: facRef('ranking') });
  rows.push({ k: 'pricing', label: t('Pris og præmie'),
    value: join([fac.pricing ? t('Rente') + ' ' + _memoF(fac, 'pricing') : null, fac.premium ? t('Præmie') + ' ' + _memoF(fac, 'premium') : null]), source: facRef('pricing') });

  const conds = (Array.isArray(F.conditions) ? F.conditions : []).filter(Boolean);
  const met = conds.filter(isMet).length;
  rows.push({ k: 'conditions', label: t('Betingelser før udbetaling'),
    summary: conds.length ? conds.length + ' ' + (conds.length === 1 ? t('betingelse') : t('betingelser')) + ', ' + met + ' ' + t('opfyldt') + ', ' + (conds.length - met) + ' ' + memoOpenWord(conds.length - met) : null,
    // Kun opfyldte betingelser får et mærke (gråt "· opfyldt"); åbne står uden
    items: conds.map(c => ({ id: c.id, text: _memoF(c, 'text'), claimDa: c.text ? (c.id ? c.id + ' ' : '') + c.text : null, tag: isMet(c) ? t('opfyldt') : null, tone: isMet(c) ? 'ok' : 'open', source: c.source })) });
  const covs = (Array.isArray(F.covenants) ? F.covenants : []).filter(Boolean);
  rows.push({ k: 'covenants', label: t('Covenants'), items: covs.map(c => ({ id: c.id, text: _memoF(c, 'text'), claimDa: c.text ? (c.id ? c.id + ' ' : '') + c.text : null, source: c.source })) });
  // Alle røde flag med høj vægt. Resten nævnes som "+n flere" (afsnit 5).
  // Kildeviseren kontrollerer flagets fulde tekst (claim), ikke den korte.
  const allFlags = (Array.isArray(F.redFlags) ? F.redFlags : []).filter(Boolean);
  const highFlags = allFlags.filter(f => f.severity === 'høj');
  const flags = highFlags.length ? highFlags : allFlags.slice(0, 3);
  rows.push({ k: 'flags', label: t('Vigtigste røde flag'), more: allFlags.length - flags.length, moreJump: 'risk',
    // Vægten står i rækkens overskrift og i "+n med middel vægt", ikke på hvert flag
    items: flags.map(f => ({ text: _memoF(f, 'short') || _memoF(f, 'text'), claim: _memoF(f, 'text'), claimDa: f.text || null, tone: f.severity === 'høj' ? 'hoj' : 'open', source: f.source })) });
  const rec = F.recommendation;
  if (rec && typeof rec === 'object' && (rec.risk || rec.rating)) {
    rows.push({ k: 'risk', label: t('Risiko og rating'),
      value: join([_memoF(rec, 'risk') ? t('Samlet risiko') + ' ' + _memoF(rec, 'risk') : null,
        rec.rating ? 'Rating ' + rec.rating + (rec.ratingModel && rec.ratingModel !== rec.rating ? ' (' + t('modellen giver') + ' ' + rec.ratingModel + ')' : '') : null]), source: rec.ratingSource });
  }
  let recText = rec ? (typeof rec === 'object' ? _memoF(rec, 'text') : t(String(rec))) : null;
  if (recText && final) {
    recText = recText.replace(/^\s*(Udkast|Draft)\s*:\s*/i, '');
    recText = recText.charAt(0).toUpperCase() + recText.slice(1);
  }
  rows.push({ k: 'rec', label: t('Kreditindstilling'), value: recText, source: rec && rec.source, fallback: t('Se afsnit 6, Konklusion og indstilling.'), jump: 'conclusion' });
  // Kilderne er danske. På engelsk kontrollerer kildeviseren rækkens danske
  // udgave, bygget af faktaarkets danske felter.
  const daAmt = (kr) => kr == null || kr === '' ? null : typeof kr === 'string' ? kr : 'DKK ' + (kr / 1e6).toFixed(1).replace('.', ',') + ' mio.';
  const daPct = (x) => x == null || x === '' ? null : String(Math.round((x <= 1 ? x * 100 : x) * 10) / 10).replace('.', ',') + ' %';
  const daRow = {
    facility: join([fac.instrument, join([fac.facilityType, daAmt(fac.facilityAmount)], ', ')]),
    eifo: join([daPct(fac.eifoShare), daAmt(fac.eifoAmount)]),
    tenor: join([fac.tenorMonths ? fac.tenorMonths + ' mdr.' : null, fac.start || fac.end ? '(' + [fac.start, fac.end].filter(Boolean).join(' til ') + ')' : null], ' '),
    ranking: fac.ranking || null,
    pricing: join([fac.pricing ? 'Rente ' + fac.pricing : null, fac.premium ? 'Præmie ' + fac.premium : null]),
    risk: rec && typeof rec === 'object' ? join([rec.risk ? 'Samlet risiko ' + rec.risk : null, rec.rating ? 'Rating ' + rec.rating : null]) : null,
    rec: rec && typeof rec === 'object' ? rec.text || null : null,
  };
  // En værdirække er én påstand: hele værdien, ikke kun sætningen foran henvisningen
  rows.forEach(r => { if (!r.items && r.value) { r.claim = r.value; if (daRow[r.k]) r.claimDa = daRow[r.k]; } });
  return rows;
}

/** Samlet kreditrisiko til memoets hoved: fra faktaarket, ellers skabelonens "Middel/Høj" */
function memoRisk() {
  const rec = window.CASE_FACTS && window.CASE_FACTS.recommendation;
  return (rec && typeof rec === 'object' && _memoF(rec, 'risk')) || t('Middel/Høj');
}

// "1 åben", "2 åbne"
function memoOpenWord(n) { return n === 1 ? t('åben') : t('åbne'); }

// Modul-eksport
export { memoFront, _memoAmt, _memoPct, _memoF, memoFacts, memoRisk, memoOpenWord };
