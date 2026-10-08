<script setup>
// Under Bilag 3 (memo.jsx: MemoAppendixNote L5542-5574): dokumenter i sagen, som bilagslisten ikke nævner,
// "1 dokument i sagen står ikke i bilagslisten: …". "Tilføj til bilagslisten" (ikke i en låst version)
// føjer dem til listens tabel i afsnittets tekst; det er en rettelse af afsnittet: teksten gemmes (et
// input-event, som når rådgiveren skriver), og gennemgangen bliver forældet via tekstens fingeraftryk. Intet
// fortryd-trin (som før). En note (role="note").
// Listen læses 60 ms efter hver ændring af memoet: i det viste afsnit (#ms-appendix3), ellers i den gemte
// tekst. Reglerne står i memoAppendixMissing og memoAppendixAdd (src/domain/memo/memoAppendix.js).
//
// Props: readOnly (låst version: ingen knap), version (memoets version: listen læses igen, når den skifter).
import { ref, shallowRef, watch } from 'vue'
import { ExclamationCircleFilled } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { sectionHtml } from '@/domain/memo/memoReview'
import { memoAppendixAdd, memoAppendixMissing } from '@/domain/memo/memoAppendix'

const props = defineProps({
  readOnly: { type: Boolean, default: false },
  version: { type: Number, default: 0 },
})

const tick = ref(0)
const miss = shallowRef([])
watch(() => [props.version, tick.value], (_n, _o, onCleanup) => {
  const id = setTimeout(() => {
    const live = document.querySelector('#ms-appendix3 [contenteditable]') || document.querySelector('#ms-appendix3 .memo-body')
    let root = live
    if (!root) { root = document.createElement('div'); root.innerHTML = sectionHtml('appendix3') }
    miss.value = memoAppendixMissing(root)
  }, 60)
  onCleanup(() => clearTimeout(id))
}, { immediate: true })

function add () {
  const ed = document.querySelector('#ms-appendix3 [contenteditable]')
  if (!ed) return
  memoAppendixAdd(ed)
  ed.dispatchEvent(new Event('input', { bubbles: true }))
  tick.value++
  CW.toast(t('Bilagslisten er opdateret. Gennemgå Bilag 3 igen.'), { tone: 'ok' })
}
</script>

<template>
  <a-alert
    v-if="miss.length > 0"
    type="warning"
    show-icon
    role="note"
    class="memo-appx-note"
  >
    <template #icon>
      <ExclamationCircleFilled aria-hidden="true" />
    </template>
    <template #message>
      <strong>{{ miss.length + ' ' + (miss.length === 1 ? t('dokument i sagen står ikke i bilagslisten') : t('dokumenter i sagen står ikke i bilagslisten')) + ':' }}</strong>{{ ' ' + miss.map(d => d.name).join(', ') }}
    </template>
    <template
      v-if="!readOnly"
      #description
    >
      <a-button
        size="small"
        @click="add"
      >
        {{ t('Tilføj til bilagslisten') }}
      </a-button>
    </template>
  </a-alert>
</template>

<style scoped>
.memo-appx-note {
  margin-top: 10px;
}
</style>
