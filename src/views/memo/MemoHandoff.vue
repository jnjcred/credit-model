<script setup>
// Credit memo i piloten (memo_handoff.jsx: WSMemoHandoff): standardfanen "Credit memo" i sagen, når
// memoet skrives i Word med Copilot (localStorage cw_memo_mode tom eller 'copilot'). Siden samler sagens
// materiale, så rådgiveren kan hente det hele og fortsætte i Copilot: kundens og bankens filer, de
// offentlige data og Crediwires egne eksporter med vejledningen 00_README_for_AI.md.
// Reglerne (grupperne, hvad der er hentet, vejledningen) står i src/domain/memo_handoff.js, og
// hentningen genbruger Dokumenter-fanens hjælpere (src/domain/documents.js). Det hentede gemmes i
// sagens tilstand som handoff = { at, keys }, som Overblik viser.
//
// Props: caseId (Number, påkrævet). React-proppen go er droppet; "Se udestående" bruger go() fra
// src/composables/useNavigation.js. Emits: ingen.
import { computed, ref } from 'vue'
import {
  BarChartOutlined, DownloadOutlined, ExclamationCircleOutlined, FileTextOutlined, GlobalOutlined,
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { docCanGet, docGet, docKey } from '@/domain/documents'
import { wsMaterialReady } from '@/domain/workspace/stage'
import { hoFill, hoGroups, hoMark } from '@/domain/memo_handoff'
import { useCase } from '@/composables/useCaseVersion'
import { go } from '@/composables/useNavigation'
import MemoHandoffRow from './MemoHandoffRow.vue'

const props = defineProps({
  caseId: { type: Number, required: true },
})

// Gruppernes ikoner (I[g.icon] før migrationen); samme ikoner i tallene øverst og i listen
const ICONS = { FileText: FileTextOutlined, Globe: GlobalOutlined, BarChart: BarChartOutlined }

const busy = ref(false)

// Det hentede, materialet og kundens fremdrift følger sagens tilstand (CW.useCase() før migrationen)
const h = useCase(() => CW.caseState().handoff || {})
const groups = useCase(() => hoGroups())
const p = useCase(() => CW.progress())
const request = useCase(() => CW.request())

const got = computed(() => new Set(h.value.keys || []))
const docs = computed(() => groups.value.flatMap(g => g.items))
const gettable = computed(() => docs.value.filter(docCanGet))
const fresh = computed(() => gettable.value.filter(d => !got.value.has(docKey(d))))
const count = (g) => g.items.filter(docCanGet).length
// Materialet i tal: ét punkt pr. gruppe (kun det, der kan hentes; overskrifterne i listen tæller alt)
const summary = computed(() => {
  const [nCase, nPublic, nExport] = groups.value.map(count)
  return [['FileText', nCase, '{n} fra kunden'], ['Globe', nPublic, '{n} offentlige'], ['BarChart', nExport, '{n} fra Crediwire']]
})
// Grupper uden dokumenter vises ikke
const shownGroups = computed(() => groups.value.filter(g => g.items.length !== 0))

// Mangler der stadig materiale fra kunden, kan rådgiveren hente nu og igen senere
const pending = computed(() => request.value && !wsMaterialReady(p.value))
const missing = computed(() => (p.value.requiredMissing != null ? p.value.requiredMissing : p.value.missing))

const fetchedText = computed(() => (fresh.value.length
  ? hoFill(fresh.value.length === 1 ? t('Hentet {when}; 1 dokument er kommet til siden.') : t('Hentet {when}; {k} dokumenter er kommet til siden.'), { when: CW.fmtWhen(h.value.at), k: fresh.value.length })
  : hoFill(t('Hentet {when}.'), { when: CW.fmtWhen(h.value.at) })))
const pendingText = computed(() => (p.value.toReview > 0
  ? hoFill(p.value.toReview === 1 ? t('1 punkt fra kunden venter på din gennemgang.') : t('{n} punkter fra kunden venter på din gennemgang.'), { n: p.value.toReview })
  : hoFill(missing.value === 1 ? t('1 påkrævet punkt mangler fra kunden.') : t('{n} påkrævede punkter mangler fra kunden.'), { n: missing.value })))

// Hent en liste: én fil ad gangen med 350 ms imellem, så browseren ikke blokerer de mange
// hentninger. Bagefter er hele listen markeret som hentet (også en fil, der fejlede, som før).
async function fetchList (list, all) {
  if (busy.value || !list.length) return
  busy.value = true
  CW.toast(hoFill(list.length === 1 ? t('Henter 1 dokument') : t('Henter {n} dokumenter'), { n: list.length }))
  for (const d of list) {
    try { docGet(d) } catch (e) {}
    await new Promise(r => setTimeout(r, 350))
  }
  hoMark(list.map(docKey), all)
  busy.value = false
  CW.toast(t('Materialet er hentet. Fortsæt i Copilot.'))
}
// Én fil fra listen: markeres kun, hvis den blev hentet
const getOne = (d) => { if (docGet(d) !== false) hoMark([docKey(d)], false) }

// "Se udestående": Overblik ruller til det udestående fra kunden ('kabul:ws-focus' læses af sagen)
const toOverview = () => {
  try { sessionStorage.setItem('kabul:ws-focus', 'ws-outstanding') } catch (e) {}
  go('workspace:' + props.caseId)
}
</script>

<template>
  <div class="ho-page">
    <!-- Fanen og sagens navn viser allerede, hvor man er; overskriften er kun til skærmlæsere -->
    <h2 class="sr-only">
      {{ t('Credit memo') }}
    </h2>

    <!-- Næste skridt: hent materialet -->
    <section aria-labelledby="ho-title">
      <a-card :bordered="false">
        <template #title>
          <span
            id="ho-title"
            role="heading"
            aria-level="2"
            tabindex="-1"
          >{{ h.at ? t('Materialet er hentet') : t('Hent sagens materiale') }}</span>
        </template>
        <!-- Materialet i tal: ét punkt pr. gruppe, med samme ikoner som listen nedenfor -->
        <ul class="ho-counts">
          <li
            v-for="[ic, n, label] in summary"
            :key="ic"
          >
            <a-typography-text type="secondary">
              <component
                :is="ICONS[ic]"
                aria-hidden="true"
              />
              {{ hoFill(t(label), { n }) }}
            </a-typography-text>
          </li>
        </ul>
        <!-- a-card flader sit indhold ud og sammenligner det på nøgle: de to valgfri linjer har hver
             deres nøgle (v-if giver ellers begge nøglen 0) -->
        <a-typography-paragraph
          v-if="h.at"
          key="fetched"
          type="secondary"
        >
          {{ fetchedText }}
        </a-typography-paragraph>
        <a-typography-paragraph
          v-if="pending"
          key="pending"
          type="secondary"
        >
          <a-typography-text type="warning">
            <ExclamationCircleOutlined aria-hidden="true" />
          </a-typography-text>
          {{ pendingText }}
          <a-button
            class="cw-link"
            type="link"
            size="small"
            @click="toOverview"
          >
            {{ t('Se udestående') }}
          </a-button>
        </a-typography-paragraph>
        <a-space wrap>
          <template v-if="h.at && fresh.length > 0">
            <a-button
              id="ho-get-all"
              type="primary"
              :disabled="busy"
              :loading="busy"
              :aria-busy="busy || undefined"
              @click="fetchList(fresh, true)"
            >
              <template #icon>
                <DownloadOutlined aria-hidden="true" />
              </template>
              {{ hoFill(fresh.length === 1 ? t('Hent det nye dokument') : t('Hent de {k} nye'), { k: fresh.length }) }}
            </a-button>
            <a-button
              :disabled="busy"
              @click="fetchList(gettable, true)"
            >
              {{ t('Hent alle igen') }}
            </a-button>
          </template>
          <a-button
            v-else
            id="ho-get-all"
            :type="h.at ? 'default' : 'primary'"
            :disabled="busy || !gettable.length"
            :loading="busy"
            :aria-busy="busy || undefined"
            @click="fetchList(gettable, true)"
          >
            <template #icon>
              <DownloadOutlined aria-hidden="true" />
            </template>
            {{ h.at ? t('Hent alle igen') : hoFill(t('Hent alle {n} dokumenter'), { n: gettable.length }) }}
          </a-button>
        </a-space>
      </a-card>
    </section>

    <!-- Sådan fortsætter rådgiveren i Copilot -->
    <section aria-labelledby="ho-copilot-title">
      <a-card :bordered="false">
        <template #title>
          <span
            id="ho-copilot-title"
            role="heading"
            aria-level="2"
          >{{ t('Fortsæt i Copilot') }}</span>
        </template>
        <a-typography>
          <ol class="ho-steps">
            <li>{{ t('Hent sagens materiale ovenfor.') }}</li>
            <li>{{ t('Åbn et nyt credit memo i Word, som I plejer.') }}</li>
            <li>{{ t('Vedhæft filerne i Copilot, og bed den starte med 00_README_for_AI.md. Filen fortæller Copilot, hvad hver fil er, og hvor meget den kan bære.') }}</li>
            <li>{{ t('Skriv memoet ud fra materialet, og kontrollér tal og kilder mod dokumenterne.') }}</li>
          </ol>
        </a-typography>
      </a-card>
    </section>

    <!-- Materialet, gruppe for gruppe -->
    <section aria-labelledby="ho-list-title">
      <a-card :bordered="false">
        <h2
          id="ho-list-title"
          class="sr-only"
        >
          {{ t('Sagens materiale') }}
        </h2>
        <a-list
          v-for="g in shownGroups"
          :key="g.key"
        >
          <template #header>
            <!-- Samme gruppeoverskrift som i Dokumenter: navnet halvfed, antallet gråt ved siden af -->
            <div
              class="ho-group-head"
              role="heading"
              aria-level="3"
            >
              <a-typography-text strong>
                {{ t(g.label) }}
              </a-typography-text>
              <a-typography-text type="secondary">
                {{ g.items.length }}
              </a-typography-text>
            </div>
          </template>
          <!-- Rækkerne har dokumentets nøgle, så fokus følger dokumentet, når listen ændrer sig
               (a-list 3.2.13 giver ikke rækkerne fra data-source en nøgle) -->
          <ul class="ho-list">
            <MemoHandoffRow
              v-for="item in g.items"
              :key="docKey(item)"
              :d="item"
              :got="got.has(docKey(item))"
              @get="getOne"
            />
          </ul>
        </a-list>
      </a-card>
    </section>
  </div>
</template>

<style scoped>
.ho-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 32px 80px;
}

/* Tallene for de tre grupper står på én linje (og brydes, hvis der ikke er plads) */
.ho-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  padding: 0;
  list-style: none;
}

/* Trinene er kortets sidste indhold: ingen ekstra luft under listen */
.ho-steps {
  margin-bottom: 0;
}

/* Listen med gruppens filer (som a-list's egen liste) */
/* Gruppens overskrift: navnet halvfed, antallet gråt ved siden af (som i Dokumenter) */
.ho-group-head {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.ho-list {
  margin: 0;
  padding: 0;
}
</style>
