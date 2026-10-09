<script setup>
// "Påmind kunden" (workspace.jsx: WSRemindModal, L2506–2579): mailen vises, før den sendes. Som
// udgangspunkt handler den om alt, kunden mangler at sende (ikke sendt endnu, eller et spørgsmål
// skal besvares); rådgiveren kan skrive den om og gendanne standardteksten. Mangler kunden ikke
// noget, står det i bunden, og påmindelsen kan ikke sendes. Teksterne bygges af wsRemindMail i
// src/domain/workspace/request.js. Dialogen vises, så længe den er monteret (forælderen bruger
// v-if); lukkes den, får elementet, der havde fokus før, fokus igen, hvis det stadig findes
// (som CW.useDialog før).
//
// Hvilke punkter påmindelsen handler om, vælger rådgiveren øverst i vinduet (afkrydsning, når kunden mangler mere
// end ét). Standard: de punkter, der er givet (Påmind på ét punkt), ellers alt, kunden mangler. Mailen følger
// valget, indtil rådgiveren selv har rettet i den.
//
// Props: ids (kun disse punkter er valgt til at starte med, f.eks. Påmind på ét punkt; uden ids alt, kunden mangler).
// Emits: close.
import { computed, onUnmounted, ref, watch } from 'vue'
import { t } from '@/i18n'
import { wsRemindMail, wsSendReminder } from '@/domain/workspace/request'
import { useCaseVersion } from '@/composables/useCaseVersion'
import MailComposer from './shared/MailComposer.vue'

const props = defineProps({
  ids: { type: Array, default: null },
})
const emit = defineEmits(['close'])

const caseVersion = useCaseVersion()
// Alt, kunden mangler: det, rådgiveren kan vælge imellem
const all = computed(() => {
  caseVersion.value
  return wsRemindMail(null).missingItems
})
const chosen = ref(props.ids ? props.ids.slice() : all.value.map(it => it.id))
const options = computed(() => all.value.map(it => ({ value: it.id, label: t(it.label) })))
const m = computed(() => {
  caseVersion.value
  return wsRemindMail(chosen.value)
})
// Mailen starter som standardteksten (som før: når dialogen åbner)
const subject = ref(m.value.defSubject)
const body = ref(m.value.defBody)
const touched = ref(false)

const canSend = computed(() => m.value.ids.length > 0 && !!body.value.trim())

// Ændres valget, skrives mailen om, medmindre rådgiveren selv har rettet i den
watch(chosen, () => { if (!touched.value) { subject.value = m.value.defSubject; body.value = m.value.defBody } })
function setSubject (v) { subject.value = v; touched.value = true }
function setBody (v) { body.value = v; touched.value = true }
function reset () {
  subject.value = m.value.defSubject
  body.value = m.value.defBody
  touched.value = false
}
function send () {
  if (!canSend.value) return
  wsSendReminder(m.value.ids, m.value.adv, m.value.to)
  emit('close')
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
    :wrap-props="{ 'aria-modal': 'true', id: 'ws-remind' }"
    @cancel="emit('close')"
  >
    <template #title>
      <span id="ws-remind-title">{{ t('Påmind kunden') }}</span>
    </template>
    <a-form-item
      v-if="options.length > 1"
      :label="t('Hvad skal påmindelsen handle om?')"
      :label-col="{ span: 24 }"
      :colon="false"
    >
      <a-checkbox-group
        v-model:value="chosen"
        :options="options"
        class="ws-remind-opts"
      />
    </a-form-item>
    <a-typography-paragraph>
      <a-typography-text type="secondary">
        {{ t('Til') }}
      </a-typography-text>
      {{ ' ' }}
      <a-typography-text strong>
        {{ m.to.name || t('kunden') }}
      </a-typography-text>{{ m.to.role ? ', ' + t(m.to.role) : '' }}{{ m.to.email ? ' - ' + m.to.email : '' }}
    </a-typography-paragraph>
    <MailComposer
      :subject="subject"
      :body="body"
      :is-default="!touched"
      :rows="14"
      subject-id="ws-remind-subject"
      :note="t('Mailen sendes præcis som vist.')"
      @update:subject="setSubject"
      @update:body="setBody"
      @reset="reset"
    />
    <template #footer>
      <a-row
        justify="space-between"
        align="middle"
        :gutter="[8, 8]"
      >
        <a-col>
          <a-typography-text
            v-if="m.ids.length === 0"
            type="secondary"
          >
            {{ options.length ? t('Vælg mindst ét punkt.') : t('Kunden mangler ikke noget.') }}
          </a-typography-text>
        </a-col>
        <a-col>
          <a-space>
            <a-button @click="emit('close')">
              {{ t('Annullér') }}
            </a-button>
            <a-button
              type="primary"
              :disabled="!canSend"
              @click="send"
            >
              {{ t('Send påmindelse') }}
            </a-button>
          </a-space>
        </a-col>
      </a-row>
    </template>
  </a-modal>
</template>

<style scoped>
.ws-remind-opts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
