<script setup>
// Historik for et af kundens punkter (workspace.jsx: WSItemHistory, L2712–2801), foldet sammen:
// hvem gjorde hvad og hvornår, med filerne (en fil kan hentes, så længe den ligger på punktet; en
// fjernet fil står overstreget), spørgsmålene og kundens svar. Vises kun med mindst 2 rækker.
// Rækkerne bygges af wsItemHistoryModel i src/domain/workspace/items.js. Dato med klokkeslæt i
// et tooltip (før: title).
//
// Props: itemId. Emits: ingen.
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsDay } from '@/domain/workspace/format'
import { wsItemHistoryModel } from '@/domain/workspace/items'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'

const props = defineProps({
  itemId: { type: String, required: true },
})

const caseVersion = useCaseVersion()
const h = computed(() => {
  caseVersion.value
  return wsItemHistoryModel(props.itemId)
})
// Godkendt er grøn, et spørgsmål blåt (som statusikonet), resten gråt
const TONE = { ok: 'green', q: 'blue' }
// Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter)
const onFoldKeydown = useCollapseKeyboard()
</script>

<template>
  <div
    v-if="h"
    @keydown="onFoldKeydown"
  >
    <a-collapse
      ghost
      :expand-icon="collapseExpandIcon"
    >
      <a-collapse-panel key="history">
        <!-- Én span: overskriften er et flex-element, så mellemrummet mellem tekst og tal ellers forsvinder -->
        <template #header>
          <span>{{ t('Historik') + ' ' }}<a-typography-text type="secondary">({{ h.rows.length }})</a-typography-text></span>
        </template>
        <a-timeline :aria-label="t('Historik')">
          <a-timeline-item
            v-for="r in h.rows"
            :key="r.id"
            :color="TONE[r.tone] || 'gray'"
          >
            <a-tooltip :title="CW.fmtWhen(r.at)">
              <a-typography-text type="secondary">
                {{ wsDay(r.at) }}
              </a-typography-text>
            </a-tooltip>
            {{ ' ' }}
            <a-typography-text
              :strong="r.tone === 'ok'"
              :type="r.tone === 'gone' ? 'secondary' : undefined"
            >
              {{ r.label }}{{ r.names.length || r.quote ? ':' : '' }}
            </a-typography-text>
            <template
              v-for="(n, i) in r.names"
              :key="i"
            >
              {{ i > 0 ? ', ' : ' ' }}
              <a-typography-link
                v-if="h.fileUrl(n, r.tone === 'gone')"
                :href="h.fileUrl(n, r.tone === 'gone')"
                :download="n"
              >
                {{ n }}
              </a-typography-link>
              <a-typography-text
                v-else
                :delete="r.tone === 'gone'"
                :type="r.tone === 'gone' ? 'secondary' : undefined"
              >
                {{ n }}
              </a-typography-text>
            </template>
            <template v-if="r.quote">
              {{ ' ' }}
              <a-typography-text type="secondary">
                "{{ r.quote }}"
              </a-typography-text>
            </template>
          </a-timeline-item>
        </a-timeline>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>
