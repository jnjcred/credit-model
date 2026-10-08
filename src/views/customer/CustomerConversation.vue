<script setup>
// Samtalen mellem kunde og rådgiver (customer_status.jsx: CWConversation; kundens side var
// CWDialogCard, dvs. side "kunde"). Én samtale pr. sag i tidsorden med den nyeste nederst, ens for
// kunde og rådgiver. Samtalen markeres som set, når den vises (ikke i forhåndsvisningen af
// kundesiden). Nye beskeder fra den anden part har mærket "Nyt", så længe visningen er åben.
//
// Props:
//   side      'kunde' (portalen) eller 'rådgiver' (sagens Overblik); påkrævet
//   idPrefix  præfiks for id'erne (standard 'cs'): portalen bruger 'cwp', sagen 'ws'
//   readOnly  låst sag: intet skrivefelt og ingen status
//   variant   'workspace': brev-ikonet før overskriften (sagen)
// Emits: ingen. (Prototypens props compact, bare og note havde ingen kaldere og er ikke porteret.)
// Id'er, som andre skærme bruger: section#<idPrefix>-dialog og overskriften #<idPrefix>-dialog-h
// (tabindex -1). Portalen ruller til #cwp-dialog og fokuserer #cwp-dialog-h.
//
// Rådgiverens mail til kunden (på sagen, og på kundesiden i forhåndsvisningen): emne og tekst
// bygges af beskeden og kan rettes, før den sendes. Felterne står uden <form>, fordi portalens
// forhåndsvisning stopper alle submit-hændelser (Enter i emnefeltet ville ellers give en note).
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { Grid } from 'ant-design-vue'
import { MailOutlined, SendOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csAboutLabel, csAdvisor, csCustomerName, csFill, csFirst, csInitials, csShortDate } from '@/domain/customer'
import { wsPublicTopics } from '@/domain/workspace/publicSources.js'
import { useCase } from '@/composables/useCaseVersion'
import { useSelectEscape } from '@/composables/useSelectEscape'

const props = defineProps({
  side: { type: String, required: true },
  idPrefix: { type: String, default: '' },
  readOnly: { type: Boolean, default: false },
  variant: { type: String, default: '' },
})

const pid = computed(() => props.idPrefix || 'cs')
const advisorSide = computed(() => props.side === 'rådgiver')
const other = computed(() => (props.side === 'kunde' ? 'rådgiver' : 'kunde'))
const ws = computed(() => props.variant === 'workspace')

// Det, der læses af sagens tilstand, følger den (som CW.useCase() før)
const adv = useCase(() => csAdvisor())
const advFirst = computed(() => csFirst(adv.value.name))
const customer = useCase(() => csCustomerName())
const msgs = useCase(() => CW.conversation())
const requested = useCase(() => CW.requestedItems())
// CW.isPreview() er ikke reaktiv: den læses her, som før ved hver gengivelse (portalen tegner
// samtalen forfra, når rollen skifter)
const preview = useCase(() => !!(CW.isPreview && CW.isPreview()))
const request = useCase(() => CW.request())
const waits = useCase(() => CW.conversationWaitsOn())
// Emner fra de offentlige data, som rådgiveren kan spørge kunden om
const publicTopics = useCase(() => (advisorSide.value ? wsPublicTopics() : []))

const text = ref('')
const itemId = ref('')
// Emne uden for punkterne (rådgiverens side), fx "Årsrapport 2024" fra de offentlige data
const about = ref('')
// Mail til kunden, når det er rådgiveren, der skriver: på sagen og i forhåndsvisningen af
// kundens side (Kundeside). Kun når anmodningen er sendt. Som ved "Stil spørgsmål til materialet"
const canMail = computed(() => (advisorSide.value || (props.side === 'kunde' && preview.value)) && !!request.value && !props.readOnly)
const sendMail = ref(false)
const subjectEdit = ref(null)
const bodyEdit = ref(null)

// Beskeder, der var ulæste, da samtalen blev vist. Huskes, så "Nyt" ikke forsvinder i samme
// øjeblik, beskederne markeres som set (før: et sæt, der voksede ved hver gengivelse).
const fresh = shallowRef(new Set())
watch(msgs, (list) => {
  let next = null
  list.forEach(m => {
    if (m.from === other.value && !m.preview && !CW.isMessageRead(m, props.side) && !fresh.value.has(m.key)) {
      if (!next) next = new Set(fresh.value)
      next.add(m.key)
    }
  })
  if (next) fresh.value = next
}, { immediate: true })
const unreadKey = computed(() => msgs.value.filter(m => m.from === other.value && !CW.isMessageRead(m, props.side)).map(m => m.key).join(','))
// Som effekten før: ved visning og hver gang der kommer ulæste beskeder (ikke i forhåndsvisningen af kundesiden)
function markSeen () {
  if (!unreadKey.value || (props.side === 'kunde' && preview.value)) return
  CW.markConversationRead(props.side)
}
onMounted(markSeen)
watch(unreadKey, markSeen, { flush: 'post' })

// Rul til nyeste besked, når der kommer en ny
const listRef = ref(null)
function scrollToNewest () {
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}
onMounted(scrollToNewest)
watch(() => msgs.value.length, scrollToNewest, { flush: 'post' })

// Mailen: emne og tekst bygges af beskeden og kan rettes, før den sendes
const topic = computed(() => (itemId.value ? (CW.itemById(itemId.value) ? t(CW.itemById(itemId.value).label) : '') : about.value ? csAboutLabel(about.value) : ''))
const mailBase = computed(() => {
  const req = request.value
  return canMail.value ? CW.requestMail({ items: [], deadline: req.deadline, to: { name: req.to && req.to.name, email: req.to && req.to.email }, link: req.link }) : null
})
const defSubject = computed(() => (mailBase.value ? (topic.value ? csFill(t('Vi har et spørgsmål til {item}'), { item: topic.value }) : t('Besked fra EIFO')) + ' · ' + mailBase.value.caseLine : ''))
const defBody = computed(() => (mailBase.value ? [
  mailBase.value.greeting, '',
  text.value.trim() || t('[Din besked]'), '',
  t('I kan svare direkte på jeres side hos EIFO:'),
  mailBase.value.link, '',
  adv.value.name,
].join('\n') : ''))
const mailSubject = computed(() => (subjectEdit.value != null ? subjectEdit.value : defSubject.value))
const mailBody = computed(() => (bodyEdit.value != null ? bodyEdit.value : defBody.value))
const mailTo = computed(() => csFill(t('Send også en mail til kunden ({email})'), { email: (request.value && request.value.to && request.value.to.email) || t('kunden') }))

function send () {
  const txt = text.value.trim()
  if (!txt) return
  // I forhåndsvisningen af kundesiden er det rådgiveren, der skriver (fx svarer derinde ved en fejl)
  const asAdvisor = props.side === 'kunde' && preview.value
  if (canMail.value && sendMail.value && !mailBody.value.trim()) return
  // Mailens oplysninger, som de stod, da der blev trykket Send
  const mailed = canMail.value && sendMail.value
  const req = request.value
  const subject = mailSubject.value
  CW.sendMessage(asAdvisor ? 'rådgiver' : props.side, txt, itemId.value || null, (!itemId.value && about.value) || null)
  if (mailed) CW.log('dialog-mail', csFill(t('Mail sendt til {to}: {subject}'), { to: (req.to && (req.to.name || req.to.email)) || t('kunden'), subject }), { who: 'rådgiver', itemId: itemId.value || null })
  CW.markConversationRead(props.side)
  fresh.value = new Set()
  text.value = ''; itemId.value = ''; about.value = ''; sendMail.value = false; subjectEdit.value = null; bodyEdit.value = null
  CW.toast(props.side === 'kunde' && !asAdvisor ? csFill(t('Beskeden er sendt til {navn}'), { navn: advFirst.value })
    : mailed ? t('Beskeden er sendt, og kunden har fået en mail.') : t('Beskeden er sendt til kunden'))
}

// Ctrl+Enter (Cmd+Enter) sender
function onComposerKey (e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send() }
}

// Hvem skrev? Beskeder skrevet i forhåndsvisningen er rådgiverens (D11).
function author (m) {
  const a = adv.value
  const fromAdv = m.from === 'rådgiver' || m.preview
  if (props.side === 'rådgiver') {
    return fromAdv
      ? { name: m.preview ? t('Dig') + ' (' + t('forhåndsvisning') + ')' : t('Dig'), initials: csInitials(a.name) }
      : { name: customer.value, initials: csInitials(customer.value) }
  }
  if (m.preview) return { name: a.name + ' (' + t('forhåndsvisning') + ')', initials: csInitials(a.name) }
  return fromAdv ? { name: a.name, tag: a.org || 'EIFO', initials: csInitials(a.name) } : { name: customer.value, initials: csInitials(customer.value) }
}

// Beskederne, som de vises: afsender, emne (punkt eller emne uden for punkterne) og tekst
const rows = computed(() => msgs.value.map(m => {
  const it = m.itemId ? CW.itemById(m.itemId) : null
  return { m, a: author(m), about: it ? t(it.label) : m.about ? csAboutLabel(m.about) : '' }
}))

// Status som almindelig tekst (S13): fremhævet, når der ventes på denne side, ellers grå
// Svartiden står i kortets hoved; på telefoner (under 576 px) i stedet øverst i kortet, ellers fik titlen
// ingen plads ("Jeres di…")
const screens = Grid.useBreakpoint()
const statusInHead = computed(() => !screens.value.xs)
const status = computed(() => (!msgs.value.length || props.readOnly ? null
  : waits.value === props.side ? { text: props.side === 'kunde' ? t('Venter på jeres svar') : t('Afventer dit svar'), strong: true }
  : waits.value ? { text: props.side === 'kunde' ? csFill(t('{navn} svarer typisk inden for 1 arbejdsdag'), { navn: advFirst.value }) : t('Afventer kunden'), strong: false }
  : null))
const title = computed(() => (props.side === 'kunde' ? csFill(t('Jeres dialog med {navn}'), { navn: advFirst.value }) : t('Dialog med kunden')))
const msgLabel = computed(() => (props.side === 'kunde' ? csFill(t('Besked til {navn}'), { navn: advFirst.value }) : t('Besked til kunden')))
const placeholder = computed(() => (props.side === 'kunde' ? (preview.value ? t('Skriv som rådgiver') : csFill(t('Skriv til {navn}'), { navn: advFirst.value })) : t('Skriv til kunden')))

// "Handler om": sagen generelt, de anmodede punkter og (rådgiverens side) de offentlige data.
// Grupperne vises kun, når der er offentlige emner (som optgroup før). Et emne, der ikke står på
// listerne (fx et dokument, der er slettet siden), står som sin egen mulighed sidst.
const topicValue = computed(() => itemId.value || (about.value ? 'about:' + about.value : ''))
const topicOptions = computed(() => {
  const items = requested.value.map(it => ({ value: it.id, label: t(it.label) }))
  const pub = publicTopics.value
  return [{ value: '', label: t('Sagen generelt') }]
    .concat(pub.length > 0 && items.length > 0 ? [{ label: t('Anmodet materiale'), options: items }] : items)
    .concat(pub.length > 0 ? [{ label: t('Offentlige data'), options: pub.map(a => ({ value: 'about:' + a, label: csAboutLabel(a) })) }] : [])
    .concat(about.value && pub.indexOf(about.value) < 0 ? [{ value: 'about:' + about.value, label: csAboutLabel(about.value) }] : [])
})
function onTopic (v) {
  if (v.indexOf('about:') === 0) { about.value = v.slice(6); itemId.value = '' } else { itemId.value = v; about.value = '' }
}
// Esc i den åbne liste lukker kun listen (også når samtalen står i en a-drawer, fx forhåndsvisningen)
const selectEsc = useSelectEscape()

function resetMail () {
  subjectEdit.value = null
  bodyEdit.value = null
}
</script>

<template>
  <section
    :id="pid + '-dialog'"
    :aria-labelledby="pid + '-dialog-h'"
  >
    <a-card :bordered="!ws">
      <template #title>
        <a-space :size="8">
          <MailOutlined
            v-if="ws"
            aria-hidden="true"
          />
          <span
            :id="pid + '-dialog-h'"
            role="heading"
            aria-level="2"
            tabindex="-1"
          >{{ title }}</span>
        </a-space>
      </template>
      <template
        v-if="status && statusInHead"
        #extra
      >
        <a-typography-text
          class="cs-conv-status"
          :strong="status.strong"
          :type="status.strong ? undefined : 'secondary'"
        >
          {{ status.text }}
        </a-typography-text>
      </template>

      <a-typography-paragraph v-if="status && !statusInHead">
        <a-typography-text
          class="cs-conv-status"
          :strong="status.strong"
          :type="status.strong ? undefined : 'secondary'"
        >
          {{ status.text }}
        </a-typography-text>
      </a-typography-paragraph>
      <a-typography-text
        v-if="!msgs.length"
        class="cs-conv-empty"
        type="secondary"
      >
        {{ readOnly ? t('Ingen beskeder.') : t('Ingen beskeder endnu.') }}
      </a-typography-text>
      <ol
        v-else
        ref="listRef"
        class="cs-conv-list"
        :aria-label="t('Beskeder')"
      >
        <li
          v-for="r in rows"
          :key="r.m.key"
        >
          <a-comment>
            <template #avatar>
              <a-avatar
                :size="24"
                aria-hidden="true"
              >
                {{ r.a.initials }}
              </a-avatar>
            </template>
            <template #author>
              <span>
                <a-typography-text strong>{{ r.a.name }}</a-typography-text>
                {{ ' ' }}
                <template v-if="fresh.has(r.m.key)">
                  <a-tag color="blue">{{ t('Nyt') }}</a-tag>{{ ' ' }}
                </template>
                <template v-if="r.a.tag">{{ r.a.tag }}{{ ' ' }}</template>
                <span :title="CW.fmtWhen(r.m.at)">{{ csShortDate(r.m.at) }}</span>
                <template v-if="r.about"> · {{ r.about }}</template>
              </span>
            </template>
            <template #content>
              <p>{{ r.m.text }}</p>
            </template>
          </a-comment>
        </li>
      </ol>

      <template v-if="!readOnly">
        <a-divider />
        <label
          :for="pid + '-msg'"
          class="sr-only"
        >{{ msgLabel }}</label>
        <a-textarea
          :id="pid + '-msg'"
          v-model:value="text"
          :rows="2"
          :placeholder="placeholder"
          aria-keyshortcuts="Control+Enter"
          @keydown="onComposerKey"
        />
        <div class="cs-conv-row">
          <label :for="pid + '-msg-item'">
            <a-typography-text type="secondary">{{ t('Handler om') }}</a-typography-text>
          </label>
          <div
            class="cs-conv-topic"
            @keydown.capture="selectEsc.onKeydownCapture"
            @keydown="selectEsc.onKeydown"
          >
            <a-select
              :id="pid + '-msg-item'"
              class="cs-conv-topic-select"
              :value="topicValue"
              :options="topicOptions"
              :dropdown-match-select-width="false"
              @change="onTopic"
            />
          </div>
          <!-- Først primær, når der er skrevet noget; ellers er sidens egen næste-knap den eneste blå -->
          <a-button
            class="cs-conv-send"
            :type="text.trim() ? 'primary' : 'default'"
            :disabled="!text.trim()"
            :title="t('Ctrl+Enter sender')"
            @click="send"
          >
            <template #icon>
              <SendOutlined aria-hidden="true" />
            </template>
            {{ canMail && sendMail ? t('Send besked og mail') : t('Send') }}
          </a-button>
        </div>

        <div
          v-if="canMail"
          class="cs-conv-mail"
        >
          <a-checkbox v-model:checked="sendMail">
            {{ mailTo }}
          </a-checkbox>
          <template v-if="sendMail">
            <div class="cs-conv-subject">
              <label :for="pid + '-mail-subject'">
                <a-typography-text type="secondary">{{ t('Emne') }}</a-typography-text>
              </label>
              <a-input
                :id="pid + '-mail-subject'"
                class="cs-conv-subject-input"
                :value="mailSubject"
                @update:value="(v) => { subjectEdit = v }"
              />
            </div>
            <a-textarea
              :value="mailBody"
              :rows="8"
              :aria-label="t('Mailens tekst')"
              @update:value="(v) => { bodyEdit = v }"
            />
            <div class="cs-conv-mail-foot">
              <a-typography-text type="secondary">
                {{ bodyEdit == null ? t('Mailen følger din besked. Ret den her, hvis den skal lyde anderledes.') : '' }}
              </a-typography-text>
              <a-button
                v-if="subjectEdit != null || bodyEdit != null"
                type="link"
                @click="resetMail"
              >
                {{ t('Gendan standardtekst') }}
              </a-button>
            </div>
          </template>
        </div>
      </template>
    </a-card>
  </section>
</template>

<style scoped>
/* Beskederne ruller i deres egen boks; den nyeste står nederst */
.cs-conv-list {
  max-height: 380px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.cs-conv-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.cs-conv-topic,
.cs-conv-topic-select {
  max-width: 100%;
}

.cs-conv-send {
  margin-left: auto;
}

.cs-conv-mail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.cs-conv-subject {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cs-conv-subject-input {
  flex: 1;
  min-width: 0;
}

.cs-conv-mail-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
