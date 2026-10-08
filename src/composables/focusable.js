// Elementer, der kan få fokus med Tab. Samme liste som prototypens FOCUSABLE i case_state.js
// (src/domain/case_state.js), som tastaturhjælperne og fokusfælderne bruger.
export const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]'
