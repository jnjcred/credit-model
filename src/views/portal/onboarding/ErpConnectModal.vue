<script setup>
// Forbindelsen til regnskabssystemet (portal_onboarding.jsx: PortalErpRun): videresendelse (trin 0),
// systemets login og samtykke (trin 1), hentning (trin 2-5) og færdig (trin 6). Kun tekst, ingen
// logo eller varemærkegrafik: det er en demo af systemets egen side.
//
// Props: src (kilden fra ERP_SOURCES), sharing (kundens valg: { mode, dataUntil? }).
// Emits: fetched(src) (tallene er hentet og gemt), close(result) med 'cancel', 'declined' eller 'done'.
// Kalderen viser dialogen med v-if, så længe den kører.
//
// Tider og fokus som før: 1,2 s til systemets side (fokus på E-mail), 0,9 s login (fokus på
// overskriften), hentning 1,0/1,1/1,0/1,0 s (fokus på titlen). Samtykke, filer og trinnet gemmes
// samlet til sidst, så et afbrudt forløb ikke efterlader et samtykke uden tal. Godkend kan kun
// trykkes én gang. Esc lukker i trin 0-1 (annullér) og 6 (færdig), men ikke under hentningen.
// Fokus: dialogen flytter selv fokus ind (Annullér) og fjernes med v-if, så den husker elementet,
// der åbnede den ("Forbind …"), og giver fokus tilbage, når den fjernes (som CW.useDialog før).
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import { CheckOutlined, LoadingOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { ncFill, portalConnectNow, portalConsentNow, portalMonths, portalPeriod, portalRecipient } from '@/domain/new_case_portal'
import { ERP_RUN_DONE, obFmt } from '@/domain/onboarding'

const props = defineProps({
  src: { type: Object, required: true },
  sharing: { type: Object, default: null },
})
const emit = defineEmits(['fetched', 'close'])

const step = ref(0)
const auth = ref('login') // login | logging | consent
const login = ref('')
const loginEmail = ref((() => { const a = CW.onboarding().account; return (a && a.email) || portalRecipient().email || '' })())
let timers = []
let approving = false // Godkend kan kun trykkes én gang
const prev = document.activeElement
const cancelBtn = ref(null)
const end = computed(() => (props.sharing && props.sharing.mode === 'until' ? props.sharing.dataUntil : null))
const period = computed(() => portalPeriod(null, end.value))
const months = computed(() => portalMonths(end.value))
const company = DATA.COMPANY

onMounted(() => {
  timers.push(setTimeout(() => { step.value = 1; CW.focusSoon('#cwp-auth-email') }, 1200))
  // Fokus ind i dialogen med det samme: den første knap (Annullér), som før
  nextTick(() => requestAnimationFrame(() => {
    const b = cancelBtn.value && cancelBtn.value.$el
    if (b && b.focus) b.focus()
  }))
})
onBeforeUnmount(() => timers.forEach(clearTimeout))
onUnmounted(() => {
  if (prev && prev.focus && document.contains(prev)) { try { prev.focus() } catch (e) {} }
})

const cancel = () => { timers.forEach(clearTimeout); timers = []; emit('close', 'cancel') }
// Esc: under hentningen (trin 2-5) kan dialogen ikke lukkes (a-modal's keyboard er slået fra da)
const onEsc = () => (step.value >= ERP_RUN_DONE ? emit('close', 'done') : step.value >= 2 ? null : cancel())

const loginAuth = () => {
  auth.value = 'logging'
  timers.push(setTimeout(() => { login.value = loginEmail.value.trim() || portalRecipient().email; auth.value = 'consent'; CW.focusSoon('#cwp-auth-h') }, 900))
}
const approve = () => {
  if (step.value !== 1 || approving) return
  if (CW.isPreview()) { CW.previewBlocked('erp'); return }
  approving = true
  step.value = 2
  CW.focusSoon('#cwp-run-title')
  // Kilden og valget, som de stod, da der blev godkendt
  const src = props.src
  const sharing = props.sharing
  const durations = [1000, 1100, 1000, 1000]
  let acc = 0
  durations.forEach((ms, i) => {
    acc += ms
    timers.push(setTimeout(() => {
      if (i < durations.length - 1) { step.value = 3 + i; return }
      // Samtykke, filer og trinnet gemmes samlet, så et afbrudt forløb ikke efterlader et samtykke uden tal
      portalConsentNow(src.name, sharing, CW.onboarding().company)
      portalConnectNow(src.name, sharing)
      emit('fetched', src)
      step.value = ERP_RUN_DONE
      CW.focusSoon('#cwp-run-title')
    }, acc))
  })
}
const decline = () => { timers.forEach(clearTimeout); emit('close', 'declined') }

const steps = computed(() => [
  ncFill(t('I sendes til {src}…'), { src: props.src.name }),
  ncFill(t('Godkendt i {src}'), { src: props.src.name }),
  ncFill(t('Henter kontoplan ({n} konti)…'), { n: props.src.accounts }),
  ncFill(t('Henter saldobalance {period}…'), { period: period.value }),
  ncFill(t('Henter periodetal for {n} måneder…'), { n: months.value }),
  t('Henter debitordata…'),
])
const untilText = computed(() => (props.sharing && props.sharing.mode === 'ongoing' ? t('Løbende, også nye tal') : ncFill(t('Til og med {date}'), { date: obFmt(end.value) })))
const ongoing = computed(() => !!(props.sharing && props.sharing.mode === 'ongoing'))
const hasFooter = computed(() => step.value <= 1 || step.value >= ERP_RUN_DONE)
// Dialogens navn: systemets overskrift i trin 1, ellers titlen over forløbet
const wrapProps = computed(() => ({ 'aria-modal': 'true', 'aria-labelledby': step.value === 1 ? 'cwp-auth-h' : 'cwp-run-title' }))
</script>

<template>
  <a-modal
    :visible="true"
    :width="572"
    :closable="false"
    :mask-closable="false"
    :keyboard="step < 2 || step >= ERP_RUN_DONE"
    :footer="hasFooter ? undefined : null"
    :wrap-props="wrapProps"
    @cancel="onEsc"
  >
    <!-- Demo: regnskabssystemets egen login- og samtykkeside. Kun tekst, ingen logo eller varemærkegrafik. -->
    <template
      v-if="step === 1"
      #title
    >
      <a-space :size="12">
        <span
          id="cwp-auth-h"
          role="heading"
          aria-level="2"
          tabindex="-1"
        >{{ src.name }}</span>
        <a-tag>{{ t('Demo') }}</a-tag>
      </a-space>
    </template>

    <template v-if="step === 1">
      <a-typography-paragraph type="secondary">
        {{ t('Log ind og giv Crediwire læseadgang') }}
      </a-typography-paragraph>
      <template v-if="auth !== 'consent'">
        <a-typography-paragraph strong>
          {{ ncFill(t('Log ind på {src}'), { src: src.name }) }}
        </a-typography-paragraph>
        <a-form layout="vertical">
          <a-form-item
            :label="t('E-mail')"
            html-for="cwp-auth-email"
          >
            <a-input
              id="cwp-auth-email"
              v-model:value="loginEmail"
              type="email"
              autocomplete="username"
              :disabled="auth === 'logging'"
            />
          </a-form-item>
          <a-form-item
            :label="t('Adgangskode')"
            html-for="cwp-auth-pw"
          >
            <a-input
              id="cwp-auth-pw"
              type="password"
              autocomplete="current-password"
              default-value="demo-demo"
              :disabled="auth === 'logging'"
              aria-describedby="cwp-auth-pw-hint"
            />
            <template #extra>
              <span id="cwp-auth-pw-hint">{{ t('Demo: adgangskoden er udfyldt. Crediwire og EIFO ser den aldrig.') }}</span>
            </template>
          </a-form-item>
        </a-form>
        <div
          v-if="auth === 'logging'"
          role="status"
        >
          <a-space>
            <a-spin size="small" />
            <span>{{ ncFill(t('Logger ind som {email}…'), { email: loginEmail.trim() }) }}</span>
          </a-space>
        </div>
      </template>
      <template v-else>
        <a-typography-paragraph strong>
          {{ t('Crediwire beder om læseadgang på vegne af EIFO') }}
        </a-typography-paragraph>
        <a-descriptions
          :column="1"
          size="small"
          :colon="false"
          class="erp-facts"
        >
          <a-descriptions-item :label="t('Logget ind som')">
            {{ login || '-' }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('Virksomhed')">
            {{ company.name }}{{ company.cvr ? ' · CVR ' + company.cvr : '' }}
          </a-descriptions-item>
          <a-descriptions-item
            v-if="src.agreement"
            :label="t('Aftalenr.')"
          >
            {{ src.agreement }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('Tal')">
            {{ untilText }}
          </a-descriptions-item>
          <a-descriptions-item :label="t('Adgang')">
            {{ ongoing ? t('Indtil I trækker den tilbage') : t('Indtil sagen er afgjort, eller I trækker den tilbage') }}
          </a-descriptions-item>
        </a-descriptions>
        <a-typography>
          <a-typography-text strong>
            {{ t('Crediwire får lov til at læse') }}
          </a-typography-text>
          <ul>
            <li>{{ ncFill(t('Kontoplan ({n} konti)'), { n: src.accounts }) }}</li>
            <li>{{ t('Saldobalance') }}</li>
            <li>{{ ncFill(t('Periodetal for {period}'), { period }) }}</li>
            <li>{{ t('Debitordata') }}</li>
          </ul>
          <a-typography-paragraph>
            {{ ncFill(t('Crediwire kan ikke se posteringer, bilag eller banktransaktioner og kan ikke ændre noget i {src}.'), { src: src.name }) }}
          </a-typography-paragraph>
          <a-typography-paragraph type="secondary">
            {{ ncFill(t('Demo: I en rigtig forbindelse er dette {src}s egen side, hvor I logger ind.'), { src: src.name }) }}
          </a-typography-paragraph>
        </a-typography>
      </template>
    </template>

    <template v-else-if="step < ERP_RUN_DONE">
      <div
        id="cwp-run-title"
        class="erp-run-title"
        tabindex="-1"
      >
        <a-typography-text strong>
          {{ ncFill(t('Forbinder til {src}'), { src: src.name }) }}
        </a-typography-text>
      </div>
      <a-typography-paragraph type="secondary">
        {{ ncFill(t('I logger ind på {src}s egen side. Crediwire og EIFO ser aldrig jeres brugernavn eller adgangskode.'), { src: src.name }) }}
      </a-typography-paragraph>
      <a-timeline aria-live="polite">
        <a-timeline-item
          v-for="(label, i) in steps"
          :key="i"
          :color="i > step ? 'gray' : 'blue'"
          :aria-current="i === step ? 'step' : undefined"
        >
          <template
            v-if="i < step"
            #dot
          >
            <CheckOutlined aria-hidden="true" />
          </template>
          <template
            v-else-if="i === step"
            #dot
          >
            <LoadingOutlined aria-hidden="true" />
          </template>
          <a-typography-text
            :strong="i === step"
            :type="i > step ? 'secondary' : undefined"
          >
            {{ i < step ? label.replace(/…$/, '') : label }}
          </a-typography-text>
          <span
            v-if="i < step"
            class="sr-only"
          >{{ t('færdig') }}</span>
        </a-timeline-item>
      </a-timeline>
    </template>

    <template v-else>
      <div
        id="cwp-run-title"
        class="erp-run-title"
        role="status"
        tabindex="-1"
      >
        <a-typography-text strong>
          {{ ncFill(t('Periodetal og debitordata er hentet fra {src}'), { src: src.name }) }}
        </a-typography-text>
      </div>
      <a-typography-paragraph>
        {{ ongoing ? t('Løbende adgang, indtil I trækker den tilbage.') : ncFill(t('EIFO har fået tal til og med {date} og henter ikke nyere tal. Adgangen lukker, når sagen er afgjort.'), { date: obFmt(end) }) }}
      </a-typography-paragraph>
    </template>

    <template
      v-if="hasFooter"
      #footer
    >
      <a-button
        v-if="step === 0"
        ref="cancelBtn"
        @click="cancel"
      >
        {{ t('Annullér') }}
      </a-button>
      <template v-else-if="step === 1 && auth !== 'consent'">
        <a-button
          :disabled="auth === 'logging'"
          @click="cancel"
        >
          {{ t('Annullér') }}
        </a-button>
        <a-button
          type="primary"
          :disabled="auth === 'logging' || !loginEmail.trim()"
          @click="loginAuth"
        >
          {{ t('Log ind') }}
        </a-button>
      </template>
      <template v-else-if="step === 1">
        <a-button @click="decline">
          {{ t('Afvis') }}
        </a-button>
        <a-button
          type="primary"
          @click="approve"
        >
          <template #icon>
            <CheckOutlined aria-hidden="true" />
          </template>
          {{ t('Godkend') }}
        </a-button>
      </template>
      <a-button
        v-else
        type="primary"
        @click="emit('close', 'done')"
      >
        {{ t('Fortsæt') }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped>
.erp-run-title {
  margin-bottom: 4px;
}

.erp-facts {
  margin-bottom: 16px;
}
</style>
