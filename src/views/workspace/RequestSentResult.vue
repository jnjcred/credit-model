<script setup>
// Kvitteringen i "Anmod om materiale" (WSMaterialModal i workspace.jsx L1991–2008): anmodningen er
// sendt (eller oprettet uden mail), hvor mange punkter og svarfristen. Er en ny anmodning oprettet
// uden mail, står kundens link her, så rådgiveren selv kan give kunden det.
//
// Props:
//   title     "Anmodning sendt til {name}" m.fl. (wsMaterialHeading(...).sentTitle)
//   text      "{n} punkter · svarfrist {date}. …" (wsMaterialHeading(...).sentText)
//   showLink  vis linket med "Kopiér link" (ny anmodning uden mail)
//   link      kundens link (wsMaterialModel(...).reqLink)
// Emits: copy-link (Kopiér link), close (Tilbage til sagen)
import { t } from '@/i18n'

defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  showLink: { type: Boolean, default: false },
  link: { type: String, default: '' },
})
defineEmits(['copy-link', 'close'])
</script>

<template>
  <a-result
    status="success"
    :title="title"
    :sub-title="text"
  >
    <template #extra>
      <a-space
        direction="vertical"
        align="center"
      >
        <a-alert
          v-if="showLink"
          type="info"
        >
          <template #message>
            {{ t('Giv selv kunden linket:') }}
            <a-typography-text strong>
              {{ link }}
            </a-typography-text>
            <a-button
              type="text"
              size="small"
              @click="$emit('copy-link')"
            >
              {{ t('Kopiér link') }}
            </a-button>
          </template>
        </a-alert>
        <a-button @click="$emit('close')">
          {{ t('Tilbage til sagen') }}
        </a-button>
      </a-space>
    </template>
  </a-result>
</template>
