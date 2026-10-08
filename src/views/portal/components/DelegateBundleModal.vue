<script setup>
// "Få hjælp fra revisor eller bank" (new_case_portal.jsx: DelegateBundleModal, L2336–2474), i to trin:
// formularen (hvem skal hjælpe, hvilke punkter, navn og mail, beskeden foldet) og "Tjek før I sender"
// med én sætning. For en revisor er regnskabspunkterne valgt på forhånd, indtil kunden selv har rørt
// listen. "Næste" viser én fejl ad gangen (punkter, navn, mail) og flytter fokus til feltet.
// Beskeden kan rettes, men gemmes ikke (som før).
//
// Props: requested (punkterne i anmodningen), getContainer (portalens rod).
// Emits: send(ids, contact, kind) (portalen sender til hjælperen), close (dialogen er lukket; efter
//        lukke-animationen).
// Dialogen lukker sig selv (Annullér, Esc, lukkeknappen, Send), så antdv kan give fokus tilbage til
// knappen, der åbnede den. Et dobbeltklik på "Send" sender én gang.
// Revisor/Bank er én radiogruppe (ét tabulatorstop; piletasterne skifter og flytter fokus), som før.
// Fokus ved skift af trin: den primære knap er den samme i begge trin, så fokus bliver på den, når
// "Næste" bliver til "Send til revisor" (som før). Forsvinder det, der havde fokus, går fokus til
// titlen (se watch(step)).
// Ikke porteret: preselect (portalen gav altid null).
import { computed, ref, watch } from 'vue'
import { ArrowRightOutlined, LeftOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { NC_EMAIL_RE, PORTAL_CONTACT, ncFill, ncFirstName, portalRecipient, portalStatus } from '@/domain/new_case_portal'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import { dialogBodyStyle } from '@/components/common/dialogBody'

const props = defineProps({
  requested: { type: Array, required: true },
  getContainer: { type: Function, default: undefined },
})
const emit = defineEmits(['send', 'close'])

const open = ref(true)
// Punkterne, der kan få hjælp, ligger fast, mens dialogen er åben (som før)
const eligible = props.requested.filter(it => ['pending', 'rejected', 'delegated'].includes(portalStatus(it.id)))
// En revisor hjælper typisk med regnskabstallene; resten vælger kunden selv til
const TYPICAL = ['m-annual', 'm-interim', 'm-budget']
const initialFor = (kind) => (kind === 'accountant' ? eligible.filter(it => TYPICAL.includes(it.id)).map(it => it.id) : [])
const kind = ref('accountant')
const selected = ref(initialFor('accountant'))
const selTouched = ref(false)
const name = ref('')
const email = ref('')
const msg = ref('')
const msgTouched = ref(false)
const step = ref('form')
const tried = ref(false)
const msgFold = ref([])
let sent = false // dobbeltklik på "Send" må ikke sende to gange
const onCollapseKeydown = useCollapseKeyboard()

const sender = ncFirstName(portalRecipient().name)
const helperFirst = computed(() => ncFirstName(name.value))
// Har rådgiveren afvist et punkt med en note, skal hjælperen også vide, hvad hun bad om
const notes = computed(() => eligible.filter(it => selected.value.includes(it.id)).map(it => ({ it, note: (CW.itemState(it.id) || {}).reviewNote || '' })).filter(x => x.note))
const notesText = computed(() => (notes.value.length ? '\n\n' + ncFill(t('{adv} fra EIFO har bedt om:'), { adv: PORTAL_CONTACT.name }) + '\n' + notes.value.map(x => '- ' + t(x.it.label) + ': ' + x.note).join('\n') : ''))
const defaultMsg = computed(() => (helperFirst.value ? ncFill(t('Hej {name},'), { name: helperFirst.value }) : t('Hej,')) + '\n\n'
  + t('Vil du hjælpe os med at sende punkterne nedenfor til EIFO? Det er til vores ansøgning. Du får et link, hvor du kan uploade dem direkte.')
  + notesText.value + '\n\n'
  + ncFill(t('Venlig hilsen\n{sender}\n{company}'), { sender, company: DATA.COMPANY.name }))
const message = computed(() => (msgTouched.value ? msg.value : defaultMsg.value))

const switchKind = (k) => { kind.value = k; if (!selTouched.value) selected.value = initialFor(k) }
const toggle = (id) => { selTouched.value = true; selected.value = selected.value.includes(id) ? selected.value.filter(x => x !== id) : [...selected.value, id] }
const emailOk = computed(() => NC_EMAIL_RE.test(email.value.trim()))
const err = computed(() => (!selected.value.length ? 'items' : !name.value.trim() ? 'name' : !emailOk.value ? 'email' : null))
const FIELD = { items: 'cwp-h-item-' + (eligible[0] && eligible[0].id), name: 'cwp-h-name', email: 'cwp-h-email' }
const label = computed(() => (kind.value === 'bank' ? t('banken') : t('revisoren')))
// Hjælperens link følger kundens frist (ellers 14 dage)
const reqDeadline = (CW.request() || {}).deadline
const expires = reqDeadline ? CW.fmtDate(reqDeadline + 'T12:00:00') : CW.fmtDate(new Date(Date.now() + 14 * 864e5))
const preselected = computed(() => kind.value === 'accountant' && !selTouched.value && selected.value.length > 0)
const chosen = computed(() => eligible.filter(it => selected.value.includes(it.id)))
const showErr = (k) => tried.value && err.value === k
const FULL = { span: 24 }
const wrapProps = { 'aria-modal': 'true', 'aria-labelledby': 'cwp-h-title' }

function next () {
  tried.value = true
  if (err.value) { CW.focusSoon('#' + FIELD[err.value]); return }
  step.value = 'confirm'
}
// Stod fokus på noget, der forsvinder med trinnet ("Tilbage", eller et felt i formularen, fx når
// browseren ikke giver knappen fokus ved klik), falder fokus ud på siden. Før tog dialogen stadig Esc og
// Tab (dokumentets lytter); antdv's dialog tager kun tasterne, når fokus er inde i den, så fokus går
// til dialogens titel, hvorfra Tab fortsætter i dialogen.
watch(step, () => {
  const a = document.activeElement
  if (!a || a === document.body) CW.focusSoon('#cwp-h-title')
}, { flush: 'post' })
function send () {
  if (sent) return
  sent = true
  emit('send', selected.value, { name: name.value.trim(), email: email.value.trim() }, kind.value)
  open.value = false
}
function onMsg (v) {
  msg.value = v
  msgTouched.value = true
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
      <span id="cwp-h-title">{{ step === 'form' ? t('Få hjælp fra revisor eller bank') : t('Tjek før I sender') }}</span>
    </template>
    <a-typography-paragraph type="secondary">
      {{ ncFill(t('{who} får et link, der kun gælder de valgte punkter'), { who: kind === 'bank' ? t('Banken') : t('Revisoren') }) }}
    </a-typography-paragraph>

    <template v-if="step === 'form'">
      <a-form-item
        :label-col="FULL"
        :colon="false"
      >
        <template #label>
          <span id="cwp-h-kind">{{ t('Hvem skal hjælpe?') }}</span>
        </template>
        <a-radio-group
          :value="kind"
          name="cwp-h-kind"
          role="radiogroup"
          aria-labelledby="cwp-h-kind"
          option-type="button"
          button-style="solid"
          @change="(e) => switchKind(e.target.value)"
        >
          <a-radio-button
            id="cwp-h-kind-accountant"
            value="accountant"
          >
            {{ t('Revisor') }}
          </a-radio-button>
          <a-radio-button
            id="cwp-h-kind-bank"
            value="bank"
          >
            {{ t('Bank') }}
          </a-radio-button>
        </a-radio-group>
      </a-form-item>

      <a-form-item
        :label-col="FULL"
        :colon="false"
        :validate-status="showErr('items') ? 'error' : ''"
      >
        <template #label>
          <span id="cwp-h-items-label">{{ t('Vælg punkter') }} {{ label }} {{ t('skal hjælpe med') }}</span>
        </template>
        <div
          role="group"
          aria-labelledby="cwp-h-items-label"
          :aria-describedby="showErr('items') ? 'cwp-h-items-err' : 'cwp-h-items-hint'"
        >
          <a-list
            bordered
            size="small"
            :data-source="eligible"
            row-key="id"
            :locale="{ emptyText: t('Ingen åbne punkter at delegere') }"
          >
            <template #renderItem="{ item: x }">
              <a-list-item>
                <a-checkbox
                  :id="'cwp-h-item-' + x.id"
                  :checked="selected.includes(x.id)"
                  @change="toggle(x.id)"
                >
                  {{ t(x.label) }}
                </a-checkbox>
                <template
                  v-if="portalStatus(x.id) === 'delegated'"
                  #actions
                >
                  <a-typography-text type="secondary">
                    {{ t('Afventer allerede') }}
                  </a-typography-text>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </div>
        <template
          v-if="showErr('items')"
          #help
        >
          <span id="cwp-h-items-err">{{ t('Vælg mindst ét punkt.') }}</span>
        </template>
        <template #extra>
          <span id="cwp-h-items-hint">{{ preselected ? t('Forvalgt: de regnskabspunkter, en revisor typisk hjælper med. Ejerforhold og aftaler bør I selv sende.') : kind === 'accountant' ? t('Vælg de punkter, revisoren skal hjælpe med. Ejerforhold og aftaler bør I selv sende.') : t('Vælg kun de punkter, banken skal hjælpe med.') }}</span>
        </template>
      </a-form-item>

      <a-row :gutter="12">
        <a-col
          :xs="24"
          :sm="12"
        >
          <a-form-item
            :label="t('Navn')"
            html-for="cwp-h-name"
            :label-col="FULL"
            :colon="false"
            :validate-status="showErr('name') ? 'error' : ''"
          >
            <a-input
              id="cwp-h-name"
              v-model:value="name"
              :placeholder="kind === 'bank' ? t('Jeres kontaktperson i banken') : t('Jeres revisor')"
              :aria-invalid="showErr('name') ? 'true' : undefined"
              :aria-describedby="showErr('name') ? 'cwp-h-name-err' : undefined"
            />
            <template
              v-if="showErr('name')"
              #help
            >
              <span id="cwp-h-name-err">{{ t('Skriv et navn.') }}</span>
            </template>
          </a-form-item>
        </a-col>
        <a-col
          :xs="24"
          :sm="12"
        >
          <a-form-item
            :label="t('Email')"
            html-for="cwp-h-email"
            :label-col="FULL"
            :colon="false"
            :validate-status="showErr('email') ? 'error' : ''"
          >
            <a-input
              id="cwp-h-email"
              v-model:value="email"
              type="email"
              :placeholder="t('navn@firma.dk')"
              :aria-invalid="showErr('email') ? 'true' : undefined"
              :aria-describedby="showErr('email') ? 'cwp-h-email-err' : undefined"
            />
            <template
              v-if="showErr('email')"
              #help
            >
              <span id="cwp-h-email-err">{{ email.trim() ? t('Mailadressen ser ikke rigtig ud.') : t('Skriv en mailadresse.') }}</span>
            </template>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- Beskeden er foldet. Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter) -->
      <div @keydown="onCollapseKeydown">
        <a-collapse
          v-model:active-key="msgFold"
          ghost
          destroy-inactive-panel
          :expand-icon="collapseExpandIcon"
        >
          <a-collapse-panel
            id="cwp-h-msg-fold"
            key="msg"
            :header="t('Ret beskeden (valgfrit)')"
          >
            <label
              for="cwp-h-msg"
              class="sr-only"
            >{{ t('Besked til') }} {{ label }}</label>
            <a-textarea
              id="cwp-h-msg"
              :value="message"
              :rows="6"
              @update:value="onMsg"
            />
          </a-collapse-panel>
        </a-collapse>
      </div>
    </template>
    <a-typography-paragraph v-else>
      {{ ncFill(t('{name} ({email}) får et link til {items}. Linket udløber {date}, og {first} ser ikke resten af ansøgningen.'), { name: name.trim(), email: email.trim(), items: chosen.map(it => t(it.label)).join(', '), date: expires, first: ncFirstName(name) || name.trim() }) }}
    </a-typography-paragraph>

    <template #footer>
      <div class="portal-bundle-foot">
        <a-button
          v-if="step === 'confirm'"
          @click="step = 'form'"
        >
          <template #icon>
            <LeftOutlined aria-hidden="true" />
          </template>
          {{ t('Tilbage') }}
        </a-button>
        <a-space class="portal-bundle-acts">
          <a-button @click="open = false">
            {{ t('Annullér') }}
          </a-button>
          <!-- Én knap til begge trin (som før): fokus bliver på den, når "Næste" bliver til "Send" -->
          <a-button
            type="primary"
            @click="step === 'form' ? next() : send()"
          >
            <template v-if="step === 'form'">
              {{ t('Næste') }} <ArrowRightOutlined aria-hidden="true" />
            </template>
            <template v-else>
              {{ kind === 'bank' ? t('Send til bank') : t('Send til revisor') }}
            </template>
          </a-button>
        </a-space>
      </div>
    </template>
  </a-modal>
</template>

<style scoped>
/* "Tilbage" til venstre, Annullér og den primære knap til højre */
.portal-bundle-foot {
  display: flex;
  gap: 8px;
  align-items: center;
}

.portal-bundle-acts {
  margin-left: auto;
}
</style>
