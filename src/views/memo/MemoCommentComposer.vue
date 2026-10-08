<script setup>
// Kommentarboksen i et afsnits tråd (memo.jsx: MemoCommentGroup L3235-3264). "Du skriver som Mette Larsen
// · Kredit" er feltets etiket; rådgiveren skriver altid i eget navn. Feltet får fokus, når boksen åbner.
// Ctrl/Cmd+Enter sender, Esc lukker og tømmer feltet (i skuffen på smal skærm lukker Esc kun boksen, som
// før). "Send" kan ikke trykkes, mens feltet er tomt (som før: knappen er slået fra).
// Teksten ejes af tråden (v-model:text), som før: lukker siden boksen (fx fordi rådgiveren åbner boksen
// ved et andet afsnit), står teksten der stadig, næste gang boksen åbner i samme tråd.
//
// Props: sKey (afsnittets nøgle; feltets id er cmt-new-<sKey>), text (v-model:text).
// Emits: update:text, submit (Send eller Ctrl/Cmd+Enter), cancel (Annullér eller Esc).
import { nextTick, onMounted, ref } from 'vue'
import { t } from '@/i18n'
import { MEMO_ME } from '@/domain/memo/memoComments'

const props = defineProps({
  sKey: { type: String, required: true },
  text: { type: String, default: '' },
})
const emit = defineEmits(['update:text', 'submit', 'cancel'])

const field = ref(null)
// Feltet får fokus, når boksen åbner (prototypens autoFocus)
onMounted(() => nextTick(() => { if (field.value) field.value.focus() }))

function onKeydown (e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); emit('submit') }
  if (e.key === 'Escape') {
    // I skuffen (smal skærm) lukker Esc kun kommentarboksen, ikke skuffen (som før). a-drawer lukker på Esc,
    // der bobler op til den.
    if (e.target && e.target.closest && e.target.closest('#memo-drawer')) e.stopPropagation()
    emit('cancel')
  }
}
const fieldId = 'cmt-new-' + props.sKey
</script>

<template>
  <a-form
    layout="vertical"
    class="memo-cmt-form"
    @submit.prevent
  >
    <a-form-item
      :html-for="fieldId"
      class="memo-cmt-field"
    >
      <template #label>
        <span class="memo-cmt-as">
          {{ t('Du skriver som') + ' ' }}<a-typography-text strong>
            {{ MEMO_ME.author + ' · ' + t(MEMO_ME.label) }}
          </a-typography-text>
        </span>
      </template>
      <a-textarea
        :id="fieldId"
        ref="field"
        :value="text"
        :auto-size="{ minRows: 3 }"
        :placeholder="t('Skriv en kommentar til kollegaer fra andre afdelinger…')"
        @update:value="(v) => emit('update:text', v)"
        @keydown="onKeydown"
      />
    </a-form-item>
    <div class="memo-cmt-form-row">
      <a-button
        size="small"
        @click="emit('cancel')"
      >
        {{ t('Annullér') }}
      </a-button>
      <a-button
        type="primary"
        size="small"
        :disabled="!text.trim()"
        @click="emit('submit')"
      >
        {{ t('Send') }}
      </a-button>
    </div>
  </a-form>
</template>

<style scoped>
/* Feltet og knapperne tæt under hinanden */
.memo-cmt-field {
  margin-bottom: 8px;
}

/* Knapperne til højre */
.memo-cmt-form-row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
