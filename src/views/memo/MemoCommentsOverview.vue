<script setup>
// Kommentaroversigten i skinnen (memo.jsx: MemoCommentsOverview L3269-3312). Vises, når ingen kommenteret
// sektion er i syne: i stedet for et tomt felt står alle kommenterede afsnit med antal åbne (og løste), og
// et klik springer til afsnittet. Kun de åbne blokerende kommentarer vises som kort (også et klik til
// afsnittet); resten står ud for afsnittet, så oversigten ikke får sin egen rullebjælke. "m løst" tæller
// også kommentarer, der er trukket tilbage (som før: alle minus åbne).
// Låst version: det frosne spor (frozen).
// Ikke porteret (død kode): kortenes visning af løste og trukne kommentarer (listen har kun åbne blokerende).
//
// Props: sections (MEMO_SECTIONS), counts (memoCommentCounts: { all, open }), frozen (det frosne spor eller null).
// Emits: scroll-to-section(afsnit).
import { computed } from 'vue'
import { t } from '@/i18n'
import { MEMO_DEPT_MAP, MEMO_DEPTS, commentState, isBlockingComment, loadComments } from '@/domain/memo/memoComments'
import { memoOpenWord } from '@/domain/memo/memoFacts'

const props = defineProps({
  sections: { type: Array, required: true },
  counts: { type: Object, required: true },
  frozen: { type: Object, default: null },
})
const emit = defineEmits(['scroll-to-section'])

// Afsnit med kommentarer, hvert med sine åbne blokerende kommentarer (læses igen, når tællerne ændrer sig)
const groups = computed(() => props.sections.filter(s => (props.counts.all[s.k] || 0) > 0).map(s => ({
  s,
  open: props.counts.open[s.k] || 0,
  all: props.counts.all[s.k],
  blocking: (props.frozen ? (props.frozen[s.k] || []) : loadComments(s.k)).filter(c => isBlockingComment(c) && commentState(c) === 'open'),
})))
const deptOf = (c) => MEMO_DEPT_MAP[c.dept] || MEMO_DEPTS[0]
</script>

<template>
  <div class="memo-cmt-ov">
    <div class="memo-cmt-ov-note">
      <a-typography-text type="secondary">
        {{ t('Ingen kommenterede afsnit i syne.') }}
      </a-typography-text>
    </div>
    <div
      v-for="g in groups"
      :key="g.s.k"
      class="memo-cmt-ov-group"
    >
      <a-button
        type="text"
        block
        class="memo-cmt-ov-sec"
        @click="emit('scroll-to-section', g.s.k)"
      >
        <a-typography-text type="secondary">
          {{ g.s.num }}
        </a-typography-text>
        <span class="memo-cmt-ov-label">{{ t(g.s.label) }}</span>
        <a-typography-text
          type="secondary"
          class="memo-cmt-ov-n"
        >
          {{ g.open + ' ' + memoOpenWord(g.open) + (g.all > g.open ? ' - ' + (g.all - g.open) + ' ' + t('løst') : '') }}
        </a-typography-text>
      </a-button>
      <a-button
        v-for="c in g.blocking"
        :key="c.id"
        block
        class="memo-cmt blocking memo-cmt-ov-card"
        @click="emit('scroll-to-section', g.s.k)"
      >
        <span class="memo-cmt-body">
          <span class="memo-cmt-meta">
            <a-typography-text strong>
              {{ c.author }}
            </a-typography-text>{{ ' ' }}<a-typography-text
              type="secondary"
              class="memo-cmt-dept"
            >
              {{ '- ' + t(deptOf(c).label) }}
            </a-typography-text>
            <a-typography-text
              type="danger"
              class="memo-cmt-flag"
            >
              {{ t('Blokerer indstilling') }}
            </a-typography-text>
          </span>
          <span class="memo-cmt-text">{{ t(c.text) }}</span>
        </span>
      </a-button>
    </div>
  </div>
</template>

<style scoped>
/* Oversigten fylder skinnens felt og ruller i det */
.memo-cmt-ov {
  position: absolute;
  inset: 0;
  padding: 10px 12px 14px;
  overflow-y: auto;
}

.memo-cmt-ov-note {
  margin-bottom: 8px;
}

.memo-cmt-ov-group {
  margin-bottom: 10px;
}

/* Afsnittet: nummer, titel og antal på én linje; lange titler brydes */
.memo-cmt-ov-sec {
  display: flex;
  gap: 6px;
  align-items: baseline;
  height: auto;
  padding: 4px 0;
  white-space: normal;
  text-align: left;
}

.memo-cmt-ov-label {
  flex: 1;
  min-width: 0;
}

.memo-cmt-ov-n {
  white-space: nowrap;
}

/* Den blokerende kommentar som et kort: forfatter, afdeling og "Blokerer indstilling", teksten på højst to linjer */
.memo-cmt-ov-card {
  height: auto;
  margin-top: 5px;
  padding: 8px 10px;
  white-space: normal;
  text-align: left;
}

.memo-cmt-body,
.memo-cmt-meta,
.memo-cmt-flag {
  display: block;
}

.memo-cmt-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
