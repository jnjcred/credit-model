/* ─────────────────────────────────────────────────────────────────────────
   Kontomapping (MapperPage, ruten 'mapping'): en side for sig, som åbnes fra
   demopunktet i venstremenuen. Kundens saldobalance fra e-conomic til venstre,
   Crediwires kategorier til højre. Rådgiveren vælger konti ("Vælg") og flytter
   dem til en kategori med "Flyt hertil". Ændringerne er et udkast, til de
   gemmes; så regnes de realiserede kvartaler i Regnskab om (finSyncMapping i
   financials.jsx). Udkastet bliver stående, hvis man går til en anden side og
   kommer tilbage (MAP_DRAFT), men ikke ved genindlæsning.
   Data og kategorier: src/mapping.js (window.CW_MAP).
   ──────────────────────────────────────────────────────────────────────── */

function mapFill(s, vars) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); }
// Beløb i hele kroner med e-conomics fortegn: "-928.076" / "-928,076"
function mapKr(v) {
  if (v == null || isNaN(v)) return '';
  const s = Math.abs(Math.round(v)).toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK');
  return (v < 0 ? '−' : '') + s;
}

// Fejlbeskederne fra mapping.js er dansk tekst; en evt. liste efter kolon oversættes ikke
function mapErr(msg) {
  const s = String(msg || ''), i = s.indexOf(': ');
  return i > 0 && !/^HTTP/.test(s) ? t(s.slice(0, i + 1)) + ' ' + s.slice(i + 2) : t(s);
}

// Udkastet (konti flyttet, men ikke gemt) overlever skift mellem sider
let MAP_DRAFT = {};

function MapperPage({ go }) {
  const M = window.CW_MAP;
  const [ver, setVer] = React.useState(0);
  React.useEffect(() => {
    const on = () => setVer(v => v + 1);
    window.addEventListener(M.EVENT, on);
    return () => window.removeEventListener(M.EVENT, on);
  }, []);
  const ready = M.ready();
  const accounts = ready ? M.accounts() : [];
  const saved = React.useMemo(() => (ready ? M.saved() : {}), [ver, ready]);

  const [changes, setChangesState] = React.useState(() => MAP_DRAFT);   // nr -> kategori-id (udkast)
  const setChanges = (v) => { MAP_DRAFT = v; setChangesState(v); };
  const [sel, setSel] = React.useState({});              // nr -> true
  const [period, setPeriod] = React.useState('all');
  const [filter, setFilter] = React.useState('all');     // all | auto | manual | none | changed
  const [query, setQuery] = React.useState('');
  const [tab, setTab] = React.useState('cats');
  const [stmt, setStmt] = React.useState('pl');
  const [group, setGroup] = React.useState('Omsætning');
  const [sub, setSub] = React.useState(null);
  const [catQuery, setCatQuery] = React.useState('');
  const [openAcc, setOpenAcc] = React.useState(null);
  const lastClick = React.useRef(null);

  const dirtyNrs = Object.keys(changes).filter(nr => saved[nr] && changes[nr] !== saved[nr].cat);
  const dirty = dirtyNrs.length > 0;
  const isLeaf = (a) => a.type === 'Drift' || a.type === 'Status';
  const selAcc = accounts.filter(a => sel[a.nr] && isLeaf(a));
  const selStmt = selAcc.length ? (selAcc.every(a => a.type === 'Drift') ? 'pl' : selAcc.every(a => a.type === 'Status') ? 'bs' : 'mixed') : null;
  // Vælges konti af én slags, skifter panelet til den opgørelse, de hører til
  React.useEffect(() => {
    if ((selStmt === 'pl' || selStmt === 'bs') && stmt !== selStmt) {
      setStmt(selStmt); setGroup(M.GROUPS.find(g => g.stmt === selStmt).label); setSub(null);
    }
  }, [selStmt]);

  const span = M.span();
  const P = (period !== 'all' && M.PERIODS.find(p => p.key === period)) || span;
  // "Jan 2026 - Aug 2026" med månedsnavnene på det valgte sprog
  const spanLabel = span ? span.label.replace(/[A-Za-zæøå]+/g, w => t(w)) : '';
  const eff = (nr) => {
    if (changes[nr] !== undefined && saved[nr] && changes[nr] !== saved[nr].cat) return { cat: changes[nr], method: 'manual', pending: true };
    return saved[nr] || { cat: null, method: 'none' };
  };
  const methodOf = (a) => { const e = eff(a.nr); return e.pending ? 'changed' : e.cat ? e.method : 'none'; };
  const leaves = accounts.filter(isLeaf);
  const counts = { all: leaves.length, auto: 0, manual: 0, none: 0, changed: 0 };
  leaves.forEach(a => { const m = methodOf(a); if (m === 'changed') counts.changed++; if (m === 'none') counts.none++; else if (eff(a.nr).method === 'auto') counts.auto++; else counts.manual++; });
  // Bliver den valgte gruppe tom (fx "Ikke gemt" efter Gem), vises alle igen
  const fil = (filter === 'none' && !counts.none) || (filter === 'changed' && !counts.changed) ? 'all' : filter;
  const q = query.trim().toLowerCase();
  const filtering = fil !== 'all' || !!q;
  const matches = (a) => {
    if (!isLeaf(a)) return !filtering;
    if (q) {
      // Søgningen rammer kontonr., kontonavn og den kategori, kontoen er mappet til
      const c = M.CAT[eff(a.nr).cat];
      const hay = [String(a.nr), a.name].concat(c ? [c.label, c.group, t(c.label), t(c.group)] : []).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (fil === 'all') return true;
    const m = methodOf(a), e = eff(a.nr);
    if (fil === 'changed') return m === 'changed';
    if (fil === 'none') return m === 'none';
    if (fil === 'auto') return !!e.cat && e.method === 'auto';
    if (fil === 'manual') return !!e.cat && e.method === 'manual';
    return true;
  };
  const visible = accounts.filter(matches);
  const visibleLeaves = visible.filter(isLeaf);

  // Valg: klik vælger én; Shift-klik vælger alt mellem det forrige klik og dette
  const selNrs = Object.keys(sel).filter(k => sel[k]).map(Number);
  const toggle = (a, shift) => {
    if (shift && lastClick.current != null) {
      const ids = visibleLeaves.map(x => x.nr);
      const i0 = ids.indexOf(lastClick.current), i1 = ids.indexOf(a.nr);
      if (i0 >= 0 && i1 >= 0) {
        const on = !sel[a.nr];
        const next = { ...sel };
        ids.slice(Math.min(i0, i1), Math.max(i0, i1) + 1).forEach(n => { next[n] = on; });
        setSel(next); lastClick.current = a.nr; return;
      }
    }
    setSel(s => ({ ...s, [a.nr]: !s[a.nr] }));
    lastClick.current = a.nr;
  };
  const allVisibleOn = visibleLeaves.length > 0 && visibleLeaves.every(a => sel[a.nr]);
  const toggleAll = () => {
    const next = { ...sel };
    visibleLeaves.forEach(a => { next[a.nr] = !allVisibleOn; });
    setSel(next);
  };

  const catLabel = (c) => t(c.label);
  const canMove = (c) => selAcc.length > 0 && selStmt === c.stmt;
  const moveTo = (c) => {
    if (!canMove(c)) return;
    const next = { ...changes };
    selAcc.forEach(a => {
      if (saved[a.nr] && saved[a.nr].cat === c.id) delete next[a.nr];
      else next[a.nr] = c.id;
    });
    setChanges(next);
    setSel({});
    CW.focusSoon('#map-save');   // knappen, man trykkede på, bliver slået fra
    CW.toast(mapFill(selAcc.length === 1 ? t('1 konto flyttet til {kat}. Gem for at opdatere Regnskab.') : t('{n} konti flyttet til {kat}. Gem for at opdatere Regnskab.'), { n: selAcc.length, kat: catLabel(c) }));
  };
  const save = () => {
    if (!dirty) return;
    const map = {};
    Object.keys(saved).forEach(nr => { map[nr] = { cat: eff(nr).cat }; });
    const n = dirtyNrs.length;
    const first = dirtyNrs[0], fa = accounts.find(a => String(a.nr) === String(first)), fc = M.CAT[changes[first]];
    const by = (window.DATA && DATA.ADVISOR && DATA.ADVISOR.name) || 'Mette Larsen';
    M.save(map, by);
    setChanges({});
    const example = fa && fc ? fa.nr + ' ' + fa.name + ' → ' + t(fc.group) + ' › ' + t(fc.label) : '';
    CW.log('mapping', mapFill(n === 1 ? t('Kontomapping gemt: {eks}') : t('Kontomapping gemt: {n} konti mappet om, bl.a. {eks}'), { n, eks: example }), { who: 'rådgiver', data: { n } });
    CW.toast(t('Mappingen er gemt. De realiserede kvartaler i Regnskab er regnet om.'));
    CW.focusSoon('#fin-mapper-title');
  };
  // Én konto tilbage til Crediwires automatiske forslag (som et ikke gemt udkast)
  const toDefault = (a) => {
    const d = M.defaultCat(a.nr);
    if (!d) return;
    const next = { ...changes };
    if (saved[a.nr] && saved[a.nr].cat === d) delete next[a.nr]; else next[a.nr] = d;
    setChanges(next);
    CW.focusSoon('#map-save');
  };
  const resetChanges = () => { setChanges({}); CW.toast(t('Ændringerne er nulstillet til den gemte mapping.')); };

  // Kategoripanelet
  const groups = M.GROUPS.filter(g => g.stmt === stmt);
  const g = groups.find(x => x.label === group) || groups[0];
  const subs = g.subs.filter(s => !sub || s[0] === sub);
  const countFor = (id) => leaves.filter(a => eff(a.nr).cat === id).length;
  const leafRow = (c, showPath) => {
    const n = countFor(c.id);
    const ok = canMove(c);
    return (
      <li key={c.id} className="map-leaf">
        <span className="map-leaf-main">
          {showPath && <span className="map-leaf-path">{t(c.group)} › {t(c.sub)}</span>}
          <span>{catLabel(c)}</span>
          <span className="map-leaf-path">{t('I Regnskab:')} {t(c.entry)}{c.child ? ' › ' + t(c.child) : ''}</span>
        </span>
        {n > 0 && <span className="map-leaf-n" title={mapFill(n === 1 ? t('1 konto er mappet hertil') : t('{n} konti er mappet hertil'), { n })}>{n}</span>}
        <button type="button" className="map-move" disabled={!ok} onClick={() => moveTo(c)}
          aria-label={mapFill(t('Flyt de valgte konti til {kat}'), { kat: catLabel(c) })}
          title={ok ? undefined : selAcc.length ? t('Driftskonti kan kun mappes til resultatopgørelsen og statuskonti kun til balancen') : t('Vælg først konti til venstre')}>
          {t('Flyt hertil')} <I.ChevronRight size={11} aria-hidden="true"/>
        </button>
      </li>
    );
  };
  const cq = catQuery.trim().toLowerCase();
  const catHits = cq ? M.CATS.filter(c => [c.label, c.group, c.sub, t(c.label), t(c.group), t(c.sub)].some(s => s.toLowerCase().includes(cq))) : [];

  const metIcon = (a) => {
    const e = eff(a.nr);
    if (e.pending) return <span className="map-met changed" role="img" aria-label={t('Ændret, ikke gemt')} title={t('Ændret, ikke gemt')}><I.Edit size={13}/></span>;
    if (!e.cat) return <span className="map-met none" role="img" aria-label={t('Ikke mappet')} title={t('Ikke mappet')}><I.AlertCircle size={14}/></span>;
    if (e.method === 'manual') {
      const tip = mapFill(t('Tilpasset af {navn} {dato}'), { navn: e.by || '', dato: e.at ? CW.fmtDate(e.at) : '' }).trim();
      return <span className="map-met" role="img" aria-label={tip} title={tip}><I.User size={13}/></span>;
    }
    return <span className="map-met" role="img" aria-label={t('Automatisk mappet')} title={t('Automatisk mappet ud fra kontonummer og navn')}><I.FileText size={13}/></span>;
  };

  const months = M.months();
  const res = ready ? M.compute(Object.fromEntries(Object.keys(saved).map(nr => [nr, { cat: eff(nr).cat }]))) : null;
  const unmapped = res ? res.unmapped : [];

  const company = (window.DATA && DATA.COMPANY && DATA.COMPANY.name) || '';
  return (
    <>
      <Topbar crumbs={[t('Kontomapping')]} right={null}/>
      <div className="map-page">
        <div className="page-head map-page-head">
          <div style={{ minWidth: 0 }}>
            <h1 id="fin-mapper-title" className="page-title" tabIndex={-1}>
              {t('Kontomapping')}
              {/* Siden ligger i venstremenuen, så sagen står i titlen */}
              <span className="map-page-co"> · {company}</span>
              <span className="nav-demo-tag" style={{ marginLeft: 10, verticalAlign: 4 }}>{t('demo')}</span>
            </h1>
            <div className="page-sub" style={{ maxWidth: 820 }}>
              {mapFill(t('Kundens saldobalance fra e-conomic, {n} konti. Hver konto lægges i en Crediwire-kategori, og summerne går ind i Regnskab som de realiserede kvartaler i 2026.'), { n: leaves.length || '…' })}
            </div>
          </div>
          {go && <button type="button" className="btn btn-sm" onClick={() => go('workspace:1:financials')}>{t('Se Regnskab')} <I.ArrowRight size={13} aria-hidden="true"/></button>}
        </div>
      <div id="fin-mapper" className="card map-frame" aria-labelledby="fin-mapper-title" role="region">
        {!ready ? (
          <div style={{ padding: 22, fontSize: 13.5, color: 'var(--c-text-2)' }}>
            {M.status() === 'error' ? (
              <div role="alert">
                <p style={{ margin: '0 0 10px' }}>{t('Saldobalancen kunne ikke hentes:')} {mapErr(M.error())}</p>
                <button type="button" className="btn btn-sm" onClick={() => M.load(true)}>{t('Prøv igen')}</button>
              </div>
            ) : <p role="status" style={{ margin: 0 }}>{t('Henter saldobalancen fra e-conomic …')}</p>}
          </div>
        ) : (<>
          <div className="map-toolbar">
            <label className="map-field">
              <span>{t('Periode')}</span>
              <select className="input" value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="all">{spanLabel}</option>
                {M.PERIODS.map(p => <option key={p.key} value={p.key}>{t(p.label)}</option>)}
              </select>
            </label>
            <label className="map-field map-search">
              <span>{t('Søg konto')}</span>
              <span className="map-search-box">
                <I.Search size={13} aria-hidden="true"/>
                <input className="input" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Kontonr. eller navn')}/>
              </span>
            </label>
            <div className="map-field">
              <span id="map-filter-l">{t('Metode')}</span>
              <CWSeg size="sm" ariaLabel={t('Metode')} value={fil} onChange={setFilter} options={[
                { k: 'all', l: t('Alle') + ' (' + counts.all + ')' },
                { k: 'auto', l: t('Automatisk') + ' (' + counts.auto + ')' },
                { k: 'manual', l: t('Tilpasset') + ' (' + counts.manual + ')' },
                ...(counts.none ? [{ k: 'none', l: t('Ikke mappet') + ' (' + counts.none + ')' }] : []),
                ...(counts.changed ? [{ k: 'changed', l: t('Ikke gemt') + ' (' + counts.changed + ')' }] : []),
              ]}/>
            </div>
            <span className="map-actions">
              <a className="btn btn-sm" href={M.FILE} download={M.FILE_NAME} title={t('Hent saldobalancen, som mappingen bygger på')}><I.Download size={13} aria-hidden="true"/> {t('Hent Excel')}</a>
              <button type="button" className="btn btn-sm" disabled={!dirty} onClick={resetChanges}><I.Undo size={13} aria-hidden="true"/> {t('Nulstil ændringer')}</button>
              <button type="button" id="map-save" className="btn btn-sm btn-primary" disabled={!dirty} onClick={save}>
                {dirty ? mapFill(t('Gem ændringer ({n})'), { n: dirtyNrs.length }) : t('Gem ændringer')}
              </button>
            </span>
          </div>
          {unmapped.length > 0 && (
            <div className="map-warn" role="status">
              <I.AlertTriangle size={14} aria-hidden="true"/>
              {mapFill(unmapped.length === 1 ? t('1 konto med bevægelser er ikke mappet, så beløbet mangler i Regnskab: {konti}') : t('{n} konti med bevægelser er ikke mappet, så beløbene mangler i Regnskab: {konti}'), { n: unmapped.length, konti: unmapped.slice(0, 4).map(a => a.nr + ' ' + a.name).join(', ') + (unmapped.length > 4 ? ' …' : '') })}
            </div>
          )}

          <div className="map-body">
            <div className="map-main">
              <button type="button" className="map-skip" onClick={() => CW.focusSoon('#map-side-start')}>{t('Gå til kategorierne')}</button>
              <table className="map-tbl" aria-label={t('Saldobalance og mapping')}>
                <colgroup><col style={{ width: 76 }}/><col/><col style={{ width: 128 }}/><col style={{ width: '32%' }}/><col style={{ width: 92 }}/><col style={{ width: 60 }}/></colgroup>
                <thead>
                  <tr className="map-band">
                    <th colSpan={3}>{t('Råbalance')}</th>
                    <th colSpan={3} className="map-sep">{t('Crediwire kategori')}</th>
                  </tr>
                  <tr>
                    <th>{t('Konto nr.')}</th>
                    <th>{t('Kontonavn')}</th>
                    <th className="num">{t('Bogført værdi')}</th>
                    <th className="map-sep">{t('Crediwire kategori')}</th>
                    <th>
                      <label className="map-check">
                        <input type="checkbox" checked={allVisibleOn} onChange={toggleAll} disabled={!visibleLeaves.length}
                          aria-label={allVisibleOn ? t('Fravælg alle viste konti') : t('Vælg alle viste konti')}/>
                        {t('Tilpas')}
                      </label>
                    </th>
                    <th>{t('Metode')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr><td colSpan={6} className="map-empty">{t('Ingen konti matcher.')}</td></tr>
                  )}
                  {visible.map(a => {
                    if (a.type === 'Overskrift') return (
                      <tr key={a.nr} className="map-h"><td>{a.nr}</td><td colSpan={2}>{a.name}</td><td colSpan={3} className="map-sep"/></tr>
                    );
                    if (a.type === 'Sum') return (
                      <tr key={a.nr} className="map-sum">
                        <td>{a.nr}</td><td>{a.name}</td><td className="num mono">{mapKr(M.sumValue(a, P))}</td>
                        <td colSpan={3} className="map-sep map-sumnote">{mapFill(t('Sum af konto {fra}-{til}'), { fra: a.from, til: a.to })}</td>
                      </tr>
                    );
                    if (!isLeaf(a)) return null;
                    const e = eff(a.nr), c = e.cat ? M.CAT[e.cat] : null, on = !!sel[a.nr], isOpen = openAcc === a.nr;
                    const rows = [(
                      <tr key={a.nr} id={'map-acc-' + a.nr} className={'map-acc' + (on ? ' on' : '') + (e.pending ? ' pending' : '')}>
                        <td><button type="button" className="map-link" aria-expanded={isOpen} onClick={() => setOpenAcc(isOpen ? null : a.nr)}
                          title={t('Vis beløb pr. måned')} aria-label={mapFill(t('Vis beløb pr. måned for konto {nr} {navn}'), { nr: a.nr, navn: a.name })}>{a.nr}</button></td>
                        <td className="map-name" title={a.name} onClick={() => setOpenAcc(isOpen ? null : a.nr)}>{a.name}</td>
                        <td className="num mono">{mapKr(M.accountValue(a, P))}</td>
                        <td className="map-sep">
                          {c ? (<>
                            <span className="map-cat-g">{t(c.group)}</span>
                            <span className="map-cat">{catLabel(c)}</span>
                          </>) : <span className="map-cat none">{t('Ikke mappet')}</span>}
                        </td>
                        <td>
                          <label className="map-check">
                            <input type="checkbox" checked={on} onChange={(ev) => toggle(a, !!(ev.nativeEvent && ev.nativeEvent.shiftKey))}
                              aria-label={mapFill(t('Vælg konto {nr} {navn}'), { nr: a.nr, navn: a.name })}/>
                            {t('Vælg')}
                          </label>
                        </td>
                        <td>
                          <span className="map-metcell">
                            {metIcon(a)}
                            {M.defaultCat(a.nr) && e.cat !== M.defaultCat(a.nr) && (
                              <button type="button" className="map-auto" onClick={() => toDefault(a)}
                                title={mapFill(t('Tilbage til automatisk: {kat}'), { kat: t(M.CAT[M.defaultCat(a.nr)].label) })}
                                aria-label={mapFill(t('Sæt konto {nr} tilbage til automatisk: {kat}'), { nr: a.nr, kat: t(M.CAT[M.defaultCat(a.nr)].label) })}>
                                <I.Undo size={12}/>
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    )];
                    if (isOpen) rows.push(
                      <tr key={a.nr + '-m'} className="map-months">
                        <td/>
                        <td colSpan={5}>
                          <div className="map-mgrid" role="group" aria-label={mapFill(t('Beløb pr. måned for konto {nr}'), { nr: a.nr })}>
                            {a.type === 'Status' && <div><span>{t('Primo')}</span><b className="mono">{mapKr(a.primo)}</b></div>}
                            {months.map((m, i) => <div key={m.key} className={P.months.includes(m.key) ? 'in' : ''}><span>{t(m.label.split(' ')[0])}</span><b className="mono">{mapKr(a.months[i])}</b></div>)}
                          </div>
                        </td>
                      </tr>
                    );
                    return rows;
                  })}
                </tbody>
              </table>
            </div>

            <aside className="map-side" aria-label={t('Crediwire kategorier')}>
              <div className="cw-tabs map-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'cats'} onClick={() => setTab('cats')}>{t('Crediwire kategorier')}</button>
                <button type="button" role="tab" aria-selected={tab === 'search'} onClick={() => setTab('search')}>{t('Søg efter kategori')}</button>
              </div>
              <div id="map-side-start" tabIndex={-1} className="map-selbar" role="status">
                {selAcc.length === 0 ? <span>{t('Vælg konti til venstre, og flyt dem til en kategori.')}</span> : (<>
                  <span><b>{mapFill(selAcc.length === 1 ? t('1 konto valgt') : t('{n} konti valgt'), { n: selAcc.length })}</b>{selStmt === 'mixed' ? ' · ' + t('både drifts- og statuskonti') : ''}</span>
                  <button type="button" className="btn-link" onClick={() => setSel({})}>{t('Fjern markering')}</button>
                </>)}
              </div>
              {selAcc.length > 0 && (selStmt === 'mixed' || (tab === 'cats' && selStmt !== stmt)) && (
                <div className="map-block" role="alert">
                  {selStmt === 'mixed'
                    ? t('Driftskonti og statuskonti kan ikke flyttes sammen. Vælg kun den ene slags.')
                    : selStmt === 'bs' ? t('De valgte er statuskonti. De kan kun flyttes til en kategori i balancen.') : t('De valgte er driftskonti. De kan kun flyttes til en kategori i resultatopgørelsen.')}
                  {selStmt !== 'mixed' && (
                    <button type="button" className="btn-link" onClick={() => { setStmt(selStmt); setGroup(M.GROUPS.find(x => x.stmt === selStmt).label); setSub(null); }}>
                      {selStmt === 'bs' ? t('Vis balancen') : t('Vis resultatopgørelsen')}
                    </button>
                  )}
                </div>
              )}
              {tab === 'cats' ? (
                <div className="map-side-body">
                  <fieldset className="map-radios">
                    <legend>{t('Opgørelse')}</legend>
                    {[['pl', 'Resultatopgørelse'], ['bs', 'Balance']].map(([k, l]) => (
                      <label key={k}><input type="radio" name="map-stmt" checked={stmt === k}
                        onChange={() => { setStmt(k); setGroup(M.GROUPS.find(x => x.stmt === k).label); setSub(null); }}/> {t(l)}</label>
                    ))}
                  </fieldset>
                  <fieldset className="map-radios">
                    <legend>{stmt === 'pl' ? t('Resultatopgørelse') : t('Balance')}</legend>
                    {groups.map(x => (
                      <label key={x.label}><input type="radio" name="map-group" checked={g.label === x.label}
                        onChange={() => { setGroup(x.label); setSub(null); }}/> {t(x.label)}</label>
                    ))}
                  </fieldset>
                  <div className="map-gtitle">{t(g.label)}</div>
                  <div className="map-chips" role="group" aria-label={t('Undergruppe')}>
                    <button type="button" aria-pressed={!sub} onClick={() => setSub(null)}>{t('Alle')}</button>
                    {g.subs.map(s => <button key={s[0]} type="button" aria-pressed={sub === s[0]} onClick={() => setSub(sub === s[0] ? null : s[0])}>{t(s[0])}</button>)}
                  </div>
                  <div className="map-list">
                    {subs.map(s => (
                      <div key={s[0]}>
                        <div className="map-sub-h">{t(s[0])}</div>
                        <ul>{M.CATS.filter(c => c.group === g.label && c.sub === s[0]).map(c => leafRow(c, false))}</ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="map-side-body">
                  <label className="map-field" style={{ width: '100%' }}>
                    <span>{t('Søg efter kategori')}</span>
                    <input className="input" type="search" autoFocus value={catQuery} onChange={e => setCatQuery(e.target.value)} placeholder={t('Fx husleje, debitorer, leasing')}/>
                  </label>
                  <div className="map-list">
                    {cq && !catHits.length && <div className="map-empty">{t('Ingen kategorier matcher.')}</div>}
                    {catHits.length > 0 && <ul>{catHits.map(c => leafRow(c, true))}</ul>}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </>)}
      </div>
      </div>
    </>
  );
}
window.MapperPage = MapperPage;
