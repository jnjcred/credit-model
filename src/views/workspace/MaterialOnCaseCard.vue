<script setup>
// "Materiale på sagen" på Overblik (workspace.jsx: WSMaterialCard, L2439–2503): det, sagen har.
// Til venstre de offentlige data og bankens og EIFO's egne dokumenter, til højre det godkendte fra
// kunden (godkendt først, så det, der ikke længere er påkrævet). Står fra vurderingsfasen, også før
// anmodningen er sendt. På smal skærm står det godkendte fra kunden øverst, som før.
// Listerne bygges af wsMaterialCard i src/domain/workspace/items.js.
// Element-id'er, andre steder ruller og fokuserer til: ws-received (afsnittet),
// ws-received-title (overskriften), ws-public-sources og ws-bank-sources.
//
// Props: locked (sagen er indstillet eller afslået). React-propperne go og caseId gik kun videre
// til WSPublicSources, som ikke brugte dem. Emits: ingen.
import { computed } from 'vue'
import { FileTextOutlined, FolderOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { AUTO_SOURCES } from '@/domain/workspace/publicSources'
import { wsMaterialCard } from '@/domain/workspace/items'
import { useCaseVersion } from '@/composables/useCaseVersion'
import PublicSourcesList from './PublicSourcesList.vue'
import CustomerItemList from './CustomerItemList.vue'

defineProps({
  locked: { type: Boolean, default: false },
})

const caseVersion = useCaseVersion()
const mc = computed(() => {
  caseVersion.value
  return wsMaterialCard()
})
const sources = computed(() => Object.keys(mc.value.bySource))
</script>

<template>
  <section
    id="ws-received"
    class="ws-anchor"
    aria-labelledby="ws-received-title"
  >
    <a-card :bordered="false">
      <template #title>
        <a-space :size="8">
          <FolderOutlined aria-hidden="true" />
          <span
            id="ws-received-title"
            role="heading"
            aria-level="2"
            tabindex="-1"
          >{{ t('Materiale på sagen') }}</span>
        </a-space>
      </template>
      <a-row :gutter="[32, 24]">
        <!-- Offentlige data og bankens dokumenter (ca. 2/5) -->
        <a-col
          :xs="{ span: 24, order: 2 }"
          :lg="{ span: 10, order: 1 }"
        >
          <div
            id="ws-public-sources"
            class="ws-col"
          >
            <div>
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
            <div
              v-if="mc.caseDocs.length > 0"
              id="ws-bank-sources"
            >
              <div
                id="ws-bank-title"
                role="heading"
                aria-level="3"
              >
                <a-typography-text strong>
                  {{ t('Fra banken og EIFO') }}
                </a-typography-text>
                {{ ' ' }}
                <a-typography-text type="secondary">
                  ({{ mc.caseDocs.length }})
                </a-typography-text>
              </div>
              <a-list
                :data-source="sources"
                :row-key="(src) => src"
              >
                <template #renderItem="{ item: src }">
                  <a-list-item>
                    <div class="ws-src">
                      <a-typography-text strong>
                        {{ t(src) }}
                      </a-typography-text>
                      <a-typography-text type="secondary">
                        {{ mc.receivedText(src) }}
                      </a-typography-text>
                      <ul class="ws-docs">
                        <li
                          v-for="d in mc.bySource[src]"
                          :key="d.name"
                        >
                          <a-space :size="4">
                            <a-typography-text type="secondary">
                              <FileTextOutlined aria-hidden="true" />
                            </a-typography-text>
                            <a-button
                              type="link"
                              size="small"
                              :title="t('Download')"
                              @click="CW.downloadDoc(d.name)"
                            >
                              {{ d.name }}
                            </a-button>
                          </a-space>
                        </li>
                      </ul>
                    </div>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </div>
        </a-col>
        <!-- Godkendt fra kunden (ca. 3/5); på smal skærm øverst -->
        <a-col
          :xs="{ span: 24, order: 1 }"
          :lg="{ span: 14, order: 2 }"
        >
          <div
            id="ws-cust-title"
            role="heading"
            aria-level="3"
          >
            <a-typography-text strong>
              {{ t('Godkendt fra kunden') }}
            </a-typography-text>
            <!-- Mellemrummet står i teksten, så overskriftens navn bliver "Godkendt fra kunden (n)" -->
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
          >
            {{ t('Kunden er ikke bedt om materiale endnu.') }}
          </a-typography-paragraph>
          <a-typography-paragraph
            v-else-if="!mc.kept.length"
            type="secondary"
          >
            {{ t('Intet godkendt endnu. Det, du godkender under Anmodet materiale, kommer til at stå her.') }}
          </a-typography-paragraph>
          <CustomerItemList
            v-else
            :entries="mc.kept"
            :locked="locked"
            labelled-by="ws-cust-title"
          />
        </a-col>
      </a-row>
    </a-card>
  </section>
</template>

<style scoped>
/* Afsnittet rulles til (sagshovedet, Dataanmodninger): lidt luft over kortet */
.ws-anchor {
  scroll-margin-top: 16px;
}

/* Offentlige data og bankens dokumenter under hinanden */
.ws-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ws-src {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

/* Bankens og EIFO's dokumenter under kilden */
.ws-docs {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}
</style>
