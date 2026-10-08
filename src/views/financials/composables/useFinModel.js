// Regnskabets data til tabellen og grafen (financials.jsx AnnualReportSection, F:1459-1481):
// rådgiverens rettelser og kommentarer, modellen med rettelserne lagt ind, om sagen er låst
// (indstillet), hvad kunden har leveret til 2026 og 2027, og kontomappingens status.
// Før migrationen blev det læst igen ved hver ændring i sagen (CW.useCase); her afhænger alt
// af sagens version ('cw-case-changed'). Domænets objekter (ANNUAL_REPORT, FIN_LAYOUT og
// modellen) lægges ikke i ref() eller reactive(): finSyncMapping retter dem på stedet.
import { computed } from 'vue'
import { CW } from '@/domain/case_state'
import { CW_MAP } from '@/domain/mapping'
import { finApplyEdits, finDataState, finLoadEdits, finLoadNotes } from '@/domain/financials/finEdits'
import { useCaseVersion } from '@/composables/useCaseVersion'

export function useFinModel () {
  const version = useCaseVersion()
  // Rettelser: læses igen ved hver ændring i sagen. Er sagen indstillet, kan intet rettes,
  // men markeringerne står.
  const edits = computed(() => { version.value; return finLoadEdits() })
  const model = computed(() => finApplyEdits(edits.value))
  const notes = computed(() => { version.value; return finLoadNotes() })
  const locked = computed(() => { version.value; return !!(CW.caseState() || {}).submittedAt })
  // Hvad kunden har leveret (budget, periodetal): styrer 2026 og 2027 i graf og tabel
  const data = computed(() => { version.value; return finDataState() })
  const hasBudget = computed(() => data.value.hasBudget)
  const months = computed(() => data.value.months)
  const hasForecast = computed(() => hasBudget.value || months.value > 0)
  // Kontomappingen: de realiserede kvartaler kommer fra kundens saldobalance (src/domain/mapping.js).
  // Selve mapperen er et demopunkt i venstremenuen; her åbnes den kun fra advarslen.
  const mapping = computed(() => {
    version.value
    const mapRes = CW_MAP && CW_MAP.ready() ? CW_MAP.compute() : null
    return { unmapped: mapRes ? mapRes.unmapped : [], status: CW_MAP ? CW_MAP.status() : 'error' }
  })
  return { version, edits, model, notes, locked, data, hasBudget, months, hasForecast, mapping }
}
