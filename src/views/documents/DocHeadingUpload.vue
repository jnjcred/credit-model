<script setup>
// "Upload" ved en overskrift i Dokumenter: rådgiveren lægger filer direkte under overskriften (også under dem, der
// endnu ingen dokumenter har). a-upload kalder beforeUpload for hver fil med hele valget; valget meldes én gang
// (ved den første fil), og intet uploades af a-upload selv (LIST_IGNORE): WsDocuments gemmer filerne.
// Props: heading (overskriftens nøgle), label (overskriftens navn, til skærmlæsere).
// Emits: pick(files, heading).
import { Upload } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { docFill } from '@/domain/documents'

const props = defineProps({
  heading: { type: String, required: true },
  label: { type: String, required: true },
})
const emit = defineEmits(['pick'])
const before = (file, fileList) => {
  if (file === fileList[0]) emit('pick', fileList, props.heading)
  return Upload.LIST_IGNORE
}
</script>

<template>
  <a-upload
    :show-upload-list="false"
    multiple
    :before-upload="before"
  >
    <a-button
      type="text"
      size="small"
      :aria-label="docFill(t('Upload til {navn}'), { navn: t(label) })"
    >
      <template #icon>
        <UploadOutlined aria-hidden="true" />
      </template>
      {{ t('Upload') }}
    </a-button>
  </a-upload>
</template>
