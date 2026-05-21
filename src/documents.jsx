// Documents + AI extraction
function WSDocuments() {
  const [uploaded, setUploaded] = React.useState([]); // advisor-uploaded docs (session)
  const allDocs = React.useMemo(() => [...uploaded, ...DATA.DOCS], [uploaded]);

  const [selected, setSelected] = React.useState(allDocs[0]);
  const [q, setQ] = React.useState("");
  const [sortMode, setSortMode] = React.useState("newest");
  const [sortOpen, setSortOpen] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const handleFiles = (fileList) => {
    if (!fileList || !fileList.length) return;
    const today = new Date();
    const stamp = `${today.getDate()}. ${['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][today.getMonth()]} ${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}`;
    const dateIso = today.toISOString().slice(0, 10);
    const inferType = (name) => {
      const n = name.toLowerCase();
      if (n.includes('aarsrapport') || n.includes('årsrapport')) return 'Årsrapport';
      if (n.includes('budget')) return 'Budget';
      if (n.includes('periode') || n.includes('saldo')) return 'Periodetal';
      if (n.includes('laan') || n.includes('lån')) return 'Låneaftale';
      if (n.includes('pant') || n.includes('sikker')) return 'Sikkerhed';
      if (n.includes('ejer') || n.includes('vedtaeg') || n.includes('vedtæg')) return 'Selskab';
      return 'Andet';
    };
    const fmtSize = (bytes) => {
      if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
      return bytes + ' B';
    };
    const newDocs = Array.from(fileList).map(f => ({
      name: f.name,
      type: inferType(f.name),
      year: '-',
      size: fmtSize(f.size),
      uploaded: stamp,
      date: dateIso,
      ai: 0,
      status: 'Modtaget',
      origin: 'uploaded',
      sourceLabel: 'Rådgiverupload',
    }));
    setUploaded(prev => [...newDocs, ...prev]);
    if (newDocs.length) setSelected(newDocs[0]);
  };

  const types = [...new Set(allDocs.map(d => d.type))];
  let docs = [...allDocs];

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
    "name": "Navn (A-Z)",
    "size": "Størrelse",
    "type": "Type, derefter dato",
    "latest-per-type": "Seneste pr. type",
  };

  return (
    <div className="page page-wide" style={{ maxWidth: 1320 }}>
      <div className="grid" style={{ gridTemplateColumns: '420px 1fr', gap: 16 }}>
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-line-2)' }}>
            {/* Upload zone */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                padding: '10px 12px', marginBottom: 10,
                border: '1px dashed ' + (dragOver ? 'var(--c-primary)' : 'var(--c-line-strong)'),
                background: dragOver ? 'var(--c-primary-bg)' : 'var(--c-surface-2)',
                borderRadius: 7,
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer',
                transition: 'border-color .12s, background .12s',
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current && fileInputRef.current.click(); } }}
              aria-label="Upload dokumenter"
            >
              <span style={{
                width: 28, height: 28, borderRadius: 6,
                background: '#fff', border: '1px solid var(--c-line)',
                display: 'grid', placeItems: 'center', color: 'var(--c-text-2)',
                flexShrink: 0,
              }}>
                <I.Upload size={13}/>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-ink)' }}>Upload dokument</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 1 }}>Træk filer hertil eller klik for at vælge</div>
              </div>
            </div>

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
                Alle · {allDocs.length}
              </span>
              {types.map(t => {
                const n = allDocs.filter(d => d.type === t).length;
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
            {(() => {
              const publicDocs = docs.filter(d => d.origin === 'public');
              const uploadedDocs = docs.filter(d => d.origin !== 'public');
              const groups = [
                { key: 'public',   label: 'Offentligt hentet',  sub: 'Dokumenter hentet automatisk fra offentlige eller eksterne kilder.', items: publicDocs },
                { key: 'uploaded', label: 'Uploadet materiale', sub: 'Dokumenter modtaget fra kunde, rådgiver eller kundelink.',          items: uploadedDocs },
              ];
              return groups.map(g => (
                g.items.length === 0 ? null : (
                  <div key={g.key}>
                    <div style={{
                      padding: '12px 14px 6px',
                      background: 'var(--c-surface-2)',
                      borderBottom: '1px solid var(--c-line-2)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-text-2)' }}>
                          {g.label}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                          · {g.items.length} {g.items.length === 1 ? 'dokument' : 'dokumenter'}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2, lineHeight: 1.4 }}>
                        {g.sub}
                      </div>
                    </div>
                    {g.items.map((d, i) => (
                      <DocRow key={d.name + i} d={d} selected={selected} onSelect={setSelected} latestPerType={sortMode === "latest-per-type"}/>
                    ))}
                  </div>
                )
              ));
            })()}
            {docs.length === 0 && (
              <div style={{ padding: '24px 14px', fontSize: 12.5, color: 'var(--c-text-3)', textAlign: 'center' }}>
                Ingen dokumenter matcher filtrene.
              </div>
            )}
          </div>
        </div>

        {/* Document viewer */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-head">
            <div>
              <div className="card-title">{selected?.name || "Vælg dokument"}</div>
              <div className="card-sub">{selected?.type} · uploadet {selected?.uploaded}</div>
            </div>
            <div className="hstack">
              <button className="btn btn-sm btn-ghost"><I.Download className="ic"/></button>
              <button className="btn btn-sm"><I.Maximize className="ic"/> Åbn</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0, flex: 1, minHeight: 480 }}>
            <div style={{
              padding: 28, background: 'var(--c-surface-2)',
              display: 'flex', justifyContent: 'center',
              overflow: 'auto',
            }}>
              {selected?.type === 'Årsrapport' ? (
                <AnnualReportPreview doc={selected}/>
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 14, padding: '60px 20px',
                }}>
                  <div style={{
                    width: 56, height: 70, borderRadius: 4,
                    background: '#fff', border: '1px solid var(--c-line)',
                    display: 'grid', placeItems: 'center',
                    color: 'var(--c-text-3)',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    <I.File size={22}/>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{selected?.name || 'Intet dokument valgt'}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 3 }}>
                      {selected ? `${selected.type} · ${selected.size}` : 'Vælg et dokument i listen til venstre'}
                    </div>
                  </div>
                  {selected && (
                    <button className="btn btn-sm" style={{ marginTop: 4 }}><I.Maximize className="ic"/> Åbn dokument</button>
                  )}
                </div>
              )}
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
          <div className="muted" style={{ fontSize: 11.5 }}>{d.type} · {d.sourceLabel || (d.origin === 'public' ? 'CVR' : 'Kundeupload')} · {d.year} · {d.size}</div>
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

/* ─────────────────────────────────────────────────────────────────────────
   AnnualReportPreview - realistic PDF-style preview of a Danish årsrapport
   ──────────────────────────────────────────────────────────────────────── */
function AnnualReportPreview({ doc }) {
  const co = DATA.COMPANY;
  const year = (doc && doc.year) || '2025';
  // Year-specific figures (DKK 1.000) matching the annual table in Finansielt overblik
  const figures = {
    '2023': { revenue: '12.800', ebitda: '1.300', profit: '300',  equity: '3.500', balance: '9.400'  },
    '2024': { revenue: '15.200', ebitda: '1.900', profit: '700',  equity: '4.800', balance: '11.200' },
    '2025': { revenue: '18.500', ebitda: '2.400', profit: '1.000',equity: '6.200', balance: '14.000' },
  };
  const f = figures[year] || figures['2025'];
  const prevYear = String(Number(year) - 1);
  const fp = figures[prevYear] || figures['2024'];

  const Section = ({ title, children }) => (
    <>
      <div style={{ marginTop: 18, marginBottom: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', color: '#0d0f12', textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </>
  );

  return (
    <div style={{
      width: '100%', maxWidth: 560,
      background: '#fff',
      boxShadow: '0 4px 20px rgba(15,17,20,0.08), 0 1px 3px rgba(15,17,20,0.06)',
      borderRadius: 2,
      padding: '48px 56px 56px',
      fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
      color: '#1a1d22',
      fontSize: 11,
      lineHeight: 1.55,
      position: 'relative',
    }}>
      {/* Page header line */}
      <div style={{
        position: 'absolute', top: 18, left: 56, right: 56,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: 9, color: '#8a9099', letterSpacing: '0.04em',
      }}>
        <span>{co.name}</span>
        <span>Årsrapport {year}</span>
      </div>

      {/* Cover-style title block */}
      <div style={{ borderBottom: '1px solid #d3d6dc', paddingBottom: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#5b6068', textTransform: 'uppercase', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
          Årsrapport
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#0d0f12', marginTop: 6, letterSpacing: '-0.01em' }}>
          {co.name}
        </div>
        <div style={{ fontSize: 11, color: '#5b6068', marginTop: 6, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
          For perioden 1. januar - 31. december {year} · CVR {String(co.cvr).replace(/\s+/g, '')}
        </div>
      </div>

      {/* Selskabsoplysninger */}
      <Section title="Selskabsoplysninger">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
          <tbody>
            {[
              ['Navn', co.name],
              ['CVR-nr.', String(co.cvr).replace(/\s+/g, '')],
              ['Adresse', `${co.address || 'Strandgade 12'}, ${co.postal || '9900 Frederikshavn'}`],
              ['Selskabsform', co.legalForm || 'Anpartsselskab (ApS)'],
              ['Stiftet', co.founded || '12. marts 2017'],
              ['Regnskabsår', `1. januar - 31. december ${year}`],
            ].map(([k, v], i) => (
              <tr key={i}>
                <td style={{ padding: '3px 0', color: '#5b6068', width: 150, verticalAlign: 'top' }}>{k}</td>
                <td style={{ padding: '3px 0', color: '#1a1d22' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Ledelsespåtegning */}
      <Section title="Ledelsespåtegning">
        <p style={{ margin: 0 }}>
          Bestyrelse og direktion har dags dato behandlet og godkendt årsrapporten for regnskabsåret 1. januar - 31. december {year} for {co.name}.
        </p>
        <p style={{ marginTop: 8 }}>
          Årsrapporten aflægges i overensstemmelse med årsregnskabsloven. Det er vores opfattelse, at årsrapporten giver et retvisende billede af selskabets aktiver, passiver og finansielle stilling pr. 31. december {year} samt af resultatet af selskabets aktiviteter for regnskabsåret.
        </p>
      </Section>

      {/* Hoved- og nøgletal */}
      <Section title="Hoved- og nøgletal">
        <div style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 10.5, lineHeight: 1.7 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 18, color: '#5b6068', borderBottom: '1px solid #d3d6dc', paddingBottom: 4 }}>
            <span style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: 10 }}>DKK 1.000</span>
            <span>{year}</span>
            <span>{prevYear}</span>
          </div>
          {[
            ['Bruttofortjeneste',   f.revenue, fp.revenue],
            ['EBITDA',               f.ebitda,  fp.ebitda],
            ['Årets resultat',       f.profit,  fp.profit],
            ['Egenkapital',          f.equity,  fp.equity],
            ['Balancesum',           f.balance, fp.balance],
          ].map((r, i, arr) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 18,
              padding: '4px 0',
              borderBottom: i < arr.length - 1 ? '1px solid #eef0f3' : 'none',
            }}>
              <span style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontSize: 10.5 }}>{r[0]}</span>
              <span>{r[1]}</span>
              <span style={{ color: '#5b6068' }}>{r[2]}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Note 14 - anpartshaverlån */}
      <Section title="Noter - Anpartshaverlån (note 14)">
        <p style={{ margin: 0 }}>
          Selskabet har optaget lån fra hovedaktionær Anders Nielsen på <b>500</b> tkr. Lånet er rentebærende (CIBOR + 2,0%) og forfalder til betaling i 2028.
          Der er ikke afgivet tilbagetrædelseserklæring for lånet.
        </p>
      </Section>

      {/* Signature */}
      <div style={{
        marginTop: 22, paddingTop: 14, borderTop: '1px solid #d3d6dc',
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: '#5b6068',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}>
        <span>Frederikshavn, 28. april {String(Number(year) + 1)}</span>
        <span>Side 1 af 18</span>
      </div>
    </div>
  );
}

window.WSDocuments = WSDocuments;
window.AnnualReportPreview = AnnualReportPreview;
