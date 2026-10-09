<script setup>
// "Send en anden fil" (new_case_portal.jsx: PortalOtherFilesModal, L2279–2334): filer, der ikke hører til
// et punkt. Rådgiveren får dem med det samme. Øverst de andre filer, kunden har sendt, med "Fjern"
// (bekræftelse), derunder filvælgeren og "Send til {rådgiver}" (den rigtige disabled-attribut, til der er
// valgt en fil). Et dobbeltklik sender én gang.
// Hver valgt fil får et emne (de samme som i Dokumenter og anmodningen; standard er Andet), som følger filen.
//
// Props: getContainer (portalens rod: dialogen lægges dér, så forhåndsvisningens spærre ser dens knapper).
// Emits: close (dialogen er lukket; efter lukke-animationen).
// Dialogen lukker sig selv (Annullér, Esc, lukkeknappen, Send), så antdv kan give fokus tilbage til
// knappen, der åbnede den; portalen fjerner den først, når den er lukket.
import { nextTick, ref, shallowRef, watch } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csShortDate } from '@/domain/customer'
import { ncFill } from '@/domain/new_case_portal'
import { useCase } from '@/composables/useCaseVersion'
import { dialogBodyStyle } from '@/components/common/dialogBody'
import PortalFilePicker from './PortalFilePicker.vue'

defineProps({
  getContainer: { type: Function, default: undefined },
})
const emit = defineEmits(['close'])

const open = ref(true)
const staged = shallowRef([])
let sending = false
const adv = 'EIFO'   // kunden skriver til og hører fra EIFO; rådgiverens navn står kun på kontaktkortet
const loose = useCase(() => CW.allUploads().filter(f => !f.itemId && f.by === 'kunde'))
// Emnet pr. fil (fil-id -> dansk etiket); Øvrigt vises som Andet
const cats = ref({})
const catOptions = CW.MATERIAL_CATS.map(c => c.label).concat(['Øvrigt']).map(c => ({ value: c, label: c === 'Øvrigt' ? t('Andet') : t(c) }))
const catOf = (f) => cats.value[f.id] || 'Øvrigt'
const wrapProps = { 'aria-modal': 'true', 'aria-labelledby': 'cwp-o-title' }

// En fjernet fil tager sin "Fjern"-knap med sig, og fokus falder ud på siden. Før tog dialogen stadig
// Esc og Tab (dokumentets lytter); antdv's dialog tager kun tasterne, når fokus er inde i den, så fokus
// går til dialogens titel.
function keepFocus () {
  nextTick(() => {
    if (open.value && (!document.activeElement || document.activeElement === document.body)) CW.focusSoon('#cwp-o-title')
  })
}
watch(() => staged.value.length, (n, o) => { if (n < o) keepFocus() }, { flush: 'post' })

function send () {
  if (!staged.value.length || sending) return
  sending = true
  CW.addLooseUploads(staged.value.map(f => ({ ...f, cat: catOf(f) })))
  CW.toast(ncFill(staged.value.length === 1 ? t('1 fil sendt til {navn}') : t('{n} filer sendt til {navn}'), { n: staged.value.length, navn: adv }))
  open.value = false
}
function remove (f) {
  CW.confirm({ title: ncFill(t('Fjern {navn}?'), { navn: f.name }), text: t('EIFO har allerede fået filen og kan se i sagens historik, at I har fjernet den.'), confirmLabel: t('Fjern filen'), danger: true })
    .then(r => { if (r.ok) { CW.removeLooseUpload(f.id); CW.toast(ncFill(t('{navn} er fjernet'), { navn: f.name })); keepFocus() } })
}
</script>

<template>
  <a-modal
    :visible="open"
    :width="572"
    centered
    destroy-on-close
    :mask-closable="false"
    :get-container="getContainer"
    :wrap-props="wrapProps"
    :body-style="dialogBodyStyle"
    :after-close="() => emit('close')"
    @cancel="open = false"
  >
    <template #title>
      <span id="cwp-o-title">{{ t('Send en anden fil') }}</span>
    </template>
    <a-typography-paragraph type="secondary">
      {{ ncFill(t('Til filer, der ikke hører til et af punkterne. {adv} får dem med det samme.'), { adv }) }}
    </a-typography-paragraph>
    <a-list
      v-if="loose.length > 0"
      class="portal-other-sent"
      size="small"
      :data-source="loose"
      row-key="id"
    >
      <template #header>
        <a-typography-text type="secondary">
          {{ t('Andre filer, I har sendt') }}
        </a-typography-text>
      </template>
      <template #renderItem="{ item: f }">
        <a-list-item>
          <div class="portal-other-file">
            <div class="portal-other-name">
              {{ f.name }}
            </div>
            <a-typography-text type="secondary">
              {{ f.sizeLabel }} - {{ t(f.cat && f.cat !== 'Øvrigt' ? f.cat : 'Andet') }} -
              <a-tooltip :title="CW.fmtWhen(f.at)">
                <span>{{ csShortDate(f.at) }}</span>
              </a-tooltip>
            </a-typography-text>
          </div>
          <template #actions>
            <a-button
              type="text"
              data-cust-act="remove"
              :aria-label="ncFill(t('Fjern {navn}'), { navn: f.name })"
              @click="remove(f)"
            >
              {{ t('Fjern') }}
            </a-button>
          </template>
        </a-list-item>
      </template>
    </a-list>
    <PortalFilePicker v-model:staged="staged">
      <template #file="{ file }">
        <a-select
          :value="catOf(file)"
          :options="catOptions"
          size="small"
          class="portal-other-cat"
          :aria-label="ncFill(t('Emne for {navn}'), { navn: file.name })"
          @update:value="(v) => { cats = { ...cats, [file.id]: v } }"
        />
      </template>
    </PortalFilePicker>
    <template #footer>
      <a-button @click="open = false">
        {{ t('Annullér') }}
      </a-button>
      <a-button
        type="primary"
        data-cust-act="send"
        :disabled="!staged.length"
        @click="send"
      >
        {{ ncFill(t('Send til {name}'), { name: adv }) }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped>
.portal-other-sent {
  margin-bottom: 16px;
}

.portal-other-file {
  min-width: 0;
}

/* Lange filnavne brydes, så listen ikke bliver bredere end dialogen */
.portal-other-cat {
  display: block;
  min-width: 200px;
  margin-top: 6px;
}

.portal-other-name {
  word-break: break-all;
}
</style>
