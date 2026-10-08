<script setup>
// Et afsnits ord-diff i sammenligningen af to indstillede versioner (memo.jsx: MemoDiffOps L5926-5945).
// Fjernet tekst er <del> (overstreget med rødt), tilføjet tekst <ins> (understreget med grønt), begge med en
// skjult forklaring til skærmlæsere ("Fjernet: ", "Tilføjet: "). Uændret tekst vises helt, når den er kort
// (højst 24 ord); ellers kun 10 ord på hver side af en ændring med "…" imellem. Fjernet og tilføjet tekst lige
// efter hinanden skilles af et mellemrum. Farverne står i MemoCompareView.vue.
//
// Props: ops (fra _memoDiffWords i src/domain/memo/memoCompare.js: [{ t: '=' | '-' | '+', w: [ord] }]).
import { t } from '@/i18n'

const props = defineProps({
  ops: { type: Array, required: true },
})

const CTX = 10
// Uændret tekst: hele, eller de nærmeste ord ved ændringerne
function sameText (o, i) {
  const w = o.w
  const first = i === 0, last = i === props.ops.length - 1
  let txt
  if (w.length <= CTX * 2 + 4) txt = w.join(' ')
  else if (first) txt = '… ' + w.slice(-CTX).join(' ')
  else if (last) txt = w.slice(0, CTX).join(' ') + ' …'
  else txt = w.slice(0, CTX).join(' ') + ' … ' + w.slice(-CTX).join(' ')
  return (first ? '' : ' ') + txt + (last ? '' : ' ')
}
</script>

<template>
  <template
    v-for="(o, i) in ops"
    :key="i"
  >
    <template v-if="o.t === '-'">
      <del><span class="sr-only memo-sr">{{ t('Fjernet') + ': ' }}</span>{{ o.w.join(' ') }}</del>{{ ops[i + 1] && ops[i + 1].t === '+' ? ' ' : '' }}
    </template>
    <ins v-else-if="o.t === '+'"><span class="sr-only memo-sr">{{ t('Tilføjet') + ': ' }}</span>{{ o.w.join(' ') }}</ins>
    <span v-else>{{ sameText(o, i) }}</span>
  </template>
</template>
