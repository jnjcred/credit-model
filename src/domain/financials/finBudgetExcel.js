// Fanen Virksomheden, Regnskab: budgettet ud og ind som Excel ("Eksportér budget" og "Importér
// budget"). Koden stod inde i React-komponenten AnnualReportSection i src/financials.jsx og blev
// flyttet hertil ved migrationen til Vue. XLSX er SheetJS fra index.html. Importerede tal bliver
// rettelser (finSaveEdits).
// Regnskab v5 (9. oktober 2026): skabelonen har hele regnskabsår (Budget 2026, 2027 og 2028) i
// stedet for september og kvartalerne, som tabellen viser budgettet. Jesper: kunden skal levere
// budget for hele år. En fil med kvartaler eller måneder afvises med en forklaring.
import { ANNUAL_REPORT } from './finData.js';
import { FIN_BUDGET_YEARS } from './finCalc.js';
import { FIN_EDIT_COLS, FIN_POSTS, finAdvisor, finLoadNotes, finCommentsFor, finSaveEdits } from './finEdits.js';
import { finFill, finParseInput } from './finFormat.js';

// Kolonnerne i skabelonen: budgettets hele år (by0-by2)
const yearCols = () => FIN_EDIT_COLS.filter(c => c.kind === 'by');
const headOf = (c) => 'Budget ' + c.year;

/* "Eksportér budget": budgettets hele år som .xlsx (filen hentes med det samme).
   unit = tabellens enhed ('mio' | 'thousand'); model = finApplyEdits(edits); edits = finLoadEdits();
   budgets = { '2026': kort | null, … } (finBudgetYear), eller null, når der ikke er et budget: så er
   filen en tom skabelon. Summerne står med, men beregnes ved import af posterne. */
function finExportBudget(unit, model, edits, budgets) {
  if (!window.XLSX) { CW.toast && CW.toast(t('Excel-bibliotek ikke indlæst. Prøv at genindlæse siden.')); return; }
  const cols = yearCols();
  const f = unit === 'mio' ? 1 : 1000;
  const aoa = [
    ['Budget, ' + DATA.COMPANY.name],
    ['Granularitet', 'Hele regnskabsår'],
    ['Regnskabsår', 'Januar-december'],
    ['Enhed', unit === 'mio' ? 'DKK mio.' : 'DKK tusind'],
    [],
    ['Gruppe', 'Regnskabspost', ...cols.map(headOf), 'Note'],
  ];
  const cmtList = [];
  ANNUAL_REPORT.groups.forEach(g => g.rows.forEach(r => {
    if (r.memo) return;
    const vals = cols.map(c => {
      const m = budgets && budgets[c.year];
      const v = m ? m[r.label] : null;
      return v == null ? '' : Math.round(v * f * 1000) / 1000;
    });
    const ed = cols.filter(c => model.map[r.label + '|' + c.key]).map(headOf);
    cols.forEach((c, j) => { const cs = finCommentsFor(finLoadNotes(), edits, r.label, c.key); if (cs.length) cmtList.push({ r: aoa.length, c: 2 + j, t: cs.map(x => (x.by ? x.by + ': ' : '') + t(x.text)).join('\n') }); });
    const note = r.computed ? 'Beregnes af posterne' : ed.length ? 'Rettet: ' + ed.join(', ') : '';
    aoa.push([g.label, r.label, ...vals, note]);
  }));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  cmtList.forEach(cm => { const a = XLSX.utils.encode_cell({ r: cm.r, c: cm.c }); if (ws[a]) { ws[a].c = [{ a: finAdvisor(), t: cm.t }]; ws[a].c.hidden = true; } });
  ws['!cols'] = [{ wch: 18 }, { wch: 32 }, ...cols.map(() => ({ wch: 14 })), { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Budget');
  XLSX.writeFile(wb, 'budget-nordhavn-' + new Date().toISOString().slice(0, 10) + '.xlsx');
}

/* "Importér budget" med filen fra filvælgeren. Filen læses i browseren (FileReader) og sendes
   ikke. setImportMsg({ text, err? }) giver beskeden under værktøjslinjen. unit = tabellens enhed,
   brugt når filen ikke selv angiver en. Kolonnerne findes på året ("Budget 2026", "2026",
   "Helår 2026", "2026E"); kvartaler og måneder afvises. Summerne i filen bruges ikke.
   opts.versionId: rettelserne hører til rådgiverens version (finVersions.js); opts.onSaved(n) kaldes,
   når tallene er gemt (n = antal tal i filen). */
function finImportBudget(file, unit, setImportMsg, opts) {
  const cols = yearCols();
  if (!file || !window.XLSX) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
      const low = (s) => String(s == null ? '' : s).toLowerCase().replace(/\(budget\)/g, '').replace(/\s+/g, ' ').trim();
      // Enhed fra filen; ellers tabellens
      let factor = unit === 'mio' ? 1 : 0.001;
      aoa.slice(0, 8).forEach(row => {
        if (!row || low(row[0]) !== 'enhed') return;
        const v = low(row[1]);
        factor = v.includes('hele kr') || v === 'kr' || v === 'dkk' ? 0.000001 : (v.includes('tusind') || v.includes('t.')) ? 0.001 : 1;
      });
      const hi = aoa.findIndex(r => r && (low(r[0]) === 'gruppe' || low(r[1]) === 'regnskabspost' || low(r[0]) === 'regnskabspost'));
      if (hi < 0) { setImportMsg({ err: true, text: t('Kunne ikke finde rækken med kolonnenavne. Brug en fil fra Eksportér budget som skabelon.') }); return; }
      const header = aoa[hi];
      const labelCol = low(header[0]) === 'regnskabspost' ? 0 : 1;
      // Kolonne → budgetår. En kolonne med kvartal eller måned er ikke et helt år
      const part = /(^|[^a-zæøå])(q[1-4]|kvartal|jan|feb|mar|apr|maj|may|jun|jul|aug|sep|okt|oct|nov|dec)/;
      const colFor = {};
      let partial = false;
      header.forEach((h, c) => {
        const k = low(h);
        const m = /(^|[^0-9])(20\d{2})(e|b)?($|[^0-9])/.exec(k);
        if (!m) return;
        if (part.test(k) || /20\d{2}-\d{2}/.test(k)) { partial = true; return; }
        const col = cols.find(x => x.year === m[2]);
        if (col) colFor[c] = col.key;
      });
      if (!Object.keys(colFor).length) {
        setImportMsg({ err: true, text: partial
          ? t('Filen har kvartaler eller måneder. Budgettet importeres for hele regnskabsår: brug en fil fra Eksportér budget som skabelon.')
          : t('Kunne ikke finde kolonner med budgetår (f.eks. Budget 2026). Brug en fil fra Eksportér budget som skabelon.') });
        return;
      }
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
      const done = finSaveEdits(changes, 'Excel-import: ' + file.name, undefined, { keep: true, versionId: opts && opts.versionId });
      if (done.length && opts && opts.onSaved) opts.onSaved(changes.length);
      if (done.length) CW.log('fin-edit', finFill(t('Budget importeret fra {fil}: {n} tal rettet i regnskabet'), { fil: file.name, n: done.length }), { who: 'rådgiver', data: { file: file.name, n: done.length } });
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
export { finExportBudget, finImportBudget, FIN_BUDGET_YEARS };
