// Under ca. 1440 px er kommentarerne en skuffe i kanten (WSMemo i memo.jsx L6056-6064). onWide kaldes,
// når skærmen bliver bred igen (skuffen lukkes, så den ikke står åben næste gang).
//
//   const narrow = useMemoNarrow(() => { drawerOpen.value = false })
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { MEMO_NARROW_MQ } from './memoPage'

export function useMemoNarrow (onWide) {
  const narrow = ref(window.matchMedia(MEMO_NARROW_MQ).matches)
  let mq = null
  const on = () => {
    narrow.value = mq.matches
    if (!mq.matches && onWide) onWide()
  }
  onMounted(() => {
    mq = window.matchMedia(MEMO_NARROW_MQ)
    mq.addEventListener('change', on)
  })
  onBeforeUnmount(() => { if (mq) mq.removeEventListener('change', on) })
  return narrow
}
