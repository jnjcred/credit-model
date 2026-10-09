<script setup>
// En række i indstillingen (WSCheckRow i workspace.jsx L3336–3363): titel, én grå linje med
// kildelinket, eventuelle dybdelinks (f.eks. tal, der ikke findes i kilden) og til højre rækkens
// handling ("Åbn memo", "Gå til udestående", "Åbn afsnit 2" ...). Gruppens overskrift siger, om
// punktet blokerer, kræver en begrundelse eller er til orientering.
//
// Props: r (rækken fra klarhedstjekket, wsReadiness: { id, title, text, source, links, action }),
//        caseId (sagen; kildelinket fører tilbage til Indstilling).
// Emits: run-action(a): rækkens handling ({ memo } | { tab } | { focus }); siden kører den.
// Slot (default): det, der står under teksten (begrundelsesfeltet, foldet med betingelserne).
import { computed } from 'vue'
import { t } from '@/i18n'
import SourceLink from './shared/SourceLink.vue'

const props = defineProps({
  r: { type: Object, required: true },
  caseId: { type: Number, required: true },
})
const emit = defineEmits(['run-action'])

const back = computed(() => ({ route: 'workspace:' + props.caseId + ':indstil', label: t('Tilbage til indstillingen') }))
</script>

<template>
  <a-list-item>
    <a-row
      class="ws-check-row"
      :wrap="false"
      :gutter="12"
      align="top"
    >
      <a-col
        flex="auto"
        class="ws-check-main"
      >
        <div>
          <a-typography-text strong>
            {{ r.title }}
          </a-typography-text>
        </div>
        <div v-if="r.text || r.source">
          <a-typography-text type="secondary">
            {{ r.text }}
          </a-typography-text>
          <template v-if="r.source">
            {{ ' ' }}<SourceLink
              :source="r.source"
              :case-id="caseId"
              :back="back"
            />
          </template>
        </div>
        <a-list
          v-if="r.links && r.links.length > 0"
          size="small"
          :data-source="r.links"
          row-key="key"
        >
          <template #renderItem="{ item: l }">
            <a-list-item>
              <a-typography-text type="secondary">
                {{ l.text }}
              </a-typography-text>
              <template
                v-if="l.memo"
                #actions
              >
                <a-button
                  class="cw-link"
                  type="link"
                  size="small"
                  :aria-label="l.aria"
                  @click="emit('run-action', { memo: l.memo })"
                >
                  {{ l.label }}
                </a-button>
              </template>
            </a-list-item>
          </template>
        </a-list>
        <slot />
      </a-col>
      <a-col
        v-if="r.action"
        flex="none"
      >
        <a-button
          class="cw-link"
          type="link"
          size="small"
          :aria-label="r.action.aria || undefined"
          @click="emit('run-action', r.action)"
        >
          {{ r.action.label }}
        </a-button>
      </a-col>
    </a-row>
  </a-list-item>
</template>

<style scoped>
/* Rækken fylder listens bredde; handlingen står øverst til højre, også ved et højt felt */
.ws-check-row {
  flex: 1;
  min-width: 0;
}

.ws-check-main {
  min-width: 0;
}
</style>
