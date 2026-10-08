// Kildehenvisningerne i dokumentet (span.memo-cite i afsnittenes gemte HTML og i faktaboksen). Vue tegner
// ikke den HTML, så handlerne ligger på dokumentet (.memo-doc) og reagerer på den henvisning, hændelsen kom
// fra (WSMemo i memo.jsx L6540-6580 og L6582-6667, ordret):
//  - hold musen over en henvisning: tooltip med dokument og side (MemoCiteTooltip.vue)
//  - klik, Enter eller mellemrum: åbner kilden på den side, der henvises til (MemoSourceViewer.vue)
//  - retter man i en henvisnings tekst, følger dens tilgængelige navn med (decorateCite)
// Det hele virker kun, når kildevisningen er slået til (window.CW_SOURCE_VIEW === true; case_facts.js sætter
// den til false). Ellers er henvisningerne almindelig tekst.
// Kendt fra prototypen (bevaret): Enter på en henvisning inde i et redigerbart afsnit åbner ikke kilden,
// for tastetrykket kommer fra afsnittets tekstfelt (contenteditable), ikke fra henvisningen. I faktaboksen,
// der ikke kan redigeres, virker Enter.
//
//   const cites = useCiteDelegation()
//   <div class="memo-doc" @mouseover="cites.onMouseOver" @mouseout="cites.onMouseOut" @input="cites.onInput"
//        @click="cites.onClick" @keydown="cites.onKeydown">
//   cites.tooltip (ref) → MemoCiteTooltip; cites.sourceDoc (ref) → MemoSourceViewer
import { ref, shallowRef } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { SEC } from '@/domain/memo/memoTemplates'
import { citeContext, citeTwinDa, decorateCite, memoDocInCase } from '@/domain/memo/memoCite'

export function useCiteDelegation () {
  const tooltip = ref(null)
  // Kilden, der er åben: { doc, page, quote, context, alt, inCase } (doc er en post i CASE_DOCS)
  const sourceDoc = shallowRef(null)
  // Den henvisning musen står over (et DOM-element: aldrig i Vue's reaktivitet)
  let hoveredCite = null

  // Cite tooltip via event delegation
  function computeTooltip (el) {
    if (!el) return null
    const isManual = el.dataset.manual === 'true'
    let isEdited = false
    if (!isManual) {
      const sectionEl = el.closest('[id^="ms-"]')
      const sKey = sectionEl ? sectionEl.id.replace('ms-', '') : null
      if (sKey && SEC[sKey]) {
        const tmp = document.createElement('div')
        tmp.innerHTML = SEC[sKey]
        const origSpans = tmp.querySelectorAll('.memo-cite')
        const currentText = el.textContent.trim()
        let foundUnchanged = false
        origSpans.forEach(s => { if (s.textContent.trim() === currentText) foundUnchanged = true })
        isEdited = !foundUnchanged
      }
    }
    const r = el.getBoundingClientRect()
    return { doc: el.dataset.doc, page: el.dataset.page, x: r.left + r.width / 2, y: r.top, manual: isManual, edited: isEdited }
  }

  const onMouseOver = (e) => {
    const el = e.target.closest('.memo-cite')
    if (el && window.CW_SOURCE_VIEW === true) { hoveredCite = el; tooltip.value = computeTooltip(el) }
  }
  const onMouseOut = (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest('.memo-cite')) {
      hoveredCite = null
      tooltip.value = null
    }
  }
  const onInput = () => {
    if (hoveredCite) tooltip.value = computeTooltip(hoveredCite)
    // Retter man i en henvisnings tekst, skal dens navn følge med
    const sel = window.getSelection()
    const node = sel && sel.anchorNode
    const cite = node && (node.nodeType === 1 ? node : node.parentElement)
    const el = cite && cite.closest ? cite.closest('.memo-cite') : null
    if (el) decorateCite(el)
  }

  /* Klik på en kildehenvisning åbner selve dokumentet på den side der henvises til. Et tooltip der viser et
     filnavn er en påstand; kilden er beviset, og hele pointen med sporbarheden er at man kan komme hen til
     den. */
  function openCite (el) {
    if (window.CW_SOURCE_VIEW !== true) return
    const name = el.getAttribute('data-doc')
    const page = el.getAttribute('data-page')
    const doc = (window.CASE_DOCS || []).find(d => d.name === name)
    if (!doc) {
      CW.toast(t('Dokumentet findes ikke i sagen') + ': ' + name, { tone: 'warn' })
      return
    }
    sourceDoc.value = { doc, page, quote: (el.textContent || '').trim(), context: citeContext(el), alt: citeTwinDa(el), inCase: memoDocInCase(name) }
  }
  const onClick = (e) => {
    const el = e.target.closest('.memo-cite')
    if (!el || window.CW_SOURCE_VIEW !== true) return
    // Ctrl eller cmd holdt nede betyder at brugeren vil redigere teksten
    if (e.metaKey || e.ctrlKey) return
    e.preventDefault()
    openCite(el)
  }
  // Enter eller mellemrum på en henvisning åbner kilden, som et klik
  const onKeydown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const el = e.target && e.target.classList && e.target.classList.contains('memo-cite') ? e.target : null
    if (!el || window.CW_SOURCE_VIEW !== true || e.metaKey || e.ctrlKey || e.altKey) return
    e.preventDefault()
    e.stopPropagation()
    openCite(el)
  }

  return { tooltip, sourceDoc, onMouseOver, onMouseOut, onInput, onClick, onKeydown }
}
