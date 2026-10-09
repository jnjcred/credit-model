<script setup>
// Forbind regnskabsprogram (som i Crediwire i dag): de tre mest brugte programmer som fliser og resten i
// en liste. Et valg åbner tre trin efter hinanden:
//   1. Aftale om regnskabsprogrammet (Crediwires aftale: "Accepter og forbind")
//   2. Adgang til regnskabsdata (løbende eller til og med en valgt måned, med EIFO)
//   3. Programmets eget login og samtykke og hentningen (ErpConnectModal.vue)
// Aftalen med EIFO om at dele data gives i registreringen (OnboardingUser.vue), ikke her.
// Fliserne viser programmernes egne logoer (src/assets/erp), ikke Crediwires fotos fra frontend-app (repoet er offentligt).
//
// Props: ingen.
// Emits: finished(src) (tallene er hentet, og kunden trykkede Fortsæt).
// Forhåndsvisningen: fliserne og listen bærer data-cust-act="erp", så portalen stopper klikket.
import { computed, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { ERP_SOURCES, ncFill, portalPeriod } from '@/domain/new_case_portal'
import { OB_OTHER_SYSTEMS, OB_TOP_SYSTEMS, obFmt, obLastMonth, obMonthEnd, obSharingText } from '@/domain/onboarding'
import { useSelectEscape } from '@/composables/useSelectEscape'
import ErpConnectModal from './ErpConnectModal.vue'
// Programmernes egne logoer (hentet fra deres hjemmesider 9. oktober 2026). Ikke Crediwires grafik.
import logoEconomic from '@/assets/erp/e-conomic.svg'
import logoBilly from '@/assets/erp/billy.svg'
import logoDinero from '@/assets/erp/dinero.svg'
const LOGOS = { ec: logoEconomic, bi: logoBilly, di: logoDinero }

const emit = defineEmits(['finished'])

const top = OB_TOP_SYSTEMS.map(id => ERP_SOURCES.find(s => s.id === id))
// Listen: kendte kilder bruges, som de er; resten får et demo-antal konti til hentningen
const others = OB_OTHER_SYSTEMS.map((name, i) => ERP_SOURCES.find(s => s.name === name) || { id: 'x' + i, name, accounts: 250 })
const otherOptions = others.map(s => ({ value: s.id, label: s.name }))

const sys = ref(null)        // det valgte program
const stage = ref(null)      // null | 'agreement' | 'sharing' | 'run'
const declined = ref(null)
const otherValue = ref(undefined)

const maxYm = obLastMonth()
const minYm = (Number(maxYm.slice(0, 4)) - 3) + '-01'
const mode = ref('until')
const ym = ref(maxYm)
const ymOk = computed(() => /^\d{4}-\d{2}$/.test(ym.value || '') && ym.value <= maxYm && ym.value >= minYm)
const sharing = computed(() => (mode.value === 'ongoing' ? { mode: 'ongoing' } : ymOk.value ? { mode: 'until', dataUntil: obMonthEnd(ym.value) } : null))
const disabledMonth = (d) => d.format('YYYY-MM') < minYm || d.format('YYYY-MM') > maxYm
const monthHint = computed(() => (ymOk.value
  ? ncFill(t('EIFO får tal for {period}, til og med {date}.'), { period: portalPeriod(null, obMonthEnd(ym.value)), date: obFmt(obMonthEnd(ym.value)) })
  : t('Vælg en afsluttet måned.')))
const modeOptions = computed(() => [
  { value: 'ongoing', label: t('Løbende deling af data') },
  { value: 'until', label: t('Deling af data til og med en valgt dato') },
])

function choose (s) {
  declined.value = null
  sys.value = s
  stage.value = 'agreement'
}
function onOther (id) {
  otherValue.value = id
  const s = others.find(x => x.id === id)
  if (s) choose(s)
}
const close = () => { stage.value = null }

// 1. Crediwires aftale om regnskabsprogrammet
function acceptAgreement () {
  CW.log('erp-agreement', ncFill(t('Kunden accepterede aftalen om at forbinde {src} med Crediwire'), { src: sys.value.name }), { who: 'kunde' })
  stage.value = 'sharing'
}
// 2. Adgang til regnskabsdata: valget gemmes, før programmets login åbner, så det står der, hvis kunden afbryder
function confirmSharing () {
  if (!sharing.value) { CW.focusSoon('#cwp-erp-month'); return }
  const now = new Date().toISOString()
  const sh = Object.assign({}, sharing.value, { at: now })
  const patch = { sharing: sh }
  // Aftalen med EIFO gives normalt i registreringen; mangler den (ældre bruger), gælder den her
  if (!CW.onboarding().agreement) patch.agreement = { at: now }
  if (CW.setOnboarding(patch, ncFill(t('Kunden valgte at dele periodetal og debitordata med EIFO ({sharing})'), { sharing: obSharingText(sh) })) === false) return
  stage.value = 'run'
}
// 3. Tallene er hentet: trinnet er gjort med det samme
const fetched = (s) => { CW.setOnboarding({ erp: { system: s.name, at: new Date().toISOString() } }) }
function runDone (res) {
  const s = sys.value
  stage.value = null
  if (res === 'declined') {
    CW.log('consent-declined', ncFill(t('Kunden afviste adgangen i {src}'), { src: s.name }), { who: 'kunde' })
    declined.value = s.name
    return
  }
  if (res === 'done') emit('finished', s)
}

const selectEsc = useSelectEscape()
</script>

<template>
  <!-- Som i Crediwire i dag: overskrift, tre kort med programmets logo øverst og "Vælg …" under, og listen -->
  <section class="erp-pick">
    <a-typography-title :level="2">
      {{ t('Forbind regnskabsprogram') }}
    </a-typography-title>

    <a-alert
      v-if="declined"
      class="erp-pick-block"
      type="warning"
      role="status"
      :message="ncFill(t('I afviste adgangen i {src}. Intet er hentet, og EIFO har ikke fået adgang.'), { src: declined })"
    />

    <a-row
      :gutter="[12, 12]"
      class="erp-pick-block"
    >
      <a-col
        v-for="s in top"
        :key="s.id"
        :xs="24"
        :sm="8"
      >
        <a-card
          class="erp-tile"
          hoverable
          role="button"
          tabindex="0"
          data-cust-act="erp"
          :aria-label="ncFill(t('Vælg {src}'), { src: s.name })"
          @click="choose(s)"
          @keydown.enter.prevent="choose(s)"
          @keydown.space.prevent="choose(s)"
        >
          <template #cover>
            <div class="erp-tile-cover">
              <img
                v-if="LOGOS[s.id]"
                :src="LOGOS[s.id]"
                alt=""
                aria-hidden="true"
              >
              <span
                v-else
                class="erp-tile-name"
              >{{ s.name }}</span>
            </div>
          </template>
          {{ ncFill(t('Vælg {src}'), { src: s.name }) }}
        </a-card>
      </a-col>
    </a-row>

    <a-form-item
      :label-col="{ span: 24 }"
      :colon="false"
      :label="t('Ser du ikke dit regnskabsprogram? Prøv dropdown-menuen')"
      html-for="cwp-erp-other"
    >
      <div
        data-cust-act="erp"
        @keydown.capture="selectEsc.onKeydownCapture"
        @keydown="selectEsc.onKeydown"
      >
        <a-select
          id="cwp-erp-other"
          :value="otherValue"
          show-search
          option-filter-prop="label"
          :options="otherOptions"
          :placeholder="t('Vælg regnskabsprogram')"
          @change="onOther"
        />
      </div>
    </a-form-item>

    <!-- 1. Crediwires aftale om regnskabsprogrammet -->
    <a-modal
      v-if="stage === 'agreement'"
      :visible="true"
      :width="440"
      :title="t('Aftale om regnskabsprogram')"
      :wrap-props="{ 'aria-modal': 'true' }"
      @cancel="close"
    >
      <a-typography-paragraph>
        {{ ncFill(t('Når du forbinder {src} med Crediwire, henter vi dine relevante data, f.eks. bogføringskonti og fakturaoplysninger. Det gør vi for at kunne give dig det bedste overblik. Du kan selv vælge at dele dataene med f.eks. din revisor eller bank. Dataene er dine, og Crediwire er kun formidler.'), { src: sys.name }) }}
      </a-typography-paragraph>
      <template #footer>
        <a-button @click="close">
          {{ t('Tilbage') }}
        </a-button>
        <a-button
          type="primary"
          @click="acceptAgreement"
        >
          {{ t('Accepter og forbind') }}
        </a-button>
      </template>
    </a-modal>

    <!-- 2. Adgang til regnskabsdata -->
    <a-modal
      v-if="stage === 'sharing'"
      :visible="true"
      :width="480"
      :title="t('Adgang til regnskabsdata')"
      :wrap-props="{ 'aria-modal': 'true' }"
      @cancel="close"
    >
      <a-typography-paragraph>
        {{ t('Du kan nu vælge, hvordan du og din virksomhed vil dele regnskabsdata med EIFO.') }}
      </a-typography-paragraph>
      <a-typography-paragraph>
        <a-typography-text strong>
          {{ t('1. Løbende deling af data') }}
        </a-typography-text>
        <a-typography-text type="success">
          {{ ' ' + t('(anbefalet)') }}
        </a-typography-text>
        <br>
        <a-typography-text type="secondary">
          {{ t('EIFO har løbende adgang til jeres periodetal og debitordata. Det gør dialogen nemmere, og I slipper for at sende filer frem og tilbage.') }}
        </a-typography-text>
      </a-typography-paragraph>
      <a-typography-paragraph>
        <a-typography-text strong>
          {{ t('2. Deling af data til og med en valgt dato') }}
        </a-typography-text>
        <br>
        <a-typography-text type="secondary">
          {{ t('EIFO får adgang til jeres periodetal og debitordata frem til og med en valgt dato.') }}
        </a-typography-text>
      </a-typography-paragraph>
      <a-form-item
        :label-col="{ span: 24 }"
        :colon="false"
        :label="t('Hvordan ønsker du at dele data?')"
        html-for="cwp-erp-mode"
      >
        <a-select
          id="cwp-erp-mode"
          v-model:value="mode"
          :options="modeOptions"
        />
      </a-form-item>
      <a-form-item
        v-if="mode === 'until'"
        :label-col="{ span: 24 }"
        :colon="false"
        :label="t('Angiv dato')"
        html-for="cwp-erp-month"
        :validate-status="ymOk ? '' : 'error'"
        :help="ymOk ? undefined : monthHint"
        :extra="ymOk ? monthHint : undefined"
      >
        <a-date-picker
          id="cwp-erp-month"
          v-model:value="ym"
          picker="month"
          value-format="YYYY-MM"
          format="MM-YYYY"
          :disabled-date="disabledMonth"
        />
      </a-form-item>
      <template #footer>
        <a-button @click="stage = 'agreement'">
          {{ t('Tilbage') }}
        </a-button>
        <a-button
          type="primary"
          @click="confirmSharing"
        >
          {{ t('Næste') }}
        </a-button>
      </template>
    </a-modal>

    <!-- 3. Programmets login og samtykke, derefter hentningen -->
    <ErpConnectModal
      v-if="stage === 'run'"
      :src="sys"
      :sharing="sharing"
      @fetched="fetched"
      @close="runDone"
    />
  </section>
</template>

<style scoped>
.erp-pick-block {
  margin-bottom: 16px;
}

/* Kortene: logoet på en lys flade øverst og "Vælg …" under, samme højde (som i Crediwire i dag) */
.erp-tile {
  height: 100%;
}

.erp-tile-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96px;
  padding: 16px;
  background: #f5f5f5;
}

.erp-tile-cover img {
  max-width: 100%;
  height: 32px;
}

.erp-tile-name {
  font-size: 20px;
  font-weight: 600;
}
</style>
