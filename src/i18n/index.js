// Sprogvalg: dansk er selve nøglen, t('Ny sag'). Engelske (og svenske) ordbøger
// flettes ind i window.I18N af filerne i ./dict, i samme rækkefølge som den
// tidligere sammenkædede i18n_dictionaries.js (indholdet er identisk).
import { lang, setLang, t } from './i18n.js'
import './dict/analyse.js'
import './dict/content.js'
import './dict/documents.js'
import './dict/financials.js'
import './dict/memo-ai.js'
import './dict/memo.js'
import './dict/ownership-ai.js'
import './dict/portal.js'
import './dict/portfolio.js'
import './dict/requests.js'
import './dict/tweaks.js'
import './dict/workspace.js'
import './dict/customer.js'

export { lang, setLang, t }

// Datofelternes visning (a-date-picker): som datoerne i resten af appen
export const dateInputFormat = lang === 'en' ? 'D MMM YYYY' : 'DD-MM-YYYY'
