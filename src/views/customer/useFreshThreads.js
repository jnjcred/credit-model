// Tråde, der var ulæste, da kunden så siden (customer_status.jsx: useCsFreshThreads).
// Huskes, mens visningen er åben, så "Nyt" ikke forsvinder i samme øjeblik, trådene markeres som
// læst. Skifter visningen (resetKey), er trådene set, og mærkerne ryddes.
// I forhåndsvisningen markeres intet som læst: det er ikke kunden, der kigger.
//
// Brug (i setup):
//   const fresh = useFreshThreads(previewRef, resetKeyRef)
//     previewRef   ref, computed eller getter: true i rådgiverens forhåndsvisning af kundesiden
//     resetKeyRef  ref, computed eller getter: visningen, f.eks. view + ':' + (activeId || '')
//   fresh er Set'et med trådenes id'er (reaktivt).
// Sideeffekt (som før): de ulæste tråde markeres som læst af kunden (CW.markRead(id, 'kunde')),
// når komponenten er monteret, og hver gang der kommer nye. Ikke i forhåndsvisningen.
import { computed, onMounted, reactive, toValue, watch } from 'vue'
import { CW } from '@/domain/case_state'
import { csUnreadForCustomer } from '@/domain/customer'
import { useCaseVersion } from '@/composables/useCaseVersion'

export function useFreshThreads (previewRef, resetKeyRef) {
  const version = useCaseVersion()
  const fresh = reactive(new Set())
  let key = toValue(resetKeyRef)

  // Trådene læses igen, når sagen ændrer sig (som CW.useCase() i den gamle portal)
  const qs = computed(() => {
    version.value
    return CW.questions()
  })

  // Før gengivelsen, som før: en ny visning rydder mærkerne, og tråde, der er ulæste nu, huskes
  watch([qs, () => toValue(resetKeyRef)], ([list, resetKey]) => {
    if (key !== resetKey) { key = resetKey; fresh.clear() }
    list.forEach(q => { if (csUnreadForCustomer(q)) fresh.add(q.id) })
  }, { immediate: true })

  const unread = computed(() => (toValue(previewRef) ? '' : qs.value.filter(csUnreadForCustomer).map(q => q.id).join(',')))

  // Efter gengivelsen, som React-effekten før: markér de ulæste tråde som læst af kunden
  function markRead () {
    const ids = unread.value
    if (!ids) return
    ids.split(',').forEach(id => CW.markRead(id, 'kunde'))
  }
  onMounted(markRead)
  watch(unread, markRead, { flush: 'post' })

  return fresh
}
