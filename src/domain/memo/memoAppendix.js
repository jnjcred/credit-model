// Credit memo: bilagslisten i Bilag 3 (sagens dokumenter, som listen ikke nævner, og rækker til dem, også
// i Word-eksporten) og nyt materiale fra kunden siden memoets udkast (CASE_FACTS.asOf) med de afsnit, der
// skal læses igen. Flyttet ordret fra src/memo.jsx (linje 5425-5512) ved migrationen til Vue; kun
// export-linjen er ny. memoAppendixAdd skriver color: var(--c-text-2) i cellerne; variablen er defineret
// i src/styles/memo-document.less.

/* ── Bilagslisten (Bilag 3) og sagens dokumenter ────────────────────────────
   Sagens dokumenter: registret under Dokumenter (uden erstattede versioner)
   og de filer, rådgiveren har godkendt fra kunden. → [{ name, type, date }] */
function memoCaseDocList() {
  const out = [];
  const seen = new Set();
  ((window.DATA && Array.isArray(DATA.DOCS)) ? DATA.DOCS : []).forEach(d => {
    // Crediwires egne eksporter er afledt af kildedokumenterne og er ikke bilag
    if (!d || !d.name || d.superseded || d.origin === 'export' || seen.has(d.name)) return;
    seen.add(d.name);
    out.push({ name: d.name, type: t(d.type || 'Andet'), date: d.date || '' });
  });
  const ups = window.CW && CW.allUploads ? CW.allUploads() : [];
  ups.forEach(f => {
    const name = f && (f.name || f.fileName);
    if (!name || f.itemStatus !== 'approved' || seen.has(name)) return;
    seen.add(name);
    out.push({ name, type: f.itemLabel || t('Kundeupload'), date: (f.at || f.uploadedAt || '').slice(0, 10) });
  });
  return out;
}
function _memoAppxDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return '';
  return window.DATA && DATA.fmt && DATA.fmt.longDate ? DATA.fmt.longDate(iso.slice(0, 10)) : iso.slice(0, 10);
}
/* Bilagslistens tabel i et afsnits HTML: tabellen efter overskriften "Bilagsliste" */
function _memoAppxTable(root) {
  const h = [...root.querySelectorAll('h3, h4')].find(x => /Bilagsliste|Appendix list/i.test(x.textContent || ''));
  let n = h ? h.nextElementSibling : null;
  while (n && n.tagName !== 'TABLE') n = n.nextElementSibling;
  return n;
}
/** Dokumenter i sagen, som bilagslisten i en HTML ikke nævner */
function memoAppendixMissing(root) {
  const table = root && _memoAppxTable(root);
  if (!table) return [];
  const txt = table.textContent || '';
  return memoCaseDocList().filter(d => txt.indexOf(d.name) < 0);
}
/** Føjer de manglende dokumenter til bilagslistens tabel (i memoet eller i Word) */
function memoAppendixAdd(root) {
  const table = root && _memoAppxTable(root);
  const tb = table && (table.querySelector('tbody') || table);
  if (!tb) return 0;
  const miss = memoAppendixMissing(root);
  let n = tb.querySelectorAll('tr').length;
  miss.forEach(d => {
    const tr = document.createElement('tr');
    [String(++n), d.name, d.type, _memoAppxDate(d.date)].forEach((v, i) => {
      const td = document.createElement('td');
      if (i === 0) td.style.fontFamily = 'monospace';
      if (i === 0 || i === 3) td.style.color = 'var(--c-text-2)';
      td.textContent = v;
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  return miss.length;
}

/* Nyt materiale fra kunden siden memoets udkast (CASE_FACTS.asOf): godkendte
   punkter og punkter, kunden har svaret på uden fil ("Har vi ikke"). Hvilke
   afsnit der skal læses igen, er et fast opslag på punktets navn. */
const _MEMO_NEW_MAP = [
  [/lån|kredit|gæld|leasing|loan/i, ['financing', 'appendix1']],
  [/land|eksport|salg|marked|country|sales/i, ['market']],
  [/valuta|currency|hedg/i, ['risk', 'appendix1']],
  [/årsrapport|periode|budget|regnskab|likvid|annual|interim/i, ['financial']],
  [/ejer|vedtægt|selskab|pep|owner/i, ['ownership']],
  [/kunde|ordre|kontrakt|customer|order/i, ['market', 'risk']],
  [/sikkerhed|pant|kaution|security|guarantee/i, ['appendix1']],
];
function memoNewMaterial() {
  if (!window.CW || !CW.requestedItems) return [];
  const asOf = (window.CASE_FACTS && CASE_FACTS.asOf) || '';
  const out = [];
  CW.requestedItems().forEach(it => {
    const st = CW.itemState(it.id);
    if (!st || (st.status !== 'approved' && st.status !== 'noted')) return;
    const at = String(st.reviewedAt || st.at || '');
    if (asOf && at && at.slice(0, 10) <= asOf) return;
    const label = t(it.label || it.id);
    const secs = [];
    _MEMO_NEW_MAP.forEach(([re, ks]) => { if (re.test((it.label || '') + ' ' + (it.category || ''))) ks.forEach(k => { if (!secs.includes(k)) secs.push(k); }); });
    out.push({ id: it.id, label, noted: st.status === 'noted', note: st.note || '', sections: secs });
  });
  return out;
}

// Modul-eksport
export { memoCaseDocList, _memoAppxDate, _memoAppxTable, memoAppendixMissing, memoAppendixAdd, _MEMO_NEW_MAP,
  memoNewMaterial };
