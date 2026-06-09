// Shell - sidebar + topbar
const { useState } = React;

function Sidebar({ route, go, openNewCase }) {
  const isActive = (r) => route === r || (r === "cases" && route.startsWith("workspace")) || (r === "analyse" && route === "analyse");
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">cw</div>
        <div>
          <div className="brand-name">EIFO</div>
          <div className="brand-org">Kreditafdeling</div>
        </div>
      </div>

      <button className="btn btn-primary" style={{ justifyContent: 'center', width: '100%', marginBottom: 6 }} onClick={openNewCase}>
        <I.Plus size={14} /> Ny sag
      </button>

      <div className="nav">
        <button className={"nav-item " + (isActive("cases") ? "active" : "")} onClick={() => go("cases")}>
          <I.Briefcase className="ic"/> Mine opgaver <span className="count">8</span>
        </button>
        <button className={"nav-item " + (isActive("analyse") ? "active" : "")} onClick={() => go("analyse")}>
          <I.Filter className="ic"/> Porteføljeanalyse
        </button>
      </div>

      <div style={{ margin: '8px 0 4px', padding: '0 4px' }}>
        <button
          onClick={() => go("portal")}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
            border: '1.5px dashed var(--c-line-strong)', background: 'transparent',
            fontSize: 12.5, color: 'var(--c-text-3)', fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-primary)'; e.currentTarget.style.color = 'var(--c-primary)'; e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-line-strong)'; e.currentTarget.style.color = 'var(--c-text-3)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <I.User size={13}/> Indhentningsflow
        </button>
      </div>

      <div className="sidebar-foot">
        <button className="nav-item" onClick={() => go("settings")}>
          <I.Settings className="ic"/> Indstillinger
        </button>
        <div className="user-chip">
          <div className="avatar">ML</div>
          <div className="meta">
            <b>Mette Larsen</b>
            <span>Kreditmedarbejder</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs, right }) {
  return (
    <div className="topbar">
      <div className="crumb">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const label = typeof c === 'string' ? c : c.label;
          const onClick = typeof c === 'object' ? c.onClick : null;
          return (
            <React.Fragment key={i}>
              {i > 0 && <I.ChevronRight size={12} className="crumb-sep"/>}
              {isLast ? (
                <b>{label}</b>
              ) : onClick ? (
                <button onClick={onClick} style={{ background: 'transparent', border: 'none', padding: '2px 4px', margin: '-2px -4px', color: 'var(--c-text-2)', cursor: 'pointer', borderRadius: 4, fontSize: 'inherit', fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface-2)'; e.currentTarget.style.color = 'var(--c-ink)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-text-2)'; }}>
                  {label}
                </button>
              ) : (
                <span>{label}</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="topbar-right">
        <CaseSearch/>
        <div style={{ width: 1, height: 18, background: 'var(--c-line)', margin: '0 4px' }}/>
        {right}
        <div style={{ width: 1, height: 18, background: 'var(--c-line)', margin: '0 4px' }}/>
        <button className="icon-btn" title="Notifikationer"><I.Bell size={15}/></button>
        <button className="icon-btn" title="Hjælp"><I.Help size={15}/></button>
      </div>
    </div>
  );
}

function CaseSearch() {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(0);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const all = DATA.CASES || [];
  const results = q.trim()
    ? all.filter(c => {
        const s = q.trim().toLowerCase();
        return c.name.toLowerCase().includes(s) || String(c.cvr).toLowerCase().includes(s);
      }).slice(0, 8)
    : all.slice(0, 6);

  const navigate = (c) => {
    setOpen(false);
    setQ("");
    if (window.__go) window.__go("workspace:" + c.id);
  };

  const onKey = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHover(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHover(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[hover]) navigate(results[hover]); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current && inputRef.current.blur(); }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', width: 260 }}>
        <I.Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', pointerEvents: 'none' }}/>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHover(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Søg kunde - navn eller CVR"
          aria-label="Søg kunde"
          style={{
            width: '100%', height: 30, padding: '0 28px 0 28px',
            border: '1px solid var(--c-line)', borderRadius: 6,
            fontSize: 12.5, background: '#fff', color: 'var(--c-ink)', outline: 'none',
          }}
        />
        {q && (
          <button
            type="button" aria-label="Ryd"
            onMouseDown={(e) => { e.preventDefault(); setQ(""); setOpen(true); inputRef.current && inputRef.current.focus(); }}
            style={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              width: 20, height: 20, borderRadius: 4, border: 0, background: 'transparent',
              cursor: 'pointer', color: 'var(--c-text-3)', display: 'grid', placeItems: 'center',
            }}
          >
            <I.X size={11}/>
          </button>
        )}
      </div>

      {open && (
        <div role="listbox" style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 320,
          background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8,
          boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden',
        }}>
          {q.trim() === "" && (
            <div style={{ padding: '8px 12px', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-text-3)', borderBottom: '1px solid var(--c-line-2)' }}>
              Seneste sager
            </div>
          )}
          {results.length === 0 ? (
            <div style={{ padding: '14px 14px', fontSize: 12.5, color: 'var(--c-text-3)' }}>
              Ingen sager matcher "{q}"
            </div>
          ) : (
            results.map((c, i) => (
              <button
                key={c.id}
                role="option"
                aria-selected={hover === i}
                onMouseEnter={() => setHover(i)}
                onMouseDown={(e) => { e.preventDefault(); navigate(c); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px', border: 0,
                  borderBottom: i < results.length - 1 ? '1px solid var(--c-line-2)' : 'none',
                  background: hover === i ? 'var(--c-surface-2)' : '#fff',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
                  display: 'grid', placeItems: 'center',
                  fontWeight: 600, fontSize: 10.5, color: 'var(--c-text-2)', flexShrink: 0,
                }}>
                  {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--c-ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 1 }}>
                    <span className="mono">CVR {c.cvr}</span> · {c.responsible}
                  </div>
                </div>
                <I.ChevronRight size={13} style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
window.CaseSearch = CaseSearch;
