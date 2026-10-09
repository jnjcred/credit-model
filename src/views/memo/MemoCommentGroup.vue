<script setup>
// Ét afsnits tråd i kommentarskinnen (memo.jsx: MemoCommentGroup L3178-3267): afsnittets nummer og titel
// (et klik springer til afsnittet), "n åben/åbne" når nogle af kommentarerne er løst eller trukket tilbage,
// "+ Tilføj" (ikke i en låst version), kommentarerne og kommentarboksen. Uden kommentarer og uden åben boks
// vises tråden ikke. Det aktive afsnits tråd har en kant (a-card bordered; prototypen gav den en grå
// baggrund med egen CSS).
// Låst version: det frosne spor fra indstillingen (frozen), ellers det levende (localStorage
// 'memo4-comments:<afsnit>'). Tråden læses igen, når boksen åbner eller lukker, og når sporet eller memoet
// er ændret (version).
// - En ny kommentar gemmes med Mette Larsen (Kredit) som forfatter. Den sender ikke 'memo-changed' (som før);
//   siden tæller igen via changed.
// - Løs, træk tilbage og bed om frigivelse spørger med CW.confirm (src/domain/memo/memoCommentWorkflow.js).
//   Bagefter får den sammenfoldede linje (løs, træk tilbage) eller kortets første knap (bed om frigivelse)
//   fokus, så man ikke mister stedet.
//
// Props: section ({ k, num, label }), isActive, composerOpen, version (sporets og memoets version),
//        frozen (det frosne spor { afsnit: [kommentarer] } eller null), lockNote (teksten, når sporet er låst).
// Emits: composer-toggle(afsnit | null), changed, scroll-to-section(afsnit).
import { computed, ref, shallowRef, watch } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { MEMO_ME, commentState, loadComments, saveComments } from '@/domain/memo/memoComments'
import { requestMemoRelease, resolveMemoComment, simulateMemoRelease, withdrawMemoComment } from '@/domain/memo/memoCommentWorkflow'
import { memoOpenWord } from '@/domain/memo/memoFacts'
import MemoComment from './MemoComment.vue'
import MemoCommentComposer from './MemoCommentComposer.vue'

const props = defineProps({
  section: { type: Object, required: true },
  isActive: { type: Boolean, default: false },
  composerOpen: { type: Boolean, default: false },
  version: { type: String, default: '' },
  frozen: { type: Object, default: null },
  lockNote: { type: String, default: null },
})
const emit = defineEmits(['composer-toggle', 'changed', 'scroll-to-section'])

const sKey = computed(() => props.section.k)
// Låst version: det frosne spor fra indstillingen, ellers det levende
const thread = () => (props.frozen ? (props.frozen[sKey.value] || []) : loadComments(sKey.value))
// Listen skiftes ud i sin helhed (kommentarerne er almindelige objekter fra localStorage)
const comments = shallowRef(thread())
// Kommentarboksens tekst bor i tråden (som før): den overlever, at siden lukker boksen
const text = ref('')

watch(() => [sKey.value, props.composerOpen, props.version, props.frozen], () => { comments.value = thread() })

function submit () {
  const txt = text.value.trim()
  if (!txt) return
  const next = [...loadComments(sKey.value), { id: Date.now(), dept: MEMO_ME.id, author: MEMO_ME.author, at: new Date().toISOString(), text: txt }]
  saveComments(sKey.value, next)
  comments.value = next
  text.value = ''
  emit('composer-toggle', null)
  emit('changed')
}
function cancel () {
  emit('composer-toggle', null)
  text.value = ''
}

const secName = computed(() => props.section.num + '. ' + t(props.section.label))
function after (ok, c) {
  if (!ok) return
  comments.value = loadComments(sKey.value)
  emit('changed')
  // Fokus på den sammenfoldede linje, så man ikke mister stedet
  CW.focusSoon('[data-cmt="cmt-' + sKey.value + '-' + c.id + '"] .memo-cmt-sum')
}
const onResolve = (x) => resolveMemoComment(sKey.value, x, secName.value).then(ok => after(ok, x))
const onWithdraw = (x) => withdrawMemoComment(sKey.value, x).then(ok => after(ok, x))
const onRequest = (x) => requestMemoRelease(sKey.value, x, secName.value).then(ok => {
  if (!ok) return
  comments.value = loadComments(sKey.value)
  emit('changed')
  CW.focusSoon('[data-cmt="cmt-' + sKey.value + '-' + x.id + '"] .memo-cmt-actions button')
})
const onSimulate = (x) => simulateMemoRelease(sKey.value, x, secName.value)

const openN = computed(() => comments.value.filter(c => commentState(c) === 'open').length)
</script>

<template>
  <a-card
    v-if="comments.length > 0 || composerOpen"
    size="small"
    :bordered="isActive"
    :class="['memo-cmt-group', { active: isActive }]"
  >
    <div class="memo-cmt-group-head">
      <a-typography-text
        type="secondary"
        class="num"
      >
        {{ section.num }}
      </a-typography-text>
      <a-button
        type="link"
        size="small"
        class="ttl cw-link"
        :title="t('Spring til afsnit')"
        @click="emit('scroll-to-section', sKey)"
      >
        {{ t(section.label) }}
      </a-button>
      <a-typography-text
        v-if="comments.length > openN"
        type="secondary"
        class="memo-cmt-open-n"
      >
        {{ openN + ' ' + memoOpenWord(openN) }}
      </a-typography-text>
      <a-button
        v-if="!composerOpen && !lockNote"
        type="text"
        size="small"
        class="memo-cmt-add"
        :aria-label="t('Tilføj kommentar til') + ' ' + secName"
        @click="emit('composer-toggle', sKey)"
      >
        {{ t('+ Tilføj') }}
      </a-button>
    </div>

    <MemoComment
      v-for="c in comments"
      :key="c.id"
      :c="c"
      :section="section"
      :lock-note="lockNote"
      @resolve="onResolve"
      @request="onRequest"
      @simulate="onSimulate"
      @withdraw="onWithdraw"
    />

    <MemoCommentComposer
      v-if="composerOpen"
      v-model:text="text"
      :s-key="sKey"
      @submit="submit"
      @cancel="cancel"
    />
  </a-card>
</template>

<style scoped>
/* Trådens hoved: nummer, titel, antal åbne og "+ Tilføj" på én linje (øverst, når titlen brydes) */
.memo-cmt-group-head {
  display: flex;
  gap: 6px;
  align-items: flex-start;
}

/* Titlen er en knap, der må stå på flere linjer (lange afsnitstitler skæres ikke af) */
.memo-cmt-group-head .ttl {
  flex: 1;
  min-width: 0;
  height: auto;
  padding: 0;
  white-space: normal;
  text-align: left;
}

.memo-cmt-open-n,
.memo-cmt-add {
  white-space: nowrap;
}
</style>
