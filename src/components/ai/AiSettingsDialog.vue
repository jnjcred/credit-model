<script setup>
// "Forbind din AI-konto": vælg udbyder (eget abonnement via den lokale bro, Claude, ChatGPT eller
// Copilot på Azure), indtast nøgle, model og evt. adresse, test forbindelsen og gem.
// Fælles for Prompt-værkstedet, Regnskab og det indbyggede memo (før MemoAI.AiSettingsDialog i memo_ai.jsx).
//
//   <AiSettingsDialog :open="open" @close="open = false" />
//
// Lad komponenten være monteret, også mens den er lukket: den husker den valgte udbyderfane til
// næste gang, som før. Ved hver åbning læses indstillingerne igen, og den lokale bro undersøges.
// Gem skriver med AI.setConfig til localStorage 'cw:ai-config:v1' (nøglerne bliver i denne browser),
// og AI-laget sender 'cw-ai-config-changed', som useAiStatus og skærmene lytter på.
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { AI } from '@/domain/ai'
import { t } from '@/i18n'
import { useSelectEscape } from '@/composables/useSelectEscape'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const PROVIDER_IDS = ['local', 'anthropic', 'openai', 'copilot']

const cfg = shallowRef(AI.getConfig()) // erstattes altid helt
const tab = ref(AI.getConfig().provider)
const models = shallowRef([])
const busy = ref('')
const msg = ref(null)
const reveal = ref(false)
const local = shallowRef(AI.localStatus())

const close = () => emit('close')

// Ved åbning får den valgte udbyder fokus (som før: dialogens første kontrol), ikke antdv's lukkeknap.
// antdv flytter selv fokus ind i dialogen, når den er åbnet, og husker, hvor fokus kom fra, så det kan gå
// tilbage ved lukning. Først derefter flyttes fokus videre til udbyderen.
const providerGroup = ref(null)
function focusProvider (tries = 0) {
  const group = providerGroup.value && providerGroup.value.$el
  const el = group && group.querySelector('input:checked')
  const dialog = group && group.closest('[role="dialog"]')
  if (el && dialog && dialog.contains(document.activeElement)) {
    if (document.activeElement !== el) el.focus()
    return
  }
  if (tries < 40) setTimeout(() => focusProvider(tries + 1), 30)
}

watch(() => props.open, (open) => {
  if (!open) return
  cfg.value = AI.getConfig(); msg.value = null; models.value = []; reveal.value = false
  AI.probeLocal(true).then((st) => { local.value = st })
  nextTick(() => focusProvider())
}, { immediate: true })
watch(tab, () => { models.value = []; msg.value = null })

const P = computed(() => AI.PROVIDERS[tab.value])
const isLocal = computed(() => tab.value === 'local')
const key = computed(() => cfg.value.keys[tab.value] || '')
const model = computed(() => cfg.value.models[tab.value] || P.value.defaultModel)
const baseUrl = computed(() => (cfg.value.baseUrls && cfg.value.baseUrls[tab.value]) || '')

function update (next) { cfg.value = next }
function setKey (v) { update({ ...cfg.value, keys: { ...cfg.value.keys, [tab.value]: v.trim() } }) }
function setModel (v) { update({ ...cfg.value, models: { ...cfg.value.models, [tab.value]: v } }) }
function setBaseUrl (v) { update({ ...cfg.value, baseUrls: { ...(cfg.value.baseUrls || {}), [tab.value]: v.trim() } }) }

async function fetchModels () {
  const current = model.value
  busy.value = 'models'; msg.value = null
  try {
    const list = await AI.listModels(tab.value, key.value, baseUrl.value)
    models.value = list
    if (!list.length) msg.value = { kind: 'warn', text: t('Kontoen returnerede ingen modeller.') }
    else if (!list.some(m => m.id === current)) setModel(list[0].id)
  } catch (e) { msg.value = { kind: 'err', text: e.message } }
  busy.value = ''
}

async function test () {
  const prov = P.value
  busy.value = 'test'; msg.value = null
  try {
    const reply = await AI.testConnection(tab.value, key.value, model.value, baseUrl.value)
    msg.value = { kind: 'ok', text: t('Forbindelsen virker.') + ' ' + t(prov.label) + ' ' + t('svarede') + ' "' + (reply || '').slice(0, 40) + '".' }
  } catch (e) { msg.value = { kind: 'err', text: e.message } }
  busy.value = ''
}

function save () {
  AI.setConfig({ ...cfg.value, provider: tab.value })
  close()
}

function forget () {
  const next = { ...cfg.value, keys: { ...cfg.value.keys, [tab.value]: '' } }
  cfg.value = next
  AI.setConfig({ ...next, provider: tab.value })
  msg.value = { kind: 'ok', text: t('Nøglen er slettet fra denne browser.') }
}

const masked = computed(() => (key.value && !reveal.value ? key.value.slice(0, 7) + '•'.repeat(Math.max(0, Math.min(24, key.value.length - 11))) + key.value.slice(-4) : key.value))
// Copilot (Azure) har intet fælles endpoint, så bankens egen adresse er påkrævet
const needsEndpoint = computed(() => !!P.value.needsEndpoint)
// Lokal motor kræver ingen nøgle, men den valgte kommandolinje skal være klar
const canUse = computed(() => (isLocal.value
  ? !!(local.value && local.value[model.value] && local.value[model.value].available)
  : !!key.value && (!needsEndpoint.value || !!baseUrl.value)))

// Udbydere, der er klar til brug (vises med en prik og "klar")
const has = (p) => (p === 'local'
  ? !!(local.value && ((local.value.claude && local.value.claude.available) || (local.value.codex && local.value.codex.available)))
  : !!cfg.value.keys[p] && (!AI.PROVIDERS[p].needsEndpoint || !!(cfg.value.baseUrls && cfg.value.baseUrls[p])))
// Esc i den åbne modelliste lukker kun listen, som i en almindelig select, ikke hele dialogen
// (ant-design-vue 3.2.13's select lader Esc boble videre til dialogen, så den lukker med
// den nøgle, man lige har skrevet).
const selectEsc = useSelectEscape()
const onFoldKeydown = useCollapseKeyboard()
const engineStatus = (en) => (local.value && local.value[en.id]) || { available: false, detail: t('Undersøger…') }
const modelOptions = computed(() => models.value.map(m => ({ value: m.id, label: m.label })))
const alertType = (kind) => (kind === 'ok' ? 'success' : kind === 'warn' ? 'warning' : 'error')

const intro = computed(() => (isLocal.value
  ? (local.value && local.value.hosted
    ? t('Denne mulighed kalder Claude Code eller Codex på din egen maskine, så der ikke bruges API-kredit. Den virker kun når prototypen er startet lokalt med devserver.js. Her på nettet skal du bruge en API-nøgle.')
    : t('Memoet skrives med den Claude Code eller Codex du allerede har installeret. De logger ind med selve abonnementet, så der bruges ingen API-kredit. Til gengæld virker det kun på din egen maskine.'))
  : t('Memoet skrives med din egen konto hos') + ' ' + P.value.vendor + '. ' + t('Nøglen gemmes kun i denne browser og sendes udelukkende til den udbyder du vælger. Forbruget afregnes som API-forbrug på din konto, ikke på dit abonnement.')))
</script>

<template>
  <a-modal
    :visible="open"
    :wrap-props="{ 'aria-modal': 'true' }"
    :title="t('Forbind din AI-konto')"
    :width="572"
    @cancel="close"
  >
    <a-typography-paragraph type="secondary">
      {{ intro }}
    </a-typography-paragraph>

    <a-form layout="vertical">
      <a-form-item>
        <a-radio-group
          ref="providerGroup"
          v-model:value="tab"
          option-type="button"
          name="cw-ai-provider"
          role="radiogroup"
          :aria-label="t('Udbyder')"
        >
          <a-radio-button
            v-for="p in PROVIDER_IDS"
            :key="p"
            :value="p"
            :title="has(p) ? t('klar') : undefined"
          >
            <a-space :size="4">
              <span>{{ t(AI.PROVIDERS[p].label) }}</span>
              <template v-if="has(p)">
                <a-badge
                  status="default"
                  aria-hidden="true"
                />
                <span class="sr-only">{{ t('klar') }}</span>
              </template>
            </a-space>
          </a-radio-button>
        </a-radio-group>
      </a-form-item>

      <!-- Dit abonnement: Claude Code eller Codex på maskinen (via devserver.js) -->
      <template v-if="isLocal">
        <a-form-item :label="t('Motor')">
          <a-radio-group
            :value="model"
            name="cw-ai-engine"
            role="radiogroup"
            :aria-label="t('Motor')"
            @change="(e) => setModel(e.target.value)"
          >
            <a-space direction="vertical">
              <a-radio
                v-for="en in P.engines"
                :key="en.id"
                :value="en.id"
              >
                {{ en.label }}
                <a-typography-text type="secondary">
                  - {{ engineStatus(en).available ? t('klar') : t('ikke klar') }}
                </a-typography-text>
                <a-typography-text
                  type="secondary"
                  class="ai-block"
                >
                  {{ t(en.hint) }}. {{ t(engineStatus(en).detail) }}
                </a-typography-text>
              </a-radio>
            </a-space>
          </a-radio-group>
        </a-form-item>
        <a-typography-paragraph type="secondary">
          {{ t('Kaldene går gennem prototypens dev-server til kommandolinjen på din maskine. Intet forlader maskinen ud over det, kommandolinjen selv sender til leverandøren. Første svar tager typisk 5 til 10 sekunder, fordi kommandolinjen skal starte op. Dit abonnements forbrugslofter gælder stadig.') }}
        </a-typography-paragraph>
      </template>

      <!-- API-nøgle: Claude, ChatGPT eller Copilot (Azure) -->
      <template v-else>
        <a-form-item
          v-if="needsEndpoint"
          :label="t('Adresse på jeres Azure-ressource')"
          html-for="cw-ai-endpoint"
          :extra="t('Microsoft 365 Copilot har ikke et API man kan forbinde til direkte. Brug i stedet den Azure OpenAI-ressource jeres Copilot kører på. Adressen står under Keys and Endpoint i Azure-portalen.')"
        >
          <a-input
            id="cw-ai-endpoint"
            :value="baseUrl"
            :placeholder="P.endpointHint"
            spellcheck="false"
            @update:value="setBaseUrl"
          />
        </a-form-item>

        <a-form-item
          :label="t('API-nøgle fra') + ' ' + P.vendor"
          html-for="cw-ai-key"
        >
          <div class="ai-row">
            <a-input
              id="cw-ai-key"
              class="ai-grow"
              type="text"
              :value="reveal ? key : masked"
              :placeholder="P.keyHint"
              spellcheck="false"
              autocomplete="off"
              @focus="reveal = true"
              @update:value="setKey"
            />
            <a-button
              :title="reveal ? t('Skjul') : t('Vis')"
              @click="reveal = !reveal"
            >
              {{ reveal ? t('Skjul') : t('Vis') }}
            </a-button>
          </div>
          <template #extra>
            {{ t('Hent en nøgle på') }}
            <a
              :href="P.consoleUrl"
              target="_blank"
              rel="noopener noreferrer"
            >{{ P.consoleUrl.replace('https://', '') }}</a>
          </template>
        </a-form-item>

        <a-form-item
          :label="needsEndpoint ? t('Udrulning (deployment)') : t('Model')"
          html-for="cw-ai-model"
          :extra="needsEndpoint
            ? t('Navnet I gav modellen, da den blev udrullet i Azure AI Foundry. Det er ikke nødvendigvis det samme som modellens navn.')
            : t('Hent modeller viser dem din konto faktisk har adgang til, så du ikke skal gætte et modelnavn.')"
        >
          <div
            class="ai-row"
            @keydown.capture="selectEsc.onKeydownCapture"
            @keydown="selectEsc.onKeydown"
          >
            <a-select
              v-if="models.length"
              id="cw-ai-model"
              class="ai-grow"
              :value="model"
              :options="modelOptions"
              @change="setModel"
            />
            <a-input
              v-else
              id="cw-ai-model"
              class="ai-grow"
              :value="model"
              spellcheck="false"
              @update:value="setModel"
            />
            <a-button
              v-if="!needsEndpoint"
              :disabled="!key || busy === 'models'"
              :loading="busy === 'models'"
              @click="fetchModels"
            >
              {{ busy === 'models' ? t('Henter…') : t('Hent modeller') }}
            </a-button>
          </div>
        </a-form-item>

        <!-- Mellemrum folder også (a-collapse 3.2.13 reagerer kun på Enter) -->
        <div
          v-if="!needsEndpoint"
          @keydown="onFoldKeydown"
        >
          <a-collapse
            ghost
            :expand-icon="collapseExpandIcon"
          >
            <a-collapse-panel
              key="advanced"
              :header="t('Avanceret')"
            >
              <a-form-item
                :label="t('Endpoint')"
                html-for="cw-ai-base-url"
                :extra="t('Lad feltet stå tomt for at gå direkte til') + ' ' + P.vendor + '. ' + t('Udfyld det kun hvis kaldene skal gennem en proxy i huset eller et testmiljø.')"
              >
                <a-input
                  id="cw-ai-base-url"
                  :value="baseUrl"
                  :placeholder="P.baseUrl"
                  spellcheck="false"
                  @update:value="setBaseUrl"
                />
              </a-form-item>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </template>
    </a-form>

    <a-alert
      v-if="msg"
      :type="alertType(msg.kind)"
      :message="msg.text"
      show-icon
    />

    <template #footer>
      <div class="ai-footer">
        <a-button
          v-if="!isLocal && key"
          type="text"
          @click="forget"
        >
          {{ t('Glem nøglen') }}
        </a-button>
        <a-space class="ai-footer-actions">
          <a-button
            :disabled="!canUse || busy === 'test'"
            :loading="busy === 'test'"
            @click="test"
          >
            {{ busy === 'test' ? t('Tester…') : t('Test forbindelse') }}
          </a-button>
          <a-button @click="close">
            {{ t('Annullér') }}
          </a-button>
          <a-button
            type="primary"
            :disabled="!canUse"
            @click="save"
          >
            {{ t('Gem') }}
          </a-button>
        </a-space>
      </div>
    </template>
  </a-modal>
</template>

<style scoped>
.ai-row {
  display: flex;
  gap: 8px;
}

.ai-grow {
  flex: 1;
  min-width: 0;
}

.ai-block {
  display: block;
}

.ai-footer {
  display: flex;
  align-items: center;
}

.ai-footer-actions {
  margin-left: auto;
}
</style>
