<script setup>
// Ejerskab og finansielle bindinger (financials.jsx: OwnershipSection): ejerne som en stille liste
// (OwnerList), bestyrelsen med PEP-tjek i en dialog og koncernforhold.
// "Upload ejerbog" er en demo som før migrationen: ejerlisten skiftes ud med den uploadede ejerbog
// (der vælges ingen rigtig fil), og "Gendan CVR-data" skifter tilbage. Efter upload kan
// bestyrelse og koncernforhold fra Virk vises igen, og der er et kommentarfelt. Tilstanden og
// kommentaren er lokale i afsnittet (gemmes ikke), som før.
//
// Props: ingen. Emits: ingen.
import { computed, ref } from 'vue'
import { RightOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { finFill, finPublicDataDate } from '@/domain/financials/finFormat'
import { useCaseVersion } from '@/composables/useCaseVersion'
import FinSection from './FinSection.vue'
import OwnerList from './OwnerList.vue'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'

const caseVersion = useCaseVersion()
const boardModalOpen = ref(false)
const ownershipUploaded = ref(false)
const showCvrAfterUpload = ref(false)
const comment = ref('')
const pepKeys = ref([])
const onPepKeydown = useCollapseKeyboard()

// Bestyrelsen efter årsrapport 2025 og ejerbogen (DATA.BOARD)
const boardMembers = DATA.BOARD.map(b => ({ name: b.name, role: b.role }));

const uploadedOwnershipFiles = [
  { name: "Ejerbog_2026.pdf", date: DATA.fmt.longDate('2026-08-03') },
];
// Datoen for de offentlige data følger sagen (DATA.caseTimeline)
const checked = computed(() => { caseVersion.value; return finPublicDataDate() })

// Dialogen åbner altid med "Hvad er PEP?" foldet sammen, som før
function openBoard () {
  pepKeys.value = []
  boardModalOpen.value = true
}
</script>

<template>
  <FinSection
    :title="t('Ejerskab og finansielle bindinger')"
    :sub="ownershipUploaded ? t('Ejerstrukturen er erstattet af din upload.') : t('Ejere fra Det Offentlige Ejerregister (CVR), som stemmer med ejerbogen.')"
  >
    <template #badge>
      <!-- Én knap, der skifter tekst, så fokus bliver på den -->
      <a-button
        type="text"
        size="small"
        @click="ownershipUploaded = !ownershipUploaded"
      >
        <template
          v-if="!ownershipUploaded"
          #icon
        >
          <UploadOutlined aria-hidden="true" />
        </template>
        {{ ownershipUploaded ? t('Gendan CVR-data') : t('Upload ejerbog') }}
      </a-button>
    </template>

    <!-- Ejerne som en stille liste, eller den uploadede ejerbog -->
    <a-card :bordered="false">
      <a-list
        v-if="ownershipUploaded"
        :data-source="uploadedOwnershipFiles"
        row-key="name"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <div class="fin-own-file">
              <a-typography-text strong>
                {{ item.name }}
              </a-typography-text>
              <a-typography-text type="secondary">
                {{ t('Uploadet') }} {{ item.date }}
              </a-typography-text>
            </div>
          </a-list-item>
        </template>
      </a-list>
      <OwnerList v-else />
    </a-card>

    <!-- Bestyrelse og koncernforhold: altid vist uden upload, kan genvises med upload -->
    <a-card
      v-if="!ownershipUploaded || showCvrAfterUpload"
      :bordered="false"
    >
      <a-typography-paragraph
        v-if="ownershipUploaded"
        type="secondary"
      >
        {{ t('Fra Virk') }}
      </a-typography-paragraph>
      <a-descriptions
        bordered
        size="small"
        :column="1"
      >
        <a-descriptions-item :label="t('Bestyrelse')">
          <a-button
            id="fin-board-btn"
            type="link"
            size="small"
            aria-haspopup="dialog"
            @click="openBoard"
          >
            {{ boardMembers.length }} {{ t('medlemmer · ingen PEP') }}
            <RightOutlined aria-hidden="true" />
          </a-button>
        </a-descriptions-item>
        <a-descriptions-item :label="t('Koncernforhold')">
          {{ t('Ingen datterselskaber · søsterselskab Nordhavn Production ApS (samhandel på markedsvilkår)') }}
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <!-- Vis/skjul Virk-data og kommentarfelt: kun efter upload (kommentaren gemmes ikke) -->
    <div
      v-if="ownershipUploaded"
      class="fin-own-after"
    >
      <a-button
        type="text"
        size="small"
        :aria-expanded="showCvrAfterUpload"
        @click="showCvrAfterUpload = !showCvrAfterUpload"
      >
        {{ showCvrAfterUpload ? t('Skjul Virk-data') : t('Vis Virk-data (bestyrelse og koncernforhold)') }}
      </a-button>
      <a-textarea
        v-model:value="comment"
        :aria-label="t('Kommentar om ejerskab')"
        :placeholder="t('Tilføj kommentar om ejerskab…')"
        :rows="2"
      />
    </div>
  </FinSection>

  <!-- Bestyrelse: ét fælles PEP-resultat i én sætning, rækker med navn og rolle -->
  <a-modal
    v-model:visible="boardModalOpen"
    :title="t('Bestyrelse')"
    :width="572"
    :footer="null"
    :wrap-props="{ 'aria-modal': 'true', id: 'fin-board' }"
  >
    <a-typography-paragraph>
      {{ finFill(t("Ingen af de {n} medlemmer er PEP. Tjekket mod EU's sanktionsliste og nationale PEP-registre {date}."), { n: boardMembers.length, date: checked }) }}
    </a-typography-paragraph>
    <a-list
      :data-source="boardMembers"
      row-key="name"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <a-typography-text strong>
            {{ item.name }}
          </a-typography-text>
          <a-typography-text type="secondary">
            {{ t(item.role) }}
          </a-typography-text>
        </a-list-item>
      </template>
    </a-list>
    <div @keydown="onPepKeydown">
      <a-collapse
        v-model:active-key="pepKeys"
        ghost
        :expand-icon="collapseExpandIcon"
      >
        <a-collapse-panel
          key="pep"
          :header="t('Hvad er PEP?')"
        >
          <a-typography-paragraph>
            {{ t('En PEP er en person, der beklæder eller har beklædt en fremtrædende offentlig stilling, fx statsledere, ministre, parlamentsmedlemmer, højtstående embedsmænd eller ledende personer i internationale organisationer.') }}
          </a-typography-paragraph>
          <a-typography-paragraph>
            {{ t('PEP-kontrol er lovpligtig under hvidvasklovens §§ 14-18 og kræver skærpet kundekendskab (Enhanced Due Diligence) ved konstatering af PEP-status. Crediwire foretager automatisk opslag og gemmer tidsstemplet kontrol-log.') }}
          </a-typography-paragraph>
          <a-typography-paragraph type="secondary">
            <small>{{ t('Kilde: Lov om forebyggende foranstaltninger mod hvidvask og finansiering af terrorisme (hvidvaskloven), jf. Europa-Parlamentets direktiv (EU) 2015/849.') }}</small>
          </a-typography-paragraph>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </a-modal>
</template>

<style scoped>
.fin-own-file {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fin-own-after {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
</style>
