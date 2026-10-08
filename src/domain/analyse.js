// Porteføljeanalyse: skabeloner, kriterier, søgning, sortering og talformat (flyttet
// uændret fra analyse.jsx ved migrationen til Vue; skærmen er
// src/views/analyse/PortfolioAnalyseView.vue).

// Kunderne i porteføljen ligger i data.js (DATA.PORTFOLIO), så sagskortenes
// risikomarkør og analysen bruger de samme tal. caseId peger på kundens sag.
const ANALYSE_CASES = DATA.PORTFOLIO;
// Valgt skabelon og filtre huskes i sessionen (DATA.viewGet/viewSet), også når
// man åbner en sag og går tilbage
const ANALYSE_VIEW = 'analyse';

// Skabeloner i to grupper (vist som optgroups i vælgeren). Kriterierne
// vises som grå chips (ChipSummary), når en skabelon er valgt.
const TEMPLATE_GROUPS = { god: 'Klarer det godt', fare: 'Faresignaler' };
const TEMPLATES = [
  { group: "god", label: "Høj vækst", criteria: [
    { metric: "revPct",    op: ">", val: 25, joinNext: "AND" },
    { metric: "ebitdaPct", op: ">", val: 10 },
  ] },
  { group: "god", label: "Sund drift", criteria: [
    { metric: "ebitda12", op: ">", val: 500000, joinNext: "AND" },
    { metric: "equity",   op: ">", val: 0 },
  ] },
  { group: "god", label: "Topperformere", criteria: [
    { metric: "revPct",    op: ">", val: 30, joinNext: "AND" },
    { metric: "ebitdaPct", op: ">", val: 15, joinNext: "AND" },
    { metric: "equity",    op: ">", val: 0  },
  ] },
  { group: "fare", label: "Negativ EBITDA", criteria: [{ metric: "ebitda12", op: "<", val: 0 }] },
  { group: "fare", label: "EBITDA-tilbagegang", criteria: [{ metric: "ebitdaPct", op: "<", val: -10 }] },
  { group: "fare", label: "Negativ egenkapital", criteria: [{ metric: "equity", op: "<", val: 0 }] },
  { group: "fare", label: "Kundekoncentration", criteria: [{ metric: "bigCust", op: ">", val: 50 }] },
  { group: "fare", label: "Faldende omsætning", criteria: [{ metric: "revPct", op: "<", val: -5 }] },
  { group: "fare", label: "Dobbelt underskud", criteria: [
    { metric: "ebitdaPct", op: "<", val: -10, joinNext: "AND" },
    { metric: "equity",    op: "<", val: 0 },
  ] },
  { group: "fare", label: "Koncentration og fald", criteria: [
    { metric: "bigCust",   op: ">", val: 50,  joinNext: "AND" },
    { metric: "ebitdaPct", op: "<", val: -10 },
  ] },
];

const METRICS = [
  { k: "revPct",    l: "Ændring i omsætning (%)",  short: "Omsætning",     unit: "%",   amtField: "rev12",    amtLabel: "Minimum omsætning" },
  { k: "ebitdaPct", l: "Ændring i EBITDA (%)",      short: "EBITDA",        unit: "%",   amtField: "ebitda12", amtLabel: "Minimum EBITDA"    },
  { k: "rev12",     l: "Omsætning 12 mdr.",          short: "Omsætning",     unit: "kr.", amtField: null },
  { k: "ebitda12",  l: "EBITDA 12 mdr.",             short: "EBITDA",        unit: "kr.", amtField: null },
  { k: "equity",    l: "Egenkapital",                short: "Egenkapital",   unit: "kr.", amtField: null },
  { k: "bigCust",   l: "Største kundeandel (%)",     short: "Kundeandel",    unit: "%",   amtField: null },
];

function metaFor(k) { return METRICS.find(m => m.k === k) || METRICS[0]; }

let _uid = 1;
function uid() { return _uid++; }

function makeCrit(metric) {
  const m = metaFor(metric);
  return { id: uid(), metric, op: ">", val: 0, unit: m.unit, minAmt: "", minAmtOp: ">", joinNext: "AND" };
}

function matchesCrit(row, c) {
  const v = Number(c.val);
  if (isNaN(v)) return true;
  const mainOk = c.op === ">" ? row[c.metric] > v : row[c.metric] < v;
  if (!mainOk) return false;
  const m = metaFor(c.metric);
  if (m.amtField && c.minAmt !== "" && c.minAmt !== null) {
    const amt = Number(c.minAmt);
    if (!isNaN(amt)) {
      const amtOk = c.minAmtOp === ">" ? row[m.amtField] > amt : row[m.amtField] < amt;
      if (!amtOk) return false;
    }
  }
  return true;
}

function runQuery(dept, branche, criteria) {
  let base = ANALYSE_CASES;
  if (dept !== "alle") base = base.filter(r => r.dept === dept);
  if (branche !== "alle") base = base.filter(r => r.branche === branche);
  if (criteria.length === 0) return base;

  let ids = new Set(base.filter(r => matchesCrit(r, criteria[0])).map(r => r.id));
  for (let i = 0; i < criteria.length - 1; i++) {
    const logic = criteria[i].joinNext;
    const next = criteria[i + 1];
    const nextIds = new Set(base.filter(r => matchesCrit(r, next)).map(r => r.id));
    if (logic === "AND") {
      ids = new Set([...ids].filter(id => nextIds.has(id)));
    } else {
      nextIds.forEach(id => ids.add(id));
    }
  }
  return base.filter(r => ids.has(r.id));
}

// Vækst i procent. Kun negative tal er røde (uden fed); positive står i tekstens farve.
// Før migrationen returnerede pct() et JSX-element med farven. Nu returnerer den
// teksten (samme tegn: "+" foran positive tal, tallet og pctSign()), og skærmen
// viser negative tal røde med <a-typography-text type="danger">.
function pct(v) {
  return (v > 0 ? "+" : "") + v + pctSign();
}
// "45 %" på dansk, "45%" på engelsk
function pctSign() { return window.CW_LANG === "en" ? "%" : " %"; }
function fmt(v) { return v.toLocaleString(window.CW_LANG === "en" ? "en-GB" : "da-DK", { maximumFractionDigits: 0 }); }

// Klik på en række: kunder med en sag åbner sagen. Nordhavn har levende data;
// de øvrige sager viser sagens ærlige tomme tilstand. Kunder uden sag åbner
// Ny sag-guiden forudfyldt med kunden (grænseflade 3: 'cw-new-case').
// Sagen viser så "Tilbage til Porteføljeanalyse" (sessionStorage 'cw_back', læses af workspace).
function openAnalyseRow(r, go) {
  if (r.caseId) {
    try { sessionStorage.setItem('cw_back', JSON.stringify({ route: 'analyse', label: 'Porteføljeanalyse' })); } catch (e) {}
    go("workspace:" + r.caseId);
    return;
  }
  try {
    window.dispatchEvent(new CustomEvent('cw-new-case', { detail: { name: r.name, cvr: r.cvr, source: 'analyse' } }));
  } catch (e) {}
}
/* Kundens sag i samme sagsliste som Mine opgaver (DATA.CASES): den faste sag
   (caseId), ellers den nyeste åbne sag med samme CVR eller navn, fx en sag
   oprettet i Ny sag. null hvis kunden ingen sag har. */
function analyseCaseFor(r) {
  if (r.caseId) return DATA.caseById(r.caseId);
  const digits = (s) => String(s || '').replace(/[^0-9]/g, '');
  const cvr = digits(r.cvr);
  const name = String(r.name || '').trim().toLowerCase();
  const hits = DATA.CASES.filter(c => !DATA.caseIsDecided(c) && ((cvr && digits(c.cvr) === cvr) || (name && String(c.name || '').trim().toLowerCase() === name)));
  return hits.length ? hits.sort((a, b) => b.id - a.id)[0] : null;
}
// Tal i sprogets format
function numLocale() { return window.CW_LANG === "en" ? "en-GB" : "da-DK"; }

// ----- Chip summary -----
function fmtVal(val, unit) {
  const n = Number(val);
  if (isNaN(n)) return val;
  return unit === "kr." ? n.toLocaleString(numLocale()) : n.toLocaleString(numLocale(), { maximumFractionDigits: 2 });
}

// Kriteriets tekst på den grå chip, fx "Ændring i omsætning (%) > 25 %".
// (Før migrationen de første linjer i komponenten ChipSummary; uændrede.)
function chipText(c) {
  const m = metaFor(c.metric);
  const parts = [t(m.l) + " " + c.op + " " + fmtVal(c.val, m.unit) + " " + t(m.unit)];
  if (m.amtField && c.minAmt !== "") parts.push(t('og') + " " + c.minAmtOp + " " + Number(c.minAmt).toLocaleString(numLocale()) + " " + t('kr.'));
  return parts.join(" ");
}

// En skabelons kriterier som redigerbare kriterier (før migrationen i PortfolioAnalyse)
const tplCriteria = (tpl) => tpl.criteria.map(c => ({ ...makeCrit(c.metric), op: c.op, val: c.val, joinNext: c.joinNext || "AND" }));

// Rækkerne i tabellen: søgeresultatet med kundens sag og ansvarlig, sorteret efter
// den valgte kolonne. (Før migrationen useMemo'en "sorted" i PortfolioAnalyse; uændret.)
function analyseRows(results, sortCol, sortDir) {
    // Sag og ansvarlig kommer fra sagsmodellen (følger omfordelinger og nye sager fra Ny sag)
    const rows = results.map(r => {
      const c = analyseCaseFor(r);
      return { ...r, caseId: c ? c.id : null, caseNr: c ? c.caseNr : '', owner: c ? c.responsible : '', caseStatus: c ? c.statusKey : null };
    });
    return rows.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      const cmp = typeof av === "string" ? av.localeCompare(bv, "da") : (av ?? 0) - (bv ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
}

// Vælgernes afdelinger (i porteføljens rækkefølge) og brancher (alfabetisk).
// (Før migrationen regnet i PortfolioAnalyse ved hver visning; porteføljen ændrer sig ikke.)
const depts    = [...new Set(ANALYSE_CASES.map(r => r.dept))];
const branches = [...new Set(ANALYSE_CASES.map(r => r.branche))].sort((a, b) => a.localeCompare(b, "da"));

// Modul-eksport til Vue-komponenten
export {
  ANALYSE_CASES, ANALYSE_VIEW, TEMPLATE_GROUPS, TEMPLATES, METRICS,
  metaFor, uid, makeCrit, matchesCrit, runQuery, pct, pctSign, fmt,
  openAnalyseRow, analyseCaseFor, numLocale, fmtVal, chipText, tplCriteria, analyseRows,
  depts, branches,
};
