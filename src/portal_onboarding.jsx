/* ─────────────────────────────────────────────────────────────────────────────
   Kundens opstart i portalen, bygget efter dagens indsamlingsflow
   (Indsamlingsflow_i_dag) og designet "Bruger trin" (Claude Design, runde 2, 2a):
   landingssiden, så ① Bruger ("Log ind eller opret bruger" med én knap,
   "Fortsæt med Crediwire"), Crediwires egen side (PortalCwAuth, en demo af
   omstillingen: Crediwire viser selv Opret bruger eller Log ind ud fra mailen),
   tilbage til Bruger (færdiggør navn, virksomhed og vilkår, eller videre, hvis
   brugeren allerede har virksomheden) og ② Datadeling. Derefter oversigten.

   Tilstanden ligger i CW.onboarding() (case_state.js) og er kundens. I
   forhåndsvisningen (rådgiverens "Kundeside") kan skærmene ses og gennemgås,
   men intet gemmes: knapper og felter, der ville handle for kunden, er mærket
   data-cust-act, og portalen stopper klikket og viser en note (PortalPvNote).
   CW's egne funktioner afviser også kundehandlinger i forhåndsvisningen.

   Bruger hjælpere fra new_case_portal.jsx (ncFill, PORTAL_CONTACT, portalRecipient,
   ERP_SOURCES, portalPeriod, portalConsentNow, portalConnectNow m.fl.).
   ──────────────────────────────────────────────────────────────────────────── */

// Rækkefølgen i trinlisten. 'material' er oversigten.
const OB_ORDER = ['account', 'material'];
function obLabel(k) {
  switch (k) {
    case 'account': return t('Bruger');
    case 'data': return t('Datadeling');
    default: return t('Materiale');
  }
}
// Er trinnet gjort af kunden? (afgøres af kundens rigtige tilstand, også i forhåndsvisningen)
function obDone(ob, k) {
  if (k === 'account') return !!(ob.account && ob.terms && ob.company);
  if (k === 'data') return !!(ob.doneAt || ob.erp || (ob.agreement && ob.agreement.declined));
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

/* ── Trinlisten til venstre (som i dag). På smalle skærme: "Trin 2 af 2 · Datadeling" ── */

function ObStepper({ current, ob, onJump }) {
  const steps = OB_ORDER;
  const idx = steps.indexOf(current);
  // "Trin 1 af 2": materialet efter opstarten tælles ikke med
  const total = steps.filter(k => k !== 'material').length;
  return (
    <nav className="cwp-ob-steps" aria-label={t('Trin i opstarten')}>
      <div className="cwp-ob-steps-sm">
        {ncFill(t('Trin {n} af {m}'), { n: Math.min(idx + 1, total), m: total })} · {obLabel(current)}
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

const obPrimary = { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' };
// Deaktiveret knap som i designet: grå flade og grå tekst (ikke en bleg primærfarve)
const obDisabled = { background: 'var(--c-neutral-bg)', borderColor: 'var(--c-neutral-bg)', color: 'var(--c-text-3)', opacity: 1, cursor: 'not-allowed' };
const obErrStyle = { fontSize: 12.5, color: 'var(--c-danger)', marginTop: 4 };

/* ── Crediwires egen side: Crediwire ser selv, om mailen har en bruger ────── */

/**
 * Demo af Crediwires login-side, som kunden sendes til fra trinnet Bruger og
 * tilbage fra bagefter (design: "Bruger trin", runde 2, 2a). Mailen kommer fra
 * invitationen, og Crediwire viser selv "Opret bruger" eller "Log ind" ud fra
 * den. Der er ingen "Har du allerede en bruger?"-link. Vilkår, navn og
 * virksomhed hører til portalens trin Bruger, når kunden er tilbage.
 * I forhåndsvisningen afgør mode ('signup' | 'login'), hvilken side der vises.
 */
function PortalCwAuth({ mode, preview, onAuthed, onBack }) {
  preview = preview || CW.isPreview();
  const ob = CW.onboarding();
  const rcp = portalRecipient();
  const co = DATA.COMPANY || {};
  // Demo: om mailen allerede har en Crediwire-bruger, og om virksomheden ligger på den
  const [demoExists, setDemoExists] = React.useState(false);
  const [demoHasCo, setDemoHasCo] = React.useState(false);
  const exists = preview ? mode === 'login' : (!!ob.account || demoExists);
  const presetMail = (ob.account && ob.account.email) || rcp.email || '';
  const [email, setEmail] = React.useState(presetMail);
  const [pw, setPw] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [forgot, setForgot] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const timer = React.useRef(null);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const probs = obPwProblems(pw);
  const emailOk = NC_EMAIL_RE.test(email.trim());

  const submit = (e) => {
    if (e) e.preventDefault();
    if (preview || busy) return; // fanges også af data-cust-act
    setTried(true); setErr('');
    if (!emailOk) { CW.focusSoon('#cwp-auth-mail'); return; }
    if (exists && !pw) { setErr(t('Skriv adgangskoden.')); CW.focusSoon('#cwp-auth-pw1'); return; }
    if (exists && ob.account && ob.account.pw !== obPwHash(pw)) { setErr(t('Adgangskoden passer ikke.')); CW.focusSoon('#cwp-auth-pw1'); return; }
    if (!exists && probs.length) { CW.focusSoon('#cwp-auth-pw1'); return; }
    setBusy(true);
    timer.current = setTimeout(() => {
      setBusy(false);
      const now = new Date().toISOString();
      const mail = email.trim();
      if (exists && ob.account) {
        CW.log('portal-login', t('Kunden loggede ind i portalen'), { who: 'kunde' });
        onAuthed(false, false);
        return;
      }
      if (exists) {
        // Demo: en bruger, Crediwire allerede kender. Den har accepteret Crediwires vilkår og har et navn
        const patch = { account: { email: mail, pw: obPwHash(pw), name: rcp.name || '', existing: true, at: now }, terms: { at: now, marketing: false } };
        if (demoHasCo) patch.company = { cvr: String(co.cvr || '').replace(/\D/g, ''), name: co.name, person: rcp.name || '', advisor: false, at: now };
        if (CW.setOnboarding(patch, ncFill(t('Kunden loggede ind med sin Crediwire-bruger ({email})'), { email: mail })) === false) return;
        onAuthed(false, demoHasCo);
        return;
      }
      if (CW.setOnboarding({ account: { email: mail, pw: obPwHash(pw), at: now } }, ncFill(t('Kunden oprettede en bruger på Crediwire ({email})'), { email: mail })) === false) return;
      onAuthed(false, false);
    }, 900);
  };

  const mailErr = tried && !emailOk ? t('Skriv en gyldig mail.') : '';
  const pwErr = !exists && tried && probs.length ? t('Adgangskoden opfylder ikke kravene nedenfor.') : '';
  const rule = (k, txt) => {
    const ok = !probs.includes(k);
    return <li key={k} style={{ color: pw && ok ? 'var(--c-text-2)' : 'var(--c-text-3)' }}>
      <span aria-hidden="true" style={{ display: 'inline-block', width: 14 }}>{pw && ok ? '✓' : '·'}</span>{txt}
      <span style={ncHidden}>{pw ? (ok ? ': ' + t('opfyldt') : ': ' + t('mangler')) : ''}</span>
    </li>;
  };
  const req = <span aria-hidden="true" className="cwx-req">*</span>;
  const label = busy ? (exists ? t('Logger ind…') : t('Opretter bruger…')) : (exists ? t('Log ind') : t('Opret bruger'));

  return (
    <div className="cwx">
      <div className="cwx-left">
        <div className="cwx-top">
          <span className="cwx-logo" aria-label="Crediwire"><span className="cwx-logo-mark" aria-hidden="true">cw</span>crediwire</span>
          {!preview && <div className="cwp-lang"><LanguageSwitcher compact/></div>}
        </div>
        <form onSubmit={submit} noValidate className="cwx-form">
          <div className="cwx-demo">
            <div>{t('Demo: Crediwires egen side. Crediwire ser selv, om mailen har en bruger, og sender kunden tilbage bagefter.')}</div>
            {!preview && !ob.account && (
              <div className="cwx-demo-opts">
                <label><input type="checkbox" checked={demoExists} onChange={e => { setDemoExists(e.target.checked); if (!e.target.checked) setDemoHasCo(false); setErr(''); setTried(false); }}/> {t('Mailen har allerede en bruger')}</label>
                <label><input type="checkbox" checked={demoHasCo} onChange={e => { setDemoHasCo(e.target.checked); if (e.target.checked) setDemoExists(true); setErr(''); setTried(false); }}/> {t('Brugeren har allerede virksomheden')}</label>
              </div>
            )}
          </div>
          <div className="cwx-ctx">
            {exists
              ? ncFill(t('Du har allerede en bruger hos Crediwire. Log ind, så sender vi dig tilbage til {what} for {company}.'), { what: t('Materiale til EIFO'), company: co.name })
              : ncFill(t('Du er på vej til {what} for {company}.'), { what: t('Materiale til EIFO'), company: co.name }) + ' ' + t('Når brugeren er oprettet, sender vi dig tilbage.')}
          </div>
          <h1 className="cwx-h">{exists ? t('Log ind') : t('Opret bruger')}</h1>

          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="cwp-auth-mail">{req}{t('Mail')}</label>
            <input id="cwp-auth-mail" className={'input' + (presetMail ? ' cwx-fixed' : '')} type="email" autoComplete="username" value={email} readOnly={preview || !!presetMail}
              onChange={e => { setEmail(e.target.value); setErr(''); }} aria-required="true"
              aria-invalid={mailErr ? 'true' : undefined} aria-describedby={mailErr ? 'cwp-auth-mail-err' : undefined}/>
            {mailErr && <div id="cwp-auth-mail-err" role="alert" style={obErrStyle}>{mailErr}</div>}
          </div>

          <div className="field" style={{ marginBottom: 8 }}>
            <div className="cwx-pw-row">
              <label htmlFor="cwp-auth-pw1">{req}{t('Adgangskode')}</label>
              {exists && <button type="button" className="cwp-linkbtn" data-cust-act="reset" onClick={() => { setForgot(true); setErr(''); }} style={{ fontSize: 13 }}>{t('Glemt adgangskode?')}</button>}
            </div>
            <div style={{ position: 'relative' }}>
              <input id="cwp-auth-pw1" className="input" type={show ? 'text' : 'password'} autoComplete={exists ? 'current-password' : 'new-password'} value={pw} readOnly={preview}
                onChange={e => { setPw(e.target.value); setErr(''); }} style={{ paddingRight: 64 }} aria-required="true"
                aria-invalid={pwErr || err ? 'true' : undefined} aria-describedby={[!exists ? 'cwp-auth-rules' : '', pwErr ? 'cwp-auth-pw-err' : '', err ? 'cwp-auth-err' : ''].filter(Boolean).join(' ') || undefined}/>
              <button type="button" className="cwp-linkbtn" onClick={() => setShow(!show)} aria-pressed={show}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12.5 }}>{show ? t('Skjul') : t('Vis')}</button>
            </div>
            {pwErr && <div id="cwp-auth-pw-err" role="alert" style={obErrStyle}>{pwErr}</div>}
            {!exists && (
              <ul id="cwp-auth-rules" className="cwp-ob-rules">
                {rule('len', t('Mindst 8 tegn'))}
                {rule('num', t('Et tal'))}
                {rule('lower', t('Et lille bogstav'))}
                {rule('upper', t('Et stort bogstav'))}
              </ul>
            )}
          </div>
          {forgot && (
            <p role="status" style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.55, margin: '8px 0 0' }}>
              {ncFill(t('Vi har sendt et link til {email}, så I kan vælge en ny adgangskode. Linket virker i 1 time.'), { email: portalMaskEmail(email.trim() || rcp.email) })}
              {' '}<span className="muted">{t('Demo: mailen sendes ikke.')}</span>
            </p>
          )}
          {err && <div id="cwp-auth-err" role="alert" style={Object.assign({}, obErrStyle, { fontSize: 13, marginTop: 10 })}>{err}</div>}

          <button type="submit" className="btn btn-primary btn-lg" data-cust-act={exists ? 'login' : 'account'} aria-busy={busy || undefined}
            style={Object.assign({ width: '100%', justifyContent: 'center', marginTop: 18 }, obPrimary)}>
            {busy && <span aria-hidden="true" className="cwp-spin cwx-spin"/>}{label}
          </button>
          <button type="button" className="cwp-linkbtn cwx-back" onClick={onBack}>{t('Tilbage til Materiale til EIFO')}</button>
        </form>
      </div>
      <div className="cwx-right" aria-hidden="true">
        <div className="cwx-claim">{t('Digital og sikker deling af jeres finansielle data')}</div>
      </div>
    </div>
  );
}

/* ── ① Bruger: før og efter Crediwire ─────────────────────────────────────── */

// Grøn boks: hvem kunden er logget ind som, med "Skift bruger"
function ObWho({ ob, title, sub, onSwitch }) {
  const name = (ob.account && ob.account.name) || '';
  // Initialer fra navnet, ellers de to første bogstaver i mailen (fx "SP" for sp@…)
  const mailLocal = ((ob.account && ob.account.email) || '?').split('@')[0];
  const initials = name ? name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') : mailLocal.slice(0, 2).toUpperCase();
  return (
    <div className="cwp-ob-whobox">
      <span className="cwp-ob-avatar" aria-hidden="true">{initials}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cwp-ob-whobox-t"><I.Check size={12} aria-hidden="true" className="cwp-ob-ok"/>{title}</div>
        <div className="cwp-ob-whobox-s">{sub}</div>
      </div>
      {onSwitch && <button type="button" className="cwp-linkbtn" onClick={onSwitch} style={{ fontSize: 13, flexShrink: 0 }}>{t('Skift bruger')}</button>}
    </div>
  );
}

/**
 * Trinnet Bruger (design "Bruger trin", 2a). Før login: "Log ind eller opret
 * bruger" med virksomheden og én knap, "Fortsæt med Crediwire". Efter login:
 * - ny bruger: "Færdiggør dine oplysninger" (navn, virksomhed, CVR, vilkår)
 * - kendt bruger uden virksomheden: "Du er logget ind" og bekræft virksomheden
 * - kendt bruger med virksomheden (arrive): tjekker, og sender videre til datadeling
 */
function ObUser({ preview, pre, arrive, demo, onContinue, onDone, onLogout, footer, onJump }) {
  preview = preview || CW.isPreview();
  // demo: et stadie, rådgiveren ser i Kundeflow (PortalObDemo), i stedet for kundens rigtige tilstand
  const ob = demo || CW.onboarding();
  const rcp = portalRecipient();
  const co = DATA.COMPANY || {};
  const acc = ob.account || null;
  const mail = (acc && acc.email) || '';
  const known = String(co.cvr || '').replace(/\D/g, '');
  // Modtagerens navn står kun, når brugeren er modtageren selv
  const own = !rcp.email || !mail || mail.toLowerCase() === rcp.email.toLowerCase();
  const [person, setPerson] = React.useState(() => (ob.company && ob.company.person) || (acc && acc.name) || (own ? rcp.name || '' : ''));
  const [coName, setCoName] = React.useState(() => (ob.company && ob.company.name) || co.name || '');
  const [cvr, setCvr] = React.useState(() => (ob.company && ob.company.cvr) || known);
  const [accepted, setAccepted] = React.useState(!!ob.terms);
  const [marketing, setMarketing] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const [phase, setPhase] = React.useState(() => (arrive && ob.company ? 'checking' : null));
  const isNew = !!acc && !ob.terms;
  const needCo = !!acc && !!ob.terms && !ob.company;

  // Kendt bruger med virksomheden: tjek, og når virksomheden er fundet, direkte til datadeling
  React.useEffect(() => {
    if (phase !== 'checking') return;
    const a = setTimeout(() => onDone(), 1500);
    return () => clearTimeout(a);
  }, []);

  const digits = String(cvr).replace(/\D/g, '');
  const nameErr = isNew && !person.trim() ? t('Skriv dit navn.') : '';
  const coErr = !coName.trim() ? t('Skriv virksomhedens navn.') : '';
  const cvrErr = digits.length !== 8 ? t('CVR-nummeret har 8 cifre.')
    : digits !== known ? ncFill(t('CVR {cvr} er ikke den virksomhed, EIFO har bedt om materiale fra. Tjek nummeret, eller skriv til {adv}.'), { cvr: digits, adv: PORTAL_CONTACT.first })
    : '';
  const doc = (n) => (e) => { e.preventDefault(); e.stopPropagation(); CW.notInDemo(n); };

  const submit = (e) => {
    if (e) e.preventDefault();
    if (preview) return;
    if (ob.company && !isNew) { onDone(); return; }
    setTried(true);
    if (nameErr) { CW.focusSoon('#cwp-auth-name'); return; }
    if (coErr) { CW.focusSoon('#cwp-ob-coname'); return; }
    if (cvrErr) { CW.focusSoon('#cwp-ob-cvr'); return; }
    if (isNew && !accepted) { CW.focusSoon('#cwp-auth-terms'); return; }
    const now = new Date().toISOString();
    const who = isNew ? person.trim() : ((acc && acc.name) || rcp.name || '');
    const patch = { company: { cvr: digits, name: coName.trim(), person: who, advisor: false, at: now } };
    if (isNew) {
      patch.terms = { at: now, marketing };
      patch.account = Object.assign({}, acc, { name: who });
    }
    const text = isNew
      ? ncFill(t('Kunden accepterede brugsvilkårene og bekræftede virksomheden {company} ({name})'), { company: coName.trim(), name: who }) + (marketing ? '. ' + t('Ja tak til nyheder fra Crediwire') : '')
      : ncFill(t('Kunden tilføjede virksomheden {company} (CVR {cvr}) til sin Crediwire-bruger'), { company: coName.trim(), cvr: digits });
    if (CW.setOnboarding(patch, text) === false) return;
    onDone();
  };

  const coBox = (
    <div className="cwp-ob-co">
      <span className="cwp-ob-co-k">{t('Virksomhed')}</span>
      <b>{co.name}</b>
      <span>{[known ? 'CVR ' + known : '', co.address].filter(Boolean).join(' · ')}</span>
    </div>
  );
  const coFields = (
    <div className="cwp-ob-cofields">
      <div className="field">
        <label htmlFor="cwp-ob-coname">{t('Virksomhedsnavn')}</label>
        <input id="cwp-ob-coname" className="input" value={coName} readOnly={preview} onChange={e => setCoName(e.target.value)}
          aria-invalid={tried && coErr ? 'true' : undefined} aria-describedby={tried && coErr ? 'cwp-ob-coname-err' : undefined}/>
        {tried && coErr && <div id="cwp-ob-coname-err" role="alert" style={obErrStyle}>{coErr}</div>}
      </div>
      <div className="field">
        <label htmlFor="cwp-ob-cvr">{t('CVR')}</label>
        <input id="cwp-ob-cvr" className="input" inputMode="numeric" value={cvr} readOnly={preview} onChange={e => setCvr(e.target.value.replace(/^\s*DK/i, '').replace(/\D/g, '').slice(0, 8))}
          aria-invalid={tried && cvrErr ? 'true' : undefined} aria-describedby={tried && cvrErr ? 'cwp-ob-cvr-err' : undefined}/>
      </div>
      {tried && cvrErr && <div id="cwp-ob-cvr-err" role="alert" style={Object.assign({}, obErrStyle, { gridColumn: '1 / -1', marginTop: -4 })}>{cvrErr}</div>}
    </div>
  );

  let heading, body;
  if (pre || !acc) {
    heading = t('Log ind eller opret bruger');
    body = (
      <>
        {coBox}
        <div className="cwp-ob-cwgo">
          <button type="button" className="cwp-ob-cwbtn" onClick={onContinue}>
            <span className="cwx-logo-mark" aria-hidden="true">cw</span>{t('Fortsæt med Crediwire')}
          </button>
          <p>{t('Du opretter en bruger eller logger ind hos Crediwire og kommer tilbage hertil.')}</p>
        </div>
      </>
    );
  } else if (phase === 'checking') {
    heading = t('Du er logget ind');
    body = (
      <>
        <ObWho ob={ob} title={ncFill(t('Logget ind som {name}'), { name: (acc && acc.name) || mail })} sub={mail}/>
        <div className="cwp-ob-wait-row" role="status">
          <span aria-hidden="true" className="cwp-spin"/>
          <span>{ncFill(t('Tjekker, om {company} findes på din bruger…'), { company: co.name })}</span>
        </div>
      </>
    );
  } else if (isNew) {
    heading = t('Færdiggør dine oplysninger');
    body = (
      <>
        <ObWho ob={ob} title={t('Bruger oprettet.')} sub={mail} onSwitch={preview ? null : onLogout}/>
        <div className="field">
          <label htmlFor="cwp-auth-name">{t('Dit navn')}</label>
          <input id="cwp-auth-name" className="input" autoComplete="name" value={person} readOnly={preview} onChange={e => setPerson(e.target.value)}
            aria-invalid={tried && nameErr ? 'true' : undefined} aria-describedby={tried && nameErr ? 'cwp-auth-name-err' : undefined}/>
          {tried && nameErr && <div id="cwp-auth-name-err" role="alert" style={obErrStyle}>{nameErr}</div>}
        </div>
        {coFields}
        <div>
          <label data-cust-act="terms" className="cwp-ob-check">
            <input id="cwp-auth-terms" type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} aria-required="true"/>
            <span>{t('Jeg accepterer Crediwires')} <button type="button" className="cwp-linkbtn" onClick={doc(t('Brugsvilkår'))}>{t('brugsvilkår')}</button>.</span>
          </label>
          <label data-cust-act="terms" className="cwp-ob-check" style={{ marginTop: 10 }}>
            <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)}/>
            <span>{t('Crediwire må sende mig nyheder og tilbud på mail (valgfrit).')}</span>
          </label>
        </div>
      </>
    );
  } else {
    heading = t('Du er logget ind');
    body = (
      <>
        <ObWho ob={ob} title={ncFill(t('Logget ind som {name}'), { name: (acc && acc.name) || mail })} sub={[acc && acc.name, mail].filter(Boolean).join(' · ')} onSwitch={preview ? null : onLogout}/>
        {needCo && <p className="cwp-ob-note">{t('Virksomheden findes ikke på din bruger endnu. Bekræft navn og CVR, så tilføjer vi den.')}</p>}
        {needCo ? coFields : coBox}
      </>
    );
  }
  const showSubmit = !!acc && !pre && !phase;
  const blocked = isNew && !accepted;

  return (
    <ObFrame step="account" ob={ob} onJump={onJump} footer={footer}>
      <form onSubmit={submit} noValidate className="cwp-ob-card cwp-ob-user">
        <h1 className="cwp-ob-h">{heading}</h1>
        {body}
        {showSubmit && (
          <>
            <div className="cwp-ob-rule" aria-hidden="true"/>
            <button type="submit" className="btn btn-primary btn-lg" data-cust-act="company" disabled={blocked}
              aria-describedby={blocked ? 'cwp-ob-user-hint' : undefined}
              style={Object.assign({ width: '100%', justifyContent: 'center' }, blocked ? obDisabled : obPrimary)}>{t('Fortsæt til datadeling')}</button>
            {blocked && <span id="cwp-ob-user-hint" style={ncHidden}>{t('Acceptér brugsvilkårene for at fortsætte.')}</span>}
          </>
        )}
      </form>
      <PortalContactLine style={{ marginTop: 14 }}/>
    </ObFrame>
  );
}

/* ── Demo: spring mellem stadierne i trinnet Bruger ───────────────────────── */

const OB_DEMO_STAGES = ['pre', 'new', 'known', 'knownCo'];
function obDemoLabel(k) {
  switch (k) {
    case 'pre': return t('Før login');
    case 'new': return t('Ny bruger');
    case 'known': return t('Kendt bruger uden virksomheden');
    default: return t('Kendt bruger med virksomheden');
  }
}
// Det stadie, kundens tilstand svarer til
function obDemoStage(ob, loggedIn) {
  if (!loggedIn || !ob.account) return 'pre';
  if (!ob.terms) return 'new';
  if (!ob.company) return 'known';
  return 'knownCo';
}
// Kundens tilstand for et stadie. I portalen gemmes den; i Kundeflow vises den kun
function obDemoState(k) {
  const now = new Date().toISOString();
  const rcp = portalRecipient();
  const co = DATA.COMPANY || {};
  const email = rcp.email || 'kunde@example.dk';
  if (k === 'pre') return { account: null, terms: null, company: null };
  if (k === 'new') return { account: { email, pw: obPwHash(OB_DEMO_PW), at: now }, terms: null, company: null };
  const known = { account: { email, pw: obPwHash(OB_DEMO_PW), name: rcp.name || '', existing: true, at: now }, terms: { at: now, marketing: false } };
  if (k === 'known') return Object.assign(known, { company: null });
  return Object.assign(known, { company: { cvr: String(co.cvr || '').replace(/\D/g, ''), name: co.name, person: rcp.name || '', advisor: false, at: now } });
}

/** Stiplede demoknapper under trinnet Bruger: før login, ny bruger, kendt bruger uden og med virksomheden. */
function PortalObDemo({ current, onPick, preview }) {
  return (
    <div className="cwp-obdemo" role="group" aria-label={t('Demo: stadier i trinnet Bruger')}>
      <span className="cwp-obdemo-l">{preview ? t('Demo: vis trinnet som') : t('Demo: spring til')}</span>
      {OB_DEMO_STAGES.map(k => (
        <button key={k} type="button" className="cwp-obdemo-btn" aria-pressed={current === k} onClick={() => onPick(k)}>{obDemoLabel(k)}</button>
      ))}
    </div>
  );
}

/* ── ② Datadeling: hvor meget EIFO må se, regnskabssystemet og aftalen ──── */

const OB_TOP_SYSTEMS = ['ec', 'bi', 'di'];

/**
 * Ét kort: løbende eller til og med en måned, systemet og ja til at dele data
 * (med fuldmagt, hvis det er revisoren eller rådgiveren). "Forbind" gemmer
 * aftalen og valget og åbner systemets login og samtykke (PortalErpRun).
 * Kunden kan også sende tallene selv eller vente på revisoren.
 * standalone: uden for opstarten (fra punktet Periodetal eller oversigten), kun
 * Tilbage og Forbind.
 */
function ObData({ preview, onFinished, onPin, onBack, footer, onJump, standalone }) {
  preview = preview || CW.isPreview();
  const ob = CW.onboarding();
  const helper = !!(ob.company && ob.company.advisor);
  const maxYm = obLastMonth();
  const minYm = (Number(maxYm.slice(0, 4)) - 3) + '-01';
  // Forvalgt som i dag: til og med seneste måned. I forhåndsvisningen vises kundens eget valg (eller intet)
  const [mode, setMode] = React.useState(() => (ob.sharing && ob.sharing.mode) || (preview ? null : 'until'));
  const [ym, setYm] = React.useState(() => (ob.sharing && ob.sharing.dataUntil ? ob.sharing.dataUntil.slice(0, 7) : maxYm));
  // I forhåndsvisningen står kundens forbundne system valgt
  const [pick, setPick] = React.useState(() => { const s0 = ob.erp && ob.erp.system && ERP_SOURCES.find(x => x.name === ob.erp.system); return s0 ? s0.id : null; });
  const [yes, setYes] = React.useState(!!(ob.agreement && !ob.agreement.declined));
  const [mandate, setMandate] = React.useState(!!(ob.agreement && ob.agreement.mandate));
  const [tried, setTried] = React.useState(false);
  const [run, setRun] = React.useState(null);         // kilden, der forbindes til
  const [declined, setDeclined] = React.useState(null);
  const src = ERP_SOURCES.find(s => s.id === pick) || null;
  const other = ERP_SOURCES.filter(s => !OB_TOP_SYSTEMS.includes(s.id));
  const ymOk = /^\d{4}-\d{2}$/.test(ym) && ym <= maxYm && ym >= minYm;
  const sharing = mode === 'ongoing' ? { mode } : mode === 'until' && ymOk ? { mode, dataUntil: obMonthEnd(ym) } : null;
  const problem = !mode ? 'mode' : !sharing ? 'month' : !src ? 'sys' : !yes ? 'agree' : helper && !mandate ? 'mandate' : null;
  const show = (k) => tried && problem === k;

  // Aftalen og valget gemmes, før systemets login åbner, så de står der, hvis kunden afbryder
  const saveChoices = () => {
    const now = new Date().toISOString();
    const sh = Object.assign({}, sharing, { at: now });
    const what = obSharingText(sh);
    return CW.setOnboarding({ agreement: Object.assign({ at: now }, helper ? { mandate: true } : {}), sharing: sh }, helper
      ? ncFill(t('{name} ({role}) sagde ja til at dele periodetal og debitordata med EIFO på vegne af kunden ({sharing})'), { name: ob.company.person, role: t('revisor eller rådgiver'), sharing: what })
      : ncFill(t('Kunden sagde ja til at dele periodetal og debitordata med EIFO ({sharing})'), { sharing: what })) !== false;
  };
  const connect = () => {
    setTried(true);
    if (problem) {
      CW.focusSoon({ mode: 'input[name=cwp-ob-share]', month: '#cwp-ob-month', sys: 'input[name=cwp-ob-sys]', agree: '#cwp-ob-agree', mandate: '#cwp-ob-mandate' }[problem]);
      return;
    }
    if (!saveChoices()) return;
    setDeclined(null);
    // Trinnet bliver stående, mens forbindelsen kører, også når opstarten bliver færdig undervejs
    if (onPin) onPin();
    setRun(src);
  };
  // Tallene er hentet: trinnet er gjort med det samme (ikke først ved "Fortsæt"),
  // så en lukket fane ikke får kunden til at forbinde igen
  const fetched = (s) => {
    const now = new Date().toISOString();
    CW.setOnboarding(Object.assign({ erp: { system: s.name, at: now } }, standalone ? {} : { doneAt: CW.onboarding().doneAt || now }));
  };
  const runDone = (res) => {
    const s = run;
    setRun(null);
    if (res === 'declined') {
      CW.log('consent-declined', ncFill(t('Kunden afviste adgangen i {src}'), { src: s.name }), { who: 'kunde' });
      setDeclined(s.name); CW.focusSoon('#cwp-ob-erp-declined'); return;
    }
    if (res !== 'done') return;
    onFinished(s);
  };
  const decline = () => {
    if (CW.setOnboarding({ agreement: { declined: true, at: new Date().toISOString() }, sharing: null, erp: null, doneAt: ob.doneAt || new Date().toISOString() },
      t('Kunden sagde nej til datadeling og sender tallene selv')) === false) return;
    onFinished();
  };
  const wait = () => {
    // Har kunden allerede sagt ja og valgt, gemmes det, så revisoren kun skal forbinde
    if (yes && sharing && (!helper || mandate) && !saveChoices()) return;
    if (CW.setOnboarding({ erp: { waiting: true, at: new Date().toISOString() }, doneAt: ob.doneAt || new Date().toISOString() }, t('Kunden venter på sin revisor med at forbinde regnskabssystemet')) === false) return;
    onFinished();
  };

  const opt = (v, label, desc) => (
    <label data-cust-act="data" className={'cwp-ob-opt' + (mode === v ? ' on' : '')}>
      <input type="radio" name="cwp-ob-share" checked={mode === v} onChange={() => setMode(v)} style={{ marginTop: 3 }}
        aria-describedby={show('mode') ? 'cwp-ob-share-err' : undefined}/>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>{label}</span>
        <span style={{ display: 'block', fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5, marginTop: 2 }}>{desc}</span>
      </span>
    </label>
  );

  const body = (
    <>
      <ObTitle lead={t('EIFO henter periodetal og debitordata direkte fra jeres regnskabssystem med læseadgang. Det er de samme tal, I ellers ville sende på mail.')}>{t('Del regnskabstal med EIFO')}</ObTitle>
      {declined && (
        <p id="cwp-ob-erp-declined" className="cwp-ob-notice" role="status" tabIndex={-1}>
          {ncFill(t('I afviste adgangen i {src}. Intet er hentet, og EIFO har ikke fået adgang.'), { src: declined })}{' '}
          {standalone ? t('I kan vælge et andet system eller gå tilbage og uploade en saldobalance selv.') : t('I kan vælge et andet system, sende tallene selv eller vente på jeres revisor.')}
        </p>
      )}

      <fieldset className="cwp-ob-sec cwp-ob-sec-first">
        <legend className="cwp-ob-sub">{t('Hvor meget må EIFO se?')}</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {opt('ongoing', t('Løbende deling (anbefalet)'), t('EIFO kan hente nye periodetal og debitordata, så I ikke skal sende filer frem og tilbage, og kan følge udviklingen, mens I har et lån eller en kaution hos EIFO. I kan trække adgangen tilbage når som helst.'))}
          {opt('until', t('Til og med en bestemt måned'), t('EIFO får periodetal og debitordata til og med den måned, I vælger, og ikke nyere tal. Adgangen lukker, når sagen er afgjort.'))}
        </div>
        {show('mode') && <div id="cwp-ob-share-err" role="alert" style={obErrStyle}>{t('Vælg, hvor meget EIFO må se.')}</div>}
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
      </fieldset>

      <fieldset className="cwp-ob-sec">
        <legend className="cwp-ob-sub">{t('Jeres regnskabssystem')}</legend>
        <div className="cwp-ob-systems">
          {OB_TOP_SYSTEMS.map(id => ERP_SOURCES.find(s => s.id === id)).map(s => (
            <label key={s.id} data-cust-act="data" className={'cwp-ob-sys' + (pick === s.id ? ' on' : '')}>
              <input type="radio" name="cwp-ob-sys" checked={pick === s.id} onChange={() => setPick(s.id)} aria-describedby={show('sys') ? 'cwp-ob-sys-err' : undefined}/>
              <span>{s.name}</span>
            </label>
          ))}
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="cwp-ob-sys-other">{t('Kan I ikke se jeres system? Vælg det her.')}</label>
          <select id="cwp-ob-sys-other" data-cust-act="data" className="input" value={other.some(s => s.id === pick) ? pick : ''} disabled={preview}
            onChange={e => setPick(e.target.value || null)}>
            <option value="">{t('Vælg regnskabssystem')}</option>
            {other.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {show('sys') && <div id="cwp-ob-sys-err" role="alert" style={obErrStyle}>{t('Vælg jeres regnskabssystem.')}</div>}
      </fieldset>

      {/* Folden har selv en streg foroven */}
      <div className="cwp-ob-sec cwp-ob-sec-fold">
        <CWFold label={t('Hvilke data deler I?')} id="cwp-ob-faq" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 6px' }}>{t('EIFO gemmer dataene og bruger dem til at vurdere jeres ansøgning og i dialogen med jer om den.')}</p>
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
        <label data-cust-act="data" className="cwp-ob-check">
          <input id="cwp-ob-agree" type="checkbox" checked={yes} onChange={e => setYes(e.target.checked)}
            aria-required="true" aria-invalid={show('agree') ? 'true' : undefined} aria-describedby={show('agree') ? 'cwp-ob-agree-err' : undefined}/>
          <span style={{ fontWeight: 500 }}>{t('Ja, vi accepterer at dele data med EIFO.')}</span>
        </label>
        {show('agree') && <div id="cwp-ob-agree-err" role="alert" style={Object.assign({}, obErrStyle, { marginLeft: 26 })}>{standalone ? t('Sæt kryds for at fortsætte.') : t('Sæt kryds for at fortsætte, eller send tallene selv.')}</div>}
        {helper && (
          <>
            <label data-cust-act="data" className="cwp-ob-check" style={{ marginTop: 10 }}>
              <input id="cwp-ob-mandate" type="checkbox" checked={mandate} onChange={e => setMandate(e.target.checked)} aria-required="true"
                aria-invalid={show('mandate') ? 'true' : undefined} aria-describedby={show('mandate') ? 'cwp-ob-mandate-err' : undefined}/>
              <span>{ncFill(t('Jeg bekræfter, at jeg må give samtykke på vegne af {company}.'), { company: DATA.COMPANY.name })}</span>
            </label>
            {show('mandate') && <div id="cwp-ob-mandate-err" role="alert" style={Object.assign({}, obErrStyle, { marginLeft: 26 })}>{t('Bekræft, at du må give samtykke for virksomheden.')}</div>}
          </>
        )}
      </div>

      <div className="cwp-ob-btns">
        {standalone
          ? <button type="button" className="btn" onClick={onBack}>{t('Tilbage')}</button>
          : <button type="button" className="btn btn-ghost" data-cust-act="data" onClick={decline}>{t('Vi sender tallene selv')}</button>}
        <button type="button" className="btn btn-primary" data-cust-act="data" onClick={connect} style={obPrimary}>
          {src ? ncFill(t('Forbind {src}'), { src: src.name }) : t('Forbind')}
        </button>
      </div>
      {/* Er det revisoren selv, der udfylder, giver "vi venter på revisoren" ikke mening */}
      {!standalone && !helper && (
        <p className="cwp-ob-wait">
          {t('Har jeres revisor adgang til regnskabssystemet?')}{' '}
          <button type="button" className="cwp-linkbtn" data-cust-act="data" onClick={wait}>{t('Vi venter på vores revisor')}</button>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--c-text-3)' }}>{t('På oversigten kan I sende revisoren et link eller forbinde senere.')}</span>
        </p>
      )}
      {run && <PortalErpRun src={run} sharing={sharing} onFetched={fetched} onClose={runDone}/>}
    </>
  );
  if (standalone) return <div className="cwp-ob-card">{body}</div>;
  return <ObFrame step="data" ob={ob} onJump={onJump} footer={footer}>{body}</ObFrame>;
}

/**
 * Forbind regnskabssystemet uden for opstarten (fra punktet Periodetal eller
 * oversigten): samme kort som i opstarten, med kundens tidligere valg udfyldt.
 * onDone kaldes, når tallene er hentet.
 */
function PortalErpSetup({ onBack, onDone, backLabel }) {
  React.useEffect(() => { if (CW.consent()) onBack(); }, []);
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <PortalBackNav onBack={onBack} label={backLabel}/>
      <ObData standalone onFinished={() => onDone()} onBack={onBack}/>
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
function PortalOnboarding({ step, setStep, preview, pre, arrive, demo, onContinue, onFinished, onLogout, footer, onJump }) {
  if (step === 'account') return <ObUser preview={preview} pre={pre} arrive={arrive} demo={demo} onContinue={onContinue} onLogout={onLogout}
    onDone={() => onFinished()} footer={footer} onJump={onJump}/>;
  if (step === 'data') return <ObData preview={preview} onFinished={() => onFinished()} onPin={() => setStep('data')} footer={footer} onJump={onJump}/>;
  return null;
}

/* ── Forhåndsvisningen: navigation og noten, når rådgiveren rører en kundehandling ── */

// Rækkefølgen af kundens skærme, som rådgiveren kan gå igennem
const PV_SCREENS = ['landing', 'account', 'signup', 'login', 'hub'];
function pvScreenLabel(k) {
  switch (k) {
    case 'landing': return t('Landingsside');
    case 'signup': return t('Crediwire: Opret bruger');
    case 'login': return t('Crediwire: Log ind');
    case 'hub': return t('Oversigt');
    default: return obLabel(k);
  }
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
    case 'data': return t('Kunden vælger selv, om og hvordan de deler regnskabstal med EIFO.');
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
.cwp .cwp-ob { display: block; max-width: 520px; margin: 8px auto 0; }
.cwp .cwp-ob-main { min-width: 0; max-width: 520px; }
.cwp .cwp-ob-card { background: #fff; border: 1px solid var(--c-line); border-radius: 14px; padding: 24px 24px 20px; }
.cwp .cwp-ob-h { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; color: var(--c-ink); margin: 0 0 6px; line-height: 1.25; }
.cwp .cwp-ob-lead { font-size: 14px; color: var(--c-text-2); line-height: 1.55; margin: 0 0 18px; }
.cwp .cwp-ob-btns { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 22px; flex-wrap: wrap; }
.cwp .cwp-ob-check { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 14px; color: var(--c-text); line-height: 1.5; }
.cwp .cwp-ob-check input { margin-top: 3px; }
.cwp .cwp-ob-co { display: flex; flex-direction: column; gap: 1px; padding: 10px 12px; margin: 0 0 16px; background: var(--c-surface-2); border-radius: 8px; font-size: 12.5px; color: var(--c-text-2); }
.cwp .cwp-ob-co b { font-size: 14px; font-weight: 600; color: var(--c-ink); }
.cwp .cwp-ob-co-k { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--c-text-3); margin-bottom: 2px; }
.cwp .cwp-ob-rules { list-style: none; margin: 6px 0 0; padding: 0; font-size: 12.5px; line-height: 1.6; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
.cwp .cwp-ob-terms { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--c-line); }
.cwp .cwp-ob-fine { font-size: 12.5px; color: var(--c-text-2); line-height: 1.6; margin: 12px 0 0; }
.cwp .cwp-ob-sec { border: 0; margin: 18px 0 0; padding: 16px 0 0; border-top: 1px solid var(--c-line); min-width: 0; }
.cwp .cwp-ob-sec-first { border-top: 0; margin-top: 0; padding-top: 0; }
.cwp .cwp-ob-sec-fold { border-top: 0; padding-top: 0; }
.cwp .cwp-ob-sub { padding: 0; font-size: 14px; font-weight: 600; color: var(--c-ink); margin: 0 0 10px; }
.cwp fieldset.cwp-ob-sec > legend.cwp-ob-sub { float: left; width: 100%; }
.cwp fieldset.cwp-ob-sec > legend.cwp-ob-sub + * { clear: both; }
.cwp .cwp-ob-cw { width: 100%; justify-content: center; gap: 10px; margin-top: 22px; background: #fff; border: 1px solid var(--c-line-strong); color: var(--c-ink); font-weight: 600; }
.cwp .cwp-ob-cw:hover:not(:disabled) { background: var(--c-surface-2); }
.cwp .cwp-ob-cw:disabled { background: var(--c-surface-2); border-color: var(--c-line); color: var(--c-text-3); cursor: not-allowed; opacity: 1; }
.cwp .cwp-ob-cw:disabled .cwx-logo-mark { opacity: .45; }
.cwp .cwp-ob-cwnote { margin: 12px 0 0; text-align: center; font-size: 12.5px; line-height: 1.5; color: var(--c-text-2); }
.cwp .cwp-ob-cw .cwx-logo-mark { width: 22px; height: 22px; font-size: 11px; }
.cwp .cwp-ob-who { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 12px; margin: 0 0 10px; font-size: 13px; color: var(--c-text-2); }
.cwp .cwx { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 100vh; background: #fff; }
.cwp.cwp-preview .cwx { min-height: 680px; }
.cwp .cwp-main-cw { background: #fff; }
.cwp .cwp-obdemo { margin-top: 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 10px 12px; border: 1px dashed var(--c-line-strong); border-radius: 10px; font-size: 12.5px; color: var(--c-text-3); }
.cwp .cwp-obdemo-l { margin-right: 4px; }
.cwp .cwp-obdemo-btn { border: 1px dashed var(--c-line-strong); background: transparent; border-radius: 999px; padding: 4px 11px; min-height: 28px; font: inherit; font-size: 12.5px; color: var(--c-text-2); cursor: pointer; }
.cwp .cwp-obdemo-btn:hover { border-color: var(--c-text-3); color: var(--c-ink); }
.cwp .cwp-obdemo-btn[aria-pressed=true] { border-style: solid; border-color: var(--c-ink); background: #fff; color: var(--c-ink); }
@media (max-width: 600px) { .cwp .cwp-obdemo-btn { min-height: 40px; } }
.cwp .cwp-main-cw ~ .cwp-demo .cwp-demo-fill { background: rgba(255, 255, 255, 0.9); border-radius: 999px; color: var(--c-text-2); }
.cwp .cwx-demo-opts { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.cwp .cwx-demo-opts label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--c-text-2); min-height: 24px; }
.cwp .cwx-fixed { background: var(--c-surface-2); color: var(--c-text-2); }
.cwp .cwx-pw-row { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.cwp .cwx-spin { width: 14px; height: 14px; margin-right: 8px; border-color: rgba(255,255,255,0.4); border-top-color: #fff; }
.cwp .cwx-back { margin-top: 14px; font-size: 14px; align-self: flex-start; }
.cwp .cwp-ob-user { display: flex; flex-direction: column; gap: 18px; }
.cwp .cwp-ob-user .cwp-ob-h { margin: 0; }
.cwp .cwp-ob-user .cwp-ob-co { margin: 0; }
.cwp .cwp-ob-user .field { margin: 0; }
.cwp .cwp-ob-cwgo { display: flex; flex-direction: column; gap: 10px; }
.cwp .cwp-ob-cwgo p { margin: 0; text-align: center; font-size: 13px; color: var(--c-text-2); }
.cwp .cwp-ob-cwbtn { display: flex; align-items: center; justify-content: center; gap: 10px; height: 44px; border: 1px solid var(--c-ink); border-radius: 8px; background: #fff; color: var(--c-ink); font: inherit; font-size: 15px; font-weight: 600; cursor: pointer; }
.cwp .cwp-ob-cwbtn:hover { background: var(--c-surface-2); }
.cwp .cwp-ob-cwbtn .cwx-logo-mark { width: 20px; height: 20px; font-size: 9px; border-radius: 5px; background: var(--c-primary); }
.cwp .cwp-ob-whobox { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #bfe3c6; background: var(--c-success-bg); border-radius: 8px; }
.cwp .cwp-ob-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--c-primary); color: #fff; font-weight: 700; font-size: 13px; display: grid; place-items: center; flex-shrink: 0; }
.cwp .cwp-ob-whobox-t { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: var(--c-ink); }
.cwp .cwp-ob-whobox-s { font-size: 13px; color: var(--c-text-2); overflow-wrap: anywhere; }
.cwp .cwp-ob-ok { width: 16px; height: 16px; padding: 2px; border-radius: 50%; background: var(--c-success); color: #fff; flex-shrink: 0; box-sizing: border-box; }
.cwp .cwp-ob-wait-row { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--c-text-2); padding: 2px; }
.cwp .cwp-ob-cofields { display: grid; grid-template-columns: minmax(0, 1fr) 140px; gap: 12px; }
.cwp .cwp-ob-note { margin: 0; font-size: 14px; line-height: 1.5; color: var(--c-text-2); }
.cwp .cwp-ob-rule { height: 1px; background: var(--c-line); }
@media (max-width: 520px) { .cwp .cwp-ob-cofields { grid-template-columns: 1fr; } }
.cwp .cwx-left { display: flex; flex-direction: column; padding: 18px 32px 32px; min-width: 0; }
.cwp .cwx-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.cwp .cwx-logo { display: inline-flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; color: #2b4c7e; }
.cwp .cwx-logo-mark { width: 26px; height: 26px; border-radius: 6px; background: #4a8fd8; color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 700; }
.cwp .cwx-form { width: 100%; max-width: 360px; margin: auto; padding: 32px 0 24px; }
.cwp .cwx-demo { margin: 0 0 14px; padding: 8px 10px; border: 1px dashed var(--c-line-strong); border-radius: 8px; font-size: 12px; color: var(--c-text-3); line-height: 1.45; }
.cwp .cwx-ctx { margin: 0 0 18px; padding: 10px 12px; background: #eef4fb; border-radius: 8px; font-size: 13px; color: var(--c-text); line-height: 1.5; }
.cwp .cwx-h { font-size: 20px; font-weight: 600; color: var(--c-ink); margin: 0 0 16px; letter-spacing: -0.01em; }
.cwp .cwx-req { color: #e5484d; margin-right: 3px; }
.cwp .cwx-right { position: relative; display: grid; place-items: center; padding: 32px; background: linear-gradient(165deg, #dbe8f5 0%, #b4cbe3 45%, #7f9dbd 75%, #5b7896 100%); }
.cwp .cwx-claim { max-width: 360px; padding: 22px 26px; background: rgba(255, 255, 255, 0.78); border-radius: 4px; font-size: 22px; font-weight: 600; line-height: 1.35; color: #1d2a3a; }
@media (max-width: 760px) {
  .cwp .cwx { grid-template-columns: 1fr; min-height: 0; }
  .cwp .cwx-right { display: none; }
  .cwp .cwx-left { padding: 14px 16px 24px; }
  .cwp .cwx-form { padding-top: 20px; }
}
.cwp .cwp-ob-notice { margin: 0 0 16px; padding: 10px 12px; background: var(--c-surface-2); border: 1px solid var(--c-line-strong); border-radius: 8px; font-size: 13px; color: var(--c-text); line-height: 1.55; outline: none; }
.cwp .cwp-ob-wait { margin: 14px 0 0; font-size: 13px; color: var(--c-text-2); line-height: 1.55; }
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

Object.assign(window, { PortalCwAuth, PortalObDemo, obDemoStage, obDemoState, obDemoLabel, PortalOnboarding, PortalErpSetup, PortalErpRun, PortalPvStepNav, PortalPvNote, PV_SCREENS, pvScreenLabel, obDemoSkip, obSharingText, obMonthEnd, obLastMonth, obFmt, OB_DEMO_PW, obPwHash, PORTAL_OB_CSS });
