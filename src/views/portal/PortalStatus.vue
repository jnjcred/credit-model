<script setup>
// Statussiden i kundens portal (new_case_portal.jsx: PortalStatus, L2249–2277): kun kvitteringen og
// tidslinjen (CustomerTimeline); punkterne står på oversigten. Kommer kunden hertil fra "Vi er færdige",
// læses kvitteringen op (role="status").
// Props: justSubmitted (kunden har lige sagt, at de er færdige).
// Emits: back (tilbage til oversigten).
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csAddWorkdays } from '@/domain/customer'
import { PORTAL_CONTACT, ncFill, portalRecipient } from '@/domain/new_case_portal'
import { useCaseVersion } from '@/composables/useCaseVersion'
import PortalBackNav from './components/PortalBackNav.vue'
import CustomerTimeline from '@/views/customer/CustomerTimeline.vue'

const props = defineProps({
  justSubmitted: { type: Boolean, default: false },
})
const emit = defineEmits(['back'])

const version = useCaseVersion()
const adv = PORTAL_CONTACT.first
const text = computed(() => {
  version.value
  const rcp = portalRecipient()
  const cs = CW.caseState() || {}
  const prog = CW.progress()
  const req = CW.request()
  const lock = CW.customerLock()
  const at = cs.customerSubmittedAt
  const back = at ? CW.fmtDate(csAddWorkdays(new Date(at), 2)) : ''
  const title = lock ? t('Materialet er hos kreditkomitéen')
    : at ? ncFill(t('{adv} ved nu, at I er færdige'), { adv })
    : t('Status for jeres ansøgning')
  const lead = lock ? ncFill(t('{adv} har sendt jeres ansøgning videre. I hører fra EIFO, når der er en afgørelse.'), { adv })
    : at ? (props.justSubmitted
      ? ncFill(t('Hun vender tilbage senest {date}.'), { date: back }) + (rcp.email ? ' ' + ncFill(t('I får en kvittering på {email}.'), { email: rcp.email }) : '')
      : ncFill(t('I sagde {date}, at I var færdige. {adv} gennemgår materialet og vender tilbage senest {date2}.'), { date: CW.fmtDate(at), adv, date2: back }))
    : req && prog.requiredMissing > 0 ? ncFill(t('I mangler {n} af {m} påkrævede punkter. Se dem på oversigten.'), { n: prog.requiredMissing, m: prog.required })
    : ncFill(t('{navn} gennemgår det, I har sendt.'), { navn: adv })
  return { title, lead }
})
</script>

<template>
  <div class="portal-status">
    <PortalBackNav @back="emit('back')" />
    <a-typography-title>{{ text.title }}</a-typography-title>
    <a-typography-paragraph
      type="secondary"
      :role="justSubmitted ? 'status' : undefined"
    >
      {{ text.lead }}
    </a-typography-paragraph>
    <CustomerTimeline />
  </div>
</template>

<style scoped>
/* Statussidens spalte, som før */
.portal-status {
  max-width: 760px;
  margin: 0 auto;
}
</style>
