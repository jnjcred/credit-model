// Porteføljeoverblik - kreditkontorets monitorering på tværs af portefølje
function PortfolioOverview({ go }) {
  const [tab, setTab] = React.useState("oversigt");
  const [filter, setFilter] = React.useState([]);
  const [sortCol, setSortCol] = React.useState("risk");
  const [sortDir, setSortDir] = React.useState("asc");

  const onSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const RISK_ORDER = { kritisk: 0, høj: 1, moderat: 2, lav: 3, ingen: 4 };
  const parseDanishDate = (s) => {
    const M = { jan:1,feb:2,mar:3,apr:4,maj:5,jun:6,jul:7,aug:8,sep:9,okt:10,nov:11,dec:12 };
    const m = s.match(/(\d+)\.\s+(\w+)\s+(\d+)/);
    return m ? parseInt(m[3])*10000 + (M[m[2]]||0)*100 + parseInt(m[1]) : 0;
  };

  const sorted = React.useMemo(() => {
    const rows = [...PORTFOLIO_ROWS];
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortCol === 'name') rows.sort((a, b) => a.name.localeCompare(b.name, 'da') * dir);
    else if (sortCol === 'exp') rows.sort((a, b) => (a.exp - b.exp) * dir);
    else if (sortCol === 'date') rows.sort((a, b) => (parseDanishDate(a.date) - parseDanishDate(b.date)) * dir);
    else rows.sort((a, b) => ((RISK_ORDER[a.risk]??5) - (RISK_ORDER[b.risk]??5)) * dir);
    return rows;
  }, [sortCol, sortDir]);

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


          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 18 }}>
            <PortfolioKpiCard label="Samlet udlån" value="8,7 mia." unit="DKK" sub="Fordelt på 1.000 aktive lån" icon={<I.Database size={14}/>}/>
            <PortfolioKpiCard label="Gns. eksponering pr. lån" value="8,7 mio." unit="DKK" sub="Median: 3,2 mio. DKK" icon={<I.Users size={14}/>}/>
            <PortfolioKpiCard label="Høj / kritisk risiko" value="147" sub="Kunder med aktive risikomarkører" icon={<I.Flag size={14}/>} accent="danger"/>
            <PortfolioKpiCard label="Stigende risiko" value="253" sub="Forværring siden seneste måling" icon={<I.TrendUp size={14}/>} accent="warn"/>
            <PortfolioKpiCard label="Watchlist" value="86" sub="Kunder under aktiv overvågning" icon={<I.Eye size={14}/>} accent="info"/>
            <PortfolioKpiCard label="Uden risikomarkører" value="514" sub="Kunder uden aktuelle risikoflag" icon={<I.CheckCircle size={14}/>} accent="success"/>
          </div>

          {/* Mid row: trend + top 5 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.2fr', gap: 12, marginBottom: 18 }}>
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
                  { l: "Høj afhængighed af få kunder", n: 286, p: 28.6, c: "var(--c-danger)" },
                  { l: "Negativ egenkapital", n: 198, p: 19.8, c: "var(--c-danger)" },
                  { l: "Stigende gældsgrad", n: 171, p: 17.1, c: "var(--c-danger)" },
                  { l: "Likviditets­udfordringer", n: 135, p: 13.5, c: "var(--c-danger)" },
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
            </div>
          </div>

          {/* Big table + sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-head">
                <div className="hstack" style={{ gap: 10 }}>
                  <div className="card-title">Alle kunder</div>
                  <span style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', padding: '1px 7px', borderRadius: 999, fontSize: 11.5, fontWeight: 600 }}>1.000</span>
                </div>
                <div className="hstack" style={{ gap: 6 }}>
                  <span className="muted" style={{ fontSize: 12 }}>Vis</span>
                  <button className="btn btn-sm">25 rækker <I.ChevronDown className="ic"/></button>
<button className="btn btn-sm btn-ghost"><I.Boxes className="ic"/></button>
                </div>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}></th>
                    <SortTh col="name" label="Kunde" sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
                    <th>CVR</th>
                    <SortTh col="exp" label="Eksponering (DKK)" sortCol={sortCol} sortDir={sortDir} onSort={onSort} style={{ textAlign: 'right' }}/>
                    <SortTh col="risk" label="Risikoklasse" sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
                    <th>Vigtigste risikomarkører</th>
                    <th>Risikoudvikling (30 dage)</th>
                    <SortTh col="date" label="Seneste data" sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr key={i} onClick={() => go("workspace:1")}>
                      <td><I.Star size={13} style={{ color: r.starred ? 'var(--c-warn)' : 'var(--c-line-strong)' }}/></td>
                      <td><span style={{ fontWeight: 500, color: 'var(--c-ink)' }}>{r.name}</span></td>
                      <td className="mono" style={{ fontSize: 12 }}>{r.cvr}</td>
                      <td className="mono num" style={{ textAlign: 'right', fontWeight: 500 }}>{r.exp.toLocaleString('da-DK')} kr.</td>
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
                <button className="btn btn-sm btn-ghost" style={{ padding: 0 }}>Se alle 1.000 kunder <I.ArrowRight className="ic"/></button>
              </div>
            </div>

            {/* Link to analyse */}
            <div className="card" style={{ alignSelf: 'flex-start' }}>
              <div className="card-head">
                <div className="card-title">Find kunder med specifikke markører</div>
              </div>
              <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5 }}>
                  Brug Porteføljeanalyse til at filtrere kunder på tværs af finansielle kriterier som omsætning, EBITDA og egenkapital.
                </p>
                <button className="btn btn-primary" onClick={() => window.__go && window.__go('analyse')}>
                  Gå til Porteføljeanalyse <I.ArrowRight className="ic"/>
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
  { name: "GreenTech Solutions A/S",     cvr: "12345678", exp: 25000000, risk: "kritisk", markers: "Faldende EBITDA, Negativ egenkapital",           trend: "up",   date: "17. maj 2026", starred: false },
  { name: "Nordic Steel ApS",            cvr: "23456789", exp: 18500000, risk: "kritisk", markers: "Likviditetsudfordringer, Stigende gældsgrad",     trend: "up",   date: "16. maj 2026", starred: false },
  { name: "Vestjylland Transport A/S",   cvr: "31847265", exp: 42800000, risk: "kritisk", markers: "Negativ egenkapital, Faldende EBITDA",            trend: "up",   date: "16. maj 2026", starred: true  },
  { name: "Randers Plast ApS",           cvr: "40192837", exp: 9200000,  risk: "kritisk", markers: "Stigende gældsgrad, Negativ egenkapital",         trend: "up",   date: "15. maj 2026", starred: false },
  { name: "Kolding Møbler A/S",          cvr: "28473619", exp: 14600000, risk: "kritisk", markers: "Faldende EBITDA, Likviditetsudfordringer",         trend: "up",   date: "15. maj 2026", starred: false },
  { name: "Sydjysk Byggeservice ApS",    cvr: "37264918", exp: 7100000,  risk: "kritisk", markers: "Høj afh. af få kunder, Negativ egenkapital",      trend: "up",   date: "14. maj 2026", starred: false },
  { name: "Fynske Fiskeri A/S",          cvr: "19284736", exp: 31400000, risk: "kritisk", markers: "Faldende EBITDA, Stigende gældsgrad",             trend: "up",   date: "14. maj 2026", starred: false },
  { name: "Bornholm Shipping ApS",       cvr: "44738291", exp: 22100000, risk: "kritisk", markers: "Likviditetsudfordringer, Faldende EBITDA",         trend: "up",   date: "13. maj 2026", starred: false },
  { name: "Midtjysk Finans ApS",         cvr: "35619274", exp: 8800000,  risk: "kritisk", markers: "Negativ egenkapital, Høj afh. af få kunder",      trend: "up",   date: "13. maj 2026", starred: false },
  { name: "Aarhus Tekstil ApS",          cvr: "26471839", exp: 11300000, risk: "kritisk", markers: "Stigende gældsgrad, Faldende EBITDA",             trend: "up",   date: "12. maj 2026", starred: false },
  { name: "Thy Maskinservice A/S",       cvr: "48362917", exp: 6400000,  risk: "kritisk", markers: "Faldende EBITDA, Likviditetsudfordringer",         trend: "up",   date: "12. maj 2026", starred: false },
  { name: "Lemvig Metal ApS",            cvr: "52917384", exp: 19700000, risk: "kritisk", markers: "Negativ egenkapital, Stigende gældsgrad",         trend: "up",   date: "11. maj 2026", starred: false },
  { name: "Urban Energy A/S",            cvr: "34567890", exp: 35750000, risk: "høj",     markers: "Faldende EBITDA, Høj afh. af få kunder",          trend: "up",   date: "15. maj 2026", starred: true  },
  { name: "Furniture Design ApS",        cvr: "45678901", exp: 9800000,  risk: "høj",     markers: "Stigende gældsgrad, Negativ egenkapital",         trend: "up",   date: "14. maj 2026", starred: false },
  { name: "Ocean Logistics A/S",         cvr: "56789012", exp: 41200000, risk: "høj",     markers: "Høj afh. af få kunder, Faldende EBITDA",          trend: "up",   date: "14. maj 2026", starred: false },
  { name: "Odense Elektronik ApS",       cvr: "61928374", exp: 13500000, risk: "høj",     markers: "Stigende gældsgrad",                              trend: "flat", date: "13. maj 2026", starred: false },
  { name: "Vejle Industri A/S",          cvr: "72839146", exp: 28600000, risk: "høj",     markers: "Faldende EBITDA",                                 trend: "up",   date: "13. maj 2026", starred: false },
  { name: "Horsens Metal ApS",           cvr: "83746291", exp: 5700000,  risk: "høj",     markers: "Høj afh. af få kunder",                           trend: "flat", date: "12. maj 2026", starred: false },
  { name: "Silkeborg Pharma ApS",        cvr: "94837162", exp: 17900000, risk: "høj",     markers: "Stigende gældsgrad, Faldende EBITDA",             trend: "up",   date: "11. maj 2026", starred: false },
  { name: "Viborg Agro A/S",             cvr: "15926374", exp: 33200000, risk: "høj",     markers: "Likviditetsudfordringer",                         trend: "flat", date: "10. maj 2026", starred: false },
  { name: "BioMaterials ApS",            cvr: "67890123", exp: 6300000,  risk: "moderat", markers: "Stigende gældsgrad",                              trend: "flat", date: "13. maj 2026", starred: false },
  { name: "Scan Packaging A/S",          cvr: "78901234", exp: 7900000,  risk: "moderat", markers: "Faldende EBITDA",                                 trend: "down", date: "12. maj 2026", starred: false },
  { name: "BlueWater Tech ApS",          cvr: "89012345", exp: 12400000, risk: "moderat", markers: "Likviditetsudfordringer",                         trend: "flat", date: "11. maj 2026", starred: false },
  { name: "Copenhagen Foods ApS",        cvr: "20384756", exp: 21800000, risk: "moderat", markers: "Høj afh. af få kunder",                           trend: "down", date: "10. maj 2026", starred: false },
  { name: "Aalborg Maritim A/S",         cvr: "30475869", exp: 9100000,  risk: "moderat", markers: "Stigende gældsgrad",                              trend: "flat", date: "9. maj 2026",  starred: false },
  { name: "Aarhus Software A/S",         cvr: "50697142", exp: 4800000,  risk: "lav",     markers: "",                                                trend: "down", date: "8. maj 2026",  starred: false },
  { name: "Fredericia Handel ApS",       cvr: "60781923", exp: 8300000,  risk: "lav",     markers: "",                                                trend: "down", date: "7. maj 2026",  starred: false },
];

function SortTh({ col, label, sortCol, sortDir, onSort, style }) {
  const active = sortCol === col;
  return (
    <th onClick={() => onSort(col)} style={{ cursor: 'pointer', userSelect: 'none', ...style }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        <span style={{ fontSize: 9, color: active ? 'var(--c-ink)' : 'var(--c-line-strong)', lineHeight: 1 }}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  );
}

function riskClassPill(r) {
  if (r === "kritisk") return <span className="pill danger" style={{ fontSize: 11 }}>Kritisk</span>;
  if (r === "høj") return <span className="pill" style={{ fontSize: 11, background: '#fef0db', color: '#a8580c' }}>Høj</span>;
  if (r === "moderat") return <span className="pill warn" style={{ fontSize: 11 }}>Moderat</span>;
  if (r === "lav") return <span className="pill info" style={{ fontSize: 11 }}>Lav</span>;
  return <span className="pill outline" style={{ fontSize: 11 }}>Ingen</span>;
}

function PortfolioKpiCard({ label, value, unit, sub, accent }) {
  const accentColor = { danger: '#dc2626', warn: '#d97706', info: '#2563eb', success: '#16a34a' }[accent] || 'var(--c-text-3)';
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 5 }}>
        {value}{unit && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--c-text-2)', marginLeft: 4 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 11.5, color: accentColor }}>{sub}</div>
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
