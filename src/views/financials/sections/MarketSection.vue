<script setup>
// Produkt, marked og branche (financials.jsx: MarketSection): produktbeskrivelsen og markedet som
// AI-tekster (FinAiBlock) i hver sit kort, og PEST-analysen i en fold under markedet. Underteksten
// siger, at teksterne er AI-sammenfattet og ikke kontrolleret mod kilder.
// "Upload produktblad" er en demo som før migrationen: "Vælg fil" i dialogen markerer bladet som
// uploadet (der vælges ingen rigtig fil), og filnavnet åbner en råvisning af bladet. Tilstanden er
// lokal i afsnittet og nulstilles, når fanen forlades.
//
// Props: ingen. Emits: ingen.
import { computed, ref } from 'vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { MARKET_PEST } from '@/domain/financials/finAiTexts'
import { finFill, finPublicDataDate } from '@/domain/financials/finFormat'
import { confirmRemove } from '@/services/feedback'
import { useCaseVersion } from '@/composables/useCaseVersion'
import FinSection from './FinSection.vue'
import FinAiBlock from './FinAiBlock.vue'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'

const caseVersion = useCaseVersion()
const uploadState = ref('idle') // 'idle' | 'uploaded'
const uploadModalOpen = ref(false)
const docModalOpen = ref(false)
const uploaded = computed(() => uploadState.value === 'uploaded')
const pestKeys = ref([])
const onPestKeydown = useCollapseKeyboard()

// Datoen for de offentlige data følger sagen (DATA.caseTimeline)
const sub = computed(() => {
  caseVersion.value
  return finFill(t('AI-sammenfattet baggrund {date}. Ikke kontrolleret mod kilder. Kontrollér før brug i indstillingen.'), { date: finPublicDataDate() })
})

function removeSheet () {
  confirmRemove('produktblad_nordhavn.pdf', t('Produktbladet fjernes fra sagen.')).then(ok => { if (ok) uploadState.value = 'idle' })
}
// Demo: der vælges ingen rigtig fil
function chooseFile () {
  uploadState.value = 'uploaded'
  uploadModalOpen.value = false
}

// Råvisning af det uploadede produktblad (samme tekst som før migrationen)
const docText = `PRODUKTBLAD · Nordhavn Composite A/S
Havnegade 42, 9900 Frederikshavn · ${DATA.COMPANY.website}

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
    :sub="sub"
  >
    <!-- Produktbeskrivelse -->
    <a-card :bordered="false">
      <FinAiBlock
        id="product"
        :title="t('Produktbeskrivelse')"
      >
        <template #headExtra>
          <a-space
            v-if="uploaded"
            :size="8"
            wrap
          >
            <a-button
              type="link"
              size="small"
              aria-haspopup="dialog"
              @click="docModalOpen = true"
            >
              produktblad_nordhavn.pdf
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
    </a-card>
  </FinSection>

  <!-- Upload produktblad: titel, én sætning, én primærknap (demo: der vælges ingen rigtig fil) -->
  <a-modal
    v-model:visible="uploadModalOpen"
    :title="t('Upload produktblad')"
    :width="572"
    :ok-text="t('Vælg fil')"
    :cancel-text="t('Annullér')"
    :wrap-props="{ 'aria-modal': 'true', id: 'fin-upload-product' }"
    @ok="chooseFile"
  >
    <a-typography-paragraph>
      {{ t('PDF, Word eller PowerPoint på højst 20 MB. Det supplerer produktbeskrivelsen.') }}
    </a-typography-paragraph>
  </a-modal>

  <!-- Råvisning af det uploadede produktblad -->
  <a-modal
    v-model:visible="docModalOpen"
    title="produktblad_nordhavn.pdf"
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
</style>
