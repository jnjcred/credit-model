// Financials - credit-case financial overview (public data only - periodetal/budget not yet received)
const FIN_VIEWS = [
  { k: "all",        l: "Alle" },
  { k: "kpi",        l: "Finansielle tal" },
  { k: "market",     l: "Marked og produkt" },
  { k: "ownership",  l: "Ejerskab" },
];

/* ─────────────────────────────────────────────────────────────────────────
   Genbrugelig Modal-overlay komponent
   ──────────────────────────────────────────────────────────────────────── */
function FinModal({ open, onClose, title, children, width }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(10,12,16,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        width: width || 480, maxWidth: '100%',
        maxHeight: '85vh', overflow: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--c-line)',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-ink)' }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 0, background: 'var(--c-surface-2)',
              borderRadius: 6, cursor: 'pointer', display: 'grid', placeItems: 'center',
              color: 'var(--c-text-2)',
            }}
          >
            <I.X size={13}/>
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function WSFinancials({ go }) {
  const f = DATA.FINANCIALS;
  // Public data: only the three annual columns from CVR
  const annualYears = f.years.slice(0, 3);
  const annual = {
    years: annualYears,
    revenue: f.revenue.slice(0, 3),
    ebitda: f.ebitda.slice(0, 3),
    grossMargin: f.grossMargin.slice(0, 3),
    liquidity: f.liquidity.slice(0, 3),
    equity: f.equity.slice(0, 3),
    debt: f.debt.slice(0, 3),
  };
  const [view, setView] = React.useState("all");
  const show = (k) => view === "all" || view === k;

  return (
    <div className="page page-wide" style={{ maxWidth: 1080, padding: '24px 32px 80px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--c-ink)', margin: 0 }}>Finansielt overblik</h1>
        <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 4, maxWidth: 720 }}>
          Foreløbig vurdering baseret på offentlige årsregnskaber, branche og soft signals. Periodetal, budget og interne dokumenter mangler fra kunden.
        </div>
        <div style={{
          marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 8,
          background: 'var(--c-warn-bg)', border: '1px solid #f4dfb7',
          padding: '8px 12px', borderRadius: 8,
          fontSize: 12, color: 'var(--c-text-2)', lineHeight: 1.5, maxWidth: 720,
        }}>
          <I.AlertCircle size={13} style={{ color: 'var(--c-warn)', flexShrink: 0, marginTop: 2 }}/>
          <span>
            <b style={{ color: 'var(--c-ink)', fontWeight: 600 }}>AI kan tage fejl.</b>{' '}
            Sammenfatninger og markedsdata er genereret af AI og kan indeholde fejl eller forældede oplysninger.
            Verificér altid kritiske tal og udsagn mod kilden, før de bruges i kreditindstilling.
          </span>
        </div>
      </div>

      {/* Sticky toolbar - section filter + næste-skridt CTAs */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 0',
          marginBottom: 8,
          background: 'var(--c-bg)',
          borderBottom: '1px solid var(--c-line-2)',
        }}
      >
        <div
          role="tablist"
          aria-label="Filtrér sektioner"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1, minWidth: 0 }}
        >
          {FIN_VIEWS.map(v => {
            const active = view === v.k;
            return (
              <button
                key={v.k}
                role="tab"
                aria-selected={active}
                onClick={() => setView(v.k)}
                style={{
                  height: 30, padding: '0 12px',
                  border: '1px solid ' + (active ? 'var(--c-primary)' : 'var(--c-line)'),
                  background: active ? 'var(--c-primary)' : '#fff',
                  color: active ? '#fff' : 'var(--c-text-2)',
                  fontSize: 12.5, fontWeight: 500,
                  borderRadius: 999, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {v.l}
              </button>
            );
          })}
        </div>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => go && go("workspace:1:memo")}
          title="Afslå sagen baseret på det nuværende grundlag"
          style={{ flexShrink: 0 }}
        >
          Giv afslag
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => go && go("workspace:1")}
          title="Send anmodning til kunden om periodetal, budget og dokumenter"
          style={{ flexShrink: 0 }}
        >
          Gå videre <I.ArrowRight className="ic"/>
        </button>
      </div>

      {/* Årsregnskaber - 3 års overblik */}
      {show("kpi") && (
        <AnnualReportSection go={go}/>
      )}

      {/* Budget - editérbart, max 12 mdr frem */}
      {show("kpi") && (
        <BudgetSection/>
      )}



      {/* Trustpilot */}
      {show("market") && <TrustpilotSection/>}

      {/* 5. Produkt, marked og branche - kontekst, ikke findings */}
      {show("market") && <MarketSection/>}

      {/* 6. Ejerskab og finansielle bindinger - træ-visualisering */}
      {show("ownership") && <OwnershipSection/>}

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────── */

function FinSection({ title, sub, badge, children }) {
  return (
    <section style={{ marginTop: 28, marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.01em', lineHeight: 1.25,
          }}>
            {title}
          </h2>
          {sub && <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginTop: 4, lineHeight: 1.5, maxWidth: 760 }}>{sub}</div>}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function StatusTag({ kind, children }) {
  const tones = {
    warn:    { fg: 'var(--c-warn)', bg: 'var(--c-warn-bg)', border: '#f4dfb7' },
    info:    { fg: 'var(--c-primary)', bg: 'var(--c-primary-bg)', border: 'var(--c-primary-border)' },
    neutral: { fg: 'var(--c-text-2)', bg: 'var(--c-surface-2)', border: 'var(--c-line)' },
    success: { fg: 'var(--c-success)', bg: 'var(--c-success-bg)', border: '#cfe6d8' },
  };
  const t = tones[kind] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 500, color: t.fg, background: t.bg,
      border: `1px solid ${t.border}`, padding: '2px 8px', borderRadius: 999,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function DataBasisCard({ title, description, chips, source, status, stamp }) {
  return (
    <div style={{ padding: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.5 }}>{description}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {chips.map((c, i) => (
          <span key={i} style={{
            fontSize: 11.5, fontWeight: 500, color: 'var(--c-ink)',
            background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
            padding: '2px 8px', borderRadius: 6,
          }}>
            {c}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 11.5, color: 'var(--c-text-3)', flexWrap: 'wrap' }}>
        <span>Kilde: <b style={{ color: 'var(--c-text-2)', fontWeight: 500 }}>{source}</b></span>
        {status && <><span>·</span><StatusTag kind="success">{status}</StatusTag></>}
        {stamp && <><span>·</span><span>{stamp}</span></>}
      </div>
    </div>
  );
}

const KPIS = [
  { label: "Egenkapital", value: "6,2M", delta: "+33,4% siden 2023", dir: "up", period: "Årsregnskab 2025", note: "Styrket egenkapital over perioden." },
  { label: "Soliditet", value: "44%", delta: "+7pp siden 2023", dir: "up", period: "Årsregnskab 2025", note: "Sund kapitalstruktur." },
  { label: "Gæld", value: "7,8M", delta: "+32,2% siden 2023", dir: "down", period: "Årsregnskab 2025", note: "Følges sammen med periodetal." },
  { label: "Balancesum", value: "14,0M", delta: "+49% siden 2023", dir: "up", period: "Årsregnskab 2025", note: "Vækst i samlede aktiver." },
];

function KpiCard({ label, value, delta, dir, period, note }) {
  const positive = dir === 'up';
  return (
    <div style={{
      padding: '12px 14px',
      border: '1px solid var(--c-line)',
      borderRadius: 8,
      background: 'var(--c-surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 11.5, color: 'var(--c-text-2)' }}>{label}</div>
        <div style={{ fontSize: 10.5, color: 'var(--c-text-3)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{period}</div>
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--c-ink)', marginTop: 4, letterSpacing: '-0.01em' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 11.5, color: positive ? 'var(--c-success)' : 'var(--c-warn)', fontWeight: 500 }}>
        {positive ? <I.TrendUp size={11}/> : <I.TrendDown size={11}/>}
        <span>{delta}</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 6, lineHeight: 1.4 }}>{note}</div>
    </div>
  );
}

const MARKET_SIGNALS = [
  { title: "DK vindkomponenter: +6,8%", body: "Branchen voksede 6,8% i 2025. Understøtter vækstforventning, men forklarer ikke alene budgetspring i juli." },
  { title: "Ordreindgang i sektoren stabiliseret i Q2", body: "Indikerer realistisk fundament for H2-omsætning, men ordrebog bør verificeres." },
  { title: "Eksportandel kan øge følsomhed over for valutakurser", body: "70% af omsætning er EUR-faktureret. Kan påvirke margin ved DKK/EUR-udsving." },
];

const OWNERSHIP_TIES = [
  { title: "Anpartshaverlån", body: "0,5M registreret i note 14. Vilkår og tilbagebetaling bør afklares før kaution-vurdering." },
  { title: "Ejerkoncentration", body: "Én hovedaktionær kontrollerer 92%. Relevant for kaution og beslutningsrisiko." },
  { title: "Ingen intercompany-balancer", body: "Selskabet indgår ikke i koncern. Lavere kompleksitet i kapitalstruktur." },
];

function SignalRow({ title, body, isFirst }) {
  return (
    <div style={{
      padding: '12px 0',
      borderTop: isFirst ? 'none' : '1px solid var(--c-line-2)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-ink)' }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 3, lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Produkt, marked og branche — med upload-markedsnotat
   ──────────────────────────────────────────────────────────────────────── */
function MarketSection() {
  const [uploadState, setUploadState] = React.useState('idle'); // 'idle' | 'uploaded'
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [docModalOpen, setDocModalOpen] = React.useState(false);

  return (
    <>
      <FinSection
        title="Produkt, marked og branche"
        sub="Kontekst for branche, marked og makro. Kreditrelevante observationer ligger under Findings øverst."
      >
        {/* Markedssignaler - top numbers */}
        <div className="card" style={{ padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: "Branchevækst 2025",   value: "+6,8%",    note: "DK vindkomponenter", src: "Danmarks Statistik · brancheindeks" },
              { label: "Ordreindgang",         value: "Stabil",   note: "Sektoren i Q2 2026", src: "Wind Denmark · kvartalsrapport Q2 2026" },
              { label: "Konkurrenceniveau",   value: "Moderat",  note: "5-7 spillere i DK-segment", src: "AI-vurdering · CVR-opslag på branchekode 28.11.00" },
            ].map((m, i) => (
              <div key={i} style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--c-text-2)' }}>{m.label}</div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)', marginTop: 3 }}>{m.value}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>{m.note}</div>
                <div style={{ fontSize: 10.5, color: 'var(--c-text-4)', marginTop: 4, fontStyle: 'italic' }}>Kilde: {m.src}</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--c-line-2)',
            fontSize: 11, color: 'var(--c-text-3)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <I.Sparkles size={11} style={{ color: 'var(--c-primary)' }}/>
            <span>AI-sammenfatning af eksterne brancheopslag · hentet 23. maj 2026</span>
          </div>
        </div>

        {/* PEST analyse */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)' }}>PEST-analyse</div>
          <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>· kort overblik over makroforhold</div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10.5, fontWeight: 500, color: 'var(--c-primary)',
            background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-border)',
            padding: '1px 7px', borderRadius: 999,
          }}>
            <I.Sparkles size={9}/> AI-genereret
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { k: "Politisk",    desc: "EU's Green Deal og dansk vindkraftpolitik støtter sektoren. Følg evt. handelsbarrierer på import af kompositmaterialer.", src: "EU-Kommissionen · Green Deal-pakke 2024; Energistyrelsen" },
            { k: "Økonomisk",   desc: "Stabil branchevækst og lave finansieringsomkostninger. DKK/EUR-følsomhed pga. høj eksportandel kan påvirke marginer.", src: "Nationalbanken · pengepolitik maj 2026; Danmarks Statistik" },
            { k: "Socialt",     desc: "Stigende efterspørgsel efter vedvarende energi understøtter pipeline. Kompetencemangel i komposit-faget kan presse lønninger.", src: "DI Energi · arbejdsmarkedsanalyse 2025" },
            { k: "Teknologisk", desc: "Genanvendelige kompositter og automatisering skaber muligheder, men kræver kapitalinvesteringer for at følge med.", src: "Wind Denmark · teknologinotat 2025; AI-syntese" },
          ].map((p, i) => (
            <div key={i} className="card" style={{ padding: '12px 14px', minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-primary)' }}>
                {p.k}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 4, lineHeight: 1.5 }}>{p.desc}</div>
              <div style={{ fontSize: 10.5, color: 'var(--c-text-4)', marginTop: 6, fontStyle: 'italic', lineHeight: 1.4 }}>Kilde: {p.src}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--c-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <I.Sparkles size={11} style={{ color: 'var(--c-primary)' }}/>
          <span>AI-syntese baseret på offentlige rapporter og branchekilder · genereret 23. maj 2026. Bør valideres af kreditrådgiver inden brug i indstilling.</span>
        </div>

        {/* Produktbeskrivelse */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--c-line-2)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)' }}>Produktbeskrivelse</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>· hentet automatisk fra web</div>
            </div>
            {uploadState === 'uploaded' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '5px 10px',
                  background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
                  borderRadius: 7,
                }}>
                  <I.File size={12} style={{ color: 'var(--c-primary)', flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--c-ink)' }}>produktblad_nordhavn.pdf</div>
                    <div style={{ fontSize: 10.5, color: 'var(--c-text-3)' }}>Uploadet 4. jun 2026</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setDocModalOpen(true)}
                    style={{ marginLeft: 2, fontSize: 11.5 }}
                  >
                    Åbn
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setUploadState('idle')}
                  style={{ color: 'var(--c-text-3)', fontSize: 11.5 }}
                >
                  Fjern
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setUploadModalOpen(true)}
                style={{ flexShrink: 0 }}
              >
                <I.File size={12} style={{ marginRight: 5 }}/> Upload produktdokumentation
              </button>
            )}
          </div>

          {/* Description card */}
          <div className="card" style={{ padding: '14px 18px', position: 'relative' }}>
            {uploadState === 'uploaded' && (
              <div style={{
                position: 'absolute', top: 12, right: 14,
                fontSize: 10.5, fontWeight: 500, color: 'var(--c-success)',
                background: 'var(--c-success-bg)', border: '1px solid #cfe6d8',
                padding: '1px 7px', borderRadius: 999,
              }}>
                Suppleret af upload
              </div>
            )}
            <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.65, maxWidth: 760 }}>
              {uploadState === 'uploaded' ? (
                <>
                  NordHavn Composites A/S producerer avancerede kompositelementer til vindmølleindustrien med speciale i store offshore-vinger (80-115 m). Selskabets kernekompetence er high-precision finishing og tolerancestyring, der adskiller dem fra lavpriskonkurrenter i Østeuropa.
                  {' '}<span style={{ color: 'var(--c-ink)', fontWeight: 500 }}>Tre ankerkunder (Vestas, Siemens Gamesa, Ørsted) udgør ca. 80% af omsætningen.</span>{' '}
                  Selskabet investerer i 2026 i automatiseret NDT-scanning og planlægger kapacitetsudvidelse på 20% frem mod 2027.
                </>
              ) : (
                <>
                  NordHavn Composites A/S producerer avancerede kompositelementer til vindmølleindustrien med speciale i store offshore-vinger (80-115 m). Selskabets kernekompetence er high-precision finishing og tolerancestyring, der adskiller dem fra lavpriskonkurrenter i Østeuropa. Faciliteter i Esbjerg med kapacitet til vinger op til 115 m og levering til de største globale OEM'er.
                </>
              )}
            </div>
            <div style={{
              marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--c-line-2)',
              fontSize: 11, color: 'var(--c-text-3)',
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            }}>
              <I.Sparkles size={11} style={{ color: 'var(--c-primary)' }}/>
              <span>
                AI-sammenfatning · Kilder:{' '}
                <a href="https://nordhavncomposites.dk" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-primary)', textDecoration: 'none' }}>nordhavncomposites.dk</a>
                {' '}· CVR-udtræk{uploadState === 'uploaded' ? ' · produktblad_nordhavn.pdf' : ''} — hentet 4. jun 2026
              </span>
            </div>
          </div>
        </div>
      </FinSection>

      {/* Upload modal */}
      <FinModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload produktdokumentation"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.6 }}>
            Upload produktblad, brochure, markedsnotat eller andet materiale om virksomhedens produkt og markedsposition. Dokumentet supplerer den automatisk hentede produktbeskrivelse.
          </div>
          <div style={{
            border: '2px dashed var(--c-line-strong)',
            borderRadius: 8, padding: '28px 20px',
            textAlign: 'center',
            background: 'var(--c-surface-2)',
          }}>
            <I.File size={24} style={{ color: 'var(--c-text-3)', marginBottom: 8 }}/>
            <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginBottom: 4 }}>
              PDF, Word eller PowerPoint — maks. 20 MB
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginBottom: 14 }}>
              Produktblad, brochure, markedsnotat eller lignende
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setUploadState('uploaded');
                setUploadModalOpen(false);
              }}
            >
              Vælg fil
            </button>
          </div>
        </div>
      </FinModal>

      {/* Dokument preview modal */}
      <FinModal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="produktblad_nordhavn.pdf — råvisning"
        width={560}
      >
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.8, color: 'var(--c-text-2)', whiteSpace: 'pre-wrap' }}>
{`PRODUKTBLAD — NordHavn Composites A/S
Udarbejdet: Maj 2026

PRODUKT
Fremstilling af store komposit-vindmøllevinger til offshore-
installation. Specialisering i vinger fra 80-115 m med focus
på præcisionsfremstilling og overfladebehandling.

NØGLEKOMPETENCER
- High-precision finishing og tolerancestyring
- NDT-inspektion (non-destructive testing) in-house
- Certificeret til IEC 61400-5 og DNV GL-standarder

KUNDER
Tre ankerkunder udgør ca. 80% af omsætningen:
  - Vestas Wind Systems (langtidsaftale til 2028)
  - Siemens Gamesa (rammeaftale, fornyes Q3 2026)
  - Ørsted (pilotleverandør, to projekter)

KAPACITET OG VÆKST
Produktion i Esbjerg, 28 medarbejdere. Investering i
automatiseret NDT-scanning planlagt H2 2026.
Kapacitetsudvidelse på 20% frem mod 2027.

[Dokument fortsætter — 8 sider i alt]`}
        </div>
      </FinModal>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Ejerskab og finansielle bindinger — med bestyrelse-modal, ejerbog,
   og nøglepersoner
   ──────────────────────────────────────────────────────────────────────── */
function OwnershipSection() {
  const [boardModalOpen, setBoardModalOpen] = React.useState(false);
  const [pepInfoOpen, setPepInfoOpen] = React.useState(false);
  const [ownershipUploaded, setOwnershipUploaded] = React.useState(false);
  const [showCvrAfterUpload, setShowCvrAfterUpload] = React.useState(false);
  const [comment, setComment] = React.useState('');

  const boardMembers = [
    { name: "Anders Nielsen", role: "Formand",        pep: false },
    { name: "Lise Sørensen",  role: "Næstformand",    pep: false },
    { name: "Peter Madsen",   role: "Menigt medlem",  pep: false },
  ];

  const uploadedOwnershipFiles = [
    { name: "ejerbog_2026.pdf",       date: "4. jun 2026" },
    { name: "ejerdiagram_2026.pdf",   date: "4. jun 2026" },
  ];

  return (
    <>
      <FinSection
        title="Ejerskab og finansielle bindinger"
        sub="Ejerstruktur fra CVR. Upload ejerbog eller ejerdiagram for at overskrive."
      >
        {/* Ejerstruktur — CVR eller upload */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)' }}>Ejerstruktur</div>
            <div style={{ fontSize: 11, color: ownershipUploaded ? 'var(--c-success)' : 'var(--c-text-3)' }}>
              · {ownershipUploaded ? 'eget upload' : 'fra CVR'}
            </div>
          </div>
          {ownershipUploaded ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setOwnershipUploaded(false)}
              style={{ color: 'var(--c-text-3)', fontSize: 12 }}
            >
              Gendan CVR-data
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setOwnershipUploaded(true)}
            >
              <I.File size={12} style={{ marginRight: 5 }}/> Upload ejerbog / ejerdiagram
            </button>
          )}
        </div>

        {/* Ejerstruktur — CVR-træ eller uploadede filer */}
        {ownershipUploaded ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {uploadedOwnershipFiles.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                border: '1px solid var(--c-line)', borderRadius: 8, padding: '10px 14px',
                background: 'var(--c-surface)',
              }}>
                <I.File size={14} style={{ color: 'var(--c-primary)', flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--c-ink)' }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>Uploadet {f.date}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SimpleOwnershipTree/>
        )}

        {/* Bestyrelse / koncernforhold — altid vist uden upload, kan genvises med upload */}
        {(!ownershipUploaded || showCvrAfterUpload) && (
          <div className="card" style={{ padding: '4px 18px', marginTop: 14 }}>
            {ownershipUploaded && (
              <div style={{
                padding: '6px 0 4px',
                borderBottom: '1px solid var(--c-line-2)',
                fontSize: 10.5, fontWeight: 500, color: 'var(--c-text-3)',
                letterSpacing: '0.04em',
              }}>
                Fra Virk
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, padding: '10px 0',
            }}>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-2)' }}>Bestyrelse</div>
              <button
                type="button"
                onClick={() => setBoardModalOpen(true)}
                style={{
                  background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 13, color: 'var(--c-primary)', fontWeight: 500,
                }}
              >
                3 medlemmer · ingen PEP
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'var(--c-primary-bg)', border: '1px solid var(--c-primary-border)',
                  fontSize: 10, fontWeight: 700, color: 'var(--c-primary)', flexShrink: 0,
                }}>ⓘ</span>
              </button>
            </div>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 16, padding: '10px 0', borderTop: '1px solid var(--c-line-2)',
            }}>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-2)' }}>Koncernforhold</div>
              <div style={{ fontSize: 13, color: 'var(--c-ink)', fontWeight: 500, textAlign: 'right' }}>Selvstændigt selskab - ingen intercompany-balancer</div>
            </div>
          </div>
        )}

        {/* Vis/skjul CVR-data knap + kommentarfelt — kun efter upload */}
        {ownershipUploaded && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setShowCvrAfterUpload(v => !v)}
              style={{ alignSelf: 'flex-start', color: 'var(--c-text-2)', fontSize: 12 }}
            >
              {showCvrAfterUpload ? 'Skjul Virk-data' : 'Vis Virk-data (bestyrelse og koncernforhold)'}
            </button>
            <div style={{ position: 'relative' }}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Tilføj kommentar om ejerskab…"
                rows={2}
                style={{
                  width: '100%', resize: 'vertical', padding: '8px 10px',
                  border: '1px solid var(--c-line)', borderRadius: 7,
                  fontSize: 12.5, background: 'var(--c-surface)', color: 'var(--c-ink)',
                  outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}
      </FinSection>

      {/* Bestyrelse modal */}
      <FinModal
        open={boardModalOpen}
        onClose={() => setBoardModalOpen(false)}
        title="Bestyrelse — PEP-tjek"
        width={520}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <StatusTag kind="success">Ingen PEP-match</StatusTag>
            <button
              type="button"
              onClick={() => setPepInfoOpen(true)}
              style={{
                background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: 'var(--c-primary)',
              }}
            >
              Hvad er PEP? <span style={{ fontSize: 14 }}>ⓘ</span>
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text-3)' }}>
            Automatisk opslag i PEP-register pr. 23. maj 2026
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {boardMembers.map((m, i) => (
            <div key={i} style={{
              padding: '12px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--c-line-2)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
                display: 'grid', placeItems: 'center', color: 'var(--c-text-2)',
                flexShrink: 0, fontSize: 11, fontWeight: 700,
              }}>
                {m.name.split(' ').map(n => n[0]).join('')}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 1 }}>{m.role}</div>
              </div>
              <StatusTag kind="success">Ingen PEP-match</StatusTag>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 16, padding: '10px 12px',
          background: 'var(--c-surface-2)', borderRadius: 6,
          fontSize: 11.5, color: 'var(--c-text-3)', lineHeight: 1.5,
        }}>
          Opslag udført automatisk mod EU's konsoliderede sanktionsliste samt nationale PEP-registre. Seneste kontrol: 23. maj 2026.
        </div>
      </FinModal>

      {/* PEP info modal */}
      <FinModal
        open={pepInfoOpen}
        onClose={() => setPepInfoOpen(false)}
        title="Hvad er PEP?"
        width={440}
      >
        <div style={{ fontSize: 13.5, color: 'var(--c-ink)', fontWeight: 600, marginBottom: 8 }}>
          Politisk Eksponeret Person (PEP)
        </div>
        <div style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.7 }}>
          En PEP er en person, der beklæder eller har beklædt en fremtrædende offentlig stilling —
          fx statsledere, ministre, parlamentsmedlemmer, højtstående embedsmænd eller ledende
          personer i internationale organisationer.
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.7 }}>
          PEP-kontrol er lovpligtig under hvidvasklovens §§ 14–18 og kræver skærpet kundekendskab
          (Enhanced Due Diligence) ved konstatering af PEP-status. Crediwire foretager automatisk
          opslag og gemmer tidsstemplet kontrol-log.
        </div>
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--c-surface-2)', borderRadius: 6, fontSize: 12, color: 'var(--c-text-3)' }}>
          Kilde: Lov om forebyggende foranstaltninger mod hvidvask og finansiering af terrorisme (hvidvaskloven), jf. Europa-Parlamentets direktiv (EU) 2015/849.
        </div>
      </FinModal>
    </>
  );
}

function FinRow({ label, data }) {
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{label}</td>
      {data.map((v, i) => (
        <td key={i} className="mono num" style={{ textAlign: 'right', color: v === null ? 'var(--c-text-4)' : 'var(--c-ink)' }}>
          {v === null ? '-' : v.toFixed(1)}
        </td>
      ))}
    </tr>
  );
}

function MiniSpark({ data }) {
  const w = 80, h = 18;
  const max = Math.max(...data) * 1.05, min = Math.min(...data) * 0.95;
  const pts = data.map((v, i) => `${(i / (data.length-1)) * w},${h - ((v - min) / (max - min)) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke="var(--c-ink)" strokeWidth="1.3" opacity="0.6"/>
    </svg>
  );
}

function IncomeChart({ years, revenue, ebitda, labels }) {
  const w = 580, h = 240;
  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const rev = revenue || DATA.FINANCIALS.equity.slice(0, 3);
  const ebd = ebitda || DATA.FINANCIALS.debt.slice(0, 3);
  years = years || DATA.FINANCIALS.years.slice(0, 3);
  const labelA = (labels && labels.a) || 'Egenkapital';
  const labelB = (labels && labels.b) || 'Gæld';
  const max = Math.max(...rev, ...ebd) * 1.1;
  const cw = (w - pad.l - pad.r) / years.length;
  const x = (i) => pad.l + i * cw + cw / 2;
  const y = (v) => h - pad.b - (v / max) * (h - pad.t - pad.b);
  const revPath = rev.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const ebdPath = ebd.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const revArea = revPath + ` L ${x(rev.length-1)} ${h-pad.b} L ${x(0)} ${h-pad.b} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {[0, max * 0.25, max * 0.5, max * 0.75, max].map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w-pad.r} y1={y(v)} y2={y(v)} stroke="var(--c-line-2)" strokeWidth="1"/>
          <text x={pad.l - 6} y={y(v) + 3} fill="var(--c-text-3)" fontSize="9" textAnchor="end" fontFamily="var(--mono)">{v.toFixed(0)}</text>
        </g>
      ))}
      <path d={revArea} fill="var(--c-ink)" opacity="0.05"/>
      <path d={revPath} fill="none" stroke="var(--c-ink)" strokeWidth="1.8"/>
      <path d={ebdPath} fill="none" stroke="var(--c-success)" strokeWidth="1.5" strokeDasharray="3 3"/>
      {rev.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#fff" stroke="var(--c-ink)" strokeWidth="1.5"/>)}
      {ebd.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2" fill="var(--c-success)"/>)}
      {years.map((yr, i) => <text key={yr} x={x(i)} y={h - pad.b + 14} fill="var(--c-text-3)" fontSize="10" textAnchor="middle">{yr}</text>)}
      <g transform={`translate(${w-220}, 4)`}>
        <rect x="0" y="0" width="10" height="10" fill="var(--c-ink)"/><text x="14" y="9" fill="var(--c-text-2)" fontSize="10">{labelA}</text>
        <line x1={14 + 70} x2={14 + 84} y1="5" y2="5" stroke="var(--c-success)" strokeDasharray="3 3" strokeWidth="1.5"/><text x={14 + 88} y="9" fill="var(--c-text-2)" fontSize="10">{labelB}</text>
      </g>
    </svg>
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
const FIN_ACTUAL_Q = [
  { label: 'Q1', year: '2026' },
  { label: 'Q2', year: '2026' },
  { label: 'Q3', year: '2026' },
];
const FIN_BUDGET_Q = [
  { label: 'Q4', year: '2026', key: '2026-Q4' },
  { label: 'Q1', year: '2027', key: '2027-Q1' },
  { label: 'Q2', year: '2027', key: '2027-Q2' },
  { label: 'Q3', year: '2027', key: '2027-Q3' },
];

const ANNUAL_REPORT = {
  years: FIN_ANNUAL_YEARS,
  groups: [
    {
      label: 'Resultat',
      rows: [
        { label: 'Nettoomsætning',                  values: [28.0, 32.8, 41.1],    q: [10.60, 11.10, 11.20], bq: [11.50, 11.40, 12.00, 12.10] },
        { label: 'Vareforbrug',                     values: [-15.2, -17.6, -22.6], q: [-5.80, -6.08, -6.13], bq: [-6.29, -6.20, -6.50, -6.58] },
        { label: 'Bruttofortjeneste',               values: [12.8, 15.2, 18.5],    q: [4.80, 5.02, 5.07],    bq: [5.21, 5.20, 5.50, 5.52],    computed: true },
        { label: 'Personaleomkostninger',           values: [-9.5, -11.0, -13.5],  q: [-3.58, -3.62, -3.66], bq: [-3.74, -3.78, -3.82, -3.88] },
        { label: 'Andre eksterne omkostninger',     values: [-2.0, -2.3, -2.6],    q: [-0.68, -0.70, -0.70], bq: [-0.72, -0.72, -0.73, -0.74] },
        { label: 'EBITDA',                          values: [1.3, 1.9, 2.4],       q: [0.54, 0.70, 0.71],    bq: [0.75, 0.70, 0.95, 0.90],    computed: true },
        { label: 'Afskrivninger',                   values: [-0.7, -0.8, -1.0],    q: [-0.27, -0.27, -0.28], bq: [-0.28, -0.29, -0.29, -0.30] },
        { label: 'Resultat før finansielle poster', values: [0.6, 1.1, 1.4],       q: [0.27, 0.43, 0.43],    bq: [0.47, 0.41, 0.66, 0.60],    computed: true },
        { label: 'Finansielle omkostninger',        values: [-0.3, -0.4, -0.4],    q: [-0.11, -0.11, -0.12], bq: [-0.11, -0.11, -0.12, -0.12] },
        { label: 'Årets resultat',                  values: [0.3, 0.7, 1.0],       q: [0.16, 0.32, 0.31],    bq: [0.36, 0.30, 0.54, 0.48],    computed: true },
      ],
    },
    {
      label: 'Balance',
      rows: [
        { label: 'Anlægsaktiver',        values: [4.2, 4.8, 6.0],   q: [6.10, 6.20, 6.30],    bq: [6.40, 6.50, 6.60, 6.70],     stock: true },
        { label: 'Omsætningsaktiver',    values: [5.2, 6.4, 8.0],   q: [8.26, 8.58, 8.79],    bq: [9.15, 9.25, 9.64, 9.97],     stock: true },
        { label: 'Likvide beholdninger', values: [1.0, 1.4, 1.9],   q: [2.00, 2.15, 2.25],    bq: [2.40, 2.55, 2.75, 2.95],     stock: true },
        { label: 'Aktiver i alt',        values: [9.4, 11.2, 14.0], q: [14.36, 14.78, 15.09], bq: [15.55, 15.75, 16.24, 16.67], stock: true, computed: true },
        { label: 'Egenkapital',          values: [3.5, 4.8, 6.2],   q: [6.36, 6.68, 6.99],    bq: [7.35, 7.65, 8.19, 8.67],     stock: true },
        { label: 'Langfristet gæld',     values: [3.5, 3.8, 4.6],   q: [4.50, 4.50, 4.40],    bq: [4.40, 4.30, 4.20, 4.10],     stock: true },
        { label: 'Kortfristet gæld',     values: [2.4, 2.6, 3.2],   q: [3.50, 3.60, 3.70],    bq: [3.80, 3.80, 3.85, 3.90],     stock: true },
        { label: 'Gæld i alt',           values: [5.9, 6.4, 7.8],   q: [8.00, 8.10, 8.10],    bq: [8.20, 8.10, 8.05, 8.00],     stock: true, computed: true, finding: true },
      ],
    },
  ],
};

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

function ratio(a, b, factor) {
  if (a == null || b == null || !b) return null;
  return (a / b) * (factor || 1);
}

function formatNum(v, opts) {
  if (v == null) return 'Ikke oplyst';
  const decimals = opts && opts.decimals != null ? opts.decimals : 1;
  const negative = v < 0;
  const abs = Math.abs(v);
  let s = abs.toLocaleString('da-DK', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return negative ? `−${s}` : s;
}

function aggregateBudgetByQuarter() {
  // Læs kvartalsbudgettet fra localStorage, normaliseret til DKK mio.
  // Returnerer { '2026-Q4': { rowLabel: number, ... }, ... }
  const saved = loadBudget();
  const quarters = saved && saved.values && saved.values.quarter;
  if (!quarters) return {};
  const unitFactor = saved.unit === 'kr' ? 0.000001 : saved.unit === 'thousand' ? 0.001 : 1;

  const out = {};
  Object.entries(quarters).forEach(([rowLabel, periodMap]) => {
    Object.entries(periodMap).forEach(([key, raw]) => {
      if (raw === '' || raw == null) return;
      const num = parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
      if (isNaN(num)) return;
      if (!out[key]) out[key] = {};
      out[key][rowLabel] = num * unitFactor;
    });
  });

  // Udled de beregnede rækker, men kun når mindst ét af deres input findes.
  // Ellers ville en tom række blive til 0 og overskrive demo-tallet i tabellen.
  Object.keys(out).forEach(key => {
    Object.keys(BUDGET_FORMULAS).forEach(label => {
      const inputs = BUDGET_FORMULA_INPUTS[label] || [];
      if (!inputs.some(i => out[key][i] != null)) return;
      const v = BUDGET_FORMULAS[label](out[key]);
      if (!isNaN(v)) out[key][label] = v;
    });
  });
  return out;
}

function AnnualReportSection({ go }) {
  const [unit, setUnit] = React.useState('thousand'); // 'mio' | 'thousand'
  const scale = unit === 'mio' ? 1 : 1000;
  // Kvartalerne er detaljen bag 2026E og 2027B og er foldet sammen som udgangspunkt.
  const [showQuarters, setShowQuarters] = React.useState(false);

  // Re-render når budget opdateres (custom event fra BudgetSection + storage event på tværs af faner)
  const [budgetTick, setBudgetTick] = React.useState(0);
  React.useEffect(() => {
    const bump = () => setBudgetTick(t => t + 1);
    const onStorage = (e) => { if (e.key === FIN_BUDGET_STORAGE) bump(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('budget-updated', bump);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('budget-updated', bump); };
  }, []);

  // Budgetbåndet viser demo-tal, men overskrives af det brugeren selv har
  // tastet i budgetsektionen nedenfor, kvartal for kvartal.
  const budgetQ = React.useMemo(() => aggregateBudgetByQuarter(), [budgetTick]);

  const requestFromCustomer = () => {
    try {
      localStorage.setItem('kabul:case-stage:nordhavn', 'material-selection');
      sessionStorage.setItem('kabul:focus-material', '1');
    } catch (e) {}
    if (go) go("workspace:1");
  };

  // Én budgetcelle: brugerens eget tal hvis det findes, ellers demo-tallet.
  const budgetCell = (row, i) => {
    const live = budgetQ[FIN_BUDGET_Q[i].key] ? budgetQ[FIN_BUDGET_Q[i].key][row.label] : null;
    if (live != null && !isNaN(live)) return { v: live, live: true };
    const v = row.bq ? row.bq[i] : null;
    return { v: v == null ? null : v, live: false };
  };

  // Kolonnerne i visningsrækkefølge. Årskolonnerne står altid først og flytter
  // sig ikke når kvartalerne foldes ud, så trendrækken bliver liggende.
  // 2026E og 2027B er ikke indberettede tal, men udledninger:
  //   2026E = Q1-Q3 realiseret + Q4 budget   (balance: ultimo Q4 2026)
  //   2027B = Q1-Q3 budget, altså 9 måneder  (balance: ultimo Q3 2027)
  const cols = React.useMemo(() => {
    const list = [
      ...FIN_ANNUAL_YEARS.map((y, i) => ({ key: 'y' + i, kind: 'annual', idx: i, ann: 1 })),
      { key: 'est', kind: 'est', ann: 1 },
      { key: 'b9', kind: 'b9', ann: 4 / 3 },
    ];
    if (showQuarters) {
      list.push(...FIN_ACTUAL_Q.map((p, i) => ({ key: 'q' + i, kind: 'q', idx: i, ann: 4, sep: i === 0 })));
      list.push(...FIN_BUDGET_Q.map((p, i) => ({ key: 'b' + i, kind: 'b', idx: i, ann: 4, sep: i === 0 })));
    }
    return list;
  }, [showQuarters]);

  const rawValue = (row, col) => {
    if (col.kind === 'annual') return row.values ? row.values[col.idx] : null;
    if (col.kind === 'q') return row.q ? row.q[col.idx] : null;
    if (col.kind === 'b') return budgetCell(row, col.idx).v;
    if (col.kind === 'b9') {
      if (row.stock) return budgetCell(row, FIN_BUDGET_Q.length - 1).v;
      const parts = [1, 2, 3].map(i => budgetCell(row, i).v);
      if (parts.some(p => p == null)) return null;
      return parts.reduce((a, b) => a + b, 0);
    }
    // 2026E
    if (row.stock) return budgetCell(row, 0).v;
    const parts = [row.q ? row.q[0] : null, row.q ? row.q[1] : null, row.q ? row.q[2] : null, budgetCell(row, 0).v];
    if (parts.some(p => p == null)) return null;
    return parts.reduce((a, b) => a + b, 0);
  };

  // Rå poster pr. kolonne - grundlaget nøgletallene regnes af.
  const rawRows = React.useMemo(() => ANNUAL_REPORT.groups.flatMap(g => g.rows), []);
  const colMaps = React.useMemo(() => cols.map(col => {
    const m = {};
    rawRows.forEach(r => { m[r.label] = rawValue(r, col); });
    return m;
  }), [cols, rawRows, budgetQ]);

  // Formatér én værdi efter rækkens type. Procent og forholdstal skaleres ikke.
  const fmt = (v, r) => {
    if (v == null || isNaN(v)) return null;
    if (r.percent) return formatNum(v, { decimals: 1 }) + '%';
    if (r.decimals != null) return formatNum(v, { decimals: r.decimals });
    return formatNum(v * scale, { decimals: 1 });
  };

  const colCount = 1 + cols.length;

  const numCell = (col, ci, display, extra) => (
    <td
      key={col.key}
      title={(extra && extra.title) || ''}
      className={(col.sep ? 'fin-sep' : '') + (col.kind === 'est' || col.kind === 'b9' ? ' fin-est' : '') + (display ? ' mono num' : '')}
      style={{
        color: display ? 'var(--c-ink)' : 'var(--c-text-4)',
        fontWeight: extra && extra.bold ? 500 : undefined,
      }}
    >
      {display || '–'}
    </td>
  );

  return (
    <FinSection
      title="Regnskab"
      sub="Officielle årsrapporter fra CVR sammenstillet med virksomhedens egne tal for indeværende år og budgettet frem. 2026E og 2027B er ikke indberettede tal, men sammentællinger af kvartalerne, så årene kan sammenlignes direkte. Fold kvartalerne ud for at se, hvad de består af."
      badge={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowQuarters(v => !v)}
            aria-expanded={showQuarters}
            title={showQuarters ? 'Skjul kvartalerne bag 2026E og 2027B' : 'Vis kvartalerne bag 2026E og 2027B'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 30, padding: '0 11px',
              border: '1px solid var(--c-line)', borderRadius: 7,
              background: showQuarters ? 'var(--c-surface-2)' : '#fff',
              color: 'var(--c-text-2)', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              display: 'inline-block', fontSize: 9, lineHeight: 1,
              transform: showQuarters ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.15s',
            }}>▶</span>
            {showQuarters ? 'Skjul kvartaler' : 'Vis kvartaler'}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={requestFromCustomer}>
            Anmod om årsrapport 2026
          </button>
        </div>
      }
    >
      {/* Sammenfoldet er tabellen seks kolonner og holder sig inden for siden.
          Foldes kvartalerne ud, bliver den til 13 kolonner og bryder ud i fuld
          bredde af indholdsområdet. Er der stadig ikke plads, scroller den
          vandret med rækkenavnene klæbet fast i venstre side. */}
      <div style={showQuarters ? {
        position: 'relative', left: '50%', transform: 'translateX(-50%)',
        width: 'min(1280px, calc(100vw - 290px))', minWidth: '100%',
      } : undefined}>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="fin-wrap">
          <table className="fin-tbl">
            <thead>
              <tr>
                <th className="fin-c1" rowSpan={2} style={{ verticalAlign: 'bottom', width: showQuarters ? undefined : 330 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--c-text-3)' }}>
                      Regnskabspost
                    </span>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', padding: 2,
                      background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', borderRadius: 7,
                    }}>
                      {[
                        { k: 'mio',      l: 'DKK mio.' },
                        { k: 'thousand', l: 'DKK t.' },
                      ].map(u => {
                        const active = unit === u.k;
                        return (
                          <button
                            key={u.k}
                            onClick={() => setUnit(u.k)}
                            aria-pressed={active}
                            style={{
                              height: 22, padding: '0 10px', border: 0,
                              background: active ? '#fff' : 'transparent',
                              color: active ? 'var(--c-ink)' : 'var(--c-text-2)',
                              fontSize: 11.5, fontWeight: 500, fontFamily: 'inherit',
                              borderRadius: 5, cursor: 'pointer',
                              boxShadow: active ? '0 1px 2px rgba(15,17,20,0.06)' : 'none',
                            }}
                          >
                            {u.l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </th>
                <th className="fin-band" colSpan={FIN_ANNUAL_YEARS.length + 2}>
                  <span className="fin-band-dot" style={{ background: 'var(--c-text-4)' }}/>Regnskabsår
                </th>
                {showQuarters && (
                  <th className="fin-band fin-sep" colSpan={FIN_ACTUAL_Q.length}>
                    <span className="fin-band-dot" style={{ background: 'var(--c-primary)' }}/>Realiseret kvartal · 2026
                  </th>
                )}
                {showQuarters && (
                  <th className="fin-band fin-sep" colSpan={FIN_BUDGET_Q.length}>
                    <span className="fin-band-dot" style={{ background: 'var(--c-warn)' }}/>Budget · Q4 2026 og 2027
                  </th>
                )}
              </tr>
              <tr>
                {FIN_ANNUAL_YEARS.map(y => <th key={y} className="fin-hd">{y}</th>)}
                <th className="fin-hd fin-est" style={{ minWidth: 88 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--c-text-4)' }}>Estimat</span>
                    <span>2026E</span>
                  </span>
                </th>
                <th className="fin-hd fin-est" style={{ minWidth: 88 }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--c-text-4)' }}>Budget 9 mdr.</span>
                    <span>2027B</span>
                  </span>
                </th>
                {showQuarters && FIN_ACTUAL_Q.map((p, i) => (
                  <th key={'a' + p.label} className={"fin-hd" + (i === 0 ? " fin-sep" : "")} style={{ minWidth: 82 }}>
                    {p.label}
                  </th>
                ))}
                {showQuarters && FIN_BUDGET_Q.map((p, i) => (
                  <th key={'b' + p.key} className={"fin-hd" + (i === 0 ? " fin-sep" : "")} style={{ minWidth: 82 }}>
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--c-text-4)' }}>{p.year}</span>
                      <span>{p.label}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ANNUAL_REPORT.groups.map((g) => (
                <React.Fragment key={g.label}>
                  <tr className="fin-grp">
                    <td className="fin-c1">{g.label}</td>
                    <td colSpan={colCount - 1}/>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.label} className={r.computed ? "fin-sum" : ""}>
                      <td className="fin-c1">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {r.finding && (
                            <span
                              title="Finding tilknyttet - se Credit memo"
                              aria-label="Finding tilknyttet"
                              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-warn)', flexShrink: 0 }}
                            />
                          )}
                          <span>{r.label}</span>
                        </span>
                      </td>
                      {cols.map((col, ci) => {
                        const live = col.kind === 'b' && budgetCell(r, col.idx).live;
                        return numCell(col, ci, fmt(rawValue(r, col), r), {
                          bold: live,
                          title: live ? 'Fra dit budget nedenfor' : '',
                        });
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {/* Nøgletal - beregnet af kolonnens egne tal, ikke indtastet */}
              <tr className="fin-grp">
                <td className="fin-c1">Nøgletal</td>
                <td colSpan={colCount - 1}/>
              </tr>
              {FIN_RATIOS.map(r => (
                <tr key={r.label}>
                  <td className="fin-c1" title={r.note || ''}>{r.label}</td>
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
          fontSize: 11, color: 'var(--c-text-3)', flexWrap: 'wrap', gap: 8,
        }}>
          <span>Kilder: Årsrapport 2023 · Årsrapport 2024 · Årsrapport 2025 · Kvartalstal og budget fra kunden · CVR</span>
          <a
            href="https://www.vestas.com/content/dam/vestas-com/global/en/investor/reports-and-presentations/financial/2025/fy-2025/Vestas%20Annual%20Report%202025.pdf.coredownload.inline.pdf"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
              color: 'var(--c-primary)', fontSize: 11.5, fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Åbn årsrapport
          </a>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--c-text-3)', lineHeight: 1.5 }}>
        2026E: Q1-Q3 realiseret plus Q4 budget, balanceposter ultimo Q4 2026.
        2027B: budget for Q1-Q3, altså kun 9 måneder, balanceposter ultimo Q3 2027.
        Nøgletal er beregnet af tallene i samme kolonne; hvor perioden er kortere end et år, er EBITDA annualiseret i Gæld / EBITDA.
        Realiserede kvartalstal og budget er virksomhedens egne indberetninger og er ikke revideret.
      </div>
      </div>
    </FinSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Budget - editérbart, måned/kvartal/år, max 12 måneder frem
   ──────────────────────────────────────────────────────────────────────── */
const FIN_BUDGET_STORAGE = 'kabul:fin-budget:nordhavn';
const BUDGET_TODAY = new Date(2026, 5, 1); // jun 2026 (prototype anchor)
const MONTHS_DA = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
const MONTHS_DA_LONG = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];

function loadBudget() {
  try {
    const raw = localStorage.getItem(FIN_BUDGET_STORAGE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function generateBudgetPeriods(gran) {
  // Max 12 måneder ud i fremtiden fra BUDGET_TODAY
  const today = BUDGET_TODAY;
  const horizon = new Date(today.getFullYear(), today.getMonth() + 12, 1);
  const periods = [];
  if (gran === 'month') {
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
      const label = `${MONTHS_DA[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      periods.push({ key, label });
    }
  } else if (gran === 'quarter') {
    const startQ = Math.floor(today.getMonth() / 3);
    for (let i = 0; i < 8; i++) {
      const totalQ = startQ + i;
      const yOffset = Math.floor(totalQ / 4);
      const q = ((totalQ % 4) + 4) % 4;
      const y = today.getFullYear() + yOffset;
      const startMonth = q * 3;
      const periodStart = new Date(y, startMonth, 1);
      if (periodStart > horizon) break;
      periods.push({ key: `${y}-Q${q + 1}`, label: `Q${q + 1} ${y}` });
    }
  } else { // year
    for (let i = 0; i < 3; i++) {
      const y = today.getFullYear() + i;
      const periodStart = new Date(y, 0, 1);
      if (periodStart > horizon && i > 0) break;
      periods.push({ key: `${y}`, label: `${y}` });
    }
  }
  return periods;
}

const BUDGET_GROUPS = ANNUAL_REPORT.groups.filter(g => g.label !== 'Nøgletal');

// Beregnings-formler for computed rækker. Tager et map { rowLabel: number } og returnerer tal.
const BUDGET_FORMULAS = {
  'Bruttofortjeneste': (ctx) => (ctx['Nettoomsætning'] || 0) + (ctx['Vareforbrug'] || 0),
  'EBITDA': (ctx) => (ctx['Bruttofortjeneste'] || 0) + (ctx['Personaleomkostninger'] || 0) + (ctx['Andre eksterne omkostninger'] || 0),
  'Resultat før finansielle poster': (ctx) => (ctx['EBITDA'] || 0) + (ctx['Afskrivninger'] || 0),
  'Årets resultat': (ctx) => (ctx['Resultat før finansielle poster'] || 0) + (ctx['Finansielle indtægter'] || 0) + (ctx['Finansielle omkostninger'] || 0),
  'Aktiver i alt': (ctx) => (ctx['Anlægsaktiver'] || 0) + (ctx['Omsætningsaktiver'] || 0),
  'Gæld i alt': (ctx) => (ctx['Langfristet gæld'] || 0) + (ctx['Kortfristet gæld'] || 0),
};

// Hvilke rækker hver formel læser fra. Bruges til at afgøre om en beregnet
// række overhovedet har input nok til at blive udledt.
const BUDGET_FORMULA_INPUTS = {
  'Bruttofortjeneste': ['Nettoomsætning', 'Vareforbrug'],
  'EBITDA': ['Bruttofortjeneste', 'Personaleomkostninger', 'Andre eksterne omkostninger'],
  'Resultat før finansielle poster': ['EBITDA', 'Afskrivninger'],
  'Årets resultat': ['Resultat før finansielle poster', 'Finansielle indtægter', 'Finansielle omkostninger'],
  'Aktiver i alt': ['Anlægsaktiver', 'Omsætningsaktiver'],
  'Gæld i alt': ['Langfristet gæld', 'Kortfristet gæld'],
};

function formatThousand(s) {
  if (s === '' || s == null) return '';
  let str = String(s);
  let neg = '';
  if (str.startsWith('-')) { neg = '-'; str = str.slice(1); }
  const parts = str.split(',');
  const intPart = (parts[0] || '').replace(/\./g, '');
  const decPart = parts[1];
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return neg + formattedInt + (decPart !== undefined ? ',' + decPart : '');
}

const BudgetInput = React.memo(function BudgetInput({ cell, onChange }) {
  const [focused, setFocused] = React.useState(false);
  const display = focused ? cell : formatThousand(cell);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      placeholder="–"
      className="mono num"
      style={{
        width: '100%', minWidth: 70, textAlign: 'right',
        border: '1px solid ' + (focused ? 'var(--c-primary)' : 'transparent'),
        borderRadius: 4, padding: '5px 7px', fontSize: 12.5, color: 'var(--c-ink)',
        background: focused ? '#fff' : (cell !== '' ? 'var(--c-primary-bg)' : 'transparent'),
        outline: 'none',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        let v = e.target.value;
        v = v.replace(/\./g, '').replace(/\s/g, '');
        v = v.replace(/[^0-9,\-]/g, '');
        v = v.replace(/(?!^)-/g, '');
        const firstComma = v.indexOf(',');
        if (firstComma !== -1) {
          v = v.slice(0, firstComma + 1) + v.slice(firstComma + 1).replace(/,/g, '');
        }
        onChange(v);
      }}
      onKeyDown={(e) => {
        const allowed = ['Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
        if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
        if (!/^[0-9,.\-]$/.test(e.key)) e.preventDefault();
      }}
    />
  );
});

const BudgetRow = React.memo(function BudgetRow({ row, periods, rowValues, computedRowValues, onChangeCell, onRecycle, canRecycle, onClearRow }) {
  const isComputed = !!row.computed;
  const hasAnyValue = !isComputed && rowValues && Object.values(rowValues).some(v => v !== '' && v != null);
  return (
    <tr>
      <td style={{
        padding: '6px 14px',
        borderTop: '1px solid var(--c-line-2)',
        color: isComputed ? 'var(--c-text-2)' : 'var(--c-ink)',
        fontWeight: isComputed ? 500 : 400,
        position: 'sticky', left: 0, background: isComputed ? 'var(--c-surface)' : '#fff', zIndex: 1,
      }}>
        {row.label}
        {isComputed && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--c-text-3)', fontWeight: 500 }}>(Beregning)</span>}
      </td>
      {periods.map(p => {
        if (isComputed) {
          const cv = computedRowValues?.[p.key];
          const has = cv != null && !isNaN(cv);
          let display = '';
          if (has) {
            const rounded = Math.round(cv * 100) / 100;
            const str = String(rounded).replace('.', ',');
            display = formatThousand(str);
          }
          return (
            <td key={p.key} style={{
              borderTop: '1px solid var(--c-line-2)',
              padding: '4px 6px',
              textAlign: 'right',
              background: 'var(--c-surface)',
            }}>
              <div className="mono num" style={{
                padding: '5px 7px', fontSize: 12.5,
                color: has ? 'var(--c-text-2)' : 'var(--c-text-4)',
                fontWeight: has ? 500 : 400,
                textAlign: 'right',
              }}>
                {display || '–'}
              </div>
            </td>
          );
        }
        const cell = rowValues?.[p.key] ?? '';
        return (
          <td key={p.key} style={{
            borderTop: '1px solid var(--c-line-2)',
            padding: '4px 6px',
            textAlign: 'right',
          }}>
            <BudgetInput
              cell={cell}
              onChange={(v) => onChangeCell(row.label, p.key, v)}
            />
          </td>
        );
      })}
      <td style={{
        borderTop: '1px solid var(--c-line-2)',
        padding: '4px 8px',
        textAlign: 'center',
        width: 64,
        background: isComputed ? 'var(--c-surface)' : '#fff',
        whiteSpace: 'nowrap',
      }}>
        {!isComputed && canRecycle && (
          <button
            type="button"
            onClick={() => onRecycle(row.label)}
            title="Genbrug sidste års tal"
            style={{
              background: 'transparent', border: '1px solid transparent', borderRadius: 4,
              padding: 4, cursor: 'pointer', color: 'var(--c-text-3)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.12s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--c-primary)'; e.currentTarget.style.background = 'var(--c-primary-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--c-text-3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <I.Refresh size={13}/>
          </button>
        )}
        {hasAnyValue && (
          <button
            type="button"
            onClick={() => onClearRow(row.label)}
            title="Slet rækkens værdier"
            style={{
              background: 'transparent', border: '1px solid transparent', borderRadius: 4,
              padding: 4, cursor: 'pointer', color: 'var(--c-text-3)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.12s ease', marginLeft: 2,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--c-warn)'; e.currentTarget.style.background = 'var(--c-warn-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--c-text-3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <I.X size={13}/>
          </button>
        )}
      </td>
    </tr>
  );
});

function getLastAnnualValue(rowLabel) {
  // Find row in ANNUAL_REPORT; returns { value, year, groupLabel } in DKK mio., eller null
  for (const g of ANNUAL_REPORT.groups) {
    const r = g.rows.find(x => x.label === rowLabel);
    if (!r) continue;
    for (let i = r.values.length - 1; i >= 0; i--) {
      const v = r.values[i];
      if (v != null) return { value: v, year: ANNUAL_REPORT.years[i], groupLabel: g.label };
    }
    return null;
  }
  return null;
}

function BudgetSection() {
  const saved = loadBudget();
  const [open, setOpen] = React.useState(false);
  const [gran, setGran] = React.useState(saved?.gran || 'month');
  const [unit, setUnit] = React.useState(saved?.unit || 'mio');
  const [values, setValues] = React.useState(saved?.values || { month: {}, quarter: {}, year: {} });
  const [savedAt, setSavedAt] = React.useState(saved?.savedAt || null);

  const periods = React.useMemo(() => generateBudgetPeriods(gran), [gran]);

  const filledCount = React.useMemo(() => {
    const bucket = values[gran] || {};
    let n = 0;
    Object.values(bucket).forEach(rowMap => {
      Object.values(rowMap || {}).forEach(v => { if (v !== '' && v != null) n += 1; });
    });
    return n;
  }, [values, gran]);

  // Stabil onChange callback (kun gran ændrer den) - så React.memo virker per række
  const granRef = React.useRef(gran);
  React.useEffect(() => { granRef.current = gran; }, [gran]);
  const onChangeCell = React.useCallback((rowLabel, periodKey, raw) => {
    setValues(prev => {
      const g = granRef.current;
      const next = { ...prev };
      const bucket = { ...(next[g] || {}) };
      const rowMap = { ...(bucket[rowLabel] || {}) };
      rowMap[periodKey] = raw;
      bucket[rowLabel] = rowMap;
      next[g] = bucket;
      return next;
    });
  }, []);

  const handleClearRow = React.useCallback((rowLabel) => {
    setValues(prev => {
      const g = granRef.current;
      const next = { ...prev };
      const bucket = { ...(next[g] || {}) };
      delete bucket[rowLabel];
      next[g] = bucket;
      return next;
    });
  }, []);

  const handleRecycleRow = React.useCallback((rowLabel) => {
    const last = getLastAnnualValue(rowLabel);
    if (!last) return;
    // Konvertér fra mio til budget-enhed
    const unitFactor = unit === 'mio' ? 1 : unit === 'thousand' ? 1000 : 1000000;
    const converted = last.value * unitFactor;
    const isBalance = last.groupLabel === 'Balance';
    const g = granRef.current;
    const periodsNow = generateBudgetPeriods(g);
    // P&L distribueres: år=fuld pr. år, kvartal=÷4, måned=÷12. Balance kopieres.
    const divisor = isBalance ? 1 : (g === 'year' ? 1 : g === 'quarter' ? 4 : 12);
    const perPeriod = converted / divisor;
    // Format som streng med komma decimal (afrund til 2 decimaler, drop trailing .00)
    const rounded = Math.round(perPeriod * 100) / 100;
    const str = (Number.isInteger(rounded) ? String(rounded) : String(rounded)).replace('.', ',');
    setValues(prev => {
      const next = { ...prev };
      const bucket = { ...(next[g] || {}) };
      const rowMap = {};
      periodsNow.forEach(p => { rowMap[p.key] = str; });
      bucket[rowLabel] = rowMap;
      next[g] = bucket;
      return next;
    });
  }, [unit]);

  // Auto-save (debounced) - skriver til localStorage og notifikerer Regnskab
  const saveTimer = React.useRef(null);
  React.useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const ts = new Date().toISOString();
      try {
        localStorage.setItem(FIN_BUDGET_STORAGE, JSON.stringify({ gran, unit, values, savedAt: ts }));
        setSavedAt(ts);
        window.dispatchEvent(new CustomEvent('budget-updated'));
      } catch (e) {}
    }, 300);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [values, gran, unit]);

  const [clearConfirmOpen, setClearConfirmOpen] = React.useState(false);
  const clearBtnRef = React.useRef(null);
  const handleClearAll = () => {
    setValues({ month: {}, quarter: {}, year: {} });
    setClearConfirmOpen(false);
  };

  // Luk popover ved klik udenfor
  React.useEffect(() => {
    if (!clearConfirmOpen) return;
    const onDown = (e) => {
      if (clearBtnRef.current && !clearBtnRef.current.contains(e.target)) setClearConfirmOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    const onEsc = (e) => { if (e.key === 'Escape') setClearConfirmOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onEsc); };
  }, [clearConfirmOpen]);

  // Beregn computed-rækker for hver periode
  const computedValues = React.useMemo(() => {
    const bucket = values[gran] || {};
    const result = {};
    BUDGET_GROUPS.forEach(g => g.rows.forEach(r => {
      if (r.computed && BUDGET_FORMULAS[r.label]) result[r.label] = {};
    }));
    periods.forEach(p => {
      const ctx = {};
      // Læs rå-celler først
      BUDGET_GROUPS.forEach(g => g.rows.forEach(r => {
        if (r.computed) return;
        const raw = bucket[r.label]?.[p.key];
        if (raw == null || raw === '') return;
        const num = parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
        if (!isNaN(num)) ctx[r.label] = num;
      }));
      // Anvend formler top-til-bund, så afhængigheder fyldes ind
      BUDGET_GROUPS.forEach(g => g.rows.forEach(r => {
        if (!r.computed || !BUDGET_FORMULAS[r.label]) return;
        const v = BUDGET_FORMULAS[r.label](ctx);
        ctx[r.label] = v;
        result[r.label][p.key] = v;
      }));
    });
    return result;
  }, [values, gran, periods]);

  const fileInputRef = React.useRef(null);
  const [importMsg, setImportMsg] = React.useState(null);

  const handleExport = () => {
    if (!window.XLSX) { alert('Excel-bibliotek ikke indlæst. Prøv at genindlæse siden.'); return; }
    const XLSX = window.XLSX;
    const bucket = values[gran] || {};
    const granLabel = gran === 'month' ? 'måned' : gran === 'quarter' ? 'kvartal' : 'år';
    const granLabelCap = gran === 'month' ? 'Måned' : gran === 'quarter' ? 'Kvartal' : 'År';
    const unitLabel = unit === 'mio' ? 'DKK mio.' : unit === 'thousand' ? 'DKK tusind' : 'Hele kr.';

    const formatDa = (n) => {
      if (typeof n !== 'number' || isNaN(n)) return '';
      return n.toLocaleString('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    // Header meta
    const aoa = [
      ['Budget – Nordhavn Composite A/S'],
      ['Granularitet', granLabelCap],
      ['Enhed', unitLabel],
      [''],
      ['Gruppe', 'Regnskabspost', ...periods.map(p => p.label)],
    ];

    BUDGET_GROUPS.forEach(g => {
      g.rows.forEach(r => {
        const row = [g.label, r.label];
        periods.forEach(p => {
          let num = null;
          if (r.computed && computedValues[r.label]) {
            const cv = computedValues[r.label][p.key];
            if (cv != null && !isNaN(cv)) num = cv;
          } else {
            const cell = bucket[r.label]?.[p.key];
            if (cell != null && cell !== '') {
              const parsed = parseFloat(String(cell).replace(/\./g, '').replace(',', '.'));
              if (!isNaN(parsed)) num = parsed;
            }
          }
          row.push(num == null ? '' : formatDa(num));
        });
        aoa.push(row);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // column widths
    ws['!cols'] = [{ wch: 18 }, { wch: 32 }, ...periods.map(() => ({ wch: 14 }))];
    // merge title across all columns
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 + periods.length } }];

    // tving alle celler til at være tekst-typede (giver venstre-justering og bevarer 1000-separatorer)
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cellRef = ws[addr];
        if (cellRef && cellRef.v !== undefined && cellRef.v !== null && cellRef.v !== '') {
          cellRef.t = 's';
          cellRef.v = String(cellRef.v);
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Budget ' + granLabel);

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `budget-nordhavn-${granLabel}-${date}.xlsx`);
  };

  const handleImportClick = () => {
    if (!window.XLSX) { alert('Excel-bibliotek ikke indlæst. Prøv at genindlæse siden.'); return; }
    fileInputRef.current?.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = window.XLSX;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

        // Find granularity and unit
        let importedGran = gran;
        let importedUnit = unit;
        for (const row of aoa.slice(0, 5)) {
          if (!row) continue;
          const k = String(row[0] || '').toLowerCase().trim();
          if (k === 'granularitet') {
            const v = String(row[1] || '').toLowerCase().trim();
            if (v === 'month' || v === 'måned' || v === 'maned') importedGran = 'month';
            else if (v === 'quarter' || v === 'kvartal') importedGran = 'quarter';
            else if (v === 'year' || v === 'år' || v === 'aar') importedGran = 'year';
          } else if (k === 'enhed') {
            const v = String(row[1] || '').toLowerCase();
            if (v.includes('hele kr') || v.includes('kroner') || v === 'kr' || v === 'dkk') importedUnit = 'kr';
            else if (v.includes('tusind') || v.includes('t.')) importedUnit = 'thousand';
            else importedUnit = 'mio';
          }
        }

        // Find header row (starts with "Gruppe")
        let headerIdx = aoa.findIndex(r => r && String(r[0] || '').toLowerCase().trim() === 'gruppe');
        if (headerIdx === -1) { setImportMsg({ kind: 'err', text: 'Kunne ikke finde header-række "Gruppe". Brug en eksporteret fil som skabelon.' }); return; }

        const importedPeriods = generateBudgetPeriods(importedGran);
        const headerRow = aoa[headerIdx];
        // map column index → period key
        // We trust the export order: columns from index 2 onwards = periods in same order
        // But if labels match a known period, use that; otherwise fall back to position
        const colToPeriod = {};
        for (let c = 2; c < headerRow.length; c++) {
          const label = String(headerRow[c] || '').trim();
          const byLabel = importedPeriods.find(p => p.label === label);
          if (byLabel) colToPeriod[c] = byLabel.key;
          else if (importedPeriods[c - 2]) colToPeriod[c] = importedPeriods[c - 2].key;
        }

        const labelToRow = {};
        BUDGET_GROUPS.forEach(g => g.rows.forEach(r => { labelToRow[r.label.toLowerCase().trim()] = r.label; }));

        const newBucket = {};
        let matched = 0, valuesCount = 0;
        for (let i = headerIdx + 1; i < aoa.length; i++) {
          const row = aoa[i];
          if (!row) continue;
          const rowLabel = String(row[1] || '').toLowerCase().trim();
          if (!rowLabel) continue;
          const canonical = labelToRow[rowLabel];
          if (!canonical) continue;
          matched += 1;
          const rowMap = {};
          for (let c = 2; c < row.length; c++) {
            const periodKey = colToPeriod[c];
            if (!periodKey) continue;
            const raw = row[c];
            if (raw === null || raw === undefined || raw === '') continue;
            let str;
            if (typeof raw === 'number') {
              str = String(raw).replace('.', ',');
            } else {
              // Strip tusind-prikker og whitespace, behold komma som decimal
              str = String(raw).trim().replace(/\s/g, '').replace(/\./g, '');
            }
            rowMap[periodKey] = str;
            valuesCount += 1;
          }
          if (Object.keys(rowMap).length > 0) newBucket[canonical] = rowMap;
        }

        setGran(importedGran);
        setUnit(importedUnit);
        setValues(prev => ({ ...prev, [importedGran]: newBucket }));
        setImportMsg({ kind: 'ok', text: `Importeret: ${valuesCount} tal i ${matched} rækker (${importedGran === 'month' ? 'måned' : importedGran === 'quarter' ? 'kvartal' : 'år'}). Husk at gemme.` });
      } catch (err) {
        setImportMsg({ kind: 'err', text: 'Kunne ikke læse filen: ' + (err.message || err) });
      }
      // reset input so same file can be re-selected
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <FinSection
      title="Budget"
      sub="Indtast budgettal for fremtidige perioder. Tal vises sammen med årsregnskaber i memo og analyse."
    >
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header / toggle */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', background: 'transparent', border: 0, padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <I.ChevronRight size={14} style={{ color: 'var(--c-text-3)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 160ms' }}/>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>Indtast budget</div>
              <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 2 }}>
                {filledCount > 0 ? `${filledCount} tal indtastet · gemt automatisk` : 'Ingen budgettal endnu'}
              </div>
            </div>
          </div>
        </button>

        {open && (
          <div style={{ borderTop: '1px solid var(--c-line)' }}>
            {/* Toolbar */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderBottom: '1px solid var(--c-line)', background: 'var(--c-surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11.5, color: 'var(--c-text-2)', fontWeight: 500 }}>Periode</span>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', padding: 2,
                  background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', borderRadius: 7,
                }}>
                  {[
                    { k: 'month',   l: 'Måned' },
                    { k: 'quarter', l: 'Kvartal' },
                    { k: 'year',    l: 'År' },
                  ].map(g => {
                    const active = gran === g.k;
                    return (
                      <button
                        key={g.k}
                        onClick={() => setGran(g.k)}
                        style={{
                          height: 24, padding: '0 12px', border: 0,
                          background: active ? '#fff' : 'transparent',
                          color: active ? 'var(--c-ink)' : 'var(--c-text-2)',
                          fontSize: 11.5, fontWeight: 500, borderRadius: 5, cursor: 'pointer',
                          boxShadow: active ? '0 1px 2px rgba(15,17,20,0.06)' : 'none',
                        }}
                      >
                        {g.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11.5, color: 'var(--c-text-2)', fontWeight: 500 }}>Enhed</span>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', padding: 2,
                  background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', borderRadius: 7,
                }}>
                  {[
                    { k: 'kr',       l: 'Hele kr.' },
                    { k: 'thousand', l: 'DKK t.' },
                    { k: 'mio',      l: 'DKK mio.' },
                  ].map(u => {
                    const active = unit === u.k;
                    return (
                      <button
                        key={u.k}
                        onClick={() => setUnit(u.k)}
                        style={{
                          height: 24, padding: '0 10px', border: 0,
                          background: active ? '#fff' : 'transparent',
                          color: active ? 'var(--c-ink)' : 'var(--c-text-2)',
                          fontSize: 11.5, fontWeight: 500, borderRadius: 5, cursor: 'pointer',
                          boxShadow: active ? '0 1px 2px rgba(15,17,20,0.06)' : 'none',
                        }}
                      >
                        {u.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ flex: 1 }}/>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />
              <button onClick={handleImportClick} className="btn btn-sm btn-ghost" style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <I.Download className="ic" style={{ transform: 'rotate(180deg)' }}/> Importér Excel
              </button>
              <button onClick={handleExport} className="btn btn-sm btn-ghost" style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <I.Download className="ic"/> Eksportér Excel
              </button>
              <div ref={clearBtnRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setClearConfirmOpen(v => !v)}
                  className="btn btn-sm btn-ghost"
                  style={{ fontSize: 11.5, color: 'var(--c-warn)' }}
                  title="Slet alle budgettal på tværs af måned, kvartal og år"
                >
                  Ryd alt
                </button>
                {clearConfirmOpen && (
                  <div
                    style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                      width: 260, background: '#fff',
                      border: '1px solid var(--c-line)', borderRadius: 8,
                      boxShadow: '0 8px 24px rgba(15,17,20,0.12)',
                      padding: '12px 14px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                      <I.AlertCircle size={14} style={{ color: 'var(--c-warn)', flexShrink: 0, marginTop: 1 }}/>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 3 }}>Slet alle budgettal?</div>
                        <div style={{ fontSize: 11.5, color: 'var(--c-text-2)', lineHeight: 1.45 }}>
                          Dette rydder måneder, kvartaler og år. Kan ikke fortrydes.
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        onClick={() => setClearConfirmOpen(false)}
                        className="btn btn-sm btn-ghost"
                        style={{ fontSize: 11.5 }}
                      >
                        Annullér
                      </button>
                      <button
                        onClick={handleClearAll}
                        className="btn btn-sm"
                        style={{ fontSize: 11.5, background: 'var(--c-warn)', color: '#fff', border: '1px solid var(--c-warn)' }}
                      >
                        Ja, ryd alt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ fontSize: 12.5, width: '100%', minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', fontWeight: 600, color: 'var(--c-text-2)', position: 'sticky', left: 0, background: 'var(--c-surface)', zIndex: 1 }}>
                      Regnskabspost
                    </th>
                    {periods.map(p => (
                      <th key={p.key} style={{ textAlign: 'right', fontWeight: 600, color: 'var(--c-text-2)', whiteSpace: 'nowrap', padding: '8px 10px', minWidth: 84 }}>
                        {p.label}
                      </th>
                    ))}
                    <th style={{ width: 64, padding: '8px 6px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {BUDGET_GROUPS.map((g, gi) => (
                    <React.Fragment key={g.label}>
                      <tr>
                        <td
                          colSpan={2 + periods.length}
                          style={{
                            padding: '12px 14px 6px',
                            background: 'var(--c-surface-2)',
                            borderTop: gi === 0 ? 'none' : '1px solid var(--c-line)',
                            fontSize: 11, fontWeight: 600,
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                            color: 'var(--c-text-2)',
                          }}
                        >
                          {g.label}
                        </td>
                      </tr>
                      {g.rows.map((r) => (
                        <BudgetRow
                          key={r.label}
                          row={r}
                          periods={periods}
                          rowValues={values[gran]?.[r.label]}
                          computedRowValues={r.computed ? computedValues[r.label] : undefined}
                          onChangeCell={onChangeCell}
                          onRecycle={handleRecycleRow}
                          canRecycle={!!getLastAnnualValue(r.label)}
                          onClearRow={handleClearRow}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import status */}
            {importMsg && (
              <div style={{
                padding: '8px 14px', borderTop: '1px solid var(--c-line)',
                background: importMsg.kind === 'ok' ? 'var(--c-success-bg)' : 'var(--c-warn-bg)',
                color: importMsg.kind === 'ok' ? 'var(--c-success)' : 'var(--c-warn)',
                fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <span>{importMsg.text}</span>
                <button onClick={() => setImportMsg(null)} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'inherit', fontSize: 14 }}>×</button>
              </div>
            )}
          </div>
        )}
      </div>
    </FinSection>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Ejerstruktur - simpelt træ med to ejere → ét selskab
   ──────────────────────────────────────────────────────────────────────── */
function SimpleOwnershipTree() {
  const co = DATA.COMPANY;
  const owners = [
    { name: "Anders Nielsen", pct: 75 },
    { name: "Lise Sørensen",  pct: 25 },
  ];

  return (
    <div className="card" style={{ padding: '22px 18px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, maxWidth: 480, margin: '0 auto', width: '100%' }}>
        {/* Owners */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
          {owners.map((o, i) => (
            <div key={i} style={{
              border: '1px solid var(--c-line)', borderRadius: 8,
              background: 'var(--c-surface)',
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              minWidth: 0,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
                display: 'grid', placeItems: 'center', color: 'var(--c-text-2)',
                flexShrink: 0,
              }}>
                <I.User size={13}/>
              </span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.name}
                </span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)' }}>{o.pct}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Quiet vertical connector */}
        <div aria-hidden="true" style={{ width: 1, height: 24, background: 'var(--c-line)' }}/>

        {/* Company */}
        <div style={{
          border: '1px solid var(--c-line)', borderRadius: 8,
          background: 'var(--c-surface)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          minWidth: 280,
        }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--c-surface-2)', border: '1px solid var(--c-line)',
            display: 'grid', placeItems: 'center', color: 'var(--c-text-2)',
            fontWeight: 600, fontSize: 11,
            flexShrink: 0,
          }}>
            {co.short || 'NC'}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{co.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 1 }}>
              <span className="mono">CVR {String(co.cvr).replace(/\s+/g, '')}</span> · Ikke i koncern
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Trustpilot score section
   ──────────────────────────────────────────────────────────────────────── */
function TrustpilotStars({ rating, size }) {
  size = size || 14;
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#009a65' : 'var(--c-line-strong)', fontSize: size }}>★</span>
      ))}
    </span>
  );
}

function TrustpilotSection() {
  const score = 4.2;
  const totalReviews = 127;
  const dist = [
    { stars: 5, count: 78 },
    { stars: 4, count: 26 },
    { stars: 3, count: 11 },
    { stars: 2, count: 7 },
    { stars: 1, count: 5 },
  ];
  const reviews = [
    { stars: 5, text: "Professionelt team og høj kvalitet på produkterne. Levering til tiden og god kommunikation undervejs.", author: "Klaus M.", date: "12. maj 2026" },
    { stars: 4, text: "Generelt gode oplevelser. Responstiden på forespørgsler kunne forbedres.", author: "Mette H.", date: "3. april 2026" },
    { stars: 5, text: "Har samarbejdet med dem i 3 år. Stabil leverandør med god faglig kompetence.", author: "Peter L.", date: "18. marts 2026" },
  ];
  const maxCount = Math.max(...dist.map(d => d.count));

  return (
    <FinSection
      title="Trustpilot"
      sub="Kundeanmeldelser fra Trustpilot. Soft signal - bør sammenholdes med faktisk kundefastholdelse og ordrebog."
    >
      <div className="card" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Score overview */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          minWidth: 100, paddingRight: 24, borderRight: '1px solid var(--c-line-2)',
        }}>
          <div style={{ fontSize: 38, fontWeight: 700, color: '#009a65', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {score.toFixed(1)}
          </div>
          <TrustpilotStars rating={score} size={18}/>
          <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>{totalReviews} anmeldelser</div>
        </div>

        {/* Distribution bars */}
        <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
          {dist.map(d => (
            <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--c-text-3)', width: 14, textAlign: 'right', flexShrink: 0 }}>{d.stars}</span>
              <span style={{ color: '#009a65', fontSize: 11, flexShrink: 0 }}>★</span>
              <div style={{ flex: 1, height: 6, background: 'var(--c-line-2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(d.count / maxCount) * 100}%`, height: '100%', background: '#009a65', borderRadius: 3 }}/>
              </div>
              <span style={{ fontSize: 11, color: 'var(--c-text-3)', width: 22, textAlign: 'right', flexShrink: 0 }}>{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent reviews */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-ink)', marginBottom: 4 }}>Seneste anmeldelser</div>
        {reviews.map((r, i) => (
          <div key={i} style={{ borderTop: '1px solid var(--c-line-2)', padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <TrustpilotStars rating={r.stars} size={12}/>
              <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{r.author} · {r.date}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.5 }}>{r.text}</div>
          </div>
        ))}
      </div>

      {/* Source */}
      <div style={{
        marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--c-line)',
        fontSize: 11, color: 'var(--c-text-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
      }}>
        <span>Kilde: Trustpilot.com/review/nordhavncomposites.dk · hentet 23. maj 2026</span>
        <a
          href="https://www.trustpilot.com/review/nordhavncomposites.dk"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--c-primary)', fontSize: 11.5, fontWeight: 500, textDecoration: 'none' }}
        >
          Åbn på Trustpilot →
        </a>
      </div>
      </div>
    </FinSection>
  );
}

window.WSFinancials = WSFinancials;
window.ANNUAL_REPORT = ANNUAL_REPORT;
window.FIN_RATIOS = FIN_RATIOS;
window.FIN_ANNUAL_YEARS = FIN_ANNUAL_YEARS;
window.FIN_ACTUAL_Q = FIN_ACTUAL_Q;
window.FIN_BUDGET_Q = FIN_BUDGET_Q;
window.AnnualReportSection = AnnualReportSection;
window.BudgetSection = BudgetSection;
window.SimpleOwnershipTree = SimpleOwnershipTree;
