<script setup>
// Tabellens værktøjslinje i et memoafsnit (memo.jsx: MemoSection L3930-3942). Vises kun, mens markøren står
// i en tabel, og står fast nederst i rullefeltet, så den kan nås under en lang tabel. Den står lige efter
// afsnittets tekst, så Tab fra tabellens sidste celle lander her. Knapperne forhindrer mousedown, så
// markeringen bliver i cellen. Selve tabeloperationerne står i src/domain/memo/memoTable.js; afsnittet
// (MemoSection.vue) kører dem med et fortryd-trin.
//
// Props: ingen. Emits: op(navn, retning): 'insertRow' ('above' | 'below'), 'deleteRow', 'insertCol'
// ('left' | 'right'), 'deleteCol'.
import {
  DeleteColumnOutlined, DeleteRowOutlined, InsertRowAboveOutlined, InsertRowBelowOutlined, InsertRowLeftOutlined,
  InsertRowRightOutlined,
} from '@ant-design/icons-vue'
import { t } from '@/i18n'

const emit = defineEmits(['op'])

const ROWS = [
  { op: 'insertRow', arg: 'above', icon: InsertRowAboveOutlined, label: 'Række over', title: 'Indsæt række over' },
  { op: 'insertRow', arg: 'below', icon: InsertRowBelowOutlined, label: 'Række under', title: 'Indsæt række under' },
  { op: 'deleteRow', icon: DeleteRowOutlined, label: 'Slet række', title: 'Slet den række markøren står i' },
]
const COLS = [
  { op: 'insertCol', arg: 'left', icon: InsertRowLeftOutlined, label: 'Kolonne venstre', title: 'Indsæt kolonne til venstre' },
  { op: 'insertCol', arg: 'right', icon: InsertRowRightOutlined, label: 'Kolonne højre', title: 'Indsæt kolonne til højre' },
  { op: 'deleteCol', icon: DeleteColumnOutlined, label: 'Slet kolonne', title: 'Slet den kolonne markøren står i' },
]
</script>

<template>
  <a-card
    size="small"
    class="memo-tbl-bar"
    :body-style="{ padding: '4px 8px' }"
  >
    <a-space
      wrap
      :size="4"
    >
      <a-typography-text type="secondary">
        {{ t('Tabel') }}
      </a-typography-text>
      <a-button
        v-for="b in ROWS"
        :key="b.label"
        size="small"
        :title="t(b.title)"
        @mousedown.prevent
        @click="emit('op', b.op, b.arg)"
      >
        <template #icon>
          <component
            :is="b.icon"
            aria-hidden="true"
          />
        </template>
        {{ t(b.label) }}
      </a-button>
      <a-divider type="vertical" />
      <a-button
        v-for="b in COLS"
        :key="b.label"
        size="small"
        :title="t(b.title)"
        @mousedown.prevent
        @click="emit('op', b.op, b.arg)"
      >
        <template #icon>
          <component
            :is="b.icon"
            aria-hidden="true"
          />
        </template>
        {{ t(b.label) }}
      </a-button>
      <a-typography-text type="secondary">
        {{ t('Tab skifter celle') }}
      </a-typography-text>
    </a-space>
  </a-card>
</template>

<style scoped lang="less">
@import (reference) '../../styles/memo-layout.less';

/* Står fast nederst i rullefeltet over teksten, under markøren i en lang tabel; rykket ind som teksten */
.memo-tbl-bar {
  position: sticky;
  bottom: 10px;
  z-index: 6;
  margin: 10px 0 0 @memo-text-indent;
}
</style>
