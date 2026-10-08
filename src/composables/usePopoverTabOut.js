// Tab ud af et a-popover, som før migrationen, hvor panelet lå lige efter knappen, der åbnede det.
// ant-design-vue lægger panelet sidst i dokumentet, så Tab fra panelets sidste element gik til <body>
// og sprang resten af siden over. Tab fra det sidste element lukker panelet og fortsætter efter
// knappen; Shift+Tab fra det første element går tilbage til knappen.
//
// Brug: const onPanelKeydown = usePopoverTabOut({ panel: () => panelEl, trigger: () => knap, close })
//       <div ref="panelEl" @keydown="onPanelKeydown"> … </div>
import { FOCUSABLE } from './focusable'

const tabbable = (root) => Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE),
  el => el.tabIndex >= 0 && el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]'))

export function usePopoverTabOut ({ panel, trigger, close }) {
  return function onPanelKeydown (e) {
    if (e.key !== 'Tab') return
    const p = panel()
    const btn = trigger()
    if (!p || !btn) return
    const list = tabbable(p)
    if (!list.length) return
    if (e.shiftKey && document.activeElement === list[0]) {
      e.preventDefault()
      btn.focus()
    } else if (!e.shiftKey && document.activeElement === list[list.length - 1]) {
      e.preventDefault()
      close()
      const all = tabbable(document).filter(el => !p.contains(el))
      const next = all[all.indexOf(btn) + 1]
      if (next) next.focus()
    }
  }
}
