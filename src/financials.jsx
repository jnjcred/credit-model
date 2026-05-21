// Financials + Budget vs Actual
function WSFinancials() {
  const f = DATA.FINANCIALS;
  return (
    <div className="page page-wide" style={{ maxWidth: 1320 }}>
      {/* KPIs */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
        {[
          { l: "Omsætning", v: "18,5M", d: "+21,7%", dir: "up", spark: f.revenue.slice(0,3) },
          { l: "EBITDA", v: "2,4M", d: "+26,3%", dir: "up", spark: f.ebitda.slice(0,3) },
          { l: "Brutto­margin", v: "31,6%", d: "+1,5pp", dir: "up", spark: f.grossMargin.slice(0,3) },
          { l: "Egenkapital", v: "6,2M", d: "+33,4%", dir: "up", spark: f.equity.slice(0,3) },
          { l: "Gæld / EBITDA", v: "2,9x", d: "-0,4x", dir: "up", spark: [4.5, 3.3, 2.9] },
        ].map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-lbl">{k.l}</div>
            <div className="kpi-val mono">{k.v}</div>
            <div className={"kpi-delta " + k.dir}>{k.dir === 'up' ? <I.TrendUp size={12}/> : <I.TrendDown size={12}/>} {k.d}</div>
            <div style={{ marginTop: 8 }}>
              <MiniSpark data={k.spark}/>
            </div>
          </div>
        ))}
      </div>

      <div className="grid g-2" style={{ gap: 16 }}>
        {/* Big income chart */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Resultatudvikling</div>
              <div className="card-sub">2023–2025 · seneste periodetal Q1 2026 · budget 2026</div>
            </div>
            <div className="hstack">
              <button className="btn btn-sm btn-ghost">3 år</button>
              <button className="btn btn-sm">5 år</button>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <IncomeChart/>
          </div>
        </div>

        {/* Multi-year table */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Hovedtal</div>
              <div className="card-sub">DKK millioner</div>
            </div>
            <button className="btn btn-sm btn-ghost"><I.Download className="ic"/> Eksport</button>
          </div>
          <div style={{ padding: '0 4px' }}>
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
      </div>

      {/* Budget vs actual — DETAILED */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Budget vs realiseret · 2026</div>
            <div className="card-sub">Månedsbasis · markeringer fra AI-gennemgang</div>
          </div>
          <div className="hstack">
            <span className="ai-hint"><I.Spark className="spark"/> 1 afvigelse markeret</span>
            <button className="btn btn-sm btn-ghost"><I.Download className="ic"/></button>
          </div>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <BudgetChart data={DATA.BUDGET_VS_ACTUAL}/>
        </div>
        <div style={{ padding: '14px 20px 18px', borderTop: '1px solid var(--c-line-2)', background: 'var(--c-warn-bg)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <I.AlertTriangle size={16} style={{ color: 'var(--c-warn)', marginTop: 2 }}/>
          <div style={{ flex: 1, fontSize: 13 }}>
            <div style={{ fontWeight: 500, color: 'var(--c-warn)' }}>Juli budget stiger 25,0% mod juni</div>
            <div style={{ color: 'var(--c-text-2)', marginTop: 3 }}>Spring fra 2,0M til 2,5M uden lignende mønster i 2023–2025. Forklaring kunne være Block-Island ordre Q3.</div>
            <div style={{ marginTop: 8 }}>
              <span className="source"><I.File className="ic"/> Budget_2026-28_v3.xlsx · linje 197</span>
            </div>
          </div>
          <button className="btn btn-sm">Tilføj til spørgsmål</button>
        </div>
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
