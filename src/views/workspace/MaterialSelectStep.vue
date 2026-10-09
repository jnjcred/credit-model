<script setup>
// Første trin i "Anmod om materiale" (WSMaterialModal i workspace.jsx L2010–2132): punkterne, der
// er valgt (med upload på kundens vegne), rådgiverens egne punkter, "Tilføj andet materiale" og tre
// folde: mere materiale, du kan bede om; hentet automatisk (med "Spørg kunden"); og det, der allerede
// ligger på sagen. Valgene gemmes med det samme i kladden (CW.selection).
// Vinduet holder trinnet i live, mens forhåndsvisningen vises (KeepAlive), så foldene og en åben
// "Spørg kunden" står som før, når man går tilbage.
//
// Props: model (wsMaterialModel(caseData, request) fra src/domain/workspace/request.js)
// Emits: ingen
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsFill } from '@/domain/workspace/format'
import { wsAddAsk, wsAddCustomItem, wsMaterialCat, wsOpenAsk, wsUploadedByAdvisor } from '@/domain/workspace/request'
import { wsTakeAskItem } from '@/domain/workspace/actions'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import MaterialSelectRow from './MaterialSelectRow.vue'
import AskCustomerForm from './AskCustomerForm.vue'

const props = defineProps({
  model: { type: Object, required: true },
})

/* ── "Spørg kunden" om noget, der er hentet automatisk ───────────────────────
   asking: punktet, formularen er åben for. Åbnet fra Overblik ("Spørg kunden" ved en offentlig
   kilde) er punktet givet videre (wsTakeAskItem, bruges én gang), og folden står åben. */
const asking = ref(wsTakeAskItem())
const askText = ref('')
const askCat = ref('')
const askTried = ref(false)
const askUi = {
  setAsking: (v) => { asking.value = v },
  setAskText: (v) => { askText.value = v },
  setAskTried: (v) => { askTried.value = v },
  setAskCat: (v) => { askCat.value = v },
}
const openAsk = (it) => wsOpenAsk(it, asking.value, askUi)
const addAsk = (it) => wsAddAsk(it, askText.value, askCat.value, askUi)

// Foldene: "Hentet automatisk" står åben, når vinduet er åbnet fra "Spørg kunden"
const onCaseCount = computed(() => props.model.fetched.length + props.model.godkendt.length + props.model.gennemgang.length)
const openFolds = ref(asking.value ? ['onCase'] : [])
// Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter)
const onFoldKeydown = useCollapseKeyboard()

// Åbnet fra "Spørg kunden" på Overblik: kategorien er punktets, og markøren står i spørgsmålet
// (efter vinduets eget fokus på overskriften)
let askTimer = null
onMounted(() => {
  const first = asking.value
  if (!first) return
  const it0 = CW.itemById(first)
  if (it0) askCat.value = wsMaterialCat(it0)
  askTimer = setTimeout(() => {
    const el = document.getElementById('ws-ask-q-' + first)
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus() }
  }, 250)
})
onBeforeUnmount(() => clearTimeout(askTimer))

// Tilføj andet materiale (Enter i feltet eller knappen)
const newItem = ref('')
const addItem = (e) => {
  // Enter i feltet: preventDefault som før (L2018)
  if (e && e.type === 'keydown' && e.preventDefault) e.preventDefault()
  wsAddCustomItem(newItem.value, (v) => { newItem.value = v })
}
</script>

<template>
  <div>
    <MaterialSelectRow
      v-for="it in model.missing"
      :key="it.id"
      :item="it"
      :selected="!!model.sel[it.id]"
    />
    <MaterialSelectRow
      v-for="it in model.custom"
      :key="it.id"
      :item="it"
      :selected="!!model.sel[it.id]"
    />

    <a-row
      class="ws-req-add"
      :gutter="8"
      :wrap="false"
      align="middle"
    >
      <a-col flex="auto">
        <a-input
          id="ws-req-new"
          v-model:value="newItem"
          :placeholder="t('Tilføj andet materiale')"
          :aria-label="t('Tilføj andet materiale')"
          @press-enter="addItem"
        >
          <template #prefix>
            <PlusOutlined aria-hidden="true" />
          </template>
        </a-input>
      </a-col>
      <a-col
        v-if="newItem.trim()"
        flex="none"
      >
        <a-button @click="addItem">
          {{ t('Tilføj') }}
        </a-button>
      </a-col>
    </a-row>

    <div
      v-if="model.extras.length || model.fetched.length || model.godkendt.length || model.gennemgang.length"
      @keydown="onFoldKeydown"
    >
      <a-collapse
        v-model:active-key="openFolds"
        ghost
        destroy-inactive-panel
        :expand-icon="collapseExpandIcon"
      >
        <a-collapse-panel
          v-if="model.extras.length"
          key="extras"
          :header="wsFill(t('Mere materiale, du kan bede om ({n})'), { n: model.extras.length })"
        >
          <MaterialSelectRow
            v-for="it in model.extras"
            :key="it.id"
            :item="it"
            kind="extra"
          />
        </a-collapse-panel>
        <!-- Ét samlet afsnit: det, der allerede ligger på sagen, delt op i hentet, godkendt og til gennemgang -->
        <a-collapse-panel
          v-if="onCaseCount"
          key="onCase"
          :header="wsFill(t('Ligger allerede på sagen ({n})'), { n: onCaseCount })"
        >
          <div
            v-if="model.fetched.length"
            class="ws-sub"
          >
            <a-typography-text type="secondary">
              {{ wsFill(t('Hentet automatisk ({n})'), { n: model.fetched.length }) }}
            </a-typography-text>
            <MaterialSelectRow
              v-for="it in model.fetched"
              :key="it.id"
              :item="it"
              kind="fetched"
              :asking="asking === it.id"
              @ask="openAsk(it)"
            >
              <AskCustomerForm
                v-if="asking === it.id"
                v-model:text="askText"
                v-model:category="askCat"
                :item-id="it.id"
                :categories="model.catOptions"
                :tried="askTried"
                @cancel="asking = null"
                @add="addAsk(it)"
              />
            </MaterialSelectRow>
          </div>
          <div
            v-if="model.godkendt.length"
            class="ws-sub"
          >
            <a-typography-text type="secondary">
              {{ wsFill(t('Godkendt ({n})'), { n: model.godkendt.length }) }}
            </a-typography-text>
            <!-- Selv uploadet: samme række som ovenfor (filer, Fjern, Tilføj fil) -->
            <MaterialSelectRow
              v-for="it in model.godkendt"
              :key="it.id"
              :item="it"
              :kind="wsUploadedByAdvisor(it.id) ? 'select' : 'case'"
              :selected="!!model.sel[it.id]"
            />
          </div>
          <div
            v-if="model.gennemgang.length"
            class="ws-sub"
          >
            <a-typography-text type="secondary">
              {{ wsFill(t('Til din gennemgang ({n})'), { n: model.gennemgang.length }) }}
            </a-typography-text>
            <MaterialSelectRow
              v-for="it in model.gennemgang"
              :key="it.id"
              :item="it"
              :kind="wsUploadedByAdvisor(it.id) ? 'select' : 'case'"
              :selected="!!model.sel[it.id]"
            />
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </div>
</template>

<style scoped>
.ws-req-add {
  padding: 8px 0;
}
</style>
