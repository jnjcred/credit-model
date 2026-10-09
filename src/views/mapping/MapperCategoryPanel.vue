<script setup>
// Kategoripanelet i Kontomapping (højre side; før en del af MapperPage i src/mapper.jsx):
// fanerne "Crediwire kategorier" og "Søg efter kategori", linjen med de valgte konti
// (#map-side-start, som "Gå til kategorierne" flytter fokus til), en advarsel, når de valgte konti
// ikke passer til opgørelsen, og kategorierne med "Flyt hertil".
// props: selAcc (de valgte drifts- og statuskonti), selStmt ('pl' | 'bs' | 'mixed' | null),
//        countFor(id) (konti mappet til kategorien, med udkastet), canMove(kategori)
// emits: move(kategori), clear (fjern markeringen)
import { computed, nextTick, ref, watch } from 'vue'
import { Empty } from 'ant-design-vue'
import { RightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW_MAP } from '@/domain/mapping'
import { mapFill } from '@/domain/mapper'
import { useTabsKeyboard } from '@/composables/useTabsKeyboard'

const props = defineProps({
  selAcc: { type: Array, required: true },
  selStmt: { type: String, default: null },
  countFor: { type: Function, required: true },
  canMove: { type: Function, required: true },
})
const emit = defineEmits(['move', 'clear'])

const M = CW_MAP
const tab = ref('cats')
const stmt = ref('pl')
const group = ref('Omsætning')
const sub = ref(null)
const catQuery = ref('')
const catSearch = ref(null)

// Vælges konti af én slags, skifter panelet til den opgørelse, de hører til
watch(() => props.selStmt, (selStmt) => {
  if ((selStmt === 'pl' || selStmt === 'bs') && stmt.value !== selStmt) {
    stmt.value = selStmt; group.value = M.GROUPS.find(g => g.stmt === selStmt).label; sub.value = null
  }
})
const showStmt = (k) => { stmt.value = k; group.value = M.GROUPS.find(x => x.stmt === k).label; sub.value = null }

// Fanerne: piletaster, Home og End skifter fane. Søgefeltet får fokus, når fanen åbnes med klik
// eller Enter (som autoFocus før); med piletasterne bliver fokus på fanen.
const onTabsKeydown = useTabsKeyboard('map-tabs', () => ['cats', 'search'], (k) => { tab.value = k })
watch(tab, (v) => {
  if (v === 'search') nextTick(() => { if (catSearch.value) catSearch.value.focus() })
})

// Undergrupperne: et klik på den valgte viser alle igen (som før)
const onSubClick = (s) => { if (sub.value === s) sub.value = null }

const groups = computed(() => M.GROUPS.filter(g => g.stmt === stmt.value))
const g = computed(() => groups.value.find(x => x.label === group.value) || groups.value[0])
const subs = computed(() => g.value.subs.filter(s => !sub.value || s[0] === sub.value))
const cq = computed(() => catQuery.value.trim().toLowerCase())
const catHits = computed(() => (cq.value ? M.CATS.filter(c => [c.label, c.group, c.sub, t(c.label), t(c.group), t(c.sub)].some(s => s.toLowerCase().includes(cq.value))) : []))

// Advarslen: de valgte er både drifts- og statuskonti, eller hører til den anden opgørelse
const blocked = computed(() => props.selAcc.length > 0 && (props.selStmt === 'mixed' || (tab.value === 'cats' && props.selStmt !== stmt.value)))
const blockText = computed(() => (props.selStmt === 'mixed'
  ? t('Driftskonti og statuskonti kan ikke flyttes sammen. Vælg kun den ene slags.')
  : props.selStmt === 'bs' ? t('De valgte er statuskonti. De kan kun flyttes til en kategori i balancen.') : t('De valgte er driftskonti. De kan kun flyttes til en kategori i resultatopgørelsen.')))

// Listerne: kategorierne pr. undergruppe, eller søgeresultaterne (med gruppe og undergruppe)
const sections = computed(() => (tab.value === 'cats'
  ? subs.value.map(s => ({ key: s[0], header: t(s[0]), cats: M.CATS.filter(c => c.group === g.value.label && c.sub === s[0]), showPath: false }))
  : catHits.value.length > 0 ? [{ key: 'hits', header: '', cats: catHits.value, showPath: true }] : []))

// "Flyt hertil" er slået fra, når de valgte konti ikke passer (eller ingen er valgt); grunden står i tooltip
const moveReason = (c) => (props.canMove(c) ? undefined : props.selAcc.length ? t('Driftskonti kan kun mappes til resultatopgørelsen og statuskonti kun til balancen') : t('Vælg først konti til venstre'))
</script>

<template>
  <aside
    class="map-side"
    :aria-label="t('Crediwire kategorier')"
  >
    <div class="map-side-head">
      <div @keydown="onTabsKeydown">
        <a-tabs
          id="map-tabs"
          :active-key="tab"
          @change="(k) => { tab = k }"
        >
          <a-tab-pane
            key="cats"
            :tab="t('Crediwire kategorier')"
          />
          <a-tab-pane
            key="search"
            :tab="t('Søg efter kategori')"
          />
        </a-tabs>
      </div>
      <div
        id="map-side-start"
        tabindex="-1"
        class="map-selbar"
        role="status"
      >
        <a-typography-text
          v-if="selAcc.length === 0"
          type="secondary"
        >
          {{ t('Vælg konti til venstre, og flyt dem til en kategori.') }}
        </a-typography-text>
        <template v-else>
          <span>
            <a-typography-text strong>{{ mapFill(selAcc.length === 1 ? t('1 konto valgt') : t('{n} konti valgt'), { n: selAcc.length }) }}</a-typography-text>
            <a-typography-text
              v-if="selStmt === 'mixed'"
              type="secondary"
            >{{ ' - ' + t('både drifts- og statuskonti') }}</a-typography-text>
          </span>
          <a-button
            class="cw-link"
            type="link"
            size="small"
            @click="emit('clear')"
          >
            {{ t('Fjern markering') }}
          </a-button>
        </template>
      </div>
      <a-alert
        v-if="blocked"
        type="warning"
      >
        <template #message>
          {{ blockText }}
          <a-button
            v-if="selStmt !== 'mixed'"
            class="cw-link"
            type="link"
            size="small"
            @click="showStmt(selStmt)"
          >
            {{ selStmt === 'bs' ? t('Vis balancen') : t('Vis resultatopgørelsen') }}
          </a-button>
        </template>
      </a-alert>
    </div>

    <div class="map-side-body">
      <a-form
        v-if="tab === 'cats'"
        layout="vertical"
      >
        <a-form-item :label="t('Opgørelse')">
          <a-radio-group
            :value="stmt"
            name="map-stmt"
            role="radiogroup"
            :aria-label="t('Opgørelse')"
            @change="(e) => showStmt(e.target.value)"
          >
            <a-radio value="pl">
              {{ t('Resultatopgørelse') }}
            </a-radio>
            <a-radio value="bs">
              {{ t('Balance') }}
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="stmt === 'pl' ? t('Resultatopgørelse') : t('Balance')">
          <a-radio-group
            :value="g.label"
            name="map-group"
            role="radiogroup"
            :aria-label="stmt === 'pl' ? t('Resultatopgørelse') : t('Balance')"
            @change="(e) => { group = e.target.value; sub = null }"
          >
            <a-radio
              v-for="x in groups"
              :key="x.label"
              :value="x.label"
            >
              {{ t(x.label) }}
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="t(g.label)">
          <!-- Knapperne står hver for sig (a-space), så de kan brydes over flere linjer som før -->
          <a-radio-group
            :value="sub || ''"
            option-type="button"
            size="small"
            name="map-sub"
            role="radiogroup"
            :aria-label="t('Undergruppe')"
            @change="(e) => { sub = e.target.value || null }"
          >
            <a-space
              :size="[6, 6]"
              wrap
            >
              <a-radio-button value="">
                {{ t('Alle') }}
              </a-radio-button>
              <a-radio-button
                v-for="s in g.subs"
                :key="s[0]"
                :value="s[0]"
                @click="onSubClick(s[0])"
              >
                {{ t(s[0]) }}
              </a-radio-button>
            </a-space>
          </a-radio-group>
        </a-form-item>
      </a-form>
      <a-form
        v-else
        layout="vertical"
      >
        <a-form-item
          :label="t('Søg efter kategori')"
          html-for="map-cat-search"
        >
          <a-input
            id="map-cat-search"
            ref="catSearch"
            v-model:value="catQuery"
            type="search"
            allow-clear
            :placeholder="t('F.eks. husleje, debitorer, leasing')"
          />
        </a-form-item>
      </a-form>
      <a-empty
        v-if="tab === 'search' && cq && !catHits.length"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      >
        <template #description>
          <a-typography-text type="secondary">
            {{ t('Ingen kategorier matcher.') }}
          </a-typography-text>
        </template>
      </a-empty>

      <a-space
        direction="vertical"
        :size="12"
        class="map-lists"
      >
        <a-list
          v-for="s in sections"
          :key="s.key"
          size="small"
          bordered
          :data-source="s.cats"
          row-key="id"
        >
          <template
            v-if="s.header"
            #header
          >
            <a-typography-text strong>
              {{ s.header }}
            </a-typography-text>
          </template>
          <!-- Kategorien til venstre; antal og "Flyt hertil" yderst til højre (extra: uden actions' faste
               48 px-margen, som ikke er plads til i panelet) -->
          <template #renderItem="{ item: c }">
            <a-list-item class="map-leaf">
              <a-space
                direction="vertical"
                :size="0"
              >
                <a-typography-text
                  v-if="s.showPath"
                  type="secondary"
                >
                  {{ t(c.group) }} › {{ t(c.sub) }}
                </a-typography-text>
                <span>{{ t(c.label) }}</span>
                <a-typography-text type="secondary">
                  {{ t('I Regnskab:') }} {{ t(c.entry) }}{{ c.child ? ' › ' + t(c.child) : '' }}
                </a-typography-text>
              </a-space>
              <template #extra>
                <a-space :size="4">
                  <a-tooltip
                    v-if="countFor(c.id) > 0"
                    :title="mapFill(countFor(c.id) === 1 ? t('1 konto er mappet hertil') : t('{n} konti er mappet hertil'), { n: countFor(c.id) })"
                  >
                    <a-tag>{{ countFor(c.id) }}</a-tag>
                  </a-tooltip>
                  <a-tooltip :title="moveReason(c)">
                    <a-button
                      class="cw-link"
                      type="link"
                      size="small"
                      :disabled="!canMove(c)"
                      :aria-label="mapFill(t('Flyt de valgte konti til {kat}'), { kat: t(c.label) })"
                      @click="emit('move', c)"
                    >
                      {{ t('Flyt hertil') }}
                      <RightOutlined aria-hidden="true" />
                    </a-button>
                  </a-tooltip>
                </a-space>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-space>
    </div>
  </aside>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Panelet er rudens anden kolonne og ruller selv (under 1000 px står det under tabellen) */
.map-side {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid @border-color-split;
}

.map-side-head {
  padding: 0 16px;
}

/* De valgte konti og "Fjern markering" på én linje */
.map-selbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 40px;
  margin-bottom: 8px;
  border-radius: 4px;
}

/* "Gå til kategorierne" flytter fokus hertil. antdv's grundstil fjerner fokusrammen (outline) på
   tabindex="-1", så fokus vises som en indvendig ring i temaets primærfarve, som før */
.map-selbar:focus-visible {
  box-shadow: inset 0 0 0 2px @primary-color;
}

.map-side-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 16px 16px;
}

.map-lists {
  width: 100%;
}

/* Afstand mellem kategoriens tekst og knapperne til højre */
.map-leaf {
  gap: 8px;
}

@media (max-width: 1000px) {
  .map-side {
    border-top: 1px solid @border-color-split;
    border-left: 0;
  }
}
</style>
