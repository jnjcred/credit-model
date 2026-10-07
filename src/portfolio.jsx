// Mine opgaver: Mettes sager med indhentningen af materiale fra kunden.
// Bygget efter designet "Mine opgaver v8" (Claude Design, 7. oktober) i
// prototypens eget designsystem.
//
// REGLER (som i designet)
// Indhentning udledes KUN af de anmodede punkter, aldrig af fritekstbeskeder:
//   1. Afventer din gennemgang: mindst ét punkt er modtaget og ikke gennemgået,
//      eller kunden har stillet et spørgsmål
//   2. Afventer kunden: ellers mindst ét punkt hos kunden (ikke modtaget, eller dit
//      spørgsmål til et punkt venter på svar)
//   3. Alt materiale godkendt: alle punkter er godkendt
//   Ikke anmodet: anmodningen er ikke sendt (kun offentlige data)
//   Afsluttet: lukket med "Afslut sag" (årsag kræves) eller afgjort. Skjult i fanerne,
//   findes med søgning eller filteret Indhentning.
// Ventetid: dage siden den seneste handling fra den, der gav bolden videre. Beskeder
//   og påmindelser nulstiller den aldrig.
// Påmindelse: kan sendes, når sagen afventer kunden, ventetiden er mindst 14 dage, og
//   der ikke er sendt en påmindelse de seneste 7 dage. Den ændrer hverken status eller
//   ventetid, og den kan fortrydes i 6 sekunder (først derefter sendes den).
// Nyt siden sidst: filer og spørgsmål, der er kommet, siden du sidst åbnede sagen.
//
// Nordhavn (sag 1) læses levende af CW. De øvrige sager har faste tal i
// DATA.CASES[].collect. Det, rådgiveren gør her (set, påmindet, afsluttet,
// gemte visninger), gemmes i localStorage 'kabul:tasks'.

const TASK_STEPS = [
  ['review', 'Afventer din gennemgang'],
  ['new', 'Ikke anmodet'],
  ['waiting', 'Afventer kunden'],
  ['done', 'Alt materiale godkendt'],
  ['closed', 'Afsluttet'],
];
const TASK_STEP_LABEL = Object.fromEntries(TASK_STEPS);
// Fast rækkefølge: det, der afventer dig, først; inden for hver gruppe længste ventetid først
const TASK_RANK = { review: 0, new: 1, waiting: 2, done: 3, closed: 4 };
const TASK_MAXD = 60;          // skyderens øverste værdi (60 = ingen øvre grænse)
const TASK_OVERDUE = 14;       // dage før "Send påmindelse" vises
const TASK_REMIND_GAP = 7;     // mindst dage mellem to påmindelser
const TASK_UNDO_MS = 6000;
const TASK_REASONS = ['Afsluttet uden for Crediwire', 'Kunden har trukket sig', 'Afslag'];
const TASK_ALL = { steps: [], age: [0, TASK_MAXD], rem: [0, TASK_MAXD], onlyRem: false, fresh: false };
const TASK_VIEWS = [
  { key: 'all', label: 'Alle', f: TASK_ALL },
  { key: 'mine', label: 'Afventer dig', f: Object.assign({}, TASK_ALL, { steps: ['review', 'new'] }) },
  { key: 'customer', label: 'Afventer kunden', f: Object.assign({}, TASK_ALL, { steps: ['waiting'] }) },
];
const TASK_KEY = 'kabul:tasks';

// Ord, der har en anden engelsk oversættelse andre steder i appen ("Afventer" = "Pending",
// "Kunden" = "The customer"); her er de kolonnenavn og kort værdi
const TASK_EN = { 'Afventer': 'Waiting on', 'Kunden': 'Customer', 'Gå til sagen': 'Go to case' };
const tk = (s) => (window.CW_LANG === 'en' && TASK_EN[s]) || t(s);
const taskFill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
const taskNorm = (f) => JSON.stringify({ s: [...f.steps].sort(), a: f.age, r: f.rem, o: f.onlyRem, n: f.fresh });
const taskInRange = (v, r) => v >= r[0] && (r[1] >= TASK_MAXD || v <= r[1]);
const taskFull = (r) => r[0] === 0 && r[1] >= TASK_MAXD;
const taskRangeText = (r) => r[1] >= TASK_MAXD ? (r[0] === 0 ? t('Alle') : taskFill(t('{n}+ dage'), { n: r[0] })) : taskFill(t('{a}–{b} dage'), { a: r[0], b: r[1] });
const taskPlural = (n, one, many) => taskFill(n === 1 ? t(one) : t(many), { n });
const taskRel = (d) => d == null ? '–' : d === 0 ? t('I dag') : d === 1 ? t('I går') : taskFill(t('{n} dage'), { n: d });

/* ── Det, rådgiveren gør i listen (gemt i browseren) ─────────────────────── */
function taskStore() {
  try { const v = JSON.parse(localStorage.getItem(TASK_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
function taskPatch(fn) {
  const cur = taskStore();
  try { localStorage.setItem(TASK_KEY, JSON.stringify(Object.assign({}, cur, fn(cur)))); } catch (e) {}
  if (window.CW && CW.bump) CW.bump();
}
function taskMarkSeen(id) {
  taskPatch(s => ({ seen: Object.assign({}, s.seen, { [id]: new Date().toISOString() }) }));
}
// Når en sag åbnes (fra listen, søgningen, notifikationer …), er det nye set
if (!window.__cwTaskSeenHook) {
  window.__cwTaskSeenHook = true;
  window.addEventListener('cw-route-changed', (e) => {
    const m = /^workspace:(\d+)/.exec((e.detail && e.detail.route) || '');
    if (m) taskMarkSeen(Number(m[1]));
  });
}

// Hele kalenderdage fra iso til i dag
function taskDays(iso) {
  if (!iso) return null;
  const a = new Date(iso), b = new Date();
  if (isNaN(a)) return null;
  const d0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const d1 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.round((d1 - d0) / 864e5));
}

/* ── Indhentningen pr. sag ───────────────────────────────────────────────── */
// Faste sager: tallene står i DATA.CASES[].collect. Uden collect (sager fra Ny
// sag-guiden, eller en kollegas sag, der er flyttet til dig) følger tallene sagens
// anmodning og fase. Påmindelser er de samme som på Dataanmodninger (DATA.remindersFor).
function taskStaticCollect(c, store) {
  const req = !['draft', 'review', 'material'].includes(c.statusKey);
  let k = c.collect;
  if (!k) {
    const r = (DATA.requestRows ? DATA.requestRows() : []).find(x => x.caseId === c.id);
    const total = (r && r.total) || (c.request && c.request.items ? c.request.items.length : 0);
    const received = (r && r.received) || 0;
    const toReview = (r && r.toReview) || 0;
    k = c.statusKey === 'toReview' ? { total, approved: received - toReview, review: Math.max(1, toReview) }
      : c.statusKey === 'awaiting' ? { total: Math.max(total, received + 1), approved: received }
      : { total, approved: req ? total : 0 };
  }
  const seen = !!(store.seen && store.seen[c.id]);
  const sent = DATA.remindersFor ? DATA.remindersFor(c.id) : [];
  const latest = sent.length ? sent[sent.length - 1].at : null;
  return {
    req,
    total: k.total || 0, approved: k.approved || 0, review: k.review || 0, q: k.q || 0, aq: k.aq || 0,
    since: () => (k.sinceDays != null ? k.sinceDays : taskDays(c.stageSince)),
    lastRemind: latest ? taskDays(latest) : (k.lastRemindDays != null ? k.lastRemindDays : null),
    reminders: (k.reminders || 0) + sent.length,
    freshF: seen ? 0 : (k.freshF || 0), freshQ: seen ? 0 : (k.freshQ || 0),
  };
}
// Nordhavn: punkterne, samtalen og historikken i CW
function taskLiveCollect(c, store) {
  const req = CW.request();
  const p = CW.progress();
  const log = CW.activity();
  const lastAt = (pred) => { for (let i = log.length - 1; i >= 0; i--) if (pred(log[i])) return log[i].at; return null; };
  const seen = store.seen && store.seen[c.id];
  const after = (at) => !seen || (at && at > seen);
  const rems = log.filter(e => e.type === 'reminder');
  return {
    req: !!req,
    total: req ? p.total : CW.draftItems().length,
    approved: req ? p.approved : 0,
    review: req ? p.toReview : 0,
    aq: req ? p.rejected : 0,
    outstanding: req ? p.pending + p.delegated : null,
    q: req && CW.conversationWaitsOn() === 'rådgiver' ? 1 : 0,
    // Ventetid fra den seneste handling, der gav bolden videre
    since: (step) => {
      const at = step === 'review' ? lastAt(e => e.who === 'kunde' && ['received', 'noted', 'question', 'reply'].includes(e.type))
        : step === 'waiting' ? lastAt(e => e.who === 'rådgiver' && ['request-sent', 'request-updated', 'rejected', 'approved'].includes(e.type))
        : step === 'done' ? lastAt(e => e.type === 'approved')
        : null;
      return taskDays(at || DATA.caseStageSince(c.id));
    },
    lastRemind: rems.length ? taskDays(rems[rems.length - 1].at) : null,
    reminders: rems.length,
    freshF: CW.allUploads().filter(f => (f.by || 'kunde') === 'kunde' && after(f.at)).length,
    freshQ: CW.conversation().filter(m => m.from === 'kunde' && !m.preview && after(m.at) && /\?\s*$/.test(m.text || '')).length,
  };
}
/** Én sag i listen: indhentning (step), ventetid, påmindelser og nyt siden sidst. */
function taskDerive(c, store, pending) {
  const k = CW.isLiveCase(c.id) ? taskLiveCollect(c, store) : taskStaticCollect(c, store);
  const closed = store.closed && store.closed[c.id];
  const outstanding = k.outstanding != null ? k.outstanding : k.total - k.approved - k.review;
  let step;
  if (closed || DATA.caseIsDecided(c)) step = 'closed';
  else if (!k.req) step = 'new';
  else if (k.review > 0 || k.q > 0) step = 'review';
  else if (outstanding > 0 || k.aq > 0) step = 'waiting';
  else step = 'done';
  const since = step === 'closed' ? null : k.since(step);
  // En påmindelse, der kan fortrydes endnu, tæller som sendt i dag
  const sentNow = pending && pending.id === c.id;
  const lastRemind = sentNow ? 0 : k.lastRemind;
  const reminders = k.reminders + (sentNow ? 1 : 0);
  const remind = step === 'waiting' && since != null && since >= TASK_OVERDUE && (lastRemind == null || lastRemind >= TASK_REMIND_GAP);
  const fresh = step !== 'closed';
  return {
    c, id: c.id, name: c.name, caseNr: c.caseNr, cvr: c.cvr || '',
    step, since, total: k.total, received: k.approved + k.review, aq: k.aq,
    lastRemind, reminders, remind,
    freshF: fresh ? k.freshF : 0, freshQ: fresh ? k.freshQ : 0,
    hasNew: fresh && !!(k.freshF || k.freshQ),
    closedReason: closed ? t(TASK_REASONS[closed.reason] || TASK_REASONS[0]) : DATA.caseIsDecided(c) ? t(c.decision || (DATA.STATUS[c.statusKey] || {}).label || 'Afgjort') : '',
  };
}
function taskPasses(r, f) {
  if (f.steps.length ? !f.steps.includes(r.step) : r.step === 'closed') return false;
  if (!taskInRange(r.since == null ? 0 : r.since, f.age)) return false;
  if (r.lastRemind == null) { if (f.onlyRem || !taskFull(f.rem)) return false; }
  else if (!taskInRange(r.lastRemind, f.rem)) return false;
  if (f.fresh && !r.hasNew) return false;
  return true;
}
// Filterets chips. setF er valgfri (uden den kan chipsene ikke fjernes, fx til visningsnavne)
function taskChips(f, setF) {
  const set = setF || (() => {});
  const chips = [];
  f.steps.forEach(s => chips.push({ label: t(TASK_STEP_LABEL[s]), remove: () => set({ steps: f.steps.filter(x => x !== s) }) }));
  if (!taskFull(f.age)) chips.push({ label: t('Ventetid') + ' ' + taskRangeText(f.age), remove: () => set({ age: [0, TASK_MAXD] }) });
  if (!taskFull(f.rem)) chips.push({ label: taskFill(t('Påmindet for {range} siden'), { range: taskRangeText(f.rem) }), remove: () => set({ rem: [0, TASK_MAXD] }) });
  if (f.onlyRem && taskFull(f.rem)) chips.push({ label: t('Kun påmindede'), remove: () => set({ onlyRem: false }) });
  if (f.fresh) chips.push({ label: t('Nyt siden sidst'), remove: () => set({ fresh: false }) });
  return chips;
}
// Fanens navn: de faste oversættes, gemte visninger navngives ud fra filteret (på det aktuelle sprog)
function taskViewLabel(v) {
  if (TASK_VIEWS.some(x => x.key === v.key)) return t(v.label);
  return taskChips(v.f).map(c => c.label).join(' + ') || v.label || t('Visning');
}
const taskOwner = (step) => (step === 'review' || step === 'new') ? 'dig' : step === 'waiting' ? 'kunden' : null;
function taskMine() { return DATA.CASES.filter(c => c.responsible === DATA.ME); }
/** Menuens tal: mine sager, der afventer mig (Afventer din gennemgang og Ikke anmodet). */
function cwTasksAwaitingMe() {
  const store = taskStore();
  return taskMine().map(c => taskDerive(c, store, null)).filter(r => taskOwner(r.step) === 'dig').length;
}

// Åbn en sag fra Mine opgaver: tilbage fører til Mine opgaver (ryd 'cw_back' fra analysen)
function openCaseFromList(id, go) {
  try { sessionStorage.removeItem('cw_back'); } catch (e) {}
  taskMarkSeen(id);
  go('workspace:' + id);
}

/* ── Siden ───────────────────────────────────────────────────────────────── */
function Portfolio({ go }) {
  CW.useCase(); // sagen, påmindelser og det gemte følger den fælles tilstand
  const saved = React.useMemo(() => DATA.viewGet('cases') || {}, []);
  const [f, setFState] = React.useState(() => (saved.f && Array.isArray(saved.f.steps) ? saved.f : TASK_ALL));
  const [query, setQuery] = React.useState('');
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [menu, setMenu] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);
  const [pending, setPending] = React.useState(null); // { id, name, timer } påmindelse, der kan fortrydes
  const [, setTick] = React.useState(0);
  const searchRef = React.useRef(null);
  const filterRef = React.useRef(null);
  const pendingRef = React.useRef(null);
  pendingRef.current = pending;

  const setF = (patch) => setFState(s => Object.assign({}, s, patch));
  // Gem visningen i sessionen, så den står som før, når man kommer tilbage fra en sag
  const mounted = React.useRef(false);
  React.useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    DATA.viewSet('cases', { f });
  }, [f]);

  // "/" fokuserer søgningen
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const a = document.activeElement;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
      if (document.querySelector('[aria-modal="true"], .tk-menu')) return;
      e.preventDefault();
      if (searchRef.current) searchRef.current.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // En påmindelse, der stadig kan fortrydes, sendes, hvis man forlader siden (også ved genindlæsning)
  React.useEffect(() => {
    const flush = () => { const p = pendingRef.current; if (p) { pendingRef.current = null; clearTimeout(p.timer); commitRemind(p.id); } };
    const onRem = () => setTick(n => n + 1);
    window.addEventListener('pagehide', flush);
    window.addEventListener('cw-reminders-changed', onRem);
    return () => { window.removeEventListener('pagehide', flush); window.removeEventListener('cw-reminders-changed', onRem); flush(); };
  }, []);

  const store = taskStore();
  const everyone = taskMine().map(c => taskDerive(c, store, pending));
  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const match = (r) => r.name.toLowerCase().includes(q) || r.caseNr.toLowerCase().includes(q) || (qDigits.length >= 3 && r.cvr.replace(/\D/g, '').includes(qDigits));
  const filtered = everyone.filter(r => taskPasses(r, f));
  const list = (q ? everyone.filter(match) : filtered).slice()
    .sort((a, b) => TASK_RANK[a.step] - TASK_RANK[b.step] || (b.since || 0) - (a.since || 0));

  const savedViews = Array.isArray(store.views) ? store.views : [];
  const allViews = TASK_VIEWS.concat(savedViews);
  const cur = taskNorm(f);
  const activeView = q ? null : allViews.find(v => taskNorm(v.f) === cur) || null;
  const onBase = TASK_VIEWS.some(v => taskNorm(v.f) === cur);
  const activeSaved = activeView && savedViews.some(v => v.key === activeView.key) ? activeView : null;

  const chips = taskChips(f, setF);
  const showChips = !q && chips.length > 0 && !onBase;
  const filterCount = onBase ? 0 : chips.length;

  const pickView = (key) => { const v = allViews.find(x => x.key === key); if (!v) return; setFState(v.f); setQuery(''); setFilterOpen(false); };
  const saveView = () => {
    const v = { key: 'v' + Date.now(), f };
    taskPatch(s => ({ views: (Array.isArray(s.views) ? s.views : []).concat([v]) }));
    CW.toast(taskFill(t('Visningen "{navn}" er gemt'), { navn: taskViewLabel(v) }));
  };
  const deleteView = (v) => {
    taskPatch(s => ({ views: (Array.isArray(s.views) ? s.views : []).filter(x => x.key !== v.key) }));
    setFState(TASK_ALL);
    CW.toast(taskFill(t('Visningen "{navn}" er slettet'), { navn: taskViewLabel(v) }), { action: { label: t('Fortryd'), onClick: () => { taskPatch(s => ({ views: (Array.isArray(s.views) ? s.views : []).concat([v]) })); setFState(v.f); } } });
  };

  // Påmindelse: vises som sendt med det samme, sendes først, når fortrydelsen er udløbet
  function commitRemind(id) {
    // Samme påmindelse som på Dataanmodninger og i sagen (historikken)
    if (DATA.remindCase) DATA.remindCase(id, DATA.ADVISOR && DATA.ADVISOR.name);
    else if (CW.isLiveCase(id)) CW.remind([], {});
  }
  const startTimer = (id) => setTimeout(() => { pendingRef.current = null; commitRemind(id); setPending(null); }, TASK_UNDO_MS);
  const sendRemind = (r) => {
    const prev = pendingRef.current;
    if (prev) { pendingRef.current = null; clearTimeout(prev.timer); commitRemind(prev.id); }
    const p = { id: r.id, name: r.name, timer: startTimer(r.id) };
    pendingRef.current = p;
    setPending(p);
    // Knappen forsvinder; fokus til rækkens "Gå til sagen" (beskeden læses op via den levende region)
    CW.focusSoon('[data-task-row="' + r.id + '"] .tk-open');
  };
  // Mens musen eller fokus er på beskeden, går tiden ikke (WCAG 2.2.1)
  const holdRemind = (on) => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    const next = Object.assign({}, p, { timer: on ? null : startTimer(p.id) });
    pendingRef.current = next;
    setPending(next);
  };
  const undoRemind = () => {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingRef.current = null;
    setPending(null);
    CW.focusSoon('[data-task-row="' + p.id + '"] .tk-remind, [data-task-row="' + p.id + '"] .tk-open');
  };

  const closeCase = (r, reason) => {
    taskPatch(s => ({ closed: Object.assign({}, s.closed, { [r.id]: { reason, at: new Date().toISOString() } }) }));
    setConfirm(null);
    CW.toast(taskFill(t('{navn} er afsluttet'), { navn: r.name }), { action: { label: t('Fortryd'), onClick: () => taskPatch(s => { const m = Object.assign({}, s.closed); delete m[r.id]; return { closed: m }; }) } });
    CW.focusSoon('#tk-search');
  };

  const counts = {};
  TASK_STEPS.forEach(([k]) => { counts[k] = everyone.filter(r => r.step === k).length; });

  return (
    <>
      <Topbar crumbs={[t('Mine opgaver')]} right={null}/>
      <div className="scroll">
        <div className="page tk-page" style={{ maxWidth: 1100 }}>
          <h1 className="page-title">{t('Mine opgaver')}</h1>

          <div className="tk-search-row" ref={filterRef}>
            <label className="tk-search">
              <I.Search size={15} aria-hidden="true"/>
              <span className="sr-only" style={TASK_HIDDEN}>{t('Find kunde')}</span>
              <input id="tk-search" ref={searchRef} type="search" value={query} onChange={e => setQuery(e.target.value)}
                placeholder={t('Find kunde')} aria-describedby={q ? 'tk-search-note' : undefined} aria-keyshortcuts="/"
                onKeyDown={e => { if (e.key === 'Escape' && query) { e.preventDefault(); setQuery(''); } }}/>
              <kbd className="tk-kbd" aria-hidden="true">/</kbd>
            </label>
            <button type="button" className={'tk-filter-btn' + (filterOpen ? ' on' : '')} aria-expanded={filterOpen} aria-controls="tk-filter"
              onClick={() => { setFilterOpen(o => !o); setMenu(null); }}>
              <I.Filter size={14} aria-hidden="true"/>
              <span>{t('Filter')}</span>
              {filterCount > 0 && <><span className="tk-badge" aria-hidden="true">{filterCount}</span><span style={TASK_HIDDEN}>{', ' + taskPlural(filterCount, '{n} filter', '{n} filtre')}</span></>}
            </button>
            {filterOpen && (
              <TaskFilter f={f} setF={setF} counts={counts} resultCount={filtered.length}
                onClear={() => setFState(TASK_ALL)} onClose={() => setFilterOpen(false)} onApply={() => { setQuery(''); setFilterOpen(false); }} anchor={filterRef}/>
            )}
          </div>

          <ListTabs idBase="tk-view" ariaLabel={t('Visninger')} value={activeView ? activeView.key : ''} onChange={pickView}
            tabs={allViews.map(v => ({ k: v.key, l: taskViewLabel(v), n: everyone.filter(r => taskPasses(r, v.f)).length }))}/>

          {showChips && (
            <div className="tk-chips">
              {chips.map(c => (
                <span key={c.label} className="tk-chip">
                  <span>{c.label}</span>
                  <button type="button" onClick={c.remove} aria-label={taskFill(t('Fjern filteret {navn}'), { navn: c.label })}><I.X size={10}/></button>
                </span>
              ))}
              {!activeView && <button type="button" className="tk-link" onClick={saveView}>{t('Gem som visning')}</button>}
              {activeSaved && <button type="button" className="tk-link muted" onClick={() => deleteView(activeSaved)}>{t('Slet visning')}</button>}
            </div>
          )}

          {q && <p id="tk-search-note" className="tk-note">{t('Søger i alle dine sager, også afsluttede. Filtre gælder ikke under søgning.')}</p>}

          <div id="tk-view-panel" role="tabpanel" aria-labelledby={activeView ? 'tk-view-' + activeView.key : undefined} aria-label={activeView ? undefined : t('Mine sager')}>
          <div className="card tk-table" role="table" aria-label={t('Mine sager')} aria-rowcount={list.length + 1}>
            <div className="tk-row tk-head" role="row">
              <span role="columnheader">{t('Kunde')}</span>
              <span role="columnheader">{tk('Afventer')}</span>
              <span role="columnheader">{t('Indhentning')}</span>
              <span role="columnheader"><TaskTip label={t('Ventetid')} text={t('Hvor længe sagen har ligget hos den, der skal handle nu.')}/></span>
              <span role="columnheader"><span style={TASK_HIDDEN}>{t('Handlinger')}</span></span>
            </div>
            {list.map(r => (
              <TaskRow key={r.id} r={r} go={go} menuOpen={menu === r.id}
                onMenu={(open) => { setMenu(open ? r.id : null); setFilterOpen(false); }}
                onRemind={() => sendRemind(r)} onClose={() => { setMenu(null); setConfirm(r); }}/>
            ))}
            {list.length === 0 && (
              <div className="tk-empty" role="row"><span role="cell">{q ? t('Ingen kunder fundet') : t('Ingen sager matcher filtrene')}</span></div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Skærmlæsere: en levende region, der altid er der, så beskeden læses op */}
      <div role="status" aria-live="polite" style={TASK_HIDDEN}>{pending ? taskFill(t('Påmindelse sendt til {navn}'), { navn: pending.name }) : ''}</div>
      {pending && (
        <div className="tk-toast" onMouseEnter={() => holdRemind(true)} onMouseLeave={() => holdRemind(false)}
          onFocus={() => holdRemind(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) holdRemind(false); }}>
          <span aria-hidden="true">{taskFill(t('Påmindelse sendt til {navn}'), { navn: pending.name })}</span>
          <button type="button" onClick={undoRemind} aria-label={taskFill(t('Fortryd påmindelsen til {navn}'), { navn: pending.name })}>{t('Fortryd')}</button>
        </div>
      )}
      {confirm && <TaskCloseModal r={confirm} onCancel={() => { const id = confirm.id; setConfirm(null); CW.focusSoon('[data-task-row="' + id + '"] .tk-more'); }} onConfirm={(reason) => closeCase(confirm, reason)}/>}
    </>
  );
}
const TASK_HIDDEN = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };

/* Én sag: kunde, hvem der har bolden, indhentningen med linjerne under, ventetid og handlinger.
   Hvem der har bolden, ses af vægten: din tur er mørk og fed, kundens tur grå. Ingen rød. */
function TaskRow({ r, go, menuOpen, onMenu, onRemind, onClose }) {
  const closed = r.step === 'closed';
  const owner = taskOwner(r.step);
  const open = () => openCaseFromList(r.id, go);
  const remindedText = r.lastRemind == null ? '' : (r.reminders <= 1 ? t('Påmindet') : taskFill(t('{n} påmindelser · senest'), { n: r.reminders })) + ' '
    + (r.lastRemind === 0 ? t('i dag') : r.lastRemind === 1 ? t('i går') : taskFill(t('for {n} dage siden'), { n: r.lastRemind }));
  return (
    <div className={'tk-row' + (closed ? ' closed' : '')} role="row" data-task-row={r.id}>
      <div role="cell" className="tk-cust">
        <span className="tk-name">{r.name}</span>
        <span className="mono tk-nr">{r.caseNr}</span>
      </div>
      <div role="cell" className={'tk-owner' + (owner === 'dig' ? ' me' : '')}>
        <span className="tk-cap" aria-hidden="true">{tk('Afventer')}: </span>{owner === 'dig' ? t('Dig') : owner === 'kunden' ? tk('Kunden') : '–'}
      </div>
      <div role="cell" className="tk-status">
        <span className={'tk-step' + (owner === 'dig' && !closed ? ' me' : '')}>{t(TASK_STEP_LABEL[r.step])}</span>
        {closed ? <span className="tk-line">{r.closedReason}</span>
          : r.step !== 'done' && r.total > 0 && <span className="tk-line">{taskFill(t('{a} af {b} modtaget'), { a: r.received, b: taskPlural(r.total, '{n} fil', '{n} filer') })}</span>}
        {r.step === 'waiting' && r.aq > 0 && <span className="tk-line">{t('Venter på svar på dit spørgsmål')}</span>}
        {r.step === 'waiting' && r.lastRemind != null && <span className="tk-line">{remindedText}</span>}
        {r.remind && <button type="button" className="tk-link tk-remind" onClick={onRemind} aria-label={(r.reminders ? t('Send ny påmindelse') : t('Send påmindelse')) + ': ' + r.name}>{r.reminders ? t('Send ny påmindelse') : t('Send påmindelse')}</button>}
        {r.freshF > 0 && <button type="button" className="tk-link" onClick={open} aria-label={taskPlural(r.freshF, '{n} ny fil', '{n} nye filer') + ': ' + r.name}>{taskPlural(r.freshF, '{n} ny fil', '{n} nye filer')}</button>}
        {r.freshQ > 0 && <button type="button" className="tk-link" onClick={open} aria-label={taskPlural(r.freshQ, '{n} nyt spørgsmål', '{n} nye spørgsmål') + ': ' + r.name}>{taskPlural(r.freshQ, '{n} nyt spørgsmål', '{n} nye spørgsmål')}</button>}
      </div>
      <div role="cell" className="tk-since"><span className="tk-cap" aria-hidden="true">{t('Ventetid')}: </span>{taskRel(r.since)}</div>
      <div role="cell" className="tk-acts">
        <button type="button" className="btn tk-open" onClick={open} aria-label={tk('Gå til sagen') + ': ' + r.name}>{tk('Gå til sagen')}</button>
        {!closed && (
          <button type="button" className="icon-btn tk-more" aria-haspopup="menu" aria-expanded={menuOpen}
            aria-label={t('Flere handlinger for') + ' ' + r.name} onClick={(e) => { e.stopPropagation(); onMenu(!menuOpen); }}>
            <I.MoreH size={16}/>
          </button>
        )}
        {menuOpen && <TaskMenu r={r} go={go} onClose={() => onMenu(false)} onCloseCase={onClose}/>}
      </div>
    </div>
  );
}

// Menuen ved en sag: Afslut sag, og flyt sagen til en anden rådgiver
function TaskMenu({ r, go, onClose, onCloseCase }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const first = ref.current && ref.current.querySelector('[role^=menuitem]');
    if (first) first.focus();
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target) && !(e.target.closest && e.target.closest('.tk-more'))) onClose(); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const back = () => { const b = ref.current && ref.current.parentNode.querySelector('.tk-more'); if (b) b.focus(); };
  const onKey = (e) => {
    const items = Array.prototype.slice.call(ref.current.querySelectorAll('[role^=menuitem]'));
    const i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); back(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    else if (e.key === 'Tab') onClose();
  };
  const move = (m) => {
    const prev = r.c.responsible;
    onClose();
    if (m.short === prev) return;
    CW.setOwner(r.id, m.short);
    CW.toast(t('Sagen er flyttet til') + ' ' + m.short + ' (' + r.name + ')', { action: { label: t('Fortryd'), onClick: () => CW.setOwner(r.id, prev) } });
    CW.focusSoon('#tk-search');
  };
  return (
    <div ref={ref} role="menu" aria-label={t('Handlinger for') + ' ' + r.name} className="tk-menu" onKeyDown={onKey}>
      <button type="button" role="menuitem" className="menu-item" onClick={onCloseCase}>{t('Afslut sag')}</button>
      <div className="tk-menu-sep" role="separator"/>
      <div className="tk-menu-head" aria-hidden="true">{t('Flyt sagen til')}</div>
      {DATA.TEAM.map(m => {
        const cur = m.short === r.c.responsible;
        return (
          <button key={m.short} type="button" role="menuitemradio" aria-checked={cur} className="menu-item" onClick={() => move(m)}
            aria-label={t('Flyt sagen til') + ' ' + m.name}>
            <span style={{ flex: 1 }}>{m.name}</span>{cur && <I.Check size={13}/>}
          </button>
        );
      })}
    </div>
  );
}

// "Afslut sag": en årsag skal vælges (den første er valgt på forhånd)
function TaskCloseModal({ r, onCancel, onConfirm }) {
  const ref = React.useRef(null);
  const [reason, setReason] = React.useState(0);
  CW.useDialog(ref, true, onCancel);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby="tk-close-h" style={{ width: 440 }}>
        <div className="modal-head">
          <div className="modal-title" id="tk-close-h">{t('Afslut sag')}</div>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label={t('Luk')}><I.X size={16}/></button>
        </div>
        <div className="modal-body">
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--c-ink)', fontWeight: 600 }}>{r.name}</p>
          <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <legend style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginBottom: 8, padding: 0 }}>{t('Årsag')}</legend>
            {TASK_REASONS.map((l, i) => (
              <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                <input type="radio" name="tk-reason" checked={reason === i} onChange={() => setReason(i)} style={{ accentColor: 'var(--c-primary)', margin: 0 }}/>
                {t(l)}
              </label>
            ))}
          </fieldset>
          <p className="muted" style={{ margin: '14px 0 0', fontSize: 12.5, lineHeight: 1.5 }}>{t('Sagen forsvinder fra fanerne. Du kan stadig finde den med søgningen.')}</p>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onCancel}>{t('Annullér')}</button>
          <button type="button" className="btn btn-primary" onClick={() => onConfirm(reason)}>{t('Afslut sag')}</button>
        </div>
      </div>
    </div>
  );
}

// Overskriften "Ventetid" med forklaringen (hover og tastatur)
function TaskTip({ label, text }) {
  const [on, setOn] = React.useState(false);
  return (
    <span className="tk-tipw" onMouseEnter={() => setOn(true)} onMouseLeave={() => setOn(false)}>
      {label}
      <button type="button" className="tk-tip-btn" aria-label={label + ': ' + text}
        onFocus={() => setOn(true)} onBlur={() => setOn(false)} onKeyDown={e => { if (e.key === 'Escape') setOn(false); }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>
      </button>
      {on && <span role="tooltip" className="tk-tip show" aria-hidden="true">{text}</span>}
    </span>
  );
}

// Filteret: Indhentning, Ventetid, Seneste påmindelse og Nyt siden sidst
function TaskFilter({ f, setF, counts, resultCount, onClear, onClose, onApply, anchor }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const first = ref.current && ref.current.querySelector('input');
    if (first) first.focus();
    const onDoc = (e) => { if (anchor.current && !anchor.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') { onClose(); CW.focusSoon('.tk-filter-btn'); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);
  const toggleStep = (k) => setF({ steps: f.steps.includes(k) ? f.steps.filter(x => x !== k) : f.steps.concat([k]) });
  return (
    <div id="tk-filter" ref={ref} className="tk-pop" role="dialog" aria-label={t('Filter')}
      onBlur={(e) => { if (e.relatedTarget && anchor.current && !anchor.current.contains(e.relatedTarget)) onClose(); }}>
      <div className="tk-pop-body">
        <fieldset className="tk-fs">
          <legend>{t('Indhentning')}</legend>
          {TASK_STEPS.map(([k, l]) => (
            <label key={k} className="tk-check">
              <input type="checkbox" checked={f.steps.includes(k)} onChange={() => toggleStep(k)}/>
              <span style={{ flex: 1 }}>{t(l)}</span>
              <span className="tk-count">{counts[k]}</span>
            </label>
          ))}
        </fieldset>
        <TaskRange id="tk-age" label={t('Ventetid')} value={f.age} onChange={(v) => setF({ age: v })}/>
        <TaskRange id="tk-rem" label={t('Seneste påmindelse (dage siden)')} value={f.rem} onChange={(v) => setF({ rem: v })}/>
        <label className="tk-check" style={{ marginTop: -8 }}>
          <input type="checkbox" checked={f.onlyRem} onChange={() => setF({ onlyRem: !f.onlyRem })}/>
          <span>{t('Kun sager, der er påmindet')}</span>
        </label>
        <label className="tk-check">
          <input type="checkbox" checked={f.fresh} onChange={() => setF({ fresh: !f.fresh })}/>
          <span>{t('Kun sager med nyt siden sidst')}</span>
        </label>
      </div>
      <div className="tk-pop-foot">
        <button type="button" className="tk-link" onClick={onClear}>{t('Ryd')}</button>
        <button type="button" className="btn btn-primary" onClick={() => { onApply(); CW.focusSoon('.tk-filter-btn'); }}>{taskPlural(resultCount, 'Vis {n} sag', 'Vis {n} sager')}</button>
      </div>
    </div>
  );
}

// Skyder med to håndtag (0–60+ dage). To almindelige skydere oven på hinanden, så
// tastatur og skærmlæsere virker som på enhver skyder.
function TaskRange({ id, label, value, onChange }) {
  const [lo, hi] = value;
  const pct = (v) => (v / TASK_MAXD * 100) + '%';
  return (
    <div className="tk-range" role="group" aria-labelledby={id + '-l'}>
      <div className="tk-range-head">
        <span id={id + '-l'}>{label}</span>
        <span className="tk-range-val">{taskRangeText(value)}</span>
      </div>
      <div className="tk-range-track">
        <div className="tk-range-rail"/>
        <div className="tk-range-fill" style={{ left: pct(lo), width: 'calc(' + pct(hi) + ' - ' + pct(lo) + ')' }}/>
        <input type="range" min={0} max={TASK_MAXD} step={1} value={lo} aria-label={label + ': ' + t('fra')} style={{ zIndex: lo >= hi && lo > TASK_MAXD / 2 ? 2 : 1 }}
          aria-valuetext={taskFill(t('{n} dage'), { n: lo })} onChange={e => onChange([Math.min(Number(e.target.value), hi), hi])}/>
        <input type="range" min={0} max={TASK_MAXD} step={1} value={hi} aria-label={label + ': ' + t('til')}
          aria-valuetext={hi >= TASK_MAXD ? t('ingen øvre grænse') : taskFill(t('{n} dage'), { n: hi })} onChange={e => onChange([lo, Math.max(Number(e.target.value), lo)])}/>
      </div>
      <div className="tk-range-scale" aria-hidden="true"><span>0</span><span>30</span><span>{t('60+ dage')}</span></div>
    </div>
  );
}

/* Faner i én stil (.cw-tabs) til Mine opgaver og Dataanmodninger.
   tabs: [{ k, l, n, help }]. Rigtige faner: piletasterne flytter mellem
   dem, og kun den valgte fane er i tabulatorrækkefølgen (er ingen valgt, den første).
   Panelet har id idBase + '-panel'. */
function ListTabs({ tabs, value, onChange, ariaLabel, idBase }) {
  const sel = tabs.findIndex(x => x.k === value);
  const onKey = (e) => {
    const i = Math.max(0, tabs.findIndex(x => x.k === value));
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
      {tabs.map((x, i) => (
        <button key={x.k} type="button" role="tab" id={idBase + '-' + x.k}
          aria-selected={value === x.k} aria-controls={idBase + '-panel'} tabIndex={value === x.k || (sel < 0 && i === 0) ? 0 : -1}
          title={x.help || undefined} onClick={() => onChange(x.k)}>
          {x.l} <span className="n">{x.n}</span>
        </button>
      ))}
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
window.cwTasksAwaitingMe = cwTasksAwaitingMe;
