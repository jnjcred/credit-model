<script setup>
// Kundens oversigt (new_case_portal.jsx: PortalHub, L1608–1723): behandlingsstatus, listen over punkterne
// lige under (og de årsrapporter, EIFO selv har hentet fra CVR), derefter, når det er relevant,
// regnskabssystemet (venter på revisor, eller forbundet med "Træk adgangen tilbage"), næste skridt
// ("Vi er færdige"), hjælp fra revisor eller bank og andre filer, dialogen med rådgiveren og
// "Jeres kontakt". Overskriften (h1) er kun for skærmlæsere.
//
// Props: requested (punkterne i anmodningen), lock ('submitted' | 'declined' | null: sagen er låst).
// Emits: open(id) (et punkt), open-bundle(preselect) (hjælp fra revisor eller bank), other (andre
//        filer), submit (Vi er færdige), erp (forbind regnskabssystemet).
// Kundehandlinger bærer data-cust-act (forhåndsvisningens spærre). "Andre filer (n)" bærer det ikke:
// rådgiveren kan se filerne i forhåndsvisningen (dialogens Send stoppes).
// Ikke porteret (død kode): fresh og onStatus (ubrugte props), openDialog, req, draft og deadline, og
// tjekket af onErp (portalen gav den altid).
import { computed } from 'vue'
import { Grid } from 'ant-design-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { PORTAL_CONTACT, ncFill, portalAutoDocs, portalConsentUntil, portalRevoke, portalStatus } from '@/domain/new_case_portal'
import { useCaseVersion } from '@/composables/useCaseVersion'
import CustomerConversation from '@/views/customer/CustomerConversation.vue'
import PortalSteps from './components/PortalSteps.vue'
import PortalConsentBox from './components/PortalConsentBox.vue'
import PortalHubRow from './components/PortalHubRow.vue'
import PortalStatusIcon from './components/PortalStatusIcon.vue'
import PortalContactCard from './components/PortalContactCard.vue'

const props = defineProps({
  requested: { type: Array, required: true },
  lock: { type: String, default: null },
})
const emit = defineEmits(['open', 'open-bundle', 'other', 'submit', 'erp'])

const version = useCaseVersion()
const screens = Grid.useBreakpoint()
const narrow = computed(() => !!screens.value.xs)
const adv = PORTAL_CONTACT.first
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
  const rows = props.requested.map(it => ({ key: it.id, it, status: portalStatus(it.id) }))
    .concat(portalAutoDocs().map(y => ({ key: 'auto-' + y, year: y })))
  return { canDelegate, submittedAt, showSubmit, loose, consent, erpOffer, waitingErp, rows }
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
        >{{ t('Materiale') }}</span>
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
            @open="(id) => emit('open', id)"
          />
          <!-- Det, EIFO selv har hentet (årsrapporterne fra CVR): ét afkrydset punkt pr. år -->
          <a-list-item
            v-else
            :data-row="'auto-' + r.year"
          >
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
          </a-list-item>
        </template>
      </a-list>
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
      v-if="!locked"
      wrap
      :size="4"
    >
      <a-button
        v-if="hub.canDelegate"
        type="text"
        data-cust-act="delegate"
        @click="emit('open-bundle', null)"
      >
        {{ t('Få hjælp fra revisor eller bank') }}
      </a-button>
      <a-button
        v-if="hub.erpOffer && !hub.waitingErp"
        type="text"
        data-cust-act="erp"
        @click="emit('erp')"
      >
        {{ t('Forbind regnskabssystem') }}
      </a-button>
      <a-button
        type="text"
        :data-cust-act="hub.loose.length ? undefined : 'upload'"
        @click="emit('other')"
      >
        {{ hub.loose.length ? ncFill(t('Andre filer ({n})'), { n: hub.loose.length }) : t('Send en anden fil') }}
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

.hub-auto-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}
</style>
