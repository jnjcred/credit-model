// Overblik: når skærmen er monteret, tages overdragelsen (sagshovedets afsnit, ellers
// sessionStorage 'kabul:focus-material' = materialevalget fra Dataanmodninger, ellers
// 'kabul:ws-focus' = tilbage fra en kilde under Dokumenter), og der rulles dertil efter 80 ms med
// wsScrollTo, som før (WSOverview, workspace.jsx L1002–1020).
import { onBeforeUnmount, onMounted } from 'vue'
import { wsScrollTo, wsTakeOverviewTarget } from '@/domain/workspace/actions'

export function useFocusTarget () {
  let timer = null
  onMounted(() => {
    const target = wsTakeOverviewTarget()
    if (!target) return
    timer = setTimeout(() => wsScrollTo(target), 80)
  })
  onBeforeUnmount(() => clearTimeout(timer))
}
