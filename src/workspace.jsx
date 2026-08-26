// Case workspace shell - header + tabs + content router
function WorkspaceShell({ tab, go, openMemo, caseId }) {
  const co = DATA.COMPANY;
  const caseData = DATA.CASES.find(c => c.id === caseId) || DATA.CASES[0];
  const scrollRef = React.useRef(null);
  const scrollMap = React.useRef({});
  const [confirmIndstil, setConfirmIndstil] = React.useState(false);
  const [showCustomerStatus, setShowCustomerStatus] = React.useState(false);
  const [indstillet, setIndstillet] = React.useState(true);
  const [indstilletAt, setIndstilletAt] = React.useState(new Date());

  // Save current scroll position per tab; restore on tab change
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => { scrollMap.current[tab] = el.scrollTop; };
    el.addEventListener('scroll', onScroll, { passive: true });
    // Restore after layout
    const id = requestAnimationFrame(() => {
      el.scrollTop = scrollMap.current[tab] || 0;
    });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(id);
    };
  }, [tab]);

  const tabs = [
    { k: "overview", label: t("Overblik"), ic: <I.Layout className="ic"/> },
    { k: "financials", label: t("Finansielt overblik"), ic: <I.BarChart className="ic"/> },
    { k: "documents", label: t("Dokumenter"), ic: <I.FileText className="ic"/>, badge: "12" },
    { k: "memo", label: t("Credit memo"), ic: <I.File className="ic"/> },
  ];

  return (
    <>
      <Topbar
        crumbs={[{ label: t("Mine opgaver"), onClick: () => go("cases") }, co.name]}
        right={
          <>
            <button className="btn btn-sm btn-ghost"><I.Share className="ic"/> {t('Del')}</button>
            <button className="btn btn-sm" onClick={() => go("workspace:" + caseId + ":memo")}><I.FileText className="ic"/> {t('Credit memo')}</button>
          </>
        }
      />

      <div className="ws-header">
        <div className="ws-h-row">
          <div className="ws-logo">{co.short}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="ws-co-name">{co.name}</div>
              {tab === "indstil" && indstillet ? statusPill("Indstillet") : statusPill(co.status)}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2 }}>
              <span className="mono">{t('Sagsnr.')} {caseData.caseNr}</span>
              <span style={{ margin: '0 6px', color: 'var(--c-line-strong)' }}>·</span>
              <span className="mono">CVR {co.cvr}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', border: '1px solid var(--c-line)', borderRadius: 999, background: 'var(--c-surface)', whiteSpace: 'nowrap' }}>
              <div className="avatar" style={{ width: 20, height: 20, fontSize: 9 }}>ML</div>
              <span style={{ fontSize: 12, fontWeight: 500 }}>{co.responsible}</span>
            </div>
            <button
              onClick={() => setShowCustomerStatus(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 30, padding: '0 11px',
                border: '1.5px dashed var(--c-line-strong)', borderRadius: 7,
                background: 'transparent', cursor: 'pointer',
                fontSize: 12, color: 'var(--c-text-3)', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-primary)'; e.currentTarget.style.color = 'var(--c-primary)'; e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-line-strong)'; e.currentTarget.style.color = 'var(--c-text-3)'; e.currentTarget.style.background = 'transparent'; }}
              title={t("Se hvad kunden ser")}
            >
              <I.Eye size={12}/> {t('Kundeside')}
            </button>
            {tab === "indstil" && indstillet
              ? <button className="btn btn-sm" style={{ background: 'var(--c-success)', borderColor: 'var(--c-success)', color: '#fff' }}><I.Check className="ic"/> {t('Indstillet')}</button>
              : <button className="btn btn-sm btn-primary" onClick={() => setConfirmIndstil(true)}>{t('Indstil kunde')} <I.ArrowRight className="ic"/></button>
            }
          </div>
        </div>
      </div>

      <div className="ws-tabs">
        {tabs.map(t => {
          if (t.action) {
            const isActive = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => go("workspace:" + caseId + ":" + t.k)}
                style={{
                  height: 34, padding: '0 14px',
                  background: isActive ? 'var(--c-success)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--c-success)',
                  border: '1.5px solid var(--c-success)',
                  borderRadius: 7, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginLeft: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.ic} {t.label}
              </button>
            );
          }
          return (
            <button key={t.k} className={"ws-tab " + (tab === t.k ? "active" : "")} onClick={() => go("workspace:" + caseId + ":" + t.k)}>
              {t.ic} {t.label} {t.badge && <span className="badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      <div className="scroll" ref={scrollRef}>
        {tab === "overview" && <WSOverview go={go} caseId={caseId}/>}
        {tab === "financials" && <WSFinancials go={go}/>}
        {tab === "documents" && <WSDocuments/>}
        {tab === "memo" && <WSMemo/>}
        {tab === "indstil" && <WSIndstil go={go} caseId={caseId} indstillet={indstillet} indstilletAt={indstilletAt} onIndstil={() => { setIndstilletAt(new Date()); setIndstillet(true); }} onReset={() => setIndstillet(false)}/>}
      </div>

      {showCustomerStatus && (
        <div
          onClick={() => setShowCustomerStatus(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.55)', zIndex: 1100, display: 'flex', flexDirection: 'column' }}
        >
          {/* Preview bar */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 20px', background: '#1a1d22', color: '#fff',
            }}
          >
            <span style={{ fontSize: 10.5, letterSpacing: '0.07em', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{t('Forhåndsvisning')}</span>
            <span style={{ fontSize: 11.5, padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4, color: 'rgba(255,255,255,0.6)' }}>{t('Hvad kunden ser')}</span>
            <div style={{ flex: 1 }}/>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{co.name} · {t('Sagsnr.')} {caseData.caseNr}</span>
            <button
              onClick={() => setShowCustomerStatus(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
            >
              <I.X size={12}/> {t('Luk')}
            </button>
          </div>
          {/* Content */}
          <div onClick={e => e.stopPropagation()} style={{ flex: 1, background: '#fff', overflowY: 'auto' }}>
            <WSCustomerStatus/>
          </div>
        </div>
      )}

      {confirmIndstil && (
        <div
          onClick={() => setConfirmIndstil(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)',
            display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(420px, 100%)',
              background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)',
              boxShadow: 'var(--shadow-lg)', padding: '28px 28px 24px',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--c-ink)', marginBottom: 8 }}>{t('Er du sikker?')}</div>
            <div style={{ fontSize: 13.5, color: 'var(--c-text-2)', lineHeight: 1.55, marginBottom: 24 }}>
              {t('Du er ved at indstille kunden til kreditkomitéen. Vil du fortsætte?')}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-sm" onClick={() => setConfirmIndstil(false)}>{t('Annullér')}</button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => { setConfirmIndstil(false); go("workspace:" + caseId + ":indstil"); }}
              >
                {t('Ja, indstil kunde')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const CASE_STAGE_KEY = 'kabul:case-stage:nordhavn';
// stage: 'review-public' | 'declined' | 'material-selection' | 'awaiting-customer' | 'ready'

function loadCaseStage() {
  try {
    // If the advisor just clicked "anmod fra kunde" in Finansielt, respect the
    // stage transition that was just written to localStorage.
    if (sessionStorage.getItem('kabul:focus-material') === '1') {
      return localStorage.getItem(CASE_STAGE_KEY) || 'review-public';
    }
    // Otherwise always start the demo at the initial state.
    localStorage.removeItem(CASE_STAGE_KEY);
    return 'review-public';
  } catch (e) { return 'review-public'; }
}

function WSOverview({ go, caseId }) {
  const [stage, setStageRaw] = React.useState(loadCaseStage);
  const setStage = (s) => {
    setStageRaw(s);
    try { localStorage.setItem(CASE_STAGE_KEY, s); } catch (e) {}
  };
  const materialRef = React.useRef(null);

  // When arriving from "anmod fra kunde", scroll to the material selector
  React.useEffect(() => {
    if (stage !== 'material-selection') return;
    let shouldFocus = false;
    try { shouldFocus = sessionStorage.getItem('kabul:focus-material') === '1'; } catch (e) {}
    if (!shouldFocus) return;
    try { sessionStorage.removeItem('kabul:focus-material'); } catch (e) {}
    // Wait for layout, then scroll
    const t = setTimeout(() => {
      if (materialRef.current) {
        materialRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div className="page page-wide" style={{ maxWidth: 1080, padding: '24px 32px 80px' }}>
      {/* Company master data - Stamoplysninger */}
      <StamoplysningerCard/>

      {/* Stage-aware hero with 5-step stepper */}
      <StageHero stage={stage} setStage={setStage} go={go} caseId={caseId}/>

      {/* Declined */}
      {stage === 'declined' && (
        <>
          <SectionLead kind="done" eyebrow={t("Status")} title={t("Sagen er markeret til afslag")}
            sub={t("Sagen er stoppet her. Skriv eller redigér din afslagsnote nedenfor.")}/>
          <DeclinedBlock onReopen={() => setStage('review-public')}/>
        </>
      )}

      {/* State C: Material selection */}
      {stage === 'material-selection' && (
        <div ref={materialRef} style={{ scrollMarginTop: 16 }}>
          <SectionLead
            kind="todo"
            eyebrow={t("Næste skridt")}
            title={t("Vælg yderligere materiale")}
            sub={t("Vælg det materiale og de adgange, kunden skal levere for at fortsætte sagen.")}
          />
          <MaterialSelector
            onCreateRequest={() => setStage('awaiting-customer')}
            onBack={() => setStage('review-public')}
          />
        </div>
      )}

      {/* State D/E: Awaiting customer or partially received */}
      {(stage === 'awaiting-customer' || stage === 'ready') && (
        <>
          <SectionLead
            kind="todo"
            eyebrow={stage === 'ready' ? t('Klar') : t('Til dig nu')}
            title={stage === 'ready' ? t('Klar til indstilling') : t('Udestående fra kunden')}
            sub={stage === 'ready'
              ? t('Alle påkrævede punkter er modtaget. Du kan færdiggøre indstillingen.')
              : t('Materiale og afklaringer, som kunden mangler at sende.')}
          />
          <CustomerStatusBlock stage={stage} go={go} onMarkReady={() => setStage('ready')}/>
        </>
      )}

      {/* State: Jumped directly to ready (skip customer input) */}
      {stage === 'ready-skip' && (
        <SectionLead
          kind="todo"
          eyebrow={t("Klar")}
          title={t("Klar til indstilling")}
          sub={t("Du har valgt at indstille direkte. Du kan fortsætte til memo og indstillingsbrev.")}
        />
      )}

      {/* Always: Reference of what's in place */}
      {stage !== 'declined' && (
        <div style={{ marginTop: 24 }}>
          <CollectedDataSection go={go}/>
        </div>
      )}
    </div>
  );
}

function StageHero({ stage, setStage, go, caseId }) {
  // Map stage → step states (5 steps)
  const stepState = (k) => {
    if (stage === 'declined') {
      if (k === 'public') return 'done';
      if (k === 'decision') return 'done';
      return 'pending';
    }
    if (stage === 'review-public') {
      if (k === 'public') return 'done';
      if (k === 'decision') return 'active';
      return 'pending';
    }
    if (stage === 'material-selection') {
      if (k === 'public' || k === 'decision') return 'done';
      if (k === 'material') return 'active';
      return 'pending';
    }
    if (stage === 'awaiting-customer') {
      if (k === 'public' || k === 'decision' || k === 'material') return 'done';
      if (k === 'customer') return 'active';
      return 'pending';
    }
    if (stage === 'ready') {
      if (k === 'public' || k === 'decision' || k === 'material' || k === 'customer') return 'done';
      if (k === 'memo') return 'active';
      return 'pending';
    }
    if (stage === 'ready-skip') {
      if (k === 'public' || k === 'decision' || k === 'material') return 'done';
      if (k === 'customer') return 'skipped';
      if (k === 'memo') return 'active';
      return 'pending';
    }
    return 'pending';
  };

  const PROCESS = [
    { k: "public",   label: t("Offentligt data"),       sub: t("Indsamlet automatisk") },
    { k: "decision", label: t("Vurdering af offentligt data"), sub: t("Godkend eller afslå sagen") },
    { k: "material", label: t("Materialevalg"),        sub: stage === 'ready-skip' ? t("Markeret færdig") : t("Vælg hvad kunden skal sende") },
    { k: "customer", label: t("Kundeinput"),           sub: (() => {
        if (stage === 'ready-skip') return t("Sprunget over");
        if (stage === 'awaiting-customer') {
          try {
            const raw = localStorage.getItem(MATERIAL_SELECTION_KEY);
            const s = raw ? { ...DEFAULT_MATERIAL_SELECTION, ...JSON.parse(raw) } : { ...DEFAULT_MATERIAL_SELECTION };
            const pending = MATERIAL_GROUPS.reduce((acc, g) => acc + g.items.filter(it => s[it.id]).length, 0);
            return pending + ' ' + t('punkter afventer');
          } catch (e) { return t("Afventer kundens materiale"); }
        }
        return t("Afventer kundens materiale");
      })() },
    { k: "memo",     label: t("Klar til indstilling"), sub: t("Kreditmemo til komité") },
  ].map(s => ({ ...s, status: stepState(s.k) }));

  // Stage-aware narrative + actions
  let eyebrow, title, body, actions, publicFacts = null, progressBar = null;
  if (stage === 'declined') {
    eyebrow = t("Status");
    title = t("Sagen er stoppet");
    body = t("Du har valgt at give afslag på det offentlige grundlag. Du kan genoptage sagen, hvis du har skiftet vurdering.");
    actions = (
      <button className="btn" onClick={() => setStage('review-public')}>{t('Genoptag sag')}</button>
    );
  } else if (stage === 'review-public') {
    eyebrow = t("Sagens fremgang");
    title = t("Offentligt data indsamlet");
    body = t("Vi har hentet tilgængelige offentlige data, så du kan vurdere om sagen skal fortsætte.");
    actions = (
      <>
        <button className="btn btn-primary" onClick={() => setStage('material-selection')}>
          {t('Indhent mere materiale')} <I.ArrowRight className="ic"/>
        </button>
        <button className="btn" onClick={() => go && go("workspace:" + caseId + ":financials")}>
          <I.BarChart className="ic"/> {t('Se materiale')}
        </button>
        <button className="btn btn-danger" style={{ color: 'var(--c-success)', borderColor: 'var(--c-success)' }} onClick={() => setStage('ready-skip')}>{t('Indstil kunde')}</button>
        <button className="btn btn-danger" onClick={() => setStage('declined')}>{t('Giv afslag')}</button>
      </>
    );
  } else if (stage === 'ready-skip') {
    eyebrow = t("Klar");
    title = t("Klar til indstilling");
    body = t("Du har valgt at gå direkte til indstilling. Materialevalg er markeret færdig og Kundeinput er sprunget over.");
    actions = (
      <>
        <button className="btn btn-primary" onClick={() => go && go("workspace:" + caseId + ":memo")}>
          {t('Fortsæt til memo')} <I.ArrowRight className="ic"/>
        </button>
        <button className="btn" onClick={() => setStage('review-public')}>{t('Tilbage')}</button>
      </>
    );
  } else if (stage === 'material-selection') {
    eyebrow = t("Sagens fremgang");
    title = t("Vælg hvad kunden skal sende");
    body = t("Marker det materiale og de adgange, kunden skal levere, og opret en samlet kundeanmodning.");
    actions = (
      <button className="btn" onClick={() => setStage('review-public')}>{t('Tilbage til beslutning')}</button>
    );
  } else if (stage === 'awaiting-customer') {
    eyebrow = t("Sagens fremgang");
    title = t("Anmodning sendt - afventer kunden");
    body = t("Kunden har modtaget anmodningen. Status opdateres efterhånden som materiale uploades eller systemer kobles til.");
    (() => {
      try {
        const raw = localStorage.getItem(MATERIAL_SELECTION_KEY);
        const s = raw ? { ...DEFAULT_MATERIAL_SELECTION, ...JSON.parse(raw) } : { ...DEFAULT_MATERIAL_SELECTION };
        const total = MATERIAL_GROUPS.reduce((acc, g) => acc + g.items.filter(it => s[it.id]).length, 0);
        const received = 0; // i awaiting-customer er intet modtaget endnu
        const pct = total > 0 ? Math.round((received / total) * 100) : 0;
        progressBar = { received, total, pct };
      } catch (e) {}
    })();
    actions = (
      <>
        <button className="btn btn-primary" onClick={() => setStage('ready')}>{t('Markér som modtaget')}</button>
        <button className="btn" onClick={() => setStage('material-selection')}>{t('Justér anmodning')}</button>
      </>
    );
  } else { // ready
    eyebrow = t("Klar");
    title = t("Datagrundlag komplet");
    body = t("Alle påkrævede punkter er modtaget. Du kan fortsætte til kreditmemo.");
    actions = (
      <>
        <button className="btn btn-primary" onClick={() => go && go("workspace:" + caseId + ":memo")}>
          {t('Fortsæt til memo')} <I.ArrowRight className="ic"/>
        </button>
        <button className="btn" onClick={() => setStage('awaiting-customer')}>{t('Tilbage')}</button>
      </>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '22px 26px 20px', display: 'flex', alignItems: 'flex-start', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: stage === 'declined' ? 'var(--c-danger)' : 'var(--c-primary)',
            background: stage === 'declined' ? 'var(--c-danger-bg)' : 'var(--c-primary-bg)',
            border: '1px solid ' + (stage === 'declined' ? '#f4cfca' : 'var(--c-primary-border)'),
            padding: '2px 8px', borderRadius: 999, marginBottom: 8,
          }}>
            {eyebrow}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em' }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.55, maxWidth: 640 }}>{body}</div>
          {publicFacts && (
            <ul style={{ listStyle: 'none', margin: '10px 0 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {publicFacts.map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: 'var(--c-text)' }}>
                  <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-primary)', flexShrink: 0, marginTop: 6 }}/>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          {progressBar && (
            <div style={{ marginTop: 12, maxWidth: 360 }}>
              <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginBottom: 5, fontWeight: 500 }}>
                {progressBar.received} {t('af')} {progressBar.total} {t('punkter modtaget')}
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--c-line-strong)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  background: 'var(--c-success)',
                  width: progressBar.pct + '%',
                  minWidth: progressBar.pct > 0 ? 6 : 0,
                  transition: 'width 300ms ease',
                }}/>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {actions}
          </div>
        </div>
      </div>

      {/* Five-step process stepper */}
      <div style={{ background: 'var(--c-surface-2)', borderTop: '1px solid var(--c-line)' }}>
        <div style={{ display: 'flex', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 30, left: '10%', right: '10%', height: 1, background: 'var(--c-line-strong)' }}/>
          {PROCESS.map((s, i) => {
            const isDone = s.status === 'done';
            const isActive = s.status === 'active';
            const isSkipped = s.status === 'skipped';
            const stageColor = isDone ? 'var(--c-success)' : 'var(--c-primary)';
            const ring = isDone ? 'var(--c-success)' : isActive ? 'var(--c-primary)' : isSkipped ? 'var(--c-line-strong)' : 'var(--c-line-strong)';
            return (
              <div key={s.k} style={{ flex: 1, padding: '14px 14px 18px', textAlign: 'center', position: 'relative', opacity: isSkipped ? 0.55 : 1 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: isDone ? 'var(--c-success)' : '#fff',
                  border: isSkipped ? '2px dashed var(--c-line-strong)' : '2px solid ' + ring,
                  margin: '0 auto', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 1,
                }}>
                  {isDone
                    ? <I.Check size={12} style={{ color: '#fff' }}/>
                    : isSkipped
                      ? <span style={{ display: 'block', width: 8, height: 2, borderRadius: 1, background: 'var(--c-text-3)' }}/>
                      : isActive
                        ? <span style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: stageColor }}/>
                        : null}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 8, color: isSkipped ? 'var(--c-text-3)' : 'var(--c-ink)' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 3, lineHeight: 1.4, maxWidth: 240, marginLeft: 'auto', marginRight: 'auto', fontStyle: isSkipped ? 'italic' : 'normal' }}>{s.sub}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActionRow({ a, go }) {
  const sevColor = a.sev === 'high' ? 'var(--c-warn)' : a.sev === 'med' ? 'var(--c-primary)' : 'var(--c-text-3)';
  const [done, setDone] = React.useState(false);
  return (
    <div style={{
      padding: '12px 14px',
      border: '1px solid var(--c-line)',
      borderRadius: 8,
      background: done ? 'var(--c-success-bg)' : '#fff',
      display: 'flex', alignItems: 'center', gap: 14,
      transition: 'background 200ms',
    }}>
      <button onClick={() => setDone(!done)}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          border: done ? 'none' : '1.5px solid var(--c-line-strong)',
          background: done ? 'var(--c-success)' : '#fff',
          padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
        {done && <I.Check size={11} style={{ color: '#fff' }}/>}
      </button>
      <div style={{ width: 4, alignSelf: 'stretch', background: sevColor, borderRadius: 2, flexShrink: 0 }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: done ? 'var(--c-text-3)' : 'var(--c-ink)', textDecoration: done ? 'line-through' : 'none' }}>{a.t}</div>
        <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>{a.w}</div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', textAlign: 'right', flexShrink: 0 }}>
        <div style={{ color: 'var(--c-text-2)', fontWeight: 500 }}>{a.impact}</div>
      </div>
      <button className="btn btn-sm btn-primary" onClick={() => go(a.to)} style={{ flexShrink: 0 }}>{a.action}</button>
    </div>
  );
}

function ExpandSection({ icon, title, summary, badge, action, children, defaultOpen, tone }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  const isSuccess = tone === 'success';
  return (
    <div className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}>
        {isSuccess ? (
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--c-success)',
            display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0,
          }}>
            <I.Check size={16}/>
          </div>
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
            display: 'grid', placeItems: 'center', color: 'var(--c-text-2)', flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{title}</span>
            {badge}
          </div>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)' }}>{summary}</div>
        </div>
        <div onClick={e => e.stopPropagation()}>{action}</div>
        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
          <I.ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }}/>
        </button>
      </div>
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--c-line-2)' }}>
          <div style={{ paddingTop: 14 }}>{children}</div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub, tone }) {
  const colors = {
    ink: 'var(--c-ink)',
    warn: 'var(--c-warn)',
    line: 'var(--c-text-2)',
    muted: 'var(--c-text-4)',
  };
  return (
    <div style={{ padding: '10px 14px', background: '#fff' }}>
      <div className="label-mini">{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 5, color: colors[tone] || 'var(--c-ink)', letterSpacing: '-0.01em' }} className="mono num">{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// Tiny sparkline (SVG)
function Sparkline({ data, labels, label, highlight }) {
  const w = 360, h = 80;
  const pad = 6;
  const max = Math.max(...data) * 1.1;
  const min = Math.min(...data) * 0.9;
  const x = (i) => pad + (i * (w - pad*2)) / (data.length - 1);
  const y = (v) => h - pad - ((v - min) / (max - min)) * (h - pad*2);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `M ${x(0)},${h-pad} L ${pts.split(' ').join(' L ')} L ${x(data.length-1)},${h-pad} Z`;
  return (
    <div>
      <div className="label-mini" style={{ marginBottom: 6 }}>{label}</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d={area} fill="var(--c-ink)" opacity="0.05"/>
        <polyline points={pts} fill="none" stroke="var(--c-ink)" strokeWidth="1.5"/>
        {data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="var(--c-ink)"/>)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text-3)', marginTop: 4 }}>
        {labels.map(l => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
}

// Budget vs actual chart (horizontal-bar style)
function BudgetChart({ data }) {
  const w = 560, h = 220;
  const pad = { l: 30, r: 12, t: 18, b: 30 };
  const max = Math.max(...data.map(d => Math.max(d.budget, d.actual || 0))) * 1.15;
  const cw = (w - pad.l - pad.r) / data.length;
  const x = (i) => pad.l + i * cw + cw * 0.18;
  const bw = cw * 0.32;
  const y = (v) => h - pad.b - (v / max) * (h - pad.t - pad.b);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {/* Y gridlines */}
      {[0, max * 0.5, max].map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w-pad.r} y1={y(v)} y2={y(v)} stroke="var(--c-line)" strokeWidth="1"/>
          <text x={pad.l - 5} y={y(v) + 3} fill="var(--c-text-3)" fontSize="9" textAnchor="end" fontFamily="var(--mono)">{v.toFixed(0)}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <g key={i}>
          {/* Budget bar */}
          <rect x={x(i)} y={y(d.budget)} width={bw} height={h - pad.b - y(d.budget)} fill={d.flag ? 'var(--c-warn-bg)' : '#e8e9ec'} stroke={d.flag ? 'var(--c-warn)' : 'transparent'} strokeWidth="1"/>
          {/* Actual bar */}
          {d.actual && <rect x={x(i) + bw + 2} y={y(d.actual)} width={bw} height={h - pad.b - y(d.actual)} fill="var(--c-ink)"/>}
          {d.flag && <circle cx={x(i) + bw/2} cy={y(d.budget) - 8} r="3" fill="var(--c-warn)"/>}
          <text x={x(i) + bw} y={h - pad.b + 14} fill="var(--c-text-3)" fontSize="10" textAnchor="middle">{d.month}</text>
        </g>
      ))}
      {/* Legend */}
      <g transform={`translate(${w - 170}, ${pad.t - 6})`}>
        <rect x="0" y="0" width="10" height="10" fill="#e8e9ec"/>
        <text x="14" y="9" fill="var(--c-text-2)" fontSize="10">{t('Budget')}</text>
        <rect x="60" y="0" width="10" height="10" fill="var(--c-ink)"/>
        <text x="74" y="9" fill="var(--c-text-2)" fontSize="10">{t('Realiseret')}</text>
        <circle cx="138" cy="5" r="3" fill="var(--c-warn)"/>
        <text x="146" y="9" fill="var(--c-text-2)" fontSize="10">{t('Markering')}</text>
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Stamoplysninger - company master-data card on the Overblik tab.
   Public-source data (CVR), grouped grid, copy actions, collapsible.
   ──────────────────────────────────────────────────────────────────────── */
function StamoplysningerCard() {
  const co = DATA.COMPANY;
  const [expanded, setExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(null);

  const copy = (key, text) => {
    if (!text) return;
    try { navigator.clipboard && navigator.clipboard.writeText(String(text)); } catch (e) {}
    setCopied(key);
    setTimeout(() => setCopied(c => (c === key ? null : c)), 1400);
  };

  const NA = <span style={{ color: 'var(--c-text-3)', fontStyle: 'italic', fontWeight: 400 }}>{t('Ikke oplyst')}</span>;
  const present = (val) => val != null && val !== "" && val !== "-";
  const v = (val) => (present(val) ? val : NA);

  const cvrPlain = present(co.cvr) ? String(co.cvr).replace(/\s+/g, '') : '';
  const fullAddress = [co.address, co.postal, co.country].filter(present).join(', ');
  const legalShort = co.legalForm ? co.legalForm.replace(/.*\(([^)]+)\).*/, '$1') : null; // "ApS"

  const InlineCopy = ({ k, text, label }) => (
    <button
      type="button"
      aria-label={label}
      title={copied === k ? t("Kopieret") : label}
      onClick={() => copy(k, text)}
      style={{
        marginLeft: 4,
        width: 16, height: 16, padding: 0,
        border: 0, background: 'transparent',
        color: copied === k ? 'var(--c-primary)' : 'var(--c-text-3)',
        cursor: 'pointer', display: 'inline-grid', placeItems: 'center',
        verticalAlign: 'middle', borderRadius: 3,
      }}
    >
      {copied === k ? <I.Check size={11}/> : <I.Copy size={11}/>}
    </button>
  );

  const Sep = () => (
    <span aria-hidden="true" style={{ color: 'var(--c-text-4)', margin: '0 8px' }}>·</span>
  );

  // Full grid for expanded view
  const fields = [
    { label: t("Virksomhedsnavn"), value: v(co.name) },
    { label: t("CVR-nr."), value: v(co.cvr), mono: true },
    { label: t("Juridisk form"), value: v(co.legalForm) },
    { label: t("Branche"), value: v(co.industry) },
    { label: t("Stiftelsesdato"), value: v(co.founded) },
    { label: t("Antal ansatte"), value: present(co.employees) ? `${co.employees}` : NA },
    { label: t("Adresse"), value: v(co.address) },
    { label: t("Postnummer/by"), value: v(co.postal) },
    { label: t("Land"), value: v(co.country) },
  ];

  return (
    <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
      {/* Compact header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px',
        borderBottom: '1px solid var(--c-line-2)',
        minHeight: 36,
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Stamoplysninger')}</div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10.5, padding: '1px 7px', borderRadius: 999,
          background: 'var(--c-primary-bg)', color: 'var(--c-primary)',
          fontWeight: 500, whiteSpace: 'nowrap',
        }}>
          <I.Database size={9}/> {t(co.masterDataSource || 'CVR-registret')}
        </span>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11, color: 'var(--c-text-3)', whiteSpace: 'nowrap' }}>
          {t('Opdateret')} {co.masterDataUpdated || '-'}
        </span>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? t('Skjul flere oplysninger') : t('Vis flere oplysninger')}
          onClick={() => setExpanded(e => !e)}
          style={{
            width: 22, height: 22, padding: 0,
            border: 0, background: 'transparent', cursor: 'pointer',
            color: 'var(--c-text-3)', display: 'grid', placeItems: 'center',
          }}
        >
          <I.ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}/>
        </button>
      </div>

      {/* Compact two-line summary */}
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 13.5, color: 'var(--c-ink)', lineHeight: 1.4 }}>
          <b style={{ fontWeight: 600 }}>{v(co.name)}</b>
          <Sep/>
          <span className="mono">CVR {present(co.cvr) ? cvrPlain : NA}</span>
          {present(co.cvr) && <InlineCopy k="cvr" text={cvrPlain} label={t("Kopiér CVR-nummer")}/>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.5 }}>
          <span>{v(co.industry)}</span>
          <Sep/>
          <span>{present(co.employees) ? co.employees + ' ' + t('ansatte') : NA}</span>
          <Sep/>
          <span>{t('Stiftet')} {v(co.founded)}</span>
          <Sep/>
          <span>{[co.address, co.postal].filter(present).join(', ') || NA}</span>
          {present(co.address) && <InlineCopy k="addr" text={fullAddress} label={t("Kopiér adresse")}/>}
        </div>
      </div>

      {/* Expanded grid */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--c-line-2)',
          display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        }}>
          {fields.map((f, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            return (
              <div key={i} style={{
                padding: '8px 14px',
                borderTop: row > 0 ? '1px solid var(--c-line-2)' : 'none',
                borderLeft: col > 0 ? '1px solid var(--c-line-2)' : 'none',
                minWidth: 0,
              }}>
                <div style={{ fontSize: 10.5, color: 'var(--c-text-3)' }}>{f.label}</div>
                <div
                  className={f.mono ? "mono" : ""}
                  style={{
                    fontSize: 12.5, fontWeight: 500, color: 'var(--c-ink)', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {f.value}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compact footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '6px 14px',
        borderTop: '1px solid var(--c-line-2)',
        background: 'var(--c-surface-2)',
        fontSize: 11, color: 'var(--c-text-3)',
      }}>
        <span>{t('Data hentes automatisk fra')} {t(co.masterDataSource || 'CVR-registret')}</span>
        {co.cvrUrl && (
          <a
            href={co.cvrUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--c-primary)', textDecoration: 'none', fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            {t('Åbn i CVR')} <I.Link size={10}/>
          </a>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Collected data section - grouped evidence summary
   Group 1: Automatisk indsamlet (system-gathered sources)
   Group 2: Modtaget fra kunden (customer-uploaded material; 1 source, N docs)
   ──────────────────────────────────────────────────────────────────────── */
const AUTO_SOURCES = [
  { src: "CVR-registret", what: "Selskab, vedtægter, bestyrelse, årsrapporter (offentlige)", last: "23. maj" },
  { src: "Branche­opslag", what: "Markedsdata", last: "23. maj" },
  { src: "Soft signals", what: "Trustpilot, hjemmeside, presse, virksomhedsbeskrivelser", last: "i dag" },
];

function GroupHeader({ label, helper, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 4, marginBottom: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-text-2)' }}>
          {label} {count != null && <span style={{ color: 'var(--c-text-3)', fontWeight: 500 }}>· {count}</span>}
        </div>
        {helper && <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 3, lineHeight: 1.4 }}>{helper}</div>}
      </div>
    </div>
  );
}

function DoneCheck({ label = t("Indsamlet") }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        width: 16, height: 16, borderRadius: '50%',
        background: 'var(--c-success)', color: '#fff',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
      <I.Check size={10}/>
    </span>
  );
}

function AutoSourceCard({ src, what, last }) {
  return (
    <div style={{
      padding: '11px 14px',
      border: '1px solid var(--c-line)',
      borderRadius: 8,
      background: 'var(--c-surface)',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: 'var(--c-primary-bg)',
        border: '1px solid var(--c-primary-border)',
        display: 'grid', placeItems: 'center',
        color: 'var(--c-primary)',
        flexShrink: 0,
      }}>
        <I.Database size={13}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-ink)' }}>{t(src)}</div>
          <span aria-label={t("Automatisk indsamlet")} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 500, color: 'var(--c-primary)',
            background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-border)',
            padding: '0 6px', borderRadius: 999, lineHeight: 1.6,
          }}>
            <I.Spark size={9}/> Auto
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.4 }}>{t(what)}</div>
        <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', marginTop: 5 }}>{t('Indsamlet automatisk')} · {t(last)}</div>
      </div>
      <DoneCheck label={t("Indsamlet")}/>
    </div>
  );
}

function CustomerTypeCard({ type, what, count, last }) {
  return (
    <div style={{
      padding: '11px 14px',
      border: '1px solid var(--c-line)',
      borderRadius: 8,
      background: 'var(--c-surface)',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: 'var(--c-surface-2)',
        border: '1px solid var(--c-line)',
        display: 'grid', placeItems: 'center',
        color: 'var(--c-text-2)',
        flexShrink: 0,
      }}>
        <I.Upload size={13}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-ink)' }}>
            {t(type)}{count > 1 ? ` (${count})` : ''}
          </div>
          <span aria-label={t("Modtaget fra kunden")} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 10, fontWeight: 500, color: 'var(--c-text-2)',
            background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
            padding: '0 6px', borderRadius: 999, lineHeight: 1.6,
          }}>
            <I.Upload size={9}/> {t('Kunde')}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.4 }}>{t(what)}</div>
        <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', marginTop: 5 }}>{t('Modtaget')} · {t(last)}</div>
      </div>
      <DoneCheck label={t("Modtaget")}/>
    </div>
  );
}

function CollectedDataSection({ go }) {
  const autoCount = AUTO_SOURCES.length;
  return (
    <ExpandSection
      icon={<I.Check size={15}/>}
      title={t("Offentlige data klar")}
      tone="success"
      summary={
        <div style={{ fontSize: 12, color: 'var(--c-text-3)' }}>
          <b style={{ color: 'var(--c-text-2)', fontWeight: 500 }}>{autoCount} {t('offentlige kilder indsamlet automatisk')}</b>
        </div>
      }
      defaultOpen
      action={null}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {AUTO_SOURCES.map((s, i) => <AutoSourceCard key={`a-${i}`} {...s}/>)}
      </div>
    </ExpandSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SectionLead - page-level heading that separates "outstanding" from "done"
   ──────────────────────────────────────────────────────────────────────── */
function SectionLead({ kind, eyebrow, title, sub }) {
  const isDone = kind === 'done';
  return (
    <div style={{
      marginTop: isDone ? 36 : 24,
      marginBottom: 12,
      paddingTop: isDone ? 20 : 0,
      borderTop: isDone ? '1px solid var(--c-line)' : 'none',
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: isDone ? 'var(--c-text-3)' : 'var(--c-primary)',
        background: isDone ? 'transparent' : 'var(--c-primary-bg)',
        border: isDone ? 'none' : '1px solid var(--c-primary-border)',
        padding: isDone ? 0 : '2px 8px', borderRadius: 999,
        marginBottom: 8,
      }}>
        {isDone ? <I.Check size={11}/> : <I.Flag size={11}/>}
        {eyebrow}
      </div>
      <div style={{
        fontSize: isDone ? 16 : 20,
        fontWeight: 600,
        color: isDone ? 'var(--c-text-2)' : 'var(--c-ink)',
        letterSpacing: '-0.015em',
        lineHeight: 1.2,
      }}>
        {title}
      </div>
      {sub && (
        <div style={{
          fontSize: isDone ? 12 : 13.5,
          color: isDone ? 'var(--c-text-3)' : 'var(--c-text-2)',
          marginTop: 4, lineHeight: 1.5, maxWidth: 720,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Til at nå i mål - prioriteret handlingsplan
   En samlet kunde-anmodning + interne beslutninger
   ──────────────────────────────────────────────────────────────────────── */
const BUNDLE_DOCS = [
  { id: 'd0', t: "Periodetal", w: "Q1 2026 fra e-conomic eller upload - vigtig for aktuel drift", optional: false },
  { id: 'd1', t: "Interne årsrapporter", w: "2023, 2024, 2025 (intern version med noter)", optional: false },
  { id: 'd2', t: "Budget 2026", w: "Budget for 2026 med antagelser", optional: false },
  { id: 'd3', t: "Ejerbog", w: "Aktuel ejerstruktur og anpartshaverfortegnelse", optional: false },
  { id: 'd4', t: "Låneaftaler", w: "Eksisterende eksterne lån (Nordea, Erhvervsfonden m.fl.)", optional: false },
  { id: 'd5', t: "Anpartshaverlån - vilkår", w: "Note 14 · 0,5M - vilkår og tilbagebetaling", optional: false },
  { id: 'd6', t: "Forsikringspolicer", w: "Erhvervs- og produktansvar", optional: false },
  { id: 'd7', t: "Sikkerhedsdokumenter", w: "Pantebrev, tinglysning", optional: false },
  { id: 'd8', t: "Tilbagetrædelses­erklæring", w: "Knyttet til anpartshaverlån - note 14", optional: false },
  { id: 'd9', t: "Ejeraftale", w: "Hvis relevant - kan udelades", optional: true },
];

const BUNDLE_QUESTIONS = [
  { id: 'q1', t: "4 afklaringer til kunden", w: "Budgetafvigelse i juli, tilbagetrædelse, kaution, ejerstruktur", optional: false },
  { id: 'q2', t: "Specificér kautionsobjekter", w: "Pantebrev §4 refererer til 'sædvanlige sikkerheder'", optional: false },
];

const INTERNAL_TASKS = [
  { id: 'i1', t: "Vurder om ejeraftale er nødvendig", w: "Beslut før kunden kontaktes, da det påvirker anmodningen.", to: "workspace:1:ownership", action: "Vurder" },
  { id: 'i2', t: "Færdiggør memo efter kundens svar", w: "Executive summary, anbefaling og markedsanalyse.", to: "workspace:1:memo", action: "Åbn memo" },
];

const CHECKLIST = [
  { id: 'c0', label: 'Periodetal (Q1 2026)' },
  { id: 'c1', label: 'Interne årsrapporter 2023-2025' },
  { id: 'c2', label: 'Budget 2026' },
  { id: 'c3', label: 'Ejerbog' },
  { id: 'c4', label: 'Låneaftaler' },
  { id: 'c5', label: 'Anpartshaverlån - vilkår' },
  { id: 'c6', label: 'Forsikringspolicer' },
  { id: 'c7', label: 'Sikkerhedsdokumenter' },
  { id: 'c8', label: 'Tilbagetrædelses­erklæring' },
  { id: 'c9', label: '4 afklaringer mangler' },
  { id: 'c10', label: 'Kautionsobjekter skal præciseres' },
  { id: 'c11', label: 'Ejeraftale', optional: true },
];

function MissingSection({ go }) {
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  return (
    <>
      <div className="card" style={{ padding: '4px 22px' }}>
        {/* Group 1 - Kontakt kunden */}
        <div style={{ padding: '20px 0', display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 24, height: 24, borderRadius: 6,
                background: 'var(--c-primary-bg)', color: 'var(--c-primary)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <I.Mail size={13}/>
              </span>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.005em' }}>
                {t('Kontakt kunden')}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 5, lineHeight: 1.5 }}>
              {t('Vi har samlet de manglende dokumenter og afklaringer i én anmodning.')}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginTop: 6 }}>
              {t('9 dokumenter · 2 afklaringer · 1 valgfrit punkt')}
            </div>

            {detailsOpen && (
              <ul style={{
                listStyle: 'none', margin: '14px 0 0 0', padding: 0,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {CHECKLIST.map(it => (
                  <li key={it.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 13, color: 'var(--c-text)' }}>
                    <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-text-4)', flexShrink: 0, transform: 'translateY(-2px)' }}/>
                    <span>{t(it.label)}</span>
                    {it.optional && <span style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>{t('Valgfri')}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0, width: 200 }}>
            <button
              className="btn btn-primary"
              onClick={() => setComposerOpen(true)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {t('Forbered anmodning')}
            </button>
            <button
              type="button"
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen(o => !o)}
              style={{
                background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                fontSize: 12.5, color: 'var(--c-primary)', fontWeight: 500,
              }}
            >
              {detailsOpen ? t('Skjul detaljer') : t('Se detaljer')}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--c-line-2)' }}/>

        {/* Group 2 - Tag stilling */}
        <div style={{ padding: '20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'var(--c-surface-2)', color: 'var(--c-text-2)',
              border: '1px solid var(--c-line)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <I.User size={13}/>
            </span>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.005em' }}>
              {t('Tag stilling')}
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 5, lineHeight: 1.5 }}>
            {t('Punkter der kræver din vurdering, før sagen kan færdiggøres.')}
          </div>

          <ol style={{
            listStyle: 'none', margin: '14px 0 0 0', padding: 0,
          }}>
            {INTERNAL_TASKS.map((task, i) => (
              <li
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '14px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--c-line-2)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--c-surface-2)',
                    border: '1px solid var(--c-line)',
                    color: 'var(--c-text-2)',
                    fontSize: 11.5, fontWeight: 600,
                    display: 'grid', placeItems: 'center',
                    flexShrink: 0, marginTop: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)' }}>{t(task.t)}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 3, lineHeight: 1.5 }}>{t(task.w)}</div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => go(task.to)}
                  style={{ width: 180, justifyContent: 'center', flexShrink: 0 }}
                >
                  {t(task.action)}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {composerOpen && (
        <CustomerRequestComposer
          docs={BUNDLE_DOCS}
          questions={BUNDLE_QUESTIONS}
          onClose={() => setComposerOpen(false)}
        />
      )}
    </>
  );
}

function CustomerRequestComposer({ docs, questions, onClose }) {
  const initSel = React.useMemo(() => {
    const m = {};
    [...docs, ...questions].forEach(it => { m[it.id] = !it.optional; });
    return m;
  }, [docs, questions]);
  const [sel, setSel] = React.useState(initSel);
  const toggle = (id) => setSel(s => ({ ...s, [id]: !s[id] }));
  const removeSelected = () => setSel(s => {
    const next = { ...s };
    Object.keys(next).forEach(k => { if (next[k]) next[k] = false; });
    return next;
  });
  const selectedCount = Object.values(sel).filter(Boolean).length;

  // Lock body scroll while open
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const ItemRow = ({ it }) => (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', border: '1px solid var(--c-line)',
      borderRadius: 7, background: sel[it.id] ? '#fff' : 'var(--c-surface-2)',
      cursor: 'pointer', opacity: sel[it.id] ? 1 : 0.6,
    }}>
      <input
        type="checkbox"
        checked={!!sel[it.id]}
        onChange={() => toggle(it.id)}
        style={{ marginTop: 3, accentColor: 'var(--c-primary)' }}
        aria-label={t(it.t)}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-ink)' }}>{t(it.t)}</span>
          {it.optional && <span style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>{t('Valgfri')}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2, lineHeight: 1.4 }}>{t(it.w)}</div>
      </div>
    </label>
  );

  const optionalItems = [...docs, ...questions].filter(i => i.optional);
  const requiredDocs = docs.filter(d => !d.optional);
  const requiredQs = questions.filter(q => !q.optional);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)',
        display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 100%)', maxHeight: 'calc(100vh - 40px)',
          background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-line-2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-border)',
            display: 'grid', placeItems: 'center', color: 'var(--c-primary)', flexShrink: 0,
          }}>
            <I.Mail size={15}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="composer-title" style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Samlet anmodning til kunden')}</div>
            <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>
              {selectedCount} {t('af')} {Object.keys(sel).length} {t('punkter inkluderet - du kan fjerne valgfrie punkter inden afsendelse.')}
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label={t('Luk')}><I.X size={14}/></button>
        </div>

        <div style={{ padding: '16px 20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>{t('Dokumenter vi mangler')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {requiredDocs.map(it => <ItemRow key={it.id} it={it}/>)}
            </div>
          </section>

          <section>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>{t('Afklaringer vi mangler')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {requiredQs.map(it => <ItemRow key={it.id} it={it}/>)}
            </div>
          </section>

          {optionalItems.length > 0 && (
            <section>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>{t('Valgfrit materiale')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {optionalItems.map(it => <ItemRow key={it.id} it={it}/>)}
              </div>
            </section>
          )}

          <section>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 6 }}>{t('Besked til kunden (forhåndsudfyldt)')}</div>
            <textarea
              defaultValue={`Hej,\n\nFor at færdiggøre kreditvurderingen mangler vi følgende. Du kan uploade/svare via linket nedenfor.\n\nVenlig hilsen\nMette L. · EIFO`}
              rows={5}
              style={{
                width: '100%', resize: 'vertical',
                padding: '10px 12px', fontSize: 13, color: 'var(--c-ink)',
                border: '1px solid var(--c-line)', borderRadius: 7,
                background: '#fff', fontFamily: 'inherit', lineHeight: 1.5,
              }}
            />
          </section>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--c-line-2)', background: 'var(--c-surface-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-sm btn-ghost" onClick={removeSelected}>{t('Fjern valgte punkter')}</button>
          <div style={{ flex: 1 }}/>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>{t('Gem som kladde')}</button>
          <button className="btn btn-sm btn-primary" onClick={onClose} disabled={selectedCount === 0}>
            <I.Mail size={12}/> {t('Send anmodning')} ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Stage-aware blocks for the new overview workflow
   ──────────────────────────────────────────────────────────────────────── */

function DecisionBlock({ go }) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>
        {t('Vigtigste observationer fra det offentlige grundlag')}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          "Omsætningen er vokset stabilt fra 2023 til 2025.",
          "Egenkapital og soliditet er styrket - kapitalstrukturen ser sund ud.",
          "Anpartshaverlån (note 14) bør afklares før eventuel indstilling.",
          "Branchen vokser, men 70% af omsætningen er EUR-faktureret.",
        ].map((b, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 13, color: 'var(--c-text)', lineHeight: 1.55 }}>
            <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-text-4)', flexShrink: 0, transform: 'translateY(-2px)' }}/>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--c-line-2)', fontSize: 12.5, color: 'var(--c-text-3)' }}>
        {t('Brug knapperne ovenfor til at gå videre med yderligere materiale fra kunden - eller give afslag på sagen.')}
        {' '}
        <button onClick={() => go && go("workspace:" + caseId + ":financials")} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'var(--c-primary)', fontSize: 'inherit', fontWeight: 500 }}>
          {t('Se datagrundlag')}
        </button>
      </div>
    </div>
  );
}

const DECLINE_NOTE_KEY = 'kabul:decline-note:nordhavn';

function DeclinedBlock({ onReopen }) {
  const [note, setNote] = React.useState(() => {
    try { return localStorage.getItem(DECLINE_NOTE_KEY) || ""; } catch (e) { return ""; }
  });
  const [saved, setSaved] = React.useState(false);
  const save = () => {
    try { localStorage.setItem(DECLINE_NOTE_KEY, note); } catch (e) {}
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>{t('Afslagsnote')}</div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("Begrund afslaget - fx 'For høj gældsgrad i forhold til EBITDA og uafklarede ejerforhold.'")}
        rows={4}
        style={{
          width: '100%', resize: 'vertical', padding: '10px 12px',
          border: '1px solid var(--c-line)', borderRadius: 7,
          fontSize: 13, color: 'var(--c-ink)', background: '#fff',
          outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-sm btn-primary" onClick={save} disabled={!note.trim()}>
          {saved ? <>{t('Gemt')} <I.Check className="ic"/></> : t('Gem note')}
        </button>
        <button className="btn btn-sm" onClick={onReopen}>{t('Genoptag sag')}</button>
      </div>
    </div>
  );
}

const MATERIAL_SELECTION_KEY = 'kabul:material-selection:nordhavn';
const MATERIAL_REQUEST_DRAFT_KEY = 'kabul:material-request-draft:nordhavn';
const MATERIAL_GROUPS = [
  {
    key: 'docs',
    label: 'Dokumenter',
    items: [
      { id: 'm-annual',    label: 'Intern årsrapport',             tag: 'Anbefalet' },
      { id: 'm-interim',   label: 'Periodetal',                    tag: 'Anbefalet' },
      { id: 'm-budget',    label: 'Budget',                        tag: 'Anbefalet' },
      { id: 'm-pitch',     label: 'Pitch deck',                    tag: 'Anbefalet' },
      { id: 'm-ejerbog',   label: 'Ejerbog',                       tag: 'Anbefalet' },
      { id: 'm-loans',     label: 'Eksisterende låneaftaler',      tag: 'Anbefalet' },
      { id: 'm-security',  label: 'Sikkerhedsdokumenter',          tag: 'Anbefalet' },
      { id: 'm-trade',     label: 'Samhandelslande',               tag: 'Anbefalet' },
      { id: 'm-ownership', label: 'Ejeraftale',                    tag: 'Valgfri' },
    ],
  },
];

const DEFAULT_MATERIAL_SELECTION = (() => {
  const s = {};
  MATERIAL_GROUPS.forEach(g => g.items.forEach(it => { s[it.id] = it.tag === 'Anbefalet'; }));
  return s;
})();

function loadMaterialSelection() {
  try {
    const raw = localStorage.getItem(MATERIAL_SELECTION_KEY);
    return raw ? { ...DEFAULT_MATERIAL_SELECTION, ...JSON.parse(raw) } : { ...DEFAULT_MATERIAL_SELECTION };
  } catch (e) { return { ...DEFAULT_MATERIAL_SELECTION }; }
}

function loadMaterialRequestDraft() {
  const recipient = DATA.REQUEST_RECIPIENT || {};
  const [role = recipient.role || ''] = (recipient.role || '').split(',');
  const fallback = {
    name: recipient.name || '',
    role: role.trim(),
    email: recipient.email || '',
    message: `Hej ${recipient.name ? recipient.name.split(' ')[0] : ''},\n\nFor at færdiggøre kreditvurderingen mangler vi nedenstående materiale. Du kan uploade/svare via linket nedenfor.\n\nVenlig hilsen\nMette L. · EIFO`,
  };
  try {
    const raw = localStorage.getItem(MATERIAL_REQUEST_DRAFT_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch (e) { return fallback; }
}

function MaterialSelector({ onCreateRequest, onBack }) {
  const [sel, setSel] = React.useState(loadMaterialSelection);
  const [draft, setDraft] = React.useState(loadMaterialRequestDraft);
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => {
    try { localStorage.setItem(MATERIAL_SELECTION_KEY, JSON.stringify(sel)); } catch (e) {}
  }, [sel]);
  React.useEffect(() => {
    try { localStorage.setItem(MATERIAL_REQUEST_DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
  }, [draft]);
  const toggle = (id) => setSel(s => ({ ...s, [id]: !s[id] }));
  const selectedItems = [];
  MATERIAL_GROUPS.forEach(g => g.items.forEach(it => {
    if (sel[it.id]) selectedItems.push(it);
  }));
  const count = selectedItems.length;
  const canCreate = count > 0 && draft.name.trim() && draft.email.trim();
  const subject = t('Materiale til kreditvurdering af') + ' ' + DATA.COMPANY.name;
  const saveDraft = () => {
    try {
      localStorage.setItem(MATERIAL_SELECTION_KEY, JSON.stringify(sel));
      localStorage.setItem(MATERIAL_REQUEST_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {}
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const selectAllRecommended = () => {
    setSel(s => {
      const next = { ...s };
      MATERIAL_GROUPS.forEach(g => g.items.forEach(it => { if (it.tag === 'Anbefalet') next[it.id] = true; }));
      return next;
    });
  };

  return (
    <div className="card" style={{ padding: '4px 22px' }}>
      {MATERIAL_GROUPS.map((g, gi) => (
        <div
          key={g.key}
          style={{
            padding: '14px 0',
            borderTop: gi === 0 ? 'none' : '1px solid var(--c-line-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{t(g.label)}</div>
            <button
              type="button"
              onClick={selectAllRecommended}
              style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', fontSize: 12.5, color: 'var(--c-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}
            >
              {t('Vælg alle anbefalede')}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {g.items.map(it => (
              <label key={it.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 4px', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={!!sel[it.id]}
                  onChange={() => toggle(it.id)}
                  style={{ accentColor: 'var(--c-primary)', flexShrink: 0 }}
                />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--c-text)' }}>{t(it.label)}</span>
                <span style={{
                  fontSize: 10.5, fontWeight: 500,
                  color: it.tag === 'Anbefalet' ? 'var(--c-primary)' : 'var(--c-text-3)',
                  whiteSpace: 'nowrap',
                }}>
                  {t(it.tag)}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div style={{ padding: '16px 0 14px', borderTop: '1px solid var(--c-line-2)' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 10 }}>{t('Send anmodning til')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.9fr) minmax(360px, 1.1fr)', gap: 18, alignItems: 'start' }}>
          <div>
            <div className="grid g-2" style={{ gap: 10, marginBottom: 10 }}>
              <div className="field">
                <label>{t('Modtagernavn')}</label>
                <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/>
              </div>
              <div className="field">
                <label>{t('Rolle')}</label>
                <input className="input" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })}/>
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })}/>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="label-mini" style={{ marginBottom: 8 }}>{t('Forhåndsvisning af link')}</div>
              <div className="link-banner">
                <I.Link size={14} style={{ color: 'var(--c-text-3)' }}/>
                <span className="url">{DATA.REQUEST_LINK}</span>
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                {t('Linket er personligt til')} {draft.name || t('modtageren')} {t('og udløber efter 30 dage.')}
              </div>
            </div>
          </div>

          <div>
            <div className="label-mini" style={{ marginBottom: 8 }}>{t('Forhåndsvisning af mail')}</div>
            <div style={{
              border: '1px solid var(--c-line)', borderRadius: 8,
              background: 'var(--c-surface-2)', padding: 12,
              fontSize: 12.5, color: 'var(--c-text)', lineHeight: 1.45,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 6, marginBottom: 8 }}>
                <span className="muted">{t('Til')}</span>
                <span style={{ color: 'var(--c-ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{draft.name || t('Modtager')} · {draft.email || 'email'}</span>
                <span className="muted">{t('Emne')}</span>
                <span style={{ color: 'var(--c-ink)' }}>{subject}</span>
              </div>
              <textarea
                className="input"
                value={draft.message}
                onChange={e => setDraft({ ...draft, message: e.target.value })}
                rows={5}
                style={{ height: 'auto', resize: 'vertical', padding: 10, lineHeight: 1.45, marginBottom: 10 }}
              />
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 5 }}>{t('Valgte punkter')}</div>
              <ul style={{ margin: 0, paddingLeft: 17, color: 'var(--c-text-2)' }}>
                {selectedItems.slice(0, 6).map(it => <li key={it.id}>{t(it.label)}</li>)}
                {selectedItems.length > 6 && <li>+ {selectedItems.length - 6} {t('yderligere punkter')}</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', borderTop: '1px solid var(--c-line-2)' }}>
        <div style={{ flex: 1, fontSize: 12.5, color: 'var(--c-text-3)' }}>
          {count} {count === 1 ? t('punkt') : t('punkter')} {t('valgt til kundeanmodning')}
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onBack}>{t('Tilbage')}</button>
        <button className="btn btn-sm" onClick={saveDraft}>{saved ? t('Kladde gemt') : t('Gem som kladde')}</button>
        <button className="btn btn-sm btn-primary" onClick={onCreateRequest} disabled={!canCreate}>
          {t('Opret kundeanmodning')} <I.ArrowRight className="ic"/>
        </button>
      </div>
    </div>
  );
}

function CustomerStatusBlock({ stage, go, onMarkReady }) {
  const sel = (() => {
    try {
      const raw = localStorage.getItem(MATERIAL_SELECTION_KEY);
      return raw ? { ...DEFAULT_MATERIAL_SELECTION, ...JSON.parse(raw) } : { ...DEFAULT_MATERIAL_SELECTION };
    } catch (e) { return { ...DEFAULT_MATERIAL_SELECTION }; }
  })();
  const requestedItems = [];
  MATERIAL_GROUPS.forEach(g => {
    g.items.forEach(it => {
      if (sel[it.id]) requestedItems.push({ ...it, group: g.label });
    });
  });

  // Demo: in 'ready' state, treat first half of items as received
  const isReceived = (idx) => stage === 'ready' && idx < Math.ceil(requestedItems.length / 2);

  const pending = requestedItems.filter((_, i) => !isReceived(i));
  const received = requestedItems.filter((_, i) => isReceived(i));

  return (
    <div className="card" style={{ padding: '6px 22px' }}>
      {/* Pending */}
      <div style={{ padding: '14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>
            {t('Afventer')} {pending.length > 0 && <span style={{ fontWeight: 500, color: 'var(--c-text-3)' }}>· {pending.length}</span>}
          </div>
        </div>
        {pending.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', padding: '6px 0' }}>{t('Intet udestår fra kunden.')}</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {pending.map(it => (
              <li key={it.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0', borderTop: '1px solid var(--c-line-2)',
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '1.5px solid var(--c-warn)', background: '#fff',
                  flexShrink: 0,
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--c-ink)' }}>{t(it.label)}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 1 }}>{t(it.group)}</div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--c-warn)' }}>{t('Afventer')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Received */}
      {received.length > 0 && (
        <div style={{ padding: '14px 0', borderTop: '1px solid var(--c-line-2)' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>
            {t('Modtaget')} <span style={{ fontWeight: 500, color: 'var(--c-text-3)' }}>· {received.length}</span>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {received.map(it => (
              <li key={it.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 0', borderTop: '1px solid var(--c-line-2)',
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'var(--c-success)', color: '#fff',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <I.Check size={10}/>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--c-ink)' }}>{t(it.label)}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 1 }}>{t(it.group)} · {t('Uploadet af kunde')}</div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--c-success)' }}>{t('Modtaget')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function WSIndstil({ go, caseId, indstillet, indstilletAt, onIndstil, onReset }) {
  const caseData = DATA.CASES.find(c => c.id === caseId) || DATA.CASES[0];
  if (indstillet) {
    const d = indstilletAt || new Date();
    const dateStr = d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="page page-wide" style={{ maxWidth: 780, padding: '48px 32px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--c-success)', color: '#fff', display: 'grid', placeItems: 'center' }}>
            <I.Check size={26}/>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-ink)', letterSpacing: '-0.02em' }}>{t('Sagen er indstillet')}</div>
            <div style={{ fontSize: 14, color: 'var(--c-text-2)', marginTop: 6, lineHeight: 1.55, maxWidth: 480 }}>
              {t('Indstillingen er sendt til kreditkomitéen d.')} {dateStr}. {t('Kreditkomitéen behandler sagen og vender tilbage med en beslutning.')}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 22px', marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{t('Indstillingsoversigt')}</div>
            {[
              { label: t("Indstillet af"), value: "Mette Larsen" },
              { label: t("Dato"), value: dateStr + ' · ' + timeStr },
              { label: t("Sagsnr."), value: caseData.caseNr || "2026-0184" },
              { label: t("Kreditmemo"), value: t("Vedhæftet indstillingen") },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid var(--c-line-2)', fontSize: 13.5 }}>
                <span style={{ color: 'var(--c-text-3)', width: 130, flexShrink: 0 }}>{r.label}</span>
                <span style={{ color: 'var(--c-ink)', fontWeight: 500 }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="page page-wide" style={{ maxWidth: 780, padding: '48px 32px 80px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, marginBottom: 40 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--c-success)', color: '#fff', display: 'grid', placeItems: 'center' }}>
          <I.Check size={26}/>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-ink)', letterSpacing: '-0.02em' }}>{t('Klar til indstilling')}</div>
          <div style={{ fontSize: 14, color: 'var(--c-text-2)', marginTop: 6, lineHeight: 1.55, maxWidth: 520 }}>
            {t('Sagen er klar til at blive indstillet til kreditkomitéen. Gennemgå kreditmemo og underskriv indstillingen nedenfor.')}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '6px 22px', marginBottom: 16 }}>
        {[
          { label: t("Finansielt overblik gennemgået") },
          { label: t("Sikkerheder vurderet") },
          { label: t("Kreditmemo udfyldt") },
          { label: t("Kundedialog afsluttet") },
        ].map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: i === 0 ? 'none' : '1px solid var(--c-line-2)' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--c-success)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <I.Check size={11}/>
            </span>
            <span style={{ fontSize: 13.5, color: 'var(--c-ink)', fontWeight: 500 }}>{it.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', height: 40, fontSize: 14 }} onClick={() => go && go("workspace:" + caseId + ":memo")}>
          <I.FileText className="ic"/> {t('Åbn kreditmemo')}
        </button>
        <button onClick={onIndstil} style={{ flex: 1, height: 40, fontSize: 14, fontWeight: 600, background: 'var(--c-success)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <I.Check size={15}/> {t('Send til kreditkomité')}
        </button>
      </div>
    </div>
  );
}

window.WorkspaceShell = WorkspaceShell;
window.Sparkline = Sparkline;
window.BudgetChart = BudgetChart;
window.StamoplysningerCard = StamoplysningerCard;
window.CollectedDataSection = CollectedDataSection;
window.MissingSection = MissingSection;
window.StageHero = StageHero;
window.DecisionBlock = DecisionBlock;
window.DeclinedBlock = DeclinedBlock;
window.MaterialSelector = MaterialSelector;
window.CustomerStatusBlock = CustomerStatusBlock;
