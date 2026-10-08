// Fanen Virksomheden, Stamdata: felterne fra CVR og rådgiverens rettelser til dem. Flyttet ordret
// fra src/financials.jsx ved migrationen til Vue; kun import- og export-linjerne er nye.
// cvrSave sender 'fin-cvr' på window; skærmen lytter med useWindowEvent.
import { finPublicDataDate } from './finFormat.js';

/* ─────────────────────────────────────────────────────────────────────────
   Stamdata: hentet via integrationen til CVR. Rådgiveren kan rette et felt
   (blyant), gendanne CVR-værdien (fortryd-pil) og hente stamdata igen fra CVR
   (pil i ring i sektionens hoved). Rettelser bevares ved hentning. CVR-nummeret
   er nøglen til registret og kan ikke rettes. Tilstanden ligger i
   localStorage (kabul:, så Nulstil demo rydder den):
   { fields: { [key]: { value, at, by } }, fetchedAt }. Eksporten
   Virksomhedsprofil_CVR.pdf bruger cvrVal, så den følger skærmen.
   ──────────────────────────────────────────────────────────────────────── */
const FIN_CVR_KEY = 'kabul:fin-cvr:nordhavn';
function cvrLoad() { try { return JSON.parse(localStorage.getItem(FIN_CVR_KEY) || '{}') || {}; } catch (e) { return {}; } }
function cvrSave(st) { try { localStorage.setItem(FIN_CVR_KEY, JSON.stringify(st)); } catch (e) {} window.dispatchEvent(new CustomEvent('fin-cvr')); }
// CVR's egne værdier (det integrationen leverer) pr. felt
function cvrOrig(key) {
  const co = DATA.COMPANY || {};
  const present = (v) => v != null && v !== '' && v !== '-';
  if (key === 'address') return [co.address, co.postal].filter(present).join(', ');
  if (key === 'employees') return present(co.employees) ? String(co.employees) : '';
  return co[key] != null ? String(co[key]) : '';
}
function cvrEdit(key) { const f = (cvrLoad().fields || {})[key]; return f && f.value != null ? f : null; }
function cvrVal(key) { const e = cvrEdit(key); return e ? e.value : cvrOrig(key); }
function cvrUpdated() { const at = cvrLoad().fetchedAt; return at ? CW.fmtDate(at) : ((DATA.COMPANY && DATA.COMPANY.masterDataUpdated) || finPublicDataDate()); }
const CVR_FIELDS = [
  { key: 'legalForm', label: 'Juridisk form' },
  { key: 'industry', label: 'Branche' },
  { key: 'founded', label: 'Stiftelsesdato' },
  { key: 'employees', label: 'Antal ansatte' },
  { key: 'address', label: 'Adresse', copy: true },
];

// Modul-eksport
export { FIN_CVR_KEY, cvrLoad, cvrSave, cvrOrig, cvrEdit, cvrVal, cvrUpdated, CVR_FIELDS };
