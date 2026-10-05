// Mine opgaver - Mettes egne sager med status, risiko og næste skridt.
// Status, ejer, dage i fase og risiko kommer fra sagsmodellen i data.js
// (DATA.caseStatusKey, DATA.caseOwner, DATA.caseAge, DATA.caseRisk), så listen,
// menuens tal, sagshovedet og Dataanmodninger er enige.

// Mine opgaver viser kun den indloggede rådgivers egne sager (DATA.ME).
// Tre faner. Fanen for en sag står i DATA.STATUS[nøgle].tab og følger, hvem
// der har bolden. "Afventer mig" rummer alt, hvor næste skridt ligger hos
// rådgiveren, også Til gennemgang og Klar til indstilling, så fanens tal er
// det samme som menuens. Indstillede, afgjorte sager og kladder står under
// "Alle sager", grupperet efter status.
const CASE_TABS = [
  { k: "mine",    l: "Afventer mig",   help: "Vurdering, materialevalg, gennemgang af modtaget materiale, memo og indstilling. Næste skridt ligger hos rådgiveren." },
  { k: "waiting", l: "Afventer kunde", help: "Anmodningen er sendt, og kunden mangler at levere." },
  { k: "all",     l: "Alle sager",     help: "Alle dine sager, også kladder, indstillede og afgjorte." },
];
const CASE_EMPTY = { mine: 'Ingen sager venter på dig lige nu.', waiting: 'Ingen sager afventer kunden lige nu.', all: 'Du har ingen sager.' };
const caseTab = (c) => ((DATA.STATUS[c.statusKey] || {}).tab || 'draft');

const CASE_SORTS = [
  { v: "urgent",   l: "Mest presserende" },
  { v: "deadline", l: "Sagsfrist" },
  { v: "age",      l: "Dage i fase" },
  { v: "amount",   l: "Beløb" },
  { v: "activity", l: "Seneste aktivitet" },
];

// Åbn en sag fra Mine opgaver: tilbage fører til Mine opgaver (ryd 'cw_back' fra analysen)
function openCaseFromList(id, go) {
  try { sessionStorage.removeItem('cw_back'); } catch (e) {}
  go('workspace:' + id);
}

// Har sagen en overskredet sagsfrist? Afgjorte sager og kladder tæller ikke.
function caseOverdue(c) {
  if (!c.deadline || DATA.caseIsDecided(c) || c.statusKey === 'draft') return false;
  return DATA.fmt.deadline(c.deadline).overdue;
}

function sortCases(list, sort) {
  const F = DATA.fmt;
  const days = (c) => { if (DATA.caseIsDecided(c)) return Infinity; const d = F.daysUntil(c.deadline); return d == null ? Infinity : d; };
  const act = (c) => new Date(c.lastActivityAt || 0).getTime();
  const age = (c) => { const a = DATA.caseAge(c); return a.days == null ? -1 : a.days; };
  const cmp = {
    // Overskredne først, så det der venter på mig, så nærmeste frist, så beløb.
    // Fristen står ikke længere på kortet, men styrer stadig rækkefølgen.
    urgent: (a, b) => {
      const oa = caseOverdue(a) ? 0 : 1, ob = caseOverdue(b) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      const ma = DATA.caseAwaitingMe(a) ? 0 : 1, mb = DATA.caseAwaitingMe(b) ? 0 : 1;
      if (ma !== mb) return ma - mb;
      if (days(a) !== days(b)) return days(a) - days(b);
      return (b.amount || 0) - (a.amount || 0);
    },
    deadline: (a, b) => days(a) - days(b) || act(b) - act(a),
    age: (a, b) => age(b) - age(a),
    amount: (a, b) => (b.amount || 0) - (a.amount || 0),
    activity: (a, b) => act(b) - act(a),
  }[sort] || (() => 0);
  return [...list].sort(cmp);
}

function Portfolio({ go }) {
  CW.useCase(); // status, ejer og kladder følger den fælles sagstilstand
  // Visningen huskes i sessionen, så den står som før, når man kommer tilbage fra en sag
  // (fane og sortering; en ældre gemt teamvisning ignoreres)
  const saved = React.useMemo(() => DATA.viewGet('cases') || {}, []);
  const [filter, setFilter] = React.useState(CASE_TABS.some(x => x.k === saved.filter) ? saved.filter : "mine");
  const [sort, setSort] = React.useState(CASE_SORTS.some(x => x.v === saved.sort) ? saved.sort : "urgent");
  const [collapsed, setCollapsed] = React.useState({}); // statusnøgle -> bool
  // Gem først, når visningen ændres (ikke ved indlæsning), så en ren demo forbliver ren
  const viewMounted = React.useRef(false);
  React.useEffect(() => {
    if (!viewMounted.current) { viewMounted.current = true; return; }
    DATA.viewSet('cases', { filter, sort });
  }, [filter, sort]);

  const scopeCases = DATA.CASES.filter(c => c.responsible === DATA.ME);
  const countFor = (tab) => (tab.k === 'all' ? scopeCases.length : scopeCases.filter(c => caseTab(c) === tab.k).length);

  const tab = CASE_TABS.find(x => x.k === filter) || CASE_TABS[0];
  const displayCases = sortCases(tab.k === 'all' ? scopeCases : scopeCases.filter(c => caseTab(c) === tab.k), sort);

  // "Alle sager": grupperet efter status i sagsforløbets rækkefølge, afgjorte sidst
  let groupedForAll = null;
  if (filter === "all") {
    const keys = Object.keys(DATA.STATUS).sort((a, b) => DATA.STATUS[a].order - DATA.STATUS[b].order);
    groupedForAll = keys
      .map(k => ({ key: k, label: DATA.STATUS[k].label, open: !DATA.STATUS[k].decided, cases: displayCases.filter(c => c.statusKey === k) }))
      .filter(g => g.cases.length > 0);
  }

  return (
    <>
      {/* Ingen knapper i topbjælken: sidebjælkens "Ny sag" er skærmens eneste primærknap */}
      <Topbar crumbs={[t("Mine opgaver")]} right={null}/>
      <div className="scroll">
        <div className="page" style={{ maxWidth: 1100 }}>
          <div className="page-head">
            <div>
              <h1 className="page-title">{t('Mine opgaver')}</h1>
              <div className="page-sub">{t('Sager, hvor næste skridt ligger hos dig.')}</div>
            </div>
          </div>

          {/* Faner (tallet står kun her og i menuen) og sortering */}
          <div className="list-toolbar">
            <ListTabs idBase="cw-cases" ariaLabel={t('Filtrér sager')} value={filter} onChange={setFilter}
              tabs={CASE_TABS.map(f => ({ k: f.k, l: t(f.l), n: countFor(f), help: t(f.help) }))}/>
            <div className="list-toolbar-tools">
              <FilterDropdown label={t('Sortér')} value={sort} onChange={setSort} options={CASE_SORTS.map(s => ({ v: s.v, l: t(s.l) }))} neutral/>
            </div>
          </div>

          <div role="tabpanel" id="cw-cases-panel" aria-labelledby={'cw-cases-' + filter}>
            {displayCases.length === 0 ? (
              <p className="list-empty">{t(CASE_EMPTY[tab.k])}</p>
            ) : groupedForAll ? (
              <div className="card case-list">
                {groupedForAll.map(grp => {
                  const isCollapsed = collapsed[grp.key] != null ? collapsed[grp.key] : !grp.open;
                  return (
                    <CWFold key={grp.key} id={'cw-cases-grp-' + grp.key} label={t(grp.label)} count={grp.cases.length}
                      open={!isCollapsed} onToggle={(o) => setCollapsed(s => ({ ...s, [grp.key]: !o }))}>
                      {grp.cases.map(c => <CaseRow key={c.id} c={c} go={go}/>)}
                    </CWFold>
                  );
                })}
              </div>
            ) : (
              <div className="card case-list">
                {displayCases.map(c => <CaseRow key={c.id} c={c} go={go}/>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* Faner i én stil (.cw-tabs) til Mine opgaver og Dataanmodninger.
   tabs: [{ k, l, n, help }]. Rigtige faner: piletasterne flytter mellem
   dem, og kun den valgte fane er i tabulatorrækkefølgen. Panelet har
   id idBase + '-panel' og peger tilbage på fanen (aria-labelledby). */
function ListTabs({ tabs, value, onChange, ariaLabel, idBase }) {
  const onKey = (e) => {
    const i = tabs.findIndex(x => x.k === value);
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = tabs.length - 1;
    if (j == null) return;
    e.preventDefault();
    onChange(tabs[j].k);
    CW.focusSoon('#' + idBase + '-' + tabs[j].k);
  };
  return (
    <div className="cw-tabs" role="tablist" aria-label={ariaLabel} onKeyDown={onKey}>
      {tabs.map(x => (
        <button key={x.k} type="button" role="tab" id={idBase + '-' + x.k}
          aria-selected={value === x.k} aria-controls={idBase + '-panel'} tabIndex={value === x.k ? 0 : -1}
          title={x.help || undefined} onClick={() => onChange(x.k)}>
          {x.l} <span className="n">{x.n}</span>
        </button>
      ))}
    </div>
  );
}

// Én række pr. sag: fed navn og næste skridt i grå, sagstype og beløb som
// grå tekst til højre. Rækkens flade er én knap (Tab og Enter åbner sagen);
// menuen med omfordeling er en separat knap til højre.
function CaseRow({ c, go }) {
  const F = DATA.fmt;
  const st = DATA.STATUS[c.statusKey];
  const decided = DATA.caseIsDecided(c);
  const next = DATA.caseNextStep(c);
  const [menu, setMenu] = React.useState(false);
  const amount = c.amount != null ? F.amount(c.amount) : t('Beløb ikke angivet');
  return (
    <div className="case-card case-row">
      <button
        type="button"
        className="case-card-main"
        onClick={() => openCaseFromList(c.id, go)}
        aria-label={c.name + ', ' + t('sag') + ' ' + c.caseNr + ', ' + t(st ? st.label : c.statusKey)
          + ', ' + t('Næste') + ': ' + next}
      >
        <span className="cw-row-main">
          <span className="cw-row-title case-row-title">
            <span className="case-row-name">{c.name}</span>
            <span className="mono case-row-nr">{c.caseNr}</span>
          </span>
          <span className="cw-row-meta case-row-next"><span style={{ color: 'var(--c-text-3)' }}>{t('Næste')}:</span> {next}</span>
        </span>
        <span className="cw-row-cat" title={c.amountNote ? t(c.amountNote) : undefined}>
          {t(c.type)} · <span className="num">{amount}</span>
        </span>
      </button>
      {!decided && (
        <button type="button" className="icon-btn case-card-menu-btn" aria-haspopup="menu" aria-expanded={menu}
          aria-label={t('Flere handlinger for') + ' ' + c.name} title={t('Flyt sagen til en anden rådgiver')}
          onClick={(e) => { e.stopPropagation(); setMenu(m => !m); }}>
          <I.MoreH size={15}/>
        </button>
      )}
      {menu && <CaseCardMenu c={c} onClose={() => setMenu(false)} go={go}/>}
    </div>
  );
}

// Menu ved sagens række: omfordel sagen til en anden rådgiver (CW.setOwner)
function CaseCardMenu({ c, onClose, go }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const first = ref.current && ref.current.querySelector('[role^=menuitem]:not([aria-disabled=true])');
    if (first) first.focus();
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target) && !(e.target.closest && e.target.closest('.case-card-menu-btn'))) onClose(); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const onKey = (e) => {
    const items = Array.prototype.slice.call(ref.current.querySelectorAll('[role^=menuitem]'));
    const i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); const b = ref.current.parentNode.querySelector('.case-card-menu-btn'); if (b) b.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    else if (e.key === 'Tab') onClose();
  };
  const move = (m) => {
    const prev = c.responsible;
    if (m.short === prev) { onClose(); return; }
    onClose();
    CW.setOwner(c.id, m.short);
    CW.toast(t('Sagen er flyttet til') + ' ' + m.short + ' (' + c.name + ')', {
      action: { label: t('Fortryd'), onClick: () => CW.setOwner(c.id, prev) },
    });
    CW.focusSoon('#main');
  };
  const item = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', minHeight: 32, border: 0, background: 'transparent', borderRadius: 5, fontFamily: 'inherit', fontSize: 13, color: 'var(--c-text)', textAlign: 'left', cursor: 'pointer' };
  return (
    <div ref={ref} role="menu" aria-label={t('Flyt sagen til')} onKeyDown={onKey}
      style={{ position: 'absolute', right: 8, top: 'calc(100% - 8px)', zIndex: 30, width: 230, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', padding: 4 }}>
      <div style={{ padding: '6px 10px 4px', fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)' }}>{t('Flyt sagen til')}</div>
      {DATA.TEAM.map(m => {
        const cur = m.short === c.responsible;
        return (
          <button key={m.short} type="button" role="menuitemradio" aria-checked={cur} className="menu-item" style={item} onClick={() => move(m)}>
            <span style={{ flex: 1 }}>{m.name}</span>
            {cur && <I.Check size={13}/>}
          </button>
        );
      })}
      <div style={{ height: 1, background: 'var(--c-line-2)', margin: '4px 0' }}/>
      <button type="button" role="menuitem" className="menu-item" style={item} onClick={() => { onClose(); openCaseFromList(c.id, go); }}>
        <I.ArrowRight size={13}/> {t('Åbn sagen')}
      </button>
    </div>
  );
}

function FilterDropdown({ label, value, onChange, options, neutral }) {
  // neutral: vælgeren er en sortering og har ingen "tom" værdi, så den markeres ikke som aktivt filter
  const isActive = !neutral && value !== 'all';
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', height: 32,
      border: '1px solid ' + (isActive ? 'var(--c-primary-border)' : 'var(--c-line)'),
      background: isActive ? 'var(--c-primary-bg)' : '#fff',
      color: isActive ? 'var(--c-primary)' : 'var(--c-text-2)',
      borderRadius: 6, padding: '0 8px 0 10px',
      fontSize: 12.5, fontWeight: 500,
      cursor: 'pointer', gap: 6,
    }}>
      <span style={{ color: isActive ? 'var(--c-primary)' : 'var(--c-text-3)' }}>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
          border: 0, background: 'transparent', font: 'inherit', color: 'inherit',
          cursor: 'pointer', paddingRight: 16,
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'><path fill='%23636b74' d='M0 0h8L4 5z'/></svg>\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 2px center',
        }}
        aria-label={label}
      >
        {/* Valg med group står i hver sin optgroup (fx skabelonerne i analysen) */}
        {options.filter(o => !o.group).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        {[...new Set(options.filter(o => o.group).map(o => o.group))].map(g => (
          <optgroup key={g} label={g}>
            {options.filter(o => o.group === g).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

window.Portfolio = Portfolio;
window.FilterDropdown = FilterDropdown;
window.ListTabs = ListTabs;
