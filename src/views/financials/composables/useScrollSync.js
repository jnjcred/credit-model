/* Grafen og tabellen ruller vandret sammen (designet: hvert kort har sin egen vandrette rulning,
   og rulles det ene, følger det andet med). register(navn, element) bruges som funktions-ref i
   skabelonen; onScroll sætter de andres scrollLeft. */
export function useScrollSync () {
  const els = {}
  let busy = false
  const register = (name, el) => { if (el) els[name] = el; else delete els[name] }
  const onScroll = (e) => {
    if (busy) return
    busy = true
    const x = e.target.scrollLeft
    Object.values(els).forEach(el => { if (el !== e.target && el.scrollLeft !== x) el.scrollLeft = x })
    requestAnimationFrame(() => { busy = false })
  }
  return { register, onScroll }
}
