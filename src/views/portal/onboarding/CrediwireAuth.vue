<script setup>
// Demo af Crediwires egen login-side (portal_onboarding.jsx: PortalCwAuth), som kunden sendes til
// fra trinnet Bruger og tilbage fra bagefter (design "Bruger trin", runde 2, 2a). Mailen kommer fra
// invitationen, og Crediwire viser selv "Opret bruger" eller "Log ind" ud fra den. Vilkår, navn og
// virksomhed hører til portalens trin Bruger, når kunden er tilbage.
// I forhåndsvisningen afgør mode ('signup' | 'login'), hvilken side der vises.
//
// Props: mode ('signup' | 'login', kun i forhåndsvisningen), preview (rådgiverens forhåndsvisning;
//        CW.isPreview() tæller også med).
// Emits: authed(remember, arrive) (logget ind; arrive = brugeren har allerede virksomheden),
//        back ("Tilbage til Materiale til EIFO").
//
// Siden er ren antdv (beslutning): logoet er et kvadratisk a-avatar som sidebjælkens, og højre
// spalte med påstanden er en almindelig spalte uden farveforløb (dekoration, aria-hidden).
// Indsend-knappen bærer data-cust-act (login/account), "Glemt adgangskode?" data-cust-act="reset":
// portalens forhåndsvisning stopper klikket. Indlogningen tager 0,9 s (demo), som før.
import { computed, onBeforeUnmount, ref } from 'vue'
import { CheckOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { NC_EMAIL_RE, ncFill, portalMaskEmail, portalRecipient } from '@/domain/new_case_portal'
import { obPwHash, obPwProblems } from '@/domain/onboarding'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { Grid } from 'ant-design-vue'
import LanguageSwitcher from '@/components/shell/LanguageSwitcher.vue'

const props = defineProps({
  mode: { type: String, default: null },
  preview: { type: Boolean, default: false },
})
const emit = defineEmits(['authed', 'back'])

// Læses ved hver gengivelse som før (CW.isPreview() er ikke reaktiv; portalen tegner siden forfra)
const version = useCaseVersion()
const pv = computed(() => { version.value; return !!(props.preview || CW.isPreview()) })
const ob = computed(() => { version.value; return CW.onboarding() })
const rcp = computed(() => { version.value; return portalRecipient() })
const co = computed(() => { version.value; return DATA.COMPANY || {} })
// Demo: om mailen allerede har en Crediwire-bruger, og om virksomheden ligger på den
const demoExists = ref(false)
const demoHasCo = ref(false)
const exists = computed(() => (pv.value ? props.mode === 'login' : (!!ob.value.account || demoExists.value)))
const presetMail = computed(() => (ob.value.account && ob.value.account.email) || rcp.value.email || '')
const email = ref(presetMail.value)
const pw = ref('')
const show = ref(false)
const tried = ref(false)
const err = ref('')
const forgot = ref(false)
const busy = ref(false)
let timer = null
onBeforeUnmount(() => clearTimeout(timer))
const probs = computed(() => obPwProblems(pw.value))
const emailOk = computed(() => NC_EMAIL_RE.test(email.value.trim()))

function submit (e) {
  if (e) e.preventDefault()
  if (pv.value || busy.value) return // fanges også af data-cust-act
  // Værdierne, som de stod, da der blev trykket (før: gengivelsens værdier i lukningen)
  const ob1 = ob.value
  const rcp1 = rcp.value
  const co1 = co.value
  const exists1 = exists.value
  const hasCo = demoHasCo.value
  const pw1 = pw.value
  const email1 = email.value
  tried.value = true; err.value = ''
  if (!emailOk.value) { CW.focusSoon('#cwp-auth-mail'); return }
  if (exists1 && !pw1) { err.value = t('Skriv adgangskoden.'); CW.focusSoon('#cwp-auth-pw1'); return }
  if (exists1 && ob1.account && ob1.account.pw !== obPwHash(pw1)) { err.value = t('Adgangskoden passer ikke.'); CW.focusSoon('#cwp-auth-pw1'); return }
  if (!exists1 && probs.value.length) { CW.focusSoon('#cwp-auth-pw1'); return }
  busy.value = true
  timer = setTimeout(() => {
    busy.value = false
    const now = new Date().toISOString()
    const mail = email1.trim()
    if (exists1 && ob1.account) {
      CW.log('portal-login', t('Kunden loggede ind i portalen'), { who: 'kunde' })
      emit('authed', false, false)
      return
    }
    if (exists1) {
      // Demo: en bruger, Crediwire allerede kender. Den har accepteret Crediwires vilkår og har et navn
      const patch = { account: { email: mail, pw: obPwHash(pw1), name: rcp1.name || '', existing: true, at: now }, terms: { at: now, marketing: false } }
      if (hasCo) patch.company = { cvr: String(co1.cvr || '').replace(/\D/g, ''), name: co1.name, person: rcp1.name || '', advisor: false, at: now }
      if (CW.setOnboarding(patch, ncFill(t('Kunden loggede ind med sin Crediwire-bruger ({email})'), { email: mail })) === false) return
      emit('authed', false, hasCo)
      return
    }
    if (CW.setOnboarding({ account: { email: mail, pw: obPwHash(pw1), at: now } }, ncFill(t('Kunden oprettede en bruger på Crediwire ({email})'), { email: mail })) === false) return
    emit('authed', false, false)
  }, 900)
}

const mailErr = computed(() => (tried.value && !emailOk.value ? t('Skriv en gyldig mail.') : ''))
const pwErr = computed(() => (!exists.value && tried.value && probs.value.length ? t('Adgangskoden opfylder ikke kravene nedenfor.') : ''))
// Reglerne for en ny adgangskode: ✓ når de er opfyldt (og læst op som "opfyldt" / "mangler")
const rules = computed(() => [['len', t('Mindst 8 tegn')], ['num', t('Et tal')], ['lower', t('Et lille bogstav')], ['upper', t('Et stort bogstav')]]
  .map(([k, txt]) => ({ k, txt, ok: !probs.value.includes(k) })))
const label = computed(() => (busy.value ? (exists.value ? t('Logger ind…') : t('Opretter bruger…')) : (exists.value ? t('Log ind') : t('Opret bruger'))))
const context = computed(() => ncFill(t('Du er i gang med at sende materiale til EIFO om {company}. Når du er logget ind eller brugeren er oprettet, sender vi dig tilbage.'), { company: co.value.name }))
const pwDescribedBy = computed(() => [!exists.value ? 'cwp-auth-rules' : '', pwErr.value ? 'cwp-auth-pw-err' : '', err.value ? 'cwp-auth-err' : ''].filter(Boolean).join(' ') || undefined)
const forgotText = computed(() => ncFill(t('Vi har sendt et link til {email}, så I kan vælge en ny adgangskode. Linket virker i 1 time.'), { email: portalMaskEmail(email.value.trim() || rcp.value.email) }))

function onEmail (v) { email.value = v; err.value = '' }
function onPw (v) { pw.value = v; err.value = '' }
function onForgot () { forgot.value = true; err.value = '' }
// Sprogvælgeren følger portalens større trykflader på telefoner
const langScreens = Grid.useBreakpoint()
</script>

<template>
  <a-row class="cw-auth">
    <a-col
      :xs="24"
      :md="12"
      class="cw-auth-left"
    >
      <div class="cw-auth-top">
        <span
          class="cw-auth-logo"
          aria-label="Crediwire"
        >
          <a-avatar
            shape="square"
            :size="26"
            :style="{ backgroundColor: '#3b3854' }"
            aria-hidden="true"
          >
            cw
          </a-avatar>
          <a-typography-text strong>crediwire</a-typography-text>
        </span>
        <LanguageSwitcher
          v-if="!pv"
          :size="langScreens.xs ? 'large' : 'small'"
        />
      </div>
      <a-form
        layout="vertical"
        class="cw-auth-form"
        novalidate
        @submit="submit"
      >
        <a-alert
          class="cw-auth-block"
          type="info"
          role="none"
          :message="context"
        />
        <a-typography-title>{{ exists ? t('Log ind') : t('Opret bruger') }}</a-typography-title>

        <!-- Stjernen er skjult for skærmlæsere, som før (antdv's required-mærke ville komme med i
             feltets navn: "* Mail"). Feltet har aria-required. -->
        <a-form-item
          html-for="cwp-auth-mail"
          :validate-status="mailErr ? 'error' : ''"
        >
          <template #label>
            <a-typography-text
              type="danger"
              aria-hidden="true"
            >
              *
            </a-typography-text>
            {{ ' ' }}{{ t('Mail') }}
          </template>
          <a-input
            id="cwp-auth-mail"
            type="email"
            autocomplete="username"
            :value="email"
            :readonly="pv || !!presetMail"
            aria-required="true"
            :aria-invalid="mailErr ? 'true' : undefined"
            :aria-describedby="mailErr ? 'cwp-auth-mail-err' : undefined"
            @update:value="onEmail"
          />
          <template
            v-if="mailErr"
            #help
          >
            <span id="cwp-auth-mail-err">{{ mailErr }}</span>
          </template>
        </a-form-item>

        <!-- "Glemt adgangskode?" står til højre på etikettens linje og før feltet i tabulatorrækkefølgen,
             som før. Den kan ikke stå i etiketten (antdv lægger den i <label>, og så kom teksten med i
             feltets navn), så den står før feltet og placeres på linjen med en lille layoutregel. -->
        <div class="cw-auth-pw">
          <a-button
            v-if="exists"
            type="link"
            size="small"
            class="cwp-linkbtn cw-auth-forgot cw-link"
            data-cust-act="reset"
            @click="onForgot"
          >
            {{ t('Glemt adgangskode?') }}
          </a-button>
          <a-form-item
            html-for="cwp-auth-pw1"
            :validate-status="pwErr || err ? 'error' : ''"
          >
            <template #label>
              <a-typography-text
                type="danger"
                aria-hidden="true"
              >
                *
              </a-typography-text>
              {{ ' ' }}{{ t('Adgangskode') }}
            </template>
            <a-input
              id="cwp-auth-pw1"
              :type="show ? 'text' : 'password'"
              :autocomplete="exists ? 'current-password' : 'new-password'"
              :value="pw"
              :readonly="pv"
              aria-required="true"
              :aria-invalid="pwErr || err ? 'true' : undefined"
              :aria-describedby="pwDescribedBy"
              @update:value="onPw"
            >
              <template #suffix>
                <a-button
                  type="link"
                  size="small"
                  class="cwp-linkbtn cw-link"
                  :aria-pressed="show"
                  @click="show = !show"
                >
                  {{ show ? t('Skjul') : t('Vis') }}
                </a-button>
              </template>
            </a-input>
            <template
              v-if="pwErr || err"
              #help
            >
              <span
                v-if="pwErr"
                id="cwp-auth-pw-err"
              >{{ pwErr }}</span>
              <span
                v-if="err"
                id="cwp-auth-err"
              >{{ err }}</span>
            </template>
            <template
              v-if="!exists"
              #extra
            >
              <ul
                id="cwp-auth-rules"
                class="cw-auth-rules"
              >
                <li
                  v-for="r in rules"
                  :key="r.k"
                >
                  <a-typography-text :type="pw && r.ok ? undefined : 'secondary'">
                    <CheckOutlined
                      v-if="pw && r.ok"
                      aria-hidden="true"
                    />
                    <span
                      v-else
                      aria-hidden="true"
                    >-</span>
                    {{ ' ' }}{{ r.txt }}
                  </a-typography-text>
                  <span class="sr-only">{{ pw ? (r.ok ? ': ' + t('opfyldt') : ': ' + t('mangler')) : '' }}</span>
                </li>
              </ul>
            </template>
          </a-form-item>
        </div>

        <a-typography-paragraph
          v-if="forgot"
          role="status"
        >
          {{ forgotText }}
          {{ ' ' }}<a-typography-text type="secondary">
            {{ t('Demo: mailen sendes ikke.') }}
          </a-typography-text>
        </a-typography-paragraph>

        <a-button
          type="primary"
          size="large"
          block
          html-type="submit"
          :data-cust-act="exists ? 'login' : 'account'"
          :loading="busy"
          :aria-busy="busy || undefined"
        >
          {{ label }}
        </a-button>
        <a-button
          type="link"
          class="cwp-linkbtn cw-auth-back cw-link"
          @click="emit('back')"
        >
          {{ t('Tilbage til Materiale til EIFO') }}
        </a-button>
      </a-form>
    </a-col>
    <a-col
      :xs="0"
      :md="12"
      class="cw-auth-right"
      aria-hidden="true"
    >
      <a-typography-title :level="3">
        {{ t('Digital og sikker deling af jeres finansielle data') }}
      </a-typography-title>
    </a-col>
  </a-row>
</template>

<style scoped>
/* To spalter: formularen til venstre og påstanden til højre (skjult på smalle skærme) */
.cw-auth-left {
  display: flex;
  flex-direction: column;
  padding: 16px 32px 32px;
}

.cw-auth-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cw-auth-logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cw-auth-form {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  padding: 32px 0 24px;
}

.cw-auth-block {
  margin-bottom: 16px;
}


/* "Glemt adgangskode?" til højre på etikettens linje (den står før feltet i koden). z-index: feltets
   etiketkolonne kommer senere og er også placeret, så den lå ellers over knappen og tog klikket */
.cw-auth-pw {
  position: relative;
}

.cw-auth-forgot {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
}

.cw-auth-rules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.cw-auth-back {
  margin-top: 16px;
}

.cw-auth-right {
  align-items: center;
  justify-content: center;
  padding: 32px;
}

/* Påstanden centreres kun, hvor spalten vises (fra md). Under md skjuler a-col (xs 0) den, som før
   under 760 px; en display-regel uden for medieforespørgslen ville vise den under formularen */
@media (min-width: 768px) {
  .cw-auth-right {
    display: flex;
  }
}

@media (max-width: 767px) {
  .cw-auth-left {
    padding: 16px;
  }
}
</style>
