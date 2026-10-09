/* Rettelser i regnskabstabellen som i et regneark (financials.jsx AnnualReportSection, F:1569-1628).
   ant-design-vue 3.2.13 har ingen redigerbar tabel; tilstanden og tastaturet er derfor her, og
   feltet er et a-input inde i cellen (FinEditableCell):
   - klik, Enter eller F2 på cellen åbner feltet med det viste tal; et ciffer eller minus erstatter tallet
   - Enter gemmer; Tab og Shift+Tab gemmer og går til næste eller forrige celle i rækken
   - Esc fortryder; når feltet mister fokus, gemmes tallet (et ugyldigt tal kasseres så stille)
   - et ugyldigt tal (Enter/Tab) holder feltet åbent og markeret (bad)
   Er sagen indstillet (locked), åbnes intet felt. Cellerne har data-fin-cell="<post>|<kolonne>".
   model, unit og locked er refs/computeds fra komponenten; mask (Regnskab v5, valgfri) er årene
   med kun offentlig årsrapport (finMaskedPost), så en indtastet omsætning står alene. */
import { nextTick, ref } from 'vue'
import { CW } from '@/domain/case_state'
import { FIN_EDIT_COL, finLogChanges, finOrigOf, finPostValue, finRemoveEdits, finSaveEdits } from '@/domain/financials/finEdits'
import { finParseInput } from '@/domain/financials/finFormat'
import { finMakeFmt } from '@/domain/financials/finColumns'

/** Cellen i tabellen for en post og en kolonne (td[data-fin-cell]), eller null. */
export function finCellEl (ref, colKey) {
  return [...document.querySelectorAll('[data-fin-cell]')].find(el => el.getAttribute('data-fin-cell') === ref + '|' + colKey) || null
}

// Fokus på en celle, når tabellen er tegnet igen efter ændringen (CW.focusSoon venter 30 ms).
// Cellen findes igen ud fra sin data-fin-cell-nøgle, så det virker, også hvis tabellen har lavet
// elementet om.
function focusCellSoon (key) {
  if (!key) return
  nextTick(() => {
    const el = [...document.querySelectorAll('[data-fin-cell]')].find(x => x.getAttribute('data-fin-cell') === key) || null
    CW.focusSoon(el)
  })
}

export function useFinCellEditing ({ model, unit, locked, mask }) {
  const maskNow = () => (mask ? mask.value : undefined)
  const editing = ref(null) // { ref, col, text, initial, bad, typed }
  // Spejl af editing, så tastatur- og blur-handlerne ser den seneste tekst (editingRef i originalen).
  // Sættes til null, før feltet forsvinder, så blur ved fjernelsen ikke gemmer en gang til.
  let current = null
  const set = (v) => { current = v; editing.value = v }
  const isEditing = (ref, colKey) => !!current && current.ref === ref && current.col === colKey

  const fmtU = (v) => finMakeFmt(unit.value)(v, {})

  // Åbn et felt i cellen med det viste tal; et ciffer eller minus erstatter tallet
  const startEdit = (ref, colKey, typed) => {
    if (locked.value) return
    const cur = finPostValue(model.value, ref, FIN_EDIT_COL[colKey])
    const shown = (fmtU(cur) || '').replace(/−/g, '-')
    set({ ref, col: colKey, text: typed != null ? typed : shown, initial: shown, bad: false, typed: typed != null })
  }
  // Næste (eller forrige) redigerbare celle i samme række
  const siblingCell = (ref, colKey, dir) => {
    const td = finCellEl(ref, colKey)
    if (!td) return null
    const list = [...td.parentElement.querySelectorAll('td[data-fin-cell]')]
    return list[list.indexOf(td) + dir] || null
  }
  // how: 'enter' | 'next' | 'prev' | 'blur'
  const commitEdit = (how) => {
    const s = current
    if (!s) return
    const val = finParseInput(s.text)
    if (val != null && isNaN(val)) {
      if (how === 'blur') { set(null); return }
      set({ ...s, bad: true })
      return
    }
    set(null)
    const here = finCellEl(s.ref, s.col)
    const next = how === 'next' ? siblingCell(s.ref, s.col, 1) : how === 'prev' ? siblingCell(s.ref, s.col, -1) : null
    const scale = unit.value === 'mio' ? 1 : 1000
    if (val != null && s.text.trim() !== s.initial) {
      const done = finSaveEdits([{ rowRef: s.ref, colKey: s.col, value: val / scale }], undefined, maskNow())
      finLogChanges(done)
    }
    // Begrundelsen er frivillig og gives bagefter med ikonet ved cellen, så man ikke afbrydes ved hvert tal
    const target = next || here
    if (how !== 'blur') focusCellSoon(target && target.getAttribute('data-fin-cell'))
  }
  const cancelEdit = () => {
    const s = current
    set(null)
    if (s) focusCellSoon(s.ref + '|' + s.col)
  }
  // Teksten i feltet; en ny tast fjerner markeringen af et ugyldigt tal
  const setText = (v) => { if (current) set({ ...current, text: v, bad: false }) }

  // Nulstil ét tal til det oprindelige (ingen besked: tallet står at se i cellen, og ændringen står i aktivitetsloggen)
  const resetCell = (x) => {
    const from = x.value
    finRemoveEdits([x])
    finLogChanges([{ rowRef: x.rowRef, colKey: x.colKey, from, to: finOrigOf(x, maskNow()), removed: true }])
    focusCellSoon(x.rowRef + '|' + x.colKey)
  }

  // Tasterne på selve cellen (ikke i feltet): Enter/F2 åbner, et ciffer eller minus erstatter
  const onCellKeydown = (e, ref, colKey) => {
    if (isEditing(ref, colKey) || locked.value || e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(ref, colKey) }
    else if (/^[0-9-]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); startEdit(ref, colKey, e.key) }
  }
  const onCellClick = (ref, colKey) => { if (!isEditing(ref, colKey)) startEdit(ref, colKey) }
  // Tasterne i feltet
  const onInputKeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit('enter') }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelEdit() }
    else if (e.key === 'Tab') { e.preventDefault(); commitEdit(e.shiftKey ? 'prev' : 'next') }
  }

  return { editing, isEditing, startEdit, commitEdit, cancelEdit, setText, resetCell, onCellKeydown, onCellClick, onInputKeydown }
}
