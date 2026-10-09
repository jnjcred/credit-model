<script setup>
// Fanen Indstilling (WSIndstil i workspace.jsx L3379–3614). Findes kun med det indbyggede memo
// (localStorage cw_memo_mode = 'builtin'); i piloten er fanen skjult.
// Før indstillingen: klarhedstjekket i fire grupper (Blokerer, Kræver en begrundelse, Til
// orientering, I orden), begrundelserne, noten til komitéen og knappen. Knappen kan altid trykkes;
// mangler noget, står det med rødt under knappen, og markøren sættes i den første manglende
// begrundelse. Efter indstillingen: kvitteringen (SubmittedReceipt).
// Begrundelser og note gemmes i sagen, mens der skrives (400 ms efter sidste tegn, straks ved blur
// og når siden lukkes), så de overlever genindlæsning og faneskift. Sagen monterer siden forfra,
// når den indstilles eller trækkes tilbage (nøglen submitted), så begrundelserne fra sidste version
// forudfyldes efter en tilbagetrækning. Logikken står i src/domain/workspace/readiness.js.
//
// Props: caseId.
// Emits: focus-overview(target): gå til Overblik og rul til afsnittet (f.eks. 'ws-outstanding');
//        sagen gør det med sagshovedets focusOverview.
import { computed, onMounted, reactive, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { go } from '@/composables/useNavigation'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import { wsFill } from '@/domain/workspace/format'
import { wsStage } from '@/domain/workspace/stage'
import {
  WS_REASON_MIN_WORDS, wsIndstilCheck, wsIndstilPrefill, wsPersistSubmitDraft, wsRunAction, wsSubmitIndstilling,
} from '@/domain/workspace/readiness'
import { useCaseAndMemo } from './composables/useMemoStatus'
import { useDebouncedPersist } from './composables/useDebouncedPersist'
import ReadinessGroup from './ReadinessGroup.vue'
import ReadinessRow from './ReadinessRow.vue'
import SubmittedReceipt from './SubmittedReceipt.vue'
import SourceLink from './shared/SourceLink.vue'

const props = defineProps({
  caseId: { type: Number, required: true },
})
const emit = defineEmits(['focus-overview'])

const caseVersion = useCaseVersion()
const submitted = computed(() => {
  caseVersion.value
  return !!CW.caseState().submittedAt
})

// Felternes startværdier: kladden i sagen, efter en tilbagetrækning begrundelserne fra sidste version
const pre = wsIndstilPrefill(CW.caseState())
const note = ref(pre.note)
const reasons = reactive(pre.reasons)
const prefillFrom = pre.prefillFrom
const touched = reactive({})
const tried = ref(false)

// Begrundelserne gemmes i stilhed
const { persistSoon, flush, cancel } = useDebouncedPersist(() => wsPersistSubmitDraft({ reasons: { ...reasons }, note: note.value }), 400)
function setReason (id, v) {
  reasons[id] = v
  persistSoon()
}
function setNote (v) {
  note.value = v
  persistSoon()
}
function onReasonBlur (id) {
  touched[id] = true
  flush()
}

// Klarhedstjekket følger sagen, memoet og begrundelserne
const check = useCaseAndMemo(() => wsIndstilCheck(wsStage(), reasons))

// Siden får fokus på overskriften, når man kommer hertil, og når den skifter
// mellem indstilling og kvittering (siden monteres forfra)
onMounted(() => CW.focusSoon('#ws-indstil-title'))

const runAction = (a) => wsRunAction(a, go, props.caseId, (target) => emit('focus-overview', target))
const backToIndstil = computed(() => ({ route: 'workspace:' + props.caseId + ':indstil', label: t('Tilbage til indstillingen') }))

function submit () {
  wsSubmitIndstilling(check.value, reasons, note.value, { setTried: (v) => { tried.value = v }, cancelSave: cancel })
}

// Betingelserne før udbetaling står i en fold (Mellemrum folder også, som på prototypens knap)
const condsOpen = ref([])
const onFoldKeydown = useCollapseKeyboard()

const minWords = computed(() => wsFill(t('Mindst {n} ord.'), { n: WS_REASON_MIN_WORDS }))
const reasonBad = (r) => check.value.isBad(r, tried.value, touched)
</script>

<template>
  <SubmittedReceipt v-if="submitted" />
  <div
    v-else
    class="ws-indstil"
  >
    <div>
      <a-typography-title
        id="ws-indstil-title"
        :level="2"
        tabindex="-1"
      >
        {{ t('Indstil til kreditkomité') }}
      </a-typography-title>
      <a-typography-paragraph type="secondary">
        {{ t('Løs det, der blokerer, og begrund resten. Memoet låses, når du indstiller.') }}
      </a-typography-paragraph>
      <a-typography-paragraph
        v-if="prefillFrom && check.nReason > 0"
        type="secondary"
      >
        {{ wsFill(t('Begrundelserne er hentet fra version {v}. Læs dem igen, og ret dem, hvis noget er ændret.'), { v: prefillFrom }) }}
      </a-typography-paragraph>
    </div>

    <a-form
      layout="vertical"
      class="ws-indstil-form"
    >
      <ReadinessGroup
        id="ws-grp-block"
        :title="t('Blokerer indstillingen')"
        :count="check.nBlock"
        :rows="check.blockRows"
        :case-id="caseId"
        @run-action="runAction"
      />

      <ReadinessGroup
        id="ws-grp-reason"
        :title="t('Kræver en begrundelse')"
        :count="check.nReason"
        :rows="check.reasonRows"
        :case-id="caseId"
        @run-action="runAction"
      >
        <template #row="{ row }">
          <ReadinessRow
            :r="row"
            :case-id="caseId"
            @run-action="runAction"
          >
            <!-- Kravet står der hele tiden; fejlen vises, når man har forladt feltet eller forsøgt at indstille -->
            <a-form-item
              class="ws-reason"
              :label="t('Begrundelse')"
              :html-for="'ws-reason-' + row.id"
              :validate-status="reasonBad(row) ? 'error' : undefined"
            >
              <a-textarea
                :id="'ws-reason-' + row.id"
                :value="reasons[row.id] || ''"
                :rows="2"
                :aria-label="wsFill(t('Begrundelse for {item}'), { item: row.title })"
                :aria-invalid="reasonBad(row) || undefined"
                :aria-describedby="'ws-reason-hint-' + row.id"
                @update:value="(v) => setReason(row.id, v)"
                @blur="onReasonBlur(row.id)"
              />
              <template
                v-if="reasonBad(row)"
                #help
              >
                <span :id="'ws-reason-hint-' + row.id">{{ check.problems[row.id] }}</span>
              </template>
              <template
                v-else
                #extra
              >
                <span :id="'ws-reason-hint-' + row.id">{{ minWords }}</span>
              </template>
            </a-form-item>
          </ReadinessRow>
        </template>
      </ReadinessGroup>

      <ReadinessGroup
        id="ws-grp-info"
        :title="t('Til orientering')"
        :count="check.infoShown.length"
        :rows="check.infoShown"
        :case-id="caseId"
        @run-action="runAction"
      >
        <template #row="{ row }">
          <ReadinessRow
            :r="row"
            :case-id="caseId"
            @run-action="runAction"
          >
            <div
              v-if="row.id === 'conds'"
              @keydown="onFoldKeydown"
            >
              <a-collapse
                v-model:active-key="condsOpen"
                ghost
                :expand-icon="collapseExpandIcon"
              >
                <a-collapse-panel
                  key="conds"
                  :header="t('Vis betingelser') + ' (' + check.condRows.length + ')'"
                >
                  <a-list
                    size="small"
                    :data-source="check.condRows"
                    row-key="id"
                  >
                    <template #renderItem="{ item: c }">
                      <a-list-item>
                        <div>
                          <a-typography-text>{{ c.title }}</a-typography-text>
                          <a-typography-text
                            v-if="c.done"
                            type="secondary"
                          >
                            {{ ' - ' + c.text }}
                          </a-typography-text>
                          <template v-if="c.source">
                            {{ ' ' }}<SourceLink
                              :source="c.source"
                              :case-id="caseId"
                              :back="backToIndstil"
                            />
                          </template>
                        </div>
                      </a-list-item>
                    </template>
                  </a-list>
                </a-collapse-panel>
              </a-collapse>
            </div>
          </ReadinessRow>
        </template>
      </ReadinessGroup>

      <ReadinessGroup
        id="ws-grp-ok"
        :title="t('I orden')"
        :rows="check.okRows"
        :case-id="caseId"
        @run-action="runAction"
      />

      <a-form-item
        :label="t('Note til kreditkomitéen (valgfri)')"
        html-for="ws-submit-note"
      >
        <a-textarea
          id="ws-submit-note"
          :value="note"
          :rows="3"
          :placeholder="t('F.eks. indstilles til bevilling på vilkårene i Bilag 1.')"
          @update:value="setNote"
        />
      </a-form-item>

      <!-- Knappen kan altid trykkes. Det, der mangler, står under den: gråt, indtil man har forsøgt -->
      <a-form-item :validate-status="!check.canSend && tried ? 'error' : undefined">
        <a-button
          id="ws-submit-btn"
          type="primary"
          :aria-describedby="!check.canSend ? 'ws-submit-msg' : undefined"
          @click="submit"
        >
          {{ t('Indstil til kreditkomité') }}
        </a-button>
        <template
          v-if="!check.canSend && tried"
          #help
        >
          <span id="ws-submit-msg">{{ check.submitMsg }}</span>
        </template>
        <template
          v-else-if="!check.canSend"
          #extra
        >
          <span id="ws-submit-msg">{{ check.submitMsg }}</span>
        </template>
      </a-form-item>
    </a-form>
  </div>
</template>

<style scoped>
.ws-indstil {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 820px;
  margin: 0 auto;
  padding: 40px 32px 80px;
}

.ws-indstil-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Begrundelsen står under rækkens tekst */
.ws-reason {
  margin-top: 8px;
  margin-bottom: 0;
}

/* Overskriften får fokus, når siden åbnes (ingen ramme om en overskrift) */
[tabindex="-1"]:focus {
  outline: none;
}

@media (max-width: 999px) {
  .ws-indstil {
    padding: 24px 16px 64px;
  }
}
</style>
