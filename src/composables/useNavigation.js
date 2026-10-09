/* ─────────────────────────────────────────────────────────────────────────────
   Navigation: samme rutemodel som før migrationen.

   Ruten er en streng, der gemmes i localStorage 'cw_route':
     'cases' | 'requests' | 'analyse' | 'portal' | 'mapping' | 'prompts'
     'workspace:<sagsId>' eller 'workspace:<sagsId>:<fane>'
       fane: overview | financials | documents | memo | indstil
   Et ruteskift sender 'cw-route-changed' ({ detail: { route } }) på window, så
   resten af appen kan reagere (f.eks. lukker beskeder, og en åbnet sag markeres som set).
   ──────────────────────────────────────────────────────────────────────────── */
import { computed, ref } from 'vue'
import { DATA } from '@/domain/data'
import { t } from '@/i18n'
import { pathToState, routeToPath } from './urlPaths'
import { previewMemory, setPreviewMemory } from './usePreviewMemory'

const APP_ROUTES = ['cases', 'requests', 'analyse', 'portal', 'mapping', 'prompts']

// Den gemte rute skal pege på en skærm, der findes. En ældre rute (f.eks. den
// fjernede "settings") eller en sag, som "Nulstil demo" har slettet, fører
// til Mine opgaver i stedet for en tom side.
export function validRoute (r) {
  if (r && r.startsWith('workspace:')) {
    const id = r.split(':')[1]
    return DATA.caseById && DATA.caseById(id) ? r : 'cases'
  }
  return APP_ROUTES.indexOf(r) >= 0 ? r : 'cases'
}

function initialRoute () {
  let saved = null
  // Adressen vinder over det gemte: en genindlæst, delt eller bogmærket side åbner der, hvor den peger
  const fromUrl = pathToState(location.pathname)
  if (fromUrl) {
    try { localStorage.setItem('cw_route', fromUrl.route) } catch (e) {}
    try { sessionStorage.setItem('cw_preview', JSON.stringify(fromUrl.pv)) } catch (e) {}
    if (!fromUrl.pv) { try { sessionStorage.removeItem('cw_preview') } catch (e) {} }
  }
  try { saved = localStorage.getItem('cw_route') } catch (e) {}
  const r = validRoute(saved)
  if (saved && r !== saved) { try { localStorage.setItem('cw_route', r) } catch (e) {} }
  return r
}

export const route = ref(initialRoute())

/* Adressen følger ruten og forhåndsvisningen. Et skift lægges i browserens historik, så Tilbage virker. */
function syncUrl (replace) {
  const p = routeToPath(route.value, previewMemory())
  if (p === location.pathname) return
  try { history[replace ? 'replaceState' : 'pushState'](null, '', p + location.search) } catch (e) {}
}
syncUrl(true)
window.addEventListener('cw-preview-memory', () => syncUrl(false))
// Tilbage og Frem: samme rute med en anden forhåndsvisning tegnes forfra (siden genindlæses), ellers skiftes skærm
window.addEventListener('popstate', () => {
  const st = pathToState(location.pathname) || { route: 'cases', pv: null }
  const cur = previewMemory()
  if (JSON.stringify(st.pv || null) !== JSON.stringify(cur || null) && (st.pv || cur)) {
    try { localStorage.setItem('cw_route', validRoute(st.route)) } catch (e) {}
    setPreviewMemory(st.pv)
    location.reload()
    return
  }
  go(validRoute(st.route), true)
})

/** Skift skærm: gem ruten og fortæl resten af appen det. fromHistory: kaldt fra Tilbage/Frem (adressen er allerede rigtig). */
export function go (r, fromHistory) {
  localStorage.setItem('cw_route', r)
  route.value = r
  // En anden skærm: forhåndsvisningen af kundens side hører til sagens skærm og lukkes
  const pv = previewMemory()
  if (pv && !(r.startsWith('workspace:' + pv.caseId + ':') || r === 'workspace:' + pv.caseId)) { try { sessionStorage.removeItem('cw_preview') } catch (e) {} }
  if (!fromHistory) syncUrl(false)
  try { window.dispatchEvent(new CustomEvent('cw-route-changed', { detail: { route: r } })) } catch (e) {}
}

// Ældre kode og demoens hjælpere åbner skærme via window.__go
window.__go = go

/* Åbn en sag og rul til et bestemt afsnit (f.eks. 'ws-outstanding' eller
   'ws-dialog-title'). Afsnittets id lægges også i sessionStorage
   ('kabul:focus-target'), så sagen selv kan tage det op. */
export function openCase (caseId, targetId) {
  try { if (targetId) sessionStorage.setItem('kabul:focus-target', targetId) } catch (e) {}
  try { sessionStorage.removeItem('cw_back') } catch (e) {} // tilbage fra sagen fører til Mine opgaver
  go('workspace:' + caseId)
  if (!targetId) return
  let n = 0
  const tick = () => {
    const el = document.getElementById(targetId)
    if (el) {
      try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }) } catch (e) {}
      window.CW.focusSoon(el)
      try { sessionStorage.removeItem('kabul:focus-target') } catch (e) {}
      return
    }
    if (++n < 30) setTimeout(tick, 80)
  }
  setTimeout(tick, 150)
}

export const isWorkspace = computed(() => route.value.startsWith('workspace:'))
export const workspaceCaseId = computed(() => {
  const parts = isWorkspace.value ? route.value.split(':') : []
  return parts.length > 1 ? (parseInt(parts[1]) || 1) : 1
})
export const workspaceTab = computed(() => (isWorkspace.value ? (route.value.split(':')[2] || 'overview') : null))

// Sidens titel pr. rute, f.eks. "Nordhavn Composite A/S · Credit memo · Crediwire"
const WS_TAB_TITLES = { overview: 'Overblik', financials: 'Virksomheden', documents: 'Dokumenter', memo: 'Credit memo', indstil: 'Indstilling' }
export function routeTitle (r) {
  const parts = []
  if (r.startsWith('workspace:')) {
    const [, id, tab] = r.split(':')
    const c = DATA.caseById ? DATA.caseById(id) : null
    parts.push(c ? c.name : t('Sag'))
    parts.push(t(WS_TAB_TITLES[tab || 'overview'] || 'Sagen'))
  } else {
    const map = { cases: 'Mine opgaver', requests: 'Dataanmodninger', analyse: 'Porteføljeanalyse', portal: 'Kundeportal', mapping: 'Kontomapping', prompts: 'Prompt-værksted' }
    parts.push(t(map[r] || 'Mine opgaver'))
  }
  parts.push('Crediwire')
  return parts.join(' - ')
}
