// Under 1000 px (f.eks. 200 % zoom) foldes sidebjælken ind og åbnes fra menuknappen,
// og sagshovedet ruller med indholdet. Samme grænse som før migrationen.
import { onBeforeUnmount, onMounted, ref } from 'vue'

export const SHELL_NARROW_MQ = '(max-width: 999px)'

export function useShellNarrow () {
  const narrow = ref(window.matchMedia(SHELL_NARROW_MQ).matches)
  let mq = null
  const on = () => { narrow.value = mq.matches }
  onMounted(() => {
    mq = window.matchMedia(SHELL_NARROW_MQ)
    narrow.value = mq.matches
    mq.addEventListener('change', on)
  })
  onBeforeUnmount(() => { if (mq) mq.removeEventListener('change', on) })
  return narrow
}
