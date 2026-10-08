<script setup>
// "Anmodet materiale" på Overblik (workspace.jsx: WSOutstandingCard, L2378–2437): det, der stadig
// er åbent, delt efter hvem der skal handle: Til din gennemgang (med "Godkend alle med fil", når
// mindst 2 punkter har en fil, og sagen ikke er låst), Hos kunden og Valgfrit materiale (foldet).
// Øverst ændringer i anmodningen, der ikke er sendt, og kundens hændelser. Står kun, når kunden er
// bedt om materiale. Grupperne og massegodkendelsen (med Fortryd i beskeden) står i wsOutstanding
// i src/domain/workspace/items.js.
// Element-id'er, andre steder ruller og fokuserer til: ws-outstanding (afsnittet) og
// ws-outstanding-title (overskriften).
//
// Props: locked (sagen er indstillet eller afslået). React-proppen caseData gik kun videre til
// WSDraftBar, som ikke brugte den. Emits: ingen.
import { computed, ref } from 'vue'
import { InboxOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { wsOutstanding } from '@/domain/workspace/items'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import DraftChangesBar from './DraftChangesBar.vue'
import CustomerEventsList from './CustomerEventsList.vue'
import CustomerItemList from './CustomerItemList.vue'
import RemindCustomerModal from './RemindCustomerModal.vue'

const props = defineProps({
  locked: { type: Boolean, default: false },
})

const caseVersion = useCaseVersion()
const reminding = ref(false)
const o = computed(() => {
  caseVersion.value
  return wsOutstanding(props.locked)
})
// Grupperne med punkter, i fast rækkefølge
const groups = computed(() => {
  const x = o.value
  if (!x) return []
  return [
    { key: 'review', label: t('Til din gennemgang'), entries: x.review },
    { key: 'waiting', label: t('Hos kunden'), entries: x.waiting },
  ].filter(g => g.entries.length > 0)
})
// Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter)
const onFoldKeydown = useCollapseKeyboard()
</script>

<template>
  <section
    v-if="o"
    id="ws-outstanding"
    class="ws-anchor"
    aria-labelledby="ws-outstanding-title"
  >
    <a-card :bordered="false">
      <template #title>
        <a-space :size="8">
          <InboxOutlined aria-hidden="true" />
          <span
            id="ws-outstanding-title"
            role="heading"
            aria-level="2"
            tabindex="-1"
          >{{ t('Anmodet materiale') }}</span>
        </a-space>
      </template>
      <!-- Ændringer i anmodningen, der ikke er sendt, og kundens hændelser -->
      <DraftChangesBar />
      <CustomerEventsList />
      <a-typography-paragraph
        v-if="o.empty"
        type="secondary"
      >
        {{ o.empty }}
      </a-typography-paragraph>
      <template
        v-for="(g, i) in groups"
        :key="g.key"
      >
        <a-divider v-if="i > 0" />
        <a-row
          justify="space-between"
          align="middle"
        >
          <div
            :id="'ws-out-' + g.key"
            role="heading"
            aria-level="3"
          >
            <a-typography-text strong>
              {{ g.label }}
            </a-typography-text>
            {{ ' ' }}
            <a-typography-text type="secondary">
              ({{ g.entries.length }})
            </a-typography-text>
          </div>
          <a-button
            v-if="g.key === 'review' && o.approveAllShown"
            type="link"
            size="small"
            @click="o.approveAll"
          >
            {{ t('Godkend alle med fil') }}
          </a-button>
        </a-row>
        <CustomerItemList
          :entries="g.entries"
          :locked="locked"
          :labelled-by="'ws-out-' + g.key"
          @remind="reminding = true"
        />
      </template>
      <template v-if="o.optional.length > 0">
        <a-divider v-if="groups.length > 0" />
        <div @keydown="onFoldKeydown">
          <a-collapse
            ghost
            :expand-icon="collapseExpandIcon"
          >
            <a-collapse-panel
              id="ws-mat-optional"
              key="optional"
              :header="t('Valgfrit materiale') + ' (' + o.optional.length + ')'"
            >
              <CustomerItemList
                :entries="o.optional"
                :locked="locked"
                @remind="reminding = true"
              />
            </a-collapse-panel>
          </a-collapse>
        </div>
      </template>
    </a-card>
    <RemindCustomerModal
      v-if="reminding"
      @close="reminding = false"
    />
  </section>
</template>

<style scoped>
/* Afsnittet rulles til (sagshovedet, klokken, Dataanmodninger): lidt luft over kortet */
.ws-anchor {
  scroll-margin-top: 16px;
}
</style>
