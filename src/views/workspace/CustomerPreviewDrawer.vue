<script setup>
// Kundeside og Kundeflow (WSCustomerPreview i workspace.jsx L804–877): kundens portal i
// forhåndsvisning oven på sagen, i hele skærmens højde. Kundeside (flow false) viser kundens side;
// Kundeflow (flow true) de skærme, kunden kommer igennem, fra landingssiden. Statusboksen på
// Kundeside kan skifte til Kundeflow på det trin, kunden er på (portalens open-flow).
//
// Spærren for kundehandlinger (CW.setPreview: kundehandlinger afvises, og beskeder skjules) slås
// til, før portalen tegnes første gang, så intet i portalen (f.eks. "læst af kunden") når at ske uden
// spærre, og slås fra, når forhåndsvisningen er lukket. Undtagen med rollen Kunde (vælgeren øverst
// i portalen): der virker portalen som for kunden, og portalen styrer selv spærren (wsPreviewLockOn).
//
// Tastatur og fokus som dialogen før migrationen (CW.useDialog): fokus på portalens første
// element, Tab bliver i forhåndsvisningen, Esc lukker (Esc i en åben liste lukker kun listen),
// og fokus vender tilbage til knappen, der åbnede den.
//
// Forhåndsvisningen er åben, så længe den er monteret: <CustomerPreviewDrawer v-if="..." @close="..." />
// Props: flow (start i Kundeflow). Emits: close.
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { previewMemory, setPreviewMemory } from '@/composables/usePreviewMemory'
import { useSelectEscape } from '@/composables/useSelectEscape'
import { FOCUSABLE } from '@/composables/focusable'
import { wsPreviewLockOn } from '@/domain/workspace/actions'
import CustomerPortalView from '@/views/portal/CustomerPortalView.vue'

const props = defineProps({
  flow: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

// Spærren slås til nu, før portalen tegnes første gang
if (wsPreviewLockOn()) CW.setPreview(true)

// Efter en genindlæsning: samme tilstand og trin som før
const mem0 = previewMemory()
const pv = ref({ flow: !!props.flow || !!(mem0 && mem0.mode === 'flow'), step: (mem0 && mem0.step) || null })
const box = ref(null)
// Elementet, der havde fokus, da forhåndsvisningen åbnede (f.eks. knappen Kundeside)
const prev = document.activeElement
const selectEsc = useSelectEscape()

const focusables = () => (box.value ? Array.prototype.filter.call(box.value.querySelectorAll(FOCUSABLE), n => n.offsetParent !== null) : [])

let raf = 0
onMounted(() => {
  if (wsPreviewLockOn()) CW.setPreview(true)
  nextTick(() => {
    raf = requestAnimationFrame(() => {
      const el = box.value
      if (!el) return
      const first = el.querySelector('[autofocus]') || focusables()[0]
      if (first) first.focus()
      else el.focus()
    })
  })
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  if (typeof CW.setPreview === 'function') CW.setPreview(false)
  if (prev && prev.focus && document.contains(prev)) { try { prev.focus() } catch (e) {} }
})

// Tab og Shift+Tab bliver i forhåndsvisningen. Lytteren sidder på forhåndsvisningen (ikke på dokumentet som
// useFocusTrap), så portalens egne dialoger inde i den når at styre Tab først.
function onKeydown (e) {
  selectEsc.onKeydown(e)
  if (e.key !== 'Tab') return
  const f = focusables()
  if (!f.length) { e.preventDefault(); return }
  const a = f[0]
  const z = f[f.length - 1]
  if (f.indexOf(document.activeElement) < 0) { e.preventDefault(); (e.shiftKey ? z : a).focus() }
  else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
  else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
}

function openFlow (step) {
  pv.value = { flow: true, step }
  setPreviewMemory({ mode: 'flow', step, pvOb: undefined, screen: null, itemId: null })
  if (box.value) box.value.scrollTop = 0
}
// Lukning: skuffen glider først ned (som når den åbner), og forhåndsvisningen fjernes, når den er nede
const open = ref(true)
const close = () => { open.value = false }
const afterVisible = (v) => { if (!v) emit('close') }
</script>

<template>
  <a-drawer
    :visible="open"
    placement="bottom"
    height="100%"
    :closable="false"
    :autofocus="false"
    :body-style="{ padding: 0 }"
    @close="close"
    @after-visible-change="afterVisible"
  >
    <div
      ref="box"
      class="ws-preview"
      role="dialog"
      aria-modal="true"
      :aria-label="t('Kundens side (forhåndsvisning)')"
      tabindex="-1"
      @keydown.capture="selectEsc.onKeydownCapture"
      @keydown="onKeydown"
    >
      <CustomerPortalView
        :key="(pv.flow ? 'flow:' : 'page:') + (pv.step || '')"
        preview
        :flow="pv.flow"
        :flow-start="pv.step"
        @open-flow="openFlow"
        @back="close"
      />
    </div>
  </a-drawer>
</template>

<style scoped>
/* Forhåndsvisningen ruller selv (rulningen nulstilles, når Kundeflow åbnes på et trin) */
.ws-preview {
  height: 100%;
  overflow: auto;
}

.ws-preview:focus {
  outline: none;
}
</style>
