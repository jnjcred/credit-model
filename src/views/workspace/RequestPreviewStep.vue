<script setup>
// Andet trin i "Anmod om materiale" (WSMaterialModal i workspace.jsx L2134–2208): modtageren og
// svarfristen (kan rettes), om kunden skal have besked om punkter, der er fjernet, om der sendes en
// mail, og selve mailen (emne og tekst kan rettes; "Gendan standardtekst"). Alt gemmes med det samme
// i kladden (wsSetDraft), så det står der igen, hvis vinduet lukkes.
//
// Props:
//   caseData  sagen (wsCaseData), som kladden gemmes for
//   request   den sendte anmodning (CW.request()) eller null
//   model     wsMaterialModel(caseData, request) fra src/domain/workspace/request.js
//   editRec   modtagerfelterne er åbne (v-model:edit-rec; vinduet åbner dem også ved en fejl i navn,
//             mail eller frist, når der trykkes send)
// Emits: update:editRec, copy-link (Kopiér link)
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { dateInputFormat, t } from '@/i18n'
import { useSelectEscape } from '@/composables/useSelectEscape'
import { wsFill, wsTodayIso } from '@/domain/workspace/format'
import { wsSetDraft } from '@/domain/workspace/request'
import MailComposer from './shared/MailComposer.vue'

const props = defineProps({
  caseData: { type: Object, required: true },
  request: { type: Object, default: null },
  model: { type: Object, required: true },
  editRec: { type: Boolean, default: false },
})
const emit = defineEmits(['update:editRec', 'copy-link'])

const draft = computed(() => props.model.draft)
const check = computed(() => props.model.check)
const setDraft = (patch) => wsSetDraft(patch, props.caseData)

// Svarfristen vises som andre datoer i appen (CW.fmtDate); en dato før i dag kan ikke vælges (som min før)
const beforeToday = (d) => d.format('YYYY-MM-DD') < wsTodayIso()
// En tømt frist gemmes som '' (ikke null), så kladden siger "Vælg en svarfrist." som før
const setDeadline = (v) => setDraft({ deadline: v || '' })
// Svarfristens felt. a-date-picker 3.2.13 sender hverken aria-invalid eller aria-expanded videre til
// selve inputtet og lader Esc i den åbne kalender boble videre, så hele vinduet lukker (prototypens
// felt var en native datovælger med aria-invalid, hvor Esc kun lukkede kalenderen). Derfor sættes de
// to attributter på inputtet her (skabelon-ref på elementet rundt om), og useSelectEscape stopper Esc
// ved feltet, mens kalenderen er åben (den læser aria-expanded).
const dateOpen = ref(false)
const dateEsc = useSelectEscape()
const dateBox = ref(null)
function syncDateAria () {
  const input = dateBox.value && dateBox.value.querySelector('input')
  if (!input) return
  if (check.value.past) input.setAttribute('aria-invalid', 'true')
  else input.removeAttribute('aria-invalid')
  input.setAttribute('aria-expanded', dateOpen.value ? 'true' : 'false')
}
watch([dateOpen, () => check.value.past, () => props.editRec], () => nextTick(syncDateAria), { flush: 'post' })
onMounted(syncDateAria)

const deadlineLine = computed(() => {
  const d = draft.value
  return wsFill(t('Svarfrist {date}'), { date: props.model.deadlineText }) +
    (d.deadline && d.deadline === props.model.cd ? ', ' + t('samme som sagens frist') : '') +
    (check.value.warning ? '. ' + check.value.warning : '')
})
const removedNames = computed(() => props.model.removedItems.map(it => t(it.label)).join(', '))
</script>

<template>
  <div class="ws-req-preview">
    <a-card size="small">
      <a-row
        v-if="!editRec"
        :gutter="12"
        :wrap="false"
        align="top"
      >
        <a-col flex="auto">
          <div>
            <a-typography-text type="secondary">
              {{ t('Til') }}
            </a-typography-text>
            {{ ' ' }}<a-typography-text strong>
              {{ draft.name }}
            </a-typography-text>{{ draft.role ? ', ' + draft.role : '' }} - {{ draft.email }}
          </div>
          <!-- En frist i fortiden eller efter sagens frist: teksten står i normal farve med et gult
               advarselsikon foran (advarselsfarven er for lys til tekst) -->
          <div v-if="check.past || check.warning">
            <a-typography-text type="warning">
              <ExclamationCircleOutlined aria-hidden="true" />
            </a-typography-text>
            {{ deadlineLine }}
          </div>
          <a-typography-text
            v-else
            type="secondary"
          >
            {{ deadlineLine }}
          </a-typography-text>
        </a-col>
        <a-col flex="none">
          <a-button
            type="text"
            size="small"
            @click="emit('update:editRec', true)"
          >
            {{ t('Rediger') }}
          </a-button>
        </a-col>
      </a-row>
      <template v-else>
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col
              :xs="24"
              :sm="12"
              :md="8"
            >
              <a-form-item
                :label="t('Modtagernavn')"
                html-for="ws-req-name"
              >
                <a-input
                  id="ws-req-name"
                  :value="draft.name"
                  @update:value="(v) => setDraft({ name: v })"
                />
              </a-form-item>
            </a-col>
            <a-col
              :xs="24"
              :sm="12"
              :md="8"
            >
              <a-form-item
                :label="t('Rolle')"
                html-for="ws-req-role"
              >
                <a-input
                  id="ws-req-role"
                  :value="draft.role"
                  @update:value="(v) => setDraft({ role: v })"
                />
              </a-form-item>
            </a-col>
            <a-col
              :xs="24"
              :sm="12"
              :md="8"
            >
              <a-form-item
                :label="t('Mail')"
                html-for="ws-req-email"
              >
                <a-input
                  id="ws-req-email"
                  type="email"
                  :value="draft.email"
                  @update:value="(v) => setDraft({ email: v })"
                />
              </a-form-item>
            </a-col>
            <a-col
              :xs="24"
              :sm="12"
              :md="8"
            >
              <a-form-item
                :label="t('Svarfrist')"
                html-for="ws-req-deadline"
                :validate-status="check.past ? 'error' : undefined"
              >
                <div
                  ref="dateBox"
                  @keydown.capture="dateEsc.onKeydownCapture"
                  @keydown="dateEsc.onKeydown"
                >
                  <a-date-picker
                    id="ws-req-deadline"
                    :value="draft.deadline || undefined"
                    value-format="YYYY-MM-DD"
                    :format="dateInputFormat"
                    :disabled-date="beforeToday"
                    @update:value="setDeadline"
                    @open-change="(o) => { dateOpen = o }"
                  />
                </div>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
        <a-row
          justify="space-between"
          align="middle"
          :gutter="12"
          :wrap="false"
        >
          <a-col flex="auto">
            <a-typography-text type="secondary">
              {{ wsFill(t('Linket er personligt til {name} og udløber efter 30 dage.'), { name: draft.name || t('modtageren') }) }}
            </a-typography-text>
          </a-col>
          <a-col flex="none">
            <a-button
              type="text"
              size="small"
              @click="emit('update:editRec', false)"
            >
              {{ t('Færdig') }}
            </a-button>
          </a-col>
        </a-row>
      </template>
    </a-card>

    <!-- Fjernede punkter: kunden kan få besked om, at de ikke skal sendes (rådgiveren vælger) -->
    <a-checkbox
      v-if="model.removedItems.length > 0"
      :checked="model.notifyRemoved"
      @change="(e) => setDraft({ notifyRemoved: e.target.checked, body: null })"
    >
      {{ wsFill(t('Fortæl kunden, at de ikke skal sende: {items}'), { items: removedNames }) }}<br>
      <a-typography-text type="secondary">
        {{ model.mailItems.length === 0 && !model.notifyRemoved
          ? t('Der sendes ingen mail. Kundens side viser stadig ændringen.')
          : t('Slå fra, hvis du allerede har sagt det til kunden, eller vil nævne det i en anden mail. Kundens side viser stadig ændringen.') }}
      </a-typography-text>
    </a-checkbox>

    <!-- Rådgiveren kan altid lade være med at sende mailen (f.eks. fordi de selv ringer til kunden) -->
    <a-checkbox
      v-if="model.hasMail"
      id="ws-req-sendmail"
      :checked="model.wantMail"
      @change="(e) => setDraft({ sendMail: e.target.checked })"
    >
      {{ wsFill(t('Send en mail til {name} ({email})'), { name: draft.name || t('kunden'), email: draft.email || '' }) }}
    </a-checkbox>

    <a-alert
      v-if="model.hasMail && !model.wantMail"
      type="info"
    >
      <template #message>
        <template v-if="request">
          {{ t('Der sendes ingen mail. Kundens side viser ændringen, næste gang kunden logger ind.') }}
        </template>
        <template v-else>
          {{ t('Der sendes ingen mail. Kunden ser først anmodningen, når du selv giver dem linket:') }}
          <a-typography-text strong>
            {{ model.reqLink }}
          </a-typography-text>{{ ' ' }}<a-button
            type="text"
            size="small"
            @click="emit('copy-link')"
          >
            {{ t('Kopiér link') }}
          </a-button>
        </template>
      </template>
    </a-alert>

    <MailComposer
      v-if="model.showMail"
      :subject="model.subject"
      :body="model.body"
      :is-default="draft.body == null"
      :rows="16"
      subject-id="ws-req-subject"
      :note="wsFill(t('Mailen sendes præcis som vist. Linket er personligt for {name}.'), { name: draft.name || t('modtageren') })"
      @update:subject="(v) => setDraft({ subject: v })"
      @update:body="(v) => setDraft({ body: v })"
      @reset="setDraft({ body: null, subject: null })"
    />
  </div>
</template>

<style scoped>
.ws-req-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
