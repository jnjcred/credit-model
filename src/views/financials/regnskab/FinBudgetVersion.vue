<script setup>
/* Budgettets versioner over Regnskab (9. oktober 2026, Jesper): punktet Budget er source of truth.
   Vælgeren viser de budgetter, der findes: kundens budget og rådgiverens versioner (hver med et navn,
   rådgiveren selv vælger, standard "Budget 2", "Budget 3" ...). Regnskab bruger det valgte. Rådgiveren kan
   uploade et nyt budget, omdøbe og dele det med kunden, og hente filen. Data: finVersions.js (versionerne)
   og finSources.js (kilden). Vises ikke i demovisningen, og uden budget står importen i grafens boks "Intet budget".
   Upload af et nyt budget står i foldet "Upload et andet budget" under "Sådan er tallene beregnet" (AnnualReportSection).
   Props: src (sagens kilder, finSourceState), locked (sagen er indstillet: kun teksten) */
import { computed, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { finFill } from '@/domain/financials/finFormat'
import { finActiveVersionId, finRenameVersion, finSetActiveVersion, finShareVersion, finVersionLabel, finVersionsOf } from '@/domain/financials/finVersions'
import { useCaseVersion } from '@/composables/useCaseVersion'

const props = defineProps({
  src: { type: Object, required: true },
  locked: { type: Boolean, default: false },
})

const CUSTOMER = 'customer'
const version = useCaseVersion()
const state = computed(() => {
  version.value
  const s = props.src
  const list = finVersionsOf('m-budget').list
  const item = CW.itemState('m-budget')
  const custFile = s.customerBudget && item && item.files && item.files[0] ? item.files[0] : null
  if (!s.budget && !list.length) return null
  const activeId = finActiveVersionId('m-budget')
  const ver = activeId ? list.find(x => x.id === activeId) : null
  // Vælgeren: kundens budget (når kunden har sendt et) og rådgiverens versioner, nyeste sidst
  const options = []
  if (custFile || s.customerBudget || !list.length) options.push({ value: CUSTOMER, label: t('Kundens budget') })
  list.forEach((v, i) => options.push({ value: v.id, label: finVersionLabel(v, i) }))
  const info = ver
    ? finFill(t('{fil}, {navn} {dato}'), { fil: ver.name, navn: ver.by, dato: CW.fmtDate && ver.at ? CW.fmtDate(ver.at) : '' }) + (ver.basis ? ' · ' + finFill(t('bygget på kundens {fil}'), { fil: ver.basis }) : '')
    : custFile ? custFile.name : ''
  const url = ver && ver.fileId ? CW.fileUrl(ver.fileId) : custFile ? CW.fileUrl(custFile.id) : null
  return { ver, custFile, options, value: activeId || CUSTOMER, info, url, file: ver ? ver.name : custFile ? custFile.name : null }
})

// Omdøbning: rådgiveren skriver navnet i et felt, Enter eller at man forlader feltet gemmer det
const renaming = ref(false)
const draft = ref('')
const startRename = () => { if (!state.value || !state.value.ver) return; draft.value = finVersionLabel(state.value.ver, finVersionsOf('m-budget').list.indexOf(state.value.ver)); renaming.value = true }
const saveRename = () => {
  if (!renaming.value) return
  renaming.value = false
  if (state.value && state.value.ver && draft.value.trim()) finRenameVersion('m-budget', state.value.ver.id, draft.value)
}
const onPick = (v) => finSetActiveVersion('m-budget', v)
</script>

<template>
  <div
    v-if="state"
    class="fin-budget-ver"
    role="group"
    :aria-label="t('Budgettets kilde')"
  >
    <div class="fin-budget-ver-pick">
      <a-typography-text type="secondary">
        {{ t('Budget') }}:
      </a-typography-text>
      <a-select
        class="fin-budget-ver-select"
        size="small"
        :value="state.value"
        :options="state.options"
        :disabled="locked"
        :aria-label="t('Vælg budget')"
        :dropdown-match-select-width="false"
        @change="onPick"
      />
      <a-tag
        v-if="state.ver"
        :color="state.ver.shared ? 'blue' : undefined"
      >
        {{ state.ver.shared ? t('Delt med kunden') : t('Ikke delt med kunden') }}
      </a-tag>
      <a-typography-text
        v-if="state.info"
        type="secondary"
        class="fin-budget-ver-info"
      >
        {{ state.info }}
      </a-typography-text>
    </div>

    <span class="fin-budget-ver-acts">
      <template v-if="state.ver && !locked">
        <a-input
          v-if="renaming"
          v-model:value="draft"
          size="small"
          class="fin-budget-ver-name"
          :maxlength="40"
          :aria-label="t('Navnet på budgettet')"
          @press-enter="saveRename"
          @blur="saveRename"
        />
        <a-button
          v-else
          class="cw-link"
          type="link"
          size="small"
          @click="startRename"
        >
          {{ t('Omdøb') }}
        </a-button>
        <a-button
          class="cw-link"
          type="link"
          size="small"
          @click="finShareVersion('m-budget', state.ver.id, !state.ver.shared)"
        >
          {{ state.ver.shared ? t('Fjern deling') : t('Del med kunden') }}
        </a-button>
      </template>
      <a-button
        v-if="state.url"
        class="cw-link"
        type="link"
        size="small"
        :href="state.url"
        :download="state.file"
      >
        {{ t('Hent fil') }}
      </a-button>
    </span>
  </div>
</template>

<style scoped>
/* Én stille linje som advarslen om kontomappingen; vælgeren står først, knapperne yderst til højre */
.fin-budget-ver {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.fin-budget-ver-pick {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.fin-budget-ver-select {
  min-width: 160px;
}

.fin-budget-ver-name {
  width: 180px;
}

.fin-budget-ver-acts {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
</style>
