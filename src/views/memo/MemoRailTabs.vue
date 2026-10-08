<script setup>
// Fanerne i memoets højre skinne (memo.jsx: WSMemo L6985-7031): "Kommentarer" (med antal åbne) og "Spørg om
// sagen". Kun den valgte fanes indhold er monteret (som før: chattens samtale går tabt, når fanen skifter).
// Under ca. 1440 px står skinnen i skuffen (MemoEditor.vue): så har indholdet skuffens id, rolle og navn
// (#memo-drawer, complementary, "Kommentarer") og en "Luk"-knap ved fanerne.
// Tastatur: piletaster, Home og End skifter fane, og kun den valgte fane er et tabulatorstop
// (useTabsKeyboard). Fanerne har deres egen komponent, så rettelserne af antdv's faner (tabindex og
// fanelistens navn) også køres, når skuffen åbner, og når fanen skifter: siden selv tegnes ikke om (dens
// indhold tegnes af fejlgrænsen, MemoErrorBoundary.vue).
//
// Props: tab (den valgte fane: 'comments' | 'ai'; v-model:tab), narrow (skinnen står i skuffen),
//        openTotal (antal åbne kommentarer i fanens navn).
// Emits: update:tab, close ("Luk" i skuffen).
// Slots: comments, ai (fanernes indhold).
import { t } from '@/i18n'
import { useTabsKeyboard } from '@/composables/useTabsKeyboard'

defineProps({
  tab: { type: String, required: true },
  narrow: { type: Boolean, default: false },
  openTotal: { type: Number, default: 0 },
})
const emit = defineEmits(['update:tab', 'close'])

const onTabsKeydown = useTabsKeyboard('memo-rail-tabs', () => ['comments', 'ai'], (k) => emit('update:tab', k))
</script>

<template>
  <div
    :id="narrow ? 'memo-drawer' : undefined"
    class="memo-rail-body"
    :role="narrow ? 'complementary' : undefined"
    :aria-label="narrow ? t('Kommentarer') : undefined"
    @keydown="onTabsKeydown"
  >
    <a-tabs
      id="memo-rail-tabs"
      :active-key="tab"
      size="small"
      destroy-inactive-tab-pane
      :aria-label="t('Kommentarer og spørgsmål')"
      @update:active-key="(k) => emit('update:tab', k)"
    >
      <template
        v-if="narrow"
        #rightExtra
      >
        <a-button
          type="text"
          size="small"
          :aria-label="t('Luk kommentarer')"
          @click="emit('close')"
        >
          {{ t('Luk') }}
        </a-button>
      </template>
      <a-tab-pane key="comments">
        <template #tab>
          {{ t('Kommentarer') }}<template v-if="openTotal > 0">
            {{ ' ' }}<a-typography-text type="secondary">
              {{ openTotal }}
            </a-typography-text>
          </template>
        </template>
        <slot name="comments" />
      </a-tab-pane>
      <a-tab-pane
        key="ai"
        :tab="t('Spørg om sagen')"
      >
        <slot name="ai" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>
