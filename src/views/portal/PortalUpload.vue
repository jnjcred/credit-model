<script setup>
// Et uploadpunkt i kundens portal (new_case_portal.jsx: PortalUpload, L2060–2123): titel, beskrivelse og
// "Hvorfor", et spørgsmål fra rådgiveren (svarfeltet står øverst), de filer, der allerede er sendt,
// filvælgeren, en bemærkning og "Send". "Har vi ikke / ikke relevant" skjuler upload
// og knap (én primærknap).
//
// Budgettet (9. oktober, Jesper): kunden angiver sit regnskabsår, og der står, at vi kun godkender
// budgetter for hele regnskabsår. Regnskabsåret er påkrævet for at sende og gemmes på sagen
// (portalSetFiscalYear: CW.onboarding().fiscalYear).
//
// Props: item (punktet).
// Emits: back (tilbage til oversigten), finish(files, note, fiscal) (kunden er færdig; portalen gemmer;
//        fiscal er regnskabsårets første måned 1-12 på budgettet, ellers null),
//        noted (formularen "Har vi ikke" er sendt).
// Kladden (valgte filer og bemærkning) gemmes ved hver ændring (usePortalDraft) og hentes, når siden
// åbner. "Send" bruger den rigtige disabled-attribut med en tilknyttet forklaring,
// som før, og bærer data-cust-act="send" og data-pv-allow (rådgiveren kan uploade på kundens vegne).
import { computed, ref, shallowRef, watch } from 'vue'
import dayjs from 'dayjs'
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csDraft, csHHMM } from '@/domain/customer'
import { ncFill, portalFiscalOptions } from '@/domain/new_case_portal'
import { useCase } from '@/composables/useCaseVersion'
import { finSharedVersions } from '@/domain/financials/finVersions'
import { usePortalDraft } from './usePortalDraft'
import PortalBackNav from './components/PortalBackNav.vue'
import PortalItemHead from './components/PortalItemHead.vue'
import PortalNotedToggle from './components/PortalNotedToggle.vue'
import PortalSentFiles from './components/PortalSentFiles.vue'
import PortalFilePicker from './components/PortalFilePicker.vue'
import PortalBudgetCheck from './components/PortalBudgetCheck.vue'

const props = defineProps({
  item: { type: Object, required: true },
})
const emit = defineEmits(['back', 'finish', 'noted'])

const s = useCase(() => CW.itemState(props.item.id))
// Afvist, eller afvist og derefter sendt til en hjælper: de gamle filer gælder ikke længere
const rejected = computed(() => !!s.value && s.value.status === 'delegated' && !!s.value.reviewedAt)
const existing = computed(() => (s.value && !rejected.value ? (s.value.files || []) : []))
// Startværdierne læses én gang, når siden åbner (som useState før)
const draft0 = csDraft(props.item.id)
const s0 = s.value
const staged = shallowRef(draft0 && draft0.files ? draft0.files : [])
const note = ref(draft0 && draft0.note != null ? draft0.note : s0 && s0.status === 'received' && s0.noteKind !== 'system' ? (s0.note || '') : '')
const noteOpen = ref(!!note.value)
const notedOpen = ref(false)
const draftAt = usePortalDraft(props.item.id, () => ({ files: staged.value, note: note.value }))
const total = computed(() => existing.value.length + staged.value.length)
const adv = 'EIFO'   // kunden skriver til og hører fra EIFO; rådgiverens navn står kun på kontaktkortet
const canNote = computed(() => existing.value.length === 0 && (!s.value || s.value.status !== 'noted'))
const preview = useCase(() => CW.isPreview())
// Rådgiveren (Kundeside) kan færdiggøre punktet med blot en bemærkning, f.eks. når en fil ikke er relevant for virksomheden
const noteOnly = computed(() => preview.value && total.value === 0 && !!note.value.trim())
// Spørgsmål fra rådgiveren: svarfeltet står øverst, og et svar alene kan sendes
const asked = computed(() => !!s.value && s.value.status === 'rejected')
// Budgettet: regnskabsåret (første måned), som kunden har angivet før, eller intet
const isBudget = computed(() => props.item.id === 'm-budget')
const fiscal = ref((CW.onboarding().fiscalYear || {}).start || null)
const fiscalOptions = computed(() => portalFiscalOptions())
// De to almindelige regnskabsår står som synlige valg (januar-december og juli-juni); alle andre bag "Andet"
const FISCAL_COMMON = [1, 7]
// Længden: 12 måneder er normalt; et kort eller langt (første) regnskabsår er 1-18
const FISCAL_MAX_LEN = 18
const fiscalLen = ref((CW.onboarding().fiscalYear || {}).months || 12)
const fiscalOther = ref(!!fiscal.value && (!FISCAL_COMMON.includes(fiscal.value) || fiscalLen.value !== 12))
const fiscalChoice = computed(() => (fiscalOther.value ? 'other' : fiscal.value))
// "Andet": en datovælger pr. regnskabsår med første og sidste dag; "Tilføj regnskabsår" lægger en række til.
// Første række giver startmåned og længde (resten af appen læser kun dem); alle rækker gemmes som perioder
const rangeLen = (r) => (r && r[0] && r[1] ? Math.max(1, Math.round(r[1].add(1, 'day').diff(r[0], 'month', true))) : null)
const rangeOk = (r) => { const n = rangeLen(r); return n !== null && n <= FISCAL_MAX_LEN }
const savedPeriods = (CW.onboarding().fiscalYear || {}).periods
function initialRanges () {
  if (!fiscalOther.value) return [null]
  if (savedPeriods && savedPeriods.length) return savedPeriods.map(x => [dayjs(x.from), dayjs(x.to)])
  const start = dayjs().month(fiscal.value - 1).startOf('month')
  return [[start, start.add(fiscalLen.value, 'month').subtract(1, 'day')]]
}
const fiscalRanges = ref(initialRanges())
watch(fiscalRanges, (rs) => {
  const r = rs[0]
  if (rangeLen(r)) {
    fiscal.value = r[0].month() + 1
    fiscalLen.value = rangeLen(r)
  } else if (fiscalOther.value) {
    fiscal.value = null
  }
}, { deep: true })
const addFiscalYear = () => { fiscalRanges.value.push(null) }
const removeFiscalYear = (i) => { fiscalRanges.value.splice(i, 1) }
const fiscalPeriods = computed(() => fiscalRanges.value.filter(rangeOk).map(r => ({ from: r[0].format('YYYY-MM-DD'), to: r[1].format('YYYY-MM-DD') })))
const fiscalValid = computed(() => !fiscalOther.value || (fiscalRanges.value.length > 0 && fiscalRanges.value.every(rangeOk)))
function chooseFiscal (v) {
  fiscalOther.value = v === 'other'
  if (fiscalOther.value) {
    fiscal.value = rangeLen(fiscalRanges.value[0]) ? fiscalRanges.value[0][0].month() + 1 : null
  } else {
    fiscalLen.value = 12
    fiscal.value = v
  }
}
// Rådgiverens versioner af budgettet, som rådgiveren har delt (finVersions.js); andre ser kunden ikke
const shared = useCase(() => (props.item.id === 'm-budget' ? finSharedVersions('m-budget').map(v => ({ ...v, url: v.fileId ? CW.fileUrl(v.fileId) : null })) : []))
const fiscalOk = computed(() => !!(fiscal.value && fiscalLen.value >= 1 && fiscalLen.value <= FISCAL_MAX_LEN && fiscalValid.value))
// Med et spørgsmål kræver knappen noget nyt: et svar eller en fil (de sendte filer står allerede)
// Nulkontrollen i budgetfilen går ikke op, og kunden har hverken rettet filen eller valgt at sende alligevel
const budgetBlocked = ref(false)
const canFinish = computed(() => !budgetBlocked.value &&(asked.value ? staged.value.length > 0 || !!note.value.trim() : total.value > 0 || noteOnly.value))
const hint = computed(() => (budgetBlocked.value === 'coverage' ? t('Lav budgettet om, så det dækker hele regnskabsåret, og upload det igen') : budgetBlocked.value ? t('Ret budgettet, eller vælg Send alligevel') : asked.value ? t('Skriv et svar, eller vælg en fil') : preview.value ? t('Vælg en fil, eller skriv en bemærkning') : t('Vælg mindst én fil')))
const FULL = { span: 24 }

function openNote () {
  noteOpen.value = true
  CW.focusSoon('#cwp-note')
}
</script>

<template>
  <div class="portal-item">
    <PortalBackNav @back="emit('back')" />
    <!-- Punktets indhold i et kort; tilbage-knappen står over det -->
    <a-card :bordered="false">
      <PortalItemHead
        v-model:answer="note"
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
        <a-typography-title
          v-if="asked"
          :level="2"
        >
          {{ existing.length ? t('Tilføj en fil, hvis der er brug for det') : t('Send en ny fil, hvis der er brug for det') }}
        </a-typography-title>
        <PortalSentFiles
          :item="item"
          :files="existing"
        />
        <!-- Rådgiverens version af budgettet, når den er delt med kunden -->
        <div
          v-if="shared.length"
          class="portal-item-gap"
        >
          <a-typography-text strong>
            {{ ncFill(t('{adv} har lavet en version af budgettet'), { adv }) }}
          </a-typography-text>
          <ul class="portal-shared">
            <li
              v-for="v in shared"
              :key="v.id"
            >
              <a
                v-if="v.url"
                :href="v.url"
                :download="v.name"
              >{{ v.name }}</a>
              <span v-else>{{ v.name }}</span>
            </li>
          </ul>
        </div>
        <!-- Budgettet: hele regnskabsår og regnskabsåret -->
        <template v-if="isBudget && !asked">
          <div class="portal-item-gap portal-budget-rule">
            <InfoCircleOutlined
              class="portal-budget-rule-icon"
              aria-hidden="true"
            />
            <a-typography-text>
              <strong>{{ t('Vi godkender kun budgetter for hele regnskabsår.') }}</strong>
              {{ ' ' + t('Send budgettet for hele det indeværende og hele det næste regnskabsår. Er budgettet lavet midt i året, så tag årets realiserede måneder med.') }}
            </a-typography-text>
          </div>
        </template>
        <PortalFilePicker
          v-model:staged="staged"
          :item-id="item.id"
        />
        <PortalBudgetCheck
          v-if="isBudget && !asked && staged.length"
          :files="staged"
          :fiscal="fiscal"
          :fiscal-len="fiscalLen"
          :fiscal-done="fiscalOk"
          @update:blocked="(v) => { budgetBlocked = v }"
        >
          <template #fiscal>
            <a-radio-group
              id="cwp-fiscal"
              :value="fiscalChoice"
              @update:value="chooseFiscal"
            >
              <a-radio-button
                v-for="o in FISCAL_COMMON.map(m => fiscalOptions[m - 1])"
                :key="o.value"
                :value="o.value"
              >
                {{ o.label }}
              </a-radio-button>
              <a-radio-button value="other">
                {{ t('Andet regnskabsår') }}
              </a-radio-button>
            </a-radio-group>
            <div
              v-if="fiscalOther"
              class="portal-item-gap"
            >
              <div
                v-for="(r, i) in fiscalRanges"
                :key="i"
                class="portal-fiscal-row"
              >
                <a-range-picker
                  v-model:value="fiscalRanges[i]"
                  class="portal-fiscal-range"
                  format="D. MMM YYYY"
                  :placeholder="[t('Første dag'), t('Sidste dag')]"
                  :aria-label="t('Regnskabsår') + ' ' + (i + 1)"
                />
                <a-button
                  v-if="fiscalRanges.length > 1"
                  type="text"
                  :aria-label="t('Fjern regnskabsår') + ' ' + (i + 1)"
                  @click="removeFiscalYear(i)"
                >
                  {{ t('Fjern') }}
                </a-button>
                <div v-if="rangeLen(r) > FISCAL_MAX_LEN">
                  <a-typography-text type="danger">
                    {{ t('Et regnskabsår kan højst være 18 måneder.') }}
                  </a-typography-text>
                </div>
              </div>
              <a-button
                type="link"
                class="portal-fiscal-add"
                @click="addFiscalYear"
              >
                <template #icon>
                  <PlusOutlined aria-hidden="true" />
                </template>
                {{ t('Tilføj regnskabsår') }}
              </a-button>
            </div>
          </template>
        </PortalBudgetCheck>

        <template v-if="!asked">
          <a-form-item
            v-if="noteOpen"
            class="portal-item-gap"
            :label="ncFill(t('Bemærkning til {adv} (valgfri)'), { adv })"
            html-for="cwp-note"
            :label-col="FULL"
            :colon="false"
          >
            <a-textarea
              id="cwp-note"
              v-model:value="note"
              :rows="2"
              :placeholder="t('F.eks. hvilken version det er, eller hvad der mangler')"
            />
          </a-form-item>
          <a-button
            v-else
            class="portal-item-gap portal-note-btn"
            type="text"
            @click="openNote"
          >
            <template #icon>
              <PlusOutlined aria-hidden="true" />
            </template>
            {{ t('Tilføj en bemærkning') }}
          </a-button>
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
          <div class="portal-item-send">
            <a-typography-text
              v-if="draftAt"
              type="secondary"
              class="cwp-draft-at"
            >
              {{ ncFill(t('Kladde gemt kl. {tid}'), { tid: csHHMM(draftAt) }) }}
            </a-typography-text>
            <a-typography-text
              v-if="!canFinish"
              id="cwp-up-hint"
              type="secondary"
            >
              {{ hint }}
            </a-typography-text>
            <a-button
              type="primary"
              data-cust-act="send"
              data-pv-allow="1"
              :disabled="!canFinish"
              :aria-describedby="!canFinish ? 'cwp-up-hint' : undefined"
              @click="emit('finish', staged, note.trim(), isBudget ? fiscal : null, isBudget ? fiscalLen : null, isBudget && fiscalOther ? fiscalPeriods : null)"
            >
              {{ t('Send') }}
            </a-button>
          </div>
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

/* "Tilføj en bemærkning" er tekst, der kan klikkes, ikke en svævende knap: ingen kasse, ingen indrykning */
.portal-note-btn {
  height: auto;
  padding: 0;
  margin-left: 0;
  background: transparent;
  box-shadow: none;
  color: inherit;
}

.portal-note-btn:hover {
  color: #1677ff;
  background: transparent;
}

.portal-item-gap {
  margin-top: 12px;
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

.portal-budget-rule {
  display: flex;
  margin-bottom: 16px;
  gap: 8px;
  align-items: flex-start;
}

.portal-budget-rule-icon {
  margin-top: 5px;
  color: #1890ff;
}

.portal-note-btn {
  padding-inline-start: 0;
}

.portal-shared {
  margin: 4px 0 0;
  padding-left: 20px;
}

.portal-fiscal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
  margin-top: 8px;
}

.portal-fiscal-range {
  max-width: 360px;
}

.portal-fiscal-add {
  padding-left: 0;
}

/* Almindelig flex, ikke a-space: a-space lægger en negativ margin under elementerne, når de bryder, og så står knappen lavere end "Har vi ikke" */
.portal-item-send {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: flex-end;
  margin-left: auto;
}
</style>
