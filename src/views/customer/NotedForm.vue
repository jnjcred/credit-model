<script setup>
// "Har vi ikke / ikke relevant / sendt på anden måde" (customer_status.jsx: CWNotedForm): en kort
// forklaring til rådgiveren, eller en fil i stedet. Bruges af portalens punkter (PortalNotedToggle).
//
// Props: itemId (punktet), idPrefix (præfiks for id'erne; standard 'cs'), så felterne hedder
//        <idPrefix>-noted-<itemId>-text osv.
// Emits: done (sendt), cancel (Annullér).
// Send-knappen bærer data-cust-act="send": portalens forhåndsvisning stopper klikket (capture).
// Filfeltet: elementet med data-cs-noted=<itemId> rummer a-upload, og selve <input type=file> har
// id'et <idPrefix>-noted-<itemId>-file (antdv 3.2.13's Upload sender ikke data-* videre til feltet).
// Filerne gemmes først, når der trykkes Send; listen under knappen er det valgte, som kan fjernes igen.
// Ingen <form> (som før): portalens forhåndsvisning stopper alle submit-hændelser. Felterne har
// derfor a-form-item uden a-form; label-col 24 lægger etiketten over feltet som i en lodret formular.
import { computed, onMounted, ref, shallowRef } from 'vue'
import { Upload } from 'ant-design-vue'
import { CloseOutlined, FileOutlined, SendOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { CS_ACCEPT, csAcceptFiles, csClearDraft, csFill } from '@/domain/customer'
import { confirmRemove } from '@/services/feedback'
import { useUploadButton } from '@/composables/useUploadButton'

const props = defineProps({
  itemId: { type: String, required: true },
  idPrefix: { type: String, default: '' },
})
const emit = defineEmits(['done', 'cancel'])

const it = computed(() => CW.itemById(props.itemId))
const adv = 'EIFO'   // kunden skriver til EIFO
const pid = computed(() => (props.idPrefix || 'cs') + '-noted-' + props.itemId)
const kind = ref('none')
const text = ref('')
const files = shallowRef([])
const err = ref('')
const label = computed(() => (it.value ? t(it.value.label) : ''))
const FULL = { span: 24 }

// Skrivefeltet får fokus, når formularen åbner (autoFocus før)
onMounted(() => {
  const el = document.getElementById(pid.value + '-text')
  if (el) el.focus()
})

function submit () {
  const txt = text.value.trim()
  if (!txt && !files.value.length) {
    err.value = t('Skriv en kort forklaring, eller vælg en fil.')
    CW.focusSoon('#' + pid.value + '-text')
    return
  }
  csClearDraft(props.itemId)
  if (files.value.length) {
    const metas = CW.putFiles(files.value, { by: 'kunde', itemId: props.itemId })
    CW.markReceived(props.itemId, { by: 'kunde', files: metas, note: txt })
    CW.toast(csFill(t('{punkt} er sendt til {navn}'), { punkt: label.value, navn: adv }))
  } else {
    const note = (kind.value === 'na' ? t('Ikke relevant for os') + ': ' : '') + txt
    CW.markNoted(props.itemId, { by: 'kunde', note, kind: kind.value === 'other' ? 'anden-maade' : 'har-vi-ikke' })
    CW.toast(kind.value === 'other'
      ? csFill(t('{navn} kan se, hvordan I har sendt {punkt}'), { navn: adv, punkt: label.value.toLowerCase() })
      : csFill(t('{navn} kan se, at I ikke sender {punkt}'), { navn: adv, punkt: label.value.toLowerCase() }))
  }
  emit('done')
}

const setErr = (msg) => { err.value = msg }
// a-upload kalder for hver valgt fil med hele valget. Valget behandles samlet ved den første fil,
// som filfeltets onChange før: forkert type eller over 50 MB giver beskeden ved feltet, resten
// lægges til listen. Intet sendes, og antdv's egen filliste bruges ikke (LIST_IGNORE).
function onPick (file, fileList) {
  if (file === fileList[0]) {
    const f = csAcceptFiles(fileList, CS_ACCEPT, setErr)
    if (f.length) files.value = files.value.concat(f)
  }
  return Upload.LIST_IGNORE
}
// Filer, der trækkes ind på knappen med en anden type, sorterer a-upload fra; de får samme besked
function onReject (rejected) {
  csAcceptFiles(rejected, CS_ACCEPT, setErr)
}
function removeFile (f, i) {
  confirmRemove(f.name, t('Filen er ikke sendt endnu.')).then(ok => {
    if (ok) files.value = files.value.filter((_, j) => j !== i)
  })
}
function onText (v) {
  text.value = v
  if (err.value) err.value = ''
}

const textLabel = computed(() => (kind.value === 'other' ? t('Hvordan og hvornår har I sendt det?') : csFill(t('Kort forklaring til {navn}'), { navn: adv })))
const placeholder = computed(() => (kind.value === 'other' ? t('F.eks. sendt over mail til Mette 2. oktober.')
  : kind.value === 'na' ? t('F.eks. vi har ingen lån ud over kassekreditten.')
  : t('F.eks. vi har ingen ejeraftale.')))
// Valgene er begrundelser, så de passer til overskriften "Angiv en begrundelse"
const KINDS = [['none', 'Vi har det ikke'], ['na', 'Det er ikke relevant for os'], ['other', 'Vi har sendt det på anden måde']]
// Upload-knappen er det eneste Tab-stop (a-uploads omslag tages ud; se useUploadButton)
const uploadRoot = ref(null)
useUploadButton(uploadRoot)
</script>

<template>
  <a-card
    ref="uploadRoot"
    size="small"
    class="cs-form"
  >
    <a-form-item
      :label-col="FULL"
      :colon="false"
    >
      <template #label>
        <span :id="pid + '-kind-label'">{{ t('Angiv en begrundelse') }}</span>
      </template>
      <a-radio-group
        v-model:value="kind"
        :name="pid + '-kind'"
        role="radiogroup"
        :aria-labelledby="pid + '-kind-label'"
      >
        <a-radio
          v-for="[k, l] in KINDS"
          :key="k"
          :value="k"
        >
          {{ t(l) }}
        </a-radio>
      </a-radio-group>
    </a-form-item>

    <!-- Fejlen står under filerne (som før): den gælder både forklaringen og filerne -->
    <a-form-item
      :label="textLabel"
      :html-for="pid + '-text'"
      :label-col="FULL"
      :colon="false"
      :validate-status="err ? 'error' : ''"
    >
      <a-textarea
        :id="pid + '-text'"
        :value="text"
        :rows="2"
        :placeholder="placeholder"
        :aria-invalid="err ? 'true' : undefined"
        :aria-describedby="err ? pid + '-err' : undefined"
        @update:value="onText"
      />
      <div
        class="cs-form-files"
        :data-cs-noted="itemId"
      >
        <a-upload
          :id="pid + '-file'"
          :show-upload-list="false"
          multiple
          :accept="CS_ACCEPT"
          :before-upload="onPick"
          @reject="onReject"
        >
          <a-button>
            <template #icon>
              <UploadOutlined aria-hidden="true" />
            </template>
            {{ t('Vedhæft en fil i stedet') }}
          </a-button>
        </a-upload>
        <a-list
          v-if="files.length"
          size="small"
          :split="false"
          :data-source="files"
        >
          <template #renderItem="{ item: f, index: i }">
            <a-list-item>
              <span class="cs-form-file">
                <FileOutlined aria-hidden="true" />
                {{ ' ' }}{{ f.name }}
              </span>
              <a-button
                type="text"
                :aria-label="csFill(t('Fjern {navn}'), { navn: f.name })"
                @click="removeFile(f, i)"
              >
                <template #icon>
                  <CloseOutlined aria-hidden="true" />
                </template>
              </a-button>
            </a-list-item>
          </template>
        </a-list>
      </div>
      <template
        v-if="err"
        #help
      >
        <span :id="pid + '-err'">{{ err }}</span>
      </template>
    </a-form-item>

    <div class="cs-form-foot">
      <a-button @click="emit('cancel')">
        {{ t('Annullér') }}
      </a-button>
      <a-button
        type="primary"
        data-cust-act="send"
        @click="submit"
      >
        <template #icon>
          <SendOutlined aria-hidden="true" />
        </template>
        {{ csFill(t('Send til {navn}'), { navn: adv }) }}
      </a-button>
    </div>
  </a-card>
</template>

<style scoped>
.cs-form-files {
  margin-top: 8px;
}

.cs-form-file {
  min-width: 0;
  word-break: break-all;
}

.cs-form-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
</style>
