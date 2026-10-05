// Shell - sidebar + topbar
const { useState } = React;

function LanguageSwitcher({ compact }) {
  const langs = [['da', 'DA'], ['en', 'EN']];
  return (
    <div role="group" aria-label={t('Sprog')} style={{
      display: 'flex', gap: 2, padding: 2, borderRadius: 7,
      border: '1px solid var(--c-line)', background: 'var(--c-surface-2)',
      width: compact ? 'auto' : '100%',
    }}>
      {langs.map(([code, label]) => {
        const active = window.CW_LANG === code;
        return (
          <button
            key={code}
            onClick={() => window.setLang(code)}
            aria-pressed={active}
            style={{
              flex: compact ? '0 0 auto' : 1, padding: '4px 8px', borderRadius: 5,
              border: 0, cursor: active ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 600,
              fontFamily: 'inherit',
              background: active ? '#fff' : 'transparent',
              color: active ? 'var(--c-ink)' : 'var(--c-text-3)',
              boxShadow: active ? 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.08))' : 'none',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Sidebar({ route, go, openNewCase }) {
  // Tallene i menuen regnes af sagsmodellen og følger den fælles sagstilstand.
  // Begge tal er grå: tallet siger nok i sig selv.
  CW.useCase();
  const isActive = (r) => route === r || (r === "cases" && route.startsWith("workspace"));
  const awaitingMe = DATA.CASES.filter(DATA.caseAwaitingMe).length;
  const stuck = DATA.requestRows().filter(r => r.status === 'stuck').length;
  const item = (r, icon, label, count, countTitle) => (
    <button
      className={"nav-item " + (isActive(r) ? "active" : "")}
      aria-current={isActive(r) ? "page" : undefined}
      onClick={() => go(r)}
      title={count != null ? count + ' ' + countTitle : undefined}
    >
      {icon} {label}
      {count != null && (
        <span className="count">
          {count}<span className="sr-only"> {countTitle}</span>
        </span>
      )}
    </button>
  );
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">cw</div>
        <div>
          <div className="brand-name">EIFO</div>
          <div className="brand-org">{t('Kreditafdeling')}</div>
        </div>
      </div>

      <button className="btn btn-primary" style={{ justifyContent: 'center', width: '100%', marginBottom: 6 }} onClick={openNewCase}>
        <I.Plus size={14} /> {t('Ny sag')}
      </button>

      <nav className="nav" aria-label={t('Hovedmenu')}>
        {item("cases", <I.Briefcase className="ic"/>, t('Mine opgaver'), awaitingMe, t('sager afventer dig'))}
        {item("requests", <I.Send className="ic"/>, t('Dataanmodninger'), stuck, t('sidder fast (ingen aktivitet i 3 hverdage)'))}
        {item("analyse", <I.Filter className="ic"/>, t('Porteføljeanalyse'))}
      </nav>

      {/* Bunden: brugerkortet åbner en lille menu med sprog og Nulstil demo.
          Nulstil demo og sprogvalget står også fremme i én grå linje, så
          præsentatoren altid kan finde dem med ét klik. */}
      <div className="sidebar-foot">
        <UserMenu/>
        <div className="sidebar-foot-line">
          <button type="button" className="demo-reset" onClick={confirmResetDemo}
            title={t('Sletter alt, demoen har gemt, og starter forfra')}>
            <I.Refresh size={12}/> {t('Nulstil demo')}
          </button>
          <LanguageSwitcher compact/>
        </div>
      </div>
    </aside>
  );
}

// Brugerkortet nederst i sidebjælken: en knap, der åbner en menu med sprog og
// Nulstil demo. Pil op/ned flytter i menuen, Esc lukker og giver fokus tilbage.
function UserMenu() {
  const [open, setOpen] = React.useState(false);
  const wrap = React.useRef(null);
  const btn = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const first = wrap.current && wrap.current.querySelector('[role^=menuitem][aria-checked=true], [role^=menuitem]');
    if (first) first.focus();
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const close = (refocus) => { setOpen(false); if (refocus && btn.current) CW.focusSoon(btn.current); };
  const onKey = (e) => {
    const items = Array.prototype.slice.call(wrap.current.querySelectorAll('[role^=menuitem]'));
    const i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    else if (e.key === 'Tab') setOpen(false);
  };
  const langs = [['da', 'Dansk'], ['en', 'English']];
  return (
    <div ref={wrap} className="user-menu-wrap" onKeyDown={open ? onKey : undefined}>
      <button type="button" ref={btn} className="user-chip" aria-haspopup="menu" aria-expanded={open}
        aria-controls={open ? 'cw-user-menu' : undefined} onClick={() => setOpen(o => !o)}>
        <span className="avatar" aria-hidden="true">ML</span>
        <span className="meta">
          <b>Mette Larsen</b>
          <span>{t('Kreditrådgiver')}</span>
        </span>
        <I.ChevronDown size={13} aria-hidden="true" style={{ marginLeft: 'auto', color: 'var(--c-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}/>
      </button>
      {open && (
        <div id="cw-user-menu" role="menu" aria-label={t('Brugermenu')} className="user-menu">
          <div className="user-menu-label" aria-hidden="true">{t('Sprog')}</div>
          {langs.map(([code, label]) => (
            <button key={code} type="button" role="menuitemradio" aria-checked={window.CW_LANG === code} className="menu-item user-menu-item"
              lang={code} onClick={() => { if (window.CW_LANG === code) { close(true); return; } window.setLang(code); }}>
              <span style={{ flex: 1 }}>{label}</span>
              {window.CW_LANG === code && <I.Check size={13} aria-hidden="true"/>}
            </button>
          ))}
          <div role="separator" className="user-menu-sep"/>
          <button type="button" role="menuitem" className="menu-item user-menu-item" onClick={() => { setOpen(false); confirmResetDemo(); }}>
            {t('Nulstil demo')}
          </button>
        </div>
      )}
    </div>
  );
}

function Topbar({ crumbs, right }) {
  return (
    <header className="topbar">
      <nav className="crumb" aria-label={t('Brødkrumme')}>
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const label = typeof c === 'string' ? c : c.label;
          const onClick = typeof c === 'object' ? c.onClick : null;
          return (
            <React.Fragment key={i}>
              {i > 0 && <I.ChevronRight size={12} className="crumb-sep" aria-hidden="true"/>}
              {isLast ? (
                <b aria-current="page">{label}</b>
              ) : onClick ? (
                <button onClick={onClick} style={{ background: 'transparent', border: 'none', padding: '2px 4px', margin: '-2px -4px', color: 'var(--c-text-2)', cursor: 'pointer', borderRadius: 4, fontSize: 'inherit', fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface-2)'; e.currentTarget.style.color = 'var(--c-ink)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-text-2)'; }}>
                  {label}
                </button>
              ) : (
                <span>{label}</span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
      <div className="topbar-right">
        <CaseSearch/>
        <div style={{ width: 1, height: 18, background: 'var(--c-line)', margin: '0 4px' }}/>
        {right && <>{right}<div style={{ width: 1, height: 18, background: 'var(--c-line)', margin: '0 4px' }}/></>}
        <NotificationBell/>
        <HelpButton/>
      </div>
    </header>
  );
}

// Søgning på tværs af sager: navn, CVR (med eller uden mellemrum) og sagsnummer
function CaseSearch() {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(0);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const all = DATA.CASES || [];
  const norm = (s) => String(s || '').toLowerCase().split(' ').join('');
  const results = q.trim()
    ? all.filter(c => {
        const s = norm(q);
        return norm(c.name).includes(s) || norm(c.cvr).includes(s) || norm(c.caseNr).includes(s);
      }).slice(0, 8)
    : all.filter(c => !c.archived).slice(0, 6);

  const navigate = (c) => {
    setOpen(false);
    setQ("");
    try { sessionStorage.removeItem('cw_back'); } catch (e) {} // tilbage fører til Mine opgaver
    if (window.__go) window.__go("workspace:" + c.id);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHover(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHover(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open && results[hover]) navigate(results[hover]); }
    else if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'Tab') { setOpen(false); }
  };

  return (
    <div ref={wrapRef} role="search" style={{ position: 'relative' }}>
      <div style={{ position: 'relative', width: 260 }}>
        <I.Search size={13} aria-hidden="true" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', pointerEvents: 'none' }}/>
        {/* type="text" og ikke "search": browserens eget ryd-kryds kom ellers oven i vores */}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="cw-case-search-list"
          aria-autocomplete="list"
          aria-activedescendant={open && results[hover] ? 'cw-cs-' + results[hover].id : undefined}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHover(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={t('Søg sag - navn, CVR eller sagsnr.')}
          aria-label={t('Søg sag')}
          style={{
            width: '100%', height: 30, padding: '0 28px 0 28px',
            border: '1px solid var(--c-line)', borderRadius: 6,
            fontSize: 12.5, background: '#fff', color: 'var(--c-ink)', outline: 'none',
          }}
        />
        {q && (
          <button
            type="button" aria-label={t('Ryd søgning')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQ(""); setOpen(true); inputRef.current && inputRef.current.focus(); }}
            style={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              width: 24, height: 24, borderRadius: 4, border: 0, background: 'transparent',
              cursor: 'pointer', color: 'var(--c-text-3)', display: 'grid', placeItems: 'center',
            }}
          >
            <I.X size={11}/>
          </button>
        )}
      </div>

      {open && (
        <div id="cw-case-search-list" role="listbox" aria-label={t('Sager')} style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 340,
          background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8,
          boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden',
        }}>
          {q.trim() === "" && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--c-text-3)', borderBottom: '1px solid var(--c-line-2)' }}>
              {t('Seneste sager')}
            </div>
          )}
          {results.length === 0 ? (
            <div style={{ padding: '14px 14px', fontSize: 12.5, color: 'var(--c-text-3)' }}>
              {t('Ingen sager matcher')} "{q}"
            </div>
          ) : (
            results.map((c, i) => (
              <div
                key={c.id}
                id={'cw-cs-' + c.id}
                role="option"
                aria-selected={hover === i}
                onMouseEnter={() => setHover(i)}
                onMouseDown={(e) => { e.preventDefault(); navigate(c); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px',
                  borderBottom: i < results.length - 1 ? '1px solid var(--c-line-2)' : 'none',
                  background: hover === i ? 'var(--c-surface-2)' : '#fff',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--c-ink)' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{c.name}</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--c-text-3)', fontWeight: 400, flexShrink: 0 }}>{c.caseNr}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="mono">CVR {c.cvr}</span> · {t('Ansvarlig')}: {c.responsible}
                  </div>
                </div>
                <I.ChevronRight size={13} aria-hidden="true" style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* Statuspille ud fra sagsmodellens ordforråd (DATA.STATUS). Tager en statusnøgle
   fra DATA.caseStatusKey ('review', 'awaiting' osv.) og tåler de gamle nøgler
   ("Needs review" osv.); ukendte værdier vises som de er. Bruges kun af
   sagshovedet; lister og rækker viser status som grå tekst (CWStatus). */
function statusPill(s) {
  const def = DATA.STATUS[DATA.statusKeyOf ? DATA.statusKeyOf(s) : s];
  const klass = def ? def.tone : "outline";
  const label = def ? def.label : s;
  return <span className={"pill " + klass}><span className="pill-dot" aria-hidden="true"/>{t(label)}</span>;
}

/* ── Nulstil demo ───────────────────────────────────────────────────────────
   Samme handling fra sidebjælken og fra Tweaks: bekræft, og nulstil så med
   CW.resetDemo(), der rydder sag, memo, kommentarer og filer og genindlæser. */
function confirmResetDemo() {
  CW.confirm({
    title: t('Nulstil demoen?'),
    text: t('Sagens fase, anmodningen, uploads, godkendelser, memoet, kommentarer og omfordelinger slettes. Sprog og skærm bevares.'),
    confirmLabel: t('Nulstil demo'),
    danger: true,
  }).then(r => {
    if (!r || !r.ok) return;
    // Kvittering efter genindlæsningen (vises af NewCaseHost ved start)
    try { sessionStorage.setItem('cw_reset_done', '1'); } catch (e) {}
    CW.resetDemo();
  });
}

/* Åbn en sag og rul til et bestemt afsnit (fx 'ws-outstanding' eller
   'ws-dialog-title'). Afsnittets id lægges også i sessionStorage
   ('kabul:focus-target'), så sagen selv kan tage det op. */
function cwOpenCase(caseId, targetId) {
  try { if (targetId) sessionStorage.setItem('kabul:focus-target', targetId); } catch (e) {}
  try { sessionStorage.removeItem('cw_back'); } catch (e) {} // tilbage fra sagen fører til Mine opgaver
  if (window.__go) window.__go('workspace:' + caseId);
  if (!targetId) return;
  let n = 0;
  const tick = () => {
    const el = document.getElementById(targetId);
    if (el) {
      try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
      CW.focusSoon(el);
      try { sessionStorage.removeItem('kabul:focus-target'); } catch (e) {}
      return;
    }
    if (++n < 30) setTimeout(tick, 80);
  };
  setTimeout(tick, 150);
}

/* ── Klokken: hændelser fra kunden ─────────────────────────────────────────
   CW.notifications('rådgiver') er det kunden har gjort, som rådgiveren ikke
   har set: leveringer, spørgsmål, Indsend, samtykke. CW.markSeen markerer dem
   som set. Kun Nordhavn har levende hændelser i demoen. */
const BELL_TARGET = {
  received: 'ws-outstanding', noted: 'ws-outstanding', delegated: 'ws-outstanding', reset: 'ws-outstanding',
  'customer-submitted': 'ws-outstanding', consent: 'ws-outstanding', 'consent-revoked': 'ws-outstanding',
  question: 'ws-dialog-title', reply: 'ws-dialog-title',
};
// Kun den relative tid ("for 3 timer siden"); ældre end i dag kun datoen
// ("28. sep."). Klokkeslættet står i title.
function bellWhen(iso) {
  const rel = CW.fmtAgo(iso);
  return /\d:\d\d/.test(rel) ? DATA.fmt.shortDate(iso) : rel;
}

/* Har rådgiveren allerede handlet på hændelsen? Så er den ikke længere ny,
   selv om klokken ikke er åbnet: et leveret punkt er godkendt eller afvist,
   et spørgsmål er besvaret, og indsendt materiale er gennemgået. */
function bellHandled(e, log) {
  const i = log.findIndex(x => x.id === e.id);
  const later = log.slice(i + 1).filter(x => x.who === 'rådgiver');
  if (e.type === 'question' || e.type === 'reply') return later.some(x => x.type === 'reply' || x.type === 'question');
  const decided = (id) => later.some(x => x.itemId === id && (x.type === 'approved' || x.type === 'rejected' || x.type === 'received'));
  if (e.type === 'customer-submitted') return later.some(x => x.type === 'approved' || x.type === 'rejected') && CW.progress().toReview === 0;
  const ids = e.itemId ? [e.itemId] : (e.data && Array.isArray(e.data.items) ? e.data.items : []);
  return ids.length > 0 && ids.every(decided);
}

function NotificationBell() {
  CW.useCase();
  const [open, setOpen] = React.useState(false);
  const wrap = React.useRef(null);
  const panel = React.useRef(null);
  const close = () => setOpen(false);
  CW.useDialog(panel, open, close);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Tiden på hændelserne ("for 17 min. siden") opdateres, mens listen er åben
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(id);
  }, [open]);

  const log = CW.activity();
  const unseen = CW.notifications('rådgiver').filter(e => !bellHandled(e, log));
  const unseenIds = {};
  unseen.forEach(e => { unseenIds[e.id] = true; });
  // Tidligere hændelser fra kunden (allerede set), til sammenhæng
  const earlier = CW.activity().filter(e => e.who === 'kunde' && !unseenIds[e.id]).slice(-5).reverse();
  const co = DATA.COMPANY;
  // Faste demohændelser på de andre sager (Marstal, Lyngbæk …): nye, indtil de er klikket
  const demoEv = DATA.demoBellEvents ? DATA.demoBellEvents() : [];
  const demoNew = demoEv.filter(e => !e.seen);
  const demoOld = demoEv.filter(e => e.seen);
  const n = unseen.length + demoNew.length;
  const markAll = () => { CW.markSeen('rådgiver'); if (demoNew.length) DATA.markDemoBellSeen(demoNew.map(e => e.id)); };

  const openEntry = (e) => {
    setOpen(false);
    if (e.caseId) { DATA.markDemoBellSeen(e.id); cwOpenCase(e.caseId, null); return; }
    CW.markSeen('rådgiver');
    cwOpenCase(1, BELL_TARGET[e.type] || null);
  };
  const row = (e, fresh) => {
    return (
      <li key={e.id}>
        <button type="button" onClick={() => openEntry(e)} className="bell-row">
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 13, color: fresh ? 'var(--c-ink)' : 'var(--c-text-2)', fontWeight: fresh ? 500 : 400, lineHeight: 1.4 }}>{e.caseId ? t(e.text) : e.text}</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>
              {e.company || co.name} · <span title={CW.fmtWhen(e.at)}>{bellWhen(e.at)}</span>
            </span>
          </span>
          {fresh && <span className="sr-only">{t('ny')}</span>}
          {fresh && <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-primary)', marginTop: 6, flexShrink: 0 }}/>}
        </button>
      </li>
    );
  };

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <button type="button" className="icon-btn" aria-haspopup="dialog" aria-expanded={open}
        title={t('Notifikationer')}
        aria-label={n ? t('Notifikationer') + ', ' + n + ' ' + (n === 1 ? t('ny') : t('nye')) : t('Notifikationer')}
        onClick={() => setOpen(o => !o)} style={{ position: 'relative' }}>
        <I.Bell size={15}/>
        {n > 0 && <span className="bell-badge" aria-hidden="true">{n > 9 ? '9+' : n}</span>}
      </button>
      {open && (
        <div ref={panel} role="dialog" aria-label={t('Notifikationer')} className="bell-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px 10px', borderBottom: '1px solid var(--c-line-2)' }}>
            <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>
              {t('Notifikationer')}{n > 0 && <span style={{ fontWeight: 400, color: 'var(--c-text-3)' }}> · {n} {n === 1 ? t('ny') : t('nye')}</span>}
            </div>
            {n > 0 && <button type="button" className="btn btn-sm btn-ghost" onClick={markAll}><I.Check className="ic"/> {t('Markér som læst')}</button>}
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {n === 0 && (
              <div style={{ padding: '16px 14px 8px', fontSize: 13, color: 'var(--c-text-2)' }}>
                {t('Ingen nye hændelser fra kunderne.')}
              </div>
            )}
            {n > 0 && <ul className="bell-list">{unseen.map(e => row(e, true)).concat(demoNew.map(e => row(e, true)))}</ul>}
            {(earlier.length > 0 || demoOld.length > 0) && (
              <>
                <div style={{ padding: '10px 14px 4px', fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)' }}>{t('Tidligere')}</div>
                <ul className="bell-list">{earlier.map(e => row(e, false)).concat(demoOld.map(e => row(e, false)))}</ul>
              </>
            )}
            {n === 0 && earlier.length === 0 && demoOld.length === 0 && (
              <div style={{ padding: '0 14px 16px', fontSize: 12.5, color: 'var(--c-text-3)', lineHeight: 1.5 }}>
                {t('Her kommer det, kunden gør i sin portal: leveringer, spørgsmål, indsendelse og adgang til regnskabssystemet.')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Hjælp: sagens faser og hvad knapperne gør (til oplæring) ───────────── */
const HELP_STAGES = [
  ['review', 'Du gennemgår de offentlige data (CVR og årsrapporter) og beslutter, hvad kunden skal sende.'],
  ['material', 'Du vælger punkterne i anmodningen. Kunden ser intet, før du sender.'],
  ['awaiting', 'Kunden uploader i sin portal. Klokken giver besked, når der sker noget.'],
  ['toReview', 'Du godkender eller afviser hvert leveret punkt. Et afvist punkt går tilbage til kunden med din note.'],
  ['memo', 'Materialet er godkendt. Memoets afsnit skrives og gennemgås.'],
  ['ready', 'Klarhedstjekket er grønt, og sagen kan indstilles.'],
  ['submitted', 'Memoet er låst som en version og ligger hos kreditkomitéen. Skal noget ændres, trækkes indstillingen tilbage med en årsag.'],
  ['decided', 'Komitéen har truffet afgørelse. Afslag kan gives i alle faser før indstilling og kræver en årsag.'],
];
// Frister og SLA (til oplæring af nye rådgivere)
const HELP_DEADLINES = [
  ['Sagsfrist', 'Sagens egen frist for en afgørelse. Den står i sagshovedet og på Dataanmodninger, og overskredne sager står øverst i Mine opgaver.'],
  ['Kundens svarfrist', 'Fristen i anmodningen til kunden. Den står i mailen, i kundens portal og på Dataanmodninger.'],
  ['SLA', 'En sag må højst ligge 10 hverdage i samme fase. Dage i fase står i sagshovedet: fra 8 hverdage er de gule (tæt på SLA), og over 10 hverdage står der "over SLA" med rødt. Kladder, indstillede og afgjorte sager tæller ikke.'],
  ['Sidder fast', 'Anmodningen er sendt, men kunden har ikke leveret noget i 3 hverdage. Send en påmindelse fra Dataanmodninger.'],
  ['Overskredet', 'Sagsfristen eller kundens svarfrist er passeret. Sagen står øverst under Mest presserende.'],
];
const HELP_BUTTONS = [
  ['Anmod om materiale', 'Åbner materialevalget. Når punkterne er valgt, sender samme knap anmodningen til kunden med frist og et link til portalen.'],
  ['Send opdatering', 'Sender ændringer til en anmodning, som kunden allerede har fået.'],
  ['Påmind', 'Sender en påmindelse om de punkter, der mangler. Den står i sagens historik og på Dataanmodninger. Er kunden allerede påmindet i dag, spørger demoen først.'],
  ['Godkend og Afvis', 'Tager stilling til et leveret punkt. Afvis kræver en note til kunden.'],
  ['Kundeside', 'Viser portalen, som kunden ser den.'],
  ['Indstil til kreditkomité', 'Kører klarhedstjekket, låser memoet og gemmer den indstillede version.'],
  ['Flyt sagen', 'Menuen (…) ved sagen i Mine opgaver giver sagen til en anden rådgiver.'],
  ['Nulstil demo', 'Nederst i menuen til venstre og i menuen under dit navn. Sletter alt, demoen har gemt, og starter forfra.'],
];

// Piloten (CW_MEMO_MODE 'copilot'): memoet skrives i Word med Copilot, og der
// indstilles ikke i Crediwire. Faser og knapper uden indstilling.
function helpStages() {
  if (window.CW_MEMO_MODE === 'builtin') return HELP_STAGES;
  return HELP_STAGES.filter(([k]) => k !== 'ready' && k !== 'submitted')
    .map(([k, txt]) => k === 'memo' ? [k, 'Materialet er godkendt. Du henter sagens dokumenter under Credit memo og skriver memoet i Word med Copilot.']
      : k === 'decided' ? [k, 'Komitéen har truffet afgørelse. Afslag kan gives i alle faser og kræver en årsag.'] : [k, txt]);
}
function helpButtons() {
  if (window.CW_MEMO_MODE === 'builtin') return HELP_BUTTONS;
  return HELP_BUTTONS.map(([b, txt]) => b === 'Indstil til kreditkomité'
    ? ['Hent alle dokumenter', 'Under Credit memo: henter sagens materiale, kundens filer, de offentlige data og Crediwires egne eksporter, så du kan fortsætte i Copilot.']
    : [b, txt]);
}

// Hjælpens tre emner som folde med antal (samme mønster som Anmod om materiale)
function HelpList({ items }) {
  return (
    <dl className="help-list">
      {items.map(([b, txt]) => (
        <div key={b} className="cw-row">
          <div className="cw-row-main">
            <dt className="help-term">{t(b)}</dt>
            <dd>{t(txt)}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

function HelpButton() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  CW.useDialog(ref, open, () => setOpen(false));
  // Fasernes navne kommer fra sagsmodellen, så de er de samme som i sagshovedet
  const stages = helpStages().map(([k, txt], i) => [(i + 1) + '. ' + t(DATA.STATUS[k].label), txt]);
  return (
    <>
      <button type="button" className="icon-btn" title={t('Hjælp')} aria-label={t('Hjælp')} aria-haspopup="dialog" onClick={() => setOpen(true)}><I.Help size={15}/></button>
      {open && (
        <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }} style={{ zIndex: 1300, padding: 16 }}>
          <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby="cw-help-title"
            style={{ width: 620, maxWidth: '100%', maxHeight: 'calc(100vh - 40px)' }}>
            <div className="modal-head" style={{ alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 id="cw-help-title" className="modal-title" style={{ margin: 0 }}>{t('Sådan arbejder du med en sag')}</h2>
                <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.5 }}>
                  {t('Demoen gemmer alt i browseren, også ved genindlæsning og sprogskift. Kun Nordhavn Composite (sag 2026-0184) er udfyldt med data.')}
                </div>
              </div>
              <button type="button" className="icon-btn" aria-label={t('Luk hjælp')} onClick={() => setOpen(false)}><I.X size={14}/></button>
            </div>
            <div className="modal-body help-body">
              <CWFold id="cw-help-stages" label={t('Sagens faser')} count={stages.length}><HelpList items={stages}/></CWFold>
              <CWFold id="cw-help-deadlines" label={t('Frister og SLA')} count={HELP_DEADLINES.length}><HelpList items={HELP_DEADLINES}/></CWFold>
              <CWFold id="cw-help-buttons" label={t('Hvad knapperne gør')} count={helpButtons().length}><HelpList items={helpButtons()}/></CWFold>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Ny sag-guiden (grænseflade 3) ──────────────────────────────────────────
   Åbnes fra knappen Ny sag (open) eller fra andre skærme med
   window.dispatchEvent(new CustomEvent('cw-new-case', { detail: { name, cvr, type?, amount? } })),
   fx en række uden sag i Porteføljeanalyse. detail sendes til guiden som prefill. */
function NewCaseHost({ open, close, go }) {
  const [prefill, setPrefill] = React.useState(null);
  const [n, setN] = React.useState(0); // ny guide for hver forudfyldning
  // Kvittering for "Nulstil demo" efter genindlæsningen
  React.useEffect(() => {
    let flag = null;
    try { flag = sessionStorage.getItem('cw_reset_done'); sessionStorage.removeItem('cw_reset_done'); } catch (e) {}
    if (!flag) return;
    const id = setTimeout(() => CW.toast(t('Demoen er nulstillet. Sagen, uploads, memoet og nye sager er slettet, og alt starter forfra.')), 400);
    return () => clearTimeout(id);
  }, []);
  React.useEffect(() => {
    const on = (e) => { setPrefill(Object.assign({}, (e && e.detail) || {})); setN(x => x + 1); };
    window.addEventListener('cw-new-case', on);
    return () => window.removeEventListener('cw-new-case', on);
  }, []);
  if (!open && !prefill) return null;
  const done = () => { setPrefill(null); close(); };
  return <NewCaseModal key={n} close={done} go={go} prefill={prefill || undefined}/>;
}

window.Sidebar = Sidebar;
window.NewCaseHost = NewCaseHost;
window.Topbar = Topbar;
window.CaseSearch = CaseSearch;
window.LanguageSwitcher = LanguageSwitcher;
window.statusPill = statusPill;
window.cwOpenCase = cwOpenCase;
window.confirmResetDemo = confirmResetDemo;
