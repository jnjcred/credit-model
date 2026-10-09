<script setup>
// Ny sag, trin 2 "Sag og materiale" (new_case_portal.jsx L352-454): sagstype, beløb og det
// materiale, kunden skal sende. Listen er forvalgt ud fra sagstypen (CW.defaultSelection); resten
// ligger i to folde. Fravælges et anbefalet punkt, spørges der først i rækken ("Behold"/"Fravælg").
//
// Props: caseType ('' eller en NC_CASE_TYPES-værdi), amount (beløbet som skrevet),
//        error ('type' | 'amount' | 'items', når "Næste" er forsøgt; ellers null),
//        typeObj (den valgte sagstype eller null), amountVal (ncParseAmount(amount)),
//        mainItems, moreItems, caseItems (listen, folden "Mere materiale" og folden "Findes allerede
//        i sag"), sel ({ [id]: valgt }), confirmDrop (punktet, der spørges om, eller null).
// Emits: update:caseType, update:amount (v-model), toggle (punkt), keep ("Behold"),
//        drop (punkt, "Fravælg"), add (punkt, "Tilføj" / "Bed om ny version").
//
// Beløbet er fri tekst (a-input), som guiden læser med ncParseAmount: "4,5 mio.", "DKK 4.500.000" osv.
import { computed, watch } from 'vue'
import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { NC_CASE_TYPES, NC_GUARANTEE_SHARE, ncFill, ncFmtDKK } from '@/domain/new_case_portal'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'

const props = defineProps({
  caseType: { type: String, default: '' },
  amount: { type: String, default: '' },
  error: { type: String, default: null },
  typeObj: { type: Object, default: null },
  amountVal: { type: Number, default: null },
  mainItems: { type: Array, default: () => [] },
  moreItems: { type: Array, default: () => [] },
  caseItems: { type: Array, default: () => [] },
  sel: { type: Object, default: () => ({}) },
  confirmDrop: { type: String, default: null },
})
const emit = defineEmits(['update:caseType', 'update:amount', 'toggle', 'keep', 'drop', 'add'])

const invalid = (k) => props.error === k
const amountWarn = computed(() => {
  const v = props.amountVal
  return v != null && (v < 50000 || v > 500e6) ? (v < 50000 ? 'low' : 'high') : null
})
const amountLabel = computed(() => (!props.typeObj ? t('Beløb (DKK)') : props.typeObj.basis === 'facility' ? t('Bankens facilitet (DKK)') : t('Lånebeløb fra EIFO (DKK)')))
const amountHint = computed(() => {
  const o = props.typeObj
  const v = props.amountVal
  return !o ? t('Vælg sagstype først. Ved kaution er det bankens facilitet, ved lån det beløb, EIFO låner ud.')
    : o.basis === 'facility'
      ? (v != null
        ? ncFill(t('{amount}. EIFO kautionerer typisk for op til 80 % af facilitetens beløb, her ca. {eifo}.'), { amount: ncFmtDKK(v), eifo: ncFmtDKK(v * NC_GUARANTEE_SHARE) })
        : t('Hele bankens facilitet. EIFO kautionerer typisk for op til 80 % af den.'))
      : (v != null ? ncFmtDKK(v) + '. ' + t('Det beløb, virksomheden søger at låne hos EIFO.') : t('Det beløb, virksomheden søger at låne hos EIFO.'))
})
const amountDescribedBy = computed(() => ['nc-amount-hint', invalid('amount') ? 'nc-amount-err' : null, amountWarn.value ? 'nc-amount-warn' : null].filter(Boolean).join(' '))
// Kategorien til højre i rækken (workspace' wsMaterialCat, som før læst som global)
const catOf = (it) => (typeof window.wsMaterialCat === 'function' ? t(window.wsMaterialCat(it)) : '')

// "Fravælg anbefalet punkt?": fokus på "Behold", når spørgsmålet vises (før: autoFocus)
let keepBtn = null
const setKeepBtn = (el) => { keepBtn = el }
watch(() => props.confirmDrop, (id) => {
  if (id && keepBtn && keepBtn.$el) keepBtn.$el.focus()
}, { flush: 'post' })

// ant-design-vue 3.2.13: foldens overskrift reagerer kun på Enter. Mellemrum folder også, som på knappen før.
// Foldene styrer selv, om de er åbne, og er lukkede, hver gang de vises (som CWFold før).
const onFoldKeydown = useCollapseKeyboard()
</script>

<template>
  <a-form layout="vertical">
    <!-- Sagstype: påkrævet, intet forvalg -->
    <a-form-item
      required
      :validate-status="invalid('type') ? 'error' : ''"
    >
      <template #label>
        <span id="nc-type-label">{{ t('Sagstype') }}<span class="sr-only"> {{ t('påkrævet') }}</span></span>
      </template>
      <a-radio-group
        :value="caseType"
        name="nc-type"
        role="radiogroup"
        aria-labelledby="nc-type-label"
        aria-required="true"
        :aria-invalid="invalid('type') ? 'true' : undefined"
        :aria-describedby="invalid('type') ? 'nc-type-err' : undefined"
        class="nc-full"
        @change="(e) => emit('update:caseType', e.target.value)"
      >
        <a-row :gutter="[8, 8]">
          <a-col
            v-for="x in NC_CASE_TYPES"
            :key="x.v"
            :xs="24"
            :sm="12"
          >
            <a-radio
              :id="'nc-type-' + x.v"
              :value="x.v"
            >
              <a-typography-text strong>
                {{ t(x.l) }}
              </a-typography-text>
              <br>
              <a-typography-text type="secondary">
                {{ t(x.d) }}
              </a-typography-text>
            </a-radio>
          </a-col>
        </a-row>
      </a-radio-group>
      <template
        v-if="invalid('type')"
        #help
      >
        <span id="nc-type-err">{{ t('Vælg sagstypen, så vi ved, hvilket beløb der menes.') }}</span>
      </template>
    </a-form-item>

    <!-- Beløbet: fri tekst; fejl og advarsel udelukker hinanden -->
    <a-form-item
      required
      html-for="nc-amount"
      :label="amountLabel"
      :validate-status="invalid('amount') ? 'error' : amountWarn ? 'warning' : ''"
    >
      <a-input
        id="nc-amount"
        :value="amount"
        :placeholder="t('f.eks. 4.500.000 eller 4,5 mio.')"
        inputmode="decimal"
        aria-required="true"
        :aria-invalid="invalid('amount') ? 'true' : undefined"
        :aria-describedby="amountDescribedBy"
        @update:value="(v) => emit('update:amount', v)"
      />
      <template
        v-if="invalid('amount') || amountWarn"
        #help
      >
        <span
          v-if="invalid('amount')"
          id="nc-amount-err"
        >{{ amount.trim() ? t('Skriv beløbet som et tal, f.eks. 4.500.000 eller 4,5 mio.') : t('Beløbet skal udfyldes.') }}</span>
        <!-- Advarslen står i normal tekstfarve med et gult ikon foran (advarselsfarven er for lys til tekst) -->
        <a-typography-text
          v-if="amountWarn"
          id="nc-amount-warn"
        >
          <a-typography-text type="warning">
            <ExclamationCircleOutlined aria-hidden="true" />
          </a-typography-text>
          {{ amountWarn === 'low' ? t('Beløbet er usædvanligt lavt for en sag hos EIFO. Tjek antallet af nuller.') : t('Beløbet er usædvanligt højt. Tjek antallet af nuller.') }}
        </a-typography-text>
      </template>
      <template #extra>
        <span id="nc-amount-hint">{{ amountHint }}</span>
      </template>
    </a-form-item>

    <!-- Materialet: listen, "Mere materiale" og (sagens egen virksomhed) "Findes allerede i sag" -->
    <a-form-item :validate-status="invalid('items') ? 'error' : ''">
      <template #label>
        <span id="nc-items-label">{{ t('Materiale kunden skal sende') }}</span>
      </template>
      <div
        role="group"
        aria-labelledby="nc-items-label"
        :aria-describedby="'nc-items-hint' + (invalid('items') ? ' nc-items-err' : '')"
      >
        <a-typography-paragraph
          id="nc-items-hint"
          type="secondary"
        >
          {{ typeObj ? t('Forvalgt ud fra sagstypen. Du kan ændre listen i sagen, før du sender.') : t('Vælg sagstypen ovenfor. Materialet og begrundelserne til kunden afhænger af produktet.') }}
        </a-typography-paragraph>
        <template v-if="typeObj">
          <a-list
            :data-source="mainItems"
            row-key="id"
          >
            <template #renderItem="{ item: it }">
              <a-list-item>
                <div class="nc-item">
                  <!-- Hvorfor punktet er med, som tooltip på rækken (før: title) -->
                  <a-tooltip
                    :title="it.why ? t(it.why) : undefined"
                    placement="topLeft"
                  >
                    <a-row
                      justify="space-between"
                      align="middle"
                      :gutter="12"
                      :wrap="false"
                    >
                      <a-col flex="auto">
                        <a-checkbox
                          :id="'nc-item-' + it.id"
                          :checked="!!sel[it.id]"
                          @change="emit('toggle', it)"
                        >
                          <a-typography-text strong>
                            {{ t(it.label) }}
                          </a-typography-text>
                        </a-checkbox>
                      </a-col>
                      <a-col>
                        <a-typography-text type="secondary">
                          {{ catOf(it) }}
                        </a-typography-text>
                      </a-col>
                    </a-row>
                  </a-tooltip>
                  <a-alert
                    v-if="confirmDrop === it.id"
                    type="warning"
                    role="alertdialog"
                    :aria-label="t('Fravælg anbefalet punkt')"
                    class="nc-item-confirm"
                  >
                    <template #message>
                      <a-typography-text strong>
                        {{ ncFill(t('{item} er anbefalet.'), { item: t(it.label) }) }}
                      </a-typography-text>
                      {{ ' ' + t(it.why) + ' ' + t('Fravælg alligevel?') + ' ' }}
                      <a-space>
                        <a-button
                          :ref="setKeepBtn"
                          size="small"
                          @click="emit('keep')"
                        >
                          {{ t('Behold') }}
                        </a-button>
                        <a-button
                          type="text"
                          size="small"
                          @click="emit('drop', it)"
                        >
                          {{ t('Fravælg') }}
                        </a-button>
                      </a-space>
                    </template>
                  </a-alert>
                </div>
              </a-list-item>
            </template>
          </a-list>
          <div
            v-if="moreItems.length > 0"
            @keydown="onFoldKeydown"
          >
            <a-collapse
              ghost
              destroy-inactive-panel
              :expand-icon="collapseExpandIcon"
            >
              <a-collapse-panel
                id="nc-more"
                key="more"
                :header="ncFill(t('Mere materiale, du kan bede om ({n})'), { n: moreItems.length })"
              >
                <a-list
                  :data-source="moreItems"
                  row-key="id"
                >
                  <template #renderItem="{ item: it }">
                    <a-list-item>
                      <div>
                        <a-typography-text>{{ t(it.label) }}</a-typography-text>
                        <template v-if="it.hint">
                          <br>
                          <a-typography-text type="secondary">
                            {{ t(it.hint) }}
                          </a-typography-text>
                        </template>
                      </div>
                      <template #actions>
                        <a-button
                          type="text"
                          size="small"
                          :aria-label="ncFill(t('Tilføj {item}'), { item: t(it.label) })"
                          @click="emit('add', it)"
                        >
                          <template #icon>
                            <PlusOutlined aria-hidden="true" />
                          </template>
                          {{ t('Tilføj') }}
                        </a-button>
                      </template>
                    </a-list-item>
                  </template>
                </a-list>
              </a-collapse-panel>
            </a-collapse>
          </div>
          <div
            v-if="caseItems.length > 0"
            @keydown="onFoldKeydown"
          >
            <a-collapse
              ghost
              destroy-inactive-panel
              :expand-icon="collapseExpandIcon"
            >
              <a-collapse-panel
                id="nc-incase"
                key="incase"
                :header="ncFill(t('Findes allerede i sag {nr} ({n})'), { nr: DATA.COMPANY.caseNr, n: caseItems.length })"
              >
                <a-list
                  :data-source="caseItems"
                  row-key="id"
                >
                  <template #renderItem="{ item: it }">
                    <a-list-item>
                      <a-typography-text>{{ t(it.label) }}</a-typography-text>
                      <template #actions>
                        <a-button
                          type="text"
                          size="small"
                          @click="emit('add', it)"
                        >
                          {{ t('Bed om ny version') }}
                        </a-button>
                      </template>
                    </a-list-item>
                  </template>
                </a-list>
              </a-collapse-panel>
            </a-collapse>
          </div>
        </template>
      </div>
      <template
        v-if="invalid('items')"
        #help
      >
        <span id="nc-items-err">{{ t('Vælg mindst ét punkt.') }}</span>
      </template>
    </a-form-item>
  </a-form>
</template>

<style scoped>
/* Typerne står i to kolonner i hele feltets bredde */
.nc-full {
  width: 100%;
}

/* Et punkt fylder rækken; spørgsmålet om at fravælge står under det */
.nc-item {
  flex: 1;
  min-width: 0;
}

.nc-item-confirm {
  margin-top: 8px;
}
</style>
