<script setup>
// Den ansvarlige for sagen (WSOwnerPicker i workspace.jsx L454–480): vælg, hvem sagen ligger hos.
// Listen er dig og alle ansvarlige på sagerne; den nuværende ansvarlige står først, hvis han ikke
// er på listen. Et skift giver beskeden "Sagen er flyttet til …". Initialerne står foran feltet.
// a-select kan betjenes med tastaturet (pil op/ned, Enter, Esc). Feltet er navngivet med en skjult
// etiket, fordi a-select ikke giver aria-label videre til feltet i 3.2.13.
//
// Props: caseData (sagen, wsCaseData). Emits: ingen (skiftet skrives med CW.setOwner).
import { computed } from 'vue'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { wsOwnerPicker } from '@/domain/workspace/header'
import { wsInitials } from '@/domain/workspace/format'

const props = defineProps({
  caseData: { type: Object, required: true },
})

const caseVersion = useCaseVersion()
const picker = computed(() => {
  caseVersion.value
  return wsOwnerPicker(props.caseData)
})
const options = computed(() => picker.value.items.map(it => ({ value: it.key, label: it.label, sub: it.sub })))

function onChange (name) {
  picker.value.setOwner(name)
}
</script>

<template>
  <span class="ws-owner">
    <label
      class="sr-only"
      for="ws-owner"
    >{{ picker.ariaLabel }}</label>
    <a-avatar
      size="small"
      aria-hidden="true"
    >
      {{ wsInitials(picker.owner) }}
    </a-avatar>
    <a-select
      id="ws-owner"
      :value="picker.owner"
      :options="options"
      :dropdown-match-select-width="false"
      @change="onChange"
    >
      <template #option="{ label, sub }">
        <a-space>
          <span>{{ label }}</span>
          <a-typography-text
            v-if="sub"
            type="secondary"
          >
            {{ sub }}
          </a-typography-text>
        </a-space>
      </template>
    </a-select>
  </span>
</template>

<style scoped>
.ws-owner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
