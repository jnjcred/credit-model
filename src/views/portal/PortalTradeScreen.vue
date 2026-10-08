<script setup>
// Punktet Salg fordelt på lande i kundens portal (new_case_portal.jsx: PortalTradeScreen, L2227–2247):
// samme skema som før (TradeForm). Et spørgsmål fra rådgiveren står øverst med sin egen "Send svar";
// et svar, der er skrevet dér, sendes også med, hvis kunden gemmer skemaet. "Har vi ikke / ikke
// relevant" skjuler skemaet (én primærknap).
//
// Props: item (punktet).
// Emits: back (tilbage til oversigten), done (svaret eller skemaet er sendt).
import { ref } from 'vue'
import { CW } from '@/domain/case_state'
import { useCase } from '@/composables/useCaseVersion'
import PortalBackNav from './components/PortalBackNav.vue'
import PortalItemHead from './components/PortalItemHead.vue'
import PortalNotedToggle from './components/PortalNotedToggle.vue'
import TradeForm from '@/views/customer/TradeForm.vue'

const props = defineProps({
  item: { type: Object, required: true },
})
const emit = defineEmits(['back', 'done'])

const s = useCase(() => CW.itemState(props.item.id))
const notedOpen = ref(false)
const answer = ref('')
</script>

<template>
  <div class="portal-item">
    <PortalBackNav @back="emit('back')" />
    <PortalItemHead
      v-model:answer="answer"
      :item="item"
      own-button
      @answered="emit('done')"
    />
    <PortalNotedToggle
      v-if="notedOpen"
      :item="item"
      open
      @update:open="(v) => { notedOpen = v }"
      @done="emit('done')"
    />
    <TradeForm
      v-else
      :item-id="item.id"
      id-prefix="cwp"
      :answer="answer.trim()"
      @done="emit('done')"
    />
    <template v-if="!notedOpen && (!s || s.status === 'rejected')">
      <a-divider />
      <PortalNotedToggle
        :item="item"
        :open="false"
        @update:open="(v) => { notedOpen = v }"
        @done="emit('done')"
      />
    </template>
  </div>
</template>

<style scoped>
/* Punktets spalte, som før */
.portal-item {
  max-width: 640px;
  margin: 0 auto;
}
</style>
