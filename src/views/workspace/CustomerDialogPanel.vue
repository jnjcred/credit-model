<script setup>
// Dialog med kunden på Overblik (workspace.jsx: CustomerDialog, L3076–3082): samme samtale som
// kundens side (views/customer/CustomerConversation.vue), set fra rådgiveren. idPrefix "ws" giver
// afsnittet id'et ws-dialog og overskriften ws-dialog-h. Klokken og Dataanmodninger peger på
// ws-dialog-title, som ikke findes (også før migrationen; bevaret).
//
// Props: ingen (React-proppen note blev aldrig sat). Emits: ingen.
import CustomerConversation from '@/views/customer/CustomerConversation.vue'
</script>

<template>
  <CustomerConversation
    side="rådgiver"
    id-prefix="ws"
    variant="workspace"
  />
</template>
