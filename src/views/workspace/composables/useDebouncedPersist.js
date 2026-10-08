// Gem i stilhed, mens der skrives (WSIndstil i workspace.jsx L3404–3410: begrundelserne og noten).
// Gemmes 400 ms efter sidste ændring, straks ved blur og når skærmen lukkes, og glemmes, når der
// indstilles (så kladden ikke skrives tilbage efter indstillingen).
//
//   const { persistSoon, persist, flush, cancel } = useDebouncedPersist(save, 400)
//     persistSoon()  gem om 400 ms (ved hver ændring; en ny ændring flytter tiden)
//     persist()      gem nu
//     flush()        gem nu, hvis en gemning venter (ved blur; sker også, når skærmen lukkes)
//     cancel()       glem den ventende gemning
//   save: funktion, der gemmer de aktuelle værdier, fx
//     () => wsPersistSubmitDraft({ reasons: { ...reasons }, note: note.value })
import { onBeforeUnmount } from 'vue'

export function useDebouncedPersist (save, delay) {
  const ms = delay == null ? 400 : delay
  let timer = null
  function persist () {
    clearTimeout(timer)
    timer = null
    save()
  }
  function persistSoon () {
    clearTimeout(timer)
    timer = setTimeout(persist, ms)
  }
  function flush () {
    if (timer) persist()
  }
  function cancel () {
    clearTimeout(timer)
    timer = null
  }
  onBeforeUnmount(flush)
  return { persist, persistSoon, flush, cancel }
}
