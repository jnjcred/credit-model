// Financials — credit-case financial overview
const FIN_VIEWS = [
  { k: "all",        l: "Alle" },
  { k: "kpi",        l: "Nøgletal" },
  { k: "budget",     l: "Budget" },
  { k: "market",     l: "Marked" },
  { k: "ownership",  l: "Ejerskab" },
  { k: "findings",   l: "Findings" },
];

function WSFinancials() {
  const f = DATA.FINANCIALS;
  const [view, setView] = React.useState("all");
  const show = (k) => view === "all" || view === k;

  return (
    <div className="page page-wide" style={{ maxWidth: 1080, padding: '24px 32px 80px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: 0 }}>Finansielt overblik</h1>
        <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 4, maxWidth: 720 }}>
          Seneste regnskaber, periodetal, budget, marked og finansielle findings samlet ét sted.
        </div>
      </div>

      {/* Section filter */}
      <div
        role="tablist"
        aria-label="Filtrér sektioner"
        style={{
          position: 'sticky', top: 0, zIndex: 5,
          display: 'flex', flexWrap: 'wrap', gap: 6,
          padding: '10px 0',
          marginBottom: 8,
          background: 'var(--c-bg)',
        }}
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

      {/* 1. Samlet vurdering — only on "Alle" */}
      {view === "all" && (
      <FinSection
        title="Samlet finansiel vurdering"
        sub="Hovedtræk i den finansielle profil på baggrund af nuværende datagrundlag."
        badge={<StatusTag kind="warn">Kræver opfølgning</StatusTag>}
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            "Omsætningen er vokset stabilt frem til 2025, men 2026 YTD ligger under budget.",
            "EBITDA-marginen er forbedret, men afhænger af realisering af ordreindgang i H2.",
            "Likviditeten er acceptabel, men gældsgraden bør følges tæt.",
            "Én væsentlig budgetafvigelse i juli kræver forklaring.",
          ].map((b, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 13, color: 'var(--c-text)', lineHeight: 1.55 }}>
              <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-text-4)', flexShrink: 0, transform: 'translateY(-2px)' }}/>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </FinSection>
      )}

      {/* 2. Datagrundlag — only on "Alle" */}
      {view === "all" && (
      <FinSection
        title="Datagrundlag"
        sub="Årsregnskaber viser den historiske udvikling. Periodetal viser, hvordan virksomheden performer efter seneste årsafslutning."
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DataBasisCard
            title="Årsregnskaber"
            description="Officielle regnskaber fra CVR, typisk reviderede eller indberettede årsrapporter. Bruges til historik, kapitalstruktur og langsigtet udvikling."
            chips={["2023", "2024", "2025"]}
            source="CVR-registret"
            status="Modtaget"
          />
          <DataBasisCard
            title="Periodetal"
            description="Nyere månedlige eller kvartalsvise tal fra ERP, økonomisystem eller ledelsesrapportering. Bruges til at vurdere aktuel drift, budgetopfølgning og udvikling efter seneste årsregnskab."
            chips={["Q1 2026"]}
            source="e-conomic"
            status="Hentet"
            stamp="i dag · 09:01"
          />
        </div>
      </FinSection>
      )}

      {/* 3. Udvikling og nøgletal */}
      {show("kpi") && (
      <FinSection
        title="Udvikling og nøgletal"
        sub="Centrale finansielle indikatorer på baggrund af årsregnskaber og periodetal."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {KPIS.map((k, i) => <KpiCard key={i} {...k}/>)}
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-head">
            <div>
              <div className="card-title">Resultatudvikling</div>
              <div className="card-sub">Årsregnskaber 2023–2025, periodetal Q1 2026 og budget 2026</div>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <IncomeChart/>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Hovedtal</div>
              <div className="card-sub">DKK mio.</div>
            </div>
            <button className="btn btn-sm btn-ghost"><I.Download className="ic"/> Eksport</button>
          </div>
          <div style={{ padding: '0 4px 8px' }}>
            <table className="tbl" style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th></th>
                  {f.years.map(y => <th key={y} style={{ textAlign: 'right' }}>{y}</th>)}
                </tr>
              </thead>
              <tbody>
                <FinRow label="Omsætning" data={f.revenue}/>
                <FinRow label="EBITDA" data={f.ebitda}/>
                <FinRow label="Brutto­margin %" data={f.grossMargin}/>
                <FinRow label="Likviditet" data={f.liquidity}/>
                <FinRow label="Egenkapital" data={f.equity}/>
                <FinRow label="Gæld" data={f.debt}/>
              </tbody>
            </table>
          </div>
        </div>
      </FinSection>
      )}

      {/* 4. Budget vs. realiseret */}
      {show("budget") && (
      <FinSection
        title="Budget vs. realiseret"
        sub="Månedsbasis for 2026. Afvigelser markeret hvor der kræves forklaring."
      >
        <div className="card">
          <div style={{ padding: '16px 20px' }}>
            <BudgetChart data={DATA.BUDGET_VS_ACTUAL}/>
          </div>
          <div style={{ borderTop: '1px solid var(--c-line-2)' }}>
            <FindingItem
              severity="warn"
              title="Juli budget stiger 25,0% mod juni"
              body="Spring fra 2,0M til 2,5M uden lignende mønster i 2023–2025. Bør forklares af kunden."
              source="Budget_2026-28_v3.xlsx · linje 197"
              action="Tilføj til spørgsmål"
            />
          </div>
        </div>
      </FinSection>
      )}

      {/* 5. Marked og branche */}
      {show("market") && (
      <FinSection
        title="Marked og branche"
        sub="Brancheforhold der kan påvirke omsætning, marginer og risiko."
      >
        <div className="card" style={{ padding: '4px 18px' }}>
          {MARKET_SIGNALS.map((s, i) => (
            <SignalRow key={i} {...s} isFirst={i === 0}/>
          ))}
        </div>
      </FinSection>
      )}

      {/* 6. Ejerskab og finansielle bindinger */}
      {show("ownership") && (
      <FinSection
        title="Ejerskab og finansielle bindinger"
        sub="Ejerforhold, nærtstående parter og finansielle bindinger med betydning for kreditvurderingen."
      >
        <div className="card" style={{ padding: '4px 18px' }}>
          {OWNERSHIP_TIES.map((o, i) => (
            <SignalRow key={i} {...o} isFirst={i === 0}/>
          ))}
        </div>
      </FinSection>
      )}

      {/* 7. Finansielle findings */}
      {show("findings") && (
      <FinSection
        title="Finansielle findings"
        sub="Økonomiske forhold der bør vurderes eller afklares før indstilling."
      >
        <div className="card" style={{ overflow: 'hidden' }}>
          {FIN_FINDINGS.map((fnd, i) => (
            <FindingItem
              key={i}
              severity={fnd.severity}
              title={fnd.title}
              body={fnd.body}
              source={fnd.source}
              action={fnd.action}
              isFirst={i === 0}
              showSeverityTag
              severityLabel={fnd.severityLabel}
            />
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
  { label: "Omsætning", value: "18,5M", delta: "+21,7% siden 2023", dir: "up", period: "Seneste årsregnskab (2025)", note: "Stabil vækst over 3 år." },
  { label: "EBITDA", value: "2,4M", delta: "+26,3% siden 2023", dir: "up", period: "Seneste årsregnskab (2025)", note: "Marginen er forbedret." },
  { label: "Brutto­margin", value: "31,6%", delta: "+1,5pp", dir: "up", period: "Seneste årsregnskab (2025)", note: "Inden for branche-niveau." },
  { label: "Egenkapital", value: "6,2M", delta: "+33,4%", dir: "up", period: "Seneste årsregnskab (2025)", note: "Soliditet på 44%." },
  { label: "Gæld / EBITDA", value: "2,9x", delta: "−0,4x", dir: "up", period: "Seneste årsregnskab (2025)", note: "Bør følges tæt." },
  { label: "Likviditet (current ratio)", value: "1,8", delta: "−0,1", dir: "down", period: "Q1 2026", note: "Acceptabel — falder svagt." },
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
  {
    severity: "warn",
    severityLabel: "Kræver afklaring",
    title: "Budgetafvigelse i juli",
    body: "Budgettet stiger 25,0% fra juni til juli uden tilsvarende historisk mønster.",
    source: "Budget_2026-28_v3.xlsx · linje 197",
    action: "Bed om forklaring",
  },
  {
    severity: "warn",
    severityLabel: "Kræver afklaring",
    title: "Anpartshaverlån kræver afklaring",
    body: "0,5M anpartshaverlån kan påvirke vurdering af likviditet og tilbagebetalingsevne.",
    source: "Årsrapport 2025 · note 14",
    action: "Tilføj til spørgsmål",
  },
  {
    severity: "neutral",
    severityLabel: "Følg op",
    title: "Likviditeten falder svagt i Q1 2026",
    body: "Current ratio er gået fra 1,9 til 1,8. Indikerer ikke kritisk niveau, men bør følges i Q2.",
    source: "Periodetal Q1 2026 · e-conomic",
    action: "Tilføj til spørgsmål",
  },
  {
    severity: "neutral",
    severityLabel: "Følg op",
    title: "EBITDA-forbedring afhænger af H2",
    body: "Budgettet forudsætter ordreindgang i H2, der ikke fuldt understøttes af 2023–2025-mønster.",
    source: "Budget_2026-28_v3.xlsx",
    action: "Bed om forklaring",
  },
  {
    severity: "ok",
    severityLabel: "Lav risiko",
    title: "Egenkapital og soliditet",
    body: "Egenkapital er steget 33% siden 2023. Soliditet på 44% understøtter kapacitet til nyt engagement.",
    source: "Årsrapport 2025",
  },
];

function FindingItem({ severity, severityLabel, title, body, source, action, isFirst, showSeverityTag }) {
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
        <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.5 }}>{body}</div>
        {source && (
          <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <I.File size={11}/> {source}
          </div>
        )}
      </div>
      {action && (
        <button className="btn btn-sm" style={{ flexShrink: 0 }}>{action}</button>
      )}
    </div>
  );
}

function FinRow({ label, data }) {
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{label}</td>
      {data.map((v, i) => (
        <td key={i} className="mono num" style={{ textAlign: 'right', color: v === null ? 'var(--c-text-4)' : 'var(--c-ink)' }}>
          {v === null ? '—' : v.toFixed(1)}
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

function IncomeChart() {
  const w = 580, h = 240;
  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const rev = DATA.FINANCIALS.revenue;
  const ebd = DATA.FINANCIALS.ebitda;
  const years = DATA.FINANCIALS.years;
  const max = Math.max(...rev) * 1.1;
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
      {/* YTD/Budget vertical separators */}
      <line x1={x(2) + cw/2} x2={x(2) + cw/2} y1={pad.t} y2={h-pad.b} stroke="var(--c-line-strong)" strokeWidth="1" strokeDasharray="2 3"/>
      <text x={x(3)} y={pad.t + 8} fill="var(--c-text-3)" fontSize="9" textAnchor="middle">Projicering</text>
      <path d={revArea} fill="var(--c-ink)" opacity="0.05"/>
      <path d={revPath} fill="none" stroke="var(--c-ink)" strokeWidth="1.8"/>
      <path d={ebdPath} fill="none" stroke="var(--c-success)" strokeWidth="1.5" strokeDasharray="3 3"/>
      {rev.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#fff" stroke="var(--c-ink)" strokeWidth="1.5"/>)}
      {ebd.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2" fill="var(--c-success)"/>)}
      {years.map((yr, i) => <text key={yr} x={x(i)} y={h - pad.b + 14} fill="var(--c-text-3)" fontSize="10" textAnchor="middle">{yr}</text>)}
      <g transform={`translate(${w-200}, 4)`}>
        <rect x="0" y="0" width="10" height="10" fill="var(--c-ink)"/><text x="14" y="9" fill="var(--c-text-2)" fontSize="10">Omsætning</text>
        <line x1="78" x2="92" y1="5" y2="5" stroke="var(--c-success)" strokeDasharray="3 3" strokeWidth="1.5"/><text x="96" y="9" fill="var(--c-text-2)" fontSize="10">EBITDA</text>
      </g>
    </svg>
  );
}

window.WSFinancials = WSFinancials;
