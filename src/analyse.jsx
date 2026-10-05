// Portfolio screening / analyse side

// Kunderne i porteføljen ligger i data.js (DATA.PORTFOLIO), så sagskortenes
// risikomarkør og analysen bruger de samme tal. caseId peger på kundens sag.
const ANALYSE_CASES = DATA.PORTFOLIO;
// Valgt skabelon og filtre huskes i sessionen (DATA.viewGet/viewSet), også når
// man åbner en sag og går tilbage
const ANALYSE_VIEW = 'analyse';

// Skabeloner i to grupper (vist som optgroups i vælgeren). Kriterierne
// vises som grå chips (ChipSummary), når en skabelon er valgt.
const TEMPLATE_GROUPS = { god: 'Klarer det godt', fare: 'Faresignaler' };
const TEMPLATES = [
  { group: "god", label: "Høj vækst", criteria: [
    { metric: "revPct",    op: ">", val: 25, joinNext: "AND" },
    { metric: "ebitdaPct", op: ">", val: 10 },
  ] },
  { group: "god", label: "Sund drift", criteria: [
    { metric: "ebitda12", op: ">", val: 500000, joinNext: "AND" },
    { metric: "equity",   op: ">", val: 0 },
  ] },
  { group: "god", label: "Topperformere", criteria: [
    { metric: "revPct",    op: ">", val: 30, joinNext: "AND" },
    { metric: "ebitdaPct", op: ">", val: 15, joinNext: "AND" },
    { metric: "equity",    op: ">", val: 0  },
  ] },
  { group: "fare", label: "Negativ EBITDA", criteria: [{ metric: "ebitda12", op: "<", val: 0 }] },
  { group: "fare", label: "EBITDA-tilbagegang", criteria: [{ metric: "ebitdaPct", op: "<", val: -10 }] },
  { group: "fare", label: "Negativ egenkapital", criteria: [{ metric: "equity", op: "<", val: 0 }] },
  { group: "fare", label: "Kundekoncentration", criteria: [{ metric: "bigCust", op: ">", val: 50 }] },
  { group: "fare", label: "Faldende omsætning", criteria: [{ metric: "revPct", op: "<", val: -5 }] },
  { group: "fare", label: "Dobbelt underskud", criteria: [
    { metric: "ebitdaPct", op: "<", val: -10, joinNext: "AND" },
    { metric: "equity",    op: "<", val: 0 },
  ] },
  { group: "fare", label: "Koncentration og fald", criteria: [
    { metric: "bigCust",   op: ">", val: 50,  joinNext: "AND" },
    { metric: "ebitdaPct", op: "<", val: -10 },
  ] },
];

const METRICS = [
  { k: "revPct",    l: "Ændring i omsætning (%)",  short: "Omsætning",     unit: "%",   amtField: "rev12",    amtLabel: "Minimum omsætning" },
  { k: "ebitdaPct", l: "Ændring i EBITDA (%)",      short: "EBITDA",        unit: "%",   amtField: "ebitda12", amtLabel: "Minimum EBITDA"    },
  { k: "rev12",     l: "Omsætning 12 mdr.",          short: "Omsætning",     unit: "kr.", amtField: null },
  { k: "ebitda12",  l: "EBITDA 12 mdr.",             short: "EBITDA",        unit: "kr.", amtField: null },
  { k: "equity",    l: "Egenkapital",                short: "Egenkapital",   unit: "kr.", amtField: null },
  { k: "bigCust",   l: "Største kundeandel (%)",     short: "Kundeandel",    unit: "%",   amtField: null },
];

function metaFor(k) { return METRICS.find(m => m.k === k) || METRICS[0]; }

let _uid = 1;
function uid() { return _uid++; }

function makeCrit(metric) {
  const m = metaFor(metric);
  return { id: uid(), metric, op: ">", val: 0, unit: m.unit, minAmt: "", minAmtOp: ">", joinNext: "AND" };
}

function matchesCrit(row, c) {
  const v = Number(c.val);
  if (isNaN(v)) return true;
  const mainOk = c.op === ">" ? row[c.metric] > v : row[c.metric] < v;
  if (!mainOk) return false;
  const m = metaFor(c.metric);
  if (m.amtField && c.minAmt !== "" && c.minAmt !== null) {
    const amt = Number(c.minAmt);
    if (!isNaN(amt)) {
      const amtOk = c.minAmtOp === ">" ? row[m.amtField] > amt : row[m.amtField] < amt;
      if (!amtOk) return false;
    }
  }
  return true;
}

function runQuery(dept, branche, criteria) {
  let base = ANALYSE_CASES;
  if (dept !== "alle") base = base.filter(r => r.dept === dept);
  if (branche !== "alle") base = base.filter(r => r.branche === branche);
  if (criteria.length === 0) return base;

  let ids = new Set(base.filter(r => matchesCrit(r, criteria[0])).map(r => r.id));
  for (let i = 0; i < criteria.length - 1; i++) {
    const logic = criteria[i].joinNext;
    const next = criteria[i + 1];
    const nextIds = new Set(base.filter(r => matchesCrit(r, next)).map(r => r.id));
    if (logic === "AND") {
      ids = new Set([...ids].filter(id => nextIds.has(id)));
    } else {
      nextIds.forEach(id => ids.add(id));
    }
  }
  return base.filter(r => ids.has(r.id));
}

// Vækst i procent. Kun negative tal er røde (uden fed); positive står i tekstens farve.
function pct(v) {
  return <span style={v < 0 ? { color: "var(--c-danger)" } : undefined}>{v > 0 ? "+" : ""}{v}{pctSign()}</span>;
}
// "45 %" på dansk, "45%" på engelsk
function pctSign() { return window.CW_LANG === "en" ? "%" : " %"; }
function fmt(v) { return v.toLocaleString(window.CW_LANG === "en" ? "en-GB" : "da-DK", { maximumFractionDigits: 0 }); }

// Klik på en række: kunder med en sag åbner sagen. Nordhavn har levende data;
// de øvrige sager viser sagens ærlige tomme tilstand. Kunder uden sag åbner
// Ny sag-guiden forudfyldt med kunden (grænseflade 3: 'cw-new-case').
// Sagen viser så "Tilbage til Porteføljeanalyse" (sessionStorage 'cw_back', læses af workspace).
function openAnalyseRow(r, go) {
  if (r.caseId) {
    try { sessionStorage.setItem('cw_back', JSON.stringify({ route: 'analyse', label: 'Porteføljeanalyse' })); } catch (e) {}
    go("workspace:" + r.caseId);
    return;
  }
  try {
    window.dispatchEvent(new CustomEvent('cw-new-case', { detail: { name: r.name, cvr: r.cvr, source: 'analyse' } }));
  } catch (e) {}
}
/* Kundens sag i samme sagsliste som Mine opgaver (DATA.CASES): den faste sag
   (caseId), ellers den nyeste åbne sag med samme CVR eller navn, fx en sag
   oprettet i Ny sag. null hvis kunden ingen sag har. */
function analyseCaseFor(r) {
  if (r.caseId) return DATA.caseById(r.caseId);
  const digits = (s) => String(s || '').replace(/[^0-9]/g, '');
  const cvr = digits(r.cvr);
  const name = String(r.name || '').trim().toLowerCase();
  const hits = DATA.CASES.filter(c => !DATA.caseIsDecided(c) && ((cvr && digits(c.cvr) === cvr) || (name && String(c.name || '').trim().toLowerCase() === name)));
  return hits.length ? hits.sort((a, b) => b.id - a.id)[0] : null;
}
// Tal i sprogets format
function numLocale() { return window.CW_LANG === "en" ? "en-GB" : "da-DK"; }

// ----- Criterion row -----
function CriteriaRow({ c, onChange, onRemove, canRemove, showLabels }) {
  const meta = metaFor(c.metric);
  const S = {
    height: 40, border: "1px solid var(--c-line-strong)",
    fontSize: 12, background: "#fff", color: "var(--c-ink)", outline: "none",
  };
  const Lbl = ({ children }) => showLabels
    ? <div className="field-label">{children}</div>
    : null;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 10 }}>
      <div style={{ flex: "0 0 216px" }}>
        <Lbl>{t('Kriterium')}</Lbl>
        <select value={c.metric} onChange={e => {
          const m = metaFor(e.target.value);
          onChange({ ...c, metric: e.target.value, unit: m.unit, minAmt: "" });
        }} style={{ ...S, borderRadius: 6, padding: "0 10px", width: "100%", cursor: "pointer" }}>
          {METRICS.map(m => <option key={m.k} value={m.k}>{t(m.l)}</option>)}
        </select>
      </div>

      <div>
        <Lbl>{t('Ændring')}</Lbl>
        <div style={{ display: "flex" }}>
          <select value={c.op} onChange={e => onChange({ ...c, op: e.target.value })}
            style={{ ...S, padding: "0 6px", borderRadius: "6px 0 0 6px", borderRight: "none", width: 42, cursor: "pointer", textAlign: "center" }}>
            <option value=">">{">"}</option>
            <option value="<">{"<"}</option>
          </select>
          <input type="number" value={c.val} onChange={e => onChange({ ...c, val: e.target.value })}
            style={{ ...S, borderRadius: 0, width: 110, textAlign: "right", padding: "0 8px", fontFamily: "var(--mono)" }}/>
          <div style={{ ...S, borderRadius: "0 6px 6px 0", borderLeft: "none", padding: "0 10px",
            background: "var(--c-surface-2)", color: "var(--c-text-2)", display: "flex", alignItems: "center", fontSize: 12 }}>
            {t(meta.unit)}
          </div>
        </div>
      </div>

      {meta.amtField ? (
        <div>
          <Lbl>{t('Minimumsbeløb')}</Lbl>
          <div style={{ display: "flex" }}>
            <select value={c.minAmtOp} onChange={e => onChange({ ...c, minAmtOp: e.target.value })}
              style={{ ...S, padding: "0 6px", borderRadius: "6px 0 0 6px", borderRight: "none", width: 42, cursor: "pointer" }}>
              <option value=">">{">"}</option>
              <option value="<">{"<"}</option>
            </select>
            <input type="number" value={c.minAmt} placeholder={t('valgfri')}
              onChange={e => onChange({ ...c, minAmt: e.target.value })}
              style={{ ...S, borderRadius: 0, width: 130, textAlign: "right", padding: "0 8px", fontFamily: "var(--mono)" }}/>
            <div style={{ ...S, borderRadius: "0 6px 6px 0", borderLeft: "none", padding: "0 10px",
              background: "var(--c-surface-2)", color: "var(--c-text-2)", display: "flex", alignItems: "center", fontSize: 12 }}>
              {t('kr.')}
            </div>
          </div>
        </div>
      ) : null}

      <button type="button" className="btn-ghost-sm" onClick={onRemove} style={{ alignSelf: "flex-end", marginBottom: 7, flexShrink: 0 }}
        aria-label={t('Fjern kriterium') + ': ' + t(meta.l)}>
        {t('Fjern')}
      </button>
    </div>
  );
}

// ----- AND/OR toggle -----
function JoinToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--c-line-2)" }}/>
      <button type="button" className="btn-ghost-sm" onClick={() => onChange(value === "AND" ? "OR" : "AND")}
        title={t('Skift mellem og og eller')}>
        {value === "AND" ? t('og') : t('eller')}
      </button>
      <div style={{ flex: 1, height: 1, background: "var(--c-line-2)" }}/>
    </div>
  );
}

// ----- Chip summary -----
function fmtVal(val, unit) {
  const n = Number(val);
  if (isNaN(n)) return val;
  return unit === "kr." ? n.toLocaleString(numLocale()) : n.toLocaleString(numLocale(), { maximumFractionDigits: 2 });
}

function ChipSummary({ c, onRemove }) {
  const m = metaFor(c.metric);
  const parts = [t(m.l) + " " + c.op + " " + fmtVal(c.val, m.unit) + " " + t(m.unit)];
  if (m.amtField && c.minAmt !== "") parts.push(t('og') + " " + c.minAmtOp + " " + Number(c.minAmt).toLocaleString(numLocale()) + " " + t('kr.'));
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "var(--c-surface-2)", border: "1px solid var(--c-line)",
      borderRadius: 99, padding: "3px 5px 3px 11px", fontSize: 12.5, color: "var(--c-text-2)",
      whiteSpace: "nowrap",
    }}>
      {parts.join(" ")}
      <button type="button" onClick={onRemove} className="hit24" aria-label={t('Fjern kriterium') + ': ' + t(m.l)} style={{
        width: 18, height: 18, border: 0, borderRadius: 99, background: "var(--c-line)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-text-2)", flexShrink: 0,
      }}>
        <I.X size={9}/>
      </button>
    </span>
  );
}

// ----- Sortable header -----
// Overskriften er en knap (kan nås med Tab) og fortæller sorteringen via aria-sort.
// Teksten må bryde over to linjer, så smalle kolonner ikke løber ind i hinanden.
function SortTh({ col, label, title, align, sortCol, sortDir, onSort, width }) {
  const active = sortCol === col;
  return (
    <th title={title} scope="col"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      style={{ textAlign: align || "left", userSelect: "none", whiteSpace: "normal", verticalAlign: "bottom", lineHeight: 1.25, padding: "8px 7px", width }}>
      <button type="button" className="th-sort" onClick={() => onSort(col)}
        style={{ justifyContent: align === "right" ? "flex-end" : "flex-start", textAlign: align || "left" }}>
        <span>{label}</span>
        {active && (
          <span aria-hidden="true" style={{ color: "var(--c-ink)", fontSize: 9, flexShrink: 0 }}>
            {sortDir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </button>
    </th>
  );
}

// ----- Main component -----
function PortfolioAnalyse({ go }) {
  const caseVersion = CW.useCase(); // nye sager og omfordelinger slår straks igennem
  // Valgt skabelon, afdeling og branche huskes, når man går til en sag og tilbage
  const saved = React.useMemo(() => DATA.viewGet(ANALYSE_VIEW) || {}, []);
  const savedTpl = saved.template ? TEMPLATES.find(x => x.label === saved.template) : null;
  const tplCriteria = (tpl) => tpl.criteria.map(c => ({ ...makeCrit(c.metric), op: c.op, val: c.val, joinNext: c.joinNext || "AND" }));
  const [dept, setDept]           = React.useState(saved.dept || "alle");
  const [branche, setBranche]     = React.useState(saved.branche || "alle");
  const [criteria, setCriteria]   = React.useState(() => (savedTpl ? tplCriteria(savedTpl) : []));
  const [activeTemplate, setActiveTemplate] = React.useState(savedTpl ? savedTpl.label : null);
  const [advOpen, setAdvOpen]     = React.useState(false);
  const [sortCol, setSortCol]     = React.useState(saved.sortCol || "rev12");
  const [sortDir, setSortDir]     = React.useState(saved.sortDir || "desc");
  // Gem først, når visningen ændres (ikke ved indlæsning), så en ren demo forbliver ren
  const viewMounted = React.useRef(false);
  React.useEffect(() => {
    if (!viewMounted.current) { viewMounted.current = true; return; }
    DATA.viewSet(ANALYSE_VIEW, { template: activeTemplate, dept, branche, sortCol, sortDir });
  }, [activeTemplate, dept, branche, sortCol, sortDir]);

  // Søgningen er lokal og hurtig, så resultatet regnes med det samme (ingen falsk ventetid)
  const results = React.useMemo(() => runQuery(dept, branche, criteria), [dept, branche, criteria]);

  const onSort = (col) => {
    setSortCol(col);
    setSortDir(prev => col === sortCol && prev === "desc" ? "asc" : "desc");
  };

  const sorted = React.useMemo(() => {
    // Sag og ansvarlig kommer fra sagsmodellen (følger omfordelinger og nye sager fra Ny sag)
    const rows = results.map(r => {
      const c = analyseCaseFor(r);
      return { ...r, caseId: c ? c.id : null, caseNr: c ? c.caseNr : '', owner: c ? c.responsible : '', caseStatus: c ? c.statusKey : null };
    });
    return rows.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      const cmp = typeof av === "string" ? av.localeCompare(bv, "da") : (av ?? 0) - (bv ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [results, sortCol, sortDir, caseVersion]);

  // Retter man i kriterierne, er det ikke længere skabelonen, men egne kriterier
  const edit    = (fn) => { setCriteria(fn); setActiveTemplate(null); };
  const update  = (id, updated) => edit(prev => prev.map(c => c.id === id ? updated : c));
  const remove  = (id)          => edit(prev => prev.filter(c => c.id !== id));
  const add     = ()            => edit(prev => [...prev, makeCrit("revPct")]);
  const setJoin = (id, val)     => edit(prev => prev.map(c => c.id === id ? { ...c, joinNext: val } : c));

  const reset = () => {
    setDept("alle"); setBranche("alle");
    setCriteria([]);
    setActiveTemplate(null);
  };
  const pickTemplate = (v) => {
    if (v === 'none') { setActiveTemplate(null); setCriteria([]); return; }
    const tpl = TEMPLATES.find(x => x.label === v);
    if (tpl) { setCriteria(tplCriteria(tpl)); setActiveTemplate(tpl.label); }
  };

  const depts    = [...new Set(ANALYSE_CASES.map(r => r.dept))];
  const branches = [...new Set(ANALYSE_CASES.map(r => r.branche))].sort((a, b) => a.localeCompare(b, "da"));
  const own = !activeTemplate && criteria.length > 0;
  const tplValue = activeTemplate || (own ? 'custom' : 'none');
  const tplOptions = [{ v: 'none', l: t('Ingen') }]
    .concat(own ? [{ v: 'custom', l: t('Egne kriterier') }] : [])
    .concat(TEMPLATES.map(x => ({ v: x.label, l: t(x.label), group: t(TEMPLATE_GROUPS[x.group]) })));
  const anyFilter = dept !== "alle" || branche !== "alle" || criteria.length > 0;

  return (
    <>
      <Topbar crumbs={[t('Porteføljeanalyse')]} right={null}/>

      <div className="scroll">
        <div className="page page-wide" style={{ maxWidth: 1360, padding: "20px 28px 80px" }}>

          <div style={{ marginBottom: 18 }}>
            <h1 className="page-title">{t('Porteføljeanalyse')}</h1>
            <div className="page-sub">{t('Find kunder på tværs af porteføljen ud fra finansielle kriterier')}</div>
          </div>

          {/* Filtre: tre vælgere på én linje; Nulstil kun når noget er valgt */}
          <div className="an-filters">
            <FilterDropdown label={t('Skabelon')} value={tplValue} onChange={pickTemplate} options={tplOptions} neutral/>
            <FilterDropdown label={t('Afdeling')} value={dept} onChange={setDept} neutral
              options={[{ v: 'alle', l: t('Alle') }].concat(depts.map(d => ({ v: d, l: d })))}/>
            <FilterDropdown label={t('Branche')} value={branche} onChange={setBranche} neutral
              options={[{ v: 'alle', l: t('Alle') }].concat(branches.map(b => ({ v: b, l: t(b) })))}/>
            {anyFilter && <button type="button" className="btn-ghost-sm" onClick={reset}>{t('Nulstil')}</button>}
          </div>

          {/* Den valgte skabelons (eller egne) kriterier som grå chips */}
          {criteria.length > 0 && !advOpen && (
            <div className="an-chips" role="group" aria-label={t('Aktive kriterier')}>
              {criteria.map((c, i) => (
                <React.Fragment key={c.id}>
                  <ChipSummary c={c} onRemove={() => remove(c.id)}/>
                  {i < criteria.length - 1 && (
                    <span style={{ fontSize: 12, color: "var(--c-text-3)" }}>{c.joinNext === "AND" ? t('og') : t('eller')}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Egne kriterier */}
          <CWFold id="cw-an-criteria" className="an-fold" label={t('Egne kriterier')} count={criteria.length || undefined} open={advOpen} onToggle={setAdvOpen}>
            {criteria.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--c-text-3)", margin: "0 0 8px" }}>
                {t('Ingen aktive kriterier. Tilføj et kriterium for at filtrere manuelt.')}
              </div>
            )}
            {criteria.map((c, i) => (
              <React.Fragment key={c.id}>
                <CriteriaRow
                  c={c}
                  onChange={updated => update(c.id, updated)}
                  onRemove={() => remove(c.id)}
                  canRemove={true}
                  showLabels={i === 0}
                />
                {i < criteria.length - 1 && (
                  <JoinToggle value={c.joinNext} onChange={val => setJoin(c.id, val)}/>
                )}
              </React.Fragment>
            ))}
            <div style={{ marginTop: criteria.length > 0 ? 10 : 0 }}>
              <button type="button" className="btn-ghost-sm" onClick={add}>
                <I.Plus size={12} aria-hidden="true"/> {t('Tilføj kriterium')}
              </button>
            </div>
          </CWFold>

          {/* Resultater */}
          {results.length === 0 ? (
            <div className="card" style={{ padding: "18px 20px" }}>
              <p className="list-empty" style={{ margin: 0 }}>{t('Ingen kunder matcher de valgte kriterier. Prøv at justere tærskelværdierne.')}</p>
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-head">
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--c-ink)" }}>{t('Kunder i porteføljen')}</h2>
                  <span style={{ fontSize: 12.5, color: "var(--c-text-3)" }} aria-live="polite">
                    {results.length} {t('af')} {ANALYSE_CASES.length}
                  </span>
                </div>
              </div>
              {/* Mindst 960 px: kolonnerne får plads til tal som 61.300.000 og 45 %.
                  Er siden smallere (fx 1024 px skærm), ruller tabellen vandret. */}
              <div style={{ overflowX: "auto" }} role="region" aria-label={t('Kunder i porteføljen')} tabIndex={0}>
              <table className="tbl" style={{ tableLayout: "fixed", width: "100%", minWidth: 960, fontSize: 12 }}>
                <caption className="sr-only">{t('Kunder i porteføljen')}</caption>
                <thead>
                  <tr>
                    <SortTh col="name"      label={t('Kunde')}          title={t('Virksomhedens navn og CVR')}                                          align="left"  sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="17%"/>
                    <SortTh col="caseNr"    label={t('Sag')}            title={t('Kundens åbne sag. Klik på kunden for at åbne den.')} align="left" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="11%"/>
                    <SortTh col="owner"     label={t('Ansvarlig')}      title={t('Rådgiveren, der ejer sagen')} align="left" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="8%"/>
                    <SortTh col="dept"      label={t('Afdeling')}       title={t('Ansvarlig afdeling')}                                                 align="left"  sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="9%"/>
                    <SortTh col="branche"   label={t('Branche')}        title={t('Branche / sektor')}                                                   align="left"  sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="9%"/>
                    <SortTh col="rev12"     label={t('Omsætning')}      title={t('Omsætning seneste 12 mdr. (kr.). For Nordhavn: nettoomsætning 2025 fra årsrapporten.')} align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="9%"/>
                    <SortTh col="revPct"    label={t('Oms. vækst')}     title={t('Omsætningsvækst i % - seneste 12 mdr. ift. foregående 12 mdr.')}      align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="6%"/>
                    <SortTh col="ebitda12"  label="EBITDA"              title={t('EBITDA seneste 12 mdr. (kr.)')}                                        align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="9%"/>
                    <SortTh col="ebitdaPct" label={t('EBITDA-vækst')}   title={t('EBITDA-ændring i % - seneste 12 mdr. ift. foregående 12 mdr.')}       align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="6%"/>
                    <SortTh col="equity"    label={t('Egenkapital')}    title={t('Bogført egenkapital, seneste regnskab (kr.)')}                         align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="9%"/>
                    <SortTh col="bigCust"   label={t('Største kunde')}  title={t('Andel af omsætningen fra den største enkeltkunde, seneste regnskabsår (%)')} align="right" sortCol={sortCol} sortDir={sortDir} onSort={onSort} width="7%"/>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r => {
                    const td = { padding: "9px 7px", fontSize: 12 };
                    const filled = !!r.caseId;
                    // Kun negative tal er røde, uden fed
                    const neg = (v) => (v < 0 ? { color: "var(--c-danger)" } : null);
                    return (
                      <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => openAnalyseRow(r, go)}>
                        <td style={{ ...td, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }} title={r.name + ' (CVR ' + r.cvr + ')'}>
                          {/* Navnet er en knap, så rækken kan åbnes med tastaturet */}
                          <button type="button" className="th-sort" onClick={(e) => { e.stopPropagation(); openAnalyseRow(r, go); }}
                            aria-label={r.name + (filled ? ', ' + t('åbn sag') + ' ' + r.caseNr : ', ' + t('ingen åben sag, opret en ny sag'))}
                            style={{ fontWeight: 500, color: "var(--c-ink)", display: "block", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.name}
                          </button>
                          <span style={{ display: "block", color: "var(--c-text-3)", fontSize: 12, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis" }}><span className="mono">CVR {r.cvr}</span>{r.period ? ' · ' + t(r.period) : ''}</span>
                        </td>
                        <td style={{ ...td, overflow: "hidden", maxWidth: 0 }}>
                          {filled ? (
                            <>
                              <span className="mono" style={{ display: "block", color: "var(--c-text-2)" }}>{r.caseNr}</span>
                              <span style={{ display: "block", marginTop: 1, fontSize: 12, color: "var(--c-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{DATA.STATUS[r.caseStatus] ? t(DATA.STATUS[r.caseStatus].label) : ''}</span>
                            </>
                          ) : <span style={{ color: "var(--c-text-3)" }} title={t('Klik for at oprette en sag til kunden')}>{t('Ingen sag')}</span>}
                        </td>
                        <td style={{ ...td, color: "var(--c-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>{r.owner || '-'}</td>
                        <td style={{ ...td, color: "var(--c-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }} title={r.dept}>{r.dept}</td>
                        <td title={t(r.branche)} style={{ ...td, color: "var(--c-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>{t(r.branche)}</td>
                        <td className="mono num" style={{ ...td, textAlign: "right" }}>{fmt(r.rev12)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{pct(r.revPct)}</td>
                        <td className="mono num" style={{ ...td, textAlign: "right", ...neg(r.ebitda12) }}>{fmt(r.ebitda12)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{pct(r.ebitdaPct)}</td>
                        <td className="mono num" style={{ ...td, textAlign: "right", ...neg(r.equity) }}>{fmt(r.equity)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{r.bigCust}{pctSign()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--c-line-2)", fontSize: 12, color: "var(--c-text-3)" }}>
                {t('Beløb i kr., seneste 12 måneder.')}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

window.PortfolioAnalyse = PortfolioAnalyse;
