<script setup>
// Banneret over et låst memo (memo.jsx: WSMemo L6776-6815): memoet er indstillet, og det siges hvorfor og
// hvordan man låser op. "Indstillet version N, <dato>." og en af:
//  - "Sammenlignet med version N-1." (sammenligning), "Tidligere version, skrivebeskyttet." (en tidligere
//    version) eller "Træk indstillingen tilbage i sagen for at redigere." (den gældende indstilling)
//  - evt. "Der blev ikke gemt en kopi ved indstillingen, så det viste er kladden." og en note, hvis
//    versionen blev indstillet på det andet sprog
// Knapper: "Sammenlign med version N-1", "Vis version N", "Åbn version N-1" og "Til den gældende version" /
// "Tilbage til udkastet". Banneret kan få fokus (#memo-version-banner): siden giver det fokus, når en
// version åbnes, og det er en statusmeddelelse (role="status").
//
// Props: locked (memoLocked(): { version, at, sections, lang, past, compare }), hasPrevVersion (den
//        forrige version findes), submitted (sagen er indstillet: "Til den gældende version").
// Emits: compare(true | false) (sammenlign med den forrige / vis versionen alene), open(versionsnummer),
//        close (tilbage til den gældende version eller udkastet).
import { computed } from 'vue'
import { CheckCircleOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { MEMO_EN } from '@/domain/memo/memoTemplates'
import { _memoFill, _memoFmtDay } from '@/domain/memo/memoFormat'

const props = defineProps({
  locked: { type: Object, required: true },
  hasPrevVersion: { type: Boolean, default: false },
  submitted: { type: Boolean, default: false },
})
const emit = defineEmits(['compare', 'open', 'close'])

// Teksten efter "Indstillet version N, <dato>.": hvad der vises, og evt. de to noter
const why = computed(() => {
  const l = props.locked
  const parts = [l.compare ? _memoFill(t('Sammenlignet med version {v}.'), { v: l.version - 1 })
    : l.past ? t('Tidligere version, skrivebeskyttet.')
      : t('Træk indstillingen tilbage i sagen for at redigere.')]
  if (!l.sections) parts.push(t('Der blev ikke gemt en kopi ved indstillingen, så det viste er kladden.'))
  if (l.lang && l.lang !== (MEMO_EN ? 'en' : 'da')) parts.push(l.lang === 'da' ? t('Versionen blev indstillet på dansk og vises, som den blev indstillet.') : t('Versionen blev indstillet på engelsk og vises, som den blev indstillet.'))
  return parts.join(' ')
})
const hasButtons = computed(() => props.hasPrevVersion || props.locked.compare || props.locked.past)
</script>

<template>
  <a-alert
    id="memo-version-banner"
    banner
    type="info"
    show-icon
    role="status"
    tabindex="-1"
  >
    <template #icon>
      <CheckCircleOutlined aria-hidden="true" />
    </template>
    <template #message>
      <strong>{{ t('Indstillet version') }} {{ locked.version }}, {{ _memoFmtDay(locked.at) }}.</strong>{{ ' ' + why }}
    </template>
    <template
      v-if="hasButtons"
      #description
    >
      <a-space wrap>
        <a-button
          v-if="hasPrevVersion && !locked.compare"
          size="small"
          @click="emit('compare', true)"
        >
          {{ _memoFill(t('Sammenlign med version {v}'), { v: locked.version - 1 }) }}
        </a-button>
        <a-button
          v-if="locked.compare"
          size="small"
          @click="emit('compare', false)"
        >
          {{ _memoFill(t('Vis version {v}'), { v: locked.version }) }}
        </a-button>
        <a-button
          v-if="hasPrevVersion"
          size="small"
          @click="emit('open', locked.version - 1)"
        >
          {{ _memoFill(t('Åbn version {v}'), { v: locked.version - 1 }) }}
        </a-button>
        <a-button
          v-if="locked.past || locked.compare"
          size="small"
          @click="emit('close')"
        >
          {{ submitted ? t('Til den gældende version') : t('Tilbage til udkastet') }}
        </a-button>
      </a-space>
    </template>
  </a-alert>
</template>

<style scoped>
/* Banneret får fokus fra siden, når en version åbnes (ikke et tabulatorstop) */
#memo-version-banner:focus {
  outline: none;
}
</style>
