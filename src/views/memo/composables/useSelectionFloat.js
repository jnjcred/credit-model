// Markering i teksten giver en flydende "Omskriv markeringen"-knap (WSMemo i memo.jsx L6414-6432): når der
// er markeret mindst 8 tegn i et afsnits tekst, står knappen midt over markeringen. Den skjules, når
// markeringen forsvinder (og når siden ruller: useRailLayout's onScroll sætter floatBtn til null).
//
//   const floatBtn = useSelectionFloat()   // ref: { sKey, text, x, y } eller null
import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useSelectionFloat () {
  const floatBtn = ref(null)
  const onSel = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { floatBtn.value = null; return }
    let node = sel.anchorNode
    const el = node && (node.nodeType === 3 ? node.parentElement : node)
    const body = el && el.closest ? el.closest('.memo-body') : null
    const sec = body && body.closest ? body.closest('[id^="ms-"]') : null
    if (!body || !sec) { floatBtn.value = null; return }
    const text = sel.toString().trim()
    if (text.length < 8) { floatBtn.value = null; return }
    const r = sel.getRangeAt(0).getBoundingClientRect()
    if (!r || (!r.width && !r.height)) { floatBtn.value = null; return }
    floatBtn.value = { sKey: sec.id.replace('ms-', ''), text, x: r.left + r.width / 2, y: r.top }
  }
  onMounted(() => document.addEventListener('selectionchange', onSel))
  onBeforeUnmount(() => document.removeEventListener('selectionchange', onSel))
  return floatBtn
}
