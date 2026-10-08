// Credit memo · AI-laget uden brugerflade: sagsgrundlaget til modellen (faktaarket, regnskabstallene og
// dokumenterne), opgaverne (skriv, omskriv afsnittet eller markeringen, chat), oprydning af modellens svar
// (cleanHtml), ophavsmærker (markAsDraft) og opdeling af chatsvar i forslag. Flyttet ordret fra
// src/memo_ai.jsx (linje 12-166, 172-202, 204-319, 321-360, 368-427 og 990-1033) ved migrationen til Vue;
// kun import- og export-linjerne og to steder i cleanHtml er nye (se nedenfor). AI_EN læses, når modulet
// indlæses (et sprogskift genindlæser).
// Ikke flyttet: buildGround og ORIGIN_LABEL (død kode), komponenterne og hooks'ene (src/views/memo/ai,
// src/components/ai) og window.MemoAI. SEC og MEMO_SOURCES importeres fra memoTemplates.js.
// cleanHtml er rettet to steder i forhold til prototypen:
// - Modellens og udklipsholderens HTML fortolkes i et tomt dokument uden vindue
//   (document.implementation.createHTMLDocument), så billeder ikke hentes, og on*-handlere (fx <img onerror>)
//   aldrig kører. Resultatet er det samme som ved fortolkning i sidens eget dokument; kun indhold i <noscript>
//   læses som markup i stedet for tekst.
// - <style>, <title> og <script> fjernes med indhold i stedet for at blive pakket ud. Excel og Word lægger et
//   helt dokument med stilark på udklipsholderen; ellers blev stilarket til synlig tekst i memoet.
import { MEMO_SOURCES, SEC } from './memoTemplates.js';

/* ── Sagsgrundlag ────────────────────────────────────────────────────────── */

/* Sagsfakta til modellen bygges af det samme faktaark (window.CASE_FACTS) og
   de samme stamdata (window.DATA), som skærmene viser. Så kan AI'en ikke få
   et andet billede af sagen end rådgiveren. Tåler at felter mangler. */
function memoAiCaseContext() {
  const F = (window.CASE_FACTS && typeof window.CASE_FACTS === 'object') ? window.CASE_FACTS : {};
  const D = window.DATA || {};
  const CO = D.COMPANY || {};
  const mio = (kr) => kr == null ? '-' : (kr / 1e6).toFixed(1).replace('.', ',') + ' mio.';
  const pct = (x) => x == null ? '-' : (x <= 1 ? x * 100 : x).toFixed(0) + ' %';
  const src = (s) => s && s.doc ? ' [' + s.doc + (s.ref ? ', ' + s.ref : '') + ']' : '';
  const L = [];
  L.push('Selskab: ' + (CO.name || 'Nordhavn Composite A/S') + ', CVR ' + (CO.cvr || '') + ', ' + [CO.address, CO.postal].filter(Boolean).join(', ') + '.');
  if (CO.activity) L.push('Aktivitet: ' + CO.activity + '. ' + (CO.employees ? CO.employees + ' ansatte.' : ''));
  if (Array.isArray(D.MANAGEMENT)) L.push('Direktion: ' + D.MANAGEMENT.map(m => m.name + ' (' + m.role + ')').join(', ') + '.');
  if (Array.isArray(D.BOARD)) L.push('Bestyrelse: ' + D.BOARD.map(m => m.name + ' (' + m.role + ')').join(', ') + '.');
  if (Array.isArray(D.OWNERS)) L.push('Ejerkreds: ' + D.OWNERS.map(o => o.name + ' ' + String(o.share).replace('.', ',') + ' %').join(', ') + '.');
  L.push('Sagsnummer: ' + (CO.caseNr || '2026-0184') + '. Sagsbehandler: Mette Larsen, Kredit. Sekundær: Sofie Andersen, Erhverv.');
  if (F.asOf) L.push('Sagens dato (pr.-dato for memoet): ' + F.asOf + '.');
  const a = F.application || {};
  if (a.product || a.amount) L.push('Ansøgningen: ' + [a.product, a.amount != null ? 'DKK ' + mio(a.amount) : null].filter(Boolean).join(', ') + (a.purpose ? '. Formål: ' + a.purpose : '') + src(a.source));
  const f = F.facility || {};
  if (f.instrument || f.facilityAmount) {
    L.push('Facilitet: ' + [f.instrument, f.facilityType, f.bank].filter(Boolean).join(', ') + '. Bankens facilitet DKK ' + mio(f.facilityAmount) +
      ', EIFO-andel ' + pct(f.eifoShare) + ' = DKK ' + mio(f.eifoAmount) + '. Løbetid ' + (f.tenorMonths || '-') + ' mdr. (' + (f.start || '-') + ' til ' + (f.end || '-') + ').' +
      (f.ranking ? ' Prioritet: ' + f.ranking + '.' : '') + (f.pricing ? ' Rente: ' + f.pricing + '.' : '') + (f.premium ? ' Præmie: ' + f.premium + '.' : '') + src(f.source));
  }
  const list = (title, arr, fmt) => { if (Array.isArray(arr) && arr.length) L.push(title + ':\n' + arr.filter(Boolean).map(x => '- ' + fmt(x)).join('\n')); };
  list('Betingelser før udbetaling', F.conditions, c => (c.id ? c.id + ' ' : '') + c.text + ' (' + (c.status || '') + (c.note ? ', ' + c.note : '') + ')' + src(c.source));
  list('Covenants', F.covenants, c => (c.id ? c.id + ' ' : '') + c.text + src(c.source));
  list('Vigtige datoer', F.keyDates, k => k.date + ': ' + k.text + ' (' + (k.status || '') + ')' + src(k.source));
  list('Røde flag', F.redFlags, r => r.text + ' (' + (r.severity || '') + ')' + src(r.source));
  list('Nøgletal', F.keyFigures, k => (k.label || k.key) + ': ' + Object.keys(k.values || {}).map(y => y + ' ' + k.values[y]).join(', ') +
    (k.ytd ? '; ' + k.ytd.period + ' ' + k.ytd.value : '') + (k.budget ? '; ' + k.budget.period + ' ' + k.budget.value : '') + ' ' + (k.unit || '') + src(k.source));
  list('Kendte uoverensstemmelser i kildematerialet', F.conflicts, c => c.text + (c.handling ? ' Håndtering: ' + c.handling : ''));
  const rec = F.recommendation;
  if (rec && rec.text) L.push('Indstilling (udkast): ' + rec.text);
  return L.join('\n').replace(/mio\.\./g, 'mio.').replace(/a\.\./g, 'a.');
}

/** Regnskabstabellen serialiseret, så modellen ser præcis de tal siden viser. */
function financialsAsText() {
  const AR = window.ANNUAL_REPORT;
  if (!AR) return '';
  const years = window.FIN_ANNUAL_YEARS || [];
  const actualQ = window.FIN_ACTUAL_Q || [];
  const budgetQ = window.FIN_BUDGET_Q || [];
  const sep = window.FIN_BUDGET_SEP || null;
  const num = (v) => v == null || isNaN(v) ? '-' : v.toFixed(2).replace('.', ',');
  // 2026E: januar-august realiseret plus budget for september og Q4, som på
  // fanen Virksomheden (finEstimate2026). Ellers samme regel her.
  const est = (r) => {
    if (typeof window.finEstimate2026 === 'function') return window.finEstimate2026(r);
    if (r.stock) return r.bq ? r.bq[0] : null;
    if (!r.q || !r.bq) return null;
    return r.q.reduce((s, v) => s + (v || 0), 0) + (r.bs != null ? r.bs : 0) + r.bq[0];
  };

  const cols = []
    .concat(years.map((y, i) => ({ head: y, ann: 1, get: r => r.values ? r.values[i] : null })))
    .concat([{ head: '2026E', ann: 1, get: est }])
    .concat(actualQ.map((p, i) => ({ head: p.label + ' ' + p.year, ann: 12 / (p.months || 3), get: r => r.q ? r.q[i] : null })))
    .concat(sep ? [{ head: sep.label + ' ' + sep.year + 'B', ann: 12, get: r => r.stock ? null : (r.bs != null ? r.bs : null) }] : [])
    .concat(budgetQ.map((p, i) => ({ head: p.label + ' ' + p.year + 'B', ann: 4, get: r => r.bq ? r.bq[i] : null })));

  const lastActual = actualQ.length ? actualQ[actualQ.length - 1] : null;
  const lines = ['Alle tal i DKK mio. Realiseret til og med august 2026 (Periodetal_jan-aug_2026.xlsx)' +
    (lastActual && lastActual.partial ? '; "' + lastActual.label + '" er kun to måneder' : '') +
    '. 2026E = januar-august realiseret plus budget for september og Q4. B = budget.',
    'Post'.padEnd(32) + cols.map(c => c.head.padStart(13)).join('')];
  AR.groups.forEach(g => {
    lines.push('[' + g.label + ']');
    g.rows.forEach(r => {
      lines.push(r.label.padEnd(32) + cols.map(c => num(c.get(r)).padStart(13)).join(''));
    });
  });

  // Nøgletal beregnes af tabellens egne tal
  const ratios = window.FIN_RATIOS || [];
  if (ratios.length) {
    const rawRows = AR.groups.flatMap(g => g.rows);
    lines.push('[Nøgletal]');
    ratios.forEach(rt => {
      const cells = cols.map(c => {
        const m = {};
        rawRows.forEach(r => { m[r.label] = c.get(r); });
        const v = rt.calc(m, c.ann || 1);
        if (v == null || isNaN(v)) return '-'.padStart(13);
        return (rt.percent ? v.toFixed(1).replace('.', ',') + '%' : v.toFixed(1).replace('.', ',')).padStart(13);
      });
      lines.push(rt.label.padEnd(32) + cells.join(''));
    });
  }
  return lines.join('\n');
}

/** Alle kildedokumenter i sagen. */
function caseDocs() { return window.CASE_DOCS || []; }

const MAX_PAGE_CHARS = 7000;

function docAsText(doc) {
  const head = '=== DOKUMENT: ' + doc.name + ' (' + doc.type + (doc.meta ? ' · ' + doc.meta : '') + ') ===';
  const pages = doc.pages.map(p => {
    let body = p.body || '';
    if (body.length > MAX_PAGE_CHARS) body = body.slice(0, MAX_PAGE_CHARS) + '\n[…afkortet]';
    return '--- ' + p.ref + ' · ' + p.title + ' ---\n' + body;
  });
  return head + '\n' + pages.join('\n\n');
}

/** Kort indeks over alt materiale, til chat og til at holde modellen inden for kilderne. */
function docIndexAsText() {
  return caseDocs().map(d =>
    '- ' + d.name + ' (' + d.type + '): ' + d.pages.map(p => p.ref).join(', ')
  ).join('\n');
}

/**
 * Vælger de dokumenter der er relevante for et afsnit.
 * MEMO_SOURCES peger på filnavne; vi matcher blødt, så små navneforskelle
 * mellem kildelisten og dokumentbanken ikke tømmer grundlaget.
 */
function docsForSection(sKey) {
  const all = caseDocs();
  if (!all.length) return [];
  const wanted = (typeof MEMO_SOURCES !== 'undefined' && MEMO_SOURCES[sKey]) ? MEMO_SOURCES[sKey] : [];
  if (!wanted.length) return all;
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9æøå]/g, '');
  const picked = [];
  wanted.forEach(w => {
    const wn = norm(w.t);
    const hit = all.find(d => {
      const dn = norm(d.name);
      return dn === wn || dn.indexOf(wn) !== -1 || wn.indexOf(dn) !== -1;
    });
    if (hit && picked.indexOf(hit) === -1) picked.push(hit);
  });
  return picked.length ? picked : all;
}

/**
 * Sagsgrundlaget deles i to blokke.
 * Den første er ens for alle kald og markeres til prompt-caching, så den kun
 * betales fuldt én gang. Den anden er de dokumenter afsnittet skal bruge.
 */
function sharedGround() {
  const parts = ['=== SAGSFAKTA ===\n' + memoAiCaseContext()];
  const fin = financialsAsText();
  if (fin) parts.push('=== REGNSKABSTAL FRA FINANSIELT OVERBLIK ===\n' + fin);
  const idx = docIndexAsText();
  if (idx) parts.push('=== ALLE DOKUMENTER I SAGEN ===\n' + idx);
  return parts.join('\n\n');
}

/** Byg brugerbeskeden som blokke, med caching på den faste del. */
function groundBlocks(docs, task) {
  return [
    { type: 'text', text: sharedGround(), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: docs.map(docAsText).join('\n\n') },
    { type: 'text', text: task },
  ];
}

/* ── Afsnitsbrief udledt af EIFO-templaten ───────────────────────────────── */

/** Trækker underoverskrifter og template-vejledning ud af afsnittets standard-HTML. */
function sectionBrief(sKey) {
  if (typeof SEC === 'undefined' || !SEC[sKey]) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = SEC[sKey];
  const out = [];
  tmp.querySelectorAll('.tpl-subhead, .tpl-hints li, table thead th').forEach(el => {
    const t = (el.textContent || '').trim();
    if (!t) return;
    if (el.classList.contains('tpl-subhead')) out.push('\nUnderafsnit: ' + t);
    else if (el.tagName === 'TH') out.push('Tabelkolonne: ' + t);
    else out.push('- ' + t);
  });
  return out.join('\n').trim();
}

/** Findes der en tabel i afsnittets template? Så skal AI'en også levere en. */
function sectionHasTable(sKey) {
  return typeof SEC !== 'undefined' && SEC[sKey] ? SEC[sKey].indexOf('<table') !== -1 : false;
}

/* ── Instruktioner til modellen ──────────────────────────────────────────── */

/* Language switch reloads the page, so a module-level branch is safe. When the
   app runs in English the model is instructed to write professional English
   credit-memo prose instead of Danish. */
const AI_EN = (typeof window !== 'undefined' && window.CW_LANG === 'en');

const SYSTEM_WRITER = `Du er erfaren kreditanalytiker i EIFO og skriver afsnit til en kreditindstilling, der skal forelægges kreditkomitéen.

GRUNDREGLER
- ${AI_EN
    ? 'Write exclusively in professional English, in the register of a formal bank credit memorandum. Factual and precise; no sales language, no filler. Source material and template guidance may be in Danish — still answer in English, but keep company names, document names and figures exactly as they appear in the sources.'
    : 'Skriv udelukkende på dansk, sagligt og præcist. Ingen salgssprog, ingen floskler.'}
- Du må kun bruge oplysninger fra det vedlagte sagsgrundlag. Opfind aldrig tal, datoer, navne, citater eller dokumenter.
- Mangler grundlaget noget templaten beder om, så skriv <span class="tpl-blank">[mangler: hvad der skal indhentes]</span> i stedet for at gætte.
- Vær konkret frem for generel. Et tal med kilde er mere værd end en velformuleret sætning uden.
- Skriv også det der taler imod sagen. En kreditindstilling der kun fremhæver det positive er ubrugelig.

KILDEHENVISNINGER
- Hvert konkret tal og hver faktuel påstand pakkes ind sådan: <span class="memo-cite" data-doc="FILNAVN" data-page="REF">den tekst der henvises for</span>
- FILNAVN og REF skal findes ordret i sagsgrundlaget. Find aldrig på et dokumentnavn eller en sidehenvisning.
- Pak kun selve påstanden ind, ikke hele afsnittet.

FORMAT
- Svar med ét HTML-fragment og intet andet. Ingen indledning, ingen forklaring, ingen markdown, ingen kodeblokke.
- Tilladte tags: <p> <strong> <em> <ul> <ol> <li> <h3 class="tpl-subhead"> <table> <thead> <tbody> <tr> <th> <td> <span class="memo-cite"> <span class="tpl-blank">
- Brug <h3 class="tpl-subhead"> til de underafsnit templaten beder om.
- ${AI_EN
    ? 'Keep the number formatting used in the source material (e.g. 41,1M and 45,7 %) so figures stay verbatim. Never use em dashes.'
    : 'Dansk talformat: 41,1 mio. og 45,7 %. Brug aldrig lange tankestreger.'}`;

const SYSTEM_CHAT = `Du er sparringspartner for en kreditmedarbejder i EIFO, der sidder med en kreditindstilling.

- ${AI_EN
    ? 'Answer in professional English, briefly and concretely. Get to the point in the first sentence. The case material may be in Danish — still answer in English, keeping figures, company names and document names verbatim.'
    : 'Svar på dansk, kort og konkret. Kom til pointen i første sætning.'}
- Du må kun bygge på sagsgrundlaget og memoets nuværende tekst. Opfind aldrig tal eller kilder.
- Bliver du bedt om at foreslå tekst til et afsnit, så skriv forslaget som et HTML-fragment i en kodeblok mærket \`\`\`html, og hold resten af svaret udenfor blokken. Så kan rådgiveren indsætte det med ét klik.
- Bliver du spurgt om noget grundlaget ikke dækker, så sig det direkte i stedet for at gætte.
- Brug aldrig lange tankestreger.`;

function writeSectionPrompt(sKey, sectionTitle, num) {
  const docs = docsForSection(sKey);
  const brief = sectionBrief(sKey);
  const wantTable = sectionHasTable(sKey);
  return {
    system: SYSTEM_WRITER,
    content: groundBlocks(docs, `=== OPGAVE ===
Skriv afsnit ${num}. "${sectionTitle}" i kreditindstillingen.

Templaten kræver at afsnittet dækker:
${brief || '(templaten har ingen særskilt vejledning for dette afsnit)'}
${wantTable ? '\nAfsnittet skal indeholde en <table> som templaten lægger op til. Udfyld den med tal fra sagsgrundlaget.' : ''}

Skriv færdig tekst, ikke en disposition. Længde: så langt som substansen kræver, typisk 150-400 ord plus eventuel tabel.`),
  };
}

const REWRITE_PRESETS = [
  { id: 'shorter',  label: 'Kortere',        hint: 'Stram teksten op uden at fjerne tal eller kilder.',
    instruction: 'Gør afsnittet kortere og strammere. Behold alle tal og kildehenvisninger. Fjern gentagelser og fyld.' },
  { id: 'deeper',   label: 'Uddyb',          hint: 'Mere analyse på det samme grundlag.',
    instruction: 'Uddyb analysen med det grundlag der er. Tilføj de vurderinger og sammenhænge der mangler, stadig med kildehenvisninger. Opfind ikke nye tal.' },
  { id: 'critical', label: 'Mere kritisk',   hint: 'Fremhæv det der taler imod.',
    instruction: 'Skærp den kritiske vinkel. Fremhæv svagheder, usikkerheder og det grundlaget ikke kan bekræfte. Behold det faktuelle indhold.' },
  { id: 'numbers',  label: 'Flere tal',      hint: 'Understøt påstandene med konkrete tal.',
    instruction: 'Erstat generelle formuleringer med konkrete tal fra sagsgrundlaget, hver med kildehenvisning. Fjern påstande der ikke kan understøttes.' },
  { id: 'cites',    label: 'Tjek kilder',    hint: 'Find påstande uden kilde.',
    instruction: 'Gennemgå afsnittet og sørg for at hvert konkret tal og hver faktuel påstand har en kildehenvisning der findes i sagsgrundlaget. Fjern eller markér med <span class="tpl-blank">[ukilde]</span> det der ikke kan belægges. Lav ellers så få ændringer som muligt.' },
];

function rewriteSectionPrompt(sKey, sectionTitle, currentHtml, instruction) {
  const docs = docsForSection(sKey);
  return {
    system: SYSTEM_WRITER,
    content: groundBlocks(docs, `=== AFSNITTETS NUVÆRENDE TEKST ===
${currentHtml}

=== OPGAVE ===
Omskriv afsnittet "${sectionTitle}" efter denne instruktion:
${instruction}

Returnér hele afsnittet i omskrevet form som ét HTML-fragment. Behold de dele instruktionen ikke rører.`),
  };
}

function rewriteSelectionPrompt(sKey, sectionTitle, selectedText, contextHtml, instruction) {
  const docs = docsForSection(sKey);
  return {
    system: SYSTEM_WRITER,
    content: groundBlocks(docs, `=== AFSNIT: ${sectionTitle} ===
${contextHtml}

=== DEN MARKEREDE PASSAGE ===
${selectedText}

=== OPGAVE ===
Omskriv KUN den markerede passage efter denne instruktion:
${instruction}

Returnér udelukkende erstatningen for den markerede passage, som HTML uden omkringliggende <p> hvis passagen står inde i et afsnit. Skriv ikke resten af afsnittet.`),
  };
}

function chatPrompt(memoText, history, question) {
  return {
    system: SYSTEM_CHAT,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: sharedGround(), cache_control: { type: 'ephemeral' } },
        { type: 'text', text: '=== KREDITINDSTILLINGENS NUVÆRENDE TEKST ===\n' + memoText + '\n\nOvenstående er sagsgrundlaget. Svar på spørgsmålene der følger.' },
      ],
    }].concat(history).concat([{ role: 'user', content: question }]),
  };
}

/* ── Oprydning af modellens output ───────────────────────────────────────── */

const ALLOWED_TAGS = ['P','STRONG','EM','B','I','UL','OL','LI','H3','H4','TABLE','THEAD','TBODY','TR','TH','TD','SPAN','BR','BLOCKQUOTE','DIV'];

/**
 * Markerer AI-skrevet tekst.
 *
 * To ting der ligner hinanden, men ikke er det samme:
 *
 *   Udkast (tpl-draft)  arbejdstilstand. Forsvinder når rådgiveren har rettet i
 *                       blokken, for så har han taget den til sig. Det er rigtigt.
 *   Ophav  (data-ai)    hvem der oprindeligt skrev teksten. Må ALDRIG forsvinde.
 *                       Kreditkontrol skal bagefter kunne se hvad der er
 *                       maskinskrevet og hvad rådgiveren selv står inde for.
 *
 * Før var de to slået sammen, så sporet forsvandt ved første tastetryk.
 */
function markAsDraft(html, origin) {
  if (!html) return html;
  const src = origin || 'ai';
  const stamped = stampOrigin(html, src);
  return '<div class="tpl-draft"><span class="tpl-draft-label" contenteditable="false">' + t('AI-udkast') + '</span>' + stamped + '</div>';
}

/** Sætter ophavsmærke på hver blok på øverste niveau. */
function stampOrigin(html, origin) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  Array.from(d.children).forEach(el => {
    if (!el.getAttribute('data-ai')) {
      el.setAttribute('data-ai', origin);
      el.setAttribute('data-ai-at', new Date().toISOString().slice(0, 16).replace('T', ' '));
    }
  });
  // Ren tekst uden blokke: pak den ind, ellers er der intet at mærke
  if (!d.children.length && d.textContent.trim()) {
    return '<p data-ai="' + origin + '">' + d.innerHTML + '</p>';
  }
  return d.innerHTML;
}

/**
 * Modeller pakker gerne HTML ind i en kodeblok eller tilføjer en indledning.
 * Vi skræller det af og fjerner tags og attributter der ikke hører hjemme i memoet.
 */
function cleanHtml(raw) {
  let s = (raw || '').trim();
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  s = s.replace(/^```(?:html)?/i, '').replace(/```$/, '').trim();

  const tmp = document.implementation.createHTMLDocument('').createElement('div');
  tmp.innerHTML = s;

  tmp.querySelectorAll('*').forEach(el => {
    if (ALLOWED_TAGS.indexOf(el.tagName) === -1) {
      if (/^(style|title|script)$/i.test(el.tagName)) el.remove();
      else el.replaceWith(...el.childNodes);
      return;
    }
    Array.from(el.attributes).forEach(a => {
      const n = a.name.toLowerCase();
      const keep =
        // Ophavsmærket skal overleve enhver rensning, ellers går sporet tabt
        n === 'data-ai' || n === 'data-ai-at' ||
        // data-line og data-col binder et tal til en regnskabslinje; de bevares
        (el.tagName === 'SPAN' && (n === 'class' || n === 'data-doc' || n === 'data-page' || n === 'data-line' || n === 'data-col' || n === 'contenteditable')) ||
        ((el.tagName === 'H3' || el.tagName === 'H4' || el.tagName === 'UL' || el.tagName === 'DIV') && n === 'class') ||
        ((el.tagName === 'TD' || el.tagName === 'TH') && (n === 'style' || n === 'colspan' || n === 'rowspan'));
      if (!keep) el.removeAttribute(a.name);
    });
    if (el.tagName === 'SPAN') {
      const c = el.getAttribute('class') || '';
      if (c !== 'memo-cite' && c !== 'tpl-blank' && c !== 'tpl-draft-label') el.removeAttribute('class');
    }
    if (el.tagName === 'DIV') {
      const c = el.getAttribute('class') || '';
      if (c !== 'tpl-draft') { el.replaceWith(...el.childNodes); }
    }
  });

  return tmp.innerHTML.trim();
}

/** Kildehenvisninger der peger på dokumenter vi ikke har. Vises som advarsel. */
function unknownCitations(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const names = caseDocs().map(d => d.name);
  const bad = [];
  tmp.querySelectorAll('.memo-cite').forEach(el => {
    const d = el.getAttribute('data-doc');
    if (d && names.indexOf(d) === -1 && bad.indexOf(d) === -1) bad.push(d);
  });
  return bad;
}

function countCitations(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.querySelectorAll('.memo-cite').length;
}

/* ── Sagschat ────────────────────────────────────────────────────────────── */

const BLOCK_TAG = /<(p|h3|h4|ul|ol|table|blockquote)\b/i;

/**
 * Skiller tekstforslag fra svarets løbende tekst, så de kan indsættes med ét klik.
 * Modellen bliver bedt om at pakke forslag i ```html, men hvis den svarer med
 * bar HTML skal det stadig vises som et forslag og ikke som rå markup.
 */
function splitSuggestions(text) {
  const out = [];
  const re = /```html\s*([\s\S]*?)(?:```|$)/gi;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(...loosenHtml(text.slice(last, m.index)));
    out.push({ kind: 'html', body: m[1] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push(...loosenHtml(text.slice(last)));
  return out.filter(p => (p.body || '').trim());
}

/** Finder en sammenhængende HTML-blok i et stykke fritekst. */
function loosenHtml(chunk) {
  const start = chunk.search(BLOCK_TAG);
  if (start === -1) return [{ kind: 'text', body: chunk }];
  const closeAll = /<\/(p|h3|h4|ul|ol|table|blockquote)>/gi;
  let end = -1, mm;
  closeAll.lastIndex = start;
  while ((mm = closeAll.exec(chunk)) !== null) end = closeAll.lastIndex;
  if (end === -1 || end - start < 60) return [{ kind: 'text', body: chunk }];
  const parts = [];
  if (chunk.slice(0, start).trim()) parts.push({ kind: 'text', body: chunk.slice(0, start) });
  parts.push({ kind: 'html', body: chunk.slice(start, end) });
  if (chunk.slice(end).trim()) parts.push({ kind: 'text', body: chunk.slice(end) });
  return parts;
}

const CHAT_STARTERS = [
  'Hvad er de tre svageste punkter i indstillingen?',
  'Er der påstande i memoet som dokumenterne ikke dækker?',
  'Hvordan ser gældsservicen ud hvis GE Vernova betaler et kvartal for sent?',
  'Hvad mangler vi at indhente fra kunden?',
];

// Modul-eksport
export { memoAiCaseContext, financialsAsText, caseDocs, MAX_PAGE_CHARS, docAsText, docIndexAsText,
  docsForSection, sharedGround, groundBlocks, sectionBrief, sectionHasTable, AI_EN, SYSTEM_WRITER,
  SYSTEM_CHAT, writeSectionPrompt, REWRITE_PRESETS, rewriteSectionPrompt, rewriteSelectionPrompt, chatPrompt,
  ALLOWED_TAGS, markAsDraft, stampOrigin, cleanHtml, unknownCitations, countCitations, BLOCK_TAG,
  splitSuggestions, loosenHtml, CHAT_STARTERS };
