<script setup>
// "Gå direkte til memo" (workspace.jsx: WSSkipDialog, L1282–1340): kunden bliver ikke bedt om
// materiale, og rådgiveren skriver kort hvorfor (begrundelsen kommer med i indstillingen).
// "Gå til memo" er altid aktiv: uden begrundelse vises fejlen under feltet. Et dobbeltklik starter
// ikke to faseskift. Når fasen er skiftet, åbnes Credit memo. Annullér, Esc, luk og klik udenfor
// giver fokus tilbage til knappen, der åbnede dialogen (ellers fasekortets overskrift).
// Reglerne står i wsSkipOk, wsSkipCustomer og wsSkipCancel i src/domain/workspace/actions.js.
// Dialogen vises, så længe den er monteret (forælderen bruger v-if).
//
// Props: caseId (React-proppen go er erstattet af useNavigation). Emits: close.
import { computed, onMounted, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { go } from '@/composables/useNavigation'
import { wsSkipCancel, wsSkipCustomer, wsSkipOk } from '@/domain/workspace/actions'

const props = defineProps({
  caseId: { type: Number, required: true },
})
const emit = defineEmits(['close'])

const reason = ref('')
const tried = ref(false)
const busy = ref(false)
const ok = computed(() => wsSkipOk(reason.value))
const invalid = computed(() => tried.value && !ok.value)

function cancel () {
  wsSkipCancel(() => emit('close'))
}
function submit () {
  tried.value = true
  // Dobbeltklik starter ikke to faseskift
  if (!ok.value || busy.value) return
  busy.value = true
  wsSkipCustomer(reason.value).then((done) => {
    busy.value = false
    if (!done) return
    emit('close')
    go('workspace:' + props.caseId + ':memo')
  })
}

// Fokus i feltet, når dialogen åbner (som før)
onMounted(() => CW.focusSoon('#ws-skip-reason'))
</script>

<template>
  <a-modal
    :visible="true"
    :width="572"
    :wrap-props="{ 'aria-modal': 'true', 'aria-describedby': 'ws-skip-text' }"
    @cancel="cancel"
  >
    <template #title>
      <span id="ws-skip-title">{{ t('Gå direkte til memo') }}</span>
    </template>
    <a-typography-paragraph
      id="ws-skip-text"
      type="secondary"
    >
      {{ t('Kunden bliver ikke bedt om materiale. Skriv kort hvorfor. Begrundelsen kommer med i indstillingen.') }}
    </a-typography-paragraph>
    <a-form layout="vertical">
      <a-form-item
        :label="t('Begrundelse')"
        html-for="ws-skip-reason"
        :validate-status="invalid ? 'error' : undefined"
      >
        <a-textarea
          id="ws-skip-reason"
          v-model:value="reason"
          :rows="3"
          :placeholder="t('Fx: Kunden har allerede sendt årsrapport og periodetal i forbindelse med bankens ansøgning.')"
          :aria-invalid="invalid ? true : undefined"
          aria-describedby="ws-skip-msg"
        />
        <template
          v-if="invalid"
          #help
        >
          <span id="ws-skip-msg">{{ t('Skriv en kort begrundelse.') }}</span>
        </template>
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="cancel">
        {{ t('Annullér') }}
      </a-button>
      <a-button
        id="ws-skip-go"
        type="primary"
        :loading="busy"
        @click="submit"
      >
        {{ t('Gå til memo') }}
      </a-button>
    </template>
  </a-modal>
</template>
