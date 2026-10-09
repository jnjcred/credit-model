// Credit memo: afdelingerne, kommentarsporet pr. afsnit (localStorage 'memo4-comments:<afsnit>', fælles
// for dansk og engelsk), reglen for blokerende kommentarer og de kommentarer, demoen starter med.
// Flyttet ordret fra src/memo.jsx (linje 263-352) ved migrationen til Vue; kun export-linjen er ny.
// seedMemoComments var en IIFE, der kørte, da memo.jsx blev indlæst; nu kalder index.js den ved start.
// CW er global (window.CW, src/domain/case_state.js).

/* ── Departments / personas ──────────────────────────────────────────────── */
// Afdelingen står som grå tekst efter navnet; der er ingen farve pr. afdeling
const MEMO_DEPTS = [
  { id: 'kredit',     label: 'Kredit',     author: 'Mette Larsen' },
  { id: 'compliance', label: 'Compliance', author: 'Jonas Holm' },
  { id: 'erhverv',    label: 'Erhverv',    author: 'Sofie Andersen' },
  { id: 'risiko',     label: 'Risiko',     author: 'Anders Bach' },
];
const MEMO_DEPT_MAP = MEMO_DEPTS.reduce((m, d) => (m[d.id] = d, m), {});

/* ── Comment storage + seed ──────────────────────────────────────────────── */
function _cmtKey(sKey) { return 'memo4-comments:' + sKey; }

function loadComments(sKey) {
  try {
    const raw = localStorage.getItem(_cmtKey(sKey));
    const list = raw ? JSON.parse(raw) : [];
    // Tåler gamle eller ødelagte data: kun rigtige kommentarer kommer igennem
    return Array.isArray(list) ? list.filter(c => c && typeof c === 'object' && c.id != null) : [];
  } catch (e) { return []; }
}

function saveComments(sKey, arr) {
  try { localStorage.setItem(_cmtKey(sKey), JSON.stringify(arr)); } catch (e) {}
}

/* ── Kommentarer: et spor, der ikke kan slettes ──────────────────────────────
   En kommentar slettes aldrig. Den løses (hvem, hvornår, hvorfor) eller
   trækkes tilbage af den, der skrev den. Begge dele står tilbage i sporet,
   foldet sammen. Rådgiveren skriver altid i eget navn.
   Comment = { id, dept, author, at (ISO), text, blocking?,
               resolved?: { by, at, reason }, withdrawn?: { by, at } }
   ──────────────────────────────────────────────────────────────────────────── */
const MEMO_ME = MEMO_DEPTS[0]; // Mette Larsen - Kredit, den der sidder ved tasterne

/* Kontrolfunktionerne kan blokere en indstilling. En kommentar fra Compliance
   eller Risiko, der kræver handling, blokerer, indtil den er løst med en
   begrundelse. */
const MEMO_BLOCKING_DEPTS = ['compliance', 'risiko'];
const MEMO_BLOCKING_RE = /kan ikke (godkendes|bevilges|indstilles)|skal være på plads|skal foreligge|cannot be approved|must be in place/i;
function isBlockingComment(c) {
  if (!c) return false;
  if (typeof c.blocking === 'boolean') return c.blocking;
  return MEMO_BLOCKING_DEPTS.includes(c.dept) && MEMO_BLOCKING_RE.test(c.text || '');
}
function commentState(c) { return !c ? 'open' : c.withdrawn ? 'withdrawn' : c.resolved ? 'resolved' : 'open'; }
function commentWhen(c) { return c.at ? (window.CW ? CW.fmtWhen(c.at) : c.at) : (c.date || ''); }

/* Tidspunkterne regnes fra nu, så sporet aldrig ligger før dokumenterne eller efter i dag */
function _seedAt(daysAgo, hh, mm) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}
function memoCommentSeed() {
  return {
    conclusion: [
      { id: 1, dept: 'risiko', author: 'Anders Bach', at: _seedAt(3, 8, 45),
        text: 'Kundekoncentration bør fremhæves tydeligere her. 64 % på top-3 er højt og vil være det første, komitéen kigger på.' },
      { id: 2, dept: 'kredit', author: 'Mette Larsen', at: _seedAt(3, 9, 2),
        text: 'God pointe. Jeg har fremhævet det som punkt 1 under "på trods af". Tak.' },
    ],
    financial: [
      { id: 1, dept: 'erhverv', author: 'Sofie Andersen', at: _seedAt(4, 14, 32),
        text: 'Budgettet henviser til et ark Følsomhed, som ikke er med i den indsendte fil. Har kunden sendt det?' },
      { id: 2, dept: 'kredit', author: 'Mette Larsen', at: _seedAt(4, 15, 8),
        text: 'Endnu ikke. Jeg har sendt en mail til Anders i går og følger op i morgen.' },
      { id: 3, dept: 'compliance', author: 'Jonas Holm', at: _seedAt(3, 9, 11),
        text: 'OK. Sæt det som åbent punkt i sagsmappen, indtil vi har arket.' },
    ],
    appendix1: [
      { id: 1, dept: 'compliance', author: 'Jonas Holm', at: _seedAt(3, 10, 20), blocking: true,
        text: 'Tilbagetrædelseserklæringen fra Anders Christensen på anpartshaverlånet skal være på plads inden bevilling. Kan ikke godkendes uden.' },
    ],
  };
}

function seedMemoComments() {
  if (typeof localStorage === 'undefined') return;
  try {
    // "Skriver som" findes ikke længere
    localStorage.removeItem('memo4-persona');
    if (localStorage.getItem('memo4-comments-seeded') === 'v4') return;
    // Rester fra tidligere versioner: alle kommentarnøgler ryddes, så der ikke
    // står gamle tråde under afsnit, der ikke findes længere
    Object.keys(localStorage).forEach(k => { if (k.indexOf('memo4-comments:') === 0) localStorage.removeItem(k); });
    Object.entries(memoCommentSeed()).forEach(([k, arr]) => saveComments(k, arr));
    // v4: kommentarer løses i stedet for at slettes, med tidspunkt som ISO
    localStorage.setItem('memo4-comments-seeded', 'v4');
  } catch (e) {}
}

// Modul-eksport
export { MEMO_DEPTS, MEMO_DEPT_MAP, _cmtKey, loadComments, saveComments, MEMO_ME, MEMO_BLOCKING_DEPTS,
  MEMO_BLOCKING_RE, isBlockingComment, commentState, commentWhen, _seedAt, memoCommentSeed, seedMemoComments };
