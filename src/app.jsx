// Main app - routing + state
const { useState: useS, useEffect } = React;

// Nulstil demo i Tweaks: samme handling som knappen nederst i sidebjælken
// (confirmResetDemo i shell.jsx): bekræft, og kald så CW.resetDemo().
function ResetDemoButton() {
  return (
    <button
      className="btn btn-sm"
      style={{ width: '100%', justifyContent: 'center' }}
      onClick={() => window.confirmResetDemo()}
      title={t('Rydder alt demoen har gemt (sagens fase, uploads, memo) og genindlæser')}
    >
      <I.Refresh size={12}/> {t('Nulstil demo')}
    </button>
  );
}

// Sidens titel pr. rute, fx "Nordhavn Composite A/S · Credit memo · Crediwire"
const WS_TAB_TITLES = { overview: 'Overblik', financials: 'Virksomheden', documents: 'Dokumenter', memo: 'Credit memo', indstil: 'Indstilling' };
function routeTitle(route) {
  const parts = [];
  if (route.startsWith('workspace:')) {
    const [, id, tab] = route.split(':');
    const c = DATA.caseById ? DATA.caseById(id) : null;
    parts.push(c ? c.name : t('Sag'));
    parts.push(t(WS_TAB_TITLES[tab || 'overview'] || 'Sagen'));
  } else {
    const map = { cases: 'Mine opgaver', requests: 'Dataanmodninger', analyse: 'Porteføljeanalyse', portal: 'Kundeportal' };
    parts.push(t(map[route] || 'Mine opgaver'));
  }
  parts.push('Crediwire');
  return parts.join(' · ');
}

// Den gemte rute skal pege på en skærm, der findes. En ældre rute (fx den
// fjernede "settings") eller en sag, som "Nulstil demo" har slettet, fører
// til Mine opgaver i stedet for en tom side.
const APP_ROUTES = ['cases', 'requests', 'analyse', 'portal'];
function validRoute(r) {
  if (r && r.startsWith('workspace:')) {
    const id = r.split(':')[1];
    return DATA.caseById && DATA.caseById(id) ? r : 'cases';
  }
  return APP_ROUTES.indexOf(r) >= 0 ? r : 'cases';
}

// Under 1000 px (fx 200 % zoom) ruller sagshovedet og fanerne med indholdet,
// så memoet får højden. Sagen spørger her og flytter så sit rullefelt op, så
// det omfatter hovedet (se .ws-body og .ws-scroller i styles.css).
const SHELL_NARROW_MQ = '(max-width: 999px)';
function cwUseShellNarrow() {
  const [narrow, setNarrow] = useS(() => window.matchMedia(SHELL_NARROW_MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia(SHELL_NARROW_MQ);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, []);
  return narrow;
}
window.cwUseShellNarrow = cwUseShellNarrow;

function App() {
  const [route, setRoute] = useS(() => {
    const saved = localStorage.getItem("cw_route");
    const r = validRoute(saved);
    if (saved && r !== saved) { try { localStorage.setItem("cw_route", r); } catch (e) {} }
    return r;
  });
  const [newCaseOpen, setNewCaseOpen] = useS(false);

  // Tweak defaults (persisted via host)
  const DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "ink",
    "density": "calm",
    "sidebar": "full"
  }/*EDITMODE-END*/;

  const [tweaks, setTweak] = window.useTweaks(DEFAULTS);

  // Apply tweaks to CSS
  useEffect(() => {
    const accent = tweaks.accent;
    const r = document.documentElement.style;
    const palettes = {
      ink:   { primary: '#0d0f12', hover: '#2a2d32', ink: '#0d0f12' },
      navy:  { primary: '#1e3a5f', hover: '#2a4c79', ink: '#1a2e4a' },
      petrol:{ primary: '#0f5c63', hover: '#177079', ink: '#13434a' },
      forest:{ primary: '#1f4d3a', hover: '#296048', ink: '#1a3d2f' },
    };
    const p = palettes[accent] || palettes.ink;
    r.setProperty('--c-accent', p.primary);
    r.setProperty('--c-accent-hover', p.hover);
    r.setProperty('--c-ink', p.ink);
  }, [tweaks.accent]);

  // Smalle skærme (under 1000 px, fx 200 % zoom): sidebjælken er foldet ind
  // og åbnes som panel fra menuknappen. Over 1000 px har tilstanden ingen virkning.
  const [navOpen, setNavOpen] = useS(false);
  const navToggleRef = React.useRef(null);
  const navRef = React.useRef(null);
  const closeNav = (focusToggle) => {
    setNavOpen(false);
    // Menuknappen er skjult, mens panelet er åbent; fokus efter næste tegning
    if (focusToggle && navToggleRef.current) CW.focusSoon(navToggleRef.current);
  };
  React.useEffect(() => {
    if (!navOpen) return;
    // Fokus ind i panelet: det aktive menupunkt, ellers det første
    const panel = navRef.current;
    const first = panel && (panel.querySelector('[aria-current="page"]') || panel.querySelector('button'));
    if (first) CW.focusSoon(first);
    // Panelet er en modal dialog (mørk baggrund): Tab bliver i panelet, Esc lukker
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeNav(true); return; }
      if (e.key !== 'Tab' || !panel) return;
      const f = [...panel.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')]
        .filter(x => !x.disabled && x.getClientRects().length);
      if (!f.length) return;
      const a = document.activeElement;
      if (e.shiftKey && (a === f[0] || !panel.contains(a))) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (a === f[f.length - 1] || !panel.contains(a))) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    // Bliver skærmen bred igen, lukkes panelet, så det ikke dukker op næste gang
    const mq = window.matchMedia('(max-width: 999px)');
    const onMq = () => { if (!mq.matches) setNavOpen(false); };
    mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq);
    return () => {
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener ? mq.removeEventListener('change', onMq) : mq.removeListener(onMq);
    };
  }, [navOpen]);
  // Forlader fokus panelet (Tab videre, eller en dialog åbner), lukker det
  const onNavBlur = (e) => {
    if (!navOpen) return;
    const to = e.relatedTarget;
    if (to && (navRef.current.contains(to) || to === navToggleRef.current)) return;
    setNavOpen(false);
  };

  // Ruteskift: gem ruten og fortæl resten af appen det (fx lukker CW.toast sig)
  const go = (r) => {
    localStorage.setItem("cw_route", r);
    setRoute(r);
    setNavOpen(false);
    try { window.dispatchEvent(new CustomEvent('cw-route-changed', { detail: { route: r } })); } catch (e) {}
  };

  // Fokus ved sideskift: flyt fokus til den nye sides h1 (ellers main), så en
  // skærmlæser hører, hvor man er, og Tab fortsætter fra toppen af siden.
  // Ikke ved første indlæsning, og ikke når kun en fane i samme sag skifter:
  // fanerne beholder selv fokus. Forsvinder knappen, der skiftede fane (fx
  // "Åbn memo"), får den aktive fane fokus. En skærm, der selv flytter fokus
  // bagefter (fx klokken eller et dybdelink i memoet), vinder, fordi den kommer senere.
  const prevRouteRef = React.useRef(route);
  React.useEffect(() => {
    const prev = prevRouteRef.current;
    prevRouteRef.current = route;
    if (prev === route) return;
    const caseOf = (r) => r.startsWith('workspace:') ? r.split(':')[1] : null;
    const sameCase = caseOf(prev) !== null && caseOf(prev) === caseOf(route);
    const lost = () => !document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected;
    if (sameCase) {
      const tm = setTimeout(() => {
        if (!lost()) return;
        const tab = document.querySelector('.ws-tab[aria-current="page"]');
        if (tab) CW.focusSoon(tab);
      }, 60);
      return () => clearTimeout(tm);
    }
    let n = 0, tm;
    const tick = () => {
      const h = document.querySelector('#main h1') || document.querySelector('h1');
      if (h) { CW.focusSoon(h); return; }
      if (++n < 10) { tm = setTimeout(tick, 50); return; }
      const m = document.getElementById('main');
      if (m) CW.focusSoon(m);
    };
    tick();
    return () => clearTimeout(tm);
  }, [route]);

  // Sidens titel følger ruten. Layout-effekt, så en skærm selv kan sætte en
  // mere præcis titel i sin egen effekt bagefter (fx kundeportalens trin).
  React.useLayoutEffect(() => { document.title = routeTitle(route); }, [route]);

  // Expose router for self-contained components (e.g. global CaseSearch in Topbar)
  React.useEffect(() => { window.__go = go; }, []);

  // Parse route
  const isWorkspace = route.startsWith("workspace:");
  const workspaceParts = isWorkspace ? route.split(":") : [];
  const workspaceCaseId = workspaceParts.length > 1 ? (parseInt(workspaceParts[1]) || 1) : 1;
  const workspaceTab = isWorkspace ? (workspaceParts[2] || "overview") : null;
  const isPortal = route === "portal";

  // "Spring til indhold": flyt fokus til hovedindholdet uden at røre URL'en
  const skipToMain = (e) => {
    e.preventDefault();
    const m = document.getElementById('main');
    if (m) m.focus();
  };

  return (
    <>
      {isPortal ? (
        <CustomerPortal back={() => go("workspace:1")}/>
      ) : (
        <>
        <a href="#main" className="skip-link" onClick={skipToMain}>{t('Spring til indhold')}</a>
        <div className={"app" + (navOpen ? " nav-open" : "")}>
          {/* Menuknap og panel findes kun under 1000 px; over det er
              knappen skjult, og omslaget om sidebjælken er display: contents */}
          <button type="button" ref={navToggleRef} className="icon-btn nav-toggle"
            aria-label={t('Hovedmenu')} title={t('Hovedmenu')}
            aria-expanded={navOpen} aria-controls="cw-sidebar"
            onClick={() => setNavOpen(o => !o)}>
            <Icon size={16}><path d="M4 6h16M4 12h16M4 18h16"/></Icon>
          </button>
          {navOpen && <div className="nav-scrim" aria-hidden="true" onClick={() => closeNav(false)}/>}
          <div className="app-nav" id="cw-sidebar" ref={navRef} onBlur={onNavBlur}
            role={navOpen ? 'dialog' : undefined} aria-modal={navOpen ? 'true' : undefined} aria-label={navOpen ? t('Hovedmenu') : undefined}
            onClick={(e) => { if (e.target.closest && e.target.closest('button') && !e.target.closest('[role=group], [aria-haspopup], [role=menu]')) setNavOpen(false); }}>
            {navOpen && (
              <button type="button" className="icon-btn nav-close" aria-label={t('Luk menuen')} title={t('Luk menuen')}
                onClick={(e) => { e.stopPropagation(); closeNav(true); }}>
                <I.X size={16}/>
              </button>
            )}
            <Sidebar route={route} go={go} openNewCase={() => setNewCaseOpen(true)}/>
          </div>
          <main className="main" id="main" tabIndex={-1}>
            {route === "cases" && <Portfolio go={go}/>}
            {isWorkspace && <WorkspaceShell tab={workspaceTab} caseId={workspaceCaseId} go={go} openMemo={() => go("workspace:" + workspaceCaseId + ":memo")}/>}
            {route === "analyse" && <PortfolioAnalyse go={go}/>}
            {route === "requests" && <DataRequests go={go}/>}
          </main>
        </div>
        </>
      )}

      {/* Ny sag: fra knappen og fra andre skærme ('cw-new-case', se NewCaseHost i shell.jsx) */}
      <NewCaseHost open={newCaseOpen} close={() => setNewCaseOpen(false)} go={go}/>


      {/* Tweaks panel */}
      <window.TweaksPanel title={t('Tweaks')} defaultOpen={false}>
        <window.TweakSection label={t('Demo')}>
          <ResetDemoButton/>
          {/* Piloten skriver memoet i Word med Copilot; det indbyggede memo er gemt bag dette flag (case_facts.js) */}
          <window.TweakToggle label={t('Indbygget memo og indstilling')} value={window.CW_MEMO_MODE === 'builtin'}
            onChange={(on) => { try { localStorage.setItem('cw_memo_mode', on ? 'builtin' : 'copilot'); } catch (e) {} location.reload(); }}/>
        </window.TweakSection>
        <window.TweakSection label={t('Accentfarve')}>
          <window.TweakColor label={t('Farve')} value={
              tweaks.accent === 'navy' ? '#1e3a5f' :
              tweaks.accent === 'petrol' ? '#0f5c63' :
              tweaks.accent === 'forest' ? '#1f4d3a' : '#0d0f12'
            }
            options={['#0d0f12', '#1e3a5f', '#0f5c63', '#1f4d3a']}
            onChange={(v) => {
              const map = { '#0d0f12':'ink','#1e3a5f':'navy','#0f5c63':'petrol','#1f4d3a':'forest' };
              setTweak('accent', map[v] || 'ink');
            }}/>
        </window.TweakSection>
        <window.TweakSection label={t('Hop til skærm')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button className="btn btn-sm" onClick={() => go("cases")}>{t('Mine opgaver')}</button>
            <button className="btn btn-sm" onClick={() => go("requests")}>{t('Dataanmodninger')}</button>
            <button className="btn btn-sm" onClick={() => go("analyse")}>{t('Porteføljeanalyse')}</button>
            <button className="btn btn-sm" onClick={() => setNewCaseOpen(true)}>{t('Ny sag')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1")}>{t('Sagens overblik')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1:financials")}>{t('Finans')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1:documents")}>{t('Dokumenter')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1:memo")}>{t('Credit memo')}</button>
            <button className="btn btn-sm" onClick={() => go("portal")}>{t('Kundens portal')}</button>
          </div>
        </window.TweakSection>
      </window.TweaksPanel>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
