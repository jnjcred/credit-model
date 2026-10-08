/* ── Nulstil demo ───────────────────────────────────────────────────────────
   Samme handling fra sidebjælken, brugermenuen og Tweaks: bekræft, og nulstil så med
   CW.resetDemo(), der rydder sag, memo, kommentarer og filer og genindlæser. */
import { CW } from '@/domain/case_state'
import { t } from '@/i18n'

export function confirmResetDemo () {
  CW.confirm({
    title: t('Nulstil demoen?'),
    text: t('Sagens fase, anmodningen, uploads, godkendelser, memoet, kommentarer og omfordelinger slettes. Sprog og skærm bevares.'),
    confirmLabel: t('Nulstil demo'),
    danger: true,
  }).then(r => {
    if (!r || !r.ok) return
    // Kvittering efter genindlæsningen (vises af NewCaseHost ved start)
    try { sessionStorage.setItem('cw_reset_done', '1') } catch (e) {}
    CW.resetDemo()
  })
}
