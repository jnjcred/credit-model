// Porteføljeoverblik - kreditkontorets monitorering på tværs af portefølje
function PortfolioOverview({ go }) {
  const [tab, setTab] = React.useState("oversigt");
  const [filter, setFilter] = React.useState([]);
  return (
    <>
      <Topbar
        crumbs={["Portefølje", "Overblik"]}
        right={
          <>
            <button className="btn btn-sm btn-ghost"><I.Download className="ic"/> Gem rapport</button>
            <button className="btn btn-sm btn-primary"><I.Download className="ic"/> Eksportér</button>
          </>
        }
      />

      <div className="scroll">
        <div className="page page-wide" style={{ maxWidth: 1480, padding: '20px 28px 80px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Porteføljeoverblik
                <I.ChevronDown size={16} style={{ color: 'var(--c-text-3)', marginTop: 6 }}/>
              </h1>
              <div className="page-sub">Overblik over samlede 1.000 lån · 8,7 mia. DKK i udlån</div>
            </div>
            <div className="hstack" style={{ gap: 6 }}>
              <button className="btn btn-sm"><I.Calendar className="ic"/> Seneste data: 20. maj 2026 <I.ChevronDown className="ic"/></button>
              <button className="btn btn-sm">Alle forretningsområder <I.ChevronDown className="ic"/></button>
              <button className="btn btn-sm"><I.Filter className="ic"/> Filter</button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--c-line)', marginBottom: 22 }}>
            {[
              { k: "oversigt", l: "Oversigt" },
              { k: "risiko", l: "Risikomarkører" },
              { k: "eksp", l: "Eksponering" },
              { k: "trends", l: "Trends" },
              { k: "watch", l: "Overvågning" },
              { k: "reports", l: "Rapporter" },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                style={{
                  padding: '8px 14px', marginBottom: -1, border: 'none', background: 'transparent',
                  borderBottom: tab === t.k ? '2px solid var(--c-ink)' : '2px solid transparent',
                  color: tab === t.k ? 'var(--c-ink)' : 'var(--c-text-2)',
                  fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
                }}>{t.l}</button>
            ))}
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 18 }}>
            <KpiCard label="Samlet udlån" value="8,7 mia." unit="DKK" sub="Fordelt på 1.000 lån" icon={<I.Database size={14}/>}/>
            <KpiCard label="Gns. eksponering pr. lån" value="8,7 mio." unit="DKK" sub="Median 3,2 mio." icon={<I.Users size={14}/>}/>
            <KpiCard label="Risikomarkører" value="147" sub="Kunder med høj eller kritisk risiko" icon={<I.Flag size={14}/>} accent="danger"/>
            <KpiCard label="Stigende risiko" value="253" sub="Kunder med forværring i risiko" icon={<I.TrendUp size={14}/>} accent="warn"/>
            <KpiCard label="Watchlist" value="86" sub="Kunder under observation" icon={<I.Eye size={14}/>} accent="info"/>
            <KpiCard label="Ingen markører" value="514" sub="Kunder uden aktuelle markører" icon={<I.CheckCircle size={14}/>} accent="success"/>
          </div>

          {/* Mid row: donut + trend + top 5 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1.2fr', gap: 12, marginBottom: 18 }}>
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Fordeling af risikomarkører</div>
                  <div className="card-sub">Antal kunder</div>
                </div>
              </div>
              <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 18 }}>
                <RiskDonut/>
                <div style={{ flex: 1, fontSize: 12.5 }}>
                  {[
                    { l: "Kritisk risiko", n: 37, p: "3,7%", c: "var(--c-danger)" },
                    { l: "Høj risiko", n: 110, p: "11,0%", c: "#d97706" },
                    { l: "Moderat risiko", n: 214, p: "21,4%", c: "var(--c-warn)" },
                    { l: "Lav risiko", n: 125, p: "12,5%", c: "#5b6cdb" },
                    { l: "Ingen markører", n: 514, p: "51,4%", c: "var(--c-success)" },
                  ].map(r => (
                    <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.c, flexShrink: 0 }}/>
                      <span style={{ flex: 1, color: 'var(--c-text)' }}>{r.l}</span>
                      <span className="mono num" style={{ fontWeight: 500 }}>{r.n}</span>
                      <span className="muted" style={{ fontSize: 11, width: 42, textAlign: 'right' }}>{r.p}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--c-line-2)' }}>
                <button className="btn btn-sm btn-ghost" style={{ padding: 0 }}>Se alle markører <I.ArrowRight className="ic"/></button>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Udvikling i kunder med høj/kritisk risiko</div>
                  <div className="card-sub">Antal kunder · seneste 7 mdr</div>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <RiskTrend/>
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--c-line-2)' }}>
                <button className="btn btn-sm btn-ghost" style={{ padding: 0 }}>Se udviklingsdetaljer <I.ArrowRight className="ic"/></button>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Top 5 hyppigste risikomarkører</div>
                  <div className="card-sub">På tværs af porteføljen</div>
                </div>
              </div>
              <div style={{ padding: '4px 16px 12px' }}>
                {[
                  { l: "Faldende EBITDA", n: 312, p: 31.2, c: "var(--c-danger)" },
                  { l: "Høj afhængighed af få kunder", n: 286, p: 28.6, c: "#d97706" },
                  { l: "Negativ egenkapital", n: 198, p: 19.8, c: "var(--c-warn)" },
                  { l: "Stigende gældsgrad", n: 171, p: 17.1, c: "#5b6cdb" },
                  { l: "Likviditets­udfordringer", n: 135, p: 13.5, c: "var(--c-success)" },
                ].map(r => (
                  <div key={r.l} style={{ padding: '10px 0', borderBottom: '1px solid var(--c-line-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <I.Flag size={11} style={{ color: r.c }}/>
                      <span style={{ flex: 1, fontSize: 12.5, color: 'var(--c-text)' }}>{r.l}</span>
                      <span className="mono num" style={{ fontWeight: 500 }}>{r.n}</span>
                      <span className="muted" style={{ fontSize: 11, width: 42, textAlign: 'right' }}>{r.p}%</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--c-line-2)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: r.p * 2.5 + '%', background: r.c }}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--c-line-2)' }}>
                <button className="btn btn-sm btn-ghost" style={{ padding: 0 }}>Se alle risikomarkører <I.ArrowRight className="ic"/></button>
              </div>
            </div>
          </div>

          {/* Big table + sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-head">
                <div className="hstack" style={{ gap: 10 }}>
                  <div className="card-title">Kunder med høj eller kritisk risiko</div>
                  <span style={{ background: 'var(--c-danger-bg)', color: 'var(--c-danger)', padding: '1px 7px', borderRadius: 999, fontSize: 11.5, fontWeight: 600 }}>147</span>
                </div>
                <div className="hstack" style={{ gap: 6 }}>
                  <span className="muted" style={{ fontSize: 12 }}>Vis</span>
                  <button className="btn btn-sm">25 rækker <I.ChevronDown className="ic"/></button>
                  <button className="btn btn-sm btn-ghost"><I.Layout className="ic"/> Tilpas kolonner</button>
                  <button className="btn btn-sm btn-ghost"><I.Boxes className="ic"/></button>
                </div>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}></th>
                    <th>Kunde</th>
                    <th>CVR</th>
                    <th style={{ textAlign: 'right' }}>Eksponering (DKK)</th>
                    <th>Risikoklasse</th>
                    <th>Vigtigste risikomarkører</th>
                    <th>Risikoudvikling (30 dage)</th>
                    <th>Seneste data</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {PORTFOLIO_ROWS.map((r, i) => (
                    <tr key={i} onClick={() => go("workspace:1")}>
                      <td><I.Star size={13} style={{ color: r.starred ? 'var(--c-warn)' : 'var(--c-line-strong)' }}/></td>
                      <td><span style={{ fontWeight: 500, color: 'var(--c-ink)' }}>{r.name}</span></td>
                      <td className="mono" style={{ fontSize: 12 }}>{r.cvr}</td>
                      <td className="mono num" style={{ textAlign: 'right', fontWeight: 500 }}>{r.exp}</td>
                      <td>{riskClassPill(r.risk)}</td>
                      <td><span className="muted" style={{ fontSize: 12.5 }}>{r.markers}</span></td>
                      <td><RiskSpark dir={r.trend}/></td>
                      <td className="muted" style={{ fontSize: 12 }}>{r.date}</td>
                      <td><button className="btn btn-sm btn-ghost" onClick={e => e.stopPropagation()}><I.MoreH className="ic"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--c-line-2)', display: 'flex' }}>
                <button className="btn btn-sm btn-ghost" style={{ padding: 0 }}>Se alle 147 kunder <I.ArrowRight className="ic"/></button>
              </div>
            </div>

            {/* Filter sidebar */}
            <div className="card" style={{ alignSelf: 'flex-start' }}>
              <div className="card-head">
                <div className="card-title">Find kunder med specifikke markører</div>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Vælg risikomarkører</label>
                  <div style={{ border: '1px solid var(--c-line-strong)', borderRadius: 6, padding: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <span className="tag" style={{ background: 'var(--c-primary)', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Faldende EBITDA <I.X size={10}/></span>
                    <span className="tag" style={{ background: 'var(--c-primary)', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Høj afh. af få kunder <I.X size={10}/></span>
                    <input placeholder="Søg flere…" style={{ border: 'none', padding: '2px 4px', fontSize: 12, flex: 1, minWidth: 80, outline: 'none' }}/>
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Vælg risikoklasse</label>
                  <button className="input" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>Alle <I.ChevronDown className="ic"/></button>
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Vælg forretningsområde</label>
                  <button className="input" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>Alle <I.ChevronDown className="ic"/></button>
                </div>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Min. eksponering (DKK)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="input mono" placeholder="Fra" style={{ flex: 1 }}/>
                    <span className="muted">-</span>
                    <input className="input mono" placeholder="Til" style={{ flex: 1 }}/>
                  </div>
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>
                  Vis 86 kunder <I.ArrowRight className="ic"/>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 22, padding: '12px 4px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: 'var(--c-text-3)' }}>
            <span>Data leveret af</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--c-ink)', fontWeight: 500 }}>
              <span className="brand-mark" style={{ width: 16, height: 16, fontSize: 8 }}>cw</span> Crediwire
            </span>
            <span style={{ marginLeft: 'auto' }}>Seneste opdatering: 20. maj 2026 kl. 08:30</span>
            <button className="icon-btn"><I.Refresh size={12}/></button>
          </div>
        </div>
      </div>
    </>
  );
}

const PORTFOLIO_ROWS = [
  { name: "GreenTech Solutions A/S", cvr: "12345678", exp: "25.000.000", risk: "kritisk", markers: "Faldende EBITDA, Negativ egenkapital", trend: "up", date: "17. maj 2026", starred: false },
  { name: "Nordic Steel ApS", cvr: "23456789", exp: "18.500.000", risk: "kritisk", markers: "Likviditets­udfordringer, Stigende gældsgrad", trend: "up", date: "16. maj 2026", starred: false },
  { name: "Urban Energy A/S", cvr: "34567890", exp: "35.750.000", risk: "høj", markers: "Faldende EBITDA, Høj afh. af få kunder", trend: "up", date: "15. maj 2026", starred: true },
  { name: "Furniture Design ApS", cvr: "45678901", exp: "9.800.000", risk: "høj", markers: "Stigende gældsgrad, Negativ egenkapital", trend: "up", date: "14. maj 2026", starred: false },
  { name: "Ocean Logistics A/S", cvr: "56789012", exp: "41.200.000", risk: "høj", markers: "Høj afh. af få kunder, Faldende EBITDA", trend: "up", date: "14. maj 2026", starred: false },
  { name: "BioMaterials ApS", cvr: "67890123", exp: "6.300.000", risk: "moderat", markers: "Stigende gældsgrad", trend: "flat", date: "13. maj 2026", starred: false },
  { name: "Scan Packaging A/S", cvr: "78901234", exp: "7.900.000", risk: "moderat", markers: "Faldende EBITDA", trend: "down", date: "12. maj 2026", starred: false },
  { name: "BlueWater Tech ApS", cvr: "89012345", exp: "12.400.000", risk: "moderat", markers: "Likviditets­udfordringer", trend: "flat", date: "11. maj 2026", starred: false },
];

function riskClassPill(r) {
  if (r === "kritisk") return <span className="pill danger" style={{ fontSize: 11 }}>Kritisk</span>;
  if (r === "høj") return <span className="pill" style={{ fontSize: 11, background: '#fef0db', color: '#a8580c' }}>Høj</span>;
  if (r === "moderat") return <span className="pill warn" style={{ fontSize: 11 }}>Moderat</span>;
  if (r === "lav") return <span className="pill info" style={{ fontSize: 11 }}>Lav</span>;
  return <span className="pill outline" style={{ fontSize: 11 }}>Ingen</span>;
}

function KpiCard({ label, value, unit, sub, icon, accent }) {
  const ac = { danger: 'var(--c-danger)', warn: 'var(--c-warn)', info: '#5b6cdb', success: 'var(--c-success)' }[accent];
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="kpi-lbl">{label}</div>
        <div style={{ color: ac || 'var(--c-text-3)' }}>{icon}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 6, letterSpacing: '-0.02em', color: 'var(--c-ink)', fontVariantNumeric: 'tabular-nums' }}>
        {value}{unit && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-2)', marginLeft: 4 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function RiskDonut() {
  const segs = [
    { val: 37, c: "var(--c-danger)" },
    { val: 110, c: "#d97706" },
    { val: 214, c: "var(--c-warn)" },
    { val: 125, c: "#5b6cdb" },
    { val: 514, c: "var(--c-success)" },
  ];
  const total = segs.reduce((s, x) => s + x.val, 0);
  const r = 56, cx = 70, cy = 70, sw = 18;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {segs.map((s, i) => {
        const len = (s.val / total) * C;
        const dash = `${len} ${C - len}`;
        const offset = -acc;
        acc += len;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.c} strokeWidth={sw}
            strokeDasharray={dash} strokeDashoffset={offset} transform={`rotate(-90 ${cx} ${cy})`}/>
        );
      })}
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--c-ink)" fontFamily="var(--font)" letterSpacing="-0.5">1.000</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--c-text-3)" fontFamily="var(--font)">kunder</text>
    </svg>
  );
}

function RiskTrend() {
  const data = [98, 102, 115, 128, 136, 142, 147];
  const labels = ["nov '25", "dec '25", "jan '26", "feb '26", "mar '26", "apr '26", "maj '26"];
  const w = 480, h = 180, pad = { l: 28, r: 12, t: 14, b: 26 };
  const max = 200, min = 0;
  const x = (i) => pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r);
  const y = (v) => h - pad.b - ((v - min) / (max - min)) * (h - pad.t - pad.b);
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const area = `${path} L ${x(data.length-1)} ${h - pad.b} L ${x(0)} ${h - pad.b} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {[0, 50, 100, 150, 200].map(v => (
        <g key={v}>
          <line x1={pad.l} x2={w-pad.r} y1={y(v)} y2={y(v)} stroke="var(--c-line-2)" strokeWidth="1"/>
          <text x={pad.l - 5} y={y(v) + 3} fontSize="9" fontFamily="var(--mono)" fill="var(--c-text-3)" textAnchor="end">{v}</text>
        </g>
      ))}
      <path d={area} fill="var(--c-danger)" opacity="0.08"/>
      <path d={path} fill="none" stroke="var(--c-danger)" strokeWidth="1.8"/>
      {data.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="3.5" fill="#fff" stroke="var(--c-danger)" strokeWidth="1.5"/>
          <text x={x(i)} y={y(v) - 10} fontSize="10" fontFamily="var(--mono)" fill="var(--c-text)" textAnchor="middle" fontWeight="500">{v}</text>
        </g>
      ))}
      {labels.map((l, i) => <text key={i} x={x(i)} y={h - pad.b + 14} fontSize="10" fill="var(--c-text-3)" textAnchor="middle">{l}</text>)}
    </svg>
  );
}

function RiskSpark({ dir }) {
  const data = dir === "up" ? [3, 5, 4, 6, 8, 9, 11]
    : dir === "down" ? [11, 9, 8, 6, 4, 5, 3]
    : [6, 5, 7, 6, 5, 6, 5];
  const color = dir === "up" ? "var(--c-danger)" : dir === "down" ? "var(--c-success)" : "var(--c-warn)";
  const w = 70, h = 18;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length-1)) * (w - 8)},${h - ((v - min) / (max - min || 1)) * (h - 4) - 2}`).join(' ');
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {dir === "up" && <I.ArrowRight size={11} style={{ color, transform: 'rotate(-25deg)' }}/>}
      {dir === "down" && <I.ArrowRight size={11} style={{ color, transform: 'rotate(25deg)' }}/>}
      {dir === "flat" && <I.ArrowRight size={11} style={{ color }}/>}
    </div>
  );
}

window.PortfolioOverview = PortfolioOverview;
