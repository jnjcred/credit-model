// Mock data - Crediwire credit tool
//
// DATA.COMPANY er den ene sandhed om Nordhavn-sagens stamdata. Kilden er
// sagens egne dokumenter i src/case_documents.js: Aarsrapport_2025.pdf
// (s. 2 selskabsoplysninger, s. 4 ledelsesberetning, note 2 ansatte) og
// Ejerbog_2026.pdf (ejere, bestyrelse, direktion). Andre filer læser herfra
// i stedet for at skrive navn, adresse, CVR osv. selv.
//
// Datoer i demoen regnes fra i dag, så frister ikke står som overskredne
// måneder efter, at prototypen blev lavet.

// Små hjælpere til datoer og sprog. Ligger i en IIFE, så navnene ikke
// støder sammen med topniveau-konstanter i .jsx-filerne.
const DATA_UTIL = (function () {
  const pad = (n) => String(n).padStart(2, '0');
  const isEn = () => window.CW_LANG === 'en';
  // Tekst på det aktive sprog. Læses først ved visning, så sprogvalget er sat.
  const L = (da, en) => (isEn() ? en : da);
  const tt = (s) => (window.t ? window.t(s) : s);
  const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const isoDay = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  /** yyyy-mm-dd, `n` kalenderdage fra i dag (negativ = i fortiden) */
  const day = (n) => { const d = midnight(new Date()); d.setDate(d.getDate() + n); return isoDay(d); };
  /** Som day(n), men en frist falder aldrig i en weekend: i fortiden flyttes
      den til fredag før, i fremtiden til mandag efter */
  const wday = (n) => {
    const d = midnight(new Date()); d.setDate(d.getDate() + n);
    const w = d.getDay();
    if (w === 6) d.setDate(d.getDate() + (n < 0 ? -1 : 2));
    else if (w === 0) d.setDate(d.getDate() + (n < 0 ? -2 : 1));
    return isoDay(d);
  };
  /** ISO-tidsstempel `h` timer før nu */
  const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  /** ISO-tidsstempel `n` dage før nu, kl. hh:mm. Rådgivere og kunder arbejder
      på hverdage: lørdag flyttes til fredag og søndag til mandag (dog aldrig
      ud i fremtiden), så ingen påmindelse eller upload står på en weekend. */
  const daysAgoAt = (n, hh, mm) => {
    const d = new Date(); d.setDate(d.getDate() - n); d.setHours(hh, mm || 0, 0, 0);
    if (d.getDay() === 6) d.setDate(d.getDate() - 1);
    else if (d.getDay() === 0) { d.setDate(d.getDate() + 1); if (d > new Date()) d.setDate(d.getDate() - 3); }
    return d.toISOString();
  };
  /** Hele kalenderdage fra i dag til `iso` (negativ = overskredet) */
  const daysUntil = (iso) => {
    if (!iso) return null;
    const d = midnight(iso.length === 10 ? iso + 'T00:00:00' : iso);
    return Math.round((d - midnight(new Date())) / 864e5);
  };
  /** Hverdage mellem `iso` og nu */
  const workdaysSince = (iso) => {
    if (!iso) return null;
    const d = midnight(iso); const now = midnight(new Date()); let n = 0;
    while (d < now) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) n++; }
    return n;
  };
  const MONTHS_DA_S = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];
  const MONTHS_EN_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /** "06-10-2026" / "6 Oct" (på engelsk med år, hvis det ikke er i år) */
  const shortDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return '';
    const y = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '';
    const p2 = (n) => String(n).padStart(2, '0');
    return isEn() ? d.getDate() + ' ' + MONTHS_EN_S[d.getMonth()] + y : p2(d.getDate()) + '-' + p2(d.getMonth() + 1) + '-' + d.getFullYear();
  };
  /** "06-10-2026" / "6 Oct 2026" */
  const longDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    const p2 = (n) => String(n).padStart(2, '0');
    return isEn() ? d.getDate() + ' ' + MONTHS_EN_S[d.getMonth()] + ' ' + d.getFullYear() : p2(d.getDate()) + '-' + p2(d.getMonth() + 1) + '-' + d.getFullYear();
  };
  /** Frist set fra i dag: { text, date, days, overdue, soon } */
  const deadline = (iso) => {
    if (!iso) return { text: L('Ingen frist', 'No deadline'), date: '', days: null, overdue: false, soon: false };
    const n = daysUntil(iso);
    let rel;
    if (n === 0) rel = L('i dag', 'today');
    else if (n === 1) rel = L('i morgen', 'tomorrow');
    else if (n > 1) rel = L('om ' + n + ' dage', 'in ' + n + ' days');
    else if (n === -1) rel = L('overskredet 1 dag', '1 day overdue');
    else rel = L('overskredet ' + (-n) + ' dage', (-n) + ' days overdue');
    return { text: rel, date: shortDate(iso), days: n, overdue: n < 0, soon: n >= 0 && n <= 2 };
  };
  /** Relativ aktivitetstid: "for 17 min. siden", "for 2 timer siden", "i går", "for 4 dage siden" */
  const ago = (iso) => {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.floor(ms / 3600e3);
    const n = -daysUntil(iso);
    const min = Math.floor(ms / 60000);
    if (min < 1) return L('lige nu', 'just now');
    if (h < 1) return L('for ' + min + ' min. siden', min + ' min ago');
    if (n === 0) return h === 1 ? L('for 1 time siden', '1 hour ago') : L('for ' + h + ' timer siden', h + ' hours ago');
    if (n === 1) return L('i går', 'yesterday');
    return L('for ' + n + ' dage siden', n + ' days ago');
  };
  /** Beløb i kroner som "DKK 4,5 mio." / "DKK 4.5m" */
  const amount = (kr) => {
    if (kr == null) return '';
    const mio = kr / 1e6;
    const s = mio.toLocaleString(isEn() ? 'en-GB' : 'da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return isEn() ? 'DKK ' + s + 'm' : 'DKK ' + s + ' mio.';
  };
  /** ISO-tidsstempel `n` hverdage før i dag, kl. hh:mm (til "dage i fase") */
  const workdaysAgo = (n, hh, mm) => {
    const d = new Date(); let k = 0;
    while (k < n) { d.setDate(d.getDate() - 1); const w = d.getDay(); if (w !== 0 && w !== 6) k++; }
    d.setHours(hh == null ? 9 : hh, mm || 0, 0, 0);
    return d.toISOString();
  };
  /** Tal i sprogets format: 1.234,5 / 1,234.5 */
  const num = (v, decimals) => {
    if (v == null || isNaN(v)) return '';
    const dec = decimals == null ? 0 : decimals;
    return Number(v).toLocaleString(isEn() ? 'en-GB' : 'da-DK', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  /** Beløb i hele mio. med én decimal uden valuta: "4,5" / "4.5" */
  const mio = (kr) => (kr == null ? '' : num(kr / 1e6, 1));
  return { L, tt, day, wday, hoursAgo, daysAgoAt, daysUntil, workdaysSince, workdaysAgo, shortDate, longDate, deadline, ago, amount, isoDay, num, mio, isEn };
})();

// Den der er logget ind i demoen
const ME = "Mette L.";
// Rådgiverne i teamet. `short` er navnet på sagskort og i vælgere, og det er
// det navn CW.setOwner gemmer. Bruges til arbejdsbyrde, filter og omfordeling.
const TEAM = [
  { short: "Mette L.", name: "Mette Larsen", initials: "ML" },
  { short: "Jonas K.", name: "Jonas Kragh", initials: "JK" },
  { short: "Sara F.", name: "Sara Friis", initials: "SF" },
];
// Rådgiveren på sagen (kontaktoplysninger til kunden). Læses af workspace, kundeside og portal.
const ADVISOR = {
  name: "Mette Larsen", initials: "ML", title: "Kreditrådgiver", org: "EIFO",
  phone: "+45 35 29 86 42", email: "mette.larsen@eifo.dk",
};

// Nordhavns facilitet efter CASE_FACTS.facility, med reserveværdier
function caseFacility() {
  const f = (window.CASE_FACTS && window.CASE_FACTS.facility) || {};
  return {
    eifoAmount: f.eifoAmount || 3600000,
    facilityAmount: f.facilityAmount || 4500000,
    eifoShare: f.eifoShare || 0.8,
    start: f.start || "2026-11-01",
    end: f.end || "2029-04-30",
    tenorMonths: f.tenorMonths || 30,
  };
}

const COMPANY = {
  name: "Nordhavn Composite A/S",
  short: "NC",
  cvr: "38427156",
  get founded() { return DATA_UTIL.L("3. februar 2014", "3 February 2014"); },
  foundedISO: "2014-02-03",
  get legalForm() { return DATA_UTIL.L("Aktieselskab (A/S)", "Public limited company (A/S)"); },
  // Branche efter CVR (DB07), og hvad selskabet faktisk laver (ledelsesberetningen)
  get industry() { return DATA_UTIL.L("Fremstilling af andre plastprodukter (222900)", "Manufacture of other plastic products (222900)"); },
  get activity() { return DATA_UTIL.L("Kompositkomponenter til vindindustrien", "Composite components for the wind industry"); },
  employees: 84,              // gennemsnitligt antal fuldtidsansatte 2025, årsrapportens note 2
  hq: "Frederikshavn, DK",
  address: "Havnegade 42",
  postal: "9900 Frederikshavn",
  get country() { return DATA_UTIL.L("Danmark", "Denmark"); },
  municipality: "Frederikshavn Kommune",
  secondarySite: "Grønlandsvej 8, 9300 Sæby",
  website: "nordhavncomposite.dk",
  email: "info@nordhavncomposite.dk",
  phone: "+45 98 42 71 56",
  trustpilotDomain: "nordhavncomposite.dk",
  auditor: "Nordjysk Revision P/S",
  bank: "Nordjyske Bank A/S",
  ceo: "Anders Christensen",
  // Reel ejer efter ejerbogen: Anders Christensen via Anders Holding ApS (50,7 %)
  realOwner: "Anders Christensen",
  // Kundens kontaktperson til materialeanmodningen (økonomichef, jf. periodetallenes noter)
  contact: { name: "Susanne Pedersen", get role() { return DATA_UTIL.L("Økonomichef", "Finance manager"); }, email: "sp@nordhavncomposite.dk" },

  caseNr: "2026-0184",
  get caseType() { return DATA_UTIL.L("Eksportkaution", "Export guarantee"); },
  // Faciliteten læses af sagens faktaark (CASE_FACTS.facility, indlæses efter
  // data.js), så beløb og løbetid ikke kan komme ud af takt med memoet:
  // revolverende eksportfacilitet på 4,5 mio. i Nordjyske Bank, EIFO-kaution
  // 80 % = 3,6 mio., 30 mdr. (1.11.2026-30.4.2029), pari passu. Tallene her er
  // kun reserve, hvis faktaarket mangler et felt.
  // Beløbet på sagen er EIFOs kaution, ikke bankens facilitet.
  get amountValue() { return caseFacility().eifoAmount; },
  get guaranteeValue() { return caseFacility().eifoAmount; },
  get facilityValue() { return caseFacility().facilityAmount; },
  get amount() { return DATA_UTIL.amount(caseFacility().eifoAmount); },
  get amountNote() {
    const f = caseFacility();
    const pct = Math.round(f.eifoShare * 100);
    return DATA_UTIL.L(pct + " % af bankens facilitet på " + DATA_UTIL.num(f.facilityAmount / 1e6, 1) + " mio.", pct + "% of the bank's DKK " + DATA_UTIL.num(f.facilityAmount / 1e6, 1) + "m facility");
  },
  get guaranteePeriod() { const f = caseFacility(); return { from: f.start, to: f.end }; },
  // Sagens tilstand følger CW (fase, indstilling), så pillen i sagshovedet er den samme som i listen
  get status() { return caseStatusKey(1); },
  responsible: ME,
  responsibleFull: "Mette Larsen",
  deadlineISO: DATA_UTIL.wday(9),
  get deadline() { return DATA_UTIL.longDate(this.deadlineISO); },
  get nextStep() { return caseNextStep(1); },
  masterDataSource: "CVR-registret",
  // Stamdata er hentet i CVR, da de offentlige data blev indsamlet (sagens tidslinje)
  get masterDataUpdated() { return DATA_UTIL.longDate(caseTimeline(1).publicDataAt || DATA_UTIL.day(-1)); },
  cvrUrl: "https://datacvr.virk.dk/enhed/virksomhed/38427156",
};

/* ── Sager ────────────────────────────────────────────────────────────────
   Én sandhed pr. sag. statusKey er sagens fase for de sager, der ikke har
   levende data (se STATUS nedenfor). Sag 1 (Nordhavn, 2026-0184) følger den
   levende tilstand i window.CW; kun CW.isLiveCase(id) er levende. Sag 9
   (Nordhavn, 2026-0267) er en separat sag med sin egen faste status.
   amount er i kroner, deadline er sagsfristen (yyyy-mm-dd), stageSince er
   hvornår sagen kom i sin nuværende fase (til "dage i fase" og SLA).
   Nordhavns seneste aktivitet læses af sagens egen historik (caseLastActivity).
   Brug DATA.CASES (getter): den tager omfordelinger (CW.owners) og sager
   fra Ny sag-guiden (CW.demoCases) med. */
const BASE_CASES = [
  { id: 1, name: "Nordhavn Composite A/S", cvr: "38427156", caseNr: "2026-0184", type: "Eksportkaution", amount: 3600000, amountNote: "80 % af bankens facilitet på 4,5 mio.", statusKey: "review", risk: "med", responsible: ME, lastActivityAt: null, stageSince: DATA_UTIL.workdaysAgo(2, 9, 10), deadline: DATA_UTIL.wday(9), pinned: true, urgent: true, next: "Vurdér offentlige data og vælg materiale" },
  { id: 2, name: "Vendia Bio ApS", cvr: "41278319", caseNr: "2026-0201", type: "Vækstlån", amount: 1800000, statusKey: "awaiting", risk: "low", responsible: "Jonas K.", lastActivityAt: DATA_UTIL.daysAgoAt(6, 14, 22), stageSince: DATA_UTIL.workdaysAgo(7, 10, 12), deadline: DATA_UTIL.wday(-2), urgent: true, next: "Påmind kunden (6 punkter mangler)" },
  { id: 3, name: "Marstal Maritime ApS", cvr: "39552048", caseNr: "2026-0212", type: "Driftskredit", amount: 3200000, statusKey: "toReview", risk: "med", responsible: ME, lastActivityAt: DATA_UTIL.hoursAgo(4), stageSince: DATA_UTIL.workdaysAgo(0, 8, 30), deadline: DATA_UTIL.wday(2), urgent: false, next: "Gennemgå modtaget materiale (9 punkter)", collect: { total: 9, approved: 0, review: 9, sinceDays: 1, freshF: 2 } },
  { id: 4, name: "Skagen Klima ApS", cvr: "36901472", caseNr: "2026-0095", type: "Eksportkaution", amount: 900000, statusKey: "ready", risk: "low", responsible: "Sara F.", lastActivityAt: DATA_UTIL.daysAgoAt(2, 10, 5), stageSince: DATA_UTIL.workdaysAgo(2, 10, 5), deadline: DATA_UTIL.wday(1), urgent: false, next: "Indstil til kreditkomitéen" },
  { id: 5, name: "Lyngbæk Industrier ApS", cvr: "33186405", caseNr: "2026-0178", type: "Investeringslån", amount: 7200000, statusKey: "toReview", risk: "high", responsible: "Jonas K.", lastActivityAt: DATA_UTIL.hoursAgo(3), stageSince: DATA_UTIL.workdaysAgo(4, 11, 30), deadline: DATA_UTIL.wday(-1), urgent: true, next: "Gennemgå låneaftalerne og afklar negativ egenkapital (note 8)" },
  { id: 6, name: "Aalborg Hydrogen A/S", cvr: "40739126", caseNr: "2026-0233", type: "Eksportkaution", amount: 12000000, statusKey: "draft", risk: "low", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(3, 15, 40), stageSince: DATA_UTIL.workdaysAgo(3, 15, 40), deadline: null, urgent: false, next: "Udfyld sagen og vælg materiale", collect: { total: 12, approved: 0, sinceDays: 3 } },
  { id: 7, name: "Kløver Tekstil ApS", cvr: "35024783", caseNr: "2025-1147", type: "Driftskredit", amount: 500000, statusKey: "decided", decision: "Bevilget", risk: "low", responsible: "Sara F.", lastActivityAt: DATA_UTIL.daysAgoAt(7, 9, 30), stageSince: DATA_UTIL.workdaysAgo(5, 9, 30), deadline: null, archived: true, urgent: false, next: "Afgjort: bevilget" },
  { id: 8, name: "Refshaleøen Robotics ApS", cvr: "42160857", caseNr: "2026-0221", type: "Vækstlån", amount: 2100000, statusKey: "awaiting", risk: "med", responsible: "Jonas K.", lastActivityAt: DATA_UTIL.daysAgoAt(7, 11, 12), stageSince: DATA_UTIL.workdaysAgo(9, 9, 40), deadline: DATA_UTIL.wday(10), urgent: false, next: "Påmind kunden (5 punkter mangler)" },
  { id: 9, name: "Nordhavn Composite A/S", cvr: "38427156", caseNr: "2026-0267", type: "Investeringslån", amount: 2800000, statusKey: "draft", risk: "low", responsible: "Jonas K.", lastActivityAt: DATA_UTIL.hoursAgo(5), stageSince: DATA_UTIL.workdaysAgo(0, 9, 0), deadline: null, urgent: false, next: "Ikke startet" },
  { id: 10, name: "Skov & Bertelsen Tømrer ApS", cvr: "37814520", caseNr: "2026-0159", type: "Driftskredit", amount: 1500000, statusKey: "submitted", risk: "low", responsible: "Sara F.", lastActivityAt: DATA_UTIL.daysAgoAt(3, 13, 15), stageSince: DATA_UTIL.workdaysAgo(3, 13, 15), deadline: DATA_UTIL.wday(7), urgent: false, next: "Afventer kreditkomitéens afgørelse" },
  { id: 11, name: "Ballerup Autoservice A/S", cvr: "31209564", caseNr: "2026-0188", type: "Driftskredit", amount: 1100000, statusKey: "memo", risk: "med", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(1, 16, 5), stageSince: DATA_UTIL.workdaysAgo(12, 10, 0), deadline: DATA_UTIL.wday(5), urgent: false, next: "Skriv memoet færdigt (3 afsnit mangler)", collect: { total: 6, approved: 6, q: 1, sinceDays: 0, freshQ: 1 } },
  // Mettes øvrige sager fra designet "Mine opgaver v8" (Claude Design, 7. oktober).
  // collect = indhentningen: total (anmodede punkter), approved, review (modtaget, ikke
  // gennemgået), q (kundens spørgsmål), aq (dit spørgsmål på et punkt, venter på kunden),
  // sinceDays (ventetid), lastRemindDays/reminders (påmindelser), freshF/freshQ (nyt siden sidst).
  { id: 12, name: "Skagen Fiskeeksport ApS", cvr: "36620118", caseNr: "2026-0171", type: "Eksportkaution", amount: 2400000, statusKey: "awaiting", risk: "med", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(27, 10, 15), stageSince: DATA_UTIL.daysAgoAt(27, 10, 15), deadline: DATA_UTIL.wday(4), urgent: false, next: "Påmind kunden (8 punkter mangler)", collect: { total: 8, approved: 0, sinceDays: 27 } },
  { id: 13, name: "Vejle Træindustri A/S", cvr: "25510983", caseNr: "2026-0179", type: "Investeringslån", amount: 4100000, statusKey: "toReview", risk: "low", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(2, 9, 40), stageSince: DATA_UTIL.daysAgoAt(2, 9, 40), deadline: DATA_UTIL.wday(8), urgent: false, next: "Svar på kundens spørgsmål", collect: { total: 5, approved: 1, q: 1, sinceDays: 2, freshQ: 1 } },
  { id: 14, name: "Odense Robotics Solutions ApS", cvr: "40118826", caseNr: "2026-0203", type: "Vækstlån", amount: 2600000, statusKey: "toReview", risk: "med", responsible: ME, lastActivityAt: DATA_UTIL.hoursAgo(2), stageSince: DATA_UTIL.hoursAgo(2), deadline: DATA_UTIL.wday(6), urgent: false, next: "Gennemgå modtaget materiale (3 punkter)", collect: { total: 10, approved: 4, review: 3, sinceDays: 0, freshF: 3 } },
  { id: 15, name: "Aarhus Fødevarer A/S", cvr: "31774562", caseNr: "2026-0207", type: "Driftskredit", amount: 1900000, statusKey: "awaiting", risk: "low", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(3, 11, 0), stageSince: DATA_UTIL.daysAgoAt(4, 14, 30), deadline: DATA_UTIL.wday(9), urgent: false, next: "Afvent kunden (6 punkter mangler)", collect: { total: 6, approved: 0, sinceDays: 4, lastRemindDays: 3, reminders: 1 } },
  { id: 16, name: "Køge Emballage ApS", cvr: "37990214", caseNr: "2026-0195", type: "Driftskredit", amount: 800000, statusKey: "awaiting", risk: "low", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(10, 13, 20), stageSince: DATA_UTIL.daysAgoAt(10, 13, 20), deadline: DATA_UTIL.wday(5), urgent: false, next: "Afvent kundens svar på dit spørgsmål", collect: { total: 4, approved: 4, aq: 1, sinceDays: 10 } },
  { id: 17, name: "Thisted Vindteknik A/S", cvr: "34482019", caseNr: "2026-0166", type: "Eksportkaution", amount: 6500000, statusKey: "awaiting", risk: "med", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(9, 10, 0), stageSince: DATA_UTIL.daysAgoAt(31, 9, 30), deadline: DATA_UTIL.wday(3), urgent: false, next: "Påmind kunden (7 punkter mangler)", collect: { total: 12, approved: 5, aq: 1, sinceDays: 31, lastRemindDays: 9, reminders: 1 } },
  { id: 18, name: "Roskilde Medico ApS", cvr: "42200371", caseNr: "2026-0210", type: "Vækstlån", amount: 3000000, statusKey: "awaiting", risk: "low", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(2, 9, 15), stageSince: DATA_UTIL.daysAgoAt(8, 15, 0), deadline: DATA_UTIL.wday(10), urgent: false, next: "Afvent kunden (7 punkter mangler)", collect: { total: 7, approved: 0, sinceDays: 8, lastRemindDays: 2, reminders: 1 } },
  { id: 19, name: "Herning Tekstil A/S", cvr: "20837745", caseNr: "2026-0199", type: "Driftskredit", amount: 1400000, statusKey: "toReview", risk: "med", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(1, 15, 45), stageSince: DATA_UTIL.daysAgoAt(1, 15, 45), deadline: DATA_UTIL.wday(7), urgent: false, next: "Gennemgå modtaget materiale (3 punkter)", collect: { total: 6, approved: 3, review: 3, q: 2, sinceDays: 1, freshF: 2, freshQ: 2 } },
  { id: 20, name: "Svendborg Bådebyggeri ApS", cvr: "43318820", caseNr: "2026-0215", type: "Investeringslån", amount: 5200000, statusKey: "material", risk: "low", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(3, 10, 30), stageSince: DATA_UTIL.daysAgoAt(3, 10, 30), deadline: DATA_UTIL.wday(12), urgent: false, next: "Vælg materiale og send anmodningen", collect: { total: 10, approved: 0, sinceDays: 3 } },
  { id: 21, name: "Esbjerg Offshore Service A/S", cvr: "39027716", caseNr: "2026-0214", type: "Eksportkaution", amount: 9000000, statusKey: "material", risk: "med", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(1, 14, 0), stageSince: DATA_UTIL.daysAgoAt(1, 14, 0), deadline: DATA_UTIL.wday(14), urgent: false, next: "Vælg materiale og send anmodningen", collect: { total: 10, approved: 0, sinceDays: 1 } },
  { id: 22, name: "Fredericia Logistik A/S", cvr: "27716409", caseNr: "2026-0158", type: "Driftskredit", amount: 2200000, statusKey: "memo", risk: "low", responsible: ME, lastActivityAt: DATA_UTIL.daysAgoAt(6, 11, 30), stageSince: DATA_UTIL.daysAgoAt(6, 11, 30), deadline: DATA_UTIL.wday(6), urgent: false, next: "Skriv memoet", collect: { total: 8, approved: 8, sinceDays: 6 } },
];

/* ── Statusordforråd ───────────────────────────────────────────────────────
   Én nøgle og ét dansk ord pr. fase, brugt i piller, grupper, faner, filtre,
   sagshovedet og Dataanmodninger (grænseflade 1).
   tab: fanen i Mine opgaver (fanerne udelukker hinanden). Fanen følger, hvem
   der har bolden: rådgiveren (mine), kunden, komitéen, afgjort eller kladde.
   Alt med awaitingMe ligger i "Afventer mig", så fanen, overskriften og
   menuens tal altid er det samme tal.
   awaitingMe: næste skridt ligger hos rådgiveren (menuens tal).
   sla: fasen tæller mod SLA-grænsen (SLA_WORKDAYS hverdage). */
const STATUS = {
  review:    { label: "Vurdering",            tone: "ink",     tab: "mine",      order: 1,  awaitingMe: true,  sla: true },
  material:  { label: "Materialevalg",        tone: "ink",     tab: "mine",      order: 2,  awaitingMe: true,  sla: true },
  awaiting:  { label: "Afventer kunden",      tone: "warn",    tab: "waiting",   order: 3,  awaitingMe: false, sla: true },
  toReview:  { label: "Til gennemgang",       tone: "ink",     tab: "mine",      order: 4,  awaitingMe: true,  sla: true },
  memo:      { label: "Memo skrives",         tone: "ink",     tab: "mine",      order: 5,  awaitingMe: true,  sla: true },
  ready:     { label: "Klar til indstilling", tone: "success", tab: "mine",      order: 6,  awaitingMe: true,  sla: true },
  submitted: { label: "Indstillet",           tone: "info",    tab: "committee", order: 7,  awaitingMe: false, sla: false },
  draft:     { label: "Kladde",               tone: "outline", tab: "draft",     order: 8,  awaitingMe: false, sla: false },
  declined:  { label: "Afslået",              tone: "danger",  tab: "done",      order: 9,  awaitingMe: false, sla: false, decided: true },
  decided:   { label: "Afgjort",              tone: "success", tab: "done",      order: 10, awaitingMe: false, sla: false, decided: true },
};
// Gamle statusnøgler (før runde 3), så ældre kald af statusPill stadig virker
const LEGACY_STATUS = {
  "Draft": "draft", "Needs review": "review", "Waiting for customer": "awaiting", "Data received": "toReview",
  "Credit memo ready": "ready", "Indstillet": "submitted", "Approved": "decided", "Rejected": "declined", "Declined": "declined",
};
function statusKeyOf(s) { return STATUS[s] ? s : (LEGACY_STATUS[s] || null); }

// SLA: en sag må højst ligge SLA_WORKDAYS hverdage i samme fase. Fra
// SLA_WARN_WORKDAYS hverdage er dage i fase markeret med gult, så der er tid
// til at handle, før grænsen er overskredet.
const SLA_WORKDAYS = 10;
const SLA_WARN_WORKDAYS = 8;

function isLive(id) { return !!(window.CW && window.CW.isLiveCase ? window.CW.isLiveCase(id) : Number(id) === 1); }
function idOf(x) { return x && typeof x === 'object' ? x.id : Number(x); }

/** Den anmodning, guiden har gemt på en demosag (ikke sendt), eller null.
    Tåler at feltet mangler (ældre demosager). */
function demoCaseRequest(d) {
  const r = d && d.request;
  if (!r || typeof r !== 'object') return null;
  const items = Array.isArray(r.items) ? r.items : [];
  return items.length ? Object.assign({}, r, { items }) : null;
}

// Sager fra Ny sag-guiden (CW.demoCases) vist som kladder. Har guiden gemt
// en anmodning, er næste skridt at sende den, og sagen står under
// Dataanmodninger som "Ikke sendt".
function demoCaseRows() {
  const CW = window.CW;
  if (!CW || !CW.demoCases) return [];
  return CW.demoCases().map((d, i) => {
    const req = demoCaseRequest(d);
    // Sendt fra sagen (CW.sendDemoCase i demoen): sagen afventer kunden fra afsendelsen
    const sentAt = req && (req.sent || req.sentAt) ? (req.sentAt || d.sentAt || d.createdAt || null) : null;
    return {
      id: d.id, demo: true, name: d.name || DATA_UTIL.tt('Ny sag'), cvr: d.cvr || '',
      caseNr: d.caseNr || ('2026-0' + (301 + i)), type: d.type || d.product || 'Kladde',
      amount: d.amount != null && !isNaN(Number(d.amount)) ? Number(d.amount) : null,
      // "80 % af bankens facilitet på …" på det aktive sprog (case_state), ellers guidens tekst
      amountNote: (CW.demoCaseAmountNote ? CW.demoCaseAmountNote(d) : d.amountNote) || null,
      statusKey: sentAt ? 'awaiting' : 'draft', risk: 'low', responsible: d.responsible || ME,
      lastActivityAt: sentAt || d.createdAt || null, stageSince: sentAt || d.createdAt || null,
      // Sagsfristen. Kundens svarfrist ligger i request.deadline og er ikke sagsfristen,
      // så en ny sag har normalt ingen sagsfrist endnu.
      deadline: d.deadline || null,
      urgent: false,
      next: sentAt ? 'Afvent kunden' : (CW.demoCaseNext ? CW.demoCaseNext(d) : (req ? 'Send anmodningen' : null)) || 'Udfyld sagen og vælg materiale',
      request: req,
    };
  });
}

/** Alle sager med aktuel ejer og status. Nye objekter hver gang; ret dem ikke. */
function allCases() {
  const owners = (window.CW && window.CW.owners) ? window.CW.owners() : {};
  return BASE_CASES.concat(demoCaseRows()).map(c => {
    const key = caseStatusKey(c);
    // Nordhavns beløb følger faktaarket (COMPANY læser CASE_FACTS.facility)
    // og seneste aktivitet følger sagens egen historik (ikke en fast "for 2 timer siden")
    const live = isLive(c.id) ? { amount: COMPANY.amountValue, amountNote: COMPANY.amountNote, lastActivityAt: caseLastActivity(c.id).at } : null;
    return Object.assign({}, c, live, { responsible: owners[c.id] || c.responsible, statusKey: key, status: key });
  });
}
function caseById(id) {
  const n = Number(id);
  return BASE_CASES.find(c => c.id === n) || demoCaseRows().find(c => c.id === n) || null;
}

/** Grænseflade 2: navnet på sagens ejer. Respekterer omfordelinger (CW.owners). */
function caseOwner(x) {
  const id = idOf(x);
  const o = (window.CW && window.CW.owners) ? window.CW.owners() : {};
  if (o[id]) return o[id];
  const c = caseById(id);
  return c ? c.responsible : ME;
}

/** Er memoet klar? Læser memo.jsx (window.CW_MEMO_STATUS), tåler at den mangler. */
function memoReady() {
  // Samme regel som sagshovedet (klarhedstjekket i workspace), så liste og sag siger det samme
  if (typeof window.CW_SUBMIT_READY === 'function') { try { return !!window.CW_SUBMIT_READY(); } catch (e) {} }
  if (typeof window.CW_MEMO_STATUS !== 'function') return false;
  let m = null;
  try { m = window.CW_MEMO_STATUS(); } catch (e) { return false; }
  if (!m) return false;
  return m.sectionsDone >= m.sectionsTotal && !m.unreviewedDrafts && !m.blanks && !m.blockingComments;
}

/**
 * Grænseflade 1: sagens statusnøgle. En af draft | review | material | awaiting |
 * toReview | memo | ready | submitted | declined | decided.
 * Nordhavn udledes af CW.stage(), CW.progress() og CW_MEMO_STATUS.
 */
function caseStatusKey(x) {
  const id = idOf(x);
  const CW = window.CW;
  if (isLive(id) && CW) {
    const cs = CW.caseState() || {};
    const stage = CW.stage ? CW.stage() : (cs.stage || 'review-public');
    if (cs.submittedAt) return 'submitted';
    if (stage === 'declined') return 'declined';
    if (stage === 'ready' || stage === 'ready-skip') return memoReady() ? 'ready' : 'memo';
    if (stage === 'awaiting-customer') {
      const p = CW.progress();
      if (p.toReview > 0) return 'toReview';
      if (p.allApproved) return memoReady() ? 'ready' : 'memo';
      return 'awaiting';
    }
    if (stage === 'material-selection') return 'material';
    return 'review';
  }
  const c = (x && typeof x === 'object' && x.statusKey) ? x : caseById(id);
  return c ? (statusKeyOf(c.statusKey || c.status) || 'draft') : 'draft';
}
// Ældre navn: returnerer nu også statusnøglen
function caseLiveStatus(c) { return c ? caseStatusKey(c) : null; }

function caseNextStep(x) {
  const tt = DATA_UTIL.tt;
  const id = idOf(x);
  const CW = window.CW;
  if (!isLive(id) || !CW) { const c = caseById(id); return c ? tt(c.next) : ''; }
  const key = caseStatusKey(id);
  const p = CW.progress();
  switch (key) {
    case 'submitted': return tt('Afventer kreditkomitéens afgørelse');
    case 'declined': return tt('Afslag givet');
    case 'ready': return tt('Indstil til kreditkomitéen');
    // Piloten: memoet skrives i Word med Copilot (CW_MEMO_MODE, case_facts.js)
    case 'memo': return window.CW_MEMO_MODE === 'builtin' ? tt('Færdiggør memo og indstil') : tt('Hent materialet og skriv memoet i Copilot');
    case 'material': return tt('Vælg materiale og send anmodningen');
    case 'toReview': return tt('Gennemgå modtagne punkter') + ' (' + p.toReview + ')';
    case 'awaiting': return tt('Afvent kunden') + ' (' + p.missing + ' ' + tt('punkter udestående') + ')';
    default: return tt('Vurdér offentlige data og vælg materiale');
  }
}
function caseIsDecided(x) {
  const s = STATUS[caseStatusKey(x)];
  const c = caseById(idOf(x));
  return !!(c && c.archived) || !!(s && s.decided);
}
// Næste skridt ligger hos rådgiveren, og sagen er min
function caseAwaitingMe(x) {
  if (caseOwner(x) !== ME || caseIsDecided(x)) return false;
  const s = STATUS[caseStatusKey(x)];
  return !!(s && s.awaitingMe);
}

/** Hvornår kom sagen i sin nuværende fase? ISO-tidsstempel eller null. */
function caseStageSince(x) {
  const id = idOf(x);
  const CW = window.CW;
  if (isLive(id) && CW) {
    const cs = CW.caseState() || {};
    if (cs.submittedAt) return cs.submittedAt;
    if (cs.stage === 'declined' && cs.decline && cs.decline.at) return cs.decline.at;
    if (cs.stageSince) return cs.stageSince;
  }
  // Ren demo: sagens faste tidslinje (Nordhavn kom i Vurdering, da de
  // offentlige data blev indsamlet)
  const c = caseById(id);
  return c ? c.stageSince || null : null;
}
/**
 * Dage i fase og SLA. Én funktion til sagskortet og sagshovedet, så de altid
 * viser samme tal: { days, since, sla, limit, warnFrom, counts, over }.
 *   days: hele hverdage i den nuværende fase (null hvis ukendt)
 *   sla: 'ok' | 'warn' (fra SLA_WARN_WORKDAYS hverdage) | 'over' (over SLA_WORKDAYS)
 *   counts: fasen tæller mod SLA (ikke kladder, indstillede og afgjorte sager)
 *   over: samme som sla === 'over' (ældre kald)
 */
function caseAge(x) {
  const since = caseStageSince(x);
  const key = caseStatusKey(x);
  const days = since ? (window.CW && window.CW.workdaysBetween ? window.CW.workdaysBetween(since) : DATA_UTIL.workdaysSince(since)) : null;
  const s = STATUS[key];
  const counts = !!(s && s.sla);
  const sla = !counts || days == null ? 'ok' : days > SLA_WORKDAYS ? 'over' : days >= SLA_WARN_WORKDAYS ? 'warn' : 'ok';
  return { days, since, sla, limit: SLA_WORKDAYS, warnFrom: SLA_WARN_WORKDAYS, counts, over: sla === 'over' };
}

/* Sagens egne hændelser i den fælles historik. CW.activity() rummer også
   linjer om andre sager (Ny sag, omfordeling af en anden sag), som ikke
   hører til Nordhavn. */
function liveCaseActivity() {
  const CW = window.CW;
  if (!CW || !CW.activity) return [];
  return CW.activity().filter(e => e && e.type !== 'demo-case' && !(e.type === 'owner' && e.data && e.data.caseId != null && Number(e.data.caseId) !== 1));
}
/**
 * Seneste aktivitet på sagen: { at, text }. at er null, når der ikke er sket
 * noget endnu. Den levende sag læser sin egen historik; er den tom, siger
 * kortet det samme som sagen ("ingen aktivitet endnu"). De øvrige sager
 * bruger de faste data.
 */
function caseLastActivity(x) {
  const id = idOf(x);
  if (isLive(id) && window.CW) {
    const l = liveCaseActivity();
    const e = l.length ? l[l.length - 1] : null;
    return e ? { at: e.at, text: e.text || '' } : { at: null, text: '' };
  }
  const c = (x && typeof x === 'object' && x.lastActivityAt !== undefined) ? x : caseById(id);
  return { at: c ? c.lastActivityAt || null : null, text: '' };
}

/**
 * Sagens faste tidslinje til datoer, der ellers ville stå løst i teksten:
 * { created, publicDataAt, asOf } som ISO-datoer eller null.
 * Nordhavn: bankens ansøgning af 2. juni 2026 oprettede sagen
 * (CASE_FACTS.keyDates), og de offentlige data blev indsamlet, da sagen kom
 * i Vurdering (samme tidspunkt som dage i fase regnes fra på en ren demo).
 */
function caseTimeline(x) {
  const id = idOf(x);
  const c = caseById(id);
  const out = { created: null, publicDataAt: c ? c.stageSince || null : null, asOf: null };
  if (isLive(id)) {
    const f = window.CASE_FACTS || {};
    out.asOf = f.asOf || null;
    const tl = Array.isArray(f.keyDates) ? f.keyDates : [];
    const opened = tl.find(e => e && /sag oprettet/i.test(e.text || ''));
    out.created = opened ? opened.date : '2026-06-02';
  } else if (c && c.demo) {
    out.created = c.stageSince;
  }
  return out;
}

/** Sagsfristen (sagens egen frist, ikke kundens svarfrist). yyyy-mm-dd eller null. */
function caseDeadline(x) {
  const c = caseById(idOf(x));
  return c ? c.deadline || null : null;
}

// Data collection - the HERO view
const COLLECTION_ITEMS = [
  { id: "annual", label: "Seneste årsrapport", category: "Regnskab", required: true, status: "received", source: "Upload", file: "Aarsrapport_2025.pdf", size: "2.4 MB", uploaded: "23. maj, 14:22", ai: { extracted: 47, confidence: "high" } },
  { id: "interim", label: "Internt periodetal (Q1 2026)", category: "Regnskab", required: true, status: "received", source: "API: e-conomic", uploaded: "24. maj, 09:01", ai: { extracted: 132, confidence: "high" } },
  { id: "budget", label: "Budget 2026-2028", category: "Regnskab", required: true, status: "received", source: "Upload", file: "Budget_2026-28_v3.xlsx", size: "188 KB", uploaded: "24. maj, 09:01", ai: { confidence: "high" } },
  { id: "loan-agreements", label: "Eksisterende låneaftaler", category: "Regnskab", required: true, status: "received", source: "Upload", file: "3 PDF'er", size: "1.1 MB", uploaded: "23. maj, 16:48" },
  { id: "ownership", label: "Ejerbog", category: "Selskab", required: true, status: "received", source: "Upload", file: "Ejerbog.pdf", size: "412 KB", uploaded: "23. maj, 14:25" },
  { id: "articles", label: "Vedtægter", category: "Selskab", required: true, status: "received", source: "CVR-register", uploaded: "23. maj, 14:20" },
  { id: "shareholder", label: "Ejeraftale", category: "Selskab", required: false, status: "waiting", source: "Anmodet 23. maj", reminder: "Påmindelse sendt i går" },
  { id: "org-chart", label: "Organisations­diagram", category: "Selskab", required: false, status: "missing", source: "Ikke anmodet" },
  { id: "trade-countries", label: "Samhandelslande", category: "Forretning", required: true, status: "received", source: "Spørgeskema", uploaded: "23. maj, 14:35" },
  { id: "pep", label: "PEP-erklæring", category: "Compliance", required: true, status: "received", source: "Signeret af kunde", uploaded: "23. maj, 14:38" },
  { id: "security", label: "Sikkerheds­dokumenter", category: "Sikkerhed", required: true, status: "waiting", source: "Anmodet 23. maj", reminder: "Kunde åbnet, ikke afleveret" },
  { id: "kyc", label: "KYC / UBO bekræftelse", category: "Compliance", required: true, status: "received", source: "Automatisk verifikation", uploaded: "23. maj, 14:38" },
];

const REQUEST_LINK = "crediwire.app/c/nh-9j2k-7Aq3";
// Modtager af materialeanmodningen = kundens kontaktperson i COMPANY
const REQUEST_RECIPIENT = {
  name: COMPANY.contact.name,
  get role() { return COMPANY.contact.role + ', Nordhavn Composite'; },
  email: COMPANY.contact.email,
};

/* ── Dataanmodninger på tværs af sager ─────────────────────────────────────
   Én række pr. sag. Nordhavn (caseId 1) bygges af den levende tilstand i
   window.CW; de øvrige er demodata med datoer regnet fra i dag.
   deadline er kundens svarfrist (ikke sagsfristen, se caseDeadline).
   toReview: punkter kunden har leveret, som venter på rådgiverens gennemgang.
   "Sidder fast": sendt, ikke komplet, og ingen aktivitet fra kunden i
   STUCK_WORKDAYS hverdage. */
const STUCK_WORKDAYS = 3;
const REQUESTS_DEMO = [
  { id: 2, caseId: 2, contact: "Lise Krogh", role: "CFO", email: "lise@vendia.bio", sentAt: DATA_UTIL.daysAgoAt(9, 10, 12), deadline: DATA_UTIL.wday(-2), received: 2, total: 8, toReview: 0, openedAt: DATA_UTIL.daysAgoAt(8, 8, 54), lastActivityAt: DATA_UTIL.daysAgoAt(6, 14, 22), lastAction: "Åbnede sikkerhedssektion, ikke afsluttet", reminders: [{ at: DATA_UTIL.daysAgoAt(3, 9, 5), by: "Jonas Kragh" }] },
  { id: 3, caseId: 8, contact: "Jonas Pihl", role: "CEO", email: "jonas@refshaleoen-robotics.dk", sentAt: DATA_UTIL.daysAgoAt(13, 9, 40), deadline: DATA_UTIL.wday(10), received: 3, total: 8, toReview: 0, openedAt: DATA_UTIL.daysAgoAt(12, 16, 3), lastActivityAt: DATA_UTIL.daysAgoAt(7, 11, 12), lastAction: "Uploadede 3 dokumenter" },
  { id: 4, caseId: 3, contact: "Birgit Olsen", role: "Økonomichef", email: "bo@marstal-maritime.dk", sentAt: DATA_UTIL.daysAgoAt(14, 13, 0), deadline: DATA_UTIL.wday(2), received: 9, total: 9, toReview: 9, openedAt: DATA_UTIL.daysAgoAt(14, 15, 20), lastActivityAt: DATA_UTIL.hoursAgo(4), lastAction: "Indsendt, afventer din gennemgang" },
  { id: 5, caseId: 4, contact: "Per Sørensen", role: "Direktør", email: "per@skagenklima.dk", sentAt: DATA_UTIL.daysAgoAt(17, 9, 15), deadline: DATA_UTIL.wday(-2), received: 7, total: 7, toReview: 0, openedAt: DATA_UTIL.daysAgoAt(17, 10, 2), lastActivityAt: DATA_UTIL.daysAgoAt(2, 10, 5), lastAction: "Komplet" },
  { id: 6, caseId: 5, contact: "Steen Madsen", role: "CFO", email: "sm@lyngbaek.dk", sentAt: DATA_UTIL.daysAgoAt(8, 11, 30), deadline: DATA_UTIL.wday(-3), received: 6, total: 9, toReview: 3, openedAt: DATA_UTIL.daysAgoAt(8, 13, 45), lastActivityAt: DATA_UTIL.hoursAgo(3), lastAction: "Uploadede låneaftaler" },
  { id: 7, caseId: 6, contact: null, role: null, email: null, sentAt: null, deadline: null, received: 0, total: 12, toReview: 0, openedAt: null, lastActivityAt: null, lastAction: "Ikke sendt" },
];

// Status for en anmodning: 'closed' (sagen er afslået, indstillet eller afgjort,
// kunden kan ikke levere mere) | 'draft' (ikke sendt) | 'ready' (alt modtaget) | 'stuck' |
// 'waiting' (sendt, kunden har ikke leveret noget endnu) | 'active' (kunden leverer løbende)
function requestStatus(r) {
  if (r.closed) return 'closed';
  if (!r.sentAt) return 'draft';
  if (r.total > 0 && r.received >= r.total) return 'ready';
  if (DATA_UTIL.workdaysSince(r.lastActivityAt || r.sentAt) >= STUCK_WORKDAYS) return 'stuck';
  if (!r.received) return 'waiting';
  return 'active';
}

/** Nordhavns punkter, som kunden endnu ikke har leveret (til påmindelsen). */
function missingItemIds() {
  const CW = window.CW;
  if (!CW) return [];
  return CW.requestedItems().filter(it => {
    const s = CW.itemState(it.id);
    return !s || s.status === 'rejected' || s.status === 'delegated';
  }).map(it => it.id);
}

function nordhavnRequest() {
  const CW = window.CW;
  const req = CW ? CW.request() : null;
  const p = CW ? CW.progress() : { total: 0, delivered: 0, toReview: 0 };
  // Seneste aktivitet: nyeste levering, ellers afsendelsen
  let last = req ? req.sentAt : null, lastAction = req ? 'Anmodning sendt' : 'Ikke sendt';
  if (CW) {
    const st = CW.items();
    Object.keys(st).forEach(id => { const s = st[id]; if (s && s.at && (!last || s.at > last)) { last = s.at; lastAction = s.by === 'rådgiver' ? 'Rådgiveren uploadede for kunden' : 'Kunden leverede materiale'; } });
    const cs = CW.caseState() || {};
    if (cs.customerSubmittedAt && (!last || cs.customerSubmittedAt > last)) { last = cs.customerSubmittedAt; lastAction = 'Kunden har indsendt materialet'; }
  }
  // Åbne spørgsmål: tråde hvor kunden har skrevet sidst
  const open = CW ? CW.questions().filter(q => { const l = q.replies && q.replies.length ? q.replies[q.replies.length - 1] : q; return l.from === 'kunde'; }).length : 0;
  const to = (req && req.to) || {};
  return {
    id: 1, caseId: 1, live: true,
    contact: req ? (to.name || REQUEST_RECIPIENT.name) : REQUEST_RECIPIENT.name,
    role: req ? (to.role || COMPANY.contact.role) : COMPANY.contact.role,
    email: req ? (to.email || REQUEST_RECIPIENT.email) : REQUEST_RECIPIENT.email,
    sentAt: req ? req.sentAt : null,
    deadline: req ? req.deadline : null,
    received: p.delivered, total: p.total, toReview: p.toReview || 0,
    openedAt: null, lastActivityAt: last, lastAction,
    openQuestions: open,
  };
}

/* Påmindelser. Nordhavn skriver i sagens historik (CW.remind), så kunden kan
   se den. De øvrige sager har en lokal historik i localStorage (kabul:*, så
   "Nulstil demo" rydder den). */
const REMINDER_KEY = 'kabul:reminders';
function localReminders() {
  try { const v = JSON.parse(localStorage.getItem(REMINDER_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
/** Seneste påmindelse for sagens anmodning: { at, by } eller null. */
function lastReminderFor(caseId) {
  const CW = window.CW;
  if (isLive(caseId) && CW) {
    const e = CW.lastReminder();
    return e ? { at: e.at, by: (e.data && e.data.by) || ADVISOR.name } : null;
  }
  const local = localReminders()[caseId] || [];
  const seed = (REQUESTS_DEMO.find(r => r.caseId === Number(caseId)) || {}).reminders || [];
  const all = seed.concat(local).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return all.length ? all[all.length - 1] : null;
}
/** Alle påmindelser for sagens anmodning, ældste først. */
function remindersFor(caseId) {
  const CW = window.CW;
  if (isLive(caseId) && CW) return CW.activity().filter(e => e.type === 'reminder').map(e => ({ at: e.at, by: (e.data && e.data.by) || ADVISOR.name }));
  const seed = (REQUESTS_DEMO.find(r => r.caseId === Number(caseId)) || {}).reminders || [];
  return seed.concat(localReminders()[caseId] || []).sort((a, b) => String(a.at).localeCompare(String(b.at)));
}
/** Send en påmindelse. by: rådgiverens fulde navn. */
function remindCase(caseId, by) {
  const CW = window.CW;
  const who = by || ADVISOR.name;
  if (isLive(caseId) && CW) { CW.remind(missingItemIds(), { by: who }); return; }
  const all = localReminders();
  all[caseId] = (all[caseId] || []).concat([{ at: new Date().toISOString(), by: who }]);
  try { localStorage.setItem(REMINDER_KEY, JSON.stringify(all)); } catch (e) {}
  // CW.useCase gentegner kun ved ændringer i CW; derfor et eget event
  try { window.dispatchEvent(new CustomEvent('cw-reminders-changed', { detail: { caseId: caseId } })); } catch (e) {}
}

/* Anmodninger, som Ny sag-guiden har gemt på en demosag. De er ikke sendt og
   står under "Ikke sendt", indtil rådgiveren sender dem fra sagen. */
function demoCaseRequestRows() {
  // case_state bygger rækkerne (CW.demoRequests); ellers bygges de her
  if (window.CW && window.CW.demoRequests) {
    // En sendt anmodning (CW.sendDemoCase) er aktiv fra afsendelsen
    return window.CW.demoRequests().map(r => (r.sentAt ? Object.assign({}, r, { lastActivityAt: r.sentAt, lastAction: 'Anmodning sendt' }) : r));
  }
  const byId = {};
  ((window.CW && window.CW.demoCases) ? window.CW.demoCases() : []).forEach(d => { byId[d.id] = d; });
  return demoCaseRows().filter(c => c.request).map(c => {
    const r = c.request, d = byId[c.id] || {};
    const to = r.to || {}, contact = d.contact || {};
    return {
      id: 'demo-' + c.id, caseId: c.id, demo: true,
      contact: to.name || contact.name || null, role: contact.role || null, email: to.email || contact.email || null,
      sentAt: r.sent ? (r.sentAt || null) : null, deadline: r.deadline || null,
      received: 0, total: r.items.length, toReview: 0, openedAt: null,
      lastActivityAt: c.lastActivityAt, lastAction: 'Ikke sendt',
    };
  });
}

// Lukket for kunden? Den levende sag spørger CW.customerLock(); de øvrige
// læser sagens fase. 'declined' | 'submitted' | 'decided' | null
// Sager, rådgiveren har afsluttet i Mine opgaver (portfolio.jsx, localStorage 'kabul:tasks')
function taskClosed(caseId) {
  try { const s = JSON.parse(localStorage.getItem('kabul:tasks') || '{}'); return !!(s && s.closed && s.closed[caseId]); } catch (e) { return false; }
}
function requestLock(caseId, c) {
  if (taskClosed(caseId)) return 'closed';
  const CW = window.CW;
  if (isLive(caseId) && CW && CW.customerLock) return CW.customerLock();
  const k = c && c.statusKey;
  if (k === 'declined' || k === 'submitted') return k;
  if (k === 'decided' || (c && c.archived)) return 'decided';
  return null;
}
const LOCK_ACTION = {
  declined: 'Sagen er afslået. Kunden kan ikke levere mere.',
  submitted: 'Indstillet til kreditkomitéen. Kunden kan ikke levere mere.',
  decided: 'Sagen er afgjort. Kunden kan ikke levere mere.',
  closed: 'Sagen er afsluttet. Kunden kan ikke levere mere.',
};

/** Alle anmodninger med firmanavn, status, fremdrift, ejer og frister. */
function requestRows() {
  const cases = allCases();
  return [nordhavnRequest()].concat(REQUESTS_DEMO, demoCaseRequestRows()).map(r => {
    const c = cases.find(x => x.id === r.caseId) || {};
    const progress = r.total ? Math.round((r.received / r.total) * 100) : 0;
    const lock = requestLock(r.caseId, c);
    const row = Object.assign({}, r, lock ? { closed: lock, lastAction: LOCK_ACTION[lock] } : null);
    return Object.assign(row, {
      company: c.name, caseNr: c.caseNr, status: requestStatus(row), progress,
      owner: c.responsible || null, caseStatus: c.statusKey || null, caseDeadline: c.deadline || null,
      lastReminder: lastReminderFor(r.caseId),
    });
  });
}
/* Klokken: faste demohændelser fra kunderne på de andre sager (fx Marstal
   indsendte for 4 timer siden). Samme tidspunkt og tekst som rækken i
   Dataanmodninger og kortet i Mine opgaver. Set-markeringen gemmes lokalt
   (kabul:, så "Nulstil demo" rydder den). */
const BELL_DEMO_SEEN = 'kabul:bell-demo-seen';
function demoBellEvents() {
  const seen = (() => { try { return JSON.parse(localStorage.getItem(BELL_DEMO_SEEN) || '{}') || {}; } catch (e) { return {}; } })();
  return requestRows()
    .filter(r => !isLive(r.caseId) && !r.demo && r.status !== 'closed' && r.lastActivityAt && Date.now() - new Date(r.lastActivityAt).getTime() < 24 * 3600e3)
    .map(r => ({ id: 'demo-bell-' + r.caseId, at: r.lastActivityAt, caseId: r.caseId, company: r.company, text: r.lastAction, toReview: r.toReview, seen: !!seen['demo-bell-' + r.caseId] }))
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
function markDemoBellSeen(ids) {
  try {
    const seen = JSON.parse(localStorage.getItem(BELL_DEMO_SEEN) || '{}') || {};
    [].concat(ids || []).forEach(id => { seen[id] = true; });
    localStorage.setItem(BELL_DEMO_SEEN, JSON.stringify(seen));
  } catch (e) {}
  if (window.CW && window.CW.bump) window.CW.bump();
}

/** Er sagens anmodning påmindet i dag? Returnerer påmindelsen ({ at, by }) eller null. */
function reminderToday(caseId) {
  const last = lastReminderFor(caseId);
  return last && DATA_UTIL.daysUntil(last.at) === 0 ? last : null;
}

/* ── Visningen i Mine opgaver og Porteføljeanalyse ─────────────────────────
   Faner, filtre og skabelon huskes i sessionen (sessionStorage), så man kan
   gå til en sag og tilbage uden at sætte visningen op igen. En ren demo
   (localStorage ryddet eller "Nulstil demo") starter altid med
   standardvisningen: værdien gælder kun, så længe epoke-nøglen i
   localStorage er den samme. */
const VIEW_KEY = 'kabul:view:';
const VIEW_EPOCH = 'kabul:view-epoch';
function viewGet(name) {
  try {
    const ep = localStorage.getItem(VIEW_EPOCH);
    if (!ep) return null;
    const v = JSON.parse(sessionStorage.getItem(VIEW_KEY + name) || 'null');
    return v && v.epoch === ep ? v.value : null;
  } catch (e) { return null; }
}
function viewSet(name, value) {
  try {
    let ep = localStorage.getItem(VIEW_EPOCH);
    if (!ep) { ep = Date.now().toString(36); localStorage.setItem(VIEW_EPOCH, ep); }
    sessionStorage.setItem(VIEW_KEY + name, JSON.stringify({ epoch: ep, value: value }));
  } catch (e) {}
}
/** Anmodningen for en sag, eller null. */
function requestFor(caseId) { return requestRows().find(r => r.caseId === Number(caseId)) || null; }

// Financials - Nordhavn, DKK mio. (årsrapporter 2023-2025, periodetal januar-august 2026, budget)
const FINANCIALS = {
  years: ["2023", "2024", "2025", "2026 jan-aug", "2026E"],
  revenue: [28.0, 32.8, 41.1, 29.08, 44.4],
  ebitda: [1.3, 1.9, 2.4, 1.68, 2.7],
  grossMargin: [45.7, 46.3, 45.0, 45.3, 45.3],
  liquidity: [1.0, 1.4, 1.9, 2.08, 2.4],
  equity: [3.5, 4.8, 6.2, 6.85, 7.35],
  debt: [5.9, 6.4, 7.8, 8.39, 8.2],
};

const BUDGET_VS_ACTUAL = [
  { month: "Jan", budget: 1.6, actual: 1.65 },
  { month: "Feb", budget: 1.7, actual: 1.62 },
  { month: "Mar", budget: 1.8, actual: 1.93 },
  { month: "Apr", budget: 1.8, actual: 1.78 },
  { month: "Maj", budget: 1.9, actual: null },
  { month: "Jun", budget: 2.0, actual: null },
  { month: "Jul", budget: 2.0, actual: null },
  { month: "Aug", budget: 1.9, actual: null },
  { month: "Sep", budget: 2.0, actual: null },
  { month: "Okt", budget: 2.0, actual: null },
  { month: "Nov", budget: 2.1, actual: null },
  { month: "Dec", budget: 2.1, actual: null },
];

/* ── Dokumentregistret (grænseflade 6) ─────────────────────────────────────
   DATA.DOCS bygges af sagens kildedokumenter i window.CASE_DOCS (undtagen
   kundens egne, se docIsCustomers), og intet står der uden indhold.
   Bygges af det der står i CASE_DOCS (navn, type, dato, størrelse, status),
   ikke af hårdkodede navne. Mangler et felt, udledes det af `meta`.
   Erstattede budgetversioner læses af versionsloggen i den gældende version
   og står kun som metadata med status "Erstattet".
   Uploads fra demoen (CW.allUploads) lægges oveni i Dokumenter-fanen. */
const DOC_MONTHS = { januar: 1, februar: 2, marts: 3, april: 4, maj: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, december: 12 };
function docPad(n) { return String(n).padStart(2, '0'); }
// Seneste fulde dato i en tekst: 24-05-2026, 24.5.2026 eller 24. maj 2026.
// Meta nævner ofte både periode og dokumentets egen dato; den seneste er
// dokumentets (fx "Regnskabsår 2024 (1.1.2024 - 31.12.2024) · godkendt 24. april 2025").
function docDateIn(text) {
  const s = String(text || '');
  const found = [];
  let m;
  const a = /(\d{1,2})[-.](\d{1,2})[-.](\d{4})/g;
  while ((m = a.exec(s))) found.push(m[3] + '-' + docPad(m[2]) + '-' + docPad(m[1]));
  const b = /(\d{1,2})\.\s*(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december)\s+(\d{4})/gi;
  while ((m = b.exec(s))) found.push(m[3] + '-' + docPad(DOC_MONTHS[m[2].toLowerCase()]) + '-' + docPad(m[1]));
  return found.length ? found.sort()[found.length - 1] : null;
}
// Ingen dokumentdato må ligge efter sagens dato (CASE_FACTS.asOf) eller i dag
function docDateLimit() {
  const today = DATA_UTIL.isoDay(new Date());
  const asOf = window.CASE_FACTS && window.CASE_FACTS.asOf;
  return asOf && asOf < today ? asOf : today;
}
function docSizeLabel(bytes) {
  if (!bytes && bytes !== 0) return '';
  const en = DATA_UTIL.isEn();
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1).replace('.', en ? '.' : ',') + ' MB';
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
  return bytes + ' B';
}
function docParseSize(s) {
  const m = /([\d.,]+)\s*(KB|MB|B)\b/i.exec(String(s || ''));
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toUpperCase();
  return Math.round(u === 'MB' ? v * 1048576 : u === 'KB' ? v * 1024 : v);
}
const DOC_SOURCE = { 'Årsrapport': 'CVR', 'Marked': 'Ekstern kilde', 'Periodetal': 'e-conomic', 'Ansøgning': 'Nordjyske Bank' };
const DOC_PUBLIC_TYPES = ['Årsrapport', 'Marked'];
// Kundens egne dokumenter (kilde Kundeupload eller e-conomic) står ikke i registret.
// Sagen har fra start kun det, EIFO selv har (CVR, banken, ratingmodellen); kundens
// filer kommer ind, når kunden uploader dem i portalen (CW.allUploads). Indholdet
// bliver i CASE_DOCS, så demoknappen kan bygge filerne og memoet kan citere dem.
// Så står en fil aldrig både i registret og som upload.
const DOC_CUSTOMER_SOURCES = ['Kundeupload', 'e-conomic'];
function docIsCustomers(d) { return !!d && d.origin === 'uploaded' && DOC_CUSTOMER_SOURCES.indexOf(d.sourceLabel || d.source) >= 0; }
function customerDocs() { return (Array.isArray(window.CASE_DOCS) ? window.CASE_DOCS : []).filter(docIsCustomers); }

let DOC_CACHE = null, DOC_CACHE_EXPORTS = -1;
function docRegistry() {
  // Eksporterne defineres i financials.jsx og memo_handoff.jsx, som indlæses senere
  // end første opslag: registret bygges igen, når der er kommet flere til
  const hasExports = Array.isArray(window.CW_EXPORT_DOCS) ? window.CW_EXPORT_DOCS.length : 0;
  if (DOC_CACHE && DOC_CACHE_EXPORTS === hasExports) return DOC_CACHE;
  DOC_CACHE_EXPORTS = hasExports;
  // Kildedokumenterne plus Crediwires egne eksporter (financials.jsx, window.CW_EXPORT_DOCS)
  // Eksporterne bygges af koden i financials.jsx. En eksport, der fejler, må ikke
  // vælte registret (og dermed Dokumenter og Credit memo): den udelades med en advarsel.
  const exportDocs = (Array.isArray(window.CW_EXPORT_DOCS) ? window.CW_EXPORT_DOCS : []).map(d => {
    // lazy: indholdet bygges først, når filen hentes eller vises (vejledningen læser selv registret)
    try { return { id: d.id, name: d.name, type: d.type, source: d.source, origin: d.origin, period: d.period, date: d.date, meta: d.meta, size: d.size, pages: d.lazy ? [{ ref: 's. 1', title: d.name }] : d.pages }; }
    catch (e) { try { console.warn('Eksporten ' + (d && d.name) + ' kunne ikke bygges: ' + e.message); } catch (x) {} return null; }
  });
  const src = (Array.isArray(window.CASE_DOCS) ? window.CASE_DOCS : []).filter(d => !docIsCustomers(d)).concat(exportDocs);
  const limit = docDateLimit();
  const out = [];
  src.forEach(d => {
    if (!d || !d.name || !Array.isArray(d.pages) || !d.pages.length) return; // intet indhold: ikke i registret
    const meta = String(d.meta || '');
    const metaParts = meta.split(' · ');
    const isXlsx = /\.xlsx?$/i.test(d.name);
    // Sider: det dokumentet oplyser selv (meta), ellers antal sider i viseren
    const pm = /(\d+)\s+sider/.exec(meta), sm = /(\d+)\s+faneblade/.exec(meta);
    const pageCount = d.pageCount || (pm ? Number(pm[1]) : sm ? Number(sm[1]) : d.pages.length);
    const type = d.type || 'Andet';
    const origin = d.origin || (DOC_PUBLIC_TYPES.indexOf(type) >= 0 ? 'public' : 'uploaded');
    // Dato: dokumentets egen, ellers fra meta. Offentlige dokumenter uden dato
    // får den dag, de blev hentet (CVR-opslaget i går).
    let date = d.date && /^\d{4}-\d{2}-\d{2}/.test(d.date) ? d.date.slice(0, 10) : docDateIn(meta);
    if (!date && origin === 'public') date = DATA_UTIL.day(-1);
    if (date && date > limit) date = limit;
    const sizeBytes = docParseSize(d.size) || (isXlsx ? 38 * 1024 + pageCount * 23 * 1024 : 64 * 1024 + pageCount * 86 * 1024);
    const yearLabel = d.year || d.period || (/(\d{4})/.test(d.name) && type === 'Årsrapport' ? /(\d{4})/.exec(d.name)[1] : String(metaParts[0] || '').replace(/\s*\(.*?\)\s*/g, ' ').split(',')[0].trim().slice(0, 40));
    out.push({
      id: d.id || d.name, name: d.name, type, year: yearLabel, date: date || '',
      sizeBytes, get size() { return docSizeLabel(this.sizeBytes); },
      pageCount, pageUnit: isXlsx ? 'ark' : 'sider', excerpt: d.pages.length < pageCount ? d.pages.length : null,
      status: d.status || 'Analyseret',
      origin,
      sourceLabel: d.source || d.sourceLabel || DOC_SOURCE[type] || 'Kundeupload',
      hasContent: true,
    });
    // Erstattede versioner fra versionsloggen (fx Budget v1 og v2)
    const vm = /_v(\d+)(\.\w+)$/.exec(d.name);
    const log = vm && d.pages.find(p => /versionslog/i.test(p.ref + ' ' + p.title));
    if (vm && log) {
      const re = /^v(\d+)\s+(\d{2})-(\d{2})-(\d{4}).*Erstattet\s*$/gm;
      let m;
      while ((m = re.exec(log.body))) {
        if (Number(m[1]) >= Number(vm[1])) continue;
        out.push({
          id: d.name + '#v' + m[1], name: d.name.replace(/_v\d+(\.\w+)$/, '_v' + m[1] + '$1'), type, year: 'v' + m[1],
          date: m[4] + '-' + m[3] + '-' + m[2], sizeBytes: Math.round(sizeBytes * (0.9 + 0.02 * Number(m[1]))),
          get size() { return docSizeLabel(this.sizeBytes); },
          pageCount: null, status: 'Erstattet', superseded: true, supersededBy: d.name, versionLogRef: log.ref,
          origin: 'uploaded', sourceLabel: d.source || 'Kundeupload', hasContent: false,
        });
      }
    }
  });
  DOC_CACHE = out;
  return out;
}

/* ── Porteføljen (Porteføljeanalyse og risikomarkør på sagskort) ──────────
   Nøgletal pr. kunde, seneste 12 måneder. Beløb i kroner. caseId peger på
   kundens åbne sag i CASES, hvis der er en. Nordhavn: nettoomsætning, EBITDA
   og egenkapital 2025 fra årsrapporten; største kunde 24 % (Vestas 2025).
   period: rækkens tal gælder en anden periode end "seneste 12 måneder" og
   vises ved kunden i analysen (sagens faktaark har nyere tal for 2026). */
const PORTFOLIO = [
  { id: 1,  cvr: "38427156", name: "Nordhavn Composite A/S",      dept: "Frederikshavn Erhverv", branche: "Industri",              rev12: 41100000, revPct: 25,  ebitda12: 2400000,  ebitdaPct: 26,  equity: 6200000,  bigCust: 24, caseId: 1, period: "Regnskab 2025" },
  { id: 2,  cvr: "41278319", name: "Vendia Bio ApS",              dept: "Esbjerg Erhverv",       branche: "Medicinal og biotek",   rev12: 9200000,  revPct: 28,  ebitda12: 1100000,  ebitdaPct: 12,  equity: 3100000,  bigCust: 22, caseId: 2 },
  { id: 3,  cvr: "39552048", name: "Marstal Maritime ApS",        dept: "Svendborg Erhverv",     branche: "Transport og logistik", rev12: 42100000, revPct: -8,  ebitda12: -2400000, ebitdaPct: -6,  equity: 11400000, bigCust: 58, caseId: 3 },
  { id: 4,  cvr: "36901472", name: "Skagen Klima ApS",            dept: "Skagen Erhverv",        branche: "Energi og forsyning",   rev12: 5800000,  revPct: 27,  ebitda12: 800000,   ebitdaPct: 14,  equity: 1900000,  bigCust: 33, caseId: 4 },
  { id: 5,  cvr: "33186405", name: "Lyngbæk Industrier ApS",      dept: "Herning Erhverv",       branche: "Industri",              rev12: 28400000, revPct: -12, ebitda12: -4100000, ebitdaPct: -14, equity: -1200000, bigCust: 71, caseId: 5 },
  { id: 6,  cvr: "40739126", name: "Aalborg Hydrogen A/S",        dept: "Aalborg Erhverv",       branche: "Energi og forsyning",   rev12: 61300000, revPct: 45,  ebitda12: 9200000,  ebitdaPct: 15,  equity: 24100000, bigCust: 18, caseId: 6 },
  { id: 7,  cvr: "35024783", name: "Kløver Tekstil ApS",          dept: "Ikast Erhverv",         branche: "Tekstil og beklædning", rev12: 11000000, revPct: 4,   ebitda12: 900000,   ebitdaPct: 8,   equity: 3800000,  bigCust: 29, caseId: 7 },
  { id: 8,  cvr: "42160857", name: "Refshaleøen Robotics ApS",    dept: "København Erhverv",     branche: "IT og teknologi",       rev12: 14700000, revPct: 38,  ebitda12: 2100000,  ebitdaPct: 14,  equity: 5500000,  bigCust: 44, caseId: 8 },
  { id: 9,  cvr: "37814520", name: "Skov & Bertelsen Tømrer ApS", dept: "Odense Erhverv",        branche: "Bygge og anlæg",        rev12: 8700000,  revPct: 12,  ebitda12: 680000,   ebitdaPct: 8,   equity: 2100000,  bigCust: 38, caseId: 10 },
  { id: 10, cvr: "34661209", name: "Jutland Gulve & Fliser ApS",  dept: "Vejle Erhverv",         branche: "Bygge og anlæg",        rev12: 5200000,  revPct: 6,   ebitda12: 420000,   ebitdaPct: 8,   equity: 980000,   bigCust: 55 },
  { id: 11, cvr: "29438716", name: "Morsø Slagter & Deli ApS",    dept: "Thisted Erhverv",       branche: "Fødevarer og drikke",   rev12: 6400000,  revPct: 3,   ebitda12: 310000,   ebitdaPct: 5,   equity: 1450000,  bigCust: 31 },
  { id: 12, cvr: "31209564", name: "Ballerup Autoservice A/S",    dept: "København Erhverv",     branche: "Handel og service",     rev12: 12800000, revPct: -5,  ebitda12: -180000,  ebitdaPct: -1,  equity: 2700000,  bigCust: 19, caseId: 11 },
  { id: 13, cvr: "43057138", name: "BrainSpark Technologies A/S", dept: "Aarhus Erhverv",        branche: "IT og teknologi",       rev12: 32400000, revPct: 48,  ebitda12: 6100000,  ebitdaPct: 19,  equity: 18700000, bigCust: 12 },
  { id: 14, cvr: "38912647", name: "Midtjylland Vindservice ApS", dept: "Herning Erhverv",       branche: "Energi og forsyning",   rev12: 54200000, revPct: 41,  ebitda12: 11300000, ebitdaPct: 21,  equity: 29400000, bigCust: 8 },
];

/**
 * Risikomarkør til sagskortet: { level: 'high'|'med'|'low', flags: [tekst], detail: [tekst] }.
 * Faresignalerne er de samme som Porteføljeanalysens skabeloner. For Nordhavn
 * tæller sagens røde flag (CASE_FACTS.redFlags, ellers AI-fundene).
 */
function caseRisk(x) {
  const id = idOf(x);
  const c = caseById(id);
  const cvr = c ? String(c.cvr).split(' ').join('') : '';
  const p = PORTFOLIO.find(r => r.caseId === id) || (cvr ? PORTFOLIO.find(r => String(r.cvr).split(' ').join('') === cvr && !r.caseId) : null);
  const flags = [], detail = [];
  if (p) {
    const L = DATA_UTIL.L;
    if (p.equity < 0) { flags.push('Negativ egenkapital'); detail.push(L('Egenkapital ', 'Equity ') + DATA_UTIL.amount(p.equity)); }
    if (p.ebitda12 < 0) { flags.push('Negativ EBITDA'); detail.push(L('EBITDA 12 mdr. ', 'EBITDA 12 months ') + DATA_UTIL.amount(p.ebitda12)); }
    if (p.bigCust > 50) { flags.push('Kundekoncentration'); detail.push(L(p.bigCust + ' % hos største kunde', p.bigCust + '% with the largest customer')); }
  }
  if (isLive(id)) {
    // Røde flag: CASE_FACTS.redFlags er eneste kilde, og kortet tæller dem alle,
    // ligesom beslutningspanelet ("7 røde flag, 4 med vægt høj"). Detaljen
    // (tooltip) viser de høje først. Uden faktaark: AI-fundene.
    const facts = (window.CASE_FACTS && Array.isArray(window.CASE_FACTS.redFlags)) ? window.CASE_FACTS.redFlags.filter(f => f && f.text) : [];
    const short = (f) => (DATA_UTIL.isEn() ? (f.shortEn || f.textEn) : null) || f.short || f.text;
    const high = facts.filter(f => f.severity === 'høj');
    const rf = facts.length
      ? high.concat(facts.filter(f => f.severity !== 'høj')).map(short)
      : FINDINGS.filter(f => f.severity === 'warn').map(f => f.title);
    if (rf.length) {
      flags.push(rf.length === 1 ? DATA_UTIL.L('1 rødt flag', '1 red flag') : DATA_UTIL.L(rf.length + ' røde flag', rf.length + ' red flags'));
      if (high.length) detail.push(DATA_UTIL.L(high.length + ' med vægt høj', high.length + ' rated high'));
      rf.forEach(x => detail.push(DATA_UTIL.tt(x)));
    }
  }
  let level = c ? (c.risk || 'low') : 'low';
  if (flags.indexOf('Negativ egenkapital') >= 0) level = 'high';
  else if (flags.length && level === 'low') level = 'med';
  return { level, flags, detail };
}

// AI findings
const FINDINGS = [
  { id: 1, severity: "warn", title: "Ulovligt kapitalejerlån (§ 210)", body: "Revisors påtegning for 2025 har en supplerende oplysning om ulovligt kapitalejerlån efter selskabslovens § 210 (lån på DKK 0,5 mio., note 14).", source: "Aarsrapport_2025.pdf · s. 14", suggest: "Afklar lånets forhold og indhent tilbagetrædelseserklæring før indstilling.", confidence: "high" },
  { id: 2, severity: "warn", title: "Tilbagetrædelses­erklæring mangler", body: "Lån fra anpartshaverkredit på 0,5M (note 14 i årsrapport) - ingen tilbagetrædelses­erklæring fundet blandt indleverede dokumenter.", source: "Aarsrapport_2025.pdf · note 14", suggest: "Anmod om tilbagetrædelses­erklæring fra Anders Christensen.", confidence: "high" },
  { id: 3, severity: "info", title: "Kaution ikke fuldt specificeret", body: "Kautionsdokument refererer til 'sædvanlige sikkerheder' uden specifikation. Kræver afklaring før indstilling.", source: "Pantebrev_maskiner.pdf · §4", suggest: "Få listet konkrete aktiver der indgår i kautionen.", confidence: "high" },
  { id: 4, severity: "ok", title: "Periodetal 2026 i tråd med forventningerne", body: "Realiseret nettoomsætning januar-august 2026 er DKK 29,1 mio. Budgettet for hele 2026 er DKK 44,4 mio.", source: "Periodetal_jan-aug_2026.xlsx", confidence: "high" },
  { id: 5, severity: "info", title: "Trustpilot: 4,2 af 5 (127 anmeldelser)", body: "Anmeldelserne handler mest om rekruttering og eftermarkedsservice, ikke om OEM-kunderne. Blødt signal med lav vægt.", source: "Aarsrapport_2025.pdf · s. 4", confidence: "high" },
];

// Questions
const QUESTIONS_TO_CUST = [
  { id: 1, q: "Hvordan og hvornår bliver kapitalejerlånet på DKK 0,5 mio. (§ 210) lovliggjort?", source: "Årsrapport 2025, revisors påtegning", status: "draft", priority: "high" },
  { id: 2, q: "Findes der tilbagetrædelses­erklæring for anpartshaver­lånet på 0,5M?", source: "Årsrapport note 14", status: "draft", priority: "high" },
  { id: 3, q: "Specifikation af aktiver omfattet af kaution (pantebrev §4)?", source: "Pantebrev_maskiner", status: "draft", priority: "med" },
  { id: 4, q: "Forventede valutaeksponeringer for Block-Island ordre (USD)?", source: "AI · markedsanalyse", status: "draft", priority: "med" },
  { id: 5, q: "Er der indgået rente­swap eller anden afdækning på den variable gæld?", source: "Låneaftale Nordea §7", status: "sent", priority: "med", sent: "21. maj" },
];

// Ejere efter Ejerbog_2026.pdf (pr. 30. juni 2026). Alle fire er registreret i
// Det Offentlige Ejerregister (CVR). share = nuværende andel, diluted = efter
// fuld udnyttelse af medarbejderwarrants (NC-W2022, 5,0 %, ikke registreret i CVR).
const OWNERS = [
  { name: "Anders Holding ApS", share: 50.7, diluted: 48.2, pep: false, type: "holding", cvr: "36710984", note: "Ejes 100 % af Anders Christensen (reel ejer)" },
  { name: "Erhvervsfonden", share: 23.6, diluted: 22.4, pep: false, type: "fund", cvr: "27441208" },
  { name: "Maria Lindbjerg", share: 15.6, diluted: 14.8, pep: false, type: "person", role: "CTO" },
  { name: "Industrifonden A/S", share: 10.1, diluted: 9.6, pep: false, type: "fund", cvr: "33058821" },
];
const WARRANTS = { name: "Medarbejderwarrants (NC-W2022)", diluted: 5.0, registered: false };

// Bestyrelse efter årsrapport 2025 s. 2 og ejerbogens s. 3
const BOARD = [
  { name: "Erik Sandberg", role: "Bestyrelses­formand", since: "2020" },
  { name: "Anders Christensen", role: "Bestyrelsesmedlem", since: "2014" },
  { name: "Lene Mortensen", role: "Bestyrelsesmedlem", since: "2021" },
  { name: "Kim Vestergaard", role: "Bestyrelsesmedlem", since: "2023" },
];
// Direktion. Maria Lindbjerg er CTO, men ikke anmeldt som direktør i CVR.
const MANAGEMENT = [
  { name: "Anders Christensen", role: "Administrerende direktør", registered: true },
  { name: "Maria Lindbjerg", role: "Teknisk direktør (CTO)", registered: false },
];

// Soft signals
const SOFT = [
  { label: "Ansatte (LinkedIn)", value: "84", trend: "+7,7 % år til år", positive: true },
  { label: "Markedsomtale (90 dage)", value: "4 artikler", trend: "Neutral til positiv", positive: true },
  { label: "Kapitalrunder", value: "2", trend: "Senest: 2023, 1,8M" },
  { label: "Søgsmål / negativ presse", value: "Ingen", positive: true },
  { label: "Brancheudvikling 2026E", value: "+6,8 %", trend: "DK vindkomponent", positive: true },
];

window.DATA = {
  COMPANY, STATUS, SLA_WORKDAYS, TEAM, ME, ADVISOR, COLLECTION_ITEMS, REQUEST_LINK, REQUEST_RECIPIENT,
  FINANCIALS, BUDGET_VS_ACTUAL, FINDINGS, QUESTIONS_TO_CUST, OWNERS, WARRANTS, BOARD, MANAGEMENT, SOFT,
  PORTFOLIO, STUCK_WORKDAYS, BASE_CASES, SLA_WARN_WORKDAYS,
  // Alle sager med aktuel ejer og status, inkl. kladder fra Ny sag-guiden
  get CASES() { return allCases(); },
  // Dokumentregistret, bygget af window.CASE_DOCS
  // Uden de hentede dokumenter, rådgiveren har slettet (CW.removeDoc, fx en forkert årsrapport fra CVR)
  get DOCS() { const reg = docRegistry(); return window.CW && CW.isDocRemoved ? reg.filter(d => !CW.isDocRemoved(d.name)) : reg; },
  // Hele registret, også de slettede (til listen "Slettet" og årsrapportpunkterne)
  get ALL_DOCS() { return docRegistry(); },
  // Kundens dokumenter i CASE_DOCS, der først kommer på sagen, når kunden uploader dem
  customerDocs,
  // Sagsmodel (grænseflade 1 og 2)
  caseStatusKey, caseOwner, caseById: (id) => allCases().find(c => c.id === Number(id)) || null,
  caseStatus: caseStatusKey, caseNextStep, caseAwaitingMe, caseIsDecided, caseAge, caseStageSince, caseDeadline, caseRisk,
  caseLastActivity, caseTimeline,
  statusKeyOf,
  // Dataanmodninger og påmindelser
  requestRows, requestStatus, requestFor, remindCase, lastReminderFor, remindersFor, missingItemIds, reminderToday,
  demoBellEvents, markDemoBellSeen,
  // Visningens filtre i sessionen
  viewGet, viewSet,
  // Formatering af datoer, tal og beløb på det aktive sprog
  fmt: DATA_UTIL,
};

// Modul-eksport til Vue-komponenterne (window.DATA bruges fortsat af de andre domænefiler)
export const DATA = window.DATA;
