<script setup>
// Én fil i listen på Credit memo-siden (memo_handoff.jsx: HandoffRow): filnavnet henter filen, under
// det én grå metalinje, og til højre "Hentet", dokumenttypen eller "Kan ikke hentes her". En upload,
// hvis indhold kun findes i den browsersession, den blev uploadet i, kan ikke hentes; navnet står som
// tekst med forklaringen i title (som før migrationen).
//
// Props: d (dokumentet, som hoGroups giver det), got (filen er hentet). Emits: get(d) (React-proppen onGet).
import { computed } from 'vue'
import { CheckOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { docCanGet, docDay, docPages } from '@/domain/documents'
import { hoFill } from '@/domain/memo_handoff'
import DocMetaLine from '@/views/documents/DocMetaLine.vue'

const props = defineProps({
  d: { type: Object, required: true },
  got: { type: Boolean, default: false },
})
const emit = defineEmits(['get'])

const can = computed(() => docCanGet(props.d))
// Metalinjen (docMeta før migrationen): tomme led udelades, resten adskilles af " · "
const meta = computed(() => {
  const d = props.d
  return d.fileId
    ? [t(d.sourceLabel), docDay(d), d.size, d.itemId ? t(d.itemLabel) : null]
    : [t(d.sourceLabel || 'Kundeupload'), docDay(d), docPages(d), d.size]
})
</script>

<template>
  <a-list-item>
    <a-list-item-meta>
      <template #title>
        <a-button
          v-if="can"
          class="cw-link"
          type="link"
          size="small"
          :aria-label="hoFill(t('Hent {navn}'), { navn: d.name })"
          :title="t('Hent filen')"
          @click="emit('get', d)"
        >
          {{ d.name }}
        </a-button>
        <a-typography-text
          v-else
          :title="t('Filens indhold findes kun i den browsersession, den blev uploadet i. Upload filen igen for at hente den.')"
        >
          {{ d.name }}
        </a-typography-text>
      </template>
      <template #description>
        <DocMetaLine :parts="meta" />
      </template>
    </a-list-item-meta>
    <template #actions>
      <a-typography-text type="secondary">
        <template v-if="got">
          <CheckOutlined aria-hidden="true" /> {{ t('Hentet') }}
        </template>
        <template v-else>
          {{ can ? t(d.type) : t('Kan ikke hentes her') }}
        </template>
      </a-typography-text>
    </template>
  </a-list-item>
</template>
