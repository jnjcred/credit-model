<script setup>
// Læser til sagens kildedokumenter (documents.jsx: CaseDocReader). Viser det faktiske indhold, AI'en
// læser, opdelt i de afsnit, memoet citerer: sidelisten med søgning til venstre, siden til højre med
// søgeordet markeret. Tabeller (linjer med kolonner adskilt af flere mellemrum) står i fast bredde
// uden linjeskift, så kolonnerne står under hinanden.
// Viseren vises kun, når window.CW_SOURCE_VIEW er sat (DOC_PREVIEW).
//
// Props: doc (dokumentet fra CASE_DOCS eller CW_EXPORT_DOCS), focus ({ ref, n }: hop til en bestemt
//        side, f.eks. fra afvigelsespanelet; n skifter ved hvert hop)
import { computed, ref, watch } from 'vue'
import { t } from '@/i18n'
import { docBlocks, docDa, docRefLabel } from '@/domain/documents'

const props = defineProps({
  doc: { type: Object, required: true },
  focus: { type: Object, default: null },
})

const firstRef = computed(() => (props.doc.pages[0] ? props.doc.pages[0].ref : null))
const wantRef = computed(() => (props.focus && props.doc.pages.some(p => p.ref === props.focus.ref) ? props.focus.ref : firstRef.value))
const activeRef = ref(wantRef.value)
const q = ref('')
const body = ref(null)

// Et nyt dokument eller et nyt hop: den ønskede side, ingen søgning, øverst på siden
watch([() => props.doc.id, () => props.focus && props.focus.n], () => {
  activeRef.value = wantRef.value
  q.value = ''
  if (body.value) body.value.scrollTop = 0
})

const page = computed(() => props.doc.pages.find(p => p.ref === activeRef.value) || props.doc.pages[0])

const hits = computed(() => (q.value.trim()
  ? props.doc.pages.filter(p => docDa(p.title + ' ' + p.body).toLowerCase().includes(q.value.trim().toLowerCase()))
  : null))

function openPage (pageRef) {
  activeRef.value = pageRef
  if (body.value) body.value.scrollTop = 0
}

// Teksten delt i led; de led, der er søgeordet, markeres
function highlight (text) {
  const term = q.value.trim()
  if (!term) return [{ s: text, m: false }]
  const parts = text.split(new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'))
  return parts.map(p => ({ s: p, m: p.toLowerCase() === term.toLowerCase() }))
}

// Regneark (ark, linje): hele siden i fast bredde (som <pre>; kun tabellerne uden linjeskift)
const mono = computed(() => !!page.value && /ark |linje /.test(page.value.ref))
const blocks = computed(() => (page.value ? docBlocks(docDa(page.value.body)) : []))
</script>

<template>
  <a-row class="doc-reader">
    <a-col
      :xs="24"
      :sm="8"
    >
      <div class="doc-reader-search">
        <a-input
          v-model:value="q"
          type="search"
          size="small"
          :aria-label="t('Søg i dokumentet')"
          :placeholder="t('Søg i dokumentet')"
        />
      </div>
      <div class="doc-reader-pages">
        <a-button
          v-for="p in (hits || doc.pages)"
          :key="p.ref"
          type="text"
          block
          class="doc-reader-page"
          :aria-current="p.ref === activeRef ? 'page' : undefined"
          @click="openPage(p.ref)"
        >
          <a-typography-text
            type="secondary"
            class="doc-reader-line"
          >
            {{ docRefLabel(p.ref) }}
          </a-typography-text>
          <a-typography-text
            class="doc-reader-line"
            :strong="p.ref === activeRef"
            :type="p.ref === activeRef ? undefined : 'secondary'"
          >
            {{ docDa(p.title) }}
          </a-typography-text>
        </a-button>
        <a-typography-paragraph
          v-if="hits && hits.length === 0"
          type="secondary"
        >
          {{ t('Ingen resultater.') }}
        </a-typography-paragraph>
      </div>
    </a-col>
    <a-col
      :xs="24"
      :sm="16"
    >
      <div
        ref="body"
        class="doc-reader-body"
      >
        <template v-if="page">
          <a-space
            align="baseline"
            class="doc-reader-head"
          >
            <a-typography-text type="secondary">
              {{ docRefLabel(page.ref) }}
            </a-typography-text>
            <a-typography-text strong>
              {{ docDa(page.title) }}
            </a-typography-text>
          </a-space>
          <!-- Regneark (ark, linje): hele siden i fast bredde (<pre>). Tabeller (linjer med kolonner
               adskilt af flere mellemrum) står i fast bredde uden linjeskift, så kolonnerne står under
               hinanden -->
          <a-typography>
            <component
              :is="mono ? 'pre' : 'div'"
              class="doc-text"
            >
              <template
                v-for="(blk, i) in blocks"
                :key="i"
              >
                <component
                  :is="mono ? 'span' : 'pre'"
                  v-if="blk.table"
                  class="doc-table"
                >
                  <template
                    v-for="(part, j) in highlight(blk.text)"
                    :key="j"
                  >
                    <a-typography-text
                      v-if="part.m"
                      mark
                    >
                      {{ part.s }}
                    </a-typography-text>
                    <template v-else>
                      {{ part.s }}
                    </template>
                  </template>
                </component>
                <template v-else>
                  <template
                    v-for="(part, j) in highlight(blk.text)"
                    :key="j"
                  >
                    <a-typography-text
                      v-if="part.m"
                      mark
                    >
                      {{ part.s }}
                    </a-typography-text>
                    <template v-else>
                      {{ part.s }}
                    </template>
                  </template>
                </template>
              </template>
            </component>
          </a-typography>
        </template>
      </div>
    </a-col>
  </a-row>
</template>

<style scoped>
.doc-reader {
  width: 100%;
}

.doc-reader-search {
  padding: 0 8px 8px 0;
}

/* Sidelisten og siden har hver sin rulning, som før */
.doc-reader-pages {
  max-height: 520px;
  overflow-y: auto;
}

/* Sidens henvisning over titlen: knappen er to linjer høj */
.doc-reader-page {
  height: auto;
  white-space: normal;
  text-align: left;
}

.doc-reader-line {
  display: block;
}

.doc-reader-body {
  max-height: 560px;
  overflow-y: auto;
  padding: 0 0 16px 16px;
}

.doc-reader-head {
  margin-bottom: 12px;
}

/* Teksten bevarer linjeskiftene; tabeller står uden linjeskift og ruller vandret, så kolonnerne står
   under hinanden (i et regneark er tabellen et led i sidens <pre>) */
.doc-text {
  white-space: pre-wrap;
}

.doc-table {
  display: block;
  white-space: pre;
  overflow-x: auto;
}
</style>
