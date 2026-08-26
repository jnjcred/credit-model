// English translations for mock/demo CONTENT from src/data.js
// (FINDINGS, QUESTIONS_TO_CUST, SOFT, BOARD, OWNERS, COMPANY) plus the
// inline market-analysis prose in src/findings_market.jsx.
// Keys are the exact Danish source strings ("­" = soft hyphen, must
// match data.js byte-for-byte).
Object.assign(window.I18N.en, {
  // FINDINGS - titles
  'Budgetlinje stiger 2,5M i juli 2026': 'Budget line increases by 2.5M in July 2026',
  'Tilbagetrædelses­erklæring mangler': 'Subordination declaration missing',
  'Kaution ikke fuldt specificeret': 'Guarantee not fully specified',
  'Budget vs realiseret Q1 - i tråd': 'Budget vs actuals Q1 - in line',
  'Trustpilot ikke relevant (B2B)': 'Trustpilot not relevant (B2B)',

  // FINDINGS - bodies
  'Omsætning stiger fra 2,0M (juni) til 2,5M (juli) - en stigning på 25,0% uden tilsvarende mønster i historikken.':
    'Revenue increases from 2.0M (June) to 2.5M (July) - a 25.0% step-up with no corresponding pattern in the historical figures.',
  'Lån fra anpartshaverkredit på 0,5M (note 14 i årsrapport) - ingen tilbagetrædelses­erklæring fundet blandt indleverede dokumenter.':
    'Shareholder loan of 0.5M (note 14 in the annual report) - no subordination declaration found among the submitted documents.',
  "Kautionsdokument refererer til 'sædvanlige sikkerheder' uden specifikation. Kræver afklaring før indstilling.":
    "The guarantee document refers to 'customary collateral' without specification. Requires clarification before the credit recommendation.",
  'Q1 2026 realiseret omsætning 5,2M mod budget 5,0M (+4,9%). EBITDA-margin holder.':
    'Q1 2026 actual revenue of 5.2M against a budget of 5.0M (+4.9%). EBITDA margin holds.',
  'Selskabet leverer kun B2B til vindmølle­producenter. Soft signals fra LinkedIn og branche­presse vurderet i stedet.':
    'The company sells B2B only, to wind turbine manufacturers. Soft signals from LinkedIn and trade press assessed instead.',

  // FINDINGS - suggestions
  'Bekræft baggrund for juli-stigning. Mulig forklaring: levering af Block-Island ordre Q3.':
    'Confirm the rationale for the July increase. Possible explanation: delivery of the Block-Island order in Q3.',
  'Anmod om tilbagetrædelses­erklæring fra Holding ApS.':
    'Request a subordination declaration from Holding ApS.',
  'Få listet konkrete aktiver der indgår i kautionen.':
    'Obtain a list of the specific assets covered by the guarantee.',

  // FINDINGS - sources
  'Budget_2026-28_v3.xlsx · linje 197': 'Budget_2026-28_v3.xlsx · line 197',
  'Aarsrapport_2025.pdf · note 14': 'Aarsrapport_2025.pdf · note 14',
  'Pantebrev_maskiner.pdf · §4': 'Pantebrev_maskiner.pdf · §4',
  'Periodetal_Q1-2026.xlsx': 'Periodetal_Q1-2026.xlsx',

  // QUESTIONS_TO_CUST - questions
  'Kan I bekræfte baggrunden for omsætnings­spring i juli 2026 (2,5M)?':
    'Can you confirm the rationale for the revenue jump in July 2026 (2.5M)?',
  'Findes der tilbagetrædelses­erklæring for anpartshaver­lånet på 0,5M?':
    'Is there a subordination declaration for the shareholder loan of 0.5M?',
  'Specifikation af aktiver omfattet af kaution (pantebrev §4)?':
    'Specification of assets covered by the guarantee (mortgage deed §4)?',
  'Forventede valutaeksponeringer for Block-Island ordre (USD)?':
    'Expected currency exposures for the Block-Island order (USD)?',
  'Er der indgået rente­swap eller anden afdækning på den variable gæld?':
    'Has an interest rate swap or other hedging been arranged for the floating-rate debt?',

  // QUESTIONS_TO_CUST - sources
  'Budget linje 197': 'Budget line 197',
  'Årsrapport note 14': 'Annual report note 14',
  'AI · markedsanalyse': 'AI · market analysis',
  'Låneaftale Nordea §7': 'Loan agreement Nordea §7',

  // COMPANY
  'Eksportkaution + driftskredit': 'Export guarantee + operating credit',
  'Gennemgå budgetafvigelse for juli': 'Review budget deviation for July',
  'Anpartsselskab (ApS)': 'Private limited company (ApS)',
  'Komposit­materialer / vindenergi': 'Composite materials / wind energy',

  // SOFT (remaining value not covered by existing dictionaries)
  '+6,8%': '+6.8%',

  // Market analysis prose (findings_market.jsx)
  'Nordhavn Composite producerer fiberforstærkede komposit­komponenter til vindmølle­blade - primært strukturelle elementer og rotorindfatninger. Salget sker B2B til':
    'Nordhavn Composite manufactures fibre-reinforced composite components for wind turbine blades - primarily structural elements and rotor housings. Sales are B2B to',
  ', hvor de tre kunder samlet udgør ca. 64% af omsætningen.':
    ', with the three customers jointly accounting for approx. 64% of revenue.',
  'Selskabets primære produkter er': "The company's primary products are",
  'blade­rødder': 'blade roots',
  'i kulfiber-epoxy (60% af omsætning),': 'in carbon fibre epoxy (60% of revenue),',
  'nav­indfatninger': 'hub housings',
  'i glasfiber-hybrid (28%), samt': 'in glass fibre hybrid (28%), plus',
  'specialkomponenter': 'custom components',
  'efter kundens specifikation (12%). Produktionen sker i Frederikshavn og Vendsyssel.':
    'built to customer specification (12%). Production takes place in Frederikshavn and Vendsyssel.',
  'Det globale marked for vindkomponenter forventes at vokse':
    'The global market for wind components is expected to grow',
  '6,8% p.a.': '6.8% p.a.',
  "i 2025-2030 (IEA). DK-leverandører nyder nærhed til OEM'er og høj teknisk modenhed. Risici: råvarepriser på kulfiber (+22% YoY) og politisk usikkerhed om amerikanske IRA-fradrag.":
    'in 2025-2030 (IEA). Danish suppliers benefit from proximity to OEMs and high technical maturity. Risks: raw material prices for carbon fibre (+22% YoY) and political uncertainty around US IRA tax credits.',

  // Competitor table figures ("mia" -> "bn")
  'EUR 1,2 mia': 'EUR 1.2bn',
  'USD 1,3 mia': 'USD 1.3bn',
});
