// Esc i en åben a-select (eller a-auto-complete) lukker kun listen, ikke dialogen omkring den.
// ant-design-vue 3.2.13's select lukker listen, men lader Esc boble videre, så en a-modal eller
// a-drawer også lukker (og det, man har skrevet, forsvinder). Prototypens felter var native
// <select>, hvor Esc kun lukkede listen.
//
// Brug: læg begge handlere på et element rundt om feltet i dialogen.
//   const selectEsc = useSelectEscape()
//   <div @keydown.capture="selectEsc.onKeydownCapture" @keydown="selectEsc.onKeydown"><a-select …/></div>
export function useSelectEscape () {
  let inOpenList = false
  return {
    // Før feltet selv reagerer: var listen åben, da Esc blev trykket? (aria-expanded på feltets input)
    onKeydownCapture (e) {
      inOpenList = e.key === 'Escape' && !!e.target && !!e.target.getAttribute && e.target.getAttribute('aria-expanded') === 'true'
    },
    // Efter feltet har lukket listen: stop Esc her, så dialogen ikke også lukker
    onKeydown (e) {
      if (inOpenList) e.stopPropagation()
      inOpenList = false
    },
  }
}
