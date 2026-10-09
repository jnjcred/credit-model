<script setup>
// Viseren: en erstattet version (documents.jsx: SupersededDoc), f.eks. budget v1 og v2. De findes kun som
// metadata (læst af versionsloggen); indholdet og ændringerne står i versionsloggen i den gældende version.
// Viseren vises kun, når window.CW_SOURCE_VIEW er sat (DOC_PREVIEW).
//
// Props: doc (den erstattede version). Emits: open (React-proppen onOpen: åbn versionsloggen).
import { FileOutlined, FileTextOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { docFill, docWhen } from '@/domain/documents'

defineProps({
  doc: { type: Object, required: true },
})
const emit = defineEmits(['open'])
</script>

<template>
  <a-result
    :title="doc.name"
    :sub-title="docFill(t('Denne version er erstattet af {navn}. Filen er ikke med i sagen; ændringerne mellem versionerne står i versionsloggen i den gældende version.'), { navn: doc.supersededBy || '' })"
  >
    <template #icon>
      <FileOutlined aria-hidden="true" />
    </template>
    <template #extra>
      <a-space
        direction="vertical"
        align="center"
      >
        <a-typography-text type="secondary">
          {{ t('Dateret') + ' ' + docWhen(doc) + ' - ' + doc.size }}
        </a-typography-text>
        <a-button
          size="small"
          @click="emit('open')"
        >
          <template #icon>
            <FileTextOutlined aria-hidden="true" />
          </template>
          {{ t('Åbn versionsloggen') }}
        </a-button>
      </a-space>
    </template>
  </a-result>
</template>
