<script setup>
// Trinnet Bruger (portal_onboarding.jsx: ObUser, med ObWho og ObFrame skrevet ind her; design
// "Bruger trin", 2a). Før login: "Log ind eller opret bruger" med virksomheden og én knap,
// "Fortsæt med Crediwire". Efter login:
// - ny bruger: "Færdiggør dine oplysninger" (navn, virksomhed, CVR, vilkår)
// - kendt bruger uden virksomheden: "Du er logget ind" og bekræft virksomheden
// - kendt bruger med virksomheden (arrive): tjekker i 1,5 s og sender videre (done)
//
// Props: preview (rådgiverens forhåndsvisning; felterne er skrivebeskyttede, og CW.isPreview()
//        tæller også med), pre (før login), arrive (kendt bruger med virksomheden), demo (et stadie
//        fra Kundeflow i stedet for kundens rigtige tilstand).
// Emits: continue ("Fortsæt med Crediwire"), done (trinnet er gjort), logout ("Skift bruger").
// Slot footer: under kontaktlinjen (portalens demoknapper).
//
// Forhåndsvisningen: knappen, der gemmer, og vilkårene bærer data-cust-act (portalen stopper klikket
// og viser en note). Linket "brugsvilkår" har klassen cwp-linkbtn, så det virker også dér.
// Formularen sendes med Enter (a-form uden model: kun submit-hændelsen, ingen antdv-validering).
// Fejlene vises først efter et forsøg, i felternes a-form-item (role="alert"), og fokus går til
// det første felt med en fejl, i samme rækkefølge som før.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CheckCircleFilled } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { PORTAL_CONTACT, ncFill, portalRecipient } from '@/domain/new_case_portal'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon } from '@/composables/useCollapseKeyboard'
import PortalContactLine from '@/views/portal/components/PortalContactLine.vue'

const props = defineProps({
  preview: { type: Boolean, default: false },
  pre: { type: Boolean, default: false },
  arrive: { type: Boolean, default: false },
  demo: { type: Object, default: null },
})
const emit = defineEmits(['continue', 'done', 'logout'])

// Det, der læses af sagens tilstand ved hver gengivelse (CW.isPreview() er ikke reaktiv; portalen
// tegner trinnet forfra, når rollen skifter)
const version = useCaseVersion()
const pv = computed(() => { version.value; return !!(props.preview || CW.isPreview()) })
// demo: et stadie, rådgiveren ser i Kundeflow (OnboardingDemoBar), i stedet for kundens rigtige tilstand
const ob = computed(() => { version.value; return props.demo || CW.onboarding() })
const rcp = computed(() => { version.value; return portalRecipient() })
const co = computed(() => { version.value; return DATA.COMPANY || {} })
const acc = computed(() => ob.value.account || null)
const mail = computed(() => (acc.value && acc.value.email) || '')
const known = computed(() => String(co.value.cvr || '').replace(/\D/g, ''))
// Modtagerens navn står kun, når brugeren er modtageren selv
const own = computed(() => !rcp.value.email || !mail.value || mail.value.toLowerCase() === rcp.value.email.toLowerCase())

// Felterne starter med det, der er gemt (læses én gang, som useState før)
const ob0 = ob.value
const person = ref((ob0.company && ob0.company.person) || (acc.value && acc.value.name) || (own.value ? rcp.value.name || '' : ''))
const coName = ref((ob0.company && ob0.company.name) || co.value.name || '')
const cvr = ref((ob0.company && ob0.company.cvr) || known.value)
const accepted = ref(!!ob0.terms)
// Aftalen med EIFO om at dele regnskabsdata: gives her i registreringen, så virksomheden er forbundet til EIFO tidligt
const agreed = ref(!!(ob0.agreement && !ob0.agreement.declined))
const agreeOpen = ref([])
const marketing = ref(false)
const tried = ref(false)
const phase = props.arrive && ob0.company ? 'checking' : null
const isNew = computed(() => !!acc.value && !ob.value.terms)
const needCo = computed(() => !!acc.value && !!ob.value.terms && !ob.value.company)

// Kendt bruger med virksomheden: tjek, og når virksomheden er fundet, direkte videre
let checkTimer = null
onMounted(() => {
  if (phase !== 'checking') return
  checkTimer = setTimeout(() => emit('done'), 1500)
})
onBeforeUnmount(() => clearTimeout(checkTimer))

const digits = computed(() => String(cvr.value).replace(/\D/g, ''))
const nameErr = computed(() => (isNew.value && !person.value.trim() ? t('Skriv dit navn.') : ''))
const coErr = computed(() => (!coName.value.trim() ? t('Skriv virksomhedens navn.') : ''))
const cvrErr = computed(() => (digits.value.length !== 8 ? t('CVR-nummeret har 8 cifre.')
  : digits.value !== known.value ? ncFill(t('CVR {cvr} er ikke den virksomhed, EIFO har bedt om materiale fra. Tjek nummeret, eller skriv til {adv}.'), { cvr: digits.value, adv: PORTAL_CONTACT.first })
  : ''))
const doc = (n) => (e) => { e.preventDefault(); e.stopPropagation(); CW.notInDemo(n) }
const openTerms = (e) => doc(t('Brugsvilkår'))(e)

function submit (e) {
  if (e) e.preventDefault()
  if (pv.value) return
  const ob1 = ob.value
  const acc1 = acc.value
  if (ob1.company && !isNew.value) { emit('done'); return }
  tried.value = true
  if (nameErr.value) { CW.focusSoon('#cwp-auth-name'); return }
  if (coErr.value) { CW.focusSoon('#cwp-ob-coname'); return }
  if (cvrErr.value) { CW.focusSoon('#cwp-ob-cvr'); return }
  if (isNew.value && !accepted.value) { CW.focusSoon('#cwp-auth-terms'); return }
  if (showAgree.value && !agreed.value) { CW.focusSoon('#cwp-ob-agree'); return }
  const now = new Date().toISOString()
  const who = isNew.value ? person.value.trim() : ((acc1 && acc1.name) || rcp.value.name || '')
  const patch = { company: { cvr: digits.value, name: coName.value.trim(), person: who, advisor: false, at: now } }
  if (showAgree.value) patch.agreement = { at: now }
  if (isNew.value) {
    patch.terms = { at: now, marketing: marketing.value }
    patch.account = Object.assign({}, acc1, { name: who })
  }
  const text = isNew.value
    ? ncFill(t('Kunden accepterede brugsvilkårene og bekræftede virksomheden {company} ({name})'), { company: coName.value.trim(), name: who }) + (marketing.value ? '. ' + t('Ja tak til nyheder fra Crediwire') : '')
    : ncFill(t('Kunden tilføjede virksomheden {company} (CVR {cvr}) til sin Crediwire-bruger'), { company: coName.value.trim(), cvr: digits.value })
  if (CW.setOnboarding(patch, text + (showAgree.value ? '. ' + t('Kunden accepterede aftalen med EIFO om at dele regnskabsdata') : '')) === false) return
  emit('done')
}

// CVR: et "DK" foran og alt andet end cifre fjernes, højst 8 cifre
function onCvr (v) {
  cvr.value = v.replace(/^\s*DK/i, '').replace(/\D/g, '').slice(0, 8)
}

// Hvilken udgave af trinnet: før login, tjekker, ny bruger eller kendt bruger
const branch = computed(() => (props.pre || !acc.value ? 'pre' : phase === 'checking' ? 'checking' : isNew.value ? 'new' : 'known'))
const heading = computed(() => (branch.value === 'pre' ? t('Log ind eller opret bruger')
  : branch.value === 'new' ? t('Færdiggør dine oplysninger')
  : t('Du er logget ind')))
// Den grønne boks: hvem kunden er logget ind som, med "Skift bruger" (ikke i forhåndsvisningen)
const who = computed(() => {
  const a = acc.value
  if (branch.value === 'checking') return { title: ncFill(t('Logget ind som {name}'), { name: (a && a.name) || mail.value }), sub: mail.value, canSwitch: false }
  if (branch.value === 'new') return { title: t('Bruger oprettet.'), sub: mail.value, canSwitch: !pv.value }
  if (branch.value === 'known') return { title: ncFill(t('Logget ind som {name}'), { name: (a && a.name) || mail.value }), sub: [a && a.name, mail.value].filter(Boolean).join(' - '), canSwitch: !pv.value }
  return null
})
// Initialer fra navnet, ellers de to første bogstaver i mailen (f.eks. "SP" for sp@…)
const initials = computed(() => {
  const o = ob.value
  const name = (o.account && o.account.name) || ''
  const mailLocal = ((o.account && o.account.email) || '?').split('@')[0]
  return name ? name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') : mailLocal.slice(0, 2).toUpperCase()
})
const coMeta = computed(() => [known.value ? 'CVR ' + known.value : '', co.value.address].filter(Boolean).join(' - '))
const showCoBox = computed(() => branch.value === 'pre' || (branch.value === 'known' && !needCo.value))
const showCoFields = computed(() => branch.value === 'new' || (branch.value === 'known' && needCo.value))
const showSubmit = computed(() => !!acc.value && !props.pre && !phase)
// Aftalen med EIFO: ny bruger, eller kendt bruger, der tilføjer virksomheden, og som ikke har givet den før
const showAgree = computed(() => (branch.value === 'new' || (branch.value === 'known' && needCo.value)) && !(ob.value.agreement && !ob.value.agreement.declined))
const blocked = computed(() => (isNew.value && !accepted.value) || (showAgree.value && !agreed.value))
</script>

<template>
  <div class="ob-frame">
    <a-card>
      <a-form
        layout="vertical"
        class="cwp-ob-user"
        novalidate
        @submit="submit"
      >
        <a-typography-title>{{ heading }}</a-typography-title>

        <a-alert
          v-if="who"
          class="ob-block"
          type="success"
          role="none"
          show-icon
        >
          <template #icon>
            <CheckCircleFilled aria-hidden="true" />
          </template>
          <template #message>
            <div class="ob-who">
              <a-avatar aria-hidden="true">
                {{ initials }}
              </a-avatar>
              <div class="ob-who-text">
                <a-typography-text strong>
                  {{ who.title }}
                </a-typography-text>
                <a-typography-text type="secondary">
                  {{ who.sub }}
                </a-typography-text>
              </div>
              <a-button
                v-if="who.canSwitch"
                type="link"
                class="cwp-linkbtn cw-link"
                @click="emit('logout')"
              >
                {{ t('Skift bruger') }}
              </a-button>
            </div>
          </template>
        </a-alert>

        <div
          v-if="branch === 'checking'"
          class="ob-block"
          role="status"
        >
          <a-space>
            <a-spin size="small" />
            <span>{{ ncFill(t('Tjekker, om {company} findes på din bruger…'), { company: co.name }) }}</span>
          </a-space>
        </div>

        <a-form-item
          v-if="branch === 'new'"
          :label="t('Dit navn')"
          html-for="cwp-auth-name"
          :validate-status="tried && nameErr ? 'error' : ''"
        >
          <a-input
            id="cwp-auth-name"
            v-model:value="person"
            autocomplete="name"
            :readonly="pv"
            :aria-invalid="tried && nameErr ? 'true' : undefined"
            :aria-describedby="tried && nameErr ? 'cwp-auth-name-err' : undefined"
          />
          <template
            v-if="tried && nameErr"
            #help
          >
            <span id="cwp-auth-name-err">{{ nameErr }}</span>
          </template>
        </a-form-item>

        <a-typography-paragraph v-if="branch === 'known' && needCo">
          {{ t('Virksomheden findes ikke på din bruger endnu. Bekræft navn og CVR, så tilføjer vi den.') }}
        </a-typography-paragraph>

        <a-card
          v-if="showCoBox"
          class="ob-block"
          size="small"
        >
          <div class="ob-company">
            <a-typography-text type="secondary">
              {{ t('Virksomhed') }}
            </a-typography-text>
            <a-typography-text strong>
              {{ co.name }}
            </a-typography-text>
            <a-typography-text type="secondary">
              {{ coMeta }}
            </a-typography-text>
          </div>
        </a-card>

        <div
          v-if="branch === 'pre'"
          class="ob-block"
        >
          <a-button
            size="large"
            block
            @click="emit('continue')"
          >
            <a-space :size="8">
              <a-avatar
                shape="square"
                :size="20"
                :style="{ backgroundColor: '#3b3854' }"
                aria-hidden="true"
              >
                cw
              </a-avatar>
              {{ t('Fortsæt med Crediwire') }}
            </a-space>
          </a-button>
          <a-typography-paragraph
            class="ob-center"
            type="secondary"
          >
            {{ t('Du opretter en bruger eller logger ind hos Crediwire og kommer tilbage hertil.') }}
          </a-typography-paragraph>
        </div>

        <template v-if="showCoFields">
          <a-form-item
            :label="t('Virksomhedsnavn')"
            html-for="cwp-ob-coname"
            :validate-status="tried && coErr ? 'error' : ''"
          >
            <a-input
              id="cwp-ob-coname"
              v-model:value="coName"
              :readonly="pv"
              :aria-invalid="tried && coErr ? 'true' : undefined"
              :aria-describedby="tried && coErr ? 'cwp-ob-coname-err' : undefined"
            />
            <template
              v-if="tried && coErr"
              #help
            >
              <span id="cwp-ob-coname-err">{{ coErr }}</span>
            </template>
          </a-form-item>
          <a-form-item
            :label="t('CVR')"
            html-for="cwp-ob-cvr"
            :validate-status="tried && cvrErr ? 'error' : ''"
          >
            <a-input
              id="cwp-ob-cvr"
              inputmode="numeric"
              :value="cvr"
              :readonly="pv"
              :aria-invalid="tried && cvrErr ? 'true' : undefined"
              :aria-describedby="tried && cvrErr ? 'cwp-ob-cvr-err' : undefined"
              @update:value="onCvr"
            />
            <template
              v-if="tried && cvrErr"
              #help
            >
              <span id="cwp-ob-cvr-err">{{ cvrErr }}</span>
            </template>
          </a-form-item>
        </template>

        <!-- Vilkårene og aftalen med EIFO står lige under hinanden; markedsføring (valgfrit) er sidst -->
        <div
          v-if="branch === 'new'"
          :class="['ob-block', { 'ob-block-tight': showAgree }]"
        >
          <div
            data-cust-act="terms"
            class="cwp-ob-check"
          >
            <a-checkbox
              id="cwp-auth-terms"
              v-model:checked="accepted"
              aria-required="true"
            >
              <span
                class="ob-req"
                aria-hidden="true"
              >*</span>
              {{ t('Jeg accepterer Crediwires') }}
              <a-button
                type="link"
                size="small"
                class="cwp-linkbtn cw-link"
                @click="openTerms"
              >
                {{ t('brugsvilkår') }}
              </a-button>.
            </a-checkbox>
          </div>
        </div>

        <div
          v-if="showAgree"
          :class="['ob-block', { 'ob-block-tight': branch === 'new' }]"
        >
          <div
            data-cust-act="terms"
            class="cwp-ob-check"
          >
            <a-checkbox
              id="cwp-ob-agree"
              v-model:checked="agreed"
              aria-required="true"
            >
              <span
                class="ob-req"
                aria-hidden="true"
              >*</span>
              {{ t('Jeg accepterer aftalen med EIFO om at dele regnskabsdata.') }}
            </a-checkbox>
          </div>
          <a-collapse
            v-model:active-key="agreeOpen"
            ghost
            :expand-icon="collapseExpandIcon"
          >
            <a-collapse-panel
              key="eifo"
              :header="t('Læs aftalen med EIFO')"
            >
              <a-typography>
                <a-typography-paragraph>
                  {{ t('Ved at forbinde din virksomhed accepterer du at dele perioderegnskabstal og debitordata med EIFO.') }}
                </a-typography-paragraph>
                <a-typography-paragraph>
                  {{ t('Dataene må opbevares og bruges til at styrke dialogen med jer, afdække finansielle behov og lave løbende kreditvurdering.') }}
                </a-typography-paragraph>
                <a-typography-text strong>
                  {{ t('EIFO får') }}
                </a-typography-text>
                <ul>
                  <li>{{ t('Kontoplan, saldobalance og periodetal') }}</li>
                  <li>{{ t('Debitordata: hvem der skylder jer penge, og hvor længe') }}</li>
                </ul>
                <a-typography-text strong>
                  {{ t('EIFO får ikke') }}
                </a-typography-text>
                <ul>
                  <li>{{ t('Posteringer og bilag') }}</li>
                  <li>{{ t('Adgang til jeres netbank og banktransaktioner') }}</li>
                </ul>
                <a-typography-paragraph type="secondary">
                  {{ t('Hvor meget EIFO må se, vælger I selv, når I forbinder jeres regnskabsprogram.') }}
                </a-typography-paragraph>
              </a-typography>
            </a-collapse-panel>
          </a-collapse>
        </div>

        <div
          v-if="branch === 'new'"
          class="ob-block"
        >
          <div
            data-cust-act="terms"
            class="cwp-ob-check"
          >
            <a-checkbox v-model:checked="marketing">
              {{ t('Crediwire må sende mig nyheder og tilbud på mail (valgfrit).') }}
            </a-checkbox>
          </div>
        </div>

        <template v-if="showSubmit">
          <a-divider aria-hidden="true" />
          <a-button
            type="primary"
            size="large"
            block
            html-type="submit"
            data-cust-act="company"
            :disabled="blocked"
            :aria-describedby="blocked ? 'cwp-ob-user-hint' : undefined"
          >
            {{ t('Fortsæt') }}
          </a-button>
          <span
            v-if="blocked"
            id="cwp-ob-user-hint"
            class="sr-only"
          >{{ t('Acceptér brugsvilkårene og aftalen med EIFO for at fortsætte.') }}</span>
        </template>
      </a-form>
    </a-card>
    <PortalContactLine class="ob-contact" />
    <slot name="footer" />
  </div>
</template>

<style scoped>
/* Trinnets spalte, som før */
.ob-frame {
  max-width: 520px;
  margin: 0 auto;
}

.ob-block {
  margin-bottom: 24px;
}

.ob-who {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ob-who-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
}

.ob-company {
  display: flex;
  flex-direction: column;
}

.ob-center {
  margin-top: 8px;
  text-align: center;
}

/* Rød stjerne ved det, der skal accepteres for at fortsætte (ikke markedsføring) */
.ob-req {
  margin-right: 2px;
  color: #ff4d4f;
}

.ob-block-tight {
  margin-bottom: 0;
}

.ob-contact {
  margin-top: 16px;
}
</style>
