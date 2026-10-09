<script setup>
// Mærke på alt, AI har skrevet: ikon og tekst. Er rådgiveren gået ind i teksten, står der også
// det (edited). compact = kun ikonet (med forklaringen som tooltip), til små rækker.
// plain = kun det nøgne ikon uden boks (til fx et kolonnebånd); forklaringen står som tooltip.
// Bruges mange steder, fordi det skal være lige så tydeligt overalt, hvad AI har skrevet.
import { computed } from 'vue'
import AiIcon from './AiIcon.vue'
import { t } from '@/i18n'

const props = defineProps({
  edited: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  plain: { type: Boolean, default: false },
  title: { type: String, default: '' },
})

const label = computed(() => (props.edited ? t('AI-genereret + rådgiverens rettelser') : t('AI-genereret')))
</script>

<template>
  <a-tooltip :title="title || label">
    <span
      v-if="plain"
      class="ai-badge-plain"
      role="img"
      :aria-label="label"
    >
      <AiIcon aria-hidden="true" />
    </span>
    <a-tag
      v-else
      role="note"
      :aria-label="label"
    >
      <template #icon>
        <AiIcon aria-hidden="true" />
      </template>
      <span v-if="!compact">{{ label }}</span>
    </a-tag>
  </a-tooltip>
</template>

<style scoped>
/* Det nøgne ikon: ingen boks, et lille mellemrum til teksten efter det */
.ai-badge-plain {
  display: inline-flex;
  margin-right: 6px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
