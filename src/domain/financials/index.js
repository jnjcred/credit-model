// Fanen Virksomheden (src/financials.jsx og src/fin_chart.jsx): domænelogikken er flyttet ordret
// til modulerne i denne mappe ved migrationen til Vue. src/bootstrap.js importerer denne fil på
// financials.jsx' gamle plads (efter mapping.js, før memo_handoff.js), så det, financials.jsx
// gjorde, da den blev indlæst, sker i samme rækkefølge som før:
//   1. lytteren på 'cw-mapping-changed' og det første finSyncMapping()
//   2. window-globalerne, som memo_ai læser (ANNUAL_REPORT, FIN_RATIOS, FIN_*_Q, finEstimate2026)
//   3. window.CW_EXPORT_DOCS = [5 eksporter]; memo_handoff lægger sin vejledning til bagefter, og
//      data.js, case_state.js, Dokumenter og Overblik læser listen
// Modulerne selv har ingen virkninger uden for sig selv. Vue-komponenterne importerer fra dem
// (fx '@/domain/financials/finEdits'), ikke fra denne fil: den skal kun køre én gang.
import { FIN_ANNUAL_YEARS, FIN_ACTUAL_Q, FIN_BUDGET_SEP, FIN_BUDGET_Q, ANNUAL_REPORT } from './finData.js';
import { finEstimate2026, FIN_RATIOS } from './finCalc.js';
import { finSyncMapping } from './finMapping.js';
import { FIN_AI_DEFS, finAiPatch, finAiAnyEdited, finAiGenerate } from './finAiTexts.js';
import { exDoc, exFinancialsPages, exMarketPages, exTrustpilotPages, exOwnershipPages, exCompanyPages } from './finExportDocs.js';

window.addEventListener('cw-mapping-changed', () => { finSyncMapping(); });
// Er saldobalancen allerede hentet, når filen indlæses, slår mappingen igennem med det samme
finSyncMapping();

window.ANNUAL_REPORT = ANNUAL_REPORT;
window.FIN_RATIOS = FIN_RATIOS;
window.FIN_ANNUAL_YEARS = FIN_ANNUAL_YEARS;
window.FIN_ACTUAL_Q = FIN_ACTUAL_Q;
window.FIN_BUDGET_Q = FIN_BUDGET_Q;
window.FIN_BUDGET_SEP = FIN_BUDGET_SEP;

window.CW_EXPORT_DOCS = [
  exDoc('crediwire-regnskabstabel', 'Regnskabstabel_Nordhavn.xlsx', exFinancialsPages),
  exDoc('crediwire-produkt-marked-branche', 'Produkt_marked_og_branche.pdf', exMarketPages),
  exDoc('crediwire-trustpilot', 'Trustpilot.pdf', exTrustpilotPages),
  exDoc('crediwire-ejerskab-bindinger', 'Ejerskab_og_finansielle_bindinger.pdf', exOwnershipPages),
  exDoc('crediwire-virksomhedsprofil', 'Virksomhedsprofil_CVR.pdf', exCompanyPages),
];
window.finEstimate2026 = finEstimate2026;

// Migration: før migrationen var alle navne på øverste niveau i financials.jsx globale (Babel).
// prompt_workshop (FIN_AI_DEFS, finAiGenerate, finAiPatch) og memo_handoff (finAiAnyEdited) bruger
// disse fire som globale navne, så de ligger stadig på window.
window.FIN_AI_DEFS = FIN_AI_DEFS;
window.finAiGenerate = finAiGenerate;
window.finAiPatch = finAiPatch;
window.finAiAnyEdited = finAiAnyEdited;
