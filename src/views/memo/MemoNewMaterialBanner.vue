<script setup>
// Nyt materiale siden udkastet (memo.jsx: MemoNewMaterialBanner L5513-5540): de punkter, rådgiveren har
// godkendt (eller kunden har svaret på uden fil) efter memoets udkastdato (CASE_FACTS.asOf), og hvilke
// afsnit der skal læses igen: "Nyt materiale siden udkastet (25-09-2026): Periodetal. Læs afsnit 10 igen."
// "Se i Dokumenter" åbner sagens Dokumenter. En note (role="note"), ikke en meddelelse, der læses op.
// Punkterne og afsnittene står i memoNewMaterial (src/domain/memo/memoAppendix.js). Regnes igen, når memoet
// eller sagen ændrer sig ('cw-case-changed' og 'storage', som før).
// Kendt fra prototypen (bevaret): sagens nummer læses af localStorage cw_route uden try/catch.
//
// Props: version (memoets version: regnes igen, når den skifter).
import { computed, ref } from 'vue'
import { ExclamationCircleFilled } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { MEMO_SECTIONS } from '@/domain/memo/memoTemplates'
import { memoNewMaterial } from '@/domain/memo/memoAppendix'
import { go } from '@/composables/useNavigation'
import { useWindowEvent } from '@/composables/useWindowEvent'

const props = defineProps({
  version: { type: Number, default: 0 },
})

const tick = ref(0)
const on = () => { tick.value++ }
useWindowEvent('cw-case-changed', on)
useWindowEvent('storage', on)
const items = computed(() => { props.version; tick.value; return memoNewMaterial() })

const numsTxt = computed(() => {
  const secs = []
  items.value.forEach(x => x.sections.forEach(k => { if (!secs.includes(k)) secs.push(k) }))
  const nums = MEMO_SECTIONS.filter(s => secs.includes(s.k)).map(s => s.num)
  return { n: nums.length, txt: nums.length > 1 ? nums.slice(0, -1).join(', ') + ' ' + t('og') + ' ' + nums[nums.length - 1] : nums.join('') }
})
const lead = computed(() => {
  const asOf = window.CASE_FACTS && window.CASE_FACTS.asOf
  return t('Nyt materiale siden udkastet') + (asOf && window.DATA && DATA.fmt ? ' (' + DATA.fmt.longDate(asOf) + ')' : '') + ':'
})
const list = computed(() => items.value.map(x => x.label + (x.noted ? ' (' + t('kundens svar') + (x.note ? ': "' + x.note + '"' : '') + ')' : '')).join(', ') + '.' +
  (numsTxt.value.n ? ' ' + t('Læs afsnit') + ' ' + numsTxt.value.txt + ' ' + t('igen.') : ''))

function openDocuments () {
  const route = String(localStorage.getItem('cw_route') || 'workspace:1')
  const caseId = route.split(':')[1] || '1'
  go('workspace:' + caseId + ':documents')
}
</script>

<template>
  <a-alert
    v-if="items.length > 0"
    type="warning"
    show-icon
    role="note"
    class="memo-new-note"
  >
    <template #icon>
      <ExclamationCircleFilled aria-hidden="true" />
    </template>
    <template #message>
      <strong>{{ lead }}</strong>{{ ' ' + list }}
    </template>
    <template #description>
      <a-button
        size="small"
        @click="openDocuments"
      >
        {{ t('Se i Dokumenter') }}
      </a-button>
    </template>
  </a-alert>
</template>

<style scoped>
.memo-new-note {
  margin-bottom: 16px;
}
</style>
