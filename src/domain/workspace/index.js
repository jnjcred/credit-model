// Sagen (workspace): logikken fra workspace.jsx. bootstrap.js importerer denne fil ved start (efter
// memoet, samme rækkefølge som scripterne i den gamle index.html), så det, workspace.jsx gjorde ved
// indlæsning, sker her, uanset hvilken skærm der vises:
//   window.CW_SUBMIT_READY           sagslisten (data.js) bruger samme regel for "Klar til indstilling"
//   window.CW_REQUEST_MORE           "Anmod om mere materiale" fra andre skærme (Regnskabets graf)
//   window.CW_OPEN_CUSTOMER_PREVIEW  Kundeside fra andre skærme (Dataanmodninger)
//   lyttere på 'cw-case-changed' og 'memo-changed', der rydder memoets status
//   window.wsPublicTopics, wsMaterialCat, wsMaterialReady og wsSubmitReady: workspace.jsx var et
//   klassisk script, så dets funktioner var globale; disse bruges af andre skærme
//   (customer_status, new_case_portal, memo_handoff) og står derfor stadig på window.
// Skærmene importerer i stedet fra denne fil (alt fra modulerne nedenfor) eller fra modulerne selv.
import { wsClearMemoCache, wsMaterialReady, wsSubmitReady } from './stage.js';
import { wsOpenCustomerPreview, wsRequestMore } from './actions.js';
import { wsPublicTopics } from './publicSources.js';
import { wsMaterialCat } from './request.js';

// Andre skærme (sagslisten i data.js) kan bruge samme regel
window.CW_SUBMIT_READY = () => { try { return wsSubmitReady(); } catch (e) { return false; } };
window.CW_REQUEST_MORE = wsRequestMore;
window.CW_OPEN_CUSTOMER_PREVIEW = wsOpenCustomerPreview;
window.addEventListener('cw-case-changed', wsClearMemoCache);
window.addEventListener('memo-changed', wsClearMemoCache);
window.wsPublicTopics = wsPublicTopics;
window.wsMaterialCat = wsMaterialCat;
window.wsMaterialReady = wsMaterialReady;
window.wsSubmitReady = wsSubmitReady;

export * from './format.js';
export * from './caseData.js';
export * from './stage.js';
export * from './request.js';
export * from './items.js';
export * from './publicSources.js';
export * from './readiness.js';
export * from './header.js';
export * from './actions.js';
