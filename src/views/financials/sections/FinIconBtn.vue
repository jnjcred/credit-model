<script setup>
// Lille, altid synlig ikonknap (ret, kør igen, gendan, hent igen) med tooltip og aria-label
// (financials.jsx: FinIconBtn). aria-busy, mens det, knappen har startet, kører.
//
//   <FinIconBtn :label="t('Hent stamdata igen fra CVR')" :busy="fetching" :disabled="fetching" @click="refetch">
//     <template #icon><SyncOutlined aria-hidden="true" /></template>
//   </FinIconBtn>
//
// Props: label, disabled, busy. Slots: icon. Emits: click.
defineProps({
  label: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
})
defineEmits(['click'])
</script>

<template>
  <a-tooltip :title="label">
    <a-button
      type="text"
      size="small"
      :aria-label="label"
      :aria-busy="busy || undefined"
      :disabled="disabled"
      @click="$emit('click')"
    >
      <template #icon>
        <slot name="icon" />
      </template>
    </a-button>
  </a-tooltip>
</template>
