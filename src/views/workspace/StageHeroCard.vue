<script setup>
// Fasekortet øverst på Overblik (workspace.jsx: StageHero + WSHeroPrimary/WSHeroGhost,
// L1082–1280): hvor sagen står (titel og én sætning), præcis én primær knap og højst to
// sekundære, og under kortet sagens fem trin (resultat og dato på de færdige trin står i et
// tooltip, som før i title). "Gå direkte til memo" og "Giv afslag" åbner hver sin dialog; begge
// lukkes, når fasen skifter. Titler, knapper og trin regnes af wsStageHero i
// src/domain/workspace/header.js (følger både sagen og memoets gennemgang).
// Element-id'er, andre steder ruller og fokuserer til: ws-hero (afsnittet), ws-hero-title
// (overskriften), ws-hero-skip og ws-hero-decline (knapperne, fokus vender tilbage dertil).
//
// Props: stage (sagens fase), caseId. React-proppen go er erstattet af useNavigation.
// Emits: ingen.
import { computed, ref, watch } from 'vue'
import { ArrowRightOutlined, MinusCircleOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { go } from '@/composables/useNavigation'
import { wsStageHero } from '@/domain/workspace/header'
import { useCaseAndMemo } from './composables/useMemoStatus'
import DeclineCaseModal from './DeclineCaseModal.vue'
import SkipToMemoModal from './SkipToMemoModal.vue'

const props = defineProps({
  stage: { type: String, required: true },
  caseId: { type: Number, required: true },
})

// "Gå direkte til memo" og "Giv afslag" er dialoger; de lukkes, når fasen skifter
const skipping = ref(false)
const declining = ref(false)
watch(() => props.stage, () => {
  skipping.value = false
  declining.value = false
})

const hero = useCaseAndMemo(() => wsStageHero(props.stage, go, props.caseId, {
  setSkipping: (v) => { skipping.value = v },
  setDeclining: (v) => { declining.value = v },
}))
const ghosts = computed(() => [hero.value.ghost, hero.value.ghost2].filter(Boolean))

// Trinenes tilstand som a-steps-status. Sprunget over vises som "venter" med sit eget ikon.
const STEP_STATUS = { done: 'finish', active: 'process', pending: 'wait', declined: 'error', skipped: 'wait' }
const isCurrent = (s) => s.status === 'active' || s.status === 'declined'
const current = computed(() => {
  const i = hero.value.PROCESS.findIndex(isCurrent)
  return i < 0 ? hero.value.PROCESS.length : i
})
</script>

<template>
  <section
    id="ws-hero"
    class="ws-anchor"
    aria-labelledby="ws-hero-title"
  >
    <a-card :bordered="false">
      <template #title>
        <span
          id="ws-hero-title"
          class="ws-hero-title"
          role="heading"
          aria-level="2"
          tabindex="-1"
        >{{ hero.title }}</span>
      </template>
      <a-typography-paragraph
        v-if="hero.body"
        type="secondary"
      >
        {{ hero.body }}
      </a-typography-paragraph>
      <a-space
        wrap
        :size="8"
      >
        <a-button
          type="primary"
          @click="hero.primary.onClick"
        >
          {{ hero.primary.label }}
          <ArrowRightOutlined
            v-if="hero.primary.arrow"
            aria-hidden="true"
          />
        </a-button>
        <a-button
          v-for="g in ghosts"
          :id="g.id"
          :key="g.label"
          @click="g.onClick"
        >
          {{ g.label }}
        </a-button>
      </a-space>
      <a-divider />
      <!-- Sagens trin. a-steps sender ikke attributter videre til sin rod, så listen er elementet
           rundt om. Trinnene kan ikke vælges: disabled, så 3.2.13 ikke gør dem til knapper. -->
      <div
        role="list"
        :aria-label="t('Sagens trin')"
      >
        <a-steps
          :current="current"
          size="small"
          label-placement="vertical"
        >
          <a-step
            v-for="s in hero.PROCESS"
            :key="s.k"
            :status="STEP_STATUS[s.status]"
            role="listitem"
            :aria-current="isCurrent(s) ? 'step' : undefined"
            disabled
          >
            <template #title>
              <a-tooltip :title="s.sub || undefined">
                <span>{{ s.label }}</span>
              </a-tooltip>
              <span
                v-if="s.sub"
                class="sr-only"
              >, {{ s.sub }}</span>
            </template>
            <template
              v-if="s.status === 'skipped'"
              #icon
            >
              <MinusCircleOutlined aria-hidden="true" />
            </template>
          </a-step>
        </a-steps>
      </div>
    </a-card>
    <DeclineCaseModal
      v-if="declining"
      return-focus="#ws-hero-decline"
      @close="declining = false"
    />
    <SkipToMemoModal
      v-if="skipping"
      :case-id="caseId"
      @close="skipping = false"
    />
  </section>
</template>

<style scoped>
/* Afsnittet rulles til (efter en afsendelse, fra sagshovedet): lidt luft over kortet */
.ws-anchor {
  scroll-margin-top: 16px;
}

/* Fasens titel brydes på flere linjer i stedet for at blive afkortet (smal skærm, 200 % zoom) */
.ws-hero-title {
  white-space: normal;
}
</style>
