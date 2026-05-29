// Ownership / governance + Questions
const OWNERS_CVR = [
  { name: "Anders Holding ApS", share: 50.7, pep: false, type: "holding" },
  { name: "Vækstfonden", share: 23.6, pep: false, type: "fund" },
  { name: "Maria Lindbjerg", share: 15.6, pep: false, type: "person", role: "CTO" },
  { name: "Industrifonden A/S", share: 10.1, pep: false, type: "fund" },
];
const OWNERS_UPLOADED = DATA.OWNERS;

function WSOwnership() {
  const [source, setSource] = React.useState("uploaded"); // cvr | uploaded | compare
  const owners = source === "cvr" ? OWNERS_CVR : OWNERS_UPLOADED;
  return (
    <div className="page page-wide" style={{ maxWidth: 1280 }}>
      {/* Source picker */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <div className="label-mini">Kilde til ejeroplysninger</div>
          <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2 }}>
            {source === "cvr" && "Sidst opdateret 31. dec 2024 · automatisk hentet"}
            {source === "uploaded" && "Pr. 23. maj 2026 · uploadet af kunde"}
            {source === "compare" && "Sammenligning · 2 forskelle fundet"}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', background: 'var(--c-surface-2)', borderRadius: 8, padding: 3, border: '1px solid var(--c-line)' }}>
          {[
            { k: "cvr", l: "CVR-register", ic: <I.Database size={12}/> },
            { k: "uploaded", l: "Ejerbog", ic: <I.File size={12}/> },
            { k: "compare", l: "Sammenlign", ic: <I.GitBranch size={12}/> },
          ].map(o => (
            <button key={o.k} onClick={() => setSource(o.k)}
              style={{
                padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
                background: source === o.k ? '#fff' : 'transparent',
                boxShadow: source === o.k ? 'var(--shadow-sm)' : 'none',
                fontSize: 12.5, fontWeight: 500,
                color: source === o.k ? 'var(--c-ink)' : 'var(--c-text-2)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              {o.ic} {o.l}
              {o.k === "compare" && source !== o.k && <span className="tag" style={{ fontSize: 9.5, background: 'var(--c-warn-bg)', color: 'var(--c-warn)', border: 'none', padding: '1px 4px' }}>2</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-sm">
          {source === "cvr" ? "Brug denne kilde" : source === "uploaded" ? "Brug denne kilde" : "Vælg foretrukne"}
        </button>
      </div>

      {source === "compare" ? <OwnershipCompare/> : (
      <div className="grid g-2" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Ejerstruktur</div>
              <div className="card-sub">{source === "cvr" ? "Pr. 31. dec 2024 · CVR" : "Pr. 23. maj 2026 · ejerbog"}</div>
            </div>
            <button className="btn btn-sm btn-ghost"><I.Maximize className="ic"/></button>
          </div>
          <div style={{ padding: 18 }}>
            <OwnershipTree variant={source}/>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Ejerkreds</div>
            <div className="card-sub">{owners.length} ejere · ingen PEP markering</div>
          </div>
          <div>
            {owners.map((o, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: o.type === 'person' ? '50%' : 6, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--c-text-2)' }}>
                  {o.type === 'person' ? o.name.split(' ').map(w=>w[0]).join('') : o.name.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{o.name} {o.role && <span className="muted" style={{ fontWeight: 400 }}>· {o.role}</span>}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{o.type === 'holding' ? 'Holding­selskab' : o.type === 'fund' ? 'Fond / VC' : o.type === 'person' ? 'Person' : 'Andet'}{o.pep ? ' · PEP' : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono num" style={{ fontSize: 14, fontWeight: 500 }}>{o.share.toFixed(1)}%</div>
                  <div style={{ width: 60, marginTop: 4 }}><div className="bar"><span style={{ width: o.share * 2 + '%' }}/></div></div>
                </div>
              </div>
            ))}
          </div>
          {source === "cvr" && (
            <div style={{ padding: 14, background: 'var(--c-surface-2)', borderTop: '1px solid var(--c-line-2)', fontSize: 11.5, color: 'var(--c-text-2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <I.AlertCircle size={13} style={{ marginTop: 1, color: 'var(--c-warn)', flexShrink: 0 }}/>
              <div>CVR viser ikke <b>medarbejder­warrants (5,0%)</b>. Disse fremgår kun af den uploadede ejerbog.</div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Bestyrelse</div></div>
          <div>
            {DATA.BOARD.map((b, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none' }}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{b.name.split(' ').map(w=>w[0]).join('')}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{b.name}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{b.role}</div>
                </div>
                <div className="muted" style={{ fontSize: 11.5 }}>siden {b.since}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Fundinghistorik</div></div>
          <div style={{ padding: '14px 16px' }}>
            {[
              { y: "2023", t: "Vækstkapital", a: "18,0M DKK", inv: "Vækstfonden + Industrifonden" },
              { y: "2020", t: "Serie A", a: "32,0M DKK", inv: "Vækstfonden" },
              { y: "2017", t: "Seed + grants", a: "8,5M DKK", inv: "InnoBooster + Vækstfonden" },
              { y: "2014", t: "Stiftet", a: "1,5M DKK", inv: "Anders & Maria (stiftere)" },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--c-line-2)' : 'none' }}>
                <div className="mono" style={{ width: 36, fontSize: 12, color: 'var(--c-text-3)', flexShrink: 0 }}>{r.y}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.t} · <span className="mono">{r.a}</span></div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{r.inv}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function OwnershipCompare() {
  // Build merged comparison rows
  const map = {};
  OWNERS_CVR.forEach(o => map[o.name] = { name: o.name, type: o.type, cvr: o.share });
  OWNERS_UPLOADED.forEach(o => {
    if (!map[o.name]) map[o.name] = { name: o.name, type: o.type };
    map[o.name].uploaded = o.share;
    map[o.name].role = o.role;
  });
  const rows = Object.values(map);

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
      <div className="card" style={{ background: 'var(--c-warn-bg)', borderColor: 'transparent', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <I.AlertTriangle size={16} style={{ color: 'var(--c-warn)', marginTop: 2, flexShrink: 0 }}/>
        <div style={{ flex: 1, fontSize: 13 }}>
          <div style={{ fontWeight: 500, color: 'var(--c-warn)' }}>2 forskelle mellem CVR og uploadet ejerbog</div>
          <div style={{ color: 'var(--c-text-2)', marginTop: 3, fontSize: 12.5 }}>
            CVR-data afspejler seneste indberetning (31. dec 2024). Ejerbogen fra kunden er dateret 23. maj 2026 og inkluderer en medarbejder­warrant-program oprettet i marts 2025.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Sammenligning</div>
          <div className="hstack">
            <span className="tag"><I.Database size={10}/> CVR (31. dec 2024)</span>
            <span className="tag"><I.File size={10}/> Ejerbog (23. maj 2026)</span>
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Ejer</th>
              <th style={{ textAlign: 'right' }}>CVR</th>
              <th style={{ textAlign: 'right' }}>Ejerbog</th>
              <th style={{ textAlign: 'right' }}>Forskel</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const diff = (r.uploaded || 0) - (r.cvr || 0);
              const isDiff = Math.abs(diff) > 0.05;
              const onlyInUploaded = r.cvr === undefined;
              const onlyInCvr = r.uploaded === undefined;
              return (
                <tr key={i} style={{ background: isDiff || onlyInUploaded || onlyInCvr ? 'var(--c-warn-bg)' : 'transparent' }}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{r.type === 'holding' ? 'Holding' : r.type === 'fund' ? 'Fond' : r.type === 'person' ? 'Person' : 'Andet'}{r.role ? ` · ${r.role}` : ''}</div>
                  </td>
                  <td className="mono num" style={{ textAlign: 'right', color: r.cvr === undefined ? 'var(--c-text-4)' : 'var(--c-text)' }}>
                    {r.cvr === undefined ? '-' : r.cvr.toFixed(1) + '%'}
                  </td>
                  <td className="mono num" style={{ textAlign: 'right', color: r.uploaded === undefined ? 'var(--c-text-4)' : 'var(--c-text)', fontWeight: r.uploaded !== undefined ? 500 : 400 }}>
                    {r.uploaded === undefined ? '-' : r.uploaded.toFixed(1) + '%'}
                  </td>
                  <td className="mono num" style={{ textAlign: 'right' }}>
                    {onlyInUploaded ? <span style={{ color: 'var(--c-warn)' }}>NY</span>
                     : onlyInCvr ? <span style={{ color: 'var(--c-danger)' }}>FJERNET</span>
                     : isDiff ? <span style={{ color: diff > 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}pp</span>
                     : <span style={{ color: 'var(--c-text-4)' }}>-</span>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--c-text-2)' }}>
                    {onlyInUploaded && r.name === "Medarbejder­warrants" && "Warrant-program oprettet marts 2025"}
                    {isDiff && r.name === "Anders Holding ApS" && "Konsekvens af warrant-fortynding"}
                    {isDiff && r.name === "Industrifonden A/S" && "Konsekvens af warrant-fortynding"}
                    {!isDiff && !onlyInUploaded && !onlyInCvr && r.name !== "Medarbejder­warrants" && <span className="muted">-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--c-line-2)', background: 'var(--c-surface-2)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--c-text-2)' }}>
            <b style={{ color: 'var(--c-ink)' }}>Anbefaling:</b> Brug uploadet ejerbog som primær kilde - den er nyere og afspejler den aktuelle situation. Behold CVR-version som reference.
          </div>
          <button className="btn btn-sm"><I.Plus className="ic"/> Til spørgsmål</button>
          <button className="btn btn-sm">Behold begge</button>
          <button className="btn btn-sm btn-primary">Brug uploadet ejerbog</button>
        </div>
      </div>
    </div>
  );
}

function OwnershipTree({ variant = "uploaded" }) {
  const showWarrants = variant !== "cvr";
  const shares = variant === "cvr" ? ["50,7%","23,6%","15,6%","10,1%"] : ["48,2%","22,4%","14,8%","9,6%"];
  return (
    <svg viewBox="0 0 540 320" width="100%" style={{ display: 'block' }}>
      <g fontFamily="var(--font)" fontSize="11">
        <g transform="translate(20, 20)">
          <rect width="120" height="48" rx="6" fill="#fff" stroke="var(--c-line)"/>
          <text x="60" y="20" textAnchor="middle" fill="var(--c-text-2)" fontSize="9">PERSON</text>
          <text x="60" y="36" textAnchor="middle" fontWeight="500" fill="var(--c-ink)">Anders Holding ApS</text>
        </g>
        <g transform="translate(155, 20)">
          <rect width="110" height="48" rx="6" fill="#fff" stroke="var(--c-line)"/>
          <text x="55" y="20" textAnchor="middle" fill="var(--c-text-2)" fontSize="9">FOND</text>
          <text x="55" y="36" textAnchor="middle" fontWeight="500" fill="var(--c-ink)">Vækstfonden</text>
        </g>
        <g transform="translate(280, 20)">
          <rect width="120" height="48" rx="6" fill="#fff" stroke="var(--c-line)"/>
          <text x="60" y="20" textAnchor="middle" fill="var(--c-text-2)" fontSize="9">PERSON</text>
          <text x="60" y="36" textAnchor="middle" fontWeight="500" fill="var(--c-ink)">Maria Lindbjerg</text>
        </g>
        <g transform="translate(415, 20)">
          <rect width="105" height="48" rx="6" fill="#fff" stroke="var(--c-line)"/>
          <text x="52" y="20" textAnchor="middle" fill="var(--c-text-2)" fontSize="9">FOND</text>
          <text x="52" y="36" textAnchor="middle" fontWeight="500" fill="var(--c-ink)">Industrifonden</text>
        </g>

        {[[80, 68], [210, 68], [340, 68], [467, 68]].map(([x, y], i) => (
          <g key={i}>
            <line x1={x} x2={270} y1={y} y2={170} stroke="var(--c-line-strong)" strokeWidth="1"/>
            <text x={(x + 270)/2} y={(y + 170)/2} fill="var(--c-text-2)" fontSize="10" fontFamily="var(--mono)" textAnchor="middle">
              <tspan>{shares[i]}</tspan>
            </text>
          </g>
        ))}

        {showWarrants && (
          <g transform="translate(155, 195)">
            <rect width="110" height="40" rx="6" fill="#fff" stroke="var(--c-line)" strokeDasharray="3 3"/>
            <text x="55" y="17" textAnchor="middle" fill="var(--c-text-3)" fontSize="9">WARRANTS</text>
            <text x="55" y="32" textAnchor="middle" fontWeight="500" fill="var(--c-text-2)" fontSize="10">Medarbejdere · 5%</text>
          </g>
        )}

        <g transform="translate(210, 175)">
          <rect width="120" height="60" rx="8" fill="var(--c-ink)" stroke="var(--c-ink)"/>
          <text x="60" y="22" textAnchor="middle" fill="#fff" fontSize="9" opacity="0.7">A/S · DK</text>
          <text x="60" y="38" textAnchor="middle" fontWeight="600" fill="#fff">Nordhavn</text>
          <text x="60" y="51" textAnchor="middle" fontWeight="600" fill="#fff">Composite</text>
        </g>

        <g transform="translate(70, 270)">
          <rect width="160" height="36" rx="6" fill="#fff" stroke="var(--c-line)"/>
          <text x="80" y="22" textAnchor="middle" fontSize="11">Nordhavn Production ApS</text>
        </g>
        <g transform="translate(310, 270)">
          <rect width="160" height="36" rx="6" fill="#fff" stroke="var(--c-line)"/>
          <text x="80" y="22" textAnchor="middle" fontSize="11">Nordhavn US Inc.</text>
        </g>
        <line x1="270" x2="150" y1="235" y2="270" stroke="var(--c-line-strong)"/>
        <line x1="270" x2="390" y1="235" y2="270" stroke="var(--c-line-strong)"/>
        <text x="200" y="258" fontSize="9" fill="var(--c-text-3)" fontFamily="var(--mono)">100%</text>
        <text x="340" y="258" fontSize="9" fill="var(--c-text-3)" fontFamily="var(--mono)">100%</text>
      </g>
    </svg>
  );
}

function WSQuestions() {
  return (
    <div className="page page-wide" style={{ maxWidth: 980 }}>
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="ai-hint"><I.Spark className="spark"/> AI-foreslået</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>4 spørgsmål til afklaring</div>
          <div className="muted" style={{ fontSize: 12 }}>Foreslået baseret på findings og dokumenter. Du kan redigere, fjerne eller tilføje før afsendelse.</div>
        </div>
        <button className="btn btn-sm btn-primary"><I.Send className="ic"/> Send valgte (4)</button>
      </div>

      <div className="card">
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--c-line-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="label-mini" style={{ marginLeft: 4 }}>Til afsendelse</span>
          <span className="muted" style={{ fontSize: 11.5 }}>· 4</span>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-sm btn-ghost"><I.Plus className="ic"/> Tilføj spørgsmål</button>
          </div>
        </div>
        {DATA.QUESTIONS_TO_CUST.filter(q => q.status === 'draft').map((q, i) => (
          <QuestionRow key={q.id} q={q}/>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--c-line-2)' }}>
          <span className="label-mini" style={{ marginLeft: 4 }}>Allerede sendt</span>
        </div>
        {DATA.QUESTIONS_TO_CUST.filter(q => q.status === 'sent').map((q, i) => (
          <div key={q.id} style={{ padding: '12px 18px', display: 'flex', gap: 12, alignItems: 'flex-start', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none' }}>
            <I.Clock size={14} style={{ color: 'var(--c-text-3)', marginTop: 4 }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13 }}>{q.q}</div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>Sendt {q.sent} · afventer svar · <span className="source"><I.File className="ic"/>{q.source}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionRow({ q }) {
  const [checked, setChecked] = React.useState(true);
  const [edit, setEdit] = React.useState(false);
  const [text, setText] = React.useState(q.q);
  return (
    <div style={{ padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start', borderTop: '1px solid var(--c-line-2)' }}>
      <input type="checkbox" checked={checked} onChange={() => setChecked(!checked)} style={{ marginTop: 4 }}/>
      <div style={{ flex: 1 }}>
        {edit ? (
          <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
            style={{ width: '100%', border: '1px solid var(--c-line-strong)', borderRadius: 6, padding: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }}/>
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{text}</div>
        )}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="source"><I.File className="ic"/> {q.source}</span>
          <span className="tag" style={{ fontSize: 10, background: q.priority === 'high' ? 'var(--c-warn-bg)' : 'var(--c-surface-2)', color: q.priority === 'high' ? 'var(--c-warn)' : 'var(--c-text-2)', borderColor: q.priority === 'high' ? 'transparent' : 'var(--c-line)' }}>{q.priority === 'high' ? 'Høj prioritet' : 'Middel'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => setEdit(!edit)}>{edit ? 'Færdig' : <I.Edit className="ic"/>}</button>
        <button className="btn btn-sm btn-ghost"><I.X className="ic"/></button>
      </div>
    </div>
  );
}

window.WSOwnership = WSOwnership;
window.WSQuestions = WSQuestions;
