<script setup>
// Landingssiden (new_case_portal.jsx: PortalLanding, L1383–1439): det første, kunden ser fra
// invitationslinket, før der er en bruger. Hvem der spørger, hvorfor siden ligger på Crediwire, og hvordan
// det foregår. "Kom i gang" sender kunden til trinnet Bruger og derfra til Crediwires side (opret bruger
// eller log ind). Efter opstarten går kunden direkte til oversigten.
// Emits: start ("Kom i gang").
// Ikke porteret (død kode): req, draft, requested, deadline, byAdvisor, names, advFiles og advNote
// (beregnet, men aldrig vist).
import { computed } from 'vue'
import {
  ArrowRightOutlined, ClockCircleOutlined, DatabaseOutlined, LockOutlined, ReloadOutlined,
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { PORTAL_CONTACT, ncFill, ncFirstName, portalRecipient } from '@/domain/new_case_portal'
import { useCase } from '@/composables/useCaseVersion'

const emit = defineEmits(['start'])

const rcp = useCase(() => portalRecipient())
const first = computed(() => ncFirstName(rcp.value.name))
const adv = PORTAL_CONTACT.first
const telHref = 'tel:' + PORTAL_CONTACT.phone.replace(/\s/g, '')
const steps = [
  { k: 'time', ic: ClockCircleOutlined, t: t('Ca. 10 minutter samlet. Det meste er upload.') },
  { k: 'user', ic: ReloadOutlined, t: t('I opretter en bruger hos Crediwire, så I kan holde pause og vende tilbage. Det, I har sendt, er gemt.') },
  { k: 'erp', ic: DatabaseOutlined, t: t('Periodetal kan I forbinde direkte fra jeres regnskabssystem med få klik. I vælger selv, hvilken type samtykke I vil give.') },
  { k: 'lock', ic: LockOutlined, t: t('Krypteret forbindelse. Linket er personligt og gælder kun jeres ansøgning.') },
]
</script>

<template>
  <div class="portal-land">
    <a-typography-title>{{ first ? ncFill(t('Kære {name},'), { name: first }) : t('Velkommen') }}</a-typography-title>
    <a-typography-paragraph type="secondary">
      {{ ncFill(t('Tak for jeres ansøgning hos EIFO. For at vi kan behandle den, har vi brug for noget materiale fra {company}.'), { company: DATA.COMPANY.name }) }}
    </a-typography-paragraph>
    <a-card
      size="small"
      class="portal-land-block"
    >
      <div class="portal-land-why">
        <a-typography-text type="secondary">
          <LockOutlined aria-hidden="true" />
        </a-typography-text>
        <div>
          <a-typography-text strong>
            {{ t('Hvorfor Crediwire?') }}
          </a-typography-text>
          {{ ' ' }}{{ ncFill(t('EIFO bruger Crediwire til sikker indsamling af materiale, derfor ligger siden hos Crediwire. Kun {adv} og hendes kolleger hos EIFO ser det, I sender.'), { adv }) }}
        </div>
      </div>
    </a-card>
    <a-card
      size="small"
      class="portal-land-block"
      role="region"
      aria-labelledby="cwp-land-how-h"
    >
      <template #title>
        <span
          id="cwp-land-how-h"
          role="heading"
          aria-level="2"
        >{{ t('Sådan foregår det') }}</span>
      </template>
      <a-list
        :split="false"
        :data-source="steps"
        row-key="k"
      >
        <template #renderItem="{ item: x }">
          <a-list-item>
            <div class="portal-land-step">
              <a-avatar
                class="portal-land-icon"
                shape="square"
                aria-hidden="true"
              >
                <template #icon>
                  <component :is="x.ic" />
                </template>
              </a-avatar>
              <div>{{ x.t }}</div>
            </div>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
    <a-button
      type="primary"
      size="large"
      @click="emit('start')"
    >
      {{ t('Kom i gang') }} <ArrowRightOutlined aria-hidden="true" />
    </a-button>
    <a-typography-paragraph
      type="secondary"
      class="portal-land-ask"
    >
      {{ ncFill(t('Spørgsmål? Skriv til {name} på'), { name: adv }) }}
      <a-typography-link
        strong
        :href="'mailto:' + PORTAL_CONTACT.email"
      >
        {{ PORTAL_CONTACT.email }}
      </a-typography-link>
      {{ t('eller ring på') }}
      <a-typography-link
        strong
        class="portal-land-nowrap"
        :href="telHref"
      >
        {{ PORTAL_CONTACT.phone }}
      </a-typography-link>
    </a-typography-paragraph>
  </div>
</template>

<style scoped>
/* Landingssidens spalte, som før */
.portal-land {
  max-width: 560px;
  margin: 0 auto;
}

.portal-land-block {
  margin-bottom: 16px;
}

.portal-land-why,
.portal-land-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.portal-land-step {
  align-items: center;
}

/* Ikonet bevarer sin størrelse, når teksten brydes */
.portal-land-icon {
  flex-shrink: 0;
}

.portal-land-ask {
  margin-top: 16px;
}

/* Telefonnummeret brydes ikke midt i */
.portal-land-nowrap {
  white-space: nowrap;
}
</style>
