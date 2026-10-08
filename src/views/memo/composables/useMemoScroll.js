// Det, der følger dokumentets rulning (WSMemo i memo.jsx L6341-6412):
//  - useActiveSection: hvilket afsnit der er det aktive i afsnitslisten (scroll spy)
//  - useRailLayout: hvor kommentarskinnens tråde står, ud for deres afsnit
// Algoritmerne er flyttet ordret; kun React-hooks er skiftet ud med Vue's livscyklus.
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

/* Én rullebjælke: dokumentet ruller med siden (sagens rullefelt), og oversigten og kommentarerne står fast
   ved siden af. Aktivt afsnit = det sidste, hvis overskrift er rullet op over en linje ca. en tredjedel nede
   i rullefeltet. Regnes ved hver rulning. Før brugte prototypen en IntersectionObserver med tærskel 0.1,
   men lange afsnit (fx Risikovurdering, 3.600 px) nåede aldrig 10 % synligt i en lav rude (1280 x 450 eller
   200 % zoom), så markeringen blev hængende.
   docEl: template-ref til dokumentet (.memo-doc); getRoot: () => rullefeltet; keys: afsnittenes nøgler;
   active: ref med det aktive afsnit; pin: { until } — et dybdelink har lige valgt afsnittet, og rulningen
   må ikke flytte markeringen før da.
   Afsnittene findes, når dokumentet tegnes (som i prototypen: ved montering, og igen efter "Prøv igen" i
   fejlgrænsen, der tegner dokumentet forfra; ikke når kun afsnittene genmonteres for en anden version). */
export function useActiveSection ({ docEl, getRoot, keys, active, pin }) {
  let stop = null
  function start () {
    if (stop) stop()
    stop = null
    const root = docEl.value ? getRoot() : null
    if (!root) return
    const els = keys.map(k => document.getElementById('ms-' + k)).filter(Boolean)
    let raf = 0
    const pick = () => {
      raf = 0
      // Et dybdelink har lige valgt afsnittet: rulningen må ikke flytte markeringen
      if (Date.now() < pin.until) return
      const rr = root === document.scrollingElement ? { top: 0, height: window.innerHeight } : root.getBoundingClientRect()
      // Helt i bund kan de sidste korte afsnit ikke nå linjen: brug så hele ruden
      const sc = root === document.scrollingElement ? document.scrollingElement : root
      const atEnd = sc.scrollTop > 0 && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2
      const line = atEnd ? rr.top + rr.height - 40 : rr.top + Math.min(rr.height * 0.35, 240)
      let cur = null, best = -Infinity
      for (const el of els) { const tp = el.getBoundingClientRect().top; if (tp <= line && tp > best) { best = tp; cur = el } }
      if (cur) active.value = cur.id.replace('ms-', '')
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(pick) }
    const target = root === document.scrollingElement ? window : root
    target.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    pick()
    stop = () => { target.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }
  onMounted(start)
  watch(docEl, start, { flush: 'post' })
  onBeforeUnmount(() => { if (stop) stop() })
}

/* Trådene i kommentarskinnen står ud for deres afsnit. Afstanden måles fra skinnens top, så det virker både
   i den faste skinne og i skuffen. Måles ved rulning (én gang pr. frame), ved ny størrelse og når dokumentet
   ændrer højde; tilstanden sættes kun, når noget har flyttet sig.
   getRoot: () => rullefeltet; getViewport: () => skinnens målefelt (MemoCommentsRail giver det via sin
   viewportRef-prop) eller null; getDoc: () => dokumentet (.memo-doc); keys: afsnittenes nøgler;
   deps: getter, hvis ændring sætter målingen op igen (kommentarversion, smal visning, skuffe, fane og
   dokumentet selv, som fejlgrænsens "Prøv igen" tegner forfra);
   onScroll: kaldes ved hver rulning (siden skjuler knappen "Omskriv markeringen").
   → { railPos: { [k]: { t, b } }, railH } (railH: skinnens højde, 320-640 px) */
export function useRailLayout ({ getRoot, getViewport, getDoc, keys, deps, onScroll }) {
  const railPos = shallowRef({})
  const railH = ref(600)

  function measureRail () {
    const vp = getViewport()
    const root = getRoot()
    if (root) {
      const rr = root === document.scrollingElement ? { top: 0, height: window.innerHeight } : root.getBoundingClientRect()
      railH.value = Math.max(320, Math.min(640, Math.round(rr.top + rr.height - (vp ? vp.getBoundingClientRect().top : rr.top + 110) - 20)))
    }
    if (!vp) return
    const top = vp.getBoundingClientRect().top
    const map = {}
    keys.forEach(k => {
      const el = document.getElementById('ms-' + k)
      if (el) { const r = el.getBoundingClientRect(); map[k] = { t: Math.round(r.top - top), b: Math.round(r.bottom - top) } }
    })
    const prev = railPos.value
    const same = Object.keys(map).every(k => prev[k] && prev[k].t === map[k].t && prev[k].b === map[k].b) && Object.keys(prev).length === Object.keys(map).length
    if (!same) railPos.value = map
  }

  let stop = null
  function start () {
    if (stop) stop()
    stop = null
    const root = getRoot()
    if (!root) return
    let raf = 0
    const onScrollFrame = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; measureRail(); if (onScroll) onScroll() })
    }
    measureRail()
    root.addEventListener('scroll', onScrollFrame, { passive: true })
    window.addEventListener('resize', onScrollFrame)
    const ro = new ResizeObserver(onScrollFrame)
    const doc = getDoc()
    if (doc) ro.observe(doc)
    stop = () => { root.removeEventListener('scroll', onScrollFrame); window.removeEventListener('resize', onScrollFrame); ro.disconnect(); cancelAnimationFrame(raf) }
  }
  onMounted(start)
  watch(deps, start, { flush: 'post' })
  onBeforeUnmount(() => { if (stop) stop() })

  return { railPos, railH }
}
