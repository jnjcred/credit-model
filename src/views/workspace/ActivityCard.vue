<script setup>
// Seneste aktivitet på Overblik (workspace.jsx: WSActivity, L1396–1423): de 5 seneste hændelser,
// eller op til 30 med "Vis alle". Beskeder står i Dialog med kunden, og faseskift står i trinene.
// Hver linje: teksten og "navn · dato"; klokkeslættet står i et tooltip (før: title).
//
// Props: ingen. Emits: ingen.
import { computed, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsDay } from '@/domain/workspace/format'
import { wsActivity, wsActivityText } from '@/domain/workspace/items'
import { useCaseVersion } from '@/composables/useCaseVersion'

const caseVersion = useCaseVersion()
const all = ref(false)
const a = computed(() => {
  caseVersion.value
  return wsActivity(all.value)
})
</script>

<template>
  <section aria-labelledby="ws-activity-title">
    <a-card :bordered="false">
      <template #title>
        <a-space :size="8">
          <span
            id="ws-activity-title"
            role="heading"
            aria-level="2"
          >{{ t('Seneste aktivitet') }}</span>
        </a-space>
      </template>
      <template
        v-if="a.list.length > 5"
        #extra
      >
        <a-button
          class="cw-link"
          type="link"
          size="small"
          :aria-expanded="all"
          @click="all = !all"
        >
          {{ a.toggleLabel }}
        </a-button>
      </template>
      <a-typography-text
        v-if="a.list.length === 0"
        type="secondary"
      >
        {{ t('Intet endnu.') }}
      </a-typography-text>
      <a-list
        v-else
        :data-source="a.shown"
        :row-key="(e) => e.id"
      >
        <template #renderItem="{ item: e }">
          <a-list-item>
            <div>
              <div>{{ wsActivityText(e) }}</div>
              <a-tooltip :title="CW.fmtWhen(e.at)">
                <a-typography-text type="secondary">
                  {{ a.who(e) }} - {{ wsDay(e.at) }}
                </a-typography-text>
              </a-tooltip>
            </div>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </section>
</template>
