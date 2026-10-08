// Kontomapping (ruten 'mapping'): hjælperne og udkastet, flyttet ordret fra src/mapper.jsx ved
// migrationen til Vue; skærmen er src/views/mapping/MapperView.vue. Kun mapSetDraft og
// export-linjen er nye.
//
// Udkastet (MAP_DRAFT: kontonr. -> kategori-id) er de konti, rådgiveren har flyttet, men ikke
// gemt. Det ligger på modulniveau som før, så det overlever skift mellem sider (skærmen
// afmonteres), men ikke en genindlæsning. Skærmen læser MAP_DRAFT, når den monteres (levende
// binding), og skriver det med mapSetDraft.
// Filen har ingen virkninger ved indlæsning og sætter ingen window-globaler (window.MapperPage
// blev kun læst af app.jsx).
// Data og kategorier: src/domain/mapping.js (window.CW_MAP).

function mapFill(s, vars) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); }
// Beløb i hele kroner med e-conomics fortegn: "-928.076" / "-928,076"
function mapKr(v) {
  if (v == null || isNaN(v)) return '';
  const s = Math.abs(Math.round(v)).toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK');
  return (v < 0 ? '−' : '') + s;
}

// Fejlbeskederne fra mapping.js er dansk tekst; en evt. liste efter kolon oversættes ikke
function mapErr(msg) {
  const s = String(msg || ''), i = s.indexOf(': ');
  return i > 0 && !/^HTTP/.test(s) ? t(s.slice(0, i + 1)) + ' ' + s.slice(i + 2) : t(s);
}

// Udkastet (konti flyttet, men ikke gemt) overlever skift mellem sider
let MAP_DRAFT = {};

// Ny ved migrationen: et andet modul kan ikke tildele en importeret variabel, så skærmen gemmer
// udkastet her (før: `MAP_DRAFT = v` i MapperPage's setChanges)
function mapSetDraft(v) { MAP_DRAFT = v; }

// Modul-eksport til Vue-komponenterne
export { mapFill, mapKr, mapErr, MAP_DRAFT, mapSetDraft };
