<script setup>
// Side 1 i memoet: "Indstillingen i hovedtræk" (memo.jsx: MemoFactsBox L2644-2695 og MemoFactSrc
// L2633-2642). Facilitet, EIFO-andel, løbetid, prioritet, pris, betingelser, covenants, røde flag og
// indstilling på ét sted, fra sagens faktaark. Ikke et redigerbart afsnit.
// Hver værdi har sin kilde som en kildehenvisning (span.memo-cite med data-doc/data-page/data-claim), den
// samme slags som i afsnittenes tekst: memoets side gør dem til knapper og åbner kilden, når
// kildevisningen er slået til (window.CW_SOURCE_VIEW === true); ellers er de almindelig tekst.
// Rækkerne (memoFacts i src/domain/memo/memoFacts.js) har enten punkter (items), en værdi (value) eller en
// henvisning til et afsnit (fallback + jump). "+n med middel vægt i afsnit 5" og henvisningerne til et
// afsnit er knapper, der går til afsnittet.
// Ikke porteret (død kode): standardværdien for rows og visningen uden onJump (eneste kalder giver begge).
//
// Props: rows (rækkerne: den frosne forsides facts eller memoFacts({ final })), lang (forsidens sprog:
//        en indstillet version vises på det sprog, den blev indstillet på; null = brugerfladens sprog).
// Emits: jump(afsnitsnøgle).
import { onMounted, onUpdated, ref } from 'vue'
import { t } from '@/i18n'
import { MEMO_EN } from '@/domain/memo/memoTemplates'
import { _memoSrcLabel, _memoTL } from '@/domain/memo/memoFormat'
import { memoCiteName } from '@/domain/memo/memoCite'

const props = defineProps({
  rows: { type: Array, required: true },
  lang: { type: String, default: null },
})
const emit = defineEmits(['jump'])

// lang: den frosne forside vises på det sprog, den blev indstillet på
const tt = (s) => (props.lang ? _memoTL(props.lang, s) : t(s))
// Kildehenvisningen efter en værdi: " · Ansøgning, s. 1"
const srcLabel = (src) => (src ? _memoSrcLabel(src, props.lang) : null)
const sourceView = window.CW_SOURCE_VIEW === true
// Punktets påstand, som kildekontrollen sammenligner med kilden
const itemClaim = (it) => it.claim || ((it.id ? it.id + ' ' : '') + (it.text || ''))

// Tabellen hedder det samme som overskriften (aria-labelledby), som før. a-descriptions 3.2.13 lægger
// attributter på sit yderste element, ikke på tabellen, så navnet sættes på tabellen efter hver gengivelse.
const box = ref(null)
function nameTable () {
  const tb = box.value && box.value.querySelector('table')
  if (tb && tb.getAttribute('aria-labelledby') !== 'memo-facts-h') tb.setAttribute('aria-labelledby', 'memo-facts-h')
}
onMounted(nameTable)
onUpdated(nameTable)
</script>

<template>
  <div
    ref="box"
    class="memo-facts-box"
  >
    <a-descriptions
      class="memo-facts"
      bordered
      size="small"
      :column="1"
    >
      <!-- Overskriften står som tabeltitel, som "Virksomhed" over den, så virksomhedens navn stadig er størst. Den er
           en overskrift på niveau 2 og tabellens navn. -->
      <template #title>
        <span
          id="memo-facts-h"
          role="heading"
          aria-level="2"
        >{{ tt('Indstillingen i hovedtræk') }}</span>
      </template>
      <a-descriptions-item
        v-for="r in rows"
        :key="r.k"
        :label="r.label"
      >
        <template v-if="r.items && r.items.length">
          <div v-if="r.summary">
            {{ r.summary }}
          </div>
          <ul class="memo-facts-list">
            <li
              v-for="(it, i) in r.items"
              :key="i"
            >
              <strong v-if="it.id">{{ it.id }}</strong>{{ (it.id ? ' ' : '') + (it.text || '') }}<a-typography-text
                v-if="!it.text"
                type="secondary"
              >
                <em>{{ tt('Ikke udfyldt i faktaarket') }}</em>
              </a-typography-text>
              <!-- Kun "opfyldt" vises, i gråt. Frosne forsider fra før kan have "Åben" og "Høj" i tag; de vises ikke længere.
                   Klassen st: kildekontrollen (citeContext) springer statusmærket over i påstanden. -->
              <a-typography-text
                v-if="it.tone === 'ok'"
                type="secondary"
                class="st"
              >
                · {{ tt('opfyldt') }}
              </a-typography-text>
              <a-typography-text
                v-if="it.source && it.source.doc && srcLabel(it.source)"
                type="secondary"
                class="src"
              >
                · <span
                  class="memo-cite"
                  :data-doc="it.source.doc"
                  :data-page="it.source.ref || ''"
                  :role="sourceView ? 'button' : undefined"
                  :tabindex="sourceView ? 0 : undefined"
                  :data-claim="itemClaim(it) || undefined"
                  :data-claim-da="MEMO_EN && it.claimDa ? it.claimDa : undefined"
                  :aria-label="sourceView ? memoCiteName(srcLabel(it.source), it.source.doc, it.source.ref) : undefined"
                >{{ srcLabel(it.source) }}</span>
              </a-typography-text>
            </li>
          </ul>
          <a-button
            v-if="r.more > 0"
            type="link"
            size="small"
            class="memo-cmt-act"
            @click="emit('jump', r.moreJump || 'risk')"
          >
            {{ '+' + r.more + ' ' + tt('med middel vægt i afsnit 5') }}
          </a-button>
        </template>
        <template v-else-if="r.items">
          <a-typography-text type="secondary">
            <em>{{ tt('Ikke udfyldt i faktaarket') }}</em>
          </a-typography-text>
        </template>
        <template v-else-if="r.value">
          <span :class="r.num ? 'nw' : undefined">{{ r.value }}</span><a-typography-text
            v-if="r.source && r.source.doc && srcLabel(r.source)"
            type="secondary"
            class="src"
          >
            · <span
              class="memo-cite"
              :data-doc="r.source.doc"
              :data-page="r.source.ref || ''"
              :role="sourceView ? 'button' : undefined"
              :tabindex="sourceView ? 0 : undefined"
              :data-claim="r.claim || undefined"
              :data-claim-da="MEMO_EN && r.claimDa ? r.claimDa : undefined"
              :aria-label="sourceView ? memoCiteName(srcLabel(r.source), r.source.doc, r.source.ref) : undefined"
            >{{ srcLabel(r.source) }}</span>
          </a-typography-text>
        </template>
        <template v-else-if="r.fallback">
          <a-button
            v-if="r.jump"
            type="link"
            size="small"
            class="memo-cmt-act"
            @click="emit('jump', r.jump)"
          >
            {{ r.fallback }}
          </a-button>
          <a-typography-text
            v-else
            type="secondary"
          >
            {{ r.fallback }}
          </a-typography-text>
        </template>
        <a-typography-text
          v-else
          type="secondary"
        >
          <em>{{ tt('Ikke udfyldt i faktaarket') }}</em>
        </a-typography-text>
      </a-descriptions-item>
    </a-descriptions>
  </div>
</template>

<style scoped>
/* Punkterne i en række står som en almindelig punktliste */
.memo-facts-list {
  margin: 0;
  padding-left: 16px;
}

/* Tal (fx "80 % · DKK 3,6 mio.") brydes ikke midt i */
.nw {
  white-space: nowrap;
}
</style>
