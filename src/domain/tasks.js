// Mine opgaver: reglerne for listen over rådgiverens sager (flyttet uændret fra
// portfolio.jsx ved migrationen til Vue; skærmen er src/views/portfolio/PortfolioView.vue).
//
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
// Filterets chips. setF er valgfri (uden den kan chipsene ikke fjernes, f.eks. til visningsnavne)
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

// Modul-eksport til Vue-komponenterne (sidebjælkens tal bruger cwTasksAwaitingMe)
export {
  TASK_STEPS, TASK_STEP_LABEL, TASK_RANK, TASK_MAXD, TASK_OVERDUE, TASK_REMIND_GAP, TASK_UNDO_MS, TASK_REASONS, TASK_ALL, TASK_VIEWS, TASK_KEY,
  tk, taskFill, taskNorm, taskInRange, taskFull, taskRangeText, taskPlural, taskRel,
  taskStore, taskPatch, taskMarkSeen, taskDays, taskStaticCollect, taskLiveCollect, taskDerive, taskPasses, taskChips, taskViewLabel,
  taskOwner, taskMine, cwTasksAwaitingMe, openCaseFromList,
};
