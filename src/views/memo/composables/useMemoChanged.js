// Status pr. afsnit, kommentartællere, henvisningernes mærker og ophavsmærkerne regnes af memoets tekst,
// ikke skrevet fast. De regnes igen kort efter hver ændring, ikke ved hvert tastetryk (WSMemo i memo.jsx
// L6086-6094): window-eventet 'memo-changed' (sendes af emitMemoChanged i src/domain/memo/memoReview.js,
// når et afsnit gemmes, en kommentar løses m.m.) tæller memoVersion op efter 250 ms ro.
//
//   const memoVersion = useMemoChanged()   // ref; læs .value i en computed for at følge med
//   memoVersion.value++                    // med det samme (fx når et afsnit lige er markeret som gennemgået)
import { onBeforeUnmount, ref } from 'vue'
import { useWindowEvent } from '@/composables/useWindowEvent'

export function useMemoChanged () {
  const memoVersion = ref(0)
  let timer = null
  useWindowEvent('memo-changed', () => {
    clearTimeout(timer)
    timer = setTimeout(() => { memoVersion.value++ }, 250)
  })
  onBeforeUnmount(() => clearTimeout(timer))
  return memoVersion
}
