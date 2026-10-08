<script setup>
// Forhåndsvisningen i afsnitsassistenten (memo_ai.jsx: StreamPreview L765-796 og StreamWaiting L740-763).
// - Før første tegn: hvad der sker (lokal Codex sender først teksten, når hele svaret er færdigt; lokal
//   Claude Code skal starte op de første 8 sekunder; ellers venter vi på svaret) og sekunderne fra 3 s.
// - Mens teksten kommer: modellens rå tekst med linjeskift og en indikator for, at der stadig skrives.
// - Færdig: teksten renset med cleanHtml og vist med memoets typografi (.memo-body, global stylesheet).
// Boksen er højst 320 px høj og ruller til bunden, hver gang der kommer tekst. Det er den samme boks i alle
// tilstande, så rullepositionen bliver stående, når svaret er færdigt (som før).
// Kendt fra prototypen (bevaret): indikatoren bliver stående efter Stop og efter en fejl, så længe den
// halve tekst står der (den følger "ikke færdig", ikke "kører").
//
// Props: text (hele teksten indtil nu), running, done.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LoadingOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { AI } from '@/domain/ai'
import { cleanHtml } from '@/domain/memo/memoAi'

const props = defineProps({
  text: { type: String, default: '' },
  running: { type: Boolean, default: false },
  done: { type: Boolean, default: false },
})

// Rulleboksen (et DOM-element: kun som template-ref)
const box = ref(null)
const html = computed(() => (props.done ? cleanHtml(props.text) : null))
const toBottom = () => { if (box.value) box.value.scrollTop = box.value.scrollHeight }
onMounted(toBottom)
watch(() => props.text, toBottom, { flush: 'post' })

/* Mellemrummet fra man trykker til første tegn kommer. På API'et er det under et sekund, men den lokale bro
   skal starte en kommandolinje op først, og Codex sender ingenting før hele svaret er skrevet. Uden den her
   besked står der bare en indikator, og man er i tvivl om der overhovedet sker noget. */
const waiting = computed(() => props.running && !props.text && !props.done)
const secs = ref(0)
let timer = null
watch(waiting, (on) => {
  clearInterval(timer)
  timer = null
  if (!on) return
  secs.value = 0
  timer = setInterval(() => { secs.value += 1 }, 1000)
}, { immediate: true })
onBeforeUnmount(() => clearInterval(timer))

// Læser indstillingerne hvert sekund, som før (beskeden følger den valgte motor)
const waitText = computed(() => {
  const s = secs.value
  const cfg = AI.getConfig()
  const local = cfg.provider === 'local'
  const codex = local && cfg.models.local === 'codex'
  if (codex) return t('Codex skriver. Den sender først teksten når hele svaret er færdigt.')
  if (local) return s < 8 ? t('Starter Claude Code på din maskine.') : t('Claude Code tænker.')
  return t('Venter på svar.')
})
</script>

<template>
  <a-card
    v-if="text || running"
    size="small"
    class="ai-preview"
  >
    <div
      ref="box"
      class="ai-preview-scroll"
    >
      <!-- Modellens HTML, renset med cleanHtml (tilladte tags og attributter), som før -->
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="done"
        class="memo-body"
        v-html="html"
      />
      <!-- eslint-enable vue/no-v-html -->
      <a-typography v-else-if="text">
        <pre>{{ text }}<LoadingOutlined
          spin
          aria-hidden="true"
        /></pre>
      </a-typography>
      <a-space v-else>
        <a-spin
          size="small"
          aria-hidden="true"
        />
        <a-typography-text type="secondary">
          {{ waitText }}
        </a-typography-text>
        <a-typography-text
          v-if="secs > 2"
          type="secondary"
        >
          {{ secs }}s
        </a-typography-text>
      </a-space>
    </div>
  </a-card>
</template>

<style scoped>
/* Højst 320 px; længere tekst ruller i boksen */
.ai-preview-scroll {
  max-height: 320px;
  overflow-y: auto;
}
</style>
