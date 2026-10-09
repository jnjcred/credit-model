<script setup>
// Produkt, marked og branche (financials.jsx: MarketSection): produktbeskrivelsen og markedet som
// AI-tekster (FinAiBlock) i hver sit kort, og PEST-analysen i en fold under markedet. Underteksten
// siger, hvad afsnittet rummer; at teksterne er AI-sammenfattet og ikke kontrolleret står i AI-mærkets
// hover (med datoen). Nederst i hvert kort står kilden (FinSourceBar): AI, eller AI og rådgiver, hvis
// rådgiveren har rettet eller kommenteret. Produktbeskrivelsen kan kommenteres (FinAiBlock commentable).
// "Upload produktblad" er en demo som før migrationen: "Vælg fil" i dialogen markerer bladet som
// uploadet (der vælges ingen rigtig fil), og filnavnet åbner en råvisning af bladet. Tilstanden er
// lokal i afsnittet og nulstilles, når fanen forlades.
//
// Props: ingen. Emits: ingen.
import { computed, ref } from 'vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { MARKET_PEST, finAiLoad, finAiPatch } from '@/domain/financials/finAiTexts'
import { finFill, finPublicDataDate } from '@/domain/financials/finFormat'
import { confirmRemove } from '@/services/feedback'
import { useWindowEvent } from '@/composables/useWindowEvent'
import FinSection from './FinSection.vue'
import FinAiBlock from './FinAiBlock.vue'
import FinSourceBar from './FinSourceBar.vue'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'

const uploadState = ref('idle') // 'idle' | 'uploaded'
const uploadModalOpen = ref(false)
const docModalOpen = ref(false)
const uploaded = computed(() => uploadState.value === 'uploaded')
const pestKeys = ref([])
const onPestKeydown = useCollapseKeyboard()

// Kilden nederst i kortene: AI, og rådgiver, når rådgiveren har rettet eller kommenteret en af tekstene
const aiVer = ref(0)
useWindowEvent('fin-ai-texts', () => { aiVer.value++ })
// Kilderne nederst i kortet: "AI-genereret" (med ikonet), rådgiveren, når hun har rettet eller kommenteret, og de
// kilder, rådgiveren selv har tilføjet. Har rådgiveren selv skrevet teksten, kan hun fjerne "AI-genereret".
// Kortets kilder gemmes på den første tekst (main); ids er alle kortets tekster.
function cardSources (main, ids) {
  const all = finAiLoad()
  const st = all[main] || {}
  const touched = ids.filter(k => all[k] && (all[k].edited != null || all[k].note))
  const out = []
  // AI-mærket er en knap, der åbner forklaringen (hvor mærket kan fjernes). Er det fjernet, står der ikke noget
  // AI-ikon: det kan sættes på igen med "Tilføj AI-reference" til højre (restoreAi)
  // Hover på en kilde viser, hvornår teksten blev genereret, rettet eller kilden tilføjet
  const when = (iso) => (iso ? CW.fmtDate(iso) : finPublicDataDate())
  if (!st.noAi) out.push({ text: t('AI-genereret'), title: finFill(t('Genereret {date}'), { date: when(st.aiAt) }), onClick: () => { aiModal.value = main } })
  // Uden AI-mærket står rådgiveren altid som kilde (hun har skrevet eller kontrolleret teksten)
  if (touched.length || st.noAi) {
    const by = touched.map(k => all[k].editedBy).find(Boolean) || (DATA.ADVISOR && DATA.ADVISOR.name) || 'Mette Larsen'
    const at = touched.map(k => all[k].editedAt).filter(Boolean).sort().pop()
    out.push({ text: by, title: at ? finFill(t('Rettet {date}'), { date: CW.fmtDate(at) }) : undefined })
  }
  // Egne kilder gemmes som { text, at } (ældre som tekst)
  ;(st.sources || []).forEach((s, i) => out.push({ text: s.text || s, title: s.at ? finFill(t('Tilføjet {date}'), { date: CW.fmtDate(s.at) }) : undefined, onRemove: () => finAiPatch(main, { sources: (st.sources || []).filter((_, j) => j !== i) }) }))
  return out
}
// Forklaringen om AI-mærket (et vindue): hvorfor det skal stå, og knappen, der fjerner eller tilføjer det
const aiModal = ref(null)
const aiOff = computed(() => { aiVer.value; return !!(aiModal.value && (finAiLoad()[aiModal.value] || {}).noAi) })
const aiDate = computed(() => finFill(t('Teksten er AI-sammenfattet {date} ud fra sagens materiale og er ikke kontrolleret mod kilder.'), { date: finPublicDataDate() }))
function setAi (on) {
  finAiPatch(aiModal.value, { noAi: on ? null : true })
  aiModal.value = null
}
const addSource = (main, text) => { const st = finAiLoad()[main] || {}; finAiPatch(main, { sources: (st.sources || []).concat([{ text, at: new Date().toISOString() }]) }) }
// Er AI-mærket fjernet, står en tekstknap til højre i kilde-linjen, der åbner forklaringen, hvor det kan sættes på igen
const restoreAi = (main) => {
  aiVer.value
  return (finAiLoad()[main] || {}).noAi ? { label: t('Tilføj AI-reference'), onClick: () => { aiModal.value = main } } : null
}
const productSource = computed(() => { aiVer.value; return cardSources('product', ['product']) })
const marketSource = computed(() => { aiVer.value; return cardSources('market', ['market'].concat(MARKET_PEST.map(p => 'pest:' + p.k))) })

function removeSheet () {
  confirmRemove(sheetName.value, t('Produktbladet fjernes fra sagen.')).then(ok => { if (ok) uploadState.value = 'idle' })
}
// Demo: filen gemmes ikke; navnet vises, og bladet står som uploadet
const sheetName = ref('produktblad_nordhavn.pdf')
function chooseFile (file) {
  if (file && file.name) sheetName.value = file.name
  uploadState.value = 'uploaded'
  return false // a-upload-dragger må ikke sende filen nogen steder hen
}
// Hvad AI'en bygger produktbeskrivelsen på: sagens og de uploadede dokumenter og/eller internettet (mindst én)
const basis0 = (finAiLoad().product || {}).basis || {}
const useUploads = ref(basis0.uploads !== false)
const useWeb = ref(basis0.web !== false)
const basisOk = computed(() => useUploads.value || useWeb.value)
function saveUpload () {
  if (!basisOk.value) return
  finAiPatch('product', { basis: { uploads: useUploads.value, web: useWeb.value } })
  uploadModalOpen.value = false
}

// Råvisning af det uploadede produktblad (samme tekst som før migrationen)
const docText = `PRODUKTBLAD - Nordhavn Composite A/S
Havnegade 42, 9900 Frederikshavn - ${DATA.COMPANY.website}

PRODUKTER
Fiberforstærkede kompositkomponenter til vindmøllevinger:
- Pultruderede kulfiberlameller og bjælkepakker (spar caps)
- Rodmoduler og rodindsatser
- Næsekanter og lukkeprofiler
- Servicepaneler og reparationsemner til eftermarkedet

PRODUKTION
Anlæg i Frederikshavn og Sæby med to RTM-linjer,
vakuuminfusion og autoklav. ISO 9001:2015-certificeret.
84 fuldtidsansatte (2025).

KUNDER
Build-to-print og co-engineering for vindmølle-OEM'er.
Største kunder 2025: Vestas, GE Vernova, Siemens Gamesa.

[Dokumentet fortsætter, 8 sider i alt]`
</script>

<template>
  <FinSection
    :title="t('Produkt, marked og branche')"
    :sub="t('Produktbeskrivelse, marked og PEST-analyse, samt kundeomtaler på Trustpilot.')"
  >
    <!-- Produktbeskrivelse -->
    <a-card :bordered="false">
      <FinAiBlock
        id="product"
        :title="t('Produktbeskrivelse')"
        commentable
      >
        <template #headExtra>
          <a-space
            v-if="uploaded"
            :size="8"
            wrap
          >
            <a-button
              class="cw-link"
              type="link"
              size="small"
              aria-haspopup="dialog"
              @click="docModalOpen = true"
            >
              {{ sheetName }}
            </a-button>
            <a-typography-text type="secondary">
              {{ t('uploadet') }} {{ DATA.fmt.longDate('2026-06-04') }}
            </a-typography-text>
            <a-button
              type="text"
              size="small"
              @click="removeSheet"
            >
              {{ t('Fjern') }}
            </a-button>
          </a-space>
          <a-button
            v-else
            id="fin-product-upload"
            type="text"
            size="small"
            aria-haspopup="dialog"
            @click="uploadModalOpen = true"
          >
            <template #icon>
              <UploadOutlined aria-hidden="true" />
            </template>
            {{ t('Upload produktblad') }}
          </a-button>
        </template>
        <template
          v-if="uploaded"
          #after
        >
          {{ ' ' }}<a-typography-text strong>
            {{ t('De tre største kunder (Vestas, GE Vernova og Siemens Gamesa) stod for 56 % af omsætningen i 2025.') }}
          </a-typography-text>{{ ' ' + t('Selskabet investerer ca. DKK 1,6 mio. i 2026 i automatiseret limpåføring og kapacitet til efterbehandling.') }}
        </template>
      </FinAiBlock>
      <FinSourceBar
        :sources="productSource"
        :restore="restoreAi('product')"
        addable
        @add="(v) => addSource('product', v)"
      />
    </a-card>

    <!-- Markedstal og PEST i en fold -->
    <a-card :bordered="false">
      <FinAiBlock
        id="market"
        :title="t('Markedet')"
      />
      <div @keydown="onPestKeydown">
        <a-collapse
          v-model:active-key="pestKeys"
          ghost
          :expand-icon="collapseExpandIcon"
        >
          <a-collapse-panel
            id="fin-pest"
            key="pest"
            :header="t('PEST-analyse') + ' (' + MARKET_PEST.length + ')'"
          >
            <a-list
              :data-source="MARKET_PEST"
              row-key="k"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <FinAiBlock
                    :id="'pest:' + item.k"
                    class="fin-pest-item"
                    :title="t(item.k)"
                    small
                  />
                </a-list-item>
              </template>
            </a-list>
          </a-collapse-panel>
        </a-collapse>
      </div>
      <FinSourceBar
        :sources="marketSource"
        :restore="restoreAi('market')"
        addable
        @add="(v) => addSource('market', v)"
      />
    </a-card>
    <!-- Forklaringen om AI-mærket -->
    <a-modal
      :visible="!!aiModal"
      :title="t('AI-genereret tekst')"
      :width="480"
      :wrap-props="{ 'aria-modal': 'true' }"
      @cancel="aiModal = null"
    >
      <a-typography-paragraph>
        {{ aiDate }}
      </a-typography-paragraph>
      <a-typography-paragraph>
        {{ t('Mærket viser, at teksten er skrevet af AI, så det er tydeligt for alle, der læser den.') }}
      </a-typography-paragraph>
      <a-typography-paragraph type="secondary">
        {{ aiOff ? t('Mærket er fjernet fra afsnittet. Tilføj det igen, hvis teksten stadig bygger på AI. Det kommer også igen af sig selv, hvis du genererer teksten igen med AI.') : t('Fjern kun mærket, hvis du selv har skrevet teksten eller har kontrolleret den mod kilder.') }}
      </a-typography-paragraph>
      <template #footer>
        <a-button @click="aiModal = null">
          {{ t('Luk') }}
        </a-button>
        <a-button
          v-if="aiOff"
          type="primary"
          @click="setAi(true)"
        >
          {{ t('Tilføj AI-reference igen') }}
        </a-button>
        <a-button
          v-else
          danger
          @click="setAi(false)"
        >
          {{ t('Fjern AI-reference') }}
        </a-button>
      </template>
    </a-modal>
  </FinSection>

  <!-- Upload produktblad: samme felt som på kundens side og valget af, hvad AI'en bygger teksten på -->
  <a-modal
    v-model:visible="uploadModalOpen"
    :title="t('Upload produktblad')"
    :width="572"
    :wrap-props="{ 'aria-modal': 'true', id: 'fin-upload-product' }"
  >
    <a-upload-dragger
      accept=".pdf,.doc,.docx,.ppt,.pptx"
      :show-upload-list="false"
      :before-upload="chooseFile"
    >
      <a-typography-text strong>
        {{ uploaded ? sheetName : t('Træk produktbladet hertil, eller vælg filen') }}
      </a-typography-text>
      <div>
        <a-typography-text type="secondary">
          {{ uploaded ? t('Uploadet. Vælg en anden fil for at skifte den ud.') : t('PDF, Word eller PowerPoint - højst 20 MB') }}
        </a-typography-text>
      </div>
      <a-button
        class="fin-upload-mock"
        tabindex="-1"
        aria-hidden="true"
      >
        {{ t('Vælg fil') }}
      </a-button>
    </a-upload-dragger>

    <div class="fin-upload-basis">
      <a-typography-text strong>
        {{ t('Hvad må AI bygge produktbeskrivelsen på?') }}
      </a-typography-text>
      <div>
        <a-checkbox v-model:checked="useUploads">
          {{ t('Det uploadede materiale og sagens dokumenter') }}
        </a-checkbox>
      </div>
      <div>
        <a-checkbox v-model:checked="useWeb">
          {{ t('Internettet, f.eks. virksomhedens hjemmeside') }}
        </a-checkbox>
      </div>
      <a-typography-text
        v-if="!basisOk"
        type="danger"
      >
        {{ t('Vælg mindst én.') }}
      </a-typography-text>
    </div>
    <template #footer>
      <a-button @click="uploadModalOpen = false">
        {{ t('Annullér') }}
      </a-button>
      <a-button
        type="primary"
        :disabled="!basisOk"
        @click="saveUpload"
      >
        {{ t('Gem') }}
      </a-button>
    </template>
  </a-modal>

  <!-- Råvisning af det uploadede produktblad -->
  <a-modal
    v-model:visible="docModalOpen"
    :title="sheetName"
    :width="572"
    :footer="null"
    :wrap-props="{ 'aria-modal': 'true', id: 'fin-product-doc' }"
  >
    <a-typography-paragraph>
      <pre>{{ docText }}</pre>
    </a-typography-paragraph>
  </a-modal>
</template>

<style scoped>
.fin-pest-item {
  flex: 1;
  min-width: 0;
}

.fin-upload-mock {
  margin-top: 12px;
  pointer-events: none;
}

.fin-upload-basis {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  margin-top: 16px;
}
</style>
