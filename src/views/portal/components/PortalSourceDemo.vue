<script setup>
// Demoknapper ved punkterne på kundens oversigt: kundens datakilder til Regnskab (fanen Virksomheden).
// Knapperne gør det, kunden ellers gør: forbinder e-conomic, uploader saldobalancen som PDF, en intern
// årsrapport eller budgettet (portalDemoPeriod og portalDemoDocument i new_case_portal.js). Alt gemmes i
// sagens tilstand, så Overblik, Dokumenter og Regnskab reagerer som på kundens egne handlinger, og
// "Nulstil demo" rydder det. Om en knap er trykket ned, læses af sagens tilstand, så det også passer
// efter genindlæsning, og knappen er kun trykket ned, når det, den siger, er sket: e-conomic er
// forbundet (samtykket), Periodetal har en PDF, den interne årsrapport er sendt (på punktet eller som
// andre filer), budgettet er sendt. Periodetallene har én kilde ad gangen: ERP og PDF udelukker
// hinanden. Kan kunden ikke selv trække punktet tilbage (godkendt, åbent spørgsmål, rådgiverens filer
// eller kundens svar), gør knappen intet, og en besked siger hvorfor.
//
// Props: sources (knapperne i rækkefølge: 'erp' | 'upload' | 'internal' | 'budget'), item (punktet, den
//        interne årsrapport skrives på: 'm-annual' eller 'm-annual-<år>'), label (punktets navn; giver
//        gruppen navnet "Demo: {label}" for skærmlæsere).
// Skifteknapper (aria-pressed) som OnboardingDemoBar.vue: stiplet = demo, trykket ned = blå kantknap.
// Ingen data-cust-act: knapperne virker også på Kundeside (rådgiverens forhåndsvisning). Ingen fast
// størrelse: de følger portalens a-config-provider (store på telefoner).
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { PORTAL_DEMO_ERP, ncFill, portalDemoDocument, portalDemoPeriod } from '@/domain/new_case_portal'
import { finDelivered, finInternalLoose, finSourceState } from '@/domain/financials/finSources'
import { useCaseVersion } from '@/composables/useCaseVersion'

const props = defineProps({
  sources: { type: Array, required: true },
  item: { type: String, default: 'm-annual' },
  label: { type: String, required: true },
})

const version = useCaseVersion()
const buttons = computed(() => {
  version.value
  const src = finSourceState()
  const consent = CW.consent()
  const interim = CW.itemState('m-interim')
  const pdf = src.period === 'upload' && !!interim && (interim.files || []).some(f => /\.pdf$/i.test(f.name || ''))
  const all = {
    erp: { label: ncFill(t('Forbind {src}'), { src: (consent && consent.system) || PORTAL_DEMO_ERP }), on: !!consent },
    upload: { label: t('Upload saldobalance (PDF)'), on: pdf },
    internal: { label: t('Upload intern årsrapport'), on: finDelivered(CW.itemState(props.item)) || (props.item === 'm-annual' && finInternalLoose().length > 0) },
    budget: { label: t('Upload budget'), on: finDelivered(CW.itemState('m-budget')) },
  }
  return props.sources.filter(k => all[k]).map(k => Object.assign({ key: k }, all[k]))
})

function toggle (b) {
  if (b.key === 'erp' || b.key === 'upload') portalDemoPeriod(b.on ? 'none' : b.key, finSourceState().period)
  else portalDemoDocument(b.key === 'budget' ? 'm-budget' : props.item, !b.on)
}
</script>

<template>
  <div
    role="group"
    :aria-label="ncFill(t('Demo: {item}'), { item: label })"
  >
    <a-space wrap>
      <a-typography-text type="secondary">
        {{ t('Demo:') }}
      </a-typography-text>
      <a-button
        v-for="b in buttons"
        :key="b.key"
        shape="round"
        :type="b.on ? 'primary' : 'dashed'"
        :ghost="b.on"
        :aria-pressed="b.on"
        @click="toggle(b)"
      >
        {{ b.label }}
      </a-button>
    </a-space>
  </div>
</template>
