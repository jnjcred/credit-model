// Data collection - HERO view
function WSCollection() {
  const [copied, setCopied] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const items = DATA.COLLECTION_ITEMS;
  const total = items.length;
  const received = items.filter(i => i.status === "received").length;
  const review = items.filter(i => i.status === "review").length;
  const waiting = items.filter(i => i.status === "waiting").length;
  const missing = items.filter(i => i.status === "missing").length;
  const pct = Math.round((received + review * 0.7) / total * 100);

  // Group by category
  const cats = ["Regnskab", "Selskab", "Forretning", "Compliance", "Sikkerhed"];
  const byCat = cats.map(c => ({ name: c, items: items.filter(i => i.category === c) })).filter(c => c.items.length);

  return (
    <div className="page page-wide" style={{ maxWidth: 1320 }}>
      <div className="grid g-2-1">
        <div className="vstack" style={{ gap: 16 }}>

          {/* ERP Connection - prominent */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--c-line-2)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--c-primary-bg)', display: 'grid', placeItems: 'center', color: 'var(--c-primary)', flexShrink: 0 }}>
                <I.Database size={18}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--c-ink)' }}>ERP-forbindelse <span className="ai-hint" style={{ marginLeft: 8 }}>Aktiv</span></div>
                <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 2 }}>
                  Tilsluttet <b style={{ color: 'var(--c-ink)' }}>e-conomic</b> · seneste synkronisering <b>i dag 09:01</b> · periodetal, kontoplan og kreditorer hentes automatisk
                </div>
              </div>
              <button className="btn btn-sm btn-ghost"><I.Refresh className="ic"/> Synkroniser</button>
              <button className="btn btn-sm btn-ghost"><I.Settings className="ic"/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--c-line-2)' }}>
              {[
                { l: "Periodetal Q1 2026", v: "132 linjer", s: "ok" },
                { l: "Kontoplan", v: "48 konti", s: "ok" },
                { l: "Kreditorer", v: "23 åbne", s: "ok" },
                { l: "Banktransaktioner", v: "Beriger", s: "loading" },
              ].map((x, i) => (
                <div key={i} style={{ background: '#fff', padding: '10px 14px' }}>
                  <div className="label-mini">{x.l}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {x.s === 'ok' ? <I.Check size={11} style={{ color: 'var(--c-success)' }}/> : <I.Refresh size={11} style={{ color: 'var(--c-text-3)' }}/>}
                    {x.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress hero */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 22px 16px', display: 'flex', alignItems: 'flex-start', gap: 20, borderBottom: '1px solid var(--c-line-2)' }}>
              <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="var(--c-line-2)" strokeWidth="5"/>
                  <circle cx="36" cy="36" r="30" fill="none" stroke="var(--c-ink)" strokeWidth="5"
                    strokeDasharray={`${pct * 1.885} 200`} transform="rotate(-90 36 36)" strokeLinecap="round"/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.02em' }}>{pct}%</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em' }}>{received} af {total} elementer modtaget</div>
                  <span className="ai-hint"><I.Spark className="spark"/> Klar til memo om ~2 elementer</span>
                </div>
                <div style={{ color: 'var(--c-text-2)', fontSize: 13, marginTop: 4 }}>
                  Du kan begynde gennemgangen nu. {review} element kræver opfølgning, og {waiting} afventer kunde.
                </div>
                <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12.5 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-ink)' }}/> Modtaget · <b>{received}</b></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-warn)' }}/> Til gennemgang · <b>{review}</b></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-line-strong)' }}/> Afventer · <b>{waiting}</b></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-line-2)', border: '1px solid var(--c-line-strong)' }}/> Mangler · <b>{missing}</b></span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-sm btn-primary"><I.Send className="ic"/> Send påmindelse</button>
                <button className="btn btn-sm"><I.Plus className="ic"/> Anmod om mere</button>
              </div>
            </div>

            {/* Categories */}
            {byCat.map(cat => (
              <div key={cat.name}>
                <div style={{ padding: '12px 20px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="label-mini">{cat.name} <span style={{ color: 'var(--c-text-4)', marginLeft: 4 }}>· {cat.items.length}</span></div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                    {cat.items.filter(i=>i.status==='received').length} modtaget
                  </div>
                </div>
                <div>
                  {cat.items.map(item => <CollectionRow key={item.id} item={item}/>)}
                </div>
              </div>
            ))}
          </div>

          {/* Drag-and-drop area */}
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); }}
            style={{
              border: '1.5px dashed ' + (drag ? 'var(--c-ink)' : 'var(--c-line-strong)'),
              background: drag ? 'rgba(13,15,18,0.03)' : 'transparent',
              borderRadius: 12, padding: '32px 24px',
              display: 'flex', alignItems: 'center', gap: 16,
              transition: 'all 150ms',
            }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', color: 'var(--c-text-2)' }}>
              <I.Upload size={20}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>Træk PDF'er, regneark eller billeder her</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginTop: 3 }}>Systemet aflæser automatisk og foreslår dokumenttype. <span className="ai-hint"><I.Spark className="spark"/>OCR + udtræk</span></div>
            </div>
            <button className="btn"><I.Folder className="ic"/> Vælg filer</button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="vstack" style={{ gap: 16 }}>
          {/* Customer link */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Kundens indhentnings­link</div>
              <span className="pill outline"><span className="pill-dot" style={{ background: 'var(--c-success)' }}/>Aktivt</span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginBottom: 8 }}>Sendt til <b style={{ color: 'var(--c-ink)' }}>{DATA.REQUEST_RECIPIENT.name}</b> · {DATA.REQUEST_RECIPIENT.email}</div>
              <div className="link-banner">
                <I.Link size={14} style={{ color: 'var(--c-text-3)' }}/>
                <span className="url">{DATA.REQUEST_LINK}</span>
                <button className="btn btn-sm btn-ghost" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? <><I.Check className="ic"/> Kopieret</> : <><I.Copy className="ic"/> Kopier</>}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button className="btn btn-sm" style={{ flex: 1 }}><I.Mail className="ic"/> Send igen</button>
                <button className="btn btn-sm" style={{ flex: 1 }}><I.Eye className="ic"/> Forhåndsvis</button>
              </div>
              <div style={{ marginTop: 14, borderTop: '1px solid var(--c-line-2)', paddingTop: 12 }}>
                <div className="label-mini" style={{ marginBottom: 8 }}>Aktivitet på link</div>
                {[
                  { t: "Åbnet af kunde", w: "i dag, 08:54", dot: 'var(--c-success)' },
                  { t: "Uploadede 3 dokumenter", w: "24. maj, 09:01", dot: 'var(--c-ink)' },
                  { t: "Åbnet sikkerheds­sektion (ikke afsluttet)", w: "i går, 16:12", dot: 'var(--c-warn)' },
                  { t: "Link sendt", w: "23. maj, 14:18", dot: 'var(--c-text-4)' },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, padding: '6px 0', fontSize: 12.5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: a.dot, marginTop: 7, flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>{a.t}</div>
                    <div style={{ color: 'var(--c-text-3)', fontSize: 11.5 }}>{a.w}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* What customer sees */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Kundens visning</div>
                <div className="card-sub">Sådan ser linket ud for {DATA.REQUEST_RECIPIENT.name}</div>
              </div>
              <button className="btn btn-sm btn-ghost"><I.Maximize className="ic"/></button>
            </div>
            <div style={{ padding: 14 }}>
              <CustomerMiniPreview/>
            </div>
          </div>

          {/* Automation */}
          <div className="card">
            <div className="card-head">
              <div className="hstack">
                <div className="card-title">Automatiske kilder</div>
              </div>
            </div>
            <div style={{ padding: '4px 16px 14px' }}>
              {[
                { name: "e-conomic", what: "Periodetal, kontoplan", st: 'connected' },
                { name: "CVR-registret", what: "Selskabsdata, vedtægter", st: 'connected' },
                { name: "Experian", what: "Kreditdata, RKI", st: 'connected' },
              ].map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--c-line-2)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 5, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, color: 'var(--c-text-2)' }}>{s.name.slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{s.what}</div>
                  </div>
                  {s.st === 'connected'
                    ? <span style={{ color: 'var(--c-success)', fontSize: 11.5, display: 'inline-flex', gap: 4, alignItems: 'center' }}><I.Check size={12}/> Tilsluttet</span>
                    : <button className="btn btn-sm btn-ghost">Tilslut</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionRow({ item }) {
  const [open, setOpen] = React.useState(false);
  let icon, color, statusText, sub;
  if (item.status === "received") {
    icon = <I.CheckCircle size={16}/>; color = 'var(--c-success)'; statusText = "Modtaget"; sub = item.uploaded;
  } else if (item.status === "review") {
    icon = <I.AlertTriangle size={16}/>; color = 'var(--c-warn)'; statusText = "Til gennemgang"; sub = item.note;
  } else if (item.status === "waiting") {
    icon = <I.Clock size={16}/>; color = 'var(--c-text-3)'; statusText = "Afventer"; sub = item.reminder;
  } else {
    icon = <I.CircleDashed size={16}/>; color = 'var(--c-text-4)'; statusText = "Ikke anmodet"; sub = "";
  }

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto auto', gap: 12, alignItems: 'center', padding: '11px 20px', borderTop: '1px solid var(--c-line-2)', cursor: 'pointer' }}
      >
        <span style={{ color }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)', display: 'flex', alignItems: 'center', gap: 7 }}>
            {item.label}
            {!item.required && <span className="tag" style={{ fontSize: 10 }}>Valgfri</span>}
            {item.ai && item.ai.confidence === 'high' && item.status === 'received' && (
              <span className="ai-hint"><I.Spark className="spark"/> Aflæst</span>
            )}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
            {item.file ? <span className="mono">{item.file}</span> : null}
            {item.file && item.size ? <span> · {item.size}</span> : null}
            {!item.file && item.source ? <span>{item.source}</span> : null}
            {sub ? <span style={{ marginLeft: item.file || item.source ? 8 : 0, color: item.status === 'review' ? 'var(--c-warn)' : undefined }}>{item.file || item.source ? '· ' : ''}{sub}</span> : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {item.status === 'received' && <button className="btn btn-sm btn-ghost" onClick={e => e.stopPropagation()}><I.Eye className="ic"/></button>}
          {item.status === 'waiting' && <button className="btn btn-sm" onClick={e => e.stopPropagation()}><I.Send className="ic"/> Påmind</button>}
          {item.status === 'missing' && <button className="btn btn-sm" onClick={e => e.stopPropagation()}><I.Plus className="ic"/> Anmod</button>}
          {item.status === 'review' && <button className="btn btn-sm btn-primary" onClick={e => e.stopPropagation()}>Gennemgå</button>}
        </div>
        <I.ChevronDown size={14} style={{ color: 'var(--c-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}/>
      </div>
      {open && (
        <div style={{ padding: '10px 20px 14px 54px', background: 'var(--c-surface-2)', borderTop: '1px solid var(--c-line-2)', fontSize: 12.5 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="label-mini" style={{ marginBottom: 4 }}>Kilde</div>
              <div>{item.source}</div>
              {item.uploaded && <div className="muted" style={{ marginTop: 2 }}>{item.uploaded}</div>}
            </div>
            {item.ai && (
              <div>
                <div className="label-mini" style={{ marginBottom: 4 }}>AI-ekstraktion</div>
                <div>
                  {item.ai.extracted ? <><b>{item.ai.extracted}</b> nøglepunkter udtrukket · </> : null}
                  Konfidens: <b style={{ color: item.ai.confidence === 'high' ? 'var(--c-success)' : 'var(--c-warn)' }}>{item.ai.confidence === 'high' ? 'høj' : 'middel'}</b>
                </div>
              </div>
            )}
          </div>
          {item.note && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--c-warn-bg)', borderRadius: 6, color: 'var(--c-warn)', fontSize: 12.5 }}>
              <I.AlertTriangle size={12} style={{ verticalAlign: -2, marginRight: 5 }}/>{item.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Mini preview of the customer-facing portal
function CustomerMiniPreview() {
  return (
    <div style={{ border: '1px solid var(--c-line)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-line-2)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-surface-2)' }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--c-ink)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 600 }}>cw</div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>EIFO · Kreditmateriale</div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 12.5, color: 'var(--c-text-2)' }}>Hej Anders,</div>
        <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Mette fra EIFO har bedt om følgende materiale for at vurdere jeres ansøgning.</div>
        <div style={{ marginTop: 12 }}>
          {[
            { l: 'Seneste årsrapport', d: true },
            { l: 'Periodetal Q1 2026', d: true },
            { l: 'Budget 2026-2028', d: true },
            { l: 'Sikkerheds­dokumenter', d: false, h: true },
            { l: 'Ejeraftale', d: false },
          ].map((x, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12.5, borderBottom: i < 4 ? '1px solid var(--c-line-2)' : 'none' }}>
              {x.d ? <I.Check size={12} style={{ color: 'var(--c-success)' }}/>
                   : <I.Circle size={12} style={{ color: x.h ? 'var(--c-warn)' : 'var(--c-text-4)' }}/>}
              <span style={{ flex: 1, color: x.d ? 'var(--c-text-3)' : 'var(--c-ink)', textDecoration: x.d ? 'line-through' : 'none' }}>{x.l}</span>
              {!x.d && <span style={{ fontSize: 10.5, color: x.h ? 'var(--c-warn)' : 'var(--c-text-3)' }}>{x.h ? 'Påbegyndt' : ''}</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--c-surface-2)', borderRadius: 6, fontSize: 11.5, color: 'var(--c-text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <I.Lock size={11}/> Sikker forbindelse · ingen login krævet
        </div>
      </div>
    </div>
  );
}

window.WSCollection = WSCollection;
