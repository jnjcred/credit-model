// Fokus og tastatur i dialogerne (alle med aria-modal="true"; alle a-modal har det via wrap-props),
// som før migrationen (CW.useDialog). Bruges én gang i App.vue.
//
// 1. Første element får fokus. ant-design-vue 3.2.13 sætter fokus på en usynlig vagt (en tom div med
//    tabindex="0" og aria-hidden) før og efter indholdet, når dialogen åbner, og vagterne er ekstra
//    Tab-stop uden navn. Lander fokus på en vagt, flyttes det til dialogens første element (ved åbning
//    og Tab fra det sidste) eller sidste element (Shift+Tab fra det første). Dialoger, der selv sætter
//    fokus et bestemt sted (f.eks. bekræftelsens årsag), gør det stadig bagefter.
// 2. Lukkeknappen hedder "Luk" på dansk. antdv's kryds hedder altid "Close" (aria-label), også i en
//    dansk brugerflade; navnet sættes, når fokus kommer ind i dialogen.
// 3. Esc og Tab, når fokus er tabt. Forsvinder det element, der har fokus (f.eks. en fil, der fjernes med
//    "Fjern", eller et valgt søgeresultat), står fokus på <body>, og antdv hører kun tasterne inde i
//    dialogen. Tab går ind i den øverste åbne dialog, og Esc sendes til dialogen, så den lukker på sin
//    sædvanlige måde (ikke, hvis den er sat til at ignorere Esc). Fokus flyttes først ved en tast.
import { onBeforeUnmount, onMounted } from 'vue'
import { t } from '@/i18n'
import { FOCUSABLE } from './focusable'

const MODAL = '[role="dialog"][aria-modal="true"]'

// Den øverste synlige modale dialog (antdv lægger den senest åbnede sidst i body)
function topDialog () {
  const list = Array.prototype.filter.call(document.querySelectorAll(MODAL), d => d.getClientRects().length > 0)
  return list[list.length - 1] || null
}

// Dialogens Tab-stop uden antdv's usynlige fokusvagter (aria-hidden)
function tabStops (dlg) {
  return Array.prototype.filter.call(dlg.querySelectorAll(FOCUSABLE), n => n.getClientRects().length > 0 && !n.closest('[aria-hidden="true"]'))
}

const isGuard = (el) => !!el && !!el.getAttribute && el.getAttribute('aria-hidden') === 'true' && el.getAttribute('tabindex') === '0'

function nameCloseButtons (dlg) {
  const name = t('Luk')
  if (name === 'Close') return
  dlg.querySelectorAll('button[aria-label="Close"]').forEach((b) => b.setAttribute('aria-label', name))
}

function onFocusIn (e) {
  const el = e.target
  const dlg = el && el.closest && el.closest(MODAL)
  if (!dlg) return
  nameCloseButtons(dlg)
  if (!isGuard(el)) return
  const f = tabStops(dlg)
  if (!f.length) return
  const guards = Array.prototype.filter.call(dlg.querySelectorAll('[aria-hidden="true"][tabindex="0"]'), isGuard)
  const fromInside = !!(e.relatedTarget && dlg.contains(e.relatedTarget))
  const atStart = el === guards[0]
  // Vagten før indholdet: ved åbning det første element, ved Shift+Tab fra det første det sidste.
  // Vagten efter indholdet: ved Tab fra det sidste det første.
  const target = atStart ? (fromInside ? f[f.length - 1] : f[0]) : (fromInside ? f[0] : f[f.length - 1])
  target.focus()
}

function onKeydown (e) {
  if (e.key !== 'Escape' && e.key !== 'Tab') return
  const a = document.activeElement
  if (a && a !== document.body && a.isConnected) return
  const dlg = topDialog()
  if (!dlg) return
  e.preventDefault()
  if (e.key === 'Tab') {
    const f = tabStops(dlg)
    if (f.length) (e.shiftKey ? f[f.length - 1] : f[0]).focus()
    return
  }
  if (dlg.focus) dlg.focus()
  const esc = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })
  // antdv læser keyCode (27), som en syntetisk KeyboardEvent ikke selv får
  Object.defineProperty(esc, 'keyCode', { value: 27 })
  dlg.dispatchEvent(esc)
}

export function useDialogFocus () {
  onMounted(() => {
    document.addEventListener('focusin', onFocusIn, true)
    window.addEventListener('keydown', onKeydown, true)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('focusin', onFocusIn, true)
    window.removeEventListener('keydown', onKeydown, true)
  })
}
