<script setup>
// Gennemgangen af et memoafsnit (memo.jsx: MemoSection L3944-3979): rådgiveren står aktivt inde for
// afsnittet. En stille række under teksten: status i gråt og én knap. Forklaringen står én gang i memoets
// top.
// - Ikke gennemgået: "Ikke gennemgået", eller med fed "Ændret efter gennemgang, gennemgå igen." (tooltip:
//   hvem der gennemgik og hvornår), og "Markér som gennemgået" (går videre til næste udkast).
// - Gennemgået: "Gennemgået af X, <dato>" (+ "· n felter mangler") og "Fortryd". Rækken kan få fokus
//   (#<id>-reviewed): siden giver den fokus, når der ikke er flere udkast.
// Uden knapper i en indstillet (skrivebeskyttet) version.
//
// Props: st (memoSectionStatus), readOnly, id (afsnittets id, ms-<nøgle>), secName ("<nr>. <titel>").
// Emits: review ("Markér som gennemgået"), undo-review ("Fortryd" ved gennemgangen).
import { CheckOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { _memoFmtDay } from '@/domain/memo/memoFormat'

defineProps({
  st: { type: Object, default: null },
  readOnly: { type: Boolean, default: false },
  id: { type: String, required: true },
  secName: { type: String, required: true },
})
const emit = defineEmits(['review', 'undo-review'])

const fmtWhen = (at) => (window.CW ? CW.fmtWhen(at) : at)
</script>

<template>
  <div
    v-if="st && st.unreviewed"
    class="memo-review todo"
  >
    <a-typography-text
      v-if="st.stale"
      type="secondary"
      class="rv-text"
      :title="t('Gennemgået af') + ' ' + st.stale.by + ', ' + fmtWhen(st.stale.at) + '. ' + t('Teksten er ændret siden, så gennemgangen gælder ikke længere.')"
    >
      <strong>{{ t('Ændret efter gennemgang, gennemgå igen.') }}</strong>
    </a-typography-text>
    <a-typography-text
      v-else
      type="secondary"
      class="rv-text"
    >
      {{ t('Ikke gennemgået') }}
    </a-typography-text>
    <a-button
      v-if="!readOnly"
      size="small"
      class="rv-go"
      :title="t('Markér som gennemgået og gå til næste')"
      :aria-label="t('Markér som gennemgået') + ': ' + secName"
      @click="emit('review')"
    >
      {{ t('Markér som gennemgået') }}
    </a-button>
  </div>
  <div
    v-if="st && st.reviewed"
    :id="id + '-reviewed'"
    class="memo-review done"
    tabindex="-1"
  >
    <a-typography-text
      type="secondary"
      class="rv-text"
      :title="fmtWhen(st.reviewed.at)"
    >
      <CheckOutlined aria-hidden="true" />
      {{ t('Gennemgået af') }} {{ st.reviewed.by }}, {{ _memoFmtDay(st.reviewed.at) }}{{ st.blanks ? ' · ' + st.blanks + ' ' + (st.blanks === 1 ? t('felt mangler') : t('felter mangler')) : '' }}
    </a-typography-text>
    <a-button
      v-if="!readOnly"
      type="link"
      size="small"
      class="rv-undo"
      :aria-label="t('Fortryd gennemgang') + ': ' + secName"
      @click="emit('undo-review')"
    >
      {{ t('Fortryd') }}
    </a-button>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';
@import (reference) '../../styles/memo-layout.less';

/* En stille række under teksten, rykket ind som teksten (afsnitsnummerets kolonne) */
.memo-review {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 12px 0 0 @memo-text-indent;
  padding-top: 6px;
  border-top: 1px solid @border-color-split;
}

.memo-review .rv-text {
  flex: 1;
  min-width: 180px;
}

/* Rækken får kun fokus fra siden (ikke et tabulatorstop); tastaturfokus vises som understregning */
.memo-review:focus {
  outline: none;
}

.memo-review:focus-visible .rv-text {
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
