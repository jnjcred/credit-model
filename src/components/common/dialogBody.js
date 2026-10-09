// Indholdet i lange dialoger (a-modal :body-style): titlen og knapperne står fast, og kun indholdet
// ruller, når det bliver højere end vinduet. Bruges af dialoger, hvor en liste kan vokse (f.eks. Ny sag
// og Anmod om materiale).
// 232 px er resten af dialogens højde: antdv's afstand fra toppen (100 px), titellinjen (ca. 55 px),
// knaplinjen (ca. 53 px) og margenen under dialogen (24 px).
// scrollbarGutter: pladsen til rullepanelet er reserveret, så indholdet ikke rykker til venstre, når en foldeliste
// åbnes og rullepanelet dukker op
export const dialogBodyStyle = { maxHeight: 'calc(100vh - 232px)', overflowY: 'auto', scrollbarGutter: 'stable' }

// Skifter dialogen trin, skal det nye trin starte øverst. Står titlen fast over indholdet, ruller fokus på
// titlen ikke indholdet, så rulningen nulstilles her. el er et element inde i det rullende indhold.
export function scrollDialogBodyToTop (el) {
  let box = el && el.parentElement
  while (box && getComputedStyle(box).overflowY !== 'auto') box = box.parentElement
  if (box) box.scrollTop = 0
}
