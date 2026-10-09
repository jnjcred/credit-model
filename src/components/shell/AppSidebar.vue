<script setup>
// Sidebjælken: logo, Ny sag, hovedmenuen med tal og brugerens menu nederst.
// Tallene regnes af sagsmodellen og er grå: tallet siger nok i sig selv.
import { computed, onMounted, onUpdated, ref } from 'vue'
import {
  CheckOutlined, EllipsisOutlined, ExperimentOutlined, EyeOutlined,
  PlusOutlined, ProfileOutlined, ReloadOutlined,
} from '@ant-design/icons-vue'
import { lang, setLang, t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { cwTasksAwaitingMe } from '@/domain/tasks'
import { wsCaseData, wsCaseHasData } from '@/domain/workspace/caseData'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { useMenuKeyboard } from '@/composables/useMenuKeyboard'
import { go, route } from '@/composables/useNavigation'
import { openNewCase } from '@/composables/useAppShell'
import { confirmResetDemo } from '@/services/demo'
import LanguageSwitcher from './LanguageSwitcher.vue'

const caseVersion = useCaseVersion()
// Påmindelser fra Mine opgaver og Dataanmodninger ændrer også tallene
const reminders = ref(0)
useWindowEvent('cw-reminders-changed', () => { reminders.value++ })
// Kontomappingen er en side for sig; andre skærme kan åbne den med 'cw-open-mapper'
useWindowEvent('cw-open-mapper', () => go('mapping'))

const counts = computed(() => {
  caseVersion.value + reminders.value + route.value.length
  return {
    // Samme tal som fanen "Afventer dig" i Mine opgaver
    awaitingMe: cwTasksAwaitingMe(),
  }
})

const isActive = (r) => route.value === r || (r === 'cases' && route.value.startsWith('workspace'))
const selectedKeys = computed(() => ['cases'].filter(isActive))

// I en sag med data står Kundeside i menuen (de åbner forhåndsvisningen i sagen)
const inLiveCase = computed(() => {
  caseVersion.value
  const r = route.value
  return r.startsWith('workspace:') && wsCaseHasData(wsCaseData(Number(r.split(':')[1])))
})

function onMenuClick ({ key }) {
  if (key === 'preview') { window.dispatchEvent(new CustomEvent('cw-open-customer-preview')); return }
  go(key)
}

// Hovedmenuen er sidenavigation: knapper i en navigation, og den aktuelle side har aria-current,
// som prototypens knapper. a-menu er kun det visuelle: punkterne har role="button" (prop'en), og
// listen mister antdv's role="menu" (3.2.13 sætter den uden en prop), så skærmlæsere ikke lover
// en programmenu med piletaster. I 3.2.13 har punkterne tabindex="-1" og kan ikke nås med Tab;
// hvert punkt er derfor et Tab-stop, Enter vælger (antdv) og Mellemrum også, som på en knap.
// Rettelsen køres igen, når sidebjælken tegnes om.
const navEl = ref(null)
function makeItemsTabbable () {
  if (!navEl.value) return
  const list = navEl.value.querySelector('ul[role="menu"]')
  if (list) list.setAttribute('role', 'none')
  navEl.value.querySelectorAll('li[role="button"]').forEach((li) => {
    if (li.getAttribute('tabindex') !== '0') li.setAttribute('tabindex', '0')
  })
}
onMounted(makeItemsTabbable)
onUpdated(makeItemsTabbable)
function onNavKeydown (e) {
  if (e.key !== ' ' || !e.target || e.target.getAttribute('role') !== 'button') return
  e.preventDefault()
  e.target.click()
}

// Brugermenuen: pil op/ned flytter i menuen, Esc lukker og giver fokus tilbage
const userMenuOpen = ref(false)
const userMenuKeys = useMenuKeyboard()
function onUserMenuVisible (v) {
  userMenuOpen.value = v
  if (v) userMenuKeys.attach({ menuId: 'cw-user-menu', trigger: () => document.getElementById('cw-user-menu-btn'), close: () => { userMenuOpen.value = false } })
  else userMenuKeys.detach()
}

function onUserMenu ({ key }) {
  userMenuOpen.value = false
  userMenuKeys.detach()
  if (key === 'reset') { confirmResetDemo(); return }
  const code = key.split(':')[1]
  if (code && code !== lang) { setLang(code); return }
  // Sproget er allerede valgt: menuen lukker, og fokus går tilbage til knappen, som før
  CW.focusSoon('#cw-user-menu-btn')
}
</script>

<template>
  <div
    id="cw-sidebar"
    class="sidebar"
  >
    <div class="sidebar-top">
      <div class="brand">
        <a-avatar
          shape="square"
          :size="32"
          :style="{ backgroundColor: '#3b3854' }"
          aria-hidden="true"
        >
          cw
        </a-avatar>
        <div class="brand-text">
          <a-typography-text strong>
            EIFO
          </a-typography-text>
          <a-typography-text type="secondary">
            {{ t('Kreditafdeling') }}
          </a-typography-text>
        </div>
      </div>
      <a-button
        type="primary"
        block
        @click="openNewCase"
      >
        <template #icon>
          <PlusOutlined aria-hidden="true" />
        </template>
        {{ t('Ny sag') }}
      </a-button>
    </div>

    <nav
      ref="navEl"
      :aria-label="t('Hovedmenu')"
      @keydown="onNavKeydown"
    >
      <!-- inline-indent 16: punkterne flugter med logo og Ny sag (16 px), og "Prompt workshop" med
           mærket "internal" kan stå på engelsk uden at blive skåret -->
      <a-menu
        mode="inline"
        :inline-indent="16"
        :selected-keys="selectedKeys"
        :style="{ borderRight: 0 }"
        @click="onMenuClick"
      >
        <a-menu-item
          key="cases"
          role="button"
          :aria-current="isActive('cases') ? 'page' : undefined"
        >
          <template #icon>
            <ProfileOutlined aria-hidden="true" />
          </template>
          <span
            class="menu-label"
            :title="counts.awaitingMe + ' ' + t('sager afventer dig')"
          >
            <span>{{ t('Mine opgaver') }}</span>
            <a-typography-text type="secondary">
              {{ counts.awaitingMe }}<span class="sr-only"> {{ t('sager afventer dig') }}</span>
            </a-typography-text>
          </span>
        </a-menu-item>
        <!-- Sagen: kundens side og kundens vej gennem opstarten (vises kun i en sag med data) -->
        <template v-if="inLiveCase">
          <a-menu-divider />
          <a-menu-item
            key="preview"
            role="button"
            :title="t('Se kundens side')"
          >
            <template #icon>
              <EyeOutlined aria-hidden="true" />
            </template>
            {{ t('Kundeside') }}
          </a-menu-item>
        </template>
      </a-menu>
    </nav>

    <!-- Bunden: brugeren med en menu (sprog og Nulstil demo). Nulstil demo og
         sprogvalget står også fremme, så præsentatoren altid kan finde dem med ét klik. -->
    <div class="sidebar-foot">
      <div class="user">
        <a-avatar aria-hidden="true">
          ML
        </a-avatar>
        <div class="user-text">
          <a-typography-text strong>
            Mette Larsen
          </a-typography-text>
          <a-typography-text type="secondary">
            {{ t('Kreditrådgiver') }}
          </a-typography-text>
        </div>
        <a-dropdown
          :trigger="['click']"
          :visible="userMenuOpen"
          placement="topRight"
          @visible-change="onUserMenuVisible"
        >
          <a-button
            id="cw-user-menu-btn"
            type="text"
            :aria-expanded="userMenuOpen"
            :aria-label="t('Brugermenu')"
            :title="t('Brugermenu')"
            aria-haspopup="menu"
          >
            <template #icon>
              <EllipsisOutlined aria-hidden="true" />
            </template>
          </a-button>
          <template #overlay>
            <a-menu
              id="cw-user-menu"
              :aria-label="t('Brugermenu')"
              @click="onUserMenu"
            >
              <a-menu-item-group :title="t('Sprog')">
                <a-menu-item
                  key="lang:da"
                  role="menuitemradio"
                  :aria-checked="lang === 'da' ? 'true' : 'false'"
                  lang="da"
                >
                  <a-space>
                    <span>Dansk</span>
                    <CheckOutlined
                      v-if="lang === 'da'"
                      aria-hidden="true"
                    />
                  </a-space>
                </a-menu-item>
                <a-menu-item
                  key="lang:en"
                  role="menuitemradio"
                  :aria-checked="lang === 'en' ? 'true' : 'false'"
                  lang="en"
                >
                  <a-space>
                    <span>English</span>
                    <CheckOutlined
                      v-if="lang === 'en'"
                      aria-hidden="true"
                    />
                  </a-space>
                </a-menu-item>
              </a-menu-item-group>
              <a-menu-divider />
              <a-menu-item key="reset">
                {{ t('Nulstil demo') }}
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
      <div class="foot-line">
        <a-button
          type="text"
          size="small"
          :title="t('Sletter alt, demoen har gemt, og starter forfra')"
          @click="confirmResetDemo"
        >
          <template #icon>
            <ReloadOutlined aria-hidden="true" />
          </template>
          {{ t('Nulstil demo') }}
        </a-button>
        <LanguageSwitcher />
      </div>
      <!-- Demoskærmene, der ikke står i hovedmenuen: dataanmodninger, porteføljeanalyse, kontomapping og prompt-værkstedet -->
      <a-dropdown
        :trigger="['click']"
        placement="topLeft"
      >
        <a-button
          id="cw-demo-btn"
          block
        >
          <template #icon>
            <ExperimentOutlined aria-hidden="true" />
          </template>
          {{ t('Demo') }}
        </a-button>
        <template #overlay>
          <a-menu
            id="cw-demo-menu"
            :aria-label="t('Demo')"
            @click="({ key }) => go(key)"
          >
            <a-menu-item key="requests">
              {{ t('Dataanmodninger') }}
            </a-menu-item>
            <a-menu-item key="analyse">
              {{ t('Porteføljeanalyse') }}
            </a-menu-item>
            <a-menu-item key="mapping">
              {{ t('Kontomapping') }}
            </a-menu-item>
            <a-menu-item key="prompts">
              {{ t('Prompt-værksted') }}
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.sidebar-top {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.brand,
.user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-text,
.user-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.menu-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

/* Afstanden til teksten kommer fra gap; tagets egen højremargen skubbede ellers det engelske
   "internal" 3 px ud over kanten */
.menu-tag {
  margin-right: 0;
}

.sidebar-foot {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding: 16px;
}

.foot-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
