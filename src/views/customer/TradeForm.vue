<script setup>
// Salg fordelt på lande (customer_status.jsx: CWTradeForm): et spørgeskema, der starter tomt, plus
// en rapport i stedet. Efter en afvisning er de tidligere svar og filer med, så kunden kun retter
// det, rådgiveren bad om. "Færdig" kræver, at summen er 100 %, eller at kunden har vedhæftet en
// rapport i stedet for at udfylde. Bruges af portalens PortalTradeScreen.
//
// Props: itemId (punktet), idPrefix (præfiks for id'erne; standard 'cs', så felterne hedder
//        <idPrefix>-trade-q, <idPrefix>-trade-v-<landekode> osv.), answer (kundens svar på
//        rådgiverens spørgsmål, skrevet i portalens boks over skemaet).
// Emits: done (sendt).
// "Færdig med dette punkt" bærer data-cust-act="send": portalens forhåndsvisning stopper klikket.
// Kladden (landene og de valgte filer) gemmes ved hver ændring under 'kabul:portal-drafts:nordhavn',
// ikke ved start og aldrig i forhåndsvisningen (csSaveDraft). Filerne lægges straks i fillageret.
// Rapportens filfelt ligger i folden: elementet med data-cs-trade=<itemId> rummer a-upload, og selve
// <input type=file> har id'et <idPrefix>-trade-file (antdv 3.2.13's Upload sender ikke data-* videre
// til feltet). Folden tegnes altid (force-render), så feltet også findes, når den er lukket (som før).
// Ingen <form> om skemaet: Enter i landefeltet må ikke sende en formular (forhåndsvisningen
// stopper alle submit-hændelser).
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { Upload } from 'ant-design-vue'
import { CloseOutlined, ExclamationCircleOutlined, FileOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import {
  CS_COUNTRIES, CS_COUNTRY_ALIASES, CS_TRADE_ACCEPT, csAcceptFiles, csAdvisor, csClearDraft, csDraft,
  csFill, csFirst, csHHMM, csPct, csRemoveOwnFile, csSaveDraft, csStageFiles,
} from '@/domain/customer'
import { confirmRemove } from '@/services/feedback'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import { useSelectEscape } from '@/composables/useSelectEscape'
import { useUploadButton } from '@/composables/useUploadButton'

const props = defineProps({
  itemId: { type: String, required: true },
  idPrefix: { type: String, default: '' },
  answer: { type: String, default: '' },
})
const emit = defineEmits(['done'])

const version = useCaseVersion()
const s = computed(() => {
  version.value
  return CW.itemState(props.itemId)
})
const pid = computed(() => (props.idPrefix || 'cs') + '-trade')
const rejected = computed(() => !!(s.value && s.value.status === 'rejected'))
const prevRows = computed(() => (s.value && s.value.answers && Array.isArray(s.value.answers.countries)
  ? s.value.answers.countries.map(x => ({ c: x.code, n: x.name, v: csPct(x.pct) })) : []))

// Startværdierne læses én gang, når skemaet åbner (som useState før)
const draft0 = csDraft(props.itemId)
const s0 = s.value
const rows = shallowRef(draft0 && draft0.rows ? draft0.rows : prevRows.value)
const kept = shallowRef(rejected.value ? ((s0 && s0.files) || []) : [])
const staged = shallowRef(draft0 && draft0.files ? draft0.files : [])
const draftAt = ref(draft0 ? draft0.at : null)
// Kladden gemmes ved hver ændring af landene eller filerne, men ikke ved start
watch([rows, staged], () => {
  const d = csSaveDraft(props.itemId, { rows: rows.value, files: staged.value })
  draftAt.value = d ? d.at : null
})
const fileErr = ref('')
// Rapporten er et alternativ til skemaet og ligger i en fold, der er åben, når der er filer
const repOpen = ref(!!((draft0 && draft0.files && draft0.files.length) || (s0 && (s0.files || []).length)))
const q = ref('')

// Filer der allerede ligger på punktet (ikke efter afvisning: dem styrer "kept")
const current = computed(() => (!rejected.value && s.value ? (s.value.files || []) : []))
const needle = computed(() => q.value.trim().toLowerCase())
const filtered = computed(() => {
  const codes = rows.value.map(x => x.c)
  const n = needle.value
  const hit = (c) => !n || t(c.n).toLowerCase().includes(n) || c.n.toLowerCase().includes(n) || c.c.toLowerCase() === n
    || (CS_COUNTRY_ALIASES[c.c] || []).some(a => a.startsWith(n) || a === n)
  // Præcise træf (kode eller alias) først, så "us" giver USA før Australien
  const exact = (c) => c.c.toLowerCase() === n || (CS_COUNTRY_ALIASES[c.c] || []).includes(n) ? 0 : 1
  return CS_COUNTRIES.filter(c => !codes.includes(c.c) && hit(c)).sort((a, b) => exact(a) - exact(b)).slice(0, 8)
})
const countryOptions = computed(() => filtered.value.map(c => ({ value: c.c, label: t(c.n) })))
// Listen er åben (antdv's landefelt); bruges til den usynlige statuslinje ved ingen træf
const listOpen = ref(false)
const noMatch = computed(() => (filtered.value.length === 0 && needle.value ? csFill(t('Ingen lande matcher "{q}"'), { q: q.value.trim() }) : ''))

const add = (country) => {
  rows.value = [...rows.value, { ...country, v: '' }]
  q.value = ''
  // Fokus til andelen for det nye land, så man kan skrive videre
  setTimeout(() => { const el = document.getElementById(pid.value + '-v-' + country.c); if (el) el.focus() }, 30)
}
// antdv skriver landets kode i feltet, når et land vælges; feltet tømmes bagefter
function onSelect (code) {
  const country = CS_COUNTRIES.find(c => c.c === code)
  if (country) add(country)
  nextTick(() => { q.value = '' })
}
const remove = (code) => { rows.value = rows.value.filter(x => x.c !== code) }
const setVal = (code, v) => { rows.value = rows.value.map(x => x.c === code ? { ...x, v: v.replace(/[^0-9.,]/g, '') } : x) }

const num = (v) => parseFloat(String(v).replace(',', '.')) || 0
const sum = computed(() => rows.value.reduce((a, x) => a + num(x.v), 0))
const sumOk = computed(() => rows.value.length > 0 && Math.abs(sum.value - 100) < 0.05)
const sumWarn = computed(() => sum.value > 0 && !sumOk.value)
const fileCount = computed(() => kept.value.length + staged.value.length + current.value.length)
// Med en rapport er skemaet valgfrit: et halvt udfyldt skema blokerer ikke, men sendes kun med, når summen er 100 %
// Efter et spørgsmål kræver "Færdig" noget nyt: en fil, et ændret skema, en fjernet fil eller et svar
const fresh = computed(() => staged.value.length > 0 || !!props.answer || JSON.stringify(rows.value) !== JSON.stringify(prevRows.value) || kept.value.length !== ((s.value && s.value.files) || []).length)
const canSave = computed(() => (fileCount.value > 0 || (rows.value.length > 0 && sumOk.value)) && (!rejected.value || fresh.value))
const sendRows = computed(() => rows.value.length > 0 && sumOk.value)

function save () {
  if (!canSave.value) return
  const metas = staged.value // lagt i fillageret, da de blev valgt
  // Efter et spørgsmål står de sendte filer stadig; dem, kunden har fjernet her, fjernes nu
  if (rejected.value) ((s.value && s.value.files) || []).filter(f => !kept.value.some(k => k.id === f.id)).forEach(f => CW.removeFile(props.itemId, f.id, 'kunde'))
  csClearDraft(props.itemId)
  const answers = sendRows.value ? { countries: rows.value.map(x => ({ code: x.c, name: x.n, pct: Math.round(num(x.v) * 10) / 10 })) } : null
  // answer: kundens svar på rådgiverens spørgsmål, skrevet i portalens boks over skemaet
  CW.markReceived(props.itemId, { by: 'kunde', files: metas, answers, note: props.answer || '' })
  const it = CW.itemById(props.itemId)
  CW.toast(csFill(t('{punkt} er sendt til {navn}'), { punkt: it ? t(it.label) : '', navn: csFirst(csAdvisor().name) }))
  emit('done')
}

const sumText = computed(() => (sumOk.value ? t('Summen passer: 100 %')
  : sumWarn.value ? (sum.value < 100 ? csFill(t('Mangler {n} procentpoint'), { n: csPct(100 - sum.value) }) : csFill(t('{n} procentpoint for meget'), { n: csPct(sum.value - 100) }))
  : t('Angiv en andel for hvert land')))
const hint = computed(() => (canSave.value ? (rows.value.length > 0 && !sumOk.value ? t('Rapporten sendes. Skemaet kommer kun med, hvis summen er 100 %.') : '')
  : rows.value.length ? t('Summen skal være 100 %, før I kan sende.') : t('Tilføj mindst ét land, eller vedhæft en rapport.')))

// Rapporten: valgte filer lægges straks i fillageret (csStageFiles) og folden åbner.
// a-upload kalder for hver fil med hele valget; valget behandles samlet ved den første fil.
const setFileErr = (msg) => { fileErr.value = msg }
function onPick (file, fileList) {
  if (file === fileList[0]) {
    const f = csAcceptFiles(fileList, CS_TRADE_ACCEPT, setFileErr)
    if (f.length) { const m = csStageFiles(f, props.itemId); staged.value = staged.value.concat(m); repOpen.value = true }
  }
  return Upload.LIST_IGNORE
}
// Filer, der trækkes ind på knappen med en anden type, sorterer a-upload fra; de får samme besked
function onReject (rejectedFiles) {
  csAcceptFiles(rejectedFiles, CS_TRADE_ACCEPT, setFileErr)
}
// Folden er åben, når kunden har åbnet den, eller når der er en filfejl at vise
const foldKeys = computed(() => (repOpen.value || fileErr.value ? ['report'] : []))
function onFold (keys) {
  repOpen.value = (Array.isArray(keys) ? keys : [keys]).includes('report')
}
const onFoldKeydown = useCollapseKeyboard()
// Esc i den åbne liste lukker kun listen (også når skemaet står i en a-drawer, f.eks. forhåndsvisningen)
const selectEsc = useSelectEscape()
// Tastaturet i landefeltet som før, hvor antdv 3.2.13 opfører sig anderledes:
// - Esc: antdv giver feltet type="search", og i et søgefelt tømmer browseren feltet på Esc (og listen
//   åbner igen med alle lande). I prototypen lukkede Esc kun listen; teksten blev stående.
// - Enter tilføjer kun, når listen er åben. Ved en lukket liste åbner antdv den og vælger det første
//   land i samme tastetryk; i prototypen skete der intet.
function onSearchKeydownCapture (e) {
  selectEsc.onKeydownCapture(e)
  if (!e.target || e.target.id !== pid.value + '-q') return
  if (e.key === 'Escape') e.preventDefault()
  else if (e.key === 'Enter' && !listOpen.value) { e.preventDefault(); e.stopPropagation() }
}

// Filerne i folden: sendt (kan fjernes, hvis de er kundens egne), sendes med igen (efter et
// spørgsmål) og valgt nu (ikke sendt endnu)
const fileRows = computed(() => [].concat(
  current.value.map(f => ({ key: 'c:' + f.id, kind: 'current', f, note: t('Sendt'), canRemove: CW.canRemoveFile(props.itemId, f.id, 'kunde') })),
  kept.value.map(f => ({ key: 'k:' + f.id, kind: 'kept', f, note: t('Sendes med igen'), canRemove: (f.by || 'kunde') === 'kunde' })),
  staged.value.map((f, i) => ({ key: 'n' + i + f.name, kind: 'staged', f, i, note: CW.fmtSize(f.size), canRemove: true })),
))
function removeRow (r) {
  if (r.kind === 'current') csRemoveOwnFile(props.itemId, r.f)
  else if (r.kind === 'kept') confirmRemove(r.f.name, t('Filen fjernes, når I sender punktet.')).then(ok => { if (ok) kept.value = kept.value.filter(x => x.id !== r.f.id) })
  else confirmRemove(r.f.name, t('Filen er ikke sendt endnu.')).then(ok => { if (ok) staged.value = staged.value.filter((_, j) => j !== r.i) })
}
// Upload-knappen er det eneste Tab-stop (a-uploads omslag tages ud; se useUploadButton)
const uploadRoot = ref(null)
useUploadButton(uploadRoot)
</script>

<template>
  <div
    ref="uploadRoot"
    class="cs-trade"
  >
    <a-typography-paragraph type="secondary">
      {{ t('Tilføj de lande, I sælger til, og skriv ca. andelen af omsætningen. Summen skal være 100 %.') }}
    </a-typography-paragraph>

    <div
      class="cs-trade-search"
      @keydown.capture="onSearchKeydownCapture"
      @keydown="selectEsc.onKeydown"
    >
      <!-- Ingen træf: teksten står i listen som sekundær tekst (#notFoundContent). Uden tekst sendes
           null i stedet for slot'et, så der ikke åbner en tom liste -->
      <a-auto-complete
        :id="pid + '-q'"
        v-model:value="q"
        class="cs-trade-field"
        :options="countryOptions"
        :filter-option="false"
        :show-action="['focus']"
        :not-found-content="noMatch ? undefined : null"
        @select="onSelect"
        @dropdown-visible-change="(v) => { listOpen = v }"
      >
        <a-input
          :placeholder="t('Tilføj et land, f.eks. Tyskland')"
          :aria-label="t('Tilføj et land')"
        >
          <template #prefix>
            <SearchOutlined aria-hidden="true" />
          </template>
        </a-input>
        <template #notFoundContent>
          <a-typography-text type="secondary">
            {{ noMatch }}
          </a-typography-text>
        </template>
      </a-auto-complete>
      <!-- Ingen træf læses op (antdv's liste viser teksten, men er ingen levende region) -->
      <span
        class="sr-only"
        role="status"
      >{{ listOpen ? noMatch : '' }}</span>
    </div>

    <a-list
      v-if="rows.length > 0"
      class="cs-trade-rows"
      bordered
      row-key="c"
      :data-source="rows"
    >
      <template #renderItem="{ item: x }">
        <a-list-item>
          <label
            class="cs-trade-country"
            :for="pid + '-v-' + x.c"
          >{{ t(x.n) }}</label>
          <div class="cs-trade-share">
            <a-input
              :id="pid + '-v-' + x.c"
              class="cs-trade-pct"
              inputmode="decimal"
              placeholder="0"
              suffix="%"
              :value="x.v"
              @update:value="(v) => setVal(x.c, v)"
            />
            <a-button
              type="text"
              :aria-label="csFill(t('Fjern {navn}'), { navn: t(x.n) })"
              @click="remove(x.c)"
            >
              <template #icon>
                <CloseOutlined aria-hidden="true" />
              </template>
            </a-button>
          </div>
        </a-list-item>
      </template>
      <template #footer>
        <div
          class="cs-trade-sum"
          aria-live="polite"
        >
          <!-- Passer summen ikke, står teksten i normal farve med et gult advarselsikon foran
               (advarselsfarven er for lys til tekst) -->
          <span v-if="sumWarn">
            <a-typography-text type="warning">
              <ExclamationCircleOutlined aria-hidden="true" />
            </a-typography-text>
            {{ sumText }}
          </span>
          <a-typography-text
            v-else
            type="secondary"
          >
            {{ sumText }}
          </a-typography-text>
          <a-typography-text strong>
            {{ csPct(sum) }} %
          </a-typography-text>
        </div>
      </template>
    </a-list>

    <!-- Rapport i stedet for eller ud over skemaet. Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter) -->
    <div @keydown="onFoldKeydown">
      <a-collapse
        ghost
        :active-key="foldKeys"
        :expand-icon="collapseExpandIcon"
        @change="onFold"
      >
        <a-collapse-panel
          key="report"
          force-render
          :header="t('Vedhæft en rapport i stedet') + (fileCount ? ' (' + fileCount + ')' : '')"
        >
          <div class="cs-trade-report">
            <a-typography-text
              type="secondary"
              class="cs-trade-report-text"
            >
              {{ t('Har I en rapport over salget pr. land, kan I vedhæfte den. Så behøver I ikke udfylde skemaet.') }}
            </a-typography-text>
            <div :data-cs-trade="itemId">
              <a-upload
                :id="pid + '-file'"
                :show-upload-list="false"
                multiple
                :accept="CS_TRADE_ACCEPT"
                :before-upload="onPick"
                @reject="onReject"
              >
                <a-button>
                  <template #icon>
                    <UploadOutlined aria-hidden="true" />
                  </template>
                  {{ t('Vedhæft rapport') }}
                </a-button>
              </a-upload>
            </div>
          </div>
          <a-typography-paragraph
            v-if="fileErr"
            type="danger"
            role="alert"
          >
            {{ fileErr }}
          </a-typography-paragraph>
          <a-list
            v-if="fileRows.length > 0"
            size="small"
            :split="false"
            row-key="key"
            :data-source="fileRows"
          >
            <template #renderItem="{ item: r }">
              <a-list-item>
                <span class="cs-trade-file">
                  <FileOutlined aria-hidden="true" />
                  {{ ' ' }}{{ r.f.name }}
                </span>
                <span class="cs-trade-file-end">
                  <a-typography-text type="secondary">{{ r.note }}</a-typography-text>
                  <a-button
                    v-if="r.canRemove"
                    type="text"
                    :aria-label="csFill(t('Fjern {navn}'), { navn: r.f.name })"
                    @click="removeRow(r)"
                  >
                    <template #icon>
                      <CloseOutlined aria-hidden="true" />
                    </template>
                  </a-button>
                </span>
              </a-list-item>
            </template>
          </a-list>
        </a-collapse-panel>
      </a-collapse>
    </div>

    <div class="cs-stack">
      <a-typography-text
        v-if="draftAt"
        type="secondary"
        class="cs-draft-at"
      >
        {{ csFill(t('Kladde gemt kl. {tid}'), { tid: csHHMM(draftAt) }) }}
      </a-typography-text>
      <a-typography-text
        v-if="hint"
        :id="pid + '-hint'"
        type="secondary"
      >
        {{ hint }}
      </a-typography-text>
      <a-button
        type="primary"
        data-cust-act="send"
        :disabled="!canSave"
        :aria-describedby="hint ? pid + '-hint' : undefined"
        @click="save"
      >
        {{ t('Send') }}
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.cs-trade-search {
  margin-bottom: 16px;
}

.cs-trade-field {
  width: 100%;
}

.cs-trade-rows {
  margin-bottom: 16px;
}

.cs-trade-country {
  flex: 1;
  min-width: 0;
}

.cs-trade-share,
.cs-trade-file-end {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Andelen: plads til "100,0" og "%" */
.cs-trade-pct {
  width: 96px;
}

.cs-trade-sum {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cs-trade-report {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.cs-trade-report-text {
  flex: 1;
  min-width: 200px;
}

.cs-trade-file {
  min-width: 0;
  word-break: break-all;
}

.cs-stack {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px 12px;
  margin-top: 16px;
}
</style>
