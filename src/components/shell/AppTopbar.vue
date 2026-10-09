<script setup>
// Sidehovedet øverst på hver skærm: brødkrumme til venstre; søgning, klokke og hjælp til højre.
// crumbs: ['Tekst', ...] eller { label, onClick } for et led, der kan klikkes.
// Slot "right": ekstra handlinger før klokken (f.eks. på sagen).
import { MenuOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { useShellNarrow } from '@/composables/useShellNarrow'
import { navOpen, openNav } from '@/composables/useAppShell'
import CaseSearch from './CaseSearch.vue'

const props = defineProps({
  crumbs: { type: Array, required: true },
})

const narrow = useShellNarrow()
const labelOf = (c) => (typeof c === 'string' ? c : c.label)
const isLast = (i) => i === props.crumbs.length - 1
</script>

<template>
  <a-layout-header :class="['topbar', { 'topbar-narrow': narrow }]">
    <div class="topbar-left">
      <!-- Under 1000 px er sidebjælken foldet ind og åbnes herfra -->
      <a-button
        v-if="narrow"
        id="cw-nav-toggle"
        type="text"
        :aria-label="t('Hovedmenu')"
        :title="t('Hovedmenu')"
        :aria-expanded="navOpen"
        aria-controls="cw-sidebar"
        @click="openNav"
      >
        <template #icon>
          <MenuOutlined aria-hidden="true" />
        </template>
      </a-button>
      <nav :aria-label="t('Brødkrumme')">
        <a-breadcrumb>
          <a-breadcrumb-item
            v-for="(c, i) in crumbs"
            :key="i"
          >
            <a-typography-text
              v-if="isLast(i)"
              strong
              aria-current="page"
            >
              {{ labelOf(c) }}
            </a-typography-text>
            <a
              v-else-if="typeof c === 'object' && c.onClick"
              href="#"
              @click.prevent="c.onClick"
            >{{ c.label }}</a>
            <span v-else>{{ labelOf(c) }}</span>
          </a-breadcrumb-item>
        </a-breadcrumb>
      </nav>
    </div>
    <!-- Under 1000 px står søgningen på en linje for sig, og søgefeltet tager den plads, der
         er (op til 360 px), som før. Så ruller siden ikke vandret ved 320 px (400 % zoom) -->
    <div class="topbar-right">
      <CaseSearch class="topbar-search" />
      <template v-if="$slots.right">
        <a-divider type="vertical" />
        <slot name="right" />
      </template>
    </div>
  </a-layout-header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Smal skærm: to linjer (brødkrummen øverst), og sidehovedet er så højt, som indholdet kræver */
.topbar-narrow {
  flex-wrap: wrap;
  row-gap: 8px;
  height: auto;
  padding-top: 8px;
  padding-bottom: 8px;
  line-height: normal;
}

.topbar-narrow .topbar-right {
  flex: 1 1 100%;
  min-width: 0;
}

.topbar-narrow .topbar-search {
  flex: 1 1 200px;
  width: auto;
  min-width: 0;
  max-width: 360px;
}
</style>
