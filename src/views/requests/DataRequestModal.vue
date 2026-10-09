<script setup>
// Detaljer om en anmodning: firmanavnet som titel, én sætning om status, stille rækker,
// "Aktivitet (n)" foldet og én primærknap efter tilstand. request = den valgte anmodning, eller null.
// Knappernes forklaringer er title (ikke a-tooltip), så de også læses op som beskrivelse af knappen.
import { computed, ref, watch } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import {
  openCustomerPreview, openRequestCase, reminderLine, reqDot, reqFill, requestEvents, sendReminders,
} from '@/domain/requests'
import { go, openCase } from '@/composables/useNavigation'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import { dialogBodyStyle } from '@/components/common/dialogBody'

const props = defineProps({
  request: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const caseVersion = useCaseVersion()
// Den sidst viste anmodning bliver stående, mens modalen lukker (så indholdet ikke forsvinder i animationen)
const shown = ref(props.request)
watch(() => props.request, (v) => { if (v) shown.value = v })

const F = DATA.fmt
const isNordhavn = computed(() => !!shown.value && shown.value.caseId === 1)
const closed = computed(() => !!shown.value && shown.value.status === 'closed')
const events = computed(() => {
  caseVersion.value
  return shown.value ? requestEvents(shown.value) : []
})
const reminded = computed(() => (shown.value ? reminderLine(shown.value) : null))
const dl = computed(() => F.deadline(shown.value && shown.value.deadline))
// Frist relativt til i dag ("om 12 dage", "overskredet 2 dage"). Kun ordet "overskredet" er rødt.
const dlParts = computed(() => {
  const m = dl.value.text.match(/^(.*?)(overskredet|overdue)(.*)$/)
  return dl.value.overdue && m ? m.slice(1, 4) : null
})

// Én sætning om status
const sentence = computed(() => {
  const r = shown.value
  if (!r) return ''
  const since = F.shortDate(r.lastActivityAt || r.sentAt)
  return reqDot(closed.value ? t(r.lastAction)
    : r.status === 'draft' ? t('Anmodningen er ikke sendt. Materialet vælges og sendes i sagen.')
      : r.toReview > 0 ? (r.toReview === 1 ? t('1 punkt venter på din gennemgang.') : reqFill(t('{n} punkter venter på din gennemgang.'), { n: r.toReview }))
        : r.status === 'ready' ? t('Kunden har leveret alt materialet.')
          : r.status === 'stuck' ? reqFill(t('Kunden har ikke været aktiv siden {dato}.'), { dato: since })
            : r.status === 'waiting' ? reqFill(t('Anmodningen er sendt {dato}. Kunden har ikke leveret noget endnu.'), { dato: F.shortDate(r.sentAt) })
              : t('Kunden leverer løbende.'))
})

// Én primærknap efter tilstand; "Åbn sag" står ved siden af, når den ikke selv er primær
const primary = computed(() => {
  const r = shown.value
  if (!r) return null
  if (!closed.value && r.toReview > 0) return { l: t('Gennemgå') + ' (' + r.toReview + ')', on: () => openRequestCase(r, 'ws-outstanding') }
  if (r.status === 'active' || r.status === 'stuck' || r.status === 'waiting') return { l: t('Påmind'), on: () => sendReminders([r]) }
  if (r.status === 'draft') return { l: t('Vælg materiale'), on: () => openRequestCase(r, 'ws-material') }
  return { l: t('Åbn sag'), open: true, on: () => openCase(r.caseId) }
})

// Rækkerne i detaljerne: fremdrift og modtager altid; frist og spørgsmål, når sagen er åben
const rows = computed(() => {
  const r = shown.value
  if (!r) return []
  return ['progress', 'recipient']
    .concat(r.deadline && !closed.value ? ['deadline'] : [])
    .concat(r.openQuestions > 0 && !closed.value ? ['questions'] : [])
})

// Afslået levende sag: genoptag via CW.requestStage (spørger først)
function reopen () {
  const cs = CW.caseState() || {}
  CW.requestStage(cs.declinedFrom || 'review-public').then(ok => { if (ok) CW.toast(t('Sagen er genoptaget. Kunden kan levere igen.')) })
}
function showCustomerPage () {
  emit('close')
  openCustomerPreview(go)
}

// ant-design-vue 3.2.13: foldens overskrift reagerer kun på Enter. Mellemrum folder også, som på en knap.
const onFoldKeydown = useCollapseKeyboard()
</script>

<template>
  <a-modal
    :visible="!!request"
    :wrap-props="{ 'aria-modal': 'true' }"
    :title="shown ? shown.company : ''"
    :width="572"
    :body-style="dialogBodyStyle"
    destroy-on-close
    @cancel="emit('close')"
  >
    <template v-if="shown">
      <a-typography-paragraph type="secondary">
        {{ sentence }}
      </a-typography-paragraph>
      <a-list :data-source="rows">
        <template #renderItem="{ item }">
          <!-- Fremdrift -->
          <a-list-item v-if="item === 'progress'">
            <a-list-item-meta
              :title="shown.status === 'draft' ? t('Ikke sendt') : reqFill(t('{n} af {m} punkter modtaget'), { n: shown.received, m: shown.total })"
              :description="reminded && !closed ? reminded : undefined"
            />
            <template
              v-if="!closed && shown.status !== 'draft'"
              #actions
            >
              <a-button
                class="cw-link"
                type="link"
                size="small"
                :title="t('Åbner sagen. Anmodningen ændres og sendes derfra.')"
                @click="openRequestCase(shown, 'ws-material')"
              >
                {{ t('Anmod om mere materiale') }}
              </a-button>
            </template>
          </a-list-item>
          <!-- Modtager -->
          <a-list-item v-else-if="item === 'recipient'">
            <a-list-item-meta
              :title="shown.contact || t('Ingen modtager valgt')"
              :description="shown.email ? shown.email + (shown.role ? ' - ' + t(shown.role) : '') : undefined"
            />
            <template #actions>
              <a-button
                v-if="isNordhavn"
                class="cw-link"
                type="link"
                size="small"
                @click="showCustomerPage"
              >
                {{ t('Kundeside') }}
              </a-button>
              <span>{{ t('Modtager') }}</span>
            </template>
          </a-list-item>
          <!-- Kundens svarfrist -->
          <a-list-item v-else-if="item === 'deadline'">
            <a-list-item-meta :title="dl.date">
              <template #description>
                <template v-if="shown.status === 'ready'">
                  {{ t('Komplet') }}
                </template>
                <template v-else-if="dlParts">
                  {{ dlParts[0] }}<a-typography-text type="danger">
                    {{ dlParts[1] }}
                  </a-typography-text>{{ dlParts[2] }}
                </template>
                <template v-else>
                  {{ dl.text }}
                </template>
              </template>
            </a-list-item-meta>
            <template #actions>
              <span>{{ t('Kundens svarfrist') }}</span>
            </template>
          </a-list-item>
          <!-- Spørgsmål fra kunden -->
          <a-list-item v-else-if="item === 'questions'">
            <a-list-item-meta :title="shown.openQuestions + ' ' + t('spørgsmål fra kunden venter på svar')" />
            <template #actions>
              <a-button
                class="cw-link"
                type="link"
                size="small"
                @click="openRequestCase(shown, 'ws-dialog-title')"
              >
                {{ t('Åbn dialogen') }}
              </a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>
      <a-typography-paragraph
        v-if="isNordhavn && shown.closed === 'submitted'"
        type="secondary"
      >
        {{ t('Skal kunden levere mere, trækkes indstillingen tilbage i sagen med en årsag.') }}
      </a-typography-paragraph>
      <div
        v-if="events.length > 0"
        @keydown="onFoldKeydown"
      >
        <a-collapse
          ghost
          :expand-icon="collapseExpandIcon"
        >
          <a-collapse-panel
            key="activity"
            :header="t('Aktivitet') + ' (' + events.length + ')'"
          >
            <a-list
              size="small"
              :data-source="events"
            >
              <template #renderItem="{ item: a }">
                <a-list-item>
                  <span>{{ a.raw ? a.t : t(a.t) }}</span>
                  <template #actions>
                    <a-tooltip :title="CW.fmtWhen(a.at)">
                      <span>{{ F.shortDate(a.at) }}</span>
                    </a-tooltip>
                  </template>
                </a-list-item>
              </template>
            </a-list>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </template>
    <template #footer>
      <a-row
        v-if="shown"
        justify="space-between"
        align="middle"
      >
        <div>
          <a-button
            v-if="isNordhavn && shown.closed === 'declined'"
            :title="t('Afslaget gemmes i sagens historik')"
            @click="reopen"
          >
            {{ t('Genoptag sag') }}
          </a-button>
        </div>
        <a-space>
          <a-button
            v-if="!primary.open"
            @click="openCase(shown.caseId)"
          >
            {{ t('Åbn sag') }}
          </a-button>
          <a-button
            type="primary"
            @click="primary.on"
          >
            {{ primary.l }}
          </a-button>
        </a-space>
      </a-row>
    </template>
  </a-modal>
</template>
