/* global CW_PROMPTS */
// Fanen Virksomheden, Produkt, marked og branche: AI-teksterne (definitioner, gemt tilstand,
// prompt og kørsel). Flyttet ordret fra src/financials.jsx ved migrationen til Vue; kun
// import-/export-linjerne og global-kommentaren øverst er nye (CW_PROMPTS sættes af
// Prompt-værkstedet, src/domain/prompts.js, og læses først, når en prompt hentes).
// finAiPatch sender 'fin-ai-texts' på window. prompt_workshop og memo_handoff bruger FIN_AI_DEFS,
// finAiGenerate, finAiPatch og finAiAnyEdited som globale navne (index.js lægger dem på window).
import { cvrVal } from './finCvr.js';

// Produktbeskrivelse efter årsrapport 2025, ledelsesberetningen (hovedaktivitet)
const PRODUCT_TEXT = 'Nordhavn Composite A/S udvikler og fremstiller fiberforstærkede kompositkomponenter til vindindustrien: kulfiberlameller og bjælkepakker (spar caps), rodmoduler, næsekanter og servicepaneler til vinger. Produktionen sker på egne anlæg i Frederikshavn og Sæby, og selskabet leverer som underleverandør til vindmølleproducenter (OEM).';

// Markedstal og PEST, sammenfattet automatisk. Uden kilder, indtil hver påstand
// kan knyttes til et konkret dokument eller link.
const MARKET_TEXT = 'Det danske marked for vindkomponenter voksede ca. 6,8 % i 2025. Efterspørgslen i sektionen var stabil i andet kvartal 2026. Konkurrenceniveauet er moderat, med 5-7 spillere i det danske segment.';
const MARKET_PEST = [
  { k: 'Politisk',    desc: "EU's Green Deal og dansk vindkraftpolitik støtter sektoren. Følg evt. handelsbarrierer på import af kompositmaterialer." },
  { k: 'Økonomisk',   desc: 'Stabil branchevækst og lave finansieringsomkostninger. DKK/EUR-følsomhed pga. høj eksportandel kan påvirke marginer.' },
  { k: 'Socialt',     desc: 'Stigende efterspørgsel efter vedvarende energi understøtter ordretilgangen. Mangel på faglært arbejdskraft i kompositfaget kan presse lønningerne.' },
  { k: 'Teknologisk', desc: 'Genanvendelige kompositter og automatisering skaber muligheder, men kræver kapitalinvesteringer for at følge med.' },
];

/* ─────────────────────────────────────────────────────────────────────────
   AI-teksterne i Produkt, marked og branche (7. oktober): rådgiveren kan rette
   hver tekst, gendanne AI-teksten og køre AI igen. Er der forbundet en AI
   (window.AI, ai.js), skriver den et nyt udkast efter prompten i prompts/<fil>.md
   (rettes af produktfolkene selv, se prompts/README.md) og søger på nettet, hvis
   prompten og motoren tillader det; ellers
   skifter demoen mellem to forberedte AI-udkast (alt) og siger det.
   Tilstanden ligger i localStorage (kabul:, så Nulstil demo rydder den):
   { [id]: { edited, editedAt, editedBy, ai, aiAt, alt } }. Eksporten læser
   finAiText, så PDF og README følger det, der står på skærmen.
   ──────────────────────────────────────────────────────────────────────── */
const FIN_AI_KEY = 'kabul:fin-ai-texts:nordhavn';
const FIN_AI_DEFS = {
  product: { label: 'Produktbeskrivelse', text: PRODUCT_TEXT, file: 'produktbeskrivelse.md',
    alt: 'Nordhavn Composite A/S er underleverandør til vindmølleproducenter og fremstiller kompositkomponenter til vinger: kulfiberlameller og bjælkepakker (spar caps), rodmoduler, næsekanter og servicepaneler. Produktionen foregår på selskabets egne anlæg i Frederikshavn og Sæby.',
    ask: ['Skriv en produktbeskrivelse på 2-3 sætninger: hvad virksomheden laver, til hvem og hvor.', 'Write a product description of 2-3 sentences: what the company makes, for whom and where.'] },
  market: { label: 'Markedet', text: MARKET_TEXT, file: 'markedet.md',
    alt: 'Markedet for vindkomponenter i Danmark voksede med ca. 6,8 % i 2025, og efterspørgslen var stabil i andet kvartal 2026. Der er 5-7 aktører i det danske segment, og konkurrencen vurderes som moderat.',
    ask: ['Skriv 2-3 sætninger om markedet: vækst, efterspørgsel og konkurrence.', 'Write 2-3 sentences about the market: growth, demand and competition.'] },
};
const FIN_PEST_ALT = {
  'Politisk': "Den danske vindkraftpolitik og EU's Green Deal understøtter efterspørgslen. Handelsbarrierer på importerede kompositmaterialer kan påvirke indkøbet.",
  'Økonomisk': 'Branchen vokser stabilt, og finansieringsomkostningerne er lave. Den høje eksportandel gør marginerne følsomme over for kursen mellem DKK og EUR.',
  'Socialt': 'Efterspørgslen efter vedvarende energi stiger og understøtter ordretilgangen. Mangel på faglærte inden for kompositter kan presse lønningerne.',
  'Teknologisk': 'Genanvendelige kompositter og automatisering giver nye muligheder, men kræver investeringer for at følge med udviklingen.',
};
MARKET_PEST.forEach(p => {
  FIN_AI_DEFS['pest:' + p.k] = { label: p.k, text: p.desc, alt: FIN_PEST_ALT[p.k] || p.desc, file: 'pest.md', faktor: p.k,
    ask: ['Skriv 1-2 sætninger om den ' + p.k.toLowerCase() + 'e dimension i en PEST-analyse af virksomhedens marked.', 'Write 1-2 sentences about the ' + p.k + ' dimension of a PEST analysis of the company\'s market.'] };
});

function finAiLoad() { try { return JSON.parse(localStorage.getItem(FIN_AI_KEY) || '{}') || {}; } catch (e) { return {}; } }
function finAiPatch(id, patch) {
  const all = finAiLoad();
  all[id] = Object.assign({}, all[id] || {}, patch);
  try { localStorage.setItem(FIN_AI_KEY, JSON.stringify(all)); } catch (e) {}
  window.dispatchEvent(new CustomEvent('fin-ai-texts'));
}
function finAiState(id) { return finAiLoad()[id] || {}; }
// AI-teksten (seneste udkast) og teksten, der vises (rådgiverens rettelse går forud)
function finAiAiText(id) {
  const s = finAiState(id), def = FIN_AI_DEFS[id];
  return s.ai != null ? s.ai : t(s.alt ? def.alt : def.text);
}
function finAiText(id) { const s = finAiState(id); return s.edited != null ? s.edited : finAiAiText(id); }
function finAiAnyEdited() { const all = finAiLoad(); return Object.keys(all).some(k => all[k] && all[k].edited != null); }

// Sagens materiale til AI'en (pladsholderen {materiale}): ledelsesberetningen i den
// nyeste årsrapport og markedsrapporten. Regnskabstal sendes bevidst ikke med: de
// står andre steder i værktøjet og trak teksterne væk fra produkt og marked.
function finAiContext() {
  const docs = window.CASE_DOCS || [];
  const parts = [];
  const reports = docs.filter(d => d && d.type === 'Årsrapport' && Array.isArray(d.pages)).sort((a, b) => String(b.year).localeCompare(String(a.year)));
  if (reports[0]) reports[0].pages.filter(p => /ledelsesberetning/i.test(p.title)).forEach(p => parts.push('--- ' + reports[0].name + ', ' + p.ref + ' ---\n' + p.body));
  docs.filter(d => d && d.type === 'Marked' && Array.isArray(d.pages)).forEach(d => d.pages.slice(0, 3).forEach(p => parts.push('--- ' + d.name + ', ' + p.ref + ' ---\n' + p.body)));
  return parts.join('\n\n').slice(0, 12000);
}

/* Prompten læses fra prompts/<fil>.md (rettes i Prompt-værkstedet eller direkte i
   filen, se prompts/README.md): ## Indstillinger (websøgning: ja/nej), ## System og
   ## Opgave. Prompt-værkstedet (src/prompt_workshop.jsx, window.CW_PROMPTS) står for
   at hente filen (eller en kopi gemt i browseren) og læse afsnittene. Uden
   værkstedet hentes filen direkte. Kan den ikke hentes, bruges en kort indbygget prompt. */
async function finAiPrompt(id) {
  const def = FIN_AI_DEFS[id];
  let raw = null;
  try {
    if (window.CW_PROMPTS && typeof CW_PROMPTS.load === 'function') raw = await CW_PROMPTS.load(def.file);
    else {
      const r = await fetch('prompts/' + def.file + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) raw = await r.text();
    }
  } catch (e) { raw = null; }
  if (!raw || !/^##\s+Opgave/mi.test(raw)) {
    return {
      system: 'Du er kreditanalytiker og skriver korte, faktuelle baggrundstekster til en kreditrådgiver hos EIFO. Svar kun med selve teksten, uden overskrift eller indledning. Dagens dato er {dato}.',
      task: '<materiale>\n{materiale}\n</materiale>\n\n' + def.ask[0] + ' Højst 60 ord. Sprog: {sprog}.',
      web: true, fromFile: false,
    };
  }
  return Object.assign(finAiParse(raw), { fromFile: true });
}
// Afsnittene i en promptfil: { system, task, web }
function finAiParse(raw) {
  const sec = {};
  String(raw || '').replace(/\r\n/g, '\n').split(/^##\s+/m).slice(1).forEach(chunk => {
    const nl = chunk.indexOf('\n');
    sec[chunk.slice(0, nl < 0 ? undefined : nl).trim().toLowerCase()] = nl < 0 ? '' : chunk.slice(nl + 1).trim();
  });
  return { system: sec['system'] || '', task: sec['opgave'] || '', web: /websøgning:\s*ja/i.test(sec['indstillinger'] || '') };
}
function finAiFill(text, vars) { return String(text || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)); }
// Ryd op i svaret: ingen markdown-fed, links som ren tekst, ingen omgivende anførselstegn
function finAiClean(text) {
  return String(text || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/^["“„']+|["”']+$/g, '')
    .trim();
}
// Pladsholdernes værdier for en AI-tekst (samme i Kør AI igen og Prompt-værkstedet)
function finAiVars(id, opts) {
  const def = FIN_AI_DEFS[id] || {};
  const co = DATA.COMPANY || {};
  const en = window.CW_LANG === 'en';
  return {
    virksomhed: co.name, cvr: co.cvr, branche: cvrVal('industry'), aktivitet: co.activity, hjemsted: co.hq,
    ansatte: cvrVal('employees'), hjemmeside: co.website, dato: DATA.fmt.longDate(DATA.fmt.isoDay(new Date())),
    sprog: en ? 'engelsk' : 'dansk', materiale: finAiContext(), nuvaerende_tekst: finAiAiText(id),
    faktor: (opts && opts.faktor) || (def.faktor ? t(def.faktor) : ''),
  };
}
/* Kør AI'en med en prompt ({ system, task, web }) og returnér teksten uden at gemme
   noget. Bruges af Kør AI igen (finAiRun) og af Prompt-værkstedets "Prøv". */
async function finAiGenerate(id, pr, opts) {
  opts = opts || {};
  const vars = finAiVars(id, opts);
  const canSearch = typeof AI.canSearch === 'function' && AI.canSearch();
  const web = !!(pr.web && canSearch);
  let system = finAiFill(pr.system, vars);
  // Uden websøgning (slået fra i promptet, eller motoren kan ikke) skal AI'en vide det,
  // ellers forsøger den at søge, fordi promptteksten beder om det, og kørslen fejler
  if (!web) system += '\n\nI denne kørsel har du ikke adgang til internettet og kan ikke bruge værktøjer. Brug materialet og din generelle viden, og skriv kort, hvis du mangler aktuelle tal.';
  const task = finAiFill(pr.task, vars);
  const res = await AI.stream({
    system, maxTokens: 8000, webSearch: web, signal: opts.signal, onDelta: opts.onDelta,
    messages: [{ role: 'user', content: task }],
  });
  const text = finAiClean(res && res.text);
  if (!text) throw new Error(t('AI svarede ikke med en tekst.'));
  return { text, web, system, task };
}

async function finAiRun(id) {
  if (window.AI && typeof AI.isReady === 'function' && AI.isReady()) {
    const r = await finAiGenerate(id, await finAiPrompt(id));
    finAiPatch(id, { ai: r.text, aiAt: new Date().toISOString(), aiWeb: r.web, edited: null, editedAt: null, editedBy: null });
    return { real: true, web: r.web };
  }
  // Demo uden AI-forbindelse: skift til det andet forberedte AI-udkast
  await new Promise(r => setTimeout(r, 1100));
  const s = finAiState(id);
  finAiPatch(id, { ai: null, alt: !s.alt, aiAt: new Date().toISOString(), aiWeb: false, edited: null, editedAt: null, editedBy: null });
  return { real: false };
}

// Modul-eksport
export {
  PRODUCT_TEXT, MARKET_TEXT, MARKET_PEST, FIN_AI_KEY, FIN_AI_DEFS, FIN_PEST_ALT,
  finAiLoad, finAiPatch, finAiState, finAiAiText, finAiText, finAiAnyEdited,
  finAiContext, finAiPrompt, finAiParse, finAiFill, finAiClean, finAiVars, finAiGenerate, finAiRun,
};
