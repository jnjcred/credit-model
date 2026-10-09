<script setup>
// Forbindelsen til regnskabssystemet på en lukket sag (new_case_portal.jsx: PortalConsentBox,
// L1349–1381): aktiv (med "Træk adgangen tilbage"), lukket ved afgørelsen, eller trukket tilbage. Vises
// kun, hvis kunden har givet adgang på et tidspunkt. Systemets navn står i samtykket, ellers i loglinjen
// "Kunden gav læseadgang til <system>" eller i punktets note "Hentet fra <system>". At de hentede tal
// bliver i sagen, står kun, når de stadig er der (finSourceState: punktet Periodetal eller andre filer;
// demoknappen "Forbind e-conomic" fjerner dem igen, når den slås fra).
// Props: ingen. Bruges af PortalClosed og af oversigten på en låst sag.
// "Træk adgangen tilbage" bærer data-cust-act="consent": forhåndsvisningens spærre stopper klikket.
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { ncFill, portalConsentUntil, portalRevoke } from '@/domain/new_case_portal'
import { finSourceState } from '@/domain/financials/finSources'
import { useCaseVersion } from '@/composables/useCaseVersion'

const version = useCaseVersion()
const box = computed(() => {
  version.value
  const consent = CW.consent()
  const log = CW.activity()
  const given = log.filter(e => e.type === 'consent').pop()
  if (!consent && !given) return null
  const closed = log.filter(e => e.type === 'consent-revoked').pop()
  const s = CW.itemState('m-interim')
  // Systemets navn: fra samtykket, ellers fra loglinjen "Kunden gav læseadgang til <system>"
  const fromLog = given && /(læseadgang til|read access to) (.+)$/.exec(given.text || '')
  const src = consent ? consent.system : (fromLog && fromLog[2]) || (s && s.noteKind === 'system' && String(s.note || '').replace(/^Hentet fra /, '')) || t('regnskabssystemet')
  const byCase = !consent && closed && closed.who === 'system'
  const kept = finSourceState().period === 'erp'
  return { consent, src, byCase, kept }
})
</script>

<template>
  <a-card
    v-if="box"
    size="small"
    class="cwp-consent-box"
  >
    <a-row
      justify="space-between"
      align="middle"
      :gutter="[12, 8]"
    >
      <a-col flex="1 1 200px">
        <template v-if="box.consent">
          <div>
            <a-typography-text strong>
              {{ ncFill(t('Forbundet til {src} (kun læseadgang)'), { src: box.src }) }}
            </a-typography-text>
          </div>
          <a-typography-text type="secondary">
            {{ portalConsentUntil(box.consent) }}
          </a-typography-text>
        </template>
        <a-typography-text
          v-else
          type="secondary"
        >
          {{ box.byCase
            ? ncFill(t('Adgangen til {src} er lukket, fordi sagen er afgjort. EIFO kan ikke hente flere tal.'), { src: box.src })
            : box.kept
              ? ncFill(t('Adgangen til {src} er trukket tilbage. De tal, EIFO allerede har hentet, bliver i sagen.'), { src: box.src })
              : ncFill(t('Adgangen til {src} er trukket tilbage.'), { src: box.src }) }}
        </a-typography-text>
      </a-col>
      <a-col v-if="box.consent">
        <a-button
          data-cust-act="consent"
          @click="portalRevoke(box.consent)"
        >
          {{ t('Træk adgangen tilbage') }}
        </a-button>
      </a-col>
    </a-row>
  </a-card>
</template>
