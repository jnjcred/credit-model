<script setup>
// Kundens punkter som liste (workspace.jsx: WSItemList, L2364–2376). Streg kun, hvor punkterne
// skifter sted (fx mellem godkendt og ikke længere påkrævet), og låst, når sagen er låst, eller
// punktet ikke længere er påkrævet og ikke venter på gennemgang (wsItemListRows i
// src/domain/workspace/items.js). Listen får sit navn fra gruppens overskrift (labelledBy).
//
// Props: entries (wsCustomerList()-rækker), locked, labelledBy (id på overskriften).
// React-proppen recipient blev ikke brugt. Emits: remind (et punkts Påmind).
import { computed } from 'vue'
import { CW } from '@/domain/case_state'
import { wsItemListRows } from '@/domain/workspace/items'
import { useCaseVersion } from '@/composables/useCaseVersion'
import CustomerItemRow from './CustomerItemRow.vue'

const props = defineProps({
  entries: { type: Array, required: true },
  locked: { type: Boolean, default: false },
  labelledBy: { type: String, default: undefined },
})
const emit = defineEmits(['remind'])

const caseVersion = useCaseVersion()
const rows = computed(() => wsItemListRows(props.entries, props.locked))
const request = computed(() => {
  caseVersion.value
  return CW.request()
})
</script>

<template>
  <a-list
    :data-source="rows"
    :split="false"
    :row-key="(r) => r.e.it.id"
    :role="labelledBy ? 'group' : undefined"
    :aria-labelledby="labelledBy"
  >
    <template #renderItem="{ item: r }">
      <CustomerItemRow
        :it="r.e.it"
        :s="r.e.s"
        :locked="r.locked"
        :dropped="r.e.dropped"
        :request="request"
        :group-start="r.groupStart"
        @remind="emit('remind')"
      />
    </template>
  </a-list>
</template>
