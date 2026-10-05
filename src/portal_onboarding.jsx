/* ─────────────────────────────────────────────────────────────────────────────
   Kundens opstart i portalen, bygget efter dagens indsamlingsflow
   (Indsamlingsflow_i_dag): opret bruger eller log ind, vilkår, virksomhed,
   aftalen med EIFO (ja til at dele data), datadeling (løbende eller til og med
   en dato) og regnskabssystem. Derefter velkomsten og materialet som før.

   Tilstanden ligger i CW.onboarding() (case_state.js) og er kundens. I
   forhåndsvisningen (rådgiverens "Kundeside") kan skærmene ses og gennemgås,
   men intet gemmes: knapper og felter, der ville handle for kunden, er mærket
   data-cust-act, og portalen stopper klikket og viser en note (PortalPvNote).
   CW's egne funktioner afviser også kundehandlinger i forhåndsvisningen.

   Bruger hjælpere fra new_case_portal.jsx (ncFill, PORTAL_CONTACT, portalRecipient,
   ERP_SOURCES, portalPeriod, portalConsentNow, portalConnectNow m.fl.).
   ──────────────────────────────────────────────────────────────────────────── */

// Rækkefølgen i trinlisten. 'material' er velkomsten og oversigten.
const OB_ORDER = ['account', 'terms', 'company', 'agreement', 'access', 'erp', 'material'];
function obLabel(k) {
  switch (k) {
    case 'account': return t('Bruger');
    case 'terms': return t('Vilkår');
    case 'company': return t('Virksomhed');
    case 'agreement': return t('Aftale med EIFO');
    case 'access': return t('Datadeling');
    case 'erp': return t('Regnskabssystem');
    default: return t('Materiale');
  }
}
// Er trinnet gjort af kunden? (afgøres af kundens rigtige tilstand, også i forhåndsvisningen)
function obDone(ob, k) {
  if (k === 'account') return !!ob.account;
  if (k === 'terms') return !!ob.terms;
  if (k === 'company') return !!ob.company;
  if (k === 'agreement') return !!ob.agreement;
  if (k === 'access') return !!ob.sharing;
  if (k === 'erp') return !!ob.erp;
  return false;
}

// Demo: adgangskoden gemmes aldrig, kun et kort fingeraftryk, så "Log ind" kan
// sige nej til en forkert kode. Ikke sikkerhed, kun demo.
function obPwHash(pw) {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) >>> 0;
  return 'd' + h.toString(16);
}
// Samme regler som i dag: mindst 8 tegn med et tal, et lille og et stort bogstav
function obPwProblems(pw) {
  const p = [];
  if (pw.length < 8) p.push('len');
  if (!/[0-9]/.test(pw)) p.push('num');
  if (!/[a-zæøå]/.test(pw)) p.push('lower');
  if (!/[A-ZÆØÅ]/.test(pw)) p.push('upper');
  return p;
}
const OB_DEMO_PW = 'Nordhavn2026';

// Seneste afsluttede måned som 'yyyy-mm' og som sidste dag 'yyyy-mm-dd'
function obLastMonth() {
  const d = new Date();
  let y = d.getFullYear(), m = d.getMonth(); // getMonth er 0-baseret, så m er forrige måned 1-baseret
  if (m === 0) { m = 12; y--; }
  return y + '-' + String(m).padStart(2, '0');
}
function obMonthEnd(ym) {
  const [y, m] = String(ym).split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return y + '-' + String(m).padStart(2, '0') + '-' + String(last).padStart(2, '0');
}
const obFmt = (ymd) => ymd ? CW.fmtDate(ymd + 'T12:00:00') : '';

// Kort tekst om kundens valg af datadeling (bruges i portalen og i forhåndsvisningen)
function obSharingText(sharing) {
  if (!sharing) return '';
  return sharing.mode === 'ongoing' ? t('løbende deling') : ncFill(t('tal til og med {date}'), { date: obFmt(sharing.dataUntil) });
}

/* ── Trinlisten til venstre (som i dag). På smalle skærme: "Trin 3 af 6 · Virksomhed" ── */

function ObStepper({ current, ob, onJump }) {
  const steps = OB_ORDER;
  const idx = steps.indexOf(current);
  return (
    <nav className="cwp-ob-steps" aria-label={t('Trin i opstarten')}>
      <div className="cwp-ob-steps-sm">
        {ncFill(t('Trin {n} af {m}'), { n: Math.min(idx + 1, steps.length), m: steps.length })} · {obLabel(current)}
      </div>
      <ol>
        {steps.map((k, i) => {
          const done = obDone(ob, k);
          const active = k === current;
          const label = obLabel(k);
          const inner = (
            <>
              <span className={'cwp-ob-dot' + (done ? ' done' : active ? ' active' : '')} aria-hidden="true">{done ? <I.Check size={9}/> : null}</span>
              <span className="cwp-ob-lbl">{label}</span>
              <span style={ncHidden}>{done ? ': ' + t('færdig') : active ? ': ' + t('du er her') : ''}</span>
            </>
          );
          return (
            <li key={k} aria-current={active ? 'step' : undefined} className={active ? 'active' : ''}>
              {onJump
                ? <button type="button" className="cwp-ob-jump" onClick={() => onJump(k)}>{inner}</button>
                : <div className="cwp-ob-jump static">{inner}</div>}
              {i < steps.length - 1 && <span className="cwp-ob-line" aria-hidden="true"/>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Rammen om et trin: trinliste til venstre og kortet til højre
function ObFrame({ step, ob, onJump, children, footer }) {
  // Opret bruger leverer selv sit kort (en formular); de andre trin får kortet her
  const bare = step === 'account';
  return (
    <div className="cwp-ob">
      <ObStepper current={step} ob={ob} onJump={onJump}/>
      <div className="cwp-ob-main">
        {bare ? children : <div className="cwp-ob-card">{children}</div>}
        {footer}
      </div>
    </div>
  );
}

function ObTitle({ children, lead }) {
  return (
    <>
      <h1 className="cwp-ob-h">{children}</h1>
      {lead && <p className="cwp-ob-lead">{lead}</p>}
    </>
  );
}

function ObButtons({ onBack, children }) {
  return (
    <div className="cwp-ob-btns">
      {onBack ? <button type="button" className="btn" onClick={onBack}>{t('Tilbage')}</button> : <span/>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{children}</div>
    </div>
  );
}

const obPrimary = { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' };
const obErrStyle = { fontSize: 12.5, color: 'var(--c-danger)', marginTop: 4 };

/* ── Bruger: opret eller log ind ─────────────────────────────────────────── */

function PortalAuth({ mode, setMode, preview, onAuthed }) {
  preview = preview || CW.isPreview();
  const ob = CW.onboarding();
  const rcp = portalRecipient();
  const [email, setEmail] = React.useState(() => (ob.account && ob.account.email) || rcp.email || '');
  const [pw, setPw] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [remember, setRemember] = React.useState(false); // fra som standard: en delt pc skal ikke huskes uden et aktivt valg
  const [tried, setTried] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [forgot, setForgot] = React.useState(false);
  const signup = mode === 'signup';
  const probs = obPwProblems(pw);
  const emailOk = NC_EMAIL_RE.test(email.trim());

  React.useEffect(() => { setTried(false); setErr(''); setForgot(false); }, [mode]);

  const submit = (e) => {
    if (e) e.preventDefault();
    if (preview) return; // fanges også af data-cust-act
    setTried(true); setErr('');
    if (!emailOk) { CW.focusSoon('#cwp-auth-mail'); return; }
    if (signup) {
      if (ob.account) {
        // En bruger findes allerede for virksomheden (demoen har én). Den må ikke overskrives.
        setErr(ncFill(t('Der er allerede en bruger til {company}. Log ind, eller skriv til {adv}.'), { company: DATA.COMPANY.name, adv: PORTAL_CONTACT.first })
          + ' ' + t('Er du revisor eller bogholder, så bed virksomheden sende dig et link med "Få hjælp fra revisor eller bank".'));
        return;
      }
      if (probs.length) { CW.focusSoon('#cwp-auth-pw1'); return; }
      if (CW.setOnboarding({ account: { email: email.trim(), pw: obPwHash(pw), at: new Date().toISOString() } },
        ncFill(t('Kunden oprettede en bruger ({email})'), { email: email.trim() })) === false) return;
      onAuthed(false);
      return;
    }
    const acc = ob.account;
    if (!acc || acc.email.toLowerCase() !== email.trim().toLowerCase() || acc.pw !== obPwHash(pw)) {
      setErr(t('Mail eller adgangskode passer ikke.'));
      CW.focusSoon('#cwp-auth-pw1');
      return;
    }
    CW.log('portal-login', t('Kunden loggede ind i portalen'), { who: 'kunde' });
    onAuthed(remember);
  };

  const mailErr = tried && !emailOk ? t('Skriv en gyldig mail.') : '';
  const pwErr = signup && tried && probs.length ? t('Adgangskoden opfylder ikke kravene nedenfor.') : '';
  const rule = (k, txt) => {
    const ok = !probs.includes(k);
    return <li key={k} style={{ color: pw && ok ? 'var(--c-text-2)' : 'var(--c-text-3)' }}>
      <span aria-hidden="true" style={{ display: 'inline-block', width: 14 }}>{pw && ok ? '✓' : '·'}</span>{txt}
      <span style={ncHidden}>{pw ? (ok ? ': ' + t('opfyldt') : ': ' + t('mangler')) : ''}</span>
    </li>;
  };

  const why = (
    <CWFold label={t('Hvorfor ligger siden på crediwire.app?')} id="cwp-auth-why" style={{ marginTop: 16 }}>
      <p style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.6, margin: 0 }}>
        {ncFill(t('EIFO bruger Crediwire til at indsamle materialet, derfor ligger siden på crediwire.app. Kun {adv} og hendes kolleger hos EIFO ser det, I sender.'), { adv: PORTAL_CONTACT.first })}{' '}
        {t('Det virker som HentSelv hos Skat: I giver selv adgang, og I kan trække den tilbage.')}
      </p>
    </CWFold>
  );
  const form = (
      <form onSubmit={submit} noValidate className="cwp-ob-card" style={signup ? undefined : { maxWidth: 440, margin: '0 auto' }}>
        <ObTitle lead={signup
          ? ncFill(t('{org} bruger Crediwire til at indsamle materialet til jeres ansøgning. Med en bruger kan I gemme undervejs og komme tilbage senere.'), { org: PORTAL_CONTACT.org })
          : t('Log ind for at fortsætte med materialet til EIFO.')}>
          {signup ? t('Opret jeres bruger') : t('Log ind')}
        </ObTitle>

        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="cwp-auth-mail">{t('Mail')}</label>
          <input id="cwp-auth-mail" className="input" type="email" autoComplete="username" value={email} readOnly={preview}
            onChange={e => { setEmail(e.target.value); setErr(''); }} aria-invalid={mailErr ? 'true' : undefined} aria-describedby={mailErr ? 'cwp-auth-mail-err' : undefined}/>
          {mailErr && <div id="cwp-auth-mail-err" role="alert" style={obErrStyle}>{mailErr}</div>}
        </div>

        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="cwp-auth-pw1">{t('Adgangskode')}</label>
          <div style={{ position: 'relative' }}>
            <input id="cwp-auth-pw1" className="input" type={show ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} value={pw} readOnly={preview}
              onChange={e => { setPw(e.target.value); setErr(''); }} style={{ paddingRight: 64 }}
              aria-invalid={pwErr || err ? 'true' : undefined} aria-describedby={[signup ? 'cwp-auth-rules' : '', pwErr ? 'cwp-auth-pw-err' : '', err ? 'cwp-auth-err' : ''].filter(Boolean).join(' ') || undefined}/>
            <button type="button" className="cwp-linkbtn" onClick={() => setShow(!show)} aria-pressed={show}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12.5 }}>{show ? t('Skjul') : t('Vis')}</button>
          </div>
          {pwErr && <div id="cwp-auth-pw-err" role="alert" style={obErrStyle}>{pwErr}</div>}
          {signup && (
            <ul id="cwp-auth-rules" style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, fontSize: 12.5, lineHeight: 1.6 }}>
              {rule('len', t('Mindst 8 tegn'))}
              {rule('num', t('Et tal'))}
              {rule('lower', t('Et lille bogstav'))}
              {rule('upper', t('Et stort bogstav'))}
            </ul>
          )}
        </div>

        {!signup && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '10px 0 4px' }}>
            <label data-cust-act="login" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5, cursor: 'pointer', minHeight: 24 }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/>
              {t('Husk mig i 30 dage')}
            </label>
            <button type="button" className="cwp-linkbtn" data-cust-act="reset" onClick={() => setForgot(true)} style={{ fontSize: 13 }}>{t('Glemt adgangskode?')}</button>
          </div>
        )}
        {forgot && (
          <p role="status" style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.55, margin: '8px 0 0' }}>
            {ncFill(t('Vi har sendt et link til {email}, så I kan vælge en ny adgangskode. Linket virker i 1 time.'), { email: portalMaskEmail(email.trim() || rcp.email) })}
            {' '}<span className="muted">{t('Demo: mailen sendes ikke.')}</span>
          </p>
        )}
        {err && <div id="cwp-auth-err" role="alert" style={Object.assign({}, obErrStyle, { fontSize: 13, marginTop: 10 })}>{err}{signup && ob.account ? <> <button type="button" className="cwp-linkbtn" onClick={() => setMode('login')}>{t('Log ind')}</button></> : null}</div>}

        <button type="submit" className="btn btn-primary btn-lg" data-cust-act={signup ? 'account' : 'login'} style={Object.assign({ width: '100%', justifyContent: 'center', marginTop: 16 }, obPrimary)}>
          {signup ? t('Opret bruger') : t('Log ind')}
        </button>
        <div style={{ marginTop: 14, fontSize: 13.5, color: 'var(--c-text-2)' }}>
          {signup ? t('Har I allerede en bruger?') : t('Ny bruger?')}{' '}
          <button type="button" className="cwp-linkbtn" onClick={() => setMode(signup ? 'login' : 'signup')}>{signup ? t('Log ind') : t('Opret en bruger')}</button>
        </div>
        {signup && why}
      </form>
  );
  if (signup) {
    return (
      <ObFrame step="account" ob={preview ? ob : {}} onJump={preview ? (k => setMode(k === 'account' ? 'signup' : k)) : null}>
        {form}
        <PortalContactLine style={{ marginTop: 14 }}/>
      </ObFrame>
    );
  }
  return (
    <div className="cwp-auth">
      {form}
      <div style={{ maxWidth: 440, margin: '14px auto 0' }}><PortalContactLine/></div>
    </div>
  );
}

/* ── Vilkår ───────────────────────────────────────────────────────────────── */

function ObTerms({ preview, onNext, footer, onJump }) {
  preview = preview || CW.isPreview();
  const ob = CW.onboarding();
  const [accepted, setAccepted] = React.useState(!!ob.terms);
  const [marketing, setMarketing] = React.useState(!!(ob.terms && ob.terms.marketing));
  const [tried, setTried] = React.useState(false);
  const doc = (name) => (e) => { e.preventDefault(); e.stopPropagation(); CW.notInDemo(name); };
  const next = () => {
    if (!accepted) { setTried(true); CW.focusSoon('#cwp-ob-terms'); return; }
    if (CW.setOnboarding({ terms: { at: new Date().toISOString(), marketing } }, marketing ? t('Kunden accepterede brugsvilkårene og sagde ja til nyheder fra Crediwire') : t('Kunden accepterede brugsvilkårene')) === false) return;
    onNext();
  };
  const err = tried && !accepted;
  return (
    <ObFrame step="terms" ob={ob} onJump={onJump} footer={footer}>
      <ObTitle lead={ncFill(t('{org} samarbejder med Crediwire om at indsamle materialet sikkert.'), { org: PORTAL_CONTACT.org })}>{t('Brugsvilkår')}</ObTitle>
      <label data-cust-act="terms" className="cwp-ob-check">
        <input id="cwp-ob-terms" type="checkbox" checked={accepted} onChange={e => { setAccepted(e.target.checked); if (e.target.checked) setTried(false); }}
          aria-required="true" aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'cwp-ob-terms-err' : undefined}/>
        <span>{t('Jeg accepterer Crediwires')} <button type="button" className="cwp-linkbtn" onClick={doc(t('Brugsvilkår'))}>{t('brugsvilkår')}</button>.</span>
      </label>
      {err && <div id="cwp-ob-terms-err" role="alert" style={Object.assign({}, obErrStyle, { marginLeft: 26 })}>{t('Acceptér brugsvilkårene for at fortsætte.')}</div>}
      <label data-cust-act="terms" className="cwp-ob-check" style={{ marginTop: 12 }}>
        <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)}/>
        <span>{t('Ja tak, Crediwire må sende mig nyheder om produktet på mail (valgfrit).')}</span>
      </label>
      <p style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.6, margin: '16px 0 0' }}>
        {t('EIFO er dataansvarlig for det, I deler med EIFO, og Crediwire behandler det på vegne af EIFO.')}{' '}
        {t('Læs mere i')} <button type="button" className="cwp-linkbtn" onClick={doc(t('EIFO\'s privatlivsoplysninger'))}>{t('EIFO\'s privatlivsoplysninger')}</button>{' '}{t('og')}{' '}<button type="button" className="cwp-linkbtn" onClick={doc(t('Privatlivspolitik'))}>{t('Crediwires privatlivspolitik')}</button>.
      </p>
      <ObButtons>
        <button type="button" className="btn btn-primary" data-cust-act="terms" onClick={next} style={obPrimary}>{t('Næste')}</button>
      </ObButtons>
    </ObFrame>
  );
}

/* ── Virksomhed: CVR og kontaktperson ────────────────────────────────────── */

function ObCompany({ preview, onNext, onBack, footer, onJump }) {
  preview = preview || CW.isPreview();
  const ob = CW.onboarding();
  const co = DATA.COMPANY || {};
  const rcp = portalRecipient();
  const [cvr, setCvr] = React.useState(() => String((ob.company && ob.company.cvr) || co.cvr || '').replace(/\D/g, ''));
  // Navnet fra anmodningen passer kun, når det er modtageren selv, der er logget ind (ikke fx revisoren)
  const own = !ob.account || !rcp.email || ob.account.email.toLowerCase() === rcp.email.toLowerCase();
  const [person, setPerson] = React.useState(() => (ob.company && ob.company.person) || (own ? rcp.name : '') || '');
  const [helper, setHelper] = React.useState(!!(ob.company && ob.company.advisor));
  const [tried, setTried] = React.useState(false);
  const digits = cvr.replace(/\D/g, '');
  const known = String(co.cvr || '').replace(/\D/g, '');
  const cvrErr = digits.length !== 8 ? t('CVR-nummeret har 8 cifre.')
    : digits !== known ? ncFill(t('CVR {cvr} er ikke den virksomhed, EIFO har bedt om materiale fra. Tjek nummeret, eller skriv til {adv}.'), { cvr: digits, adv: PORTAL_CONTACT.first })
    : '';
  const personErr = !person.trim() ? t('Skriv jeres navn.') : '';
  const next = () => {
    setTried(true);
    if (cvrErr) { CW.focusSoon('#cwp-ob-cvr'); return; }
    if (personErr) { CW.focusSoon('#cwp-ob-person'); return; }
    if (CW.setOnboarding({ company: { cvr: digits, name: co.name, person: person.trim(), advisor: helper, at: new Date().toISOString() } },
      ncFill(t('Kunden oprettede virksomheden {name} (CVR {cvr})'), { name: co.name, cvr: digits })) === false) return;
    onNext();
  };
  const showCvrErr = (tried || digits.length === 8) && cvrErr;
  return (
    <ObFrame step="company" ob={ob} onJump={onJump} footer={footer}>
      <ObTitle lead={t('Tjek, at det er den virksomhed, EIFO har bedt om materiale fra.')}>{t('Jeres virksomhed')}</ObTitle>
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="cwp-ob-cvr">{t('CVR-nummer')}</label>
        <div style={{ display: 'flex' }}>
          <span aria-hidden="true" className="cwp-ob-prefix">DK</span>
          <input id="cwp-ob-cvr" className="input" inputMode="numeric" autoComplete="off" value={cvr} readOnly={preview}
            onChange={e => setCvr(e.target.value.replace(/^\s*DK/i, '').replace(/\D/g, '').slice(0, 8))} onKeyDown={e => { if (e.key === 'Enter') next(); }} style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flex: 1, minWidth: 0 }}
            aria-invalid={showCvrErr ? 'true' : undefined} aria-describedby={showCvrErr ? 'cwp-ob-cvr-err' : (!cvrErr ? 'cwp-ob-cvr-found' : undefined)}/>
        </div>
        {showCvrErr && <div id="cwp-ob-cvr-err" role="alert" style={obErrStyle}>{cvrErr}</div>}
        {!cvrErr && (
          <div id="cwp-ob-cvr-found" className="cwp-ob-found">
            <b style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{co.name}</b>
            <span>{[co.address, co.form].filter(Boolean).join(' · ')}</span>
          </div>
        )}
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="cwp-ob-person">{t('Jeres navn')}</label>
        <input id="cwp-ob-person" className="input" autoComplete="name" value={person} readOnly={preview} onChange={e => setPerson(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') next(); }}
          aria-invalid={tried && personErr ? 'true' : undefined} aria-describedby={tried && personErr ? 'cwp-ob-person-err' : undefined}/>
        {tried && personErr && <div id="cwp-ob-person-err" role="alert" style={obErrStyle}>{personErr}</div>}
      </div>
      <label data-cust-act="company" className="cwp-ob-check">
        <input type="checkbox" checked={helper} onChange={e => setHelper(e.target.checked)}/>
        <span>{t('Jeg er revisor, bogholder eller rådgiver og hjælper virksomheden.')}</span>
      </label>
      <ObButtons onBack={onBack}>
        <button type="button" className="btn btn-primary" data-cust-act="company" onClick={next} style={obPrimary}>{t('Næste')}</button>
      </ObButtons>
    </ObFrame>
  );
}

/* ── Aftalen med EIFO: ja til at dele data ───────────────────────────────── */

function ObAgreement({ preview, onNext, onBack, onDecline, footer, onJump, standalone }) {
  preview = preview || CW.isPreview();
  const ob = CW.onboarding();
  const [yes, setYes] = React.useState(!!(ob.agreement && !ob.agreement.declined));
  const helper = !!(ob.company && ob.company.advisor);
  const [mandate, setMandate] = React.useState(!!(ob.agreement && ob.agreement.mandate));
  const [tried, setTried] = React.useState(false);
  const next = () => {
    if (!yes) { setTried(true); CW.focusSoon('#cwp-ob-agree'); return; }
    if (helper && !mandate) { setTried(true); CW.focusSoon('#cwp-ob-mandate'); return; }
    // Fra punktet Periodetal gemmes aftalen først sammen med datadelingen (så et "nej" ikke forsvinder halvvejs)
    if (standalone) { onNext({ at: new Date().toISOString(), mandate: helper || undefined }); return; }
    if (CW.setOnboarding({ agreement: Object.assign({ at: new Date().toISOString() }, helper ? { mandate: true } : {}) }, helper
      ? ncFill(t('{name} ({role}) sagde ja til at dele periodetal og debitordata med EIFO på vegne af kunden'), { name: ob.company.person, role: t('revisor eller rådgiver') })
      : t('Kunden sagde ja til at dele periodetal og debitordata med EIFO')) === false) return;
    onNext();
  };
  const decline = () => {
    if (CW.setOnboarding({ agreement: { declined: true, at: new Date().toISOString() }, sharing: null, erp: null, doneAt: ob.doneAt || new Date().toISOString() },
      t('Kunden sagde nej til datadeling og sender tallene selv')) === false) return;
    onDecline();
  };
  const err = tried && !yes;
  const body = (
    <>
      <ObTitle lead={t('Når I forbinder virksomheden, deler I periodetal og debitordata med EIFO.')}>{t('Jeres aftale med EIFO')}</ObTitle>
      <p style={{ fontSize: 14, color: 'var(--c-text)', lineHeight: 1.6, margin: '0 0 12px' }}>
        {t('EIFO gemmer dataene og bruger dem til at vurdere jeres ansøgning og i dialogen med jer om den. På næste trin vælger I, om EIFO kun får tal til og med en bestemt måned, eller om EIFO løbende kan hente nye tal.')}
      </p>
      <CWFold label={t('Hvilke data deler I?')} id="cwp-ob-faq" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 6px' }}>{t('Det er de samme tal, I ellers ville sende på mail, bare digitalt og mere sikkert.')}</p>
          <div style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{t('EIFO får')}</div>
          <ul style={{ margin: '2px 0 8px', paddingLeft: 18 }}>
            <li>{t('Kontoplan, saldobalance og periodetal')}</li>
            <li>{t('Debitordata: hvem der skylder jer penge, og hvor længe')}</li>
          </ul>
          <div style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{t('EIFO får ikke')}</div>
          <ul style={{ margin: '2px 0 0', paddingLeft: 18 }}>
            <li>{t('Posteringer og bilag')}</li>
            <li>{t('Adgang til jeres netbank og banktransaktioner')}</li>
          </ul>
        </div>
      </CWFold>
      <label data-cust-act="agreement" className="cwp-ob-check">
        <input id="cwp-ob-agree" type="checkbox" checked={yes} onChange={e => { setYes(e.target.checked); if (e.target.checked) setTried(false); }}
          aria-required="true" aria-invalid={err ? 'true' : undefined} aria-describedby={err ? 'cwp-ob-agree-err' : undefined}/>
        <span style={{ fontWeight: 500 }}>{t('Ja, vi accepterer at dele data med EIFO.')}</span>
      </label>
      {err && <div id="cwp-ob-agree-err" role="alert" style={Object.assign({}, obErrStyle, { marginLeft: 26 })}>{onDecline ? t('Sæt kryds for at fortsætte, eller send tallene selv.') : t('Sæt kryds for at fortsætte.')}</div>}
      {helper && (
        <>
          <label data-cust-act="agreement" className="cwp-ob-check" style={{ marginTop: 10 }}>
            <input id="cwp-ob-mandate" type="checkbox" checked={mandate} onChange={e => setMandate(e.target.checked)} aria-required="true"
              aria-invalid={tried && yes && !mandate ? 'true' : undefined} aria-describedby={tried && yes && !mandate ? 'cwp-ob-mandate-err' : undefined}/>
            <span>{ncFill(t('Jeg bekræfter, at jeg må give samtykke på vegne af {company}.'), { company: DATA.COMPANY.name })}</span>
          </label>
          {tried && yes && !mandate && <div id="cwp-ob-mandate-err" role="alert" style={Object.assign({}, obErrStyle, { marginLeft: 26 })}>{t('Bekræft, at du må give samtykke for virksomheden.')}</div>}
        </>
      )}
      <ObButtons onBack={onBack}>
        {onDecline && <button type="button" className="btn btn-ghost" data-cust-act="agreement" onClick={decline}>{t('Vi sender tallene selv')}</button>}
        <button type="button" className="btn btn-primary" data-cust-act="agreement" onClick={next} style={obPrimary}>{t('Næste')}</button>
      </ObButtons>
    </>
  );
  if (standalone) return <div className="cwp-ob-card" style={{ maxWidth: 560, margin: '0 auto' }}>{body}</div>;
  return <ObFrame step="agreement" ob={ob} onJump={onJump} footer={footer}>{body}</ObFrame>;
}

/* ── Datadeling: løbende (ubegrænset) eller til og med en dato (begrænset) ── */

function ObAccess({ preview, onNext, onBack, footer, onJump, standalone, agreement }) {
  preview = preview || CW.isPreview();
  const ob = CW.onboarding();
  const maxYm = obLastMonth();
  const minYm = (Number(maxYm.slice(0, 4)) - 3) + '-01';
  // Forvalgt som i dag: til og med seneste måned. I forhåndsvisningen vises kundens eget valg (eller intet)
  const [mode, setMode] = React.useState(() => (ob.sharing && ob.sharing.mode) || (preview ? null : 'until'));
  const [ym, setYm] = React.useState(() => (ob.sharing && ob.sharing.dataUntil ? ob.sharing.dataUntil.slice(0, 7) : maxYm));
  const ymOk = /^\d{4}-\d{2}$/.test(ym) && ym <= maxYm && ym >= minYm;
  const next = () => {
    if (!mode) return;
    if (mode === 'until' && !ymOk) { CW.focusSoon('#cwp-ob-month'); return; }
    const sharing = mode === 'ongoing' ? { mode, at: new Date().toISOString() } : { mode, dataUntil: obMonthEnd(ym), at: new Date().toISOString() };
    if (CW.setOnboarding(Object.assign({ sharing }, agreement ? { agreement } : {}), mode === 'ongoing' ? t('Kunden valgte løbende datadeling') : ncFill(t('Kunden valgte datadeling til og med {date}'), { date: obFmt(sharing.dataUntil) })) === false) return;
    onNext(sharing);
  };
  const opt = (v, label, desc) => (
    <label data-cust-act="access" className={'cwp-ob-opt' + (mode === v ? ' on' : '')}>
      <input type="radio" name="cwp-ob-share" checked={mode === v} onChange={() => setMode(v)} style={{ marginTop: 3 }}/>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>{label}</span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5, marginTop: 2 }}>{desc}</span>
      </span>
    </label>
  );
  const body = (
    <>
      <ObTitle lead={t('Vælg, hvordan I vil dele regnskabstal med EIFO.')}>{t('Hvor meget må EIFO se?')}</ObTitle>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={ncHidden}>{t('Datadeling')}</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {opt('ongoing', t('Løbende deling (anbefalet)'), t('EIFO kan hente nye periodetal og debitordata, så I ikke skal sende filer frem og tilbage, og kan følge udviklingen, mens I har et lån eller en kaution hos EIFO. I kan trække adgangen tilbage når som helst.'))}
          {opt('until', t('Til og med en bestemt måned'), t('EIFO får periodetal og debitordata til og med den måned, I vælger, og ikke nyere tal. Adgangen lukker, når sagen er afgjort.'))}
        </div>
      </fieldset>
      {mode === 'until' && (
        <div className="field" style={{ margin: '12px 0 0 28px' }}>
          <label htmlFor="cwp-ob-month">{t('Til og med måned')}</label>
          <input id="cwp-ob-month" className="input" type="month" value={ym} min={minYm} max={maxYm} readOnly={preview} onChange={e => setYm(e.target.value)}
            style={{ maxWidth: 200 }} aria-invalid={!ymOk ? 'true' : undefined} aria-describedby="cwp-ob-month-hint"/>
          <div id="cwp-ob-month-hint" className="muted" style={{ fontSize: 12.5, marginTop: 4 }} role={!ymOk ? 'alert' : undefined}>
            {ymOk ? ncFill(t('EIFO får tal for {period}, til og med {date}.'), { period: portalPeriod(null, obMonthEnd(ym)), date: obFmt(obMonthEnd(ym)) }) : t('Vælg en afsluttet måned.')}
          </div>
        </div>
      )}
      <ObButtons onBack={onBack}>
        <button type="button" className="btn btn-primary" data-cust-act="access" onClick={next} style={obPrimary}>{t('Næste')}</button>
      </ObButtons>
    </>
  );
  if (standalone) return <div className="cwp-ob-card" style={{ maxWidth: 560, margin: '0 auto' }}>{body}</div>;
  return <ObFrame step="access" ob={ob} onJump={onJump} footer={footer}>{body}</ObFrame>;
}

/* ── Regnskabssystem ─────────────────────────────────────────────────────── */

const OB_TOP_SYSTEMS = ['ec', 'bi', 'di'];

function ObErp({ preview, onConnected, onWaiting, onBack, onPin, footer, onJump, standalone }) {
  preview = preview || CW.isPreview();
  const ob = CW.onboarding();
  const sharing = ob.sharing || { mode: 'until', dataUntil: obMonthEnd(obLastMonth()) };
  // I forhåndsvisningen står kundens forbundne system valgt
  const [pick, setPick] = React.useState(() => { const s0 = ob.erp && ob.erp.system && ERP_SOURCES.find(x => x.name === ob.erp.system); return s0 ? s0.id : null; });
  const [waiting, setWaiting] = React.useState(() => !!(preview && ob.erp && ob.erp.waiting));
  const [noPick, setNoPick] = React.useState(false);
  const [run, setRun] = React.useState(null);         // kilden, der forbindes til
  const [declined, setDeclined] = React.useState(null);
  const src = ERP_SOURCES.find(s => s.id === pick) || null;
  const other = ERP_SOURCES.filter(s => !OB_TOP_SYSTEMS.includes(s.id));

  const next = () => {
    if (waiting) {
      if (CW.setOnboarding({ erp: { waiting: true, at: new Date().toISOString() }, doneAt: ob.doneAt || new Date().toISOString() }, t('Kunden venter på sin revisor med at forbinde regnskabssystemet')) === false) return;
      onWaiting();
      return;
    }
    if (!src) { setNoPick(true); CW.focusSoon('input[name=cwp-ob-sys]'); return; }
    setDeclined(null);
    // Trinnet bliver stående, mens forbindelsen kører, også når opstarten bliver færdig undervejs
    if (onPin) onPin();
    setRun(src);
  };
  // Tallene er hentet: trinnet er gjort med det samme (ikke først ved "Fortsæt"),
  // så en lukket fane ikke får kunden til at forbinde igen
  const fetched = (s) => {
    CW.setOnboarding(Object.assign({ erp: { system: s.name, at: new Date().toISOString() } }, standalone ? {} : { doneAt: ob.doneAt || new Date().toISOString() }));
  };
  const runDone = (res) => {
    const s = run;
    setRun(null);
    if (res === 'declined') {
      CW.log('consent-declined', ncFill(t('Kunden afviste adgangen i {src}'), { src: s.name }), { who: 'kunde' });
      setDeclined(s.name); CW.focusSoon('#cwp-ob-erp-declined'); return;
    }
    if (res !== 'done') return;
    onConnected(s);
  };

  const body = (
    <>
      <ObTitle lead={!ob.sharing && preview ? t('Kunden har ikke valgt datadeling endnu.')
        : sharing.mode === 'ongoing' ? t('EIFO henter løbende periodetal og debitordata med læseadgang. I logger ind i jeres eget system.')
        : ncFill(t('EIFO henter periodetal og debitordata til og med {date} med læseadgang. I logger ind i jeres eget system.'), { date: obFmt(sharing.dataUntil) })}>{t('Forbind jeres regnskabssystem')}</ObTitle>
      {!standalone && (
        <label data-cust-act="erp" className="cwp-ob-check" style={{ marginBottom: 14 }}>
          <input type="checkbox" checked={waiting} onChange={e => setWaiting(e.target.checked)} aria-describedby="cwp-ob-wait-hint"/>
          <span>{t('Vi venter på vores revisor')}
            <span id="cwp-ob-wait-hint" style={{ display: 'block', fontSize: 12.5, color: 'var(--c-text-3)' }}>{t('Har revisoren adgangen, kan I forbinde senere fra oversigten.')}</span>
          </span>
        </label>
      )}
      {declined && (
        <p id="cwp-ob-erp-declined" role="status" tabIndex={-1} style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.55, outline: 'none' }}>
          {ncFill(t('I afviste adgangen i {src}. Intet er hentet, og EIFO har ikke fået adgang.'), { src: declined })}{' '}
          {standalone ? t('I kan vælge et andet system eller gå tilbage og uploade en saldobalance selv.') : t('I kan vælge et andet system, sætte kryds i "Vi venter på vores revisor" eller gå tilbage til aftalen og sende tallene selv.')}
        </p>
      )}
      <fieldset disabled={waiting} style={{ border: 0, margin: 0, padding: 0, opacity: waiting ? 0.5 : 1 }}>
        <legend style={ncHidden}>{t('Vælg jeres regnskabssystem')}</legend>
        <div className="cwp-ob-systems">
          {OB_TOP_SYSTEMS.map(id => ERP_SOURCES.find(s => s.id === id)).map(s => (
            <label key={s.id} data-cust-act="erp" className={'cwp-ob-sys' + (pick === s.id ? ' on' : '')}>
              <input type="radio" name="cwp-ob-sys" checked={pick === s.id} onChange={() => { setPick(s.id); setNoPick(false); }} aria-describedby={noPick ? 'cwp-ob-sys-err' : undefined}/>
              <span>{s.name}</span>
            </label>
          ))}
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="cwp-ob-sys-other">{t('Kan I ikke se jeres system? Vælg det her.')}</label>
          <select id="cwp-ob-sys-other" data-cust-act="erp" className="input" value={other.some(s => s.id === pick) ? pick : ''} disabled={preview}
            onChange={e => { setPick(e.target.value || null); setNoPick(false); }}>
            <option value="">{t('Vælg regnskabssystem')}</option>
            {other.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </fieldset>
      {noPick && !waiting && !src && <div id="cwp-ob-sys-err" role="alert" style={obErrStyle}>{t('Vælg jeres regnskabssystem.')}</div>}
      <ObButtons onBack={onBack}>
        <button type="button" className="btn btn-primary" data-cust-act="erp" onClick={next} aria-disabled={!waiting && !src ? 'true' : undefined}
          style={!waiting && !src ? Object.assign({}, obPrimary, { opacity: 0.5 }) : obPrimary}>
          {waiting ? t('Næste') : src ? ncFill(t('Forbind {src}'), { src: src.name }) : t('Forbind')}
        </button>
      </ObButtons>
      {run && <PortalErpRun src={run} sharing={sharing} onFetched={fetched} onClose={runDone}/>}
    </>
  );
  if (standalone) return <div className="cwp-ob-card" style={{ maxWidth: 560, margin: '0 auto' }}>{body}</div>;
  return <ObFrame step="erp" ob={ob} onJump={onJump} footer={footer}>{body}</ObFrame>;
}

/**
 * Forbind regnskabssystemet uden for opstarten (fra punktet Periodetal eller
 * oversigten): aftalen og datadelingen først, hvis kunden ikke har dem, og så
 * valget af system. onDone kaldes, når tallene er hentet.
 */
function PortalErpSetup({ onBack, onDone, backLabel }) {
  const ob = CW.onboarding();
  const first = !ob.agreement || ob.agreement.declined ? 'agreement' : !ob.sharing ? 'access' : 'erp';
  const [phase, setPhase] = React.useState(first);
  const [agreement, setAgreement] = React.useState(null);
  const go = (p) => { setPhase(p); CW.focusSoon('.cwp-main h1'); };
  React.useEffect(() => { if (CW.consent()) onBack(); }, []);
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <PortalBackNav onBack={onBack} label={backLabel}/>
      {phase === 'agreement' && <ObAgreement standalone onNext={(a) => { setAgreement(a); go('access'); }} onBack={onBack}/>}
      {phase === 'access' && <ObAccess standalone agreement={agreement} onNext={() => go('erp')} onBack={() => (first === 'agreement' ? go('agreement') : onBack())}/>}
      {phase === 'erp' && <ObErp standalone onConnected={() => onDone()} onWaiting={onBack} onBack={() => go('access')}/>}
    </div>
  );
}

/* ── Forbindelsen: regnskabssystemets login og samtykke, derefter hentning ── */

// Trin: 0 videresendes, 1 login og samtykke i regnskabssystemet, 2-5 henter, 6 færdig
const ERP_RUN_DONE = 6;

function PortalErpRun({ src, sharing, onFetched, onClose }) {
  const [step, setStep] = React.useState(0);
  const [auth, setAuth] = React.useState('login'); // login | logging | consent
  const [login, setLogin] = React.useState('');
  const [loginEmail, setLoginEmail] = React.useState(() => { const a = CW.onboarding().account; return (a && a.email) || portalRecipient().email || ''; });
  const timers = React.useRef([]);
  const approving = React.useRef(false);
  const dlgRef = React.useRef(null);
  const end = sharing && sharing.mode === 'until' ? sharing.dataUntil : null;
  const period = portalPeriod(null, end);
  const months = portalMonths(end);

  React.useEffect(() => {
    timers.current.push(setTimeout(() => { setStep(1); CW.focusSoon('#cwp-auth-email'); }, 1200));
    return () => timers.current.forEach(clearTimeout);
  }, []);
  const cancel = () => { timers.current.forEach(clearTimeout); timers.current = []; onClose('cancel'); };
  // Under hentningen (trin 2-5) kan dialogen ikke lukkes: samtykket og filerne gemmes samlet til sidst
  CW.useDialog(dlgRef, true, () => step >= ERP_RUN_DONE ? onClose('done') : step >= 2 ? null : cancel());

  const loginAuth = () => {
    setAuth('logging');
    timers.current.push(setTimeout(() => { setLogin(loginEmail.trim() || portalRecipient().email); setAuth('consent'); CW.focusSoon('#cwp-auth-h'); }, 900));
  };
  // Godkend kan kun trykkes én gang: samtykket og hentningen må ikke starte to gange
  const approve = () => {
    if (step !== 1 || approving.current) return;
    if (CW.isPreview()) { CW.previewBlocked('erp'); return; }
    approving.current = true;
    setStep(2);
    CW.focusSoon('#cwp-run-title');
    const durations = [1000, 1100, 1000, 1000];
    let acc = 0;
    durations.forEach((ms, i) => {
      acc += ms;
      timers.current.push(setTimeout(() => {
        if (i < durations.length - 1) { setStep(3 + i); return; }
        // Samtykke, filer og trinnet gemmes samlet, så et afbrudt forløb ikke efterlader et samtykke uden tal
        portalConsentNow(src.name, sharing, CW.onboarding().company);
        portalConnectNow(src.name, sharing);
        if (onFetched) onFetched(src);
        setStep(ERP_RUN_DONE);
        CW.focusSoon('#cwp-run-title');
      }, acc));
    });
  };
  const decline = () => { timers.current.forEach(clearTimeout); onClose('declined'); };

  const steps = [
    ncFill(t('I sendes til {src}…'), { src: src.name }),
    ncFill(t('Godkendt i {src}'), { src: src.name }),
    ncFill(t('Henter kontoplan ({n} konti)…'), { n: src.accounts }),
    ncFill(t('Henter saldobalance {period}…'), { period }),
    ncFill(t('Henter periodetal for {n} måneder…'), { n: months }),
    t('Henter debitordata…'),
  ];
  const untilText = sharing && sharing.mode === 'ongoing' ? t('Løbende, også nye tal') : ncFill(t('Til og med {date}'), { date: obFmt(end) });

  return (
    <div className="scrim" style={{ zIndex: 200 }}>
      <div className="modal" ref={dlgRef} role="dialog" aria-modal="true" aria-labelledby={step === 1 ? 'cwp-auth-h' : 'cwp-run-title'} style={{ width: step === 1 ? 500 : 460 }}>
        {step === 1 ? (
          <>
            {/* Demo: regnskabssystemets egen login- og samtykkeside. Kun tekst, ingen logo eller varemærkegrafik. */}
            <div className="modal-head" style={{ gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <h2 id="cwp-auth-h" tabIndex={-1} className="modal-title" style={{ margin: 0 }}>{src.name}</h2>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{t('Log ind og giv Crediwire læseadgang')}</div>
              </div>
              <span className="tag" style={{ fontSize: 11, flexShrink: 0 }}>{t('Demo')}</span>
            </div>
            {auth !== 'consent' ? (
              <>
                <div className="modal-body" style={{ padding: '18px 22px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 12 }}>{ncFill(t('Log ind på {src}'), { src: src.name })}</div>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label htmlFor="cwp-auth-email">{t('E-mail')}</label>
                    <input id="cwp-auth-email" className="input" type="email" autoComplete="username" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} disabled={auth === 'logging'}/>
                  </div>
                  <div className="field">
                    <label htmlFor="cwp-auth-pw">{t('Adgangskode')}</label>
                    <input id="cwp-auth-pw" className="input" type="password" autoComplete="current-password" defaultValue="demo-demo" disabled={auth === 'logging'} aria-describedby="cwp-auth-pw-hint"/>
                    <div id="cwp-auth-pw-hint" className="muted" style={{ fontSize: 12, marginTop: 4 }}>{t('Demo: adgangskoden er udfyldt. Crediwire og EIFO ser den aldrig.')}</div>
                  </div>
                  {auth === 'logging' && <div role="status" style={{ marginTop: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><span aria-hidden="true" className="cwp-spin"/> {ncFill(t('Logger ind som {email}…'), { email: loginEmail.trim() })}</div>}
                </div>
                <div className="modal-foot">
                  <button type="button" className="btn" onClick={cancel} disabled={auth === 'logging'}>{t('Annullér')}</button>
                  <button type="button" className="btn btn-primary" onClick={loginAuth} disabled={auth === 'logging' || !loginEmail.trim()} style={obPrimary}>{t('Log ind')}</button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-body" style={{ padding: '18px 22px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 10 }}>{t('Crediwire beder om læseadgang på vegne af EIFO')}</div>
                  <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 14px', margin: '0 0 14px', fontSize: 13 }}>
                    <dt className="muted">{t('Logget ind som')}</dt><dd style={{ margin: 0, wordBreak: 'break-all' }}>{login || '-'}</dd>
                    <dt className="muted">{t('Virksomhed')}</dt><dd style={{ margin: 0 }}>{DATA.COMPANY.name}{DATA.COMPANY.cvr ? ' · CVR ' + DATA.COMPANY.cvr : ''}</dd>
                    {src.agreement && <><dt className="muted">{t('Aftalenr.')}</dt><dd className="mono" style={{ margin: 0 }}>{src.agreement}</dd></>}
                    <dt className="muted">{t('Tal')}</dt><dd style={{ margin: 0 }}>{untilText}</dd>
                    <dt className="muted">{t('Adgang')}</dt><dd style={{ margin: 0 }}>{sharing && sharing.mode === 'ongoing' ? t('Indtil I trækker den tilbage') : t('Indtil sagen er afgjort, eller I trækker den tilbage')}</dd>
                  </dl>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Crediwire får lov til at læse')}</div>
                  <ul style={{ margin: '4px 0 10px', paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                    <li>{ncFill(t('Kontoplan ({n} konti)'), { n: src.accounts })}</li>
                    <li>{t('Saldobalance')}</li>
                    <li>{ncFill(t('Periodetal for {period}'), { period })}</li>
                    <li>{t('Debitordata')}</li>
                  </ul>
                  <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.5 }}>{ncFill(t('Crediwire kan ikke se posteringer, bilag eller banktransaktioner og kan ikke ændre noget i {src}.'), { src: src.name })}</div>
                  <div className="muted" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 12 }}>{ncFill(t('Demo: I en rigtig forbindelse er dette {src}s egen side, hvor I logger ind.'), { src: src.name })}</div>
                </div>
                <div className="modal-foot">
                  <button type="button" className="btn" onClick={decline}>{t('Afvis')}</button>
                  <button type="button" className="btn btn-primary" onClick={approve} style={obPrimary}><I.Check className="ic"/> {t('Godkend')}</button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="modal-body" style={{ padding: '26px 26px 22px' }}>
            {step < ERP_RUN_DONE ? (
              <>
                <div id="cwp-run-title" tabIndex={-1} style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 4, outline: 'none' }}>{ncFill(t('Forbinder til {src}'), { src: src.name })}</div>
                <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 16 }}>
                  {ncFill(t('I logger ind på {src}s egen side. Crediwire og EIFO ser aldrig jeres brugernavn eller adgangskode.'), { src: src.name })}
                </div>
                <ol aria-live="polite" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {steps.map((label, i) => {
                    const state = i < step ? 'done' : i === step ? 'now' : 'next';
                    return (
                      <li key={i} aria-current={state === 'now' ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: state === 'next' ? 'var(--c-text-3)' : 'var(--c-ink)', fontWeight: state === 'now' ? 600 : 400 }}>
                        {state === 'done' ? <I.Check size={14} aria-hidden="true" style={{ color: 'var(--c-ink)', flexShrink: 0, width: 18 }}/>
                          : state === 'now' ? <span aria-hidden="true" className="cwp-spin" style={{ width: 18, height: 18 }}/>
                          : <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--c-text-4)', flexShrink: 0, boxSizing: 'border-box' }}/>}
                        <span>{state === 'done' ? label.replace(/…$/, '') : label}</span>
                        {state === 'done' && <span style={ncHidden}>{t('færdig')}</span>}
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <div>
                <div id="cwp-run-title" role="status" tabIndex={-1} style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)', outline: 'none' }}>{ncFill(t('Periodetal og debitordata er hentet fra {src}'), { src: src.name })}</div>
                <div style={{ fontSize: 13.5, color: 'var(--c-text-2)', marginTop: 6, lineHeight: 1.5 }}>
                  {sharing && sharing.mode === 'ongoing' ? t('Løbende adgang, indtil I trækker den tilbage.') : ncFill(t('EIFO har fået tal til og med {date} og henter ikke nyere tal. Adgangen lukker, når sagen er afgjort.'), { date: obFmt(end) })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                  <button type="button" className="btn btn-primary" autoFocus style={obPrimary} onClick={() => onClose('done')}>{t('Fortsæt')}</button>
                </div>
              </div>
            )}
          </div>
        )}
        {step === 0 && (
          <div className="modal-foot"><button type="button" className="btn btn-ghost" onClick={cancel}>{t('Annullér')}</button></div>
        )}
      </div>
    </div>
  );
}

/* ── Opstarten samlet: vælger trinnet og binder Tilbage/Næste sammen ────── */

/**
 * step: det trin, der vises. I kundens portal er det det næste, kunden mangler
 * (eller et tidligere, hvis kunden går tilbage). I forhåndsvisningen er det det
 * trin, rådgiveren har valgt; footer er så forhåndsvisningens egen navigation.
 */
function PortalOnboarding({ step, setStep, preview, onFinished, footer, onJump }) {
  const next = (k) => () => { setStep(k); CW.focusSoon('.cwp-main h1'); };
  const finish = () => onFinished();
  if (step === 'terms') return <ObTerms preview={preview} onNext={next('company')} footer={footer} onJump={onJump}/>;
  if (step === 'company') return <ObCompany preview={preview} onNext={next('agreement')} onBack={next('terms')} footer={footer} onJump={onJump}/>;
  if (step === 'agreement') return <ObAgreement preview={preview} onNext={next('access')} onBack={next('company')} onDecline={finish} footer={footer} onJump={onJump}/>;
  if (step === 'access') return <ObAccess preview={preview} onNext={next('erp')} onBack={next('agreement')} footer={footer} onJump={onJump}/>;
  if (step === 'erp') return <ObErp preview={preview} onConnected={finish} onWaiting={finish} onBack={next('access')} onPin={() => setStep('erp')} footer={footer} onJump={onJump}/>;
  return null;
}

/* ── Forhåndsvisningen: navigation og noten, når rådgiveren rører en kundehandling ── */

// Rækkefølgen af kundens skærme, som rådgiveren kan gå igennem
const PV_SCREENS = ['signup', 'login', 'terms', 'company', 'agreement', 'access', 'erp', 'welcome', 'hub'];
function pvScreenLabel(k) {
  switch (k) {
    case 'signup': return t('Opret bruger');
    case 'login': return t('Log ind');
    case 'welcome': return t('Velkomst');
    case 'hub': return t('Oversigt');
    default: return obLabel(k);
  }
}

// Hvor kunden er i opstarten, som én linje til rådgiveren
function pvCustomerWhere() {
  const ob = CW.onboarding();
  const legacy = !ob.account && portalMem().accepted;
  if (legacy) return t('Kunden er i gang med materialet.');
  if (!ob.account) return t('Kunden har ikke oprettet en bruger endnu.');
  const step = CW.onboardingStep(ob);
  if (step) {
    const i = CW.ONBOARDING_STEPS.indexOf(step);
    // Antallet står i statusboksens overskrift (6 opstartstrin); her kun trinnets navn
    return ncFill(t('Kunden er nået til trinnet {step}.'), { step: obLabel(step) });
  }
  if (ob.agreement && ob.agreement.declined) return t('Kunden har sagt nej til datadeling og sender tallene selv.');
  const c = CW.consent();
  const erp = c ? ncFill(t('{src} er forbundet'), { src: c.system })
    : ob.erp && ob.erp.system ? ncFill(t('tallene er hentet fra {src}, og adgangen er lukket'), { src: ob.erp.system })
    : ob.erp && ob.erp.waiting ? t('venter på revisor med regnskabssystemet') : t('regnskabssystemet er ikke forbundet');
  return ncFill(t('Kunden har gennemført opstarten: {sharing}, {erp}.'), { sharing: obSharingText(ob.sharing) || t('ingen datadeling valgt'), erp });
}

// Under kortet i forhåndsvisningen: forrige og næste skærm (ingen af dem gemmer noget)
function PortalPvStepNav({ screen, setScreen }) {
  const i = PV_SCREENS.indexOf(screen);
  if (i < 0) return null;
  const prev = PV_SCREENS[i - 1], next = PV_SCREENS[i + 1];
  return (
    <div className="cwp-pv-stepnav" role="group" aria-label={t('Gå mellem kundens skærme')}>
      <span>{t('Forhåndsvisning: knapperne ovenfor er kundens og gemmer ikke noget her.')}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {prev && <button type="button" onClick={() => setScreen(prev)}><I.ArrowLeft size={12}/> {pvScreenLabel(prev)}</button>}
        {next && <button type="button" onClick={() => setScreen(next)}>{pvScreenLabel(next)} <I.ArrowRight size={12}/></button>}
      </div>
    </div>
  );
}

// Teksten, når rådgiveren rører noget, kun kunden må gøre
function pvBlockedText(what) {
  switch (what) {
    case 'account': return t('Kunden opretter selv sin bruger.');
    case 'login': return t('Kunden logger selv ind.');
    case 'reset': return t('Kunden beder selv om en ny adgangskode.');
    case 'terms': return t('Kunden accepterer selv brugsvilkårene.');
    case 'company': return t('Kunden opretter selv virksomheden.');
    case 'agreement': return t('Kunden vælger selv, om de vil dele data med EIFO.');
    case 'access': return t('Kunden vælger selv, hvor meget EIFO må se.');
    case 'erp': return t('Kunden forbinder selv regnskabssystemet.');
    case 'consent': return t('Kunden giver og trækker selv adgangen til regnskabssystemet tilbage.');
    case 'undo': return t('Kunden fortryder selv det, de har sendt.');
    case 'upload': case 'send': case 'remove':
      return t('Kunden sender selv materialet. Skal du uploade for kunden, så brug "Upload for kunden" i sagen.');
    case 'submit': return t('Kunden melder selv, at de er færdige.');
    case 'delegate': return t('Kunden beder selv revisor eller bank om hjælp.');
    case 'message': return t('Skriv til kunden fra sagen.');
    default: return t('Det er kunden, der gør dette.');
  }
}

function PortalPvNote({ what, n, onClose }) {
  React.useEffect(() => {
    if (!what) return;
    const id = setTimeout(onClose, 6000);
    return () => clearTimeout(id);
  }, [what, n]);
  return (
    <div className="cwp-pv-note" role="status" aria-live="polite">
      {what && (
        <>
          <I.Eye size={13}/>
          <span><b style={{ fontWeight: 600 }}>{t('Forhåndsvisning')}:</b> {pvBlockedText(what)} {t('Intet er ændret.')}</span>
          <button type="button" onClick={onClose} aria-label={t('Luk')}><I.X size={12}/></button>
        </>
      )}
    </div>
  );
}

/* ── Demo i kundens portal (præsentatoren er kunden): udfyld eller spring over ── */

function obDemoSkip() {
  const now = new Date().toISOString();
  const co = DATA.COMPANY || {};
  const rcp = portalRecipient();
  const ob = CW.onboarding();
  CW.setOnboarding({
    account: ob.account || { email: rcp.email || 'kunde@example.dk', pw: obPwHash(OB_DEMO_PW), at: now },
    terms: ob.terms || { at: now, marketing: false },
    company: ob.company || { cvr: String(co.cvr || '').replace(/\D/g, ''), name: co.name, person: rcp.name || '', advisor: false, at: now },
    agreement: ob.agreement || { at: now },
    sharing: ob.sharing || (ob.agreement && ob.agreement.declined ? null : { mode: 'until', dataUntil: obMonthEnd(obLastMonth()), at: now }),
    erp: ob.erp || (ob.agreement && ob.agreement.declined ? null : { skipped: true, at: now }),
    doneAt: now,
  }, t('Opstarten blev sprunget over (demo)'));
}

const PORTAL_OB_CSS = `
.cwp .cwp-ob { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 32px; max-width: 800px; margin: 8px auto 0; align-items: start; }
.cwp .cwp-ob-main { min-width: 0; max-width: 520px; }
.cwp .cwp-ob-card { background: #fff; border: 1px solid var(--c-line); border-radius: 14px; padding: 24px 24px 20px; }
.cwp .cwp-ob-h { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; color: var(--c-ink); margin: 0 0 6px; line-height: 1.25; }
.cwp .cwp-ob-lead { font-size: 14px; color: var(--c-text-2); line-height: 1.55; margin: 0 0 18px; }
.cwp .cwp-ob-btns { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 22px; flex-wrap: wrap; }
.cwp .cwp-ob-check { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 14px; color: var(--c-text); line-height: 1.5; }
.cwp .cwp-ob-check input { margin-top: 3px; }
.cwp .cwp-ob-prefix { display: grid; place-items: center; padding: 0 12px; border: 1px solid var(--c-line-strong); border-right: 0; border-radius: 6px 0 0 6px; background: var(--c-surface-2); color: var(--c-text-2); font-size: 13px; }
.cwp .cwp-ob-found { margin-top: 6px; font-size: 12.5px; color: var(--c-text-2); display: flex; flex-direction: column; gap: 1px; }
.cwp .cwp-ob-opt { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border: 1px solid var(--c-line); border-radius: 8px; cursor: pointer; background: #fff; }
.cwp .cwp-ob-opt.on { border-color: var(--c-primary); }
.cwp .cwp-ob-systems { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.cwp .cwp-ob-sys { display: flex; align-items: center; gap: 10px; padding: 14px; border: 1px solid var(--c-line); border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--c-ink); background: #fff; min-height: 52px; }
.cwp .cwp-ob-sys.on { border-color: var(--c-primary); }
.cwp .cwp-ob-steps ol { list-style: none; margin: 4px 0 0; padding: 0; }
.cwp .cwp-ob-steps li { position: relative; }
.cwp .cwp-ob-steps-sm { display: none; font-size: 13px; color: var(--c-text-2); margin-bottom: 12px; }
.cwp .cwp-ob-jump { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 32px; padding: 4px 0; background: none; border: 0; text-align: left; font: inherit; color: var(--c-text-2); font-size: 13.5px; cursor: pointer; }
.cwp .cwp-ob-jump.static { cursor: default; }
.cwp button.cwp-ob-jump:hover .cwp-ob-lbl { color: var(--c-ink); text-decoration: underline; }
.cwp .cwp-ob-steps li.active .cwp-ob-jump { color: var(--c-ink); font-weight: 600; }
.cwp .cwp-ob-dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid var(--c-text-4); background: #fff; box-sizing: border-box; display: grid; place-items: center; color: #fff; flex-shrink: 0; }
.cwp .cwp-ob-dot.active { border: 2px solid var(--c-primary); }
.cwp .cwp-ob-dot.done { background: var(--c-ink); border: none; }
.cwp .cwp-ob-line { position: absolute; left: 6.5px; top: 26px; height: 14px; width: 1px; background: var(--c-line-strong); }
.cwp .cwp-ob-steps li { padding-bottom: 8px; }
.cwp .cwp-spin { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--c-line-2); border-top-color: var(--c-primary); animation: cwp-spin 0.8s linear infinite; box-sizing: border-box; flex-shrink: 0; }
.cwp .cwp-pv-stepnav { margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 12px; background: #1a1d22; color: rgba(255,255,255,0.8); border-radius: 10px; font-size: 12.5px; }
.cwp .cwp-pv-stepnav button, .cwp .cwp-pv-jump button { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; min-height: 28px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25); border-radius: 6px; color: #fff; cursor: pointer; font-size: 12.5px; font-family: inherit; }
.cwp .cwp-pv-stepnav button:focus-visible, .cwp .cwp-pv-jump button:focus-visible, .cwp .cwp-pv-note button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.cwp .cwp-pv-jump { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 6px 20px 8px; background: #1a1d22; color: rgba(255,255,255,0.7); font-size: 12px; }
.cwp .cwp-pv-jump > span:first-child { flex-basis: 100%; }
.cwp .cwp-pv-jump button { min-height: 26px; padding: 2px 9px; font-size: 12px; background: transparent; border-color: rgba(255,255,255,0.2); }
.cwp .cwp-pv-jump button[aria-current=true] { background: #fff; color: #1a1d22; border-color: #fff; }
.cwp .cwp-pv-note { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 300; max-width: min(560px, calc(100vw - 32px)); }
.cwp .cwp-pv-note:not(:empty) { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px 10px 14px; background: #1a1d22; color: #fff; border-radius: 10px; box-shadow: var(--shadow-lg); font-size: 13px; line-height: 1.5; }
.cwp .cwp-pv-note svg { flex-shrink: 0; margin-top: 3px; }
.cwp .cwp-pv-note button { background: transparent; border: 0; color: #fff; cursor: pointer; padding: 4px; min-width: 24px; min-height: 24px; }
.cwp .cwp-head-logout { background: none; border: 0; padding: 4px 6px; min-height: 28px; color: var(--c-text-2); font: inherit; font-size: 12.5px; cursor: pointer; }
.cwp .cwp-head-logout:hover { color: var(--c-ink); }
@media (max-width: 720px) {
  .cwp .cwp-ob { grid-template-columns: 1fr; gap: 0; }
  .cwp .cwp-ob-steps ol { display: none; }
  .cwp .cwp-ob-steps-sm { display: block; }
  .cwp .cwp-ob-main { max-width: none; }
  .cwp .cwp-ob-card { padding: 18px 16px; }
  .cwp .cwp-ob-systems { grid-template-columns: 1fr; }
  .cwp .cwp-ob-check, .cwp .cwp-ob-sys { min-height: 44px; }
}
`;

Object.assign(window, { PortalAuth, PortalOnboarding, PortalErpSetup, PortalErpRun, PortalPvStepNav, PortalPvNote, PV_SCREENS, pvScreenLabel, pvCustomerWhere, obDemoSkip, obSharingText, obMonthEnd, obLastMonth, obFmt, OB_DEMO_PW, obPwHash, PORTAL_OB_CSS });
