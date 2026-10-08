// Rulning pr. fane i sagen (WorkspaceShell i workspace.jsx L577–593): hver fane husker, hvor langt
// den var rullet, og står der igen, når man vender tilbage, så længe sagen er åben. Målet læses,
// før lytteren sættes på: ellers ville den forrige fanes rulning (som browseren klemmer, når
// indholdet skifter) blive gemt under den nye fane. Rulningen sættes i næste frame.
//
//   useTabScrollMemory(scrollEl, () => tab, () => narrow)
//     scrollEl  template-ref til DOM-elementet, der ruller (et almindeligt element, ikke en komponent)
//     tab       fanen (getter eller ref)
//     narrow    valgfri (getter eller ref): under 1000 px skifter rullefeltet (hovedet ruller med),
//               så der startes forfra med det nye element
import { toValue, watch } from 'vue'

export function useTabScrollMemory (scrollEl, tab, narrow) {
  const map = {}
  // Hver kilde for sig: der startes kun forfra, når elementet, fanen eller bredden faktisk skifter
  const sources = [() => toValue(scrollEl), () => toValue(tab), () => (narrow ? toValue(narrow) : null)]
  watch(sources, ([el, key], _prev, onCleanup) => {
    if (!el) return
    const target = map[key] || 0
    const onScroll = () => { map[key] = el.scrollTop }
    const id = requestAnimationFrame(() => {
      el.scrollTop = target
      el.addEventListener('scroll', onScroll, { passive: true })
    })
    onCleanup(() => {
      el.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(id)
    })
  }, { immediate: true, flush: 'post' })
}
