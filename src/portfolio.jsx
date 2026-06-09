// Sager - task-focused workflow inbox
function statusPill(s) {
  const map = {
    "Draft": ["outline", "Draft"],
    "Waiting for customer": ["warn", "Afventer kunde"],
    "Data received": ["ink", "Til gennemgang"],
    "Needs review": ["ink", "Til gennemgang"],
    "Credit memo ready": ["success", "Memo klar"],
    "Indstillet": ["success", "Indstillet"],
    "Approved": ["success", "Godkendt"],
    "Rejected": ["danger", "Afvist"],
  };
  const [klass, label] = map[s] || ["outline", s];
  return <span className={"pill " + klass}><span className="pill-dot"/>{label}</span>;
}

// Sub-stage label shown next to the status pill — tells the advisor *how far* we've gotten.
function stageLabel(s) {
  if (s === "Needs review") return "Indhentet offentligt data";
  if (s === "Data received") return "Indhentet kundedata";
  return null;
}

// Task definitions per case (each case has multiple specific tasks)
const CASE_TASKS = {
  1: [
    { id: "a", action: "Gennemgå", obj: "findings (3 åbne)", urgent: true, due: "i dag", kind: "review" },
    { id: "b", action: "Send", obj: "4 spørgsmål til kunde", urgent: true, due: "i dag", kind: "send" },
    { id: "c", action: "Vurder", obj: "budgetafvigelse juli (+25,0%)", urgent: false, due: "29 maj", kind: "review" },
  ],
  2: [
    { id: "a", action: "Påmind", obj: "kunde - 4 dokumenter mangler", urgent: true, due: "forsinket 2 dage", kind: "remind" },
  ],
  3: [
    { id: "a", action: "Gennemgå", obj: "modtaget materiale", urgent: false, due: "31 maj", kind: "review" },
    { id: "b", action: "Indsamle", obj: "soft signals (Trustpilot, hjemmeside, presse)", urgent: false, due: "31 maj", kind: "data" },
  ],
  4: [
    { id: "a", action: "Indsend", obj: "credit memo til komite", urgent: false, due: "27 maj", kind: "submit" },
  ],
  5: [
    { id: "a", action: "Afklare", obj: "negativ egenkapital (note 8)", urgent: true, due: "forsinket 1 dag", kind: "review" },
    { id: "b", action: "Bekræft", obj: "stiftet kaution fra ejer", urgent: true, due: "i dag", kind: "review" },
    { id: "c", action: "Genberegn", obj: "gæld/EBITDA efter ny periode", urgent: false, due: "02 jun", kind: "review" },
    { id: "d", action: "Skriv", obj: "anbefaling (memo §12)", urgent: false, due: "02 jun", kind: "write" },
  ],
  6: [],
  7: [],
  8: [
    { id: "a", action: "Påmind", obj: "kunde - 3 dokumenter mangler", urgent: false, due: "12 jun", kind: "remind" },
  ],
};

// Status grouping for "Alle sager" - open categories first, closed last
const ALL_STATUS_GROUPS = [
  { key: "Needs review",         label: "Til gennemgang",   open: true },
  { key: "Waiting for customer", label: "Afventer kunde",   open: true },
  { key: "Data received",        label: "Data modtaget",    open: true },
  { key: "Draft",                label: "Kladde",           open: true },
  { key: "Credit memo ready",    label: "Memo klar",        open: false },
  { key: "Approved",             label: "Godkendt",         open: false },
  { key: "Rejected",             label: "Afvist",           open: false },
  { key: "__archived",           label: "Arkiveret",        open: false, archivedFlag: true },
];

function Portfolio({ go, openNewCase }) {
  const [filter, setFilter] = React.useState("mine");
  const [search, setSearch] = React.useState("");
  const [collapsed, setCollapsed] = React.useState({}); // group.key -> bool (true = manually collapsed)

  const activeCases = DATA.CASES.filter(c => !c.archived);
  const myCases = activeCases.filter(c => c.responsible === "Mette L.");
  const totalTasks = myCases.reduce((s, c) => s + (CASE_TASKS[c.id] || []).length, 0);
  const urgentTasks = myCases.reduce((s, c) => s + (CASE_TASKS[c.id] || []).filter(t => t.urgent).length, 0);
  const completed = myCases.filter(c => (CASE_TASKS[c.id] || []).length === 0).length;

  const matchesFilters = (c) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !String(c.cvr).toLowerCase().includes(q)) return false;
    }
    return true;
  };

  const filters = [
    { k: "mine", l: "Afventer mig", n: myCases.filter(c => (CASE_TASKS[c.id] || []).length > 0).length },
    { k: "waiting", l: "Afventer kunde", n: activeCases.filter(c => c.status === "Waiting for customer").length },
    { k: "ready", l: "Klar til indstilling", n: activeCases.filter(c => c.status === "Credit memo ready").length },
    { k: "done", l: "Færdig (denne uge)", n: DATA.CASES.filter(c => c.archived).length },
    { k: "all", l: "Alle sager", n: DATA.CASES.length },
  ];

  let displayCases;
  if (filter === "mine") displayCases = myCases.filter(c => (CASE_TASKS[c.id] || []).length > 0);
  else if (filter === "waiting") displayCases = activeCases.filter(c => c.status === "Waiting for customer");
  else if (filter === "ready") displayCases = activeCases.filter(c => c.status === "Credit memo ready");
  else if (filter === "done") displayCases = DATA.CASES.filter(c => c.archived);
  else displayCases = DATA.CASES; // "all" includes archived (shown in a separate group)

  displayCases = displayCases.filter(matchesFilters);

  // Sort by urgency: cases with urgent tasks first, then by missing material
  displayCases = [...displayCases].sort((a, b) => {
    const ua = (CASE_TASKS[a.id] || []).filter(t => t.urgent).length;
    const ub = (CASE_TASKS[b.id] || []).filter(t => t.urgent).length;
    if (ub !== ua) return ub - ua;
    return (b.missing || 0) - (a.missing || 0);
  });

  // For "all" view: group by status, open categories first.
  let groupedForAll = null;
  if (filter === "all") {
    groupedForAll = ALL_STATUS_GROUPS
      .map(g => ({
        ...g,
        cases: displayCases.filter(c => g.archivedFlag ? c.archived : (!c.archived && c.status === g.key)),
      }))
      .filter(g => g.cases.length > 0);
  }

  const hasActiveFilter = search !== "";
  const allDone = filter === "mine" && totalTasks === 0;

  return (
    <>
      <Topbar crumbs={["Mine opgaver"]} right={
        <>
          <button className="btn btn-sm"><I.Download className="ic"/> Eksport</button>
          <button className="btn btn-sm btn-primary" onClick={openNewCase}><I.Plus className="ic"/> Ny sag</button>
        </>
      }/>
      <div className="scroll">
        <div className="page" style={{ maxWidth: 1100 }}>
          <div className="page-head">
            <div>
              <h1 className="page-title">Mine opgaver</h1>
              <div className="page-sub">
                {(() => {
                  const n = myCases.filter(c => (CASE_TASKS[c.id] || []).length > 0).length;
                  if (n === 0) return "Alle sager er ajour - godt arbejde 🎉";
                  return <><b style={{ color: 'var(--c-ink)' }}>{n} sager</b> mangler action fra dig</>;
                })()}
              </div>
            </div>
          </div>


          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--c-line)' }}>
            {filters.map(f => (
              <button key={f.k}
                onClick={() => setFilter(f.k)}
                style={{
                  padding: '8px 12px', marginBottom: -1, border: 'none', background: 'transparent',
                  borderBottom: filter === f.k ? '2px solid var(--c-primary)' : '2px solid transparent',
                  color: filter === f.k ? 'var(--c-primary)' : 'var(--c-text-2)',
                  fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                {f.l}
                <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontVariantNumeric: 'tabular-nums' }}>{f.n}</span>
              </button>
            ))}
          </div>

          {/* Filter bar - works on all tabs */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap',
          }}>
            <div style={{
              position: 'relative', flex: '1 1 240px', minWidth: 200, maxWidth: 360,
            }}>
              <I.Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', pointerEvents: 'none' }}/>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søg på virksomhed eller CVR"
                aria-label="Søg sager"
                style={{
                  width: '100%', height: 32, padding: '0 30px 0 30px',
                  border: '1px solid var(--c-line)', borderRadius: 6,
                  fontSize: 13, background: '#fff', color: 'var(--c-ink)',
                  outline: 'none',
                }}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Ryd søgning"
                  onClick={() => setSearch("")}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    width: 20, height: 20, borderRadius: 4, border: 0, background: 'transparent',
                    cursor: 'pointer', color: 'var(--c-text-3)', display: 'grid', placeItems: 'center',
                  }}
                >
                  <I.X size={12}/>
                </button>
              )}
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  height: 32, padding: '0 10px', border: 0, background: 'transparent',
                  color: 'var(--c-primary)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Ryd søgning
              </button>
            )}

            <div style={{ flex: 1 }}/>
            <div style={{ fontSize: 12, color: 'var(--c-text-3)', whiteSpace: 'nowrap' }}>
              {displayCases.length} {displayCases.length === 1 ? 'sag' : 'sager'}
            </div>
          </div>

          {/* Cases */}
          {displayCases.length === 0 ? (
            <div className="card empty">
              <I.Check className="ic"/>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-ink)' }}>
                {hasActiveFilter ? "Ingen sager matcher filtrene" : "Ingen opgaver her"}
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {hasActiveFilter ? "Prøv at justere søgning eller filtre" : "Du kan skifte filter ovenfor for at se andre sager"}
              </div>
            </div>
          ) : groupedForAll ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {groupedForAll.map(grp => {
                const isCollapsed = collapsed[grp.key] != null ? collapsed[grp.key] : !grp.open;
                return (
                  <section key={grp.key}>
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() => setCollapsed(s => ({ ...s, [grp.key]: !isCollapsed }))}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0 10px', marginBottom: 10,
                        background: 'transparent', border: 0, borderBottom: '1px solid var(--c-line)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <I.ChevronDown size={13} style={{
                        color: 'var(--c-text-3)',
                        transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                        transition: 'transform .15s ease',
                      }}/>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.005em' }}>
                        {grp.label}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 500, color: 'var(--c-text-2)',
                        background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
                        padding: '1px 7px', borderRadius: 999,
                      }}>
                        {grp.cases.length}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'stretch' }}>
                        {grp.cases.map(c => <CaseTaskCard key={c.id} c={c} tasks={CASE_TASKS[c.id] || []} go={go}/>)}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'stretch' }}>
              {displayCases.map(c => <CaseTaskCard key={c.id} c={c} tasks={CASE_TASKS[c.id] || []} go={go}/>)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CaseTaskCard({ c, tasks, go }) {
  const isEmpty = tasks.length === 0;
  return (
    <div
      className="card"
      onClick={() => go("workspace:" + c.id)}
      style={{
        height: '100%',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 7,
        background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
        display: 'grid', placeItems: 'center',
        fontWeight: 600, fontSize: 11, color: 'var(--c-text-2)',
        flexShrink: 0,
      }}>
        {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{c.name}</span>
          <span style={{ flexShrink: 0 }}>{statusPill(c.status)}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stageLabel(c.status) && <><span style={{ color: 'var(--c-text-2)', fontWeight: 500 }}>{stageLabel(c.status)}</span> · </>}
          <span className="mono">CVR {c.cvr}</span> · {c.type} · <span className="mono">{c.amount}</span> · {c.lastActivity}
        </div>
      </div>
      {isEmpty && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--c-success)', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>
          <I.Check size={12}/> Færdig
        </span>
      )}
      <I.ChevronRight size={14} style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
    </div>
  );
}

function CaseTaskRow({ task, isLast, go, caseId }) {
  const [done, setDone] = React.useState(false);

  const kindIcon = {
    review: <I.Eye size={11}/>,
    send: <I.Send size={11}/>,
    remind: <I.Bell size={11}/>,
    data: <I.Database size={11}/>,
    submit: <I.ArrowRight size={11}/>,
    write: <I.Edit size={11}/>,
  };

  return (
    <div style={{
      padding: '9px 14px 9px 52px',
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: isLast ? 'none' : '1px solid var(--c-line-2)',
      background: done ? 'var(--c-success-bg)' : 'transparent',
      transition: 'background 200ms',
    }}>
      <button onClick={() => setDone(!done)}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          border: done ? 'none' : '1.5px solid var(--c-line-strong)',
          background: done ? 'var(--c-success)' : '#fff',
          padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
        {done && <I.Check size={11} style={{ color: '#fff' }}/>}
      </button>
      <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', color: 'var(--c-text-2)', flexShrink: 0 }}>
        {kindIcon[task.kind] || <I.Circle size={10}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: done ? 'var(--c-text-3)' : 'var(--c-text)', textDecoration: done ? 'line-through' : 'none' }}>
        <b style={{ fontWeight: 600 }}>{task.action}</b> {task.obj}
      </div>
      <span style={{ fontSize: 11.5, color: task.due.includes("forsinket") ? 'var(--c-danger)' : task.due === "i dag" ? 'var(--c-warn)' : 'var(--c-text-3)', fontWeight: 500 }}>
        {task.due}
      </span>
      <button className="btn btn-sm" onClick={() => go("workspace:" + caseId)}>Åbn</button>
    </div>
  );
}

function FilterDropdown({ label, value, onChange, options }) {
  const isActive = value !== 'all';
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', height: 32,
      border: '1px solid ' + (isActive ? 'var(--c-primary-border)' : 'var(--c-line)'),
      background: isActive ? 'var(--c-primary-bg)' : '#fff',
      color: isActive ? 'var(--c-primary)' : 'var(--c-text-2)',
      borderRadius: 6, padding: '0 8px 0 10px',
      fontSize: 12.5, fontWeight: 500,
      cursor: 'pointer', gap: 6,
    }}>
      <span style={{ color: isActive ? 'var(--c-primary)' : 'var(--c-text-3)' }}>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
          border: 0, background: 'transparent', font: 'inherit', color: 'inherit',
          cursor: 'pointer', paddingRight: 16, outline: 'none',
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'><path fill='%238a9099' d='M0 0h8L4 5z'/></svg>\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 2px center',
        }}
        aria-label={label}
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

window.Portfolio = Portfolio;
window.statusPill = statusPill;
window.FilterDropdown = FilterDropdown;
