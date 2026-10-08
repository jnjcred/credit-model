<script setup>
// Kolonneoverskrift med forklaring (hover og tastatur), som TaskTip i portfolio.jsx: bruges ved "Ventetid".
// Props: label (overskriften), text (forklaringen). Esc skjuler forklaringen, som før; det kan
// ant-design-vue's tooltip ikke selv. Egen komponent, fordi tilstanden ikke kan ligge i tabellens
// headerCell-slot (antdv kalder slotten uden for sin egen tegning).
import { ref } from 'vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'

defineProps({
  label: { type: String, required: true },
  text: { type: String, required: true },
})

const open = ref(false)
</script>

<template>
  {{ label }}
  <a-tooltip
    v-model:visible="open"
    :title="text"
    :trigger="['hover', 'focus']"
  >
    <a-button
      type="text"
      size="small"
      :aria-label="label + ': ' + text"
      @keydown.esc="open = false"
    >
      <template #icon>
        <InfoCircleOutlined aria-hidden="true" />
      </template>
    </a-button>
  </a-tooltip>
</template>
