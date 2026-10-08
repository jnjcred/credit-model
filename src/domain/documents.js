// Dokumenter: hjælperne fra documents.jsx (flyttet uændret ved migrationen til Vue; fanen er
// src/views/documents/WsDocuments.vue).
//
// Ved indlæsning læses window.CW_SOURCE_VIEW (DOC_PREVIEW, sat af case_facts.js) og CW.MATERIAL_CATS
// (DOC_CATS, case_state.js). bootstrap.js har allerede indlæst begge i den gamle rækkefølge; importen
// nedenfor sikrer kun, at filen også virker, hvis noget andet importerer den først.
// Hjælperne læser CW, DATA og t som globale navne (window), som før.
// memo_handoff læser docFromUpload, docCanGet, docGet, docKey, docDay og docPages som globale navne
// (documents.jsx var et klassisk script), så de lægges stadig på window. Vue-komponenterne importerer
// fra eksportlisten nederst.
//
// Eneste nye funktion: docMetaParts (metalinjens led som data i stedet for docMeta's React-elementer).
// Ikke flyttet hertil: komponenterne (WSDocuments, DocRow, CaseDocReader, UploadedFileViewer,
// SupersededDoc er Vue-komponenter nu), docMeta (React-elementer; erstattet af docMetaParts og
// DocMetaLine.vue) og den døde upload-dialog (AssignUploadDialog og suggestItemFor; ingen kaldere).
import '@/domain/case_facts';
import '@/domain/case_state';

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

// Emner i dokumentlisten: de fire fra anmodningen og kundens portal (CW.MATERIAL_CATS)
// plus sagens egne dokumenter og Crediwires eksporter. En fil, der hører til et
// punkt, står under punktets emne; andre dokumenter efter dokumenttypen.
const DOC_CATS = CW.MATERIAL_CATS.map(c => ({ key: c.key, label: c.label, types: c.types })).concat([
  { key: 'case',   label: 'Ansøgning og rating', types: ['Ansøgning', 'Ratingberegning'] },
  { key: 'export', label: 'Eksport fra Crediwire', types: ['Crediwire-eksport'] },
]);
function docCatKey(d) {
  if (d.itemId) {
    const it = CW.itemById(d.itemId);
    const label = it ? CW.itemCat(it) : null;
    const c = label && DOC_CATS.find(x => x.label === label);
    if (c) return c.key;
    if (it) return 'other';
  }
  const c = DOC_CATS.find(x => x.types.includes(d.type));
  return c ? c.key : 'other';
}

// Dokumenttype ud fra det anmodede punkt, ellers ud fra filnavnet. Typen hører
// til samme emne som punktet (CW.MATERIAL_CATS.types).
const DOC_TYPE_BY_ITEM = {
  'm-annual': 'Årsrapport', 'm-interim': 'Periodetal', 'm-budget': 'Budget', 'm-pitch': 'Præsentation',
  'm-ejerbog': 'Selskab', 'm-loans': 'Låneaftale', 'm-security': 'Sikkerhed', 'm-trade': 'Salg', 'm-ownership': 'Selskab',
  'm-fx': 'Valuta', 'm-orderbook': 'Kontrakt',
  'm-assumptions': 'Budget', 'm-lowcase': 'Budget', 'm-group': 'Årsrapport', 'm-protocol': 'Årsrapport', 'm-tech': 'Nøgletal',
  'm-agri': 'Nøgletal', 'm-capital': 'Selskab', 'm-bizplan': 'Præsentation',
  'm-pub-cvr': 'Selskab', 'm-pub-market': 'Marked', 'm-pub-product': 'Marked',
};
function docTypeForItem(itemId) {
  if (!itemId) return null;
  if (/^m-annual-/.test(itemId)) return 'Årsrapport';
  return DOC_TYPE_BY_ITEM[itemId] || null;
}
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

const DOC_ITEM_STATUS = { received: 'Modtaget', approved: 'Godkendt', rejected: 'Spørgsmål stillet' };

// En upload fra CW vist som en række i listen
function docFromUpload(f) {
  return {
    fileId: f.id,
    name: f.name,
    type: docTypeForItem(f.itemId) || inferDocType(f.name),
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

// Sagens kildedokument (CASE_DOCS) eller Crediwires eksport (CW_EXPORT_DOCS) med navnet
function findCaseDoc(name) {
  if (!name || !window.CASE_DOCS) return null;
  return window.CASE_DOCS.find(d => d.name === name) || (window.CW_EXPORT_DOCS || []).find(d => d.name === name) || null;
}

// Sidehenvisning på det aktive sprog: "s. 2" bliver "p. 2", "ark" "sheet" og "linje" "line"
function docRefLabel(ref) {
  const r = String(ref || '');
  return window.CW_LANG === 'en' ? r.replace(/^s\. /, 'p. ').replace(/^ark /, 'sheet ').replace(/^linje /, 'line ') : r;
}

// Grå metalinje: led adskilt af " · " (tomme led udelades)
// Migration: docMeta(parts) byggede linjen af React-elementer. docMetaParts(d) giver de led, DocRow
// gav docMeta for rækken d, som data til DocMetaLine.vue: samme rækkefølge, tekster og betingelser.
// DocMetaLine udelader som docMeta tomme led (filter(Boolean)) og sætter " · " mellem resten.
//   'tekst'                          almindeligt led
//   { text, title }                  uploadens dato; title = det fulde tidspunkt (før <span title>)
//   { prefix, text, danger: true }   punktet, når status er "Spørgsmål stillet": prefix = "punkt, ",
//                                    text = statusteksten som fare (før <CWStatus tone="danger">)
function docMetaParts(d) {
  if (d.fileId) {
    const st = d.itemId ? (DOC_ITEM_STATUS[d.itemStatus] || 'Modtaget') : null;
    return [
      t(d.sourceLabel),
      { text: docDay(d), title: CW.fmtWhen(d.at) },
      d.size,
      d.itemId
        ? (st === 'Spørgsmål stillet' ? { prefix: t(d.itemLabel) + ', ', text: t('spørgsmål stillet'), danger: true } : t(d.itemLabel) + ', ' + t(st).toLowerCase())
        : t('ikke knyttet til et punkt'),
    ];
  }
  return [t(d.sourceLabel || (d.origin === 'public' ? 'CVR' : 'Kundeupload')), docDay(d), docPages(d), d.size];
}

// memo_handoff læser disse som globale navne (se øverst)
Object.assign(window, { docFromUpload, docCanGet, docGet, docKey, docDay, docPages });

// Modul-eksport til Vue-komponenterne (src/views/documents, memoets Copilot-side)
export {
  DOC_PREVIEW, docFill, DOC_CATS, docCatKey, DOC_TYPE_BY_ITEM, docTypeForItem, inferDocType, DOC_ITEM_STATUS,
  docFromUpload, docKey, docWhen, docPages, DOC_DA_KEEP, DOC_DA_STEMS, docDaWord, docDa, docBlocks,
  docDay, docCanGet, docGet, findCaseDoc, docRefLabel, docMetaParts,
};
