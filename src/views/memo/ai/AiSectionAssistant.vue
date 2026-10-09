<script setup>
// AI-assistenten under et afsnits overskrift i det indbyggede memo (memo_ai.jsx: AiSectionAssistant
// L818-988 og AiWarnings L798-812). Rådgiveren vælger en handling eller skriver sin egen instruktion, ser
// teksten komme, og bestemmer selv, om den skal erstatte afsnittet ("Erstat afsnittet"), stå under det
// ("Indsæt nedenfor"), skrives igen ("Prøv igen") eller kasseres. AI skriver aldrig selv i dokumentet.
// - Ikke forbundet: en forklaring og "Forbind AI" (åbner forbindelsesdialogen).
// - Forbundet: grundlaget (regnskabstallene og afsnittets dokumenter, docsForSection), "Skriv afsnittet forfra"
//   og de fem omskrivninger (REWRITE_PRESETS; deres instruktion sendes uoversat), egen instruktion + "Kør".
// - Med en markering ("Omskriv markeringen"): kun den markerede passage omskrives, og "Erstat det markerede"
//   erstatter kun den. Er markeringen ikke længere i afsnittet (onReplace svarer false), indsættes intet, og
//   panelet siger det og bliver stående med teksten.
// - Et tomt svar kan aldrig indsættes: afsnittet ville blive tomt og gemt.
// - Advarslerne (henvisninger til dokumenter, sagen ikke har, og et tomt svar) står i normal tekstfarve med et
//   gult ikon foran: designsystemets advarselsfarve er for lys til tekst.
// Opgaverne, oprydningen (cleanHtml) og udkastmærket (markAsDraft) står i src/domain/memo/memoAi.js.
// Fokus: instruktionsfeltet får fokus, når panelet åbner (kun forbundet). Fokus bliver på knappen, man
// brugte, når "Prøv igen" bliver til "Stop" og "Stop" til "Prøv igen" (eller "Kassér" ved et tomt svar),
// som før (prototypen genbrugte knappen).
// Kendt fra prototypen (bevaret): at lukke panelet afbryder ikke en kørsel; indikatoren i forhåndsvisningen
// bliver stående efter Stop og fejl.
// Mousedown stoppes ved panelet, som før, så sidens lyttere på dokumentet (f.eks. kildelisten i
// værktøjslinjen, der lukker ved klik udenfor) ikke reagerer på klik i panelet.
//
// Props: sKey, num, title (dansk nøgle), selection ({ text, range, sKey } eller null; range er et DOM-objekt
//        og må ikke gøres reaktivt), getHtml (afsnittets HTML nu), onReplace(html) (funktion, der svarer
//        false, når markeringen er væk; derfor en prop og ikke et event), onConnect (valgfri funktion; uden
//        den vises "Forbind AI" ikke).
// Emits: append(html) ("Indsæt nedenfor"), close.
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import AiBadge from '@/components/common/AiBadge.vue'
import { useAiStatus } from '@/components/ai/useAiStatus'
import {
  REWRITE_PRESETS, cleanHtml, countCitations, docsForSection, markAsDraft, rewriteSectionPrompt,
  rewriteSelectionPrompt, unknownCitations, writeSectionPrompt,
} from '@/domain/memo/memoAi'
import { useAiRun } from './useAiRun'
import AiStreamPreview from './AiStreamPreview.vue'

const props = defineProps({
  sKey: { type: String, required: true },
  num: { type: String, required: true },
  title: { type: String, required: true },
  selection: { type: Object, default: null },
  getHtml: { type: Function, required: true },
  onReplace: { type: Function, required: true },
  onConnect: { type: Function, default: null },
})
const emit = defineEmits(['append', 'close'])

const status = useAiStatus()
const runner = useAiRun()
const instruction = ref('')
const lastAction = shallowRef(null)
// Sættes, hvis markeringen er blevet væk, mens modellen skrev
const lostSelection = ref(false)
const inputRef = ref(null)

onMounted(() => { if (inputRef.value) inputRef.value.focus() })

const clean = computed(() => (runner.done ? cleanHtml(runner.text) : ''))
const idle = computed(() => !runner.running && !runner.done)
// Afsnittets dokumenter læses ved hver gengivelse, som før
const docNames = () => {
  const docs = docsForSection(props.sKey)
  return docs.length ? docs.map(d => d.name).join(', ') : t('ingen dokumenter fundet i sagen')
}
// Kildehenvisningerne i svaret: antal og dem, der peger på dokumenter, sagen ikke har
const citeCount = computed(() => countCitations(clean.value))
const badDocs = computed(() => unknownCitations(clean.value))

function go (kind, text) {
  lastAction.value = { kind, text }
  let p
  if (kind === 'write') p = writeSectionPrompt(props.sKey, props.title, props.num)
  else if (kind === 'selection') p = rewriteSelectionPrompt(props.sKey, props.title, props.selection.text, props.getHtml(), text)
  else p = rewriteSectionPrompt(props.sKey, props.title, props.getHtml(), text)
  runner.run({
    system: p.system,
    messages: [{ role: 'user', content: p.content }],
    maxTokens: kind === 'write' ? 20000 : 14000,
    effort: kind === 'write' ? 'high' : 'medium',
  })
}

function submitFree () {
  const text = instruction.value.trim()
  if (!text) return
  go(props.selection ? 'selection' : 'rewrite', text)
}

const retry = () => { if (lastAction.value) go(lastAction.value.kind, lastAction.value.text) }

function replace () {
  const ok = props.onReplace(props.selection ? clean.value : markAsDraft(clean.value))
  if (ok === false) { lostSelection.value = true; return }
  emit('close')
}
function append () {
  emit('append', markAsDraft(clean.value))
  emit('close')
}

/* Fokus bliver på knappen, man brugte: "Prøv igen" bliver til "Stop", og når svaret er færdigt, bliver
   "Stop" til "Prøv igen" (eller "Kassér", når svaret var tomt). Knapperne er mærket med data-act. */
const actionsEl = ref(null)
const phase = computed(() => (runner.running ? 'running' : runner.done ? (clean.value.trim() ? 'done' : 'empty') : 'idle'))
watch(phase, (now, before) => {
  const a = document.activeElement
  const act = a && actionsEl.value && actionsEl.value.contains(a) ? a.getAttribute('data-act') : null
  let next = null
  if (before === 'done' && now === 'running' && act === 'retry') next = 'stop'
  else if (before === 'running' && act === 'stop') next = now === 'done' ? 'retry' : now === 'empty' ? 'discard' : null
  if (!next) return
  nextTick(() => {
    const b = actionsEl.value && actionsEl.value.querySelector('[data-act="' + next + '"]')
    if (b) b.focus()
  })
}, { flush: 'pre' })
</script>

<template>
  <div
    class="ai-panel"
    @mousedown.stop
  >
    <a-card size="small">
      <template #title>
        <a-space :size="8">
          <span>{{ selection ? t('Omskriv markeret tekst') : t(title) }}</span>
          <AiBadge compact />
          <a-typography-text type="secondary">
            {{ status.ready ? t(status.provider.label) + ' - ' + status.model : t('ikke forbundet') }}
          </a-typography-text>
        </a-space>
      </template>
      <template #extra>
        <a-button
          type="text"
          size="small"
          @click="emit('close')"
        >
          {{ t('Luk') }}
        </a-button>
      </template>

      <div class="ai-panel-body">
        <a-typography-paragraph
          v-if="selection"
          type="secondary"
          class="ai-quote"
          :ellipsis="{ rows: 3 }"
          :content="'„' + selection.text + '“'"
        />

        <!-- Forbindelsen kan laves herfra -->
        <a-row
          v-if="!status.ready"
          :gutter="[12, 8]"
          align="middle"
        >
          <a-col flex="1 1 200px">
            <a-typography-text type="secondary">
              {{ t('Forbind din Claude-, ChatGPT- eller Copilot-konto, så kan AI skrive eller omskrive afsnittet ud fra sagens dokumenter.') }}
            </a-typography-text>
          </a-col>
          <a-col
            v-if="onConnect"
            flex="none"
          >
            <a-button
              size="small"
              @click="onConnect"
            >
              {{ t('Forbind AI') }}
            </a-button>
          </a-col>
        </a-row>

        <template v-else>
          <a-typography-text
            v-if="idle"
            type="secondary"
          >
            {{ t('Grundlag: regnskabstallene og') }} {{ docNames() }}
          </a-typography-text>

          <a-space
            v-if="idle"
            wrap
            :size="[6, 6]"
          >
            <a-button
              v-if="!selection"
              size="small"
              :title="t('Skriv afsnittet forfra ud fra dokumenterne')"
              @click="go('write')"
            >
              {{ t('Skriv afsnittet forfra') }}
            </a-button>
            <a-button
              v-for="p in REWRITE_PRESETS"
              :key="p.id"
              size="small"
              :title="t(p.hint)"
              @click="go(selection ? 'selection' : 'rewrite', p.instruction)"
            >
              {{ t(p.label) }}
            </a-button>
          </a-space>

          <AiStreamPreview
            v-if="runner.running || runner.text"
            :text="runner.text"
            :running="runner.running"
            :done="runner.done"
          />

          <a-alert
            v-if="runner.error"
            type="error"
            :message="runner.error"
            show-icon
          />

          <a-space
            v-if="runner.done && clean"
            wrap
            :size="[10, 4]"
          >
            <a-typography-text type="secondary">
              {{ citeCount }} {{ citeCount === 1 ? t('kildehenvisning') : t('kildehenvisninger') }}
            </a-typography-text>
            <!-- Advarslen står i normal tekstfarve med et gult ikon foran (advarselsfarven er for lys til tekst) -->
            <span v-if="badDocs.length > 0">
              <a-typography-text type="warning">
                <ExclamationCircleOutlined aria-hidden="true" />
              </a-typography-text>
              {{ t('Peger på') }} {{ badDocs.length }} {{ badDocs.length === 1 ? t('dokument der ikke findes i sagen:') : t('dokumenter der ikke findes i sagen:') }} {{ badDocs.join(', ') }}
            </span>
          </a-space>

          <a-alert
            v-if="lostSelection"
            type="warning"
            :message="t('Markeringen findes ikke længere, formentlig fordi der er klikket et andet sted i memoet mens teksten blev skrevet. Ingenting er indsat. Markér passagen igen, så er teksten her stadig.')"
            show-icon
          />

          <div ref="actionsEl">
            <a-row
              v-if="runner.running"
              justify="space-between"
              align="middle"
            >
              <a-col>
                <a-typography-text type="secondary">
                  {{ t('Skriver…') }}
                </a-typography-text>
              </a-col>
              <a-col>
                <a-button
                  size="small"
                  data-act="stop"
                  @click="runner.stop"
                >
                  {{ t('Stop') }}
                </a-button>
              </a-col>
            </a-row>

            <!-- Et tomt svar må aldrig kunne indsættes: det ville sætte afsnittet til tom streng og gemme det -->
            <a-row
              v-else-if="runner.done && !clean.trim()"
              :gutter="8"
              align="middle"
              :wrap="false"
            >
              <a-col flex="auto">
                <a-typography-text type="warning">
                  <ExclamationCircleOutlined aria-hidden="true" />
                </a-typography-text>
                {{ t('Modellen svarede ikke med brugbar tekst. Afsnittet er urørt.') }}
              </a-col>
              <a-col flex="none">
                <a-space :size="8">
                  <a-button
                    size="small"
                    data-act="retry"
                    @click="retry"
                  >
                    {{ t('Prøv igen') }}
                  </a-button>
                  <a-button
                    type="text"
                    size="small"
                    data-act="discard"
                    @click="runner.reset"
                  >
                    {{ t('Kassér') }}
                  </a-button>
                </a-space>
              </a-col>
            </a-row>

            <a-row
              v-else-if="runner.done"
              justify="space-between"
              align="middle"
              :gutter="[8, 8]"
            >
              <a-col>
                <a-space
                  wrap
                  :size="8"
                >
                  <a-button
                    type="primary"
                    size="small"
                    @click="replace"
                  >
                    {{ selection ? t('Erstat det markerede') : t('Erstat afsnittet') }}
                  </a-button>
                  <a-button
                    v-if="!selection"
                    size="small"
                    @click="append"
                  >
                    {{ t('Indsæt nedenfor') }}
                  </a-button>
                  <a-button
                    type="text"
                    size="small"
                    data-act="retry"
                    @click="retry"
                  >
                    {{ t('Prøv igen') }}
                  </a-button>
                </a-space>
              </a-col>
              <a-col>
                <a-button
                  type="text"
                  size="small"
                  data-act="discard"
                  @click="runner.reset"
                >
                  {{ t('Kassér') }}
                </a-button>
              </a-col>
            </a-row>

            <form
              v-else
              @submit.prevent="submitFree"
            >
              <a-row
                :gutter="6"
                :wrap="false"
              >
                <a-col flex="auto">
                  <a-input
                    ref="inputRef"
                    v-model:value="instruction"
                    :placeholder="selection ? t('Hvad skal der ske med den markerede tekst?') : t('Skriv din egen instruktion, f.eks. “tilføj et afsnit om valutarisikoen”')"
                  />
                </a-col>
                <a-col flex="none">
                  <a-button
                    type="primary"
                    html-type="submit"
                    :disabled="!instruction.trim()"
                  >
                    {{ t('Kør') }}
                  </a-button>
                </a-col>
              </a-row>
            </form>
          </div>
        </template>
      </div>
    </a-card>
  </div>
</template>

<style scoped>
/* Panelets dele står under hinanden med luft imellem */
.ai-panel-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Markeringen står i citationstegn over handlingerne; afstanden giver panelet */
.ai-quote {
  margin-bottom: 0;
}
</style>
