<script setup>
// Punktets side, øverst (new_case_portal.jsx: PortalItemHead, L1993–2023): titlen (h1), beskrivelsen og
// "Hvorfor". Et spørgsmål fra rådgiveren står i en boks med svarfeltet (PortalQuestion). Er punktet hos
// en hjælper efter et spørgsmål, står rådgiverens note. Har kunden sendt en bemærkning, står den med
// "Fortryd bemærkning".
//
// Props: item (punktet), answer (svaret i spørgsmålsboksen), ownButton (boksen har sin egen knap).
// Emits: update:answer, answered (svaret er sendt fra boksens egen knap).
// "Fortryd bemærkning" bærer data-cust-act="undo": forhåndsvisningens spærre stopper klikket.
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csCanUndo, csConfirmUndo } from '@/domain/customer'
import { PORTAL_CONTACT, ncFill } from '@/domain/new_case_portal'
import { useCase } from '@/composables/useCaseVersion'
import PortalQuestion from './PortalQuestion.vue'

const props = defineProps({
  item: { type: Object, required: true },
  answer: { type: String, default: '' },
  ownButton: { type: Boolean, default: false },
})
const emit = defineEmits(['update:answer', 'answered'])

const s = useCase(() => CW.itemState(props.item.id))
const adv = PORTAL_CONTACT.first
const asked = computed(() => !!s.value && s.value.status === 'rejected')
const note = computed(() => (s.value && s.value.status === 'delegated' && s.value.reviewNote ? s.value.reviewNote : ''))
const noted = computed(() => !!s.value && s.value.status === 'noted')
</script>

<template>
  <a-typography-title>{{ t(item.label) }}</a-typography-title>
  <a-typography-paragraph class="portal-ih-desc">
    {{ t(item.desc) }}
  </a-typography-paragraph>
  <a-typography-paragraph type="secondary">
    {{ t('Hvorfor') }}: {{ t(item.why) }}
  </a-typography-paragraph>
  <PortalQuestion
    v-if="asked"
    :item="item"
    :value="answer"
    :own-button="ownButton"
    @update:value="(v) => emit('update:answer', v)"
    @answered="emit('answered')"
  />
  <a-typography-paragraph
    v-if="note"
    role="status"
  >
    {{ ncFill(t('{adv} skriver:'), { adv }) }} <a-typography-text type="secondary">
      {{ note }}
    </a-typography-text>
  </a-typography-paragraph>
  <div
    v-if="noted"
    class="portal-ih-noted"
  >
    <div class="portal-ih-noted-text">
      <div v-if="s.note">
        {{ ncFill(t('I har skrevet til {adv}'), { adv }) }}: <a-typography-text type="secondary">
          "{{ s.note }}"
        </a-typography-text>
      </div>
      <div v-if="s.answer">
        {{ ncFill(t('I har svaret {adv}'), { adv }) }}: <a-typography-text type="secondary">
          "{{ s.answer }}"
        </a-typography-text>
      </div>
      <a-typography-text type="secondary">
        {{ t('Har I alligevel en fil, kan I sende den nedenfor.') }}
      </a-typography-text>
    </div>
    <a-button
      v-if="csCanUndo(s)"
      type="text"
      data-cust-act="undo"
      @click="csConfirmUndo(item.id)"
    >
      {{ t('Fortryd bemærkning') }}
    </a-button>
  </div>
</template>

<style scoped>
.portal-ih-desc {
  margin-bottom: 4px;
}

.portal-ih-noted {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 16px;
}

.portal-ih-noted-text {
  flex: 1 1 220px;
}
</style>
