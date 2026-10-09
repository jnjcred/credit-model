/* Offentlige og interne årsrapporter (9. oktober 2026, Jesper: "eksterne årsrapporter har ikke
   omsætning eller vareforbrug. Det har den interne årsrapport i stedet").

   Indlæses lige efter case_documents.js (bootstrap.js). Sagens årsrapporter i CASE_DOCS var skrevet
   som fulde rapporter. Her bliver de to dokumenter:
   - Aarsrapport_<år>.pdf (CVR, origin 'public'): som Nordhavn offentliggør den efter
     årsregnskabslovens § 32. Nettoomsætning, vareforbrug og andre eksterne omkostninger er
     sammendraget til bruttofortjeneste; noterne om omsætning og vareforbrug, nøgletal på
     omsætningen og omsætningstal i teksten er taget ud (PUBLIC_PATCHES nedenfor).
   - Intern_aarsrapport_<år>.pdf (origin 'uploaded', Kundeupload): den fulde rapport med alle noter
     og en side med specifikationer bag omsætning og omkostninger (annualSpecPage). Den står først
     på sagen, når kunden sender den (DATA.customerDocs), men memoet og kundeportalens demofil
     bruger indholdet. Den lægges sidst i CASE_DOCS, så opslag på type og år finder CVR-udgaven.
   Bruttofortjenesten (§ 32) = dækningsbidrag + andre eksterne omkostninger: 2025 15.900, 2024
   12.900, 2023 10,8, 2022 8,3 (t.kr./mio. kr. som i rapporten). 2019-2021 i femårsoversigterne har
   ikke andre eksterne omkostninger i kilderne; de er sat til 1,0/1,2/1,5 mio. kr. */

/* ── Den interne årsrapports specifikationer (flyttet hertil fra new_case_portal.js) ──────────
   Beløb i t.kr.; summerne er årsrapporternes (ANNUAL_REPORT i financials/finData.js). Kunderne
   2025 er periodetallenes ark Kunder; 2024 og 2023 følger årsrapporternes andele (største kunde 31
   og 24 pct., top 3 62 og 57 pct.; Vestas 4,1 mio. i 4. kvartal 2023). Vareforbrug og andre
   eksterne omkostninger 2024 og 2023 er årsrapport 2024's noter 2 og 4; 2025 er fordelt som 2024,
   med et helt års leje af hallen i Sæby (480 t.kr. om året fra august 2024). */
const ANNUAL_SPEC = {
  2025: {
    customers: [['Vestas Wind Systems A/S', 9860], ['GE Vernova', 8630], ['Siemens Gamesa Renewable Energy', 4520], ['ENERCON GmbH', 2470], ['Nordex Energy SE', 2060], ['Øvrige kunder', 13560]],
    cogs: [['Forbrug af råvarer og hjælpematerialer', 20430], ['Underleverancer og fremmed forarbejdning', 1595], ['Emballage, fragt og told', 885], ['Ændring i lagre af varer under fremstilling', -205], ['Skrot, kassationer og omarbejde', 410], ['Energi til produktionsanlæg (infusion og hærdning)', -515]],
    other: [['Lokaleomkostninger, husleje og vedligehold', 1000], ['Salg, markedsføring og messer', 314], ['IT, software og kommunikation', 284], ['Forsikringer', 197], ['Rådgivning, revision og advokat', 344], ['Autodrift, transport og rejser', 253], ['Øvrige administrationsomkostninger', 208]],
  },
  2024: {
    customers: [['GE Vernova', 10170], ['Vestas Wind Systems A/S', 7220], ['Siemens Gamesa Renewable Energy', 2950], ['Øvrige kunder', 12460]],
    cogs: [['Forbrug af råvarer og hjælpematerialer', 15910], ['Underleverancer og fremmed forarbejdning', 1240], ['Emballage, fragt og told', 690], ['Ændring i lagre af varer under fremstilling', -160], ['Skrot, kassationer og omarbejde', 320], ['Energi til produktionsanlæg (infusion og hærdning)', -400]],
    other: [['Lokaleomkostninger, husleje og vedligehold', 720], ['Salg, markedsføring og messer', 310], ['IT, software og kommunikation', 280], ['Forsikringer', 195], ['Rådgivning, revision og advokat', 340], ['Autodrift, transport og rejser', 250], ['Øvrige administrationsomkostninger', 205]],
  },
  2023: {
    customers: [['GE Vernova', 6720], ['Siemens Gamesa Renewable Energy', 5140], ['Vestas Wind Systems A/S', 4100], ['Øvrige kunder', 12040]],
    cogs: [['Forbrug af råvarer og hjælpematerialer', 13760], ['Underleverancer og fremmed forarbejdning', 1040], ['Emballage, fragt og told', 610], ['Ændring i lagre af varer under fremstilling', -80], ['Skrot, kassationer og omarbejde', 190], ['Energi til produktionsanlæg (infusion og hærdning)', -320]],
    other: [['Lokaleomkostninger, husleje og vedligehold', 590], ['Salg, markedsføring og messer', 275], ['IT, software og kommunikation', 240], ['Forsikringer', 175], ['Rådgivning, revision og advokat', 300], ['Autodrift, transport og rejser', 230], ['Øvrige administrationsomkostninger', 190]],
  },
};
const padR = (s, w) => (s.length > w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
const padL = (s, w) => ' '.repeat(Math.max(0, w - s.length)) + s;
const tkr = (v) => (v < 0 ? '-' : '') + String(Math.abs(Math.round(v))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function annualSpecPage(year) {
  const s = ANNUAL_SPEC[year];
  if (!s) return null;
  const LW = 56, VW = 10, PW = 12;
  const block = (title, rows, totalLabel, share) => {
    const total = rows.reduce((a, r) => a + r[1], 0);
    const pct = (v) => (v / total * 100).toFixed(1).replace('.', ',') + ' pct.';
    const line = (label, v) => padR(label, LW) + padL(tkr(v), VW) + (share ? padL(pct(v), PW) : '');
    return [padR(title, LW) + padL(String(year), VW) + (share ? padL('Andel', PW) : '')]
      .concat(rows.map(r => line(r[0], r[1])))
      .concat([' '.repeat(LW) + '-'.repeat(VW + (share ? PW : 0)), line(totalLabel, total), '']);
  };
  const body = [
    'Intern specifikation til ledelse og långivere. Indgår ikke i den offentliggjorte årsrapport, der efter',
    'årsregnskabslovens § 32 kun viser bruttofortjenesten. Beløb i t.kr.',
    '',
  ].concat(block('Nettoomsætning fordelt på kunder', s.customers, 'Nettoomsætning i alt', true))
    .concat(block('Vareforbrug', s.cogs, 'Vareforbrug i alt', false))
    .concat(block('Andre eksterne omkostninger', s.other, 'Andre eksterne omkostninger i alt', false));
  return { ref: 'Specifikationer', title: 'Specifikationer til resultatopgørelsen ' + year + ' (intern)', body: body.join('\n') };
}

/* ── De offentlige udgaver ──────────────────────────────────────────────────
   Pr. dokument og side: cut = [fra, til) (linjen, der begynder med "fra", til linjen, der begynder
   med "til"; uden "til": resten af siden), rep = [tekst, ny tekst] (ny tekst '' fjerner teksten).
   En tekst, der ikke findes, giver en advarsel i konsollen. */
const PUBLIC_PATCHES = {
  'Aarsrapport_2025.pdf': {
    's. 4': { rep: [
      ['2025 blev selskabets hidtil største år. Nettoomsætningen steg fra t.DKK 32.800 til t.DKK 41.100, svarende til en vækst på 25,3 pct. (2024: 17,1 pct.). Væksten kan',
        '2025 blev selskabets hidtil største år målt på aktivitet og indtjening. Væksten kan'],
      ['Bruttofortjenesten udgjorde t.DKK 18.500 mod t.DKK 15.200 året før. Bruttomarginen faldt fra 46,3 pct. til 45,0 pct. Faldet skyldes stigende priser på kulfiber og epoxyharpiks, der kun delvis er blevet videreført',
        'Bruttofortjenesten udgjorde t.DKK 15.900 mod t.DKK 12.900 året før, en stigning på 23,3 pct. Indtjeningen er belastet af stigende priser på kulfiber og epoxyharpiks, der kun delvis er blevet videreført'],
      [' Andre eksterne omkostninger udgjorde t.DKK 2.600 mod t.DKK 2.300.', ''],
      [' EBITDA-marginen var uændret 5,8 pct.', ''],
      ['(omsætning 39-42 mio. kr. og EBITDA 2,2-2,6 mio. kr.)', '(EBITDA 2,2-2,6 mio. kr.)'],
      ['Ledelsen forventer for 2026 en nettoomsætning i niveauet 44-45 mio. kr. og et EBITDA', 'Ledelsen forventer for 2026 en fortsat aktivitetsvækst og et EBITDA'],
      [' Realiseret nettoomsætning i første kvartal 2026 udgjorde 10,6 mio. kr.', ''],
    ] },
    's. 6': {
      cut: [['NOTE 1 NETTOOMSÆTNING', 'NOTE 2 PERSONALEOMKOSTNINGER']],
      rep: [
        ['  1   Nettoomsætning                                  41.100      32.800\n      Vareforbrug                                    -22.600     -17.600\n      Bruttofortjeneste                               18.500      15.200',
          '      Bruttofortjeneste                               15.900      12.900'],
        ['  3   Andre eksterne omkostninger                     -2.600      -2.300\n', ''],
        ['NOTE 3 ANDRE EKSTERNE OMKOSTNINGER', 'NOTE 3 HONORAR TIL REVISOR'],
        ['herunder præsentation af den artsopdelte resultatopgørelse samt supplerende noteoplysninger om personale, risici og samfundsansvar.',
          'herunder supplerende noteoplysninger om personale, risici og samfundsansvar. Nettoomsætning, vareforbrug og andre eksterne omkostninger er efter årsregnskabslovens § 32 sammendraget til bruttofortjeneste.'],
      ] },
    's. 7': { rep: [['Gennemsnitlig debitordage udgør 23 dage (2024: 24 dage). ', '']] },
    's. 9': { rep: [
      ['Nettoomsætning                19,4    23,1    28,0    32,8    41,1\n', ''],
      ['Bruttofortjeneste              8,4    10,0    12,8    15,2    18,5', 'Bruttofortjeneste              6,9     8,3    10,8    12,9    15,9'],
      ['Omsætningsvækst, pct.         30,2    19,1    21,2    17,1    25,3\n', ''],
      ['Bruttomargin, pct.            43,3    43,3    45,7    46,3    45,0\n', ''],
      ['EBITDA-margin, pct.            3,1     3,9     4,6     5,8     5,8\n', ''],
      ['Overskudsgrad, pct.            0,5     1,3     2,1     3,4     3,4\n', ''],
      ['Omsætning pr. medarbejder,\nt.DKK                           359     373     394     421     489',
        'Bruttofortjeneste pr. medarb.,\nt.DKK                           128     134     152     165     189'],
      ['Selskabet har i femårsperioden mere end fordoblet nettoomsætningen fra 19,4 mio. kr. i 2021 til 41,1 mio. kr. i 2025, svarende til en gennemsnitlig årlig vækst på 20,6 pct.',
        'Selskabet har i femårsperioden mere end fordoblet bruttofortjenesten fra 6,9 mio. kr. i 2021 til 15,9 mio. kr. i 2025, svarende til en gennemsnitlig årlig vækst på 23,2 pct.'],
      [', og EBITDA-marginen er steget fra 3,1 pct. til 5,8 pct. Marginudvidelsen skyldes', ' Fremgangen skyldes'],
      ['I 2025 var marginen uændret i forhold til 2024, idet effekten af højere volumen blev modsvaret af stigende kulfiberpriser.', 'I 2025 blev effekten af højere volumen delvis modsvaret af stigende kulfiberpriser.'],
      ['steget i takt med omsætningen.', 'steget i takt med aktiviteten.'],
      [', svarende til 14,0 pct. af omsætningen mod 14,2 pct. i 2024', ''],
      ['Bruttomargin: Bruttofortjeneste x 100 / Nettoomsætning.\nEBITDA-margin: Resultat før af- og nedskrivninger x 100 / Nettoomsætning.\nOverskudsgrad: Resultat før finansielle poster x 100 / Nettoomsætning.\n', ''],
    ] },
    's. 11': { rep: [
      ['Energiintensitet, MWh pr. mio. kr.\nomsætning                                 75,9        89,0\n', ''],
      ['Energiintensiteten er forbedret med 14,7 pct. i forhold til 2024.', 'Energiforbruget pr. produceret enhed er forbedret i forhold til 2024.'],
      ['Mål: energiintensitet under 70 MWh pr. mio. kr. omsætning i 2027.', 'Mål: yderligere 10 pct. lavere energiforbrug pr. produceret enhed i 2027.'],
      [', svarende til 0,36 pct. af omsætningen', ''],
    ] },
    'note 18': { rep: [
      ['Selskabets omsætning er koncentreret på et lille antal store OEM-kunder. Fordelingen af nettoomsætningen på de største kunder er som følger:\n\nKunde                        2025, mio. kr.   Andel      2024, andel\nGE Vernova                             8,6    21 pct.       31 pct.\nVestas                                 9,9    24 pct.       22 pct.\nSiemens Gamesa                         4,5    11 pct.        9 pct.\nTop 3 i alt                           23,0    56 pct.       62 pct.\nØvrige kunder (17 kunder)             18,1    44 pct.       38 pct.\nI alt                                 41,1   100 pct.      100 pct.',
        'Selskabets salg er koncentreret på et lille antal store OEM-kunder. Vestas tegnede sig i 2025 for 24 pct. af salget (2024: 22 pct.), GE Vernova for 21 pct. (2024: 31 pct.) og Siemens Gamesa for 11 pct. (2024: 9 pct.), i alt 56 pct. på de tre største kunder (2024: 62 pct.).'],
      [' Vareforbruget udgjorde t.DKK 22.600 svarende til 55,0 pct. af nettoomsætningen (2024: 53,7 pct.).', ''],
      ['Stigningen forklarer størstedelen af faldet i bruttomarginen fra 46,3 pct. til 45,0 pct.', 'Stigningen har lagt et mærkbart pres på bruttofortjenesten.'],
      ['Selskabet fakturerer 41 pct. af nettoomsætningen i fremmed valuta, svarende til 16,9 mio. kr. Fordelingen er som følger:\n\nValuta      Omsætning 2025, mio. kr.   Andel af omsætning\nUSD                              10,7            26 pct.\nEUR                               6,2            15 pct.\nDKK                              24,2            59 pct.\nI alt                            41,1           100 pct.',
        'Selskabet fakturerer 41 pct. af salget i fremmed valuta, heraf 26 pct. i USD og 15 pct. i EUR. Resten faktureres i DKK.'],
      ['ca. 8,9 mio. kr. af vareforbruget denomineret', 'ca. 8,9 mio. kr. af indkøbet denomineret'],
      ['Vækst i omsætningen binder likviditet', 'Vækst i aktiviteten binder likviditet'],
    ] },
  },
  'Aarsrapport_2024.pdf': {
    's. 2': { rep: [
      ['herunder udarbejdelse af pengestrømsopgørelse og udvidede noteoplysninger om nettoomsætningens fordeling.',
        'herunder udarbejdelse af pengestrømsopgørelse. Nettoomsætning, vareforbrug og andre eksterne omkostninger er efter årsregnskabslovens § 32 sammendraget til bruttofortjeneste.'],
      ['\nSpecifikationer til brug for kreditgivere (usikret)   15', ''],
    ] },
    's. 4': { rep: [
      ['Nettoomsætningen steg fra 28,0 mio. kr. i 2023 til 32,8 mio. kr. i 2024, svarende til en vækst på 17,1 pct. Bruttofortjenesten steg fra 12,8 mio. kr. til 15,2 mio. kr., og bruttomarginen forbedredes fra 45,7 pct. til 46,3 pct. som følge af bedre udnyttelse',
        'Bruttofortjenesten steg fra 10,8 mio. kr. i 2023 til 12,9 mio. kr. i 2024, svarende til en stigning på 19,4 pct., som følge af højere aktivitet, bedre udnyttelse'],
      [', svarende til en EBITDA-margin på 5,8 pct. mod 4,6 pct. året før', ''],
      [', svarende til 33,5 pct. af nettoomsætningen mod 33,9 pct. året før. Omsætningen pr. medarbejder steg fra 0,394 mio. kr. til 0,421 mio. kr.', '.'],
      ['Omsætningen fordelte sig i 2024 med 31 pct.', 'Salget fordelte sig i 2024 med 31 pct.'],
      ['36 pct. af nettoomsætningen blev i 2024', '36 pct. af salget blev i 2024'],
      ['Ledelsen forventer for 2025 en nettoomsætning i niveauet 39 til 42 mio. kr. og et EBITDA', 'Ledelsen forventer for 2025 en fortsat aktivitetsvækst og et EBITDA'],
    ] },
    's. 6': {
      cut: [['NOTE 1  NETTOOMSÆTNING', 'NOTE 3  PERSONALEOMKOSTNINGER'], ['NOTE 4  ANDRE EKSTERNE OMKOSTNINGER', 'NOTE 5  FINANSIELLE OMKOSTNINGER']],
      rep: [
        ['Nettoomsætning                               1    32.800      28.000\nVareforbrug                                  2   -17.600     -15.200\nBruttofortjeneste                                 15.200      12.800',
          'Bruttofortjeneste                                 12.900      10.800'],
        ['Andre eksterne omkostninger                  4    -2.300      -2.000\n', ''],
      ] },
    's. 7': { rep: [
      [' Lagerets omsætningshastighed svarer til 47,7 dages forbrug (2023: 45,6 dage).', ''],
      [' Gennemsnitlig kredittid udgjorde 24,0 dage (2023: 25,9 dage).', ''],
    ] },
    's. 9': { rep: [
      ['Nettoomsætning                                    32.800      28.000\n', ''],
      ['Bruttofortjeneste                                 15.200      12.800', 'Bruttofortjeneste                                 12.900      10.800'],
      ['Omsætningsvækst                                    17,1%       21,2%\nBruttomargin                                       46,3%       45,7%\nEBITDA-margin                                       5,8%        4,6%\nOverskudsgrad (EBIT-margin)                         3,4%        2,1%\nNettomargin                                         2,1%        1,1%\n', ''],
      ['Personaleomkostninger i pct. af omsætning          33,5%       33,9%\nDebitordage                                         24,0        25,9\nLagerdage (af vareforbrug)                          47,7        45,6\nKreditordage                                        23,8        26,4\n', ''],
      ['Nettoomsætning pr. medarbejder (t.kr.)               421         394', 'Bruttofortjeneste pr. medarbejder (t.kr.)            165         152'],
      ['stiger nogenlunde proportionalt med omsætningen.', 'stiger nogenlunde proportionalt med aktiviteten.'],
      [', svarende til 11,6 pct. af nettoomsætningen mod 10,0 pct. i 2023', ''],
    ] },
  },
  'Aarsrapport_2023.pdf': {
    's. 2': { rep: [
      ['herunder oplysning om hoved- og nøgletal for fem år samt specifikation af nettoomsætningen på markeder.',
        'herunder oplysning om hoved- og nøgletal for fem år. Nettoomsætning, vareforbrug og andre eksterne omkostninger er efter årsregnskabslovens § 32 sammendraget til bruttofortjeneste.'],
    ] },
    's. 4': { rep: [
      ['Nettoomsætningen steg fra 23,1 mio. kr. i 2022 til 28,0 mio. kr. i 2023, svarende til en vækst på 21,2 pct. Væksten er drevet dels af opstarten hos Vestas Blades, som bidrog med 4,1 mio. kr. i fjerde kvartal, dels',
        'Aktiviteten steg markant i 2023, drevet dels af opstarten hos Vestas Blades i fjerde kvartal, dels'],
      ['Bruttofortjenesten udgjorde 12,8 mio. kr. mod 10,0 mio. kr. i 2022, svarende til en bruttomargin på 45,7 pct. mod 43,3 pct. året før.', 'Bruttofortjenesten udgjorde 10,8 mio. kr. mod 8,3 mio. kr. i 2022.'],
      ['Marginen er omvendt belastet', 'Indtjeningen er omvendt belastet'],
      ['Andre eksterne omkostninger udgjorde 2,0 mio. kr. mod 1,7 mio. kr. i 2022 og er blandt andet påvirket', 'Bruttofortjenesten er blandt andet påvirket'],
      ['udgjorde i 2023 24 pct. af nettoomsætningen', 'udgjorde i 2023 24 pct. af salget'],
      ['Ledelsen forventer for 2024 en nettoomsætning i niveauet 32 til 34 mio. kr. og et resultat', 'Ledelsen forventer for 2024 en fortsat aktivitetsvækst og et resultat'],
    ] },
    's. 6': {
      cut: [['Note 1. Nettoomsætning', 'Note 2. Personaleomkostninger']],
      rep: [
        ['  1   Nettoomsætning                              28,0        23,1\n      Vareforbrug                                -15,2       -13,1\n      Bruttofortjeneste                           12,8        10,0',
          '      Bruttofortjeneste                           10,8         8,3'],
        ['  3   Andre eksterne omkostninger                 -2,0        -1,7\n', ''],
        ['Note 3. Andre eksterne omkostninger\nPosten omfatter lokaleomkostninger, energi, vedligeholdelse af produktionsanlæg, forsikringer, ekstern testning og certificering, salgs- og rejseomkostninger samt administrations- og rådgivningsomkostninger. Posten indeholder omkostninger til ekstern testning og certificering i forbindelse med leverandørkvalifikation på 0,4 mio. kr. (2022: 0,3 mio. kr.).\n\n',
          'Note 3. Honorar til revisor\n'],
        ['indregnet under vareforbrug med 0,0 mio. kr.', 'indregnet under bruttofortjenesten med 0,0 mio. kr.'],
      ] },
    's. 7': { rep: [[' Den gennemsnitlige kredittid udgør 24 dage mod 27 dage i 2022.', '']] },
    's. 9': { rep: [
      ['Nettoomsætning                  28,0    23,1    19,4    14,9    12,6\n', ''],
      ['Bruttofortjeneste               12,8    10,0     8,4     6,6     5,5', 'Bruttofortjeneste               10,8     8,3     6,9     5,4     4,5'],
      ['Omsætningsvækst                 21,2    19,1    30,2    18,3      n/a\nBruttomargin                    45,7    43,3    43,3    44,3     43,7\nEBITDA-margin                    4,6     3,9     3,1     4,0      3,2\nOverskudsgrad (EBIT-margin)      2,1     1,3     0,5     1,3      0,8\n', ''],
      ['Omsætning pr. medarbejder\n(t.kr.)                          394     373     359     317     307\n', ''],
      ['medarbejder (t.kr.)              180     161     156     140     134', 'medarbejder (t.kr.)              152     134     128     115     110'],
      ['Gennemsnitlig kredittid,\ndebitorer (dage)                  24      27      31      30       33\nVarelagerets omsætnings-\nhastighed (gange)                8,0     6,9     6,6     6,4      6,2\n', ''],
      ['Omsætningen er mere end fordoblet i forhold til 2019 og er i den viste periode vokset med en gennemsnitlig årlig vækst på 22,1 pct. Væksten i 2023 på 21,2 pct. skyldes',
        'Bruttofortjenesten er mere end fordoblet i forhold til 2019 og er i den viste periode vokset med en gennemsnitlig årlig vækst på 24,5 pct. Væksten i 2023 skyldes'],
      ['Bruttomarginen har været bemærkelsesværdigt stabil i hele perioden i intervallet 43,3 pct. til 45,7 pct., hvilket afspejler', 'Bruttofortjenesten er vokset hvert år i perioden, hvilket afspejler'],
      ['EBITDA-marginen er derimod mere svingende og udgjorde i 2021 og 2022 henholdsvis 3,1 pct. og 3,9 pct. som følge af opnormering af organisationen og omkostninger til kvalifikationsforløbet, der endnu ikke gav omsætning i de pågældende år. I 2023 er marginen løftet til 4,6 pct.',
        'EBITDA har derimod været mere svingende som følge af opnormering af organisationen og omkostninger til kvalifikationsforløbet, der endnu ikke gav indtægter i 2021 og 2022. I 2023 er EBITDA løftet til 1,3 mio. kr.'],
      ['Bruttomargin: Bruttofortjeneste i procent af nettoomsætning.\nEBITDA-margin: Resultat før af- og nedskrivninger i procent af nettoomsætning.\nOverskudsgrad: Resultat før finansielle poster i procent af nettoomsætning.\n', ''],
      ['Omsætning pr. medarbejder: Nettoomsætning divideret med gennemsnitligt antal beskæftigede.\nVarelagerets omsætningshastighed: Vareforbrug divideret med gennemsnitlig varebeholdning.',
        'Bruttofortjeneste pr. medarbejder: Bruttofortjeneste divideret med gennemsnitligt antal beskæftigede.'],
      [' Nøgletal for 2019 vedrørende omsætningsvækst er ikke opgjort, da sammenligningstal ikke indgår i oversigten.', ''],
    ] },
  },
};

function applyPatch(name, page, patch) {
  let body = String(page.body || '');
  (patch.cut || []).forEach(([from, to]) => {
    const i = body.indexOf(from);
    const j = to ? body.indexOf(to, i + 1) : body.length;
    if (i < 0 || j < 0) { try { console.warn('Offentlig årsrapport: fandt ikke afsnittet', name, page.ref, from); } catch (e) {} return; }
    body = body.slice(0, i) + body.slice(j);
  });
  (patch.rep || []).forEach(([a, b]) => {
    if (body.indexOf(a) < 0) { try { console.warn('Offentlig årsrapport: fandt ikke teksten', name, page.ref, a.slice(0, 60)); } catch (e) {} return; }
    body = body.split(a).join(b);
  });
  return Object.assign({}, page, { body });
}

(function () {
  const docs = window.CASE_DOCS || [];
  const internal = [];
  docs.forEach((d, i) => {
    const m = /^Aarsrapport_(\d{4})\.pdf$/.exec(d.name || '');
    if (!m || d.origin !== 'public') return;
    const year = Number(m[1]);
    const spec = annualSpecPage(year);
    internal.push(Object.assign({}, d, {
      id: 'intern-' + d.id, name: 'Intern_aarsrapport_' + year + '.pdf', origin: 'uploaded', sourceLabel: 'Kundeupload',
      meta: 'Intern årsrapport ' + year + ' med alle noter og specifikationer - ' + String(d.meta || '').replace(/ - \d+ sider/, ''),
      pages: d.pages.map(p => Object.assign({}, p)).concat(spec ? [spec] : []),
    }));
    const patches = PUBLIC_PATCHES[d.name] || {};
    docs[i] = Object.assign({}, d, {
      meta: String(d.meta || '').replace('klasse B med tilvalg', 'klasse B, § 32'),
      pages: d.pages.map(p => (patches[p.ref] ? applyPatch(d.name, p, patches[p.ref]) : p)),
    });
  });
  internal.forEach(d => docs.push(d));
  window.CASE_DOCS = docs;
})();

export { ANNUAL_SPEC, annualSpecPage, PUBLIC_PATCHES };
