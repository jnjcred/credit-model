<script setup>
// Fanen Dokumenter (documents.jsx: WSDocuments): sagens kildedokumenter (DATA.DOCS, bygget af
// window.CASE_DOCS) plus alt, der er uploadet i demoen (CW.allUploads()), fra kundesiden, portalen
// eller rådgiveren selv, samlet under de samme emner som anmodningen og kundens portal.
// Søg, sortér, upload (knappen eller træk filer ind på listen), "Hent alle", slet og gendan, og
// erstattede versioner foldet ind under den version, der afløste dem.
// Andre skærme kan åbne et dokument her: sessionStorage 'kabul:open-doc' = { doc, name, ref, back }
// før fanen åbnes, og/eller eventet 'cw-open-doc' med samme detail, mens fanen er åben.
// Viseren (DOC_PREVIEW, window.CW_SOURCE_VIEW === true) står til højre; ellers markeres dokumentet
// i listen og rulles frem.
// Hjælperne (doc*) står i src/domain/documents.js. Ingen props.
import { computed, onMounted, ref, watch } from 'vue'
import { Empty, Upload } from 'ant-design-vue'
import {
  ArrowLeftOutlined, DownloadOutlined, FileOutlined, FullscreenOutlined, SearchOutlined, UndoOutlined, UploadOutlined,
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import {
  DOC_PREVIEW, docCanGet, docFill, docHeadingKey, docHeadings, docFromUpload, docGet, docKey, docPages, docWhen, findCaseDoc,
} from '@/domain/documents'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { go } from '@/composables/useNavigation'
import DocMetaLine from './DocMetaLine.vue'
import DocumentRow from './DocumentRow.vue'
import DocHeadingUpload from './DocHeadingUpload.vue'
import CaseDocReader from './viewer/CaseDocReader.vue'
import SupersededDoc from './viewer/SupersededDoc.vue'
import UploadedFileViewer from './viewer/UploadedFileViewer.vue'
import { useUploadButton } from '@/composables/useUploadButton'

const caseVersion = useCaseVersion()
const onCollapseKeydown = useCollapseKeyboard()

const uploadDocs = computed(() => {
  caseVersion.value
  return CW.allUploads().map(docFromUpload)
})
const sourceDocs = computed(() => {
  caseVersion.value
  return DATA.DOCS
})
const allDocs = computed(() => [...uploadDocs.value, ...sourceDocs.value])

const selKey = ref(docKey(sourceDocs.value[0]))
const selected = computed(() => allDocs.value.find(d => docKey(d) === selKey.value) || null)
const focus = ref(null) // { ref, n } til CaseDocReader
// Kom man fra en kilde et andet sted (f.eks. beslutningsgrundlaget), kan man gå tilbage: { route, anchor, label }
const back = ref(null)
const q = ref('')
const sortMode = ref('newest')
const dragOver = ref(false)
let dragDepth = 0
const fetching = ref(false)
const page = ref(null)

function select (d) { selKey.value = docKey(d); focus.value = null }
// Hop til en side i et af sagens kildedokumenter (navn eller id fra CASE_DOCS)
function openSource (name, ref) {
  // Kundens dokumenter står kun som upload (f.eks. periodetallene): så åbnes den nyeste upload med navnet
  const up = sourceDocs.value.some(x => x.name === name || x.id === name) ? null : CW.allUploads().find(f => f.id === name || f.name === name)
  const d = up ? docFromUpload(up) : sourceDocs.value.find(x => x.name === name || x.id === name) || { name }
  selKey.value = docKey(d)
  focus.value = { ref, n: Date.now() }
}

// Rullefeltet, fanen står i. Før migrationen var det sagens .scroll (document.querySelector('.scroll'));
// nu ejer sagens skal (WorkspaceView.vue) rullefeltet: nærmeste forfader, der kan rulle, ellers siden.
function scrollContainer () {
  for (let el = page.value && page.value.parentElement; el; el = el.parentElement) {
    const o = getComputedStyle(el).overflowY
    if (o === 'auto' || o === 'scroll') return el
  }
  return document.scrollingElement
}

// Andre skærme kan åbne et kildedokument på en bestemt side: sessionStorage
// 'kabul:open-doc' = { doc, name, ref } før fanen åbnes, og/eller eventet
// 'cw-open-doc' med samme detail, mens fanen er åben.
const apply = (d) => {
  if (!d) return
  const key = [d.doc, d.name].find(k => k && sourceDocs.value.some(x => x.name === k || x.id === k)) || d.doc || d.name
  if (key) openSource(key, d.ref || null)
  back.value = d.back && d.back.route ? d.back : null
  // Kom man fra en kilde med vej tilbage: rul til toppen, så knappen og
  // viserens hoved er synlige
  if (d.back && d.back.route) setTimeout(() => {
    const sc = scrollContainer()
    if (sc) sc.scrollTop = 0
    CW.focusSoon('#doc-back-btn')
  }, 80)
}
onMounted(() => {
  try {
    const raw = sessionStorage.getItem('kabul:open-doc')
    if (raw) { sessionStorage.removeItem('kabul:open-doc'); apply(JSON.parse(raw)) }
  } catch (e) {}
})
useWindowEvent('cw-open-doc', (e) => { try { sessionStorage.removeItem('kabul:open-doc') } catch (x) {} apply(e.detail) })

// Uden viser: et dokument åbnet fra en anden skærm markeres i listen og
// rulles frem (uden tilbage-knap får filnavnet fokus)
const hiKey = computed(() => (!DOC_PREVIEW && focus.value ? selKey.value : null))
watch([hiKey, () => focus.value && focus.value.n], ([k], _prev, onCleanup) => {
  if (!k) return
  const id = setTimeout(() => {
    const row = [...document.querySelectorAll('[data-doc-key]')].find(x => x.getAttribute('data-doc-key') === k)
    if (!row) return
    row.scrollIntoView({ block: 'center' })
    if (!back.value) { const link = row.querySelector('.cw-filelink'); if (link) try { link.focus({ preventScroll: true }) } catch (e) {} }
  }, 120)
  onCleanup(() => clearTimeout(id))
}, { flush: 'post' })

// heading: overskriften. Er den et punkt, rådgiveren kan bede kunden om, knyttes filen til punktet (som Upload for kunden:
// punktet står som modtaget, og filen følger punktet); ellers (Ansøgning og rating, Eksport, Øvrigt) lægges den løst
// under overskriften. Uden overskrift kommer filen under Øvrigt.
const handleFiles = (fileList, heading) => {
  const files = Array.from(fileList || [])
  if (!files.length) return
  const h = heading && heading !== 'other' ? heading : null
  const itemId = h && (headings.value.find(x => x.key === h) || {}).itemId
  let metas
  if (itemId) {
    metas = CW.putFiles(files, { by: 'rådgiver', itemId })
    CW.markReceived(itemId, { by: 'rådgiver', files: metas })
  } else {
    metas = CW.putFiles(files, { by: 'rådgiver' }).map(m => (h ? { ...m, heading: h } : m))
    CW.addLooseUploads(metas)
  }
  const label = h ? t((headings.value.find(x => x.key === h) || {}).label || '') : ''
  CW.toast(label
    ? docFill(files.length === 1 ? t('1 fil uploadet under {navn}') : t('{n} filer uploadet under {navn}'), { n: files.length, navn: label })
    : docFill(files.length === 1 ? t('1 fil uploadet under Dokumenter') : t('{n} filer uploadet under Dokumenter'), { n: files.length }))
  if (metas[0]) { selKey.value = 'u:' + metas[0].id; focus.value = null }
}
// "Upload fil" (a-upload): beforeUpload kaldes for hver valgt fil med hele valget; valget håndteres
// ved den første fil, så der kommer ét kald og én besked pr. valg. LIST_IGNORE: a-upload gemmer
// ikke selv filerne (de står i listen som uploads).
const pickFiles = (file, fileList, heading) => {
  if (file === fileList[0]) handleFiles(fileList, heading)
  return Upload.LIST_IGNORE
}

// Hent alle dokumenter, der har indhold, én ad gangen (browseren spørger
// evt. én gang, om siden må hente flere filer). Knappen er låst imens.
async function fetchAll () {
  if (fetching.value) return
  const list = allDocs.value.filter(docCanGet)
  if (!list.length) return
  fetching.value = true
  CW.toast(docFill(t('Henter {n} dokumenter'), { n: list.length }))
  for (const d of list) {
    try { docGet(d) } catch (e) {}
    await new Promise(r => setTimeout(r, 350))
  }
  fetching.value = false
}

// Erstattede versioner (f.eks. budget v1 og v2) foldes ind under den version,
// der afløste dem (supersededBy). Forskellige års årsrapporter er ikke
// versioner af hinanden og står hver for sig.
const current = (name) => allDocs.value.some(x => x.name === name && !x.superseded)
const olderBy = computed(() => {
  const olderBy = {}
  allDocs.value.forEach(d => { if (d.superseded && d.supersededBy && current(d.supersededBy)) (olderBy[d.supersededBy] = olderBy[d.supersededBy] || []).push(d) })
  Object.values(olderBy).forEach(arr => arr.sort((a, b) => b.date.localeCompare(a.date)))
  return olderBy
})
const olderOf = (d) => (!d.superseded && olderBy.value[d.name]) || []

const ql = computed(() => q.value.trim().toLowerCase())
const hit = (d) => d.name.toLowerCase().includes(ql.value) || t(d.type).toLowerCase().includes(ql.value) || d.type.toLowerCase().includes(ql.value) || (d.itemLabel || '').toLowerCase().includes(ql.value)
const docs = computed(() => {
  let docs = allDocs.value.filter(d => !(d.superseded && d.supersededBy && current(d.supersededBy)))
  if (ql.value) docs = docs.filter(d => hit(d) || olderOf(d).some(hit))
  if (sortMode.value === 'newest') docs.sort((a, b) => b.date.localeCompare(a.date))
  else if (sortMode.value === 'oldest') docs.sort((a, b) => a.date.localeCompare(b.date))
  // Filnavne sorteres som tekst (på dansk ville "Aa" ellers sortere som "Å")
  else if (sortMode.value === 'name') docs.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }))
  return docs
})
const sortOptions = computed(() => [
  { value: 'newest', label: t('Nyeste først') },
  { value: 'oldest', label: t('Ældste først') },
  { value: 'name', label: t('Navn') },
])

// Overskrifterne er de punkter, kunden kan bede om (src/domain/documents.js: docHeadings), så en fil står under
// det, kunden præcist kan sende, efterfulgt af Ansøgning og rating, Eksport og Øvrigt. Om et dokument er hentet
// offentligt eller uploadet, står i rækkens grå linje (kilden).
const headings = computed(() => { caseVersion.value; return docHeadings() })
const groups = computed(() => headings.value.map(h => ({ key: h.key, label: h.label, items: docs.value.filter(d => docHeadingKey(d) === h.key) })))
const shownGroups = computed(() => groups.value.filter(g => g.items.length !== 0))
// Overskrifter uden dokumenter står i en fold nederst; rådgiveren kan uploade til dem alle. Under en søgning
// skjules folden (der er intet at finde dér)
const unusedGroups = computed(() => (ql.value ? [] : groups.value.filter(g => g.items.length === 0)))
const unusedOpen = ref([])

// Alle filer kan slettes og gendannes (CW.removeDoc / CW.restoreDoc). Slettede
// filer står i folden Slettet nederst: sagens egne dokumenter og uploads.
const removed = computed(() => {
  caseVersion.value
  const removedMap = CW.removedDocs()
  return Object.keys(removedMap).map(key => {
    const r = removedMap[key]
    if (r.kind === 'upload') return { key, name: r.name || (r.file && r.file.name) || key, source: r.file && r.file.by === 'rådgiver' ? 'Uploadet af rådgiver' : 'Kundeupload', r }
    const d = (DATA.ALL_DOCS || []).find(x => x.name === key)
    return d ? { key, name: d.name, source: d.sourceLabel || 'CVR', r } : null
  }).filter(Boolean).sort((a, b) => String(b.r.at || '').localeCompare(String(a.r.at || '')))
})
function removeDoc (d) {
  CW.confirm({
    title: docFill(t('Slet {navn}?'), { navn: d.name }),
    text: t('Filen fjernes fra sagen. Du kan gendanne den under Slettet nederst i Dokumenter.'),
    confirmLabel: t('Slet'), danger: true,
  }).then(r => {
    if (!r || !r.ok) return
    const res = CW.removeDoc(d.fileId ? { fileId: d.fileId } : d.name)
    if (!res) return
    const it = res.itemReset && res.itemId ? CW.itemById(res.itemId) : null
    CW.toast(it ? docFill(t('{navn} er slettet. {punkt} mangler nu en fil.'), { navn: d.name, punkt: t(it.label) }) : docFill(t('{navn} er slettet'), { navn: d.name }),
      { action: { label: t('Fortryd'), onClick: () => CW.restoreDoc(res.key) } })
    CW.focusSoon('#doc-removed .cw-fold')
  })
}
function restoreDoc (d) { CW.restoreDoc(d.key); CW.toast(docFill(t('{navn} er gendannet'), { navn: d.name })) }
const groupCount = (items) => items.reduce((n, d) => n + 1 + olderOf(d).length, 0)

const selCase = computed(() => (selected.value && !selected.value.fileId ? findCaseDoc(selected.value.name) : null))
const selUrl = computed(() => {
  caseVersion.value
  return selected.value && selected.value.fileId ? CW.fileUrl(selected.value.fileId) : null
})
// Viserens undertitel: type, kilde og dato (uploads med klokkeslæt), sider, uddrag og størrelse
const selSub = computed(() => {
  const s = selected.value
  if (!s) return ''
  if (s.fileId) return t(s.type) + ' - ' + t(s.sourceLabel || 'Kundeupload') + ' - ' + t('uploadet') + ' ' + docWhen(s)
  return t(s.type) + ' - ' + t(s.sourceLabel || 'Kundeupload') + ' - ' + t('dateret') + ' ' + docWhen(s) +
    (s.pageCount ? ' - ' + docPages(s) : '') + (selCase.value && s.excerpt ? ' - ' + docFill(t('uddrag, {n} afsnit i viseren'), { n: s.excerpt }) : '') + ' - ' + s.size
})

// Hele listen er drop-mål for filer. Filer, der slippes på "Upload fil", har a-upload allerede taget
// imod (og kaldt preventDefault); så nulstilles kun trækket her.
const isFileDrag = (e) => Array.from((e.dataTransfer && e.dataTransfer.types) || []).indexOf('Files') >= 0
function onDragEnter (e) { e.preventDefault(); if (!isFileDrag(e)) return; dragDepth += 1; dragOver.value = true }
function onDragOver (e) { e.preventDefault() }
function onDragLeave () { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dragOver.value = false }
function onDrop (e) {
  const taken = e.defaultPrevented
  e.preventDefault(); dragDepth = 0; dragOver.value = false
  if (!taken) handleFiles(e.dataTransfer && e.dataTransfer.files)
}

function goBack () {
  try { if (back.value.anchor) sessionStorage.setItem('kabul:ws-focus', back.value.anchor) } catch (e) {}
  go(back.value.route)
}
// Upload-knappen er det eneste Tab-stop (a-uploads omslag tages ud; se useUploadButton)
useUploadButton(page)
</script>

<template>
  <div
    ref="page"
    class="doc-page"
    :class="{ 'doc-page-viewer': DOC_PREVIEW }"
  >
    <div
      v-if="back"
      class="doc-back"
    >
      <a-button
        id="doc-back-btn"
        size="small"
        @click="goBack"
      >
        <template #icon>
          <ArrowLeftOutlined aria-hidden="true" />
        </template>
        {{ back.label || t('Tilbage') }}
      </a-button>
    </div>
    <!-- Fanen og sagens navn viser allerede, hvor man er; overskriften er kun til skærmlæsere -->
    <h2 class="sr-only">
      {{ t('Dokumenter') }}
    </h2>
    <a-row :gutter="[16, 16]">
      <a-col
        :xs="24"
        :xl="DOC_PREVIEW ? 9 : 24"
      >
        <!-- Hele listen er drop-mål for filer -->
        <div
          class="doc-drop"
          @dragenter="onDragEnter"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <a-card :bordered="false">
            <!-- Én værktøjslinje: søg, sortér, upload, hent alle -->
            <div class="doc-toolbar">
              <a-input
                v-model:value="q"
                class="doc-search"
                type="search"
                :aria-label="t('Søg i dokumenter')"
                :placeholder="t('Søg på navn, type eller punkt…')"
              >
                <template #prefix>
                  <SearchOutlined aria-hidden="true" />
                </template>
              </a-input>
              <label
                for="doc-sort"
                class="sr-only"
              >{{ t('Sortér') }}</label>
              <a-select
                id="doc-sort"
                v-model:value="sortMode"
                class="doc-sort"
                :options="sortOptions"
              />
              <a-space
                :size="2"
                class="doc-toolbar-end"
              >
                <!-- id lander på filfeltet (før: input[data-doc-upload]; data-* når ikke frem i 3.2.13) -->
                <a-upload
                  id="doc-upload-input"
                  :show-upload-list="false"
                  multiple
                  :before-upload="pickFiles"
                >
                  <a-button
                    type="text"
                    size="small"
                    :title="t('Du kan også trække filer ind på listen')"
                  >
                    <template #icon>
                      <UploadOutlined aria-hidden="true" />
                    </template>
                    {{ t('Upload fil') }}
                  </a-button>
                </a-upload>
                <a-button
                  type="text"
                  size="small"
                  :disabled="fetching"
                  :aria-busy="fetching || undefined"
                  @click="fetchAll"
                >
                  <template #icon>
                    <DownloadOutlined aria-hidden="true" />
                  </template>
                  {{ t('Hent alle') }}
                </a-button>
              </a-space>
            </div>

            <!-- a-card flader sit indhold ud og sammenligner det på nøgle: listen over emner har
                 emnets nøgle, og de to valgfri dele nedenfor har hver deres -->
            <a-list
              v-for="g in shownGroups"
              :key="g.key"
            >
              <template #header>
                <div class="doc-group-row">
                  <div
                    class="doc-group-head"
                    role="heading"
                    aria-level="2"
                  >
                    <a-typography-text strong>
                      {{ t(g.label) }}
                    </a-typography-text>
                    <a-typography-text type="secondary">
                      {{ groupCount(g.items) }}
                    </a-typography-text>
                  </div>
                  <DocHeadingUpload
                    :heading="g.key"
                    :label="g.label"
                    @pick="handleFiles"
                  />
                </div>
              </template>
              <!-- Rækkerne har dokumentets nøgle, så fokus og en åben fold følger dokumentet, når
                   listen ændrer sig (a-list 3.2.13 giver ikke rækkerne fra data-source en nøgle) -->
              <ul class="doc-list">
                <DocumentRow
                  v-for="item in g.items"
                  :key="docKey(item)"
                  :d="item"
                  :older="olderOf(item)"
                  :open-older="!!ql && olderOf(item).some(hit)"
                  :hi-key="hiKey"
                  :selected-key="selKey"
                  :preview="DOC_PREVIEW"
                  @select="select"
                  @remove="removeDoc(item)"
                />
              </ul>
            </a-list>
            <!-- Overskrifter uden dokumenter (alle punkter, kunden kan bede om): foldet sammen, og rådgiveren kan uploade til dem -->
            <div
              v-if="unusedGroups.length > 0"
              id="doc-unused"
              key="unused"
              @keydown="onCollapseKeydown"
            >
              <a-collapse
                v-model:active-key="unusedOpen"
                class="doc-older"
                ghost
                :expand-icon="collapseExpandIcon"
              >
                <a-collapse-panel
                  key="unused"
                  :header="t('Ikke brugt endnu') + ' (' + unusedGroups.length + ')'"
                >
                  <div
                    v-for="g in unusedGroups"
                    :key="g.key"
                    class="doc-group-row doc-unused-row"
                  >
                    <a-typography-text>{{ t(g.label) }}</a-typography-text>
                    <DocHeadingUpload
                      :heading="g.key"
                      :label="g.label"
                      @pick="handleFiles"
                    />
                  </div>
                </a-collapse-panel>
              </a-collapse>
            </div>
            <!-- Slettede, hentede dokumenter kan gendannes. Mellemrum folder også (a-collapse 3.2.13
                 reagerer kun på Enter) -->
            <div
              v-if="removed.length > 0"
              id="doc-removed"
              key="removed"
              @keydown="onCollapseKeydown"
            >
              <a-collapse
                class="doc-older"
                ghost
                destroy-inactive-panel
                :expand-icon="collapseExpandIcon"
              >
                <!-- Overskriften har krogen .cw-fold, som fokus flytter til efter en sletning.
                     a-collapse 3.2.13 læser kun headerClass med camelCase fra panelet -->
                <a-collapse-panel
                  key="removed"
                  v-bind="{ headerClass: 'cw-fold' }"
                  :header="t('Slettet') + ' (' + removed.length + ')'"
                >
                  <div id="doc-removed-list">
                    <a-list
                      size="small"
                      :data-source="removed"
                      row-key="key"
                    >
                      <template #renderItem="{ item: d }">
                        <a-list-item>
                          <a-list-item-meta>
                            <template #title>
                              <a-typography-text
                                type="secondary"
                                delete
                              >
                                {{ d.name }}
                              </a-typography-text>
                            </template>
                            <template #description>
                              <DocMetaLine
                                class="cw-row-meta"
                                :parts="[t(d.source), docFill(t('slettet {dato} af {navn}'), { dato: CW.fmtDate(d.r.at), navn: d.r.by || '' })]"
                              />
                            </template>
                          </a-list-item-meta>
                          <template #actions>
                            <a-button
                              size="small"
                              :aria-label="docFill(t('Gendan {navn}'), { navn: d.name })"
                              @click="restoreDoc(d)"
                            >
                              <template #icon>
                                <UndoOutlined aria-hidden="true" />
                              </template>
                              {{ t('Gendan') }}
                            </a-button>
                          </template>
                        </a-list-item>
                      </template>
                    </a-list>
                  </div>
                </a-collapse-panel>
              </a-collapse>
            </div>
            <a-empty
              v-if="docs.length === 0"
              key="empty"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            >
              <template #description>
                <a-typography-text type="secondary">
                  {{ t('Ingen dokumenter matcher søgningen.') }}
                </a-typography-text>
              </template>
            </a-empty>
          </a-card>
          <a-row
            v-if="dragOver"
            class="doc-drop-hint"
            justify="center"
            align="middle"
            aria-hidden="true"
          >
            <a-alert
              type="info"
              show-icon
              :message="t('Slip filerne for at uploade dem')"
            />
          </a-row>
        </div>
      </a-col>

      <!-- Viseren (kun med window.CW_SOURCE_VIEW) -->
      <a-col
        v-if="DOC_PREVIEW"
        :xs="24"
        :xl="15"
      >
        <a-card
          :bordered="false"
          :title="selected ? selected.name : t('Vælg dokument')"
        >
          <template
            v-if="selected"
            #extra
          >
            <a-space>
              <a-button
                v-if="selUrl"
                type="text"
                size="small"
                :href="selUrl"
                :download="selected.name"
                :aria-label="docFill(t('Hent {navn}'), { navn: selected.name })"
                :title="t('Hent')"
              >
                <template #icon>
                  <DownloadOutlined aria-hidden="true" />
                </template>
              </a-button>
              <a-button
                v-else
                type="text"
                size="small"
                :aria-label="docFill(t('Hent {navn}'), { navn: selected.name })"
                :title="t('Hent')"
                @click="CW.downloadDoc(selected.name)"
              >
                <template #icon>
                  <DownloadOutlined aria-hidden="true" />
                </template>
              </a-button>
              <a-button
                v-if="selUrl"
                size="small"
                :href="selUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                <template #icon>
                  <FullscreenOutlined aria-hidden="true" />
                </template>
                {{ t('Åbn i ny fane') }}
              </a-button>
              <a-button
                v-else
                size="small"
                @click="CW.notInDemo(t('Åbn i fuld skærm'))"
              >
                <template #icon>
                  <FullscreenOutlined aria-hidden="true" />
                </template>
                {{ t('Åbn') }}
              </a-button>
            </a-space>
          </template>
          <!-- Dokumentets type, kilde, dato, sider og størrelse (under titlen før migrationen) -->
          <a-typography-paragraph
            v-if="selected"
            type="secondary"
          >
            {{ selSub }}
          </a-typography-paragraph>
          <div class="doc-viewer-body">
            <a-empty
              v-if="!selected"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            >
              <template #description>
                <a-typography-text type="secondary">
                  {{ t('Vælg et dokument i listen til venstre') }}
                </a-typography-text>
              </template>
            </a-empty>
            <UploadedFileViewer
              v-else-if="selected.fileId"
              :doc="selected"
            />
            <CaseDocReader
              v-else-if="selCase"
              :doc="selCase"
              :focus="focus"
            />
            <SupersededDoc
              v-else-if="selected.superseded"
              :doc="selected"
              @open="openSource(selected.supersededBy, selected.versionLogRef)"
            />
            <a-result
              v-else
              :title="selected.name"
              :sub-title="t(selected.type) + ' - ' + selected.size"
            >
              <template #icon>
                <FileOutlined aria-hidden="true" />
              </template>
              <template #extra>
                <a-button
                  size="small"
                  @click="CW.notInDemo(t('Åbn dokument'))"
                >
                  <template #icon>
                    <FullscreenOutlined aria-hidden="true" />
                  </template>
                  {{ t('Åbn dokument') }}
                </a-button>
              </template>
            </a-result>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
/* Siden: samme bredde og luft som før (bredere med viseren) */
.doc-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 32px 80px;
}

.doc-page-viewer {
  max-width: 1320px;
}

.doc-back {
  margin-bottom: 12px;
}

/* Gruppens overskrift: navnet i tekstfarve og halvfed, antallet gråt ved siden af */
.doc-group-head {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

/* Overskriften til venstre og Upload til højre */
.doc-group-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.doc-unused-row {
  padding: 4px 0;
}

/* Værktøjslinjen: søgefeltet fylder, handlingerne står til højre og brydes på smalle skærme */
.doc-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.doc-search {
  flex: 1 1 200px;
  min-width: 0;
}

.doc-toolbar-end {
  margin-left: auto;
}

/* Listen med dokumentets rækker (som a-list's egen liste) */
.doc-list {
  margin: 0;
  padding: 0;
}

/* Hjælpeteksten under et træk ligger over listen; trækket går igennem den til listen (som før) */
.doc-drop {
  position: relative;
}

.doc-drop-hint {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.doc-viewer-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 480px;
}
</style>
