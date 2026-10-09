/* Regnskabstabellens kolonner, så grafens kolonner står lige over tabellens tal (designet: graf og
   tabel deler kolonnegitter). Måles fra tabelhovedet: rækkenavnene (th[data-fin-c1]) og hver
   talkolonne (th[data-col], i den sidste række af hovedet). Kun egne markeringer i tabellen
   (FinAnnualTable). getTable() giver tabellens element (#fin-annual-table); deps er det, målingen
   afhænger af (kolonnerne, enheden, skjult graf …).
   Resultat: { c1, cols: { [kolonnenøgle]: bredde }, width, pad } eller null før målingen. */
import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

export function useTableColumnGeometry (getTable, deps) {
  const geom = shallowRef(null)
  let ro = null
  let watched = []

  // Tabellens hoved kan tegnes om (f.eks. når månederne foldes ud); de målte celler følges, så en ny
  // bredde måles med det samme
  const follow = (els) => {
    if (!ro || (els.length === watched.length && els.every((el, i) => el === watched[i]))) return
    watched.forEach(el => ro.unobserve(el))
    els.forEach(el => ro.observe(el))
    watched = els
  }

  const measure = () => {
    const table = getTable()
    if (!table) { if (geom.value) geom.value = null; return }
    const c1 = table.querySelector('thead th[data-fin-c1]')
    const ths = [...table.querySelectorAll('thead th[data-col]')]
    if (!c1 || !ths.length) { if (geom.value) geom.value = null; return }
    follow([c1, ...ths])
    const cols = {}
    let width = c1.getBoundingClientRect().width
    ths.forEach(th => { const w = th.getBoundingClientRect().width; cols[th.getAttribute('data-col')] = Math.round(w * 100) / 100; width += w })
    const pad = parseFloat(getComputedStyle(ths[0]).paddingRight) || 8
    const next = { c1: Math.round(c1.getBoundingClientRect().width * 100) / 100, cols, width: Math.round(width), pad: Math.round(pad) }
    if (!(geom.value && JSON.stringify(geom.value) === JSON.stringify(next))) geom.value = next
  }

  watch(deps, () => nextTick(measure), { flush: 'post' })
  onMounted(() => {
    const table = getTable()
    if (table && window.ResizeObserver) {
      ro = new ResizeObserver(() => measure())
      ro.observe(table)
    }
    measure()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure).catch(() => {})
  })
  onBeforeUnmount(() => { if (ro) ro.disconnect(); ro = null })
  return geom
}
