// Memoets status i sagen (workspace.jsx: wsMemoStatus og memoTick i WorkspaceShell).
// CW_MEMO_STATUS (memoets kode, src/domain/memo) regner hele memoet igennem (ca. 10 ms). Svaret
// genbruges i samme opgave og ryddes, når sagen eller memoet ændrer sig ('cw-case-changed',
// 'memo-changed'; lytterne sættes ved start i src/domain/workspace/index.js). Findes
// CW_MEMO_STATUS ikke, er status null, som før: klarhedstjekket blokerer så med "Memoets status
// kan ikke læses", og fasekortet viser ingen afsnit.
//
//   const memoVersion = useMemoVersion()  tæller op ved 'memo-changed' (memoet er rettet)
//   const x = useCaseAndMemo(() => ...)   computed, der følger både sagen og memoet. Brug den til alt,
//     der (også indirekte) læser memoets status: wsSubmitReady, wsReadiness, wsStatusKey,
//     wsPhaseName, wsMemoTabNext, wsHeaderModel, wsStageHero, wsIndstilCheck.
import { computed, readonly, ref } from 'vue'
import { useCaseVersion } from '@/composables/useCaseVersion'

const memoVersion = ref(0)
let bound = false

function bind () {
  if (bound) return
  bound = true
  window.addEventListener('memo-changed', () => { memoVersion.value++ })
}

export function useMemoVersion () {
  bind()
  return readonly(memoVersion)
}

export function useCaseAndMemo (getter) {
  const caseVersion = useCaseVersion()
  const memo = useMemoVersion()
  return computed(() => {
    caseVersion.value
    memo.value
    return getter()
  })
}
