<script setup>
// Den flydende knap "Omskriv markeringen" over en markering i memoets tekst (memo.jsx: WSMemo L7054-7063).
// Står midt over markeringen (x, y: markeringens top) og åbner afsnittets AI-assistent med markeringen.
// Markeringen er HTML, Vue ikke tegner, så knappen står i et fast placeret omslag (ingen antdv-komponent
// kan forankres i den).
// Kendt fra prototypen (bevaret): knappen reagerer kun på mousedown (så markeringen ikke forsvinder ved
// klikket), ikke på Enter eller mellemrum.
//
// Props: x, y (skærmkoordinater). Emits: activate.
import AiIcon from '@/components/common/AiIcon.vue'
import { t } from '@/i18n'

defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
})
const emit = defineEmits(['activate'])
</script>

<template>
  <div
    class="memo-float"
    :style="{ left: x + 'px', top: (y - 10) + 'px' }"
  >
    <a-button
      type="primary"
      size="small"
      @mousedown.prevent="emit('activate')"
    >
      <template #icon>
        <AiIcon aria-hidden="true" />
      </template>
      {{ t('Omskriv markeringen') }}
    </a-button>
  </div>
</template>

<style scoped>
/* Fast over markeringen: knappens midte over markeringens midte, lige over den */
.memo-float {
  position: fixed;
  z-index: 1000;
  transform: translate(-50%, -100%);
}
</style>
