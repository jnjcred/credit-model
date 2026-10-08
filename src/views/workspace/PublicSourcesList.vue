<script setup>
// De tre offentlige kilder i Materiale på sagen (workspace.jsx: WSPublicSources, L1463–1515):
// CVR-registret med årsrapporterne, brancheopslag og bløde signaler, hver med hvad og hvornår de
// blev hentet. Et dokument kan hentes (link eller CW.downloadDoc); et dokument, der er slettet
// under Dokumenter, står overstreget med "slettet". "Spørg kunden" åbner anmodningen med et
// spørgsmål til dokumentet klar (wsAskAbout). Kilderne bygges af wsPublicSources i
// src/domain/workspace/publicSources.js.
//
// Props: ingen (React-propperne go og caseId blev ikke brugt). Emits: ingen.
import { computed } from 'vue'
import { FileTextOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsFill } from '@/domain/workspace/format'
import { wsPublicSources } from '@/domain/workspace/publicSources'
import { wsAskAbout } from '@/domain/workspace/actions'
import { useCaseVersion } from '@/composables/useCaseVersion'

const caseVersion = useCaseVersion()
const ps = computed(() => {
  caseVersion.value
  return wsPublicSources()
})
</script>

<template>
  <a-list
    :data-source="ps.sources"
    :row-key="(s) => s.key"
  >
    <template #renderItem="{ item: s }">
      <a-list-item>
        <div class="ws-src">
          <a-typography-text strong>
            {{ t(s.x.src) }}
          </a-typography-text>
          <a-typography-text type="secondary">
            {{ t(s.x.what) }} · {{ ps.fetched }}
          </a-typography-text>
          <ul
            v-if="s.items.length"
            class="ws-docs"
          >
            <li
              v-for="it in s.items"
              :key="it.key"
            >
              <a-space :size="4">
                <a-typography-text type="secondary">
                  <FileTextOutlined aria-hidden="true" />
                </a-typography-text>
                <!-- Slettet under Dokumenter (fx forkert årsrapport): navnet står, men uden link -->
                <a-typography-text
                  v-if="it.removed"
                  type="secondary"
                >
                  <s>{{ it.label }}</s> · {{ t('slettet') }}
                </a-typography-text>
                <a-button
                  v-else-if="it.url"
                  type="link"
                  size="small"
                  :href="it.url"
                  :download="it.doc.name"
                  :title="t('Download')"
                >
                  {{ it.label }}
                </a-button>
                <a-button
                  v-else-if="it.doc"
                  type="link"
                  size="small"
                  :title="t('Download')"
                  @click="CW.downloadDoc(it.doc.name)"
                >
                  {{ it.label }}
                </a-button>
                <span v-else>{{ it.label }}</span>
              </a-space>
              <!-- Spørgsmål til kunden om dokumentet: anmodningen åbner med spørgsmålet klar -->
              <a-button
                v-if="it.ask && !it.removed"
                type="text"
                size="small"
                :aria-label="wsFill(t('Stil kunden et spørgsmål om {item}'), { item: it.label })"
                @click="wsAskAbout(it.ask)"
              >
                {{ t('Spørg kunden') }}
              </a-button>
            </li>
          </ul>
        </div>
      </a-list-item>
    </template>
  </a-list>
</template>

<style scoped>
.ws-src {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

/* Dokumenterne: navnet til venstre, "Spørg kunden" til højre */
.ws-docs {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.ws-docs > li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
