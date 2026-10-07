// De dele, kundeportalen (src/new_case_portal.jsx) og sagen deler.
//
// CWTimeline er portalens statusside (tidslinjen); WSCustomerStatus viser den
// alene, hvis portalen ikke kan vises som forhåndsvisning. CWNotedForm ("Har vi
// ikke / ikke relevant"), CWTradeForm (salg pr. land), CWCustomerBanner (nye svar
// øverst) og CWConversation/CWDialogCard (samtalen med rådgiveren, også i sagen)
// bruges på tværs, så kunde og rådgiver møder samme form og tekst. Alt læses fra
// og skrives til den fælles sagstilstand i src/case_state.js (window.CW).

// Rådgiverens kontaktoplysninger. DATA.ADVISOR (eller DATA.COMPANY.advisor)
// vinder, når stamdata har dem; ellers samme demo-rådgiver som i sagen.
const CS_ADVISOR_FALLBACK = { name: 'Mette Larsen', title: 'Kreditrådgiver', org: 'EIFO', phone: '+45 35 29 86 42', email: 'mette.larsen@eifo.dk' };
const CS_MAX_BYTES = 50 * 1024 * 1024;

function csAdvisor() {
  const co = (window.DATA && DATA.COMPANY) || {};
  const a = (window.DATA && DATA.ADVISOR) || co.advisor || null;
  return Object.assign({}, CS_ADVISOR_FALLBACK, a && typeof a === 'object' ? a : {});
}
const csFirst = (name) => String(name || '').trim().split(/\s+/)[0] || '';

// Udfylder {navn} i en allerede oversat tekst
function csFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

function csInitials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// yyyy-mm-dd som lokal dato (ikke UTC), ellers en almindelig ISO-tid
function csDay(iso) {
  if (!iso) return null;
  if (iso instanceof Date) return iso;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(iso);
  return isNaN(d) ? null : d;
}

function csAddWorkdays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let k = 0;
  const step = n < 0 ? -1 : 1;
  while (k < Math.abs(n)) { d.setDate(d.getDate() + step); const w = d.getDay(); if (w !== 0 && w !== 6) k++; }
  return d;
}

// Procent med ét decimal i sprogets format: 35 -> "35", 12.5 -> "12,5"
function csPct(v) {
  const r = Math.round(v * 10) / 10;
  const s = Number.isInteger(r) ? String(r) : r.toFixed(1);
  return window.CW_LANG === 'en' ? s : s.replace('.', ',');
}

// Til "Nyt"-mærket og banneret: har kunden set den seneste besked i tråden?
function csLastMsg(q) { return q.replies && q.replies.length ? q.replies[q.replies.length - 1] : q; }
function csUnreadForCustomer(q) {
  const last = csLastMsg(q);
  return last.from !== 'kunde' && (!q.readBy || !q.readBy.kunde || q.readBy.kunde < last.at);
}

// Kundens navn: den anmodningen er sendt til, ellers sagens kontaktperson
function csCustomerName() {
  const req = CW.request();
  return (req && req.to && req.to.name) || (window.DATA && DATA.REQUEST_RECIPIENT && DATA.REQUEST_RECIPIENT.name) || t('Kunden');
}

// En systemnote ("Hentet fra e-conomic") er en kilde, ikke kundens bemærkning
function csSourceText(s) {
  if (!s || !s.note || s.noteKind !== 'system') return '';
  return String(s.note).replace(/^Hentet fra/, t('Hentet fra'));
}

const csVisuallyHidden = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };
const csLinkBtn = { background: 'none', border: 0, padding: '2px 0', minHeight: 24, margin: 0, font: 'inherit', fontWeight: 600, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' };

// Filtyper, kunden kan sende ("PDF, Excel, Word eller billeder"). Bruges både som
// accept på filfelterne og til at afvise filer, der trækkes ind (fx .exe).
const CS_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.heic,.webp,.tif,.tiff';
function csAllowed(f, accept) {
  const name = String((f && f.name) || '').toLowerCase();
  return (accept || CS_ACCEPT).split(',').map(x => x.trim().toLowerCase()).some(ext => ext && name.endsWith(ext));
}
/**
 * Filtrerer filer før upload: forkert filtype eller over 50 MB afvises med en
 * venlig besked. onReject(tekst) viser beskeden ved feltet; uden den bliver det
 * en toast. onReject('') betyder, at alt gik igennem.
 */
function csAcceptFiles(fileList, accept, onReject) {
  const files = Array.from(fileList || []);
  const bad = files.filter(f => !csAllowed(f, accept));
  const tooBig = files.filter(f => csAllowed(f, accept) && f.size > CS_MAX_BYTES);
  const types = /\.doc/.test(accept || CS_ACCEPT) ? t('PDF, Excel, Word og billeder') : t('Excel, CSV og PDF');
  const msg = bad.length ? csFill(t('{navn} kan ikke sendes. Vi tager kun imod {typer}.'), { navn: bad[0].name, typer: types })
    : tooBig.length ? csFill(t('{navn} er større end 50 MB og blev ikke uploadet'), { navn: tooBig[0].name }) : '';
  if (onReject) onReject(msg);
  else if (msg) CW.toast(msg, { tone: 'warn' });
  return files.filter(f => csAllowed(f, accept) && f.size <= CS_MAX_BYTES);
}

/**
 * Kladder pr. punkt (CF1): det, kunden har valgt eller skrevet, men ikke sendt.
 * { [itemId]: { at, rows?, note?, files?: FileMeta[] } } under en kabul:-nøgle, så
 * "Nulstil demo" rydder dem. Filerne ligger allerede i IndexedDB (CW.putFiles), så
 * de kan åbnes og sendes efter genindlæsning. Forhåndsvisningen gemmer ingen kladder.
 */
const CS_DRAFT_KEY = 'kabul:portal-drafts:nordhavn';
function csDrafts() {
  try { const v = JSON.parse(localStorage.getItem(CS_DRAFT_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
function csDraft(itemId) { return csDrafts()[itemId] || null; }
function csSaveDraft(itemId, patch) {
  if (CW.isPreview()) return null;
  const all = csDrafts();
  const d = Object.assign({}, all[itemId] || {}, patch, { at: new Date().toISOString() });
  const empty = !(d.rows && d.rows.length) && !(d.files && d.files.length) && !(d.note && d.note.trim());
  if (empty) delete all[itemId]; else all[itemId] = d;
  try { localStorage.setItem(CS_DRAFT_KEY, JSON.stringify(all)); } catch (e) {}
  return empty ? null : d;
}
function csClearDraft(itemId) {
  const all = csDrafts(); if (!all[itemId]) return;
  delete all[itemId];
  try { localStorage.setItem(CS_DRAFT_KEY, JSON.stringify(all)); } catch (e) {}
}
// Valgte filer lægges straks i demoens fillager, så de overlever genindlæsning
// På Kundeside (forhåndsvisning) er det rådgiveren, der uploader på kundens vegne
function csStageFiles(files, itemId) { return CW.putFiles(files, { by: CW.isPreview() ? 'rådgiver' : 'kunde', itemId }); }
function csHHMM(iso) { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
// Dato uden klokkeslæt til lister ("30. sep."); det fulde tidspunkt kan stå i title (T11)
function csShortDate(iso) { return String(CW.fmtWhen(iso) || '').replace(/ \d{2}:\d{2}$/, ''); }

function csOpenFile(f) {
  const url = CW.fileUrl(f.id);
  if (url) window.open(url, '_blank', 'noopener');
  else CW.notInDemo(f.name);
}

/**
 * Kunden fjerner en fil. Kun egne filer, og kun efter bekræftelse, fordi Mette
 * allerede har fået den. Rådgiverens uploads kan kunden ikke fjerne.
 */
function csRemoveOwnFile(itemId, file) {
  if (!CW.canRemoveFile(itemId, file.id, 'kunde')) {
    CW.toast(csFill(t('{navn} har tilføjet filen, så kun hun kan fjerne den.'), { navn: csFirst(csAdvisor().name) }), { tone: 'info' });
    return Promise.resolve(false);
  }
  return CW.confirm({
    title: csFill(t('Fjern {navn}?'), { navn: file.name }),
    text: csFill(t('{navn} har allerede fået filen. Hun kan se i sagens historik, at I har fjernet den.'), { navn: csFirst(csAdvisor().name) }),
    confirmLabel: t('Fjern filen'), danger: true,
  }).then(r => {
    if (!r.ok) return false;
    CW.removeFile(itemId, file.id, 'kunde');
    CW.toast(csFill(t('{navn} er fjernet'), { navn: file.name }));
    return true;
  });
}

/** Kan kunden fortryde hele punktet? Kun hvis alt i det er kundens eget. */
function csCanUndo(s) {
  if (!s || s.status === 'approved' || s.status === 'rejected') return false;
  if ((s.by || 'kunde') !== 'kunde') return false;
  // Et svar på rådgiverens spørgsmål: fortryd ville også trække de tidligere filer tilbage
  if (s.answer) return false;
  return (s.files || []).every(f => (f.by || s.by) === 'kunde');
}
function csConfirmUndo(itemId) {
  const s = CW.itemState(itemId);
  const it = CW.itemById(itemId);
  const label = it ? t(it.label) : '';
  const adv = csFirst(csAdvisor().name);
  const text = s && s.status === 'noted' ? t('Bemærkningen trækkes tilbage, og punktet står igen som manglende.')
    : s && s.status === 'delegated' ? t('Linket til hjælperen lukkes, og punktet står igen som manglende.')
    : csFill(t('Det, I har sendt, trækkes tilbage, og punktet står igen som manglende. {navn} kan se det i sagens historik.'), { navn: adv });
  return CW.confirm({ title: csFill(t('Fortryd {punkt}?'), { punkt: label }), text, confirmLabel: t('Fortryd'), danger: true })
    .then(r => {
      if (!r.ok) return false;
      CW.resetItem(itemId, 'kunde');
      CW.toast(csFill(t('{punkt} står igen som manglende'), { punkt: label }), { tone: 'info' });
      return true;
    });
}

/**
 * Tråde, der var ulæste, da kunden så siden. Huskes, mens visningen er åben, så
 * "Nyt" og banneret ikke forsvinder i samme øjeblik, de markeres som læst. Skifter
 * visningen (resetKey), er trådene set, og mærkerne ryddes.
 * I forhåndsvisningen markeres intet som læst: det er ikke kunden, der kigger.
 */
function useCsFreshThreads(preview, resetKey) {
  const fresh = React.useRef(new Set());
  const keyRef = React.useRef(resetKey);
  if (keyRef.current !== resetKey) { keyRef.current = resetKey; fresh.current = new Set(); }
  const qs = CW.questions();
  qs.forEach(q => { if (csUnreadForCustomer(q)) fresh.current.add(q.id); });
  const unread = preview ? '' : qs.filter(csUnreadForCustomer).map(q => q.id).join(',');
  React.useEffect(() => {
    if (!unread) return;
    unread.split(',').forEach(id => CW.markRead(id, 'kunde'));
  }, [unread]);
  return fresh.current;
}

/* ── Nye beskeder øverst ─────────────────────────────────────────────────── */

// Afviste punkter står kun i deres egen række (K5); her står kun nye svar og
// spørgsmål fra rådgiveren, som én stille linje med et link til samtalen.
function CWCustomerBanner({ fresh, onDialog }) {
  CW.useCase();
  const adv = csFirst(csAdvisor().name);
  // Når kunden har klikket sig til dialogen, er de nye beskeder set
  const [seen, setSeen] = React.useState(false);
  const threads = seen ? [] : CW.questions().filter(q => fresh && fresh.has(q.id) && csLastMsg(q).from === 'rådgiver');
  const newQ = threads.filter(q => q.from === 'rådgiver' && !(q.replies || []).length).length;
  const newR = threads.length - newQ;
  if (!threads.length) return null;

  const parts = [];
  if (newR) parts.push(
    <button key="rep" type="button" style={csLinkBtn} onClick={() => { setSeen(true); onDialog && onDialog(); }}>
      {newR === 1 ? csFill(t('1 nyt svar fra {navn}'), { navn: adv }) : csFill(t('{n} nye svar fra {navn}'), { n: newR, navn: adv })}
    </button>);
  if (newQ) parts.push(
    <button key="q" type="button" style={csLinkBtn} onClick={() => { setSeen(true); onDialog && onDialog(); }}>
      {newQ === 1 ? csFill(t('1 nyt spørgsmål fra {navn}'), { navn: adv }) : csFill(t('{n} nye spørgsmål fra {navn}'), { n: newQ, navn: adv })}
    </button>);

  return (
    <div role="status" className="cs-banner" style={{ marginBottom: 12, fontSize: 13.5, lineHeight: 1.5, color: 'var(--c-text)' }}>
      {parts.reduce((acc, p, i) => acc.concat(i ? [<span key={'s' + i} aria-hidden="true"> · </span>, p] : [p]), [])}
    </div>
  );
}

/* ── "Har vi ikke / ikke relevant": forklaring eller fil ─────────────────── */

function CWNotedForm({ itemId, onDone, onCancel, idPrefix }) {
  const it = CW.itemById(itemId);
  const adv = csFirst(csAdvisor().name);
  const pid = (idPrefix || 'cs') + '-noted-' + itemId;
  const [kind, setKind] = React.useState('none');
  const [text, setText] = React.useState('');
  const [files, setFiles] = React.useState([]);
  const [err, setErr] = React.useState('');
  const inputRef = React.useRef(null);
  const label = it ? t(it.label) : '';

  const submit = () => {
    const txt = text.trim();
    if (!txt && !files.length) {
      setErr(t('Skriv en kort forklaring, eller vælg en fil.'));
      CW.focusSoon('#' + pid + '-text');
      return;
    }
    csClearDraft(itemId);
    if (files.length) {
      const metas = CW.putFiles(files, { by: 'kunde', itemId });
      CW.markReceived(itemId, { by: 'kunde', files: metas, note: txt });
      CW.toast(csFill(t('{punkt} er sendt til {navn}'), { punkt: label, navn: adv }));
    } else {
      const note = (kind === 'na' ? t('Ikke relevant for os') + ': ' : '') + txt;
      CW.markNoted(itemId, { by: 'kunde', note, kind: kind === 'other' ? 'anden-maade' : 'har-vi-ikke' });
      CW.toast(kind === 'other'
        ? csFill(t('{navn} kan se, hvordan I har sendt {punkt}'), { navn: adv, punkt: label.toLowerCase() })
        : csFill(t('{navn} kan se, at I ikke sender {punkt}'), { navn: adv, punkt: label.toLowerCase() }));
    }
    onDone && onDone();
  };

  const placeholder = kind === 'other' ? t('Fx: Sendt med post til Mette 2. oktober.')
    : kind === 'na' ? t('Fx: Vi har ingen lån ud over kassekreditten.')
    : t('Fx: Vi har ingen ejeraftale.');
  return (
    <div className="cs-form" style={{ marginTop: 10, padding: 14, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 10 }}>
      <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-ink)', padding: 0, marginBottom: 6 }}>{t('Hvorfor sender I ikke en fil?')}</legend>
        <div style={{ display: 'flex', gap: '4px 18px', flexWrap: 'wrap', fontSize: 13.5 }}>
          {[['none', 'Har vi ikke'], ['na', 'Ikke relevant for os'], ['other', 'Sendt på anden måde']].map(([k, l]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minHeight: 28 }}>
              <input type="radio" name={pid + '-kind'} checked={kind === k} onChange={() => setKind(k)}/> {t(l)}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={pid + '-text'} style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--c-text-2)', margin: '10px 0 4px' }}>
        {kind === 'other' ? t('Hvordan og hvornår har I sendt det?') : csFill(t('Kort forklaring til {navn}'), { navn: adv })}
      </label>
      <textarea id={pid + '-text'} rows={2} value={text} autoFocus
        aria-invalid={err ? 'true' : undefined} aria-describedby={err ? pid + '-err' : undefined}
        onChange={e => { setText(e.target.value); if (err) setErr(''); }} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + (err ? 'var(--c-danger)' : 'var(--c-line-strong)'), borderRadius: 7, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: '#fff', color: 'var(--c-text)' }}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <input ref={inputRef} type="file" multiple accept={CS_ACCEPT} data-cs-noted={itemId} style={{ display: 'none' }}
          onChange={e => { const f = csAcceptFiles(e.target.files, CS_ACCEPT, setErr); if (f.length) setFiles(p => p.concat(f)); e.target.value = ''; }}/>
        <button type="button" className="btn btn-sm" onClick={() => inputRef.current && inputRef.current.click()}><I.Upload size={11}/> {t('Vedhæft en fil i stedet')}</button>
        {files.map((f, i) => (
          <span key={i + f.name} className="tag" style={{ fontSize: 12, gap: 4 }}>
            <I.File size={11}/> {f.name}
            <button type="button" aria-label={csFill(t('Fjern {navn}'), { navn: f.name })} onClick={() => cwConfirmRemove(f.name, t('Filen er ikke sendt endnu.')).then(ok => { if (ok) setFiles(p => p.filter((_, j) => j !== i)); })}
              style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0, minWidth: 24, minHeight: 24, display: 'grid', placeItems: 'center', color: 'var(--c-text-3)' }}><I.X size={11}/></button>
          </span>
        ))}
      </div>
      {err && <div id={pid + '-err'} role="alert" style={{ fontSize: 12, color: 'var(--c-danger)', marginTop: 6 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
        {onCancel && <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>{t('Annullér')}</button>}
        <button type="button" className="btn btn-sm btn-primary" data-cust-act="send" onClick={submit}><I.Send size={11}/> {csFill(t('Send til {navn}'), { navn: adv })}</button>
      </div>
    </div>
  );
}

/* ── Salg fordelt på lande: spørgeskema, der starter tomt, plus rapport ──── */

const CS_COUNTRIES = [
  { c: "DK", n: "Danmark" }, { c: "SE", n: "Sverige" }, { c: "NO", n: "Norge" },
  { c: "FI", n: "Finland" }, { c: "DE", n: "Tyskland" }, { c: "NL", n: "Holland" },
  { c: "FR", n: "Frankrig" }, { c: "GB", n: "Storbritannien" }, { c: "US", n: "USA" },
  { c: "ES", n: "Spanien" }, { c: "IT", n: "Italien" }, { c: "PL", n: "Polen" },
  { c: "BE", n: "Belgien" }, { c: "AT", n: "Østrig" }, { c: "CH", n: "Schweiz" },
  { c: "PT", n: "Portugal" }, { c: "CZ", n: "Tjekkiet" }, { c: "HU", n: "Ungarn" },
  { c: "RO", n: "Rumænien" }, { c: "IE", n: "Irland" }, { c: "CA", n: "Canada" },
  { c: "AU", n: "Australien" }, { c: "JP", n: "Japan" }, { c: "CN", n: "Kina" },
  { c: "IN", n: "Indien" }, { c: "BR", n: "Brasilien" }, { c: "MX", n: "Mexico" },
  { c: "ZA", n: "Sydafrika" }, { c: "AE", n: "UAE" }, { c: "SG", n: "Singapore" },
  { c: "KR", n: "Sydkorea" }, { c: "TR", n: "Tyrkiet" }, { c: "SA", n: "Saudi-Arabien" },
  { c: "NZ", n: "New Zealand" }, { c: "GR", n: "Grækenland" }, { c: "SK", n: "Slovakiet" },
  { c: "HR", n: "Kroatien" }, { c: "RS", n: "Serbien" }, { c: "UA", n: "Ukraine" },
  { c: "EE", n: "Estland" }, { c: "LV", n: "Letland" }, { c: "LT", n: "Litauen" },
];

// Andre navne, kunder skriver (CF3). Små bogstaver.
const CS_COUNTRY_ALIASES = {
  US: ['usa', 'us', 'united states', 'united states of america', 'amerika', 'america', 'forenede stater'],
  GB: ['uk', 'england', 'great britain', 'britain', 'united kingdom', 'storbritannien', 'skotland', 'scotland'],
  NL: ['holland', 'netherlands', 'the netherlands', 'nederlandene'],
  DE: ['germany', 'deutschland'], SE: ['sweden'], NO: ['norway'], FI: ['finland'], FR: ['france'], ES: ['spain'], IT: ['italy'], PL: ['poland'], CN: ['china'], JP: ['japan'],
};

/** Svarene som kort tekst: "Danmark 35 %, Tyskland 30 %" */
function csAnswersText(s) {
  const rows = s && s.answers && s.answers.countries;
  if (!rows || !rows.length) return '';
  return rows.map(r => t(r.name) + ' ' + csPct(r.pct) + ' %').join(', ');
}

const CS_TRADE_ACCEPT = '.pdf,.xlsx,.xls,.csv';

/**
 * Spørgeskemaet. Starter tomt. Efter en afvisning er de tidligere svar og filer
 * med, så kunden kun retter det, Mette bad om. "Færdig" kræver, at summen er
 * 100 %, eller at kunden har vedhæftet en rapport i stedet for at udfylde.
 */
function CWTradeForm({ itemId, onDone, onCancel, idPrefix, doneLabel, answer }) {
  CW.useCase();
  const s = CW.itemState(itemId);
  const pid = (idPrefix || 'cs') + '-trade';
  const rejected = !!(s && s.status === 'rejected');
  const prevRows = s && s.answers && Array.isArray(s.answers.countries)
    ? s.answers.countries.map(x => ({ c: x.code, n: x.name, v: csPct(x.pct) })) : [];
  const draft0 = React.useMemo(() => csDraft(itemId), [itemId]);
  const [rows, setRows] = React.useState(draft0 && draft0.rows ? draft0.rows : prevRows);
  const [kept, setKept] = React.useState(rejected ? ((s && s.files) || []) : []);
  const [staged, setStaged] = React.useState(draft0 && draft0.files ? draft0.files : []);
  const [draftAt, setDraftAt] = React.useState(draft0 ? draft0.at : null);
  const changed = React.useRef(false);
  React.useEffect(() => {
    if (!changed.current) { changed.current = true; return; }
    const d = csSaveDraft(itemId, { rows, files: staged });
    setDraftAt(d ? d.at : null);
  }, [rows, staged]);
  const [fileErr, setFileErr] = React.useState('');
  // Rapporten er et alternativ til skemaet og ligger i en fold, der er åben, når der er filer
  const [repOpen, setRepOpen] = React.useState(() => !!((draft0 && draft0.files && draft0.files.length) || (s && (s.files || []).length)));
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(0);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Filer der allerede ligger på punktet (ikke efter afvisning: dem styrer "kept")
  const current = !rejected && s ? (s.files || []) : [];
  const codes = rows.map(x => x.c);
  const needle = q.trim().toLowerCase();
  const hit = (c) => !needle || t(c.n).toLowerCase().includes(needle) || c.n.toLowerCase().includes(needle) || c.c.toLowerCase() === needle
    || (CS_COUNTRY_ALIASES[c.c] || []).some(a => a.startsWith(needle) || a === needle);
  // Præcise træf (kode eller alias) først, så "us" giver USA før Australien
  const exact = (c) => c.c.toLowerCase() === needle || (CS_COUNTRY_ALIASES[c.c] || []).includes(needle) ? 0 : 1;
  const filtered = CS_COUNTRIES.filter(c => !codes.includes(c.c) && hit(c)).sort((a, b) => exact(a) - exact(b)).slice(0, 8);

  const add = (country) => {
    setRows(prev => [...prev, { ...country, v: '' }]);
    setQ(''); setOpen(false); setHover(0);
    // Fokus til andelen for det nye land, så man kan skrive videre
    setTimeout(() => { const el = document.getElementById(pid + '-v-' + country.c); if (el) el.focus(); }, 30);
  };
  const remove = (code) => setRows(prev => prev.filter(x => x.c !== code));
  const setVal = (code, v) => setRows(prev => prev.map(x => x.c === code ? { ...x, v: v.replace(/[^0-9.,]/g, '') } : x));

  const num = (v) => parseFloat(String(v).replace(',', '.')) || 0;
  const sum = rows.reduce((a, x) => a + num(x.v), 0);
  const sumOk = rows.length > 0 && Math.abs(sum - 100) < 0.05;
  const sumWarn = sum > 0 && !sumOk;
  const fileCount = kept.length + staged.length + current.length;
  // Med en rapport er skemaet valgfrit: et halvt udfyldt skema blokerer ikke, men sendes kun med, når summen er 100 %
  // Efter et spørgsmål kræver "Færdig" noget nyt: en fil, et ændret skema, en fjernet fil eller et svar
  const fresh = staged.length > 0 || !!answer || JSON.stringify(rows) !== JSON.stringify(prevRows) || kept.length !== ((s && s.files) || []).length;
  const canSave = (fileCount > 0 || (rows.length > 0 && sumOk)) && (!rejected || fresh);
  const sendRows = rows.length > 0 && sumOk;

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHover(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHover(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open && filtered[hover]) add(filtered[hover]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const save = () => {
    if (!canSave) return;
    const metas = staged; // lagt i fillageret, da de blev valgt
    // Efter et spørgsmål står de sendte filer stadig; dem, kunden har fjernet her, fjernes nu
    if (rejected) ((s && s.files) || []).filter(f => !kept.some(k => k.id === f.id)).forEach(f => CW.removeFile(itemId, f.id, 'kunde'));
    csClearDraft(itemId);
    const answers = sendRows ? { countries: rows.map(x => ({ code: x.c, name: x.n, pct: Math.round(num(x.v) * 10) / 10 })) } : null;
    // answer: kundens svar på rådgiverens spørgsmål, skrevet i portalens boks over skemaet
    CW.markReceived(itemId, { by: 'kunde', files: metas, answers, note: answer || '' });
    const it = CW.itemById(itemId);
    CW.toast(csFill(t('{punkt} er sendt til {navn}'), { punkt: it ? t(it.label) : '', navn: csFirst(csAdvisor().name) }));
    onDone && onDone();
  };

  const listId = pid + '-list';
  const sumText = sumOk ? t('Summen passer: 100 %')
    : sumWarn ? (sum < 100 ? csFill(t('Mangler {n} procentpoint'), { n: csPct(100 - sum) }) : csFill(t('{n} procentpoint for meget'), { n: csPct(sum - 100) }))
    : t('Angiv en andel for hvert land');
  const hint = canSave ? (rows.length > 0 && !sumOk ? t('Rapporten sendes. Skemaet kommer kun med, hvis summen er 100 %.') : '')
    : rows.length ? t('Summen skal være 100 %, før I kan sende.') : t('Tilføj mindst ét land, eller vedhæft en rapport.');

  return (
    <div className="cs-trade">
      <p style={{ fontSize: 13.5, color: 'var(--c-text-2)', margin: '0 0 12px', lineHeight: 1.55 }}>
        {t('Tilføj de lande, I sælger til, og skriv ca. andelen af omsætningen. Summen skal være 100 %.')}
      </p>

      <div ref={wrapRef} style={{ position: 'relative', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 40, border: '1px solid ' + (open ? 'var(--c-primary)' : 'var(--c-line-strong)'), borderRadius: 8, background: '#fff', cursor: 'text' }}
          onClick={() => { inputRef.current && inputRef.current.focus(); setOpen(true); }}>
          <I.Search size={13} style={{ color: 'var(--c-text-3)', flexShrink: 0 }}/>
          <input ref={inputRef} id={pid + '-q'} value={q} role="combobox" aria-expanded={open && filtered.length > 0} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={open && filtered[hover] ? pid + '-o-' + filtered[hover].c : undefined}
            aria-label={t('Tilføj et land')} placeholder={t('Tilføj et land, fx Tyskland')}
            onChange={e => { setQ(e.target.value); setOpen(true); setHover(0); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, background: 'transparent', color: 'var(--c-ink)', minWidth: 0, height: '100%' }}/>
        </div>
        {open && filtered.length > 0 && (
          <ul id={listId} role="listbox" aria-label={t('Lande')} style={{ listStyle: 'none', margin: 0, padding: 0, position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden' }}>
            {filtered.map((c, i) => (
              <li key={c.c} id={pid + '-o-' + c.c} role="option" aria-selected={hover === i}
                onMouseEnter={() => setHover(i)} onMouseDown={(e) => { e.preventDefault(); add(c); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', minHeight: 24, borderBottom: i < filtered.length - 1 ? '1px solid var(--c-line-2)' : 'none', background: hover === i ? 'var(--c-surface-2)' : '#fff', cursor: 'pointer' }}>
                <span style={{ fontSize: 13.5, color: 'var(--c-ink)' }}>{t(c.n)}</span>
              </li>
            ))}
          </ul>
        )}
        {open && filtered.length === 0 && needle && (
          <div role="status" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: '12px 14px', fontSize: 13, color: 'var(--c-text-3)' }}>
            {csFill(t('Ingen lande matcher "{q}"'), { q: q.trim() })}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          {rows.map((x, i) => (
            <div key={x.c} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: i > 0 ? '1px solid var(--c-line-2)' : 'none' }}>
              <label htmlFor={pid + '-v-' + x.c} style={{ flex: 1, fontSize: 13.5, color: 'var(--c-ink)', fontWeight: 500 }}>{t(x.n)}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input id={pid + '-v-' + x.c} type="text" inputMode="decimal" value={x.v} placeholder="0" className="mono"
                  onChange={e => setVal(x.c, e.target.value)}
                  style={{ width: 64, height: 32, padding: '0 8px', border: '1px solid var(--c-line-strong)', borderRadius: 6, fontSize: 13, textAlign: 'right' }}/>
                <span className="mono" aria-hidden="true" style={{ fontSize: 12, color: 'var(--c-text-3)', width: 14 }}>%</span>
              </div>
              <button type="button" onClick={() => remove(x.c)} aria-label={csFill(t('Fjern {navn}'), { navn: t(x.n) })}
                style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--c-text-3)' }}>
                <I.X size={13}/>
              </button>
            </div>
          ))}
          <div aria-live="polite" style={{ padding: '10px 14px', borderTop: '1px solid var(--c-line)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, fontSize: 13, color: sumWarn ? 'var(--c-warn)' : 'var(--c-text-2)' }}>{sumText}</div>
            <div className="mono num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)', marginRight: 44 }}>{csPct(sum)} %</div>
          </div>
        </div>
      )}

      {/* Rapport i stedet for eller ud over skemaet. Filfeltet står uden for folden, så det altid findes. */}
      <input ref={fileRef} type="file" multiple accept={CS_TRADE_ACCEPT} data-cs-trade={itemId} style={{ display: 'none' }}
        onChange={e => { const f = csAcceptFiles(e.target.files, CS_TRADE_ACCEPT, setFileErr); if (f.length) { const m = csStageFiles(f, itemId); setStaged(p => p.concat(m)); setRepOpen(true); } e.target.value = ''; }}/>
      <CWFold label={t('Vedhæft en rapport i stedet')} count={fileCount || null} open={repOpen || !!fileErr} onToggle={setRepOpen} id={pid + '-report'}>
        <div style={{ fontSize: 13, color: 'var(--c-text-2)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>{t('Har I en rapport over salget pr. land, kan I vedhæfte den. Så behøver I ikke udfylde skemaet.')}</div>
          <button type="button" className="btn btn-sm" onClick={() => fileRef.current && fileRef.current.click()}><I.Upload size={11}/> {t('Vedhæft rapport')}</button>
        </div>
        {fileErr && <div role="alert" style={{ fontSize: 12.5, color: 'var(--c-danger)', marginTop: 6 }}>{fileErr}</div>}
        {(current.length > 0 || kept.length > 0 || staged.length > 0) && (
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, fontSize: 13 }}>
            {current.map(f => (
              <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                <I.File size={13} style={{ color: 'var(--c-text-3)' }}/><span style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>{f.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>{t('Sendt')}</span>
                {CW.canRemoveFile(itemId, f.id, 'kunde') && <button type="button" className="btn btn-sm btn-ghost" onClick={() => csRemoveOwnFile(itemId, f)} aria-label={csFill(t('Fjern {navn}'), { navn: f.name })}><I.X size={11}/></button>}
              </li>
            ))}
            {kept.map(f => (
              <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                <I.File size={13} style={{ color: 'var(--c-text-3)' }}/><span style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>{f.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>{t('Sendes med igen')}</span>
                {(f.by || 'kunde') === 'kunde' && <button type="button" className="btn btn-sm btn-ghost" onClick={() => cwConfirmRemove(f.name, t('Filen fjernes, når I sender punktet.')).then(ok => { if (ok) setKept(p => p.filter(x => x.id !== f.id)); })} aria-label={csFill(t('Fjern {navn}'), { navn: f.name })}><I.X size={11}/></button>}
              </li>
            ))}
            {staged.map((f, i) => (
              <li key={'n' + i + f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                <I.File size={13} style={{ color: 'var(--c-text-3)' }}/><span style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>{f.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>{CW.fmtSize(f.size)}</span>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => cwConfirmRemove(f.name, t('Filen er ikke sendt endnu.')).then(ok => { if (ok) setStaged(p => p.filter((_, j) => j !== i)); })} aria-label={csFill(t('Fjern {navn}'), { navn: f.name })}><I.X size={11}/></button>
              </li>
            ))}
          </ul>
        )}
      </CWFold>

      <div className="cs-stack" style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {draftAt && <span className="muted cs-draft-at" style={{ fontSize: 12 }}>{csFill(t('Kladde gemt kl. {tid}'), { tid: csHHMM(draftAt) })}</span>}
        {hint && <span id={pid + '-hint'} className="muted" style={{ fontSize: 12 }}>{hint}</span>}
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('Annullér')}</button>}
        <button type="button" className="btn btn-primary" data-cust-act="send" onClick={save} disabled={!canSave} aria-describedby={hint ? pid + '-hint' : undefined}
          style={canSave ? null : { opacity: 0.5, cursor: 'not-allowed' }}>
          {doneLabel || t('Færdig med dette punkt')}
        </button>
      </div>
    </div>
  );
}

/* ── Samtalen mellem kunde og rådgiver ───────────────────────────────────── */

// Emnet på en besked uden for punkterne gemmes på dansk (fx "Årsrapport 2024") og oversættes, når det vises
function csAboutLabel(about) {
  if (!about) return '';
  const m = /^Årsrapport (\d{4})$/.exec(about);
  return m ? t('Årsrapport') + ' ' + m[1] : t(about);
}


/**
 * Én samtale pr. sag, i tidsorden med den nyeste nederst, ens for kunde og rådgiver.
 * side: 'kunde' (portalen og statussiden) eller 'rådgiver' (sagens Overblik).
 * Nye beskeder fra den anden part får en skillelinje, så længe visningen er åben.
 * Samtalen markeres som set, når den vises (ikke i forhåndsvisningen af kundesiden).
 */
// note: én grå linje under skrivefeltet, fx at kunden først ser beskeden, når anmodningen er sendt
function CWConversation({ side, idPrefix, compact, readOnly, variant, bare, note }) {
  CW.useCase();
  const pid = idPrefix || 'cs';
  const adv = csAdvisor();
  const advFirst = csFirst(adv.name);
  const customer = csCustomerName();
  const other = side === 'kunde' ? 'rådgiver' : 'kunde';
  const msgs = CW.conversation();
  const requested = CW.requestedItems();
  const preview = !!(CW.isPreview && CW.isPreview());
  const [text, setText] = React.useState('');
  const [itemId, setItemId] = React.useState('');
  // Emne uden for punkterne (rådgiverens side), fx "Årsrapport 2024" fra de offentlige data
  const [about, setAbout] = React.useState('');
  const listRef = React.useRef(null);
  const taRef = React.useRef(null);
  const advisorSide = side === 'rådgiver';
  const request = CW.request();
  // Mail til kunden, når det er rådgiveren, der skriver: på sagen og i forhåndsvisningen af
  // kundens side (Kundeside). Kun når anmodningen er sendt. Som ved "Stil spørgsmål til materialet"
  const canMail = (advisorSide || (side === 'kunde' && preview)) && !!request && !readOnly;
  const [sendMail, setSendMail] = React.useState(false);
  const [subjectEdit, setSubjectEdit] = React.useState(null);
  const [bodyEdit, setBodyEdit] = React.useState(null);
  const publicTopics = advisorSide && typeof wsPublicTopics === 'function' ? wsPublicTopics() : [];

  // "Spørg kunden" ved de offentlige data (workspace.jsx) åbner samtalen med emnet valgt
  React.useEffect(() => {
    if (!advisorSide) return;
    const onAsk = (e) => {
      setAbout((e.detail && e.detail.about) || ''); setItemId('');
      const el = taRef.current;
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => { try { el.focus({ preventScroll: true }); } catch (x) {} }, 250); }
    };
    window.addEventListener('cw-ask-about', onAsk);
    return () => window.removeEventListener('cw-ask-about', onAsk);
  }, [advisorSide]);

  // Beskeder, der var ulæste, da samtalen blev vist. Huskes, så skillelinjen ikke
  // forsvinder i samme øjeblik, beskederne markeres som set.
  const fresh = React.useRef(null);
  if (!fresh.current) fresh.current = new Set();
  msgs.forEach(m => { if (m.from === other && !m.preview && !CW.isMessageRead(m, side)) fresh.current.add(m.key); });
  const unreadKey = msgs.filter(m => m.from === other && !CW.isMessageRead(m, side)).map(m => m.key).join(',');
  React.useEffect(() => {
    if (!unreadKey || (side === 'kunde' && preview)) return;
    CW.markConversationRead(side);
  }, [unreadKey]);

  // Rul til nyeste besked, når der kommer en ny
  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  // Mailen: emne og tekst bygges af beskeden og kan rettes, før den sendes
  const topic = itemId ? (CW.itemById(itemId) ? t(CW.itemById(itemId).label) : '') : about ? csAboutLabel(about) : '';
  const mailBase = canMail ? CW.requestMail({ items: [], deadline: request.deadline, to: { name: request.to && request.to.name, email: request.to && request.to.email }, link: request.link }) : null;
  const defSubject = mailBase ? (topic ? csFill(t('Vi har et spørgsmål til {item}'), { item: topic }) : t('Besked fra EIFO')) + ' · ' + mailBase.caseLine : '';
  const defBody = mailBase ? [
    mailBase.greeting, '',
    text.trim() || t('[Din besked]'), '',
    t('I kan svare direkte på jeres side hos EIFO:'),
    mailBase.link, '',
    adv.name,
  ].join('\n') : '';
  const mailSubject = subjectEdit != null ? subjectEdit : defSubject;
  const mailBody = bodyEdit != null ? bodyEdit : defBody;

  function send() {
    const txt = text.trim();
    if (!txt) return;
    // I forhåndsvisningen af kundesiden er det rådgiveren, der skriver (fx svarer derinde ved en fejl)
    const asAdvisor = side === 'kunde' && preview;
    if (canMail && sendMail && !mailBody.trim()) return;
    CW.sendMessage(asAdvisor ? 'rådgiver' : side, txt, itemId || null, (!itemId && about) || null);
    const mailed = canMail && sendMail;
    if (mailed) CW.log('dialog-mail', csFill(t('Mail sendt til {to}: {subject}'), { to: (request.to && (request.to.name || request.to.email)) || t('kunden'), subject: mailSubject }), { who: 'rådgiver', itemId: itemId || null });
    CW.markConversationRead(side);
    fresh.current = new Set();
    setText(''); setItemId(''); setAbout(''); setSendMail(false); setSubjectEdit(null); setBodyEdit(null);
    CW.toast(side === 'kunde' && !asAdvisor ? csFill(t('Beskeden er sendt til {navn}'), { navn: advFirst })
      : mailed ? t('Beskeden er sendt, og kunden har fået en mail.') : t('Beskeden er sendt til kunden'));
  }

  // Hvem skrev? Beskeder skrevet i forhåndsvisningen er rådgiverens (D11).
  const author = m => {
    const fromAdv = m.from === 'rådgiver' || m.preview;
    if (side === 'rådgiver') {
      return fromAdv
        ? { name: m.preview ? t('Dig') + ' (' + t('forhåndsvisning') + ')' : t('Dig'), initials: csInitials(adv.name) }
        : { name: customer, initials: csInitials(customer) };
    }
    if (m.preview) return { name: adv.name + ' (' + t('forhåndsvisning') + ')', initials: csInitials(adv.name) };
    return fromAdv ? { name: adv.name, tag: adv.org || 'EIFO', initials: csInitials(adv.name) } : { name: customer, initials: csInitials(customer) };
  };

  const waits = CW.conversationWaitsOn();
  // Status som almindelig tekst (S13): mørk, når der ventes på denne side, ellers grå
  const status = !msgs.length || readOnly ? null
    : bare ? null
    : waits === side ? { text: side === 'kunde' ? t('Venter på jeres svar') : t('Afventer dit svar'), strong: true }
    : waits ? { text: side === 'kunde' ? csFill(t('{navn} svarer typisk inden for 1 arbejdsdag'), { navn: advFirst }) : t('Afventer kunden'), strong: false }
    : null;
  const firstFresh = msgs.findIndex(m => fresh.current.has(m.key));
  const title = side === 'kunde' ? csFill(t('Jeres dialog med {navn}'), { navn: advFirst }) : t('Dialog med kunden');
  const ws = variant === 'workspace';
  const padX = bare ? 0 : 18;

  const list = msgs.length === 0 ? (
    <div style={{ padding: bare ? '4px 0 10px' : compact ? '14px 18px' : '20px 18px', color: 'var(--c-text-3)', fontSize: 13 }}>
      {readOnly ? t('Ingen beskeder.') : t('Ingen beskeder endnu.')}
    </div>
  ) : (
    <ol ref={listRef} aria-label={t('Beskeder')} style={{ listStyle: 'none', margin: 0, padding: '6px ' + padX + 'px', maxHeight: compact || bare ? 320 : 380, overflowY: 'auto' }}>
      {msgs.map((m, i) => {
        const a = author(m);
        const it = m.itemId ? CW.itemById(m.itemId) : null;
        return (
          <li key={m.key} style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div className="avatar" aria-hidden="true" style={{ width: 24, height: 24, fontSize: 9.5, flexShrink: 0 }}>{a.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--c-text-3)' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-ink)' }}>{a.name}</span>
                  {fresh.current.has(m.key) && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-primary)', background: 'var(--c-primary-soft, rgba(52,80,220,0.1))', borderRadius: 999, padding: '0 7px', lineHeight: '17px' }}>{t('Nyt')}</span>}
                  {a.tag && <span>{a.tag}</span>}
                  <span title={CW.fmtWhen(m.at)}>{csShortDate(m.at)}</span>
                  {(it || m.about) && <span>· {it ? t(it.label) : csAboutLabel(m.about)}</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: 1.55, marginTop: 2, whiteSpace: 'pre-wrap' }}>{m.text}</div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );

  const composer = !readOnly && (
    <div style={{ padding: bare ? '10px 0 4px' : '12px 18px 14px', borderTop: bare && !msgs.length ? 0 : '1px solid var(--c-line-2)' }}>
      <label htmlFor={pid + '-msg'} style={csVisuallyHidden}>{side === 'kunde' ? csFill(t('Besked til {navn}'), { navn: advFirst }) : t('Besked til kunden')}</label>
      <textarea ref={taRef} id={pid + '-msg'} className="input" rows={2} value={text} onChange={e => setText(e.target.value)} aria-keyshortcuts="Control+Enter"
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } }}
        placeholder={side === 'kunde' ? (preview ? t('Skriv som rådgiver') : csFill(t('Skriv til {navn}'), { navn: advFirst })) : t('Skriv til kunden')}
        style={{ width: '100%', height: 'auto', padding: '8px 10px', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
        aria-describedby={note ? pid + '-msg-note' : undefined}/>
      {note && <div id={pid + '-msg-note'} style={{ fontSize: 12.5, color: 'var(--c-text-3)', marginTop: 4, lineHeight: 1.5 }}>{note}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <label htmlFor={pid + '-msg-item'} style={{ fontSize: 12.5, color: 'var(--c-text-2)' }}>{t('Handler om')}</label>
        <select id={pid + '-msg-item'} className="input" value={itemId || (about ? 'about:' + about : '')}
          onChange={e => { const v = e.target.value; if (v.indexOf('about:') === 0) { setAbout(v.slice(6)); setItemId(''); } else { setItemId(v); setAbout(''); } }}
          style={{ height: 30, fontSize: 12.5, width: 'auto', maxWidth: '100%' }}>
          <option value="">{t('Sagen generelt')}</option>
          {publicTopics.length > 0 && requested.length > 0
            ? <optgroup label={t('Anmodet materiale')}>{requested.map(it => <option key={it.id} value={it.id}>{t(it.label)}</option>)}</optgroup>
            : requested.map(it => <option key={it.id} value={it.id}>{t(it.label)}</option>)}
          {publicTopics.length > 0 && (
            <optgroup label={t('Offentlige data')}>
              {publicTopics.map(a => <option key={a} value={'about:' + a}>{csAboutLabel(a)}</option>)}
            </optgroup>
          )}
          {/* Et emne, der ikke står på listerne (fx et dokument, der er slettet siden) */}
          {about && publicTopics.indexOf(about) < 0 && <option value={'about:' + about}>{csAboutLabel(about)}</option>}
        </select>
        <div style={{ flex: 1 }}/>
        {/* Først primær, når der er skrevet noget; ellers er sidens egen næste-knap den eneste blå */}
        <button type="button" className={'btn btn-sm' + (text.trim() ? ' btn-primary' : '')} disabled={!text.trim()} onClick={send} title={t('Ctrl+Enter sender')} style={!text.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : null}>
          <I.Send size={12}/> {canMail && sendMail ? t('Send besked og mail') : t('Send')}
        </button>
      </div>
      {canMail && (
        <div className="cs-conv-mail">
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, lineHeight: 1.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={sendMail} onChange={e => setSendMail(e.target.checked)} style={{ accentColor: 'var(--c-primary)', margin: '3px 0 0' }}/>
            <span>{csFill(t('Send også en mail til kunden ({email})'), { email: (request.to && request.to.email) || t('kunden') })}</span>
          </label>
          {sendMail && (
            <>
              <div style={{ border: '1px solid var(--c-line-strong)', borderRadius: 8, overflow: 'hidden', background: '#fff', marginTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', alignItems: 'center', gap: '0 12px', padding: '0 12px', borderBottom: '1px solid var(--c-line)' }}>
                  <label htmlFor={pid + '-mail-subject'} style={{ color: 'var(--c-text-2)', fontSize: 13 }}>{t('Emne')}</label>
                  <input id={pid + '-mail-subject'} value={mailSubject} onChange={e => setSubjectEdit(e.target.value)}
                    style={{ height: 36, border: 0, padding: 0, font: 'inherit', fontSize: 13, minWidth: 0, background: 'transparent', outline: 'none', color: 'var(--c-ink)' }}/>
                </div>
                <textarea aria-label={t('Mailens tekst')} value={mailBody} rows={8} onChange={e => setBodyEdit(e.target.value)}
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', border: 0, padding: 12, font: 'inherit', fontSize: 13, lineHeight: 1.6, resize: 'vertical', minHeight: 160, outline: 'none', color: 'var(--c-ink)' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6, fontSize: 12, color: 'var(--c-text-3)' }}>
                <span>{bodyEdit == null ? t('Mailen følger din besked. Ret den her, hvis den skal lyde anderledes.') : ''}</span>
                {(subjectEdit != null || bodyEdit != null) && <button type="button" className="ws-req-ghost" onClick={() => { setSubjectEdit(null); setBodyEdit(null); }}>{t('Gendan standardtekst')}</button>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  // Uden kort og overskrift, fx inde i portalens fold "Beskeder med Mette" (folden viser selv status)
  if (bare) {
    return (
      <div className="cs-conv">
        {list}
        {composer}
      </div>
    );
  }

  return (
    <section className="card" id={pid + '-dialog'} aria-labelledby={pid + '-dialog-h'} style={{ position: 'relative', marginTop: ws ? 16 : undefined }}>
      <div className="card-head" style={{ borderBottom: '1px solid var(--c-line-2)', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start' }}>
        {ws && <I.Mail size={15} style={{ color: 'var(--c-text-2)' }}/>}
        <h2 id={pid + '-dialog-h'} className="card-title" style={{ margin: 0 }} tabIndex={-1}>{title}</h2>
        <div style={{ flex: 1 }}/>
        {status && <span className={'cw-status' + (status.strong ? ' strong' : '')}>{status.text}</span>}
      </div>
      {list}
      {composer}
    </section>
  );
}
window.CWConversation = CWConversation;

/* Kundens side (portalen og statussiden). `fresh` fra useCsFreshThreads bruges ikke
   længere: samtalen husker selv, hvad der var nyt. */
function CWDialogCard({ idPrefix, compact, readOnly, bare }) {
  return <CWConversation side="kunde" idPrefix={idPrefix} compact={compact} readOnly={readOnly} bare={bare}/>;
}

/* ── Tidslinjen ──────────────────────────────────────────────────────────── */

// Hvornår er sagen oprettet? Faktaarket (indholdsagenten) har datoen, når den findes.
function csCaseOpened() {
  const f = window.CASE_FACTS || {};
  const kd = (f.keyDates || []).find(d => d && /ansøgning|oprettet/i.test(d.text || ''));
  return kd && kd.date ? kd.date : null;
}

/**
 * Tidslinjen følger sagens fase (CW.stage(), CW.caseState(), CW.progress()):
 * - Materialeindsamling er afsluttet, når alle påkrævede punkter er godkendt, når
 *   sagen er klar, eller når den er indstillet.
 * - Kreditanalyse er i gang derefter og afsluttet, når sagen er indstillet.
 * - Kreditindstilling er "hos kreditkomitéen", når sagen er indstillet.
 * Forventede datoer regnes af et anker, der kun kan flytte sig fremad (fristen eller
 * seneste levering), aldrig af godkendelser, indstilling eller "i dag". Forventet
 * afgørelse bliver derfor aldrig tidligere, end kunden allerede har set.
 */
function csTimeline(prog, req, draft, cs) {
  const stage = CW.stage();
  const requested = CW.requestedItems();
  const states = CW.items();
  let lastApproval = null, lastDelivery = null;
  requested.forEach(it => {
    const s = states[it.id];
    if (!s) return;
    if (s.status === 'approved' && s.reviewedAt && (!lastApproval || s.reviewedAt > lastApproval)) lastApproval = s.reviewedAt;
    if (['received', 'noted', 'approved'].includes(s.status) && s.at && (!lastDelivery || s.at > lastDelivery)) lastDelivery = s.at;
  });
  const deadline = csDay((req && req.deadline) || (!req && draft && draft.deadline) || null);

  let anchor = deadline;
  const d = csDay(lastDelivery);
  if (d && (!anchor || d > anchor)) anchor = d;
  if (!anchor && req && req.sentAt) anchor = csAddWorkdays(csDay(req.sentAt), 10);
  const submitted = !!cs.submittedAt;
  const declined = stage === 'declined';
  const materialDone = submitted || prog.requiredApproved || stage === 'ready' || stage === 'ready-skip';
  let expInd = anchor ? csAddWorkdays(anchor, 5) : null;
  let expAfg = anchor ? csAddWorkdays(anchor, 15) : null;
  // Sagens egen frist (ikke kundens svarfrist) er loftet: kunden får ikke datoer efter den.
  // Afgørelsen forventes senest på fristen, indstillingen 3 hverdage før (dog ikke før svarfristen).
  const caseDl = csDay((window.DATA && DATA.COMPANY && DATA.COMPANY.deadlineISO) || null);
  if (caseDl && (!submitted || csDay(cs.submittedAt) <= caseDl)) {
    expAfg = caseDl;
    let ind = csAddWorkdays(caseDl, -3);
    if (anchor && ind < anchor) ind = anchor < caseDl ? anchor : caseDl;
    expInd = ind;
  } else if (submitted) { const s10 = csAddWorkdays(csDay(cs.submittedAt), 10); if (!expAfg || s10 > expAfg) expAfg = s10; }
  const opened = csCaseOpened();
  const L = { materiale: t('Materialeindsamling'), analyse: t('Kreditanalyse'), indstilling: t('Kreditindstilling'), afgorelse: t('Afgørelse') };

  const material = materialDone
    ? { k: 'materiale', label: L.materiale, sub: lastApproval && prog.requiredApproved ? csFill(t('Godkendt {dato}'), { dato: CW.fmtDate(lastApproval) }) : t('Afsluttet'), state: 'done' }
    : !req
      ? { k: 'materiale', label: L.materiale, sub: t('Ikke startet'), state: 'upcoming' }
      : prog.requiredMissing === 0
        ? { k: 'materiale', label: L.materiale, sub: t('Modtaget, afventer gennemgang'), state: 'active' }
        : { k: 'materiale', label: L.materiale, sub: deadline ? csFill(t('Frist {dato}'), { dato: CW.fmtDate(deadline) }) : t('I gang'), state: 'active' };
  return [
    { k: 'oprettet', label: t('Sag oprettet'), sub: opened ? CW.fmtDate(opened) : t('Ansøgningen er modtaget'), state: 'done' },
    material,
    submitted
      ? { k: 'analyse', label: L.analyse, sub: t('Afsluttet'), state: 'done' }
      : materialDone
        ? { k: 'analyse', label: L.analyse, sub: t('I gang'), state: 'active' }
        : { k: 'analyse', label: L.analyse, sub: t('Når materialet er godkendt'), state: 'upcoming' },
    submitted
      ? { k: 'indstilling', label: L.indstilling, sub: csFill(t('Hos kreditkomitéen siden {dato}'), { dato: CW.fmtDate(cs.submittedAt) }), state: 'active' }
      : { k: 'indstilling', label: L.indstilling, sub: expInd ? csFill(t('Forventet {dato}'), { dato: CW.fmtDate(expInd) }) : t('Når materialet er modtaget'), state: 'upcoming' },
    declined
      ? { k: 'afgorelse', label: L.afgorelse, sub: t('Sagen er afsluttet'), state: 'done' }
      : { k: 'afgorelse', label: L.afgorelse, sub: expAfg ? csFill(t('Forventet svar senest {dato}'), { dato: CW.fmtDate(expAfg) }) : t('Når materialet er modtaget'), state: 'upcoming', date: expAfg || null },
  ];
}

/* ── Statussiden ─────────────────────────────────────────────────────────── */

/**
 * Tidslinjen over sagens behandling. Portalens statusside viser kun den og en
 * kvittering (K3): punkterne står ét sted, på portalens oversigt.
 */
function CWTimeline() {
  CW.useCase();
  const stages = csTimeline(CW.progress(), CW.request(), CW.draft(), CW.caseState() || {});
  return (
    <div className="card cs-timeline" style={{ padding: '22px 26px' }}>
      <style>{`@media (max-width: 600px) {
        .cs-timeline { padding: 18px !important; }
        .cs-steps { flex-direction: column !important; gap: 14px; }
        .cs-steps > li { flex-direction: row !important; align-items: flex-start !important; gap: 12px; }
        .cs-steps .cs-line { display: none; }
        .cs-steps .cs-steptext { margin-top: 3px !important; text-align: left !important; padding: 0 !important; }
      }`}</style>
      <h2 style={{ margin: '0 0 18px', fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{t('Behandlingsstatus')}</h2>
      <ol className="cs-steps" style={{ display: 'flex', alignItems: 'flex-start', listStyle: 'none', margin: 0, padding: 0 }}>
        {stages.map((s, i) => {
          const done = s.state === 'done', active = s.state === 'active';
          return (
            <li key={s.k} aria-current={active ? 'step' : undefined} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i < stages.length - 1 && (
                <div aria-hidden="true" className="cs-line" style={{ position: 'absolute', top: 11, left: '50%', width: '100%', height: 2, background: done ? 'var(--c-ink)' : 'var(--c-line-strong)', zIndex: 0 }}/>
              )}
              <div aria-hidden="true" style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', background: done ? 'var(--c-ink)' : '#fff', border: done ? 'none' : active ? '2px solid var(--c-ink)' : '2px solid var(--c-text-4)', color: '#fff', zIndex: 1, position: 'relative', flexShrink: 0, boxSizing: 'border-box' }}>
                {done ? <I.Check size={12}/> : active ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-ink)' }}/> : null}
              </div>
              <div className="cs-steptext" style={{ marginTop: 10, textAlign: 'center', padding: '0 4px' }}>
                <div style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: done || active ? 'var(--c-ink)' : 'var(--c-text-2)' }}>
                  {s.label}
                  <span style={csVisuallyHidden}>{': ' + (done ? t('afsluttet') : active ? t('i gang') : t('kommer senere'))}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>{s.sub}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Kundens status uden for portalen (rådgiverens reserve-forhåndsvisning, hvis
 * portalen ikke kan vises): sagens navn, én linje og tidslinjen.
 */
function WSCustomerStatus({ preview = false } = {}) {
  CW.useCase();
  const co = DATA.COMPANY || {};
  const adv = csAdvisor();
  const req = CW.request();
  const prog = CW.progress();
  const lock = CW.customerLock();
  const lead = lock === 'declined' ? csFill(t('Sagen er afsluttet. Kontakt {navn}, hvis I har spørgsmål.'), { navn: adv.name })
    : lock ? t('Materialet er hos kreditkomitéen. Siden er skrivebeskyttet.')
    : !req ? t('Anmodningen er ikke sendt endnu.')
    : prog.requiredMissing > 0 ? csFill(t('{n} af {m} påkrævede mangler'), { n: prog.requiredMissing, m: prog.required })
    : csFill(t('{navn} gennemgår det, I har sendt.'), { navn: csFirst(adv.name) });
  return (
    <div className="scroll">
      <div className="cs-root" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 64px' }}>
        {preview && <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginBottom: 16 }}>{t('Forhåndsvisning: handlinger her virker, som hvis kunden gjorde dem (demo).')}</div>}
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--c-ink)', letterSpacing: '-0.015em' }}>{co.name}</h1>
        <p style={{ fontSize: 14, color: 'var(--c-text-2)', margin: '6px 0 20px' }}>{lead}</p>
        <CWTimeline/>
      </div>
    </div>
  );
}

window.WSCustomerStatus = WSCustomerStatus;
window.CWTimeline = CWTimeline;
window.CWNotedForm = CWNotedForm;
window.CWTradeForm = CWTradeForm;
window.CWCustomerBanner = CWCustomerBanner;
window.CWDialogCard = CWDialogCard;
