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
import { UploadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { finFill, finPublicDataDate } from '@/domain/financials/finFormat'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useFinDemoView } from '../composables/useFinDemoView'
import FinSection from './FinSection.vue'
import OwnerList from './OwnerList.vue'
import FinSourceBar from './FinSourceBar.vue'

const caseVersion = useCaseVersion()
const demoPep = useFinDemoView().pep
const ownershipUploaded = ref(false)
const showCvrAfterUpload = ref(false)
// Hvornår ejerbogen blev uploadet (demo: tidspunktet for klikket); vises ved hover på kilden
const uploadedAt = ref(null)
function toggleUpload () {
  ownershipUploaded.value = !ownershipUploaded.value
  uploadedAt.value = ownershipUploaded.value ? new Date().toISOString() : null
}
const cvrSource = computed(() => { caseVersion.value; return { text: t('CVR API'), title: finFill(t('Hentet {date}'), { date: finPublicDataDate() }) } })
const ownerSource = computed(() => (ownershipUploaded.value
  ? { text: t('Ejerbog, upload'), title: finFill(t('Uploadet {date}'), { date: CW.fmtDate(uploadedAt.value) }) }
  : cvrSource.value))
// Bestyrelse og koncernforhold står i ejerkortet; efter upload kun, når Virk-data er vist
const showFacts = computed(() => !ownershipUploaded.value || showCvrAfterUpload.value)
// Én kildelinje for kortet: ejerbogen og CVR, når begge er vist
const sources = computed(() => (ownershipUploaded.value && showCvrAfterUpload.value
  ? [ownerSource.value, cvrSource.value]
  : [ownerSource.value]))
const comment = ref('')

// Bestyrelsen efter årsrapport 2025 og ejerbogen (DATA.BOARD), vist i kortet ligesom ejerne
// Demo: demomenuen ved regnskabet slår PEP til for det medlem, der har demoPep (standard: ingen PEP)
const boardMembers = computed(() => DATA.BOARD.map(b => ({ name: b.name, role: b.role, pep: demoPep.value && !!b.demoPep })));
// Antal PEP'er i bestyrelsen: vises til højre i overskriften, og PEP-medlemmerne får et mærke i rækken
const pepCount = computed(() => boardMembers.value.filter(m => m.pep).length);

const uploadedOwnershipFiles = [
  { name: "Ejerbog_2026.pdf", date: DATA.fmt.longDate('2026-08-03') },
];
// Datoen for de offentlige data følger sagen (DATA.caseTimeline)
const checked = computed(() => { caseVersion.value; return finPublicDataDate() })

</script>

<template>
  <FinSection
    :title="t('Ejerskab og finansielle bindinger')"
    :sub="t('Ejere, bestyrelse og koncernforhold.')"
  >
    <template #badge>
      <!-- Én knap, der skifter tekst, så fokus bliver på den -->
      <a-button
        type="text"
        size="small"
        @click="toggleUpload"
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

    <!-- Ét kort med tre underoverskrifter: Ejere (eller den uploadede ejerbog), Bestyrelse og
         Koncernforhold, og én kildelinje nederst -->
    <a-card :bordered="false">
      <a-typography-title
        :level="3"
        class="fin-own-h"
      >
        {{ t('Ejere') }}
      </a-typography-title>
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
      <!-- Koncernforhold: altid vist uden upload, kan genvises med upload -->
      <template v-if="showFacts">
        <a-typography-title
          :level="3"
          class="fin-own-h fin-own-h-next"
        >
          {{ t('Koncernforhold') }}
        </a-typography-title>
        <a-typography-paragraph class="fin-own-text">
          {{ t('Ingen datterselskaber - søsterselskab Nordhavn Production ApS (samhandel på markedsvilkår)') }}
        </a-typography-paragraph>
      </template>
      <FinSourceBar :sources="sources" />
    </a-card>

    <!-- Bestyrelsen i sin egen boks: altid vist uden upload, kan genvises med upload -->
    <a-card
      v-if="showFacts"
      :bordered="false"
      class="fin-own-card-next"
    >
      <div class="fin-own-board-head">
        <a-typography-title
          :level="3"
          class="fin-own-h"
        >
          {{ t('Bestyrelse') }}
        </a-typography-title>
        <a-typography-text
          id="fin-board"
          type="secondary"
          :title="finFill(t('Tjekket mod EU\'s sanktionsliste og nationale PEP-registre {date}.'), { date: checked })"
        >
          {{ pepCount ? finFill(t('{n} PEP'), { n: pepCount }) : t('Ingen PEP') }}
        </a-typography-text>
      </div>
      <a-typography-paragraph
        v-if="ownershipUploaded"
        type="secondary"
        class="fin-own-from"
      >
        {{ t('Fra Virk') }}
      </a-typography-paragraph>
      <a-list
        class="fin-own-board-list"
        :data-source="boardMembers"
        row-key="name"
      >
        <template #renderItem="{ item }">
          <a-list-item class="fin-own-board-row">
            <div class="fin-own-board-who">
              <a-typography-text strong>
                {{ item.name }}
              </a-typography-text>
              <a-typography-text type="secondary">
                {{ t(item.role) }}
              </a-typography-text>
            </div>
            <!-- PEP-medlemmer får et orange mærke til højre i rækken; de andre står uden mærke -->
            <a-tag
              v-if="item.pep"
              color="orange"
            >
              {{ t('PEP') }}
            </a-tag>
          </a-list-item>
        </template>
      </a-list>
      <FinSourceBar :sources="[cvrSource]" />
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

</template>

<style scoped>
/* Underoverskrifterne i kortet: mindre end afsnittets overskrift */
.fin-own-h {
  margin: 0 0 4px;
  font-size: 16px;
}

.fin-own-h-next {
  margin-top: 24px;
}

/* Bestyrelsens boks ligger under ejerboksen med luft imellem */
.fin-own-card-next {
  margin-top: 16px;
}

/* Overskriften til venstre, PEP-resultatet til højre */
.fin-own-board-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.fin-own-from,
.fin-own-text {
  margin: 0;
}

/* Bestyrelsens rækker: navn til venstre, rolle til højre, samme linjer som ejerlisten */
.fin-own-board-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.fin-own-board-who {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

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
