<script setup>
// Afslået sag (new_case_portal.jsx: PortalClosed, L1319–1332): en rolig side uden upload. Kunden får ikke
// afslagets årsag her; den kommer fra rådgiveren. Har kunden givet adgang til regnskabssystemet, står
// forbindelsen (PortalConsentBox).
// Props: ingen.
import { t } from '@/i18n'
import { PORTAL_CONTACT, ncFill } from '@/domain/new_case_portal'
import PortalConsentBox from './components/PortalConsentBox.vue'
import PortalContactLine from './components/PortalContactLine.vue'
</script>

<template>
  <div class="portal-calm">
    <a-typography-title>{{ t('Sagen er afsluttet') }}</a-typography-title>
    <a-typography-paragraph type="secondary">
      {{ ncFill(t('Kontakt {name}, hvis I har spørgsmål. I skal ikke sende mere materiale.'), { name: PORTAL_CONTACT.name }) }}
    </a-typography-paragraph>
    <PortalConsentBox />
    <PortalContactLine class="portal-calm-contact" />
  </div>
</template>

<style scoped>
/* Sidens spalte, som før */
.portal-calm {
  max-width: 560px;
  margin: 0 auto;
}

.portal-calm-contact {
  margin-top: 16px;
}
</style>
