<script setup>
// De tre offentlige kilder i Materiale på sagen (workspace.jsx: WSPublicSources, L1463–1515), som kort
// i et gitter (designet "Anmodet materiale v5"):
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
  <!-- Ét kort pr. kilde i et gitter (designet "Anmodet materiale v5") -->
  <ul class="ws-src-grid">
    <li
      v-for="s in ps.sources"
      :key="s.key"
    >
      <a-card
        size="small"
        class="ws-src"
      >
        <a-typography-text strong>
          {{ t(s.x.src) }}
        </a-typography-text>
        <a-typography-paragraph
          type="secondary"
          class="ws-src-what"
          :ellipsis="{ rows: 2, tooltip: t(s.x.what) + ' - ' + ps.fetched }"
          :content="t(s.x.what) + ' - ' + ps.fetched"
        />
        <template v-if="s.items.length">
          <a-divider class="ws-src-div" />
          <ul class="ws-docs">
            <li
              v-for="it in s.items"
              :key="it.key"
            >
              <a-space
                :size="8"
                class="ws-doc-name"
              >
                <a-typography-text type="secondary">
                  <FileTextOutlined aria-hidden="true" />
                </a-typography-text>
                <!-- Slettet under Dokumenter (f.eks. forkert årsrapport): navnet står, men uden link -->
                <a-typography-text
                  v-if="it.removed"
                  type="secondary"
                >
                  <s>{{ it.label }}</s> - {{ t('slettet') }}
                </a-typography-text>
                <a-button
                  v-else-if="it.url"
                  class="cw-link"
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
                  class="cw-link"
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
        </template>
      </a-card>
    </li>
  </ul>
</template>

<style scoped>
/* Kortene står side om side og brydes til færre kolonner på smalle skærme */
.ws-src-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ws-src {
  height: 100%;
}

/* Hvad kilden indeholder: højst to linjer, så kortene er lige høje */
.ws-src-what {
  min-height: 44px;
  margin-top: 4px;
  margin-bottom: 0;
}

.ws-src-div {
  margin: 8px 0 4px;
}

/* Dokumenterne: navnet til venstre, "Spørg kunden" til højre */
.ws-docs {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ws-docs > li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
}

.ws-doc-name {
  min-width: 0;
}
</style>
