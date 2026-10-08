<script setup>
// Grå metalinje under et filnavn (documents.jsx: docMeta). Leddene adskilles af " · ", og tomme led
// udelades (som parts.filter(Boolean) før migrationen). Bruges af Dokumenter og kan bruges af
// memoets Copilot-side (memo_handoff.jsx: HandoffRow gav docMeta almindelige tekster).
//
// Props: parts (Array), fx docMetaParts(d) fra src/domain/documents.js. Et led er
//   'tekst'                          almindelig tekst
//   { text, title }                  teksten med title (uploadens dato; title = det fulde tidspunkt)
//   { prefix, text, danger: true }   prefix som almindelig tekst, text som fare (rød statustekst)
import { computed } from 'vue'

const props = defineProps({
  parts: { type: Array, required: true },
})

const list = computed(() => props.parts.filter(Boolean))
const isText = (p) => typeof p === 'string' || typeof p === 'number'
</script>

<template>
  <span>
    <template
      v-for="(p, i) in list"
      :key="i"
    >
      <template v-if="i">{{ ' · ' }}</template>
      <template v-if="isText(p)">{{ p }}</template>
      <span v-else-if="p.danger">{{ p.prefix }}<a-typography-text type="danger">{{ p.text }}</a-typography-text></span>
      <span
        v-else
        :title="p.title"
      >{{ p.text }}</span>
    </template>
  </span>
</template>
