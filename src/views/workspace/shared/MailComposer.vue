<script setup>
// Mailen før den sendes: emne og tekst, som rådgiveren kan rette, og "Gendan standardtekst".
// Bruges af Anmod om materiale (mailen), Påmind kunden og Stil spørgsmål til materialet
// (workspace.jsx L2190–2205, L2554–2566 og L2639–2655). Den bygger sin egen a-form, så den må
// ikke ligge inde i en anden a-form.
//
// Props:
//   subject, body   teksterne, der vises (standardteksten eller rådgiverens rettelser)
//   isDefault       teksterne er standardteksten: knappen "Gendan standardtekst" står ikke
//   rows            tekstfeltets højde i linjer (anmodning 16, påmindelse 14, spørgsmål 12)
//   subjectId       id på emnefeltet (fx 'ws-req-subject', 'ws-remind-subject', 'ws-reject-subject')
//   note            grå linje under mailen (fx "Mailen sendes præcis som vist."); tom: ingen
// Emits: update:subject, update:body (rådgiveren retter; v-model:subject / v-model:body),
//        reset (Gendan standardtekst).
import { t } from '@/i18n'

defineProps({
  subject: { type: String, default: '' },
  body: { type: String, default: '' },
  isDefault: { type: Boolean, default: true },
  rows: { type: Number, default: 12 },
  subjectId: { type: String, default: undefined },
  note: { type: String, default: '' },
})
defineEmits(['update:subject', 'update:body', 'reset'])
</script>

<template>
  <div class="ws-mail">
    <a-form layout="vertical">
      <a-form-item
        :label="t('Emne')"
        :html-for="subjectId"
      >
        <a-input
          :id="subjectId"
          :value="subject"
          @update:value="(v) => $emit('update:subject', v)"
        />
      </a-form-item>
      <a-form-item>
        <a-textarea
          :value="body"
          :rows="rows"
          :aria-label="t('Mailens tekst')"
          @update:value="(v) => $emit('update:body', v)"
        />
      </a-form-item>
    </a-form>
    <div
      v-if="note || !isDefault"
      class="ws-mail-foot"
    >
      <a-typography-text type="secondary">
        {{ note }}
      </a-typography-text>
      <a-button
        v-if="!isDefault"
        type="link"
        size="small"
        @click="$emit('reset')"
      >
        {{ t('Gendan standardtekst') }}
      </a-button>
    </div>
  </div>
</template>

<style scoped>
/* Noten til venstre og "Gendan standardtekst" til højre, som før */
.ws-mail-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
