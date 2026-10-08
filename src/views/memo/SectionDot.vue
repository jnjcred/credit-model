<script setup>
// Statusprikken ved et afsnit i afsnitslisten (memo.jsx: SectionDot, L2743-2748). Form og tegn bærer
// betydningen, ikke farven alene, og kun det, der skal handles på, har farve:
//   done    gennemgået: udfyldt cirkel med flueben (grå)
//   blanks  gennemgået, men med tomme felter: udråbstegn (advarselsfarve)
//   draft   udkast, ikke gennemgået: ur (grå)
//   empty   ikke skrevet: cirkel med streg (grå)
// Pynt (aria-hidden): afsnitslisten skriver status som tekst ved siden af (memoStatusText).
//
// Props: st (memoSectionStatus(k) fra src/domain/memo/memoStatus.js, eller null = tomt afsnit).
import { computed } from 'vue'
import { CheckCircleFilled, ClockCircleOutlined, ExclamationCircleOutlined, MinusCircleOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  st: { type: Object, default: null },
})

const state = computed(() => (props.st ? props.st.state : 'empty'))
const ICONS = { done: CheckCircleFilled, blanks: ExclamationCircleOutlined, draft: ClockCircleOutlined, empty: MinusCircleOutlined }
</script>

<template>
  <a-typography-text
    :type="state === 'blanks' ? 'warning' : 'secondary'"
    aria-hidden="true"
  >
    <component :is="ICONS[state] || ICONS.empty" />
  </a-typography-text>
</template>
