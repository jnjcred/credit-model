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
    { key: 'export', label: 'Fra Crediwire', icon: 'BarChart', items: all.filter(d => !d.fileId && d.origin === 'export') },
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
          <li>{t('Vedhæft filerne i Copilot, og skriv memoet ud fra dem. Kontrollér tal og kilder mod dokumenterne.')}</li>
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
