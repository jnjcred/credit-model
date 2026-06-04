// Financials - credit-case financial overview (public data only - periodetal/budget not yet received)
const FIN_VIEWS = [
  { k: "all",        l: "Alle" },
  { k: "kpi",        l: "Nøgletal" },
  { k: "market",     l: "Marked" },
  { k: "ownership",  l: "Ejerskab" },
  { k: "findings",   l: "Findings" },
];

const FIN_FINDINGS_STORAGE = 'kabul:fin-findings:nordhavn';

function loadCustomFindings() {
  try {
    const raw = localStorage.getItem(FIN_FINDINGS_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function WSFinancials({ go }) {
  const f = DATA.FINANCIALS;
  // Public data: only the three annual columns from CVR
  const annualYears = f.years.slice(0, 3);
  const annual = {
    years: annualYears,
    revenue: f.revenue.slice(0, 3),
    ebitda: f.ebitda.slice(0, 3),
    grossMargin: f.grossMargin.slice(0, 3),
    liquidity: f.liquidity.slice(0, 3),
    equity: f.equity.slice(0, 3),
    debt: f.debt.slice(0, 3),
  };
  const [view, setView] = React.useState("all");
  const show = (k) => view === "all" || view === k;
  const [customFindings, setCustomFindings] = React.useState(loadCustomFindings);

  React.useEffect(() => {
    try { localStorage.setItem(FIN_FINDINGS_STORAGE, JSON.stringify(customFindings)); } catch (e) {}
  }, [customFindings]);

  const addFinding = (f) => setCustomFindings(list => [{ ...f, id: Date.now() }, ...list]);
  const removeFinding = (id) => setCustomFindings(list => list.filter(f => f.id !== id));

  return (
    <div className="page page-wide" style={{ maxWidth: 1080, padding: '24px 32px 80px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: 0 }}>Finansielt overblik</h1>
        <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 4, maxWidth: 720 }}>
          Foreløbig vurdering baseret på offentlige årsregnskaber, branche og soft signals. Periodetal, budget og interne dokumenter mangler fra kunden.
        </div>
      </div>

      {/* Sticky toolbar - section filter + næste-skridt CTAs */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 0',
          marginBottom: 8,
          background: 'var(--c-bg)',
          borderBottom: '1px solid var(--c-line-2)',
        }}
      >
        <div
          role="tablist"
          aria-label="Filtrér sektioner"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1, minWidth: 0 }}
        >
          {FIN_VIEWS.map(v => {
            const active = view === v.k;
            return (
              <button
                key={v.k}
                role="tab"
                aria-selected={active}
                onClick={() => setView(v.k)}
                style={{
                  height: 30, padding: '0 12px',
                  border: '1px solid ' + (active ? 'var(--c-primary)' : 'var(--c-line)'),
                  background: active ? 'var(--c-primary)' : '#fff',
                  color: active ? '#fff' : 'var(--c-text-2)',
                  fontSize: 12.5, fontWeight: 500,
                  borderRadius: 999, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {v.l}
              </button>
            );
          })}
        </div>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => go && go("workspace:1:memo")}
          title="Afslå sagen baseret på det nuværende grundlag"
          style={{ flexShrink: 0 }}
        >
          Giv afslag
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => go && go("workspace:1")}
          title="Send anmodning til kunden om periodetal, budget og dokumenter"
          style={{ flexShrink: 0 }}
        >
          Gå videre <I.ArrowRight className="ic"/>
        </button>
      </div>

      {/* Findings og opmærksomhedspunkter - øverst, samlet på tværs af kategorier */}
      {show("findings") && (
        <UnifiedFindings
          customFindings={customFindings}
          onAdd={addFinding}
          onRemove={removeFinding}
        />
      )}

      {/* Årsregnskaber - 3 års overblik */}
      {show("kpi") && (
        <AnnualReportSection go={go}/>
      )}


      {/* Datagrundlag - flyttet under tallene */}
      {view === "all" && (
      <FinSection
        title="Datagrundlag"
        sub="Vurderingen bygger på officielle årsregnskaber fra CVR. Periodetal og budget hentes når kunden har afleveret materialet."
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DataBasisCard
            title="Årsregnskaber"
            description="Officielle regnskaber fra CVR. Bruges til historik, kapitalstruktur og langsigtet udvikling."
            chips={["2023", "2024", "2025"]}
            source="CVR-registret"
            status="Modtaget"
          />
          <div style={{
            borderRadius: 8,
            background: 'var(--c-surface-2)',
            border: '1px dashed var(--c-line-strong)',
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-2)' }}>Periodetal og budget</div>
              <StatusTag kind="warn">Afventer kunden</StatusTag>
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 4, lineHeight: 1.5 }}>
              Q1 2026 fra e-conomic eller upload + budget 2026 indgår, så snart kunden har afleveret materialet.
            </div>
          </div>
        </div>
      </FinSection>
      )}

      {/* Trustpilot */}
      {show("market") && <TrustpilotSection/>}

      {/* 5. Marked og branche - kontekst, ikke findings */}
      {show("market") && (
      <FinSection
        title="Marked og branche"
        sub="Kontekst for branche, marked og makro. Kreditrelevante observationer ligger under Findings øverst."
      >
        {/* Markedssignaler - top numbers */}
        <div className="card" style={{ padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: "Branchevækst 2025",   value: "+6,8%",    note: "DK vindkomponenter" },
              { label: "Ordreindgang",         value: "Stabil",   note: "Sektoren i Q2 2026" },
              { label: "Konkurrenceniveau",   value: "Moderat",  note: "5-7 spillere i DK-segment" },
            ].map((m, i) => (
              <div key={i} style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--c-text-2)' }}>{m.label}</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)', marginTop: 3 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>{m.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PEST analyse */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)' }}>PEST-analyse</div>
          <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>· kort overblik over makroforhold</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            {
              k: "Politisk",
              desc: "EU's Green Deal og dansk vindkraftpolitik støtter sektoren. Følg evt. handelsbarrierer på import af kompositmaterialer.",
            },
            {
              k: "Økonomisk",
              desc: "Stabil branchevækst og lave finansieringsomkostninger. DKK/EUR-følsomhed pga. høj eksportandel kan påvirke marginer.",
            },
            {
              k: "Socialt",
              desc: "Stigende efterspørgsel efter vedvarende energi understøtter pipeline. Kompetencemangel i komposit-faget kan presse lønninger.",
            },
            {
              k: "Teknologisk",
              desc: "Genanvendelige kompositter og automatisering skaber muligheder, men kræver kapitalinvesteringer for at følge med.",
            },
          ].map((p, i) => (
            <div key={i} className="card" style={{
              padding: '12px 14px',
              minWidth: 0,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-primary)' }}>
                {p.k}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.5 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </FinSection>
      )}

      {/* 6. Ejerskab og finansielle bindinger - træ-visualisering */}
      {show("ownership") && (
      <FinSection
        title="Ejerskab og finansielle bindinger"
        sub="Ejerstruktur fra CVR. Kreditrelevante observationer ligger under Findings øverst."
      >
        <SimpleOwnershipTree/>

        <div className="card" style={{ padding: '4px 18px', marginTop: 14 }}>
          {[
            { label: "Bestyrelse", value: "3 medlemmer · ingen PEP" },
            { label: "Koncernforhold", value: "Selvstændigt selskab - ingen intercompany-balancer" },
            { label: "Anpartshaverlån", value: "0,5M (note 14)" },
          ].map((o, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 16, padding: '10px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--c-line-2)',
            }}>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-2)' }}>{o.label}</div>
              <div style={{ fontSize: 13, color: 'var(--c-ink)', fontWeight: 500, textAlign: 'right' }}>{o.value}</div>
            </div>
          ))}
        </div>
      </FinSection>
      )}

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────── */

function FinSection({ title, sub, badge, children }) {
  return (
    <section style={{ marginTop: 28, marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.01em', lineHeight: 1.25,
          }}>
            {title}
          </h2>
          {sub && <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginTop: 4, lineHeight: 1.5, maxWidth: 760 }}>{sub}</div>}
        </div>
        {badge}
      </div>
      <div className="card" style={{ padding: '14px 18px' }}>
        {children}
      </div>
    </section>
  );
}

function StatusTag({ kind, children }) {
  const tones = {
    warn:    { fg: 'var(--c-warn)', bg: 'var(--c-warn-bg)', border: '#f4dfb7' },
    info:    { fg: 'var(--c-primary)', bg: 'var(--c-primary-bg)', border: 'var(--c-primary-border)' },
    neutral: { fg: 'var(--c-text-2)', bg: 'var(--c-surface-2)', border: 'var(--c-line)' },
    success: { fg: 'var(--c-success)', bg: 'var(--c-success-bg)', border: '#cfe6d8' },
  };
  const t = tones[kind] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 500, color: t.fg, background: t.bg,
      border: `1px solid ${t.border}`, padding: '2px 8px', borderRadius: 999,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function DataBasisCard({ title, description, chips, source, status, stamp }) {
  return (
    <div style={{ padding: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.5 }}>{description}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {chips.map((c, i) => (
          <span key={i} style={{
            fontSize: 11.5, fontWeight: 500, color: 'var(--c-ink)',
            background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
            padding: '2px 8px', borderRadius: 6,
          }}>
            {c}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 11.5, color: 'var(--c-text-3)', flexWrap: 'wrap' }}>
        <span>Kilde: <b style={{ color: 'var(--c-text-2)', fontWeight: 500 }}>{source}</b></span>
        <span>·</span>
        <StatusTag kind="success">{status}</StatusTag>
        {stamp && <><span>·</span><span>{stamp}</span></>}
      </div>
    </div>
  );
}

const KPIS = [
  { label: "Egenkapital", value: "6,2M", delta: "+33,4% siden 2023", dir: "up", period: "Årsregnskab 2025", note: "Styrket egenkapital over perioden." },
  { label: "Soliditet", value: "44%", delta: "+7pp siden 2023", dir: "up", period: "Årsregnskab 2025", note: "Sund kapitalstruktur." },
  { label: "Gæld", value: "7,8M", delta: "+32,2% siden 2023", dir: "down", period: "Årsregnskab 2025", note: "Følges sammen med periodetal." },
  { label: "Balancesum", value: "14,0M", delta: "+49% siden 2023", dir: "up", period: "Årsregnskab 2025", note: "Vækst i samlede aktiver." },
];

function KpiCard({ label, value, delta, dir, period, note }) {
  const positive = dir === 'up';
  return (
    <div style={{
      padding: '12px 14px',
      border: '1px solid var(--c-line)',
      borderRadius: 8,
      background: 'var(--c-surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 11.5, color: 'var(--c-text-2)' }}>{label}</div>
        <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{period}</div>
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--c-ink)', marginTop: 4, letterSpacing: '-0.01em' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 11.5, color: positive ? 'var(--c-success)' : 'var(--c-warn)', fontWeight: 500 }}>
        {positive ? <I.TrendUp size={11}/> : <I.TrendDown size={11}/>}
        <span>{delta}</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 6, lineHeight: 1.4 }}>{note}</div>
    </div>
  );
}

const MARKET_SIGNALS = [
  { title: "DK vindkomponenter: +6,8%", body: "Branchen voksede 6,8% i 2025. Understøtter vækstforventning, men forklarer ikke alene budgetspring i juli." },
  { title: "Ordreindgang i sektoren stabiliseret i Q2", body: "Indikerer realistisk fundament for H2-omsætning, men ordrebog bør verificeres." },
  { title: "Eksportandel kan øge følsomhed over for valutakurser", body: "70% af omsætning er EUR-faktureret. Kan påvirke margin ved DKK/EUR-udsving." },
];

const OWNERSHIP_TIES = [
  { title: "Anpartshaverlån", body: "0,5M registreret i note 14. Vilkår og tilbagebetaling bør afklares før kaution-vurdering." },
  { title: "Ejerkoncentration", body: "Én hovedaktionær kontrollerer 92%. Relevant for kaution og beslutningsrisiko." },
  { title: "Ingen intercompany-balancer", body: "Selskabet indgår ikke i koncern. Lavere kompleksitet i kapitalstruktur." },
];

function SignalRow({ title, body, isFirst }) {
  return (
    <div style={{
      padding: '12px 0',
      borderTop: isFirst ? 'none' : '1px solid var(--c-line-2)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-ink)' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 3, lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

const FIN_FINDINGS = [
  // Finansielle findings
  {
    category: 'financial',
    severity: "warn",
    severityLabel: "Kræver afklaring",
    title: "Gæld stiger fra 2024 til 2025",
    body: "Samlet gæld er gået fra 6,4M til 7,8M. Bør sammenholdes med aktuelle periodetal når de modtages.",
    basis: "Årsregnskaber",
    source: "Årsrapport 2025",
    action: "Tilføj til anmodning",
    topic: "debt",
  },
  {
    category: 'financial',
    severity: "neutral",
    severityLabel: "Følg op",
    title: "Manglende periodetal",
    body: "Aktuel drift kan ikke vurderes uden Q1 2026-tal. Foreløbig vurdering bygger alene på årsregnskaber.",
    basis: "Periodetal",
    source: "Afventer kunden",
    action: "Tilføj til anmodning",
    topic: "missing-data",
  },
  {
    category: 'financial',
    severity: "ok",
    severityLabel: "Til orientering",
    title: "Overskud hvert år 2023-2025",
    body: "Selskabet har leveret positivt årsresultat tre år i træk (0,3M → 0,7M → 1,0M). Indikerer stabil indtjening.",
    basis: "Årsregnskaber",
    source: "Årsrapport 2023-2025",
    topic: "profit",
  },
  {
    category: 'financial',
    severity: "ok",
    severityLabel: "Til orientering",
    title: "Egenkapital og soliditet",
    body: "Egenkapital er steget 33% siden 2023. Soliditet på 44% understøtter kapacitet til nyt engagement.",
    basis: "Årsregnskaber",
    source: "Årsrapport 2025",
    topic: "equity",
  },
  // Markedsfindings
  {
    category: 'market',
    severity: "ok",
    severityLabel: "Til orientering",
    title: "Branchevækst understøtter omsætningsforventning",
    body: "DK vindkomponenter voksede 6,8% i 2025. Sektoren understøtter virksomhedens vækstkurve frem mod 2026.",
    basis: "Marked",
    source: "Brancheopslag · 23. maj",
    topic: "market-up",
  },
  {
    category: 'market',
    severity: "neutral",
    severityLabel: "Følg op",
    title: "Eksponering mod vindkomponenter",
    body: "70% af omsætningen er EUR-faktureret. Følsomhed over for DKK/EUR-udsving bør indgå i marginvurderingen.",
    basis: "Marked",
    source: "Brancheopslag · soft signals",
    action: "Tilføj til anmodning",
    topic: "market-risk",
  },
  // Øvrige kreditrelevante findings
  {
    category: 'other',
    severity: "warn",
    severityLabel: "Kræver afklaring",
    title: "Anpartshaverlån kræver afklaring",
    body: "0,5M anpartshaverlån fremgår af note 14. Vilkår og tilbagebetaling kan påvirke vurdering af likviditet og tilbagebetalingsevne.",
    basis: "Ejerforhold",
    source: "Årsrapport 2025 · note 14",
    action: "Tilføj til anmodning",
    topic: "shareholder-loan",
  },
];

const FINDING_CATEGORIES = [
  { key: 'financial', label: 'Finansielle findings' },
  { key: 'market',    label: 'Markedsfindings' },
  { key: 'other',     label: 'Øvrige kreditrelevante findings' },
];

function UnifiedFindings({ customFindings, onAdd, onRemove }) {
  const all = [
    ...customFindings.map(f => ({ ...f, isCustom: true, category: f.category || 'financial' })),
    ...FIN_FINDINGS,
  ];

  const counts = all.reduce((acc, f) => {
    if (f.severity === 'warn') acc.warn++;
    else if (f.severity === 'ok') acc.ok++;
    else acc.followup++;
    return acc;
  }, { warn: 0, followup: 0, ok: 0 });

  return (
    <FinSection
      title="Findings og opmærksomhedspunkter"
      sub={`${counts.warn} kræver afklaring · ${counts.followup} bør følges op · ${counts.ok} til orientering`}
    >
      {FINDING_CATEGORIES.map((cat, ci) => {
        const items = all.filter(f => f.category === cat.key);
        if (items.length === 0) return null;
        return (
          <div key={cat.key} style={{ marginTop: ci === 0 ? 0 : 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{cat.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>· {items.length}</div>
            </div>
            {items.map((f, i) => (
              <FindingRow
                key={f.isCustom ? `u-${f.id}` : `${cat.key}-${i}`}
                severity={f.severity}
                severityLabel={f.severityLabel}
                title={f.title}
                body={f.body}
                basis={f.basis}
                source={f.source}
                action={f.action}
                topic={f.topic}
                isFirst={i === 0}
                onRemove={f.isCustom ? (() => onRemove(f.id)) : null}
              />
            ))}
          </div>
        );
      })}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--c-line-2)' }}>
        <CustomFindingForm onAdd={onAdd}/>
      </div>
    </FinSection>
  );
}

const TOPIC_ICONS = {
  'debt':            { icon: <I.TrendUp size={14}/> },
  'missing-data':    { icon: <I.Clock size={14}/> },
  'profit':          { icon: <I.TrendUp size={14}/> },
  'equity':          { icon: <I.CheckCircle size={14}/> },
  'market-up':       { icon: <I.Globe size={14}/> },
  'market-risk':     { icon: <I.Globe size={14}/> },
  'shareholder-loan':{ icon: <I.AlertCircle size={14}/> },
  'ownership':       { icon: <I.User size={14}/> },
  'default':         { icon: <I.Sparkles size={14}/> },
};

function FindingRow({ severity, severityLabel, title, body, basis, source, action, isFirst, onRemove, topic }) {
  const tones = {
    warn: { fg: 'var(--c-warn)', bg: 'var(--c-warn-bg)', border: '#f4dfb7' },
    ok:   { fg: 'var(--c-success)', bg: 'var(--c-success-bg)', border: '#cfe6d8' },
    neutral: { fg: 'var(--c-text-2)', bg: 'var(--c-surface-2)', border: 'var(--c-line)' },
  };
  const t = tones[severity === 'warn' ? 'warn' : severity === 'ok' ? 'ok' : 'neutral'];
  const topicConfig = TOPIC_ICONS[topic] || TOPIC_ICONS.default;
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 10px',
        borderTop: isFirst ? 'none' : '1px solid var(--c-line-2)',
        transition: 'background .12s ease',
        background: hover ? 'var(--c-surface-2)' : 'transparent',
        borderRadius: 6,
        marginInline: -4,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 30, height: 30, borderRadius: 8,
          background: t.bg, color: t.fg,
          border: `1px solid ${t.border}`,
          display: 'grid', placeItems: 'center',
          flexShrink: 0, marginTop: 1,
        }}
      >
        {topicConfig.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.005em', lineHeight: 1.35 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.55 }}>{body}</div>
        {(basis || source) && (
          <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 6 }}>
            {[basis, source].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        {severityLabel && (
          <span style={{
            fontSize: 11, fontWeight: 500, color: 'var(--c-text-2)',
            background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
            padding: '1px 8px', borderRadius: 999, whiteSpace: 'nowrap',
          }}>
            {severityLabel}
          </span>
        )}
        {action && (
          <button style={{
            background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
            fontSize: 12, color: 'var(--c-primary)', fontWeight: 500, whiteSpace: 'nowrap',
          }}>
            {action} →
          </button>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Slet finding"
          title="Slet finding"
          style={{
            width: 22, height: 22, padding: 0, border: 0,
            background: 'transparent', color: 'var(--c-text-3)',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            borderRadius: 5, flexShrink: 0,
            opacity: hover ? 1 : 0.5,
            transition: 'opacity .12s ease',
          }}
        >
          <I.X size={12}/>
        </button>
      )}
    </div>
  );
}

function FindingItem({ severity, severityLabel, title, body, source, action, isFirst, showSeverityTag, onRemove }) {
  const tone = severity === 'warn' ? 'warn' : severity === 'ok' ? 'success' : 'neutral';
  return (
    <div style={{
      padding: '14px 18px',
      borderTop: isFirst ? 'none' : '1px solid var(--c-line-2)',
      background: severity === 'warn' ? 'var(--c-warn-bg)' : 'transparent',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)' }}>{title}</div>
          {showSeverityTag && severityLabel && (
            <StatusTag kind={tone}>{severityLabel}</StatusTag>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{body}</div>
        {source && (
          <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <I.File size={11}/> {source}
          </div>
        )}
      </div>
      {action && (
        <button className="btn btn-sm" style={{ flexShrink: 0 }}>{action}</button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Slet finding"
          title="Slet finding"
          style={{
            width: 24, height: 24, padding: 0, border: 0,
            background: 'transparent', color: 'var(--c-text-3)',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            borderRadius: 5, flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-surface-2)'; e.currentTarget.style.color = 'var(--c-danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-text-3)'; }}
        >
          <I.X size={13}/>
        </button>
      )}
    </div>
  );
}

function CustomFindingForm({ onAdd }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [severity, setSeverity] = React.useState("warn");
  const [category, setCategory] = React.useState("financial");

  const reset = () => { setTitle(""); setBody(""); setSeverity("warn"); setCategory("financial"); };

  const submit = () => {
    if (!title.trim()) return;
    const label = severity === 'warn' ? 'Kræver afklaring' : severity === 'ok' ? 'Til orientering' : 'Følg op';
    onAdd({ title: title.trim(), body: body.trim(), severity, severityLabel: label, category });
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <div style={{
        padding: '12px 18px',
        borderTop: '1px solid var(--c-line-2)',
        background: 'var(--c-surface-2)',
      }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
            color: 'var(--c-primary)', fontSize: 13, fontWeight: 500,
          }}
        >
          <I.Plus size={13}/> Tilføj egen finding
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '14px 18px',
      borderTop: '1px solid var(--c-line-2)',
      background: 'var(--c-surface-2)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)' }}>Ny finding</div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel - fx 'Kunde mangler revisorerklæring'"
        style={{
          width: '100%', height: 32, padding: '0 10px',
          border: '1px solid var(--c-line)', borderRadius: 6,
          fontSize: 13, background: '#fff', color: 'var(--c-ink)', outline: 'none',
        }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Note - hvad observerede du, og hvorfor er det relevant for vurderingen?"
        rows={3}
        style={{
          width: '100%', resize: 'vertical', padding: '8px 10px',
          border: '1px solid var(--c-line)', borderRadius: 6,
          fontSize: 13, background: '#fff', color: 'var(--c-ink)',
          outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--c-text-2)' }}>Kategori:</span>
        {[
          { v: 'financial', l: 'Finansiel' },
          { v: 'market',    l: 'Marked' },
          { v: 'other',     l: 'Øvrig' },
        ].map(o => {
          const active = category === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => setCategory(o.v)}
              style={{
                height: 26, padding: '0 10px',
                border: '1px solid ' + (active ? 'var(--c-primary)' : 'var(--c-line)'),
                background: active ? 'var(--c-primary-bg)' : '#fff',
                color: active ? 'var(--c-primary)' : 'var(--c-text-2)',
                fontSize: 11.5, fontWeight: 500,
                borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {o.l}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--c-text-2)' }}>Alvorlighed:</span>
        {[
          { v: 'warn', l: 'Kræver afklaring' },
          { v: 'neutral', l: 'Følg op' },
          { v: 'ok', l: 'Til orientering' },
        ].map(o => {
          const active = severity === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => setSeverity(o.v)}
              style={{
                height: 26, padding: '0 10px',
                border: '1px solid ' + (active ? 'var(--c-primary)' : 'var(--c-line)'),
                background: active ? 'var(--c-primary-bg)' : '#fff',
                color: active ? 'var(--c-primary)' : 'var(--c-text-2)',
                fontSize: 11.5, fontWeight: 500,
                borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {o.l}
            </button>
          );
        })}
        <div style={{ flex: 1 }}/>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => { reset(); setOpen(false); }}
        >
          Annullér
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={submit}
          disabled={!title.trim()}
        >
          Gem finding
        </button>
      </div>
    </div>
  );
}

function FinRow({ label, data }) {
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{label}</td>
      {data.map((v, i) => (
        <td key={i} className="mono num" style={{ textAlign: 'right', color: v === null ? 'var(--c-text-4)' : 'var(--c-ink)' }}>
          {v === null ? '-' : v.toFixed(1)}
        </td>
      ))}
    </tr>
  );
}

function MiniSpark({ data }) {
  const w = 80, h = 18;
  const max = Math.max(...data) * 1.05, min = Math.min(...data) * 0.95;
  const pts = data.map((v, i) => `${(i / (data.length-1)) * w},${h - ((v - min) / (max - min)) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke="var(--c-ink)" strokeWidth="1.3" opacity="0.6"/>
    </svg>
  );
}

function IncomeChart({ years, revenue, ebitda, labels }) {
  const w = 580, h = 240;
  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const rev = revenue || DATA.FINANCIALS.equity.slice(0, 3);
  const ebd = ebitda || DATA.FINANCIALS.debt.slice(0, 3);
  years = years || DATA.FINANCIALS.years.slice(0, 3);
  const labelA = (labels && labels.a) || 'Egenkapital';
  const labelB = (labels && labels.b) || 'Gæld';
  const max = Math.max(...rev, ...ebd) * 1.1;
  const cw = (w - pad.l - pad.r) / years.length;
  const x = (i) => pad.l + i * cw + cw / 2;
  const y = (v) => h - pad.b - (v / max) * (h - pad.t - pad.b);
  const revPath = rev.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const ebdPath = ebd.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const revArea = revPath + ` L ${x(rev.length-1)} ${h-pad.b} L ${x(0)} ${h-pad.b} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {[0, max * 0.25, max * 0.5, max * 0.75, max].map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w-pad.r} y1={y(v)} y2={y(v)} stroke="var(--c-line-2)" strokeWidth="1"/>
          <text x={pad.l - 6} y={y(v) + 3} fill="var(--c-text-3)" fontSize="9" textAnchor="end" fontFamily="var(--mono)">{v.toFixed(0)}</text>
        </g>
      ))}
      <path d={revArea} fill="var(--c-ink)" opacity="0.05"/>
      <path d={revPath} fill="none" stroke="var(--c-ink)" strokeWidth="1.8"/>
      <path d={ebdPath} fill="none" stroke="var(--c-success)" strokeWidth="1.5" strokeDasharray="3 3"/>
      {rev.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#fff" stroke="var(--c-ink)" strokeWidth="1.5"/>)}
      {ebd.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2" fill="var(--c-success)"/>)}
      {years.map((yr, i) => <text key={yr} x={x(i)} y={h - pad.b + 14} fill="var(--c-text-3)" fontSize="10" textAnchor="middle">{yr}</text>)}
      <g transform={`translate(${w-220}, 4)`}>
        <rect x="0" y="0" width="10" height="10" fill="var(--c-ink)"/><text x="14" y="9" fill="var(--c-text-2)" fontSize="10">{labelA}</text>
        <line x1={14 + 70} x2={14 + 84} y1="5" y2="5" stroke="var(--c-success)" strokeDasharray="3 3" strokeWidth="1.5"/><text x={14 + 88} y="9" fill="var(--c-text-2)" fontSize="10">{labelB}</text>
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Årsregnskaber - 3 års overblik
   Public-data table grouped into Resultat, Balance, Nøgletal
   ──────────────────────────────────────────────────────────────────────── */
const ANNUAL_REPORT = {
  years: ['2023', '2024', '2025', 'Saldobalance 2026'],
  ytdIndex: 3,
  groups: [
    {
      label: 'Resultat',
      rows: [
        { label: 'Nettoomsætning',                  values: [null, null, null, null], note: 'Ikke tilgængeligt i offentligt regnskab' },
        { label: 'Vareforbrug',                      values: [null, null, null, null], note: 'Ikke tilgængeligt i offentligt regnskab' },
        { label: 'Bruttofortjeneste',                values: [12.8, 15.2, 18.5, null] },
        { label: 'Personaleomkostninger',            values: [-9.5, -11.0, -13.5, null] },
        { label: 'EBITDA',                           values: [1.3, 1.9, 2.4, null], computed: true },
        { label: 'Afskrivninger',                    values: [-0.7, -0.8, -1.0, null] },
        { label: 'Resultat før finansielle poster',  values: [0.6, 1.1, 1.4, null], computed: true },
        { label: 'Finansielle omkostninger',         values: [-0.3, -0.4, -0.4, null] },
        { label: 'Årets resultat',                   values: [0.3, 0.7, 1.0, null] },
      ],
    },
    {
      label: 'Balance',
      rows: [
        { label: 'Anlægsaktiver',         values: [4.2, 4.8, 6.0, null] },
        { label: 'Omsætningsaktiver',     values: [5.2, 6.4, 8.0, null] },
        { label: 'Likvide beholdninger',  values: [1.0, 1.4, 1.9, null] },
        { label: 'Aktiver i alt',         values: [9.4, 11.2, 14.0, null], computed: true },
        { label: 'Egenkapital',           values: [3.5, 4.8, 6.2, null] },
        { label: 'Langfristet gæld',      values: [3.5, 3.8, 4.6, null] },
        { label: 'Kortfristet gæld',      values: [2.4, 2.6, 3.2, null] },
        { label: 'Gæld i alt',            values: [5.9, 6.4, 7.8, null], computed: true, finding: true },
      ],
    },
    {
      label: 'Nøgletal',
      rows: [
        { label: 'Bruttomargin %',     values: [null, null, null, null], note: 'Kræver omsætning som ikke er tilgængelig' },
        { label: 'EBITDA-margin %',     values: [null, null, null, null], note: 'Kræver omsætning som ikke er tilgængelig' },
        { label: 'Soliditetsgrad %',    values: [37.2, 42.9, 44.3, null], computed: true, percent: true },
        { label: 'Gæld / EBITDA',       values: [4.5, 3.4, 3.3, null], computed: true, decimals: 1 },
        { label: 'Likviditetsgrad',     values: [2.2, 2.5, 2.5, null], computed: true, decimals: 1 },
      ],
    },
  ],
};

function formatNum(v, opts) {
  if (v == null) return 'Ikke oplyst';
  const decimals = opts && opts.decimals != null ? opts.decimals : 1;
  const negative = v < 0;
  const abs = Math.abs(v);
  let s = abs.toLocaleString('da-DK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return negative ? `−${s}` : s;
}

function AnnualReportSection({ go }) {
  const [unit, setUnit] = React.useState('mio'); // 'mio' | 'thousand'
  const scale = unit === 'mio' ? 1 : 1000;
  const ytdIdx = ANNUAL_REPORT.ytdIndex;

  const requestFromCustomer = () => {
    try {
      localStorage.setItem('kabul:case-stage:nordhavn', 'material-selection');
      sessionStorage.setItem('kabul:focus-material', '1');
    } catch (e) {}
    if (go) go("workspace:1");
  };

  return (
    <FinSection
      title="Årsregnskaber - 3 års overblik"
      sub="Officielle årsrapporter fra CVR. Saldobalance 2026 hentes når kunden har afleveret materialet."
    >
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}/>
        <div style={{
          display: 'inline-flex', alignItems: 'center', padding: 2,
          background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', borderRadius: 7,
        }}>
          {[
            { k: 'mio',      l: 'DKK mio.' },
            { k: 'thousand', l: 'DKK t.' },
          ].map(u => {
            const active = unit === u.k;
            return (
              <button
                key={u.k}
                onClick={() => setUnit(u.k)}
                style={{
                  height: 22, padding: '0 10px',
                  border: 0,
                  background: active ? '#fff' : 'transparent',
                  color: active ? 'var(--c-ink)' : 'var(--c-text-2)',
                  fontSize: 11.5, fontWeight: 500,
                  borderRadius: 5, cursor: 'pointer',
                  boxShadow: active ? '0 1px 2px rgba(15,17,20,0.06)' : 'none',
                }}
              >
                {u.l}
              </button>
            );
          })}
        </div>
      </div>

      {(
        <>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="tbl" style={{ fontSize: 12.5, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontWeight: 600, color: 'var(--c-text-2)' }}>Regnskabspost</th>
                  {ANNUAL_REPORT.years.map((y, i) => {
                    if (i === ytdIdx) {
                      return (
                        <th key={y} style={{ textAlign: 'center', fontWeight: 600, width: 120, whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={requestFromCustomer}
                            title="Gå til Overblik og vælg hvad kunden skal sende"
                            style={{
                              background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                              color: 'var(--c-text-2)', fontFamily: 'inherit',
                              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                              textAlign: 'center',
                            }}
                            onMouseEnter={(e) => {
                              const link = e.currentTarget.querySelector('span[data-link]');
                              if (link) link.style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                              const link = e.currentTarget.querySelector('span[data-link]');
                              if (link) link.style.textDecoration = 'none';
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: 'inherit', color: 'var(--c-text-2)' }}>2026</span>
                            <span data-link style={{ fontWeight: 500, fontSize: 10.5, color: 'var(--c-primary)' }}>Anmod fra kunde</span>
                          </button>
                        </th>
                      );
                    }
                    return (
                      <th key={y} style={{ textAlign: 'right', fontWeight: 600, color: 'var(--c-text-2)' }}>{y}</th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ANNUAL_REPORT.groups.map((g, gi) => (
                  <React.Fragment key={g.label}>
                    <tr>
                      <td
                        colSpan={1 + ANNUAL_REPORT.years.length}
                        style={{
                          padding: '12px 14px 6px',
                          background: 'var(--c-surface-2)',
                          borderTop: gi === 0 ? 'none' : '1px solid var(--c-line)',
                          fontSize: 11, fontWeight: 600,
                          letterSpacing: '0.06em', textTransform: 'uppercase',
                          color: 'var(--c-text-2)',
                        }}
                      >
                        {g.label}
                      </td>
                    </tr>
                    {g.rows.map((r, ri) => (
                      <tr key={r.label}>
                        <td style={{
                          padding: '9px 14px',
                          borderTop: '1px solid var(--c-line-2)',
                          color: 'var(--c-ink)',
                          fontWeight: r.finding ? 500 : 400,
                        }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {r.finding && (
                              <span
                                title="Finding tilknyttet - se ovenfor"
                                aria-label="Finding tilknyttet"
                                style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-warn)', flexShrink: 0 }}
                              />
                            )}
                            <span>{r.label}</span>
                          </span>
                        </td>
                        {r.values.map((v, i) => {
                          const isNA = v == null;
                          const isYtd = i === ytdIdx;
                          let display, color, italic = false, tip;
                          if (!isNA) {
                            display = r.percent
                              ? formatNum(v, { decimals: 1 }) + '%'
                              : formatNum(v * (r.percent || r.decimals != null ? 1 : scale), { decimals: r.decimals != null ? r.decimals : 1 });
                            color = 'var(--c-ink)';
                          } else if (isYtd) {
                            display = '';
                            color = 'var(--c-text-4)';
                          } else {
                            display = 'Ikke tilgængeligt';
                            color = 'var(--c-text-3)';
                            italic = true;
                            tip = r.note;
                          }
                          return (
                            <td
                              key={i}
                              title={tip || ''}
                              className={isNA ? '' : 'mono num'}
                              style={{
                                textAlign: 'right',
                                padding: '9px 14px',
                                borderTop: '1px solid var(--c-line-2)',
                                color,
                                fontStyle: italic ? 'italic' : 'normal',
                                fontSize: isNA && !isYtd ? 11.5 : 'inherit',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Source row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderTop: '1px solid var(--c-line)',
              background: 'var(--c-surface-2)',
              fontSize: 11, color: 'var(--c-text-3)', flexWrap: 'wrap', gap: 8,
            }}>
              <span>Kilder: Årsrapport 2023 · Årsrapport 2024 · Årsrapport 2025 · CVR</span>
              <button
                style={{
                  background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                  color: 'var(--c-primary)', fontSize: 11.5, fontWeight: 500,
                }}
              >
                Åbn årsrapport
              </button>
            </div>
          </div>

          {/* Note about Danish annual reports */}
          <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--c-text-3)', lineHeight: 1.5 }}>
            Bemærk: Nettoomsætning og vareforbrug er ikke altid oplyst særskilt i danske årsrapporter - de kan være samlet i bruttofortjeneste.
          </div>
        </>
      )}
    </FinSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Ejerstruktur - simpelt træ med to ejere → ét selskab
   ──────────────────────────────────────────────────────────────────────── */
function SimpleOwnershipTree() {
  const co = DATA.COMPANY;
  const owners = [
    { name: "Anders Nielsen", pct: 75 },
    { name: "Lise Sørensen",  pct: 25 },
  ];

  return (
    <div className="card" style={{ padding: '22px 18px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, maxWidth: 480, margin: '0 auto', width: '100%' }}>
        {/* Owners */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
          {owners.map((o, i) => (
            <div key={i} style={{
              border: '1px solid var(--c-line)', borderRadius: 8,
              background: 'var(--c-surface)',
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              minWidth: 0,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
                display: 'grid', placeItems: 'center', color: 'var(--c-text-2)',
                flexShrink: 0,
              }}>
                <I.User size={13}/>
              </span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.name}
                </span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{o.pct}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quiet vertical connector */}
        <div aria-hidden="true" style={{ width: 1, height: 24, background: 'var(--c-line)' }}/>

        {/* Company */}
        <div style={{
          border: '1px solid var(--c-line)', borderRadius: 8,
          background: 'var(--c-surface)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          minWidth: 280,
        }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
            display: 'grid', placeItems: 'center', color: 'var(--c-text-2)',
            fontWeight: 600, fontSize: 11,
            flexShrink: 0,
          }}>
            {co.short || 'NC'}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{co.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 1 }}>
              <span className="mono">CVR {String(co.cvr).replace(/\s+/g, '')}</span> · Ikke i koncern
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Trustpilot score section
   ──────────────────────────────────────────────────────────────────────── */
function TrustpilotStars({ rating, size }) {
  size = size || 14;
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#00B67A' : 'var(--c-line-strong)', fontSize: size }}>★</span>
      ))}
    </span>
  );
}

function TrustpilotSection() {
  const score = 4.2;
  const totalReviews = 127;
  const dist = [
    { stars: 5, count: 78 },
    { stars: 4, count: 26 },
    { stars: 3, count: 11 },
    { stars: 2, count: 7 },
    { stars: 1, count: 5 },
  ];
  const reviews = [
    { stars: 5, text: "Professionelt team og høj kvalitet på produkterne. Levering til tiden og god kommunikation undervejs.", author: "Klaus M.", date: "12. maj 2026" },
    { stars: 4, text: "Generelt gode oplevelser. Responstiden på forespørgsler kunne forbedres.", author: "Mette H.", date: "3. april 2026" },
    { stars: 5, text: "Har samarbejdet med dem i 3 år. Stabil leverandør med god faglig kompetence.", author: "Peter L.", date: "18. marts 2026" },
  ];
  const maxCount = Math.max(...dist.map(d => d.count));

  return (
    <FinSection
      title="Trustpilot"
      sub="Kundeanmeldelser fra Trustpilot. Soft signal – bør sammenholdes med faktisk kundefastholdelse og ordrebog."
      badge={<StatusTag kind="success">4.2 / 5.0</StatusTag>}
    >
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Score overview */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          minWidth: 100, paddingRight: 24, borderRight: '1px solid var(--c-line-2)',
        }}>
          <div style={{ fontSize: 38, fontWeight: 700, color: '#00B67A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {score.toFixed(1)}
          </div>
          <TrustpilotStars rating={score} size={18}/>
          <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>{totalReviews} anmeldelser</div>
        </div>

        {/* Distribution bars */}
        <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
          {dist.map(d => (
            <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--c-text-3)', width: 14, textAlign: 'right', flexShrink: 0 }}>{d.stars}</span>
              <span style={{ color: '#00B67A', fontSize: 11, flexShrink: 0 }}>★</span>
              <div style={{ flex: 1, height: 6, background: 'var(--c-line-2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(d.count / maxCount) * 100}%`, height: '100%', background: '#00B67A', borderRadius: 3 }}/>
              </div>
              <span style={{ fontSize: 11, color: 'var(--c-text-3)', width: 22, textAlign: 'right', flexShrink: 0 }}>{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent reviews */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 4 }}>Seneste anmeldelser</div>
        {reviews.map((r, i) => (
          <div key={i} style={{ borderTop: '1px solid var(--c-line-2)', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <TrustpilotStars rating={r.stars} size={12}/>
              <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{r.author} · {r.date}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.5 }}>{r.text}</div>
          </div>
        ))}
      </div>
    </FinSection>
  );
}

window.WSFinancials = WSFinancials;
window.AnnualReportSection = AnnualReportSection;
window.SimpleOwnershipTree = SimpleOwnershipTree;
