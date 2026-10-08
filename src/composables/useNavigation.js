/* ─────────────────────────────────────────────────────────────────────────────
   Navigation: samme rutemodel som før migrationen.

   Ruten er en streng, der gemmes i localStorage 'cw_route':
     'cases' | 'requests' | 'analyse' | 'portal' | 'mapping' | 'prompts'
     'workspace:<sagsId>' eller 'workspace:<sagsId>:<fane>'
       fane: overview | financials | documents | memo | indstil
   Et ruteskift sender 'cw-route-changed' ({ detail: { route } }) på window, så
   resten af appen kan reagere (fx lukker beskeder, og en åbnet sag markeres som set).
   ──────────────────────────────────────────────────────────────────────────── */
import { computed, ref } from 'vue'
import { DATA } from '@/domain/data'
import { t } from '@/i18n'

const APP_ROUTES = ['cases', 'requests', 'analyse', 'portal', 'mapping', 'prompts']

// Den gemte rute skal pege på en skærm, der findes. En ældre rute (fx den
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
  try { saved = localStorage.getItem('cw_route') } catch (e) {}
  const r = validRoute(saved)
  if (saved && r !== saved) { try { localStorage.setItem('cw_route', r) } catch (e) {} }
  return r
}

export const route = ref(initialRoute())

/** Skift skærm: gem ruten og fortæl resten af appen det. */
export function go (r) {
  localStorage.setItem('cw_route', r)
  route.value = r
  try { window.dispatchEvent(new CustomEvent('cw-route-changed', { detail: { route: r } })) } catch (e) {}
}

// Ældre kode og demoens hjælpere åbner skærme via window.__go
window.__go = go

/* Åbn en sag og rul til et bestemt afsnit (fx 'ws-outstanding' eller
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

// Sidens titel pr. rute, fx "Nordhavn Composite A/S · Credit memo · Crediwire"
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
  return parts.join(' · ')
}
