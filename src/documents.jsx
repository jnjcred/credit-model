// Dokumenter: sagens kildedokumenter (DATA.DOCS, bygget af window.CASE_DOCS)
// plus alt der er uploadet i demoen (CW.allUploads()), fra kundesiden,
// portalen eller rådgiveren selv. Alle kildedokumenter har indhold i viseren;
// erstattede budgetversioner står kun som metadata.

/* ── Hjælpere ─────────────────────────────────────────────────────────────── */

// Forhåndsvisning af dokumenter følger flaget window.CW_SOURCE_VIEW (case_facts.js).
const DOC_PREVIEW = window.CW_SOURCE_VIEW === true;

function docFill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

// Emner i dokumentlisten (samme som i anmodningen), ud fra dokumenttypen
const DOC_CATS = [
  { key: 'fin',    label: 'Regnskab og budget',  types: ['Årsrapport', 'Periodetal', 'Budget'] },
  { key: 'debt',   label: 'Gæld og sikkerheder', types: ['Låneaftale', 'Sikkerhed'] },
  { key: 'market', label: 'Marked og drift',     types: ['Kontrakt', 'Marked', 'Salg', 'Præsentation'] },
  { key: 'owners', label: 'Ejere og selskab',    types: ['Selskab'] },
  { key: 'case',   label: 'Ansøgning og rating', types: ['Ansøgning', 'Ratingberegning'] },
  { key: 'export', label: 'Eksport fra Crediwire', types: ['Crediwire-eksport'] },
];

// Dokumenttype ud fra det anmodede punkt, ellers ud fra filnavnet
const DOC_TYPE_BY_ITEM = {
  'm-annual': 'Årsrapport', 'm-interim': 'Periodetal', 'm-budget': 'Budget', 'm-pitch': 'Præsentation',
  'm-ejerbog': 'Selskab', 'm-loans': 'Låneaftale', 'm-security': 'Sikkerhed', 'm-trade': 'Salg', 'm-ownership': 'Selskab',
  'm-fx': 'Selskab', 'm-orderbook': 'Kontrakt',
  'm-assumptions': 'Budget', 'm-lowcase': 'Budget', 'm-group': 'Årsrapport', 'm-protocol': 'Årsrapport', 'm-tech': 'Periodetal',
  'm-agri': 'Periodetal', 'm-capital': 'Selskab', 'm-bizplan': 'Præsentation',
  'm-pub-cvr': 'Selskab', 'm-pub-market': 'Præsentation', 'm-pub-product': 'Præsentation',
};
function inferDocType(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('aarsrapport') || n.includes('årsrapport')) return 'Årsrapport';
  if (n.includes('budget')) return 'Budget';
  if (n.includes('periode') || n.includes('saldo')) return 'Periodetal';
  if (n.includes('laan') || n.includes('lån')) return 'Låneaftale';
  if (n.includes('pant') || n.includes('sikker') || n.includes('kaution')) return 'Sikkerhed';
  if (n.includes('ejer') || n.includes('vedtaeg') || n.includes('vedtæg')) return 'Selskab';
  return 'Andet';
}
// Forslag til punkt i upload-dialogen (vises, vælges ikke i det skjulte)
function suggestItemFor(files, requested) {
  const type = inferDocType(files[0] && files[0].name);
  const hit = requested.find(it => DOC_TYPE_BY_ITEM[it.id] === type && !CW.isApproved(it.id));
  return hit ? hit.id : '';
}

const DOC_ITEM_STATUS = { received: 'Modtaget', approved: 'Godkendt', rejected: 'Afvist' };

// En upload fra CW vist som en række i listen
function docFromUpload(f) {
  return {
    fileId: f.id,
    name: f.name,
    type: (f.itemId && DOC_TYPE_BY_ITEM[f.itemId]) || inferDocType(f.name),
    year: '-',
    size: f.sizeLabel,
    sizeBytes: f.size,
    uploaded: CW.fmtWhen(f.at),
    date: f.at || '',
    status: f.itemId ? (DOC_ITEM_STATUS[f.itemStatus] || 'Modtaget') : 'Ikke knyttet til et punkt',
    origin: 'uploaded',
    sourceLabel: f.by === 'rådgiver' ? 'Uploadet af rådgiver' : 'Kundeupload',
    by: f.by, mime: f.type || '', at: f.at,
    itemId: f.itemId || null, itemLabel: f.itemLabel || '', itemStatus: f.itemStatus || null,
  };
}
const docKey = (d) => (d ? (d.fileId ? 'u:' + d.fileId : 'd:' + d.name) : '');

// Dato til listen: uploads med klokkeslæt, kildedokumenter med dokumentets dato
function docWhen(d) {
  if (!d) return '';
  if (d.fileId) return CW.fmtWhen(d.at);
  return d.date ? DATA.fmt.longDate(d.date) : t('Dato ikke oplyst');
}
// "24 sider" / "6 ark" (og "uddrag, 10 af 24 sider" når viseren kun har et uddrag)
function docPages(d) {
  if (!d || !d.pageCount) return '';
  return d.pageCount + ' ' + t(d.pageUnit === 'ark' ? 'ark' : d.pageCount === 1 ? 'side' : 'sider');
}

/* ── Danske bogstaver i viseren ─────────────────────────────────────────────
   Kildedokumenternes tekst er skrevet uden æøå ("ANPARTSHAVERLAAN", "paa",
   "foer"). Viseren viser dem med æøå. Egennavne (Aalborg, Maersk, -gaard) og
   ord hvor bogstaverne mødes ved et ordskel (dato-en, faktura-er, netto-eff.)
   røres ikke. */
const DOC_DA_KEEP = /^(aalborg|aarhus|alkmaar|maersk|michael|rafael|israel|oem|roe|oe|aage|kaae|noel|zoe)$/i;
const DOC_DA_STEMS = ['dato', 'konto', 'risiko', 'brutto', 'netto', 'faktura', 'valuta', 'kvota', 'skala', 'foto', 'memo', 'euro', 'info', 'video', 'radio', 'auto', 'demo', 'mikro', 'makro', 'bio', 'geo', 'data', 'firma', 'ekstra', 'kontra', 'tele', 'aero'];
function docDaWord(w) {
  if (!/aa|oe|ae/i.test(w) || DOC_DA_KEEP.test(w) || /gaard/i.test(w)) return w;
  const lower = w.toLowerCase();
  let out = '', i = 0;
  while (i < w.length) {
    const pair = lower.slice(i, i + 2);
    const atSeam = DOC_DA_STEMS.some(st => lower.slice(0, i + 1).endsWith(st));
    if ((pair === 'aa' || pair === 'oe' || pair === 'ae') && !atSeam) {
      const ch = pair === 'aa' ? 'å' : pair === 'oe' ? 'ø' : 'æ';
      out += w[i] !== lower[i] ? ch.toUpperCase() : ch;
      i += 2;
    } else { out += w[i]; i++; }
  }
  return out;
}
function docDa(text) { return String(text || '').replace(/[A-Za-zÆØÅæøå]+/g, docDaWord); }
// Del en side i afsnit og markér dem, der er tabeller (to eller flere linjer
// med kolonner adskilt af mindst to mellemrum)
function docBlocks(text) {
  const parts = String(text || '').split(/(\n\s*\n)/);
  return parts.map(p => {
    const lines = p.split('\n').filter(l => l.trim());
    const cols = lines.filter(l => /\S {2,}\S/.test(l.trim())).length;
    const table = lines.length >= 2 && cols >= 2 && cols >= lines.length / 2;
    // Brede tabeller: saml lange mellemrum, så tallene står tæt på teksten i
    // viserens smalle kolonne (hellere lidt skæv end skjult til højre)
    const wide = table && Math.max.apply(null, lines.map(l => l.length)) > 60;
    return { text: wide ? p.replace(/ {3,}/g, '   ') : p, table };
  });
}

/* ── Erstattede versioner ──────────────────────────────────────────────── */
// Fx budget v1 og v2: de findes kun som metadata (læst af versionsloggen);
// indholdet og ændringerne står i versionsloggen i den gældende version.
function SupersededDoc({ doc, onOpen }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 20px', textAlign: 'center', maxWidth: 420 }}>
      <div style={{ width: 56, height: 70, borderRadius: 4, background: '#fff', border: '1px solid var(--c-line)', display: 'grid', placeItems: 'center', color: 'var(--c-text-3)', boxShadow: 'var(--shadow-sm)' }}>
        <I.File size={22}/>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{doc.name}</div>
      <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.55 }}>
        {docFill(t('Denne version er erstattet af {navn}. Filen er ikke med i sagen; ændringerne mellem versionerne står i versionsloggen i den gældende version.'), { navn: doc.supersededBy || '' })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{t('Dateret')} {docWhen(doc)} · {doc.size}</div>
      <button type="button" className="btn btn-sm" onClick={onOpen}><I.FileText className="ic"/> {t('Åbn versionsloggen')}</button>
    </div>
  );
}

/* ── Viser til uploadede filer ─────────────────────────────────────────── */
function UploadedFileViewer({ doc }) {
  const url = CW.fileUrl(doc.fileId);
  const isPdf = /pdf/i.test(doc.mime) || /\.pdf$/i.test(doc.name);
  const isImg = /^image\//i.test(doc.mime) || /\.(png|jpe?g|gif|webp|svg)$/i.test(doc.name);
  const meta = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12, color: 'var(--c-text-2)' }}>
      <span>{t(doc.sourceLabel)}</span>
      <span>{doc.uploaded}</span>
      <span>{doc.size}</span>
      {doc.itemId
        ? <span>{t('Punkt:')} <b style={{ color: 'var(--c-ink)', fontWeight: 600 }}>{t(doc.itemLabel)}</b> · {t(DOC_ITEM_STATUS[doc.itemStatus] || 'Modtaget')}</span>
        : <span>{t('Ikke knyttet til et punkt')}</span>}
    </div>
  );

  if (!url) {
    return (
      <div style={{ maxWidth: 460, padding: '48px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <I.File size={26} style={{ color: 'var(--c-text-3)' }}/>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{doc.name}</div>
        {meta}
        <div style={{ fontSize: 12.5, color: 'var(--c-text-2)', lineHeight: 1.55 }}>
          {t('Filens indhold findes kun i den browsersession, den blev uploadet i. Her kendes kun navn, størrelse og tidspunkt. Upload filen igen for at se den.')}
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {meta}
      {isPdf ? (
        <iframe title={doc.name} src={url} style={{ width: '100%', height: 640, border: '1px solid var(--c-line)', borderRadius: 6, background: '#fff' }}/>
      ) : isImg ? (
        <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 6, padding: 12, textAlign: 'center' }}>
          <img src={url} alt={doc.name} style={{ maxWidth: '100%', maxHeight: 620, objectFit: 'contain' }}/>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <I.File size={26} style={{ color: 'var(--c-text-3)' }}/>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{doc.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--c-text-3)' }}>{t('Denne filtype kan ikke vises her.')} {doc.mime ? '(' + doc.mime + ')' : ''}</div>
          <a className="btn btn-sm" href={url} target="_blank" rel="noopener noreferrer" download={doc.name}><I.Maximize className="ic"/> {t('Åbn fil')}</a>
        </div>
      )}
    </div>
  );
}

/* ── Upload-dialog: hvilket punkt hører filerne til? ────────────────────── */
function AssignUploadDialog({ files, onCancel, onConfirm }) {
  const ref = React.useRef(null);
  CW.useDialog(ref, true, onCancel);
  const requested = CW.requestedItems();
  const [target, setTarget] = React.useState(() => suggestItemFor(files, requested) || '__none');
  const suggested = suggestItemFor(files, requested);
  const statusText = (id) => {
    const s = CW.itemState(id);
    if (!s) return t('Afventer');
    return t(DOC_ITEM_STATUS[s.status] || 'Modtaget');
  };
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,20,0.45)', display: 'grid', placeItems: 'center', zIndex: 1200, padding: 20 }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={t('Tilknyt uploadede filer')} onClick={e => e.stopPropagation()}
        style={{ width: 'min(480px, 100%)', maxHeight: 'calc(100vh - 40px)', overflow: 'auto', background: '#fff', borderRadius: 12, border: '1px solid var(--c-line)', boxShadow: 'var(--shadow-lg)', padding: '22px 22px 18px' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-ink)' }}>
          {files.length === 1 ? t('Hører filen til et anmodet punkt?') : t('Hører filerne til et anmodet punkt?')}
        </div>
        <ul style={{ listStyle: 'none', margin: '10px 0 12px', padding: 0, fontSize: 12.5, color: 'var(--c-text-2)' }}>
          {files.map((f, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '2px 0' }}>
              <I.File size={12} style={{ color: 'var(--c-text-3)' }}/> <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span> <span style={{ color: 'var(--c-text-3)' }}>{CW.fmtSize(f.size)}</span>
            </li>
          ))}
        </ul>
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend style={{ fontSize: 12, color: 'var(--c-text-3)', marginBottom: 6, padding: 0 }}>{t('Valgfrit. Punktet markeres som modtaget og uploadet af rådgiveren.')}</legend>
          {requested.map(it => {
            const approved = CW.isApproved(it.id);
            return (
              <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0', fontSize: 13, cursor: approved ? 'default' : 'pointer', opacity: approved ? 0.55 : 1 }}>
                <input type="radio" name="doc-assign" value={it.id} disabled={approved} checked={target === it.id} onChange={() => setTarget(it.id)}/>
                <span style={{ flex: 1 }}>{t(it.label)}{it.id === suggested && <span style={{ fontSize: 12, color: 'var(--c-text-3)', marginLeft: 6 }}>{t('Forslag')}</span>}</span>
                <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{statusText(it.id)}</span>
              </label>
            );
          })}
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0', fontSize: 13, cursor: 'pointer', borderTop: '1px solid var(--c-line-2)', marginTop: 4 }}>
            <input type="radio" name="doc-assign" value="__none" checked={target === '__none'} onChange={() => setTarget('__none')}/>
            <span>{t('Intet punkt, gem kun under Dokumenter')}</span>
          </label>
        </fieldset>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>{t('Annullér')}</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => onConfirm(target === '__none' ? null : target)}><I.Upload size={12}/> {t('Upload')}</button>
        </div>
      </div>
    </div>
  );
}

// Dato i listen: kun datoen; klokkeslættet for uploads står i title (T11)
function docDay(d) {
  if (!d) return '';
  if (d.fileId) return CW.fmtDate(d.at);
  return d.date ? DATA.fmt.longDate(d.date) : t('Dato ikke oplyst');
}
// Kan filen hentes? Uploads kun i den browsersession, de blev uploadet i;
// kildedokumenter, når sagen har indholdet (CASE_DOCS)
function docCanGet(d) {
  if (!d || d.superseded) return false;
  return d.fileId ? !!CW.fileUrl(d.fileId) : !!findCaseDoc(d.name);
}
// Hent ét dokument. En upload hentes som den præcise fil (to uploads kan have
// samme navn); alt andet via CW.downloadDoc, der bygger demodokumenterne.
function docGet(d) {
  const url = d.fileId ? CW.fileUrl(d.fileId) : null;
  if (!url) return CW.downloadDoc(d.name);
  const a = document.createElement('a');
  a.href = url; a.download = d.name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  return true;
}

function WSDocuments() {
  CW.useCase();

  const uploadDocs = CW.allUploads().map(docFromUpload);
  const sourceDocs = DATA.DOCS;
  const allDocs = [...uploadDocs, ...sourceDocs];

  const [selKey, setSelKey] = React.useState(() => docKey(sourceDocs[0]));
  const selected = allDocs.find(d => docKey(d) === selKey) || null;
  const [focus, setFocus] = React.useState(null);           // { ref, n } til CaseDocReader
  // Kom man fra en kilde et andet sted (fx beslutningsgrundlaget), kan man gå tilbage: { route, anchor, label }
  const [back, setBack] = React.useState(null);
  const [q, setQ] = React.useState("");
  const [sortMode, setSortMode] = React.useState("newest");
  const [dragOver, setDragOver] = React.useState(false);
  const dragDepth = React.useRef(0);
  const [pendingFiles, setPendingFiles] = React.useState(null);
  const [fetching, setFetching] = React.useState(false);
  const fileInputRef = React.useRef(null);

  function select(d) { setSelKey(docKey(d)); setFocus(null); }
  // Hop til en side i et af sagens kildedokumenter (navn eller id fra CASE_DOCS)
  function openSource(name, ref) {
    // Kundens dokumenter står kun som upload (fx periodetallene): så åbnes den nyeste upload med navnet
    const up = sourceDocs.some(x => x.name === name || x.id === name) ? null : CW.allUploads().find(f => f.id === name || f.name === name);
    const d = up ? docFromUpload(up) : sourceDocs.find(x => x.name === name || x.id === name) || { name };
    setSelKey(docKey(d));
    setFocus({ ref, n: Date.now() });
  }
  // Andre skærme kan åbne et kildedokument på en bestemt side: sessionStorage
  // 'kabul:open-doc' = { doc, name, ref } før fanen åbnes, og/eller eventet
  // 'cw-open-doc' med samme detail, mens fanen er åben.
  React.useEffect(() => {
    const apply = (d) => {
      if (!d) return;
      const key = [d.doc, d.name].find(k => k && sourceDocs.some(x => x.name === k || x.id === k)) || d.doc || d.name;
      if (key) openSource(key, d.ref || null);
      setBack(d.back && d.back.route ? d.back : null);
      // Kom man fra en kilde med vej tilbage: rul til toppen, så knappen og
      // viserens hoved er synlige
      if (d.back && d.back.route) setTimeout(() => {
        const sc = document.querySelector('.scroll');
        if (sc) sc.scrollTop = 0;
        CW.focusSoon('#doc-back-btn');
      }, 80);
    };
    try {
      const raw = sessionStorage.getItem('kabul:open-doc');
      if (raw) { sessionStorage.removeItem('kabul:open-doc'); apply(JSON.parse(raw)); }
    } catch (e) {}
    const on = (e) => { try { sessionStorage.removeItem('kabul:open-doc'); } catch (x) {} apply(e.detail); };
    window.addEventListener('cw-open-doc', on);
    return () => window.removeEventListener('cw-open-doc', on);
  }, []);

  // Uden viser: et dokument åbnet fra en anden skærm markeres i listen og
  // rulles frem (uden tilbage-knap får filnavnet fokus)
  const hiKey = !DOC_PREVIEW && focus ? selKey : null;
  React.useEffect(() => {
    if (!hiKey) return;
    const id = setTimeout(() => {
      const row = [...document.querySelectorAll('[data-doc-key]')].find(x => x.getAttribute('data-doc-key') === hiKey);
      if (!row) return;
      row.scrollIntoView({ block: 'center' });
      if (!back) { const link = row.querySelector('.cw-filelink'); if (link) try { link.focus({ preventScroll: true }); } catch (e) {} }
    }, 120);
    return () => clearTimeout(id);
  }, [hiKey, focus && focus.n]);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length) setPendingFiles(files);
  };
  function commitUpload(itemId) {
    const files = pendingFiles || [];
    setPendingFiles(null);
    if (!files.length) return;
    let metas;
    if (itemId) {
      const wasApproved = CW.isApproved(itemId);
      metas = CW.putFiles(files, { by: 'rådgiver', itemId });
      CW.markReceived(itemId, { by: 'rådgiver', files: metas });
      const it = CW.itemById(itemId);
      if (wasApproved) CW.toast(docFill(files.length === 1 ? t('1 fil uploadet. {punkt} er stadig godkendt.') : t('{n} filer uploadet. {punkt} er stadig godkendt.'), { n: files.length, punkt: it ? t(it.label) : '' }));
      else CW.toast(docFill(files.length === 1 ? t('1 fil uploadet. {punkt} står nu som modtaget.') : t('{n} filer uploadet. {punkt} står nu som modtaget.'), { n: files.length, punkt: it ? t(it.label) : '' }));
    } else {
      metas = CW.putFiles(files, { by: 'rådgiver' });
      CW.addLooseUploads(metas);
      CW.toast(docFill(files.length === 1 ? t('1 fil uploadet under Dokumenter') : t('{n} filer uploadet under Dokumenter'), { n: files.length }));
    }
    if (metas[0]) { setSelKey('u:' + metas[0].id); setFocus(null); }
  }

  // Hent alle dokumenter, der har indhold, én ad gangen (browseren spørger
  // evt. én gang, om siden må hente flere filer). Knappen er låst imens.
  async function fetchAll() {
    if (fetching) return;
    const list = allDocs.filter(docCanGet);
    if (!list.length) return;
    setFetching(true);
    CW.toast(docFill(t('Henter {n} dokumenter'), { n: list.length }));
    for (const d of list) {
      try { docGet(d); } catch (e) {}
      await new Promise(r => setTimeout(r, 350));
    }
    setFetching(false);
  }

  // Erstattede versioner (fx budget v1 og v2) foldes ind under den version,
  // der afløste dem (supersededBy). Forskellige års årsrapporter er ikke
  // versioner af hinanden og står hver for sig.
  const current = (name) => allDocs.some(x => x.name === name && !x.superseded);
  const olderBy = {};
  allDocs.forEach(d => { if (d.superseded && d.supersededBy && current(d.supersededBy)) (olderBy[d.supersededBy] = olderBy[d.supersededBy] || []).push(d); });
  Object.values(olderBy).forEach(arr => arr.sort((a, b) => b.date.localeCompare(a.date)));
  const olderOf = (d) => (!d.superseded && olderBy[d.name]) || [];

  const ql = q.trim().toLowerCase();
  const hit = (d) => d.name.toLowerCase().includes(ql) || t(d.type).toLowerCase().includes(ql) || d.type.toLowerCase().includes(ql) || (d.itemLabel || '').toLowerCase().includes(ql);
  let docs = allDocs.filter(d => !(d.superseded && d.supersededBy && current(d.supersededBy)));
  if (ql) docs = docs.filter(d => hit(d) || olderOf(d).some(hit));
  if (sortMode === "newest") docs.sort((a, b) => b.date.localeCompare(a.date));
  else if (sortMode === "oldest") docs.sort((a, b) => a.date.localeCompare(b.date));
  // Filnavne sorteres som tekst (på dansk ville "Aa" ellers sortere som "Å")
  else if (sortMode === "name") docs.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' }));

  // Samme emner som i anmodningen og kundens portal. Om et dokument er hentet
  // offentligt eller uploadet, står i rækkens grå linje (kilden).
  const inCat = (c) => (d) => c.types.includes(d.type);
  const groups = DOC_CATS.map(c => ({ key: c.key, label: c.label, items: docs.filter(inCat(c)) }))
    .concat([{ key: 'other', label: 'Øvrigt', items: docs.filter(d => !DOC_CATS.some(c => inCat(c)(d))) }]);
  const groupCount = (items) => items.reduce((n, d) => n + 1 + olderOf(d).length, 0);

  const selCase = selected && !selected.fileId ? findCaseDoc(selected.name) : null;
  const selUrl = selected && selected.fileId ? CW.fileUrl(selected.fileId) : null;
  const isFileDrag = (e) => Array.from((e.dataTransfer && e.dataTransfer.types) || []).indexOf('Files') >= 0;

  return (
    <React.Fragment>
    <div className="page page-wide" style={{ maxWidth: DOC_PREVIEW ? 1320 : 1080, padding: '24px 32px 80px' }}>
      {back && (
        <div style={{ marginBottom: 12 }}>
          <button id="doc-back-btn" type="button" className="btn btn-sm" onClick={() => {
            try { if (back.anchor) sessionStorage.setItem('kabul:ws-focus', back.anchor); } catch (e) {}
            if (typeof window.__go === 'function') window.__go(back.route);
          }}>
            <I.ArrowLeft className="ic"/> {back.label || t('Tilbage')}
          </button>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <h1 className="page-title">{t('Dokumenter')}</h1>
        <div className="page-sub" style={{ maxWidth: 720 }}>{t('Alt materiale på sagen.')}</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: DOC_PREVIEW ? '420px 1fr' : 'minmax(0, 1fr)', gap: 16 }}>
        {/* Hele listen er drop-mål for filer */}
        <div className="card"
          onDragEnter={(e) => { e.preventDefault(); if (!isFileDrag(e)) return; dragDepth.current += 1; setDragOver(true); }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragOver(false); }}
          onDrop={(e) => { e.preventDefault(); dragDepth.current = 0; setDragOver(false); handleFiles(e.dataTransfer && e.dataTransfer.files); }}
          style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            data-doc-upload="1"
            style={{ display: 'none' }}
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
          {/* Én værktøjslinje: søg, sortér, upload, hent alle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid var(--c-line-2)' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
              <I.Search size={14} aria-hidden="true" style={{ position: 'absolute', left: 11, top: 9, color: 'var(--c-text-3)' }}/>
              <input type="search" aria-label={t('Søg i dokumenter')} value={q} onChange={e => setQ(e.target.value)} className="input" style={{ paddingLeft: 32, height: 32, fontSize: 13, width: '100%' }} placeholder={t('Søg på navn, type eller punkt…')}/>
            </div>
            <select className="input" aria-label={t('Sortér')} value={sortMode} onChange={e => setSortMode(e.target.value)} style={{ height: 32, width: 'auto', fontSize: 13, paddingRight: 28 }}>
              <option value="newest">{t('Nyeste først')}</option>
              <option value="oldest">{t('Ældste først')}</option>
              <option value="name">{t('Navn')}</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
              <button type="button" className="btn-ghost-sm" title={t('Du kan også trække filer ind på listen')} onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                <I.Upload size={13} aria-hidden="true"/> {t('Upload fil')}
              </button>
              <button type="button" className="btn-ghost-sm" disabled={fetching} aria-busy={fetching || undefined} onClick={fetchAll}>
                <I.Download size={13} aria-hidden="true"/> {t('Hent alle')}
              </button>
            </div>
          </div>

          <div style={{ padding: '4px 16px 10px', flex: 1, overflow: DOC_PREVIEW ? 'auto' : undefined }}>
            {groups.map(g => (
              g.items.length === 0 ? null : (
                <div key={g.key}>
                  <h2 style={{ margin: '14px 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--c-text-2)' }}>
                    {t(g.label)} ({groupCount(g.items)})
                  </h2>
                  {g.items.map(d => (
                    <DocRow key={docKey(d)} d={d} older={olderOf(d)} openOlder={!!ql && olderOf(d).some(hit)}
                      hiKey={hiKey} selectedKey={selKey} onSelect={select} preview={DOC_PREVIEW}/>
                  ))}
                </div>
              )
            ))}
            {docs.length === 0 && (
              <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--c-text-3)', textAlign: 'center' }}>
                {t('Ingen dokumenter matcher søgningen.')}
              </div>
            )}
          </div>

          {dragOver && (
            <div aria-hidden="true" style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              display: 'grid', placeItems: 'center',
              background: 'rgba(255,255,255,0.88)', border: '2px dashed var(--c-primary)', borderRadius: 'inherit',
              fontSize: 13.5, fontWeight: 500, color: 'var(--c-ink)',
            }}>
              {t('Slip filerne for at uploade dem')}
            </div>
          )}
        </div>
        {/* Document viewer */}
        {DOC_PREVIEW && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="card-head">
            <div style={{ minWidth: 0 }}>
              <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected?.name || t('Vælg dokument')}</div>
              {selected && (selected.fileId
                ? <div className="card-sub">{t(selected.type)} · {t(selected.sourceLabel || 'Kundeupload')} · {t('uploadet')} {docWhen(selected)}</div>
                : <div className="card-sub">{t(selected.type)} · {t(selected.sourceLabel || 'Kundeupload')} · {t('dateret')} {docWhen(selected)}{selected.pageCount ? ' · ' + docPages(selected) : ''}{selCase && selected.excerpt ? ' · ' + docFill(t('uddrag, {n} afsnit i viseren'), { n: selected.excerpt }) : ''} · {selected.size}</div>)}
            </div>
            {selected && (
              <div className="hstack">
                {selUrl
                  ? <a className="btn btn-sm btn-ghost" href={selUrl} download={selected.name} aria-label={docFill(t('Hent {navn}'), { navn: selected.name })} title={t('Hent')}><I.Download className="ic"/></a>
                  : <button type="button" className="btn btn-sm btn-ghost" aria-label={docFill(t('Hent {navn}'), { navn: selected.name })} title={t('Hent')} onClick={() => CW.downloadDoc(selected.name)}><I.Download className="ic"/></button>}
                {selUrl
                  ? <a className="btn btn-sm" href={selUrl} target="_blank" rel="noopener noreferrer"><I.Maximize className="ic"/> {t('Åbn i ny fane')}</a>
                  : <button type="button" className="btn btn-sm" onClick={() => CW.notInDemo(t('Åbn i fuld skærm'))}><I.Maximize className="ic"/> {t('Åbn')}</button>}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0, flex: 1, minHeight: 480 }}>
            <div style={{
              padding: 28, background: 'var(--c-surface-2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              overflow: 'auto', minWidth: 0,
            }}>
              {!selected ? (
                <div style={{ padding: '60px 20px', fontSize: 13, color: 'var(--c-text-3)' }}>{t('Vælg et dokument i listen til venstre')}</div>
              ) : selected.fileId ? (
                <UploadedFileViewer doc={selected}/>
              ) : selCase ? (
                <CaseDocReader doc={selCase} focus={focus}/>
              ) : selected.superseded ? (
                <SupersededDoc doc={selected} onOpen={() => openSource(selected.supersededBy, selected.versionLogRef)}/>
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 14, padding: '60px 20px',
                }}>
                  <div style={{
                    width: 56, height: 70, borderRadius: 4,
                    background: '#fff', border: '1px solid var(--c-line)',
                    display: 'grid', placeItems: 'center',
                    color: 'var(--c-text-3)',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    <I.File size={22}/>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--c-ink)' }}>{selected.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 3 }}>
                      {t(selected.type) + ' · ' + selected.size}
                    </div>
                  </div>
                  <button type="button" className="btn btn-sm" style={{ marginTop: 4 }} onClick={() => CW.notInDemo(t('Åbn dokument'))}><I.Maximize className="ic"/> {t('Åbn dokument')}</button>
                </div>
              )}
            </div>

          </div>
        </div>
        )}
      </div>
    </div>

    {pendingFiles && (
      <AssignUploadDialog files={pendingFiles} onCancel={() => setPendingFiles(null)} onConfirm={commitUpload}/>
    )}
    </React.Fragment>
  );
}

/* ── Læser til sagens kildedokumenter ─────────────────────────────────────
   Viser det faktiske indhold AI'en læser, opdelt i de afsnit memoet citerer.
   focus: { ref, n } hopper til en bestemt side (fx fra afvigelsespanelet).
   ──────────────────────────────────────────────────────────────────────── */
function findCaseDoc(name) {
  if (!name || !window.CASE_DOCS) return null;
  return window.CASE_DOCS.find(d => d.name === name) || (window.CW_EXPORT_DOCS || []).find(d => d.name === name) || null;
}

// Sidehenvisning på det aktive sprog: "s. 2" bliver "p. 2", "ark" "sheet" og "linje" "line"
function docRefLabel(ref) {
  const r = String(ref || '');
  return window.CW_LANG === 'en' ? r.replace(/^s\. /, 'p. ').replace(/^ark /, 'sheet ').replace(/^linje /, 'line ') : r;
}

function CaseDocReader({ doc, focus }) {
  const firstRef = doc.pages[0] ? doc.pages[0].ref : null;
  const wantRef = focus && doc.pages.some(p => p.ref === focus.ref) ? focus.ref : firstRef;
  const [activeRef, setActiveRef] = React.useState(wantRef);
  const [q, setQ] = React.useState('');
  const bodyRef = React.useRef(null);

  React.useEffect(() => {
    setActiveRef(wantRef);
    setQ('');
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [doc.id, focus && focus.n]);

  const page = doc.pages.find(p => p.ref === activeRef) || doc.pages[0];

  const hits = q.trim()
    ? doc.pages.filter(p => docDa(p.title + ' ' + p.body).toLowerCase().includes(q.trim().toLowerCase()))
    : null;

  function highlight(text) {
    const term = q.trim();
    if (!term) return text;
    const parts = text.split(new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'));
    return parts.map((p, i) =>
      p.toLowerCase() === term.toLowerCase()
        ? <mark key={i} style={{ background: 'rgba(245,200,60,0.45)', color: 'inherit' }}>{p}</mark>
        : p
    );
  }

  return (
    <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '196px 1fr', gap: 0, background: '#fff', border: '1px solid var(--c-line)', borderRadius: 8, overflow: 'hidden', minHeight: 480 }}>
      <div style={{ borderRight: '1px solid var(--c-line-2)', background: 'var(--c-surface-2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 10, borderBottom: '1px solid var(--c-line-2)' }}>
          <input
            type="search"
            className="input"
            aria-label={t('Søg i dokumentet')}
            style={{ width: '100%', height: 28, fontSize: 12 }}
            placeholder={t('Søg i dokumentet')}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 520 }}>
          {(hits || doc.pages).map(p => {
            const on = p.ref === activeRef;
            return (
              <button type="button" key={p.ref} aria-current={on ? 'page' : undefined} onClick={() => { setActiveRef(p.ref); if (bodyRef.current) bodyRef.current.scrollTop = 0; }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '8px 12px', border: 'none',
                  borderLeft: '2px solid ' + (on ? 'var(--c-ink)' : 'transparent'),
                  background: on ? '#fff' : 'transparent',
                  fontFamily: 'inherit',
                }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--c-text-3)' }}>{docRefLabel(p.ref)}</div>
                <div style={{ fontSize: 12, color: on ? 'var(--c-ink)' : 'var(--c-text-2)', lineHeight: 1.35, marginTop: 1 }}>{docDa(p.title)}</div>
              </button>
            );
          })}
          {hits && hits.length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--c-text-3)' }}>{t('Ingen resultater.')}</div>
          )}
        </div>
      </div>

      <div ref={bodyRef} style={{ overflowY: 'auto', maxHeight: 560, padding: '22px 28px 34px' }}>
        {page && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--c-line-2)' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{docRefLabel(page.ref)}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-ink)' }}>{docDa(page.title)}</span>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.75, color: 'var(--c-text)', whiteSpace: 'pre-wrap', fontFamily: /ark |linje /.test(page.ref) ? 'var(--mono)' : 'inherit' }}>
              {/* Tabeller (linjer med kolonner adskilt af flere mellemrum) vises i
                  fast bredde uden linjeskift, så kolonnerne står under hinanden */}
              {docBlocks(docDa(page.body)).map((blk, i) => blk.table ? (
                <div key={i} className="mono" style={{ whiteSpace: 'pre', overflowX: 'auto', fontSize: 12, lineHeight: 1.6, margin: '2px 0 10px', padding: '6px 8px', background: 'var(--c-surface-2)', borderRadius: 6 }}>{highlight(blk.text)}</div>
              ) : <React.Fragment key={i}>{highlight(blk.text)}</React.Fragment>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Grå metalinje: led adskilt af " · " (tomme led udelades)
function docMeta(parts) {
  const list = parts.filter(Boolean);
  return list.map((p, i) => <React.Fragment key={i}>{i ? ' · ' : ''}{p}</React.Fragment>);
}

/* Én stille række som i "Anmod om materiale": filnavnet med fed er linket, der
   henter filen, én grå metalinje og typen som grå tekst til højre. Med viser
   (DOC_PREVIEW) vælger filnavnet i stedet dokumentet til viseren. */
function DocRow({ d, older, openOlder, hiKey, selectedKey, onSelect, preview }) {
  const key = docKey(d);
  const url = d.fileId ? CW.fileUrl(d.fileId) : null;
  const [showOlder, setShowOlder] = React.useState(false);
  const hasOlder = older && older.length > 0;
  // Åbn folden, når søgningen eller et hop hertil rammer en tidligere version
  const wantOpen = openOlder || (hasOlder && older.some(o => docKey(o) === hiKey || (preview && docKey(o) === selectedKey)));
  React.useEffect(() => { if (wantOpen) setShowOlder(true); }, [wantOpen]);
  const isSel = preview ? selectedKey === key : hiKey === key;
  const getLabel = docFill(t('Hent {navn}'), { navn: d.name });

  let name;
  if (preview) {
    name = <button type="button" className="cw-filelink" aria-current={isSel ? 'true' : undefined} onClick={() => onSelect(d)}>{d.name}</button>;
  } else if (url) {
    name = <a className="cw-filelink" href={url} download={d.name} aria-label={getLabel} title={t('Hent filen')}>{d.name}</a>;
  } else if (docCanGet(d)) {
    name = <button type="button" className="cw-filelink" aria-label={getLabel} title={t('Hent filen')} onClick={() => CW.downloadDoc(d.name)}>{d.name}</button>;
  } else {
    // Upload fra en tidligere browsersession: kun navn, størrelse og tidspunkt kendes
    name = <span title={t('Filens indhold findes kun i den browsersession, den blev uploadet i. Upload filen igen for at hente den.')}>{d.name}</span>;
  }

  let meta;
  if (d.fileId) {
    const st = d.itemId ? (DOC_ITEM_STATUS[d.itemStatus] || 'Modtaget') : null;
    meta = docMeta([
      t(d.sourceLabel),
      <span title={CW.fmtWhen(d.at)}>{docDay(d)}</span>,
      d.size,
      d.itemId
        ? <span>{t(d.itemLabel)}, {st === 'Afvist' ? <CWStatus tone="danger">{t('afvist')}</CWStatus> : t(st).toLowerCase()}</span>
        : t('ikke knyttet til et punkt'),
    ]);
  } else {
    meta = docMeta([t(d.sourceLabel || (d.origin === 'public' ? 'CVR' : 'Kundeupload')), docDay(d), docPages(d), d.size]);
  }

  return (
    <div className="doc-row" data-doc-key={key}>
      <div className="cw-row" style={isSel ? { background: 'var(--c-surface-2)', margin: '0 -16px', padding: '10px 16px' } : undefined}>
        <div className="cw-row-main">
          <span className="cw-row-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          <span className="cw-row-meta">{meta}</span>
        </div>
        <span className="cw-row-cat">{t(d.type)}</span>
      </div>
      {hasOlder && (
        <CWFold className="doc-older" label={t('Tidligere versioner')} count={older.length} open={showOlder} onToggle={setShowOlder}>
          {older.map(o => {
            const oSel = preview ? selectedKey === docKey(o) : hiKey === docKey(o);
            return (
              <div key={docKey(o)} className="cw-row" data-doc-key={docKey(o)} style={oSel ? { background: 'var(--c-surface-2)' } : undefined}>
                <div className="cw-row-main">
                  {preview
                    ? <button type="button" className="cw-filelink" aria-current={oSel ? 'true' : undefined} onClick={() => onSelect(o)} style={{ fontWeight: 500, color: 'var(--c-text-2)' }}>{o.name}</button>
                    : <span style={{ fontWeight: 500, color: 'var(--c-text-2)' }} title={docFill(t('Filen er ikke med i sagen. Ændringerne står i versionsloggen i {navn}.'), { navn: o.supersededBy || '' })}>{o.name}</span>}
                  <span className="cw-row-meta">{docMeta([t('Erstattet'), docDay(o), o.size])}</span>
                </div>
                <span className="cw-row-cat">{t(o.year)}</span>
              </div>
            );
          })}
        </CWFold>
      )}
    </div>
  );
}
window.WSDocuments = WSDocuments;
