<script setup>
// Kommentarskinnen til højre for memoet (memo.jsx: MemoCommentsRail L3314-3392), synkroniseret med
// dokumentets rulning som i Google Docs. Øverst tallene: "n åbne · n løst · n blokerer" (fanen over skinnen
// hedder allerede Kommentarer). Under dem et felt (viewportRef; siden måler afsnittenes placering i forhold
// til det), hvor hver tråd står ud for sit afsnit:
//  - Er afsnittets top rullet op over feltet, bliver tråden stående øverst, så længe afsnittet er i syne.
//  - Kun tråde tæt på feltet tegnes; nær kanterne tones de ud (over 80 px), og under 40 % synlighed kan de
//    ikke klikkes. Udtoningen fortæller, at tråden er på vej ud af syne.
//  - Er ingen kommenteret sektion (eller åben kommentarboks) i syne, vises oversigten i stedet.
//  - Uden kommentarer: "Ingen kommentarer endnu. …".
// Placeringen er den eneste egne layout-CSS: én placeringsboks pr. tråd med transform, opacity og
// pointer-events regnet ud som før. Alt indeni er ant-design-vue.
// Tåler, at tællerne eller placeringerne ikke er klar endnu.
//
// Props: sections (MEMO_SECTIONS), positions ({ afsnit: { t, b } } i px fra feltets top), viewportRef
//        (funktions-ref til feltet; bindes med :ref), height (feltets højde, ellers 600), activeKey (det
//        aktive afsnit), composerForKey (afsnittet med åben kommentarboks eller null), counts
//        (memoCommentCounts), version (sporets og memoets version), frozen (det frosne spor eller null),
//        lockNote (teksten, når sporet er låst).
// Emits: composer-toggle(afsnit | null), changed, scroll-to-section(afsnit).
import { computed } from 'vue'
import { Empty } from 'ant-design-vue'
import { PlusCircleOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { MEMO_SECTIONS } from '@/domain/memo/memoTemplates'
import { memoCommentCounts } from '@/domain/memo/memoStatus'
import { memoOpenWord } from '@/domain/memo/memoFacts'
import MemoCommentGroup from './MemoCommentGroup.vue'
import MemoCommentsOverview from './MemoCommentsOverview.vue'

const props = defineProps({
  sections: { type: Array, default: null },
  positions: { type: Object, default: null },
  viewportRef: { type: Function, default: null },
  height: { type: Number, default: null },
  activeKey: { type: String, default: null },
  composerForKey: { type: String, default: null },
  counts: { type: Object, default: null },
  version: { type: String, default: '' },
  frozen: { type: Object, default: null },
  lockNote: { type: String, default: null },
})
const emit = defineEmits(['composer-toggle', 'changed', 'scroll-to-section'])

const RAIL_VIEWPORT_H = computed(() => props.height || 600)
// Tåler at tællerne eller placeringerne ikke er klar endnu
const counts = computed(() => props.counts || memoCommentCounts())
const positions = computed(() => props.positions || {})
const secs = computed(() => props.sections || MEMO_SECTIONS)
const totalCount = computed(() => counts.value.allTotal)

// En tråd står ud for sit afsnit. Er afsnittets top rullet op over skinnen, bliver tråden stående øverst,
// så længe afsnittet er i syne.
function placeOf (k) {
  const p = positions.value[k]
  if (!p) return null
  let top = p.t
  if (top < 0 && p.b > 60) top = Math.min(0, p.b - 180)
  return top
}
// Er nogen kommenteret sektion (eller en åben kommentarboks) inden for skinnen?
const anyVisible = computed(() => secs.value.some(s => {
  const top = placeOf(s.k)
  if (top == null) return false
  if (!(counts.value.all[s.k] > 0) && props.composerForKey !== s.k) return false
  return top >= -180 && top <= RAIL_VIEWPORT_H.value - 40
}))

// Kun trådene tæt på feltet tegnes ("kun et par stykker"); nær kanterne tones de ud
const slots = computed(() => {
  if (!(anyVisible.value || props.composerForKey != null)) return []
  const H = RAIL_VIEWPORT_H.value
  const out = []
  secs.value.forEach(s => {
    const top = placeOf(s.k)
    if (top == null) return
    if (top < -260 || top > H + 40) return
    let opacity = 1
    if (top < -180) opacity = Math.max(0, (top + 260) / 80)
    else if (top > H - 40) opacity = Math.max(0, (H + 40 - top) / 80)
    out.push({ s, style: { transform: `translateY(${top}px)`, opacity, pointerEvents: opacity < 0.4 ? 'none' : 'auto' } })
  })
  return out
})
const metaText = computed(() => {
  const c = counts.value
  return c.openTotal + ' ' + memoOpenWord(c.openTotal) +
    (c.resolvedTotal > 0 ? ' · ' + c.resolvedTotal + ' ' + t('løst') : '') +
    (c.blocking > 0 ? ' · ' + c.blocking + ' ' + t('blokerer') : '')
})
</script>

<template>
  <a-card
    size="small"
    :body-style="{ padding: 0 }"
  >
    <div class="memo-rail-meta">
      <a-typography-text type="secondary">
        {{ metaText }}
      </a-typography-text>
    </div>
    <div
      :ref="viewportRef"
      class="memo-rail-viewport"
      :style="{ height: RAIL_VIEWPORT_H + 'px' }"
    >
      <MemoCommentsOverview
        v-if="totalCount > 0 && !anyVisible && composerForKey == null"
        :sections="secs"
        :counts="counts"
        :frozen="frozen"
        @scroll-to-section="(k) => emit('scroll-to-section', k)"
      />
      <div
        v-for="slot in slots"
        :key="slot.s.k"
        class="memo-rail-slot"
        :style="slot.style"
      >
        <MemoCommentGroup
          :section="slot.s"
          :version="version"
          :is-active="activeKey === slot.s.k"
          :composer-open="composerForKey === slot.s.k"
          :frozen="frozen"
          :lock-note="lockNote"
          @composer-toggle="(k) => emit('composer-toggle', k)"
          @changed="emit('changed')"
          @scroll-to-section="(k) => emit('scroll-to-section', k)"
        />
      </div>
      <a-empty
        v-if="totalCount === 0 && composerForKey == null"
        class="memo-rail-empty"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      >
        <template #description>
          <a-typography-text type="secondary">
            {{ t('Ingen kommentarer endnu. Hold markøren over et afsnit, og klik på') + ' ' }}<PlusCircleOutlined aria-hidden="true" /><span class="sr-only">+</span>{{ ' ' + t('for at starte en tråd.') }}
          </a-typography-text>
        </template>
      </a-empty>
    </div>
  </a-card>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Tallene øverst, adskilt fra trådene */
.memo-rail-meta {
  padding: 10px 14px;
  border-bottom: 1px solid @border-color-split;
}

/* Feltet, trådene placeres i (højden kommer fra siden) */
.memo-rail-viewport {
  position: relative;
  overflow: hidden;
}

/* Én placeringsboks pr. tråd: flyttes med transform og tones ud nær kanterne (opacity og pointer-events
   regnes ud i komponenten) */
.memo-rail-slot {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  transition: opacity 0.18s ease-out;
  will-change: transform, opacity;
}

.memo-rail-empty {
  padding: 24px 14px;
}
</style>
