<script setup>
// Det, der står, når en række i Overblikkets materialetabeller foldes ud (MaterialTable.vue). Under
// Materiale: filerne (hver med hvem og hvornår, og fjern), et svar uden fil, din besked eller dit spørgsmål
// til kunden, kundens bemærkning og svar, salg pr. land, "Upload for kunden" / "Tilføj fil",
// historikken (anmodet, påmindet, modtaget, godkendt ...) og den interne note, som kun rådgivere ser.
// Teksterne og handlingerne kommer fra wsOutstandingItem (m) og wsItemTimeline.
//
// Props: e (rækken fra wsCustomerList), m (wsOutstandingItem for rækken), kind ('review', 'waiting'
// eller 'done'), locked, editing (den interne note redigeres), draft (notens tekst under redigering).
// Emits: upload (vælg filer for kunden), edit-note, save-note, cancel-note, update:draft.
import { computed } from 'vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { wsFill } from '@/domain/workspace/format'
import { wsItemTimeline } from '@/domain/workspace/overview'
import { useCaseVersion } from '@/composables/useCaseVersion'
import CountrySplitTable from './CountrySplitTable.vue'

const props = defineProps({
  e: { type: Object, required: true },
  m: { type: Object, required: true },
  kind: { type: String, required: true },
  locked: { type: Boolean, default: false },
  editing: { type: Boolean, default: false },
  draft: { type: String, default: '' },
})
const emit = defineEmits(['upload', 'edit-note', 'save-note', 'cancel-note', 'update:draft'])

const caseVersion = useCaseVersion()
const id = computed(() => props.e.it.id)
const s = computed(() => props.e.s || {})
const h = computed(() => {
  caseVersion.value
  return wsItemTimeline(id.value)
})
const fileUrl = (f) => CW.fileUrl(f.id)
// Din besked til kunden: et spørgsmål, du har lagt i anmodningen; dit spørgsmål til materialet
const message = computed(() => props.e.it.question || '')
const question = computed(() => (s.value.status === 'rejected' && s.value.reviewNote) || '')
// Kundens bemærkning (eller din, da du uploadede for kunden). Ved et svar uden fil er bemærkningen svaret selv.
const remark = computed(() => (s.value.note && s.value.status !== 'noted' && s.value.noteKind !== 'system'
  ? { label: props.m.supplierNote ? props.m.supplierNote.label : t('Kundens bemærkning:'), text: s.value.note }
  : null))
// Sendt videre til revisor, rådgiver eller bank
const delegated = computed(() => (s.value.status === 'delegated' ? props.m.meta : ''))
// Upload for kunden, eller en fil mere, mens punktet er åbent
const uploadLabel = computed(() => {
  if (props.locked || props.m.quiet || props.kind === 'done') return ''
  if (props.m.can.upload) return t('Upload for kunden')
  if (props.m.status === 'received') return t('Tilføj fil')
  return ''
})
const inote = computed(() => props.m.inote)
// Står der noget under Materiale?
const hasMaterial = computed(() => props.m.files.length > 0 || !!props.m.lead || !!delegated.value || !!message.value
  || !!question.value || !!remark.value || !!props.m.answer || !!props.m.countries || !!uploadLabel.value)
// Hent alle filerne fra én hændelse i historikken (én ad gangen, som "Hent alle" under Dokumenter)
function urlsOf (r) {
  return r.names.map(n => h.value.fileUrl(n, r.tone === 'gone')).filter(Boolean)
}
function downloadAll (r) {
  urlsOf(r).forEach((url, i) => setTimeout(() => {
    const a = document.createElement('a')
    a.href = url
    a.download = r.names[i] || ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, i * 350))
}
</script>

<template>
  <div class="ws-md">
    <!-- Materiale: filerne (eller svaret uden fil), bemærkninger og spørgsmål, og upload for kunden -->
    <div
      v-if="hasMaterial"
      class="ws-md-sec"
    >
      <a-typography-text strong>
        {{ t('Materiale') }}
      </a-typography-text>
      <!-- Filerne: navnet (kan hentes, så længe den ligger på punktet) og hvem og hvornår -->
      <div
        v-for="(f, i) in m.files"
        :key="f.id"
        class="ws-md-file"
      >
        <div>
          <a-typography-link
            v-if="fileUrl(f)"
            :href="fileUrl(f)"
            target="_blank"
            rel="noopener noreferrer"
            :title="f.name + (f.sizeLabel ? ' (' + f.sizeLabel + ')' : '')"
          >
            {{ f.name }}
          </a-typography-link>
          <a-tooltip
            v-else
            :title="t('Filen findes kun i den fane, hvor den blev uploadet')"
          >
            <a-typography-text>{{ f.name }}</a-typography-text>
          </a-tooltip>
          <a-button
            v-if="m.canRemove(f)"
            type="text"
            size="small"
            :title="t('Fjern')"
            :aria-label="wsFill(t('Fjern {file}'), { file: f.name })"
            @click="m.removeFile(f)"
          >
            <template #icon>
              <CloseOutlined aria-hidden="true" />
            </template>
          </a-button>
        </div>
        <a-tooltip :title="m.fileWhen(f) ? CW.fmtWhen(m.fileWhen(f)) : undefined">
          <a-typography-text type="secondary">
            {{ m.fileMeta(f, i) }}
          </a-typography-text>
        </a-tooltip>
      </div>

      <!-- Uden fil: kundens svar ("Kunden har ingen fil: ...") eller "Markeret som sendt uden fil" -->
      <div v-if="!m.files.length && m.lead">
        <a-typography-text type="secondary">
          {{ m.lead.label }}
        </a-typography-text>
        <template v-if="m.lead.text">
          {{ ' ' + m.lead.text }}
        </template>
      </div>
      <div v-if="delegated">
        <a-typography-text type="secondary">
          {{ delegated }}
        </a-typography-text>
      </div>
      <div v-if="message">
        <a-typography-text type="secondary">
          {{ t('Din besked til kunden:') }}
        </a-typography-text>
        {{ ' ' + message }}
      </div>
      <div v-if="question">
        <a-typography-text type="secondary">
          {{ t('Dit spørgsmål:') }}
        </a-typography-text>
        {{ ' ' + question }}
      </div>
      <div v-if="remark">
        <a-typography-text type="secondary">
          {{ remark.label }}
        </a-typography-text>
        {{ ' ' + remark.text }}
      </div>
      <!-- Kundens svar på dit spørgsmål til punktet -->
      <template v-if="m.answer">
        <div v-if="m.answer.question">
          <a-typography-text type="secondary">
            {{ t('Dit spørgsmål:') }}
          </a-typography-text>
          {{ ' ' + m.answer.question }}
        </div>
        <div>
          <a-typography-text type="secondary">
            {{ t('Kundens svar:') }}
          </a-typography-text>
          {{ ' ' + m.answer.answer }}
        </div>
      </template>
      <CountrySplitTable
        v-if="m.countries"
        :split="m.countries"
      />
      <div v-if="uploadLabel">
        <a-button
          class="cw-link"
          type="link"
          size="small"
          :aria-label="uploadLabel + ': ' + m.label"
          @click="emit('upload')"
        >
          {{ uploadLabel }}
        </a-button>
      </div>
    </div>

    <!-- Historik: dato til venstre, hvad der skete til højre -->
    <div
      v-if="h.rows.length"
      class="ws-md-sec"
    >
      <a-typography-text strong>
        {{ t('Historik') }}
      </a-typography-text>
      <ul class="ws-md-hist">
        <li
          v-for="r in h.rows"
          :key="r.id"
        >
          <a-tooltip :title="r.at ? CW.fmtWhen(r.at) : undefined">
            <a-typography-text type="secondary">
              {{ r.at ? CW.fmtDate(r.at) : '' }}
            </a-typography-text>
          </a-tooltip>
          <div class="ws-md-hist-text">
            <a-typography-text :type="r.tone === 'gone' ? 'secondary' : undefined">
              {{ r.label }}
            </a-typography-text>
            <a-typography-text
              v-if="r.quote"
              type="secondary"
            >
              "{{ r.quote }}"
            </a-typography-text>
            <div
              v-if="r.names.length"
              class="ws-md-hist-files"
            >
              <span class="ws-md-hist-names">
                <template
                  v-for="(n, i) in r.names"
                  :key="i"
                >
                  {{ i > 0 ? ', ' : '' }}
                  <a-typography-link
                    v-if="h.fileUrl(n, r.tone === 'gone')"
                    :href="h.fileUrl(n, r.tone === 'gone')"
                    :download="n"
                  >
                    {{ n }}
                  </a-typography-link>
                  <a-typography-text
                    v-else
                    :delete="r.tone === 'gone'"
                    :type="r.tone === 'gone' ? 'secondary' : undefined"
                  >
                    {{ n }}
                  </a-typography-text>
                </template>
              </span>
              <a-button
                v-if="urlsOf(r).length > 1"
                class="cw-link"
                type="link"
                size="small"
                @click="downloadAll(r)"
              >
                {{ wsFill(t('Hent alle {n}'), { n: urlsOf(r).length }) }}
              </a-button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Den interne note: kun rådgivere ser den -->
    <div class="ws-md-sec">
      <div>
        <a-typography-text strong>
          {{ t('Intern note') }}
        </a-typography-text>
        {{ ' ' }}
        <a-typography-text
          type="secondary"
          class="ws-md-small"
        >
          {{ t('Kun synlig for rådgivere') }}
        </a-typography-text>
      </div>
      <template v-if="editing">
        <a-textarea
          :id="'ws-note-' + id"
          :value="draft"
          :rows="3"
          class="ws-md-note"
          :placeholder="t('Skriv en note til dig selv eller dine kolleger')"
          :aria-label="wsFill(t('Intern note til {item}'), { item: m.label })"
          @update:value="(v) => emit('update:draft', v)"
          @keydown.esc.stop="emit('cancel-note')"
        />
        <a-space :size="8">
          <a-button
            type="primary"
            size="small"
            @click="emit('save-note')"
          >
            {{ t('Gem note') }}
          </a-button>
          <a-button
            size="small"
            @click="emit('cancel-note')"
          >
            {{ t('Annullér') }}
          </a-button>
        </a-space>
      </template>
      <div
        v-else-if="inote"
        class="ws-md-note-text"
      >
        <a-tooltip :title="inote.at ? wsFill(t('{date} af {name}'), { date: CW.fmtDate(inote.at), name: inote.by || '' }) : undefined">
          <span>{{ inote.text }}</span>
        </a-tooltip>
        <a-button
          class="cw-link"
          type="link"
          size="small"
          @click="emit('edit-note')"
        >
          {{ t('Rediger') }}
        </a-button>
      </div>
      <div v-else>
        <a-button
          class="cw-link"
          type="link"
          size="small"
          @click="emit('edit-note')"
        >
          {{ t('Tilføj intern note') }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Under rækkens titel (pilens kolonne er 40 px): lodret liste med luft mellem delene */
.ws-md {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 16px 8px 40px;
  overflow-wrap: anywhere;
}

.ws-md-file {
  display: flex;
  flex-direction: column;
}

.ws-md-sec {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

/* Historikken: datoen i en fast kolonne, så teksterne står lige under hinanden */
.ws-md-hist {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ws-md-hist > li {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 8px;
}

.ws-md-hist-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ws-md-hist-files {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 12px;
  min-width: 0;
}

.ws-md-hist-names {
  min-width: 0;
}

.ws-md-small {
  font-size: @font-size-sm;
}

.ws-md-note {
  max-width: 560px;
}

.ws-md-note-text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 16px;
  white-space: pre-wrap;
}
</style>
