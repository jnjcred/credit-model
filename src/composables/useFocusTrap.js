// Tab bliver i et åbent panel, som før migrationen (CW.useDialog i case_state.js og navigations-
// panelet i app.jsx). ant-design-vue 3.2.13's modaler holder selv fokus inde, men popover og drawer
// gør ikke: Tab fra panelets sidste element gik videre til siden bagved.
// Står fokus uden for panelet (fx i brugermenuen, som antdv lægger i body), styrer den menu selv Tab.
//
// Brug: const focusTrap = useFocusTrap()
//       focusTrap.trap(() => panelEl)   når panelet åbner
//       focusTrap.release()             når det lukker (sker også, når komponenten fjernes)
import { onBeforeUnmount } from 'vue'
import { FOCUSABLE } from './focusable'

// Synlige Tab-stop i panelet. I en gruppe radioknapper er kun den valgte et Tab-stop.
function tabStops (el) {
  return Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), (n) => {
    if (!n.getClientRects().length) return false
    if (n.type === 'radio' && !n.checked && n.name) {
      return !el.querySelector('input[type="radio"][name="' + n.name + '"]:checked')
    }
    return true
  })
}

export function useFocusTrap () {
  let handler = null

  function release () {
    if (handler) document.removeEventListener('keydown', handler, true)
    handler = null
  }

  /** panel: () => panelets element (eller null, når det ikke findes). */
  function trap (panel) {
    release()
    handler = (e) => {
      if (e.key !== 'Tab') return
      const el = panel()
      const at = document.activeElement
      if (!el || (at && at !== document.body && !el.contains(at))) return
      const f = tabStops(el)
      if (!f.length) { e.preventDefault(); return }
      const first = f[0]
      const last = f[f.length - 1]
      if (f.indexOf(at) < 0) { e.preventDefault(); (e.shiftKey ? last : first).focus() }
      else if (e.shiftKey && at === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handler, true)
  }

  onBeforeUnmount(release)
  return { trap, release }
}
