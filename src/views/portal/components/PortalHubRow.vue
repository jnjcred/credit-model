<script setup>
// Én række pr. punkt på kundens oversigt (new_case_portal.jsx: PortalHubRow, L1725–1863): statusikon,
// fed titel med statusordet for skærmlæsere og højst én grå linje. Et manglende punkt er én knap hele
// vejen hen (klassen cwp-rowbtn), der åbner punktet. Et spørgsmål har "Svar"; et punkt hos en hjælper
// "Send selv" og "Tag tilbage"; et sendt punkt en mærkat og en knap til detaljerne (filer, svar,
// bemærkninger og handlingerne ret, download, træk adgangen tilbage og fortryd).
// Skrivebeskyttet (sagen er hos kreditkomitéen): det, der ikke er sendt, står neutralt som "Ikke sendt",
// og der er ingen handlinger ud over detaljerne.
//
// Props: it (punktet), status (punktets status set fra kunden), readOnly, narrow (smal skærm: mærkaten
//        står under titlen i stedet for til højre), demo (demoknapperne til Regnskabs kilder må vises).
// Emits: open(id) (åbn punktets side).
// Krogene fra før er bevaret: data-row på rækken, data-act="answer" og "add-file", cwp-rowbtn,
// cwp-row-side, cwp-receipt og cwp-row-draft. Kundehandlinger bærer data-cust-act (forhåndsvisningens spærre).
// Demoknapperne (PortalSourceDemo) står under rækken og detaljerne, aldrig inde i rækkens knap: ved
// Periodetal (forbind e-conomic eller upload saldobalancen som PDF), budgettet og årsrapporterne. Ikke på
// en låst sag.
// Ikke porteret: menuen "⋯" (død: intet åbnede den).
// Filerne i detaljerne: navnet står som tekst (brydes på smalle skærme) med en "Åbn"-knap ved siden af
// (før var navnet selv knappen); samme handling.
import { computed, ref } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csAnswersText, csConfirmUndo, csDraft, csSourceText } from '@/domain/customer'
import { ncFill, portalKind } from '@/domain/new_case_portal'
import { useCaseVersion } from '@/composables/useCaseVersion'
import PortalStatusIcon from './PortalStatusIcon.vue'

const props = defineProps({
  it: { type: Object, required: true },
  status: { type: String, required: true },
  readOnly: { type: Boolean, default: false },
  narrow: { type: Boolean, default: false },
  demo: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])

const version = useCaseVersion()
const adv = 'EIFO'   // kunden skriver til og hører fra EIFO; rådgiverens navn står kun på kontaktkortet
const kind = computed(() => portalKind(props.it.id))
// Skrivebeskyttet: det, der ikke er sendt, står som "Ikke sendt"
const status = computed(() => (props.readOnly && ['pending', 'rejected', 'delegated'].includes(props.status) ? 'closed' : props.status))
const row = computed(() => {
  version.value
  const s = CW.itemState(props.it.id)
  return {
    s,
    files: (s && s.files) || [],
    draft: status.value === 'pending' ? csDraft(props.it.id) : null,
    consent: CW.consent(),
    sourceText: csSourceText(s),
    answers: csAnswersText(s),
  }
})
const s = computed(() => row.value.s)
const delivered = computed(() => ['received', 'approved', 'noted'].includes(status.value))
const clickable = computed(() => status.value === 'pending')
const answered = computed(() => !!s.value && !!s.value.answer)
const statusWord = computed(() => ({
  pending: t('Mangler'),
  received: t('Afventer godkendelse af EIFO'),
  noted: answered.value ? t('Svar sendt') : t('Bemærkning sendt'),
  delegated: s.value && s.value.delegate && s.value.delegate.role === 'bank' ? t('Hos jeres bank') : t('Hos jeres revisor'),
  approved: t('Godkendt'),
  rejected: ncFill(t('Spørgsmål fra {adv}'), { adv }),
  closed: t('Ikke sendt'),
}[status.value]))
// Den ene grå linje: kun det, kunden kan bruge. Hvem, hvornår og hvor mange filer står i detaljerne
const meta = computed(() => {
  const st = status.value
  const x = s.value
  if (st === 'pending') return row.value.draft ? null : t(props.it.desc)
  if (st === 'closed') return t('Ikke sendt')
  if (st === 'received' || st === 'approved') return row.value.sourceText || null
  if (st === 'noted') return answered.value ? t('Svar sendt') : t('Bemærkning sendt')
  if (st === 'rejected') return x.reviewNote ? ncFill(t('{adv} spørger:'), { adv }) + ' ' + x.reviewNote : ncFill(t('{adv} beder om en ny version'), { adv })
  if (st === 'delegated' && x.delegate) return ncFill(x.delegate.role === 'bank' ? t('Hos jeres bank: {name}') : t('Hos jeres revisor: {name}'), { name: x.delegate.name })
  return null
})
// Mærkaten: sendt, men ikke gennemgået endnu, eller godkendt (skærmlæsere får samme ord fra statusWord)
const badge = computed(() => (status.value === 'approved' ? { status: 'success', text: t('Godkendt') }
  : status.value === 'received' || status.value === 'noted' ? { status: 'warning', text: t('Afventer godkendelse af EIFO') }
  : null))
const optional = computed(() => props.it.tag === 'Valgfri' && (status.value === 'pending' || status.value === 'closed'))
const side = computed(() => !clickable.value && (status.value === 'rejected' || status.value === 'delegated' || delivered.value))
const label = computed(() => t(props.it.label))
</script>

<template>
  <a-list-item :data-row="it.id">
    <div class="hub-item">
      <div class="hub-row cwp-row">
        <a-button
          v-if="clickable"
          type="text"
          size="middle"
          class="cwp-rowbtn"
          @click="emit('open', it.id)"
        >
          <PortalStatusIcon :status="status" />
          <span class="hub-text">
            <a-typography-text strong>
              {{ label }}<span class="sr-only">{{ ': ' + statusWord }}</span>
            </a-typography-text>
            <a-typography-text
              v-if="row.draft"
              type="secondary"
              class="cwp-row-draft"
            >{{ t('Påbegyndt, ikke sendt endnu') }}</a-typography-text>
            <a-typography-text
              v-else-if="meta"
              type="secondary"
            >{{ meta }}</a-typography-text>
          </span>
          <a-typography-text
            v-if="optional"
            type="secondary"
          >
            {{ t('Valgfri') }}
          </a-typography-text>
          <a-typography-text
            type="secondary"
            class="hub-chevron"
          >
            <RightOutlined aria-hidden="true" />
          </a-typography-text>
        </a-button>
        <div
          v-else
          class="hub-body"
        >
          <PortalStatusIcon :status="status" />
          <span class="hub-text">
            <a-typography-text
              strong
              :type="delivered ? 'secondary' : undefined"
            >
              {{ label }}<span class="sr-only">{{ ': ' + statusWord }}</span>
            </a-typography-text>
            <a-typography-text
              v-if="meta"
              type="secondary"
            >{{ meta }}</a-typography-text>
            <!-- På smalle skærme står mærkaten under titlen (til højre er der ikke plads) -->
            <a-badge
              v-if="badge && narrow"
              :status="badge.status"
              :text="badge.text"
              aria-hidden="true"
            />
          </span>
          <a-typography-text
            v-if="optional"
            type="secondary"
          >
            {{ t('Valgfri') }}
          </a-typography-text>
        </div>
        <div
          v-if="side"
          class="cwp-row-side"
        >
          <a-button
            v-if="status === 'rejected'"
            type="text"
            data-act="answer"
            :aria-label="t('Svar') + ': ' + label"
            @click="emit('open', it.id)"
          >
            {{ t('Svar') }}
          </a-button>
          <template v-if="status === 'delegated'">
            <a-button
              type="text"
              :aria-label="t('Send selv') + ': ' + label"
              @click="emit('open', it.id)"
            >
              {{ t('Send selv') }}
            </a-button>
            <a-button
              type="text"
              data-cust-act="undo"
              :aria-label="t('Tag tilbage') + ': ' + label"
              @click="csConfirmUndo(it.id)"
            >
              {{ t('Tag tilbage') }}
            </a-button>
          </template>
          <a-badge
            v-if="badge && !narrow"
            :status="badge.status"
            :text="badge.text"
            aria-hidden="true"
          />
          <!-- Efter afsendelse går ">" ind på punktets side, med den grønne bekræftelse -->
          <a-button
            v-if="delivered"
            class="hub-open"
            type="text"
            size="small"
            :title="t('Åbn')"
            :aria-label="t('Åbn') + ' ' + label"
            @click="emit('open', it.id)"
          >
            <template #icon>
              <RightOutlined aria-hidden="true" />
            </template>
          </a-button>
        </div>
      </div>
    </div>
  </a-list-item>
</template>

<style scoped>
/* Rækken og detaljerne under den fylder listens linje */
.hub-item {
  flex: 1;
  min-width: 0;
}

/* Titlen til venstre, handlingerne til højre; handlingerne går under titlen på smalle skærme */
.hub-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: flex-start;
}

/* Et manglende punkt er én tekstknap hele vejen hen med ikon, titel og status på flere linjer: højde,
   ombrydning og venstrestilling som afsnitslisten i memoet (antdv's knapper er ellers én linje).
   size="middle": teksten har sidens størrelse, også når portalen bruger store kontroller på telefoner */
.cwp-rowbtn {
  display: flex;
  flex: 1 1 240px;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;
  height: auto;
  padding: 0;
  white-space: normal;
  text-align: left;
}

/* Pilen står midt for rækken, ikke ud for titlen */
.hub-chevron {
  align-self: center;
}

/* Pilen på en afleveret række er lige så lille og dæmpet som den på de andre rækker */
.hub-open {
  padding: 0 4px;
  color: rgba(0, 0, 0, 0.45);
}

.hub-open .anticon {
  font-size: 12px;
}

.hub-body {
  display: flex;
  flex: 1 1 240px;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;
}

.hub-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.cwp-row-side {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-left: auto;
}

/* Detaljerne står under titlen (efter ikonet) */
.cwp-receipt {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0 0 28px;
}

.cwp-receipt:focus {
  outline: none;
}

/* Lange filnavne brydes, så rækken ikke bliver bredere end siden */
.hub-file-name {
  word-break: break-all;
}
</style>
