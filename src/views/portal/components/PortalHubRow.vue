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
//        står under titlen i stedet for til højre).
// Emits: open(id) (åbn punktets side).
// Krogene fra før er bevaret: data-row på rækken, data-act="answer" og "add-file", cwp-rowbtn,
// cwp-row-side, cwp-receipt og cwp-row-draft. Kundehandlinger bærer data-cust-act (forhåndsvisningens spærre).
// Ikke porteret: menuen "⋯" (død: intet åbnede den).
// Filerne i detaljerne: navnet står som tekst (brydes på smalle skærme) med en "Åbn"-knap ved siden af
// (før var navnet selv knappen); samme handling.
import { computed, ref } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csAnswersText, csCanUndo, csConfirmUndo, csDraft, csOpenFile, csShortDate, csSourceText } from '@/domain/customer'
import { PORTAL_CONTACT, downloadFiles, ncFill, portalConsentUntil, portalKind, portalRevoke } from '@/domain/new_case_portal'
import { useCaseVersion } from '@/composables/useCaseVersion'
import PortalStatusIcon from './PortalStatusIcon.vue'

const props = defineProps({
  it: { type: Object, required: true },
  status: { type: String, required: true },
  readOnly: { type: Boolean, default: false },
  narrow: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])

const version = useCaseVersion()
const adv = PORTAL_CONTACT.first
const receipt = ref(false)
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
const editLabel = computed(() => (status.value === 'noted' ? t('Send en fil i stedet') : kind.value === 'trade' ? t('Ret svaret') : kind.value === 'connect' ? t('Se forbindelsen eller upload') : t('Tilføj eller fjern filer')))
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
          <a-typography-text type="secondary">
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
          <a-button
            v-if="delivered"
            type="text"
            :aria-expanded="receipt"
            :title="receipt ? t('Skjul detaljerne') : t('Vis detaljerne')"
            :aria-label="ncFill(receipt ? t('Skjul detaljerne for {item}') : t('Vis detaljerne for {item}'), { item: label })"
            @click="receipt = !receipt"
          >
            <template #icon>
              <RightOutlined
                :rotate="receipt ? 90 : 0"
                aria-hidden="true"
              />
            </template>
          </a-button>
        </div>
      </div>
      <div
        v-if="receipt && s"
        class="cwp-receipt"
        role="region"
        tabindex="-1"
        :aria-label="ncFill(t('Detaljer for {item}'), { item: label })"
      >
        <div
          v-for="f in row.files"
          :key="f.id"
          class="hub-file"
        >
          <span class="hub-file-name">{{ f.name }}</span>
          <a-button
            type="link"
            class="cwp-linkbtn"
            :aria-label="t('Åbn') + ' ' + f.name"
            @click="csOpenFile(f)"
          >
            {{ t('Åbn') }}
          </a-button>
          <div>
            <a-typography-text type="secondary">
              {{ (f.by || s.by) === 'rådgiver' ? ncFill(t('Tilføjet af {adv}'), { adv }) : t('Uploadet af jer') }} {{ csShortDate(f.at) }}
            </a-typography-text>
          </div>
        </div>
        <div v-if="row.answers">
          <a-typography-text type="secondary">
            {{ t('Jeres svar:') }}
          </a-typography-text> {{ row.answers }}
        </div>
        <a-typography-text
          v-if="!row.files.length && !row.answers && status !== 'noted'"
          type="secondary"
        >
          {{ t('Ingen filer') }}
        </a-typography-text>
        <div v-if="s.note && !row.sourceText">
          <a-typography-text type="secondary">
            {{ t('Jeres bemærkning:') }}
          </a-typography-text> {{ s.note }}
        </div>
        <div v-if="answered && s.question">
          <a-typography-text type="secondary">
            {{ ncFill(t('{adv} spurgte:'), { adv }) }}
          </a-typography-text> {{ s.question }}
        </div>
        <div v-if="answered">
          <a-typography-text type="secondary">
            {{ ncFill(t('Jeres svar til {adv}:'), { adv }) }}
          </a-typography-text> {{ s.answer }}
        </div>
        <div v-if="row.sourceText && row.consent">
          <a-typography-text type="secondary">
            {{ row.sourceText }} · {{ portalConsentUntil(row.consent) }}
          </a-typography-text>
        </div>
        <a-space
          wrap
          :size="4"
          class="hub-receipt-acts"
        >
          <a-button
            v-if="status !== 'approved' && !readOnly"
            type="text"
            :data-act="status === 'received' && kind !== 'trade' ? 'add-file' : undefined"
            @click="emit('open', it.id)"
          >
            {{ editLabel }}
          </a-button>
          <a-button
            v-if="row.files.length > 0"
            type="text"
            @click="downloadFiles(row.files)"
          >
            {{ t('Download') }}
          </a-button>
          <a-button
            v-if="readOnly && kind === 'connect' && row.consent"
            type="text"
            data-cust-act="consent"
            @click="portalRevoke(row.consent)"
          >
            {{ t('Træk adgangen tilbage') }}
          </a-button>
          <a-button
            v-if="csCanUndo(s) && !readOnly"
            type="text"
            data-cust-act="undo"
            @click="csConfirmUndo(it.id)"
          >
            {{ status === 'noted' ? t('Fortryd bemærkning') : t('Fortryd') }}
          </a-button>
        </a-space>
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
