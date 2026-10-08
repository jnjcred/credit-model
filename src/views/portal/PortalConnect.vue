<script setup>
// Punktet Periodetal i kundens portal (new_case_portal.jsx: PortalConnect, L2125–2225): forbind
// regnskabssystemet (aftalen, datadelingen og valget af system ligger i ErpSetup, samme kort som i
// opstarten), eller upload en saldobalance selv. Er der forbundet, står forbindelsen med "Træk adgangen
// tilbage"; er tallene hentet, og adgangen trukket tilbage, står det.
//
// Props: item (punktet).
// Emits: back (tilbage til oversigten), finish(files, note) (kunden er færdig; portalen gemmer),
//        noted (formularen "Har vi ikke" er sendt).
// Kladden (de valgte filer) gemmes ved hver ændring (usePortalDraft). "Forbind regnskabssystem"
// (data-cust-act="erp") og "Træk adgangen tilbage" (data-cust-act="consent") stoppes i rådgiverens
// forhåndsvisning; "Færdig med dette punkt" (data-pv-allow) virker, som før.
import { computed, ref, shallowRef } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csDraft, csHHMM, csShortDate } from '@/domain/customer'
import { ncFill, portalConsentUntil, portalRevoke } from '@/domain/new_case_portal'
import { useCase } from '@/composables/useCaseVersion'
import { usePortalDraft } from './usePortalDraft'
import PortalBackNav from './components/PortalBackNav.vue'
import PortalItemHead from './components/PortalItemHead.vue'
import PortalNotedToggle from './components/PortalNotedToggle.vue'
import PortalSentFiles from './components/PortalSentFiles.vue'
import PortalPvUploadNote from './components/PortalPvUploadNote.vue'
import PortalFilePicker from './components/PortalFilePicker.vue'
import ErpSetup from './onboarding/ErpSetup.vue'

const props = defineProps({
  item: { type: Object, required: true },
})
const emit = defineEmits(['back', 'finish', 'noted'])

const setup = ref(false)
const d0 = csDraft(props.item.id)
const staged = shallowRef(d0 && d0.files ? d0.files : [])
const notedOpen = ref(false)
const connDraftAt = usePortalDraft(props.item.id, () => ({ files: staged.value }))
const consent = useCase(() => CW.consent())
const ob = useCase(() => CW.onboarding())
const s = useCase(() => CW.itemState(props.item.id))
// Afvist, eller afvist og derefter sendt til en hjælper: de gamle filer gælder ikke længere
const rejected = computed(() => !!s.value && s.value.status === 'delegated' && !!s.value.reviewedAt)
const existing = computed(() => (s.value && !rejected.value ? (s.value.files || []) : []))
const fromSystem = computed(() => !!(s.value && s.value.noteKind === 'system' && !rejected.value))
const revoke = () => portalRevoke(consent.value)
// Spørgsmål fra rådgiveren: et svar alene kan sendes (se PortalUpload)
const asked = computed(() => !!s.value && s.value.status === 'rejected')
const answer = ref('')
const canSend = computed(() => staged.value.length > 0 || (asked.value && !!answer.value.trim()))
const answerOnly = computed(() => asked.value && staged.value.length === 0)
const total = computed(() => existing.value.length + staged.value.length)
const canNote = computed(() => existing.value.length === 0 && (!s.value || s.value.status !== 'noted'))
const waiting = computed(() => ob.value.erp && ob.value.erp.waiting)
const sentSelf = computed(() => ob.value.agreement && ob.value.agreement.declined)
const connectText = computed(() => (waiting.value ? t('I ventede på jeres revisor. Har I fået adgangen, kan I forbinde nu.')
  : sentSelf.value ? t('I valgte at sende tallene selv. I kan stadig forbinde, hvis det er nemmere.')
  : t('Med læseadgang henter EIFO saldobalance, periodetal og debitordata. I logger ind i jeres eget system.')))
const hint = computed(() => (asked.value ? t('Skriv et svar, eller vælg en fil') : total.value === 0 ? t('Vælg mindst én fil') : t('Vælg en fil for at sende mere')))

function openSetup () {
  setup.value = true
  CW.focusSoon('.cwp-main h1')
}
function closeSetup () {
  setup.value = false
  CW.focusSoon('.cwp-main h1')
}
function setupDone () {
  setup.value = false
  emit('back')
}
</script>

<template>
  <ErpSetup
    v-if="setup"
    :back-label="ncFill(t('Tilbage til {item}'), { item: t(item.label) })"
    @back="closeSetup"
    @done="setupDone"
  />
  <div
    v-else
    class="portal-item"
  >
    <PortalBackNav @back="emit('back')" />
    <PortalItemHead
      v-model:answer="answer"
      :item="item"
    />

    <PortalNotedToggle
      v-if="notedOpen"
      :item="item"
      open
      @update:open="(v) => { notedOpen = v }"
      @done="emit('noted')"
    />
    <template v-else>
      <a-card
        v-if="consent"
        size="small"
        role="status"
        class="portal-item-block"
      >
        <a-row
          justify="space-between"
          align="middle"
          :gutter="[12, 8]"
        >
          <a-col flex="1 1 220px">
            <div>
              <a-typography-text strong>
                {{ ncFill(t('Forbundet til {src} (kun læseadgang)'), { src: consent.system }) }}
              </a-typography-text>
            </div>
            <a-typography-text type="secondary">
              {{ portalConsentUntil(consent) }}
            </a-typography-text>
          </a-col>
          <a-col>
            <a-button
              data-cust-act="consent"
              @click="revoke"
            >
              {{ t('Træk adgangen tilbage') }}
            </a-button>
          </a-col>
        </a-row>
      </a-card>
      <a-typography-paragraph
        v-if="!consent && fromSystem"
        type="secondary"
      >
        {{ ncFill(t('Tallene blev hentet {when}, og EIFO har dem stadig. Adgangen til regnskabssystemet er trukket tilbage.'), { when: csShortDate(s.at) }) }}
      </a-typography-paragraph>
      <a-card
        v-if="!consent"
        size="small"
        class="portal-item-block"
      >
        <a-row
          justify="space-between"
          align="middle"
          :gutter="[12, 12]"
        >
          <a-col flex="1 1 220px">
            <a-typography-title :level="2">
              {{ t('Hent tallene fra jeres regnskabssystem') }}
            </a-typography-title>
            <a-typography-text type="secondary">
              {{ connectText }}
            </a-typography-text>
          </a-col>
          <a-col>
            <a-button
              type="primary"
              data-cust-act="erp"
              @click="openSetup"
            >
              {{ t('Forbind regnskabssystem') }}
            </a-button>
          </a-col>
        </a-row>
      </a-card>

      <a-divider plain>
        {{ consent || fromSystem ? t('supplér eventuelt') : t('eller') }}
      </a-divider>

      <a-typography-title :level="2">
        {{ t('Upload en saldobalance selv') }}
      </a-typography-title>
      <PortalSentFiles
        :item="item"
        :files="existing"
      />
      <PortalPvUploadNote />
      <PortalFilePicker
        v-model:staged="staged"
        :item-id="item.id"
        accept=".xlsx,.xls,.csv,.pdf"
        :title="t('Træk saldobalancen hertil, eller vælg filen')"
        :hint="t('Excel, CSV eller PDF · eksportér den fra jeres bogføringssystem')"
      />
      <div class="portal-item-foot">
        <PortalNotedToggle
          v-if="canNote"
          :item="item"
          :open="false"
          @update:open="(v) => { notedOpen = v }"
          @done="emit('noted')"
        />
        <span v-else />
        <a-space
          wrap
          class="portal-item-send"
        >
          <a-typography-text
            v-if="connDraftAt"
            type="secondary"
            class="cwp-draft-at"
          >
            {{ ncFill(t('Kladde gemt kl. {tid}'), { tid: csHHMM(connDraftAt) }) }}
          </a-typography-text>
          <a-typography-text
            v-if="!canSend"
            id="cwp-conn-hint"
            type="secondary"
          >
            {{ hint }}
          </a-typography-text>
          <a-button
            type="primary"
            data-cust-act="send"
            data-pv-allow="1"
            :disabled="!canSend"
            :aria-describedby="!canSend ? 'cwp-conn-hint' : undefined"
            @click="emit('finish', staged, asked ? answer.trim() : undefined)"
          >
            {{ answerOnly ? t('Send svar') : t('Færdig med dette punkt') }}
          </a-button>
        </a-space>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Punktets spalte, som før */
.portal-item {
  max-width: 640px;
  margin: 0 auto;
}

.portal-item-block {
  margin-bottom: 16px;
}

/* "Har vi ikke" til venstre, kladde, forklaring og knap til højre; under hinanden på smalle skærme */
.portal-item-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.portal-item-send {
  justify-content: flex-end;
  margin-left: auto;
}
</style>
