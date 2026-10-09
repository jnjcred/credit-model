<script setup>
// Tilbage-knappen øverst på portalens undersider (PortalBackNav, new_case_portal.jsx L1285–1292).
// Knappen ligger i en <nav>, så skærmlæsere finder vejen rundt. Bruges af PortalUpload,
// PortalConnect, PortalTradeScreen, PortalStatus og opstartens PortalErpSetup (med label).
//
// Props: label (valgfri; uden den står der "Tilbage til oversigten").
// Emits: back.
//
// Knappen har ingen fast størrelse: den følger portalens a-config-provider, så den er stor på
// telefoner (berøringsmål, som prototypens 44 px) og almindelig ellers. Afstanden til indholdet
// nedenunder hører til komponenten (som i prototypen); kaldet skal ikke lægge mere til.
// De gamle tests klikker knappen som '.cwp-main nav button' eller på teksten, og oversigten har
// ingen <nav> i indholdet: læg ikke andre <nav> ind i portalens indhold.
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'

defineProps({
  label: { type: String, default: '' },
})
defineEmits(['back'])
</script>

<template>
  <nav
    class="portal-back-nav"
    :aria-label="t('Navigation i portalen')"
  >
    <a-button
      class="cw-link"
      type="link"
      @click="$emit('back')"
    >
      <template #icon>
        <ArrowLeftOutlined aria-hidden="true" />
      </template>
      {{ label || t('Tilbage til oversigten') }}
    </a-button>
  </nav>
</template>

<style scoped>
.portal-back-nav {
  margin-bottom: 16px;
}
</style>
