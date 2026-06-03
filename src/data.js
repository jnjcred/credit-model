// Mock data - Crediwire credit tool
const COMPANY = {
  name: "Nordhavn Composite ApS",
  short: "NC",
  cvr: "38 42 71 56",
  founded: "12. marts 2017",
  legalForm: "Anpartsselskab (ApS)",
  industry: "Komposit­materialer / vindenergi",
  employees: 28,
  hq: "Frederikshavn, DK",
  address: "Strandgade 12",
  postal: "9900 Frederikshavn",
  country: "Danmark",
  website: "nordhavn-composite.dk",
  caseType: "Eksportkaution + driftskredit",
  amount: "DKK 4,5M",
  status: "Needs review",
  responsible: "Mette L.",
  deadline: "29. maj 2026",
  nextStep: "Gennemgå budgetafvigelse for juli",
  masterDataSource: "CVR-registeret",
  masterDataUpdated: "23. maj 2026",
  cvrUrl: "https://datacvr.virk.dk/enhed/virksomhed/38427156",
  // Process stage: "public" (only public data) | "awaiting-customer" (request sent, partial) | "customer-complete" (full data)
  caseStage: "awaiting-customer",
  customerRequestedAt: "23. maj 2026",
};

const CASES = [
  { id: 1, name: "Nordhavn Composite ApS", cvr: "38427156", type: "Eksportkaution", amount: "4,5M", status: "Needs review", risk: "med", responsible: "Mette L.", lastActivity: "2 timer siden", missing: 1, deadline: "29 May", pinned: true, tasks: 3 },
  { id: 2, name: "Vendia Bio ApS", cvr: "41902384", type: "Vækstlån", amount: "1,8M", status: "Waiting for customer", risk: "low", responsible: "Jonas K.", lastActivity: "i går", missing: 4, deadline: "03 Jun", tasks: 1 },
  { id: 3, name: "Marstal Maritime ApS", cvr: "27156089", type: "Driftskredit", amount: "3,2M", status: "Data received", risk: "low", responsible: "Mette L.", lastActivity: "i dag, 09:14", missing: 0, deadline: "31 May", tasks: 2 },
  { id: 4, name: "Skagen Klima ApS", cvr: "39184725", type: "Eksportkaution", amount: "0,9M", status: "Credit memo ready", risk: "low", responsible: "Sara F.", lastActivity: "2 dage siden", missing: 0, deadline: "27 May", tasks: 1 },
  { id: 5, name: "Lyngbæk Industrier ApS", cvr: "16284715", type: "Investeringslån", amount: "7,2M", status: "Needs review", risk: "high", responsible: "Jonas K.", lastActivity: "i dag, 11:02", missing: 2, deadline: "02 Jun", tasks: 4 },
  { id: 6, name: "Aalborg Hydrogen A/S", cvr: "42937180", type: "Eksportkaution", amount: "12,0M", status: "Draft", risk: "low", responsible: "Mette L.", lastActivity: "3 dage siden", missing: null, deadline: "-", tasks: 0 },
  { id: 7, name: "Kløver Tekstil ApS", cvr: "29384716", type: "Driftskredit", amount: "0,5M", status: "Approved", risk: "low", responsible: "Sara F.", lastActivity: "1 uge siden", missing: 0, deadline: "-", archived: true, tasks: 0 },
  { id: 8, name: "Refshaleøen Robotics ApS", cvr: "40912834", type: "Vækstlån", amount: "2,1M", status: "Waiting for customer", risk: "med", responsible: "Jonas K.", lastActivity: "4 dage siden", missing: 3, deadline: "12 Jun", tasks: 1 },
];

// Data collection - the HERO view
const COLLECTION_ITEMS = [
  { id: "annual", label: "Seneste årsrapport", category: "Regnskab", required: true, status: "received", source: "Upload", file: "Aarsrapport_2025.pdf", size: "2.4 MB", uploaded: "23. maj, 14:22", ai: { extracted: 47, confidence: "high" } },
  { id: "interim", label: "Internt periodetal (Q1 2026)", category: "Regnskab", required: true, status: "received", source: "API: e-conomic", uploaded: "24. maj, 09:01", ai: { extracted: 132, confidence: "high" } },
  { id: "budget", label: "Budget 2026-2028", category: "Regnskab", required: true, status: "review", source: "Upload", file: "Budget_2026-28_v3.xlsx", size: "188 KB", uploaded: "24. maj, 09:01", note: "AI fandt afvigelse - se Findings", ai: { confidence: "med" } },
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
const REQUEST_RECIPIENT = { name: "Anders Nielsen", role: "CFO, Nordhavn Composite", email: "an@nordhavn-composite.dk" };

// Financials - small SME scale (DKK M)
const FINANCIALS = {
  years: ["2023", "2024", "2025", "2026 YTD", "2026 B"],
  revenue: [12.8, 15.2, 18.5, 5.2, 22.0],
  ebitda: [1.3, 1.9, 2.4, 0.7, 3.0],
  grossMargin: [28.4, 30.1, 31.6, 32.0, 33.5],
  liquidity: [0.9, 1.4, 1.8, 1.5, 2.0],
  equity: [3.5, 4.8, 6.2, 6.8, null],
  debt: [5.9, 6.4, 7.8, 8.2, null],
};

const BUDGET_VS_ACTUAL = [
  { month: "Jan", budget: 1.6, actual: 1.65 },
  { month: "Feb", budget: 1.7, actual: 1.62 },
  { month: "Mar", budget: 1.8, actual: 1.93 },
  { month: "Apr", budget: 1.8, actual: 1.78 },
  { month: "Maj", budget: 1.9, actual: null },
  { month: "Jun", budget: 2.0, actual: null },
  { month: "Jul", budget: 2.5, actual: null, flag: "spike" },
  { month: "Aug", budget: 1.9, actual: null },
  { month: "Sep", budget: 2.0, actual: null },
  { month: "Okt", budget: 2.0, actual: null },
  { month: "Nov", budget: 2.1, actual: null },
  { month: "Dec", budget: 2.1, actual: null },
];

// Documents
const DOCS = [
  { name: "Aarsrapport_2025.pdf", type: "Årsrapport", year: "2025", size: "2.4 MB", uploaded: "23. maj 14:22", date: "2026-05-23", ai: 47, status: "Analyseret", origin: "public",   sourceLabel: "CVR" },
  { name: "Aarsrapport_2024.pdf", type: "Årsrapport", year: "2024", size: "2.1 MB", uploaded: "23. maj 14:22", date: "2026-05-23", ai: 38, status: "Analyseret", origin: "public",   sourceLabel: "CVR" },
  { name: "Aarsrapport_2023.pdf", type: "Årsrapport", year: "2023", size: "1.9 MB", uploaded: "23. maj 14:22", date: "2026-05-23", ai: 32, status: "Analyseret", origin: "public",   sourceLabel: "CVR" },
  { name: "Budget_2026-28_v3.xlsx", type: "Budget", year: "v3", size: "188 KB", uploaded: "24. maj 09:01", date: "2026-05-24", ai: 12, status: "Afvigelse fundet", origin: "uploaded", sourceLabel: "Kundeupload" },
  { name: "Budget_2026-28_v2.xlsx", type: "Budget", year: "v2", size: "184 KB", uploaded: "21. maj 11:30", date: "2026-05-21", ai: 11, status: "Erstattet",        origin: "uploaded", sourceLabel: "Kundeupload" },
  { name: "Budget_2026-28_v1.xlsx", type: "Budget", year: "v1", size: "172 KB", uploaded: "18. maj 09:14", date: "2026-05-18", ai: 9,  status: "Erstattet",        origin: "uploaded", sourceLabel: "Kundeupload" },
  { name: "Periodetal_Q1-2026.xlsx", type: "Periodetal", year: "Q1 2026", size: "92 KB", uploaded: "24. maj 09:01", date: "2026-05-24", ai: 36, status: "Analyseret", origin: "uploaded", sourceLabel: "e-conomic" },
  { name: "Periodetal_Q4-2025.xlsx", type: "Periodetal", year: "Q4 2025", size: "88 KB", uploaded: "23. maj 14:22", date: "2026-05-23", ai: 34, status: "Analyseret", origin: "uploaded", sourceLabel: "e-conomic" },
  { name: "Laaneaftale_Nordea_2022.pdf",        type: "Låneaftale", year: "Nordea",       size: "412 KB", uploaded: "23. maj 16:48", date: "2026-05-23", ai: 8,  status: "Analyseret", origin: "uploaded", sourceLabel: "Kundeupload" },
  { name: "Laaneaftale_Erhvervsfonden_2023.pdf", type: "Låneaftale", year: "Erhvervsfonden", size: "298 KB", uploaded: "23. maj 16:48", date: "2026-05-23", ai: 11, status: "Analyseret", origin: "uploaded", sourceLabel: "Kundeupload" },
  { name: "Laaneaftale_Spar_Nord_2024.pdf",     type: "Låneaftale", year: "Spar Nord",    size: "316 KB", uploaded: "23. maj 16:50", date: "2026-05-23", ai: 9,  status: "Analyseret", origin: "uploaded", sourceLabel: "Kundeupload" },
  { name: "Pantebrev_maskiner.pdf",           type: "Sikkerhed", year: "Maskiner",  size: "156 KB", uploaded: "23. maj 16:50", date: "2026-05-23", ai: 4, status: "Analyseret", origin: "uploaded", sourceLabel: "Kundeupload" },
  { name: "Pantebrev_varelager.pdf",          type: "Sikkerhed", year: "Varelager", size: "142 KB", uploaded: "23. maj 16:50", date: "2026-05-23", ai: 3, status: "Analyseret", origin: "uploaded", sourceLabel: "Kundeupload" },
  { name: "Tinglyst_pantebrev_Havnegade.pdf", type: "Sikkerhed", year: "Ejendom",   size: "208 KB", uploaded: "23. maj 16:50", date: "2026-05-23", ai: 5, status: "Analyseret", origin: "uploaded", sourceLabel: "Kundeupload" },
  { name: "Ejerbog.pdf",     type: "Selskab", year: "Ejerbog",   size: "412 KB", uploaded: "23. maj 14:25", date: "2026-05-23", ai: 6, status: "Analyseret", origin: "uploaded", sourceLabel: "Kundeupload" },
  { name: "Vedtaegter.pdf",  type: "Selskab", year: "Vedtægter", size: "184 KB", uploaded: "23. maj 14:20", date: "2026-05-23", ai: 3, status: "Analyseret", origin: "public",   sourceLabel: "CVR" },
];

// AI findings
const FINDINGS = [
  { id: 1, severity: "warn", title: "Budgetlinje stiger 2,5M i juli 2026", body: "Omsætning stiger fra 2,0M (juni) til 2,5M (juli) - en stigning på 25,0% uden tilsvarende mønster i historikken.", source: "Budget_2026-28_v3.xlsx · linje 197", suggest: "Bekræft baggrund for juli-stigning. Mulig forklaring: levering af Block-Island ordre Q3.", confidence: "med" },
  { id: 2, severity: "warn", title: "Tilbagetrædelses­erklæring mangler", body: "Lån fra anpartshaverkredit på 0,5M (note 14 i årsrapport) - ingen tilbagetrædelses­erklæring fundet blandt indleverede dokumenter.", source: "Aarsrapport_2025.pdf · note 14", suggest: "Anmod om tilbagetrædelses­erklæring fra Holding ApS.", confidence: "high" },
  { id: 3, severity: "info", title: "Kaution ikke fuldt specificeret", body: "Kautionsdokument refererer til 'sædvanlige sikkerheder' uden specifikation. Kræver afklaring før indstilling.", source: "Pantebrev_maskiner.pdf · §4", suggest: "Få listet konkrete aktiver der indgår i kautionen.", confidence: "high" },
  { id: 4, severity: "ok", title: "Budget vs realiseret Q1 - i tråd", body: "Q1 2026 realiseret omsætning 5,2M mod budget 5,0M (+4,9%). EBITDA-margin holder.", source: "Periodetal_Q1-2026.xlsx", confidence: "high" },
  { id: 5, severity: "info", title: "Trustpilot ikke relevant (B2B)", body: "Selskabet leverer kun B2B til vindmølle­producenter. Soft signals fra LinkedIn og branche­presse vurderet i stedet.", source: "Soft signals", confidence: "high" },
];

// Questions
const QUESTIONS_TO_CUST = [
  { id: 1, q: "Kan I bekræfte baggrunden for omsætnings­spring i juli 2026 (2,5M)?", source: "Budget linje 197", status: "draft", priority: "high" },
  { id: 2, q: "Findes der tilbagetrædelses­erklæring for anpartshaver­lånet på 0,5M?", source: "Årsrapport note 14", status: "draft", priority: "high" },
  { id: 3, q: "Specifikation af aktiver omfattet af kaution (pantebrev §4)?", source: "Pantebrev_maskiner", status: "draft", priority: "med" },
  { id: 4, q: "Forventede valutaeksponeringer for Block-Island ordre (USD)?", source: "AI · markedsanalyse", status: "draft", priority: "med" },
  { id: 5, q: "Er der indgået rente­swap eller anden afdækning på den variable gæld?", source: "Låneaftale Nordea §7", status: "sent", priority: "med", sent: "21. maj" },
];

// Ownership
const OWNERS = [
  { name: "Anders Holding ApS", share: 48.2, pep: false, type: "holding" },
  { name: "Erhvervsfonden", share: 22.4, pep: false, type: "fund" },
  { name: "Maria Lindbjerg", share: 14.8, pep: false, type: "person", role: "CTO" },
  { name: "Industrifonden A/S", share: 9.6, pep: false, type: "fund" },
  { name: "Medarbejder­warrants", share: 5.0, pep: false, type: "other" },
];

const BOARD = [
  { name: "Karen Bach", role: "Bestyrelses­formand", since: "2019" },
  { name: "Lars Holst", role: "Bestyrelsesmedlem", since: "2021" },
  { name: "Maria Lindbjerg", role: "Bestyrelsesmedlem", since: "2014" },
  { name: "Tom Henriksen", role: "Medarbejdervalgt", since: "2023" },
];

// Soft signals
const SOFT = [
  { label: "Ansatte (LinkedIn)", value: "28", trend: "+22% YoY", positive: true },
  { label: "Markedsomtale (90 dage)", value: "4 artikler", trend: "Neutral til positiv", positive: true },
  { label: "Funding rounds", value: "2", trend: "Senest: 2023, 1,8M" },
  { label: "Søgsmål / negativ presse", value: "Ingen", positive: true },
  { label: "Brancheudvikling 2026E", value: "+6,8%", trend: "DK vindkomponent", positive: true },
];

window.DATA = { COMPANY, CASES, COLLECTION_ITEMS, REQUEST_LINK, REQUEST_RECIPIENT, FINANCIALS, BUDGET_VS_ACTUAL, DOCS, FINDINGS, QUESTIONS_TO_CUST, OWNERS, BOARD, SOFT };
