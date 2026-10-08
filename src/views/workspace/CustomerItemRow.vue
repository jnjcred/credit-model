<script setup>
// Ét af kundens punkter i Anmodet materiale og Materiale på sagen (workspace.jsx: OutstandingItem,
// L2803–3074). Titel med statusikon og intern note; til højre handlingerne (upload for kunden,
// træk tilbage, påmind, godkend, stil spørgsmål, fortryd). Under titlen filerne (hver med hvem og
// hvornår, fjern og "+" for en fil mere) eller en grå statuslinje; derunder historik, kundens svar
// om salg pr. land, bemærkninger og kundens svar på dit spørgsmål. Filer kan trækkes ind på
// punktet (alle filer i ét træk lægges på i ét kald, med én besked). Låst (indstillet eller afslået
// sag, eller punktet er ikke længere påkrævet): ingen handlinger, ingen fjern, intet træk.
// Al logik (tekster, ikon, hvilke knapper, beskeder med Fortryd, fokus bagefter) står i
// wsOutstandingItem i src/domain/workspace/items.js.
// Element-id'er, andre steder fokuserer: ws-item-<id> på rækken, data-act="approve" på Godkend
// og data-act="add-file" på "+".
//
// Props: it, s (punktets status), locked, dropped, request (den sendte anmodning), groupStart
// (streg over rækken, hvor punkterne skifter sted). React-proppen recipient blev ikke brugt.
// Emits: remind (åbner Påmind kunden).
import { computed, ref } from 'vue'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsFill } from '@/domain/workspace/format'
import { wsOutstandingItem } from '@/domain/workspace/items'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useFileDrop } from './composables/useFileDrop'
import ItemStatusIcon from './shared/ItemStatusIcon.vue'
import ItemHistory from './ItemHistory.vue'
import InternalNotePopover from './InternalNotePopover.vue'
import RejectItemModal from './RejectItemModal.vue'
import CountrySplitTable from './CountrySplitTable.vue'

const props = defineProps({
  it: { type: Object, required: true },
  s: { type: Object, default: null },
  locked: { type: Boolean, default: false },
  dropped: { type: Boolean, default: false },
  request: { type: Object, default: null },
  groupStart: { type: Boolean, default: false },
})
const emit = defineEmits(['remind'])

const caseVersion = useCaseVersion()
const rejecting = ref(false)
const fileInput = ref(null)

const m = computed(() => {
  caseVersion.value
  return wsOutstandingItem(props.it, props.s, props.locked, props.dropped, props.request, rejecting.value, {
    setRejecting: (v) => { rejecting.value = v },
    onRemind: () => emit('remind'),
  })
})
// Anmodet og frist står som tooltip på titlen (før: title)
const tip = computed(() => m.value.tipParts.join(' · '))
const fileUrl = (f) => CW.fileUrl(f.id)
const fileWhenText = (f) => {
  const when = m.value.fileWhen(f)
  return when ? CW.fmtWhen(when) : undefined
}

// Upload for kunden: filvælgeren (flere filer ad gangen) og træk ind på rækken
function onFiles (e) {
  const list = e.target.files
  m.value.addFiles(list && Array.from(list))
  e.target.value = ''
}
function pick () {
  const f = fileInput.value
  if (f) { f.value = ''; f.click() }
}
const { dragging, dropHandlers } = useFileDrop({
  onFiles: (files) => m.value.addFiles(files),
  filesOnly: true,
  disabled: () => props.locked,
})
</script>

<template>
  <a-list-item
    :id="'ws-item-' + it.id"
    :class="['ws-row', { 'ws-drop': dragging }]"
    v-on="dropHandlers"
  >
    <div class="ws-item">
      <a-divider v-if="groupStart" />
      <a-row
        align="middle"
        justify="space-between"
        :gutter="[12, 8]"
      >
        <a-col flex="1 1 240px">
          <a-space :size="8">
            <ItemStatusIcon v-bind="m.icon" />
            <a-tooltip :title="tip || undefined">
              <a-typography-text
                strong
                :type="m.quiet ? 'secondary' : undefined"
              >
                {{ m.label }}
              </a-typography-text>
            </a-tooltip>
            <InternalNotePopover
              :note="m.inote"
              :label="m.label"
              @save="m.saveNote"
              @delete="m.deleteNote"
            />
          </a-space>
        </a-col>
        <a-col
          v-if="m.showActions"
          flex="none"
        >
          <input
            ref="fileInput"
            type="file"
            multiple
            hidden
            :data-item="it.id"
            :aria-label="wsFill(t('Upload filer for kunden til {item}'), { item: m.label })"
            @change="onFiles"
          >
          <a-space
            wrap
            :size="8"
          >
            <a-button
              v-if="m.can.upload"
              type="link"
              size="small"
              :aria-label="wsFill(t('Upload for kunden til {item}'), { item: m.label })"
              @click="pick"
            >
              {{ t('Upload for kunden') }}
            </a-button>
            <a-button
              v-if="m.can.withdraw"
              type="link"
              size="small"
              :title="t('Åbner anmodningen, hvor punktet er fraklikket. Du vælger, om kunden får en mail.')"
              :aria-label="wsFill(t('Træk {item} tilbage'), { item: m.label })"
              @click="m.withdraw"
            >
              {{ t('Træk tilbage') }}
            </a-button>
            <a-button
              v-if="m.can.remind"
              size="small"
              :aria-label="wsFill(t('Påmind kunden om {item}'), { item: m.label })"
              @click="m.remind"
            >
              {{ t('Påmind') }}
            </a-button>
            <a-button
              v-if="m.can.undoQuestion"
              size="small"
              :title="t('Punktet står igen til gennemgang, og spørgsmålet forsvinder fra kundens side')"
              :aria-label="wsFill(t('Fortryd spørgsmålet om {item}'), { item: m.label })"
              @click="m.undoQuestion"
            >
              {{ t('Fortryd') }}
            </a-button>
            <a-button
              v-if="m.can.approveAnyway"
              type="primary"
              size="small"
              data-act="approve"
              :title="t('Du tog fejl: godkend materialet alligevel')"
              :aria-label="wsFill(t('Godkend {item} alligevel'), { item: m.label })"
              @click="m.approve"
            >
              {{ t('Godkend') }}
            </a-button>
            <a-button
              v-if="m.can.review"
              type="primary"
              size="small"
              data-act="approve"
              :aria-label="wsFill(t('Godkend {item}'), { item: m.label })"
              @click="m.approve"
            >
              {{ t('Godkend') }}
            </a-button>
            <a-button
              v-if="m.can.review"
              size="small"
              :aria-label="wsFill(t('Stil spørgsmål til {item}'), { item: m.label })"
              @click="rejecting = true"
            >
              {{ t('Stil spørgsmål til materialet') }}
            </a-button>
            <a-button
              v-if="m.can.unapprove"
              size="small"
              :aria-label="wsFill(t('Fortryd godkendelse af {item}'), { item: m.label })"
              @click="m.unapprove"
            >
              {{ t('Fortryd') }}
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <!-- Filerne: hver fil på sin egen linje med hvem og hvornår (klokkeslæt i tooltip) -->
      <template v-if="m.showFiles">
        <a-typography-text
          v-if="m.meta"
          type="secondary"
        >
          {{ m.meta }}
        </a-typography-text>
        <div
          v-for="(f, i) in m.files"
          :key="f.id"
        >
          <div>
            <a-typography-link
              v-if="fileUrl(f)"
              :href="fileUrl(f)"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="t('Åbn') + ' ' + f.name"
              :title="f.name + (f.sizeLabel ? ' (' + f.sizeLabel + ')' : '')"
            >
              {{ f.name }}
            </a-typography-link>
            <a-tooltip
              v-else
              :title="f.name + ' · ' + t('Filen findes kun i den fane, hvor den blev uploadet')"
            >
              <a-typography-text type="secondary">
                {{ f.name }}
              </a-typography-text>
            </a-tooltip>
            <a-button
              v-if="m.canRemove(f)"
              type="text"
              size="small"
              :title="t('Fjern')"
              :aria-label="wsFill(t('Fjern {file}'), { file: f.name })"
              @click="m.removeFile(f)"
            >
              <template #icon>
                <CloseOutlined aria-hidden="true" />
              </template>
            </a-button>
          </div>
          <div>
            <a-tooltip :title="fileWhenText(f)">
              <a-typography-text type="secondary">
                {{ m.fileMeta(f, i) }}
              </a-typography-text>
            </a-tooltip>
            <a-button
              v-if="m.addFileAt(i)"
              type="text"
              size="small"
              data-act="add-file"
              :title="t('Tilføj en fil mere')"
              :aria-label="wsFill(t('Tilføj en fil mere til {item}'), { item: m.label })"
              @click="pick"
            >
              <template #icon>
                <PlusOutlined aria-hidden="true" />
              </template>
            </a-button>
          </div>
        </div>
      </template>
      <!-- Uden filer: en grå statuslinje (tidspunktet i tooltip) -->
      <div v-else-if="m.lead || m.meta">
        <a-tooltip :title="m.at ? CW.fmtWhen(m.at) : undefined">
          <span>
            <template v-if="m.lead">
              <a-typography-text type="secondary">{{ m.lead.label }}</a-typography-text>
              <template v-if="m.lead.text !== undefined">{{ ' ' + m.lead.text }}</template>
            </template>
            <a-typography-text
              v-if="m.meta"
              type="secondary"
            >{{ (m.lead ? ' · ' : '') + m.meta }}</a-typography-text>
          </span>
        </a-tooltip>
      </div>

      <a-typography-text v-if="dragging">
        {{ t('Slip filerne for at uploade på kundens vegne') }}
      </a-typography-text>

      <ItemHistory :item-id="it.id" />
      <CountrySplitTable
        v-if="m.countries"
        :split="m.countries"
      />
      <!-- Leverandørens bemærkning (kunden, eller dig ved upload for kunden) -->
      <div v-if="m.supplierNote">
        <a-typography-text type="secondary">
          {{ m.supplierNote.label }}
        </a-typography-text>
        {{ ' ' + m.supplierNote.text }}
      </div>
      <!-- Kundens svar på dit spørgsmål til punktet -->
      <div v-if="m.answer">
        <div v-if="m.answer.question">
          <a-typography-text type="secondary">
            {{ t('Dit spørgsmål:') }}
          </a-typography-text>
          {{ ' ' + m.answer.question }}
        </div>
        <div>
          <a-typography-text type="secondary">
            {{ t('Kundens svar:') }}
          </a-typography-text>
          {{ ' ' + m.answer.answer }}
        </div>
      </div>
    </div>
    <RejectItemModal
      v-if="rejecting"
      :it="it"
      @close="rejecting = false"
      @done="m.doReject"
    />
  </a-list-item>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Rækkens indhold fylder bredden; lange filnavne og svar brydes i stedet for at sprænge kortet.
   Holdes musen over rækken (.ws-row), viser InternalNotePopover noteknappen. */
.ws-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Filer trækkes ind på rækken: markér, hvor de lander (antd's primærfarve) */
.ws-drop {
  box-shadow: inset 0 0 0 2px @primary-color;
}
</style>
