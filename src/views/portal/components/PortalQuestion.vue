<script setup>
// Rådgiverens spørgsmål til punktet (new_case_portal.jsx: PortalQuestion, L1942–1991). Kunden kan svare
// med tekst alene; en ny fil er kun nødvendig, når spørgsmålet beder om den. Punktets side styrer feltet
// (v-model:value) og sender svaret med sin egen knap (én primærknap). Med ownButton (landefordelingen,
// der har sin egen "Færdig") har boksen sin egen "Send svar" (Ctrl/Cmd+Enter sender).
//
// Props: item (punktet), value (svaret), ownButton.
// Emits: update:value, answered (svaret er sendt).
// "Send svar" bærer data-cust-act="send" og data-pv-allow (rådgiveren kan svare på kundens vegne).
// Ikke porteret: boksens egen tilstand uden value (død: siderne styrer altid feltet).
import { computed } from 'vue'
import { SendOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csClearDraft } from '@/domain/customer'
import { ncFill } from '@/domain/new_case_portal'
import { useCase } from '@/composables/useCaseVersion'
import PortalAskMark from './PortalAskMark.vue'

const props = defineProps({
  item: { type: Object, required: true },
  value: { type: String, default: '' },
  ownButton: { type: Boolean, default: false },
})
const emit = defineEmits(['update:value', 'answered'])

const s = useCase(() => CW.itemState(props.item.id))
const adv = 'EIFO'   // kunden skriver til og hører fra EIFO; rådgiverens navn står kun på kontaktkortet
const v = computed(() => props.value || '')
const FULL = { span: 24 }

function send () {
  const by = CW.isPreview() ? 'rådgiver' : 'kunde'
  if (!v.value.trim() || !CW.answerItem(props.item.id, v.value, { by })) return
  csClearDraft(props.item.id)
  CW.toast(by === 'rådgiver' ? t('Svaret er gemt på kundens vegne') : ncFill(t('Svaret er sendt til {name}'), { name: adv }))
  emit('answered')
}
function onKeydown (e) {
  if (!props.ownButton) return
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send() }
}
</script>

<template>
  <a-card
    size="small"
    class="cwp-question"
    role="region"
    aria-labelledby="cwp-q-h"
  >
    <template #title>
      <span class="portal-q-head">
        <PortalAskMark />
        <span
          id="cwp-q-h"
          role="heading"
          aria-level="2"
        >{{ ncFill(s && s.reviewNote ? t('{adv} spørger') : t('{adv} beder om en ny version'), { adv }) }}</span>
      </span>
    </template>
    <a-typography-paragraph
      v-if="s && s.reviewNote"
      class="portal-q-note"
    >
      {{ s.reviewNote }}
    </a-typography-paragraph>
    <a-form-item
      :label="ncFill(t('Svar til {adv}'), { adv })"
      html-for="cwp-answer"
      :label-col="FULL"
      :colon="false"
    >
      <a-textarea
        id="cwp-answer"
        :value="v"
        :rows="3"
        :placeholder="t('Skriv jeres svar her')"
        aria-describedby="cwp-answer-hint"
        @update:value="(x) => emit('update:value', x)"
        @keydown="onKeydown"
      />
      <template #extra>
        <span id="cwp-answer-hint">{{ ownButton ? t('I kan svare her eller rette skemaet nedenfor.') : ncFill(t('Svaret kan stå alene. Beder {adv} om en ny fil, kan I uploade den nedenfor.'), { adv }) }}</span>
      </template>
    </a-form-item>
    <div
      v-if="ownButton"
      class="portal-q-foot"
    >
      <a-button
        :type="v.trim() ? 'primary' : 'default'"
        data-cust-act="send"
        data-pv-allow="1"
        :disabled="!v.trim()"
        @click="send"
      >
        <template #icon>
          <SendOutlined aria-hidden="true" />
        </template>
        {{ t('Send') }}
      </a-button>
    </div>
  </a-card>
</template>

<style scoped>
.cwp-question {
  margin-bottom: 16px;
}

.portal-q-head {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

/* Spørgsmålet står, som rådgiveren skrev det (linjeskift bevares) */
.portal-q-note {
  white-space: pre-wrap;
}

.portal-q-foot {
  display: flex;
  justify-content: flex-end;
}
</style>
