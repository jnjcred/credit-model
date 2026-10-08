// Fanen Virksomheden, Regnskab: budgettet ud og ind som Excel ("Eksportér budget" og "Importér
// budget"). Koden stod inde i React-komponenten AnnualReportSection i src/financials.jsx og er
// flyttet hertil ved migrationen til Vue. Linjerne med logik er de samme som før (rykket ind
// efter deres nye plads); nye er funktionshovederne, hvor komponentens variabler bliver
// parametre. XLSX er SheetJS fra index.html. Importerede tal bliver rettelser (finSaveEdits).
import { FIN_BUDGET_SEP, FIN_BUDGET_Q, ANNUAL_REPORT } from './finData.js';
import { finCellGet } from './finCalc.js';
import { FIN_EDIT_COLS, FIN_POSTS, finAdvisor, finLoadNotes, finCommentsFor, finSaveEdits } from './finEdits.js';
import { finFill, finParseInput } from './finFormat.js';

/* Migration: "Eksportér budget": budgetkvartalerne som .xlsx (filen hentes med det samme).
   unit = tabellens enhed ('mio' | 'thousand'); model = finApplyEdits(edits);
   edits = finLoadEdits(), de samme som tabellen viser. */
function finExportBudget(unit, model, edits) {
  const rowByLabel = model.byLabel;
  // Excel: budgetkvartalerne ud og ind. Importerede tal bliver rettelser.
  const budgetCols = FIN_EDIT_COLS.filter(c => c.budget);
  if (!window.XLSX) { CW.toast && CW.toast(t('Excel-bibliotek ikke indlæst. Prøv at genindlæse siden.')); return; }
  const f = unit === 'mio' ? 1 : 1000;
  const head = (c) => c.kind === 'bs' ? 'Sep ' + FIN_BUDGET_SEP.year : FIN_BUDGET_Q[c.idx].label + ' ' + FIN_BUDGET_Q[c.idx].year;
  const aoa = [
    ['Budget, ' + DATA.COMPANY.name],
    ['Granularitet', 'Kvartal'],
    ['Enhed', unit === 'mio' ? 'DKK mio.' : 'DKK tusind'],
    [],
    ['Gruppe', 'Regnskabspost', ...budgetCols.map(head), 'Note'],
  ];
  const cmtList = [];
  ANNUAL_REPORT.groups.forEach(g => g.rows.forEach(r => {
    if (r.memo) return;
    const row = rowByLabel[r.label];
    const vals = budgetCols.map(c => { const v = finCellGet(row, c); return v == null ? '' : Math.round(v * f * 1000) / 1000; });
    const ed = budgetCols.filter(c => model.map[r.label + '|' + c.key]).map(head);
    budgetCols.forEach((c, j) => { const cs = finCommentsFor(finLoadNotes(), edits, r.label, c.key); if (cs.length) cmtList.push({ r: aoa.length, c: 2 + j, t: cs.map(x => (x.by ? x.by + ': ' : '') + t(x.text)).join('\n') }); });
    aoa.push([g.label, r.label, ...vals, ed.length ? 'Rettet: ' + ed.join(', ') : '']);
  }));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  cmtList.forEach(cm => { const a = XLSX.utils.encode_cell({ r: cm.r, c: cm.c }); if (ws[a]) { ws[a].c = [{ a: finAdvisor(), t: cm.t }]; ws[a].c.hidden = true; } });
  ws['!cols'] = [{ wch: 18 }, { wch: 32 }, ...budgetCols.map(() => ({ wch: 12 })), { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Budget kvartal');
  XLSX.writeFile(wb, 'budget-nordhavn-kvartal-' + new Date().toISOString().slice(0, 10) + '.xlsx');
}

/* Migration: "Importér budget" med filen fra filvælgeren. Filen læses asynkront (FileReader);
   resultatet kommer gennem komponentens to setters: setImportMsg({ text, err? }) med beskeden
   under værktøjslinjen og setShowQuarters(true), når der er importeret tal (kvartalerne
   foldes ud). unit = tabellens enhed, brugt når filen ikke selv angiver en. */
function finImportBudget(file, unit, setImportMsg, setShowQuarters) {
  const budgetCols = FIN_EDIT_COLS.filter(c => c.budget);
  if (!file || !window.XLSX) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
      const low = (s) => String(s == null ? '' : s).toLowerCase().replace(/\(budget\)/g, '').replace(/\s+/g, ' ').trim();
      // Enhed fra filen; ellers tabellens
      let factor = unit === 'mio' ? 1 : 0.001;
      aoa.slice(0, 6).forEach(row => {
        if (!row || low(row[0]) !== 'enhed') return;
        const v = low(row[1]);
        factor = v.includes('hele kr') || v === 'kr' || v === 'dkk' ? 0.000001 : (v.includes('tusind') || v.includes('t.')) ? 0.001 : 1;
      });
      const hi = aoa.findIndex(r => r && (low(r[0]) === 'gruppe' || low(r[1]) === 'regnskabspost' || low(r[0]) === 'regnskabspost'));
      if (hi < 0) { setImportMsg({ err: true, text: t('Kunne ikke finde rækken med kolonnenavne. Brug en fil fra Eksportér budget som skabelon.') }); return; }
      const header = aoa[hi];
      const labelCol = low(header[0]) === 'regnskabspost' ? 0 : 1;
      // Kolonne → budgetkolonne efter navn: "Q4 2026", "2026-Q4", "Sep 2026", "2026-09"
      const colFor = {};
      header.forEach((h, c) => {
        const k = low(h);
        budgetCols.forEach(bc => {
          const names = bc.kind === 'bs'
            ? ['sep ' + FIN_BUDGET_SEP.year, 'sep ' + FIN_BUDGET_SEP.year.slice(2), 'september ' + FIN_BUDGET_SEP.year, FIN_BUDGET_SEP.key]
            : [low(FIN_BUDGET_Q[bc.idx].label + ' ' + FIN_BUDGET_Q[bc.idx].year), low(FIN_BUDGET_Q[bc.idx].key)];
          if (names.includes(k)) colFor[c] = bc.key;
        });
      });
      // Rækkenavne: dansk eller engelsk, rå post eller visningsnavn
      const refFor = {};
      Object.values(FIN_POSTS).forEach(p => { if (!p.raw) return; [p.raw, p.label].forEach(l => { refFor[low(l)] = p.ref; refFor[low(t(l))] = p.ref; }); });
      const changes = [];
      for (let i = hi + 1; i < aoa.length; i++) {
        const row = aoa[i];
        const ref = row && refFor[low(row[labelCol])];
        if (!ref) continue;
        Object.keys(colFor).forEach(c => {
          const raw = row[c];
          if (raw == null || raw === '') return;
          const n = typeof raw === 'number' ? raw : finParseInput(String(raw), 'da');
          if (n == null || isNaN(n)) return;
          changes.push({ rowRef: ref, colKey: colFor[c], value: n * factor });
        });
      }
      const done = finSaveEdits(changes, 'Excel-import: ' + file.name);
      if (done.length) {
        CW.log('fin-edit', finFill(t('Budget importeret fra {fil}: {n} tal rettet i regnskabet'), { fil: file.name, n: done.length }), { who: 'rådgiver', data: { file: file.name, n: done.length } });
        setShowQuarters(true);
      }
      setImportMsg(done.length
        ? { text: finFill(t('{n} budgettal er importeret fra {fil} og står som rettelser.'), { n: done.length, fil: file.name }) }
        : { text: finFill(t('Ingen nye budgettal i {fil}.'), { fil: file.name }) });
    } catch (err) {
      setImportMsg({ err: true, text: t('Kunne ikke læse filen:') + ' ' + (err.message || err) });
    }
  };
  reader.readAsArrayBuffer(file);
}

// Modul-eksport
export { finExportBudget, finImportBudget };
