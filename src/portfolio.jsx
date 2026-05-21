// Sager — task-focused workflow inbox
function statusPill(s) {
  const map = {
    "Draft": ["outline", "Draft"],
    "Waiting for customer": ["warn", "Afventer kunde"],
    "Data received": ["info", "Data modtaget"],
    "Needs review": ["ink", "Til gennemgang"],
    "Credit memo ready": ["success", "Memo klar"],
    "Approved": ["success", "Godkendt"],
    "Rejected": ["danger", "Afvist"],
  };
  const [klass, label] = map[s] || ["outline", s];
  return <span className={"pill " + klass}><span className="pill-dot"/>{label}</span>;
}

// Task definitions per case (each case has multiple specific tasks)
const CASE_TASKS = {
  1: [
    { id: "a", action: "Gennemgå", obj: "AI findings (3 åbne)", urgent: true, due: "i dag", kind: "review" },
    { id: "b", action: "Send", obj: "4 spørgsmål til kunde", urgent: true, due: "i dag", kind: "send" },
    { id: "c", action: "Vurder", obj: "budgetafvigelse juli (+25,0%)", urgent: false, due: "29 maj", kind: "review" },
  ],
  2: [
    { id: "a", action: "Påmind", obj: "kunde — 4 dokumenter mangler", urgent: true, due: "forsinket 2 dage", kind: "remind" },
  ],
  3: [
    { id: "a", action: "Gennemgå", obj: "modtaget materiale", urgent: false, due: "31 maj", kind: "review" },
    { id: "b", action: "Indsamle", obj: "soft signals (LinkedIn, presse)", urgent: false, due: "31 maj", kind: "data" },
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
    { id: "a", action: "Påmind", obj: "kunde — 3 dokumenter mangler", urgent: false, due: "12 jun", kind: "remind" },
  ],
};

function Portfolio({ go, openNewCase }) {
  const [filter, setFilter] = React.useState("mine");

  const activeCases = DATA.CASES.filter(c => !c.archived);
  const myCases = activeCases.filter(c => c.responsible === "Mette L.");
  const totalTasks = myCases.reduce((s, c) => s + (CASE_TASKS[c.id] || []).length, 0);
  const urgentTasks = myCases.reduce((s, c) => s + (CASE_TASKS[c.id] || []).filter(t => t.urgent).length, 0);
  const completed = myCases.filter(c => (CASE_TASKS[c.id] || []).length === 0).length;

  const filters = [
    { k: "mine", l: "Afventer mig", n: myCases.filter(c => (CASE_TASKS[c.id] || []).length > 0).length },
    { k: "waiting", l: "Afventer kunde", n: activeCases.filter(c => c.status === "Waiting for customer").length },
    { k: "ready", l: "Klar til indstilling", n: activeCases.filter(c => c.status === "Credit memo ready").length },
    { k: "done", l: "Færdig (denne uge)", n: DATA.CASES.filter(c => c.archived).length },
    { k: "all", l: "Alle sager", n: activeCases.length },
  ];

  let displayCases;
  if (filter === "mine") displayCases = myCases.filter(c => (CASE_TASKS[c.id] || []).length > 0);
  else if (filter === "waiting") displayCases = activeCases.filter(c => c.status === "Waiting for customer");
  else if (filter === "ready") displayCases = activeCases.filter(c => c.status === "Credit memo ready");
  else if (filter === "done") displayCases = DATA.CASES.filter(c => c.archived);
  else displayCases = activeCases;

  // Sort by urgency: cases with urgent tasks first
  displayCases = [...displayCases].sort((a, b) => {
    const ua = (CASE_TASKS[a.id] || []).filter(t => t.urgent).length;
    const ub = (CASE_TASKS[b.id] || []).filter(t => t.urgent).length;
    return ub - ua;
  });

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
                {totalTasks === 0 ? "Alle opgaver klaret — godt arbejde 🎉"
                  : <>Du har <b style={{ color: 'var(--c-ink)' }}>{totalTasks} opgaver</b> fordelt på <b style={{ color: 'var(--c-ink)' }}>{myCases.filter(c => (CASE_TASKS[c.id] || []).length > 0).length} sager</b>{urgentTasks > 0 && <> · <span style={{ color: 'var(--c-warn)' }}>{urgentTasks} haster i dag</span></>}</>}
              </div>
            </div>
          </div>

          {/* "Mod nul"-bar */}
          <div className="card" style={{ marginBottom: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
              <svg width="56" height="56" viewBox="0 0 56 56" style={{ display: 'block' }}>
                <circle cx="28" cy="28" r="22" fill="none" stroke="var(--c-line-2)" strokeWidth="4"/>
                <circle cx="28" cy="28" r="22" fill="none" stroke="var(--c-primary)" strokeWidth="4"
                  strokeDasharray={`${(completed / Math.max(1, myCases.length)) * 138} 138`} transform="rotate(-90 28 28)" strokeLinecap="round"/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, lineHeight: 1, color: 'var(--c-ink)', pointerEvents: 'none' }} className="mono num">{completed}/{myCases.length}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>
                {totalTasks === 0 ? "Alle dine sager er ajour" : `Nå til 0 — så er du færdig for i dag`}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 2 }}>
                {totalTasks > 0
                  ? <>{completed} sager er klaret · {myCases.length - completed} har stadig åbne opgaver</>
                  : "Tag en kop kaffe — eller åbn en ny sag"}
              </div>
            </div>
            {urgentTasks > 0 && (
              <div style={{ padding: '6px 12px', background: 'var(--c-warn-bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--c-warn)', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                <I.AlertCircle size={13}/> {urgentTasks} haster
              </div>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid var(--c-line)' }}>
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

          {/* Cases as task-cards */}
          {displayCases.length === 0 ? (
            <div className="card empty">
              <I.Check className="ic"/>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-ink)' }}>Ingen opgaver her</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Du kan skifte filter ovenfor for at se andre sager</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayCases.map(c => <CaseTaskCard key={c.id} c={c} tasks={CASE_TASKS[c.id] || []} go={go}/>)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CaseTaskCard({ c, tasks, go }) {
  const urgent = tasks.filter(t => t.urgent).length;
  const isEmpty = tasks.length === 0;
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div onClick={() => go("workspace:" + c.id)}
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, borderBottom: tasks.length > 0 ? '1px solid var(--c-line-2)' : 'none' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 12, color: 'var(--c-text-2)', flexShrink: 0 }}>
          {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>{c.name}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--c-text-3)' }}>CVR {c.cvr}</span>
            {statusPill(c.status)}
            {c.pinned && <I.Pin size={11} style={{ color: 'var(--c-text-3)' }}/>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 3 }}>
            {c.type} · <span className="mono">{c.amount}</span> · ansvarlig {c.responsible} · senest {c.lastActivity}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isEmpty ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--c-success)', fontSize: 12.5, fontWeight: 500 }}>
              <I.Check size={13}/> Færdig
            </span>
          ) : (
            <>
              {urgent > 0 && <span style={{ padding: '2px 8px', background: 'var(--c-warn-bg)', color: 'var(--c-warn)', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{urgent} haster</span>}
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-text-2)' }}>
                <b style={{ color: 'var(--c-ink)', fontSize: 14 }}>{tasks.length}</b> {tasks.length === 1 ? "opgave" : "opgaver"}
              </span>
            </>
          )}
          <I.ChevronRight size={14} style={{ color: 'var(--c-text-3)' }}/>
        </div>
      </div>

      {tasks.length > 0 && (
        <div>
          {tasks.map((t, i) => (
            <CaseTaskRow key={t.id} task={t} isLast={i === tasks.length - 1} go={go} caseId={c.id}/>
          ))}
        </div>
      )}
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
      padding: '10px 18px 10px 60px',
      display: 'flex', alignItems: 'center', gap: 12,
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

window.Portfolio = Portfolio;
window.statusPill = statusPill;
