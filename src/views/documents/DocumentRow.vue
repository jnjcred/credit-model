<script setup>
// Én stille række i Dokumenter (documents.jsx: DocRow): filnavnet er linket, der henter filen, én
// grå metalinje og typen som grå tekst til højre, plus slet. Med viser (DOC_PREVIEW) vælger
// filnavnet i stedet dokumentet til viseren. Erstattede versioner står i folden "Tidligere versioner".
// En række, der er åbnet fra en anden skærm (hiKey) eller valgt i viseren, er markeret (mark).
//
// Props: d (dokumentet), older (erstattede versioner af d), openOlder (søgningen rammer en af dem),
//        hiKey (rækken, der er åbnet fra en anden skærm), selectedKey (viserens dokument), preview (DOC_PREVIEW)
// Emits: select(dokument) (React-proppen onSelect), remove (onRemove; slet-knappen står kun, når
//        CW.canRemoveDoc(d), som da WSDocuments kun gav onRemove i det tilfælde)
import { computed, ref, watch } from 'vue'
import { DeleteOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { docCanGet, docDay, docFill, docKey, docMetaParts } from '@/domain/documents'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import DocMetaLine from './DocMetaLine.vue'

const props = defineProps({
  d: { type: Object, required: true },
  older: { type: Array, default: () => [] },
  openOlder: { type: Boolean, default: false },
  hiKey: { type: String, default: null },
  selectedKey: { type: String, default: null },
  preview: { type: Boolean, default: false },
})
const emit = defineEmits(['select', 'remove'])

const caseVersion = useCaseVersion()
const onCollapseKeydown = useCollapseKeyboard()

const key = computed(() => docKey(props.d))
const url = computed(() => {
  caseVersion.value
  return props.d.fileId ? CW.fileUrl(props.d.fileId) : null
})
const canGet = computed(() => {
  caseVersion.value
  return docCanGet(props.d)
})
const removable = computed(() => CW.canRemoveDoc(props.d))
const showOlder = ref(false)
const hasOlder = computed(() => props.older && props.older.length > 0)
// Åbn folden, når søgningen eller et hop hertil rammer en tidligere version
const wantOpen = computed(() => props.openOlder || (hasOlder.value && props.older.some(o => docKey(o) === props.hiKey || (props.preview && docKey(o) === props.selectedKey))))
watch(wantOpen, (v) => { if (v) showOlder.value = true }, { immediate: true })
const isSel = computed(() => (props.preview ? props.selectedKey === key.value : props.hiKey === key.value))
const getLabel = computed(() => docFill(t('Hent {navn}'), { navn: props.d.name }))
// Filnavnet: med viser vælger det dokumentet; ellers henter det filen (en upload som et link til den
// præcise fil, et af sagens dokumenter via CW.downloadDoc). Uden indhold står navnet som tekst.
const nameLink = computed(() => {
  if (props.preview) return { 'aria-current': isSel.value ? 'true' : undefined }
  if (url.value) return { href: url.value, download: props.d.name, 'aria-label': getLabel.value, title: t('Hent filen') }
  if (canGet.value) return { 'aria-label': getLabel.value, title: t('Hent filen') }
  return null
})
function onName () {
  if (props.preview) emit('select', props.d)
  else if (!url.value) CW.downloadDoc(props.d.name)
}
const meta = computed(() => {
  caseVersion.value
  return docMetaParts(props.d)
})
const isOlderSel = (o) => (props.preview ? props.selectedKey === docKey(o) : props.hiKey === docKey(o))
const onOlderChange = (keys) => { showOlder.value = [].concat(keys || []).includes('older') }
</script>

<template>
  <a-list-item
    class="doc-row"
    :data-doc-key="key"
  >
    <div class="doc-row-body">
      <div class="doc-row-line">
        <a-list-item-meta>
          <template #title>
            <!-- Omslaget holder et link (en upload) i samme farve som knapperne: a-list-item-meta farver
                 et <a>, der står direkte i titlen, som almindelig tekst -->
            <span>
              <!-- Rækken, der er åbnet fra en anden skærm (eller valgt i viseren), er markeret -->
              <a-button
                v-if="nameLink"
                type="link"
                size="small"
                class="cw-filelink doc-name"
                v-bind="nameLink"
                @click="onName"
              >
                <a-typography-text
                  v-if="isSel"
                  mark
                >
                  {{ d.name }}
                </a-typography-text>
                <template v-else>
                  {{ d.name }}
                </template>
              </a-button>
              <!-- Upload fra en tidligere browsersession: kun navn, størrelse og tidspunkt kendes -->
              <a-typography-text
                v-else
                class="doc-name"
                :mark="isSel"
                :title="t('Filens indhold findes kun i den browsersession, den blev uploadet i. Upload filen igen for at hente den.')"
              >
                {{ d.name }}
              </a-typography-text>
            </span>
          </template>
          <template #description>
            <DocMetaLine
              class="cw-row-meta"
              :parts="meta"
            />
          </template>
        </a-list-item-meta>
        <a-space :size="4">
          <a-typography-text
            type="secondary"
            class="cw-row-cat"
          >
            {{ t(d.type) }}
          </a-typography-text>
          <a-button
            v-if="removable"
            type="text"
            size="small"
            class="doc-remove"
            :aria-label="docFill(t('Slet {navn}'), { navn: d.name })"
            :title="t('Slet filen')"
            @click="emit('remove')"
          >
            <template #icon>
              <DeleteOutlined aria-hidden="true" />
            </template>
          </a-button>
        </a-space>
      </div>
      <!-- Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter) -->
      <div
        v-if="hasOlder"
        @keydown="onCollapseKeydown"
      >
        <a-collapse
          class="doc-older"
          ghost
          destroy-inactive-panel
          :expand-icon="collapseExpandIcon"
          :active-key="showOlder ? ['older'] : []"
          @change="onOlderChange"
        >
          <!-- Overskriften har krogen .cw-fold. a-collapse 3.2.13 læser kun headerClass med camelCase
               fra panelet, derfor v-bind med et objekt -->
          <a-collapse-panel
            key="older"
            v-bind="{ headerClass: 'cw-fold' }"
            :header="t('Tidligere versioner') + ' (' + older.length + ')'"
          >
            <a-list
              size="small"
              :data-source="older"
              :row-key="docKey"
            >
              <template #renderItem="{ item: o }">
                <a-list-item :data-doc-key="docKey(o)">
                  <a-list-item-meta>
                    <template #title>
                      <a-button
                        v-if="preview"
                        type="link"
                        size="small"
                        class="cw-filelink doc-name"
                        :aria-current="isOlderSel(o) ? 'true' : undefined"
                        @click="emit('select', o)"
                      >
                        <a-typography-text
                          type="secondary"
                          :mark="isOlderSel(o)"
                        >
                          {{ o.name }}
                        </a-typography-text>
                      </a-button>
                      <a-typography-text
                        v-else
                        class="doc-name"
                        type="secondary"
                        :mark="isOlderSel(o)"
                        :title="docFill(t('Filen er ikke med i sagen. Ændringerne står i versionsloggen i {navn}.'), { navn: o.supersededBy || '' })"
                      >
                        {{ o.name }}
                      </a-typography-text>
                    </template>
                    <template #description>
                      <DocMetaLine
                        class="cw-row-meta"
                        :parts="[t('Erstattet'), docDay(o), o.size]"
                      />
                    </template>
                  </a-list-item-meta>
                  <template #actions>
                    <a-typography-text
                      type="secondary"
                      class="cw-row-cat"
                    >
                      {{ t(o.year) }}
                    </a-typography-text>
                  </template>
                </a-list-item>
              </template>
            </a-list>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </div>
  </a-list-item>
</template>

<style scoped>
/* Rækken og folden med tidligere versioner står under hinanden i listens række */
.doc-row-body {
  flex: 1;
  min-width: 0;
}

/* Navn og metalinje til venstre, typen og slet til højre */
.doc-row-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Lange filnavne afkortes med "…" (hele navnet står i knappens aria-label og title) */
.doc-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
