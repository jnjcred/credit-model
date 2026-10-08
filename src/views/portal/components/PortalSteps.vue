<script setup>
// "Behandlingsstatus" øverst på kundens oversigt (new_case_portal.jsx: PortalSteps, L1501–1553):
// behandlingen i tre korte trin, Materiale, EIFO vurderer sagen og Afgørelse, bygget på csTimeline.
// Indstillingen er en del af vurderingen her: kunden skal kun vide, hvor sagen er, og hvornår der kommer svar.
// Props: ingen.
//
// a-steps med progress-dot (ingen ikoner med engelske navne); på små skærme (under 576 px) står trinnene
// under hinanden (antdv's responsive). 3.2.13 gør hvert trin til en knap (role="button", tabindex 0):
// trinnene kan ikke vælges, så de er disabled (ingen falske knapper). Prototypens ol/li og "nuværende
// trin" (aria-current="step") ligger som ARIA på trinnene og elementet rundt om.
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csTimeline } from '@/domain/customer'
import { useCase } from '@/composables/useCaseVersion'

const all = useCase(() => csTimeline(CW.progress(), CW.request(), CW.draft(), CW.caseState() || {}))
const steps = computed(() => {
  const by = {}; all.value.forEach(s => { by[s.k] = s })
  const mat = by.materiale, afg = by.afgorelse
  const vurdState = mat.state !== 'done' ? 'upcoming' : afg.state === 'done' ? 'done' : 'active'
  return [
    { k: 'mat', label: t('Materiale'), state: mat.state, sub: mat.state === 'done' ? t('Afsluttet') : mat.state === 'active' ? mat.sub : '' },
    { k: 'vurd', label: t('EIFO vurderer sagen'), state: vurdState, sub: vurdState === 'active' ? t('I gang') : vurdState === 'done' ? t('Afsluttet') : '' },
    { k: 'afg', label: t('Afgørelse'), state: afg.state, sub: afg.state === 'done' ? afg.sub : '' },
  ]
})
const word = (s) => (s === 'done' ? t('afsluttet') : s === 'active' ? t('i gang') : t('kommer senere'))
const STEP_STATUS = { done: 'finish', active: 'process', upcoming: 'wait' }
const current = computed(() => steps.value.findIndex(s => s.state === 'active'))
</script>

<template>
  <a-card
    class="cwp-steps-card"
    role="region"
    aria-labelledby="cwp-steps-h"
  >
    <template #title>
      <span
        id="cwp-steps-h"
        role="heading"
        aria-level="2"
      >{{ t('Behandlingsstatus') }}</span>
    </template>
    <div role="list">
      <a-steps
        progress-dot
        :current="current"
      >
        <a-step
          v-for="s in steps"
          :key="s.k"
          role="listitem"
          :aria-current="s.state === 'active' ? 'step' : undefined"
          :status="STEP_STATUS[s.state]"
          :description="s.sub"
          disabled
        >
          <template #title>
            {{ s.label }}<span class="sr-only">{{ ': ' + word(s.state) }}</span>
          </template>
        </a-step>
      </a-steps>
    </div>
  </a-card>
</template>
