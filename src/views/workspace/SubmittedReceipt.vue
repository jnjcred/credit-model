<script setup>
// Kvitteringen efter indstillingen (WSIndstil i workspace.jsx L3427–3478): titel, én sætning og
// det, der kun står her (begrundelser, betingelser, kommentarer og note). Version, dato og
// sagsnummer står i sagshovedet, og den indstillede version åbnes derfra. Teksterne regnes af
// wsIndstilReceipt (src/domain/workspace/readiness.js).
//
// Props: ingen. Emits: ingen ("Træk indstilling tilbage" spørger selv om en årsag: wsWithdraw).
// Overskriften (#ws-indstil-title) får fokus fra SubmitToCommittee.
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { wsIndstilReceipt } from '@/domain/workspace/readiness'
import { wsWithdraw } from '@/domain/workspace/actions'

const caseVersion = useCaseVersion()
const cs = computed(() => {
  caseVersion.value
  return CW.caseState()
})
const rc = computed(() => wsIndstilReceipt(cs.value))
</script>

<template>
  <div class="ws-receipt">
    <div>
      <a-typography-title
        id="ws-indstil-title"
        :level="2"
        tabindex="-1"
      >
        {{ t('Sagen er indstillet') }}
      </a-typography-title>
      <a-tooltip :title="CW.fmtWhen(cs.submittedAt)">
        <a-typography-paragraph type="secondary">
          {{ rc.lead + rc.notSavedText }}
        </a-typography-paragraph>
      </a-tooltip>
    </div>

    <a-descriptions
      v-if="rc.rows.length > 0"
      bordered
      size="small"
      :column="1"
    >
      <a-descriptions-item
        v-for="r in rc.rows"
        :key="r.key"
        :label="r.label"
      >
        <ul
          v-if="r.key === 'reasons'"
          class="ws-receipt-list"
        >
          <li
            v-for="(a, i) in r.items"
            :key="i"
          >
            {{ a.text }}<br>
            <a-typography-text type="secondary">
              {{ t('Begrundelse') + ': ' + a.reason }}
            </a-typography-text>
          </li>
        </ul>
        <ul
          v-else-if="r.key === 'open' || r.key === 'conds'"
          class="ws-receipt-list"
        >
          <li
            v-for="(a, i) in r.items"
            :key="i"
          >
            {{ a }}
          </li>
        </ul>
        <ul
          v-else-if="r.key === 'comments' || r.key === 'released'"
          class="ws-receipt-list"
        >
          <li
            v-for="(c, i) in r.items"
            :key="i"
          >
            {{ (c.sectionName ? c.sectionName + ': ' : '') + c.text }}<br>
            <a-typography-text type="secondary">
              {{ r.key === 'comments' ? rc.commentBy(c) : rc.releasedBy(c) }}
            </a-typography-text>
          </li>
        </ul>
        <template v-else>
          {{ r.value }}
        </template>
      </a-descriptions-item>
    </a-descriptions>

    <div>
      <a-button @click="wsWithdraw">
        {{ t('Træk indstilling tilbage') }}
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.ws-receipt {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 780px;
  margin: 0 auto;
  padding: 40px 32px 80px;
}

.ws-receipt-list {
  margin: 0;
  padding-left: 16px;
}

.ws-receipt-list > li + li {
  margin-top: 4px;
}

/* Overskriften får fokus, når siden åbnes (ingen ramme om en overskrift) */
[tabindex="-1"]:focus {
  outline: none;
}

@media (max-width: 999px) {
  .ws-receipt {
    padding: 24px 16px 64px;
  }
}
</style>
