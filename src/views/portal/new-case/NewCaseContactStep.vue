<script setup>
// Ny sag, trin 3 "Kontakt og svarfrist" (new_case_portal.jsx L456-521): kontaktpersonen hos
// kunden, kundens svarfrist og en forhåndsvisning af mailen. Sagen oprettes som kladde; der
// sendes ikke noget til kunden endnu.
//
// Props: contact ({ name, role, email }), deadline (yyyy-mm-dd; '' når feltet er tomt),
//        error ('email' | 'deadline' | 'deadlinePast', når "Opret sag" er forsøgt; ellers null),
//        mail (CW.requestMail-resultatet eller null), to ({ name, email }), companyName, caseNr, link.
// Emits: update:contact, update:deadline (v-model).
//
// Svarfristen er en a-date-picker (dayjs; sprog fra App.vue's a-config-provider) med værdien som
// 'YYYY-MM-DD', som før; datoen vises som i resten af appen (dateInputFormat). Dage før i dag kan
// hverken vælges eller skrives; i dag og frem kan. Det er valideringens egen regel (CW.isPast, som
// guiden bruger ved "Opret sag"), så feltet tager imod præcis de datoer, guiden godkender.
import { computed, onMounted, onUpdated, ref } from 'vue'
import { dateInputFormat, t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { ncFill } from '@/domain/new_case_portal'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import RequestMailPreview from './RequestMailPreview.vue'

const props = defineProps({
  contact: { type: Object, required: true },
  deadline: { type: String, default: '' },
  error: { type: String, default: null },
  mail: { type: Object, default: null },
  to: { type: Object, required: true },
  companyName: { type: String, default: '' },
  caseNr: { type: String, default: '' },
  link: { type: String, default: '' },
})
const emit = defineEmits(['update:contact', 'update:deadline'])

const invalid = (k) => props.error === k
const deadlineInvalid = computed(() => invalid('deadline') || invalid('deadlinePast'))
const setContact = (field, v) => emit('update:contact', { ...props.contact, [field]: v })
const disabledDate = (d) => CW.isPast(d.format('YYYY-MM-DD'))
const deadlineHint = computed(() => (props.deadline ? ncFill(t('{n} hverdage fra i dag'), { n: CW.workdaysBetween(new Date().toISOString(), props.deadline + 'T12:00:00') }) : ''))

// Esc i den åbne kalender lukker kun kalenderen (som datofeltet før), ikke guiden:
// ant-design-vue 3.2.13 lukker kalenderen, men lader Esc boble videre til dialogen.
const deadlineOpen = ref(false)
function onDeadlineKey (e) {
  if (e.key === 'Escape' && deadlineOpen.value) e.stopPropagation()
}
// ant-design-vue 3.2.13 sender ikke aria-* videre til datofeltets <input> (kun id). De sættes her på
// feltet i formularrækken (template-ref), så det stadig er påkrævet og peger på hint eller fejl (som før).
const deadlineItem = ref(null)
function syncDeadlineAria () {
  const root = deadlineItem.value && deadlineItem.value.$el
  const el = root && root.querySelector ? root.querySelector('#nc-deadline') : null
  if (!el) return
  el.setAttribute('aria-required', 'true')
  if (deadlineInvalid.value) el.setAttribute('aria-invalid', 'true')
  else el.removeAttribute('aria-invalid')
  el.setAttribute('aria-describedby', deadlineInvalid.value ? 'nc-deadline-err' : 'nc-deadline-hint')
}
onMounted(syncDeadlineAria)
onUpdated(syncDeadlineAria)

// ant-design-vue 3.2.13: foldens overskrift reagerer kun på Enter. Mellemrum folder også, som på knappen før.
const onFoldKeydown = useCollapseKeyboard()
</script>

<template>
  <a-form layout="vertical">
    <a-typography-paragraph type="secondary">
      {{ t('Sagen oprettes som kladde. Der sendes ikke noget til kunden endnu.') }}
    </a-typography-paragraph>
    <a-row :gutter="16">
      <a-col
        :xs="24"
        :sm="12"
      >
        <a-form-item
          :label="t('Kontaktperson hos kunden')"
          html-for="nc-name"
        >
          <a-input
            id="nc-name"
            :value="contact.name"
            :placeholder="t('Fornavn og efternavn')"
            @update:value="(v) => setContact('name', v)"
          />
        </a-form-item>
      </a-col>
      <a-col
        :xs="24"
        :sm="12"
      >
        <a-form-item
          :label="t('Rolle')"
          html-for="nc-role"
        >
          <a-input
            id="nc-role"
            :value="contact.role"
            :placeholder="t('f.eks. økonomichef')"
            @update:value="(v) => setContact('role', v)"
          />
        </a-form-item>
      </a-col>
      <a-col
        :xs="24"
        :sm="12"
      >
        <!-- Valgfri; udfyldt skal den ligne en mailadresse -->
        <a-form-item
          :label="t('Email')"
          html-for="nc-email"
          :validate-status="invalid('email') ? 'error' : ''"
        >
          <a-input
            id="nc-email"
            type="email"
            :value="contact.email"
            placeholder="navn@virksomhed.dk"
            :aria-invalid="invalid('email') ? 'true' : undefined"
            :aria-describedby="invalid('email') ? 'nc-email-err' : undefined"
            @update:value="(v) => setContact('email', v)"
          />
          <template
            v-if="invalid('email')"
            #help
          >
            <span id="nc-email-err">{{ t('Mailadressen ser ikke rigtig ud.') }}</span>
          </template>
        </a-form-item>
      </a-col>
      <a-col
        :xs="24"
        :sm="12"
      >
        <a-form-item
          ref="deadlineItem"
          :label="t('Svarfrist')"
          html-for="nc-deadline"
          required
          :validate-status="deadlineInvalid ? 'error' : ''"
        >
          <a-date-picker
            id="nc-deadline"
            class="nc-full"
            :value="deadline || null"
            value-format="YYYY-MM-DD"
            :format="dateInputFormat"
            :disabled-date="disabledDate"
            @update:value="(v) => emit('update:deadline', v || '')"
            @open-change="(o) => { deadlineOpen = o }"
            @keydown="onDeadlineKey"
          />
          <template
            v-if="deadlineInvalid"
            #help
          >
            <span id="nc-deadline-err">{{ invalid('deadline') ? t('Vælg en svarfrist.') : t('Svarfristen ligger i fortiden. Vælg en dato fra i dag og frem.') }}</span>
          </template>
          <template
            v-else
            #extra
          >
            <span id="nc-deadline-hint">{{ deadlineHint }}</span>
          </template>
        </a-form-item>
      </a-col>
    </a-row>

    <div
      v-if="mail"
      @keydown="onFoldKeydown"
    >
      <a-collapse
        ghost
        destroy-inactive-panel
        :expand-icon="collapseExpandIcon"
      >
        <a-collapse-panel
          id="nc-mail"
          key="mail"
          :header="t('Se mailen, kunden får')"
        >
          <RequestMailPreview
            :mail="mail"
            :to="to"
            :company-name="companyName"
            :case-nr="caseNr"
            :link="link"
          />
        </a-collapse-panel>
      </a-collapse>
    </div>
  </a-form>
</template>

<style scoped>
/* Datofeltet fylder sin kolonne ud, som de andre felter */
.nc-full {
  width: 100%;
}
</style>
