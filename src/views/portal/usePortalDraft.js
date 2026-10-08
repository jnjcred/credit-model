// Kladden til et punkt (new_case_portal.jsx: usePortalDraft, L1865–1877): det, kunden har valgt eller
// skrevet på punktets side, gemmes ved hver ændring (csSaveDraft), ikke når siden åbner. Forhåndsvisningen
// gemmer ingen kladder (csSaveDraft svarer null).
//
// Brug (i setup):
//   const draftAt = usePortalDraft(itemId, () => ({ files: staged.value, note: note.value }))
//   draftAt er tidspunktet for seneste gem (ISO), eller null.
// Ændringen måles som før på filernes id'er og bemærkningen.
import { ref, watch } from 'vue'
import { csDraft, csSaveDraft } from '@/domain/customer'

export function usePortalDraft (itemId, value) {
  const d = csDraft(itemId)
  const at = ref(d ? d.at : null)
  const key = () => {
    const v = value()
    return JSON.stringify([(v.files || []).map(f => f.id), v.note || ''])
  }
  watch(key, () => {
    const saved = csSaveDraft(itemId, value())
    at.value = saved ? saved.at : null
  })
  return at
}
