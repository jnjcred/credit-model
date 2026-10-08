<script setup>
// Afslagsnoten på Overblik (workspace.jsx: DeclinedBlock, L1517–1553). Årsag og dato står i
// fasekortet; noten kan rettes bagefter. "Gem note" gemmer kun, når noten er ændret, og viser
// "Gemt" med et flueben i 1,5 s (logikken er wsDeclinedNote i src/domain/workspace/actions.js).
// Knappen er kun markeret som utilgængelig (aria-disabled), når noten er uændret, og slås ikke
// rigtigt fra: den har stadig fokus, når "Gemt" skifter tilbage, og en deaktiveret knap ville
// smide tastaturfokus ud på siden. Et klik på en uændret note gør ingenting (save).
//
// Props: ingen. Emits: ingen.
import { computed, ref } from 'vue'
import { CheckOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsDeclinedNote } from '@/domain/workspace/actions'
import { useCaseVersion } from '@/composables/useCaseVersion'

const caseVersion = useCaseVersion()
// Feltet starter med den gemte note (som før: kun når kortet vises første gang)
const note = ref((CW.caseState().decline || {}).note || '')
const saved = ref(false)

const model = computed(() => {
  caseVersion.value
  return wsDeclinedNote(note.value, { setSaved: (v) => { saved.value = v } })
})
</script>

<template>
  <a-card :bordered="false">
    <a-form layout="vertical">
      <a-form-item
        :label="t('Afslagsnote')"
        html-for="ws-decline-note-edit"
      >
        <a-textarea
          id="ws-decline-note-edit"
          v-model:value="note"
          :rows="4"
          :placeholder="t('Begrund afslaget, fx \'For høj gældsgrad i forhold til EBITDA og uafklarede ejerforhold.\'')"
        />
      </a-form-item>
      <a-button
        :aria-disabled="model.unchanged"
        @click="model.save"
      >
        <template v-if="saved">
          {{ t('Gemt') }}
          <CheckOutlined aria-hidden="true" />
        </template>
        <template v-else>
          {{ t('Gem note') }}
        </template>
      </a-button>
    </a-form>
  </a-card>
</template>
