// Regnskabets data til tabellen og grafen (financials.jsx AnnualReportSection, F:1459-1481):
// rådgiverens rettelser og kommentarer, om sagen er låst (indstillet), kundens kilder (Regnskab
// v5: årsrapporter, periodetal og budget, finSources.js), rådgiverens valg af "bogført til og med"
// og kontomappingens status. Modellen med rettelserne lægges ind i AnnualReportSection, fordi den
// afhænger af kilderne i visningen (demoknapperne ved tabellen).
// Før migrationen blev det læst igen ved hver ændring i sagen (CW.useCase); her afhænger alt
// af sagens version ('cw-case-changed'). Domænets objekter (ANNUAL_REPORT, FIN_LAYOUT og
// modellen) lægges ikke i ref() eller reactive(): finSyncMapping retter dem på stedet.
import { computed } from 'vue'
import { CW } from '@/domain/case_state'
import { CW_MAP } from '@/domain/mapping'
import { finLoadEdits, finLoadNotes } from '@/domain/financials/finEdits'
import { finLoadPeriod, finSourceState } from '@/domain/financials/finSources'
import { useCaseVersion } from '@/composables/useCaseVersion'

export function useFinModel () {
  const version = useCaseVersion()
  // Rettelser: læses igen ved hver ændring i sagen. Er sagen indstillet, kan intet rettes,
  // men markeringerne står.
  const edits = computed(() => { version.value; return finLoadEdits() })
  const notes = computed(() => { version.value; return finLoadNotes() })
  const locked = computed(() => { version.value; return !!(CW.caseState() || {}).submittedAt })
  // Hvad kunden har leveret, og hvordan det er læst: styrer kolonnerne i graf og tabel
  const sources = computed(() => { version.value; return finSourceState() })
  // Rådgiverens valg af "bogført til og med" (ERP), eller null = Crediwires vurdering
  const period = computed(() => { version.value; return finLoadPeriod() })
  // Kontomappingen: de realiserede måneder kommer fra kundens saldobalance (src/domain/mapping.js).
  // Selve mapperen er et demopunkt i venstremenuen; her åbnes den kun fra advarslen.
  const mapping = computed(() => {
    version.value
    const mapRes = CW_MAP && CW_MAP.ready() ? CW_MAP.compute() : null
    return { unmapped: mapRes ? mapRes.unmapped : [], status: CW_MAP ? CW_MAP.status() : 'error' }
  })
  return { version, edits, notes, locked, sources, period, mapping }
}
