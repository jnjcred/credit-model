// Det, kundeportalen og sagen deler: cs*-hjælperne fra customer_status.jsx (flyttet uændret ved
// migrationen til Vue; komponenterne er src/views/customer/*.vue, og portalens skærme i
// src/views/portal importerer hjælperne herfra).
//
// Ikke flyttet hertil: komponenterne (CWConversation/CWDialogCard, CWNotedForm, CWTradeForm,
// CWTimeline, WSCustomerStatus er Vue-komponenter nu), React-hooket useCsFreshThreads
// (src/views/customer/useFreshThreads.js), stilobjekterne csVisuallyHidden og csLinkBtn (den globale
// .sr-only-klasse og ant-design-vue erstatter dem) og CWCustomerBanner (ingen kaldere).
// Funktionerne læser CW, DATA og t som globale navne (window), som før. Intet her læser CW eller DATA,
// når filen indlæses. Før migrationen var navnene globale, fordi filen var et klassisk script; de
// eneste window-tildelinger (window.CWConversation m.fl.) var React-komponenter, så intet lægges på
// window her: Vue-komponenterne importerer navnene fra eksportlisten nederst.

// Rådgiverens kontaktoplysninger. DATA.ADVISOR (eller DATA.COMPANY.advisor)
// vinder, når stamdata har dem; ellers samme demo-rådgiver som i sagen.
const CS_ADVISOR_FALLBACK = { name: 'Mette Larsen', title: 'Kreditrådgiver', org: 'EIFO', phone: '+45 35 29 86 42', email: 'mette.larsen@eifo.dk' };
const CS_MAX_BYTES = 50 * 1024 * 1024;

function csAdvisor() {
  const co = (window.DATA && DATA.COMPANY) || {};
  const a = (window.DATA && DATA.ADVISOR) || co.advisor || null;
  return Object.assign({}, CS_ADVISOR_FALLBACK, a && typeof a === 'object' ? a : {});
}
const csFirst = (name) => String(name || '').trim().split(/\s+/)[0] || '';

// Udfylder {navn} i en allerede oversat tekst
function csFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

function csInitials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// yyyy-mm-dd som lokal dato (ikke UTC), ellers en almindelig ISO-tid
function csDay(iso) {
  if (!iso) return null;
  if (iso instanceof Date) return iso;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(iso);
  return isNaN(d) ? null : d;
}

function csAddWorkdays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let k = 0;
  const step = n < 0 ? -1 : 1;
  while (k < Math.abs(n)) { d.setDate(d.getDate() + step); const w = d.getDay(); if (w !== 0 && w !== 6) k++; }
  return d;
}

// Procent med ét decimal i sprogets format: 35 -> "35", 12.5 -> "12,5"
function csPct(v) {
  const r = Math.round(v * 10) / 10;
  const s = Number.isInteger(r) ? String(r) : r.toFixed(1);
  return window.CW_LANG === 'en' ? s : s.replace('.', ',');
}

// Til "Nyt"-mærket og banneret: har kunden set den seneste besked i tråden?
function csLastMsg(q) { return q.replies && q.replies.length ? q.replies[q.replies.length - 1] : q; }
function csUnreadForCustomer(q) {
  const last = csLastMsg(q);
  return last.from !== 'kunde' && (!q.readBy || !q.readBy.kunde || q.readBy.kunde < last.at);
}

// Kundens navn: den anmodningen er sendt til, ellers sagens kontaktperson
function csCustomerName() {
  const req = CW.request();
  return (req && req.to && req.to.name) || (window.DATA && DATA.REQUEST_RECIPIENT && DATA.REQUEST_RECIPIENT.name) || t('Kunden');
}

// En systemnote ("Hentet fra e-conomic") er en kilde, ikke kundens bemærkning
function csSourceText(s) {
  if (!s || !s.note || s.noteKind !== 'system') return '';
  return String(s.note).replace(/^Hentet fra/, t('Hentet fra'));
}

// Filtyper, kunden kan sende ("PDF, Excel, Word eller billeder"). Bruges både som
// accept på filfelterne og til at afvise filer, der trækkes ind (f.eks. .exe).
const CS_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.heic,.webp,.tif,.tiff';
function csAllowed(f, accept) {
  const name = String((f && f.name) || '').toLowerCase();
  return (accept || CS_ACCEPT).split(',').map(x => x.trim().toLowerCase()).some(ext => ext && name.endsWith(ext));
}
/**
 * Filtrerer filer før upload: forkert filtype eller over 50 MB afvises med en
 * venlig besked. onReject(tekst) viser beskeden ved feltet; uden den bliver det
 * en toast. onReject('') betyder, at alt gik igennem.
 */
function csAcceptFiles(fileList, accept, onReject) {
  const files = Array.from(fileList || []);
  const bad = files.filter(f => !csAllowed(f, accept));
  const tooBig = files.filter(f => csAllowed(f, accept) && f.size > CS_MAX_BYTES);
  const types = /\.doc/.test(accept || CS_ACCEPT) ? t('PDF, Excel, Word og billeder') : t('Excel, CSV og PDF');
  const msg = bad.length ? csFill(t('{navn} kan ikke sendes. Vi tager kun imod {typer}.'), { navn: bad[0].name, typer: types })
    : tooBig.length ? csFill(t('{navn} er større end 50 MB og blev ikke uploadet'), { navn: tooBig[0].name }) : '';
  if (onReject) onReject(msg);
  else if (msg) CW.toast(msg, { tone: 'warn' });
  return files.filter(f => csAllowed(f, accept) && f.size <= CS_MAX_BYTES);
}

/**
 * Kladder pr. punkt (CF1): det, kunden har valgt eller skrevet, men ikke sendt.
 * { [itemId]: { at, rows?, note?, files?: FileMeta[] } } under en kabul:-nøgle, så
 * "Nulstil demo" rydder dem. Filerne ligger allerede i IndexedDB (CW.putFiles), så
 * de kan åbnes og sendes efter genindlæsning. Forhåndsvisningen gemmer ingen kladder.
 */
const CS_DRAFT_KEY = 'kabul:portal-drafts:nordhavn';
function csDrafts() {
  try { const v = JSON.parse(localStorage.getItem(CS_DRAFT_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
function csDraft(itemId) { return csDrafts()[itemId] || null; }
function csSaveDraft(itemId, patch) {
  if (CW.isPreview()) return null;
  const all = csDrafts();
  const d = Object.assign({}, all[itemId] || {}, patch, { at: new Date().toISOString() });
  const empty = !(d.rows && d.rows.length) && !(d.files && d.files.length) && !(d.note && d.note.trim());
  if (empty) delete all[itemId]; else all[itemId] = d;
  try { localStorage.setItem(CS_DRAFT_KEY, JSON.stringify(all)); } catch (e) {}
  return empty ? null : d;
}
function csClearDraft(itemId) {
  const all = csDrafts(); if (!all[itemId]) return;
  delete all[itemId];
  try { localStorage.setItem(CS_DRAFT_KEY, JSON.stringify(all)); } catch (e) {}
}
// Valgte filer lægges straks i demoens fillager, så de overlever genindlæsning
// På Kundeside (forhåndsvisning) er det rådgiveren, der uploader på kundens vegne
function csStageFiles(files, itemId) { return CW.putFiles(files, { by: CW.isPreview() ? 'rådgiver' : 'kunde', itemId }); }
function csHHMM(iso) { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
// Dato uden klokkeslæt til lister ("30. sep."); det fulde tidspunkt kan stå i title (T11)
function csShortDate(iso) { return String(CW.fmtWhen(iso) || '').replace(/ \d{2}:\d{2}$/, ''); }

function csOpenFile(f) {
  const url = CW.fileUrl(f.id);
  if (url) window.open(url, '_blank', 'noopener');
  else CW.notInDemo(f.name);
}

/**
 * Kunden fjerner en fil. Kun egne filer, og kun efter bekræftelse, fordi Mette
 * allerede har fået den. Rådgiverens uploads kan kunden ikke fjerne.
 */
function csRemoveOwnFile(itemId, file) {
  if (!CW.canRemoveFile(itemId, file.id, 'kunde')) {
    CW.toast(t('Filen er tilføjet af EIFO, så kun EIFO kan fjerne den.'), { tone: 'info' });
    return Promise.resolve(false);
  }
  return CW.confirm({
    title: csFill(t('Fjern {navn}?'), { navn: file.name }),
    text: t('EIFO har allerede fået filen og kan se i sagens historik, at I har fjernet den.'),
    confirmLabel: t('Fjern filen'), danger: true,
  }).then(r => {
    if (!r.ok) return false;
    CW.removeFile(itemId, file.id, 'kunde');
    CW.toast(csFill(t('{navn} er fjernet'), { navn: file.name }));
    return true;
  });
}

/** Kan kunden fortryde hele punktet? Kun hvis alt i det er kundens eget. */
function csCanUndo(s) {
  if (!s || s.status === 'approved' || s.status === 'rejected') return false;
  if ((s.by || 'kunde') !== 'kunde') return false;
  // Et svar på rådgiverens spørgsmål: fortryd ville også trække de tidligere filer tilbage
  if (s.answer) return false;
  return (s.files || []).every(f => (f.by || s.by) === 'kunde');
}
function csConfirmUndo(itemId) {
  const s = CW.itemState(itemId);
  const it = CW.itemById(itemId);
  const label = it ? t(it.label) : '';
  const adv = 'EIFO';
  const text = s && s.status === 'noted' ? t('Bemærkningen trækkes tilbage, og punktet står igen som manglende.')
    : s && s.status === 'delegated' ? t('Linket til hjælperen lukkes, og punktet står igen som manglende.')
    : csFill(t('Det, I har sendt, trækkes tilbage, og punktet står igen som manglende. {navn} kan se det i sagens historik.'), { navn: adv });
  return CW.confirm({ title: csFill(t('Fortryd {punkt}?'), { punkt: label }), text, confirmLabel: t('Fortryd'), danger: true })
    .then(r => {
      if (!r.ok) return false;
      CW.resetItem(itemId, 'kunde');
      CW.toast(csFill(t('{punkt} står igen som manglende'), { punkt: label }), { tone: 'info' });
      return true;
    });
}

/* ── Salg fordelt på lande: spørgeskema, der starter tomt, plus rapport ──── */

const CS_COUNTRIES = [
  { c: "DK", n: "Danmark" }, { c: "SE", n: "Sverige" }, { c: "NO", n: "Norge" },
  { c: "FI", n: "Finland" }, { c: "DE", n: "Tyskland" }, { c: "NL", n: "Holland" },
  { c: "FR", n: "Frankrig" }, { c: "GB", n: "Storbritannien" }, { c: "US", n: "USA" },
  { c: "ES", n: "Spanien" }, { c: "IT", n: "Italien" }, { c: "PL", n: "Polen" },
  { c: "BE", n: "Belgien" }, { c: "AT", n: "Østrig" }, { c: "CH", n: "Schweiz" },
  { c: "PT", n: "Portugal" }, { c: "CZ", n: "Tjekkiet" }, { c: "HU", n: "Ungarn" },
  { c: "RO", n: "Rumænien" }, { c: "IE", n: "Irland" }, { c: "CA", n: "Canada" },
  { c: "AU", n: "Australien" }, { c: "JP", n: "Japan" }, { c: "CN", n: "Kina" },
  { c: "IN", n: "Indien" }, { c: "BR", n: "Brasilien" }, { c: "MX", n: "Mexico" },
  { c: "ZA", n: "Sydafrika" }, { c: "AE", n: "UAE" }, { c: "SG", n: "Singapore" },
  { c: "KR", n: "Sydkorea" }, { c: "TR", n: "Tyrkiet" }, { c: "SA", n: "Saudi-Arabien" },
  { c: "NZ", n: "New Zealand" }, { c: "GR", n: "Grækenland" }, { c: "SK", n: "Slovakiet" },
  { c: "HR", n: "Kroatien" }, { c: "RS", n: "Serbien" }, { c: "UA", n: "Ukraine" },
  { c: "EE", n: "Estland" }, { c: "LV", n: "Letland" }, { c: "LT", n: "Litauen" },
];

// Andre navne, kunder skriver (CF3). Små bogstaver.
const CS_COUNTRY_ALIASES = {
  US: ['usa', 'us', 'united states', 'united states of america', 'amerika', 'america', 'forenede stater'],
  GB: ['uk', 'england', 'great britain', 'britain', 'united kingdom', 'storbritannien', 'skotland', 'scotland'],
  NL: ['holland', 'netherlands', 'the netherlands', 'nederlandene'],
  DE: ['germany', 'deutschland'], SE: ['sweden'], NO: ['norway'], FI: ['finland'], FR: ['france'], ES: ['spain'], IT: ['italy'], PL: ['poland'], CN: ['china'], JP: ['japan'],
};

/** Svarene som kort tekst: "Danmark 35 %, Tyskland 30 %" */
function csAnswersText(s) {
  const rows = s && s.answers && s.answers.countries;
  if (!rows || !rows.length) return '';
  return rows.map(r => t(r.name) + ' ' + csPct(r.pct) + ' %').join(', ');
}

const CS_TRADE_ACCEPT = '.pdf,.xlsx,.xls,.csv';

/* ── Samtalen mellem kunde og rådgiver ───────────────────────────────────── */

// Emnet på en besked uden for punkterne gemmes på dansk (f.eks. "Årsrapport 2024") og oversættes, når det vises
function csAboutLabel(about) {
  if (!about) return '';
  const m = /^Årsrapport (\d{4})$/.exec(about);
  return m ? t('Årsrapport') + ' ' + m[1] : t(about);
}

/* ── Tidslinjen ──────────────────────────────────────────────────────────── */

// Hvornår er sagen oprettet? Faktaarket (indholdsagenten) har datoen, når den findes.
function csCaseOpened() {
  const f = window.CASE_FACTS || {};
  const kd = (f.keyDates || []).find(d => d && /ansøgning|oprettet/i.test(d.text || ''));
  return kd && kd.date ? kd.date : null;
}

/**
 * Tidslinjen følger sagens fase (CW.stage(), CW.caseState(), CW.progress()):
 * - Materialeindsamling er afsluttet, når alle påkrævede punkter er godkendt, når
 *   sagen er klar, eller når den er indstillet.
 * - Kreditanalyse er i gang derefter og afsluttet, når sagen er indstillet.
 * - Kreditindstilling er "hos kreditkomitéen", når sagen er indstillet.
 * Forventede datoer regnes af et anker, der kun kan flytte sig fremad (fristen eller
 * seneste levering), aldrig af godkendelser, indstilling eller "i dag". Forventet
 * afgørelse bliver derfor aldrig tidligere, end kunden allerede har set.
 */
function csTimeline(prog, req, draft, cs) {
  const stage = CW.stage();
  const requested = CW.requestedItems();
  const states = CW.items();
  let lastApproval = null, lastDelivery = null;
  requested.forEach(it => {
    const s = states[it.id];
    if (!s) return;
    if (s.status === 'approved' && s.reviewedAt && (!lastApproval || s.reviewedAt > lastApproval)) lastApproval = s.reviewedAt;
    if (['received', 'noted', 'approved'].includes(s.status) && s.at && (!lastDelivery || s.at > lastDelivery)) lastDelivery = s.at;
  });
  const deadline = csDay((req && req.deadline) || (!req && draft && draft.deadline) || null);

  let anchor = deadline;
  const d = csDay(lastDelivery);
  if (d && (!anchor || d > anchor)) anchor = d;
  if (!anchor && req && req.sentAt) anchor = csAddWorkdays(csDay(req.sentAt), 10);
  const submitted = !!cs.submittedAt;
  const declined = stage === 'declined';
  const materialDone = submitted || prog.requiredApproved || stage === 'ready' || stage === 'ready-skip';
  let expInd = anchor ? csAddWorkdays(anchor, 5) : null;
  let expAfg = anchor ? csAddWorkdays(anchor, 15) : null;
  // Sagens egen frist (ikke kundens svarfrist) er loftet: kunden får ikke datoer efter den.
  // Afgørelsen forventes senest på fristen, indstillingen 3 hverdage før (dog ikke før svarfristen).
  const caseDl = csDay((window.DATA && DATA.COMPANY && DATA.COMPANY.deadlineISO) || null);
  if (caseDl && (!submitted || csDay(cs.submittedAt) <= caseDl)) {
    expAfg = caseDl;
    let ind = csAddWorkdays(caseDl, -3);
    if (anchor && ind < anchor) ind = anchor < caseDl ? anchor : caseDl;
    expInd = ind;
  } else if (submitted) { const s10 = csAddWorkdays(csDay(cs.submittedAt), 10); if (!expAfg || s10 > expAfg) expAfg = s10; }
  const opened = csCaseOpened();
  const L = { materiale: t('Materialeindsamling'), analyse: t('Kreditanalyse'), indstilling: t('Kreditindstilling'), afgorelse: t('Afgørelse') };

  const material = materialDone
    ? { k: 'materiale', label: L.materiale, sub: lastApproval && prog.requiredApproved ? csFill(t('Godkendt {dato}'), { dato: CW.fmtDate(lastApproval) }) : t('Afsluttet'), state: 'done' }
    : !req
      ? { k: 'materiale', label: L.materiale, sub: t('Ikke startet'), state: 'upcoming' }
      : prog.requiredMissing === 0
        ? { k: 'materiale', label: L.materiale, sub: t('Modtaget, afventer gennemgang'), state: 'active' }
        : { k: 'materiale', label: L.materiale, sub: deadline ? csFill(t('Frist {dato}'), { dato: CW.fmtDate(deadline) }) : t('I gang'), state: 'active' };
  return [
    { k: 'oprettet', label: t('Sag oprettet'), sub: opened ? CW.fmtDate(opened) : t('Ansøgningen er modtaget'), state: 'done' },
    material,
    submitted
      ? { k: 'analyse', label: L.analyse, sub: t('Afsluttet'), state: 'done' }
      : materialDone
        ? { k: 'analyse', label: L.analyse, sub: t('I gang'), state: 'active' }
        : { k: 'analyse', label: L.analyse, sub: t('Når materialet er godkendt'), state: 'upcoming' },
    submitted
      ? { k: 'indstilling', label: L.indstilling, sub: csFill(t('Hos kreditkomitéen siden {dato}'), { dato: CW.fmtDate(cs.submittedAt) }), state: 'active' }
      : { k: 'indstilling', label: L.indstilling, sub: expInd ? csFill(t('Forventet {dato}'), { dato: CW.fmtDate(expInd) }) : t('Når materialet er modtaget'), state: 'upcoming' },
    declined
      ? { k: 'afgorelse', label: L.afgorelse, sub: t('Sagen er afsluttet'), state: 'done' }
      : { k: 'afgorelse', label: L.afgorelse, sub: expAfg ? csFill(t('Forventet svar senest {dato}'), { dato: CW.fmtDate(expAfg) }) : t('Når materialet er modtaget'), state: 'upcoming', date: expAfg || null },
  ];
}

// Modul-eksport til Vue-komponenterne (src/views/customer og portalens skærme)
export {
  CS_ADVISOR_FALLBACK, CS_MAX_BYTES, csAdvisor, csFirst, csFill, csInitials, csDay, csAddWorkdays, csPct,
  csLastMsg, csUnreadForCustomer, csCustomerName, csSourceText,
  CS_ACCEPT, csAllowed, csAcceptFiles,
  CS_DRAFT_KEY, csDrafts, csDraft, csSaveDraft, csClearDraft, csStageFiles, csHHMM, csShortDate,
  csOpenFile, csRemoveOwnFile, csCanUndo, csConfirmUndo,
  CS_COUNTRIES, CS_COUNTRY_ALIASES, csAnswersText, CS_TRADE_ACCEPT,
  csAboutLabel, csCaseOpened, csTimeline,
};
