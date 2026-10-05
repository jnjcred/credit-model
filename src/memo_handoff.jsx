// Credit memo i piloten (CW_MEMO_MODE 'copilot', case_facts.js): EIFO skriver
// memoet i Word med Copilot. Siden samler sagens materiale, så rådgiveren kan
// hente det hele og fortsætte dér: kundens og bankens filer, de offentlige data
// og Crediwires egne eksporter (financials.jsx, CW_EXPORT_DOCS). Det indbyggede
// memo (memo.jsx) er gemt uændret og slås til i Tweaks.
//
// Hentning genbruger Dokumenter-fanens hjælpere (documents.jsx: docFromUpload,
// docCanGet, docGet, docKey, docDay, docPages, docMeta). Hvad der er hentet,
// gemmes i sagens tilstand som handoff = { at, keys }, så Overblik kan vise det.

function hoFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

// Sagens materiale i tre grupper. Afviste uploads og erstattede versioner er ikke med.
function hoGroups() {
  const ups = CW.allUploads().map(docFromUpload).filter(d => d.itemStatus !== 'rejected');
  const src = (DATA.DOCS || []).filter(d => !d.superseded);
  const all = ups.concat(src);
  const byDate = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));
  return [
    { key: 'case', label: 'Dokumenter fra kunden', icon: 'FileText', items: all.filter(d => d.fileId || (d.origin !== 'public' && d.origin !== 'export')).sort(byDate) },
    { key: 'public', label: 'Offentlige data', icon: 'Globe', items: all.filter(d => !d.fileId && d.origin === 'public').sort(byDate) },
    // Vejledningen til den videre AI står først
    { key: 'export', label: 'Fra Crediwire', icon: 'BarChart', items: all.filter(d => !d.fileId && d.origin === 'export').sort((a, b) => (b.name === HO_GUIDE_NAME) - (a.name === HO_GUIDE_NAME)) },
  ];
}

// Gem, hvad der er hentet. all: hele materialet er hentet nu (tidspunktet vises på Overblik).
function hoMark(keys, all) {
  const h = CW.caseState().handoff || {};
  const set = new Set(h.keys || []);
  keys.forEach(k => set.add(k));
  CW.setCaseState({ handoff: { at: all ? new Date().toISOString() : (h.at || null), keys: Array.from(set) } });
}

function WSMemoHandoff({ go, caseId }) {
  CW.useCase();
  const [busy, setBusy] = React.useState(false);
  const h = CW.caseState().handoff || {};
  const got = new Set(h.keys || []);

  const groups = hoGroups();
  const docs = groups.flatMap(g => g.items);
  const gettable = docs.filter(docCanGet);
  const fresh = gettable.filter(d => !got.has(docKey(d)));
  const count = (g) => g.items.filter(docCanGet).length;
  const [nCase, nPublic, nExport] = groups.map(count);

  // Mangler der stadig materiale fra kunden, kan rådgiveren hente nu og igen senere
  const p = CW.progress();
  const request = CW.request();
  const pending = request && !wsMaterialReady(p);
  const missing = p.requiredMissing != null ? p.requiredMissing : p.missing;

  async function fetchList(list, all) {
    if (busy || !list.length) return;
    setBusy(true);
    CW.toast(hoFill(list.length === 1 ? t('Henter 1 dokument') : t('Henter {n} dokumenter'), { n: list.length }));
    for (const d of list) {
      try { docGet(d); } catch (e) {}
      await new Promise(r => setTimeout(r, 350));
    }
    hoMark(list.map(docKey), all);
    setBusy(false);
    CW.toast(t('Materialet er hentet. Fortsæt i Copilot.'));
  }
  const getOne = (d) => { if (docGet(d) !== false) hoMark([docKey(d)], false); };

  const toOverview = () => {
    try { sessionStorage.setItem('kabul:ws-focus', 'ws-outstanding'); } catch (e) {}
    go && go('workspace:' + caseId);
  };


  return (
    <div className="page page-wide" style={{ maxWidth: 1080, padding: '24px 32px 80px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 className="page-title">{t('Credit memo')}</h1>
        <div className="page-sub" style={{ maxWidth: 720 }}>{t('Hent sagens materiale her og fortsæt i Copilot.')}</div>
      </div>

      {/* Næste skridt: hent materialet */}
      <section className="card" aria-labelledby="ho-title" style={{ marginBottom: 16 }}>
        <div style={{ padding: '20px 26px 18px' }}>
          <h2 id="ho-title" tabIndex={-1} style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em', outline: 'none' }}>
            {h.at ? t('Materialet er hentet') : t('Hent sagens materiale')}
          </h2>
          {/* Materialet i tal: ét punkt pr. gruppe, med samme ikoner som listen nedenfor */}
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 22px', fontSize: 13.5, color: 'var(--c-text-2)' }}>
            {[['FileText', nCase, '{n} fra kunden'], ['Globe', nPublic, '{n} offentlige'], ['BarChart', nExport, '{n} fra Crediwire']].map(([ic, n, label]) => (
              <li key={ic} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                {React.createElement(I[ic], { size: 14, 'aria-hidden': 'true', style: { color: 'var(--c-text-3)', flexShrink: 0 } })}
                <span>{hoFill(t(label), { n })}</span>
              </li>
            ))}
          </ul>
          {h.at && (
            <p style={{ fontSize: 13.5, color: 'var(--c-text-2)', margin: '8px 0 0', lineHeight: 1.55, maxWidth: 680 }}>
            {(fresh.length
              ? hoFill(fresh.length === 1 ? t('Hentet {when}; 1 dokument er kommet til siden.') : t('Hentet {when}; {k} dokumenter er kommet til siden.'), { when: CW.fmtWhen(h.at), k: fresh.length })
              : hoFill(t('Hentet {when}.'), { when: CW.fmtWhen(h.at) }))}
            </p>
          )}
          {pending && (
            <p style={{ fontSize: 13, color: 'var(--c-text-2)', margin: '8px 0 0', lineHeight: 1.55, maxWidth: 680, display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <I.AlertCircle size={13} aria-hidden="true" style={{ color: 'var(--c-warn, #b7791f)', flexShrink: 0, position: 'relative', top: 2 }}/>
              <span>
                {(p.toReview > 0
                  ? hoFill(p.toReview === 1 ? t('1 punkt fra kunden venter på din gennemgang.') : t('{n} punkter fra kunden venter på din gennemgang.'), { n: p.toReview })
                  : hoFill(missing === 1 ? t('1 påkrævet punkt mangler fra kunden.') : t('{n} påkrævede punkter mangler fra kunden.'), { n: missing }))}
                {' '}<button type="button" className="btn-link" onClick={toOverview}>{t('Se udestående')}</button>
              </span>
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {h.at && fresh.length > 0 ? (
              <>
                <button type="button" id="ho-get-all" className="btn btn-primary" disabled={busy} aria-busy={busy || undefined} onClick={() => fetchList(fresh, true)}>
                  <I.Download className="ic"/> {hoFill(fresh.length === 1 ? t('Hent det nye dokument') : t('Hent de {k} nye'), { k: fresh.length })}
                </button>
                <button type="button" className="btn" disabled={busy} onClick={() => fetchList(gettable, true)}>{t('Hent alle igen')}</button>
              </>
            ) : (
              <button type="button" id="ho-get-all" className={'btn' + (h.at ? '' : ' btn-primary')} disabled={busy || !gettable.length} aria-busy={busy || undefined} onClick={() => fetchList(gettable, true)}>
                <I.Download className="ic"/> {h.at ? t('Hent alle igen') : hoFill(t('Hent alle {n} dokumenter'), { n: gettable.length })}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Sådan fortsætter rådgiveren i Copilot */}
      <section className="card" aria-labelledby="ho-copilot-title" style={{ padding: '16px 26px 14px', marginBottom: 16 }}>
        <h2 id="ho-copilot-title" style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Fortsæt i Copilot')}</h2>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: 'var(--c-text)', lineHeight: 1.65 }}>
          <li>{t('Hent sagens materiale ovenfor.')}</li>
          <li>{t('Åbn et nyt credit memo i Word, som I plejer.')}</li>
          <li>{t('Vedhæft filerne i Copilot, og bed den starte med 00_README_for_AI.md. Filen fortæller Copilot, hvad hver fil er, og hvor meget den kan bære.')}</li>
          <li>{t('Skriv memoet ud fra materialet, og kontrollér tal og kilder mod dokumenterne.')}</li>
        </ol>
      </section>

      {/* Materialet, gruppe for gruppe */}
      <section className="card" aria-labelledby="ho-list-title" style={{ padding: '4px 16px 10px' }}>
        <h2 id="ho-list-title" className="sr-only">{t('Sagens materiale')}</h2>
        {groups.map(g => g.items.length === 0 ? null : (
          <div key={g.key}>
            <h3 style={{ margin: '14px 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--c-text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {I[g.icon] && React.createElement(I[g.icon], { size: 15, 'aria-hidden': 'true', style: { color: 'var(--c-text-2)', flexShrink: 0 } })}
              <span>{t(g.label)} ({g.items.length})</span>
            </h3>
            {g.items.map(d => <HandoffRow key={docKey(d)} d={d} got={got.has(docKey(d))} onGet={getOne}/>)}
          </div>
        ))}
      </section>
    </div>
  );
}

// Én række: filnavnet henter filen; til højre "Hentet" eller dokumenttypen
function HandoffRow({ d, got, onGet }) {
  const can = docCanGet(d);
  const meta = d.fileId
    ? docMeta([t(d.sourceLabel), docDay(d), d.size, d.itemId ? t(d.itemLabel) : null])
    : docMeta([t(d.sourceLabel || 'Kundeupload'), docDay(d), docPages(d), d.size]);
  return (
    <div className="cw-row">
      <div className="cw-row-main">
        <span className="cw-row-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {can
            ? <button type="button" className="cw-filelink" aria-label={hoFill(t('Hent {navn}'), { navn: d.name })} title={t('Hent filen')} onClick={() => onGet(d)}>{d.name}</button>
            : <span title={t('Filens indhold findes kun i den browsersession, den blev uploadet i. Upload filen igen for at hente den.')}>{d.name}</span>}
        </span>
        <span className="cw-row-meta">{meta}</span>
      </div>
      <span className="cw-row-cat" style={got ? { color: 'var(--c-text-2)', display: 'inline-flex', alignItems: 'center', gap: 4 } : undefined}>
        {got ? <><I.Check size={12} aria-hidden="true"/> {t('Hentet')}</> : can ? t(d.type) : t('Kan ikke hentes her')}
      </span>
    </div>
  );
}

window.WSMemoHandoff = WSMemoHandoff;

/* ─────────────────────────────────────────────────────────────────────────────
   00_README_for_AI.md: vejledning til den AI (fx Copilot), der skal læse sagens
   materiale og hjælpe rådgiveren med credit memoet. Bygges, når den hentes, ud af
   præcis de filer, som "Hent alle" henter (hoGroups), så listen altid passer.
   Står under Dokumenter og først i gruppen "Fra Crediwire" på Credit memo.

   Valg (5. oktober 2026, version 2):
   - Engelsk uanset appens sprog: læseren er en AI, og modeller følger
     instruktioner bedst på engelsk. Sagens filer er danske, så de danske fagord
     står med en ordliste, og memoet bedes skrevet på dansk.
   - README-navn med 00_ foran: den gængse "læs først"-fil, sorteret øverst.
   - Kort og faktuel: metadata øverst, fire principper med begrundelse, en
     filoversigt som tabel, fakta om tallene, ordliste og kendte uoverensstemmelser.
     Ingen fast læserækkefølge eller afsnitsskabelon, så den videre AI og
     rådgiveren selv kan styre arbejdet.
   ──────────────────────────────────────────────────────────────────────────── */
const HO_GUIDE_NAME = '00_README_for_AI.md';

// Hvad hver slags fil er, og hvor meget den kan bære: [hvad, pålidelighed]
const HO_TYPE_INFO = {
  'Årsrapport':      ['Annual report (årsrapport) published in the Danish business register (CVR); notes and management review included', 'Primary source for historical figures. Check the auditor\'s report for the level of assurance'],
  'Periodetal':      ['Interim figures (periodetal) from the company\'s accounting system', 'Company-provided, unaudited'],
  'Budget':          ['Budget with assumptions; may contain a version log', 'Company-provided, unaudited. Use the latest version'],
  'Låneaftale':      ['Loans and credit facilities: terms, interest, repayments, covenants', 'Agreement or company overview; check against the annual report notes'],
  'Sikkerhed':       ['Security: mortgages, guarantees, ranking', 'Bank document'],
  'Kontrakt':        ['Contract with a customer or partner', 'Company-provided'],
  'Marked':          ['External market report', 'Third party; background'],
  'Salg':            ['Sales breakdown, e.g. by country or customer', 'Company-provided, unaudited'],
  'Præsentation':    ['Company presentation or business plan', 'The company\'s own description'],
  'Selskab':         ['Company document, e.g. register of shareholders (ejerbog) or articles', 'Company-provided'],
  'Ansøgning':       ['The bank\'s application to EIFO: facility, amount, purpose, term, conditions', 'Bank document; defines what is applied for'],
  'Ratingberegning': ['Output of EIFO\'s rating model', 'EIFO model output; quote it rather than recalculate'],
};
// Crediwires egne eksporter (financials.jsx) efter filnavn: [hvad, pålidelighed]
function hoExportInfo(name) {
  if (/^Regnskabstabel/i.test(name)) return ['Financial table compiled by Crediwire. Sheet Regnskab: 2023-2025, 2026E, 2027B in DKK thousands. Sheet Kvartaler: quarters behind 2026E/2027B. Sheet Noter: method, sources and the adviser\'s corrections', 'Derived from the annual reports, interim figures and budget'];
  if (/^Produkt_marked/i.test(name)) return ['Product, market and industry summary', 'AI-generated in Crediwire and not checked against sources; background only'];
  if (/^Trustpilot/i.test(name)) return ['Trustpilot score, distribution and latest reviews as retrieved', 'Unverified reviews; soft signal'];
  if (/^Ejerskab/i.test(name)) return ['Owners from the register of beneficial owners, warrants, board with PEP check, management, group relations', 'Derived from CVR and the register of shareholders'];
  if (/^Virksomhedsprofil/i.test(name)) return ['Company master data and the case\'s product and amount', 'Derived from CVR and the case'];
  return ['File from Crediwire', 'Derived'];
}

// 3600000 -> "3.6" (engelsk talformat i vejledningen)
const hoMio = (v) => (Math.round(v / 1e5) / 10).toFixed(1);

function hoGuideMarkdown() {
  const co = DATA.COMPANY || {};
  const iso = DATA.fmt.isoDay(new Date());
  const groups = hoGroups().map(g => ({ ...g, items: g.items.filter(d => d.name !== HO_GUIDE_NAME && docCanGet(d)) }));
  const all = groups.flatMap(g => g.items);
  const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const ymd = (d) => (d.fileId ? String(d.at || '').slice(0, 10) : String(d.date || '').slice(0, 10)) || '';
  const fac = window.CASE_FACTS && window.CASE_FACTS.facility || {};
  const adviser = typeof PORTAL_CONTACT !== 'undefined' ? PORTAL_CONTACT.name + ', ' + PORTAL_CONTACT.org : 'EIFO';
  const out = [];
  const p = (...lines) => out.push(...lines);

  // Metadata øverst (maskinlæsbart)
  p('---',
    'purpose: Guide to the case material for an AI assistant drafting a credit memo',
    'company: ' + co.name,
    'cvr: "' + co.cvr + '"',
    'case_number: "' + co.caseNr + '"',
    'product: ' + (fac.eifoAmount
      ? (fac.instrumentEn || 'EIFO export guarantee') + ', DKK ' + hoMio(fac.eifoAmount) + ' million'
        + (fac.facilityAmount ? ' (' + Math.round((fac.eifoShare || 0) * 100) + "% of the bank's DKK " + hoMio(fac.facilityAmount) + ' million facility)' : '')
      : [co.caseType, co.amount].filter(Boolean).join(', ')),
    'adviser: ' + adviser,
    'prepared: ' + iso,
    'files: ' + all.length,
    'source_language: Danish',
    'memo_language: Danish',
    '---', '');

  p('# Case material: ' + co.name + ' (case ' + co.caseNr + ')', '');
  p('You are helping a credit adviser at EIFO (the Danish Export and Investment Fund) draft a credit memo in Word. This folder holds the case material exported from Crediwire on ' + iso + '. This file lists what each file is and how far it can be trusted. The other files are in Danish; a glossary is at the end.', '');

  p('## Principles', '');
  p('- Base the memo on these files and on what the adviser tells you. When something is not in the material, say so instead of estimating: the memo goes to a credit committee that relies on it.');
  p('- Cite file and page, sheet or note for figures, e.g. (Aarsrapport_2025.pdf, s. 6), so the adviser can verify them quickly.');
  p('- When sources disagree, show both. Known discrepancies are listed below.');
  p('- The adviser owns the assessment, rating and recommendation. Draft in Danish and follow the adviser\'s template.', '');

  p('## Files', '');
  p('| File | What it is | Source, date | Reliability |', '|---|---|---|---|');
  all.forEach(d => {
    const isExport = d.origin === 'export';
    const info = isExport ? hoExportInfo(d.name) : (HO_TYPE_INFO[d.type] || ['Document on the case', '']);
    let src = isExport ? 'Crediwire, ' + iso
      : d.fileId ? (d.by === 'rådgiver' ? 'Uploaded by the adviser' : 'Uploaded by the customer') + (d.itemLabel ? ' for "' + d.itemLabel + '"' : '') + (ymd(d) ? ', ' + ymd(d) : '')
      : (d.sourceLabel || '') + (ymd(d) ? ', ' + ymd(d) : '');
    if (d.fileId && d.itemStatus && d.itemStatus !== 'approved') src += ' (not yet reviewed by the adviser)';
    p('| ' + cell(d.name) + ' | ' + cell(info[0]) + ' | ' + cell(src) + ' | ' + cell(info[1]) + ' |');
  });
  p('');

  p('## Reading the figures', '');
  p('- Amounts are in DKK. The financial table (Regnskabstabel) is in DKK thousands; the annual reports use t.DKK (thousands).');
  p('- 2026E = January-August actuals plus budget for September-December. 2027B = budget for Q1-Q3 2027 only (9 months), so it is not comparable with a full year.');
  p('- In the Kvartaler sheet, the Jul-aug column covers two months and the balance sheet is at 31 August.');
  p('- Budget, interim figures and other company-provided numbers are unaudited.');
  p('- File names are written without æ, ø and å (aa = å, ae = æ, oe = ø), e.g. Aarsrapport = Årsrapport.', '');

  const conflicts = ((window.CASE_FACTS && window.CASE_FACTS.conflicts) || []).filter(c => c && (c.textEn || c.text));
  if (conflicts.length) {
    p('## Known discrepancies', '');
    p('Registered by the adviser in Crediwire, with how each is handled. "The memo" means the credit memo.', '');
    conflicts.forEach((c, i) => {
      p((i + 1) + '. ' + (c.textEn || c.text));
      const h = c.handlingEn || c.handling;
      if (h) p('   Handling: ' + h);
    });
    p('');
  }

  p('## Danish terms', '');
  p('| Danish | English |', '|---|---|');
  [
    ['årsrapport, note, ledelsesberetning, påtegning', 'annual report, note, management review, auditor\'s report'],
    ['periodetal, saldobalance', 'interim figures, trial balance'],
    ['resultatopgørelse, balance, egenkapital', 'income statement, balance sheet, equity'],
    ['ejerbog, anpartshaverlån, kapitalforhøjelse', 'register of shareholders, shareholder loan, capital increase'],
    ['driftskredit, realkreditlån, ejerpantebrev, kaution', 'overdraft facility, mortgage loan, owner\'s mortgage deed, guarantee'],
    ['eksportkaution, facilitet, ansøgning', 'export guarantee, facility, application'],
    ['t.kr. / t.DKK, mio. kr., s., ark', 'DKK thousands, DKK million, page, sheet'],
  ].forEach(r => p('| ' + r[0] + ' | ' + r[1] + ' |'));
  p('');
  return out.join('\n');
}

// Vejledningen står sammen med Crediwires andre eksporter (Dokumenter og Credit memo)
(function () {
  if (!Array.isArray(window.CW_EXPORT_DOCS)) window.CW_EXPORT_DOCS = [];
  if (window.CW_EXPORT_DOCS.some(d => d && d.name === HO_GUIDE_NAME)) return;
  window.CW_EXPORT_DOCS.push({
    id: 'crediwire-readme-for-ai', name: HO_GUIDE_NAME, type: 'Crediwire-eksport', source: 'Crediwire', origin: 'export', period: '-',
    // lazy: registret læser ikke indholdet (vejledningen læser selv registret)
    lazy: true, size: '6 KB',
    get date() { return DATA.fmt.isoDay(new Date()); },
    get meta() { return t('Vejledning til den AI, der skal læse materialet'); },
    get pages() { return [{ ref: 's. 1', title: 'README for AI', body: hoGuideMarkdown() }]; },
  });
})();
