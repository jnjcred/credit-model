<script setup>
// Punktet Periodetal i kundens portal (new_case_portal.jsx: PortalConnect, L2125–2225): forbind
// regnskabsprogrammet (fliserne og listen i ErpConnectPicker, som i Crediwire i dag), eller upload en
// saldobalance selv. Er der forbundet, står forbindelsen med "Træk adgangen
// tilbage"; er tallene hentet, og adgangen trukket tilbage, står det.
//
// Props: item (punktet).
// Emits: back (tilbage til oversigten), finish(files, note) (kunden er færdig; portalen gemmer),
//        noted (formularen "Har vi ikke" er sendt).
// Kladden (de valgte filer) gemmes ved hver ændring (usePortalDraft). "Forbind regnskabssystem"
// (data-cust-act="erp") og "Træk adgangen tilbage" (data-cust-act="consent") stoppes i rådgiverens
// forhåndsvisning; "Færdig med dette punkt" (data-pv-allow) virker, som før.
import { computed, ref, shallowRef } from 'vue'
import { CheckCircleFilled } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csDraft, csHHMM, csShortDate } from '@/domain/customer'
import { ncFill } from '@/domain/new_case_portal'
import { useCase } from '@/composables/useCaseVersion'
import { usePortalDraft } from './usePortalDraft'
import PortalBackNav from './components/PortalBackNav.vue'
import PortalItemHead from './components/PortalItemHead.vue'
import PortalNotedToggle from './components/PortalNotedToggle.vue'
import PortalSentFiles from './components/PortalSentFiles.vue'
import PortalFilePicker from './components/PortalFilePicker.vue'
import PortalCommentField from './components/PortalCommentField.vue'
import ErpConnectPicker from './onboarding/ErpConnectPicker.vue'

const props = defineProps({
  item: { type: Object, required: true },
})
const emit = defineEmits(['back', 'finish', 'noted'])

const d0 = csDraft(props.item.id)
const staged = shallowRef(d0 && d0.files ? d0.files : [])
const notedOpen = ref(false)
const connDraftAt = usePortalDraft(props.item.id, () => ({ files: staged.value }))
const consent = useCase(() => CW.consent())
const s = useCase(() => CW.itemState(props.item.id))
// Afvist, eller afvist og derefter sendt til en hjælper: de gamle filer gælder ikke længere
const rejected = computed(() => !!s.value && s.value.status === 'delegated' && !!s.value.reviewedAt)
const existing = computed(() => (s.value && !rejected.value ? (s.value.files || []) : []))
const fromSystem = computed(() => !!(s.value && s.value.noteKind === 'system' && !rejected.value))
// Spørgsmål fra rådgiveren: et svar alene kan sendes (se PortalUpload)
const asked = computed(() => !!s.value && s.value.status === 'rejected')
const answer = ref('')
// Kundens to kommentarfelter til EIFO, hver for sig: det øverste følger med regnskabsprogrammet (sendes som besked,
// når det er forbundet), det nederste med saldobalancen. Sendes filerne, går begge med, hvis de er udfyldt.
const commentConn = ref('')
const commentFile = ref('')
const noteText = () => [commentConn.value, commentFile.value].map(x => x.trim()).filter(Boolean).join('\n\n') || undefined
function onConnected () {
  const c = commentConn.value.trim()
  if (c) CW.sendMessage('kunde', c, props.item.id)
  emit('back')
}
// Er regnskabsprogrammet forbundet, er der intet at uploade, og "Send" er altid klar
const canSend = computed(() => !!consent.value || staged.value.length > 0 || (asked.value && !!answer.value.trim()))
const total = computed(() => existing.value.length + staged.value.length)
const canNote = computed(() => existing.value.length === 0 && (!s.value || s.value.status !== 'noted'))
const hint = computed(() => (asked.value ? t('Skriv et svar, eller vælg en fil') : total.value === 0 ? t('Vælg mindst én fil') : t('Vælg en fil for at sende mere')))

</script>

<template>
  <div class="portal-item">
    <PortalBackNav @back="emit('back')" />
    <!-- Punktets indhold i et kort; tilbage-knappen står over det -->
    <a-card :bordered="false">
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
        <!-- Samme grønne boks som "Du er logget ind" med flueben: forbindelsen er på plads -->
        <a-alert
          v-if="consent"
          class="portal-item-block"
          type="success"
          role="status"
          show-icon
        >
          <template #icon>
            <CheckCircleFilled aria-hidden="true" />
          </template>
          <template #message>
            <a-typography-text strong>
              {{ ncFill(t('Forbundet til {src}'), { src: consent.system }) }}
            </a-typography-text>
          </template>
          <template #description>
            {{ t('Forbindelsen er aktiv.') }}
          </template>
        </a-alert>
        <a-typography-paragraph
          v-if="!consent && fromSystem"
          type="secondary"
        >
          {{ ncFill(t('Tallene blev hentet {when}, og EIFO har dem stadig. Adgangen til regnskabssystemet er trukket tilbage.'), { when: csShortDate(s.at) }) }}
        </a-typography-paragraph>
        <ErpConnectPicker
          v-if="!consent"
          class="portal-item-block portal-item-pick"
          @finished="onConnected"
        />
        <!-- Bemærkningen efter regnskabsprogrammet: den gælder både forbindelsen og saldobalancen -->
        <PortalCommentField
          v-if="!asked"
          v-model:value="commentConn"
        />

        <!-- Er regnskabsprogrammet forbundet, er tallene hentet, og der er intet mere at uploade: kun en bemærkning -->
        <template v-if="!consent">
          <a-divider plain>
            {{ fromSystem ? t('supplér eventuelt') : t('eller') }}
          </a-divider>

          <a-typography-title :level="2">
            {{ t('Upload en saldobalance') }}
          </a-typography-title>
          <PortalSentFiles
            :item="item"
            :files="existing"
          />
          <PortalFilePicker
            v-model:staged="staged"
            :item-id="item.id"
            accept=".xlsx,.xls,.csv,.pdf"
            :title="t('Træk saldobalancen hertil, eller vælg filen')"
            :hint="t('Excel, CSV eller PDF - eksportér den fra jeres bogføringssystem')"
          />
          <!-- Til sidst ved saldobalancen: sin egen bemærkning -->
          <PortalCommentField
            v-if="!asked"
            v-model:value="commentFile"
            field-id="cwp-comment-file"
            :hint="t('Følger med, uanset om I forbinder regnskabsprogrammet eller sender en fil.')"
          />
        </template>
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
              @click="emit('finish', staged, asked ? answer.trim() : noteText())"
            >
              {{ consent ? t('Afslut') : t('Send') }}
            </a-button>
          </a-space>
        </div>
      </template>
    </a-card>
  </div>
</template>

<style scoped>
/* Punktets spalte: indholdet er 640 px bredt som før, plus kortets 24 px på hver side */
.portal-item {
  max-width: 688px;
  margin: 0 auto;
}

/* Valget af regnskabsprogram står med luft under kommentarfeltet */
.portal-item-pick {
  margin-top: 24px;
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
