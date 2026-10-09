<script setup>
// Klokken: hændelser fra kunden, som rådgiveren ikke har set (leveringer, spørgsmål,
// Indsend, samtykke). CW.notifications('rådgiver') er kilden; CW.markSeen markerer dem som set.
// Kun Nordhavn har levende hændelser i demoen; de andre sager har faste demohændelser.
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue'
import { BellOutlined, CheckOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { BELL_TARGET, bellHandled, bellWhen } from '@/domain/shell_content'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { openCase } from '@/composables/useNavigation'

const open = ref(false)
const panel = ref(null)
const caseVersion = useCaseVersion()
// Demohændelserne markeres som set uden for CW; tiden ("for 17 min. siden") skal også opdateres
const tick = ref(0)

const model = computed(() => {
  caseVersion.value + tick.value
  const log = CW.activity()
  const unseen = CW.notifications('rådgiver').filter(e => !bellHandled(e, log))
  const unseenIds = {}
  unseen.forEach(e => { unseenIds[e.id] = true })
  // Tidligere hændelser fra kunden (allerede set), til sammenhæng
  const earlier = CW.activity().filter(e => e.who === 'kunde' && !unseenIds[e.id]).slice(-5).reverse()
  // Faste demohændelser på de andre sager (Marstal, Lyngbæk …): nye, indtil de er klikket
  const demoEv = DATA.demoBellEvents ? DATA.demoBellEvents() : []
  const demoNew = demoEv.filter(e => !e.seen)
  const demoOld = demoEv.filter(e => e.seen)
  return {
    fresh: unseen.concat(demoNew),
    old: earlier.concat(demoOld),
    demoNew,
    n: unseen.length + demoNew.length,
  }
})

const company = computed(() => DATA.COMPANY.name)
// Nye hændelser først, derefter de tidligere (allerede set) under overskriften Tidligere
const groups = computed(() => [
  model.value.n > 0 && { key: 'fresh', items: model.value.fresh, fresh: true },
  model.value.old.length > 0 && { key: 'old', heading: 'Tidligere', items: model.value.old, fresh: false },
].filter(Boolean))
const label = computed(() => (model.value.n
  ? t('Notifikationer') + ', ' + model.value.n + ' ' + (model.value.n === 1 ? t('ny') : t('nye'))
  : t('Notifikationer')))

function markAll () {
  CW.markSeen('rådgiver')
  if (model.value.demoNew.length) DATA.markDemoBellSeen(model.value.demoNew.map(e => e.id))
  tick.value++
}

function openEntry (e) {
  open.value = false
  if (e.caseId) { DATA.markDemoBellSeen(e.id); tick.value++; openCase(e.caseId, null); return }
  CW.markSeen('rådgiver')
  openCase(1, BELL_TARGET[e.type] || null)
}

// Tiden på hændelserne opdateres, mens listen er åben
let timer = null
// Som før migrationen (CW.useDialog): fokus på panelets første knap eller link, og Tab bliver i panelet
const focusTrap = useFocusTrap()
watch(open, (on) => {
  clearInterval(timer)
  if (!on) { focusTrap.release(); return }
  timer = setInterval(() => { tick.value++ }, 30000)
  focusTrap.trap(() => panel.value)
  // Indholdet tegnes først, når panelet vises
  let n = 0
  // Panelet findes allerede (skjult), når det åbnes igen: der prøves igen, til fokus faktisk er flyttet
  const focusFirst = () => {
    const target = panel.value && (panel.value.querySelector('a[href], button') || panel.value)
    if (target) target.focus()
    if (target && document.activeElement === target) return
    if (++n < 20) setTimeout(focusFirst, 30)
  }
  nextTick(focusFirst)
})
onBeforeUnmount(() => clearInterval(timer))

// Tallet på klokken står allerede i knappens navn. Som før migrationen skjules det synlige tal for
// skærmlæsere; a-badge har ingen prop til det, så attributten sættes på dens tal-element.
const badge = ref(null)
function hideBadgeCount () {
  const sup = badge.value && badge.value.$el && badge.value.$el.querySelector && badge.value.$el.querySelector('sup')
  if (sup && sup.getAttribute('aria-hidden') !== 'true') sup.setAttribute('aria-hidden', 'true')
}
onMounted(hideBadgeCount)
onUpdated(hideBadgeCount)

function closeAndFocus () {
  open.value = false
  CW.focusSoon('#cw-bell')
}
// Esc lukker panelet og giver fokus tilbage til klokken, uanset hvor fokus står
useWindowEvent('keydown', (e) => {
  if (e.key === 'Escape' && open.value) closeAndFocus()
})
</script>

<template>
  <a-popover
    v-model:visible="open"
    trigger="click"
    placement="bottomRight"
    :overlay-style="{ width: '360px' }"
  >
    <template #content>
      <!-- Overskriften står i panelet (ikke i popoverens titel), så Markér som læst er en del af dialogen -->
      <div
        ref="panel"
        role="dialog"
        tabindex="-1"
        :aria-label="t('Notifikationer')"
      >
        <div class="bell-head">
          <span>
            <a-typography-text strong>{{ t('Notifikationer') }}</a-typography-text><a-typography-text
              v-if="model.n > 0"
              type="secondary"
            > - {{ model.n }} {{ model.n === 1 ? t('ny') : t('nye') }}</a-typography-text>
          </span>
          <a-button
            v-if="model.n > 0"
            type="text"
            size="small"
            @click="markAll"
          >
            <template #icon>
              <CheckOutlined aria-hidden="true" />
            </template>
            {{ t('Markér som læst') }}
          </a-button>
        </div>
        <a-divider class="bell-divider" />
        <div class="bell-body">
          <a-typography-paragraph
            v-if="model.n === 0"
            type="secondary"
          >
            {{ t('Ingen nye hændelser fra kunderne.') }}
          </a-typography-paragraph>
          <!-- Hver hændelse er én knap hele vejen hen, som før: titel, virksomhed og tid (nye med prik) -->
          <template
            v-for="g in groups"
            :key="g.key"
          >
            <a-typography-text
              v-if="g.heading"
              type="secondary"
              strong
            >
              {{ t(g.heading) }}
            </a-typography-text>
            <a-list
              size="small"
              :data-source="g.items"
            >
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-button
                    type="text"
                    block
                    class="bell-row"
                    @click="openEntry(item)"
                  >
                    <span class="bell-row-text">
                      <a-typography-text :strong="g.fresh">{{ item.caseId ? t(item.text) : item.text }}</a-typography-text>
                      <a-typography-text type="secondary">
                        {{ item.company || company }} - <span :title="CW.fmtWhen(item.at)">{{ bellWhen(item.at) }}</span><span
                          v-if="g.fresh"
                          class="sr-only"
                        > {{ t('ny') }}</span>
                      </a-typography-text>
                    </span>
                    <a-badge
                      v-if="g.fresh"
                      status="processing"
                      aria-hidden="true"
                    />
                  </a-button>
                </a-list-item>
              </template>
            </a-list>
          </template>
          <a-typography-paragraph
            v-if="model.n === 0 && model.old.length === 0"
            type="secondary"
          >
            {{ t('Her kommer det, kunden gør i sin portal: leveringer, spørgsmål, indsendelse og adgang til regnskabssystemet.') }}
          </a-typography-paragraph>
        </div>
      </div>
    </template>
    <a-badge
      ref="badge"
      :count="model.n"
      :overflow-count="9"
    >
      <a-button
        id="cw-bell"
        type="text"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :title="t('Notifikationer')"
        :aria-label="label"
      >
        <template #icon>
          <BellOutlined aria-hidden="true" />
        </template>
      </a-button>
    </a-badge>
  </a-popover>
</template>

<style scoped>
.bell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

/* Kun listen ruller; overskriften med Markér som læst står fast */
.bell-body {
  max-height: 380px;
  overflow-y: auto;
}

/* En hændelse fylder rækken: tekst på flere linjer, venstrestillet (antdv's knapper er ellers én linje) */
.bell-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  height: auto;
  padding: 4px 0;
  white-space: normal;
  text-align: left;
}

.bell-row-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.bell-divider {
  margin: 8px 0;
}
</style>
