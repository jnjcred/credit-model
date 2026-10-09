// Fanen Virksomheden: rådgiverens rettelser og kommentarer til tallene i regnskabstabellen.
// Flyttet ordret fra src/financials.jsx ved migrationen til Vue; kun import- og export-linjerne og
// kommentaren, der begynder med "Migration:", er nye. Regnskab v5 (8. oktober 2026) har tilføjet
// kolonnen ytd (den uploadede saldobalances periode) og mask (årene med kun offentlig årsrapport,
// finMaskedPost). Tilstanden ligger i localStorage (kabul:fin-edits:nordhavn og
// kabul:fin-notes:nordhavn); hver ændring kalder CW.bump() ('cw-case-changed').
import { FIN_ANNUAL_YEARS, FIN_ACTUAL_Q, FIN_BUDGET_SEP, FIN_BUDGET_Q, ANNUAL_REPORT, FIN_LAYOUT, FIN_ROW_BY_LABEL, FIN_PUBLIC_HIDDEN } from './finData.js';
import { finCellGet, finCellSet, FIN_BUDGET_YEARS } from './finCalc.js';
import { FIN_MAPPED } from './finMapping.js';
import { finFill, finLogNum } from './finFormat.js';

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
    name: () => t(p.label) + ' ' + p.year, source: () => (FIN_MAPPED ? t('Saldobalance fra e-conomic') : t('Periodetal')) })),
  // Regnskab v5: den uploadede saldobalances periode, januar-august 2026 (læst af AI). Står efter
  // kvartalerne, så den bygger på dem, når rettelserne lægges ind (finApplyEdits).
  { key: 'ytd', kind: 'ytd', budget: false,
    name: () => t('Periodetal') + ' ' + t('jan-aug') + ' ' + FIN_ACTUAL_Q[0].year, source: () => t('Saldobalance, upload') },
  { key: 'bs', kind: 'bs', budget: true,
    name: () => t(FIN_BUDGET_SEP.label) + ' ' + FIN_BUDGET_SEP.year + ' (' + t('budget') + ')', source: () => t('Kundens budget') },
  ...FIN_BUDGET_Q.map((p, i) => ({ key: 'b' + i, kind: 'b', idx: i, budget: true,
    name: () => p.label + ' ' + p.year + ' (' + t('budget') + ')', source: () => t('Kundens budget') })),
  // Regnskab v5 (9. oktober): budgettet for hele regnskabsår (Excel-skabelonen). Står efter
  // kvartalerne, så det bygger på dem (finCellGet, kind 'by')
  ...FIN_BUDGET_YEARS.map((y, i) => ({ key: 'by' + i, kind: 'by', idx: i, budget: true, year: y,
    name: () => t('Budget') + ' ' + y, source: () => t('Kundens budget') })),
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
// Regnskab v5 (9. oktober): poster, der kun kan rettes i budgettets hele år (Excel-skabelonen). I
// tabellen er de summer af detaljer, der kun findes i årsrapporterne; i budgettet er de selve tallet.
const FIN_BUDGET_ONLY = ['Anlægsaktiver', 'Omsætningsaktiver'];
FIN_BUDGET_ONLY.forEach(ref => { FIN_POSTS[ref] = { ref, label: ref, raw: ref, budgetOnly: true }; });

/* Regnskab v5: mask = { years: [bool pr. år i FIN_ANNUAL_YEARS] }; true = der er kun den offentlige
   årsrapport for året, så posterne i FIN_PUBLIC_HIDDEN har intet tal i årskolonnen. Uden mask
   (eksporter, memo, ældre kald) er alt som før. */
function finMaskedPost(p, col, mask) {
  if (!mask || !mask.years || !p || !col || col.kind !== 'annual' || !mask.years[col.idx]) return false;
  if (p.raw) return FIN_PUBLIC_HIDDEN.rows.includes(p.raw);
  if (p.parent) return FIN_PUBLIC_HIDDEN.childrenOf.includes(p.entry.label);
  return FIN_PUBLIC_HIDDEN.entries.includes(p.label);
}

// Det oprindelige tal (fra årsrapport, periodetal eller kundens budget), eller null
// hvis cellen ikke har et tal og derfor ikke kan rettes
function finOriginal(rowRef, colKey, mask) {
  const p = FIN_POSTS[rowRef], col = FIN_EDIT_COL[colKey];
  if (!p || !col) return null;
  if (p.budgetOnly && col.kind !== 'by') return null;
  if (finMaskedPost(p, col, mask)) return null;
  if (p.raw) return finCellGet(FIN_ROW_BY_LABEL[p.raw], col);
  if (col.kind !== 'annual') return null;
  const vals = p.child ? p.child.vals : p.entry.vals;
  return vals && vals[col.idx] != null ? vals[col.idx] : null;
}

// Det tal, en rettelse står i stedet for, som kilden siger nu. Efter en ommapning
// kan det være et andet end det, der stod, da rettelsen blev lavet (x.original).
// Omsætningen må mangle i en årsrapport (små virksomheder må udelade den). Så kan
// rådgiveren indtaste den, f.eks. fra en intern årsrapport. Summerne (bruttofortjeneste
// osv.) står som i årsrapporten.
function finFillable(rowRef, colKey) {
  const col = FIN_EDIT_COL[colKey];
  // Selve omsætningen kan ikke tastes (den er summen af sine detaljer), men detaljerne kan, når årsrapporten ikke viser dem
  return !!col && col.kind === 'annual' && typeof rowRef === 'string' && rowRef.indexOf('Nettoomsætning / ') === 0;
}
function finOrigOf(x, mask) { const o = finOriginal(x.rowRef, x.colKey, mask); return o != null ? o : x.original; }

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
   flytter deres forælder; en rettet forælder vinder over sine detaljer.
   Regnskab v5: mask (se finMaskedPost) tømmer først de poster, den offentlige årsrapport ikke
   viser, i årene uden intern årsrapport. En indtastet omsætning står så alene (finFillable). */
function finApplyEdits(edits, mask) {
  const rows = ANNUAL_REPORT.groups.flatMap(g => g.rows).map(r => ({ ...r,
    values: r.values && r.values.slice(), q: r.q && r.q.slice(), bq: r.bq && r.bq.slice() }));
  const byLabel = {};
  rows.forEach(r => { byLabel[r.label] = r; });
  const layout = FIN_LAYOUT.map(g => ({ ...g, entries: g.entries.map(e => ({ ...e,
    vals: e.vals && e.vals.slice(),
    children: e.children && e.children.map(c => ({ ...c, vals: c.vals.slice() })) })) }));
  const entryByLabel = {};
  layout.forEach(g => g.entries.forEach(e => { entryByLabel[e.label] = e; }));
  if (mask && mask.years) mask.years.forEach((hide, i) => {
    if (!hide) return;
    FIN_PUBLIC_HIDDEN.rows.forEach(l => { if (byLabel[l] && byLabel[l].values) byLabel[l].values[i] = null; });
    layout.forEach(g => g.entries.forEach(e => {
      if (FIN_PUBLIC_HIDDEN.entries.includes(e.label) && e.vals) e.vals[i] = null;
      if (FIN_PUBLIC_HIDDEN.childrenOf.includes(e.label)) (e.children || []).forEach(c => { c.vals[i] = null; });
    }));
  });
  const map = {};
  (edits || []).forEach(x => {
    if (!FIN_POSTS[x.rowRef] || !FIN_EDIT_COL[x.colKey]) return;
    // Regnskab v5: en omsætning, der er tastet ind, fordi årsrapporten ikke viste den (fill), gælder
    // kun, mens året har den offentlige årsrapport alene. Kommer den interne, gælder dens tal, og
    // uden mask (eksporter, memo) bruges den ikke: den må aldrig blive en rettelse, der flytter summerne.
    if (x.fill && !(mask && mask.years && mask.years[FIN_EDIT_COL[x.colKey].idx])) return;
    map[x.rowRef + '|' + x.colKey] = x;
  });
  if (!Object.keys(map).length) return { rows, byLabel, layout, entryByLabel, map };
  FIN_EDIT_COLS.forEach(col => {
    const d = {};
    const own = (ref) => map[ref + '|' + col.key];
    layout.forEach(g => g.entries.forEach(e => {
      if (e.sum || e.derive) return;
      const ref = e.ref || e.label;
      let kids = 0;
      let filled = false;
      if (col.kind === 'annual') (e.children || []).forEach(c => {
        const x = own(ref + ' / ' + c.label);
        if (x && c.vals[col.idx] != null) { kids += x.value - c.vals[col.idx]; c.vals[col.idx] = x.value; }
        else if (x && x.fill) { c.vals[col.idx] = x.value; filled = true; }   // en detalje, årsrapporten ikke viser, tastet af rådgiveren
      });
      const cur = e.ref ? finCellGet(byLabel[e.ref], col) : (col.kind === 'annual' && e.vals ? e.vals[col.idx] : null);
      if (cur == null) {
        // Omsætningen, årsrapporten ikke viser: den er summen af detaljerne, rådgiveren har tastet. Summerne under den røres ikke
        if (filled && e.ref === 'Nettoomsætning') finCellSet(byLabel[e.ref], col, (e.children || []).reduce((a, c) => a + (c.vals[col.idx] || 0), 0));
        return;
      }
      const x = own(ref);
      const next = x ? x.value : cur + kids;
      if (next === cur) return;
      d[ref] = next - cur;
      if (e.ref) finCellSet(byLabel[e.ref], col, next); else e.vals[col.idx] = next;
    }));
    // Budgettets hele år: anlægs- og omsætningsaktiver rettes direkte (FIN_BUDGET_ONLY)
    if (col.kind === 'by') FIN_BUDGET_ONLY.forEach(ref => {
      const x = own(ref), r = byLabel[ref];
      const cur = r ? finCellGet(r, col) : null;
      if (!x || cur == null || x.value === cur) return;
      d[ref] = x.value - cur;
      finCellSet(r, col, x.value);
    });
    FIN_EDIT_SUMS.forEach(([label, parts]) => {
      // En sum, der selv er rettet (budgettets anlægs- og omsætningsaktiver), står som rettet
      if (own(label)) return;
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
   celler som { rowRef, colKey, from, to, removed }. mask: se finMaskedPost (Regnskab v5). */
function finSaveEdits(changes, reason, mask, opts) {
  const list = finLoadEdits();
  const current = finApplyEdits(list, mask);
  const done = [];
  // keep (Excel-import af budgettets hele år): et importeret tal gemmes, også når det er lig tallet
  // bag cellen. Uden kundens budget er importen hele budgettet (finBudgetYear), så intet tal må falde væk
  const keep = !!(opts && opts.keep);
  changes.forEach(ch => {
    const col = FIN_EDIT_COL[ch.colKey], p = FIN_POSTS[ch.rowRef];
    const original = finOriginal(ch.rowRef, ch.colKey, mask);
    if (!col || !p || (original == null && !finFillable(ch.rowRef, ch.colKey)) || ch.value == null || isNaN(ch.value)) return;
    const from = finPostValue(current, ch.rowRef, col);
    const i = list.findIndex(x => x.rowRef === ch.rowRef && x.colKey === ch.colKey);
    if (from != null && Math.abs(ch.value - from) < 1e-9 && !(keep && i < 0)) return;
    if (original != null && Math.abs(ch.value - original) < 1e-9 && !keep) {
      if (i >= 0) list.splice(i, 1);
      else return;
      done.push({ rowRef: ch.rowRef, colKey: ch.colKey, from, to: original, removed: true });
      return;
    }
    const x = { rowRef: ch.rowRef, colKey: ch.colKey, value: ch.value, original, by: finAdvisor(), at: new Date().toISOString(),
      reason: reason != null ? reason : (i >= 0 ? list[i].reason || '' : '') };
    // Regnskab v5: et tal, kilden ikke har (omsætningen i en offentlig årsrapport), er en udfyldning
    if (original == null && finFillable(ch.rowRef, ch.colKey)) x.fill = true;
    // Rådgiverens version af kundens materiale (finVersions.js): tallene hører til versionen
    if (opts && opts.versionId) x.versionId = opts.versionId;
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
function finLogChanges(done) {
  done.forEach(c => {
    const name = finEditName(c.rowRef, c.colKey);
    const text = c.removed
      ? finFill(t('Rettelse fortrudt i regnskabet: {post} er igen {tal}'), { post: name, tal: finLogNum(c.to) })
      : finFill(t('Rettet i regnskabet: {post} fra {fra} til {til}'), { post: name, fra: finLogNum(c.from), til: finLogNum(c.to) });
    CW.log('fin-edit', text, { who: 'rådgiver', data: { rowRef: c.rowRef, colKey: c.colKey, from: c.from, to: c.to } });
  });
}

// Regnskab v5: hvad kunden har leveret (finDataState fra Regnskab v2) står nu i finSources.js
// (finSourceState): årsrapporternes, periodetallenes og budgettets kilde.

// Modul-eksport
export {
  FIN_EDITS_KEY, FIN_OLD_BUDGET_KEY, FIN_EDIT_COLS, FIN_EDIT_COL, FIN_POSTS, FIN_POST_ORDER,
  FIN_BUDGET_ONLY, finMaskedPost, finOriginal, finFillable, finOrigOf, FIN_EDIT_SUMS, finApplyEdits, finAdvisor, finMigrateOldBudget,
  finLoadEdits, finStoreEdits, finSaveEdits, finRemoveEdits,
  FIN_NOTES_KEY, finLoadNotes, finStoreNotes, finAddNote, finDeleteNote, finCommentsFor, finSetReason,
  finPostValue, finEditName, finLogChanges,
};
