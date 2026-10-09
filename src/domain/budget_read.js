// Kundens budget, læst i browseren, før kunden trykker "Færdig" (portalens budgetpunkt).
// Filen sendes ikke; XLSX er SheetJS fra index.html. Læsningen retter aldrig tal: den siger kun,
// hvad vi er sikre på (valuta, enhed, periode), hvad vi vil spørge om, og hvad der er en fejl i filen
// (aktiver og passiver stemmer ikke: nulkontrollen). Rådgiveren gennemgår altid budgettet bagefter.
//
// brAnalyse(aoa) er ren (en liste af rækker i, resultatet ud) og kan prøves uden browser.
// brReadFile(url) henter den uploadede fil fra demoens fillager og kalder brAnalyse på det ark, der har
// flest tal. Returnerer null, når filen ikke kan læses som regneark (PDF eller andet).

const MONTHS = /(^|[^a-zæøå])(jan|feb|mar|apr|maj|may|jun|jul|aug|sep|okt|oct|nov|dec|q[1-4]|kvartal)/;

const brNorm = (s) => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
const brNum = (v) => (typeof v === 'number' && isFinite(v) ? v : null);

// Valuta og enhed står typisk i de første rækker (titel, "Enhed: DKK tusind") eller i kolonneoverskrifter
function brScanText(aoa, headIdx) {
  const rows = aoa.slice(0, Math.max(14, headIdx + 1));
  return rows.map(r => (r || []).filter(c => typeof c === 'string').map(brNorm).join(' | ')).join(' | ');
}

function brCurrency(text) {
  const found = new Set();
  if (/\bdkk\b|danske kroner|\bkr\.?(?=\W|$)|\btkr\b|t\.kr/.test(text)) found.add('DKK');
  if (/\beur\b|€|euro/.test(text)) found.add('EUR');
  if (/\busd\b|\$|dollar/.test(text)) found.add('USD');
  if (/\bsek\b/.test(text)) found.add('SEK');
  if (/\bnok\b/.test(text)) found.add('NOK');
  if (/\bgbp\b|£/.test(text)) found.add('GBP');
  return found.size === 1 ? [...found][0] : null;
}

// 'kr' = hele kroner, 'tkr' = tusinde, 'mio' = millioner; null, når filen ikke siger det entydigt
function brUnit(text) {
  const found = new Set();
  if (/\bmio\b|\bmio\.|millioner|\bmill\b|\bmillions?\b|\bmn\b/.test(text)) found.add('mio');
  if (/\btkr\b|t\.kr|t\.dkk|\btdkk\b|tusind|'000|\b1\.?000 ?(kr|dkk)/.test(text)) found.add('tkr');
  if (/hele kr|hele kroner|\bi kr\b/.test(text)) found.add('kr');
  return found.size === 1 ? [...found][0] : null;
}

// Rækken med flest årstal er kolonneoverskrifterne
function brHeader(aoa) {
  let best = -1, bestN = 0;
  aoa.slice(0, 30).forEach((r, i) => {
    const n = (r || []).filter(c => /(^|[^0-9])20\d{2}($|[^0-9])/.test(String(c == null ? '' : c))).length;
    if (n > bestN) { best = i; bestN = n; }
  });
  return best;
}

// Teksten i rækkens navnekolonne: den af de to første kolonner, der har flest tekster
function brLabelCol(aoa, from) {
  const count = (c) => aoa.slice(from).filter(r => r && typeof r[c] === 'string' && r[c].trim()).length;
  return count(1) > count(0) ? 1 : 0;
}

const MONTH_NUM = { jan: 1, feb: 2, mar: 3, apr: 4, maj: 5, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12 };

// Periodeinddelingen i kolonneoverskrifterne: måned, kvartal eller halvår, og de perioder (1-12, 1-4 eller 1-2)
// der er med. Ingen af delene: null (så spørger kunden selv)
function brPeriods(header) {
  const by = { month: [], quarter: [], half: [] };
  header.forEach((h) => {
    const k = brNorm(h);
    const iso = /20\d{2}-(\d{2})/.exec(k);
    const mon = /(^|[^a-zæøå])(jan|feb|mar|apr|maj|may|jun|jul|aug|sep|okt|oct|nov|dec)/.exec(k);
    const q = /(^|[^a-z0-9])q([1-4])($|[^a-z0-9])/.exec(k);
    const hy = /(^|[^a-z0-9])h([12])($|[^a-z0-9])/.exec(k);
    if (iso && Number(iso[1]) >= 1 && Number(iso[1]) <= 12) by.month.push(Number(iso[1]));
    else if (mon) by.month.push(MONTH_NUM[mon[2]]);
    else if (q) by.quarter.push(Number(q[2]));
    else if (hy) by.half.push(Number(hy[2]));
  });
  const gran = by.month.length ? 'month' : by.quarter.length ? 'quarter' : by.half.length ? 'half' : null;
  return { gran, nums: gran ? [...new Set(by[gran])] : [] };
}

/**
 * Dækker budgettet hele regnskabsåret? Regnskabsåret starter i måned fiscalStart og er fiscalLen måneder.
 * Kun for måned, kvartal og halvår; ellers null (så siger vi, at rådgiveren tjekker det).
 * @returns {{ ok: boolean, missing: number[] } | null}
 */
function brCoverage(gran, nums, fiscalStart, fiscalLen) {
  if (!gran || !nums.length || !fiscalStart || !fiscalLen) return null;
  const months = [];
  for (let i = 0; i < fiscalLen; i++) months.push(((fiscalStart - 1 + i) % 12) + 1);
  let need;
  if (gran === 'month') need = months;
  else if (gran === 'quarter') need = months.map(m => Math.ceil(m / 3));
  else if (gran === 'half') need = months.map(m => Math.ceil(m / 6));
  else return null;
  const missing = [...new Set(need)].filter(n => !nums.includes(n));
  return { ok: missing.length === 0, missing };
}

const isAssets = (l) => /^(aktiver|assets)$/.test(l) || (/aktiver|assets/.test(l) && /(i alt|sum|total)/.test(l) && !/anlægs|omsætnings|current|fixed/.test(l));
const isLiab = (l) => /^(passiver|liabilities and equity|equity and liabilities)$/.test(l) || (/passiver|liabilities/.test(l) && /(i alt|sum|total)/.test(l) && !/kortfristede|langfristede|current|non-current/.test(l));

/**
 * @param {Array<Array>} aoa rækkerne i et ark (SheetJS: sheet_to_json med header: 1)
 * @returns {{ years: string[], monthly: boolean, currency: string|null, unit: string|null,
 *            balanceFound: boolean, checks: Array<{ col: string, assets: number, liabilities: number, diff: number }> }}
 */
function brAnalyse(aoa) {
  const hi = brHeader(aoa);
  const header = hi >= 0 ? aoa[hi] || [] : [];
  const text = brScanText(aoa, hi);
  const years = [];
  let monthly = false;
  header.forEach((h) => {
    const k = brNorm(h);
    const m = /(^|[^0-9])(20\d{2})($|[^0-9])/.exec(k);
    if (!m) return;
    if (MONTHS.test(k) || /20\d{2}-\d{2}/.test(k)) monthly = true;
    else if (!years.includes(m[2])) years.push(m[2]);
  });
  years.sort();

  let aRow = null, lRow = null, lc = brLabelCol(aoa, hi >= 0 ? hi + 1 : 0);
  aoa.forEach((r, i) => {
    if (!r || (hi >= 0 && i <= hi)) return;
    // Navnet står i en af de to første kolonner (Gruppe, Post)
    [0, 1].forEach((c) => {
      const l = typeof r[c] === 'string' ? brNorm(r[c]) : '';
      if (!l) return;
      if (!aRow && isAssets(l)) { aRow = r; lc = c; }
      if (!lRow && isLiab(l)) lRow = r;
    });
  });
  const unit = brUnit(text);
  const absMin = unit === 'mio' ? 0.005 : unit === 'tkr' ? 0.5 : unit === 'kr' ? 1 : 0.01;
  const checks = [];
  if (aRow && lRow) {
    const width = Math.max(aRow.length, lRow.length);
    for (let c = 0; c < width; c++) {
      if (c === lc) continue;
      const a = brNum(aRow[c]), p = brNum(lRow[c]);
      if (a === null || p === null) continue;
      const diff = a - p;
      // Afrunding i filen er ikke en fejl: under 0,05 % af balancen og under en lille grænse i filens enhed
      if (Math.abs(diff) > Math.max(absMin, 0.0005 * Math.abs(a))) {
        const h = header[c];
        checks.push({ col: h == null || h === '' ? String(c + 1) : String(h).trim(), assets: a, liabilities: p, diff });
      }
    }
  }
  const periods = brPeriods(header);
  return {
    years,
    monthly,
    granularity: periods.gran || (years.length ? 'year' : null),
    periodNums: periods.nums,
    currency: brCurrency(text),
    unit,
    balanceFound: !!(aRow && lRow),
    checks,
  };
}

async function brReadFile(url, name) {
  if (!url || !window.XLSX || !/\.(xlsx|xls|csv)$/i.test(name || '')) return null;
  try {
    const buf = await (await fetch(url)).arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    let best = null, bestN = -1;
    wb.SheetNames.forEach((sn) => {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: null });
      const n = aoa.reduce((s, r) => s + (r || []).filter(c => typeof c === 'number').length, 0);
      if (n > bestN) { best = aoa; bestN = n; }
    });
    return best ? brAnalyse(best) : null;
  } catch (e) {
    return null;
  }
}

export { brAnalyse, brCoverage, brReadFile };
