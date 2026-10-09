<script setup>
// "Stil spørgsmål til …" (workspace.jsx: WSRejectModal, L2582–2668): rådgiveren skriver sit
// spørgsmål (kunden ser det på sin side) og kan sende en mail med; mailen er fra som udgangspunkt
// og kan ses og rettes, før den sendes. Den rettede mail sendes ikke videre (kun visning), som før.
// Enter i spørgsmålet sender, når mailen er fra. Teksterne bygges af wsRejectMail i
// src/domain/workspace/request.js. Dialogen vises, så længe den er monteret (forælderen bruger
// v-if); lukkes den, får elementet, der havde fokus før, fokus igen, hvis det stadig findes
// (som CW.useDialog før).
//
// Props: it (punktet). Emits: close, done({ reason, sendMail }).
import { computed, onUnmounted, ref } from 'vue'
import { t } from '@/i18n'
import { wsFill } from '@/domain/workspace/format'
import { wsRejectMail } from '@/domain/workspace/request'
import { useCaseVersion } from '@/composables/useCaseVersion'
import MailComposer from './shared/MailComposer.vue'

const props = defineProps({
  it: { type: Object, required: true },
})
const emit = defineEmits(['close', 'done'])

const caseVersion = useCaseVersion()
const reason = ref('')
const sendMail = ref(false) // mailen er fra som udgangspunkt; rådgiveren slår den til, hvis kunden skal have en
const subjectEdit = ref(null)
const bodyEdit = ref(null)

const m = computed(() => {
  caseVersion.value
  return wsRejectMail(props.it, reason.value, sendMail.value, subjectEdit.value, bodyEdit.value)
})

function go () {
  if (m.value.ok) emit('done', { reason: reason.value.trim(), sendMail: sendMail.value })
}
// preventDefault: dialogen lukkes, og fokus flytter til næste "Godkend", mens tasten stadig er nede;
// uden det kan samme Enter også trykke på den knap (tastens keypress lander der)
function onEnter (e) {
  if (sendMail.value) return
  if (e && e.preventDefault) e.preventDefault()
  go()
}
function resetMail () {
  subjectEdit.value = null
  bodyEdit.value = null
}

// Fokus tilbage til det element, der åbnede dialogen, når den lukkes (hvis det stadig findes)
const prev = document.activeElement
onUnmounted(() => {
  if (prev && prev.focus && document.contains(prev)) { try { prev.focus() } catch (e) {} }
})
</script>

<template>
  <a-modal
    :visible="true"
    :width="572"
    :wrap-props="{ 'aria-modal': 'true', id: 'ws-reject' }"
    @cancel="emit('close')"
  >
    <template #title>
      <span id="ws-reject-title">{{ wsFill(t('Stil spørgsmål til "{item}"'), { item: m.label }) }}</span>
    </template>
    <a-typography-paragraph type="secondary">
      {{ t('Kunden kan se din note på sin side. Du kan også sende en mail.') }}
    </a-typography-paragraph>
    <a-form layout="vertical">
      <a-form-item
        :label="t('Hvad vil du spørge om?')"
        html-for="ws-reject-reason"
      >
        <a-input
          id="ws-reject-reason"
          v-model:value="reason"
          autofocus
          :placeholder="t('Dit spørgsmål til kunden, f.eks. &quot;Kan I sende noterne til årsrapporten?&quot;')"
          @press-enter="onEnter"
        />
      </a-form-item>
      <a-form-item>
        <a-checkbox v-model:checked="sendMail">
          {{ wsFill(t('Send en mail til kunden ({email})'), { email: m.to.email || t('kunden') }) }}
          <template v-if="!sendMail">
            <br>
            <a-typography-text type="secondary">
              {{ t('Der sendes ingen mail. Kundens side viser stadig din note.') }}
            </a-typography-text>
          </template>
        </a-checkbox>
      </a-form-item>
    </a-form>
    <MailComposer
      v-if="sendMail"
      :subject="m.subject"
      :body="m.body"
      :is-default="subjectEdit == null && bodyEdit == null"
      :rows="12"
      subject-id="ws-reject-subject"
      @update:subject="(v) => { subjectEdit = v }"
      @update:body="(v) => { bodyEdit = v }"
      @reset="resetMail"
    />
    <template #footer>
      <a-button @click="emit('close')">
        {{ t('Annullér') }}
      </a-button>
      <a-button
        type="primary"
        :disabled="!m.ok"
        @click="go"
      >
        {{ sendMail ? t('Send spørgsmål og mail') : t('Send spørgsmål uden mail') }}
      </a-button>
    </template>
  </a-modal>
</template>
