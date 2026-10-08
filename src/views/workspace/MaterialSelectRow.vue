<script setup>
// Én række i "Anmod om materiale" (WSMaterialModal i workspace.jsx: row() L1909–1972 og de tre
// foldes rækker L2029–2038, L2051–2089 og L2103–2125). Reglerne ligger i src/domain/workspace/request.js.
//
// Props:
//   item      punktet (fra wsMaterialModel: missing, custom, extras, fetched eller inCase)
//   kind      'select'  vælg eller fravælg punktet; upload på kundens vegne (knap eller træk filer
//                       ind på rækken); rådgiverens egne punkter; det, rådgiveren selv har uploadet
//             'extra'   mere materiale, du kan bede om (vælges til)
//             'fetched' hentet automatisk: Spørg kunden eller Bed om ny version
//             'case'    ligger allerede på sagen: hent dokumentet, tilføj en fil, Bed om ny version
//   selected  punktet er valgt i kladden (kind 'select')
//   asking    formularen "Spørg kunden" er åben for punktet (kind 'fetched')
// Emits: ask (Spørg kunden: åbn eller luk formularen; skærmen bruger wsOpenAsk)
// Slot: default, under rækken (formularen "Spørg kunden")
import { computed, ref } from 'vue'
import { CloseOutlined, FileTextOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsDay, wsFill } from '@/domain/workspace/format'
import {
  WS_MATERIAL_CATS, wsAskNewVersion, wsAttachFiles, wsMaterialCat, wsRemoveAdvisorFile, wsRemoveAdvisorFiles,
  wsToggleMaterial, wsUploadedByAdvisor,
} from '@/domain/workspace/request'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useSelectEscape } from '@/composables/useSelectEscape'
import { useFileDrop } from './composables/useFileDrop'
import ItemStatusIcon from './shared/ItemStatusIcon.vue'
import { useUploadButton } from '@/composables/useUploadButton'

const props = defineProps({
  item: { type: Object, required: true },
  kind: { type: String, default: 'select', validator: (v) => ['select', 'extra', 'fetched', 'case'].includes(v) },
  selected: { type: Boolean, default: false },
  asking: { type: Boolean, default: false },
})
defineEmits(['ask'])

const version = useCaseVersion()
// Det, rådgiveren selv har uploadet på kundens vegne (status, filer, tidspunkt), eller null
const up = computed(() => {
  version.value
  return props.kind === 'select' ? wsUploadedByAdvisor(props.item.id) : null
})
// Punktet under Dokumenter (eller fra en offentlig kilde), eller null
const onFile = computed(() => {
  version.value
  return CW.onFile(props.item)
})
const hasOnFile = computed(() => !!onFile.value && !onFile.value.stale)
// Rådgiverens filer, og om hver kan fjernes (kun den, der uploadede, og ikke efter godkendelse)
const upFiles = computed(() => {
  version.value
  return up.value ? up.value.files.map(f => ({ f, removable: CW.canRemoveFile(props.item.id, f.id, 'rådgiver') })) : []
})

const hasCheckbox = computed(() => (props.kind === 'select' && !up.value) || props.kind === 'extra')
const checked = computed(() => props.kind === 'select' && props.selected && !up.value)
const checkId = computed(() => 'ws-req-' + props.item.id)
const marker = computed(() => {
  if (up.value) return up.value.status === 'approved' ? { kind: 'approved', label: t('Godkendt') } : { kind: 'received', label: t('Modtaget') }
  return { kind: 'approved', label: props.kind === 'fetched' ? t('Hentet automatisk') : t('Ligger på sagen') }
})
const rowTitle = computed(() => ((props.kind === 'select' || props.kind === 'extra') && props.item.why ? t(props.item.why) : undefined))
// Spørgsmålet i citationstegn, afkortet til én linje (hele teksten står i title på linjen)
const questionText = computed(() => '"' + props.item.question + '"')
const uploadedText = computed(() => {
  const u = up.value
  if (!u) return ''
  return u.files.length === 1 ? wsFill(t('Uploadet af dig {date}'), { date: wsDay(u.at) }) : wsFill(t('{n} filer uploadet af dig {date}'), { n: u.files.length, date: wsDay(u.at) })
})
const fetchedText = computed(() => {
  const f = onFile.value
  if (!f) return ''
  return wsFill(t('Hentet automatisk fra {src}'), { src: f.isPublic ? t(f.name) : t('CVR-registret') }) + (f.date ? ' · ' + f.date : '')
})
// Emnet: rådgiverens egne punkter kan skifte emne (samme liste som Dokumenter og kundens portal)
const catOptions = WS_MATERIAL_CATS.map(c => c.label).concat(['Øvrigt']).map(c => ({ value: c, label: t(c) }))
const catId = computed(() => 'ws-req-cat-' + props.item.id)
const selectEsc = useSelectEscape()

const toggle = () => wsToggleMaterial(props.item)
const removeCustom = () => CW.removeCustomItem(props.item.id)
const setCat = (v) => CW.setCustomItemCat(props.item.id, v)
const download = () => CW.downloadDoc(onFile.value.latestName || onFile.value.name)

/* ── Upload på kundens vegne ──────────────────────────────────────────────────
   Alle filer fra ét valg eller ét træk lægges på punktet i ét kald (CW.putFiles og
   CW.markReceived), og punktet er derefter valgt, som før (wsAttachFiles). */
const { dragging, dropHandlers } = useFileDrop({ onFiles: attach })
function attach (files) {
  dragging.value = false
  wsAttachFiles(props.item, files)
}
// a-upload kalder customRequest én gang pr. fil, alle i samme omgang: filerne samles og lægges på
// punktet samlet, når omgangen er slut. Intet sendes over nettet.
let batch = null
function onUploadRequest ({ file, onSuccess }) {
  if (!batch) {
    batch = []
    Promise.resolve().then(() => {
      const files = batch
      batch = null
      attach(files)
    })
  }
  batch.push(file)
  onSuccess()
}
// Hele rækken tager imod filer (kun punkter, der kan vælges). Slippes de på upload-knappen,
// har a-upload allerede taget dem (og sendt dem gennem onUploadRequest); så ryddes kun markeringen.
const rowEvents = computed(() => (props.kind !== 'select' ? {} : {
  ...dropHandlers,
  drop: (e) => {
    if (e.defaultPrevented) dragging.value = false
    else dropHandlers.drop(e)
  },
}))
// Upload-knappen er det eneste Tab-stop (a-uploads omslag tages ud; se useUploadButton)
const uploadRoot = ref(null)
useUploadButton(uploadRoot)
</script>

<template>
  <div
    :id="kind === 'fetched' ? 'ws-ask-' + item.id : undefined"
    ref="uploadRoot"
    class="ws-req-row"
    :class="{ 'ws-req-drop': dragging }"
    :title="rowTitle"
    v-on="rowEvents"
  >
    <a-row
      :gutter="12"
      :wrap="false"
      align="top"
    >
      <a-col flex="none">
        <a-checkbox
          v-if="hasCheckbox"
          :id="checkId"
          :checked="checked"
          @change="toggle"
        />
        <ItemStatusIcon
          v-else
          :kind="marker.kind"
          :label="marker.label"
        />
      </a-col>

      <a-col flex="auto">
        <div class="ws-req-head">
          <label
            v-if="hasCheckbox"
            :for="checkId"
          ><a-typography-text strong>{{ t(item.label) }}</a-typography-text></label>
          <a-typography-text
            v-else
            strong
          >
            {{ t(item.label) }}
          </a-typography-text>
          <a-button
            v-if="kind === 'select' && item.custom && !up"
            type="text"
            size="small"
            :aria-label="wsFill(t('Fjern {item}'), { item: item.label })"
            :title="t('Fjern punkt')"
            @click="removeCustom"
          >
            <template #icon>
              <CloseOutlined aria-hidden="true" />
            </template>
          </a-button>
        </div>

        <template v-if="kind === 'select'">
          <div
            v-if="item.question"
            :title="item.question"
          >
            <a-typography-text
              type="secondary"
              :ellipsis="true"
              :content="questionText"
            />
          </div>
          <template v-if="up">
            <div
              v-for="{ f, removable } in upFiles"
              :key="f.id"
              class="ws-req-file"
            >
              <a-typography-text type="secondary">
                <FileTextOutlined aria-hidden="true" />
              </a-typography-text>
              <a-typography-text
                :ellipsis="true"
                :content="f.name"
              />
              <a-button
                v-if="removable"
                type="link"
                size="small"
                :aria-label="wsFill(t('Fjern {file}'), { file: f.name })"
                @click="wsRemoveAdvisorFile(item, f)"
              >
                {{ t('Fjern') }}
              </a-button>
            </div>
            <div class="ws-req-file">
              <a-typography-text type="secondary">
                {{ uploadedText }}
              </a-typography-text>
              <a-upload
                multiple
                :show-upload-list="false"
                :custom-request="onUploadRequest"
              >
                <a-button
                  type="text"
                  size="small"
                  :title="t('Tilføj en fil mere')"
                  :aria-label="wsFill(t('Tilføj en fil mere til {item}'), { item: t(item.label) })"
                >
                  <template #icon>
                    <PlusOutlined aria-hidden="true" />
                  </template>
                </a-button>
              </a-upload>
              <template v-if="up.files.length > 1">
                <span aria-hidden="true">·</span>
                <a-button
                  type="link"
                  size="small"
                  @click="wsRemoveAdvisorFiles(item, up)"
                >
                  {{ t('Fjern alle') }}
                </a-button>
              </template>
            </div>
          </template>
          <div v-if="!up && !dragging && hasOnFile">
            <a-typography-text type="secondary">
              {{ wsFill(t('Ny version af {doc}'), { doc: t(onFile.latestName || onFile.name) }) }}
            </a-typography-text>
          </div>
          <div v-if="dragging">
            <a-typography-text>{{ t('Slip filerne for at uploade på kundens vegne') }}</a-typography-text>
          </div>
        </template>

        <div v-else-if="kind === 'extra' && item.hint">
          <a-typography-text type="secondary">
            {{ t(item.hint) }}
          </a-typography-text>
        </div>

        <div v-else-if="kind === 'fetched'">
          <a-typography-text type="secondary">
            {{ fetchedText }}
          </a-typography-text>
        </div>

        <div
          v-else-if="kind === 'case' && onFile"
          class="ws-req-file"
        >
          <a-typography-text type="secondary">
            <FileTextOutlined aria-hidden="true" />
          </a-typography-text>
          <a-typography-text
            v-if="onFile.isPublic"
            :ellipsis="true"
            :content="t(onFile.latestName || onFile.name)"
          />
          <a-button
            v-else
            class="ws-req-filelink"
            type="link"
            size="small"
            :title="t('Hent dokumentet')"
            @click="download"
          >
            {{ t(onFile.latestName || onFile.name) }}
          </a-button>
          <a-upload
            multiple
            :show-upload-list="false"
            :custom-request="onUploadRequest"
          >
            <a-button
              type="text"
              size="small"
              :title="t('Tilføj en fil mere')"
              :aria-label="wsFill(t('Tilføj en fil mere til {item}'), { item: t(item.label) })"
            >
              <template #icon>
                <PlusOutlined aria-hidden="true" />
              </template>
            </a-button>
          </a-upload>
        </div>
      </a-col>

      <a-col
        v-if="kind !== 'extra'"
        flex="none"
      >
        <a-space :size="4">
          <template v-if="kind === 'select'">
            <a-button
              v-if="up"
              type="text"
              size="small"
              @click="wsAskNewVersion(item)"
            >
              {{ t('Bed om ny version') }}
            </a-button>
            <a-upload
              v-else
              multiple
              :show-upload-list="false"
              :custom-request="onUploadRequest"
            >
              <a-button
                type="text"
                size="small"
                :title="t('Upload på kundens vegne')"
                :aria-label="wsFill(t('Upload for kunden til {item}'), { item: t(item.label) })"
              >
                <template #icon>
                  <UploadOutlined aria-hidden="true" />
                </template>
                {{ t('Upload for kunden') }}
              </a-button>
            </a-upload>
          </template>
          <a-button
            v-if="kind === 'fetched'"
            type="text"
            size="small"
            :aria-expanded="asking"
            @click="$emit('ask')"
          >
            {{ t('Spørg kunden') }}
          </a-button>
          <a-button
            v-if="kind === 'fetched' || kind === 'case'"
            type="text"
            size="small"
            @click="toggle"
          >
            {{ t('Bed om ny version') }}
          </a-button>
        </a-space>
      </a-col>

      <a-col
        flex="150px"
        class="ws-req-cat"
      >
        <template v-if="kind === 'select' && item.custom">
          <label
            class="sr-only"
            :for="catId"
          >{{ t('Kategori') }}</label>
          <div
            @keydown.capture="selectEsc.onKeydownCapture"
            @keydown="selectEsc.onKeydown"
          >
            <a-select
              :id="catId"
              :value="item.cat"
              :options="catOptions"
              size="small"
              :bordered="false"
              :dropdown-match-select-width="false"
              @change="setCat"
            />
          </div>
        </template>
        <a-typography-text
          v-else
          type="secondary"
        >
          {{ t(wsMaterialCat(item)) }}
        </a-typography-text>
      </a-col>
    </a-row>
    <slot />
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

.ws-req-row {
  padding: 8px 0;
  /* Afsnittet kan rulles frem (fx efter "Tilføj spørgsmålet") uden at skjule sig under kanten */
  scroll-margin-top: 16px;
}

/* Filer trækkes ind over rækken: den markeres som stedet, hvor de lægges */
.ws-req-drop {
  outline: 1px dashed @primary-color;
}

.ws-req-head,
.ws-req-file {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.ws-req-cat {
  text-align: right;
}

/* Et langt dokumentnavn afkortes med … i stedet for at sprænge rækken */
.ws-req-filelink {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
