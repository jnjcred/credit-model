<script setup>
// Søgning på tværs af sager: navn, CVR (med eller uden mellemrum) og sagsnummer.
// Som før migrationen (shell.jsx: CaseSearch): listen åbner, når feltet får fokus, og uden søgetekst
// vises de seneste sager. Første træf er markeret, piletasterne flytter, Enter åbner sagen, Esc og
// Tab lukker listen. "Ryd søgning" tømmer feltet og holder listen åben.
import { computed, nextTick, ref } from 'vue'
import { CloseOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { go } from '@/composables/useNavigation'

const q = ref('')
const open = ref(false)
const root = ref(null)

const norm = (s) => String(s || '').toLowerCase().split(' ').join('')
const results = computed(() => {
  const all = DATA.CASES || []
  return q.value.trim()
    ? all.filter(c => {
      const s = norm(q.value)
      return norm(c.name).includes(s) || norm(c.cvr).includes(s) || norm(c.caseNr).includes(s)
    }).slice(0, 8)
    : all.filter(c => !c.archived).slice(0, 6)
})

// label bliver punkternes navn for skærmlæsere (antdv's skjulte liste viser ellers kun sagens id)
const options = computed(() => {
  const opts = results.value.map(c => ({
    value: String(c.id),
    label: c.name + ' ' + c.caseNr + ' CVR ' + c.cvr + ' · ' + t('Ansvarlig') + ': ' + c.responsible,
    c,
  }))
  return q.value.trim() === '' ? [{ label: t('Seneste sager'), options: opts }] : opts
})

function onSelect (id) {
  const c = (DATA.CASES || []).find(x => String(x.id) === String(id))
  open.value = false
  nextTick(() => { q.value = '' })
  try { sessionStorage.removeItem('cw_back') } catch (e) {} // tilbage fører til Mine opgaver
  if (c) go('workspace:' + c.id)
}

// Esc lukker kun listen og beholder teksten, som før. antdv gør feltet til type="search", og browserens
// søgefelt tømmer ellers teksten ved Esc (og listen blev stående med de seneste sager)
function onKeydownCapture (e) {
  if (e.key !== 'Escape' || !e.target || e.target.tagName !== 'INPUT') return
  e.preventDefault()
  open.value = false
}

function clear () {
  q.value = ''
  open.value = true
  const input = root.value && root.value.querySelector('input')
  if (input) input.focus()
}
</script>

<template>
  <div
    ref="root"
    role="search"
    class="case-search"
    @keydown.capture="onKeydownCapture"
  >
    <a-auto-complete
      v-model:value="q"
      class="case-search-field"
      :options="options"
      :open="open"
      :filter-option="false"
      :dropdown-match-select-width="340"
      placement="bottomRight"
      @select="onSelect"
      @focus="open = true"
      @dropdown-visible-change="(v) => { open = v }"
    >
      <template #option="{ c, label }">
        <div
          v-if="c"
          class="case-option"
        >
          <div class="case-option-text">
            <div>
              <a-typography-text strong>
                {{ c.name }}
              </a-typography-text>
              {{ ' ' }}
              <a-typography-text type="secondary">
                {{ c.caseNr }}
              </a-typography-text>
            </div>
            <a-typography-text type="secondary">
              CVR {{ c.cvr }} · {{ t('Ansvarlig') }}: {{ c.responsible }}
            </a-typography-text>
          </div>
          <RightOutlined aria-hidden="true" />
        </div>
        <template v-else>
          {{ label }}
        </template>
      </template>
      <!-- Ingen træf: sekundær tekst (antdv's tomme liste har den lysegrå, deaktiverede farve) -->
      <template #notFoundContent>
        <a-typography-text type="secondary">
          {{ t('Ingen sager matcher') + ' "' + q + '"' }}
        </a-typography-text>
      </template>
      <a-input
        :placeholder="t('Søg sag - navn, CVR eller sagsnr.')"
        :aria-label="t('Søg sag')"
      >
        <template #prefix>
          <SearchOutlined aria-hidden="true" />
        </template>
        <template #suffix>
          <a-button
            v-if="q"
            type="text"
            size="small"
            :aria-label="t('Ryd søgning')"
            @mousedown.prevent
            @click.stop="clear"
          >
            <template #icon>
              <CloseOutlined aria-hidden="true" />
            </template>
          </a-button>
        </template>
      </a-input>
    </a-auto-complete>
  </div>
</template>

<style scoped>
.case-search {
  width: 260px;
}

.case-search-field {
  width: 100%;
}

.case-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.case-option-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
</style>
