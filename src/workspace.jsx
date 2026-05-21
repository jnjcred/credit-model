// Case workspace shell — header + tabs + content router
function WorkspaceShell({ tab, go, openMemo }) {
  const co = DATA.COMPANY;
  const tabs = [
    { k: "overview", label: "Overblik", ic: <I.Layout className="ic"/> },
    { k: "collection", label: "Indsamling", ic: <I.Inbox className="ic"/>, badge: "1" },
    { k: "financials", label: "Finansielt", ic: <I.BarChart className="ic"/> },
    { k: "documents", label: "Dokumenter", ic: <I.FileText className="ic"/>, badge: "12" },
    { k: "security", label: "Sikkerheder", ic: <I.Lock className="ic"/>, badge: "1" },
    { k: "findings", label: "Findings", ic: <I.Sparkles className="ic"/>, badge: "3" },
    { k: "market", label: "Marked", ic: <I.Globe className="ic"/> },
    { k: "ownership", label: "Ejerskab", ic: <I.GitBranch className="ic"/> },
    { k: "questions", label: "Spørgsmål", ic: <I.Help className="ic"/>, badge: "4" },
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
            <div className="ws-co-meta">
              <span className="mono">CVR {co.cvr}</span><span className="dot"></span>
              <span>{co.industry}</span><span className="dot"></span>
              <span>{co.employees} ansatte</span><span className="dot"></span>
              <span>{co.hq}</span><span className="dot"></span>
              <span>{co.caseType} · <b className="mono num" style={{ color: 'var(--c-ink)' }}>{co.amount}</b></span>
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
        {tab === "collection" && <WSCollection/>}
        {tab === "financials" && <WSFinancials/>}
        {tab === "documents" && <WSDocuments/>}
        {tab === "security" && <WSSecurity/>}
        {tab === "findings" && <WSFindings/>}
        {tab === "market" && <WSMarket/>}
        {tab === "ownership" && <WSOwnership/>}
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
      {/* Big progress hero with color-coded % and journey */}
      <ProgressHero overall={overall} tone={overallTone} stages={stages} go={go}/>

      {/* What we have */}
      <ExpandSection
        icon={<I.Database size={15}/>}
        title="Vi har samlet"
        summary={<><b>4 offentlige kilder</b> + <b>10 dokumenter</b> fra kunde + <b>ERP-data</b> fra e-conomic</>}
        defaultOpen
        action={null}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { src: "CVR-registret", what: "Selskab, vedtægter, bestyrelse, regnskab", auto: true, last: "23. maj" },
            { src: "e-conomic", what: "Periodetal Q1, kontoplan, kreditorer", auto: true, last: "i dag · 09:01" },
            { src: "Sustainalytics", what: "ESG-rating: Low risk", auto: true, last: "23. maj" },
            { src: "Branche­opslag", what: "Markedsdata DK vindkomponent +6,8%", auto: true, last: "23. maj" },
            { src: "Kunde upload", what: "Årsrapport 2023–2025, budget, ejerbog, låneaftaler", auto: false, last: "23–24. maj" },
            { src: "Soft signals", what: "LinkedIn, presse, fundinghistorik", auto: true, last: "i dag" },
          ].map((s, i) => (
            <div key={i} style={{ padding: '10px 14px', border: '1px solid var(--c-line)', borderRadius: 8, background: 'var(--c-surface)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: s.auto ? 'var(--c-primary-bg)' : 'var(--c-surface-2)', display: 'grid', placeItems: 'center', color: s.auto ? 'var(--c-primary)' : 'var(--c-text-2)', flexShrink: 0 }}>
                {s.auto ? <I.Database size={13}/> : <I.Upload size={13}/>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-ink)' }}>{s.src}</div>
                <div style={{ fontSize: 11.5, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.4 }}>{s.what}</div>
                <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', marginTop: 4 }}>{s.last}</div>
              </div>
            </div>
          ))}
        </div>
      </ExpandSection>

      {/* What's missing / actions */}
      <ExpandSection
        icon={<I.Flag size={15}/>}
        title="Til at nå i mål"
        summary={<><b>{4 + 4 + 1} actions tilbage</b> · prioriteret efter hvad der bringer dig tættest på indstilling</>}
        defaultOpen
        badge={<span className="ai-hint"><I.Spark className="spark"/> Prioriteret af AI</span>}
        action={null}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { sev: "high", t: "Påmind kunde om sikkerheds­dokumenter", w: "Kunde åbnet, ikke afleveret", to: "workspace:1:collection", action: "Send påmindelse", impact: "+8% data­komplethed" },
            { sev: "high", t: "Forespørg 4 afklaringer hos kunden", w: "Bl.a. budgetafvigelse i juli og tilbagetrædelses­erklæring", to: "workspace:1:questions", action: "Åbn spørgsmål", impact: "Lukker 3 åbne findings" },
            { sev: "med", t: "Anmod om tilbagetrædelses­erklæring", w: "Anpartshaver­lån 0,5M — note 14", to: "workspace:1:security", action: "Anmod nu", impact: "Lukker risk-finding" },
            { sev: "med", t: "Specificér kautionsobjekter", w: "Pantebrev §4 refererer til 'sædvanlige sikkerheder'", to: "workspace:1:security", action: "Anmod nu", impact: "Lukker risk-finding" },
            { sev: "low", t: "Skriv executive summary", w: "Memo §1 — manuelt input nødvendigt", to: "workspace:1:memo", action: "Åbn memo", impact: "Memo: 75% færdig" },
            { sev: "low", t: "Skriv anbefaling", w: "Memo §12 — manuelt input nødvendigt", to: "workspace:1:memo", action: "Åbn memo", impact: "Memo: 90% færdig" },
            { sev: "low", t: "Indhent ejeraftale (valgfri)", w: "Anmodet 23. maj — afventer", to: "workspace:1:collection", action: "Påmind", impact: "Komplet datapakke" },
            { sev: "low", t: "Markedsanalyse — gennemgå konkurrenter", w: "AI har genereret, kræver bekræftelse", to: "workspace:1:market", action: "Gennemgå", impact: "Memo §4 udfyldt" },
            { sev: "low", t: "Endelig review før indstilling", w: "Når øvrige er klaret", to: "workspace:1:memo", action: "Senere", impact: "Klar til komite" },
          ].map((a, i) => (
            <ActionRow key={i} a={a} go={go}/>
          ))}
        </div>
      </ExpandSection>

      {/* Quick activity for context */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div className="card-title">Seneste aktivitet</div>
        </div>
        <div style={{ padding: '4px 18px 14px' }}>
          {[
            { t: "Kunde uploadede 3 dokumenter", w: "i dag · 09:01", ic: <I.Upload size={11}/>, who: "Anders N." },
            { t: "AI fandt budgetafvigelse i juli", w: "i dag · 09:04", ic: <I.Sparkles size={11}/>, who: "System" },
            { t: "Periodetal Q1 hentet via e-conomic", w: "i dag · 09:01", ic: <I.Database size={11}/>, who: "System" },
            { t: "Sag oprettet og link sendt", w: "i går · 14:18", ic: <I.Send size={11}/>, who: "Mette L." },
          ].map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--c-line-2)' : 'none' }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', color: 'var(--c-text-2)', flexShrink: 0 }}>{a.ic}</div>
              <div style={{ flex: 1, fontSize: 13 }}>{a.t}</div>
              <div style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>{a.who} · {a.w}</div>
            </div>
          ))}
        </div>
      </div>
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
            <button className="btn" onClick={() => go("workspace:1:collection")}>Påmind kunde</button>
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

function ExpandSection({ icon, title, summary, badge, action, children, defaultOpen }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', color: 'var(--c-text-2)', flexShrink: 0 }}>
          {icon}
        </div>
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

window.WorkspaceShell = WorkspaceShell;
window.Sparkline = Sparkline;
window.BudgetChart = BudgetChart;
