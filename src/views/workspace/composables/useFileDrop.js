// Træk filer ind på et punkt (workspace.jsx: rækkerne i Anmod om materiale L1917–1919 og kundens
// punkter L2836–2840). Alle filer i ét træk lægges på punktet i ét kald, så der kommer én besked pr.
// træk, som før. ant-design-vue's Upload viser ikke, at et træk er over elementet (kun Dragger, der
// er en stor boks), så det klares her med de samme hændelser som før.
//
//   const { dragging, dropHandlers } = useFileDrop({ onFiles, filesOnly, disabled })
//   <li v-on="dropHandlers"> ... <span v-if="dragging">{{ t('Slip filerne for at uploade på kundens vegne') }}</span>
//     onFiles(files)  får File[] (kan være tom; så gør modtageren ingenting, som før)
//     filesOnly       tag kun imod træk med filer (dataTransfer.types har 'Files'): kundens punkter
//     disabled()      intet træk (låst sag eller punkt): som før uden håndtering
//     dragging        ref: et træk er over elementet (vis hjælpeteksten og markeringen)
import { ref } from 'vue'

export function useFileDrop (options) {
  const opts = options || {}
  const disabled = () => !!(opts.disabled && opts.disabled())
  const dragging = ref(false)

  function onDragover (e) {
    if (disabled()) return
    if (opts.filesOnly && (!e.dataTransfer || Array.from(e.dataTransfer.types || []).indexOf('Files') < 0)) return
    e.preventDefault()
    if (!dragging.value) dragging.value = true
  }
  function onDragleave (e) {
    if (disabled()) return
    if (!e.currentTarget.contains(e.relatedTarget)) dragging.value = false
  }
  function onDrop (e) {
    if (disabled()) return
    e.preventDefault()
    dragging.value = false
    opts.onFiles(Array.from((e.dataTransfer && e.dataTransfer.files) || []))
  }

  return { dragging, dropHandlers: { dragover: onDragover, dragleave: onDragleave, drop: onDrop } }
}
