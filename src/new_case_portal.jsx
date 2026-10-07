// Ny sag-guiden og kundeportalen (det kunden ser på Crediwire).
// Begge læser materialekataloget og punkternes tilstand fra window.CW
// (src/case_state.js), så portalen, kundens statusside, "Udestående fra
// kunden" og Dokumenter altid viser det samme.
//
// Ny sag-guiden skriver aldrig i en eksisterende sag: den opretter en ny
// kladdesag med CW.addDemoCase og sender ikke noget.
// Kundeportalen er også rådgiverens "Kundeside": <CustomerPortal preview back={luk}/>.

// Udfylder {navn}-pladsholdere efter oversættelse: ncFill(t('Frist {date}'), { date })
function ncFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? vars[k] : m));
}
const ncCvrDigits = (s) => String(s || '').replace(/\D/g, '');
// Navn uden selskabsform, så "Nordhavn Composite A/S" og "... ApS" er samme virksomhed
const ncCompanyKey = (s) => String(s || '').toLowerCase().replace(/\s+(a\/s|aps|i\/s|p\/s|ivs)$/, '').trim();
const ncFirstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const NC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * "4.500.000", "4,500,000", "4,5 mio.", "4.5m", "DKK 4500000" -> 4500000. Alt andet -> null.
 * Punktum og komma efterfulgt af grupper på tre cifre er tusindtalsskilletegn (dansk
 * og engelsk skrivemåde); ellers er et enkelt punktum eller komma decimaltegnet.
 */
function ncParseAmount(s) {
  let x = String(s || '').trim().toLowerCase().replace(/^(dkk|kr\.?)/, '').replace(/(dkk|kr\.?)$/, '').replace(/\s/g, '');
  let mult = 1;
  const m = x.match(/^(.*?)(mio\.?|m)$/);
  if (m) { x = m[1]; mult = 1e6; }
  if (!m && /^\d{1,3}([.,])\d{3}(\1\d{3})*$/.test(x)) x = x.replace(/[.,]/g, '');
  else if (/^\d+[.,]\d+$/.test(x)) x = x.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(x)) return null;
  const v = parseFloat(x) * mult;
  return v > 0 ? v : null;
}
const ncFmtDKK = (v) => 'DKK ' + Math.round(v).toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK');

// Virksomheder demoen kender: sagens egen (DATA.COMPANY), dem fra sagslisten og
// porteføljens kunder (DATA.PORTFOLIO). Guiden slår kun op blandt dem.
function ncKnownCompanies() {
  const C = DATA.COMPANY;
  const list = [{ key: ncCompanyKey(C.name), name: C.name, cvr: C.cvr, primary: true }];
  const add = (name, cvr, extra) => {
    const k = ncCompanyKey(name);
    const hit = list.find(x => x.key === k);
    if (hit) Object.assign(hit, extra || {}, { name: hit.name, cvr: hit.cvr || cvr });
    else list.push(Object.assign({ key: k, name, cvr, primary: false }, extra || {}));
  };
  (DATA.CASES || []).forEach(c => add(c.name, c.cvr));
  (DATA.PORTFOLIO || []).forEach(p => add(p.name, p.cvr, { portfolio: true, dept: p.dept, branche: p.branche }));
  return list;
}
// Sagstype ud fra en værdi ('grow'), et dansk navn ('Vækstlån') eller et oversat navn
function ncTypeFrom(x) {
  const s = String(x || '').trim().toLowerCase();
  if (!s) return null;
  return NC_CASE_TYPES.find(o => o.v === s || o.l.toLowerCase() === s || t(o.l).toLowerCase() === s) || null;
}
function ncOpenCasesFor(company) {
  const k = ncCompanyKey(company.name);
  return (DATA.CASES || []).filter(c => ncCompanyKey(c.name) === k && !c.archived && !['Approved', 'Declined'].includes(c.status));
}

// Sagstyper. basis: hvilket beløb der spørges om. Ved kautioner er det bankens
// facilitet (EIFO kautionerer for en andel af den); ved lån er det lånebeløbet.
const NC_CASE_TYPES = [
  { v: 'export', l: 'Eksportkaution', basis: 'facility', d: 'EIFO kautionerer for en del af bankens facilitet til eksport.' },
  { v: 'op', l: 'Driftskredit', basis: 'facility', d: 'EIFO kautionerer for en del af bankens driftskredit.' },
  { v: 'grow', l: 'Vækstlån', basis: 'loan', d: 'EIFO låner direkte til virksomheden.' },
  { v: 'inv', l: 'Investeringslån', basis: 'loan', d: 'EIFO låner til en konkret investering, fx maskiner eller byggeri.' },
];
const NC_GUARANTEE_SHARE = 0.8; // EIFO's typiske andel af bankens facilitet ved kaution

// Næste ledige sagsnummer i år (sagslisten og sager oprettet i demoen)
function ncNextCaseNr() {
  const year = new Date().getFullYear();
  let max = 0;
  (DATA.CASES || []).concat(CW.demoCases()).forEach(c => {
    const m = /^(\d{4})-(\d{4})$/.exec(String(c.caseNr || ''));
    if (m && +m[1] === year && +m[2] > max) max = +m[2];
  });
  return year + '-' + String(max + 1).padStart(4, '0');
}
// Et personligt link til kundens side for en ny sag (vises kun i mailens forhåndsvisning)
function ncRequestLink(name) {
  const slug = ncCompanyKey(name).replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean).map(w => w.slice(0, 2)).join('').slice(0, 4) || 'nc';
  return 'crediwire.app/c/' + slug + '-' + Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6);
}

// Hvordan kunden leverer et punkt i portalen
const portalKind = (id) => id === 'm-interim' ? 'connect' : id === 'm-trade' ? 'trade' : 'upload';

function NcFieldError({ id, children }) {
  return <div id={id} role="alert" style={{ fontSize: 12, color: 'var(--c-danger)' }}>{children}</div>;
}
const ncHidden = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };

/* ── Ny sag-guiden ──────────────────────────────────────────────────────── */

/**
 * prefill (valgfri): { name, cvr, type?, amount? } fra en anden skærm, fx en række i
 * Porteføljeanalysen. Virksomheden vælges, hvis demoen kender den; type og beløb udfyldes.
 */
function NewCaseModal({ close, go, prefill }) {
  const ref = React.useRef(null);
  const [step, setStep] = React.useState(1);
  const [q, setQ] = React.useState('');
  const [company, setCompany] = React.useState(null);
  const [caseType, setCaseType] = React.useState(() => { const o = prefill && ncTypeFrom(prefill.type); return o ? o.v : ''; }); // påkrævet, intet forvalg
  const [amount, setAmount] = React.useState(() => {
    const a = prefill && prefill.amount;
    if (a == null || a === '') return '';
    return typeof a === 'number' ? Math.round(a).toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK') : String(a);
  });
  // Forvalget følger sagstypen (CW.defaultSelection); manual er det, rådgiveren selv har ændret
  const [manual, setManual] = React.useState({});
  const [confirmDrop, setConfirmDrop] = React.useState(null); // punkt der ventes bekræftelse på at fravælge
  const [contact, setContact] = React.useState({ name: '', role: '', email: '' });
  const [deadline, setDeadline] = React.useState(CW.workdaysFromNow(10));
  const [tried, setTried] = React.useState({}); // { [trin]: true } når "Næste" er forsøgt
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [done, setDone] = React.useState(null); // den oprettede demosag
  const caseNr = React.useMemo(() => ncNextCaseNr(), []);
  const link = React.useMemo(() => company ? ncRequestLink(company.name) : '', [company && company.key]);
  // Det guiden blev åbnet med (inkl. prefill), så luk uden egne ændringer ikke spørger.
  // Sættes ved første tegning; prefill-effekten nedenfor retter søgefeltet til virksomheden.
  const initial = React.useRef(null);
  if (initial.current === null) initial.current = { q: '', amount };

  // Læses, når der lukkes (ikke ved tegning), så en ref sat i en effekt tæller med
  const isDirty = () => !done && (step > 1 || q !== initial.current.q || amount !== initial.current.amount);
  const requestClose = () => { if (isDirty()) setConfirmClose(true); else close(); };
  CW.useDialog(ref, true, () => {
    if (confirmDrop) setConfirmDrop(null);
    else if (confirmClose) setConfirmClose(false);
    else requestClose();
  });

  const pick = (c) => {
    setCompany(c);
    setQ(c.primary ? c.cvr : c.name);
    setManual({});
    const r = c.primary ? (DATA.REQUEST_RECIPIENT || {}) : {};
    setContact({ name: r.name || '', role: (r.role || '').split(',')[0].trim(), email: r.email || '' });
  };

  // Forudfyldt fra en anden skærm: vælg virksomheden, hvis demoen kender den
  React.useEffect(() => {
    if (!prefill || (!prefill.name && !prefill.cvr)) return;
    const d = ncCvrDigits(prefill.cvr);
    const k = ncCompanyKey(prefill.name);
    const hit = ncKnownCompanies().find(c => (d.length === 8 && ncCvrDigits(c.cvr) === d) || (k && c.key === k));
    const c = hit || { key: k || d, name: String(prefill.name || prefill.cvr), cvr: prefill.cvr || '', primary: false, adhoc: true };
    pick(c);
    initial.current = { q: c.primary ? c.cvr : c.name, amount };
  }, []);

  // Søgning: 8 cifre = CVR-opslag, bogstaver = navnesøgning blandt kendte virksomheder
  const digits = ncCvrDigits(q);
  const hasLetters = /[a-zæøå]/i.test(q);
  let results = null, cvrState = null;
  if (!company) {
    if (hasLetters && q.trim().length >= 2) {
      const needle = q.trim().toLowerCase();
      results = ncKnownCompanies().filter(c => c.name.toLowerCase().includes(needle));
    } else if (!hasLetters && digits.length === 8) cvrState = 'none';
    else if (!hasLetters && digits.length > 0) cvrState = digits.length > 8 ? 'long' : 'short';
  }
  const onQuery = (v) => {
    setQ(v);
    setCompany(null);
    const d = ncCvrDigits(v);
    if (!/[a-zæøå]/i.test(v) && d.length === 8) {
      const hit = ncKnownCompanies().find(c => ncCvrDigits(c.cvr) === d);
      if (hit) { pick(hit); setQ(v); }
    }
  };
  const openCases = company ? ncOpenCasesFor(company) : [];

  const typeObj = NC_CASE_TYPES.find(x => x.v === caseType) || null;
  const amountVal = ncParseAmount(amount);
  const amountWarn = amountVal != null && (amountVal < 50000 || amountVal > 500e6) ? (amountVal < 50000 ? 'low' : 'high') : null;
  // Punkterne med mærke og "hvorfor" for den valgte sagstype. Sagens egen virksomhed
  // (Nordhavn): det der allerede ligger under Dokumenter, er ikke forvalgt, og punkter
  // for sagens røde flag peger på flaget.
  const own = !!(company && company.primary);
  const items = typeObj ? CW.itemsFor(typeObj.l, { own }) : CW.allItems();
  const sel = React.useMemo(() => Object.assign({}, typeObj ? CW.defaultSelection(typeObj.l, { own }) : {}, manual), [caseType, own, manual]);
  const selectedItems = items.filter(it => sel[it.id]);
  // Som i "Anmod om materiale": kernen og det valgte står i listen; resten ligger i
  // en fold. Sagens egen virksomhed: det, der allerede findes i sagen, har sin egen fold.
  const inCase = (it) => { const f = own ? CW.onFile(it) : null; return !!f && !f.stale; };
  const mainItems = items.filter(it => sel[it.id] || (it.tier === 'core' && !inCase(it)));
  const moreItems = items.filter(it => !mainItems.includes(it) && !inCase(it));
  const caseItems = items.filter(it => !mainItems.includes(it) && inCase(it));
  const catOf = (it) => (typeof wsMaterialCat === 'function' ? t(wsMaterialCat(it)) : '');
  const toggleItem = (it) => {
    if (sel[it.id] && it.tag === 'Anbefalet') { setConfirmDrop(it.id); return; }
    setManual(m => ({ ...m, [it.id]: !sel[it.id] }));
  };

  const emailOk = NC_EMAIL_RE.test(contact.email.trim());
  const errors = {
    1: company ? null : 'company',
    2: !caseType ? 'type' : amountVal == null ? 'amount' : selectedItems.length === 0 ? 'items' : null,
    3: contact.email.trim() && !emailOk ? 'email' : !deadline ? 'deadline' : CW.isPast(deadline) ? 'deadlinePast' : null,
  };
  const FIELD = { company: 'nc-q', type: 'nc-type-' + NC_CASE_TYPES[0].v, amount: 'nc-amount', items: 'nc-item-' + (mainItems[0] && mainItems[0].id), email: 'nc-email', deadline: 'nc-deadline', deadlinePast: 'nc-deadline' };
  const FIRST = { 1: 'nc-q', 2: 'nc-type-' + NC_CASE_TYPES[0].v, 3: 'nc-name' };
  const invalid = (k) => tried[step] && errors[step] === k;

  const next = () => {
    setTried(p => ({ ...p, [step]: true }));
    if (errors[step]) { CW.focusSoon('#' + FIELD[errors[step]]); return; }
    setStep(step + 1);
    CW.focusSoon('#' + FIRST[step + 1]);
  };
  const back = () => { setStep(step - 1); CW.focusSoon('#' + FIRST[step - 1]); };

  // Mailen kunden får, når rådgiveren sender anmodningen fra sagen. Samme skabelon som sagen.
  const to = { name: contact.name.trim(), email: contact.email.trim() };
  const mail = step === 3 && company ? CW.requestMail({ items: selectedItems, deadline: deadline && !CW.isPast(deadline) ? deadline : null, to, company: company.name, caseNr, link }) : null;

  // Sagen gemmes med EIFOs beløb (ved kaution 80 % af bankens facilitet) og med
  // anmodningen (punkter, modtager, svarfrist, link). Svarfristen er kundens frist
  // for materialet, ikke sagsfristen, så sagen får ingen sagsfrist her.
  // Guiden lukker, og den nye sag åbnes med en kvittering som toast.
  const creating = React.useRef(false); // dobbeltklik på "Opret sag" må ikke give to sager
  const create = () => {
    if (creating.current || done) return;
    setTried(p => ({ ...p, 3: true }));
    if (errors[3]) { CW.focusSoon('#' + FIELD[errors[3]]); return; }
    creating.current = true;
    const facility = typeObj.basis === 'facility' ? amountVal : null;
    const why = {}, tags = {};
    selectedItems.forEach(it => { why[it.id] = it.why; tags[it.id] = it.tag; });
    const who = { name: contact.name.trim(), role: contact.role.trim(), email: contact.email.trim() };
    const d = CW.addDemoCase({
      name: company.name, cvr: company.cvr, caseNr, own,
      type: typeObj.l, amount: facility ? Math.round(facility * NC_GUARANTEE_SHARE) : amountVal,
      facilityAmount: facility, eifoShare: facility ? NC_GUARANTEE_SHARE : null, amountBasis: typeObj.basis,
      // Dansk som i sagslisten; vis den med CW.demoCaseAmountNote(sag), der følger sproget
      amountNote: facility ? Math.round(NC_GUARANTEE_SHARE * 100) + ' % af bankens facilitet på ' + (facility / 1e6).toLocaleString('da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mio.' : null,
      risk: null, responsible: DATA.ME, lastActivityAt: new Date().toISOString(), missing: null,
      deadline: null,
      contact: who,
      request: { items: selectedItems.map(it => it.id), why, tags, deadline, to: who, link, sent: false },
    });
    setDone(d);
    openCase(d.id);
    CW.toast(t('Sagen er oprettet som kladde. Der er ikke sendt noget til kunden.'));
  };
  const openCase = (id) => { close(); go('workspace:' + id); };

  const STEP_NAMES = { 1: 'Find virksomheden', 2: 'Sag og materiale', 3: 'Kontakt og svarfrist' };

  return (
    // Fast top: modalen står samme sted på alle trin og hopper ikke, når indholdet skifter højde
    <div className="scrim" style={{ placeItems: 'start center', paddingTop: '6vh', overflowY: 'auto' }}>
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="nc-title" aria-describedby="nc-step" style={{ width: 720, maxHeight: 'calc(100vh - 12vh)' }}>
        <div className="modal-head">
          <div>
            <div className="modal-title" id="nc-title">{t('Ny sag')}</div>
            <div id="nc-step" className="muted" aria-live="polite" style={{ fontSize: 13, marginTop: 2 }}>{done ? t('Oprettet som kladde') : ncFill(t('Trin {n} af 3: {name}'), { n: step, name: t(STEP_NAMES[step]) })}</div>
          </div>
          <button className="icon-btn" onClick={requestClose} aria-label={t('Luk')}><I.X size={16}/></button>
        </div>

        <div className="modal-body" style={{ minHeight: 380 }}>
          {step === 1 && !done && (
            <div className="vstack" style={{ gap: 14 }}>
              <div className="field">
                <label htmlFor="nc-q">{t('CVR-nummer eller virksomhedsnavn')}</label>
                {/* CW.useDialog giver fokus til elementet med autofocus-attributten, som React ikke selv skriver ud */}
                <input id="nc-q" className="input input-lg" placeholder={t('fx') + ' ' + DATA.COMPANY.cvr} value={q} onChange={e => onQuery(e.target.value)} autoComplete="off"
                  aria-invalid={invalid('company') ? 'true' : undefined} aria-describedby={'nc-q-hint' + (invalid('company') ? ' nc-q-err' : '')}
                  ref={el => { if (el) el.setAttribute('autofocus', ''); }}/>
                <div id="nc-q-hint" className="muted" style={{ fontSize: 12 }}>{t('Vi finder selskabsdata automatisk fra CVR-registret.')}</div>
              </div>

              {!company && q.trim().length === 0 && (
                <div className="muted" style={{ fontSize: 12.5, textAlign: 'center', padding: 14 }}>
                  {t('Indtast CVR eller virksomhedsnavn, prøv fx')} <button type="button" className="mono" style={{ background: 'var(--c-surface-2)', padding: '3px 6px', minHeight: 24, borderRadius: 4, cursor: 'pointer', border: 0, font: 'inherit', color: 'inherit' }} onClick={() => onQuery(DATA.COMPANY.cvr)}>{DATA.COMPANY.cvr}</button>
                </div>
              )}
              {cvrState === 'short' && <div className="muted" style={{ fontSize: 12.5 }}>{t('Et CVR-nummer har 8 cifre.')}</div>}
              {cvrState === 'long' && <NcFieldError>{t('Et CVR-nummer har 8 cifre.')}</NcFieldError>}
              {cvrState === 'none' && (
                <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5 }}>
                  <b style={{ color: 'var(--c-ink)', fontWeight: 600 }}>{t('Ingen virksomhed fundet')}</b>
                  <div>{ncFill(t('Ingen kunde i porteføljen eller på sagslisten har CVR {cvr}. Demoen slår kun op blandt EIFOs egne kunder. Tjek nummeret, eller søg på navnet.'), { cvr: q.trim() })}</div>
                </div>
              )}
              {results && results.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5 }}>
                  <b style={{ color: 'var(--c-ink)', fontWeight: 600 }}>{t('Ingen virksomhed fundet')}</b>
                  <div>{ncFill(t('Ingen virksomheder matcher "{q}". Prøv en del af navnet eller CVR-nummeret.'), { q: q.trim() })}</div>
                </div>
              )}
              {results && results.length > 0 && (
                <div role="list" aria-label={t('Søgeresultater')} style={{ border: '1px solid var(--c-line)', borderRadius: 8, overflow: 'hidden' }}>
                  {results.map((c, i) => (
                    <button key={c.key} type="button" role="listitem" onClick={() => pick(c)}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 12, padding: '10px 14px', border: 0, borderTop: i ? '1px solid var(--c-line-2)' : 0, background: '#fff', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{c.name}</span>
                      <span className="mono muted" style={{ fontSize: 12 }}>CVR {c.cvr}</span>
                    </button>
                  ))}
                </div>
              )}

              {company && (
                <div className="cw-row" style={{ border: '1px solid var(--c-line)', borderRadius: 8, padding: '12px 14px', alignItems: 'center' }}>
                  <div className="cw-row-main">
                    <span>
                      <span className="cw-row-title" style={{ fontSize: 14.5 }}>{company.name}</span>
                      {!company.adhoc && <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{t('Fundet i CVR')}</span>}
                    </span>
                    <span className="cw-row-meta">
                      {company.primary ? DATA.COMPANY.address + ', ' + DATA.COMPANY.postal + ' · CVR ' + DATA.COMPANY.cvr
                        : company.adhoc ? (company.cvr ? 'CVR ' + company.cvr + ' · ' : '') + t('Ikke kunde i porteføljen endnu')
                        : 'CVR ' + company.cvr + ' · ' + t('Eksisterende kunde hos EIFO') + (company.portfolio && company.dept ? ' · ' + company.dept : '')}
                    </span>
                  </div>
                  <button type="button" className="btn-ghost-sm" onClick={() => { setCompany(null); setQ(''); CW.focusSoon('#nc-q'); }}>{t('Skift')}</button>
                </div>
              )}

              {company && openCases.length > 0 && (
                <div>
                  <div role="status" style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: 1.5 }}>
                    <b style={{ fontWeight: 600 }}>{ncFill(openCases.length === 1 ? t('{name} har allerede en åben sag.') : t('{name} har allerede {n} åbne sager.'), { name: company.name, n: openCases.length })}</b>{' '}
                    <span style={{ color: 'var(--c-text-2)' }}>{t('Opret kun en ny sag, hvis det er en ny ansøgning. Den nye sag får sit eget sagsnummer og rører ikke den åbne sag.')}</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {openCases.map(c => (
                      <div key={c.id} className="cw-row" style={{ alignItems: 'center', padding: '6px 0' }}>
                        <div className="cw-row-main" style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                          <span className="mono cw-row-title" style={{ fontSize: 13 }}>{c.caseNr}</span>
                          <span className="cw-row-meta">{t(c.type)} · {/^\d+$/.test(String(c.amount)) ? ncFmtDKK(+c.amount) : 'DKK ' + c.amount} · {c.responsible}</span>
                        </div>
                        <button type="button" className="btn-ghost-sm" onClick={() => openCase(c.id)}>{t('Åbn sagen')} <I.ArrowRight size={12}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {invalid('company') && <NcFieldError id="nc-q-err">{t('Vælg en virksomhed for at fortsætte.')}</NcFieldError>}
            </div>
          )}

          {step === 2 && !done && (
            <div className="vstack" style={{ gap: 18 }}>
              <fieldset style={{ border: 0, margin: 0, padding: 0 }} aria-describedby={invalid('type') ? 'nc-type-err' : undefined}>
                <legend style={{ fontSize: 12, color: 'var(--c-text-2)', fontWeight: 500, padding: 0, marginBottom: 6 }}>{t('Sagstype')} <span style={{ color: 'var(--c-danger)' }} aria-hidden="true">*</span><span style={ncHidden}>{t('påkrævet')}</span></legend>
                <div role="radiogroup" aria-required="true" aria-invalid={invalid('type') ? 'true' : undefined} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {NC_CASE_TYPES.map(x => (
                    <label key={x.v} style={{ display: 'flex', gap: 10, padding: '10px 12px', border: '1px solid ' + (caseType === x.v ? 'var(--c-ink)' : invalid('type') ? 'var(--c-danger)' : 'var(--c-line-strong)'), borderRadius: 8, cursor: 'pointer', background: '#fff' }}>
                      <input id={'nc-type-' + x.v} type="radio" name="nc-type" checked={caseType === x.v} onChange={() => setCaseType(x.v)} style={{ marginTop: 3 }}
                        aria-describedby={invalid('type') ? 'nc-type-err' : undefined}/>
                      <span>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{t(x.l)}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--c-text-3)', marginTop: 1, lineHeight: 1.4 }}>{t(x.d)}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {invalid('type') && <div style={{ marginTop: 6 }}><NcFieldError id="nc-type-err">{t('Vælg sagstypen, så vi ved, hvilket beløb der menes.')}</NcFieldError></div>}
              </fieldset>

              <div className="field" style={{ maxWidth: 420 }}>
                <label htmlFor="nc-amount">
                  {!typeObj ? t('Beløb (DKK)') : typeObj.basis === 'facility' ? t('Bankens facilitet (DKK)') : t('Lånebeløb fra EIFO (DKK)')} <span style={{ color: 'var(--c-danger)' }} aria-hidden="true">*</span>
                </label>
                <input id="nc-amount" className="input mono" placeholder={t('fx 4.500.000 eller 4,5 mio.')} value={amount} inputMode="decimal"
                  aria-invalid={invalid('amount') ? 'true' : undefined} aria-required="true"
                  aria-describedby={['nc-amount-hint', invalid('amount') ? 'nc-amount-err' : null, amountWarn ? 'nc-amount-warn' : null].filter(Boolean).join(' ')}
                  style={invalid('amount') ? { borderColor: 'var(--c-danger)' } : undefined}
                  onChange={e => setAmount(e.target.value)}/>
                <div id="nc-amount-hint" className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
                  {!typeObj ? t('Vælg sagstype først. Ved kaution er det bankens facilitet, ved lån det beløb, EIFO låner ud.')
                    : typeObj.basis === 'facility'
                      ? (amountVal != null
                        ? ncFill(t('{amount}. EIFO kautionerer typisk for op til 80 % af facilitetens beløb, her ca. {eifo}.'), { amount: ncFmtDKK(amountVal), eifo: ncFmtDKK(amountVal * NC_GUARANTEE_SHARE) })
                        : t('Hele bankens facilitet. EIFO kautionerer typisk for op til 80 % af den.'))
                      : (amountVal != null ? ncFmtDKK(amountVal) + '. ' + t('Det beløb, virksomheden søger at låne hos EIFO.') : t('Det beløb, virksomheden søger at låne hos EIFO.'))}
                </div>
                {invalid('amount') && <NcFieldError id="nc-amount-err">{amount.trim() ? t('Skriv beløbet som et tal, fx 4.500.000 eller 4,5 mio.') : t('Beløbet skal udfyldes.')}</NcFieldError>}
                {amountWarn && (
                  <div id="nc-amount-warn" role="status" style={{ fontSize: 12, color: 'var(--c-warn)' }}>
                    {amountWarn === 'low' ? t('Beløbet er usædvanligt lavt for en sag hos EIFO. Tjek antallet af nuller.') : t('Beløbet er usædvanligt højt. Tjek antallet af nuller.')}
                  </div>
                )}
              </div>

              <fieldset style={{ border: 0, margin: 0, padding: 0 }} aria-describedby={'nc-items-hint' + (invalid('items') ? ' nc-items-err' : '')}>
                <legend style={{ fontSize: 12, color: 'var(--c-text-2)', fontWeight: 500, marginBottom: 2, padding: 0 }}>{t('Materiale kunden skal sende')}</legend>
                <div id="nc-items-hint" className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
                  {typeObj ? t('Forvalgt ud fra sagstypen. Du kan ændre listen i sagen, før du sender.') : t('Vælg sagstypen ovenfor. Materialet og begrundelserne til kunden afhænger af produktet.')}
                </div>
                {typeObj && (
                  <div>
                    {mainItems.map(it => (
                      <React.Fragment key={it.id}>
                        <div className="cw-row lead" title={it.why ? t(it.why) : undefined} style={{ padding: '8px 0', background: confirmDrop === it.id ? 'var(--c-surface-2)' : undefined }}>
                          <input id={'nc-item-' + it.id} type="checkbox" checked={!!sel[it.id]} onChange={() => toggleItem(it)} style={{ margin: '4px 0 0', accentColor: 'var(--c-primary)' }}/>
                          <label htmlFor={'nc-item-' + it.id} className="cw-row-main" style={{ cursor: 'pointer' }}>
                            <span className="cw-row-title">{t(it.label)}</span>
                          </label>
                          <span className="cw-row-cat">{catOf(it)}</span>
                        </div>
                        {confirmDrop === it.id && (
                          <div role="alertdialog" aria-label={t('Fravælg anbefalet punkt')} style={{ margin: '0 0 8px 28px', fontSize: 12.5, color: 'var(--c-text)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 240, lineHeight: 1.5 }}>
                              <b style={{ fontWeight: 600 }}>{ncFill(t('{item} er anbefalet.'), { item: t(it.label) })}</b> <span style={{ color: 'var(--c-text-2)' }}>{t(it.why)} {t('Fravælg alligevel?')}</span>
                            </div>
                            <button type="button" className="btn btn-sm" onClick={() => setConfirmDrop(null)} autoFocus>{t('Behold')}</button>
                            <button type="button" className="btn-ghost-sm" onClick={() => { setManual(m => ({ ...m, [it.id]: false })); setConfirmDrop(null); CW.focusSoon('#nc-item-' + it.id); }}>{t('Fravælg')}</button>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                    {moreItems.length > 0 && (
                      <CWFold label={ncFill(t('Mere materiale, du kan bede om ({n})'), { n: moreItems.length })} id="nc-more">
                        {moreItems.map(it => (
                          <div key={it.id} className="cw-row" style={{ alignItems: 'center', padding: '6px 0' }}>
                            <div className="cw-row-main">
                              <span style={{ color: 'var(--c-ink)' }}>{t(it.label)}</span>
                              {it.hint && <span className="cw-row-meta">{t(it.hint)}</span>}
                            </div>
                            <button type="button" className="btn-ghost-sm" aria-label={ncFill(t('Tilføj {item}'), { item: t(it.label) })}
                              onClick={() => { setManual(m => ({ ...m, [it.id]: true })); CW.focusSoon('#nc-item-' + it.id); }}>
                              <I.Plus size={12}/> {t('Tilføj')}
                            </button>
                          </div>
                        ))}
                      </CWFold>
                    )}
                    {caseItems.length > 0 && (
                      <CWFold label={ncFill(t('Findes allerede i sag {nr} ({n})'), { nr: DATA.COMPANY.caseNr, n: caseItems.length })} id="nc-incase">
                        {caseItems.map(it => (
                          <div key={it.id} className="cw-row" style={{ alignItems: 'center', padding: '6px 0' }}>
                            <div className="cw-row-main"><span style={{ color: 'var(--c-ink)' }}>{t(it.label)}</span></div>
                            <button type="button" className="btn-ghost-sm" onClick={() => { setManual(m => ({ ...m, [it.id]: true })); CW.focusSoon('#nc-item-' + it.id); }}>{t('Bed om ny version')}</button>
                          </div>
                        ))}
                      </CWFold>
                    )}
                  </div>
                )}
                {invalid('items') && <div style={{ marginTop: 8 }}><NcFieldError id="nc-items-err">{t('Vælg mindst ét punkt.')}</NcFieldError></div>}
              </fieldset>
            </div>
          )}

          {step === 3 && !done && (
            <div className="vstack" style={{ gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--c-text-2)' }}>{t('Sagen oprettes som kladde. Der sendes ikke noget til kunden endnu.')}</div>
              <div className="grid g-2" style={{ gap: 14 }}>
                <div className="field">
                  <label htmlFor="nc-name">{t('Kontaktperson hos kunden')}</label>
                  <input id="nc-name" className="input" value={contact.name} placeholder={t('Fornavn og efternavn')} onChange={e => setContact({ ...contact, name: e.target.value })}/>
                </div>
                <div className="field">
                  <label htmlFor="nc-role">{t('Rolle')}</label>
                  <input id="nc-role" className="input" value={contact.role} placeholder={t('fx økonomichef')} onChange={e => setContact({ ...contact, role: e.target.value })}/>
                </div>
              </div>
              <div className="grid g-2" style={{ gap: 14 }}>
                <div className="field">
                  <label htmlFor="nc-email">{t('Email')}</label>
                  <input id="nc-email" className="input" type="email" value={contact.email} placeholder="navn@virksomhed.dk"
                    aria-invalid={invalid('email') ? 'true' : undefined} aria-describedby={invalid('email') ? 'nc-email-err' : undefined}
                    style={invalid('email') ? { borderColor: 'var(--c-danger)' } : undefined}
                    onChange={e => setContact({ ...contact, email: e.target.value })}/>
                  {invalid('email') && <NcFieldError id="nc-email-err">{t('Mailadressen ser ikke rigtig ud.')}</NcFieldError>}
                </div>
                <div className="field">
                  <label htmlFor="nc-deadline">{t('Svarfrist')} <span style={{ color: 'var(--c-danger)' }} aria-hidden="true">*</span></label>
                  <input id="nc-deadline" className="input mono" type="date" value={deadline} min={CW.workdaysFromNow(1)} aria-required="true"
                    aria-invalid={invalid('deadline') || invalid('deadlinePast') ? 'true' : undefined}
                    aria-describedby={invalid('deadline') || invalid('deadlinePast') ? 'nc-deadline-err' : 'nc-deadline-hint'}
                    style={invalid('deadline') || invalid('deadlinePast') ? { borderColor: 'var(--c-danger)' } : undefined}
                    onChange={e => setDeadline(e.target.value)}/>
                  {invalid('deadline') || invalid('deadlinePast')
                    ? <NcFieldError id="nc-deadline-err">{invalid('deadline') ? t('Vælg en svarfrist.') : t('Svarfristen ligger i fortiden. Vælg en dato fra i dag og frem.')}</NcFieldError>
                    : <div id="nc-deadline-hint" className="muted" style={{ fontSize: 12 }}>{deadline ? ncFill(t('{n} hverdage fra i dag'), { n: CW.workdaysBetween(new Date().toISOString(), deadline + 'T12:00:00') }) : ''}</div>}
                </div>
              </div>

              {mail && (
                <CWFold label={t('Se mailen, kunden får')} id="nc-mail">
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>{t('Den sendes først, når du sender anmodningen fra sagen.')}</div>
                  <div style={{ border: '1px solid var(--c-line)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                    <div style={{ padding: '10px 14px', background: 'var(--c-surface-2)', borderBottom: '1px solid var(--c-line)', fontSize: 12.5, display: 'grid', gridTemplateColumns: '52px 1fr', rowGap: 2 }}>
                      <span className="muted">{t('Til')}</span><span>{to.name || to.email ? (to.name ? to.name + (to.email ? ' <' + to.email + '>' : '') : to.email) : <span className="muted">{t('Kontaktperson ikke angivet endnu')}</span>}</span>
                      <span className="muted">{t('Emne')}</span><b style={{ fontWeight: 600 }}>{t('Materiale til kreditvurdering af') + ' ' + company.name}</b>
                    </div>
                    <div style={{ padding: '14px 16px', fontSize: 13, lineHeight: 1.55, color: 'var(--c-text)' }}>
                      <p style={{ margin: '0 0 8px' }}>{mail.greeting}</p>
                      <p style={{ margin: '0 0 8px' }}>{mail.intro}</p>
                      <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>
                        {mail.items.map(x => (
                          <li key={x.id} style={{ marginBottom: 3 }}>
                            <b style={{ fontWeight: 600 }}>{x.label}</b>{x.optional ? ' (' + t('valgfri') + ')' : ''}
                            <span className="muted"> · {x.why}</span>
                          </li>
                        ))}
                      </ul>
                      {mail.deadlineLine && <p style={{ margin: '0 0 12px' }}>{mail.deadlineLine}</p>}
                      <span className="btn btn-primary" style={{ pointerEvents: 'none' }} aria-hidden="true">{mail.buttonLabel} <I.ArrowRight className="ic"/></span>
                      <div className="mono muted" style={{ fontSize: 12, marginTop: 6 }}>{link}</div>
                      <p className="muted" style={{ fontSize: 12, margin: '10px 0 10px' }}>{mail.trustLine}</p>
                      <div style={{ fontSize: 12.5 }}>{mail.signature.map((l, i) => <div key={i} style={i ? { color: 'var(--c-text-2)' } : { fontWeight: 600 }}>{l}</div>)}</div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{t('Sagsnr.')} {caseNr}</div>
                    </div>
                  </div>
                </CWFold>
              )}
            </div>
          )}

          {/* Guiden lukker normalt, så snart sagen er oprettet; dette ses kun et øjeblik */}
          {done && <div role="status" style={{ fontSize: 13, color: 'var(--c-text-2)' }}>{t('Sagen er oprettet som kladde. Der er ikke sendt noget til kunden.')}</div>}
        </div>

        {!done && (
          <div className="modal-foot" style={{ alignItems: 'center' }}>
            {confirmClose ? (
              <>
                <div role="alert" style={{ flex: 1, fontSize: 13, color: 'var(--c-text)' }}>{t('Kassér det, du har indtastet?')}</div>
                <button className="btn" onClick={() => setConfirmClose(false)} autoFocus>{t('Fortsæt med sagen')}</button>
                <button className="btn btn-danger" onClick={close}>{t('Kassér')}</button>
              </>
            ) : (
              <>
                {step > 1 && <button className="btn" onClick={back}><I.ChevronLeft className="ic"/> {t('Tilbage')}</button>}
                <div style={{ flex: 1 }}/>
                <button className="btn btn-ghost" onClick={requestClose}>{t('Annullér')}</button>
                {step < 3
                  ? <button className="btn btn-primary" onClick={next}>{t('Næste')} <I.ArrowRight className="ic"/></button>
                  : <button className="btn btn-primary" onClick={create}>{t('Opret sag')}</button>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Kundeportalen ──────────────────────────────────────────────────────── */

// Portalens egen hukommelse (hvor kunden var, accepterede vilkår og genkendt
// enhed). Ligger i localStorage under kabul:, så den overlever genindlæsning
// og sprogskift og nulstilles sammen med resten af demoen.
const PORTAL_KEY = 'kabul:portal:nordhavn';
const PORTAL_SESSION_KEY = 'kabul:portal-session';
const PORTAL_DEFAULTS = { screen: 'hub', itemId: null, accepted: false, trustedUntil: null };
function portalMem() {
  try { return Object.assign({}, PORTAL_DEFAULTS, JSON.parse(localStorage.getItem(PORTAL_KEY) || '{}')); }
  catch (e) { return Object.assign({}, PORTAL_DEFAULTS); }
}
function setPortalMem(patch) {
  try { localStorage.setItem(PORTAL_KEY, JSON.stringify(Object.assign(portalMem(), patch))); } catch (e) {}
}
function portalTrusted() {
  const m = portalMem();
  if (m.trustedUntil && m.trustedUntil > new Date().toISOString()) return true;
  try { return sessionStorage.getItem(PORTAL_SESSION_KEY) === '1'; } catch (e) { return false; }
}

// Rådgiveren på sagen. Samme kilde og reserve som kundens statusside og sagen.
const PORTAL_CONTACT = (() => {
  const co = (window.DATA && DATA.COMPANY) || {};
  const a = Object.assign({ name: 'Mette Larsen', title: 'Kreditrådgiver', org: 'EIFO', phone: '+45 35 29 86 42', email: 'mette.larsen@eifo.dk' },
    (window.DATA && DATA.ADVISOR) || (co.advisor && typeof co.advisor === 'object' ? co.advisor : {}));
  a.initials = a.initials || a.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  a.first = ncFirstName(a.name);
  return a;
})();

// Punktets tilstand set fra kunden: pending | received | noted | delegated | approved | rejected
function portalStatus(id) {
  const s = CW.itemState(id);
  return s ? s.status : 'pending';
}
function portalRecipient() {
  const req = CW.request();
  const r = DATA.REQUEST_RECIPIENT || {};
  return { name: (req && req.to && req.to.name) || r.name || '', email: (req && req.to && req.to.email) || r.email || '' };
}
// "sp@nordhavncomposite.dk" -> "s…@nordhavncomposite.dk"
function portalMaskEmail(email) {
  const at = String(email || '').indexOf('@');
  return at > 0 ? email[0] + '…' + email.slice(at) : email;
}
const portalYmd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

function downloadFiles(files) {
  const ok = (files || []).filter(f => CW.fileUrl(f.id));
  if (!ok.length) { CW.notInDemo(t('Download')); return; }
  ok.forEach(f => {
    const a = document.createElement('a');
    a.href = CW.fileUrl(f.id); a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
  });
}

// Til "Udfyld alt (demo)": sagens egne demofiler med indhold (CW.demoUploadFile:
// periodetal, budget, forudsætninger, lån, ejerbog og kontrakt). Øvrige punkter
// får en lille, rigtig PDF-fil med én linje tekst, så filen kan åbnes fra
// Dokumenter som alle andre uploads.
function demoPdf(name, title) {
  const ascii = String(title).replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/Æ/g, 'Ae').replace(/Ø/g, 'Oe').replace(/Å/g, 'Aa').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '');
  const stream = 'BT /F1 16 Tf 72 770 Td (' + ascii + ') Tj 0 -24 Td /F1 10 Tf (Demodokument fra kundeportalen) Tj ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offs = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xref = pdf.length;
  pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  return new File([pdf], name, { type: 'application/pdf' });
}
const DEMO_FILE_NAMES = { 'm-annual': 'Intern_aarsrapport_2025.pdf', 'm-pitch': 'Virksomhedspraesentation.pdf', 'm-security': 'Pantebreve_og_kautioner.pdf', 'm-ownership': 'Ejeraftale.pdf', 'm-fx': 'Valutapolitik_og_terminsforretninger.pdf', 'm-group': 'Koncernsammenstilling_2025.pdf', 'm-tech': 'SaaS_noegletal_2026.pdf', 'm-lowcase': 'Foelsomhedsanalyse_budget.pdf', 'm-protocol': 'Revisionsprotokollat_2025.pdf', 'm-capital': 'Kapitalplan_og_stoetteerklaering.pdf', 'm-bizplan': 'Forretningsplan.pdf', 'm-agri': 'Effektivitetsnoegletal.pdf', 'm-pub-cvr': 'Vedtaegter.pdf', 'm-pub-market': 'Marked_og_konkurrenter.pdf', 'm-pub-product': 'Produktbeskrivelse.pdf' };
// Filnavn til et punkt uden fast navn (fx en årsrapport for et bestemt år eller materiale, rådgiveren selv har skrevet ind)
function demoFileName(it) {
  if (DEMO_FILE_NAMES[it.id]) return DEMO_FILE_NAMES[it.id];
  const base = String(t(it.label)).replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/Æ/g, 'Ae').replace(/Ø/g, 'Oe').replace(/Å/g, 'Aa')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return (base || 'Dokument') + '.pdf';
}

/* Demo: rådgiveren spiller kunden og uploader sagens demofil til ét punkt ad gangen
   (samme filer som "Udfyld alt (demo)"). Står kun i demobjælken nederst. */
const DEMO_COUNTRIES = [{ code: 'DK', name: 'Danmark', pct: 39 }, { code: 'DE', name: 'Tyskland', pct: 26 }, { code: 'GB', name: 'Storbritannien', pct: 20 }, { code: 'US', name: 'USA', pct: 15 }];
function portalDemoFileFor(it) {
  return CW.demoUploadFile(it.id) || demoPdf(demoFileName(it), t(it.label) + ' - ' + DATA.COMPANY.name);
}
function portalDemoUploadOne(it) {
  if (it.form === 'countries') {
    CW.markReceived(it.id, { by: 'kunde', files: [], note: '', answers: { countries: DEMO_COUNTRIES } });
  } else {
    const file = portalDemoFileFor(it);
    CW.markReceived(it.id, { by: 'kunde', files: CW.putFiles([file], { by: 'kunde', itemId: it.id }), note: '' });
  }
  CW.toast(ncFill(t('{item} er sendt (demo)'), { item: t(it.label) }));
}
function PortalDemoUploads({ requested }) {
  CW.useCase();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); CW.focusSoon('#cwp-demo-items-btn'); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  // Filnavnet vises, før der klikkes (navnet uden at bygge filen)
  const fileLabel = (it) => {
    if (it.form === 'countries') return t('Landefordeling udfyldes');
    return (CW.demoUploadName && CW.demoUploadName(it.id)) || demoFileName(it);
  };
  const doneLabel = { received: t('Sendt'), noted: t('Sendt'), approved: t('Godkendt'), delegated: t('Sendt videre') };
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button id="cwp-demo-items-btn" type="button" className="cwp-demo-fill" aria-expanded={open} aria-controls="cwp-demo-panel" onClick={() => setOpen(v => !v)}>
        {t('Upload demofil pr. punkt')}
      </button>
      {open && (
        <div id="cwp-demo-panel" className="cwp-demo-panel" role="group" aria-label={t('Upload demofil pr. punkt')}>
          <div className="cwp-demo-panel-head">{t('Demo: send sagens fil til ét punkt ad gangen, som om kunden havde uploadet den.')}</div>
          {requested.map(it => {
            const st = portalStatus(it.id);
            const done = doneLabel[st];
            return (
              <div key={it.id} className="cwp-demo-item">
                <div className="cwp-demo-item-main">
                  <div className="cwp-demo-item-label">{t(it.label)}</div>
                  <div className="cwp-demo-item-file" title={fileLabel(it)}>{fileLabel(it)}</div>
                </div>
                {done
                  ? <span className="cwp-demo-item-done"><I.Check size={12} aria-hidden="true"/>{done}</span>
                  : <button type="button" className="btn btn-sm" onClick={() => portalDemoUploadOne(it)}
                      aria-label={ncFill(t('Upload demofil til {item}'), { item: t(it.label) })}>
                      {st === 'rejected' ? t('Send igen') : t('Upload')}
                    </button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Regnskabssystemet (demo): samtykke, hentning og saldobalance ─────────── */

const ERP_SOURCES = [
  { id: 'ec', name: 'e-conomic', accounts: 412, agreement: '1284573' }, // demo-aftalenummer
  { id: 'bi', name: 'Billy', accounts: 186 },
  { id: 'di', name: 'Dinero', accounts: 203 },
  { id: 'md', name: 'Microsoft Dynamics', accounts: 538 },
  { id: 'xe', name: 'Xena', accounts: 241 },
  { id: 'un', name: 'Uniconta', accounts: 297 },
];
// Perioden for "år til dato": januar til og med seneste afsluttede måned, eller til
// og med den måned, kunden har valgt ved begrænset datadeling (end: 'yyyy-mm-dd')
function portalPeriodEnd(end) {
  if (end && /^\d{4}-\d{2}/.test(end)) return { y: Number(end.slice(0, 4)), m: Number(end.slice(5, 7)) - 1 };
  const d = new Date();
  let y = d.getFullYear(), m = d.getMonth() - 1;
  if (m < 0) { m = 11; y--; }
  return { y, m };
}
function portalPeriod(lang, end) {
  const { y, m } = portalPeriodEnd(end);
  const M = (lang || window.CW_LANG) === 'en'
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return (m === 0 ? M[0] : M[0] + '-' + M[m]) + ' ' + y;
}
// En rigtig saldobalance som CSV (semikolon, dansk Excel). Tallene passer til sagens
// niveau (omsætning ca. 29 mio. for årets første otte måneder), og balancen stemmer.
function portalTrialBalanceCsv(src, end) {
  const rows = [
    ['1010', 'Salg af varer, eksport', -21480000], ['1020', 'Salg af varer, Danmark', -7760000],
    ['1310', 'Vareforbrug', 15890000], ['1410', 'Fragt og told', 1120000],
    ['2210', 'Lønninger', 7940000], ['2250', 'Pension', 690000],
    ['2800', 'Lokaleomkostninger', 820000], ['2900', 'Administrationsomkostninger', 610000],
    ['3010', 'Afskrivninger', 1180000], ['3510', 'Renteudgifter, bank', 410000], ['3520', 'Renteudgifter, anpartshaverlån', 14000],
    ['5510', 'Grunde og bygninger', 9800000], ['5610', 'Produktionsanlæg og maskiner', 11200000],
    ['5810', 'Varelager', 8450000], ['5910', 'Tilgodehavender fra salg', 9920000], ['6010', 'Bank', 1140000],
    ['6810', 'Selskabskapital', -1000000],
    ['7010', 'Gæld til kreditinstitutter', -12600000], ['7110', 'Kassekredit', -3950000],
    ['7210', 'Leverandører af varer og tjenesteydelser', -5870000], ['7310', 'Anden gæld', -2310000],
    ['7410', 'Anpartshaverlån', -500000],
  ];
  const rest = rows.reduce((a, r) => a + r[2], 0);
  rows.splice(17, 0, ['6820', 'Overført resultat', -rest]);
  const now = new Date();
  const when = portalYmd(now) + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const lines = [
    'Saldobalance;' + portalPeriod('da', end),
    'Virksomhed;' + DATA.COMPANY.name + ' (CVR ' + DATA.COMPANY.cvr + ')',
    'Kilde;' + src + ', hentet ' + when + ' med læseadgang via Crediwire',
    '',
    'Konto;Kontonavn;Saldo (DKK)',
  ].concat(rows.map(r => r[0] + ';' + r[1] + ';' + r[2])).concat(['', 'I alt;;' + rows.reduce((a, r) => a + r[2], 0)]);
  const name = 'Saldobalance_' + portalPeriod('da', end).replace(' ', '_') + '_' + src.replace(/\s+/g, '-') + '.csv';
  return new File(['﻿' + lines.join('\r\n') + '\r\n'], name, { type: 'text/csv' });
}
// Debitorlisten fra regnskabssystemet. Summen er kontoen Tilgodehavender fra salg
// (5910) i saldobalancen, og de tre største kunder passer med sagens faktaark.
function portalDebtorCsv(src, end) {
  const rows = [
    ['GE Vernova', 3770000, 410000, 38], ['Vestas Wind Systems', 1640000, 0, 0], ['Siemens Gamesa', 940000, 120000, 21],
    ['Hanse Rotor GmbH', 820000, 0, 0], ['Baltic Blade Service AB', 610000, 95000, 47], ['Fyns Kompositværksted ApS', 340000, 0, 0],
    ['Øvrige kunder (24)', 1800000, 260000, 64],
  ];
  const now = new Date();
  const when = portalYmd(now) + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const lines = [
    'Debitorliste;' + portalPeriod('da', end),
    'Virksomhed;' + DATA.COMPANY.name + ' (CVR ' + DATA.COMPANY.cvr + ')',
    'Kilde;' + src + ', hentet ' + when + ' med læseadgang via Crediwire',
    '',
    'Kunde;Saldo (DKK);Heraf forfaldent (DKK);Ældste forfald (dage)',
  ].concat(rows.map(r => r.join(';'))).concat(['', 'I alt;' + rows.reduce((a, r) => a + r[1], 0) + ';' + rows.reduce((a, r) => a + r[2], 0) + ';']);
  const name = 'Debitorliste_' + portalPeriod('da', end).replace(' ', '_') + '_' + src.replace(/\s+/g, '-') + '.csv';
  return new File(['﻿' + lines.join('\r\n') + '\r\n'], name, { type: 'text/csv' });
}
/**
 * Kunden har givet læseadgang i regnskabssystemet. sharing er kundens valg fra
 * opstarten: { mode: 'ongoing' } (løbende) eller { mode: 'until', dataUntil } (tal
 * til og med en dato). Returnerer false, hvis det blev afvist (forhåndsvisning).
 */
function portalConsentNow(srcName, sharing, company) {
  const ongoing = !sharing || sharing.mode === 'ongoing';
  // Givet af en revisor eller rådgiver på kundens vegne: det står i samtykket og i historikken
  const by = company && company.advisor && company.person ? { name: company.person, role: 'helper' } : null;
  return CW.setConsent({ system: srcName, scope: ['kontoplan', 'saldobalance', 'periodetal', 'debitordata'],
    mode: ongoing ? 'ongoing' : 'until', until: ongoing ? 'løbende' : sharing.dataUntil, dataUntil: ongoing ? null : sharing.dataUntil, by });
}
/**
 * Hentningen: saldobalance og debitorliste som filer. Er Periodetal med i
 * anmodningen, markeres punktet som sendt med kilden som note (ikke som kundens
 * bemærkning). Ellers lægges filerne som andre filer fra kunden.
 */
function portalConnectNow(srcName, sharing) {
  const end = sharing && sharing.mode === 'until' ? sharing.dataUntil : null;
  const itemId = CW.requestedItems().some(it => it.id === 'm-interim') ? 'm-interim' : null;
  const metas = CW.putFiles([portalTrialBalanceCsv(srcName, end), portalDebtorCsv(srcName, end)], { by: 'kunde', itemId });
  if (!metas.length) return null;
  if (itemId) CW.markReceived(itemId, { by: 'kunde', files: metas, note: 'Hentet fra ' + srcName, noteKind: 'system' });
  else CW.addLooseUploads(metas);
  return metas[0];
}
const portalConsentUntil = (c) => !c ? '' : c.until === 'løbende'
  ? t('Løbende adgang, indtil I trækker den tilbage.')
  : c.mode === 'until'
    ? ncFill(t('EIFO har tal til og med {date} og henter ikke nyere tal. Adgangen lukker, når sagen er afgjort.'), { date: CW.fmtDate(c.until + 'T12:00:00') })
    : ncFill(t('Adgangen lukker efter kreditbeslutningen og senest {date}.'), { date: CW.fmtDate(c.until + 'T12:00:00') });

const PORTAL_CSS = `
.cwp .cwp-linkbtn { background: none; border: 0; padding: 2px 0; min-height: 24px; color: var(--color-link); text-decoration: none; cursor: pointer; font: inherit; }
.cwp .cwp-linkbtn:hover { color: var(--color-link-hover); }
.cwp .cwp-linkbtn:disabled { color: var(--c-text-3); text-decoration: none; cursor: default; }
.cwp .cwp-rowbtn { background: none; border: 0; padding: 0; margin: 0; text-align: left; font: inherit; color: inherit; cursor: pointer; flex: 1; min-width: 0; display: flex; gap: 14px; align-items: flex-start; }
.cwp .cwp-rowbtn:focus-visible, .cwp .cwp-drop:focus-visible { outline: 2px solid var(--c-primary); outline-offset: 3px; border-radius: 6px; }
.cwp input[type=checkbox], .cwp input[type=radio] { accent-color: var(--c-primary); width: 16px; height: 16px; flex-shrink: 0; }
.cwp .cwp-menuitem { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 32px; padding: 8px 10px; border: none; background: transparent; cursor: pointer; font-size: 13px; color: var(--c-text); border-radius: 5px; text-align: left; font-family: inherit; }
.cwp .cwp-menuitem:hover, .cwp .cwp-menuitem:focus-visible { background: var(--c-surface-2); outline: none; }
.cwp [tabindex="-1"]:focus { outline: none; }
.cwp .cwp-contact a { color: var(--c-text-2); white-space: nowrap; }
.cwp .cwp-contact a:hover { color: var(--c-ink); }
.cwp .cwp-lang button { min-height: 24px !important; min-width: 32px !important; font-size: 11.5px !important; }
.cwp .cwp-row-meta { font-size: 12.5px; color: var(--c-text-2); margin-top: 2px; line-height: 1.45; }
.cwp .cwp-row-cat { font-size: 12px; color: var(--c-text-3); white-space: nowrap; margin-top: 3px; }
.cwp .cwp-row-pill { white-space: nowrap; margin-right: 4px; }
.cwp .cwp-row-pill-in { display: none; margin-top: 6px; }
@media (max-width: 600px) {
  .cwp .cwp-row-pill-in { display: block; }
  .cwp .cwp-row-pill-side { display: none; }
}
.cwp .cwp-demo { position: fixed; left: 18px; right: 18px; bottom: 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; pointer-events: none; z-index: 50; }
.cwp .cwp-demo > * { pointer-events: auto; }
.cwp .cwp-demo-back { background: var(--c-primary); color: #fff; border: none; padding: 8px 12px; min-height: 32px; border-radius: 999px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px; box-shadow: var(--shadow-lg); font-family: inherit; }
.cwp .cwp-demo-fill { background: transparent; color: var(--c-text-4); border: none; padding: 4px 8px; min-height: 28px; border-radius: 4px; cursor: pointer; font-size: 12px; font-family: inherit; }
/* Stiplet kant: kortet er kun for rådgiveren i forhåndsvisningen; kunden ser det ikke (som demopanelet) */
.cwp .cwp-pvob { max-width: 760px; margin: 0 auto 16px; padding: 16px 18px; display: flex; align-items: center; gap: 14px; border: 1px solid rgba(183, 121, 31, 0.28); border-radius: 12px; background: var(--c-warn-bg); }
.cwp .cwp-pvob-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c-warn); flex-shrink: 0; }
.cwp .cwp-pvob-text { flex: 1; min-width: 0; }
.cwp .cwp-pvob-title { margin: 0; font-size: 14.5px; font-weight: 600; color: var(--c-ink); }
.cwp .cwp-pvob-sub { margin-top: 2px; font-size: 13px; color: var(--c-text-2); }
.cwp .cwp-pvob .btn { background: #fff; flex-shrink: 0; }
.cwp .cwp-pv-upnote { margin: 0 0 12px; padding: 10px 14px; border: 1.5px dashed var(--c-line-strong); border-radius: 10px; font-size: 13px; line-height: 1.5; color: var(--c-text-2); }
.cwp .cwp-demo-right { display: flex; align-items: center; gap: 4px; position: relative; }
.cwp .cwp-demo-fill[aria-expanded="true"] { color: var(--c-ink); background: var(--c-surface-2); }
.cwp .cwp-demo-panel { position: absolute; right: 0; bottom: calc(100% + 8px); width: 380px; max-width: calc(100vw - 36px); max-height: min(60vh, 520px); overflow: auto; padding: 6px; background: var(--c-surface); border: 1px dashed var(--c-line-strong); border-radius: 10px; box-shadow: var(--shadow-lg); }
.cwp .cwp-demo-panel-head { padding: 6px 8px 8px; font-size: 12px; color: var(--c-text-3); line-height: 1.45; }
.cwp .cwp-demo-item { display: flex; align-items: center; gap: 10px; padding: 7px 8px; border-top: 1px solid var(--c-line-2); }
.cwp .cwp-demo-item-main { flex: 1; min-width: 0; }
.cwp .cwp-demo-item-label { font-size: 13px; color: var(--c-ink); }
.cwp .cwp-demo-item-file { font-size: 11.5px; color: var(--c-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cwp .cwp-demo-item-done { font-size: 12px; color: var(--c-success); white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; }
@keyframes cwp-spin { to { transform: rotate(360deg); } }
.cwp .cwp-land { max-width: 560px; margin: 24px auto 0; text-align: left; }
.cwp .cwp-land-pill { display: inline-block; padding: 4px 10px; background: var(--c-surface-2); border-radius: 999px; font-size: 12px; color: var(--c-text-2); font-weight: 500; }
.cwp .cwp-land-h { font-size: 32px; font-weight: 600; letter-spacing: -0.02em; color: var(--c-ink); margin: 18px 0 10px; line-height: 1.15; }
.cwp .cwp-land-lead { font-size: 15px; color: var(--c-text-2); line-height: 1.55; margin: 0 0 18px; }
.cwp .cwp-land-why { background: var(--c-surface-2); border-radius: 12px; padding: 14px 16px; margin-bottom: 18px; display: flex; gap: 12px; font-size: 13px; color: var(--c-text); line-height: 1.55; }
.cwp .cwp-land-how { background: #fff; border: 1px solid var(--c-line); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
.cwp .cwp-land-how ul { list-style: none; margin: 0; padding: 0; }
.cwp .cwp-land-how li { display: flex; gap: 12px; padding: 8px 0; align-items: center; font-size: 13.5px; }
.cwp .cwp-land-ic { width: 28px; height: 28px; border-radius: 7px; background: var(--c-surface-2); display: grid; place-items: center; color: var(--c-text-2); flex-shrink: 0; }
@media (max-width: 600px) {
  .cwp .cwp-main { padding: 18px 16px 24px !important; }
  .cwp .cwp-main.cwp-main-cw { padding: 0 !important; }
  .cwp .cwp-head-inner { padding: 10px 16px !important; gap: 10px !important; }
  .cwp .cwp-hide-sm { display: none !important; }
  .cwp .cwp-stack { flex-direction: column !important; align-items: stretch !important; }
  .cwp .grid.g-2 { grid-template-columns: 1fr !important; }
  .cwp h1 { font-size: 22px !important; }
  .cwp .cwp-row { padding: 14px !important; flex-wrap: wrap; }
  .cwp .cwp-row-side { margin-left: auto; }
  .cwp .cwp-row-side.wide { width: 100%; margin: -14px 0 -10px 28px; }
  .cwp .cwp-receipt { margin: 0 14px 14px !important; }
  .cwp .modal { max-width: calc(100vw - 24px) !important; }
  .cwp .btn, .cwp .btn-ghost-sm { min-height: 44px; }
  .cwp .cw-fold { min-height: 44px; }
  .cwp .cwp-menuitem { min-height: 44px; }
  .cwp .cwp-lang button { min-height: 44px !important; min-width: 44px !important; }
  .cwp .cwp-pvob { padding: 14px 16px; flex-wrap: wrap; }
  .cwp .cwp-land { margin-top: 4px; }
  .cwp .cwp-land-how { padding: 16px; }
  .cwp .cwp-demo { position: static; padding: 8px 16px 24px; flex-wrap: wrap; }
  .cwp .cwp-demo-back, .cwp .cwp-demo-fill { min-height: 44px; }
}
`;

// External customer-facing upload portal - multi-screen flow
//
// Kunden: landingssiden fra invitationslinket (PortalLanding), Crediwires egen
// side til opret bruger eller log ind (PortalCwAuth, demo af omstillingen), så
// portalens trin Bruger og Datadeling (PortalOnboarding), derefter oversigten.
//
// Forhåndsvisningen (preview, rådgiverens "Kundeside"): rådgiveren kan gå mellem
// alle kundens skærme med bjælken øverst og knapperne under kortet, men intet
// gemmes. Alt mærket data-cust-act stoppes her og forklares i PortalPvNote, og
// CW afviser selv kundehandlinger, så længe forhåndsvisningen er åben.
// To spor i forhåndsvisningen: Kundeside (flow = false) åbner altid på kundens
// oversigt med en statusboks øverst, hvis kunden ikke er færdig med opstarten.
// Kundeflow (flow = true, demo) viser de skærme, kunden kommer igennem, fra
// landingssiden (eller flowStart) med skærmrækken øverst. I begge vælges rollen
// øverst: Rådgiver (forhåndsvisningen som ovenfor) eller Kunde, hvor portalen virker
// som for kunden: svar, filer og beskeder gemmes, som om kunden havde sendt dem.
// Kundeside og Kundeflow: den valgte rolle (huskes i browseren). 'kunde' slår forhåndsvisningens spærre fra
function portalFlowRole() {
  try { return localStorage.getItem('kabul:flow-role') === 'kunde' ? 'kunde' : 'rådgiver'; } catch (e) { return 'rådgiver'; }
}
function CustomerPortal({ back, preview = false, flow = false, flowStart = null, onOpenFlow = null }) {
  CW.useCase();
  const rootRef = React.useRef(null);
  const req = CW.request();
  const hasReq = !!req || preview;
  const ob = CW.onboarding();
  // Gemte demotilstande fra før opstarten fandtes: vilkår accepteret på velkomsten = opstarten er gjort
  const legacy = !ob.account && !!portalMem().accepted;
  const [authed, setAuthed] = React.useState(() => portalTrusted());
  const loggedIn = !preview && authed && (!!ob.account || legacy);
  // Landingssiden ("Kære …") vises først, indtil der er en bruger; har kunden en, går linket til Log ind
  const [landed, setLanded] = React.useState(false);
  // Fra trinnet Bruger ("Fortsæt med Crediwire") sendes kunden til Crediwires side; "Tilbage til Materiale til EIFO" lukker den
  const [cwAuth, setCwAuth] = React.useState(false);
  // Kendt Crediwire-bruger, der allerede har virksomheden: Bruger viser "tjekker" og sender videre til datadeling
  const [obArrive, setObArrive] = React.useState(false);
  // Demoknapperne på trinnet Bruger: i Kundeflow et stadie, der kun vises; demoKey tegner trinnet forfra
  const [obDemo, setObDemo] = React.useState(null);
  const [demoKey, setDemoKey] = React.useState(0);
  const landing = !preview && !loggedIn && !ob.account && !legacy && !landed;
  // Afslået eller indstillet sag: kunden kan ikke længere sende noget
  const lock = CW.customerLock();
  // Opstarten: det trin, kunden mangler, eller et tidligere, kunden er gået tilbage til
  const [obView, setObView] = React.useState(null);
  const obNext = legacy || lock ? null : CW.onboardingStep(ob);
  const obStep = !preview && loggedIn ? (obView || obNext) : null;

  // Forhåndsvisningen starter, hvor kunden er: ingen bruger endnu, et trin i opstarten, eller oversigten
  const [pvOb, setPvOb] = React.useState(() => {
    if (!preview || !flow || lock === 'declined') return null;
    const k = flowStart || 'landing';
    // Har kunden ingen bruger endnu, starter Kundeflow på landingssiden
    if (k === 'account' && !ob.account) return 'landing';
    return ['hub', 'material'].includes(k) ? null : k;
  });
  const [pvNote, setPvNote] = React.useState(null);
  // Hvem bruger siden? Rådgiveren (forhåndsvisning, spærret) eller kunden (alt virker)
  const [flowRole, setFlowRoleRaw] = React.useState(() => preview ? portalFlowRole() : 'rådgiver');
  // Spærren skiftes med det samme (før siden tegnes igen), så alt, der spørger CW.isPreview(),
  // fx mail-afkrydsningen i dialogen og "Skriv som rådgiver", følger rollen i samme tegning
  const setFlowRole = (r) => { CW.setPreview(r !== 'kunde'); setFlowRoleRaw(r); setPvNote(null); try { localStorage.setItem('kabul:flow-role', r); } catch (e) {} };
  const asAdvisor = preview && flowRole !== 'kunde';
  // Spærren sættes, før noget i portalen tegnes (fx dialogen, der ellers markerer beskeder som læst af kunden)
  React.useState(() => { if (asAdvisor) CW.setPreview(true); return true; });

  // Startskærm: kundens egen (overlever genindlæsning). Forhåndsvisningen følger
  // kunden, men husker ikke selv noget.
  const initial = React.useMemo(() => {
    const m = portalMem();
    const itemScreens = ['upload', 'connect', 'trade', 'erp'];
    let s = ['hub', 'status'].concat(itemScreens).includes(m.screen) ? m.screen : 'hub';
    let id = null;
    if (itemScreens.includes(s) && s !== 'erp') {
      if (!preview && m.itemId && CW.requestedItems().some(it => it.id === m.itemId)) id = m.itemId; else s = 'hub';
    }
    // Forhåndsvisningen (Kundeside og Kundeflow) åbner på oversigten
    if (preview && s !== 'status') s = 'hub';
    if (preview && !flow) s = 'hub';
    return { s, id };
  }, []);
  const [screen, setScreenRaw] = React.useState(initial.s);
  const [activeId, setActiveId] = React.useState(initial.id);
  const [bundle, setBundle] = React.useState(null); // null | { preselect }
  const [otherOpen, setOtherOpen] = React.useState(false);
  const [justSubmitted, setJustSubmitted] = React.useState(false);
  const returnTo = React.useRef(null);

  const go = (s, itemId = null, backTo = null) => {
    returnTo.current = backTo;
    if (!preview) setPortalMem({ screen: s, itemId });
    setActiveId(itemId);
    setScreenRaw(s);
  };

  // Forhåndsvisningen: kundehandlinger afvises, og rådgiverens egne beskeder
  // (toasts) skjules, så længe kundens side vises.
  React.useEffect(() => {
    if (!asAdvisor) return;
    CW.setPreview(true);
    const onBlocked = (e) => setPvNote({ what: e.detail || '', n: Date.now() });
    window.addEventListener('cw-preview-blocked', onBlocked);
    return () => { window.removeEventListener('cw-preview-blocked', onBlocked); CW.setPreview(false); };
  }, [asAdvisor]);
  // Stopper klik, slip og formularer på alt, der er kundens handling (data-cust-act)
  const pvStop = (e, fallback) => {
    // Uploadfelterne i punkterne (og knappen, der sender filerne) virker: rådgiveren uploader på kundens vegne
    if (e.target && e.target.closest && e.target.closest('[data-pv-allow]')) return;
    // Links i teksten (fx "brugsvilkår") er ikke kundens handling, selv om de står i en afkrydsning
    const link = e.type === 'click' && e.target && e.target.closest && e.target.closest('.cwp-linkbtn');
    if (link && !link.hasAttribute('data-cust-act')) return;
    const el = (e.target && e.target.closest && e.target.closest('[data-cust-act]'))
      || (e.type === 'submit' && e.target.querySelector && e.target.querySelector('[data-cust-act]'));
    if (!el && !fallback) return;
    e.preventDefault(); e.stopPropagation();
    setPvNote({ what: el ? el.getAttribute('data-cust-act') : fallback, n: Date.now() });
  };
  const pvHandlers = asAdvisor ? {
    onClickCapture: (e) => pvStop(e),
    onDropCapture: (e) => pvStop(e, 'upload'),
    onSubmitCapture: (e) => pvStop(e, 'send'),
  } : {};

  // Portalen er kundens side og skal kunne bruges på en telefon. index.html låser
  // viewporten til 1280 px for rådgiverværktøjet; her slås det fra, så længe portalen vises.
  React.useEffect(() => {
    if (preview) return;
    const m = document.querySelector('meta[name=viewport]');
    if (!m) return;
    const prev = m.getAttribute('content');
    m.setAttribute('content', 'width=device-width, initial-scale=1');
    return () => m.setAttribute('content', prev);
  }, []);

  const requested = CW.requestedItems();
  const view = screen;
  const active = activeId ? CW.itemById(activeId) : null;
  // "Nyt" og "1 nyt svar" gælder den visning, hvor kunden så dem første gang
  const fresh = useCsFreshThreads(asAdvisor, view + ':' + (activeId || ''));

  // Sidetitel pr. trin, fx "Intern årsrapport · Materiale til EIFO"
  const pageName = !hasReq && lock !== 'declined' ? t('Ingen aktiv anmodning')
    : landing ? t('Anmodning fra EIFO')
    : !loggedIn ? (!cwAuth ? ncFill(t('Opstart: {step}'), { step: pvScreenLabel('account') }) : ob.account ? t('Crediwire: Log ind') : t('Crediwire: Opret bruger'))
    : lock === 'declined' ? t('Sagen er afsluttet')
    : obStep ? ncFill(t('Opstart: {step}'), { step: pvScreenLabel(obStep) })
    : view === 'hub' ? t('Oversigt')
    : view === 'status' ? t('Status') : view === 'erp' ? t('Regnskabssystem') : active ? t(active.label) : t('Oversigt');
  // Titlen sættes ikke tilbage, når portalen lukkes: appen sætter selv titlen for den nye rute
  // (en tilbagesætning her kom efter appens og gav fx "Kundeportal" på en sag)
  React.useEffect(() => { if (!preview) document.title = pageName + ' · ' + t('Materiale til EIFO'); }, [pageName]);

  // Fokus ved skift af visning: til overskriften, eller tilbage til punktet man kom fra
  const firstRun = React.useRef(true);
  React.useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const backTo = returnTo.current; returnTo.current = null;
    const root = rootRef.current;
    if (!root) return;
    if (!backTo) { if (preview) root.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0); }
    const id = setTimeout(() => {
      const el = backTo ? root.querySelector('[data-row="' + backTo + '"] button') : root.querySelector('.cwp-main h1');
      if (!el) return;
      if (!el.matches('button,a,input,textarea,select')) el.setAttribute('tabindex', '-1');
      try { el.focus({ preventScroll: !backTo }); } catch (e) {}
      if (backTo) el.scrollIntoView({ block: 'center' });
    }, 40);
    return () => clearTimeout(id);
  }, [view, activeId, loggedIn, obStep, pvOb, cwAuth, landing]);

  const openItem = (id) => go(portalKind(id), id);
  const toHub = (fromId) => go('hub', null, fromId || null);

  // Kunden afslutter et uploadpunkt: filerne registreres i CW og punktet markeres som sendt
  const finish = (id, files, note) => {
    const prev = CW.itemState(id);
    // På Kundeside (forhåndsvisning) uploader rådgiveren på kundens vegne: filen står som rådgiverens
    const by = CW.isPreview() ? 'rådgiver' : 'kunde';
    // Svar på rådgiverens spørgsmål uden ny fil: det, der allerede er sendt, gælder stadig
    if (prev && prev.status === 'rejected' && !(files || []).length && note) {
      if (!CW.answerItem(id, note, { by })) return;
      csClearDraft(id);
      CW.toast(by === 'rådgiver' ? t('Svaret er gemt på kundens vegne') : ncFill(t('Svaret er sendt til {name}'), { name: PORTAL_CONTACT.first }));
      toHub(id);
      return;
    }
    const metas = (files || []).map(f => (f instanceof File ? CW.putFiles([f], { by, itemId: id })[0] : f));
    csClearDraft(id);
    const noteOnly = by === 'rådgiver' && !metas.length && !!(note || '').trim() && !(prev && prev.status === 'received');
    const changed = metas.length || noteOnly || (prev && prev.status === 'received' && (note || '') !== (prev.note || ''));
    if (changed) {
      const stale = prev && (prev.status === 'noted' || prev.status === 'rejected' || prev.status === 'delegated');
      CW.markReceived(id, { by, files: metas, note: note != null ? note : (stale ? '' : undefined), noteKind: noteOnly ? 'ikke-relevant' : undefined });
      CW.toast(by === 'rådgiver'
        ? ncFill(t('{item} er uploadet på kundens vegne'), { item: t(CW.itemById(id).label) })
        : ncFill(t('{item} er sendt til {name}'), { item: t(CW.itemById(id).label), name: PORTAL_CONTACT.first }));
    }
    toHub(id);
  };

  const fillAll = () => {
    requested.forEach(it => {
      const st = portalStatus(it.id);
      if (st === 'received' || st === 'approved' || st === 'noted') return;
      if (it.form === 'countries') {
        CW.markReceived(it.id, { by: 'kunde', files: [], note: '', answers: { countries: [{ code: 'DK', name: 'Danmark', pct: 39 }, { code: 'DE', name: 'Tyskland', pct: 26 }, { code: 'GB', name: 'Storbritannien', pct: 20 }, { code: 'US', name: 'USA', pct: 15 }] } });
        return;
      }
      // Periodetallene kan stadig hentes fra regnskabssystemet i punktet; demoen uploader filen
      const file = CW.demoUploadFile(it.id) || demoPdf(demoFileName(it), t(it.label) + ' - ' + DATA.COMPANY.name);
      CW.markReceived(it.id, { by: 'kunde', files: CW.putFiles([file], { by: 'kunde', itemId: it.id }), note: '' });
    });
    toHub();
  };

  // Dobbeltklik på "Vi er færdige" må ikke færdigmelde to gange
  const submitting = React.useRef(false);
  const submit = () => {
    if (submitting.current) return;
    submitting.current = true;
    CW.customerSubmit();
    setJustSubmitted(true);
    go('status');
    setTimeout(() => { submitting.current = false; }, 600);
  };

  const delegate = (ids, contact, kind) => {
    CW.markDelegated(ids, { name: contact.name, email: contact.email, role: kind === 'bank' ? 'bank' : 'revisor' });
    setBundle(null);
    CW.toast(ncFill(t('Sendt til {name}. I kan følge med her på oversigten.'), { name: contact.name }));
  };

  // Logget ind: "Husk mig" husker enheden i 30 dage, ellers gælder det fanen
  const onAuthed = (remember, arrive) => {
    if (remember) setPortalMem({ trustedUntil: new Date(Date.now() + 30 * 864e5).toISOString() });
    else { try { sessionStorage.setItem(PORTAL_SESSION_KEY, '1'); } catch (e) {} }
    setCwAuth(false);
    setObArrive(!!arrive);
    setObView(arrive ? 'account' : null);
    setAuthed(true);
  };
  const logout = () => {
    setPortalMem({ trustedUntil: null });
    try { sessionStorage.removeItem(PORTAL_SESSION_KEY); } catch (e) {}
    // Tilbage til trinnet Bruger; Crediwire afgør selv, om det er Opret bruger eller Log ind
    setCwAuth(false);
    setObArrive(false);
    setObView(null);
    setAuthed(false);
  };
  // Opstarten er færdig (eller kunden sendte tallene selv): oversigten med materialet
  const onboardingDone = () => { setObView(null); go('hub'); };
  // Demo (præsentatoren er kunden): log ind og spring opstarten over
  const demoSkip = () => {
    if (!ob.doneAt && !legacy) obDemoSkip();
    try { sessionStorage.setItem(PORTAL_SESSION_KEY, '1'); } catch (e) {}
    setObView(null);
    setAuthed(true);
    go('hub');
  };

  // Forhåndsvisningens navigation: opstartens skærme eller portalens egne
  const pvGo = (k) => {
    setPvNote(null);
    setObDemo(null);
    if (k === 'material') k = 'hub';
    if (k === 'hub') { setPvOb(null); go(k); }
    else setPvOb(k);
  };
  const pvCurrent = pvOb || (view === 'hub' ? view : null);

  const Main = preview ? 'div' : 'main';
  const Header = preview ? 'div' : 'header';
  // Sagsnummer, produkt og beløb står først i toppen, når kunden er logget ind (eller i forhåndsvisningen)
  const showMeta = preview ? !pvOb : loggedIn && !obStep;
  const pvNav = null;   // forrige/næste-bjælken (PortalPvStepNav) er fjernet; sæt den tilbage her, hvis den skal bruges igen
  // Crediwires egen login-side: hele skærmen, uden portalens top (kunden er "sendt videre")
  const cwPage = hasReq && lock !== 'declined' && (preview ? (pvOb === 'signup' || pvOb === 'login') : (!loggedIn && !landing && cwAuth));

  // Demo: spring mellem stadierne i trinnet Bruger. I portalen gemmes stadiet (som om kunden var
  // kommet tilbage fra Crediwire); i Kundeflow vises det kun
  const pickObDemo = (k) => {
    setDemoKey(n => n + 1);
    if (preview) { setObDemo(k); setPvNote(null); setPvOb('account'); return; }
    if (CW.setOnboarding(obDemoState(k), ncFill(t('Demo: trinnet Bruger som "{stage}"'), { stage: obDemoLabel(k) })) === false) return;
    setCwAuth(false);
    if (k === 'pre') { logout(); return; }
    onAuthed(false, k === 'knownCo');
  };
  const obDemoBar = <PortalObDemo preview={preview} current={preview && obDemo ? obDemo : obDemoStage(ob, preview ? !!ob.account : loggedIn)} onPick={pickObDemo}/>;

  let content;
  if (!hasReq && lock !== 'declined') content = <PortalNoRequest/>;
  else if (preview && pvOb === 'landing' && lock !== 'declined') content = <PortalLanding onStart={() => pvGo('account')}/>;
  else if (cwPage && preview) content = <PortalCwAuth key={pvOb} mode={pvOb} preview onAuthed={() => {}} onBack={() => pvGo('account')}/>;
  else if (preview && pvOb && lock !== 'declined') content = <PortalOnboarding key={'pv' + demoKey} step={pvOb} setStep={pvGo} preview
    pre={obDemo ? obDemo === 'pre' : !ob.account} demo={obDemo ? obDemoState(obDemo) : undefined} arrive={obDemo === 'knownCo'}
    onContinue={() => pvGo((obDemo ? obDemo !== 'pre' : !!ob.account) ? 'login' : 'signup')} onFinished={() => pvGo('hub')} onJump={pvGo}
    footer={pvOb === 'account' ? obDemoBar : pvNav}/>;
  else if (lock === 'declined') content = <PortalClosed/>;
  else if (landing) content = <PortalLanding onStart={() => setLanded(true)}/>;
  else if (!preview && !loggedIn && !cwAuth) content = <PortalOnboarding key={'pre' + demoKey} step="account" pre setStep={() => {}} onFinished={() => {}} onContinue={() => setCwAuth(true)} footer={obDemoBar}/>;
  else if (!preview && !loggedIn) content = <PortalCwAuth onAuthed={onAuthed} onBack={() => setCwAuth(false)}/>;
  else if (obStep) content = <PortalOnboarding key={obStep + demoKey} step={obStep} arrive={obArrive} setStep={(k) => { setObArrive(false); setObView(k); }} onFinished={onboardingDone} onLogout={logout}
    footer={obStep === 'account' ? obDemoBar : undefined}/>;
  else if (view === 'upload' && active && !lock) content = <PortalUpload item={active} onBack={() => toHub(active.id)} onFinish={(files, note) => finish(active.id, files, note)} onNoted={() => toHub(active.id)}/>;
  else if (view === 'connect' && active && !lock) content = <PortalConnect item={active} onBack={() => toHub(active.id)} onFinish={(files, note) => finish(active.id, files, note)} onNoted={() => toHub(active.id)}/>;
  // Ingen kontrol af samtykket her: det skrives midt i forbindelsen, og dialogen skal blive stående til "Fortsæt"
  // (PortalErpSetup går selv tilbage, hvis der allerede er forbundet, når den åbnes)
  else if (view === 'erp' && !lock) content = <PortalErpSetup onBack={() => toHub()} onDone={() => toHub()}/>;
  else if (view === 'trade' && active && !lock) content = <PortalTradeScreen item={active} onBack={() => toHub(active.id)} onDone={() => toHub(active.id)}/>;
  else if (view === 'status') content = <PortalStatus justSubmitted={justSubmitted} onBack={() => go('hub')}/>;
  else content = <PortalHub requested={requested} fresh={fresh} lock={lock} onOpen={openItem} onOpenBundle={(preselect) => setBundle({ preselect: preselect || null })} onOther={() => setOtherOpen(true)} onSubmit={submit} onStatus={() => { setJustSubmitted(false); go('status'); }} onErp={() => go('erp')}/>;
  if (preview && !pvOb && pvNav && view === 'hub') content = <>{content}<div style={{ maxWidth: 760, margin: '0 auto' }}>{pvNav}</div></>;
  // Kundeside: hvor kunden er i opstarten, øverst på oversigten
  if (asAdvisor && !flow && req && !lock && view === 'hub') content = <><PortalPvObStatus onOpenFlow={onOpenFlow}/>{content}</>;

  const demoSkipLabel = !loggedIn && (ob.doneAt || legacy) ? t('Log ind (demo)') : t('Spring opstarten over (demo)');

  return (
    <div className={'cwp' + (preview ? ' cwp-preview' : '')} ref={rootRef} {...pvHandlers} style={{ background: '#faf8f4', minHeight: preview ? '100%' : '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{PORTAL_CSS}</style>
      <style>{PORTAL_OB_CSS}</style>
      <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        {preview && (
          <div role="note" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 20px', background: '#1a1d22', color: '#fff', fontSize: 12.5, flexWrap: 'wrap' }}>
            <I.Eye size={13}/>
            <b style={{ fontWeight: 600 }}>{flow ? t('Kundeflow (demo)') : t('Forhåndsvisning af kundens side')}</b>
            <span className="cwp-pv-role">
              <label htmlFor="cwp-pv-role">{t('Se som')}</label>
              <select id="cwp-pv-role" value={flowRole} onChange={e => setFlowRole(e.target.value)}>
                <option value="rådgiver">{t('Rådgiver')}</option>
                <option value="kunde">{t('Kunde')}</option>
              </select>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.75)' }}>
              {flowRole === 'kunde' ? t('Du bruger siden som kunden. Svar, filer og beskeder gemmes, som om kunden havde sendt dem.')
                : flow ? t('De skærme, kunden kommer igennem. Du kan klikke rundt, men intet gemmes.')
                : req ? t('Du kan se og klikke rundt. Filer, du uploader i punkterne, sendes på kundens vegne. Alt andet gemmes ikke.') : t('Anmodningen er ikke sendt endnu. Sådan ser siden ud, når den er sendt.')}
            </span>
            <div style={{ flex: 1 }}/>
            <button type="button" onClick={back} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', minHeight: 28, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>
              <I.X size={12}/> {t('Luk')}
            </button>
          </div>
        )}
        {preview && flow && lock !== 'declined' && (
          <div className="cwp-pv-jump" role="group" aria-label={t('Kundens skærme')}>
            <span style={{ marginRight: 4 }}>{t('Kundens skærme:')}</span>
            {PV_SCREENS.map(k => (
              <button key={k} type="button" aria-current={pvCurrent === k ? 'true' : undefined} onClick={() => pvGo(k)}>{pvScreenLabel(k)}</button>
            ))}
          </div>
        )}
        {/* K9: kun afsender og firmanavn; ingen "sikker"-mærker */}
        {!cwPage && <Header style={{ borderBottom: '1px solid var(--c-line)', background: '#fff' }}>
          <div className="cwp-head-inner" style={{ maxWidth: 760, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="brand-mark" aria-hidden="true" style={{ background: 'var(--c-primary)' }}>cw</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Materiale til EIFO')}</div>
              {/* Efter login (eller i rådgiverens forhåndsvisning): sagsnummer, produkt og beløb og den ansvarlige */}
              <div className="muted cwp-head-meta" style={{ fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: '0 6px' }}>
                {[DATA.COMPANY.name].concat(showMeta ? portalCaseMeta() : []).map((x, i) => (<React.Fragment key={i}>{i > 0 && <span aria-hidden="true">·</span>}<span title={x.title || undefined}>{x.text || x}</span></React.Fragment>))}
              </div>
            </div>
            {!preview && loggedIn && <button type="button" className="cwp-head-logout" onClick={logout}>{t('Log ud')}</button>}
            {!preview && <div className="cwp-lang"><LanguageSwitcher compact/></div>}
          </div>
        </Header>}
      </div>

      <Main id={preview ? undefined : 'cwp-main'} className={'cwp-main' + (cwPage ? ' cwp-main-cw' : '')} tabIndex={preview ? undefined : -1} style={{ flex: 1, padding: cwPage ? 0 : '32px 24px 96px', outline: 'none' }}>
        {content}
      </Main>

      {!preview && (
        <div className="cwp-demo">
          <button type="button" className="cwp-demo-back" onClick={back}><I.ArrowLeft size={12}/> {t('Tilbage til rådgiver-visning')}</button>
          {hasReq && !lock && (!loggedIn || obStep) && <button type="button" className="cwp-demo-fill" onClick={demoSkip}>{demoSkipLabel}</button>}
          {hasReq && loggedIn && !obStep && !lock && (
            <span className="cwp-demo-right">
              <PortalDemoUploads requested={requested}/>
              <button type="button" className="cwp-demo-fill" onClick={fillAll}>{t('Udfyld alt (demo)')}</button>
            </span>
          )}
        </div>
      )}

      {preview && <PortalPvNote what={pvNote && pvNote.what} n={pvNote && pvNote.n} onClose={() => setPvNote(null)}/>}
      {bundle && !lock && <DelegateBundleModal requested={requested} preselect={bundle.preselect} onClose={() => setBundle(null)} onSend={delegate}/>}
      {otherOpen && !lock && <PortalOtherFilesModal onClose={() => setOtherOpen(false)}/>}
    </div>
  );
}

// Knappen tilbage ligger i en nav, så skærmlæsere finder vejen rundt
function PortalBackNav({ onBack, label }) {
  return (
    <nav aria-label={t('Navigation i portalen')} style={{ marginBottom: 14 }}>
      <button type="button" onClick={onBack} className="btn btn-sm btn-ghost"><I.ArrowLeft className="ic"/> {label || t('Tilbage til oversigten')}</button>
    </nav>
  );
}

// Rådgiverens kontaktoplysninger som én grå linje
function PortalContactLine({ style }) {
  return (
    <div className="cwp-contact" style={Object.assign({ fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.6 }, style)}>
      {PORTAL_CONTACT.name}, {t(PORTAL_CONTACT.title)}, {PORTAL_CONTACT.org}
      {' · '}<a href={'tel:' + PORTAL_CONTACT.phone.replace(/\s/g, '')}>{PORTAL_CONTACT.phone}</a>
      {' · '}<a href={'mailto:' + PORTAL_CONTACT.email}>{PORTAL_CONTACT.email}</a>
    </div>
  );
}

/* ── Ingen aktiv anmodning ─────────────────────────────────────────────── */

function PortalNoRequest() {
  return (
    <div style={{ maxWidth: 560, margin: '24px auto 0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--c-ink)', margin: '0 0 10px', lineHeight: 1.2 }}>{t('Der er ingen aktiv anmodning endnu')}</h1>
      <p style={{ fontSize: 15, color: 'var(--c-text-2)', lineHeight: 1.55, margin: '0 0 14px' }}>
        {ncFill(t('Når {name} fra EIFO beder om materiale til jeres ansøgning, får I en mail med et link hertil. Indtil da skal I ikke gøre noget.'), { name: PORTAL_CONTACT.name })}
      </p>
      <PortalContactLine/>
    </div>
  );
}

// Afslået sag: en rolig side uden upload. Kunden får ikke afslagets årsag her;
// den kommer fra rådgiveren.
function PortalClosed() {
  return (
    <div style={{ maxWidth: 560, margin: '24px auto 0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--c-ink)', margin: '0 0 10px', lineHeight: 1.2 }}>{t('Sagen er afsluttet')}</h1>
      <p style={{ fontSize: 15, color: 'var(--c-text-2)', lineHeight: 1.55, margin: '0 0 14px' }}>
        {ncFill(t('Kontakt {name}, hvis I har spørgsmål. I skal ikke sende mere materiale.'), { name: PORTAL_CONTACT.name })}
      </p>
      <PortalConsentBox/>
      <PortalContactLine style={{ marginTop: 14 }}/>
    </div>
  );
}

// Kunden kan altid trække adgangen til regnskabssystemet tilbage, også når sagen er lukket
function portalRevoke(consent) {
  if (!consent) return Promise.resolve(false);
  return CW.confirm({
    title: t('Træk adgangen tilbage?'),
    text: ncFill(t('EIFO kan ikke længere hente tal fra {src}. De tal, EIFO allerede har hentet, bliver i sagen.'), { src: consent.system }),
    confirmLabel: t('Træk adgangen tilbage'), danger: true,
  }).then(r => {
    if (!r.ok) return false;
    CW.setConsent(null);
    CW.toast(ncFill(t('Adgangen til {src} er trukket tilbage. {adv} kan se det i sagen.'), { src: consent.system, adv: PORTAL_CONTACT.first }));
    return true;
  });
}

/**
 * Forbindelsen til regnskabssystemet på en lukket sag: aktiv (med "Træk adgangen
 * tilbage"), lukket ved afgørelsen, eller trukket tilbage. Vises kun, hvis kunden
 * har givet adgang på et tidspunkt.
 */
function PortalConsentBox() {
  CW.useCase();
  const consent = CW.consent();
  const log = CW.activity();
  const given = log.filter(e => e.type === 'consent').pop();
  if (!consent && !given) return null;
  const closed = log.filter(e => e.type === 'consent-revoked').pop();
  const s = CW.itemState('m-interim');
  // Systemets navn: fra samtykket, ellers fra loglinjen "Kunden gav læseadgang til <system>"
  const fromLog = given && /(læseadgang til|read access to) (.+)$/.exec(given.text || '');
  const src = consent ? consent.system : (fromLog && fromLog[2]) || (s && s.noteKind === 'system' && String(s.note || '').replace(/^Hentet fra /, '')) || t('regnskabssystemet');
  const byCase = !consent && closed && closed.who === 'system';
  return (
    <div className="cwp-consent-box" style={{ marginTop: 16, padding: '12px 16px', background: '#fff', border: '1px solid var(--c-line)', borderRadius: 10, fontSize: 13, color: 'var(--c-text)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        {consent ? (
          <>
            <b style={{ fontWeight: 600 }}>{ncFill(t('Forbundet til {src} (kun læseadgang)'), { src })}</b>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{portalConsentUntil(consent)}</div>
          </>
        ) : <span style={{ color: 'var(--c-text-2)' }}>{byCase
          ? ncFill(t('Adgangen til {src} er lukket, fordi sagen er afgjort. EIFO kan ikke hente flere tal.'), { src })
          : ncFill(t('Adgangen til {src} er trukket tilbage. De tal, EIFO allerede har hentet, bliver i sagen.'), { src })}</span>}
      </div>
      {consent && <button type="button" className="btn btn-sm" data-cust-act="consent" onClick={() => portalRevoke(consent)}>{t('Træk adgangen tilbage')}</button>}
    </div>
  );
}

/**
 * Landingssiden: det første, kunden ser fra invitationslinket, før der er en
 * bruger. Hvem der spørger, hvorfor siden ligger på Crediwire, og hvordan
 * det foregår. "Kom i gang" sender kunden til Crediwires side (opret bruger eller
 * log ind) og derfra tilbage til trinnet Bruger. Efter opstarten går kunden
 * direkte til oversigten (der er ingen særskilt velkomst).
 */
function PortalLanding({ onStart }) {
  const req = CW.request();
  const draft = CW.draft();
  const rcp = portalRecipient();
  const first = ncFirstName(rcp.name);
  const requested = CW.requestedItems();
  const adv = PORTAL_CONTACT.first;
  const deadline = (req && req.deadline) || (!req && draft && draft.deadline) || null;
  const byAdvisor = requested.filter(it => { const s = CW.itemState(it.id); return s && s.by === 'rådgiver' && ['received', 'approved'].includes(s.status); });
  const names = (list) => list.map(it => t(it.label) + (it.tag === 'Valgfri' ? ' (' + t('valgfri') + ')' : '')).join(', ');
  const advFiles = byAdvisor.reduce((n, it) => n + ((CW.itemState(it.id).files || []).length || 1), 0);
  const advNote = byAdvisor.length ? ' ' + ncFill(advFiles === 1 ? t('{adv} har allerede tilføjet 1 fil for jer: {items}.') : t('{adv} har allerede tilføjet {n} filer for jer: {items}.'), { adv, n: advFiles, items: names(byAdvisor) }) : '';
  const steps = [
    { ic: <I.Clock size={14}/>, t: t('Ca. 10 minutter samlet. Det meste er upload.') },
    { ic: <I.Refresh size={14}/>, t: t('I opretter en bruger hos Crediwire, så I kan holde pause og vende tilbage. Det, I har sendt, er gemt.') },
    { ic: <I.Database size={14}/>, t: t('Periodetal kan I forbinde direkte fra jeres regnskabssystem med få klik. I vælger selv, hvilken type samtykke I vil give.') },
    { ic: <I.Lock size={14}/>, t: t('Krypteret forbindelse. Linket er personligt og gælder kun jeres ansøgning.') },
  ];
  return (
    <div className="cwp-land">
      <h1 className="cwp-land-h">{first ? ncFill(t('Kære {name},'), { name: first }) : t('Velkommen')}</h1>
      <p className="cwp-land-lead">
        {ncFill(t('Tak for jeres ansøgning hos EIFO. For at vi kan behandle den, har vi brug for noget materiale fra {company}.'), { company: DATA.COMPANY.name })}
      </p>
      <div className="cwp-land-why">
        <I.Lock size={15} aria-hidden="true" style={{ color: 'var(--c-text-2)', flexShrink: 0, marginTop: 2 }}/>
        <div>
          <b>{t('Hvorfor Crediwire?')}</b> {ncFill(t('EIFO bruger Crediwire til sikker indsamling af materiale, derfor ligger siden hos Crediwire. Kun {adv} og hendes kolleger hos EIFO ser det, I sender.'), { adv })}
        </div>
      </div>
      <section className="cwp-land-how" aria-labelledby="cwp-land-how-h">
        <h2 id="cwp-land-how-h" className="label-mini" style={{ margin: '0 0 10px' }}>{t('Sådan foregår det')}</h2>
        <ul>
          {steps.map((x, i) => (
            <li key={i}>
              <div aria-hidden="true" className="cwp-land-ic">{x.ic}</div>
              <div>{x.t}</div>
            </li>
          ))}
        </ul>
      </section>
      <button type="button" onClick={onStart} className="btn btn-primary btn-lg" style={{ padding: '0 22px', background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>
        {t('Kom i gang')} <I.ArrowRight className="ic"/>
      </button>
      <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--c-text-3)', lineHeight: 1.6 }}>
        {ncFill(t('Spørgsmål? Skriv til {name} på'), { name: adv })} <a href={'mailto:' + PORTAL_CONTACT.email} style={{ color: 'var(--c-ink)', fontWeight: 600 }}>{PORTAL_CONTACT.email}</a> {t('eller ring på')} <a href={'tel:' + PORTAL_CONTACT.phone.replace(/\s/g, '')} style={{ color: 'var(--c-ink)', fontWeight: 600, whiteSpace: 'nowrap' }}>{PORTAL_CONTACT.phone}</a>
      </div>
    </div>
  );
}

/**
 * Oversigten (K1): listen står lige under titlen. Under listen: næste skridt, når
 * der er et (K12), hjælp fra revisor eller bank og andre filer som ghost-knapper
 * (K11), og til sidst folde med det, der ligger hos EIFO (K10), og beskederne.
 */
/* Kundeside: hvor kunden er i opstarten, som én kort linje øverst på oversigten,
   indtil opstarten er gjort (opret bruger og datadeling). Rådgiveren kan sende
   invitationen igen (en påmindelse i sagens historik). */
function pvDaysAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  if (days <= 0) return t('i dag');
  if (days === 1) return t('i går');
  return ncFill(t('for {n} dage siden'), { n: days });
}
function PortalPvObStatus({ onOpenFlow }) {
  CW.useCase();
  const ob = CW.onboarding();
  const legacy = !ob.account && !!portalMem().accepted;
  const current = !ob.account ? 'account' : CW.onboardingStep(ob);
  if (legacy || !current) return null;
  const steps = OB_ORDER.filter(k => k !== 'material');
  const n = steps.indexOf(current) + 1;
  const req = CW.request();
  const to = (req && req.to) || {};
  const last = CW.lastReminder();
  const lastAt = (last && last.at) || (req && req.sentAt);
  // Har kunden en bruger, mangler kun oplysningerne på trinnet Bruger
  const step = !ob.account ? t('Opret bruger') : obLabel(current);
  const resend = () => {
    CW.remind([], { by: PORTAL_CONTACT.name });
    CW.toast(ncFill(t('Invitationen er sendt igen til {to}'), { to: to.email || to.name || t('kunden') }));
  };
  return (
    <section className="cwp-pvob" aria-labelledby="cwp-pvob-h">
      <span className="cwp-pvob-dot" aria-hidden="true"/>
      <div className="cwp-pvob-text">
        <h2 id="cwp-pvob-h" className="cwp-pvob-title">{!ob.account ? t('Kunden er ikke startet endnu') : t('Kunden er i gang med opstarten')}</h2>
        <div className="cwp-pvob-sub">{ncFill(t('Står ved {step}'), { step: step.charAt(0).toLowerCase() + step.slice(1) })}</div>
      </div>
      {/* Kundeflow på det trin, kunden står på: det, kunden ser lige nu */}
      {onOpenFlow && <button type="button" className="btn-ghost-sm" onClick={() => onOpenFlow(current)}>{t('Se hvad kunden ser')}</button>}
      {req && <button type="button" className="btn btn-sm" onClick={resend} title={lastAt ? ncFill(t('Sidst sendt {when}'), { when: pvDaysAgo(lastAt) }) : undefined}>{t('Send invitation igen')}</button>}
    </section>
  );
}

/* Sagens linje i portalens topbjælke (efter bekræftelse): sagsnummer, produkt og
   beløb (samme som rådgiverens sagshoved) og den ansvarlige rådgiver. */
function portalCaseMeta() {
  const co = (window.DATA && DATA.COMPANY) || {};
  const facility = [co.caseType, co.amount].filter(Boolean).join(', ');
  return [
    co.caseNr ? t('Sagsnr.') + ' ' + co.caseNr : null,
    facility ? { text: facility, title: co.amountNote || '' } : null,
    t('Ansvarlig') + ': ' + PORTAL_CONTACT.name,
  ].filter(Boolean);
}

/* Behandlingen i tre korte trin: materialet, EIFO's vurdering og afgørelsen.
   Bygger på csTimeline (customer_status.jsx). Indstillingen er en del af
   vurderingen her: kunden skal kun vide, hvor sagen er, og hvornår der kommer svar. */
function PortalSteps() {
  CW.useCase();
  const all = csTimeline(CW.progress(), CW.request(), CW.draft(), CW.caseState() || {});
  const by = {}; all.forEach(s => { by[s.k] = s; });
  const mat = by.materiale, afg = by.afgorelse;
  const vurdState = mat.state !== 'done' ? 'upcoming' : afg.state === 'done' ? 'done' : 'active';
  const steps = [
    { k: 'mat', label: t('Materiale'), state: mat.state, sub: mat.state === 'done' ? t('Afsluttet') : mat.state === 'active' ? mat.sub : '' },
    { k: 'vurd', label: t('EIFO vurderer sagen'), state: vurdState, sub: vurdState === 'active' ? t('I gang') : vurdState === 'done' ? t('Afsluttet') : '' },
    { k: 'afg', label: t('Afgørelse'), state: afg.state, sub: afg.state === 'done' ? afg.sub : '' },
  ];
  const word = (s) => s === 'done' ? t('afsluttet') : s === 'active' ? t('i gang') : t('kommer senere');
  // Egen boks under kortene: prik over teksten, en linje imellem, højst én kort linje pr. trin.
  // Under 600 px står trinene under hinanden.
  return (
    <section className="card cwp-steps-card" aria-labelledby="cwp-steps-h" style={{ marginBottom: 16, overflow: 'hidden' }}>
      <style>{`@media (max-width: 600px) {
        .cwp-steps-card .cwp-steps { flex-direction: column !important; gap: 12px; }
        .cwp-steps-card .cwp-steps > li { flex-direction: row !important; align-items: center !important; gap: 10px; text-align: left !important; }
        .cwp-steps-card .cwp-step-line { display: none; }
        .cwp-steps-card .cwp-step-text { margin-top: 0 !important; }
      }`}</style>
      <div className="card-head" style={{ borderBottom: '1px solid var(--c-line-2)', justifyContent: 'flex-start' }}>
        <h2 id="cwp-steps-h" className="card-title" style={{ margin: 0 }}>{t('Behandlingsstatus')}</h2>
      </div>
      <ol className="cwp-steps" style={{ listStyle: 'none', margin: 0, padding: '18px 22px 20px', display: 'flex', alignItems: 'flex-start' }}>
        {steps.map((s, i) => {
          const done = s.state === 'done', active = s.state === 'active';
          return (
            <li key={s.k} aria-current={active ? 'step' : undefined} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
              {i < steps.length - 1 && (
                <span aria-hidden="true" className="cwp-step-line" style={{ position: 'absolute', top: 10, left: '50%', width: '100%', height: 2, background: done ? 'var(--c-ink)' : 'var(--c-line-strong)' }}/>
              )}
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', boxSizing: 'border-box', flexShrink: 0, position: 'relative', zIndex: 1,
                background: done ? 'var(--c-ink)' : '#fff', border: done ? 'none' : active ? '2px solid var(--c-primary)' : '2px solid var(--c-text-4)', color: '#fff' }}>
                {done ? <I.Check size={11}/> : active ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-primary)' }}/> : null}
              </span>
              <span className="cwp-step-text" style={{ marginTop: 8, padding: '0 6px' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: active ? 600 : 500, color: done || active ? 'var(--c-ink)' : 'var(--c-text-2)' }}>
                  {s.label}<span style={ncHidden}>{': ' + word(s.state)}</span>
                </span>
                {s.sub && <span style={{ display: 'block', fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>{s.sub}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* "Det mangler vi": én stor linje, fristen og én sætning om, hvad der sker nu */
function PortalNeedCard({ locked, deadline, submittedAt }) {
  const prog = CW.progress();
  const adv = PORTAL_CONTACT.first;
  const big = locked ? t('Hos EIFO')
    : prog.requiredMissing > 0 ? ncFill(t('{n} mangler'), { n: prog.requiredMissing })
    : prog.optionalPending > 0 ? t('Alt påkrævet er sendt') : t('Alt er sendt');
  const line = locked ? ncFill(t('{adv} har sendt jeres ansøgning videre. I hører fra EIFO, når der er en afgørelse.'), { adv })
    : submittedAt ? ncFill(t('I sagde {date}, at I var færdige. {adv} gennemgår materialet og vender tilbage senest {date2}.'), { date: CW.fmtDate(submittedAt), adv, date2: CW.fmtDate(csAddWorkdays(new Date(submittedAt), 2)) })
    : prog.requiredMissing > 0 ? t('Upload det, der mangler, på listen nedenfor.')
    : ncFill(t('{navn} gennemgår det, I har sendt.'), { navn: adv });
  return (
    <section className="card" aria-labelledby="cwp-need-h" style={{ padding: '16px 18px' }}>
      <h2 id="cwp-need-h" className="label-mini" style={{ margin: 0 }}>{t('Det mangler vi')}</h2>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.01em', marginTop: 6 }}>{big}</div>
      {deadline && !locked && (
        <div style={{ fontSize: 13, color: 'var(--c-text)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <I.Calendar size={13} aria-hidden="true" style={{ color: 'var(--c-text-3)' }}/> {ncFill(t('Frist {date}'), { date: CW.fmtDate(deadline + 'T12:00:00') })}
        </div>
      )}
      <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 6, lineHeight: 1.5 }}>{line}</div>
    </section>
  );
}

/* "Jeres kontakt": rådgiveren med telefon, mail og svartid */
function PortalContactCard() {
  const c = PORTAL_CONTACT;
  return (
    <section className="card cwp-contact" aria-labelledby="cwp-contact-h" style={{ overflow: 'hidden' }}>
      <div className="card-head" style={{ borderBottom: '1px solid var(--c-line-2)', justifyContent: 'flex-start' }}>
        <h2 id="cwp-contact-h" className="card-title" style={{ margin: 0 }}>{t('Jeres kontakt')}</h2>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 18px 16px' }}>
        <div className="avatar" aria-hidden="true" style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>{c.initials}</div>
        <div style={{ minWidth: 0, fontSize: 13, lineHeight: 1.6 }}>
          <div><span style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{c.name}</span><span style={{ color: 'var(--c-text-2)' }}> · {t(c.title)}, {c.org}</span></div>
          <div><a href={'tel:' + c.phone.replace(/\s/g, '')}>{c.phone}</a></div>
          <div><a href={'mailto:' + c.email} style={{ color: 'var(--color-link, var(--c-primary))' }}>{c.email}</a></div>
          <div style={{ fontSize: 12.5, color: 'var(--c-text-3)' }}>{ncFill(t('{navn} svarer typisk inden for 1 arbejdsdag'), { navn: c.first })}</div>
        </div>
      </div>
    </section>
  );
}

// Det, EIFO selv har hentet: årsrapporterne fra CVR (sagens dokumentregister)
function portalAutoDocs() {
  const years = ((window.DATA && DATA.DOCS) || []).filter(d => d.type === 'Årsrapport' && d.origin === 'public' && !d.superseded)
    .map(d => String(d.year)).filter(y => /^\d{4}$/.test(y)).sort();
  return Array.from(new Set(years));
}

function PortalHub({ requested, fresh, lock, onOpen, onOpenBundle, onOther, onSubmit, onStatus, onErp }) {
  const prog = CW.progress();
  const req = CW.request();
  const draft = CW.draft();
  const cs = CW.caseState() || {};
  const deadline = (req && req.deadline) || (!req && draft && draft.deadline) || null;
  const canDelegate = requested.some(it => ['pending', 'rejected', 'delegated'].includes(portalStatus(it.id)));
  const locked = !!lock;
  const submittedAt = cs.customerSubmittedAt || null;
  const changedSince = submittedAt && requested.some(it => { const s = CW.itemState(it.id); return s && s.by === 'kunde' && s.at && s.at > submittedAt; });
  const ready = prog.total > 0 && prog.requiredMissing === 0 && !locked;
  const showSubmit = ready && (!submittedAt || changedSince);
  const adv = PORTAL_CONTACT.first;
  const loose = CW.allUploads().filter(f => !f.itemId && f.by === 'kunde');
  const years = portalAutoDocs();
  // Regnskabssystemet: forbindelsen står for sig, når den findes. Er Periodetal ikke
  // bedt om, og har kunden ikke sagt nej til datadeling, kan den forbindes herfra.
  const consent = CW.consent();
  const ob = CW.onboarding();
  const erpOffer = !consent && onErp && !requested.some(it => it.id === 'm-interim') && !(ob.agreement && ob.agreement.declined);
  // Kunden valgte "Vi venter på vores revisor" i opstarten: vejen videre står her
  const waitingErp = !consent && !locked && onErp && !!(ob.erp && ob.erp.waiting);

  // Banneret om nye beskeder ruller til dialogen, som altid står nederst på siden
  const openDialog = () => {
    setTimeout(() => {
      const card = document.getElementById('cwp-dialog');
      if (card) card.scrollIntoView({ block: 'start', behavior: 'smooth' });
      CW.focusSoon('#cwp-dialog-h');
    }, 40);
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={ncHidden}>{t('Status for jeres ansøgning')}</h1>
      {/* "Det mangler vi"-kortet (PortalNeedCard) er fjernet; kontaktkortet står nederst på siden */}
      <PortalSteps/>

      {locked && <div style={{ marginBottom: 16 }}><PortalConsentBox/></div>}

      <section className="card" aria-labelledby="cwp-items-h" style={{ overflow: 'hidden' }}>
        <div className="card-head" style={{ borderBottom: '1px solid var(--c-line-2)', justifyContent: 'flex-start' }}>
          <h2 id="cwp-items-h" className="card-title" style={{ margin: 0 }}>{t('Materiale')}</h2>
        </div>
        {requested.map((it, i) => (
          <PortalHubRow key={it.id} it={it} first={i === 0} status={portalStatus(it.id)} onOpen={onOpen} readOnly={locked}/>
        ))}
        {/* Det, EIFO selv har hentet (årsrapporterne fra CVR): ét afkrydset punkt pr. år */}
        {years.map((y, i) => (
          <div key={y} className="cwp-row" data-row={'auto-' + y} style={{ borderTop: requested.length || i > 0 ? '1px solid var(--c-line-2)' : 'none', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}><I.Check size={12}/></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--c-text-2)' }}>
                {t('Årsrapport') + ' ' + y}
                <span style={ncHidden}>{': ' + t('Hentet automatisk')}</span>
              </div>
              {/* EIFO godkender ikke årsrapporterne; de er hentet fra CVR. Mærkaten er grøn som Godkendt */}
              <div className="cwp-row-pill-in"><span className="pill success cwp-row-pill" aria-hidden="true"><span className="pill-dot"/>{t('Hentet automatisk')}</span></div>
            </div>
            {/* Samme højre kant som mærkaterne på punkterne, der har en pil til detaljerne */}
            <span className="cwp-row-pill-side" style={{ marginRight: 30 }}><span className="pill success cwp-row-pill" aria-hidden="true"><span className="pill-dot"/>{t('Hentet automatisk')}</span></span>
          </div>
        ))}
      </section>

      {waitingErp && (
        <div className="cw-row cwp-hub-wait" style={{ marginTop: 12, padding: '12px 16px', background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, alignItems: 'center' }}>
          <div className="cw-row-main">
            <span className="cw-row-title" style={{ fontSize: 13.5 }}>{t('I venter på jeres revisor med regnskabssystemet')}</span>
            <span className="cw-row-meta" style={{ fontSize: 12.5 }}>{t('Send revisoren et link, eller forbind selv, når I har adgang.')}</span>
          </div>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {canDelegate && <button type="button" className="btn btn-sm" data-cust-act="delegate" onClick={() => onOpenBundle(null)}>{t('Bed revisoren om hjælp')}</button>}
            <button type="button" className="btn btn-sm" data-cust-act="erp" onClick={onErp}>{t('Forbind nu')}</button>
          </span>
        </div>
      )}

      {consent && !locked && (
        <div className="cw-row" style={{ marginTop: 12, padding: '12px 16px', background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, alignItems: 'center' }}>
          <div className="cw-row-main">
            <span className="cw-row-title" style={{ fontSize: 13.5 }}>{ncFill(t('Forbundet til {src} (kun læseadgang)'), { src: consent.system })}</span>
            <span className="cw-row-meta" style={{ fontSize: 12.5 }}>{portalConsentUntil(consent)}</span>
          </div>
          <button type="button" className="btn btn-sm" data-cust-act="consent" onClick={() => portalRevoke(consent)}>{t('Træk adgangen tilbage')}</button>
        </div>
      )}

      {showSubmit && (
        <div className="cwp-stack" style={{ marginTop: 16, padding: '16px 18px', background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>
            {submittedAt ? t('I har sendt mere, siden I sagde, I var færdige') : ncFill(t('Alt er sendt. Sig til {adv}, når I er færdige.'), { adv })}
          </div>
          <button type="button" onClick={onSubmit} data-cust-act="submit" className="btn btn-primary" style={{ background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>{submittedAt ? ncFill(t('Giv {adv} besked'), { adv }) : t('Vi er færdige')}</button>
        </div>
      )}

      {!locked && (
        <div style={{ marginTop: 12, display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: -8 }}>
          {canDelegate && <button type="button" className="btn-ghost-sm" data-cust-act="delegate" onClick={() => onOpenBundle(null)}>{t('Få hjælp fra revisor eller bank')}</button>}
          {erpOffer && !waitingErp && <button type="button" className="btn-ghost-sm" data-cust-act="erp" onClick={onErp}>{t('Forbind regnskabssystem')}</button>}
          <button type="button" className="btn-ghost-sm" data-cust-act={loose.length ? undefined : 'upload'} onClick={onOther}>{loose.length ? ncFill(t('Andre filer ({n})'), { n: loose.length }) : t('Send en anden fil')}</button>
        </div>
      )}

      {/* Dialogen med rådgiveren står altid synlig som en chat */}
      <div style={{ marginTop: 16 }}>
        <CWDialogCard idPrefix="cwp" readOnly={locked}/>
      </div>

      <div style={{ marginTop: 16 }}>
        <PortalContactCard/>
      </div>
    </div>
  );
}

/**
 * K2: én række pr. punkt med fed titel og højst én grå linje. Mangler: beskrivelsen
 * ("Hvorfor" står på punktets egen side). Leveret: "Sendt 30. sep. · 1 fil" og kun
 * "⋯" til højre. K5: et afvist punkt har rådgiverens note som linjen og en ghost-knap.
 */
function PortalHubRow({ it, first, status: realStatus, onOpen, readOnly }) {
  // Skrivebeskyttet (sagen er hos kreditkomitéen): det, der ikke er sendt, står
  // neutralt som "Ikke sendt", og der er ingen handlinger ud over kvitteringen.
  const status = readOnly && ['pending', 'rejected', 'delegated'].includes(realStatus) ? 'closed' : realStatus;
  const [menu, setMenu] = React.useState(false);
  const [receipt, setReceipt] = React.useState(false);
  const menuRef = React.useRef(null);
  const s = CW.itemState(it.id);
  const files = (s && s.files) || [];
  const delivered = status === 'received' || status === 'approved' || status === 'noted';
  const clickable = status === 'pending';
  const kind = portalKind(it.id);
  const draft = status === 'pending' ? csDraft(it.id) : null;
  const consent = CW.consent();
  const sourceText = csSourceText(s);
  const answers = csAnswersText(s);
  const adv = PORTAL_CONTACT.first;

  React.useEffect(() => {
    if (!menu) return;
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    const onKey = (e) => {
      if (e.key === 'Escape') { setMenu(false); const b = menuRef.current && menuRef.current.querySelector('[aria-haspopup]'); if (b) b.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = Array.from(menuRef.current ? menuRef.current.querySelectorAll('[role=menuitem]') : []);
        const i = items.indexOf(document.activeElement);
        const n = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        if (items[n]) { e.preventDefault(); items[n].focus(); }
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    const id = setTimeout(() => { const f = menuRef.current && menuRef.current.querySelector('[role=menuitem]'); if (f) f.focus(); }, 10);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [menu]);

  // Statusikonet bærer informationen. Et spørgsmål fra rådgiveren er et blåt "!", ikke en fejl
  const circle = (bg, color, border, icon) => <div aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', background: bg, color, border, display: 'grid', placeItems: 'center', flexShrink: 0, boxSizing: 'border-box' }}>{icon}</div>;
  const icon = delivered ? circle('var(--c-primary)', '#fff', 'none', <I.Check size={12}/>)
    : status === 'rejected' ? <PortalAskMark/>
    : status === 'delegated' ? circle('#fff', 'var(--c-text-3)', '1.5px solid var(--c-text-4)', <I.Clock size={11}/>)
    : <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--c-text-4)', flexShrink: 0, boxSizing: 'border-box' }}/>;
  const answered = !!s && !!s.answer;
  const statusWord = { pending: t('Mangler'), received: t('Afventer godkendelse af EIFO'), noted: answered ? t('Svar sendt') : t('Bemærkning sendt'), delegated: s && s.delegate && s.delegate.role === 'bank' ? t('Hos jeres bank') : t('Hos jeres revisor'), approved: t('Godkendt'), rejected: ncFill(t('Spørgsmål fra {adv}'), { adv }), closed: t('Ikke sendt') }[status];

  // Den ene grå linje: kun det, kunden kan bruge. Hvem, hvornår og hvor mange filer står i
  // detaljerne (pilen til højre); status står som en mærkat (Afventer godkendelse / Godkendt)
  const meta = status === 'pending' ? (draft ? <span className="cwp-row-draft">{t('Påbegyndt, ikke sendt endnu')}</span> : t(it.desc))
    : status === 'closed' ? t('Ikke sendt')
    : status === 'received' || status === 'approved' ? (sourceText || null)
    : status === 'noted' ? (answered ? t('Svar sendt') : t('Bemærkning sendt'))
    : status === 'rejected' ? (s.reviewNote ? ncFill(t('{adv} spørger:'), { adv }) + ' ' + s.reviewNote : ncFill(t('{adv} beder om en ny version'), { adv }))
    : status === 'delegated' && s.delegate ? ncFill(s.delegate.role === 'bank' ? t('Hos jeres bank: {name}') : t('Hos jeres revisor: {name}'), { name: s.delegate.name })
    : null;
  // Mærkaten: sendt, men ikke gennemgået endnu, eller godkendt (skærmlæsere får samme ord fra statusWord)
  const label = status === 'approved' ? <span className="pill success cwp-row-pill" aria-hidden="true"><span className="pill-dot"/>{t('Godkendt')}</span>
    : status === 'received' || status === 'noted' ? <span className="pill warn cwp-row-pill" aria-hidden="true"><span className="pill-dot"/>{t('Afventer godkendelse af EIFO')}</span>
    : null;

  const body = (
    <>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: delivered ? 'var(--c-text-2)' : 'var(--c-ink)' }}>
          {t(it.label)}
          <span style={ncHidden}>{': ' + statusWord}</span>
        </div>
        {meta && <div className="cwp-row-meta">{meta}</div>}
        {/* På smalle skærme står mærkaten under titlen (til højre er der ikke plads) */}
        {label && <div className="cwp-row-pill-in">{label}</div>}
      </div>
      {it.tag === 'Valgfri' && (status === 'pending' || status === 'closed') && <span className="cwp-row-cat">{t('Valgfri')}</span>}
      {clickable && <I.ChevronRight size={16} style={{ color: 'var(--c-text-3)', flexShrink: 0, marginTop: 3 }}/>}
    </>
  );

  const editLabel = status === 'noted' ? t('Send en fil i stedet') : kind === 'trade' ? t('Ret svaret') : kind === 'connect' ? t('Se forbindelsen eller upload') : t('Tilføj eller fjern filer');
  return (
    <div data-row={it.id} style={{ borderTop: first ? 'none' : '1px solid var(--c-line-2)' }}>
      <div className="cwp-row" style={{ position: 'relative', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {clickable
          ? <button type="button" className="cwp-rowbtn" onClick={() => onOpen(it.id)}>{body}</button>
          : <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 14, alignItems: 'flex-start' }}>{body}</div>}
        {!clickable && (status === 'rejected' || status === 'delegated' || delivered) && (
          <div className={'cwp-row-side' + (delivered ? '' : ' wide')} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {status === 'rejected' && <button type="button" className="btn-ghost-sm" data-act="answer" onClick={() => onOpen(it.id)} aria-label={t('Svar') + ': ' + t(it.label)}>{t('Svar')}</button>}
            {status === 'delegated' && (
              <>
                <button type="button" onClick={() => onOpen(it.id)} className="btn-ghost-sm" aria-label={t('Send selv') + ': ' + t(it.label)}>{t('Send selv')}</button>
                <button type="button" onClick={() => csConfirmUndo(it.id)} data-cust-act="undo" className="btn-ghost-sm" aria-label={t('Tag tilbage') + ': ' + t(it.label)}>{t('Tag tilbage')}</button>
              </>
            )}
            {label && <span className="cwp-row-pill-side">{label}</span>}
            {delivered && (
              <button type="button" onClick={() => setReceipt(!receipt)} className="btn-ghost-sm" style={{ padding: '0 6px', minWidth: 28 }} aria-expanded={receipt}
                title={receipt ? t('Skjul detaljerne') : t('Vis detaljerne')}
                aria-label={ncFill(receipt ? t('Skjul detaljerne for {item}') : t('Vis detaljerne for {item}'), { item: t(it.label) })}>
                <I.ChevronRight size={16} style={{ color: 'var(--c-text-3)', transform: receipt ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}/>
              </button>
            )}
          </div>
        )}
      </div>
      {receipt && s && (
        <div className="cwp-receipt" role="region" tabIndex={-1} aria-label={ncFill(t('Detaljer for {item}'), { item: t(it.label) })} style={{ margin: '0 18px 14px 54px', fontSize: 13, color: 'var(--c-text)', outline: 'none' }}>
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map(f => (
                <div key={f.id}>
                  <button type="button" className="cwp-linkbtn" onClick={() => csOpenFile(f)} style={{ wordBreak: 'break-all', textAlign: 'left' }}>{f.name}</button>
                  <div className="muted" style={{ fontSize: 12.5 }}>{(f.by || s.by) === 'rådgiver' ? ncFill(t('Tilføjet af {adv}'), { adv }) : t('Uploadet af jer')} {csShortDate(f.at)}</div>
                </div>
              ))}
            </div>
          )}
          {answers && <div style={{ marginTop: files.length ? 8 : 0 }}><span className="muted">{t('Jeres svar:')}</span> {answers}</div>}
          {!files.length && !answers && status !== 'noted' && <div className="muted">{t('Ingen filer')}</div>}
          {s.note && !sourceText && <div style={{ marginTop: 6 }}><span className="muted">{t('Jeres bemærkning:')}</span> {s.note}</div>}
          {answered && s.question && <div style={{ marginTop: 6 }}><span className="muted">{ncFill(t('{adv} spurgte:'), { adv })}</span> {s.question}</div>}
          {answered && <div style={{ marginTop: s.question ? 2 : 6 }}><span className="muted">{ncFill(t('Jeres svar til {adv}:'), { adv })}</span> {s.answer}</div>}
          {sourceText && consent && <div className="muted" style={{ marginTop: 6 }}>{sourceText} · {portalConsentUntil(consent)}</div>}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8, marginLeft: -8 }}>
            {status !== 'approved' && !readOnly && (
              <button type="button" className="btn-ghost-sm" data-act={status === 'received' && kind !== 'trade' ? 'add-file' : undefined} onClick={() => onOpen(it.id)}>{editLabel}</button>
            )}
            {files.length > 0 && <button type="button" className="btn-ghost-sm" onClick={() => downloadFiles(files)}>{t('Download')}</button>}
            {readOnly && kind === 'connect' && consent && <button type="button" className="btn-ghost-sm" data-cust-act="consent" onClick={() => portalRevoke(consent)}>{t('Træk adgangen tilbage')}</button>}
            {csCanUndo(s) && !readOnly && <button type="button" className="btn-ghost-sm" data-cust-act="undo" onClick={() => csConfirmUndo(it.id)}>{status === 'noted' ? t('Fortryd bemærkning') : t('Fortryd')}</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// Filvælger med træk-og-slip og liste over valgte filer (endnu ikke sendt)
// Gemmer punktets kladde løbende (CF1) og returnerer tidspunktet for seneste gem
function usePortalDraft(itemId, value) {
  const [at, setAt] = React.useState(() => { const d = csDraft(itemId); return d ? d.at : null; });
  const first = React.useRef(true);
  const key = JSON.stringify([(value.files || []).map(f => f.id), value.note || '']);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    const d = csSaveDraft(itemId, value);
    setAt(d ? d.at : null);
  }, [key]);
  return at;
}

/* Kun på Kundeside: rådgiveren uploader på kundens vegne. Stiplet som de andre
   ting, kunden ikke ser. */
function PortalPvUploadNote() {
  if (!CW.isPreview()) return null;
  return (
    <div className="cwp-pv-upnote">
      {t('Du uploader på kundens vegne. Filen står som uploadet af dig, og punktet går til gennemgang.')}
    </div>
  );
}

function PortalFilePicker({ staged, setStaged, accept = CS_ACCEPT, title, hint, compact, itemId }) {
  const inputRef = React.useRef(null);
  const [drag, setDrag] = React.useState(false);
  const [err, setErr] = React.useState('');       // forkert filtype eller for stor
  const [said, setSaid] = React.useState('');     // til skærmlæsere: "<fil> er klar til at sende"
  const add = (list) => {
    const arr = csAcceptFiles(list, accept, setErr);
    if (arr.length) {
      setStaged(prev => prev.concat(csStageFiles(arr, itemId)));
      setSaid(arr.length === 1 ? ncFill(t('{file} er klar til at sende'), { file: arr[0].name }) : ncFill(t('{n} filer er klar til at sende'), { n: arr.length }));
    }
  };
  const pickFiles = () => inputRef.current && inputRef.current.click();
  return (
    <>
      <div className="cwp-drop" role="button" tabIndex={0} data-cust-act="upload" data-pv-allow="1" aria-label={(title || t('Træk filer hertil, eller vælg filer')) + '. ' + t('Vælg filer')}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFiles(); } }}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        onClick={pickFiles}
        style={{ border: '2px dashed ' + (drag ? 'var(--c-primary)' : 'var(--c-line-strong)'), background: drag ? 'rgba(29,78,216,0.06)' : '#fff', borderRadius: compact ? 10 : 14, padding: compact ? '20px 18px' : '30px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 150ms' }}>
        <div style={{ fontSize: compact ? 13.5 : 15, fontWeight: 500, color: 'var(--c-ink)' }}>{title || t('Træk filer hertil, eller vælg filer')}</div>
        <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginTop: 4 }}>{hint || t('PDF, Excel, Word eller billeder · højst 50 MB pr. fil')}</div>
        <span aria-hidden="true" className="btn btn-sm" style={{ marginTop: 12, pointerEvents: 'none' }}>{t('Vælg filer')}</span>
        <input ref={inputRef} type="file" multiple accept={accept} style={{ display: 'none' }} onChange={e => { add(e.target.files); e.target.value = ''; }} data-testid="portal-file-input"/>
      </div>
      <div role="status" className="cwp-file-status" style={ncHidden}>{said}</div>
      {err && <div role="alert" className="cwp-file-err" style={{ marginTop: 8, fontSize: 13, color: 'var(--c-danger)' }}>{err}</div>}
      {staged.length > 0 && (
        <div style={{ marginTop: 12, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px 0', fontSize: 12.5, fontWeight: 500, color: 'var(--c-text-2)' }}>{t('Klar til at sende')}</div>
          {staged.map((f, i) => (
            <div key={i + f.name} style={{ padding: '10px 16px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-all' }}>{f.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{CW.fmtSize(f.size)}</div>
              </div>
              <button type="button" className="btn-ghost-sm" onClick={() => cwConfirmRemove(f.name, t('Filen er ikke sendt endnu.')).then(ok => { if (ok) setStaged(prev => prev.filter((_, j) => j !== i)); })} aria-label={ncFill(t('Fjern {file}'), { file: f.name })}>{t('Fjern')}</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Det blå "!" for et spørgsmål fra rådgiveren (rækken på oversigten og punktets side)
function PortalAskMark() {
  return <span aria-hidden="true" className="cwp-ask">!</span>;
}

/**
 * Rådgiverens spørgsmål til punktet. Kunden kan svare med tekst alene; en ny fil
 * er kun nødvendig, når spørgsmålet beder om den. Med value/onChange styrer
 * punktets side feltet og sender svaret med sin egen knap (én primærknap, K6).
 * Uden (landefordelingen, der har sin egen knap) har boksen sin egen "Send svar".
 */
function PortalQuestion({ item, value, onChange, onAnswered, ownButton }) {
  const s = CW.itemState(item.id);
  const adv = PORTAL_CONTACT.first;
  const own = !onChange || !!ownButton;
  const [text, setText] = React.useState('');
  const v = onChange ? (value || '') : text;
  const set = onChange || setText;
  const send = () => {
    const by = CW.isPreview() ? 'rådgiver' : 'kunde';
    if (!v.trim() || !CW.answerItem(item.id, v, { by })) return;
    csClearDraft(item.id);
    CW.toast(by === 'rådgiver' ? t('Svaret er gemt på kundens vegne') : ncFill(t('Svaret er sendt til {name}'), { name: adv }));
    if (onAnswered) onAnswered();
  };
  return (
    <section className="cwp-question" aria-labelledby="cwp-q-h">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <PortalAskMark/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="cwp-q-h" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)', margin: '1px 0 0' }}>{ncFill(s && s.reviewNote ? t('{adv} spørger') : t('{adv} beder om en ny version'), { adv })}</h2>
          {s && s.reviewNote && <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--c-text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{s.reviewNote}</p>}
        </div>
      </div>
      <div className="field" style={{ margin: '12px 0 0' }}>
        <label htmlFor="cwp-answer">{ncFill(t('Jeres svar til {adv}'), { adv })}</label>
        <textarea id="cwp-answer" className="input" rows={3} value={v} onChange={e => set(e.target.value)}
          onKeyDown={own ? (e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } }) : undefined}
          placeholder={t('Skriv jeres svar her')} aria-describedby="cwp-answer-hint"
          style={{ height: 'auto', padding: 10, resize: 'vertical', background: '#fff', lineHeight: 1.5 }}/>
        <div id="cwp-answer-hint" className="muted" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>
          {own ? t('I kan svare her eller rette skemaet nedenfor.') : ncFill(t('Svaret kan stå alene. Beder {adv} om en ny fil, kan I uploade den nedenfor.'), { adv })}
        </div>
      </div>
      {own && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="button" className={'btn' + (v.trim() ? ' btn-primary' : '')} data-cust-act="send" data-pv-allow="1" disabled={!v.trim()} onClick={send}
            style={v.trim() ? { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' } : { opacity: 0.5, cursor: 'not-allowed' }}>
            <I.Send size={12}/> {t('Send svar')}
          </button>
        </div>
      )}
    </section>
  );
}

// Punktets side: titel, beskrivelse og "Hvorfor" (K2 flyttede den hertil). Et
// spørgsmål fra rådgiveren står i en boks med svarfeltet. Ingen versal-overskrift (K6).
function PortalItemHead({ item, answer, setAnswer, onAnswered, ownButton }) {
  const s = CW.itemState(item.id);
  const adv = PORTAL_CONTACT.first;
  const asked = !!s && s.status === 'rejected';
  const note = s && s.status === 'delegated' && s.reviewNote ? s.reviewNote : '';
  return (
    <>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: '0 0 6px' }}>{t(item.label)}</h1>
      <p style={{ fontSize: 14, color: 'var(--c-text-2)', lineHeight: 1.55, margin: '0 0 4px' }}>{t(item.desc)}</p>
      <p style={{ fontSize: 13, color: 'var(--c-text-3)', lineHeight: 1.55, margin: asked ? '0 0 14px' : note || (s && s.status === 'noted') ? '0 0 8px' : '0 0 18px' }}>{t('Hvorfor')}: {t(item.why)}</p>
      {asked && <PortalQuestion item={item} value={answer} onChange={setAnswer} onAnswered={onAnswered} ownButton={ownButton}/>}
      {note && (
        <p role="status" style={{ fontSize: 13.5, color: 'var(--c-text)', lineHeight: 1.55, margin: '0 0 18px' }}>
          {ncFill(t('{adv} skriver:'), { adv })} <span style={{ color: 'var(--c-text-2)' }}>{note}</span>
        </p>
      )}
      {s && s.status === 'noted' && (
        <div style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--c-text)', display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 220, lineHeight: 1.55 }}>
            {s.note && <span style={{ display: 'block' }}>{ncFill(t('I har skrevet til {adv}'), { adv })}: <span style={{ color: 'var(--c-text-2)' }}>"{s.note}"</span></span>}
            {s.answer && <span style={{ display: 'block' }}>{ncFill(t('I har svaret {adv}'), { adv })}: <span style={{ color: 'var(--c-text-2)' }}>"{s.answer}"</span></span>}
            <span className="muted">{t('Har I alligevel en fil, kan I sende den nedenfor.')}</span>
          </span>
          {csCanUndo(s) && <button type="button" className="btn-ghost-sm" data-cust-act="undo" onClick={() => csConfirmUndo(item.id)}>{t('Fortryd bemærkning')}</button>}
        </div>
      )}
    </>
  );
}

// "Har vi ikke / ikke relevant": samme formular som før. Når den er åben, skjuler
// punktets side sin egen upload og "Færdig", så der kun er én primærknap (K6).
function PortalNotedToggle({ item, open, setOpen, onDone }) {
  if (!open) return <button type="button" className="btn btn-ghost" data-cust-act="send" onClick={() => setOpen(true)} aria-expanded={false}>{t('Har vi ikke / ikke relevant')}</button>;
  return (
    <div style={{ width: '100%' }}>
      <CWNotedForm itemId={item.id} idPrefix="cwp" onDone={onDone} onCancel={() => setOpen(false)}/>
    </div>
  );
}

// Filer, der allerede er sendt til punktet, med "Åbn" og (for kundens egne) "Fjern"
function PortalSentFiles({ item, files }) {
  const adv = PORTAL_CONTACT.first;
  if (!files.length) return null;
  return (
    <div style={{ marginBottom: 14, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px 0', fontSize: 12.5, fontWeight: 500, color: 'var(--c-text-2)' }}>{ncFill(t('Allerede sendt til {adv}'), { adv })}</div>
      {files.map((f, i) => {
        const mine = CW.canRemoveFile(item.id, f.id, 'kunde');
        return (
          <div key={f.id} style={{ padding: '10px 16px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-all' }}>{f.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{f.sizeLabel} · <span title={CW.fmtWhen(f.at)}>{csShortDate(f.at)}</span>{!mine ? ' · ' + ncFill(t('tilføjet af {adv}'), { adv }) : ''}</div>
            </div>
            <button type="button" className="btn-ghost-sm" onClick={() => csOpenFile(f)} aria-label={t('Åbn') + ' ' + f.name}>{t('Åbn')}</button>
            {mine && <button type="button" className="btn-ghost-sm" data-cust-act="remove" onClick={() => csRemoveOwnFile(item.id, f)} aria-label={ncFill(t('Fjern {file}'), { file: f.name })}>{t('Fjern')}</button>}
          </div>
        );
      })}
    </div>
  );
}

function PortalUpload({ item, onBack, onFinish, onNoted }) {
  CW.useCase();
  const s = CW.itemState(item.id);
  // Afvist, eller afvist og derefter sendt til en hjælper: de gamle filer gælder ikke længere
  const rejected = !!s && s.status === 'delegated' && !!s.reviewedAt;
  const existing = s && !rejected ? (s.files || []) : [];
  const draft0 = React.useMemo(() => csDraft(item.id), [item.id]);
  const [staged, setStaged] = React.useState(draft0 && draft0.files ? draft0.files : []);
  const [note, setNote] = React.useState(draft0 && draft0.note != null ? draft0.note : s && s.status === 'received' && s.noteKind !== 'system' ? (s.note || '') : '');
  const [noteOpen, setNoteOpen] = React.useState(!!note);
  const [notedOpen, setNotedOpen] = React.useState(false);
  const draftAt = usePortalDraft(item.id, { files: staged, note });
  const total = existing.length + staged.length;
  const adv = PORTAL_CONTACT.first;
  const canNote = existing.length === 0 && (!s || s.status !== 'noted');
  // Rådgiveren (Kundeside) kan færdiggøre punktet med blot en bemærkning, fx når en fil ikke er relevant for virksomheden
  const noteOnly = CW.isPreview() && total === 0 && !!note.trim();
  // Spørgsmål fra rådgiveren: svarfeltet står øverst, og et svar alene kan sendes
  const asked = !!s && s.status === 'rejected';
  // Med et spørgsmål kræver knappen noget nyt: et svar eller en fil (de sendte filer står allerede)
  const canFinish = asked ? staged.length > 0 || !!note.trim() : total > 0 || noteOnly;
  const answerOnly = asked && staged.length === 0;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PortalBackNav onBack={onBack}/>
      <PortalItemHead item={item} answer={note} setAnswer={setNote}/>

      {notedOpen ? (
        <PortalNotedToggle item={item} open setOpen={setNotedOpen} onDone={onNoted}/>
      ) : (
        <>
          {asked && <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', margin: '22px 0 8px' }}>{existing.length ? t('Tilføj en fil, hvis der er brug for det') : t('Send en ny fil, hvis der er brug for det')}</h2>}
          <PortalSentFiles item={item} files={existing}/>
          <PortalPvUploadNote/>
          <PortalFilePicker staged={staged} setStaged={setStaged} itemId={item.id}/>

          {asked ? null : noteOpen ? (
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="cwp-note">{ncFill(t('Bemærkning til {adv} (valgfri)'), { adv })}</label>
              <textarea id="cwp-note" className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={t('Fx hvilken version det er, eller hvad der mangler')} style={{ height: 'auto', padding: 10, resize: 'vertical' }}/>
            </div>
          ) : (
            <button type="button" className="btn-ghost-sm" style={{ marginTop: 12, marginLeft: -8 }} onClick={() => { setNoteOpen(true); CW.focusSoon('#cwp-note'); }}>
              <I.Plus size={12}/> {t('Tilføj en bemærkning')}
            </button>
          )}

          <div className="cwp-stack" style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            {canNote ? <PortalNotedToggle item={item} open={false} setOpen={setNotedOpen} onDone={onNoted}/> : <span/>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
              {draftAt && <span className="muted cwp-draft-at" style={{ fontSize: 12.5 }}>{ncFill(t('Kladde gemt kl. {tid}'), { tid: csHHMM(draftAt) })}</span>}
              {!canFinish && <span id="cwp-up-hint" className="muted" style={{ fontSize: 12.5 }}>{asked ? t('Skriv et svar, eller vælg en fil') : CW.isPreview() ? t('Vælg en fil, eller skriv en bemærkning') : t('Vælg mindst én fil')}</span>}
              <button type="button" className="btn btn-primary" data-cust-act="send" data-pv-allow="1" disabled={!canFinish} onClick={() => onFinish(staged, note.trim())} aria-describedby={!canFinish ? 'cwp-up-hint' : undefined}
                style={canFinish ? { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' } : { opacity: 0.5, cursor: 'not-allowed' }}>
                {answerOnly && note.trim() ? t('Send svar') : t('Færdig med dette punkt')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Antal hele måneder i "år til dato" (samme periode som portalPeriod)
function portalMonths(end) {
  return portalPeriodEnd(end).m + 1;
}

/**
 * Punktet Periodetal: forbind regnskabssystemet (aftalen, datadelingen og valget
 * af system ligger i PortalErpSetup, samme kort som i opstarten), eller
 * upload en saldobalance selv.
 */
function PortalConnect({ item, onBack, onFinish, onNoted }) {
  CW.useCase();
  const [setup, setSetup] = React.useState(false);
  const [staged, setStaged] = React.useState(() => { const d = csDraft(item.id); return d && d.files ? d.files : []; });
  const [notedOpen, setNotedOpen] = React.useState(false);
  const connDraftAt = usePortalDraft(item.id, { files: staged });
  const consent = CW.consent();
  const ob = CW.onboarding();
  const s = CW.itemState(item.id);
  // Afvist, eller afvist og derefter sendt til en hjælper: de gamle filer gælder ikke længere
  const rejected = !!s && s.status === 'delegated' && !!s.reviewedAt;
  const existing = s && !rejected ? (s.files || []) : [];
  const fromSystem = !!(s && s.noteKind === 'system' && !rejected);
  const revoke = () => portalRevoke(consent);
  // Spørgsmål fra rådgiveren: et svar alene kan sendes (se PortalUpload)
  const asked = !!s && s.status === 'rejected';
  const [answer, setAnswer] = React.useState('');
  const canSend = staged.length > 0 || (asked && !!answer.trim());
  const answerOnly = asked && staged.length === 0;

  if (setup) return <PortalErpSetup backLabel={ncFill(t('Tilbage til {item}'), { item: t(item.label) })} onBack={() => { setSetup(false); CW.focusSoon('.cwp-main h1'); }} onDone={() => { setSetup(false); onBack(); }}/>;

  const total = existing.length + staged.length;
  const canNote = existing.length === 0 && (!s || s.status !== 'noted');
  const waiting = ob.erp && ob.erp.waiting;
  const sentSelf = ob.agreement && ob.agreement.declined;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PortalBackNav onBack={onBack}/>
      <PortalItemHead item={item} answer={answer} setAnswer={setAnswer}/>

      {notedOpen ? (
        <PortalNotedToggle item={item} open setOpen={setNotedOpen} onDone={onNoted}/>
      ) : (
      <>
      {consent && (
        <div role="status" className="cw-row" style={{ marginBottom: 16, padding: '12px 16px', background: '#fff', border: '1px solid var(--c-line)', borderRadius: 10, alignItems: 'center' }}>
          <div className="cw-row-main">
            <span className="cw-row-title" style={{ fontSize: 13.5 }}>{ncFill(t('Forbundet til {src} (kun læseadgang)'), { src: consent.system })}</span>
            <span className="cw-row-meta" style={{ fontSize: 12.5 }}>{portalConsentUntil(consent)}</span>
          </div>
          <button type="button" className="btn btn-sm" data-cust-act="consent" onClick={revoke}>{t('Træk adgangen tilbage')}</button>
        </div>
      )}
      {!consent && fromSystem && (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.55 }}>
          {ncFill(t('Tallene blev hentet {when}, og EIFO har dem stadig. Adgangen til regnskabssystemet er trukket tilbage.'), { when: csShortDate(s.at) })}
        </p>
      )}
      {!consent && (
        <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', margin: 0 }}>{t('Hent tallene fra jeres regnskabssystem')}</h2>
            <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.5 }}>
              {waiting ? t('I ventede på jeres revisor. Har I fået adgangen, kan I forbinde nu.')
                : sentSelf ? t('I valgte at sende tallene selv. I kan stadig forbinde, hvis det er nemmere.')
                : t('Med læseadgang henter EIFO saldobalance, periodetal og debitordata. I logger ind i jeres eget system.')}
            </div>
          </div>
          <button type="button" className="btn btn-primary" data-cust-act="erp" onClick={() => { setSetup(true); CW.focusSoon('.cwp-main h1'); }} style={{ background: 'var(--c-primary)', borderColor: 'var(--c-primary)' }}>{t('Forbind regnskabssystem')}</button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--c-line-2)' }}/>
        <span style={{ fontSize: 12.5, color: 'var(--c-text-3)', fontWeight: 500 }}>{consent || fromSystem ? t('supplér eventuelt') : t('eller')}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--c-line-2)' }}/>
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', margin: '0 0 8px' }}>{t('Upload en saldobalance selv')}</h2>
      <PortalSentFiles item={item} files={existing}/>
      <PortalPvUploadNote/>
      <PortalFilePicker compact staged={staged} setStaged={setStaged} itemId={item.id} accept=".xlsx,.xls,.csv,.pdf"
        title={t('Træk saldobalancen hertil, eller vælg filen')} hint={t('Excel, CSV eller PDF · eksportér den fra jeres bogføringssystem')}/>
      <div className="cwp-stack" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {canNote ? <PortalNotedToggle item={item} open={false} setOpen={setNotedOpen} onDone={onNoted}/> : <span/>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
          {connDraftAt && <span className="muted cwp-draft-at" style={{ fontSize: 12.5 }}>{ncFill(t('Kladde gemt kl. {tid}'), { tid: csHHMM(connDraftAt) })}</span>}
          {!canSend && <span id="cwp-conn-hint" className="muted" style={{ fontSize: 12.5 }}>{asked ? t('Skriv et svar, eller vælg en fil') : total === 0 ? t('Vælg mindst én fil') : t('Vælg en fil for at sende mere')}</span>}
          <button type="button" className="btn btn-primary" data-cust-act="send" data-pv-allow="1" disabled={!canSend} onClick={() => onFinish(staged, asked ? answer.trim() : undefined)} aria-describedby={!canSend ? 'cwp-conn-hint' : undefined}
            style={canSend ? { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' } : { opacity: 0.5, cursor: 'not-allowed' }}>
            {answerOnly ? t('Send svar') : t('Færdig med dette punkt')}
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

// Salg fordelt på lande: samme skema som før. "Har vi ikke" skjuler skemaet (K6).
function PortalTradeScreen({ item, onBack, onDone }) {
  CW.useCase();
  const s = CW.itemState(item.id);
  const [notedOpen, setNotedOpen] = React.useState(false);
  const [answer, setAnswer] = React.useState('');
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PortalBackNav onBack={onBack}/>
      <PortalItemHead item={item} answer={answer} setAnswer={setAnswer} onAnswered={onDone} ownButton/>
      {notedOpen
        ? <PortalNotedToggle item={item} open setOpen={setNotedOpen} onDone={onDone}/>
        : <CWTradeForm itemId={item.id} idPrefix="cwp" onDone={onDone} answer={answer.trim()}/>}
      {!notedOpen && (!s || s.status === 'rejected') && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--c-line-2)' }}>
          <PortalNotedToggle item={item} open={false} setOpen={setNotedOpen} onDone={onDone}/>
        </div>
      )}
    </div>
  );
}

// Statussiden (K3): kun kvitteringen og tidslinjen. Punkterne står på oversigten.
function PortalStatus({ justSubmitted, onBack }) {
  CW.useCase();
  const rcp = portalRecipient();
  const cs = CW.caseState() || {};
  const prog = CW.progress();
  const req = CW.request();
  const lock = CW.customerLock();
  const at = cs.customerSubmittedAt;
  const adv = PORTAL_CONTACT.first;
  const back = at ? CW.fmtDate(csAddWorkdays(new Date(at), 2)) : '';
  const title = lock ? t('Materialet er hos kreditkomitéen')
    : at ? ncFill(t('{adv} ved nu, at I er færdige'), { adv })
    : t('Status for jeres ansøgning');
  const lead = lock ? ncFill(t('{adv} har sendt jeres ansøgning videre. I hører fra EIFO, når der er en afgørelse.'), { adv })
    : at ? (justSubmitted
      ? ncFill(t('Hun vender tilbage senest {date}.'), { date: back }) + (rcp.email ? ' ' + ncFill(t('I får en kvittering på {email}.'), { email: rcp.email }) : '')
      : ncFill(t('I sagde {date}, at I var færdige. {adv} gennemgår materialet og vender tilbage senest {date2}.'), { date: CW.fmtDate(at), adv, date2: back }))
    : req && prog.requiredMissing > 0 ? ncFill(t('I mangler {n} af {m} påkrævede punkter. Se dem på oversigten.'), { n: prog.requiredMissing, m: prog.required })
    : ncFill(t('{navn} gennemgår det, I har sendt.'), { navn: adv });
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PortalBackNav onBack={onBack}/>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: '0 0 6px' }}>{title}</h1>
      <p role={justSubmitted ? 'status' : undefined} style={{ fontSize: 14.5, color: 'var(--c-text-2)', lineHeight: 1.55, margin: '0 0 22px' }}>{lead}</p>
      <CWTimeline/>
    </div>
  );
}

// Filer, der ikke hører til et punkt ("Andet"). Før lå de kun på statussiden.
function PortalOtherFilesModal({ onClose }) {
  CW.useCase();
  const ref = React.useRef(null);
  const [staged, setStaged] = React.useState([]);
  const sending = React.useRef(false);
  CW.useDialog(ref, true, onClose);
  const adv = PORTAL_CONTACT.first;
  const loose = CW.allUploads().filter(f => !f.itemId && f.by === 'kunde');
  const send = () => {
    if (!staged.length || sending.current) return;
    sending.current = true;
    CW.addLooseUploads(staged);
    CW.toast(ncFill(staged.length === 1 ? t('1 fil sendt til {navn}') : t('{n} filer sendt til {navn}'), { n: staged.length, navn: adv }));
    onClose();
  };
  const remove = (f) => {
    CW.confirm({ title: ncFill(t('Fjern {navn}?'), { navn: f.name }), text: ncFill(t('{navn} har allerede fået filen. Hun kan se i sagens historik, at I har fjernet den.'), { navn: adv }), confirmLabel: t('Fjern filen'), danger: true })
      .then(r => { if (r.ok) { CW.removeLooseUpload(f.id); CW.toast(ncFill(t('{navn} er fjernet'), { navn: f.name })); } });
  };
  return (
    <div className="scrim">
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="cwp-o-title" style={{ width: 520 }}>
        <div className="modal-head">
          <div>
            <div className="modal-title" id="cwp-o-title">{t('Send en anden fil')}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{ncFill(t('Til filer, der ikke hører til et af punkterne. {adv} får dem med det samme.'), { adv })}</div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Luk')}><I.X size={16}/></button>
        </div>
        <div className="modal-body">
          {loose.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-text-2)', marginBottom: 2 }}>{t('Andre filer, I har sendt')}</div>
              {loose.map(f => (
                <div key={f.id} className="cw-row" style={{ alignItems: 'center', padding: '6px 0' }}>
                  <div className="cw-row-main">
                    <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{f.name}</span>
                    <span className="cw-row-meta">{f.sizeLabel} · <span title={CW.fmtWhen(f.at)}>{csShortDate(f.at)}</span></span>
                  </div>
                  <button type="button" className="btn-ghost-sm" data-cust-act="remove" onClick={() => remove(f)} aria-label={ncFill(t('Fjern {navn}'), { navn: f.name })}>{t('Fjern')}</button>
                </div>
              ))}
            </div>
          )}
          <PortalFilePicker compact staged={staged} setStaged={setStaged}/>
        </div>
        <div className="modal-foot">
          <div style={{ flex: 1 }}/>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('Annullér')}</button>
          <button type="button" className="btn btn-primary" data-cust-act="send" disabled={!staged.length} onClick={send} style={!staged.length ? { opacity: 0.5, cursor: 'not-allowed' } : null}>{ncFill(t('Send til {name}'), { name: adv })}</button>
        </div>
      </div>
    </div>
  );
}

// K11: hjælp fra revisor eller bank. Almindelige labels, beskeden foldet og
// bekræftelsen som én sætning.
function DelegateBundleModal({ requested, preselect, onClose, onSend }) {
  const ref = React.useRef(null);
  const eligible = requested.filter(it => ['pending', 'rejected', 'delegated'].includes(portalStatus(it.id)));
  // En revisor hjælper typisk med regnskabstallene; resten vælger kunden selv til
  const TYPICAL = ['m-annual', 'm-interim', 'm-budget'];
  const initialFor = (kind) => preselect ? [preselect] : kind === 'accountant' ? eligible.filter(it => TYPICAL.includes(it.id)).map(it => it.id) : [];
  const [kind, setKind] = React.useState('accountant');
  const [selected, setSelected] = React.useState(() => initialFor('accountant'));
  const [selTouched, setSelTouched] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [msgTouched, setMsgTouched] = React.useState(false);
  const [step, setStep] = React.useState('form');
  const [tried, setTried] = React.useState(false);
  const sent = React.useRef(false); // dobbeltklik på "Send" må ikke sende to gange
  CW.useDialog(ref, true, onClose);

  const sender = ncFirstName(portalRecipient().name);
  const helperFirst = ncFirstName(name);
  // Har rådgiveren afvist et punkt med en note, skal hjælperen også vide, hvad hun bad om
  const notes = eligible.filter(it => selected.includes(it.id)).map(it => ({ it, note: (CW.itemState(it.id) || {}).reviewNote || '' })).filter(x => x.note);
  const notesText = notes.length ? '\n\n' + ncFill(t('{adv} fra EIFO har bedt om:'), { adv: PORTAL_CONTACT.name }) + '\n' + notes.map(x => '- ' + t(x.it.label) + ': ' + x.note).join('\n') : '';
  const defaultMsg = (helperFirst ? ncFill(t('Hej {name},'), { name: helperFirst }) : t('Hej,')) + '\n\n'
    + t('Vil du hjælpe os med at sende punkterne nedenfor til EIFO? Det er til vores ansøgning. Du får et link, hvor du kan uploade dem direkte.')
    + notesText + '\n\n'
    + ncFill(t('Venlig hilsen\n{sender}\n{company}'), { sender, company: DATA.COMPANY.name });
  const message = msgTouched ? msg : defaultMsg;

  const switchKind = (k) => { setKind(k); if (!selTouched) setSelected(initialFor(k)); };
  const toggle = (id) => { setSelTouched(true); setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); };
  const emailOk = NC_EMAIL_RE.test(email.trim());
  const err = !selected.length ? 'items' : !name.trim() ? 'name' : !emailOk ? 'email' : null;
  const FIELD = { items: 'cwp-h-item-' + (eligible[0] && eligible[0].id), name: 'cwp-h-name', email: 'cwp-h-email' };
  const label = kind === 'bank' ? t('banken') : t('revisoren');
  // Hjælperens link følger kundens frist (ellers 14 dage)
  const reqDeadline = (CW.request() || {}).deadline;
  const expires = reqDeadline ? CW.fmtDate(reqDeadline + 'T12:00:00') : CW.fmtDate(new Date(Date.now() + 14 * 864e5));
  const preselected = kind === 'accountant' && !selTouched && !preselect && selected.length > 0;
  const chosen = eligible.filter(it => selected.includes(it.id));
  const next = () => {
    setTried(true);
    if (err) { CW.focusSoon('#' + FIELD[err]); return; }
    setStep('confirm');
  };
  const send = () => {
    if (sent.current) return;
    sent.current = true;
    onSend(selected, { name: name.trim(), email: email.trim() }, kind);
  };
  const fieldLabel = { display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--c-text-2)', marginBottom: 6, padding: 0 };

  return (
    <div className="scrim">
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="cwp-h-title" style={{ width: 560 }}>
        <div className="modal-head">
          <div>
            <div className="modal-title" id="cwp-h-title">{step === 'form' ? t('Få hjælp fra revisor eller bank') : t('Tjek før I sender')}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{ncFill(t('{who} får et link, der kun gælder de valgte punkter'), { who: kind === 'bank' ? t('Banken') : t('Revisoren') })}</div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Luk')}><I.X size={16}/></button>
        </div>
        {step === 'form' ? (
          <div className="modal-body">
            <div id="cwp-h-kind" style={fieldLabel}>{t('Hvem skal hjælpe?')}</div>
            <div role="radiogroup" aria-labelledby="cwp-h-kind" className="cw-seg" style={{ marginBottom: 16 }}
              onKeyDown={e => {
                // Én radiogruppe: piletasterne skifter mellem Revisor og Bank (ét tabulatorstop)
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
                e.preventDefault();
                const k = kind === 'accountant' ? 'bank' : 'accountant';
                switchKind(k);
                CW.focusSoon('#cwp-h-kind-' + k);
              }}>
              {[{ k: 'accountant', l: 'Revisor' }, { k: 'bank', l: 'Bank' }].map(opt => (
                <button type="button" key={opt.k} id={'cwp-h-kind-' + opt.k} role="radio" aria-checked={kind === opt.k} tabIndex={kind === opt.k ? 0 : -1} onClick={() => switchKind(opt.k)}
                  style={{ minWidth: 88, height: 30, fontSize: 13, background: kind === opt.k ? '#fff' : 'transparent', color: kind === opt.k ? 'var(--c-ink)' : 'var(--c-text-2)', boxShadow: kind === opt.k ? '0 1px 2px rgba(15, 17, 20, 0.06)' : 'none' }}>
                  {t(opt.l)}
                </button>
              ))}
            </div>
            <fieldset style={{ border: 0, margin: 0, padding: 0 }} aria-describedby={tried && err === 'items' ? 'cwp-h-items-err' : 'cwp-h-items-hint'}>
              <legend style={fieldLabel}>{t('Vælg punkter')} {label} {t('skal hjælpe med')}</legend>
              <div style={{ border: '1px solid var(--c-line)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                {eligible.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--c-text-3)' }}>{t('Ingen åbne punkter at delegere')}</div>
                )}
                {eligible.map((x, i) => (
                  <label key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none', cursor: 'pointer', background: '#fff' }}>
                    <input id={'cwp-h-item-' + x.id} type="checkbox" checked={selected.includes(x.id)} onChange={() => toggle(x.id)}/>
                    <div style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)' }}>{t(x.label)}</div>
                    {portalStatus(x.id) === 'delegated' && <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{t('Afventer allerede')}</span>}
                  </label>
                ))}
              </div>
              <div id="cwp-h-items-hint" className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>{preselected ? t('Forvalgt: de regnskabspunkter, en revisor typisk hjælper med. Ejerforhold og aftaler bør I selv sende.') : kind === 'accountant' ? t('Vælg de punkter, revisoren skal hjælpe med. Ejerforhold og aftaler bør I selv sende.') : t('Vælg kun de punkter, banken skal hjælpe med.')}</div>
              {tried && err === 'items' && <div style={{ marginTop: -10, marginBottom: 12 }}><NcFieldError id="cwp-h-items-err">{t('Vælg mindst ét punkt.')}</NcFieldError></div>}
            </fieldset>

            <div className="grid g-2" style={{ gap: 10 }}>
              <div className="field">
                <label htmlFor="cwp-h-name">{t('Navn')}</label>
                <input id="cwp-h-name" className="input" value={name} placeholder={kind === 'bank' ? t('Jeres kontaktperson i banken') : t('Jeres revisor')}
                  aria-invalid={tried && err === 'name' ? 'true' : undefined} aria-describedby={tried && err === 'name' ? 'cwp-h-name-err' : undefined} onChange={e => setName(e.target.value)}/>
                {tried && err === 'name' && <NcFieldError id="cwp-h-name-err">{t('Skriv et navn.')}</NcFieldError>}
              </div>
              <div className="field">
                <label htmlFor="cwp-h-email">{t('Email')}</label>
                <input id="cwp-h-email" className="input" type="email" value={email} placeholder={t('navn@firma.dk')}
                  aria-invalid={tried && err === 'email' ? 'true' : undefined} aria-describedby={tried && err === 'email' ? 'cwp-h-email-err' : undefined} onChange={e => setEmail(e.target.value)}/>
                {tried && err === 'email' && <NcFieldError id="cwp-h-email-err">{email.trim() ? t('Mailadressen ser ikke rigtig ud.') : t('Skriv en mailadresse.')}</NcFieldError>}
              </div>
            </div>
            <CWFold label={t('Ret beskeden (valgfrit)')} id="cwp-h-msg-fold" style={{ marginTop: 14 }}>
              <label htmlFor="cwp-h-msg" style={ncHidden}>{t('Besked til')} {label}</label>
              <textarea id="cwp-h-msg" className="input" rows={6} value={message} onChange={e => { setMsg(e.target.value); setMsgTouched(true); }} style={{ height: 'auto', padding: 10, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}/>
            </CWFold>
          </div>
        ) : (
          <div className="modal-body">
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--c-text)' }}>
              {ncFill(t('{name} ({email}) får et link til {items}. Linket udløber {date}, og {first} ser ikke resten af ansøgningen.'), { name: name.trim(), email: email.trim(), items: chosen.map(it => t(it.label)).join(', '), date: expires, first: ncFirstName(name) || name.trim() })}
            </p>
          </div>
        )}
        <div className="modal-foot">
          {step === 'confirm' && <button type="button" className="btn" onClick={() => setStep('form')}><I.ChevronLeft className="ic"/> {t('Tilbage')}</button>}
          <div style={{ flex: 1 }}/>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('Annullér')}</button>
          {step === 'form'
            ? <button type="button" className="btn btn-primary" onClick={next}>{t('Næste')} <I.ArrowRight className="ic"/></button>
            : <button type="button" className="btn btn-primary" onClick={send}>{kind === 'bank' ? t('Send til bank') : t('Send til revisor')}</button>}
        </div>
      </div>
    </div>
  );
}

window.NewCaseModal = NewCaseModal;
CustomerPortal.supportsPreview = true;
window.CustomerPortal = CustomerPortal;
