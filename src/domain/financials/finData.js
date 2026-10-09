// Fanen Virksomheden: tallene bag regnskabstabellen (årsrapporter, realiserede perioder og
// budget), tabellens rækker og kontroller, og de faste data til ejerlisten og Trustpilot.
// Flyttet ordret fra src/financials.jsx ved migrationen til Vue; kun kommentarerne, der
// begynder med "Migration:", og export-linjen er nye.
// ANNUAL_REPORT og FIN_LAYOUT er almindelige objekter (ikke reaktive): finSyncMapping
// (finMapping.js) skriver kvartalstallene direkte ind i dem. Læs dem i en computed, der
// afhænger af useCaseVersion(); mapping.js kalder CW.bump(), når tallene er skrevet.

/* ─────────────────────────────────────────────────────────────────────────
   Årsregnskaber - 3 års overblik
   Public-data table grouped into Resultat, Balance, Nøgletal
   ──────────────────────────────────────────────────────────────────────── */
/* Periodeopsætning for regnskabstabellen.
   Fire kolonnetyper: årsrapport (values) - estimat 2026 (udledt) ·
   realiseret kvartal (q) - budget kvartal (bq).
   Alle tal er i DKK mio.; enhedsvælgeren skalerer først ved visning.

   Kun rå poster står i tabellen nedenfor. Delsummer (bruttofortjeneste, EBITDA,
   aktiver i alt, gæld i alt) og alle nøgletal beregnes i koden, så ingen kolonne
   kan komme til at modsige sine egne tal. */
const FIN_ANNUAL_YEARS = ['2023', '2024', '2025'];
// Realiserede perioder efter Periodetal_jan-aug_2026.xlsx. Q3 er ikke afsluttet,
// så den tredje kolonne er kun juli-august (months: 2) og kaldes ikke Q3.
const FIN_ACTUAL_Q = [
  { label: 'Q1', year: '2026', months: 3 },
  { label: 'Q2', year: '2026', months: 3 },
  { label: 'Jul-aug', year: '2026', months: 2, partial: true },
];
// Budget for september 2026 (budget v3, ark Resultat), rækkernes felt `bs`.
// Står for sig, så FIN_BUDGET_Q stadig er fire hele kvartaler.
const FIN_BUDGET_SEP = { label: 'Sep', year: '2026', key: '2026-09', months: 1 };
const FIN_BUDGET_Q = [
  { label: 'Q4', year: '2026', key: '2026-Q4' },
  { label: 'Q1', year: '2027', key: '2027-Q1' },
  { label: 'Q2', year: '2027', key: '2027-Q2' },
  { label: 'Q3', year: '2027', key: '2027-Q3' },
];

// Tal i DKK mio. q = realiseret Q1, Q2 og juli-august 2026 (periodetal af
// 14-09-2026; balance pr. 31-03, 30-06 og 31-08). bs = budget september 2026,
// bq = budget Q4 2026 til Q3 2027 (budget v3 af 11-09-2026). Balanceposter
// har intet septemberbudget.
const ANNUAL_REPORT = {
  years: FIN_ANNUAL_YEARS,
  groups: [
    {
      label: 'Resultatopgørelse',
      rows: [
        { label: 'Nettoomsætning',                  values: [28.0, 32.8, 41.1],    q: [10.60, 11.10, 7.38],   bs: 3.82,  bq: [11.50, 11.40, 12.00, 12.10] },
        { label: 'Vareforbrug',                     values: [-15.2, -17.6, -22.6], q: [-5.80, -6.08, -4.04],  bs: -2.09, bq: [-6.29, -6.20, -6.50, -6.58] },
        { label: 'Bruttofortjeneste',               values: [12.8, 15.2, 18.5],    q: [4.80, 5.02, 3.34],    bs: 1.73,  bq: [5.21, 5.20, 5.50, 5.52],    computed: true },
        { label: 'Personaleomkostninger',           values: [-9.5, -11.0, -13.5],  q: [-3.58, -3.62, -2.43], bs: -1.23, bq: [-3.74, -3.78, -3.82, -3.88] },
        { label: 'Andre eksterne omkostninger',     values: [-2.0, -2.3, -2.6],    q: [-0.68, -0.70, -0.47], bs: -0.23, bq: [-0.72, -0.72, -0.73, -0.74] },
        { label: 'EBITDA',                          values: [1.3, 1.9, 2.4],       q: [0.54, 0.70, 0.44],    bs: 0.27,  bq: [0.75, 0.70, 0.95, 0.90],    computed: true },
        { label: 'Afskrivninger',                   values: [-0.7, -0.8, -1.0],    q: [-0.27, -0.27, -0.186], bs: -0.09, bq: [-0.28, -0.29, -0.29, -0.30] },
        { label: 'Resultat før finansielle poster', values: [0.6, 1.1, 1.4],       q: [0.27, 0.43, 0.254],   bs: 0.18,  bq: [0.47, 0.41, 0.66, 0.60],    computed: true },
        { label: 'Finansielle omkostninger',        values: [-0.3, -0.4, -0.4],    q: [-0.11, -0.11, -0.08], bs: -0.04, bq: [-0.11, -0.11, -0.12, -0.12] },
        { label: 'Årets resultat',                  values: [0.3, 0.7, 1.0],       q: [0.16, 0.32, 0.174],   bs: 0.14,  bq: [0.36, 0.30, 0.54, 0.48],    computed: true },
      ],
    },
    {
      label: 'Balance',
      rows: [
        { label: 'Anlægsaktiver',        values: [4.2, 4.8, 6.0],   q: [6.10, 6.20, 6.27],    bq: [6.40, 6.50, 6.60, 6.70],     stock: true },
        { label: 'Omsætningsaktiver',    values: [5.2, 6.4, 8.0],   q: [8.26, 8.58, 8.97],    bq: [9.15, 9.25, 9.64, 9.97],     stock: true },
        { label: 'Likvide beholdninger', values: [1.0, 1.4, 1.9],   q: [2.00, 2.15, 2.08],    bq: [2.40, 2.55, 2.75, 2.95],     stock: true },
        { label: 'Aktiver i alt',        values: [9.4, 11.2, 14.0], q: [14.36, 14.78, 15.24], bq: [15.55, 15.75, 16.24, 16.67], stock: true, computed: true },
        { label: 'Egenkapital',          values: [3.5, 4.8, 6.2],   q: [6.36, 6.68, 6.854],   bq: [7.35, 7.65, 8.19, 8.67],     stock: true },
        // Egenkapitalen stiger med årets resultat plus kapitalindskud. Uden denne
        // linje mangler 2024 0,6 mio. (3,5 + 0,7 = 4,2 mod 4,8). Kilder:
        // årsrapport 2023 note 11 (tilskud 0,4), 2024 note 11 (forhøjelse 0,6),
        // 2025 note 9 (forhøjelse 0,4). Ingen indskud i periodetal og budget.
        { label: 'heraf kapitalindskud i året', values: [0.4, 0.6, 0.4], q: [0, 0, 0], bs: 0, bq: [0, 0, 0, 0], memo: true,
          note: 'Kontante kapitalindskud fra ejerne. 2023: tilskud 0,4 mio. (note 11). 2024: kapitalforhøjelse 0,6 mio. (note 11). 2025: kapitalforhøjelse 0,4 mio. (note 9).' },
        { label: 'Langfristet gæld',     values: [3.5, 3.8, 4.6],   q: [4.50, 4.50, 4.45],    bq: [4.40, 4.30, 4.20, 4.10],     stock: true },
        { label: 'Kortfristet gæld',     values: [2.4, 2.6, 3.2],   q: [3.50, 3.60, 3.936],   bq: [3.80, 3.80, 3.85, 3.90],     stock: true },
        { label: 'Gæld i alt',           values: [5.9, 6.4, 7.8],   q: [8.00, 8.10, 8.386],   bq: [8.20, 8.10, 8.05, 8.00],     stock: true, computed: true },
      ],
    },
  ],
};

/* Tabellens visning. ANNUAL_REPORT er rækkerne, som budgetformularen, nøgletallene
   og memoet læser, og den er uændret. Her står, hvordan de vises: kategorierne fra
   standardkontoplanen, med detaljerne bag hver sum.
   ref     = en række i ANNUAL_REPORT (har tal i alle kolonner)
   vals    = tal for 2023-2025 i DKK mio. fra årsrapporterne (kun årskolonnerne;
             periodetal og budget findes kun for de samlede linjer)
   derive  = udledt af andre rækker i samme kolonne
   children= detaljerne bag en sum; vises, når rækken foldes ud
   Poster uden tal i alle årene er foldet sammen under "Vis N poster uden tal".
   Kontrolrækkerne sammenholder summen af detaljerne med årsrapportens total. */
const FIN_LAYOUT = [
  {
    label: 'Resultatopgørelse',
    entries: [
      { id: 'oms', label: 'Omsætning i alt', ref: 'Nettoomsætning', children: [
        { label: 'Salg af varer og tjenesteydelser', vals: [28.0, 32.8, 41.1] },
        { label: 'Huslejeindtægter', vals: [0, 0, 0] },
        { label: 'Øvrige indtægter', vals: [0, 0, 0] },
      ] },
      { label: 'Vareforbrug/Produktionsomkostninger', ref: 'Vareforbrug' },
      { label: 'Dækningsbidrag', ref: 'Bruttofortjeneste', sum: true },
      { label: 'Andre eksterne omkostninger', ref: 'Andre eksterne omkostninger' },
      { label: 'Personaleomkostninger', ref: 'Personaleomkostninger' },
      { label: 'Andre driftsindtægter', vals: [0, 0, 0] },
      { label: 'Andre driftsomkostninger', vals: [0, 0, 0] },
      { label: 'Resultat før afskrivninger (EBITDA)', ref: 'EBITDA', sum: true },
      { id: 'afsk', label: 'Årets af- og nedskrivninger i alt', ref: 'Afskrivninger', children: [
        { label: 'Af- og nedskr. immaterielle anlægsaktiver', vals: [0, -0.13, -0.235] },
        { label: 'Af- og nedskr. materielle anlægsaktiver', vals: [-0.7, -0.67, -0.765] },
        { label: 'Gevinst/tab ved salg af anlægsaktiver', vals: [0, 0, 0] },
      ] },
      { id: 'ebit', label: 'Resultat før finansielle poster', ref: 'Resultat før finansielle poster', sum: true },
      { id: 'netfin', label: 'Netto finansielle poster', ref: 'Finansielle omkostninger', children: [
        { label: 'Indtægter/udbytter - kap. andele tilkn. virk.', vals: [0, 0, 0] },
        { label: 'Indtægter/udbytter - kap. andele ass. virk.', vals: [0, 0, 0] },
        { label: 'Regulering af inv. ejd. til dagsværdi', vals: [0, 0, 0] },
        { label: 'Årets regulering af gæld til dagsværdi', vals: [0, 0, 0] },
        { label: 'Op- og nedskrivning af fin. anlægsaktiver', vals: [0, 0, 0] },
        { label: 'Øvrige finansielle indtægter', vals: [0, 0, 0] },
        { label: 'Øvrige finansielle omkostninger', vals: [-0.3, -0.4, -0.4] },
      ] },
      { id: 'pretax', label: 'Resultat før skat', sum: true,
        derive: (get) => { const a = get('Resultat før finansielle poster'), b = get('Finansielle omkostninger'); return a == null || b == null ? null : a + b; } },
      { id: 'skat', label: 'Skat af årets resultat i alt', vals: [0, 0, 0], children: [
        { label: 'Skat af årets resultat', vals: [0, 0, 0] },
        { label: 'Årets regulering af udskudt skat', vals: [0, 0, 0] },
      ] },
      { id: 'result', label: 'Årets resultat', ref: 'Årets resultat', sum: true },
      { label: 'Foreslået udbytte inkl. eks. ord. udbytte', vals: [0, 0, 0] },
      { label: 'Disponeret i alt', annualOnly: true, derive: (get) => get('Årets resultat') },
    ],
  },
  {
    label: 'Balance',
    entries: [
      { id: 'immat', label: 'Immaterielle anlægsaktiver i alt', vals: [0.3, 0.515, 0.6], children: [
        { label: 'Goodwill', vals: [0, 0, 0] },
        { label: 'Øvrige immaterielle anlægsaktiver', vals: [0.3, 0.515, 0.6] },
      ] },
      { id: 'mat', label: 'Materielle anlægsaktiver i alt', vals: [3.8, 4.235, 5.3], children: [
        { label: 'Grunde og bygninger', vals: [1.7, 2.45, 2.4] },
        { label: 'Indretning af lejede lokaler', vals: [0, 0, 0] },
        { label: 'Produktionsanlæg og maskiner', vals: [1.9, 1.585, 2.5] },
        { label: 'Andre anlæg, driftsmateriel og inventar', vals: [0.2, 0.2, 0.4] },
        { label: 'Materielle anlægsaktiver under udførelse', vals: [0, 0, 0] },
      ] },
      { id: 'finanl', label: 'Finansielle anlægsaktiver i alt', vals: [0.1, 0.05, 0.1], children: [
        { label: 'Kap. andele i tilkn. virksomheder', vals: [0, 0, 0] },
        { label: 'Kap. andele i ass. virksomheder', vals: [0, 0, 0] },
        { label: 'Udskudte skatteaktiver', vals: [0, 0, 0] },
        { label: 'Andre værdipapirer og kapitalandele', vals: [0, 0, 0] },
        { label: 'Andre tilgodehavender (langfristet)', vals: [0.1, 0.05, 0.1] },
      ] },
      { id: 'anl', label: 'Anlægsaktiver i alt', ref: 'Anlægsaktiver', sum: true },
      { id: 'varer', label: 'Varebeholdninger i alt', vals: [1.2, 2.5, 3.2], children: [
        { label: 'Varebeholdninger', vals: [1.2, 2.5, 3.2] },
        { label: 'Ejendomme til videresalg', vals: [0, 0, 0] },
      ] },
      { id: 'tilg', label: 'Tilgodehavender i alt', vals: [3.0, 2.5, 2.9], children: [
        { label: 'Tilgodehavender fra salg af tjenesteydelser', vals: [1.8, 2.15, 2.55] },
        { label: 'Igangværende arbejder', vals: [0.9, 0, 0] },
        { label: 'Tilgodehavender hos tilkn. virksomheder', vals: [0, 0, 0] },
        { label: 'Tilgodehavender hos ass. virksomheder', vals: [0, 0, 0] },
        { label: 'Tilgodehavender hos virk. delt. og ledelse', vals: [0, 0, 0] },
        { label: 'Tilgodehavende selskabsskat', vals: [0, 0, 0] },
        { label: 'Andre tilgodehavender (kortfristet)', vals: [0.2, 0.2, 0.2] },
        { label: 'Periodeafgrænsningsposter (aktiver)', vals: [0.1, 0.15, 0.15] },
        { label: 'Dagsværdi af finansielle instrumenter (aktiver)', vals: [0, 0, 0] },
      ] },
      { id: 'vaerdi', label: 'Værdipapirer', vals: [0, 0, 0] },
      { id: 'likv', label: 'Likvide beholdninger', ref: 'Likvide beholdninger' },
      { label: 'Omsætningsaktiver i alt', ref: 'Omsætningsaktiver', sum: true },
      { id: 'aktiver', label: 'Aktiver i alt', ref: 'Aktiver i alt', sum: true },
      { id: 'ek', label: 'Egenkapital', ref: 'Egenkapital' },
      { label: 'heraf kapitalindskud i året', ref: 'heraf kapitalindskud i året', memo: true },
      { id: 'hens', label: 'Hensatte forpligtelser i alt', vals: [0, 0, 0], children: [
        { label: 'Hensættelser til udskudt skat', vals: [0, 0, 0] },
        { label: 'Andre hensatte forpligtelser', vals: [0, 0, 0] },
      ] },
      { id: 'lang', label: 'Langfristet gæld i alt', ref: 'Langfristet gæld', children: [
        { label: 'Ansvarlig lånekapital', vals: [0, 0, 0] },
        { label: 'Gæld til realkreditinstutter', vals: [0, 0.73, 1.9] },
        { label: 'Gæld til kreditinsitutter (langfristet)', vals: [2.6, 1.87, 1.55] },
        { label: 'Leasingforpligtelser', vals: [0.4, 0.7, 0.65] },
        { label: 'Anden gæld - rentebærende', vals: [0.5, 0.5, 0.5] },
        { label: 'Anden gæld - ikke rentebærende', vals: [0, 0, 0] },
      ] },
      { id: 'kort', label: 'Kortfristet gæld i alt', ref: 'Kortfristet gæld', children: [
        { label: 'Gæld til kreditinsitutter (kortfristet)', vals: [0.3, 0.2, 0.45] },
        { label: 'Kortfristet del af langfristet gæld', vals: [0.5, 0.7, 0.45] },
        { label: 'Leverandører af varer og tjenesteydelser', vals: [1.0, 1.15, 1.3] },
        { label: 'Modtagne forudbetalinger', vals: [0, 0.1, 0.45] },
        { label: 'Gæld til tilknyttede virksomheder', vals: [0, 0, 0] },
        { label: 'Gæld til associerede virksomheder', vals: [0, 0, 0] },
        { label: 'Gæld til virksomhedsdeltagere og ledelse', vals: [0, 0, 0] },
        { label: 'Skyldig selskabsskat', vals: [0, 0, 0.05] },
        { label: 'Anden gæld', vals: [0.6, 0.45, 0.5] },
        { label: 'Periodeafgrænsningsposter (passiver)', vals: [0, 0, 0] },
        { label: 'Dagsværdi af finansielle instrumenter (passiver)', vals: [0, 0, 0] },
      ] },
      { label: 'Gæld i alt', ref: 'Gæld i alt', sum: true },
      { id: 'passiver', label: 'Passiver i alt', sum: true,
        derive: (get) => { const a = get('Egenkapital'), b = get('Gæld i alt'); return a == null || b == null ? null : a + b + (get('Hensatte forpligtelser i alt') || 0); } },
    ],
  },
];

// Kontrol: forskellen mellem summen af detaljerne og årsrapportens total. ✓ når den stemmer.
// annual = kun årskolonnerne (detaljerne findes kun der).
const FIN_CONTROLS = [
  { label: 'Afstemning, årets resultat', annual: true, diff: (v) => v('ebit') + v('netfin') + v('skat') - v('result') },
  { label: 'Afstemning, aktiver', annual: true, diff: (v) => ['immat', 'mat', 'finanl', 'varer', 'tilg', 'vaerdi', 'likv'].reduce((a, k) => a + v(k), 0) - v('aktiver') },
  { label: 'Afstemning, passiver', annual: true, diff: (v) => v('ek') + v('hens') + v('lang') + v('kort') - v('passiver') },
  { label: 'Nulkontrol (aktiver - passiver)', diff: (v) => v('aktiver') - v('passiver') },
];

// Migration: rækkerne i ANNUAL_REPORT efter navn. Stod i financials.jsx sammen med rettelserne;
// står her, så finMapping.js og finEdits.js kan bruge den uden at importere hinanden.
const FIN_ROW_BY_LABEL = {};
ANNUAL_REPORT.groups.forEach(g => g.rows.forEach(r => { FIN_ROW_BY_LABEL[r.label] = r; }));

/* Regnskab v5 (8. oktober 2026): det, den offentlige årsrapport ikke viser. Små virksomheder
   (klasse B) må efter ÅRL § 32 slå omsætning, vareforbrug, andre driftsindtægter og andre
   eksterne omkostninger sammen til én post, bruttofortjenesten. Uden en intern årsrapport står
   disse poster derfor tomme i årskolonnerne (omsætningen kan tastes ind), og grafens serie
   Bruttofortjeneste viser den offentlige bruttofortjeneste.
   rows: rækker i ANNUAL_REPORT; entries: visningsrækker uden ref; childrenOf: visningsrækker,
   hvis detaljer også er skjult. */
const FIN_PUBLIC_HIDDEN = {
  rows: ['Nettoomsætning', 'Vareforbrug', 'Bruttofortjeneste', 'Andre eksterne omkostninger'],
  entries: ['Andre driftsindtægter'],
  childrenOf: ['Omsætning i alt'],
};

// Migration: ejertyperne i ejerlisten (OwnerList i financials.jsx)
const OWNER_KIND = { holding: 'Holdingselskab', fund: 'Fond', person: 'Person' };

// Migration: Trustpilot-sektionens data; eksporten Trustpilot.pdf bruger dem også
const TRUSTPILOT = {
  score: 4.2,
  totalReviews: 127,
  dist: [
    { stars: 5, count: 78 },
    { stars: 4, count: 26 },
    { stars: 3, count: 11 },
    { stars: 2, count: 7 },
    { stars: 1, count: 5 },
  ],
  reviews: [
    { stars: 5, text: "Professionelt team og høj kvalitet på produkterne. Levering til tiden og god kommunikation undervejs.", author: "Klaus M.", date: "2026-05-12" },
    { stars: 4, text: "Generelt gode oplevelser. Responstiden på forespørgsler kunne forbedres.", author: "Mette H.", date: "2026-04-03" },
    { stars: 5, text: "Har samarbejdet med dem i 3 år. Stabil leverandør med god faglig kompetence.", author: "Peter L.", date: "2026-03-18" },
  ],
};

// Modul-eksport
export { FIN_ANNUAL_YEARS, FIN_ACTUAL_Q, FIN_BUDGET_SEP, FIN_BUDGET_Q, ANNUAL_REPORT, FIN_LAYOUT, FIN_CONTROLS, FIN_ROW_BY_LABEL, FIN_PUBLIC_HIDDEN, OWNER_KIND, TRUSTPILOT };
