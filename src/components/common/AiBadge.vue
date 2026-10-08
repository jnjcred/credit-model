<script setup>
// Mærke på alt, AI har skrevet: ikon og tekst. Er rådgiveren gået ind i teksten, står der også
// det (edited). compact = kun ikonet (med forklaringen som tooltip), til små rækker.
// Bruges mange steder, fordi det skal være lige så tydeligt overalt, hvad AI har skrevet.
import { computed } from 'vue'
import { RobotOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'

const props = defineProps({
  edited: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  title: { type: String, default: '' },
})

const label = computed(() => (props.edited ? t('AI-genereret + rådgiverens rettelser') : t('AI-genereret')))
</script>

<template>
  <a-tooltip :title="title || label">
    <a-tag
      role="note"
      :aria-label="label"
    >
      <template #icon>
        <RobotOutlined aria-hidden="true" />
      </template>
      <span v-if="!compact">{{ label }}</span>
    </a-tag>
  </a-tooltip>
</template>
