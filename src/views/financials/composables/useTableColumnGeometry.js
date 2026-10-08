/* Regnskabstabellens kolonner, så årene i grafen står lige over årene i tabellen
   (fin_chart.jsx: useFinTableCols, C:120-142). Måles fra tabelhovedet: rækkenavnene og de fem
   talkolonner, når kvartalerne er foldet sammen. Med kvartalerne foldet ud (tabellen ligger i
   klassen fin-q), eller før målingen, er resultatet null, og grafen bruger sit eget gitter.
   Kun egne markeringer i tabellen (FinAnnualTable): th[data-fin-c1] og th[data-col].
   getTable() giver tabellens element (#fin-annual-table); deps er det, målingen afhænger af
   (enhed, skjult graf, budget, måneder og modellen). Resultat: { c1, ws: [5 bredder], pad }. */
import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

export function useTableColumnGeometry (getTable, deps) {
  const geom = shallowRef(null)
  let ro = null
  let watched = []

  // Tabellens hoved kan tegnes om (fx når kvartalerne foldes ud og sammen); de målte celler
  // følges, så en ny bredde måles med det samme
  const follow = (els) => {
    if (!ro || (els.length === watched.length && els.every((el, i) => el === watched[i]))) return
    watched.forEach(el => ro.unobserve(el))
    els.forEach(el => ro.observe(el))
    watched = els
  }

  const measure = () => {
    const table = getTable()
    if (!table || table.closest('.fin-q')) { if (geom.value) geom.value = null; return }
    const c1 = table.querySelector('thead th[data-fin-c1]')
    const ths = [...table.querySelectorAll('thead tr:last-child th[data-col]')]
    if (!c1 || ths.length !== 5) { if (geom.value) geom.value = null; return }
    follow([c1, ...ths])
    const pad = parseFloat(getComputedStyle(ths[0]).paddingRight) || 10
    const next = { c1: Math.round(c1.getBoundingClientRect().width), ws: ths.map(th => Math.round(th.getBoundingClientRect().width)), pad: Math.round(pad) }
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
