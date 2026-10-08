// Dybdelink og versionsvisning (WSMemo i memo.jsx L6140-6245, ordret). window.CW_OPEN_MEMO og
// CW_OPEN_MEMO_VERSION (src/domain/memo/index.js) sætter et ventende mål eller en version, skifter til
// memofanen og sender 'cw-memo-open' / 'cw-memo-view'. Siden:
//  - overtager et ventende dybdelink, når den monteres og på 'cw-memo-open' (lukker en åben versionsvisning)
//    og går til afsnittet, det tomme felt (og folder vejledningen ud, hvis feltet står i den) eller
//    kommentaren (kommentarfanen; skuffen på smalle skærme), efter 120 ms
//  - viser versionen på 'cw-memo-view': tegner om (viewTick), ruller til toppen og giver banneret fokus
//  - viser memoet som normalt igen, når den forlades
// Målet markeres (.memo-target), indtil der klikkes et andet sted. Ingen animation.
//
//   const link = useMemoDeepLink({ getRoot, active, pin, railTab, narrow, drawerOpen, viewTick })
//   link.closeVersionView()   // "Til den gældende version" / "Tilbage til udkastet"
import { onBeforeUnmount, onMounted } from 'vue'
import { CW } from '@/domain/case_state'
import { memoBlankFields } from '@/domain/memo/memoStatus'
import { _memoPendingOpen, _memoView, setMemoPendingOpen, setMemoView } from '@/domain/memo/memoView'

export function useMemoDeepLink ({ getRoot, active, pin, railTab, narrow, drawerOpen, viewTick }) {
  function open () {
    const tgt = _memoPendingOpen
    if (!tgt) return
    setMemoPendingOpen(null)
    if (_memoView) { setMemoView(null); viewTick.value++ }
    setTimeout(() => { openTarget(tgt) }, 120)
  }
  function onView () {
    viewTick.value++
    const root = getRoot()
    if (root) root.scrollTop = 0
    CW.focusSoon('#memo-version-banner')
  }
  function closeVersionView () {
    setMemoView(null)
    viewTick.value++
    const root = getRoot()
    if (root) root.scrollTop = 0
  }
  onMounted(() => {
    open()
    // Migration: sagen indlæser memoet først, når fanen vises (WorkspaceView: defineAsyncComponent), så
    // 'cw-memo-view' kan komme, før siden er monteret. Er en version valgt ved monteringen (_memoView
    // nulstilles, hver gang siden forlades), vises den, som når eventet kommer.
    if (_memoView) onView()
    window.addEventListener('cw-memo-open', open)
    window.addEventListener('cw-memo-view', onView)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('cw-memo-open', open)
    window.removeEventListener('cw-memo-view', onView)
    // Forlader man memoet, vises det som normalt næste gang
    setMemoView(null)
  })

  // Markerer målet, indtil der klikkes et andet sted. Ingen animation.
  function markTarget (el) {
    if (!el) return
    document.querySelectorAll('.memo-target').forEach(x => x.classList.remove('memo-target'))
    el.classList.add('memo-target')
    const off = () => { el.classList.remove('memo-target'); document.removeEventListener('pointerdown', off, true) }
    document.addEventListener('pointerdown', off, true)
  }
  // Fanens fokus-fallback (App.vue: den aktive fane i sagen) kan komme efter os, når memoet er tungt at
  // tegne. Står fokus derefter på fanen eller siden, sættes det igen.
  // Migration: sagens faner er ant-design-vue-faner (#ws-tabs [role="tab"]), ikke prototypens .ws-tab.
  function keepFocus (fn) {
    fn()
    setTimeout(() => {
      const a = document.activeElement
      if (!a || a === document.body || !a.isConnected || (a.matches && a.matches('#ws-tabs [role="tab"]'))) fn()
    }, 300)
  }
  function openTarget (tgt) {
    const k = tgt.section
    const secEl = k ? document.getElementById('ms-' + k) : null
    if (!secEl) return
    pin.until = Date.now() + 1200
    active.value = k
    if (tgt.field) {
      const body = secEl.querySelector('.memo-body')
      const f = body ? memoBlankFields(k, body.innerHTML).find(x => x.id === tgt.field) : null
      const el = f ? body.querySelectorAll('.tpl-blank')[f.index] : null
      // Feltet står i skabelonens foldede vejledning (fx "bilag 2" i afsnit 6):
      // vejledningen foldes ud, og dybdelinket prøves igen, når den er tegnet
      if (el && secEl.classList.contains('guide-folded') && el.closest('.tpl-hints, .tpl-hint, .tpl-note, .tpl-guide') && !tgt.__guide) {
        window.dispatchEvent(new CustomEvent('memo-show-guide', { detail: { sKey: k } }))
        setTimeout(() => openTarget(Object.assign({}, tgt, { __guide: true })), 80)
        return
      }
      if (el) {
        el.scrollIntoView({ block: 'center' })
        keepFocus(() => {
          try {
            // Kan der skrives i afsnittet, står markøren i feltet. Ellers får feltet selv fokus.
            if (body.isContentEditable) body.focus({ preventScroll: true })
            else { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }) }
            const r = document.createRange()
            r.selectNodeContents(el)
            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(r)
          } catch (e) {}
        })
        markTarget(el)
        return
      }
    }
    secEl.scrollIntoView({ block: 'start' })
    if (tgt.commentId != null) {
      railTab.value = 'comments'
      if (narrow.value) drawerOpen.value = true
      const q = '[data-cmt="cmt-' + k + '-' + tgt.commentId + '"]'
      let tries = 0
      const find = () => {
        const el = document.querySelector(q)
        if (el) {
          // En løst eller trukket kommentar er foldet sammen; dens linje er foldens overskrift (role=button)
          const b = el.querySelector('button, [role="button"]')
          if (b) keepFocus(() => b.focus({ preventScroll: true }))
          markTarget(el)
          return
        }
        if (++tries < 30) setTimeout(find, 80)
      }
      setTimeout(find, 150)
      return
    }
    keepFocus(() => { const h = document.getElementById('ms-' + k + '-h'); if (h) h.focus({ preventScroll: true }) })
  }

  return { closeVersionView }
}
