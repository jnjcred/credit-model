/* ─────────────────────────────────────────────────────────────────────────────
   Feedback til rådgiveren: korte beskeder (CW.toast) og bekræftelser (CW.confirm).

   Før migrationen byggede case_state.js begge dele direkte i DOM'en. Nu bruger de
   ant-design-vue: beskederne er en notification nederst til højre, og bekræftelsen
   er en a-modal (src/components/common/ConfirmDialog.vue, monteret én gang i App.vue).
   Kontrakterne er de samme som før, så alle kald i appen virker uændret:
     toast(text, { action: { label, onClick }, tone: 'ok'|'info'|'warn'|'danger', ms })
     confirm({ title, text, confirmLabel, cancelLabel, requireReason, reasonOptional,
               reasonLabel, danger, focusCancel, checkbox: { label, checked } })
       → Promise<{ ok, reason, checked }>
   ──────────────────────────────────────────────────────────────────────────── */
import { h, reactive } from 'vue'
import { Button, notification } from 'ant-design-vue'

const t = (s) => (window.t ? window.t(s) : s)

/* ── Beskeder ──────────────────────────────────────────────────────────────── */

// Kun én besked ad gangen, som før: en ny besked erstatter den forrige. Hver besked får sin
// egen nøgle, så dens tid tæller fra den vises (antdv genstarter ikke tiden, når en besked med
// samme nøgle bare opdateres). Indholdet læses også op via en usynlig levende region.
let toastSeq = 0
let toastKey = null
let liveEl = null
function ensureLive () {
  if (liveEl || !document.body) return
  liveEl = document.createElement('div')
  liveEl.setAttribute('role', 'status')
  liveEl.setAttribute('aria-live', 'polite')
  liveEl.className = 'sr-only'
  document.body.appendChild(liveEl)
}

// Beskeden må ikke dække det element, der har fokus (WCAG 2.4.11): ligger fokus
// i hjørnet nederst til højre, vises beskeden øverst til højre i stedet.
// Lander fokus senere under en vist besked, flyttes den op (toastMove), som før migrationen.
let toastMove = null
const overlaps = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom
document.addEventListener('focusin', (e) => {
  if (!toastMove || !toastKey) return
  const box = document.querySelector('.' + toastKey)
  if (!box || box.contains(e.target) || !e.target.getBoundingClientRect) return
  if (overlaps(e.target.getBoundingClientRect(), box.getBoundingClientRect())) toastMove()
}, true)

function placementFor () {
  const a = document.activeElement
  if (!a || a === document.body || !a.getBoundingClientRect) return 'bottomRight'
  const r = a.getBoundingClientRect()
  const under = r.right > window.innerWidth - 24 - 384 && r.bottom > window.innerHeight - 24 - 120
  return under ? 'topRight' : 'bottomRight'
}

export function hideToast () {
  if (toastKey) notification.close(toastKey)
  toastKey = null
  toastMove = null
  if (liveEl) liveEl.textContent = ''
}

export function toast (text, opts) {
  opts = opts || {}
  ensureLive()
  const ms = opts.ms || (opts.action ? 9000 : 4000)
  // Placeringen vælges, når beskeden vises; at fokusere knappen i beskeden må ikke flytte den
  let placement = placementFor()
  if (toastKey) notification.close(toastKey)
  let key = 'cw-toast-' + (++toastSeq)
  toastKey = key
  let endsAt = 0
  const open = (duration) => {
    // En senere besked har erstattet denne: rør den ikke igen (f.eks. når fokus forlader dens knap)
    if (toastKey !== key) return
    const own = key
    endsAt = duration ? Date.now() + duration * 1000 : 0
    const args = {
      key: own,
      // Klassen er nøglen, så fokus-tjekket ovenfor kan finde netop denne besked
      class: own,
      message: text,
      placement,
      // Øverst til højre ligger beskeden under sidehovedet (56 px), som før migrationen
      top: '64px',
      duration,
      // Lukker beskeden, tømmes den levende region også (som hideToast før migrationen)
      onClose: () => { if (toastKey === own) { toastKey = null; toastMove = null; if (liveEl) liveEl.textContent = '' } },
      btn: opts.action
        ? () => h(Button, {
          type: 'link',
          size: 'small',
          // Mens fokus står på knappen, lukker beskeden ikke (WCAG 2.2.1)
          onFocus: () => open(0),
          onBlur: () => open(ms / 1000),
          onClick: () => { hideToast(); if (opts.action.onClick) opts.action.onClick() },
        }, () => opts.action.label)
        : undefined,
    }
    if (opts.tone === 'warn') notification.warning(args)
    else if (opts.tone === 'info') notification.info(args)
    else if (opts.tone === 'danger') notification.error(args)
    else notification.success(args)
  }
  open(ms / 1000)
  // Flyt beskeden op i hjørnet øverst til højre med den tid, den har tilbage (antdv kan ikke flytte
  // en vist besked, så den lukkes og vises igen dér under en ny nøgle)
  toastMove = placement === 'topRight'
    ? null
    : () => {
      toastMove = null
      const old = key
      placement = 'topRight'
      key = 'cw-toast-' + (++toastSeq)
      toastKey = key
      notification.close(old)
      open(endsAt ? Math.max(1, (endsAt - Date.now()) / 1000) : 0)
    }
  // Tøm og skriv igen i næste frame, så samme tekst to gange også annonceres
  if (liveEl) {
    liveEl.textContent = ''
    setTimeout(() => {
      liveEl.textContent = text + (opts.action ? (/[.!?]$/.test(String(text).trim()) ? ' ' : '. ') + opts.action.label + ' ' + t('er muligt i beskeden nederst til højre.') : '')
    }, 60)
  }
}

/* ── Bekræftelser ─────────────────────────────────────────────────────────── */

// Tilstanden læses af ConfirmDialog.vue. Én dialog ad gangen.
export const confirmState = reactive({ open: false, opts: {}, resolve: null })
// Elementet, der havde fokus, da bekræftelsen blev åbnet. Dialogen flytter fokus ind med
// det samme, så antdv når ikke selv at huske det; fokus gives tilbage i settleConfirm.
let confirmPrev = null

export function confirm (o) {
  return new Promise((resolve) => {
    // En åben bekræftelse annulleres, hvis en ny kommer (sker ikke i praksis)
    if (confirmState.resolve) confirmState.resolve({ ok: false })
    else confirmPrev = document.activeElement
    confirmState.opts = o || {}
    confirmState.resolve = resolve
    confirmState.open = true
  })
}

/** Spørg, før en fil fjernes. Løser med true, hvis brugeren bekræfter. (ui_kit.jsx: cwConfirmRemove) */
export function confirmRemove (name, text, opts) {
  opts = opts || {}
  return confirm({
    title: opts.title || t('Fjern {file}?').replace('{file}', name),
    text: text || '',
    confirmLabel: opts.confirmLabel || t('Fjern filen'),
    danger: true,
  }).then(r => !!(r && r.ok))
}

export function settleConfirm (result) {
  const resolve = confirmState.resolve
  confirmState.resolve = null
  confirmState.open = false
  // Fokus tilbage, før svaret leveres (som før migrationen): kaldet kan selv flytte fokus bagefter
  const prev = confirmPrev
  confirmPrev = null
  if (prev && prev.focus && document.contains(prev)) { try { prev.focus() } catch (e) {} }
  if (resolve) resolve(result)
}
