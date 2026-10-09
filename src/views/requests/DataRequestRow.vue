<script setup>
// Én anmodning i listen: firmanavnet og én grå linje; til højre ansvarlig og svarfrist i grå og
// handlingen efter tilstand. Et klik på rækken (eller navnet) åbner detaljerne.
// Knappernes forklaringer er title (ikke a-tooltip), så de også læses op som beskrivelse af knappen.
import { computed } from 'vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { CLOSED_HELP, openRequestCase, requestMeta, sendReminders } from '@/domain/requests'
import { openCase } from '@/composables/useNavigation'

const props = defineProps({
  request: { type: Object, required: true },
})
const emit = defineEmits(['select'])

const dl = computed(() => DATA.fmt.deadline(props.request.deadline))
const closed = computed(() => props.request.status === 'closed')
const late = computed(() => props.request.sentAt && dl.value.overdue && props.request.status !== 'ready' && !closed.value)
const showDl = computed(() => props.request.deadline && !closed.value && props.request.status !== 'ready')
// Til højre: "Jonas K. · svarfrist 05-10-2026" (+ et rødt "overskredet")
const cat = computed(() => (props.request.owner || '-') + (showDl.value ? ' - ' + t('svarfrist') + ' ' + dl.value.date : ''))

// Handlingen efter tilstand: lukket, til gennemgang, påmind, komplet, ikke sendt
const action = computed(() => {
  const r = props.request
  if (closed.value) return { l: t('Åbn sag'), aria: t('Åbn sag') + ' ' + r.company, title: t(CLOSED_HELP), on: () => openCase(r.caseId) }
  if (r.toReview > 0) return { l: t('Gennemgå') + ' (' + r.toReview + ')', aria: t('Gennemgå') + ' ' + r.toReview + ' ' + t('punkter fra') + ' ' + r.company, on: () => openRequestCase(r, 'ws-outstanding') }
  if (r.status === 'active' || r.status === 'stuck' || r.status === 'waiting') return { l: t('Påmind'), aria: t('Påmind') + ' ' + (r.contact || r.company), on: () => sendReminders([r]) }
  if (r.status === 'ready') return { l: t('Åbn sag'), aria: t('Åbn sag') + ' ' + r.company, on: () => openCase(r.caseId) }
  return { l: t('Vælg materiale'), aria: t('Vælg materiale til') + ' ' + r.company, title: t('Åbner sagen. Anmodningen sendes derfra.'), on: () => openRequestCase(r, 'ws-material') }
})
</script>

<template>
  <a-list-item
    class="req-row"
    @click="emit('select')"
  >
    <a-list-item-meta :description="requestMeta(request)">
      <template #title>
        <a-button
          class="cw-link"
          type="link"
          size="small"
          aria-haspopup="dialog"
          :title="t('Vis detaljer')"
          @click.stop="emit('select')"
        >
          {{ request.company }}
        </a-button>
        <a-button
          v-if="request.openQuestions > 0 && !closed"
          type="link"
          size="small"
          :title="t('Åbn dialogen med kunden')"
          @click.stop="openRequestCase(request, 'ws-dialog-title')"
        >
          {{ request.openQuestions }} {{ request.openQuestions === 1 ? t('spørgsmål åbent') : t('spørgsmål åbne') }}
        </a-button>
      </template>
    </a-list-item-meta>
    <template #actions>
      <a-tooltip :title="showDl ? t('Kundens svarfrist') : undefined">
        <span>
          {{ cat }}<template v-if="late">
            - <a-typography-text type="danger">{{ t('overskredet') }}</a-typography-text>
          </template>
        </span>
      </a-tooltip>
      <a-button
        :aria-label="action.aria"
        :title="action.title"
        @click.stop="action.on"
      >
        {{ action.l }}
      </a-button>
    </template>
  </a-list-item>
</template>

<style scoped>
/* Hele rækken kan klikkes med musen (navnet er vejen med tastaturet) */
.req-row {
  cursor: pointer;
}
</style>
