<script setup>
// Hjælp: sagens faser, frister og hvad knapperne gør (til oplæring af nye rådgivere).
import { computed, ref } from 'vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { HELP_DEADLINES, helpButtons, helpStages } from '@/domain/shell_content'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'

const open = ref(false)
const onFoldKeydown = useCollapseKeyboard()

// Fasernes navne kommer fra sagsmodellen, så de er de samme som i sagshovedet
const sections = computed(() => {
  const stages = helpStages().map(([k, txt], i) => [(i + 1) + '. ' + t(DATA.STATUS[k].label), txt])
  return [
    { key: 'cw-help-stages', label: t('Sagens faser'), items: stages },
    { key: 'cw-help-deadlines', label: t('Frister og SLA'), items: HELP_DEADLINES },
    { key: 'cw-help-buttons', label: t('Hvad knapperne gør'), items: helpButtons() },
  ]
})
</script>

<template>
  <a-button
    type="text"
    :title="t('Hjælp')"
    :aria-label="t('Hjælp')"
    aria-haspopup="dialog"
    @click="open = true"
  >
    <template #icon>
      <QuestionCircleOutlined aria-hidden="true" />
    </template>
  </a-button>
  <a-modal
    v-model:visible="open"
    :wrap-props="{ 'aria-modal': 'true' }"
    :title="t('Sådan arbejder du med en sag')"
    :width="620"
    :footer="null"
  >
    <a-typography-paragraph type="secondary">
      {{ t('Demoen gemmer alt i browseren, også ved genindlæsning og sprogskift. Kun Nordhavn Composite (sag 2026-0184) er udfyldt med data.') }}
    </a-typography-paragraph>
    <!-- Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter) -->
    <div @keydown="onFoldKeydown">
      <a-collapse
        ghost
        :expand-icon="collapseExpandIcon"
      >
        <a-collapse-panel
          v-for="s in sections"
          :id="s.key"
          :key="s.key"
          :header="s.label + ' (' + s.items.length + ')'"
        >
          <a-list
            size="small"
            :data-source="s.items"
            :row-key="(item) => item[0]"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta
                  :title="t(item[0])"
                  :description="t(item[1])"
                />
              </a-list-item>
            </template>
          </a-list>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </a-modal>
</template>
