<script setup>
// En fejl i memoet må ikke gøre hele appen hvid (memo.jsx: MemoErrorBoundary, L7151-7175). Grænsen viser en
// rolig besked med mulighed for at prøve igen; resten af sagen virker videre. "Prøv igen" tegner indholdet
// forfra (ny nøgle). Fejlen skrives i konsollen som før (console.warn).
// Som Reacts fejlgrænse fanges fejl, mens indholdet tegnes, opsættes og opdateres, men ikke fejl i en
// handler for et klik eller tastetryk (de kommer i konsollen, og memoet bliver stående).
// Indholdet tegnes af en lille komponent under grænsen (BoundaryContent): onErrorCaptured fanger kun fejl
// fra komponenter under den, og uden den ville fejl i selve indholdet (slottet) gå forbi.
//
// Brug: <MemoErrorBoundary> <MemoEditor /> </MemoErrorBoundary> (WorkspaceView.vue), så fejl i selve
// MemoEditor også fanges, som da grænsen lå om prototypens WSMemo. Props og emits: ingen.
import { ErrorCodes, ErrorTypeStrings, defineComponent, onErrorCaptured, ref } from 'vue'
import { t } from '@/i18n'

const err = ref(null)
const retryKey = ref(0)

const BoundaryContent = defineComponent({
  name: 'MemoErrorBoundaryContent',
  setup (_props, { slots }) {
    return () => (slots.default ? slots.default() : null)
  },
})

// Vue oplyser, hvor fejlen opstod: i udvikling som tekst (ErrorTypeStrings), i en build som et link, der
// slutter med fejlkoden (Vue's "Production Error Code Reference"). Handlerne er Vue's egne koder.
const HANDLERS = [ErrorCodes.NATIVE_EVENT_HANDLER, ErrorCodes.COMPONENT_EVENT_HANDLER]
const inHandler = (info) => HANDLERS.some(code => String(info).endsWith('#runtime-' + code) || info === ErrorTypeStrings[code])

onErrorCaptured((e, _instance, info) => {
  if (inHandler(info)) return
  err.value = e
  try { console.warn('Memoet kunne ikke vises:', e && e.message) } catch (x) {}
  return false
})

function retry () {
  err.value = null
  retryKey.value++
}
</script>

<template>
  <BoundaryContent
    v-if="!err"
    :key="retryKey"
  >
    <slot />
  </BoundaryContent>
  <div
    v-else
    class="memo-error"
  >
    <a-card role="alert">
      <a-result
        status="warning"
        :title="t('Memoet kunne ikke vises lige nu')"
        :sub-title="t('Teksten er gemt. Prøv igen, eller genindlæs siden.')"
      >
        <template #extra>
          <a-button
            type="primary"
            size="small"
            @click="retry"
          >
            {{ t('Prøv igen') }}
          </a-button>
        </template>
      </a-result>
    </a-card>
  </div>
</template>

<style scoped>
/* Beskeden står midt på siden i en smal kolonne */
.memo-error {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 28px 80px;
}
</style>
