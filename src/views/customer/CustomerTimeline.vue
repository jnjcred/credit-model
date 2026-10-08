<script setup>
// Behandlingsstatus: tidslinjen over sagens behandling (customer_status.jsx: CWTimeline).
// Fem trin (Sag oprettet, Materialeindsamling, Kreditanalyse, Kreditindstilling, Afgørelse) med
// tilstanden afsluttet / i gang / kommer senere og datoerne. Reglerne er csTimeline
// (src/domain/customer.js). Bruges af portalens statusside.
// Props: ingen. Emits: ingen.
//
// a-steps med progress-dot; på små skærme (under 576 px) står trinnene lodret (antdv's responsive).
// I 3.2.13 gør a-steps hvert trin til en knap (role="button", tabindex 0), også uden @change.
// Trinnene kan ikke vælges, så de er disabled: ingen falske knapper. Listen og "nuværende trin"
// (aria-current="step") fra prototypens ol/li ligger som ARIA på trinnene; a-steps sender ikke
// attributter videre til sin rod, så listen er elementet rundt om.
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csTimeline } from '@/domain/customer'
import { useCaseVersion } from '@/composables/useCaseVersion'

const version = useCaseVersion()
const stages = computed(() => {
  version.value
  return csTimeline(CW.progress(), CW.request(), CW.draft(), CW.caseState() || {})
})

const STEP_STATUS = { done: 'finish', active: 'process', upcoming: 'wait' }
const current = computed(() => stages.value.findIndex(s => s.state === 'active'))
const stateText = (s) => (s.state === 'done' ? t('afsluttet') : s.state === 'active' ? t('i gang') : t('kommer senere'))
</script>

<template>
  <a-card class="cs-timeline">
    <template #title>
      <span
        role="heading"
        aria-level="2"
      >{{ t('Behandlingsstatus') }}</span>
    </template>
    <div role="list">
      <a-steps
        class="cs-steps"
        progress-dot
        :current="current"
      >
        <a-step
          v-for="s in stages"
          :key="s.k"
          role="listitem"
          :aria-current="s.state === 'active' ? 'step' : undefined"
          :status="STEP_STATUS[s.state]"
          :description="s.sub"
          disabled
        >
          <template #title>
            {{ s.label }}<span class="sr-only">{{ ': ' + stateText(s) }}</span>
          </template>
        </a-step>
      </a-steps>
    </div>
  </a-card>
</template>
