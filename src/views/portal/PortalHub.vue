<script setup>
// Kundens oversigt (new_case_portal.jsx: PortalHub, L1608–1723): behandlingsstatus, listen over punkterne
// lige under (og de årsrapporter, EIFO selv har hentet fra CVR), derefter, når det er relevant,
// regnskabssystemet (venter på revisor, eller forbundet med "Træk adgangen tilbage"), næste skridt
// ("Vi er færdige"), hjælp fra revisor eller bank og andre filer, dialogen med rådgiveren og
// "Jeres kontakt". Overskriften (h1) er kun for skærmlæsere.
//
// Props: requested (punkterne i anmodningen), lock ('submitted' | 'declined' | null: sagen er låst),
//        demo (demoknapperne til Regnskabs kilder må vises: ikke i Kundeflow).
// Emits: open(id) (et punkt), open-bundle(preselect) (hjælp fra revisor eller bank), other (andre
//        filer), submit (Vi er færdige), erp (forbind regnskabssystemet).
// Kundehandlinger bærer data-cust-act (forhåndsvisningens spærre). "Andre filer (n)" bærer det ikke:
// rådgiveren kan se filerne i forhåndsvisningen (dialogens Send stoppes). Demoknapperne
// (PortalSourceDemo) bærer det heller ikke: de virker også i forhåndsvisningen. De står ved punkterne
// (PortalHubRow), under de hentede årsrapporter (en intern årsrapport, når ingen årsrapport er bedt
// om) og under handlingerne (forbind e-conomic, når Periodetal ikke er bedt om). Ikke på en låst sag.
// Ikke porteret (død kode): fresh og onStatus (ubrugte props), openDialog, req, draft og deadline, og
// tjekket af onErp (portalen gav den altid).
import { computed } from 'vue'
import { Grid } from 'ant-design-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { ncFill, portalAutoDocs, portalConsentUntil, portalRevoke, portalStatus } from '@/domain/new_case_portal'
import { finDelivered, finInternalLoose } from '@/domain/financials/finSources'
import { useCaseVersion } from '@/composables/useCaseVersion'
import CustomerConversation from '@/views/customer/CustomerConversation.vue'
import PortalSteps from './components/PortalSteps.vue'
import PortalConsentBox from './components/PortalConsentBox.vue'
import PortalHubRow from './components/PortalHubRow.vue'
import PortalStatusIcon from './components/PortalStatusIcon.vue'
import PortalContactCard from './components/PortalContactCard.vue'
import PortalAiLine from './components/PortalAiLine.vue'

const props = defineProps({
  requested: { type: Array, required: true },
  lock: { type: String, default: null },
  demo: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'open-bundle', 'other', 'submit', 'erp'])

const version = useCaseVersion()
const screens = Grid.useBreakpoint()
const narrow = computed(() => !!screens.value.xs)
const adv = 'EIFO'   // kunden skriver til og hører fra EIFO; rådgiverens navn står kun på kontaktkortet
const locked = computed(() => !!props.lock)

const hub = computed(() => {
  version.value
  const prog = CW.progress()
  const cs = CW.caseState() || {}
  const canDelegate = props.requested.some(it => ['pending', 'rejected', 'delegated'].includes(portalStatus(it.id)))
  const submittedAt = cs.customerSubmittedAt || null
  const changedSince = submittedAt && props.requested.some(it => { const s = CW.itemState(it.id); return s && s.by === 'kunde' && s.at && s.at > submittedAt })
  const ready = prog.total > 0 && prog.requiredMissing === 0 && !locked.value
  const showSubmit = ready && (!submittedAt || changedSince)
  const loose = CW.allUploads().filter(f => !f.itemId && f.by === 'kunde')
  // Regnskabssystemet: forbindelsen står for sig, når den findes. Er Periodetal ikke
  // bedt om, og har kunden ikke sagt nej til datadeling, kan den forbindes herfra.
  const consent = CW.consent()
  const ob = CW.onboarding()
  const erpOffer = !consent && !props.requested.some(it => it.id === 'm-interim') && !(ob.agreement && ob.agreement.declined)
  // Kunden valgte "Vi venter på vores revisor" i opstarten: vejen videre står her
  const waitingErp = !consent && !locked.value && !!(ob.erp && ob.erp.waiting)
  // Demoknapperne uden for punkterne. De interne årsrapporter står under den nyeste hentede
  // årsrapport, når ingen årsrapport er bedt om, eller når de er sendt herfra (så de kan trækkes
  // tilbage). Uden punkt sendes de som andre filer, som en kunde kan (portalDemoDocument), og Regnskab
  // læser dem derfra. Forbind e-conomic står under handlingerne, når Periodetal ikke er bedt om.
  const demo = props.demo && !locked.value
  const asked = (re) => props.requested.some(it => re.test(it.id))
  const annualDemo = demo && !asked(/^m-annual$/) && (!asked(/^m-annual-\d{4}$/) || finDelivered(CW.itemState('m-annual')) || finInternalLoose().length > 0)
  const erpDemo = demo && !asked(/^m-interim$/)
  const years = portalAutoDocs()
  const rows = props.requested.map(it => ({ key: it.id, it, status: portalStatus(it.id) }))
    .concat(years.map((y, i) => ({ key: 'auto-' + y, year: y, demo: annualDemo && i === years.length - 1 })))
  return { canDelegate, submittedAt, showSubmit, loose, consent, erpOffer, waitingErp, rows, erpDemo }
})
</script>

<template>
  <div class="portal-hub">
    <h1 class="sr-only">
      {{ t('Status for jeres ansøgning') }}
    </h1>
    <PortalSteps />

    <PortalConsentBox v-if="locked" />

    <a-card
      role="region"
      aria-labelledby="cwp-items-h"
    >
      <template #title>
        <span
          id="cwp-items-h"
          role="heading"
          aria-level="2"
        >{{ t('Anmodet materiale') }}</span>
      </template>
      <template
        v-if="hub.canDelegate && !locked"
        #extra
      >
        <a-button
          type="link"
          data-cust-act="delegate"
          @click="emit('open-bundle', null)"
        >
          {{ t('Få hjælp fra revisor eller bank') }}
        </a-button>
      </template>
      <a-list
        v-if="hub.rows.length"
        :data-source="hub.rows"
        row-key="key"
      >
        <template #renderItem="{ item: r }">
          <PortalHubRow
            v-if="r.it"
            :it="r.it"
            :status="r.status"
            :read-only="locked"
            :narrow="narrow"
            :demo="demo"
            @open="(id) => emit('open', id)"
          />
          <!-- Det, EIFO selv har hentet (årsrapporterne fra CVR): ét afkrydset punkt pr. år -->
          <a-list-item
            v-else
            :data-row="'auto-' + r.year"
          >
            <div class="hub-auto-item">
              <div class="hub-auto cwp-row">
                <PortalStatusIcon status="auto" />
                <span class="hub-auto-text">
                  <a-typography-text
                    strong
                    type="secondary"
                  >
                    {{ t('Årsrapport') + ' ' + r.year }}<span class="sr-only">{{ ': ' + t('Hentet automatisk') }}</span>
                  </a-typography-text>
                  <!-- EIFO godkender ikke årsrapporterne; de er hentet fra CVR. Mærkaten er grøn som Godkendt -->
                  <a-badge
                    v-if="narrow"
                    status="success"
                    :text="t('Hentet automatisk')"
                    aria-hidden="true"
                  />
                </span>
                <a-badge
                  v-if="!narrow"
                  status="success"
                  :text="t('Hentet automatisk')"
                  aria-hidden="true"
                />
              </div>
            </div>
          </a-list-item>
        </template>
      </a-list>
      <div
        v-if="!locked"
        class="hub-foot"
      >
        <a-button
          type="text"
          :data-cust-act="hub.loose.length ? undefined : 'upload'"
          @click="emit('other')"
        >
          {{ t('Send en anden fil') }}
        </a-button>
      </div>
      <!-- Oplysningen om AI står ét sted, nederst i kortet med materialet, og kan foldes ud (ikke under hvert punkt) -->
      <div class="hub-ai">
        <PortalAiLine />
      </div>
    </a-card>

    <a-card
      v-if="hub.waitingErp"
      size="small"
      class="cwp-hub-wait"
    >
      <a-row
        justify="space-between"
        align="middle"
        :gutter="[12, 8]"
      >
        <a-col flex="1 1 240px">
          <div>
            <a-typography-text strong>
              {{ t('I venter på jeres revisor med regnskabssystemet') }}
            </a-typography-text>
          </div>
          <a-typography-text type="secondary">
            {{ t('Send revisoren et link, eller forbind selv, når I har adgang.') }}
          </a-typography-text>
        </a-col>
        <a-col>
          <a-space wrap>
            <a-button
              v-if="hub.canDelegate"
              data-cust-act="delegate"
              @click="emit('open-bundle', null)"
            >
              {{ t('Bed revisoren om hjælp') }}
            </a-button>
            <a-button
              data-cust-act="erp"
              @click="emit('erp')"
            >
              {{ t('Forbind nu') }}
            </a-button>
          </a-space>
        </a-col>
      </a-row>
    </a-card>

    <a-card
      v-if="hub.consent && !locked"
      size="small"
    >
      <a-row
        justify="space-between"
        align="middle"
        :gutter="[12, 8]"
      >
        <a-col flex="1 1 240px">
          <div>
            <a-typography-text strong>
              {{ ncFill(t('Forbundet til {src} (kun læseadgang)'), { src: hub.consent.system }) }}
            </a-typography-text>
          </div>
          <a-typography-text type="secondary">
            {{ portalConsentUntil(hub.consent) }}
          </a-typography-text>
        </a-col>
        <a-col>
          <a-button
            data-cust-act="consent"
            @click="portalRevoke(hub.consent)"
          >
            {{ t('Træk adgangen tilbage') }}
          </a-button>
        </a-col>
      </a-row>
    </a-card>

    <a-card
      v-if="hub.showSubmit"
      size="small"
      class="cwp-stack"
    >
      <a-row
        justify="space-between"
        align="middle"
        :gutter="[12, 12]"
      >
        <a-col flex="1 1 240px">
          <a-typography-text strong>
            {{ hub.submittedAt ? t('I har sendt mere, siden I sagde, I var færdige') : ncFill(t('Alt er sendt. Sig til {adv}, når I er færdige.'), { adv }) }}
          </a-typography-text>
        </a-col>
        <a-col>
          <a-button
            type="primary"
            data-cust-act="submit"
            @click="emit('submit')"
          >
            {{ hub.submittedAt ? ncFill(t('Giv {adv} besked'), { adv }) : t('Vi er færdige') }}
          </a-button>
        </a-col>
      </a-row>
    </a-card>

    <a-space
      v-if="!locked && hub.erpOffer && !hub.waitingErp"
      wrap
      :size="4"
    >
      <a-button
        type="text"
        data-cust-act="erp"
        @click="emit('erp')"
      >
        {{ t('Forbind regnskabssystem') }}
      </a-button>
    </a-space>

    <!-- Dialogen med rådgiveren står altid synlig som en chat -->
    <CustomerConversation
      side="kunde"
      id-prefix="cwp"
      :read-only="locked"
    />

    <PortalContactCard />
  </div>
</template>

<style scoped>
/* Oversigtens spalte; kortene står under hinanden */
.portal-hub {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 760px;
  margin: 0 auto;
}

.hub-auto {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: flex-start;
  min-width: 0;
}

/* Ikonet er lige så højt som titlens linje og centreret i den, så det flugter med teksten */
.hub-auto :deep(.portal-status-icon) {
  align-items: center;
  height: 22px;
}

.hub-auto-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

/* Rækken og demoknapperne under den fylder listens linje (som punkternes rækker) */
.hub-auto-item {
  flex: 1;
  min-width: 0;
}

/* "Send en anden fil" står nederst i kortet, under en streg */
.hub-foot {
  padding: 12px 0 0;
  margin-top: 12px;
  border-top: 1px solid #f0f0f0;
}

/* AI-oplysningen nederst i kortet, under en streg som "Send en anden fil" */
.hub-ai {
  margin-top: 12px;
  border-top: 1px solid #f0f0f0;
}

</style>
