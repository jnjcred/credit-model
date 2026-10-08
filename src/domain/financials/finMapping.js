// Fanen Virksomheden: de realiserede kvartaler fra kontomappingen (window.CW_MAP i
// src/domain/mapping.js). Flyttet ordret fra src/financials.jsx ved migrationen til Vue; kun
// import- og export-linjerne er nye. Lytteren på 'cw-mapping-changed' og det første kald af
// finSyncMapping() står i index.js, i samme rækkefølge som før.
// FIN_MAPPED er en levende binding (let): læs den, hvor den bruges (fx i en computed), og gem
// den ikke i en variabel ved opstart.
import { FIN_LAYOUT, FIN_ROW_BY_LABEL } from './finData.js';

/* ─────────────────────────────────────────────────────────────────────────
   Realiserede perioder fra kontomappingen (src/mapping.js, window.CW_MAP).
   Når kundens saldobalance fra e-conomic er hentet, og hver gang mappingen
   gemmes, regnes Q1, Q2 og jul-aug 2026 i ANNUAL_REPORT om af de mappede
   konti, og rækker uden ref og detaljelinjerne får egne kvartalstal (qvals).
   Summerne regnes som i FIN_EDIT_SUMS. Egenkapitalen er saldoen på
   egenkapitalkontiene plus årets resultat til og med perioden. Kan filen ikke
   hentes, står periodetallene, som de er i ANNUAL_REPORT.
   ──────────────────────────────────────────────────────────────────────── */
let FIN_MAPPED = false;
function finSyncMapping() {
  const M = window.CW_MAP;
  if (!M || !M.ready()) return false;
  const res = M.compute();
  const r6 = (v) => Math.round(v * 1e6) / 1e6;
  const set = (label, vals) => { const r = FIN_ROW_BY_LABEL[label]; if (r && r.q) vals.forEach((v, i) => { r.q[i] = r6(v); }); };
  const E = (label) => res.periods.map(p => p.entry[label] || 0);
  const add = (...arrs) => arrs[0].map((_, i) => arrs.reduce((s, a) => s + a[i], 0));
  const oms = E('Omsætning i alt'), vare = E('Vareforbrug/Produktionsomkostninger');
  const bf = add(oms, vare);
  const ebitda = add(bf, E('Personaleomkostninger'), E('Andre eksterne omkostninger'), E('Andre driftsindtægter'), E('Andre driftsomkostninger'));
  const ebit = add(ebitda, E('Årets af- og nedskrivninger i alt'));
  const result = add(ebit, E('Netto finansielle poster'), E('Skat af årets resultat i alt'));
  let ytd = 0;
  const ytdResult = result.map(v => (ytd += v));
  const anl = add(E('Immaterielle anlægsaktiver i alt'), E('Materielle anlægsaktiver i alt'), E('Finansielle anlægsaktiver i alt'));
  const oak = add(E('Varebeholdninger i alt'), E('Tilgodehavender i alt'), E('Værdipapirer'), E('Likvide beholdninger'));
  const lang = E('Langfristet gæld i alt'), kort = E('Kortfristet gæld i alt');
  set('Nettoomsætning', oms); set('Vareforbrug', vare); set('Bruttofortjeneste', bf);
  set('Personaleomkostninger', E('Personaleomkostninger')); set('Andre eksterne omkostninger', E('Andre eksterne omkostninger'));
  set('EBITDA', ebitda); set('Afskrivninger', E('Årets af- og nedskrivninger i alt')); set('Resultat før finansielle poster', ebit);
  set('Finansielle omkostninger', E('Netto finansielle poster')); set('Årets resultat', result);
  set('Anlægsaktiver', anl); set('Omsætningsaktiver', oak); set('Likvide beholdninger', E('Likvide beholdninger'));
  set('Aktiver i alt', add(anl, oak)); set('Egenkapital', add(E('Egenkapital'), ytdResult));
  set('Langfristet gæld', lang); set('Kortfristet gæld', kort); set('Gæld i alt', add(lang, kort));
  FIN_LAYOUT.forEach(g => g.entries.forEach(e => {
    if (!e.ref && !e.sum && !e.derive) { e.qvals = E(e.label).map(r6); e.qflow = g.label === 'Resultatopgørelse'; }
    (e.children || []).forEach(c => { c.qvals = res.periods.map(p => r6(p.child[e.label + ' / ' + c.label] || 0)); });
  }));
  FIN_MAPPED = true;
  return true;
}

// Modul-eksport
export { FIN_MAPPED, finSyncMapping };
