<script setup>
// Kildelinket (WSSourceLink i workspace.jsx L1362–1373): en lille knap med kildedokumentets navn og
// henvisning ("Årsrapport 2024 · s. 3"), der åbner dokumentet under Dokumenter. Vises kun, når
// kildevisningen er slået til (window.CW_SOURCE_VIEW, sat i src/domain/case_facts.js; fra som
// standard) og kilden har et dokument.
//
// Props:
//   source  { doc, ref } fra faktaarket eller klarhedstjekket
//   caseId  sagen, hvis Dokumenter-fane åbnes
//   back    { route, anchor?, label }: Dokumenter får en knap tilbage hertil (fx Indstilling)
// Emits: ingen (navigationen går gennem useNavigation).
import { computed } from 'vue'
import { FileTextOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { go } from '@/composables/useNavigation'
import { wsFill } from '@/domain/workspace/format'
import { wsSourceLink } from '@/domain/workspace/caseData'
import { wsOpenDoc } from '@/domain/workspace/actions'

const props = defineProps({
  source: { type: Object, default: null },
  caseId: { type: Number, required: true },
  back: { type: Object, default: null },
})

const link = computed(() => wsSourceLink(props.source))

function open () {
  wsOpenDoc(props.source, go, props.caseId, props.back)
}
</script>

<template>
  <a-button
    v-if="link"
    class="ws-source-link"
    size="small"
    shape="round"
    :aria-label="wsFill(t('Åbn kilden {doc}'), { doc: link.label })"
    @click="open"
  >
    <template #icon>
      <FileTextOutlined aria-hidden="true" />
    </template>
    {{ link.label }}
  </a-button>
</template>

<style scoped>
/* Et langt dokumentnavn afkortes med … i stedet for at sprænge linjen */
.ws-source-link {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}
</style>
