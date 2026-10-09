<script setup>
// Kundeportalens sidehoved (new_case_portal.jsx: CustomerPortal L1245–1258): Crediwires mærke,
// "Materiale til EIFO" og virksomheden. Når kunden er logget ind (eller i rådgiverens forhåndsvisning),
// står sagsnummer, produkt og beløb (beløbsnoten i tooltip). Kunden har
// "Log ud" (når logget ind) og sprogvælgeren; forhåndsvisningen har ingen af dem.
// Kun afsender og firmanavn; ingen "sikker"-mærker (K9).
//
// Props: preview (rådgiverens forhåndsvisning: <div> i stedet for <header>, så sagen ikke får to
//        sidehoveder), showMeta (vis sagens linje), loggedIn (kunden er logget ind).
// Emits: logout.
import { computed } from 'vue'
import { Grid } from 'ant-design-vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { portalCaseMeta } from '@/domain/new_case_portal'
import LanguageSwitcher from '@/components/shell/LanguageSwitcher.vue'

const props = defineProps({
  preview: { type: Boolean, default: false },
  showMeta: { type: Boolean, default: false },
  loggedIn: { type: Boolean, default: false },
})
const emit = defineEmits(['logout'])

const meta = computed(() => [DATA.COMPANY.name].concat(props.showMeta ? portalCaseMeta() : [])
  .map(x => (typeof x === 'string' ? { text: x, title: '' } : { text: x.text, title: x.title || '' })))
// Sprogvælgeren følger portalens større trykflader på telefoner
const langScreens = Grid.useBreakpoint()
</script>

<template>
  <!-- role="banner": siden ligger i antdv's a-layout (et <section>), og så er <header> ellers ikke et
       landemærke for skærmlæsere, som det var før -->
  <component
    :is="preview ? 'div' : 'header'"
    :role="preview ? undefined : 'banner'"
    class="portal-head"
  >
    <div class="portal-head-inner">
      <a-avatar
        class="portal-head-mark"
        shape="square"
        :size="32"
        :style="{ backgroundColor: '#3b3854' }"
        aria-hidden="true"
      >
        cw
      </a-avatar>
      <div class="portal-head-text">
        <a-typography-text strong>
          {{ t('Materiale til EIFO') }}
        </a-typography-text>
        <!-- Sagens linje er én tekst, der brydes som almindelig tekst (prikkerne står ikke alene på en
             linje, når der er smalt) -->
        <div class="cwp-head-meta">
          <a-typography-text type="secondary">
            <template
              v-for="(x, i) in meta"
              :key="i"
            >
              <span
                v-if="i > 0"
                aria-hidden="true"
              >{{ ' - ' }}</span>
              <a-tooltip
                v-if="x.title"
                :title="x.title"
              >
                <span>{{ x.text }}</span>
              </a-tooltip>
              <span v-else>{{ x.text }}</span>
            </template>
          </a-typography-text>
        </div>
      </div>
      <div
        v-if="!preview"
        class="portal-head-actions"
      >
        <a-button
          v-if="loggedIn"
          type="text"
          @click="emit('logout')"
        >
          {{ t('Log ud') }}
        </a-button>
        <LanguageSwitcher :size="langScreens.xs ? 'large' : 'small'" />
      </div>
    </div>
  </component>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

.portal-head {
  background: @component-background;
  border-bottom: 1px solid @border-color-split;
}

/* Mærket, teksten og til højre "Log ud" og sprogvælgeren. Bliver der for smalt til teksten (telefoner
   med de store knapper), går knapperne ned på en linje for sig, til højre */
.portal-head-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  max-width: 760px;
  padding: 12px 24px;
  margin: 0 auto;
}

/* Mærket bevarer sin størrelse, når sagens linje brydes */
.portal-head-mark {
  flex-shrink: 0;
}

.portal-head-text {
  flex: 1 1 180px;
  min-width: 0;
}

.portal-head-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: auto;
}

@media (max-width: 575px) {
  .portal-head-inner {
    padding: 8px 16px;
  }
}
</style>
