<script setup>
// Trustpilot (financials.jsx: TrustpilotSection + TrustpilotStars): et blødt signal som én rolig
// række; fordelingen og de seneste anmeldelser i en fold. Tallene er faste demo-data
// (TRUSTPILOT i src/domain/financials/finData.js). Søjlerne er antal / største antal, og
// stjernerne er Math.round(bedømmelse), som før migrationen.
//
// Props: ingen. Emits: ingen.
import { computed, ref } from 'vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { TRUSTPILOT } from '@/domain/financials/finData'
import { finFill, finPublicDataDate } from '@/domain/financials/finFormat'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'

const caseVersion = useCaseVersion()
const foldKeys = ref([])
const onFoldKeydown = useCollapseKeyboard()

// Ordret fra financials.jsx
const { score, totalReviews, dist, reviews } = TRUSTPILOT;
const maxCount = Math.max(...dist.map(d => d.count));

// Datoen for de offentlige data følger sagen (DATA.caseTimeline)
const fetchedAt = computed(() => { caseVersion.value; return finPublicDataDate() })
</script>

<template>
  <section
    class="fin-tp"
    aria-label="Trustpilot"
  >
    <a-card :bordered="false">
      <div class="fin-tp-head">
        <div class="fin-tp-main">
          <span>
            <a-typography-text strong>Trustpilot</a-typography-text>
            <a-typography-text type="secondary">
              {{ ' · ' + finFill(t('{score} af 5'), { score: DATA.fmt.num(score, 1) }) + ' · ' + totalReviews + ' ' + t('anmeldelser') }}
            </a-typography-text>
          </span>
          <a-typography-text type="secondary">
            {{ t('hentet') }} {{ fetchedAt }}
          </a-typography-text>
        </div>
        <a-button
          type="link"
          size="small"
          :href="'https://www.trustpilot.com/review/' + DATA.COMPANY.trustpilotDomain"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('Åbn på Trustpilot') }}
        </a-button>
      </div>
      <div @keydown="onFoldKeydown">
        <a-collapse
          v-model:active-key="foldKeys"
          ghost
          :expand-icon="collapseExpandIcon"
        >
          <a-collapse-panel
            id="fin-trustpilot"
            key="trustpilot"
            :header="t('Fordeling og seneste anmeldelser')"
          >
            <!-- Fordelingen: antal pr. antal stjerner, søjlen målt mod det største antal -->
            <div class="fin-tp-dist">
              <a-row
                v-for="d in dist"
                :key="d.stars"
                align="middle"
                :wrap="false"
              >
                <a-col :span="6">
                  <a-typography-text type="secondary">
                    {{ d.stars }} {{ d.stars === 1 ? t('stjerne') : t('stjerner') }}
                  </a-typography-text>
                </a-col>
                <a-col :span="18">
                  <a-progress
                    :percent="(d.count / maxCount) * 100"
                    :format="() => String(d.count)"
                    status="normal"
                    size="small"
                  />
                </a-col>
              </a-row>
            </div>
            <a-list
              :data-source="reviews"
              row-key="author"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <div class="fin-tp-review">
                    <a-space :size="8">
                      <span
                        role="img"
                        :aria-label="item.stars + ' / 5'"
                      >
                        <a-rate
                          :value="Math.round(item.stars)"
                          disabled
                          aria-hidden="true"
                        />
                      </span>
                      <a-typography-text type="secondary">
                        {{ item.author }} · {{ DATA.fmt.longDate(item.date) }}
                      </a-typography-text>
                    </a-space>
                    <span>{{ t(item.text) }}</span>
                  </div>
                </a-list-item>
              </template>
            </a-list>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </a-card>
  </section>
</template>

<style scoped>
/* Lige under Produkt, marked og branche, uden egen overskrift (som før migrationen) */
.fin-tp {
  margin-top: 20px;
}

.fin-tp-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.fin-tp-main,
.fin-tp-review {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fin-tp-dist {
  max-width: 420px;
}
</style>
