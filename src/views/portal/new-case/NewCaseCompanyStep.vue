<script setup>
// Ny sag, trin 1 "Find virksomheden" (new_case_portal.jsx L270-350): søgefeltet (CVR eller navn),
// eksemplet, CVR-hints, søgeresultaterne, den valgte virksomhed og dens åbne sager.
// Søgningen slår kun op blandt de virksomheder, demoen kender (ncKnownCompanies).
//
// Props: q (søgeteksten), company (den valgte virksomhed eller null),
//        error ('company', når "Næste" er forsøgt uden virksomhed; ellers null).
// Emits: query (ny søgetekst; guiden rydder valget og vælger selv ved et kendt CVR),
//        pick (virksomhed), change-company ("Skift"), open-case (sagens id, "Åbn sagen").
import { computed } from 'vue'
import { Empty } from 'ant-design-vue'
import { ArrowRightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { ncCvrDigits, ncFill, ncFmtDKK, ncKnownCompanies, ncOpenCasesFor } from '@/domain/new_case_portal'
import { useCaseVersion } from '@/composables/useCaseVersion'

const props = defineProps({
  q: { type: String, default: '' },
  company: { type: Object, default: null },
  error: { type: String, default: null },
})
const emit = defineEmits(['query', 'pick', 'change-company', 'open-case'])

const caseVersion = useCaseVersion()
const invalid = computed(() => props.error === 'company')

// Søgning: 8 cifre = CVR-opslag, bogstaver = navnesøgning blandt kendte virksomheder
const search = computed(() => {
  caseVersion.value
  const q = props.q
  const digits = ncCvrDigits(q)
  const hasLetters = /[a-zæøå]/i.test(q)
  let results = null, cvrState = null
  if (!props.company) {
    if (hasLetters && q.trim().length >= 2) {
      const needle = q.trim().toLowerCase()
      results = ncKnownCompanies().filter(c => c.name.toLowerCase().includes(needle))
    } else if (!hasLetters && digits.length === 8) cvrState = 'none'
    else if (!hasLetters && digits.length > 0) cvrState = digits.length > 8 ? 'long' : 'short'
  }
  return { results, cvrState }
})
const results = computed(() => search.value.results)
const cvrState = computed(() => search.value.cvrState)
const openCases = computed(() => {
  caseVersion.value
  return props.company ? ncOpenCasesFor(props.company) : []
})

const companyMeta = computed(() => {
  const c = props.company
  if (!c) return ''
  return c.primary ? DATA.COMPANY.address + ', ' + DATA.COMPANY.postal + ' · CVR ' + DATA.COMPANY.cvr
    : c.adhoc ? (c.cvr ? 'CVR ' + c.cvr + ' · ' : '') + t('Ikke kunde i porteføljen endnu')
      : 'CVR ' + c.cvr + ' · ' + t('Eksisterende kunde hos EIFO') + (c.portfolio && c.dept ? ' · ' + c.dept : '')
})
// Hårdt mellemrum før "CVR" i søgeresultatets knap (a-button fjerner almindelige mellemrum omkring sin tekst)
const NBSP = String.fromCharCode(160)
const caseAmount = (c) => (/^\d+$/.test(String(c.amount)) ? ncFmtDKK(+c.amount) : 'DKK ' + c.amount)
</script>

<template>
  <a-form layout="vertical">
    <a-form-item
      :label="t('CVR-nummer eller virksomhedsnavn')"
      html-for="nc-q"
      :validate-status="cvrState === 'long' || invalid ? 'error' : ''"
    >
      <a-input
        id="nc-q"
        size="large"
        :value="q"
        :placeholder="t('fx') + ' ' + DATA.COMPANY.cvr"
        autocomplete="off"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="'nc-q-hint' + (invalid ? ' nc-q-err' : '')"
        @update:value="(v) => emit('query', v)"
      />
      <!-- Fejlene (role="alert"): for mange cifre, og "Næste" uden en virksomhed. Én blok, så
           antdv ikke viser en forsvindende fejl to gange, når den ene af dem går væk -->
      <template
        v-if="cvrState === 'long' || invalid"
        #help
      >
        <div>
          <div v-if="cvrState === 'long'">
            {{ t('Et CVR-nummer har 8 cifre.') }}
          </div>
          <div
            v-if="invalid"
            id="nc-q-err"
          >
            {{ t('Vælg en virksomhed for at fortsætte.') }}
          </div>
        </div>
      </template>
      <template #extra>
        <span id="nc-q-hint">{{ t('Vi finder selskabsdata automatisk fra CVR-registret.') }}</span>
      </template>
    </a-form-item>
  </a-form>

  <a-space
    direction="vertical"
    :size="16"
    class="nc-stack"
  >
    <a-row
      v-if="!company && q.trim().length === 0"
      justify="center"
    >
      <a-space wrap>
        <a-typography-text type="secondary">
          {{ t('Indtast CVR eller virksomhedsnavn, prøv fx') }}
        </a-typography-text>
        <a-button
          size="small"
          @click="emit('query', DATA.COMPANY.cvr)"
        >
          {{ DATA.COMPANY.cvr }}
        </a-button>
      </a-space>
    </a-row>
    <a-typography-text
      v-if="cvrState === 'short'"
      type="secondary"
    >
      {{ t('Et CVR-nummer har 8 cifre.') }}
    </a-typography-text>
    <a-empty
      v-if="cvrState === 'none' || (results && results.length === 0)"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    >
      <template #description>
        <a-typography-text strong>
          {{ t('Ingen virksomhed fundet') }}
        </a-typography-text>
        <br>
        <a-typography-text type="secondary">
          {{ cvrState === 'none'
            ? ncFill(t('Ingen kunde i porteføljen eller på sagslisten har CVR {cvr}. Demoen slår kun op blandt EIFOs egne kunder. Tjek nummeret, eller søg på navnet.'), { cvr: q.trim() })
            : ncFill(t('Ingen virksomheder matcher "{q}". Prøv en del af navnet eller CVR-nummeret.'), { q: q.trim() }) }}
        </a-typography-text>
      </template>
    </a-empty>
    <!-- Søgeresultaterne: en knap pr. virksomhed med navn og CVR (som før) -->
    <a-list
      v-if="results && results.length > 0"
      bordered
      size="small"
      :data-source="results"
      row-key="key"
      role="group"
      :aria-label="t('Søgeresultater')"
    >
      <template #renderItem="{ item: c }">
        <a-list-item>
          <!-- Hele rækken er knappen (navn til venstre, CVR til højre), som før. a-button fjerner mellemrum
               omkring sin tekst; mellemrummet før CVR er derfor hårdt (det kommer med i knappens navn) -->
          <a-button
            type="link"
            block
            class="nc-result"
            @click="emit('pick', c)"
          >
            {{ c.name }}
            <a-typography-text type="secondary">
              {{ NBSP + 'CVR ' + c.cvr }}
            </a-typography-text>
          </a-button>
        </a-list-item>
      </template>
    </a-list>

    <a-card
      v-if="company"
      size="small"
    >
      <template #title>
        {{ company.name }}
        <a-typography-text
          v-if="!company.adhoc"
          type="secondary"
        >
          {{ t('Fundet i CVR') }}
        </a-typography-text>
      </template>
      <template #extra>
        <a-button
          type="link"
          size="small"
          @click="emit('change-company')"
        >
          {{ t('Skift') }}
        </a-button>
      </template>
      <a-typography-text type="secondary">
        {{ companyMeta }}
      </a-typography-text>
    </a-card>

    <div v-if="company && openCases.length > 0">
      <a-alert
        type="warning"
        role="status"
      >
        <template #message>
          <a-typography-text strong>
            {{ ncFill(openCases.length === 1 ? t('{name} har allerede en åben sag.') : t('{name} har allerede {n} åbne sager.'), { name: company.name, n: openCases.length }) }}
          </a-typography-text>
          {{ ' ' + t('Opret kun en ny sag, hvis det er en ny ansøgning. Den nye sag får sit eget sagsnummer og rører ikke den åbne sag.') }}
        </template>
      </a-alert>
      <a-list
        :data-source="openCases"
        row-key="id"
      >
        <template #renderItem="{ item: c }">
          <a-list-item>
            <span>
              <a-typography-text strong>{{ c.caseNr }}</a-typography-text>
              {{ ' ' }}
              <a-typography-text type="secondary">{{ t(c.type) }} · {{ caseAmount(c) }} · {{ c.responsible }}</a-typography-text>
            </span>
            <template #actions>
              <a-button
                type="link"
                size="small"
                @click="emit('open-case', c.id)"
              >
                {{ t('Åbn sagen') }}
                <ArrowRightOutlined aria-hidden="true" />
              </a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>
    </div>
  </a-space>
</template>

<style scoped>
/* Blokkene under søgefeltet står under hinanden i hele bredden */
.nc-stack {
  width: 100%;
}

/* Et søgeresultat fylder rækken; navnet kan bryde, CVR står til højre */
.nc-result {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  height: auto;
  white-space: normal;
  text-align: left;
}
</style>
