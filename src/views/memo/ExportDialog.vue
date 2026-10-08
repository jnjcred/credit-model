<script setup>
// "Eksportér til Word" (memo.jsx: ExportDialog L4099-4158): man skal vide, hvad man sender, ikke opdage det
// bagefter. En grå linje siger, hvad filen er: "Indstillet version {v}, låst. x af 14 afsnit gennemgået…"
// eller udkastets status ("Mærket Udkast: …"). En eksport af et udkast er en oplysning, ikke en fejl.
// "Tag de interne kommentarer med" er fra som udgangspunkt. "Hent filen" skriver filen (exportMemoToWord i
// src/domain/memo/memoExport.js; window.__memoLastExport) og lukker dialogen.
// Dialogen vises, så længe den er monteret (siden bruger v-if, og giver bagefter #memo-export-btn fokus).
// Ved åbning får afkrydsningsfeltet fokus (det første felt, som før); dialogen husker selv, hvad der havde
// fokus, og giver det fokus igen, når den lukkes (antdv gør det ikke, når dialogen fjernes med v-if).
// Kendt fra prototypen (bevaret): antallet af kommentarer er det levende spor, også for en låst version
// (filen bruger det frosne spor).
//
// Props: sections (MEMO_SECTIONS). Emits: close.
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { t } from '@/i18n'
import { loadComments } from '@/domain/memo/memoComments'
import { _memoFill } from '@/domain/memo/memoFormat'
import { exportMemoToWord, exportReadiness, memoExportDraftLine, memoExportStatusLine } from '@/domain/memo/memoExport'

const props = defineProps({
  sections: { type: Array, required: true },
})
const emit = defineEmits(['close'])

const withComments = ref(false)
// Regnes én gang, når dialogen åbner (afsnittene ændrer sig ikke, mens den er åben)
const ready = exportReadiness(props.sections)
const commentCount = props.sections.reduce((n, s) => n + loadComments(s.k).length, 0)
const stateLine = computed(() => (ready.locked
  ? _memoFill(t('Indstillet version {v}, låst'), { v: ready.locked.version }) + '. ' + memoExportStatusLine(ready)
  : memoExportDraftLine(ready)))

function download () {
  exportMemoToWord(props.sections, { comments: withComments.value })
  emit('close')
}

// Fokus: afkrydsningsfeltet ved åbning; det, der havde fokus før, igen ved lukning
const prev = document.activeElement
const box = ref(null)
onMounted(() => nextTick(() => requestAnimationFrame(() => { if (box.value) box.value.focus() })))
onBeforeUnmount(() => {
  if (prev && prev.focus && document.contains(prev)) { try { prev.focus() } catch (e) {} }
})
</script>

<template>
  <a-modal
    :visible="true"
    :title="t('Eksportér til Word')"
    :width="572"
    :wrap-props="{ 'aria-modal': 'true' }"
    @cancel="emit('close')"
  >
    <a-typography-paragraph type="secondary">
      {{ t('Filen indeholder det samme som skærmen. Skabelonens vejledningstekst fjernes, og kildehenvisninger skrives ud som dokumentnavn og side, så modtageren kan slå efter.') }}
    </a-typography-paragraph>
    <a-typography-paragraph
      type="secondary"
      class="memo-export-state"
    >
      {{ stateLine }}
    </a-typography-paragraph>
    <a-checkbox
      ref="box"
      v-model:checked="withComments"
    >
      {{ t('Tag de interne kommentarer med') }}
      <br>
      <a-typography-text type="secondary">
        {{ commentCount + ' ' + (commentCount === 1 ? t('kommentar') : t('kommentarer')) + ' ' + t('fra Kredit, Compliance, Erhverv og Risiko. Skal normalt blive i huset.') }}
      </a-typography-text>
    </a-checkbox>
    <template #footer>
      <a-button @click="emit('close')">
        {{ t('Annullér') }}
      </a-button>
      <a-button
        type="primary"
        @click="download"
      >
        {{ t('Hent filen') }}
      </a-button>
    </template>
  </a-modal>
</template>
