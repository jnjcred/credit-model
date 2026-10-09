// Rådgiverens versioner af kundens materiale (9. oktober 2026, Jesper): punktet i anmodningen er
// source of truth. Kundens fil er én version; rådgiverens import (f.eks. et tilrettet budget i Excel)
// er en ny version af samme punkt. Den er intern, til rådgiveren deler den med kunden, og kundens
// original bevares altid. Regnskab viser den aktive version. Bygget generelt pr. punkt, men i dag
// kun brugt til budgettet ('m-budget'); periodetal og intern årsrapport kan følge samme model.
//
// localStorage kabul:fin-versions:nordhavn = { [itemId]: { active: <versionens id> | 'customer', list: [Version] } }
// Version = { id, fileId, name, label (navnet, rådgiveren selv vælger, fx "Budget 2"), at, by, shared, basis (kundens filnavn, versionen bygger på, eller null), n (antal tal) }
// Rådgiverens tal er rettelser i Regnskab med versionId (finEdits.js); er kundens version aktiv,
// tælles de ikke med (finActiveEdits). Filen ligger som rådgiverens fil under Dokumenter (CW.addLooseUploads).
import { finFill } from './finFormat.js';

const FIN_VERSIONS_KEY = 'kabul:fin-versions:nordhavn';

function finLoadVersions() {
  try { const v = JSON.parse(localStorage.getItem(FIN_VERSIONS_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
function finStoreVersions(all) {
  try { localStorage.setItem(FIN_VERSIONS_KEY, JSON.stringify(all)); } catch (e) {}
  if (window.CW && CW.bump) CW.bump();
}
/** Punktets versioner: { active, list } (list ældste først), eller tomt. */
function finVersionsOf(itemId) {
  const v = finLoadVersions()[itemId];
  return v && Array.isArray(v.list) ? v : { active: null, list: [] };
}
/** Navnet på en version: rådgiveren kan omdøbe den; ellers "Budget 2", "Budget 3" ... (kundens budget er "Budget 1"). */
function finVersionLabel(ver, idx) {
  return (ver && ver.label) || ('Budget ' + (idx + 2));
}
/** Rådgiverens seneste version af punktet, eller null. */
function finAdviserVersion(itemId) {
  const v = finVersionsOf(itemId);
  return v.list.length ? v.list[v.list.length - 1] : null;
}
/** Id'et på den version, Regnskab bruger: en rådgiverversion, eller null når kundens budget er valgt. */
function finActiveVersionId(itemId) {
  const v = finVersionsOf(itemId);
  if (!v.list.length || v.active === 'customer') return null;
  const hit = v.list.find(x => x.id === v.active);
  return hit ? hit.id : v.list[v.list.length - 1].id;
}
/** Er en af rådgiverens versioner den, Regnskab bruger? Nej, når kundens budget er valgt. */
function finAdviserActive(itemId) {
  return finActiveVersionId(itemId) !== null;
}
/** En bestemt version af punktet, eller null. */
function finVersionById(itemId, versionId) {
  return finVersionsOf(itemId).list.find(x => x.id === versionId) || null;
}
const finNewVersionId = () => 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/** Gemmer rådgiverens fil som ny version og gør den aktiv. file: File; basis: kundens filnavn eller null; label: navnet (valgfrit). */
function finAddVersion(itemId, id, file, n, basis, label) {
  const metas = window.CW ? CW.putFiles([file], { by: 'rådgiver', itemId: null }) : [];
  const meta = metas[0] ? Object.assign({}, metas[0], { versionOf: itemId, internal: true }) : null;
  if (meta) CW.addLooseUploads([meta]);
  const all = finLoadVersions();
  const cur = all[itemId] && Array.isArray(all[itemId].list) ? all[itemId] : { list: [] };
  const by = (window.DATA && DATA.ADVISOR && DATA.ADVISOR.name) || 'Mette Larsen';
  const ver = { id, fileId: meta ? meta.id : null, name: file.name, at: new Date().toISOString(), by, shared: false, basis: basis || null, n,
    label: (label || '').trim() || null };
  ver.label = finVersionLabel(ver, cur.list.length);
  all[itemId] = { active: id, list: cur.list.concat([ver]) };
  finStoreVersions(all);
  if (window.CW && CW.log) {
    CW.log('fin-version', finFill(t('Rådgiverens version af {punkt}: {fil} ({n} tal), ikke delt med kunden'), { punkt: t(CW.itemById(itemId) ? CW.itemById(itemId).label : itemId), fil: file.name, n }),
      { who: 'rådgiver', itemId, data: { versionId: id } });
  }
  return ver;
}
/** Vælger, hvilken budgetversion Regnskab bruger: 'customer' (kundens budget) eller en versions id. */
function finSetActiveVersion(itemId, which) {
  const all = finLoadVersions();
  if (!all[itemId]) return;
  all[itemId] = Object.assign({}, all[itemId], { active: which });
  finStoreVersions(all);
  if (window.CW && CW.log) {
    const ver = which === 'customer' ? null : finVersionById(itemId, which);
    const text = which === 'customer' ? t('Regnskab bruger kundens budget') : finFill(t('Regnskab bruger {navn}'), { navn: ver ? finVersionLabel(ver, finVersionsOf(itemId).list.indexOf(ver)) : '' });
    CW.log('fin-version', text, { who: 'rådgiver', itemId });
  }
}
/** Omdøber en version (rådgiveren vælger selv navnet). */
function finRenameVersion(itemId, versionId, label) {
  const all = finLoadVersions();
  const cur = all[itemId];
  const name = (label || '').trim();
  if (!cur || !name) return;
  all[itemId] = Object.assign({}, cur, { list: cur.list.map(v => (v.id === versionId ? Object.assign({}, v, { label: name }) : v)) });
  finStoreVersions(all);
}
/** Deler (eller fjerner delingen af) rådgiverens version med kunden: kunden kan se og hente filen. */
function finShareVersion(itemId, versionId, shared) {
  const all = finLoadVersions();
  const cur = all[itemId];
  if (!cur) return;
  let name = '';
  all[itemId] = Object.assign({}, cur, { list: cur.list.map(v => { if (v.id !== versionId) return v; name = v.name; return Object.assign({}, v, { shared: !!shared }); }) });
  finStoreVersions(all);
  if (window.CW && CW.log) {
    CW.log('fin-version', finFill(shared ? t('{fil} er delt med kunden') : t('{fil} er ikke længere delt med kunden'), { fil: name }), { who: 'rådgiver', itemId });
  }
}
/** Rådgiverens versioner, kunden kan se (delt), nyeste først. */
function finSharedVersions(itemId) {
  return finVersionsOf(itemId).list.filter(v => v.shared).slice().reverse();
}
/** Rettelserne, Regnskab bruger: kun rettelser fra den valgte version tæller (kundens budget: ingen af dem). */
function finActiveEdits(edits) {
  const all = finLoadVersions();
  const off = {};
  Object.keys(all).forEach(itemId => {
    const active = finActiveVersionId(itemId);
    (all[itemId] && all[itemId].list || []).forEach(v => { if (v.id !== active) off[v.id] = true; });
  });
  return (edits || []).filter(x => !(x.versionId && off[x.versionId]));
}

// Modul-eksport
export {
  FIN_VERSIONS_KEY, finLoadVersions, finVersionsOf, finAdviserVersion, finActiveVersionId, finAdviserActive, finVersionById, finVersionLabel,
  finNewVersionId, finAddVersion, finSetActiveVersion, finRenameVersion, finShareVersion, finSharedVersions, finActiveEdits,
};
