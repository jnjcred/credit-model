// Case workspace shell — header + tabs + content router
function WorkspaceShell({ tab, go, openMemo }) {
  const co = DATA.COMPANY;
  const tabs = [
    { k: "overview", label: "Overblik", ic: <I.Layout className="ic"/> },
    { k: "financials", label: "Finansielt", ic: <I.BarChart className="ic"/> },
    { k: "documents", label: "Dokumenter", ic: <I.FileText className="ic"/>, badge: "12" },
    { k: "security", label: "Sikkerheder", ic: <I.Lock className="ic"/>, badge: "1" },
    { k: "questions", label: "Kundedialog", ic: <I.Help className="ic"/>, badge: "4" },
    { k: "memo", label: "Memo", ic: <I.File className="ic"/> },
  ];

  return (
    <>
      <Topbar
        crumbs={[{ label: "Mine opgaver", onClick: () => go("cases") }, co.name]}
        right={
          <>
            <button className="btn btn-sm btn-ghost"><I.Share className="ic"/> Del</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1:memo")}><I.FileText className="ic"/> Generer memo</button>
          </>
        }
      />

      <div className="ws-header">
        <div className="ws-h-row">
          <div className="ws-logo">{co.short}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="ws-co-name">{co.name}</div>
              {statusPill(co.status)}
              <span className="ai-hint" style={{ fontSize: 10.5 }}><I.Spark className="spark" size={10}/> 68% klar</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', border: '1px solid var(--c-line)', borderRadius: 999, background: 'var(--c-surface)', whiteSpace: 'nowrap' }}>
              <div className="avatar" style={{ width: 20, height: 20, fontSize: 9 }}>ML</div>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{co.responsible}</span>
            </div>
            <button className="btn btn-sm btn-primary" onClick={openMemo}>Fortsæt <I.ArrowRight className="ic"/></button>
          </div>
        </div>
      </div>

      <div className="ws-tabs">
        {tabs.map(t => (
          <button key={t.k} className={"ws-tab " + (tab === t.k ? "active" : "")} onClick={() => go("workspace:1:" + t.k)}>
            {t.ic} {t.label} {t.badge && <span className="badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="scroll">
        {tab === "overview" && <WSOverview go={go}/>}
        {tab === "financials" && <WSFinancials/>}
        {tab === "documents" && <WSDocuments/>}
        {tab === "security" && <WSSecurity/>}
        {tab === "questions" && <WSQuestions/>}
        {tab === "memo" && <WSMemo/>}
      </div>
    </>
  );
}

function WSOverview({ go }) {
  // Overall progress calculation
  const stages = [
    { id: "public", label: "Offentlige data", status: "done", pct: 100, items: ["CVR-registret", "Brancheopslag", "Soft signals", "ESG-rating"] },
    { id: "collected", label: "Indhentet materiale", status: "active", pct: 83, items: ["10 af 12 elementer modtaget"] },
    { id: "analysis", label: "Analyse", status: "active", pct: 70, items: ["Finansiel review", "Risiko-findings", "Ejer­verifikation"] },
    { id: "questions", label: "Afklaringer", status: "open", pct: 20, items: ["4 spørgsmål til kunde i kø"] },
    { id: "memo", label: "Credit memo", status: "open", pct: 68, items: ["9 af 13 sektioner udfyldt"] },
  ];
  const overall = Math.round(stages.reduce((s, x) => s + x.pct, 0) / stages.length);
  const overallTone = overall >= 80 ? 'success' : overall >= 55 ? 'primary' : overall >= 30 ? 'warn' : 'danger';

  return (
    <div className="page page-wide" style={{ maxWidth: 1080, padding: '24px 32px 80px' }}>
      {/* Company master data — Stamoplysninger */}
      <StamoplysningerCard/>

      {/* Big progress hero with color-coded % and journey */}
      <ProgressHero overall={overall} tone={overallTone} stages={stages} go={go}/>

      {/* PRIMARY — Outstanding work first, advisor-centered */}
      <SectionLead
        kind="todo"
        eyebrow="Til dig nu"
        title="Det her udestår"
        sub="Gennemgå punkterne nedenfor for at få sagen klar til indstilling."
      />
      <MissingSection go={go}/>

      {/* SECONDARY — Reference of what's already in place */}
      <SectionLead
        kind="done"
        eyebrow="Reference"
        title="Det her er på plads"
        sub="Datagrundlag og dokumenter, der allerede er indsamlet."
      />
      <CollectedDataSection go={go}/>

    </div>
  );
}

function ProgressHero({ overall, tone, stages, go }) {
  const toneColors = {
    success: { bar: 'var(--c-success)', bg: 'var(--c-success-bg)', text: 'var(--c-success)' },
    primary: { bar: 'var(--c-primary)', bg: 'var(--c-primary-bg)', text: 'var(--c-primary)' },
    warn:    { bar: 'var(--c-warn)',    bg: 'var(--c-warn-bg)',    text: 'var(--c-warn)' },
    danger:  { bar: 'var(--c-danger)',  bg: 'var(--c-danger-bg)',  text: 'var(--c-danger)' },
  };
  const T = toneColors[tone];
  const verbal = overall >= 80 ? "næsten klar til indstilling"
    : overall >= 55 ? "godt på vej — få ting tilbage"
    : overall >= 30 ? "halvvejs — flere afklaringer mangler"
    : "tidlig fase — meget data mangler";

  return (
    <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '22px 26px 20px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: T.text, letterSpacing: '-0.04em', lineHeight: 1 }} className="mono num">{overall}<span style={{ fontSize: 28, fontWeight: 500 }}>%</span></div>
          <div style={{ marginTop: 4, padding: '3px 9px', background: T.bg, color: T.text, borderRadius: 999, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            {tone === 'success' ? 'Klar' : tone === 'primary' ? 'Godt på vej' : tone === 'warn' ? 'Halvvejs' : 'Tidlig fase'}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em' }}>Sagen er {verbal}</div>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.55 }}>
            Vi har samlet det meste offentlige data og det vigtigste fra kunden. <b style={{ color: 'var(--c-ink)' }}>Forespørg de 4 afklaringer</b> og send påmindelse om sikkerheds­dokumenter — så er du oppe på <b style={{ color: 'var(--c-ink)' }}>92%</b>.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => go("workspace:1:questions")}>Forespørg afklaringer <I.ArrowRight className="ic"/></button>
            <button className="btn" onClick={() => go("workspace:1")}>Påmind kunde</button>
          </div>
        </div>
      </div>

      {/* Stage stations */}
      <div style={{ padding: '0 0 0 0', background: 'var(--c-surface-2)', borderTop: '1px solid var(--c-line)' }}>
        <div style={{ display: 'flex', position: 'relative' }}>
          {/* Connecting line */}
          <div style={{ position: 'absolute', top: 30, left: 'calc(10% + 12px)', right: 'calc(10% + 12px)', height: 1, background: 'var(--c-line-strong)' }}/>
          {stages.map((s, i) => {
            const isDone = s.pct >= 95;
            const stageColor = isDone ? 'var(--c-success)' : 'var(--c-primary)';
            return (
              <div key={s.id} style={{ flex: 1, padding: '14px 14px 16px', textAlign: 'center', position: 'relative', cursor: 'pointer' }}
                onClick={() => s.id !== 'public' && go("workspace:1:" + (s.id === 'collected' ? 'collection' : s.id === 'analysis' ? 'findings' : s.id))}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: isDone ? 'var(--c-success)' : '#fff', border: '2px solid ' + stageColor, margin: '0 auto', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 1 }}>
                  {isDone
                    ? <I.Check size={12} style={{ color: '#fff' }}/>
                    : <span style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: stageColor }}/>}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, marginTop: 8, color: 'var(--c-ink)' }}>{s.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', marginTop: 2, lineHeight: 1.3 }}>{s.items[0]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActionRow({ a, go }) {
  const sevColor = a.sev === 'high' ? 'var(--c-warn)' : a.sev === 'med' ? 'var(--c-primary)' : 'var(--c-text-3)';
  const [done, setDone] = React.useState(false);
  return (
    <div style={{
      padding: '12px 14px',
      border: '1px solid var(--c-line)',
      borderRadius: 8,
      background: done ? 'var(--c-success-bg)' : '#fff',
      display: 'flex', alignItems: 'center', gap: 14,
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
      <div style={{ width: 4, alignSelf: 'stretch', background: sevColor, borderRadius: 2, flexShrink: 0 }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: done ? 'var(--c-text-3)' : 'var(--c-ink)', textDecoration: done ? 'line-through' : 'none' }}>{a.t}</div>
        <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>{a.w}</div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', textAlign: 'right', flexShrink: 0 }}>
        <div style={{ color: 'var(--c-text-2)', fontWeight: 500 }}>{a.impact}</div>
      </div>
      <button className="btn btn-sm btn-primary" onClick={() => go(a.to)} style={{ flexShrink: 0 }}>{a.action}</button>
    </div>
  );
}

function ExpandSection({ icon, title, summary, badge, action, children, defaultOpen, tone }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  const isSuccess = tone === 'success';
  return (
    <div className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
        {isSuccess ? (
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--c-success)',
            display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0,
          }}>
            <I.Check size={16}/>
          </div>
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
            display: 'grid', placeItems: 'center', color: 'var(--c-text-2)', flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{title}</span>
            {badge}
          </div>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)' }}>{summary}</div>
        </div>
        <div onClick={e => e.stopPropagation()}>{action}</div>
        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
          <I.ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }}/>
        </button>
      </div>
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--c-line-2)' }}>
          <div style={{ paddingTop: 14 }}>{children}</div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub, tone }) {
  const colors = {
    ink: 'var(--c-ink)',
    warn: 'var(--c-warn)',
    line: 'var(--c-text-2)',
    muted: 'var(--c-text-4)',
  };
  return (
    <div style={{ padding: '10px 14px', background: '#fff' }}>
      <div className="label-mini">{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 5, color: colors[tone] || 'var(--c-ink)', letterSpacing: '-0.01em' }} className="mono num">{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// Tiny sparkline (SVG)
function Sparkline({ data, labels, label, highlight }) {
  const w = 360, h = 80;
  const pad = 6;
  const max = Math.max(...data) * 1.1;
  const min = Math.min(...data) * 0.9;
  const x = (i) => pad + (i * (w - pad*2)) / (data.length - 1);
  const y = (v) => h - pad - ((v - min) / (max - min)) * (h - pad*2);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `M ${x(0)},${h-pad} L ${pts.split(' ').join(' L ')} L ${x(data.length-1)},${h-pad} Z`;
  return (
    <div>
      <div className="label-mini" style={{ marginBottom: 6 }}>{label}</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d={area} fill="var(--c-ink)" opacity="0.05"/>
        <polyline points={pts} fill="none" stroke="var(--c-ink)" strokeWidth="1.5"/>
        {data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="var(--c-ink)"/>)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text-3)', marginTop: 4 }}>
        {labels.map(l => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
}

// Budget vs actual chart (horizontal-bar style)
function BudgetChart({ data }) {
  const w = 560, h = 220;
  const pad = { l: 30, r: 12, t: 18, b: 30 };
  const max = Math.max(...data.map(d => Math.max(d.budget, d.actual || 0))) * 1.15;
  const cw = (w - pad.l - pad.r) / data.length;
  const x = (i) => pad.l + i * cw + cw * 0.18;
  const bw = cw * 0.32;
  const y = (v) => h - pad.b - (v / max) * (h - pad.t - pad.b);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {/* Y gridlines */}
      {[0, max * 0.5, max].map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w-pad.r} y1={y(v)} y2={y(v)} stroke="var(--c-line)" strokeWidth="1"/>
          <text x={pad.l - 5} y={y(v) + 3} fill="var(--c-text-3)" fontSize="9" textAnchor="end" fontFamily="var(--mono)">{v.toFixed(0)}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <g key={i}>
          {/* Budget bar */}
          <rect x={x(i)} y={y(d.budget)} width={bw} height={h - pad.b - y(d.budget)} fill={d.flag ? 'var(--c-warn-bg)' : '#e8e9ec'} stroke={d.flag ? 'var(--c-warn)' : 'transparent'} strokeWidth="1"/>
          {/* Actual bar */}
          {d.actual && <rect x={x(i) + bw + 2} y={y(d.actual)} width={bw} height={h - pad.b - y(d.actual)} fill="var(--c-ink)"/>}
          {d.flag && <circle cx={x(i) + bw/2} cy={y(d.budget) - 8} r="3" fill="var(--c-warn)"/>}
          <text x={x(i) + bw} y={h - pad.b + 14} fill="var(--c-text-3)" fontSize="10" textAnchor="middle">{d.month}</text>
        </g>
      ))}
      {/* Legend */}
      <g transform={`translate(${w - 170}, ${pad.t - 6})`}>
        <rect x="0" y="0" width="10" height="10" fill="#e8e9ec"/>
        <text x="14" y="9" fill="var(--c-text-2)" fontSize="10">Budget</text>
        <rect x="60" y="0" width="10" height="10" fill="var(--c-ink)"/>
        <text x="74" y="9" fill="var(--c-text-2)" fontSize="10">Realiseret</text>
        <circle cx="138" cy="5" r="3" fill="var(--c-warn)"/>
        <text x="146" y="9" fill="var(--c-text-2)" fontSize="10">Markering</text>
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Stamoplysninger — company master-data card on the Overblik tab.
   Public-source data (CVR), grouped grid, copy actions, collapsible.
   ──────────────────────────────────────────────────────────────────────── */
function StamoplysningerCard() {
  const co = DATA.COMPANY;
  const [open, setOpen] = React.useState(true);
  const [copied, setCopied] = React.useState(null);

  const copy = (key, text) => {
    if (!text) return;
    try { navigator.clipboard && navigator.clipboard.writeText(String(text)); } catch (e) {}
    setCopied(key);
    setTimeout(() => setCopied(c => (c === key ? null : c)), 1400);
  };

  const NA = <span style={{ color: 'var(--c-text-3)', fontStyle: 'italic', fontWeight: 400 }}>Ikke oplyst</span>;
  const present = (val) => val != null && val !== "" && val !== "—";
  const v = (val) => (present(val) ? val : NA);

  const cvrPlain = present(co.cvr) ? String(co.cvr).replace(/\s+/g, '') : '';
  const fullAddress = [co.address, co.postal, co.country].filter(present).join(', ');

  const fields = [
    { label: "Virksomhedsnavn", value: v(co.name) },
    { label: "CVR-nr.", value: v(co.cvr), mono: true,
      action: present(co.cvr) && {
        key: 'cvr', label: 'Kopiér CVR', aria: 'Kopiér CVR-nummer', text: cvrPlain
      } },
    { label: "Juridisk form", value: v(co.legalForm) },
    { label: "Branche", value: v(co.industry) },
    { label: "Stiftelsesdato", value: v(co.founded) },
    { label: "Antal ansatte", value: present(co.employees) ? `${co.employees}` : NA },
    { label: "Adresse", value: v(co.address),
      action: present(co.address) && {
        key: 'addr', label: 'Kopiér adresse', aria: 'Kopiér adresse', text: fullAddress
      } },
    { label: "Postnummer/by", value: v(co.postal) },
    { label: "Land", value: v(co.country) },
  ];

  const bodyId = "stam-body";

  return (
    <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(o => !o)}
        className="card-head"
        style={{
          width: '100%', background: 'transparent', border: 0,
          borderBottom: open ? '1px solid var(--c-line-2)' : 'none',
          cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div className="card-title">Stamoplysninger</div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, padding: '2px 8px', borderRadius: 999,
            background: 'var(--c-primary-bg)', color: 'var(--c-primary)',
            fontWeight: 500, whiteSpace: 'nowrap',
          }}>
            <I.Database size={10}/> Offentlig kilde · {co.masterDataSource || 'CVR-registeret'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--c-text-3)', fontSize: 11.5, whiteSpace: 'nowrap' }}>
          <span>Senest opdateret {co.masterDataUpdated || '—'}</span>
          <I.ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}/>
        </div>
      </button>

      {open && (
        <div id={bodyId}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          }}>
            {fields.map((f, i) => {
              const row = Math.floor(i / 3);
              const col = i % 3;
              return (
                <div key={i} style={{
                  padding: '12px 16px',
                  borderTop: row > 0 ? '1px solid var(--c-line-2)' : 'none',
                  borderLeft: col > 0 ? '1px solid var(--c-line-2)' : 'none',
                  display: 'flex', flexDirection: 'column', gap: 4,
                  minWidth: 0,
                }}>
                  <div style={{ fontSize: 11, color: 'var(--c-text-2)' }}>{f.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <div
                      className={f.mono ? "mono" : ""}
                      title={typeof f.value === 'string' ? f.value : undefined}
                      style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--c-ink)', lineHeight: 1.35,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
                      }}
                    >
                      {f.value}
                    </div>
                    {f.action && (
                      <button
                        type="button"
                        aria-label={f.action.aria}
                        title={copied === f.action.key ? "Kopieret" : f.action.label}
                        onClick={(e) => { e.stopPropagation(); copy(f.action.key, f.action.text); }}
                        style={{
                          width: 24, height: 24, borderRadius: 5,
                          border: '1px solid var(--c-line)',
                          background: copied === f.action.key ? 'var(--c-primary-bg)' : 'var(--c-surface)',
                          color: copied === f.action.key ? 'var(--c-primary)' : 'var(--c-text-2)',
                          display: 'grid', placeItems: 'center',
                          cursor: 'pointer', flexShrink: 0, padding: 0,
                          transition: 'background .12s, color .12s, border-color .12s',
                        }}
                        onMouseEnter={(e) => { if (copied !== f.action.key) e.currentTarget.style.borderColor = 'var(--c-line-strong)'; }}
                        onMouseLeave={(e) => { if (copied !== f.action.key) e.currentTarget.style.borderColor = 'var(--c-line)'; }}
                      >
                        {copied === f.action.key ? <I.Check size={12}/> : <I.Copy size={12}/>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, padding: '9px 16px', borderTop: '1px solid var(--c-line-2)',
            background: 'var(--c-surface-2)',
            fontSize: 11.5, color: 'var(--c-text-2)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <I.Database size={11} style={{ color: 'var(--c-text-3)' }}/>
              Data hentes fra offentlig kilde og opdateres automatisk
            </span>
            {co.cvrUrl && (
              <a
                href={co.cvrUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  color: 'var(--c-primary)', textDecoration: 'none', fontWeight: 500,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                Åbn i CVR-registeret <I.Link size={11}/>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Collected data section — grouped evidence summary
   Group 1: Automatisk indsamlet (system-gathered sources)
   Group 2: Modtaget fra kunden (customer-uploaded material; 1 source, N docs)
   ──────────────────────────────────────────────────────────────────────── */
const AUTO_SOURCES = [
  { src: "CVR-registret", what: "Selskab, vedtægter, bestyrelse, regnskab", last: "23. maj" },
  { src: "e-conomic", what: "Periodetal Q1, kontoplan, kreditorer", last: "i dag · 09:01" },
  { src: "Sustainalytics", what: "ESG-rating: Low risk", last: "23. maj" },
  { src: "Branche­opslag", what: "Markedsdata DK vindkomponent +6,8%", last: "23. maj" },
  { src: "Soft signals", what: "LinkedIn, presse, fundinghistorik", last: "i dag" },
];

const CUSTOMER_DOCS = [
  "Årsrapport 2023",
  "Årsrapport 2024",
  "Årsrapport 2025",
  "Budget 2026",
  "Ejerbog",
  "Vedtægter",
  "Låneaftale Nordea",
  "Låneaftale Vækstfonden",
  "Anpartshaverlån — note 14",
  "Forsikringspolicer",
];

const CUSTOMER_TYPES = [
  { type: "Årsrapporter", what: "2023, 2024, 2025", count: 3, last: "23. maj" },
  { type: "Budget", what: "Budget 2026", count: 1, last: "23. maj" },
  { type: "Låneaftaler", what: "Nordea, Vækstfonden", count: 2, last: "24. maj" },
  { type: "Ejerbog", what: "Aktuel ejerstruktur", count: 1, last: "23. maj" },
  { type: "Vedtægter", what: "Senest opdateret 2024", count: 1, last: "23. maj" },
  { type: "Anpartshaverlån", what: "Note 14 — 0,5M", count: 1, last: "24. maj" },
  { type: "Forsikringspolicer", what: "Erhvervs- og produktansvar", count: 1, last: "24. maj" },
];

function GroupHeader({ label, helper, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 4, marginBottom: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-text-2)' }}>
          {label} {count != null && <span style={{ color: 'var(--c-text-3)', fontWeight: 500 }}>· {count}</span>}
        </div>
        {helper && <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 3, lineHeight: 1.4 }}>{helper}</div>}
      </div>
    </div>
  );
}

function DoneCheck({ label = "Indsamlet" }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        width: 16, height: 16, borderRadius: '50%',
        background: 'var(--c-success)', color: '#fff',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
      <I.Check size={10}/>
    </span>
  );
}

function AutoSourceCard({ src, what, last }) {
  return (
    <div style={{
      padding: '11px 14px',
      border: '1px solid var(--c-line)',
      borderRadius: 8,
      background: 'var(--c-surface)',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: 'var(--c-primary-bg)',
        border: '1px solid var(--c-primary-border)',
        display: 'grid', placeItems: 'center',
        color: 'var(--c-primary)',
        flexShrink: 0,
      }}>
        <I.Database size={13}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-ink)' }}>{src}</div>
          <span aria-label="Automatisk indsamlet" style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 500, color: 'var(--c-primary)',
            background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-border)',
            padding: '0 6px', borderRadius: 999, lineHeight: 1.6,
          }}>
            <I.Spark size={9}/> Auto
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.4 }}>{what}</div>
        <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', marginTop: 5 }}>Indsamlet automatisk · {last}</div>
      </div>
      <DoneCheck label="Indsamlet"/>
    </div>
  );
}

function CustomerTypeCard({ type, what, count, last }) {
  return (
    <div style={{
      padding: '11px 14px',
      border: '1px solid var(--c-line)',
      borderRadius: 8,
      background: 'var(--c-surface)',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: 'var(--c-surface-2)',
        border: '1px solid var(--c-line)',
        display: 'grid', placeItems: 'center',
        color: 'var(--c-text-2)',
        flexShrink: 0,
      }}>
        <I.Upload size={13}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-ink)' }}>
            {type}{count > 1 ? ` (${count})` : ''}
          </div>
          <span aria-label="Modtaget fra kunden" style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 500, color: 'var(--c-text-2)',
            background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
            padding: '0 6px', borderRadius: 999, lineHeight: 1.6,
          }}>
            <I.Upload size={9}/> Kunde
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.4 }}>{what}</div>
        <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', marginTop: 5 }}>Modtaget · {last}</div>
      </div>
      <DoneCheck label="Modtaget"/>
    </div>
  );
}

function CollectedDataSection({ go }) {
  const autoCount = AUTO_SOURCES.length;
  const typeCount = CUSTOMER_TYPES.length;
  const docCount = CUSTOMER_DOCS.length;
  return (
    <ExpandSection
      icon={<I.Check size={15}/>}
      title="Datagrundlag klar"
      tone="success"
      badge={
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, padding: '2px 8px', borderRadius: 999,
          background: 'var(--c-success-bg)', color: 'var(--c-success)',
          border: '1px solid #cfe6d8', fontWeight: 500, whiteSpace: 'nowrap',
        }}>
          <I.Check size={10}/> Klar til analyse
        </span>
      }
      summary={
        <>
          <div>Det her har vi allerede på sagen.</div>
          <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>
            <b style={{ color: 'var(--c-text-2)', fontWeight: 500 }}>{autoCount} automatisk indsamlet</b>
            <span> · </span>
            <b style={{ color: 'var(--c-text-2)', fontWeight: 500 }}>{docCount} dokumenter fra kunden i {typeCount} kategorier</b>
          </div>
        </>
      }
      defaultOpen
      action={null}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {AUTO_SOURCES.map((s, i) => <AutoSourceCard key={`a-${i}`} {...s}/>)}
        {CUSTOMER_TYPES.map((t, i) => <CustomerTypeCard key={`c-${i}`} {...t}/>)}
      </div>
    </ExpandSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SectionLead — page-level heading that separates "outstanding" from "done"
   ──────────────────────────────────────────────────────────────────────── */
function SectionLead({ kind, eyebrow, title, sub }) {
  const isDone = kind === 'done';
  return (
    <div style={{
      marginTop: isDone ? 36 : 24,
      marginBottom: 12,
      paddingTop: isDone ? 20 : 0,
      borderTop: isDone ? '1px solid var(--c-line)' : 'none',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: isDone ? 'var(--c-text-3)' : 'var(--c-primary)',
        background: isDone ? 'transparent' : 'var(--c-primary-bg)',
        border: isDone ? 'none' : '1px solid var(--c-primary-border)',
        padding: isDone ? 0 : '2px 8px', borderRadius: 999,
        marginBottom: 8,
      }}>
        {isDone ? <I.Check size={11}/> : <I.Flag size={11}/>}
        {eyebrow}
      </div>
      <div style={{
        fontSize: isDone ? 16 : 20,
        fontWeight: 600,
        color: isDone ? 'var(--c-text-2)' : 'var(--c-ink)',
        letterSpacing: '-0.015em',
        lineHeight: 1.2,
      }}>
        {title}
      </div>
      {sub && (
        <div style={{
          fontSize: isDone ? 12 : 13.5,
          color: isDone ? 'var(--c-text-3)' : 'var(--c-text-2)',
          marginTop: 4, lineHeight: 1.5, maxWidth: 720,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Til at nå i mål — prioriteret handlingsplan
   En samlet kunde-anmodning + interne beslutninger
   ──────────────────────────────────────────────────────────────────────── */
const BUNDLE_DOCS = [
  { id: 'd1', t: "Sikkerhedsdokumenter", w: "Pantebrev, tinglysning, forsikringspolicer", optional: false, priority: 'block' },
  { id: 'd2', t: "Tilbagetrædelses­erklæring", w: "Anpartshaverlån 0,5M — note 14", optional: false, priority: 'finding' },
  { id: 'd3', t: "Ejeraftale", w: "Hvis relevant — kan udelades", optional: true, priority: 'optional' },
];

const BUNDLE_QUESTIONS = [
  { id: 'q1', t: "4 afklaringer til kunden", w: "Budgetafvigelse i juli, tilbagetrædelse, kaution, ejerstruktur", optional: false, priority: 'finding' },
  { id: 'q2', t: "Specificér kautionsobjekter", w: "Pantebrev §4 refererer til 'sædvanlige sikkerheder'", optional: false, priority: 'finding' },
];

const INTERNAL_TASKS = [
  { id: 'i1', t: "Vurder om ejeraftale er nødvendig", w: "Beslut før kunden kontaktes, da det påvirker anmodningen.", to: "workspace:1:ownership", action: "Vurder" },
  { id: 'i2', t: "Færdiggør memo efter kundens svar", w: "Executive summary, anbefaling og markedsanalyse.", to: "workspace:1:memo", action: "Åbn memo" },
];

const CHECKLIST = [
  { id: 'c1', label: 'Sikkerhedsdokumenter mangler' },
  { id: 'c2', label: 'Tilbagetrædelses­erklæring mangler' },
  { id: 'c3', label: '4 afklaringer mangler' },
  { id: 'c4', label: 'Kautionsobjekter skal præciseres' },
  { id: 'c5', label: 'Ejeraftale', optional: true },
];

function MissingSection({ go }) {
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  return (
    <>
      <div className="card" style={{ padding: '4px 22px' }}>
        {/* Group 1 — Kontakt kunden */}
        <div style={{ padding: '20px 0', display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: 6,
                background: 'var(--c-primary-bg)', color: 'var(--c-primary)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <I.Mail size={13}/>
              </span>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.005em' }}>
                Kontakt kunden
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 5, lineHeight: 1.5 }}>
              Vi har samlet de manglende dokumenter og afklaringer i én anmodning.
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginTop: 6 }}>
              2 dokumenter · 2 afklaringer · 1 valgfrit punkt
            </div>

            {detailsOpen && (
              <ul style={{
                listStyle: 'none', margin: '14px 0 0 0', padding: 0,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {CHECKLIST.map(it => (
                  <li key={it.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 13, color: 'var(--c-text)' }}>
                    <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-text-4)', flexShrink: 0, transform: 'translateY(-2px)' }}/>
                    <span>{it.label}</span>
                    {it.optional && <span style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>Valgfri</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0, width: 180 }}>
            <button
              className="btn btn-primary"
              onClick={() => setComposerOpen(true)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Forbered anmodning
            </button>
            <button
              type="button"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen(o => !o)}
              style={{
                background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                fontSize: 12.5, color: 'var(--c-primary)', fontWeight: 500,
              }}
            >
              {detailsOpen ? 'Skjul detaljer' : 'Se detaljer'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--c-line-2)' }}/>

        {/* Group 2 — Tag stilling */}
        <div style={{ padding: '20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'var(--c-surface-2)', color: 'var(--c-text-2)',
              border: '1px solid var(--c-line)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <I.User size={13}/>
            </span>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.005em' }}>
              Tag stilling
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 5, lineHeight: 1.5 }}>
            Punkter der kræver din vurdering, før sagen kan færdiggøres.
          </div>

          <ol style={{
            listStyle: 'none', margin: '14px 0 0 0', padding: 0,
          }}>
            {INTERNAL_TASKS.map((task, i) => (
              <li
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--c-line-2)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--c-surface-2)',
                    border: '1px solid var(--c-line)',
                    color: 'var(--c-text-2)',
                    fontSize: 11.5, fontWeight: 600,
                    display: 'grid', placeItems: 'center',
                    flexShrink: 0, marginTop: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)' }}>{task.t}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 3, lineHeight: 1.5 }}>{task.w}</div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => go(task.to)}
                  style={{ width: 180, justifyContent: 'center', flexShrink: 0 }}
                >
                  {task.action}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {composerOpen && (
        <CustomerRequestComposer
          docs={BUNDLE_DOCS}
          questions={BUNDLE_QUESTIONS}
          onClose={() => setComposerOpen(false)}
        />
      )}
    </>
  );
}

function CustomerRequestComposer({ docs, questions, onClose }) {
  const initSel = React.useMemo(() => {
    const m = {};
    [...docs, ...questions].forEach(it => { m[it.id] = !it.optional; });
    return m;
  }, [docs, questions]);
  const [sel, setSel] = React.useState(initSel);
  const toggle = (id) => setSel(s => ({ ...s, [id]: !s[id] }));
  const removeSelected = () => setSel(s => {
    const next = { ...s };
    Object.keys(next).forEach(k => { if (next[k]) next[k] = false; });
    return next;
  });
  const selectedCount = Object.values(sel).filter(Boolean).length;

  // Lock body scroll while open
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const ItemRow = ({ it }) => (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', border: '1px solid var(--c-line)',
      borderRadius: 7, background: sel[it.id] ? '#fff' : 'var(--c-surface-2)',
      cursor: 'pointer', opacity: sel[it.id] ? 1 : 0.6,
    }}>
      <input
        type="checkbox"
        checked={!!sel[it.id]}
        onChange={() => toggle(it.id)}
        style={{ marginTop: 3, accentColor: 'var(--c-primary)' }}
        aria-label={it.t}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-ink)' }}>{it.t}</span>
          {it.optional && <span style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>Valgfri</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2, lineHeight: 1.4 }}>{it.w}</div>
      </div>
    </label>
  );

  const optionalItems = [...docs, ...questions].filter(i => i.optional);
  const requiredDocs = docs.filter(d => !d.optional);
  const requiredQs = questions.filter(q => !q.optional);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)',
        display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 100%)', maxHeight: 'calc(100vh - 40px)',
          background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-line-2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-border)',
            display: 'grid', placeItems: 'center', color: 'var(--c-primary)', flexShrink: 0,
          }}>
            <I.Mail size={15}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="composer-title" style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-ink)' }}>Samlet anmodning til kunden</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>
              {selectedCount} af {Object.keys(sel).length} punkter inkluderet — du kan fjerne valgfrie punkter inden afsendelse.
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Luk"><I.X size={14}/></button>
        </div>

        <div style={{ padding: '16px 20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>Dokumenter vi mangler</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {requiredDocs.map(it => <ItemRow key={it.id} it={it}/>)}
            </div>
          </section>

          <section>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>Afklaringer vi mangler</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {requiredQs.map(it => <ItemRow key={it.id} it={it}/>)}
            </div>
          </section>

          {optionalItems.length > 0 && (
            <section>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>Valgfrit materiale</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {optionalItems.map(it => <ItemRow key={it.id} it={it}/>)}
              </div>
            </section>
          )}

          <section>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 6 }}>Besked til kunden (forhåndsudfyldt)</div>
            <textarea
              defaultValue={`Hej,\n\nFor at færdiggøre kreditvurderingen mangler vi følgende. Du kan uploade/svare via linket nedenfor.\n\nVenlig hilsen\nMette L. · Crediwire`}
              rows={5}
              style={{
                width: '100%', resize: 'vertical',
                padding: '10px 12px', fontSize: 13, color: 'var(--c-ink)',
                border: '1px solid var(--c-line)', borderRadius: 7,
                background: '#fff', fontFamily: 'inherit', lineHeight: 1.5,
              }}
            />
          </section>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--c-line-2)', background: 'var(--c-surface-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-sm btn-ghost" onClick={removeSelected}>Fjern valgte punkter</button>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>Gem som kladde</button>
          <button className="btn btn-sm btn-primary" onClick={onClose} disabled={selectedCount === 0}>
            <I.Mail size={12}/> Send anmodning ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
}

window.WorkspaceShell = WorkspaceShell;
window.Sparkline = Sparkline;
window.BudgetChart = BudgetChart;
window.StamoplysningerCard = StamoplysningerCard;
window.CollectedDataSection = CollectedDataSection;
window.MissingSection = MissingSection;
