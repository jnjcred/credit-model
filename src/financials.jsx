// Fanen Virksomheden (hed før Finansielt overblik): stamdata, regnskab og budget, produkt og marked, Trustpilot og ejerskab

function finFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

/* ─────────────────────────────────────────────────────────────────────────
   Modal i samme opbygning som "Anmod om materiale": titel, én sætning,
   indhold og evt. en footer med én primærknap. Fokus holdes i dialogen,
   Esc lukker, og fokus går tilbage til knappen, der åbnede den.
   ──────────────────────────────────────────────────────────────────────── */
function FinModal({ open, onClose, title, sub, children, footer, width, id }) {
  const ref = React.useRef(null);
  CW.useDialog(ref, !!open, onClose);
  if (!open) return null;
  const titleId = (id || 'fin-modal') + '-title';
  return (
    <div className="scrim" style={{ zIndex: 1000, padding: 16 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} id={id} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}
        style={{ width: width || 480, maxWidth: 'calc(100vw - 32px)' }}>
        <div className="modal-head" style={{ alignItems: 'flex-start', gap: 12, borderBottom: children ? undefined : 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={titleId} className="modal-title" style={{ margin: 0 }}>{title}</h2>
            {sub && <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.5 }}>{sub}</div>}
          </div>
          <button type="button" className="icon-btn" aria-label={t('Luk')} title={t('Luk')} onClick={onClose}><I.X size={15}/></button>
        </div>
        {children && <div className="modal-body" style={{ padding: '6px 22px 16px' }}>{children}</div>}
        {footer && <div className="modal-foot" style={{ background: 'var(--c-surface)' }}>{footer}</div>}
      </div>
    </div>
  );
}

// Dagen de offentlige data blev hentet (DATA.caseTimeline), samme dato på alle skærme
function finPublicDataDate() {
  try { return DATA.fmt.longDate(DATA.caseTimeline(1).publicDataAt) || DATA.COMPANY.masterDataUpdated || ''; } catch (e) { return DATA.COMPANY.masterDataUpdated || ''; }
}

function WSFinancials({ go }) {
  // Regnskab og budgeteditoren viser tal i samme enhed: 'thousand' (DKK t.) eller 'mio'
  const [unit, setUnit] = React.useState('thousand');
  return (
    <div className="page page-wide" style={{ maxWidth: 1080, padding: '24px 32px 80px' }}>
      <div style={{ marginBottom: 4 }}>
        <h1 className="page-title">{t('Virksomheden')}</h1>
        <div className="page-sub" style={{ maxWidth: 720 }}>{t('Kunden samlet ét sted: stamdata, regnskab og budget, marked og ejerskab.')}</div>
      </div>
      <AnnualReportSection go={go} unit={unit} setUnit={setUnit}/>
      <MarketSection/>
      <TrustpilotSection/>
      <CompanySection/>
      <OwnershipSection/>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────── */

function FinSection({ title, sub, badge, children }) {
  return (
    <section style={{ marginTop: 28, marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.01em', lineHeight: 1.25,
          }}>
            {title}
          </h2>
          {sub && <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.5, maxWidth: 760 }}>{sub}</div>}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

// Produktbeskrivelse efter årsrapport 2025, ledelsesberetningen (hovedaktivitet)
const PRODUCT_TEXT = 'Nordhavn Composite A/S udvikler og fremstiller fiberforstærkede kompositkomponenter til vindindustrien: kulfiberlameller og bjælkepakker (spar caps), rodmoduler, næsekanter og servicepaneler til vinger. Produktionen sker på egne anlæg i Frederikshavn og Sæby, og selskabet leverer som underleverandør til vindmølleproducenter (OEM).';

// Markedstal og PEST, sammenfattet automatisk. Uden kilder, indtil hver påstand
// kan knyttes til et konkret dokument eller link.
const MARKET_TEXT = 'Det danske marked for vindkomponenter voksede ca. 6,8 % i 2025. Efterspørgslen i sektionen var stabil i andet kvartal 2026. Konkurrenceniveauet er moderat, med 5-7 spillere i det danske segment.';
const MARKET_PEST = [
  { k: 'Politisk',    desc: "EU's Green Deal og dansk vindkraftpolitik støtter sektoren. Følg evt. handelsbarrierer på import af kompositmaterialer." },
  { k: 'Økonomisk',   desc: 'Stabil branchevækst og lave finansieringsomkostninger. DKK/EUR-følsomhed pga. høj eksportandel kan påvirke marginer.' },
  { k: 'Socialt',     desc: 'Stigende efterspørgsel efter vedvarende energi understøtter ordretilgangen. Mangel på faglært arbejdskraft i kompositfaget kan presse lønningerne.' },
  { k: 'Teknologisk', desc: 'Genanvendelige kompositter og automatisering skaber muligheder, men kræver kapitalinvesteringer for at følge med.' },
];

/* ─────────────────────────────────────────────────────────────────────────
   Produkt, marked og branche. Underteksten siger, at det er AI-sammenfattet
   og ikke kontrolleret mod kilder.
   ──────────────────────────────────────────────────────────────────────── */
function MarketSection() {
  const [uploadState, setUploadState] = React.useState('idle'); // 'idle' | 'uploaded'
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [docModalOpen, setDocModalOpen] = React.useState(false);
  const uploaded = uploadState === 'uploaded';

  return (
    <>
      <FinSection
        title={t('Produkt, marked og branche')}
        sub={finFill(t('AI-sammenfattet baggrund {date}. Ikke kontrolleret mod kilder. Kontrollér før brug i indstillingen.'), { date: finPublicDataDate() })}
      >
        {/* Produktbeskrivelse */}
        <div className="card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Produktbeskrivelse')}</h3>
            {uploaded ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5 }}>
                <button type="button" className="cw-filelink" aria-haspopup="dialog" onClick={() => setDocModalOpen(true)}>produktblad_nordhavn.pdf</button>
                <span style={{ color: 'var(--c-text-3)', fontSize: 12 }}>{t('uploadet')} {DATA.fmt.longDate('2026-06-04')}</span>
                <button type="button" className="btn-ghost-sm" onClick={() => cwConfirmRemove('produktblad_nordhavn.pdf', t('Produktbladet fjernes fra sagen.')).then(ok => { if (ok) setUploadState('idle'); })}>{t('Fjern')}</button>
              </div>
            ) : (
              <button id="fin-product-upload" type="button" className="btn-ghost-sm" aria-haspopup="dialog" onClick={() => setUploadModalOpen(true)}>
                <I.Upload size={13} aria-hidden="true"/> {t('Upload produktblad')}
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.65, maxWidth: 760 }}>
            {t(PRODUCT_TEXT)}
            {uploaded && (
              <>
                {' '}<span style={{ color: 'var(--c-ink)', fontWeight: 500 }}>{t('De tre største kunder (Vestas, GE Vernova og Siemens Gamesa) stod for 56 % af omsætningen i 2025.')}</span>{' '}
                {t('Selskabet investerer ca. DKK 1,6 mio. i 2026 i automatiseret limpåføring og kapacitet til efterbehandling.')}
              </>
            )}
          </div>
        </div>

        {/* Markedstal og PEST i en fold */}
        <div className="card" style={{ padding: '14px 18px 2px', marginTop: 12 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Markedet')}</h3>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.65, maxWidth: 760, paddingBottom: 12 }}>{t(MARKET_TEXT)}</div>
          <CWFold id="fin-pest" label={t('PEST-analyse')} count={MARKET_PEST.length}>
            {MARKET_PEST.map(p => (
              <div key={p.k} className="cw-row" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <div className="cw-row-main">
                  <span className="cw-row-title">{t(p.k)}</span>
                  <span style={{ fontSize: 13, color: 'var(--c-text-2)' }}>{t(p.desc)}</span>
                </div>
              </div>
            ))}
          </CWFold>
        </div>
      </FinSection>

      {/* Upload produktblad: titel, én sætning, én primærknap */}
      <FinModal
        id="fin-upload-product"
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title={t('Upload produktblad')}
        sub={t('PDF, Word eller PowerPoint på højst 20 MB. Det supplerer produktbeskrivelsen.')}
        footer={<>
          <button type="button" className="btn btn-sm" onClick={() => setUploadModalOpen(false)}>{t('Annullér')}</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => { setUploadState('uploaded'); setUploadModalOpen(false); }}>{t('Vælg fil')}</button>
        </>}
      />

      {/* Råvisning af det uploadede produktblad */}
      <FinModal
        id="fin-product-doc"
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="produktblad_nordhavn.pdf"
        width={560}
      >
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.8, color: 'var(--c-text-2)', whiteSpace: 'pre-wrap', paddingTop: 10 }}>
{`PRODUKTBLAD · Nordhavn Composite A/S
Havnegade 42, 9900 Frederikshavn · ${DATA.COMPANY.website}

PRODUKTER
Fiberforstærkede kompositkomponenter til vindmøllevinger:
- Pultruderede kulfiberlameller og bjælkepakker (spar caps)
- Rodmoduler og rodindsatser
- Næsekanter og lukkeprofiler
- Servicepaneler og reparationsemner til eftermarkedet

PRODUKTION
Anlæg i Frederikshavn og Sæby med to RTM-linjer,
vakuuminfusion og autoklav. ISO 9001:2015-certificeret.
84 fuldtidsansatte (2025).

KUNDER
Build-to-print og co-engineering for vindmølle-OEM'er.
Største kunder 2025: Vestas, GE Vernova, Siemens Gamesa.

[Dokumentet fortsætter, 8 sider i alt]`}
        </div>
      </FinModal>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Virksomheden: stamdata fra CVR (flyttet hertil fra Overblik 2. oktober;
   facilitet og beløb står i sagshovedet). Samme indhold som eksporten
   Virksomhedsprofil_CVR.pdf.
   ──────────────────────────────────────────────────────────────────────── */
function CompanySection() {
  const co = DATA.COMPANY;
  const [copied, setCopied] = React.useState(null);
  const present = (v) => v != null && v !== '' && v !== '-';
  const copy = (key, text) => {
    try { navigator.clipboard && navigator.clipboard.writeText(String(text)).catch(() => {}); } catch (e) {}
    setCopied(key);
    setTimeout(() => setCopied(c => (c === key ? null : c)), 1400);
  };
  const Copy = ({ k, text, label }) => (
    <button type="button" className="icon-btn" aria-label={label} title={copied === k ? t('Kopieret') : label} onClick={() => copy(k, text)}
      style={{ display: 'inline-grid', width: 20, height: 20, marginLeft: 4, verticalAlign: 'middle', color: copied === k ? 'var(--c-primary)' : 'var(--c-text-3)' }}>
      {copied === k ? <I.Check size={11}/> : <I.Copy size={11}/>}
    </button>
  );
  const address = [co.address, co.postal].filter(present).join(', ');
  const rows = [
    { label: t('CVR-nr.'), value: present(co.cvr) ? <><span className="mono">{co.cvr}</span><Copy k="cvr" text={String(co.cvr).replace(/\s+/g, '')} label={t('Kopiér CVR-nummer')}/></> : null },
    { label: t('Juridisk form'), value: co.legalForm },
    { label: t('Branche'), value: co.industry },
    { label: t('Stiftelsesdato'), value: co.founded },
    { label: t('Antal ansatte'), value: present(co.employees) ? String(co.employees) : null },
    { label: t('Adresse'), value: address ? <>{address}<Copy k="addr" text={[co.address, co.postal, co.country].filter(present).join(', ')} label={t('Kopiér adresse')}/></> : null },
  ];
  return (
    <FinSection
      title={t('Stamdata')}
      sub={finFill(t('Fra CVR-registret, opdateret {date}.'), { date: co.masterDataUpdated || finPublicDataDate() })}
      badge={co.cvrUrl && (
        <a href={co.cvrUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost-sm" style={{ textDecoration: 'none', marginRight: -8 }}>
          {t('Åbn i CVR')} <I.Link size={10} aria-hidden="true"/>
        </a>
      )}
    >
      <div className="card" style={{ padding: '4px 18px' }}>
        {rows.map(r => (
          <div key={r.label} className="cw-row" style={{ alignItems: 'center' }}>
            <span style={{ color: 'var(--c-text-2)' }}>{r.label}</span>
            <span style={{ color: present(r.value) ? 'var(--c-ink)' : 'var(--c-text-3)', textAlign: 'right' }}>{present(r.value) ? r.value : t('Ikke oplyst')}</span>
          </div>
        ))}
      </div>
    </FinSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Ejerskab og finansielle bindinger: stille ejerliste, bestyrelse med
   PEP-tjek, koncernforhold
   ──────────────────────────────────────────────────────────────────────── */
function OwnershipSection() {
  const [boardModalOpen, setBoardModalOpen] = React.useState(false);
  const [ownershipUploaded, setOwnershipUploaded] = React.useState(false);
  const [showCvrAfterUpload, setShowCvrAfterUpload] = React.useState(false);
  const [comment, setComment] = React.useState('');

  // Bestyrelsen efter årsrapport 2025 og ejerbogen (DATA.BOARD)
  const boardMembers = DATA.BOARD.map(b => ({ name: b.name, role: b.role }));

  const uploadedOwnershipFiles = [
    { name: "Ejerbog_2026.pdf", date: DATA.fmt.longDate('2026-08-03') },
  ];
  const checked = finPublicDataDate();

  return (
    <>
      <FinSection
        title={t('Ejerskab og finansielle bindinger')}
        sub={ownershipUploaded ? t('Ejerstrukturen er erstattet af din upload.') : t('Ejere fra Det Offentlige Ejerregister (CVR), som stemmer med ejerbogen.')}
        badge={ownershipUploaded ? (
          <button type="button" className="btn-ghost-sm" onClick={() => setOwnershipUploaded(false)}>{t('Gendan CVR-data')}</button>
        ) : (
          <button type="button" className="btn-ghost-sm" onClick={() => setOwnershipUploaded(true)}>
            <I.Upload size={13} aria-hidden="true"/> {t('Upload ejerbog')}
          </button>
        )}
      >
        {/* Ejerne som en stille liste, eller den uploadede ejerbog */}
        <div className="card" style={{ padding: '4px 18px' }}>
          {ownershipUploaded ? (
            uploadedOwnershipFiles.map((f, i) => (
              <div key={i} className="cw-row">
                <div className="cw-row-main">
                  <span className="cw-row-title">{f.name}</span>
                  <span className="cw-row-meta">{t('Uploadet')} {f.date}</span>
                </div>
              </div>
            ))
          ) : (
            <OwnerList/>
          )}
        </div>

        {/* Bestyrelse og koncernforhold: altid vist uden upload, kan genvises med upload */}
        {(!ownershipUploaded || showCvrAfterUpload) && (
          <div className="card" style={{ padding: '4px 18px', marginTop: 12 }}>
            {ownershipUploaded && (
              <div style={{ padding: '8px 0 2px', fontSize: 12, color: 'var(--c-text-3)' }}>{t('Fra Virk')}</div>
            )}
            <div className="cw-row" style={{ alignItems: 'center' }}>
              <span style={{ color: 'var(--c-text-2)' }}>{t('Bestyrelse')}</span>
              <button id="fin-board-btn" type="button" className="btn-ghost-sm" aria-haspopup="dialog" onClick={() => setBoardModalOpen(true)} style={{ color: 'var(--c-ink)', marginRight: -8 }}>
                {boardMembers.length} {t('medlemmer · ingen PEP')}
                <I.ChevronRight size={12} aria-hidden="true"/>
              </button>
            </div>
            <div className="cw-row">
              <span style={{ color: 'var(--c-text-2)' }}>{t('Koncernforhold')}</span>
              <span style={{ color: 'var(--c-ink)', textAlign: 'right', maxWidth: 560 }}>{t('Ingen datterselskaber · søsterselskab Nordhavn Production ApS (samhandel på markedsvilkår)')}</span>
            </div>
          </div>
        )}

        {/* Vis/skjul CVR-data og kommentarfelt: kun efter upload */}
        {ownershipUploaded && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
            <button type="button" className="btn-ghost-sm" aria-expanded={showCvrAfterUpload} onClick={() => setShowCvrAfterUpload(v => !v)} style={{ marginLeft: -8 }}>
              {showCvrAfterUpload ? t('Skjul Virk-data') : t('Vis Virk-data (bestyrelse og koncernforhold)')}
            </button>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              aria-label={t('Kommentar om ejerskab')}
              placeholder={t('Tilføj kommentar om ejerskab…')}
              rows={2}
              style={{
                width: '100%', resize: 'vertical', padding: '8px 10px',
                border: '1px solid var(--c-line)', borderRadius: 7,
                fontSize: 13, background: 'var(--c-surface)', color: 'var(--c-ink)',
                fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
              }}
            />
          </div>
        )}
      </FinSection>

      {/* Bestyrelse: ét fælles PEP-resultat i én sætning, rækker med navn og rolle */}
      <FinModal
        id="fin-board"
        open={boardModalOpen}
        onClose={() => setBoardModalOpen(false)}
        title={t('Bestyrelse')}
        sub={finFill(t("Ingen af de {n} medlemmer er PEP. Tjekket mod EU's sanktionsliste og nationale PEP-registre {date}."), { n: boardMembers.length, date: checked })}
        width={500}
      >
        <div>
          {boardMembers.map((m, i) => (
            <div key={i} className="cw-row">
              <span className="cw-row-title">{m.name}</span>
              <span className="cw-row-cat">{t(m.role)}</span>
            </div>
          ))}
        </div>
        <CWFold label={t('Hvad er PEP?')}>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 8px' }}>{t('En PEP er en person, der beklæder eller har beklædt en fremtrædende offentlig stilling, fx statsledere, ministre, parlamentsmedlemmer, højtstående embedsmænd eller ledende personer i internationale organisationer.')}</p>
            <p style={{ margin: '0 0 8px' }}>{t('PEP-kontrol er lovpligtig under hvidvasklovens §§ 14-18 og kræver skærpet kundekendskab (Enhanced Due Diligence) ved konstatering af PEP-status. Crediwire foretager automatisk opslag og gemmer tidsstemplet kontrol-log.')}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-3)' }}>{t('Kilde: Lov om forebyggende foranstaltninger mod hvidvask og finansiering af terrorisme (hvidvaskloven), jf. Europa-Parlamentets direktiv (EU) 2015/849.')}</p>
          </div>
        </CWFold>
      </FinModal>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Årsregnskaber - 3 års overblik
   Public-data table grouped into Resultat, Balance, Nøgletal
   ──────────────────────────────────────────────────────────────────────── */
/* Periodeopsætning for regnskabstabellen.
   Fire kolonnetyper: årsrapport (values) · estimat 2026 (udledt) ·
   realiseret kvartal (q) · budget kvartal (bq).
   Alle tal er i DKK mio.; enhedsvælgeren skalerer først ved visning.

   Kun rå poster står i tabellen nedenfor. Delsummer (bruttofortjeneste, EBITDA,
   aktiver i alt, gæld i alt) og alle nøgletal beregnes i koden, så ingen kolonne
   kan komme til at modsige sine egne tal. */
const FIN_ANNUAL_YEARS = ['2023', '2024', '2025'];
// Realiserede perioder efter Periodetal_jan-aug_2026.xlsx. Q3 er ikke afsluttet,
// så den tredje kolonne er kun juli-august (months: 2) og kaldes ikke Q3.
const FIN_ACTUAL_Q = [
  { label: 'Q1', year: '2026', months: 3 },
  { label: 'Q2', year: '2026', months: 3 },
  { label: 'Jul-aug', year: '2026', months: 2, partial: true },
];
// Budget for september 2026 (budget v3, ark Resultat), rækkernes felt `bs`.
// Står for sig, så FIN_BUDGET_Q stadig er fire hele kvartaler.
const FIN_BUDGET_SEP = { label: 'Sep', year: '2026', key: '2026-09', months: 1 };
const FIN_BUDGET_Q = [
  { label: 'Q4', year: '2026', key: '2026-Q4' },
  { label: 'Q1', year: '2027', key: '2027-Q1' },
  { label: 'Q2', year: '2027', key: '2027-Q2' },
  { label: 'Q3', year: '2027', key: '2027-Q3' },
];

// Tal i DKK mio. q = realiseret Q1, Q2 og juli-august 2026 (periodetal af
// 14-09-2026; balance pr. 31-03, 30-06 og 31-08). bs = budget september 2026,
// bq = budget Q4 2026 til Q3 2027 (budget v3 af 11-09-2026). Balanceposter
// har intet septemberbudget.
const ANNUAL_REPORT = {
  years: FIN_ANNUAL_YEARS,
  groups: [
    {
      label: 'Resultatopgørelse',
      rows: [
        { label: 'Nettoomsætning',                  values: [28.0, 32.8, 41.1],    q: [10.60, 11.10, 7.38],   bs: 3.82,  bq: [11.50, 11.40, 12.00, 12.10] },
        { label: 'Vareforbrug',                     values: [-15.2, -17.6, -22.6], q: [-5.80, -6.08, -4.04],  bs: -2.09, bq: [-6.29, -6.20, -6.50, -6.58] },
        { label: 'Bruttofortjeneste',               values: [12.8, 15.2, 18.5],    q: [4.80, 5.02, 3.34],    bs: 1.73,  bq: [5.21, 5.20, 5.50, 5.52],    computed: true },
        { label: 'Personaleomkostninger',           values: [-9.5, -11.0, -13.5],  q: [-3.58, -3.62, -2.43], bs: -1.23, bq: [-3.74, -3.78, -3.82, -3.88] },
        { label: 'Andre eksterne omkostninger',     values: [-2.0, -2.3, -2.6],    q: [-0.68, -0.70, -0.47], bs: -0.23, bq: [-0.72, -0.72, -0.73, -0.74] },
        { label: 'EBITDA',                          values: [1.3, 1.9, 2.4],       q: [0.54, 0.70, 0.44],    bs: 0.27,  bq: [0.75, 0.70, 0.95, 0.90],    computed: true },
        { label: 'Afskrivninger',                   values: [-0.7, -0.8, -1.0],    q: [-0.27, -0.27, -0.186], bs: -0.09, bq: [-0.28, -0.29, -0.29, -0.30] },
        { label: 'Resultat før finansielle poster', values: [0.6, 1.1, 1.4],       q: [0.27, 0.43, 0.254],   bs: 0.18,  bq: [0.47, 0.41, 0.66, 0.60],    computed: true },
        { label: 'Finansielle omkostninger',        values: [-0.3, -0.4, -0.4],    q: [-0.11, -0.11, -0.08], bs: -0.04, bq: [-0.11, -0.11, -0.12, -0.12] },
        { label: 'Årets resultat',                  values: [0.3, 0.7, 1.0],       q: [0.16, 0.32, 0.174],   bs: 0.14,  bq: [0.36, 0.30, 0.54, 0.48],    computed: true },
      ],
    },
    {
      label: 'Balance',
      rows: [
        { label: 'Anlægsaktiver',        values: [4.2, 4.8, 6.0],   q: [6.10, 6.20, 6.27],    bq: [6.40, 6.50, 6.60, 6.70],     stock: true },
        { label: 'Omsætningsaktiver',    values: [5.2, 6.4, 8.0],   q: [8.26, 8.58, 8.97],    bq: [9.15, 9.25, 9.64, 9.97],     stock: true },
        { label: 'Likvide beholdninger', values: [1.0, 1.4, 1.9],   q: [2.00, 2.15, 2.08],    bq: [2.40, 2.55, 2.75, 2.95],     stock: true },
        { label: 'Aktiver i alt',        values: [9.4, 11.2, 14.0], q: [14.36, 14.78, 15.24], bq: [15.55, 15.75, 16.24, 16.67], stock: true, computed: true },
        { label: 'Egenkapital',          values: [3.5, 4.8, 6.2],   q: [6.36, 6.68, 6.854],   bq: [7.35, 7.65, 8.19, 8.67],     stock: true },
        // Egenkapitalen stiger med årets resultat plus kapitalindskud. Uden denne
        // linje mangler 2024 0,6 mio. (3,5 + 0,7 = 4,2 mod 4,8). Kilder:
        // årsrapport 2023 note 11 (tilskud 0,4), 2024 note 11 (forhøjelse 0,6),
        // 2025 note 9 (forhøjelse 0,4). Ingen indskud i periodetal og budget.
        { label: 'heraf kapitalindskud i året', values: [0.4, 0.6, 0.4], q: [0, 0, 0], bs: 0, bq: [0, 0, 0, 0], memo: true,
          note: 'Kontante kapitalindskud fra ejerne. 2023: tilskud 0,4 mio. (note 11). 2024: kapitalforhøjelse 0,6 mio. (note 11). 2025: kapitalforhøjelse 0,4 mio. (note 9).' },
        { label: 'Langfristet gæld',     values: [3.5, 3.8, 4.6],   q: [4.50, 4.50, 4.45],    bq: [4.40, 4.30, 4.20, 4.10],     stock: true },
        { label: 'Kortfristet gæld',     values: [2.4, 2.6, 3.2],   q: [3.50, 3.60, 3.936],   bq: [3.80, 3.80, 3.85, 3.90],     stock: true },
        { label: 'Gæld i alt',           values: [5.9, 6.4, 7.8],   q: [8.00, 8.10, 8.386],   bq: [8.20, 8.10, 8.05, 8.00],     stock: true, computed: true },
      ],
    },
  ],
};

/* Tabellens visning. ANNUAL_REPORT er rækkerne, som budgetformularen, nøgletallene
   og memoet læser, og den er uændret. Her står, hvordan de vises: kategorierne fra
   standardkontoplanen, med detaljerne bag hver sum.
   ref     = en række i ANNUAL_REPORT (har tal i alle kolonner)
   vals    = tal for 2023-2025 i DKK mio. fra årsrapporterne (kun årskolonnerne;
             periodetal og budget findes kun for de samlede linjer)
   derive  = udledt af andre rækker i samme kolonne
   children= detaljerne bag en sum; vises, når rækken foldes ud
   Poster uden tal i alle årene er foldet sammen under "Vis N poster uden tal".
   Kontrolrækkerne sammenholder summen af detaljerne med årsrapportens total. */
const FIN_LAYOUT = [
  {
    label: 'Resultatopgørelse',
    entries: [
      { id: 'oms', label: 'Omsætning i alt', ref: 'Nettoomsætning', children: [
        { label: 'Salg af varer og tjenesteydelser', vals: [28.0, 32.8, 41.1] },
        { label: 'Huslejeindtægter', vals: [0, 0, 0] },
        { label: 'Øvrige indtægter', vals: [0, 0, 0] },
      ] },
      { label: 'Vareforbrug/Produktionsomkostninger', ref: 'Vareforbrug' },
      { label: 'Dækningsbidrag', ref: 'Bruttofortjeneste', sum: true },
      { label: 'Andre eksterne omkostninger', ref: 'Andre eksterne omkostninger' },
      { label: 'Personaleomkostninger', ref: 'Personaleomkostninger' },
      { label: 'Andre driftsindtægter', vals: [0, 0, 0] },
      { label: 'Andre driftsomkostninger', vals: [0, 0, 0] },
      { label: 'Resultat før afskrivninger (EBITDA)', ref: 'EBITDA', sum: true },
      { id: 'afsk', label: 'Årets af- og nedskrivninger i alt', ref: 'Afskrivninger', children: [
        { label: 'Af- og nedskr. immaterielle anlægsaktiver', vals: [0, -0.13, -0.235] },
        { label: 'Af- og nedskr. materielle anlægsaktiver', vals: [-0.7, -0.67, -0.765] },
        { label: 'Gevinst/tab ved salg af anlægsaktiver', vals: [0, 0, 0] },
      ] },
      { id: 'ebit', label: 'Resultat før finansielle poster', ref: 'Resultat før finansielle poster', sum: true },
      { id: 'netfin', label: 'Netto finansielle poster', ref: 'Finansielle omkostninger', children: [
        { label: 'Indtægter/udbytter - kap. andele tilkn. virk.', vals: [0, 0, 0] },
        { label: 'Indtægter/udbytter - kap. andele ass. virk.', vals: [0, 0, 0] },
        { label: 'Regulering af inv. ejd. til dagsværdi', vals: [0, 0, 0] },
        { label: 'Årets regulering af gæld til dagsværdi', vals: [0, 0, 0] },
        { label: 'Op- og nedskrivning af fin. anlægsaktiver', vals: [0, 0, 0] },
        { label: 'Øvrige finansielle indtægter', vals: [0, 0, 0] },
        { label: 'Øvrige finansielle omkostninger', vals: [-0.3, -0.4, -0.4] },
      ] },
      { id: 'pretax', label: 'Resultat før skat', sum: true,
        derive: (get) => { const a = get('Resultat før finansielle poster'), b = get('Finansielle omkostninger'); return a == null || b == null ? null : a + b; } },
      { id: 'skat', label: 'Skat af årets resultat i alt', vals: [0, 0, 0], children: [
        { label: 'Skat af årets resultat', vals: [0, 0, 0] },
        { label: 'Årets regulering af udskudt skat', vals: [0, 0, 0] },
      ] },
      { id: 'result', label: 'Årets resultat', ref: 'Årets resultat', sum: true },
      { label: 'Foreslået udbytte inkl. eks. ord. udbytte', vals: [0, 0, 0] },
      { label: 'Disponeret i alt', annualOnly: true, derive: (get) => get('Årets resultat') },
    ],
  },
  {
    label: 'Balance',
    entries: [
      { id: 'immat', label: 'Immaterielle anlægsaktiver i alt', vals: [0.3, 0.515, 0.6], children: [
        { label: 'Goodwill', vals: [0, 0, 0] },
        { label: 'Øvrige immaterielle anlægsaktiver', vals: [0.3, 0.515, 0.6] },
      ] },
      { id: 'mat', label: 'Materielle anlægsaktiver i alt', vals: [3.8, 4.235, 5.3], children: [
        { label: 'Grunde og bygninger', vals: [1.7, 2.45, 2.4] },
        { label: 'Indretning af lejede lokaler', vals: [0, 0, 0] },
        { label: 'Produktionsanlæg og maskiner', vals: [1.9, 1.585, 2.5] },
        { label: 'Andre anlæg, driftsmateriel og inventar', vals: [0.2, 0.2, 0.4] },
        { label: 'Materielle anlægsaktiver under udførelse', vals: [0, 0, 0] },
      ] },
      { id: 'finanl', label: 'Finansielle anlægsaktiver i alt', vals: [0.1, 0.05, 0.1], children: [
        { label: 'Kap. andele i tilkn. virksomheder', vals: [0, 0, 0] },
        { label: 'Kap. andele i ass. virksomheder', vals: [0, 0, 0] },
        { label: 'Udskudte skatteaktiver', vals: [0, 0, 0] },
        { label: 'Andre værdipapirer og kapitalandele', vals: [0, 0, 0] },
        { label: 'Andre tilgodehavender (langfristet)', vals: [0.1, 0.05, 0.1] },
      ] },
      { id: 'anl', label: 'Anlægsaktiver i alt', ref: 'Anlægsaktiver', sum: true },
      { id: 'varer', label: 'Varebeholdninger i alt', vals: [1.2, 2.5, 3.2], children: [
        { label: 'Varebeholdninger', vals: [1.2, 2.5, 3.2] },
        { label: 'Ejendomme til videresalg', vals: [0, 0, 0] },
      ] },
      { id: 'tilg', label: 'Tilgodehavender i alt', vals: [3.0, 2.5, 2.9], children: [
        { label: 'Tilgodehavender fra salg af tjenesteydelser', vals: [1.8, 2.15, 2.55] },
        { label: 'Igangværende arbejder', vals: [0.9, 0, 0] },
        { label: 'Tilgodehavender hos tilkn. virksomheder', vals: [0, 0, 0] },
        { label: 'Tilgodehavender hos ass. virksomheder', vals: [0, 0, 0] },
        { label: 'Tilgodehavender hos virk. delt. og ledelse', vals: [0, 0, 0] },
        { label: 'Tilgodehavende selskabsskat', vals: [0, 0, 0] },
        { label: 'Andre tilgodehavender (kortfristet)', vals: [0.2, 0.2, 0.2] },
        { label: 'Periodeafgrænsningsposter (aktiver)', vals: [0.1, 0.15, 0.15] },
        { label: 'Dagsværdi af finansielle instrumenter (aktiver)', vals: [0, 0, 0] },
      ] },
      { id: 'vaerdi', label: 'Værdipapirer', vals: [0, 0, 0] },
      { id: 'likv', label: 'Likvide beholdninger', ref: 'Likvide beholdninger' },
      { label: 'Omsætningsaktiver i alt', ref: 'Omsætningsaktiver', sum: true },
      { id: 'aktiver', label: 'Aktiver i alt', ref: 'Aktiver i alt', sum: true },
      { id: 'ek', label: 'Egenkapital', ref: 'Egenkapital' },
      { label: 'heraf kapitalindskud i året', ref: 'heraf kapitalindskud i året', memo: true },
      { id: 'hens', label: 'Hensatte forpligtelser i alt', vals: [0, 0, 0], children: [
        { label: 'Hensættelser til udskudt skat', vals: [0, 0, 0] },
        { label: 'Andre hensatte forpligtelser', vals: [0, 0, 0] },
      ] },
      { id: 'lang', label: 'Langfristet gæld i alt', ref: 'Langfristet gæld', children: [
        { label: 'Ansvarlig lånekapital', vals: [0, 0, 0] },
        { label: 'Gæld til realkreditinstutter', vals: [0, 0.73, 1.9] },
        { label: 'Gæld til kreditinsitutter (langfristet)', vals: [2.6, 1.87, 1.55] },
        { label: 'Leasingforpligtelser', vals: [0.4, 0.7, 0.65] },
        { label: 'Anden gæld - rentebærende', vals: [0.5, 0.5, 0.5] },
        { label: 'Anden gæld - ikke rentebærende', vals: [0, 0, 0] },
      ] },
      { id: 'kort', label: 'Kortfristet gæld i alt', ref: 'Kortfristet gæld', children: [
        { label: 'Gæld til kreditinsitutter (kortfristet)', vals: [0.3, 0.2, 0.45] },
        { label: 'Kortfristet del af langfristet gæld', vals: [0.5, 0.7, 0.45] },
        { label: 'Leverandører af varer og tjenesteydelser', vals: [1.0, 1.15, 1.3] },
        { label: 'Modtagne forudbetalinger', vals: [0, 0.1, 0.45] },
        { label: 'Gæld til tilknyttede virksomheder', vals: [0, 0, 0] },
        { label: 'Gæld til associerede virksomheder', vals: [0, 0, 0] },
        { label: 'Gæld til virksomhedsdeltagere og ledelse', vals: [0, 0, 0] },
        { label: 'Skyldig selskabsskat', vals: [0, 0, 0.05] },
        { label: 'Anden gæld', vals: [0.6, 0.45, 0.5] },
        { label: 'Periodeafgrænsningsposter (passiver)', vals: [0, 0, 0] },
        { label: 'Dagsværdi af finansielle instrumenter (passiver)', vals: [0, 0, 0] },
      ] },
      { label: 'Gæld i alt', ref: 'Gæld i alt', sum: true },
      { id: 'passiver', label: 'Passiver i alt', sum: true,
        derive: (get) => { const a = get('Egenkapital'), b = get('Gæld i alt'); return a == null || b == null ? null : a + b + (get('Hensatte forpligtelser i alt') || 0); } },
    ],
  },
];

// Kontrol: forskellen mellem summen af detaljerne og årsrapportens total. ✓ når den stemmer.
// annual = kun årskolonnerne (detaljerne findes kun der).
const FIN_CONTROLS = [
  { label: 'Afstemning, årets resultat', annual: true, diff: (v) => v('ebit') + v('netfin') + v('skat') - v('result') },
  { label: 'Afstemning, aktiver', annual: true, diff: (v) => ['immat', 'mat', 'finanl', 'varer', 'tilg', 'vaerdi', 'likv'].reduce((a, k) => a + v(k), 0) - v('aktiver') },
  { label: 'Afstemning, passiver', annual: true, diff: (v) => v('ek') + v('hens') + v('lang') + v('kort') - v('passiver') },
  { label: 'Nulkontrol (aktiver - passiver)', diff: (v) => v('aktiver') - v('passiver') },
];

/** 2026E for en række: januar-august realiseret plus budget for september og Q4
 *  (balanceposter: budget ultimo Q4). Bruges også af andre skærme. */
function finEstimate2026(row, q4) {
  const b4 = q4 !== undefined ? q4 : (row.bq ? row.bq[0] : null);
  if (row.stock) return b4 == null ? null : b4;
  const parts = [row.q ? row.q[0] : null, row.q ? row.q[1] : null, row.q ? row.q[2] : null, row.bs != null ? row.bs : 0, b4];
  if (parts.some(v => v == null)) return null;
  return parts.reduce((a, b) => a + b, 0);
}

/* Nøgletal beregnes ud af kolonnens egne rå poster.
   `ann` er 4 for kvartalskolonner, så EBITDA annualiseres i gearingsnøgletallet,
   og 1 for helårskolonner. */
const FIN_RATIOS = [
  { label: 'Bruttomargin %',   percent: true,
    calc: (c) => ratio(c['Bruttofortjeneste'], c['Nettoomsætning'], 100) },
  { label: 'EBITDA-margin %',  percent: true,
    calc: (c) => ratio(c['EBITDA'], c['Nettoomsætning'], 100) },
  { label: 'Soliditetsgrad %', percent: true,
    calc: (c) => ratio(c['Egenkapital'], c['Aktiver i alt'], 100) },
  { label: 'Gæld / EBITDA',    decimals: 1, note: 'Kvartaler: gæld i forhold til annualiseret EBITDA',
    calc: (c, ann) => ratio(c['Gæld i alt'], c['EBITDA'] == null ? null : c['EBITDA'] * ann) },
  { label: 'Likviditetsgrad',  decimals: 1,
    calc: (c) => ratio(c['Omsætningsaktiver'], c['Kortfristet gæld']) },
];

// Et tal i en af de kolonner, der står i data (annual, q, bs, b). Andet giver null.
function finCellGet(row, col) {
  if (!row) return null;
  const pick = (arr) => (arr && arr[col.idx] != null ? arr[col.idx] : null);
  if (col.kind === 'annual') return pick(row.values);
  if (col.kind === 'q') return pick(row.q);
  if (col.kind === 'b') return pick(row.bq);
  if (col.kind === 'bs') return row.stock ? null : (row.bs != null ? row.bs : null);
  return null;
}
function finCellSet(row, col, v) {
  if (col.kind === 'annual') row.values[col.idx] = v;
  else if (col.kind === 'q') row.q[col.idx] = v;
  else if (col.kind === 'b') row.bq[col.idx] = v;
  else if (col.kind === 'bs') row.bs = v;
}
// Rå værdi for en række i en kolonne (kind: annual, est, b9, q, bs, b).
// 2026E og 2027B udledes af kvartalerne, så rettelser i dem slår igennem.
function finRawValue(row, col) {
  if (col.kind !== 'b9' && col.kind !== 'est') return finCellGet(row, col);
  const bq = (i) => finCellGet(row, { kind: 'b', idx: i });
  if (col.kind === 'b9') {
    if (row.stock) return bq(FIN_BUDGET_Q.length - 1);
    const parts = [1, 2, 3].map(bq);
    if (parts.some(p => p == null)) return null;
    return parts.reduce((a, b) => a + b, 0);
  }
  // 2026E: januar-august realiseret plus budget for september og Q4
  return finEstimate2026(row, bq(0));
}
// Værdi af en visningsrække (FIN_LAYOUT) i en kolonne. entryByLabel giver
// udledningerne adgang til rækker, der kun findes i visningen (fx hensættelser).
function finEntryVal(e, col, rowByLabel, entryByLabel) {
  if (e.ref) return finRawValue(rowByLabel[e.ref], col);
  const get = (label) => {
    if (rowByLabel[label]) return finRawValue(rowByLabel[label], col);
    const x = entryByLabel && entryByLabel[label];
    return x && col.kind === 'annual' && x.vals ? x.vals[col.idx] : null;
  };
  if (e.derive) return e.annualOnly && col.kind !== 'annual' ? null : e.derive(get, col);
  return col.kind === 'annual' && e.vals ? e.vals[col.idx] : null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Rettelser i regnskabstabellen
   Rådgiveren kan rette posterne (ikke summer, nøgletal eller kontroller) i
   regnskabsårene, de realiserede perioder, september og budgetkvartalerne.
   2026E og 2027B er udledt af kvartalerne og regnes om; de rettes ikke direkte.
   En rettelse = { rowRef, colKey, value, original, by, at, reason }, tal i DKK mio.
   rowRef er rækkens ref i ANNUAL_REPORT, ellers visningsrækkens navn; en
   detaljelinje er "<forælder> / <navn>". colKey er tabellens kolonnenøgle.
   ──────────────────────────────────────────────────────────────────────── */
const FIN_EDITS_KEY = 'kabul:fin-edits:nordhavn';
const FIN_OLD_BUDGET_KEY = 'kabul:fin-budget:nordhavn'; // den gamle budgeteditor
const FIN_EDIT_COLS = [
  ...FIN_ANNUAL_YEARS.map((y, i) => ({ key: 'y' + i, kind: 'annual', idx: i, budget: false,
    name: () => y, source: () => t('Årsrapport') + ' ' + y })),
  ...FIN_ACTUAL_Q.map((p, i) => ({ key: 'q' + i, kind: 'q', idx: i, budget: false,
    name: () => t(p.label) + ' ' + p.year, source: () => t('Periodetal') })),
  { key: 'bs', kind: 'bs', budget: true,
    name: () => t(FIN_BUDGET_SEP.label) + ' ' + FIN_BUDGET_SEP.year + ' (' + t('budget') + ')', source: () => t('Kundens budget') },
  ...FIN_BUDGET_Q.map((p, i) => ({ key: 'b' + i, kind: 'b', idx: i, budget: true,
    name: () => p.label + ' ' + p.year + ' (' + t('budget') + ')', source: () => t('Kundens budget') })),
];
const FIN_EDIT_COL = {};
FIN_EDIT_COLS.forEach((c, i) => { FIN_EDIT_COL[c.key] = Object.assign({ order: i }, c); });

// De poster, der kan rettes, i tabellens rækkefølge
const FIN_POSTS = {};
const FIN_POST_ORDER = [];
FIN_LAYOUT.forEach(g => g.entries.forEach(e => {
  if (e.sum || e.derive) return;
  const ref = e.ref || e.label;
  FIN_POSTS[ref] = { ref, label: e.label, raw: e.ref || null, entry: e };
  FIN_POST_ORDER.push(ref);
  (e.children || []).forEach(c => {
    const cref = ref + ' / ' + c.label;
    FIN_POSTS[cref] = { ref: cref, label: c.label, parent: ref, entry: e, child: c };
    FIN_POST_ORDER.push(cref);
  });
}));
const FIN_ROW_BY_LABEL = {};
ANNUAL_REPORT.groups.forEach(g => g.rows.forEach(r => { FIN_ROW_BY_LABEL[r.label] = r; }));

// Det oprindelige tal (fra årsrapport, periodetal eller kundens budget), eller null
// hvis cellen ikke har et tal og derfor ikke kan rettes
function finOriginal(rowRef, colKey) {
  const p = FIN_POSTS[rowRef], col = FIN_EDIT_COL[colKey];
  if (!p || !col) return null;
  if (p.raw) return finCellGet(FIN_ROW_BY_LABEL[p.raw], col);
  if (col.kind !== 'annual') return null;
  const vals = p.child ? p.child.vals : p.entry.vals;
  return vals && vals[col.idx] != null ? vals[col.idx] : null;
}

// Summerne bag posterne. En rettelse lægges som en ændring oven i den oprindelige
// sum, så kolonner uden rettelser står præcis som i kilderne. Rækkefølgen er vigtig.
const FIN_EDIT_SUMS = [
  ['Anlægsaktiver', ['Immaterielle anlægsaktiver i alt', 'Materielle anlægsaktiver i alt', 'Finansielle anlægsaktiver i alt']],
  ['Omsætningsaktiver', ['Varebeholdninger i alt', 'Tilgodehavender i alt', 'Værdipapirer', 'Likvide beholdninger']],
  ['Aktiver i alt', ['Anlægsaktiver', 'Omsætningsaktiver']],
  ['Gæld i alt', ['Langfristet gæld', 'Kortfristet gæld']],
  ['Bruttofortjeneste', ['Nettoomsætning', 'Vareforbrug']],
  ['EBITDA', ['Bruttofortjeneste', 'Personaleomkostninger', 'Andre eksterne omkostninger', 'Andre driftsindtægter', 'Andre driftsomkostninger']],
  ['Resultat før finansielle poster', ['EBITDA', 'Afskrivninger']],
  ['Årets resultat', ['Resultat før finansielle poster', 'Finansielle omkostninger', 'Skat af årets resultat i alt']],
];

/* Lægger rettelserne ind i kopier af ANNUAL_REPORT og FIN_LAYOUT. Detaljelinjer
   flytter deres forælder; en rettet forælder vinder over sine detaljer. */
function finApplyEdits(edits) {
  const rows = ANNUAL_REPORT.groups.flatMap(g => g.rows).map(r => ({ ...r,
    values: r.values && r.values.slice(), q: r.q && r.q.slice(), bq: r.bq && r.bq.slice() }));
  const byLabel = {};
  rows.forEach(r => { byLabel[r.label] = r; });
  const layout = FIN_LAYOUT.map(g => ({ ...g, entries: g.entries.map(e => ({ ...e,
    vals: e.vals && e.vals.slice(),
    children: e.children && e.children.map(c => ({ ...c, vals: c.vals.slice() })) })) }));
  const entryByLabel = {};
  layout.forEach(g => g.entries.forEach(e => { entryByLabel[e.label] = e; }));
  const map = {};
  (edits || []).forEach(x => { if (FIN_POSTS[x.rowRef] && FIN_EDIT_COL[x.colKey]) map[x.rowRef + '|' + x.colKey] = x; });
  if (!Object.keys(map).length) return { rows, byLabel, layout, entryByLabel, map };
  FIN_EDIT_COLS.forEach(col => {
    const d = {};
    const own = (ref) => map[ref + '|' + col.key];
    layout.forEach(g => g.entries.forEach(e => {
      if (e.sum || e.derive) return;
      const ref = e.ref || e.label;
      let kids = 0;
      if (col.kind === 'annual') (e.children || []).forEach(c => {
        const x = own(ref + ' / ' + c.label);
        if (x && c.vals[col.idx] != null) { kids += x.value - c.vals[col.idx]; c.vals[col.idx] = x.value; }
      });
      const cur = e.ref ? finCellGet(byLabel[e.ref], col) : (col.kind === 'annual' && e.vals ? e.vals[col.idx] : null);
      if (cur == null) return;
      const x = own(ref);
      const next = x ? x.value : cur + kids;
      if (next === cur) return;
      d[ref] = next - cur;
      if (e.ref) finCellSet(byLabel[e.ref], col, next); else e.vals[col.idx] = next;
    }));
    FIN_EDIT_SUMS.forEach(([label, parts]) => {
      const s = parts.reduce((a, p) => a + (d[p] || 0), 0);
      const r = byLabel[label];
      if (!s || !r) return;
      const cur = finCellGet(r, col);
      if (cur == null) return;
      finCellSet(r, col, cur + s);
      d[label] = (d[label] || 0) + s;
    });
  });
  return { rows, byLabel, layout, entryByLabel, map };
}

function finAdvisor() { return (window.DATA && DATA.ADVISOR && DATA.ADVISOR.name) || 'Mette Larsen'; }

/* Den gamle budgeteditor gemte egne tal pr. måned, kvartal og år. Kvartalerne og
   september flyttes over som rettelser; måneder lægges sammen til kvartaler, når
   alle tre er tastet (balanceposter: kvartalets sidste måned). År kan ikke placeres
   i et kvartal og ryddes stille. */
function finMigrateOldBudget(list) {
  let old = null;
  try { old = JSON.parse(localStorage.getItem(FIN_OLD_BUDGET_KEY)); } catch (e) {}
  try { localStorage.removeItem(FIN_OLD_BUDGET_KEY); } catch (e) {}
  if (!old || !old.values) return list;
  const f = old.unit === 'kr' ? 0.000001 : old.unit === 'thousand' ? 0.001 : 1;
  const num = (s) => {
    if (s === '' || s == null) return null;
    const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? null : n * f;
  };
  const qv = old.values.quarter || {}, mv = old.values.month || {};
  const out = list.slice();
  const has = (ref, key) => out.some(x => x.rowRef === ref && x.colKey === key);
  const at = old.savedAt || new Date().toISOString();
  const add = (r, key, v) => {
    const orig = finOriginal(r.label, key);
    if (v == null || orig == null || Math.abs(v - orig) < 1e-9 || has(r.label, key)) return;
    out.push({ rowRef: r.label, colKey: key, value: v, original: orig, by: finAdvisor(), at, reason: 'Fra tidligere budgetindtastning' });
  };
  ANNUAL_REPORT.groups.forEach(g => g.rows.forEach(r => {
    if (r.computed || r.memo || !FIN_POSTS[r.label]) return;
    const m = mv[r.label] || {};
    FIN_BUDGET_Q.forEach((q, i) => {
      let v = num((qv[r.label] || {})[q.key]);
      if (v == null) {
        const y = Number(q.key.slice(0, 4)), n = Number(q.key.slice(-1));
        const ms = [1, 2, 3].map(k => num(m[y + '-' + String((n - 1) * 3 + k).padStart(2, '0')]));
        if (r.stock) v = ms[2];
        else if (ms.every(x => x != null)) v = ms[0] + ms[1] + ms[2];
      }
      add(r, 'b' + i, v);
    });
    if (!r.stock) add(r, 'bs', num(m[FIN_BUDGET_SEP.key]));
  }));
  return out;
}

function finLoadEdits() {
  let list = [];
  try { const v = JSON.parse(localStorage.getItem(FIN_EDITS_KEY) || '[]'); if (Array.isArray(v)) list = v; } catch (e) {}
  list = list.filter(x => x && FIN_POSTS[x.rowRef] && FIN_EDIT_COL[x.colKey] && typeof x.value === 'number');
  let migrated = false;
  try { migrated = localStorage.getItem(FIN_OLD_BUDGET_KEY) != null; } catch (e) {}
  if (migrated) {
    list = finMigrateOldBudget(list);
    try { if (list.length) localStorage.setItem(FIN_EDITS_KEY, JSON.stringify(list)); } catch (e) {}
  }
  return list;
}
function finStoreEdits(list) {
  try {
    if (list.length) localStorage.setItem(FIN_EDITS_KEY, JSON.stringify(list));
    else localStorage.removeItem(FIN_EDITS_KEY);
  } catch (e) {}
  if (window.CW && CW.bump) CW.bump(); // cw-case-changed: tabellen gentegnes
}

/* Gemmer nye tal for flere celler på én gang. changes = [{ rowRef, colKey, value }].
   Et tal, der er lig det oprindelige, fjerner rettelsen. Returnerer de ændrede
   celler som { rowRef, colKey, from, to, removed }. */
function finSaveEdits(changes, reason) {
  const list = finLoadEdits();
  const current = finApplyEdits(list);
  const done = [];
  changes.forEach(ch => {
    const col = FIN_EDIT_COL[ch.colKey], p = FIN_POSTS[ch.rowRef];
    const original = finOriginal(ch.rowRef, ch.colKey);
    if (!col || !p || original == null || ch.value == null || isNaN(ch.value)) return;
    const from = finPostValue(current, ch.rowRef, col);
    if (from != null && Math.abs(ch.value - from) < 1e-9) return;
    const i = list.findIndex(x => x.rowRef === ch.rowRef && x.colKey === ch.colKey);
    if (Math.abs(ch.value - original) < 1e-9) {
      if (i >= 0) list.splice(i, 1);
      else return;
      done.push({ rowRef: ch.rowRef, colKey: ch.colKey, from, to: original, removed: true });
      return;
    }
    const x = { rowRef: ch.rowRef, colKey: ch.colKey, value: ch.value, original, by: finAdvisor(), at: new Date().toISOString(),
      reason: reason != null ? reason : (i >= 0 ? list[i].reason || '' : '') };
    if (i >= 0) list[i] = x; else list.push(x);
    done.push({ rowRef: ch.rowRef, colKey: ch.colKey, from, to: ch.value });
  });
  if (done.length) finStoreEdits(list);
  return done;
}
function finRemoveEdits(keys) {
  const list = finLoadEdits().filter(x => !keys.some(k => k.rowRef === x.rowRef && k.colKey === x.colKey));
  finStoreEdits(list);
}
/* Kommentarer til tal: flere pr. celle, uafhængigt af om tallet er rettet. Kommer med som noter i Excel. */
const FIN_NOTES_KEY = 'kabul:fin-notes:nordhavn';
function finLoadNotes() {
  let list = [];
  try { const v = JSON.parse(localStorage.getItem(FIN_NOTES_KEY) || '[]'); if (Array.isArray(v)) list = v; } catch (e) {}
  return list.filter(x => x && typeof x.text === 'string' && x.text.trim()).map((x, i) => (x.id ? x : { ...x, id: 'n' + i + '-' + (x.at || '') }));
}
function finStoreNotes(list) {
  try { if (list.length) localStorage.setItem(FIN_NOTES_KEY, JSON.stringify(list)); else localStorage.removeItem(FIN_NOTES_KEY); } catch (e) {}
  if (window.CW && CW.bump) CW.bump();
}
function finAddNote(rowRef, colKey, text) {
  const txt = String(text || '').trim();
  if (!txt) return;
  const list = finLoadNotes();
  list.push({ id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), rowRef, colKey, text: txt, by: finAdvisor(), at: new Date().toISOString() });
  finStoreNotes(list);
}
function finDeleteNote(id, rowRef, colKey) {
  if (id === 'edit') { finSetReason(rowRef, colKey, ''); if (window.CW && CW.bump) CW.bump(); return; }   // begrundelsen på en rettelse
  finStoreNotes(finLoadNotes().filter(x => x.id !== id));
}
// Kommentarerne til en celle, ældste først. En begrundelse, der blev givet på en rettelse, tæller som den første.
function finCommentsFor(notes, edits, rowRef, colKey) {
  const list = notes.filter(x => x.rowRef === rowRef && x.colKey === colKey).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const e = edits.find(x => x.rowRef === rowRef && x.colKey === colKey);
  return e && e.reason ? [{ id: 'edit', text: e.reason, by: e.by, at: e.at }].concat(list) : list;
}
function finNoteOf(notes, edits, rowRef, colKey) {
  return finCommentsFor(notes, edits, rowRef, colKey).map(c => c.text).join(' · ');
}
function finSetReason(rowRef, colKey, reason) {
  const list = finLoadEdits();
  const x = list.find(e => e.rowRef === rowRef && e.colKey === colKey);
  if (!x) return;
  x.reason = reason;
  finStoreEdits(list);
}
// Det aktuelle tal for en post i en kolonne i en model fra finApplyEdits
function finPostValue(model, rowRef, col) {
  const p = FIN_POSTS[rowRef];
  if (!p) return null;
  if (p.raw) return finCellGet(model.byLabel[p.raw], col);
  if (col.kind !== 'annual') return null;
  const e = model.entryByLabel[p.entry.label];
  const vals = p.child ? (e.children.find(c => c.label === p.child.label) || {}).vals : e.vals;
  return vals && vals[col.idx] != null ? vals[col.idx] : null;
}
// "Omsætning i alt 2025" / "Nettoomsætning Q4 2026 (budget)"
function finEditName(rowRef, colKey) {
  const p = FIN_POSTS[rowRef], col = FIN_EDIT_COL[colKey];
  return (p ? t(p.label) : rowRef) + ' ' + (col ? col.name() : colKey);
}
// "2. okt." / "2 Oct"
function finShortDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const da = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];
  const en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return window.CW_LANG === 'en' ? d.getDate() + ' ' + en[d.getMonth()] : d.getDate() + '. ' + da[d.getMonth()];
}
// Tal i DKK t. uden enhed, som i aktivitetsloggen: "41.100"
function finLogNum(v) { return formatNum(v * 1000, { decimals: 0 }); }
// Læser et indtastet tal: dansk "41.100", "41,1", "-2.400" (engelsk "41,100", "41.1").
// Tomt felt giver null, noget der ikke er et tal giver NaN. lang tvinger formatet
// (Excel-filerne har dansk format uanset sproget i appen).
function finParseInput(s, lang) {
  let x = String(s == null ? '' : s).trim().replace(/[\s ]/g, '').replace(/[−–]/g, '-');
  if (!x) return null;
  const en = (lang || window.CW_LANG) === 'en';
  const th = en ? ',' : '.', dec = en ? '.' : ',';
  const groups = en ? /^-?\d{1,3}(,\d{3})+$/ : /^-?\d{1,3}(\.\d{3})+$/;
  // Kun ét skilletegn af den "forkerte" slags og ikke tre cifre efter: læs det som decimaltegn ("41.1")
  if (x.indexOf(dec) < 0 && x.split(th).length === 2 && !groups.test(x)) x = x.replace(th, dec);
  x = x.split(th).join('').replace(dec, '.');
  if (!/^-?\d+(\.\d+)?$/.test(x)) return NaN;
  return parseFloat(x);
}
function finLogChanges(done) {
  done.forEach(c => {
    const name = finEditName(c.rowRef, c.colKey);
    const text = c.removed
      ? finFill(t('Rettelse fortrudt i regnskabet: {post} er igen {tal}'), { post: name, tal: finLogNum(c.to) })
      : finFill(t('Rettet i regnskabet: {post} fra {fra} til {til}'), { post: name, fra: finLogNum(c.from), til: finLogNum(c.to) });
    CW.log('fin-edit', text, { who: 'rådgiver', data: { rowRef: c.rowRef, colKey: c.colKey, from: c.from, to: c.to } });
  });
}

function ratio(a, b, factor) {
  if (a == null || b == null || !b) return null;
  return (a / b) * (factor || 1);
}

function formatNum(v, opts) {
  if (v == null) return t('Ikke oplyst');
  const decimals = opts && opts.decimals != null ? opts.decimals : 1;
  const negative = v < 0;
  const abs = Math.abs(v);
  let s = abs.toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return negative ? `−${s}` : s;
}

// Antal kvartalskolonner bag 2026E og 2027B: realiseret, september og budgetkvartaler
const FIN_QUARTER_COLS = FIN_ACTUAL_Q.length + 1 + FIN_BUDGET_Q.length;

// Kolonneoverskrift: etiket og en grå linje under (tom linje holder rækken lige).
// top = lille årstal over etiketten (budgetkvartaler, der går hen over to år).
function finHead(label, note, top) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
      {top && <span className="fin-hd-year">{top}</span>}
      <span>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--c-text-3)' }}>{note || ' '}</span>
    </span>
  );
}

/* Kommentarer til et tal: listen over kommentarerne og et felt til en ny. Enter tilføjer; Esc eller et klik udenfor lukker. */
function FinNotesPop({ anchor, comments, onAdd, onDelete, onClose }) {
  const ref = React.useRef(null);
  const [txt, setTxt] = React.useState('');
  const [pos, setPos] = React.useState(null);
  const closedRef = React.useRef(false);
  const close = (outside) => { if (closedRef.current) return; closedRef.current = true; onClose(outside); };
  const place = () => {
    const el = anchor();
    if (!el) return;
    const r = el.getBoundingClientRect(), w = 288, h = (ref.current && ref.current.offsetHeight) || 120;
    const left = Math.min(Math.max(8, r.left - 4), window.innerWidth - w - 8);
    const top = r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - 6 - h) : r.bottom + 6;
    setPos({ left, top });
  };
  React.useLayoutEffect(() => {
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [comments.length]);
  const placed = !!pos;
  React.useEffect(() => {
    const i = placed && ref.current && ref.current.querySelector('input');
    if (i) i.focus({ preventScroll: true });
  }, [placed]);
  React.useEffect(() => {
    const down = (e) => { if (ref.current && !ref.current.contains(e.target)) close(true); };
    document.addEventListener('mousedown', down, true);
    return () => document.removeEventListener('mousedown', down, true);
  }, []);
  const add = () => { if (txt.trim()) { onAdd(txt.trim()); setTxt(''); } };
  return ReactDOM.createPortal(
    <div ref={ref} className="fin-notes" role="dialog" aria-label={t('Kommentarer til tallet')}
      style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); } }}>
      {comments.length > 0 && (
        <ul className="fin-notes-list">
          {comments.map(c => (
            <li key={c.id}>
              <div className="fin-notes-meta">
                <span>{c.by}{c.at ? ' · ' + finShortDate(c.at) : ''}</span>
                <button type="button" title={t('Slet kommentaren')} aria-label={t('Slet kommentaren')} onClick={() => onDelete(c.id)}><I.X size={11}/></button>
              </div>
              <div className="fin-notes-text">{t(c.text)}</div>
            </li>
          ))}
        </ul>
      )}
      <input type="text" value={txt} maxLength={500} autoComplete="off" placeholder={comments.length ? t('Tilføj en kommentar') : t('Skriv en kommentar')} aria-label={t('Ny kommentar')}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}/>
    </div>,
    document.body
  );
}

function AnnualReportSection({ go, unit, setUnit }) {
  const scale = unit === 'mio' ? 1 : 1000;
  // Kvartalerne er detaljen bag 2026E og 2027B og er foldet sammen som udgangspunkt.
  const [showQuarters, setShowQuarters] = React.useState(false);
  // Detaljer foldes ud pr. række eller for alle; poster uden tal vises pr. gruppe
  const [openRows, setOpenRows] = React.useState({});
  const [allOpen, setAllOpen] = React.useState(false);
  const [hideEmpty, setHideEmpty] = React.useState(false);
  const showEmpty = !hideEmpty;

  // Rettelser: læses igen ved hver ændring i sagen (cw-case-changed). Er sagen
  // indstillet, kan intet rettes, men markeringerne står.
  const caseVersion = CW.useCase();
  const edits = React.useMemo(() => finLoadEdits(), [caseVersion]);
  const model = React.useMemo(() => finApplyEdits(edits), [edits]);
  const notes = React.useMemo(() => finLoadNotes(), [caseVersion]);
  const commentsOf = (ref, colKey) => finCommentsFor(notes, edits, ref, colKey);
  const locked = !!(CW.caseState() || {}).submittedAt;
  const [editing, setEditing] = React.useState(null);   // { ref, col, text, initial, bad, typed }
  const editingRef = React.useRef(null);
  editingRef.current = editing;
  const [reasonFor, setReasonFor] = React.useState(null); // { ref, col, then }
  const [importMsg, setImportMsg] = React.useState(null);
  const fileRef = React.useRef(null);
  const undoBusy = React.useRef(false);

  // Kolonnerne i visningsrækkefølge. Årskolonnerne står altid først og flytter
  // sig ikke når kvartalerne foldes ud, så trendrækken bliver liggende.
  // 2026E og 2027B er ikke indberettede tal, men udledninger:
  //   2026E = jan-aug realiseret + sep og Q4 budget   (balance: ultimo Q4 2026)
  //   2027B = Q1-Q3 budget, altså 9 måneder  (balance: ultimo Q3 2027)
  // Foldet ud er der tre bånd: årsrapporterne (2026 er ikke klar endnu), de
  // realiserede kvartaler i 2026 og budgettet for 2026/2027. Realiseret og budget
  // har hver sin baggrundstone (zone), så man kan se, hvad der er hvad.
  // group = båndets nøgle, groupLabel = dets overskrift, sep = lodret skel.
  const cols = React.useMemo(() => {
    const annual = FIN_ANNUAL_YEARS.map((y, i) => ({ key: 'y' + i, kind: 'annual', idx: i, ann: 1, group: 'annual', groupLabel: t('Årsrapporter'), label: y }));
    const est = { key: 'est', kind: 'est', ann: 1, label: '2026E', note: 'jan-aug + budget', minWidth: 104,
      title: 'Januar-august realiseret plus budget for september og Q4' };
    const b9 = { key: 'b9', kind: 'b9', ann: 4 / 3, label: '2027B', note: '9 mdr. budget', minWidth: 96,
      title: 'Kun 9 måneder: budget for Q1-Q3 2027. Kan ikke sammenlignes direkte med et helt år.' };
    if (!showQuarters) {
      return [...annual, { ...est, group: 'prog', groupLabel: t('Prognose'), sep: true }, { ...b9, group: 'prog', groupLabel: t('Prognose') }];
    }
    const pending = { key: 'y' + FIN_ANNUAL_YEARS.length, kind: 'pending', ann: 1, group: 'annual', groupLabel: t('Årsrapporter'), zone: 'pending',
      label: FIN_ACTUAL_Q[0].year, note: 'ikke klar endnu', minWidth: 92,
      title: 'Årsrapporten for 2026 er ikke klar endnu. Året står som realiserede kvartaler og budget til højre.' };
    const realLabel = t('Realiseret kvartal') + ' · ' + FIN_ACTUAL_Q[0].year;
    const q = FIN_ACTUAL_Q.map((p, i) => ({ key: 'q' + i, kind: 'q', idx: i, ann: 12 / p.months, partial: !!p.partial,
      group: 'real', groupLabel: realLabel, zone: 'real', sep: i === 0,
      label: t(p.label), note: p.partial ? '2 mdr.' : null, minWidth: 82,
      title: p.partial ? 'Tredje kvartal er ikke afsluttet. Kolonnen dækker kun juli og august.' : undefined }));
    const budgetYears = [...new Set([FIN_BUDGET_SEP.year, ...FIN_BUDGET_Q.map(p => p.year)])].join('/');
    const budgetLabel = t('Budget') + ' · ' + budgetYears;
    const bs = { key: 'bs', kind: 'bs', ann: 12, group: 'budget', groupLabel: budgetLabel, zone: 'budget', sep: true,
      year: FIN_BUDGET_SEP.year, label: t(FIN_BUDGET_SEP.label), minWidth: 72, title: 'Budget for september 2026' };
    const b = FIN_BUDGET_Q.map((p, i) => ({ key: 'b' + i, kind: 'b', idx: i, ann: 4, group: 'budget', groupLabel: budgetLabel, zone: 'budget',
      year: p.year, label: p.label, minWidth: 72 }));
    return [...annual, pending, ...q, bs, ...b];
  }, [showQuarters, window.CW_LANG]);
  // Gruppeoverskrifterne: én pr. række af kolonner med samme gruppe
  const colGroups = cols.reduce((a, c) => {
    const last = a[a.length - 1];
    if (last && last.group === c.group) last.n++; else a.push({ group: c.group, label: c.groupLabel, zone: c.zone === 'pending' ? null : c.zone, n: 1, sep: !!c.sep });
    return a;
  }, []);
  // Klasser for en celle i kolonnen: skel, fladetone for 2026E/2027B og zonens baggrund
  const colCls = (col) => (col.sep ? ' fin-sep' : '') + (col.kind === 'est' || col.kind === 'b9' ? ' fin-est' : '') + (col.zone ? ' fin-z-' + col.zone : '');
  // Udfold/fold sammen sidder i tabelhovedet, over de kolonner den ændrer
  const toggleQuarters = (open) => {
    setShowQuarters(open);
    CW.focusSoon('[data-fin-toggle="' + (open ? 'collapse' : 'expand') + '"]');
  };

  // Rå poster pr. kolonne, med rettelserne - grundlaget nøgletallene regnes af.
  const rawRows = model.rows;
  const colMaps = React.useMemo(() => cols.map(col => {
    const m = {};
    rawRows.forEach(r => { m[r.label] = finRawValue(r, col); });
    return m;
  }), [cols, rawRows]);

  // Formatér én værdi efter rækkens type. Procent og forholdstal skaleres ikke.
  const fmt = (v, r) => {
    if (v == null || isNaN(v)) return null;
    // Dansk "45,7 %", engelsk "45.7%"
    if (r.percent) return formatNum(v, { decimals: 1 }) + (window.CW_LANG === 'en' ? '%' : ' %');
    if (r.decimals != null) return formatNum(v, { decimals: r.decimals });
    // DKK t. vises uden decimaler, DKK mio. med én
    return formatNum(v * scale, { decimals: unit === 'mio' ? 1 : 0 });
  };

  const colCount = 1 + cols.length;

  // Visningsrækkerne (FIN_LAYOUT) slår deres tal op i ANNUAL_REPORT eller i egne årstal
  const rowByLabel = model.byLabel;
  const layout = model.layout;
  const entryById = React.useMemo(() => { const m = {}; layout.forEach(g => g.entries.forEach(e => { if (e.id) m[e.id] = e; })); return m; }, [layout]);
  const entryVal = (e, col, ci) => finEntryVal(e, col, rowByLabel, model.entryByLabel);
  const annualVals = (e) => FIN_ANNUAL_YEARS.map((y, i) => (e.vals ? e.vals[i] : null));
  const isEmpty = (e) => !e.ref && !e.derive && annualVals(e).every(v => v == null || v === 0);

  /* ── Rettelser ─────────────────────────────────────────────────────────── */
  const fmtU = (v) => fmt(v, {});
  const cellEl = (ref, colKey) => [...document.querySelectorAll('[data-fin-cell]')].find(el => el.getAttribute('data-fin-cell') === ref + '|' + colKey) || null;

  // Åbn et felt i cellen med det viste tal; et ciffer eller minus erstatter tallet
  const startEdit = (ref, colKey, td, typed) => {
    if (locked) return;
    const cur = finPostValue(model, ref, FIN_EDIT_COL[colKey]);
    const shown = (fmtU(cur) || '').replace(/−/g, '-');
    setEditing({ ref, col: colKey, text: typed != null ? typed : shown, initial: shown, bad: false, typed: typed != null });
  };
  // Næste (eller forrige) redigerbare celle i samme række
  const siblingCell = (ref, colKey, dir) => {
    const td = cellEl(ref, colKey);
    if (!td) return null;
    const list = [...td.parentElement.querySelectorAll('td[data-fin-cell]')];
    return list[list.indexOf(td) + dir] || null;
  };
  // how: 'enter' | 'next' | 'prev' | 'blur'
  const commitEdit = (how) => {
    const s = editingRef.current;
    if (!s) return;
    const val = finParseInput(s.text);
    if (val != null && isNaN(val)) {
      if (how === 'blur') { setEditing(null); return; }
      setEditing({ ...s, bad: true });
      return;
    }
    editingRef.current = null;
    setEditing(null);
    const here = cellEl(s.ref, s.col);
    const next = how === 'next' ? siblingCell(s.ref, s.col, 1) : how === 'prev' ? siblingCell(s.ref, s.col, -1) : null;
    let done = [];
    if (val != null && s.text.trim() !== s.initial) {
      done = finSaveEdits([{ rowRef: s.ref, colKey: s.col, value: val / scale }]);
      finLogChanges(done);
    }
    // Begrundelsen er frivillig og gives bagefter med ikonet ved cellen, så man ikke afbrydes ved hvert tal
    if (how !== 'blur') CW.focusSoon(next || here);
  };
  const cancelEdit = () => {
    const s = editingRef.current;
    editingRef.current = null;
    setEditing(null);
    if (s) CW.focusSoon(cellEl(s.ref, s.col));
  };
  const closeReason = (outside) => {
    const r = reasonFor;
    setReasonFor(null);
    if (!r) return;
    if (!outside) CW.focusSoon(r.then && document.contains(r.then) ? r.then : cellEl(r.ref, r.col));
  };

  // Nulstil ét tal til det oprindelige; Fortryd i beskeden sætter rettelsen (og begrundelsen) tilbage
  const resetCell = (x) => {
    const from = x.value;
    finRemoveEdits([x]);
    finLogChanges([{ rowRef: x.rowRef, colKey: x.colKey, from, to: x.original, removed: true }]);
    CW.toast(finFill(t('{post} er nulstillet til {tal}'), { post: finEditName(x.rowRef, x.colKey), tal: fmtU(x.original) }), {
      action: { label: t('Fortryd'), onClick: () => { const d = finSaveEdits([{ rowRef: x.rowRef, colKey: x.colKey, value: from }], x.reason || ''); finLogChanges(d); } },
    });
    CW.focusSoon(cellEl(x.rowRef, x.colKey));
  };

  // En celle, der kan rettes: et tal i en post, i et regnskabsår, en realiseret periode eller et budgetkvartal
  const editCell = (ref, label, col, value) => {
    const x = model.map[ref + '|' + col.key];
    const comments = commentsOf(ref, col.key);
    const nCom = comments.length;
    const display = fmtU(value);
    const isEd = editing && editing.ref === ref && editing.col === col.key;
    const name = t(label) + ' ' + FIN_EDIT_COL[col.key].name();
    const aria = finFill(locked
      ? (x ? t('{post}, {tal}, rettet') : '{post}, {tal}')
      : (x ? t('{post}, {tal}, rettet, tryk Enter for at rette') : t('{post}, {tal}, tryk Enter for at rette')),
      { post: name, tal: display || '-' });
    return (
      <td
        key={col.key}
        data-fin-cell={ref + '|' + col.key}
        tabIndex={locked && !x ? undefined : 0}
        aria-label={aria}
        className={colCls(col) + ' mono num' + (locked ? '' : ' fin-ed') + (x ? ' fin-edited' : '') + (nCom ? ' fin-hasnote' : '') + (isEd ? ' fin-editing' : '')}
        style={{ color: 'var(--c-ink)' }}
        onClick={(e) => { if (!isEd) { startEdit(ref, col.key, e.currentTarget); } }}
        onKeyDown={(e) => {
          if (isEd || locked || e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(ref, col.key, e.currentTarget); }
          else if (/^[0-9-]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); startEdit(ref, col.key, e.currentTarget, e.key); }
        }}
      >
        {x && !isEd && (
          <span className="fin-editmark" role="img"
            title={finFill(t('Rettet af {navn} {dato}. Oprindeligt {tal} ({kilde}).'), { navn: x.by, dato: finShortDate(x.at), tal: fmtU(x.original), kilde: FIN_EDIT_COL[col.key].source() }).replace('..', '.')}
            aria-label={finFill(t('Rettet af {navn} {dato}. Oprindeligt {tal} ({kilde}).'), { navn: x.by, dato: finShortDate(x.at), tal: fmtU(x.original), kilde: FIN_EDIT_COL[col.key].source() }).replace('..', '.')}>
            <span className="fin-editdot"/>
          </span>
        )}
        {!locked && (
          <span className="fin-gutter">
            <button type="button" className={'fin-cbtn' + (nCom ? ' on' : '')} title={nCom ? finFill(nCom === 1 ? t('1 kommentar') : t('{n} kommentarer'), { n: nCom }) : t('Tilføj kommentar')}
              aria-label={finFill(nCom ? t('Se kommentarer til {post} ({n})') : t('Tilføj kommentar til {post}'), { post: name, n: nCom })}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setReasonFor({ ref, col: col.key, then: e.currentTarget.closest('td') }); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>
              {nCom > 0 && <span className="fin-ccount">{nCom}</span>}
            </button>
            {x && (
              <button type="button" title={finFill(t('Nulstil til {tal}'), { tal: fmtU(x.original) })}
                aria-label={finFill(t('Nulstil {post} til {tal}'), { post: name, tal: fmtU(x.original) })}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); resetCell(x); }}>
                <I.Undo size={12}/>
              </button>
            )}
          </span>
        )}
        {isEd ? (<>
          {/* Det viste tal bliver stående usynligt, så kolonnen beholder sin bredde */}
          <span aria-hidden="true" style={{ visibility: 'hidden' }}>{display || '-'}</span>
          <input
            className="fin-ed-input"
            autoFocus
            inputMode="decimal"
            value={editing.text}
            aria-label={finFill(t('Nyt tal for {post}'), { post: name })}
            aria-invalid={editing.bad ? 'true' : undefined}
            title={editing.bad ? t('Skriv et tal, fx 41.100 eller -2.400') : undefined}
            onFocus={(e) => { if (!editing.typed) e.target.select(); }}
            onChange={(e) => { const v = e.target.value; setEditing(s => (s ? { ...s, text: v, bad: false } : s)); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit('enter'); }
              else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelEdit(); }
              else if (e.key === 'Tab') { e.preventDefault(); commitEdit(e.shiftKey ? 'prev' : 'next'); }
            }}
            onBlur={() => commitEdit('blur')}
          />
        </>) : (display || '-')}
      </td>
    );
  };
  const canEdit = (ref, col) => !!FIN_EDIT_COL[col.key] && finOriginal(ref, col.key) != null;

  // Excel: budgetkvartalerne ud og ind. Importerede tal bliver rettelser.
  const budgetCols = FIN_EDIT_COLS.filter(c => c.budget);
  const exportBudget = () => {
    if (!window.XLSX) { CW.toast && CW.toast(t('Excel-bibliotek ikke indlæst. Prøv at genindlæse siden.')); return; }
    const f = unit === 'mio' ? 1 : 1000;
    const head = (c) => c.kind === 'bs' ? 'Sep ' + FIN_BUDGET_SEP.year : FIN_BUDGET_Q[c.idx].label + ' ' + FIN_BUDGET_Q[c.idx].year;
    const aoa = [
      ['Budget, ' + DATA.COMPANY.name],
      ['Granularitet', 'Kvartal'],
      ['Enhed', unit === 'mio' ? 'DKK mio.' : 'DKK tusind'],
      [],
      ['Gruppe', 'Regnskabspost', ...budgetCols.map(head), 'Note'],
    ];
    const cmtList = [];
    ANNUAL_REPORT.groups.forEach(g => g.rows.forEach(r => {
      if (r.memo) return;
      const row = rowByLabel[r.label];
      const vals = budgetCols.map(c => { const v = finCellGet(row, c); return v == null ? '' : Math.round(v * f * 1000) / 1000; });
      const ed = budgetCols.filter(c => model.map[r.label + '|' + c.key]).map(head);
      budgetCols.forEach((c, j) => { const cs = finCommentsFor(finLoadNotes(), edits, r.label, c.key); if (cs.length) cmtList.push({ r: aoa.length, c: 2 + j, t: cs.map(x => (x.by ? x.by + ': ' : '') + t(x.text)).join('\n') }); });
      aoa.push([g.label, r.label, ...vals, ed.length ? 'Rettet: ' + ed.join(', ') : '']);
    }));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    cmtList.forEach(cm => { const a = XLSX.utils.encode_cell({ r: cm.r, c: cm.c }); if (ws[a]) { ws[a].c = [{ a: finAdvisor(), t: cm.t }]; ws[a].c.hidden = true; } });
    ws['!cols'] = [{ wch: 18 }, { wch: 32 }, ...budgetCols.map(() => ({ wch: 12 })), { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Budget kvartal');
    XLSX.writeFile(wb, 'budget-nordhavn-kvartal-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  };
  const importBudget = (file) => {
    if (!file || !window.XLSX) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
        const low = (s) => String(s == null ? '' : s).toLowerCase().replace(/\(budget\)/g, '').replace(/\s+/g, ' ').trim();
        // Enhed fra filen; ellers tabellens
        let factor = unit === 'mio' ? 1 : 0.001;
        aoa.slice(0, 6).forEach(row => {
          if (!row || low(row[0]) !== 'enhed') return;
          const v = low(row[1]);
          factor = v.includes('hele kr') || v === 'kr' || v === 'dkk' ? 0.000001 : (v.includes('tusind') || v.includes('t.')) ? 0.001 : 1;
        });
        const hi = aoa.findIndex(r => r && (low(r[0]) === 'gruppe' || low(r[1]) === 'regnskabspost' || low(r[0]) === 'regnskabspost'));
        if (hi < 0) { setImportMsg({ err: true, text: t('Kunne ikke finde rækken med kolonnenavne. Brug en fil fra Eksportér budget som skabelon.') }); return; }
        const header = aoa[hi];
        const labelCol = low(header[0]) === 'regnskabspost' ? 0 : 1;
        // Kolonne → budgetkolonne efter navn: "Q4 2026", "2026-Q4", "Sep 2026", "2026-09"
        const colFor = {};
        header.forEach((h, c) => {
          const k = low(h);
          budgetCols.forEach(bc => {
            const names = bc.kind === 'bs'
              ? ['sep ' + FIN_BUDGET_SEP.year, 'sep ' + FIN_BUDGET_SEP.year.slice(2), 'september ' + FIN_BUDGET_SEP.year, FIN_BUDGET_SEP.key]
              : [low(FIN_BUDGET_Q[bc.idx].label + ' ' + FIN_BUDGET_Q[bc.idx].year), low(FIN_BUDGET_Q[bc.idx].key)];
            if (names.includes(k)) colFor[c] = bc.key;
          });
        });
        // Rækkenavne: dansk eller engelsk, rå post eller visningsnavn
        const refFor = {};
        Object.values(FIN_POSTS).forEach(p => { if (!p.raw) return; [p.raw, p.label].forEach(l => { refFor[low(l)] = p.ref; refFor[low(t(l))] = p.ref; }); });
        const changes = [];
        for (let i = hi + 1; i < aoa.length; i++) {
          const row = aoa[i];
          const ref = row && refFor[low(row[labelCol])];
          if (!ref) continue;
          Object.keys(colFor).forEach(c => {
            const raw = row[c];
            if (raw == null || raw === '') return;
            const n = typeof raw === 'number' ? raw : finParseInput(String(raw), 'da');
            if (n == null || isNaN(n)) return;
            changes.push({ rowRef: ref, colKey: colFor[c], value: n * factor });
          });
        }
        const done = finSaveEdits(changes, 'Excel-import: ' + file.name);
        if (done.length) {
          CW.log('fin-edit', finFill(t('Budget importeret fra {fil}: {n} tal rettet i regnskabet'), { fil: file.name, n: done.length }), { who: 'rådgiver', data: { file: file.name, n: done.length } });
          setShowQuarters(true);
        }
        setImportMsg(done.length
          ? { text: finFill(t('{n} budgettal er importeret fra {fil} og står som rettelser.'), { n: done.length, fil: file.name }) }
          : { text: finFill(t('Ingen nye budgettal i {fil}.'), { fil: file.name }) });
      } catch (err) {
        setImportMsg({ err: true, text: t('Kunne ikke læse filen:') + ' ' + (err.message || err) });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 2026E og 2027B har en anelse fladetone i hele kolonnen; overskriften
  // siger, hvad de består af. Ingen kursiv, piller eller farvede prikker.
  const numCell = (col, ci, display, extra) => (
    <td
      key={col.key}
      title={(extra && extra.title) || ''}
      className={colCls(col) + (display ? ' mono num' : '')}
      style={{
        color: display ? 'var(--c-ink)' : 'var(--c-text-4)',
        fontWeight: extra && extra.bold ? 500 : undefined,
      }}
    >
      {display || (col.kind === 'pending' ? '' : '-')}
    </td>
  );

  return (
    <FinSection
      title={t('Regnskab')}
      sub={locked ? t('Årsrapporter fra CVR og kundens egne tal for 2026 og budget.') : t('Årsrapporter fra CVR og kundens egne tal for 2026 og budget. Klik på et tal for at rette det.')}
      badge={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          className="btn-ghost-sm"
          onClick={() => { setAllOpen(v => !v); setOpenRows({}); }}
          aria-pressed={allOpen}
          aria-controls="fin-annual-table"
        >
          <I.ChevronRight size={12} aria-hidden="true" style={{ transform: allOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}/>
          {allOpen ? t('Skjul detaljer') : t('Vis detaljer')}
        </button>
        </span>
      }
    >
      {/* Sammenfoldet er tabellen seks kolonner og holder sig inden for siden.
          Foldes kvartalerne ud, bliver den til 14 kolonner og bryder ud i fuld
          bredde af indholdsområdet. Er der stadig ikke plads, scroller den
          vandret med rækkenavnene klæbet fast i venstre side. */}
      <div style={showQuarters ? {
        position: 'relative', left: '50%', transform: 'translateX(-50%)',
        width: 'min(1280px, calc(100vw - 290px))', minWidth: '100%',
      } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 20px', marginBottom: 10 }}>
        <CWSeg size="sm" ariaLabel={t('Enhed')} value={unit} onChange={setUnit}
          options={[{ k: 'mio', l: t('DKK mio.') }, { k: 'thousand', l: t('DKK t.') }]}/>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--c-text-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={hideEmpty} onChange={e => setHideEmpty(e.target.checked)} style={{ accentColor: 'var(--c-primary)', margin: 0 }}/>
          {t('Skjul tomme rækker')}
        </label>
        {/* Budgettet ud og ind som Excel. Importerede tal bliver rettelser. */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1}
            onChange={(e) => { const f = e.target.files && e.target.files[0]; importBudget(f); e.target.value = ''; }}/>
          {!locked && (
            <button id="fin-import-budget" type="button" className="btn-ghost-sm" onClick={() => fileRef.current && fileRef.current.click()}>
              <I.Upload size={13} aria-hidden="true"/> {t('Importér budget')}
            </button>
          )}
          <button id="fin-export-budget" type="button" className="btn-ghost-sm" onClick={exportBudget} style={{ marginRight: -8 }}>
            <I.Download size={13} aria-hidden="true"/> {t('Eksportér budget')}
          </button>
        </span>
      </div>
      {importMsg && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: importMsg.err ? 'var(--c-danger)' : 'var(--c-text-2)', margin: '-2px 0 10px' }}>
          <span>{importMsg.text}</span>
          <button type="button" className="icon-btn" aria-label={t('Luk')} title={t('Luk')} onClick={() => setImportMsg(null)}><I.X size={13}/></button>
        </div>
      )}
      {reasonFor && <FinNotesPop anchor={() => cellEl(reasonFor.ref, reasonFor.col)} comments={commentsOf(reasonFor.ref, reasonFor.col)}
        onAdd={(txt) => finAddNote(reasonFor.ref, reasonFor.col, txt)} onDelete={(id) => finDeleteNote(id, reasonFor.ref, reasonFor.col)} onClose={closeReason}/>}
      <div className="card" style={{ overflow: 'clip' }}>
        {/* Uden kvartaler: clip, så kolonnenavnene følger siden. Med kvartaler er tabellen bredere end siden og ruller vandret; så får omslaget en højde og ruller også lodret, og kolonnenavnene sidder fast i det. */}
        <div className="fin-wrap" style={showQuarters ? { overflow: 'auto', maxHeight: 'calc(100vh - 230px)' } : { overflowX: 'clip' }}>
          <table id="fin-annual-table" className="fin-tbl">
            <thead>
              <tr>
                <th className="fin-c1" rowSpan={2} style={{ verticalAlign: 'middle', borderBottom: '1px solid var(--c-line)', width: showQuarters ? undefined : 330 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-text-3)' }}>{t('Regnskabspost')}</span>
                </th>
                {colGroups.map(g => (
                  <th key={g.group} className={'fin-band' + (g.sep ? ' fin-sep' : '') + (g.zone ? ' fin-z-' + g.zone : '')} colSpan={g.n} style={{ whiteSpace: 'nowrap' }}>
                    {/* Kvartalerne foldes ud fra prognosebåndet og sammen fra kvartalsbåndet,
                        lige over de kolonner, det handler om */}
                    {g.group === 'prog' ? (
                      <span className="fin-band-row">
                        <span>{g.label}</span>
                        <button type="button" className="fin-qtoggle" data-fin-toggle="expand"
                          aria-expanded="false" aria-controls="fin-annual-table" onClick={() => toggleQuarters(true)}
                          title={t('Vis kvartalerne bag 2026E og 2027B')}>
                          {t('Udfold kvartaler')}
                          <I.ChevronRight size={12} aria-hidden="true"/>
                        </button>
                      </span>
                    ) : g.group === 'real' ? (
                      <span className="fin-band-row">
                        <button type="button" className="fin-qtoggle" data-fin-toggle="collapse"
                          aria-expanded="true" aria-controls="fin-annual-table" onClick={() => toggleQuarters(false)}
                          title={t('Fold kvartalerne sammen til 2026E og 2027B')}>
                          <I.ChevronRight size={12} aria-hidden="true" style={{ transform: 'rotate(180deg)' }}/>
                          {t('Fold sammen')}
                        </button>
                        <span>{g.label}</span>
                      </span>
                    ) : g.label}
                  </th>
                ))}
              </tr>
              <tr>
                {cols.map(c => (
                  <th key={c.key} data-col={c.key}
                    className={'fin-hd' + colCls(c)}
                    style={c.minWidth ? { minWidth: c.minWidth } : undefined} title={c.title ? t(c.title) : undefined}>
                    {finHead(c.label, c.note ? t(c.note) : null, c.year)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {layout.map((g) => {
                const out = [];
                out.push(
                  <tr key={g.label + '-h'} className="fin-grp">
                    <td className="fin-c1">{t(g.label)}</td>
                    <td colSpan={colCount - 1}/>
                  </tr>
                );
                g.entries.forEach((e) => {
                  if (isEmpty(e) && !showEmpty) return;
                  const kids = (e.children || []).filter(c => showEmpty || !isEmpty(c));
                  const expandable = kids.length > 1 || (showEmpty && kids.length > 0);
                  const key = g.label + '|' + e.label;
                  const open = expandable && (allOpen ? openRows[key] !== false : !!openRows[key]);
                  const note = e.ref && rowByLabel[e.ref] ? rowByLabel[e.ref].note : null;
                  out.push(
                    <tr key={key} className={e.memo ? 'fin-memo' : e.sum ? 'fin-sum' : ''}>
                      <td className="fin-c1">
                        {expandable ? (
                          <button type="button" aria-expanded={open} onClick={() => setOpenRows(m => ({ ...m, [key]: !open }))}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
                            <I.ChevronRight size={11} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--c-text-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}/>
                            {t(e.label)}
                          </button>
                        ) : (
                          <span style={e.memo ? { paddingLeft: 12, color: 'var(--c-text-2)' } : { paddingLeft: 15 }} title={note ? t(note) : undefined}>{t(e.label)}</span>
                        )}
                      </td>
                      {cols.map((col, ci) => {
                        const ref = e.ref || e.label;
                        if (!e.sum && !e.derive && canEdit(ref, col)) return editCell(ref, e.label, col, entryVal(e, col, ci));
                        return numCell(col, ci, fmt(entryVal(e, col, ci), {}));
                      })}
                    </tr>
                  );
                  if (open) kids.forEach((c) => {
                    const cref = (e.ref || e.label) + ' / ' + c.label;
                    out.push(
                      <tr key={key + '|' + c.label} className="fin-child">
                        <td className="fin-c1"><span style={{ paddingLeft: 30, color: 'var(--c-text-2)' }}>{t(c.label)}</span></td>
                        {cols.map((col, ci) => (!e.sum && !e.derive && canEdit(cref, col)
                          ? editCell(cref, c.label, col, c.vals[col.idx])
                          : numCell(col, ci, fmt(col.kind === 'annual' ? c.vals[col.idx] : null, {}))))}
                      </tr>
                    );
                  });
                });
                return <React.Fragment key={g.label}>{out}</React.Fragment>;
              })}

              {/* Kontrol: summen af detaljerne mod årsrapportens total */}
              <tr className="fin-grp">
                <td className="fin-c1">{t('Kontrol')}</td>
                <td colSpan={colCount - 1}/>
              </tr>
              {FIN_CONTROLS.map(ctl => (
                <tr key={ctl.label}>
                  <td className="fin-c1"><span style={{ paddingLeft: 15 }}>{t(ctl.label)}</span></td>
                  {cols.map((col, ci) => {
                    if (ctl.annual && col.kind !== 'annual') return numCell(col, ci, null);
                    const v = (id) => { const n = entryVal(entryById[id], col, ci); return n == null ? NaN : n; };
                    let d = NaN;
                    try { d = ctl.diff(v); } catch (err) { d = NaN; }
                    if (isNaN(d)) return numCell(col, ci, null);
                    const ok = Math.abs(d) < 0.0005;
                    return (
                      <td key={col.key} className={colCls(col) + ' mono num'}
                        title={ok ? t('Stemmer') : t('Afvigelse')}
                        style={{ color: ok ? 'var(--c-success)' : 'var(--c-danger)' }}>
                        {ok ? '✓' : (d > 0 ? '+' : '') + formatNum(d * scale, { decimals: unit === 'mio' ? 2 : 0 })}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Nøgletal - beregnet af kolonnens egne tal, ikke indtastet */}
              <tr className="fin-grp">
                <td className="fin-c1">{t('Nøgletal')}</td>
                <td colSpan={colCount - 1}/>
              </tr>
              {FIN_RATIOS.map(r => (
                <tr key={r.label}>
                  <td className="fin-c1" title={r.note ? t(r.note) : ''}>{t(r.label)}</td>
                  {cols.map((col, ci) => numCell(col, ci, fmt(r.calc(colMaps[ci], col.ann), r)))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Kilder */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderTop: '1px solid var(--c-line)',
          background: 'var(--c-surface-2)',
          fontSize: 12, color: 'var(--c-text-3)', flexWrap: 'wrap', gap: 8,
        }}>
          <span>
            {t('Kilder')}:{' '}
            {[
              ...FIN_ANNUAL_YEARS.map(y => ({ key: y, label: t('Årsrapport') + ' ' + y, doc: finSourceDoc('Årsrapport', y) })),
              { key: 'periode', label: t('Periodetal'), doc: finSourceDoc('Periodetal') },
              { key: 'budget', label: t('Budget'), doc: finSourceDoc('Budget') },
            ].map((it, i) => (
              <React.Fragment key={it.key}>
                {i > 0 && ' · '}
                {it.doc && go
                  ? <button type="button" onClick={() => {
                      const detail = { doc: it.doc.id, name: it.doc.name, ref: null, back: null };
                      try { sessionStorage.setItem('kabul:open-doc', JSON.stringify(detail)); } catch (e) {}
                      try { window.dispatchEvent(new CustomEvent('cw-open-doc', { detail })); } catch (e) {}
                      go('workspace:1:documents');
                    }} style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: 'var(--c-primary)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>{it.label}</button>
                  : <span>{it.label}</span>}
              </React.Fragment>
            ))}
          </span>
        </div>
      </div>
      </div>

      {/* Forklaringen på 2026E, 2027B og nøgletallene står ét sted, i en fold */}
      <CWFold id="fin-annual-howto" label={t('Sådan er tallene beregnet')} style={{ marginTop: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.6, maxWidth: 820 }}>
          {t('2026E: januar-august realiseret plus budget for september og Q4, balanceposter ultimo Q4 2026. Tredje kvartal er ikke afsluttet; kolonnen Jul-aug dækker kun juli og august, og balancen er pr. 31. august. 2027B: budget for Q1-Q3, altså kun 9 måneder, balanceposter ultimo Q3 2027. Nøgletal er beregnet af tallene i samme kolonne; hvor perioden er kortere end et år, er EBITDA annualiseret i Gæld / EBITDA. Realiserede tal og budget er virksomhedens egne indberetninger og er ikke revideret.')}
          {' '}{t('Egenkapital: primo plus årets resultat plus kapitalindskud. 2024: 3,5 + 0,7 + 0,6 = 4,8 mio. (årsrapport 2024, note 11).')}
        </div>
      </CWFold>

    </FinSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Ejerne som en stille, venstrestillet liste: fed ejernavn, én grå linje og
   ejerandelen til højre. Selskabet selv står i sagshovedet.
   ──────────────────────────────────────────────────────────────────────── */
const OWNER_KIND = { holding: 'Holdingselskab', fund: 'Fond', person: 'Person' };

function OwnerList() {
  // Ejere efter Ejerbog_2026.pdf, som også står i Det Offentlige Ejerregister
  const pctFmt = (v) => v.toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (window.CW_LANG === 'en' ? '%' : ' %');
  const line = (o) => o.type === 'holding' ? t('Reel ejer') + ': ' + DATA.COMPANY.realOwner
    : o.type === 'person' && o.role ? t(OWNER_KIND.person) + ', ' + t(o.role)
    : t(OWNER_KIND[o.type] || 'Selskab');
  return (
    <>
      {DATA.OWNERS.map((o, i) => (
        <div key={i} className="cw-row">
          <div className="cw-row-main">
            <span className="cw-row-title">{o.name}</span>
            <span className="cw-row-meta">{line(o)}</span>
          </div>
          <span style={{ color: 'var(--c-ink)', fontVariantNumeric: 'tabular-nums' }}>{pctFmt(o.share)}</span>
        </div>
      ))}
      <div className="cw-row" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <span className="cw-row-meta">{t('Medarbejderwarrants (NC-W2022) svarende til 5,0 % ved fuld udnyttelse står kun i ejerbogen, ikke i CVR.')}</span>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Trustpilot: et blødt signal som én rolig række; fordeling og anmeldelser
   i en fold
   ──────────────────────────────────────────────────────────────────────── */
function TrustpilotStars({ rating, size }) {
  size = size || 12;
  return (
    <span role="img" aria-label={rating + ' / 5'} style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} aria-hidden="true" style={{ color: i <= Math.round(rating) ? 'var(--c-text-2)' : 'var(--c-line-strong)', fontSize: size }}>★</span>
      ))}
    </span>
  );
}

const TRUSTPILOT = {
  score: 4.2,
  totalReviews: 127,
  dist: [
    { stars: 5, count: 78 },
    { stars: 4, count: 26 },
    { stars: 3, count: 11 },
    { stars: 2, count: 7 },
    { stars: 1, count: 5 },
  ],
  reviews: [
    { stars: 5, text: "Professionelt team og høj kvalitet på produkterne. Levering til tiden og god kommunikation undervejs.", author: "Klaus M.", date: "2026-05-12" },
    { stars: 4, text: "Generelt gode oplevelser. Responstiden på forespørgsler kunne forbedres.", author: "Mette H.", date: "2026-04-03" },
    { stars: 5, text: "Har samarbejdet med dem i 3 år. Stabil leverandør med god faglig kompetence.", author: "Peter L.", date: "2026-03-18" },
  ],
};

function TrustpilotSection() {
  const { score, totalReviews, dist, reviews } = TRUSTPILOT;
  const maxCount = Math.max(...dist.map(d => d.count));

  return (
    <section aria-label="Trustpilot" style={{ marginTop: 20 }}>
      <div className="card" style={{ padding: '4px 18px' }}>
        <div className="cw-row" style={{ alignItems: 'center' }}>
          <div className="cw-row-main">
            <span>
              <span className="cw-row-title">Trustpilot</span>
              <span style={{ color: 'var(--c-text-2)' }}> · {finFill(t('{score} af 5'), { score: DATA.fmt.num(score, 1) })} · {totalReviews} {t('anmeldelser')}</span>
            </span>
            <span className="cw-row-meta">{t('hentet')} {finPublicDataDate()}</span>
          </div>
          <a className="btn-ghost-sm" href={'https://www.trustpilot.com/review/' + DATA.COMPANY.trustpilotDomain} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginRight: -8 }}>
            {t('Åbn på Trustpilot')}
          </a>
        </div>
        <CWFold id="fin-trustpilot" label={t('Fordeling og seneste anmeldelser')}>
          {/* Fordeling i grå søjler */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 420, paddingBottom: 8 }}>
            {dist.map(d => (
              <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--c-text-3)' }}>
                <span style={{ width: 72, flexShrink: 0, whiteSpace: 'nowrap' }}>{d.stars} {d.stars === 1 ? t('stjerne') : t('stjerner')}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--c-line-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(d.count / maxCount) * 100}%`, height: '100%', background: 'var(--c-text-4)', borderRadius: 3 }}/>
                </div>
                <span style={{ width: 24, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{d.count}</span>
              </div>
            ))}
          </div>
          {reviews.map((r, i) => (
            <div key={i} className="cw-row" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
              <div className="cw-row-main">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrustpilotStars rating={r.stars}/>
                  <span className="cw-row-meta">{r.author} · {DATA.fmt.longDate(r.date)}</span>
                </span>
                <span style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 2 }}>{t(r.text)}</span>
              </div>
            </div>
          ))}
        </CWFold>
      </div>
    </section>
  );
}

window.WSFinancials = WSFinancials;
window.ANNUAL_REPORT = ANNUAL_REPORT;
window.FIN_RATIOS = FIN_RATIOS;
window.FIN_ANNUAL_YEARS = FIN_ANNUAL_YEARS;
window.FIN_ACTUAL_Q = FIN_ACTUAL_Q;
window.FIN_BUDGET_Q = FIN_BUDGET_Q;
window.FIN_BUDGET_SEP = FIN_BUDGET_SEP;

/* ─────────────────────────────────────────────────────────────────────────
   Crediwires egne eksporter under Dokumenter

   Samme indhold som sektionerne i fanen Virksomheden (regnskabstabel, produkt,
   marked og branche, Trustpilot, ejerskab og bindinger) plus stamdata, som filer
   rådgiveren kan hente og tage med over i Copilot, så et credit memo i Word kan
   skrives med alt materiale for sig. Filerne bygges ved hentning ud af de samme
   tal og tekster som siderne, så de ikke kan komme ud af takt. De ligger ikke i
   CASE_DOCS: det er memoets kildedokumenter, og eksporterne er afledt af dem.
   Hentes via CW.downloadDoc (pdf, og xlsx når navnet ender på .xlsx).
   ───────────────────────────────────────────────────────────────────────── */
const EX_TYPE = 'Crediwire-eksport';
const exClean = (s) => String(s == null ? '' : s).replace(/­/g, '').replace(/−/g, '-');
const exPad = (s, n) => { s = exClean(s); return s.length >= n ? s + ' ' : s + ' '.repeat(n - s.length); };
// Procent i PDF'erne, på det aktive sprog (Excel-arket bruger exNum)
const exPct = (v, dec) => exClean(DATA.fmt.num(v, dec == null ? 1 : dec)) + (window.CW_LANG === 'en' ? '%' : ' %');
const exCap = (s) => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
// Dansk talformat, som buildXlsx læser tilbage som tal: 41.100 og -0,27
function exNum(v, dec) {
  if (v == null || isNaN(v)) return '-';
  const r = Number(v.toFixed(dec));
  const parts = Math.abs(r).toFixed(dec).split('.');
  const int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (r < 0 ? '-' : '') + int + (parts[1] ? ',' + parts[1] : '');
}
function exWrap(text, width) {
  const out = []; let line = '';
  exClean(text).split(/\s+/).filter(Boolean).forEach(w => {
    if (line && (line + ' ' + w).length > (width || 98)) { out.push(line); line = w; } else line = line ? line + ' ' + w : w;
  });
  if (line) out.push(line);
  return out.join('\n');
}
function exHead(title) { return exClean(title).toUpperCase(); }
const exToday = () => DATA.fmt.isoDay(new Date());
const exWhen = () => DATA.fmt.longDate(exToday());
const exCompanyLine = () => DATA.COMPANY.name + ' · CVR ' + DATA.COMPANY.cvr;

/* Kilderne under regnskabstabellen og i eksportens noter: kun dokumenter, der
   findes på sagen. Registret (DATA.DOCS) har årsrapporterne. Periodetal og budget
   kommer fra kunden og står som upload (CW.allUploads), når kunden har sendt dem.
   → { id, name } eller undefined */
const FIN_SOURCE_ITEM = { 'Periodetal': 'm-interim', 'Budget': 'm-budget' };
function finSourceDoc(type, year) {
  const reg = (DATA.DOCS || []).find(x => x.type === type && !x.superseded && (year == null || String(x.year) === String(year)));
  if (reg) return reg;
  const item = FIN_SOURCE_ITEM[type];
  const up = item && window.CW ? CW.allUploads().find(f => f.itemId === item && f.itemStatus !== 'rejected') : null;
  return up ? { id: up.id, name: up.name } : undefined;
}

/* Regnskabstabellen som tre ark: samlet tabel (år, 2026E, 2027B), kvartalerne og noter.
   Tal i DKK t.; nøgletal og forholdstal uskalerede. */
function exFinancialsPages() {
  // Samme tal som tabellen, med rådgiverens rettelser
  const edits = finLoadEdits();
  const model = finApplyEdits(edits);
  const rawRows = model.rows;
  const rowByLabel = model.byLabel;
  const val = (row, col) => finRawValue(row, col);
  // Kommentarer til tallene kommer med som noter i cellerne i Excel: { r: række, c: kolonne (0-baseret), t: tekst, a: forfatter }
  const nts = finLoadNotes();
  const cmts = { main: [], qs: [] };
  const addC = (arr, r, ref, cols) => cols.forEach((c, i) => {
    if (!c.key) return;
    const cs = finCommentsFor(nts, edits, ref, c.key);
    if (cs.length) arr.push({ r, c: 1 + i, t: cs.map(x => (x.by ? x.by + (x.at ? ' (' + finShortDate(x.at) + ')' : '') + ': ' : '') + t(x.text)).join('\n'), a: cs[0].by || finAdvisor() });
  });
  const line = (cells) => cells.map(exClean).join('  ');
  const budgetWord = t('Budget').toLowerCase();
  // Note-kolonne: hvilke kolonner i rækken der er rettet
  const editNote = (ref, cols) => {
    const hit = cols.filter(c => c.key && model.map[ref + '|' + c.key]).map(c => c.head);
    return hit.length ? [t('rettet') + ': ' + hit.join(', ')] : [];
  };

  const mainCols = FIN_ANNUAL_YEARS.map((y, i) => ({ key: 'y' + i, kind: 'annual', idx: i, ann: 1, head: y }))
    .concat([
      { kind: 'est', ann: 1, head: '2026E (' + t('jan-aug + budget') + ')' },
      { kind: 'b9', ann: 4 / 3, head: '2027B (' + t('9 mdr. budget') + ')' },
    ]);
  // Kvartalerne i samme rækkefølge som tabellen: pr. år, med summen sidst i sit år
  const bCols = FIN_BUDGET_Q.map((p, i) => ({ key: 'b' + i, kind: 'b', idx: i, ann: 4, year: p.year, head: p.label + ' ' + p.year + ' (' + budgetWord + ')' }));
  const qCols = FIN_ACTUAL_Q.map((p, i) => ({ key: 'q' + i, kind: 'q', idx: i, ann: 12 / p.months, head: t(p.label) + ' ' + p.year + (p.partial ? ' (' + t('kun 2 mdr.') + ')' : '') }))
    .concat([{ key: 'bs', kind: 'bs', ann: 12, head: t(FIN_BUDGET_SEP.label) + ' ' + FIN_BUDGET_SEP.year + ' (' + budgetWord + ')' }])
    .concat(bCols.filter(c => c.year === '2026'))
    .concat([mainCols.find(c => c.kind === 'est')])
    .concat(bCols.filter(c => c.year === '2027'))
    .concat([mainCols.find(c => c.kind === 'b9')]);

  const ratioRows = (cols) => {
    const maps = cols.map(c => { const m = {}; rawRows.forEach(r => { m[r.label] = val(r, c); }); return m; });
    return FIN_RATIOS.map(r => line([t(r.label)].concat(cols.map((c, i) => {
      const v = r.calc(maps[i], c.ann);
      return v == null || isNaN(v) ? '-' : exNum(v, r.percent ? 1 : (r.decimals != null ? r.decimals : 1));
    }))));
  };
  const money = (v) => (v == null || isNaN(v) ? '-' : exNum(v * 1000, 0));

  // Ark 1: regnskabstabellen med detaljer (kun årene har detaljer)
  const isZero = (arr) => arr.every(v => v == null || v === 0);
  const entryVal = (e, col) => finEntryVal(e, col, rowByLabel, model.entryByLabel);
  const main = [
    DATA.COMPANY.name + ' - ' + t('Regnskab'),
    t('Beløb i DKK t. (tusinde kroner). Nøgletal i procent eller gange.'),
    '',
    line([t('Regnskabspost')].concat(mainCols.map(c => c.head)).concat(edits.length ? [t('Note')] : [])),
  ];
  model.layout.forEach(g => {
    main.push(line([t(g.label)]));
    g.entries.forEach(e => {
      if (!e.ref && !e.derive && isZero(e.vals || [])) return;
      const ref = e.ref || e.label;
      const r0 = main.length;
      main.push(line([t(e.label)].concat(mainCols.map(c => money(entryVal(e, c)))).concat(e.sum || e.derive ? [] : editNote(ref, mainCols))));
      if (!(e.sum || e.derive)) addC(cmts.main, r0, ref, mainCols);
      (e.children || []).forEach(c => {
        if (isZero(c.vals)) return;
        const r1 = main.length;
        main.push(line(['- ' + t(c.label)].concat(mainCols.map(col => (col.kind === 'annual' ? money(c.vals[col.idx]) : '-'))).concat(editNote(ref + ' / ' + c.label, mainCols))));
        addC(cmts.main, r1, ref + ' / ' + c.label, mainCols);
      });
    });
  });
  main.push(line([t('Nøgletal')]));
  ratioRows(mainCols).forEach(r => main.push(r));

  // Ark 2: kvartalerne bag 2026E og 2027B (rå poster og nøgletal)
  const qs = [
    DATA.COMPANY.name + ' - ' + t('Kvartaler'),
    t('Realiseret 2026 efter periodetal, budget efter budgetversionen på sagen. Beløb i DKK t.'),
    '',
    line([t('Regnskabspost')].concat(qCols.map(c => c.head)).concat(edits.length ? [t('Note')] : [])),
  ];
  ANNUAL_REPORT.groups.forEach(g => {
    qs.push(line([t(g.label)]));
    g.rows.forEach(r => {
      const rq = qs.length;
      qs.push(line([t(r.label)].concat(qCols.map(c => money(val(rowByLabel[r.label], c)))).concat(FIN_POSTS[r.label] ? editNote(r.label, qCols) : [])));
      if (FIN_POSTS[r.label]) addC(cmts.qs, rq, r.label, qCols);
    });
  });
  qs.push(line([t('Nøgletal')]));
  ratioRows(qCols).forEach(r => qs.push(r));

  // Ark 3: noter og kilder
  const docOf = finSourceDoc;
  const sources = FIN_ANNUAL_YEARS.map(y => docOf('Årsrapport', y)).concat([docOf('Periodetal'), docOf('Budget')]).filter(Boolean).map(d => d.name);
  // Rettelserne én pr. linje, i DKK t.
  const editLines = edits.slice()
    .sort((a, b) => (FIN_POST_ORDER.indexOf(a.rowRef) - FIN_POST_ORDER.indexOf(b.rowRef)) || (FIN_EDIT_COL[a.colKey].order - FIN_EDIT_COL[b.colKey].order))
    .map(x => finEditName(x.rowRef, x.colKey) + ': ' + finLogNum(x.original) + ' → ' + finLogNum(finPostValue(model, x.rowRef, FIN_EDIT_COL[x.colKey]))
      + ' (' + [x.by, finShortDate(x.at), x.reason ? t(x.reason) : ''].filter(Boolean).join(', ') + ')');
  const notes = [
    t('Noter til regnskabstabellen'),
    '',
    t('Sådan er tallene beregnet') + ':',
    t('2026E: januar-august realiseret plus budget for september og Q4, balanceposter ultimo Q4 2026. Tredje kvartal er ikke afsluttet; kolonnen Jul-aug dækker kun juli og august, og balancen er pr. 31. august. 2027B: budget for Q1-Q3, altså kun 9 måneder, balanceposter ultimo Q3 2027. Nøgletal er beregnet af tallene i samme kolonne; hvor perioden er kortere end et år, er EBITDA annualiseret i Gæld / EBITDA. Realiserede tal og budget er virksomhedens egne indberetninger og er ikke revideret.'),
    t('Egenkapital: primo plus årets resultat plus kapitalindskud. 2024: 3,5 + 0,7 + 0,6 = 4,8 mio. (årsrapport 2024, note 11).'),
    '',
    t('Kilder') + ': ' + sources.join(', '),
    (cmts.main.length || cmts.qs.length) ? t('Kommentarer til tallene står som noter i cellerne (hold musen over en celle med en rød trekant).') : '',
    edits.length ? t('Tal rettet manuelt af rådgiveren (DKK t.). Summer og nøgletal er regnet med de rettede tal:') : t('Ingen tal er rettet manuelt; tallene er kildernes.'),
    ...editLines,
    '',
    t('Eksporteret fra Crediwire') + ' ' + exWhen() + '.',
  ];

  const sheet = (ref, title, rows, comments) => ({ ref: 'ark ' + ref, title, body: rows.join('\n'), comments: comments || [] });
  return [
    sheet(t('Regnskab'), t('Regnskab'), main, cmts.main),
    sheet(t('Kvartaler'), t('Kvartaler'), qs, cmts.qs),
    sheet(t('Noter'), t('Noter og kilder'), notes),
  ];
}

function exMarketPages() {
  const co = DATA.COMPANY;
  const head = [exHead(t('Produkt, marked og branche')), exCompanyLine(), '',
    exWrap(finFill(t('AI-sammenfattet baggrund {date}. Ikke kontrolleret mod kilder. Kontrollér før brug i indstillingen.'), { date: finPublicDataDate() }))];
  const body = head.concat([
    '',
    exHead(t('Virksomheden')),
    t('Branche') + ': ' + co.industry,
    t('Aktivitet') + ': ' + co.activity,
    t('Antal ansatte') + ': ' + co.employees,
    t('Hjemsted') + ': ' + co.hq,
    '',
    exHead(t('Produktbeskrivelse')),
    exWrap(t(PRODUCT_TEXT)),
    '',
    exHead(t('Markedet')),
    exWrap(t(MARKET_TEXT)),
    '',
    exHead(t('PEST-analyse')),
  ]);
  MARKET_PEST.forEach(p => { body.push(exWrap(t(p.k) + ': ' + t(p.desc))); body.push(''); });
  return [{ ref: 's. 1', title: t('Produkt, marked og branche'), body: body.join('\n').replace(/\n+$/, '') }];
}

function exTrustpilotPages() {
  const tp = TRUSTPILOT, co = DATA.COMPANY;
  const body = [
    exHead('Trustpilot'), exCompanyLine(), '',
    finFill(t('{score} af 5'), { score: DATA.fmt.num(tp.score, 1) }) + ' · ' + tp.totalReviews + ' ' + t('anmeldelser') + ' · ' + t('hentet') + ' ' + finPublicDataDate(),
    'https://www.trustpilot.com/review/' + co.trustpilotDomain, '',
    exHead(t('Fordeling')),
  ];
  tp.dist.forEach(d => body.push(exPad(d.stars + ' ' + (d.stars === 1 ? t('stjerne') : t('stjerner')), 14) + exPad(String(d.count), 6) + exPct(d.count / tp.totalReviews * 100, 0)));
  body.push('', exHead(t('Seneste anmeldelser')));
  tp.reviews.forEach(r => { body.push(r.stars + '/5 · ' + r.author + ' · ' + DATA.fmt.longDate(r.date)); body.push(exWrap(t(r.text))); body.push(''); });
  body.push(exWrap(t('Trustpilot er et blødt signal: anmeldelserne er skrevet af kunder og leverandører og er ikke kontrolleret. Gengivet som hentet, ikke vurderet.')));
  return [{ ref: 's. 1', title: 'Trustpilot', body: body.join('\n') }];
}

function exOwnershipPages() {
  const co = DATA.COMPANY;
  const kind = { holding: 'Holdingselskab', fund: 'Fond', person: 'Person' };
  const body = [
    exHead(t('Ejerskab og finansielle bindinger')), exCompanyLine(), '',
    exWrap(t('Ejere fra Det Offentlige Ejerregister (CVR), som stemmer med ejerbogen.') + ' ' + exCap(t('hentet')) + ' ' + finPublicDataDate() + '.'),
    '',
    exHead(t('Ejere')),
    exPad(t('Ejer'), 24) + exPad(t('Andel'), 10) + exPad(t('Efter warrants'), 16) + exPad('CVR', 11) + t('Type'),
  ];
  DATA.OWNERS.forEach(o => body.push(exPad(o.name, 24) + exPad(exPct(o.share), 10) + exPad(exPct(o.diluted), 16) + exPad(o.cvr || '-', 11) + t(kind[o.type] || 'Selskab') + (o.role ? ', ' + t(o.role) : '')));
  body.push('', t('Reel ejer') + ': ' + co.realOwner);
  body.push(exWrap(t('Medarbejderwarrants (NC-W2022) svarende til 5,0 % ved fuld udnyttelse står kun i ejerbogen, ikke i CVR.')));
  body.push('', exHead(t('Bestyrelse')), exPad(t('Navn'), 24) + exPad(t('Rolle'), 24) + t('Siden'));
  DATA.BOARD.forEach(b => body.push(exPad(b.name, 24) + exPad(t(b.role), 24) + b.since));
  body.push(exWrap(finFill(t("Ingen af de {n} medlemmer er PEP. Tjekket mod EU's sanktionsliste og nationale PEP-registre {date}."), { n: DATA.BOARD.length, date: finPublicDataDate() })));
  body.push('', exHead(t('Direktion')), exPad(t('Navn'), 24) + exPad(t('Rolle'), 30) + t('Anmeldt i CVR'));
  DATA.MANAGEMENT.forEach(m => body.push(exPad(m.name, 24) + exPad(t(m.role), 30) + (m.registered ? t('Ja') : t('Nej'))));
  body.push('', exHead(t('Koncernforhold')), exWrap(t('Ingen datterselskaber · søsterselskab Nordhavn Production ApS (samhandel på markedsvilkår)')));
  return [{ ref: 's. 1', title: t('Ejerskab og finansielle bindinger'), body: body.join('\n') }];
}

function exCompanyPages() {
  const co = DATA.COMPANY;
  const rows = [
    [t('Virksomhedsnavn'), co.name], [t('CVR-nr.'), co.cvr], [t('Juridisk form'), co.legalForm], [t('Branche'), co.industry],
    [t('Stiftelsesdato'), co.founded], [t('Antal ansatte'), co.employees], [t('Adresse'), co.address],
    [t('Postnummer/by'), co.postal], [t('Land'), co.country], [t('Kommune'), co.municipality],
    [t('Revisor'), co.auditor], [t('Bankforbindelse'), co.bank], [t('Direktør'), co.ceo],
  ];
  const body = [
    exHead(t('Virksomhed og facilitet')), '',
    t('Stamdata fra') + ' ' + co.masterDataSource + ', ' + t('opdateret') + ' ' + co.masterDataUpdated + '.',
    co.cvrUrl, '',
  ].concat(rows.map(r => exPad(r[0], 22) + exClean(r[1])));
  body.push('', exHead(t('Sagen')),
    exPad(t('Sagsnummer'), 22) + co.caseNr,
    exPad(t('Sagstype'), 22) + co.caseType,
    exPad(t('Beløb'), 22) + exClean(co.amount) + ' (' + exClean(co.amountNote) + ')');
  return [{ ref: 's. 1', title: t('Virksomhed og facilitet'), body: body.join('\n') }];
}

function exDoc(id, name, build) {
  return {
    id, name, type: EX_TYPE, source: 'Crediwire', origin: 'export', period: '-',
    get date() { return exToday(); },
    get meta() { return t('Eksporteret fra Crediwire') + ' ' + exWhen(); },
    get pages() { return build(); },
  };
}
window.CW_EXPORT_DOCS = [
  exDoc('crediwire-regnskabstabel', 'Regnskabstabel_Nordhavn.xlsx', exFinancialsPages),
  exDoc('crediwire-produkt-marked-branche', 'Produkt_marked_og_branche.pdf', exMarketPages),
  exDoc('crediwire-trustpilot', 'Trustpilot.pdf', exTrustpilotPages),
  exDoc('crediwire-ejerskab-bindinger', 'Ejerskab_og_finansielle_bindinger.pdf', exOwnershipPages),
  exDoc('crediwire-virksomhedsprofil', 'Virksomhedsprofil_CVR.pdf', exCompanyPages),
];
window.finEstimate2026 = finEstimate2026;
window.AnnualReportSection = AnnualReportSection;
