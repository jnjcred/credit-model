<script setup>
// Statusikonet på oversigtens rækker (new_case_portal.jsx: PortalHubRow L1767–1771 og de automatisk
// hentede årsrapporter L1658). Sendt, godkendt, bemærkning og hentet: blåt flueben (prototypens blå,
// CheckCircleTwoTone). Spørgsmål: det blå "!". Hos en hjælper: et ur. Mangler eller ikke sendt: en
// grå prik (antdv har intet tomt ring-ikon).
// Dekorativt: rækkens skjulte statusord siger det samme for skærmlæsere.
// Props: status ('pending' | 'received' | 'noted' | 'approved' | 'rejected' | 'delegated' | 'closed' | 'auto').
import { CheckCircleTwoTone, ClockCircleOutlined } from '@ant-design/icons-vue'
import PortalAskMark from './PortalAskMark.vue'

defineProps({
  status: { type: String, required: true },
})
</script>

<template>
  <span
    class="portal-status-icon"
    aria-hidden="true"
  >
    <CheckCircleTwoTone v-if="status === 'received' || status === 'approved' || status === 'noted' || status === 'auto'" />
    <PortalAskMark v-else-if="status === 'rejected'" />
    <a-typography-text
      v-else-if="status === 'delegated'"
      type="secondary"
    >
      <ClockCircleOutlined />
    </a-typography-text>
    <a-badge
      v-else
      status="default"
    />
  </span>
</template>

<style scoped>
/* Ikonerne står i samme spalte, så titlerne flugter */
.portal-status-icon {
  display: inline-flex;
  flex-shrink: 0;
  justify-content: center;
  width: 16px;
}
</style>
