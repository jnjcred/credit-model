<script setup>
// Prøv på Nordhavn: kør kladden (det, der står i felterne nu) uden at gemme noget, og vis svaret
// og den prompt, der blev sendt. "Brug som AI-udkast" lægger teksten under Virksomheden.
// Kørslen og AI-teksterne hører til Virksomheden (src/domain/financials/finAiTexts.js).
// Props: meta (en post i PW_FILES), draft ({ web, system, task }: det, der står i felterne nu).
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { SyncOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { AI } from '@/domain/ai'
import { CW } from '@/domain/case_state'
import { pwFill, pwWords } from '@/domain/prompts'
import { FIN_AI_DEFS, finAiGenerate, finAiPatch } from '@/domain/financials/finAiTexts'
import { useAiStatus } from '@/components/ai/useAiStatus'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'

const props = defineProps({
  meta: { type: Object, required: true }, // { file, label, ids }
  draft: { type: Object, required: true }, // { web, system, task }
})

const target = ref(props.meta.ids[0])
const running = ref(false)
const elapsed = ref(0)
const result = ref(null)
const live = ref('')
const err = ref(null)
let ctrl = null
let timer = null

const ai = useAiStatus()
const ready = computed(() => ai.value.ready)
const onFoldKeydown = useCollapseKeyboard()
const searching = computed(() => {
  ai.value
  return !!(props.draft.web && AI.canSearch && AI.canSearch())
})

watch(() => props.meta.file, () => { target.value = props.meta.ids[0]; result.value = null; err.value = null })

// Sekunderne, mens AI'en arbejder
watch(running, (on) => {
  clearInterval(timer)
  if (!on) return
  const t0 = Date.now()
  timer = setInterval(() => { elapsed.value = Math.round((Date.now() - t0) / 1000) }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))

async function run () {
  if (running.value || !ready.value) return
  running.value = true; err.value = null; result.value = null; live.value = ''; elapsed.value = 0
  ctrl = new AbortController()
  const draft = props.draft
  try {
    const r = await finAiGenerate(target.value, { system: draft.system, task: draft.task, web: draft.web }, {
      signal: ctrl.signal,
      onDelta: (d, all) => { if (typeof all === 'string') live.value = all },
    })
    result.value = r
  } catch (e) {
    if (!(e && e.code === 'abort')) err.value = e.message || String(e)
  } finally { running.value = false; ctrl = null }
}
const stop = () => { if (ctrl) ctrl.abort() }
function use () {
  if (!result.value) return
  finAiPatch(target.value, { ai: result.value.text, aiAt: new Date().toISOString(), aiWeb: result.value.web, edited: null, editedAt: null, editedBy: null })
  CW.toast(t('Teksten står nu som AI-udkast under Virksomheden'))
}

const label = (id) => { const d = FIN_AI_DEFS[id]; return d ? t(d.label) : id }
const targetOptions = computed(() => props.meta.ids.map(id => ({ value: id, label: label(id) })))
const words = computed(() => (result.value ? pwWords(result.value.text) : 0))
const lines = computed(() => (result.value ? Math.max(1, Math.ceil(result.value.text.length / 110)) : 0))
</script>

<template>
  <section aria-labelledby="pw-try-h">
    <a-card
      size="small"
      type="inner"
    >
      <template #title>
        <span
          id="pw-try-h"
          role="heading"
          aria-level="3"
        >{{ t('Prøv på Nordhavn') }}</span>
      </template>
      <template #extra>
        <a-space>
          <!-- Navnet via en skjult etiket: aria-label på a-select når ikke frem til feltet i 3.2.13 -->
          <template v-if="meta.ids.length > 1">
            <label
              class="sr-only"
              for="pw-try-target"
            >{{ t('Hvilket punkt') }}</label>
            <a-select
              id="pw-try-target"
              v-model:value="target"
              size="small"
              :options="targetOptions"
              :dropdown-match-select-width="false"
            />
          </template>
          <!-- Én knap, der skifter mellem Kør kladden og Stop, så fokus bliver på den -->
          <a-button
            size="small"
            :disabled="!running && !ready"
            :title="running || ready ? undefined : t('Forbind en AI øverst på siden for at prøve promptet')"
            @click="running ? stop() : run()"
          >
            <template
              v-if="!running"
              #icon
            >
              <SyncOutlined aria-hidden="true" />
            </template>
            {{ running ? t('Stop') : t('Kør kladden') }}
          </a-button>
        </a-space>
      </template>

      <a-typography-paragraph type="secondary">
        {{ ready ? t('Kører det, der står i felterne nu, også selv om det ikke er gemt. Intet ændres i sagen, før du vælger at bruge teksten.') : t('Forbind en AI øverst på siden for at prøve promptet.') }}
      </a-typography-paragraph>

      <div
        class="pw-try-out"
        aria-live="polite"
      >
        <a-space v-if="running">
          <a-spin size="small" />
          <a-typography-text type="secondary">
            {{ (searching ? t('AI søger på nettet og skriver …') : t('AI skriver …')) + ' ' + elapsed + ' s' }}
          </a-typography-text>
        </a-space>
        <a-typography-paragraph
          v-if="running && live"
          type="secondary"
        >
          {{ live }}
        </a-typography-paragraph>
        <a-alert
          v-if="err"
          type="error"
          :message="err"
          show-icon
        />
        <template v-if="result">
          <a-card size="small">
            {{ result.text }}
          </a-card>
          <div class="pw-result-meta">
            <a-typography-text type="secondary">
              {{ pwFill(t('{ord} ord - ca. {linjer} linjer i boksen - {sek} s - {web}'), { ord: words, linjer: lines, sek: elapsed, web: result.web ? t('med websøgning') : t('uden websøgning') }) }}
            </a-typography-text>
            <a-button
              size="small"
              @click="use"
            >
              {{ pwFill(t('Brug som AI-udkast for {navn}'), { navn: label(target) }) }}
            </a-button>
          </div>
          <!-- Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter) -->
          <div @keydown="onFoldKeydown">
            <a-collapse
              ghost
              :expand-icon="collapseExpandIcon"
            >
              <a-collapse-panel
                id="pw-sent"
                key="sent"
                :header="t('Prompten, der blev sendt')"
              >
                <a-form layout="vertical">
                  <a-form-item
                    :label="t('System')"
                    html-for="pw-sent-system"
                  >
                    <a-textarea
                      id="pw-sent-system"
                      :value="result.system"
                      readonly
                      :auto-size="{ minRows: 3, maxRows: 10 }"
                    />
                  </a-form-item>
                  <a-form-item
                    :label="t('Opgave')"
                    html-for="pw-sent-task"
                  >
                    <a-textarea
                      id="pw-sent-task"
                      :value="result.task"
                      readonly
                      :auto-size="{ minRows: 3, maxRows: 14 }"
                    />
                  </a-form-item>
                </a-form>
              </a-collapse-panel>
            </a-collapse>
          </div>
        </template>
      </div>
    </a-card>
  </section>
</template>

<style scoped>
.pw-try-out {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pw-result-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
