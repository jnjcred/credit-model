<script setup>
// Afsnitslisten til venstre i memoet (memo.jsx: WSMemo L6683-6713): de 14 afsnit med statusprik, nummer,
// titel og antal åbne kommentarer. Et klik ruller til afsnittet; det aktive afsnit (det, man læser) har
// aria-current og vises med linkfarve og en streg i venstre side (som før; ikke kun farve). Status står også som tekst (tooltip og skjult tekst til skærmlæsere), så den ikke kun
// bæres af prikkens form.
//
// Props: sections (MEMO_SECTIONS), statuses ({ nøgle: memoSectionStatus }), commentCounts ({ nøgle: antal
//        åbne kommentarer }), active (det aktive afsnits nøgle).
// Emits: select(nøgle).
import { t } from '@/i18n'
import { memoStatusText } from '@/domain/memo/memoStatus'
import SectionDot from './SectionDot.vue'

defineProps({
  sections: { type: Array, required: true },
  statuses: { type: Object, required: true },
  commentCounts: { type: Object, required: true },
  active: { type: String, default: null },
})
const emit = defineEmits(['select'])

const countText = (n) => n + ' ' + (n === 1 ? t('kommentar') : t('kommentarer'))
</script>

<template>
  <div class="memo-nav-list">
    <a-button
      v-for="s in sections"
      :key="s.k"
      :type="active === s.k ? 'link' : 'text'"
      block
      class="memo-nav-item"
      :aria-current="active === s.k ? 'true' : undefined"
      :title="memoStatusText(statuses[s.k])"
      @click="emit('select', s.k)"
    >
      <SectionDot :st="statuses[s.k]" />
      <a-typography-text
        type="secondary"
        class="memo-nav-num"
      >
        {{ s.num }}
      </a-typography-text>
      <span class="memo-nav-label">{{ t(s.label) }}<span class="sr-only memo-sr">. {{ memoStatusText(statuses[s.k]) }}</span></span>
      <a-typography-text
        v-if="commentCounts[s.k] > 0"
        type="secondary"
        :title="countText(commentCounts[s.k])"
      >
        {{ commentCounts[s.k] }}<span class="sr-only memo-sr"> {{ commentCounts[s.k] === 1 ? t('kommentar') : t('kommentarer') }}</span>
      </a-typography-text>
    </a-button>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Ét afsnit pr. linje; lange titler brydes over flere linjer i stedet for at blive skåret af */
.memo-nav-item {
  display: flex;
  gap: 8px;
  align-items: center;
  height: auto;
  padding: 6px 16px;
  white-space: normal;
  text-align: left;
}

/* Det aktive afsnit: en streg i venstre side, som i prototypen (box-shadow, så teksten ikke flytter sig) */
.memo-nav-item[aria-current='true'] {
  box-shadow: inset 2px 0 0 @primary-color;
}

.memo-nav-num {
  flex-shrink: 0;
  width: 18px;
}

.memo-nav-label {
  flex: 1;
}
</style>
