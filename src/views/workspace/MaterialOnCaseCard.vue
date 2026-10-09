<script setup>
// "Materiale på sagen" på Overblik (designet "Anmodet materiale v5"): det, sagen har. Først det
// godkendte fra kunden som tabel (samme kolonner som Til din gennemgang; godkendt først, så det,
// der ikke længere er påkrævet), derunder de offentlige data som kort. Står fra vurderingsfasen,
// også før anmodningen er sendt. Listerne bygges af wsMaterialCard i src/domain/workspace/items.js.
// Element-id'er, andre steder ruller og fokuserer til: ws-received (afsnittet),
// ws-received-title (overskriften) og ws-public-sources. Bankens og EIFO's dokumenter (ansøgning,
// sikkerheder, ratingberegning) står ikke her; de ligger under Dokumenter.
//
// Props: locked (sagen er indstillet eller afslået). Emits: ingen.
import { computed } from 'vue'
import { t } from '@/i18n'
import { AUTO_SOURCES } from '@/domain/workspace/publicSources'
import { wsMaterialCard } from '@/domain/workspace/items'
import { useCaseVersion } from '@/composables/useCaseVersion'
import PublicSourcesList from './PublicSourcesList.vue'
import MaterialTable from './MaterialTable.vue'

defineProps({
  locked: { type: Boolean, default: false },
})

const caseVersion = useCaseVersion()
const mc = computed(() => {
  caseVersion.value
  return wsMaterialCard()
})
</script>

<template>
  <section
    id="ws-received"
    class="ws-anchor"
    aria-labelledby="ws-received-title"
  >
    <a-card :bordered="false">
      <template #title>
        <span
          id="ws-received-title"
          role="heading"
          aria-level="2"
          tabindex="-1"
        >{{ t('Materiale på sagen') }}</span>
      </template>
      <div class="ws-mat">
        <!-- Fra kunden: det godkendte -->
        <div class="ws-mat-sec">
          <div
            id="ws-cust-title"
            role="heading"
            aria-level="3"
          >
            <a-typography-text strong>
              {{ t('Fra kunden') }}
            </a-typography-text>
            <a-typography-text
              v-if="mc.request"
              type="secondary"
            >
              {{ ' (' + mc.approved + ')' }}
            </a-typography-text>
          </div>
          <a-typography-paragraph
            v-if="!mc.request"
            type="secondary"
            class="ws-empty"
          >
            {{ t('Du har ikke anmodet kunden om materiale endnu.') }}
          </a-typography-paragraph>
          <a-typography-paragraph
            v-else-if="!mc.kept.length"
            type="secondary"
            class="ws-empty"
          >
            {{ t('Intet godkendt endnu. Det, du godkender under Til din gennemgang, kommer til at stå her.') }}
          </a-typography-paragraph>
          <MaterialTable
            v-else
            :entries="mc.kept"
            kind="done"
            :locked="locked"
            labelled-by="ws-cust-title"
          />
        </div>

        <!-- Offentlige data -->
        <div
          id="ws-public-sources"
          class="ws-mat-sec"
        >
          <div
            id="ws-public-title"
            role="heading"
            aria-level="3"
          >
            <a-typography-text strong>
              {{ t('Offentlige data') }}
            </a-typography-text>
            {{ ' ' }}
            <a-typography-text type="secondary">
              ({{ AUTO_SOURCES.length }})
            </a-typography-text>
          </div>
          <PublicSourcesList />
        </div>
      </div>
    </a-card>
  </section>
</template>

<style scoped>
/* Afsnittet rulles til (sagshovedet, Dataanmodninger): lidt luft over kortet */
.ws-anchor {
  scroll-margin-top: 16px;
}

/* Fra kunden og Offentlige data under hinanden, med god luft imellem */
.ws-mat {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.ws-mat-sec {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ws-empty {
  margin-bottom: 0;
}
</style>
