// Case workspace shell - header + tabs + content router
//
// Sagens fase (stage), afslag og indstilling gemmes i den fælles sagstilstand
// (CW.caseState i src/case_state.js). Rådgiverens faseskift går altid gennem
// CW.requestStage, CW.submit, CW.withdraw, CW.decline og CW.reopen, som selv
// spørger først, hvis sagen er indstillet eller afslået. Den eneste undtagelse
// er de automatiske skift mellem Afventer kunden og Klar (wsAutoStage), og de
// sker kun, når CW.stageBlock er null.

// Tekst med variable: wsFill(oversat tekst med {email}, { email })
function wsFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
}

// Ental/flertal: wsPlural(n, tekst for 1, tekst med {n})
function wsPlural(n, one, many) { return n === 1 ? one : wsFill(many, { n }); }

// Knapper der er slået fra, skal også se sådan ud (styles.css har ingen :disabled-stil)
function wsOff(off) { return off ? { opacity: 0.45, cursor: 'not-allowed' } : null; }

// Rådgiveren på sagen. DATA.ADVISOR vinder, hvis data.js har den.
function wsAdvisor() {
  return Object.assign({
    name: DATA.COMPANY.responsibleFull || 'Mette Larsen', initials: 'ML', title: 'Kreditrådgiver', org: 'EIFO',
    phone: '+45 35 29 86 42', email: 'mette.larsen@eifo.dk',
  }, DATA.ADVISOR || {});
}

// Sagen ud fra id: først sagslisten, så sager oprettet i Ny sag-guiden.
// Et ukendt id får en tom stub, så det aldrig åbner Nordhavn.
function wsCaseData(caseId) {
  const id = Number(caseId);
  const c = DATA.CASES.find(x => x.id === id);
  // Sager fra Ny sag-guiden: guidens egne data (anmodning, beløb, facilitet) vinder
  const d = typeof CW.demoCase === 'function' ? CW.demoCase(id) : (CW.demoCases() || []).find(x => Number(x.id) === id);
  if (c) return d ? Object.assign({}, c, d, { id, demo: true, caseNr: d.caseNr || c.caseNr, createdAt: d.createdAt || c.createdAt, status: c.status }) : c;
  if (d) {
    return Object.assign({ status: 'Draft', caseNr: '2026-' + String(d.id).padStart(4, '0'), responsible: d.responsible || d.owner || DATA.ME, type: d.product || d.type || '' }, d, { id, demo: true });
  }
  return { id, name: t('Ukendt sag'), caseNr: String(caseId), status: 'Draft', unknown: true };
}

// Kun sag 1 (Nordhavn, 2026-0184) har levende data i demoen
function wsCaseHasData(c) { return !!c && !c.unknown && CW.isLiveCase(c.id); }

function wsInitials(name) {
  return String(name || '').split(' ').filter(w => /^[A-ZÆØÅ]/.test(w)).slice(0, 2).map(w => w[0]).join('') || '?';
}

// Beløb i kroner: "DKK 3,6 mio." / "DKK 3.6m"
function wsMoney(v) {
  if (v == null || v === '' || isNaN(Number(v))) return '';
  const n = Number(v);
  const en = window.CW_LANG === 'en';
  const loc = en ? 'en-GB' : 'da-DK';
  if (Math.abs(n) >= 1e6) {
    const m = (n / 1e6).toLocaleString(loc, { maximumFractionDigits: 1 });
    return en ? 'DKK ' + m + 'm' : 'DKK ' + m + ' mio.';
  }
  return 'DKK ' + n.toLocaleString(loc);
}
function wsNum(v, digits) {
  if (v == null || v === '' || isNaN(Number(v))) return '';
  return Number(v).toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK', { maximumFractionDigits: digits == null ? 1 : digits });
}
function wsPct(share) {
  if (share == null || isNaN(Number(share))) return '';
  const n = Number(share) <= 1 ? Number(share) * 100 : Number(share);
  return wsNum(n, 1) + (window.CW_LANG === 'en' ? '%' : ' %');
}

// ── Sagens fase ─────────────────────────────────────────────────────────────
// stage: 'review-public' | 'material-selection' | 'awaiting-customer' | 'ready' | 'ready-skip' | 'declined'
const WS_STAGES = ['review-public', 'material-selection', 'awaiting-customer', 'ready', 'ready-skip', 'declined'];
function wsStage() {
  const s = CW.stage();
  return WS_STAGES.indexOf(s) >= 0 ? s : 'review-public';
}

/**
 * Automatiske skift mellem Afventer kunden og Klar. Kun her må workspace sætte
 * fasen direkte, og kun når intet står i vejen (stageBlock er null).
 */
function wsAutoStage(to) {
  if (CW.stage() === to || CW.stageBlock(to) !== null) return false;
  CW.setCaseState({ stage: to });
  // Loggen siger det samme som pillen: til Klar er det materialet, der er klar,
  // mens pillen typisk siger "Memo skrives"
  CW.log('stage', to === 'ready'
    ? t('Alt påkrævet materiale er godkendt. Næste skridt er memoet.')
    : wsFill(t('Fase: {stage} (automatisk)'), { stage: wsPhaseName(to) }), { who: 'system' });
  return true;
}

/**
 * Er kundens materiale klar? Kun de påkrævede punkter tæller (CW.progress().
 * readyForMemo). Et valgfrit punkt, der ikke er kommet, blokerer ikke. Har en
 * opdatering fjernet alle påkrævede punkter, er materialet klart, når intet
 * venter på gennemgang eller er afvist.
 */
function wsMaterialReady(p) {
  p = p || CW.progress();
  if (p.readyForMemo) return true;
  return !!CW.request() && p.required === 0 && p.total > 0 && p.toReview === 0 && p.rejected === 0;
}

/**
 * Kan sagen indstilles? Samme regel som klarhedstjekket: sagen er i Klar, og
 * intet punkt blokerer. Tomme felter og passerede datoer blokerer ikke (de
 * kræver en begrundelse i klarhedstjekket). Bruges af pille og sagshoved.
 */
function wsSubmitReady(stageOverride) {
  // I piloten indstilles der ikke i Crediwire: memoet skrives i Word med Copilot
  if (wsCopilot()) return false;
  if (CW.caseState().submittedAt) return false;
  const s = stageOverride || wsStage();
  if (s !== 'ready' && s !== 'ready-skip') return false;
  return !wsReadiness(s).some(r => r.group === 'block');
}
// Pilotens tilstand (case_facts.js): Credit memo er en side, hvor sagens
// materiale hentes til Copilot, og Indstilling er skjult. 'builtin' er det
// indbyggede memo og indstillingen.
function wsCopilot() { return window.CW_MEMO_MODE !== 'builtin'; }

// Andre skærme (sagslisten i data.js) kan bruge samme regel
window.CW_SUBMIT_READY = () => { try { return wsSubmitReady(); } catch (e) { return false; } };

/**
 * En opdatering af en sendt anmodning er en visning, ikke en fase. Sagen
 * bliver i Afventer kunden eller Klar, til opdateringen sendes. Flaget lever
 * i modulet, så det overlever faneskift, men ikke genindlæsning (kladden gør).
 */
let wsEditingRequest = false;
function wsSetEditing(on) {
  if (wsEditingRequest === !!on) return;
  wsEditingRequest = !!on;
  CW.bump();
}
function wsIsEditing() {
  const s = wsStage();
  return wsEditingRequest && !!CW.request() && !CW.caseState().submittedAt && (s === 'awaiting-customer' || s === 'ready');
}

// Sagens fase med samme navn som i sagslisten (DATA.STATUS). stageOverride
// giver navnet på en anden fase, fx den en afslået sag genoptages i.
function wsPhaseName(stageOverride) {
  let key;
  if (!stageOverride) key = wsStatusKey(CW.LIVE_CASE_ID);
  else {
    const s = stageOverride;
    key = s === 'material-selection' ? 'material'
      : s === 'awaiting-customer' ? (CW.progress().toReview > 0 ? 'toReview' : 'awaiting')
      : s === 'ready' || s === 'ready-skip' ? (wsSubmitReady(s) ? 'ready' : 'memo')
      : s === 'declined' ? 'declined' : 'review';
  }
  const d = key ? ((DATA.STATUS && DATA.STATUS[key] && DATA.STATUS[key].label) ? DATA.STATUS[key] : WS_STATUS[key]) : null;
  return d ? t(d.label) : t(CW.stageLabel(stageOverride || wsStage()));
}

// Rådgiverens handlinger. Alle spørger selv, hvis noget står i vejen.
// Genoptag kræver en bekræftelse, samme sted som på Finansielt.
function wsReopen() {
  const cs = CW.caseState();
  return CW.confirm({
    title: t('Genoptag sagen?'),
    text: wsFill(t('Sagen vender tilbage til fasen {stage}. Afslaget gemmes i sagens historik.'), { stage: wsPhaseName(cs.declinedFrom || 'review-public') }),
    confirmLabel: t('Genoptag sag'),
  }).then(r => {
    if (!r.ok) return false;
    CW.reopen();
    CW.toast(wsFill(t('Sagen er genoptaget i fasen {stage}'), { stage: wsPhaseName() }));
    CW.focusSoon('#ws-hero-title');
    return true;
  });
}

/**
 * "Anmod om materiale" / "Anmod om mere materiale" fra alle skærme. Første
 * anmodning er fasen Materialevalg. Er anmodningen sendt, åbnes kladden som en
 * visning, og fasen bevares. En indstillet sag skal trækkes tilbage først, en
 * afslået sag genoptages først. open() viser vælgeren (fx går til Overblik).
 */
function wsRequestMore(open) {
  const cs = CW.caseState();
  const s = wsStage();
  if (!CW.request()) {
    return CW.requestStage('material-selection').then(ok => { if (ok) open(); return ok; });
  }
  const edit = () => { wsSetEditing(true); open(); return true; };
  if (cs.submittedAt) return wsWithdraw().then(ok => (ok ? edit() : false));
  if (s === 'declined') {
    return CW.confirm({
      title: t('Sagen er afslået'),
      text: t('Vil du genoptage sagen? Afslaget gemmes i sagens historik.'),
      confirmLabel: t('Genoptag og fortsæt'),
    }).then(r => { if (!r.ok) return false; CW.reopen(); return edit(); });
  }
  // Ældre tilstand: sendt anmodning, men sagen står i Vurdering, Materialevalg eller sprunget over
  if (s !== 'awaiting-customer' && s !== 'ready') {
    return CW.requestStage('awaiting-customer').then(ok => (ok ? edit() : false));
  }
  return Promise.resolve(edit());
}
window.CW_REQUEST_MORE = wsRequestMore;

/**
 * Kundeside-overlayet (forhåndsvisning af kundens portal) fra andre skærme,
 * fx Dataanmodninger. Står man ikke i sagen, åbnes sag 1 først.
 */
let wsPendingPreview = false;
window.CW_OPEN_CUSTOMER_PREVIEW = function () {
  let cur = '';
  try { cur = localStorage.getItem('cw_route') || ''; } catch (e) {}
  const inCase = cur.split(':')[0] === 'workspace' && Number(cur.split(':')[1]) === CW.LIVE_CASE_ID;
  if (inCase) { window.dispatchEvent(new CustomEvent('cw-open-customer-preview')); return true; }
  wsPendingPreview = true;
  if (typeof window.__go === 'function') window.__go('workspace:' + CW.LIVE_CASE_ID);
  // Er sagshovedet allerede monteret (fx fra en anden sag), får det besked her
  setTimeout(() => { if (wsPendingPreview) window.dispatchEvent(new CustomEvent('cw-open-customer-preview')); }, 200);
  return true;
};
function wsWithdraw() {
  return CW.confirm({
    title: t('Træk indstillingen tilbage?'),
    text: t('Komitéen får besked, og memoet kan redigeres igen. Den indstillede version og din årsag gemmes i sagens historik.'),
    confirmLabel: t('Træk tilbage'), requireReason: true, reasonLabel: t('Årsag til at trække indstillingen tilbage'), danger: true,
  }).then(r => {
    if (!r.ok) return false;
    CW.withdraw(r.reason);
    CW.toast(t('Indstillingen er trukket tilbage. Memoet kan redigeres igen.'));
    CW.focusSoon('#ws-hero-title, #ws-indstil-title');
    return true;
  });
}

// ── Sagens status (fælles ordliste med sagskort og Dataanmodninger) ─────────
// DATA.caseStatusKey/DATA.STATUS kommer fra data.js. Mangler de, udleder
// workspace selv statussen med samme regler.
const WS_STATUS = {
  draft:     { label: 'Kladde',               tone: 'outline' },
  review:    { label: 'Vurdering',            tone: 'ink' },
  material:  { label: 'Materialevalg',        tone: 'outline' },
  awaiting:  { label: 'Afventer kunden',      tone: 'warn' },
  toReview:  { label: 'Til din gennemgang',   tone: 'ink' },
  memo:      { label: 'Memo i gang',          tone: 'ink' },
  ready:     { label: 'Klar til indstilling', tone: 'success' },
  submitted: { label: 'Indstillet',           tone: 'solid-success' },
  declined:  { label: 'Afslået',              tone: 'danger' },
  decided:   { label: 'Afgjort',              tone: 'outline' },
};
// Memoets status beregnes af hele teksten (ca. 10 ms). Samme gentegning spørger
// flere gange (pille, knap, fasekort), så svaret genbruges, indtil opgaven er
// færdig, eller sagen eller memoet ændrer sig.
let wsMemoCache = null;
function wsClearMemoCache() { wsMemoCache = null; }
window.addEventListener('cw-case-changed', wsClearMemoCache);
window.addEventListener('memo-changed', wsClearMemoCache);
function wsMemoStatus() {
  const fn = window.CW_MEMO_STATUS;
  if (typeof fn !== 'function') return null;
  if (wsMemoCache && wsMemoCache.fn === fn) return wsMemoCache.v;
  let v = null;
  try { v = fn() || null; } catch (e) { v = null; }
  wsMemoCache = { fn, v };
  setTimeout(wsClearMemoCache, 0);
  return v;
}
function wsMemoReviewed(m) {
  if (!m) return 0;
  if (typeof m.reviewed === 'number') return m.reviewed;
  return (m.sections || []).filter(s => s.reviewedBy).length;
}
function wsBlockingComments(m) {
  if (!m) return 0;
  const b = m.blockingComments;
  return Array.isArray(b) ? b.length : (Number(b) || 0);
}
function wsOwnStatusKey() {
  const cs = CW.caseState();
  const s = wsStage();
  if (cs.submittedAt) return 'submitted';
  if (s === 'declined') return 'declined';
  if (s === 'material-selection') return 'material';
  if (s === 'awaiting-customer') return CW.progress().toReview > 0 ? 'toReview' : 'awaiting';
  if (s === 'ready' || s === 'ready-skip') return wsSubmitReady(s) ? 'ready' : 'memo';
  return 'review';
}
function wsStatusKey(caseId) {
  let k = null;
  if (typeof DATA.caseStatusKey === 'function') {
    try { k = DATA.caseStatusKey(caseId) || null; } catch (e) {}
  }
  // En demosag, hvis anmodning er sendt (CW.sendDemoCase), afventer kunden
  if (!CW.isLiveCase(caseId) && (!k || k === 'draft') && typeof CW.demoCase === 'function') {
    const d = CW.demoCase(caseId);
    if (d && d.request && d.request.sent) return 'awaiting';
  }
  if (!k) return CW.isLiveCase(caseId) ? wsOwnStatusKey() : null;
  // Memo skrives og Klar til indstilling følger klarhedstjekket (ingen
  // blokerende punkter), ikke antallet af tomme skabelonfelter
  if (CW.isLiveCase(caseId) && (k === 'memo' || k === 'ready')) return wsSubmitReady() ? 'ready' : 'memo';
  return k;
}
function WSStatusPill({ caseData }) {
  const key = wsStatusKey(caseData.id);
  const d = key ? ((DATA.STATUS && DATA.STATUS[key] && DATA.STATUS[key].label) ? DATA.STATUS[key] : WS_STATUS[key]) : null;
  if (!d) return statusPill(caseData.status);
  return <span className={'pill ' + (d.tone || 'outline')}><span className="pill-dot" aria-hidden="true"/>{t(d.label)}</span>;
}

// ── Ejer ────────────────────────────────────────────────────────────────────
function wsOwner(caseData) {
  if (typeof DATA.caseOwner === 'function') {
    try { const o = DATA.caseOwner(caseData.id); if (o) return o; } catch (e) {}
  }
  return CW.owners()[caseData.id] || caseData.responsible || DATA.ME;
}
function wsTeam() {
  const s = [];
  [DATA.ME].concat(DATA.CASES.map(c => c.responsible)).forEach(n => { if (n && s.indexOf(n) < 0) s.push(n); });
  return s;
}

// Overblik ruller hertil, når man kommer fra sagshovedet eller en anden fane
let wsPendingFocus = null;
function wsScrollTo(id) {
  // Udestående står først, når kunden er bedt om materiale; ellers materialekortet
  const el = document.getElementById(id) || (id === 'ws-outstanding' ? document.getElementById('ws-received') : null);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

// Sagens faktaark (src/case_facts.js). Tåler, at det mangler eller er
// overskrevet af noget, der ikke er et objekt.
function wsFacts() {
  const F = window.CASE_FACTS;
  return F && typeof F === 'object' && !Array.isArray(F) ? F : {};
}

// Tekst fra faktaarket på det aktive sprog: obj.textEn på engelsk, hvis feltet
// findes, ellers obj.text. Faktaarket har selv de engelske felter (suffiks En).
function wsFact(obj, key) {
  if (!obj) return '';
  const en = window.CW_LANG === 'en' ? obj[key + 'En'] : null;
  const v = en != null && en !== '' ? en : obj[key];
  return v == null ? '' : v;
}

// Åbn et kildedokument under Dokumenter. Dokumentfanen læser
// sessionStorage 'kabul:open-doc' (og lytter på 'cw-open-doc'), når den findes.
function wsDocName(doc) {
  const d = (window.CASE_DOCS || []).find(x => x.id === doc || x.name === doc);
  return d ? d.name : String(doc || '');
}
// back: { route, anchor, label } giver Dokumenter en knap tilbage til stedet,
// man kom fra (fx beslutningsgrundlaget på Overblik).
function wsOpenDoc(src, go, caseId, back) {
  if (!src || !src.doc) return;
  const detail = { doc: src.doc, name: wsDocName(src.doc), ref: src.ref || null, back: back || null };
  try { sessionStorage.setItem('kabul:open-doc', JSON.stringify(detail)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('cw-open-doc', { detail })); } catch (e) {}
  go && go('workspace:' + caseId + ':documents');
}

// "Sendt 29. sep. 13:40" eller "Sendt 29. sep. 13:40 · opdateret 29. sep. 15:02"
// dateOnly: kun datoen (til trin og lister), klokkeslættet står i title
function wsSentText(r, dateOnly) {
  if (!r) return '';
  const f = dateOnly ? wsDay : CW.fmtWhen;
  const first = r.firstSentAt || r.sentAt;
  return (r.version || 1) > 1 && first !== r.sentAt
    ? wsFill(t('Sendt {first} · opdateret {when}'), { first: f(first), when: f(r.sentAt) })
    : wsFill(t('Sendt {when}'), { when: f(r.sentAt) });
}
// Når en dansk dato ("9. okt.") slutter sætningen, står der kun ét punktum
function wsDot(s) { return String(s).replace(/\.\.$/, '.'); }
// Dato uden klokkeslæt til lister og trin: dansk "30-09-2026"; engelsk "30 Sep" i år, ellers med årstal
function wsDay(iso) {
  const s = CW.fmtDate(iso);
  if (!s) return '';
  if (window.CW_LANG !== 'en') return s;
  const y = String(new Date(iso).getFullYear());
  return y === String(new Date().getFullYear()) ? s.replace(new RegExp('\\s' + y + '$'), '') : s;
}
// Hvornår blev kunden bedt om punktet? Den seneste afsendelse, der tilføjede det.
function wsItemRequestedAt(r, id) {
  if (!r) return null;
  const h = (r.history || []).filter(x => (x.added || []).indexOf(id) >= 0).slice(-1)[0];
  return (h && h.at) || r.firstSentAt || r.sentAt;
}

// Punkternes status og den sendte anmodning sidst sagen blev vist
function wsItemsKey() {
  const st = CW.items();
  const r = CW.request();
  return (r ? 'v' + (r.version || 1) : '-') + '|' + CW.requestedItems().map(it => it.id + ':' + ((st[it.id] && st[it.id].status) || '-')).join('|');
}

/* ─────────────────────────────────────────────────────────────────────────
   Lille menu (Flere handlinger, ejervælger). Esc og klik udenfor lukker,
   pil op/ned flytter mellem punkterne, fokus tilbage til knappen.
   ──────────────────────────────────────────────────────────────────────── */
function WSMenu({ label, ariaLabel, items, buttonClass, buttonStyle, menuLabel, minWidth, buttonId }) {
  const [open, setOpen] = React.useState(false);
  const wrap = React.useRef(null);
  const btn = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (!wrap.current) return;
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current && btn.current.focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const list = Array.from(wrap.current.querySelectorAll('[role^="menuitem"]'));
        if (!list.length) return;
        const i = list.indexOf(document.activeElement);
        const n = e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        list[n].focus(); e.preventDefault();
      }
      if (e.key === 'Tab') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey, true);
    const id = requestAnimationFrame(() => {
      const f = wrap.current && (wrap.current.querySelector('[role^="menuitem"][aria-checked="true"]') || wrap.current.querySelector('[role^="menuitem"]'));
      f && f.focus();
    });
    return () => { cancelAnimationFrame(id); document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey, true); };
  }, [open]);
  const pick = (it) => { setOpen(false); btn.current && btn.current.focus(); it.onClick && it.onClick(); };
  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <button ref={btn} id={buttonId} type="button" className={buttonClass || 'btn btn-sm'} style={buttonStyle} aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen(o => !o)}>
        {label}
      </button>
      {open && (
        <div role="menu" aria-label={menuLabel || ariaLabel} style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 60, padding: 4, minWidth: minWidth || 220 }}>
          {items.filter(Boolean).map((it, i) => it.sep ? (
            <div key={'s' + i} role="separator" style={{ height: 1, background: 'var(--c-line-2)', margin: '4px 2px' }}/>
          ) : (
            <button key={it.key || i} type="button" role={it.checked != null ? 'menuitemradio' : 'menuitem'} aria-checked={it.checked != null ? !!it.checked : undefined}
              onClick={() => pick(it)}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', padding: '7px 10px', border: 0, borderRadius: 6, background: 'transparent', textAlign: 'left', cursor: 'pointer', font: 'inherit', fontSize: 13, color: it.danger ? 'var(--c-danger)' : 'var(--c-ink)' }}>
              <span aria-hidden="true" style={{ width: 14, flexShrink: 0, display: 'grid', placeItems: 'center', marginTop: 2 }}>{it.checked ? <I.Check size={12}/> : it.icon || null}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 500 }}>{it.label}</span>
                {it.sub && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--c-text-3)', marginTop: 1, lineHeight: 1.4 }}>{it.sub}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Ejer-chippen: vælg hvem sagen ligger hos
function WSOwnerPicker({ caseData }) {
  CW.useCase();
  const owner = wsOwner(caseData);
  const team = wsTeam();
  if (team.indexOf(owner) < 0) team.unshift(owner);
  const setOwner = (name) => {
    if (name === owner) return;
    CW.setOwner(caseData.id, name);
    CW.toast(wsFill(t('Sagen er flyttet til {name}'), { name }));
  };
  return (
    <WSMenu
      ariaLabel={wsFill(t('Ansvarlig: {name}. Skift ansvarlig'), { name: owner })}
      menuLabel={t('Vælg ansvarlig')}
      buttonClass="btn btn-sm"
      buttonStyle={{ borderRadius: 999, gap: 7, paddingLeft: 5, height: 28 }}
      minWidth={200}
      label={<>
        <span className="avatar" aria-hidden="true" style={{ width: 20, height: 20, fontSize: 9 }}>{wsInitials(owner)}</span>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{owner}</span>
        <I.ChevronDown size={12} style={{ color: 'var(--c-text-3)' }}/>
      </>}
      items={team.map(n => ({ key: n, label: n, checked: n === owner, sub: n === DATA.ME ? t('Dig') : null, onClick: () => setOwner(n) }))}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Giv afslag: kan ske i alle faser før indstilling. Årsag er påkrævet.
   ──────────────────────────────────────────────────────────────────────── */
const WS_DECLINE_REASONS = ['Svag indtjening', 'Negativ egenkapital', 'For høj gearing', 'Uden for acceptkriterier', 'Andet'];

function WSDeclineDialog({ onClose, returnFocus }) {
  const ref = React.useRef(null);
  // Annullér, Esc og klik udenfor: fokus tilbage til en knap, der stadig findes
  // (knappen der åbnede dialogen, ellers sagens overskrift)
  const cancel = () => { onClose(); CW.focusSoon(returnFocus && document.querySelector(returnFocus) ? returnFocus : '#ws-hero-title'); };
  CW.useDialog(ref, true, cancel);
  const [reason, setReason] = React.useState('');
  const [note, setNote] = React.useState('');
  const [tried, setTried] = React.useState(false);
  const from = wsPhaseName();
  const ok = !!reason && (reason !== 'Andet' || note.trim().length > 0);
  const hint = !reason ? t('Vælg en årsag for at give afslag.') : !ok ? t('Skriv en note, når årsagen er "Andet".') : '';
  const submit = (e) => {
    e && e.preventDefault();
    setTried(true);
    if (!ok) return;
    CW.decline(reason, note.trim());
    onClose();
    CW.toast(wsFill(t('Afslag registreret: {reason}'), { reason: t(reason) }));
    CW.focusSoon('#ws-hero-title');
  };
  return (
    <div onMouseDown={cancel} style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,.45)', zIndex: 1200, display: 'grid', placeItems: 'center', padding: 20 }}>
      <form ref={ref} role="dialog" aria-modal="true" aria-labelledby="ws-decline-title" onMouseDown={e => e.stopPropagation()} onSubmit={submit}
        style={{ width: 'min(480px, 100%)', background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', boxShadow: '0 20px 50px rgba(0,0,0,.25)', padding: 24 }}>
        <h2 id="ws-decline-title" style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--c-ink)' }}>{t('Giv afslag')}</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--c-text-2)' }}>
          {wsFill(t('Sagen stoppes i fasen {stage}. Kunden får ikke besked automatisk. Genoptager du sagen, vender den tilbage hertil.'), { stage: from })}
        </p>
        <div className="field" style={{ marginBottom: 10 }}>
          <label htmlFor="ws-decline-reason">{t('Årsag')}</label>
          <select id="ws-decline-reason" className="input" value={reason} onChange={e => setReason(e.target.value)} autoFocus aria-describedby="ws-decline-hint">
            <option value="">{t('Vælg årsag')}</option>
            {WS_DECLINE_REASONS.map(r => <option key={r} value={r}>{t(r)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ws-decline-note">{reason === 'Andet' ? t('Note (påkrævet ved "Andet")') : t('Note (valgfri)')}</label>
          <textarea id="ws-decline-note" className="input" rows={3} value={note} onChange={e => setNote(e.target.value)}
            placeholder={t('Fx: Negativ udvikling i indtjeningen og høj gæld i forhold til EBITDA.')}
            style={{ height: 'auto', padding: '8px 10px', resize: 'vertical', lineHeight: 1.45, fontFamily: 'inherit' }}/>
        </div>
        <div id="ws-decline-hint" style={{ minHeight: 18, fontSize: 12, marginTop: 8, color: tried && hint ? 'var(--c-danger)' : 'var(--c-text-3)' }}>{hint}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-sm" onClick={cancel}>{t('Annullér')}</button>
          <button type="submit" className="btn btn-sm btn-danger" style={{ borderColor: ok ? 'var(--c-danger)' : undefined, ...wsOff(!ok) }} aria-disabled={!ok}>{t('Registrér afslag')}</button>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Sagshovedet
   ──────────────────────────────────────────────────────────────────────── */
function WorkspaceShell({ tab: routeTab, go, openMemo, caseId }) {
  CW.useCase();
  // I piloten er Indstilling skjult; et gammelt link dertil viser Credit memo
  const tab = wsCopilot() && routeTab === 'indstil' ? 'memo' : routeTab;
  const co = DATA.COMPANY;
  const caseData = wsCaseData(caseId);
  const hasData = wsCaseHasData(caseData);
  const scrollRef = React.useRef(null);
  // Under 1000 px ruller hovedet med: rullefeltet (.scroll) flyttes ud om hovedet
  const narrowShell = window.cwUseShellNarrow ? window.cwUseShellNarrow() : false;
  const scrollMap = React.useRef({});
  const [showCustomerStatus, setShowCustomerStatus] = React.useState(() => { const p = wsPendingPreview; wsPendingPreview = false; return !!p && wsCaseHasData(wsCaseData(caseId)); });
  // Andre skærme (Dataanmodninger) åbner samme Kundeside-overlay (CW_OPEN_CUSTOMER_PREVIEW)
  React.useEffect(() => {
    const on = () => { wsPendingPreview = false; if (wsCaseHasData(wsCaseData(caseId))) setShowCustomerStatus(true); };
    window.addEventListener('cw-open-customer-preview', on);
    return () => window.removeEventListener('cw-open-customer-preview', on);
  }, [caseId]);
  // Kom man fra en anden skærm end Mine opgaver (fx Porteføljeanalyse), fører
  // brødkrummen tilbage dertil: sessionStorage 'cw_back' = { route, label }
  const back = (() => { try { const b = JSON.parse(sessionStorage.getItem('cw_back') || 'null'); return b && b.route && b.label ? b : null; } catch (e) { return null; } })();
  const goBack = () => { try { sessionStorage.removeItem('cw_back'); } catch (e) {} go(back ? back.route : 'cases'); };
  const [declining, setDeclining] = React.useState(false);
  // Pille og næste skridt følger memoets gennemgang, også mens man står i memoet
  const [, setMemoTick] = React.useState(0);
  React.useEffect(() => {
    const on = () => setMemoTick(n => n + 1);
    window.addEventListener('memo-changed', on);
    return () => window.removeEventListener('memo-changed', on);
  }, []);

  const cs = CW.caseState();
  const stage = wsStage();
  const submitted = !!cs.submittedAt;

  // Save current scroll position per tab; restore on tab change. Målet læses,
  // før lytteren sættes på: ellers gemmer den forrige fanes rulning (som
  // browseren klemmer, når indholdet skifter) under den nye fane.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = scrollMap.current[tab] || 0;
    const onScroll = () => { scrollMap.current[tab] = el.scrollTop; };
    const id = requestAnimationFrame(() => {
      el.scrollTop = target;
      el.addEventListener('scroll', onScroll, { passive: true });
    });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(id);
    };
  }, [tab, narrowShell]);

  // Automatiske skift: når alle påkrævede punkter er godkendt, og intet venter
  // på gennemgang, er materialet klar (valgfrie punkter blokerer ikke). Mister
  // et punkt sin godkendelse, eller kommer der nye punkter, står sagen igen og
  // afventer. Kører også ved start, så ændringer fra kundeportalen fanges.
  // Sker aldrig på en indstillet eller afslået sag.
  const itemsKey = wsItemsKey();
  React.useEffect(() => {
    if (!hasData) return;
    const s = wsStage();
    const ready = wsMaterialReady();
    if (s === 'awaiting-customer' && ready) wsAutoStage('ready');
    else if (s === 'ready' && CW.request() && !ready) wsAutoStage('awaiting-customer');
  }, [itemsKey, hasData]);

  // Gå til Overblik og rul til et afsnit (materialevalg, formularen, udestående)
  const focusOverview = (target, focusSel) => {
    // Udestående og kladden deler plads: går man til udestående, lukkes kladden (den er gemt)
    if (target === 'ws-outstanding' || target === 'ws-hero') wsSetEditing(false);
    if (tab !== 'overview') { wsPendingFocus = target; go('workspace:' + caseId); }
    else setTimeout(() => wsScrollTo(target), 80);
    if (focusSel) setTimeout(() => CW.focusSoon(focusSel), tab !== 'overview' ? 260 : 120);
  };
  const toMaterial = () => wsRequestMore(() => focusOverview('ws-material', '#ws-material-title'));

  const request = CW.request();
  const p = CW.progress();
  const submitReady = wsSubmitReady();
  // Næste skridt. På Overblik ejer fasekortet næste skridt, så sagshovedet
  // viser ingen knap dér. På de andre faner hedder knappen det samme som
  // fasekortets primære knap. Står man allerede på målfanen, ruller knappen
  // til og fokuserer den næste handling dér i stedet for at gøre ingenting.
  const nextStep = (() => {
    if (tab === 'overview') return null;
    if (tab === 'indstil' && !submitted) return null;
    // I piloten har Credit memo-siden selv den primære knap (Hent alle dokumenter),
    // og en indstilling fra før piloten kan ikke ses (fanen er skjult)
    if (wsCopilot() && (tab === 'memo' || submitted)) return null;
    // På Indstilling-fanen er næste skridt at se den indstillede version
    if (submitted) return tab === 'indstil'
      ? { label: t('Se indstillet version'), onClick: () => wsOpenSubmittedVersion() }
      : { label: t('Se indstilling'), onClick: () => go('workspace:' + caseId + ':indstil') };
    const review = () => (p.toReview > 0
      ? { label: t('Gennemgå materiale'), onClick: () => focusOverview('ws-outstanding', wsFirstToReviewSel() || '#ws-outstanding-title') }
      : { label: t('Se udestående'), onClick: () => focusOverview('ws-outstanding', '#ws-outstanding-title') });
    // På memo-fanen peger knappen på det, der konkret mangler i memoet
    const memoOrSubmit = () => (submitReady
      ? { label: t('Indstil til kreditkomité'), onClick: () => (tab === 'indstil' ? wsFocusSubmit() : go('workspace:' + caseId + ':indstil')) }
      : tab === 'memo' ? wsMemoTabNext(() => go('workspace:' + caseId + ':indstil'))
      : { label: t('Fortsæt til memo'), onClick: () => go('workspace:' + caseId + ':memo') });
    // Materiale klar, men sagen står stadig i Afventer kunden: samme knap som fasekortet
    const markReady = { label: t('Markér som klar'), onClick: () => CW.requestStage('ready') };
    switch (stage) {
      case 'review-public': return { label: t('Anmod om materiale'), onClick: toMaterial };
      case 'material-selection': return { label: t('Åbn anmodningen'), onClick: () => { focusOverview('ws-hero', '#ws-material-title'); setTimeout(() => window.dispatchEvent(new CustomEvent('cw-open-material')), 200); } };
      case 'awaiting-customer': return p.toReview === 0 && wsMaterialReady(p) ? markReady : review();
      case 'ready': return wsMaterialReady(p) ? memoOrSubmit() : review();
      case 'ready-skip': return memoOrSubmit();
      case 'declined': return { label: t('Genoptag sag'), onClick: wsReopen };
      default: return null;
    }
  })();
  // Én primær knap pr. skærm: på Indstilling har siden selv den primære
  // knap (Indstil til kreditkomité), så sagshovedets knap er sekundær dér
  const nextPrimary = !(tab === 'indstil' && !submitted);

  const docCount = (DATA.DOCS || []).length + CW.allUploads().length;
  const tabs = [
    { k: "overview", label: t("Overblik"), ic: <I.Layout className="ic"/> },
    { k: "financials", label: t("Virksomheden"), ic: <I.BarChart className="ic"/> },
    { k: "documents", label: t("Dokumenter"), ic: <I.FileText className="ic"/>, badge: String(docCount) },
    { k: "memo", label: t("Credit memo"), ic: <I.File className="ic"/> },
    { k: "indstil", label: t("Indstilling"), ic: <I.Send className="ic"/>, badge: submitted ? 'v' + (cs.submitVersion || 1) : null },
  ].filter(tb => !(tb.k === 'indstil' && wsCopilot()));

  const name = hasData ? co.name : caseData.name;
  // Sagens produkt og beløb: "Eksportkaution, DKK 3,6 mio."; andelen af bankens facilitet står i title
  const facility = (() => {
    if (caseData.unknown || (!caseData.type && caseData.amount == null)) return null;
    const note = caseData.demo && typeof CW.demoCaseAmountNote === 'function' ? CW.demoCaseAmountNote(caseData.id) : (caseData.amountNote ? t(caseData.amountNote) : null);
    return { text: [caseData.type ? t(caseData.type) : '', caseData.amount != null ? wsMoney(caseData.amount) : ''].filter(Boolean).join(', '), note };
  })();
  const cvr = hasData ? co.cvr : caseData.cvr;

  // Frist og dage i fasen
  const deadlineIso = hasData ? (caseData.deadline || co.deadlineISO) : caseData.deadline;
  const deadlinePast = deadlineIso && CW.isPast(deadlineIso);
  // Dage i fase og SLA som på sagskortet (DATA.caseAge), så de to siger det samme
  let age = null;
  if (hasData && typeof DATA.caseAge === 'function') { try { age = DATA.caseAge(caseData.id); } catch (e) { age = null; } }
  const phaseSince = hasData ? (submitted ? cs.submittedAt : stage === 'declined' ? (cs.decline && cs.decline.at) || cs.stageSince : cs.stageSince) : null;
  const phaseDays = age && typeof age.days === 'number' ? age.days : phaseSince ? CW.workdaysBetween(phaseSince) : 0;
  const phaseLate = age ? age.sla === 'over' : phaseDays > 10;
  const phaseWarn = !!age && age.sla === 'warn';

  const moreItems = hasData ? [
    !submitted && stage !== 'declined' && { key: 'decline', label: t('Giv afslag'), sub: t('Stop sagen med en årsag'), danger: true, icon: <I.X size={12}/>, onClick: () => setDeclining(true) },
    submitted && { key: 'withdraw', label: t('Træk indstilling tilbage'), sub: t('Kræver en årsag'), icon: <I.Undo size={12}/>, onClick: wsWithdraw },
    stage === 'declined' && !submitted && { key: 'reopen', label: t('Genoptag sag'), sub: wsFill(t('Tilbage til {stage}'), { stage: wsPhaseName(cs.declinedFrom || 'review-public') }), icon: <I.Undo size={12}/>, onClick: wsReopen },
  ] : [];

  const sep = <span aria-hidden="true" style={{ margin: '0 6px', color: 'var(--c-line-strong)' }}>·</span>;

  return (
    <>
      <Topbar crumbs={[{ label: back ? t(back.label) : t("Mine opgaver"), onClick: goBack }, name]}/>

      {/* Omslag: over 1000 px display: contents (ingen virkning); under 1000 px
          er det rullefeltet, så hoved og faner ruller med indholdet */}
      <div className={narrowShell ? 'scroll ws-scroller' : 'ws-body'} ref={narrowShell ? scrollRef : undefined}>
      <div className="ws-header">
        <div className="ws-h-row">
          <div className="ws-h-name" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 className="ws-co-name" style={{ margin: 0 }}>{name}</h1>
              {!caseData.unknown && <WSStatusPill caseData={caseData}/>}
            </div>
            {/* Rød tekst kun når noget er overskredet; tid i fasen kun tæt på eller over SLA */}
            <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 2 }}>
              {/* Faciliteten (flyttet hertil fra kortet Virksomhed og facilitet på Overblik) */}
              {facility && <><span title={facility.note || undefined} style={{ color: 'var(--c-text-2)', fontWeight: 500 }}>{facility.text}</span>{sep}</>}
              <span className="mono">{t('Sagsnr.')} {caseData.caseNr}</span>
              {cvr && <>{sep}<span className="mono">CVR {cvr}</span></>}
              {hasData && (phaseLate || phaseWarn) && <>{sep}<span title={t('Hverdage siden sagen kom i den nuværende fase')} style={{ color: phaseLate ? 'var(--c-danger)' : undefined }}>
                {wsPlural(phaseDays, t('1 hverdag i fasen'), t('{n} hverdage i fasen'))} · {phaseLate ? t('over SLA') : t('tæt på SLA')}
              </span></>}
            </div>
          </div>
          <div className="ws-h-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {!caseData.unknown && <WSOwnerPicker caseData={caseData}/>}
            {hasData && (
              <>
                <button className="btn btn-sm" onClick={() => setShowCustomerStatus(true)} title={t("Se kundens side")}>
                  <I.Eye className="ic"/> {t('Kundeside')}
                </button>
                {/* Demo: kundens vej gennem opstarten, fra Opret bruger */}
                <button className="btn btn-sm" onClick={() => setShowCustomerStatus('flow')} title={t('Demo: de skærme, kunden kommer igennem, fra Opret bruger')} style={{ borderStyle: 'dashed', borderColor: 'var(--c-line-strong)', background: 'transparent' }}>
                  {t('Kundeflow')}
                </button>
              </>
            )}
            {hasData && (
              <WSMenu ariaLabel={t('Flere handlinger')} buttonId="ws-more-btn" buttonClass="btn btn-sm" buttonStyle={{ padding: '0 7px' }} label={<I.MoreH className="ic"/>} items={moreItems}/>
            )}
            {hasData && nextStep && (
              <button id="ws-next-btn" className={'btn btn-sm' + (nextPrimary ? ' btn-primary' : '')} onClick={nextStep.onClick}>{nextStep.label} <I.ArrowRight className="ic"/></button>
            )}
          </div>
        </div>
      </div>

      {hasData && (
        <nav className="ws-tabs" aria-label={t('Sagens faner')}>
          {tabs.map(tb => (
            <button key={tb.k} className={"ws-tab " + (tab === tb.k ? "active" : "")} aria-current={tab === tb.k ? 'page' : undefined} onClick={() => go("workspace:" + caseId + ":" + tb.k)}>
              {tb.ic} {tb.label} {tb.badge && <span className="badge">{tb.badge}</span>}
            </button>
          ))}
        </nav>
      )}

      <div className={narrowShell ? 'ws-scroll-inner' : 'scroll'} ref={narrowShell ? undefined : scrollRef}>
        {!hasData && <WSEmptyCase caseData={caseData} go={go} back={back} goBack={goBack}/>}
        {hasData && tab === "overview" && <WSOverview go={go} caseId={caseId} caseData={caseData} stage={stage}/>}
        {hasData && tab === "financials" && <WSFinancials go={go}/>}
        {hasData && tab === "documents" && <WSDocuments/>}
        {/* Nøglen genstarter memoet, hvis rullefeltet skifter (zoom over eller under 1000 px) */}
        {hasData && tab === "memo" && (wsCopilot()
          ? <WSMemoHandoff go={go} caseId={caseId}/>
          : <WSMemo key={narrowShell ? 'n' : 'w'}/>)}
        {/* Nøglen starter indstillingen forfra efter en tilbagetrækning, så begrundelserne forudfyldes */}
        {hasData && tab === "indstil" && <WSIndstil key={submitted ? 's' : 'd'} go={go} caseId={caseId} caseData={caseData} focusOverview={focusOverview}/>}
      </div>
      </div>

      {showCustomerStatus && (
        <WSCustomerPreview caseData={caseData} go={go} flow={showCustomerStatus === 'flow'} onClose={() => setShowCustomerStatus(false)}/>
      )}
      {declining && <WSDeclineDialog onClose={() => setDeclining(false)} returnFocus="#ws-more-btn"/>}
    </>
  );
}

// Hjælpere til sagshovedets knap, når man allerede står på målfanen
// (wsFirstToReviewSel står ved materialekortet)
function wsFocusSubmit() {
  const missing = document.querySelector('textarea[id^="ws-reason-"][aria-invalid="true"]') || Array.from(document.querySelectorAll('textarea[id^="ws-reason-"]')).find(x => !x.value.trim());
  CW.focusSoon(missing || '#ws-submit-btn');
}
// Sagshovedets knap på memo-fanen: næste afsnit, den blokerende kommentar
// eller (når memoet er i orden) videre til Indstilling
function wsMemoTabNext(toIndstil) {
  const blocks = wsReadiness(wsStage()).filter(r => r.group === 'block' && r.action && r.action.memo);
  const sec = blocks.find(r => /^sec-/.test(r.id));
  if (sec) return { label: t('Næste afsnit til gennemgang'), onClick: () => wsRunMemoLink(sec.action.memo) };
  const bc = blocks.find(r => /^bc/.test(r.id));
  if (bc) return { label: wsFill(t('Gå til {dept}-kommentaren'), { dept: bc.dept || t('kontrolfunktionen') }), onClick: () => wsRunMemoLink(bc.action.memo) };
  return { label: t('Gå til indstilling'), onClick: toIndstil };
}
// Den indstillede version med forside (memo.jsx), ellers skift til Indstilling
function wsOpenSubmittedVersion() {
  if (typeof window.CW_OPEN_MEMO_VERSION === 'function') { try { window.CW_OPEN_MEMO_VERSION(CW.caseState().submitVersion || 1); return; } catch (e) {} }
  CW.focusSoon('#ws-indstil-title');
}
// Dybdelink til memoet (memo.jsx stiller CW_OPEN_MEMO til rådighed). Mangler
// den, skiftes der bare til memofanen.
function wsRunMemoLink(link) {
  if (typeof window.CW_OPEN_MEMO === 'function') {
    try { window.CW_OPEN_MEMO(link || {}); return; } catch (e) {}
  }
  if (typeof window.__go === 'function') window.__go('workspace:' + CW.LIVE_CASE_ID + ':memo');
}

// Kender kundeportalen forhåndsvisning (prop'en preview)?
function wsPortalHasPreview() {
  if (typeof CustomerPortal !== 'function') return false;
  if (CustomerPortal.supportsPreview) return true;
  try { return /\bpreview\b/.test(String(CustomerPortal)); } catch (e) { return false; }
}

// "Kundeside": kundeportalen i forhåndsvisning oven på sagen
// Kundeside (flow = false) eller Kundeflow (flow = true). Statusboksen på
// Kundeside kan skifte til Kundeflow på det trin, kunden er på.
function WSCustomerPreview({ caseData, go, onClose, flow: startFlow }) {
  const [pv, setPv] = React.useState({ flow: !!startFlow, step: null });
  const ref = React.useRef(null);
  CW.useDialog(ref, true, onClose);
  // Forhåndsvisningen slås til, før portalen tegnes første gang, så intet i
  // portalen (fx "læst af kunden") når at ske, mens spærren endnu ikke er sat
  React.useState(() => { if (typeof CW.setPreview === 'function') CW.setPreview(true); return true; });
  // Kundehandlinger afvises, og toasts skjules
  React.useEffect(() => {
    if (typeof CW.setPreview === 'function') CW.setPreview(true);
    return () => { if (typeof CW.setPreview === 'function') CW.setPreview(false); };
  }, []);
  const co = DATA.COMPANY;
  if (wsPortalHasPreview()) {
    return (
      <div ref={ref} role="dialog" aria-modal="true" aria-label={t('Kundens side (forhåndsvisning)')}
        style={{ position: 'fixed', inset: 0, zIndex: 1100, background: '#fff', overflowY: 'auto' }}>
        <CustomerPortal key={(pv.flow ? 'flow:' : 'page:') + (pv.step || '')} preview flow={pv.flow} flowStart={pv.step}
          onOpenFlow={(step) => { setPv({ flow: true, step }); if (ref.current) ref.current.scrollTop = 0; }} back={onClose}/>
      </div>
    );
  }
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.55)', zIndex: 1100, display: 'flex', flexDirection: 'column' }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t('Kundens side (forhåndsvisning)')}
        onClick={e => e.stopPropagation()}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {/* Preview bar */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', background: '#1a1d22', color: '#fff' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{t('Forhåndsvisning')}</span>
          <span style={{ fontSize: 11.5, padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4, color: 'rgba(255,255,255,0.75)' }}>{t('Hvad kunden ser')}</span>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{co.name} · {t('Sagsnr.')} {caseData.caseNr}</span>
          <button
            onClick={() => { onClose(); go('portal'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
          >
            {t('Åbn kundeportalen')} <I.ArrowRight size={12}/>
          </button>
          <button
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
          >
            <I.X size={12}/> {t('Luk')}
          </button>
        </div>
        {/* Content */}
        <div style={{ flex: 1, background: '#fff', overflowY: 'auto' }}>
          <WSCustomerStatus preview={true}/>
        </div>
      </div>
    </div>
  );
}

// Sager uden levende data: ærlig tom tilstand med sagens egne oplysninger.
// En sag fra Ny sag-guiden viser den anmodning, guiden gemte (ikke sendt).
function WSEmptyCase({ caseData, go, back, goBack }) {
  const [showMail, setShowMail] = React.useState(false);
  const live = DATA.CASES.find(c => CW.isLiveCase(c.id)) || DATA.CASES[0];
  const sameCompany = !caseData.demo && String(caseData.cvr || '') === String(live.cvr || '') && caseData.id !== live.id;
  const owner = caseData.unknown ? null : wsOwner(caseData);
  const req = caseData.demo && caseData.request && Array.isArray(caseData.request.items) && caseData.request.items.length ? caseData.request : null;
  const reqItems = req && typeof CW.demoCaseItems === 'function' ? CW.demoCaseItems(caseData.id) : [];
  const amountNote = caseData.demo && typeof CW.demoCaseAmountNote === 'function' ? CW.demoCaseAmountNote(caseData.id) : null;
  const sent = !!(req && req.sent);
  const next = sent ? 'Afvent kunden' : caseData.demo && typeof CW.demoCaseNext === 'function' ? CW.demoCaseNext(caseData.id) : null;
  // Afsendelsen simuleres: anmodningen står som sendt, og sagen afventer kunden
  const sendDemo = () => {
    if (typeof CW.sendDemoCase !== 'function') { CW.notInDemo(t('Afsendelse fra en ny sag')); return; }
    CW.sendDemoCase(caseData.id);
    CW.toast(wsFill(t('Anmodning sendt til {email}'), { email: (req.to && (req.to.email || req.to.name)) || t('kunden') }));
    CW.focusSoon('#ws-demo-title');
  };
  const mail = showMail && req && typeof CW.demoCaseMail === 'function' ? CW.demoCaseMail(caseData.id) : null;
  const facts = caseData.unknown ? [] : [
    { label: t('Sagsnr.'), value: caseData.caseNr, mono: true },
    caseData.type && { label: t('Type'), value: t(caseData.type) },
    caseData.amount != null && { label: t('Beløb'), value: wsMoney(caseData.amount) + (amountNote ? ' (' + amountNote + ')' : ''), wrap: !!amountNote },
    owner && { label: t('Ansvarlig'), value: owner },
    caseData.demo && caseData.createdAt && { label: t('Oprettet'), value: CW.fmtDate(caseData.createdAt) },
    // Sagens egen frist. Kundens svarfrist står ved anmodningen.
    caseData.deadline && { label: t('Frist'), value: CW.fmtDate(caseData.deadline) },
  ].filter(Boolean);
  const text = caseData.unknown
    ? t('Sagen findes ikke i demoen. Den kan være slettet, eller linket kan være forkert.')
    : caseData.demo && sent
      ? wsFill(t('Anmodningen blev sendt {when}. Sagen afventer kunden. Kundens svar vises her, når det kommer; i demoen er det kun sag {live}, der har svar fra kunden.'), { when: CW.fmtWhen(req.sentAt), live: live.caseNr })
    : caseData.demo && req
      ? wsFill(t('Sagen blev oprettet i demoen {date}. Anmodningen til kunden er gemt som kladde og er ikke sendt. Materiale og memo kommer, når kunden har svaret.'), { date: caseData.createdAt ? CW.fmtDate(caseData.createdAt) : '' })
    : caseData.demo
      ? wsFill(t('Sagen blev oprettet i demoen {date}, men har endnu hverken materiale, anmodning eller memo. I en rigtig sag ville du fortsætte med at vurdere de offentlige data.'), { date: caseData.createdAt ? CW.fmtDate(caseData.createdAt) : '' })
      : sameCompany
        ? wsFill(t('Sag {nr} ({type}) er en separat sag for {name}. Demoen har kun data for sag {live}, så denne sag vises uden indhold og deler ikke tilstand med den.'), { nr: caseData.caseNr, type: t(caseData.type || ''), name: caseData.name, live: live.caseNr })
        : wsFill(t('Demoen har kun data for {company}. Sag {nr} for {name} vises derfor uden indhold, så du ikke ser en anden virksomheds tal under dette sagsnummer.'), { company: DATA.COMPANY.name, nr: caseData.caseNr, name: caseData.name });
  return (
    <div className="page" style={{ maxWidth: 720, padding: '56px 32px 80px' }}>
      <div className="card" style={{ padding: '36px 32px', textAlign: 'center' }}>
        <h2 id="ws-demo-title" tabIndex={-1} style={{ fontSize: 18, fontWeight: 600, color: 'var(--c-ink)', margin: 0, outline: 'none' }}>
          {caseData.unknown ? t('Sagen findes ikke') : sent ? t('Anmodningen er sendt, sagen afventer kunden') : caseData.demo && req ? t('Sagen er oprettet, og anmodningen er gemt') : caseData.demo ? t('Sagen er oprettet, men ikke udfyldt') : t('Denne sag er ikke udfyldt i demoen')}
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--c-text-2)', lineHeight: 1.55, margin: '8px auto 0', maxWidth: 520 }}>{text}</p>
        {facts.length > 0 && (
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(' + Math.min(3, facts.length) + ', minmax(0, 1fr))', gap: 0, margin: '20px auto 0', maxWidth: 560, border: '1px solid var(--c-line)', borderRadius: 8, overflow: 'hidden', textAlign: 'left' }}>
            {facts.map((f, i) => (
              <div key={f.label} style={{ padding: '9px 14px', borderLeft: i % 3 ? '1px solid var(--c-line-2)' : 'none', borderTop: i >= 3 ? '1px solid var(--c-line-2)' : 'none', minWidth: 0 }}>
                <dt style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{f.label}</dt>
                <dd className={f.mono ? 'mono' : ''} style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--c-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: f.wrap ? 'normal' : 'nowrap', lineHeight: 1.4 }}>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {req && (
          <div style={{ textAlign: 'left', maxWidth: 560, margin: '20px auto 0', border: '1px solid var(--c-line)', borderRadius: 8, padding: '12px 14px' }}>
            <div className="label-mini" style={{ marginBottom: 6 }}>{sent ? wsFill(t('Anmodning sendt {when}'), { when: CW.fmtWhen(req.sentAt) }) : t('Gemt anmodning, ikke sendt')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.5 }}>
              {req.to && (req.to.name || req.to.email) ? wsFill(t('Til {name}'), { name: [req.to.name, req.to.role ? t(req.to.role) : '', req.to.email].filter(Boolean).join(', ') }) : t('Modtager er ikke udfyldt')}
              {req.deadline ? ' · ' + wsFill(t('Svarfrist {date}'), { date: CW.fmtDate(req.deadline) }) : ''}
            </div>
            <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
              {reqItems.map(it => (
                <li key={it.id} style={{ padding: '6px 0', borderTop: '1px solid var(--c-line-2)', fontSize: 13, lineHeight: 1.45 }}>
                  <span style={{ fontWeight: 500, color: 'var(--c-ink)' }}>{t(it.label)}</span>
                  {it.tag === 'Valgfri' && <span style={{ color: 'var(--c-text-3)' }}> ({t('valgfri')})</span>}
                  {sent && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--c-text-3)' }}>{it.tag === 'Valgfri' ? t('Ikke modtaget, ikke påkrævet') : t('Afventer')}</span>}
                  {it.why && <span style={{ display: 'block', fontSize: 12, color: 'var(--c-text-3)' }}>{t('Hvorfor:')} {t(it.why)}</span>}
                </li>
              ))}
            </ul>
            {sent && <div style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginTop: 6 }}>{t('Kunden har ikke sendt noget endnu.')}</div>}
            {next && <div style={{ fontSize: 12.5, color: 'var(--c-ink)', fontWeight: 500, marginTop: 8 }}>{t('Næste')}: {t(next)}</div>}
            {mail && (
              <div style={{ marginTop: 10, border: '1px solid var(--c-line)', borderRadius: 8, background: 'var(--c-surface-2)', padding: 12, fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.5 }}>
                <div style={{ color: 'var(--c-ink)', fontWeight: 500 }}>{mail.subject} · {t('Sagsnr.')} {caseData.caseNr}</div>
                <div style={{ marginTop: 6, color: 'var(--c-ink)' }}>{mail.greeting}</div>
                <div style={{ marginTop: 4 }}>{mail.intro}</div>
                {mail.deadlineLine && <div style={{ marginTop: 6, color: 'var(--c-ink)' }}>{mail.deadlineLine}</div>}
                <div className="mono" style={{ marginTop: 6, fontSize: 11, color: 'var(--c-text-3)' }}>{mail.link}</div>
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          {req && (
            <>
              {!sent && (
                <button className="btn btn-primary" onClick={sendDemo}>
                  <I.Send className="ic"/> {t('Send anmodningen')}
                </button>
              )}
              <button className="btn" aria-expanded={showMail} onClick={() => setShowMail(v => !v)}>{showMail ? t('Skjul mailen') : t('Vis mailen')}</button>
            </>
          )}
          <button className={'btn' + (req && !sent ? '' : ' btn-primary')} onClick={() => go('workspace:' + live.id)}>
            {wsFill(t('Åbn sag {nr} for {company}'), { nr: live.caseNr, company: DATA.COMPANY.name })} <I.ArrowRight className="ic"/>
          </button>
          <button className="btn" onClick={() => (goBack ? goBack() : go('cases'))}>{back ? wsFill(t('Tilbage til {page}'), { page: t(back.label) }) : t('Tilbage til Mine opgaver')}</button>
        </div>
      </div>
    </div>
  );
}

function WSOverview({ go, caseId, caseData, stage }) {
  CW.useCase();
  const request = CW.request();
  const submitted = !!CW.caseState().submittedAt;
  const editing = wsIsEditing();
  // Dialogen står altid på Overblik, så rådgiveren også kan skrive i vurderingsfasen
  const showDialog = true;
  // Venter kunden på et svar fra rådgiveren, står dialogen før Udestående
  // Venter kunden på et svar, står dialogen først. Den bliver stående, efter at
  // rådgiveren har svaret, så feltet ikke hopper væk midt i skrivningen.
  const waitsOnAdvisor = showDialog && typeof CW.conversationWaitsOn === 'function' && CW.conversationWaitsOn() === 'rådgiver';
  const [dialogPinned, setDialogPinned] = React.useState(waitsOnAdvisor);
  React.useEffect(() => { if (waitsOnAdvisor) setDialogPinned(true); }, [waitsOnAdvisor]);
  const dialogFirst = showDialog && (waitsOnAdvisor || dialogPinned);

  // Rul til det afsnit, sagshovedet eller en anden fane bad om. Kommer man fra
  // Virksomheden ("anmod om materiale"), rulles til materialevalget.
  // Kommer man tilbage fra en kilde under Dokumenter, rulles til det sted,
  // man kom fra ('kabul:ws-focus').
  React.useEffect(() => {
    let target = wsPendingFocus;
    wsPendingFocus = null;
    try {
      if (sessionStorage.getItem('kabul:focus-material') === '1') {
        sessionStorage.removeItem('kabul:focus-material');
        target = 'ws-material';
      }
      const back = sessionStorage.getItem('kabul:ws-focus');
      if (back) { sessionStorage.removeItem('kabul:ws-focus'); target = back; }
    } catch (e) {}
    if (!target) return;
    const id = setTimeout(() => wsScrollTo(target), 80);
    return () => clearTimeout(id);
  }, []);

  const backToOutstanding = () => {
    wsSetEditing(false);
    setTimeout(() => wsScrollTo('ws-outstanding'), 60);
    CW.focusSoon('#ws-outstanding-title');
  };

  // Materialevalget vises som modal. Lukkes den uden at sende, huskes kladden.
  const matShown = stage === 'material-selection' || editing;
  const [matClosed, setMatClosed] = React.useState(false);
  const [sentInfo, setSentInfo] = React.useState(null);
  React.useEffect(() => { if (matShown) setMatClosed(false); }, [matShown, editing]);
  // Fortrydes afsendelsen, mens kvitteringen står i modalen, er den ikke sand længere
  React.useEffect(() => { if (!request && sentInfo) setSentInfo(null); }, [!!request]);
  // Lukkes en anmodning, der ikke er sendt, går sagen tilbage til vurderingen.
  // Kladden er gemt, så "Anmod om materiale" åbner den igen med de samme valg.
  const closeMaterial = () => {
    if (editing) wsSetEditing(false);   // lukker bare vinduet; siden ruller ikke
    else if (stage === 'material-selection' && !request) { CW.requestStage('review-public'); CW.focusSoon('#ws-hero-title'); }
    else setMatClosed(true);
  };
  React.useEffect(() => {
    const open = () => setMatClosed(false);
    window.addEventListener('cw-open-material', open);
    return () => window.removeEventListener('cw-open-material', open);
  }, []);

  return (
    <div className="page page-wide" style={{ maxWidth: 1080, padding: '24px 32px 80px' }}>
      {/* Fasekortet: hvor sagen står, og næste skridt (én primær knap) */}
      <StageHero stage={stage} go={go} caseId={caseId}/>

      {stage === 'declined' && <DeclinedBlock/>}

      {/* Materialevalg som modal. En opdatering af en sendt anmodning er en kladde,
          mens sagen bliver i sin fase (Afventer kunden eller Klar). Lukkes modalen
          uden at sende, står kladden som en linje på siden og kan åbnes igen. */}
      {((matShown && !matClosed) || sentInfo) && (
        <WSMaterialModal key={sentInfo ? 'sent' : 'edit'} caseData={caseData} request={request} editing={editing} sent={sentInfo}
          onSent={setSentInfo}
          onClose={() => { if (sentInfo) { setSentInfo(null); setMatClosed(false); } else closeMaterial(); }}/>
      )}

      {dialogFirst && <div style={{ marginTop: 24 }}><CustomerDialog/></div>}

      {/* Det, der kræver handling: til gennemgang og det, kunden mangler */}
      <WSOutstandingCard locked={submitted || stage === 'declined'} caseData={caseData}/>

      {/* Det, sagen har: offentlige data og det godkendte fra kunden */}
      <WSMaterialCard go={go} caseId={caseId} locked={submitted || stage === 'declined'}/>

      {showDialog && !dialogFirst && <CustomerDialog/>}

      {/* Hvad er der sket */}
      <div style={{ marginTop: 16 }}>
        <WSActivity/>
      </div>
    </div>
  );
}

/**
 * Fasekortet på Overblik: én titel, én sætning, præcis én primær knap og
 * højst én ghost-knap. Afslag ligger i sagshovedets "…"-menu. Under kortet
 * står trinene med resultat og dato på de færdige trin.
 */
function StageHero({ stage, go, caseId }) {
  CW.useCase();
  const cs = CW.caseState();
  const submitted = !!cs.submittedAt;
  const request = CW.request();
  const p = CW.progress();
  const toReview = p.toReview;                 // leveret eller forklaret, ikke gennemgået
  // Påkrævede punkter, der stadig mangler fra kunden (valgfrie tæller ikke)
  const missing = p.requiredMissing != null ? p.requiredMissing : p.missing;
  const m = wsMemoStatus();
  const submitReady = wsSubmitReady();

  // "Gå direkte til memo" er en modal med en påkrævet begrundelse
  const [skipping, setSkipping] = React.useState(false);
  const [declining, setDeclining] = React.useState(false);
  React.useEffect(() => { setSkipping(false); setDeclining(false); }, [stage]);
  let ghost2 = null;

  const toMaterial = () => wsRequestMore(() => { setTimeout(() => wsScrollTo('ws-material'), 80); CW.focusSoon('#ws-material-title'); });
  const toMemo = () => go && go("workspace:" + caseId + (submitReady ? ":indstil" : ":memo"));
  const memoLabel = submitReady ? t('Indstil til kreditkomité') : t('Fortsæt til memo');
  const toOutstanding = (sel) => { setTimeout(() => wsScrollTo('ws-outstanding'), 60); CW.focusSoon(sel || '#ws-outstanding-title'); };

  // Trinene. Den aktive fase afgør, hvilke trin der er gjort.
  const skipped = (stage === 'ready-skip' || (submitted && !!cs.skipReason)) && !request;
  const ORDER = ['public', 'decision', 'material', 'customer', 'memo'];
  const AT = { 'review-public': 'decision', 'material-selection': 'material', 'awaiting-customer': 'customer', ready: 'memo', 'ready-skip': 'memo' };
  const stepState = (k) => {
    const i = ORDER.indexOf(k);
    if (skipped && (k === 'material' || k === 'customer')) return 'skipped';
    if (submitted) return 'done';
    if (stage === 'declined') {
      const from = ORDER.indexOf(AT[cs.declinedFrom] || 'decision');
      return i < from ? 'done' : i === from ? 'declined' : 'pending';
    }
    const at = ORDER.indexOf(AT[stage] || 'decision');
    return i < at ? 'done' : i === at ? 'active' : 'pending';
  };
  // Seneste hændelse af en type (til datoen på et færdigt trin)
  const lastAt = (pred) => { const e = CW.activity().filter(pred).slice(-1)[0]; return e ? e.at : null; };
  const withDay = (text, iso) => (iso ? text + ' · ' + wsDay(iso) : text);
  // Underlinje kun på færdige trin (resultat og dato) og på det aktive trin
  const subOf = (k, state) => {
    if (state === 'declined') return t('Afslået her');
    if (state === 'skipped') return t('Sprunget over');
    if (k === 'public') return t('Hentet') + ' ' + wsPublicDataDate();
    if (k === 'decision') {
      if (state !== 'done') return '';
      const moved = lastAt(e => e.who === 'rådgiver' && (e.type === 'stage' || e.type === 'request-sent'));
      return withDay(cs.skipReason ? t('Direkte til memo') : t('Sagen fortsætter'), moved);
    }
    if (k === 'material') {
      if (state === 'done') return request ? wsSentText(request, true) : '';
      if (state === 'active') return wsPlural(CW.draftItems().length, t('1 punkt valgt'), t('{n} punkter valgt'));
      return '';
    }
    if (k === 'customer') {
      if (state === 'done') return p.required === 0 ? t('Intet påkrævet') : withDay(t('Godkendt'), lastAt(e => e.type === 'approved'));
      if (state === 'active') return toReview > 0 ? wsFill(t('{n} til gennemgang'), { n: toReview }) : missing ? wsFill(t('{n} mangler'), { n: missing }) : '';
      return '';
    }
    if (k === 'memo') {
      if (wsCopilot()) {
        const h = cs.handoff;
        return state === 'active' && h && h.at ? withDay(t('Materialet er hentet'), h.at) : '';
      }
      if (submitted) return wsFill(t('Indstillet {date}'), { date: wsDay(cs.submittedAt) });
      if (state === 'active' && m) return wsFill(t('{a} af {n} afsnit gennemgået'), { a: wsMemoReviewed(m), n: m.sectionsTotal });
      return '';
    }
    return '';
  };
  const PROCESS = [
    { k: 'public', label: t('Offentlige data') },
    { k: 'decision', label: t('Vurdering') },
    { k: 'material', label: t('Materialevalg') },
    { k: 'customer', label: t('Kunden') },
    { k: 'memo', label: wsCopilot() ? t('Credit memo') : t('Memo og indstilling') },
  ].map(s => { const status = stepState(s.k); return { ...s, status, sub: subOf(s.k, status) }; });

  // Fasens titel, sætning og knapper
  let title, body, primary = null, ghost = null;
  if (submitted) {
    const last = (cs.history || []).filter(h => h.type === 'submitted').slice(-1)[0];
    title = t("Sagen er indstillet til kreditkomitéen");
    body = wsFill(t('Version {v} blev indstillet {when} af {who}. Memoet er låst. Træk indstillingen tilbage, hvis du skal ændre noget.'), { v: cs.submitVersion || 1, when: wsDay(cs.submittedAt), who: (last && last.by) || wsAdvisor().name });
    primary = <WSHeroPrimary label={t('Se indstilling')} arrow onClick={() => go && go("workspace:" + caseId + ":indstil")}/>;
    ghost = <WSHeroGhost label={t('Træk indstilling tilbage')} onClick={wsWithdraw}/>;
  } else if (stage === 'declined') {
    const d = cs.decline || {};
    const from = wsPhaseName(cs.declinedFrom || 'review-public');
    title = t("Sagen er afslået");
    body = d.reason
      ? wsFill(t('Du gav afslag {when} i fasen {stage} med årsagen "{reason}". Genoptager du sagen, vender den tilbage til {stage}.'), { when: wsDay(d.at), reason: t(d.reason), stage: from })
      : t("Du har valgt at give afslag på det offentlige grundlag. Du kan genoptage sagen, hvis du har skiftet vurdering.");
    primary = <WSHeroPrimary label={t('Genoptag sag')} onClick={wsReopen}/>;
  } else if (stage === 'review-public') {
    title = t("Offentlige data er hentet");
    body = t("Se tallene under Virksomheden, og vælg om sagen skal fortsætte.");
    primary = <WSHeroPrimary label={t('Anmod om materiale')} arrow onClick={toMaterial}/>;
    ghost = <WSHeroGhost id="ws-hero-skip" label={t('Gå direkte til memo')} onClick={() => setSkipping(true)}/>;
    ghost2 = <WSHeroGhost id="ws-hero-decline" label={t('Giv afslag')} onClick={() => setDeclining(true)}/>;
  } else if (stage === 'ready-skip') {
    title = t("Kundeinput er sprunget over");
    body = (cs.skipReason ? wsFill(t('Du gik direkte til memo med begrundelsen "{reason}".'), { reason: cs.skipReason }) + ' ' : '')
      + (submitReady ? t('Memoet er gennemgået. Sagen kan indstilles.') : (wsCopilot() ? t('Næste skridt er memoet. Hent sagens materiale, og skriv memoet i Word med Copilot.') : t('Næste skridt er memoet.')));
    primary = <WSHeroPrimary label={memoLabel} arrow onClick={toMemo}/>;
    ghost = <WSHeroGhost label={t('Anmod om materiale')} onClick={toMaterial}/>;
  } else if (stage === 'material-selection') {
    title = request ? t('Opdateringen er ikke sendt') : t('Anmodningen er ikke sendt');
    body = wsPlural(CW.draftItems().length, t('1 punkt valgt. Kladden er gemt.'), t('{n} punkter valgt. Kladden er gemt.'));
    primary = <WSHeroPrimary label={t('Åbn anmodningen')} onClick={() => window.dispatchEvent(new CustomEvent('cw-open-material'))}/>;
    ghost = <WSHeroGhost label={request ? t('Tilbage til udestående') : t('Tilbage til vurdering')} onClick={() => CW.requestStage(request ? 'awaiting-customer' : 'review-public')}/>;
  } else if (stage === 'awaiting-customer') {
    const deadline = request && request.deadline ? wsDot(wsFill(t('Svarfrist {date}.'), { date: wsDay(request.deadline) })) : '';
    if (toReview > 0) {
      title = wsPlural(toReview, t('1 punkt venter på din gennemgang'), t('{n} punkter venter på din gennemgang'));
      body = '';   // ingen underoverskrift: det, der mangler, og svarfristen står i listen nedenfor
      primary = <WSHeroPrimary label={t('Gennemgå materiale')} onClick={() => toOutstanding(wsFirstToReviewSel())}/>;
    } else if (wsMaterialReady(p)) {
      title = t('Materialet er godkendt');
      body = t('Markér sagen som klar for at fortsætte til memoet.');
      primary = <WSHeroPrimary label={t('Markér som klar')} onClick={() => CW.requestStage('ready')}/>;
    } else {
      const to = request && request.to ? request.to.name || request.to.email : '';
      title = missing ? wsPlural(missing, t('1 punkt mangler fra kunden'), t('{n} punkter mangler fra kunden')) : t('Anmodningen er sendt');
      body = request
        ? wsFill(t('Sendt {when} til {to}.'), { when: wsDay(request.firstSentAt || request.sentAt), to: to || t('kunden') }) + (deadline ? ' ' + deadline : '')
        : t('Anmodningen er ikke sendt endnu.');
      primary = <WSHeroPrimary label={t('Se udestående')} onClick={() => toOutstanding()}/>;
    }
    ghost = <WSHeroGhost label={t('Anmod om mere materiale')} onClick={toMaterial}/>;
  } else { // ready
    title = p.required === 0 ? t('Intet påkrævet materiale udestår') : t("Materialet er godkendt");
    body = submitReady ? t('Memoet er gennemgået. Sagen kan indstilles.') : (wsCopilot() ? t('Næste skridt er memoet. Hent sagens materiale, og skriv memoet i Word med Copilot.') : t('Næste skridt er memoet.'));
    primary = <WSHeroPrimary label={memoLabel} arrow onClick={toMemo}/>;
    ghost = <WSHeroGhost label={t('Anmod om mere materiale')} onClick={toMaterial}/>;
  }

  return (
    <section id="ws-hero" className="card" aria-labelledby="ws-hero-title" style={{ marginBottom: 16, overflow: 'hidden', scrollMarginTop: 16 }}>
      <div style={{ padding: '20px 26px 18px' }}>
        <h2 id="ws-hero-title" tabIndex={-1} style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em', outline: 'none' }}>{title}</h2>
        {body && <p style={{ fontSize: 13.5, color: 'var(--c-text-2)', margin: '4px 0 0', lineHeight: 1.55, maxWidth: 640 }}>{body}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {primary}{ghost}{ghost2}
        </div>
      </div>
      {declining && <WSDeclineDialog onClose={() => setDeclining(false)} returnFocus="#ws-hero-decline"/>}

      {/* Sagens trin */}
      <div style={{ background: 'var(--c-surface-2)', borderTop: '1px solid var(--c-line)', position: 'relative' }}>
        <div aria-hidden="true" style={{ position: 'absolute', top: 30, left: '10%', right: '10%', height: 1, background: 'var(--c-line-strong)' }}/>
        <ol style={{ display: 'flex', position: 'relative', listStyle: 'none', margin: 0, padding: 0 }} aria-label={t('Sagens trin')}>
          {PROCESS.map(s => {
            const isDone = s.status === 'done';
            const isActive = s.status === 'active';
            const isSkipped = s.status === 'skipped';
            const isDeclined = s.status === 'declined';
            const ring = isDone ? 'var(--c-success)' : isDeclined ? 'var(--c-danger)' : isActive ? 'var(--c-primary)' : 'var(--c-line-strong)';
            return (
              <li key={s.k} aria-current={isActive || isDeclined ? 'step' : undefined} title={s.sub || undefined} style={{ flex: 1, padding: '14px 14px 18px', textAlign: 'center', position: 'relative', opacity: isSkipped ? 0.55 : 1 }}>
                <div aria-hidden="true" style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: isDone ? 'var(--c-success)' : '#fff',
                  border: isSkipped ? '2px dashed var(--c-line-strong)' : '2px solid ' + ring,
                  margin: '0 auto', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 1,
                }}>
                  {isDone
                    ? <I.Check size={12} style={{ color: '#fff' }}/>
                    : isDeclined
                      ? <I.X size={12} style={{ color: 'var(--c-danger)' }}/>
                      : isActive
                        ? <span style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: 'var(--c-primary)' }}/>
                        : null}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, color: isSkipped || s.status === 'pending' ? 'var(--c-text-3)' : 'var(--c-ink)' }}>{s.label}</div>
              </li>
            );
          })}
        </ol>
      </div>
      {skipping && <WSSkipDialog go={go} caseId={caseId} onClose={() => setSkipping(false)}/>}
    </section>
  );
}

// Fasekortets knapper (på modulniveau, så de ikke tegnes forfra og mister fokus)
function WSHeroPrimary({ label, onClick, arrow }) {
  return <button type="button" className="btn btn-primary" onClick={onClick}>{label}{arrow && <> <I.ArrowRight className="ic"/></>}</button>;
}
function WSHeroGhost({ label, onClick, id }) {
  return <button type="button" id={id} className="btn btn-ghost" onClick={onClick}>{label}</button>;
}

/* "Gå direkte til memo" som modal, bygget som Anmod om materiale: titel, én
   sætning, feltet og en footer med én primær knap. */
function WSSkipDialog({ go, caseId, onClose }) {
  const ref = React.useRef(null);
  const busy = React.useRef(false);
  const [reason, setReason] = React.useState('');
  const [tried, setTried] = React.useState(false);
  // Annullér, Esc og klik udenfor: fokus tilbage på knappen, der åbnede dialogen
  const cancel = () => { onClose(); CW.focusSoon(document.getElementById('ws-hero-skip') ? '#ws-hero-skip' : '#ws-hero-title'); };
  CW.useDialog(ref, true, cancel);
  // Fokus i feltet (useDialog sætter ellers fokus på den første knap)
  React.useEffect(() => { CW.focusSoon('#ws-skip-reason'); }, []);
  const ok = reason.trim().length > 0;
  const submit = (e) => {
    e && e.preventDefault();
    setTried(true);
    // Dobbeltklik starter ikke to faseskift
    if (!ok || busy.current) return;
    busy.current = true;
    const r = reason.trim();
    const skip = typeof CW.skipCustomer === 'function'
      ? CW.skipCustomer(r)
      : CW.requestStage('ready-skip').then(done => { if (done) CW.setCaseState({ skipReason: r }); return done; });
    skip.then(done => {
      busy.current = false;
      if (!done) return;
      onClose();
      go && go("workspace:" + caseId + ":memo");
    });
  };
  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) cancel(); }}>
      <form ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby="ws-skip-title" aria-describedby="ws-skip-text" onSubmit={submit}
        style={{ width: 520, maxWidth: 'calc(100vw - 32px)' }}>
        <div className="modal-head" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="ws-skip-title" className="modal-title" style={{ margin: 0 }}>{t('Gå direkte til memo')}</h2>
            <div id="ws-skip-text" style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.5 }}>{t('Kunden bliver ikke bedt om materiale. Skriv kort hvorfor. Begrundelsen kommer med i indstillingen.')}</div>
          </div>
          <button type="button" className="icon-btn" aria-label={t('Luk')} title={t('Luk')} onClick={cancel}><I.X size={15}/></button>
        </div>
        <div className="modal-body" style={{ padding: '16px 22px' }}>
          <div className="field">
            <label htmlFor="ws-skip-reason">{t('Begrundelse')}</label>
            <textarea id="ws-skip-reason" className="input" rows={3} value={reason} autoFocus onChange={e => setReason(e.target.value)}
              aria-invalid={tried && !ok ? true : undefined} aria-describedby="ws-skip-msg"
              placeholder={t('Fx: Kunden har allerede sendt årsrapport og periodetal i forbindelse med bankens ansøgning.')}
              style={{ height: 'auto', padding: '8px 10px', resize: 'vertical', lineHeight: 1.45, fontFamily: 'inherit' }}/>
          </div>
        </div>
        <div className="modal-foot" style={{ alignItems: 'center', background: 'var(--c-surface)' }}>
          <span id="ws-skip-msg" role={tried && !ok ? 'alert' : undefined} style={{ flex: 1, fontSize: 12.5, color: 'var(--c-danger)' }}>{tried && !ok ? t('Skriv en kort begrundelse.') : ''}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={cancel}>{t('Annullér')}</button>
          <button type="submit" id="ws-skip-go" className="btn btn-sm btn-primary" aria-disabled={!ok} style={wsOff(!ok)}>{t('Gå til memo')}</button>
        </div>
      </form>
    </div>
  );
}

// "Alle 5 påkrævede punkter er godkendt. 1 valgfrit punkt er ikke modtaget og er ikke påkrævet."
function wsMaterialSummary(p) {
  p = p || CW.progress();
  if (p.allApproved) return wsFill(t('Alle {n} punkter er modtaget og godkendt.'), { n: p.total });
  const st = CW.items();
  const optOpen = CW.requestedItems().filter(it => it.tag === 'Valgfri' && !(st[it.id] && ['approved', 'received', 'noted'].indexOf(st[it.id].status) >= 0)).length;
  const req = p.required === 0 ? t('Anmodningen har ingen påkrævede punkter.')
    : wsPlural(p.required, t('Det påkrævede punkt er godkendt.'), t('Alle {n} påkrævede punkter er godkendt.'));
  return req + (optOpen ? ' ' + wsPlural(optOpen, t('1 valgfrit punkt er ikke modtaget og er ikke påkrævet.'), t('{n} valgfrie punkter er ikke modtaget og er ikke påkrævet.')) : '');
}

/* ─────────────────────────────────────────────────────────────────────────
   Beslutningsgrundlag i vurderingsfasen. Alt kommer fra sagens faktaark
   (window.CASE_FACTS) med kilde. Felter kan være tomme, mens arket udfyldes.
   ──────────────────────────────────────────────────────────────────────── */
// Sidehenvisning på det aktive sprog: "s. 3" bliver "p. 3" på engelsk
function wsRef(ref) {
  const r = t(String(ref || ''));
  return window.CW_LANG === 'en' ? r.replace(/^s\. /, 'p. ').replace(/^ark /, 'sheet ').replace(/^linje /, 'line ') : r;
}
function WSSourceLink({ source, go, caseId, back }) {
  if (window.CW_SOURCE_VIEW !== true || !source || !source.doc) return null;
  const name = wsDocName(source.doc);
  const label = name + (source.ref ? ' · ' + wsRef(source.ref) : '');
  return (
    <button type="button" onClick={() => wsOpenDoc(source, go, caseId, back)} aria-label={wsFill(t('Åbn kilden {doc}'), { doc: label })}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%', padding: '1px 7px', border: '1px solid var(--c-primary-border)', borderRadius: 999, background: 'var(--c-primary-bg)', color: 'var(--c-primary)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.6, verticalAlign: 'middle' }}>
      <I.FileText size={10} aria-hidden="true"/>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Seneste aktivitet (fra CW.activity). Kun tekst og "Navn · dato".
   Faseskift står i trinene og gentages ikke her.
   ──────────────────────────────────────────────────────────────────────── */
function wsWhoName(who) {
  if (who === 'kunde') return (CW.request() && CW.request().to && CW.request().to.name) || (DATA.REQUEST_RECIPIENT || {}).name || t('Kunden');
  if (who === 'rådgiver') return wsAdvisor().name;
  return 'Crediwire';
}

// En opdatering uden nye punkter sendes ikke som mail; loggen siger det
function wsActivityText(e) {
  if (e.type === 'request-updated' && e.data && !(e.data.added || []).length) {
    const rem = (e.data.removed || []).map(id => { const it = CW.itemById(id); return it ? t(it.label) : id; });
    return t('Anmodningen er ændret uden mail til kunden') + (rem.length ? ': ' + t('fjernet') + ' ' + rem.join(', ') : '');
  }
  return e.text;
}

function WSActivity() {
  CW.useCase();
  const [all, setAll] = React.useState(false);
  // Beskeder står i "Dialog med kunden", og faseskift står i trinene
  const list = CW.activity().filter(e => e.type !== 'question' && e.type !== 'reply' && e.type !== 'stage').reverse();
  const shown = list.slice(0, all ? 30 : 5);
  return (
    <section className="card" aria-labelledby="ws-activity-title" style={{ padding: '14px 18px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <I.Clock size={14} aria-hidden="true" style={{ color: 'var(--c-text-2)' }}/>
        <h2 id="ws-activity-title" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', flex: 1 }}>{t('Seneste aktivitet')}</h2>
        {list.length > 5 && <button type="button" className="btn-ghost-sm" aria-expanded={all} onClick={() => setAll(a => !a)}>{all ? t('Vis færre') : wsFill(t('Vis alle ({n})'), { n: Math.min(list.length, 30) })}</button>}
      </div>
      {list.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--c-text-3)', padding: '6px 0 8px' }}>{t('Intet endnu.')}</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {shown.map(e => (
            <li key={e.id} style={{ padding: '8px 0', borderTop: '1px solid var(--c-line-2)' }}>
              <div style={{ fontSize: 13, color: 'var(--c-ink)', lineHeight: 1.45 }}>{wsActivityText(e)}</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 1 }} title={CW.fmtWhen(e.at)}>{(e.data && e.data.actor) || wsWhoName(e.who)} · {wsDay(e.at)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Virksomhed og facilitet: sagens rammer (produkt og beløb, som de blev
   indtastet, da sagen blev oprettet) og stamdata fra CVR i ét kort. De
   offentlige kilder står i kortet Materiale på sagen (WSMaterialCard).
   ──────────────────────────────────────────────────────────────────────── */
const AUTO_SOURCES = [
  { src: "CVR-registret", what: "Selskab, vedtægter, bestyrelse", reports: true },
  // docs: Crediwires egne eksporter (financials.jsx, CW_EXPORT_DOCS), som kan hentes ligesom årsrapporterne
  { src: "Branche­opslag", what: "Markedsdata", docs: [{ name: 'Produkt_marked_og_branche.pdf', label: 'Produkt, marked og branche' }] },
  { src: "Bløde signaler", what: "Trustpilot, hjemmeside, presse, virksomhedsbeskrivelser", docs: [{ name: 'Trustpilot.pdf', label: 'Trustpilot' }] },
];

// Dagen de offentlige data blev hentet (sagens tidslinje i data.js), samme dato som stamdata
function wsPublicDataDate() {
  try { return DATA.fmt.longDate(DATA.caseTimeline(CW.LIVE_CASE_ID).publicDataAt) || DATA.COMPANY.masterDataUpdated || ''; } catch (e) { return DATA.COMPANY.masterDataUpdated || ''; }
}

// "hentet 30. sep.": dagen de offentlige data blev hentet, kort form
function wsPublicDataDay() {
  try { const at = DATA.caseTimeline(CW.LIVE_CASE_ID).publicDataAt; if (at) return wsDay(at); } catch (e) {}
  return wsPublicDataDate();
}

// De tre offentlige kilder. CVR-registret har årsrapporterne, som kan åbnes under Dokumenter.
function WSPublicSources({ go, caseId }) {
  const reportDoc = (y) => (window.CASE_DOCS || []).find(d => d.type === 'Årsrapport' && String(d.year) === String(y));
  const reports = ((DATA.FINANCIALS && DATA.FINANCIALS.years) || []).filter(y => /^\d{4}$/.test(y));
  const back = { route: 'workspace:' + caseId, anchor: 'ws-received', label: t('Tilbage til sagen') };
  const fetched = wsFill(t('hentet {date}'), { date: wsPublicDataDay() });
  return (
    <div>
      {AUTO_SOURCES.map((x, i) => (
        <div key={i} className="cw-row">
          <div className="cw-row-main">
            <span className="cw-row-title">{t(x.src)}</span>
            <span className="cw-row-meta">{t(x.what)} · <span style={{ color: 'var(--c-text-3)' }}>{fetched}</span></span>
            {(() => {
              // Årsrapporterne fra CVR, eller kildens egne dokumenter (eksporterne)
              const items = x.reports
                ? reports.map(y => ({ key: y, label: t('Årsrapport') + ' ' + y, doc: reportDoc(y) }))
                : (x.docs || []).map(o => ({ key: o.name, label: t(o.label), doc: (window.CASE_DOCS || []).concat(window.CW_EXPORT_DOCS || []).find(d => d.name === o.name) }));
              if (!items.length) return null;
              return (
                <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0 }}>
                  {items.map(it => {
                    const d = it.doc;
                    const url = d && d.fileId ? CW.fileUrl(d.fileId) : null;
                    // Slettet under Dokumenter (fx forkert årsrapport): navnet står, men uden link
                    if (d && CW.isDocRemoved(d.name)) return (
                      <li key={it.key} className="ws-req-file" style={{ fontSize: 13, padding: '2px 0', gap: 10, color: 'var(--c-text-3)' }}>
                        <I.FileText size={12} aria-hidden="true" style={{ flexShrink: 0 }}/>
                        <span><s>{it.label}</s> · {t('slettet')}</span>
                      </li>
                    );
                    return (
                      <li key={it.key} className="ws-req-file" style={{ fontSize: 13, padding: '2px 0', gap: 10 }}>
                        <I.FileText size={12} aria-hidden="true" style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
                        {url ? <a className="btn-link" href={url} download={d.name} title={t('Download')}>{it.label}</a>
                          : d ? <button type="button" className="btn-link" title={t('Download')} onClick={() => CW.downloadDoc(d.name)}>{it.label}</button>
                          : <span>{it.label}</span>}
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </div>
          <span/>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Afslag: årsag og dato står i fasekortet. Noten kan rettes bagefter.
   ──────────────────────────────────────────────────────────────────────── */
function DeclinedBlock() {
  CW.useCase();
  const d = CW.caseState().decline || {};
  const [note, setNote] = React.useState(d.note || '');
  const [saved, setSaved] = React.useState(false);
  const unchanged = note.trim() === (d.note || '');
  const save = () => {
    if (unchanged) return;
    CW.setCaseState({ decline: { ...(CW.caseState().decline || {}), note: note.trim() } });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div className="field">
        <label htmlFor="ws-decline-note-edit">{t('Afslagsnote')}</label>
        <textarea
          id="ws-decline-note-edit"
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("Begrund afslaget, fx 'For høj gældsgrad i forhold til EBITDA og uafklarede ejerforhold.'")}
          rows={4}
          style={{ height: 'auto', resize: 'vertical', padding: '10px 12px', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm" onClick={save} aria-disabled={unchanged} style={wsOff(unchanged && !saved)}>
          {saved ? <>{t('Gemt')} <I.Check className="ic"/></> : t('Gem note')}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Materialevalg og kundeanmodning

   Vælgeren er kladden (CW.selection). Kunden ser kun den sendte anmodning
   (CW.request), indtil rådgiveren trykker "Anmod om materiale" første gang
   eller "Send opdatering" bagefter. En opdatering mailer kun de nye punkter.
   ──────────────────────────────────────────────────────────────────────── */
// Mailkladden gemmes i CW.draft. message er null, så længe rådgiveren ikke har
// rettet i standardteksten (så den følger sproget).
const WS_DRAFT_V = 3;
function wsTodayIso() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function wsCaseDeadline(caseData) { return (caseData && caseData.deadline) || DATA.COMPANY.deadlineISO || null; }
function wsDraft(caseData) {
  const r = DATA.REQUEST_RECIPIENT || {};
  // Standardfristen er 7 hverdage, men aldrig efter sagens egen frist
  let deadline = CW.workdaysFromNow(7);
  const cd = wsCaseDeadline(caseData);
  if (cd && cd < deadline && !CW.isPast(cd)) deadline = cd;
  const base = { v: WS_DRAFT_V, name: r.name || '', role: (r.role || '').split(',')[0].trim(), email: r.email || '', deadline, message: null, notifyRemoved: true };
  const d = CW.draft();
  if (!d) return base;
  const out = { ...base, name: d.name != null ? d.name : base.name, role: d.role != null ? d.role : base.role, email: d.email != null ? d.email : base.email };
  if (d.v === WS_DRAFT_V) { out.deadline = d.deadline != null ? d.deadline : base.deadline; out.message = d.message != null ? d.message : null; out.subject = d.subject != null ? d.subject : null; out.body = d.body != null ? d.body : null; out.notifyRemoved = d.notifyRemoved !== false; }
  return out;
}
function wsSetDraft(patch, caseData) { CW.setDraft({ ...wsDraft(caseData), ...patch, v: WS_DRAFT_V }); }

/** Kan kladden sendes? { draft, error, warning, diff, request, count } */
function wsDraftCheck(caseData) {
  const draft = wsDraft(caseData);
  const request = CW.request();
  const count = CW.draftItems().length;
  const diff = CW.draftDiff();
  const emailOk = /^[^@ ]+@[^@ ]+\.[^@ ]+$/.test(draft.email.trim());
  const cd = wsCaseDeadline(caseData);
  const past = !!draft.deadline && CW.isPast(draft.deadline);
  const late = !!draft.deadline && !!cd && draft.deadline > cd;
  const nothing = !!request && !diff && draft.deadline === request.deadline;
  const error = count === 0 ? t('Vælg mindst ét punkt.')
    : !draft.name.trim() ? t('Udfyld modtagerens navn.')
    : !emailOk ? t('Udfyld en gyldig mailadresse.')
    : !draft.deadline ? t('Vælg en svarfrist.')
    : past ? t('Svarfristen ligger i fortiden. Vælg i dag eller en senere dato.')
    : nothing ? t('Der er ingen ændringer at sende.')
    : null;
  const warning = late ? wsFill(t('Svarfristen ligger efter sagens frist {date}. Kunden kan nå at svare for sent.'), { date: CW.fmtDate(cd) }) : null;
  // En opdatering, der ikke efterlader nogen påkrævede punkter, kræver en bekræftelse
  const noRequired = !!request && count > 0 && !CW.draftItems().some(it => it.tag !== 'Valgfri');
  return { draft, error, warning, diff, request, count, past, noRequired };
}

/** Send kladden. Første gang: "Send anmodning". Bagefter: "Send opdatering". */
function wsSendRequest(caseData, onInvalid) {
  const c = wsDraftCheck(caseData);
  if (c.error) { CW.toast(c.error, { tone: 'warn' }); onInvalid && onInvalid(); return false; }
  if (c.noRequired) {
    CW.confirm({
      title: t('Ingen påkrævede punkter tilbage'),
      text: t('Opdateringen fjerner alle påkrævede punkter, så kunden kun bliver bedt om valgfrit materiale. Sagen går derefter videre uden mere påkrævet materiale fra kunden, og det står i sagens historik. Vil du sende den alligevel?'),
      confirmLabel: t('Send alligevel'),
    }).then(r => { if (r.ok) wsDoSend(c, caseData); });
    return true;
  }
  return wsDoSend(c, caseData);
}
function wsDoSend(c, caseData) {
  const to = { name: c.draft.name.trim(), role: c.draft.role.trim(), email: c.draft.email.trim() };
  const first = !c.request;
  const added = c.diff ? c.diff.added.length : 0;
  const removedN = c.diff ? c.diff.removed.filter(it => !CW.isReceived(it.id)).length : 0;
  const notifyRemoved = c.draft.notifyRemoved !== false;
  const noMail = !first && added === 0 && !(removedN > 0 && notifyRemoved);
  const prevRequest = c.request ? JSON.parse(JSON.stringify(c.request)) : null;
  CW.sendRequest({ deadline: c.draft.deadline, to, noMail, notifyRemoved });
  wsSetDraft({ deadline: c.draft.deadline, message: null }, caseData);
  wsSetEditing(false);
  const s = CW.stage();
  const move = (s === 'material-selection' || s === 'review-public') ? CW.requestStage('awaiting-customer') : Promise.resolve(true);
  move.then(() => {
    if (first) {
      // Fortryd inden for beskedens levetid: mailen er ikke gået, kladden står tilbage
      const undo = () => {
        CW.clearRequest();
        CW.log('request-undone', wsFill(t('Afsendelsen til {email} er fortrudt. Kunden har ikke fået anmodningen.'), { email: to.email }), { who: 'rådgiver' });
        CW.requestStage('material-selection').then(() => {
          CW.toast(t('Afsendelsen er fortrudt. Anmodningen ligger igen som kladde.'), { tone: 'info' });
          setTimeout(() => wsScrollTo('ws-material'), 80);
          CW.focusSoon('#ws-material-title');
        });
      };
      CW.toast(wsFill(t('Anmodning sendt til {email}'), { email: to.email }), { action: { label: t('Fortryd'), onClick: undo } });
    } else {
      // Fortryd en opdatering: den tidligere anmodning gælder igen, og
      // ændringerne ligger tilbage i kladden
      const undoUpdate = () => {
        try { localStorage.setItem(CW.KEYS.request, JSON.stringify(prevRequest)); } catch (e) {}
        CW.bump();
        CW.log('request-undone', wsFill(t('Opdateringen er fortrudt. Kunden ser igen version {v} af anmodningen.'), { v: prevRequest.version || 1 }), { who: 'rådgiver' });
        CW.toast(t('Opdateringen er fortrudt. Ændringerne ligger igen i kladden.'), { tone: 'info' });
        CW.focusSoon('#ws-hero-title');
      };
      CW.toast(added
        ? wsFill(wsPlural(added, t('Opdatering sendt til {email} med 1 nyt punkt'), t('Opdatering sendt til {email} med {n} nye punkter')), { email: to.email })
        : noMail ? t('Anmodningen er opdateret uden mail. Kundens side viser ændringen.')
        : wsFill(t('Opdatering sendt til {email}: punkter er fjernet'), { email: to.email }),
        { action: { label: t('Fortryd'), onClick: undoUpdate } });
    }
    setTimeout(() => wsScrollTo('ws-hero'), 80);
    CW.focusSoon('#ws-hero-title');
  });
  return true;
}

// Udfyldt cirkel med hvidt flueben: grøn = godkendt, blå = modtaget og venter på gennemgang
function WSCheckDot({ tone, label, size, title }) {
  return (
    <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" role="img" aria-label={title || label} style={{ flexShrink: 0 }}>
      {title && <title>{title}</title>}
      <circle cx="12" cy="12" r="11" fill={tone === 'approved' ? 'var(--c-success)' : 'var(--c-primary)'}/>
      <path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Status for et punkt i vælgeren, set i forhold til den sendte anmodning
function wsSelectorStatus(it, sel, request, st) {
  if (!request) return null;
  const inReq = (request.items || []).indexOf(it.id) >= 0;
  const s = st[it.id];
  if (!inReq && !sel[it.id] && request.withdrawn && request.withdrawn[it.id]) return { label: t('Trukket tilbage'), color: 'var(--c-text-3)' };
  if (!inReq && !sel[it.id] && (request.dropped || []).indexOf(it.id) >= 0) return { label: t('Modtaget, ikke længere påkrævet'), color: 'var(--c-text-3)' };
  if (!inReq) return sel[it.id] ? { label: t('Kun i kladden'), color: 'var(--c-warn)' } : null;
  if (!sel[it.id]) return { label: t('Fjernes ved næste opdatering'), color: 'var(--c-danger)' };
  if (!s) return { label: t('Sendt'), color: 'var(--c-text-2)' };
  if (s.status === 'approved') return { label: t('Godkendt'), color: 'var(--c-success)' };
  if (s.status === 'received' || s.status === 'noted') return { label: t('Modtaget'), color: 'var(--c-primary)' };
  if (s.status === 'rejected') return { label: t('Afvist'), color: 'var(--c-danger)' };
  return { label: t('Sendt'), color: 'var(--c-text-2)' };
}

/* Én stille linje, når kladden afviger fra det, kunden har fået. Send og
   kassér sker i modalen (Åbn anmodningen). */
function WSDraftBar({ caseData }) {
  CW.useCase();
  const diff = CW.draftDiff();
  if (!diff || CW.caseState().submittedAt) return null;
  const n = diff.added.length + diff.removed.length;
  const names = [].concat(diff.added.map(it => t(it.label)), diff.removed.map(it => wsFill(t('{item} (fjernes)'), { item: t(it.label) }))).join(', ');
  const open = () => wsRequestMore(() => { setTimeout(() => wsScrollTo('ws-material'), 80); CW.focusSoon('#ws-material-title'); });
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', padding: '0 0 12px', fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5 }}>
      <span style={{ flex: 1, minWidth: 220 }}>
        {wsPlural(n, t('1 anmodning er ikke sendt til kunden:'), t('{n} anmodninger er ikke sendt til kunden:'))} <span style={{ color: 'var(--c-ink)' }}>{names}</span>
      </span>
      <button type="button" className="btn-ghost-sm" onClick={open}>{t('Åbn anmodningen')}</button>
    </div>
  );
}

// Emnerne i materialevalget: samme tabel som kundens portal og Dokumenter (case_state.js)
const WS_MATERIAL_CATS = CW.MATERIAL_CATS;

// Emne for et punkt i anmodningen
function wsMaterialCat(it) { return CW.itemCat(it); }
// Har rådgiveren selv uploadet punktet på kundens vegne?
function wsUploadedByAdvisor(id) {
  const s = CW.itemState(id);
  return s && s.by === 'rådgiver' && (s.status === 'received' || s.status === 'approved') && (s.files || []).length ? s : null;
}
// Fravalg af et punkt, kunden allerede har sendt, kræver bekræftelse (som før)
function wsToggleMaterial(it) {
  const sel = CW.selection();
  const on = !sel[it.id];
  const s = CW.itemState(it.id);
  const delivered = s && (s.status === 'received' || s.status === 'noted' || s.status === 'approved');
  if (on || !delivered || s.by === 'rådgiver') { CW.setSelection({ ...CW.selection(), [it.id]: on }); return; }
  if (s.status === 'received' || s.status === 'noted') {
    CW.confirm({
      title: wsFill(t('Gennemgå "{item}" først'), { item: t(it.label) }),
      text: t('Kunden har sendt punktet, men du har ikke gennemgået det. Godkend eller afvis det under Udestående, før du fravælger det.'),
      confirmLabel: t('Gå til punktet'),
    }).then(r => {
      if (!r.ok) return;
      wsSetEditing(false);
      setTimeout(() => { const el = document.getElementById('ws-item-' + it.id); if (el) el.scrollIntoView({ block: 'center' }); CW.focusSoon('#ws-item-' + it.id + ' [data-act="approve"]'); }, 120);
    });
    return;
  }
  CW.confirm({
    title: wsFill(t('Fravælg "{item}"?'), { item: t(it.label) }),
    text: t('Punktet er allerede godkendt. Fravælger du det, bliver kunden ikke længere bedt om det, når du sender opdateringen. Filerne bliver liggende under Dokumenter.'),
    confirmLabel: t('Fravælg punktet'), danger: true,
  }).then(r => { if (r.ok) CW.setSelection({ ...CW.selection(), [it.id]: false }); });
}

/**
 * "Anmod om materiale" som modal i tre trin: punkterne (med upload på kundens
 * vegne), mailen (modtager, emne og tekst) og en kvittering. Opbygget efter
 * Jespers skitse i Claude Design, i appens egne komponenter og farver.
 */
function WSMaterialModal({ caseData, request, editing, onClose, onSent, sent }) {
  CW.useCase();
  const ref = React.useRef(null);
  const fileRef = React.useRef(null);
  const target = React.useRef(null);
  const [view, setView] = React.useState(sent ? 'sent' : 'list');
  const [showInCase, setShowInCase] = React.useState(false);
  const [showExtras, setShowExtras] = React.useState(false);
  const [dragId, setDragId] = React.useState(null);
  const [newItem, setNewItem] = React.useState('');
  const [editRec, setEditRec] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  CW.useDialog(ref, true, onClose);
  React.useEffect(() => { CW.focusSoon('#ws-material-title'); }, [view]);

  const sel = CW.selection();
  const st = CW.items();
  const check = wsDraftCheck(caseData);
  const draft = check.draft;
  const cd = wsCaseDeadline(caseData);
  const all = CW.allItems();
  const hasOnFile = it => { const f = CW.onFile(it); return !!f && !f.stale; };
  const isExtra = it => it.tier === 'extra';
  const rank = it => it.custom ? 2 : isExtra(it) ? 1 : 0;
  // Det rådgiveren selv har uploadet på kundens vegne, ligger på sagen og står under "Ligger allerede på sagen"
  const missing = all.filter(it => !it.custom && !wsUploadedByAdvisor(it.id) && (hasOnFile(it) ? !!sel[it.id] : (!isExtra(it) || sel[it.id]))).sort((a, b) => rank(a) - rank(b));
  const extras = all.filter(it => isExtra(it) && !hasOnFile(it) && !sel[it.id]);
  const custom = all.filter(it => it.custom);
  const hasYears = all.some(it => it.tier === 'year' && hasOnFile(it));
  const inCase = all.filter(it => !it.custom && (!!wsUploadedByAdvisor(it.id) || (hasOnFile(it) && !sel[it.id] && !(hasYears && it.id === 'm-annual'))));

  // Det, mailen beder om: valgte punkter, som rådgiveren ikke selv har uploadet.
  // En opdatering nævner kun de nye punkter.
  const added = check.diff ? check.diff.added.map(i => i.id) : null;
  const mailItems = CW.draftItems().filter(it => !wsUploadedByAdvisor(it.id) && (!request || !added || added.includes(it.id)));
  const listError = CW.draftItems().length === 0 ? t('Vælg mindst ét punkt.')
    : request && !check.diff && draft.deadline === request.deadline ? t('Der er ingen ændringer at sende.') : null;

  // Fjernede punkter: kunden kan få besked om, at de ikke skal sendes (rådgiveren vælger)
  const removedItems = check.diff ? check.diff.removed.filter(it => !CW.isReceived(it.id)) : [];
  const notifyRemoved = draft.notifyRemoved !== false;
  const deadlineText = draft.deadline ? CW.fmtDate(draft.deadline) : '';
  const first = (draft.name || '').trim().split(/\s+/)[0] || t('modtageren');
  const mail = CW.requestMail({ items: mailItems, deadline: draft.deadline, to: { name: draft.name, email: draft.email } });
  const defSubject = mail.subject + ' · ' + mail.caseLine;
  const whyOf = it => hasOnFile(it) ? t('Opdateret version.') : t(it.why || '');
  const removedList = removedItems.map((it, n) => (n + 1) + '. ' + t(it.label)).join('\n');
  const noNew = request && mailItems.length === 0;
  const showMail = !(request && mailItems.length === 0 && !notifyRemoved);   // intet at skrive til kunden: ingen mail
  const defBody = (noNew ? [
    mail.greeting, '',
    t('Vi skal alligevel ikke bruge følgende materiale, så I behøver ikke at sende det:'), '',
    removedList, '',
    t('Alt andet i anmodningen gælder som før.'),
    mail.link, '',
    t('Linket er personligt og udløber efter 30 dage.'),
  ] : [
    mail.greeting, '',
    request ? t('Vi har brug for lidt mere materiale til vurderingen af jeres ansøgning.') : mail.intro, '',
    mailItems.map((it, n) => (n + 1) + '. ' + t(it.label) + (whyOf(it) ? '\n   ' + whyOf(it) : '')).join('\n'), '',
    ...(request && notifyRemoved && removedItems.length ? [t('Følgende skal I ikke længere sende:'), removedList, ''] : []),
    wsFill(t('Upload materialet via linket senest {date}:'), { date: deadlineText }),
    mail.link, '',
    t('Linket er personligt og udløber efter 30 dage.'),
    // Første mail: som dagens invitation siger den, hvad Crediwire er, og at kunden opretter en bruger og kan forbinde regnskabssystemet
    ...(request ? [] : ['', mail.trustLine, t('I kan give EIFO læseadgang til periodetal og debitordata i jeres regnskabssystem i stedet for at sende filer. Har jeres revisor adgangen, kan I bede revisoren om hjælp fra siden.')]),
  ]).join('\n');
  const subject = draft.subject != null ? draft.subject : defSubject;
  const body = draft.body != null ? draft.body : defBody;

  const attach = (it, list) => {
    setDragId(null);
    const arr = Array.from(list || []);
    if (!arr.length) return;
    const files = CW.putFiles(arr, { by: 'rådgiver', itemId: it.id });
    CW.markReceived(it.id, { by: 'rådgiver', files });
    CW.setSelection({ ...CW.selection(), [it.id]: true });
  };
  const unupload = (it) => CW.resetItem(it.id, 'rådgiver');
  const addItem = () => {
    const v = newItem.trim(); if (!v) return;
    CW.addCustomItem(v, 'Øvrigt'); setNewItem('');
  };

  // Kassér kladdens ændringer (kun ved en opdatering af en sendt anmodning)
  const canDiscard = !!request && !!CW.draftDiff();
  const discardDraft = () => {
    const before = CW.selection();
    CW.discardDraft();
    CW.toast(t('Ændringerne er kasseret. Kladden svarer igen til det, kunden har fået.'), { action: { label: t('Fortryd'), onClick: () => CW.setSelection(before) } });
    onClose && onClose();
  };

  const send = () => {
    setTried(true);
    const c = wsDraftCheck(caseData);
    if (c.error) { if (/navn|mail|frist/i.test(c.error)) setEditRec(true); return; }
    const info = { name: c.draft.name.trim(), count: mailItems.length, deadline: c.draft.deadline, update: !!request };
    if (c.noRequired) { wsSendRequest(caseData); onClose(); return; }
    wsDoSend(c, caseData);
    wsSetDraft({ subject: null, body: null }, caseData);
    onSent && onSent(info);
    setView('sent');
  };

  const pickFile = (it) => { target.current = it; const f = fileRef.current; if (f) { f.value = ''; f.click(); } };
  // Din egen upload er forældet: filen fjernes, og kunden bliver bedt om en ny version
  const askNewVersion = (it) => CW.confirm({
    title: wsFill(t('Bed om ny version af "{item}"?'), { item: t(it.label) }),
    text: t('Din uploadede fil fjernes, og kunden bliver bedt om at sende en ny version.'),
    confirmLabel: t('Bed om ny version'),
  }).then(r => { if (r && r.ok) { CW.resetItem(it.id, 'rådgiver'); CW.setSelection({ ...CW.selection(), [it.id]: true }); } });
  // Lille + ved filen: tilføj en fil til punktet
  const plusBtn = (it, up) => (
    <button type="button" className="ws-req-link" title={t('Tilføj en fil mere')}
      aria-label={wsFill(t('Tilføj en fil mere til {item}'), { item: t(it.label) })} onClick={(e) => { e.preventDefault(); pickFile(it); }}
      style={{ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, marginLeft: 4, textDecoration: 'none', verticalAlign: 'middle', borderRadius: 4 }}><I.Plus size={12}/></button>
  );
  const row = (it) => {
    const up = wsUploadedByAdvisor(it.id);
    const on = !!sel[it.id] && !up;
    const status = request ? wsSelectorStatus(it, sel, request, st) : null;
    const dragging = dragId === it.id;
    return (
      <div key={it.id} className={'ws-req-row' + (on ? ' on' : '') + (dragging ? ' drag' : '') + (up ? ' up' : '')}
        title={it.why ? t(it.why) : undefined}
        onDragOver={e => { e.preventDefault(); if (dragId !== it.id) setDragId(it.id); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragId(null); }}
        onDrop={e => { e.preventDefault(); attach(it, e.dataTransfer.files); }}>
        {up
          ? <span style={{ marginTop: 3, display: 'inline-flex' }}><WSCheckDot tone={up.status === 'approved' ? 'approved' : 'received'} label={up.status === 'approved' ? t('Godkendt') : t('Modtaget')}/></span>
          : <input type="checkbox" id={'ws-req-' + it.id} checked={on} onChange={() => wsToggleMaterial(it)} style={{ accentColor: 'var(--c-primary)', margin: '4px 0 0' }}/>}
        <label htmlFor={up ? undefined : 'ws-req-' + it.id} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', cursor: up ? 'default' : 'pointer' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{t(it.label)}</span>
            {it.custom && !up && (
              <button type="button" className="ws-req-x" aria-label={wsFill(t('Fjern {item}'), { item: it.label })} title={t('Fjern punkt')}
                onClick={e => { e.preventDefault(); CW.removeCustomItem(it.id); }}><I.X size={12}/></button>
            )}
          </span>
          {up && (
            <span style={{ fontSize: 12, color: 'var(--c-text-2)', display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
              {up.files.map(f => (
                <span key={f.id} className="ws-req-file">
                  <I.FileText size={12} aria-hidden="true" style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  {CW.canRemoveFile(it.id, f.id, 'rådgiver') && (
                    <button type="button" className="ws-req-link" aria-label={wsFill(t('Fjern {file}'), { file: f.name })} style={{ textDecoration: 'none', color: 'var(--c-text-2)', marginLeft: 4 }}
                      onClick={e => { e.preventDefault(); cwConfirmRemove(f.name, wsFill(t('Filen fjernes fra "{item}".'), { item: t(it.label) })).then(ok => { if (ok) CW.removeFile(it.id, f.id, 'rådgiver'); }); }}>{t('Fjern')}</button>
                  )}
                </span>
              ))}
              <span style={{ color: 'var(--c-text-3)' }}>
                {up.files.length === 1 ? wsFill(t('Uploadet af dig {date}'), { date: wsDay(up.at) }) : wsFill(t('{n} filer uploadet af dig {date}'), { n: up.files.length, date: wsDay(up.at) })}
                {plusBtn(it, true)}
                {up.files.length > 1 && <> · <button type="button" className="ws-req-link" onClick={e => { e.preventDefault(); cwConfirmRemove('', wsFill(t('Filerne fjernes fra "{item}".'), { item: t(it.label) }), { title: wsFill(t('Fjern alle {n} filer?'), { n: up.files.length }), confirmLabel: t('Fjern filerne') }).then(ok => { if (ok) unupload(it); }); }}>{t('Fjern alle')}</button></>}
              </span>
            </span>
          )}
          {!up && !dragging && hasOnFile(it) && (() => { const f = CW.onFile(it); return <span style={{ fontSize: 12, color: 'var(--c-text-2)' }}>{wsFill(t('Ny version af {doc}'), { doc: t(f.latestName || f.name) })}</span>; })()}
          {dragging && <span style={{ fontSize: 12, color: 'var(--c-primary)' }}>{t('Slip filerne for at uploade på kundens vegne')}</span>}
        </label>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {up ? (
            <button type="button" className="ws-req-ghost" onClick={() => askNewVersion(it)}>{t('Bed om ny version')}</button>
          ) : (
            <button type="button" className="ws-req-ghost" title={up ? t('Tilføj flere filer på kundens vegne') : t('Upload på kundens vegne')}
              aria-label={wsFill(up ? t('Tilføj fil til {item}') : t('Upload for kunden til {item}'), { item: t(it.label) })}
              onClick={() => { target.current = it; const f = fileRef.current; if (f) { f.value = ''; f.click(); } }}>
              {up ? <I.Plus size={12}/> : <I.Upload size={12}/>} {up ? t('Tilføj fil') : t('Upload for kunden')}
            </button>
          )}
          {it.custom
            ? <select aria-label={t('Kategori')} value={it.cat} onChange={e => CW.setCustomItemCat(it.id, e.target.value)} className="ws-req-cat ws-req-cat-select">
                {WS_MATERIAL_CATS.map(c => c.label).concat(['Øvrigt']).map(c => <option key={c} value={c}>{t(c)}</option>)}
              </select>
            : <span className="ws-req-cat">{t(wsMaterialCat(it))}</span>}
        </span>
      </div>
    );
  };

  const title = (sent ? sent.update : request) ? t('Ret i anmodningen') : t('Anmod om materiale');
  const subtitle = view === 'sent' ? t('Kunden har fået mailen og kan uploade materialet via linket.')
    : view === 'preview' ? t('Tjek modtager og mail, før du sender.')
    : t('Vælg det materiale, du vil have fra kunden.');

  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ alignItems: 'start', paddingTop: 40 }}>
      <div ref={ref} id="ws-material" className="modal" role="dialog" aria-modal="true" aria-labelledby="ws-material-title"
        style={{ width: 720, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 80px)' }}>
        <div className="modal-head" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="ws-material-title" className="modal-title" tabIndex={-1} style={{ margin: 0, outline: 'none' }}>{title}</h2>
            <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.5 }}>{subtitle}</div>
          </div>
          <button type="button" className="icon-btn" aria-label={t('Luk')} title={t('Luk')} onClick={onClose}><I.X size={15}/></button>
        </div>

        {view === 'sent' && sent && (
          <div style={{ padding: '44px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <I.CheckCircle size={34} aria-hidden="true" style={{ color: 'var(--c-success)' }}/>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-ink)' }}>{wsFill(sent.update ? t('Opdatering sendt til {name}') : t('Anmodning sendt til {name}'), { name: sent.name })}</div>
            <div style={{ fontSize: 13.5, color: 'var(--c-text-2)' }}>
              {wsFill(t('{items} · svarfrist {date}. Du kan følge svarene i sagen.'), { items: wsPlural(sent.count, t('1 punkt'), t('{n} punkter')), date: CW.fmtDate(sent.deadline) })}
            </div>
            <button type="button" className="btn btn-sm" style={{ marginTop: 8 }} onClick={onClose}>{t('Tilbage til sagen')}</button>
          </div>
        )}

        {view === 'list' && (
          <div className="modal-body" style={{ padding: '12px 12px 0' }}>
            <input type="file" multiple ref={fileRef} style={{ display: 'none' }} onChange={e => { const it = target.current; if (it) attach(it, e.target.files); }}/>
            {missing.map(row)}
            {custom.map(row)}
            <div className="ws-req-add">
              <I.Plus size={16} aria-hidden="true" style={{ color: 'var(--c-text-3)' }}/>
              <input className="input" id="ws-req-new" aria-label={t('Tilføj andet materiale')} placeholder={t('Tilføj andet materiale')} value={newItem}
                onChange={e => setNewItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}/>
              {newItem.trim() && <button type="button" className="btn btn-sm" onClick={addItem}>{t('Tilføj')}</button>}
            </div>
            {extras.length > 0 && (
              <div style={{ margin: '0 12px', borderTop: '1px solid var(--c-line-2)' }}>
                <button type="button" className="ws-req-fold" aria-expanded={showExtras} aria-controls="ws-req-extras" onClick={() => setShowExtras(v => !v)}>
                  <I.ChevronRight size={12} style={{ transform: showExtras ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}/>
                  {wsFill(t('Mere materiale, du kan bede om ({n})'), { n: extras.length })}
                </button>
                {showExtras && (
                  <div id="ws-req-extras" style={{ paddingBottom: 12 }}>
                    {extras.map(it => (
                      <div key={it.id} className="ws-req-row" title={it.why ? t(it.why) : undefined}>
                        <input type="checkbox" id={'ws-req-' + it.id} checked={false} onChange={() => wsToggleMaterial(it)} style={{ accentColor: 'var(--c-primary)', margin: '4px 0 0' }}/>
                        <label htmlFor={'ws-req-' + it.id} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                          <span style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{t(it.label)}</span>
                          {it.hint && <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{t(it.hint)}</span>}
                        </label>
                        <span className="ws-req-cat">{t(wsMaterialCat(it))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ margin: '0 12px', borderTop: '1px solid var(--c-line-2)' }}>
              <button type="button" className="ws-req-fold" aria-expanded={showInCase} onClick={() => setShowInCase(v => !v)}>
                <I.ChevronRight size={12} style={{ transform: showInCase ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}/>
                {wsFill(t('Ligger allerede på sagen ({n})'), { n: inCase.length })}
              </button>
              {showInCase && (
                <div style={{ paddingBottom: 12 }}>
                  {inCase.map(it => {
                    // Selv uploadet: samme række som ovenfor (filer, Fjern, Tilføj fil)
                    if (wsUploadedByAdvisor(it.id)) return row(it);
                    const f = CW.onFile(it);
                    return (
                      <div key={it.id} className="ws-req-row up">
                        <span style={{ marginTop: 3, display: 'inline-flex' }}><WSCheckDot tone="approved" label={t('Ligger på sagen')}/></span>
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{t(it.label)}</span>
                          <span className="ws-req-file" style={{ fontSize: 12, color: 'var(--c-text-2)' }}>
                            <I.FileText size={12} aria-hidden="true" style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
                            {f.isPublic
                              ? <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(f.latestName || f.name)}</span>
                              : <button type="button" className="ws-req-filelink" title={t('Hent dokumentet')} onClick={() => CW.downloadDoc(f.latestName || f.name)} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(f.latestName || f.name)}</button>}
                            {plusBtn(it, false)}
                          </span>
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button type="button" className="ws-req-ghost" onClick={() => wsToggleMaterial(it)}>{t('Bed om ny version')}</button>
                          <span className="ws-req-cat">{t(wsMaterialCat(it))}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'preview' && (
          <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '12px 16px', background: 'var(--c-surface-2)', border: '1px solid var(--c-line)', borderRadius: 8, fontSize: 13.5 }}>
              {!editRec ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div><span style={{ color: 'var(--c-text-2)' }}>{t('Til')}</span> <b style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{draft.name}</b>{draft.role ? ', ' + draft.role : ''} · {draft.email}</div>
                    <div style={{ color: check.past || check.warning ? 'var(--c-warn)' : 'var(--c-text-2)' }}>
                      {wsFill(t('Svarfrist {date}'), { date: deadlineText })}{draft.deadline && draft.deadline === cd ? ', ' + t('samme som sagens frist') : ''}{check.warning ? '. ' + check.warning : ''}
                    </div>
                  </div>
                  <button type="button" className="ws-req-ghost" onClick={() => setEditRec(true)}>{t('Rediger')}</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 16px' }}>
                    <div className="field"><label htmlFor="ws-req-name">{t('Modtagernavn')}</label><input id="ws-req-name" className="input" value={draft.name} onChange={e => wsSetDraft({ name: e.target.value }, caseData)}/></div>
                    <div className="field"><label htmlFor="ws-req-role">{t('Rolle')}</label><input id="ws-req-role" className="input" value={draft.role} onChange={e => wsSetDraft({ role: e.target.value }, caseData)}/></div>
                    <div className="field"><label htmlFor="ws-req-email">{t('Mail')}</label><input id="ws-req-email" type="email" className="input" value={draft.email} onChange={e => wsSetDraft({ email: e.target.value }, caseData)}/></div>
                    <div className="field"><label htmlFor="ws-req-deadline">{t('Svarfrist')}</label><input id="ws-req-deadline" type="date" className="input" min={wsTodayIso()} value={draft.deadline || ''} aria-invalid={check.past || undefined} onChange={e => wsSetDraft({ deadline: e.target.value }, caseData)}/></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--c-text-2)' }}>{wsFill(t('Linket er personligt til {name} og udløber efter 30 dage.'), { name: draft.name || t('modtageren') })}</span>
                    <button type="button" className="ws-req-ghost" onClick={() => setEditRec(false)}>{t('Færdig')}</button>
                  </div>
                </>
              )}
            </div>
            {removedItems.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, lineHeight: 1.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={notifyRemoved} onChange={e => wsSetDraft({ notifyRemoved: e.target.checked, body: null }, caseData)} style={{ accentColor: 'var(--c-primary)', margin: '3px 0 0' }}/>
                <span>
                  {wsFill(removedItems.length === 1 ? t('Fortæl kunden, at de ikke skal sende: {items}') : t('Fortæl kunden, at de ikke skal sende: {items}'), { items: removedItems.map(it => t(it.label)).join(', ') })}
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--c-text-3)' }}>
                    {mailItems.length === 0 && !notifyRemoved
                      ? t('Der sendes ingen mail. Kundens side viser stadig ændringen.')
                      : t('Slå fra, hvis du allerede har sagt det til kunden, eller vil nævne det i en anden mail. Kundens side viser stadig ændringen.')}
                  </span>
                </span>
              </label>
            )}
            {showMail && (
              <>
            <div style={{ border: '1px solid var(--c-line-strong)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', alignItems: 'center', gap: '0 12px', padding: '0 12px', borderBottom: '1px solid var(--c-line)' }}>
                <label htmlFor="ws-req-subject" style={{ color: 'var(--c-text-2)', fontSize: 13.5 }}>{t('Emne')}</label>
                <input id="ws-req-subject" value={subject} onChange={e => wsSetDraft({ subject: e.target.value }, caseData)}
                  style={{ height: 40, border: 0, padding: 0, font: 'inherit', fontSize: 13.5, minWidth: 0, background: 'transparent', outline: 'none', color: 'var(--c-ink)' }}/>
              </div>
              <textarea aria-label={t('Mailens tekst')} value={body} rows={16} onChange={e => wsSetDraft({ body: e.target.value }, caseData)}
                style={{ display: 'block', width: '100%', boxSizing: 'border-box', border: 0, padding: 12, font: 'inherit', fontSize: 13.5, lineHeight: 1.6, resize: 'vertical', minHeight: 320, outline: 'none', color: 'var(--c-ink)' }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--c-text-2)' }}>
              <span>{wsFill(t('Mailen sendes præcis som vist. Linket er personligt for {name}.'), { name: draft.name || t('modtageren') })}</span>
              {draft.body != null && <button type="button" className="ws-req-ghost" onClick={() => wsSetDraft({ body: null, subject: null }, caseData)}>{t('Gendan standardtekst')}</button>}
            </div>
              </>
            )}
          </div>
        )}

        {view !== 'sent' && (
          <div className="modal-foot" style={{ alignItems: 'center', background: 'var(--c-surface)' }}>
            {view === 'list' && canDiscard && (
              <button type="button" className="btn-ghost-sm" onClick={discardDraft}>{t('Kassér ændringer')}</button>
            )}
            <span role={tried ? 'alert' : undefined} style={{ flex: 1, fontSize: 12.5, color: 'var(--c-danger)' }}>
              {view === 'list' ? (tried ? listError : '') : (tried ? check.error : '')}
            </span>
            {view === 'list' && (
              <button type="button" className="btn btn-sm btn-primary" aria-disabled={!!listError} style={wsOff(!!listError)}
                onClick={() => { if (listError) { setTried(true); return; } setTried(false); setView('preview'); }}>
                {t('Næste')} <I.ArrowRight className="ic"/>
              </button>
            )}
            {view === 'preview' && (
              <>
                <button type="button" className="btn btn-sm" onClick={() => { setTried(false); setView('list'); }}>{t('Tilbage')}</button>
                <button type="button" id="ws-send-request" className="btn btn-sm btn-primary" aria-disabled={!!check.error} style={wsOff(!!check.error)} onClick={send}>
                  {request ? (showMail ? t('Send opdatering') : t('Gem ændringen')) : wsFill(t('Send til {name}'), { name: first })}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Kundens punkter: Udestående (til gennemgang og afventer kunden) og det
   godkendte under Materiale på sagen, se WSOutstandingCard og WSMaterialCard.
   Hver række har titlen på første linje og på anden linje et statusikon,
   filerne (eller en grå statustekst) og handlingerne. Listerne er sorteret
   efter leveringstidspunkt, nyeste først.
   ──────────────────────────────────────────────────────────────────────── */

const wsNeedsReview = (s) => !!s && (s.status === 'received' || s.status === 'noted');

// Kundens punkter i visningsrækkefølge: { it, s, dropped, at }. Punkter med en
// levering (eller en afvisning) efter tidspunktet, nyeste først; punkter uden
// levering nederst i anmodningens rækkefølge. Fravalgte punkter, kunden har
// sendt, står med (ikke længere påkrævet).
function wsCustomerList() {
  const request = CW.request();
  if (!request) return [];
  const st = CW.items();
  const items = CW.requestedItems();
  // Punkter, rådgiveren har trukket tilbage uden at kunden havde sendt noget, vises ikke på listen
  const dropped = (request.dropped || []).filter(id => !(request.withdrawn && request.withdrawn[id])).map(id => CW.itemById(id)).filter(it => it && !items.some(x => x.id === it.id));
  const time = (iso) => { const n = iso ? Date.parse(iso) : NaN; return isNaN(n) ? null : n; };
  const when = (s) => {
    if (!s) return null;
    if (s.status === 'rejected') return time(s.reviewedAt) || time(s.at);
    if (s.status === 'received' || s.status === 'noted' || s.status === 'approved') {
      const ts = [time(s.at)].concat((s.files || []).map(f => time(f.at))).filter(x => x != null);
      return ts.length ? Math.max.apply(null, ts) : null;
    }
    return null;
  };
  const all = items.map(it => ({ it, dropped: false })).concat(dropped.map(it => ({ it, dropped: true })))
    .map((e, i) => { const s = st[e.it.id] || null; return { ...e, s, at: when(s), i }; });
  return all.sort((a, b) => (wsNeedsReview(b.s) - wsNeedsReview(a.s)) || (a.at == null) - (b.at == null) || (b.at || 0) - (a.at || 0) || a.i - b.i);
}

// Godkend-knappen på det første punkt til gennemgang, i visningsrækkefølgen
function wsFirstToReviewSel() {
  const e = wsCustomerList().find(x => wsNeedsReview(x.s));
  return e ? '#ws-item-' + e.it.id + ' [data-act="approve"]' : null;
}

// Efter godkend/afvis bliver punktet stående med sin nye status. Fokus går til
// det næste punkt, der venter på gennemgang (efter det aktuelle i listen, ellers
// forfra), eller til overskriften for den nye fase, hvis der ikke er flere.
function wsFocusAfterReview(currentId) {
  setTimeout(() => {
    const list = wsCustomerList();
    const i = list.findIndex(e => e.it.id === currentId);
    const order = i < 0 ? list : list.slice(i + 1).concat(list.slice(0, i));
    const next = order.find(e => e.it.id !== currentId && wsNeedsReview(e.s) && document.querySelector('#ws-item-' + e.it.id + ' [data-act="approve"]'));
    if (next) CW.focusSoon('#ws-item-' + next.it.id + ' [data-act="approve"]');
    else if (CW.stage() !== 'awaiting-customer') CW.focusSoon('#ws-hero-title');
    else CW.focusSoon('#ws-outstanding-title');
  }, 60);
}

// Kundens valg af datadeling som kort tekst: "løbende" eller "tal til og med 30. sep. 2026"
function wsSharingText(sh) {
  if (!sh) return '';
  return sh.mode === 'ongoing' ? t('løbende') : wsFill(t('tal til og med {date}'), { date: CW.fmtDate(sh.dataUntil + 'T12:00:00') });
}

// Kundens hændelser, som rådgiveren skal kende, som grå tekstlinjer: opstarten i
// portalen, meldt færdig og adgang til regnskabssystemet
function WSCustomerEvents() {
  const cs = CW.caseState();
  const c = CW.consent();
  const revoked = !c ? CW.activity().filter(e => e.type === 'consent-revoked').slice(-1)[0] : null;
  const rows = [];
  // Kundens opstart i portalen: bruger, aftalen om datadeling og regnskabssystemet
  const ob = CW.onboarding ? CW.onboarding() : {};
  if (CW.request() && !c) {
    const step = CW.onboardingStep(ob);
    const legacy = !ob.account && (() => { try { return !!JSON.parse(localStorage.getItem('kabul:portal:nordhavn') || '{}').accepted; } catch (e) { return false; } })();
    if (!legacy && !ob.account) rows.push({ k: 'ob', at: null, text: t('Kunden har ikke oprettet en bruger i portalen endnu.') });
    else if (!legacy && step) rows.push({ k: 'ob', at: null, text: wsFill(t('Kunden er i gang med opstarten i portalen: {step} (trin {n} af {m}).'), { step: typeof obLabel === 'function' ? obLabel(step) : step, n: CW.ONBOARDING_STEPS.indexOf(step) + 1, m: CW.ONBOARDING_STEPS.length }) });
    else if (ob.agreement && ob.agreement.declined) rows.push({ k: 'ob', at: ob.agreement.at, text: wsFill(t('Kunden sagde nej til datadeling {when} og sender tallene selv.'), { when: wsDay(ob.agreement.at) }) });
    else if (ob.erp && ob.erp.waiting) rows.push({ k: 'ob', at: ob.erp.at, text: wsFill(t('Kunden har sagt ja til datadeling ({sharing}), men venter på sin revisor med at forbinde regnskabssystemet.'), { sharing: wsSharingText(ob.sharing) }) });
    else if (ob.sharing && !(ob.erp && ob.erp.system)) rows.push({ k: 'ob', at: ob.sharing.at, text: wsFill(t('Kunden har sagt ja til datadeling ({sharing}), men har ikke forbundet regnskabssystemet endnu.'), { sharing: wsSharingText(ob.sharing) }) });
  }
  if (cs.customerSubmittedAt) rows.push({ k: 'sub', at: cs.customerSubmittedAt, text: wsFill(t('Kunden meldte {when}, at alt er sendt.'), { when: wsDay(cs.customerSubmittedAt) }) });
  if (c) {
    const scope = (c.scope || []).map(s => t(s).toLowerCase()).join(', ');
    const until = c.until === 'løbende' ? t('løbende') : c.mode === 'until' ? wsFill(t('tal til og med {date}'), { date: CW.fmtDate(c.until + 'T12:00:00') }) : c.until ? wsFill(t('gælder til {date}'), { date: CW.fmtDate(c.until) }) : '';
    rows.push({ k: 'consent', at: c.at, text: wsFill(t('Læseadgang til {system}'), { system: c.system || 'e-conomic' })
      + (scope ? ' (' + scope + ')' : '') + (until ? ', ' + until : '') + ' · ' + wsFill(t('givet {date}'), { date: wsDay(c.at) })
      + (c.by && c.by.name ? ' ' + wsFill(t('af {name} (revisor eller rådgiver) på kundens vegne'), { name: c.by.name }) : '') });
  } else if (revoked) {
    rows.push({ k: 'revoked', at: revoked.at, text: wsDot(revoked.who === 'system'
      ? wsFill(t('Adgangen til regnskabssystemet blev lukket ved afgørelsen {when}.'), { when: wsDay(revoked.at) })
      : wsFill(t('Kunden trak adgangen til regnskabssystemet tilbage {when}.'), { when: wsDay(revoked.at) })) });
  }
  if (!rows.length) return null;
  return (
    <ul aria-label={t('Hændelser fra kunden')} style={{ listStyle: 'none', margin: '0 0 8px', padding: 0 }}>
      {rows.map(r => <li key={r.k} title={CW.fmtWhen(r.at)} style={{ fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.5, padding: '1px 0' }}>{r.text}</li>)}
    </ul>
  );
}

/**
 * Overblikkets to materialekort. "Udestående" (WSOutstandingCard) er det, der
 * kræver handling: det, kunden har sendt, og som venter på din gennemgang, og
 * det, kunden mangler at sende. "Materiale på sagen" (WSMaterialCard) er det,
 * sagen har: offentlige data til venstre (ca. 2/5) og det godkendte fra kunden
 * til højre. Et godkendt punkt flytter fra det første kort til det andet, og
 * Fortryd flytter det tilbage. Under ca. 900 px stables kolonnerne (styles.css).
 */

// Hvor et af kundens punkter står: 'review' (venter på din gennemgang),
// 'waiting' (kunden mangler at sende, har sendt det videre, eller det er
// afvist), 'optional' (valgfrit og ikke sendt), 'done' (godkendt) eller
// 'dropped' (ikke længere påkrævet)
function wsItemPlace(e) {
  if (wsNeedsReview(e.s)) return 'review';
  if (e.dropped) return 'dropped';
  const status = e.s ? e.s.status : 'pending';
  if (status === 'approved') return 'done';
  if (e.it.tag === 'Valgfri' && status === 'pending') return 'optional';
  return 'waiting';
}

// Kundens punkter som liste. Streg kun, hvor punkterne skifter sted (fx mellem
// godkendt og ikke længere påkrævet).
function WSItemList({ entries, locked, labelledBy, onRemind }) {
  const request = CW.request();
  const recipient = (request && request.to && request.to.email) || (DATA.REQUEST_RECIPIENT || {}).email || '';
  return (
    <ul className="ws-mat-list" aria-labelledby={labelledBy}>
      {entries.map((e, i) => <OutstandingItem key={e.it.id} it={e.it} s={e.s} recipient={recipient} request={request} dropped={e.dropped} onRemind={onRemind}
        groupStart={i > 0 && wsItemPlace(entries[i - 1]) !== wsItemPlace(e)}
        locked={locked || (e.dropped && !wsNeedsReview(e.s))}/>)}
    </ul>
  );
}

// Udestående: står kun, når kunden er bedt om materiale
function WSOutstandingCard({ locked, caseData }) {
  CW.useCase();
  const [reminding, setReminding] = React.useState(false);
  const request = CW.request();
  if (!request) return null;
  const list = wsCustomerList();
  const of = (place) => list.filter(e => wsItemPlace(e) === place);
  const review = of('review'), waiting = of('waiting'), optional = of('optional');
  const n = review.length + waiting.length;

  // Massegodkendelse gælder kun anmodede punkter med fil og står ved gruppen
  const withFile = review.filter(e => !e.dropped && e.s.status === 'received' && (e.s.files || []).length > 0);
  const approveAll = () => {
    const ids = withFile.map(e => e.it.id).filter(id => (CW.itemState(id) || {}).status === 'received');
    if (!ids.length) return;
    ids.forEach(id => CW.approve(id));
    CW.toast(wsPlural(ids.length, t('1 punkt godkendt og flyttet til Materiale på sagen'), t('{n} punkter godkendt og flyttet til Materiale på sagen')), { action: { label: t('Fortryd'), onClick: () => ids.forEach(id => CW.unreview(id)) } });
    wsFocusAfterReview(null);
  };

  const empty = !list.length ? t('Der er ikke valgt noget materiale.')
    : n > 0 ? null
    : (optional.length ? t('Intet påkrævet udestående.') : t('Intet udestående.')) + (list.some(e => wsItemPlace(e) === 'done') ? ' ' + t('Det godkendte står under Materiale på sagen.') : '');
  const group = (key, label, entries, action) => entries.length > 0 && (
    <div className="ws-out-grp">
      {label && (
        <div className="ws-out-grp-head">
          <h3 id={'ws-out-' + key} className="ws-out-grp-h">{label} <span className="n">({entries.length})</span></h3>
          {action}
        </div>
      )}
      <WSItemList entries={entries} locked={locked} labelledBy={label ? 'ws-out-' + key : 'ws-outstanding-title'} onRemind={() => setReminding(true)}/>
    </div>
  );

  return (
    <section id="ws-outstanding" className="card ws-mat" aria-labelledby="ws-outstanding-title">
      {reminding && <WSRemindModal onClose={() => setReminding(false)}/>}
      <div className="card-head ws-mat-cardhead">
        <I.Inbox size={15} aria-hidden="true" style={{ color: 'var(--c-text-2)' }}/>
        <h2 id="ws-outstanding-title" tabIndex={-1} className="card-title">{t('Afventer kunden')}{waiting.length > 0 && <span className="n"> ({waiting.length})</span>}</h2>
      </div>
      <div className="ws-out-body">
        {/* Ændringer i anmodningen, der ikke er sendt, og kundens hændelser */}
        <WSDraftBar caseData={caseData}/>
        <WSCustomerEvents/>
        {empty && <div className="ws-mat-empty">{empty}</div>}
        {group('review', t('Til gennemgang'), review,
          !locked && withFile.length >= 2 && <button type="button" className="btn-link" onClick={approveAll}>{t('Godkend alle med fil')}</button>)}
        {group('waiting', null, waiting)}
        {optional.length > 0 && (
          <CWFold id="ws-mat-optional" className="ws-mat-fold" label={t('Valgfrit materiale')} count={optional.length}>
            <WSItemList entries={optional} locked={locked} onRemind={() => setReminding(true)}/>
          </CWFold>
        )}
      </div>
    </section>
  );
}

// Materiale på sagen: offentlige data og det godkendte fra kunden. Står fra
// vurderingsfasen og frem, også før anmodningen er sendt.
function WSMaterialCard({ go, caseId, locked }) {
  CW.useCase();
  const request = CW.request();
  // Godkendt først (nyeste øverst), så det, der ikke længere er påkrævet
  const kept = wsCustomerList().filter(e => { const p = wsItemPlace(e); return p === 'done' || p === 'dropped'; })
    .sort((a, b) => (wsItemPlace(a) === 'dropped') - (wsItemPlace(b) === 'dropped'));
  const approved = kept.filter(e => wsItemPlace(e) === 'done').length;
  // Det kunden har sendt, som venter på gennemgang: står allerede under Dokumenter,
  // men kommer først her, når det er godkendt
  const inReview = request ? wsCustomerList().filter(e => wsItemPlace(e) === 'review').length : 0;
  // Bankens og EIFO's egne dokumenter (ansøgning, sikkerheder, rating) står under
  // Dokumenter fra start; her får de en plads, så de to lister dækker det samme
  const caseDocs = (DATA.DOCS || []).filter(d => d.origin === 'uploaded' && !d.superseded && d.type !== 'Crediwire-eksport'
    && ['Kundeupload', 'e-conomic'].indexOf(d.sourceLabel) < 0);
  const bySource = caseDocs.reduce((m, d) => { (m[d.sourceLabel] = m[d.sourceLabel] || []).push(d); return m; }, {});
  return (
    <section id="ws-received" className="card ws-mat" aria-labelledby="ws-received-title">
      <div className="card-head ws-mat-cardhead">
        <I.Folder size={15} aria-hidden="true" style={{ color: 'var(--c-text-2)' }}/>
        <h2 id="ws-received-title" tabIndex={-1} className="card-title">{t('Materiale på sagen')}</h2>
      </div>
      <div className="ws-mat-grid">
        <div id="ws-public-sources" className="ws-mat-col">
          <div className="ws-mat-head">
            <h3 id="ws-public-title" className="ws-mat-h">{t('Offentlige data')} <span className="n">({AUTO_SOURCES.length})</span></h3>
          </div>
          <WSPublicSources go={go} caseId={caseId}/>
          {caseDocs.length > 0 && (
            <div id="ws-bank-sources" style={{ marginTop: 18 }}>
              <div className="ws-mat-head">
                <h3 id="ws-bank-title" className="ws-mat-h">{t('Fra banken og EIFO')} <span className="n">({caseDocs.length})</span></h3>
              </div>
              {Object.keys(bySource).map(src => (
                <div key={src} className="cw-row">
                  <div className="cw-row-main">
                    <span className="cw-row-title">{t(src)}</span>
                    <span className="cw-row-meta">{wsFill(t('modtaget {date}'), { date: wsDay(bySource[src].map(d => d.date).filter(Boolean).sort().slice(-1)[0]) })}</span>
                    <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0 }}>
                      {bySource[src].map(d => (
                        <li key={d.name} className="ws-req-file" style={{ fontSize: 13, padding: '2px 0', gap: 10 }}>
                          <I.FileText size={12} aria-hidden="true" style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
                          <button type="button" className="btn-link" title={t('Download')} onClick={() => CW.downloadDoc(d.name)}>{d.name}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span/>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="ws-mat-col">
          <div className="ws-mat-head">
            <h3 id="ws-cust-title" className="ws-mat-h">{t('Fra kunden')}{request && <> <span className="n">({approved})</span></>}</h3>
          </div>
          {inReview > 0 && (
            <div className="ws-mat-empty" style={{ marginBottom: kept.length ? 8 : 0 }}>
              {wsFill(inReview === 1 ? t('1 punkt fra kunden venter på din gennemgang under {sted}. Det står her, når det er godkendt.') : t('{n} punkter fra kunden venter på din gennemgang under {sted}. De står her, når de er godkendt.'), { n: inReview, sted: t('Afventer kunden') })}
              {' '}<button type="button" className="btn-link" onClick={() => CW.focusSoon('#ws-outstanding-title')}>{t('Gå til gennemgang')}</button>
            </div>
          )}
          {!request ? <div className="ws-mat-empty">{t('Kunden er ikke bedt om materiale endnu.')}</div>
            : !kept.length ? (inReview ? null : <div className="ws-mat-empty">{t('Intet godkendt endnu. Det, du godkender under Afventer kunden, kommer til at stå her.')}</div>)
            : <WSItemList entries={kept} locked={locked} labelledBy="ws-cust-title"/>}
        </div>
      </div>
    </section>
  );
}


/* Påmindelse til kunden: mailen vises i et vindue, før den sendes, som ved Anmod om mere materiale.
   Som udgangspunkt handler den om alt, kunden mangler at sende; rådgiveren kan skrive den om. */
function WSRemindModal({ onClose, firstId }) {
  CW.useCase();
  const ref = React.useRef(null);
  CW.useDialog(ref, true, onClose);
  const request = CW.request();
  const st = CW.items();
  const adv = wsAdvisor();
  const to = (request && request.to) || {};
  // Det, kunden stadig skylder: ikke sendt endnu, eller afvist og skal sendes igen
  const missingItems = wsCustomerList().filter(e => !e.dropped && (!st[e.it.id] || st[e.it.id].status === 'pending' || st[e.it.id].status === 'rejected')).map(e => e.it);
  const ids = missingItems.map(it => it.id);
  const mail = CW.requestMail({ items: missingItems, deadline: request && request.deadline, to: { name: to.name, email: to.email }, link: request && request.link });
  const first = (to.name || '').trim().split(/\s+/)[0];
  const defSubject = t('Påmindelse') + ': ' + mail.subject + ' · ' + mail.caseLine;
  const defBody = [
    mail.greeting, '',
    t('Vi mangler stadig følgende materiale til vurderingen af jeres ansøgning:'), '',
    missingItems.map((it, n) => (n + 1) + '. ' + t(it.label)).join('\n'), '',
    request && request.deadline ? wsFill(t('Upload det via linket senest {date}:'), { date: CW.fmtDate(request.deadline) }) : t('Upload det via linket:'),
    mail.link, '',
    t('Har I spørgsmål, så skriv endelig til mig.'), '',
    adv.name,
  ].join('\n');
  const [subject, setSubject] = React.useState(defSubject);
  const [body, setBody] = React.useState(defBody);
  const [touched, setTouched] = React.useState(false);
  const send = () => {
    CW.remind(ids, { by: adv.name });
    CW.toast(wsFill(ids.length === 1 ? t('Påmindelse om 1 punkt sendt til {email}') : t('Påmindelse om {n} punkter sendt til {email}'), { n: ids.length, email: to.email || t('kunden') }));
    onClose();
  };
  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ alignItems: 'start', paddingTop: 40 }}>
      <div ref={ref} id="ws-remind" className="modal" role="dialog" aria-modal="true" aria-labelledby="ws-remind-title"
        style={{ width: 720, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 80px)' }}>
        <div className="modal-head" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="ws-remind-title" className="modal-title" tabIndex={-1} style={{ margin: 0, outline: 'none' }}>{t('Påmind kunden')}</h2>
            <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.5 }}>{t('Tjek mailen, før du sender. Den handler som standard om alt, kunden mangler.')}</div>
          </div>
          <button type="button" className="icon-btn" aria-label={t('Luk')} title={t('Luk')} onClick={onClose}><I.X size={15}/></button>
        </div>
        <div className="modal-body" style={{ padding: '14px 24px 18px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <div style={{ fontSize: 13.5 }}>
            <span style={{ color: 'var(--c-text-2)' }}>{t('Til')}</span> <b style={{ fontWeight: 600, color: 'var(--c-ink)' }}>{to.name || t('kunden')}</b>{to.role ? ', ' + t(to.role) : ''}{to.email ? ' · ' + to.email : ''}
          </div>
          <div style={{ border: '1px solid var(--c-line-strong)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', alignItems: 'center', gap: '0 12px', padding: '0 12px', borderBottom: '1px solid var(--c-line)' }}>
              <label htmlFor="ws-remind-subject" style={{ color: 'var(--c-text-2)', fontSize: 13.5 }}>{t('Emne')}</label>
              <input id="ws-remind-subject" value={subject} onChange={e => { setSubject(e.target.value); setTouched(true); }}
                style={{ height: 40, border: 0, padding: 0, font: 'inherit', fontSize: 13.5, minWidth: 0, background: 'transparent', outline: 'none', color: 'var(--c-ink)' }}/>
            </div>
            <textarea aria-label={t('Mailens tekst')} value={body} rows={14} onChange={e => { setBody(e.target.value); setTouched(true); }}
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', border: 0, padding: 12, font: 'inherit', fontSize: 13.5, lineHeight: 1.6, resize: 'vertical', minHeight: 280, outline: 'none', color: 'var(--c-ink)' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--c-text-2)' }}>
            <span>{t('Mailen sendes præcis som vist.')}</span>
            {touched && <button type="button" className="ws-req-ghost" onClick={() => { setSubject(defSubject); setBody(defBody); setTouched(false); }}>{t('Gendan standardtekst')}</button>}
          </div>
        </div>
        <div className="modal-foot" style={{ alignItems: 'center', background: 'var(--c-surface)' }}>
          <span style={{ flex: 1, fontSize: 12.5, color: 'var(--c-text-2)' }}>
            {ids.length === 0 ? t('Kunden mangler ikke noget.') : ''}
          </span>
          <button type="button" className="btn btn-sm" onClick={onClose}>{t('Annullér')}</button>
          <button type="button" className="btn btn-sm btn-primary" aria-disabled={!ids.length || !body.trim()} style={wsOff(!ids.length || !body.trim())}
            onClick={() => { if (ids.length && body.trim()) send(); }}>{t('Send påmindelse')}</button>
        </div>
      </div>
    </div>
  );
}


/* Afvis materiale: rådgiveren skriver, hvorfor (kunden kan se noten), og kan se og skrive mailen om, før den sendes.
   Mailen kan også undlades. */
function WSRejectModal({ it, onClose, onDone }) {
  CW.useCase();
  const ref = React.useRef(null);
  CW.useDialog(ref, true, onClose);
  const request = CW.request();
  const adv = wsAdvisor();
  const to = (request && request.to) || {};
  const label = t(it.label);
  const [reason, setReason] = React.useState('');
  const [sendMail, setSendMail] = React.useState(true);
  const [subjectEdit, setSubjectEdit] = React.useState(null);
  const [bodyEdit, setBodyEdit] = React.useState(null);
  const mail = CW.requestMail({ items: [it], deadline: request && request.deadline, to: { name: to.name, email: to.email }, link: request && request.link });
  const defSubject = wsFill(t('Vi mangler en ny version af {item}'), { item: label }) + ' · ' + mail.caseLine;
  const defBody = [
    mail.greeting, '',
    wsFill(t('Vi har gennemgået det, I har sendt, og kan desværre ikke godkende "{item}".'), { item: label }), '',
    reason.trim() ? t('Hvorfor:') + ' ' + reason.trim() : '',
    reason.trim() ? '' : null,
    request && request.deadline ? wsFill(t('Upload en ny version via linket senest {date}:'), { date: CW.fmtDate(request.deadline) }) : t('Upload en ny version via linket:'),
    mail.link, '',
    t('Skriv endelig til mig, hvis I har spørgsmål.'), '',
    adv.name,
  ].filter(x => x !== null).join('\n');
  const subject = subjectEdit != null ? subjectEdit : defSubject;
  const body = bodyEdit != null ? bodyEdit : defBody;
  const ok = !!reason.trim() && (!sendMail || !!body.trim());
  const go = () => { if (ok) onDone({ reason: reason.trim(), sendMail }); };
  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ alignItems: 'start', paddingTop: 40 }}>
      <div ref={ref} id="ws-reject" className="modal" role="dialog" aria-modal="true" aria-labelledby="ws-reject-title"
        style={{ width: 720, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 80px)' }}>
        <div className="modal-head" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="ws-reject-title" className="modal-title" tabIndex={-1} style={{ margin: 0, outline: 'none' }}>{wsFill(t('Afvis "{item}"'), { item: label })}</h2>
            <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 2, lineHeight: 1.5 }}>{t('Kunden kan se din note på sin side. Du kan også sende en mail.')}</div>
          </div>
          <button type="button" className="icon-btn" aria-label={t('Luk')} title={t('Luk')} onClick={onClose}><I.X size={15}/></button>
        </div>
        <div className="modal-body" style={{ padding: '14px 24px 18px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <div className="field">
            <label htmlFor="ws-reject-reason">{t('Hvorfor afvises det?')}</label>
            <input id="ws-reject-reason" className="input" autoFocus value={reason} onChange={e => setReason(e.target.value)}
              placeholder={t('Kort note til kunden, fx "Mangler noterne til årsrapporten"')}
              onKeyDown={e => { if (e.key === 'Enter' && !sendMail) go(); }}/>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={sendMail} onChange={e => setSendMail(e.target.checked)} style={{ accentColor: 'var(--c-primary)', margin: '3px 0 0' }}/>
            <span>
              {wsFill(t('Send en mail til kunden ({email})'), { email: to.email || t('kunden') })}
              {!sendMail && (
                <span style={{ display: 'block', fontSize: 12, color: 'var(--c-text-3)' }}>{t('Der sendes ingen mail. Kundens side viser stadig afvisningen og din note.')}</span>
              )}
            </span>
          </label>
          {sendMail && (
            <>
              <div style={{ border: '1px solid var(--c-line-strong)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', alignItems: 'center', gap: '0 12px', padding: '0 12px', borderBottom: '1px solid var(--c-line)' }}>
                  <label htmlFor="ws-reject-subject" style={{ color: 'var(--c-text-2)', fontSize: 13.5 }}>{t('Emne')}</label>
                  <input id="ws-reject-subject" value={subject} onChange={e => setSubjectEdit(e.target.value)}
                    style={{ height: 40, border: 0, padding: 0, font: 'inherit', fontSize: 13.5, minWidth: 0, background: 'transparent', outline: 'none', color: 'var(--c-ink)' }}/>
                </div>
                <textarea aria-label={t('Mailens tekst')} value={body} rows={12} onChange={e => setBodyEdit(e.target.value)}
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', border: 0, padding: 12, font: 'inherit', fontSize: 13.5, lineHeight: 1.6, resize: 'vertical', minHeight: 240, outline: 'none', color: 'var(--c-ink)' }}/>
              </div>
              {(subjectEdit != null || bodyEdit != null) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="ws-req-ghost" onClick={() => { setSubjectEdit(null); setBodyEdit(null); }}>{t('Gendan standardtekst')}</button>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-foot" style={{ alignItems: 'center', background: 'var(--c-surface)' }}>
          <span style={{ flex: 1 }}/>
          <button type="button" className="btn btn-sm" onClick={onClose}>{t('Annullér')}</button>
          <button type="button" className="btn btn-sm btn-primary" aria-disabled={!ok} style={wsOff(!ok)} onClick={go}>
            {sendMail ? t('Afvis og send mail') : t('Afvis uden mail')}
          </button>
        </div>
      </div>
    </div>
  );
}

function OutstandingItem({ it, s, locked, dropped, recipient, request, groupStart, onRemind }) {
  const fileRef = React.useRef(null);
  const [rejecting, setRejecting] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [drag, setDrag] = React.useState(false);
  const status = s ? s.status : 'pending';
  const label = t(it.label);
  const files = (s && s.files) || [];
  const byAdvisor = s && s.by === 'rådgiver';
  const adv = wsAdvisor();
  const reminder = (status === 'pending' || status === 'rejected') && request ? CW.lastReminder(it.id) : null;
  const del = status === 'delegated' && s ? (s.delegate || {}) : null;

  const addFiles = (list) => {
    if (!list || !list.length) return;
    const had = files.length > 0 && status !== 'rejected';
    const wasApproved = status === 'approved';
    const metas = CW.putFiles(list, { by: 'rådgiver', itemId: it.id });
    CW.markReceived(it.id, { by: 'rådgiver', files: metas });
    if (wasApproved) {
      CW.toast(wsFill(wsPlural(metas.length, t('1 fil tilføjet til "{item}". Punktet er stadig godkendt.'), t('{n} filer tilføjet til "{item}". Punktet er stadig godkendt.')), { item: label }));
      return;
    }
    CW.toast(wsFill(had
      ? wsPlural(metas.length, t('1 fil tilføjet til "{item}". Godkend punktet, når du har set det igennem.'), t('{n} filer tilføjet til "{item}". Godkend punktet, når du har set det igennem.'))
      : wsPlural(metas.length, t('1 fil uploadet til "{item}". Godkend punktet, når du har set det igennem.'), t('{n} filer uploadet til "{item}". Godkend punktet, når du har set det igennem.')), { item: label }));
    CW.focusSoon('#ws-item-' + it.id + ' [data-act="approve"]');
  };
  const onFiles = (e) => { const list = e.target.files; addFiles(list && Array.from(list)); e.target.value = ''; };
  const pick = () => { const f = fileRef.current; if (f) { f.value = ''; f.click(); } };
  // Filer kan trækkes ind på punktet (også flere ad gangen)
  const dropProps = locked ? {} : {
    onDragOver: e => { if (!e.dataTransfer || Array.from(e.dataTransfer.types || []).indexOf('Files') < 0) return; e.preventDefault(); if (!drag) setDrag(true); },
    onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false); },
    onDrop: e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer && Array.from(e.dataTransfer.files || [])); },
  };
  const remind = () => {
    if (!request) { CW.toast(t('Anmodningen er ikke sendt endnu'), { tone: 'warn' }); return; }
    onRemind && onRemind();
  };
  // Rådgiveren har alligevel ikke brug for punktet. Hun vælger selv, om kunden får en mail om det.
  const withdraw = () => {
    CW.setSelection({ ...CW.selection(), [it.id]: false });
    wsRequestMore(() => { setTimeout(() => wsScrollTo('ws-material'), 80); CW.focusSoon('#ws-material-title'); });
  };
  // Punktet bliver i listen med et grønt flueben; beskeden har Fortryd
  const approve = () => {
    const cur = CW.itemState(it.id);
    if (!cur || cur.status === 'approved') return;
    CW.approve(it.id);
    CW.toast(wsFill(t('"{item}" er godkendt og flyttet til Materiale på sagen.'), { item: label }), { action: { label: t('Fortryd'), onClick: () => CW.unreview(it.id) } });
    wsFocusAfterReview(it.id);
  };
  // Fortryd godkendelse kan selv fortrydes fra beskeden
  const unapprove = () => {
    CW.unreview(it.id);
    CW.toast(wsFill(t('Godkendelsen af "{item}" er fortrudt. Punktet venter igen på din gennemgang.'), { item: label }), {
      action: { label: t('Fortryd'), onClick: () => CW.approve(it.id) },
    });
    CW.focusSoon('#ws-item-' + it.id + ' [data-act="approve"]');
  };
  const doReject = ({ reason, sendMail }) => {
    CW.reject(it.id, reason);
    setRejecting(false);
    if (sendMail) CW.log('rejection-mail', wsFill(t('Mail om afvisning sendt til {to}: {item}'), { to: (request && request.to && (request.to.name || request.to.email)) || t('kunden'), item: label }), { who: 'rådgiver', itemId: it.id });
    CW.toast(sendMail ? wsFill(t('"{item}" er afvist, og kunden har fået en mail.'), { item: label }) : wsFill(t('"{item}" er afvist. Der er ikke sendt en mail.'), { item: label }), { tone: 'info' });
    wsFocusAfterReview(it.id);
  };

  // Linje 2: statusikon, indhold (filer eller tekst) og én grå meta, og til
  // højre handlingerne. Med filer står hver fil på sin egen linje med sin egen
  // meta (hvem og hvornår); ikon og handlinger står kun på den første.
  // Klokkeslættet står i title.
  const review = status === 'received' || status === 'noted';
  const optional = it.tag === 'Valgfri';
  const quiet = dropped && !review;            // ikke længere påkrævet: grå, uden handlinger
  const showFiles = (status === 'received' || status === 'approved' || status === 'rejected' || (quiet && files.length > 0)) && files.length > 0;
  const parts = [];
  const tipParts = [];
  let lead = null;                             // tekst før metaen (i stedet for filer)
  let at = null;
  if (showFiles) {
    at = s && s.at;
    if (status === 'rejected' && s && s.reviewedAt) parts.push(t('Afvist') + ' ' + wsDay(s.reviewedAt));
  } else if (review || status === 'approved') {
    at = s.at;
    const who = s.viaPreview ? wsFill(t('tilføjet i forhåndsvisning af {name}'), { name: adv.name }) : byAdvisor ? t('uploadet af dig') : t('modtaget');
    if (status !== 'approved' || !s.reviewedAt) parts.push(who + ' ' + wsDay(s.at));
    if (status === 'noted') lead = <><span style={{ color: 'var(--c-text-2)' }}>{s.noteKind === 'anden-maade' ? t('Sendt på anden måde:') : s.noteKind === 'ikke-relevant' ? t('Ikke relevant for kunden:') : t('Kunden har ingen fil:')}</span> <span style={{ color: 'var(--c-ink)' }}>{s.note || t('ingen forklaring')}</span></>;
    else if (!files.length && !s.answers) lead = <span style={{ color: 'var(--c-text-2)' }}>{t('Markeret som sendt uden fil')}</span>;
  } else if (status === 'rejected' && s) {
    at = s.reviewedAt;
    parts.push(t('Afvist') + ' ' + wsDay(s.reviewedAt));
  } else if (status === 'delegated' && del) {
    at = del.at || (s && s.at);
    // Kunden har sendt punktet videre: en ventetilstand som "Afventer kunden"
    const role = del.role ? String(del.role).toLowerCase() : '';
    parts.push(role === 'revisor' ? t('Afventer revisor') : role === 'bank' ? t('Afventer kundens bank') : t('Afventer kundens rådgiver'));
    if (del.name) parts.push(del.name);
    if (at) parts.push(wsFill(t('sendt videre {date}'), { date: wsDay(at) }));
  } else if (!quiet) {
    at = request ? wsItemRequestedAt(request, it.id) : null;
    if (optional) parts.push(t('Valgfri'), t('ikke modtaget'));
    else {
      // Gruppen hedder allerede "Afventer kunden"; rækken siger, hvornår der blev spurgt
      // Anmodet og frist står som tooltip på titlen, ikke som en linje under den
      tipParts.push(at ? wsFill(t('Anmodet {date}'), { date: wsDay(at) }) : t('Afventer kunden'));
      if (request && request.deadline) tipParts.push(t('frist') + ' ' + wsDay(request.deadline));
    }
  }
  if (quiet) parts.push(t('Ikke længere påkrævet'));
  // Din note til kunden (ved afvisning) følger punktet, også når det er sendt videre
  if ((status === 'rejected' || status === 'delegated' || status === 'approved') && s && s.reviewNote) parts.push(t('Din note:') + ' ' + s.reviewNote);
  if (optional && (review || status === 'approved')) parts.push(t('valgfri'));
  if (dropped) parts.push(t('fravalgt i en opdatering'));
  const meta = parts.join(' · ');

  // Hvem sendte filen, og hvornår (filens egne felter, ellers punktets)
  const fileWhen = (f) => f.at || (s && s.at);
  const fileMeta = (f, i) => {
    const by = f.by || (s && s.by);
    const when = fileWhen(f);
    const preview = f.viaPreview || (s && s.viaPreview && by !== 'rådgiver' && (!f.at || !s.at || Date.parse(f.at) >= Date.parse(s.at) - 2000));
    const txt = wsFill(preview ? t('tilføjet i forhåndsvisning {date}') : by === 'rådgiver' ? t('uploadet af dig {date}') : t('fra kunden {date}'), { date: wsDay(when) });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  };

  // Statusikonet (14 px): grøn = modtaget/godkendt, rød = afvist, blå = venter
  // Status som ikon på overskriften: grøn = godkendt, blå = modtaget og venter på din gennemgang, rød = afvist, grå = venter på kunden
  const icon = quiet ? <I.Circle size={15} aria-hidden="true" style={{ color: 'var(--c-text-4)' }}/>
    : status === 'approved' ? <WSCheckDot tone="approved" label={t('Godkendt')} title={s && s.reviewedAt ? t('Godkendt') + ' · ' + wsFill(t('{date} af {name}'), { date: wsDay(s.reviewedAt), name: s.reviewedBy || wsAdvisor().name }) : undefined}/>
    : review ? <WSCheckDot tone="received" label={t('Venter på din gennemgang')}/>
    : status === 'rejected' ? <Icon size={15} aria-hidden="true" style={{ color: 'var(--c-danger)' }}><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></Icon>
    : <I.Clock size={15} aria-hidden="true" style={{ color: 'var(--c-text-3)' }}/>;

  const link = (props, text) => <button type="button" className="btn-link" {...props}>{text}</button>;
  const uploadLink = () => link({ onClick: pick, 'aria-label': wsFill(t('Upload for kunden til {item}'), { item: label }) }, t('Upload for kunden'));

  return (
    <li id={'ws-item-' + it.id} {...dropProps} className={'ws-mat-row' + (drag ? ' drag' : '') + (quiet ? ' quiet' : '') + (groupStart ? ' grp-start' : '')}>
      <div className="ws-mat-row-head">
        <div className="ws-mat-row-title" title={tipParts.length ? tipParts.join(' · ') : undefined} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <span>{label}</span>
        </div>
          {!locked && !rejecting && !quiet && (
            <span className="ws-mat-row-actions">
              <input ref={fileRef} type="file" multiple hidden onChange={onFiles} data-item={it.id} aria-label={wsFill(t('Upload filer for kunden til {item}'), { item: label })}/>
              {(status === 'noted' || status === 'pending' || status === 'rejected' || status === 'delegated') && uploadLink()}
              {(status === 'pending' || status === 'rejected' || status === 'delegated') && link({ onClick: withdraw, title: t('Åbner anmodningen, hvor punktet er fraklikket. Du vælger, om kunden får en mail.'), 'aria-label': wsFill(t('Træk {item} tilbage'), { item: label }) }, t('Træk tilbage'))}
              {(status === 'pending' || status === 'rejected') && !optional && (
                <button type="button" className="btn btn-sm" onClick={remind} aria-label={wsFill(t('Påmind kunden om {item}'), { item: label })}>{t('Påmind')}</button>
              )}
              {status === 'rejected' && files.length > 0 && (
                <button type="button" className="btn btn-sm btn-primary" data-act="approve" onClick={approve} aria-label={wsFill(t('Godkend {item} alligevel'), { item: label })} title={t('Du tog fejl: godkend materialet alligevel')}>{t('Godkend')}</button>
              )}
              {review && (
                <>
                  <button type="button" className="btn btn-sm btn-primary" data-act="approve" onClick={approve} aria-label={wsFill(t('Godkend {item}'), { item: label })}>{t('Godkend')}</button>
                  <button type="button" className="btn btn-sm" onClick={() => setRejecting(true)} aria-label={wsFill(t('Afvis {item}'), { item: label })}>{t('Afvis')}</button>
                </>
              )}
              {status === 'approved' && (
                <button type="button" className="btn btn-sm" onClick={unapprove} aria-label={wsFill(t('Fortryd godkendelse af {item}'), { item: label })}>{t('Fortryd')}</button>
              )}
            </span>
          )}
      </div>
      {(showFiles || lead || meta) && (
      <div className={'ws-mat-row-line' + (showFiles ? ' files' : '')}>
        {showFiles ? (
          <div className="ws-mat-row-main ws-mat-flist">
            {meta && <div className="ws-mat-meta">{meta}</div>}
            {files.map((f, i) => {
              const url = CW.fileUrl(f.id);
              const canRemove = !locked && (files.length > 1 || status === 'approved') && CW.canRemoveFile(it.id, f.id, 'rådgiver');
              const when = fileWhen(f);
              return (
                <div key={f.id} className="ws-mat-fline">
                  {url
                    ? <a className="ws-mat-fname" href={url} target="_blank" rel="noopener noreferrer" aria-label={t('Åbn') + ' ' + f.name} title={f.name + (f.sizeLabel ? ' (' + f.sizeLabel + ')' : '')}>{f.name}</a>
                    : <span className="ws-mat-fname off" title={f.name + ' · ' + t('Filen findes kun i den fane, hvor den blev uploadet')}>{f.name}</span>}
                  {canRemove && (
                    <button type="button" className="ws-mat-x" aria-label={wsFill(t('Fjern {file}'), { file: f.name })} title={t('Fjern')}
                      onClick={() => cwConfirmRemove(f.name, wsFill(files.length === 1 ? t('Filen fjernes fra "{item}", og punktet står igen som ikke modtaget.') : t('Filen fjernes fra "{item}".'), { item: label })).then(ok => { if (ok) CW.removeFile(it.id, f.id, 'rådgiver'); })}>
                      <I.X size={11}/>
                    </button>
                  )}
                  <span className="ws-mat-fmeta" title={when ? CW.fmtWhen(when) : undefined}>
                    {fileMeta(f, i)}
                    {i === files.length - 1 && !locked && !rejecting && !quiet && (status === 'received' || status === 'approved') && (
                      <button type="button" className="ws-req-link" data-act="add-file" onClick={pick} title={t('Tilføj en fil mere')} aria-label={wsFill(t('Tilføj en fil mere til {item}'), { item: label })}
                        style={{ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, marginLeft: 4, textDecoration: 'none', verticalAlign: 'middle', borderRadius: 4 }}><I.Plus size={12}/></button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <span className="ws-mat-row-main" title={at ? CW.fmtWhen(at) : undefined}>
            {lead}
            {meta && <span className="ws-mat-meta">{(lead ? ' · ' : '') + meta}</span>}
          </span>
        )}
      </div>
      )}

      {drag && <div style={{ fontSize: 12, color: 'var(--c-primary)', margin: '4px 0 0 22px' }}>{t('Slip filerne for at uploade på kundens vegne')}</div>}
      <div className="ws-mat-row-more">
        {s && s.answers && Array.isArray(s.answers.countries) && s.answers.countries.length > 0 && (() => {
          const list = s.answers.countries.filter(c => c && (c.name || c.code));
          const sum = list.reduce((n, c) => n + (Number(c.pct) || 0), 0);
          const pct = (v) => wsNum(v, 1) + (window.CW_LANG === 'en' ? '%' : ' %');
          return (
            <div style={{ marginTop: 8, maxWidth: 520 }}>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginBottom: 4 }}>{t('Kundens svar: salg fordelt på lande')}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, border: '1px solid var(--c-line)', borderRadius: 6, background: '#fff' }}>
                <tbody>
                  {list.map((c, i) => (
                    <tr key={(c.code || c.name) + i} style={{ borderTop: i ? '1px solid var(--c-line-2)' : 'none' }}>
                      <th scope="row" style={{ textAlign: 'left', fontWeight: 500, color: 'var(--c-ink)', padding: '5px 9px' }}>{t(c.name || c.code)}</th>
                      <td className="mono num" style={{ textAlign: 'right', padding: '5px 9px', whiteSpace: 'nowrap' }}>{pct(c.pct)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid var(--c-line)' }}>
                    <th scope="row" style={{ textAlign: 'left', fontWeight: 600, color: 'var(--c-text-2)', padding: '5px 9px' }}>{t('I alt')}</th>
                    <td className="mono num" style={{ textAlign: 'right', padding: '5px 9px', fontWeight: 600, color: Math.round(sum) === 100 ? 'var(--c-ink)' : 'var(--c-danger)' }}>{pct(sum)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}
        {s && s.note && status !== 'noted' && (
          <div style={{ fontSize: 13, color: 'var(--c-text)', marginTop: 4, lineHeight: 1.45 }}>
            {/* note er leverandørens bemærkning (kunden, eller dig ved upload for kunden);
                reviewNote er din note til kunden ved gennemgang */}
            <span style={{ color: 'var(--c-text-2)' }}>{s.noteKind === 'system' ? t('Kilde:') : byAdvisor && !s.viaPreview ? t('Din bemærkning ved upload:') : t('Kundens bemærkning:')}</span> {s.noteKind === 'system' ? t(s.note) : s.note}
          </div>
        )}

        {rejecting && <WSRejectModal it={it} onClose={() => setRejecting(false)} onDone={doReject}/>}
      </div>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Dialog med kunden: spørgsmål og svar mellem rådgiver og kunde
   ──────────────────────────────────────────────────────────────────────── */
function CustomerDialog({ note } = {}) {
  // Samme samtale som kundens side (customer_status.jsx): én tråd, nyeste nederst
  return <CWConversation side="rådgiver" idPrefix="ws" variant="workspace" note={note}/>;
}

/* ─────────────────────────────────────────────────────────────────────────
   Indstilling: klarhedstjek før, kvittering efter

   Klarhedstjekket er en port. Hvert punkt er én linje:
   - block:  blokerer indstillingen (afslag, materiale ikke godkendt, afsnit
             ikke gennemgået, uløste blokerende kommentarer)
   - reason: kræver en begrundelse (tomme felter, passerede kritiske datoer,
             valgfrit materiale der ikke er kommet, åbne kommentarer)
   - info:   til orientering (betingelser før udbetaling, sprunget kundeinput)
   - ok:     i orden
   ──────────────────────────────────────────────────────────────────────── */
// opts.cites: tag kildehenvisningerne med (kun klarhedstjekket selv; pille og
// knap behøver dem ikke, fordi de ikke blokerer)
function wsReadiness(stage, opts) {
  opts = opts || {};
  const rows = [];
  const cs = CW.caseState();
  const p = CW.progress();
  const request = CW.request();
  const st = CW.items();
  const F = wsFacts();
  const toOutstanding = { label: t('Gå til udestående'), focus: 'ws-outstanding' };
  const toMemo = { label: t('Åbn memo'), memo: {} };
  // Dybdelink til et afsnit: "Åbn afsnit 2" med det fulde navn som aria-label
  const toSection = (k, name) => ({
    label: wsFill(t('Åbn afsnit {num}'), { num: String(name || '').split('.')[0] || k }),
    aria: wsFill(t('Åbn afsnit {name}'), { name: name || k }),
    memo: { section: k },
  });

  // Afslag
  if (stage === 'declined') {
    rows.push({ id: 'declined', group: 'block', title: t('Sagen er afslået'), text: t('Genoptag sagen, før den kan indstilles.'), action: { label: t('Gå til sagen'), focus: 'ws-hero' } });
  }

  // Materiale fra kunden: ét punkt pr. anmodet punkt, der ikke er godkendt.
  // Valgfrie punkter, der ikke er kommet, blokerer ikke og kræver ingen begrundelse.
  if (stage === 'ready-skip') {
    rows.push({ id: 'skip', group: 'info', title: t('Kundeinput er sprunget over'), text: cs.skipReason ? t('Begrundelse') + ': ' + cs.skipReason : t('Sagen indstilles på det offentlige grundlag og de dokumenter, der allerede findes.') });
  } else if (!request) {
    rows.push({ id: 'no-request', group: 'block', title: t('Der er ikke anmodet om materiale'), text: t('Anmod kunden om materiale, eller spring kundeinput over med en begrundelse på siden Sagen.'), action: { label: t('Gå til sagen'), focus: 'ws-hero' } });
  } else {
    CW.requestedItems().forEach(it => {
      const s = st[it.id];
      const status = s ? s.status : 'pending';
      if (status === 'approved') return;
      const optional = it.tag === 'Valgfri';
      const waitingOnMe = status === 'received' || status === 'noted';
      if (optional && (status === 'pending' || status === 'delegated')) {
        rows.push({ id: 'item-' + it.id, group: 'info', optional: true, name: t(it.label), title: t(it.label) + ' (' + t('valgfri') + ')', text: t('Ikke modtaget, ikke påkrævet') });
        return;
      }
      const text = waitingOnMe ? t('Modtaget, afventer din gennemgang')
        : status === 'rejected' ? t('Afvist, afventer ny levering fra kunden')
        : status === 'delegated' ? t('Hos kundens rådgiver')
        : t('Ikke modtaget fra kunden');
      rows.push({ id: 'item-' + it.id, group: 'block', title: t(it.label) + (optional ? ' (' + t('valgfri') + ')' : ''), text, action: toOutstanding });
    });
    if (p.total && wsMaterialReady(p)) rows.push({ id: 'material-ok', group: 'ok', title: t('Materiale fra kunden'), text: wsMaterialSummary(p) });
  }

  // Memoet (memo.jsx stiller CW_MEMO_STATUS til rådighed)
  const m = wsMemoStatus();
  if (!m) {
    rows.push({ id: 'memo-na', group: 'block', title: t('Memoets status kan ikke læses'), text: t('Åbn memoet, så status kan beregnes.'), action: toMemo });
  } else {
    const secs = Array.isArray(m.sections) ? m.sections : [];
    const secName = (k) => { const s = secs.find(x => x.k === k); return s ? t(s.name) : k; };
    const reviewed = wsMemoReviewed(m);
    // Højst 3 afsnit listes enkeltvis; mangler flere, står de som én række,
    // der åbner det første afsnit, som ikke er gennemgået
    const unrev = secs.filter(s => !s.reviewedBy);
    if (secs.length && unrev.length <= 3) {
      unrev.forEach(s => rows.push({ id: 'sec-' + s.k, group: 'block', title: t(s.name), text: s.state === 'empty' ? t('Afsnittet er ikke skrevet og ikke gennemgået') : t('Afsnittet er ikke gennemgået'), action: toSection(s.k, t(s.name)) }));
    } else if (secs.length) {
      rows.push({ id: 'sec-all', group: 'block', n: unrev.length, title: t('Credit memo'), text: wsUnreviewedText(unrev.length, secs.length), action: { label: t('Åbn memo'), memo: { section: unrev[0].k } } });
    } else if (reviewed < m.sectionsTotal) {
      rows.push({ id: 'sec-all', group: 'block', n: m.sectionsTotal - reviewed, title: t('Credit memo'), text: wsUnreviewedText(m.sectionsTotal - reviewed, m.sectionsTotal), action: toMemo });
    }
    // Blokerende kommentarer fra Compliance eller Risiko. Kun kontrolfunktionen
    // kan frigive dem; rådgiveren kan svare og bede om frigivelse i memoet.
    const bc = m.blockingComments;
    const bl = Array.isArray(m.blockingList) ? m.blockingList : Array.isArray(bc) ? bc : null;
    if (bl && bl.length) {
      bl.forEach((c, i) => {
        const dept = c.dept || c.role || t('kontrolfunktionen');
        const where = c.sectionName || (c.section ? secName(c.section) : '');
        const asked = c.releaseRequestedAt || c.requestedAt || (c.release && c.release.at) || null;
        rows.push({
          id: 'bc-' + (c.id || i), group: 'block', dept,
          title: wsFill(t('Afventer {dept}'), { dept }),
          text: asked
            ? wsFill(t('Kommentar fra {who} i {section}. Du bad om frigivelse {when}.'), { who: c.author || dept, section: where || t('memoet'), when: wsDay(asked) })
            : wsFill(t('Kommentar fra {who} i {section}. Kun {dept} kan frigive den.'), { who: c.author || dept, section: where || t('memoet'), dept }),
          action: { label: t('Åbn kommentaren'), aria: wsFill(t('Åbn kommentaren fra {who} i {section}'), { who: c.author || dept, section: where || t('memoet') }), memo: { section: c.section || null, commentId: c.id || null } },
        });
      });
    } else if (!bl && Number(bc) > 0) {
      rows.push({ id: 'bc', group: 'block', n: Number(bc), title: t('Uløste kommentarer fra Compliance eller Risiko'), text: wsPlural(Number(bc), t('1 blokerende kommentar skal løses'), t('{n} blokerende kommentarer skal løses')), action: toMemo });
    }

    // Tomme felter. Med memoets feltopdeling (blankGroups): komitéens egne
    // felter tæller ikke, rene skabelonfelter dækkes af én begrundelse, og kun
    // manglende sagsdata kræver en begrundelse pr. felt. Uden den: pr. afsnit
    // som før, dog uden afsnit 11, som komitéen udfylder.
    const g = m.blankGroups && typeof m.blankGroups === 'object' ? m.blankGroups : null;
    if (g) {
      const tpl = Array.isArray(g.template) ? g.template : [];
      const cd = Array.isArray(g.caseData) ? g.caseData : [];
      if (tpl.length) {
        const nSec = tpl.map(f => f.section).filter((k, i, a) => a.indexOf(k) === i).length;
        const ex = tpl.map(f => t(f.label || '')).filter((l, i, a) => l && a.indexOf(l) === i).slice(0, 2).join(', ');
        rows.push({
          id: 'blank-tpl', group: 'reason', n: 1, title: t('Tomme skabelonfelter'),
          text: wsFill(wsPlural(tpl.length, t('1 skabelonfelt uden sagsdata'), t('{n} skabelonfelter uden sagsdata')), {})
            + ' ' + wsPlural(nSec, t('i 1 afsnit'), t('i {n} afsnit')) + (ex ? ' (' + t('fx') + ' ' + ex + ')' : '') + '. ' + t('Én begrundelse dækker dem alle.'),
          action: { label: t('Gå til første felt'), aria: wsFill(t('Gå til første tomme skabelonfelt i {section}'), { section: secName(tpl[0].section) }), memo: { section: tpl[0].section, field: tpl[0].id } },
        });
      }
      cd.forEach((f, i) => rows.push({
        id: 'blank-f-' + (f.id || i), group: 'reason', title: f.label ? t(f.label) : t('Tomt felt'),
        text: wsFill(t('Sagsdata mangler i {section}'), { section: secName(f.section) }),
        action: { label: t('Gå til feltet'), aria: wsFill(t('Gå til feltet {field} i {section}'), { field: f.label ? t(f.label) : '', section: secName(f.section) }), memo: { section: f.section, field: f.id } },
      }));
    } else if (secs.length) {
      secs.filter(s => s.blanks > 0 && s.k !== 'endorsement').forEach(s => rows.push({ id: 'blank-' + s.k, group: 'reason', title: t(s.name), text: wsPlural(s.blanks, t('1 tomt felt'), t('{n} tomme felter')), action: toSection(s.k, t(s.name)) }));
    } else if (m.blanks) {
      rows.push({ id: 'blank', group: 'reason', title: t('Credit memo'), text: wsPlural(m.blanks, t('1 tomt felt'), t('{n} tomme felter')), action: toMemo });
    }

    // Andre åbne kommentarer blokerer ikke og kræver ingen begrundelse
    const other = Math.max(0, (Number(m.openComments) || 0) - wsBlockingComments(m));
    if (other) rows.push({ id: 'comments', group: 'info', title: t('Åbne kommentarer i memoet'), text: wsPlural(other, t('1 kommentar er ikke løst'), t('{n} kommentarer er ikke løst')), action: { label: t('Åbn kommentarerne'), aria: t('Åbn memoets kommentarer'), memo: { comments: true } } });
    if (m.sectionsTotal && reviewed >= m.sectionsTotal) rows.push({ id: 'memo-ok', group: 'ok', title: t('Credit memo'), text: wsFill(t('Alle {n} afsnit er gennemgået.'), { n: m.sectionsTotal }) });

    // Kildehenvisninger i afsnit, der er ændret siden sidste gennemgang eller
    // indstilling (memo.jsx, CW_CITE_ISSUES). Ubekræftede står til orientering;
    // en påstand, der modsiger kilden, kræver en begrundelse.
    const ci = opts.cites ? wsCiteIssues(wsChangedSections(secs)) : null;
    // Tal, der ikke findes i kilden (state 'missing') eller modsiger den
    // (contra), i alle afsnit: én samlet række, der kræver en begrundelse,
    // med dybdelink til hver henvisning. En ren demo giver 0.
    if (ci && ci.bad.length) {
      rows.push({
        id: 'cite-bad', group: 'reason', n: 1,
        title: wsPlural(ci.bad.length, t('1 tal kan ikke findes i kilden'), t('{n} tal kan ikke findes i kilden')),
        text: t('Ret tallet i memoet, eller begrund, hvorfor det står, som det gør.'),
        links: ci.bad.map((c, i) => {
          const where = c.sectionName || (c.section ? secName(c.section) : '');
          const doc = [c.doc || c.docName || '', c.page || c.ref ? wsRef(c.page || c.ref) : ''].filter(Boolean).join(', ');
          return {
            key: i, text: '"' + (c.claim || c.text || '') + '"' + (where ? ' ' + wsFill(t('i {section}'), { section: where }) : '')
              + (doc ? ' · ' + doc : '') + (c.state === 'contra' ? ' · ' + t('modsiger kilden') : ' · ' + t('ikke fundet i kilden')),
            label: t('Åbn'), aria: wsFill(t('Åbn henvisningen i {section}'), { section: where || t('memoet') }),
            memo: c.section ? { section: c.section } : null,
          };
        }),
      });
    }
    // Henvisninger, der kun kan bekræftes delvist (fx fundet i andet format),
    // i afsnit ændret siden sidste gennemgang eller indstilling: til orientering
    if (ci && ci.nUnv > 0) {
      const f0 = ci.unverified[0] || {};
      rows.push({
        id: 'cite-unverified', group: 'info', n: 1, title: t('Henvisninger, der ikke kan bekræftes'),
        text: wsPlural(ci.nUnv, t('1 henvisning kunne ikke bekræftes i et afsnit, der er ændret siden sidste gennemgang eller indstilling.'), t('{n} henvisninger kunne ikke bekræftes i afsnit, der er ændret siden sidste gennemgang eller indstilling.')),
        action: f0.section ? toSection(f0.section, f0.sectionName || secName(f0.section)) : null,
      });
    }
  }

  // Datoer i sagens tidslinje. En frist eller betingelse, der skulle være nået
  // (kommende, men datoen er passeret, eller type deadline/condition), kræver en
  // begrundelse. En historisk hændelse (status 'passeret') er til orientering.
  (F.keyDates || []).forEach((d, i) => {
    if (!d || !d.text) return;
    const isDeadline = d.type === 'deadline' || d.type === 'condition' || (!d.type && d.status === 'kommende');
    if (isDeadline && d.status !== 'bekræftet' && d.date && CW.isPast(d.date)) {
      rows.push({ id: 'date-' + i, group: 'reason', title: wsFact(d, 'text'), text: wsFill(t('Fristen {date} er passeret'), { date: CW.fmtDate(d.date) }), source: d.source });
    } else if (d.status === 'passeret') {
      rows.push({ id: 'date-' + i, group: 'info', title: wsFact(d, 'text'), text: d.date ? wsFill(t('Hændelse {date}'), { date: CW.fmtDate(d.date) }) : t('Hændelse i sagens forløb'), source: d.source });
    }
  });

  // Betingelser før udbetaling: indgår i indstillingen, blokerer ikke
  (F.conditions || []).forEach((c, i) => {
    if (!c || !c.text) return;
    rows.push({ id: 'cond-' + (c.id || i), group: 'info', cond: true, done: c.status === 'opfyldt', title: wsFact(c, 'text'), text: c.status === 'opfyldt' ? t('Opfyldt') : t('Skal være opfyldt før udbetaling'), source: c.source });
  });
  // id'erne bruges i element-id'er og CSS-selektorer (fx "financing:1")
  rows.forEach(r => { r.id = String(r.id).replace(/[^\w-]/g, '-'); });
  return rows;
}

// Afsnit ændret siden sidste gennemgang (memo.jsx: changedAfterReview) eller
// siden sidste indstilling (sammenlignet med den frosne version på samme sprog)
function wsChangedSections(secs) {
  const out = (secs || []).filter(s => s.changedAfterReview).map(s => s.k);
  const snap = CW.memoSnapshot();
  if (snap && snap.sections && typeof window.CW_MEMO_SNAPSHOT === 'function') {
    try {
      const now = window.CW_MEMO_SNAPSHOT();
      if ((snap.sections.__lang || 'da') === (now.__lang || 'da')) {
        Object.keys(now).forEach(k => { if (k.indexOf('__') !== 0 && snap.sections[k] != null && snap.sections[k] !== now[k] && out.indexOf(k) < 0) out.push(k); });
      }
    } catch (e) {}
  }
  return out;
}
// Memoets tjek af kildehenvisninger (memo.jsx, CW_CITE_ISSUES): ubekræftede
// kun i de ændrede afsnit, påstande der modsiger kilden i alle afsnit.
// null, hvis memoet ikke leverer tjekket.
function wsCiteIssues(changed) {
  const fn = window.CW_CITE_ISSUES;
  if (typeof fn !== 'function') return null;
  const arr = (x) => (Array.isArray(x) ? x : []);
  let all = null;
  try { all = fn() || null; } catch (e) { return null; }
  if (!all) return null;
  const contradicted = arr(all.contra || all.contradicted).map(x => Object.assign({ state: 'contra' }, x));
  const missing = arr(all.unverified).filter(x => x.state === 'missing');
  const soft = arr(all.unverified).filter(x => x.state !== 'missing' && changed && changed.indexOf(x.section) >= 0);
  return { bad: missing.concat(contradicted), unverified: soft, contradicted, nUnv: soft.length };
}

/**
 * Er begrundelsen god nok til komitéens kvittering? Returnerer en fejltekst
 * eller null. Mindst 3 ord, ikke gentagne tegn eller ord, og ikke den samme
 * tekst som ved et andet punkt.
 */
const WS_REASON_MIN_WORDS = 3;
function wsNormReason(v) { return String(v || '').toLowerCase().replace(/[^0-9a-zæøåäöüé]+/g, ' ').trim(); }
function wsReasonProblem(v, others) {
  const s = String(v || '').trim();
  if (!s) return t('Skriv en begrundelse.');
  const norm = wsNormReason(s);
  const words = norm.split(' ').filter(Boolean);
  const uniq = words.filter((w, i, a) => a.indexOf(w) === i);
  if (/([a-zæøå])\1{3,}/i.test(s) || (words.length >= 2 && uniq.length < 2) || new Set(norm.replace(/ /g, '')).size < 4) {
    return t('Teksten består af gentagne tegn eller ord. Skriv en rigtig begrundelse.');
  }
  if (words.length < WS_REASON_MIN_WORDS) return wsFill(t('Skriv mindst {n} ord.'), { n: WS_REASON_MIN_WORDS });
  if ((others || []).some(o => o && wsNormReason(o) === norm)) return t('Samme begrundelse står ved et andet punkt. Skriv, hvad der gælder for netop dette punkt.');
  return null;
}
function wsCount(rows) { return rows.reduce((n, r) => n + (r.n || 1), 0); }
// "Ingen af de 14 afsnit er gennemgået" frem for "14 af 14 afsnit er ikke gennemgået"
function wsUnreviewedText(n, total) {
  return n === total ? wsFill(t('Ingen af de {total} afsnit er gennemgået'), { total })
    : wsFill(t('{n} af {total} afsnit er ikke gennemgået'), { n, total });
}

// En række i indstillingen: titel, én grå linje og en ghost-handling. Gruppens
// overskrift siger, om punktet blokerer, kræver en begrundelse eller er i orden.
function WSCheckRow({ r, runAction, go, caseId, children }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: '1px solid var(--c-line-2)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: 'var(--c-ink)', fontWeight: 600, lineHeight: 1.4 }}>{r.title}</div>
        {(r.text || r.source) && (
          <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 1, lineHeight: 1.5 }}>
            {r.text} {r.source && <WSSourceLink source={r.source} go={go} caseId={caseId} back={{ route: 'workspace:' + caseId + ':indstil', label: t('Tilbage til indstillingen') }}/>}
          </div>
        )}
        {r.links && r.links.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
            {r.links.map(l => (
              <li key={l.key} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 0', borderTop: '1px solid var(--c-line-2)', fontSize: 13, color: 'var(--c-text-2)', lineHeight: 1.45 }}>
                <span style={{ flex: 1, minWidth: 0 }}>{l.text}</span>
                {l.memo && <button type="button" className="btn-ghost-sm" aria-label={l.aria} onClick={() => runAction({ memo: l.memo })}>{l.label}</button>}
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
      {r.action && <button type="button" className="btn-ghost-sm" onClick={() => runAction(r.action)} aria-label={r.action.aria || undefined} style={{ flexShrink: 0 }}>{r.action.label}</button>}
    </li>
  );
}

// En gruppe i indstillingen. Kaldes som funktion (ikke som komponent), så
// begrundelsesfelterne ikke mister fokus, når der skrives.
function WSCheckGroup({ title, count, rows, children, id, runAction, go, caseId }) {
  if (!rows.length) return null;
  return (
    <section key={id} className="card" aria-labelledby={id} style={{ padding: '12px 22px 6px', marginBottom: 14 }}>
      <h3 id={id} style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>
        {title}{count != null && <span style={{ fontWeight: 400, color: 'var(--c-text-3)' }}> ({count})</span>}
      </h3>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{children || rows.map(r => <WSCheckRow key={r.id} r={r} runAction={runAction} go={go} caseId={caseId}/>)}</ul>
    </section>
  );
}

function WSIndstil({ go, caseId, caseData, focusOverview }) {
  CW.useCase();
  const cs = CW.caseState();
  const stage = wsStage();
  const adv = wsAdvisor();
  // Begrundelser og note gemmes i sagen, mens de skrives, så de overlever
  // genindlæsning og faneskift (CW.caseState().submitDraftReasons)
  const [note, setNote] = React.useState(() => cs.submitDraftNote || '');
  // Efter en tilbagetrækning er begrundelserne fra sidste indstilling
  // forudfyldt (matchet på punktets id, ældre versioner på punktets tekst)
  const [prefillFrom] = React.useState(() => (!cs.submittedAt && Array.isArray(cs.submitReasons) && cs.submitReasons.length ? (cs.submitVersion || 1) : null));
  const [reasons, setReasons] = React.useState(() => {
    const pre = {};
    if (!cs.submittedAt && Array.isArray(cs.submitReasons) && cs.submitReasons.length) {
      const rows = wsReadiness(wsStage(), { cites: true }).filter(r => r.group === 'reason');
      cs.submitReasons.forEach(x => {
        if (!x || !x.reason) return;
        const row = x.id ? rows.find(r => r.id === x.id) : rows.find(r => (r.title + ': ' + r.text) === x.text);
        if (row) pre[row.id] = x.reason;
      });
    }
    return Object.assign(pre, cs.submitDraftReasons || {});
  });
  const [touched, setTouched] = React.useState({});
  const [tried, setTried] = React.useState(false);
  const saveTimer = React.useRef(null);
  const latest = React.useRef({ reasons, note });
  latest.current = { reasons, note };
  // Begrundelserne gemmes i stilhed
  const persist = () => { clearTimeout(saveTimer.current); saveTimer.current = null; if (!CW.caseState().submittedAt) CW.setCaseState({ submitDraftReasons: latest.current.reasons, submitDraftNote: latest.current.note }); };
  const persistSoon = () => { clearTimeout(saveTimer.current); saveTimer.current = setTimeout(persist, 400); };
  React.useEffect(() => () => { if (saveTimer.current) persist(); }, []);
  const setReason = (id, v) => { setReasons(x => ({ ...x, [id]: v })); persistSoon(); };

  // Siden får fokus på overskriften, når man kommer hertil, og når den skifter
  // mellem indstilling og kvittering
  React.useEffect(() => { CW.focusSoon('#ws-indstil-title'); }, [!!cs.submittedAt]);

  const runAction = (a) => {
    if (!a) return;
    if (a.memo) wsRunMemoLink(a.memo);
    else if (a.tab) go('workspace:' + caseId + ':' + a.tab);
    else focusOverview(a.focus);
  };

  const titleStyle = { margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--c-ink)', letterSpacing: '-0.02em', outline: 'none' };
  const leadStyle = { fontSize: 14, color: 'var(--c-text-2)', margin: '6px 0 0', lineHeight: 1.55, maxWidth: 640 };

  // Kvitteringen: titel, én sætning og det, der kun står her (begrundelser,
  // betingelser, kommentarer og note). Version, dato og sagsnummer står i
  // sagshovedet, og den indstillede version åbnes derfra.
  if (cs.submittedAt) {
    const snap = CW.memoSnapshot();
    const last = (cs.history || []).filter(h => h.type === 'submitted').slice(-1)[0];
    const reasonsList = Array.isArray(cs.submitReasons) ? cs.submitReasons : null;
    const openList = Array.isArray(cs.submitOpen) ? cs.submitOpen.map(x => typeof x === 'string' ? x : (x && (x.text || '')) || '') : [];
    const conds = Array.isArray(cs.submitConditions) ? cs.submitConditions : [];
    const sub = { color: 'var(--c-text-2)', fontWeight: 400 };
    const rows = [];
    if (reasonsList && reasonsList.length) rows.push({ label: t("Begrundelser"), value: <ul style={{ margin: 0, paddingLeft: 16 }}>{reasonsList.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a.text}<br/><span style={sub}>{t('Begrundelse')}: {a.reason}</span></li>)}</ul> });
    else if (!reasonsList && openList.length) rows.push({ label: t("Begrundelser"), value: <ul style={{ margin: 0, paddingLeft: 16 }}>{openList.map((a, i) => <li key={i}>{a}</li>)}</ul> });
    if (conds.length) rows.push({ label: t("Betingelser før udbetaling"), value: <ul style={{ margin: 0, paddingLeft: 16 }}>{conds.map((c, i) => <li key={i}>{c}</li>)}</ul> });
    // Åbne kommentarer ved indstillingen (frosset ved indstilling)
    const openAtSubmit = Array.isArray(cs.submitOpenComments) ? cs.submitOpenComments : [];
    if (openAtSubmit.length) rows.push({ label: t('Åbne kommentarer'), value: <ul style={{ margin: 0, paddingLeft: 16 }}>{openAtSubmit.map((c, i) => (
      <li key={i} style={{ marginBottom: 4 }}>{c.sectionName ? c.sectionName + ': ' : ''}{c.text}<br/>
        <span style={sub}>{[c.author, c.dept].filter(Boolean).join(', ')} · {t('ikke løst ved indstillingen')}</span>
      </li>))}</ul> });
    // Blokerende kommentarer, som kontrolfunktionen frigav før indstillingen (frosset ved indstilling)
    const released = Array.isArray(cs.submitResolved) ? cs.submitResolved : [];
    if (released.length) rows.push({ label: t('Frigivne kommentarer'), value: <ul style={{ margin: 0, paddingLeft: 16 }}>{released.map((c, i) => (
      <li key={i} style={{ marginBottom: 4 }}>{c.sectionName ? c.sectionName + ': ' : ''}{c.text}<br/>
        <span style={sub}>{wsDot(wsFill(t('Frigivet af {who} {when}'), { who: [c.resolvedBy, c.resolvedByDept].filter(Boolean).join(', '), when: c.resolvedAt ? wsDay(c.resolvedAt) : '' }) + (c.reason ? '.' : ''))}{c.reason ? ' ' + t('Begrundelse') + ': ' + c.reason : ''}</span>
      </li>))}</ul> });
    if (cs.submitNote) rows.push({ label: t("Note til komitéen"), value: cs.submitNote });
    return (
      <div className="page page-wide" style={{ maxWidth: 780, padding: '40px 32px 80px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 id="ws-indstil-title" tabIndex={-1} style={titleStyle}>{t('Sagen er indstillet')}</h2>
          <p style={leadStyle} title={CW.fmtWhen(cs.submittedAt)}>
            {wsFill(t('Sendt til kreditkomitéen {date} af {who}. Memoet er låst som version {v}.'), { date: wsDay(cs.submittedAt), who: (last && last.by) || adv.name, v: cs.submitVersion || 1 })}
            {!snap && ' ' + t('Memoets indhold blev ikke gemt ved indstillingen.')}
          </p>
        </div>

        {rows.length > 0 && (
          <div className="card" style={{ padding: '6px 22px', marginBottom: 16 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--c-line-2)', fontSize: 13.5 }}>
                <span style={{ color: 'var(--c-text-2)', width: 170, flexShrink: 0 }}>{r.label}</span>
                <span style={{ color: 'var(--c-ink)', fontWeight: 500, flex: 1, minWidth: 220, lineHeight: 1.5 }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="btn btn-ghost" onClick={wsWithdraw}>{t('Træk indstilling tilbage')}</button>
      </div>
    );
  }

  const checks = wsReadiness(stage, { cites: true });
  const blockRows = checks.filter(c => c.group === 'block');
  const reasonRows = checks.filter(c => c.group === 'reason');
  const infoRows = checks.filter(c => c.group === 'info');
  const okRows = checks.filter(c => c.group === 'ok');
  // Tallene tæller de rækker, brugeren ser (én samlet række for memoets afsnit tæller som én)
  const nBlock = blockRows.length, nReason = wsCount(reasonRows);
  // Betingelserne før udbetaling står som én række med en fold
  const condRows = infoRows.filter(r => r.cond);
  const condDone = condRows.filter(r => r.done).length;
  const optRows = infoRows.filter(r => r.optional);
  const infoShown = (condRows.length ? [{
    id: 'conds', title: t('Betingelser før udbetaling'),
    text: wsPlural(condRows.length, t('1 betingelse'), t('{n} betingelser')) + ', ' + wsFill(t('{n} opfyldt'), { n: condDone }),
  }] : []).concat(infoRows.filter(r => !r.cond && !(optRows.length > 1 && r.optional)));
  // Flere valgfrie punkter, der ikke er kommet, står som én række med navnene
  if (optRows.length > 1) infoShown.splice(condRows.length ? 1 : 0, 0, { id: 'optional', title: t('Valgfrit materiale, ikke modtaget'), text: optRows.map(r => r.name).join(', ') });
  // Hver begrundelse tjekkes for sig og mod de andre (samme tekst to steder afvises)
  const problems = {};
  reasonRows.forEach(r => {
    // Felter med manglende sagsdata må gerne have samme begrundelse; ellers skal teksterne være forskellige
    const cd = (x) => /^blank-f-/.test(x.id);
    const others = reasonRows.filter(x => x.id !== r.id && !(cd(r) && cd(x))).map(x => reasons[x.id]);
    problems[r.id] = wsReasonProblem(reasons[r.id], others);
  });
  const missingReasons = reasonRows.filter(r => problems[r.id]);
  const canSend = nBlock === 0 && missingReasons.length === 0;

  const submit = () => {
    setTried(true);
    if (!canSend) {
      if (!nBlock && missingReasons.length) CW.focusSoon('#ws-reason-' + missingReasons[0].id);
      return;
    }
    const list = reasonRows.map(r => ({ id: r.id, text: r.title + ': ' + r.text, reason: reasons[r.id].trim() }));
    const conds = condRows.map(r => r.done ? r.title + ' (' + t('opfyldt') + ')' : r.title);
    let snapshot = null;
    if (typeof window.CW_MEMO_SNAPSHOT === 'function') { try { snapshot = window.CW_MEMO_SNAPSHOT(); } catch (e) { snapshot = null; } }
    clearTimeout(saveTimer.current); saveTimer.current = null;
    CW.submit({ note: note.trim(), open: list.map(x => x.text + '. ' + t('Begrundelse') + ': ' + x.reason), snapshot, reasons: list, conditions: conds });
    // Frigivne blokerende kommentarer fryses med i kvitteringen. Kladden til
    // begrundelserne er brugt; næste indstilling starter forfra.
    const m = wsMemoStatus();
    const resolved = m && Array.isArray(m.resolvedComments) ? m.resolvedComments.filter(c => c && c.blocking) : [];
    // Åbne kommentarer, der ikke blokerer, fryses også med (indstillingen nævner dem til orientering)
    const openCs = m && Array.isArray(m.openList) ? m.openList.filter(c => c && !c.blocking) : [];
    CW.setCaseState({ submitDraftReasons: null, submitDraftNote: null,
      submitOpenComments: openCs.map(c => ({ sectionName: c.sectionName || '', author: c.author || '', dept: c.dept || '', text: c.text || '' })),
      submitResolved: resolved.map(c => ({ sectionName: c.sectionName || '', text: c.text || '', resolvedBy: c.resolvedBy || '', resolvedByDept: c.resolvedByDept || '', resolvedAt: c.resolvedAt || null, reason: c.reason || '' })) });
    CW.toast(wsFill(t('Sagen er indstillet til kreditkomitéen (version {v})'), { v: CW.caseState().submitVersion || 1 }));
  };

  const Group = (props) => WSCheckGroup({ ...props, runAction, go, caseId });
  const backToIndstil = { route: 'workspace:' + caseId + ':indstil', label: t('Tilbage til indstillingen') };

  return (
    <div className="page page-wide" style={{ maxWidth: 820, padding: '40px 32px 80px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 id="ws-indstil-title" tabIndex={-1} style={titleStyle}>{t('Indstil til kreditkomité')}</h2>
        <p style={leadStyle}>{t('Løs det, der blokerer, og begrund resten. Memoet låses, når du indstiller.')}</p>
        {prefillFrom && nReason > 0 && (
          <p style={{ ...leadStyle, fontSize: 13, marginTop: 8 }}>
            {wsFill(t('Begrundelserne er hentet fra version {v}. Læs dem igen, og ret dem, hvis noget er ændret.'), { v: prefillFrom })}
          </p>
        )}
      </div>

      {Group({ id: 'ws-grp-block', title: t('Blokerer indstillingen'), count: nBlock, rows: blockRows })}

      {Group({ id: 'ws-grp-reason', title: t('Kræver en begrundelse'), count: nReason, rows: reasonRows, children: (<>
        {reasonRows.map(r => {
          const v = reasons[r.id] || '';
          const problem = problems[r.id];
          // Kravet står der hele tiden; fejlen vises, når man har forladt feltet eller forsøgt at indstille
          const bad = !!problem && (tried || (touched[r.id] && v.trim().length > 0));
          const hintId = 'ws-reason-hint-' + r.id;
          return (
            <WSCheckRow key={r.id} r={r} runAction={runAction} go={go} caseId={caseId}>
              <div className="field" style={{ marginTop: 8 }}>
                <label htmlFor={'ws-reason-' + r.id} style={{ fontSize: 12 }}>{t('Begrundelse')}</label>
                <textarea id={'ws-reason-' + r.id} className="input" rows={2} value={v}
                  aria-label={wsFill(t('Begrundelse for {item}'), { item: r.title })}
                  aria-invalid={bad || undefined} aria-describedby={hintId}
                  onChange={e => setReason(r.id, e.target.value)}
                  onBlur={() => { setTouched(x => ({ ...x, [r.id]: true })); if (saveTimer.current) persist(); }}
                  style={{ height: 'auto', padding: '7px 10px', resize: 'vertical', lineHeight: 1.45, fontFamily: 'inherit', borderColor: bad ? 'var(--c-danger)' : undefined }}/>
                <div id={hintId} style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4, color: bad ? 'var(--c-danger)' : 'var(--c-text-3)' }}>
                  {bad ? problem : wsFill(t('Mindst {n} ord.'), { n: WS_REASON_MIN_WORDS })}
                </div>
              </div>
            </WSCheckRow>
          );
        })}
      </>) })}

      {Group({ id: 'ws-grp-info', title: t('Til orientering'), count: infoShown.length, rows: infoShown, children: (<>
        {infoShown.map(r => r.id !== 'conds' ? <WSCheckRow key={r.id} r={r} runAction={runAction} go={go} caseId={caseId}/> : (
          <WSCheckRow key={r.id} r={r} runAction={runAction} go={go} caseId={caseId}>
            <CWFold id="ws-conds" label={t('Vis betingelser')} count={condRows.length} style={{ borderTop: 0 }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {condRows.map(c => (
                  <li key={c.id} style={{ padding: '6px 0', borderTop: '1px solid var(--c-line-2)', fontSize: 13, lineHeight: 1.45 }}>
                    <span style={{ color: 'var(--c-ink)' }}>{c.title}</span>
                    {c.done && <span style={{ color: 'var(--c-text-3)' }}> · {c.text}</span>}
                    {c.source && <> <WSSourceLink source={c.source} go={go} caseId={caseId} back={backToIndstil}/></>}
                  </li>
                ))}
              </ul>
            </CWFold>
          </WSCheckRow>
        ))}
      </>) })}
      {Group({ id: 'ws-grp-ok', title: t('I orden'), rows: okRows })}

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="ws-submit-note">{t('Note til kreditkomitéen (valgfri)')}</label>
        <textarea id="ws-submit-note" className="input" rows={3} value={note} onChange={e => { setNote(e.target.value); persistSoon(); }}
          placeholder={t('Fx: Indstilles til bevilling på vilkårene i Bilag 1.')}
          style={{ height: 'auto', padding: '8px 10px', resize: 'vertical', lineHeight: 1.45, fontFamily: 'inherit' }}/>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        {!canSend && (
          <span id="ws-submit-msg" role={tried ? 'alert' : undefined} style={{ flex: 1, minWidth: 220, fontSize: 13, color: tried ? 'var(--c-danger)' : 'var(--c-text-2)', textAlign: 'right' }}>
            {nBlock ? wsPlural(nBlock, t('1 punkt skal løses, før sagen kan indstilles.'), t('{n} punkter skal løses, før sagen kan indstilles.'))
              : wsPlural(missingReasons.length, t('1 begrundelse mangler eller opfylder ikke kravet.'), t('{n} begrundelser mangler eller opfylder ikke kravet.'))}
          </span>
        )}
        <button id="ws-submit-btn" type="button" className="btn btn-primary" aria-disabled={!canSend} aria-describedby={!canSend ? 'ws-submit-msg' : undefined} onClick={submit} style={wsOff(!canSend)}>
          {t('Indstil til kreditkomité')}
        </button>
      </div>
    </div>
  );
}

window.WorkspaceShell = WorkspaceShell;
window.StageHero = StageHero;
window.DeclinedBlock = DeclinedBlock;
window.WSMaterialModal = WSMaterialModal;
window.WSOutstandingCard = WSOutstandingCard;
window.WSMaterialCard = WSMaterialCard;
window.CustomerDialog = CustomerDialog;
