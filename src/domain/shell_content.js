// Klokken (notifikationer): hvilke hændelser fra kunden der er nye, og hvor de fører hen.
// Flyttet uændret fra shell.jsx ved migrationen; skærmdelen er
// src/components/shell/NotificationBell.vue.

/* ── Klokken: hændelser fra kunden ─────────────────────────────────────────
   CW.notifications('rådgiver') er det kunden har gjort, som rådgiveren ikke
   har set: leveringer, spørgsmål, Indsend, samtykke. CW.markSeen markerer dem
   som set. Kun Nordhavn har levende hændelser i demoen. */
const BELL_TARGET = {
  received: 'ws-outstanding', noted: 'ws-outstanding', delegated: 'ws-outstanding', reset: 'ws-outstanding',
  'customer-submitted': 'ws-outstanding', consent: 'ws-outstanding', 'consent-revoked': 'ws-outstanding',
  question: 'ws-dialog-title', reply: 'ws-dialog-title',
};
// Kun den relative tid ("for 3 timer siden"); ældre end i dag kun datoen
// ("28. sep."). Klokkeslættet står i title.
function bellWhen(iso) {
  const rel = CW.fmtAgo(iso);
  return /\d:\d\d/.test(rel) ? DATA.fmt.shortDate(iso) : rel;
}

/* Har rådgiveren allerede handlet på hændelsen? Så er den ikke længere ny,
   selv om klokken ikke er åbnet: et leveret punkt er godkendt eller afvist,
   et spørgsmål er besvaret, og indsendt materiale er gennemgået. */
function bellHandled(e, log) {
  const i = log.findIndex(x => x.id === e.id);
  const later = log.slice(i + 1).filter(x => x.who === 'rådgiver');
  if (e.type === 'question' || e.type === 'reply') return later.some(x => x.type === 'reply' || x.type === 'question');
  const decided = (id) => later.some(x => x.itemId === id && (x.type === 'approved' || x.type === 'rejected' || x.type === 'received'));
  if (e.type === 'customer-submitted') return later.some(x => x.type === 'approved' || x.type === 'rejected') && CW.progress().toReview === 0;
  const ids = e.itemId ? [e.itemId] : (e.data && Array.isArray(e.data.items) ? e.data.items : []);
  return ids.length > 0 && ids.every(decided);
}

// Hjælpen: sagens faser, frister og knapperne (til oplæring). Flyttet uændret fra shell.jsx.
/* ── Hjælp: sagens faser og hvad knapperne gør (til oplæring) ───────────── */
const HELP_STAGES = [
  ['review', 'Du gennemgår de offentlige data (CVR og årsrapporter) og beslutter, hvad kunden skal sende.'],
  ['material', 'Du vælger punkterne i anmodningen. Kunden ser intet, før du sender.'],
  ['awaiting', 'Kunden uploader i sin portal. Klokken giver besked, når der sker noget.'],
  ['toReview', 'Du godkender hvert leveret punkt eller stiller et spørgsmål til materialet. Et punkt, du stiller et spørgsmål til, går tilbage til kunden med din note.'],
  ['memo', 'Materialet er godkendt. Memoets afsnit skrives og gennemgås.'],
  ['ready', 'Klarhedstjekket er grønt, og sagen kan indstilles.'],
  ['submitted', 'Memoet er låst som en version og ligger hos kreditkomitéen. Skal noget ændres, trækkes indstillingen tilbage med en årsag.'],
  ['decided', 'Komitéen har truffet afgørelse. Afslag kan gives i alle faser før indstilling og kræver en årsag.'],
];
// Frister og SLA (til oplæring af nye rådgivere)
const HELP_DEADLINES = [
  ['Sagsfrist', 'Sagens egen frist for en afgørelse. Den står i sagshovedet og på Dataanmodninger, og overskredne sager står øverst i Mine opgaver.'],
  ['Kundens svarfrist', 'Fristen i anmodningen til kunden. Den står i mailen, i kundens portal og på Dataanmodninger.'],
  ['SLA', 'En sag må højst ligge 10 hverdage i samme fase. Dage i fase står i sagshovedet: fra 8 hverdage er de gule (tæt på SLA), og over 10 hverdage står der "over SLA" med rødt. Kladder, indstillede og afgjorte sager tæller ikke.'],
  ['Sidder fast', 'Anmodningen er sendt, men kunden har ikke leveret noget i 3 hverdage. Send en påmindelse fra Dataanmodninger.'],
  ['Overskredet', 'Sagsfristen eller kundens svarfrist er passeret. Sagen står øverst under Mest presserende.'],
];
const HELP_BUTTONS = [
  ['Anmod om materiale', 'Åbner materialevalget. Når punkterne er valgt, sender samme knap anmodningen til kunden med frist og et link til portalen.'],
  ['Send opdatering', 'Sender ændringer til en anmodning, som kunden allerede har fået.'],
  ['Påmind', 'Sender en påmindelse om de punkter, der mangler. Den står i sagens historik og på Dataanmodninger. Er kunden allerede påmindet i dag, spørger demoen først.'],
  ['Godkend og Stil spørgsmål', 'Tager stilling til et leveret punkt. Stil spørgsmål kræver en note til kunden.'],
  ['Kundeside', 'Viser portalen, som kunden ser den.'],
  ['Indstil til kreditkomité', 'Kører klarhedstjekket, låser memoet og gemmer den indstillede version.'],
  ['Flyt sagen', 'Menuen (…) ved sagen i Mine opgaver giver sagen til en anden rådgiver.'],
  ['Nulstil demo', 'Nederst i menuen til venstre og i menuen under dit navn. Sletter alt, demoen har gemt, og starter forfra.'],
];

// Piloten (CW_MEMO_MODE 'copilot'): memoet skrives i Word med Copilot, og der
// indstilles ikke i Crediwire. Faser og knapper uden indstilling.
function helpStages() {
  if (window.CW_MEMO_MODE === 'builtin') return HELP_STAGES;
  return HELP_STAGES.filter(([k]) => k !== 'ready' && k !== 'submitted')
    .map(([k, txt]) => k === 'memo' ? [k, 'Materialet er godkendt. Du henter sagens dokumenter under Credit memo og skriver memoet i Word med Copilot.']
      : k === 'decided' ? [k, 'Komitéen har truffet afgørelse. Afslag kan gives i alle faser og kræver en årsag.'] : [k, txt]);
}
function helpButtons() {
  if (window.CW_MEMO_MODE === 'builtin') return HELP_BUTTONS;
  return HELP_BUTTONS.map(([b, txt]) => b === 'Indstil til kreditkomité'
    ? ['Hent alle dokumenter', 'Under Credit memo: henter sagens materiale, kundens filer, de offentlige data og Crediwires egne eksporter, så du kan fortsætte i Copilot.']
    : [b, txt]);
}

export { BELL_TARGET, bellWhen, bellHandled, HELP_STAGES, HELP_DEADLINES, HELP_BUTTONS, helpStages, helpButtons };
