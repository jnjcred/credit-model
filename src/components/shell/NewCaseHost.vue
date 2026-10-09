<script setup>
// Ny sag-guiden. Åbnes fra knappen Ny sag (useAppShell.newCaseOpen) eller fra andre skærme med
// window.dispatchEvent(new CustomEvent('cw-new-case', { detail: { name, cvr, type?, amount? } })),
// f.eks. en række uden sag i Porteføljeanalyse. detail sendes til guiden som prefill.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { newCaseOpen } from '@/composables/useAppShell'
import { useWindowEvent } from '@/composables/useWindowEvent'
import NewCaseModal from '@/views/portal/NewCaseModal.vue'

const prefill = ref(null)
const n = ref(0) // ny guide for hver forudfyldning

// Kvittering for "Nulstil demo" efter genindlæsningen
let resetTimer = null
onMounted(() => {
  let flag = null
  try { flag = sessionStorage.getItem('cw_reset_done'); sessionStorage.removeItem('cw_reset_done') } catch (e) {}
  if (!flag) return
  resetTimer = setTimeout(() => CW.toast(t('Demoen er nulstillet. Sagen, uploads, memoet og nye sager er slettet, og alt starter forfra.')), 400)
})
onBeforeUnmount(() => clearTimeout(resetTimer))

useWindowEvent('cw-new-case', (e) => {
  prefill.value = Object.assign({}, (e && e.detail) || {})
  n.value++
})

const visible = computed(() => newCaseOpen.value || !!prefill.value)

function done () {
  prefill.value = null
  newCaseOpen.value = false
}
</script>

<template>
  <NewCaseModal
    v-if="visible"
    :key="n"
    :prefill="prefill || undefined"
    @close="done"
  />
</template>
