// Piletaster mellem faner. ant-design-vue 3.2.13's faner kan fokuseres, men piletaster,
// Home og End skifter ikke fane, som prototypens faner gjorde. Lægges på et element rundt
// om <a-tabs :id="tabsId">; fanerne har id'erne `${tabsId}-tab-${key}`.
//
// Brug (i setup): <div @keydown="onTabsKeydown"><a-tabs :id="tabsId" :aria-label="..." ...></div>
//   const onTabsKeydown = useTabsKeyboard(tabsId, () => keys, (key) => select(key))
//
// To ting, 3.2.13 ikke selv kan, rettes efter hver gengivelse (ingen props til det):
//  - Fanelistens navn: aria-label fra <a-tabs> lander på den ydre div, ikke på role="tablist".
//    Navnet kopieres til fanelisten, så skærmlæsere hører det som i prototypen.
//  - Panelerne er ikke selv Tab-stop, som i prototypen: antdv giver det aktive panel tabindex="0",
//    så det blev et ekstra Tab-stop uden synligt fokus (og et tomt et, hvor fanernes indhold står
//    uden for a-tabs, fx filtre og visninger). Tab går fra fanen videre til panelets indhold.
//  - Kun den valgte fane er et Tab-stop (roving tabindex, som prototypens faner); piletasterne
//    flytter mellem fanerne. antdv gør ellers hver fane til et Tab-stop. Er ingen fane valgt (fx
//    under en søgning i Mine opgaver), er den første fane Tab-stoppet, som før.
// Rettelserne køres, når komponenten tegnes, og igen, når antdv selv ændrer fanerne (et skift af fane,
// nye paneler): fanerne kan ligge i en slot, som en anden komponent tegner (fx memoets fejlgrænse), og
// så opdateres komponenten, der bruger hjælperen, ikke selv.
import { onBeforeUnmount, onMounted, onUpdated } from 'vue'

export function useTabsKeyboard (tabsId, keys, select) {
  function fixTabs () {
    const root = document.getElementById(tabsId)
    if (!root) return
    const list = root.querySelector(':scope > [role="tablist"]')
    const label = root.getAttribute('aria-label')
    if (list && label && list.getAttribute('aria-label') !== label) list.setAttribute('aria-label', label)
    if (list) {
      const tabs = Array.prototype.filter.call(list.querySelectorAll('[role="tab"]'), tab => tab.getAttribute('aria-disabled') !== 'true')
      const current = tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]
      tabs.forEach((tab) => {
        const want = tab === current ? '0' : '-1'
        if (tab.getAttribute('tabindex') !== want) tab.setAttribute('tabindex', want)
      })
    }
    root.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
      if (panel.getAttribute('tabindex') !== '-1') panel.setAttribute('tabindex', '-1')
    })
  }
  let observer = null
  let observed = null
  function watchTabs () {
    fixTabs()
    const root = document.getElementById(tabsId)
    if (!root || root === observed) return
    if (observer) observer.disconnect()
    observed = root
    observer = new MutationObserver(fixTabs)
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-selected', 'tabindex'] })
  }
  onMounted(watchTabs)
  onUpdated(watchTabs)
  onBeforeUnmount(() => { if (observer) observer.disconnect() })

  return function onTabsKeydown (e) {
    if (!e.target || e.target.getAttribute('role') !== 'tab') return
    const list = keys()
    if (!list.length) return
    const current = String(e.target.id || '').slice((tabsId + '-tab-').length)
    const i = Math.max(0, list.indexOf(current))
    let j = null
    if (e.key === 'ArrowRight') j = (i + 1) % list.length
    else if (e.key === 'ArrowLeft') j = (i - 1 + list.length) % list.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = list.length - 1
    if (j == null) return
    e.preventDefault()
    select(list[j])
    setTimeout(() => {
      const el = document.getElementById(tabsId + '-tab-' + list[j])
      if (el) el.focus()
    }, 0)
  }
}
