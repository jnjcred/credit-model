// New case wizard + customer-facing upload portal
function NewCaseModal({ close, go }) {
  const [step, setStep] = React.useState(1);
  const [cvr, setCvr] = React.useState("");
  const [foundCompany, setFoundCompany] = React.useState(null);
  const [caseType, setCaseType] = React.useState("export");
  const [amount, setAmount] = React.useState("");
  const [datapack, setDatapack] = React.useState(["annual","interim","budget","ownership","loans","security","pep"]);
  const [contact, setContact] = React.useState({ name: "Anders Nielsen", email: "an@nordhavn-composite.dk", role: "CFO" });
  const [sent, setSent] = React.useState(false);

  const lookup = (v) => {
    setCvr(v);
    if (v.replace(/\s/g, '').length >= 8) {
      setFoundCompany({
        name: "Nordhavn Composite A/S",
        cvr: v,
        address: "Havnegade 47, 9900 Frederikshavn",
        industry: "Komposit­materialer / vindenergi",
        employees: 142,
        founded: 2014,
      });
    } else {
      setFoundCompany(null);
    }
  };

  const dataOptions = [
    { id: "annual", name: "Seneste årsrapport", req: true, auto: false },
    { id: "interim", name: "Periodetal", req: true, auto: true, src: "e-conomic" },
    { id: "budget", name: "Budget 2026-2028", req: true, auto: false },
    { id: "ownership", name: "Ejerbog", req: true, auto: false },
    { id: "articles", name: "Vedtægter", req: false, auto: true, src: "CVR-registret" },
    { id: "shareholder", name: "Ejeraftale", req: false, auto: false },
    { id: "loans", name: "Eksisterende låneaftaler", req: true, auto: false },
    { id: "security", name: "Sikkerheds­dokumenter", req: true, auto: false },
    { id: "pep", name: "PEP-erklæring", req: true, auto: false },
    { id: "org", name: "Organisations­diagram", req: false, auto: false },
    { id: "trade", name: "Samhandelslande", req: false, auto: false },
  ];

  const toggle = (id) => setDatapack(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id]);

  return (
    <div className="scrim" onClick={close}>
      <div className="modal" style={{ width: 720 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{t('Ny sag')}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{t('Trin')} {sent ? 3 : step} {t('af')} 3</div>
          </div>
          <button className="icon-btn" onClick={close}><I.X size={16}/></button>
        </div>

        <div style={{ padding: '0 22px', borderBottom: '1px solid var(--c-line)' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { n: 1, t: "Virksomhed" },
              { n: 2, t: "Sag og data" },
              { n: 3, t: "Kontakt og link" },
            ].map((s, i) => (
              <div key={s.n} style={{ flex: 1, padding: '12px 0', borderBottom: '2px solid ' + ((sent ? 3 : step) === s.n ? 'var(--c-ink)' : 'transparent'), color: ((sent ? 3 : step) === s.n ? 'var(--c-ink)' : 'var(--c-text-3)'), fontSize: 12.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: (sent ? 3 : step) >= s.n ? 'var(--c-ink)' : 'var(--c-line-2)', color: '#fff', fontSize: 10.5, display: 'grid', placeItems: 'center', fontWeight: 600 }}>{s.n}</span>
                {t(s.t)}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {step === 1 && !sent && (
            <div className="vstack" style={{ gap: 16 }}>
              <div className="field">
                <label>{t('CVR-nummer eller virksomhedsnavn')}</label>
                <input className="input input-lg mono" placeholder="38 42 71 56" value={cvr} onChange={e => lookup(e.target.value)} autoFocus/>
                <div className="muted" style={{ fontSize: 11.5 }}>{t('Vi finder selskabsdata automatisk fra CVR-registret.')}</div>
              </div>
              {foundCompany && (
                <div style={{ border: '1px solid var(--c-line)', borderRadius: 8, padding: 14, display: 'flex', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', fontWeight: 600 }}>NC</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{foundCompany.name}</div>
                      <span style={{ color: 'var(--c-success)', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Check size={12}/> {t('Fundet i CVR')}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 2 }}>{foundCompany.address}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{foundCompany.industry} · {foundCompany.employees} {t('ansatte')} · {t('stiftet')} {foundCompany.founded}</div>
                  </div>
                </div>
              )}
              {!foundCompany && cvr.length === 0 && (
                <div className="muted" style={{ fontSize: 12, textAlign: 'center', padding: 18 }}>
                  {t('Indtast CVR eller virksomhedsnavn - prøv fx')} <span className="mono" style={{ background: 'var(--c-surface-2)', padding: '1px 5px', borderRadius: 4, cursor: 'pointer' }} onClick={() => lookup("38 42 71 56")}>38 42 71 56</span>
                </div>
              )}
            </div>
          )}

          {step === 2 && !sent && (
            <div className="vstack" style={{ gap: 18 }}>
              <div className="grid g-2" style={{ gap: 14 }}>
                <div className="field">
                  <label>{t('Sagstype')}</label>
                  <select className="input" value={caseType} onChange={e => setCaseType(e.target.value)}>
                    <option value="export">{t('Eksportkaution')}</option>
                    <option value="op">{t('Driftskredit')}</option>
                    <option value="grow">{t('Vækstlån')}</option>
                    <option value="inv">{t('Investeringslån')}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t('Beløb')}</label>
                  <input className="input mono" placeholder="DKK 45.000.000" value={amount} onChange={e => setAmount(e.target.value)}/>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--c-text-2)', fontWeight: 500, display: 'block', marginBottom: 8 }}>{t('Ønsket datagrundlag')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--c-line-2)', borderRadius: 8, border: '1px solid var(--c-line)', overflow: 'hidden' }}>
                  {dataOptions.map(o => (
                    <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#fff', cursor: 'pointer' }}>
                      <input type="checkbox" checked={datapack.includes(o.id)} onChange={() => toggle(o.id)}/>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t(o.name)}{o.req && <span style={{ color: 'var(--c-text-3)' }}> ·</span>}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--c-text-3)' }}>{o.auto ? t('Auto fra') + ' ' + o.src : t('Kunde uploader')}</div>
                      </div>
                      {o.req && <span className="tag" style={{ fontSize: 9.5 }}>{t('Krævet')}</span>}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && !sent && (
            <div className="vstack" style={{ gap: 16 }}>
              <div className="grid g-2" style={{ gap: 14 }}>
                <div className="field">
                  <label>{t('Modtagernavn')}</label>
                  <input className="input" value={contact.name} onChange={e => setContact({...contact, name: e.target.value})}/>
                </div>
                <div className="field">
                  <label>{t('Rolle')}</label>
                  <input className="input" value={contact.role} onChange={e => setContact({...contact, role: e.target.value})}/>
                </div>
              </div>
              <div className="field">
                <label>{t('Email')}</label>
                <input className="input" value={contact.email} onChange={e => setContact({...contact, email: e.target.value})}/>
              </div>
              <div className="field">
                <label>{t('Personlig besked (valgfri)')}</label>
                <textarea className="input" rows={3} style={{ height: 'auto', padding: 10, resize: 'vertical' }}
                  placeholder={t("Hej Anders,\n\nFor at vurdere jeres ansøgning skal vi bruge nedenstående materiale. Det tager ca. 10 minutter at uploade.\n\nMvh Mette")}/>
              </div>
              <div style={{ background: 'var(--c-surface-2)', padding: 14, borderRadius: 8, fontSize: 12.5 }}>
                <div className="label-mini" style={{ marginBottom: 4 }}>{t('Forhåndsvisning')}</div>
                <div className="mono" style={{ color: 'var(--c-text)' }}>crediwire.app/c/nh-9j2k-7Aq3</div>
                <div className="muted" style={{ marginTop: 4 }}>{t('Linket udløber efter 30 dage og kræver ingen login.')}</div>
              </div>
            </div>
          )}

          {sent && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--c-success-bg)', color: 'var(--c-success)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                <I.Check size={22}/>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Sagen er oprettet')}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t('Indhentningslinket er sendt til')} {contact.name}.</div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
                <button className="btn" onClick={() => { close(); go('cases'); }}>{t('Til sagsoversigt')}</button>
                <button className="btn btn-primary" onClick={() => { close(); go('workspace:1'); }}>{t('Åbn sagen')} <I.ArrowRight className="ic"/></button>
              </div>
            </div>
          )}
        </div>

        {!sent && (
          <div className="modal-foot">
            {step > 1 && <button className="btn" onClick={() => setStep(step-1)}><I.ChevronLeft className="ic"/> {t('Tilbage')}</button>}
            <div style={{ flex: 1 }}/>
            <button className="btn btn-ghost" onClick={close}>{t('Annullér')}</button>
            {step < 3
              ? <button className="btn btn-primary" disabled={step === 1 && !foundCompany} onClick={() => setStep(step+1)}>{t('Næste')} <I.ArrowRight className="ic"/></button>
              : <button className="btn btn-primary" onClick={() => setSent(true)}><I.Send className="ic"/> {t('Send link til kunden')}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// External customer-facing upload portal - multi-screen flow
function CustomerPortal({ back }) {
  const [screen, setScreen] = React.useState("welcome"); // welcome | terms | agreement | hub | upload | connect | trade | followup | done | status
  const [items, setItems] = React.useState([
    { id: "annual", l: "Seneste årsrapport", kind: "upload", st: "done", note: "Hentet automatisk fra CVR-registret · Årsrapport 2024", auto: true, min: 1 },
    { id: "internal_annual", l: "Intern årsrapport", kind: "upload", st: "open", min: 1 },
    { id: "interim", l: "Periodetal", kind: "connect", st: "open", note: "Forbind bogføringssystem eller upload råbalance", min: 0 },
    { id: "budget", l: "Budget", kind: "upload", st: "open", note: "Træk budget PDF/Excel ind", min: 1 },
    { id: "pitchdeck", l: "Pitch deck", kind: "upload", st: "open", min: 1 },
    { id: "ownership", l: "Ejerbog", kind: "upload", st: "open", note: "Træk ejerbog-PDF ind", min: 1 },
    { id: "loans", l: "Eksisterende låneaftaler", kind: "upload", st: "open", note: "Træk PDF'er ind", min: 2 },
    { id: "security", l: "Sikkerheds­dokumenter", kind: "upload", st: "open", note: "Pantebreve, kautionserklæringer", min: 2 },
    { id: "trade", l: "Samhandelslande", kind: "trade", st: "open", note: "Vælg fra liste", min: 1 },
    { id: "shareholder", l: "Ejeraftale", kind: "upload", st: "open", note: "Træk ejeraftale-PDF ind", optional: true, min: 1 },
  ]);
  const [activeItem, setActiveItem] = React.useState(null);
  const [followupAnswered, setFollowupAnswered] = React.useState(false);
  const [bundleOpen, setBundleOpen] = React.useState(false);
  const [bundlePreselect, setBundlePreselect] = React.useState(null); // item id to pre-select

  const done = items.filter(x => x.st === "done").length;
  const skipped = items.filter(x => x.st === "skipped").length;
  const accountant = items.filter(x => x.st === "accountant").length;
  const total = items.length;
  const pct = Math.round(((done + skipped + accountant * 0.5) / total) * 100);

  const openItem = (item) => {
    setActiveItem(item);
    if (item.kind === "upload") setScreen("upload");
    else if (item.kind === "connect") setScreen("connect");
    else if (item.kind === "pep") setScreen("pep");
    else if (item.kind === "trade") setScreen("trade");
  };

  const completeItem = (id, note) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, st: "done", note } : x));
    setScreen("hub");
  };

  const skipItem = (id) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, st: "skipped" } : x));
    setScreen("hub");
  };

  const reopenItem = (item) => {
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, st: "open" } : x));
    setActiveItem({ ...item, st: "open" });
    if (item.kind === "upload") setScreen("upload");
    else if (item.kind === "connect") setScreen("connect");
    else if (item.kind === "pep") setScreen("pep");
    else if (item.kind === "trade") setScreen("trade");
  };

  const delegateToHelper = (itemIds, contact, helperKind) => {
    const label = helperKind === 'bank' ? 'bank' : 'revisor';
    setItems(prev => prev.map(x => itemIds.includes(x.id) ? {
      ...x,
      st: "accountant",
      helperKind,
      helperName: contact.name,
      helperEmail: contact.email,
      note: "Anmodet fra " + label + " (" + contact.email + ") · afventer svar"
    } : x));
    setBundleOpen(false);
    setBundlePreselect(null);
  };

  const takeBack = (item) => {
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, st: "open", note: "Klar til upload" } : x));
  };

  const openBundle = (preselect) => {
    setBundlePreselect(preselect || null);
    setBundleOpen(true);
  };

  return (
    <div style={{ background: '#faf8f4', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Persistent header */}
      <div style={{ borderBottom: '1px solid var(--c-line)', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="brand-mark" style={{ background: 'var(--c-primary)' }}>cw</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-primary)' }}>{t('Kreditmateriale')}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{t('Sikker indlevering')} · Nordhavn Composite A/S</div>
          </div>
          {screen !== "welcome" && screen !== "done" && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--c-text-2)' }}>
              <div style={{ width: 100, height: 4, borderRadius: 999, background: 'var(--c-line-2)', overflow: 'hidden' }}>
                <div style={{ width: pct + '%', height: '100%', background: 'var(--c-primary)', borderRadius: 999, transition: 'width 240ms' }}/>
              </div>
              <span className="mono">{done + skipped}/{total}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--c-text-3)' }}>
            <I.Lock size={11}/> {t('Sikker')}
          </div>
          <LanguageSwitcher compact/>
        </div>
      </div>

      {/* "Back to advisor view" floating chip */}
      <button onClick={back} style={{ position: 'fixed', bottom: 18, left: 18, background: 'var(--c-primary)', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 6, zIndex: 50, boxShadow: 'var(--shadow-lg)' }}>
        <I.ArrowLeft size={12}/> {t('Tilbage til rådgiver-visning')}
      </button>

      {/* Demo shortcut */}
      <button onClick={() => { setItems(prev => prev.map(x => x.st === 'done' ? x : { ...x, st: 'done', note: 'Udfyldt til demo' })); setScreen('hub'); }} style={{ position: 'fixed', bottom: 18, right: 18, background: 'transparent', color: 'var(--c-text-4)', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
        {t('Udfyld alt (demo)')}
      </button>

      <div style={{ flex: 1, padding: '32px 24px' }}>
        {screen === "welcome" && <PortalWelcome onStart={() => setScreen("terms")}/>}
        {screen === "terms" && <PortalTerms onNext={() => setScreen("hub")} onBack={() => setScreen("welcome")}/>}
        {screen === "hub" && <PortalHub items={items} pct={pct} done={done} total={total} accountant={accountant} onOpen={openItem} onReopen={reopenItem} onTakeBack={takeBack} onOpenBundle={openBundle} onSubmit={() => setScreen("done")} onClose={back} onBack={() => setScreen("terms")} onFollowup={() => setScreen("followup")} followupAnswered={followupAnswered}/>}
        {screen === "upload" && <PortalUpload item={activeItem} onBack={() => setScreen("hub")} onDone={(note) => completeItem(activeItem.id, note)} onSkip={() => skipItem(activeItem.id)}/>}
        {screen === "connect" && <PortalConnect item={activeItem} onBack={() => setScreen("hub")} onDone={(note) => completeItem(activeItem.id, note)}/>}
        {screen === "trade" && <PortalTrade item={activeItem} onBack={() => setScreen("hub")} onDone={(note) => completeItem(activeItem.id, note)}/>}
        {screen === "followup" && <PortalFollowup onBack={() => setScreen("hub")} onSubmit={() => { setFollowupAnswered(true); setItems(prev => prev.map(x => x.hasFollowup ? { ...x, hasFollowup: false, note: x.note + " · spørgsmål besvaret" } : x)); setScreen("hub"); }}/>}
        {screen === "done" && <PortalDone onBack={() => setScreen("hub")} onStatus={() => setScreen("status")}/>}
        {screen === "status" && (
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <button onClick={() => setScreen("done")} className="btn btn-sm btn-ghost" style={{ marginBottom: 18 }}><I.ArrowLeft className="ic"/> {t('Tilbage')}</button>
            <WSCustomerStatus/>
          </div>
        )}
      </div>

      {bundleOpen && <DelegateBundleModal items={items} preselect={bundlePreselect} onClose={() => { setBundleOpen(false); setBundlePreselect(null); }} onSend={(itemIds, contact, helperKind) => delegateToHelper(itemIds, contact, helperKind)}/>}
    </div>
  );
}

function PortalTerms({ onNext, onBack }) {
  const [accepted, setAccepted] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ marginBottom: 20 }}><I.ArrowLeft className="ic"/> {t('Gå tilbage')}</button>
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: '0 0 10px' }}>{t('Vilkår og betingelser')}</h1>
      <p style={{ fontSize: 14.5, color: 'var(--c-text-2)', lineHeight: 1.65, marginBottom: 28 }}>
        {t('For at sikre nem og sikker deling har vi indgået et partnerskab med Crediwire ApS.')}
      </p>

      <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, padding: '20px 22px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} onClick={() => setAccepted(v => !v)}>
          <div style={{ width: 20, height: 20, borderRadius: 4, border: '1.5px solid ' + (accepted ? 'var(--c-primary)' : 'var(--c-line-strong)'), background: accepted ? 'var(--c-primary)' : '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
            {accepted && <I.Check size={12} style={{ color: '#fff' }}/>}
          </div>
          <div style={{ fontSize: 14, color: 'var(--c-text)', lineHeight: 1.6 }}>
            {t("Jeg accepterer Crediwire ApS's")} <span style={{ color: 'var(--c-primary)', textDecoration: 'underline' }}>{t('Vilkår og betingelser')}</span> {t('og')} <span style={{ color: 'var(--c-primary)', textDecoration: 'underline' }}>{t('Databehandleraftale')}</span>. <span style={{ color: '#e53935' }}>*</span>
          </div>
        </label>
        <div style={{ height: 1, background: 'var(--c-line-2)' }}/>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} onClick={() => setMarketing(v => !v)}>
          <div style={{ width: 20, height: 20, borderRadius: 4, border: '1.5px solid ' + (marketing ? 'var(--c-primary)' : 'var(--c-line-strong)'), background: marketing ? 'var(--c-primary)' : '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
            {marketing && <I.Check size={12} style={{ color: '#fff' }}/>}
          </div>
          <div style={{ fontSize: 14, color: 'var(--c-text)', lineHeight: 1.6 }}>
            {t('Ja, jeg vil gerne modtage markedsføringsmateriale fra Crediwire ApS om produktopdateringer, arrangementer og serviceopdateringer via e-mail')}
          </div>
        </label>
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginBottom: 28, lineHeight: 1.6 }}>
        {t('Vi behandler dine personoplysninger i overensstemmelse med vores Privatlivspolitik.')}
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onNext} disabled={!accepted} className="btn btn-primary"
          style={accepted ? { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' } : { opacity: 0.4, cursor: 'not-allowed' }}>
          {t('Næste')} <I.ArrowRight className="ic"/>
        </button>
      </div>
    </div>
  );
}

function PortalAgreement({ onBack, onNext }) {
  const [showFaq, setShowFaq] = React.useState(false);
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ marginBottom: 20 }}><I.ArrowLeft className="ic"/> {t('Gå tilbage')}</button>
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: '0 0 10px' }}>{t('Din aftale med EIFO')}</h1>

      <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, padding: '22px 24px', marginBottom: 24 }}>
        <p style={{ fontSize: 14.5, color: 'var(--c-text-2)', lineHeight: 1.65, margin: '0 0 16px' }}>
          {t('Ved at tilslutte din virksomhed accepterer du at dele råbalancetal og debitordata med EIFO.')}
        </p>
        <p style={{ fontSize: 14.5, color: 'var(--c-text-2)', lineHeight: 1.65, margin: '0 0 20px' }}>
          {t('Disse data kan opbevares og bruges til at styrke kundedialogen, identificere finansielle behov og gennemføre løbende kreditvurderinger.')}
        </p>
        <span onClick={() => setShowFaq(true)} style={{ color: 'var(--c-primary)', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <I.Help size={13}/> {t('FAQ: Hvilke data deler du?')}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onBack} className="btn">{t('Tilbage')}</button>
        <button onClick={onNext} className="btn btn-primary" style={{ background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>
          {t('Næste')} <I.ArrowRight className="ic"/>
        </button>
      </div>

      {showFaq && (
        <div className="scrim" onClick={() => setShowFaq(false)}>
          <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', color: 'var(--c-primary)', display: 'grid', placeItems: 'center' }}>
                  <I.Help size={14}/>
                </div>
                <div className="modal-title">{t('FAQ: Hvilke data deler du?')}</div>
              </div>
              <button className="icon-btn" onClick={() => setShowFaq(false)}><I.X size={16}/></button>
            </div>
            <div className="modal-body" style={{ paddingTop: 4 }}>
              <p style={{ fontSize: 14, color: 'var(--c-text-2)', lineHeight: 1.65, margin: '0 0 20px' }}>
                {t('EIFO modtager generelt de samme data som tidligere er sendt på email, nu bare digitalt og på en nemmere og mere sikker måde.')}
              </p>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>{t('Vi modtager følgende:')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {["Råbalancetal", "Debitordata"].map(item => (
                    <li key={item} style={{ fontSize: 13.5, color: 'var(--c-text-2)' }}>{t(item)}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>{t('Vi modtager IKKE:')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {["Posteringer", "Bilag"].map(item => (
                    <li key={item} style={{ fontSize: 13.5, color: 'var(--c-text-2)' }}>{t(item)}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="modal-foot" style={{ justifyContent: 'flex-end' }}>
              <button onClick={() => setShowFaq(false)} className="btn btn-primary" style={{ background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>{t('Okay')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PortalWelcome({ onStart }) {
  return (
    <div style={{ maxWidth: 560, margin: '40px auto 0', textAlign: 'left' }}>
      <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--c-surface-2)', borderRadius: 999, fontSize: 11, color: 'var(--c-text-2)', fontWeight: 500 }}>{t('MAJ 2026')}</div>
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--c-ink)', margin: '18px 0 10px', lineHeight: 1.15 }}>{t('Kære')} Anders,</h1>
      <p style={{ fontSize: 15, color: 'var(--c-text-2)', lineHeight: 1.55, marginBottom: 24 }}>
        {t('Tak for din ansøgning hos EIFO. For at vi kan behandle din ansøgning, har vi samlet alt det vi har brug for i ét sted, så I slipper for at lede i mails og dokumenter.')}
      </p>

      <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div className="label-mini" style={{ marginBottom: 10 }}>{t('Sådan foregår det')}</div>
        {[
          { ic: <I.Clock size={14}/>, t: "Ca. 10 minutter samlet - det meste er upload" },
          { ic: <I.Refresh size={14}/>, t: "Vend tilbage senere - fremgang er gemt automatisk" },
          { ic: <I.Lock size={14}/>, t: "Krypteret forbindelse · ingen login krævet" },
          { ic: <I.Spark size={14}/>, t: "Vi henter data fra dit økonomisystem og CVR automatisk hvor vi kan" },
        ].map((x, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', alignItems: 'center', fontSize: 13.5 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--c-surface-2)', display: 'grid', placeItems: 'center', color: 'var(--c-text-2)', flexShrink: 0 }}>{x.ic}</div>
            <div>{t(x.t)}</div>
          </div>
        ))}
      </div>

      <button onClick={onStart} className="btn btn-primary btn-lg" style={{ padding: '0 22px', background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>
        {t('Lad os komme i gang')} <I.ArrowRight className="ic"/>
      </button>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--c-text-3)' }}>
        {t('Eller skriv direkte til Mette på')} <b style={{ color: 'var(--c-ink)' }}>mette.larsen@eifo.dk</b>
      </div>
    </div>
  );
}

function PortalHub({ items, pct, done, total, accountant, onOpen, onReopen, onTakeBack, onOpenBundle, onSubmit, onClose, onBack, onFollowup, followupAnswered }) {
  const allDone = items.every(x => x.st === "done" || x.st === "skipped");
  const hasFollowup = items.some(x => x.hasFollowup);
  const canDelegate = items.some(x => x.st === "open");
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ marginBottom: 16 }}><I.ArrowLeft className="ic"/> {t('Gå tilbage')}</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em', flex: 1 }}>{t('Materiale til kreditafdelingen')}</div>
        {canDelegate && (
          <button onClick={() => onOpenBundle(null)} className="btn btn-sm btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.User size={13}/> {t('Anmod bank eller revisor om hjælp')}
          </button>
        )}
      </div>

      {/* Followup card */}
      {hasFollowup && (
        <div style={{ marginTop: 18, padding: '14px 16px', background: '#fff', border: '1px solid var(--c-line)', borderRadius: 10, borderLeft: '3px solid var(--c-warn)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <I.AlertCircle size={16} style={{ color: 'var(--c-warn)', flexShrink: 0 }}/>
          <div style={{ flex: 1, fontSize: 13 }}>
            <b>{t('Mette har et opfølgende spørgsmål')}</b> {t('til budgettet - kan du bekræfte stigningen i juli 2026?')}
          </div>
          <button onClick={onFollowup} className="btn btn-sm btn-primary" style={{ background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>{t('Svar')}</button>
        </div>
      )}
      {followupAnswered && !hasFollowup && (
        <div style={{ marginTop: 18, padding: '10px 14px', background: 'var(--c-success-bg)', border: '1px solid transparent', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--c-success)', fontSize: 12.5 }}>
          <I.Check size={14}/> {t('Spørgsmål besvaret · Mette har fået din kommentar.')}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', marginTop: 18, overflow: 'hidden' }}>
        {items.map((x, i) => (
          <PortalHubRow key={x.id} x={x} isFirst={i === 0} onOpen={onOpen} onReopen={onReopen} onTakeBack={onTakeBack} onOpenBundle={onOpenBundle}/>
        ))}
      </div>

      {accountant > 0 && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--c-warn-bg)', borderRadius: 10, fontSize: 12.5, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <I.Clock size={14} style={{ color: 'var(--c-warn)', flexShrink: 0 }}/>
          <div style={{ flex: 1 }}>
            <b>{accountant}</b> {accountant === 1 ? t('element afventer') : t('elementer afventer')} {t('jeres bank eller revisor. Kreditafdelingen ser status og kan kontakte dem direkte hvis nødvendigt.')}
          </div>
          <button onClick={() => onOpenBundle(null)} className="btn btn-sm btn-ghost" style={{ fontSize: 11.5 }}>{t('Rediger')}</button>
        </div>
      )}

      <div style={{ marginTop: 22, padding: 18, background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>{allDone ? t("Klar til at indsende") : t("Fortsæt senere")}</div>
          <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 2 }}>{allDone ? t("Mette får besked automatisk når du indsender") : t("Vi gemmer automatisk · du kan vende tilbage via det samme link")}</div>
        </div>
        {allDone && (
          <button onClick={onSubmit} className="btn btn-primary" style={{ background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>{t('Indsend til kreditafdelingen')} <I.ArrowRight className="ic"/></button>
        )}
      </div>
    </div>
  );
}

function PortalHubRow({ x, isFirst, onOpen, onReopen, onTakeBack, onOpenBundle }) {
  const [menu, setMenu] = React.useState(false);
  const interactive = x.st !== 'done' && x.st !== 'accountant';
  return (
    <div style={{ position: 'relative', padding: '14px 18px', borderTop: !isFirst ? '1px solid var(--c-line-2)' : 'none', display: 'flex', alignItems: 'center', gap: 14, cursor: interactive ? 'pointer' : 'default' }}
      onClick={() => interactive && onOpen(x)}>
      {x.st === 'done'
        ? <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', display: 'grid', placeItems: 'center' }}><I.Check size={12}/></div>
        : x.st === 'skipped'
        ? <I.X size={20} style={{ color: 'var(--c-text-4)' }}/>
        : x.st === 'accountant'
        ? <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--c-warn-bg)', color: 'var(--c-warn)', display: 'grid', placeItems: 'center', border: '1.5px solid var(--c-warn)' }}><I.Clock size={11}/></div>
        : <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--c-line-strong)' }}/>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: x.st === 'done' || x.st === 'skipped' ? 'var(--c-text-3)' : 'var(--c-ink)' }}>
          {t(x.l)}
          {x.optional && <span className="tag" style={{ fontSize: 10, marginLeft: 7, color: 'var(--c-text-3)' }}>{t('Valgfri')}</span>}
          {x.auto && <span className="tag" style={{ fontSize: 10, marginLeft: 7, color: 'var(--c-text-2)' }}>{t('Auto')}</span>}
          {x.st === 'accountant' && <span className="tag" style={{ fontSize: 10, marginLeft: 7, background: 'var(--c-warn-bg)', color: 'var(--c-warn)', border: 'none' }}>{x.helperKind === 'bank' ? t('Afventer bank') : t('Afventer revisor')}</span>}
        </div>
      </div>
      {x.st === 'open' && (
        <I.ChevronRight size={16} style={{ color: 'var(--c-text-3)' }}/>
      )}
      {x.st === 'accountant' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={(e) => { e.stopPropagation(); onTakeBack(x); }} className="btn btn-sm">{t('Tag tilbage')}</button>
        </div>
      )}
      {x.st === 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--c-success)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><I.Check size={12}/> {t('Færdig')}</span>
          <button onClick={(e) => { e.stopPropagation(); setMenu(!menu); }} className="btn btn-sm btn-ghost" style={{ padding: '0 6px' }}>
            <I.MoreH className="ic"/>
          </button>
          {menu && (
            <div onMouseLeave={() => setMenu(false)} style={{ position: 'absolute', top: 'calc(100% - 4px)', right: 14, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 20, padding: 4, minWidth: 200 }}>
              <button onClick={(e) => { e.stopPropagation(); setMenu(false); onReopen(x); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--c-text)', borderRadius: 5, textAlign: 'left' }}>
                <I.Refresh size={13}/> {x.kind === 'upload' ? t('Upload igen') : x.kind === 'pep' ? t('Underskriv igen') : x.kind === 'trade' ? t('Rediger svar') : t('Genåbn')}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setMenu(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--c-text)', borderRadius: 5, textAlign: 'left' }}>
                <I.Eye size={13}/> {t('Se hvad kreditafdelingen modtog')}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setMenu(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--c-text)', borderRadius: 5, textAlign: 'left' }}>
                <I.Download size={13}/> {t('Download')}
              </button>
            </div>
          )}
        </div>
      )}
      {x.st === 'skipped' && <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); onOpen(x); }}>{t('Tilføj alligevel')}</button>}
    </div>
  );
}

function PortalUpload({ item, onBack, onDone, onSkip }) {
  const [drag, setDrag] = React.useState(false);
  const [files, setFiles] = React.useState([]);
  const [completing, setCompleting] = React.useState(false);
  const doneRef = React.useRef(false);

  const fakeFiles = {
    loans: [
      { name: "Laaneaftale_Nordea_2022.pdf", size: "412 KB", type: "Låneaftale" },
      { name: "Laaneaftale_Jyske_2024.pdf",  size: "287 KB", type: "Låneaftale" },
    ],
    security: [
      { name: "Pantebrev_maskiner.pdf",        size: "156 KB", type: "Pantebrev" },
      { name: "Selskabskaution_AH.pdf",         size: "98 KB",  type: "Kautionserklæring" },
    ],
  };

  const handleDrop = () => {
    setDrag(false);
    setFiles(prev => {
      const pool = fakeFiles[item.id] || [{ name: item.l.replace(/\s+/g, '_') + ".pdf", size: "210 KB", type: "Dokument" }];
      const next = [...prev, pool[prev.length % pool.length]];
      const min = item.min || 1;
      if (next.length >= min && !doneRef.current) {
        doneRef.current = true;
        setCompleting(true);
        setTimeout(() => onDone(next.length + " dokumenter uploadet"), 900);
      }
      return next;
    });
  };

  const uploadDescs = {
    loans: "Træk PDF'er ind med jeres nuværende låneaftaler. Vi har brug for at se renter, hovedstol, afdragsprofil og evt. covenants.",
    security: "Pantebreve, kautionserklæringer og andre dokumenter som beskriver sikkerhederne i sagen.",
    pitchdeck: "Upload jeres pitch deck - en præsentation af virksomheden, forretningsmodellen og vækstplanen.",
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ marginBottom: 14 }}><I.ArrowLeft className="ic"/> {t('Tilbage til oversigten')}</button>

      <div style={{ fontSize: 11, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{t('UPLOAD')}</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: '6px 0 6px' }}>{t(item.l)}</h1>
      {uploadDescs[item.id] && (
        <p style={{ fontSize: 14, color: 'var(--c-text-2)', lineHeight: 1.55, marginBottom: 22 }}>{t(uploadDescs[item.id])}</p>
      )}

      {completing ? (
        <div style={{ textAlign: 'center', padding: '36px 0' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--c-success-bg)', color: 'var(--c-success)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
            <I.Check size={24}/>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Uploadet!')}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t('Går tilbage til oversigten...')}</div>
        </div>
      ) : (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); handleDrop(); }}
            onClick={handleDrop}
            style={{
              border: '2px dashed ' + (drag ? 'var(--c-primary)' : 'var(--c-line-strong)'),
              background: drag ? 'rgba(29,6,216,0.06)' : '#fff',
              borderRadius: 14, padding: '42px 24px',
              textAlign: 'center', cursor: 'pointer',
              transition: 'all 150ms',
            }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--c-surface-2)', margin: '0 auto 14px', display: 'grid', placeItems: 'center', color: 'var(--c-text-2)' }}>
              <I.Upload size={22}/>
            </div>
            <div style={{ fontSize: 15.5, fontWeight: 500, color: 'var(--c-ink)' }}>{t('Træk filer hertil - eller klik for at vælge')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginTop: 6 }}>{t('PDF, Excel, Word, billeder · max 50 MB pr. fil')}</div>
          </div>

          {files.length > 0 && (
            <div style={{ marginTop: 18, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, overflow: 'hidden' }}>
              {files.map((f, i) => (
                <div key={i} style={{ padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="doc-ic" style={{ width: 30, height: 36 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{t(f.type)} · {f.size}</div>
                  </div>
                  <span style={{ color: 'var(--c-success)', fontSize: 11.5, display: 'inline-flex', gap: 5, alignItems: 'center' }}><I.Check size={12}/> {t('Uploadet')}</span>
                </div>
              ))}
              {item.min > 1 && files.length < item.min && (
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--c-line-2)', fontSize: 12, color: 'var(--c-text-3)' }}>
                  {t('Tilføj')} {item.min - files.length} {t('fil mere for at fortsætte')}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-ghost" onClick={onSkip}><I.X className="ic"/> {t('Ikke relevant - spring over')}</button>
          </div>
        </>
      )}
    </div>
  );
}

function PortalConnect({ item, onBack, onDone }) {
  const [connectingId, setConnectingId] = React.useState(null);
  const [connectedId, setConnectedId] = React.useState(null);
  const [showOauth, setShowOauth] = React.useState(null); // source being oauth'd
  const [oauthStep, setOauthStep] = React.useState(0); // 0=creds, 1=loading, 2=done
  const [uploadedFile, setUploadedFile] = React.useState(null);
  const [drag, setDrag] = React.useState(false);
  const [pendingConnect, setPendingConnect] = React.useState(null); // source awaiting agreement

  const sources = [
    { id: "ec", name: "e-conomic" },
    { id: "bi", name: "Billy" },
    { id: "di", name: "Dinero" },
    { id: "md", name: "Microsoft Dynamics" },
    { id: "xe", name: "Xena" },
  ];

  const startConnect = (s) => {
    setShowOauth(s);
    setOauthStep(0);
  };

  const doConnect = () => {
    const srcName = showOauth.name;
    setOauthStep(1);
    setTimeout(() => {
      setOauthStep(2);
      setTimeout(() => {
        onDone("Periodetal hentet automatisk fra " + srcName);
      }, 1100);
    }, 1400);
  };

  const handleDrop = () => {
    setDrag(false);
    const f = { name: "Råbalance_Q1_2026.xlsx", size: "84 KB" };
    setUploadedFile(f);
    setTimeout(() => onDone("Råbalance uploadet manuelt · " + f.name), 800);
  };

  if (pendingConnect) {
    return <PortalAgreement onBack={() => setPendingConnect(null)} onNext={() => { startConnect(pendingConnect); setPendingConnect(null); }}/>;
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ marginBottom: 14 }}><I.ArrowLeft className="ic"/> {t('Tilbage')}</button>
      <div style={{ fontSize: 11, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{t('FORBIND DATA')}</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: '6px 0 6px' }}>{t(item.l)}</h1>
      <p style={{ fontSize: 14, color: 'var(--c-text-2)', lineHeight: 1.55, marginBottom: 18 }}>
        {t('Forbind jeres bogføringssystem direkte, eller upload en råbalance manuelt.')}
      </p>

      {/* ERP list */}
      <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, overflow: 'hidden' }}>
        {sources.map((s, i) => (
          <div key={s.id} style={{ padding: '14px 18px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: connectedId === s.id ? 'var(--c-success-bg)' : 'var(--c-surface-2)', border: '1px solid ' + (connectedId === s.id ? 'var(--c-success)' : 'var(--c-line)'), display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 11, color: connectedId === s.id ? 'var(--c-success)' : 'var(--c-text-2)', flexShrink: 0 }}>
              {connectedId === s.id ? <I.Check size={16}/> : s.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
            </div>
            {connectedId === s.id
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--c-success)', fontSize: 12.5, fontWeight: 500 }}><I.Check size={13}/> {t('Forbundet')}</span>
              : connectedId
              ? null
              : <button className="btn btn-sm" onClick={() => setPendingConnect(s)}>{t('Forbind')}</button>}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--c-line-2)' }}/>
        <span style={{ fontSize: 12, color: 'var(--c-text-3)', fontWeight: 500 }}>{t('eller')}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--c-line-2)' }}/>
      </div>

      {/* Manual upload */}
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 8 }}>{t('Upload råbalance manuelt')}</div>
      {uploadedFile ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid var(--c-line)', borderRadius: 10 }}>
          <div className="doc-ic" style={{ width: 28, height: 34 }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{uploadedFile.name}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{uploadedFile.size}</div>
          </div>
          <span style={{ color: 'var(--c-success)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}><I.Check size={12}/> {t('Uploadet')}</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setUploadedFile(null)}><I.X className="ic"/></button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); handleDrop(); }}
          onClick={handleDrop}
          style={{ border: '2px dashed ' + (drag ? 'var(--c-primary)' : 'var(--c-line-strong)'), background: drag ? 'rgba(59,130,246,0.04)' : '#fff', borderRadius: 10, padding: '22px 18px', textAlign: 'center', cursor: 'pointer', transition: 'all 150ms' }}>
          <I.Upload size={18} style={{ color: 'var(--c-text-3)', marginBottom: 6 }}/>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)' }}>{t('Træk råbalance hertil - eller klik')}</div>
          <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 4 }}>{t('Excel eller CSV · eksportér fra jeres bogføringssystem')}</div>
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 10, fontSize: 12, color: 'var(--c-text-2)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <I.Lock size={13} style={{ marginTop: 1, color: 'var(--c-text-3)', flexShrink: 0 }}/>
        <div>{t('Kreditafdelingen ser kun de felter de har brug for.')}</div>
      </div>

      {/* OAuth modal */}
      {showOauth && (
        <div className="scrim" onClick={() => oauthStep === 0 && setShowOauth(null)}>
          <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{t('Forbind')} {showOauth.name}</div>
              {oauthStep === 0 && <button className="icon-btn" onClick={() => setShowOauth(null)}><I.X size={16}/></button>}
            </div>
            <div className="modal-body">
              {oauthStep === 0 && (
                <OauthForm onConnect={doConnect} onCancel={() => setShowOauth(null)} srcName={showOauth.name}/>
              )}
              {oauthStep === 1 && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--c-line-2)', borderTopColor: 'var(--c-primary)', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }}/>
                  <div style={{ fontSize: 14, color: 'var(--c-text-2)' }}>{t('Forbinder til')} {showOauth.name}...</div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              {oauthStep === 2 && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--c-success-bg)', color: 'var(--c-success)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                    <I.Check size={22}/>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Forbundet!')}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t('Periodetal hentes nu automatisk.')}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OauthForm({ onConnect, onCancel, srcName }) {
  const [consentType, setConsentType] = React.useState("unlimited");
  const defaultDate = (() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const [expiryDate, setExpiryDate] = React.useState(defaultDate);

  return (
    <div className="vstack" style={{ gap: 14 }}>
      <div style={{ padding: '11px 14px', background: 'var(--c-surface-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--c-text-2)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <I.Lock size={13} style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
        <div>{t('Vi beder kun om')} <b>{t('læseadgang')}</b> {t('til kontoplan og periodetal - aldrig skriveadgang.')}</div>
      </div>

      <div className="field">
        <label>{t('Brugernavn / Email')}</label>
        <input className="input" defaultValue="anders@nordhavn-composite.dk"/>
      </div>
      <div className="field">
        <label>{t('Adgangskode')}</label>
        <input className="input" type="password" defaultValue="••••••••"/>
      </div>

      <div>
        <div className="label-mini" style={{ marginBottom: 8 }}>{t('Samtykkets varighed')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { v: "unlimited", l: "Ubegrænset", desc: "Kreditafdelingen kan hente data løbende - kan trækkes tilbage til enhver tid" },
            { v: "expiry",    l: "Engangsadgang t.o.m. en dato", desc: null },
          ].map(o => (
            <label key={o.v} onClick={() => setConsentType(o.v)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', border: '1px solid ' + (consentType === o.v ? 'var(--c-primary)' : 'var(--c-line)'), borderRadius: 8, cursor: 'pointer', background: consentType === o.v ? 'rgba(59,130,246,0.04)' : '#fff' }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid ' + (consentType === o.v ? 'var(--c-primary)' : 'var(--c-line-strong)'), display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
                {consentType === o.v && <span style={{ width: 8, height: 8, background: 'var(--c-primary)', borderRadius: '50%' }}/>}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t(o.l)}
                  {o.v === 'unlimited' && <span className="tag" style={{ fontSize: 10, background: 'var(--c-primary)', color: '#fff', border: 'none' }}>{t('Anbefalet')}</span>}
                </div>
                {o.v === 'expiry' && consentType === 'expiry' ? (
                  <div style={{ marginTop: 8 }}>
                    <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="input mono" style={{ width: 160, fontSize: 13 }}/>
                  </div>
                ) : o.desc ? (
                  <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>{t(o.desc)}</div>
                ) : null}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="modal-foot" style={{ margin: '4px -22px -22px', padding: '12px 22px', borderTop: '1px solid var(--c-line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>{t('Annullér')}</button>
        <button className="btn btn-primary" onClick={onConnect} style={{ background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>
          {t('Log ind og forbind')} <I.ArrowRight className="ic"/>
        </button>
      </div>
    </div>
  );
}

function PortalPep({ item, onBack, onDone }) {
  const [step, setStep] = React.useState(1);
  const [pep, setPep] = React.useState("no");
  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ marginBottom: 14 }}><I.ArrowLeft className="ic"/> {t('Tilbage')}</button>
      <div style={{ fontSize: 11, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{t('ERKLÆRING · MITID')}</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: '6px 0 18px' }}>{t(item.l)}</h1>

      <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, padding: 22 }}>
        {step === 1 && (
          <>
            <div style={{ fontSize: 14, color: 'var(--c-text)', lineHeight: 1.6 }}>
              {t('Er du')} <b>{t('politisk eksponeret person (PEP)')}</b>{t(', eller står du i nær familie- eller forretningsforbindelse til en sådan?')}
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { v: "no", l: "Nej - hverken jeg eller mine nærtstående er PEP" },
                { v: "self", l: "Ja - jeg er selv PEP" },
                { v: "rel", l: "Ja - en nærtstående er PEP" },
              ].map(o => (
                <label key={o.v} onClick={() => setPep(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid ' + (pep === o.v ? 'var(--c-primary)' : 'var(--c-line)'), borderRadius: 8, cursor: 'pointer', background: pep === o.v ? 'var(--c-surface-2)' : '#fff' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid ' + (pep === o.v ? 'var(--c-primary)' : 'var(--c-line-strong)'), display: 'grid', placeItems: 'center' }}>
                    {pep === o.v && <span style={{ width: 8, height: 8, background: 'var(--c-primary)', borderRadius: '50%' }}/>}
                  </span>
                  <span style={{ fontSize: 13.5 }}>{t(o.l)}</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 11.5, color: 'var(--c-text-3)' }}>
              <I.Help size={11} style={{ verticalAlign: -1, marginRight: 4 }}/>
              {t('Hvad er PEP? En person der varetager eller har varetaget en højtstående offentlig stilling.')}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="label-mini" style={{ marginBottom: 12 }}>{t('Bekræft og signér')}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--c-text)', padding: 14, background: 'var(--c-surface-2)', borderRadius: 8 }}>
              Jeg, <b>Anders Nielsen</b>, CFO i Nordhavn Composite A/S (CVR 38 42 71 56), erklærer hermed at hverken jeg eller mine nærtstående er PEP eller har nær tilknytning til en sådan.
            </div>
            <div style={{ marginTop: 18, padding: 16, border: '1.5px dashed var(--c-line-strong)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--c-primary)', color: '#fff', borderRadius: 8, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
                <I.Lock size={14}/> {t('Signér med MitID')}
              </div>
              <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--c-text-3)' }}>{t('Sikker signering · godkendt af digitaliserings­styrelsen')}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        {step === 1
          ? <button onClick={() => setStep(2)} className="btn btn-primary" style={{ background: 'var(--c-primary)', borderColor: 'var(--c-primary)', marginLeft: 'auto' }}>{t('Næste')} <I.ArrowRight className="ic"/></button>
          : <>
              <button onClick={() => setStep(1)} className="btn"><I.ChevronLeft className="ic"/> {t('Tilbage')}</button>
              <button onClick={() => onDone("Signeret 24. maj 2026 med MitID")} className="btn btn-primary" style={{ background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>{t('Signér og afslut')} <I.Check className="ic"/></button>
            </>}
      </div>
    </div>
  );
}

const ALL_COUNTRIES = [
  { c: "DK", n: "Danmark" }, { c: "SE", n: "Sverige" }, { c: "NO", n: "Norge" },
  { c: "FI", n: "Finland" }, { c: "DE", n: "Tyskland" }, { c: "NL", n: "Holland" },
  { c: "FR", n: "Frankrig" }, { c: "GB", n: "Storbritannien" }, { c: "US", n: "USA" },
  { c: "ES", n: "Spanien" }, { c: "IT", n: "Italien" }, { c: "PL", n: "Polen" },
  { c: "BE", n: "Belgien" }, { c: "AT", n: "Østrig" }, { c: "CH", n: "Schweiz" },
  { c: "PT", n: "Portugal" }, { c: "CZ", n: "Tjekkiet" }, { c: "HU", n: "Ungarn" },
  { c: "RO", n: "Rumænien" }, { c: "IE", n: "Irland" }, { c: "CA", n: "Canada" },
  { c: "AU", n: "Australien" }, { c: "JP", n: "Japan" }, { c: "CN", n: "Kina" },
  { c: "IN", n: "Indien" }, { c: "BR", n: "Brasilien" }, { c: "MX", n: "Mexico" },
  { c: "ZA", n: "Sydafrika" }, { c: "AE", n: "UAE" }, { c: "SG", n: "Singapore" },
  { c: "KR", n: "Sydkorea" }, { c: "TR", n: "Tyrkiet" }, { c: "SA", n: "Saudi-Arabien" },
  { c: "NZ", n: "New Zealand" }, { c: "GR", n: "Grækenland" }, { c: "SK", n: "Slovakiet" },
  { c: "HR", n: "Kroatien" }, { c: "RS", n: "Serbien" }, { c: "UA", n: "Ukraine" },
  { c: "EE", n: "Estland" }, { c: "LV", n: "Letland" }, { c: "LT", n: "Litauen" },
];

function PortalTrade({ item, onBack, onDone }) {
  const [selected, setSelected] = React.useState([{ c: "DK", n: "Danmark", v: "100" }]); // [{ c, n, v: "" }]
  const [q, setQ] = React.useState("");
  const [dropOpen, setDropOpen] = React.useState(false);
  const [hover, setHover] = React.useState(0);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selectedCodes = selected.map(x => x.c);
  const filtered = ALL_COUNTRIES.filter(c =>
    !selectedCodes.includes(c.c) &&
    (c.n.toLowerCase().includes(q.toLowerCase()) || c.c.toLowerCase().includes(q.toLowerCase()))
  ).slice(0, 8);

  const addCountry = (country) => {
    setSelected(prev => [...prev, { ...country, v: "" }]);
    setQ("");
    setDropOpen(false);
    setHover(0);
    inputRef.current && inputRef.current.focus();
  };

  const removeCountry = (code) => setSelected(prev => prev.filter(x => x.c !== code));

  const updateVal = (code, v) => {
    setSelected(prev => prev.map(x => x.c === code ? { ...x, v: v.replace(/[^0-9.,]/g, '') } : x));
  };

  const sum = selected.reduce((s, x) => s + (parseFloat(x.v.replace(',', '.')) || 0), 0);
  const sumOk = selected.length > 0 && Math.abs(sum - 100) < 0.5;
  const sumWarn = sum > 0 && !sumOk;

  const onKey = (e) => {
    if (!dropOpen || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHover(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHover(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[hover]) addCountry(filtered[hover]); }
    else if (e.key === 'Escape') { setDropOpen(false); }
  };

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ marginBottom: 14 }}><I.ArrowLeft className="ic"/> {t('Tilbage')}</button>
      <div style={{ fontSize: 11, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{t('SPØRGESKEMA')}</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: '6px 0 6px' }}>{t(item.l)}</h1>
      <p style={{ fontSize: 14, color: 'var(--c-text-2)', marginBottom: 18 }}>
        {t('Hvilke lande sælger I til i dag? Tilføj lande og angiv en omtrentlig andel af omsætningen. Summen skal være')} <b>100%</b>.
      </p>

      {/* Country search dropdown */}
      <div ref={wrapRef} style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 40, border: '1px solid ' + (dropOpen ? 'var(--c-primary)' : 'var(--c-line)'), borderRadius: 8, background: '#fff', cursor: 'text' }}
          onClick={() => { inputRef.current && inputRef.current.focus(); setDropOpen(true); }}>
          <I.Search size={13} style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setDropOpen(true); setHover(0); }}
            onFocus={() => setDropOpen(true)}
            onKeyDown={onKey}
            placeholder={t('Tilføj et land...')}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, background: 'transparent', color: 'var(--c-ink)' }}
          />
        </div>
        {dropOpen && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden' }}>
            {filtered.map((c, i) => (
              <button key={c.c}
                onMouseEnter={() => setHover(i)}
                onMouseDown={(e) => { e.preventDefault(); addCountry(c); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', border: 'none', borderBottom: i < filtered.length - 1 ? '1px solid var(--c-line-2)' : 'none', background: hover === i ? 'var(--c-surface-2)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 26, height: 18, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', borderRadius: 3, display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 600, color: 'var(--c-text-2)', flexShrink: 0 }}>{c.c}</div>
                <span style={{ fontSize: 13.5, color: 'var(--c-ink)' }}>{c.n}</span>
              </button>
            ))}
          </div>
        )}
        {dropOpen && filtered.length === 0 && q.trim() !== "" && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: '12px 14px', fontSize: 13, color: 'var(--c-text-3)' }}>
            {t('Ingen lande matcher')} "{q}"
          </div>
        )}
      </div>

      {/* Selected countries list */}
      {selected.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          {selected.map((x, i) => (
            <div key={x.c} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none' }}>
              <div style={{ width: 28, height: 20, background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', borderRadius: 3, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 600, color: 'var(--c-text-2)', flexShrink: 0 }}>{x.c}</div>
              <div style={{ flex: 1, fontSize: 13.5, color: 'var(--c-ink)', fontWeight: 500 }}>{x.n}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="text"
                  value={x.v}
                  onChange={e => updateVal(x.c, e.target.value)}
                  placeholder="0"
                  className="mono"
                  style={{ width: 60, padding: '5px 8px', border: '1px solid var(--c-line)', borderRadius: 5, fontSize: 13, textAlign: 'right' }}
                />
                <span className="mono" style={{ fontSize: 12, color: 'var(--c-text-3)', width: 14 }}>%</span>
              </div>
              <button onClick={() => removeCountry(x.c)} style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--c-text-3)' }}>
                <I.X size={13}/>
              </button>
            </div>
          ))}

          {/* Sum row */}
          <div style={{ padding: '11px 14px', borderTop: '1px solid var(--c-line)', background: sumOk ? 'var(--c-success-bg)' : sumWarn ? 'var(--c-warn-bg)' : 'var(--c-surface-2)', display: 'flex', alignItems: 'center', gap: 12 }}>
            {sumOk ? <I.Check size={15} style={{ color: 'var(--c-success)' }}/>
              : sumWarn ? <I.AlertCircle size={15} style={{ color: 'var(--c-warn)' }}/>
              : <I.Circle size={15} style={{ color: 'var(--c-text-3)' }}/>}
            <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: sumOk ? 'var(--c-success)' : sumWarn ? 'var(--c-warn)' : 'var(--c-text-2)' }}>
              {sumOk ? t("Summen passer · 100%") : sumWarn ? (sum < 100 ? t('Mangler') + ' ' + (100 - sum).toFixed(1) + ' ' + t('procentpoint') : (sum - 100).toFixed(1) + ' ' + t('procentpoint for meget')) : t("Angiv andele for hvert land")}
            </div>
            <div className="mono num" style={{ fontSize: 15, fontWeight: 600, color: sumOk ? 'var(--c-success)' : sumWarn ? 'var(--c-warn)' : 'var(--c-text-3)', marginRight: 38 }}>
              {sum.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {selected.length === 0 && (
        <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--c-text-3)', fontSize: 13 }}>
          {t('Søg og tilføj lande ovenfor')}
        </div>
      )}

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={() => onDone(selected.length + " lande angivet")}
          disabled={!sumOk}
          className="btn btn-primary"
          style={sumOk ? { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' } : { opacity: 0.5, cursor: 'not-allowed' }}>
          {t('Færdig')} <I.Check className="ic"/>
        </button>
      </div>
    </div>
  );
}

// Followup question - customer answers Mette's question inline
function PortalFollowup({ onBack, onSubmit }) {
  const [answer, setAnswer] = React.useState("");
  const [files, setFiles] = React.useState([]);
  const canSubmit = answer.trim().length > 10;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <button onClick={onBack} className="btn btn-sm btn-ghost" style={{ marginBottom: 14 }}><I.ArrowLeft className="ic"/> {t('Tilbage')}</button>
      <div style={{ fontSize: 11, color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{t('OPFØLGENDE SPØRGSMÅL · FRA METTE')}</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: '6px 0 18px' }}>{t('Stigning i juli-budgettet')}</h1>

      {/* Question card */}
      <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>ML</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Mette Larsen <span className="muted" style={{ fontWeight: 400 }}>· {t('Kreditafdeling')}</span></div>
            <div style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>{t('i dag')}, 09:14</div>
          </div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--c-text)', lineHeight: 1.6 }}>
          Hej Anders, tak for budgettet. Jeg ser at I har en stigning fra <b className="mono">2,0M</b> i juni til <b className="mono">2,5M</b> i juli - en stigning på <b>25,0%</b> som ikke følger jeres normale sæsonmønster. Kan I bekræfte hvad der ligger bag? Er det Block-Island leverancen til GE Vernova der slår igennem her?
        </div>
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--c-surface-2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--c-text-2)' }}>
          <I.File size={12}/> {t('Refererer til')} <b style={{ color: 'var(--c-ink)' }}>Budget_2026-28_v3.xlsx</b> · {t('linje')} 197
        </div>
      </div>

      {/* Answer area */}
      <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, padding: 20 }}>
        <div className="label-mini" style={{ marginBottom: 8 }}>{t('Dit svar')}</div>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          rows={5}
          placeholder={t('Skriv her - du kan også vedhæfte et dokument hvis det hjælper...')}
          style={{ width: '100%', padding: 12, border: '1px solid var(--c-line)', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.55, color: 'var(--c-text)' }}
        />

        {/* Quick-fill suggestions */}
        {answer.length === 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="label-mini" style={{ marginBottom: 6, fontSize: 10.5 }}>{t('Forslag til svar')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                "Ja, korrekt - Block-Island leverancen til GE Vernova faktureres i juli 2026. Ordreværdi DKK 5,2M.",
                "Det er rigtigt observeret - det er Block-Island ordren. Vi vedhæfter ordrebekræftelsen.",
              ].map((s, i) => (
                <button key={i} onClick={() => setAnswer(s)}
                  style={{ textAlign: 'left', padding: '8px 10px', border: '1px solid var(--c-line)', background: 'var(--c-surface-2)', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--c-text-2)' }}>
                  <I.Spark size={10} style={{ verticalAlign: -1, marginRight: 5, color: 'var(--c-text-3)' }}/>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attach file */}
        <div style={{ marginTop: 14, padding: '10px 12px', border: '1px dashed var(--c-line-strong)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--c-text-2)', cursor: 'pointer' }}
          onClick={() => setFiles([{ name: "Ordrebekraeftelse_GE_Vernova_Block-Island.pdf", size: "284 KB" }])}>
          <I.Upload size={14}/> {files.length === 0 ? t("Vedhæft dokument (valgfri)") : t("Tilføj flere")}
        </div>
        {files.map((f, i) => (
          <div key={i} style={{ marginTop: 8, padding: '8px 12px', background: 'var(--c-surface-2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
            <div className="doc-ic" style={{ width: 22, height: 28 }}/>
            <span style={{ flex: 1, fontWeight: 500 }}>{f.name}</span>
            <span className="muted">{f.size}</span>
            <button onClick={() => setFiles([])} className="btn btn-sm btn-ghost"><I.X className="ic"/></button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 11.5, color: 'var(--c-text-3)' }}>
          <I.Lock size={11} style={{ verticalAlign: -1, marginRight: 4 }}/> {t('Kun Mette og hendes team ser dit svar')}
        </div>
        <button onClick={onSubmit} disabled={!canSubmit} className="btn btn-primary" style={canSubmit ? { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' } : { opacity: 0.5, cursor: 'not-allowed' }}>
          {t('Send svar')} <I.Send className="ic"/>
        </button>
      </div>
    </div>
  );
}

function PortalDone({ onBack, onStatus }) {
  return (
    <div style={{ maxWidth: 560, margin: '60px auto 0', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', margin: '0 auto 18px', display: 'grid', placeItems: 'center' }}>
        <I.Check size={28}/>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--c-ink)', margin: '0 0 8px' }}>{t('Tak')}, Anders.</h1>
      <p style={{ fontSize: 15, color: 'var(--c-text-2)', lineHeight: 1.55, marginBottom: 22 }}>
        {t('Materialet er indsendt til kreditafdelingen. Mette får besked nu og vender tilbage senest')} <b style={{ color: 'var(--c-ink)' }}>29. maj</b>.
      </p>

<div style={{ fontSize: 12.5, color: 'var(--c-text-3)' }}>{t('I modtager en kvittering på')} <b style={{ color: 'var(--c-ink)' }}>an@nordhavn-composite.dk</b></div>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 8 }}>
        <button onClick={onBack} className="btn btn-ghost">{t('Se oversigt igen')}</button>
        <button onClick={onStatus} className="btn btn-primary" style={{ background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>
          {t('Se status på ansøgningen')} <I.ArrowRight className="ic"/>
        </button>
      </div>
    </div>
  );
}

function DelegateBundleModal({ items, preselect, onClose, onSend }) {
  const eligible = items.filter(x => x.st === 'open' || x.st === 'accountant');
  const [selected, setSelected] = React.useState(
    preselect ? [preselect] : eligible.filter(x => x.st === 'open').map(x => x.id)
  );
  const PRESETS = {
    accountant: { name: "Jan Holmgaard", email: "jan@revisor-nordkysten.dk", greeting: "Jan" },
    bank: { name: "Henrik Skov", email: "henrik.skov@nordeabank.dk", greeting: "Henrik" },
  };
  const [helperKind, setHelperKind] = React.useState('accountant');
  const [name, setName] = React.useState(PRESETS.accountant.name);
  const [email, setEmail] = React.useState(PRESETS.accountant.email);
  const buildMsg = (greeting) => "Hej " + greeting + ",\n\nKan du sende nedenstående dokumentation direkte til kreditafdelingen via det vedhæftede link? Det er en del af vores ansøgning om kreditfacilitet.\n\nMvh Anders";
  const [msg, setMsg] = React.useState(buildMsg(PRESETS.accountant.greeting));
  const [touched, setTouched] = React.useState({ name: false, email: false, msg: false });

  const switchKind = (kind) => {
    setHelperKind(kind);
    const p = PRESETS[kind];
    if (!touched.name) setName(p.name);
    if (!touched.email) setEmail(p.email);
    if (!touched.msg) setMsg(buildMsg(p.greeting));
  };

  const label = helperKind === 'bank' ? t('banken') : t('revisoren');
  const labelCap = helperKind === 'bank' ? t('Banken') : t('Revisoren');
  const sendLabel = helperKind === 'bank' ? t('Send til bank') : t('Send til revisor');

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const allChecked = eligible.length > 0 && eligible.every(x => selected.includes(x.id));
  const toggleAll = () => setSelected(allChecked ? [] : eligible.map(x => x.id));

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{t('Anmod bank eller revisor om hjælp')}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{labelCap} {t('får ét samlet link til de valgte punkter')}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.X size={16}/></button>
        </div>
        <div className="modal-body">
          <div className="label-mini" style={{ marginBottom: 6 }}>{t('Hvem skal hjælpe?')}</div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid var(--c-line)', borderRadius: 8, padding: 3, background: 'var(--c-surface-2)' }}>
            {[{ k: 'accountant', l: 'Revisor', ic: <I.User size={13}/> }, { k: 'bank', l: 'Bank', ic: <I.Lock size={13}/> }].map(opt => (
              <button key={opt.k} onClick={() => switchKind(opt.k)}
                style={{
                  flex: 1, padding: '8px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: helperKind === opt.k ? '#fff' : 'transparent',
                  color: helperKind === opt.k ? 'var(--c-ink)' : 'var(--c-text-2)',
                  boxShadow: helperKind === opt.k ? 'var(--shadow-sm)' : 'none'
                }}>
                {opt.ic} {t(opt.l)}
              </button>
            ))}
          </div>
          <div className="label-mini" style={{ marginBottom: 6 }}>{t('Vælg punkter')} {label} {t('skal hjælpe med')}</div>
          <div style={{ border: '1px solid var(--c-line)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            {eligible.length === 0 && (
              <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--c-text-3)' }}>{t('Ingen åbne punkter at delegere')}</div>
            )}
            {eligible.length > 1 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-line)' }}
                onClick={toggleAll}>
                <input type="checkbox" checked={allChecked} readOnly style={{ width: 15, height: 15 }}/>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-text-2)' }}>{t('Vælg alle')}</span>
              </label>
            )}
            {eligible.map((x, i) => (
              <label key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i > 0 || eligible.length > 1 ? '1px solid var(--c-line-2)' : 'none', cursor: 'pointer', background: selected.includes(x.id) ? 'rgba(59,130,246,0.04)' : '#fff' }}
                onClick={() => toggle(x.id)}>
                <input type="checkbox" checked={selected.includes(x.id)} readOnly style={{ width: 15, height: 15 }}/>
                <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)' }}>{t(x.l)}</div>
                {x.st === 'accountant' && <span className="tag" style={{ fontSize: 10, background: 'var(--c-warn-bg)', color: 'var(--c-warn)', border: 'none' }}>{t('Afventer allerede')}</span>}
              </label>
            ))}
          </div>

          <div className="vstack" style={{ gap: 12 }}>
            <div className="grid g-2" style={{ gap: 10 }}>
              <div className="field">
                <label>{t('Navn')}</label>
                <input className="input" value={name} onChange={e => { setName(e.target.value); setTouched(t => ({ ...t, name: true })); }}/>
              </div>
              <div className="field">
                <label>{t('Email')}</label>
                <input className="input" value={email} onChange={e => { setEmail(e.target.value); setTouched(t => ({ ...t, email: true })); }}/>
              </div>
            </div>
            <div className="field">
              <label>{t('Besked til')} {label}</label>
              <textarea className="input" rows={4} value={msg} onChange={e => { setMsg(e.target.value); setTouched(t => ({ ...t, msg: true })); }} style={{ height: 'auto', padding: 10, resize: 'vertical' }}/>
            </div>
            <div style={{ background: 'var(--c-surface-2)', padding: '10px 14px', borderRadius: 8 }}>
              <div className="label-mini" style={{ marginBottom: 3 }}>{labelCap} {t('modtager ét samlet link')}</div>
              <div className="mono" style={{ fontSize: 12.5, color: 'var(--c-text)' }}>crediwire.app/r/nh-{helperKind === 'bank' ? 'bank' : 'rev'}-4Kp2</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{t('Giver kun adgang til de')} {selected.length} {t('valgte punkter · udløber om 14 dage')}</div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <I.Lock size={11}/> {labelCap} {t('ser kun de valgte punkter, ikke resten af ansøgningen.')}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1 }}/>
          <button className="btn btn-ghost" onClick={onClose}>{t('Annullér')}</button>
          <button className="btn btn-primary" disabled={selected.length === 0} onClick={() => onSend(selected, { name, email }, helperKind)}
            style={selected.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
            <I.Send className="ic"/> {sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

window.NewCaseModal = NewCaseModal;
window.CustomerPortal = CustomerPortal;
