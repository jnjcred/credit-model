<script setup>
// Dataanmodninger: alle materialeanmodninger på tværs af sager (data_requests.jsx før migrationen).
// Reglerne (påmindelser, rækkens grå linje, tidslinjen) står i src/domain/requests.js.
// Ingen knap her ændrer sagens fase; herfra åbnes sagen bare det rette sted.
import { computed, ref } from 'vue'
import { Empty } from 'ant-design-vue'
import { SendOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { CLOSED_HELP, STUCK_HELP, WAITING_HELP, reqFill, sendReminders } from '@/domain/requests'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { useTabsKeyboard } from '@/composables/useTabsKeyboard'
import AppTopbar from '@/components/shell/AppTopbar.vue'
import DataRequestRow from './DataRequestRow.vue'
import DataRequestModal from './DataRequestModal.vue'

const caseVersion = useCaseVersion()
// Påmindelser på sager uden levende data gemmes lokalt og sender deres eget event
const reminders = ref(0)
useWindowEvent('cw-reminders-changed', () => { reminders.value++ })

const filter = ref('all')
const owner = ref('all')
const selectedId = ref(null)

const allRows = computed(() => {
  caseVersion.value + reminders.value
  return DATA.requestRows()
})
const requests = computed(() => (owner.value === 'all' ? allRows.value : allRows.value.filter(r => r.owner === owner.value)))
const selected = computed(() => requests.value.find(r => r.id === selectedId.value) || null)

const counts = computed(() => {
  const list = requests.value
  return {
    active: list.filter(r => r.status === 'active').length,
    waiting: list.filter(r => r.status === 'waiting').length,
    stuck: list.filter(r => r.status === 'stuck').length,
    ready: list.filter(r => r.status === 'ready').length,
    draft: list.filter(r => r.status === 'draft').length,
    closed: list.filter(r => r.status === 'closed').length,
    all: list.length,
  }
})
const toReviewRows = computed(() => requests.value.filter(r => r.toReview > 0 && r.status !== 'closed'))
const stuckRows = computed(() => requests.value.filter(r => r.status === 'stuck'))

// Fanerne er det eneste sted med tal. "Afventer kunden" og "Lukkede" findes kun, når der er nogen.
const tabs = computed(() => {
  const c = counts.value
  return [
    { k: 'all', l: 'Alle', n: c.all },
    { k: 'active', l: 'Aktive', n: c.active },
    c.waiting > 0 && { k: 'waiting', l: 'Afventer kunden', n: c.waiting, help: WAITING_HELP },
    { k: 'stuck', l: 'Sidder fast', n: c.stuck, help: STUCK_HELP },
    { k: 'ready', l: 'Komplette', n: c.ready },
    { k: 'draft', l: 'Ikke sendt', n: c.draft },
    c.closed > 0 && { k: 'closed', l: 'Lukkede', n: c.closed, help: CLOSED_HELP },
  ].filter(Boolean).map(x => ({ k: x.k, l: t(x.l), n: x.n, help: x.help ? t(x.help) : undefined }))
})
const tab = computed(() => (tabs.value.some(x => x.k === filter.value) ? filter.value : 'all'))
const filtered = computed(() => (tab.value === 'all' ? requests.value : requests.value.filter(r => r.status === tab.value)))

// Én sætning om det, der kræver noget af rådgiveren
const sub = computed(() => {
  const nRev = toReviewRows.value.length, nStuck = stuckRows.value.length
  const rev = nRev ? reqFill(nRev === 1 ? t('1 har materiale til gennemgang') : t('{n} har materiale til gennemgang'), { n: nRev }) : ''
  const stuck = nStuck ? reqFill(nStuck === 1 ? t('1 kunde sidder fast') : t('{n} kunder sidder fast'), { n: nStuck }) : ''
  return rev && stuck ? reqFill(t('{a}, og {b}.'), { a: rev, b: stuck })
    : rev || stuck ? (rev || stuck) + '.'
      : t('Ingen anmodninger kræver noget af dig lige nu.')
})
// Med en valgt rådgiver står navnet først ("Jonas K.: …")
const subtitle = computed(() => (owner.value !== 'all' ? owner.value + ': ' : '') + sub.value)

function setFilter (k) { filter.value = k }
// Fanerne: piletaster, Home og End skifter fane, som før
const onTabsKeydown = useTabsKeyboard('cw-req', () => tabs.value.map(x => x.k), setFilter)

// Ansvarlig: alle eller én rådgiver. Et nyt valg lukker detaljerne.
const ownerOptions = computed(() => [{ value: 'all', label: t('Alle rådgivere') }].concat(DATA.TEAM.map(m => ({ value: m.short, label: m.short }))))
function setOwner (v) {
  owner.value = v
  selectedId.value = null
}
</script>

<template>
  <!-- Ingen knapper i topbjælken: sidebjælkens "Ny sag" er skærmens eneste primærknap -->
  <AppTopbar :crumbs="[t('Dataanmodninger')]" />
  <div class="req-page">
    <div>
      <a-typography-title>{{ t('Dataanmodninger') }}</a-typography-title>
      <a-typography-text type="secondary">
        {{ subtitle }}
      </a-typography-text>
    </div>

    <!-- Faner, samlet påmindelse (kun på Sidder fast) og ansvarlig; listen står i den valgte fane -->
    <div @keydown="onTabsKeydown">
      <a-tabs
        id="cw-req"
        :active-key="tab"
        :aria-label="t('Filtrér anmodninger')"
        @change="setFilter"
      >
        <a-tab-pane
          v-for="x in tabs"
          :key="x.k"
        >
          <template #tab>
            <a-tooltip :title="x.help">
              <span>
                {{ x.l }} <a-typography-text type="secondary">
                  {{ x.n }}
                </a-typography-text>
              </span>
            </a-tooltip>
          </template>
          <a-card
            v-if="x.k === tab"
            :bordered="false"
          >
            <a-list
              v-if="filtered.length"
              :data-source="filtered"
              row-key="id"
            >
              <template #renderItem="{ item }">
                <DataRequestRow
                  :key="item.id"
                  :request="item"
                  @select="selectedId = item.id"
                />
              </template>
            </a-list>
            <a-empty
              v-else
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            >
              <template #description>
                <a-typography-text type="secondary">
                  {{ t('Ingen anmodninger her') }}
                </a-typography-text>
              </template>
            </a-empty>
          </a-card>
        </a-tab-pane>
        <template #rightExtra>
          <a-space>
            <a-button
              v-if="tab === 'stuck' && stuckRows.length > 0"
              :aria-label="t('Påmind alle, der sidder fast') + ' (' + stuckRows.length + ')'"
              @click="sendReminders(stuckRows)"
            >
              <template #icon>
                <SendOutlined aria-hidden="true" />
              </template>
              {{ t('Påmind alle') }} ({{ stuckRows.length }})
            </a-button>
            <!-- Etiketten er knyttet til vælgeren med id (aria-label på a-select når ikke feltet i 3.2.13) -->
            <a-form layout="inline">
              <a-form-item
                :label="t('Ansvarlig')"
                html-for="cw-req-owner"
              >
                <a-select
                  id="cw-req-owner"
                  :value="owner"
                  :options="ownerOptions"
                  :dropdown-match-select-width="false"
                  @change="setOwner"
                />
              </a-form-item>
            </a-form>
          </a-space>
        </template>
      </a-tabs>
    </div>
  </div>

  <DataRequestModal
    :request="selected"
    @close="selectedId = null"
  />
</template>

<style scoped>
.req-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px;
}
</style>
