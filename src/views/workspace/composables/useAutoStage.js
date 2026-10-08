// Automatiske faseskift mellem Afventer kunden og Klar (WorkspaceShell i workspace.jsx L595–607):
// når alt påkrævet materiale er godkendt, og intet venter på gennemgang, er materialet klar; mister
// et punkt sin godkendelse, eller kommer der nye punkter, afventer sagen igen. Kører, når sagen
// vises, og når punkternes status eller den sendte anmodning ændrer sig (wsItemsKey), også ved
// ændringer fra kundeportalen. Sker aldrig på en indstillet eller afslået sag (CW.stageBlock).
//
//   useAutoStage(() => hasData)   hasData: sagen har levende data (wsCaseHasData)
import { computed, onMounted, toValue, watch } from 'vue'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { wsItemsKey } from '@/domain/workspace/request'
import { wsSyncAutoStage } from '@/domain/workspace/stage'

export function useAutoStage (hasData) {
  const version = useCaseVersion()
  const itemsKey = computed(() => {
    version.value
    return wsItemsKey()
  })
  const run = () => wsSyncAutoStage(toValue(hasData))
  onMounted(run)
  watch([itemsKey, () => toValue(hasData)], run, { flush: 'post' })
}
