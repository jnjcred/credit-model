// Shell — sidebar + topbar
const { useState } = React;

function Sidebar({ route, go, openNewCase }) {
  const isActive = (r) => route === r || (r === "cases" && route.startsWith("workspace"));
  const [openPortfolio, setOpenPortfolio] = React.useState(route.startsWith("portfolio"));
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">cw</div>
        <div>
          <div className="brand-name">Crediwire</div>
          <div className="brand-org">EIFO · Credit ops</div>
        </div>
      </div>

      <button className="btn btn-primary" style={{ justifyContent: 'center', width: '100%', marginBottom: 6 }} onClick={openNewCase}>
        <I.Plus size={14} /> Ny sag
      </button>

      <div className="nav">
        <div className="nav-section">Mine sager</div>
        <button className={"nav-item " + (isActive("cases") ? "active" : "")} onClick={() => go("cases")}>
          <I.Briefcase className="ic"/> Mine opgaver <span className="count">8</span>
        </button>
        <button className={"nav-item " + (isActive("inbox") ? "active" : "")} onClick={() => go("inbox")}>
          <I.Inbox className="ic"/> Indbakke <span className="dot"></span>
        </button>
        <button className={"nav-item " + (isActive("requests") ? "active" : "")} onClick={() => go("requests")}>
          <I.Send className="ic"/> Data­anmodninger <span className="count">7</span>
        </button>

        <div className="nav-section">Kreditkontor</div>
        <button className={"nav-item " + (route.startsWith("portfolio") ? "active" : "")} onClick={() => { setOpenPortfolio(!openPortfolio); go("portfolio"); }}>
          <I.PieChart className="ic"/> Porteføljeoverblik
          <span style={{ marginLeft: 'auto', color: 'var(--c-text-3)' }}>
            <I.ChevronDown size={12} style={{ transform: openPortfolio ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 150ms' }}/>
          </span>
        </button>
        {openPortfolio && (
          <div style={{ paddingLeft: 14, borderLeft: '1px solid var(--c-line)', marginLeft: 16 }}>
            <button className={"nav-item " + (route === "portfolio" ? "active" : "")} onClick={() => go("portfolio")} style={{ fontSize: 12.5 }}>Overblik</button>
            <button className="nav-item" style={{ fontSize: 12.5 }}>Risikomarkører</button>
            <button className="nav-item" style={{ fontSize: 12.5 }}>Eksponering</button>
            <button className="nav-item" style={{ fontSize: 12.5 }}>Overvågning</button>
          </div>
        )}

        <div className="nav-section">Bibliotek</div>
        <button className={"nav-item " + (isActive("templates") ? "active" : "")} onClick={() => go("templates")}>
          <I.Layout className="ic"/> Skabeloner
        </button>
        <button className={"nav-item " + (isActive("reports") ? "active" : "")} onClick={() => go("reports")}>
          <I.BarChart className="ic"/> Rapporter
        </button>

        <div className="nav-section">Pinnede</div>
        <button className="nav-item" onClick={() => go("workspace:1")}>
          <I.Pin className="ic"/> Nordhavn Composite
        </button>
        <button className="nav-item" onClick={() => go("workspace:5")}>
          <I.Pin className="ic"/> Lyngbæk Industrier
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
        {right}
        <div style={{ width: 1, height: 18, background: 'var(--c-line)', margin: '0 4px' }}/>
        <button className="icon-btn" title="Søg"><I.Search size={15}/></button>
        <button className="icon-btn" title="Notifikationer"><I.Bell size={15}/></button>
        <button className="icon-btn" title="Hjælp"><I.Help size={15}/></button>
      </div>
    </div>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
