<script setup>
// Statusikonet ved et af kundens punkter (WSCheckDot og ikonvalget i OutstandingItem,
// workspace.jsx L1667–1676 og L2932–2938). Form og farve bærer betydningen:
//   approved  grøn cirkel med flueben: godkendt (også "Hentet automatisk" og "Ligger på sagen")
//   received  blå cirkel med flueben: modtaget, venter på din gennemgang
//   question  blåt udråbstegn: spørgsmål stillet til kunden (blåt med vilje: et spørgsmål, ikke en fejl)
//   pending   grå klokke: afventer kunden
//   quiet     grå cirkel med streg: ikke længere påkrævet
// approved og received læses op (label, eller title, hvis den er sat; title er også tooltip, som
// <title> i den gamle SVG). De tre andre er pynt (aria-hidden); teksten ved siden af siger det.
// Domænet giver { kind, label, title }: wsOutstandingItem(...).icon i src/domain/workspace/items.js.
//
// Props: kind (se ovenfor), label, title.
import { CheckCircleFilled, CheckCircleTwoTone, ClockCircleOutlined, ExclamationCircleFilled, MinusCircleOutlined } from '@ant-design/icons-vue'

defineProps({
  kind: {
    type: String,
    required: true,
    validator: (v) => ['approved', 'received', 'question', 'pending', 'quiet'].includes(v),
  },
  label: { type: String, default: '' },
  title: { type: String, default: undefined },
})

// Tofarve-ikonerne skal have farven som tal: antd's standardfarver (Less @success-color og
// @primary-color, som temaet ikke ændrer)
const SUCCESS = '#52c41a'
</script>

<style scoped>
/* Den fyldte blå cirkel får sin farve direkte, så den ikke afhænger af tofarve-ikonets farvetal */
.item-status-received {
  color: #1890ff;
}
</style>

<template>
  <CheckCircleTwoTone
    v-if="kind === 'approved'"
    :two-tone-color="SUCCESS"
    :aria-label="title || label"
    :title="title"
  />
  <!-- Modtaget: fyldt blå cirkel med flueben, samme ikon som hos kunden -->
  <CheckCircleFilled
    v-else-if="kind === 'received'"
    class="item-status-received"
    :aria-label="title || label"
    :title="title"
  />
  <!-- Spørgsmål: samme fyldte blå cirkel som "modtaget", med udråbstegn -->
  <ExclamationCircleFilled
    v-else-if="kind === 'question'"
    class="item-status-received"
    aria-hidden="true"
  />
  <a-typography-text
    v-else
    type="secondary"
  >
    <ClockCircleOutlined
      v-if="kind === 'pending'"
      aria-hidden="true"
    />
    <MinusCircleOutlined
      v-else
      aria-hidden="true"
    />
  </a-typography-text>
</template>
