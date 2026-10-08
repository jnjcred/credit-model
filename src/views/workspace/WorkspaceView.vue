<script setup>
// Sagen (WorkspaceShell i workspace.jsx L539–772): sidehovedet med brødkrummen, sagshovedet, fanerne
// og fanens indhold, Kundeside/Kundeflow og Giv afslag.
// - Over 1000 px står sagshoved og faner stille, og kun indholdet ruller. Under 1000 px (fx 200 %
//   zoom) ruller hovedet med indholdet, så der er plads til memoet (useShellNarrow). Hver fane husker,
//   hvor langt den var rullet, så længe sagen er åben (useTabScrollMemory).
// - Uden levende data (alle andre sager end sag 1) vises den ærlige tomme tilstand (EmptyCaseView).
// - Sagens fase skifter selv mellem Afventer kunden og Klar, også ved ændringer fra kundeportalen
//   (useAutoStage).
// - I piloten (cw_memo_mode 'copilot') er Indstilling skjult; et gammelt link dertil viser Credit memo.
// - Brødkrummen fører tilbage til skærmen i sessionStorage 'cw_back' (fx Porteføljeanalyse), ellers
//   til Mine opgaver.
// - Kundeside kan også åbnes fra andre skærme (CW_OPEN_CUSTOMER_PREVIEW / 'cw-open-customer-preview').
// Tal, tekster og knapper regnes af wsHeaderModel (src/domain/workspace/header.js).
//
// Props: caseId (sagens id fra ruten), tab (fanen fra ruten: overview | financials | documents | memo
//        | indstil). Emits: ingen (navigation via src/composables/useNavigation.js).
// App.vue giver den aktive fane fokus via '#ws-tabs [role="tab"][aria-selected="true"]'.
import { computed, defineAsyncComponent, ref } from 'vue'
import { BarChartOutlined, FileOutlined, FileTextOutlined, LayoutOutlined, SendOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { go } from '@/composables/useNavigation'
import { useShellNarrow } from '@/composables/useShellNarrow'
import { useTabsKeyboard } from '@/composables/useTabsKeyboard'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { wsBackCrumb, wsGoBack, wsHeaderModel } from '@/domain/workspace/header'
import { wsInitialPreview, wsOnOpenCustomerPreview } from '@/domain/workspace/actions'
import { wsCopilot } from '@/domain/workspace/stage'
import { useCaseAndMemo } from './composables/useMemoStatus'
import { useAutoStage } from './composables/useAutoStage'
import { useTabScrollMemory } from './composables/useTabScrollMemory'
import AppTopbar from '@/components/shell/AppTopbar.vue'
import CaseHeader from './CaseHeader.vue'
import CaseOverview from './CaseOverview.vue'
import CustomerPreviewDrawer from './CustomerPreviewDrawer.vue'
import DeclineCaseModal from './DeclineCaseModal.vue'
import EmptyCaseView from './EmptyCaseView.vue'
import SubmitToCommittee from './SubmitToCommittee.vue'
import WsFinancials from '@/views/financials/WsFinancials.vue'
import WsDocuments from '@/views/documents/WsDocuments.vue'
import MemoHandoff from '@/views/memo/MemoHandoff.vue'
import MemoErrorBoundary from '@/views/memo/MemoErrorBoundary.vue'

// Det indbyggede memo (kun i builtin-tilstand) indlæses først, når fanen vises
const MemoEditor = defineAsyncComponent(() => import('@/views/memo/MemoEditor.vue'))

const props = defineProps({
  caseId: { type: Number, required: true },
  tab: { type: String, default: 'overview' },
})

// Fanernes ikoner (navnene fra den gamle ikonfil, som wsHeaderModel giver dem)
const TAB_ICONS = { Layout: LayoutOutlined, BarChart: BarChartOutlined, FileText: FileTextOutlined, File: FileOutlined, Send: SendOutlined }

const narrow = useShellNarrow()
const copilot = wsCopilot()
const declining = ref(false)
// Kundeside: false, true (Kundeside) eller 'flow' (Kundeflow). Fra en anden skærm åbnes den med det samme.
const showCustomerStatus = ref(wsInitialPreview(props.caseId))
useWindowEvent('cw-open-customer-preview', () => {
  wsOnOpenCustomerPreview(props.caseId, { setShowCustomerStatus: (v) => { showCustomerStatus.value = v } })
})

// Sagshovedet, fanerne og næste skridt følger sagen og memoets gennemgang
const h = useCaseAndMemo(() => wsHeaderModel(props.tab, go, props.caseId, { setDeclining: (v) => { declining.value = v } }))

// Brødkrummen tilbage (læses igen ved hver ændring, som før)
const back = useCaseAndMemo(() => {
  props.caseId + props.tab
  return wsBackCrumb()
})
const goBack = () => wsGoBack(back.value, go)
const crumbs = computed(() => [{ label: back.value ? t(back.value.label) : t('Mine opgaver'), onClick: goBack }, h.value.name])

useAutoStage(() => h.value.hasData)

// Fanerne: piletaster, Home og End skifter fane, som før
const openTab = (k) => go('workspace:' + props.caseId + ':' + k)
const onTabsKeydown = useTabsKeyboard('ws-tabs', () => h.value.tabs.map(tb => tb.k), openTab)

// Rulning: over 1000 px ruller indholdet, under 1000 px hele sagen
const bodyEl = ref(null)
const contentEl = ref(null)
const scrollEl = computed(() => (narrow.value ? bodyEl.value : contentEl.value))
useTabScrollMemory(scrollEl, () => h.value.tab, narrow)

const openPreview = (flow) => { showCustomerStatus.value = flow ? 'flow' : true }
</script>

<template>
  <div class="ws-view">
    <AppTopbar :crumbs="crumbs" />

    <div
      ref="bodyEl"
      :class="['ws-body', { 'ws-body-narrow': narrow }]"
    >
      <div :class="['ws-head', { 'ws-head-plain': !h.hasData }]">
        <CaseHeader
          :case-data="h.caseData"
          :has-data="h.hasData"
          :name="h.name"
          :facility="h.facility"
          :cvr="h.cvr"
          :phase-days="h.phaseDays"
          :phase-late="h.phaseLate"
          :phase-warn="h.phaseWarn"
          :more-items="h.moreItems"
          :next-step="h.nextStep"
          :next-primary="h.nextPrimary"
          @open-preview="openPreview"
        />
        <div
          v-if="h.hasData"
          @keydown="onTabsKeydown"
        >
          <a-tabs
            id="ws-tabs"
            :active-key="h.tab"
            :aria-label="t('Sagens faner')"
            :tab-bar-style="{ margin: 0, padding: '0 24px' }"
            @change="openTab"
          >
            <a-tab-pane
              v-for="tb in h.tabs"
              :key="tb.k"
            >
              <template #tab>
                <span>
                  <component
                    :is="TAB_ICONS[tb.ic]"
                    aria-hidden="true"
                  />{{ tb.label }}<template v-if="tb.badge">
                    {{ ' ' }}<a-typography-text type="secondary">{{ tb.badge }}</a-typography-text>
                  </template>
                </span>
              </template>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>

      <div
        ref="contentEl"
        :class="['ws-content', { 'ws-content-scroll': !narrow }]"
      >
        <EmptyCaseView
          v-if="!h.hasData"
          :case-data="h.caseData"
          :back="back"
          @go-back="goBack"
        />
        <template v-else>
          <CaseOverview
            v-if="h.tab === 'overview'"
            :case-id="caseId"
          />
          <WsFinancials v-else-if="h.tab === 'financials'" />
          <WsDocuments v-else-if="h.tab === 'documents'" />
          <template v-else-if="h.tab === 'memo'">
            <MemoHandoff
              v-if="copilot"
              :case-id="caseId"
            />
            <!-- Fejlgrænsen ligger om hele memoet. Nøglen genstarter memoet, hvis rullefeltet skifter (zoom
                 over eller under 1000 px) -->
            <MemoErrorBoundary
              v-else
              :key="narrow ? 'n' : 'w'"
            >
              <MemoEditor />
            </MemoErrorBoundary>
          </template>
          <!-- Nøglen starter indstillingen forfra efter en tilbagetrækning, så begrundelserne forudfyldes -->
          <SubmitToCommittee
            v-else-if="h.tab === 'indstil'"
            :key="h.submitted ? 's' : 'd'"
            :case-id="caseId"
            @focus-overview="(target) => h.focusOverview(target)"
          />
        </template>
      </div>
    </div>

    <CustomerPreviewDrawer
      v-if="showCustomerStatus"
      :flow="showCustomerStatus === 'flow'"
      @close="showCustomerStatus = false"
    />
    <DeclineCaseModal
      v-if="declining"
      return-focus="#ws-more-btn"
      @close="declining = false"
    />
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Sagen fylder hovedområdet: sidehovedet øverst og under det sagen */
.ws-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Over 1000 px: sagshoved og faner står stille, og kun indholdet ruller */
.ws-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ws-content-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* Under 1000 px: sagshoved og faner ruller med indholdet */
.ws-body-narrow {
  display: block;
  overflow: auto;
}

/* Skjulte skærmlæsertekster bliver i rullefeltet */
.ws-body-narrow,
.ws-content-scroll {
  position: relative;
}

.ws-head {
  background: @component-background;
}

/* Uden faner (sag uden data) skilles hovedet fra indholdet af en linje */
.ws-head-plain {
  border-bottom: 1px solid @border-color-split;
}
</style>
