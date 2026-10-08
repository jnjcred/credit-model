// Upload-knapper (a-upload med en a-button indeni). ant-design-vue 3.2.13 gør sit omslag om knappen
// til et ekstra Tab-stop (role="button", tabindex="0") uden synligt fokus, som ikke reagerer på
// Mellemrum. Som i prototypen er knappen den eneste kontrol: omslaget (filfeltets forælder) mister
// role og tabindex. Klik, Enter og Mellemrum på knappen åbner stadig filvælgeren (klikket bobler op
// til omslaget). Bruges ikke til a-upload-dragger, hvor omslaget selv er feltet.
//
// Brug: const uploadRoot = ref(null); useUploadButton(uploadRoot)
//   <div ref="uploadRoot"> … <a-upload …><a-button>…</a-button></a-upload> … </div>
import { onMounted, onUpdated } from 'vue'

export function useUploadButton (rootRef) {
  function untab () {
    const root = rootRef.value && (rootRef.value.$el || rootRef.value)
    if (!root || !root.querySelectorAll) return
    root.querySelectorAll('input[type="file"]').forEach((input) => {
      const wrap = input.parentElement
      if (wrap && wrap.getAttribute('role') === 'button') {
        wrap.removeAttribute('tabindex')
        wrap.removeAttribute('role')
      }
    })
  }
  onMounted(untab)
  onUpdated(untab)
}
