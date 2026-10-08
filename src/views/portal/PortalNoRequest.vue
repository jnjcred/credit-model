<script setup>
// Ingen aktiv anmodning endnu (new_case_portal.jsx: PortalNoRequest, L1305–1317): kunden får en mail med
// et link, når rådgiveren beder om materiale. Indtil da skal kunden ikke gøre noget.
// Props: ingen.
import { t } from '@/i18n'
import { PORTAL_CONTACT, ncFill } from '@/domain/new_case_portal'
import PortalContactLine from './components/PortalContactLine.vue'
</script>

<template>
  <div class="portal-calm">
    <a-typography-title>{{ t('Der er ingen aktiv anmodning endnu') }}</a-typography-title>
    <a-typography-paragraph type="secondary">
      {{ ncFill(t('Når {name} fra EIFO beder om materiale til jeres ansøgning, får I en mail med et link hertil. Indtil da skal I ikke gøre noget.'), { name: PORTAL_CONTACT.name }) }}
    </a-typography-paragraph>
    <PortalContactLine />
  </div>
</template>

<style scoped>
/* Sidens spalte, som før */
.portal-calm {
  max-width: 560px;
  margin: 0 auto;
}
</style>
