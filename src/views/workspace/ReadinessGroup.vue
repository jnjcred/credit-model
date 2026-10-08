<script setup>
// En gruppe i indstillingen (WSCheckGroup i workspace.jsx L3365–3377): et kort med overskrift,
// antal i parentes og gruppens rækker. Uden rækker vises gruppen ikke.
//
// Props: id (overskriftens id; afsnittet er navngivet efter den), title, count (antal; null: intet
//        antal), rows (rækkerne fra klarhedstjekket), caseId.
// Emits: run-action(a): en rækkes handling (se ReadinessRow).
// Slot row ({ row }): en række med mere end titel og tekst (begrundelsesfeltet, betingelserne).
//        Uden slot står hver række som ReadinessRow.
import ReadinessRow from './ReadinessRow.vue'

defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  count: { type: Number, default: null },
  rows: { type: Array, required: true },
  caseId: { type: Number, required: true },
})
const emit = defineEmits(['run-action'])
</script>

<template>
  <section
    v-if="rows.length > 0"
    :aria-labelledby="id"
  >
    <a-card size="small">
      <template #title>
        <span
          :id="id"
          role="heading"
          aria-level="3"
        >{{ title }}<a-typography-text
          v-if="count != null"
          type="secondary"
        > ({{ count }})</a-typography-text></span>
      </template>
      <a-list
        :data-source="rows"
        row-key="id"
      >
        <template #renderItem="{ item }">
          <slot
            name="row"
            :row="item"
          >
            <ReadinessRow
              :r="item"
              :case-id="caseId"
              @run-action="(a) => emit('run-action', a)"
            />
          </slot>
        </template>
      </a-list>
    </a-card>
  </section>
</template>
