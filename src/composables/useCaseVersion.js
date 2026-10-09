// Sagstilstanden (window.CW i src/domain/case_state.js) gemmes i localStorage og
// melder ændringer med eventet 'cw-case-changed'. Før migrationen gentegnede
// React-hooket CW.useCase() hele komponenten. I Vue tæller vi en version op; alt,
// der læser CW eller DATA, afhænger af den.
// Bevidst ikke 'storage' (ændringer fra en anden fane): det gamle hook gentegnede
// reelt ikke på dem, og kontomappingen sender selv 'cw-case-changed' via CW.bump().
import { computed, readonly, ref } from 'vue'

const version = ref(0)
let bound = false

function bind () {
  if (bound) return
  bound = true
  window.addEventListener('cw-case-changed', () => { version.value++ })
}

/** Versionen af sagstilstanden. Læs .value i en computed for at følge ændringer. */
export function useCaseVersion () {
  bind()
  return readonly(version)
}

/** En værdi udledt af sagstilstanden, f.eks. useCase(() => CW.progress()). */
export function useCase (getter) {
  const v = useCaseVersion()
  return computed(() => {
    v.value
    return getter()
  })
}
