<script setup>
// Forbind regnskabssystemet uden for opstarten (portal_onboarding.jsx: PortalErpSetup), fra punktet
// Periodetal eller oversigten: samme fliser og liste som under punktet Periodetal (ErpConnectPicker.vue). Er der allerede forbundet, når siden åbner, går den straks tilbage.
//
// Props: backLabel (teksten på tilbage-knappen; uden den "Tilbage til oversigten").
// Emits: back (tilbage, eller der er allerede forbundet), done (tallene er hentet).
import { onMounted } from 'vue'
import { CW } from '@/domain/case_state'
import PortalBackNav from '@/views/portal/components/PortalBackNav.vue'
import ErpConnectPicker from './ErpConnectPicker.vue'

defineProps({
  backLabel: { type: String, default: '' },
})
const emit = defineEmits(['back', 'done'])

onMounted(() => { if (CW.consent()) emit('back') })
</script>

<template>
  <div class="erp-setup">
    <PortalBackNav
      :label="backLabel"
      @back="emit('back')"
    />
    <ErpConnectPicker @finished="emit('done')" />
  </div>
</template>

<style scoped>
/* Kortets spalte, som før */
.erp-setup {
  max-width: 560px;
  margin: 0 auto;
}
</style>
