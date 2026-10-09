<script setup>
// "Spørg kunden" om noget, der er hentet automatisk (WSMaterialModal i workspace.jsx L2068–2087):
// spørgsmålet bliver et punkt i anmodningen, som kunden kan svare på med tekst eller en fil.
// Skærmen lægger det i anmodningen med wsAddAsk (src/domain/workspace/request.js).
//
// Props:
//   itemId      punktets id (felterne hedder ws-ask-q-<id> og ws-ask-cat-<id>; andre skærme sætter fokus i dem)
//   text        spørgsmålet (v-model:text)
//   category    emnet (v-model:category): et af emnerne, eller 'Øvrigt' (vises som "Andet")
//   categories  emnernes danske navne (wsMaterialModel(...).catOptions)
//   tried       der er trykket "Tilføj spørgsmålet": et tomt spørgsmål vises som fejl
// Emits: update:text, update:category, cancel (Annullér), add (Tilføj spørgsmålet)
import { computed } from 'vue'
import { t } from '@/i18n'
import { useSelectEscape } from '@/composables/useSelectEscape'

const props = defineProps({
  itemId: { type: String, required: true },
  text: { type: String, default: '' },
  category: { type: String, default: '' },
  categories: { type: Array, default: () => [] },
  tried: { type: Boolean, default: false },
})
const emit = defineEmits(['update:text', 'update:category', 'cancel', 'add'])

const missing = computed(() => props.tried && !props.text.trim())
const options = computed(() => props.categories.map(c => ({ value: c, label: t(c) })).concat([{ value: 'Øvrigt', label: t('Andet') }]))
const placeholder = t('F.eks. "Kan I forklare faldet i bruttofortjenesten i 2024?"')
// Esc i den åbne emneliste lukker kun listen, ikke "Anmod om materiale"
const selectEsc = useSelectEscape()
</script>

<template>
  <a-card
    size="small"
    class="ws-ask-form"
  >
    <a-form layout="vertical">
      <a-form-item
        :label="t('Hvad vil du spørge kunden om?')"
        :html-for="'ws-ask-q-' + itemId"
        :validate-status="missing ? 'error' : undefined"
        :help="missing ? t('Skriv dit spørgsmål.') : undefined"
      >
        <a-textarea
          :id="'ws-ask-q-' + itemId"
          :value="text"
          :rows="3"
          :placeholder="placeholder"
          :aria-invalid="missing ? 'true' : undefined"
          @update:value="(v) => emit('update:text', v)"
        />
      </a-form-item>
      <a-form-item
        :label="t('Kategori')"
        :html-for="'ws-ask-cat-' + itemId"
      >
        <div
          @keydown.capture="selectEsc.onKeydownCapture"
          @keydown="selectEsc.onKeydown"
        >
          <a-select
            :id="'ws-ask-cat-' + itemId"
            :value="category"
            :options="options"
            @change="(v) => emit('update:category', v)"
          />
        </div>
      </a-form-item>
      <a-form-item :extra="t('Kunden får det som et punkt i anmodningen og kan svare med tekst eller en fil.')">
        <a-space>
          <a-button @click="emit('cancel')">
            {{ t('Annullér') }}
          </a-button>
          <a-button
            type="primary"
            @click="emit('add')"
          >
            {{ t('Tilføj spørgsmålet') }}
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<style scoped>
/* Formularen står under rækken */
.ws-ask-form {
  margin-top: 8px;
}
</style>
