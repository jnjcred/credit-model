/* ─────────────────────────────────────────────────────────────────────────────
   Credit memo · AI-lag

   Bygger sagsgrundlaget (kildedokumenter + regnskabstal + sagsfakta), formulerer
   opgaverne til modellen, og leverer de komponenter memoet bruger:
   forbindelsesdialog, afsnitsassistent og sagschat.

   Alt AI-output landes i en forhåndsvisning som rådgiveren selv indsætter.
   Modellen skriver aldrig direkte ind i dokumentet.
   ──────────────────────────────────────────────────────────────────────────── */

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

function buildGround(docs) {
  return sharedGround() + '\n\n' + docs.map(docAsText).join('\n\n');
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

const ORIGIN_LABEL = {
  ai: t('Skrevet af AI'),
  chat: t('Indsat fra sagschatten'),
  edited: t('Skrevet af AI, rettet af rådgiveren'),
};

/**
 * Modeller pakker gerne HTML ind i en kodeblok eller tilføjer en indledning.
 * Vi skræller det af og fjerner tags og attributter der ikke hører hjemme i memoet.
 */
function cleanHtml(raw) {
  let s = (raw || '').trim();
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  s = s.replace(/^```(?:html)?/i, '').replace(/```$/, '').trim();

  const tmp = document.createElement('div');
  tmp.innerHTML = s;

  tmp.querySelectorAll('*').forEach(el => {
    if (ALLOWED_TAGS.indexOf(el.tagName) === -1) {
      el.replaceWith(...el.childNodes);
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

/* ── Fælles hook: forbindelsesstatus ─────────────────────────────────────── */

function useAiStatus() {
  const read = () => {
    const cfg = window.AI.getConfig();
    return { ready: window.AI.isReady(cfg), provider: window.AI.provider(cfg), model: window.AI.activeModel(cfg) };
  };
  const [state, setState] = React.useState(read);
  React.useEffect(() => {
    const on = () => setState(read());
    window.addEventListener('cw-ai-config-changed', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('cw-ai-config-changed', on); window.removeEventListener('storage', on); };
  }, []);
  return state;
}

/* ── Forbindelsesdialog ──────────────────────────────────────────────────── */

function AiSettingsDialog({ open, onClose }) {
  const [cfg, setCfg] = React.useState(() => window.AI.getConfig());
  const [tab, setTab] = React.useState(() => window.AI.getConfig().provider);
  const [models, setModels] = React.useState([]);
  const [busy, setBusy] = React.useState('');
  const [msg, setMsg] = React.useState(null);
  const [reveal, setReveal] = React.useState(false);
  const [local, setLocal] = React.useState(() => window.AI.localStatus());
  // Rigtig dialog: fokus ind, Tab holdes inde, Esc lukker, fokus tilbage.
  // Før blev fokus på knappen bag dialogen og endte i memoets Tab-fælde.
  const boxRef = React.useRef(null);
  CW.useDialog(boxRef, open, onClose);

  React.useEffect(() => {
    if (!open) return;
    setCfg(window.AI.getConfig()); setMsg(null); setModels([]); setReveal(false);
    window.AI.probeLocal(true).then(setLocal);
  }, [open]);
  React.useEffect(() => { setModels([]); setMsg(null); }, [tab]);

  if (!open) return null;

  const P = window.AI.PROVIDERS[tab];
  const isLocal = tab === 'local';
  const key = cfg.keys[tab] || '';
  const model = cfg.models[tab] || P.defaultModel;
  const baseUrl = (cfg.baseUrls && cfg.baseUrls[tab]) || '';

  function update(next) { setCfg(next); }
  function setKey(v) { update({ ...cfg, keys: { ...cfg.keys, [tab]: v.trim() } }); }
  function setModel(v) { update({ ...cfg, models: { ...cfg.models, [tab]: v } }); }
  function setBaseUrl(v) { update({ ...cfg, baseUrls: { ...(cfg.baseUrls || {}), [tab]: v.trim() } }); }

  async function fetchModels() {
    setBusy('models'); setMsg(null);
    try {
      const list = await window.AI.listModels(tab, key, baseUrl);
      setModels(list);
      if (!list.length) setMsg({ kind: 'warn', text: t('Kontoen returnerede ingen modeller.') });
      else if (!list.some(m => m.id === model)) setModel(list[0].id);
    } catch (e) { setMsg({ kind: 'err', text: e.message }); }
    setBusy('');
  }

  async function test() {
    setBusy('test'); setMsg(null);
    try {
      const reply = await window.AI.testConnection(tab, key, model, baseUrl);
      setMsg({ kind: 'ok', text: t('Forbindelsen virker.') + ' ' + t(P.label) + ' ' + t('svarede') + ' "' + (reply || '').slice(0, 40) + '".' });
    } catch (e) { setMsg({ kind: 'err', text: e.message }); }
    setBusy('');
  }

  function save() {
    window.AI.setConfig({ ...cfg, provider: tab });
    onClose();
  }

  function forget() {
    const next = { ...cfg, keys: { ...cfg.keys, [tab]: '' } };
    setCfg(next);
    window.AI.setConfig({ ...next, provider: tab });
    setMsg({ kind: 'ok', text: t('Nøglen er slettet fra denne browser.') });
  }

  const masked = key && !reveal ? key.slice(0, 7) + '•'.repeat(Math.max(0, Math.min(24, key.length - 11))) + key.slice(-4) : key;
  // Copilot (Azure) har intet fælles endpoint, så bankens egen adresse er påkrævet
  const needsEndpoint = !!P.needsEndpoint;
  // Lokal motor kræver ingen nøgle, men den valgte kommandolinje skal være klar
  const canUse = isLocal ? !!(local && local[model] && local[model].available) : !!key && (!needsEndpoint || !!baseUrl);

  return (
    <div
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)', zIndex: 10000, display: 'grid', placeItems: 'center', padding: 20 }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('Forbind din AI-konto')}
        onMouseDown={e => e.stopPropagation()}
        style={{ width: 'min(560px, 100%)', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Forbind din AI-konto')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', marginTop: 5, lineHeight: 1.55 }}>
            {isLocal
              ? (local && local.hosted
                ? t('Denne mulighed kalder Claude Code eller Codex på din egen maskine, så der ikke bruges API-kredit. Den virker kun når prototypen er startet lokalt med devserver.js. Her på nettet skal du bruge en API-nøgle.')
                : t('Memoet skrives med den Claude Code eller Codex du allerede har installeret. De logger ind med selve abonnementet, så der bruges ingen API-kredit. Til gengæld virker det kun på din egen maskine.'))
              : t('Memoet skrives med din egen konto hos') + ' ' + P.vendor + '. ' + t('Nøglen gemmes kun i denne browser og sendes udelukkende til den udbyder du vælger. Forbruget afregnes som API-forbrug på din konto, ikke på dit abonnement.')}
          </div>
        </div>

        {/* Samme neutrale segmenterede kontrol som resten af appen (.cw-seg) */}
        <div style={{ padding: '16px 24px 0' }}>
          <div className="cw-seg" role="group" aria-label={t('Udbyder')} style={{ flexWrap: 'wrap' }}>
            {['local', 'anthropic', 'openai', 'copilot'].map(p => {
              const has = p === 'local'
                ? !!(local && ((local.claude && local.claude.available) || (local.codex && local.codex.available)))
                : !!cfg.keys[p] && (!window.AI.PROVIDERS[p].needsEndpoint || !!(cfg.baseUrls && cfg.baseUrls[p]));
              return (
                <button key={p} type="button" aria-pressed={tab === p} onClick={() => setTab(p)}
                  title={has ? t('klar') : undefined} style={{ height: 28, fontSize: 12.5 }}>
                  {t(window.AI.PROVIDERS[p].label)}
                  {has && <span aria-hidden="true" style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'var(--c-text-3)', marginLeft: 6, verticalAlign: 2 }}/>}
                </button>
              );
            })}
          </div>
        </div>

        {isLocal ? (
        <div style={{ padding: '18px 24px 4px' }}>
          <div className="field-label">{t('Motor')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {P.engines.map(en => {
              const st = (local && local[en.id]) || { available: false, detail: t('Undersøger…') };
              const on = model === en.id;
              return (
                <button
                  key={en.id}
                  onClick={() => setModel(en.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
                    padding: '11px 13px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                    border: '1px solid ' + (on ? 'var(--c-primary)' : 'var(--c-line)'),
                    background: on ? 'rgba(29,78,216,0.04)' : '#fff',
                  }}
                >
                  <span style={{
                    width: 15, height: 15, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    border: '1px solid ' + (on ? 'var(--c-primary)' : 'var(--c-line-strong)'),
                    background: on ? 'var(--c-primary)' : '#fff',
                    boxShadow: on ? 'inset 0 0 0 3px #fff' : 'none',
                  }}/>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)' }}>{en.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>· {st.available ? t('klar') : t('ikke klar')}</span>
                    </span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 3, lineHeight: 1.45 }}>
                      {t(en.hint)}. {t(st.detail)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 12, lineHeight: 1.55 }}>
            {t('Kaldene går gennem prototypens dev-server til kommandolinjen på din maskine. Intet forlader maskinen ud over det, kommandolinjen selv sender til leverandøren. Første svar tager typisk 5 til 10 sekunder, fordi kommandolinjen skal starte op. Dit abonnements forbrugslofter gælder stadig.')}
          </div>
        </div>
        ) : (
        <div style={{ padding: '18px 24px 4px' }}>
          {needsEndpoint && (
            <>
              <div className="field-label">{t('Adresse på jeres Azure-ressource')}</div>
              <input
                className="input"
                style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 12 }}
                placeholder={P.endpointHint}
                value={baseUrl}
                spellCheck={false}
                onChange={e => setBaseUrl(e.target.value)}
              />
              <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 6, marginBottom: 16, lineHeight: 1.5 }}>
                {t('Microsoft 365 Copilot har ikke et API man kan forbinde til direkte. Brug i stedet den Azure OpenAI-ressource jeres Copilot kører på. Adressen står under Keys and Endpoint i Azure-portalen.')}
              </div>
            </>
          )}
          <div className="field-label">{t('API-nøgle fra')} {P.vendor}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="input"
              style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}
              type="text"
              spellCheck={false}
              autoComplete="off"
              placeholder={P.keyHint}
              value={reveal ? key : masked}
              onFocus={() => setReveal(true)}
              onChange={e => setKey(e.target.value)}
            />
            <button className="btn btn-sm" onClick={() => setReveal(r => !r)} title={reveal ? t('Skjul') : t('Vis')}>{reveal ? t('Skjul') : t('Vis')}</button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 6 }}>
            {t('Hent en nøgle på')} <a href={P.consoleUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-primary)' }}>{P.consoleUrl.replace('https://', '')}</a>
          </div>

          <div className="field-label" style={{ marginTop: 16 }}>{needsEndpoint ? t('Udrulning (deployment)') : t('Model')}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {models.length ? (
              <select className="input" style={{ flex: 1, fontSize: 13 }} value={model} onChange={e => setModel(e.target.value)}>
                {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            ) : (
              <input className="input" style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }} value={model} onChange={e => setModel(e.target.value)} spellCheck={false}/>
            )}
            {!needsEndpoint && (
              <button className="btn btn-sm" disabled={!key || busy === 'models'} onClick={fetchModels}>
                {busy === 'models' ? t('Henter…') : t('Hent modeller')}
              </button>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 6 }}>
            {needsEndpoint
              ? t('Navnet I gav modellen, da den blev udrullet i Azure AI Foundry. Det er ikke nødvendigvis det samme som modellens navn.')
              : t('Hent modeller viser dem din konto faktisk har adgang til, så du ikke skal gætte et modelnavn.')}
          </div>

          {!needsEndpoint && <details style={{ marginTop: 14 }}>
            <summary style={{ fontSize: 11.5, color: 'var(--c-text-3)', cursor: 'pointer' }}>{t('Avanceret')}</summary>
            <div style={{ marginTop: 8 }}>
              <div className="field-label">{t('Endpoint')}</div>
              <input
                className="input"
                style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 12 }}
                placeholder={P.baseUrl}
                value={baseUrl}
                spellCheck={false}
                onChange={e => setBaseUrl(e.target.value)}
              />
              <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 6, lineHeight: 1.5 }}>
                {t('Lad feltet stå tomt for at gå direkte til')} {P.vendor}. {t('Udfyld det kun hvis kaldene skal gennem en proxy i huset eller et testmiljø.')}
              </div>
            </div>
          </details>}
        </div>
        )}

        <div style={{ padding: isLocal ? '0 24px 4px' : '0 24px 4px' }}>
          {msg && (
            <div style={{
              marginTop: 14, padding: '9px 12px', borderRadius: 8, fontSize: 12.5, lineHeight: 1.5,
              background: msg.kind === 'ok' ? 'rgba(16,138,80,0.07)' : msg.kind === 'warn' ? 'var(--c-warn-bg)' : 'rgba(190,50,50,0.06)',
              border: '1px solid ' + (msg.kind === 'ok' ? 'rgba(16,138,80,0.22)' : msg.kind === 'warn' ? '#f4dfb7' : 'rgba(190,50,50,0.2)'),
              color: msg.kind === 'ok' ? 'var(--c-success)' : msg.kind === 'warn' ? 'var(--c-warn)' : 'var(--c-danger, #b03030)',
            }}>{msg.text}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 24px 20px' }}>
          {!isLocal && key && <button className="btn btn-sm btn-ghost" onClick={forget} style={{ color: 'var(--c-text-3)' }}>{t('Glem nøglen')}</button>}
          <div style={{ flex: 1 }}/>
          <button className="btn btn-sm" disabled={!canUse || busy === 'test'} onClick={test}>{busy === 'test' ? t('Tester…') : t('Test forbindelse')}</button>
          <button className="btn btn-sm" onClick={onClose}>{t('Annullér')}</button>
          <button className="btn btn-sm btn-primary" disabled={!canUse} onClick={save}>{t('Gem')}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Generisk streaming-kørsel ───────────────────────────────────────────── */

function useAiRun() {
  const [state, setState] = React.useState({ running: false, text: '', error: null, done: false });
  const abortRef = React.useRef(null);

  const run = React.useCallback(async ({ system, messages, maxTokens, effort }) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ running: true, text: '', error: null, done: false });
    try {
      const res = await window.AI.stream({
        system, messages, maxTokens, effort, signal: ctrl.signal,
        onDelta: (_d, all) => setState(s => ({ ...s, text: all })),
      });
      setState({ running: false, text: res.text, error: null, done: true });
      return res.text;
    } catch (e) {
      if (e && e.code === 'abort') { setState(s => ({ ...s, running: false, done: false })); return null; }
      setState(s => ({ ...s, running: false, error: e.message || String(e), done: false }));
      return null;
    } finally { abortRef.current = null; }
  }, []);

  const stop = React.useCallback(() => { if (abortRef.current) abortRef.current.abort(); }, []);
  const reset = React.useCallback(() => setState({ running: false, text: '', error: null, done: false }), []);

  return { ...state, run, stop, reset };
}

/* ── Afsnitsassistent ────────────────────────────────────────────────────── */

/* Mellemrummet fra man trykker til første tegn kommer. På API'et er det under et
   sekund, men den lokale bro skal starte en kommandolinje op først, og Codex
   sender ingenting før hele svaret er skrevet. Uden den her besked står der bare
   en blinkende markør, og man er i tvivl om der overhovedet sker noget. */
function StreamWaiting() {
  const [secs, setSecs] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const cfg = window.AI.getConfig();
  const local = cfg.provider === 'local';
  const codex = local && cfg.models.local === 'codex';

  let what;
  if (codex) what = t('Codex skriver. Den sender først teksten når hele svaret er færdigt.');
  else if (local) what = secs < 8 ? t('Starter Claude Code på din maskine.') : t('Claude Code tænker.');
  else what = t('Venter på svar.');

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--c-text-3)' }}>
      <span className="ai-caret"/>
      {what}
      {secs > 2 && <span className="mono" style={{ fontSize: 11 }}>{secs}s</span>}
    </span>
  );
}

function StreamPreview({ text, running, done }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [text]);

  if (!text && !running) return null;
  const html = done ? cleanHtml(text) : null;

  return (
    <div
      ref={ref}
      className={done ? 'memo-body' : ''}
      style={{
        maxHeight: 320, overflowY: 'auto', padding: '12px 14px',
        background: done ? '#fff' : 'var(--c-surface-2)',
        border: '1px solid var(--c-line-2)', borderRadius: 8,
        fontSize: 12.5, lineHeight: 1.65, color: 'var(--c-ink)',
      }}
      {...(done ? { dangerouslySetInnerHTML: { __html: html } } : {})}
    >
      {done ? undefined : (
        text
          ? (
            <span style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--c-text-2)' }}>
              {text}
              <span className="ai-caret"/>
            </span>
          )
          : <StreamWaiting/>
      )}
    </div>
  );
}

function AiWarnings({ html }) {
  const bad = unknownCitations(html);
  const n = countCitations(html);
  if (!html) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--c-text-3)' }}>
      <span>{n} {n === 1 ? t('kildehenvisning') : t('kildehenvisninger')}</span>
      {bad.length > 0 && (
        <span style={{ color: 'var(--c-warn)' }}>
          {t('Peger på')} {bad.length} {bad.length === 1 ? t('dokument der ikke findes i sagen:') : t('dokumenter der ikke findes i sagen:')} {bad.join(', ')}
        </span>
      )}
    </div>
  );
}

/**
 * Panelet der åbner under et afsnit. Rådgiveren vælger en handling, ser
 * resultatet streame ind, og bestemmer selv om det skal erstatte afsnittet.
 */
function AiSectionAssistant({ sKey, num, title, getHtml, onReplace, onAppend, onClose, selection, onConnect }) {
  const status = useAiStatus();
  const runner = useAiRun();
  const [instruction, setInstruction] = React.useState('');
  const [lastAction, setLastAction] = React.useState(null);
  // Sættes hvis markeringen er blevet væk mens modellen skrev
  const [lostSelection, setLostSelection] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  const clean = runner.done ? cleanHtml(runner.text) : '';

  function go(kind, text) {
    setLastAction({ kind, text });
    let p;
    if (kind === 'write') p = writeSectionPrompt(sKey, title, num);
    else if (kind === 'selection') p = rewriteSelectionPrompt(sKey, title, selection.text, getHtml(), text);
    else p = rewriteSectionPrompt(sKey, title, getHtml(), text);
    runner.run({
      system: p.system,
      messages: [{ role: 'user', content: p.content }],
      maxTokens: kind === 'write' ? 20000 : 14000,
      effort: kind === 'write' ? 'high' : 'medium',
    });
  }

  function submitFree(e) {
    e.preventDefault();
    const t = instruction.trim();
    if (!t) return;
    go(selection ? 'selection' : 'rewrite', t);
  }

  return (
    <div className="ai-panel" onMouseDown={e => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-ink)' }}>
          {selection ? t('Omskriv markeret tekst') : t(title)}
        </span>
        <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>
          {status.ready ? t(status.provider.label) + ' · ' + status.model : t('ikke forbundet')}
        </span>
        <div style={{ flex: 1 }}/>
        <button className="btn btn-sm btn-ghost" onClick={onClose} style={{ padding: '0 8px' }}>{t('Luk')}</button>
      </div>

      {selection && (
        <div style={{
          fontSize: 12, color: 'var(--c-text-2)', background: 'var(--c-surface-2)',
          border: '1px solid var(--c-line-2)', borderRadius: 6, padding: '7px 10px', marginBottom: 10,
          maxHeight: 76, overflow: 'hidden', fontStyle: 'italic',
        }}>„{selection.text}“</div>
      )}

      {!status.ready ? (
        // Forbindelsen kan laves herfra. Før blev man sendt op i værktøjslinjen
        // for at finde knappen.
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 200, fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.6 }}>
            {t('Forbind din Claude-, ChatGPT- eller Copilot-konto, så kan AI skrive eller omskrive afsnittet ud fra sagens dokumenter.')}
          </span>
          {onConnect && <button type="button" className="btn btn-sm" onClick={onConnect}>{t('Forbind AI')}</button>}
        </div>
      ) : (
        <>
          {!runner.running && !runner.done && (
            <div style={{ fontSize: 11.5, color: 'var(--c-text-3)', marginBottom: 10, lineHeight: 1.55 }}>
              {t('Grundlag: regnskabstallene og')}{' '}
              {docsForSection(sKey).length
                ? docsForSection(sKey).map(d => d.name).join(', ')
                : t('ingen dokumenter fundet i sagen')}
            </div>
          )}

          {!runner.running && !runner.done && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {!selection && (
                <button className="ai-preset" onClick={() => go('write')} title={t('Skriv afsnittet forfra ud fra dokumenterne')}>
                  {t('Skriv afsnittet forfra')}
                </button>
              )}
              {REWRITE_PRESETS.map(p => (
                <button key={p.id} className="ai-preset" title={t(p.hint)}
                  onClick={() => go(selection ? 'selection' : 'rewrite', p.instruction)}>
                  {t(p.label)}
                </button>
              ))}
            </div>
          )}

          {(runner.running || runner.text) && (
            <div style={{ marginBottom: 10 }}>
              <StreamPreview text={runner.text} running={runner.running} done={runner.done}/>
            </div>
          )}

          {runner.error && (
            <div style={{
              fontSize: 12.5, lineHeight: 1.5, color: '#b03030', background: 'rgba(190,50,50,0.06)',
              border: '1px solid rgba(190,50,50,0.2)', borderRadius: 8, padding: '9px 12px', marginBottom: 10,
            }}>{runner.error}</div>
          )}

          {runner.done && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <AiWarnings html={clean}/>
            </div>
          )}

          {lostSelection && (
            <div style={{
              marginBottom: 10, padding: '8px 11px', borderRadius: 8,
              background: 'var(--c-warn-bg)', border: '1px solid #f4dfb7',
              fontSize: 12, color: 'var(--c-warn)', lineHeight: 1.5,
            }}>
              {t('Markeringen findes ikke længere, formentlig fordi der er klikket et andet sted i memoet mens teksten blev skrevet. Ingenting er indsat. Markér passagen igen, så er teksten her stadig.')}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {runner.running ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{t('Skriver…')}</span>
                <div style={{ flex: 1 }}/>
                <button className="btn btn-sm" onClick={runner.stop}>{t('Stop')}</button>
              </>
            ) : runner.done && !clean.trim() ? (
              // Et tomt svar må aldrig kunne indsættes: det ville sætte
              // afsnittet til tom streng og gemme det.
              <>
                <span style={{ fontSize: 12, color: 'var(--c-warn)', flex: 1 }}>
                  {t('Modellen svarede ikke med brugbar tekst. Afsnittet er urørt.')}
                </span>
                <button className="btn btn-sm" onClick={() => lastAction && go(lastAction.kind, lastAction.text)}>{t('Prøv igen')}</button>
                <button className="btn btn-sm btn-ghost" onClick={runner.reset} style={{ color: 'var(--c-text-3)' }}>{t('Kassér')}</button>
              </>
            ) : runner.done ? (
              <>
                <button className="btn btn-sm btn-primary" onClick={() => {
                  const ok = onReplace(selection ? clean : markAsDraft(clean));
                  if (ok === false) { setLostSelection(true); return; }
                  onClose();
                }}>
                  {selection ? t('Erstat det markerede') : t('Erstat afsnittet')}
                </button>
                {!selection && <button className="btn btn-sm" onClick={() => { onAppend(markAsDraft(clean)); onClose(); }}>{t('Indsæt nedenfor')}</button>}
                <button className="btn btn-sm btn-ghost" onClick={() => lastAction && go(lastAction.kind, lastAction.text)}>{t('Prøv igen')}</button>
                <div style={{ flex: 1 }}/>
                <button className="btn btn-sm btn-ghost" onClick={runner.reset} style={{ color: 'var(--c-text-3)' }}>{t('Kassér')}</button>
              </>
            ) : (
              <form onSubmit={submitFree} style={{ display: 'flex', gap: 6, width: '100%' }}>
                <input
                  ref={inputRef}
                  className="input"
                  style={{ flex: 1, fontSize: 12.5 }}
                  placeholder={selection ? t('Hvad skal der ske med den markerede tekst?') : t('Skriv din egen instruktion, fx “tilføj et afsnit om valutarisikoen”')}
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                />
                <button className="btn btn-sm btn-primary" type="submit" disabled={!instruction.trim()}>{t('Kør')}</button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
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

function AiChatPanel({ open, getMemoText, sections, onInsert }) {
  const status = useAiStatus();
  const runner = useAiRun();
  const [history, setHistory] = React.useState([]);
  const [q, setQ] = React.useState('');
  const [target, setTarget] = React.useState(sections && sections.length ? sections[0].k : null);
  const bodyRef = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [history, runner.text, open]);

  if (!open) return null;

  async function ask(question) {
    const text = (question || q).trim();
    if (!text || runner.running) return;
    setQ('');
    const nextHistory = history.concat([{ role: 'user', content: text }]);
    setHistory(nextHistory);
    const p = chatPrompt(getMemoText(), history, text);
    const answer = await runner.run({
      system: p.system,
      messages: p.messages,
      maxTokens: 12000,
      effort: 'medium',
    });
    if (answer != null) {
      setHistory(h => h.concat([{ role: 'assistant', content: answer }]));
      runner.reset();
    }
  }

  const streaming = runner.running || (runner.text && !runner.done);

  return (
    <div className="ai-chat">
      {/* Fanen over panelet hedder allerede "Spørg om sagen", og fanerne skifter
          tilbage til kommentarerne. Her står kun forbindelsen og Ryd. */}
      <div className="ai-chat-head">
        <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>
          {status.ready ? t(status.provider.label) : t('ikke forbundet')}
        </span>
        <div style={{ flex: 1 }}/>
        {history.length > 0 && (
          <button type="button" className="btn-ghost-sm"
            onClick={() => { setHistory([]); runner.reset(); }}>{t('Ryd')}</button>
        )}
      </div>

      <div ref={bodyRef} className="ai-chat-body">
        {history.length === 0 && !streaming && (
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.6, marginBottom: 12 }}>
              {t('Chatten kender sagens dokumenter, regnskabstallene og memoets nuværende tekst. Foreslår den tekst, kan du indsætte den direkte i et afsnit.')}
            </div>
            {CHAT_STARTERS.map(s => (
              <button key={s} className="ai-starter" onClick={() => ask(s)}>{t(s)}</button>
            ))}
          </div>
        )}

        {history.map((m, i) => (
          <div key={i} className={'ai-msg ' + m.role}>
            {m.role === 'user'
              ? <div className="ai-msg-user">{m.content}</div>
              : splitSuggestions(m.content).map((part, j) => part.kind === 'text' ? (
                  <div key={j} className="ai-msg-text">{part.body.trim()}</div>
                ) : (
                  <div key={j} className="ai-suggest">
                    <div className="memo-body ai-suggest-body" dangerouslySetInnerHTML={{ __html: cleanHtml(part.body) }}/>
                    <div className="ai-suggest-foot">
                      <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{t('Indsæt i')}</span>
                      <select className="input" style={{ height: 26, fontSize: 11.5, padding: '0 6px', flex: 1, minWidth: 0 }}
                        value={target || ''} onChange={e => setTarget(e.target.value)}>
                        {(sections || []).map(s => <option key={s.k} value={s.k}>{s.num}. {t(s.label)}</option>)}
                      </select>
                      <button className="btn btn-sm btn-primary" style={{ height: 26 }}
                        onClick={() => onInsert(target, cleanHtml(part.body))}>{t('Indsæt')}</button>
                    </div>
                  </div>
                ))}
          </div>
        ))}

        {streaming && (
          <div className="ai-msg assistant">
            <div className="ai-msg-text">{runner.text}<span className="ai-caret"/></div>
          </div>
        )}

        {runner.error && (
          <div style={{
            fontSize: 12.5, lineHeight: 1.5, color: '#b03030', background: 'rgba(190,50,50,0.06)',
            border: '1px solid rgba(190,50,50,0.2)', borderRadius: 8, padding: '9px 12px',
          }}>{runner.error}</div>
        )}
      </div>

      <form className="ai-chat-foot" onSubmit={e => { e.preventDefault(); ask(); }}>
        <input
          ref={inputRef}
          className="input"
          style={{ flex: 1, fontSize: 12.5 }}
          placeholder={status.ready ? t('Spørg om sagen…') : t('Forbind en AI-konto først')}
          disabled={!status.ready}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {runner.running
          ? <button className="btn btn-sm" type="button" onClick={runner.stop}>{t('Stop')}</button>
          : <button className="btn btn-sm btn-primary" type="submit" disabled={!status.ready || !q.trim()}>{t('Send')}</button>}
      </form>
    </div>
  );
}

window.MemoAI = {
  caseContext: memoAiCaseContext,
  financialsAsText,
  caseDocs,
  docsForSection,
  buildGround,
  sectionBrief,
  writeSectionPrompt,
  rewriteSectionPrompt,
  rewriteSelectionPrompt,
  chatPrompt,
  REWRITE_PRESETS,
  cleanHtml,
  markAsDraft,
  unknownCitations,
  countCitations,
  useAiStatus,
  useAiRun,
  AiSettingsDialog,
  AiSectionAssistant,
  AiChatPanel,
  splitSuggestions,
};
