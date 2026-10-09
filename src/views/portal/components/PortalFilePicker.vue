<script setup>
// Filvælgeren med træk-og-slip og listen over valgte filer, der endnu ikke er sendt
// (new_case_portal.jsx: PortalFilePicker, L1890–1935). Bruges af PortalUpload, PortalConnect og
// PortalOtherFilesModal.
//
// v-model:staged (prop staged + emit update:staged): de valgte filer (FileMeta fra CW.putFiles).
// Props: accept (filtyper; standard CS_ACCEPT), title og hint (teksterne i feltet), itemId (punktet,
//        filerne gemmes til; uden: andre filer).
//
// Filerne lægges i demoens fillager, så snart de er valgt (csStageFiles), som før: de overlever en
// genindlæsning, og intet sendes, før kunden trykker på sidens knap. Forkert type eller over 50 MB giver
// samme besked som før (csAcceptFiles); de gyldige filer i et valg lægges til alligevel.
//
// a-upload-dragger kalder beforeUpload for hver fil med hele valget: valget behandles samlet ved den
// første fil, og intet uploades (LIST_IGNORE). Filer, der trækkes ind med en forkert type, sorterer
// komponenten selv fra og melder med @reject; de får samme besked.
// 3.2.13 sender hverken data-* eller aria-* videre til feltet: data-cust-act="upload" og
// data-pv-allow="1" står derfor på elementet rundt om (forhåndsvisningens spærre finder dem med
// closest), og filfeltet har id'et portal-file-input (i stedet for data-testid). Feltet åbner med
// Enter (antdv) og Mellemrum (som før).
// Ikke porteret: compact (kun mindre luft og skrift i prototypen; antdv's felt har én størrelse).
import { ref } from 'vue'
import { Upload } from 'ant-design-vue'
import { PaperClipOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { CS_ACCEPT, csAcceptFiles, csStageFiles } from '@/domain/customer'
import { ncFill } from '@/domain/new_case_portal'
import { confirmRemove } from '@/services/feedback'

const props = defineProps({
  staged: { type: Array, default: () => [] },
  accept: { type: String, default: CS_ACCEPT },
  title: { type: String, default: '' },
  hint: { type: String, default: '' },
  itemId: { type: String, default: undefined },
})
const emit = defineEmits(['update:staged'])

const err = ref('') // forkert filtype eller for stor
const said = ref('') // til skærmlæsere: "<fil> er klar til at sende"
const setErr = (msg) => { err.value = msg }

function add (list) {
  const arr = csAcceptFiles(list, props.accept, setErr)
  if (arr.length) {
    emit('update:staged', props.staged.concat(csStageFiles(arr, props.itemId)))
    said.value = arr.length === 1 ? ncFill(t('{file} er klar til at sende'), { file: arr[0].name }) : ncFill(t('{n} filer er klar til at sende'), { n: arr.length })
  }
}
function onBefore (file, fileList) {
  if (file === fileList[0]) add(fileList)
  return Upload.LIST_IGNORE
}
function onReject (rejected) {
  csAcceptFiles(rejected, props.accept, setErr)
}
// Mellemrum åbner filvalget som Enter (feltets knap reagerer kun på Enter i 3.2.13)
function onKeydown (e) {
  if (e.key !== ' ' || e.repeat || !e.target || e.target.getAttribute('role') !== 'button') return
  e.preventDefault()
  e.target.click()
}
function remove (f, i) {
  confirmRemove(f.name, t('Filen er ikke sendt endnu.')).then(ok => {
    if (ok) emit('update:staged', props.staged.filter((_, j) => j !== i))
  })
}
</script>

<template>
  <div>
    <div
      class="portal-picker-zone"
      data-cust-act="upload"
      data-pv-allow="1"
      @keydown="onKeydown"
    >
      <a-upload-dragger
        id="portal-file-input"
        class="cwp-drop"
        :accept="accept"
        multiple
        :show-upload-list="false"
        :before-upload="onBefore"
        @reject="onReject"
      >
        <a-typography-text strong>
          {{ title || t('Træk filer hertil, eller vælg filer') }}
        </a-typography-text>
        <div>
          <a-typography-text type="secondary">
            {{ hint || t('PDF, Excel, Word eller billeder - højst 50 MB pr. fil') }}
          </a-typography-text>
        </div>
        <!-- Kun til at se på: et klik her er et klik på feltet -->
        <a-button
          class="portal-picker-mock"
          tabindex="-1"
          aria-hidden="true"
        >
          {{ t('Vælg filer') }}
        </a-button>
      </a-upload-dragger>
    </div>
    <div
      role="status"
      class="sr-only cwp-file-status"
    >
      {{ said }}
    </div>
    <a-alert
      v-if="err"
      class="cwp-file-err portal-picker-gap"
      type="error"
      show-icon
      :message="err"
    />
    <!-- De valgte filer, som vedhæftede filer i en mail: en lille clips, navnet, størrelsen og Fjern -->
    <ul
      v-if="staged.length"
      class="portal-picker-gap portal-picker-files"
      :aria-label="t('Klar til at sende')"
    >
      <li
        v-for="(f, i) in staged"
        :key="f.id"
      >
        <div class="portal-picker-file">
          <PaperClipOutlined
            class="portal-picker-clip"
            aria-hidden="true"
          />
          <span class="portal-picker-name">{{ f.name }}</span>
          <a-typography-text type="secondary">
            {{ CW.fmtSize(f.size) }}
          </a-typography-text>
          <a-button
            type="link"
            size="small"
            class="portal-picker-remove"
            :aria-label="ncFill(t('Fjern {file}'), { file: f.name })"
            @click="remove(f, i)"
          >
            {{ t('Fjern') }}
          </a-button>
        </div>
        <!-- Plads til noget ved filen, f.eks. valg af emne i "Send en anden fil" -->
        <slot
          name="file"
          :file="f"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Synligt tastaturfokus på slip-feltet (WCAG 2.4.7): antdv viser ingen ring på feltets knap
   (role="button"); prototypens felt havde en. Ringen ligger indenfor feltets kant, som andre steder */
.portal-picker-zone :deep([role='button']:focus-visible) {
  box-shadow: inset 0 0 0 2px @primary-color;
}

.portal-picker-mock {
  margin-top: 12px;
}

.portal-picker-gap {
  margin-top: 12px;
}

.portal-picker-files {
  padding: 0;
  margin-bottom: 0;
  list-style: none;
}

.portal-picker-file {
  display: flex;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
}

.portal-picker-clip {
  flex-shrink: 0;
  color: @text-color-secondary;
}

.portal-picker-remove {
  padding: 0;
  margin-left: auto;
}

/* Lange filnavne brydes, så listen ikke bliver bredere end siden */
.portal-picker-name {
  word-break: break-all;
}
</style>
