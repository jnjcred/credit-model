<script setup>
// "Jeres kontakt" nederst på kundens oversigt (new_case_portal.jsx: PortalContactCard, L1580–1599):
// rådgiveren med initialer, titel, telefon, mail og svartid. Oplysningerne er PORTAL_CONTACT.
// Props: ingen.
import { t } from '@/i18n'
import { PORTAL_CONTACT, ncFill } from '@/domain/new_case_portal'

const c = PORTAL_CONTACT
const telHref = 'tel:' + c.phone.replace(/\s/g, '')
</script>

<template>
  <a-card
    class="cwp-contact"
    role="region"
    aria-labelledby="cwp-contact-h"
  >
    <template #title>
      <span
        id="cwp-contact-h"
        role="heading"
        aria-level="2"
      >{{ t('Jeres kontakt') }}</span>
    </template>
    <a-card-meta>
      <template #avatar>
        <a-avatar
          :size="36"
          aria-hidden="true"
        >
          {{ c.initials }}
        </a-avatar>
      </template>
      <template #title>
        {{ c.name }} <a-typography-text type="secondary">
          · {{ t(c.title) }}, {{ c.org }}
        </a-typography-text>
      </template>
      <template #description>
        <div>
          <a-typography-link :href="telHref">
            {{ c.phone }}
          </a-typography-link>
        </div>
        <div>
          <a-typography-link :href="'mailto:' + c.email">
            {{ c.email }}
          </a-typography-link>
        </div>
        <div>{{ ncFill(t('{navn} svarer typisk inden for 1 arbejdsdag'), { navn: c.first }) }}</div>
      </template>
    </a-card-meta>
  </a-card>
</template>
