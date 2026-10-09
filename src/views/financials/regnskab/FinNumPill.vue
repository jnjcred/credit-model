<script setup>
/* Den lille markering foran et tal i regnskabstabellen (Regnskab v5): vækst mod samme periode
   sidste år ("+7 %"), hvor langt periodetallet er nået i budgettet ("66 % nået") og forskellen i
   procentpoint mellem periodetal og budget ("+0,4 pp"). Forklaringen står ved hover (title).
   Grå som designet; procentpoint grøn eller rød i antd's mørke trin (kontrast mindst 4,5:1).
   Props: pill { text, title, tone: 'muted' | 'success' | 'danger' } */
defineProps({
  pill: { type: Object, required: true },
})
</script>

<template>
  <span
    :class="['fin-pill', 'fin-pill-' + (pill.tone || 'muted')]"
    :title="pill.title"
  >{{ pill.text }}</span>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Procenten og procentpoint står på en linje under tallet, højrestillet, så de flugter i kolonnen */
.fin-pill {
  display: block;
  margin: 0;
  text-align: right;
  font-size: 11px;
  line-height: 14px;
  font-weight: 600;
  white-space: nowrap;
  color: @text-color-secondary;
  cursor: default;
}

.fin-pill-success { color: @green-8; }
.fin-pill-danger { color: @red-7; }
</style>
