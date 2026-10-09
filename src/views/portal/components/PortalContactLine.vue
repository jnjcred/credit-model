<script setup>
// Rådgiverens kontaktoplysninger som én grå linje (PortalContactLine, new_case_portal.jsx
// L1294–1303): navn, titel og organisation, telefon og mail. Oplysningerne er PORTAL_CONTACT
// (src/domain/new_case_portal.js). Bruges af PortalNoRequest, PortalClosed og opstartens trin Bruger.
//
// Props: ingen. Prototypens style-prop (kun afstand) er væk: kaldet giver afstanden med en klasse
// på komponenten (attributter lander på roden).
import { PORTAL_CONTACT } from '@/domain/new_case_portal'
import { t } from '@/i18n'

const telHref = 'tel:' + PORTAL_CONTACT.phone.replace(/\s/g, '')
</script>

<template>
  <div>
    <a-typography-text type="secondary">
      {{ PORTAL_CONTACT.name }}, {{ t(PORTAL_CONTACT.title) }}, {{ PORTAL_CONTACT.org }}
      -
      <a-typography-link
        class="portal-contact-nowrap"
        :href="telHref"
      >
        {{ PORTAL_CONTACT.phone }}
      </a-typography-link>
      -
      <a-typography-link
        class="portal-contact-nowrap"
        :href="'mailto:' + PORTAL_CONTACT.email"
      >
        {{ PORTAL_CONTACT.email }}
      </a-typography-link>
    </a-typography-text>
  </div>
</template>

<style scoped>
/* Telefonnummer og mail brydes ikke midt i (som i prototypen); linjen brydes ved " · " */
.portal-contact-nowrap {
  white-space: nowrap;
}
</style>
