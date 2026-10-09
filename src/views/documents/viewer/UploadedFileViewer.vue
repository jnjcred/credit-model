<script setup>
// Viseren: en uploadet fil (documents.jsx: UploadedFileViewer). PDF i en iframe, billeder som billede,
// andre filtyper med "Åbn fil". Filens indhold findes kun i den browsersession, den blev uploadet i
// (CW.fileUrl); ellers kendes kun navn, størrelse og tidspunkt.
// Viseren vises kun, når window.CW_SOURCE_VIEW er sat (DOC_PREVIEW).
//
// Props: doc (rækken fra docFromUpload).
import { computed } from 'vue'
import { FileOutlined, FullscreenOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DOC_ITEM_STATUS } from '@/domain/documents'
import { useCaseVersion } from '@/composables/useCaseVersion'

const props = defineProps({
  doc: { type: Object, required: true },
})

const caseVersion = useCaseVersion()
const url = computed(() => {
  caseVersion.value
  return CW.fileUrl(props.doc.fileId)
})
const isPdf = computed(() => /pdf/i.test(props.doc.mime) || /\.pdf$/i.test(props.doc.name))
const isImg = computed(() => /^image\//i.test(props.doc.mime) || /\.(png|jpe?g|gif|webp|svg)$/i.test(props.doc.name))
// Metalinjen: kilde, tidspunkt, størrelse og punktet (eller "Ikke knyttet til et punkt")
const status = computed(() => t(DOC_ITEM_STATUS[props.doc.itemStatus] || 'Modtaget'))
</script>

<template>
  <!-- Filen fra en tidligere browsersession: kun navn, størrelse og tidspunkt -->
  <a-result
    v-if="!url"
    :title="doc.name"
  >
    <template #icon>
      <FileOutlined aria-hidden="true" />
    </template>
    <template #subTitle>
      <a-space
        direction="vertical"
        align="center"
      >
        <a-space
          wrap
          :size="[16, 4]"
        >
          <a-typography-text type="secondary">
            {{ t(doc.sourceLabel) }}
          </a-typography-text>
          <a-typography-text type="secondary">
            {{ doc.uploaded }}
          </a-typography-text>
          <a-typography-text type="secondary">
            {{ doc.size }}
          </a-typography-text>
          <a-typography-text
            v-if="doc.itemId"
            type="secondary"
          >
            {{ t('Punkt:') + ' ' }}<a-typography-text strong>
              {{ t(doc.itemLabel) }}
            </a-typography-text>{{ ' - ' + status }}
          </a-typography-text>
          <a-typography-text
            v-else
            type="secondary"
          >
            {{ t('Ikke knyttet til et punkt') }}
          </a-typography-text>
        </a-space>
        <span>{{ t('Filens indhold findes kun i den browsersession, den blev uploadet i. Her kendes kun navn, størrelse og tidspunkt. Upload filen igen for at se den.') }}</span>
      </a-space>
    </template>
  </a-result>
  <div
    v-else
    class="doc-file"
  >
    <a-space
      wrap
      :size="[16, 4]"
    >
      <a-typography-text type="secondary">
        {{ t(doc.sourceLabel) }}
      </a-typography-text>
      <a-typography-text type="secondary">
        {{ doc.uploaded }}
      </a-typography-text>
      <a-typography-text type="secondary">
        {{ doc.size }}
      </a-typography-text>
      <a-typography-text
        v-if="doc.itemId"
        type="secondary"
      >
        {{ t('Punkt:') + ' ' }}<a-typography-text strong>
          {{ t(doc.itemLabel) }}
        </a-typography-text>{{ ' - ' + status }}
      </a-typography-text>
      <a-typography-text
        v-else
        type="secondary"
      >
        {{ t('Ikke knyttet til et punkt') }}
      </a-typography-text>
    </a-space>
    <iframe
      v-if="isPdf"
      :title="doc.name"
      :src="url"
      class="doc-frame"
    />
    <img
      v-else-if="isImg"
      :src="url"
      :alt="doc.name"
      class="doc-img"
    >
    <a-result
      v-else
      :title="doc.name"
      :sub-title="t('Denne filtype kan ikke vises her.') + ' ' + (doc.mime ? '(' + doc.mime + ')' : '')"
    >
      <template #icon>
        <FileOutlined aria-hidden="true" />
      </template>
      <template #extra>
        <a-button
          size="small"
          :href="url"
          target="_blank"
          rel="noopener noreferrer"
          :download="doc.name"
        >
          <template #icon>
            <FullscreenOutlined aria-hidden="true" />
          </template>
          {{ t('Åbn fil') }}
        </a-button>
      </template>
    </a-result>
  </div>
</template>

<style scoped>
/* Metalinjen over filen; PDF'en og billedet fylder viserens bredde */
.doc-file {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.doc-frame {
  display: block;
  width: 100%;
  height: 640px;
  border: 0;
}

.doc-img {
  display: block;
  max-width: 100%;
  max-height: 620px;
  margin: 0 auto;
  object-fit: contain;
}
</style>
