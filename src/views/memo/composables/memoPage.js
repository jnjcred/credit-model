// Det indbyggede memo (MemoEditor.vue): sidens to faste værdier, som flere dele af siden bruger.
//
// MEMO_NARROW_MQ: under ca. 1440 px klappes kommentarskinnen sammen til en knap i kanten, der åbner en
// skuffe (WSMemo i memo.jsx L6056-6064). Samme grænse står i sidens gitter (MemoEditor.vue, <style>),
// sammen med de to andre brud (1480 og 899 px); hold dem ens, hvis de ændres.
export const MEMO_NARROW_MQ = '(max-width: 1439px)'

// Rullefeltet, dokumentet ruller i (én rullebjælke: dokumentet ruller med sagens indhold, mens
// afsnitslisten og kommentarerne står fast ved siden af). Prototypen fandt det som
// doc.closest('.scroll') || document.scrollingElement (L6347, L6152, L6169, L6399).
// Migration: sagens rullefelt i Vue har ikke klassen .scroll (WorkspaceView.vue: .ws-content-scroll over
// 1000 px, .ws-body-narrow under), så det nærmeste forældreelement, der ruller lodret, bruges.
// el er dokumentet (.memo-doc); det tæller ikke selv med (overflow-x: hidden giver det overflow-y: auto).
export function memoScrollRoot (el) {
  const legacy = el && el.closest ? el.closest('.scroll') : null
  if (legacy) return legacy
  let p = el ? el.parentElement : null
  while (p && p !== document.body && p !== document.documentElement) {
    const oy = window.getComputedStyle(p).overflowY
    if (oy === 'auto' || oy === 'scroll') return p
    p = p.parentElement
  }
  return document.scrollingElement
}
