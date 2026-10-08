<script setup>
// Et uploadpunkt i kundens portal (new_case_portal.jsx: PortalUpload, L2060–2123): titel, beskrivelse og
// "Hvorfor", et spørgsmål fra rådgiveren (svarfeltet står øverst), de filer, der allerede er sendt,
// filvælgeren, en bemærkning og "Færdig med dette punkt". "Har vi ikke / ikke relevant" skjuler upload
// og knap (én primærknap).
//
// Props: item (punktet).
// Emits: back (tilbage til oversigten), finish(files, note) (kunden er færdig; portalen gemmer),
//        noted (formularen "Har vi ikke" er sendt).
// Kladden (valgte filer og bemærkning) gemmes ved hver ændring (usePortalDraft) og hentes, når siden
// åbner. "Færdig med dette punkt" bruger den rigtige disabled-attribut med en tilknyttet forklaring,
// som før, og bærer data-cust-act="send" og data-pv-allow (rådgiveren kan uploade på kundens vegne).
import { computed, ref, shallowRef } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csDraft, csHHMM } from '@/domain/customer'
import { PORTAL_CONTACT, ncFill } from '@/domain/new_case_portal'
import { useCase } from '@/composables/useCaseVersion'
import { usePortalDraft } from './usePortalDraft'
import PortalBackNav from './components/PortalBackNav.vue'
import PortalItemHead from './components/PortalItemHead.vue'
import PortalNotedToggle from './components/PortalNotedToggle.vue'
import PortalSentFiles from './components/PortalSentFiles.vue'
import PortalPvUploadNote from './components/PortalPvUploadNote.vue'
import PortalFilePicker from './components/PortalFilePicker.vue'

const props = defineProps({
  item: { type: Object, required: true },
})
const emit = defineEmits(['back', 'finish', 'noted'])

const s = useCase(() => CW.itemState(props.item.id))
// Afvist, eller afvist og derefter sendt til en hjælper: de gamle filer gælder ikke længere
const rejected = computed(() => !!s.value && s.value.status === 'delegated' && !!s.value.reviewedAt)
const existing = computed(() => (s.value && !rejected.value ? (s.value.files || []) : []))
// Startværdierne læses én gang, når siden åbner (som useState før)
const draft0 = csDraft(props.item.id)
const s0 = s.value
const staged = shallowRef(draft0 && draft0.files ? draft0.files : [])
const note = ref(draft0 && draft0.note != null ? draft0.note : s0 && s0.status === 'received' && s0.noteKind !== 'system' ? (s0.note || '') : '')
const noteOpen = ref(!!note.value)
const notedOpen = ref(false)
const draftAt = usePortalDraft(props.item.id, () => ({ files: staged.value, note: note.value }))
const total = computed(() => existing.value.length + staged.value.length)
const adv = PORTAL_CONTACT.first
const canNote = computed(() => existing.value.length === 0 && (!s.value || s.value.status !== 'noted'))
const preview = useCase(() => CW.isPreview())
// Rådgiveren (Kundeside) kan færdiggøre punktet med blot en bemærkning, fx når en fil ikke er relevant for virksomheden
const noteOnly = computed(() => preview.value && total.value === 0 && !!note.value.trim())
// Spørgsmål fra rådgiveren: svarfeltet står øverst, og et svar alene kan sendes
const asked = computed(() => !!s.value && s.value.status === 'rejected')
// Med et spørgsmål kræver knappen noget nyt: et svar eller en fil (de sendte filer står allerede)
const canFinish = computed(() => (asked.value ? staged.value.length > 0 || !!note.value.trim() : total.value > 0 || noteOnly.value))
const answerOnly = computed(() => asked.value && staged.value.length === 0)
const hint = computed(() => (asked.value ? t('Skriv et svar, eller vælg en fil') : preview.value ? t('Vælg en fil, eller skriv en bemærkning') : t('Vælg mindst én fil')))
const FULL = { span: 24 }

function openNote () {
  noteOpen.value = true
  CW.focusSoon('#cwp-note')
}
</script>

<template>
  <div class="portal-item">
    <PortalBackNav @back="emit('back')" />
    <PortalItemHead
      v-model:answer="note"
      :item="item"
    />

    <PortalNotedToggle
      v-if="notedOpen"
      :item="item"
      open
      @update:open="(v) => { notedOpen = v }"
      @done="emit('noted')"
    />
    <template v-else>
      <a-typography-title
        v-if="asked"
        :level="2"
      >
        {{ existing.length ? t('Tilføj en fil, hvis der er brug for det') : t('Send en ny fil, hvis der er brug for det') }}
      </a-typography-title>
      <PortalSentFiles
        :item="item"
        :files="existing"
      />
      <PortalPvUploadNote />
      <PortalFilePicker
        v-model:staged="staged"
        :item-id="item.id"
      />

      <template v-if="!asked">
        <a-form-item
          v-if="noteOpen"
          class="portal-item-gap"
          :label="ncFill(t('Bemærkning til {adv} (valgfri)'), { adv })"
          html-for="cwp-note"
          :label-col="FULL"
          :colon="false"
        >
          <a-textarea
            id="cwp-note"
            v-model:value="note"
            :rows="2"
            :placeholder="t('Fx hvilken version det er, eller hvad der mangler')"
          />
        </a-form-item>
        <a-button
          v-else
          class="portal-item-gap"
          type="text"
          @click="openNote"
        >
          <template #icon>
            <PlusOutlined aria-hidden="true" />
          </template>
          {{ t('Tilføj en bemærkning') }}
        </a-button>
      </template>

      <div class="portal-item-foot">
        <PortalNotedToggle
          v-if="canNote"
          :item="item"
          :open="false"
          @update:open="(v) => { notedOpen = v }"
          @done="emit('noted')"
        />
        <span v-else />
        <a-space
          wrap
          class="portal-item-send"
        >
          <a-typography-text
            v-if="draftAt"
            type="secondary"
            class="cwp-draft-at"
          >
            {{ ncFill(t('Kladde gemt kl. {tid}'), { tid: csHHMM(draftAt) }) }}
          </a-typography-text>
          <a-typography-text
            v-if="!canFinish"
            id="cwp-up-hint"
            type="secondary"
          >
            {{ hint }}
          </a-typography-text>
          <a-button
            type="primary"
            data-cust-act="send"
            data-pv-allow="1"
            :disabled="!canFinish"
            :aria-describedby="!canFinish ? 'cwp-up-hint' : undefined"
            @click="emit('finish', staged, note.trim())"
          >
            {{ answerOnly && note.trim() ? t('Send svar') : t('Færdig med dette punkt') }}
          </a-button>
        </a-space>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Punktets spalte, som før */
.portal-item {
  max-width: 640px;
  margin: 0 auto;
}

.portal-item-gap {
  margin-top: 12px;
}

/* "Har vi ikke" til venstre, kladde, forklaring og knap til højre; under hinanden på smalle skærme */
.portal-item-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.portal-item-send {
  justify-content: flex-end;
  margin-left: auto;
}
</style>
