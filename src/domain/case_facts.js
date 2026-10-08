/* ─────────────────────────────────────────────────────────────────────────────
   Sagens faktaark (Nordhavn Composite, sag 1)

   Ét struktureret sted for det, der indstilles: facilitet, beløb, løbetid,
   betingelser, covenants, vigtige datoer, røde flag, nøgletal og kendte
   uoverensstemmelser i kildematerialet. Memoets side 1, beslutningspanelet på
   Overblik, klarhedstjekket og sagskortene læser herfra, så de ikke kan blive
   uenige med hinanden.

   Kilden til hver oplysning er dokumenterne i src/case_documents.js
   (window.CASE_DOCS). `source` er { doc, ref } og peger på et dokument og en
   side, der findes der. Ingen dato i dette ark eller i dokumenterne må ligge
   efter `asOf`, medmindre den er fremadrettet (frist, plan eller vilkår) og
   har status 'kommende'.

   Beløb står i hele kroner (DKK), procenter som tal (47.3 = 47,3 %), datoer
   som yyyy-mm-dd. Tekstfelter har en engelsk udgave med suffikset En
   (text/textEn, label/labelEn osv.), så skærmene kan vise begge sprog.

   Ejes af indholdsagenten. Indlæses efter case_documents.js og data.js.
   ──────────────────────────────────────────────────────────────────────────── */
(function () {
  var AR25 = 'Aarsrapport_2025.pdf', AR24 = 'Aarsrapport_2024.pdf', PER = 'Periodetal_jan-aug_2026.xlsx',
      BUD = 'Budget_2026-28_v3.xlsx', BANK = 'Bankansoegning_Nordjyske_Bank.pdf', GE = 'GE_Vernova_rammekontrakt.pdf',
      SIK = 'Sikkerhedsdokumenter.pdf', EJ = 'Ejerbog_2026.pdf', RAT = 'Ratingberegning_2026-0184.pdf';
  var src = function (doc, ref) { return { doc: doc, ref: ref }; };

  // Kildevisning (memoets kildehenvisninger, tooltip og kildeviser, kildeknapper,
  // forhåndsvisning i Dokumenter) er slået fra i første version. Sæt til true for
  // at få det hele tilbage; koden er ikke fjernet.
  window.CW_SOURCE_VIEW = false;

  // Dokumenter, der er skjult overalt (lister, memoets kildegrundlag, AI'en): eksterne markedsrapporter.
  // Demoen henter ikke dokumenter fra nettet, så rapporten var kun en opdigtet prøve. Fjern id'et
  // fra listen for at få den tilbage (memoets henvisninger til den er gjort til almindelig tekst).
  window.CW_HIDDEN_DOCS = ['windeurope-brancherapport-2026'];
  window.CASE_DOCS = (window.CASE_DOCS || []).filter(function (d) { return window.CW_HIDDEN_DOCS.indexOf(d.id) < 0; });
  if (!window.CW_SOURCE_VIEW) document.documentElement.classList.add('no-source-view');

  // Credit memo i piloten (2. oktober 2026). 'copilot' (standard): fanen Credit
  // memo er en side, hvor rådgiveren henter sagens materiale og skriver memoet i
  // Word med Copilot, og Indstilling er skjult. 'builtin': det indbyggede memo og
  // indstillingen, gemt uændret (memo.jsx, WSIndstil). Skiftes i Tweaks; nøglen
  // er ikke en kabul:-nøgle, så Nulstil demo ikke skifter tilstand.
  window.CW_MEMO_MODE = (function () {
    try { return localStorage.getItem('cw_memo_mode') === 'builtin' ? 'builtin' : 'copilot'; } catch (e) { return 'copilot'; }
  })();

  window.CASE_FACTS = {
    // Sagens "pr. dato": memoets dato og den seneste kilde (bankens tillæg er af 23.9.2026). yyyy-mm-dd.
    asOf: '2026-09-25',

    // Det der ansøges om, i bankens egne ord (ansøgningen og tillægget)
    application: {
      product: 'EIFO-eksportkaution',
      productEn: 'EIFO export guarantee',
      applicant: 'Nordjyske Bank A/S på vegne af Nordhavn Composite A/S',
      applicantEn: 'Nordjyske Bank A/S on behalf of Nordhavn Composite A/S',
      amount: 3600000,
      purpose: 'Arbejdskapital til Block Island Phase II for GE Vernova (rammeaftale GEV-BI-2025-0447): materialer 2,8 mio., igangværende arbejder 2,4 mio. og arbejdskapital frem til GE Vernovas betaling i 4. kvartal 1,8 mio., i alt 7,0 mio.',
      purposeEn: 'Working capital for Block Island Phase II for GE Vernova (framework agreement GEV-BI-2025-0447): materials DKK 2.8 million, work in progress DKK 2.4 million and working capital until GE Vernova\'s Q4 payment DKK 1.8 million, DKK 7.0 million in total.',
      capitalNeed: 7000000,
      newExternalFinancing: 5200000,
      date: '2026-06-02',
      amended: '2026-09-23',
      source: src(BANK, 's. 1'),
      sources: [src(BANK, 's. 1'), src(BANK, 's. 5'), src(BUD, 'linje 197')],
    },

    // Det der indstilles
    facility: {
      instrument: 'EIFO-eksportkaution',
      instrumentEn: 'EIFO export guarantee',
      facilityType: 'Revolverende produktions- og eksportkredit i Nordjyske Bank',
      facilityTypeEn: 'Revolving production and export credit with Nordjyske Bank',
      bank: 'Nordjyske Bank A/S',
      bankContact: 'Lars Thomsen, erhvervsrådgiver, lth@nordjyskebank.dk',
      facilityAmount: 4500000,
      eifoShare: 0.8,
      eifoAmount: 3600000,
      bankUncovered: 900000,
      tenorMonths: 30,
      start: '2026-11-01',
      end: '2029-04-30',
      ranking: 'pari passu, sidestillet med banken i pantet og ikke efterstillet',
      rankingEn: 'pari passu, ranking equally with the bank in the collateral and not subordinated',
      pricing: 'CIBOR3 + 3,00 %',
      pricingEn: 'CIBOR3 + 3.00%',
      premium: '1,10 % p.a.',
      premiumEn: '1.10% p.a.',
      drawLimits: 'Maks. træk 3,0 mio. fra 1. januar til 31. marts 2027 og 2,0 mio. fra 30. juni 2027',
      drawLimitsEn: 'Maximum drawing DKK 3.0 million from 1 January to 31 March 2027 and DKK 2.0 million from 30 June 2027',
      // Bankens samlede engagement efter bevilling
      bankFacilities: [
        { name: 'Eksportfacilitet (ny)', nameEn: 'Export facility (new)', amount: 4500000, until: '2029-04-30' },
        { name: 'Driftskredit, udvidet fra 1,5 mio.', nameEn: 'Operating credit, increased from DKK 1.5 million', amount: 2200000, until: '2027-06-30' },
        { name: 'Anlægslån (uændret)', nameEn: 'Term loan (unchanged)', amount: 1800000, until: null },
      ],
      grossExposure: 8500000,
      bankNetRisk: 4900000,
      bankCommitment: { date: '2026-09-10', letter: '2026-09-23', conditionalUntil: '2026-10-31' },
      // Faciliteten er defineret i ansøgningen (s. 1); tillægget (s. 5) siger kun "uændrede beløb og priser"
      source: src(BANK, 's. 1'),
      // Kilde pr. række i indstillingsboksen: den side, hvor oplysningen står ordret
      refs: {
        facility: src(BANK, 's. 1'),  // revolverende produktions- og eksportkredit, 4,5 mio.
        eifo: src(BANK, 's. 1'),      // 3,6 mio., 80 pct.
        tenor: src(BANK, 's. 5'),     // 1. november 2026 til 30. april 2029 (30 mdr.)
        ranking: src(BANK, 's. 1'),   // pari passu, sidestillet i pantet, ikke efterstillet
        pricing: src(BANK, 's. 4'),   // CIBOR3 + 3,00 pct.point, præmie 1,10 pct. p.a.
      },
      sources: [src(BANK, 's. 1'), src(BANK, 's. 4'), src(BANK, 's. 5')],
    },

    // Kreditindstillingen i udkastet (memoets afsnit 3 og 6). Skønnet er rådgiverens eget og står i
    // ratingudskriften (Ratingberegning_2026-0184.pdf); betingelserne B1-B5 står i bankens tillæg.
    recommendation: {
      text: 'Udkast: indstilles til bevilling med samlet risiko Middel/Høj og rating BB (BB+ nedjusteret ét trin for kundekoncentration), betinget af B1-B5, tinglyste allonger og tingbogsattest før første udbetaling',
      textEn: 'Draft: recommended for approval with overall risk Medium/High and rating BB (BB+ downgraded one notch for customer concentration), subject to B1-B5, registered riders and a land register certificate before the first disbursement',
      risk: 'Middel/Høj', riskEn: 'Medium/High', rating: 'BB', ratingModel: 'BB+',
      // Ratingmodellens udskrift: s. 1 beregningen (BB+, score 6,2), s. 2 override, BB og samlet risiko
      ratingSource: src(RAT, 's. 2'), ratingModelSource: src(RAT, 's. 1'),
      // Indstillingen i hovedtræk står på ratingudskriftens s. 2; betingelserne B1-B5 i bankens tillæg (s. 5)
      section: 'conclusion', source: src(RAT, 's. 2'), sources: [src(RAT, 's. 2'), src(BANK, 's. 5')],
    },

    // Betingelser før første udbetaling: { id, text, status: 'åben'|'opfyldt', date?, source }
    conditions: [
      { id: 'B1', text: 'Underskrevet selskabskaution fra Nordhavn Holding ApS, maks. 2,0 mio., med selskabsretlig beslutning',
        textEn: 'Signed company guarantee from Nordhavn Holding ApS, max. DKK 2.0 million, with a corporate resolution',
        status: 'åben', note: 'Udkast version 3 af 22. juli 2026, ikke underskrevet', noteEn: 'Draft version 3 of 22 July 2026, not signed', source: src(SIK, 'S5') },
      { id: 'B2', text: 'Tilbagetrædelseserklæring fra Anders Christensen på anpartshaverlånet på 0,5 mio.',
        textEn: 'Subordination declaration from Anders Christensen on the DKK 0.5 million shareholder loan',
        status: 'åben', note: 'Afgives efter tilkendegivelse ved etablering', noteEn: 'To be given at establishment according to the borrower', source: src(BANK, 's. 5') },
      { id: 'B3', text: 'Endeligt kautionstilsagn fra EIFO senest 31. oktober 2026',
        textEn: 'Final guarantee commitment from EIFO by 31 October 2026',
        status: 'åben', note: 'Denne indstilling', noteEn: 'This recommendation', source: src(BANK, 's. 5') },
      { id: 'B4', text: 'Terminssikring af mindst 70 % af den resterende kontraktsum (C6) eller bindende ordre herom',
        textEn: 'Forward hedging of at least 70% of the remaining contract value (C6) or a binding order to that effect',
        status: 'åben', note: 'Bankens tilbud fremsendt 15. september 2026', noteEn: 'Bank offer sent on 15 September 2026', source: src(BANK, 's. 5') },
      { id: 'B5', text: 'Bekræftet kopi af rammeaftale GEV-BI-2025-0447 med betalingsbetingelser',
        textEn: 'Certified copy of framework agreement GEV-BI-2025-0447 with payment terms',
        status: 'opfyldt', date: '2026-09-16', note: 'Modtaget inkl. tillæg nr. 1 af 14. juli 2026', noteEn: 'Received including amendment no. 1 of 14 July 2026', source: src(BANK, 's. 5') },
      // EIFO's egne krav inden udstedelse af police (Bilag 1)
      { id: 'E1', text: 'Tinglyste allonger om EIFOs sidestilling i løsørepant, ejerpantebrev og virksomhedspant',
        textEn: 'Registered riders on EIFO ranking equally in the chattel mortgage, owner\'s mortgage and floating charge',
        status: 'åben', note: 'Foreligger ikke pr. 4. august 2026', noteEn: 'Not in place as at 4 August 2026', source: src(SIK, 'S1') },
      { id: 'E2', text: 'Tingbogsattest for Havnegade 42, der viser realkreditlånets prioritet',
        textEn: 'Land register certificate for Havnegade 42 showing the ranking of the mortgage loan',
        status: 'åben', note: 'Prioritetsoversigten i S2 medtager ikke realkreditlånet', noteEn: 'The ranking overview in S2 omits the mortgage loan', source: src(SIK, 'S2') },
    ],

    // Covenants: { id, text, limit, forecast, source }. Første måling 31.12.2026.
    covenants: [
      { id: 'C1', text: 'Soliditet min. 35,0 %; anpartshaverlånet medregnes ikke uden tilbagetrædelseserklæring',
        textEn: 'Equity ratio min. 35.0%; the shareholder loan does not count as equity without a subordination declaration',
        limit: 35.0, unit: '%', actual: 45.0, actualAt: '2026-08-31', forecast: 47.3, forecastAt: '2026-12-31', source: src(BANK, 's. 4') },
      { id: 'C2', text: 'Gæld i alt / EBITDA (seneste 12 måneder) maks. 4,0',
        textEn: 'Total debt / EBITDA (last 12 months) max. 4.0',
        limit: 4.0, unit: 'x', forecast: 3.0, forecastAt: '2026-12-31', source: src(BANK, 's. 4') },
      { id: 'C3', text: 'Ingen udlodning, så længe faciliteten er trukket med mere end 1,0 mio., og aldrig over 30 % af årets resultat',
        textEn: 'No distributions while the facility is drawn by more than DKK 1.0 million, and never more than 30% of the year\'s profit',
        source: src(BANK, 's. 4') },
      { id: 'C4', text: 'Ingen afdrag, renter eller andre betalinger på anpartshaverlånet i kautionsperioden',
        textEn: 'No repayments, interest or other payments on the shareholder loan during the guarantee period',
        source: src(BANK, 's. 4') },
      { id: 'C5', text: 'Genforhandling, hvis mere end 30 % af kapitalen skifter ejer, eller Anders Holding ApS ophører med at være majoritetsejer',
        textEn: 'Renegotiation if more than 30% of the capital changes hands or Anders Holding ApS ceases to be the majority owner',
        source: src(BANK, 's. 4') },
      { id: 'C6', text: 'Mindst 70 % af den resterende kontraktsum terminssikres senest 1. december 2026; skriftlig valutapolitik vedtages senest 30. november 2026',
        textEn: 'At least 70% of the remaining contract value hedged by 1 December 2026; written currency policy adopted by 30 November 2026',
        deadline: '2026-11-30', hedgeDeadline: '2026-12-01', source: src(BANK, 's. 5') },
    ],
    covenantFirstTest: '2026-12-31',

    // Vigtige datoer: { date, text, status: 'kommende'|'passeret'|'bekræftet', source }
    keyDates: [
      { date: '2025-12-09', text: 'Rammeaftale GEV-BI-2025-0447 med GE Vernova underskrevet', textEn: 'Framework agreement GEV-BI-2025-0447 with GE Vernova signed', status: 'bekræftet', source: src(GE, 's. 1') },
      { date: '2026-03-17', text: 'Forudbetaling fra GE Vernova (T1) på USD 1.245.000 modtaget', textEn: 'Prepayment from GE Vernova (T1) of USD 1,245,000 received', status: 'bekræftet', source: src(GE, '§4') },
      { date: '2026-05-27', text: 'DL-1 leveret (milepæl M2)', textEn: 'DL-1 delivered (milestone M2)', status: 'bekræftet', source: src(GE, '§3') },
      { date: '2026-06-02', text: 'Bankens ansøgning om eksportkaution sendt til EIFO, sag oprettet', textEn: 'Bank\'s application for an export guarantee sent to EIFO, case opened', status: 'bekræftet', source: src(BANK, 's. 1') },
      { date: '2026-06-30', text: 'Bankens første bevilling bortfaldt, da kautionstilsagn ikke forelå', textEn: 'The bank\'s first approval lapsed as no guarantee commitment was in place', status: 'passeret', source: src(BANK, 's. 5') },
      { date: '2026-09-10', text: 'Banken fornyede bevillingen med etablering 1. november 2026', textEn: 'The bank renewed its approval with establishment on 1 November 2026', status: 'bekræftet', source: src(BANK, 's. 5') },
      { date: '2026-09-21', text: 'Bankens erklæring om GE Vernovas ejendomsret afgivet (rammeaftalens §4.7, frist 30. september)', textEn: 'Bank\'s declaration on GE Vernova\'s title given (framework agreement §4.7, deadline 30 September)', status: 'bekræftet', source: src(BANK, 's. 5') },
      { date: '2026-09-22', text: 'DL-2, kritisk milepæl M3, leveret DAP Cherbourg, tre dage før fristen 25. september 2026', textEn: 'DL-2, critical milestone M3, delivered DAP Cherbourg, three days before the deadline of 25 September 2026', status: 'bekræftet', delivered: '2026-09-22', deadline: '2026-09-25', source: src(BANK, 's. 5') },
      { date: '2026-10-06', text: 'GE Vernovas modtagekontrol af DL-2 afsluttes senest', textEn: 'GE Vernova\'s incoming inspection of DL-2 to be completed by', status: 'kommende', source: src(BANK, 's. 5') },
      { date: '2026-10-31', text: 'Frist for EIFOs kautionstilsagn efter bankens fornyede bevilling', textEn: 'Deadline for EIFO\'s guarantee commitment under the bank\'s renewed approval', status: 'kommende', source: src(BANK, 's. 5') },
      { date: '2026-10-31', text: 'Likviditetslavpunkt 0,93 mio. med fuldt udnyttet driftskredit', textEn: 'Liquidity low point DKK 0.93 million with the operating credit fully drawn', status: 'kommende', source: src(BUD, 'ark Likviditet') },
      { date: '2026-11-01', text: 'Faciliteten etableres, og kautionsperioden starter', textEn: 'The facility is established and the guarantee period starts', status: 'kommende', source: src(BANK, 's. 5') },
      { date: '2026-11-19', text: 'Bestyrelsesmøde behandler valutapolitikken', textEn: 'Board meeting to consider the currency policy', status: 'kommende', source: src(BANK, 's. 5') },
      { date: '2026-11-24', text: 'GE Vernovas T2-betaling for DL-2 forfalder (USD 630.824, ca. 4,3 mio.)', textEn: 'GE Vernova\'s T2 payment for DL-2 due (USD 630,824, approx. DKK 4.3 million)', status: 'kommende', source: src(BUD, 'linje 197') },
      { date: '2026-11-30', text: 'Frist for skriftlig valutapolitik (C6)', textEn: 'Deadline for a written currency policy (C6)', status: 'kommende', source: src(BANK, 's. 5') },
      { date: '2026-12-01', text: 'Frist for terminssikring af mindst 70 % af den resterende kontraktsum (C6)', textEn: 'Deadline for hedging at least 70% of the remaining contract value (C6)', status: 'kommende', source: src(BANK, 's. 5') },
      { date: '2026-12-11', text: 'DL-3 leveres (milepæl M4)', textEn: 'DL-3 to be delivered (milestone M4)', status: 'kommende', source: src(GE, '§3') },
      { date: '2026-12-31', text: 'Første måling af covenants C1 og C2', textEn: 'First test of covenants C1 and C2', status: 'kommende', source: src(BANK, 's. 5') },
      { date: '2027-06-30', text: 'Anpartshaverlånet kan tidligst opsiges med virkning fra denne dato', textEn: 'Earliest date from which the shareholder loan can be terminated', status: 'kommende', source: src(AR25, 'note 14') },
      { date: '2029-04-30', text: 'Kautionsperioden og faciliteten udløber', textEn: 'The guarantee period and the facility expire', status: 'kommende', source: src(BANK, 's. 5') },
    ],

    // Røde flag: { text, severity: 'høj'|'middel', source }. Ordnet efter vægt.
    redFlags: [
      { key: 'sl210', text: 'Ulovligt kapitalejerlån til direktøren i 2025 (selskabslovens § 210), maks. t.DKK 180, indfriet 12. november 2025; supplerende oplysning i revisors påtegning',
        textEn: 'Unlawful loan to the CEO as shareholder in 2025 (section 210 of the Danish Companies Act), max. DKK 180 thousand, repaid on 12 November 2025; other-matter paragraph in the auditor\'s report',
        short: 'Lån til direktøren i strid med § 210', shortEn: 'Loan to the CEO in breach of s. 210', severity: 'høj', source: src(AR25, 's. 14') },
      { key: 'concentration', text: 'Kundekoncentration: top-3 kunder udgør 64 % af omsætningen i januar-august 2026, GE Vernova alene 38 %',
        textEn: 'Customer concentration: the top 3 customers account for 64% of revenue in January-August 2026, GE Vernova alone 38%',
        short: 'Top-3 kunder = 64 % af omsætningen', shortEn: 'Top 3 customers = 64% of revenue', severity: 'høj', source: src(PER, 'ark Kunder') },
      { key: 'fx', text: 'Uafdækket valuta: 41 % af omsætningen faktureres i USD eller EUR, og der er ingen terminsforretninger eller valutapolitik pr. 31. august 2026',
        textEn: 'Unhedged currency: 41% of revenue is invoiced in USD or EUR, and there are no forward contracts or currency policy as at 31 August 2026',
        short: 'Uafdækket USD-eksponering', shortEn: 'Unhedged USD exposure', severity: 'høj', source: src(PER, 'ark Noter') },
      { key: 'liquidity', text: 'Stram likviditet: lavpunkt 0,93 mio. ultimo oktober 2026 med driftskreditten fuldt udnyttet, før faciliteten etableres 1. november',
        textEn: 'Tight liquidity: low point DKK 0.93 million at the end of October 2026 with the operating credit fully drawn, before the facility is established on 1 November',
        short: 'Likviditetslavpunkt 0,93 mio. i oktober', shortEn: 'Liquidity low point DKK 0.93m in October', severity: 'høj', source: src(BUD, 'ark Likviditet') },
      { key: 'subordination', text: 'Anpartshaverlånet på 0,5 mio. fra Anders Christensen er ikke efterstillet; tilbagetrædelseserklæring mangler (B2)',
        textEn: 'The DKK 0.5 million shareholder loan from Anders Christensen is not subordinated; the subordination declaration is missing (B2)',
        short: 'Anpartshaverlån ikke efterstillet', shortEn: 'Shareholder loan not subordinated', severity: 'middel', source: src(AR25, 'note 14') },
      { key: 'guarantee', text: 'Selskabskautionen fra Nordhavn Holding ApS er et uunderskrevet udkast uden selskabsretlig beslutning (B1)',
        textEn: 'The company guarantee from Nordhavn Holding ApS is an unsigned draft without a corporate resolution (B1)',
        short: 'Selskabskaution ikke underskrevet', shortEn: 'Company guarantee not signed', severity: 'middel', source: src(SIK, 'S5') },
      { key: 'property', text: 'Sikkerheden i Havnegade 42 er uafklaret: bankens prioritetsoversigt medtager ikke realkreditlånet fra årsrapportens note 10',
        textEn: 'The security in Havnegade 42 is unclear: the bank\'s ranking overview omits the mortgage loan in note 10 of the annual report',
        short: 'Ejendomspant uafklaret', shortEn: 'Property security unclear', severity: 'middel', source: src(SIK, 'S2') },
    ],

    // Nøgletal (samme tal som fanen Virksomheden). values = reviderede årsrapporter,
    // ytd = periodetal januar-august 2026, budget = 2026E fra budget version 3.
    keyFigures: [
      { key: 'revenue', label: 'Nettoomsætning', labelEn: 'Revenue', unit: 'DKK mio.', unitEn: 'DKK million',
        values: { '2023': 28.0, '2024': 32.8, '2025': 41.1 },
        ytd: { period: 'jan-aug 2026', periodEn: 'Jan-Aug 2026', value: 29.08, source: src(PER, 'ark Resultat') },
        budget: { period: '2026E', value: 44.4, source: src(BUD, 'ark Resultat') },
        source: src(AR25, 's. 9') },
      { key: 'ebitda', label: 'EBITDA', labelEn: 'EBITDA', unit: 'DKK mio.', unitEn: 'DKK million',
        values: { '2023': 1.3, '2024': 1.9, '2025': 2.4 },
        ytd: { period: 'jan-aug 2026', periodEn: 'Jan-Aug 2026', value: 1.68, source: src(PER, 'ark Resultat') },
        budget: { period: '2026E', value: 2.7, source: src(BUD, 'ark Resultat') },
        source: src(AR25, 's. 9') },
      { key: 'ebitdaMargin', label: 'EBITDA-margin', labelEn: 'EBITDA margin', unit: '%', unitEn: '%',
        values: { '2023': 4.6, '2024': 5.8, '2025': 5.8 },
        ytd: { period: 'jan-aug 2026', periodEn: 'Jan-Aug 2026', value: 5.8, source: src(PER, 'ark Resultat') },
        budget: { period: '2026E', value: 6.1, source: src(BUD, 'ark Resultat') },
        source: src(AR25, 's. 9') },
      { key: 'equity', label: 'Egenkapital', labelEn: 'Equity', unit: 'DKK mio.', unitEn: 'DKK million',
        values: { '2023': 3.5, '2024': 4.8, '2025': 6.2 },
        ytd: { period: '31.8.2026', periodEn: '31 Aug 2026', value: 6.85, source: src(PER, 'ark Balance') },
        budget: { period: '2026E', value: 7.35, source: src(BUD, 'ark Balance') },
        note: '2024: resultat 0,7 mio. og kapitalforhøjelse 0,6 mio.; 2025: resultat 1,0 mio. og kapitalforhøjelse 0,4 mio.',
        noteEn: '2024: profit DKK 0.7 million and capital increase DKK 0.6 million; 2025: profit DKK 1.0 million and capital increase DKK 0.4 million',
        source: src(AR25, 's. 9') },
      { key: 'solvency', label: 'Soliditetsgrad', labelEn: 'Equity ratio', unit: '%', unitEn: '%',
        values: { '2023': 37.2, '2024': 42.9, '2025': 44.3 },
        ytd: { period: '31.8.2026', periodEn: '31 Aug 2026', value: 45.0, source: src(PER, 'ark Balance') },
        budget: { period: '2026E', value: 47.3, source: src(BUD, 'ark Balance') },
        source: src(AR25, 's. 9') },
      { key: 'debtEbitda', label: 'Gæld / EBITDA', labelEn: 'Debt / EBITDA', unit: 'x', unitEn: 'x',
        values: { '2023': 4.5, '2024': 3.4, '2025': 3.3 },
        ytd: null,
        budget: { period: '2026E', value: 3.0, source: src(BUD, 'ark Balance') },
        source: src(AR25, 's. 9') },
    ],

    // Likviditet (budget version 3, afstemt til de faktiske tal pr. 31.8.2026)
    liquidity: {
      cashAt: '2026-08-31', cash: 2080000, creditDrawn: 1120000, creditLimit: 1500000,
      lowPoint: 930000, lowPointAt: '2026-10-31', creditDrawnAtLow: 1500000, availableAtLow: 930000,
      previous: { version: 'v2.2', date: '2026-05-24', lowPoint: 620000, lowPointAt: '2026-11-30', availableAtLow: 1920000 },
      source: src(BUD, 'ark Likviditet'),
    },

    // Uoverensstemmelser mellem kilderne: { key, text, sources: [{doc, ref}], handling, status: 'åben'|'afstemt' }
    conflicts: [
      { key: 'sl210', status: 'åben',
        text: 'Ejerbogen (s. 2) betegner anpartshaverlånet på 0,5 mio., som Anders Christensen har ydet selskabet, som et ulovligt kapitalejerlån efter § 210 og angiver 12 måneders opsigelsesvarsel. Efter årsrapportens note 14 og revisors påtegning er anpartshaverlånet et lån til selskabet, mens § 210-forholdet var et separat mellemværende i selskabets favør på maks. t.DKK 180, indfriet 12. november 2025. Note 14 angiver 6 måneders varsel, tidligst med virkning fra 30. juni 2027.',
        textEn: 'The register of shareholders (p. 2) describes the DKK 0.5 million loan that Anders Christensen has made to the company as an unlawful shareholder loan under section 210 and states 12 months\' notice. According to note 14 of the annual report and the auditor\'s report, the shareholder loan is a loan to the company, while the section 210 matter was a separate balance in the company\'s favour of max. DKK 180 thousand, repaid on 12 November 2025. Note 14 states 6 months\' notice, effective no earlier than 30 June 2027.',
        handling: 'Memoet følger note 14 og revisors påtegning. Ejerbogsføreren bedes rette udskriften før udbetaling.',
        handlingEn: 'The memo follows note 14 and the auditor\'s report. The keeper of the register is asked to correct the extract before disbursement.',
        sources: [src(EJ, 's. 2'), src(AR25, 'note 14'), src(AR25, 's. 14'), src(PER, 'ark Noter')] },
      { key: 'mortgage', status: 'åben',
        text: 'Årsrapportens note 10 og periodetallene har et realkreditlån med pant i Havnegade 42 (restgæld 1,94 mio. pr. 31. august 2026), men prioritetsoversigten i Sikkerhedsdokumenter S2 viser kun ejerpantebrevene på 1,6 og 2,5 mio. og en samlet behæftelse på 100 % af vurderingen.',
        textEn: 'Note 10 of the annual report and the interim figures show a mortgage loan secured on Havnegade 42 (outstanding DKK 1.94 million at 31 August 2026), but the ranking overview in Security documents S2 only shows the owner\'s mortgages of DKK 1.6 and 2.5 million and total encumbrances of 100% of the valuation.',
        handling: 'Tingbogsattest indhentes før udbetaling (E2). Indtil da regnes ejerpantebrevet på 2,5 mio. ikke med som reel dækning: med realkreditlånet forrest er den samlede behæftelse ca. 6,0 mio., ca. 147 % af den offentlige vurdering på 4,1 mio.',
        handlingEn: 'A land register certificate is obtained before disbursement (E2). Until then the DKK 2.5 million owner\'s mortgage is not counted as real cover: with the mortgage loan ranking first, total encumbrances are approx. DKK 6.0 million, approx. 147% of the public valuation of DKK 4.1 million.',
        sources: [src(AR25, 's. 8'), src(PER, 'ark Balance'), src(SIK, 'S2'), src(BUD, 'ark Balance')] },
      { key: 'liquidity', status: 'afstemt',
        text: 'Bankens ansøgning af 2. juni 2026 bygger på budget version 2.2 med et likviditetslavpunkt på 0,62 mio. i november og 1,92 mio. disponibelt. De faktiske tal pr. 31. august 2026 viser et træk på driftskreditten på 1,12 mio. mod forudsat 0,45 mio., og faciliteten etableres først 1. november.',
        textEn: 'The bank\'s application of 2 June 2026 is based on budget version 2.2 with a liquidity low point of DKK 0.62 million in November and DKK 1.92 million available. The actual figures at 31 August 2026 show DKK 1.12 million drawn on the operating credit against an assumed DKK 0.45 million, and the facility is only established on 1 November.',
        handling: 'Memoet bruger budget version 3, der er afstemt til periodetallene: lavpunkt 0,93 mio. ultimo oktober med fuldt udnyttet driftskredit og 0,93 mio. disponibelt, ca. 1,0 mio. mindre end i ansøgningen.',
        handlingEn: 'The memo uses budget version 3, reconciled to the interim figures: low point DKK 0.93 million at the end of October with the operating credit fully drawn and DKK 0.93 million available, approx. DKK 1.0 million less than in the application.',
        sources: [src(BANK, 's. 5'), src(BUD, 'ark Likviditet'), src(PER, 'ark Noter')] },
      { key: 'equity2024', status: 'afstemt',
        text: 'Egenkapitalen steg fra 3,5 til 4,8 mio. i 2024, mens årets resultat var 0,7 mio.',
        textEn: 'Equity rose from DKK 3.5 million to DKK 4.8 million in 2024, while the profit for the year was DKK 0.7 million.',
        handling: 'Forskellen på 0,6 mio. er en rettet kontant kapitalforhøjelse 27. juni 2024, tegnet af Industrifonden A/S, Anders Holding ApS og Erhvervsfonden (årsrapport 2024, note 11, og ejerbogens notering 6). 3,5 + 0,7 + 0,6 = 4,8.',
        handlingEn: 'The DKK 0.6 million difference is a directed cash capital increase on 27 June 2024, subscribed by Industrifonden A/S, Anders Holding ApS and Erhvervsfonden (annual report 2024, note 11, and entry 6 in the register). 3.5 + 0.7 + 0.6 = 4.8.',
        sources: [src(AR24, 's. 8'), src(EJ, 's. 1'), src(AR25, 's. 9')] },
      { key: 'blockIsland', status: 'åben',
        text: 'Budget version 3 periodiserer Block Island med 5,6 mio. i 3. kvartal og 6,2 mio. i 4. kvartal 2026 (11,8 mio. i 2026 og 16,6 mio. i 2027). Efter rammeaftalens leveringsplan leveres DL-1 til DL-3 i 2026 for USD 2,47 mio. (ca. 16,9 mio.), periodetallene har indtægtsført DL-1 med 5,35 mio. i maj, og ordrebogen har 9,4 mio. til levering i september mod budgetterede 3,8 mio.',
        textEn: 'Budget version 3 phases Block Island at DKK 5.6 million in Q3 and DKK 6.2 million in Q4 2026 (DKK 11.8 million in 2026 and DKK 16.6 million in 2027). Under the framework agreement\'s delivery plan, DL-1 to DL-3 are delivered in 2026 for USD 2.47 million (approx. DKK 16.9 million), the interim figures recognised DL-1 at DKK 5.35 million in May, and the order book has DKK 9.4 million for delivery in September against a budgeted DKK 3.8 million.',
        handling: 'Selskabet bedes afstemme budgettet med leveringsplanen. Kontraktens samlede værdi er uændret, men 2027 hviler i højere grad på optionen på 18 vingesæt og nye ordrer. Memoet vurderer 2026 på realiserede tal og ordrebog.',
        handlingEn: 'The company is asked to reconcile the budget with the delivery plan. The total contract value is unchanged, but 2027 relies more on the option for 18 blade sets and new orders. The memo assesses 2026 on actual figures and the order book.',
        sources: [src(BUD, 'ark Resultat'), src(GE, '§3'), src(PER, 'ark Ordrebog'), src(PER, 'ark Kunder')] },
      { key: 'financingPlan', status: 'åben',
        text: 'Ansøgningens finansieringsplan (afsnit 1.3) fordeler kapitalbehovet på 3,6 / 2,2 / 1,2 mio. og udelader bankens uafdækkede andel af faciliteten på 0,9 mio. Budgettets plan (linje 197) er 4,5 / 2,2 / 0,3 mio.',
        textEn: 'The application\'s financing plan (section 1.3) splits the capital need into DKK 3.6 / 2.2 / 1.2 million and omits the bank\'s uncovered share of the facility of DKK 0.9 million. The budget\'s plan (line 197) is DKK 4.5 / 2.2 / 0.3 million.',
        handling: 'Memoet følger budgettets plan, der afstemmer til kapitalbehovet på 7,0 mio. Banken bedes bekræfte.',
        handlingEn: 'The memo follows the budget\'s plan, which reconciles to the capital need of DKK 7.0 million. The bank is asked to confirm.',
        sources: [src(BANK, 's. 1'), src(BUD, 'linje 197')] },
      { key: 'indexClauses', status: 'åben',
        text: 'Årsrapportens note 18 angiver indeksklausuler i tre af de fire største kundekontrakter, mens periodetallenes note 4 oplyser, at aftalerne med Vestas og Siemens Gamesa ikke har en tilsvarende klausul.',
        textEn: 'Note 18 of the annual report states index clauses in three of the four largest customer contracts, while note 4 of the interim figures states that the agreements with Vestas and Siemens Gamesa have no such clause.',
        handling: 'Afklares med selskabet. Memoet regner kun GE Vernova-aftalens regulering som mitigering af råvarerisikoen.',
        handlingEn: 'To be clarified with the company. The memo only counts the adjustment in the GE Vernova agreement as mitigation of the raw material risk.',
        sources: [src(AR25, 'note 18'), src(PER, 'ark Noter')] },
    ],
  };
})();

// Modul-eksport til Vue-komponenterne
export const CASE_FACTS = window.CASE_FACTS;
export const memoMode = () => window.CW_MEMO_MODE;
