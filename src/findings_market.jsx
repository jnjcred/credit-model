// AI findings / Review assistant
function WSFindings() {
  const groups = [
    { sev: 'warn', label: 'Kræver opmærksomhed', items: DATA.FINDINGS.filter(f => f.severity === 'warn') },
    { sev: 'info', label: 'Observationer', items: DATA.FINDINGS.filter(f => f.severity === 'info') },
    { sev: 'ok', label: 'Bekræftet i orden', items: DATA.FINDINGS.filter(f => f.severity === 'ok') },
  ];

  return (
    <div className="page page-wide" style={{ maxWidth: 1100 }}>
      <div className="card" style={{ marginBottom: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="ai-hint" style={{ fontSize: 11.5, padding: '4px 10px' }}><I.Spark className="spark" size={11}/> AI-gennemgang</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>5 observationer genereret fra modtaget materiale</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Hver observation har kilde og konfidensniveau. AI træffer ikke beslutninger — du gør.
          </div>
        </div>
        <button className="btn btn-sm btn-ghost"><I.Refresh className="ic"/> Kør igen</button>
        <button className="btn btn-sm">Markér alle som gennemgået</button>
      </div>

      {groups.map(g => (
        <div key={g.sev} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 10px' }}>
            <span style={{ color: g.sev === 'warn' ? 'var(--c-warn)' : g.sev === 'ok' ? 'var(--c-success)' : 'var(--c-info)' }}>
              {g.sev === 'warn' ? <I.AlertTriangle size={14}/> : g.sev === 'ok' ? <I.CheckCircle size={14}/> : <I.AlertCircle size={14}/>}
            </span>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{g.label}</div>
            <div className="muted" style={{ fontSize: 12 }}>· {g.items.length}</div>
          </div>
          <div className="card">
            {g.items.map((f, i) => (
              <div key={f.id} style={{ padding: '16px 20px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-ink)' }}>{f.title}</div>
                      <span className="tag" style={{ fontSize: 10 }}>
                        Konfidens: {f.confidence === 'high' ? 'høj' : 'middel'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.55 }}>{f.body}</div>
                    {f.suggest && (
                      <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--c-surface-2)', borderRadius: 6, borderLeft: '2px solid var(--c-ink)' }}>
                        <div className="label-mini" style={{ marginBottom: 3 }}>Forslag</div>
                        <div style={{ fontSize: 12.5, color: 'var(--c-text)' }}>{f.suggest}</div>
                      </div>
                    )}
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="source"><I.File className="ic"/> {f.source}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    {g.sev !== 'ok' && <button className="btn btn-sm btn-primary"><I.Plus className="ic"/> Spørgsmål til kunde</button>}
                    <button className="btn btn-sm"><I.Check className="ic"/> Markér gennemgået</button>
                    <button className="btn btn-sm btn-ghost"><I.X className="ic"/> Ikke relevant</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Market & company analysis
function WSMarket() {
  return (
    <div className="page page-wide" style={{ maxWidth: 1280 }}>
      <div className="card" style={{ marginBottom: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className="ai-hint" style={{ fontSize: 11.5, padding: '4px 10px' }}><I.Spark className="spark" size={11}/> AI-genereret analyse</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>Markedsanalyse genereret 24. maj 2026 · 09:14</div>
          <div className="muted" style={{ fontSize: 12 }}>Baseret på offentlige kilder, branchedata fra IRENA/EWEA og selskabets eget materiale.</div>
        </div>
        <button className="btn btn-sm btn-ghost"><I.Refresh className="ic"/> Genkør</button>
        <button className="btn btn-sm"><I.Download className="ic"/> Eksport til memo</button>
      </div>

      <div className="grid g-2" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Forretningsmodel</div></div>
          <div style={{ padding: '14px 18px 18px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--c-text)' }}>
            Nordhavn Composite producerer fiberforstærkede komposit­komponenter til vindmølle­blade — primært strukturelle elementer og rotorindfatninger. Salget sker B2B til <b>Vestas (DK)</b>, <b>Siemens Gamesa (DE)</b> og <b>GE Vernova (US)</b>, hvor de tre kunder samlet udgør ca. 64% af omsætningen.
            <div style={{ marginTop: 10 }}><span className="source"><I.File className="ic"/> Årsrapport 2025 · s. 9</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Produktbeskrivelse</div></div>
          <div style={{ padding: '14px 18px 18px', fontSize: 13.5, lineHeight: 1.6 }}>
            Selskabets primære produkter er <b>blade­rødder</b> i kulfiber-epoxy (60% af omsætning), <b>nav­indfatninger</b> i glasfiber-hybrid (28%), samt <b>specialkomponenter</b> efter kundens specifikation (12%). Produktionen sker i Frederikshavn og Vendsyssel.
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Branche­vurdering</div></div>
          <div style={{ padding: '14px 18px 18px', fontSize: 13.5, lineHeight: 1.6 }}>
            Det globale marked for vindkomponenter forventes at vokse <b>6,8% p.a.</b> i 2025–2030 (IEA). DK-leverandører nyder nærhed til OEM'er og høj teknisk modenhed. Risici: råvarepriser på kulfiber (+22% YoY) og politisk usikkerhed om amerikanske IRA-fradrag.
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <span className="tag">IEA WEO 2025</span>
              <span className="tag">EWEA Q1 2026</span>
              <span className="tag">Bloomberg NEF</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title">Konkurrenter</div></div>
          <table className="tbl" style={{ fontSize: 12.5 }}>
            <thead><tr><th>Navn</th><th>Omsætning</th><th>Geografi</th><th style={{ textAlign:'right' }}>Position</th></tr></thead>
            <tbody>
              {[
                ["LM Wind Power", "EUR 1,2 mia", "Global", "Markedsleder"],
                ["TPI Composites", "USD 1,3 mia", "US/MX/EU", "#2"],
                ["Aerodyn Composite", "EUR 320M", "DE", "Niche"],
                ["Nordhavn Composite", "DKK 248M", "DK", "Niche, vækst"],
              ].map((r, i) => (
                <tr key={i} style={{ background: i === 3 ? 'var(--c-surface-2)' : 'transparent' }}>
                  <td style={{ fontWeight: i === 3 ? 600 : 500 }}>{r[0]}</td>
                  <td className="mono num">{r[1]}</td>
                  <td className="muted">{r[2]}</td>
                  <td style={{ textAlign:'right' }} className="muted">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Soft signals */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div className="card-title">Soft signals</div>
          <div className="card-sub">Eksterne data­punkter</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--c-line-2)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden' }}>
          {DATA.SOFT.map((s, i) => (
            <div key={i} style={{ padding: '14px 16px', background: '#fff' }}>
              <div className="label-mini">{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 5, letterSpacing: '-0.01em', color: 'var(--c-ink)' }}>{s.value}</div>
              {s.trend && <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>{s.trend}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.WSFindings = WSFindings;
window.WSMarket = WSMarket;
