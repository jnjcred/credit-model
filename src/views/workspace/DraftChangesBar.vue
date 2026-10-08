<script setup>
// Én stille linje i Anmodet materiale, når kladden afviger fra det, kunden har fået
// (workspace.jsx: WSDraftBar, L1694–1711): "2 anmodninger er ikke sendt til kunden: …" og
// "Åbn anmodningen". Send og kassér sker i anmodningen. Intet vises uden ændringer eller efter
// indstillingen (wsDraftBar i src/domain/workspace/request.js). role="status" som før.
//
// Props: ingen (React-proppen caseData blev ikke brugt). Emits: ingen.
import { computed } from 'vue'
import { t } from '@/i18n'
import { wsDraftBar } from '@/domain/workspace/request'
import { useCaseVersion } from '@/composables/useCaseVersion'

const caseVersion = useCaseVersion()
const bar = computed(() => {
  caseVersion.value
  return wsDraftBar()
})
</script>

<template>
  <a-row
    v-if="bar"
    role="status"
    class="ws-draftbar"
    justify="space-between"
    align="middle"
    :gutter="[8, 4]"
  >
    <a-col flex="1 1 220px">
      <a-typography-text type="secondary">
        {{ bar.lead }}
      </a-typography-text>
      {{ ' ' }}
      <a-typography-text>{{ bar.names }}</a-typography-text>
    </a-col>
    <a-col flex="none">
      <a-button
        type="link"
        size="small"
        @click="bar.open"
      >
        {{ t('Åbn anmodningen') }}
      </a-button>
    </a-col>
  </a-row>
</template>

<style scoped>
/* Luft under linjen, før grupperne (som før) */
.ws-draftbar {
  margin-bottom: 12px;
}
</style>
