// Main app - routing + state
const { useState: useS, useEffect } = React;

function App() {
  const [route, setRoute] = useS(localStorage.getItem("cw_route") || "cases");
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

  const go = (r) => { localStorage.setItem("cw_route", r); setRoute(r); };

  // Expose router for self-contained components (e.g. global CaseSearch in Topbar)
  React.useEffect(() => { window.__go = go; }, []);

  // Parse route
  const isWorkspace = route.startsWith("workspace:");
  const workspaceParts = isWorkspace ? route.split(":") : [];
  const workspaceCaseId = workspaceParts.length > 1 ? (parseInt(workspaceParts[1]) || 1) : 1;
  const workspaceTab = isWorkspace ? (workspaceParts[2] || "overview") : null;
  const isPortal = route === "portal";

  return (
    <>
      {isPortal ? (
        <CustomerPortal back={() => go("workspace:1")}/>
      ) : (
        <div className="app">
          <Sidebar route={route} go={go} openNewCase={() => setNewCaseOpen(true)}/>
          <div className="main">
            {route === "cases" && <Portfolio go={go} openNewCase={() => setNewCaseOpen(true)}/>}
            {isWorkspace && <WorkspaceShell tab={workspaceTab} caseId={workspaceCaseId} go={go} openMemo={() => go("workspace:" + workspaceCaseId + ":memo")}/>}
            {route === "analyse" && <PortfolioAnalyse go={go}/>}
            {route === "inbox" && <ComingSoon title={t('Indbakke')} sub={t('Notifikationer, kundebeskeder, deadline-påmindelser')}/>}
            {route === "requests" && <DataRequests go={go}/>}
            {route === "templates" && <ComingSoon title={t('Skabeloner')} sub={t('Memo-skabeloner, datapakker, spørgsmålssæt')}/>}
            {route === "reports" && <ComingSoon title={t('Rapporter')} sub={t('Portefølje, performance, audit trail')}/>}
            {route === "settings" && <ComingSoon title={t('Indstillinger')} sub={t('Team, integrationer, branding')}/>}
          </div>
        </div>
      )}

      {newCaseOpen && <NewCaseModal close={() => setNewCaseOpen(false)} go={go}/>}


      {/* Tweaks panel */}
      <window.TweaksPanel title={t('Tweaks')} defaultOpen={false}>
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
            <button className="btn btn-sm" onClick={() => go("cases")}>{t('Sagsoversigt')}</button>
            <button className="btn btn-sm" onClick={() => go("analyse")}>{t('Porteføljeanalyse ★')}</button>
            <button className="btn btn-sm" onClick={() => setNewCaseOpen(true)}>{t('Ny sag')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1")}>{t('Workspace')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1:financials")}>{t('Finans')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1:documents")}>{t('Dokumenter')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1:findings")}>{t('Findings')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1:market")}>{t('Marked')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1:ownership")}>{t('Ejerskab')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:1:memo")}>{t('Credit memo')}</button>
            <button className="btn btn-sm" onClick={() => go("portal")}>{t('Kundens portal')}</button>
          </div>
        </window.TweakSection>
      </window.TweaksPanel>
    </>
  );
}

function ComingSoon({ title, sub }) {
  return (
    <>
      <Topbar crumbs={[title]} right={null}/>
      <div className="scroll">
        <div className="page">
          <div className="page-head">
            <div>
              <h1 className="page-title">{title}</h1>
              <div className="page-sub">{sub}</div>
            </div>
          </div>
          <div className="card empty">
            <I.Layout className="ic"/>
            <div>{t('Denne sektion er en del af det fulde produkt')}</div>
            <div style={{ fontSize: 11.5, marginTop: 4 }}>{t('Prototypen fokuserer på sagsflow og workspace')}</div>
          </div>
        </div>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
