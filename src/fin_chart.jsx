/* ─────────────────────────────────────────────────────────────────────────
   Regnskab v2: grafen over regnskabstabellen (5.-6. oktober)

   Bygget efter designet "Virksomheden v2" fra Claude Design
   (design_handoff_regnskab_graf, seneste udgave "Graph redesign without
   takt"), men tegnet med prototypens eget designsystem (farver, skrift,
   knapper). Grafen står i sit eget kort over tabellen, og kolonnerne følger
   tabellens: [detaljefelt] 2023 · 2024 · 2025 · 2026 · 2027.

   Serier: Omsætning, Bruttofortjeneste og EBITDA kan slås til og fra i
   kortets hoved (standard: Omsætning og EBITDA). Titlen følger de viste
   serier. Oplyser årsrapporterne ikke omsætningen (små virksomheder må
   udelade den), slås Omsætning fra med en forklaring, og Bruttofortjeneste
   vises i stedet; i tabellen står "Ikke oplyst", og tallet kan indtastes.

   Grafen følger, hvad kunden faktisk har leveret (finDataState i
   financials.jsx): budget ja/nej og måneder med periodetal. Fire tilstande:
   1. Budget + periodetal: 2026E = periodetal + budget for resten af året.
   2. Budget uden periodetal: 2026E = budgettet alene.
   3. Periodetal uden budget: 2026 = periodetal plus lineær fremskrivning;
      2027 beder rådgiveren om et budget.
   4. Ingen af delene: ingen prognose; kortet beder om budget og periodetal.
   EBITDA-margin-strimlen er taget ud efter designets beslutning; marginerne
   står i detaljefeltet og i tabellen.
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

// Serierne i den rækkefølge, de står i kortets hoved. Søjlerne tegnes omvendt
// (EBITDA, Bruttofortjeneste, Omsætning), så den vigtigste står yderst til højre.
const FIN_SERIES = [
  { k: 'rev', row: 'Nettoomsætning', name: 'Omsætning' },
  { k: 'bf', row: 'Bruttofortjeneste', name: 'Bruttofortjeneste' },
  { k: 'eb', row: 'EBITDA', name: 'EBITDA' },
];

/** Perioderne (2023-2027) og en funktion, der giver en series lag i en periode. */
function finChartModel(model, data) {
  const N = data.months, B = data.hasBudget;
  const val = (label, col) => { const r = model.byLabel[label]; if (!r) return null; const x = finRawValue(r, col); return x == null || isNaN(x) ? null : x; };
  // Realiseret jan-N: summen af de realiserede kvartaler
  const ytd = (label) => {
    const xs = FIN_ACTUAL_Q.map((p, i) => val(label, { kind: 'q', idx: i }));
    if (xs.some(x => x == null)) return null;
    return xs.reduce((a, b) => a + b, 0);
  };
  const P = FIN_ANNUAL_YEARS.map((y, i) => ({ year: y, kind: 'annual', idx: i, g: (l) => val(l, { kind: 'annual', idx: i }) }));
  // 2026: periodetal + budget, budget alene, periodetal alene (fremskrevet) eller intet
  if (B && N) P.push({ year: '2026E', kind: 'fc26', kilde: true, g: (l) => val(l, { kind: 'est' }) });
  else if (B) P.push({ year: '2026E', kind: 'bud26', kilde: true, yearSub: t('sep-dec budget'), g: (l) => val(l, { kind: 'est', mode: 'budget' }),
    note: t('Der er ingen bogføring for 2026 endnu, og budgettet dækker kun sep-dec. Året vises alene ud fra budgettet.') });
  else if (N) P.push({ year: '2026', kind: 'ytd', kilde: true, showYtd: true, g: (l) => ytd(l),
    note: finFill(N === 1 ? t('Lineær fremskrivning af {n} måned. Sæsonudsving er ikke medregnet.') : t('Lineær fremskrivning af {n} måneder. Sæsonudsving er ikke medregnet.'), { n: N })
      + (N <= 3 ? ' ' + t('Få måneder giver et usikkert skøn.') : '') });
  else P.push({ year: '2026', kind: 'none', blank: true, g: () => null });
  // 2027: budget for Q1-Q3, ellers "Intet budget" (med periodetal) eller intet
  if (B) P.push({ year: '2027B', kind: 'b9', g: (l) => val(l, { kind: 'b9' }) });
  else P.push({ year: '2027', kind: 'none', empty: N > 0, blank: !N, g: () => null });

  // En series lag i en periode: realiseret (fyldt), budget (skraveret), fremskrevet (stiplet)
  const stack = (label, q) => {
    if (q.blank || q.empty) return null;
    let s = null;
    if (q.kind === 'annual') { const v = q.g(label); s = v == null ? null : { real: v, bud: 0, ghost: 0 }; }
    else if (q.kind === 'fc26') { const tot = q.g(label), r = ytd(label); s = tot == null ? null : { real: r || 0, bud: tot - (r || 0), ghost: 0 }; }
    else if (q.kind === 'bud26' || q.kind === 'b9') { const v = q.g(label); s = v == null ? null : { real: 0, bud: v, ghost: 0 }; }
    else if (q.kind === 'ytd') { const r = ytd(label); s = r == null ? null : { real: r, bud: 0, ghost: r / N * 12 - r }; }
    if (s) s.tot = s.real + s.bud + s.ghost;
    return s;
  };
  return { P, stack, N, B };
}

/** Bed kunden om et punkt: vælg det i "Anmod om materiale" og åbn dialogen på Overblik. */
function finAskCustomer(itemId, go) {
  try { CW.setSelection({ ...CW.selection(), [itemId]: true }); } catch (e) {}
  if (window.CW_REQUEST_MORE) window.CW_REQUEST_MORE(() => { if (go) go('workspace:1'); });
  else if (go) go('workspace:1');
}

// Grafens faste mål (designets mål, en anelse tættere som resten af appen)
const FIN_PLOT_H = 360;      // søjlefeltet
const FIN_PX_PER_T = 0.0056; // px pr. DKK t. (50.000 ≈ 280 px)

/* Søjlebredder efter designet: én stor serie 48 px og EBITDA 20 px; Omsætning og
   Bruttofortjeneste sammen 26 px hver og EBITDA 16 px; EBITDA alene 48 px.
   Er tabellens årskolonner smalle (smal skærm), skaleres alt ned, så søjlerne
   bliver i deres egen kolonne. */
function finBarWidths(keys, colPx, pad) {
  const big = keys.filter(k => k !== 'eb').length;
  const want = keys.map(k => (k === 'eb' ? (big === 0 ? 48 : big === 2 ? 16 : 20) : (big === 2 ? 26 : 48)));
  const gap = keys.length > 2 ? 6 : 4;
  const total = want.reduce((a, b) => a + b, 0) + gap * Math.max(0, keys.length - 1);
  // Plads til venstre for søjlerne, så EBITDA-tallet (højrestillet over søjlen) bliver i kolonnen
  const f = Math.min(1, Math.max(0.3, (colPx - pad - 30) / total));
  return { ws: want.map(w => Math.max(6, Math.round(w * f))), gap: Math.max(2, Math.round(gap * f)) };
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
  const [userSeries, setUserSeries] = React.useState(() => finChartLoad().series || {});
  const [tipOn, setTipOn] = React.useState(false);
  const { P, stack, N, B } = finChartModel(model, data);
  const hasForecast = B || N > 0;
  const sel = hover != null ? hover : 2;
  const unitShort = unit === 'mio' ? t('DKK mio.') : t('DKK t.');

  // Omsætning mangler i årsrapporterne? Alle år: Omsætning kan ikke vises.
  // Nogle år: Bruttofortjeneste vises som standard ved siden af.
  const annualRev = P.slice(0, 3).map(q => q.g('Nettoomsætning'));
  const noRevAll = annualRev.every(v => v == null);
  const noRevAny = annualRev.some(v => v == null);
  const on = {
    rev: !noRevAll && (userSeries.rev != null ? userSeries.rev : true),
    bf: userSeries.bf != null ? userSeries.bf : noRevAny,
    eb: userSeries.eb != null ? userSeries.eb : true,
  };
  const toggleSeries = (k) => {
    if (k === 'rev' && noRevAll) return;
    const next = { ...userSeries, [k]: !on[k] };
    setUserSeries(next); finChartStore({ series: next });
  };
  const visKeys = ['eb', 'bf', 'rev'].filter(k => on[k]);     // søjlernes rækkefølge fra venstre
  const rowOf = (k) => FIN_SERIES.find(s => s.k === k).row;
  const nameOf = (k) => t(FIN_SERIES.find(s => s.k === k).name);

  // Titlen følger de viste serier: "Omsætning, bruttofortjeneste og EBITDA"
  const titleNames = FIN_SERIES.filter(s => on[s.k]).map((s, j) => (j === 0 || s.k === 'eb' ? t(s.name) : t(s.name).toLowerCase()));
  const title = titleNames.length === 0 ? t('Ingen serier valgt')
    : titleNames.length === 1 ? titleNames[0]
    : titleNames.slice(0, -1).join(', ') + ' ' + t('og') + ' ' + titleNames[titleNames.length - 1];

  // Kolonnerne efter tabellen (årene flugter); ellers fem lige brede kolonner
  const geom = useFinTableCols([unit, window.CW_LANG, hidden, data.hasBudget, data.months, model]);
  const ws = geom ? geom.ws : [1, 1, 1, 1, 1];
  const totW = ws.reduce((a, b) => a + b, 0);
  const edges = ws.map((w, i) => ws.slice(0, i + 1).reduce((a, b) => a + b, 0) / totW);
  const pad = geom ? geom.pad : 16;
  const bw = finBarWidths(visKeys, geom ? Math.min(...geom.ws) : 150, pad);
  const fcLeft = (edges[2] * 100) + '%';
  const colTpl = ws.map(w => w + 'fr').join(' ');

  const toggle = () => {
    const h = !hidden;
    setHidden(h); finChartStore({ hidden: h }); setHover(null);
    CW.focusSoon('#fin-chart-toggle');
  };

  // Skala: designets 0,0056 px pr. DKK t., men aldrig højere end feltet
  const maxT = Math.max(1, ...P.flatMap(q => visKeys.map(k => { const s = stack(rowOf(k), q); return s ? s.tot * 1000 : 0; })));
  const pxPer = Math.min(FIN_PX_PER_T, 270 / maxT);
  const H = (v) => Math.max(0, Math.round((v || 0) * 1000 * pxPer));

  // Detaljefeltet: den valgte periode (standard 2025) for den første viste serie
  const q = P[sel];
  const pk = on.rev ? 'rev' : on.bf ? 'bf' : on.eb ? 'eb' : (noRevAll ? 'bf' : 'rev');
  const ps = stack(rowOf(pk), q);
  const big = ps == null ? '–' : fmt(q.showYtd ? ps.real : ps.tot, {});
  const ebS = stack('EBITDA', q);
  const per = finPer(N), rest = finRest(N);
  let facts;
  if (q.kind === 'annual') {
    const edited = !!(model.map && model.map['Nettoomsætning|y' + q.idx]);
    facts = [[t('Kilde'), edited ? t('Årsrapport, rettet manuelt') : t('Årsrapport')]];
    if (q.g('Nettoomsætning') == null) facts.unshift([t('Omsætning'), t('Ikke oplyst')]);
  } else if (q.kind === 'fc26') facts = ps ? [[finFill(t('Periodetal ({per})'), { per }), fmt(ps.real, {})], [finFill(t('Budget ({per})'), { per: rest }), fmt(ps.bud, {})]] : [];
  else if (q.kind === 'bud26') facts = [[t('Periodetal'), t('Ingen')], [finFill(t('Budget ({per})'), { per: t('sep-dec') }), ps ? fmt(ps.tot, {}) : '–']];
  else if (q.kind === 'ytd') facts = ps ? [[finFill(t('Periodetal ({per})'), { per }), fmt(ps.real, {})], [t('Fremskrevet helår'), '≈ ' + fmt(ps.tot, {})]] : [];
  else if (q.kind === 'b9') facts = [[t('Kilde'), t('9 mdr. budget')]];
  else facts = [[t('Kilde'), q.year.startsWith('2027') ? t('Intet budget') : t('Ingen periodetal eller budget')]];
  const rev = q.g('Nettoomsætning');
  const pc = (x) => (rev == null || x == null || !rev ? '–' : finPct1(x / rev * 100));
  const pers = q.g('Personaleomkostninger');
  const selMargins = [
    [t('Dækningsgrad'), pc(q.g('Bruttofortjeneste'))],
    [t('Løn % af omsætning'), pc(pers == null ? null : -pers)],
    [t('EBITDA-margin'), pc(q.g('EBITDA'))],
  ];
  const capOf = (k) => (q.showYtd ? finFill(t('{serie} {per} 2026'), { serie: nameOf(k), per }) : finFill(t('{serie} {aar}'), { serie: nameOf(k), aar: q.year }));

  const ask = (id) => () => finAskCustomer(id, go);
  const colLabel = (qq) => {
    if (qq.blank || qq.empty) return finFill(t('{aar}: ingen tal'), { aar: qq.year });
    return qq.year + ': ' + visKeys.slice().reverse().map(k => { const s = stack(rowOf(k), qq); return nameOf(k) + ' ' + (s ? (s.ghost ? '≈ ' : '') + fmt(s.tot, {}) : t('ikke oplyst')); }).join(', ') + ' ' + unitShort;
  };
  const chipTip = t('Omsætningen er ikke oplyst i årsrapporterne. Upload kundens interne årsrapport, eller klik på "Ikke oplyst" i tabellen og indtast omsætningen, så vises den i grafen.');

  return (
    <div id="fin-chart" className="card fcv2">
      <div className="fcv2-head">
        <h3>{title}</h3>
        <div className="fcv2-chips" role="group" aria-label={t('Serier i grafen')}>
          {FIN_SERIES.map(s => {
            const dis = s.k === 'rev' && noRevAll;
            return (
              <span key={s.k} className="fcv2-chipw">
                <button type="button" className={'fcv2-chip ' + s.k + (on[s.k] ? ' on' : '') + (dis ? ' dis' : '')}
                  aria-pressed={on[s.k]} aria-disabled={dis || undefined} aria-describedby={dis ? 'fcv2-chiptip' : undefined}
                  onClick={() => toggleSeries(s.k)}
                  onMouseEnter={() => dis && setTipOn(true)} onMouseLeave={() => dis && setTipOn(false)}
                  onFocus={() => dis && setTipOn(true)} onBlur={() => dis && setTipOn(false)}>
                  <i className="sw" aria-hidden="true"/>{t(s.name)}
                </button>
                {dis && <span id="fcv2-chiptip" role="tooltip" className={'fcv2-tip' + (tipOn ? ' show' : '')}>{chipTip}</span>}
              </span>
            );
          })}
        </div>
        <div className="fcv2-legend">
          {B && <span><i className="sw bud"/>{t('Budget')}</span>}
          {!B && N > 0 && <span><i className="sw ghost"/>{t('Fremskrevet helår')}</span>}
          <button id="fin-chart-toggle" type="button" className="btn-ghost-sm fcv2-toggle" onClick={toggle} aria-expanded={!hidden}>{hidden ? t('Vis graf') : t('Skjul graf')}</button>
        </div>
      </div>
      {!hidden && (
        <div className="fcv2-scroll">
          <div className="fcv2-grid" onMouseLeave={() => setHover(null)}
            style={geom ? { gridTemplateColumns: geom.c1 + 'px minmax(0, 1fr)', minWidth: 0, '--fcv2-pad': pad + 'px' } : undefined}>
            {/* Detaljefeltet */}
            <div className="fcv2-side" aria-live="polite" style={geom ? { width: geom.c1 } : undefined}>
              <div className="fcv2-top">
                <div className="fcv2-cap"><i className={'sw ' + pk}/>{capOf(pk)}</div>
                <div className="fcv2-big"><b>{big}</b><span>{unitShort}</span></div>
              </div>
              {pk !== 'eb' && (
                <div className="fcv2-top">
                  <div className="fcv2-cap"><i className="sw eb"/>{capOf('eb')}</div>
                  <div className="fcv2-big eb"><b>{ebS == null ? '–' : fmt(q.showYtd ? ebS.real : ebS.tot, {})}</b><span>{unitShort}</span></div>
                </div>
              )}
              <div className="fcv2-list">
                {q.kilde && <div className="fcv2-lbl">{t('Kilde')}</div>}
                {facts.map(([k, v], j) => <div key={j} className="fcv2-row"><span>{k}</span><b>{v}</b></div>)}
              </div>
              <div className="fcv2-list">
                <div className="fcv2-lbl">{q.showYtd ? finFill(t('Nøgletal {per}'), { per }) : t('Nøgletal')}</div>
                {selMargins.map(([k, v]) => <div key={k} className="fcv2-row"><span>{k}</span><b>{v}</b></div>)}
              </div>
              {q.note && <p className="fcv2-note">{q.note}</p>}
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
                  {P.map((qq, i) => (
                    <div key={qq.year} className={'fcv2-col' + (i === sel ? ' on' : '')} tabIndex={0} aria-label={colLabel(qq)}
                      onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                      {qq.empty && (
                        <div className="fcv2-empty">
                          <span>{t('Intet budget')}</span>
                          <button type="button" className="btn btn-primary btn-sm fcv2-cta-sm" onClick={ask('m-budget')}>{t('Anmod kunden om budget')}</button>
                        </div>
                      )}
                      <div className="fcv2-bars" style={{ gap: bw.gap }}>
                        {visKeys.map((k, j) => {
                          const s = stack(rowOf(k), qq);
                          const w = bw.ws[j];
                          if (!s) return <div key={k} className="fcv2-bar" style={{ width: w }}/>;
                          let rh = H(s.real), bh = H(s.bud), gh = H(s.ghost);
                          if (s.tot > 0 && rh + bh + gh === 0) { if (s.bud) bh = 2; else rh = 2; }
                          return (
                            <div key={k} className={'fcv2-bar ' + k} style={{ width: w }}>
                              <span className={'fcv2-bl' + (w >= 40 ? ' lg' : '')}>{(s.ghost ? '≈' : '') + fmt(s.tot, {})}</span>
                              <div className="fcv2-stack">
                                {gh > 0 && <div className="ghost" style={{ height: gh }}/>}
                                {bh > 0 && <div className={'bud' + (gh ? ' flat' : '')} style={{ height: bh }}/>}
                                {rh > 0 && <div className={'act' + (bh || gh ? ' flat' : '')} style={{ height: rh }}/>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
              <div className="fcv2-years" style={{ gridTemplateColumns: colTpl }}>
                {hasForecast && <div className="fcv2-zone" style={{ left: fcLeft }}/>}
                {hasForecast && <div className="fcv2-div" style={{ left: fcLeft }}/>}
                {P.map((qq, i) => (
                  <div key={qq.year} className={'fcv2-year' + (i === sel ? ' on' : '')} onMouseEnter={() => setHover(i)}>
                    <span>{qq.year}</span>
                    {qq.yearSub && <small>{qq.yearSub}</small>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { FinChart, finChartModel, finAskCustomer });
