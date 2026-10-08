<script setup>
// "Anmod om materiale" / "Ret i anmodningen" (WSMaterialModal i workspace.jsx L1749–2237): vinduet,
// hvor rådgiveren vælger materialet (med upload på kundens vegne), tjekker modtager og mail og
// sender. Tre trin: punkterne (MaterialSelectStep) → mailen (RequestPreviewStep) → kvitteringen
// (RequestSentResult). Valgene er kladden (CW.selection og CW.draft), så intet går tabt, hvis vinduet
// lukkes; kunden ser kun det sendte. Reglerne ligger i src/domain/workspace/request.js.
//
// Vinduet er åbent, så længe det er monteret: Overblik viser det med v-if og :key 'sent' / 'edit',
// som før, så kvitteringen er et nyt vindue.
// Props:
//   caseData  sagen (wsCaseData(caseId))
//   request   den sendte anmodning (CW.request()) eller null (første gang)
//   sent      kvitteringen { name, count, deadline, update, noMail }, eller null
// Emits: close (Luk, Esc, klik udenfor, Kassér ændringer og Tilbage til sagen), sent(info) (sendt;
//        Overblik viser kvitteringen)
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowRightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsDiscardDraft, wsMaterialHeading, wsMaterialModel, wsMaterialSend } from '@/domain/workspace/request'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { dialogBodyStyle, scrollDialogBodyToTop } from '@/components/common/dialogBody'
import MaterialSelectStep from './MaterialSelectStep.vue'
import RequestPreviewStep from './RequestPreviewStep.vue'
import RequestSentResult from './RequestSentResult.vue'

const props = defineProps({
  caseData: { type: Object, required: true },
  request: { type: Object, default: null },
  sent: { type: Object, default: null },
})
const emit = defineEmits(['close', 'sent'])

const view = ref(props.sent ? 'sent' : 'list')
const tried = ref(false)
const editRec = ref(false)

const version = useCaseVersion()
const model = computed(() => {
  version.value
  return wsMaterialModel(props.caseData, props.request)
})
const heading = computed(() => wsMaterialHeading(props.sent, props.request, view.value))
// Fejlen ved knapperne vises først, når der er trykket (som før)
const footError = computed(() => (!tried.value ? null : view.value === 'list' ? model.value.listError : model.value.check.error))

function next () {
  if (model.value.listError) { tried.value = true; return }
  tried.value = false
  view.value = 'preview'
}
function back () {
  tried.value = false
  view.value = 'list'
}
function send () {
  wsMaterialSend(props.caseData, props.request, model.value, {
    setTried: (v) => { tried.value = v },
    setEditRec: (v) => { editRec.value = v },
    onClose: () => emit('close'),
    onSent: (info) => emit('sent', info),
    setView: (v) => { view.value = v },
  })
}
const discard = () => wsDiscardDraft(() => emit('close'))
const copyLink = () => model.value.copyLink()

// Fokus på overskriften, når vinduet åbner og ved hvert trin (andre skærme bruger også
// #ws-material-title). Lukkes vinduet, får det element fokus igen, der havde det, da vinduet åbnede
// (vinduet flytter selv fokus ind, så antdv når ikke at huske det).
const returnFocus = document.activeElement
// Kvitteringen er et nyt vindue, mens afsendelsen flytter fokus til fasekortet bag det
// (#ws-hero-title, som før). antdv flytter så fokus til sit usynlige fokusværn, når vinduet er
// åbnet, og fokus kan ikke ses. Fokus lægges i stedet på kvitteringens overskrift (afvigelse: før
// stod fokus på fasekortet bag vinduet).
const receiptTimers = []
function keepReceiptFocus () {
  const title = document.getElementById('ws-material-title')
  const box = title && title.closest('[role="dialog"]')
  const a = document.activeElement
  if (!title || !box) return
  if (!box.contains(a) || (a && a.tagName === 'DIV' && !a.textContent.trim())) title.focus()
}
onMounted(() => {
  CW.focusSoon('#ws-material-title')
  if (props.sent) [150, 500, 1000].forEach((ms) => receiptTimers.push(setTimeout(keepReceiptFocus, ms)))
})
// Et nyt trin (listen, gennemsynet, kvitteringen) starter øverst, og titlen får fokus
watch(view, () => {
  nextTick(() => scrollDialogBodyToTop(document.getElementById('ws-material')))
  CW.focusSoon('#ws-material-title')
})
onBeforeUnmount(() => {
  receiptTimers.forEach(clearTimeout)
  if (returnFocus && returnFocus.focus && document.contains(returnFocus)) {
    try { returnFocus.focus() } catch (e) {}
  }
})
</script>

<template>
  <a-modal
    :visible="true"
    :wrap-props="{ 'aria-modal': 'true' }"
    :width="720"
    :body-style="dialogBodyStyle"
    :footer="view === 'sent' ? null : undefined"
    @cancel="emit('close')"
  >
    <template #title>
      <span
        id="ws-material-title"
        role="heading"
        aria-level="2"
        tabindex="-1"
      >{{ heading.title }}</span>
    </template>

    <!-- id: andre skærme ruller og sætter fokus hertil (fx Dataanmodninger og "Åbn anmodningen") -->
    <div id="ws-material">
      <a-typography-paragraph type="secondary">
        {{ heading.subtitle }}
      </a-typography-paragraph>
      <RequestSentResult
        v-if="view === 'sent' && sent"
        :title="heading.sentTitle"
        :text="heading.sentText"
        :show-link="!!sent.noMail && !sent.update"
        :link="model.reqLink"
        @copy-link="copyLink"
        @close="emit('close')"
      />
      <KeepAlive>
        <MaterialSelectStep
          v-if="view === 'list'"
          :model="model"
        />
      </KeepAlive>
      <RequestPreviewStep
        v-if="view === 'preview'"
        v-model:edit-rec="editRec"
        :case-data="caseData"
        :request="request"
        :model="model"
        @copy-link="copyLink"
      />
    </div>

    <template #footer>
      <!-- Knapperne er altid aktive; et klik, der ikke kan gennemføres, viser hvorfor -->
      <a-form-item
        class="ws-req-foot"
        :validate-status="footError ? 'error' : undefined"
        :help="footError || undefined"
      >
        <a-row
          justify="space-between"
          align="middle"
          :gutter="8"
        >
          <a-col>
            <a-button
              v-if="view === 'list' && model.canDiscard"
              type="text"
              @click="discard"
            >
              {{ t('Kassér ændringer') }}
            </a-button>
          </a-col>
          <a-col>
            <a-space>
              <a-button
                v-if="view === 'list'"
                type="primary"
                @click="next"
              >
                {{ t('Næste') }}
                <ArrowRightOutlined aria-hidden="true" />
              </a-button>
              <template v-else>
                <a-button @click="back">
                  {{ t('Tilbage') }}
                </a-button>
                <a-button
                  id="ws-send-request"
                  type="primary"
                  @click="send"
                >
                  {{ model.sendLabel }}
                </a-button>
              </template>
            </a-space>
          </a-col>
        </a-row>
      </a-form-item>
    </template>
  </a-modal>
</template>

<style scoped>
/* Knapperne står nederst i vinduet uden formularfeltets afstand under sig */
.ws-req-foot {
  margin-bottom: 0;
}
</style>
