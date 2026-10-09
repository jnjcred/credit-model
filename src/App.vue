<script setup>
// Appens skal: sidebjælke, hovedindhold pr. rute, Ny sag, Tweaks og bekræftelser.
// Ruten er den samme strengmodel som før migrationen (src/composables/useNavigation.js).
import { computed, defineAsyncComponent, watch } from 'vue'
import daDK from 'ant-design-vue/es/locale/da_DK'
import enUS from 'ant-design-vue/es/locale/en_US'
import dayjs from 'dayjs'
import { CloseOutlined } from '@ant-design/icons-vue'
import 'dayjs/locale/da'
import { lang, t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { go, isWorkspace, route, routeTitle, workspaceCaseId, workspaceTab } from '@/composables/useNavigation'
import { useShellNarrow } from '@/composables/useShellNarrow'
import { closeNav, navOpen } from '@/composables/useAppShell'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useDialogFocus } from '@/composables/useDialogFocus'
import AppSidebar from '@/components/shell/AppSidebar.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import NewCaseHost from '@/components/shell/NewCaseHost.vue'
import TweaksPanel from '@/components/shell/TweaksPanel.vue'
import PortfolioView from '@/views/portfolio/PortfolioView.vue'

// Skærmene indlæses først, når de vises (Mine opgaver er startskærmen og indlæses med det samme).
// Logik, der skal køre ved start, ligger i src/domain og indlæses af src/bootstrap.js.
const WorkspaceView = defineAsyncComponent(() => import('@/views/workspace/WorkspaceView.vue'))
const PortfolioAnalyseView = defineAsyncComponent(() => import('@/views/analyse/PortfolioAnalyseView.vue'))
const DataRequestsView = defineAsyncComponent(() => import('@/views/requests/DataRequestsView.vue'))
const MapperView = defineAsyncComponent(() => import('@/views/mapping/MapperView.vue'))
const PromptWorkshopView = defineAsyncComponent(() => import('@/views/prompts/PromptWorkshopView.vue'))
const CustomerPortalView = defineAsyncComponent(() => import('@/views/portal/CustomerPortalView.vue'))

// ant-design-vue's egne tekster (tom tabel, datovælger, knapper i bekræftelser) på appens sprog
const antdLocale = computed(() => (lang === 'en' ? enUS : daDK))
dayjs.locale(lang === 'en' ? 'en' : 'da')

const narrow = useShellNarrow()

// Dialogerne: fokus på første element (ikke antdv's usynlige vagt), lukkeknappen hedder Luk, og Esc og
// Tab virker, også når det fokuserede element er forsvundet (som CW.useDialog før)
useDialogFocus()
// Bliver skærmen bred igen, lukkes panelet, så det ikke dukker op næste gang
watch(narrow, (n) => { if (!n) closeNav() })

// Sidens titel følger ruten. Skærme kan selv sætte en mere præcis titel bagefter.
watch(route, (r) => { document.title = routeTitle(r) }, { immediate: true })

// Ruteskift lukker navigationspanelet på smalle skærme
watch(route, () => closeNav())

// Fokus ved sideskift: flyt fokus til den nye sides h1 (ellers main), så en
// skærmlæser hører, hvor man er, og Tab fortsætter fra toppen af siden.
// Ikke ved første indlæsning, og ikke når kun en fane i samme sag skifter:
// fanerne beholder selv fokus. Forsvinder knappen, der skiftede fane (fx
// "Åbn memo"), får den aktive fane fokus. En skærm, der selv flytter fokus
// bagefter (f.eks. klokken eller et dybdelink i memoet), vinder, fordi den kommer senere.
// flush 'post': først når den gamle side er fjernet, ellers fandt den dens h1.
watch(route, (r, prev, onCleanup) => {
  if (prev === r) return
  const caseOf = (x) => (x.startsWith('workspace:') ? x.split(':')[1] : null)
  const sameCase = caseOf(prev) !== null && caseOf(prev) === caseOf(r)
  const lost = () => !document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected
  let tm
  onCleanup(() => clearTimeout(tm))
  if (sameCase) {
    tm = setTimeout(() => {
      if (!lost()) return
      const tab = document.querySelector('#ws-tabs [role="tab"][aria-selected="true"]')
      if (tab) CW.focusSoon(tab)
    }, 60)
    return
  }
  let n = 0
  const tick = () => {
    const h = document.querySelector('#main h1') || document.querySelector('h1')
    if (h && h.isConnected) {
      CW.focusSoon(h)
      // Blev overskriften udskiftet, før fokus nåede frem (skærm, der indlæses), prøves igen
      tm = setTimeout(() => { if (lost() && ++n < 60) tick() }, 120)
      return
    }
    // Skærmene indlæses først, når de vises: vent op til 3 sekunder på overskriften
    if (++n < 60) { tm = setTimeout(tick, 50); return }
    const m = document.getElementById('main')
    if (m) CW.focusSoon(m)
  }
  tick()
}, { flush: 'post' })

// "Spring til indhold": flyt fokus til hovedindholdet uden at røre URL'en
function skipToMain () {
  const m = document.getElementById('main')
  if (m) m.focus()
}

// Navigationspanelet på smalle skærme, som før migrationen (app.jsx): en modal dialog med navnet
// Hovedmenu. Når det åbner, får det aktive menupunkt fokus, og Tab bliver i panelet. Esc og
// lukkeknappen (Luk menuen) lukker og giver fokus tilbage til menuknappen. Et klik på baggrunden, et
// sideskift, et klik på en knap i panelet eller fokus, der forlader panelet (f.eks. når en dialog åbner
// fra "Ny sag"), lukker det uden at flytte fokus.
let refocusToggle = false
function closeNavPanel (focusToggle) {
  refocusToggle = !!focusToggle
  closeNav()
}
function onDrawerClose (e) {
  // antdv melder close for Esc (tastatur) og for et klik på baggrunden
  closeNavPanel(!!e && e.type === 'keydown')
}
const navTrap = useFocusTrap()
watch(navOpen, (open) => {
  if (open) navTrap.trap(() => document.getElementById('cw-nav-panel'))
  else navTrap.release()
})
function afterNavChange (open) {
  if (open) {
    const panel = document.getElementById('cw-nav-panel')
    const first = panel && (panel.querySelector('[aria-current="page"]') || panel.querySelector('nav li[role="button"], button'))
    if (first) CW.focusSoon(first)
    return
  }
  if (refocusToggle) CW.focusSoon('#cw-nav-toggle')
  refocusToggle = false
}
function onNavFocusOut (e) {
  if (!navOpen.value) return
  const to = e.relatedTarget
  // Brugermenuen åbner uden for panelet (antdv lægger den i body), men hører til det
  if (to && (to.closest('.cw-nav-drawer') || to.id === 'cw-nav-toggle' || to.closest('#cw-user-menu'))) return
  closeNavPanel(false)
}
function onNavClick (e) {
  const el = e.target
  if (!el.closest || !el.closest('button')) return
  if (el.closest('[role="group"], [role="radiogroup"], [aria-haspopup], [role="menu"]')) return
  closeNavPanel(false)
}
</script>

<template>
  <a-config-provider :locale="antdLocale">
    <!-- Kundens portal: egen skærm uden sidebjælke; tilbage fører til sag 1 -->
    <CustomerPortalView
      v-if="route === 'portal'"
      @back="go('workspace:1')"
    />
    <template v-else>
      <a
        href="#main"
        class="skip-link"
        @click.prevent="skipToMain"
      >{{ t('Spring til indhold') }}</a>
      <a-layout class="app">
        <a-layout-sider
          v-if="!narrow"
          theme="light"
          :width="229"
          class="app-sider"
        >
          <AppSidebar />
        </a-layout-sider>
        <a-drawer
          v-else
          :visible="navOpen"
          class="cw-nav-drawer"
          placement="left"
          :width="229"
          :closable="false"
          :body-style="{ padding: 0, overflowX: 'hidden' }"
          destroy-on-close
          @close="onDrawerClose"
          @after-visible-change="afterNavChange"
        >
          <!-- Som sidebjælken på brede skærme ruller panelet kun lodret (menuens punkter er 1 px bredere end menuen).
               Dialogen er panelets indhold: a-drawer i 3.2.13 sender hverken role eller aria-* videre, og
               dens egen lukkeknap hedder altid "Close". Lukkeknappen står, hvor menuknappen stod, som før. -->
          <div
            id="cw-nav-panel"
            role="dialog"
            aria-modal="true"
            :aria-label="t('Hovedmenu')"
            @focusout="onNavFocusOut"
            @click="onNavClick"
          >
            <div class="nav-panel-head">
              <a-button
                type="text"
                :aria-label="t('Luk menuen')"
                :title="t('Luk menuen')"
                @click.stop="closeNavPanel(true)"
              >
                <template #icon>
                  <CloseOutlined aria-hidden="true" />
                </template>
              </a-button>
            </div>
            <AppSidebar />
          </div>
        </a-drawer>
        <a-layout class="app-main">
          <main
            id="main"
            tabindex="-1"
          >
            <PortfolioView v-if="route === 'cases'" />
            <WorkspaceView
              v-if="isWorkspace"
              :case-id="workspaceCaseId"
              :tab="workspaceTab"
            />
            <PortfolioAnalyseView v-if="route === 'analyse'" />
            <DataRequestsView v-if="route === 'requests'" />
            <!-- Demo: kontomappingen -->
            <MapperView v-if="route === 'mapping'" />
            <!-- Internt: Prompt-værkstedet -->
            <PromptWorkshopView v-if="route === 'prompts'" />
          </main>
        </a-layout>
      </a-layout>
    </template>

    <!-- Ny sag: fra knappen og fra andre skærme ('cw-new-case') -->
    <NewCaseHost />
    <TweaksPanel />
    <ConfirmDialog />
  </a-config-provider>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

.app {
  min-height: 100vh;
}

/* Sidebjælken står stille, mens indholdet ruller, og har sin egen lodrette rulning */
.app-sider {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  border-right: 1px solid @border-color-split;
}

main:focus {
  outline: none;
}

/* Lukkeknappen i navigationspanelet, på linje med sidebjælkens indhold */
.nav-panel-head {
  padding: 12px 16px 0;
}
</style>
