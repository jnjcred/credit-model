/* Demoknapperne ved regnskabstabellen: en visning af andre kilder og kanttilfælde. Tilstanden ligger
   kun i hukommelsen (ikke i localStorage eller sessionStorage): den ændrer kun visningen af
   Regnskab, følger med, hvis man skifter fane i sagen, og er væk efter en genindlæsning.
   override: null (sagens data) eller { annual, period, budget, estBy, edge } (finApplySourceOverride)
   to: den måned, perioden er valgt til i demovisningen (t), eller null */
import { ref } from 'vue'

const override = ref(null)
const to = ref(null)
// Demo: er ét bestyrelsesmedlem PEP? Standard er ingen PEP. Vises i ejerskabskortet, styres fra demomenuen (kun i hukommelsen)
const pep = ref(false)

export function useFinDemoView () {
  return { override, to, pep }
}
