<script setup>
/* Kilderne under regnskabstabellen (financials.jsx AnnualReportSection, F:2025-2056; Regnskab v5):
   årsrapporterne (offentlige fra CVR og, når kunden har sendt den, den interne), periodetallene
   (saldobalancen fra e-conomic via kontomappingen, eller kundens uploadede saldobalance) og
   budgettet. Kilderne følger visningen (src: sagens kilder eller demoknappernes). Findes
   dokumentet i sagen, åbner navnet det under Dokumenter: dokumentet lægges i sessionStorage
   'kabul:open-doc', 'cw-open-doc' sendes, og fanen skiftes (som før migrationen).
   Kanttilfældene i demoen (src.edge) er eksempeldata: årsrapporterne står uden år og link, for
   regnskabsårene passer ikke med sagens dokumenter (f.eks. 2022/23 ved regnskabsår fra juli).
   Props: src (kilderne i visningen, finSources.js) */
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { FIN_ANNUAL_YEARS } from '@/domain/financials/finData'
import { finFill, finPublicDataDate } from '@/domain/financials/finFormat'
import { DATA } from '@/domain/data'
import { finSourceDoc } from '@/domain/financials/finExportDocs'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { go } from '@/composables/useNavigation'

const props = defineProps({
  src: { type: Object, required: true },
})

const version = useCaseVersion()
// Kundens interne årsrapport (punktet 'm-annual' eller 'm-annual-<år>'), når den er sendt
const internalDoc = () => {
  const up = CW.allUploads().filter(f => f.itemId && /^m-annual(-\d{4})?$/.test(f.itemId) && f.itemStatus !== 'rejected')
  return up.length ? { id: up[up.length - 1].id, name: up[up.length - 1].name } : undefined
}
const items = computed(() => {
  version.value
  const s = props.src
  const out = s.edge ? [{ key: 'ar', label: t('Årsrapporter (eksempeldata)') }]
    : FIN_ANNUAL_YEARS.map(y => ({ key: y, label: t('Årsrapport') + ' ' + y, doc: finSourceDoc('Årsrapport', y) }))
  if (s.internal.some(Boolean)) out.push({ key: 'intern', label: t('Intern årsrapport'), doc: s.demo ? undefined : internalDoc() })
  if (s.period === 'erp') out.push({ key: 'saldo', label: t('Saldobalance fra e-conomic (kontomapping)') })
  else if (s.period === 'upload') out.push({ key: 'periode', label: t('Saldobalance, upload'), doc: s.demo ? undefined : finSourceDoc('Periodetal') })
  if (s.budget) out.push({ key: 'budget', label: t('Budget'), doc: s.demo ? undefined : finSourceDoc('Budget') })
  return out
})

// Hover på en kilde viser, hvornår den er lavet og hentet: årsrapporterne fra CVR med offentliggørelsen
// og hentningen, uploads med uploaden, saldobalancen fra regnskabssystemet med forbindelsen
function tipOf (it) {
  const d = it.doc
  if (d && d.date) return finFill(t('Offentliggjort {date} - hentet {fetched}'), { date: DATA.fmt.longDate(d.date), fetched: finPublicDataDate() })
  const up = d && CW.allUploads().find(f => f.id === d.id)
  if (up && up.at) return finFill(t('Uploadet {date}'), { date: CW.fmtDate(up.at) })
  const c = it.key === 'saldo' && CW.consent ? CW.consent() : null
  if (c && c.at) return finFill(t('Forbundet {date}'), { date: CW.fmtDate(c.at) })
  return undefined
}

const openDoc = (it) => {
  const detail = { doc: it.doc.id, name: it.doc.name, ref: null, back: null }
  try { sessionStorage.setItem('kabul:open-doc', JSON.stringify(detail)) } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('cw-open-doc', { detail })) } catch (e) {}
  go('workspace:1:documents')
}
</script>

<template>
  <div class="fin-sources">
    <a-typography-text type="secondary">
      {{ t('Kilder') }}:
    </a-typography-text>
    <template
      v-for="(it, i) in items"
      :key="it.key"
    >
      <a-typography-text
        v-if="i > 0"
        type="secondary"
      >
        -
      </a-typography-text>
      <a-tooltip :title="tipOf(it)">
        <a-button
          v-if="it.doc"
          class="cw-link"
          type="link"
          size="small"
          @click="openDoc(it)"
        >
          {{ it.label }}
        </a-button>
        <a-typography-text
          v-else
          type="secondary"
        >
          {{ it.label }}
        </a-typography-text>
      </a-tooltip>
    </template>
  </div>
</template>

<style scoped>
.fin-sources {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 4px;
}
</style>
