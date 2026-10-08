<script setup>
// Opstarten i portalen (portal_onboarding.jsx: PortalOnboarding): vælger trinnet. Der er kun ét
// trin, 'account' (Bruger), fordi CW.ONBOARDING_STEPS = ['account']; datadelingen sker fra
// Periodetal og oversigten (ErpSetup.vue). Andre trin giver ingenting, som før.
//
// Props:
//   step     det trin, der vises ('account')
//   preview  rådgiverens forhåndsvisning (felterne er skrivebeskyttede, intet gemmes)
//   pre      før login: "Log ind eller opret bruger"
//   arrive   kendt bruger, der allerede har virksomheden: "tjekker" og videre (1,5 s)
//   demo     et stadie, rådgiveren ser i Kundeflow (obDemoState), i stedet for kundens tilstand
// Emits: continue ("Fortsæt med Crediwire"), finished (trinnet er gjort), logout ("Skift bruger").
// Slot footer: under trinnet (portalens demoknapper).
// Ikke porteret (død kode): setStep/onJump og trinnet 'data' (kun det trin brugte setStep).
import OnboardingUser from './OnboardingUser.vue'

defineProps({
  step: { type: String, default: null },
  preview: { type: Boolean, default: false },
  pre: { type: Boolean, default: false },
  arrive: { type: Boolean, default: false },
  demo: { type: Object, default: null },
})
const emit = defineEmits(['continue', 'finished', 'logout'])
</script>

<template>
  <OnboardingUser
    v-if="step === 'account'"
    :preview="preview"
    :pre="pre"
    :arrive="arrive"
    :demo="demo"
    @continue="emit('continue')"
    @done="emit('finished')"
    @logout="emit('logout')"
  >
    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </OnboardingUser>
</template>
