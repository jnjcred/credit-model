<script setup>
// Hvilken AI er forbundet, og kan den søge på nettet? "Skift AI"/"Forbind AI" åbner AI-indstillingerne.
// Ingen props eller emits.
import { computed, ref } from 'vue'
import { AI } from '@/domain/ai'
import { t } from '@/i18n'
import { useAiStatus } from '@/components/ai/useAiStatus'
import AiSettingsDialog from '@/components/ai/AiSettingsDialog.vue'

const open = ref(false)
const ai = useAiStatus() // 'cw-ai-config-changed' (og 'storage'), som "Kør kladden" nedenfor
const tick = ref(0)

const status = computed(() => {
  ai.value; tick.value
  const A = AI
  const ready = !!(A && A.isReady && A.isReady())
  const cfg = A && A.getConfig ? A.getConfig() : null
  const prov = ready && A.provider ? A.provider() : null
  const engine = cfg && cfg.provider === 'local' ? ((cfg.models && cfg.models.local) === 'codex' ? 'Codex CLI' : 'Claude Code') : null
  const search = ready && A.canSearch && A.canSearch()
  return {
    ready,
    text: ready ? (prov ? prov.label : 'AI') + (engine ? ' (' + engine + ')' : '') + ' · ' + (search ? t('kan søge på nettet') : t('søger ikke på nettet')) : t('Ingen AI forbundet'),
  }
})

// Dialogen kan have undersøgt den lokale bro igen; tegn status forfra, når den lukker
function onClose () {
  open.value = false
  tick.value++
}
</script>

<template>
  <a-space>
    <a-badge
      :status="status.ready ? 'success' : 'default'"
      :text="status.text"
    />
    <a-button
      size="small"
      @click="open = true"
    >
      {{ status.ready ? t('Skift AI') : t('Forbind AI') }}
    </a-button>
  </a-space>
  <AiSettingsDialog
    :open="open"
    @close="onClose"
  />
</template>
