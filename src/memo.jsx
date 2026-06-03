// Credit memo - split view (left: sections nav + sources, right: document preview)
function WSMemo() {
  const [active, setActive] = React.useState("summary");
  const sections = [
    { k: "summary", label: "Executive summary", status: "draft" },
    { k: "company", label: "Virksomheds­beskrivelse", status: "ok" },
    { k: "product", label: "Produkt og marked", status: "ok" },
    { k: "competitors", label: "Konkurrenter", status: "ok" },
    { k: "ownership", label: "Ejerkreds og funding", status: "ok" },
    { k: "financials", label: "Finansiel udvikling", status: "ok" },
    { k: "budget", label: "Budget vs realiseret", status: "warn" },
    { k: "kpi", label: "Nøgletal", status: "ok" },
    { k: "risk", label: "Risici", status: "warn" },
    { k: "security", label: "Sikkerheder", status: "warn" },
    { k: "open", label: "Manglende afklaringer", status: "info" },
    { k: "rec", label: "Anbefaling", status: "draft" },
    { k: "appendix", label: "Bilagsliste", status: "ok" },
  ];

  return (
    <div className="page page-wide" style={{ maxWidth: 1320 }}>
      <div className="grid" style={{ gridTemplateColumns: '260px 1fr 280px', gap: 16 }}>
        {/* Sections nav */}
        <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
          <div className="card-head">
            <div className="card-title">Sektioner</div>
            <span className="tag" style={{ fontSize: 10 }}>68%</span>
          </div>
          <div style={{ padding: '6px 0' }}>
            {sections.map(s => (
              <button key={s.k} onClick={() => setActive(s.k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 16px',
                  background: active === s.k ? 'var(--c-surface-2)' : 'transparent', border: 'none', textAlign: 'left',
                  cursor: 'pointer', fontSize: 12.8, color: 'var(--c-text)', borderLeft: '2px solid ' + (active === s.k ? 'var(--c-ink)' : 'transparent')
                }}>
                <SectionDot status={s.status}/>
                <span style={{ flex: 1 }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Memo document */}
        <div className="card" style={{ background: '#fff' }}>
          <div className="card-head">
            <div>
              <div className="card-title">Credit memo · udkast</div>
              <div className="card-sub">Sidst opdateret 24. maj 09:14 · auto-genereret + manuelt redigeret</div>
            </div>
            <div className="hstack">
              <span className="ai-hint"><I.Spark className="spark"/> 9 af 13 sektioner udfyldt</span>
              <button className="btn btn-sm btn-ghost"><I.Eye className="ic"/></button>
              <button className="btn btn-sm"><I.Download className="ic"/> PDF</button>
              <button className="btn btn-sm btn-primary"><I.Check className="ic"/> Klar til indstilling</button>
            </div>
          </div>

          <div style={{ padding: '36px 56px 60px', maxHeight: 680, overflow: 'auto' }}>
            <div style={{ borderBottom: '2px solid var(--c-ink)', paddingBottom: 14, marginBottom: 22 }}>
              <div className="label-mini" style={{ marginBottom: 4 }}>Kreditindstilling</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em' }}>Nordhavn Composite A/S</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 4, display: 'flex', gap: 14 }}>
                <span><span className="mono">CVR 38 42 71 56</span></span>
                <span>Sagsnr. 2026-0184</span>
                <span>Udarbejdet af Mette Larsen</span>
                <span>24. maj 2026</span>
              </div>
            </div>

            <MemoSection num="1" title="Executive summary" status="draft">
              <p>Nordhavn Composite A/S ansøger om <b className="mono">DKK 4,5M</b> i form af kombineret eksportkaution og driftskredit til finansiering af Block-Island ordren fra GE Vernova med leverance Q3 2026.</p>
              <p>Selskabet har siden 2017 udviklet sig fra et nicheværksted til en etableret leverandør af kompositkomponenter til vindmølleindustrien med en omsætning på <b className="mono">DKK 18,5M</b> (2025) og en EBITDA-margin på <b>12,6%</b>. Tre kunder udgør ca. 64% af omsætningen.</p>
              <p style={{ background: 'var(--c-surface-2)', padding: '10px 14px', borderRadius: 6, borderLeft: '3px solid var(--c-ink)', fontSize: 13 }}>
                <b>Foreløbig vurdering:</b> God finansiel udvikling, sund kapitalstruktur, men afhængighed af få kunder og en uafklaret budgetafvigelse i juli 2026 bør drøftes inden indstilling. Sikkerheds­dokumentation under afklaring.
              </p>
            </MemoSection>

            <MemoSection num="2" title="Virksomhedsbeskrivelse" status="ok">
              <p>Nordhavn Composite ApS blev stiftet i 2017 af Anders Christensen og Maria Lindbjerg. Selskabet har hovedkontor i Frederikshavn med produktion i Vendsyssel og 28 ansatte. Datterselskaber omfatter Nordhavn Production ApS (100%) og Nordhavn US Inc. (100%).</p>
            </MemoSection>

            <MemoSection num="3" title="Produkt og marked" status="ok">
              <p>Selskabet producerer fiberforstærkede kompositkomponenter, primært til vindmølleblade. Det globale marked forventes at vokse 6,8% p.a. i 2025-2030.</p>
            </MemoSection>

            <MemoSection num="6" title="Finansiel udvikling" status="ok">
              <table className="tbl" style={{ fontSize: 11.5, marginTop: 4 }}>
                <thead><tr><th>DKK M</th><th style={{textAlign:'right'}}>2023</th><th style={{textAlign:'right'}}>2024</th><th style={{textAlign:'right'}}>2025</th></tr></thead>
                <tbody>
                  <tr><td>Omsætning</td><td className="mono num" style={{textAlign:'right'}}>12,8</td><td className="mono num" style={{textAlign:'right'}}>15,2</td><td className="mono num" style={{textAlign:'right', fontWeight:600}}>18,5</td></tr>
                  <tr><td>EBITDA</td><td className="mono num" style={{textAlign:'right'}}>1,3</td><td className="mono num" style={{textAlign:'right'}}>1,9</td><td className="mono num" style={{textAlign:'right', fontWeight:600}}>2,4</td></tr>
                  <tr><td>Egenkapital</td><td className="mono num" style={{textAlign:'right'}}>3,5</td><td className="mono num" style={{textAlign:'right'}}>4,8</td><td className="mono num" style={{textAlign:'right', fontWeight:600}}>6,2</td></tr>
                </tbody>
              </table>
            </MemoSection>

            <MemoSection num="9" title="Risici" status="warn">
              <ul style={{ paddingLeft: 18, margin: '6px 0' }}>
                <li><b>Kundekoncentration:</b> Top-3 kunder = 64% af omsætning.</li>
                <li><b>Råvarepriser:</b> Kulfiber +22% YoY, dækning kun 60%.</li>
                <li><b>Valutaeksponering:</b> 41% af omsætning i USD/EUR - afdækning under afklaring.</li>
              </ul>
            </MemoSection>

            <MemoSection num="11" title="Manglende afklaringer" status="info">
              <ul style={{ paddingLeft: 18, margin: '6px 0' }}>
                <li>Baggrund for budgetlinje +2,5M i juli 2026 (Block-Island leverance?)</li>
                <li>Tilbagetrædelses­erklæring for anpartshaver­lån 0,5M</li>
                <li>Sikkerheds­dokumentation: specifikation af kautionsobjekter</li>
              </ul>
            </MemoSection>

            <MemoSection num="12" title="Anbefaling" status="draft" placeholder>
              <div style={{ padding: 18, background: 'var(--c-surface-2)', borderRadius: 6, border: '1px dashed var(--c-line-strong)', color: 'var(--c-text-2)', fontSize: 13, textAlign: 'center' }}>
                <I.Edit size={14} style={{ marginBottom: 4 }}/>
                <div>Skrives manuelt af kreditmedarbejder</div>
                <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--c-text-3)' }}>AI udfylder ikke denne sektion automatisk</div>
              </div>
            </MemoSection>
          </div>
        </div>

        {/* Sources panel */}
        <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: 16 }}>
          <div className="card-head">
            <div className="card-title">Kilder & provenance</div>
          </div>
          <div style={{ padding: '8px 14px' }}>
            <div className="label-mini" style={{ margin: '8px 0 4px' }}>Brugt i nuværende afsnit</div>
            {[
              { t: "Aarsrapport_2025.pdf", p: "s. 3, s. 9, note 14" },
              { t: "Budget_2026-28_v3.xlsx", p: "linje 197" },
              { t: "Periodetal_Q1-2026.xlsx", p: "ark Omsætning" },
            ].map((s, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--c-line-2)' : 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{s.t}</div>
                <div className="muted" style={{ fontSize: 11 }}>{s.p}</div>
              </div>
            ))}
            <div className="label-mini" style={{ margin: '14px 0 6px' }}>Provenance</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-2)', lineHeight: 1.55 }}>
              Hver påstand i memo'en kan spores tilbage til en kilde. <span style={{ color: 'var(--c-ink)' }}>Hold musen over et tal eller en sætning</span> for at se hvor det kommer fra.
            </div>
            <div style={{ marginTop: 16, padding: 12, background: 'var(--c-surface-2)', borderRadius: 8 }}>
              <div style={{ fontSize: 11.5, color: 'var(--c-text-2)' }}>
                <I.Spark size={11} style={{ verticalAlign: -1, marginRight: 4 }}/>
                <b>9 af 13 sektioner</b> automatisk udfyldt fra materialet. 4 sektioner kræver manuelt input.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemoSection({ num, title, status, children, placeholder }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--c-text-3)', width: 18 }}>{num}</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.01em' }}>{title}</h3>
        {status === 'warn' && <span className="pill warn" style={{ fontSize: 10 }}><span className="pill-dot"/>Afklaring</span>}
        {status === 'draft' && <span className="pill outline" style={{ fontSize: 10 }}><span className="pill-dot"/>Udkast</span>}
      </div>
      <div style={{ paddingLeft: 28, fontSize: 13, lineHeight: 1.65, color: 'var(--c-text)' }}>{children}</div>
    </div>
  );
}

function SectionDot({ status }) {
  if (status === 'ok') return <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-success)', flexShrink: 0 }}/>;
  if (status === 'warn') return <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-warn)', flexShrink: 0 }}/>;
  if (status === 'draft') return <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'transparent', border: '1.2px solid var(--c-text-4)', flexShrink: 0 }}/>;
  if (status === 'info') return <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-info)', flexShrink: 0 }}/>;
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-text-4)', flexShrink: 0 }}/>;
}

window.WSMemo = WSMemo;
