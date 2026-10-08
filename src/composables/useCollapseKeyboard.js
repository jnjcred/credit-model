// Folde (a-collapse) som prototypens CWFold, der var en knap. To huller i ant-design-vue 3.2.13:
//  - Panelets overskrift åbner og lukker kun med Enter (CollapsePanel lytter på keypress Enter).
//    useCollapseKeyboard giver en keydown-handler, der også lader Mellemrum folde. Den lægges på
//    et element rundt om <a-collapse> (komponenten sender ikke lyttere videre til sin rod).
//  - antdv's egen pil har aria-label="right", som kommer med i overskriftens navn
//    ("right PEST-analyse"). collapseExpandIcon er den samme pil skjult for skærmlæsere.
//
// Brug: <div @keydown="onCollapseKeydown"><a-collapse :expand-icon="collapseExpandIcon" ...></div>
//   const onCollapseKeydown = useCollapseKeyboard()
import { h } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'

export function useCollapseKeyboard () {
  return function onCollapseKeydown (e) {
    if (e.key !== ' ' || e.repeat) return
    const el = e.target
    // Panelets overskrift: role="button" (eller "tab" i accordion) med aria-expanded
    if (!el || !el.matches || !el.matches('[role="button"][aria-expanded], [role="tab"][aria-expanded]')) return
    e.preventDefault()
    el.click()
  }
}

export function collapseExpandIcon ({ isActive }) {
  return h(RightOutlined, { rotate: isActive ? 90 : undefined, 'aria-hidden': 'true' })
}
