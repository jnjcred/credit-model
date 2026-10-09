// Domænelogikken indlæses i samme rækkefølge som scripterne i index.html før
// migrationen. Filerne sætter fortsat deres window-globaler (DATA, CW, AI,
// CASE_DOCS, CASE_FACTS, CW_MAP, t), fordi de læser hinanden den vej; Vue-koden
// importerer i stedet de eksporterede værdier. Rækkefølgen betyder noget:
// f.eks. læser case_state.js window.t, når den indlæses.
import './domain/case_documents.js'
import './domain/case_documents_public.js' // offentlige årsrapporter (§ 32) og de interne udgaver
import './domain/data.js'
import './domain/case_facts.js'
import './i18n/index.js'
import './domain/ai.js'
import './domain/case_state.js'
import './domain/mapping.js'
// Logik, der før lå i skærmfilerne og skal køre ved start, uanset hvilken skærm der vises
// (samme rækkefølge som .jsx-filerne i den gamle index.html):
import './domain/tasks.js' // portfolio.jsx: en åbnet sag markeres som set i Mine opgaver
import './domain/financials/index.js' // financials.jsx + fin_chart.jsx: CW_EXPORT_DOCS, finSyncMapping m.m.
import './domain/documents.js' // documents.jsx: DOC_CATS (læser CW ved start), doc*-hjælpere til memo_handoff
import './domain/memo_handoff.js' // memo_handoff.jsx: lægger AI-vejledningen i CW_EXPORT_DOCS (efter financials)
import './domain/prompts.js' // prompt_workshop.jsx: window.CW_PROMPTS (læses også af Regnskab)
import './domain/memo/index.js' // memo_ai.jsx + memo.jsx: CW_MEMO_STATUS, CW_MEMO_SNAPSHOT, seeding m.m.
import './domain/customer.js' // customer_status.jsx: cs*-hjælpere (portalen og sagen)
import './domain/workspace/index.js' // workspace.jsx: CW_SUBMIT_READY, CW_REQUEST_MORE, lyttere m.m.
import './domain/new_case_portal.js' // new_case_portal.jsx: PORTAL_CONTACT (læser DATA ved start), portal-, ERP- og demo-hjælpere
import './domain/onboarding.js' // portal_onboarding.jsx: obLabel (læses af sagen), PV_SCREENS, demo-trin
