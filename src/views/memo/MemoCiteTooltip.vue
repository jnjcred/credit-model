<script setup>
// Tooltip ved en kildehenvisning i memoet, mens musen står over den (memo.jsx: WSMemo L7123-7146):
// dokumentets navn, siden og "Tilføjet manuelt" eller "Afsnit redigeret af bruger". Kun med kildevisningen
// slået til (window.CW_SOURCE_VIEW === true).
// Henvisningen står i HTML, Vue ikke tegner, så a-tooltip forankres i et usynligt punkt, der flyttes hen
// over henvisningen (x, y: dens øverste midte), og justeres med forcePopupAlign, når punktet har flyttet sig.
//
// Props: tooltip ({ doc, page, x, y, manual, edited } fra useCiteDelegation, eller null).
import { nextTick, ref, watch } from 'vue'
import { EditOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { memoRefLabel } from '@/domain/memo/memoFormat'

const props = defineProps({
  tooltip: { type: Object, default: null },
})

const tip = ref(null)
watch(() => props.tooltip, (v) => {
  if (v) nextTick(() => { if (tip.value) tip.value.forcePopupAlign() })
})
</script>

<template>
  <a-tooltip
    ref="tip"
    :visible="!!tooltip"
    placement="top"
  >
    <template #title>
      <template v-if="tooltip">
        <div>
          <strong>{{ tooltip.doc }}</strong>
        </div>
        <div v-if="tooltip.page">
          {{ memoRefLabel(tooltip.page) }}
        </div>
        <div v-if="tooltip.manual || tooltip.edited">
          <EditOutlined aria-hidden="true" />
          {{ tooltip.manual ? t('Tilføjet manuelt') : t('Afsnit redigeret af bruger') }}
        </div>
      </template>
    </template>
    <span
      class="memo-cite-anchor"
      :style="tooltip ? { left: tooltip.x + 'px', top: tooltip.y + 'px' } : null"
      aria-hidden="true"
    />
  </a-tooltip>
</template>

<style scoped>
/* Usynligt punkt over henvisningen, som tooltippen peger på (1 px: antdv placerer ikke ved et element uden
   størrelse) */
.memo-cite-anchor {
  position: fixed;
  width: 1px;
  height: 1px;
  pointer-events: none;
}
</style>
