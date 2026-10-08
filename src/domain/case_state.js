/* ─────────────────────────────────────────────────────────────────────────────
   Fælles sagstilstand for demoen (sagen Nordhavn Composite, sag 1)

   Én kilde til det rådgiveren beder om, hvad kunden eller rådgiveren har
   uploadet, hvad rådgiveren har godkendt, spørgsmål mellem kunde og rådgiver,
   sagens fase og historik. Kundesiden, kundeportalen, "Udestående fra kunden",
   Dokumenter, sagshovedet, Mine opgaver og Dataanmodninger læser alle herfra.

   Almindelig JS (ikke JSX), indlæst efter React, i18n, data og kildedokumenter
   og før .jsx-filerne. Alt ligger under window.CW.

   Demoen er vedvarende: tilstanden overlever genindlæsning og sprogskift og
   nulstilles kun med CW.resetDemo() (knappen "Nulstil demo"). Uploadede filer
   gemmes i browserens IndexedDB, så de også kan åbnes efter genindlæsning.

   Faseskift går gennem CW.requestStage(), som spørger først, hvis sagen er
   indstillet eller afslået. Ingen skærm må sætte fasen direkte uden om den.
   ──────────────────────────────────────────────────────────────────────────── */
import { confirm as feedbackConfirm, hideToast as feedbackHideToast, toast as feedbackToast } from '@/services/feedback';

(function () {
  'use strict';

  var t = window.t || function (s) { return s; };

  var KEYS = {
    selection: 'kabul:material-selection:nordhavn', // { [itemId]: bool }  (kladden: det rådgiveren har valgt)
    draft: 'kabul:material-request-draft:nordhavn', // { name, role, email, message, deadline }
    items: 'kabul:material-received:nordhavn',      // { [itemId]: ItemState }
    request: 'kabul:request:nordhavn',              // SentRequest | null (det kunden faktisk har fået)
    questions: 'kabul:questions:nordhavn',          // Question[]
    uploads: 'kabul:uploads:nordhavn',              // FileMeta[] (filer der ikke hører til et punkt)
    caseState: 'kabul:case:nordhavn',               // CaseState
    log: 'kabul:log:nordhavn',                      // LogEntry[] (sagens historik og notifikationer)
    seen: 'kabul:seen:nordhavn',                    // { kunde?: ISO, rådgiver?: ISO } sidst set notifikationer
    consent: 'kabul:consent:nordhavn',              // Consent | null (kundens adgang til regnskabssystem)
    onboarding: 'kabul:onboarding:nordhavn',        // Onboarding (kundens bruger, vilkår, virksomhed, aftale, datadeling, regnskabssystem)
    snapshot: 'kabul:memo-snapshot:nordhavn',       // MemoSnapshot | null (senest indstillede version)
    snapshots: 'kabul:memo-snapshots:nordhavn',     // MemoSnapshot[] (alle indstillede versioner)
    demoCases: 'kabul:demo-cases',                  // DemoCase[] (sager oprettet i Ny sag-guiden)
    owners: 'kabul:owners',                         // { [caseId]: navn } (omfordelinger)
    customItems: 'kabul:custom-items:nordhavn',     // [{ id, label, cat }] materiale rådgiveren selv har tilføjet til anmodningen
    ownersLog: 'kabul:owners-log',                  // [{ at, caseId, name, by }] flytning af andre sager end sag 1
    internalNotes: 'kabul:internal-notes:nordhavn', // { [itemId]: { text, by, at } } rådgiverens interne noter til et punkt (kunden ser dem aldrig)
    removedDocs: 'kabul:removed-docs:nordhavn',     // { [filnavn]: { at, by } } hentede dokumenter, rådgiveren har slettet (fx forkert årsrapport fra CVR)
  };
  var EVENT = 'cw-case-changed';
  var LIVE_CASE_ID = 1; // kun sag 1 (Nordhavn, 2026-0184) har levende data

  try { localStorage.removeItem('kabul:case-stage:nordhavn'); } catch (e) {} // gammel nøgle

  function read(k, fallback) {
    try {
      var raw = localStorage.getItem(KEYS[k]);
      if (raw == null) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(k, v) {
    try {
      if (v == null) localStorage.removeItem(KEYS[k]);
      else localStorage.setItem(KEYS[k], JSON.stringify(v));
    } catch (e) {}
    emit();
  }
  var version = 0;
  function emit() {
    version++;
    try { window.dispatchEvent(new CustomEvent(EVENT)); } catch (e) {}
  }
  var MONTHS_DA = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];
  var MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function now() { return new Date().toISOString(); }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ── Historik og notifikationer ─────────────────────────────────────────── */

  // LogEntry = { id, at, who: 'kunde'|'rådgiver'|'system', type, text, itemId?, data? }
  // type: request-sent, request-updated, received, noted, delegated, approved,
  //       rejected, unreviewed, reset, question, reply, reminder, customer-submitted,
  //       consent, consent-revoked, stage, submitted, withdrawn, declined, reopened,
  //       owner, demo-case, comment-resolved, portal-login
  function activity() { return read('log', []); }
  // Forhåndsvisning af kundesiden: rådgiveren kan se og klikke rundt, men intet,
  // der hører kunden til, må ændres herfra (bruger, vilkår, virksomhed, samtykke,
  // uploads, beskeder, "Vi er færdige"). Hver kundehandling spørger previewBlocked()
  // først. Den sender hændelsen 'cw-preview-blocked', som portalen viser som en note.
  var previewMode = false;
  function setPreview(on) { previewMode = !!on; if (on) hideToast(); }
  function isPreview() { return previewMode; }
  function previewBlocked(what) {
    if (!previewMode) return false;
    try { window.dispatchEvent(new CustomEvent('cw-preview-blocked', { detail: what || '' })); } catch (e) {}
    return true;
  }
  function log(type, text, opts) {
    opts = opts || {};
    var who = opts.who || 'system';
    if (previewMode && who === 'kunde') { who = 'rådgiver'; text = text + ' (' + advisorName() + ' ' + t('i forhåndsvisning af kundesiden') + ')'; opts.data = Object.assign({ preview: true }, opts.data || {}); }
    var e = { id: uid('l'), at: now(), who: who, type: type, text: text, itemId: opts.itemId || null, data: opts.data || null };
    write('log', activity().concat([e]));
    return e;
  }
  /** Hændelser fra den anden part, som `who` ikke har set endnu (til klokken). */
  function notifications(who) {
    var seen = read('seen', {})[who] || '';
    return activity().filter(function (e) { return e.who !== who && e.who !== 'system' && e.at > seen; }).reverse();
  }
  function markSeen(who) { var s = read('seen', {}); s[who] = now(); write('seen', s); }

  /* ── Katalog over materiale rådgiveren kan bede om ─────────────────────── */

  // label: kort navn. desc: hvad kunden skal sende. why: hvorfor vi spørger.
  // docType: typen i Dokumenter. Findes der allerede et dokument af den type,
  // er punktet ikke forvalgt, medmindre det er ældre end staleDays dage.
  // docLatest: vis kun det nyeste dokument af typen (fx årsrapporten for 2025).
  // form: 'upload' (standard) eller 'countries' (spørgeskema, fil er valgfri).
  //
  // tag og why gælder sag 1 (Nordhavn, eksportkaution). Andre sagstyper (Ny sag):
  // products: de sagstyper, hvor punktet er anbefalet; ellers er det valgfrit.
  // Uden products gælder tag for alle typer. whyBy: "hvorfor" for en bestemt type.
  // flag: nøglen på et rødt flag i CASE_FACTS.redFlags. why peger så på flaget i
  // sag 1, og whyAny er teksten til andre virksomheder. Læs punkterne for en
  // bestemt sagstype med CW.itemsFor(type, { own }).
  // Kataloget bygger på EIFOs forretningsgang (afsnit 1.11 og 2.4) og møderne med
  // EIFO (maj-september 2026). tier 'core' er forvalgt i hver ny sag, når sagen ikke
  // allerede har dokumentet. tier 'extra' vælger rådgiveren selv under "Mere materiale";
  // hint siger, hvornår EIFO typisk beder om det. Listen er et udgangspunkt, som EIFO
  // skal rette til.
  var MATERIAL_GROUPS = [
    {
      key: 'docs',
      label: 'Dokumenter',
      items: [
        // Kernen
        { id: 'm-annual', label: 'Årsregnskaber, seneste 2 år', tag: 'Anbefalet', tier: 'core', docType: 'Årsrapport', docLatest: true, staleDays: 480,
          desc: 'De to seneste årsregnskaber i den interne version med alle noter og specifikationer.',
          why: 'Noterne viser lån, sikkerheder og eventualforpligtelser, og to år viser udviklingen.' },
        { id: 'm-interim', label: 'Periodetal', tag: 'Anbefalet', tier: 'core', docType: 'Periodetal', staleDays: 30,
          desc: 'Resultat og balance for i år til og med seneste måned, fx en saldobalance fra regnskabssystemet.',
          why: 'Vi skal se udviklingen siden seneste årsregnskab.' },
        { id: 'm-budget', label: 'Budget for i år og næste år', tag: 'Anbefalet', tier: 'core', docType: 'Budget', staleDays: 180,
          desc: 'Budget for drift og likviditet, gerne med månedstal for i år.',
          why: 'Budgettet er det vigtigste grundlag for at vurdere, om lånet kan betales tilbage.' },
        { id: 'm-assumptions', label: 'Budgetforudsætninger', tag: 'Anbefalet', tier: 'core',
          desc: 'Et kort notat om de vigtigste forudsætninger bag budgettet, fx vækst, priser, nye kunder og ansættelser.',
          why: 'Forudsætningerne viser, om budgettet er realistisk i forhold til historikken.' },
        { id: 'm-loans', label: 'Eksisterende lån og kreditter', tag: 'Anbefalet', tier: 'core', docType: 'Låneaftale',
          desc: 'Aftaler om lån og kreditter, I har i dag, også lån fra ejerne.',
          why: 'Vi skal se renter, afdrag og eventuelle lånebetingelser (covenants).' },
        { id: 'm-ejerbog', label: 'Ejerstruktur og koncerndiagram', tag: 'Anbefalet', tier: 'core', docType: 'Selskab', docMatch: 'ejerbog',
          desc: 'Ejere og ejerandele, og et koncerndiagram, hvis der er flere selskaber.',
          why: 'Vi skal kende ejerne og koncernen for at vurdere, hvem der hæfter, og hvem der kan tilføre kapital.' },

        // Mere materiale, som rådgiveren kan vælge
        { id: 'm-orderbook', label: 'Kontrakter, ordrer eller rammeaftaler', tag: 'Valgfri', tier: 'extra', flag: 'concentration',
          docType: 'Periodetal', docRef: 'ark Ordrebog', staleDays: 30,
          hint: 'Når finansieringen knytter sig til en ordre, eller omsætningen skal dokumenteres',
          desc: 'Kontrakter, ordrebog eller rammeaftaler, der viser den kommende omsætning.',
          why: 'De dokumenterer den omsætning, finansieringen skal understøtte.' },
        { id: 'm-group', label: 'Koncernregnskab eller intern sammenstilling', tag: 'Valgfri', tier: 'extra',
          hint: 'Når virksomheden er en del af en koncern',
          desc: 'Koncernregnskab, eller en intern sammenstilling, hvis der ikke er et revideret koncernregnskab.',
          why: 'Vi skal kunne vurdere koncernens samlede økonomi.' },
        { id: 'm-tech', label: 'ARR/MRR, churn, NRR og runway', tag: 'Valgfri', tier: 'extra',
          hint: 'Tech- og SaaS-virksomheder',
          desc: 'Tilbagevendende omsætning, kundetab, udvikling hos eksisterende kunder og likviditet i måneder.',
          why: 'Metrikkerne viser kvaliteten af den tilbagevendende omsætning.' },
        { id: 'm-lowcase', label: 'Følsomhedsanalyse eller low-case-budget', tag: 'Valgfri', tier: 'extra',
          hint: 'Vækstvirksomheder, især med negativ EBITDA',
          desc: 'Et budget med lavere vækst eller margin end hovedbudgettet.',
          why: 'Den viser, om lånet kan betales, hvis planen ikke holder.' },
        { id: 'm-protocol', label: 'Revisionsprotokollat', tag: 'Valgfri', tier: 'extra',
          hint: 'Store igangværende arbejder eller AB18-garantier',
          desc: 'Revisors seneste rapportering til ledelsen.',
          why: 'Den uddyber særlige forhold i regnskabet.' },
        { id: 'm-capital', label: 'Kapitalrejsning og støtteerklæring', tag: 'Valgfri', tier: 'extra',
          hint: 'Iværksættere og vækstvirksomheder, eller ved høj risiko',
          desc: 'Tidligere kapitalrunder, planen for ny kapital og evt. en støtteerklæring fra ejere eller investorer.',
          why: 'Den viser, om ejerne kan og vil tilføre kapital.' },
        { id: 'm-bizplan', label: 'Forretningsplan med synergier', tag: 'Valgfri', tier: 'extra',
          hint: 'Ved opkøb',
          desc: 'Plan for opkøbet med budgetforudsætninger, forventede synergier og tidsplan.',
          why: 'Den viser, om opkøbet kan bære finansieringen.' },
        { id: 'm-agri', label: 'Effektivitetsnøgletal', tag: 'Valgfri', tier: 'extra',
          hint: 'Landbrug',
          desc: 'Effektivitetsnøgletal og evt. konsoliderings- og likviditetsnulpunkt.',
          why: 'Nøgletallene sammenligner bedriften med branchen.' },
        { id: 'm-trade', label: 'Salg fordelt på lande', tag: 'Valgfri', tier: 'extra', form: 'countries',
          hint: 'Eksport',
          desc: 'Hvor stor en del af omsætningen, der går til hvert land.',
          why: 'Fordelingen viser, hvor afhængige I er af enkelte markeder.' },
        { id: 'm-fx', label: 'Valutapolitik og terminsforretninger', tag: 'Valgfri', tier: 'extra', flag: 'fx',
          hint: 'Salg eller køb i fremmed valuta',
          desc: 'Jeres valutapolitik, hvis I har en, og en oversigt over terminsforretninger. Har I ingen, så skriv det.',
          why: 'Periodetallene viser, at 41 % af omsætningen faktureres i USD eller EUR uden kurssikring. Vi skal vide, hvordan I styrer kursrisikoen.',
          whyAny: 'Salg i udenlandsk valuta giver en kursrisiko. Vi skal vide, hvordan I styrer den.' },
        { id: 'm-security', label: 'Sikkerheder og pantsætninger', tag: 'Valgfri', tier: 'extra', docType: 'Sikkerhed',
          hint: 'Når banken ikke leverer sikkerhedspakken',
          desc: 'Pantebreve, kautioner og andre aftaler, der stiller sikkerhed for lån. Har I ingen, så skriv det.',
          why: 'Vi skal kende rækkefølgen af de eksisterende sikkerheder.' },
        { id: 'm-ownership', label: 'Ejeraftale', tag: 'Valgfri', tier: 'extra',
          hint: 'Når der er flere ejere',
          desc: 'Aftalen mellem ejerne, hvis der er en.',
          why: 'Den kan indeholde regler om ejerskifte, der påvirker lånet.' },
        { id: 'm-pitch', label: 'Virksomhedspræsentation', tag: 'Valgfri', tier: 'extra',
          hint: 'Hvis virksomheden har en',
          desc: 'En kort præsentation af forretningen, kunderne og strategien.',
          why: 'Den giver et hurtigt billede af virksomheden.' },

        // Hentet offentligt, når sagen oprettes. Står under "Ligger allerede på sagen",
        // og rådgiveren kan bede kunden om en nyere version.
        { id: 'm-pub-cvr', label: 'Stamdata og vedtægter', tag: 'Valgfri', tier: 'public', publicSource: 'CVR-registret',
          desc: 'Gældende vedtægter og ændringer i ledelse eller bestyrelse, som endnu ikke står i CVR.',
          why: 'Vi skal have de gældende oplysninger om selskabet.' },
        { id: 'm-pub-market', label: 'Branche og marked', tag: 'Valgfri', tier: 'public', publicSource: 'Brancheopslag',
          desc: 'En kort beskrivelse af jeres marked og konkurrenter.',
          why: 'Vi har brancheoplysninger, men vil gerne høre jeres egen vurdering af markedet.' },
        { id: 'm-pub-product', label: 'Produktbeskrivelse', tag: 'Valgfri', tier: 'public', publicSource: 'Hjemmeside og presse',
          desc: 'En opdateret beskrivelse af jeres produkter og kunder.',
          why: 'Beskrivelsen på jeres hjemmeside er måske ikke opdateret.' },
      ],
    },
  ];

  function parseDocDate(d) {
    if (!d) return null;
    if (d.date && /^\d{4}-\d{2}-\d{2}/.test(d.date)) return new Date(d.date);
    return null;
  }
  /**
   * Findes punktet allerede under Dokumenter? { name, date, stale, count } eller null.
   * Slår op i DATA.DOCS (dokumentregistret) efter docType, så det følger registret.
   * docLatest: navnet er det nyeste dokument. docRef: hvor i dokumentet (fx et ark).
   */
  function onFile(item) {
    if (item && item.publicSource) {
      var at = null;
      try { at = window.DATA && DATA.caseTimeline ? DATA.caseTimeline(1).publicDataAt : null; } catch (e) {}
      return { name: t(item.publicSource), latestName: t(item.publicSource), date: at ? fmtDate(at) : '', stale: false, count: 1, isPublic: true };
    }
    if (!item || !item.docType || !window.DATA || !Array.isArray(DATA.DOCS)) return null;
    var docs = DATA.DOCS.filter(function (d) {
      if (d.type !== item.docType || d.status === 'Erstattet') return false;
      return !item.docMatch || String(d.name).toLowerCase().indexOf(item.docMatch) >= 0;
    });
    if (!docs.length) return null;
    docs.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    var latest = docs[0];
    var dt = parseDocDate(latest);
    var stale = !!(item.staleDays && dt && (Date.now() - dt.getTime()) / 86400000 > item.staleDays);
    var name = docs.length > 1 && !item.docLatest ? docs.length + ' ' + t('dokumenter') : latest.name + (item.docRef ? ', ' + t(item.docRef) : '');
    return { name: name, latestName: latest.name, date: dt ? fmtDate(dt) : (latest.uploaded || ''), stale: stale, count: docs.length };
  }

  /**
   * Forvalget af materiale for en sagstype (uden type: sag 1's, eksportkaution).
   * Anbefalede punkter er forvalgt, medmindre de allerede ligger under Dokumenter.
   * opts.own === false: en anden virksomhed end sag 1's, så Dokumenter tæller ikke.
   */
  function defaultSelection(type, opts) {
    var own = !opts || opts.own !== false;
    var s = {};
    MATERIAL_GROUPS.forEach(function (g) {
      g.items.forEach(function (it) {
        var f = own ? onFile(it) : null;
        s[it.id] = tagFor(it, type) === 'Anbefalet' && (!f || f.stale);
      });
    });
    return s;
  }
  var DEFAULT_MATERIAL_SELECTION = defaultSelection();

  function allItems() {
    var out = [];
    MATERIAL_GROUPS.forEach(function (g) { g.items.forEach(function (it) { out.push(Object.assign({}, it, { group: g.label })); }); });
    // Én linje pr. årsrapport, sagen har (fx 2025, 2024 og 2023), så rådgiveren kan
    // bede om en ny version af et bestemt år
    annualYears().forEach(function (y) {
      out.push({ id: 'm-annual-' + y, label: t('Årsrapport {y}').replace('{y}', y), tag: 'Valgfri', tier: 'year', year: y, docType: 'Årsrapport', docMatch: y, group: 'Dokumenter',
        desc: t('Årsrapporten for {y} i den interne version med alle noter og specifikationer.').replace('{y}', y),
        why: (isDocRemoved(annualDocName(y)) ? t('Den årsrapport for {y}, der blev hentet automatisk, var forkert og er slettet.') : t('Vi har årsrapporten for {y}, men har brug for en opdateret version.')).replace('{y}', y) });
    });
    // Materiale, rådgiveren selv har skrevet ind ("Tilføj andet materiale")
    // Et spørgsmål til noget hentet automatisk (question/about) har spørgsmålet som beskrivelse
    customItems().forEach(function (c) { out.push({ id: c.id, label: c.label, desc: c.question || '', why: c.question || '', tag: 'Anbefalet', custom: true, cat: c.cat || 'Øvrigt', group: 'Øvrigt', question: c.question || null, about: c.about || null }); });
    return out;
  }
  function customItems() { var v = read('customItems', []); return Array.isArray(v) ? v : []; }
  /** Årstal for de årsrapporter, der er hentet til sagen (nyeste først). Slettede
   *  årsrapporter tæller med, så man stadig kan bede kunden om netop det år. */
  function annualYears() {
    var docs = window.DATA && (Array.isArray(DATA.ALL_DOCS) ? DATA.ALL_DOCS : DATA.DOCS);
    if (!Array.isArray(docs)) return [];
    var ys = docs.filter(function (d) { return d.type === 'Årsrapport' && d.status !== 'Erstattet'; })
      .map(function (d) { var m = /(20\d{2})/.exec(d.name || ''); return m ? m[1] : null; })
      .filter(function (y, i, a) { return y && a.indexOf(y) === i; });
    return ys.sort().reverse();
  }
  /* ── Filer, rådgiveren har slettet under Dokumenter ───────────────────────
     Alle filer kan slettes og gendannes. Nøglen er filnavnet for sagens egne
     dokumenter (registret: CVR, banken, ratingmodellen, eksporterne), som så
     forsvinder fra DATA.DOCS og dermed fra Dokumenter, Overblik og "Ligger
     allerede på sagen". For en upload er nøglen 'u:' + filens id: filen tages
     ud af punktet (eller af de løse uploads), og punktets tilstand gemmes, så
     Gendan kan sætte den tilbage. Indholdet bliver i IndexedDB.
     Post: { at, by, kind?: 'upload', name?, file?, itemId?, prev? } */
  function removedDocs() { var v = read('removedDocs', {}); return v && typeof v === 'object' ? v : {}; }
  function isDocRemoved(name) { var r = name && removedDocs()[name]; return !!(r && r.kind !== 'upload'); }
  function annualDocName(y) {
    var docs = window.DATA && (Array.isArray(DATA.ALL_DOCS) ? DATA.ALL_DOCS : DATA.DOCS) || [];
    var d = docs.filter(function (x) { return x.type === 'Årsrapport' && String(x.name).indexOf(y) >= 0; })[0];
    return d ? d.name : null;
  }
  /** Kan filen slettes? Alt under Dokumenter undtagen erstattede versioner (de er kun metadata). */
  function canRemoveDoc(d) { return !!d && !d.superseded; }
  /** Slet en fil: et dokument fra registret (filnavn eller { name }) eller en upload ({ fileId }).
   *  Returnerer { key, itemId, itemReset } eller null. */
  function removeDoc(d) {
    if (typeof d === 'string') d = { name: d };
    if (!d) return null;
    var m = removedDocs();
    if (!d.fileId) {
      if (m[d.name]) return null;
      m[d.name] = { at: now(), by: advisorName() };
      write('removedDocs', m);
      log('doc-removed', t('Slettet fra Dokumenter') + ': ' + d.name, { who: 'rådgiver', data: { name: d.name } });
      return { key: d.name };
    }
    var key = 'u:' + d.fileId;
    if (m[key]) return null;
    var st = items(), itemId = null, file = null;
    Object.keys(st).forEach(function (id) {
      (st[id].files || []).forEach(function (f) { if (f.id === d.fileId) { itemId = id; file = f; } });
    });
    var rec = { at: now(), by: advisorName(), kind: 'upload' };
    var itemReset = false;
    if (itemId) {
      var s = st[itemId];
      rec.itemId = itemId; rec.file = file; rec.name = file.name;
      rec.prev = JSON.parse(JSON.stringify(s));
      var files = (s.files || []).filter(function (f) { return f.id !== d.fileId; });
      if (!files.length && !s.answers) { patchItem(itemId, null); itemReset = true; }
      else patchItem(itemId, { files: files });
    } else {
      var loose = read('uploads', []);
      file = loose.filter(function (f) { return f.id === d.fileId; })[0];
      if (!file) return null;
      rec.file = file; rec.name = file.name;
      write('uploads', loose.filter(function (f) { return f.id !== d.fileId; }));
    }
    m = removedDocs(); m[key] = rec;
    write('removedDocs', m);
    log('doc-removed', t('Slettet fra Dokumenter') + ': ' + rec.name, { who: 'rådgiver', itemId: itemId, data: { name: rec.name, fileId: d.fileId } });
    return { key: key, itemId: itemId, itemReset: itemReset };
  }
  /** Gendan en slettet fil (nøgle fra removeDoc: filnavn eller 'u:' + id). */
  function restoreDoc(key) {
    var m = removedDocs();
    var rec = m[key];
    if (!rec) return;
    if (rec.kind === 'upload' && rec.file) {
      if (rec.itemId) {
        var cur = itemState(rec.itemId);
        if (!cur) patchItem(rec.itemId, rec.prev);   // punktet blev nulstillet ved sletningen
        else if (!(cur.files || []).some(function (f) { return f.id === rec.file.id; })) patchItem(rec.itemId, { files: (cur.files || []).concat([rec.file]) });
      } else {
        write('uploads', read('uploads', []).concat([rec.file]));
      }
    }
    m = removedDocs(); delete m[key];
    write('removedDocs', Object.keys(m).length ? m : null);
    log('doc-restored', t('Gendannet i Dokumenter') + ': ' + (rec.name || key), { who: 'rådgiver', itemId: rec.itemId || null, data: { name: rec.name || key } });
  }

  /* ── Emner for materialet ──────────────────────────────────────────────────
     Ét sted for anmodningen, kundens portal og Dokumenter, så et punkt og dets
     filer står under samme emne overalt. Dokumenter uden punkt får emne efter
     dokumenttypen (types). */
  var MATERIAL_CATS = [
    { key: 'fin', label: 'Regnskab og budget', ids: ['m-annual', 'm-interim', 'm-budget', 'm-assumptions', 'm-lowcase', 'm-group', 'm-protocol'],
      types: ['Årsrapport', 'Periodetal', 'Budget'] },
    { key: 'debt', label: 'Gæld og sikkerheder', ids: ['m-loans', 'm-security'], types: ['Låneaftale', 'Sikkerhed'] },
    { key: 'market', label: 'Marked og drift', ids: ['m-orderbook', 'm-trade', 'm-fx', 'm-tech', 'm-agri', 'm-pub-market', 'm-pub-product'],
      types: ['Kontrakt', 'Marked', 'Salg', 'Nøgletal', 'Valuta'] },
    { key: 'owners', label: 'Ejere og selskab', ids: ['m-ejerbog', 'm-pub-cvr', 'm-ownership', 'm-capital', 'm-bizplan', 'm-pitch'],
      types: ['Selskab', 'Præsentation'] },
  ];
  /** Emnet (dansk etiket) for et punkt i kataloget, et årsrapportpunkt eller rådgiverens eget punkt. */
  function itemCat(it) {
    if (!it) return 'Øvrigt';
    if (it.custom) return it.cat || 'Øvrigt';
    if (it.tier === 'year' || /^m-annual-/.test(it.id)) return 'Regnskab og budget';
    var c = MATERIAL_CATS.filter(function (x) { return x.ids.indexOf(it.id) >= 0; })[0];
    return c ? c.label : 'Øvrigt';
  }

  /** Tilføj et punkt, der ikke står i kataloget. Det vælges med det samme.
   *  extra: { question, about } for et spørgsmål til noget, der er hentet automatisk (about: punktets id). */
  function addCustomItem(label, cat, extra) {
    var id = 'c-' + Date.now().toString(36);
    var c = { id: id, label: String(label).trim(), cat: cat || 'Øvrigt' };
    if (extra && extra.question) { c.question = String(extra.question).trim(); c.about = extra.about || null; }
    write('customItems', customItems().concat([c]));
    var sel = selection(); sel[id] = true; write('selection', sel);
    return id;
  }
  function removeCustomItem(id) {
    write('customItems', customItems().filter(function (c) { return c.id !== id; }));
    var sel = selection(); delete sel[id]; write('selection', sel);
  }
  function setCustomItemCat(id, cat) {
    write('customItems', customItems().map(function (c) { return c.id === id ? Object.assign({}, c, { cat: cat }) : c; }));
  }
  function itemById(id) { return allItems().filter(function (it) { return it.id === id; })[0] || null; }

  /** Kladden: det rådgiveren har valgt, men ikke nødvendigvis sendt. */
  function selection() { return Object.assign({}, defaultSelection(), read('selection', {})); }
  function setSelection(sel) { write('selection', sel); }
  // Et punkt, rådgiveren beder kunden om, er ikke længere valgfrit: ekstramaterialet
  // (tag 'Valgfri' i kataloget) bliver påkrævet, når det vælges til anmodningen.
  function asRequested(it) { return it.tag === 'Valgfri' ? Object.assign({}, it, { tag: 'Anbefalet' }) : it; }
  function draftItems() { var sel = selection(); return allItems().filter(function (it) { return sel[it.id]; }).map(asRequested); }

  /**
   * De punkter kunden faktisk er bedt om: den sendte anmodning. Før noget er
   * sendt, er det kladden (så forhåndsvisningen viser, hvad kunden vil få).
   */
  function requestedItems() {
    var r = request();
    if (r && Array.isArray(r.items)) return allItems().filter(function (it) { return r.items.indexOf(it.id) >= 0; }).map(asRequested);
    return draftItems();
  }
  /** Afviger kladden fra den sendte anmodning? { added:[items], removed:[items] } eller null. */
  function draftDiff() {
    var r = request();
    if (!r || !Array.isArray(r.items)) return null;
    var sel = selection();
    var added = allItems().filter(function (it) { return sel[it.id] && r.items.indexOf(it.id) < 0; });
    var removed = allItems().filter(function (it) { return !sel[it.id] && r.items.indexOf(it.id) >= 0; });
    return added.length || removed.length ? { added: added, removed: removed } : null;
  }
  /** Sætter kladden tilbage til det sendte. */
  function discardDraft() {
    var r = request(); if (!r) return;
    var sel = {}; allItems().forEach(function (it) { sel[it.id] = r.items.indexOf(it.id) >= 0; });
    write('selection', sel);
  }

  /* ── Punkternes tilstand ───────────────────────────────────────────────── */

  // ItemState = {
  //   status: 'received'   kunden/rådgiveren har leveret filer
  //         | 'noted'      kunden har ingen fil: "Har vi ikke" eller "sendt på anden måde" (note forklarer)
  //         | 'delegated'  kunden har bedt sin revisor/bank om at sende det (delegate: { name, email, at })
  //         | 'approved' | 'rejected'
  //   at, by: 'kunde'|'rådgiver', files: FileMeta[], note, noteKind?: 'har-vi-ikke'|'anden-maade'|'system',
  //   answer?, question?: kundens svar på rådgiverens spørgsmål (reviewNote) og spørgsmålet,
  //   answers?: { countries: [{ code, name, pct }] }  (spørgeskema)
  //   reviewedAt, reviewNote
  // }
  // Et punkt uden tilstand afventer. 'rejected' og 'delegated' tæller som udestående.
  function items() {
    var v = read('items', {});
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  }
  function itemState(id) { return items()[id] || null; }
  function isDelivered(s) { return !!s && (s.status === 'received' || s.status === 'noted' || s.status === 'approved'); }
  function isReceived(id) { return isDelivered(itemState(id)); }
  function isApproved(id) { var s = itemState(id); return !!s && s.status === 'approved'; }
  function label(id) { var it = itemById(id); return it ? t(it.label) : id; }

  function patchItem(id, patch) {
    var all = Object.assign({}, items());
    if (patch == null) delete all[id];
    else all[id] = Object.assign({}, all[id] || {}, patch);
    write('items', all);
  }

  /** Kunden eller rådgiveren leverer filer til et punkt. files: FileMeta[] fra putFiles(). opts.answers til spørgeskemaer. */
  function markReceived(id, opts) {
    opts = opts || {};
    if ((opts.by || 'kunde') === 'kunde' && (customerLock() || previewBlocked('send'))) return false;
    var prev = itemState(id);
    // Dobbeltklik: filer med samme navn og størrelse, sendt inden for få sekunder, er de samme
    if (prev && prev.files && prev.files.length && opts.files && opts.files.length) {
      var recent = prev.files.filter(function (f) { return f.at && (Date.now() - new Date(f.at).getTime()) < 5000; });
      opts.files = opts.files.filter(function (f) { return !recent.some(function (r) { return r.name === f.name && r.size === f.size; }); });
      if (!opts.files.length && !opts.answers && prev.status === 'received') return false;
    }
    // Et spørgsmål til punktet (status 'rejected'): de sendte filer gælder stadig, og en ny fil
    // lægges til. Er punktet siden sendt videre til revisor eller bank, følger de gamle filer ikke med.
    var wasRejected = prev && (prev.status === 'rejected' || (prev.status === 'delegated' && prev.reviewedAt));
    var keepFiles = prev && !(prev.status === 'delegated' && prev.reviewedAt) ? (prev.files || []) : [];
    var files = keepFiles.concat((opts.files || []).filter(function (f) { return !keepFiles.some(function (k) { return k.id === f.id || (k.name === f.name && k.size === f.size); }); }));
    // Lægger rådgiveren selv en fil til et punkt, der allerede er godkendt, forbliver det godkendt
    if ((opts.by || 'kunde') === 'rådgiver' && prev && prev.status === 'approved' && opts.files && opts.files.length) {
      patchItem(id, { files: files });
      log('received', t('Rådgiveren uploadede for kunden') + ': ' + label(id) + ' (' + t('forbliver godkendt') + ')', { who: 'rådgiver', itemId: id,
        data: { n: opts.files.length, names: opts.files.map(function (f) { return f && f.name; }).filter(Boolean) } });
      return;
    }
    // Uden filer og svar er det en bemærkning, ikke en levering
    if (!files.length && !opts.answers && opts.note) return markNoted(id, { by: opts.by, note: opts.note, kind: opts.noteKind || 'anden-maade' });
    // Tekst sendt efter rådgiverens spørgsmål er kundens svar på det (ikke en bemærkning).
    // Et tidligere svar følger punktet, indtil der kommer et nyt spørgsmål.
    var answer = wasRejected && opts.note && opts.noteKind == null;
    // Svar på et spørgsmål til filer, der stadig gælder: deres bemærkning eller kilde
    // ("Hentet fra e-conomic") står urørt. Var punktet kun en bemærkning, gælder den ikke længere.
    var keepNote = !!prev && prev.status === 'rejected' && (prev.files || []).length > 0 && (answer || !opts.note);
    patchItem(id, {
      status: 'received', at: now(), by: opts.by || 'kunde', files: files, viaPreview: previewMode || null,
      note: keepNote ? (prev.note || '') : answer ? '' : opts.note != null ? opts.note : (prev && prev.note) || '',
      noteKind: keepNote ? (prev.noteKind || null) : answer ? null : opts.noteKind !== undefined ? opts.noteKind : ((prev && prev.noteKind) || null),
      answer: answer ? opts.note : wasRejected ? null : (prev && prev.answer) || null,
      question: answer ? (prev.reviewNote || '') : wasRejected ? null : (prev && prev.question) || null,
      answers: opts.answers || (prev && prev.answers) || null,
      delegate: null, reviewedAt: null, reviewNote: '',
    });
    log('received', (opts.by === 'rådgiver' ? t('Rådgiveren uploadede for kunden') : t('Kunden sendte')) + ': ' + label(id), { who: opts.by || 'kunde', itemId: id,
      data: { n: (opts.files || []).length, names: (opts.files || []).map(function (f) { return f && f.name; }).filter(Boolean), answer: answer ? opts.note : null } });
  }
  /** "Har vi ikke" / "sendt på anden måde": ingen fil, men en forklaring rådgiveren skal tage stilling til. */
  function markNoted(id, opts) {
    opts = opts || {};
    if ((opts.by || 'kunde') === 'kunde' && (customerLock() || previewBlocked('send'))) return false;
    patchItem(id, { status: 'noted', at: now(), by: opts.by || 'kunde', viaPreview: previewMode || null, files: [], note: opts.note || '', noteKind: opts.kind || 'har-vi-ikke', answer: null, question: null, delegate: null, reviewedAt: null, reviewNote: '' });
    log('noted', (opts.kind === 'anden-maade' ? t('Sendt på anden måde') : t('Har vi ikke')) + ': ' + label(id), { who: opts.by || 'kunde', itemId: id, data: { note: opts.note || '', kind: opts.kind || 'har-vi-ikke' } });
  }
  /**
   * Kunden svarer på rådgiverens spørgsmål til et punkt med tekst alene. Det, der
   * allerede er sendt, gælder stadig, og punktet står igen til gennemgang.
   */
  function answerItem(id, text, opts) {
    opts = opts || {};
    var by = opts.by || 'kunde';
    if (by === 'kunde' && (customerLock() || previewBlocked('send'))) return false;
    var prev = itemState(id);
    text = String(text || '').trim();
    if (!prev || prev.status !== 'rejected' || !text) return false;
    // Uden filer og skema var punktet en bemærkning ("Har vi ikke"); den står stadig
    var has = (prev.files && prev.files.length) || prev.answers;
    patchItem(id, {
      status: has ? 'received' : 'noted', at: now(), by: by, viaPreview: previewMode || null,
      answer: text, question: prev.reviewNote || '', delegate: null, reviewedAt: null, reviewNote: '',
    });
    log('received', (by === 'rådgiver' ? t('Rådgiveren svarede for kunden') : t('Kunden svarede på spørgsmålet')) + ': ' + label(id), { who: by, itemId: id, data: { answer: text } });
    return true;
  }
  /** Kunden har bedt sin revisor eller bank om at sende punktet. */
  function markDelegated(ids, to) {
    if (customerLock() || previewBlocked('delegate')) return false;
    [].concat(ids).forEach(function (id) {
      patchItem(id, { status: 'delegated', at: now(), by: 'kunde', delegate: { name: to.name, email: to.email, role: to.role || '', at: now() } });
    });
    log('delegated', t('Kunden bad') + ' ' + to.name + ' ' + t('om at sende') + ' ' + [].concat(ids).map(label).join(', '), { who: 'kunde', data: { to: to, items: [].concat(ids) } });
  }
  // Den, der gennemgår, er den indloggede rådgiver
  function reviewerName() {
    var D = window.DATA || {};
    return (D.ADVISOR && D.ADVISOR.name) || (D.COMPANY && D.COMPANY.responsibleFull) || D.ME || '';
  }
  function approve(id, note) {
    var cur = itemState(id);
    if (cur && cur.status === 'approved') return false;   // dobbeltklik
    patchItem(id, { status: 'approved', reviewedAt: now(), reviewedBy: reviewerName(), reviewNote: note || '' });
    log('approved', t('Godkendt') + ': ' + label(id), { who: 'rådgiver', itemId: id });
  }
  function reject(id, note) {
    patchItem(id, { status: 'rejected', reviewedAt: now(), reviewedBy: reviewerName(), reviewNote: note || '' });
    log('rejected', t('Spørgsmål stillet') + ': ' + label(id) + (note ? ' (' + note + ')' : ''), { who: 'rådgiver', itemId: id, data: { note: note || '' } });
  }
  function resetItem(id, by) {
    if ((by || 'kunde') === 'kunde' && previewBlocked('undo')) return false;
    var cur = itemState(id);
    if (cur && cur.status === 'delegated' && cur.reviewedAt) patchItem(id, { status: 'rejected', delegate: null });
    else patchItem(id, null);
    log('reset', t('Trukket tilbage') + ': ' + label(id), { who: by || 'kunde', itemId: id, data: { kind: 'withdrawn' } });
  }
  /** Fortryder rådgiverens godkendelse eller afvisning: punktet står igen som leveret. */
  function unreview(id) {
    var s = itemState(id); if (!s) return;
    patchItem(id, { status: (s.files && s.files.length) || s.answers ? 'received' : 'noted', reviewedAt: null, reviewNote: '' });
    log('unreviewed', t('Gennemgang fortrudt') + ': ' + label(id), { who: 'rådgiver', itemId: id, data: { from: s.status } });
  }
  /** Kan `who` fjerne filen? Kun den der uploadede, og ikke efter godkendelse. */
  function canRemoveFile(id, fileId, who) {
    var s = itemState(id); if (!s) return false;   // også et godkendt punkt: rådgiveren kan fjerne sin egen fil
    var f = (s.files || []).filter(function (x) { return x.id === fileId; })[0];
    return !!f && (f.by || s.by) === who;
  }
  /** Fjerner en fil. Returnerer false, hvis `who` ikke må (se canRemoveFile). */
  function removeFile(id, fileId, who) {
    var s = itemState(id); if (!s) return false;
    if (who === 'kunde' && previewBlocked('remove')) return false;
    if (who && !canRemoveFile(id, fileId, who)) return false;
    var files = (s.files || []).filter(function (f) { return f.id !== fileId; });
    // Historikken på punktet viser, hvilken fil der blev fjernet
    var gone = (s.files || []).filter(function (f) { return f.id === fileId; })[0];
    var data = { kind: 'removed', names: gone ? [gone.name] : [] };
    if (!files.length && !s.answers && (s.status === 'rejected' || s.answer)) {
      patchItem(id, { files: [], status: s.status === 'rejected' ? 'rejected' : 'noted' });
      log('reset', t('Fil fjernet') + ': ' + label(id), { who: who || s.by, itemId: id, data: data });
      return true;
    }
    if (!files.length && !s.answers) { patchItem(id, null); log('reset', t('Fil fjernet') + ': ' + label(id), { who: who || s.by, itemId: id, data: data }); return true; }
    patchItem(id, { files: files });
    log('reset', t('Fil fjernet') + ': ' + label(id), { who: who || s.by, itemId: id, data: data });
    return true;
  }

  /** Opsummering af de anmodede (sendte) punkter. */
  function progress() {
    var req = requestedItems();
    var st = items();
    var c = { total: req.length, required: 0, pending: 0, received: 0, noted: 0, delegated: 0, approved: 0, rejected: 0, optionalPending: 0 };
    req.forEach(function (it) {
      var s = st[it.id];
      var optional = it.tag === 'Valgfri';
      if (!optional) c.required++;
      if (!s) { c.pending++; if (optional) c.optionalPending++; }
      else if (s.status === 'approved') c.approved++;
      else if (s.status === 'rejected') c.rejected++;
      else if (s.status === 'noted') c.noted++;
      else if (s.status === 'delegated') c.delegated++;
      else c.received++;
    });
    c.toReview = c.received + c.noted;                       // venter på rådgiverens gennemgang
    c.delivered = c.received + c.noted + c.approved;          // kunden har leveret eller forklaret
    c.missing = c.pending + c.rejected + c.delegated;         // mangler stadig fra kunden
    c.requiredMissing = c.missing - c.optionalPending;
    c.allDelivered = c.total > 0 && c.delivered === c.total;
    c.allApproved = c.total > 0 && c.approved === c.total;
    // Klar afhænger kun af de påkrævede punkter. Et valgfrit punkt, der ikke er
    // kommet, blokerer ikke; et valgfrit punkt, der er kommet, skal dog gennemgås.
    c.requiredApproved = req.filter(function (it) { return it.tag !== 'Valgfri'; }).every(function (it) { var s = st[it.id]; return s && s.status === 'approved'; }) && c.total > 0;
    c.readyForMemo = c.requiredApproved && c.toReview === 0 && c.rejected === 0;
    return c;
  }

  /* ── Filer (IndexedDB, så de kan åbnes efter genindlæsning) ─────────────── */

  // FileMeta = { id, name, size, sizeLabel, type, at, by, itemId? }
  var urls = {};   // id -> objectURL
  var fileSeq = 0;
  var DB_NAME = 'cw-demo-files', STORE = 'files';

  function idb(fn) {
    try {
      if (!window.indexedDB) return;
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () {
        var db = req.result;
        // Luk forbindelsen, når "Nulstil demo" (også i en anden fane) vil slette databasen,
        // ellers venter sletningen, og den næste indlæsning står i kø bag den
        db.onversionchange = function () { try { db.close(); } catch (e) {} };
        try { fn(db); } catch (e) {}
      };
    } catch (e) {}
  }
  // Hent gemte filer ind ved start
  idb(function (db) {
    var tx = db.transaction(STORE, 'readonly');
    var cur = tx.objectStore(STORE).openCursor();
    var n = 0;
    cur.onsuccess = function () {
      var c = cur.result;
      if (c) { if (!urls[c.key]) { try { urls[c.key] = URL.createObjectURL(c.value); n++; } catch (e) {} } c.continue(); }
      else if (n) emit();
    };
  });

  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1).replace('.', window.CW_LANG === 'en' ? '.' : ',') + ' MB';
    if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
    return bytes + ' B';
  }

  /** Registrerer rigtige File-objekter (fra <input type=file> eller drag-and-drop) og returnerer metadata. */
  function putFiles(fileList, opts) {
    opts = opts || {};
    var out = [];
    if ((opts.by || 'kunde') === 'kunde' && previewBlocked('upload')) return out;
    Array.prototype.forEach.call(fileList || [], function (f) {
      var id = 'f' + Date.now().toString(36) + (fileSeq++);
      try { urls[id] = URL.createObjectURL(f); } catch (e) {}
      idb(function (db) { try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(f, id); } catch (e) {} });
      out.push({ id: id, name: f.name, size: f.size, sizeLabel: fmtSize(f.size), type: f.type || '', at: now(), by: opts.by || 'kunde', itemId: opts.itemId || null });
    });
    return out;
  }
  function fileUrl(id) { return urls[id] || null; }

  /** Filer der er uploadet uden at høre til et bestemt punkt (fx fra Dokumenter-fanen). */
  function addLooseUploads(metas) {
    if (metas && metas.length && (metas[0].by || 'kunde') === 'kunde' && previewBlocked('upload')) return;
    write('uploads', read('uploads', []).concat(metas));
    if (metas && metas.length) log('received', (metas[0].by === 'rådgiver' ? t('Rådgiveren uploadede') : t('Kunden uploadede')) + ' ' + metas.map(function (m) { return m.name; }).join(', '), { who: metas[0].by || 'kunde' });
  }
  function removeLooseUpload(fileId) { if (previewBlocked('remove')) return; write('uploads', read('uploads', []).filter(function (f) { return f.id !== fileId; })); }

  /** Alle filer uploadet i demoen, nyeste først, med punktets navn hvor det findes. */
  function allUploads() {
    var st = items();
    var list = [];
    Object.keys(st).forEach(function (id) {
      var it = itemById(id);
      (st[id].files || []).forEach(function (f) {
        list.push(Object.assign({}, f, { itemId: id, itemLabel: it ? it.label : '', itemStatus: st[id].status }));
      });
    });
    read('uploads', []).forEach(function (f) { list.push(Object.assign({}, f)); });
    return list.sort(function (a, b) { return (b.at || '').localeCompare(a.at || ''); });
  }

  /* ── Anmodningen ────────────────────────────────────────────────────────── */

  // SentRequest = { sentAt, deadline, to:{name,email}, items:[itemId], version, link, history:[{at, added, removed}] }
  function request() { return read('request', null); }
  function requestLink() { return (window.DATA && DATA.REQUEST_LINK) || 'crediwire.app/c/nh-9j2k-7Aq3'; }
  /**
   * Rådgiveren sender anmodningen (eller en opdatering). Det der sendes, er
   * kladden (selection). deadline: yyyy-mm-dd.
   */
  function sendRequest(opts) {
    opts = opts || {};
    var prev = request();
    var ids = draftItems().map(function (it) { return it.id; });
    var added = prev ? ids.filter(function (id) { return prev.items.indexOf(id) < 0; }) : ids;
    var removed = prev ? prev.items.filter(function (id) { return ids.indexOf(id) < 0; }) : [];
    // Fravalgte punkter, som kunden allerede har leveret, forsvinder ikke: de står
    // som "modtaget, ikke længere påkrævet" (dropped) og tæller ikke i fremdriften.
    var st = items();
    var dropped = ((prev && prev.dropped) || []).filter(function (id) { return ids.indexOf(id) < 0; })
      .concat(removed)
      .filter(function (id, i, a) { return a.indexOf(id) === i; });
    var r = {
      sentAt: now(), deadline: opts.deadline || (prev && prev.deadline) || null,
      to: opts.to || (prev && prev.to) || null, items: ids, dropped: dropped,
      withdrawn: (function () {
        var m = {};
        Object.keys((prev && prev.withdrawn) || {}).forEach(function (id) { if (ids.indexOf(id) < 0) m[id] = prev.withdrawn[id]; });
        removed.filter(function (id) { return !isDelivered(st[id]); }).forEach(function (id) { m[id] = { at: now(), reason: '', notified: !!opts.notifyRemoved, by: advisorName() }; });
        return m;
      })(),
      version: prev ? (prev.version || 1) + 1 : 1, link: requestLink(),
      firstSentAt: prev ? (prev.firstSentAt || prev.sentAt) : now(),
      // noMail: rådgiveren sendte ingen mail (giver selv kunden linket, eller kundens side viser ændringen)
      noMail: !!opts.noMail,
      history: (prev && prev.history || []).concat([{ at: now(), added: added, removed: removed, noMail: !!opts.noMail }]),
    };
    write('request', r);
    // Spørgsmål til noget hentet automatisk: kunden får punktet som et spørgsmål fra
    // rådgiveren og kan svare med tekst eller en fil (som ved "Stil spørgsmål til materialet")
    var asked = added.filter(function (id) { var it = itemById(id); return it && it.question && !itemState(id); });
    var parts = [];
    if (added.length) parts.push(t('tilføjet') + ' ' + added.map(label).join(', '));
    if (removed.length) parts.push(t('fjernet') + ' ' + removed.map(label).join(', '));
    log(prev ? 'request-updated' : 'request-sent', prev
      ? t('Opdateret anmodning sendt') + (parts.length ? ': ' + parts.join('; ') : '')
      : opts.noMail ? t('Anmodning oprettet uden mail til') + ' ' + ((r.to && r.to.name) || t('kunden'))
      : t('Anmodning sendt til') + ' ' + ((r.to && r.to.name) || t('kunden')), { who: 'rådgiver', data: { added: added, removed: removed, noMail: !!opts.noMail } });
    asked.forEach(function (id) {
      var q = itemById(id).question;
      patchItem(id, { status: 'rejected', at: now(), by: 'rådgiver', files: [], reviewedAt: now(), reviewedBy: reviewerName(), reviewNote: q });
      log('rejected', t('Spørgsmål stillet') + ': ' + label(id) + ' (' + q + ')', { who: 'rådgiver', itemId: id, data: { note: q } });
    });
    return r;
  }
  /** Fortryder en sendt anmodning (fx "Fortryd" i kvitteringen). */
  function clearRequest() { write('request', null); }
  /** Fortryd en tilbagetrækning: punktet er med i anmodningen igen. */
  function restoreItem(id) {
    var r = request();
    if (!r || !r.withdrawn || !r.withdrawn[id]) return false;
    var sel = selection(); sel[id] = true; setSelection(sel);
    var wd = Object.assign({}, r.withdrawn); delete wd[id];
    write('request', Object.assign({}, r, {
      items: r.items.concat(id), dropped: (r.dropped || []).filter(function (x) { return x !== id; }), withdrawn: wd,
      history: (r.history || []).concat([{ at: now(), added: [id], removed: [] }]),
    }));
    log('item-restored', t('Tilbage i anmodningen') + ': ' + label(id), { who: 'rådgiver', itemId: id });
    return true;
  }
  function draft() { return read('draft', null); }
  function setDraft(d) { write('draft', d); }

  /** Kunden trykker "Indsend" i portalen. */
  function customerSubmit() {
    if (previewBlocked('submit')) return false;
    setCaseState({ customerSubmittedAt: now() });
    log('customer-submitted', t('Kunden har meldt, at alt er sendt'), { who: 'kunde' });
  }

  /**
   * Kundens adgang til regnskabssystemet.
   * Consent = { system, scope:[..], mode: 'ongoing'|'until', until: 'løbende'|yyyy-mm-dd, dataUntil?: yyyy-mm-dd, at }
   * mode 'ongoing' (løbende): EIFO henter nye tal, indtil kunden trækker adgangen tilbage.
   * mode 'until' (begrænset): EIFO får kun tal til og med dataUntil. until er da samme dato.
   */
  function consent() { return read('consent', null); }
  function setConsent(c) {
    if (previewBlocked('consent')) return false;
    write('consent', c ? Object.assign({ at: now() }, c) : null);
    log(c ? 'consent' : 'consent-revoked', c
      ? (c.by && c.by.name ? c.by.name + ' (' + t('revisor eller rådgiver') + ') ' + t('gav læseadgang på vegne af kunden til') + ' ' + c.system : t('Kunden gav læseadgang til') + ' ' + c.system)
      : t('Kunden trak adgangen til regnskabssystemet tilbage'), { who: 'kunde' });
  }

  /**
   * Kundens opstart i portalen (som i dagens indsamlingsflow): bruger, vilkår,
   * virksomhed, aftalen med EIFO, datadeling og regnskabssystem.
   * Onboarding = {
   *   account:   { email, pw, at }                 bruger oprettet (pw er en demo-hash, ikke en rigtig adgangskode)
   *   terms:     { at, marketing: bool }           brugsvilkår accepteret
   *   company:   { cvr, name, person, advisor: bool, at }
   *   agreement: { at } | { declined: true, at }   ja til at dele data med EIFO, eller "vi uploader selv"
   *   sharing:   { mode: 'ongoing'|'until', dataUntil?, at }
   *   erp:       { system, at } | { waiting: true, at } | { skipped: true, at } (demo: opstarten sprunget over)
   *   doneAt
   * }
   * Kun kunden kan ændre den. Forhåndsvisningen kan ikke (previewBlocked).
   */
  // Opstarten er kun 'account' (bruger, vilkår og virksomhed). Datadeling og regnskabssystem kommer først,
  // når kunden selv forbinder sit økonomisystem (fra Periodetal eller oversigten).
  var ONBOARDING_STEPS = ['account'];
  function onboarding() { var v = read('onboarding', {}); return v && typeof v === 'object' ? v : {}; }
  function setOnboarding(patch, logText) {
    if (previewBlocked('onboarding')) return false;
    if (customerLock() === 'declined') return false;
    var prev = onboarding();
    // Frem og tilbage i opstarten: et trin med samme indhold gemmes og logges ikke igen
    var sameish = function (a, b) {
      var strip = function (o) { if (!o || typeof o !== 'object') return o; var c = Object.assign({}, o); delete c.at; return c; };
      return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
    };
    var changed = Object.keys(patch).filter(function (k) { return !sameish(prev[k], patch[k]); });
    if (!changed.length) return true;
    var next = Object.assign({}, prev);
    changed.forEach(function (k) { next[k] = patch[k]; });
    write('onboarding', next);
    if (logText) log('onboarding', logText, { who: 'kunde' });
    return true;
  }
  /** Det trin i opstarten, kunden mangler, eller null når opstarten er færdig. */
  function onboardingStep(ob) {
    ob = ob || onboarding();
    if (ob.doneAt) return null;
    if (!ob.account || !ob.terms || !ob.company) return 'account';
    return null;
  }

  /** Påmindelse til kunden. ids: punkter, eller tom for hele anmodningen. */
  function remind(ids, opts) {
    opts = opts || {};
    var list = [].concat(ids || []);
    var r = request();
    var to = (r && r.to && (r.to.name || r.to.email)) || t('kunden');
    log('reminder', t('Påmindelse sendt til') + ' ' + to + (list.length ? ': ' + list.map(label).join(', ') : ''), { who: 'rådgiver', data: { items: list, by: opts.by || advisorName() } });
  }
  /** Seneste påmindelse (for et punkt, eller for hele anmodningen). */
  function lastReminder(itemId) {
    var l = activity().filter(function (e) { return e.type === 'reminder' && (!itemId || !e.data || !e.data.items.length || e.data.items.indexOf(itemId) >= 0); });
    return l.length ? l[l.length - 1] : null;
  }
  function advisorName() { return (window.DATA && DATA.ADVISOR && DATA.ADVISOR.name) || 'Mette Larsen'; }

  /**
   * Én mailskabelon til anmodninger (bruges af sagen og af Ny sag-guiden).
   * Returnerer strukturerede dele, så hver skærm selv kan tegne dem.
   */
  function requestMail(opts) {
    opts = opts || {};
    // company/caseNr/link kan overstyres (fx for en ny sag fra Ny sag-guiden)
    var co = Object.assign({}, (window.DATA && DATA.COMPANY) || {}, opts.company ? { name: opts.company } : {}, opts.caseNr ? { caseNr: opts.caseNr } : {});
    var adv = (window.DATA && DATA.ADVISOR) || { name: 'Mette Larsen', title: 'Kreditrådgiver', org: 'EIFO' };
    var to = opts.to || {};
    var list = (opts.items || draftItems()).map(function (it) { return { id: it.id, label: t(it.label), why: t(it.why), optional: it.tag === 'Valgfri' }; });
    var first = (to.name || '').split(' ')[0];
    return {
      subject: t('Materiale til kreditvurdering af') + ' ' + (co.name || ''),
      greeting: first ? t('Hej') + ' ' + first + ',' : t('Hej,'),
      intro: t('Tak for jeres ansøgning. For at vi kan vurdere den, har vi brug for materialet nedenfor.'),
      items: list,
      deadlineLine: opts.deadline ? t('Send det gerne senest') + ' ' + fmtDate(opts.deadline) + '.' : '',
      buttonLabel: t('Åbn jeres side hos EIFO'),
      link: opts.link ? (/^https?:/.test(opts.link) ? opts.link : 'https://' + opts.link) : 'https://' + requestLink(),
      trustLine: t('Linket går til Crediwire, som EIFO bruger til sikker indsamling af materiale. Første gang opretter I en bruger hos Crediwire. Har I allerede en, logger I bare ind.'),
      caseLine: t('Sagsnr.') + ' ' + (co.caseNr || ''),
      signature: [adv.name, (adv.title ? t(adv.title) + ', ' : '') + (adv.org || 'EIFO'), adv.phone || '', adv.email || ''].filter(Boolean),
    };
  }

  /* ── Spørgsmål mellem kunde og rådgiver ─────────────────────────────────── */

  // Question = { id, from: 'kunde'|'rådgiver', text, at, itemId?, preview?, replies: [{from,text,at,preview?}], readBy: { kunde?:ISO, rådgiver?:ISO } }
  // preview: skrevet af rådgiveren i forhåndsvisningen af kundesiden (from er stadig 'kunde', kundens plads)
  function questions() { return read('questions', []); }
  // about: emnet, når beskeden ikke handler om et punkt, fx "Årsrapport 2024" fra de offentlige data
  function ask(from, text, itemId, about) {
    if (from === 'kunde' && previewBlocked('message')) return null;
    var q = { id: uid('q'), from: from, text: text, at: now(), itemId: itemId || null, about: about || null, replies: [], readBy: {} };
    q.readBy[from] = q.at;
    // Stillet i forhåndsvisningen af kundesiden: det er rådgiveren, der skriver (vises og logges sådan)
    if (previewMode && from === 'kunde') { q.preview = true; q.readBy['rådgiver'] = q.at; }
    write('questions', questions().concat([q]));
    log('question', (from === 'kunde' ? t('Nyt spørgsmål fra kunden') : t('Nyt spørgsmål til kunden')) + ': ' + text.slice(0, 80), { who: from, itemId: itemId });
    return q;
  }
  function reply(qid, from, text) {
    if (from === 'kunde' && previewBlocked('message')) return;
    var ts = now();
    write('questions', questions().map(function (q) {
      if (q.id !== qid) return q;
      var rb = Object.assign({}, q.readBy); rb[from] = ts;
      var r = { from: from, text: text, at: ts };
      if (previewMode && from === 'kunde') { r.preview = true; rb['rådgiver'] = ts; } // svar på kundens plads, skrevet i forhåndsvisningen
      return Object.assign({}, q, { replies: (q.replies || []).concat([r]), readBy: rb });
    }));
    log('reply', (from === 'kunde' ? t('Kunden svarede') : t('Rådgiveren svarede')) + ': ' + text.slice(0, 80), { who: from });
  }
  function markRead(qid, who) {
    if (who === 'kunde' && previewMode) return;
    var ts = now();
    write('questions', questions().map(function (q) {
      if (q.id !== qid) return q;
      var rb = Object.assign({}, q.readBy); rb[who] = ts;
      return Object.assign({}, q, { readBy: rb });
    }));
  }
  /** Antal tråde med noget nyt, som `who` ikke har set. */
  function unreadFor(who) {
    return questions().filter(function (q) {
      var last = q.replies && q.replies.length ? q.replies[q.replies.length - 1] : q;
      return last.from !== who && (!q.readBy[who] || q.readBy[who] < last.at);
    }).length;
  }

  /*
   * Samtalen mellem kunde og rådgiver vises som én tråd i tidsorden (ældste øverst),
   * ens på begge sider. Data ligger stadig som spørgsmål med svar; her flades de ud.
   * Message = { key, qid, from, text, at, itemId, preview }
   */
  function conversation() {
    var out = [];
    questions().forEach(function (q) {
      out.push({ key: q.id, qid: q.id, from: q.from, text: q.text, at: q.at, itemId: q.itemId || null, about: q.about || null, preview: !!q.preview });
      (q.replies || []).forEach(function (r, i) {
        out.push({ key: q.id + ':' + i, qid: q.id, from: r.from, text: r.text, at: r.at, itemId: null, preview: !!r.preview });
      });
    });
    return out.sort(function (a, b) { return (a.at || '').localeCompare(b.at || ''); });
  }
  /** Har `who` set beskeden? (sin egen tæller altid som set) */
  function isMessageRead(m, who) {
    if (m.from === who) return true;
    var q = questions().filter(function (x) { return x.id === m.qid; })[0];
    var seen = q && q.readBy && q.readBy[who];
    return !!seen && seen >= m.at;
  }
  /** Markér hele samtalen som set af `who`. */
  function markConversationRead(who) {
    if (who === 'kunde' && previewMode) return;
    var ts = now(), changed = false;
    var qs = questions().map(function (q) {
      var rb = Object.assign({}, q.readBy || {});
      if (rb[who] && rb[who] >= ts) return q;
      rb[who] = ts; changed = true;
      return Object.assign({}, q, { readBy: rb });
    });
    if (changed) write('questions', qs);
  }
  /**
   * Skriv i samtalen. Et svar på den seneste besked, medmindre beskeden handler om
   * et bestemt punkt, eller der ikke er nogen samtale endnu (så starter en ny tråd).
   */
  function sendMessage(from, text, itemId, about) {
    var qs = questions();
    if (itemId || about || !qs.length) return ask(from, text, itemId, about);
    var latest = conversation().slice(-1)[0];
    reply(latest.qid, from, text);
    return latest.qid;
  }
  /**
   * Hvem venter samtalen på? Kun et spørgsmål venter på svar: er den seneste besked
   * et spørgsmål, venter den på den anden part ('kunde' | 'rådgiver'). Et svar eller
   * en kvittering ("Tak, det sender vi") venter ikke på nogen (null).
   */
  function conversationWaitsOn() {
    var last = conversation().slice(-1)[0];
    if (!last || !/\?\s*$/.test(last.text || '')) return null;
    var from = last.preview ? 'rådgiver' : last.from;
    return from === 'kunde' ? 'rådgiver' : 'kunde';
  }

  /* ── Sagens fase og historik ─────────────────────────────────────────────── */

  // CaseState = { stage, stageSince, decline:{reason,note,at}|null, submittedAt, submitNote, submitOpen,
  //               customerSubmittedAt, history:[{at, type, by, reason, note}] }
  function caseState() { return read('caseState', {}); }
  function setCaseState(patch) {
    var prev = caseState();
    var next = Object.assign({}, prev, patch);
    if (patch && patch.stage && patch.stage !== prev.stage) next.stageSince = now();
    write('caseState', next);
  }
  function stage() { return caseState().stage || 'review-public'; }
  function addHistory(entry) {
    var cs = caseState();
    setCaseState({ history: (cs.history || []).concat([Object.assign({ at: now(), by: advisorName() }, entry)]) });
  }

  /**
   * Hvad står i vejen for at flytte sagen til `to`? null hvis intet.
   * 'submitted': sagen er indstillet. 'declined': sagen er afslået.
   */
  function stageBlock(to) {
    var cs = caseState();
    if (cs.submittedAt && to !== 'submitted') return 'submitted';
    if ((cs.stage === 'declined') && to !== 'declined') return 'declined';
    return null;
  }
  /**
   * Den eneste måde andre skærme må flytte sagen på. Spørger først, hvis sagen
   * er indstillet (træk tilbage med årsag) eller afslået (genoptag).
   * Returnerer et Promise<boolean> om fasen blev ændret.
   */
  function requestStage(to, opts) {
    opts = opts || {};
    var block = stageBlock(to);
    function go() { setCaseState({ stage: to }); log('stage', t('Fase') + ': ' + t(stageLabel(to)), { who: 'rådgiver' }); return true; }
    if (!block) return Promise.resolve(go());
    if (block === 'submitted') {
      return confirmDialog({
        title: t('Sagen er indstillet til kreditkomitéen'),
        text: t('For at ændre sagen skal indstillingen trækkes tilbage først. Komitéen får besked.'),
        confirmLabel: t('Træk tilbage og fortsæt'), requireReason: true, reasonLabel: t('Årsag til at trække indstillingen tilbage'),
      }).then(function (r) { if (!r.ok) return false; withdraw(r.reason); return go(); });
    }
    return confirmDialog({
      title: t('Sagen er afslået'),
      text: t('Vil du genoptage sagen? Afslaget gemmes i sagens historik.'),
      confirmLabel: t('Genoptag og fortsæt'),
    }).then(function (r) { if (!r.ok) return false; reopen(); return go(); });
  }
  /**
   * Er sagen lukket for kunden? 'declined' (afslået), 'submitted' (hos komitéen)
   * eller null. Portalen og Dataanmodninger bruger den, så kunden ikke kan uploade
   * og rådgiveren ikke kan påminde på en lukket sag.
   */
  function customerLock() {
    var cs = caseState();
    if (cs.stage === 'declined') return 'declined';
    if (cs.submittedAt) return 'submitted';
    return null;
  }
  function stageLabel(s) {
    return ({ 'review-public': 'Vurdering', 'material-selection': 'Materialevalg', 'awaiting-customer': 'Afventer kunden', ready: 'Klar til indstilling', 'ready-skip': 'Klar til indstilling', declined: 'Afslået' })[s] || s;
  }

  /** Indstil til kreditkomitéen. opts: { note, open:[tekst], reasons:[{text, reason}], conditions:[…], snapshot } */
  function submit(opts) {
    opts = opts || {};
    var ts = now();
    var cs = caseState();
    // Dobbeltklik må ikke give to versioner: en indstillet sag skal trækkes tilbage først
    if (cs.submittedAt) return false;
    var ver = (cs.submitVersion || 0) + 1;
    if (opts.snapshot) {
      var snap = { version: ver, at: ts, by: advisorName(), sections: opts.snapshot };
      write('snapshot', snap);
      // Alle indstillede versioner gemmes, så man kan se, hvad komitéen fik hver gang
      write('snapshots', read('snapshots', []).concat([snap]));
    }
    setCaseState({ submittedAt: ts, submitNote: opts.note || '', submitOpen: opts.open || [], submitVersion: ver,
      submitReasons: opts.reasons || [], submitConditions: opts.conditions || [] });
    addHistory({ type: 'submitted', note: opts.note || '', version: ver });
    log('submitted', t('Indstillet til kreditkomitéen') + ' (' + t('version') + ' ' + ver + ')', { who: 'rådgiver' });
  }
  /** Træk indstillingen tilbage. Årsag er påkrævet og gemmes i historikken. */
  function withdraw(reason) {
    var prevNote = caseState().submitNote || '';
    setCaseState({ submittedAt: null, submitNote: '', submitOpen: null, submitDraftNote: prevNote || caseState().submitDraftNote || '' });
    addHistory({ type: 'withdrawn', reason: reason || '' });
    log('withdrawn', t('Indstillingen er trukket tilbage') + (reason ? ': ' + reason : ''), { who: 'rådgiver' });
  }
  /** Giv afslag. Kan ske i alle faser før indstilling. */
  function decline(reason, note) {
    var cs = caseState();
    setCaseState({ stage: 'declined', declinedFrom: cs.stage || 'review-public', decline: { reason: reason, note: note || '', at: now() } });
    addHistory({ type: 'declined', reason: reason, note: note || '' });
    log('declined', t('Afslag') + ': ' + t(reason), { who: 'rådgiver' });
    // Samtykket lover, at adgangen lukker, når EIFO har truffet en afgørelse
    if (consent()) {
      write('consent', null);
      log('consent-revoked', t('Adgangen til regnskabssystemet er lukket, fordi sagen er afgjort'), { who: 'system' });
    }
  }
  /** Spring kundeinput over ("Gå direkte til memo"). Årsagen gemmes i historikken. Returnerer Promise<boolean>. */
  function skipCustomer(reason) {
    return requestStage('ready-skip').then(function (ok) {
      if (!ok) return false;
      setCaseState({ skipReason: reason || '' });
      addHistory({ type: 'skipped', reason: reason || '' });
      log('stage', t('Kundeinput sprunget over') + (reason ? ': ' + reason : ''), { who: 'rådgiver' });
      return true;
    });
  }
  /** Genoptag en afslået sag i den fase, den kom fra. */
  function reopen() {
    var cs = caseState();
    setCaseState({ stage: cs.declinedFrom || 'review-public', decline: null });
    addHistory({ type: 'reopened' });
    log('reopened', t('Sagen er genoptaget'), { who: 'rådgiver' });
  }
  /** Den senest indstillede version, eller en bestemt version. */
  function memoSnapshot(version) {
    if (version == null) return read('snapshot', null);
    return read('snapshots', []).filter(function (x) { return x.version === version; })[0] || null;
  }
  function memoSnapshots() { return read('snapshots', []); }

  /* ── Sager, der ikke har levende data ────────────────────────────────────── */

  // DemoCase = { id, caseNr, name, cvr, type, createdAt, status: 'Kladde', demo: true, own,
  //   amount (EIFOs beløb: kautionen eller lånet), facilityAmount (bankens facilitet ved
  //   kaution, ellers null), eifoShare (andelen ved kaution), amountBasis: 'facility'|'loan',
  //   deadline (sagsfristen, yyyy-mm-dd eller null; guiden sætter den ikke), next (dansk),
  //   responsible, contact: { name, role, email },
  //   request: { items: [id], why: { [id]: tekst }, tags: { [id]: tag }, to: { name, role, email },
  //              deadline (kundens svarfrist, yyyy-mm-dd), link, sent: false, savedAt } }
  // own: sagen er for sag 1's virksomhed (Nordhavn), så dens røde flag og Dokumenter gælder.

  /** Sager oprettet i Ny sag-guiden. De vises i Mine opgaver som kladder. */
  function demoCases() { return read('demoCases', []); }
  function addDemoCase(c) {
    var list = demoCases();
    var id = 900 + list.length + 1;
    var d = Object.assign({ id: id, createdAt: now(), status: 'Kladde', demo: true, deadline: null }, c);
    if (d.request) d.request = Object.assign({ sent: false, savedAt: d.createdAt }, d.request);
    d.next = demoCaseNext(d);
    write('demoCases', list.concat([d]));
    // Ingen linje i sag 1's historik: den nye sag er en anden sag end Nordhavns 2026-0184
    return d;
  }
  /** Én sag fra Ny sag-guiden, eller null. */
  function demoCase(id) {
    var n = Number(id);
    return demoCases().filter(function (d) { return Number(d.id) === n; })[0] || null;
  }
  function asDemo(x) { return x && typeof x === 'object' ? x : demoCase(x); }
  /** Næste skridt på en demosag (dansk kildetekst, vis med t()). */
  function demoCaseNext(x) {
    var d = asDemo(x);
    if (!d) return null;
    return d.request && Array.isArray(d.request.items) && d.request.items.length ? 'Send anmodningen' : 'Udfyld sagen og vælg materiale';
  }
  /** "80 % af bankens facilitet på 4,5 mio." på det aktive sprog, eller null ved lån. */
  function demoCaseAmountNote(x) {
    var d = asDemo(x);
    if (!d || !d.facilityAmount) return null;
    var share = d.eifoShare || (d.amount ? d.amount / d.facilityAmount : 0.8);
    var pct = Math.round(share * 100);
    var en = window.CW_LANG === 'en';
    var mio = (d.facilityAmount / 1e6).toLocaleString(en ? 'en-GB' : 'da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return en ? pct + "% of the bank's DKK " + mio + 'm facility' : pct + ' % af bankens facilitet på ' + mio + ' mio.';
  }
  /** Punkterne i demosagens gemte anmodning, med det "hvorfor" og mærke, guiden viste. */
  function demoCaseItems(x) {
    var d = asDemo(x);
    var r = d && d.request;
    if (!r || !Array.isArray(r.items)) return [];
    return r.items.map(function (id) {
      var it = itemById(id);
      if (!it) return null;
      return asRequested(Object.assign(itemFor(it, d.type, { own: !!d.own }), r.why && r.why[id] ? { why: r.why[id] } : null, r.tags && r.tags[id] ? { tag: r.tags[id] } : null));
    }).filter(Boolean);
  }
  /** Mailen i demosagens gemte anmodning (samme skabelon som sag 1), på det aktive sprog. */
  function demoCaseMail(x) {
    var d = asDemo(x);
    var r = d && d.request;
    if (!r) return null;
    return requestMail({ items: demoCaseItems(d), deadline: r.deadline || null, to: r.to || {}, company: d.name, caseNr: d.caseNr, link: r.link });
  }
  /**
   * Simulerer afsendelsen af en demosags gemte anmodning (workspace, "Send
   * anmodningen"): request.sent/sentAt sættes, og sagen afventer kunden
   * (status, stageSince, next). Ingen linje i sag 1's historik. Returnerer sagen.
   */
  function sendDemoCase(id) {
    var n = Number(id), at = now(), out = null;
    var list = demoCases().map(function (d) {
      if (Number(d.id) !== n || !d.request || d.request.sent) return d;
      out = Object.assign({}, d, { status: 'Afventer kunden', stageSince: at, next: 'Afvent kunden',
        request: Object.assign({}, d.request, { sent: true, sentAt: at }) });
      return out;
    });
    if (out) write('demoCases', list);
    return out;
  }
  /** Demosagernes gemte anmodninger som rækker i samme form som DATA.REQUESTS_DEMO (Dataanmodninger). */
  function demoRequests() {
    return demoCases().filter(function (d) { return d.request && Array.isArray(d.request.items) && d.request.items.length; }).map(function (d) {
      var r = d.request, to = r.to || {};
      return {
        id: d.id, caseId: d.id, demo: true, contact: to.name || null, role: to.role || null, email: to.email || null,
        sentAt: r.sent ? (r.sentAt || null) : null, deadline: r.deadline || null,
        received: 0, total: r.items.length, toReview: 0, openedAt: null,
        lastActivityAt: r.savedAt || d.createdAt || null, lastAction: 'Ikke sendt',
      };
    });
  }

  /* ── Materiale pr. sagstype (Ny sag-guiden og nye sager) ─────────────────── */

  /** Sag 1's sagstype. Katalogets tag og why er skrevet til den. */
  function liveType() {
    var c = window.DATA && Array.isArray(DATA.BASE_CASES) ? DATA.BASE_CASES.filter(function (x) { return x.id === LIVE_CASE_ID; })[0] : null;
    return (c && c.type) || 'Eksportkaution';
  }
  /** 'Anbefalet' eller 'Valgfri' for punktet ved en sagstype (uden type: sag 1's). */
  function tagFor(it, type) {
    if (!type || !it.products) return it.tag;
    return it.products.indexOf(type) >= 0 ? 'Anbefalet' : 'Valgfri';
  }
  /** Det røde flag i sag 1, som punktet peger på: { key, short, severity } eller null. */
  function flagFor(it) {
    if (!it || !it.flag) return null;
    var list = window.CASE_FACTS && Array.isArray(window.CASE_FACTS.redFlags) ? window.CASE_FACTS.redFlags : [];
    var f = list.filter(function (x) { return x.key === it.flag; })[0];
    if (!f) return null;
    return { key: f.key, short: (window.CW_LANG === 'en' && f.shortEn) || f.short || '', severity: f.severity || '' };
  }
  /** "Hvorfor" for punktet ved en sagstype. opts.own === false: en anden virksomhed end sag 1's. */
  function whyFor(it, type, opts) {
    var own = !opts || opts.own !== false;
    if (it.flag && own && flagFor(it)) return it.why;
    if (type && type !== liveType() && it.whyBy && it.whyBy[type]) return it.whyBy[type];
    if (it.flag) return it.whyAny || it.why;
    return it.why;
  }
  /** Punktet med mærke og "hvorfor" for sagstypen, og flagged (sag 1's røde flag) for egen virksomhed. */
  function itemFor(it, type, opts) {
    var own = !opts || opts.own !== false;
    return Object.assign({}, it, { tag: tagFor(it, type), why: whyFor(it, type, opts), flagged: own ? flagFor(it) : null });
  }
  function itemsFor(type, opts) { return allItems().map(function (it) { return itemFor(it, type, opts); }); }
  function owners() { return read('owners', {}); }
  function setOwner(caseId, name) {
    var o = owners(); o[caseId] = name; write('owners', o);
    // Loggen er sag 1's historik. Flytning af andre sager gemmes for sig.
    if (isLiveCase(caseId)) log('owner', t('Sagen er flyttet til') + ' ' + name, { who: 'rådgiver', data: { caseId: caseId } });
    else write('ownersLog', read('ownersLog', []).concat([{ at: now(), caseId: caseId, name: name, by: advisorName() }]));
  }
  function isLiveCase(id) { return Number(id) === LIVE_CASE_ID; }

  /* ── Nulstil demo ────────────────────────────────────────────────────────── */

  /** Rydder al demotilstand (sag, memo, kommentarer, filer) og genindlæser. Sprog og rute bevares. */
  /* Intern note til et punkt: kun rådgiveren ser den. Tom tekst sletter den. */
  function internalNote(id) { return (read('internalNotes', {}) || {})[id] || null; }
  function setInternalNote(id, text, by) {
    var all = Object.assign({}, read('internalNotes', {}) || {});
    var txt = String(text || '').trim();
    if (txt) all[id] = { text: txt, by: by || '', at: now() }; else delete all[id];
    write('internalNotes', Object.keys(all).length ? all : null);
    emit();
  }

  function resetDemo() {
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (/^kabul:/.test(k) || /^memo4/.test(k) || /^cw:demo/.test(k)) localStorage.removeItem(k);
      });
      Object.keys(sessionStorage).forEach(function (k) { if (/^kabul:/.test(k)) sessionStorage.removeItem(k); });
    } catch (e) {}
    // Genindlæs først, når filerne er slettet (højst 1,5 s), så den nye side ikke venter på sletningen
    var done = false;
    function go() { if (done) return; done = true; location.reload(); }
    try {
      if (window.indexedDB) {
        var del = indexedDB.deleteDatabase(DB_NAME);
        del.onsuccess = del.onerror = function () { setTimeout(go, 30); };
      } else setTimeout(go, 30);
    } catch (e) { setTimeout(go, 30); }
    setTimeout(go, 1500);
  }

  /* Gentegning, når tilstanden ændrer sig: se src/composables/useCaseVersion.js
     (lytter på EVENT og 'storage', som React-hooket CW.useCase gjorde før migrationen). */

  /* ── Formatering ────────────────────────────────────────────────────────── */

  function pad(n) { return String(n).padStart(2, '0'); }
  /** "29-09-2026 13:40" / "29 Sep 13:40" */
  function fmtWhen(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return '';
    var time = pad(d.getHours()) + ':' + pad(d.getMinutes());
    return window.CW_LANG === 'en'
      ? d.getDate() + ' ' + MONTHS_EN[d.getMonth()] + ' ' + time
      : pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear() + ' ' + time;
  }
  /** Relativ tid til klokke og lister: "lige nu", "for 17 min. siden", "for 3 timer siden", ellers fmtWhen. */
  function fmtAgo(iso) {
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return '';
    var min = Math.floor((Date.now() - d.getTime()) / 60000);
    var en = window.CW_LANG === 'en';
    if (min < 1) return en ? 'just now' : 'lige nu';
    if (min < 60) return en ? min + ' min ago' : 'for ' + min + ' min. siden';
    var h = Math.floor(min / 60);
    if (h < 24 && d.getDate() === new Date().getDate()) return en ? h + (h === 1 ? ' hour ago' : ' hours ago') : 'for ' + h + (h === 1 ? ' time siden' : ' timer siden');
    return fmtWhen(iso);
  }
  /** "06-10-2026" / "6 Oct 2026" */
  function fmtDate(isoOrDate) {
    var d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (!d || isNaN(d)) return '';
    return window.CW_LANG === 'en'
      ? d.getDate() + ' ' + MONTHS_EN[d.getMonth()] + ' ' + d.getFullYear()
      : pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear();
  }
  /** yyyy-mm-dd, `days` hverdage frem fra i dag */
  function workdaysFromNow(days) {
    var d = new Date(); var n = 0;
    while (n < days) { d.setDate(d.getDate() + 1); var wd = d.getDay(); if (wd !== 0 && wd !== 6) n++; }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  /** Hele hverdage mellem to datoer (til "dage i fase" og SLA). */
  function workdaysBetween(fromIso, toIso) {
    var a = new Date(fromIso), b = toIso ? new Date(toIso) : new Date();
    if (isNaN(a) || isNaN(b) || b <= a) return 0;
    var n = 0, d = new Date(a);
    d.setHours(0, 0, 0, 0);
    while (d < b) { d.setDate(d.getDate() + 1); var wd = d.getDay(); if (wd !== 0 && wd !== 6 && d <= b) n++; }
    return n;
  }
  /** Er datoen (yyyy-mm-dd) før i dag? */
  function isPast(ymd) {
    if (!ymd) return false;
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    return new Date(ymd + 'T00:00:00') < t0;
  }

  /* ── Beskeder (toast) ───────────────────────────────────────────────────── */

  // Vises med ant-design-vue (notification) i src/services/feedback.js. Samme kontrakt:
  // toast(text, { action: { label, onClick }, tone: 'ok'|'info'|'warn', ms })
  function hideToast() { feedbackHideToast(); }
  /**
   * Kort besked nederst på skærmen. opts: { action: { label, onClick }, tone: 'ok'|'info'|'warn', ms }
   * Timeren venter, så længe musen eller fokus er på beskeden.
   */
  function toast(text, opts) { feedbackToast(text, opts); }
  // Beskeder følger ikke med til en anden skærm eller rolle
  window.addEventListener('cw-route-changed', hideToast);
  /** Til knapper der ikke er bygget i prototypen. */
  function notInDemo(what) {
    toast((what ? what + ': ' : '') + t('ikke med i demoen'), { tone: 'info' });
  }

  /* ── Hent et dokument (uploadet fil, eller demodokument som PDF/Excel) ─────── */

  // WinAnsi-kode for et tegn (PDF-standardskrifterne); ukendte tegn bliver '?'
  var WIN_ANSI = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };
  function pdfText(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i), c = str.charCodeAt(i);
      var code = WIN_ANSI[ch] || (c < 256 && (c < 0x80 || c > 0x9f) ? c : 63);
      if (code === 40 || code === 41 || code === 92) out += '\\';
      out += String.fromCharCode(code);
    }
    return out;
  }
  /** En enkel PDF med Courier (fast bredde, så tabeller står pænt). pages: [{ title, body }] */
  function buildPdf(title, pages) {
    var W = 595, H = 842, M = 40, FS = 8, LH = 10.4, COLS = 106, PER = Math.floor((H - 2 * M) / LH);
    var lines = [];
    function push(s) {
      String(s).split('\n').forEach(function (l) {
        if (!l.length) { lines.push(''); return; }
        while (l.length > COLS) { lines.push(l.slice(0, COLS)); l = '  ' + l.slice(COLS); }
        lines.push(l);
      });
    }
    push(title); push('');
    (pages || []).forEach(function (p, i) {
      if (i > 0) { while (lines.length % PER) lines.push(''); }
      push((p.ref ? p.ref + '  ·  ' : '') + (p.title || '')); push(''); push(p.body || '');
    });
    var chunks = [];
    for (var i = 0; i < lines.length; i += PER) chunks.push(lines.slice(i, i + PER));
    var objs = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
    var kids = [];
    chunks.forEach(function (ls, n) {
      var pageId = 4 + n * 2, contId = 5 + n * 2;
      var stream = 'BT /F1 ' + FS + ' Tf ' + LH + ' TL ' + M + ' ' + (H - M) + ' Td\n'
        + ls.map(function (l) { return '(' + pdfText(l) + ') Tj T*'; }).join('\n') + '\nET';
      objs[pageId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + contId + ' 0 R >>';
      objs[contId] = '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream';
      kids.push(pageId + ' 0 R');
    });
    objs[2] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>';
    var pdf = '%PDF-1.4\n', offsets = [];
    for (var k = 1; k < objs.length; k++) { offsets[k] = pdf.length; pdf += k + ' 0 obj\n' + objs[k] + '\nendobj\n'; }
    var xref = pdf.length;
    pdf += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
    for (var j = 1; j < objs.length; j++) pdf += String(offsets[j]).padStart(10, '0') + ' 00000 n \n';
    pdf += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    var bytes = new Uint8Array(pdf.length);
    for (var b = 0; b < pdf.length; b++) bytes[b] = pdf.charCodeAt(b) & 0xff;
    return new Blob([bytes], { type: 'application/pdf' });
  }
  /** Excel: ét ark pr. side; kolonner deles ved to eller flere mellemrum, danske tal bliver tal. */
  function buildXlsx(pages) {
    if (!window.XLSX) return null;
    var wb = XLSX.utils.book_new(), used = {};
    (pages || []).forEach(function (p, i) {
      var rows = String(p.body || '').split('\n').map(function (l) {
        return l.trim() ? l.trim().split(/\s{2,}/).map(function (c) {
          return /^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(c) ? Number(c.replace(/\./g, '').replace(',', '.')) : c;
        }) : [];
      });
      var name = String(p.ref || ('Ark ' + (i + 1))).replace(/^ark /i, '').replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 31) || ('Ark ' + (i + 1));
      while (used[name]) name = name.slice(0, 28) + ' ' + (i + 1);
      used[name] = true;
      var ws = XLSX.utils.aoa_to_sheet(rows);
      // Noter i cellerne (Excel-kommentarer): { r, c, t, a }, 0-baserede
      (p.comments || []).forEach(function (cm) {
        var addr = XLSX.utils.encode_cell({ r: cm.r, c: cm.c });
        if (ws[addr] && cm.t) { ws[addr].c = [{ a: cm.a || 'Crediwire', t: cm.t }]; ws[addr].c.hidden = true; }
      });
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    var out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  /**
   * Hent et dokument ud fra filnavnet: en uploadet fil hentes som den er; et af
   * sagens demodokumenter (CASE_DOCS) bygges som PDF eller Excel ud fra indholdet.
   * Returnerer true, hvis noget blev hentet.
   */
  function downloadDoc(name) {
    var up = allUploads().filter(function (f) { return f.name === name && fileUrl(f.id); })[0];
    if (up) {
      var a = document.createElement('a'); a.href = fileUrl(up.id); a.download = name; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      return true;
    }
    var doc = (window.CASE_DOCS || []).concat(window.CW_EXPORT_DOCS || []).filter(function (d) { return d.name === name; })[0];
    if (!doc) { notInDemo(name); return false; }
    // Markdown (vejledningen til den AI, der læser pakken) hentes som ren tekst
    var blob = /\.md$/i.test(name) ? new Blob([String((doc.pages[0] || {}).body || '')], { type: 'text/markdown;charset=utf-8' })
      : /\.xlsx?$/i.test(name) ? buildXlsx(doc.pages) : buildPdf(doc.name + (doc.meta ? '\n' + doc.meta : ''), doc.pages);
    if (!blob) { notInDemo(name); return false; }
    saveBlob(blob, name);
    return true;
  }

  /* ── Demofiler til "Udfyld alt (demo)" i kundeportalen ──────────────────── */
  // Kundens dokumenter ligger som indhold i CASE_DOCS, men står først på sagen,
  // når kunden uploader dem (DATA.customerDocs). Punkt → fil bygget af indholdet.
  // doc: kildedokumentet. name: et andet filnavn. refs: kun disse sider.
  // cut: kun teksten fra..til på en side (fx note 10 i årsrapportens balance).
  var DEMO_UPLOADS = {
    'm-interim': { doc: 'Periodetal_jan-aug_2026.xlsx' },
    'm-budget': { doc: 'Budget_2026-28_v3.xlsx' },
    'm-assumptions': { doc: 'Budget_2026-28_v3.xlsx', name: 'Budgetforudsaetninger_2026-28.pdf', title: 'Budgetforudsætninger 2026-2028', refs: ['ark Forudsætninger'] },
    'm-loans': { doc: 'Aarsrapport_2025.pdf', name: 'Laaneoversigt_2026.pdf', title: 'Lån og kreditter pr. 31. december 2025 (årsrapport 2025, note 10 og 14)', refs: ['s. 8', 'note 14'], cut: { ref: 's. 8', from: 'NOTE 10', to: 'NOTE 11' } },
    'm-ejerbog': { doc: 'Ejerbog_2026.pdf' },
    'm-orderbook': { doc: 'GE_Vernova_rammekontrakt.pdf' },
  };
  /** Filnavnet på punktets demofil (uden at bygge filen), eller null. */
  function demoUploadName(itemId) {
    var m = DEMO_UPLOADS[itemId];
    return m ? (m.name || m.doc) : null;
  }
  /** En rigtig fil med indhold til et punkt (File), eller null, hvis punktet ikke har en demofil. */
  function demoUploadFile(itemId) {
    var m = DEMO_UPLOADS[itemId];
    var doc = m && (window.CASE_DOCS || []).filter(function (d) { return d.name === m.doc; })[0];
    if (!doc) return null;
    var name = m.name || doc.name;
    var pages = (doc.pages || []).filter(function (p) { return !m.refs || m.refs.indexOf(p.ref) >= 0; }).map(function (p) {
      if (!m.cut || p.ref !== m.cut.ref) return p;
      var b = String(p.body || ''), i = b.indexOf(m.cut.from), j = b.indexOf(m.cut.to);
      return Object.assign({}, p, { title: '', body: b.slice(i < 0 ? 0 : i, j > i ? j : undefined).trim() });
    });
    var blob = /\.xlsx?$/i.test(name) ? buildXlsx(pages) : buildPdf((m.title || doc.name) + '\n' + ((window.DATA && DATA.COMPANY && DATA.COMPANY.name) || '') + (m.title ? '' : (doc.meta ? '\n' + doc.meta : '')), pages);
    if (!blob) return null;
    try { return new File([blob], name, { type: blob.type }); } catch (e) { blob.name = name; return blob; }
  }

  /* ── Bekræftelsesdialog (kan kaldes fra alle filer) ─────────────────────── */

  /**
   * confirmDialog({ title, text, confirmLabel, cancelLabel, requireReason, reasonLabel, danger, focusCancel })
   * → Promise<{ ok, reason }>. Fokus ind, Tab holdes inde, Esc annullerer,
   * fokus tilbage til det element der var aktivt.
   * Vises som a-modal: src/components/common/ConfirmDialog.vue (via src/services/feedback.js).
   */
  function confirmDialog(o) { return feedbackConfirm(o); }

  /* ── Fokus ──────────────────────────────────────────────────────────────── */
  /* Dialoger (fokus ind, Tab-fælde, Esc, fokus tilbage) klares af ant-design-vue (a-modal,
     a-drawer). React-hooket CW.useDialog fandtes kun til de hjemmebyggede dialoger. */

  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

  /** Flyt fokus til det første element, der matcher selector (efter skærmen er tegnet). */
  function focusSoon(selector) {
    setTimeout(function () {
      var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el) return;
      if (!el.matches(FOCUSABLE) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      try { el.focus({ preventScroll: true }); } catch (e) {}
      // Rul elementet ind i billedet, hvis det ligger uden for skærmen
      var r = el.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight) { try { el.scrollIntoView({ block: 'center' }); } catch (e) {} }
    }, 30);
  }

  window.CW = {
    KEYS: KEYS, EVENT: EVENT, LIVE_CASE_ID: LIVE_CASE_ID,
    MATERIAL_GROUPS: MATERIAL_GROUPS, DEFAULT_MATERIAL_SELECTION: DEFAULT_MATERIAL_SELECTION, defaultSelection: defaultSelection,
    allItems: allItems, itemById: itemById, onFile: onFile,
    customItems: customItems, addCustomItem: addCustomItem, removeCustomItem: removeCustomItem, setCustomItemCat: setCustomItemCat,
    selection: selection, setSelection: setSelection, draftItems: draftItems, requestedItems: requestedItems,
    draftDiff: draftDiff, discardDraft: discardDraft,
    items: items, itemState: itemState, isReceived: isReceived, isApproved: isApproved,
    markReceived: markReceived, markNoted: markNoted, markDelegated: markDelegated, answerItem: answerItem,
    approve: approve, reject: reject, resetItem: resetItem, removeFile: removeFile, canRemoveFile: canRemoveFile, unreview: unreview,
    progress: progress,
    putFiles: putFiles, fileUrl: fileUrl, fmtSize: fmtSize,
    addLooseUploads: addLooseUploads, removeLooseUpload: removeLooseUpload, allUploads: allUploads,
    request: request, sendRequest: sendRequest, clearRequest: clearRequest, restoreItem: restoreItem, draft: draft, setDraft: setDraft, requestMail: requestMail,
    customerSubmit: customerSubmit, consent: consent, setConsent: setConsent,
    onboarding: onboarding, setOnboarding: setOnboarding, onboardingStep: onboardingStep, ONBOARDING_STEPS: ONBOARDING_STEPS, previewBlocked: previewBlocked,
    remind: remind, lastReminder: lastReminder,
    questions: questions, ask: ask, reply: reply, markRead: markRead, unreadFor: unreadFor,
    conversation: conversation, isMessageRead: isMessageRead, markConversationRead: markConversationRead, sendMessage: sendMessage, conversationWaitsOn: conversationWaitsOn,
    caseState: caseState, setCaseState: setCaseState, stage: stage, stageBlock: stageBlock, requestStage: requestStage, stageLabel: stageLabel,
    submit: submit, withdraw: withdraw, decline: decline, reopen: reopen, skipCustomer: skipCustomer, memoSnapshot: memoSnapshot, memoSnapshots: memoSnapshots,
    activity: activity, log: log, notifications: notifications, markSeen: markSeen,
    demoCases: demoCases, addDemoCase: addDemoCase,
    demoCase: demoCase, demoCaseNext: demoCaseNext, demoCaseAmountNote: demoCaseAmountNote, demoCaseItems: demoCaseItems,
    demoCaseMail: demoCaseMail, demoRequests: demoRequests, sendDemoCase: sendDemoCase,
    liveType: liveType, tagFor: tagFor, flagFor: flagFor, whyFor: whyFor, itemFor: itemFor, itemsFor: itemsFor,
    owners: owners, setOwner: setOwner, isLiveCase: isLiveCase,
    resetDemo: resetDemo,
    // Gentegn alle, der følger sagstilstanden (fx efter lokal tilstand uden for CW)
    bump: emit,
    fmtWhen: fmtWhen, fmtDate: fmtDate, workdaysFromNow: workdaysFromNow, workdaysBetween: workdaysBetween, isPast: isPast,
    toast: toast, hideToast: hideToast, notInDemo: notInDemo, confirm: confirmDialog,
    downloadDoc: downloadDoc, demoUploadFile: demoUploadFile, demoUploadName: demoUploadName,
    removedDocs: removedDocs, isDocRemoved: isDocRemoved, canRemoveDoc: canRemoveDoc, removeDoc: removeDoc, restoreDoc: restoreDoc,
    MATERIAL_CATS: MATERIAL_CATS, itemCat: itemCat,
    internalNote: internalNote, setInternalNote: setInternalNote,
    setPreview: setPreview, isPreview: isPreview, customerLock: customerLock, fmtAgo: fmtAgo,
    focusSoon: focusSoon,
  };
})();

// Modul-eksport til Vue-komponenterne (window.CW bruges fortsat af data.js, mapping.js m.fl.)
export const CW = window.CW;
