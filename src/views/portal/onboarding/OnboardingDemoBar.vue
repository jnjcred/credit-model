<script setup>
// Stiplede demoknapper under trinnet Bruger (portal_onboarding.jsx: PortalObDemo): før login, ny
// bruger, kendt bruger uden og med virksomheden. I portalen gemmes stadiet; i Kundeflow vises det kun.
//
// Props: current (det stadie, der vises: 'pre' | 'new' | 'known' | 'knownCo'), preview (Kundeflow:
//        "Demo: vis trinnet som" i stedet for "Demo: spring til").
// Emits: pick(k) (også for det stadie, der allerede vises: trinnet tegnes forfra).
// Knapperne er skifteknapper (aria-pressed), ikke en radiogruppe. Stiplet = demo; den viste er en blå
// kantknap (primary + ghost), som det valgte sprog i sprogvælgeren (LanguageSwitcher.vue).
// Ingen fast størrelse: knapperne følger portalens a-config-provider (store på telefoner).
import { t } from '@/i18n'
import { OB_DEMO_STAGES, obDemoLabel } from '@/domain/onboarding'

defineProps({
  current: { type: String, default: null },
  preview: { type: Boolean, default: false },
})
const emit = defineEmits(['pick'])
</script>

<template>
  <div
    class="ob-demo"
    role="group"
    :aria-label="t('Demo: stadier i trinnet Bruger')"
  >
    <a-space wrap>
      <a-typography-text type="secondary">
        {{ preview ? t('Demo: vis trinnet som') : t('Demo: spring til') }}
      </a-typography-text>
      <a-button
        v-for="k in OB_DEMO_STAGES"
        :key="k"
        shape="round"
        :type="current === k ? 'primary' : 'dashed'"
        :ghost="current === k"
        :aria-pressed="current === k"
        @click="emit('pick', k)"
      >
        {{ obDemoLabel(k) }}
      </a-button>
    </a-space>
  </div>
</template>

<style scoped>
.ob-demo {
  margin-top: 16px;
}
</style>
