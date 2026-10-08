<script setup>
// Prompt-værksted (ruten 'prompts', internt): produktteamets side til at rette promptene i
// prompts/*.md, som "Kør AI igen" bruger under Virksomheden → Produkt, marked og branche.
// Gem skriver filen (lokalt via devserver.js; den forrige version lægges i prompts/.historik/) eller,
// på et hosted domæne, en kopi i denne browser. "Prøv på Nordhavn" kører kladden uden at gemme.
// Filformatet og tjenesten window.CW_PROMPTS står i src/domain/prompts.js.
import { computed, ref, shallowRef, watch } from 'vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { CW_PROMPTS as P, PW_FILES, PW_PLACEHOLDERS, pwBuild, pwFields, pwFill } from '@/domain/prompts'
import { useTabsKeyboard } from '@/composables/useTabsKeyboard'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'
import AppTopbar from '@/components/shell/AppTopbar.vue'
import PromptAiStatus from './PromptAiStatus.vue'
import PromptTryPanel from './PromptTryPanel.vue'

const fileKey = ref((() => { try { return localStorage.getItem('cw_pw_file') || PW_FILES[1].file } catch (e) { return PW_FILES[1].file } })())
const meta = computed(() => PW_FILES.find(f => f.file === fileKey.value) || PW_FILES[0])
const writable = ref(null) // null = ukendt
const fileRaw = ref(null) // filens indhold
const base = shallowRef(null) // { web, system, task } som gemt (fil eller browser)
const draft = shallowRef(null) // erstattes altid helt (sammenlignes med base)
const loadErr = ref(null)
const saving = ref(false)
const savedAt = ref(null)
const history = shallowRef([])
const stored = ref(0) // browserens kopier (localStorage) læses igen, når den tælles op
let lastFocus = 'task' // feltet, en pladsholder sættes ind i
const track = (field) => { lastFocus = field }

P.writable().then((w) => { writable.value = w })

// Hent filen (og evt. browserens kopi), når der skiftes prompt
watch(fileKey, (key, prev, onCleanup) => {
  let dead = false
  onCleanup(() => { dead = true })
  loadErr.value = null; draft.value = null; base.value = null; savedAt.value = null
  try { localStorage.setItem('cw_pw_file', key) } catch (e) {}
  P.fetchFile(key).then(raw => {
    if (dead) return
    fileRaw.value = raw
    const o = P.override(key)
    const f = pwFields(o ? o.content : raw)
    base.value = f; draft.value = f
    stored.value++
  }).catch(err => { if (!dead) loadErr.value = err.message || String(err) })
  P.history(key).then(h => { if (!dead) history.value = h })
}, { immediate: true })

const override = computed(() => { stored.value; return P.override(fileKey.value) })
const copies = computed(() => { stored.value; return Object.fromEntries(PW_FILES.map(f => [f.file, !!P.override(f.file)])) })
const dirty = computed(() => !!(draft.value && base.value && (draft.value.web !== base.value.web || draft.value.system !== base.value.system || draft.value.task !== base.value.task)))

const setField = (field, value) => { draft.value = Object.assign({}, draft.value, { [field]: value }) }

function switchFile (f) {
  if (f === fileKey.value) return
  if (!dirty.value) { fileKey.value = f; return }
  CW.confirm({ title: t('Kassér ændringerne?'), text: t('Du har ændringer i promptet, som ikke er gemt.'), confirmLabel: t('Kassér og skift') })
    .then(r => { if (r.ok) fileKey.value = f })
}
// Promptfilerne er faner: piletaster, Home og End skifter fil (med samme spørgsmål, hvis der er ændringer).
// Fanerne står lodret, så pil op/ned virker også (som venstre/højre).
const onFileTabsKeydown = useTabsKeyboard('pw-files', () => PW_FILES.map(f => f.file), switchFile)
const VERTICAL_KEYS = { ArrowDown: 'ArrowRight', ArrowUp: 'ArrowLeft' }
function onTabsKeydown (e) {
  if (!VERTICAL_KEYS[e.key]) { onFileTabsKeydown(e); return }
  onFileTabsKeydown({ key: VERTICAL_KEYS[e.key], target: e.target, preventDefault: () => e.preventDefault() })
}
const onFoldKeydown = useCollapseKeyboard()

// Pladsholderen sættes ind, hvor markøren står i det felt, der sidst havde fokus
function insertPh (k) {
  const field = lastFocus === 'system' ? 'system' : 'task'
  const el = document.getElementById(field === 'system' ? 'pw-system' : 'pw-task')
  const val = draft.value[field]
  const at = el && typeof el.selectionStart === 'number' ? el.selectionStart : val.length
  const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : at
  const ins = '{' + k + '}'
  setField(field, val.slice(0, at) + ins + val.slice(end))
  setTimeout(() => { if (el) { el.focus(); el.setSelectionRange(at + ins.length, at + ins.length) } }, 0)
}

async function save () {
  if (!draft.value || saving.value) return
  saving.value = true
  const key = fileKey.value
  const saved = draft.value
  const content = pwBuild(fileRaw.value || '', saved)
  try {
    if (writable.value) {
      const at = await P.saveFile(key, content)
      P.clearOverride(key)
      fileRaw.value = content; savedAt.value = at
      CW.toast(pwFill(t('Gemt i prompts/{fil}'), { fil: key }))
      P.history(key).then((h) => { history.value = h })
    } else {
      P.setOverride(key, content)
      savedAt.value = new Date().toISOString()
      CW.toast(t('Gemt i denne browser. Filen i prompts/ er ikke ændret.'))
    }
    base.value = saved
  } catch (err) {
    CW.toast(t('Kunne ikke gemme') + ': ' + (err.message || err), { tone: 'danger' })
  } finally {
    saving.value = false
    stored.value++
  }
}
const revert = () => { draft.value = base.value }
function dropOverride () {
  const key = fileKey.value
  const raw = fileRaw.value
  CW.confirm({ title: t('Slet browserens kopi?'), text: t('"Kør AI igen" bruger derefter filen i prompts/ igen.'), confirmLabel: t('Slet kopien') })
    .then(r => { if (!r.ok) return; P.clearOverride(key); const f = pwFields(raw || ''); base.value = f; draft.value = f; stored.value++ })
}
function download () {
  const content = pwBuild(fileRaw.value || '', draft.value)
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileKey.value
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
function loadVersion (v) {
  draft.value = pwFields(v.content)
  CW.toast(t('Versionen er indlæst. Gem for at bruge den.'))
}

const status = computed(() => (!base.value ? '' : dirty.value ? t('Ændringer er ikke gemt')
  : override.value ? pwFill(t('Gemt i denne browser {date}. Filen i prompts/ er ikke ændret.'), { date: CW.fmtWhen(override.value.at) })
    : savedAt.value ? pwFill(t('Gemt i filen {date}'), { date: CW.fmtWhen(savedAt.value) })
      : t('Som i filen')))
</script>

<template>
  <AppTopbar :crumbs="[t('Prompt-værksted')]" />
  <div class="pw-page">
    <div class="pw-head">
      <div>
        <a-typography-title>{{ t('Prompt-værksted') }}</a-typography-title>
        <a-typography-text type="secondary">
          {{ t('Promptene bag "Kør AI igen" under Virksomheden → Produkt, marked og branche. Ret, prøv på Nordhavn, og gem.') }}
        </a-typography-text>
      </div>
      <PromptAiStatus />
    </div>

    <a-card>
      <!-- Hvor Gem lægger promptet: i filen (lokalt) eller i denne browser (hosted) -->
      <a-typography-paragraph type="secondary">
        {{ writable === false ? t('Prototypen kører ikke lokalt, så ændringer gemmes i denne browser. Hent filen for at lægge den i prompts/.') : t('Ændringer gemmes direkte i prompts/, og den forrige version lægges i prompts/.historik/.') }}
      </a-typography-paragraph>
      <div @keydown="onTabsKeydown">
        <a-tabs
          id="pw-files"
          tab-position="left"
          :active-key="meta.file"
          :aria-label="t('Prompts')"
          @change="switchFile"
        >
          <a-tab-pane
            v-for="f in PW_FILES"
            :key="f.file"
          >
            <template #tab>
              <span class="pw-file">
                <span>
                  {{ t(f.label) }}
                  <template v-if="f.file === meta.file && dirty">
                    <a-tooltip :title="t('Ændringer er ikke gemt')">
                      <a-badge status="warning" />
                    </a-tooltip>
                    <span class="sr-only">{{ t('Ændringer er ikke gemt') }}</span>
                  </template>
                </span>
                <a-typography-text type="secondary">
                  {{ 'prompts/' + f.file + (copies[f.file] ? ' · ' + t('browserkopi') : '') }}
                </a-typography-text>
              </span>
            </template>

            <section
              v-if="f.file === meta.file"
              class="pw-editor"
              aria-labelledby="pw-title"
            >
              <div class="pw-editor-head">
                <div>
                  <a-typography-text
                    id="pw-title"
                    strong
                    role="heading"
                    aria-level="2"
                  >
                    {{ t(meta.label) }}
                  </a-typography-text>
                  <!-- Ikke gemte ændringer står i tekstfarven, så de skiller sig ud fra den grå status -->
                  <div aria-live="polite">
                    <a-typography-text :type="dirty ? undefined : 'secondary'">
                      {{ status }}
                    </a-typography-text>
                  </div>
                </div>
                <a-button
                  v-if="override && !dirty"
                  type="text"
                  size="small"
                  @click="dropOverride"
                >
                  {{ t('Slet browserens kopi') }}
                </a-button>
              </div>

              <a-alert
                v-if="loadErr"
                type="error"
                show-icon
                :message="pwFill(t('Kunne ikke hente prompts/{fil}: {fejl}'), { fil: fileKey, fejl: loadErr })"
              />
              <a-spin
                v-if="!draft && !loadErr"
                :tip="t('Henter …')"
              />

              <template v-if="draft">
                <a-form layout="vertical">
                  <a-form-item>
                    <a-checkbox
                      :checked="draft.web"
                      @change="(e) => setField('web', e.target.checked)"
                    >
                      {{ t('Må søge på nettet') }}
                      <a-typography-text type="secondary">
                        {{ t('(kun Claude Code og Claude via API-nøgle kan søge; en kørsel tager så 1-4 minutter)') }}
                      </a-typography-text>
                    </a-checkbox>
                  </a-form-item>
                  <a-form-item
                    :label="t('System')"
                    html-for="pw-system"
                    :extra="t('Rollen og de faste regler. Skriv hvorfor frem for at gentage forbud.')"
                  >
                    <a-textarea
                      id="pw-system"
                      :rows="7"
                      :value="draft.system"
                      @update:value="(v) => setField('system', v)"
                      @focus="track('system')"
                      @click="track('system')"
                      @keyup="track('system')"
                    />
                  </a-form-item>
                  <a-form-item
                    :label="t('Opgave')"
                    html-for="pw-task"
                    :extra="t('Sagens oplysninger og selve opgaven. Pladsholderne nedenfor udfyldes, før prompten sendes.')"
                  >
                    <a-textarea
                      id="pw-task"
                      :rows="18"
                      :value="draft.task"
                      @update:value="(v) => setField('task', v)"
                      @focus="track('task')"
                      @click="track('task')"
                      @keyup="track('task')"
                    />
                  </a-form-item>
                </a-form>

                <div>
                  <a-typography-paragraph type="secondary">
                    {{ t('Pladsholdere (klik for at sætte ind, hvor markøren står):') }}
                  </a-typography-paragraph>
                  <a-space wrap>
                    <a-button
                      v-for="p in PW_PLACEHOLDERS"
                      :key="p.k"
                      size="small"
                      :title="t(p.d)"
                      :aria-label="pwFill(t('Indsæt {navn}: {beskrivelse}'), { navn: '{' + p.k + '}', beskrivelse: t(p.d) })"
                      @click="insertPh(p.k)"
                    >
                      {{ '{' + p.k + '}' }}
                    </a-button>
                  </a-space>
                </div>

                <a-divider />
                <div class="pw-actions">
                  <a-space>
                    <a-button
                      type="primary"
                      :disabled="!dirty || saving"
                      :loading="saving"
                      :aria-busy="saving || undefined"
                      @click="save"
                    >
                      {{ saving ? t('Gemmer …') : t('Gem') }}
                    </a-button>
                    <a-button
                      :disabled="!dirty"
                      @click="revert"
                    >
                      {{ t('Fortryd ændringer') }}
                    </a-button>
                  </a-space>
                  <a-button
                    type="text"
                    size="small"
                    @click="download"
                  >
                    <template #icon>
                      <DownloadOutlined aria-hidden="true" />
                    </template>
                    {{ t('Hent som fil') }}
                  </a-button>
                </div>

                <PromptTryPanel
                  :meta="meta"
                  :draft="draft"
                />

                <!-- Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter) -->
                <div
                  v-if="writable && history.length > 0"
                  @keydown="onFoldKeydown"
                >
                  <a-collapse
                    ghost
                    :expand-icon="collapseExpandIcon"
                  >
                    <a-collapse-panel
                      id="pw-history"
                      key="history"
                      :header="t('Tidligere versioner') + ' (' + history.length + ')'"
                    >
                      <a-list
                        size="small"
                        :data-source="history"
                        :row-key="(v) => v.name"
                      >
                        <template #renderItem="{ item: v }">
                          <a-list-item>
                            <a-typography-text type="secondary">
                              {{ CW.fmtWhen(v.at) }}
                            </a-typography-text>
                            <template #actions>
                              <a-button
                                type="link"
                                size="small"
                                @click="loadVersion(v)"
                              >
                                {{ t('Indlæs') }}
                              </a-button>
                            </template>
                          </a-list-item>
                        </template>
                      </a-list>
                    </a-collapse-panel>
                  </a-collapse>
                </div>
              </template>
            </section>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-card>
  </div>
</template>

<style scoped>
.pw-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.pw-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.pw-file {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.pw-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pw-editor-head,
.pw-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
