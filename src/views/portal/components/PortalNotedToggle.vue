<script setup>
// "Har vi ikke / ikke relevant" (new_case_portal.jsx: PortalNotedToggle, L2025–2034): lukket en knap,
// åben formularen NotedForm (samme formular som før). Når den er åben, skjuler punktets side sin egen
// upload og "Færdig", så der kun er én primærknap.
// Props: item (punktet), open (formularen er åben).
// Emits: update:open (knappen åbner, Annullér lukker), done (formularen er sendt).
// Knappen bærer data-cust-act="send": forhåndsvisningens spærre stopper klikket.
import { t } from '@/i18n'
import NotedForm from '@/views/customer/NotedForm.vue'

defineProps({
  item: { type: Object, required: true },
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open', 'done'])
</script>

<template>
  <NotedForm
    v-if="open"
    :item-id="item.id"
    id-prefix="cwp"
    @done="emit('done')"
    @cancel="emit('update:open', false)"
  />
  <a-button
    v-else
    data-cust-act="send"
    :aria-expanded="false"
    @click="emit('update:open', true)"
  >
    {{ t('Har vi ikke / ikke relevant') }}
  </a-button>
</template>
