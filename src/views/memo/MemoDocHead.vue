<script setup>
// Toppen af memoets dokumentkort (memo.jsx: WSMemo L6719-6774): titlen, fremdriften ("x af 14 afsnit
// gennemgået") og forklaringen på gennemgangen, én gang for hele memoet, og knapperne:
//  - AI-udbyderen (eller "Forbind AI"): åbner forbindelsesdialogen (ikke i en indstillet version)
//  - "Generér memo": kun når AI er forbundet og memoet kan redigeres; slået fra, mens der skrives
//  - "Vis ophav" / "Skjul ophav" (aria-pressed)
//  - "Eksportér til Word" (#memo-export-btn; fokus vender tilbage hertil, når dialogen lukker)
// Ingen primærknap her: sagshovedets næste skridt er sidens eneste primærknap. Titel og knapper står på
// hver sin linje, når der ikke er plads til begge.
//
// Props: readOnly, version (den indstillede versions nummer, når memoet er låst), reviewedCount, total,
//        aiStatus (useAiStatus(): { ready, provider, model }), generating (der skrives), showOrigin.
// Emits: connect-ai, generate, toggle-origin, export.
import { computed } from 'vue'
import { t } from '@/i18n'

const props = defineProps({
  readOnly: { type: Boolean, default: false },
  version: { type: Number, default: null },
  reviewedCount: { type: Number, required: true },
  total: { type: Number, required: true },
  aiStatus: { type: Object, required: true },
  generating: { type: Boolean, default: false },
  showOrigin: { type: Boolean, default: false },
})
const emit = defineEmits(['connect-ai', 'generate', 'toggle-origin', 'export'])

const title = computed(() => (props.readOnly ? t('Credit memo - indstillet version') + ' ' + props.version : t('Credit memo - udkast')))
// Fremdriften og forklaringen på gennemgangen står her, én gang for hele memoet
const sub = computed(() => props.reviewedCount + ' ' + t('af') + ' ' + props.total + ' ' + t('afsnit gennemgået') + '. ' +
  (props.readOnly ? t('Skrivebeskyttet') + '.' : t('Læs hvert afsnit, ret det nødvendige, og markér det som gennemgået.')))
const aiTitle = computed(() => (props.aiStatus.ready
  ? t('Forbundet til') + ' ' + props.aiStatus.provider.label + ' (' + props.aiStatus.model + '). ' + t('Klik for at skifte.')
  : t('Forbind din egen Claude-, ChatGPT- eller Copilot-konto')))
</script>

<template>
  <div class="memo-doc-head">
    <a-row
      justify="space-between"
      align="middle"
      :gutter="[12, 10]"
    >
      <a-col flex="1 1 320px">
        <div>
          <a-typography-text strong>
            {{ title }}
          </a-typography-text>
        </div>
        <a-typography-text type="secondary">
          {{ sub }}
        </a-typography-text>
      </a-col>
      <a-col>
        <a-space
          wrap
          :size="6"
        >
          <a-button
            v-if="!readOnly"
            size="small"
            :title="aiTitle"
            @click="emit('connect-ai')"
          >
            {{ aiStatus.ready ? aiStatus.provider.label : t('Forbind AI') }}
          </a-button>
          <a-button
            v-if="!readOnly && aiStatus.ready"
            size="small"
            :disabled="generating"
            :title="t('Lad AI skrive memoet ud fra dokumenterne, periodetallene og årsregnskaberne')"
            @click="emit('generate')"
          >
            {{ t('Generér memo') }}
          </a-button>
          <a-button
            size="small"
            :aria-pressed="String(showOrigin)"
            :title="t('Vis hvad der er udkast fra skabelonen eller AI, hvad du har gennemgået, og hvad du selv har skrevet')"
            @click="emit('toggle-origin')"
          >
            {{ showOrigin ? t('Skjul ophav') : t('Vis ophav') }}
          </a-button>
          <a-button
            id="memo-export-btn"
            size="small"
            aria-haspopup="dialog"
            :title="t('Det der står på skærmen, med udkastmærker')"
            @click="emit('export')"
          >
            {{ t('Eksportér til Word') }}
          </a-button>
        </a-space>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Toppen af dokumentkortet, adskilt fra værktøjslinjen og teksten */
.memo-doc-head {
  padding: 12px 16px;
  border-bottom: 1px solid @border-color-split;
}
</style>
