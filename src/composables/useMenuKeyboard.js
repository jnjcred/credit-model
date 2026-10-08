// Tastatur i dropdown-menuer. I ant-design-vue 3.2.13 åbner Enter menuen, men fokus bliver
// på knappen, og punkterne (tabindex -1) kan ikke nås med piletaster; Esc lukker heller ikke.
// Prototypens menuer kunne betjenes helt med tastaturet, så det tilføjes her uden om
// komponentens indre: punkterne findes via deres ARIA-rolle i menuen med det givne id.
//
// Brug (menuen har :id, dropdownen styres med :visible/@visible-change):
//   const kb = useMenuKeyboard()
//   function onVisible (v) { v ? kb.attach({ menuId: 'x-menu', trigger: () => el, close }) : kb.detach() }
import { nextTick, onBeforeUnmount } from 'vue'
import { FOCUSABLE } from './focusable'

// Også menuitemradio (sprogvalget og "Flyt sagen til" har en valgt værdi, som før migrationen)
const ITEM = '[role^="menuitem"]:not([aria-disabled="true"])'

// Elementet før eller efter `el` i tabulatorrækkefølgen (synlige elementer i dokumentet)
function neighbour (el, backwards) {
  const all = Array.prototype.filter.call(document.querySelectorAll(FOCUSABLE), x => x.getClientRects().length > 0)
  const i = all.indexOf(el)
  if (i < 0) return null
  return all[backwards ? i - 1 : i + 1] || null
}

export function useMenuKeyboard () {
  let handler = null
  let timer = null

  function detach () {
    if (handler) document.removeEventListener('keydown', handler, true)
    handler = null
    clearTimeout(timer)
  }

  /** menuId: id på <a-menu>; trigger: () => knappen; close: lukker dropdownen. */
  function attach ({ menuId, trigger, close }) {
    detach()
    const items = () => {
      const menu = document.getElementById(menuId)
      return menu ? Array.prototype.filter.call(menu.querySelectorAll(ITEM), x => x.getClientRects().length > 0) : []
    }
    const focusAt = (i) => {
      const list = items()
      if (list.length) list[(i + list.length) % list.length].focus()
    }
    const done = (focusEl) => {
      close()
      detach()
      if (focusEl && focusEl.focus) focusEl.focus()
    }
    // Fokus på det første punkt, så snart menuen er synlig (den tegnes med en animation)
    let n = 0
    const first = () => {
      const list = items()
      if (list.length) list[0].focus()
      if (list.length && document.activeElement === list[0]) return
      if (++n < 40) timer = setTimeout(first, 25)
    }
    nextTick(first)

    handler = (e) => {
      const list = items()
      const i = list.indexOf(document.activeElement)
      const trig = trigger && trigger()
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation()
        done(trig)
        return
      }
      // Tab lukker menuen og fortsætter fra knappen, som hvis menuen lå lige efter den
      if (e.key === 'Tab') {
        e.preventDefault()
        done(e.shiftKey ? trig : (trig && neighbour(trig, false)) || trig)
        return
      }
      if (i < 0 && !(e.key === 'ArrowDown' || e.key === 'ArrowUp')) return
      if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(i + 1) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(i < 0 ? -1 : i - 1) }
      else if (e.key === 'Home') { e.preventDefault(); focusAt(0) }
      else if (e.key === 'End') { e.preventDefault(); focusAt(list.length - 1) }
      // Enter/Mellemrum vælger punktet. Hændelsen stoppes her, ellers reagerer antdv's menupunkt
      // også selv på Enter, og menuens @click kom to gange
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); list[i].click() }
    }
    document.addEventListener('keydown', handler, true)
  }

  onBeforeUnmount(detach)
  return { attach, detach }
}
