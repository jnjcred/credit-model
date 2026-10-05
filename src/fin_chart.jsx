/* ─────────────────────────────────────────────────────────────────────────
   Regnskab v2: grafen "Omsætning og EBITDA" (5. oktober)

   Bygget efter designet "Virksomheden v2" fra Claude Design
   (design_handoff_regnskab_graf), men tegnet med prototypens eget
   designsystem (farver, skrift, knapper). Grafen står i sit eget kort over
   tabellen: [detaljefelt] 2023 · 2024 · 2025 · 2026 · 2027. Tabellen er
   uændret bortset fra, at 2026 og 2027 følger det leverede.

   Grafen følger, hvad kunden faktisk har leveret (finDataState i
   financials.jsx): budget ja/nej og måneder med periodetal. Fire tilstande:
   1. Budget + periodetal: 2026E = periodetal + budget for resten af året.
   2. Budget uden periodetal: 2026E = budgettet alene.
   3. Periodetal uden budget: 2026 = periodetal plus lineær fremskrivning;
      2027 beder rådgiveren om et budget.
   4. Ingen af delene: ingen prognose; kortet beder om budget og bogføring.
   Ingen menuer, forvalg eller andet end det, designet viser.
   ──────────────────────────────────────────────────────────────────────── */

const FIN_CHART_KEY = 'kabul:fin-chart';
const FIN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function finChartLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(FIN_CHART_KEY) || 'null');
    return s && typeof s === 'object' ? s : {};
  } catch (e) { return {}; }
}
function finChartStore(patch) {
  try { localStorage.setItem(FIN_CHART_KEY, JSON.stringify({ ...finChartLoad(), ...patch })); } catch (e) {}
}

// Perioder som "jan", "jan-aug"; resten af året som "sep-dec"
function finPer(n) { return n <= 0 ? '' : t(n === 1 ? 'jan' : 'jan-' + FIN_MONTHS[n - 1]); }
function finRest(n) { return t(n <= 0 ? 'jan-dec' : n === 11 ? 'dec' : FIN_MONTHS[n] + '-dec'); }
const finPctUnit = () => (window.CW_LANG === 'en' ? '%' : ' %');
function finPct1(v) { return v == null || !isFinite(v) ? '–' : formatNum(v, { decimals: 1 }) + finPctUnit(); }

/** Grafens tal ud fra modellen (med rettelser) og det, kunden har leveret. */
function finChartPeriods(model, data, fmt) {
  const N = data.months, B = data.hasBudget;
  const val = (label, col) => { const r = model.byLabel[label]; if (!r) return null; const x = finRawValue(r, col); return x == null || isNaN(x) ? null : x; };
  const getter = (col) => (label) => val(label, col);
  // Realiseret jan-N: summen af de realiserede kvartaler
  const ytd = (label) => {
    const xs = FIN_ACTUAL_Q.map((p, i) => val(label, { kind: 'q', idx: i }));
    if (xs.some(x => x == null)) return null;
    return xs.reduce((a, b) => a + b, 0);
  };
  const REV = 'Nettoomsætning', EB = 'EBITDA';
  const per = finPer(N), rest = finRest(N);
  const P = FIN_ANNUAL_YEARS.map((y, i) => {
    const g = getter({ kind: 'annual', idx: i });
    const edited = !!(model.map && model.map[REV + '|y' + i]);
    const rev = g(REV);
    // Årsrapporten oplyser ikke omsætningen: rådgiveren kan indtaste den eller bede om en intern årsrapport
    if (rev == null) return { year: y, g, rev: null, real: null, eb: g(EB), ebKind: 'act', kind: 'annual', norev: true, colIdx: i,
      facts: [[t('Kilde'), t('Årsrapport uden omsætning')]],
      note: t('Årsrapporten oplyser ikke omsætningen. Små virksomheder må udelade den. Indtast den fra en intern årsrapport, eller bed kunden om årsrapporten med omsætning.') };
    return { year: y, g, rev, real: rev, eb: g(EB), ebKind: 'act', kind: 'annual',
      facts: [[t('Kilde'), edited ? t('Årsrapport, rettet manuelt') : t('Årsrapport')]] };
  });
  P.forEach((p, i) => { if (i > 0) p.cmp = { base: P[i - 1].rev, label: finFill(t('mod {aar}'), { aar: P[i - 1].year }) }; });
  const last = P[P.length - 1];

  // 2026
  if (B && N) {
    const g = getter({ kind: 'est' });
    const rev = g(REV), real = ytd(REV);
    P.push({ year: '2026E', g, rev, real, bud: rev != null && real != null ? rev - real : rev, eb: g(EB), ebKind: 'fc', kind: 'fc', kilde: true,
      cmp: { base: last.rev, label: finFill(t('mod {aar}'), { aar: last.year }) },
      facts: [[finFill(t('Periodetal ({per})'), { per }), fmt(real, {})], [finFill(t('Budget ({per})'), { per: rest }), fmt(rev - real, {})]] });
  } else if (B) {
    // Budgettet dækker kun sep-dec 2026 (budget v3), så året står som budget alene
    const g = getter({ kind: 'est', mode: 'budget' });
    const rev = g(REV);
    P.push({ year: '2026E', yearSub: t('sep-dec budget'), g, rev, real: 0, bud: rev, eb: g(EB), ebKind: 'fc', kind: 'fc', kilde: true,
      facts: [[t('Periodetal'), t('Ingen')], [finFill(t('Budget ({per})'), { per: t('sep-dec') }), fmt(rev, {})]],
      note: t('Der er ingen bogføring for 2026 endnu, og budgettet dækker kun sep-dec. Året vises alene ud fra budgettet.') });
  } else if (N) {
    const g = (label) => ytd(label);
    const real = ytd(REV), annual = real != null ? real / N * 12 : null;
    const ebY = ytd(EB);
    P.push({ year: '2026', g, rev: annual, real, ghost: annual != null ? annual - real : null, showYtd: true, kind: 'ytd', kilde: true,
      eb: ebY, ebAnnual: ebY != null ? ebY / N * 12 : null, ebKind: 'ytd',
      cmp: { base: last.rev, label: finFill(t('fremskrevet mod {aar}'), { aar: last.year }), base2: annual },
      facts: [[finFill(t('Periodetal ({per})'), { per }), fmt(real, {})], [t('Fremskrevet helår'), '≈ ' + fmt(annual, {})]],
      note: finFill(N === 1 ? t('Lineær fremskrivning af {n} måned. Sæsonudsving er ikke medregnet.') : t('Lineær fremskrivning af {n} måneder. Sæsonudsving er ikke medregnet.'), { n: N })
        + (N <= 3 ? ' ' + t('Få måneder giver et usikkert skøn.') : '') });
  } else {
    P.push({ year: '2026', g: () => null, rev: null, blank: true, kind: 'none', facts: [[t('Kilde'), t('Ingen periodetal eller budget')]] });
  }
  // 2027
  if (B) {
    const g = getter({ kind: 'b9' });
    const rev = g(REV);
    P.push({ year: '2027B', g, rev, real: 0, bud: rev, eb: g(EB), ebKind: 'fc', kind: 'fc', facts: [[t('Kilde'), t('9 mdr. budget')]] });
  } else {
    P.push({ year: '2027', g: () => null, rev: null, empty: !!N, blank: !N, kind: 'none', facts: [[t('Kilde'), t('Intet budget')]] });
  }
  return P;
}

/** Bed kunden om et punkt: vælg det i "Anmod om materiale" og åbn dialogen på Overblik. */
function finAskCustomer(itemId, go) {
  try { CW.setSelection({ ...CW.selection(), [itemId]: true }); } catch (e) {}
  if (window.CW_REQUEST_MORE) window.CW_REQUEST_MORE(() => { if (go) go('workspace:1'); });
  else if (go) go('workspace:1');
}

// Grafens faste mål (designets mål, en anelse tættere som resten af appen)
const FIN_PLOT_H = 360;      // søjlefeltet
const FIN_STRIP_H = 96;      // EBITDA-margin
const FIN_PX_PER_T = 0.0056; // px pr. DKK t. (50.000 ≈ 280 px)
const FIN_SAREA_H = 60;      // strimlens tegneflade: 96 - 26 (top) - 10 (bund)
// Søjlernes bredde: omsætning 40 px og EBITDA 16 px, men smallere når tabellens
// årskolonner er smalle (smal skærm), så etiketterne bliver i deres egen kolonne.
function finBarSizes(colPx) {
  const rev = Math.max(18, Math.min(40, Math.round(colPx * 0.36)));
  const eb = Math.max(8, Math.min(16, Math.round(colPx * 0.15)));
  const gap = colPx < 90 ? 3 : 4;
  return { rev, eb, gap, off: rev + gap + eb / 2 };
}

/* Tabellens kolonner, så årene i grafen står lige over årene i tabellen.
   Måles fra tabelhovedet (rækkenavne + fem talkolonner, når kvartalerne er
   foldet sammen). Med kvartalerne foldet ud, eller før målingen, bruger grafen
   sit eget gitter. */
function useFinTableCols(deps) {
  const [geom, setGeom] = React.useState(null);
  const measure = React.useCallback(() => {
    const table = document.getElementById('fin-annual-table');
    if (!table || table.classList.contains('fin-q')) { setGeom(g => (g ? null : g)); return; }
    const c1 = table.querySelector('thead th.fin-c1');
    const ths = [...table.querySelectorAll('thead tr:last-child th[data-col]')];
    if (!c1 || ths.length !== 5) { setGeom(g => (g ? null : g)); return; }
    const pad = parseFloat(getComputedStyle(ths[0]).paddingRight) || 10;
    const next = { c1: Math.round(c1.getBoundingClientRect().width), ws: ths.map(th => Math.round(th.getBoundingClientRect().width)), pad: Math.round(pad) };
    setGeom(g => (g && JSON.stringify(g) === JSON.stringify(next) ? g : next));
  }, []);
  React.useLayoutEffect(() => { measure(); }, deps);
  React.useEffect(() => {
    const table = document.getElementById('fin-annual-table');
    if (!table || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(table);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, []);
  return geom;
}

function FinChart({ model, unit, fmt, data, locked, go, onImport }) {
  const [hidden, setHidden] = React.useState(() => !!finChartLoad().hidden);
  const [hover, setHover] = React.useState(null);
  const B = data.hasBudget, N = data.months;
  const hasForecast = B || N > 0;
  const P = finChartPeriods(model, data, fmt);
  // Kolonnerne efter tabellen (årene flugter); ellers fem lige brede kolonner
  const geom = useFinTableCols([unit, window.CW_LANG, hidden, data.hasBudget, data.months, model]);
  const ws = geom ? geom.ws : [1, 1, 1, 1, 1];
  const tot = ws.reduce((a, b) => a + b, 0);
  const edges = ws.map((w, i) => ws.slice(0, i + 1).reduce((a, b) => a + b, 0) / tot);   // kolonnernes højre kant (0-1)
  const pad = geom ? geom.pad : 16;
  const bars = finBarSizes(geom ? Math.min(...geom.ws) : 140);
  const dotX = pad + bars.off;
  const fcLeft = (edges[2] * 100) + '%';
  const colTpl = ws.map(w => w + 'fr').join(' ');
  const sel = hover != null ? hover : 2;
  const yearsRef = React.useRef(null);
  const [yearX, setYearX] = React.useState(null);   // årstallenes midte som brøkdel af bredden
  React.useLayoutEffect(() => {
    const box = yearsRef.current;
    if (!box) return;
    const b = box.getBoundingClientRect();
    if (!b.width) return;
    const xs = [...box.querySelectorAll('.fcv2-year > span')].map(sp => { const r = sp.getBoundingClientRect(); return Math.round(((r.left + r.right) / 2 - b.left) / b.width * 10000) / 10000; });
    if (xs.length === 5 && JSON.stringify(xs) !== JSON.stringify(yearX)) setYearX(xs);
  });
  const unitShort = unit === 'mio' ? t('DKK mio.') : t('DKK t.');

  const toggle = () => {
    const h = !hidden;
    setHidden(h); finChartStore({ hidden: h }); setHover(null);
    CW.focusSoon('#fin-chart-toggle');
  };

  // Skala: designets 0,0056 px pr. DKK t., men aldrig højere end feltet
  const maxT = Math.max(1, ...P.map(p => (p.rev || 0) * 1000));
  const pxPer = Math.min(FIN_PX_PER_T, 270 / maxT);
  const H = (v) => Math.max(0, Math.round((v || 0) * 1000 * pxPer));

  const ebMargin = (p) => {
    if (p.blank || p.empty) return null;
    const r = p.g('Nettoomsætning'), e = p.g('EBITDA');
    return r == null || e == null || !r ? null : e / r * 100;
  };
  const margins = P.map(ebMargin);

  // Detaljefeltet: den valgte periode (standard 2025)
  const p = P[sel];
  const shown = p.showYtd ? p.real : p.rev;
  const rev = p.g('Nettoomsætning');
  const pc = (x) => (rev == null || x == null || !rev ? '–' : finPct1(x / rev * 100));
  const pers = p.g('Personaleomkostninger');
  const selMargins = [
    [t('Dækningsgrad'), pc(p.g('Bruttofortjeneste'))],
    [t('Løn % af omsætning'), pc(pers == null ? null : -pers)],
    [t('EBITDA-margin'), pc(p.g('EBITDA'))],
  ];

  // Margin-strimlen: punkterne står lige under årstallene
  const maxM = Math.max(10, ...margins.filter(m => m != null));
  const my = (m) => Math.max(22, Math.min(FIN_SAREA_H - 4, FIN_SAREA_H - 6 - (m / maxM) * 30));
  const fcIdx = (i) => B && i >= 3;
  // Før målingen: et skøn ud fra kolonnernes højre kant
  const xAt = (i) => (yearX ? yearX[i] : edges[i] - 0.03);
  const solid = [], dash = [];
  margins.forEach((m, i) => {
    if (m == null) return;
    const pt = (xAt(i) * 1000).toFixed(2) + ',' + my(m).toFixed(2);
    if (!fcIdx(i)) solid.push(pt);
    if (B && i >= 2) dash.push(pt);
  });

  const legend = (
    <div className="fcv2-legend">
      <span><i className="sw act"/>{t('Omsætning')}</span>
      {B && <span><i className="sw bud"/>{t('Budget')}</span>}
      {!B && N > 0 && <span><i className="sw ghost"/>{t('Fremskrevet helår')}</span>}
      <span><i className="sw eb"/>{t('EBITDA')}</span>
      <span><i className="sw line"/>{t('EBITDA-margin %')}</span>
      <button id="fin-chart-toggle" type="button" className="btn-ghost-sm fcv2-toggle" onClick={toggle} aria-expanded={!hidden}>{hidden ? t('Vis graf') : t('Skjul graf')}</button>
    </div>
  );

  const ask = (id) => () => finAskCustomer(id, go);
  // Indtast omsætningen: åbn cellen i tabellen
  const enterRevenue = (i) => () => {
    const td = document.querySelector('[data-fin-cell="Nettoomsætning|y' + i + '"]');
    if (!td) return;
    td.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => td.click(), 250);
  };
  const colLabel = (q, i) => {
    if (q.blank || q.empty) return finFill(t('{aar}: ingen tal'), { aar: q.year });
    return q.year + ': ' + t('Omsætning') + ' ' + (q.ghost ? '≈ ' : '') + fmt(q.rev, {}) + ' ' + unitShort
      + (q.eb != null ? ', ' + t('EBITDA') + ' ' + fmt(q.eb, {}) : '')
      + (margins[i] != null ? ', ' + t('EBITDA-margin') + ' ' + finPct1(margins[i]) : '');
  };

  return (
    <div id="fin-chart" className="card fcv2">
      <div className="fcv2-head">
        <h3>{t('Omsætning og EBITDA')}</h3>
        {legend}
      </div>
      {!hidden && (
        <div className="fcv2-scroll">
          <div className="fcv2-grid" onMouseLeave={() => setHover(null)}
            style={Object.assign({ '--fcv2-rev': bars.rev + 'px', '--fcv2-eb': bars.eb + 'px', '--fcv2-gap': bars.gap + 'px' },
              geom ? { gridTemplateColumns: geom.c1 + 'px minmax(0, 1fr)', minWidth: 0, '--fcv2-pad': pad + 'px' } : {})}>
            {/* Detaljefeltet */}
            <div className="fcv2-side" aria-live="polite" style={geom ? { width: geom.c1 } : undefined}>
              <div className="fcv2-top">
                <div className="fcv2-cap"><i className="sw act"/>{p.showYtd ? finFill(t('Omsætning {per} 2026'), { per: finPer(N) }) : finFill(t('Omsætning {aar}'), { aar: p.year })}</div>
                <div className="fcv2-big"><b>{p.blank || p.empty || shown == null ? '–' : fmt(shown, {})}</b><span>{unitShort}</span></div>
              </div>
              <div className="fcv2-top">
                <div className="fcv2-cap"><i className="sw eb"/>{p.showYtd ? finFill(t('EBITDA {per} 2026'), { per: finPer(N) }) : finFill(t('EBITDA {aar}'), { aar: p.year })}</div>
                <div className="fcv2-big eb"><b>{p.blank || p.empty || p.eb == null ? '–' : fmt(p.eb, {})}</b><span>{unitShort}</span></div>
              </div>
              <div className="fcv2-list">
                {p.kilde && <div className="fcv2-lbl">{t('Kilde')}</div>}
                {p.facts.map(([k, v], j) => <div key={j} className="fcv2-row"><span>{k}</span><b>{v}</b></div>)}
              </div>
              <div className="fcv2-list">
                <div className="fcv2-lbl">{p.showYtd ? finFill(t('Marginer {per}'), { per: finPer(N) }) : t('Marginer')}</div>
                {selMargins.map(([k, v]) => <div key={k} className="fcv2-row"><span>{k}</span><b>{v}</b></div>)}
              </div>
              {p.note && <p className="fcv2-note">{p.note}</p>}
              {B && !N && (
                <div className="fcv2-ask">
                  <span>{t('Der er ingen periodetal for 2026.')}</span>
                  <button type="button" className="btn-link fcv2-link" onClick={ask('m-interim')}>{t('Anmod kunden om periodetal')}</button>
                </div>
              )}
            </div>

            <div className="fcv2-main">
              {/* Søjlerne */}
              <div className="fcv2-plot" style={{ height: FIN_PLOT_H }}>
                {hasForecast && <div className="fcv2-zone" style={{ left: fcLeft }}/>}
                {hasForecast && <div className="fcv2-zlbl" style={{ left: 'calc(' + fcLeft + ' + 12px)' }}>{t('Prognose')}</div>}
                <div className="fcv2-slbl">{t('Årsrapporter')}</div>
                {[292, 236, 180, 124, 68].map(b => <div key={b} className="fcv2-gl" style={{ bottom: b }}/>)}
                <div className="fcv2-gl base" style={{ bottom: 12 }}/>
                <div className="fcv2-cols" style={{ gridTemplateColumns: colTpl }}>
                  {P.map((q, i) => {
                    const on = i === sel;
                    const rh = H(q.real), bh = H(q.bud), gh = H(q.ghost);
                    const ebV = q.eb != null && q.eb > 0 ? q.eb : 0;
                    const ebH = H(ebV) || (ebV ? 2 : 0);
                    const ebGh = q.ebKind === 'ytd' && q.ebAnnual != null ? Math.max(0, H(q.ebAnnual) - ebH) : 0;
                    const fc = q.ebKind === 'fc';
                    return (
                      <div key={q.year} className={'fcv2-col' + (on ? ' on' : '')} tabIndex={0} aria-label={colLabel(q, i)}
                        onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                        {q.norev && (
                          <div className="fcv2-empty norev">
                            <span>{t('Omsætning ikke oplyst')}</span>
                            {!locked && <button type="button" className="btn btn-primary btn-sm fcv2-cta-sm" onClick={enterRevenue(q.colIdx)}>{t('Indtast omsætning')}</button>}
                            <button type="button" className="btn-link fcv2-link" onClick={ask('m-annual')}>{t('Anmod om intern årsrapport')}</button>
                          </div>
                        )}
                        {q.empty && (
                          <div className="fcv2-empty">
                            <span>{t('Intet budget')}</span>
                            <button type="button" className="btn btn-primary btn-sm fcv2-cta-sm" onClick={ask('m-budget')}>{t('Anmod kunden om budget')}</button>
                          </div>
                        )}
                        <span className="fcv2-val">{q.empty || q.blank || q.rev == null ? '' : (q.ghost ? '≈ ' : '') + fmt(q.rev, {})}</span>
                        <div className="fcv2-bars">
                          <div className="fcv2-ebw">
                            <span className="fcv2-ebl">{q.empty || q.blank || q.eb == null ? '' : ebGh ? '≈' + fmt(q.ebAnnual, {}) : fmt(q.eb, {})}</span>
                            <div className="fcv2-ebstack">
                              {ebGh > 0 && <div className="eb-ghost" style={{ height: ebGh }}/>}
                              <div className={'eb' + (fc ? ' fc' : '') + (ebGh ? ' flat' : '')} style={{ height: ebH }}/>
                            </div>
                          </div>
                          <div className="fcv2-rev">
                            {gh > 0 && <div className="rv-ghost" style={{ height: gh }}/>}
                            {bh > 0 && <div className={'rv-bud' + (gh ? ' flat' : '')} style={{ height: bh }}/>}
                            {rh > 0 && <div className={'rv-act' + (bh || gh ? ' flat' : '')} style={{ height: rh }}/>}
                            {q.ghost && gh > 22 && <span className="rv-inner" style={{ bottom: rh + 4 }}>{fmt(q.real, {})}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasForecast && <div className="fcv2-div" style={{ left: fcLeft }}/>}
                {!hasForecast && (
                  <div className="fcv2-nofc" style={{ left: 'calc(' + fcLeft + ' + 12px)' }}>
                    <div className="t">{t('Ingen prognose for 2026 og 2027')}</div>
                    <p>{t('Der er hverken bogføring eller budget for 2026. Bed kunden om et budget, så I kan følge, hvor virksomheden er på vej hen.')}</p>
                    <div className="b">
                      <button type="button" className="btn btn-primary btn-sm" onClick={ask('m-budget')}>{t('Anmod kunden om budget')}</button>
                      {!locked && <button type="button" className="btn btn-sm" onClick={onImport}>{t('Importér budget')}</button>}
                    </div>
                    <button type="button" className="btn-link fcv2-link" onClick={ask('m-interim')}>{t('Anmod kunden om periodetal')}</button>
                  </div>
                )}
              </div>

              {/* Årstallene */}
              <div className="fcv2-years" ref={yearsRef} style={{ gridTemplateColumns: colTpl }}>
                {hasForecast && <div className="fcv2-zone" style={{ left: fcLeft }}/>}
                {hasForecast && <div className="fcv2-div" style={{ left: fcLeft }}/>}
                {P.map((q, i) => (
                  <div key={q.year} className={'fcv2-year' + (i === sel ? ' on' : '')} onMouseEnter={() => setHover(i)}>
                    <span>{q.year}</span>
                    {q.yearSub && <small>{q.yearSub}</small>}
                  </div>
                ))}
              </div>

              {/* EBITDA-margin */}
              <div className="fcv2-strip" style={{ height: FIN_STRIP_H }}>
                {hasForecast && <div className="fcv2-zone" style={{ left: fcLeft }}/>}
                {hasForecast && <div className="fcv2-div top" style={{ left: fcLeft }}/>}
                <div className="fcv2-slbl strip">{t('EBITDA-margin')}</div>
                <div className="fcv2-sarea">
                  <svg viewBox={'0 0 1000 ' + FIN_SAREA_H} preserveAspectRatio="none" aria-hidden="true" style={{ left: 0, height: FIN_SAREA_H }}>
                    {solid.length > 1 && <polyline points={solid.join(' ')} fill="none" stroke="#334155" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>}
                    {dash.length > 1 && <polyline points={dash.join(' ')} fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>}
                  </svg>
                  {margins.map((m, i) => m == null ? null : (
                    <React.Fragment key={i}>
                      <div className={'fcv2-dot' + (fcIdx(i) ? ' hollow' : '') + (i === sel ? ' on' : '')}
                        style={{ left: (xAt(i) * 100) + '%', top: my(m) }}/>
                      <div className={'fcv2-dlbl' + (i === sel ? ' on' : '')} style={{ left: (xAt(i) * 100) + '%', top: my(m) - 26 }}>{finPct1(m)}</div>
                    </React.Fragment>
                  ))}
                </div>
                {!hasForecast && (
                  <div className="fcv2-shint" style={{ left: 'calc(' + fcLeft + ' + 12px)' }}>
                    <span>{t('Ingen margin for 2026 og 2027 endnu.')}</span>
                    <button type="button" className="btn-link fcv2-link" onClick={ask('m-budget')}>{t('Anmod kunden om budget')}</button>
                  </div>
                )}
                {!B && N > 0 && (
                  <div className="fcv2-shint col" style={{ left: (edges[3] * 100) + '%', right: 0 }}>
                    <button type="button" className="btn-link fcv2-link" onClick={ask('m-budget')}>{t('Anmod kunden om budget')}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { FinChart, finChartPeriods, finAskCustomer });
