<script setup>
// "Afventer kunden" på Overblik (designet "Anmodet materiale v5"): det, kunden ikke har sendt endnu,
// har et spørgsmål til, eller har sendt videre til revisor eller bank. Øverst ændringer i anmodningen,
// der ikke er sendt, og kundens hændelser (opstarten i portalen, adgangen til regnskabssystemet).
// I kortets hoved "Påmind alle" (når kunden mangler noget) og "Anmod om mere materiale". Valgfrit
// materiale, kunden ikke har sendt, står foldet under tabellen og tæller ikke med i antallet.
// Står kun, når kunden er bedt om materiale (wsOutstanding).
// Element-id'er: ws-waiting (afsnittet) og ws-waiting-title (overskriften).
//
// Props: locked (sagen er indstillet eller afslået). Emits: ingen.
import { computed, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsOutstanding } from '@/domain/workspace/items'
import { wsRequestMore, wsScrollTo } from '@/domain/workspace/actions'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import CustomerEventsList from './CustomerEventsList.vue'
import MaterialTable from './MaterialTable.vue'
import RemindCustomerModal from './RemindCustomerModal.vue'

const props = defineProps({
  locked: { type: Boolean, default: false },
})

const caseVersion = useCaseVersion()
const o = computed(() => {
  caseVersion.value
  return wsOutstanding(props.locked)
})
// Påmind alle: kun når kunden mangler at sende noget påkrævet (ikke sendt endnu, eller et spørgsmål)
const canRemindAll = computed(() => !props.locked && !!o.value && o.value.waiting.some(e => !e.dropped && (!e.s || e.s.status === 'pending' || e.s.status === 'rejected')))
// Påmindelsen: [] = alt, kunden mangler; ellers punkternes id'er; null = lukket
const remindIds = ref(null)
// Anmod om mere materiale: anmodningen åbner, som fra sagshovedet
function requestMore () {
  wsRequestMore(() => { setTimeout(() => wsScrollTo('ws-material'), 80); CW.focusSoon('#ws-material-title') })
}
// Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter)
const onFoldKeydown = useCollapseKeyboard()
</script>

<template>
  <section
    v-if="o"
    id="ws-waiting"
    class="ws-anchor"
    aria-labelledby="ws-waiting-title"
  >
    <a-card :bordered="false">
      <template #title>
        <span
          id="ws-waiting-title"
          role="heading"
          aria-level="2"
          tabindex="-1"
        >{{ t('Afventer kunden') + ' ' }}<a-typography-text type="secondary">({{ o.waiting.length }})</a-typography-text></span>
      </template>
      <template
        v-if="!locked"
        #extra
      >
        <a-space :size="16">
          <a-button
            v-if="canRemindAll"
            class="cw-link"
            type="link"
            @click="remindIds = []"
          >
            {{ t('Påmind alle') }}
          </a-button>
          <a-button @click="requestMore">
            {{ t('Anmod om mere materiale') }}
          </a-button>
        </a-space>
      </template>
      <div class="ws-waiting">
        <!-- Kundens hændelser. Usendte ændringer i en anmodning huskes ikke her: er den ikke sendt, er den væk -->
        <CustomerEventsList />
        <a-typography-paragraph
          v-if="!o.waiting.length"
          type="secondary"
          class="ws-empty"
        >
          {{ t('Der er ingen udestående anmodninger hos kunden.') }}
        </a-typography-paragraph>
        <MaterialTable
          v-else
          :entries="o.waiting"
          kind="waiting"
          :locked="locked"
          labelled-by="ws-waiting-title"
          @remind="(ids) => { remindIds = ids }"
        />
        <div
          v-if="o.optional.length"
          @keydown="onFoldKeydown"
        >
          <a-collapse
            ghost
            :expand-icon="collapseExpandIcon"
          >
            <a-collapse-panel
              id="ws-mat-optional"
              key="optional"
              :header="t('Valgfrit materiale') + ' (' + o.optional.length + ')'"
            >
              <MaterialTable
                :entries="o.optional"
                kind="waiting"
                :locked="locked"
                @remind="(ids) => { remindIds = ids }"
              />
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>
    </a-card>
    <RemindCustomerModal
      v-if="remindIds"
      :ids="remindIds.length ? remindIds : null"
      @close="remindIds = null"
    />
  </section>
</template>

<style scoped>
/* Afsnittet rulles til: lidt luft over kortet */
.ws-anchor {
  scroll-margin-top: 16px;
}

.ws-waiting {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ws-empty {
  margin-bottom: 0;
}
</style>
