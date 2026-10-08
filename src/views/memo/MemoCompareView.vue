<script setup>
// Sammenligningen af to indstillede versioner (memo.jsx: MemoCompareView L5946-6006). Afsnit for afsnit:
// tilføjet tekst understreget med grønt, fjernet tekst overstreget med rødt (MemoDiffOps.vue). Ændrede tal
// står øverst ved afsnittet, så man ikke skal lede efter dem, og forsiden ("Indstillingen i hovedtræk")
// sammenlignes række for række. Til sidst de uændrede afsnit. Erstatter hele dokumentet i memoet, mens
// sammenligningen vises (#memo-version-banner har knapperne).
// Afsnitstitlerne står på brugerfladens sprog (som før). Teksten og tallene regnes kun igen, når en anden
// version vises (som prototypens useMemo på versionsnumrene).
//
// Props: cur, prev (CW.memoSnapshot(v) og CW.memoSnapshot(v - 1): { version, sections: { afsnit: html,
//        __front: { facts } } }).
import { computed } from 'vue'
import { t } from '@/i18n'
import { MEMO_SECTIONS } from '@/domain/memo/memoTemplates'
import { _memoFill } from '@/domain/memo/memoFormat'
import { _memoDiffWords, _memoFactText, _memoNumChanges, _memoPlainText } from '@/domain/memo/memoCompare'
import MemoDiffOps from './MemoDiffOps.vue'

const props = defineProps({
  cur: { type: Object, required: true },
  prev: { type: Object, required: true },
})

function compare (cur, prev) {
  const cs = cur.sections || {}, ps = prev.sections || {}
  const secs = MEMO_SECTIONS.map(s => {
    const a = _memoPlainText(ps[s.k]), b = _memoPlainText(cs[s.k])
    if (a === b) return { s, same: true }
    const ops = _memoDiffWords(a, b)
    return { s, same: false, ops, nums: _memoNumChanges(ops) }
  })
  const fa = ps.__front ? ps.__front.facts : null, fb = cs.__front ? cs.__front.facts : null
  const facts = []
  if (fa && fb) fb.forEach(r => {
    const x = _memoFactText(fa.find(o => o.k === r.k)), y = _memoFactText(r)
    if (x !== y) facts.push({ label: r.label, from: x, to: y })
  })
  return { secs, facts }
}
// Regnes kun igen, når versionerne skifter
let cache = { key: null, value: null }
const data = computed(() => {
  const key = props.cur.version + ':' + props.prev.version
  if (cache.key !== key) cache = { key, value: compare(props.cur, props.prev) }
  return cache.value
})
const changed = computed(() => data.value.secs.filter(x => !x.same))
const same = computed(() => data.value.secs.filter(x => x.same))
</script>

<template>
  <div class="memo-diff">
    <a-typography-paragraph class="memo-diff-summary">
      <strong>{{ _memoFill(t('{n} af {total} afsnit er ændret fra version {a} til version {b}.'), { n: changed.length, total: MEMO_SECTIONS.length, a: prev.version, b: cur.version }) }}</strong>{{ ' ' + t('Tilføjet tekst er understreget med grønt, fjernet tekst er overstreget med rødt.') }}
    </a-typography-paragraph>

    <section
      v-if="data.facts.length > 0"
      class="memo-diff-sec"
    >
      <a-typography-title :level="2">
        {{ t('Indstillingen i hovedtræk') }}
      </a-typography-title>
      <ul class="memo-diff-facts">
        <li
          v-for="(f, i) in data.facts"
          :key="i"
        >
          <strong>{{ f.label + ':' }}</strong>{{ ' ' }}<del v-if="f.from"><span class="sr-only memo-sr">{{ t('Fjernet') + ': ' }}</span>{{ f.from }}</del>{{ ' ' }}<ins><span class="sr-only memo-sr">{{ t('Tilføjet') + ': ' }}</span>{{ f.to || t('tom') }}</ins>
        </li>
      </ul>
    </section>

    <section
      v-for="x in changed"
      :key="x.s.k"
      class="memo-diff-sec"
    >
      <div class="memo-diff-head">
        <a-typography-text
          type="secondary"
          class="memo-diff-num"
        >
          {{ x.s.num }}
        </a-typography-text>
        <a-typography-title
          :level="2"
          class="memo-diff-title"
        >
          {{ t(x.s.label) }}
        </a-typography-title>
      </div>
      <div
        v-if="x.nums.length > 0"
        class="memo-diff-nums"
      >
        <a-typography-text
          type="secondary"
          class="memo-diff-nums-label"
        >
          {{ t('Tal ændret') }}
        </a-typography-text>
        <span
          v-for="(n, i) in x.nums"
          :key="i"
          class="memo-diff-pair"
        ><del v-if="n.from">{{ n.from }}</del>{{ n.from && n.to ? ' → ' : '' }}<ins v-if="n.to">{{ n.to }}</ins></span>
      </div>
      <p class="memo-diff-text">
        <MemoDiffOps :ops="x.ops" />
      </p>
    </section>

    <a-typography-text type="secondary">
      {{ same.length ? t('Uændret') + ': ' + same.map(y => y.s.num).join(', ') + '.' : t('Alle afsnit er ændret.') }}
    </a-typography-text>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';
@import (reference) '../../styles/memo-layout.less';

/* Opsummeringen står over afsnittene, skilt fra dem med en linje */
.memo-diff-summary {
  margin-bottom: 24px;
  padding-bottom: 14px;
  border-bottom: 1px solid @border-color-split;
}

.memo-diff-sec {
  margin-bottom: 28px;
}

/* Afsnittets nummer og titel; teksten rykkes ind under titlen */
.memo-diff-head {
  display: flex;
  gap: @memo-head-gap;
  align-items: baseline;
  margin-bottom: 8px;
}

.memo-diff-head .memo-diff-num {
  flex-shrink: 0;
  width: @memo-num-width;
}

/* Titlen står i rækken (ingen overskriftsmargin; rækken giver luften) */
.memo-diff-head .memo-diff-title {
  margin: 0;
}

.memo-diff-nums,
.memo-diff-text {
  margin: 0 0 6px;
  padding-left: @memo-text-indent;
}

.memo-diff-nums-label {
  margin-right: 6px;
}

.memo-diff-pair {
  margin-right: 12px;
  white-space: nowrap;
}

/* Fjernet tekst overstreget med rødt, tilføjet tekst understreget med grønt (forklaringen står øverst). Gælder
   også ord-diffens <del> og <ins> (MemoDiffOps.vue). Grøn 8 og rød 7 på deres lyse baggrund består WCAG AA. */
.memo-diff :deep(del) {
  color: @red-7;
  text-decoration: line-through;
  background: @red-1;
}

.memo-diff :deep(ins) {
  color: @green-8;
  text-decoration: underline;
  background: @green-1;
}
</style>
