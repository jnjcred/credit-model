<script setup>
// Kun på Kundeside (rådgiverens forhåndsvisning): hvor kunden er i opstarten, øverst på oversigten
// (new_case_portal.jsx: PortalPvObStatus, L1446–1487), indtil opstarten er gjort. Rådgiveren kan se,
// hvad kunden ser (Kundeflow på kundens trin), og sende invitationen igen (en påmindelse i sagens
// historik). Intet, når opstarten er gjort, eller kunden har en ældre gemt tilstand.
//
// Props: onOpenFlow (funktion; uden den vises "Se hvad kunden ser" ikke, som før).
// Ikke porteret: steps og n (beregnet, men aldrig vist).
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { PORTAL_CONTACT, ncFill, portalMem, pvDaysAgo } from '@/domain/new_case_portal'
import { obLabel } from '@/domain/onboarding'
import { useCaseVersion } from '@/composables/useCaseVersion'

const props = defineProps({
  onOpenFlow: { type: Function, default: null },
  // Kundeflow: boksen står på Oversigt, når kunden endnu ikke er nået dertil
  flow: { type: Boolean, default: false },
})
// request: "Anmod om materiale", når anmodningen ikke er sendt endnu (rådgiveren lukker siden og vælger materiale)
const emit = defineEmits(['request'])

const version = useCaseVersion()
// Anmodningen er ikke sendt endnu: siden er kun et eksempel, og rådgiveren opfordres til at anmode om materiale
const noReq = computed(() => { version.value; return !CW.request() })
const st = computed(() => {
  version.value
  const ob = CW.onboarding()
  const legacy = !ob.account && !!portalMem().accepted
  const current = !ob.account ? 'account' : CW.onboardingStep(ob)
  if (legacy || !current) return null
  const req = CW.request()
  const to = (req && req.to) || {}
  const last = CW.lastReminder()
  const lastAt = (last && last.at) || (req && req.sentAt)
  // Har kunden en bruger, mangler kun oplysningerne på trinnet Bruger
  const step = !ob.account ? t('Opret bruger') : obLabel(current)
  return { ob, current, req, to, lastAt, step }
})

function resend () {
  CW.remind([], { by: PORTAL_CONTACT.name })
  const to = st.value.to
  CW.toast(ncFill(t('Invitationen er sendt igen til {to}'), { to: to.email || to.name || t('kunden') }))
}
</script>

<template>
  <a-alert
    v-if="noReq"
    class="cwp-pvob"
    type="warning"
    show-icon
    role="region"
    aria-labelledby="cwp-pvob-h"
  >
    <template #message>
      <span
        id="cwp-pvob-h"
        role="heading"
        aria-level="2"
      >{{ t('Du har ikke anmodet om materiale endnu') }}</span>
    </template>
    <template #description>
      <div>{{ t('Kunden ser først denne siden, når du har anmodet om materiale.') }}</div>
      <a-space class="cwp-pvob-acts">
        <a-button
          type="primary"
          @click="emit('request')"
        >
          {{ t('Anmod om materiale') }}
        </a-button>
      </a-space>
    </template>
  </a-alert>
  <a-alert
    v-else-if="st"
    class="cwp-pvob"
    type="warning"
    show-icon
    role="region"
    aria-labelledby="cwp-pvob-h"
  >
    <template #message>
      <span
        id="cwp-pvob-h"
        role="heading"
        aria-level="2"
      >{{ props.flow ? t('Kunden har ikke set denne side endnu') : !st.ob.account ? t('Kunden er ikke startet endnu') : t('Kunden er i gang med opstarten') }}</span>
    </template>
    <template #description>
      <div>{{ ncFill(t('Står ved {step}'), { step: st.step.charAt(0).toLowerCase() + st.step.slice(1) }) }}</div>
      <a-space
        wrap
        class="cwp-pvob-acts"
      >
        <!-- Kundeflow på det trin, kunden står på: det, kunden ser lige nu -->
        <a-button
          v-if="onOpenFlow && !props.flow"
          class="cw-link"
          type="link"
          @click="props.onOpenFlow(st.current)"
        >
          {{ t('Se hvad kunden ser') }}
        </a-button>
        <a-tooltip
          v-if="st.req"
          :title="st.lastAt ? ncFill(t('Sidst sendt {when}'), { when: pvDaysAgo(st.lastAt) }) : undefined"
        >
          <a-button @click="resend">
            {{ t('Send invitation igen') }}
          </a-button>
        </a-tooltip>
      </a-space>
    </template>
  </a-alert>
</template>

<style scoped>
/* Over oversigten i samme spalte */
.cwp-pvob {
  max-width: 760px;
  margin: 0 auto 16px;
}

.cwp-pvob-acts {
  margin-top: 8px;
}
</style>
