// Kundeside og Kundeflow huskes ved en genindlæsning: om forhåndsvisningen var åben, i hvilken sag og
// tilstand, og hvilken skærm i portalen der blev vist. Ligger i sessionStorage, så det gælder fanen
// (en ny fane eller "Nulstil demo" starter forfra).
// Form: { caseId, mode: true | 'flow', step, pvOb, screen, itemId }
const KEY = 'cw_preview'

export function previewMemory () {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') || null } catch (e) { return null }
}

export function setPreviewMemory (patch) {
  try {
    if (patch === null) sessionStorage.removeItem(KEY)
    else sessionStorage.setItem(KEY, JSON.stringify(Object.assign({}, previewMemory() || {}, patch)))
  } catch (e) { /* uden lager: intet huskes */ }
  // Adressen følger med (useNavigation.js)
  try { window.dispatchEvent(new CustomEvent('cw-preview-memory')) } catch (e) {}
}
