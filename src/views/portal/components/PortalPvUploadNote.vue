<script setup>
// Kun på Kundeside (new_case_portal.jsx: PortalPvUploadNote, L1879–1888): rådgiveren uploader på kundens
// vegne. Kunden ser den ikke. Står over filfeltet på punktets side.
// Props: ingen. CW.isPreview() læses ved hver ændring af sagen; portalen melder rolleskift som en ændring.
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { useCase } from '@/composables/useCaseVersion'

const preview = useCase(() => CW.isPreview())
</script>

<template>
  <a-alert
    v-if="preview"
    class="portal-pv-upnote"
    type="info"
    role="note"
    :message="t('Du uploader på kundens vegne. Filen står som uploadet af dig, og punktet går til gennemgang.')"
  />
</template>

<style scoped>
.portal-pv-upnote {
  margin-bottom: 12px;
}
</style>
