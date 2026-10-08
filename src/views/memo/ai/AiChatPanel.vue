<script setup>
// "Spørg om sagen": sagschatten i memoets højre skinne (memo_ai.jsx: AiChatPanel L1035-1153). Chatten kender
// sagens dokumenter, regnskabstallene og memoets nuværende tekst (getMemoText). Foreslår svaret tekst til et
// afsnit (en ```html-blok eller bar HTML), vises forslaget som et kort med "Indsæt i" + afsnit + "Indsæt";
// siden indsætter det som et udkast fra chatten (insert-eventet).
// - Uden historik: en kort forklaring og fire startspørgsmål.
// - Svaret kommer løbende med en indikator; "Stop" afbryder; en fejl vises under samtalen (spørgsmålet
//   bliver stående uden svar). "Ryd" tømmer samtalen.
// Spørgsmålet står med fed skrift, svaret med AI-mærket først; modellens tekst beholder sine linjeskift.
// Opgaven (chatPrompt), opdelingen af svaret (splitSuggestions), startspørgsmålene og oprydningen
// (cleanHtml) står i src/domain/memo/memoAi.js.
// Fokus: feltet får fokus, når chatten vises (et deaktiveret felt kan ikke få fokus). "Send" og "Stop" er
// den samme knap, så fokus bliver på den, når den skifter (som før).
// Højden er som før fast (panelet i alt ca. 690 px), men aldrig højere end der er plads til i vinduet under
// fanerne: sagens sidehoved er højere end i prototypen, så feltet og "Send" ellers lå uden for skærmen ved
// 900 px høje vinduer (skinnen står fast, så de kunne ikke rulles frem). Mindst 320 px, som kommentarerne.
// Kendt fra prototypen (bevaret): samtalen går tabt, når skinnen skifter til "Kommentarer" (komponenten
// afmonteres); startspørgsmålene kan klikkes, også når der ikke er forbundet en AI (det giver fejlen
// "Der er ikke forbundet til en AI-konto endnu."); på engelsk vises startspørgsmålene oversat, men det
// danske spørgsmål sendes og står i samtalen; alle forslag deler ét valgt afsnit.
//
// Props: open (chatten vises), getMemoText (memoets tekst nu), sections ([{ k, num, label }]).
// Emits: insert(afsnitsnøgle, html).
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { LoadingOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import AiBadge from '@/components/common/AiBadge.vue'
import { useAiStatus } from '@/components/ai/useAiStatus'
import { useSelectEscape } from '@/composables/useSelectEscape'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { CHAT_STARTERS, chatPrompt, cleanHtml, splitSuggestions } from '@/domain/memo/memoAi'
import { useAiRun } from './useAiRun'

const props = defineProps({
  open: { type: Boolean, default: false },
  getMemoText: { type: Function, required: true },
  sections: { type: Array, default: () => [] },
})
const emit = defineEmits(['insert'])

const status = useAiStatus()
const runner = useAiRun()
// Samtalen: [{ role: 'user' | 'assistant', content }]. Erstattes altid med en ny liste.
const history = shallowRef([])
const q = ref('')
// Afsnittet forslagene indsættes i (ét fælles valg for alle forslag)
const target = ref(props.sections && props.sections.length ? props.sections[0].k : null)
const sectionOptions = computed(() => (props.sections || []).map(s => ({ value: s.k, label: s.num + '. ' + t(s.label) })))
const bodyEl = ref(null)
const inputRef = ref(null)
// Esc i den åbne afsnitsliste lukker kun listen, ikke skuffen omkring chatten (smal skærm)
const selectEsc = useSelectEscape()

const focusInput = () => { if (props.open && inputRef.value) inputRef.value.focus() }
onMounted(focusInput)
watch(() => props.open, () => nextTick(focusInput))

// Samtalens højde: 624 px (690 i alt med panelets overskrift og kant), eller det, der er plads til
const frameEl = ref(null)
const frameH = ref(624)
function fitHeight () {
  if (!frameEl.value) return
  const top = frameEl.value.getBoundingClientRect().top
  frameH.value = Math.max(320, Math.min(624, Math.round(window.innerHeight - top - 36)))
}
onMounted(fitHeight)
useWindowEvent('resize', fitHeight)

// Samtalen ruller med til bunden, når der kommer nyt
const toBottom = () => { if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight }
onMounted(toBottom)
watch([history, () => runner.text, () => props.open], toBottom, { flush: 'post' })

async function ask (question) {
  const text = (question || q.value).trim()
  if (!text || runner.running) return
  q.value = ''
  const prev = history.value
  history.value = prev.concat([{ role: 'user', content: text }])
  // Opgaven bygges af samtalen før spørgsmålet; spørgsmålet kommer sidst
  const p = chatPrompt(props.getMemoText(), prev, text)
  const answer = await runner.run({
    system: p.system,
    messages: p.messages,
    maxTokens: 12000,
    effort: 'medium',
  })
  if (answer != null) {
    history.value = history.value.concat([{ role: 'assistant', content: answer }])
    runner.reset()
  }
}

function clear () {
  history.value = []
  runner.reset()
}

// "Send" sender formularen; mens svaret kommer, er den samme knap "Stop"
function onFootButton () {
  if (runner.running) runner.stop()
}

const streaming = computed(() => !!(runner.running || (runner.text && !runner.done)))
</script>

<template>
  <a-card
    v-if="open"
    size="small"
    class="ai-chat"
  >
    <!-- Fanen over panelet hedder allerede "Spørg om sagen". Her står kun forbindelsen og Ryd. -->
    <template #title>
      <a-typography-text type="secondary">
        {{ status.ready ? t(status.provider.label) : t('ikke forbundet') }}
      </a-typography-text>
    </template>
    <template #extra>
      <a-button
        v-if="history.length > 0"
        type="text"
        size="small"
        @click="clear"
      >
        {{ t('Ryd') }}
      </a-button>
    </template>

    <div
      ref="frameEl"
      class="ai-chat-frame"
      :style="{ height: frameH + 'px' }"
    >
      <div
        ref="bodyEl"
        class="ai-chat-body"
      >
        <div v-if="history.length === 0 && !streaming">
          <a-typography-paragraph type="secondary">
            {{ t('Chatten kender sagens dokumenter, regnskabstallene og memoets nuværende tekst. Foreslår den tekst, kan du indsætte den direkte i et afsnit.') }}
          </a-typography-paragraph>
          <div class="ai-starters">
            <a-button
              v-for="s in CHAT_STARTERS"
              :key="s"
              block
              class="ai-starter"
              @click="ask(s)"
            >
              {{ t(s) }}
            </a-button>
          </div>
        </div>

        <template
          v-for="(m, i) in history"
          :key="i"
        >
          <div
            v-if="m.role === 'user'"
            class="ai-msg-text user"
          >
            <a-typography-text strong>
              {{ m.content }}
            </a-typography-text>
          </div>
          <div
            v-else
            class="ai-msg assistant"
          >
            <template
              v-for="(part, j) in splitSuggestions(m.content)"
              :key="j"
            >
              <div v-if="part.kind === 'text'">
                <AiBadge v-if="j === 0" />
                <div class="ai-msg-text">
                  {{ part.body.trim() }}
                </div>
              </div>
              <a-card
                v-else
                size="small"
                class="ai-suggest"
              >
                <template #title>
                  <AiBadge />
                </template>
                <!-- Modellens HTML, renset med cleanHtml (tilladte tags og attributter), som før -->
                <!-- eslint-disable vue/no-v-html -->
                <div
                  class="memo-body ai-suggest-body"
                  v-html="cleanHtml(part.body)"
                />
                <!-- eslint-enable vue/no-v-html -->
                <div
                  class="ai-suggest-foot"
                  @keydown.capture="selectEsc.onKeydownCapture"
                  @keydown="selectEsc.onKeydown"
                >
                  <label :for="'ai-insert-' + i + '-' + j">
                    <a-typography-text type="secondary">{{ t('Indsæt i') }}</a-typography-text>
                  </label>
                  <a-select
                    :id="'ai-insert-' + i + '-' + j"
                    v-model:value="target"
                    size="small"
                    class="ai-suggest-select"
                    :options="sectionOptions"
                    :dropdown-match-select-width="false"
                  />
                  <a-button
                    type="primary"
                    size="small"
                    @click="emit('insert', target, cleanHtml(part.body))"
                  >
                    {{ t('Indsæt') }}
                  </a-button>
                </div>
              </a-card>
            </template>
          </div>
        </template>

        <div
          v-if="streaming"
          class="ai-msg-text assistant"
        >
          {{ runner.text }}<LoadingOutlined
            spin
            aria-hidden="true"
          />
        </div>

        <a-alert
          v-if="runner.error"
          type="error"
          :message="runner.error"
          show-icon
        />
      </div>

      <form
        class="ai-chat-foot"
        @submit.prevent="ask()"
      >
        <a-row
          :gutter="6"
          :wrap="false"
        >
          <a-col flex="auto">
            <a-input
              ref="inputRef"
              v-model:value="q"
              :placeholder="status.ready ? t('Spørg om sagen…') : t('Forbind en AI-konto først')"
              :disabled="!status.ready"
            />
          </a-col>
          <a-col flex="none">
            <a-button
              :type="runner.running ? 'default' : 'primary'"
              :html-type="runner.running ? 'button' : 'submit'"
              :disabled="!runner.running && (!status.ready || !q.trim())"
              @click="onFootButton"
            >
              {{ runner.running ? t('Stop') : t('Send') }}
            </a-button>
          </a-col>
        </a-row>
      </form>
    </div>
  </a-card>
</template>

<style scoped>
/* Fast højde (frameH): samtalen ruller, feltet står nederst */
.ai-chat-frame {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Spørgsmål og svar under hinanden med luft imellem */
.ai-chat-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
}

.ai-msg {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Modellens og rådgiverens tekst beholder sine linjeskift */
.ai-msg-text {
  white-space: pre-wrap;
}

/* Startspørgsmålene: én pr. linje i fuld bredde; lange spørgsmål brydes over flere linjer */
.ai-starters {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-starter {
  height: auto;
  white-space: normal;
  text-align: left;
}

/* Et forslag: teksten ruller i sin egen boks (højst 260 px); "Indsæt i", afsnit og "Indsæt" på én linje, når
   der er plads (i den smalle skinne kommer "Indsæt" på linjen under, så afsnittets navn kan læses) */
.ai-suggest-body {
  max-height: 260px;
  overflow-y: auto;
}

.ai-suggest-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
}

.ai-suggest-select {
  flex: 1;
  min-width: 120px;
}
</style>
