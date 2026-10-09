// Fanen Virksomheden, Regnskab (v5): tal fra kundens dokumenter, som tabellen og grafen bruger ud
// over ANNUAL_REPORT. Alle tal i DKK mio. med tabellens fortegn (omkostninger negative), som de
// står i dokumenterne i src/domain/case_documents.js. Rækkerne er ANNUAL_REPORT's navne.

// Periodetal_jan-aug_2026.xlsx, ark Resultat, kolonnen "8 mdr 2025": samme periode sidste år
// ("Sammenligningstallene for 8 mdr. 2025 er trukket fra samme kontoplan").
const FIN_COMPARE_2025 = {
  months: ['2025-01', '2025-08'],
  rows: {
    'Nettoomsætning': 26.30, 'Vareforbrug': -14.47, 'Bruttofortjeneste': 11.83,
    'Personaleomkostninger': -8.74, 'Andre eksterne omkostninger': -1.66, 'EBITDA': 1.43,
    'Afskrivninger': -0.66, 'Resultat før finansielle poster': 0.77,
    'Finansielle omkostninger': -0.27, 'Årets resultat': 0.50,
  },
  // Samme ark, nøgletallene: omsætningsvæksten mod samme periode 2025 pr. kvartal
  // (Q1 +7,1 %, Q2 +9,9 %, jul-aug +17,1 %). Fordeler 2025 på kvartaler og måneder.
  growthQ: [0.071, 0.099, 0.171],
};

// Budget_2026-28_v3.xlsx, ark Resultat. Budgetfilens 2026 ("2026E") er januar-august realiseret,
// som filen selv har dem (periodetal af 14-09-2026), plus budget for september og Q4. Her er de
// realiserede tal; september og Q4 er ANNUAL_REPORT's bs og bq[0] (de kan rettes og importeres).
const FIN_BUDGET_FILE_2026_REAL = {
  'Nettoomsætning': 29.08, 'Vareforbrug': -15.92, 'Bruttofortjeneste': 13.16,
  'Personaleomkostninger': -9.63, 'Andre eksterne omkostninger': -1.85, 'EBITDA': 1.68,
  'Afskrivninger': -0.73, 'Resultat før finansielle poster': 0.95,
  'Finansielle omkostninger': -0.30, 'Årets resultat': 0.65, 'heraf kapitalindskud i året': 0,
};

// Samme fil: Q4 2027 (ark Resultat, "BUDGET PR. PERIODE") og balancen pr. 31-12-2027 (ark Balance).
// ANNUAL_REPORT's bq slutter med Q3 2027; med Q4 bliver 2027 et helt budgetår (47,50 i omsætning,
// som filens helårstal).
const FIN_BUDGET_FILE_Q4_2027 = {
  'Nettoomsætning': 12.00, 'Vareforbrug': -6.53, 'Bruttofortjeneste': 5.47,
  'Personaleomkostninger': -3.92, 'Andre eksterne omkostninger': -0.75, 'EBITDA': 0.80,
  'Afskrivninger': -0.30, 'Resultat før finansielle poster': 0.50,
  'Finansielle omkostninger': -0.12, 'Årets resultat': 0.38, 'heraf kapitalindskud i året': 0,
  'Anlægsaktiver': 6.80, 'Omsætningsaktiver': 10.32, 'Likvide beholdninger': 3.20, 'Aktiver i alt': 17.12,
  'Egenkapital': 9.05, 'Langfristet gæld': 4.00, 'Kortfristet gæld': 4.07, 'Gæld i alt': 8.07,
};

// Samme fil, helår 2028 (ark Resultat, "HELÅR", og ark Balance, "HELÅRSBALANCE"). Bruges, når
// budgettets næste år er 2028 (kanttilfældet "bogført ind i næste år" i demoen).
const FIN_BUDGET_FILE_2028 = {
  'Nettoomsætning': 52.00, 'Vareforbrug': -28.25, 'Bruttofortjeneste': 23.75,
  'Personaleomkostninger': -16.80, 'Andre eksterne omkostninger': -3.35, 'EBITDA': 3.60,
  'Afskrivninger': -1.30, 'Resultat før finansielle poster': 2.30,
  'Finansielle omkostninger': -0.45, 'Årets resultat': 1.85, 'heraf kapitalindskud i året': 0,
  'Anlægsaktiver': 7.40, 'Omsætningsaktiver': 11.30, 'Likvide beholdninger': 3.80, 'Aktiver i alt': 18.70,
  'Egenkapital': 10.90, 'Langfristet gæld': 3.60, 'Kortfristet gæld': 4.20, 'Gæld i alt': 7.80,
};

// Den uploadede saldobalance (læst af AI): Periodetal_jan-aug_2026.xlsx, ark Resultat, kolonnen
// "8 mdr 2026", og ark Balance pr. 31-08-2026. Tallene er filens egne og afhænger ikke af
// kontomappingen af e-conomic (ERP-kilden); rådgiverens rettelser lægges ovenpå (kolonnen ytd).
const FIN_UPLOAD_2026 = {
  'Nettoomsætning': 29.08, 'Vareforbrug': -15.92, 'Bruttofortjeneste': 13.16,
  'Personaleomkostninger': -9.63, 'Andre eksterne omkostninger': -1.85, 'EBITDA': 1.68,
  'Afskrivninger': -0.726, 'Resultat før finansielle poster': 0.954,
  'Finansielle omkostninger': -0.30, 'Årets resultat': 0.654, 'heraf kapitalindskud i året': 0,
  'Anlægsaktiver': 6.27, 'Omsætningsaktiver': 8.97, 'Likvide beholdninger': 2.08, 'Aktiver i alt': 15.24,
  'Egenkapital': 6.854, 'Langfristet gæld': 4.45, 'Kortfristet gæld': 3.936, 'Gæld i alt': 8.386,
};

// Modul-eksport
export { FIN_COMPARE_2025, FIN_BUDGET_FILE_2026_REAL, FIN_BUDGET_FILE_Q4_2027, FIN_BUDGET_FILE_2028, FIN_UPLOAD_2026 };
