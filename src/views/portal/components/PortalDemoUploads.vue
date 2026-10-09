<script setup>
// Demo i kundens portal (new_case_portal.jsx: PortalDemoUploads, L656–704): rådgiveren spiller kunden og
// sender sagens demofil til ét punkt ad gangen (samme filer som "Udfyld alt (demo)"). Står kun i
// demobjælken nederst. Filnavnet vises, før der klikkes.
// Props: requested (punkterne i anmodningen).
//
// Et a-popover med indhold: fokus flytter ind i panelet, når det åbner, og Esc lukker og giver fokus
// tilbage til knappen (#cwp-demo-items-btn), som før. Et klik uden for panelet lukker det.
import { computed, nextTick, ref, watch } from 'vue'
import { CheckOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { demoFileName, ncFill, portalDemoUploadOne, portalStatus } from '@/domain/new_case_portal'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { usePopoverTabOut } from '@/composables/usePopoverTabOut'

const props = defineProps({
  requested: { type: Array, required: true },
})

const version = useCaseVersion()
const open = ref(false)
const panel = ref(null)

// Filnavnet vises, før der klikkes (navnet uden at bygge filen)
const fileLabel = (it) => {
  if (it.form === 'countries') return t('Landefordeling udfyldes')
  return (CW.demoUploadName && CW.demoUploadName(it.id)) || demoFileName(it)
}
const doneLabel = { received: t('Sendt'), noted: t('Sendt'), approved: t('Godkendt'), delegated: t('Sendt videre') }
const rows = computed(() => {
  version.value
  return props.requested.map(it => {
    const st = portalStatus(it.id)
    return { it, st, done: doneLabel[st], file: fileLabel(it) }
  })
})

// Fokus til panelets første knap, når det åbner (indholdet tegnes først, når det vises)
watch(open, (on) => {
  if (!on) return
  let n = 0
  const tick = () => {
    // Panelet findes allerede (skjult), når det åbnes igen: der prøves igen, til fokus faktisk er flyttet
    const first = panel.value && panel.value.querySelector('button')
    if (first) first.focus()
    if (first && document.activeElement === first) return
    if (++n < 20) setTimeout(tick, 30)
  }
  nextTick(tick)
})
useWindowEvent('keydown', (e) => {
  if (e.key === 'Escape' && open.value) { open.value = false; CW.focusSoon('#cwp-demo-items-btn') }
})
// Tab fra panelets sidste knap fortsætter efter knappen (f.eks. Udfyld alt), som før
const onPanelKeydown = usePopoverTabOut({
  panel: () => panel.value,
  trigger: () => document.getElementById('cwp-demo-items-btn'),
  close: () => { open.value = false },
})
</script>

<template>
  <a-popover
    v-model:visible="open"
    trigger="click"
    placement="topRight"
  >
    <template #content>
      <div
        id="cwp-demo-panel"
        ref="panel"
        class="portal-demo-panel"
        role="group"
        :aria-label="t('Upload demofil pr. punkt')"
        @keydown="onPanelKeydown"
      >
        <a-typography-text type="secondary">
          {{ t('Demo: send sagens fil til ét punkt ad gangen, som om kunden havde uploadet den.') }}
        </a-typography-text>
        <a-list
          size="small"
          :data-source="rows"
        >
          <template #renderItem="{ item: r }">
            <a-list-item>
              <div class="portal-demo-item">
                <div>{{ t(r.it.label) }}</div>
                <a-typography-text
                  type="secondary"
                  ellipsis
                  :content="r.file"
                  :title="r.file"
                />
              </div>
              <template #actions>
                <a-typography-text
                  v-if="r.done"
                  type="success"
                >
                  <CheckOutlined aria-hidden="true" /> {{ r.done }}
                </a-typography-text>
                <a-button
                  v-else
                  :aria-label="ncFill(t('Upload demofil til {item}'), { item: t(r.it.label) })"
                  @click="portalDemoUploadOne(r.it)"
                >
                  {{ r.st === 'rejected' ? t('Send igen') : t('Upload') }}
                </a-button>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </div>
    </template>
    <a-button
      id="cwp-demo-items-btn"
      type="text"
      class="cwp-demo-fill"
      :aria-expanded="open"
      aria-controls="cwp-demo-panel"
    >
      {{ t('Upload demofil pr. punkt') }}
    </a-button>
  </a-popover>
</template>

<style scoped>
/* Panelets bredde, som før (smallere på telefoner) */
.portal-demo-panel {
  width: 380px;
  max-width: calc(100vw - 36px);
  max-height: min(60vh, 520px);
  overflow: auto;
}

.portal-demo-item {
  flex: 1;
  min-width: 0;
}
</style>
