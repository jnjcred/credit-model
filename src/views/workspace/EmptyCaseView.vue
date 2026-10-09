<script setup>
// Sager uden levende data (WSEmptyCase i workspace.jsx L879–985): en ærlig tom tilstand med sagens
// egne oplysninger i stedet for en anden virksomheds tal. Seks varianter: ukendt sag, demosag med
// sendt anmodning, demosag med gemt anmodning, tom demosag, anden sag for samme virksomhed og anden
// virksomhed. En sag fra Ny sag-guiden viser den anmodning, guiden gemte, og kan sende den
// (afsendelsen simuleres; anmodningen står derefter som sendt). Logikken står i
// src/domain/workspace/header.js (wsEmptyCase).
//
// Props: caseData (sagen, wsCaseData), back ({ route, label } fra sessionStorage 'cw_back', eller null).
// Emits: go-back: tilbage til skærmen i back, ellers Mine opgaver (sagen gør det med wsGoBack).
import { computed, ref } from 'vue'
import { Empty } from 'ant-design-vue'
import { ArrowRightOutlined, SendOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { go } from '@/composables/useNavigation'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { wsFill } from '@/domain/workspace/format'
import { wsEmptyCase } from '@/domain/workspace/header'

const props = defineProps({
  caseData: { type: Object, required: true },
  back: { type: Object, default: null },
})
const emit = defineEmits(['go-back'])

const caseVersion = useCaseVersion()
const showMail = ref(false)
const m = computed(() => {
  caseVersion.value
  return wsEmptyCase(props.caseData, showMail.value)
})

// Den gemte anmodning: modtager og svarfrist (WSEmptyCase L940–941)
const recipient = computed(() => {
  const req = m.value.req
  if (!req) return ''
  return (req.to && (req.to.name || req.to.email) ? wsFill(t('Til {name}'), { name: [req.to.name, req.to.role ? t(req.to.role) : '', req.to.email].filter(Boolean).join(', ') }) : t('Modtager er ikke udfyldt'))
    + (req.deadline ? ' - ' + wsFill(t('Svarfrist {date}'), { date: CW.fmtDate(req.deadline) }) : '')
})
const reqTitle = computed(() => (m.value.sent ? wsFill(t('Anmodning sendt {when}'), { when: CW.fmtWhen(m.value.req.sentAt) }) : t('Gemt anmodning, ikke sendt')))
</script>

<template>
  <div class="ws-empty">
    <a-card>
      <a-empty :image="Empty.PRESENTED_IMAGE_SIMPLE">
        <template #description>
          <a-typography-title
            id="ws-demo-title"
            :level="2"
            tabindex="-1"
          >
            {{ m.heading }}
          </a-typography-title>
          <a-typography-paragraph type="secondary">
            {{ m.text }}
          </a-typography-paragraph>
        </template>

        <div class="ws-empty-details">
          <!-- Én oplysning pr. række (som de andre skærmes a-descriptions): etiket og værdi læses i
               samme rækkefølge som før, og værdierne brydes ikke midt i ordet. Prototypen viste dem i
               et gitter med tre kolonner. -->
          <a-descriptions
            v-if="m.facts.length > 0"
            bordered
            size="small"
            :column="1"
          >
            <a-descriptions-item
              v-for="f in m.facts"
              :key="f.label"
              :label="f.label"
            >
              {{ f.value }}
            </a-descriptions-item>
          </a-descriptions>

          <a-card
            v-if="m.req"
            size="small"
            :title="reqTitle"
          >
            <a-typography-paragraph type="secondary">
              {{ recipient }}
            </a-typography-paragraph>
            <a-list
              size="small"
              :data-source="m.reqItems"
              row-key="id"
            >
              <template #renderItem="{ item: it }">
                <a-list-item>
                  <div>
                    <a-typography-text strong>
                      {{ t(it.label) }}
                    </a-typography-text>
                    <a-typography-text
                      v-if="it.tag === 'Valgfri'"
                      type="secondary"
                    >
                      {{ ' (' + t('valgfri') + ')' }}
                    </a-typography-text>
                    <a-typography-text
                      v-if="m.sent"
                      type="secondary"
                    >
                      {{ ' ' + (it.tag === 'Valgfri' ? t('Ikke modtaget, ikke påkrævet') : t('Afventer')) }}
                    </a-typography-text>
                    <div v-if="it.why">
                      <a-typography-text type="secondary">
                        {{ t('Hvorfor:') + ' ' + t(it.why) }}
                      </a-typography-text>
                    </div>
                  </div>
                </a-list-item>
              </template>
            </a-list>
            <a-typography-paragraph
              v-if="m.sent"
              type="secondary"
            >
              {{ t('Kunden har ikke sendt noget endnu.') }}
            </a-typography-paragraph>
            <a-typography-paragraph
              v-if="m.next"
              strong
            >
              {{ t('Næste') + ': ' + t(m.next) }}
            </a-typography-paragraph>
            <a-card
              v-if="m.mail"
              size="small"
              type="inner"
              :title="m.mail.subject + ' - ' + t('Sagsnr.') + ' ' + caseData.caseNr"
            >
              <a-typography-paragraph>{{ m.mail.greeting }}</a-typography-paragraph>
              <a-typography-paragraph type="secondary">
                {{ m.mail.intro }}
              </a-typography-paragraph>
              <a-typography-paragraph v-if="m.mail.deadlineLine">
                {{ m.mail.deadlineLine }}
              </a-typography-paragraph>
              <a-typography-text type="secondary">
                {{ m.mail.link }}
              </a-typography-text>
            </a-card>
          </a-card>
        </div>

        <a-space
          wrap
          class="ws-empty-actions"
        >
          <template v-if="m.req">
            <a-button
              v-if="!m.sent"
              type="primary"
              @click="m.sendDemo"
            >
              <template #icon>
                <SendOutlined aria-hidden="true" />
              </template>
              {{ t('Send anmodningen') }}
            </a-button>
            <a-button
              :aria-expanded="showMail"
              @click="showMail = !showMail"
            >
              {{ showMail ? t('Skjul mailen') : t('Vis mailen') }}
            </a-button>
          </template>
          <a-button
            :type="m.req && !m.sent ? 'default' : 'primary'"
            @click="go('workspace:' + m.live.id)"
          >
            {{ wsFill(t('Åbn sag {nr} for {company}'), { nr: m.live.caseNr, company: DATA.COMPANY.name }) }}
            <ArrowRightOutlined aria-hidden="true" />
          </a-button>
          <a-button @click="emit('go-back')">
            {{ back ? wsFill(t('Tilbage til {page}'), { page: t(back.label) }) : t('Tilbage til Mine opgaver') }}
          </a-button>
        </a-space>
      </a-empty>
    </a-card>
  </div>
</template>

<style scoped>
.ws-empty {
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 32px 80px;
}

/* Sagens oplysninger og den gemte anmodning står venstrestillet under den centrerede tekst */
.ws-empty-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.ws-empty-actions {
  justify-content: center;
  margin-top: 24px;
}

/* Overskriften får fokus efter afsendelsen (ingen ramme om en overskrift) */
[tabindex="-1"]:focus {
  outline: none;
}

@media (max-width: 999px) {
  .ws-empty {
    padding: 24px 16px 64px;
  }
}
</style>
