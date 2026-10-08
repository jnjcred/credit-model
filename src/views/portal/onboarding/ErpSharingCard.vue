<script setup>
// Del regnskabstal med EIFO (portal_onboarding.jsx: ObData, den selvstændige udgave fra punktet
// Periodetal og oversigten): hvor meget EIFO må se (løbende eller til og med en måned), kundens
// regnskabssystem, hvilke data der deles, ja til at dele (med fuldmagt, hvis det er revisoren eller
// rådgiveren) og "Forbind". Forbind gemmer aftalen og valget og åbner systemets login og samtykke
// (ErpConnectModal.vue).
//
// Props: ingen. (I prototypen kom preview aldrig fra kaldet, så forhåndsvisningen læses af
//        CW.isPreview(); standalone var altid sand: opstartens trin 'data' er ikke porteret.)
// Emits: finished(src) (tallene er hentet, og kunden trykkede Fortsæt), back ("Tilbage").
//
// Forhåndsvisningen: valgene og Forbind bærer data-cust-act="data" (på elementet rundt om
// a-radio-group, a-select og a-checkbox, så klikket fanges der), og portalen stopper klikket.
// Fejl vises først efter et forsøg, én ad gangen, i feltets a-form-item (role="alert"), og fokus
// går til det første problem, i samme rækkefølge som før.
// Ingen <form> (som før): portalens forhåndsvisning stopper alle submit-hændelser. Felterne har
// derfor a-form-item uden a-form; label-col 24 lægger etiketten over feltet som i en lodret formular.
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { ERP_SOURCES, ncFill, portalPeriod } from '@/domain/new_case_portal'
import { OB_TOP_SYSTEMS, obFmt, obLastMonth, obMonthEnd, obSharingText } from '@/domain/onboarding'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import { useSelectEscape } from '@/composables/useSelectEscape'
import ErpConnectModal from './ErpConnectModal.vue'

const emit = defineEmits(['finished', 'back'])

// Læses ved hver gengivelse som før (CW.isPreview() er ikke reaktiv; portalen tegner kortet forfra)
const version = useCaseVersion()
const preview = computed(() => { version.value; return !!CW.isPreview() })
const ob = computed(() => { version.value; return CW.onboarding() })
const helper = computed(() => !!(ob.value.company && ob.value.company.advisor))
const maxYm = computed(() => obLastMonth())
const minYm = computed(() => (Number(maxYm.value.slice(0, 4)) - 3) + '-01')

// Valgene starter med det, der er gemt (læses én gang, som useState før). Forvalgt som i dag:
// til og med seneste måned. I forhåndsvisningen vises kundens eget valg (eller intet)
const ob0 = ob.value
const mode = ref((ob0.sharing && ob0.sharing.mode) || (preview.value ? null : 'until'))
const ym = ref(ob0.sharing && ob0.sharing.dataUntil ? ob0.sharing.dataUntil.slice(0, 7) : maxYm.value)
// I forhåndsvisningen står kundens forbundne system valgt
const pick = ref((() => { const s0 = ob0.erp && ob0.erp.system && ERP_SOURCES.find(x => x.name === ob0.erp.system); return s0 ? s0.id : null })())
const yes = ref(!!(ob0.agreement && !ob0.agreement.declined))
const mandate = ref(!!(ob0.agreement && ob0.agreement.mandate))
const tried = ref(false)
const run = ref(null) // kilden, der forbindes til
const declined = ref(null)
const src = computed(() => ERP_SOURCES.find(s => s.id === pick.value) || null)
const other = ERP_SOURCES.filter(s => !OB_TOP_SYSTEMS.includes(s.id))
const top = OB_TOP_SYSTEMS.map(id => ERP_SOURCES.find(s => s.id === id))
const ymOk = computed(() => /^\d{4}-\d{2}$/.test(ym.value) && ym.value <= maxYm.value && ym.value >= minYm.value)
const sharing = computed(() => (mode.value === 'ongoing' ? { mode: mode.value } : mode.value === 'until' && ymOk.value ? { mode: mode.value, dataUntil: obMonthEnd(ym.value) } : null))
const problem = computed(() => (!mode.value ? 'mode' : !sharing.value ? 'month' : !src.value ? 'sys' : !yes.value ? 'agree' : helper.value && !mandate.value ? 'mandate' : null))
const show = (k) => tried.value && problem.value === k

// Aftalen og valget gemmes, før systemets login åbner, så de står der, hvis kunden afbryder
const saveChoices = () => {
  const now = new Date().toISOString()
  const sh = Object.assign({}, sharing.value, { at: now })
  const what = obSharingText(sh)
  return CW.setOnboarding({ agreement: Object.assign({ at: now }, helper.value ? { mandate: true } : {}), sharing: sh }, helper.value
    ? ncFill(t('{name} ({role}) sagde ja til at dele periodetal og debitordata med EIFO på vegne af kunden ({sharing})'), { name: ob.value.company.person, role: t('revisor eller rådgiver'), sharing: what })
    : ncFill(t('Kunden sagde ja til at dele periodetal og debitordata med EIFO ({sharing})'), { sharing: what })) !== false
}
const connect = () => {
  tried.value = true
  if (problem.value) {
    CW.focusSoon({ mode: 'input[name=cwp-ob-share]', month: '#cwp-ob-month', sys: 'input[name=cwp-ob-sys]', agree: '#cwp-ob-agree', mandate: '#cwp-ob-mandate' }[problem.value])
    return
  }
  // Systemet, som det stod, da der blev trykket (før: gengivelsens src i lukningen)
  const s = src.value
  if (!saveChoices()) return
  declined.value = null
  run.value = s
}
// Tallene er hentet: trinnet er gjort med det samme (ikke først ved "Fortsæt"),
// så en lukket fane ikke får kunden til at forbinde igen
const fetched = (s) => {
  const now = new Date().toISOString()
  CW.setOnboarding({ erp: { system: s.name, at: now } })
}
const runDone = (res) => {
  const s = run.value
  run.value = null
  if (res === 'declined') {
    CW.log('consent-declined', ncFill(t('Kunden afviste adgangen i {src}'), { src: s.name }), { who: 'kunde' })
    declined.value = s.name; CW.focusSoon('#cwp-ob-erp-declined'); return
  }
  if (res !== 'done') return
  emit('finished', s)
}

// Til og med måned: kun afsluttede måneder, højst tre år tilbage (som min og max før)
const disabledMonth = (d) => d.format('YYYY-MM') < minYm.value || d.format('YYYY-MM') > maxYm.value
// a-date-picker 3.2.13 sender ikke aria-* videre til sit felt (rc-picker). Måneds-feltet får derfor
// aria-describedby (hjælpeteksten) og aria-invalid sat direkte på <input>, som før (dokumenteret
// undtagelse, aftalt for a-date-picker). Feltet findes kun, når "Til og med en bestemt måned" er valgt.
const monthWrap = ref(null)
function syncMonthAria () {
  const el = monthWrap.value && monthWrap.value.querySelector('input')
  if (!el) return
  el.setAttribute('aria-describedby', 'cwp-ob-month-hint')
  if (ymOk.value) el.removeAttribute('aria-invalid')
  else el.setAttribute('aria-invalid', 'true')
}
onMounted(syncMonthAria)
watch([ymOk, mode], () => nextTick(syncMonthAria))
const monthHint = computed(() => (ymOk.value
  ? ncFill(t('EIFO får tal for {period}, til og med {date}.'), { period: portalPeriod(null, obMonthEnd(ym.value)), date: obFmt(obMonthEnd(ym.value)) })
  : t('Vælg en afsluttet måned.')))
// Det andet system: "Vælg regnskabssystem" er tom, som den første mulighed i listen før
const otherValue = computed(() => (other.some(s => s.id === pick.value) ? pick.value : ''))
const otherOptions = computed(() => [{ value: '', label: t('Vælg regnskabssystem') }].concat(other.map(s => ({ value: s.id, label: s.name }))))
const onOther = (v) => { pick.value = v || null }

const faqKeys = ref([])
const onFoldKeydown = useCollapseKeyboard()
// Esc i den åbne liste lukker kun listen (også når kortet står i en a-drawer, fx forhåndsvisningen)
const selectEsc = useSelectEscape()
const companyName = computed(() => { version.value; return DATA.COMPANY.name })
const FULL = { span: 24 }
</script>

<template>
  <a-card>
    <a-typography-title>{{ t('Del regnskabstal med EIFO') }}</a-typography-title>
    <a-typography-paragraph type="secondary">
      {{ t('EIFO henter periodetal og debitordata direkte fra jeres regnskabssystem med læseadgang. Det er de samme tal, I ellers ville sende på mail.') }}
    </a-typography-paragraph>
    <a-alert
      v-if="declined"
      id="cwp-ob-erp-declined"
      class="erp-block"
      type="warning"
      role="status"
      tabindex="-1"
      :message="ncFill(t('I afviste adgangen i {src}. Intet er hentet, og EIFO har ikke fået adgang.'), { src: declined }) + ' ' + t('I kan vælge et andet system eller gå tilbage og uploade en saldobalance selv.')"
    />

    <a-form-item
      :label-col="FULL"
      :colon="false"
      :validate-status="show('mode') ? 'error' : ''"
    >
      <template #label>
        <span id="cwp-ob-share-label">{{ t('Hvor meget må EIFO se?') }}</span>
      </template>
      <div data-cust-act="data">
        <a-radio-group
          v-model:value="mode"
          name="cwp-ob-share"
          role="radiogroup"
          aria-labelledby="cwp-ob-share-label"
          :aria-describedby="show('mode') ? 'cwp-ob-share-err' : undefined"
        >
          <a-space direction="vertical">
            <a-radio value="ongoing">
              <a-typography-text strong>
                {{ t('Løbende deling (anbefalet)') }}
              </a-typography-text>
              <br>
              <a-typography-text type="secondary">
                {{ t('EIFO kan hente nye periodetal og debitordata, så I ikke skal sende filer frem og tilbage, og kan følge udviklingen, mens I har et lån eller en kaution hos EIFO. I kan trække adgangen tilbage når som helst.') }}
              </a-typography-text>
            </a-radio>
            <a-radio value="until">
              <a-typography-text strong>
                {{ t('Til og med en bestemt måned') }}
              </a-typography-text>
              <br>
              <a-typography-text type="secondary">
                {{ t('EIFO får periodetal og debitordata til og med den måned, I vælger, og ikke nyere tal. Adgangen lukker, når sagen er afgjort.') }}
              </a-typography-text>
            </a-radio>
          </a-space>
        </a-radio-group>
      </div>
      <template
        v-if="show('mode')"
        #help
      >
        <span id="cwp-ob-share-err">{{ t('Vælg, hvor meget EIFO må se.') }}</span>
      </template>
    </a-form-item>

    <a-form-item
      v-if="mode === 'until'"
      :label-col="FULL"
      :colon="false"
      :label="t('Til og med måned')"
      html-for="cwp-ob-month"
      :validate-status="ymOk ? '' : 'error'"
    >
      <div ref="monthWrap">
        <a-date-picker
          id="cwp-ob-month"
          v-model:value="ym"
          picker="month"
          value-format="YYYY-MM"
          format="MMMM YYYY"
          :disabled-date="disabledMonth"
          :disabled="preview"
        />
      </div>
      <template
        v-if="!ymOk"
        #help
      >
        <span id="cwp-ob-month-hint">{{ monthHint }}</span>
      </template>
      <template
        v-else
        #extra
      >
        <span id="cwp-ob-month-hint">{{ monthHint }}</span>
      </template>
    </a-form-item>

    <a-form-item
      :label-col="FULL"
      :colon="false"
      :validate-status="show('sys') ? 'error' : ''"
    >
      <template #label>
        <span id="cwp-ob-sys-label">{{ t('Jeres regnskabssystem') }}</span>
      </template>
      <div data-cust-act="data">
        <a-radio-group
          v-model:value="pick"
          name="cwp-ob-sys"
          role="radiogroup"
          aria-labelledby="cwp-ob-sys-label"
          :aria-describedby="show('sys') ? 'cwp-ob-sys-err' : undefined"
        >
          <a-radio
            v-for="s in top"
            :key="s.id"
            :value="s.id"
          >
            {{ s.name }}
          </a-radio>
        </a-radio-group>
      </div>
      <template
        v-if="show('sys')"
        #help
      >
        <span id="cwp-ob-sys-err">{{ t('Vælg jeres regnskabssystem.') }}</span>
      </template>
    </a-form-item>

    <a-form-item
      :label-col="FULL"
      :colon="false"
      :label="t('Kan I ikke se jeres system? Vælg det her.')"
      html-for="cwp-ob-sys-other"
    >
      <!-- I forhåndsvisningen er listen slået fra, og et klik på den gav ingen note før (en slået-fra
           <select> får ingen klik). a-select er en div, så kundehandlingen står kun på, når den er i brug. -->
      <div
        :data-cust-act="preview ? undefined : 'data'"
        @keydown.capture="selectEsc.onKeydownCapture"
        @keydown="selectEsc.onKeydown"
      >
        <a-select
          id="cwp-ob-sys-other"
          :value="otherValue"
          :options="otherOptions"
          :disabled="preview"
          @change="onOther"
        />
      </div>
    </a-form-item>

    <!-- Hvilke data deler I? Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter) -->
    <div
      class="erp-block"
      @keydown="onFoldKeydown"
    >
      <a-collapse
        v-model:active-key="faqKeys"
        ghost
        :expand-icon="collapseExpandIcon"
      >
        <a-collapse-panel
          key="faq"
          :header="t('Hvilke data deler I?')"
        >
          <a-typography>
            <a-typography-paragraph type="secondary">
              {{ t('EIFO gemmer dataene og bruger dem til at vurdere jeres ansøgning og i dialogen med jer om den.') }}
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
          </a-typography>
        </a-collapse-panel>
      </a-collapse>
    </div>

    <a-form-item
      :label-col="FULL"
      :colon="false"
      :validate-status="show('agree') ? 'error' : ''"
    >
      <div
        data-cust-act="data"
        class="cwp-ob-check"
      >
        <a-checkbox
          id="cwp-ob-agree"
          v-model:checked="yes"
          aria-required="true"
          :aria-invalid="show('agree') ? 'true' : undefined"
          :aria-describedby="show('agree') ? 'cwp-ob-agree-err' : undefined"
        >
          {{ t('Ja, vi accepterer at dele data med EIFO.') }}
        </a-checkbox>
      </div>
      <template
        v-if="show('agree')"
        #help
      >
        <span id="cwp-ob-agree-err">{{ t('Sæt kryds for at fortsætte.') }}</span>
      </template>
    </a-form-item>
    <!-- Revisoren eller rådgiveren på kundens vegne (gemt tilstand; afkrydsningen, der satte det, findes ikke længere) -->
    <a-form-item
      v-if="helper"
      :label-col="FULL"
      :colon="false"
      :validate-status="show('mandate') ? 'error' : ''"
    >
      <div
        data-cust-act="data"
        class="cwp-ob-check"
      >
        <a-checkbox
          id="cwp-ob-mandate"
          v-model:checked="mandate"
          aria-required="true"
          :aria-invalid="show('mandate') ? 'true' : undefined"
          :aria-describedby="show('mandate') ? 'cwp-ob-mandate-err' : undefined"
        >
          {{ ncFill(t('Jeg bekræfter, at jeg må give samtykke på vegne af {company}.'), { company: companyName }) }}
        </a-checkbox>
      </div>
      <template
        v-if="show('mandate')"
        #help
      >
        <span id="cwp-ob-mandate-err">{{ t('Bekræft, at du må give samtykke for virksomheden.') }}</span>
      </template>
    </a-form-item>

    <div class="erp-buttons">
      <a-button @click="emit('back')">
        {{ t('Tilbage') }}
      </a-button>
      <a-button
        type="primary"
        data-cust-act="data"
        @click="connect"
      >
        {{ src ? ncFill(t('Forbind {src}'), { src: src.name }) : t('Forbind') }}
      </a-button>
    </div>
    <ErpConnectModal
      v-if="run"
      :src="run"
      :sharing="sharing"
      @fetched="fetched"
      @close="runDone"
    />
  </a-card>
</template>

<style scoped>
.erp-block {
  margin-bottom: 24px;
}

.erp-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
