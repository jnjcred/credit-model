// Documents + AI extraction
function WSDocuments() {
  const [selected, setSelected] = React.useState(DATA.DOCS[0]);
  const [q, setQ] = React.useState("");
  const [sortMode, setSortMode] = React.useState("newest");
  const [sortOpen, setSortOpen] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState("all");

  const types = [...new Set(DATA.DOCS.map(d => d.type))];
  let docs = [...DATA.DOCS];

  // Filter by type
  if (typeFilter !== "all") {
    docs = docs.filter(d => d.type === typeFilter);
  }

  // Search
  if (q.trim()) {
    const ql = q.toLowerCase();
    docs = docs.filter(d => d.name.toLowerCase().includes(ql) || d.type.toLowerCase().includes(ql));
  }

  // Sort
  if (sortMode === "newest") docs.sort((a, b) => b.date.localeCompare(a.date));
  else if (sortMode === "oldest") docs.sort((a, b) => a.date.localeCompare(b.date));
  else if (sortMode === "name") docs.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortMode === "size") docs.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
  else if (sortMode === "type") docs.sort((a, b) => a.type.localeCompare(b.type) || b.date.localeCompare(a.date));
  else if (sortMode === "latest-per-type") {
    // Group: keep only newest per type, but show others as "previous versions" collapsible
    const grouped = {};
    docs.forEach(d => {
      if (!grouped[d.type] || d.date.localeCompare(grouped[d.type][0].date) > 0) {
        grouped[d.type] = [d, ...(grouped[d.type] || []).filter(x => x !== d)];
      } else {
        grouped[d.type] = [...grouped[d.type], d];
      }
    });
    // Flatten: latest first, then mark others as `prev` for rendering
    docs = [];
    Object.values(grouped).forEach(arr => {
      const sorted = [...arr].sort((a, b) => b.date.localeCompare(a.date));
      docs.push({ ...sorted[0], _isLatest: true, _olderCount: sorted.length - 1, _older: sorted.slice(1) });
    });
    docs.sort((a, b) => b.date.localeCompare(a.date));
  }

  const sortLabels = {
    "newest": "Nyeste først",
    "oldest": "Ældste først",
    "name": "Navn (A–Z)",
    "size": "Størrelse",
    "type": "Type, derefter dato",
    "latest-per-type": "Seneste pr. type",
  };

  return (
    <div className="page page-wide" style={{ maxWidth: 1320 }}>
      <div className="grid" style={{ gridTemplateColumns: '420px 1fr', gap: 16 }}>
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-line-2)' }}>
            <div style={{ position: 'relative' }}>
              <I.Search size={14} style={{ position: 'absolute', left: 11, top: 9, color: 'var(--c-text-3)' }}/>
              <input value={q} onChange={e => setQ(e.target.value)} className="input" style={{ paddingLeft: 32, height: 30, fontSize: 12.5 }} placeholder="Søg dokumenter, indhold, citater…"/>
            </div>

            {/* Sort + filter row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, position: 'relative' }}>
              <button onClick={() => setSortOpen(!sortOpen)} className="btn btn-sm" style={{ flex: 1, justifyContent: 'space-between' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <I.Sort className="ic"/> {sortLabels[sortMode]}
                </span>
                <I.ChevronDown size={12} style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}/>
              </button>
              <button className="btn btn-sm btn-ghost"><I.Download className="ic"/></button>

              {sortOpen && (
                <div onMouseLeave={() => setSortOpen(false)}
                  style={{ position: 'absolute', top: 32, left: 0, width: '100%', background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 10, padding: 4 }}>
                  {Object.entries(sortLabels).map(([k, l], i) => (
                    <button key={k} onClick={() => { setSortMode(k); setSortOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px',
                        background: sortMode === k ? 'var(--c-surface-2)' : 'transparent',
                        border: 'none', textAlign: 'left', cursor: 'pointer',
                        fontSize: 13, color: 'var(--c-text)', borderRadius: 5,
                        position: 'relative',
                      }}>
                      <span style={{ width: 14, color: 'var(--c-ink)' }}>{sortMode === k && <I.Check size={12}/>}</span>
                      <span style={{ flex: 1 }}>{l}</span>
                      {k === "latest-per-type" && <span className="ai-hint" style={{ fontSize: 9.5, padding: '1px 5px' }}><I.Spark className="spark"/> Anbefalet</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <span onClick={() => setTypeFilter("all")} className="tag" style={{ cursor: 'pointer', background: typeFilter === "all" ? 'var(--c-ink)' : 'var(--c-surface-2)', color: typeFilter === "all" ? '#fff' : 'var(--c-text-2)', border: typeFilter === "all" ? 'none' : '1px solid var(--c-line)' }}>
                Alle · {DATA.DOCS.length}
              </span>
              {types.map(t => {
                const n = DATA.DOCS.filter(d => d.type === t).length;
                return (
                  <span key={t} onClick={() => setTypeFilter(t)} className="tag" style={{ cursor: 'pointer', background: typeFilter === t ? 'var(--c-ink)' : 'var(--c-surface-2)', color: typeFilter === t ? '#fff' : 'var(--c-text-2)', border: typeFilter === t ? 'none' : '1px solid var(--c-line)' }}>
                    {t} · {n}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Result count */}
          <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--c-text-3)', borderBottom: '1px solid var(--c-line-2)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{docs.length} {sortMode === "latest-per-type" ? "typer" : "dokumenter"}</span>
            {sortMode === "latest-per-type" && <span style={{ color: 'var(--c-ink)' }}>Tidligere versioner skjult</span>}
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            {docs.map((d, i) => (
              <DocRow key={d.name + i} d={d} selected={selected} onSelect={setSelected} latestPerType={sortMode === "latest-per-type"}/>
            ))}
          </div>
        </div>

        {/* Document viewer */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-head">
            <div>
              <div className="card-title">{selected?.name || "Vælg dokument"}</div>
              <div className="card-sub">{selected?.type} · uploadet {selected?.uploaded} · <span className="ai-hint"><I.Spark className="spark"/> {selected?.ai} nøglepunkter udtrukket</span></div>
            </div>
            <div className="hstack">
              <button className="btn btn-sm btn-ghost"><I.Download className="ic"/></button>
              <button className="btn btn-sm"><I.Maximize className="ic"/> Åbn</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0, flex: 1, minHeight: 480 }}>
            <div style={{ padding: 22, background: 'var(--c-surface-2)', borderRight: '1px solid var(--c-line-2)', overflow: 'auto' }}>
              <div style={{ background: '#fff', maxWidth: 480, margin: '0 auto', borderRadius: 4, boxShadow: 'var(--shadow-sm)', padding: '32px 36px', fontSize: 11.5, color: 'var(--c-text)', lineHeight: 1.65 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Nordhavn Composite A/S</div>
                <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginBottom: 22 }}>Årsrapport 2025 · CVR 38 42 71 56</div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Hoved- og nøgletal</div>
                <div className="mono" style={{ fontSize: 10.5, lineHeight: 1.8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, color: 'var(--c-text-3)', borderBottom: '1px solid var(--c-line)', paddingBottom: 4 }}>
                    <span>DKK 1.000</span><span>2025</span><span>2024</span><span>2023</span>
                  </div>
                  {[
                    ["Nettoomsætning", "248.500", "214.800", "186.200"],
                    ["EBITDA", "31.200", "24.600", "18.400"],
                    ["Resultat før skat", "22.100", "16.800", "11.200"],
                    ["Egenkapital", "78.200", "58.600", "42.000"],
                    ["Balancesum", "212.400", "168.200", "138.400"],
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, padding: '3px 0', borderBottom: i < 4 ? '1px solid var(--c-line-2)' : 'none' }}>
                      {r.map((c, j) => <span key={j} style={{ color: j === 0 ? 'var(--c-text)' : 'var(--c-text-2)' }}>{c}</span>)}
                    </div>
                  ))}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, marginTop: 22, marginBottom: 6 }}>Note 14 · Lån fra anpartshavere</div>
                <div style={{ background: 'var(--c-warn-bg)', borderLeft: '2px solid var(--c-warn)', padding: '6px 10px', marginTop: 4, fontSize: 11.5 }}>
                  Selskabet har modtaget et lån fra Anders Holding ApS på <b>6.800</b> tkr. Lånet er rente­bærende (Nibor + 2,5%) og forfalder til betaling i 2029.
                  <div style={{ marginTop: 4 }}><span className="ai-hint"><I.Spark className="spark"/> AI fandt: tilbagetrædelses­erklæring mangler</span></div>
                </div>
              </div>
            </div>

            <div style={{ padding: 14, overflow: 'auto', background: '#fff' }}>
              <div className="label-mini" style={{ marginBottom: 8 }}>Nøglepunkter (AI)</div>
              {[
                { t: "Nettoomsætning steg 21,7% til 18,5M", s: "Side 3 · Hoved- og nøgletal" },
                { t: "EBITDA-margin udvidet med 1,2pp", s: "Side 3 · Hoved- og nøgletal" },
                { t: "Anpartshaver­lån 0,5M · note 14", s: "Side 14 · Noter", warn: true },
                { t: "Tre kunder = 64% af omsætning", s: "Side 9 · Forretningsmodel", warn: true },
                { t: "Eksportandel: 78% (DE, US, NL)", s: "Side 7" },
                { t: "Block-Island ordre signaleret Q3", s: "Side 11 · Vækst" },
              ].map((p, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--c-line-2)' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: p.warn ? 'var(--c-warn)' : 'var(--c-ink)', display: 'flex', gap: 6 }}>
                    {p.warn ? <I.AlertTriangle size={12} style={{ marginTop: 3, flexShrink: 0 }}/> : <I.CheckCircle size={12} style={{ marginTop: 3, color: 'var(--c-success)', flexShrink: 0 }}/>}
                    <span>{p.t}</span>
                  </div>
                  <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                    <span className="source"><I.File className="ic"/> {p.s}</span>
                    {p.warn && <button className="btn btn-sm btn-ghost" style={{ fontSize: 11, padding: '0 6px', height: 22 }}><I.Plus className="ic" style={{ width: 10, height: 10 }}/> Til spørgsmål</button>}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-sm" style={{ width: '100%', justifyContent: 'center' }}><I.Sparkles className="ic"/> Spørg dette dokument</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocRow({ d, selected, onSelect, latestPerType }) {
  const [showOlder, setShowOlder] = React.useState(false);
  return (
    <>
      <div className="doc-item" onClick={() => onSelect(d)} style={{ background: selected?.name === d.name ? 'var(--c-surface-2)' : 'transparent' }}>
        <div className="doc-ic"/>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
            {latestPerType && <span className="tag" style={{ fontSize: 9.5, background: 'var(--c-primary)', color: '#fff', border: 'none', flexShrink: 0 }}>SENESTE</span>}
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>{d.type} · {d.year} · {d.size}</div>
          {latestPerType && d._olderCount > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setShowOlder(!showOlder); }}
              style={{ marginTop: 4, background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--c-text-3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <I.ChevronDown size={10} style={{ transform: showOlder ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}/>
              {d._olderCount} tidligere {d._olderCount === 1 ? 'version' : 'versioner'}
            </button>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11.5, color: d.status === 'Afvigelse fundet' ? 'var(--c-warn)' : d.status === 'Erstattet' ? 'var(--c-text-4)' : 'var(--c-text-3)' }}>{d.status}</div>
          <div className="muted" style={{ fontSize: 10.5 }}>{d.uploaded}</div>
        </div>
      </div>
      {latestPerType && showOlder && d._older && d._older.map(o => (
        <div key={o.name} className="doc-item" onClick={() => onSelect(o)} style={{ background: selected?.name === o.name ? 'var(--c-surface-2)' : 'rgba(0,0,0,0.015)', paddingLeft: 38 }}>
          <div className="doc-ic" style={{ opacity: 0.55 }}/>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
            <div className="muted" style={{ fontSize: 11 }}>{o.year} · {o.size}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--c-text-4)' }}>{o.status}</div>
            <div className="muted" style={{ fontSize: 10.5 }}>{o.uploaded}</div>
          </div>
        </div>
      ))}
    </>
  );
}

window.WSDocuments = WSDocuments;
