/* ─────────────────────────────────────────────────────────────────────────────
   Adresser (URL) til skærmene, så en side kan genindlæses, deles og bogmærkes.

   Ruten (useNavigation.js) og forhåndsvisningen af kundens side (usePreviewMemory.js)
   er stadig sandheden; adressen er kun en læsbar udgave af dem:
     /mine-opgaver  /dataanmodninger  /portefoeljeanalyse  /kundeportal  /kontomapping  /prompt-vaerksted
     /sag/1  /sag/1/virksomheden  /sag/1/dokumenter  /sag/1/credit-memo  /sag/1/indstilling
     /sag/1/kundeside            Kundeside åben (oversigten)
     /sag/1/kundeside/connect/m-interim   et punkt i kundens portal (skærm og punkt)
     /sag/1/kundeflow/account    Kundeflow på en af kundens skærme
   Ingen vue-router (MIGRATION_CONTRACT.md): kun history.pushState og popstate.
   ──────────────────────────────────────────────────────────────────────────── */
const APP = { cases: 'mine-opgaver', requests: 'dataanmodninger', analyse: 'portefoeljeanalyse', portal: 'kundeportal', mapping: 'kontomapping', prompts: 'prompt-vaerksted' }
const TABS = { financials: 'virksomheden', documents: 'dokumenter', memo: 'credit-memo', indstil: 'indstilling' }
const invert = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]))
const APP_BY_SLUG = invert(APP)
const TAB_BY_SLUG = invert(TABS)

/** Adressen for en rute og (i en sag) forhåndsvisningen: pv = { caseId, mode: true | 'flow', screen, itemId, pvOb } */
export function routeToPath (route, pv) {
  if (!route || !route.startsWith('workspace:')) return '/' + (APP[route] || APP.cases)
  const [, id, tab] = route.split(':')
  let p = '/sag/' + id + (tab && TABS[tab] ? '/' + TABS[tab] : '')
  if (pv && pv.mode && String(pv.caseId) === String(id)) {
    if (pv.mode === 'flow') {
      p += '/kundeflow'
      if (pv.pvOb) p += '/' + encodeURIComponent(pv.pvOb)
      else if (pv.screen && pv.screen !== 'hub') p += '/' + encodeURIComponent(pv.screen) + (pv.itemId ? '/' + encodeURIComponent(pv.itemId) : '')
    } else {
      p += '/kundeside'
      if (pv.screen && pv.screen !== 'hub') p += '/' + encodeURIComponent(pv.screen) + (pv.itemId ? '/' + encodeURIComponent(pv.itemId) : '')
    }
  }
  return p
}

/** Læser en adresse. Giver { route, pv } eller null (roden eller en ukendt adresse). */
export function pathToState (pathname) {
  const parts = String(pathname || '').split('/').filter(Boolean).map(decodeURIComponent)
  if (!parts.length) return null
  if (parts[0] !== 'sag') return APP_BY_SLUG[parts[0]] ? { route: APP_BY_SLUG[parts[0]], pv: null } : null
  const id = parts[1]
  if (!id) return null
  let i = 2
  let tab = null
  if (parts[i] && TAB_BY_SLUG[parts[i]]) { tab = TAB_BY_SLUG[parts[i]]; i++ }
  const route = 'workspace:' + id + (tab ? ':' + tab : '')
  const kind = parts[i]
  if (kind !== 'kundeside' && kind !== 'kundeflow') return { route, pv: null }
  const a = parts[i + 1] || null
  const b = parts[i + 2] || null
  const caseId = Number(id) || id
  if (kind === 'kundeside') return { route, pv: { caseId, mode: true, step: null, pvOb: undefined, screen: a, itemId: b } }
  // Kundeflow: kundens opstartsskærme (landing, account, signup, login), ellers en skærm i portalen
  const ob = a && ['landing', 'account', 'signup', 'login'].includes(a)
  return { route, pv: { caseId, mode: 'flow', step: null, pvOb: ob ? a : (a ? null : undefined), screen: ob ? null : a, itemId: ob ? null : b } }
}
